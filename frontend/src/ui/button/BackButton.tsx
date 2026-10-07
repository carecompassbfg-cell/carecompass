import { Button } from "@opengovsg/design-system-react";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";

export default function BackButton() {
  const router = useRouter();

  return (
    <Button
      variant="link"
      color="secondary"
      leftIcon={<ArrowLeftIcon size={16} />}
      aria-label={t("nav.back")}
      onClick={() => router.back()}
    >
      {t("nav.back")}
    </Button>
  );
}
