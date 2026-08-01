from typing import List, Optional
from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from openai import NotFoundError
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.util.openai import client, stream_chat_responses
from app.core.database import DbDependency
from app.core.auth import CurrentUserDependency
from app.models import Thread, User

router = APIRouter()


# Pydantic models
class ChatCompletionRequest(BaseModel):
    query: str

class ThreadCreateResponse(BaseModel):
    thread_id: str

class ThreadBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)

    title: Optional[str] = None
    thread_id: str

class ThreadReadResponse(ThreadBase):
    pass


def get_owned_thread(db: Session, thread_id: str, current_user: User) -> Thread:
    thread = db.query(Thread).filter(Thread.thread_id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    if thread.user_id != current_user.clerk_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return thread


# Routes

@router.post('/threads')
async def create_thread(
    current_user: CurrentUserDependency,
    db: DbDependency
) -> ThreadCreateResponse:
    conversation = await client.conversations.create()

    thread = Thread(
        thread_id=conversation.id,
        user_id=current_user.clerk_id,
    )
    db.add(thread)
    db.commit()

    return ThreadCreateResponse(thread_id=conversation.id)


@router.get('/threads/{thread_id}/messages')
async def thread_messages(
    thread_id: str,
    current_user: CurrentUserDependency,
    db: DbDependency
):
    thread = get_owned_thread(db, thread_id, current_user)

    try:
        items = await client.conversations.items.list(thread.thread_id, order="asc")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Thread is not found")

    extracted_values = []
    async for item in items:
        if item.type != "message" or item.role not in ("user", "assistant"):
            continue
        text = ""
        for block in item.content:
            if hasattr(block, "text"):
                text += block.text
        extracted_values.append({
            "id": item.id,
            "role": item.role,
            "content": text,
        })

    return extracted_values


@router.post('/threads/{thread_id}/messages')
async def create_message(
    thread_id: str,
    req: ChatCompletionRequest,
    current_user: CurrentUserDependency,
    db: DbDependency
) -> EventSourceResponse:
    thread = get_owned_thread(db, thread_id, current_user)

    if not thread.title:
        thread.title = req.query
        db.add(thread)
        db.commit()

    return EventSourceResponse(stream_chat_responses(thread_id, req.query))


@router.get('/threads', response_model=List[ThreadReadResponse])
async def read_user_threads(
    current_user: CurrentUserDependency,
    db: DbDependency
):
    return db.query(Thread).filter(Thread.user_id == current_user.clerk_id).all()
