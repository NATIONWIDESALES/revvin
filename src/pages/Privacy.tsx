import LegalDocView from "@/components/LegalDocView";
import { PRIVACY_DOC } from "@/content/legal";
import { META_PIXEL_ID } from "@/config/brand";
import { Button } from "@/components/ui/button";

const Privacy = () => <><LegalDocView doc={PRIVACY_DOC} />{META_PIXEL_ID && <section className="mk-wrap pb-10"><h2 className="text-3xl">Advertising measurement</h2><p className="mt-3">We use the Meta Pixel to measure our ads.</p><p className="mt-2">When permitted, page visits, preview actions, account creation and publication events are shared with Meta for ad measurement. Meta may receive browser, device and cookie information. We do not send names, email addresses, phone numbers or customer matching data. Tracking stays off in regions requiring consent and when your browser signals an opt-out.</p><Button variant="outline" className="mt-4" onClick={() => { try { localStorage.setItem("revvin_advertising_choice", "denied"); window.dispatchEvent(new Event("revvin:advertising-choice")); } catch { /* browser-level opt-outs remain available */ } }}>Turn off ad measurement</Button></section>}</>;

export default Privacy;
