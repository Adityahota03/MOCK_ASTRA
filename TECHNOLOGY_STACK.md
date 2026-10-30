# Technology Stack

## 1. Summary

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Fast dev, strong ecosystem, typed code |
| UI / Styling | Tailwind CSS + custom spatial theme tokens | Rapid styling for glass/depth effects |
| Motion / 3D feel | Framer Motion, CSS 3D transforms (optional: Three.js / react-three-fiber for hero scenes) | Parallax, depth, smooth transitions |
| State | TanStack Query (server state), Zustand (UI/timer state) | Simple, minimal boilerplate |
| Forms / validation | React Hook Form + Zod | Validated wizard and profile forms |
| Charts | Recharts | Dashboard graphs |
| HTTP | Axios (interceptors for token refresh) | Auth handling |
| Backend | Python 3.12 + Django 5 + Django REST Framework | Batteries-included, secure defaults |
| Auth | djangorestframework-simplejwt (+ token blacklist), argon2-cffi | JWT with rotation |
| API docs | drf-spectacular (OpenAPI / Swagger) | Auto-generated docs |
| Database | PostgreSQL 16 (+ `pg_trgm`) | Relational integrity, JSONB, fuzzy text match |
| Cache / broker | Redis 7 | Throttling, caching, Celery broker |
| Async jobs | Celery + Celery Beat | LLM generation, auto-expiry of tests |
| LLM | Groq API (e.g., `llama-3.3-70b-versatile`; smaller model for solver/verification) | Very low latency inference |
| LLM client | Official `groq` Python SDK behind an `LLMProvider` interface | Swappable provider |
| Web server | Nginx + Gunicorn | TLS, static files, reverse proxy |
| Containers | Docker + Docker Compose | Reproducible environments |
| CI/CD | GitHub Actions | Lint, test, build, deploy |
| Observability | Sentry, structured logging, Prometheus/Grafana (optional) | Errors and performance |
| Testing | pytest + pytest-django, factory_boy; Vitest + React Testing Library; Playwright (E2E) | Full coverage pyramid |
| Code quality | Ruff, Black, mypy; ESLint, Prettier | Consistency |

## 2. Key Backend Libraries

```
django, djangorestframework, djangorestframework-simplejwt,
django-cors-headers, django-filter, drf-spectacular,
psycopg[binary], celery, redis, django-redis,
argon2-cffi, groq, pydantic (LLM output schemas),
rapidfuzz (optional fuzzy dedup), gunicorn, whitenoise,
sentry-sdk, python-dotenv / django-environ
```

## 3. Key Frontend Libraries

```
react, react-dom, react-router-dom, typescript, vite,
@tanstack/react-query, zustand, axios,
tailwindcss, framer-motion, recharts,
react-hook-form, zod, @hookform/resolvers,
dompurify, react-markdown (chat rendering, sanitized)
```

## 4. LLM Strategy (replacing "fine-tuning")

| Technique | Purpose |
|---|---|
| Subject-specific system prompts | Domain accuracy (math reasoning vs. history facts) |
| JSON mode + Pydantic schema | Reliable, parseable MCQs |
| Few-shot examples per subject | Consistent style and difficulty |
| Low temperature solver pass | Verify the correct answer |
| Avoid-list + hash/trigram dedup | No repeated questions per user |
| Batched generation (10/call) | Better quality than 30 in one call |
| Fallback model | Resilience on rate limits |

If real fine-tuning is required later: curate a dataset of verified MCQs from the `Question` bank, fine-tune an open-weight model on a platform that supports it, and plug it in through `LLMProvider`.

## 5. Environments

| Env | Setup |
|---|---|
| Local dev | Docker Compose (postgres, redis, web, worker, vite dev server) |
| Staging | Single VPS / small cloud instance, same compose stack |
| Production | Containers on a cloud VM or managed platform; managed PostgreSQL + Redis; CDN for the static frontend |

## 6. Suggested Repository Structure

```
project/
 ├─ backend/
 │   ├─ config/ (settings, urls, celery)
 │   └─ apps/ accounts, catalog, questions, tests, analytics, chat, llm
 ├─ frontend/
 │   └─ src/ app, features, components, lib, styles
 ├─ deploy/ nginx.conf, docker-compose.yml, Dockerfiles
 ├─ docs/ (these MD files)
 └─ .github/workflows/
```

## 7. Environment Variables (backend)

```
SECRET_KEY, DEBUG, ALLOWED_HOSTS
DATABASE_URL, REDIS_URL
GROQ_API_KEY, GROQ_MODEL_GENERATE, GROQ_MODEL_VERIFY
JWT_ACCESS_MINUTES, JWT_REFRESH_DAYS
CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS
EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
SENTRY_DSN
```
