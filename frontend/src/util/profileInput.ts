export const MIN_AGE = 1;
export const MAX_AGE = 120;

// Onboarding used to default the care recipient's age to 0, so 0 (or null)
// means "not set", never "aged 0".
export const isKnownAge = (age: unknown): age is number =>
  typeof age === "number" &&
  Number.isInteger(age) &&
  age >= MIN_AGE &&
  age <= MAX_AGE;

// A typed age, or null when it isn't a whole number from 1 to 120
export const parseAge = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const age = Number(text);
  return isKnownAge(age) ? age : null;
};

export const AGE_ERROR = `Enter an age from ${MIN_AGE} to ${MAX_AGE}`;

// Only same-site paths like "/dashboard". Rejects "//host", "/\host" and
// absolute URLs so returnTo can't send people to another site.
export const safeReturnTo = (
  value: string | null | undefined,
): string | null => {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) < 32) return null;
  }
  return value;
};

// Care recipient's name or nickname: trimmed, empty means null, at most 40
// characters, no control characters (matches the backend's rules)
export const RECIPIENT_NAME_MAX_LENGTH = 40;
export const RECIPIENT_NAME_ERROR = `Use ${RECIPIENT_NAME_MAX_LENGTH} characters or fewer`;

export const parseRecipientName = (
  value: string | null | undefined,
): { value: string | null; error?: string } => {
  const name = (value ?? "").trim();
  if (!name) return { value: null };
  if (name.length > RECIPIENT_NAME_MAX_LENGTH) {
    return { value: null, error: RECIPIENT_NAME_ERROR };
  }
  for (let i = 0; i < name.length; i += 1) {
    const code = name.charCodeAt(i);
    if (code < 32 || code === 127) {
      return { value: null, error: "Use letters, numbers and spaces only" };
    }
  }
  return { value: name };
};

// Postal code: spaces removed, empty means null, otherwise exactly 6 digits
export const POSTAL_CODE_ERROR = "Enter a 6-digit postal code";

export const parsePostalCode = (
  value: string | null | undefined,
): { value: string | null; error?: string } => {
  const postalCode = (value ?? "").replace(/\s+/g, "");
  if (!postalCode) return { value: null };
  if (!/^[0-9]{6}$/.test(postalCode)) {
    return { value: null, error: POSTAL_CODE_ERROR };
  }
  return { value: postalCode };
};
