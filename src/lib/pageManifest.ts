/** Swapping the document manifest link. Browser only, kept out of build tooling. */

/**
 * Points the document's manifest link at this page's own manifest, and puts the
 * site manifest back on the way out. The build writes a real file for every page
 * that was published at build time; a page published since then has no file, so
 * the manifest is served from a blob instead. Either way the shortcut someone
 * saves reopens this page.
 */
export function applyPageManifest(options: {
  staticHref?: string;
  manifest: Record<string, unknown>;
}): () => void {
  if (typeof document === "undefined") return () => undefined;
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return () => undefined;
  const previous = link.getAttribute("href");
  let blobUrl = "";
  let cancelled = false;

  const setHref = (href: string) => {
    if (!cancelled) link.setAttribute("href", href);
  };

  const useBlob = () => {
    try {
      blobUrl = URL.createObjectURL(
        new Blob([JSON.stringify(options.manifest)], { type: "application/manifest+json" }),
      );
      setHref(blobUrl);
    } catch {
      /* nothing to swap in: the site manifest stays */
    }
  };

  if (options.staticHref) {
    void fetch(options.staticHref, { method: "GET" })
      .then((res) => (res.ok ? setHref(options.staticHref as string) : useBlob()))
      .catch(useBlob);
  } else {
    useBlob();
  }

  return () => {
    cancelled = true;
    if (previous) link.setAttribute("href", previous);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  };
}
