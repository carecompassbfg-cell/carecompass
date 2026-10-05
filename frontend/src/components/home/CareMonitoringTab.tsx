"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { FOCUS_RING } from "@/components/schemes/SchemeIcon";
import useHeartbeatDashboard from "@/util/hooks/useHeartbeatDashboard";
import HowItWorksSheet from "./HowItWorksSheet";
import MoodSnapshot from "./MoodSnapshot";

// Every button here goes through the existing /heartbeat route, which checks
// the caregiver has a phone number and then opens HeartBeat. No new flows.
const HEARTBEAT_ROUTE = "/heartbeat";

const PRIMARY_BUTTON = `flex h-12 w-full items-center justify-center rounded-lg bg-brand-primary-500 font-semibold text-white ${FOCUS_RING}`;
const SECONDARY_BUTTON = `flex h-12 w-full items-center justify-center rounded-lg border-[1.5px] border-brand-primary-500 bg-white font-semibold text-brand-primary-500 ${FOCUS_RING}`;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md">
      {children}
    </div>
  );
}

export default function CareMonitoringTab({
  isSignedIn,
}: {
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const dashboard = useHeartbeatDashboard({ enabled: isSignedIn });
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const [returnFocus, setReturnFocus] =
    useState<React.RefObject<HTMLButtonElement>>(helpButtonRef);

  const openHelp = (from: React.RefObject<HTMLButtonElement>) => {
    setReturnFocus(from);
    setIsHelpOpen(true);
  };
  const goToHeartbeat = () => router.push(HEARTBEAT_ROUTE);

  const isSetUp =
    isSignedIn && dashboard.status === "ready" && dashboard.people.length > 0;

  const subtitle = isSetUp
    ? "How the people you care for are doing this week"
    : "A daily one-tap check-in, so you know your loved one is okay";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-3xl font-bold text-brand-primary-500">
            Care monitoring
          </h2>
          <button
            ref={helpButtonRef}
            type="button"
            onClick={() => openHelp(helpButtonRef)}
            aria-label="How care monitoring works"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full text-brand-primary-500 hover:bg-brand-primary-50 ${FOCUS_RING}`}
          >
            <HelpCircle aria-hidden size={28} strokeWidth={1.75} />
          </button>
        </div>
        <span className="text-xl font-bold text-[rgb(128,128,128,0.55)]">
          {subtitle}
        </span>
      </div>

      {!isSignedIn ? (
        <SetUpCard
          onSetUp={goToHeartbeat}
          onHowItWorks={() => openHelp(linkRef)}
          linkRef={linkRef}
          isDisabled
        />
      ) : dashboard.status === "loading" ? (
        <Card>
          <div className="flex animate-pulse flex-col gap-3" aria-busy>
            <span className="sr-only">Loading care monitoring</span>
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-16 flex-1 rounded-xl bg-gray-200" />
              <div className="h-16 flex-1 rounded-xl bg-gray-200" />
            </div>
            <div className="h-32 rounded-xl bg-gray-200" />
          </div>
        </Card>
      ) : dashboard.status === "error" ? (
        <Card>
          <p className="text-base text-gray-700">
            We couldn&apos;t load your care monitoring summary right now. You
            can still open HeartBeat to see everything.
          </p>
          <button
            type="button"
            onClick={goToHeartbeat}
            className={PRIMARY_BUTTON}
          >
            View Full Dashboard
          </button>
          <button
            type="button"
            onClick={dashboard.retry}
            className={SECONDARY_BUTTON}
          >
            Try again
          </button>
        </Card>
      ) : isSetUp ? (
        <Card>
          <h3 className="text-xl font-bold text-gray-900">
            Persons I care for
          </h3>
          <MoodSnapshot people={dashboard.people} />
          <button
            type="button"
            onClick={goToHeartbeat}
            className={PRIMARY_BUTTON}
          >
            View Full Dashboard
          </button>
          <button
            type="button"
            onClick={goToHeartbeat}
            className={SECONDARY_BUTTON}
          >
            Add another person
          </button>
        </Card>
      ) : (
        <SetUpCard
          onSetUp={goToHeartbeat}
          onHowItWorks={() => openHelp(linkRef)}
          linkRef={linkRef}
        />
      )}

      <HowItWorksSheet
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        returnFocusRef={returnFocus}
        finalAction={
          isSignedIn && !isSetUp
            ? { label: "Set up care monitoring", onClick: goToHeartbeat }
            : undefined
        }
      />
    </div>
  );
}

function SetUpCard({
  onSetUp,
  onHowItWorks,
  linkRef,
  isDisabled,
}: {
  onSetUp: () => void;
  onHowItWorks: () => void;
  linkRef: React.RefObject<HTMLButtonElement>;
  isDisabled?: boolean;
}) {
  return (
    <Card>
      <div className="flex justify-center">
        <Image
          src="/img/illustration_2.svg"
          width={140}
          height={140}
          alt=""
          className="max-h-36 w-auto"
        />
      </div>
      <h3 className="text-xl font-bold text-gray-900">
        Set up care monitoring for your loved one
      </h3>
      <p className="text-base leading-6 text-gray-600">
        Your loved one taps once a day to share how they&apos;re feeling. If
        they miss a day, we&apos;ll message you on WhatsApp so you can step in
        early.
      </p>
      {isDisabled ? (
        <p className="text-sm italic text-gray-500">
          Sign in to set up care monitoring.
        </p>
      ) : (
        <button type="button" onClick={onSetUp} className={PRIMARY_BUTTON}>
          Set up care monitoring
        </button>
      )}
      <button
        ref={linkRef}
        type="button"
        onClick={onHowItWorks}
        className={`self-center text-base font-medium text-brand-primary-500 underline ${FOCUS_RING}`}
      >
        How does it work?
      </button>
    </Card>
  );
}
