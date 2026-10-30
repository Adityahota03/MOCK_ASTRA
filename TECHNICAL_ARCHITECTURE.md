# Technical Architecture: AI Mock Test Platform for Students

## 1. Overview

A web app where students pick a **subject → topic → number of MCQs**, get AI-generated questions (via Groq API), take a timed mock test, and track performance on a dashboard. Includes a doubt-solving chatbot, authentication, and profile management.

> **Note on "fine-tuning":** Groq's API serves hosted models for inference and does not provide fine-tuning. We achieve "fine-tuned" behavior through (1) a strict system prompt per subject, (2) JSON-schema-constrained output, (3) a verification pass on answer keys, and (4) server-side de-duplication. If true fine-tuning is needed later, fine-tune an open-weight model (e.g., Llama) elsewhere and swap the provider behind the `LLMProvider` interface.

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     React SPA (Vite)                      │
│  Auth · Wizard · Mock Test · Dashboard · Profile · Chat   │
│  Spatial UI (glass layers, depth, parallax)               │
└───────────────▲──────────────────────────────────────────┘
                │ HTTPS · JSON REST (JWT)
┌───────────────┴──────────────────────────────────────────┐
│                Nginx (TLS, gzip, rate limit)              │
└───────────────▲──────────────────────────────────────────┘
                │
┌───────────────┴──────────────────────────────────────────┐
│          Django + Django REST Framework (Gunicorn)        │
│  apps: accounts · catalog · questions · tests ·           │
│        analytics · chat · llm                             │
└───────┬───────────────┬─────────────────┬────────────────┘
        │               │                 │
┌───────▼──────┐ ┌──────▼───────┐  ┌──────▼──────────────┐
│ PostgreSQL   │ │ Redis        │  │ Celery workers      │
│ (primary DB) │ │ cache/broker │  │ question generation │
│ + pg_trgm    │ │ throttling   │  │ analytics rollups   │
└──────────────┘ └──────────────┘  └──────┬──────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │  Groq API   │
                                   └─────────────┘
```

## 3. Backend Modules (Django apps)

| App | Responsibility |
|---|---|
| `accounts` | Custom User, registration, login, JWT, password reset, profile |
| `catalog` | Subjects and topics (seeded: Math, History, Geography, Physics, Biology, Chemistry, Economics, GK, …) |
| `questions` | Question storage, hashing, de-duplication, per-user history |
| `llm` | `LLMProvider` interface, `GroqProvider`, prompt templates, validators |
| `tests` | Test sessions, timer, answers, scoring |
| `analytics` | Dashboard aggregates (accuracy, trends, weak topics) |
| `chat` | Conversations and messages for the doubt-solving chatbot |

## 4. Data Model (PostgreSQL)

```
User(id, email*, password_hash, full_name, is_active, created_at)
Profile(user_id FK, avatar_url, grade_level, institution, bio, timezone)

Subject(id, name*, slug*, is_active)
Topic(id, subject_id FK, name, slug, UNIQUE(subject_id, slug))

Question(id, subject_id, topic_id, text, options JSONB[4], correct_index,
         explanation, difficulty, text_hash CHAR(64) INDEX,
         model_name, verified BOOL, created_at)
UserQuestionHistory(id, user_id, question_id, text_hash, seen_at,
         UNIQUE(user_id, text_hash))

TestSession(id UUID, user_id, subject_id, topic_id, num_questions,
         duration_seconds, started_at, expires_at, submitted_at NULL,
         status[in_progress|submitted|expired], score, accuracy)
TestSessionQuestion(id, session_id, question_id, position,
         selected_index NULL, is_correct NULL, time_spent_sec)

ChatConversation(id, user_id, title, created_at)
ChatMessage(id, conversation_id, role[user|assistant], content, created_at)
```

Indexes: `(user_id, subject_id)` on history joins, `text_hash`, `pg_trgm` GIN index on `Question.text` for near-duplicate checks, `(user_id, submitted_at)` on `TestSession` for dashboards.

## 5. Question Generation Pipeline (core feature)

1. **Request:** `POST /api/tests/generate/ {subject, topic, count}`
2. **Validate:** subject is in catalog, `count` in 5–50, topic length and charset checked and sanitized.
3. **Load exclusion set:** fetch the user's previously seen `text_hash`es and the last ~40 question stems for that subject+topic.
4. **Generate in batches:** 10 questions per Groq call (better accuracy than 30 in one shot), run in parallel via Celery. The prompt includes the subject persona, the topic, a difficulty mix, and an "avoid these questions" list.
5. **Constrain output:** Groq JSON mode with a schema:
   `{questions:[{text, options[4], correct_index, explanation, difficulty}]}`
6. **Validate:** exactly 4 distinct options, `correct_index` in 0–3, non-empty explanation, language and length checks.
7. **Verify answer key:** a second low-temperature call ("solve this question independently") and the question is kept only if the solver's answer matches `correct_index`. Mismatches are dropped.
8. **De-duplicate:**
   - Normalize text (lowercase, strip punctuation), SHA-256 hash, and reject if it exists in the user's history.
   - Near-duplicate check with `pg_trgm` similarity > 0.7 against the user's history for that topic.
9. **Top up:** if fewer than `count` survive, regenerate the shortfall (max 3 retries, with a higher temperature and a larger avoid-list).
10. **Persist:** save questions, write `UserQuestionHistory`, create the `TestSession`, and return the session ID.

**Latency handling:** generation for 30 MCQs can take 5–20 s. The API returns `202 {job_id}`, the client polls `GET /api/tests/generate/{job_id}` (or uses SSE) while showing a spatial loading animation.

**Cost saving:** the `Question` table doubles as a bank. Before calling Groq, up to 50% of the request can be filled from verified questions the user has never seen. The rest are generated fresh.

## 6. Mock Test Engine

- `expires_at = started_at + duration` is set **server-side**. The client countdown is cosmetic only.
- Duration default: `count × 60 s` (configurable).
- Correct answers and explanations are **never sent** in the question payload during the test.
- Answers are autosaved: `PATCH /api/tests/{id}/answers/`.
- Submit: `POST /api/tests/{id}/submit/` scores server-side. A Celery beat job auto-expires and scores abandoned sessions. Submissions after `expires_at` + grace (5 s) are rejected with the saved answers scored.
- The result payload includes per-question correctness, explanations, and time spent.

## 7. Dashboard & Analytics

Metrics (computed with SQL aggregates, cached in Redis for 60 s):
- Total tests, average score, accuracy trend (line chart over time)
- Accuracy by subject (bar/radar) and weakest topics
- Average time per question, streak, recent tests table

## 8. Chatbot

- `POST /api/chat/conversations/{id}/messages/` stores the user message, sends the last N messages plus a tutor system prompt to Groq, and streams the response (SSE).
- System prompt: step-by-step student tutor, refuses non-educational abuse, keeps answers concise.
- History is capped (last 20 messages) to control tokens.

## 9. REST API Surface

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register/`, `/login/`, `/logout/`, `/token/refresh/`, `/password/reset/`, `/password/reset/confirm/` |
| Profile | `GET/PATCH /api/me/`, `POST /api/me/password/change/` |
| Catalog | `GET /api/subjects/`, `GET /api/subjects/{id}/topics/` |
| Tests | `POST /api/tests/generate/`, `GET /api/tests/generate/{job}/`, `GET /api/tests/{id}/`, `PATCH /api/tests/{id}/answers/`, `POST /api/tests/{id}/submit/`, `GET /api/tests/` |
| Dashboard | `GET /api/dashboard/summary/`, `/trend/`, `/subjects/` |
| Chat | `GET/POST /api/chat/conversations/`, `POST /api/chat/conversations/{id}/messages/` |

Conventions: DRF serializers, pagination, `drf-spectacular` for OpenAPI docs, versioned under `/api/v1/`.

## 10. Frontend Architecture (React)

```
src/
 ├─ app/            router, providers, query client
 ├─ features/
 │   ├─ auth/       login, register, guards
 │   ├─ wizard/     3-step subject → topic → count
 │   ├─ test/       question view, timer, palette, submit
 │   ├─ dashboard/  charts, stat cards
 │   ├─ profile/
 │   └─ chat/
 ├─ components/ui/  GlassCard, DepthPanel, FloatingNav, Button
 ├─ lib/            axios client, auth interceptor
 └─ styles/         tokens, spatial theme
```

- State: TanStack Query (server state) + Zustand (timer/test UI state).
- Routing: React Router; protected routes.
- Charts: Recharts. Motion: Framer Motion.

### Spatial UI Design Language
- Layered translucent "glass" panels (`backdrop-filter: blur`), soft shadows, and depth via z-axis offsets.
- Floating navigation dock, with cards that tilt on hover (CSS 3D transforms / parallax).
- Ambient gradient background with subtle animated orbs; high contrast text on glass.
- Wizard is a 3-card depth stack that moves forward in space as each step completes.
- Respect `prefers-reduced-motion`; keep WCAG AA contrast.

## 11. Deployment

- Docker Compose: `nginx`, `web` (Gunicorn), `worker`, `beat`, `postgres`, `redis`, `frontend` (static build).
- CI/CD: GitHub Actions (lint, tests, build, deploy).
- Config via environment variables (`GROQ_API_KEY`, `DATABASE_URL`, `SECRET_KEY`, …).
- Observability: structured JSON logs, Sentry for errors, and Prometheus-style metrics (LLM latency, failure rate, dedup rejections).

## 12. Scalability & Reliability

- Stateless Django containers scale horizontally; Celery workers scale by queue depth.
- Groq rate limits handled with exponential backoff and a fallback model.
- DB: connection pooling (pgBouncer), read replica for analytics when needed.
- Idempotency key on generate requests to prevent double charges and duplicate sessions.
