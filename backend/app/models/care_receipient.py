import os
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from app.models.base import Base
from sqlalchemy import (
    TIMESTAMP,
    ForeignKey,
    Integer,
    String,
    Boolean
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy_utils import EncryptedType
if TYPE_CHECKING:
    from app.models import User, Mood, MagicLinkToken

DB_ENCRYPTION_SECRET = os.getenv("DB_ENCRYPTION_SECRET")

class CareReceipient(Base):
    __tablename__ = "care_receipient"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    # USER SIGNUP FIELDS
    name: Mapped[str] = mapped_column(EncryptedType(String, DB_ENCRYPTION_SECRET), nullable=False)
    contact_number: Mapped[str] = mapped_column(
        EncryptedType(String, DB_ENCRYPTION_SECRET),
        nullable=False,
        comment="Assumes SG phone number",
    )
    app_language: Mapped[str] = mapped_column(String, nullable=False)
    age_range: Mapped[str] = mapped_column(String, nullable=False)
    race: Mapped[str] = mapped_column(String, nullable=False)
    gender: Mapped[str] = mapped_column(String, nullable=False)
    postal_code: Mapped[int] = mapped_column(Integer, nullable=False)
    floor: Mapped[int] = mapped_column(Integer, nullable=False)
    block: Mapped[str] = mapped_column(String, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    consecutive_checkins: Mapped[int] = mapped_column(Integer, nullable=False)
    consecutive_non_checkins: Mapped[int] = mapped_column(Integer, nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"))
    can_record_mood: Mapped[bool] = mapped_column(Boolean, nullable=False)

    user: Mapped[Optional["User"]] = relationship(back_populates="care_receipients")
    moods: Mapped[List["Mood"]] = relationship(back_populates="care_receipient")
    magic_link_tokens: Mapped[List["MagicLinkToken"]] = relationship(back_populates="care_receipient")
