export default function MockReferralPage() {
  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* status bar spacer */}
      <div className="h-9" />
      <div className="flex-1 overflow-hidden px-5 pt-2">
        {/* logo + name */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary">
          A
        </div>
        <h3 className="mt-3 text-[17px] font-semibold tracking-tight text-foreground">
          Apex Roofing
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Residential roofing · Denver, CO
        </p>

        {/* offer */}
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-primary">
            Referral offer
          </p>
          <p className="mt-1 text-[17px] font-semibold leading-tight tracking-tight text-foreground">
            Refer a customer,<br />earn <span className="text-primary">$500</span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Paid per closed roofing job.
          </p>
        </div>

        {/* CTA */}
        <button className="mt-4 h-10 w-full rounded-lg bg-primary text-[12px] font-semibold text-primary-foreground shadow-sm">
          Submit a referral
        </button>

        {/* form hint */}
        <div className="mt-4 space-y-2">
          <div>
            <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Your name
            </p>
            <div className="h-7 rounded-md border border-border bg-muted/40" />
          </div>
          <div>
            <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Lead's phone
            </p>
            <div className="h-7 rounded-md border border-border bg-muted/40" />
          </div>
          <div>
            <p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              What do they need?
            </p>
            <div className="h-12 rounded-md border border-border bg-muted/40" />
          </div>
        </div>

        <p className="mt-4 text-center text-[8px] tracking-wider text-muted-foreground">
          POWERED BY REVVIN.CO
        </p>
      </div>
    </div>
  );
}