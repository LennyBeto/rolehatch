"""add summary to applicant_profiles

Revision ID: e4a1c9d27b53
Revises: REPLACE_WITH_REAL_HEAD
Create Date: 2026-09-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e4a1c9d27b53'
down_revision: Union[str, Sequence[str], None] = 'b5a14bd8bf63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # IF NOT EXISTS keeps this safe if the column was already added manually or by autogenerate.
    op.execute("ALTER TABLE applicant_profiles ADD COLUMN IF NOT EXISTS summary TEXT")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE applicant_profiles DROP COLUMN IF EXISTS summary")