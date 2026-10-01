"""Watch the official pages behind our Tier 1 schemes.

For each source URL in frontend/public/data/catalog.tier1.json: fetch the
page, keep only its visible text, hash it and compare with the last run
(data/tier1_sources.json). A changed hash means docs/schemes/tier1-schemes.md
should be re-checked by hand. Pages that come back without real content
(rendered with JavaScript, blocked, not HTML) can't be watched this way and
are listed for a manual check instead. Nothing here fails the sync.

Standard library only.
"""

import hashlib
import re
import time
import urllib.error
import urllib.request
from html.parser import HTMLParser
from typing import Callable, Dict, List, Optional, Tuple

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

# Elements whose text is never visible
_SKIP_TAGS = {
    "script",
    "style",
    "noscript",
    "template",
    "svg",
    "head",
    "title",
    "meta",
    "iframe",
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


def fetch_page(url: str, sleep: Callable[[float], None] = time.sleep) -> Tuple[Optional[str], str]:
    """Returns (html, note). html is None when the page can't be read."""
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


def check_page(html: Optional[str], note: str) -> Dict[str, object]:
    """Classify one fetched page: watchable with a hash, or not."""
    if html is None:
        return {"watchable": False, "note": note}
    text = visible_text(html)
    if not has_real_content(text):
        return {
            "watchable": False,
            "note": "no real content without JavaScript",
        }
    return {"watchable": True, "hash": text_hash(text), "chars": len(text)}


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


def compare(
    previous: Dict[str, dict], current: Dict[str, dict]
) -> Dict[str, List[dict]]:
    """Changed, unwatchable and newly watched pages between two runs."""
    changed, unwatchable, new = [], [], []
    for url, page in current.items():
        if not page["watchable"]:
            unwatchable.append({"url": url, **page})
            continue
        before = previous.get(url)
        if not before or not before.get("hash"):
            new.append({"url": url, **page})
        elif before["hash"] != page["hash"]:
            changed.append({"url": url, **page})
    return {"changed": changed, "unwatchable": unwatchable, "new": new}


def watch(
    catalog: List[dict],
    previous: Dict[str, dict],
    checked_on: str,
    fetch: Callable[[str], Tuple[Optional[str], str]] = fetch_page,
) -> Tuple[Dict[str, dict], Dict[str, List[dict]]]:
    """Fetch every Tier 1 source. Returns (new state, comparison)."""
    current: Dict[str, dict] = {}
    for url, scheme_name in tier1_source_urls(catalog):
        html, note = fetch(url)
        page = check_page(html, note)
        page["scheme"] = scheme_name
        # Keep the last good hash for a page we couldn't read this time, so
        # a temporary failure doesn't look like a change next week
        if not page["watchable"] and previous.get(url, {}).get("hash"):
            page["hash"] = previous[url]["hash"]
            page["lastWatchedOn"] = previous[url].get("lastWatchedOn")
        if page["watchable"]:
            page["lastWatchedOn"] = checked_on
        current[url] = page
    return current, compare(previous, current)


def render_section(result: Dict[str, List[dict]]) -> List[str]:
    """Markdown for the sync report (and so the sync PR body)."""
    lines = ["## Tier 1 sources that changed. Re-check docs/schemes/tier1-schemes.md", ""]
    if result["changed"]:
        lines += [f"- {p['url']} ({p['scheme']})" for p in result["changed"]]
    else:
        lines.append("None.")
    lines.append("")
    if result["new"]:
        lines += [
            "Started watching (no earlier copy to compare): "
            + ", ".join(p["url"] for p in result["new"]),
            "",
        ]
    lines += ["## Can't watch automatically. Check by hand twice a year", ""]
    if result["unwatchable"]:
        lines += [
            f"- {p['url']} ({p['scheme']}): {p['note']}" for p in result["unwatchable"]
        ]
    else:
        lines.append("None.")
    lines.append("")
    return lines
