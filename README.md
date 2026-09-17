# RoleHatch

A free-for-job-seekers job search platform — aggregating listings directly from company career pages (Greenhouse, Lever, Workday, BambooHR) with fast, filterable search, save/track tools, and a promoted-listings model for employers.

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
- [Monetization: Promoted Listings](#monetization-promoted-listings)
- [Deployment](#deployment)
- [Security](#security)
- [Project Workflow](#project-workflow)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

RoleHatch solves the two-sided problem every job board has: job seekers want fresh, real listings without noise, and employers want visibility without paying agency fees. RoleHatch pulls postings directly from the ATS platforms companies already use — no manual re-posting — and keeps the core search experience **100% free for job seekers**, monetizing instead through **promoted listings** paid for by employers.

**Core features:**
- Multi-source job aggregation (Greenhouse, Lever, Workday, BambooHR)
- Fast, cached, filterable search (location, salary, remote type, keyword)
- Magic-link authentication (no passwords to manage or leak)
- Save / Mark Applied / Hide tracking per job seeker
- Employer dashboard with domain-verified ownership
- Stripe-powered promoted listings (pay to feature a posting for 14 days)
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
| Payments | Stripe Checkout + Webhooks |
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
              ┌────────────┼────────────┐
              ▼            ▼             ▼
       ┌───────────┐ ┌──────────┐ ┌────────────┐
       │  Supabase │ │  Stripe  │ │  Cloud     │
       │ (Postgres │ │(Checkout │ │  Scheduler │
       │  + Auth)  │ │ +Webhook)│ │  (hourly)  │
       └───────────┘ └──────────┘ └─────┬──────┘
                                          │ triggers
                                          ▼
                              ┌────────────────────────┐
                              │ /internal/sync-jobs     │
                              │ → Greenhouse/Lever/     │
                              │   Workday/BambooHR APIs │
                              └────────────────────────┘
```

**Request flow (search):** Frontend → FastAPI `/api/jobs/search` → check Upstash Redis cache → on miss, query Postgres (with featured-listing sort) → cache result (10 min TTL) → return.

**Scraping flow:** Cloud Scheduler (hourly, secret-header authenticated) → `/internal/sync-jobs` → iterates active companies → per-source scraper adapter → idempotent upsert into `jobs` table (dedup via `(source, external_id)` unique index + Redis pre-check) → deactivates stale postings not seen in the current run.

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
│   ├── app/                 # Routes: /, /auth/callback, /dashboard, /promote/[jobId]
│   ├── components/          # SearchBar, FilterSidebar, JobList, SignInModal, etc.
│   ├── lib/                 # Supabase client, AuthContext, API helpers
│   ├── theme/                # Chakra theme (brand colors)
│   └── public/logo.svg
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── core/             # config, security (JWT), cache (Redis)
│   │   ├── db/                # SQLAlchemy session/base
│   │   ├── models/            # Company, Job, SavedJob
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── api/routes/        # jobs, auth, saved_jobs, promote, internal
│   │   └── services/
│   │       ├── pipeline.py    # Scraper → Postgres upsert pipeline
│   │       └── scrapers/      # greenhouse, lever, workday, bamboohr
│   ├── alembic/               # DB migrations
│   └── Dockerfile
└── infra/
    ├── cloudbuild.yaml         # CI/CD pipeline
    └── main.tf                 # Terraform: Artifact Registry, secrets, scheduler
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- A [Supabase](https://supabase.com) project
- An [Upstash](https://upstash.com) Redis database
- A [Stripe](https://stripe.com) account (test mode is fine to start)
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

# ── Stripe ────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3000
```

### `frontend/.env.local`

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Never** prefix `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` with `NEXT_PUBLIC_` — that inlines them into client-side JS. Only the anon/publishable Supabase key belongs in the frontend.

---

## Database & Migrations

Schema lives in `backend/app/models/job.py`: `Company`, `Job`, `SavedJob`.

```bash
cd backend
alembic upgrade head
```

Enable required Postgres extensions once (via Supabase SQL editor or a migration):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Row-Level Security policies (run in Supabase SQL editor) restrict `saved_jobs` to their owning user and lock `jobs` table writes to the service role — see `EVIDENCE.md` for the exact policy statements applied.

---

## Running Locally

```bash
# Terminal 1 — backend
cd backend
uvicorn app.main:app --reload --port 8080

# Terminal 2 — frontend
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
| Greenhouse | Public JSON API | `boards-api.greenhouse.io` — stable, documented |
| Lever | Public JSON API | `api.lever.co/v0/postings` — stable, documented |
| Workday | Internal CXS endpoint | Undocumented, self-throttled, per-tenant |
| BambooHR | Public careers feed | Undocumented, verify ToS per tenant |

`pipeline.py` orchestrates: fetch → Redis dedup pre-check → idempotent Postgres upsert (`ON CONFLICT (source, external_id) DO UPDATE`) → deactivate postings not seen in the current run. Triggered hourly via Cloud Scheduler → `POST /internal/sync-jobs` (protected by a shared-secret header, not a user JWT).

**Before adding a new source:** check its `robots.txt` and Terms of Service. Workday/BambooHR endpoints are undocumented and can change without notice — failures are isolated per-company so one broken tenant doesn't halt the whole sync run.

---

## Caching Strategy

Upstash Redis, applied in priority order for capacity savings:

1. **Search/filter results** — 10 min TTL (highest-traffic, most repetitive queries)
2. **Individual job listings** — 1 hr TTL (change infrequently)
3. **Facet/aggregation counts** — 15 min TTL (expensive to compute per-request)
4. **Scraper dedup** — 24 hr TTL per posting, avoids redundant DB writes on unchanged listings

---

## Authentication

Supabase magic-link (OTP) auth — no passwords stored or managed by RoleHatch. Flow:

1. User enters email → `supabase.auth.signInWithOtp()`
2. Clicks emailed link → redirected to `/auth/callback`
3. Session established client-side; subsequent API calls attach the Supabase JWT as a `Bearer` token
4. Backend verifies the JWT against `SUPABASE_JWT_SECRET` in `core/security.py`

Protected actions (Save / Mark Applied / Hide) are scoped server-side to `user["sub"]` **and** backed by Supabase Row-Level Security — two independent enforcement layers.

---

## Monetization: Promoted Listings

Employers pay to pin a listing to the top of search results for 14 days ($49 default, configurable).

- **Checkout**: `POST /api/promote/checkout/{job_id}` creates a Stripe Checkout Session
- **Activation**: only via the signature-verified Stripe webhook (`stripe.Webhook.construct_event`) — never trusted from a client redirect
- **Employer verification**: gated on the signed-in user's email domain matching the job's `Company.domain` — no manual claim process needed
- **Dashboard**: `/dashboard` shows an employer their own domain-matched listings and lets them promote directly

See `BUILDLOG.md` Phase 4 for the full implementation notes and the live-mode Stripe cutover checklist.

---

## Deployment

### Backend → Google Cloud Run

```bash
gcloud run deploy rolehatch-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=0 \
  --set-secrets="DATABASE_URL=database-url:latest,SUPABASE_JWT_SECRET=supabase-jwt-secret:latest,UPSTASH_REDIS_TOKEN=upstash-token:latest,SCHEDULER_SECRET=scheduler-secret:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest" \
  --set-env-vars="ALLOWED_ORIGINS=https://rolehatch.com,UPSTASH_REDIS_URL=https://your-instance.upstash.io,FRONTEND_URL=https://rolehatch.com,SUPABASE_URL=https://your-project-ref.supabase.co"
```

Secrets are pulled from Google Secret Manager at deploy time — never baked into the image or committed. Requires an active, open billing account linked to the GCP project (`gcloud billing projects link`), even though usage typically stays within Cloud Run's Always Free tier (2M requests/month).

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

- **No raw SQL** — all queries via SQLAlchemy ORM, preventing injection
- **Input validation** — every request/response shaped by Pydantic schemas
- **JWT verification** — Supabase tokens verified server-side on every protected route
- **Row-Level Security** — database-level enforcement independent of API logic
- **Secrets** — never committed; loaded via environment locally, Google Secret Manager in production
- **CORS** — explicit origin allowlist, no wildcards
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security` set on every response
- **Webhook signature verification** — Stripe events cryptographically verified before any state change; client redirects are never trusted as proof of payment
- **Employer verification** — promoted-listing access gated on verified email-domain ownership, not just possession of a job's URL
- **Scraping etiquette** — custom identifying User-Agent, self-throttled requests, per-tenant failure isolation, ToS/robots.txt review before adding a source

---

## Project Workflow

This repo follows a documented build process:
- **`BUILDLOG.md`** — phase-by-phase checklist of what's built, in progress, or planned
- **`EVIDENCE.md`** — chronological log of decisions, verification steps, and what was tested at each stage
- **`LICENSE`** — MIT

---

## Roadmap

- [ ] Talent Network — opt-in candidate pool with employer search access
- [ ] Employer analytics (listing views, applicant counts)
- [ ] Additional/direct career-page scraping fallback beyond the four current sources
- [ ] Live-mode Stripe cutover (currently test mode)

---

## License

MIT — see [`LICENSE`](./LICENSE).