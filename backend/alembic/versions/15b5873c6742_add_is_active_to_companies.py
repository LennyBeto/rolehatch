"""add is_active to companies

Revision ID: 15b5873c6742
Revises: da1f34b2670b
Create Date: 2026-09-18 03:13:33.065954

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '15b5873c6742'
down_revision: Union[str, Sequence[str], None] = 'da1f34b2670b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default lets this run on a populated table (existing rows become active).
    # On a fresh DB the table is empty, so it's a no-op either way.
    op.add_column(
        'companies',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('companies', 'is_active')