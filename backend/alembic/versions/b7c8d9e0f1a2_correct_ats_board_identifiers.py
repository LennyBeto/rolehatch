"""correct ATS board identifiers for active companies

Revision ID: b7c8d9e0f1a2
Revises: a52c5ebc7244
Create Date: 2026-11-02 22:09:25.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a52c5ebc7244"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE jobs AS j
        SET is_active = FALSE
        FROM companies AS c
        WHERE j.company_id = c.id
          AND j.is_active IS TRUE
          AND j.source = 'greenhouse'
          AND (
            (lower(c.name) = 'replit' AND c.source_platform = 'greenhouse' AND c.board_token = 'replit')
            OR (lower(c.name) = 'render' AND c.source_platform = 'greenhouse' AND c.board_token = 'render')
            OR (lower(c.name) = 'pinecone' AND c.source_platform = 'greenhouse' AND c.board_token = 'pinecone')
          )
        """
    )
    op.execute(
        """
        UPDATE jobs AS j
        SET is_active = FALSE
        FROM companies AS c
        WHERE j.company_id = c.id
          AND j.is_active IS TRUE
          AND j.source = 'workable'
          AND lower(c.name) = 'workable'
          AND c.source_platform = 'workable'
          AND c.board_token = 'workable'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET source_platform = 'ashby', board_token = 'replit'
        WHERE lower(name) = 'replit'
          AND source_platform = 'greenhouse'
          AND board_token = 'replit'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET source_platform = 'ashby', board_token = 'render'
        WHERE lower(name) = 'render'
          AND source_platform = 'greenhouse'
          AND board_token = 'render'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET source_platform = 'ashby', board_token = 'pinecone'
        WHERE lower(name) = 'pinecone'
          AND source_platform = 'greenhouse'
          AND board_token = 'pinecone'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET board_token = 'careers'
        WHERE lower(name) = 'workable'
          AND source_platform = 'workable'
          AND board_token = 'workable'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE companies
        SET source_platform = 'greenhouse', board_token = 'replit'
        WHERE lower(name) = 'replit'
          AND source_platform = 'ashby'
          AND board_token = 'replit'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET source_platform = 'greenhouse', board_token = 'render'
        WHERE lower(name) = 'render'
          AND source_platform = 'ashby'
          AND board_token = 'render'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET source_platform = 'greenhouse', board_token = 'pinecone'
        WHERE lower(name) = 'pinecone'
          AND source_platform = 'ashby'
          AND board_token = 'pinecone'
        """
    )
    op.execute(
        """
        UPDATE companies
        SET board_token = 'workable'
        WHERE lower(name) = 'workable'
          AND source_platform = 'workable'
          AND board_token = 'careers'
        """
    )
