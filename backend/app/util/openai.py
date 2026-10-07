import json
import os
from typing import AsyncGenerator, Optional

from openai import AsyncOpenAI

from app.util.prompts import SYSTEM_PROMPT

client = AsyncOpenAI()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

# Added for users who chose another language in the app. The JSON keys stay
# in English; only the text inside them changes language.
LANGUAGE_INSTRUCTIONS = {
    "zh": (
        "The user has chosen Simplified Chinese (as used in Singapore). "
        "Write every \"content\" value in Simplified Chinese. Keep the JSON "
        "keys, the \"type\" values and the button \"id\" values exactly as "
        "specified, in English. Use the official Singapore Chinese names for schemes "
        "and agencies (e.g. Agency for Integrated Care = 护联局, Home "
        "Caregiving Grant = 居家看护津贴, CareShield Life = 终身护保, "
        "MediSave = 保健储蓄, CPF = 公积金, AIC Link = 护联局（AIC）服务点). Keep URLs, phone numbers and "
        "amounts exactly as they are. Use short, plain sentences and 您."
    ),
}


async def stream_chat_responses(
    conversation_id: str,
    query: str,
    locale: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    developer_messages = [
        "Respond only with the JSON format described in your instructions.",
    ]
    if locale == "zh":
        developer_messages.append(LANGUAGE_INSTRUCTIONS["zh"])
    async with client.responses.stream(
        model=OPENAI_MODEL,
        instructions=SYSTEM_PROMPT,
        # `text.format: json_object` requires the word "json" to appear
        # somewhere in `input`; the actual format spec lives in SYSTEM_PROMPT.
        input=[
            {"role": "developer", "content": " ".join(developer_messages)},
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
