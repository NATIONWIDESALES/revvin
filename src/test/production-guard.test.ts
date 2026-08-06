import { describe, expect, it } from "vitest";
import { PRODUCTION_PROJECT_REF } from "./setup";

const liveOptIn =
  process.env.RUN_LIVE_API_TESTS === "1" ||
  process.env.RUN_LIVE_API_TESTS === "true";

const configuredUrl =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined) ??
  process.env.VITE_SUPABASE_URL ??
  "";

const pointsAtProduction = configuredUrl.includes(PRODUCTION_PROJECT_REF);

describe("production network guard", () => {
  it("blocks fetches to the production project unless RUN_LIVE_API_TESTS is set", async () => {
    if (!pointsAtProduction || liveOptIn) {
      // Nothing to guard: either the tests are not pointed at production, or
      // live access was explicitly opted into.
      expect(true).toBe(true);
      return;
    }

    await expect(
      fetch(`https://${PRODUCTION_PROJECT_REF}.supabase.co/rest/v1/`),
    ).rejects.toThrow(/PRODUCTION backend/);
  });

  it("blocks fetches to the connector gateway unless opted in", async () => {
    if (!pointsAtProduction || liveOptIn) {
      expect(true).toBe(true);
      return;
    }

    await expect(
      fetch("https://connector-gateway.lovable.dev/api/v1/verify_credentials"),
    ).rejects.toThrow(/PRODUCTION backend/);
  });
});