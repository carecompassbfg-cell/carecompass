from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.api.routes.threads import ThreadReadResponse
from app.core.database import DbDependency
from app.core.auth import CurrentUserClerkIdDependency, CurrentUserDependency, get_current_user
from app.models import Citizenship, Relationship, Residence, User

router = APIRouter()


# Pydantic models
class UserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    citizenship: Citizenship
    contact_number: Optional[int] = None
    
    care_recipient_age: int
    care_recipient_citizenship: Citizenship
    care_recipient_residence: Residence
    care_recipient_relationship: Relationship

    household_size: Optional[int] = None
    total_monthly_household_income: Optional[int] = None
    annual_property_value: Optional[int] = None
    monthly_pchi: Optional[int] = None

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
    
    user = User(**userToAdd.model_dump(), clerk_id=current_user_clerk_id)
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
