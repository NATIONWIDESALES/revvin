import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PREVIEW_TRADES as INDUSTRIES } from "@/content/previewTrades";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capturePreview, previewSignupUrl, previewSlug, suggestedReward, previewQuestion, storePreview } from "@/lib/instantPreview";
import { track } from "@/lib/track";
import HeroYardSign, { SIGN_EXAMPLES, type SignExample } from "./HeroYardSign";

export default function InstantPreview({ lockedTrade, onPreview, showSign = false }: { lockedTrade?: string; onPreview?: (example: SignExample) => void; showSign?: boolean }) {
  const id = useId();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [trade, setTrade] = useState(lockedTrade ?? "roofing");
  const [reward, setReward] = useState(String(suggestedReward(lockedTrade ?? "roofing")));
  const started = useRef(false);
  const [example, setExample] = useState<SignExample>(SIGN_EXAMPLES[0]);
  const update = (n: string, t: string, r: string) => {
    if (!started.current) { started.current = true; track("preview_started"); }
    const next = { biz: n.trim() || "Your business", q: previewQuestion(t, n), amt: `$${r || "0"}`, url: `revvin.co/r/${previewSlug(n)}` };
    setExample(next); onPreview?.(next);
  };
  return <>
    <form className="mt-7 space-y-3" data-hero-cta onSubmit={e => {
      e.preventDefault();
      const data = capturePreview(name, trade, Number(reward), window.location.href);
      storePreview(data); track("preview_submitted"); navigate(previewSignupUrl(data));
    }}>
      <div><Label htmlFor={`${id}-name`}>Business name</Label><Input id={`${id}-name`} value={name} maxLength={160} autoComplete="organization" placeholder="Your business name" required className="mt-1" onChange={e => { setName(e.target.value); update(e.target.value, trade, reward); }} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label htmlFor={`${id}-trade`}>Trade</Label><select id={`${id}-trade`} value={trade} disabled={Boolean(lockedTrade)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" onChange={e => { const t = e.target.value; const r = String(suggestedReward(t)); setTrade(t); setReward(r); update(name, t, r); }}>
          {INDUSTRIES.map(i => <option key={i.slug} value={i.slug}>{i.label}</option>)}<option value="other">Other home service</option>
        </select></div>
        <div><Label htmlFor={`${id}-reward`}>Reward per closed job</Label><div className="relative mt-1"><span className="absolute left-3 top-2 text-muted-foreground" aria-hidden="true">$</span><Input id={`${id}-reward`} type="number" min="1" max="1000000" step="1" value={reward} required className="pl-7" onChange={e => { setReward(e.target.value); update(name, trade, e.target.value); }} /></div></div>
      </div>
      <Button type="submit" size="lg" className="w-full">Make it live, free</Button>
      <p className="text-sm text-muted-foreground">Free for your first 100 customers. No card.</p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{started.current ? `${example.biz}. ${example.q} Reward ${example.amt} per closed job. ${example.url}` : "Example: Summit Roofing, $250 reward per closed job."}</p>
    </form>
    {showSign && <HeroYardSign example={example} preview={started.current} />}
  </>;
}