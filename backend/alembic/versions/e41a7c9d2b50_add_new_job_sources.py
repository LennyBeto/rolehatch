"""add ashby, smartrecruiters, workable, recruitee to job_source enum

Revision ID: e41a7c9d2b50
Revises: a91c3d5e7f20
Create Date: 2026-10-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e41a7c9d2b50'
down_revision: Union[str, Sequence[str], None] = 'a91c3d5e7f20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_SOURCES = ("ashby", "smartrecruiters", "workable", "recruitee")


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE must be committed before the value is used,
    # so run it outside the migration's transaction.
    with op.get_context().autocommit_block():
        for value in NEW_SOURCES:
            op.execute(f"ALTER TYPE job_source ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # Postgres cannot drop enum values; intentionally a no-op.
    pass