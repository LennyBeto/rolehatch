# backend/alembic/versions/e1f2a3b4c5d6_add_resume_matching.py
"""add pgvector extension, job embedding, and applicant_profiles embedding

Revision ID: e1f2a3b4c5d6
Revises: f3a91c7d2b44
Create Date: 2026-09-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'f3a91c7d2b44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 768  # Gemini text-embedding-004 output size


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.add_column("jobs", sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True))
    op.execute(
        "CREATE INDEX ix_jobs_embedding_hnsw ON jobs "
        "USING hnsw (embedding vector_cosine_ops)"
    )

    op.add_column("applicant_profiles", sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True))


def downgrade() -> None:
    op.drop_column("applicant_profiles", "embedding")
    op.execute("DROP INDEX IF EXISTS ix_jobs_embedding_hnsw")
    op.drop_column("jobs", "embedding")
    op.execute("DROP EXTENSION IF EXISTS vector")