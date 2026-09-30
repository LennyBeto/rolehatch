"""add hidden_at to saved_jobs

Revision ID: f7b2d84a19c6
Revises: e4a1c9d27b53
Create Date: 2026-09-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f7b2d84a19c6'
down_revision: Union[str, Sequence[str], None] = 'e4a1c9d27b53'  # verify with `python -m alembic heads`
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE")
    # Jobs already hidden get a fresh 5-day clock from deploy time, so nothing is deleted instantly.
    op.execute("UPDATE saved_jobs SET hidden_at = now() WHERE status = 'hidden' AND hidden_at IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE saved_jobs DROP COLUMN IF EXISTS hidden_at")