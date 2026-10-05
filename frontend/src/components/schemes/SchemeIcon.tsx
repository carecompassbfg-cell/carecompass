import Image from "next/image";

// Icons exported from the "Schemes redesign" Figma file, served from
// public/icons/schemes. They are decorative, so they are hidden from
// screen readers; the text next to them carries the meaning.
export default function SchemeIcon({
  name,
  size,
  className,
}: {
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={`/icons/schemes/${name}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`shrink-0 ${className ?? ""}`}
    />
  );
}

export const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interaction-main-default";
