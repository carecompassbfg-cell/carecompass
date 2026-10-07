"use client";

import { t } from "@/i18n";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import {
  AccordionIcon,
  AccordionButton,
  Accordion,
  AccordionItem,
  Button,
  AccordionPanel,
} from "@chakra-ui/react";
import {
  BookmarkIcon,
  ChevronRightIcon,
  LogOutIcon,
  PencilIcon,
  InfoIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { UserData } from "@/types/user";
import { formatPrice } from "@/util/priceInfo";
import {
  getFormattedContactNumber,
  getFormattedUserCitizenship,
  getFormattedUserRelationship,
  getFormattedUserResidence,
} from "@/util/userPropMapping";
import { useAuthStore } from "@/stores/auth";
import YourAnswers from "@/components/schemes/YourAnswers";

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.userData);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  useEffect(() => {
    router.prefetch("/profile/saved-searches");
  }, [router]);

  return (
    <div className="mb-8 flex h-full w-full flex-col gap-2">
      <h1 className="mb-2 text-2xl font-semibold">{t("profilePage.title")}</h1>
      {isSignedIn ? <SignedInUserProfileCard /> : <GuestUserProfileCard />}
      <button
        disabled={!isSignedIn}
        className={`flex w-full place-items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 ${!isSignedIn && "opacity-50 grayscale"}`}
        onClick={() => {
          router.push("/profile/saved-searches");
        }}
      >
        <BookmarkIcon size={20} />
        <span className="w-f<BookmarkIcon size={24} />ull text-left font-semibold">
          {t("profilePage.savedSearches")}
        </span>
        <ChevronRightIcon size={24} className="ml-auto" />
      </button>
      {user && <UserInfoAccordian user={user} />}
    </div>
  );
}

function SignedInUserAvatar() {
  return (
    <UserButton
      appearance={{ elements: { userButtonAvatarBox: "w-12 h-12" } }}
    />
  );
}

function ProfileSignOutButton() {
  return (
    <SignOutButton>
      <Button
        className="w-full"
        variant="outline"
        size="xs"
        rightIcon={<LogOutIcon size={16} />}
      >
        {t("profilePage.logOut")}
      </Button>
    </SignOutButton>
  );
}

function GuestUserAvatar() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500">
      <span className="text-xl font-bold text-white">?</span>
    </div>
  );
}

function ProfileSignInButton() {
  return (
    <SignInButton>
      <Button
        className="w-full"
        variant="outline"
        size="xs"
        rightIcon={<LogOutIcon size={16} />}
      >
        {t("profilePage.signIn")}
      </Button>
    </SignInButton>
  );
}

interface IUserProfileCardProps {
  displayName: string;
  emailAddress?: string;
  profileAvatar: ReactNode;
  profileActionButton: ReactNode;
}

function UserProfileCard(props: IUserProfileCardProps) {
  return (
    <section className="flex w-full rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex w-full flex-col place-items-start gap-4">
        <div className="flex w-full gap-4">
          {props.profileAvatar}
          <div className="flex flex-col justify-center">
            <span className="text-lg font-semibold">{props.displayName}</span>
            <span className="text-sm text-gray-500">{props.emailAddress}</span>
          </div>
        </div>
        {props.profileActionButton}
      </div>
    </section>
  );
}

function SignedInUserProfileCard() {
  const userFullName = useAuthStore((state) => state.userFullName || "");
  const emailAddress = useAuthStore(
    (state) => state.emailAddresses && state.emailAddresses[0],
  );

  return (
    <UserProfileCard
      displayName={userFullName}
      emailAddress={emailAddress}
      profileAvatar={<SignedInUserAvatar />}
      profileActionButton={<ProfileSignOutButton />}
    />
  );
}

function GuestUserProfileCard() {
  return (
    <UserProfileCard
      displayName={t("profilePage.guest")}
      profileAvatar={<GuestUserAvatar />}
      profileActionButton={<ProfileSignInButton />}
    />
  );
}

function UserInfoAccordian({ user }: { user: UserData }) {
  const router = useRouter();

  const caregiverDataDisplay = [
    {
      label: t("profilePage.fields.citizenship"),
      value: getFormattedUserCitizenship(user.citizenship),
    },
    {
      label: t("profilePage.fields.contactNumber"),
      value: getFormattedContactNumber(user.contact_number),
    },
  ];

  const careRecipientDataDisplay = [
    {
      label: t("profilePage.fields.nameOrNickname"),
      value: user.care_recipient_name || t("profilePage.notSet"),
    },
    {
      label: t("profilePage.fields.relationship"),
      value: getFormattedUserRelationship(user.care_recipient_relationship),
    },
    {
      label: t("profilePage.fields.age"),
      value: user.care_recipient_age,
    },
    {
      label: t("profilePage.fields.citizenship"),
      value: getFormattedUserCitizenship(user.care_recipient_citizenship),
    },
    {
      label: t("profilePage.fields.stayingAt"),
      value: getFormattedUserResidence(user.care_recipient_residence),
    },
    {
      label: t("profilePage.fields.postalCode"),
      value: user.home_postal_code || t("profilePage.notSet"),
    },
  ];

  const pchiDisplay = [
    {
      label: t("profilePage.fields.householdSize"),
      value: user.household_size,
    },
    {
      label: t("profilePage.fields.totalMonthlyIncome"),
      value: formatPrice(user.total_monthly_household_income),
    },
    {
      label: t("profilePage.fields.annualPropertyValue"),
      value: formatPrice(user.annual_property_value),
    },
    {
      label: t("profilePage.fields.monthlyPchi"),
      value: formatPrice(user.monthly_pchi),
    },
  ];

  return (
    user && (
      <section className="flex w-full flex-col rounded-lg border border-gray-200 bg-white">
        <h3 className="text-md flex items-center gap-2 p-4 font-semibold">
          <InfoIcon size={20} />
          {t("profilePage.personalDetails")}
        </h3>
        <Accordion allowMultiple>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <span className="flex-1 text-left">
                  {t("profilePage.caregiverInfo")}
                </span>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <section className="flex flex-col">
                {caregiverDataDisplay.map((item) => (
                  <div key={item.label}>
                    <span>
                      {t("profilePage.fieldLabel", { label: item.label })}
                    </span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </section>
              <section className="mt-2 flex">
                <Button
                  variant="link"
                  size="xs"
                  className="ml-auto"
                  leftIcon={<PencilIcon size={16} />}
                  onClick={() => {
                    router.push("/profile/caregiver-info/edit");
                  }}
                >
                  {t("profilePage.edit")}
                </Button>
              </section>
            </AccordionPanel>
          </AccordionItem>
          <AccordionItem>
            <h2>
              <AccordionButton>
                <span className="flex-1 text-left">
                  {t("profilePage.careRecipientInfo")}
                </span>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            {/* Personal data: kept out of PostHog autocapture/recordings */}
            <AccordionPanel pb={4} className="ph-no-capture">
              <section className="flex flex-col">
                {careRecipientDataDisplay.map((item) => (
                  <div key={item.label}>
                    <span>
                      {t("profilePage.fieldLabel", { label: item.label })}
                    </span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </section>
              <section className="mt-2 flex">
                <Button
                  variant="link"
                  size="xs"
                  className="ml-auto"
                  leftIcon={<PencilIcon size={16} />}
                  onClick={() => {
                    router.push("/profile/care-recipient-info/edit");
                  }}
                >
                  {t("profilePage.edit")}
                </Button>
              </section>
              <YourAnswers user={user} />
            </AccordionPanel>
          </AccordionItem>
          {user.monthly_pchi !== null && (
            <AccordionItem>
              <h2>
                <AccordionButton>
                  <span className="flex-1 text-left">
                    {t("profilePage.householdIncome")}
                  </span>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb={4}>
                <section className="flex flex-col">
                  {pchiDisplay.map((item) => (
                    <div key={item.label}>
                      <span>
                        {t("profilePage.fieldLabel", { label: item.label })}
                      </span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </section>
                <span className="text-xs text-gray-500">
                  {t("profilePage.pchiNote")}
                </span>
                <section className="mt-2 flex">
                  <Button
                    variant="link"
                    size="xs"
                    className="ml-auto"
                    leftIcon={<PencilIcon size={16} />}
                    onClick={() => {
                      router.push("/profile/household-income/edit");
                    }}
                  >
                    {t("profilePage.edit")}
                  </Button>
                </section>
              </AccordionPanel>
            </AccordionItem>
          )}
        </Accordion>
      </section>
    )
  );
}
