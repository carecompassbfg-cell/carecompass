import Link from "next/link";
import { SchemeWithStatus, SOURCE_LABELS } from "@/util/schemeCatalog";
import SchemeIcon, { FOCUS_RING } from "./SchemeIcon";
import StatusPill from "./StatusPill";

export default function SchemeCard({ item }: { item: SchemeWithStatus }) {
  const { scheme, status } = item;
  return (
    <Link
      href={`/dashboard/schemes?id=${encodeURIComponent(scheme.id)}`}
      className={`flex w-full flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left hover:border-gray-300 ${FOCUS_RING}`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <StatusPill status={status} />
        <SchemeIcon name="chevron-card" size={18} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold leading-[22px] text-gray-800">
          {scheme.name}
        </h3>
        <p className="text-sm leading-5 text-gray-600">{scheme.summary}</p>
      </div>
      {scheme.valueText && (
        <p className="text-[15px] font-bold text-gray-800">
          {scheme.valueText}
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs leading-4 text-gray-500">
        {scheme.area.kind === "district" && (
          <span className="flex items-center gap-1">
            <SchemeIcon name="pin-meta" size={13} />
            {scheme.area.name}
          </span>
        )}
        <span className="flex items-center gap-1">
          <SchemeIcon name="info-meta" size={13} />
          {scheme.agency} · From {SOURCE_LABELS[scheme.source]}
        </span>
      </div>
    </Link>
  );
}
