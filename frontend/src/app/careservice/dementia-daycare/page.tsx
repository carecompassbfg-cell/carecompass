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
import { useEffect, useState } from "react";
import { t } from "@/i18n";

export default function DementiaDaycarePage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [centres, setCentres] = useState<DDCBase[]>([]);

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

  const filteredCentres = centres.filter((centre) => {
    return (
      centre.name.toLowerCase().includes(query.toLowerCase()) ||
      centre.block?.toLowerCase().includes(query.toLowerCase()) ||
      centre.streetName?.toLowerCase().includes(query.toLowerCase()) ||
      centre.buildingName?.toLowerCase().includes(query.toLowerCase()) ||
      centre.postalCode.toLowerCase().includes(query.toLowerCase())
    );
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col gap-4 bg-white p-6">
      <BackButton />
      <h1 className="text-xl font-semibold">{t("daycare.list.title")}</h1>
      <Input
        placeholder={t("daycare.list.searchPlaceholder")}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex flex-col divide-y divide-solid">
        {filteredCentres.map((centre) => (
          <CentreCard key={centre.id} centre={centre} />
        ))}
      </div>
      {/* TODO: fix this hack */}
      <div className="pb-8">
        <SGWBanner />
      </div>
    </div>
  );
}

function CentreCard({ centre }: { centre: DDCBase }) {
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
