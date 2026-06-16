"use client";

import { api } from "@/api";
import { PCHIDrawer } from "@/components/PCHIDrawer";
import { SchemeData, SubsidyInfo } from "@/types/scheme";
import { UserData } from "@/types/user";
import { BackButton } from "@/ui/button";
import CustomMarkdown from "@/ui/CustomMarkdown";
import LoadingSpinner from "@/ui/loading";
import { checkAllSchemesEligibility } from "@/util/eligibilityChecker";
import { useAuthStore } from "@/stores/auth";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";

function SupportDetails() {
  const param = useSearchParams();
  const [scheme, setScheme] = useState<SchemeData>();
  const [subsidyInfo, setSubsidyInfo] = useState<SubsidyInfo>();
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const userId = useAuthStore((state) => state.userId);
  const [user, setUser] = useState<UserData>();
  const [userLoadError, setUserLoadError] = useState(false);

  useEffect(() => {
    fetch("/data/schemes.json")
      .then((response) => response.json() as Promise<SchemeData[]>)
      .then((json) => {
        setScheme(json.find((scheme) => scheme.id === param.get("id")));
      });
  }, [param]);

  // We fetch from backend instead of store for now because store
  // is currently not persisted across refreshes
  useEffect(() => {
    if (isSignedIn && !user && userId) {
      api
        .get<UserData>("/users/me")
        .then((response) => setUser(response.data))
        .catch((error) => {
          console.error(error);
          setUserLoadError(true);
          toast.error("Failed to fetch user data");
        });
    }
  }, [isSignedIn, userId, user]);

  // Super hacky need to fix ASAP
  useEffect(() => {
    if (
      scheme &&
      scheme.id === "MOH-NR-LTC-SUBSIDY" &&
      isSignedIn &&
      !subsidyInfo &&
      userId
    ) {
      api
        .post<SubsidyInfo>("/subsidies/moh-nrltc", { id: userId })
        .then((response) => setSubsidyInfo(response.data))
        .catch((error) => {
          console.error(error);
          toast.error("Failed to fetch subsidy info");
        });
    }
  }, [isSignedIn, userId, scheme, subsidyInfo]);

  if (!scheme) {
    return <LoadingSpinner />;
  }

  const eligibilityResults = user ? checkAllSchemesEligibility(user) : [];
  const schemeHere = user
    ? eligibilityResults.find((result) => result.schemeId === scheme.id)
    : undefined;

  return (
    <div className="flex h-full w-full flex-col gap-4 py-6">
      <BackButton />
      <section className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold">{scheme.name}</h3>
        <div className="flex place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold">Overview</span>
            <CustomMarkdown content={scheme.description} />
            <span className="text-lg font-semibold">Benefits</span>
            <CustomMarkdown content={scheme.benefits} />
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Eligibility</h3>
        {isSignedIn &&
          scheme.pchiRequired &&
          user &&
          user.monthly_pchi === null && (
            <section className="flex flex-col gap-4 rounded border border-brand-primary-300 bg-brand-primary-100 p-4">
              <p className="text-brand-primary-900">
                Share your household information to see how much subsidy you may
                be eligible for
              </p>
              <PCHIDrawer />
            </section>
          )}
        {subsidyInfo && (
          <section className="flex flex-col gap-4 rounded border border-brand-primary-300 bg-brand-primary-100 p-4">
            <p className="text-brand-primary-900">
              You may qualify for <b>{subsidyInfo.subsidyLevel}%</b> subsidy!
            </p>
            <p className="text-sm leading-tight text-brand-primary-900">
              *Based on an estimated per capita monthly household income
              of&nbsp;
              <b>
                {subsidyInfo.monthlyPchi.toLocaleString("en-SG", {
                  style: "currency",
                  currency: "SGD",
                })}
              </b>
              {subsidyInfo.monthlyPchi === 0 &&
                subsidyInfo.annualPropertyValue !== null &&
                ` (and Annual Property Value of ${subsidyInfo.annualPropertyValue.toLocaleString(
                  "en-SG",
                  {
                    style: "currency",
                    currency: "SGD",
                  },
                )})`}
            </p>
          </section>
        )}
        <div className="flex flex-col place-content-start place-items-start gap-3 rounded-md border border-gray-200 bg-white p-4 text-left">
          <div className="w-full">
            {isSignedIn && userLoadError && (
              <p className="text-sm text-gray-500">
                Could not load your profile data. Your personalised eligibility
                assessment is unavailable — please try again later.
              </p>
            )}
            <div className="flex flex-col gap-4">
              {schemeHere?.eligibleReasons.map((message, index) => (
                <div key={index} className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-6 w-6 flex-shrink-0"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 0.5C5.20156 0.5 0.5 5.20156 0.5 11C0.5 16.7984 5.20156 21.5 11 21.5C16.7984 21.5 21.5 16.7984 21.5 11C21.5 5.20156 16.7984 0.5 11 0.5ZM15.5352 7.57109L10.5992 14.4148C10.5302 14.5111 10.4393 14.5896 10.3339 14.6437C10.2286 14.6978 10.1118 14.7261 9.99336 14.7261C9.87491 14.7261 9.75816 14.6978 9.6528 14.6437C9.54743 14.5896 9.45649 14.5111 9.3875 14.4148L6.46484 10.3648C6.37578 10.2406 6.46484 10.0672 6.61719 10.0672H7.71641C7.95547 10.0672 8.18281 10.182 8.32344 10.3789L9.99219 12.6945L13.6766 7.58516C13.8172 7.39062 14.0422 7.27344 14.2836 7.27344H15.3828C15.5352 7.27344 15.6242 7.44688 15.5352 7.57109V7.57109Z"
                      fill="#059669"
                    />
                  </svg>
                  <span className="text-md">{message}</span>
                </div>
              ))}
              {schemeHere?.additionalVerificationDetails &&
                schemeHere.additionalVerificationDetails.map(
                  (message, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-6 w-6 flex-shrink-0"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M11 0.5C5.20156 0.5 0.5 5.20156 0.5 11C0.5 16.7984 5.20156 21.5 11 21.5C16.7984 21.5 21.5 16.7984 21.5 11C21.5 5.20156 16.7984 0.5 11 0.5ZM15.5352 7.57109L10.5992 14.4148C10.5302 14.5111 10.4393 14.5896 10.3339 14.6437C10.2286 14.6978 10.1118 14.7261 9.99336 14.7261C9.87491 14.7261 9.75816 14.6978 9.6528 14.6437C9.54743 14.5896 9.45649 14.5111 9.3875 14.4148L6.46484 10.3648C6.37578 10.2406 6.46484 10.0672 6.61719 10.0672H7.71641C7.95547 10.0672 8.18281 10.182 8.32344 10.3789L9.99219 12.6945L13.6766 7.58516C13.8172 7.39062 14.0422 7.27344 14.2836 7.27344H15.3828C15.5352 7.27344 15.6242 7.44688 15.5352 7.57109V7.57109Z"
                          fill="#d9dbda"
                        />
                      </svg>
                      <span className="text-md">{message}</span>
                    </div>
                  ),
                )}
              {schemeHere?.ineligibleReasons &&
                schemeHere.ineligibleReasons.map((message, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-6 w-6 flex-shrink-0"
                      viewBox="0 0 22 22"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g transform="translate(0.5 0.5)">
                        <circle cx="10.5" cy="10.5" r="10.5" fill="#c03434" />
                        <g
                          stroke="#FFFFFF"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6.5 14.5 8-8" />
                          <path d="m6.5 6.5 8 8" />
                        </g>
                      </g>
                    </svg>
                    <span className="text-md">{message}</span>
                  </div>
                ))}
              {schemeHere?.otherDetails &&
                schemeHere.eligibleReasons.length > 0 &&
                schemeHere.otherDetails.map((message, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="text-md">{message}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-2 pb-6">
        <h3 className="text-lg font-semibold">Next steps</h3>
        <div className="flex flex-col place-content-start place-items-start gap-2 rounded-md border border-gray-200 bg-white p-4 text-left">
          <CustomMarkdown content={scheme.nextSteps} />
        </div>
      </section>
    </div>
  );
}

export default function SupportDetailsWithSuspense() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SupportDetails />
    </Suspense>
  );
}
