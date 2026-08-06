import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Production safety guard.
//
// The default test run must be hermetic: no test may talk to the live backend
// or a live third-party API. Tests that genuinely need a round trip opt in with
// RUN_LIVE_API_TESTS=1 and skip themselves otherwise.
//
// This guard is the backstop for that rule. If the configured Supabase project
// is the production one and there is no explicit opt-in, any fetch aimed at it
// throws with an actionable message instead of quietly writing to prod.
// ---------------------------------------------------------------------------

export const PRODUCTION_PROJECT_REF = "olmpplfgzegzqdcznlrp";

const liveOptIn =
  process.env.RUN_LIVE_API_TESTS === "1" ||
  process.env.RUN_LIVE_API_TESTS === "true";

const configuredUrl =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ??
  process.env.VITE_SUPABASE_URL ??
  "";

const pointsAtProduction = configuredUrl.includes(PRODUCTION_PROJECT_REF);

if (pointsAtProduction && !liveOptIn) {
  const realFetch = globalThis.fetch?.bind(globalThis);
  globalThis.fetch = (async (input: any, init?: any) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input?.url ?? "");
    if (url.includes(PRODUCTION_PROJECT_REF) || url.includes("connector-gateway.lovable.dev")) {
      throw new Error(
        [
          "Blocked a test network call to the PRODUCTION backend.",
          `URL: ${url}`,
          "",
          "Tests must not touch production. Either:",
          "  1. Mock the Supabase client and assert against the mock (preferred), or",
          "  2. Gate the test behind RUN_LIVE_API_TESTS=1 and skip it by default.",
          "",
          "Live tests that create data must delete it in afterAll. If they cannot",
          "delete it, they must not create it.",
        ].join("\n"),
      );
    }
    return realFetch!(input, init);
  }) as typeof fetch;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
