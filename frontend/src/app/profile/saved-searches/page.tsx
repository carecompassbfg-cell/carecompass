"use client";

import { t } from "@/i18n";
import { api } from "@/api";
import { Bookmark } from "@/types/bookmark";
import {
  ReviewTargetTypeToColorScheme,
  ReviewTargetTypeToName,
} from "@/util/review";
import { Tag } from "@chakra-ui/react";
import { ChevronRightIcon, ListFilterIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/ui/loading";
import { MultiSelect } from "@opengovsg/design-system-react";
import { ReviewTargetType } from "@/types/review";
import React, { useEffect, useState } from "react";
import BackButton from "@/ui/button/BackButton";

export default function SavedSearchesPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<string[]>(
    Object.values(ReviewTargetType),
  );

  useEffect(() => {
    api
      .get<Bookmark[]>("/bookmarks")
      .then((res) => setBookmarks(res.data ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    router.prefetch("/careservice/homecare/[homecareId]");
    router.prefetch("/careservice/dementia-daycare/[centreId]");
    router.prefetch("/dashboard/schemes");
  }, [router]);

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <BackButton />
      <h1 className="text-2xl font-semibold">
        {t("profilePage.savedSearches")}
      </h1>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ListFilterIcon size={16} />
          <span className="font-semibold">
            {t("profilePage.saved.filterBy")}
          </span>
        </div>
        <MultiSelect
          values={selectedResourceTypes.map((resourceType) =>
            resourceType.toString(),
          )}
          items={Object.values(ReviewTargetType).map((resourceType) => ({
            label: ReviewTargetTypeToName(resourceType),
            value: resourceType.toString(),
          }))}
          name="resourceTypes"
          placeholder={t("profilePage.saved.filterByType")}
          onChange={(values) => {
            setSelectedResourceTypes(values);
          }}
          colorScheme="gray"
        />
      </div>
      <section className="flex flex-col gap-2 pb-8">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          bookmarks
            .filter((bookmark) =>
              selectedResourceTypes.includes(bookmark.targetType),
            )
            .map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))
        )}
      </section>
    </div>
  );
}

function BookmarkCard({ bookmark }: { bookmark: Bookmark }) {
  const router = useRouter();

  return (
    <button
      className="flex w-full gap-2 rounded-lg border border-gray-200 bg-white p-4 align-middle transition-all duration-150 hover:bg-gray-50"
      onClick={() => {
        router.push(bookmark.link);
      }}
    >
      <div className="flex w-full flex-col gap-2">
        <Tag
          size="xs"
          colorScheme={ReviewTargetTypeToColorScheme(bookmark.targetType)}
        >
          {ReviewTargetTypeToName(bookmark.targetType)}
        </Tag>
        <span className="w-full text-left font-semibold leading-tight">
          {bookmark.title}
        </span>
      </div>
      <ChevronRightIcon size={24} className="place-self-center" />
    </button>
  );
}
