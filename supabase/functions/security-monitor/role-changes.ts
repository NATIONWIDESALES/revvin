interface RoleChange {
  details: unknown;
}

// Only the exact actorless business INSERT is routine. Unknown data alerts.
export function isNewBusinessAccount(change: RoleChange): boolean {
  const details = change.details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return false;
  const event = details as Record<string, unknown>;
  return event.action === "INSERT" && event.role === "business" && event.actor === null;
}

export function roleChangeCounts(changes: RoleChange[]) {
  const newBusinessAccounts = changes.filter(isNewBusinessAccount).length;
  return { total: changes.length, newBusinessAccounts, otherRoleChanges: changes.length - newBusinessAccounts };
}