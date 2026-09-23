<!-- BUILDLOG.md -->
# BUILDLOG.md — PerchRole

## Phase 0 — Foundation (2026-09-14)
- [x] Repo structure, LICENSE, Docker skeleton
- [x] Frontend theme (Tailwind + Chakra colors)
- [ ] Backend security scaffold (CORS, rate limiting, Supabase JWT auth)
- [x] Upstash Redis caching layer
- [x] Greenhouse/Lever scraper adapters
- [ ] Cloud Run + Vercel deployment

## Phase 1 — Data layer (2026-09-14)
- [x] SQLAlchemy models: Company, Job, SavedJob
- [x] Unique (source, external_id) index for scraper dedup
- [x] pg_trgm index for fuzzy title search
- [x] Alembic migrations wired up
- [x] Supabase RLS policies for saved_jobs (own-row access), jobs (public read, service-role write)
- [ ] Wire scraper output → upsert into Job model
- [ ] Frontend search/filter UI

## Phase 2 — Pipeline + Frontend UI (2026-09-14)
- [x] Idempotent upsert pipeline (Greenhouse/Lever → Postgres), Redis dedup, stale deactivation
- [x] Hourly Cloud Scheduler → /internal/sync-jobs, secret-header protected
- [x] Frontend: search bar, filter sidebar (environment + salary), job list wired to API
- [ ] Auth UI (Supabase sign-in), Save/Mark Applied buttons
- [ ] Live deployment walkthrough end-to-end

## Phase 3 — Auth + Live Deployment (2026-09-15)
- [x] Supabase magic-link auth, AuthContext, Save/Mark Applied/Hide wired end-to-end
- [x] Backend saved_jobs endpoints, JWT-scoped + RLS-backed
- [x] Live deployment: Supabase, GCP secrets, Cloud Run, Vercel, custom domains, scheduler
- [ ] Onboard first real company boards (Workday/BambooHR adapters)
- [ ] Promoted-listings billing flow

## Phase 4 — Workday/BambooHR + Monetization ✅ (2026-09-17)
- [x] Workday adapter (CXS API pattern, self-throttled, per-tenant isolated failures)
- [x] BambooHR adapter (public careers JSON feed)
- [x] featured_until column + featured-first sort in search
- [x] Stripe Checkout for promoted listings, webhook-verified activation
- [x] Employer verification: promote endpoint gated on email-domain match to company.domain
- [x] Employer dashboard: view own listings, promote directly from dashboard
- [x] Live-mode Stripe cutover checklist documented

## Phase 5 — Not started
- [ ] Talent Network (opt-in candidate pool, employer search access)
- [ ] Analytics for employers (views, applicant counts)
- [ ] Additional scraper sources / direct career-page fallback