# backend/tests/test_paystack_references.py
from app.services import ats_quota, doc_quota, feature_listing


def test_paystack_reference_prefixes_do_not_overlap():
    prefixes = {
        "wallet": "PSK",  # hardcoded in wallet.py
        "ats": ats_quota.REFERENCE_PREFIX,
        "docs": doc_quota.REFERENCE_PREFIX,
        "featured_listing": feature_listing.REFERENCE_PREFIX,
    }
    items = list(prefixes.items())
    for i, (a_name, a) in enumerate(items):
        for b_name, b in items[i + 1:]:
            assert not a.startswith(b) and not b.startswith(a), (
                f"Paystack reference prefix clash: {a_name}={a!r} vs {b_name}={b!r}"
            )