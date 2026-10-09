import { api } from "@/api";
import { Bookmark } from "@/types/bookmark";
import { ReviewTargetType } from "@/types/review";
import {
  Button,
  ButtonProps,
  IconButton,
} from "@opengovsg/design-system-react";
import { BookmarkIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSignInOnlyFeaturePrompt from "@/util/hooks/useSignInOnlyFeaturePrompt";
import { t } from "@/i18n";

interface BookmarkButtonProps extends ButtonProps {
  // Care services are identified by targetId, schemes by targetKey
  targetId?: number;
  targetKey?: string;
  targetType: ReviewTargetType;
  title: string;
  link?: string;
  mini?: boolean;
}

const UNCREATED_BOOKMARK_ID = -1;

export default function BookmarkButton({
  targetId,
  targetKey,
  targetType,
  title,
  link,
  mini = false,
  ...props
}: BookmarkButtonProps) {
  const { isSignedIn, promptIfNotSignedIn } = useSignInOnlyFeaturePrompt();
  const pathname = usePathname();

  if (!link) {
    link = pathname;
  }

  const [bookmarkId, setBookmarkId] = useState(UNCREATED_BOOKMARK_ID);

  useEffect(() => {
    if (isSignedIn) {
      const params: Record<string, string> = { target_type: targetType };
      if (targetKey) params.target_key = targetKey;
      else if (targetId !== undefined) params.target_id = String(targetId);
      api
        .get<Bookmark[]>("/bookmarks", params)
        .then((res) => {
          setBookmarkId(
            res.data && res.data.length > 0
              ? res.data[0].id
              : UNCREATED_BOOKMARK_ID,
          );
        })
        .catch((error) => console.error(error));
    }
  }, [targetId, targetKey, targetType, isSignedIn]);

  const isMarked = bookmarkId !== UNCREATED_BOOKMARK_ID;

  const handleMark = () => {
    if (promptIfNotSignedIn()) {
      return;
    }

    const bookmarkToCreate: Omit<Bookmark, "id" | "userId"> = {
      targetId: targetId ?? null,
      targetKey: targetKey ?? null,
      targetType,
      title,
      link,
    };

    api
      .post<{ id: number }>("/bookmarks", bookmarkToCreate)
      .then((res) => {
        if (res.data?.id !== undefined) setBookmarkId(res.data.id);
        toast.success(t("bookmark.added"));
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("bookmark.error"));
      });
  };

  const handleUnmark = () => {
    api
      .delete(`/bookmarks/${bookmarkId}`)
      .then(() => {
        setBookmarkId(UNCREATED_BOOKMARK_ID);
        toast.success(t("bookmark.removed"));
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("bookmark.error"));
      });
  };

  return mini ? (
    <IconButton
      {...props}
      aria-label={isMarked ? t("bookmark.removeLabel") : t("bookmark.savePage")}
      onClick={isMarked ? handleUnmark : handleMark}
      icon={
        <BookmarkIcon size={16} fill={isMarked ? "currentColor" : "none"} />
      }
    />
  ) : (
    <Button
      {...props}
      leftIcon={
        <BookmarkIcon size={16} fill={isMarked ? "currentColor" : "none"} />
      }
      aria-label={t("bookmark.savePage")}
      onClick={isMarked ? handleUnmark : handleMark}
    >
      {isMarked ? t("bookmark.saved") : t("bookmark.save")}
    </Button>
  );
}
