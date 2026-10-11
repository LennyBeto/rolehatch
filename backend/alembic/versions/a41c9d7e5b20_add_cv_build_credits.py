"""add cv build credits, builds ledger, and credit purchases

Revision ID: a41c9d7e5b20
Revises: b6c784624213
Create Date: 2026-10-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a41c9d7e5b20'
down_revision: Union[str, Sequence[str], None] = 'b6c784624213'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cv_build_credits',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('free_used', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('paid_credits', sa.Integer(), server_default='0', nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('paid_credits >= 0', name='ck_cv_paid_credits_nonneg'),
        sa.PrimaryKeyConstraint('user_id'),
    )
    op.create_table(
        'cv_builds',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('source', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_cv_builds_user', 'cv_builds', ['user_id'], unique=False)
    op.create_table(
        'cv_credit_purchases',
        sa.Column('reference', sa.String(length=255), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('credits', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('reference'),
    )


def downgrade() -> None:
    op.drop_table('cv_credit_purchases')
    op.drop_index('ix_cv_builds_user', table_name='cv_builds')
    op.drop_table('cv_builds')
    op.drop_table('cv_build_credits')