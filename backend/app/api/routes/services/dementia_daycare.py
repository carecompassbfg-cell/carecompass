from typing import List, Optional
from fastapi import APIRouter, HTTPException, Response, status, Depends
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from heapq import nsmallest
from haversine import haversine

from app.core.database import DbDependency
from app.core.auth import CurrentUserDependency
from app.models import User
from app.models.dementia_daycare import DementiaDaycare
from app.models.review import Review, ReviewableType
from app.api.routes.reviews import ReviewBase
from app.util.maps import getCoordFromAddress, getRouteDistance

router = APIRouter(prefix="/dementia-daycare", tags=["dementia-daycare"])

# Pydantic models for request/response validation
# TODO: add price info from scraper
class DementiaDaycareBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

    friendly_id: str
    name: str
    lat: float
    lng: float
    postal_code: str
    operating_hours: List[str] = []

    # Optional fields
    description: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    building_name: Optional[str] = None
    block: Optional[str] = None
    street_name: Optional[str] = None
    unit_no: Optional[str] = None
    availability: Optional[str] = None
    google_map_place_id: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None

class DementiaDaycareDetails(DementiaDaycareBase):
    model_config = ConfigDict(from_attributes=True)

    photos: List[str] = []

class DementiaDaycareCreate(DementiaDaycareDetails):
    pass

class DementiaDaycarePatch(DementiaDaycareDetails):
    model_config = ConfigDict(from_attributes=True)

    # Override all fields to be optional
    friendly_id: Optional[str] = None
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    postal_code: Optional[str] = None
    operating_hours: Optional[List[str]] = None
    photos: Optional[List[str]] = None

class DementiaDaycarePreference(BaseModel):
    location: Optional[str] = None

class DementiaDaycareBaseResponse(DementiaDaycareBase):
    id: int

class DementiaDaycareDetailResponse(DementiaDaycareDetails):
    id: int

    review_count: int
    average_rating: float
    reviews: List[ReviewBase]

class DementiaDaycareRecommendation(DementiaDaycareDetailResponse):
    distance_from_home: Optional[float] = None
    driving_duration: Optional[int] = None
    transit_duration: Optional[int] = None

class DementiaDaycareAddress(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

    id: int
    name: str
    address: str

# Routes
# List all dementia daycare centers
@router.get("", response_model=List[DementiaDaycareBaseResponse])
async def get_all_daycare_centers(
    db: DbDependency,
    skip: Optional[int] = None,
    limit: Optional[int] = None
):
    centers = db.query(
        DementiaDaycare
    ).offset(skip).limit(limit).all()

    return centers

# List all dementia daycare centre addresses for the scraper
@router.get("/addresses", response_model=List[DementiaDaycareAddress])
async def get_all_daycare_addresses(db: DbDependency):
    centers = db.query(DementiaDaycare).all()
    addresses = []
    for center in centers:
        address_parts = [center.block, center.street_name, center.building_name, center.unit_no, center.postal_code]
        addresses.append(DementiaDaycareAddress(
            id=center.id,
            name=center.name,
            address=" ".join([part for part in address_parts if part])
        ))
    return addresses

# Rank all dementia daycare centers based on user preferences
@router.post("/recommendations", response_model=List[DementiaDaycareRecommendation])
async def rank_daycare_centers(
    pref: DementiaDaycarePreference,
    db: DbDependency,
    limit: int = 3,
):
    # Fetch centers
    centers = db.query(DementiaDaycare).all()

    # Get lat and lng of provided address
    home_coords = None
    if pref.location:
        home_coords = getCoordFromAddress(pref.location)
    
    if not home_coords:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid address provided"
        )

    # Get top k closest centers
    centers = nsmallest(
        limit, 
        centers, 
        key=lambda c: haversine((home_coords[0], home_coords[1]), (c.lat, c.lng))
    ) if pref.location else centers[:limit]

    response: List[DementiaDaycareRecommendation] = []
    for center in centers:
        reviews = db.query(Review).filter(
            and_(
                Review.target_type == ReviewableType.DEMENTIA_DAY_CARE,
                Review.target_id == center.id
            )
        ).all()

        center_response = DementiaDaycareRecommendation(
            **center.__dict__,
            review_count=len(reviews),
            average_rating=round(sum([review.overall_rating for review in reviews]) / len(reviews), 1) if reviews else 0,
            reviews=[ReviewBase.model_validate(review) for review in reviews]
        )

        if home_coords:
            driving_dist = getRouteDistance(home_coords, (center.lat, center.lng), "driving")
            transit_dist = getRouteDistance(home_coords, (center.lat, center.lng), "transit")
            center_response.distance_from_home = driving_dist.distance
            center_response.driving_duration = driving_dist.duration
            center_response.transit_duration = transit_dist.duration
        
        response.append(center_response)

    # Sort centers again by distance from home (with more accurate values from gmaps)
    # Put None at the back
    if pref.location:
        response.sort(key=lambda x: (x.distance_from_home is None, x.distance_from_home))
    
    return response

# Get specific dementia daycare center by ID
@router.get("/{center_id}", response_model=DementiaDaycareDetailResponse)
async def get_daycare_center(
    center_id: int,
    db: DbDependency
):
    center = db.query(
        DementiaDaycare
    ).filter(
        DementiaDaycare.id == center_id
    ).first()
    
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dementia daycare center not found"
        )

    reviews = db.query(Review).filter(
        and_(
            Review.target_type == ReviewableType.DEMENTIA_DAY_CARE,
            Review.target_id == center_id
        )
    ).all()

    return DementiaDaycareDetailResponse(
        **center.__dict__,
        review_count=len(reviews),
        average_rating=round(sum([review.overall_rating for review in reviews]) / len(reviews), 1) if reviews else 0,
        reviews=[ReviewBase.model_validate(review) for review in reviews]
    )

# Create new dementia daycare center (admin only)
@router.post("", status_code=status.HTTP_201_CREATED)
def create_daycare_center(
    center: DementiaDaycareCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    try:
        db_center = DementiaDaycare(**center.model_dump())
        db.add(db_center)
        db.commit()
        db.refresh(db_center)
        return db_center
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A center with this friendly_id already exists"
        )

# Update dementia daycare center (admin only)
@router.patch("/{center_id}", response_model=DementiaDaycareDetailResponse)
async def update_daycare_center(
    center_id: int,
    update_data: DementiaDaycarePatch,
    db: DbDependency,
    current_user: CurrentUserDependency,
    override: bool = False
):
    """
    Update dementia daycare center with the given ID, using the provided update data.
    If `override` is set to True, existing values will be replaced with the update data.
    By default, `override` is False, and the update will only apply to empty fields.
    """
    # Get existing center
    center = db.query(DementiaDaycare).filter(
        DementiaDaycare.id == center_id
    ).first()
    
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dementia daycare center not found"
        )

    # Convert update data to dict, excluding None values
    update_dict = update_data.model_dump(exclude_none=True)

    try:
        # Update each field based on override flag and None values
        for field, new_value in update_dict.items():
            existing_value = getattr(center, field)
            
            # Determine whether to update the field
            should_update = override or not existing_value
   
            if should_update:
                setattr(center, field, new_value)

        db.commit()
        db.refresh(center)

        # Fetch reviews for the response
        reviews = db.query(Review).filter(
            and_(
                Review.target_type == ReviewableType.DEMENTIA_DAY_CARE,
                Review.target_id == center.id
            )
        ).all()

        return DementiaDaycareDetailResponse(
            **center.__dict__,
            review_count=len(reviews),
            average_rating=round(sum([review.overall_rating for review in reviews]) / len(reviews), 1) if reviews else 0,
            reviews=[ReviewBase.model_validate(review) for review in reviews]
        )

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error occurred"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# Upsert dementia daycare center (admin only)
@router.put("", response_model=DementiaDaycareDetailResponse)
async def upsert_daycare_center(
    center: DementiaDaycareCreate,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    # Check if center exists with the given friendly_id
    existing_center = db.query(DementiaDaycare).filter(
        DementiaDaycare.friendly_id == center.friendly_id
    ).first()

    try:
        if existing_center:
            # Update existing center
            for key, value in center.model_dump(exclude_unset=True).items():
                setattr(existing_center, key, value)
            db_center = existing_center
        else:
            # Create new center
            db_center = DementiaDaycare(**center.model_dump())
            db.add(db_center)
        
        db.commit()
        db.refresh(db_center)

        # Fetch reviews for the response
        reviews = db.query(Review).filter(
            and_(
                Review.target_type == ReviewableType.DEMENTIA_DAY_CARE,
                Review.target_id == db_center.id
            )
        ).all()

        response = DementiaDaycareDetailResponse(
            **db_center.__dict__,
            review_count=len(reviews),
            average_rating=round(sum([review.overall_rating for review in reviews]) / len(reviews), 1) if reviews else 0,
            reviews=[ReviewBase.model_validate(review) for review in reviews]
        )

        return Response(
            status_code=status.HTTP_201_CREATED if not existing_center else status.HTTP_200_OK,
            content=response.model_dump_json(),
            media_type="application/json"
        )

    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database integrity error occurred"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

# DELETE dementia daycare center (admin only)
@router.delete("/{center_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_daycare_center(
    center_id: int,
    db: DbDependency,
    current_user: CurrentUserDependency
):
    center = db.query(DementiaDaycare).filter(DementiaDaycare.id == center_id).first()
    if not center:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dementia daycare center not found"
        )
    
    db.delete(center)
    db.commit()

    # Delete all reviews associated with this center
    db.query(Review).filter(
        and_(
            Review.target_type == ReviewableType.DEMENTIA_DAY_CARE,
            Review.target_id == center_id
        )
    ).delete()
    return None
