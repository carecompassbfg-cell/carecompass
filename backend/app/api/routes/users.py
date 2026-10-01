import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Annotated, List, Literal, Optional, Union

from fastapi import APIRouter, HTTPException, Depends
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    field_validator,
)
from pydantic.alias_generators import to_camel

from app.api.routes.threads import ThreadReadResponse
from app.core.database import DbDependency
from app.core.auth import CurrentUserClerkIdDependency, CurrentUserDependency, get_current_user
from app.models import Citizenship, Relationship, Residence, User

router = APIRouter()


# Pydantic models

CARE_RECIPIENT_NAME_MAX_LENGTH = 40
POSTAL_CODE_PATTERN = re.compile(r"[0-9]{6}")

NotSure = Literal["not_sure"]
YesNoNotSure = Literal["yes", "no", "not_sure"]


class SchemeAnswers(BaseModel):
    """Answers from the schemes question sheet. Personal and partly
    health-related: stored encrypted, never logged."""

    model_config = ConfigDict(extra="forbid")

    # How many of the 6 daily activities need help
    adl_needs: Optional[Union[Annotated[StrictInt, Field(ge=0, le=6)], NotSure]] = None
    adl_full_help: Optional[YesNoNotSure] = None
    ltc_insurance: Optional[
        Literal["careshield_life", "eldershield", "neither", "not_sure"]
    ] = None
    has_far: Optional[YesNoNotSure] = None
    care_recipient_age_not_sure: Optional[StrictBool] = None
    # Set by the server whenever the answers are saved
    updated_at: Optional[datetime] = None


def clean_care_recipient_name(value: Optional[str]) -> Optional[str]:
    """Strip whitespace; empty becomes None; at most 40 characters; no
    control characters."""
    if value is None:
        return None
    name = value.strip()
    if not name:
        return None
    if len(name) > CARE_RECIPIENT_NAME_MAX_LENGTH:
        raise ValueError(
            f"must be {CARE_RECIPIENT_NAME_MAX_LENGTH} characters or fewer"
        )
    if any(unicodedata.category(char) == "Cc" for char in name):
        raise ValueError("must not contain control characters")
    return name


def clean_home_postal_code(value: Optional[str]) -> Optional[str]:
    """Remove spaces; empty becomes None; otherwise exactly 6 digits."""
    if value is None:
        return None
    postal_code = "".join(value.split())
    if not postal_code:
        return None
    if not POSTAL_CODE_PATTERN.fullmatch(postal_code):
        raise ValueError("must be a 6-digit postal code")
    return postal_code


def serialize_scheme_answers(answers: Optional[SchemeAnswers]) -> Optional[str]:
    """JSON text for the encrypted column, with a server-set updated_at."""
    if answers is None:
        return None
    stamped = answers.model_copy(update={"updated_at": datetime.now(timezone.utc)})
    return json.dumps(stamped.model_dump(mode="json", exclude_none=True))


def parse_scheme_answers(value: Optional[str]) -> Optional[dict]:
    """Stored JSON text back to a dict; anything unreadable reads as None."""
    if value is None:
        return None
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return None
    return parsed if isinstance(parsed, dict) else None


class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    citizenship: Citizenship
    contact_number: Optional[int] = None

    # Both optional, so clients that don't know about them are unaffected
    care_recipient_name: Optional[str] = None
    scheme_answers: Optional[SchemeAnswers] = None
    home_postal_code: Optional[str] = None
    
    care_recipient_age: int
    care_recipient_citizenship: Citizenship
    care_recipient_residence: Residence
    care_recipient_relationship: Relationship

    household_size: Optional[int] = None
    total_monthly_household_income: Optional[int] = None
    annual_property_value: Optional[int] = None
    monthly_pchi: Optional[int] = None

    @field_validator("care_recipient_name")
    @classmethod
    def validate_care_recipient_name(cls, value: Optional[str]) -> Optional[str]:
        return clean_care_recipient_name(value)

    @field_validator("home_postal_code")
    @classmethod
    def validate_home_postal_code(cls, value: Optional[str]) -> Optional[str]:
        return clean_home_postal_code(value)

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):    
    model_config = ConfigDict(from_attributes=True)

    citizenship: Optional[Citizenship] = None
    care_recipient_age: Optional[int] = None
    care_recipient_citizenship: Optional[Citizenship] = None
    care_recipient_residence: Optional[Residence] = None
    care_recipient_relationship: Optional[Relationship] = None

class UserResponse(UserBase):
    id: int # primary key in db
    threads: List[ThreadReadResponse] = []

    # The database keeps the answers as JSON text
    @field_validator("scheme_answers", mode="before")
    @classmethod
    def parse_stored_scheme_answers(cls, value):
        if isinstance(value, str):
            return parse_scheme_answers(value)
        return value

class PCHIBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

    household_size: int
    total_monthly_household_income: int
    annual_property_value: Optional[int] = None
    monthly_pchi: int

class PCHICreate(PCHIBase):
    pass


# Routes

# Protected endpoint - requires authentication
@router.post("/users", response_model=UserResponse)
def create_user(
    userToAdd: UserCreate, 
    db: DbDependency,
    current_user_clerk_id: CurrentUserClerkIdDependency
):
    # Check if user already exists
    user = db.query(User).filter(User.clerk_id == current_user_clerk_id).first()
    if user:
        raise HTTPException(status_code=400, detail="user already exists")
    
    data = userToAdd.model_dump()
    data["scheme_answers"] = serialize_scheme_answers(userToAdd.scheme_answers)
    user = User(**data, clerk_id=current_user_clerk_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# Protected endpoint - requires authentication
@router.get("/users/me", response_model=UserResponse)
async def read_user(
    db: DbDependency,
    current_user_clerk_id: CurrentUserClerkIdDependency
):
    try:
        current_user = await get_current_user(current_user_clerk_id, db)
        return current_user
    except HTTPException as e:
        if e.status_code == 401: # Frontend uses this to direct user to onboarding page
            raise HTTPException(status_code=404, detail="user not found")
        raise e

# Protected endpoint - requires authentication
@router.patch("/users/me", response_model=UserResponse)
def update_user(
    user_info: UserUpdate, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    data_dict = user_info.model_dump(exclude_unset=True)
    # Sending scheme_answers replaces the whole object (null clears it);
    # leaving it out leaves it unchanged
    if "scheme_answers" in data_dict:
        data_dict["scheme_answers"] = serialize_scheme_answers(user_info.scheme_answers)

    for key, value in data_dict.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# Protected endpoint - requires authentication
@router.put("/users/me/pchi", response_model=UserResponse)
def add_pchi_info(
    pchi_info: PCHICreate, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    current_user.household_size = pchi_info.household_size
    current_user.total_monthly_household_income = pchi_info.total_monthly_household_income
    current_user.annual_property_value = pchi_info.annual_property_value
    current_user.monthly_pchi = pchi_info.monthly_pchi

    db.commit()
    db.refresh(current_user)
    return current_user
