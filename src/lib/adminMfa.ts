export type AdminMfaState = { checked: boolean; required: boolean; aal: string | null; factorId?: string; error?: boolean };
export function adminMfaAllowed(state: AdminMfaState): boolean {
  return state.checked && !state.error && (!state.required || state.aal === "aal2");
}