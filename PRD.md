# Product Requirements Document (PRD)
**Product:** AI Mock Test Platform for Students
**Version:** 1.0 · **Date:** 27 Oct 2026

## 1. Purpose
Help students practice with fresh, accurate, AI-generated MCQ mock tests on any topic, get timed test experience, track progress, and clear doubts through an AI tutor.

## 2. Problem Statement
Students rely on static question banks that repeat, don't cover specific topics, and give no analytics. They need on-demand, topic-specific, non-repeating questions with realistic exam conditions and feedback.

## 3. Goals & Success Metrics

| Goal | Metric / Target |
|---|---|
| Accurate questions | ≥ 95% of generated answer keys verified correct (sampled review) |
| No repetition | 0 exact duplicates and < 2% near-duplicates per user per topic |
| Fast generation | 30 MCQs ready in ≤ 20 s (p90) |
| Engagement | ≥ 3 tests per active user per week; 40% week-4 retention |
| Reliability | Test submission success ≥ 99.9% |

## 4. Target Users
- **Primary:** school and college students preparing for exams (class tests, competitive exams, GK).
- **Secondary:** self-learners; teachers (future).

## 5. Scope

### In Scope (v1)
1. User authentication (register, login, logout, password reset)
2. 3-step test creation wizard (subject → topic → number of MCQs)
3. AI MCQ generation via Groq (accurate, non-repeating per user)
4. Mock test page with countdown timer and submit
5. Result page with answers and explanations
6. Performance dashboard
7. User profile update
8. AI chatbot for asking and solving problems

### Out of Scope (v1)
Teacher/classroom features, payments, native mobile apps, leaderboards, offline mode, true model fine-tuning.

## 6. Functional Requirements

### FR-1 Authentication
- FR-1.1 Register with email + password (+ name); email verification.
- FR-1.2 Login/logout; session persists via refresh token.
- FR-1.3 Forgot/reset password via email link.
- FR-1.4 All app pages except login/register/landing require authentication.

### FR-2 Test Creation Wizard
- FR-2.1 **Step 1:** choose a subject from: Mathematics, History, Geography, Physics, Biology, Chemistry, Economics, General Knowledge (extensible list).
- FR-2.2 **Step 2:** enter a topic (e.g., "Stone Age" under History); suggestions shown; 2–100 chars.
- FR-2.3 **Step 3:** choose the number of MCQs (5–50; default 30).
- FR-2.4 The Start button is enabled only when all three are completed; on click the user is shown a loading state, then redirected to the mock test page.
- FR-2.5 The user can go back and edit earlier steps before starting.

### FR-3 Question Generation
- FR-3.1 Generate exactly N MCQs, each with 4 options, one correct answer, and an explanation.
- FR-3.2 Questions must be relevant to the chosen subject and topic and factually accurate (verification pass).
- FR-3.3 For repeat requests on the same subject/topic by the same user, questions must differ from all previously served questions (exact and near-duplicate check).
- FR-3.4 Mixed difficulty (easy/medium/hard) by default.
- FR-3.5 If fewer than N valid questions can be produced after retries, inform the user and offer the available count.

### FR-4 Mock Test Page
- FR-4.1 Displays one question at a time with options, a question palette (answered/unanswered/flagged), and previous/next.
- FR-4.2 Visible **countdown timer** (default 1 min per question); warning at 5 min and 1 min remaining.
- FR-4.3 **Submit button** with a confirmation dialog showing unanswered count.
- FR-4.4 Auto-submit when time reaches zero.
- FR-4.5 Answers autosave; refresh/reconnect restores state and the remaining time.
- FR-4.6 Correct answers hidden until submission.

### FR-5 Results
- FR-5.1 Show score, accuracy, time taken, and a per-question review with correct answer and explanation.
- FR-5.2 "Retake with new questions" and "Ask the tutor about this question" actions.

### FR-6 Dashboard
- FR-6.1 Summary cards: tests taken, average score, best subject, current streak.
- FR-6.2 Accuracy trend over time; subject-wise performance; weak topics list.
- FR-6.3 Recent tests table with links to results.
- FR-6.4 Empty state for new users with a CTA to start the first test.

### FR-7 Profile
- FR-7.1 View and edit name, avatar, grade/class, institution, bio.
- FR-7.2 Change password (requires current password).
- FR-7.3 Delete account and export data.

### FR-8 Chatbot
- FR-8.1 Chat interface for asking study questions and solving problems step by step.
- FR-8.2 Streaming responses; conversation history saved and listed.
- FR-8.3 Math/formula-friendly rendering; sanitized Markdown.
- FR-8.4 Stays educational; refuses unsafe or off-topic abuse.

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Page loads < 2 s (p75); API p95 < 500 ms excluding LLM calls |
| Availability | 99.5% monthly uptime target |
| Scalability | 1,000 concurrent users on initial infrastructure; horizontal scaling path |
| Security | Per the Security Architecture doc (OWASP Top 10, hashed passwords, rate limits, hidden answers) |
| Accessibility | WCAG 2.1 AA; keyboard navigation; reduced-motion support |
| Compatibility | Latest Chrome, Edge, Firefox, Safari; responsive down to 360 px |
| Privacy | Minimal PII; deletion/export; compliance with applicable law (e.g., India DPDP Act) |
| Maintainability | ≥ 80% backend test coverage on core flows; OpenAPI docs |

## 8. UI/UX Requirements: Spatial UI Design
- Layered glass panels with blur and soft shadows to create depth.
- Floating dock navigation; cards tilt/parallax subtly on hover.
- Wizard presented as a 3D card stack that advances in depth per step.
- Ambient gradient background with gentle motion; dark and light themes.
- Timer shown as a prominent floating ring; the Submit button is visually distinct.
- Smooth transitions between pages (Framer Motion); skeleton loaders.
- All motion respects `prefers-reduced-motion`; contrast meets AA.

### Key Screens
1. Landing / Login / Register
2. Dashboard
3. New Test Wizard (3 steps)
4. Generating (loading)
5. Mock Test
6. Result & Review
7. Test History
8. Profile & Settings
9. Chatbot

## 9. User Stories

- As a student, I want to pick a subject, topic, and count so I get a test on exactly what I'm studying.
- As a student, I want new questions each time I repeat a topic so I don't memorize old answers.
- As a student, I want a countdown and submit button to simulate real exam conditions.
- As a student, I want to see my accuracy trends so I know where to improve.
- As a student, I want to ask an AI tutor to explain a question I got wrong.
- As a user, I want to update my profile and keep my account secure.

## 10. Acceptance Criteria (key)

| ID | Criteria |
|---|---|
| AC-1 | Selecting History → "Stone Age" → 30 returns exactly 30 MCQs, each with 4 options and an explanation |
| AC-2 | Running AC-1 a second time yields 30 questions with no exact match and no near-duplicate (similarity > 0.7) to the first set |
| AC-3 | Timer reaches 0 → test auto-submits and the result page loads |
| AC-4 | The test API response contains no correct answers before submission |
| AC-5 | A user cannot access another user's test, result, or chat (404) |
| AC-6 | Refreshing the test page mid-test preserves answers and the correct remaining time |
| AC-7 | Dashboard reflects a newly submitted test within 5 s |
| AC-8 | The login endpoint is throttled after repeated failures |

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM factual errors | Solver verification pass, sampled human review, a "report question" button |
| Groq rate limits / downtime | Backoff, fallback model, question bank reuse |
| Cost growth | Per-user quotas, bank reuse, smaller model for verification |
| Repetition at high usage | Hash + trigram dedup, an avoid-list, and topic sub-variation prompts |
| Prompt injection via topic | Input sanitization, delimiters, schema-validated output |
| Cheating/answer leakage | Server-side timer and scoring, answers hidden |

## 12. Milestones (suggested, ~10 weeks)

| Phase | Weeks | Deliverables |
|---|---|---|
| 1. Foundation | 1–2 | Repo, Docker, DB schema, auth, CI |
| 2. Generation engine | 3–4 | Groq provider, prompts, verification, dedup, Celery job |
| 3. Test experience | 5–6 | Wizard, mock test page, timer, submit, results |
| 4. Insights | 7 | Dashboard, profile |
| 5. Chatbot | 8 | Streaming chat, history |
| 6. Polish & hardening | 9–10 | Spatial UI polish, security review, load test, launch |

## 13. Future Enhancements
Adaptive difficulty, spaced-repetition review of missed questions, leaderboards, teacher classrooms, PDF export of tests, multilingual support (Hindi, Odia), voice tutor, and real fine-tuning on a verified question bank.

## 14. Open Questions
1. Exact subject/topic list and exam boards (CBSE, state boards, competitive exams)?
2. Default time per question, and is it user-configurable?
3. Are users under 18, and do we need parental consent flows?
4. Free vs. paid limits on daily generations?
