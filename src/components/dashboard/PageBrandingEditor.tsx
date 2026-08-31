import { copyText } from "@/lib/clipboard";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ProUpsell, { PRO_COPY } from "@/components/dashboard/ProUpsell";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";
import ServiceAreaAutocomplete, { type PlaceSelection } from "@/components/ServiceAreaAutocomplete";
import { Slider } from "@/components/ui/slider";
import {
  Palette,
  Image as ImageIcon,
  Upload,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Save,
  Sparkles,
} from "lucide-react";
import { MAX_UPLOAD_BYTES, uploadUserImage } from "@/lib/imageUpload";
import { friendlyError } from "@/lib/errors";

interface Testimonial {
  quote: string;
  author?: string;
  role?: string;
}

interface PageBrandingEditorProps {
  businessId: string;
  slug: string | null;
  /** Custom branding is a Revvin Pro feature. Free accounts see the editor,
   *  with the branding inputs disabled rather than silently failing on save. */
  isPro?: boolean;
  initial: {
    brand_color: string | null;
    cover_image_url: string | null;
    headline: string | null;
    welcome_message: string | null;
    referral_cta_label: string | null;
    testimonials: Testimonial[] | null;
    service_area?: string | null;
    service_radius_km?: number | null;
  };
  onSaved?: () => void;
}

const DEFAULT_COLOR = "#15803D";

function isHex(v: string) {
  return /^#[0-9a-f]{6}$/i.test(v.trim());
}

const PageBrandingEditor = ({ businessId, slug, isPro = false, initial, onSaved }: PageBrandingEditorProps) => {

  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [brandColor, setBrandColor] = useState<string>(initial.brand_color || "");
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.cover_image_url);
  const [headline, setHeadline] = useState(initial.headline || "");
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcome_message || "");
  const [ctaLabel, setCtaLabel] = useState(initial.referral_cta_label || "");
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initial.testimonials || []);
  const [serviceArea, setServiceArea] = useState(initial.service_area || "");
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(initial.service_radius_km ?? 50);
  const [placeGeo, setPlaceGeo] = useState<PlaceSelection | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = slug ? `${window.location.origin}/r/${slug}` : null;

  const handleCoverFile = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({ title: "File too large", description: "Max 15 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const result = await uploadUserImage("business-logos", "cover", file);
    setUploading(false);
    if ("error" in result) {
      toast({ title: "Couldn't upload that", description: result.error });
      return;
    }
    setCoverUrl(result.publicUrl);
    toast({ title: "Cover uploaded", description: "Save changes to apply it to your page." });
  };

  const addTestimonial = () => {
    setTestimonials((t) => [...t, { quote: "", author: "", role: "" }]);
  };
  const updateTestimonial = (i: number, key: keyof Testimonial, value: string) => {
    setTestimonials((t) => t.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  };
  const removeTestimonial = (i: number) => {
    setTestimonials((t) => t.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    setSaving(true);
    const trimmedBrand = brandColor.trim();
    const cleanTestimonials = testimonials
      .map((t) => ({
        quote: (t.quote || "").trim(),
        author: (t.author || "").trim() || undefined,
        role: (t.role || "").trim() || undefined,
      }))
      .filter((t) => t.quote.length > 0);

    const payload: Record<string, unknown> = {
      brand_color: trimmedBrand && isHex(trimmedBrand) ? trimmedBrand : null,
      cover_image_url: coverUrl || null,
      headline: headline.trim() || null,
      welcome_message: welcomeMessage.trim() || null,
      referral_cta_label: ctaLabel.trim() || null,
      testimonials: cleanTestimonials.length > 0 ? cleanTestimonials : null,
      service_area: serviceArea.trim() || null,
      service_radius_km: serviceRadiusKm,
    };

    const trimmedArea = serviceArea.trim();
    const matchedPlace =
      placeGeo && placeGeo.label.trim().toLowerCase() === trimmedArea.toLowerCase()
        ? placeGeo
        : null;
    if (matchedPlace) {
      payload.latitude = matchedPlace.latitude;
      payload.longitude = matchedPlace.longitude;
      payload.city = matchedPlace.city;
      payload.state = matchedPlace.state;
      payload.country = matchedPlace.country;
      payload.geocoded_at = new Date().toISOString();
      payload.geocode_status = "ok";
    }

    const { error } = await supabase
      .from("businesses")
      .update(payload as any)
      .eq("id", businessId);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: friendlyError(error), variant: "destructive" });
      return;
    }
    // Free text without a picked suggestion: resolve coordinates in the
    // background. Failure is fine, the business just won't show on the map.
    if (!matchedPlace && trimmedArea) {
      supabase.functions
        .invoke("geocode-business", { body: { business_id: businessId } })
        .catch((err) => console.error("[branding] geocode fallback failed", err));
    }
    toast({ title: "Branding saved", description: "Your referral page is updated." });
    onSaved?.();
  };

  const copyLink = async () => {
    if (!publicUrl) {
      toast({
        title: "Pick your page address first",
        description: "Choose a link name above and save, then you can copy the link.",
        variant: "destructive",
      });
      return;
    }
    const ok = await copyText(publicUrl);
    if (!ok) {
      toast({
        title: "Could not copy the link",
        description: "Select the link and copy it manually.",
        variant: "destructive",
      });
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const previewColor = brandColor && isHex(brandColor) ? brandColor : DEFAULT_COLOR;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${previewColor}1A`, color: previewColor }}
        >
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground leading-tight">Page branding</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            This is your own branded referral landing page, share it anywhere to bring in warm leads.
            Make it look like <em>your</em> business, not a template.
          </p>
        </div>
      </div>

      {/* Share / preview row */}
      {publicUrl && (
        <div
          className="rounded-lg border bg-muted/30 p-4 flex flex-col md:flex-row md:items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your referral page
            </p>
            <p className="mt-1 text-sm font-mono text-foreground truncate">{publicUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Preview my page
                </a>
              </Button>
            </div>
          </div>
          <div className="rounded-md bg-white p-2 border border-border self-start">
            <SimpleQRCode url={publicUrl} size={108} color={previewColor} />
          </div>
        </div>
      )}

      {!isPro && <ProUpsell title={PRO_COPY.branding.title} body={PRO_COPY.branding.body} />}

      {/* Brand color */}
      <fieldset disabled={!isPro} className={`space-y-6 ${!isPro ? "opacity-60" : ""}`}>
      <div>

        <Label className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Brand color
        </Label>
        <div className="mt-1.5 flex items-center gap-3">
          <input
            type="color"
            value={brandColor && isHex(brandColor) ? brandColor : DEFAULT_COLOR}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-14 rounded-md border border-border cursor-pointer bg-transparent"
          />
          <Input
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            placeholder="#15803D"
            className="max-w-[140px] font-mono text-sm"
          />
          {brandColor && !isHex(brandColor) && (
            <p className="text-xs text-destructive">Use format #RRGGBB</p>
          )}
          {!brandColor && (
            <p className="text-xs text-muted-foreground">Leave blank to auto-pick a color.</p>
          )}
        </div>
      </div>

      {/* Cover image */}
      <div>
        <Label className="flex items-center gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" /> Cover image
          <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="mt-1.5">
          {coverUrl ? (
            <div className="space-y-2">
              <div
                className="h-40 w-full rounded-lg border border-border bg-cover bg-center"
                style={{ backgroundImage: `url(${coverUrl})` }}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Replace
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCoverUrl(null)} disabled={uploading}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors"
            >
              <div className="text-center">
                {uploading ? (
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                ) : (
                  <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                )}
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload a cover image"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG, WEBP or HEIC, up to 15 MB</p>
              </div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCoverFile(f);
            }}
          />
        </div>
      </div>
      </fieldset>



      {/* Service area */}
      <div>
        <Label htmlFor="branding-service-area">Service area</Label>
        <ServiceAreaAutocomplete
          id="branding-service-area"
          value={serviceArea}
          onChange={setServiceArea}
          onPlaceSelected={setPlaceGeo}
          placeholder="Vancouver, BC"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Pick your city or region from the list so you appear on the map and in nearby searches.
        </p>
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <Label>How far do you travel?</Label>
            <span className="text-sm font-medium text-foreground">{serviceRadiusKm} km</span>
          </div>
          <Slider
            value={[serviceRadiusKm]}
            onValueChange={(v) => setServiceRadiusKm(v[0])}
            min={5}
            max={200}
            step={5}
            className="mt-3"
          />
        </div>
      </div>

      {/* Headline, welcome message and testimonials: Pro branding */}
      <fieldset disabled={!isPro} className={`space-y-6 ${!isPro ? "opacity-60" : ""}`}>
      <div>

        <Label>Headline</Label>
        <Input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Know someone who needs a new roof?"
          className="mt-1.5"
          maxLength={120}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Big bold line at the top of your page.
        </p>
      </div>

      {/* Welcome message */}
      <div>
        <Label>Welcome message</Label>
        <Textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="Hi, thanks for sending us a referral. We treat every lead you send like family and pay you fast when the deal closes."
          rows={4}
          className="mt-1.5"
          maxLength={600}
        />
      </div>

      {/* CTA label */}
      <div>
        <Label>Submit button label</Label>
        <Input
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          placeholder="Submit a referral"
          className="mt-1.5"
          maxLength={40}
        />
      </div>

      {/* Testimonials */}
      <div>
        <div className="flex items-center justify-between">
          <Label>Testimonials</Label>
          <Button size="sm" variant="outline" onClick={addTestimonial} type="button">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 mb-3">
          Add 1–4 short quotes from happy customers to build trust.
        </p>

        {testimonials.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No testimonials yet.</p>
        ) : (
          <div className="space-y-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-background">
                <Textarea
                  value={t.quote}
                  onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                  placeholder="They were on time, on budget, and the team was incredible."
                  rows={2}
                  maxLength={300}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={t.author ?? ""}
                    onChange={(e) => updateTestimonial(i, "author", e.target.value)}
                    placeholder="Author (e.g. Sarah M.)"
                    maxLength={60}
                  />
                  <Input
                    value={t.role ?? ""}
                    onChange={(e) => updateTestimonial(i, "role", e.target.value)}
                    placeholder="Role / location (optional)"
                    maxLength={60}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeTestimonial(i)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </fieldset>



      <div className="flex justify-end pt-2 border-t border-border">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save branding"}
        </Button>
      </div>
    </div>
  );
};

export default PageBrandingEditor;