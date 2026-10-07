import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "@opengovsg/design-system-react";
import { CSPostHogProvider } from "./posthog";
import AuthProvider from "@/components/AuthProvider";
import LocaleRoot from "@/components/LocaleRoot";
import { PropsWithChildren } from "react";

export default function Providers({ children }: PropsWithChildren<unknown>) {
  return (
    <CSPostHogProvider>
      <AuthProvider>
        <ChakraProvider>
          <ThemeProvider>
            <LocaleRoot>{children}</LocaleRoot>
          </ThemeProvider>
        </ChakraProvider>
      </AuthProvider>
    </CSPostHogProvider>
  );
}
