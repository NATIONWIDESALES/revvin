import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SimpleQRCode from "@/components/marketplace/SimpleQRCode";
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

interface Testimonial {
  quote: string;
  author?: string;
  role?: string;
}

interface PageBrandingEditorProps {
  businessId: string;
  slug: string | null;
  initial: {
    brand_color: string | null;
    cover_image_url: string | null;
    headline: string | null;
    welcome_message: string | null;
    referral_cta_label: string | null;
    testimonials: Testimonial[] | null;
  };
  onSaved?: () => void;
}

const DEFAULT_COLOR = "#15803D";

function isHex(v: string) {
  return /^#[0-9a-f]{6}$/i.test(v.trim());
}

const PageBrandingEditor = ({ businessId, slug, initial, onSaved }: PageBrandingEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [brandColor, setBrandColor] = useState<string>(initial.brand_color || "");
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.cover_image_url);
  const [headline, setHeadline] = useState(initial.headline || "");
  const [welcomeMessage, setWelcomeMessage] = useState(initial.welcome_message || "");
  const [ctaLabel, setCtaLabel] = useState(initial.referral_cta_label || "");
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initial.testimonials || []);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = slug ? `${window.location.origin}/r/${slug}` : null;

  const handleCoverFile = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/cover.${ext}`;
    const { error } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("business-logos").getPublicUrl(path);
    // Cache-bust so the new image shows immediately.
    const bustedUrl = `${data.publicUrl}?v=${Date.now()}`;
    setCoverUrl(bustedUrl);
    setUploading(false);
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
    };

    const { error } = await supabase
      .from("businesses")
      .update(payload as any)
      .eq("id", businessId);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Branding saved", description: "Your referral page is updated." });
    onSaved?.();
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
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

      {/* Brand color */}
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
                <p className="text-[11px] text-muted-foreground mt-0.5">PNG or JPG, max 5 MB</p>
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

      {/* Headline */}
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