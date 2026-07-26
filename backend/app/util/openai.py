# util functions for dealing with OpenAI's assistant API

import asyncio
import json
import os
import re

from app.core.database import *
from typing import AsyncGenerator
from openai import OpenAI
from openai.types.beta.assistant_stream_event import (
    ThreadMessageDelta,
    ThreadRunFailed,
    ThreadRunCancelling,
    ThreadRunCancelled,
    ThreadRunExpired,
    ThreadRunStepFailed,
    ThreadRunStepCancelled,
)

client = OpenAI()

async def stream_chat_responses(thread_id: str, query: str) -> AsyncGenerator[str, None]:
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=query
    )
    assistant_id = os.getenv('OPENAI_ASSISTANT_ID')
    if not assistant_id:
        raise RuntimeError("OPENAI_ASSISTANT_ID is not set")
    stream = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id,
        stream=True,
        response_format={ "type": "json_object" }
    )

    for event in stream:
        async for token in process_event(event):
            yield json.dumps({ "token": token })
            # let the event loop actually send the token before processing the next.
            # this prevents tokens from being buffered because they're processed
            # in the same event loop.
            await asyncio.sleep(0)
        

async def process_event(event):
    if isinstance(event, ThreadMessageDelta):
        data = event.data.delta.content
        if data:
            for d in data:
                if d.type == "text" and d.text and d.text.value is not None:
                    yield d.text.value

    elif any(
        isinstance(event, cls)
        for cls in [
            ThreadRunFailed,
            ThreadRunCancelling,
            ThreadRunCancelled,
            ThreadRunExpired,
            ThreadRunStepFailed,
            ThreadRunStepCancelled,
        ]
    ):
        raise Exception("Run failed")

# Temporary solution to remove citation from the openai response
def remove_citation(text: str) -> str:
    return re.sub(r'【.*】', '', text)