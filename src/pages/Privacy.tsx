import LegalDocView from "@/components/LegalDocView";
import { PRIVACY_DOC } from "@/content/legal";
import { META_PIXEL_ID } from "@/config/brand";

const Privacy = () => <><LegalDocView doc={PRIVACY_DOC} />{META_PIXEL_ID && <section className="mk-wrap pb-10"><h2 className="text-3xl">Advertising measurement</h2><p className="mt-3">We use the Meta Pixel to measure our ads.</p><p className="mt-2">When permitted, page visits and preview actions are shared with Meta for ad measurement. We do not send names, email addresses, phone numbers or customer matching data. Tracking stays off in regions requiring consent and when your browser signals an opt-out.</p></section>}</>;

export default Privacy;
