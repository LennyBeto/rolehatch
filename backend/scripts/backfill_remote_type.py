# backend/scripts/backfill_remote_type.py
from app.db.session import SessionLocal
from app.models.job import Job
from app.services.pipeline import infer_remote_type


def backfill():
    db = SessionLocal()
    updated = 0
    try:
        jobs = db.query(Job).filter(
            Job.remote_type.is_(None),
            Job.is_active.is_(True),
            Job.source != "direct",
        ).all()
        for job in jobs:
            inferred = infer_remote_type(job.location, job.title)
            if inferred:
                job.remote_type = inferred
                updated += 1
        db.commit()
    finally:
        db.close()
    print(f"Backfilled remote_type on {updated} jobs.")


if __name__ == "__main__":
    backfill()