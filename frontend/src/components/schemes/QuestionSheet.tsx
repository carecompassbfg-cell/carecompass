import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@opengovsg/design-system-react";
import { SignInButton } from "@clerk/nextjs";
import { PCHIForm } from "@/components/PCHIForm";
import {
  isAnswered,
  NOT_SURE,
  useSchemeAnswersStore,
} from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import { AdlFullHelp, LtcPlan } from "@/util/eligibilityChecker";
import { getAgeError, isKnownAge, parseAge } from "@/util/profileInput";
import { possessive } from "@/util/recipient";
import {
  getOpenSheetQuestions,
  SchemeWithStatus,
  SHEET_QUESTIONS,
} from "@/util/schemeCatalog";
import SchemeIcon, { FOCUS_RING } from "./SchemeIcon";
import { t } from "@/i18n";

interface Option<T extends string> {
  value: T;
  label: string;
}

// Wording from docs/schemes/tier1-schemes.md, "Questions the sheet needs".
// The English names are the stored values; the label shown is translated.
const ADL_OPTIONS = [
  "Bathing",
  "Dressing",
  "Eating",
  "Using the toilet",
  "Moving around or getting in and out of bed",
  "Continence",
];

const ADL_KEYS: Record<string, string> = {
  Bathing: "questions.adl.bathing",
  Dressing: "questions.adl.dressing",
  Eating: "questions.adl.eating",
  "Using the toilet": "questions.adl.toilet",
  "Moving around or getting in and out of bed": "questions.adl.moving",
  Continence: "questions.adl.continence",
};

// Built when shown, so the labels follow the chosen language
const getFullHelpOptions = (): Option<AdlFullHelp>[] => [
  { value: "yes", label: t("questions.yes") },
  { value: "no", label: t("questions.no") },
  { value: NOT_SURE, label: t("questions.notSure") },
];

const getLtcOptions = (): Option<LtcPlan>[] => [
  { value: "careshield_life", label: t("questions.careShieldLife") },
  { value: "eldershield", label: t("questions.elderShield") },
  { value: "neither", label: t("questions.neither") },
  { value: NOT_SURE, label: t("questions.notSure") },
];

const getPrompt = (id: ProfileQuestionId, name: string): string => {
  switch (id) {
    case ProfileQuestionId.CARE_RECIPIENT_AGE:
      return t("questions.prompt.age", { name });
    case ProfileQuestionId.ADL_NEEDS:
      return t("questions.prompt.adl", { name });
    case ProfileQuestionId.ADL_FULL_HELP:
      return t("questions.prompt.fullHelp");
    case ProfileQuestionId.HOUSEHOLD_INCOME:
      return t("questions.prompt.income", { name: possessive(name) });
    case ProfileQuestionId.LTC_INSURANCE:
      return t("questions.prompt.ltc", { name });
    default:
      return "";
  }
};

const OPTION_ROW =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-[10px] p-3.5 text-[15px] text-gray-800 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-interaction-main-default";

const optionRowState = (checked: boolean) =>
  checked
    ? "border-[1.5px] border-interaction-main-default bg-blue-50"
    : "border border-gray-200 bg-white";

function CheckboxOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`${OPTION_ROW} ${optionRowState(checked)}`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded ${
          checked
            ? "bg-interaction-main-default"
            : "border border-gray-400 bg-white"
        }`}
      >
        {checked && <SchemeIcon name="tick" size={16} />}
      </span>
      {label}
    </label>
  );
}

function RadioOptions<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2.5">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            className={`${OPTION_ROW} ${optionRowState(checked)}`}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={checked}
              onChange={() => onChange(option.value)}
            />
            <span
              aria-hidden
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                checked
                  ? "border-interaction-main-default"
                  : "border-gray-400 bg-white"
              }`}
            >
              {checked && (
                <span className="size-2.5 rounded-full bg-interaction-main-default" />
              )}
            </span>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

// Bottom sheet that asks one question at a time. The steps are worked out
// from the live statuses, so a follow-up (full help, insurance) appears as
// soon as an earlier answer makes it matter, and a question that no longer
// changes any status is dropped.
// Answers stay in useSchemeAnswersStore for this session only, except
// household income, which saves to the profile through the existing PCHIForm.
export default function QuestionSheet({
  isOpen,
  onClose,
  items,
  scopeSchemeId,
  startAt,
  recipientName,
  isSignedIn,
  onIncomeSaved,
  mode = "open",
  recipientAge,
}: {
  isOpen: boolean;
  onClose: () => void;
  // Every scheme with its current status
  items: SchemeWithStatus[];
  // "open": ask what's still open. "edit": go through the saved answers
  // again (from the profile), with follow-ups as the answers allow
  mode?: "open" | "edit";
  // Care recipient's age, for whether the insurance question applies (edit)
  recipientAge?: number | null;
  // Only ask what this scheme needs (from its detail page)
  scopeSchemeId?: string;
  startAt?: ProfileQuestionId;
  recipientName: string;
  isSignedIn: boolean;
  onIncomeSaved: () => Promise<void>;
}) {
  const answers = useSchemeAnswersStore((state) => state.answers);
  const setAnswer = useSchemeAnswersStore((state) => state.setAnswer);
  // Questions answered or skipped since the sheet opened
  const [done, setDone] = useState<ProfileQuestionId[]>([]);
  const [ageText, setAgeText] = useState("");
  const [adlSelected, setAdlSelected] = useState<string[]>([]);
  const [noneOfThese, setNoneOfThese] = useState(false);
  const [fullHelp, setFullHelp] = useState<AdlFullHelp>();
  const [ltc, setLtc] = useState<LtcPlan>();

  useEffect(() => {
    if (isOpen) {
      setDone([]);
      setAgeText("");
      setAdlSelected([]);
      setNoneOfThese(false);
      // Start from what's already answered (daily activities are saved as a
      // count, so those boxes start empty)
      const saved = useSchemeAnswersStore.getState().answers;
      setFullHelp(saved[ProfileQuestionId.ADL_FULL_HELP]);
      setLtc(saved[ProfileQuestionId.LTC_INSURANCE]);
    }
  }, [isOpen]);

  const scoped = useMemo(
    () =>
      scopeSchemeId
        ? items.filter(({ scheme }) => scheme.id === scopeSchemeId)
        : items,
    [items, scopeSchemeId],
  );
  const open = getOpenSheetQuestions(scoped, (id) => isAnswered(answers, id));
  const savedAdl = answers[ProfileQuestionId.ADL_NEEDS];
  const editSteps = [
    ProfileQuestionId.ADL_NEEDS,
    ...(typeof savedAdl === "number" && savedAdl >= 3
      ? [
          ProfileQuestionId.ADL_FULL_HELP,
          // Insurance only matters from age 46 (younger means CareShield Life)
          ...(!isKnownAge(recipientAge) || recipientAge >= 46
            ? [ProfileQuestionId.LTC_INSURANCE]
            : []),
        ]
      : []),
  ];
  const steps =
    mode === "edit"
      ? editSteps
      : SHEET_QUESTIONS.filter(
          (id) => done.includes(id) || open.includes(id) || id === startAt,
        );
  const remaining = steps.filter((id) => !done.includes(id));
  const current = startAt && !done.includes(startAt) ? startAt : remaining[0];

  useEffect(() => {
    if (isOpen && !current) onClose();
  }, [isOpen, current, onClose]);

  if (!current) return null;

  const finish = (id: ProfileQuestionId) => setDone([...done, id]);

  const schemesAffected = items.filter(
    ({ status }) =>
      status.status === "needs_answers" &&
      status.questionsToAsk.includes(current),
  );
  const ageAnswer = parseAge(ageText);
  const showAgeError = ageText !== "" && ageAnswer === null;

  const save = () => {
    switch (current) {
      case ProfileQuestionId.CARE_RECIPIENT_AGE:
        if (ageAnswer !== null) setAnswer(current, ageAnswer);
        break;
      case ProfileQuestionId.ADL_NEEDS:
        setAnswer(current, noneOfThese ? 0 : adlSelected.length);
        break;
      case ProfileQuestionId.ADL_FULL_HELP:
        setAnswer(current, fullHelp);
        break;
      case ProfileQuestionId.LTC_INSURANCE:
        setAnswer(current, ltc);
        break;
    }
    finish(current);
  };

  const canContinue =
    current === ProfileQuestionId.CARE_RECIPIENT_AGE
      ? ageAnswer !== null
      : current === ProfileQuestionId.ADL_NEEDS
        ? noneOfThese || adlSelected.length > 0
        : current === ProfileQuestionId.ADL_FULL_HELP
          ? fullHelp !== undefined
          : current === ProfileQuestionId.LTC_INSURANCE
            ? ltc !== undefined
            : false;

  const renderBody = () => {
    switch (current) {
      case ProfileQuestionId.CARE_RECIPIENT_AGE:
        return (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="sheet-age"
              className="text-sm font-semibold text-gray-800"
            >
              {t("questions.age")}
            </label>
            <input
              id="sheet-age"
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={ageText}
              onChange={(event) => setAgeText(event.target.value)}
              aria-invalid={showAgeError}
              aria-describedby={showAgeError ? "sheet-age-error" : undefined}
              className={`min-h-11 rounded-lg border px-3 text-[15px] text-gray-800 ${
                showAgeError ? "border-red-600" : "border-gray-300"
              } ${FOCUS_RING}`}
            />
            {showAgeError && (
              <p id="sheet-age-error" className="text-sm text-red-600">
                {getAgeError()}
              </p>
            )}
          </div>
        );
      case ProfileQuestionId.ADL_NEEDS:
        return (
          <div className="flex flex-col gap-2.5">
            {ADL_OPTIONS.map((label) => (
              <CheckboxOption
                key={label}
                label={t(ADL_KEYS[label])}
                checked={adlSelected.includes(label)}
                onChange={(checked) => {
                  setNoneOfThese(false);
                  setAdlSelected(
                    checked
                      ? [...adlSelected, label]
                      : adlSelected.filter((value) => value !== label),
                  );
                }}
              />
            ))}
            <CheckboxOption
              label={t("questions.noneOfThese")}
              checked={noneOfThese}
              onChange={(checked) => {
                setNoneOfThese(checked);
                if (checked) setAdlSelected([]);
              }}
            />
          </div>
        );
      case ProfileQuestionId.ADL_FULL_HELP:
        return (
          <RadioOptions
            name="adl_full_help"
            options={getFullHelpOptions()}
            value={fullHelp}
            onChange={setFullHelp}
          />
        );
      case ProfileQuestionId.HOUSEHOLD_INCOME:
        return isSignedIn ? (
          <PCHIForm
            callbackFn={async () => {
              setAnswer(ProfileQuestionId.HOUSEHOLD_INCOME, "saved");
              await onIncomeSaved();
              finish(ProfileQuestionId.HOUSEHOLD_INCOME);
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              {t("questions.signInForIncome")}
            </p>
            <SignInButton>
              <Button className="w-full">{t("common.signIn")}</Button>
            </SignInButton>
          </div>
        );
      case ProfileQuestionId.LTC_INSURANCE:
        return (
          <div className="flex flex-col gap-2.5">
            <RadioOptions
              name="ltc_insurance"
              options={getLtcOptions()}
              value={ltc}
              onChange={setLtc}
            />
            <p className="text-[13px] leading-[18px] text-gray-600">
              {t("questions.ltcHint")}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // Household income has its own Save button inside PCHIForm
  const showContinue = current !== ProfileQuestionId.HOUSEHOLD_INCOME;
  // Full help and insurance have "Not sure" among their options
  const showNotSure =
    current === ProfileQuestionId.CARE_RECIPIENT_AGE ||
    current === ProfileQuestionId.ADL_NEEDS ||
    current === ProfileQuestionId.HOUSEHOLD_INCOME;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        {/* Answers are personal and health-related: keep them out of
            PostHog autocapture and recordings */}
        <Drawer.Content className="ph-no-capture fixed bottom-0 left-0 right-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-gray-600">
                {t("questions.progress", {
                  n: done.length + 1,
                  total: steps.length,
                })}
              </p>
              <button
                type="button"
                onClick={() => finish(current)}
                className={`min-h-11 px-2 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
              >
                {t("questions.skip")}
              </button>
            </div>
            <div
              role="progressbar"
              aria-label={t("questions.progressLabel")}
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-valuenow={done.length + 1}
              className="flex gap-1.5"
            >
              {steps.map((id, i) => (
                <span
                  key={id}
                  className={`h-1 flex-1 rounded-full ${
                    i <= done.length
                      ? "bg-interaction-main-default"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <Drawer.Title className="text-[22px] font-bold leading-7 text-gray-800">
              {getPrompt(current, recipientName)}
            </Drawer.Title>
            {schemesAffected.length > 0 && (
              <Drawer.Description className="text-sm leading-5 text-gray-600">
                {current === ProfileQuestionId.ADL_NEEDS &&
                  t("questions.pickAll")}
                {t("questions.letsUsCheck", {
                  count: schemesAffected.length,
                  example: schemesAffected[0].scheme.name,
                })}
              </Drawer.Description>
            )}

            {renderBody()}

            {showNotSure && (
              <button
                type="button"
                onClick={() => {
                  setAnswer(current as never, NOT_SURE as never);
                  finish(current);
                }}
                className={`flex min-h-11 items-center gap-2.5 py-2.5 text-left text-[15px] text-gray-600 ${FOCUS_RING}`}
              >
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded border border-gray-400 bg-white"
                />
                {current === ProfileQuestionId.ADL_NEEDS
                  ? t("questions.notSure")
                  : t("questions.notSureYet")}
              </button>
            )}

            {current === ProfileQuestionId.ADL_NEEDS && (
              <div className="flex items-start gap-2 rounded-[10px] bg-blue-50 p-3 text-[13px] leading-[18px] text-gray-600">
                <SchemeIcon name="info-sheet" size={16} />
                <p>{t("questions.noDocsNeeded")}</p>
              </div>
            )}

            {showContinue && (
              <Button
                className="w-full"
                isDisabled={!canContinue}
                onClick={save}
              >
                {t("questions.continue")}
              </Button>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
