from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.models.review import Review, ReviewSource, ReviewableType
from app.core.database import DbDependency
from app.core.auth import CurrentUserDependency
from app.models import User

router = APIRouter(prefix="/reviews", tags=["reviews"])

# Pydantic models for request/response
class ReviewBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

    review_source: ReviewSource
    target_id: int
    target_type: ReviewableType
    overall_rating: int
    content: Optional[str] = None
    author_id: Optional[str] = None

class ReviewCreate(ReviewBase):
    @model_validator(mode="after")
    def check_reviewable(self):
        if self.target_type == ReviewableType.SCHEME:
            raise ValueError("schemes can't be reviewed")
        return self

    author_name: str = "Anonymous"
    google_review_id: Optional[str] = None
    google_author_url: Optional[str] = None
    google_author_photo_url: Optional[str] = None
    published_time: Optional[datetime] = None

class GoogleReviewCreate(ReviewBase):
    review_source: ReviewSource = Field(default=ReviewSource.GOOGLE, frozen=True)
    author_name: str
    google_review_id: str
    google_author_url: str
    google_author_photo_url: str
    published_time: Optional[datetime] = None

    @model_validator(mode='before')
    def validate_review_source(cls, values):
        if values.get('review_source') != ReviewSource.GOOGLE:
            raise ValueError('review_source must be `GOOGLE`')
        return values

class ReviewResponse(ReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_name: str = "Anonymous"
    google_review_id: Optional[str] = None
    google_author_url: Optional[str] = None
    google_author_photo_url: Optional[str] = None
    # published time is not optional in the response
    published_time: datetime


# Public endpoint - anyone can read reviews
@router.get("", response_model=List[ReviewResponse])
def list_reviews(
    db: DbDependency,
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    target_type: Optional[ReviewableType] = None,
    target_id: Optional[int] = None,
    review_source: Optional[ReviewSource] = None,
):
    """
    List reviews with optional filtering and pagination. Public endpoint.
    """
    query = db.query(Review)
    
    if target_type:
        query = query.filter(Review.target_type == target_type)
    if target_id:
        query = query.filter(Review.target_id == target_id)
    if review_source:
        query = query.filter(Review.review_source == review_source)
    
    reviews = query.offset(skip).limit(limit).all()
    return reviews


# Protected endpoint - requires authentication to create reviews
@router.post("", response_model=ReviewResponse, status_code=201)
def create_review(
    review: ReviewCreate, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Create a new review. Requires authentication.
    """
    # Set the author_id to the authenticated user's ID
    review_data = review.model_dump()
    review_data["author_id"] = current_user.clerk_id
    
    db_review = Review(**review_data)
    db.add(db_review)
    try:
        db.commit()
        db.refresh(db_review)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_review


# Public endpoint - anyone can read a single review
@router.get("/{review_id}", response_model=ReviewResponse)
def get_review(review_id: int, db: DbDependency):
    """
    Get a specific review by ID. Public endpoint.
    """
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review


# Public endpoint - for upserting Google reviews (used by scrapers)
@router.put("/google-reviews/{review_id}", response_model=ReviewResponse)
async def upsert_review(review_id: str, review: GoogleReviewCreate, db: DbDependency):
    """
    Update a specific google review by ID or create it if it does not exist.
    This endpoint is public as it's used by data scrapers.
    """
    existing_review = db.query(Review).filter(
        Review.google_review_id == review_id
    ).first()

    if existing_review:
        # Update the existing review
        for field, value in review.model_dump(exclude_unset=True).items():
            setattr(existing_review, field, value)
        db_review = existing_review
    else:
        # Create a new review
        db_review = Review(**review.model_dump())
        db.add(db_review)

    try:
        db.commit()
        db.refresh(db_review)
    except Exception as e:
        db.rollback()
        raise e

    return db_review


# Protected endpoint - requires authentication to delete reviews
@router.delete("/{review_id}", status_code=204)
def delete_review(
    review_id: int, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Delete a specific review by ID. Requires authentication.
    """
    db_review = db.query(Review).filter(Review.id == review_id).first()
    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Verify ownership - users can only delete their own reviews
    if db_review.author_id and db_review.author_id != current_user.clerk_id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's review")
    
    try:
        db.delete(db_review)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
