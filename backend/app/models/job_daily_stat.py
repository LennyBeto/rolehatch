from datetime import date

from sqlalchemy import BigInteger, Date, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base  # adjust if your Base lives elsewhere
from app.models.job import Job


class JobDailyStat(Base):
    __tablename__ = "job_daily_stats"
    __table_args__ = (UniqueConstraint("job_id", "day", name="uq_job_daily_stats_job_day"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id = mapped_column(
        Job.__table__.c.id.type, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    day: Mapped[date] = mapped_column(Date, nullable=False)
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apply_clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)