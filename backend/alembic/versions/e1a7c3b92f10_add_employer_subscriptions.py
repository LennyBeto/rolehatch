"""add employer subscriptions and processed payments

Revision ID: e1a7c3b92f10
Revises: b6c784624213, 20261106_job_regions
Create Date: 2026-11-10 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a7c3b92f10'
down_revision: Union[str, Sequence[str], None] = ('b6c784624213', '20261106_job_regions')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('employer_subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email_domain', sa.String(length=255), nullable=False),
        sa.Column('plan_id', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('paystack_subscription_code', sa.String(length=100), nullable=True),
        sa.Column('paystack_email_token', sa.String(length=100), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('featured_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('bumps_used', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email_domain'),
        sa.UniqueConstraint('paystack_subscription_code'),
    )
    op.create_table('processed_payments',
        sa.Column('reference', sa.String(length=120), nullable=False),
        sa.Column('kind', sa.String(length=30), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('reference'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('processed_payments')
    op.drop_table('employer_subscriptions')