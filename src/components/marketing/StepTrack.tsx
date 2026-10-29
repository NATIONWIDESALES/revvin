/** The homepage four-step track with its small artifacts. Shared with /how-it-works. */
export const STEPS = [
  {
    title: "You send the ask",
    body: "After the job, one tap opens a text with that customer's personal link already in it.",
    artifact: (
      <>
        <p className="mk-bubble">Thanks again for having us out, Dana. If anyone you know needs a roof, this link comes straight to me. I pay $250 if it turns into a job.</p>
        <p className="mt-1.5 text-right text-xs text-muted-foreground">Delivered</p>
      </>
    ),
  },
  {
    title: "They send a friend",
    body: "Dana taps her link and passes along her neighbour's name and number. It takes about 30 seconds.",
    artifact: (
      <>
        <div className="mk-mini-field"><small>Referring as</small>Dana</div>
        <div className="mk-mini-field"><small>Who needs a roof?</small>Mike, 604 555 0142</div>
        <div className="mk-mini-btn">Send referral</div>
      </>
    ),
  },
  {
    title: "The lead lands with you",
    body: "You get an email, and a phone alert if you turn them on, with who referred them and what they need.",
    artifact: (
      <>
        <div className="mk-lead"><p className="flex justify-between gap-2 font-semibold">Mike R. <span className="mk-tag">New</span></p><p className="text-muted-foreground">Roof leak over the garage. From Dana.</p></div>
        <div className="mk-lead"><p className="flex justify-between gap-2 font-semibold">Priya S. <span className="mk-tag old">Quoted</span></p><p className="text-muted-foreground">Full replacement. From Tom.</p></div>
      </>
    ),
  },
  {
    title: "You close it and pay",
    body: "Pay Dana your way, mark it paid, and she gets a thank-you note. Revvin never takes a cut.",
    artifact: (
      <div className="flex items-center gap-3">
        <span className="mk-paid">$250</span>
        <span><b className="block text-forest">Paid to Dana</b><span className="text-muted-foreground">Job closed, reward recorded</span></span>
      </div>
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
