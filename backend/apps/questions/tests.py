from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.catalog.models import Subject
from apps.llm.providers import FallbackOfflineProvider, LLMProvider
from apps.questions.services import QuestionGenerationUnavailable, generate_test_session


class SubjectAwareProvider(LLMProvider):
    def generate_batch(self, subject, topic, count, avoid_stems=None):
        texts = [
            f"{subject} / {topic}: How is energy conserved in an isolated system?",
            f"Which statement defines entropy for {topic} in {subject}?",
            f"During a {topic} experiment, what does heat capacity measure?",
            f"What condition produces thermal equilibrium in {subject}'s {topic} unit?",
            f"How can a phase transition be recognized while studying {topic}?",
        ]
        return [{"text": text, "options": ["Correct", "A", "B", "C"], "correct_index": 0, "explanation": f"A {topic} concept in {subject}.", "difficulty": "medium"} for text in texts[:count]]

    def verify_answer(self, question_text, options):
        return 0

    def tutor_chat(self, messages):
        return ""


class GenerateTestSessionTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(email="learner@example.com", password="safe-password-123")
        self.subject = Subject.objects.create(name="Physics", slug="physics")

    def test_persists_questions_for_selected_subject_and_topic(self):
        with patch("apps.questions.services.get_llm_provider", return_value=SubjectAwareProvider()):
            session = generate_test_session(self.user, self.subject.id, "Thermodynamics", 5)

        questions = [item.question for item in session.session_questions.select_related("question")]
        self.assertEqual(len(questions), 5)
        self.assertTrue(all(question.subject_id == self.subject.id for question in questions))
        self.assertTrue(all(question.topic_name == "Thermodynamics" for question in questions))
        self.assertTrue(all(question.text for question in questions))

    def test_never_substitutes_generic_offline_questions(self):
        with patch("apps.questions.services.get_llm_provider", return_value=FallbackOfflineProvider()):
            with self.assertRaises(QuestionGenerationUnavailable):
                generate_test_session(self.user, self.subject.id, "Thermodynamics", 5)
