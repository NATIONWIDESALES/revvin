export const FBCLID_KEY = "revvin_fbclid";
export const FBCLID_FIRST_SEEN_KEY = "revvin_fbclid_first_seen";

export function validFbclid(value: string | null): value is string {
  return Boolean(value && value.length <= 500 && /^[A-Za-z0-9_.-]+$/.test(value));
}

export function clearMetaClick() {
  try {
    sessionStorage.removeItem(FBCLID_KEY);
    sessionStorage.removeItem(FBCLID_FIRST_SEEN_KEY);
  } catch { /* unavailable storage must not interrupt navigation */ }
}

/** Call only after advertising permission and eligible URL checks pass. */
export function permittedFbclid(search: string): string | null {
  const values = new URLSearchParams(search).getAll("fbclid");
  if (values.length) {
    const value = values[0];
    if (values.length !== 1 || !validFbclid(value)) {
      clearMetaClick();
      return null;
    }
    try {
      const previous = sessionStorage.getItem(FBCLID_KEY);
      const timestamp = sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY);
      if (previous !== value || !timestamp || !/^\d+$/.test(timestamp)) {
        sessionStorage.setItem(FBCLID_FIRST_SEEN_KEY, String(Date.now()));
      }
      sessionStorage.setItem(FBCLID_KEY, value);
    } catch { /* this permitted visit can still use its validated URL value */ }
    return value;
  }
  try {
    const value = sessionStorage.getItem(FBCLID_KEY);
    const timestamp = Number(sessionStorage.getItem(FBCLID_FIRST_SEEN_KEY));
    return validFbclid(value) && Number.isSafeInteger(timestamp) && timestamp > 0 && timestamp <= Date.now() ? value : null;
  } catch { return null; }
}