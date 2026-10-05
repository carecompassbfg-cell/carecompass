import { RefObject } from "react";
import Link from "next/link";
import { Drawer } from "vaul";
import { Globe, Search, ShieldCheck, X } from "lucide-react";
import { ABOUT_COPY } from "./aboutCopy";
import { FOCUS_RING } from "./SchemeIcon";
import StatusPill from "./StatusPill";

const SOURCE_ICONS = { shield: ShieldCheck, globe: Globe };

// Bottom sheet explaining the schemes results. Built like the question
// sheet (vaul): focus is trapped while open, Esc closes it, and focus goes
// back to the "?" button that opened it.
export default function AboutPanel({
  isOpen,
  onClose,
  recipientName,
  returnFocusRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  returnFocusRef: RefObject<HTMLElement>;
}) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white outline-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2">
            <div className="flex items-center justify-between gap-2">
              <Drawer.Title className="text-[22px] font-bold leading-7 text-gray-800">
                {ABOUT_COPY.title}
              </Drawer.Title>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`flex size-11 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 ${FOCUS_RING}`}
              >
                <X aria-hidden size={22} />
              </button>
            </div>
            <Drawer.Description className="text-[15px] leading-[22px] text-gray-600">
              {ABOUT_COPY.intro.replace("{name}", recipientName)}
            </Drawer.Description>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-800">
                {ABOUT_COPY.sourcesHeading}
              </h3>
              {ABOUT_COPY.sources.map((source) => {
                const Icon = SOURCE_ICONS[source.icon];
                return (
                  <div key={source.title} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-interaction-main-default">
                      <Icon aria-hidden size={18} />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[15px] font-semibold text-gray-800">
                        {source.title}
                      </p>
                      <p className="text-[13px] leading-[18px] text-gray-600">
                        {source.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-800">
                {ABOUT_COPY.labelsHeading}
              </h3>
              <dl className="flex flex-col gap-3">
                {ABOUT_COPY.labels.map(({ status, body }) => (
                  <div key={status} className="flex items-start gap-3">
                    <dt className="w-[150px] shrink-0">
                      <StatusPill
                        status={{
                          status,
                          reasonsMet: [],
                          reasonsNotMet: [],
                          questionsToAsk: [],
                          agencyWillCheck: [],
                        }}
                      />
                    </dt>
                    <dd className="text-[13px] leading-[18px] text-gray-600">
                      {body}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <Link
              href="/dashboard/all-schemes"
              onClick={onClose}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg bg-interaction-main-default px-4 text-[15px] font-semibold text-white hover:bg-interaction-main-hover ${FOCUS_RING}`}
            >
              <Search aria-hidden size={18} />
              {ABOUT_COPY.button}
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
