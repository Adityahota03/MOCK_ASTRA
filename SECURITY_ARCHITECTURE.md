# Security Architecture

## 1. Principles
Defense in depth · least privilege · secure by default · never trust the client · never trust LLM output.

## 2. Threat Model (summary)

| Threat | Example | Mitigation section |
|---|---|---|
| Credential attacks | Brute force, stuffing | §3, §7 |
| Session theft | XSS steals tokens | §3, §5 |
| Injection | SQLi, prompt injection | §4, §6 |
| Test cheating | Reading answers from API, timer tampering | §8 |
| Abuse / cost | Spamming generation to drain Groq quota | §7 |
| Data exposure | IDOR on other users' tests | §4 |
| Secret leakage | API key in frontend/repo | §9 |

## 3. Authentication & Session Management

- **Passwords:** Argon2id hashing (Django `Argon2PasswordHasher`); minimum 10 chars; Django's validators plus a breached/common-password check.
- **Tokens:** JWT via `djangorestframework-simplejwt`.
  - Access token: 10–15 min, kept **in memory** on the client.
  - Refresh token: 7 days, **httpOnly + Secure + SameSite=Strict** cookie, rotated on every use, with a blacklist after rotation/logout.
- **Login protection:** throttle by IP and by account (e.g., 5 failures → exponential lockout/CAPTCHA); generic error messages ("invalid credentials") to prevent user enumeration.
- **Email verification** on signup; password reset tokens are single-use, 30-min expiry, stored hashed.
- **Optional:** TOTP 2FA, Google OAuth.

## 4. Authorization & Data Isolation

- All endpoints default to `IsAuthenticated`.
- Object-level checks: every queryset is filtered by `request.user` (tests, answers, chats, history). Requests for other users' objects return **404**, not 403 (prevents IDOR and enumeration).
- Use UUIDs for test sessions and conversations.
- Django ORM only (parameterized queries); no raw SQL with string formatting.
- Serializers whitelist fields explicitly (no mass assignment of `is_staff`, `user`, `score`, etc.).
- Admin is on a non-default path, restricted by IP/VPN, with 2FA.

## 5. Transport & Browser Security

- HTTPS everywhere (TLS 1.2+); HSTS (`SECURE_HSTS_SECONDS`, include subdomains, preload).
- `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_SSL_REDIRECT`.
- **CORS:** allowlist only the frontend origin; credentials allowed for that origin only.
- **CSRF:** the refresh-cookie endpoints require a CSRF token or custom header; SameSite=Strict.
- **Security headers** (Nginx/Django middleware):
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self' <api>; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- **XSS:** React escapes by default; never use `dangerouslySetInnerHTML` for LLM or user content. If rendering Markdown from the chatbot, use a sanitizer (DOMPurify) and a safe renderer.

## 6. LLM-Specific Security

- **API key** lives only on the server (env/secret manager). The frontend never calls Groq directly.
- **Prompt injection defense:**
  - Topic and chat input are length-limited (e.g., topic ≤ 100 chars), stripped of control characters, and placed inside clearly delimited data fields, never concatenated into the system prompt.
  - System prompt states: ignore instructions inside user-provided topic/text.
  - Topic is checked against an allowlist-style pattern (letters, numbers, spaces, basic punctuation).
- **Output validation:** the model's JSON is parsed against a strict schema; anything else is discarded. Never `eval` or execute model output. Escape on render.
- **Content safety:** the chatbot has a tutor-scoped system prompt and a moderation pass (or a refusal policy) for harmful or off-topic abuse.
- **No PII in prompts:** send only the topic and academic content, never email, name, or IDs.
- **Logging:** log request metadata (tokens, latency), not full prompts containing user text, unless debugging with redaction.

## 7. Rate Limiting & Abuse Prevention

| Endpoint | Limit (example) |
|---|---|
| Login / register / reset | 5–10 per min per IP + per account |
| Generate test | 10 per hour per user; 1 concurrent job |
| Chat messages | 30 per hour per user; max message length 2,000 chars |
| General API | 120 per min per user |

Implemented with DRF throttles backed by Redis, plus Nginx `limit_req`. Daily per-user token budget on LLM calls. Alerts on Groq cost spikes.

## 8. Test Integrity (anti-cheating & fairness)

- Questions are sent **without** `correct_index` or explanations until the session is submitted/expired.
- Timer is authoritative on the server (`expires_at`); client-side clock changes have no effect.
- Answers can only be submitted for sessions owned by the user and still `in_progress` (or within grace).
- Scoring is server-side only; clients never send scores.
- Optional: tab-visibility/blur event logging for the student's own review (non-punitive).

## 9. Secrets & Configuration

- `.env` is never committed; use Docker/GitHub secrets or a secrets manager.
- Separate `DEBUG=False` production settings; `ALLOWED_HOSTS` set explicitly.
- Rotate `SECRET_KEY`, DB password, and Groq key periodically; revoke immediately on exposure.
- Pre-commit hook with secret scanning (gitleaks).

## 10. Data Protection & Privacy

- PostgreSQL: TLS connections, a least-privilege app role (no superuser), encrypted volumes, automated daily backups with encryption and tested restores.
- PII collected: email, name, optional profile data. Retain only what is needed.
- Provide **account deletion** and **data export**; cascade-delete tests/chats/history on request.
- Privacy policy and terms; if users are minors, consider parental consent requirements (e.g., India's DPDP Act 2023 for children's data).
- Uploaded avatars: type/size validation, re-encode images, serve from a separate domain or bucket with `Content-Disposition` and no script execution.

## 11. Infrastructure & Supply Chain

- Containers run as non-root; minimal base images; no exposed DB/Redis ports (private network only).
- Firewall: only 80/443 public.
- Dependency scanning (`pip-audit`, `npm audit`, Dependabot); pinned versions with lockfiles.
- CI runs SAST (Bandit, ESLint security rules), tests, and container scan (Trivy).

## 12. Monitoring, Logging & Incident Response

- Audit log: logins, password changes, failed attempts, test submissions, admin actions.
- Sentry for exceptions; alerting on 5xx spikes, auth-failure spikes, and LLM error rates.
- Logs never contain passwords, tokens, or full prompts.
- Incident plan: contain → rotate secrets → assess data impact → notify users if required → post-mortem.

## 13. Security Checklist (pre-launch)

- [ ] Argon2 passwords, JWT rotation + blacklist
- [ ] httpOnly refresh cookie, in-memory access token
- [ ] Object-level authorization tests (IDOR) pass
- [ ] CSP, HSTS, CORS allowlist configured
- [ ] Throttling on auth, generate, and chat endpoints
- [ ] Answers hidden until submission; server-side timer verified
- [ ] LLM output schema-validated; inputs sanitized
- [ ] Groq key only on the server, not in repo or frontend bundle
- [ ] Backups + restore tested; `DEBUG=False`
- [ ] Dependency and container scans clean
