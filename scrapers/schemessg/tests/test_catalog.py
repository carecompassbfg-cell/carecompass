import copy

import pytest

import catalog as cat
import sync
from conftest import make_raw

OVERRIDES = {
    "tier1_matches": [
        {
            "tier1_id": "HOME-CAREGIVING-GRANT",
            "name": "Home Caregiving Grant (HCG)",
            "link": "https://www.aic.sg/financial-assistance/home-caregiving-grant",
        }
    ],
    "schemes": [],
}


def classify_all(raws, overrides=OVERRIDES, previous=None):
    records = [cat.classify_record(r, overrides) for r in raws]
    cat.assign_ids(records, previous or [])
    return records


# --- overrides ---------------------------------------------------------------


def test_tier1_match_by_link_even_if_name_differs():
    record = cat.classify_record(
        make_raw(
            scheme="HCG (renamed)",
            link="http://aic.sg/financial-assistance/home-caregiving-grant/",
        ),
        OVERRIDES,
    )
    assert record["status"] == cat.TIER1
    assert record["tier1Id"] == "HOME-CAREGIVING-GRANT"


def test_tier1_match_by_name_even_if_link_differs():
    record = cat.classify_record(
        make_raw(scheme="Home Caregiving Grant (HCG)", link="https://new.example/hcg"),
        OVERRIDES,
    )
    assert record["status"] == cat.TIER1


def test_tier1_is_never_published():
    records = classify_all([make_raw(scheme="Home Caregiving Grant (HCG)")])
    catalog_items, other_items = cat.build_outputs(records, "2026-09-29", "dev")
    assert catalog_items == [] and other_items == []


def test_override_exclude():
    overrides = {**OVERRIDES, "schemes": [
        {"match": {"name": "Example Caregiving Grant"}, "action": "exclude", "reason": "duplicate"}
    ]}
    record = cat.classify_record(make_raw(), overrides)
    assert record["status"] == cat.EXCLUDED
    assert "duplicate" in record["reason"]


def test_override_include_with_pay_for_publishes_unclassified():
    raw = make_raw(scheme="Community Fund", what_it_gives=["Financial assistance (general)"], summary="")
    assert cat.classify_record(raw, OVERRIDES)["status"] == cat.UNCLASSIFIED
    overrides = {**OVERRIDES, "schemes": [
        {
            "match": {"link": raw["link"]},
            "action": "include",
            "payFor": "monthly_payouts",
            "area": {"kind": "district", "name": "South West"},
        }
    ]}
    record = cat.classify_record(raw, overrides)
    assert record["status"] == cat.PUBLISHED
    assert record["payFor"] == "monthly_payouts"
    assert record["area"] == {"kind": "district", "name": "South West"}


def test_override_needs_every_given_key_to_match():
    overrides = {**OVERRIDES, "schemes": [
        {"match": {"name": "Example Caregiving Grant", "link": "https://other.example"}, "action": "exclude"}
    ]}
    assert cat.classify_record(make_raw(), overrides)["status"] == cat.PUBLISHED


# --- ids ---------------------------------------------------------------------


def test_new_ids_come_from_the_link():
    [record] = classify_all([make_raw()])
    assert record["id"] == "ssg-aic-example-grant"


def test_shared_links_get_name_suffixes():
    shared = "https://www.touch.org.sg/get-assistance/caregivers.html"
    records = classify_all([
        make_raw(scheme_id="1", scheme="TOUCH Caregivers Support", link=shared),
        make_raw(scheme_id="2", scheme="Caregiver Support Group", link=shared),
    ])
    ids = [r["id"] for r in records]
    assert len(set(ids)) == 2
    assert all(i.startswith("ssg-touch-caregivers-") for i in ids)


def test_ids_are_stable_across_environments_and_reordering():
    first = classify_all([
        make_raw(scheme_id="dev-1", scheme="Alpha Grant", link="https://a.sg/alpha"),
        make_raw(scheme_id="dev-2", scheme="Beta Grant", link="https://b.sg/beta"),
    ])
    previous = [cat.state_record(r) for r in first]
    # Production has different IDs and returns the schemes in another order
    second = classify_all(
        [
            make_raw(scheme_id="prod-9", scheme="Beta Grant", link="https://b.sg/beta"),
            make_raw(scheme_id="prod-8", scheme="Alpha Grant", link="https://a.sg/alpha"),
        ],
        previous=previous,
    )
    assert {r["normName"]: r["id"] for r in first} == {r["normName"]: r["id"] for r in second}


def test_id_survives_a_link_change_via_name():
    first = classify_all([make_raw(scheme="Alpha Grant", link="https://a.sg/old")])
    second = classify_all(
        [make_raw(scheme="Alpha Grant", link="https://a.sg/new")],
        previous=[cat.state_record(r) for r in first],
    )
    assert second[0]["id"] == first[0]["id"]


def test_id_survives_a_rename_via_link():
    first = classify_all([make_raw(scheme="Alpha Grant", link="https://a.sg/alpha")])
    second = classify_all(
        [make_raw(scheme="Alpha Grant (AG)", link="https://a.sg/alpha")],
        previous=[cat.state_record(r) for r in first],
    )
    assert second[0]["id"] == first[0]["id"]


def test_new_scheme_on_a_shared_link_does_not_steal_an_id():
    link = "https://a.sg/services"
    first = classify_all([make_raw(scheme="Alpha", link=link)])
    second = classify_all(
        [make_raw(scheme="Beta", link=link), make_raw(scheme="Alpha", link=link)],
        previous=[cat.state_record(r) for r in first],
    )
    by_name = {r["name"]: r["id"] for r in second}
    assert by_name["Alpha"] == first[0]["id"]
    assert by_name["Beta"] != first[0]["id"]


# --- outputs -----------------------------------------------------------------


def test_catalog_scheme_shape():
    [record] = classify_all([make_raw()])
    [item], _ = cat.build_outputs([record], "2026-09-29", "dev")
    assert item == {
        "id": "ssg-aic-example-grant",
        "source": "schemes_sg",
        "sourceId": "abc123",
        "tier": 2,
        "name": "Example Caregiving Grant",
        "agency": "Agency for Integrated Care (AIC)",
        "summary": "Monthly cash for caregivers.",
        "description": "Line one.\nLine two.",
        "whatYouGet": ["Financial assistance for daily living expenses"],
        "payFor": "monthly_payouts",
        "area": {"kind": "islandwide"},
        "link": "https://www.aic.sg/financial-assistance/example-grant/",
        "sources": [
            {
                "name": "Agency for Integrated Care (AIC)",
                "url": "https://www.aic.sg/financial-assistance/example-grant/",
            }
        ],
        "lastRefreshed": "2026-09-29",
    }


def test_schemessg_source_link_only_in_prod():
    [record] = classify_all([make_raw()])
    [dev], _ = cat.build_outputs([record], "2026-09-29", "dev")
    [prod], _ = cat.build_outputs([record], "2026-09-29", "prod")
    assert len(dev["sources"]) == 1
    assert prod["sources"][1]["name"] == "Schemes.sg"
    assert "abc123" in prod["sources"][1]["url"]


def test_services_go_to_other():
    raw = make_raw(scheme="Caregiver Support Group", what_it_gives=["Support groups"])
    catalog_items, other_items = cat.build_outputs(classify_all([raw]), "2026-09-29", "dev")
    assert catalog_items == []
    assert other_items[0]["name"] == "Caregiver Support Group"


# --- diff --------------------------------------------------------------------


def state_of(raws, previous=None):
    return [cat.state_record(r) for r in classify_all(raws, previous=previous)]


def test_diff_added_removed_changed():
    before = state_of([
        make_raw(scheme="Alpha Grant", link="https://a.sg/alpha"),
        make_raw(scheme="Gone Grant", link="https://g.sg/gone"),
    ])
    after = state_of(
        [
            make_raw(scheme="Alpha Grant", link="https://a.sg/alpha", summary="New summary"),
            make_raw(scheme="New Grant", link="https://n.sg/new"),
        ],
        previous=before,
    )
    diff = cat.diff_runs(before, after)
    assert [r["name"] for r in diff["added"]] == ["New Grant"]
    assert [r["name"] for r in diff["removed"]] == ["Gone Grant"]
    assert diff["changed"][0]["fields"] == ["summary"]


def test_diff_ignores_source_id_changes():
    before = state_of([make_raw(scheme_id="dev-1")])
    after = state_of([make_raw(scheme_id="prod-1")], previous=before)
    assert cat.diff_runs(before, after) == {"added": [], "removed": [], "changed": []}


def test_tier1_description_change_is_reported():
    hcg = make_raw(scheme="Home Caregiving Grant (HCG)", description="Old text")
    before = state_of([hcg])
    after = state_of([{**hcg, "description": "New text"}], previous=before)
    [change] = cat.tier1_description_changes(before, after)
    assert change["changed"] and change["old"] == "Old text" and change["new"] == "New text"


# --- whole run ---------------------------------------------------------------


def test_second_identical_run_has_no_changes():
    raws = [make_raw(), make_raw(scheme_id="x", scheme="Caregiver Support Group",
                                 what_it_gives=["Support groups"], link="https://c.sg/group")]
    first = sync.run(raws, raws, [], OVERRIDES, None, "2026-09-29", "dev")
    second = sync.run(copy.deepcopy(raws), raws, [], OVERRIDES, first["state"], "2026-10-06", "dev")
    assert first["has_changes"]
    assert not second["has_changes"]


def test_report_mentions_retired_and_feedback():
    raws = [make_raw(eligibility="Singapore Citizens")]
    retired = [{"scheme_id": "old", "scheme": "Old Grant", "link": None,
                "outcome": "retired", "merged_into": "new"}]
    result = sync.run(raws, raws, retired, OVERRIDES, None, "2026-09-29", "dev")
    assert "Old Grant (retired, merged into new)" in result["report"]
    assert "## Feedback for Schemes.sg" in result["report"]
    assert "`eligibility` is filled in" in result["report"]


# --- extra includes ----------------------------------------------------------

EXTRA = {
    **OVERRIDES,
    "extra_includes": [
        {"name": "Medifund", "agency": "Agency for Integrated Care", "payFor": "medical_bills"}
    ],
}


def test_extra_includes_are_found_in_the_full_catalogue_by_name_and_agency():
    listed = [
        {"scheme_id": "m1", "scheme": "MediFund", "agency": "Agency for Integrated Care",
         "link": "https://www.aic.sg/financial-assistance/medifund"},
        {"scheme_id": "m2", "scheme": "Medifund", "agency": "Some Hospital", "link": "https://h.sg/mf"},
        {"scheme_id": "x", "scheme": "Other", "agency": "AIC", "link": "https://aic.sg/other"},
    ]
    to_fetch, missing = cat.match_extra_includes(EXTRA, listed, known_ids=set())
    assert to_fetch == ["m1"] and missing == []


def test_extra_includes_skip_schemes_already_in_the_category_and_report_missing():
    listed = [{"scheme_id": "m1", "scheme": "Medifund", "agency": "Agency for Integrated Care", "link": ""}]
    assert cat.match_extra_includes(EXTRA, listed, known_ids={"m1"}) == ([], [])
    to_fetch, missing = cat.match_extra_includes(EXTRA, [], known_ids=set())
    assert to_fetch == [] and missing[0]["name"] == "Medifund"


def test_extra_include_is_published_with_its_pay_for():
    raw = make_raw(
        scheme="Medifund",
        agency="Agency for Integrated Care",
        who_is_it_for=["Low income"],
        scheme_type=["Financial Assistance", "Healthcare"],
        what_it_gives=["Financial assistance for healthcare", "Casework", "Counselling", "Referral services"],
        link="https://www.aic.sg/financial-assistance/medifund",
    )
    record = cat.classify_record(raw, EXTRA)
    assert record["status"] == cat.PUBLISHED
    assert record["payFor"] == "medical_bills"


# --- eligibility -------------------------------------------------------------


def test_eligibility_is_published_when_present():
    [record] = classify_all([make_raw(eligibility="Singapore Citizens\r\naged 65+")])
    [item], _ = cat.build_outputs([record], "2026-09-29", "dev")
    assert item["eligibility"] == "Singapore Citizens\naged 65+"
    [record] = classify_all([make_raw(eligibility=None)])
    [item], _ = cat.build_outputs([record], "2026-09-29", "dev")
    assert "eligibility" not in item


def test_diff_skips_fields_missing_from_last_state():
    before = state_of([make_raw(eligibility="Old")])
    for record in before:
        del record["eligibility"]  # state written before the field existed
    after = state_of([make_raw(eligibility="New")], previous=before)
    assert cat.diff_runs(before, after)["changed"] == []


# --- text overrides ----------------------------------------------------------

TEXT_OVERRIDE = {
    "match": {"name": "Example Caregiving Grant"},
    "action": "include",
    "summary": "Our summary.",
    "description": "Our description.",
    "valueText": "$1,000 one-off",
    "reason": "Official page says $1,000",
    "checked_on": "2026-09-29",
}


def with_text_override(**changes):
    return {**OVERRIDES, "schemes": [{**TEXT_OVERRIDE, **changes}]}


def test_text_override_needs_reason_and_checked_on():
    assert cat.validate_overrides(with_text_override()) == []
    missing_reason = with_text_override(reason="")
    assert any("reason" in p for p in cat.validate_overrides(missing_reason))
    bad_date = with_text_override(checked_on="29/09/2026")
    assert any("checked_on" in p for p in cat.validate_overrides(bad_date))
    with pytest.raises(ValueError):
        sync.run([make_raw()], [], [], missing_reason, None, "2026-09-29", "dev")


def test_text_override_replaces_text_and_keeps_the_source():
    [record] = classify_all([make_raw(summary="Source summary")], overrides=with_text_override())
    [item], _ = cat.build_outputs([record], "2026-09-29", "dev")
    assert item["summary"] == "Our summary."
    assert item["description"] == "Our description."
    assert item["valueText"] == "$1,000 one-off"
    assert record["sourceSummary"] == "Source summary"
    assert record["contentOverride"]["checkedOn"] == "2026-09-29"


def test_override_to_review_is_flagged_when_source_text_changes():
    overrides = with_text_override()
    first = sync.run([make_raw(summary="Was $800")], [], [], overrides, None, "2026-09-29", "dev")
    same = sync.run([make_raw(summary="Was $800")], [], [], overrides, first["state"], "2026-10-06", "dev")
    changed = sync.run([make_raw(summary="Now $900")], [], [], overrides, first["state"], "2026-10-06", "dev")
    assert not same["has_changes"]
    assert changed["has_changes"]
    assert "review this override" in changed["report"]
    assert "Now $900" in changed["report"]
    assert "review this override" not in same["report"]


def test_override_to_review_records_a_baseline_the_first_time():
    [record] = classify_all([make_raw()], overrides=with_text_override())
    [review] = cat.overrides_to_review([], [cat.state_record(record)])
    assert not review["hasBaseline"] and not review["sourceChanged"]


# --- what you get ------------------------------------------------------------


def test_generic_what_it_gives_values_are_not_shown():
    raw = make_raw(what_it_gives=[
        "Financial assistance (general)", "Information services",
        "Referral and information services", "Financial assistance for healthcare",
    ])
    [record] = classify_all([raw])
    [item], _ = cat.build_outputs([record], "2026-09-29", "dev")
    assert item["whatYouGet"] == ["Financial assistance for healthcare"]


def test_what_you_get_is_empty_when_only_generic_values():
    raw = make_raw(what_it_gives=["Financial assistance (general)", "Referral services"])
    [record] = classify_all([raw])
    [item], _ = cat.build_outputs([record], "2026-09-29", "dev")
    assert item["whatYouGet"] == []
