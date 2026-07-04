import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "list_categories",
  title: "List offer categories",
  description: "List the distinct industry categories currently represented in the Revvin marketplace.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const supabase = sb();
    const { data, error } = await supabase
      .from("offers")
      .select("category")
      .eq("status", "active")
      .eq("approval_status", "approved")
      .limit(1000);
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    const cats = Array.from(new Set((data ?? []).map((r: any) => r.category).filter(Boolean))).sort();
    return {
      content: [{ type: "text", text: JSON.stringify(cats, null, 2) }],
      structuredContent: { categories: cats },
    };
  },
});
