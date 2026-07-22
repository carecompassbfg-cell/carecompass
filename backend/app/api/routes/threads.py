from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from sse_starlette.sse import EventSourceResponse
from openai import OpenAI
from openai import NotFoundError
from pydantic import BaseModel, ConfigDict

from app.util.openai import remove_citation, stream_chat_responses
from app.core.database import DbDependency
from app.core.auth import CurrentUserDependency
from app.models import User, Thread

router = APIRouter()
client = OpenAI()


# Pydantic models
class ChatCompletionRequest(BaseModel):
    query: str

class ThreadCreateRequest(BaseModel):
    pass

class ThreadCreateResponse(BaseModel):
    thread_id: str

class ThreadBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)

    title: Optional[str] = None
    thread_id: str

class ThreadReadResponse(ThreadBase):
    pass


# Routes

# Protected endpoint - requires authentication and user in database
@router.post('/threads')
async def create_thread(
    current_user: CurrentUserDependency,
    db: DbDependency
) -> ThreadCreateResponse:
    # current_user is already verified to exist in database from the dependency
    
    # Create thread in OpenAI
    new_thread = client.beta.threads.create()

    # Store in database
    thread = Thread(
        thread_id=new_thread.id, 
        user_id=current_user.clerk_id,
    )
    db.add(thread)
    db.commit()

    return ThreadCreateResponse(thread_id=new_thread.id)


# Protected endpoint - requires authentication
@router.get('/threads/{thread_id}/messages')
async def thread_messages(
    thread_id: str, 
    current_user: CurrentUserDependency,
    db: DbDependency
):
    try:
        # First check if thread exists and user has access
        thread = db.query(Thread).filter(Thread.thread_id == thread_id).first()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")

        # Check user owns this thread
        if thread.user_id != current_user.clerk_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get messages from OpenAI
        thread_messages = client.beta.threads.messages.list(thread_id)
        extracted_values = []
        for message in thread_messages:
            for content_block in message.content:
                if content_block.type != "text":
                    continue
                extracted_values.append({
                    "id": message.id,
                    "role": message.role,
                    "content": remove_citation(content_block.text.value)
                })

        extracted_values.reverse()
        return extracted_values
    except Exception as e:
        if isinstance(e, NotFoundError):
            raise HTTPException(status_code=404, detail="Thread is not found")
        return HTTPException(status_code=500, detail="Internal server error")


# Protected endpoint - requires authentication
@router.post('/threads/{thread_id}/messages')
async def create_message(
    thread_id: str, 
    req: ChatCompletionRequest, 
    current_user: CurrentUserDependency,
    db: DbDependency
) -> EventSourceResponse:
    # Verify thread access
    thread = db.query(Thread).filter(Thread.thread_id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Check user owns this thread
    if thread.user_id != current_user.clerk_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Add the query as the title of the thread, if it's not already set
    if not thread.title:
        thread.title = req.query
        db.add(thread)
        db.commit()

    return EventSourceResponse(stream_chat_responses(thread_id, req.query))


# Protected endpoint - requires authentication
@router.get('/threads', response_model=List[ThreadReadResponse])
async def read_user_threads(
    current_user: CurrentUserDependency,
    db: DbDependency
):
    return db.query(Thread).filter(Thread.user_id == current_user.clerk_id).all()
