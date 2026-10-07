"use client";

import { useEffect, useState } from "react";
import { Box, Flex, Stack } from "@chakra-ui/react";
import { Button, Checkbox } from "@opengovsg/design-system-react";
import { useRouter } from "next/navigation";
import { QuestionIcon } from "@chakra-ui/icons";
import BackButton from "@/ui/button/BackButton";
import MobileTooltip from "@/components/MobileTooltip";
import { t } from "@/i18n";
import { getServiceDescription, getServiceLabel } from "@/types/homecare";

const HOME_CARE_SERVICE_IDS = [
  "home-medical",
  "home-nursing",
  "home-therapy",
  "home-personal-care",
  "medical-escort",
  "dementia-enrichment",
];

const getHomeCareServices = () =>
  HOME_CARE_SERVICE_IDS.map((id) => ({
    id,
    label: getServiceLabel(id),
    description: getServiceDescription(id),
  }));

export default function HomeCareServices() {
  const router = useRouter();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    router.prefetch(`/careservice/homecare`);
  }, [router]);

  const handleServiceChange = (serviceId: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  const handleProceed = () => {
    const queryParams = new URLSearchParams();
    queryParams.set("services", selectedServices.join(","));
    router.push(`/careservice/homecare?${queryParams.toString()}`);
  };

  return (
    <div className="h-full w-full overflow-auto bg-white p-8">
      <section className="flex flex-col gap-4">
        <BackButton />
        <h1 className="text-2xl font-semibold leading-tight text-brand-primary-500">
          {t("homecare.picker.title")}
        </h1>
        <span className="leading-tight">{t("homecare.picker.pickOne")}</span>

        <Stack direction="column" spacing={1}>
          {getHomeCareServices().map((service) => (
            <div key={service.id}>
              <Flex align="flex-start" gap={1}>
                <Checkbox
                  isChecked={selectedServices.includes(service.id)}
                  onChange={() => handleServiceChange(service.id)}
                  width="-moz-fit-content"
                >
                  <span className="-pr-1 font-semibold">{service.label}</span>
                </Checkbox>
                <Box mt={2}>
                  <MobileTooltip label={service.description} placement="top">
                    <QuestionIcon color="gray.500" w={5} h={5} />
                  </MobileTooltip>
                </Box>
              </Flex>
            </div>
          ))}
        </Stack>
        <Button
          onClick={handleProceed}
          className="mt-4"
          isDisabled={selectedServices.length === 0}
        >
          {t("homecare.picker.proceed")}
        </Button>
      </section>
    </div>
  );
}
