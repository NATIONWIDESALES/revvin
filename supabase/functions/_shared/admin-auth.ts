export async function isPlatformAdmin(admin: any, user: { id: string; email?: string | null }) {
  const adminEmails = (Deno.env.get("SUPER_ADMIN_EMAILS") || "sales@nationwidesales.ca")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return Boolean(roleRow);
}
