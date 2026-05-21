import { cn } from "@/lib/utils";

const rows = [
  { date: "May 18", name: "Jordan M.", referrer: "Carlos R.", status: "New", tone: "green" },
  { date: "May 17", name: "Priya S.", referrer: "Jamie L.", status: "Contacted", tone: "amber" },
  { date: "May 14", name: "Devon T.", referrer: "Sam K.", status: "Closed Won", tone: "green-dark" },
  { date: "May 11", name: "Marcus W.", referrer: "Beth A.", status: "Contacted", tone: "amber" },
];

const toneClass: Record<string, string> = {
  green: "bg-primary/10 text-primary",
  amber: "bg-accent/10 text-accent",
  "green-dark": "bg-primary text-primary-foreground",
};

export default function MockLeadsTable({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-soft", className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <p className="text-xs font-semibold text-foreground">Leads</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          4 new
        </span>
      </div>
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Lead</th>
            <th className="px-4 py-2 font-medium">Referrer</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.date}</td>
              <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.referrer}</td>
              <td className="px-4 py-2.5">
                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", toneClass[r.tone])}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}