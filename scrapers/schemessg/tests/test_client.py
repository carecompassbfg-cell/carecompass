import client as api
import sync

PROD = "https://asia-southeast1-schemessg.cloudfunctions.net/partner_api"


def test_default_is_production():
    assert api.DEFAULT_BASE_URL == PROD
    assert "dev" not in api.DEFAULT_BASE_URL


def test_base_url_with_or_without_v1():
    for value in (PROD, PROD + "/", PROD + "/v1", PROD + "/v1/", f"  {PROD}/v1 "):
        assert api.normalise_base_url(value) == PROD


def test_settings_default_to_prod(monkeypatch, tmp_path):
    monkeypatch.setattr(sync, "ENV_FILE", tmp_path / "missing.env")
    for name in ("SCHEMESSG_API_KEY", "SCHEMESSG_BASE_URL", "SCHEMESSG_ENV"):
        monkeypatch.delenv(name, raising=False)
    settings = sync.load_settings()
    assert settings["base_url"] == PROD
    assert settings["env"] == "prod"


def test_environment_wins_over_env_file(monkeypatch, tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text("SCHEMESSG_ENV=dev\nSCHEMESSG_BASE_URL=https://file.example\n")
    monkeypatch.setattr(sync, "ENV_FILE", env_file)
    monkeypatch.setenv("SCHEMESSG_ENV", "PROD")
    monkeypatch.delenv("SCHEMESSG_BASE_URL", raising=False)
    settings = sync.load_settings()
    assert settings["env"] == "prod"
    assert settings["base_url"] == "https://file.example"
