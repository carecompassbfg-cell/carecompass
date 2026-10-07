import { useState } from "react";
import { Drawer } from "vaul";
import { Button } from "@opengovsg/design-system-react";
import { PCHIForm } from "./PCHIForm";
import { t } from "@/i18n";

export function PCHIDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger className="w-full">
        <Button className="w-full">{t("pchi.checkSubsidy")}</Button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 h-fit rounded-xl bg-white outline-none">
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 bg-white px-8 py-8 pt-6">
            <Drawer.Title className="text-xl font-semibold">
              {t("pchi.checkSubsidy")}
            </Drawer.Title>
            <PCHIForm
              callbackFn={() => {
                location.reload();
                setIsOpen(false);
              }}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
