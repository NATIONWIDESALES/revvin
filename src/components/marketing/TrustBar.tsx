const industries = [
  "Roofers",
  "HVAC",
  "Contractors",
  "Mortgage brokers",
  "Real estate",
  "Plumbers",
  "Solar",
  "Home services",
];

export default function TrustBar() {
  return (
    <div className="border-y border-border bg-surface-warm">
      <div className="container py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 md:gap-x-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Built for
          </p>
          {industries.map((i) => (
            <span
              key={i}
              className="text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground/70"
            >
              {i}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}