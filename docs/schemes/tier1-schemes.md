# Tier 1 schemes: content, eligibility rules and sources

Researched 30 Sep 2026 from official pages; schemes 2–7 were re-checked against their sources by a separate reviewer. This file is fixed input for step 4: Claude Code must copy the figures and rules from here and must not change amounts, thresholds or links without a new source.

Profile fields we already have: caregiver `citizenship`; `care_recipient_age`, `care_recipient_citizenship`, `care_recipient_residence` (HOME / NURSING_HOME_LTCF / OTHER), `care_recipient_relationship` (PARENT / SPOUSE / OTHER_FAMILY / NON_FAMILY, the care recipient's relationship to the caregiver); `monthly_pchi`, `annual_property_value`.

New answers used below (question sheet, step 4): `adl_count` (0–6, from the daily-activities question), `adl_full_help` (yes / no / not sure, asked only when adl_count ≥ 3), `has_far` (yes / no / not sure), `ltc_insurance` (CareShield Life / ElderShield / neither / not sure).

Status rules (same for every scheme): any hard "no" gives **Not a fit**. A missing answer that the rule needs gives **Need answers**. All checkable rules met gives **Likely eligible**. Things only the agency can confirm go under "The agency will check" and never block Likely eligible.

## Decision: HPC and HPC+

Keep them **out of Tier 1 as separate entries**. Home Personal Care is a care service, not a scheme. Its subsidy is the non-residential long-term care subsidy (MOH lists "Home Personal Care" among the covered services). HPC+ is the enhanced version of the same service (heavier chores, advanced care tasks, 24/7 fall monitoring, from $25/hour before subsidy). AIC says HPC+ is means-tested but doesn't name the framework; MOH's list says only "Home Personal Care", so word it as "home personal care" and don't promise HPC+ rates. So:

- Scheme 5 (Long-term care subsidies) names home personal care in what it covers.
- HPC and HPC+ belong in Care services as services, with a "May be eligible for subsidies" link to scheme 5.

That leaves 7 schemes, plus **CareShield Life / ElderShield claims** as the 8th (approved 1 Oct 2026).

---

## 1. Parent Relief / Parent Relief (Disability)

- **id** `PARENT-RELIEF` (keep) · **agency** IRAS · **payFor** tax_cpf
- **summary** Income tax relief if you support a parent, grandparent or in-law.
- **valueText** Up to $9,000 tax relief ($14,000 if they have a disability)
- **whatYouGet**
  - Living with you: $9,000 per dependant, or $14,000 under Parent Relief (Disability)
  - Not living with you (you spent $2,000 or more supporting them): $5,500, or $10,000 under Parent Relief (Disability)
  - Claim for up to 2 dependants. Siblings can share the relief for the same parent
- **Rules** (for the Year of Assessment 2026, the conditions apply to calendar year 2025. Use "last year", not the current year. The current checker's `CURRENT_YEAR` wording is wrong)
  - Relationship PARENT → met. OTHER_FAMILY → treat as met, and add "Must be your parent, grandparent or in-law" to what the agency will check (there is no question that could settle it). SPOUSE or NON_FAMILY → Not a fit ("For parents, grandparents and in-laws")
  - Age 55 or older → met. Under 55 → Not a fit, **unless** adl_count ≥ 1, in which case Parent Relief (Disability) may apply and the age rule does not count → Need answers if adl_count unknown
  - Lives at HOME → "$9,000 (living with you)"; otherwise → "$5,500 if you spent $2,000 or more supporting them"
  - adl_count ≥ 1 → add "May qualify for Parent Relief (Disability): $14,000 / $10,000"
- **The agency will check**: dependant's income in 2025 was $8,000 or less; no one else has claimed Spouse Relief or another relief on the same person; for the disability version, a doctor's or disability association's document if IRAS asks
- **nextSteps**
  1. Log in to myTax Portal with Singpass when you file your tax return.
  2. Go to "4. Deductions, Tax Reliefs and Rebates" > "Add New" > "Parent".
  3. If you claimed last year, it is pre-filled automatically.
- **Source**: [IRAS: Parent Relief/Parent Relief (Disability)](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/parent-relief-parent-relief-(disability)), checked 30 Sep 2026

## 2. Caregivers Training Grant

- **id** `CAREGIVERS-TRAINING-GRANT` · **agency** AIC · **payFor** caregiver_courses
- **summary** Pays for caregiving courses for you or your helper.
- **valueText** $400 in the first year, then $200 a year
- **whatYouGet**
  - $400 in the first year, then a $200 top-up each financial year. Unused balance carries over, capped at $400
  - Applied directly to course fees. You pay at least $10 per course
  - Family members and a migrant domestic worker can all use it if they are main caregivers; they share one balance
- **Rules**
  - Care recipient is SC or PR → met, else Not a fit
  - Age 65 or older → met. Under 65: adl_count ≥ 1 → met (the need must be permanent; needs a Functional Assessment Report unless already on a scheme such as CareShield Life or ElderFund); adl_count = 0 → Not a fit ("For someone 65 or older, or who needs help with at least one daily activity"); unknown → Need answers
- **The agency will check**: you are a main caregiver; the course is on the approved list; the grant has not already been used up by another caregiver
- **nextSteps**
  1. Pick a course from the [Caregivers Training Catalogue](https://training-healthcare.vertis.digital/).
  2. Tell the training provider you will use the grant at least 2 weeks before the course, and fill in the [CTG application form](https://edge.sitecorecloud.io/agencyforinb6cc-agencyforin73f5-production08ac-d178/media/agency-for-integrated-care/Files/Financial-Assistance/CTG-Application-form.pdf) they give you.
  3. If your loved one is under 65, you'll also need a [Functional Assessment Report](https://edge.sitecorecloud.io/agencyforinb6cc-agencyforin73f5-production08ac-d178/media/agency-for-integrated-care/Files/Financial-Assistance/Functional-Assessment-Report.pdf).
- **Source**: [AIC: Caregivers Training Grant](https://www.aic.sg/financial-assistance/caregivers-training-grant-ctg/), checked 30 Sep 2026

## 3. Home Caregiving Grant

- **id** `HOME-CAREGIVING-GRANT` · **agency** AIC · **payFor** monthly_payouts
- **summary** Monthly cash to help with the cost of caring for your loved one at home.
- **valueText** Up to $600 a month
- **whatYouGet**
  - $600 a month if household income per person is $1,500 or less (or no income and home Annual Value $21,000 or less)
  - $400 a month if $1,501 to $3,600
  - $200 a month if $3,601 to $4,800
  - Households that own more than one property get $200
- **Rules**
  - Citizenship: SC → met. PR → met only if they have a living SC parent, child or spouse: caregiver is SC and relationship is PARENT or SPOUSE → met; otherwise → treat as met and add "PRs qualify only if a parent, child or spouse is a Singapore Citizen" to what the agency will check (no question can settle it). OTHER → Not a fit. **(The current checker wrongly rules out all PRs.)**
  - Residence NURSING_HOME_LTCF → Not a fit. HOME → met. OTHER → Need answers
  - Income: pchi null → Need answers (household_income). Tiers as above. pchi 0: AV ≤ $21,000 → $600 tier, else Not a fit. pchi > $4,800 → Not a fit
  - Daily activities: adl_count ≥ 3 → met; 0–2 → Not a fit ("Needs help with at least 3 daily activities"); unknown → Need answers. **(The current checker shows Likely eligible without knowing this.)**
- **The agency will check**: a Functional Assessment Report confirming the daily-activity needs are permanent; property ownership
- **nextSteps**
  1. Get a Functional Assessment Report from an approved doctor, nurse or therapist.
  2. Apply on [AIC eFASS](https://www.aic.sg/financial-assistance/home-caregiving-grant/) with Singpass (it checks your household income for you). Or email apply@aic.sg or visit an AIC Link.
  3. Approval takes up to 4 weeks.
- **Source**: [AIC: Home Caregiving Grant](https://www.aic.sg/financial-assistance/home-caregiving-grant/), checked 30 Sep 2026

## 4. Migrant Domestic Worker Levy Concession

- **id** `MIGRANT-DOMESTIC-WORKER-LEVY` (keep the id; rename the display name) · **agency** MOM · **payFor** helper_costs
- **name** Migrant Domestic Worker Levy Concession
- **summary** Pay a lower monthly levy for a helper who cares for your loved one.
- **valueText** $60 a month levy
- **whatYouGet**
  - Levy drops to $60 a month
  - One helper per eligible person, up to 2 per household
- **Rules**
  - Must live at HOME (same address on NRIC) → otherwise Not a fit
  - Route A, elderly: age 67 or older AND (recipient SC, with no citizenship rule for the caregiver, OR recipient PR and the caregiver or the caregiver's spouse is SC) → met. For a PR, if the caregiver isn't SC, treat as met and add "You or your spouse must be a Singapore Citizen" to what the agency will check. Granted automatically in most cases. **(Fixes the bug where the current checker skips the age check for Singapore Citizens.)**
  - Route B, disability: adl_count ≥ 1 AND (recipient SC, OR recipient PR with an SC parent, spouse or child, same test as HCG) → met, needs an AIC recommendation letter. adl_count unknown and under 67 → Need answers
  - Neither route → Not a fit ("For someone 67 or older, or who needs help with at least one daily activity")
- **The agency will check**: the helper is registered to your household; your loved one is listed as a household member on the FDW eService
- **nextSteps**
  - Aged 67+: usually applied automatically when the address and household details match. [Check if it has been applied](https://go.gov.sg/check-lc-elderly-pwd).
  - Disability route: apply to AIC for a recommendation letter first, then MOM applies the concession.
  - The concession shows within your next 2 levy bills and is backdated to when you completed the steps.
- **link** https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-domestic-worker/foreign-domestic-worker-levy/levy-concession
- **Source**: [MOM: Levy concession](https://www.mom.gov.sg/passes-and-permits/work-permit-for-foreign-domestic-worker/foreign-domestic-worker-levy/levy-concession), last updated 7 Jul 2026, checked 30 Sep 2026
- **Note on the link you gave**: `.../apply-for-levy-waiver` is MOM's **levy waiver** page (for when a helper is on overseas leave, in hospital and so on), not the concession. Use the `.../levy-concession` URL above for both links.

## 5. Long-term care subsidies (day care and home care)

- **id** `MOH-NR-LTC-SUBSIDY` (keep) · **agency** MOH · **payFor** care_services
- **name** Subsidies for day care and home care
- **summary** Pays up to 95% of fees at government-funded day care, home care and home personal care.
- **valueText** Up to 95% off fees
- **whatYouGet**
  - Covers: dementia day care, maintenance day care, home personal care, home nursing, home medical, home therapy, rehabilitation, centre-based nursing, meals on wheels, medical escort and transport, psychiatric day rehabilitation, maintenance exercise
  - Subsidy by household income per person (from 1 Jul 2026):

    | Income per person | SC born 1969 or earlier | SC born after 1969 | PR |
    |---|---|---|---|
    | No income, AV ≤ $21,000 | 95% | 80% | 55% |
    | $1,500 or less | 95% | 80% | 55% |
    | $1,501–$2,300 | 85% | 70% | 45% |
    | $2,301–$2,600 | 75% | 60% | 35% |
    | $2,601–$3,600 | 55% | 40% | 20% |
    | $3,601–$4,800 | 35% | 20% | 10% |
    | Above $4,800, or no income with AV > $21,000 | 0% | 0% | 0% |
- **Rules** (**the current checker and text use the old table: 80% max and a $3,600 cap. Replace them.**)
  - Recipient SC or PR → met, else Not a fit
  - Residence NURSING_HOME_LTCF → Not a fit ("For care at home or at a centre")
  - pchi null → Need answers. Otherwise show the percentage from the table. pchi > $4,800 → Not a fit
  - Born 1969 or earlier: age ≥ 57 → the "born 1969 or earlier" column. Age ≤ 55 → "after 1969". Age 56 is ambiguous: show the lower rate and add "Could be higher if born in 1969"
- **The agency will check**: the provider is government-funded; the doctor or AIC referral
- **nextSteps**
  1. Ask your loved one's doctor at the hospital or polyclinic, or AIC, to refer you to a subsidised service.
  2. The subsidy is applied to the provider's bill.
  3. Compare day care and home care providers in Care services.
- **Source**: [MOH: Subsidies for non-residential long-term care services](https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/subsidy-framework-for-non-residential-long-term-care-services), last updated 1 Jul 2026, checked 30 Sep 2026. HPC+ details: [AIC: Enhanced Home Personal Care](https://www.aic.sg/Care-Services/Enhanced-Home-Personal-Care)

## 6. Seniors' Mobility and Enabling Fund

- **id** `SENIORS-MOBILITY-ENABLING-FUND` (new; add to overrides.json tier1_matches so the Schemes.sg copy is not published) · **agency** AIC · **payFor** equipment_home
- **summary** Pays for wheelchairs, walking aids, hospital beds and home care items like adult diapers and milk supplements.
- **valueText** Up to 90% off
- **whatYouGet**
  - Mobility and assistive devices: walking sticks, wheelchairs, commodes, hospital beds, pressure-relief cushions, hearing aids, spectacles and more. Up to 90% of the cost or the device cap, whichever is lower
  - Home healthcare items: adult diapers, milk supplements, thickeners, catheters, nasal tubing, wound dressings (these have their own details page on AIC; check its rules before writing them into the checker)
  - Assessment fee between $10 and $180, depending on subsidy tier
- **Rules**
  - Recipient SC or PR → met, else Not a fit
  - Age 60 or older → met, else Not a fit
  - Residence NURSING_HOME_LTCF → Not a fit
  - pchi null → Need answers; pchi ≤ $4,800, or 0 with AV ≤ $21,000 → met; otherwise Not a fit
- **The agency will check**: an assessment by an approved health professional says the item is needed; extra conditions for motorised devices
- **nextSteps**
  1. Don't buy the item first: purchases made in advance can't be reimbursed.
  2. Ask a therapist or medical social worker at the hospital or senior care centre to assess and apply for you, or apply online with Singpass on the AIC page, or at an AIC Link. Approval takes up to 15 working days.
- **Source**: [AIC: Seniors' Mobility and Enabling Fund](https://www.aic.sg/financial-assistance/seniors-mobility-and-enabling-fund/), last updated 1 Jun 2026, checked 30 Sep 2026
- **Note**: the page no longer lists transport. If Schemes.sg still says SMF covers transport to day care, add it to the feedback for Eugene.

## 7. MediSave Care

- **id** `MEDISAVE-CARE` (new; add to tier1_matches) · **agency** AIC / CPF · **payFor** monthly_payouts
- **summary** Monthly cash from MediSave (your loved one's or their spouse's) for someone with severe disability.
- **valueText** Up to $200 a month
- **whatYouGet**
  - $200 a month with $20,000+ in MediSave; $150 with $15,000+; $100 with $10,000+; $50 with $5,000+
  - Can draw from their own and their spouse's MediSave (combined max $200). $5,000 stays in each account
- **Rules**
  - Recipient SC or PR → met, else Not a fit
  - Age 30 or older → met (effectively always)
  - adl_count ≥ 3 AND adl_full_help = yes → met; adl_count < 3 → Not a fit ("For severe disability: needs full help with at least 3 daily activities"); adl_full_help = no → Not a fit ("For severe disability: needs full help with at least 3 daily activities"); adl_count or adl_full_help unknown → Need answers; adl_full_help = not sure → Need answers, but counts as answered (not asked again or counted in "Answer N questions"), and add "The severe disability assessment decides" to what the agency will check
- **The agency will check**: severe disability assessment by an MOH-accredited assessor; MediSave balance of at least $5,000
- **nextSteps**
  1. Book a severe disability assessment with an MOH-accredited assessor. You pay $100–$250 upfront, refunded if approved.
  2. Apply on AIC eFASS with Singpass (recommended) or through the nursing home. Or get a hardcopy form by emailing apply@aic.sg or at an AIC Link. Approval takes up to 4 weeks.
- **Source**: [AIC: MediSave Care](https://aic.sg/Financial-Assistance/MediSave-Care), [CPF: What is MediSave Care?](https://www.cpf.gov.sg/service/article/what-is-medisave-care), checked 30 Sep 2026

## 8. CareShield Life / ElderShield claims

- **id** `CARESHIELD-ELDERSHIELD-CLAIM` (new; add the Schemes.sg CareShield Life entry to tier1_matches) · **agency** AIC · **payFor** monthly_payouts
- **name** CareShield Life and ElderShield payouts
- **summary** Monthly cash from long-term care insurance if your loved one becomes severely disabled.
- **valueText** $300 to $689+ a month, depending on the plan
- **whatYouGet**
  - **CareShield Life**: monthly payouts for life while severely disabled. The starting payout is $689 a month in 2026 and rises each year until age 67 or a claim. People born in 1954 or earlier who joined at 67 or above get a fixed $612 a month
  - **ElderShield 400** (joined Sep 2007 to Dec 2019): $400 a month for up to 72 months
  - **ElderShield 300** (joined Sep 2002 to Sep 2007): $300 a month for up to 60 months
  - Private supplements to these plans pay extra; check the policy
- **Who is covered**: everyone born in 1980 or later (automatically, from age 30). People born 1970–1979 with ElderShield 400 were moved to CareShield Life in Dec 2021. People born in 1979 or earlier could choose to join. ElderShield closed to new members on 1 Jan 2020
- **Rules**
  - adl_count ≥ 3 AND adl_full_help = yes → met; adl_count < 3 → Not a fit ("For severe disability: unable to do at least 3 daily activities"); adl_full_help = no → Not a fit ("For severe disability: needs full help with at least 3 daily activities"); adl_count or adl_full_help unknown → Need answers; adl_full_help = not sure → Need answers, but counts as answered (not asked again or counted in "Answer N questions"), and add "The severe disability assessment decides" to what the agency will check
  - ltc_insurance = CareShield Life or ElderShield → met, and show only that plan's payout line; none → Not a fit ("Only if covered by CareShield Life or ElderShield"), with a link to ElderFund in the reason; not sure or unknown → Need answers. Hint in the question: "Check on the CPF website or app under Healthcare"
  - Age is not a rule: anyone born 1980 or later is covered automatically, so if age ≤ 45 (certainly born 1980 or later), treat ltc_insurance as CareShield Life without asking
- **The agency will check**: a severe disability assessment by an MOH-accredited assessor; the policy is active
- **nextSteps**
  1. Book a severe disability assessment with an MOH-accredited assessor. For CareShield Life the first assessment is free; for ElderShield it costs $100 (clinic) to $250 (home visit), refunded if the claim succeeds.
  2. Apply on AIC eFASS with Singpass, or through the nursing home, or with a hardcopy form from an AIC Link.
  3. Approval takes up to 4 weeks.
  4. If not covered by either, see ElderFund (in the catalogue).
- **Sources**: [CPF: CareShield Life](https://www.cpf.gov.sg/member/healthcare-financing/careshield-life) (updated 24 Sep 2026), [CPF: CareShield Life monthly payout](https://www.cpf.gov.sg/service/article/what-is-the-monthly-payout-amount-for-careshield-life), [AIC: CareShield Life](https://www.aic.sg/financial-assistance/careshield-life), [AIC: ElderShield](https://aic.sg/Financial-Assistance/ElderShield), checked 1 Oct 2026; CPF CareShield Life page re-checked 5 Oct 2026, no change

---

## Questions the sheet needs (step 4)

1. **Daily activities** (checklist, used by 1, 2, 3, 4, 7, 8): "Which of these does your loved one need help with?" Bathing · Dressing · Eating · Using the toilet · Moving around or getting in and out of bed · Continence. Plus "None of these" and "Not sure". Store the count as `adl_count`.
2. **Full help** (only if 3 or more ticked; used by 7, 8): "For at least 3 of these, do they need someone to do it fully for them?" Yes / No / Not sure.
3. **Household income** (existing PCHI form; used by 3, 5, 6).
4. **Long-term care insurance** (used by 8; only asked when adl_count ≥ 3 and the care recipient is 46 or older): "Is your loved one covered by CareShield Life or ElderShield?" CareShield Life / ElderShield / Neither / Not sure. Hint: "Check on the CPF website or app under Healthcare."

`has_far` is only used to tailor next steps ("You'll need a Functional Assessment Report"). It never changes a status, so it can wait. **`housing_type` is not needed by any Tier 1 scheme. Drop it from step 4.**

## Changes from what is on staging today

| Scheme | Now | Should be |
|---|---|---|
| Parent Relief | Year wording uses the current year | Conditions are for last year (2025, for YA2026). Add the disability amounts ($14,000 / $10,000) |
| Caregivers Training Grant | "doctor's memo or FAR" | FAR, needs help with at least 1 daily activity. Add the $10 co-payment and the $400 cap |
| Home Caregiving Grant | PRs ruled out; Likely eligible without the daily-activity check | PRs with an SC parent, child or spouse qualify. Needs 3+ daily activities. Multiple properties → $200 |
| MDW Levy Concession | Name "Migrant Domestic Worker Levy"; form.gov.sg link; no age check for Singapore Citizens | Renamed; MOM levy-concession link; 67+ or disability route; PR rule |
| Long-term care subsidies | Max 80%, cut-off $3,600 | Up to 95% for SC born 1969 or earlier; cut-off $4,800 (from 1 Jul 2026) |
| SMF, MediSave Care, CareShield Life | Tier 2 from Schemes.sg (ElderShield missing) | Tier 1 with checks |
| Home Personal Care (HPC/HPC+) | Proposed as a Tier 1 scheme | A care service: listed in Care services, subsidised through scheme 5 |

## Showing when each scheme was last checked

Every Tier 1 entry has lastChecked: the date its content was last confirmed against its official sources. The weekly job moves it forward automatically only when every official page for that scheme was read successfully and is unchanged. If any page changed or couldn't be read, the date stays put, and the scheme is listed in the weekly PR under 'Re-check before the date can move' until a person reviews it, updates this file if needed, and adds a Change log row. The scheme's detail page shows one small grey line at the bottom: 'Last checked {date} · Sources: …' (Tier 1) or 'Last checked {date} · From Schemes.sg' (Tier 2, the date of the last merged weekly sync). Not shown on cards or lists.

## Change log

| Date | Change |
|---|---|
| 30 Sep 2026 | First full research of schemes 1–7 from official pages; schemes 2–7 independently re-checked; HPC/HPC+ reclassified as a care service |
| 1 Oct 2026 | Scheme 8 (CareShield Life / ElderShield) researched and approved |
| 1 Oct 2026 | Schemes 7 and 8: full help = no → Not a fit; full help = not sure → Need answers, counted as answered, with "The severe disability assessment decides" for the agency |
| 5 Oct 2026 | Scheme 8: CPF CareShield Life page changed; re-checked, no change to figures or rules |
