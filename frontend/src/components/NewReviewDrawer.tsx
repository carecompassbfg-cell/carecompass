import { useState } from "react";
import { Drawer } from "vaul";
import {
  Button,
  FormLabel,
  Textarea,
  Checkbox,
} from "@opengovsg/design-system-react";
import { useAuthStore } from "@/stores/auth";
import { Rating } from "@smastrom/react-rating";
import { ReviewCreate, ReviewSource, ReviewTargetType } from "@/types/review";
import { api } from "@/api";
import { t } from "@/i18n";

interface NewReviewDrawerProps {
  serviceProviderId: number;
  targetType: ReviewTargetType;
}

export function NewReviewDrawer({
  serviceProviderId,
  targetType,
}: NewReviewDrawerProps) {
  const userFullName = useAuthStore((state) => state.userFullName);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeclarationChecked, setIsDeclarationChecked] = useState(false);
  const [review, setReview] = useState<ReviewCreate>({
    review_source: ReviewSource.IN_APP,
    target_id: serviceProviderId,
    target_type: targetType,
    overall_rating: 0,
    author_name: userFullName || "Anonymous",
    content: "",
  });

  const canSubmit = review.overall_rating === 0 || !isDeclarationChecked;

  const submitReview = () => {
    api.post("/reviews", review).then(() => {
      setIsOpen(false);
      location.reload();
    });
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger className="w-full">
        <Button className="w-full">{t("review.leaveReview")}</Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 h-fit rounded-xl bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 bg-white px-8 py-8 pt-6">
            <Drawer.Title className="text-xl font-semibold">
              {t("review.leaveReview")}
            </Drawer.Title>
            <div className="flex flex-col gap-2 rounded-md border border-brand-primary-200 bg-brand-primary-50 p-4 leading-tight">
              <span>
                {t("review.declarationIntro", {
                  type:
                    targetType === ReviewTargetType.DEMENTIA_DAY_CARE
                      ? "daycare"
                      : "homecare",
                })}
              </span>
              <Checkbox
                isChecked={isDeclarationChecked}
                onChange={(e) => setIsDeclarationChecked(e.target.checked)}
              >
                {t("review.declaration")}
              </Checkbox>
            </div>
            <div>
              <FormLabel className="mt-2" isRequired>
                {t("review.rating")}
              </FormLabel>
              <Rating
                value={review.overall_rating}
                className="max-w-48"
                onChange={(v: number) =>
                  setReview({
                    ...review,
                    overall_rating: v,
                  })
                }
              />
            </div>
            <div>
              <FormLabel className="mt-2">{t("review.whyRating")}</FormLabel>
              <Textarea
                value={review.content}
                onChange={(e) =>
                  setReview({ ...review, content: e.target.value })
                }
                placeholder={t("review.placeholder")}
              />
            </div>
            <Button
              className="mt-4 w-full"
              onClick={submitReview}
              isDisabled={canSubmit}
            >
              {t("review.submit")}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
