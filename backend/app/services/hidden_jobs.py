# backend/app/services/hidden_jobs.py — removes hidden jobs that have stayed hidden for over 5 days
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.job import SavedJob

HIDDEN_RETENTION_DAYS = 5


def purge_stale_hidden_jobs(db: Session, user_id: str | uuid.UUID | None = None) -> int:
    """Delete hidden saved-job rows older than the retention window.
    Pass user_id to scope to one user, or omit to purge everyone. Returns the number deleted."""
    now = datetime.now(timezone.utc)
    scope = [SavedJob.status == "hidden"]
    if user_id is not None:
        scope.append(SavedJob.user_id == uuid.UUID(str(user_id)))

    # Safety net: hidden rows with no timestamp (e.g. written by an old instance mid-deploy) start their clock now.
    db.query(SavedJob).filter(*scope, SavedJob.hidden_at.is_(None)).update(
        {"hidden_at": now}, synchronize_session=False
    )

    cutoff = now - timedelta(days=HIDDEN_RETENTION_DAYS)
    deleted = (
        db.query(SavedJob)
        .filter(*scope, SavedJob.hidden_at < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return deleted