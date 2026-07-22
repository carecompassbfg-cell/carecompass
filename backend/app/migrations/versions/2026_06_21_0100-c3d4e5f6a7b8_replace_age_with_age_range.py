"""replace care receipient age with age_range

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-21 01:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "care_receipient", sa.Column("age_range", sa.String(), nullable=True)
    )
    op.execute(
        """
        UPDATE care_receipient SET age_range = CASE
            WHEN age < 45 THEN '<45'
            WHEN age <= 54 THEN '45-54'
            WHEN age <= 64 THEN '55-64'
            WHEN age <= 74 THEN '65-74'
            WHEN age <= 84 THEN '75-84'
            ELSE '85+'
        END
        """
    )
    op.alter_column(
        "care_receipient", "age_range", existing_type=sa.String(), nullable=False
    )
    op.drop_column("care_receipient", "age")


def downgrade() -> None:
    op.add_column(
        "care_receipient", sa.Column("age", sa.Integer(), nullable=True)
    )
    op.execute(
        """
        UPDATE care_receipient SET age = CASE age_range
            WHEN '<45' THEN 44
            WHEN '45-54' THEN 45
            WHEN '55-64' THEN 55
            WHEN '65-74' THEN 65
            WHEN '75-84' THEN 75
            ELSE 85
        END
        """
    )
    op.alter_column(
        "care_receipient", "age", existing_type=sa.Integer(), nullable=False
    )
    op.drop_column("care_receipient", "age_range")
