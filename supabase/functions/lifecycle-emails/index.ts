import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl } from "../_shared/app-config.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import { LIFECYCLE_COHORT_START, SETUP_CALL_URL } from "../_shared/lifecycle-config.ts";
import { firstAskMessage } from "../_shared/lifecycle-copy.ts";
import { ownerEmail, sendLifecycleEmail } from "../_shared/lifecycle-email.ts";

// Hourly cron worker. Finds businesses that stalled at a known point and sends
// one nudge each, at most once ever. The at-most-once claim is a unique insert
// into business_lifecycle_emails before the send.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BIZ_COLUMNS =
  "id, name, slug, user_id, business_email, is_published, is_demo, is_disabled, first_share_at, offer_amount, created_at";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!checkCronAuth(req).ok) return json({ error: "Forbidden" }, 403);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const counts: Record<string, number> = { not_published_d1: 0, no_share_d3: 0, no_leads_d7: 0, skipped: 0 };

  /** Unique insert wins the right to send exactly once. */
  const claim = async (businessId: string, template: string) => {
    const { error } = await supabase
      .from("business_lifecycle_emails")
      .insert({ business_id: businessId, template });
    return !error;
  };

  const eligible = () =>
    supabase
      .from("businesses")
      .select(BIZ_COLUMNS)
      .not("is_demo", "is", true)
      .gte("created_at", LIFECYCLE_COHORT_START);

  const send = async (biz: any, template: string, data: Record<string, unknown>) => {
    const to = await ownerEmail(supabase, biz);
    if (!to) {
      counts.skipped++;
      return;
    }
    if (!(await claim(biz.id, template))) {
      counts.skipped++;
      return;
    }
    const result = await sendLifecycleEmail({
      supabase,
      businessId: biz.id,
      templateName: template,
      to,
      data,
      idempotencyKey: `${template}-${biz.id}`,
    });
    if (result.sent) counts[template]++;
    else counts.skipped++;
  };

  try {
    const publicUrlFor = (biz: any) => appUrl(`/r/${biz.slug ?? ""}`);

    // b) 24h after signup, still in draft.
    const { data: notPublished, error: e1 } = await eligible()
      .eq("is_published", false)
      .lte("created_at", hoursAgo(24));
    if (e1) throw e1;
    for (const biz of notPublished ?? []) {
      if (biz.is_disabled) continue;
      await send(biz, "not_published_d1", {
        businessName: biz.name,
        publicUrl: biz.slug ? publicUrlFor(biz) : null,
        publishUrl: appUrl("/dashboard?tab=page"),
      });
    }

    // c) 72h after going live, nothing shared yet.
    const { data: noShare, error: e2 } = await eligible()
      .eq("is_published", true)
      .is("first_share_at", null)
      .lte("created_at", hoursAgo(72));
    if (e2) throw e2;
    for (const biz of noShare ?? []) {
      if (biz.is_disabled || !biz.slug) continue;
      await send(biz, "no_share_d3", {
        businessName: biz.name,
        askMessage: firstAskMessage(biz.name ?? "us", publicUrlFor(biz), biz.offer_amount ?? null),
        dashboardUrl: appUrl("/dashboard"),
      });
    }

    // d) 7 days after going live, still zero leads. Skipped while no booking
    // link is configured, so the offer never points at a dead URL.
    if (SETUP_CALL_URL) {
      const { data: aged, error: e3 } = await eligible()
        .eq("is_published", true)
        .lte("created_at", hoursAgo(24 * 7));
      if (e3) throw e3;
      for (const biz of aged ?? []) {
        if (biz.is_disabled) continue;
        const { count, error: leadErr } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", biz.id);
        if (leadErr) throw leadErr;
        if ((count ?? 0) > 0) continue;
        await send(biz, "no_leads_d7", { businessName: biz.name, setupCallUrl: SETUP_CALL_URL });
      }
    }

    return json({ ok: true, ...counts, setup_call_configured: Boolean(SETUP_CALL_URL) });
  } catch (error) {
    console.error("[lifecycle-emails] run failed", (error as Error)?.message ?? error);
    return json({ error: "Lifecycle email run failed" }, 500);
  }
});
