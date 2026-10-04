"""add gin index on jobs.tech_stack

Revision ID: a91c3d5e7f20
Revises: 0a4ade96260d, a8d3f6c1b742
Create Date: 2026-09-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

revision: str = 'a91c3d5e7f20'
down_revision: Union[str, Sequence[str], None] = ('0a4ade96260d', 'a8d3f6c1b742')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_jobs_tech_stack', 'jobs', ['tech_stack'], unique=False, postgresql_using='gin')


def downgrade() -> None:
    op.drop_index('ix_jobs_tech_stack', table_name='jobs', postgresql_using='gin')