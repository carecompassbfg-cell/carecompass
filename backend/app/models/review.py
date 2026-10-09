from enum import Enum
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base
from app.models.util import use_enum_values

class ReviewableType(str, Enum):
    DEMENTIA_DAY_CARE = "CARESERVICE::DEMENTIA_DAY_CARE"
    DEMENTIA_HOME_CARE = "CARESERVICE::DEMENTIA_HOME_CARE"
    # Bookmarks only (schemes can be saved but not reviewed). Shares the
    # Postgres "reviewabletype" enum with reviews, see the TODO on Bookmark.
    SCHEME = "SCHEME"

class ReviewSource(str, Enum):
    GOOGLE = "GOOGLE"
    IN_APP = "IN_APP"

class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
        unique=True
    )
    review_source: Mapped[ReviewSource] = mapped_column(
        SQLAlchemyEnum(ReviewSource)
    )
    # We sacrifice referential integrity here for polymorphism
    target_id: Mapped[int] = mapped_column(Integer)
    target_type: Mapped[ReviewableType] = mapped_column(
        SQLAlchemyEnum(ReviewableType, values_callable=use_enum_values)
    )
    content: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    overall_rating: Mapped[int] = mapped_column(Integer)
    # Attributions
    author_name: Mapped[str] = mapped_column(String)
    author_id: Mapped[Optional[str]] = mapped_column(String, nullable=True) # in-app id
    google_review_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    google_author_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    google_author_photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Metadata
    # Overriden if review is from 3rd party source, else defaults to server time
    published_time: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
