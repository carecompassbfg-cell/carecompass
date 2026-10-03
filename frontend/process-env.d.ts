declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      // Backend
      NEXT_PUBLIC_APP_BACKEND_URL: string;
      NEXT_PUBLIC_HEARTBEAT_FRONTEND_URL: string;
      // Analytics
      NEXT_PUBLIC_POSTHOG_KEY: string;
      NEXT_PUBLIC_POSTHOG_HOST: string;
      NEXT_PUBLIC_SENTRY_DSN: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
