import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@opengovsg/design-system-react";
import { SignInButton } from "@clerk/nextjs";
import { PCHIForm } from "@/components/PCHIForm";
import {
  AdlActivity,
  HousingType,
  LtcInsurance,
  NOT_SURE,
  SchemeAnswers,
  useSchemeAnswersStore,
  YesNoNotSure,
} from "@/stores/schemeAnswers";
import { ProfileQuestionId } from "@/types/scheme";
import { capitalise } from "@/util/recipient";
import { SchemeWithStatus } from "@/util/schemeCatalog";
import SchemeIcon, { FOCUS_RING } from "./SchemeIcon";

interface Option<T extends string> {
  value: T;
  label: string;
}

const ADL_OPTIONS: Option<AdlActivity>[] = [
  { value: "bathing", label: "Bathing" },
  { value: "dressing", label: "Dressing" },
  { value: "eating", label: "Eating" },
  { value: "toileting", label: "Using the toilet" },
  { value: "moving_around", label: "Moving around the home" },
  { value: "transferring", label: "Getting in and out of bed" },
];

const FAR_OPTIONS: Option<YesNoNotSure>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: NOT_SURE, label: "Not sure" },
];

const HOUSING_OPTIONS: Option<HousingType>[] = [
  { value: "hdb", label: "HDB flat" },
  { value: "private", label: "Private property" },
  { value: "other", label: "Other" },
];

const LTC_OPTIONS: Option<LtcInsurance>[] = [
  { value: "eldershield", label: "ElderShield" },
  { value: "careshield_life", label: "CareShield Life" },
  { value: "neither", label: "Neither" },
  { value: NOT_SURE, label: "Not sure" },
];

const getPrompt = (id: ProfileQuestionId, name: string): string => {
  switch (id) {
    case ProfileQuestionId.HOUSEHOLD_INCOME:
      return `What is ${name}'s household income?`;
    case ProfileQuestionId.ADL_NEEDS:
      return `Does ${name} need help with any of these every day?`;
    case ProfileQuestionId.HAS_FAR:
      return `Does ${name} have a Functional Assessment Report?`;
    case ProfileQuestionId.HOUSING_TYPE:
      return `What type of home does ${name} live in?`;
    case ProfileQuestionId.LTC_INSURANCE:
      return `Is ${name} covered by long-term care insurance?`;
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

// Bottom sheet that asks one profile question at a time.
// Answers stay in useSchemeAnswersStore for this session only, except
// household income, which saves to the profile through the existing PCHIForm.
export default function QuestionSheet({
  isOpen,
  onClose,
  questions,
  startAt,
  items,
  recipientName,
  isSignedIn,
  onIncomeSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  questions: ProfileQuestionId[];
  startAt?: ProfileQuestionId;
  items: SchemeWithStatus[];
  recipientName: string;
  isSignedIn: boolean;
  onIncomeSaved: () => Promise<void>;
}) {
  const answers = useSchemeAnswersStore((state) => state.answers);
  const setAnswer = useSchemeAnswersStore((state) => state.setAnswer);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<SchemeAnswers>({});

  // Start from the requested question each time the sheet opens
  useEffect(() => {
    if (isOpen) {
      const start = startAt ? questions.indexOf(startAt) : 0;
      setIndex(Math.max(start, 0));
      setDraft(answers);
    }
    // Only reset when the sheet opens, not while answering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const total = questions.length;
  const current = questions[index];

  const next = () => {
    if (index + 1 >= total) {
      onClose();
    } else {
      setIndex(index + 1);
    }
  };

  const saveAndNext = <K extends keyof SchemeAnswers>(
    id: K,
    value: SchemeAnswers[K],
  ) => {
    setAnswer(id, value);
    next();
  };

  if (!current) return null;

  const schemesAffected = items.filter(({ status }) =>
    status.questionsToAsk.includes(current),
  );
  const adl = draft[ProfileQuestionId.ADL_NEEDS];
  const adlSelected = Array.isArray(adl) ? adl : [];

  const renderBody = () => {
    switch (current) {
      case ProfileQuestionId.HOUSEHOLD_INCOME:
        return isSignedIn ? (
          <PCHIForm
            callbackFn={async () => {
              setAnswer(ProfileQuestionId.HOUSEHOLD_INCOME, "saved");
              await onIncomeSaved();
              next();
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-600">
              Sign in to share household income. It is saved to your profile so
              you only need to tell us once.
            </p>
            <SignInButton>
              <Button className="w-full">Sign in</Button>
            </SignInButton>
          </div>
        );
      case ProfileQuestionId.ADL_NEEDS:
        return (
          <div className="flex flex-col gap-2.5">
            {ADL_OPTIONS.map((option) => (
              <CheckboxOption
                key={option.value}
                label={option.label}
                checked={adlSelected.includes(option.value)}
                onChange={(checked) =>
                  setDraft({
                    ...draft,
                    [ProfileQuestionId.ADL_NEEDS]: checked
                      ? [...adlSelected, option.value]
                      : adlSelected.filter((value) => value !== option.value),
                  })
                }
              />
            ))}
          </div>
        );
      case ProfileQuestionId.HAS_FAR:
        return (
          <RadioOptions
            name="has_far"
            options={FAR_OPTIONS}
            value={draft[ProfileQuestionId.HAS_FAR]}
            onChange={(value) =>
              setDraft({ ...draft, [ProfileQuestionId.HAS_FAR]: value })
            }
          />
        );
      case ProfileQuestionId.HOUSING_TYPE:
        return (
          <RadioOptions
            name="housing_type"
            options={HOUSING_OPTIONS}
            value={draft[ProfileQuestionId.HOUSING_TYPE]}
            onChange={(value) =>
              setDraft({ ...draft, [ProfileQuestionId.HOUSING_TYPE]: value })
            }
          />
        );
      case ProfileQuestionId.LTC_INSURANCE:
        return (
          <RadioOptions
            name="ltc_insurance"
            options={LTC_OPTIONS}
            value={draft[ProfileQuestionId.LTC_INSURANCE]}
            onChange={(value) =>
              setDraft({ ...draft, [ProfileQuestionId.LTC_INSURANCE]: value })
            }
          />
        );
      default:
        return null;
    }
  };

  const draftValue = draft[current as keyof SchemeAnswers];
  const canContinue =
    current === ProfileQuestionId.ADL_NEEDS
      ? adlSelected.length > 0
      : draftValue !== undefined;
  // Household income has its own Save button inside PCHIForm
  const showContinue = current !== ProfileQuestionId.HOUSEHOLD_INCOME;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-gray-600">
                Question {index + 1} of {total}
              </p>
              <button
                type="button"
                onClick={next}
                className={`min-h-11 px-2 text-sm font-semibold text-interaction-links-default ${FOCUS_RING}`}
              >
                Skip
              </button>
            </div>
            <div
              role="progressbar"
              aria-label="Progress"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={index + 1}
              className="flex gap-1.5"
            >
              {questions.map((id, i) => (
                <span
                  key={id}
                  className={`h-1 flex-1 rounded-full ${
                    i <= index ? "bg-interaction-main-default" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
            <Drawer.Title className="text-[22px] font-bold leading-7 text-gray-800">
              {capitalise(getPrompt(current, recipientName))}
            </Drawer.Title>
            {schemesAffected.length > 0 && (
              <Drawer.Description className="text-sm leading-5 text-gray-600">
                {current === ProfileQuestionId.ADL_NEEDS &&
                  "Pick all that apply. "}
                This lets us check {schemesAffected.length} more{" "}
                {schemesAffected.length === 1 ? "scheme" : "schemes"}, like the{" "}
                {schemesAffected[0].scheme.name}.
              </Drawer.Description>
            )}

            {renderBody()}

            {current === ProfileQuestionId.HOUSEHOLD_INCOME ||
            current === ProfileQuestionId.ADL_NEEDS ||
            current === ProfileQuestionId.HOUSING_TYPE ? (
              <button
                type="button"
                onClick={() => saveAndNext(current, NOT_SURE as never)}
                className={`flex min-h-11 items-center gap-2.5 py-2.5 text-left text-[15px] text-gray-600 ${FOCUS_RING}`}
              >
                <span
                  aria-hidden
                  className="size-5 shrink-0 rounded border border-gray-400 bg-white"
                />
                Not sure yet
              </button>
            ) : null}

            {current === ProfileQuestionId.ADL_NEEDS && (
              <div className="flex items-start gap-2 rounded-[10px] bg-blue-50 p-3 text-[13px] leading-[18px] text-gray-600">
                <SchemeIcon name="info-sheet" size={16} />
                <p>
                  You don&apos;t need documents now. Some schemes confirm this
                  later with a Functional Assessment Report from a doctor or
                  therapist.
                </p>
              </div>
            )}

            {showContinue && (
              <Button
                className="w-full"
                isDisabled={!canContinue}
                onClick={() =>
                  saveAndNext(
                    current as keyof SchemeAnswers,
                    draftValue as never,
                  )
                }
              >
                Continue
              </Button>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
