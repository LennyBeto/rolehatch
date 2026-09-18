# backend/scripts/bulk_seed_companies.py
import csv, uuid
from app.db.session import SessionLocal
from app.models.job import Company

def seed_from_csv(path: str):
    db = SessionLocal()
    added = 0
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            exists = db.query(Company).filter_by(domain=row["domain"]).first()
            if exists:
                continue
            db.add(Company(
                id=uuid.uuid4(),
                name=row["name"],
                domain=row["domain"],
                board_token=row["board_token"],
                source_platform=row["source_platform"],
                industry=row["industry"],
                is_active=True,
            ))
            added += 1
    db.commit()
    print(f"Added {added} companies")

if __name__ == "__main__":
    seed_from_csv("backend/seed_data/companies.csv")