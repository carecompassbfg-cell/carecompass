"""Bookmark API and migration tests against a local Postgres (see conftest.py).

Covers saving schemes (string ids) alongside care services (integer ids).
"""

from pathlib import Path

import pytest
from sqlalchemy import text

from conftest import requires_db

pytestmark = requires_db

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_CLERK_ID = "test-clerk-user-bookmarks"
NEW_USER = {
    "citizenship": "CITIZEN",
    "care_recipient_age": 78,
    "care_recipient_citizenship": "CITIZEN",
    "care_recipient_residence": "HOME",
    "care_recipient_relationship": "PARENT",
}
SCHEME = {
    "target_type": "SCHEME",
    "target_key": "HOME-CAREGIVING-GRANT",
    "title": "Home Caregiving Grant",
    "link": "/dashboard/schemes?id=HOME-CAREGIVING-GRANT",
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
            text("DELETE FROM bookmarks WHERE user_id = :id"), {"id": TEST_CLERK_ID}
        )
        connection.execute(
            text("DELETE FROM users WHERE clerk_id = :id"), {"id": TEST_CLERK_ID}
        )
    app.dependency_overrides[get_current_user_clerk_id] = lambda: TEST_CLERK_ID
    test_client = TestClient(app)
    assert test_client.post("/users", json=NEW_USER).status_code == 200
    yield test_client
    app.dependency_overrides.clear()


def test_save_list_and_remove_a_scheme(client):
    created = client.post("/bookmarks", json=SCHEME)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["targetKey"] == "HOME-CAREGIVING-GRANT"
    assert body["targetId"] is None

    found = client.get(
        "/bookmarks",
        params={"target_type": "SCHEME", "target_key": "HOME-CAREGIVING-GRANT"},
    )
    assert [b["id"] for b in found.json()] == [body["id"]]

    other = client.get(
        "/bookmarks", params={"target_type": "SCHEME", "target_key": "PARENT-RELIEF"}
    )
    assert other.json() == []

    assert client.delete(f"/bookmarks/{body['id']}").status_code == 204
    assert client.get("/bookmarks").json() == []


def test_care_service_bookmarks_still_work(client):
    created = client.post(
        "/bookmarks",
        json={
            "target_type": "CARESERVICE::DEMENTIA_DAY_CARE",
            "target_id": 111,
            "title": "A centre",
            "link": "/careservice/dementia-daycare/111",
        },
    )
    assert created.status_code == 201, created.text
    found = client.get(
        "/bookmarks",
        params={"target_type": "CARESERVICE::DEMENTIA_DAY_CARE", "target_id": 111},
    )
    assert len(found.json()) == 1


def test_target_must_match_type(client):
    no_key = {**SCHEME, "target_key": None}
    assert client.post("/bookmarks", json=no_key).status_code == 422
    no_id = {
        "target_type": "CARESERVICE::DEMENTIA_HOME_CARE",
        "title": "x",
        "link": "/x",
    }
    assert client.post("/bookmarks", json=no_id).status_code == 422


def test_schemes_cannot_be_reviewed(client):
    response = client.post(
        "/reviews",
        json={
            "review_source": "IN_APP",
            "target_type": "SCHEME",
            "target_id": 1,
            "overall_rating": 5,
        },
    )
    assert response.status_code == 422


def test_bookmark_migration_round_trip(alembic_config, engine, client):
    from alembic import command

    assert client.post("/bookmarks", json=SCHEME).status_code == 201
    command.downgrade(alembic_config, "e5f6a7b8c9d0")
    with engine.connect() as connection:
        columns = {
            row[0]: row[1]
            for row in connection.execute(
                text(
                    "SELECT column_name, is_nullable FROM information_schema.columns "
                    "WHERE table_name = 'bookmarks'"
                )
            )
        }
    assert "target_key" not in columns
    assert columns["target_id"] == "NO"
    command.upgrade(alembic_config, "head")
