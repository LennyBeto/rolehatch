# PerchRole

A free-for-job-seekers job search platform: listings aggregated directly from company career pages (Greenhouse, Lever, Workday, BambooHR), with fast filterable search, an applicant dashboard (profile, CV and cover letter builders, ATS scan), the Perchie AI assistant, and a promoted-listings model for employers. Payments run through Paystack.

![License: MIT](https://img.shields.io/badge/license-MIT-2F4F3F)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database & Migrations](#database--migrations)
- [Running Locally](#running-locally)
- [Job Scraping Pipeline](#job-scraping-pipeline)
- [Caching Strategy](#caching-strategy)
- [Authentication](#authentication)
- [Applicant Dashboard](#applicant-dashboard)
- [Perchie Chatbot](#perchie-chatbot)
- [Payments & Monetization](#payments--monetization)
- [Paywall Rules](#paywall-rules)
- [Community: PerchRole Tech Hub](#community-perchrole-tech-hub)
- [Performance & Scalability](#performance--scalability)
- [Deployment](#deployment)
- [Security](#security)
- [Project Workflow](#project-workflow)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

PerchRole solves the two-sided problem every job board has: job seekers want fresh, real listings without noise, and employers want visibility without paying agency fees. PerchRole pulls postings directly from the ATS platforms companies already use, with no manual re-posting. Browsing and searching stay free; revenue comes from promoted listings paid for by employers, plus usage-based paywalls on premium applicant tools (see [Paywall Rules](#paywall-rules)).

**Core features:**
- Multi-source job aggregation (Greenhouse, Lever, Workday, BambooHR)
- Fast, cached, filterable search (location, salary, remote type, keyword, quick-filter chips)
- Magic-link authentication (no passwords to manage or leak)
- Save / Mark Applied / Hide tracking, with hidden jobs auto-deleted after 5 days
- Applicant dashboard: profile with avatar, CV upload and parsed summary, ATS-friendly CV templates, ATS-ready cover letter builder, ATS scan
- Perchie, the in-site AI assistant (Google AI Studio / Gemini)
- Employer dashboard with domain-verified ownership; personal free-mail addresses are blocked from posting and promoting
- Paystack-powered promoted listings (feature a posting for 14 days) and a wallet with multiple payment options
- Usage-based paywalls (CV builder, ATS scan, job views, CV templates)
- PerchRole Tech Hub Discord community with a jobs feed
- Hourly automated re-sync with stale-listing cleanup

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router) + React, TypeScript |
| UI | TailwindCSS + Chakra UI |
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL (via Supabase), SQLAlchemy ORM, Alembic migrations |
| Auth | Supabase Auth (magic link / OTP) |
| Cache | Upstash Redis (serverless, REST-based) |
| Payments | Paystack (checkout + webhooks); wallet via M-Pesa, Paystack, PayPal, Bachs |
| AI | Google AI Studio (Gemini), powering Perchie |
| Hosting | Vercel (frontend), Google Cloud Run (backend) |
| CI/CD | Google Cloud Build |
| Infra as Code | Terraform |
| Scheduling | Google Cloud Scheduler |
| Containerization | Docker |

---

## Architecture

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Next.js)  │
                    └──────┬──────┘
                           │ HTTPS
                           ▼
                    ┌─────────────┐        ┌──────────────┐
                    │  Cloud Run  │◄──────►│ Upstash Redis│
                    │  (FastAPI)  │        │   (cache)    │
                    └──────┬──────┘        └──────────────┘
                           │
        ┌─────────────┬────┴────────┬──────────────┐
        ▼             ▼             ▼              ▼
 ┌───────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
 │  Supabase │ │  Paystack  │ │  Google AI │ │   Cloud    │
 │ (Postgres │ │ (Checkout  │ │   Studio   │ │  Scheduler │
 │  + Auth)  │ │ + Webhook) │ │  (Gemini)  │ │  (hourly)  │
 └───────────┘ └────────────┘ └────────────┘ └─────┬──────┘
                                                    │ triggers
                                                    ▼
                                        ┌────────────────────────┐
                                        │ /internal/sync-jobs    │
                                        │ → Greenhouse/Lever/    │
                                        │   Workday/BambooHR APIs│
                                        └────────────────────────┘
```

**Request flow (search):** Frontend → FastAPI `/api/jobs/search` → check Upstash Redis cache → on miss, query Postgres (featured listings sorted first) → cache result → return.

**Scraping flow:** Cloud Scheduler (hourly, secret-header authenticated) → `/internal/sync-jobs` → iterates active companies → per-source scraper adapter → idempotent upsert into `jobs` (dedup via `(source, external_id)` unique index + Redis pre-check) → deactivates stale postings not seen in the current run.

---

## Repository Structure

```
rolehatch/
├── LICENSE
├── README.md
├── EVIDENCE.md              # Chronological proof-of-build log
├── BUILDLOG.md              # Phase-by-phase progress tracker
├── docker-compose.yml       # Local dev orchestration
├── frontend/                # Next.js app
│   ├── app/                 # Routes: /, /auth/callback, /dashboard, /post-job,
│   │                        #   /promote/[jobId], /applicant/dashboard,
│   │                        #   /applicant/cv-templates, cover letter templates,
│   │                        #   wallet, /blog, /pricing, /company, /contact, legal pages
│   ├── components/          # SearchBar, FilterSidebar, JobList, SignInModal,
│   │                        #   CVBuilderCard, CVTemplatePicker, ChatWidget (Perchie), etc.
│   ├── lib/                 # Supabase client, AuthContext, API helpers
│   ├── theme/               # Chakra theme (brand colors)
│   └── public/logo.svg
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── core/            # config, security (JWT), cache (Redis)
│   │   ├── db/              # SQLAlchemy session/base
│   │   ├── models/          # Company, Job, SavedJob, JobAlert, ContactMessage
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── api/routes/      # jobs, saved_jobs, promote, employer_jobs, job_alerts,
│   │   │                    #   companies, contact, internal, chat, wallet
│   │   └── services/
│   │       ├── pipeline.py  # Scraper → Postgres upsert pipeline
│   │       ├── scrapers/    # greenhouse, lever, workday, bamboohr
│   │       └── chatbot      # Perchie service (Gemini)
│   ├── alembic/             # DB migrations
│   └── Dockerfile
└── infra/
    ├── cloudbuild.yaml      # CI/CD pipeline
    └── main.tf              # Terraform: Artifact Registry, secrets, scheduler
```

---

## Getting Started

### Prerequisites
- Node.js 20.9+
- Python 3.12+
- A [Supabase](https://supabase.com) project
- An [Upstash](https://upstash.com) Redis database
- A [Paystack](https://paystack.com) account (test mode is fine to start)
- A [Google AI Studio](https://aistudio.google.com) API key (for Perchie)
- Google Cloud SDK (`gcloud`) for deployment

### Clone and install

```bash
git clone https://github.com/LennyBeto/rolehatch.git
cd rolehatch

# Frontend
cd frontend
npm install
cd ..

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

---

## Environment Variables

### `backend/.env`

```dotenv
# ── Database ──────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# ── Supabase (Project Settings → API) ────────────────────
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-here          # Settings → JWT Keys → Legacy JWT Secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # secret! server-side only

# ── Cache ─────────────────────────────────────────────────
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-upstash-token

# ── Internal / scheduler ─────────────────────────────────
SCHEDULER_SECRET=generate-with-openssl-rand-hex-32

# ── Paystack ──────────────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_test_...      # also used to verify webhook signatures (x-paystack-signature)
PAYSTACK_PUBLIC_KEY=pk_test_...
FRONTEND_URL=http://localhost:3000

# ── AI (Perchie) ──────────────────────────────────────────
GEMINI_API_KEY=your-google-ai-studio-key

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000

# ── DB pool / workers (tune for load) ─────────────────────
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
WEB_CONCURRENCY=2
```

### `frontend/.env.local`

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Never** prefix `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` or `GEMINI_API_KEY` with `NEXT_PUBLIC_`; that inlines them into client-side JS. Only the anon/publishable Supabase key belongs in the frontend.

---

## Database & Migrations

Schema lives in `backend/app/models/`: `Company`, `Job`, `SavedJob`, `JobAlert`, `ContactMessage`, plus the tables backing paywall quotas and credits.

```bash
cd backend
alembic upgrade head
```

Enable required Postgres extensions once (via Supabase SQL editor or a migration):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Row-Level Security policies (run in Supabase SQL editor) restrict `saved_jobs` to their owning user and lock `jobs` writes to the service role. See `EVIDENCE.md` for the exact statements applied.

---

## Running Locally

```bash
# Terminal 1: backend
cd backend
uvicorn app.main:app --reload --port 8081

# Terminal 2: frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000`.

Or with Docker Compose:

```bash
docker compose up --build
```

---

## Job Scraping Pipeline

Adapters live in `backend/app/services/scrapers/`, one per source:

| Source | Method | Notes |
|---|---|---|
| Greenhouse | Public JSON API | `boards-api.greenhouse.io`; stable, documented |
| Lever | Public JSON API | `api.lever.co/v0/postings`; stable, documented |
| Workday | Internal CXS endpoint | Undocumented, self-throttled, per-tenant |
| BambooHR | Public careers feed | Undocumented, verify ToS per tenant |

`pipeline.py` orchestrates: fetch → Redis dedup pre-check → idempotent Postgres upsert (`ON CONFLICT (source, external_id) DO UPDATE`) → deactivate postings not seen in the current run. It also infers level, remote type and tech stack from each posting. Triggered hourly via Cloud Scheduler → `POST /internal/sync-jobs` (shared-secret header, not a user JWT).

**Before adding a new source:** check its `robots.txt` and Terms of Service. Workday/BambooHR endpoints are undocumented and can change without notice; failures are isolated per company so one broken tenant doesn't halt the whole sync run.

---

## Caching Strategy

Upstash Redis, applied in priority order for capacity savings:

1. **Search/filter results**: ~55 min TTL (just under the hourly scrape cycle)
2. **Individual job listings**: 1 hr TTL
3. **Facet/aggregation counts and platform stats**: 30 min TTL
4. **Scraper dedup**: 24 hr TTL per posting, avoids redundant DB writes on unchanged listings

---

## Authentication

Supabase magic-link (OTP) auth; no passwords stored or managed by PerchRole. Flow:

1. User enters email → `supabase.auth.signInWithOtp()`
2. Clicks emailed link → redirected to `/auth/callback`
3. Session established client-side; subsequent API calls attach the Supabase JWT as a `Bearer` token
4. Backend verifies the JWT against `SUPABASE_JWT_SECRET` in `core/security.py`

Protected actions are scoped server-side to `user["sub"]` **and** backed by Supabase Row-Level Security: two independent enforcement layers. Auth is stateless, so any number of users can be signed in concurrently.

---

## Applicant Dashboard

`/applicant/dashboard` is the job seeker's home:

- **Profile:** avatar (upload or avatar picker), full name, expertise, and CV upload. The CV is parsed into a "Full Name - Expertise" headline and a 30-50 word professional summary (or typed manually). Saving collapses the section to avatar, name and expertise; "Reset profile details" restores the default state. Profile details and the CV can be edited or deleted.
- **Job tracking:** Saved / Applied / Hidden jobs. Jobs hidden for more than 5 days are deleted automatically.
- **CV Builder:** "Build my CV" opens `/applicant/cv-templates`, where the applicant picks from five ATS-friendly templates (Classic, Modern, Compact, Technical, Executive) previewed with a sample CV, then reviews and completes Work Experience, Education and Skills. The applicant's CV (PDF or Google Docs) is parsed and rendered into the chosen template, with CV readiness above 95% once all sections are completed.
- **Cover Letter Builder:** "Build my Cover Letter" opens a Cover Letter Templates page with five ATS-friendly single-column templates, following the same flow as the CV builder.
- **ATS scan:** scores a CV against ATS criteria (quota rules in [Paywall Rules](#paywall-rules)).

---

## Perchie Chatbot

Perchie is the site-wide assistant, mounted as a chat widget. It answers questions about PerchRole, interviews, CVs and general requests. The frontend `ChatWidget` calls the `/api/chat` route, which uses a backend chatbot service backed by **Google AI Studio (Gemini)**. The provider is isolated behind that service, so it can be swapped without touching the widget.

---

## Payments & Monetization

All payments are processed through **Paystack** (replacing the earlier Stripe integration).

**Promoted listings:** employers pay to pin a listing to the top of search results for 14 days ($49 default, configurable).

- **Checkout:** `POST /api/promote/checkout/{job_id}` initializes a Paystack transaction and returns the authorization URL
- **Activation:** only via the signature-verified Paystack webhook (HMAC-SHA512 of the raw body against `PAYSTACK_SECRET_KEY`, header `x-paystack-signature`); never trusted from a client redirect
- **Employer verification:** gated on the signed-in user's email domain matching the job's `Company.domain`. Free-mail domains (Gmail, Yahoo, Outlook, etc.) are blocked on both `/post-job` and promote, so personal accounts cannot post
- **Dashboard:** `/dashboard` shows an employer their own domain-matched listings and lets them promote directly

**Wallet payment options** (each shown as its own card on the wallet page):

| Provider | Status |
|---|---|
| M-Pesa | Live |
| Paystack | Live |
| PayPal | Added as its own card |
| Bachs (bachs.io) | Added as its own card |
| Payoneer | Planned |
| Wise | Planned |

Providers are added one at a time; each is isolated so existing options keep working.

---

## Paywall Rules

Premium applicant tools are metered per user. Credits are consumed atomically in the database (no double-spend), a failed build refunds its credit, and payment grants are idempotent, keyed on the Paystack transaction reference.

| Feature | Free allowance | Paid |
|---|---|---|
| CV builder | 1 free build per user per month | $5 per further build |
| ATS scan | 1 free scan per user (lifetime), then locked | $3.99 buys 3 more scans, then locked again |
| CV template build | 1 free build (lifetime), then locked | $3.99 buys 3 more builds; packs stack |
| Job listings | 8 job views per month (counted on each "View Job" click) | $6/month membership for full access |
| Discord channel | Members only | One-time membership fee, no recurring subscription (price TBD) |

Paywalls are rolled out one feature at a time.

---

## Community: PerchRole Tech Hub

PerchRole Tech Hub is the project's Discord server, embedded on the site. Tech jobs from partner platforms (micro1, Mercor, Braintrust, Turing) are posted into the opportunities channel via webhook, divided by tech stack, with the PerchRole referral link attached per site. Review each platform's Terms of Service and referral program rules before enabling a feed.

---

## Performance & Scalability

- Redis caching on search, job detail, facets and stats keeps hot paths off Postgres
- Search selects only the columns it returns instead of hydrating full ORM objects
- Tunable SQLAlchemy pool (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT`) and Uvicorn workers (`WEB_CONCURRENCY`)
- Cloud Run autoscaling (`--max-instances`) for peak load; raise `--min-instances` above 0 to avoid cold starts
- GZip responses; indexed filters (`pg_trgm` title index, location, remote type, salary)
- Rate limiting via SlowAPI on public write endpoints (job alerts, contact, employer postings). Note: the default in-memory limiter is per instance; point it at Redis for limits shared across Cloud Run instances

---

## Deployment

### Backend → Google Cloud Run

```bash
gcloud run deploy rolehatch-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=0 \
  --set-secrets="DATABASE_URL=database-url:latest,SUPABASE_JWT_SECRET=supabase-jwt-secret:latest,UPSTASH_REDIS_TOKEN=upstash-token:latest,SCHEDULER_SECRET=scheduler-secret:latest,PAYSTACK_SECRET_KEY=paystack-secret-key:latest,GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars="ALLOWED_ORIGINS=https://rolehatch.com,UPSTASH_REDIS_URL=https://your-instance.upstash.io,FRONTEND_URL=https://rolehatch.com,SUPABASE_URL=https://your-project-ref.supabase.co"
```

Secrets are pulled from Google Secret Manager at deploy time; never baked into the image or committed. Requires an active billing account linked to the GCP project (`gcloud billing projects link`), even though usage typically stays within Cloud Run's Always Free tier (2M requests/month).

Paystack webhook URL to register in the Paystack dashboard: `https://<api-domain>/api/promote/webhook`.

### Frontend → Vercel

```bash
cd frontend
vercel link
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod
```

### CI/CD

`infra/cloudbuild.yaml` automates build → push → deploy → migrate on every push to `main`. Trigger it once via:

```bash
gcloud builds triggers create github \
  --repo-name="rolehatch" --repo-owner="LennyBeto" \
  --branch-pattern="^main$" --build-config="infra/cloudbuild.yaml"
```

### Scheduled scraping

```bash
gcloud scheduler jobs create http rolehatch-sync \
  --schedule="0 * * * *" \
  --uri="https://rolehatch-api-xxxxx.run.app/internal/sync-jobs" \
  --http-method=POST \
  --headers="X-Scheduler-Secret=$(gcloud secrets versions access latest --secret=scheduler-secret)"
```

Full step-by-step walkthrough (Supabase → GCP secrets → Cloud Run → migrations → Vercel → domain mapping → post-deploy checklist) is documented in `BUILDLOG.md`.

---

## Security

- **No raw SQL**: all queries via SQLAlchemy ORM, preventing injection
- **Input validation**: every request/response shaped by Pydantic schemas
- **JWT verification**: Supabase tokens verified server-side on every protected route
- **Row-Level Security**: database-level enforcement independent of API logic
- **Secrets**: never committed; loaded via environment locally, Google Secret Manager in production
- **CORS**: explicit origin allowlist, no wildcards
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` set on every response
- **Webhook signature verification**: Paystack events verified (HMAC-SHA512) before any state change; client redirects are never trusted as proof of payment
- **Idempotent payments**: grants keyed on the transaction reference; credit spends are atomic and refunded on failure
- **Employer verification**: promoted-listing access gated on verified work-email domain ownership, with free-mail domains blocked
- **Scraping etiquette**: custom identifying User-Agent, self-throttled requests, per-tenant failure isolation, ToS/robots.txt review before adding a source

---

## Project Workflow

This repo follows a documented build process:
- **`BUILDLOG.md`**: phase-by-phase checklist of what's built, in progress, or planned
- **`EVIDENCE.md`**: chronological log of decisions, verification steps, and what was tested at each stage
- **`LICENSE`**: MIT

Features are shipped one at a time, each with its own `git add` and commit.

---

## Roadmap

- [ ] Payoneer and Wise wallet options
- [ ] Discord members-only channel paywall (one-time fee)
- [ ] Salary insights widget per role/company, aggregated from scraped data
- [ ] Talent Network: opt-in candidate pool with employer search access
- [ ] Employer analytics (listing views, applicant counts)
- [ ] Additional/direct career-page scraping fallback beyond the four current sources (e.g. Workable)
- [ ] Live-mode Paystack cutover (currently test mode)

---

## License

MIT, see [`LICENSE`](./LICENSE).