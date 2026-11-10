// Default outreach scripts for the outbound sales team. Callers can edit
// their own copies in the CRM Prospects tab; these are the shared defaults.
// Placeholders: {first name}, {caller}, {business}, {link}.

export const PROSPECT_TEXT_SCRIPT =
  "Hi {first name}, it's {caller} with Revvin. I built {business}'s free referral page so your past customers can send you jobs: {link}. Take a look, it's yours if you want it.";

export const PROSPECT_EMAIL_SUBJECT = "{business}: your referral page is ready";

export const PROSPECT_EMAIL_SCRIPT =
  "Hi {first name},\n\nI'm {caller} with Revvin. We built a free referral page for {business} so your past customers can send you jobs with one tap.\n\nTake a look: {link}\n\nIt's yours if you want it. Claiming is free and takes about a minute. Your business page goes live at signup. Free covers your first 25 customers.\n\n{caller}\nRevvin";

export function fillScript(
  template: string,
  vars: { firstName?: string; caller?: string; business: string; link: string },
): string {
  return template
    .split("{first name}").join(vars.firstName?.trim() || "there")
    .split("{caller}").join(vars.caller?.trim() || "the Revvin team")
    .split("{business}").join(vars.business)
    .split("{link}").join(vars.link);
}
