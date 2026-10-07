import copy
import json

import pytest

import sync
import zh_status as z
from conftest import make_raw
from test_catalog import OVERRIDES

# The same vectors are checked in frontend/src/util/catalogTranslation.test.ts,
# so the Python and browser hashes can't drift apart.
SCHEME = {
    "id": "X",
    "name": "Home Caregiving Grant",
    "agency": "AIC",
    "summary": 'Monthly cash.\nLine "two"',
    "whatYouGet": ["$600 a month", "护联局"],
    "valueText": None,
    "link": "https://example.sg",
}


def test_fnv1a32_known_values():
    assert z.fnv1a32("") == "811c9dc5"
    assert z.fnv1a32("a") == "e40c292c"
    assert z.fnv1a32("居家看护津贴 $600") == "d0856d28"


def test_canonical_text_and_hash():
    assert z.canonical_text(SCHEME) == (
        '{"name":"Home Caregiving Grant","agency":"AIC",'
        '"summary":"Monthly cash.\\nLine \\"two\\"","description":null,'
        '"whatYouGet":["$600 a month","护联局"],"valueText":null,'
        '"eligibility":null,"nextSteps":null}'
    )
    assert z.source_hash(SCHEME) == "6d692190"


def test_hash_ignores_non_text_fields():
    moved = dict(SCHEME, link="https://other.sg", lastRefreshed="2026-10-06")
    assert z.source_hash(moved) == z.source_hash(SCHEME)


def test_check_groups_ok_missing_stale_orphaned():
    catalog = [
        SCHEME,
        dict(SCHEME, id="CHANGED", summary="New English"),
        dict(SCHEME, id="NEW"),
    ]
    overlay = {
        "X": {"_en": z.source_hash(SCHEME), "name": "居家看护津贴"},
        "CHANGED": {"_en": z.source_hash(SCHEME), "name": "旧的翻译"},
        "GONE": {"_en": "00000000", "name": "已删除"},
    }
    groups = z.check(catalog, overlay)
    assert [i["id"] for i in groups[z.OK]] == ["X"]
    assert [i["id"] for i in groups[z.STALE]] == ["CHANGED"]
    assert [i["id"] for i in groups[z.MISSING]] == ["NEW"]
    assert [i["id"] for i in groups["orphaned"]] == ["GONE"]


def test_check_treats_bad_overlay_as_missing():
    assert [i["id"] for i in z.check([SCHEME], None)[z.MISSING]] == ["X"]
    assert [i["id"] for i in z.check([SCHEME], {"X": "oops"})[z.MISSING]] == ["X"]


def test_render_section_lists_problems():
    lines = "\n".join(
        z.render_section(
            [
                ("Tier 1", z.check([SCHEME], {"X": {"_en": "stale"}})),
                ("Schemes.sg", None),
            ]
        )
    )
    assert "## Chinese translations" in lines
    assert "Tier 1**: 0 of 1 translated" in lines
    assert "English changed since translating (showing English): `X`" in lines
    assert "Schemes.sg**: couldn't read the translation file" in lines


def test_stamp_records_current_hash(tmp_path, monkeypatch):
    catalog_path = tmp_path / "catalog.json"
    overlay_path = tmp_path / "catalog.zh.json"
    catalog_path.write_text(json.dumps([SCHEME]), encoding="utf-8")
    overlay_path.write_text(json.dumps({"X": {"_en": "old", "name": "新"}}), encoding="utf-8")
    monkeypatch.setattr(z, "CATALOGS", [("Test", catalog_path, overlay_path)])
    assert z.main(["--stamp", "X"]) == 0
    saved = json.loads(overlay_path.read_text(encoding="utf-8"))
    assert saved["X"] == {"_en": z.source_hash(SCHEME), "name": "新"}
    assert z.main(["--stamp", "UNKNOWN"]) == 1


def test_sync_report_flags_stale_translation_after_english_changes():
    raws = [make_raw()]
    first = sync.run(raws, raws, [], OVERRIDES, None, "2026-09-29", "dev")
    published = first["catalog"]
    assert published, "the example scheme should be published"
    scheme_id = published[0]["id"]
    overlays = {
        "tier1_catalog": [],
        "tier1": {},
        "schemessg": {scheme_id: {"_en": z.source_hash(published[0]), "name": "示例"}},
    }
    same = sync.run(copy.deepcopy(raws), raws, [], OVERRIDES, first["state"],
                    "2026-10-06", "dev", zh_overlays=overlays)
    assert "Schemes.sg**: 1 of 1 translated and up to date" in same["report"]
    # A second run on the same day stays identical
    again = sync.run(copy.deepcopy(raws), raws, [], OVERRIDES, first["state"],
                     "2026-10-06", "dev", zh_overlays=overlays)
    assert again["report"] == same["report"]

    changed = [make_raw(summary="Monthly cash, now more.")]
    result = sync.run(changed, changed, [], OVERRIDES, first["state"],
                      "2026-10-06", "dev", zh_overlays=overlays)
    assert f"English changed since translating (showing English): `{scheme_id}`" in result["report"]
    assert any(scheme_id in line for line in result["zh_lines"])


@pytest.mark.parametrize("overlays", [None, {"tier1_catalog": [], "tier1": None, "schemessg": None}])
def test_sync_runs_without_translations(overlays):
    raws = [make_raw()]
    result = sync.run(raws, raws, [], OVERRIDES, None, "2026-09-29", "dev", zh_overlays=overlays)
    assert result["catalog"]
    if overlays is None:
        assert "## Chinese translations" not in result["report"]
    else:
        assert "couldn't read the translation file" in result["report"]


def test_committed_overlays_are_well_formed():
    """Only the shape is checked: missing, stale or orphaned translations are
    expected after a sync and must never block it (they're reported instead)."""
    for _, _, overlay_path in z.CATALOGS:
        if not overlay_path.exists():
            continue
        overlay = json.loads(overlay_path.read_text(encoding="utf-8"))
        assert isinstance(overlay, dict), overlay_path.name
        for entry in overlay.values():
            assert isinstance(entry.get("_en"), str) and len(entry["_en"]) == 8
            assert set(entry) - {"_en"} <= set(z.TEXT_FIELDS)
