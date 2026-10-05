import { describe, expect, it } from "vitest";
import {
  getMoodTimeline,
  getPersonStatus,
  getStatusCounts,
  HeartbeatPerson,
} from "./heartbeat";

// Local times, so the tests behave the same in any timezone
const NOW = new Date(2026, 9, 5, 15, 0); // 5 Oct 2026, 3pm
const at = (day: number, hour = 9) =>
  new Date(2026, 9, day, hour).toISOString();

const person = (
  moods: HeartbeatPerson["moods"],
  createdDay = 1,
): HeartbeatPerson => ({
  care_receipient_id: 1,
  name: "Mei Ling",
  created_at: at(createdDay, 8),
  moods,
  consecutive_checkins: 0,
  consecutive_non_checkins: 0,
  can_record_mood: true,
});

describe("getMoodTimeline", () => {
  it("returns today first, then earlier days", () => {
    const timeline = getMoodTimeline(
      [
        { mood: "happy", created_at: at(5) },
        { mood: "sad", created_at: at(3) },
      ],
      4,
      at(1),
      NOW,
    );
    expect(timeline.map((d) => d.date.getDate())).toEqual([5, 4, 3, 2]);
    expect(timeline.map((d) => d.mood)).toEqual([
      "happy",
      undefined,
      "sad",
      undefined,
    ]);
    expect(timeline[0].isToday).toBe(true);
    expect(timeline[1].isToday).toBe(false);
  });

  it("keeps the latest mood when there are two on one day", () => {
    const timeline = getMoodTimeline(
      [
        { mood: "sad", created_at: at(5, 9) },
        { mood: "ok", created_at: at(5, 11) },
      ],
      1,
      at(1),
      NOW,
    );
    expect(timeline[0].mood).toBe("ok");
  });

  it("stops at the day the person was added", () => {
    const timeline = getMoodTimeline([], 4, at(4), NOW);
    expect(timeline).toHaveLength(2);
  });
});

describe("getPersonStatus", () => {
  it("flags 2 or more sad moods in 4 days as poor", () => {
    const p = person([
      { mood: "sad", created_at: at(5) },
      { mood: "happy", created_at: at(4) },
      { mood: "sad", created_at: at(2) },
    ]);
    expect(getPersonStatus(p, NOW)).toBe("poor");
  });

  it("flags no check-ins in 4 days as unresponsive", () => {
    expect(getPersonStatus(person([]), NOW)).toBe("unresponsive");
  });

  it("is good otherwise", () => {
    const p = person([{ mood: "ok", created_at: at(4) }]);
    expect(getPersonStatus(p, NOW)).toBe("good");
  });
});

describe("getStatusCounts", () => {
  it("counts each status", () => {
    const counts = getStatusCounts(
      [
        person([]),
        person([
          { mood: "sad", created_at: at(5) },
          { mood: "sad", created_at: at(4) },
        ]),
        person([{ mood: "happy", created_at: at(5) }]),
      ],
      NOW,
    );
    expect(counts).toEqual({ poor: 1, unresponsive: 1 });
  });
});
