<!-- EVIDENCE.md -->
# EVIDENCE.md — PerchRole

Chronological proof-of-build log: decisions, screenshots, and verification steps.

## 2026-09-14
- Project initialized. Stack decided: Next.js/Tailwind/Chakra (frontend),
  FastAPI/Postgres/Supabase (backend), Upstash Redis (cache).
- Naming: "PerchRole" — checked for collisions via web search, none found.

## 2026-09-15
- Deployed backend to Cloud Run (rolehatch-api), secrets via Secret Manager.
- Deployed frontend to Vercel with production env vars.
- Verified: magic-link sign-in, Save/Mark Applied/Hide round-trip against saved_jobs with RLS enforced.
- Verified: /internal/sync-jobs populates jobs table from Greenhouse/Lever, dedup confirmed on re-run.

## 2026-09-17 
- Verified: non-domain-matching user receives 403 on promote checkout.
- Verified: domain-matching employer sees only their own company's jobs in dashboard.
- Documented live-mode Stripe cutover steps; live cutover itself pending real purchase test.