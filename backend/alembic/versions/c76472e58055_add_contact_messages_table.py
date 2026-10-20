"""add contact_messages table

Revision ID: c76472e58055
Revises: 9827aceef268
Create Date: 2026-09-22 04:09:31.301696

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c76472e58055'
down_revision: Union[str, Sequence[str], None] = '9827aceef268'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # The index only exists on the original dev DB (it was created outside Alembic).
    # IF EXISTS makes this a no-op on fresh databases instead of failing the whole chain.
    op.execute("DROP INDEX IF EXISTS ix_jobs_is_active_posted_at")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_index(
        op.f('ix_jobs_is_active_posted_at'),
        'jobs',
        ['is_active', sa.literal_column('posted_at DESC')],
        unique=False,
    )