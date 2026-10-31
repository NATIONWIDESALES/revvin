export async function effectivePlan(db: any, businessId: string): Promise<string> {
  const { data, error } = await db.rpc("fn_effective_plan", { p_business_id: businessId });
  if (error || typeof data !== "string") throw new Error("effective_plan_unavailable");
  return data;
}