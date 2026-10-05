import builtins
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
    {
        "id": "HOME-CAREGIVING-GRANT",
        "name": "Home Caregiving Grant",
        "lastChecked": "2026-09-30",
        "sources": [{"name": "AIC", "url": HCG}],
    },
    {
        "id": "PARENT-RELIEF",
        "name": "Parent Relief",
        "lastChecked": "2026-09-30",
        "sources": [{"name": "IRAS", "url": IRAS}, {"name": "AIC", "url": HCG}],
    },
]


def fake(pages):
    """A fetcher over saved HTML fixtures; a tuple value is returned as is."""

    def fetch(url):
        value = pages[url]
        if isinstance(value, tuple):
            return value
        return page(value), "ok"

    return fetch


PLAIN = {HCG: "aic_page.html", IRAS: "js_shell.html"}
BROWSER = fake({IRAS: "js_rendered.html", HCG: "aic_page.html"})


def urls(pages):
    return [p["url"] for p in pages]


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


def test_browser_html_with_unclosed_meta_tags_keeps_its_text():
    # A browser writes <meta ...>, <link ...> and <img ...> with no closing
    # slash; they must not hide the rest of the page
    text = w.visible_text(page("js_rendered.html"))
    assert w.has_real_content(text)
    assert text.startswith("Parent Relief / Parent Relief (Disability)")
    assert "Copyright" not in text and "Individuals |" not in text


# --- reading pages -----------------------------------------------------------


def test_source_urls_are_listed_once():
    assert w.tier1_source_urls(CATALOG) == [
        (HCG, "Home Caregiving Grant"),
        (IRAS, "Parent Relief"),
    ]


def test_javascript_pages_are_read_in_a_browser_and_others_plainly():
    rendered = []

    def render(url):
        rendered.append(url)
        return BROWSER(url)

    state, groups = w.watch(CATALOG, {}, "2026-10-01", fetch=fake(PLAIN), render=render)
    assert rendered == [IRAS]
    assert state[HCG]["via"] == "fetch" and state[IRAS]["via"] == "browser"
    assert urls(groups[w.NEW]) == [HCG, IRAS]
    assert groups[w.UNREADABLE] == []


def test_without_a_browser_javascript_pages_are_unreadable():
    _, groups = w.watch(CATALOG, {}, "2026-10-01", fetch=fake(PLAIN), render=None)
    [iras] = groups[w.UNREADABLE]
    assert iras["url"] == IRAS
    assert iras["note"] == "no real content without JavaScript; no browser available"


def test_a_page_the_browser_cannot_load_is_unreadable():
    failing = fake({IRAS: (None, "the browser couldn't load it (TimeoutError)")})
    _, groups = w.watch(CATALOG, {}, "2026-10-01", fetch=fake(PLAIN), render=failing)
    [iras] = groups[w.UNREADABLE]
    assert "in a browser: the browser couldn't load it (TimeoutError)" in iras["note"]


def test_changed_and_unchanged_pages():
    first, _ = w.watch(CATALOG, {}, "2026-10-01", fetch=fake(PLAIN), render=BROWSER)
    _, same = w.watch(
        CATALOG, first, "2026-10-08",
        fetch=fake({HCG: "aic_page_furniture_changed.html", IRAS: "js_shell.html"}),
        render=BROWSER,
    )
    _, changed = w.watch(
        CATALOG, first, "2026-10-08",
        fetch=fake({HCG: "aic_page_changed.html", IRAS: "js_shell.html"}),
        render=BROWSER,
    )
    assert urls(same[w.UNCHANGED]) == [HCG, IRAS] and same[w.CHANGED] == []
    assert urls(changed[w.CHANGED]) == [HCG] and urls(changed[w.UNCHANGED]) == [IRAS]


def test_an_unreadable_page_is_not_unchanged_and_keeps_its_last_good_copy():
    first, _ = w.watch(CATALOG, {}, "2026-10-01", fetch=fake(PLAIN), render=BROWSER)
    down, groups = w.watch(
        CATALOG, first, "2026-10-08",
        fetch=fake({HCG: (None, "HTTP 503"), IRAS: (None, "HTTP 403")}),
        render=fake({IRAS: (None, "HTTP 403 in the browser"), HCG: (None, "HTTP 503")}),
    )
    assert groups[w.CHANGED] == [] and groups[w.UNCHANGED] == []
    assert urls(groups[w.UNREADABLE]) == [HCG, IRAS]
    assert down[HCG]["hash"] == first[HCG]["hash"]
    assert down[HCG]["lastReadOn"] == "2026-10-01"
    _, back = w.watch(CATALOG, down, "2026-10-15", fetch=fake(PLAIN), render=BROWSER)
    assert urls(back[w.UNCHANGED]) == [HCG, IRAS]


def test_non_html_pages_cannot_be_read():
    assert w.check_page(None, "not an HTML page (application/pdf)") == {
        "read": False,
        "note": "not an HTML page (application/pdf)",
    }


def test_browser_fetcher_is_none_without_playwright(monkeypatch):
    real_import = builtins.__import__

    def no_playwright(name, *args, **kwargs):
        if name.startswith("playwright"):
            raise ImportError(name)
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", no_playwright)
    with w.browser_fetcher() as render:
        assert render is None


# --- Last checked dates ------------------------------------------------------


def groups_for(**statuses):
    groups = {w.CHANGED: [], w.UNCHANGED: [], w.NEW: [], w.UNREADABLE: []}
    for url, status in statuses.items():
        groups[status].append({"url": {"hcg": HCG, "iras": IRAS}[url], "note": "HTTP 403"})
    return groups


def test_dates_move_when_every_source_was_read_and_unchanged():
    updated, moved, recheck = w.update_last_checked(
        CATALOG, groups_for(hcg=w.UNCHANGED, iras=w.UNCHANGED), "2026-10-05"
    )
    assert [s["lastChecked"] for s in updated] == ["2026-10-05", "2026-10-05"]
    assert [m["name"] for m in moved] == ["Home Caregiving Grant", "Parent Relief"]
    assert recheck == []
    # The input catalog is not edited in place
    assert CATALOG[0]["lastChecked"] == "2026-09-30"


def test_a_changed_or_unreadable_source_holds_the_date():
    for status, reason in (
        (w.CHANGED, "changed"),
        (w.UNREADABLE, "couldn't read this week"),
        (w.NEW, "read for the first time, nothing to compare with yet"),
    ):
        updated, moved, recheck = w.update_last_checked(
            CATALOG, groups_for(hcg=w.UNCHANGED, iras=status), "2026-10-05"
        )
        assert [s["lastChecked"] for s in updated] == ["2026-10-05", "2026-09-30"]
        assert [m["name"] for m in moved] == ["Home Caregiving Grant"]
        [item] = recheck
        assert item["name"] == "Parent Relief"
        assert item["problems"] == [
            {
                "url": IRAS,
                "status": status,
                "reason": reason,
                "note": "HTTP 403" if status == w.UNREADABLE else None,
            }
        ]


def test_a_changed_shared_source_holds_every_scheme_using_it():
    updated, moved, recheck = w.update_last_checked(
        CATALOG, groups_for(hcg=w.CHANGED, iras=w.UNCHANGED), "2026-10-05"
    )
    assert moved == []
    assert [r["name"] for r in recheck] == ["Home Caregiving Grant", "Parent Relief"]


def test_a_date_never_moves_backwards():
    later = [{**CATALOG[0], "lastChecked": "2026-10-20"}]
    updated, moved, _ = w.update_last_checked(
        later, groups_for(hcg=w.UNCHANGED), "2026-10-05"
    )
    assert updated[0]["lastChecked"] == "2026-10-20" and moved == []


# --- report and PR -----------------------------------------------------------


def watched(fetch_pages, previous=None, date="2026-10-08", render=BROWSER):
    state, groups = w.watch(CATALOG, previous or {}, date, fetch=fake(fetch_pages), render=render)
    _, moved, recheck = w.update_last_checked(CATALOG, groups, date)
    return state, {"groups": groups, "moved": moved, "recheck": recheck}


def test_report_sections():
    first, _ = watched(PLAIN, date="2026-10-01")
    _, watch = watched({HCG: "aic_page_changed.html", IRAS: "js_shell.html"}, first)
    text = "\n".join(w.render_section(watch["groups"], watch["moved"], watch["recheck"], "2026-10-08"))
    assert "Read 2 official pages behind our core schemes: 1 unchanged, 1 changed" in text
    assert "1 needed a headless browser" in text
    assert "### Changed. Re-check docs/schemes/tier1-schemes.md" in text
    assert f"- {HCG} (Home Caregiving Grant)" in text
    assert "### Re-check before the date can move" in text
    assert "- **Parent Relief** (last checked 2026-09-30)" in text
    assert f"  - {HCG}: changed" in text
    assert "### Last checked moved to 2026-10-08\n\nNone." in text


def test_unreadable_pages_are_listed_separately():
    first, _ = watched(PLAIN, date="2026-10-01")
    _, watch = watched(
        {HCG: (None, "HTTP 503"), IRAS: "js_shell.html"}, first,
        render=fake({HCG: (None, "HTTP 503 in the browser"), IRAS: "js_rendered.html"}),
    )
    text = "\n".join(w.render_section(watch["groups"], watch["moved"], watch["recheck"], "2026-10-08"))
    assert "### Couldn't read this week" in text
    assert f"- {HCG} (Home Caregiving Grant): HTTP 503; in a browser: HTTP 503 in the browser" in text
    assert f"  - {HCG}: couldn't read this week" in text


def test_pr_title_says_when_only_dates_moved():
    raws = [make_raw()]
    first = sync.run(raws, raws, [], OVERRIDES, None, "2026-10-01", "prod")
    baseline, _ = watched(PLAIN, date="2026-10-01")
    _, quiet_watch = watched(PLAIN, baseline)
    quiet = sync.run(raws, raws, [], OVERRIDES, first["state"], "2026-10-08", "prod",
                     source_watch=quiet_watch)
    _, changed_watch = watched({HCG: "aic_page_changed.html", IRAS: "js_shell.html"}, baseline)
    changed = sync.run(raws, raws, [], OVERRIDES, first["state"], "2026-10-08", "prod",
                       source_watch=changed_watch)

    assert quiet["title"] == "Schemes.sg weekly sync: no content changes (dates only)"
    assert "**No content changes.**" in quiet["report"]
    assert "- Parent Relief (was 2026-09-30)" in quiet["report"]

    assert changed["title"] == "Schemes.sg weekly sync: changes to review"
    assert f"- {HCG} (Home Caregiving Grant)" in changed["report"]


def test_an_unreadable_page_alone_is_still_dates_only():
    raws = [make_raw()]
    first = sync.run(raws, raws, [], OVERRIDES, None, "2026-10-01", "prod")
    baseline, _ = watched(PLAIN, date="2026-10-01")
    # Neither a plain fetch nor the browser can read IRAS this week
    _, watch = watched(
        {HCG: "aic_page.html", IRAS: (None, "HTTP 403")}, baseline,
        render=fake({IRAS: (None, "HTTP 403 in the browser")}),
    )
    assert [p["url"] for p in watch["groups"][w.UNREADABLE]] == [IRAS]
    result = sync.run(raws, raws, [], OVERRIDES, first["state"], "2026-10-08", "prod",
                      source_watch=watch)
    assert result["title"].endswith("(dates only)")
    recheck = result["report"].split("### Re-check before the date can move")[1]
    assert (
        f"- **Parent Relief** (last checked 2026-09-30)\n  - {IRAS}: couldn't read this week"
        in recheck
    )
    assert "- Home Caregiving Grant (was 2026-09-30)" in result["report"]


def test_switching_environment_is_a_content_change():
    raws = [make_raw()]
    dev = sync.run(raws, raws, [], OVERRIDES, None, "2026-10-01", "dev")
    prod = sync.run(raws, raws, [], OVERRIDES, dev["state"], "2026-10-05", "prod")
    assert prod["has_changes"]
    assert "Compared with the last run from the **dev** environment." in prod["report"]
