export async function isPlatformAdmin(admin: any, user: { id: string; email?: string | null }) {
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1);

  return Boolean(roleRow?.length);
}
