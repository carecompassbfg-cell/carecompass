import { ReviewTargetType } from "./review";

export interface Bookmark {
  id: number;
  userId: string;
  // Care services have a numeric id; schemes a string key (e.g. "PARENT-RELIEF")
  targetId: number | null;
  targetKey?: string | null;
  targetType: ReviewTargetType;
  title: string;
  link: string;
}
