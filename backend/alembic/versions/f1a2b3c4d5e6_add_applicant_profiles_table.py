"""add applicant_profiles table

Revision ID: f1a2b3c4d5e6
Revises: b6c784624213
Create Date: 2026-09-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'b6c784624213'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'applicant_profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('job_title', sa.String(length=200), nullable=False),
        sa.Column('cv_url', sa.String(length=1000), nullable=True),
        sa.Column('cv_filename', sa.String(length=255), nullable=True),
        sa.Column('is_public', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index('ix_applicant_profiles_job_title', 'applicant_profiles', ['job_title'], unique=False)
    op.create_index('ix_applicant_profiles_is_public', 'applicant_profiles', ['is_public'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_applicant_profiles_is_public', table_name='applicant_profiles')
    op.drop_index('ix_applicant_profiles_job_title', table_name='applicant_profiles')
    op.drop_table('applicant_profiles')