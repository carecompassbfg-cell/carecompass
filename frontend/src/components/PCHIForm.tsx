import { useEffect, useState } from "react";
import { Button, FormLabel, NumberInput } from "@opengovsg/design-system-react";
import { api } from "@/api";
import { PCHIBase, PCHIFormData } from "@/types/pchi";
import { QuestionIcon } from "@chakra-ui/icons";
import CustomMarkdown from "@/ui/CustomMarkdown";
import MobileTooltip from "./MobileTooltip";

interface PCHIFormProps {
  data?: PCHIFormData;
  callbackFn?: () => void;
}

export function PCHIForm({ data, callbackFn }: PCHIFormProps) {
  const [pchi, setPchi] = useState<PCHIFormData>({
    householdSize: null,
    totalMonthlyHouseholdIncome: null,
    annualPropertyValue: null,
    monthlyPchi: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (data) {
      setPchi(data);
    }
  }, [data]);

  const needAnnualPropertyValue = pchi.totalMonthlyHouseholdIncome === 0;
  const canSubmit =
    pchi.householdSize !== null &&
    pchi.totalMonthlyHouseholdIncome !== null &&
    (needAnnualPropertyValue ? pchi.annualPropertyValue !== null : true);

  const submitPchi = () => {
    setIsSubmitting(true);
    const pchiPayload: PCHIBase = {
      householdSize: (pchi.householdSize ?? 0) + 1,
      totalMonthlyHouseholdIncome: pchi.totalMonthlyHouseholdIncome ?? 0,
      annualPropertyValue: pchi.annualPropertyValue,
      monthlyPchi: Math.floor(
        (pchi.totalMonthlyHouseholdIncome ?? 0) /
          ((pchi.householdSize ?? 0) + 1),
      ),
    };

    // TODO: handle error and case where user is not found
    api
      .put("/users/me/pchi", pchiPayload)
      .then(() => {
        callbackFn?.();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div>
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <FormLabel marginBottom={0} isRequired>
            How many people live with your loved one?
          </FormLabel>
          <span className="text-sm leading-tight text-gray-500">
            E.g. if your loved one lives alone, type ‘0’. If one other person
            lives with your loved one, type ’1’
          </span>
        </div>
        <NumberInput
          value={pchi.householdSize ?? ""}
          min={0}
          onChange={(e) => {
            const v = parseInt(e);
            setPchi({
              ...pchi,
              householdSize: isNaN(v) ? null : v,
            });
          }}
        />
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <FormLabel marginBottom={0} marginTop={4} isRequired>
            What is the total monthly household income of everyone living with
            your loved one?
          </FormLabel>
          <span className="text-sm leading-tight text-gray-500">
            Include your loved one’s income as well
          </span>
        </div>
        <NumberInput
          value={pchi.totalMonthlyHouseholdIncome ?? ""}
          min={0}
          step={100}
          onChange={(e) => {
            const v = parseInt(e);
            setPchi({
              ...pchi,
              totalMonthlyHouseholdIncome: isNaN(v) ? null : v,
            });
          }}
        />
      </section>
      {(needAnnualPropertyValue || pchi.annualPropertyValue !== null) && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <FormLabel marginBottom={0} marginTop={4} isRequired>
              What is the Annual Value of your residential property?&nbsp;
              <MobileTooltip
                label="Annual Value is the estimated gross annual rent of a property if it were to be rented out, excluding furnishings and maintenance fees. It is determined by IRAS, and may be checked via IRAS website. Subsidy levels in 2024 will be determined using 2023 Annual Values"
                placement="top"
              >
                <QuestionIcon color="gray.500" w={4} h={4} />
              </MobileTooltip>
            </FormLabel>
            <CustomMarkdown
              content="Check your property's Annual Value on [IRAS](https://mytax.iras.gov.sg/ESVWeb/default.aspx)"
              className="text-sm leading-tight text-gray-500"
            />
          </div>
          <NumberInput
            value={pchi.annualPropertyValue ?? ""}
            min={0}
            step={1000}
            onChange={(e) => {
              const v = parseInt(e);
              setPchi({
                ...pchi,
                annualPropertyValue: isNaN(v) ? null : v,
              });
            }}
          />
        </section>
      )}
      <Button
        className="mt-4 w-full"
        onClick={submitPchi}
        isDisabled={!canSubmit}
        isLoading={isSubmitting}
      >
        Save
      </Button>
    </div>
  );
}
