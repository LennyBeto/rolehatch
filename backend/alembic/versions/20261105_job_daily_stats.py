"""job daily stats for employer analytics"""
import sqlalchemy as sa
from alembic import op

revision = "20261105_job_daily_stats"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    jobs = sa.Table("jobs", sa.MetaData(), autoload_with=bind)
    job_id_type = jobs.c.id.type  # matches your existing jobs.id type

    op.create_table(
        "job_daily_stats",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("job_id", job_id_type, sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("apply_clicks", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("job_id", "day", name="uq_job_daily_stats_job_day"),
    )
    op.create_index("ix_job_daily_stats_day", "job_daily_stats", ["day"])
    # Backend connects with a privileged role; block direct client access.
    op.execute("ALTER TABLE job_daily_stats ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_job_daily_stats_day", table_name="job_daily_stats")
    op.drop_table("job_daily_stats")