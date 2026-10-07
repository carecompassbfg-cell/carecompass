import { useState } from "react";
import {
  FacebookShareButton,
  TelegramShareButton,
  WhatsappShareButton,
  LineShareButton,
  FacebookIcon,
  TelegramIcon,
  WhatsappIcon,
  LineIcon,
} from "react-share";
import { CopyIcon, Share2Icon } from "lucide-react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import {
  Button,
  ButtonProps,
  IconButton,
  TouchableTooltip,
} from "@opengovsg/design-system-react";
import { VisuallyHidden } from "@chakra-ui/react";
import { t } from "@/i18n";

interface shareButtonProps extends ButtonProps {
  link?: string;
}

export default function ShareButton({
  link = window.location.href,
  ...props
}: shareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 3000);
    toast.success(t("share.copiedToast"));
  };

  const socials = [
    {
      name: "Telegram",
      icon: TelegramIcon,
      button: TelegramShareButton,
    },
    {
      name: "Whatsapp",
      icon: WhatsappIcon,
      button: WhatsappShareButton,
    },
    {
      name: "Line",
      icon: LineIcon,
      button: LineShareButton,
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      button: FacebookShareButton,
    },
  ];

  return (
    <Drawer.Root>
      <Drawer.Trigger>
        {props.size === "sm" || props.size === "xs" ? (
          <IconButton
            {...props}
            aria-label={t("share.sharePage")}
            icon={<Share2Icon size={16} />}
          />
        ) : (
          <Button
            {...props}
            leftIcon={<Share2Icon size={16} />}
            aria-label={t("share.sharePage")}
          >
            {t("share.share")}
          </Button>
        )}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-full bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="max-h-screen flex-1 gap-4 overflow-y-auto bg-white px-8 py-8 pt-6">
            <VisuallyHidden>
              <Drawer.Title className="text-xl font-semibold">
                {t("share.sharePage")}
              </Drawer.Title>
            </VisuallyHidden>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-semibold">{t("share.shareLink")}</span>
                <div className="flex w-full gap-2">
                  <div className="flex w-full items-center overflow-x-auto rounded-md border p-2 pl-4">
                    <span className="flex-1 whitespace-nowrap">{link}</span>
                  </div>
                  <Button
                    leftIcon={<CopyIcon size={16} />}
                    isDisabled={isCopied}
                    onClick={handleCopy}
                    size="sm"
                    className="shrink-0"
                  >
                    {isCopied ? t("share.copied") : t("share.copy")}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-semibold">{t("share.shareVia")}</span>
                <div className="flex flex-wrap gap-4">
                  {socials.map((social, index) => (
                    <TouchableTooltip title={social.name} key={index}>
                      <social.button url={link}>
                        <social.icon size={48} borderRadius={16} />
                      </social.button>
                    </TouchableTooltip>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
