"""Watch the official pages behind our Tier 1 schemes.

For each source URL in frontend/public/data/catalog.tier1.json: read the
page, keep only its visible text, hash it and compare with the last run
(data/tier1_sources.json).

- Pages are fetched plainly first. A page that comes back without real
  content (rendered with JavaScript, like IRAS and some CPF articles) is
  loaded again in a headless browser (Playwright with Chromium), when one is
  available, and compared the same way.
- Each page ends up "changed", "unchanged", "new" (read for the first time,
  nothing to compare yet) or "unreadable" (couldn't read this week). Not
  being able to read a page is never the same as it being unchanged, and
  never fails the sync.
- A Tier 1 scheme's lastChecked moves to the run date only when every one of
  its sources was read and is unchanged. docs/schemes/tier1-schemes.md is
  never edited here: a person updates it after reviewing a change.

Standard library only, apart from the optional browser (Playwright).
"""

import contextlib
import hashlib
import re
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Callable, Dict, Iterator, List, Optional, Tuple

# Below this much visible text a page is treated as an empty shell
MIN_CONTENT_CHARS = 400
USER_AGENT = (
    "Mozilla/5.0 (compatible; CareCompassSourceWatch/1.0; "
    "+https://github.com/carecompassbfg-cell/carecompass)"
)
_JS_SHELL = re.compile(
    r"enable javascript|javascript (is )?(required|disabled)|requires javascript",
    re.IGNORECASE,
)

# Browser loading: wait for the DOM, then poll once a second until the visible
# text has real content and stopped changing. Analytics on these sites keep
# the network busy, so waiting for the network to go quiet never finishes.
BROWSER_GOTO_TIMEOUT_MS = 45_000
BROWSER_MAX_POLLS = 20

CHANGED = "changed"
UNCHANGED = "unchanged"
NEW = "new"
UNREADABLE = "unreadable"

Fetch = Callable[[str], Tuple[Optional[str], str]]

# Elements whose text is never visible
_SKIP_TAGS = {
    "script",
    "style",
    "noscript",
    "template",
    "svg",
    "head",
    "title",
    "iframe",
}
# Void elements never get an end tag (a browser writes <meta ...> without a
# closing slash), so they must not open a skipped region
_VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
}
# Page furniture that changes without the scheme changing
_FURNITURE_TAGS = {"nav", "header", "footer"}


class _VisibleText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip_depth = 0
        self._furniture_depth = 0
        self._main_depth = 0
        self.all_text: List[str] = []
        self.main_text: List[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _VOID_TAGS:
            return
        if tag in _SKIP_TAGS:
            self._skip_depth += 1
        elif tag in _FURNITURE_TAGS:
            self._furniture_depth += 1
        elif tag == "main" or (tag == "div" and ("role", "main") in attrs):
            self._main_depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1
        elif tag in _FURNITURE_TAGS and self._furniture_depth:
            self._furniture_depth -= 1
        elif tag == "main" and self._main_depth:
            self._main_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth or self._furniture_depth:
            return
        self.all_text.append(data)
        if self._main_depth:
            self.main_text.append(data)


def visible_text(html: str) -> str:
    """The page's visible text, whitespace collapsed. Uses <main> when the
    page has one, so menus and footers don't count as changes."""
    parser = _VisibleText()
    parser.feed(html)
    parser.close()
    chunks = parser.main_text or parser.all_text
    return " ".join(" ".join(chunks).split())


def has_real_content(text: str) -> bool:
    if len(text) < MIN_CONTENT_CHARS:
        return False
    # A short page that mostly asks for JavaScript is a shell
    return not (_JS_SHELL.search(text) and len(text) < MIN_CONTENT_CHARS * 3)


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------


def fetch_page(url: str, sleep: Callable[[float], None] = time.sleep) -> Tuple[Optional[str], str]:
    """Plain HTTP fetch. Returns (html, note); html is None when the page
    can't be read."""
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"}
    )
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                content_type = response.headers.get("Content-Type", "")
                if "html" not in content_type.lower():
                    return None, f"not an HTML page ({content_type or 'unknown type'})"
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, errors="replace"), "ok"
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 502, 503, 504) and attempt < 3:
                sleep(2**attempt)
                continue
            return None, f"HTTP {error.code}"
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            if attempt < 3:
                sleep(2**attempt)
                continue
            return None, f"could not connect ({type(error).__name__})"
    return None, "could not fetch"  # pragma: no cover


@contextlib.contextmanager
def browser_fetcher() -> Iterator[Optional[Fetch]]:
    """A headless Chromium page loader, or None when Playwright or the
    browser isn't installed. Never raises."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        yield None
        return
    try:
        manager = sync_playwright().start()
    except Exception:  # noqa: BLE001 - the browser is optional
        yield None
        return
    browser = None
    try:
        try:
            browser = manager.chromium.launch()
        except Exception:  # noqa: BLE001
            yield None
            return

        def render(url: str) -> Tuple[Optional[str], str]:
            context = browser.new_context()
            try:
                page = context.new_page()
                response = page.goto(
                    url, wait_until="domcontentloaded", timeout=BROWSER_GOTO_TIMEOUT_MS
                )
                if response is not None and response.status >= 400:
                    return None, f"HTTP {response.status} in the browser"
                last = None
                for _ in range(BROWSER_MAX_POLLS):
                    page.wait_for_timeout(1000)
                    html = page.content()
                    text = visible_text(html)
                    if has_real_content(text) and text == last:
                        return html, "ok"
                    last = text
                return None, "no real content, even in a browser"
            except Exception as error:  # noqa: BLE001
                return None, f"the browser couldn't load it ({type(error).__name__})"
            finally:
                context.close()

        yield render
    finally:
        if browser is not None:
            with contextlib.suppress(Exception):
                browser.close()
        with contextlib.suppress(Exception):
            manager.stop()


# ---------------------------------------------------------------------------
# Watching
# ---------------------------------------------------------------------------


def check_page(html: Optional[str], note: str) -> Dict[str, object]:
    """One fetched page: read (with a hash of its visible text), or not."""
    if html is None:
        return {"read": False, "note": note}
    text = visible_text(html)
    if not has_real_content(text):
        return {"read": False, "note": "no real content without JavaScript"}
    return {"read": True, "hash": text_hash(text), "chars": len(text)}


def read_page(url: str, fetch: Fetch, render: Optional[Fetch]) -> Dict[str, object]:
    """Plain fetch first; a headless browser only for pages that need one."""
    page = check_page(*fetch(url))
    if page["read"]:
        page["via"] = "fetch"
        return page
    if render is None:
        if page["note"] == "no real content without JavaScript":
            page["note"] += "; no browser available"
        return page
    rendered = check_page(*render(url))
    if rendered["read"]:
        rendered["via"] = "browser"
        return rendered
    return {"read": False, "note": f"{page['note']}; in a browser: {rendered['note']}"}


def tier1_source_urls(catalog: List[dict]) -> List[Tuple[str, str]]:
    """(url, scheme name) for every source, each URL once, in catalog order."""
    seen = set()
    urls = []
    for scheme in catalog:
        for source in scheme.get("sources", []):
            url = source.get("url")
            if url and url not in seen:
                seen.add(url)
                urls.append((url, scheme.get("name", "")))
    return urls


def page_status(before: Optional[dict], page: dict) -> str:
    if not page["read"]:
        return UNREADABLE
    if not before or not before.get("hash"):
        return NEW
    return UNCHANGED if before["hash"] == page["hash"] else CHANGED


def compare(previous: Dict[str, dict], current: Dict[str, dict]) -> Dict[str, List[dict]]:
    """Pages grouped by status between two runs."""
    groups: Dict[str, List[dict]] = {CHANGED: [], UNCHANGED: [], NEW: [], UNREADABLE: []}
    for url, page in current.items():
        groups[page_status(previous.get(url), page)].append({"url": url, **page})
    return groups


def watch(
    catalog: List[dict],
    previous: Dict[str, dict],
    checked_on: str,
    fetch: Fetch = fetch_page,
    render: Optional[Fetch] = None,
) -> Tuple[Dict[str, dict], Dict[str, List[dict]]]:
    """Read every Tier 1 source. Returns (new state, pages by status)."""
    current: Dict[str, dict] = {}
    for url, scheme_name in tier1_source_urls(catalog):
        page = read_page(url, fetch, render)
        page["scheme"] = scheme_name
        before = previous.get(url, {})
        if page["read"]:
            page["lastReadOn"] = checked_on
        elif before.get("hash"):
            # Keep the last good copy, so a page we couldn't read this week
            # is compared against it next week rather than looking new
            page["hash"] = before["hash"]
            page["lastReadOn"] = before.get("lastReadOn") or before.get("lastWatchedOn")
        current[url] = page
    return current, compare(previous, current)


# ---------------------------------------------------------------------------
# Tier 1 "Last checked" dates
# ---------------------------------------------------------------------------

_REASONS = {
    CHANGED: "changed",
    UNREADABLE: "couldn't read this week",
    NEW: "read for the first time, nothing to compare with yet",
}


def update_last_checked(
    catalog: List[dict], groups: Dict[str, List[dict]], run_date: str
) -> Tuple[List[dict], List[dict], List[dict]]:
    """Move lastChecked to run_date for every Tier 1 scheme whose sources were
    all read and unchanged. Returns (new catalog, moved, to re-check).

    The catalog is copied, never edited in place, and a date never moves
    backwards.
    """
    status_by_url = {
        page["url"]: status for status, pages in groups.items() for page in pages
    }
    notes = {page["url"]: page.get("note") for page in groups.get(UNREADABLE, [])}
    updated, moved, recheck = [], [], []
    for scheme in catalog:
        scheme = dict(scheme)
        urls = [s["url"] for s in scheme.get("sources", []) if s.get("url")]
        problems = [
            {
                "url": url,
                "status": status_by_url.get(url, UNREADABLE),
                "reason": _REASONS[status_by_url.get(url, UNREADABLE)],
                "note": notes.get(url),
            }
            for url in urls
            if status_by_url.get(url, UNREADABLE) != UNCHANGED
        ]
        if urls and not problems:
            if (scheme.get("lastChecked") or "") < run_date:
                moved.append({"name": scheme.get("name"), "from": scheme.get("lastChecked")})
                scheme["lastChecked"] = run_date
        else:
            recheck.append(
                {
                    "name": scheme.get("name"),
                    "lastChecked": scheme.get("lastChecked"),
                    "problems": problems,
                }
            )
        updated.append(scheme)
    return updated, moved, recheck


# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------


def render_section(
    groups: Dict[str, List[dict]],
    moved: List[dict],
    recheck: List[dict],
    run_date: str,
) -> List[str]:
    """Markdown for the sync report (and so the sync PR body)."""
    total = sum(len(pages) for pages in groups.values())
    via_browser = sum(
        1 for status in (CHANGED, UNCHANGED, NEW) for p in groups[status] if p.get("via") == "browser"
    )
    lines = [
        "## Tier 1 official pages",
        "",
        f"Read {total} official pages behind our core schemes: "
        f"{len(groups[UNCHANGED])} unchanged, {len(groups[CHANGED])} changed, "
        f"{len(groups[NEW])} read for the first time, "
        f"{len(groups[UNREADABLE])} couldn't be read. "
        f"{via_browser} needed a headless browser.",
        "",
        "### Changed. Re-check docs/schemes/tier1-schemes.md",
        "",
    ]
    lines += [f"- {p['url']} ({p['scheme']})" for p in groups[CHANGED]] or ["None."]
    lines += [
        "",
        "### Couldn't read this week",
        "",
        "Not the same as unchanged: these pages weren't compared, so their "
        "schemes' dates don't move.",
        "",
    ]
    lines += [
        f"- {p['url']} ({p['scheme']}): {p.get('note')}" for p in groups[UNREADABLE]
    ] or ["None."]
    lines += ["", "### Re-check before the date can move", ""]
    if recheck:
        for item in recheck:
            lines.append(f"- **{item['name']}** (last checked {item['lastChecked']})")
            lines += [f"  - {p['url']}: {p['reason']}" for p in item["problems"]]
    else:
        lines.append("None.")
    lines += ["", f"### Last checked moved to {run_date}", ""]
    lines += [
        f"- {m['name']} (was {m['from']})" for m in moved
    ] or ["None."]
    lines.append("")
    return lines
