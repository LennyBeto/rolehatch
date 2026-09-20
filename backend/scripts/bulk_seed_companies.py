# backend/scripts/bulk_seed_companies.py
import csv
import uuid
from pathlib import Path

from app.db.session import SessionLocal
from app.models.job import Company

def seed_from_csv(path: str | None = None):
    if path is None:
        path = Path(__file__).resolve().parents[1] / "seed_data" / "companies.csv"
    else:
        path = Path(path)

    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")

    db = SessionLocal()
    added = 0
    try:
        with path.open("r", newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                domain = (row.get("domain") or "").strip()
                if not domain:
                    continue

                exists = db.query(Company).filter_by(domain=domain).first()
                if exists:
                    continue

                db.add(
                    Company(
                        id=uuid.uuid4(),
                        name=row["name"],
                        domain=domain,
                        board_token=row.get("board_token"),
                        source_platform=row.get("source_platform"),
                        industry=row.get("industry"),
                        is_active=True,
                    )
                )
                added += 1
        db.commit()
        print(f"Added {added} companies")
    finally:
        db.close()


if __name__ == "__main__":
    seed_from_csv()