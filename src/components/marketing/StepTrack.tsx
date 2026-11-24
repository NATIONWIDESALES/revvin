/** The homepage four-step track with its small artifacts. Shared with /how-it-works. */
export const STEPS = [
  {
    title: "Build your referral page",
    body: "Set your reward and publish your page on your own link. It is free, and your QR code and print-ready kit come with it.",
    artifact: (
      <>
        <div className="mk-mini-field"><small>Your reward</small>$250 when a job closes</div>
        <div className="mk-mini-field"><small>Your link</small>revvin.co/r/your-business</div>
        <div className="mk-mini-btn">Publish</div>
      </>
    ),
  },
  {
    title: "Bring your customer list",
    body: "Upload a file, paste a list, or send it to us and we load it. Every customer gets their own referral link.",
    artifact: (
      <>
        <div className="mk-mini-field"><small>Customer</small>Dana, dana@example.com</div>
        <div className="mk-mini-field"><small>Customer</small>Tom, tom@example.com</div>
      </>
    ),
  },
  {
    title: "Revvin asks for you",
    body: "Revvin emails every customer their own link from your business name, then follows up twice.",
    artifact: (
      <>
        <p className="mk-bubble">Hi Dana, thanks again for choosing us. If anyone you know needs a roof, send them your link. We pay $250 when it turns into a job.</p>
        <p className="mt-1.5 text-right text-xs text-muted-foreground">Follow-ups on day 4 and day 10</p>
      </>
    ),
  },
  {
    title: "Referrals land, you pay",
    body: "Each referral lands in your inbox with who sent it. When the job closes you pay the reward yourself. Revvin never takes a cut.",
    artifact: (
      <>
        <div className="mk-lead"><p className="flex justify-between gap-2 font-semibold">Mike R. <span className="mk-tag">New</span></p><p className="text-muted-foreground">Roof leak over the garage. From Dana.</p></div>
        <div className="mt-2 flex items-center gap-3">
          <span className="mk-paid">$250</span>
          <span><b className="block text-forest">Paid to Dana</b><span className="text-muted-foreground">Job closed, reward recorded</span></span>
        </div>
      </>
    ),
  },
];

const StepTrack = () => (
  <ol className="mk-track" aria-label="Example">
    {STEPS.map((s, i) => (
      <li key={s.title} className="min-w-0">
        <span className="mk-step-n" aria-hidden="true">{i + 1}</span>
        <h3 className="mt-[22px] font-display text-[30px] font-bold leading-none text-forest">{s.title}</h3>
        <p className="mt-2.5 text-[17px] text-muted-foreground">{s.body}</p>
        <div className="mk-artifact" aria-hidden="true">{s.artifact}</div>
      </li>
    ))}
  </ol>
);

export default StepTrack;
