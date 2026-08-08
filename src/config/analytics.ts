// Meta (Facebook) pixel. Public by design: a pixel ID is visible in the page
// source of every site that uses one, so it lives here rather than in a secret
// store. Lovable's secret manager rejects VITE_ prefixed names because those are
// compiled into the public bundle.
//
// To turn the pixel off entirely, set this to an empty string and republish.
export const META_PIXEL_ID = "1941132123224407";