"use client";

import { DDCDetail } from "@/types/ddc";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  Button,
  FormLabel,
  Textarea,
  Checkbox,
  BxRightArrowAlt,
} from "@opengovsg/design-system-react";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/ui/loading";
import CustomMarkdown from "@/ui/CustomMarkdown";
import { SignInButton } from "@clerk/nextjs";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/api";
import { Rating } from "@smastrom/react-rating";
import {
  Review,
  ReviewCreate,
  ReviewSource,
  ReviewTargetType,
} from "@/types/review";
import moment from "moment";
import { Drawer } from "vaul";
import { ArrowLeft } from "lucide-react";
import { mapReviewSource } from "@/util/review";
import { constructAddress } from "@/util/address";
import { BackButton, BookmarkButton, ShareButton } from "@/ui/button";
import { useRouter } from "next/navigation";
import { getRatingColor } from "@/util/helper";
import Hidden from "@/ui/Hidden";
import PhotoCarousel from "@/ui/carousel/PhotoCarousel";
import { formatPriceRange } from "@/util/priceInfo";
import { UserData } from "@/types/user";
import { MohNrLtcSubsidy } from "@/types/scheme";
import { toast } from "sonner";
import { PCHIDrawer } from "@/components/PCHIDrawer";
import { t } from "@/i18n";
import { useLocaleStore } from "@/stores/locale";
import { buildMapEmbedUrl } from "@/util/mapEmbed";

export default function DaycareCentreDetails({
  params,
}: {
  params: { centreId: number };
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [centre, setCentre] = useState<DDCDetail>();
  const [subsidyInfo, setSubsidyInfo] = useState<MohNrLtcSubsidy>();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userId = useAuthStore((state) => state.userId);
  const [user, setUser] = useState<UserData>();
  const [userLoadFailed, setUserLoadFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api
      .get<DDCDetail>(`/services/dementia-daycare/${params.centreId}`)
      .then((response) => setCentre(response.data))
      .catch((error) => console.error(error))
      .finally(() => setIsLoading(false));
  }, [params.centreId]);

  // We fetch from backend instead of store for now because store
  // is currently not persisted across refreshes
  useEffect(() => {
    if (isSignedIn && !user && userId && !userLoadFailed) {
      api
        .get<UserData>("/users/me")
        .then((response) => setUser(response.data))
        .catch((error) => {
          console.error(error);
          setUserLoadFailed(true);
          toast.error(t("daycare.detail.userLoadError"));
        });
    }
  }, [isSignedIn, userId, user, userLoadFailed]);

  // Super hacky need to fix ASAP
  useEffect(() => {
    if (isSignedIn && !subsidyInfo && userId) {
      api
        .post<MohNrLtcSubsidy>("/subsidies/moh-nrltc", { id: userId })
        .then((response) => setSubsidyInfo(response.data))
        .catch((error) => {
          console.error(error);
          toast.error(t("daycare.detail.subsidyLoadError"));
        });
    }
  }, [isSignedIn, userId, subsidyInfo]);

  // Guests have no user to wait for; only signed-in users need it loaded
  const isUserPending = isSignedIn && !!userId && !user && !userLoadFailed;
  if (isLoading || isUserPending) {
    return <LoadingSpinner />;
  }

  if (!centre) {
    // TODO: log error to sentry, and fix placeholder text
    return <div>{t("daycare.detail.notFound")}</div>;
  }

  const applicationDetails = t("daycare.detail.howToApplyDetails");

  return (
    <section className="flex flex-col gap-4 overflow-x-hidden bg-white p-6">
      <BackButton />
      <Hidden
        condition={centre.photos === undefined || centre.photos.length === 0}
      >
        <PhotoCarousel photos={centre.photos} />
      </Hidden>
      <h1 className="text-xl font-semibold">{centre.name}</h1>
      <section className="flex place-content-between gap-2">
        {centre.reviewCount > 0 && (
          <div className="flex w-full items-center gap-4 py-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-12 w-12 place-content-center place-items-center rounded p-2 text-xl font-semibold text-white"
                style={{
                  backgroundColor: getRatingColor(centre.averageRating),
                }}
              >
                <span>
                  {centre.averageRating?.toFixed(1) ||
                    t("provider.notAvailable")}
                </span>
              </div>
            </div>
            {centre.reviewCount > 0 && (
              <div className="flex flex-col gap-1">
                <Rating
                  readOnly
                  value={centre.averageRating}
                  className="max-w-24"
                />
                <span className="text-sm">
                  {t("provider.fromReviews", { count: centre.reviewCount })}
                </span>
              </div>
            )}
          </div>
        )}
        <div className="flex place-content-end place-items-center gap-2">
          <BookmarkButton
            targetId={centre.id}
            targetType={ReviewTargetType.DEMENTIA_DAY_CARE}
            title={centre.name}
            size="sm"
            variant="outline"
            mini
          />
          <ShareButton size="sm" variant="outline" />
        </div>
      </section>
      {centre.description && <CustomMarkdown content={centre.description} />}
      <Accordion allowToggle>
        <AccordionItem>
          <AccordionButton>
            <Box as="span" flex="1" textAlign="left">
              {t("daycare.detail.howToApply")}
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4}>
            <CustomMarkdown content={applicationDetails} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      <div className="flex flex-col gap-4">
        {centre.minPrice !== null && (
          <div className="flex flex-col gap-2">
            <span className="text-lg">
              <b>{t("daycare.detail.fees")}</b>
            </span>
            <span>
              <b>{t("price.beforeSubsidy")}</b>
              {t("price.fromPerMonth", {
                price: formatPriceRange(centre.minPrice, centre.maxPrice),
              })}
            </span>
            {isSignedIn && user?.monthly_pchi === null && (
              <section className="flex flex-col gap-4 rounded border border-brand-primary-300 bg-brand-primary-100 p-4">
                <p className="text-brand-primary-900">
                  {t("daycare.detail.subsidyPrompt")}
                </p>
                <PCHIDrawer />
              </section>
            )}
            {subsidyInfo && (
              <>
                <span>
                  <b>{t("price.afterSubsidy")}</b>
                  {t("price.fromEstPerMonth", {
                    price: formatPriceRange(
                      centre.minPrice * (1 - subsidyInfo.subsidyLevel / 100),
                      centre.maxPrice
                        ? centre.maxPrice * (1 - subsidyInfo.subsidyLevel / 100)
                        : centre.maxPrice,
                    ),
                  })}
                </span>
                <section className="flex flex-col place-items-end gap-4 rounded border border-brand-primary-300 bg-brand-primary-100 p-4">
                  <p className="text-brand-primary-900">
                    {t.rich("daycare.detail.subsidyQualify", {
                      level: subsidyInfo.subsidyLevel,
                      b: (chunks) => <b>{chunks}</b>,
                    })}
                  </p>
                  <p className="text-sm leading-tight text-brand-primary-900">
                    {t("daycare.detail.basedOnIncome")}&nbsp;
                    <b>
                      {subsidyInfo.monthlyPchi.toLocaleString("en-SG", {
                        style: "currency",
                        currency: "SGD",
                      })}
                    </b>
                    {subsidyInfo.monthlyPchi === 0 &&
                      subsidyInfo.annualPropertyValue !== null &&
                      t("daycare.detail.andAnnualValue", {
                        value: subsidyInfo.annualPropertyValue.toLocaleString(
                          "en-SG",
                          {
                            style: "currency",
                            currency: "SGD",
                          },
                        ),
                      })}
                  </p>
                  <Button
                    variant="link"
                    rightIcon={<BxRightArrowAlt />}
                    onClick={() => {
                      router.push("/dashboard/schemes?id=MOH-NR-LTC-SUBSIDY");
                    }}
                  >
                    {t("daycare.detail.learnMore")}
                  </Button>
                </section>
              </>
            )}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-lg">
            <b>{t("daycare.detail.operatingHours")}</b>
          </span>
          <span>{centre.operatingHours.join(", \n")}</span>
        </div>
        <div className="my-2 flex flex-col gap-2">
          <span className="text-lg">
            <b>{t("daycare.detail.contactDetails")}</b>
          </span>
          <div className="flex flex-col gap-2">
            {centre.phone && (
              <span>
                <b>{t("daycare.detail.phone")}</b>
                <a
                  href={`tel:+65${centre.phone}`}
                  target="_blank"
                  className="text-blue-500 underline"
                >
                  {centre.phone}
                </a>
              </span>
            )}
            {centre.email && (
              <span>
                <b>{t("daycare.detail.email")}</b>
                <a
                  href={`mailto:${centre.email}`}
                  target="_blank"
                  className="text-blue-500 underline"
                >
                  {centre.email}
                </a>
              </span>
            )}
            {centre.website && (
              <span>
                <b>{t("daycare.detail.website")}</b>
                <a
                  href={centre.website}
                  target="_blank"
                  className="text-blue-500 underline"
                >
                  {centre.website}
                </a>
              </span>
            )}
          </div>
        </div>
        <div className="my-2 flex flex-col gap-2">
          <span className="text-lg">
            <b>{t("daycare.detail.address")}</b>
          </span>
          <div className="flex flex-col">
            {constructAddress(
              centre.postalCode,
              centre.block,
              centre.streetName,
              centre.buildingName,
              centre.unitNo,
            )}
          </div>
        </div>
      </div>
      <div id="embed-map-canvas" className="w-full">
        <iframe
          title={centre.name}
          src={buildMapEmbedUrl(centre)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="h-96 w-full rounded-md border border-gray-200 shadow"
        />
      </div>
      <FinancialSupportSection />
      <ReviewSection centreId={params.centreId} reviews={centre.reviews} />
    </section>
  );
}

function NewReviewDrawer({ centreId }: { centreId: number }) {
  const userFullName = useAuthStore((state) => state.userFullName);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false);
  const [review, setReview] = useState<ReviewCreate>({
    review_source: ReviewSource.IN_APP,
    target_id: centreId,
    target_type: ReviewTargetType.DEMENTIA_DAY_CARE,
    overall_rating: 0,
    // Saved with the review, so stays in English
    author_name: userFullName || "Anonymous",
    content: "",
  });

  const canSubmit = review.overall_rating === 0 || !isDeclarationChecked;

  const submitReview = () => {
    api.post("/reviews", review).then(() => {
      setIsOpen(false);
      location.reload();
    });
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger>
        <Button className="w-full">{t("daycare.review.leave")}</Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 h-fit rounded-xl bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 bg-white px-8 py-8 pt-6">
            <Drawer.Title className="text-xl font-semibold">
              {t("daycare.review.leave")}
            </Drawer.Title>
            <div className="flex flex-col gap-2 rounded-md border border-brand-primary-200 bg-brand-primary-50 p-4 leading-tight">
              <span>{t("daycare.review.thanks")}</span>
              <Checkbox
                isChecked={isDeclarationChecked}
                onChange={(e) => setIsDeclarationChecked(e.target.checked)}
              >
                {t("daycare.review.declaration")}
              </Checkbox>
            </div>
            <div>
              <FormLabel className="mt-2" isRequired>
                {t("daycare.review.rating")}
              </FormLabel>
              <Rating
                value={review.overall_rating}
                className="max-w-48"
                onChange={(v: number) =>
                  setReview({
                    ...review,
                    overall_rating: v,
                  })
                }
              />
            </div>
            <div>
              <FormLabel className="mt-2">
                {t("daycare.review.whyRating")}
              </FormLabel>
              <Textarea
                value={review.content}
                onChange={(e) =>
                  setReview({ ...review, content: e.target.value })
                }
                placeholder={t("daycare.review.placeholder")}
              />
            </div>
            <Button
              className="mt-4 w-full"
              onClick={submitReview}
              isDisabled={canSubmit}
            >
              {t("daycare.review.share")}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const getRelativeTime = (date: string) => {
  const time = moment.utc(date).local();
  if (useLocaleStore.getState().locale === "en") {
    return time.fromNow();
  }
  // moment only has English loaded, so use the browser's formatter otherwise
  const seconds = time.diff(moment(), "seconds");
  const formatter = new Intl.RelativeTimeFormat(t("common.dateLocale"), {
    numeric: "auto",
  });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(Math.trunc(seconds / size), unit);
    }
  }
  return formatter.format(seconds, "second");
};

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
              aria-label={t("daycare.review.closeDrawer")}
              leftIcon={<ArrowLeft size={16} />}
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              {t("daycare.review.back")}
            </Button>
            <VisuallyHidden>
              <Drawer.Title className="text-xl font-semibold">
                {t("daycare.review.reviewBy", { name: review.authorName })}
              </Drawer.Title>
            </VisuallyHidden>
            <div className="flex flex-col gap-2">
              <span className="text-lg font-semibold">
                {t("daycare.review.reviewFrom", { name: review.authorName })}
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

function ReviewSection({
  centreId,
  reviews,
}: {
  centreId: number;
  reviews: Review[];
}) {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  const sortedReviews = reviews.sort((a, b) => {
    return (
      new Date(b.publishedTime).getTime() - new Date(a.publishedTime).getTime()
    );
  });

  const reviewCount = reviews.length;
  const averageRating =
    reviews.reduce((acc, review) => acc + review.overallRating, 0) /
    reviewCount;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold">{t("daycare.review.title")}</h1>
        <span className="text-sm text-gray-500">
          {t("daycare.review.subtitle")}
        </span>
      </div>
      {reviewCount > 0 && (
        <div className="flex place-items-center gap-4">
          <h3 className="text-5xl font-bold">{averageRating.toFixed(1)}</h3>
          <Rating readOnly value={averageRating} className="max-w-36" />
          {/* <span>(from {reviewCount} reviews)</span> */}
        </div>
      )}
      {isSignedIn ? (
        <NewReviewDrawer centreId={centreId} />
      ) : (
        <SignInButton>
          <Button variant="solid" colorScheme="blue">
            {t("daycare.review.signInToReview")}
          </Button>
        </SignInButton>
      )}
      <div className="flex flex-col divide-y divide-solid">
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
            {review.reviewSource !== ReviewSource.IN_APP && (
              <span className="text-sm text-gray-500">
                {t("daycare.review.fromSource", {
                  source: mapReviewSource(review.reviewSource),
                })}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function FinancialSupportSection() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(`/dashboard/schemes`);
    router.prefetch(`/dashboard/schemes?id=MOH-NR-LTC-SUBSIDY`);
    router.prefetch(`/dashboard/schemes?id=HOME-CAREGIVING-GRANT`);
  }, [router]);

  // TODO: fetch from backend
  const SCHEMES = [
    {
      id: "MOH-NR-LTC-SUBSIDY",
      name: t("daycare.support.nrLtc.name"),
      description: t("daycare.support.nrLtc.description"),
    },
    {
      id: "HOME-CAREGIVING-GRANT",
      name: t("daycare.support.hcg.name"),
      description: t("daycare.support.hcg.description"),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold">{t("daycare.support.title")}</h1>
        <span className="text-sm text-gray-500">
          {t("daycare.support.subtitle")}
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
                {t("daycare.support.viewDetails")}
              </span>
              <BxRightArrowAlt className="text-brand-primary-500" />
            </div>
          </button>
        ))}
      </section>
    </section>
  );
}
