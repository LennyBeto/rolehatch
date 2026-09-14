<!-- EVIDENCE.md -->
# EVIDENCE.md — RoleHatch

Chronological proof-of-build log: decisions, screenshots, and verification steps.

## 2026-09-14
- Project initialized. Stack decided: Next.js/Tailwind/Chakra (frontend),
  FastAPI/Postgres/Supabase (backend), Upstash Redis (cache).
- Naming: "RoleHatch" — checked for collisions via web search, none found.

## 2026-09-15 (cont.)
- Deployed backend to Cloud Run (rolehatch-api), secrets via Secret Manager.
- Deployed frontend to Vercel with production env vars.
- Verified: magic-link sign-in, Save/Mark Applied/Hide round-trip against saved_jobs with RLS enforced.
- Verified: /internal/sync-jobs populates jobs table from Greenhouse/Lever, dedup confirmed on re-run.