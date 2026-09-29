import sys
from pathlib import Path

import pytest

# The sync modules are plain scripts next to this folder
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def make_raw(**overrides) -> dict:
    """A Schemes.sg detail record with sensible defaults."""
    record = {
        "scheme_id": "abc123",
        "scheme": "Example Caregiving Grant",
        "agency": "Agency for Integrated Care (AIC)",
        "summary": "Monthly cash for caregivers.",
        "description": "Line one.\r\nLine two.",
        "eligibility": None,
        "who_is_it_for": ["Caregivers", "Elderly"],
        "what_it_gives": ["Financial assistance for daily living expenses"],
        "scheme_type": ["Caregiver Support", "Financial Assistance"],
        "link": "https://www.aic.sg/financial-assistance/example-grant/",
        "service_area": "No Service Boundaries",
        "planning_area": "Bishan",
        "phone": None,
        "email": None,
        "address": None,
        "image": None,
        "status": None,
    }
    record.update(overrides)
    return record


@pytest.fixture
def raw():
    return make_raw
