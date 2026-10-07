# backend/scripts/bulk_seed_companies.py
import csv
import uuid
from pathlib import Path

from app.db.session import SessionLocal
from app.models.job import Company

# Keep in sync with SCRAPERS in app/services/pipeline.py
VALID_PLATFORMS = {
    "greenhouse", "lever", "workday", "bamboohr",
    "ashby", "smartrecruiters", "workable", "recruitee",
}


def seed_from_csv(path: str | None = None):
    if path is None:
        path = Path(__file__).resolve().parents[1] / "seed_data" / "companies.csv"
    else:
        path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")

    db = SessionLocal()
    added = 0
    skipped = 0
    seen_domains: set[str] = set()
    try:
        with path.open("r", newline="", encoding="utf-8") as f:
            # Ignore blank lines and '#' comment lines (e.g. the file-path header comment)
            lines = (line for line in f if line.strip() and not line.lstrip().startswith("#"))
            for row in csv.DictReader(lines):
                row = {(k or "").strip(): (v or "").strip() for k, v in row.items()}
                name = row.get("name", "")
                domain = row.get("domain", "").lower()
                platform = row.get("source_platform", "").lower()
                board_token = row.get("board_token", "")

                if not name or not domain:
                    continue
                if platform not in VALID_PLATFORMS:
                    print(f"Skipping {name}: unsupported source_platform {platform!r}")
                    skipped += 1
                    continue
                if not board_token:
                    print(f"Skipping {name}: missing board_token")
                    skipped += 1
                    continue
                if domain in seen_domains:
                    continue
                seen_domains.add(domain)

                if db.query(Company).filter_by(domain=domain).first():
                    continue

                db.add(
                    Company(
                        id=uuid.uuid4(),
                        name=name,
                        domain=domain,
                        board_token=board_token,
                        source_platform=platform,
                        industry=row.get("industry") or None,
                        is_active=True,
                    )
                )
                added += 1
        db.commit()
        print(f"Added {added} companies ({skipped} skipped)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_from_csv()