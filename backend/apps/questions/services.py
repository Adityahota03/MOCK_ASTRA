import logging
import difflib
from datetime import timedelta
from typing import List, Tuple
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.catalog.models import Subject, Topic
from apps.questions.models import Question, UserQuestionHistory, hash_question_text, normalize_question_text
from apps.test_sessions.models import TestSession, TestSessionQuestion
from apps.llm.providers import get_llm_provider

logger = logging.getLogger(__name__)
User = get_user_model()


class QuestionGenerationUnavailable(Exception):
    """Raised when an accurate, complete question set cannot be generated."""

def is_near_duplicate(new_text: str, existing_texts: List[str], threshold: float = 0.70) -> bool:
    """Check if new_text is too similar to any existing text using SequenceMatcher."""
    norm_new = normalize_question_text(new_text)
    for ext in existing_texts:
        norm_ext = normalize_question_text(ext)
        ratio = difflib.SequenceMatcher(None, norm_new, norm_ext).ratio()
        if ratio >= threshold:
            return True
    return False

def generate_test_session(
    user: User,
    subject_id: int,
    topic_name: str,
    num_questions: int = 30,
    time_per_question_sec: int = 60
) -> TestSession:
    """
    Executes the end-to-end question generation pipeline per Section 5 of Technical Architecture:
    1. Validation
    2. Exclusion set loading (seen hashes & recent stems)
    3. Batched generation (10 questions per batch)
    4. Schema validation
    5. Solver answer verification pass
    6. SHA-256 and near-duplicate deduplication vs user history
    7. Retries/top-up loop if needed
    8. TestSession and TestSessionQuestion creation
    """
    subject = Subject.objects.get(id=subject_id, is_active=True)
    clean_topic = topic_name.strip()[:100]
    count = max(5, min(num_questions, 50))

    # 1. Load user's seen hashes and recent stems for this subject/topic
    user_seen_hashes = set(
        UserQuestionHistory.objects.filter(user=user).values_list('text_hash', flat=True)
    )

    recent_stems = list(
        Question.objects.filter(
            subject=subject,
            topic_name__iexact=clean_topic
        ).values_list('text', flat=True)[:40]
    )

    llm = get_llm_provider()
    # A topic label does not make a generic question topic-specific. The
    # offline provider is only suitable for demos, so never persist its
    # placeholder questions as an assessment.
    from apps.llm.providers import FallbackOfflineProvider
    if isinstance(llm, FallbackOfflineProvider):
        raise QuestionGenerationUnavailable(
            "Question generation is temporarily unavailable. Please configure "
            "a reachable AI provider and try again."
        )
    accepted_questions: List[Question] = []
    current_seen_hashes = set(user_seen_hashes)
    current_seen_stems = list(recent_stems)

    # 2. Check existing verified questions bank for up to 30% of request (cost/speed saving)
    bank_questions = list(
        Question.objects.filter(
            subject=subject,
            topic_name__iexact=clean_topic,
            verified=True
        ).exclude(text_hash__in=current_seen_hashes)[:max(0, count // 3)]
    )

    for bq in bank_questions:
        accepted_questions.append(bq)
        current_seen_hashes.add(bq.text_hash)
        current_seen_stems.append(bq.text)

    # 3. Generation loop with retries
    retries = 0
    max_retries = 6  # Increased to allow for per-question validation failures

    while len(accepted_questions) < count and retries < max_retries:
        needed = count - len(accepted_questions)
        batch_size = min(10, needed)
        retries += 1

        try:
            raw_batch = llm.generate_batch(
                subject=subject.name,
                topic=clean_topic,
                count=batch_size,
                avoid_stems=current_seen_stems
            )
        except Exception as e:
            logger.error(f"LLM batch generation failed: {e}")
            raw_batch = []

        for item in raw_batch:
            if len(accepted_questions) >= count:
                break

            q_text = item.get("text", "").strip()
            options = item.get("options", [])
            correct_idx = item.get("correct_index", 0)
            explanation = item.get("explanation", "").strip()
            difficulty = item.get("difficulty", "medium")

            if not q_text or len(options) != 4 or not (0 <= correct_idx <= 3):
                continue

            # Compute hash
            q_hash = hash_question_text(q_text)

            # Check exact duplicate
            if q_hash in current_seen_hashes:
                continue

            # Check near-duplicate (similarity > 0.70)
            if is_near_duplicate(q_text, current_seen_stems, threshold=0.70):
                continue

            # Verification pass (solver)
            verified_idx = llm.verify_answer(q_text, options)
            if verified_idx is not None and verified_idx != correct_idx:
                logger.info(f"Dropped question due to verification mismatch: claimed {correct_idx} vs solver {verified_idx}")
                continue

            # Persist question
            question = Question.objects.create(
                subject=subject,
                topic_name=clean_topic,
                text=q_text,
                options=options,
                correct_index=correct_idx,
                explanation=explanation,
                difficulty=difficulty,
                text_hash=q_hash,
                verified=True
            )

            accepted_questions.append(question)
            current_seen_hashes.add(q_hash)
            current_seen_stems.append(q_text)

    # Do not pad a test with generic fallback questions. A partial test would
    # be just as misleading as a wrong-subject test.
    if len(accepted_questions) < count:
        logger.warning("Generation shortfall: %s/%s", len(accepted_questions), count)
        raise QuestionGenerationUnavailable(
            "The AI provider did not return enough validated questions. Please try again."
        )

    # 4. Create TestSession and record user question history atomically
    duration_sec = len(accepted_questions) * time_per_question_sec
    now = timezone.now()
    expires_at = now + timedelta(seconds=duration_sec)

    with transaction.atomic():
        session = TestSession.objects.create(
            user=user,
            subject=subject,
            topic_name=clean_topic,
            num_questions=len(accepted_questions),
            duration_seconds=duration_sec,
            started_at=now,
            expires_at=expires_at,
            status='in_progress'
        )

        history_records = []
        session_questions = []

        for pos, question in enumerate(accepted_questions, start=1):
            session_questions.append(
                TestSessionQuestion(
                    session=session,
                    question=question,
                    position=pos
                )
            )
            history_records.append(
                UserQuestionHistory(
                    user=user,
                    question=question,
                    text_hash=question.text_hash
                )
            )

        TestSessionQuestion.objects.bulk_create(session_questions)
        # bulk_create history with ignore_conflicts for safety
        UserQuestionHistory.objects.bulk_create(history_records, ignore_conflicts=True)

    return session
