from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ConfigDict, model_validator
from pydantic.alias_generators import to_camel

from app.models.review import ReviewableType
from app.models.bookmark import Bookmark
from app.core.database import DbDependency
from app.core.auth import CurrentUserDependency
from app.models import User

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])

# Pydantic models for request/response
class BookmarkBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

    target_id: Optional[int] = None
    target_key: Optional[str] = None
    target_type: ReviewableType
    title: str
    link: str

class BookmarkCreate(BookmarkBase):
    @model_validator(mode="after")
    def check_target(self):
        # Schemes are identified by a string key, care services by an int id
        if self.target_type == ReviewableType.SCHEME:
            if not self.target_key:
                raise ValueError("target_key is required for scheme bookmarks")
        elif self.target_id is None:
            raise ValueError("target_id is required for this target_type")
        return self

class BookmarkResponse(BookmarkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# Protected endpoint - requires authentication
@router.get("", response_model=List[BookmarkResponse])
def list_bookmarks(
    db: DbDependency,
    current_user: CurrentUserDependency,
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    target_type: Optional[ReviewableType] = None,
    target_id: Optional[int] = None,
    target_key: Optional[str] = None,
):
    """
    List bookmarks for the authenticated user.
    """
    query = db.query(Bookmark)
    
    # Filter by authenticated user's ID
    query = query.filter(Bookmark.user_id == current_user.clerk_id)
    
    if target_type:
        query = query.filter(Bookmark.target_type == target_type)
    if target_id:
        query = query.filter(Bookmark.target_id == target_id)
    if target_key:
        query = query.filter(Bookmark.target_key == target_key)

    bookmarks = query.offset(skip).limit(limit).all()
    return bookmarks


# Protected endpoint - requires authentication
@router.post("", response_model=BookmarkResponse, status_code=201)
def create_bookmark(
    bookmark: BookmarkCreate, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Create a new bookmark for the authenticated user.
    """
    db_bookmark = Bookmark(**bookmark.model_dump(), user_id=current_user.clerk_id)
    db.add(db_bookmark)
    try:
        db.commit()
        db.refresh(db_bookmark)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return db_bookmark


# Protected endpoint - requires authentication
@router.get("/{bookmark_id}", response_model=BookmarkResponse)
def get_bookmark(
    bookmark_id: int, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Get a specific bookmark by ID.
    """
    bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    # Verify ownership
    if bookmark.user_id != current_user.clerk_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's bookmark")
    
    return bookmark


# Protected endpoint - requires authentication
@router.delete("/{bookmark_id}", status_code=204)
def delete_bookmark(
    bookmark_id: int, 
    db: DbDependency,
    current_user: CurrentUserDependency
):
    """
    Delete a specific bookmark by ID.
    """
    db_bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
    if not db_bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    # Verify ownership
    if db_bookmark.user_id != current_user.clerk_id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's bookmark")
    
    try:
        db.delete(db_bookmark)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
