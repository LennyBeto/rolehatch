# backend/alembic/versions/f2a3b4c5d6e7_add_is_public_to_applicant_profiles.py
"""add is_public to applicant_profiles

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-09-27 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: applicant_profiles.is_public already exists (added by
    # f3a91c7d2b44, the migration that created the table). This
    # revision is kept as a placeholder in the chain so alembic_version
    # advances past it, rather than because it does any schema work.
    pass


def downgrade() -> None:
    pass