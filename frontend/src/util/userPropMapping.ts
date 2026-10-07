import { Citizenship, Relationship, Residence } from "@/types/user";
import { t } from "@/i18n";

// Message keys, not text: labels are looked up with t() when shown so they
// follow the chosen language
const userResidenceKeys: Record<Residence, string> = {
  [Residence.HOME]: "userProp.residence.HOME",
  [Residence.NURSING_HOME_LTCF]: "userProp.residence.NURSING_HOME_LTCF",
  [Residence.OTHER]: "userProp.residence.OTHER",
};

const userCitizenshipKeys: Record<Citizenship, string> = {
  [Citizenship.CITIZEN]: "userProp.citizenship.CITIZEN",
  [Citizenship.PR]: "userProp.citizenship.PR",
  [Citizenship.OTHER]: "userProp.citizenship.OTHER",
};

const userRelationshipKeys: Record<Relationship, string> = {
  [Relationship.PARENT]: "userProp.relationship.PARENT",
  [Relationship.SPOUSE]: "userProp.relationship.SPOUSE",
  [Relationship.OTHER_FAMILY]: "userProp.relationship.OTHER_FAMILY",
  [Relationship.NON_FAMILY]: "userProp.relationship.NON_FAMILY",
};

// Select options, in display order
export const getCitizenshipOptions = (): {
  label: string;
  value: Citizenship;
}[] =>
  [Citizenship.CITIZEN, Citizenship.PR, Citizenship.OTHER].map((value) => ({
    label: t(userCitizenshipKeys[value]),
    value,
  }));

export const getRelationshipOptions = (): {
  label: string;
  value: Relationship;
}[] =>
  [
    Relationship.PARENT,
    Relationship.SPOUSE,
    Relationship.OTHER_FAMILY,
    Relationship.NON_FAMILY,
  ].map((value) => ({
    label: t(userRelationshipKeys[value]),
    value,
  }));

export const getFormattedUserResidence = (residence: Residence) => {
  const key = userResidenceKeys[residence];
  return key ? t(key) : "-";
};

export const getFormattedUserCitizenship = (citizenship: Citizenship) => {
  const key = userCitizenshipKeys[citizenship];
  return key ? t(key) : "-";
};

export const getFormattedUserRelationship = (relationship: Relationship) => {
  const key = userRelationshipKeys[relationship];
  return key ? t(key) : "-";
};

export const getFormattedContactNumber = (val?: number | null) => {
  return val ?? "-";
};
