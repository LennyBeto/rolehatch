# backend/tests/test_job_region_migration_sync.py
import importlib.util
from pathlib import Path

from app.models import job_region_sql


def _latest_regions_migration():
    versions = Path(__file__).resolve().parents[1] / "alembic" / "versions"
    path = max(versions.glob("*job_regions*.py"), key=lambda p: p.name)
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_latest_migration_matches_model_rules():
    migration = _latest_regions_migration()
    assert migration.OPEN_TO_AFRICA_SQL == job_region_sql.OPEN_TO_AFRICA_SQL
    assert migration.VISA_SPONSORSHIP_SQL == job_region_sql.VISA_SPONSORSHIP_SQL