export async function isPlatformAdmin(admin: any, user: { id: string; email?: string | null }, caller?: any) {
  // Caller-scoped RPC uses the verified JWT and live factor state, never decoded claims.
  if (caller) {
    const { data, error } = await caller.rpc("has_role", { _user_id: user.id, _role: "admin" });
    return !error && data === true;
  }
  // Fail closed: service clients cannot supply the caller's assurance level.
  return false;
}
