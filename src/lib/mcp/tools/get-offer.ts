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
  name: "get_offer",
  title: "Get offer details",
  description: "Fetch full details for a single Revvin referral offer by its ID, including business info and payout terms.",
  inputSchema: {
    offer_id: z.string().uuid().describe("The offer's UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ offer_id }) => {
    const supabase = sb();
    const { data, error } = await supabase
      .from("offers")
      .select(
        "id, title, description, category, payout, payout_type, currency, location, remote_eligible, qualification_criteria, close_time_days, deal_size_min, deal_size_max, status, approval_status, businesses(id, name, slug, city, state, website, description, phone, verified)",
      )
      .eq("id", offer_id)
      .limit(1);

    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    if (!data || data.length === 0) return { content: [{ type: "text", text: "Offer not found." }], isError: true };

    const offer = data[0];
    return {
      content: [{ type: "text", text: JSON.stringify(offer, null, 2) }],
      structuredContent: { offer },
    };
  },
});