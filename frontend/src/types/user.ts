// TODO: Enum types should be fetched from the backend
export enum Residence {
  HOME = "HOME",
  NURSING_HOME_LTCF = "NURSING_HOME_LTCF",
  OTHER = "OTHER",
}

export enum Citizenship {
  CITIZEN = "CITIZEN",
  PR = "PR",
  OTHER = "OTHER",
}

// Note: may want to align with singpass codes in the future
export enum Relationship {
  PARENT = "PARENT",
  SPOUSE = "SPOUSE",
  OTHER_FAMILY = "OTHER_FAMILY",
  NON_FAMILY = "NON_FAMILY",
}

export interface CaregiverData {
  citizenship: Citizenship;
  contact_number?: number | null;
}

export interface CareRecipientData {
  care_recipient_age: number;
  care_recipient_citizenship: Citizenship;
  care_recipient_residence: Residence;
  care_recipient_relationship: Relationship;
}

// Answers from the schemes question sheet, as the backend stores them
// (scheme_answers on /users/me). Personal and partly health-related: never
// log them or send them to analytics.
export interface SavedSchemeAnswers {
  adl_needs?: number | "not_sure" | null;
  adl_full_help?: "yes" | "no" | "not_sure" | null;
  ltc_insurance?:
    | "careshield_life"
    | "eldershield"
    | "neither"
    | "not_sure"
    | null;
  has_far?: "yes" | "no" | "not_sure" | null;
  care_recipient_age_not_sure?: boolean | null;
  // Set by the server
  updated_at?: string | null;
}

export interface UserDataBase extends CaregiverData, CareRecipientData {
  clerk_id?: string;
  // Personal data: never log these or send them to analytics
  care_recipient_name?: string | null;
  home_postal_code?: string | null;
  scheme_answers?: SavedSchemeAnswers | null;
}

export interface UserDataFull extends UserDataBase {
  household_size: number;
  total_monthly_household_income: number;
  annual_property_value: number;
  monthly_pchi: number;
}

export interface UserData extends UserDataFull {
  id: number;
  threads: UserThreadData[];
}

export interface UserThreadData {
  title: string;
  thread_id: string;
}
