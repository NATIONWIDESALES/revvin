export function protectedFramePath(path: string): boolean {
  return /^\/(dashboard|welcome|me|__sa|__health|reset-password|auth|login|signup|checkout|billing|r|feedback|preview|earn|referrer)(\/|$)/.test(path) || path.startsWith("/partners/dashboard");
}

export function blockFramedPage(path: string, host: Window = window): boolean {
  if (!protectedFramePath(path) || host.top === host.self) return false;
  try { if (host.top) host.top.location.href = host.location.href; } catch { /* Fail closed when breakout is denied. */ }
  return true;
}