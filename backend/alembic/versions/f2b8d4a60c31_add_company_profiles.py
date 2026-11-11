"""add company_profiles

Revision ID: f2b8d4a60c31
Revises: e1a7c3b92f10
Create Date: 2026-11-10 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b8d4a60c31'
down_revision: Union[str, Sequence[str], None] = 'e1a7c3b92f10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('company_profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('tagline', sa.String(length=160), nullable=True),
        sa.Column('about', sa.Text(), nullable=True),
        sa.Column('website_url', sa.String(length=500), nullable=True),
        sa.Column('careers_url', sa.String(length=500), nullable=True),
        sa.Column('headquarters', sa.String(length=120), nullable=True),
        sa.Column('company_size', sa.String(length=20), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('company_profiles')