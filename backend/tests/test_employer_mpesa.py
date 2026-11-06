# backend/tests/test_employer_mpesa.py
import uuid
from datetime import datetime, timedelta, timezone

from app.models.mpesa_transaction import MpesaTransaction
from app.services import employer_mpesa as em


class FakeTxn:
    def __init__(self, amount=6500, status="pending", job_id=None):
        self.id = uuid.uuid4()
        self.checkout_request_id = "ws_CO_123"
        self.amount, self.status, self.job_id = amount, status, job_id
        self.result_desc = self.mpesa_receipt_number = None


class FakeJob:
    def __init__(self):
        self.id = uuid.uuid4()
        self.featured_until = None


class FakeQuery:
    def __init__(self, item):
        self.item = item
        self.hit = True

    def filter_by(self, **kw):
        key = kw.get("checkout_request_id")
        self.hit = self.item is not None and (key is None or key == self.item.checkout_request_id)
        return self

    def with_for_update(self):
        return self

    def first(self):
        return self.item if self.hit else None


class FakeDB:
    def __init__(self, txn, job):
        self.txn, self.job, self.commits, self.rollbacks = txn, job, 0, 0

    def query(self, model):
        return FakeQuery(self.txn if model is MpesaTransaction else self.job)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


def cb(code=0, amount=6500, receipt="RKT123"):
    return {
        "ResultCode": code,
        "ResultDesc": "ok",
        "CallbackMetadata": {"Item": [
            {"Name": "Amount", "Value": amount},
            {"Name": "MpesaReceiptNumber", "Value": receipt},
        ]},
    }


def setup():
    job = FakeJob()
    return FakeTxn(job_id=job.id), job


def test_success_features_listing():
    txn, job = setup()
    db = FakeDB(txn, job)
    assert em.apply_stk_result(db, "ws_CO_123", cb()) is True
    assert txn.status == "completed" and txn.mpesa_receipt_number == "RKT123"
    assert job.featured_until > datetime.now(timezone.utc) + timedelta(days=13)


def test_replay_does_not_extend():
    txn, job = setup()
    db = FakeDB(txn, job)
    em.apply_stk_result(db, "ws_CO_123", cb())
    first = job.featured_until
    assert em.apply_stk_result(db, "ws_CO_123", cb()) is True
    assert job.featured_until == first and db.commits == 1


def test_amount_mismatch_never_features():
    txn, job = setup()
    db = FakeDB(txn, job)
    assert em.apply_stk_result(db, "ws_CO_123", cb(amount=1)) is True
    assert txn.status == "pending" and job.featured_until is None


def test_failure_codes():
    for code, expected in ((1032, "cancelled"), (2001, "failed")):
        txn, job = setup()
        em.apply_stk_result(FakeDB(txn, job), "ws_CO_123", {"ResultCode": code, "ResultDesc": "x"})
        assert txn.status == expected and job.featured_until is None


def test_unknown_id_is_not_ours():
    txn, job = setup()
    assert em.apply_stk_result(FakeDB(txn, job), "ws_CO_other", cb()) is False
    assert txn.status == "pending"


def test_token_ok(monkeypatch):
    monkeypatch.setattr(em.settings, "mpesa_callback_secret", "s3cret")
    assert em.token_ok("s3cret") and not em.token_ok("nope") and not em.token_ok("")
    monkeypatch.setattr(em.settings, "mpesa_callback_secret", "")
    assert not em.token_ok("") and not em.token_ok("s3cret")