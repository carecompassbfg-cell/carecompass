# Schemes.sg sync report

Synced on 2026-10-05 from the **prod** environment, category "Seniors & Caregiving".

**Content changes to review** (see below).

## Counts

| | Count |
|---|---:|
| Fetched | 194 |
| Published (money, Tier 2) | 17 |
| Other services and programmes (`other.json`) | 87 |
| Excluded | 75 |
| Unclassified money (not published) | 7 |
| Tier 1 matches (ours, not published) | 8 |
| Retired or not found | 0 |

## Changes since the last run

Compared with the last run from the **dev** environment.

### Added (50)

- Aces HelpLife (excluded)
- Enhancement for Active Seniors (EASE) (excluded, equipment_home)
- Seniors' Mobility and Enabling Fund (SMF) (tier1, equipment_home)
- Alive Counselling (excluded)
- Mental Health Service (other)
- CREST (AWWA) (other)
- Positive Appearance Scheme (other)
- Play.Able (excluded)
- Brighthill Evergreen Home (excluded)
- Sheltered Workshop Programme (other)
- Counselling (other)
- CREST-Youth (excluded)
- CWS Soulfull Programme (excluded)
- Dementia Helpline (other)
- Friends-In-Deed Counselling Society (excluded)
- Community Shop Programme (excluded)
- Free Food For All (excluded)
- COMIT Fei Yue (other)
- Enhancement for Active Seniors (EASE) (excluded, equipment_home)
- Lease Buyback Scheme (unclassified, unclassified)
- Deferred Downpayment Scheme (DDS) (excluded)
- Silver Housing Bonus (published, equipment_home)
- CREST HNF @ Fernvale and Jalan Kayu (other)
- S17 Community Kitchen (excluded)
- KampungSpirit (unclassified, unclassified)
- CREST-Youth Lakeside Family Services @ West (excluded)
- LB Tech Care (excluded)
- Silver is Gold (unclassified, unclassified)
- MINDS Caregivers Support Services (excluded)
- MWS Active Ageing Centres (excluded)
- NAMS Addiction Hotline (excluded)
- Senior Care Centres (other)
- Ray of Hope (unclassified, unclassified)
- REACH Community Mental Health Team (other)
- Dignity of Work Programme (other)
- CREST @ Anchorvale & Buangkok (excluded)
- Sheng Hong Active Ageing Centre (Care)@Sennett (other)
- Casework & Counselling Services (other)
- Dementia Caregiver Support Group (other)
- Dementia Support Group (other)
- iREX : Integrated Rehabilitation & Exercise Programme (excluded)
- StrokeConnect (other)
- Special Needs Savings Scheme (other)
- Community Outreach Programme for the Elderly (COPE) (excluded)
- South West Community Caring Fund (unclassified, unclassified)
- Project Dementia and Caregiver care services (Meeting Centre Support Programme) (other)
- Tung Ling Counselling Centre (excluded)
- Mental Wellness Outreach for Seniors (CREST Programme) (other)
- Counselling and Coaching for Older Persons and Caregivers (other)
- Care & Assistance (unclassified, unclassified)

### Removed (3)

- Community Intervention Teams (COMIT) (other)
- Caregiver Empowerment Programme (other)
- SAGE The Seniors Helpline (other)

### Changed (7)

- **CREST - Community Resource Engagement and Support Team**: agency, summary, description, eligibility, whatItGives, link
  - link: `https://www.aic.sg/body-mind/dementia-support-referrals` → `https://www.aic.sg/Partners/Community-Mental-Health-Programmes`
- **Financial and Food Rations assistance (Temporary)**: agency, summary, description, eligibility, whatItGives, link, area
  - link: `https://www.bethelcs.org.sg/social-services/overview` → `https://www.bethelcs.org.sg/social-services/community-support`
- **Financial Assistance Schemes & Food Vouchers**: agency, summary, description, eligibility, whatItGives, link
  - link: `https://www.eurasians.sg/family-support/` → `https://www.eurasians.sg/families`
- **Enhancement for Active Seniors (EASE)**: summary, description, eligibility
- **Special Needs Trust Company**: name, summary, description, eligibility, whatItGives
- **Caregiving @ South West**: summary, description, eligibility, whatItGives, link, kind, status, payFor
  - link: `https://southwest.cdc.gov.sg/what-we-do/for-caregivers/caregiving/` → `https://southwest.cdc.gov.sg/what-we-do/for-caregivers/caregiving-sw/`
  - kind: `service_or_programme` → `money`
  - status: `other` → `unclassified`
  - payFor: `None` → `unclassified`
- **South West Caregiver Support Fund**: eligibility, whatItGives, link
  - link: `https://southwest.cdc.gov.sg/what-we-do/for-caregivers/csf/` → `https://southwest.cdc.gov.sg/what-we-do/for-caregivers/south-west-caregiver-support-fund/`

## Overrides to review

Text we override by hand in overrides.json. When Schemes.sg changes the text we replaced, re-check the override and update `checked_on`.

### South West Caregiver Support Fund

- Overrides: summary, description, valueText
- Reason: Production Schemes.sg now says $1,000 (description), matching the official South West CDC page (updated 27 Aug 2026), but its summary and description describe the CDC's caregiver page rather than the fund, and it has no payFor. We keep our summary, "$1,000 one-off" and payFor. Dev said $800 (summary) and $500 (description).
- Checked on: 2026-10-05
- Status: **Schemes.sg text changed since the last run: review this override** (summary, description)

Schemes.sg summary before:

> One-time $800 aid for South West caregivers.

Schemes.sg summary now:

> South West CDC offers caregiver-focused resources, including a support fund for caregiving and self-care expenses, and a resource map of local services. It centralizes information to help caregivers in the South West District access support more easily.

Schemes.sg description before:

> The South West Caregiver Support Fund is an interim one-time assistance of $500, to help caregivers defray self-care and caregiving expenses.

Schemes.sg description now:

> This South West CDC page consolidates support for caregivers living in the South West District of Singapore.
> - Highlights a Caregiving @ South West initiative that brings together support and resources tailored for caregivers.
> - Features the South West Caregiver Support Fund, which helps caregivers defray self-care and caregiving-related expenses.
> - Provides a South West Resource Map to help caregivers discover key caregiving support services available within their community.
> - Aims to make it easier for caregivers to find relevant support, information, and financial help within the district.
> - $1,000 to help caregivers with self-care and caregiving expenses.

## Tier 1 matches

These are our own schemes. The sync never publishes or overwrites them; check whether our copy needs updating when the Schemes.sg text changes.

### CAREGIVERS-TRAINING-GRANT: Caregivers Training Grant (CTG)

https://aic.sg/financial-assistance/caregivers-training-grant (no change)

### CARESHIELD-ELDERSHIELD-CLAIM: CareShield Life

https://www.aic.sg/financial-assistance/careshield-life (no change)

### HOME-CAREGIVING-GRANT: Home Caregiving Grant (HCG)

https://www.aic.sg/financial-assistance/home-caregiving-grant (no change)

### MEDISAVE-CARE: Medisave Care

https://www.cpf.gov.sg/member/healthcare-financing/medisave-care-for-long-term-care-needs (no change)

### MIGRANT-DOMESTIC-WORKER-LEVY: Migrant Domestic Worker (MDW) Levy Concession For Persons With Disabilities

https://www.aic.sg/financial-assistance/foreign-domestic-worker-levy-concession (no change)

### MOH-NR-LTC-SUBSIDY: Subsidies for Government-Funded Intermediate and Long Term Care (ILTC) Services

https://www.moh.gov.sg/seeking-healthcare/find-a-facility-or-service/mental-health-services/intermediate-and-long-term-care-services (no change)

### SENIORS-MOBILITY-ENABLING-FUND: Seniors' Mobility and Enabling Fund (SMF)

https://www.aic.sg/financial-assistance/seniors-mobility-and-enabling-fund-smf/ (**description changed**)

Old:

> Provides holistic support for seniors to age in place within the community by extending subsidies to Singaporean seniors requiring mobility and assistive devices for daily independent living and to remain ambulant in the community, and receiving Government funded home care and care within the community, needing home healthcare items for their care.

New:

> - Provides subsidies to help seniors age in the community by funding mobility and assistive devices
> - Supports purchase and, for selected items, replacement of devices after a defined blackout period
> - Covers a wide range of items: walking aids, wheelchairs (manual and motorised), pushchairs, commodes, hospital beds, pressure relief cushions/mattresses, hearing aids, spectacles, and specialised/customised devices (e.g., prostheses)
> - Up to 90% subsidy of device cost or the device-specific subsidy cap, whichever is lower
> - Requires assessment by approved healthcare professionals to determine appropriate devices
> - Includes separate support for home healthcare consumables (e.g., catheters, milk supplements, thickeners, adult diapers, nasal tubing, wound dressings) via the related SMF Home Healthcare Items scheme
> - Designed to help seniors remain independent and safe at home, reducing caregiver burden and enhancing mobility, vision, and hearing

### SENIORS-MOBILITY-ENABLING-FUND: Seniors' Mobility and Enabling Fund (SMF)

https://www.aic.sg/financial-assistance/seniors-mobility-enabling-fund (no change)

## Extra includes from the full catalogue

Schemes outside the category that overrides.json asks for.

- Medifund: Medifund (published)

## Published schemes (17)

### Cash support (6)

| Scheme | Agency | Area |
|---|---|---|
| [ComCare Long Term Assistance (LTA)](https://supportgowhere.life.gov.sg/schemes/COMCARE-LTA/comcare-long-term-assistance-lta) | MSF | Islandwide |
| [ElderFund](https://www.aic.sg/financial-assistance/elderfund) | MOH | Islandwide |
| [Interim Disability Assistance Programme for the Elderly (IDAPE)](https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/interim-disability-assistance-programme-for-the-elderly) | MOH | Islandwide |
| [Pioneer Generation Disability Assistance Scheme (PioneerDAS)](https://www.aic.sg/financial-assistance/pioneer-generation-disability-assistance-scheme) | AIC | Islandwide |
| [Public Assistance Programme](https://sbws.org.sg/en/services-affiliates/social-welfare-and-community-services/public-assistance-programme/) | Singapore Buddhist Welfare Service | Islandwide |
| [South West Caregiver Support Fund](https://southwest.cdc.gov.sg/what-we-do/for-caregivers/south-west-caregiver-support-fund/) | South West CDC | South West District |

### Equipment and home (2)

| Scheme | Agency | Area |
|---|---|---|
| [Enhancement for Active Seniors (EASE)](https://www.hdb.gov.sg/managing-my-home/upgrading-and-redevelopment/enhancement-for-active-seniors-ease) | HDB | Islandwide |
| [Silver Housing Bonus](https://www.hdb.gov.sg/managing-my-home/retirement-planning/monetising-flat-for-retirement/silver-housing-bonus) | HDB | Islandwide |

### Transport (1)

| Scheme | Agency | Area |
|---|---|---|
| [Singapore Red Cross' TransportAid](https://www.redcross.sg/get-assistance/transportaid.html) | Singapore Red Cross | Islandwide |

### Medical bills (7)

| Scheme | Agency | Area |
|---|---|---|
| [Community Health Assist Scheme (CHAS)](https://www.chas.sg/) | MOH | Islandwide |
| [Medical Assistance](https://www.tzuchi.org.sg/en/our-missions/charity/medical-assistance/) | Buddhist Compassion Relief Tzu-Chi Foundation (Singapore) | Islandwide |
| [Medical Fee Exemption Card (MFEC)](https://www.aic.sg/financial-assistance/medical-fee-exemption-card-mfec/) | MSF | Islandwide |
| [Medifund](https://www.aic.sg/financial-assistance/medifund) | AIC | Islandwide |
| [Merdeka Generation Package](https://www.moh.gov.sg/managing-expenses/schemes-and-subsidies/merdeka-generation-package) | MOH | Islandwide |
| [Pioneer Generation Package](https://www.moh.gov.sg/cost-financing/healthcare-schemes-subsidies/pioneer-generation-package) | MOH | Islandwide |
| [Viriya Elderly Medical Programme (VEMP)](https://viriya.org.sg/service/seniors/) | Viriya Community Services | Islandwide |

### Tax and CPF (1)

| Scheme | Agency | Area |
|---|---|---|
| [Matched Retirement Savings Scheme](https://www.cpf.gov.sg/member/growing-your-savings/saving-more-with-cpf/matching-grant-for-seniors-who-top-up) | CPF Board | Islandwide |

## Unclassified money schemes (7)

Financial help that doesn't map cleanly to one category, so it is not published. Set `payFor` in overrides.json to publish one.

| Scheme | Agency | What it gives | Scores |
|---|---|---|---|
| [Care & Assistance](https://www.yong-en.org.sg/care-assistance/) | Yong-en Care Centre | Casework, Financial assistance (general), Financial assistance for daily living expenses, Food support | - |
| [Caregiving @ South West](https://southwest.cdc.gov.sg/what-we-do/for-caregivers/caregiving-sw/) | South West CDC | Respite care/Caregiver support, Educational programmes, Financial assistance (general) | - |
| [KampungSpirit](https://www.kampungspirit.gov.sg/) | Open Government Products | Financial assistance (general), Financial assistance for daily living expenses, Food support | - |
| [Lease Buyback Scheme](https://www.hdb.gov.sg/residential/living-in-an-hdb-flat/for-our-seniors/monetising-your-flat-for-retirement/lease-buyback-scheme) | HDB | Financial assistance (general) | - |
| [Ray of Hope](https://rayofhope.sg/) | Ray of Hope | Referral services, Financial assistance (general), Financial assistance for daily living expenses, Financial assistance for healthcare, Financial assistance for education, Information services | {'medical_bills': 2} |
| [Silver is Gold](https://www.majurity.sg/funds-and-grants/silverisgold/) | The Majurity Trust Limited | Financial assistance (general) | - |
| [South West Community Caring Fund](https://southwest.cdc.gov.sg/what-we-do/for-assistance/sw-community-caring-fund/) | South West CDC | Financial assistance (general), Financial assistance for daily living expenses | - |

## Excluded (75)

| Scheme | Agency | Kind | Reason |
|---|---|---|---|
| APSN Delta Senior School | Association for Persons with Special Needs (APSN) | service_or_programme | Aimed at children or youth |
| Be a respite carer | Boys' Town | service_or_programme | Aimed at children or youth |
| Care Corner COMIT | Care Corner Singapore | service_or_programme | Aimed at children or youth |
| Care Corner INSIGHT | Care Corner Singapore | service_or_programme | Aimed at children or youth |
| CREST-Youth | CARE Singapore | service_or_programme | Aimed at children or youth |
| CREST-Youth Lakeside Family Services @ West | Lakeside Family Services | service_or_programme | Aimed at children or youth |
| MINDS Caregivers Support Services | MINDS (Movement for the Intellectually Disabled of Singapore) | service_or_programme | Aimed at children or youth |
| NAMS Addiction Hotline | National Addictions Management Service | service_or_programme | Aimed at children or youth |
| Play.Able | Be Kind SG | service_or_programme | Aimed at children or youth |
| Singapore Association for Mental Health Mobile Support Team COMIT | Singapore Association for Mental Health Mobile Support Team COMIT | service_or_programme | Aimed at children or youth |
| Viriya Children Medical Programme (VCMP) | Viriya Community Services | service_or_programme | Aimed at children or youth |
| HCSA Dayspring | HCSA Dayspring SPIN | service_or_programme | Aimed at families only |
| HCSA Dayspring SPIN | HCSA Community Services | service_or_programme | Aimed at families only |
| 4S Active Ageing Centre @ Eunos Crescent | 4S Active Ageing Centre @ Eunos Crescent | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Aces HelpLife | ACES Care Limited | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing | REACH Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Activities | Touch Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Centre | Lions Befrienders Service Association | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Centre | Adventist Home for the Elders | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Centre @ Compassvale | Bcare | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Centres | Singapore Anglican Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Centres | SASCO Senior Citizens’ Home | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Active Ageing Centres | Sree Narayana Mission | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Afterlife Memorial Service | Cheng Hong Welfare Service Society | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Alive Counselling | Alive Community Network | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Allkin Singapore's Active Ageing Centres | Allkin Singapore's Active Ageing Centres | service_or_programme | Not aimed at caregivers or seniors with a care need |
| AWWA Active Ageing Centre | AWWA Active Ageing Centre | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Blossom Home Refresh | Blossom World Society | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Blossom Kaki (Senior Volunteerism) Programme | Blossom Seeds | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Brighthill Evergreen Home | Bright Hill Evergreen Home | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Care At Centre | Salem Welfare Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| CareElderly Active Ageing Centres | Care Community Services Society Singapore | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Case Management | Sree Narayana Mission | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Community Outreach Programme for the Elderly (COPE) | South East Community Development Council (South East CDC) | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Community Shop Programme | Food from the Heart | service_or_programme | Not aimed at caregivers or seniors with a care need |
| CREST @ Anchorvale & Buangkok | SAGE Counselling Centre | service_or_programme | Not aimed at caregivers or seniors with a care need |
| CWS Soulfull Programme | Catholic Welfare Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Deferred Downpayment Scheme (DDS) | HDB | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Financial Assistance | Bcare | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Food Assistance | A Packet of Rice | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Free Food For All | Free Food For All Ltd | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Friends-In-Deed Counselling Society | Friends In Deed Counselling Society | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Friends @ St Hilda’s Link | St Hilda's Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Geylang East Active Ageing Centre | Geylang East Home for the Aged | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Gym Tonic & Wellness | Care Corner Singapore | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Heartware Support Our Pioneers Programme | Heartware Support Our Pioneers Programme | service_or_programme | Not aimed at caregivers or seniors with a care need |
| HNF Wellness Club @ Buangkok | Home Nursing Foundation | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Intergenerational Programme | Hope Center Singapore | service_or_programme | Not aimed at caregivers or seniors with a care need |
| iREX : Integrated Rehabilitation & Exercise Programme | St Luke’s Hospital | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Kaki Kampong Senior Wellness | Lakeside Family Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| LB Tech Care | Lions Befrienders Service Association (Singapore) | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Living Assistance | Buddhist Compassion Relief Tzu-Chi Foundation (Singapore) | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Medical Escort Volunteer | Cheng Hong Welfare Service Society | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Mutual Help and Care | Bo Tien Welfare Services Society | service_or_programme | Not aimed at caregivers or seniors with a care need |
| MWS Active Ageing Centres | Methodist Welfare Services (MWS) | service_or_programme | Not aimed at caregivers or seniors with a care need |
| PCS Active Ageing Centres | PCS Active Ageing Centres | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Pertapis Centre for Women and Girls | Pertapis | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Pertapis Centre for Women and Girls | Pertapis Centre for Women and Girls | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Professional Deputies and Donees | Touch Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| REACH Community Café | REACH Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| S17 Community Kitchen |  | service_or_programme | Not aimed at caregivers or seniors with a care need |
| S3 Active Ageing Centre @ Jurong Point | S3 Active Ageing Centre @ Jurong Point | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Senior Service | REACH Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Series on Care planning Series | Sree Narayana Mission | service_or_programme | Not aimed at caregivers or seniors with a care need |
| SNM SHARE Programme | Sree Narayana Mission | service_or_programme | Not aimed at caregivers or seniors with a care need |
| The Saturday Movement | The Saturday Movement | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Traditional Chinese Medicine Free Clinic | Buddhist Compassion Relief Tzu-Chi Foundation (Singapore) | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Tung Ling Counselling Centre | Tung Ling Community Services | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Tzu Chi Free Clinic | Tzu Chi Singapore | service_or_programme | Not aimed at caregivers or seniors with a care need |
| Enhancement for Active Seniors (EASE) | HDB | money | Override: Duplicate on production Schemes.sg (three EASE entries); we publish the HDB entry at hdb.gov.sg/managing-my-home/upgrading-and-redevelopment/enhancement-for-active-seniors-ease |
| Enhancement for Active Seniors (EASE) | HDB | money | Override: Duplicate on production Schemes.sg (three EASE entries); we publish the HDB entry at hdb.gov.sg/managing-my-home/upgrading-and-redevelopment/enhancement-for-active-seniors-ease |
| Financial and Food Rations assistance (Temporary) | Bethel Community Services (BCS) | money | Override: General cash and food aid (Bethel Community Services), not specific to caregiving |
| Financial Assistance and Food Relief | Catholic Welfare Services | money | Override: General cash and food aid (Catholic Welfare Services), not specific to caregiving |
| Financial Assistance Schemes & Food Vouchers | The Eurasian Association | money | Override: General cash and food aid (Eurasian Association), not specific to caregiving |
| Mobile Access for Seniors | IMDA | money | Override: Subsidised phone plans and devices, not caregiving costs |

## Retired or not found (0)

None.

## Tier 1 official pages

Read 13 official pages behind our core schemes: 9 unchanged, 1 changed, 3 read for the first time, 0 couldn't be read. 2 needed a headless browser.

### Changed. Re-check docs/schemes/tier1-schemes.md

- https://www.cpf.gov.sg/member/healthcare-financing/careshield-life (CareShield Life and ElderShield payouts)

### Couldn't read this week

Not the same as unchanged: these pages weren't compared, so their schemes' dates don't move.

None.

### Re-check before the date can move

- **Parent Relief** (last checked 2026-09-30)
  - https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-reliefs-rebates-and-deductions/tax-reliefs/parent-relief-parent-relief-(disability): read for the first time, nothing to compare with yet
- **MediSave Care** (last checked 2026-09-30)
  - https://www.cpf.gov.sg/service/article/what-is-medisave-care: read for the first time, nothing to compare with yet
- **CareShield Life and ElderShield payouts** (last checked 2026-10-01)
  - https://www.cpf.gov.sg/member/healthcare-financing/careshield-life: changed
  - https://www.cpf.gov.sg/service/article/what-is-the-monthly-payout-amount-for-careshield-life: read for the first time, nothing to compare with yet

### Last checked moved to 2026-10-05

- Caregivers Training Grant (was 2026-09-30)
- Home Caregiving Grant (was 2026-09-30)
- Migrant Domestic Worker Levy Concession (was 2026-09-30)
- Subsidies for day care and home care (was 2026-09-30)
- Seniors' Mobility and Enabling Fund (was 2026-09-30)

## Feedback for Schemes.sg

- `eligibility` is filled in for 162 of 194 schemes, although it was described as null everywhere. We don't publish it yet.
- `status` is null for 141 of 194 schemes (other values: {'active': 53}). Is null the same as active?
- List responses include `service_area`, `phone`, `email`, `address`, `eligibility`, but they are always null there; the values only appear in detail responses, so every scheme needs a detail call.
- The same scheme from the same agency is listed more than once with different official links, which looks like duplicate entries: Seniors' Mobility and Enabling Fund (SMF).
- `what_it_gives` has items split inside parentheses for 2 scheme(s), e.g. "Benefits and perks for PWDs (transport", "discounts", "facilities)". We rejoin them. Affected: CARA Membership, Merdeka Generation Package.
- 8 official link(s) are shared by more than one scheme (usually an agency's general services page), so a link alone can't identify a scheme. Shared: carecorner.org.sg/services/caregiver-support, lakeside.org.sg/our-services/seniors-services, mindfull.org.sg/caregiver-education, onehopecentre.org/help-recovery-programmes, sasco.org.sg/our-services, sreenarayanamission.org/our-services/community-programmes, touch.org.sg/get-assistance/caregivers.html, tzuchi.org.sg/en/our-missions/medicine/traditional-chinese-medicine-free-clinic.
- Several schemes share a generic name ("Active Ageing Centre" x5, "Active Ageing Centres" x4, "Enhancement for Active Seniors (EASE)" x3, "Pertapis Centre for Women and Girls" x2, "Seniors' Mobility and Enabling Fund (SMF)" x2); including the operator in the name would help users.
- `phone` has mixed types ({'NoneType': 119, 'str': 67, 'list': 8}): sometimes a string, sometimes a list.
- `who_is_it_for` values differ only by case: Caregivers, Families, Persons with Disabilities (PWDs), Persons with disabilities (PWDs), caregivers, families.
- The same agency is written in different ways: Alzheimer's Disease Association / Alzheimers' Disease Association; BCARE / Bcare; Loving Heart Multi Service Centre / Loving Heart Multi-Service Centre; TOUCH Community Services / Touch Community Services.
- In a category-filtered list, `scheme_type` only contains that category's types, so every scheme needs a detail call to get its full `scheme_type`.
- `service_area` is free text: islandwide shows up as both "No Service Boundaries" and "Singapore", and districts mix CDC districts, town names, street names and block ranges. A controlled list (islandwide, CDC district, planning areas) would make it usable for filtering.
- Only one filter can be used per request, so we can't ask for "Seniors & Caregiving" and "Financial Assistance" together.
