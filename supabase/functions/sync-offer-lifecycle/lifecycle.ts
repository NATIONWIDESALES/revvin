// Pure logic for sync-offer-lifecycle, extracted so it can be unit-tested
// without the Deno HTTP runtime. The edge function imports `runSyncLifecycle`
// and passes a service-role Supabase client. Tests pass an in-memory mock.

export interface OfferRow {
  id: string;
  business_id: string;
  payout: number | string;
  platform_fee_rate: number | string;
  status: "active" | "paused" | string;
  paused_reason: string | null;
}

export interface MinimalOfferCost {
  payout: number | string;
  platform_fee_rate: number | string;
}

export interface BusinessRow {
  id: string;
}

export interface WalletRow {
  available: number | string;
}

export interface SyncResult {
  skipped?: string;
  success?: boolean;
  paused: number;
  reactivated: number;
  available: number;
}

// Minimal subset of the Supabase client used by this logic.
// Tests provide a hand-rolled in-memory implementation matching this shape.
export interface LifecycleClient {
  fetchWallet(userId: string): Promise<WalletRow | null>;
  fetchBusinesses(userId: string): Promise<BusinessRow[]>;
  fetchOffersForLifecycle(businessIds: string[]): Promise<OfferRow[]>;
  fetchActiveOfferCosts(businessIds: string[]): Promise<MinimalOfferCost[]>;
  updateOfferStatus(
    offerId: string,
    status: "active" | "paused",
    pausedReason: string | null
  ): Promise<void>;
  notify(
    userId: string,
    title: string,
    body: string,
    type: string
  ): Promise<void>;
}

export function offerCost(o: MinimalOfferCost): number {
  return (
    Math.round(Number(o.payout) * (1 + Number(o.platform_fee_rate)) * 100) / 100
  );
}

export async function runSyncLifecycle(
  client: LifecycleClient,
  userId: string
): Promise<SyncResult> {
  if (!userId) throw new Error("user_id is required");

  const wallet = await client.fetchWallet(userId);
  const available = wallet ? Number(wallet.available) : 0;

  const businesses = await client.fetchBusinesses(userId);
  if (!businesses || businesses.length === 0) {
    return { skipped: "no business", paused: 0, reactivated: 0, available };
  }
  const businessIds = businesses.map((b) => b.id);

  const offers = await client.fetchOffersForLifecycle(businessIds);
  if (!offers || offers.length === 0) {
    return { skipped: "no offers", paused: 0, reactivated: 0, available };
  }

  let paused = 0;
  let reactivated = 0;

  // Step 1: pause active offers if wallet < total committed.
  // Manual pauses (paused_reason !== "low_wallet") are NEVER touched here —
  // they're not in `activeOffers` and they're filtered out of the
  // reactivation candidate list by `paused_reason === "low_wallet"`.
  const activeOffers = offers.filter((o) => o.status === "active");
  const totalCommitted = activeOffers.reduce((s, o) => s + offerCost(o), 0);

  if (totalCommitted > available && activeOffers.length > 0) {
    // Pause the most expensive active offers until committed <= available.
    const sorted = [...activeOffers].sort((a, b) => offerCost(b) - offerCost(a));
    let runningCommitted = totalCommitted;
    for (const o of sorted) {
      if (runningCommitted <= available) break;
      await client.updateOfferStatus(o.id, "paused", "low_wallet");
      runningCommitted -= offerCost(o);
      paused += 1;
    }
    if (paused > 0) {
      await client.notify(
        userId,
        "Offers paused — wallet low",
        `${paused} offer${paused > 1 ? "s" : ""} paused because your wallet balance dropped below the committed amount. Top up to reactivate.`,
        "offer_paused_low_wallet"
      );
    }
  }

  // Step 2: reactivate offers paused-by-low-wallet if there's enough headroom.
  const autoPaused = offers.filter(
    (o) => o.status === "paused" && o.paused_reason === "low_wallet"
  );
  if (autoPaused.length > 0) {
    // Recompute committed using whatever's currently active in the DB
    // (after any pauses applied above).
    const stillActive = await client.fetchActiveOfferCosts(businessIds);
    let runningCommitted = stillActive.reduce((s, o) => s + offerCost(o), 0);
    // Reactivate cheapest first to bring back the most offers.
    const sorted = [...autoPaused].sort((a, b) => offerCost(a) - offerCost(b));
    for (const o of sorted) {
      const cost = offerCost(o);
      if (runningCommitted + cost <= available) {
        await client.updateOfferStatus(o.id, "active", null);
        runningCommitted += cost;
        reactivated += 1;
      }
    }
    if (reactivated > 0) {
      await client.notify(
        userId,
        "Offers reactivated",
        `${reactivated} offer${reactivated > 1 ? "s" : ""} reactivated now that your wallet is funded.`,
        "offer_reactivated"
      );
    }
  }

  return { success: true, paused, reactivated, available };
}
