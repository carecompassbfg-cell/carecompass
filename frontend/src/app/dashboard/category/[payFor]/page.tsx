"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import SchemeIcon, { FOCUS_RING } from "@/components/schemes/SchemeIcon";
import SchemeList from "@/components/schemes/SchemeList";
import { PayForCategory } from "@/types/scheme";
import { BackButton } from "@/ui/button";
import LoadingSpinner from "@/ui/loading";
import useSchemeCatalog from "@/util/hooks/useSchemeCatalog";
import { getRecipientName } from "@/util/recipient";
import { isPayForCategory, PAY_FOR_META } from "@/util/schemeCatalog";

export default function CategoryPage() {
  const params = useParams<{ payFor: string }>();
  const { items, user, isLoading, catalogError } = useSchemeCatalog();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isPayForCategory(params.payFor)) {
    return (
      <div className="flex w-full flex-col gap-4 py-6">
        <BackButton />
        <p className="text-gray-800">We couldn&apos;t find that category.</p>
        <Link
          href="/dashboard"
          className={`font-semibold text-interaction-links-default ${FOCUS_RING}`}
        >
          See all financial schemes
        </Link>
      </div>
    );
  }

  const category = params.payFor;
  const meta = PAY_FOR_META[category];
  const categoryItems = items.filter(
    ({ scheme }) => scheme.payFor === category,
  );

  return (
    <div className="flex w-full flex-col gap-4 py-6">
      <BackButton />
      <header className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
          <SchemeIcon
            name={
              category === PayForCategory.CARE_SERVICES
                ? "cat-care-services-lg"
                : meta.icon
            }
            size={category === PayForCategory.CARE_SERVICES ? 24 : 20}
          />
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[26px] font-bold leading-8 text-gray-800">
            {meta.title}
          </h1>
          <p className="text-sm leading-5 text-gray-600">
            {meta.pageDescription}
          </p>
        </div>
      </header>

      {category === PayForCategory.CARE_SERVICES && (
        <Link
          href="/careservice"
          className={`flex min-h-11 items-center gap-2.5 rounded-[10px] border border-blue-100 bg-blue-50 px-3.5 py-3 ${FOCUS_RING}`}
        >
          <SchemeIcon name="banner-care" size={18} />
          <span className="flex-1 text-sm leading-5 text-gray-800">
            Still choosing a day care or home care provider?{" "}
            <b className="text-interaction-links-default">
              Compare them in Care services
            </b>
          </span>
          <SchemeIcon name="chevron-link" size={16} />
        </Link>
      )}

      {catalogError ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          We couldn&apos;t load the list of schemes. Please try again later.
        </p>
      ) : (
        <SchemeList
          items={categoryItems}
          recipientName={getRecipientName(user)}
        />
      )}
    </div>
  );
}
