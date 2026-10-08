"use client";

import {
  formatAddress,
  HomeCareDetail,
  transformHomeCareData,
} from "@/types/homecare";
import LoadingSpinner from "@/ui/loading";
import { Button, VisuallyHidden, VStack, Text } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Review, ReviewTargetType } from "@/types/review";
import { Drawer } from "vaul";
import { Rating } from "@smastrom/react-rating";
import { formatReviewTime, reviewSourceLabel } from "@/util/review";
import { getRatingColor } from "@/util/helper";
import { BackButton, BookmarkButton, ShareButton } from "@/ui/button";
import { BxRightArrowAlt } from "@opengovsg/design-system-react";
import { SignInButton } from "@clerk/nextjs";
import { useAuthStore } from "@/stores/auth";
import { NewReviewDrawer } from "@/components/NewReviewDrawer";
import Hidden from "@/ui/Hidden";
import { GetReviewsParams } from "@/types/api";
import { getReviews } from "@/api";
import PhotoCarousel from "@/ui/carousel/PhotoCarousel";
import { t } from "@/i18n";

export default function HomeCareDetailPage() {
  const { homecareId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [provider, setProvider] = useState<HomeCareDetail | undefined>();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch provider data
        const response = await fetch("/data/homecare1.json");
        const data = await response.json();
        const transformedData = transformHomeCareData(data);
        const selectedProvider = transformedData.find(
          (p: HomeCareDetail) => String(p.id) === String(homecareId),
        );

        if (!selectedProvider) {
          console.error("Provider not found for ID:", homecareId);
        }
        setProvider(selectedProvider);

        // Fetch reviews using API
        const reviewParams: GetReviewsParams = {
          targetType: ReviewTargetType.DEMENTIA_HOME_CARE,
          targetId: parseInt(
            Array.isArray(homecareId) ? homecareId[0] : homecareId,
          ),
          limit: 100,
        };
        const reviewsData = await getReviews(reviewParams);

        // Combine reviews from both sources, sort by published time - latest first
        const combinedReviews = [
          ...(selectedProvider?.reviews || []),
          ...reviewsData,
        ].sort(
          (a, b) =>
            new Date(b.publishedTime).getTime() -
            new Date(a.publishedTime).getTime(),
        );
        setReviews(combinedReviews);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [homecareId]);

  if (isLoading || !provider) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex min-h-screen flex-col gap-4 overflow-x-hidden bg-white p-6">
      <BackButton />
      {/* Banner Image */}
      <Hidden
        condition={
          provider.photos === undefined || provider.photos.length === 0
        }
      >
        {provider.photos && <PhotoCarousel photos={provider.photos} />}
      </Hidden>

      {/* Header with Name and Rating */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{provider.name}</h1>
        <section className="flex place-content-between gap-2">
          {provider.reviewCount > 0 && (
            <div className="flex w-full items-center gap-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-12 w-12 place-content-center place-items-center rounded p-2 text-xl font-semibold text-white"
                  style={{
                    backgroundColor: getRatingColor(provider.rating),
                  }}
                >
                  <span>
                    {provider.rating?.toFixed(1) ||
                      t("homecare.detail.notAvailable")}
                  </span>
                </div>
              </div>
              {provider.reviewCount > 0 && (
                <div className="flex flex-col gap-1">
                  <Rating
                    readOnly
                    value={provider.rating}
                    className="max-w-24"
                  />
                  <span className="text-sm">
                    {t("homecare.detail.fromReviews", {
                      count: provider.reviewCount,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="flex place-content-end place-items-center gap-2">
            <BookmarkButton
              targetId={provider.id}
              targetType={ReviewTargetType.DEMENTIA_DAY_CARE}
              title={provider.name}
              size="sm"
              variant="outline"
              mini
            />
            <ShareButton size="sm" variant="outline" />
          </div>
        </section>
      </div>

      {/* Address Section */}
      <div className="-mt-4">
        <h2 className="text-md font-bold">{t("homecare.detail.address")}</h2>
        <p className="text-gray-700">{formatAddress(provider)}</p>
      </div>

      {/* Contact Details Section */}
      <div className="-mt-2">
        <h2 className="text-md font-bold">
          {t("homecare.detail.contactDetails")}
        </h2>
        <div className="flex flex-col gap-2">
          {provider.phone && (
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              {provider.phone && (
                <span>
                  <a
                    href={`tel:+65${provider.phone}`}
                    target="_blank"
                    className="text-blue-500 underline"
                  >
                    {provider.phone}
                  </a>
                </span>
              )}
            </div>
          )}
          {provider.website && (
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 104 0 2 2 0 012-2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <span className="break-all">
                <a
                  href={provider.website}
                  target="_blank"
                  className="text-blue-500 underline"
                >
                  {provider.website}
                </a>
              </span>
            </div>
          )}
          {provider.email && (
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {provider.email && (
                <span>
                  <a
                    href={`mailto:${provider.email}`}
                    target="_blank"
                    className="text-blue-500 underline"
                  >
                    {provider.email}
                  </a>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Operating Hours Section */}
      {provider.operatingHours && (
        <div>
          <h2 className="text-md mb-1 font-bold">
            {t("homecare.detail.operatingHours")}
          </h2>
          <VStack alignItems="flex-start" gap={0}>
            {provider.operatingHours.map((hour, index) => (
              <Text key={index} className="text-gray-700">
                {hour}
              </Text>
            ))}
          </VStack>
        </div>
      )}

      {/* Financial Support Section */}
      <FinancialSupportSection />

      {/* Reviews Section */}
      <div className="mt-1">
        <ReviewSection
          reviews={reviews}
          googleRating={provider.rating}
          numOfGoogleRatings={provider.userRatingCount}
          providerId={provider.id}
        />
      </div>
    </div>
  );
}

function ReviewDetailDrawer({ review }: { review: Review }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger>
        <span className="line-clamp-4 text-left text-sm leading-tight">
          {review.content}
        </span>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-full bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="max-h-screen flex-1 gap-4 overflow-y-auto bg-white px-8 py-8 pt-6">
            <Button
              colorScheme="white"
              variant="link"
              aria-label={t("review.closeDrawer")}
              leftIcon={<ArrowLeft size={16} />}
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              {t("review.back")}
            </Button>
            <VisuallyHidden>
              <Drawer.Title className="text-xl font-semibold">
                {t("review.reviewBy", { name: review.authorName })}
              </Drawer.Title>
            </VisuallyHidden>
            <div className="flex flex-col gap-2">
              <span className="text-lg font-semibold">
                {t("review.reviewFrom", { name: review.authorName })}
              </span>
              <div className="flex gap-2">
                <Rating
                  readOnly
                  value={review.overallRating}
                  className="max-w-24"
                />
                <span className="text-sm">
                  {getRelativeTime(review.publishedTime)}
                </span>
              </div>
              <span>{review.content}</span>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const getRelativeTime = (date: string) => formatReviewTime(date);

function ReviewSection({
  reviews,
  googleRating,
  numOfGoogleRatings,
  providerId,
}: {
  reviews: Review[];
  googleRating: number;
  numOfGoogleRatings: number;
  providerId: number;
}) {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const sortedReviews = reviews.sort((a, b) => {
    return (
      new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime()
    );
  });

  const reviewCount = reviews.length;

  return (
    <section className="-mx-6 flex flex-col gap-1 bg-white">
      <div className="px-6">
        <h1 className="text-xl font-semibold">{t("review.title")}</h1>
        {reviewCount > 0 && (
          <div className="mt-3 flex place-items-center gap-4">
            <h3 className="text-5xl font-bold">{googleRating.toFixed(1)}</h3>
            <Rating readOnly value={googleRating} className="max-w-36" />
          </div>
        )}
      </div>
      <div className="mx-auto mt-3 w-[88%]">
        {isSignedIn ? (
          <NewReviewDrawer
            serviceProviderId={providerId}
            targetType={ReviewTargetType.DEMENTIA_HOME_CARE}
          />
        ) : (
          <SignInButton>
            <Button variant="solid" colorScheme="blue">
              {t("review.signInToReview")}
            </Button>
          </SignInButton>
        )}
      </div>
      <div className="px-6">
        <div className="flex flex-col divide-y divide-solid">
          {reviewCount && numOfGoogleRatings > reviewCount && (
            <span className="mt-2 text-sm italic text-gray-500">
              {t("review.showingRecentGoogle")}
            </span>
          )}
          {sortedReviews.map((review, index) => (
            <div key={index} className="flex flex-col gap-2 py-4">
              <span className="font-semibold">{review.authorName}</span>
              <div className="flex gap-2">
                <Rating
                  readOnly
                  value={review.overallRating}
                  className="max-w-24"
                />
                <span className="text-sm">
                  {getRelativeTime(review.publishedTime)}
                </span>
              </div>
              <ReviewDetailDrawer review={review} />
              <span className="text-sm text-gray-500">
                {reviewSourceLabel(review.reviewSource)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinancialSupportSection() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(`/dashboard/schemes`);
  }, [router]);

  // TODO: fetch from backend
  const SCHEMES = [
    {
      id: "MOH-NR-LTC-SUBSIDY",
      name: t("homecare.support.ltc.name"),
      description: t("homecare.support.ltc.description"),
    },
    {
      id: "HOME-CAREGIVING-GRANT",
      name: t("homecare.support.hcg.name"),
      description: t("homecare.support.hcg.description"),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold">{t("homecare.support.title")}</h1>
        <span className="text-sm text-gray-500">
          {t("homecare.support.subtitle")}
        </span>
      </div>
      <section className="flex flex-col gap-4">
        {SCHEMES.map((scheme) => (
          <button
            key={scheme.id}
            className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-4 text-left hover:bg-gray-50"
            onClick={() => router.push(`/dashboard/schemes?id=${scheme.id}`)}
          >
            <span className="font-semibold">{scheme.name}</span>
            <span className="leading-tight">{scheme.description}</span>
            <div className="flex w-full place-content-end place-items-center gap-1">
              <span className="text-sm text-brand-primary-500">
                {t("homecare.support.viewDetails")}
              </span>
              <BxRightArrowAlt className="text-brand-primary-500" />
            </div>
          </button>
        ))}
      </section>
    </section>
  );
}
