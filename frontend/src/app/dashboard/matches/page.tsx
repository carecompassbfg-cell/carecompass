"use client";

import SchemeList from "@/components/schemes/SchemeList";
import { BackButton } from "@/ui/button";
import LoadingSpinner from "@/ui/loading";
import useSchemeCatalog from "@/util/hooks/useSchemeCatalog";
import { getRecipientName } from "@/util/recipient";
import { sortBestMatches } from "@/util/schemeCatalog";

// "See all" from Best matches: every likely and needs-answers scheme
export default function MatchesPage() {
  const { items, user, isLoading } = useSchemeCatalog();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const name = getRecipientName(user);

  return (
    <div className="flex w-full flex-col gap-4 py-6">
      <BackButton />
      <header className="flex flex-col gap-0.5">
        <h1 className="text-[26px] font-bold leading-8 text-gray-800">
          Best matches for {name}
        </h1>
        <p className="text-sm leading-5 text-gray-600">
          Likely eligible first, then schemes that need a few answers
        </p>
      </header>
      <SchemeList items={sortBestMatches(items)} recipientName={name} />
    </div>
  );
}
