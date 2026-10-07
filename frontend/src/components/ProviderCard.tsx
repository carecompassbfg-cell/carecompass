import { Button, Divider } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { HomeCareDetail } from "@/types/homecare";
import { BookmarkButton } from "@/ui/button";
import { ReviewTargetType } from "@/types/review";
import { BxRightArrowAlt } from "@opengovsg/design-system-react";
import ReviewScore from "./ReviewScore";
import { t } from "@/i18n";

interface ProviderCardProps {
  provider: HomeCareDetail;
  baseUrl: string;
}

export function ProviderCard({ provider, baseUrl }: ProviderCardProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`${baseUrl}/${provider.id}`);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">{provider.name}</h2>
      <ReviewScore
        rating={provider.rating}
        reviewCount={provider.reviewCount}
      />
      {/* Services Offered */}
      <div>
        <h3 className="mb-2 text-sm font-bold">
          {t("provider.servicesOffered")}
        </h3>
        <div className="flex flex-col gap-1">
          {provider.services?.map((service) => (
            <div key={service} className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-emerald-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" className="fill-current" />
                <path
                  d="M16.707 9.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 111.414-1.414L10.5 13.086l4.293-4.293a1 1 0 011.414 0z"
                  fill="white"
                />
              </svg>
              <span>{service}</span>
            </div>
          ))}
        </div>
      </div>
      <Divider />
      {/* More Details and Save Button */}
      <div className="flex">
        <BookmarkButton
          targetId={provider.id}
          targetType={ReviewTargetType.DEMENTIA_HOME_CARE}
          title={provider.name}
          link={`/careservice/homecare/${provider.id}`}
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
