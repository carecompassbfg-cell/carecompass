"use client";

import { ReactNode, RefObject, useCallback, useEffect, useState } from "react";
import { Drawer } from "vaul";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { ArrowRight, Bell, Link2, X } from "lucide-react";
import { FOCUS_RING } from "@/components/schemes/SchemeIcon";

// Made-up example person, never a real care recipient
const EXAMPLE_NAME = "Mei Ling";

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl bg-brand-primary-50 px-6">
      {children}
    </div>
  );
}

function FakeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800">
        {value}
      </span>
    </div>
  );
}

// A small picture of HeartBeat's check-in page, before and after tapping
function MiniPhone({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-48 w-28 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow">
      <div className="flex items-center gap-1 border-b border-gray-300 px-2 py-1">
        <span className="size-2 rounded-full bg-[#DE5458]" />
        <span className="text-[8px] font-bold text-gray-900">heart beat</span>
      </div>
      <div className="flex h-14 items-end justify-center bg-[radial-gradient(circle,#B0D6EE_0%,#F5FAFF_80%)] pb-1">
        <span className="h-2.5 w-20 rounded-[50%] bg-[#8CBF40]" />
      </div>
      {children}
    </div>
  );
}

const MOOD_BUTTONS = [
  { mood: "happy", bg: "bg-[#53AB5F]" },
  { mood: "ok", bg: "bg-[#E89F4A]" },
  { mood: "sad", bg: "bg-[#DC6282]" },
] as const;

function CheckInVisual() {
  return (
    <div className="flex items-center gap-2">
      <MiniPhone>
        <div className="flex flex-1 flex-col gap-1 p-1.5">
          {MOOD_BUTTONS.map(({ mood, bg }) => (
            <span
              key={mood}
              className={`flex flex-1 items-center justify-center rounded-md ${bg}`}
            >
              <Image
                src={`/img/heartbeat/${mood}.svg`}
                width={16}
                height={16}
                alt=""
                className="opacity-70 brightness-0"
              />
            </span>
          ))}
        </div>
      </MiniPhone>
      <span className="flex flex-col items-center text-brand-primary-500">
        <ArrowRight aria-hidden size={18} />
        <span className="text-[10px] font-medium text-gray-500">Tap</span>
      </span>
      <MiniPhone>
        <div className="flex flex-1 bg-[#E1FBC8] p-1.5">
          <span className="flex flex-1 items-center justify-center rounded-lg bg-[#53AB5F] px-2 text-center text-[11px] font-bold leading-tight text-white">
            Your resilience is your power.
          </span>
        </div>
      </MiniPhone>
    </div>
  );
}

function StatusVisual() {
  return (
    <>
      <div className="flex w-full gap-2">
        {[
          { n: 1, label: "Missed a check-in", colour: "#AF52DE" },
          { n: 0, label: "In poor mental state", colour: "#FF3B30" },
        ].map((tile) => (
          <div
            key={tile.label}
            className="flex flex-1 flex-col rounded-lg bg-white py-1.5 pl-2 pr-1"
            style={{ borderLeft: `6px solid ${tile.colour}` }}
          >
            <span className="text-xl font-bold text-gray-900">{tile.n}</span>
            <span className="text-[10px] leading-3 text-gray-600">
              {tile.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex w-full items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-2 text-xs font-medium text-red-700">
        <Bell aria-hidden size={14} />
        {EXAMPLE_NAME} missed yesterday&apos;s check-in
      </div>
    </>
  );
}

function WhatsAppVisual() {
  return (
    <div className="w-full overflow-hidden rounded-xl bg-[#EFEAE2] shadow-sm">
      <div className="flex items-center gap-2 bg-white px-3 py-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-red-100">
          <span className="size-3 rounded-full bg-[#DE5458]" />
        </span>
        <span className="text-sm font-semibold text-gray-900">HeartBeat</span>
      </div>
      <div className="p-2.5">
        <div className="flex flex-col gap-1 rounded-lg bg-white px-3 pt-2">
          <span className="text-xs font-bold text-gray-900">Alert</span>
          <span className="text-[11px] leading-4 text-gray-800">
            {EXAMPLE_NAME} has missed their check-in. Please verify their
            well-being as soon as possible.
          </span>
          <span className="text-[9px] text-gray-500">powered by heartbeat</span>
          <span className="-mx-3 mt-1 border-t border-gray-200 py-1.5 text-center text-[11px] font-semibold text-[#2E7D4F]">
            View Mood Dashboard
          </span>
        </div>
      </div>
    </div>
  );
}

const STEPS: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "Add your loved one",
    body: "Enter their name, mobile number and address so we know who to check in on.",
    visual: (
      <Panel>
        <FakeField label="Name" value={EXAMPLE_NAME} />
        <FakeField label="Mobile number" value="8123 4567" />
      </Panel>
    ),
  },
  {
    title: "Send them their personal link",
    body: "We create a login link just for them — no password needed. Copy it and send it on WhatsApp or SMS.",
    visual: (
      <Panel>
        <div className="flex w-full flex-col gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Link2 aria-hidden size={16} /> {EXAMPLE_NAME}&apos;s login link
          </span>
          <span className="truncate rounded-md border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800">
            heartbeat.carecompass.sg/login/k3Pq9…
          </span>
          <span className="rounded-lg bg-brand-primary-500 py-2 text-center text-sm font-semibold text-white">
            Copy link
          </span>
        </div>
      </Panel>
    ),
  },
  {
    title: "They check in with one tap",
    body: "Each day, your loved one opens their link and taps how they're feeling. They'll see an encouraging message after.",
    visual: (
      <Panel>
        <CheckInVisual />
      </Panel>
    ),
  },
  {
    title: "See how they're doing at a glance",
    body: "Your dashboard shows everyone's latest check-in and mood, so you can spot when something's off.",
    visual: (
      <Panel>
        <StatusVisual />
      </Panel>
    ),
  },
  {
    title: "Get a WhatsApp alert if they miss a day",
    body: "If your loved one misses a day, HeartBeat messages you on WhatsApp straight away, using the number on your CareCompass account.",
    visual: (
      <Panel>
        <WhatsAppVisual />
      </Panel>
    ),
  },
];

// Bottom sheet opened from the "?" and "How does it work?" on the Care
// monitoring tab. Swipe or use Back/Next to move between the steps.
export default function HowItWorksSheet({
  isOpen,
  onClose,
  returnFocusRef,
  finalAction,
}: {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement>;
  // Shown on the last step, e.g. "Set up care monitoring"
  finalAction?: { label: string; onClick: () => void };
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Always start from step 1 when reopened
  useEffect(() => {
    if (isOpen) {
      setIndex(0);
      emblaApi?.scrollTo(0, true);
    }
  }, [isOpen, emblaApi]);

  const isLast = index === STEPS.length - 1;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white outline-none"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
        >
          <Drawer.Handle className="my-2" />
          <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-8 pt-1">
            <div className="flex items-center justify-between gap-2">
              <Drawer.Title className="text-xl font-bold text-gray-800">
                How care monitoring works
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
            <Drawer.Description className="sr-only">
              {STEPS.length} steps explaining care monitoring with HeartBeat
            </Drawer.Description>

            {/* data-vaul-no-drag: horizontal swipes move the steps, not the sheet */}
            <div className="overflow-hidden" ref={emblaRef} data-vaul-no-drag>
              <div className="flex">
                {STEPS.map((step, i) => (
                  <section
                    key={step.title}
                    aria-roledescription="slide"
                    aria-label={`Step ${i + 1} of ${STEPS.length}`}
                    aria-hidden={i !== index}
                    className="flex min-w-0 flex-[0_0_100%] flex-col gap-3 pr-1"
                  >
                    {step.visual}
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] font-semibold text-brand-primary-500">
                        Step {i + 1} of {STEPS.length}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">
                        {step.title}
                      </h3>
                      <p className="text-base leading-6 text-gray-600">
                        {step.body}
                      </p>
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-1.5" aria-hidden>
              {STEPS.map((step, i) => (
                <span
                  key={step.title}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-5 bg-brand-primary-500" : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  className={`h-12 flex-1 rounded-lg border-[1.5px] border-brand-primary-500 font-semibold text-brand-primary-500 ${FOCUS_RING}`}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!isLast) return emblaApi?.scrollNext();
                  if (finalAction) finalAction.onClick();
                  else onClose();
                }}
                className={`h-12 flex-1 rounded-lg bg-brand-primary-500 font-semibold text-white ${FOCUS_RING}`}
              >
                {isLast ? (finalAction?.label ?? "Got it") : "Next"}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
