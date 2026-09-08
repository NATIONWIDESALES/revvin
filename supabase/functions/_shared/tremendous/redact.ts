// Redaction helpers. Credentials, webhook signatures and reward redemption links
// must never reach errors, logs, or any browser-safe result.

const PATTERNS: RegExp[] = [
  /\b(?:TEST|PROD|prod|test)_[A-Za-z0-9._-]{4,}/g,
  /\bBearer\s+[A-Za-z0-9._-]{6,}/gi,
  /\bsha256=[A-Fa-f0-9]{8,}/g,
  /https?:\/\/[A-Za-z0-9.-]*tremendous\.com\/[^\s"']*/gi,
];

/** Replace credential material, signatures and reward links with a marker. */
export function redact(input: string): string {
  let out = input;
  for (const pattern of PATTERNS) out = out.replace(pattern, "[redacted]");
  return out;
}

/** Deeply redact an arbitrary value so it is safe to log or return. */
export function redactValue<T>(value: T): unknown {
  if (typeof value === "string") return redact(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/credential|api[_-]?key|token|secret|signature|reward_url|link/i.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = redactValue(v);
    }
    return out;
  }
  return value;
}

/** Turn any thrown value into a redacted, browser-safe message. */
export function safeErrorMessage(error: unknown, fallback = "Tremendous sandbox request failed."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const message = redact(raw).trim();
  return message.length > 0 ? message : fallback;
}
