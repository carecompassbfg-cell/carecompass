from cachetools import cached, TTLCache
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import jwt, JWTError
import os

from app.core.database import DbDependency
from app.models import User

security = HTTPBearer()

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_ISSUER = os.getenv("CLERK_JWT_ISSUER")

@cached(cache=TTLCache(maxsize=1, ttl=3600))  # refresh every hour
def get_jwks(url:str):
    response = httpx.get(url)
    return response.json()

async def get_current_user_clerk_id(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> str:
    if not CLERK_JWKS_URL or not CLERK_ISSUER:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error"
        )
    
    try:
        jwks = get_jwks()
        payload = jwt.decode(
            credentials.credentials,
            jwks,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={"verify_aud": False}
        )
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing subject claim",
                headers={"WWW-Authenticate": "Bearer"}
            )
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return clerk_id


async def get_current_user(
    clerk_id: Annotated[str, Depends(get_current_user_clerk_id)],
    db: DbDependency
) -> User:
    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found. Please complete your profile first.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user


CurrentUserClerkIdDependency = Annotated[str, Depends(get_current_user_clerk_id)]
CurrentUserDependency = Annotated[User, Depends(get_current_user)]
