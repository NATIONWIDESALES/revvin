/**
 * Columns the public referral page reads from businesses_public. Shared with a
 * test that checks every name against the generated view types, so a column
 * the view does not expose fails the build instead of breaking live pages.
 */
export const PUBLIC_REFERRAL_PAGE_COLS =
  "id,name,slug,description,category,service_area,logo_url,offer_amount,offer_trigger,offer_fine_print,city,state,website,is_verified,brand_color,cover_image_url,headline,welcome_message,referral_cta_label,testimonials,is_demo,index_approved";

/**
 * The build renders the full referral page, so it reads everything the page
 * reads, plus the date used for the sitemap.
 */
export const PRERENDER_BUSINESS_COLS = PUBLIC_REFERRAL_PAGE_COLS as const;
