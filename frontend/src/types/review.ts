export enum ReviewSource {
  GOOGLE = "GOOGLE",
  IN_APP = "IN_APP",
}

export enum ReviewTargetType {
  DEMENTIA_DAY_CARE = "CARESERVICE::DEMENTIA_DAY_CARE",
  DEMENTIA_HOME_CARE = "CARESERVICE::DEMENTIA_HOME_CARE",
  // Saved searches only; schemes aren't reviewed
  SCHEME = "SCHEME",
}

export type Review = {
  reviewSource: ReviewSource;
  targetId: number;
  targetType: ReviewTargetType;
  overallRating: number;
  content: string | null;
  authorId: string | null;
  authorName: string;
  googleReviewId: string;
  googleAuthorUrl: string;
  googleAuthorPhotoUrl: string;
  publishedTime: string;
};

export type ReviewCreate = {
  review_source: ReviewSource;
  target_id: number;
  target_type: ReviewTargetType;
  overall_rating: number;
  author_name: string;
  content: string;
};
