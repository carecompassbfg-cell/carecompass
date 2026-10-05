import { Fragment } from "react";
import { StatusLinePart } from "@/util/homeSchemes";
import { STATUS_TEXT_CLASS } from "./StatusPill";

// "● 8 likely · ● 11 to check" on the home page's financial support card,
// using the dashboard's statuses and StatusPill colours. Text, not colour
// alone, carries the meaning.
export default function HomeSchemesStatusLine({
  parts,
}: {
  parts: StatusLinePart[];
}) {
  return (
    <p className="ph-no-capture flex flex-wrap items-center gap-x-1.5 text-[13px] font-semibold leading-[18px]">
      <span className="sr-only">Schemes: </span>
      {parts.map((part, index) => (
        <Fragment key={part.kind}>
          {index > 0 && (
            <span aria-hidden className="text-gray-400">
              ·
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 ${STATUS_TEXT_CLASS[part.kind]}`}
          >
            <span aria-hidden className="size-2 rounded-full bg-current" />
            {part.label}
            {index < parts.length - 1 && <span className="sr-only">,</span>}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
