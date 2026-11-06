# backend/tests/test_feature_listing.py
import uuid
from datetime import datetime, timedelta, timezone

from app.services import feature_listing as fl


class FakeJob:
    def __init__(self, featured_until=None):
        self.id = uuid.uuid4()
        self.featured_until = featured_until


class FakeQuery:
    def __init__(self, job):
        self.job = job

    def filter_by(self, **_):
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.job


class FakeDB:
    def __init__(self, job):
        self.job, self.commits, self.rollbacks = job, 0, 0

    def query(self, *_):
        return FakeQuery(self.job)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def payload(job, reference="FTR-test", paid_at=None, **over):
    data = {
        "reference": reference,
        "status": "success",
        "amount": fl.FEATURE_PRICE_KES * 100,
        "currency": "KES",
        "paid_at": iso(paid_at or datetime.now(timezone.utc)),
        "metadata": {"purpose": fl.PURPOSE, "job_id": str(job.id)},
    }
    data.update(over)
    return data


def test_first_settle_features_for_14_days_from_paid_at():
    job, paid = FakeJob(), datetime.now(timezone.utc) - timedelta(minutes=2)
    db = FakeDB(job)
    assert fl.settle(db, "FTR-test", payload(job, paid_at=paid)) == "completed"
    assert abs(job.featured_until - (paid + timedelta(days=14))) < timedelta(seconds=1)
    assert db.commits == 1


def test_replay_does_not_extend():
    job, paid = FakeJob(), datetime.now(timezone.utc) - timedelta(minutes=2)
    db = FakeDB(job)
    data = payload(job, paid_at=paid)
    fl.settle(db, "FTR-test", data)
    first = job.featured_until
    for _ in range(3):  # verify + webhook + webhook retry
        assert fl.settle(db, "FTR-test", data) == "completed"
    assert job.featured_until == first
    assert db.commits == 1


def test_wrong_amount_or_currency_never_features():
    for over in ({"amount": 100}, {"currency": "USD"}):
        job = FakeJob()
        assert fl.settle(FakeDB(job), "FTR-test", payload(job, **over)) == "pending"
        assert job.featured_until is None


def test_failed_pending_unknown_paths():
    job = FakeJob()
    assert fl.settle(FakeDB(job), "FTR-test", payload(job, status="failed")) == "failed"
    assert fl.settle(FakeDB(job), "FTR-test", payload(job, status="abandoned")) == "pending"
    assert fl.settle(FakeDB(job), "FTR-test", payload(job, metadata={})) == "unknown"
    assert fl.settle(FakeDB(job), "FTR-other", payload(job)) == "unknown"
    assert fl.settle(FakeDB(None), "FTR-test", payload(job)) == "unknown"
    assert job.featured_until is None


def test_old_replayed_payment_does_not_feature():
    job = FakeJob()
    old = datetime.now(timezone.utc) - timedelta(days=20)
    assert fl.settle(FakeDB(job), "FTR-test", payload(job, paid_at=old)) == "completed"
    assert job.featured_until is None


def test_new_payment_after_expiry_features_again():
    job = FakeJob(featured_until=datetime.now(timezone.utc) - timedelta(days=1))
    paid = datetime.now(timezone.utc) - timedelta(minutes=1)
    assert fl.settle(FakeDB(job), "FTR-new", payload(job, reference="FTR-new", paid_at=paid)) == "completed"
    assert job.featured_until > datetime.now(timezone.utc) + timedelta(days=13)