import { t } from "@/i18n";
import { Review, ReviewSource, ReviewTargetType } from "./review";

export interface HomeCareDetail {
  id: number;
  name: string;
  phone: string;
  website: string;
  services: string[]; // List of services they provide
  photos?: string[];

  // Optional location/contact fields
  email?: string;
  operatingHours?: string[];
  googleMapPlaceId?: string;

  // location details
  buildingName?: string;
  block?: string;
  streetName?: string;
  unitNo?: string;
  postalCode?: string;

  // reviews
  reviews: Review[];
  reviewCount: number;
  rating: number;
  userRatingCount: number;
}

export const SERVICE_ID_TO_LABEL: { [key: string]: string } = {
  "home-medical": "Home Medical",
  "home-nursing": "Home Nursing",
  "home-therapy": "Home Therapy",
  "home-personal-care": "Home Personal Care",
  "medical-escort": "Medical Escort",
  "dementia-enrichment": "Dementia Enrichment",
};

// SERVICE_ID_TO_LABEL holds the English labels used in the provider data, so
// filtering stays in English. Use getServiceLabel to show a label on screen.
const SERVICE_ID_TO_KEY: { [key: string]: string } = {
  "home-medical": "homeMedical",
  "home-nursing": "homeNursing",
  "home-therapy": "homeTherapy",
  "home-personal-care": "homePersonalCare",
  "medical-escort": "medicalEscort",
  "dementia-enrichment": "dementiaEnrichment",
};

export function getServiceLabel(id: string): string {
  const key = SERVICE_ID_TO_KEY[id];
  return key ? t(`homecare.services.${key}.label`) : SERVICE_ID_TO_LABEL[id];
}

export function getServiceDescription(id: string): string {
  return t(`homecare.services.${SERVICE_ID_TO_KEY[id]}.description`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformHomeCareData(data: any[]): HomeCareDetail[] {
  return data.map((item) => {
    // Transform reviews to match Review type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviews: Review[] = item.reviews.map((review: any) => ({
      reviewSource: review.review_source as ReviewSource,
      targetId: review.target_id,
      targetType: review.target_type as ReviewTargetType,
      overallRating: review.overall_rating,
      content: review.content,
      authorId:
        review.google_author_url?.split("/contrib/")[1]?.split("/")[0] || null,
      authorName: review.author_name,
      googleReviewId: review.google_review_id,
      googleAuthorUrl: review.google_author_url,
      googleAuthorPhotoUrl: review.google_author_photo_url,
      publishedTime: review.published_time,
      relativeTime: null, // Not provided in new format
      languageCode: "en", // Default to English since not provided
      originalContent: null, // Not provided in new format
      originalLanguageCode: "en", // Default to English since not provided
    }));

    return {
      id: item.id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      website: item.website,
      services: item.services,
      operatingHours: item.operating_hours,
      buildingName: item.building_name,
      block: item.block?.toString(),
      streetName: item.street_name,
      unitNo: item.unit_no,
      postalCode: item.postal_code,
      photos: item.photos,
      googleMapPlaceId: item.google_map_place_id,
      reviews,
      reviewCount: reviews.length,
      rating: item.rating,
      userRatingCount: item.user_rating_count,
    };
  });
}

export function formatAddress(provider: HomeCareDetail): string {
  const parts: string[] = [];

  if (provider.buildingName) {
    parts.push(provider.buildingName);
  }

  const blockStreet = [provider.block, provider.streetName]
    .filter(Boolean)
    .join(" ");
  if (blockStreet) {
    parts.push(blockStreet);
  }

  if (provider.unitNo) {
    parts.push(`Unit ${provider.unitNo}`);
  }

  parts.push("Singapore");

  if (provider.postalCode) {
    parts.push(provider.postalCode);
  }

  return parts.join(", ");
}
