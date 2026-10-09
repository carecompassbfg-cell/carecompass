declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      // Auth
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
      CLERK_SECRET_KEY: string;
      // Backend
      NEXT_PUBLIC_APP_BACKEND_URL: string;
      // Analytics
      NEXT_PUBLIC_POSTHOG_KEY: string;
      NEXT_PUBLIC_POSTHOG_HOST: string;
      // Maps (optional)
      NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY?: string;
      // Feature switches (optional, "true" to enable)
      NEXT_PUBLIC_SCHEME_BOOKMARKS_ENABLED?: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
