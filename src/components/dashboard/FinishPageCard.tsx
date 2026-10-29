import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BusinessLogoUpload from "@/components/BusinessLogoUpload";
import { friendlyError } from "@/lib/errors";

export interface FinishPageBusiness {
  id: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  business_email: string | null;
  website: string | null;
  service_radius_km: number | null;
  offer_trigger: string | null;
  offer_fine_print: string | null;
}

/** The card is shown until both a logo and a phone number are on the page. */
export const needsFinishing = (b: Pick<FinishPageBusiness, "logo_url" | "phone">) =>
  !b.logo_url?.trim() || !b.phone?.trim();

/**
 * Optional details that used to live in the setup wizard. Never blocks
 * publishing or anything else; it just saves to the business row.
 */
const FinishPageCard = ({
  biz,
  onSaved,
  title = "Finish your page",
}: {
  biz: FinishPageBusiness;
  onSaved: () => void;
  title?: string;
}) => {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState(biz.logo_url);
  const [description, setDescription] = useState(biz.description ?? "");
  const [phone, setPhone] = useState(biz.phone ?? "");
  const [businessEmail, setBusinessEmail] = useState(biz.business_email ?? "");
  const [website, setWebsite] = useState(biz.website ?? "");
  const [radius, setRadius] = useState(String(biz.service_radius_km ?? 50));
  const [trigger, setTrigger] = useState(biz.offer_trigger ?? "");
  const [finePrint, setFinePrint] = useState(biz.offer_fine_print ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const km = Number.parseInt(radius, 10);
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        description: description.trim() || null,
        phone: phone.trim() || null,
        business_email: businessEmail.trim() || null,
        website: website.trim() || null,
        service_radius_km: Number.isFinite(km) && km > 0 ? Math.min(km, 500) : null,
        offer_trigger: trigger.trim() || null,
        offer_fine_print: finePrint.trim() || null,
      })
      .eq("id", biz.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: friendlyError(error), variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    onSaved();
  };

  return (
    <section aria-labelledby="finish-page-heading" className="mb-8 rounded-2xl border border-border bg-card p-6">
      <h2 id="finish-page-heading" className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. Your page is already usable. A logo and phone number help customers trust it.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Logo</Label>
          <div className="mt-1.5">
            <BusinessLogoUpload currentLogoUrl={logoUrl} businessId={biz.id} onUploaded={(u) => { setLogoUrl(u); onSaved(); }} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="fp-desc">One-sentence description</Label>
          <Textarea id="fp-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" placeholder="Residential roofing across Denver, CO." />
        </div>
        <div><Label htmlFor="fp-phone">Business phone</Label><Input id="fp-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" /></div>
        <div><Label htmlFor="fp-email">Business email</Label><Input id="fp-email" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="mt-1.5" /></div>
        <div><Label htmlFor="fp-web">Website</Label><Input id="fp-web" value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1.5" placeholder="https://" /></div>
        <div><Label htmlFor="fp-radius">Service radius (km)</Label><Input id="fp-radius" inputMode="numeric" value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ""))} className="mt-1.5" /></div>
        <div className="sm:col-span-2"><Label htmlFor="fp-trigger">Payout trigger</Label><Input id="fp-trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)} className="mt-1.5" placeholder="per closed roofing job" /></div>
        <div className="sm:col-span-2"><Label htmlFor="fp-fine">Fine print</Label><Textarea id="fp-fine" rows={2} value={finePrint} onChange={(e) => setFinePrint(e.target.value)} className="mt-1.5" /></div>
      </div>
      <Button onClick={save} disabled={saving} className="mt-5 h-11 w-full sm:h-10 sm:w-auto">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save details
      </Button>
    </section>
  );
};

export default FinishPageCard;
