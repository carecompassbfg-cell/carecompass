import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { t } from "@/i18n";

export default function useSignInOnlyFeaturePrompt() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  const promptIfNotSignedIn = () => {
    if (!isSignedIn) {
      toast.error(t("toast.signInRequired"));
      return true;
    }
    return false;
  };
  return { isSignedIn, promptIfNotSignedIn };
}
