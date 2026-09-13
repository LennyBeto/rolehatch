-- backend/alembic/versions/0001_enable_extensions.sql (run once, or as first migration)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";