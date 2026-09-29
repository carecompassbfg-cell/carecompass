import classify as c


# --- normalisation -----------------------------------------------------------


def test_normalise_link_ignores_scheme_www_slash_and_fragment():
    assert (
        c.normalise_link("https://www.AIC.sg/financial-assistance/x/#:~:text=hi")
        == c.normalise_link("http://aic.sg/financial-assistance/x")
        == "aic.sg/financial-assistance/x"
    )


def test_normalise_link_keeps_query():
    assert c.normalise_link("https://site.org.sg/?page_id=539") == "site.org.sg?page_id=539"


def test_normalise_name_drops_punctuation_and_case():
    assert c.normalise_name("Seniors’ Mobility & Enabling Fund (SMF)") == (
        "seniors mobility enabling fund smf"
    )


def test_link_slug_is_short_and_readable():
    assert c.link_slug("https://www.aic.sg/financial-assistance/elderfund") == "aic-elderfund"
    assert c.link_slug("https://www.redcross.sg/get-assistance/transportaid.html") == (
        "redcross-transportaid"
    )
    assert c.link_slug("https://www.chas.sg/") == "chas"


def test_fix_split_items_rejoins_parentheses():
    items = ["Healthcare", "Benefits and perks for PWDs (transport", "discounts", "facilities)"]
    assert c.fix_split_items(items) == [
        "Healthcare",
        "Benefits and perks for PWDs (transport, discounts, facilities)",
    ]


def test_clean_text_normalises_line_endings():
    assert c.clean_text("a\r\nb\rc ") == "a\nb\nc"


# --- kind --------------------------------------------------------------------


def test_kind_money_when_financial_help_is_the_point(raw):
    assert c.classify_kind(raw()) == c.MONEY
    assert c.classify_kind(raw(what_it_gives=["Transport subsidies", "Medical transport assistance"])) == c.MONEY


def test_kind_service_when_financial_help_is_one_item_among_many(raw):
    record = raw(
        scheme="Care Corner Home Care",
        what_it_gives=["Nursing care", "Personal care", "Companionship", "Financial assistance for healthcare"],
    )
    assert c.classify_kind(record) == c.SERVICE


def test_kind_money_when_name_says_fund_and_any_financial_signal(raw):
    record = raw(
        scheme="Financial Assistance Schemes & Food Vouchers",
        what_it_gives=["Food support", "Counselling", "Casework", "Financial assistance (general)"],
    )
    assert c.classify_kind(record) == c.MONEY


def test_kind_service_without_financial_signal(raw):
    assert c.classify_kind(raw(what_it_gives=["Befriending services"], scheme_type=["Elderly"])) == c.SERVICE


# --- relevance ---------------------------------------------------------------


def test_relevance_keeps_caregiver_support(raw):
    keep, _ = c.classify_relevance(raw(who_is_it_for=["General public"]), c.SERVICE)
    assert keep


def test_relevance_keeps_elderly_with_dementia(raw):
    keep, _ = c.classify_relevance(
        raw(who_is_it_for=["Elderly with dementia"], scheme_type=["Healthcare"]), c.SERVICE
    )
    assert keep


def test_relevance_keeps_money_for_elderly_but_not_elderly_services(raw):
    record = raw(who_is_it_for=["Elderly"], scheme_type=["Elderly", "Financial Assistance"])
    assert c.classify_relevance(record, c.MONEY)[0]
    assert not c.classify_relevance(record, c.SERVICE)[0]


def test_relevance_drops_children_programmes_even_with_caregivers(raw):
    record = raw(who_is_it_for=["Children", "Families", "Caregivers"], scheme_type=["Children", "Caregiver Support"])
    keep, reason = c.classify_relevance(record, c.MONEY)
    assert not keep
    assert "children" in reason.lower()


def test_relevance_drops_family_only(raw):
    record = raw(who_is_it_for=["Single parents", "Families"], scheme_type=["Family", "Caregiver Support"])
    assert not c.classify_relevance(record, c.SERVICE)[0]


def test_relevance_is_case_insensitive(raw):
    record = raw(who_is_it_for=["caregivers"], scheme_type=["Healthcare"])
    assert c.classify_relevance(record, c.SERVICE)[0]


# --- payFor ------------------------------------------------------------------


def test_pay_for_monthly_payouts(raw):
    assert c.classify_pay_for(raw(scheme="Home Caregiving Grant (HCG)")) == "monthly_payouts"


def test_pay_for_helper_costs(raw):
    record = raw(
        scheme="Migrant Domestic Worker (MDW) Levy Concession",
        what_it_gives=["Subsidies for Foreign Domestic Workers (FDWs)"],
    )
    assert c.classify_pay_for(record) == "helper_costs"


def test_pay_for_equipment_home(raw):
    record = raw(
        scheme="Seniors' Mobility and Enabling Fund (SMF)",
        what_it_gives=["Financial assistance for assistive technology and medical equipment"],
    )
    assert c.classify_pay_for(record) == "equipment_home"


def test_pay_for_transport(raw):
    record = raw(scheme="TransportAid", what_it_gives=["Transport subsidies"], summary="")
    assert c.classify_pay_for(record) == "transport"


def test_pay_for_tax_cpf_from_agency(raw):
    record = raw(
        scheme="Matched Retirement Savings Scheme",
        agency="Central Provident Fund (CPF)",
        what_it_gives=["Financial assistance (general)"],
        summary="",
    )
    assert c.classify_pay_for(record) == "tax_cpf"


def test_pay_for_unclassified_when_nothing_maps(raw):
    record = raw(
        scheme="Community Fund",
        what_it_gives=["Financial assistance (general)"],
        summary="One-time aid.",
    )
    assert c.classify_pay_for(record) == c.UNCLASSIFIED


def test_pay_for_unclassified_when_two_categories_tie(raw):
    record = raw(
        scheme="Helper",
        what_it_gives=["Transport subsidies", "Subsidies for Foreign Domestic Workers (FDWs)"],
        summary="",
    )
    assert c.classify_pay_for(record) == c.UNCLASSIFIED


# --- area --------------------------------------------------------------------


def test_area_islandwide_values(raw):
    for value in (None, "", "No Service Boundaries", "Singapore"):
        assert c.classify_area(raw(service_area=value)) == {"kind": "islandwide"}


def test_area_district_is_readable(raw):
    assert c.classify_area(raw(service_area="Hougang,Sengkang,Punggol")) == {
        "kind": "district",
        "name": "Hougang, Sengkang, Punggol",
    }


def test_area_cdc_agency_is_district(raw):
    record = raw(agency="South West District CDC", service_area="No Service Boundaries")
    assert c.classify_area(record) == {"kind": "district", "name": "South West District"}


def test_area_ignores_planning_area(raw):
    assert c.classify_area(raw(planning_area="Toa Payoh")) == {"kind": "islandwide"}
