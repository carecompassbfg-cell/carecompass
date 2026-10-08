"use client";

import { api } from "@/api";
import SGWBanner from "@/components/SGWBanner";
import { DDCBase } from "@/types/ddc";
import { ReviewTargetType } from "@/types/review";
import { BackButton, BookmarkButton } from "@/ui/button";
import LoadingSpinner from "@/ui/loading";
import { constructAddress } from "@/util/address";
import { Button } from "@chakra-ui/react";
import { BxRightArrowAlt, Input } from "@opengovsg/design-system-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { t } from "@/i18n";
import {
  haversineKm,
  isPostalCode,
  LatLng,
  lookupPostalCode,
} from "@/util/geo";

type PostalLookup =
  | { status: "idle" | "loading" | "notFound" | "error" }
  | { status: "found"; coords: LatLng };

export default function DementiaDaycarePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [centres, setCentres] = useState<DDCBase[]>([]);
  const [postalLookup, setPostalLookup] = useState<PostalLookup>({
    status: "idle",
  });

  useEffect(() => {
    router.prefetch("/careservice/dementia-daycare/[centreId]");
  }, [router]);

  useEffect(() => {
    setIsLoading(true);
    api
      .get<DDCBase[]>("/services/dementia-daycare")
      .then((response) => setCentres(response.data ?? []))
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // A 6-digit query is treated as the user's own postal code: look it up and
  // list every centre by distance from it, instead of text-matching centres.
  const trimmedQuery = query.trim();
  const postalQuery = isPostalCode(trimmedQuery) ? trimmedQuery : null;

  useEffect(() => {
    setPostalLookup({ status: "idle" });
    if (!postalQuery) return;

    const controller = new AbortController();
    setPostalLookup({ status: "loading" });
    lookupPostalCode(postalQuery, controller.signal)
      .then((coords) =>
        setPostalLookup(
          coords ? { status: "found", coords } : { status: "notFound" },
        ),
      )
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setPostalLookup({ status: "error" });
      });
    return () => controller.abort();
  }, [postalQuery]);

  const visibleCentres: { centre: DDCBase; distanceKm?: number }[] =
    useMemo(() => {
      if (postalQuery) {
        if (postalLookup.status !== "found") return [];
        const home = postalLookup.coords;
        return centres
          .map((centre) => ({
            centre,
            distanceKm: haversineKm(home, { lat: centre.lat, lng: centre.lng }),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }

      const q = trimmedQuery.toLowerCase();
      return centres
        .filter(
          (centre) =>
            centre.name.toLowerCase().includes(q) ||
            centre.block?.toLowerCase().includes(q) ||
            centre.streetName?.toLowerCase().includes(q) ||
            centre.buildingName?.toLowerCase().includes(q) ||
            centre.postalCode.toLowerCase().includes(q),
        )
        .map((centre) => ({ centre }));
    }, [centres, postalQuery, postalLookup, trimmedQuery]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4 bg-white p-6">
      <BackButton />
      <h1 className="text-xl font-semibold">{t("daycare.list.title")}</h1>
      <Input
        placeholder={t("daycare.list.searchPlaceholder")}
        value={query}
        inputMode="search"
        onChange={(e) => setQuery(e.target.value)}
      />
      {postalQuery && postalLookup.status === "loading" && <LoadingSpinner />}
      {postalQuery && postalLookup.status === "found" && (
        <span className="text-sm text-gray-600">
          {t("daycare.list.nearPostal", { postal: postalQuery })}
        </span>
      )}
      {postalQuery && postalLookup.status === "notFound" && (
        <span className="text-sm text-red-600">
          {t("daycare.list.postalNotFound", { postal: postalQuery })}
        </span>
      )}
      {postalQuery && postalLookup.status === "error" && (
        <span className="text-sm text-red-600">
          {t("daycare.list.postalLookupError")}
        </span>
      )}
      {!postalQuery && visibleCentres.length === 0 && (
        <span className="text-sm text-gray-600">
          {t("daycare.list.noResults")}
        </span>
      )}
      <div className="flex flex-col divide-y divide-solid">
        {visibleCentres.map(({ centre, distanceKm }) => (
          <CentreCard key={centre.id} centre={centre} distanceKm={distanceKm} />
        ))}
      </div>
      {/* TODO: fix this hack */}
      <div className="pb-8">
        <SGWBanner />
      </div>
    </div>
  );
}

function CentreCard({
  centre,
  distanceKm,
}: {
  centre: DDCBase;
  distanceKm?: number;
}) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/careservice/dementia-daycare/${centre.id}`);
  };

  const address = constructAddress(
    centre.postalCode,
    centre.block,
    centre.streetName,
    centre.buildingName,
    centre.unitNo,
  );

  return (
    <div className="flex flex-col gap-4 py-4">
      <span className="text-lg font-semibold">{centre.name}</span>
      <div className="flex flex-col gap-2">
        <span>{address}</span>
        {distanceKm !== undefined && (
          <span className="text-sm font-semibold text-brand-primary-500">
            {t("daycare.list.kmAway", { km: distanceKm.toFixed(1) })}
          </span>
        )}
        <div className="flex pt-4">
          <BookmarkButton
            targetId={centre.id}
            targetType={ReviewTargetType.DEMENTIA_DAY_CARE}
            title={centre.name}
            link={`/careservice/dementia-daycare/${centre.id}`}
            variant="link"
          />
          <Button
            variant="link"
            rightIcon={<BxRightArrowAlt fontSize="1.5rem" />}
            marginLeft="auto"
            onClick={handleViewDetails}
          >
            {t("provider.viewDetails")}
          </Button>
        </div>
      </div>
    </div>
  );
}
