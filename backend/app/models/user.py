import os
from enum import Enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Integer, String, Text
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from sqlalchemy_utils import EncryptedType
if TYPE_CHECKING:
    from app.models import Thread, CareReceipient
    
DB_ENCRYPTION_SECRET = os.getenv("DB_ENCRYPTION_SECRET")

class Citizenship(Enum):
    CITIZEN = "CITIZEN"
    PR = "PR"
    OTHER = "OTHER"

class Residence(Enum):
    HOME = "HOME"
    NURSING_HOME_LTCF = "NURSING_HOME_LTCF"
    OTHER = "OTHER"

class Relationship(Enum):
    PARENT = "PARENT"
    SPOUSE = "SPOUSE"
    OTHER_FAMILY = "OTHER_FAMILY"
    NON_FAMILY = "NON_FAMILY"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    clerk_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)
    citizenship: Mapped[Optional[Citizenship]] = mapped_column(SQLAlchemyEnum(Citizenship))
    contact_number: Mapped[Optional[str]] = mapped_column(
        EncryptedType(String, DB_ENCRYPTION_SECRET), nullable=True, comment="Assumes SG phone number"
    )

    # Personal data, encrypted at rest like contact_number. Never log these.
    care_recipient_name: Mapped[Optional[str]] = mapped_column(
        EncryptedType(String, DB_ENCRYPTION_SECRET), nullable=True
    )
    # JSON text of the schemes question-sheet answers (includes health-related
    # daily-activity answers)
    scheme_answers: Mapped[Optional[str]] = mapped_column(
        EncryptedType(Text, DB_ENCRYPTION_SECRET), nullable=True
    )
    home_postal_code: Mapped[Optional[str]] = mapped_column(
        EncryptedType(String, DB_ENCRYPTION_SECRET),
        nullable=True,
        comment="Postal code where the care recipient lives",
    )

    care_recipient_age: Mapped[Optional[int]] = mapped_column(Integer)
    care_recipient_citizenship: Mapped[Optional[Citizenship]] = mapped_column(SQLAlchemyEnum(Citizenship))
    care_recipient_residence: Mapped[Optional[Residence]] = mapped_column(SQLAlchemyEnum(Residence))
    care_recipient_relationship: Mapped[Optional[Relationship]] = mapped_column(SQLAlchemyEnum(Relationship))

    # PCHI info
    household_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    total_monthly_household_income: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    annual_property_value: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    monthly_pchi: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    threads: Mapped[List["Thread"]] = relationship(back_populates="user")
    care_receipients: Mapped[List["CareReceipient"]] = relationship(back_populates="user")
