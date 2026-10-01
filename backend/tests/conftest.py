"""Test setup.

Unit tests need nothing. The API/migration tests need a local Postgres:

    TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carecompass_test pytest

They refuse to run against anything that isn't localhost, so they can never
touch the live database. Without TEST_DATABASE_URL they are skipped.
"""

import os
from urllib.parse import urlparse

import pytest

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}

if TEST_DATABASE_URL:
    parsed = urlparse(TEST_DATABASE_URL)
    if parsed.hostname not in LOCAL_HOSTS:
        raise RuntimeError(
            "TEST_DATABASE_URL must point at a local Postgres (localhost), "
            "never a shared or live database"
        )
    # app.core.database builds its URL from these; set them before any app
    # import so nothing can fall back to another .env
    os.environ.update(
        {
            "DB_USER": parsed.username or "postgres",
            "DB_PASSWORD": parsed.password or "",
            "DB_HOST": parsed.hostname,
            "DB_PORT": str(parsed.port or 5432),
            "DB_NAME": parsed.path.lstrip("/"),
            "DB_SSLMODE": "disable",
        }
    )
else:
    # Unreachable placeholder so unit tests can import the app safely
    os.environ.update(
        {
            "DB_USER": "unused",
            "DB_PASSWORD": "unused",
            "DB_HOST": "127.0.0.1",
            "DB_PORT": "1",
            "DB_NAME": "unused",
            "DB_SSLMODE": "disable",
        }
    )

# Dummy values for settings the app reads at import time
os.environ.setdefault("DB_ENCRYPTION_SECRET", "test-encryption-secret")
os.environ.setdefault("OPENAI_API_KEY", "test-key-not-used")
os.environ["SENTRY_DSN"] = ""

requires_db = pytest.mark.skipif(
    not TEST_DATABASE_URL, reason="set TEST_DATABASE_URL to a local Postgres"
)
