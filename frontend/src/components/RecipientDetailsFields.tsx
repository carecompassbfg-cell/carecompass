import { t } from "@/i18n";
import { useState } from "react";
import { Stack } from "@chakra-ui/react";
import { FormLabel, Input } from "@opengovsg/design-system-react";
import {
  parsePostalCode,
  parseRecipientName,
  RECIPIENT_NAME_MAX_LENGTH,
} from "@/util/profileInput";

// Optional name/nickname and postal code for the care recipient, used on
// onboarding and the care recipient edit page. Personal data: the wrapper is
// excluded from PostHog autocapture and recordings (ph-no-capture).
export default function RecipientDetailsFields({
  name,
  postalCode,
  onNameChange,
  onPostalCodeChange,
}: {
  name: string;
  postalCode: string;
  onNameChange: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
}) {
  // Only flag the postal code once they've left the field or typed 6+
  // characters, not while they're part-way through typing it
  const [postalCodeTouched, setPostalCodeTouched] = useState(false);
  const nameError = parseRecipientName(name).error;
  const postalCodeError =
    postalCodeTouched || postalCode.replace(/\s+/g, "").length >= 6
      ? parsePostalCode(postalCode).error
      : undefined;

  return (
    <div className="ph-no-capture flex flex-col gap-4">
      <Stack gap={0} spacing={0}>
        <FormLabel htmlFor="care-recipient-name" marginBottom={0}>
          {t("onboarding.nameLabel")}
        </FormLabel>
        <span
          id="care-recipient-name-hint"
          className="pb-1 text-sm text-gray-600"
        >
          {t("onboarding.nameHint")}
        </span>
        <Input
          id="care-recipient-name"
          name="care_recipient_name"
          value={name}
          maxLength={RECIPIENT_NAME_MAX_LENGTH}
          autoComplete="off"
          isInvalid={Boolean(nameError)}
          aria-describedby={
            nameError
              ? "care-recipient-name-hint care-recipient-name-error"
              : "care-recipient-name-hint"
          }
          onChange={(event) => onNameChange(event.target.value)}
        />
        {nameError && (
          <p
            id="care-recipient-name-error"
            className="pt-1 text-sm text-red-600"
          >
            {nameError}
          </p>
        )}
      </Stack>
      <Stack gap={0} spacing={0}>
        <FormLabel htmlFor="home-postal-code" marginBottom={0}>
          {t("onboarding.postalLabel")}
        </FormLabel>
        <span id="home-postal-code-hint" className="pb-1 text-sm text-gray-600">
          {t("onboarding.postalHint")}
        </span>
        <Input
          id="home-postal-code"
          name="home_postal_code"
          value={postalCode}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={10}
          isInvalid={Boolean(postalCodeError)}
          aria-describedby={
            postalCodeError
              ? "home-postal-code-hint home-postal-code-error"
              : "home-postal-code-hint"
          }
          onChange={(event) => onPostalCodeChange(event.target.value)}
          onBlur={() => setPostalCodeTouched(true)}
        />
        {postalCodeError && (
          <p id="home-postal-code-error" className="pt-1 text-sm text-red-600">
            {postalCodeError}
          </p>
        )}
      </Stack>
    </div>
  );
}
