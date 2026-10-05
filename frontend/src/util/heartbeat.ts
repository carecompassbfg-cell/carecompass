// HeartBeat (care monitoring) data shown on the home page.
// The rules here mirror the HeartBeat caregiver dashboard
// (github.com/roycehoe/heartbeat, frontend/src/pages/Caregiver and
// frontend/src/utils/moodTimeline.ts) so both apps always agree on who is
// flagged. If HeartBeat changes its rules, update these to match.

export const HEARTBEAT_API_URL =
  process.env.NEXT_PUBLIC_HEARTBEAT_API_URL ||
  "https://heartbeat.carecompass.sg/api";

export type HeartbeatMood = "happy" | "ok" | "sad";

export interface HeartbeatMoodEntry {
  mood: HeartbeatMood;
  created_at: string;
}

// The fields of GET /admin/dashboard the home page uses. The response has
// more (contact number, address...) that we deliberately ignore.
export interface HeartbeatPerson {
  care_receipient_id: number;
  name: string;
  created_at: string;
  moods: HeartbeatMoodEntry[];
  consecutive_checkins: number;
  consecutive_non_checkins: number;
  can_record_mood: boolean;
}

export interface MoodTimelineDay {
  date: Date;
  mood: HeartbeatMood | undefined;
  isToday: boolean;
}

// Days shown in the snapshot table: today, 1d, 2d, 3d ago
export const SNAPSHOT_DAYS = 4;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Latest mood per day, newest first, never before the person was added
export const getMoodTimeline = (
  moods: HeartbeatMoodEntry[],
  numDays: number,
  startedAt: string,
  now: Date = new Date(),
): MoodTimelineDay[] => {
  const today = startOfDay(now);
  const firstDay = startOfDay(new Date(startedAt));

  const latestMoodByDay = new Map<number, HeartbeatMoodEntry>();
  for (const mood of moods) {
    const createdAt = new Date(mood.created_at);
    const dayKey = startOfDay(createdAt).getTime();
    const existing = latestMoodByDay.get(dayKey);
    if (!existing || new Date(existing.created_at) < createdAt) {
      latestMoodByDay.set(dayKey, mood);
    }
  }

  const timeline: MoodTimelineDay[] = [];
  for (let daysAgo = 0; daysAgo < numDays; daysAgo++) {
    const date = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - daysAgo,
    );
    if (date < firstDay) break;
    timeline.push({
      date,
      mood: latestMoodByDay.get(date.getTime())?.mood,
      isToday: daysAgo === 0,
    });
  }
  return timeline;
};

export type PersonStatus = "poor" | "unresponsive" | "good";

// Same colours as the HeartBeat dashboard
export const STATUS_COLOURS: Record<PersonStatus, string> = {
  poor: "#FF3B30",
  unresponsive: "#AF52DE",
  good: "#34C759",
};

export const getRecentTimeline = (
  person: HeartbeatPerson,
  now?: Date,
): MoodTimelineDay[] =>
  getMoodTimeline(person.moods, SNAPSHOT_DAYS, person.created_at, now);

// 2+ sad moods in the last 4 days
export const hasPoorMentalState = (timeline: MoodTimelineDay[]): boolean =>
  timeline.filter((day) => day.mood === "sad").length >= 2;

// No check-ins at all in the last 4 days
export const isUnresponsive = (timeline: MoodTimelineDay[]): boolean =>
  timeline.every((day) => day.mood === undefined);

export const getPersonStatus = (
  person: HeartbeatPerson,
  now?: Date,
): PersonStatus => {
  const timeline = getRecentTimeline(person, now);
  if (hasPoorMentalState(timeline)) return "poor";
  if (isUnresponsive(timeline)) return "unresponsive";
  return "good";
};

export const getStatusCounts = (
  people: HeartbeatPerson[],
  now?: Date,
): { poor: number; unresponsive: number } => {
  let poor = 0;
  let unresponsive = 0;
  for (const person of people) {
    const timeline = getRecentTimeline(person, now);
    if (hasPoorMentalState(timeline)) poor++;
    if (isUnresponsive(timeline)) unresponsive++;
  }
  return { poor, unresponsive };
};
