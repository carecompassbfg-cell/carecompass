from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
if TYPE_CHECKING:
    from app.models import User

class Thread(Base):
    __tablename__ = "threads"

    thread_id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.clerk_id"))
    title: Mapped[Optional[str]] = mapped_column(String)

    user: Mapped[Optional["User"]] = relationship(back_populates="threads")
