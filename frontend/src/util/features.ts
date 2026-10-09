// Features that need a backend/database release before they can be shown.
// Turn on by setting the env var to "true" in Vercel once the backend with
// the matching migration is deployed.

// Saving schemes to Saved searches (needs migration f6a7b8c9d0e1)
export const SCHEME_BOOKMARKS_ENABLED =
  process.env.NEXT_PUBLIC_SCHEME_BOOKMARKS_ENABLED === "true";
