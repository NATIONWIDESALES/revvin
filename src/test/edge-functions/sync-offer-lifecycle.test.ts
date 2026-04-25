import { describe, it, expect, beforeEach } from "vitest";
import {
  runSyncLifecycle,
  type LifecycleClient,
  type OfferRow,
} from "../../../supabase/functions/sync-offer-lifecycle/lifecycle";

// In-memory mock implementing the LifecycleClient contract.
// Mirrors just enough of Postgres semantics for these tests:
//   - offers can be updated in place
//   - "fetchActiveOfferCosts" reflects the latest status (post-pause)
interface MockState {
  walletAvailable: number | null; // null => no wallet row
  businessesByUser: Map<string, { id: string }[]>;
  offers: OfferRow[]; // mutated by updateOfferStatus
  notifications: { user_id: string; title: string; body: string; type: string }[];
  updates: { id: string; status: string; paused_reason: string | null }[];
}

function makeMock(state: MockState): LifecycleClient {
  return {
    async fetchWallet(userId) {
      if (state.walletAvailable === null) return null;
      return { available: state.walletAvailable };
    },
    async fetchBusinesses(userId) {
      return state.businessesByUser.get(userId) ?? [];
    },
    async fetchOffersForLifecycle(businessIds) {
      const set = new Set(businessIds);
      return state.offers.filter(
        (o) => set.has(o.business_id) && (o.status === "active" || o.status === "paused")
      );
    },
    async fetchActiveOfferCosts(businessIds) {
      const set = new Set(businessIds);
      return state.offers
        .filter((o) => set.has(o.business_id) && o.status === "active")
        .map((o) => ({ payout: o.payout, platform_fee_rate: o.platform_fee_rate }));
    },
    async updateOfferStatus(offerId, status, pausedReason) {
      state.updates.push({ id: offerId, status, paused_reason: pausedReason });
      const o = state.offers.find((x) => x.id === offerId);
      if (o) {
        o.status = status;
        o.paused_reason = pausedReason;
      }
    },
    async notify(userId, title, body, type) {
      state.notifications.push({ user_id: userId, title, body, type });
    },
  };
}

function offer(
  id: string,
  business_id: string,
  payout: number,
  status: OfferRow["status"] = "active",
  paused_reason: string | null = null,
  platform_fee_rate = 0.25
): OfferRow {
  return { id, business_id, payout, platform_fee_rate, status, paused_reason };
}

let state: MockState;

beforeEach(() => {
  state = {
    walletAvailable: 0,
    businessesByUser: new Map(),
    offers: [],
    notifications: [],
    updates: [],
  };
});

describe("runSyncLifecycle — single business", () => {
  it("pauses the most expensive active offer first when the wallet drops below committed", async () => {
    state.walletAvailable = 300;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    // Costs (payout * 1.25): 625, 1250, 250  → committed = 2125, available = 300
    state.offers = [
      offer("o-cheap", "biz-1", 200), // cost 250
      offer("o-mid", "biz-1", 500), // cost 625
      offer("o-expensive", "biz-1", 1000), // cost 1250
    ];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    expect(result.success).toBe(true);
    // Expensive (1250) + mid (625) must be paused; once paused committed=250 <= 300 → stop.
    expect(result.paused).toBe(2);
    expect(result.reactivated).toBe(0);
    const pauseUpdates = state.updates.filter((u) => u.status === "paused");
    expect(pauseUpdates.map((u) => u.id).sort()).toEqual(["o-expensive", "o-mid"]);
    pauseUpdates.forEach((u) => expect(u.paused_reason).toBe("low_wallet"));
    expect(state.notifications.some((n) => n.type === "offer_paused_low_wallet")).toBe(true);
  });

  it("reactivates auto-paused offers cheapest-first when the wallet is topped up", async () => {
    state.walletAvailable = 1000;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [
      offer("o-a", "biz-1", 200, "paused", "low_wallet"), // cost 250
      offer("o-b", "biz-1", 500, "paused", "low_wallet"), // cost 625
      offer("o-c", "biz-1", 1000, "paused", "low_wallet"), // cost 1250 -- can't fit
    ];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    expect(result.success).toBe(true);
    expect(result.paused).toBe(0);
    expect(result.reactivated).toBe(2); // o-a (250) + o-b (625) = 875 <= 1000
    const reactivated = state.updates.filter((u) => u.status === "active");
    expect(reactivated.map((u) => u.id).sort()).toEqual(["o-a", "o-b"]);
    reactivated.forEach((u) => expect(u.paused_reason).toBeNull());
    expect(state.notifications.some((n) => n.type === "offer_reactivated")).toBe(true);
  });

  it("does nothing when the wallet covers all active offers", async () => {
    state.walletAvailable = 5000;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [offer("o-1", "biz-1", 100), offer("o-2", "biz-1", 200)];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    expect(result.paused).toBe(0);
    expect(result.reactivated).toBe(0);
    expect(state.updates).toEqual([]);
    expect(state.notifications).toEqual([]);
  });

  it("skips with 'no business' when the user owns no businesses", async () => {
    state.walletAvailable = 100;
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.skipped).toBe("no business");
    expect(state.updates).toEqual([]);
  });

  it("skips with 'no offers' when the user has businesses but no offers", async () => {
    state.walletAvailable = 100;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.skipped).toBe("no offers");
    expect(state.updates).toEqual([]);
  });

  it("treats a missing wallet row as $0 available", async () => {
    state.walletAvailable = null;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [offer("o-1", "biz-1", 100)];
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.available).toBe(0);
    expect(result.paused).toBe(1);
  });
});

describe("runSyncLifecycle — multi-business", () => {
  it("pauses across ALL of the user's businesses (regression for the .maybeSingle bug)", async () => {
    state.walletAvailable = 300;
    state.businessesByUser.set("user-1", [{ id: "biz-A" }, { id: "biz-B" }]);
    state.offers = [
      offer("o-A1", "biz-A", 800), // cost 1000
      offer("o-B1", "biz-B", 400), // cost 500
      offer("o-B2", "biz-B", 100), // cost 125
    ];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    // Total committed = 1625, available = 300. Pause expensive→cheap until ≤300:
    // Pause o-A1 (1000) → 625 left, still >300 → pause o-B1 (500) → 125 left, ≤300 stop.
    expect(result.paused).toBe(2);
    const ids = state.updates.filter((u) => u.status === "paused").map((u) => u.id).sort();
    expect(ids).toEqual(["o-A1", "o-B1"]);
  });

  it("reactivates across multiple businesses when funded", async () => {
    state.walletAvailable = 800;
    state.businessesByUser.set("user-1", [{ id: "biz-A" }, { id: "biz-B" }]);
    state.offers = [
      offer("o-A1", "biz-A", 200, "paused", "low_wallet"), // 250
      offer("o-B1", "biz-B", 400, "paused", "low_wallet"), // 500
    ];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    expect(result.reactivated).toBe(2); // 250 + 500 = 750 ≤ 800
  });
});

describe("runSyncLifecycle — manual pause preservation", () => {
  it("never reactivates an offer that was paused for a non-low-wallet reason", async () => {
    state.walletAvailable = 100_000; // plenty of headroom
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [
      offer("o-manual", "biz-1", 100, "paused", "manual"),
      offer("o-admin", "biz-1", 200, "paused", "admin_review"),
      offer("o-low", "biz-1", 50, "paused", "low_wallet"),
    ];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    expect(result.reactivated).toBe(1);
    const reactivated = state.updates.filter((u) => u.status === "active");
    expect(reactivated.map((u) => u.id)).toEqual(["o-low"]);
  });

  it("never pauses an offer that's already paused (manual or otherwise)", async () => {
    state.walletAvailable = 0;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [
      offer("o-manual", "biz-1", 1000, "paused", "manual"),
      offer("o-active", "biz-1", 100, "active"),
    ];

    const result = await runSyncLifecycle(makeMock(state), "user-1");

    expect(result.paused).toBe(1);
    expect(state.updates.filter((u) => u.status === "paused").map((u) => u.id)).toEqual([
      "o-active",
    ]);
    // Manual pause must not have been touched.
    const touchedManual = state.updates.find((u) => u.id === "o-manual");
    expect(touchedManual).toBeUndefined();
  });
});

describe("runSyncLifecycle — exact-balance edge cases", () => {
  it("does NOT pause when committed == available (boundary, > vs >=)", async () => {
    state.walletAvailable = 125;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [offer("o-1", "biz-1", 100)]; // cost 125
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.paused).toBe(0);
  });

  it("DOES pause when committed exceeds available by 1 cent", async () => {
    state.walletAvailable = 124.99;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [offer("o-1", "biz-1", 100)]; // cost 125
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.paused).toBe(1);
  });

  it("reactivates when adding the offer brings committed exactly to available (≤ boundary)", async () => {
    state.walletAvailable = 125;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [offer("o-1", "biz-1", 100, "paused", "low_wallet")]; // cost 125
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.reactivated).toBe(1);
  });

  it("does NOT reactivate when adding the offer would exceed available by 1 cent", async () => {
    state.walletAvailable = 124.99;
    state.businessesByUser.set("user-1", [{ id: "biz-1" }]);
    state.offers = [offer("o-1", "biz-1", 100, "paused", "low_wallet")]; // cost 125
    const result = await runSyncLifecycle(makeMock(state), "user-1");
    expect(result.reactivated).toBe(0);
  });
});

describe("runSyncLifecycle — input validation", () => {
  it("throws when user_id is missing", async () => {
    await expect(runSyncLifecycle(makeMock(state), "")).rejects.toThrow("user_id is required");
  });
});
