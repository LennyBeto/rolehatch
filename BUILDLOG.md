<!-- BUILDLOG.md -->
# BUILDLOG.md — RoleHatch

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