import { useState } from "react";
import { SchemeStatusKind } from "@/types/scheme";
import { SchemeWithStatus } from "@/util/schemeCatalog";
import SchemeCard from "./SchemeCard";
import SchemeIcon, { FOCUS_RING } from "./SchemeIcon";

type Filter = "all" | Exclude<SchemeStatusKind, "not_a_match">;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "likely", label: "Likely eligible" },
  { value: "needs_answers", label: "Need answers" },
  { value: "provider_decides", label: "Provider decides" },
];

// Filterable list of scheme cards. Schemes that don't match the profile are
// folded into one collapsed row instead of being listed.
export default function SchemeList({
  items,
  recipientName,
}: {
  items: SchemeWithStatus[];
  recipientName: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showHidden, setShowHidden] = useState(false);

  const visible = items.filter(({ status }) => status.status !== "not_a_match");
  const hidden = items.filter(({ status }) => status.status === "not_a_match");
  const filtered =
    filter === "all"
      ? visible
      : visible.filter(({ status }) => status.status === filter);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by eligibility"
      >
        {FILTERS.map(({ value, label }) => {
          const isActive = filter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(value)}
              className={`min-h-11 rounded-full border px-3.5 text-sm font-medium ${FOCUS_RING} ${
                isActive
                  ? "border-interaction-main-default bg-interaction-main-default text-white"
                  : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              {value === "all" ? `${label} ${visible.length}` : label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2.5" aria-live="polite">
        {filtered.map((item) => (
          <SchemeCard key={item.scheme.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            No schemes with this status.
          </p>
        )}
      </div>

      {hidden.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            aria-expanded={showHidden}
            onClick={() => setShowHidden((value) => !value)}
            className={`flex min-h-11 w-full items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-left text-[15px] font-semibold text-gray-600 ${FOCUS_RING}`}
          >
            <span className="flex-1">
              {hidden.length} hidden: doesn&apos;t match {recipientName}&apos;s
              profile
            </span>
            <SchemeIcon
              name="chevron-card"
              size={18}
              className={`transition-transform ${showHidden ? "rotate-90" : ""}`}
            />
          </button>
          {showHidden &&
            hidden.map((item) => (
              <SchemeCard key={item.scheme.id} item={item} />
            ))}
        </div>
      )}
    </div>
  );
}
