import LegalDocView from "@/components/LegalDocView";
import { PRIVACY_DOC, ADVERTISING_MEASUREMENT_NOTICE } from "@/content/legal";
import { META_PIXEL_ID, OPENAI_PIXEL_ID } from "@/config/brand";
import { Button } from "@/components/ui/button";

const Privacy = () => <><LegalDocView doc={PRIVACY_DOC} />{(META_PIXEL_ID || OPENAI_PIXEL_ID) && <section className="mk-wrap pb-10"><h2 className="text-3xl">Advertising measurement</h2><p className="mt-3">{ADVERTISING_MEASUREMENT_NOTICE}</p><Button variant="outline" className="mt-4" onClick={() => { try { localStorage.setItem("revvin_advertising_choice", "denied"); window.dispatchEvent(new Event("revvin:advertising-choice")); } catch { /* browser-level opt-outs remain available */ } }}>Turn off ad measurement</Button></section>}</>;

export default Privacy;
