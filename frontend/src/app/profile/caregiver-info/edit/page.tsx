"use client";

import { t } from "@/i18n";
import { CaregiverData, Citizenship, UserData } from "@/types/user";
import LoadingSpinner from "@/ui/loading";
import { FormControl, Stack } from "@chakra-ui/react";
import {
  Button,
  FormLabel,
  SingleSelect,
  NumberInput,
  FormErrorMessage,
} from "@opengovsg/design-system-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/ui/button";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api";
import { getCitizenshipOptions } from "@/util/userPropMapping";
import useInitialUserData from "@/util/hooks/useInitialUserData";

function isInvalidCaregiverContactNumber(caregiverData: CaregiverData) {
  const contact_number_str = String(caregiverData?.contact_number ?? "");
  if (contact_number_str.length != 0 && contact_number_str.length != 8) {
    return true; // invalid contact number
  }
  return false;
}

const selectCaregiverData = (userData: UserData): CaregiverData => ({
  citizenship: userData.citizenship,
  contact_number: userData.contact_number,
});

function CaregiverDetailsForm() {
  const setUserData = useAuthStore((state) => state.setUserData);
  const [formData, setFormData] =
    useInitialUserData<CaregiverData>(selectCaregiverData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleContactNumberChange(e: string) {
    if (!formData) {
      return;
    }
    setFormData({
      ...formData,
      contact_number: e.length > 0 ? Number(e) : null,
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData || isInvalidCaregiverContactNumber(formData)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.patch<UserData>("/users/me", formData);
      setUserData(true, res.data);
      toast.success(t("profilePage.caregiverEdit.updated"));
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
        <FormLabel isRequired>
          {t("profilePage.caregiverEdit.citizenshipStatus")}
        </FormLabel>
        <SingleSelect
          isClearable={false}
          placeholder={t("profilePage.selectOption")}
          value={formData.citizenship}
          name="citizenship"
          items={getCitizenshipOptions()}
          onChange={(e) =>
            setFormData({
              ...formData,
              citizenship: e as Citizenship,
            })
          }
        />
      </Stack>
      <Stack gap={0} spacing={0}>
        <FormControl isInvalid={isInvalidCaregiverContactNumber(formData)}>
          <FormLabel>{t("profilePage.caregiverEdit.contactNumber")}</FormLabel>
          <NumberInput
            showSteppers={false}
            placeholder={t("profilePage.caregiverEdit.contactPlaceholder")}
            value={formData.contact_number ?? ""}
            name="contact_number"
            onChange={handleContactNumberChange}
            isInvalid={isInvalidCaregiverContactNumber(formData)}
          />
          <FormErrorMessage>
            {t("profilePage.caregiverEdit.contactError")}
          </FormErrorMessage>
        </FormControl>
      </Stack>
      <Button
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

export default function EditCaregiverInfo() {
  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h1 className="text-2xl font-semibold">
        {t("profilePage.caregiverEdit.title")}
      </h1>
      <CaregiverDetailsForm />
    </div>
  );
}
