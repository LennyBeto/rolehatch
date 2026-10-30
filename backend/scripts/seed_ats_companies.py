# backend/scripts/seed_ats_companies.py
# Usage (from backend/):  python -m scripts.seed_ats_companies [--dry-run] [--path file.csv]
import argparse
import asyncio
import csv
import uuid
from pathlib import Path
from types import SimpleNamespace

from app.db.session import SessionLocal
from app.models.job import Company
from app.services.pipeline import SCRAPERS

DEFAULT_PATH = Path(__file__).resolve().parents[1] / "seed_data" / "ats_companies.csv"


def read_rows(path: Path) -> list[dict]:
    with path.open("r", newline="", encoding="utf-8") as f:
        lines = [ln for ln in f if ln.strip() and not ln.lstrip().startswith("#")]
    return list(csv.DictReader(lines))


async def probe(row: dict) -> int:
    """Return the number of live jobs the board exposes (0 = invalid/empty/unreachable)."""
    scrape_fn = SCRAPERS.get(row["source_platform"])
    if not scrape_fn:
        print(f"  ✗ unknown source_platform {row['source_platform']!r}")
        return 0
    try:
        # SCRAPERS lambdas take (company, skip_urls); an empty set means "fetch everything".
        jobs = await scrape_fn(SimpleNamespace(board_token=row["board_token"]), set())
        return len(jobs)
    except Exception as exc:  # 404, timeout, bad token, etc.
        print(f"  ✗ {type(exc).__name__}: {exc}")
        return 0


async def main(path: Path, dry_run: bool):
    rows = read_rows(path)
    db = SessionLocal()
    added = skipped = rejected = 0
    try:
        for row in rows:
            name = (row.get("name") or "").strip()
            domain = (row.get("domain") or "").strip().lower()
            token = (row.get("board_token") or "").strip()
            platform = (row.get("source_platform") or "").strip().lower()
            if not (name and domain and token and platform):
                print(f"✗ {name or '?'}: missing required field")
                rejected += 1
                continue

            if db.query(Company).filter_by(domain=domain).first():
                print(f"– {name}: domain already exists, skipping")
                skipped += 1
                continue

            print(f"? {name} ({platform}:{token})")
            count = await probe({**row, "board_token": token, "source_platform": platform})
            await asyncio.sleep(1)  # polite spacing between probes
            if count == 0:
                print(f"✗ {name}: no live jobs found — not added")
                rejected += 1
                continue

            print(f"✓ {name}: {count} live jobs" + (" (dry run)" if dry_run else ""))
            if not dry_run:
                db.add(Company(
                    id=uuid.uuid4(), name=name, domain=domain, board_token=token,
                    source_platform=platform, industry=(row.get("industry") or None),
                    is_active=True,
                ))
                db.commit()
            added += 1
        print(f"\nDone. added={added} skipped={skipped} rejected={rejected}")
    finally:
        db.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--path", type=Path, default=DEFAULT_PATH)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    asyncio.run(main(args.path, args.dry_run))