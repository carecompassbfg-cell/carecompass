import { Citizenship, Residence, UserDataFull } from "../types/user";

// Types
interface EligibilityResult {
  id: string;
  criteriaCount: number;
  eligibleReasons: string[];
  ineligibleReasons?: string[];
  additionalVerificationDetails?: string[];
  otherDetails?: string[];
}

enum EligibilityStatus {
  ELIGIBLE = "eligible",
  INELIGIBLE = "ineligible",
  NEEDS_VERIFICATION = "needs_verification",
}

interface DetailedEligibilityResult {
  schemeId: string;
  eligibilityStatus: EligibilityStatus;
  criteriaCount: number;
  eligibleReasons: string[];
  ineligibleReasons?: string[];
  additionalVerificationDetails?: string[];
  otherDetails?: string[];
}

const CURRENT_YEAR = new Date().getFullYear();

// Individual scheme checkers
export const checkParentRelief = (user: UserDataFull): EligibilityResult => {
  const reasons = [
    `Your dependant(s) are 55 years of age and above in ${CURRENT_YEAR}`,
    "If your dependant(s) were living with you in the same household in Singapore, you qualify for $9,000 in tax relief per dependant",
    "If your dependant(s) who do/does not live with you but you have incurred more than S$2,000 supporting them, you may qualify for $5,500 in tax relief per dependant",
  ];
  const additionalVerificationCriteria = [
    `Your dependant(s) did not have an annual income of more than $8,000 each in ${CURRENT_YEAR}`,
    "No other relevant reliefs have been claimed on your dependant",
  ];

  const criteriaCount = reasons.length + additionalVerificationCriteria.length;
  const eligibleReasons = [];
  const ineligibleReasons = [];

  if (user.care_recipient_age >= 55) {
    eligibleReasons.push(reasons[0]);
  } else {
    ineligibleReasons.push(reasons[0]);
  }

  if (user.care_recipient_residence === Residence.HOME) {
    eligibleReasons.push(reasons[1]);
  } else {
    eligibleReasons.push(reasons[2]);
  }

  return {
    id: "PARENT-RELIEF",
    criteriaCount,
    eligibleReasons,
    ineligibleReasons,
    additionalVerificationDetails: additionalVerificationCriteria,
  };
};

export const checkCaregiversTrainingGrant = (
  user: UserDataFull,
): EligibilityResult => {
  const reasons = [
    "Care recipient is a Singapore Citizen or Permanent Resident",
    "Care recipient is aged 65 and older OR have a disability certified by a doctor's memo or Functional Assessment Report",
  ];
  const additionalVerificationCriteria = [
    "Caregiver must be person in charge of caring for the care recipient (this can include family members and foreign domestic workers)",
    "The full grant quantum has not been claimed by other family members or caregivers",
    "Selected course is on the approved list of courses",
    "Completion of the training course with a certificate of attendance if there is one",
  ];

  const criteriaCount = reasons.length + additionalVerificationCriteria.length;

  const eligibleReasons = [];
  const ineligibleReasons = [];

  if (
    user.care_recipient_citizenship === Citizenship.CITIZEN ||
    user.care_recipient_citizenship === Citizenship.PR
  ) {
    eligibleReasons.push(reasons[0]);
  } else {
    ineligibleReasons.push(reasons[0]);
  }

  if (user.care_recipient_age >= 65) {
    eligibleReasons.push(reasons[1]);
  } else {
    ineligibleReasons.push(reasons[1]);
  }

  return {
    id: "CAREGIVERS-TRAINING-GRANT",
    criteriaCount,
    eligibleReasons,
    ineligibleReasons,
    additionalVerificationDetails: additionalVerificationCriteria,
  };
};

export const checkHomeCaregivingGrant = (
  user: UserDataFull,
): EligibilityResult => {
  const reasons = [
    "Care recipient is a Singapore Citizen (SC)",
    "Care recipient is not in a residential long-term care institution (e.g. nursing home)",
    "If household has no income, the annual value of property must be not more than $21,000",
    "If your household monthly income per person is $1,500 or less and your household owns no more than one property, you may qualify for $600 in monthly cash payouts",
    "If your household monthly income per person is between $1,501 and $3,600, you may qualify for $400 monthly cash payout",
    "If your household monthly income per person is between $3,601 and $4,800, you may qualify for $200 monthly cash payout",
  ];
  const additionalVerificationCriteria = [
    "Care recipient must always require some assistance with at least 3 Activities of Daily Living, as certified via a Functional Assessment Report",
  ];

  const criteriaCount = reasons.length + additionalVerificationCriteria.length;

  const eligibleReasons = [];
  const ineligibleReasons = [];

  if (user.care_recipient_citizenship === Citizenship.CITIZEN) {
    eligibleReasons.push(reasons[0]);
  } else {
    ineligibleReasons.push(reasons[0]);
  }
  if (user.care_recipient_residence !== Residence.NURSING_HOME_LTCF) {
    eligibleReasons.push(reasons[1]);
  } else {
    ineligibleReasons.push(reasons[1]);
  }

  if (user.monthly_pchi === null) {
    // User has not submitted PCHI data
    additionalVerificationCriteria.push(reasons[2]);
    additionalVerificationCriteria.push(reasons[3]);
    additionalVerificationCriteria.push(reasons[4]);
    additionalVerificationCriteria.push(reasons[5]);
  } else if (user.monthly_pchi === 0) {
    if (
      user.annual_property_value !== null &&
      user.annual_property_value <= 21000
    ) {
      eligibleReasons.push(reasons[2]);
    } else {
      ineligibleReasons.push(reasons[2]);
    }
  } else if (user.monthly_pchi <= 1500) {
    eligibleReasons.push(reasons[3]);
  } else if (user.monthly_pchi <= 3600) {
    eligibleReasons.push(reasons[4]);
  } else if (user.monthly_pchi <= 4800) {
    eligibleReasons.push(reasons[5]);
  } else {
    ineligibleReasons.push(reasons[3]);
    ineligibleReasons.push(reasons[4]);
    ineligibleReasons.push(reasons[5]);
  }

  return {
    id: "HOME-CAREGIVING-GRANT",
    criteriaCount,
    eligibleReasons,
    ineligibleReasons,
    additionalVerificationDetails: additionalVerificationCriteria,
  };
};

export const checkMdwLevyConcession = (
  user: UserDataFull,
): EligibilityResult => {
  let eligibleReasons: string[] = [];
  let ineligibleReasons: string[] = [];

  const isCaseOne =
    user.care_recipient_citizenship === Citizenship.CITIZEN &&
    user.citizenship === Citizenship.CITIZEN &&
    user.care_recipient_residence === Residence.HOME;

  const isCaseTwo =
    user.care_recipient_citizenship === Citizenship.PR &&
    user.citizenship === Citizenship.CITIZEN &&
    user.care_recipient_residence === Residence.HOME &&
    user.care_recipient_age >= 67;

  if (isCaseOne) {
    eligibleReasons = [
      "Care recipient is a Singaporean Citizen",
      "Applicant is a Singapore Citizen",
      "Applicant lives with care recipient",
      "Care recipient is elderly person aged 67 and above*",
    ];
  } else if (isCaseTwo) {
    eligibleReasons = [
      "Care recipient is a Singaporean Permanent Resident",
      "Applicant is a Singapore Citizen",
      "Applicant lives with care recipient",
      "Care recipient is elderly person aged 67 and above*",
    ];
  } else {
    ineligibleReasons = [
      "Does not meet all criteria for the levy concession - must meet all criteria in one of the following cases:",
      "Case 1: Care recipient is Singapore Citizen, applicant is Singapore Citizen, and they live together",
      "Case 2: Care recipient is Singapore PR, applicant is Singapore Citizen, they live together, and care recipient is 67 or older",
    ];
  }

  const otherDetails = [
    "*or person with disability as certified by Functional Assessment Report as requiring assistance with at least 1 activity of daily living",
  ];
  const criteriaCount = 4;

  return {
    id: "MIGRANT-DOMESTIC-WORKER-LEVY",
    criteriaCount,
    eligibleReasons,
    ineligibleReasons,
    otherDetails: otherDetails,
  };
};

export const checkMohLtcSubsidy = (user: UserDataFull): EligibilityResult => {
  const citizenshipReason =
    "User of Non-Residential Long-Term Care service is a Singapore Citizen (SC) or Permanent Resident (PR)";
  const additionalVerificationCriteria = [
    "The service provider is government-funded",
  ];
  const criteriaCount = 2;

  const eligibleReasons: string[] = [];
  const ineligibleReasons: string[] = [];

  const isCitizen = user.care_recipient_citizenship === Citizenship.CITIZEN;
  const isPR = user.care_recipient_citizenship === Citizenship.PR;

  if (isCitizen || isPR) {
    eligibleReasons.push(citizenshipReason);
  } else {
    ineligibleReasons.push(citizenshipReason);
  }

  if (isCitizen || isPR) {
    if (user.monthly_pchi === null) {
      additionalVerificationCriteria.push(
        "Subsidy level is based on monthly household per capita income (PCHI) — share your household information to see which tier you qualify for",
      );
    } else {
      const citizenLabel = isCitizen
        ? "Singapore Citizen"
        : "Permanent Resident";
      let subsidyPercent: number | null = null;
      let tierRange: string = "";

      if (user.monthly_pchi === 0) {
        if (
          user.annual_property_value !== null &&
          user.annual_property_value <= 21000
        ) {
          subsidyPercent = isCitizen ? 80 : 55;
          tierRange =
            "no household income and annual property value of $21,000 or less";
        } else {
          ineligibleReasons.push(
            "Annual property value exceeds $21,000 with no household income — not eligible for subsidy",
          );
        }
      } else if (user.monthly_pchi <= 900) {
        subsidyPercent = isCitizen ? 80 : 55;
        tierRange = "PCHI of $900 or below";
      } else if (user.monthly_pchi <= 1500) {
        subsidyPercent = isCitizen ? 75 : 50;
        tierRange = "PCHI between $901 and $1,500";
      } else if (user.monthly_pchi <= 2300) {
        subsidyPercent = isCitizen ? 60 : 40;
        tierRange = "PCHI between $1,501 and $2,300";
      } else if (user.monthly_pchi <= 2600) {
        subsidyPercent = isCitizen ? 50 : 30;
        tierRange = "PCHI between $2,301 and $2,600";
      } else if (user.monthly_pchi <= 3600) {
        subsidyPercent = isCitizen ? 30 : 15;
        tierRange = "PCHI between $2,601 and $3,600";
      } else {
        ineligibleReasons.push(
          "Monthly PCHI exceeds $3,600 — not eligible for subsidy on non-residential long-term care services",
        );
      }

      if (subsidyPercent !== null) {
        eligibleReasons.push(
          `As a ${citizenLabel} with ${tierRange}, you may qualify for a ${subsidyPercent}% subsidy on non-residential long-term care services`,
        );
      }
    }
  }

  return {
    id: "MOH-NR-LTC-SUBSIDY",
    criteriaCount,
    eligibleReasons,
    ineligibleReasons,
    additionalVerificationDetails: additionalVerificationCriteria,
  };
};

export const checkAllSchemesEligibility = (
  user: UserDataFull,
): DetailedEligibilityResult[] => {
  const checkers = [
    checkParentRelief,
    checkCaregiversTrainingGrant,
    checkHomeCaregivingGrant,
    checkMdwLevyConcession,
    checkMohLtcSubsidy,
  ];

  return checkers.map((checker) => {
    const result = checker(user);

    let eligibilityStatus = EligibilityStatus.ELIGIBLE;

    // Check if there are any verification details needed
    if (
      result.additionalVerificationDetails &&
      result.additionalVerificationDetails.length > 0
    ) {
      eligibilityStatus = EligibilityStatus.NEEDS_VERIFICATION;
    }
    // INELIGIBLE if no eligible reasons and no reasons that need verification
    else if (!result.eligibleReasons.length) {
      eligibilityStatus = EligibilityStatus.INELIGIBLE;
    }

    return {
      schemeId: result.id,
      criteriaCount: result.criteriaCount,
      eligibilityStatus,
      eligibleReasons: result.eligibleReasons,
      ineligibleReasons: result.ineligibleReasons,
      additionalVerificationDetails: result.additionalVerificationDetails,
      otherDetails: result.otherDetails,
    };
  });
};
