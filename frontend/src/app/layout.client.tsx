"use client";

import Providers from "./providers";
import { Toaster } from "sonner";
import "@smastrom/react-rating/style.css";
import DesktopNotice from "@/components/DesktopNotice";
import { PropsWithChildren } from "react";
import { useAuthStore } from "@/stores/auth";
import SignIn from "@/components/SignIn";
import LoadingSpinner from "@/ui/loading";

export default function RootLayoutClient({ children }: PropsWithChildren) {
  return (
    <body className="h-dvh w-full">
      <Toaster closeButton position="top-center" duration={2000} />
      <Providers>
        <Main>{children}</Main>
        <DesktopNotice />
      </Providers>
    </body>
  );
}

function Main({ children }: PropsWithChildren) {
  const isInitilised = useAuthStore((state) => state.isInitialised);
  const isSignedIn = useAuthStore((state) => state.isSignedIn);
  const isGuest = useAuthStore((state) => state.isGuest);

  return (
    <div className="h-full w-full">
      {isInitilised ? (
        isSignedIn || isGuest ? (
          children
        ) : (
          <SignIn />
        )
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
}
