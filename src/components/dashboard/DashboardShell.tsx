import { useEffect, useState, type ReactNode } from "react";
import Wordmark from "@/components/brand/Wordmark";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import type { DashTab } from "@/lib/dashboardHome";

interface NavItem { tab: DashTab; label: string; pro?: boolean }
interface NavGroup { title?: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  { items: [
    { tab: "home", label: "Home" },
    { tab: "leads", label: "Leads" },
    { tab: "customers", label: "Customers" },
    { tab: "referrers", label: "Referrers" },
    { tab: "payouts", label: "Rewards" },
  ] },
  { title: "Your page", items: [
    { tab: "page", label: "Edit page" },
    { tab: "share", label: "Print pack and QR" },
    { tab: "jobdone", label: "Job done asks" },
  ] },
  { title: "Pro", items: [
    { tab: "campaigns", label: "Campaigns", pro: true },
    { tab: "reports", label: "Reports", pro: true },
  ] },
  { title: "Account", items: [
    { tab: "account", label: "Settings" },
    { tab: "billing", label: "Billing" },
  ] },
];

/** Tabs reachable by deep link that light up a rail item. */
const NAV_OWNER: Partial<Record<DashTab, DashTab>> = { integrations: "account", offers: "home", referrals: "leads" };

interface Props {
  active: DashTab;
  onSelect: (t: DashTab) => void;
  isPro: boolean;
  newLeads: number;
  children: ReactNode;
}

const Rail = ({ active, onSelect, isPro, newLeads, onPicked }: Omit<Props, "children"> & { onPicked?: () => void }) => {
  const current = NAV_OWNER[active] ?? active;
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-5">
      {NAV_GROUPS.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1.5 px-3 text-sm font-semibold text-white/60">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const on = current === it.tab;
              return (
                <li key={it.tab}>
                  <button
                    type="button"
                    data-tab={it.tab}
                    aria-current={on ? "page" : undefined}
                    onClick={() => { onSelect(it.tab); onPicked?.(); }}
                    className={`flex h-10 w-full items-center justify-between rounded-[10px] px-3 text-left text-[15px] font-semibold transition-colors ${on ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
                  >
                    <span>{it.label}</span>
                    {it.tab === "leads" && newLeads > 0 && (
                      <span className="rounded-full bg-sign px-2 py-0.5 text-xs font-bold text-forest" aria-label={`${newLeads} new`}>{newLeads}</span>
                    )}
                    {it.pro && !isPro && (
                      <span data-testid="pro-tag" className="rounded border border-white/40 px-1.5 text-[11px] font-bold text-white/80">Pro</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

const DashboardShell = ({ children, ...rail }: Props) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.dataset.dashShell = "1";
    return () => { delete document.body.dataset.dashShell; };
  }, []);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[240px] shrink-0 bg-forest px-3 py-6 lg:block">
        <div className="sticky top-6">
          <div className="mb-8 px-3"><Wordmark size="sm" variant="white" /></div>
          <Rail {...rail} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-forest px-4 lg:hidden">
          <Wordmark size="sm" variant="white" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 items-center gap-2 rounded-[10px] px-3 font-semibold text-white hover:bg-white/10"
          >
            <Menu className="h-5 w-5" aria-hidden /> Menu
          </button>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto border-0 bg-forest text-white">
            <SheetHeader><SheetTitle className="text-left text-white">Menu</SheetTitle></SheetHeader>
            <div className="mt-4"><Rail {...rail} onPicked={() => setOpen(false)} /></div>
          </SheetContent>
        </Sheet>
        <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
};

export default DashboardShell;
