from pathlib import Path

import sync
import watch_sources as w
from conftest import make_raw
from test_catalog import OVERRIDES

PAGES = Path(__file__).parent / "fixtures" / "source_pages"


def page(name: str) -> str:
    return (PAGES / name).read_text(encoding="utf-8")


HCG = "https://www.aic.sg/financial-assistance/home-caregiving-grant/"
IRAS = "https://www.iras.gov.sg/parent-relief"
CATALOG = [
    {"name": "Home Caregiving Grant", "sources": [{"name": "AIC", "url": HCG}]},
    {
        "name": "Parent Relief",
        "sources": [{"name": "IRAS", "url": IRAS}, {"name": "AIC", "url": HCG}],
    },
]


def fake_fetch(pages):
    def fetch(url):
        value = pages[url]
        if isinstance(value, tuple):
            return value
        return page(value), "ok"

    return fetch


# --- visible text --------------------------------------------------------------


def test_visible_text_drops_scripts_styles_and_page_furniture():
    text = w.visible_text(page("aic_page.html"))
    assert "Home Caregiving Grant" in text
    assert "$600 a month" in text
    for hidden in ("analytics", "trackView", "font-family", "Copyright", "Financial assistance |"):
        assert hidden not in text


def test_hash_ignores_whitespace_menus_and_footers():
    same = w.text_hash(w.visible_text(page("aic_page.html")))
    assert w.text_hash(w.visible_text(page("aic_page_furniture_changed.html"))) == same


def test_hash_changes_when_the_content_changes():
    before = w.text_hash(w.visible_text(page("aic_page.html")))
    after = w.text_hash(w.visible_text(page("aic_page_changed.html")))
    assert before != after


def test_javascript_shell_has_no_real_content():
    assert not w.has_real_content(w.visible_text(page("js_shell.html")))
    assert w.has_real_content(w.visible_text(page("aic_page.html")))


# --- watching ----------------------------------------------------------------


def test_source_urls_are_listed_once():
    assert w.tier1_source_urls(CATALOG) == [
        (HCG, "Home Caregiving Grant"),
        (IRAS, "Parent Relief"),
    ]


def test_first_run_records_a_baseline_and_lists_pages_it_cannot_watch():
    state, result = w.watch(
        CATALOG, {}, "2026-10-01",
        fetch=fake_fetch({HCG: "aic_page.html", IRAS: "js_shell.html"}),
    )
    assert result["changed"] == []
    assert [p["url"] for p in result["new"]] == [HCG]
    assert [p["url"] for p in result["unwatchable"]] == [IRAS]
    assert state[HCG]["watchable"] and state[HCG]["lastWatchedOn"] == "2026-10-01"
    assert not state[IRAS]["watchable"]


def test_a_changed_page_is_reported():
    first, _ = w.watch(CATALOG, {}, "2026-10-01",
                       fetch=fake_fetch({HCG: "aic_page.html", IRAS: "js_shell.html"}))
    _, same = w.watch(CATALOG, first, "2026-10-08",
                      fetch=fake_fetch({HCG: "aic_page_furniture_changed.html", IRAS: "js_shell.html"}))
    _, changed = w.watch(CATALOG, first, "2026-10-08",
                         fetch=fake_fetch({HCG: "aic_page_changed.html", IRAS: "js_shell.html"}))
    assert same["changed"] == []
    assert [p["url"] for p in changed["changed"]] == [HCG]


def test_a_failed_fetch_does_not_fail_or_look_like_a_change():
    first, _ = w.watch(CATALOG, {}, "2026-10-01",
                       fetch=fake_fetch({HCG: "aic_page.html", IRAS: "js_shell.html"}))
    down, result = w.watch(CATALOG, first, "2026-10-08",
                           fetch=fake_fetch({HCG: (None, "HTTP 503"), IRAS: (None, "HTTP 403")}))
    assert result["changed"] == []
    assert {p["note"] for p in result["unwatchable"]} == {"HTTP 503", "HTTP 403"}
    # Keeps the last good hash so next week compares against it
    assert down[HCG]["hash"] == first[HCG]["hash"]
    _, back = w.watch(CATALOG, down, "2026-10-15",
                      fetch=fake_fetch({HCG: "aic_page.html", IRAS: "js_shell.html"}))
    assert back["changed"] == []


def test_non_html_pages_cannot_be_watched():
    result = w.check_page(None, "not an HTML page (application/pdf)")
    assert result == {"watchable": False, "note": "not an HTML page (application/pdf)"}


# --- report ------------------------------------------------------------------


def test_report_sections():
    first, _ = w.watch(CATALOG, {}, "2026-10-01",
                       fetch=fake_fetch({HCG: "aic_page.html", IRAS: "js_shell.html"}))
    _, result = w.watch(CATALOG, first, "2026-10-08",
                        fetch=fake_fetch({HCG: "aic_page_changed.html", IRAS: "js_shell.html"}))
    text = "\n".join(w.render_section(result))
    assert "## Tier 1 sources that changed. Re-check docs/schemes/tier1-schemes.md" in text
    assert f"- {HCG} (Home Caregiving Grant)" in text
    assert "## Can't watch automatically. Check by hand twice a year" in text
    assert f"- {IRAS} (Parent Relief): no real content without JavaScript" in text


def test_a_changed_source_alone_opens_a_sync_pr():
    raws = [make_raw()]
    first = sync.run(raws, raws, [], OVERRIDES, None, "2026-10-01", "dev")
    quiet = sync.run(raws, raws, [], OVERRIDES, first["state"], "2026-10-08", "dev",
                     source_watch={"changed": [], "unwatchable": [], "new": []})
    changed = sync.run(raws, raws, [], OVERRIDES, first["state"], "2026-10-08", "dev",
                       source_watch={"changed": [{"url": HCG, "scheme": "HCG"}],
                                     "unwatchable": [], "new": []})
    assert not quiet["has_changes"]
    assert changed["has_changes"]
    assert f"- {HCG} (HCG)" in changed["report"]
