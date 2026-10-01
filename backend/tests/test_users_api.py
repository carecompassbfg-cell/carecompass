"""API and migration tests against a local Postgres (see conftest.py).

Skipped unless TEST_DATABASE_URL points at localhost. The Clerk token check
is replaced with a fixed test user.
"""

from pathlib import Path

import pytest
from sqlalchemy import text

from conftest import requires_db

pytestmark = requires_db

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_CLERK_ID = "test-clerk-user-profile-answers"
NEW_COLUMNS = ("care_recipient_name", "scheme_answers")

NEW_USER = {
    "citizenship": "CITIZEN",
    "care_recipient_age": 78,
    "care_recipient_citizenship": "CITIZEN",
    "care_recipient_residence": "HOME",
    "care_recipient_relationship": "PARENT",
}


@pytest.fixture(scope="module")
def alembic_config():
    from alembic.config import Config

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "app" / "migrations"))
    return config


@pytest.fixture(scope="module", autouse=True)
def migrated(alembic_config):
    from alembic import command

    command.upgrade(alembic_config, "head")


@pytest.fixture
def engine():
    from app.core.database import engine

    return engine


@pytest.fixture
def client(engine):
    from fastapi.testclient import TestClient

    from app.core.auth import get_current_user_clerk_id
    from app.main import app

    with engine.begin() as connection:
        connection.execute(
            text("DELETE FROM users WHERE clerk_id = :id"), {"id": TEST_CLERK_ID}
        )
    app.dependency_overrides[get_current_user_clerk_id] = lambda: TEST_CLERK_ID
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def user(client):
    response = client.post("/users", json=NEW_USER)
    assert response.status_code == 200, response.text
    return response.json()


def raw_row(engine):
    with engine.connect() as connection:
        return connection.execute(
            text(
                "SELECT care_recipient_name, scheme_answers, care_recipient_age "
                "FROM users WHERE clerk_id = :id"
            ),
            {"id": TEST_CLERK_ID},
        ).one()


def new_columns(engine):
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT column_name, data_type, is_nullable, column_default "
                "FROM information_schema.columns WHERE table_name = 'users' "
                "AND column_name IN ('care_recipient_name', 'scheme_answers')"
            )
        ).all()
    return {row[0]: row[1:] for row in rows}


# --- migration ---------------------------------------------------------------


def test_migration_adds_two_nullable_encrypted_columns(engine):
    columns = new_columns(engine)
    assert set(columns) == set(NEW_COLUMNS)
    for data_type, nullable, default in columns.values():
        # bytea, like the existing encrypted contact_number
        assert data_type == "bytea"
        assert nullable == "YES"
        assert default is None


def test_migration_downgrades_and_upgrades(alembic_config, engine):
    from alembic import command

    command.downgrade(alembic_config, "-1")
    assert new_columns(engine) == {}
    command.upgrade(alembic_config, "head")
    assert set(new_columns(engine)) == set(NEW_COLUMNS)


# --- GET / PATCH / POST ------------------------------------------------------


def test_new_fields_are_null_for_an_existing_user(client, user):
    assert user["care_recipient_name"] is None
    assert user["scheme_answers"] is None
    response = client.get("/users/me")
    assert response.status_code == 200
    assert response.json()["care_recipient_name"] is None
    assert response.json()["scheme_answers"] is None


def test_patch_saves_name_and_answers(client, user):
    response = client.patch(
        "/users/me",
        json={
            "care_recipient_name": "  Mum  ",
            "scheme_answers": {"adl_needs": 3, "adl_full_help": "yes"},
        },
    )
    assert response.status_code == 200, response.text
    body = client.get("/users/me").json()
    assert body["care_recipient_name"] == "Mum"
    assert body["scheme_answers"]["adl_needs"] == 3
    assert body["scheme_answers"]["adl_full_help"] == "yes"
    assert body["scheme_answers"]["updated_at"]


def test_values_are_encrypted_in_the_database(client, engine, user):
    client.patch(
        "/users/me",
        json={
            "care_recipient_name": "Mdm Lim",
            "scheme_answers": {"ltc_insurance": "eldershield"},
        },
    )
    name, answers, _ = raw_row(engine)
    for stored in (name, answers):
        raw = bytes(stored)
        assert b"Mdm Lim" not in raw
        assert b"eldershield" not in raw
        assert b"ltc_insurance" not in raw


def test_patching_other_fields_leaves_them_unchanged(client, user):
    client.patch(
        "/users/me",
        json={"care_recipient_name": "Pa", "scheme_answers": {"adl_needs": 2}},
    )
    response = client.patch("/users/me", json={"care_recipient_age": 80})
    assert response.status_code == 200
    body = client.get("/users/me").json()
    assert body["care_recipient_age"] == 80
    assert body["care_recipient_name"] == "Pa"
    assert body["scheme_answers"]["adl_needs"] == 2


def test_scheme_answers_are_replaced_as_a_whole(client, user):
    client.patch("/users/me", json={"scheme_answers": {"adl_needs": 3}})
    client.patch("/users/me", json={"scheme_answers": {"has_far": "no"}})
    answers = client.get("/users/me").json()["scheme_answers"]
    assert answers["has_far"] == "no"
    assert answers["adl_needs"] is None  # the earlier answer is gone


def test_scheme_answers_null_clears_them(client, user):
    client.patch(
        "/users/me",
        json={"care_recipient_name": "Pa", "scheme_answers": {"adl_needs": 1}},
    )
    response = client.patch("/users/me", json={"scheme_answers": None})
    assert response.status_code == 200
    body = client.get("/users/me").json()
    assert body["scheme_answers"] is None
    assert body["care_recipient_name"] == "Pa"


def test_empty_name_clears_it(client, user):
    client.patch("/users/me", json={"care_recipient_name": "Pa"})
    client.patch("/users/me", json={"care_recipient_name": "   "})
    assert client.get("/users/me").json()["care_recipient_name"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {"scheme_answers": {"adl_needs": 9}},
        {"scheme_answers": {"unknown_key": True}},
        {"care_recipient_name": "x" * 41},
        {"care_recipient_name": "Ma\nma"},
    ],
)
def test_bad_values_get_422(client, user, payload):
    assert client.patch("/users/me", json=payload).status_code == 422


def test_onboarding_accepts_a_name(client):
    response = client.post("/users", json={**NEW_USER, "care_recipient_name": "Ah Ma"})
    assert response.status_code == 200, response.text
    assert response.json()["care_recipient_name"] == "Ah Ma"
    assert response.json()["scheme_answers"] is None


def test_onboarding_without_the_new_fields_still_works(client):
    response = client.post("/users", json=NEW_USER)
    assert response.status_code == 200, response.text
