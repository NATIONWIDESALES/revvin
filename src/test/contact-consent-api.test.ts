import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Integration test: drives the real PostgREST endpoint that the Invite-customers
// page hits when an owner accepts (or attempts to mutate) the consent timestamp.
// Asserts the prevent_consent_timestamp_rollback trigger surfaces the expected
// "append-only" error to the client. Skips gracefully when the project requires
// email confirmation (no session is returned from signUp).

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const runIf = url && anon ? describe : describe.skip;

runIf("businesses.contact_outreach_consent_at via Data API", () => {
  let client: SupabaseClient;
  let businessId: string | null = null;
  let userId: string | null = null;
  const email = `consent-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@revvin.test`;
  const password = `Tt!${Math.random().toString(36).slice(2, 14)}A9`;
  let skipAll = false;

  beforeAll(async () => {
    client = createClient(url!, anon!, { auth: { persistSession: false } });
    const signUp = await client.auth.signUp({
      email,
      password,
      options: { data: { role: "business", full_name: "Consent Test", business_name: "Consent Test Co" } },
    });
    if (signUp.error) throw signUp.error;
    if (!signUp.data.session) {
      // Email confirmation is on for this project; we cannot authenticate from
      // the test client. The SQL-level test under supabase/tests covers the
      // trigger; this REST-level check is skipped in that configuration.
      skipAll = true;
      return;
    }
    userId = signUp.data.user!.id;

    // handle_new_user inserts the business row; give it a moment, then fetch.
    for (let i = 0; i < 10 && !businessId; i++) {
      const { data } = await client.from("businesses").select("id").eq("user_id", userId).limit(1);
      businessId = (data?.[0]?.id as string | undefined) ?? null;
      if (!businessId) await new Promise((r) => setTimeout(r, 200));
    }
    if (!businessId) throw new Error("business row was not auto-created for test user");
  }, 30_000);

  afterAll(async () => {
    if (businessId) {
      await client.from("businesses").delete().eq("id", businessId);
    }
    await client.auth.signOut();
    // auth.users cleanup requires service role; rows are harmless test residue.
  });

  it("owner can set NULL -> timestamp", async () => {
    if (skipAll) return;
    const t1 = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error } = await client
      .from("businesses")
      .update({ contact_outreach_consent_at: t1 })
      .eq("id", businessId!);
    expect(error).toBeNull();
  });

  it("owner CANNOT clear timestamp back to NULL", async () => {
    if (skipAll) return;
    const { error } = await client
      .from("businesses")
      .update({ contact_outreach_consent_at: null })
      .eq("id", businessId!);
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("append-only");
  });

  it("owner CANNOT backdate timestamp", async () => {
    if (skipAll) return;
    const earlier = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error } = await client
      .from("businesses")
      .update({ contact_outreach_consent_at: earlier })
      .eq("id", businessId!);
    expect(error).not.toBeNull();
    expect(error!.message.toLowerCase()).toContain("append-only");
  });

  it("owner CAN move timestamp forward", async () => {
    if (skipAll) return;
    const later = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const { error } = await client
      .from("businesses")
      .update({ contact_outreach_consent_at: later })
      .eq("id", businessId!);
    expect(error).toBeNull();
  });
});