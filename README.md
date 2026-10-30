# Astra AI — AI Mock Test Platform for Students

A modern full-stack web application designed for students preparing for academic and competitive exams. Features AI-generated mock tests (Groq / Llama 3.3), spatial UI design with translucent glass layers, authoritative timed exam mode, performance analytics, and a step-by-step AI tutor doubt solver.

---

## Quick Start Guide

### 1. Backend (Django REST Framework)
The backend is located in `backend/` and runs with the virtual environment in `backend_venv/`:

```powershell
# From project root:
cd backend
..\backend_venv\Scripts\python.exe manage.py migrate
..\backend_venv\Scripts\python.exe manage.py seed_catalog
..\backend_venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

### 2. Frontend (React 18 + Vite + TypeScript + Tailwind CSS)
The frontend is located in `frontend/`:

```powershell
# In a separate terminal, from project root:
cd frontend
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## Instant Demo Access
You can log in with a single click using the **1-Click Demo** button on the landing page, or enter credentials:
- **Email:** `demo@mocktest.ai`
- **Password:** `DemoStudent2026!`

---

## Core Capabilities
1. **3-Step Test Setup Wizard:**
   - Step 1: Select academic discipline (Mathematics, History, Geography, Physics, Biology, Chemistry, Economics, General Knowledge).
   - Step 2: Choose from curated syllabus topics or input custom topics (with dynamic suggestion chips).
   - Step 3: Choose MCQ count (10, 20, 30, 50) and review duration specifications.
2. **AI Question Generation & Deduplication Pipeline:**
   - Batched generation (10 MCQs/batch) via Groq (`llama-3.3-70b-versatile`).
   - Strict Pydantic JSON schema output enforcement.
   - Independent low-temperature solver verification pass on answer keys.
   - Text normalization, SHA-256 hashing, and near-duplicate filtering (>0.70 similarity).
   - Automatic fallback generator for offline testing when `GROQ_API_KEY` is not present.
3. **Timed Mock Test Simulator:**
   - Authoritative server-side countdown timer with glowing orbital visual alerts.
   - Keyboard/click option selections with debounced autosaving.
   - Question palette with Answered, Unanswered, and Flagged status indicators.
   - Submission confirmation dialog displaying unanswered counts.
   - Auto-submit on timer expiration.
   - Anti-cheat protection: correct answers and explanations are strictly withheld from the client until submission.
4. **Examination Results & Detailed Review:**
   - Total score, accuracy percentage, and time spent metrics.
   - Confetti celebration on high performance (≥ 70%).
   - Full question-by-question breakdown showing selected answers, correct answer keys, and conceptual explanations.
   - **"Ask AI Tutor"** button on each question: preloads the question and explanation directly into the AI tutor chat for instant doubt resolution.
5. **Analytics Dashboard:**
   - Interactive accuracy trend curves over time (Recharts).
   - Subject-wise proficiency bars.
   - Critical focus list (weak topics below 65%).
   - Daily study streak counter.
6. **AI Doubt Solving Tutor ("Astra"):**
   - Step-by-step pedagogical reasoning.
   - Math notation and formula breakdown.
   - Saved conversation sessions with auto-titling.
