# backend/tests/test_job_regions_sql.py
import pytest
from sqlalchemy import text

from app.models.job_region_sql import OPEN_TO_AFRICA_SQL, VISA_SPONSORSHIP_SQL

@pytest.fixture(scope="module")
def db():
    session = None
    try:
        from app.db.session import SessionLocal

        session = SessionLocal()
        session.execute(text("SELECT 1"))
    except Exception as exc:  # no env / database in this environment
        if session is not None:
            session.close()
        pytest.skip(f"database not available: {exc}")
    yield session
    session.close()


def _eval(db, expr, location=None, remote_type=None, description=None) -> bool:
    sql = text(
        f"SELECT ({expr}) FROM (SELECT CAST(:loc AS text) AS location, "
        f"CAST(:rt AS text) AS remote_type, CAST(:desc AS text) AS description) jobs"
    )
    return bool(db.execute(sql, {"loc": location, "rt": remote_type, "desc": description}).scalar())


@pytest.mark.parametrize("location,remote,description,expected", [
    ("Nairobi, Kenya", None, None, True),
    ("Lagos, Nigeria", None, None, True),
    ("Remote - Africa", "remote", None, True),
    ("Remote - Worldwide", "remote", None, True),
    ("Remote - Global", "remote", None, True),
    ("Remote", "remote", "Open to candidates in Ghana.", True),
    ("Remote", "remote", "Candidates based in Africa preferred.", True),
    ("Remote", "remote", "Work from anywhere in the world.", True),
    ("Remote - US", "remote", None, False),
    ("Remote - Europe", "remote", "We hire globally.", False),
    ("Remote - Anywhere in the US", "remote", None, False),
    ("Remote", "remote", "We hire globally. Must be located in the US.", False),
    ("Remote", "remote", "Work from anywhere in the country.", False),
    ("Remote", "remote", "Customers in Africa rely on us.", False),
    ("San Francisco, CA", None, "Our customers across Africa", False),
    ("London, UK", None, None, False),
])
def test_open_to_africa(db, location, remote, description, expected):
    assert _eval(db, OPEN_TO_AFRICA_SQL, location, remote, description) is expected


@pytest.mark.parametrize("description,expected", [
    ("We offer visa sponsorship and relocation assistance.", True),
    ("Visa sponsorship is available for this role.", True),
    ("Visa sponsorship available for the right candidate.", True),
    ("We will sponsor visas for strong candidates.", True),
    ("We sponsor H1B visas.", True),
    ("We provide H-1B sponsorship.", True),
    ("Relocation package included.", True),
    ("We offer relocation assistance. We are unable to sponsor visas.", True),
    ("We are unable to sponsor visas for this role.", False),
    ("We do not offer visa sponsorship.", False),
    ("Visa sponsorship is not available for this role.", False),
    ("Must be authorized to work in the US without sponsorship.", False),
    ("No relocation assistance is offered.", False),
    ("Relocation assistance is not available.", False),
    ("Visa Inc. is a global payments company.", False),
    ("", False),
    (None, False),
])
def test_visa_sponsorship(db, description, expected):
    assert _eval(db, VISA_SPONSORSHIP_SQL, description=description) is expected