import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_offers",
  title: "Search referral offers",
  description:
    "Search Revvin's public marketplace of referral offers. Filter by keyword, industry/category, city, or minimum payout. Returns active, approved offers from listed businesses.",
  inputSchema: {
    query: z.string().optional().describe("Keyword to match in offer title/description or business name."),
    category: z.string().optional().describe("Industry/category filter (e.g. 'Home Services', 'Legal')."),
    city: z.string().optional().describe("City name to filter businesses by."),
    min_payout: z.number().optional().describe("Minimum referral payout amount in the offer's currency."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, city, min_payout, limit }) => {
    const supabase = sb();
    let q = supabase
      .from("offers")
      .select(
        "id, title, description, category, payout, payout_type, currency, location, businesses!inner(id, name, city, state, slug, marketplace_listed, account_status)",
      )
      .eq("status", "active")
      .eq("approval_status", "approved")
      .eq("businesses.marketplace_listed", true)
      .limit(limit ?? 20);

    if (category) q = q.ilike("category", `%${category}%`);
    if (min_payout != null) q = q.gte("payout", min_payout);
    if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    if (city) q = q.ilike("businesses.city", `%${city}%`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };

    const rows = (data ?? []).map((o: any) => ({
      id: o.id,
      title: o.title,
      category: o.category,
      payout: o.payout,
      payout_type: o.payout_type,
      currency: o.currency,
      location: o.location,
      business: o.businesses?.name,
      city: o.businesses?.city,
      state: o.businesses?.state,
      url: o.businesses?.slug ? `https://revvin.co/offer/${o.businesses.slug}/${o.id}` : `https://revvin.co/offer/${o.id}`,
    }));

    return {
      content: [{ type: "text", text: `Found ${rows.length} offer(s):\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { offers: rows },
    };
  },
});