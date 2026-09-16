/**
 * Per-page web app manifests.
 *
 * A shortcut saved from a business referral page must reopen that business's
 * page, not the Revvin dashboard, so those pages get their own manifest with
 * their own id, start_url and scope. Everything else keeps the site manifest.
 */

const REVVIN_ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
  { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

export const THEME_COLOR = "#15803D";
export const BACKGROUND_COLOR = "#FFFFFF";

/** Home screen labels are clipped by the phone, so the short name is kept short. */
export const shortAppName = (name: string) => name.trim().slice(0, 12);

export interface BusinessManifestInput {
  slug: string;
  name: string;
  logoUrl?: string | null;
}

export const buildBusinessManifest = ({ slug, name, logoUrl }: BusinessManifestInput) => ({
  id: `/r/${slug}`,
  name: `Refer ${name}`,
  short_name: shortAppName(name),
  description: `Send ${name} a referral in about a minute.`,
  start_url: `/r/${slug}`,
  scope: `/r/${slug}`,
  display: "standalone",
  orientation: "portrait",
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  lang: "en-US",
  icons: logoUrl
    ? [{ src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" }, ...REVVIN_ICONS]
    : REVVIN_ICONS,
});

/** The private status receipt. Its start_url is the receipt itself. */
export const buildStatusManifest = (statusPath: string, businessName: string) => ({
  id: statusPath,
  name: `Referral to ${businessName}`,
  short_name: shortAppName(businessName),
  description: "Check the stage and reward status of your referral.",
  start_url: statusPath,
  scope: statusPath,
  display: "standalone",
  orientation: "portrait",
  theme_color: THEME_COLOR,
  background_color: BACKGROUND_COLOR,
  lang: "en-US",
  icons: REVVIN_ICONS,
});

/**
 * Swaps the document's manifest link for this page's own manifest, served from
 * a blob so no request leaves the browser, and puts the site manifest back on
 * the way out. Pages published after the last build have no build-time manifest
 * file, so this is what makes their shortcut open the right page.
 */
export function useDocumentManifest(manifest: Record<string, unknown> | null) {
  if (typeof document === "undefined" || !manifest) return () => undefined;
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return () => undefined;
  const previous = link.getAttribute("href");
  let url = "";
  try {
    url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
  } catch {
    return () => undefined;
  }
  // A blob manifest cannot be same-origin credentialed, so keep it anonymous.
  link.setAttribute("crossorigin", "anonymous");
  link.setAttribute("href", url);
  return () => {
    if (previous) link.setAttribute("href", previous);
    link.removeAttribute("crossorigin");
    URL.revokeObjectURL(url);
  };
}
