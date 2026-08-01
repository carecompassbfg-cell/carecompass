"""add magic link tokens table

Revision ID: a1b2c3d4e5f6
Revises: ccccb0459f5b
Create Date: 2026-04-26 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "ccccb0459f5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "magic_link_token",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token", sa.String(), nullable=False, unique=True),
        sa.Column(
            "care_receipient_id",
            sa.Integer(),
            sa.ForeignKey("care_receipient.id"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_magic_link_token_token",
        "magic_link_token",
        ["token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_magic_link_token_token", table_name="magic_link_token")
    op.drop_table("magic_link_token")
