"use client";

import { api } from "@/api";
import ReviewScore from "@/components/ReviewScore";
import SGWBanner from "@/components/SGWBanner";
import { DDCRecommendation } from "@/types/ddc";
import { ReviewTargetType } from "@/types/review";
import { BackButton, BookmarkButton } from "@/ui/button";
import LoadingSpinner from "@/ui/loading";
import { constructAddress } from "@/util/address";
import { formatPriceRange } from "@/util/priceInfo";
import { Divider } from "@chakra-ui/react";
import {
  Badge,
  Button,
  BxRightArrowAlt,
  Input,
  Textarea,
} from "@opengovsg/design-system-react";
import Image from "next/image";
import {
  ReadonlyURLSearchParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import HomeCareServices from "./homecareService";
import { useAuthStore } from "@/stores/auth";
import useSignInOnlyFeaturePrompt from "@/util/hooks/useSignInOnlyFeaturePrompt";
import { t } from "@/i18n";

type CareServiceKey = "daycare" | "homecare" | "fdw" | "nursingHome";

type CareServiceData = {
  key: CareServiceKey;
  title: string;
  description: string;
  eligibleForSubsidies: boolean;
  icon: string;
  enabled: boolean;
  isSignInRequired: boolean;
};

type Stepper = {
  increment: () => void;
  decrement: () => void;
};

type Params = {
  value: ReadonlyURLSearchParams;
  append: (name: string, value: string) => URLSearchParams;
  remove: (name: string) => URLSearchParams;
};

// Title and description are getters so they follow the chosen language
const careServiceDataList: CareServiceData[] = [
  {
    key: "daycare",
    get title() {
      return t("careservice.service.daycare.title");
    },
    get description() {
      return t("careservice.service.daycare.description");
    },
    eligibleForSubsidies: true,
    icon: "/icon/daycare.svg",
    enabled: true,
    isSignInRequired: false,
  },
  {
    key: "homecare",
    get title() {
      return t("careservice.service.homecare.title");
    },
    get description() {
      return t("careservice.service.homecare.description");
    },
    icon: "/icon/homecare.svg",
    enabled: true,
    eligibleForSubsidies: true,
    isSignInRequired: true,
  },
  {
    key: "fdw",
    get title() {
      return t("careservice.service.fdw.title");
    },
    get description() {
      return t("careservice.service.fdw.description");
    },
    icon: "/icon/careworker.svg",
    enabled: false,
    eligibleForSubsidies: false,
    isSignInRequired: true,
  },
  {
    key: "nursingHome",
    get title() {
      return t("careservice.service.nursingHome.title");
    },
    get description() {
      return t("careservice.service.nursingHome.description");
    },
    icon: "/icon/nursinghome.svg",
    enabled: false,
    eligibleForSubsidies: false,
    isSignInRequired: true,
  },
];

// Sentry element names for each option (not shown to users)
const SENTRY_ELEMENTS: Record<CareServiceKey, string> = {
  daycare: "CTA-Daycare",
  homecare: "CTA-Homecare",
  fdw: "CTA-FDW",
  nursingHome: "CTA-NursingHome",
};

export default function CareServiceRecommender() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedService = searchParams.get("service");

  const handleServiceSelection = (service: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("service", service);
    router.push("?" + params.toString());
  };

  if (selectedService === "Home Care Services") {
    return <HomeCareServices />;
  }

  const sections = [
    CareServiceOverview,
    DaycareLocationPreference,
    DaycareOtherPreferences,
    DaycareRecommendations,
  ];

  const step = searchParams.get("step")
    ? parseInt(searchParams.get("step") as string)
    : 0;

  const appendQueryParam = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params;
  };

  const removeQueryParam = (name: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(name);
    return params;
  };

  const param: Params = {
    value: searchParams,
    append: appendQueryParam,
    remove: removeQueryParam,
  };

  const incrementIndex = () => {
    const p = new URLSearchParams(param.value.toString());
    const currentStep = parseInt(p.get("step") || "0");

    let nextStep = 0;
    if (currentStep === 0) {
      nextStep = 1;
    } else if (currentStep === 1 && p.has("prefLoc")) {
      nextStep = 2;
    } else if (
      (currentStep === 1 || currentStep === 2) &&
      p.has("prefPickupDropoff")
    ) {
      nextStep = 3;
    } else if (currentStep === 3 && (p.has("pickup") || p.has("dropoff"))) {
      nextStep = 4;
    } else if (
      (currentStep === 1 || currentStep === 2 || currentStep === 4) &&
      p.has("prefPrice")
    ) {
      nextStep = 5;
    } else {
      nextStep = 6;
    }

    if (nextStep < sections.length) {
      p.set("step", String(nextStep));
      router.push("?" + p.toString());
    }
  };

  const decrementIndex = () => {
    router.back();
  };

  const stepper: Stepper = {
    increment: incrementIndex,
    decrement: decrementIndex,
  };

  function CareServiceOverview({ stepper }: DrawerSectionProps) {
    return (
      <section className="flex flex-col">
        <BackButton />
        <span className="py-4 text-2xl font-semibold leading-tight text-brand-primary-500">
          {t("careservice.overview.title")}
        </span>
        <div className="mt-4 flex flex-col gap-2">
          {careServiceDataList.map((service, index) => (
            <CareServiceButton
              key={index}
              service={service}
              incrementIndex={stepper.increment}
            />
          ))}
        </div>
      </section>
    );
  }

  function CareServiceButton({
    service,
    incrementIndex,
  }: {
    service: CareServiceData;
    incrementIndex: () => void;
  }) {
    const isSignedIn = useAuthStore((state) => state.isSignedIn);
    const isDisbledDueToNotImplemented = !service.enabled;
    const isDisabledDueToNotSignedIn = !isSignedIn && service.isSignInRequired;
    const isDisabled =
      isDisbledDueToNotImplemented || isDisabledDueToNotSignedIn;

    const handleClick = () => {
      if (service.key === "homecare") {
        // URL value, not shown to users
        handleServiceSelection("Home Care Services");
      } else {
        incrementIndex();
      }
    };

    return (
      <button
        className={`flex place-content-start place-items-start gap-2 rounded-md border border-gray-200 p-4 text-left ${isDisabled && "opacity-50 grayscale"} transition-all duration-150 hover:bg-gray-50`}
        onClick={handleClick}
        disabled={isDisabled}
        data-sentry-component="CareServiceButton"
        data-sentry-element={SENTRY_ELEMENTS[service.key]}
      >
        <Image src={service.icon} alt="ds" width={40} height={40} />
        <div className="flex flex-col gap-2">
          <span className="text-lg font-semibold">{service.title}</span>
          <span>{service.description}</span>
          <div className="flex flex-row flex-wrap gap-2">
            {service.eligibleForSubsidies && (
              <Badge
                colorScheme={isDisabled ? "neutral" : "success"}
                variant="subtle"
              >
                {t("careservice.badge.subsidies")}
              </Badge>
            )}
            {isDisabledDueToNotSignedIn && (
              <Badge colorScheme="neutral" variant="subtle">
                {t("careservice.badge.signInRequired")}
              </Badge>
            )}
          </div>
          {isDisbledDueToNotImplemented && (
            <span className="text-sm italic">
              {t("careservice.notAvailable")}
            </span>
          )}
        </div>
      </button>
    );
  }

  function DaycareLocationPreference() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [postalCode, setPostalCode] = useState(
      searchParams.get("home") || "",
    );

    const isValidPostalCode =
      postalCode.length === 6 && !isNaN(Number(postalCode));

    return (
      <section className="flex flex-col gap-4">
        <BackButton />
        <span className="text-lg font-semibold leading-tight text-gray-500">
          {t("careservice.location.intro")}
        </span>
        <span className="text-2xl font-semibold leading-tight text-brand-primary-500">
          {t("careservice.location.question")}
        </span>
        <Input
          placeholder={t("careservice.location.placeholder")}
          value={postalCode}
          onChange={(e) => {
            setPostalCode(e.target.value);
          }}
        />
        <div className="mt-4 flex w-full gap-2">
          <Button
            onClick={() => {
              const p = new URLSearchParams(searchParams.toString());
              p.set("step", "2");
              router.push("?" + p.toString());
            }}
            className="w-[calc(50%-4px)]"
            variant="outline"
          >
            {t("careservice.skip")}
          </Button>
          <Button
            className="w-[calc(50%-4px)]"
            isDisabled={!isValidPostalCode}
            onClick={() => {
              const p = new URLSearchParams(searchParams.toString());
              p.set("home", postalCode);
              // Temporary fix to set the step to 6 without triggering the increment function
              p.set("step", "2");
              router.replace("?" + p.toString());
            }}
          >
            {t("careservice.next")}
          </Button>
        </div>
      </section>
    );
  }

  function DaycareOtherPreferences() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [otherPreferences, setOtherPreferences] = useState("");

    return (
      <section className="flex flex-col gap-4">
        <BackButton />
        <span className="text-lg font-semibold leading-tight text-gray-500">
          {t("careservice.other.intro")}
        </span>
        <span className="text-2xl font-semibold leading-tight text-brand-primary-500">
          {t("careservice.other.question")}
        </span>
        {/* This is just a placeholder for now */}
        <Textarea
          rows={5}
          value={otherPreferences}
          onChange={(e) => setOtherPreferences(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={() => {
            if (otherPreferences.length > 0) {
              posthog.capture("daycare_preferences", {
                data: otherPreferences,
              });
            }
            const p = new URLSearchParams(searchParams.toString());
            // Temporary fix to set the step to 6 without triggering the increment function
            p.set("step", "3");
            router.replace("?" + p.toString());
          }}
        >
          {t("careservice.next")}
        </Button>
      </section>
    );
  }

  function DaycareRecommendations({ param }: DrawerSectionProps) {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [recommendations, setRecommendations] = useState<DDCRecommendation[]>(
      [],
    );
    const [loadError, setLoadError] = useState<
      "postalNotFound" | "other" | null
    >(null);

    const homePostalCode = param.value.get("home");

    useEffect(() => {
      router.prefetch("/careservice/dementia-daycare/[centreId]");
    }, [router]);

    useEffect(() => {
      api
        .post<DDCRecommendation[]>(
          "/services/dementia-daycare/recommendations",
          { location: homePostalCode },
        )
        .then((response) => {
          setRecommendations(response.data ?? []);
          setLoadError(null);
        })
        .catch((error) => {
          console.error(error);
          setLoadError(
            homePostalCode && error?.response?.status === 400
              ? "postalNotFound"
              : "other",
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, [homePostalCode]);

    const handleShowAll = () => {
      router.push("/careservice/dementia-daycare");
    };

    if (isLoading) {
      return <LoadingSpinner />;
    }

    return (
      <section className="flex flex-col gap-4">
        <BackButton />
        <span className="text-lg font-semibold leading-tight text-gray-500">
          {t("careservice.recommendations.intro")}
        </span>
        <span className="text-2xl font-semibold leading-tight text-brand-primary-500">
          {t("careservice.recommendations.title")}
        </span>
        {loadError && (
          <span className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
            {loadError === "postalNotFound"
              ? t("careservice.recommendations.postalNotFound", {
                  postal: homePostalCode ?? "",
                })
              : t("careservice.recommendations.loadError")}
          </span>
        )}
        <div className="flex flex-col gap-4">
          {recommendations.map((centre, index) => (
            <DaycareRecommendationCard key={index} centre={centre} />
          ))}
        </div>
        <Button variant="outline" onClick={handleShowAll}>
          {t("careservice.recommendations.showAll")}
        </Button>
        {/* TODO: fix this hack */}
        <div className="pb-8">
          <SGWBanner />
        </div>
      </section>
    );
  }

  function DaycareRecommendationCard({
    centre,
  }: {
    centre: DDCRecommendation;
  }) {
    const router = useRouter();
    const { promptIfNotSignedIn } = useSignInOnlyFeaturePrompt();

    useEffect(() => {
      router.prefetch(`/careservice/dementia-daycare/${centre.id}`);
    }, [router, centre.id]);

    const parseDistance = (distance: number) => {
      return t("careservice.card.km", { km: (distance / 1000).toFixed(1) });
    };

    const parseDuration = (duration: number) => {
      const minutes = Math.floor(duration / 60);
      return t("careservice.card.minutes", { minutes });
    };

    const handleViewDetails = () => {
      if (promptIfNotSignedIn()) {
        return;
      }
      router.push(`/careservice/dementia-daycare/${centre.id}`);
    };

    const address = constructAddress(
      centre.postalCode,
      centre.block,
      centre.streetName,
      centre.buildingName,
      centre.unitNo,
    );
    // Without a driving time the distance is a straight-line estimate
    // (route lookup unavailable), so it's labelled "about".
    const hasDistance =
      centre.distanceFromHome !== undefined && centre.distanceFromHome !== null;
    const hasDrivingTime =
      centre.drivingDuration !== undefined && centre.drivingDuration !== null;
    const hasTransitTime =
      centre.transitDuration !== undefined && centre.transitDuration !== null;
    const distance = hasDistance
      ? t(
          hasDrivingTime
            ? "careservice.card.awayFromHome"
            : "careservice.card.awayFromHomeApprox",
          { distance: parseDistance(centre.distanceFromHome!) },
        )
      : "";

    return (
      <div className="flex flex-col gap-4 rounded-md border border-gray-200 p-4">
        <span className="text-lg font-semibold">{centre.name}</span>
        {centre.reviewCount > 0 && (
          <ReviewScore
            rating={centre.averageRating}
            reviewCount={centre.reviewCount}
          />
        )}
        {centre.minPrice !== null && (
          <div className="flex flex-col gap-2">
            <span>
              <b>
                {t("price.fromPerMonthPreSubsidy", {
                  price: formatPriceRange(centre.minPrice, centre.maxPrice),
                })}
              </b>
            </span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span>
            {address} {distance}
          </span>
          {hasDrivingTime && (
            <div className="flex flex-col rounded border border-brand-primary-400 bg-brand-primary-50 p-4">
              <span>
                {hasTransitTime
                  ? t.rich("careservice.card.travel", {
                      car: parseDuration(centre.drivingDuration!),
                      transit: parseDuration(centre.transitDuration!),
                      b: (chunks) => <b>{chunks}</b>,
                    })
                  : t.rich("careservice.card.travelCar", {
                      car: parseDuration(centre.drivingDuration!),
                      b: (chunks) => <b>{chunks}</b>,
                    })}
              </span>
            </div>
          )}
        </div>
        <Divider />
        <div className="flex">
          <BookmarkButton
            targetId={centre.id}
            targetType={ReviewTargetType.DEMENTIA_DAY_CARE}
            title={centre.name}
            link={`/careservice/dementia-daycare/${centre.id}`}
            variant="clear"
          />
          <Button
            variant="clear"
            rightIcon={<BxRightArrowAlt fontSize="1.5rem" />}
            marginLeft="auto"
            onClick={handleViewDetails}
          >
            {t("provider.viewDetails")}
          </Button>
        </div>
      </div>
    );
  }

  const SectionComponent = sections[step];

  return (
    <div className="h-full w-full overflow-auto bg-white p-8">
      <SectionComponent stepper={stepper} param={param} />
    </div>
  );
}

type DrawerSectionProps = { stepper: Stepper; param: Params };
