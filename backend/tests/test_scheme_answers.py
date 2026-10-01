"""Unit tests for the profile fields. No database needed."""

import json

import pytest
from pydantic import ValidationError

from app.api.routes.users import (
    SchemeAnswers,
    UserResponse,
    UserUpdate,
    clean_care_recipient_name,
    parse_scheme_answers,
    serialize_scheme_answers,
)
from app.core.privacy import scrub_personal_data


# --- care_recipient_name -------------------------------------------------------


def test_name_is_stripped():
    assert clean_care_recipient_name("  Mum  ") == "Mum"


def test_empty_name_becomes_none():
    assert clean_care_recipient_name("   ") is None
    assert clean_care_recipient_name("") is None
    assert clean_care_recipient_name(None) is None


def test_name_up_to_40_characters():
    assert clean_care_recipient_name("a" * 40) == "a" * 40
    with pytest.raises(ValueError):
        clean_care_recipient_name("a" * 41)


def test_name_rejects_control_characters():
    for bad in ("Ma\nma", "Ma\tma", "Ma\x00ma", "Ma\x1bma"):
        with pytest.raises(ValueError):
            clean_care_recipient_name(bad)


def test_name_allows_ordinary_unicode():
    assert clean_care_recipient_name("Mdm Lim 林") == "Mdm Lim 林"


def test_update_model_validates_the_name():
    assert UserUpdate(care_recipient_name="  Pa ").care_recipient_name == "Pa"
    with pytest.raises(ValidationError):
        UserUpdate(care_recipient_name="x" * 41)


# --- SchemeAnswers -----------------------------------------------------------


def test_all_answers_are_optional():
    assert SchemeAnswers().model_dump(exclude_none=True) == {}


def test_valid_answers():
    answers = SchemeAnswers(
        adl_needs=3,
        adl_full_help="yes",
        ltc_insurance="eldershield",
        has_far="not_sure",
        care_recipient_age_not_sure=False,
    )
    assert answers.adl_needs == 3
    assert SchemeAnswers(adl_needs="not_sure").adl_needs == "not_sure"
    assert SchemeAnswers(adl_needs=0).adl_needs == 0
    assert SchemeAnswers(adl_needs=6).adl_needs == 6


@pytest.mark.parametrize(
    "bad",
    [
        {"adl_needs": 9},
        {"adl_needs": -1},
        {"adl_needs": "3"},
        {"adl_needs": True},
        {"adl_needs": "maybe"},
        {"adl_full_help": "sometimes"},
        {"ltc_insurance": "medishield"},
        {"has_far": 1},
        {"care_recipient_age_not_sure": "yes"},
        {"favourite_colour": "blue"},
    ],
)
def test_bad_answers_are_rejected(bad):
    with pytest.raises(ValidationError):
        SchemeAnswers(**bad)


def test_serialize_sets_updated_at_on_the_server():
    sent = SchemeAnswers(
        adl_needs=3, updated_at="2000-01-01T00:00:00Z"
    )
    stored = json.loads(serialize_scheme_answers(sent))
    assert stored["adl_needs"] == 3
    assert not stored["updated_at"].startswith("2000")
    assert serialize_scheme_answers(None) is None


def test_parse_round_trip_and_bad_json():
    text = serialize_scheme_answers(SchemeAnswers(ltc_insurance="neither"))
    assert parse_scheme_answers(text)["ltc_insurance"] == "neither"
    assert parse_scheme_answers("not json") is None
    assert parse_scheme_answers("[1, 2]") is None
    assert parse_scheme_answers(None) is None


def test_response_reads_stored_json_text():
    class Row:
        id = 1
        threads = []
        citizenship = "CITIZEN"
        contact_number = None
        care_recipient_name = "Mum"
        scheme_answers = serialize_scheme_answers(SchemeAnswers(adl_needs=2))
        care_recipient_age = 78
        care_recipient_citizenship = "CITIZEN"
        care_recipient_residence = "HOME"
        care_recipient_relationship = "PARENT"
        household_size = None
        total_monthly_household_income = None
        annual_property_value = None
        monthly_pchi = None

    response = UserResponse.model_validate(Row())
    assert response.care_recipient_name == "Mum"
    assert response.scheme_answers.adl_needs == 2
    assert response.scheme_answers.updated_at is not None


# --- Sentry scrubbing --------------------------------------------------------


def test_sentry_drops_request_body_and_frame_vars_for_users_routes():
    event = {
        "request": {
            "url": "https://api.example.com/users/me",
            "data": {"care_recipient_name": "Mum"},
        },
        "exception": {
            "values": [
                {
                    "stacktrace": {
                        "frames": [
                            {
                                "filename": "app/api/routes/users.py",
                                "vars": {"user_info": "care_recipient_name='Mum'"},
                            },
                            {"filename": "app/core/database.py", "vars": {"x": 1}},
                        ]
                    }
                }
            ]
        },
    }
    scrubbed = scrub_personal_data(event)
    assert "data" not in scrubbed["request"]
    frames = scrubbed["exception"]["values"][0]["stacktrace"]["frames"]
    assert "vars" not in frames[0]
    assert frames[1]["vars"] == {"x": 1}


def test_sentry_keeps_request_body_for_other_routes():
    event = {"request": {"url": "https://api.example.com/reviews", "data": {"a": 1}}}
    assert scrub_personal_data(event)["request"]["data"] == {"a": 1}
