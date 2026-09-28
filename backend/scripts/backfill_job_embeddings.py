# backend/scripts/backfill_job_embeddings.py
import asyncio
from app.db.session import SessionLocal
from app.models.job import Job
from app.core.embeddings import embed_text


async def backfill():
    db = SessionLocal()
    try:
        jobs = db.query(Job).filter(Job.embedding.is_(None), Job.is_active.is_(True)).all()
        print(f"Backfilling embeddings for {len(jobs)} jobs")
        for job in jobs:
            job.embedding = await embed_text(job.description or job.title)
            db.add(job)
        db.commit()
        print("Done")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(backfill())