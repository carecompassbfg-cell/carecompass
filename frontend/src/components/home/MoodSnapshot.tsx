import Image from "next/image";
import {
  getPersonStatus,
  getRecentTimeline,
  getStatusCounts,
  HeartbeatPerson,
  MoodTimelineDay,
  SNAPSHOT_DAYS,
  STATUS_COLOURS,
} from "@/util/heartbeat";
import { t } from "@/i18n";

const DAY_KEYS = [
  "mood.days.today",
  "mood.days.1",
  "mood.days.2",
  "mood.days.3",
];

const MOOD_KEYS = {
  happy: "mood.happy",
  ok: "mood.ok",
  sad: "mood.sad",
} as const;

// Same icons and rules as the HeartBeat dashboard: a face for a check-in,
// a cross for a missed past day, and a dash for today if not checked in yet
function MoodIcon({ day }: { day: MoodTimelineDay | undefined }) {
  if (!day) return <span aria-hidden className="text-gray-300" />;
  if (day.mood) {
    return (
      <Image
        src={`/img/heartbeat/${day.mood}.svg`}
        width={20}
        height={20}
        alt={t(MOOD_KEYS[day.mood])}
      />
    );
  }
  if (!day.isToday) {
    return (
      <Image
        src="/img/heartbeat/cross.svg"
        width={18}
        height={18}
        alt={t("mood.missed")}
      />
    );
  }
  return (
    <span className="text-gray-500" aria-label={t("mood.notYet")}>
      –
    </span>
  );
}

function SummaryTile({
  count,
  label,
  colour,
}: {
  count: number;
  label: string;
  colour: string;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-xl bg-white py-2 pl-3 pr-2 shadow-sm ring-1 ring-black/5"
      style={{ borderLeft: `8px solid ${colour}` }}
    >
      <span className="text-2xl font-bold leading-8 text-gray-900">
        {count}
      </span>
      <span className="text-xs leading-4 text-gray-600">{label}</span>
    </div>
  );
}

// The "Persons I care for" summary: status tiles plus a 4-day mood table.
// Columns flex to the card width so nothing spills off narrow phones.
export default function MoodSnapshot({
  people,
}: {
  people: HeartbeatPerson[];
}) {
  const counts = getStatusCounts(people);
  const columns = `minmax(0,1fr) repeat(${SNAPSHOT_DAYS}, 2.5rem)`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <SummaryTile
          count={counts.poor}
          label={t("mood.poor")}
          colour={STATUS_COLOURS.poor}
        />
        <SummaryTile
          count={counts.unresponsive}
          label={t("mood.unresponsive")}
          colour={STATUS_COLOURS.unresponsive}
        />
      </div>

      <div
        role="table"
        aria-label={t("mood.tableLabel")}
        className="overflow-hidden rounded-xl ring-1 ring-gray-200"
      >
        <div
          role="row"
          className="grid bg-gray-500 text-xs font-semibold text-white"
          style={{ gridTemplateColumns: columns }}
        >
          <span role="columnheader" className="px-3 py-2">
            {t("mood.name")}
          </span>
          <span
            role="columnheader"
            className="col-span-4 border-l border-white/40 py-2 text-center"
          >
            {t("mood.snapshot")}
          </span>
        </div>
        <div
          role="row"
          className="grid border-b border-gray-200 bg-white text-[10px] font-semibold text-gray-600"
          style={{ gridTemplateColumns: columns }}
        >
          <span role="columnheader" className="sr-only">
            {t("mood.name")}
          </span>
          <span aria-hidden />
          {DAY_KEYS.map((key) => (
            <span role="columnheader" key={key} className="py-1 text-center">
              {t(key)}
            </span>
          ))}
        </div>
        {people.map((person) => {
          const timeline = getRecentTimeline(person);
          const status = getPersonStatus(person);
          return (
            <div
              role="row"
              key={person.care_receipient_id}
              className="grid min-h-11 items-stretch border-b border-gray-200 bg-white last:border-b-0"
              style={{ gridTemplateColumns: columns }}
            >
              <span
                role="cell"
                className="flex min-w-0 items-center"
                style={{ borderLeft: `6px solid ${STATUS_COLOURS[status]}` }}
              >
                {/* Names kept out of PostHog autocapture */}
                <span className="ph-no-capture truncate px-2.5 text-sm font-semibold text-gray-800">
                  {person.name}
                </span>
              </span>
              {Array.from({ length: SNAPSHOT_DAYS }, (_, i) => (
                <span
                  role="cell"
                  key={i}
                  className="flex items-center justify-center"
                >
                  <MoodIcon day={timeline[i]} />
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
