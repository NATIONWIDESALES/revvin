import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PRICE_TEXT, SALE_PRICE_TEXT } from "@/config/pricing";
import { SALE_CTA_LABEL, saleDestination } from "@/lib/salePresentation";

export default function SalePopup({ owner, onClose }: { owner: boolean; onClose: () => void }) {
  const returnFocus = useRef(typeof document === "undefined" ? null : document.activeElement);
  const primary = useRef<HTMLAnchorElement>(null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bf-dialog gap-0 overflow-hidden rounded-lg bg-card p-0" onOpenAutoFocus={(event) => { event.preventDefault(); primary.current?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus(); }}>
        <div className="bf-dialog-header bg-forest text-primary-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-sign px-3 py-1 text-sm font-bold text-forest"><Check className="h-4 w-4" aria-hidden="true" />Up to 40% off</span>
          <DialogTitle className="mt-4 font-display text-5xl font-extrabold leading-none text-primary-foreground">Early Black Friday</DialogTitle>
        </div>
        <div className="p-5 sm:p-8">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="pr-4"><p className="text-sm font-bold text-foreground">Monthly</p><del className="mt-3 block text-sm text-muted-foreground">{PRICE_TEXT.monthly}</del><p className="mt-1 font-display text-4xl font-bold text-foreground">{SALE_PRICE_TEXT.monthly}</p><p className="text-sm text-muted-foreground">a month</p></div>
            <div className="pl-4"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-foreground">Yearly</p><span className="rounded-sm bg-sign px-2 py-0.5 text-xs font-bold text-forest">Best value</span></div><del className="mt-3 block text-sm text-muted-foreground">{PRICE_TEXT.annual}</del><p className="mt-1 font-display text-4xl font-bold text-foreground">{SALE_PRICE_TEXT.annual}</p><p className="text-sm text-muted-foreground">a year</p></div>
          </div>
          <DialogDescription className="mt-6 border-t border-border pt-5 text-sm leading-relaxed text-foreground">Locked in for as long as you stay subscribed. Ends November 30.</DialogDescription>
          {!owner && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Start free today and upgrade any time before November 30 to keep this price.</p>}
          <Button variant="sign" asChild className="mt-6 h-12 w-full"><Link ref={primary} to={saleDestination(owner)} onClick={onClose}>{SALE_CTA_LABEL}<ArrowUpRight aria-hidden="true" /></Link></Button>
          <Button variant="link" className="mt-2 w-full text-sm text-muted-foreground" onClick={onClose}>Maybe later</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}