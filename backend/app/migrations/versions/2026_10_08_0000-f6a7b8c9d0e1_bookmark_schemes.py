"""let schemes be bookmarked

Additive: adds the SCHEME value to the reviewabletype enum, a nullable
target_key column on bookmarks (schemes have string ids), and makes
bookmarks.target_id nullable. Existing rows and the running app are unaffected.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-10-08 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE can't run inside a transaction block
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE reviewabletype ADD VALUE IF NOT EXISTS 'SCHEME'")

    op.add_column("bookmarks", sa.Column("target_key", sa.String(), nullable=True))
    op.alter_column("bookmarks", "target_id", existing_type=sa.Integer(), nullable=True)
    op.create_index(
        "ix_bookmarks_user_target_key",
        "bookmarks",
        ["user_id", "target_key"],
    )


def downgrade() -> None:
    # Scheme bookmarks have no target_id, so they go before restoring NOT NULL.
    # Postgres can't drop an enum value; 'SCHEME' stays in the type, unused.
    op.execute("DELETE FROM bookmarks WHERE target_id IS NULL")
    op.drop_index("ix_bookmarks_user_target_key", table_name="bookmarks")
    op.alter_column("bookmarks", "target_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("bookmarks", "target_key")
