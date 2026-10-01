"""add care recipient name and scheme answers

Additive only: two new nullable, encrypted columns on users. No defaults,
no data changes, no other tables touched, so the running app keeps working
before and after it is applied.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-10-01 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy_utils import EncryptedType

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "care_recipient_name",
            EncryptedType(),
            nullable=True,
            comment="Name or nickname the caregiver uses for the care recipient",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "scheme_answers",
            EncryptedType(),
            nullable=True,
            comment="JSON: answers from the schemes question sheet",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "scheme_answers")
    op.drop_column("users", "care_recipient_name")
