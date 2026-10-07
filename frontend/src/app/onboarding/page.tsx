"use client";

import { t } from "@/i18n";
import { Citizenship, Relationship, Residence, UserData } from "@/types/user";
import {
  getCitizenshipOptions,
  getRelationshipOptions,
} from "@/util/userPropMapping";
import LoadingSpinner from "@/ui/loading";
import { Stack } from "@chakra-ui/react";
import {
  Button,
  BxRightArrowAlt,
  FormLabel,
  NumberInput,
  Radio,
  SingleSelect,
} from "@opengovsg/design-system-react";
import { RadioGroup } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api";
import RecipientDetailsFields from "@/components/RecipientDetailsFields";
import { useSchemeAnswersStore } from "@/stores/schemeAnswers";
import {
  getAgeError,
  parseAge,
  parsePostalCode,
  parseRecipientName,
} from "@/util/profileInput";
import {
  answersFingerprint,
  hasSavedAnswers,
  toSavedAnswers,
} from "@/util/schemeAnswersAdapter";

type PersonalDetails = {
  citizenship: string;
  // Typed text so the field starts empty; sent as a number
  care_recipient_age: string;
  care_recipient_citizenship: string;
  care_recipient_residence: Residence;
  care_recipient_relationship: string;
};

function PersonalDetailsForm() {
  const router = useRouter();
  const setUserData = useAuthStore((state) => state.setUserData);

  const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
    citizenship: "",
    care_recipient_age: "",
    care_recipient_citizenship: "",
    care_recipient_residence: Residence.HOME,
    care_recipient_relationship: "",
  });

  // Optional, so kept apart from the required fields above
  const [recipientName, setRecipientName] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const age = parseAge(personalDetails.care_recipient_age);
  const showAgeError =
    personalDetails.care_recipient_age !== "" && age === null;
  const name = parseRecipientName(recipientName);
  const postal = parsePostalCode(postalCode);
  const submitDisabled =
    age === null ||
    Boolean(name.error) ||
    Boolean(postal.error) ||
    Object.values(personalDetails).some((v) => v === "");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Answers given in the question sheet while signed out are saved to
      // the new profile, once, as part of sign-up
      const { answers, loadAnswers } = useSchemeAnswersStore.getState();
      const savedAnswers = toSavedAnswers(answers);
      const res = await api.post<UserData>("/users", {
        ...personalDetails,
        care_recipient_age: age,
        care_recipient_name: name.value,
        home_postal_code: postal.value,
        ...(hasSavedAnswers(savedAnswers)
          ? { scheme_answers: savedAnswers }
          : {}),
      });
      if (res.data) {
        loadAnswers(answers, res.data.id, answersFingerprint(answers));
      }
      setUserData(true, res.data);
      router.push("/home");
    } catch (error) {
      toast.error(t("profilePage.genericError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // 1. Your citizenship status (Singapore Citizen/Permanent Resident/Foreigner)
  // 2. Loved one’s citizenship status (Singapore Citizen/Permanent Resident/Foreigner)
  // 3. Loved one’s age (as of today)
  // 4. Does your loved one stay with you? (Yes/No)
  // - If no, do they stay in a nursing home or residential long-term care facility?
  // 5. What is your loved one’s relationship to you? (Parent, spouse, other family, non-family member)

  return (
    <main className="flex h-full w-full flex-col gap-8 overflow-auto p-8 py-16">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-bold">{t("onboarding.title")}</h3>
        <span className="">{t("onboarding.intro")}</span>
      </div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Stack gap={0} spacing={0}>
          <FormLabel isRequired>{t("onboarding.yourCitizenship")}</FormLabel>
          <SingleSelect
            placeholder={t("profilePage.selectOption")}
            value={personalDetails.citizenship}
            name="citizenship"
            items={getCitizenshipOptions()}
            onChange={(e) =>
              setPersonalDetails({
                ...personalDetails,
                citizenship: e as Citizenship,
              })
            }
          />
        </Stack>
        <Stack gap={0} spacing={0}>
          <FormLabel isRequired>{t("onboarding.caringFor")}</FormLabel>
          <SingleSelect
            placeholder={t("profilePage.selectOption")}
            value={personalDetails.care_recipient_relationship}
            name="carerecipient_relationship"
            items={getRelationshipOptions()}
            onChange={(e) =>
              setPersonalDetails({
                ...personalDetails,
                care_recipient_relationship: e as Relationship,
              })
            }
          />
        </Stack>
        <Stack gap={0} spacing={0}>
          <FormLabel isRequired>
            {t("onboarding.recipientCitizenship")}
          </FormLabel>
          <SingleSelect
            placeholder={t("profilePage.selectOption")}
            value={personalDetails.care_recipient_citizenship}
            name="carerecipient_citizenship"
            items={getCitizenshipOptions()}
            onChange={(e) =>
              setPersonalDetails({
                ...personalDetails,
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
            value={personalDetails.care_recipient_age}
            name="carerecipient_age"
            isInvalid={showAgeError}
            onChange={(e) =>
              setPersonalDetails({
                ...personalDetails,
                care_recipient_age: e,
              })
            }
          />
          {showAgeError && (
            <p className="pt-1 text-sm text-red-600">{getAgeError()}</p>
          )}
        </Stack>
        <Stack gap={0} spacing={0}>
          <FormLabel isRequired>{t("onboarding.recipientResidence")}</FormLabel>
          <RadioGroup
            onChange={(e) =>
              setPersonalDetails({
                ...personalDetails,
                care_recipient_residence: e as Residence,
              })
            }
            value={personalDetails.care_recipient_residence.toString()}
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
          name={recipientName}
          postalCode={postalCode}
          onNameChange={setRecipientName}
          onPostalCodeChange={setPostalCode}
        />
        <Button
          isDisabled={submitDisabled}
          isLoading={isSubmitting}
          loadingText={t("profilePage.submitting")}
          variant="solid"
          type="submit"
          rightIcon={<BxRightArrowAlt />}
        >
          {t("onboarding.next")}
        </Button>
      </form>
    </main>
  );
}

export default function PersonalDetailsFormWithSuspense() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PersonalDetailsForm />
    </Suspense>
  );
}
