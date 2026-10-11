"""add GIN index on jobs.tech_stack

Revision ID: a1f3c9d27e54
Revises: b6c784624213
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'a1f3c9d27e54'
down_revision: Union[str, Sequence[str], None] = 'b6c784624213'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_jobs_tech_stack_gin', 'jobs', ['tech_stack'],
                    postgresql_using='gin')


def downgrade() -> None:
    op.drop_index('ix_jobs_tech_stack_gin', table_name='jobs')