// Shared unsubscribe token helper for edge functions that send app email
// through the Lovable email API. Reuses the one-token-per-address
// email_unsubscribe_tokens table, the same pattern as the SQL helper
// public.fn_email_unsubscribe_token.

// deno-lint-ignore no-explicit-any
export async function emailUnsubscribeToken(supabase: any, email: string): Promise<string | null> {
  const value = String(email ?? "").trim().toLowerCase();
  if (!value) return null;
  const read = async () => {
    const { data } = await supabase.from("email_unsubscribe_tokens").select("token").eq("email", value).limit(1);
    return (data?.[0]?.token as string | undefined) ?? null;
  };
  const existing = await read();
  if (existing) return existing;
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase.from("email_unsubscribe_tokens").insert({ token, email: value });
  if (!error) return token;
  // A concurrent writer may have created the row first.
  return await read();
}
