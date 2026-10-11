"""merge credits, tech_stack index and job sources branches

Revision ID: 98f8ac6221c9
Revises: a1f3c9d27e54, a41c9d7e5b20, e41a7c9d2b50
Create Date: 2026-10-11 13:16:52.073255

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98f8ac6221c9'
down_revision: Union[str, Sequence[str], None] = ('a1f3c9d27e54', 'a41c9d7e5b20', 'e41a7c9d2b50')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Leave exactly one GIN index on jobs.tech_stack, named as the model expects.
    op.execute("""
        DO $$
        BEGIN
            IF to_regclass('ix_jobs_tech_stack') IS NOT NULL THEN
                -- model-named index already exists: drop my duplicate if present
                DROP INDEX IF EXISTS ix_jobs_tech_stack_gin;
            ELSIF to_regclass('ix_jobs_tech_stack_gin') IS NOT NULL THEN
                ALTER INDEX ix_jobs_tech_stack_gin RENAME TO ix_jobs_tech_stack;
            ELSE
                CREATE INDEX ix_jobs_tech_stack ON jobs USING gin (tech_stack);
            END IF;
        END $$;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Intentionally a no-op: the index is kept under the model's name.
    pass