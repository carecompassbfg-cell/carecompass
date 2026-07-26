from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from app.models.base import Base
from sqlalchemy import (
    TIMESTAMP,
    ForeignKey,
    Integer,
    Enum as SQLAlchemyEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
if TYPE_CHECKING:
    from app.models import CareReceipient

class SelectedMood(str, Enum):
    HAPPY = "happy"
    OK = "ok"
    SAD = "sad"

class Mood(Base):
    __tablename__ = "mood"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    care_receipient_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("care_receipient.id"))
    mood: Mapped[Optional[SelectedMood]] = mapped_column(SQLAlchemyEnum(SelectedMood))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)

    care_receipient: Mapped[Optional["CareReceipient"]] = relationship(back_populates="moods")
