import { describe, expect, it } from "vitest";
import { isNewBusinessAccount, roleChangeCounts } from "../../supabase/functions/security-monitor/role-changes";

const change = (action: string, role: string, actor: string | null = null) => ({ details: { action, role, actor } });

describe("security monitor role email filtering", () => {
  it("suppresses only actorless business inserts", () => {
    expect(isNewBusinessAccount(change("INSERT", "business"))).toBe(true);
  });
  it.each(["admin", "super_admin"])("alerts on %s inserts", (role) => {
    expect(isNewBusinessAccount(change("INSERT", role))).toBe(false);
  });
  it.each(["UPDATE", "DELETE"])("alerts on business %s even without an actor", (action) => {
    expect(isNewBusinessAccount(change(action, "business"))).toBe(false);
  });
  it("alerts on business inserts with a non-null actor", () => {
    expect(isNewBusinessAccount(change("INSERT", "business", "actor-id"))).toBe(false);
  });
  it("does not suppress unknown roles or malformed audit data", () => {
    for (const details of [null, {}, [], { action: "INSERT", role: "business" }]) {
      expect(isNewBusinessAccount({ details })).toBe(false);
    }
    expect(isNewBusinessAccount(change("INSERT", "referrer"))).toBe(false);
  });
  it("keeps all changes in weekly totals while splitting routine accounts", () => {
    expect(roleChangeCounts([
      change("INSERT", "business"), change("INSERT", "business"),
      change("INSERT", "admin"), change("UPDATE", "business"),
      change("DELETE", "business"), change("INSERT", "business", "actor-id"),
    ])).toEqual({ total: 6, newBusinessAccounts: 2, otherRoleChanges: 4 });
  });
});