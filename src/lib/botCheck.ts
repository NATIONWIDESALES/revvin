/**
 * Client-side bot heuristic — a mirror of the server-side `fn_bot_reason`
 * rule in Postgres, kept deliberately simple.
 *
 * This exists for ONE reason: to stop advertising pixels from firing on
 * automated traffic. Roughly 70% of sessions on this site are a spoofed-UA
 * fleet, and every pixel event they trigger teaches Meta to buy more of
 * them. Funnel events are still recorded for bots (the server classifies
 * and the admin panel can show them) — only ad pixels are suppressed.
 *
 * The server is the source of truth. If you change the rule here, change
 * `public.fn_bot_reason` to match.
 */
const BOT_UA =
  /(bot|crawl|spider|slurp|scrap|fetch|monitor|preview|lighthouse|pingdom|uptime|headless|phantomjs|puppeteer|playwright|selenium|webdriver|electron)/i;

export function isLikelyBot(): boolean {
  try {
    if (typeof navigator === "undefined") return false;
    if (navigator.webdriver === true) return true;

    const ua = navigator.userAgent || "";
    if (BOT_UA.test(ua)) return true;

    // An old Chrome major AND no referrer. Both conditions matter: real
    // people do run old browsers, and direct traffic on a current browser
    // is completely normal.
    const chrome = ua.match(/Chrome\/(\d{1,4})/);
    if (chrome) {
      const major = parseInt(chrome[1], 10);
      const noReferrer =
        typeof document === "undefined" || !document.referrer;
      if (major < 130 && noReferrer) return true;
    }

    return false;
  } catch {
    return false;
  }
}
