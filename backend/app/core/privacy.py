"""Keep personal data about the care recipient out of Sentry.

The care recipient's name and the scheme answers (which include
health-related daily-activity answers) are personal data. Sentry would
otherwise attach request bodies and stack-frame variables to error reports,
so for the users endpoints we drop both, and the field names are on the
scrubber's denylist everywhere else.
"""

from typing import Any, Dict, Optional

from sentry_sdk.scrubber import DEFAULT_DENYLIST, EventScrubber

PERSONAL_FIELDS = ["care_recipient_name", "scheme_answers"]

# Routes whose request bodies or local variables can hold those fields
_PERSONAL_PATHS = ("/users",)
_PERSONAL_SOURCE_FILES = ("routes/users.py", "routes\\users.py", "models/user.py", "models\\user.py")

event_scrubber = EventScrubber(denylist=DEFAULT_DENYLIST + PERSONAL_FIELDS)


def _is_personal_request(event: Dict[str, Any]) -> bool:
    url = (event.get("request") or {}).get("url") or ""
    path = url.split("://", 1)[-1]
    path = "/" + path.split("/", 1)[1] if "/" in path else path
    return path.startswith(_PERSONAL_PATHS)


def _strip_frame_vars(event: Dict[str, Any]) -> None:
    for exception in (event.get("exception") or {}).get("values") or []:
        for frame in (exception.get("stacktrace") or {}).get("frames") or []:
            filename = frame.get("filename") or frame.get("abs_path") or ""
            if filename.endswith(_PERSONAL_SOURCE_FILES):
                frame.pop("vars", None)


def scrub_personal_data(
    event: Dict[str, Any], hint: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Sentry before_send hook."""
    if _is_personal_request(event):
        request = event.get("request") or {}
        request.pop("data", None)
    _strip_frame_vars(event)
    return event
