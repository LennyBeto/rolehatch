"""add doc builder tables

Revision ID: a52c5ebc7244
Revises: f03f41d92aa8
Create Date: 2026-10-12 12:22:39.737998

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a52c5ebc7244'
down_revision: Union[str, Sequence[str], None] = 'f03f41d92aa8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "doc_builder_quota",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("cv_free_used", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("cl_free_used", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("cv_paid_credits", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("cl_paid_credits", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("cv_paid_credits >= 0", name="ck_doc_cv_paid_nonneg"),
        sa.CheckConstraint("cl_paid_credits >= 0", name="ck_doc_cl_paid_nonneg"),
        sa.PrimaryKeyConstraint("user_id"),
    )

    op.create_table(
        "doc_builder_consumptions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("credit", sa.String(length=10), nullable=False),
        sa.Column("refunded", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_doc_builder_consumptions_user_id"), "doc_builder_consumptions", ["user_id"], unique=False
    )

    op.create_table(
        "doc_builder_payments",
        sa.Column("reference", sa.String(length=100), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("credits_each", sa.Integer(), nullable=False),
        sa.Column("amount_kes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("reference"),
    )
    op.create_index(
        op.f("ix_doc_builder_payments_user_id"), "doc_builder_payments", ["user_id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_doc_builder_payments_user_id"), table_name="doc_builder_payments")
    op.drop_table("doc_builder_payments")
    op.drop_index(op.f("ix_doc_builder_consumptions_user_id"), table_name="doc_builder_consumptions")
    op.drop_table("doc_builder_consumptions")
    op.drop_table("doc_builder_quota")
