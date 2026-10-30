# System Workflow

## 1. User Journey (end-to-end)

```
Register/Login → Dashboard → "New Mock Test" wizard
   Step 1: Choose Subject
   Step 2: Enter Topic
   Step 3: Choose number of MCQs
→ Generating (loading) → Mock Test page (countdown + submit)
→ Result page (score, explanations) → Dashboard updated
```

Side flows: Profile update · Chatbot doubt-solving · Test history.

## 2. Authentication Workflow

```
Client                     Django API                  DB
  │ POST /auth/register ───▶ validate, hash password ──▶ create User+Profile
  │◀── 201 ─────────────────
  │ POST /auth/login ──────▶ verify credentials
  │◀── access JWT (body) + refresh JWT (httpOnly cookie)
  │ API calls w/ Bearer access ─▶ verify signature/expiry
  │ (access expired) POST /token/refresh (cookie) ─▶ rotate refresh, blacklist old
  │ POST /auth/logout ─────▶ blacklist refresh, clear cookie
```

Password reset: request → emailed single-use, time-limited token → confirm with new password.

## 3. Test Creation Wizard Workflow

1. **Step 1, Subject:** UI loads `GET /subjects/` and the user picks one (Math, History, Geography, Physics, Biology, Chemistry, Economics, GK, …).
2. **Step 2, Topic:** free-text with suggestions from `GET /subjects/{id}/topics/` (e.g., "Stone Age" under History).
3. **Step 3, Count:** number input / stepper (e.g., 10, 20, 30; max 50).
4. The "Start" button stays disabled until all three steps are valid. On click, the client calls `POST /tests/generate/`.
5. The client shows the spatial loading screen and polls the job status.
6. On success, the client is redirected to `/test/{session_id}`.

## 4. Question Generation Sequence

```
React ──POST /tests/generate──▶ Django
                                 │ validate + sanitize input
                                 │ create GenerationJob (queued)
                                 ▼
                              Celery worker
                                 │ load user's seen hashes + recent stems
                                 │ ┌─────── loop until count reached (max 3 retries) ───────┐
                                 │ │ call Groq (batch of 10, JSON mode, avoid-list)         │
                                 │ │ schema validation                                     │
                                 │ │ solver pass → verify answer key                       │
                                 │ │ hash + pg_trgm dedup vs user history                  │
                                 │ └────────────────────────────────────────────────────────┘
                                 │ save Questions, UserQuestionHistory
                                 │ create TestSession (expires_at set)
                                 ▼
React ◀── job status = done + session_id (poll/SSE)
```

**Repeat-subject behavior:** every generated question is hashed and stored per user. On a later request for the same subject/topic, those hashes plus recent stems are given to the model as an "avoid" list, and any repeats or near-duplicates are discarded and regenerated.

## 5. Mock Test Workflow

```
GET /tests/{id}  → questions (no answers), expires_at, server_now
Client countdown = expires_at − server_now (re-synced every 30 s)

Student answers → PATCH /tests/{id}/answers  (debounced autosave)

Ends by:
  A) Student clicks Submit → confirm dialog → POST /tests/{id}/submit
  B) Timer hits 0 → client auto-submits
  C) Client gone → Celery beat marks expired + scores saved answers

Server: score, mark status, compute accuracy/time → return result
Client → /test/{id}/result (correct answers + explanations)
```

Test page UI: question card (depth layer), question palette (answered / unanswered / flagged), countdown ring, Submit button, previous/next controls. Refreshing or reopening restores state from the server.

## 6. Dashboard Workflow

- On load: `GET /dashboard/summary/`, `/trend/`, `/subjects/` (parallel).
- Shows: total tests, avg score, best subject, weak topics, accuracy trend line, subject breakdown, recent tests.
- Data refreshes after each submission (query invalidation).

## 7. Profile Workflow

`GET /me/` → edit form → `PATCH /me/` (name, avatar, grade, institution, bio). Password change is a separate endpoint and requires the current password.

## 8. Chatbot Workflow

```
Student types question
 → POST /chat/conversations/{id}/messages
 → server saves message, builds context (last 20 msgs + tutor system prompt)
 → Groq streaming call → tokens streamed to client via SSE
 → full reply saved as assistant message
```

Optional: "Ask about this question" button on the result page pre-fills the chat with that MCQ.

## 9. Error & Edge Cases

| Scenario | Handling |
|---|---|
| Groq timeout/429 | Retry with backoff; fallback model; show a friendly retry message |
| Fewer valid questions than requested | Retry up to 3 times, then offer a test with the available count (user is informed) |
| Invalid LLM JSON | Re-prompt once, then drop the batch and regenerate |
| User closes tab mid-test | Autosaved answers and server timer continue; the session auto-expires and is scored |
| Submit after expiry | Accepted within a 5 s grace period; otherwise scored from the last autosave |
| Duplicate click on Start | Idempotency key returns the same job |
| Token expiry mid-test | Silent refresh via interceptor; answers are queued locally until success |
