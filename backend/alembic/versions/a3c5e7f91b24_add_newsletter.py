"""add newsletter tables

Revision ID: a3c5e7f91b24
Revises: f2b8d4a60c31
Create Date: 2026-11-10 18:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c5e7f91b24'
down_revision: Union[str, Sequence[str], None] = 'f2b8d4a60c31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('newsletter_subscribers',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_table('newsletter_slots',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email_domain', sa.String(length=255), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=False),
        sa.Column('headline', sa.String(length=80), nullable=False),
        sa.Column('blurb', sa.String(length=300), nullable=False),
        sa.Column('link_url', sa.String(length=500), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_newsletter_slots_email_domain'), 'newsletter_slots', ['email_domain'], unique=False)
    op.create_table('newsletter_issues',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('recipients', sa.Integer(), nullable=False),
        sa.Column('slot_count', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('newsletter_issues')
    op.drop_index(op.f('ix_newsletter_slots_email_domain'), table_name='newsletter_slots')
    op.drop_table('newsletter_slots')
    op.drop_table('newsletter_subscribers')