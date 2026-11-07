# backend/tests/test_job_regions_sql.py
import os

import pytest
from sqlalchemy import create_engine, text

from app.models.job_region_sql import OPEN_TO_AFRICA_SQL, VISA_SPONSORSHIP_SQL

DB = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB, reason="set TEST_DATABASE_URL to a disposable Postgres")

# (label, location, remote_type, description, expect_open_to_africa, expect_visa)
CASES = [
    ("kenya onsite", "Nairobi, Kenya", "onsite", None, True, False),
    ("remote africa", "Remote - Africa", None, None, True, False),
    ("remote worldwide", "Remote (Worldwide)", None, None, True, False),
    ("remote global typed", "Global", "remote", None, True, False),
    ("remote anywhere desc", "Remote", "remote", "You can work from anywhere in a timezone overlap.", True, False),
    ("hiring across africa", "Remote", "remote", "We are hiring across Africa for this role.", True, False),
    ("remote US only", "Remote - United States", "remote", "Must reside in the US.", False, False),
    ("onsite london", "London, UK", "onsite", "Join our office.", False, False),
    ("onsite anywhere trap", "San Francisco, CA", "onsite", "Work from anywhere in the office.", False, False),
    ("client mention only", "Berlin", "hybrid", "Our clients in Africa love us.", False, False),
    ("remote US + africa client", "Remote - US", "remote", "Our clients in Africa love us.", False, False),
    ("visa yes", "Berlin", "onsite", "We offer visa sponsorship and relocation assistance.", False, True),
    ("visa no", "Berlin", "onsite", "We are unable to provide visa sponsorship.", False, False),
    ("visa no 2", "NYC", "onsite", "No visa sponsorship available.", False, False),
    ("visa cant", "NYC", "onsite", "We can't sponsor work visas at this time.", False, False),
    ("relocation only", "Dubai", "onsite", "Generous relocation package included.", False, True),
    ("work permit", "Amsterdam", "onsite", "We will sponsor your work permit.", False, True),
    ("nothing", "Austin", "onsite", "Great benefits. We do not discriminate.", False, False),
    ("all null", None, None, None, False, False),
]


def test_region_and_visa_detection():
    engine = create_engine(DB)
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TEMP TABLE jobs_t (id serial primary key, location text, "
            "remote_type text, description text, "
            f"open_to_africa boolean GENERATED ALWAYS AS ({OPEN_TO_AFRICA_SQL}) STORED, "
            f"visa_sponsorship boolean GENERATED ALWAYS AS ({VISA_SPONSORSHIP_SQL}) STORED"
            ") ON COMMIT DROP"
        ))
        conn.execute(
            text("INSERT INTO jobs_t (location, remote_type, description) VALUES (:l, :r, :d)"),
            [{"l": loc, "r": rt, "d": d} for _, loc, rt, d, *_ in CASES],
        )
        rows = conn.execute(
            text("SELECT open_to_africa, visa_sponsorship FROM jobs_t ORDER BY id")
        ).all()

    for (label, *_rest, want_africa, want_visa), (got_africa, got_visa) in zip(CASES, rows):
        assert (got_africa, got_visa) == (want_africa, want_visa), label