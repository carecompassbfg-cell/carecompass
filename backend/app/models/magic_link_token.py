from app.models.base import Base
from sqlalchemy import (
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models import CareReceipient

class MagicLinkToken(Base):
    __tablename__ = "magic_link_token"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    care_receipient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("care_receipient.id"), nullable=False
    )

    care_receipient: Mapped["CareReceipient"] = relationship(back_populates="magic_link_tokens")
