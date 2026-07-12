import json
import os
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.util.prompts import SYSTEM_PROMPT

client = AsyncOpenAI()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")


async def stream_chat_responses(
    conversation_id: str,
    query: str,
) -> AsyncGenerator[str, None]:
    async with client.responses.stream(
        model=OPENAI_MODEL,
        instructions=SYSTEM_PROMPT,
        # `text.format: json_object` requires the word "json" to appear
        # somewhere in `input`; the actual format spec lives in SYSTEM_PROMPT.
        input=[
            {"role": "developer", "content": "Respond only with the JSON format described in your instructions."},
            {"role": "user", "content": query},
        ],
        conversation={"id": conversation_id},
        text={"format": {"type": "json_object"}},
    ) as stream:
        async for event in stream:
            if event.type == "response.output_text.delta":
                yield json.dumps({"token": event.delta})
            elif event.type in ("response.failed", "response.incomplete"):
                error = event.response.error
                incomplete_details = event.response.incomplete_details
                reason = (
                    error.message if error
                    else incomplete_details.reason if incomplete_details
                    else event.type
                )
                raise RuntimeError(f"Response generation failed: {reason}")
            elif event.type == "error":
                raise RuntimeError(f"Response generation failed: {event.message}")
