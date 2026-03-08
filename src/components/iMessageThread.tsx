import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

const messages = [
  { side: "left" as const, text: "Hey do you know a good roofer? Our shingles are shot 😩", delay: 0 },
  { side: "right" as const, text: "Actually yeah! I know a great one", delay: 0.4 },
  { side: "right" as const, text: "Just sent you their link through Revvin — they'll take good care of you", delay: 0.8 },
  { side: "left" as const, text: "Amazing, just submitted a request. Thanks!! 🙏", delay: 1.2 },
];

const iMessageThread = () => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease }}
    className="mx-auto w-full max-w-[340px]"
  >
    {/* Phone frame */}
    <div className="rounded-[2.5rem] border border-border bg-background p-3 shadow-2xl">
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <span className="text-[10px] font-semibold text-foreground">9:41</span>
        <div className="flex items-center gap-1">
          <div className="h-2.5 w-4 rounded-sm bg-foreground/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
        </div>
      </div>
      {/* Header */}
      <div className="text-center pb-3 border-b border-border/50">
        <div className="mx-auto mb-1.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">MK</div>
        <p className="text-xs font-semibold text-foreground">Mike K.</p>
      </div>
      {/* Messages */}
      <div className="px-2 py-4 space-y-2.5 min-h-[240px]">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: msg.delay }}
            className={`flex ${msg.side === "right" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                msg.side === "right"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </div>
      {/* Input bar */}
      <div className="mx-2 mb-3 flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-2">
        <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/20" />
        <span className="text-[11px] text-muted-foreground">iMessage</span>
      </div>
    </div>
  </motion.div>
);

export default iMessageThread;
