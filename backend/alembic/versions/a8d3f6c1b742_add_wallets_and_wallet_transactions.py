# backend/alembic/versions/a8d3f6c1b742_add_wallets_and_wallet_transactions.py
"""add wallets and wallet_transactions

Revision ID: a8d3f6c1b742
Revises: b6c784624213
Create Date: 2026-10-02 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a8d3f6c1b742'
down_revision: Union[str, Sequence[str], None] = 'b6c784624213'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('wallets',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('balance', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('currency', sa.String(length=3), server_default='KES', nullable=False),
        sa.Column('phone', sa.String(length=15), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('balance >= 0', name='ck_wallets_balance_nonneg'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_table('wallet_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('wallet_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('amount', sa.BigInteger(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('phone', sa.String(length=15), nullable=True),
        sa.Column('checkout_request_id', sa.String(length=64), nullable=True),
        sa.Column('mpesa_receipt', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['wallet_id'], ['wallets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('checkout_request_id'),
    )
    op.create_index('ix_wallet_tx_wallet_created', 'wallet_transactions', ['wallet_id', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_wallet_tx_wallet_created', table_name='wallet_transactions')
    op.drop_table('wallet_transactions')
    op.drop_table('wallets')