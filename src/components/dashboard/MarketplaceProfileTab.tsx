import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Flag, GripVertical, Lock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { uploadUserImage } from "@/lib/imageUpload";
import Stars from "@/components/profile/Stars";
import { InvitedLabel } from "@/components/profile/ProfileParts";
import { PHOTO_BUCKET, photoUrls, profileCompleteness, type Hours, type SocialLinks } from "@/lib/profile";
import { PROFILE_LIMITS, PROFILE_UPGRADE_LINES, photoLimit, profileAllows, type ProfileFeature } from "@/config/planFeatures";
import { reviewBody, reviewSubject } from "../../../supabase/functions/_shared/reviews";
import type { DashTab } from "@/lib/dashboardHome";

const DAYS: [keyof Hours, string][] = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const SOCIALS: (keyof SocialLinks)[] = ["facebook", "instagram", "linkedin", "youtube", "tiktok"];
type Biz = { id: string; name: string; slug: string | null; description: string | null; phone: string | null; website: string | null; service_area: string | null;
  hours: Hours | null; logo_url: string | null; cover_image_url: string | null; services: string[] | null; founded_year: number | null; license_number: string | null; social_links: SocialLinks | null; offer_amount: string | null };
type Photo = { id: string; storage_path: string; caption: string | null; sort_order: number };
type Review = { id: string; rating: number | null; body: string | null; reviewer_display_name: string | null; status: string; owner_reply: string | null; flagged_at: string | null; submitted_at: string | null; created_at: string };
type Quote = { id: string; name: string; email: string; phone: string | null; message: string | null; status: string; created_at: string };
type Contact = { id: string; name: string; email: string | null };

/** One line naming the Pro feature, shown only where the owner reaches it. */
export function UpgradeLine({ feature, onGo }: { feature: ProfileFeature; onGo: (t: DashTab) => void }) {
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm" data-testid={`upgrade-${feature}`}>
      <Lock className="h-4 w-4 text-primary" aria-hidden />{PROFILE_UPGRADE_LINES[feature]}
      <button type="button" className="font-semibold text-primary underline underline-offset-4" onClick={() => onGo("billing")}>Upgrade to Pro</button>
    </p>
  );
}

const Section = ({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) => (
  <section id={id} className="rounded-2xl border border-line bg-card p-5"><h2 className="mb-4 text-lg font-bold text-forest">{title}</h2>{children}</section>
);

export default function MarketplaceProfileTab({ businessId, isPro, isDemo, onGo }: { businessId: string; isPro: boolean; isDemo: boolean; onGo: (t: DashTab) => void }) {
  const { toast } = useToast();
  const [biz, setBiz] = useState<Biz | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoPrompt, setPhotoPrompt] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [{ data: b }, { data: ph }, { data: rv }, { data: q }] = await Promise.all([
      supabase.from("businesses").select("id,name,slug,description,phone,website,service_area,hours,logo_url,cover_image_url,services,founded_year,license_number,social_links,offer_amount").eq("id", businessId).limit(1),
      supabase.from("business_photos").select("id,storage_path,caption,sort_order").eq("business_id", businessId).order("sort_order").order("created_at"),
      supabase.from("business_reviews").select("id,rating,body,reviewer_display_name,status,owner_reply,flagged_at,submitted_at,created_at").eq("business_id", businessId).eq("status", "published").order("submitted_at", { ascending: false }).limit(200),
      isPro ? supabase.from("quote_requests").select("id,name,email,phone,message,status,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    ]);
    setBiz((b?.[0] as unknown as Biz) ?? null);
    setPhotos((ph as Photo[]) ?? []);
    setReviews((rv as Review[]) ?? []);
    setQuotes((q as Quote[]) ?? []);
    setUrls(await photoUrls(((ph as Photo[]) ?? []).map((p) => p.storage_path)).catch(() => ({})));
  }, [businessId, isPro]);
  useEffect(() => { void load(); }, [load]);

  const meter = useMemo(() => biz ? profileCompleteness({ ...biz, photos: photos.length, reviews: reviews.length }) : null, [biz, photos.length, reviews.length]);
  if (!biz) return <div className="h-40 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />;
  const set = <K extends keyof Biz>(k: K, v: Biz[K]) => setBiz({ ...biz, [k]: v });

  const save = async () => {
    if (isDemo) return toast({ title: "Demo account", description: "Changes are not saved in the demo." });
    setSaving(true);
    const patch: Record<string, unknown> = {
      description: biz.description?.slice(0, 2000) || null, phone: biz.phone?.slice(0, 40) || null, website: biz.website?.slice(0, 300) || null,
      service_area: biz.service_area?.slice(0, 200) || null, hours: biz.hours,
    };
    if (isPro) Object.assign(patch, {
      services: (biz.services ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 30), founded_year: biz.founded_year || null,
      license_number: biz.license_number?.slice(0, 80) || null, social_links: biz.social_links,
    });
    const { error } = await supabase.from("businesses").update(patch as never).eq("id", biz.id);
    setSaving(false);
    toast(error ? { title: "Could not save", description: "Try again.", variant: "destructive" } : { title: "Profile saved" });
  };

  const uploadBrand = async (kind: "logo" | "cover", file: File) => {
    const r = await uploadUserImage("business-logos", kind, file);
    if ("error" in r) return toast({ title: r.error, variant: "destructive" });
    const col = kind === "logo" ? "logo_url" : "cover_image_url";
    const { error } = await supabase.from("businesses").update({ [col]: r.publicUrl } as never).eq("id", biz.id);
    if (!error) set(col, r.publicUrl);
  };

  const addPhoto = async (file: File) => {
    if (photos.length >= photoLimit(isPro)) { setPhotoPrompt(!isPro); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) return toast({ title: "Use a JPG, PNG or WebP under 5 MB.", variant: "destructive" });
    const path = `${biz.id}/${crypto.randomUUID()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error: up } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type });
    if (up) return toast({ title: "Upload failed", description: "Try again.", variant: "destructive" });
    const { error } = await supabase.from("business_photos").insert({ business_id: biz.id, storage_path: path, sort_order: photos.length });
    if (error) {
      await supabase.storage.from(PHOTO_BUCKET).remove([path]);
      if (error.message.includes("photo_limit")) { setPhotoPrompt(!isPro); return; }
      return toast({ title: "Could not add the photo", variant: "destructive" });
    }
    await load();
  };
  const removePhoto = async (p: Photo) => {
    await supabase.from("business_photos").delete().eq("id", p.id);
    await supabase.storage.from(PHOTO_BUCKET).remove([p.storage_path]);
    setPhotoPrompt(false);
    await load();
  };
  const reorder = async (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    const next = [...photos]; const [m] = next.splice(from, 1); next.splice(to, 0, m);
    setPhotos(next);
    await Promise.all(next.map((p, i) => supabase.from("business_photos").update({ sort_order: i }).eq("id", p.id)));
  };
  const saveCaption = async (p: Photo, caption: string) => { await supabase.from("business_photos").update({ caption: caption.slice(0, 120) || null }).eq("id", p.id); };

  const publicHref = biz.slug ? `/b/${biz.slug}` : null;
  const locked = (f: ProfileFeature) => !profileAllows(isPro, f);

  return (
    <div className="space-y-6" data-testid="profile-editor">
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-forest">Marketplace profile</h1>
          {publicHref && <a href={publicHref} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4">View my public profile<ExternalLink className="h-4 w-4" aria-hidden /></a>}
        </div>
        {meter && (<>
          <div className="mt-4 flex items-center gap-3"><Progress value={meter.percent} className="h-2 flex-1" aria-label="Profile completeness" /><span className="text-sm font-semibold">{meter.percent}%</span></div>
          <p className="mt-2 text-sm text-muted-foreground">{meter.next ? `Next: ${meter.next}.` : "Your profile is complete."}</p>
        </>)}
      </div>

      <Section title="Basics">
        <div className="grid gap-4">
          <div className="grid gap-1.5"><Label htmlFor="pf-desc">About your business</Label><Textarea id="pf-desc" rows={5} maxLength={2000} value={biz.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="pf-phone">Phone</Label><Input id="pf-phone" className="h-11" maxLength={40} value={biz.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="pf-web">Website</Label><Input id="pf-web" className="h-11" maxLength={300} value={biz.website ?? ""} onChange={(e) => set("website", e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="pf-area">Service area</Label><Input id="pf-area" className="h-11" maxLength={200} value={biz.service_area ?? ""} onChange={(e) => set("service_area", e.target.value)} /></div>
          <fieldset className="grid gap-2"><legend className="mb-1 text-sm font-medium">Hours</legend>
            {DAYS.map(([d, l]) => (
              <label key={d} className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm">{l}
                <Input className="h-10" maxLength={40} placeholder="8am to 5pm, or Closed" value={biz.hours?.[d] ?? ""} onChange={(e) => set("hours", { ...(biz.hours ?? {}), [d]: e.target.value.slice(0, 40) })} /></label>
            ))}
          </fieldset>
        </div>
      </Section>

      <Section title="Logo and cover photo">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="mb-2 text-sm font-medium">Logo</p>
            {biz.logo_url && <img src={biz.logo_url} alt="" className="mb-2 h-20 w-20 rounded-xl border border-line object-contain" />}
            <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload logo" onChange={(e) => e.target.files?.[0] && void uploadBrand("logo", e.target.files[0])} /></div>
          <div><p className="mb-2 text-sm font-medium">Cover photo</p>
            {locked("cover_photo") ? <UpgradeLine feature="cover_photo" onGo={onGo} /> : (<>
              {biz.cover_image_url && <img src={biz.cover_image_url} alt="" className="mb-2 aspect-[3/1] w-full rounded-lg object-cover" />}
              <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload cover photo" onChange={(e) => e.target.files?.[0] && void uploadBrand("cover", e.target.files[0])} />
            </>)}
          </div>
        </div>
      </Section>

      <Section title={`Photos (${photos.length} of ${photoLimit(isPro)})`}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag !== null) void reorder(drag, i); setDrag(null); }}
              className="rounded-xl border border-line p-2" data-testid="owner-photo">
              {urls[p.storage_path] ? <img src={urls[p.storage_path]} alt={p.caption ?? ""} className="aspect-[4/3] w-full rounded-lg object-cover" /> : <div className="aspect-[4/3] rounded-lg bg-muted" />}
              <Input className="mt-2 h-10" maxLength={120} placeholder="Caption" defaultValue={p.caption ?? ""} onBlur={(e) => void saveCaption(p, e.target.value)} aria-label="Photo caption" />
              <div className="mt-2 flex items-center gap-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
                <Button size="icon" variant="ghost" aria-label="Move earlier" onClick={() => void reorder(i, i - 1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Move later" onClick={() => void reorder(i, i + 1)} disabled={i === photos.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Remove photo" className="ml-auto" onClick={() => void removePhoto(p)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Label htmlFor="pf-photo" className="mb-1 block">Add a photo (JPG, PNG or WebP, up to 5 MB)</Label>
          <Input id="pf-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void addPhoto(f); }} />
        </div>
        {photoPrompt && <div className="mt-3"><UpgradeLine feature="photo_gallery" onGo={onGo} /></div>}
      </Section>

      <Section title="Services, history and links">
        {locked("services") ? <UpgradeLine feature="services" onGo={onGo} /> : (
          <div className="grid gap-4">
            <div className="grid gap-1.5"><Label htmlFor="pf-svc">Services (comma separated)</Label><Input id="pf-svc" className="h-11" value={(biz.services ?? []).join(", ")} onChange={(e) => set("services", e.target.value.split(",").map((s) => s.trimStart().slice(0, 60)).slice(0, 30))} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label htmlFor="pf-year">Year founded</Label><Input id="pf-year" type="number" min={1800} max={2100} className="h-11" value={biz.founded_year ?? ""} onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="pf-lic">Licence number</Label><Input id="pf-lic" className="h-11" maxLength={80} value={biz.license_number ?? ""} onChange={(e) => set("license_number", e.target.value)} /></div>
            </div>
            {SOCIALS.map((k) => (
              <div key={k} className="grid gap-1.5"><Label htmlFor={`pf-${k}`} className="capitalize">{k} link</Label>
                <Input id={`pf-${k}`} type="url" className="h-11" placeholder="https://" maxLength={300} value={biz.social_links?.[k] ?? ""} onChange={(e) => set("social_links", { ...(biz.social_links ?? {}), [k]: e.target.value })} /></div>
            ))}
          </div>
        )}
      </Section>

      <div className="sticky bottom-2 z-10"><Button className="h-12 w-full sm:w-auto" onClick={() => void save()} disabled={saving}>{saving ? "Saving" : "Save profile"}</Button></div>

      <Section title={`Reviews (${reviews.length})`} id="reviews">
        <AskForReviews businessId={biz.id} businessName={biz.name} isPro={isPro} isDemo={isDemo} />
        {!isPro && reviews.length > PROFILE_LIMITS.free.reviewsShown && <div className="mt-3"><UpgradeLine feature="all_reviews" onGo={onGo} /></div>}
        <ul className="mt-4 grid gap-3">
          {reviews.map((r) => <OwnerReview key={r.id} r={r} onChange={load} />)}
        </ul>
        {!isPro && <div className="mt-3"><UpgradeLine feature="no_competitors" onGo={onGo} /></div>}
      </Section>

      <Section title="Quote requests">
        {locked("quote_requests") ? (
          <div>
            <div className="pointer-events-none select-none space-y-2 opacity-50" aria-hidden>
              {["Name", "Email", "Message"].map((l) => <div key={l} className="h-10 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{l}</div>)}
            </div>
            <div className="mt-3"><UpgradeLine feature="quote_requests" onGo={onGo} /></div>
          </div>
        ) : quotes.length === 0 ? <p className="text-sm text-muted-foreground">No quote requests yet. They arrive here and in your email.</p> : (
          <ul className="grid gap-3">
            {quotes.map((q) => (
              <li key={q.id} className="rounded-xl border border-line p-3 text-sm" data-testid="quote">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{q.name} <span className="font-normal text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</span></p>
                  <select aria-label="Status" className="h-10 rounded-md border border-line bg-card px-2" value={q.status}
                    onChange={async (e) => { const status = e.target.value; await supabase.from("quote_requests").update({ status }).eq("id", q.id); setQuotes((x) => x.map((y) => (y.id === q.id ? { ...y, status } : y))); }}>
                    <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
                  </select>
                </div>
                <p><a className="text-primary underline" href={`mailto:${q.email}`}>{q.email}</a>{q.phone && <> · <a className="text-primary underline" href={`tel:${q.phone}`}>{q.phone}</a></>}</p>
                {q.message && <p className="mt-1 whitespace-pre-wrap">{q.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function OwnerReview({ r, onChange }: { r: Review; onChange: () => void }) {
  const { toast } = useToast();
  const [reply, setReply] = useState(r.owner_reply ?? "");
  const [editing, setEditing] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState("");
  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    const { error } = await supabase.rpc(fn as never, args as never);
    toast(error ? { title: "That did not go through", description: "Try again.", variant: "destructive" } : { title: ok });
    if (!error) onChange();
  };
  return (
    <li className="rounded-xl border border-line p-4" data-testid="owner-review">
      <div className="flex flex-wrap items-center gap-2">{r.rating && <Stars value={r.rating} />}<span className="font-semibold">{r.reviewer_display_name}</span><InvitedLabel />
        {r.flagged_at && <span className="text-xs text-muted-foreground">Flagged for Revvin to review</span>}</div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
      {r.owner_reply && !editing && <div className="mt-3 rounded-lg bg-secondary p-3 text-sm"><p className="text-xs font-semibold">Your reply</p><p className="whitespace-pre-wrap">{r.owner_reply}</p></div>}
      {editing ? (
        <div className="mt-3 grid gap-2">
          <Textarea maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Your reply" />
          <div className="flex gap-2"><Button className="h-10" onClick={() => { setEditing(false); void call("fn_review_reply", { p_review_id: r.id, p_reply: reply }, "Reply saved"); }}>Save reply</Button><Button variant="ghost" className="h-10" onClick={() => setEditing(false)}>Cancel</Button></div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" className="h-10" onClick={() => setEditing(true)}>{r.owner_reply ? "Edit reply" : "Reply"}</Button>
          {!r.flagged_at && <Button variant="ghost" className="h-10 gap-1" onClick={() => setFlagOpen((v) => !v)}><Flag className="h-4 w-4" aria-hidden />Flag for Revvin</Button>}
        </div>
      )}
      {flagOpen && (
        <div className="mt-3 grid gap-2">
          <Label htmlFor={`flag-${r.id}`}>Why should Revvin look at this review?</Label>
          <Textarea id={`flag-${r.id}`} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          <p className="text-xs text-muted-foreground">Flagging does not hide the review. Revvin will look at it.</p>
          <Button className="h-10 w-fit" disabled={reason.trim().length < 5} onClick={() => { setFlagOpen(false); void call("fn_review_flag", { p_review_id: r.id, p_reason: reason }, "Sent to Revvin"); }}>Send flag</Button>
        </div>
      )}
    </li>
  );
}

function AskForReviews({ businessId, businessName, isPro, isDemo }: { businessId: string; businessName: string; isPro: boolean; isDemo: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!open) return;
    supabase.from("referral_contacts").select("id,name,email").eq("business_id", businessId).not("email", "is", null).order("created_at", { ascending: false }).limit(1000)
      .then(({ data }) => setContacts(((data as Contact[]) ?? []).filter((c) => c.email)));
  }, [open, businessId]);
  const shown = contacts.filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())).slice(0, 200);
  const [p1, p2] = reviewBody(businessName, "Alex");
  const send = async () => {
    if (isDemo) return toast({ title: "Demo account", description: "Review requests are not sent from the demo." });
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-review-requests", { body: { contact_ids: [...picked] } });
    setSending(false);
    if (error) return toast({ title: "Could not send", description: "Try again.", variant: "destructive" });
    const results = (data?.results ?? []) as { status: string }[];
    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.length - sent;
    toast({ title: `${sent} review ${sent === 1 ? "request" : "requests"} sent`, description: skipped ? `${skipped} skipped: asked in the last 90 days, unsubscribed, no email, or over the monthly limit.` : undefined });
    setPicked(new Set());
    setOpen(false);
  };
  if (!open) return <Button className="h-11" onClick={() => setOpen(true)} data-testid="ask-reviews">Ask my customers for a review</Button>;
  return (
    <div className="grid gap-4 rounded-xl border border-line p-4" data-testid="ask-reviews-panel">
      <p className="text-sm text-muted-foreground">Pick customers from your list. Each person can be asked once every 90 days. {isPro ? "" : `Free sends up to ${PROFILE_LIMITS.free.reviewRequestsPerMonth} requests a month.`} Unsubscribed customers are skipped.</p>
      <Input className="h-10" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
      <div className="flex gap-2 text-sm">
        <button type="button" className="text-primary underline" onClick={() => setPicked(new Set(shown.map((c) => c.id)))}>Select shown</button>
        <button type="button" className="text-primary underline" onClick={() => setPicked(new Set())}>Clear</button>
        <span className="ml-auto text-muted-foreground">{picked.size} selected</span>
      </div>
      <ul className="max-h-64 overflow-y-auto rounded-lg border border-line">
        {shown.length === 0 && <li className="p-3 text-sm text-muted-foreground">No customers with an email yet. Add them in Customers.</li>}
        {shown.map((c) => (
          <li key={c.id} className="border-b border-line last:border-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm">
              <Checkbox checked={picked.has(c.id)} onCheckedChange={(v) => setPicked((s) => { const n = new Set(s); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
              <span className="font-medium">{c.name}</span><span className="truncate text-muted-foreground">{c.email}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="rounded-lg bg-secondary p-4 text-sm" aria-label="Email preview">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email preview</p>
        <p className="mt-2 font-semibold">{reviewSubject(businessName)}</p>
        <p className="mt-2">{p1}</p><p className="mt-1">{p2}</p>
        <span className="mt-3 inline-block rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Leave a review</span>
      </div>
      <div className="flex gap-2">
        <Button className="h-11" disabled={picked.size === 0 || sending} onClick={() => void send()}>{sending ? "Sending" : `Send to ${picked.size}`}</Button>
        <Button variant="ghost" className="h-11" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
