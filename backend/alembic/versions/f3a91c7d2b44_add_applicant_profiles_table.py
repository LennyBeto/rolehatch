# backend/alembic/versions/f3a91c7d2b44_add_applicant_profiles_table.py
"""add applicant_profiles table

Revision ID: f3a91c7d2b44
Revises: b6c784624213
Create Date: 2026-09-27 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f3a91c7d2b44'
down_revision: Union[str, Sequence[str], None] = 'b6c784624213'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('applicant_profiles',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('full_name', sa.String(length=255), nullable=True),
    sa.Column('expertise', sa.String(length=100), nullable=True),
    sa.Column('avatar_id', sa.String(length=50), nullable=True),
    sa.Column('cv_filename', sa.String(length=255), nullable=True),
    sa.Column('cv_content_type', sa.String(length=150), nullable=True),
    sa.Column('cv_base64', sa.Text(), nullable=True),
    sa.Column('last_ats_score', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('applicant_profiles')