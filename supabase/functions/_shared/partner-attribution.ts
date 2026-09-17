// Server-side partner attribution for a newly created business.
//
// Attribution is written once, at creation, by the service role. A business
// owner cannot set or change it: the businesses_partner_attribution_locked
// trigger rejects the change for every role except service_role.

import { attributionDecision, normalizePartnerCode, preferredCode } from "./partner-rules.ts";

type Database = any;

export interface AttributeInput {
  db: Database;
  business: {
    id: string;
    partner_id?: string | null;
    is_demo?: boolean | null;
    created_at?: string | null;
  };
  ownerEmail?: string | null;
  typedCode?: string | null;
  clickCode?: string | null;
  clickedAt?: string | null;
  now?: number;
}

export type AttributeResult =
  | { attributed: true; partnerId: string; via: "typed" | "click" }
  | { attributed: false; reason: string };

/** Look up a partner by code. Unknown codes resolve to null, silently. */
export async function partnerByCode(db: Database, rawCode: unknown) {
  const code = normalizePartnerCode(rawCode);
  if (!code) return null;
  const { data } = await db
    .from("partners")
    .select("id, status, email, name, code")
    .eq("code", code)
    .limit(1);
  return data?.[0] ?? null;
}

export async function attributeBusinessToPartner(input: AttributeInput): Promise<AttributeResult> {
  const { db, business } = input;
  const code = preferredCode(input.typedCode, input.clickCode);
  if (!code) return { attributed: false, reason: "no_code" };

  const partner = await partnerByCode(db, code);
  const decision = attributionDecision({
    typedCode: input.typedCode,
    clickCode: input.clickCode,
    clickedAt: input.clickedAt,
    partner,
    ownerEmail: input.ownerEmail,
    isDemo: business.is_demo,
    alreadyAttributed: Boolean(business.partner_id),
    now: input.now,
  });
  if (decision.attribute !== true) return { attributed: false, reason: decision.reason };

  // Conditional update: attribution is set only while it is still unset, so a
  // repeat call or a race can never move a business between partners.
  const { data, error } = await db
    .from("businesses")
    .update({
      partner_id: decision.partnerId,
      partner_attributed_at: new Date(input.now ?? Date.now()).toISOString(),
    })
    .eq("id", business.id)
    .is("partner_id", null)
    .select("id");
  if (error) throw new Error(`Partner attribution failed: ${error.message ?? error}`);
  if (!data?.length) return { attributed: false, reason: "already_attributed" };

  return { attributed: true, partnerId: decision.partnerId, via: decision.via };
}
