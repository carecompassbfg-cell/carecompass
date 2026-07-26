"""make care receipient unit nullable

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-21 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "care_receipient",
        "unit",
        existing_type=sa.String(),
        nullable=True,
    )


def downgrade() -> None:
    op.execute("UPDATE care_receipient SET unit = '' WHERE unit IS NULL")
    op.alter_column(
        "care_receipient",
        "unit",
        existing_type=sa.String(),
        nullable=False,
    )
