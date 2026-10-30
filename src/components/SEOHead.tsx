import { useEffect } from "react";

const BASE_URL = "https://revvin.co";
const DEFAULT_OG_IMAGE = "https://revvin.co/og-image.png";

// Default fallback head values, used only if a route forgets to pass props.
// These mirror the static shell in index.html so prerender, runtime, and
// fallback all describe the same free-to-build, $49/month-to-publish model.
export const DEFAULT_TITLE = "Revvin | Free referral program for home-service businesses";
export const DEFAULT_DESCRIPTION =
  "Turn happy customers into salespeople. A free referral page, personal links and an ask after every job. You pay a reward only when a job closes.";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  canonicalUrl?: string;
  ogImage?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

function setMeta(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** The build writes one share image per prerendered page at /og/{path}.png. */
const pageOgImage = (path: string) =>
  path ? `${BASE_URL}/og/${path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "--")}.png` : DEFAULT_OG_IMAGE;

const SEOHead = ({ title, description, path = "", canonicalUrl, ogImage, jsonLd, noindex }: SEOHeadProps) => {
  useEffect(() => {
    // A prerendered document already carries this page's full head, including
    // its structured data, and its canonical names this page. Leave it alone
    // so the head after hydration is the one crawlers read. After an in-app
    // navigation the static structured data describes the previous page, so
    // it is removed and this component takes over the head from then on.
    const staticLd = document.querySelector('script[type="application/ld+json"]:not(#seo-jsonld)');
    if (staticLd) {
      const canonicalHref = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
      const here = `${BASE_URL}${window.location.pathname === "/" ? "/" : window.location.pathname}`;
      if (canonicalHref === here) return;
      staticLd.remove();
    }

    // Title
    document.title = title;

    // Standard meta
    setMeta("name", "description", description);
    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      const robotsEl = document.querySelector('meta[name="robots"]');
      if (robotsEl) robotsEl.remove();
    }

    // OG tags
    const url = canonicalUrl || (path ? `${BASE_URL}${path}` : BASE_URL);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:site_name", "Revvin");
    setMeta("property", "og:image", ogImage || pageOgImage(path));
    setMeta("property", "og:locale", "en_US");

    // Twitter tags
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage || pageOgImage(path));

    // Theme color
    setMeta("name", "theme-color", "#15803D");

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    // JSON-LD
    const jsonLdId = "seo-jsonld";
    let scriptEl = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (jsonLd) {
      const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      const content = payload.length === 1 ? JSON.stringify(payload[0]) : JSON.stringify(payload);
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = jsonLdId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = content;
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const el = document.getElementById(jsonLdId);
      if (el) el.remove();
    };
  }, [title, description, path, canonicalUrl, ogImage, jsonLd, noindex]);

  return null;
};

export default SEOHead;
