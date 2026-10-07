"use client";

import { t } from "@/i18n";
import {
  CareRecipientData,
  Citizenship,
  Relationship,
  Residence,
  UserData,
} from "@/types/user";
import {
  getCitizenshipOptions,
  getRelationshipOptions,
} from "@/util/userPropMapping";
import LoadingSpinner from "@/ui/loading";
import { Stack } from "@chakra-ui/react";
import {
  Button,
  FormLabel,
  NumberInput,
  Radio,
  SingleSelect,
} from "@opengovsg/design-system-react";
import { RadioGroup } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/ui/button";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api";
import useInitialUserData from "@/util/hooks/useInitialUserData";
import RecipientDetailsFields from "@/components/RecipientDetailsFields";
import {
  getAgeError,
  parseAge,
  parsePostalCode,
  parseRecipientName,
  safeReturnTo,
} from "@/util/profileInput";

const selectCareRecipientData = (userData: UserData): CareRecipientData => ({
  care_recipient_age: userData.care_recipient_age,
  care_recipient_citizenship: userData.care_recipient_citizenship,
  care_recipient_residence: userData.care_recipient_residence,
  care_recipient_relationship: userData.care_recipient_relationship,
});

function CareRecipientDetailsForm() {
  const router = useRouter();
  const returnTo = safeReturnTo(useSearchParams().get("returnTo"));
  const setUserData = useAuthStore((state) => state.setUserData);
  const userData = useAuthStore((state) => state.userData);
  const [formData, setFormData] = useInitialUserData<CareRecipientData>(
    selectCareRecipientData,
  );
  // Typed text, so the field can be empty; 0 from onboarding means "not set"
  const [ageText, setAgeText] = useState<string>();
  // Optional fields; undefined until edited, so they start from the profile
  const [nameText, setNameText] = useState<string>();
  const [postalCodeText, setPostalCodeText] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameValue = nameText ?? userData?.care_recipient_name ?? "";
  const postalCodeValue = postalCodeText ?? userData?.home_postal_code ?? "";
  const name = parseRecipientName(nameValue);
  const postal = parsePostalCode(postalCodeValue);

  const ageValue =
    ageText ??
    (formData && parseAge(formData.care_recipient_age) !== null
      ? String(formData.care_recipient_age)
      : "");
  const age = parseAge(ageValue);
  const submitDisabled =
    !formData ||
    age === null ||
    Boolean(name.error) ||
    Boolean(postal.error) ||
    Object.values(formData).some((v) => v === "");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const res = await api.patch<UserData>("/users/me", {
        ...formData,
        care_recipient_age: age,
        care_recipient_name: name.value,
        home_postal_code: postal.value,
      });
      setUserData(true, res.data);
      toast.success(t("profilePage.recipientEdit.updated"));
      if (returnTo) {
        router.push(returnTo);
      }
    } catch (e) {
      toast.error(t("profilePage.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!formData) {
    return <LoadingSpinner />;
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Stack gap={0} spacing={0}>
        <FormLabel isRequired>{t("onboarding.caringFor")}</FormLabel>
        <SingleSelect
          isClearable={false}
          placeholder={t("profilePage.selectOption")}
          value={formData.care_recipient_relationship}
          name="carerecipient_relationship"
          items={getRelationshipOptions()}
          onChange={(e) =>
            setFormData({
              ...formData,
              care_recipient_relationship: e as Relationship,
            })
          }
        />
      </Stack>
      <Stack gap={0} spacing={0}>
        <FormLabel isRequired>{t("onboarding.recipientCitizenship")}</FormLabel>
        <SingleSelect
          isClearable={false}
          placeholder={t("profilePage.selectOption")}
          value={formData.care_recipient_citizenship}
          name="carerecipient_citizenship"
          items={getCitizenshipOptions()}
          onChange={(e) =>
            setFormData({
              ...formData,
              care_recipient_citizenship: e as Citizenship,
            })
          }
        />
      </Stack>
      <Stack gap={0} spacing={0}>
        <FormLabel isRequired>{t("onboarding.recipientAge")}</FormLabel>
        <NumberInput
          min={1}
          max={120}
          placeholder={t("onboarding.agePlaceholder")}
          value={ageValue}
          name="carerecipient_age"
          isInvalid={ageValue !== "" && age === null}
          onChange={(e) => setAgeText(e)}
        />
        {ageValue !== "" && age === null && (
          <p className="pt-1 text-sm text-red-600">{getAgeError()}</p>
        )}
      </Stack>
      <Stack gap={0} spacing={0}>
        <FormLabel isRequired>{t("onboarding.recipientResidence")}</FormLabel>
        <RadioGroup
          onChange={(e) =>
            setFormData({
              ...formData,
              care_recipient_residence: e as Residence,
            })
          }
          value={formData.care_recipient_residence.toString()}
        >
          <Radio value={Residence.HOME} allowDeselect>
            {t("onboarding.residence.HOME")}
          </Radio>
          <Radio value={Residence.NURSING_HOME_LTCF} allowDeselect>
            {t("onboarding.residence.NURSING_HOME_LTCF")}
          </Radio>
          <Radio value={Residence.OTHER} allowDeselect>
            {t("onboarding.residence.OTHER")}
          </Radio>
        </RadioGroup>
      </Stack>
      <RecipientDetailsFields
        name={nameValue}
        postalCode={postalCodeValue}
        onNameChange={setNameText}
        onPostalCodeChange={setPostalCodeText}
      />
      <Button
        isDisabled={submitDisabled}
        isLoading={isSubmitting}
        loadingText={t("profilePage.submitting")}
        variant="solid"
        type="submit"
      >
        {t("profilePage.save")}
      </Button>
    </form>
  );
}

export default function EditCareRecipientInfo() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h1 className="text-2xl font-semibold">
        {t("profilePage.recipientEdit.title")}
      </h1>
      <Suspense fallback={<LoadingSpinner />}>
        <CareRecipientDetailsForm />
      </Suspense>
    </div>
  );
}
