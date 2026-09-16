import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { appUrl } from "../_shared/app-config.ts";
import { checkCronAuth } from "../_shared/cron-auth.ts";
import {
  FOUNDER_STORY_APPROVED,
  LIFECYCLE_COHORT_START,
  REVVIN_POSTAL_ADDRESS,
  SETUP_CALL_URL,
} from "../_shared/lifecycle-config.ts";
import { firstAskMessage } from "../_shared/lifecycle-copy.ts";
import { ownerEmail, sendLifecycleEmail } from "../_shared/lifecycle-email.ts";
import { hoursSince, pickCandidate, withinFrequencyCap, type Candidate } from "../_shared/lifecycle-rules.ts";

// Hourly cron worker. For each business it works out the single most important
// lifecycle email still owed, then sends that one. Guardrails:
//   - at most 1 lifecycle email per business per 24h and 3 per rolling 7 days
//   - every send is claimed once in business_lifecycle_emails before sending
//   - promotional email is skipped while REVVIN_POSTAL_ADDRESS is empty, once
//     the business is paying, and when promo_emails_opt_out is set
//   - demo businesses are skipped, and signup-anchored email only applies to
//     businesses created on or after LIFECYCLE_COHORT_START

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BIZ_COLUMNS =
  "id, name, slug, user_id, business_email, is_published, is_demo, is_disabled, first_share_at, offer_amount, created_at, plan, subscription_status, promo_emails_opt_out";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!checkCronAuth(req).ok) return json({ error: "Forbidden" }, 403);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const now = Date.now();
  const sentCounts: Record<string, number> = {};
  let skipped = 0;
  let capped = 0;

  const count = async (table: string, build: (q: any) => any) => {
    const { count: n } = await build(supabase.from(table).select("id", { count: "exact", head: true }));
    return n ?? 0;
  };

  try {
    const { data: businesses, error } = await supabase
      .from("businesses")
      .select(BIZ_COLUMNS)
      .not("is_demo", "is", true);
    if (error) throw error;

    for (const biz of businesses ?? []) {
      if (biz.is_disabled) continue;

      const { data: ledger } = await supabase
        .from("business_lifecycle_emails")
        .select("template, sent_at")
        .eq("business_id", biz.id);
      const rows = ledger ?? [];
      const sentTemplates = rows.map((r: any) => String(r.template));
      const sentAtOf = (template: string) =>
        rows.find((r: any) => r.template === template)?.sent_at ?? null;

      if (!withinFrequencyCap(rows.map((r: any) => String(r.sent_at)), now)) {
        capped++;
        continue;
      }

      const inCohort = new Date(biz.created_at).getTime() >= new Date(LIFECYCLE_COHORT_START).getTime();
      const ageHours = hoursSince(biz.created_at, now);
      const plan = String(biz.plan ?? "free").toLowerCase();
      const status = String(biz.subscription_status ?? "").toLowerCase();
      const publicUrl = biz.slug ? appUrl(`/r/${biz.slug}`) : null;
      const askMessage = firstAskMessage(biz.name ?? "us", publicUrl ?? appUrl(), biz.offer_amount ?? null);
      const hasReward = Boolean(String(biz.offer_amount ?? "").trim());

      const leads = await count("leads", (q) => q.eq("business_id", biz.id));
      const contacts = await count("referral_contacts", (q) => q.eq("business_id", biz.id));
      const contactSends = await count("referral_contact_sends", (q) => q.eq("business_id", biz.id));
      const campaigns = await count("campaigns", (q) => q.eq("business_id", biz.id));

      const firstLeadAt = await (async () => {
        if (leads === 0) return null;
        const { data } = await supabase
          .from("leads")
          .select("created_at")
          .eq("business_id", biz.id)
          .order("created_at", { ascending: true })
          .limit(1);
        return data?.[0]?.created_at ?? null;
      })();

      // Candidates in priority order. Setup first, promotional last.
      const candidates: Candidate[] = [];

      if (status === "canceled") {
        candidates.push({ template: "cancel_feedback", category: "setup", data: { businessName: biz.name } });
      }

      if (plan === "pro" && contacts === 0 && campaigns === 0) {
        candidates.push({
          template: "pro_welcome",
          data: { businessName: biz.name, customersUrl: appUrl("/dashboard?tab=customers") },
        });
      }

      const proWelcomeAge = hoursSince(sentAtOf("pro_welcome"), now);
      if (plan === "pro" && proWelcomeAge >= 48 && contacts === 0) {
        candidates.push({
          template: "pro_no_import_d2",
          data: { businessName: biz.name, customersUrl: appUrl("/dashboard?tab=customers") },
        });
      }
      if (plan === "pro" && proWelcomeAge >= 24 * 7 && contacts > 0 && contactSends === 0 && campaigns === 0) {
        candidates.push({
          template: "pro_no_ask_d7",
          data: { businessName: biz.name, askMessage, customersUrl: appUrl("/dashboard?tab=customers") },
        });
      }

      if (inCohort && !biz.is_published && ageHours >= 24) {
        candidates.push({
          template: "not_published_d1",
          data: {
            businessName: biz.name,
            hasReward,
            publicUrl,
            publishUrl: appUrl("/dashboard?tab=page"),
            rewardUrl: appUrl("/welcome"),
          },
        });
      }
      if (inCohort && !biz.is_published && ageHours >= 72 && sentTemplates.includes("not_published_d1")) {
        candidates.push({
          template: "not_published_d3",
          data: {
            businessName: biz.name,
            publishUrl: appUrl("/dashboard?tab=page"),
            setupCallUrl: SETUP_CALL_URL,
          },
        });
      }

      if (inCohort && biz.is_published && biz.slug && !biz.first_share_at && ageHours >= 72) {
        candidates.push({
          template: "no_share_d3",
          data: { businessName: biz.name, askMessage, dashboardUrl: appUrl("/dashboard") },
        });
      }

      if (inCohort && biz.is_published && leads === 0 && ageHours >= 24 * 7 && SETUP_CALL_URL) {
        candidates.push({
          template: "no_leads_d7",
          data: { businessName: biz.name, setupCallUrl: SETUP_CALL_URL },
        });
      }
      if (inCohort && biz.is_published && leads === 0 && ageHours >= 24 * 30 && SETUP_CALL_URL) {
        candidates.push({
          template: "no_leads_d30",
          data: { businessName: biz.name, setupCallUrl: SETUP_CALL_URL },
        });
      }

      // Promotional. Skipped entirely while REVVIN_POSTAL_ADDRESS is empty.
      if (plan !== "pro" && firstLeadAt && hoursSince(firstLeadAt, now) >= 24) {
        candidates.push({
          template: "first_lead_next_day",
          data: { businessName: biz.name, pricingUrl: appUrl("/pricing") },
        });
      }
      if (inCohort && biz.is_published && plan !== "pro" && ageHours >= 24 * 5) {
        candidates.push({
          template: "free_d5",
          data: { businessName: biz.name, askMessage, dashboardUrl: appUrl("/dashboard") },
        });
      }
      if (inCohort && biz.is_published && plan !== "pro" && ageHours >= 24 * 10) {
        candidates.push({
          template: "free_d10",
          data: { businessName: biz.name, pricingUrl: appUrl("/pricing") },
        });
      }
      if (inCohort && plan !== "pro" && ageHours >= 24 * 14 && FOUNDER_STORY_APPROVED) {
        candidates.push({
          template: "free_d14",
          data: { businessName: biz.name, setupCallUrl: SETUP_CALL_URL },
        });
      }
      if (inCohort && plan !== "pro" && ageHours >= 24 * 21) {
        candidates.push({
          template: "free_d21",
          data: { businessName: biz.name, pricingUrl: appUrl("/pricing") },
        });
      }
      if (plan !== "pro" && hoursSince(sentAtOf("cancel_feedback"), now) >= 24 * 30) {
        candidates.push({
          template: "winback_d30",
          data: { businessName: biz.name, publicUrl, pricingUrl: appUrl("/pricing") },
        });
      }

      const chosen = pickCandidate(candidates, sentTemplates, {
        postalAddress: REVVIN_POSTAL_ADDRESS,
        plan,
        subscriptionStatus: status,
        promoOptOut: biz.promo_emails_opt_out,
      });
      if (!chosen) continue;

      const to = await ownerEmail(supabase, biz);
      if (!to) {
        skipped++;
        continue;
      }

      // Unique insert wins the right to send exactly once.
      const { error: claimError } = await supabase
        .from("business_lifecycle_emails")
        .insert({ business_id: biz.id, template: chosen.template });
      if (claimError) {
        skipped++;
        continue;
      }

      const result = await sendLifecycleEmail({
        supabase,
        businessId: biz.id,
        templateName: chosen.template,
        to,
        data: chosen.data,
        idempotencyKey: `${chosen.template}-${biz.id}`,
        plan,
        subscriptionStatus: status,
        promoOptOut: biz.promo_emails_opt_out,
      });
      if (result.sent) sentCounts[chosen.template] = (sentCounts[chosen.template] ?? 0) + 1;
      else skipped++;
    }

    return json({
      ok: true,
      sent: sentCounts,
      skipped,
      capped,
      promo_enabled: Boolean(REVVIN_POSTAL_ADDRESS),
      founder_story_enabled: FOUNDER_STORY_APPROVED,
      setup_call_configured: Boolean(SETUP_CALL_URL),
    });
  } catch (error) {
    console.error("[lifecycle-emails] run failed", (error as Error)?.message ?? error);
    return json({ error: "Lifecycle email run failed" }, 500);
  }
});
