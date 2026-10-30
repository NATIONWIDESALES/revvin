/**
 * Data the build-time render used for a page, handed to the browser in
 * window.__REVVIN_SSR__ (and set on globalThis during the server render) so
 * the first browser render matches the prerendered markup exactly.
 */
export interface SsrBusinessData<B> {
  business: B & { slug: string };
  earnMetro: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __REVVIN_SSR__: SsrBusinessData<{ slug: string }> | undefined;
}

export function readSsrBusiness<B>(slug: string | undefined): SsrBusinessData<B> | null {
  const data = globalThis.__REVVIN_SSR__;
  if (!slug || !data?.business || data.business.slug !== slug) return null;
  return data as unknown as SsrBusinessData<B>;
}
