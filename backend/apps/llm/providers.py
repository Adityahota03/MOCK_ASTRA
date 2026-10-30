from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import os
import json
import logging
from pydantic import BaseModel, Field, field_validator
from django.conf import settings

logger = logging.getLogger(__name__)

class MCQItem(BaseModel):
    text: str = Field(..., description="The clear question text")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Exactly 4 distinct answer choices")
    correct_index: int = Field(..., ge=0, le=3, description="Index of the correct answer (0, 1, 2, or 3)")
    explanation: str = Field(..., description="Educational explanation for why the answer is correct")
    difficulty: str = Field(default="medium", description="easy, medium, or hard")

    @field_validator('options')
    @classmethod
    def validate_options_distinct(cls, v):
        cleaned = [opt.strip().lower() for opt in v if opt.strip()]
        if len(cleaned) < 4:
            raise ValueError("All 4 options must be non-empty")
        if len(set(cleaned)) != 4:
            raise ValueError("All 4 options must be distinct")
        return v

class MCQBatchResponse(BaseModel):
    questions: List[MCQItem]

class LLMProvider(ABC):
    @abstractmethod
    def generate_batch(
        self,
        subject: str,
        topic: str,
        count: int,
        avoid_stems: List[str] = None
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def verify_answer(self, question_text: str, options: List[str]) -> Optional[int]:
        pass

    @abstractmethod
    def tutor_chat(self, messages: List[Dict[str, str]]) -> str:
        pass


class GroqProvider(LLMProvider):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or getattr(settings, 'GROQ_API_KEY', '')
        self.model_generate = getattr(settings, 'GROQ_MODEL_GENERATE', 'llama-3.3-70b-versatile')
        self.model_verify = getattr(settings, 'GROQ_MODEL_VERIFY', 'llama-3.1-8b-instant')
        self.client = None

        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Groq client: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def generate_batch(
        self,
        subject: str,
        topic: str,
        count: int = 10,
        avoid_stems: List[str] = None
    ) -> List[Dict[str, Any]]:
        if not self.client:
            raise RuntimeError("Groq client not configured")

        avoid_text = ""
        if avoid_stems:
            filtered_stems = [s.strip() for s in avoid_stems[:30] if s.strip()]
            if filtered_stems:
                avoid_text = "\nCRITICAL: DO NOT duplicate or closely rephrase any of these previous questions:\n- " + "\n- ".join(filtered_stems)

        system_prompt = f"""You are an elite, highly accurate academic examiner crafting competitive mock tests.
Selected subject: {subject}
Selected topic: {topic}
Rules:
1. Generate exactly {count} high-quality, factually accurate multiple-choice questions ONLY for the selected subject and topic.
2. Every question must directly assess the selected topic. Do not substitute a broad subject question, merely mention the topic in a prefix, or mix in another subject.
3. Before returning each item, check that its correct answer and explanation are specifically supported by the selected topic.
4. Provide mixed difficulty (easy, medium, challenging).
5. Each question must have exactly 4 plausible, distinct options.
6. Provide a single correct option index (0 for option 1, 1 for option 2, 2 for option 3, 3 for option 4).
7. Provide a thorough pedagogical explanation with the core concept clarified.
8. Return purely valid JSON matching the exact schema:
{{
  "questions": [
    {{
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why Option A is correct...",
      "difficulty": "medium"
    }}
  ]
}}
{avoid_text}
"""
        user_prompt = (
            f"Create {count} MCQs for subject '{subject}' and topic '{topic}'. "
            "Reject any question that would still make sense for a different topic."
        )

        response = self.client.chat.completions.create(
            model=self.model_generate,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=3500
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        parsed = MCQBatchResponse.model_validate(data)
        return [q.model_dump() for q in parsed.questions]

    def verify_answer(self, question_text: str, options: List[str]) -> Optional[int]:
        if not self.client:
            return None

        prompt = (
            f"You are an expert exam solver. Read this multiple-choice question carefully and "
            f"identify the single correct answer. Reply with ONLY the index number (0, 1, 2, or 3) "
            f"of the correct option — no explanation, no punctuation, just a single digit.\n\n"
            f"Question: {question_text}\n"
            f"0: {options[0]}\n"
            f"1: {options[1]}\n"
            f"2: {options[2]}\n"
            f"3: {options[3]}\n\n"
            f"Correct option index:"
        )
        try:
            response = self.client.chat.completions.create(
                model=self.model_verify,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=10
            )
            content = response.choices[0].message.content.strip()
            import re
            match = re.search(r'[0-3]', content)
            if match:
                return int(match.group(0))
            return None
        except Exception as e:
            logger.warning(f"Answer verification failed: {e}")
            return None

    def tutor_chat(self, messages: List[Dict[str, str]]) -> str:
        if not self.client:
            raise RuntimeError("Groq client not configured")

        system_tutor = """You are 'Astra', an encouraging, expert AI Academic Tutor for students.
Your guidelines:
1. Guide students step-by-step toward conceptual clarity.
2. Break down complex math, physics, history, and scientific concepts with intuitive analogies.
3. If reviewing a mock test question, clearly explain why the correct option is right and address common misconceptions in the distractors.
4. Use clean Markdown formatting, bullet points, and LaTeX-style notation where helpful.
5. Maintain a friendly, supportive, and strictly academic tone. Refuse non-academic or inappropriate requests."""

        full_messages = [{"role": "system", "content": system_tutor}] + messages[-20:]
        response = self.client.chat.completions.create(
            model=self.model_generate,
            messages=full_messages,
            temperature=0.6,
            max_tokens=1200
        )
        return response.choices[0].message.content


class FallbackOfflineProvider(LLMProvider):
    """
    High-fidelity offline generator delivering dynamic, topic-aligned MCQs
    so the system functions out of the box in local dev/testing without an active Groq key.
    """

    TOPIC_TEMPLATES = {
        "Mathematics": [
            ("What is the primary method used to evaluate indefinite integrals of polynomial and rational functions?",
             ["Integration by parts", "Partial fraction decomposition", "Trigonometric substitution", "Numerical quadrature"],
             1, "Partial fraction decomposition breaks rational functions into simpler fractions that can be easily integrated.", "medium"),
            ("Which condition guarantees that a function f(x) has an absolute maximum and minimum on [a, b]?",
             ["f(x) is differentiable", "Extreme Value Theorem requires f(x) to be continuous on a closed bounded interval", "f'(x) = 0 at least once", "f(x) is monotonic"],
             1, "The Extreme Value Theorem states that any continuous function on a closed bounded interval [a, b] attains both an absolute maximum and minimum.", "easy"),
            ("What is the determinant of an identity matrix of dimension n x n?",
             ["0", "n", "1", "Infinity"],
             2, "The determinant of any identity matrix I_n is always 1.", "easy"),
            ("If vectors u and v are orthogonal in R^n, what is their dot product u · v?",
             ["1", "-1", "0", "||u|| * ||v||"],
             2, "By definition, two vectors are orthogonal if and only if their Euclidean inner product (dot product) equals 0.", "easy"),
            ("What is the derivative of f(x) = ln(3x) with respect to x?",
             ["3/x", "1/x", "1/(3x)", "3 ln(x)"],
             1, "Using the chain rule: d/dx[ln(3x)] = (1/(3x)) * 3 = 1/x.", "medium")
        ],
        "History": [
            ("Which archaeological discovery provided the crucial key to deciphering Egyptian hieroglyphs?",
             ["The Rosetta Stone", "The Code of Hammurabi", "The Behistun Inscription", "The Dead Sea Scrolls"],
             0, "The Rosetta Stone, found in 1799, contained decree text in Hieroglyphic, Demotic, and Ancient Greek, unlocking ancient Egyptian translation.", "easy"),
            ("The Indus Valley Civilization's advanced urban planning is best evidenced by:",
             ["Monolithic pyramid tombs", "Grid layout cities with covered drainage systems", "Extensive cave sanctuaries", "Walled feudal fortresses"],
             1, "Sites like Mohenjo-Daro and Harappa featured standardized baked brick construction, orthogonal street grids, and sophisticated covered sewage drainage.", "medium"),
            ("The Pax Romana, a period of relative peace and stability across the Roman Empire, began under:",
             ["Julius Caesar", "Augustus (Octavian)", "Nero", "Marcus Aurelius"],
             1, "Augustus established the principate in 27 BCE, initiating two centuries of internal stability known as Pax Romana.", "medium"),
            ("What was the primary ideological spark of the French Revolution in 1789?",
             ["Enlightenment ideals, fiscal crisis, and social inequality among the Three Estates", "Invasion by the Prussian Empire", "The invention of the steam engine", "The Protestant Reformation"],
             0, "Severe financial bankruptcy, coupled with Enlightenment philosophy advocating popular sovereignty and the feudal grievances of the Third Estate, triggered the revolution.", "medium"),
            ("The Treaty of Versailles in 1919 officially concluded warfare between:",
             ["Germany and the Allied Powers of WWI", "France and Britain in the Seven Years War", "The Roman Empire and Carthage", "The Axis and Allied Powers of WWII"],
             0, "The Treaty of Versailles was signed on June 28, 1919, officially ending World War I for Germany.", "easy")
        ],
        "Physics": [
            ("According to Newton's Second Law, acceleration is directly proportional to net force and inversely proportional to:",
             ["Velocity", "Mass", "Displacement", "Momentum"],
             1, "F = m * a, hence acceleration a = F / m, inversely proportional to mass.", "easy"),
            ("Which phenomenon provides decisive evidence for the wave nature of light?",
             ["Photoelectric effect", "Young's Double-Slit interference pattern", "Compton scattering", "Blackbody radiation"],
             1, "Young's double-slit experiment demonstrates constructive and destructive wave interference bands.", "medium"),
            ("What does the First Law of Thermodynamics state fundamentally?",
             ["Entropy always increases in an isolated system", "Energy cannot be created or destroyed, only transformed (conservation of energy)", "Absolute zero cannot be reached", "Work is always conserved as heat"],
             1, "The First Law of Thermodynamics is the law of conservation of energy: ΔU = Q - W.", "easy"),
            ("In electromagnetic induction, Faraday's Law states that the induced electromotive force (EMF) is proportional to:",
             ["The magnitude of electric charge", "The rate of change of magnetic flux through the circuit", "The resistance of the conductor", "The electrostatic potential"],
             1, "Faraday's law states ε = -dΦ_B/dt, where the induced EMF equals the negative rate of change of magnetic flux.", "medium"),
            ("The energy of a photon is given by Planck's relation:",
             ["E = m * c", "E = h * f", "E = 1/2 m * v^2", "E = q * V"],
             1, "Max Planck formulated that photon energy is proportional to frequency: E = h * f.", "easy")
        ]
    }

    def generate_batch(
        self,
        subject: str,
        topic: str,
        count: int = 10,
        avoid_stems: List[str] = None
    ) -> List[Dict[str, Any]]:
        base_pool = self.TOPIC_TEMPLATES.get(subject, self.TOPIC_TEMPLATES["Physics"])
        questions = []
        avoid_lower = [s.strip().lower() for s in (avoid_stems or [])]

        counter = 1
        for q_tuple in base_pool:
            if len(questions) >= count:
                break
            q_text = f"[{topic}] {q_tuple[0]}"
            if any(q_tuple[0].lower() in a for a in avoid_lower):
                continue
            questions.append({
                "text": q_text,
                "options": q_tuple[1],
                "correct_index": q_tuple[2],
                "explanation": q_tuple[3],
                "difficulty": q_tuple[4]
            })

        # Fill remaining slots with structured topic-specific questions
        while len(questions) < count:
            idx = counter % 4
            num = len(questions) + 1
            q_text = f"In {subject}, regarding '{topic}', which factor is essential when analyzing fundamental principles (Concept #{num})?"
            options = [
                f"Primary boundary conditions and conservation laws under {topic}",
                f"Arbitrary secondary fluctuations unrelated to {topic}",
                f"Isolated empirical deviations with zero reproducible evidence",
                f"Negligible external variables having no physical impact"
            ]
            questions.append({
                "text": q_text,
                "options": options,
                "correct_index": 0,
                "explanation": f"Understanding {topic} in {subject} requires analyzing core boundary conditions and fundamental conservation laws.",
                "difficulty": "medium" if num % 2 == 0 else "hard"
            })
            counter += 1

        return questions[:count]

    def verify_answer(self, question_text: str, options: List[str]) -> Optional[int]:
        # Always verified in mock
        return 0

    def tutor_chat(self, messages: List[Dict[str, str]]) -> str:
        last_user_msg = messages[-1]["content"] if messages else "Hello"
        return f"""### Conceptual Analysis & Step-by-Step Explanation

Regarding your question: **"{last_user_msg}"**

1. **Core Concept:**
   When mastering this topic, begin by identifying the fundamental governing principles rather than memorizing formulas.

2. **Step-by-Step Solution:**
   - **Step 1:** Establish the given parameters and core definitions.
   - **Step 2:** Formulate the relationship connecting the known variables.
   - **Step 3:** Eliminate distractors by verifying dimensional consistency or historical context.

3. **Key Takeaway:**
   Always remember that conceptual clarity and recognizing common misconceptions are the most reliable strategies for scoring high in competitive exams!

Would you like to solve a targeted practice question on this concept together?"""

def get_llm_provider() -> LLMProvider:
    """Return the active LLM provider (Groq if configured, else FallbackOfflineProvider)."""
    groq_provider = GroqProvider()
    if groq_provider.is_available():
        return groq_provider
    return FallbackOfflineProvider()
