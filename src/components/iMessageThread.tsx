import { motion } from "framer-motion";
import { Signal, Wifi, Battery, MoreHorizontal, Phone, Video } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ease = [0.16, 1, 0.3, 1] as const;

const messages = [
  { side: "left" as const, text: "Hey do you know a good roofer? Our shingles are shot 😩", delay: 0, time: "2:15 PM" },
  { side: "right" as const, text: "Actually yeah! I know a great one", delay: 0.4, time: "2:16 PM" },
  { side: "right" as const, text: "Just sent you their link through Revvin — they'll take good care of you", delay: 0.8, time: "2:16 PM" },
  { side: "left" as const, text: "Amazing, just submitted a request. Thanks!! 🙏", delay: 1.2, time: "2:18 PM" },
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
        <span className="text-[10px] font-semibold text-foreground">2:18 PM</span>
        <div className="flex items-center gap-1">
          <Signal className="h-3 w-3 text-foreground/60" />
          <Wifi className="h-3 w-3 text-foreground/60" />
          <Battery className="h-3 w-3 text-foreground/60" />
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Mike K." />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">MK</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs font-semibold text-foreground">Mike K.</p>
            <p className="text-[10px] text-muted-foreground">iMessage</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-primary" />
          <Video className="h-4 w-4 text-primary" />
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      {/* Messages */}
      <div className="px-3 py-4 space-y-3 min-h-[240px]">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", damping: 25, stiffness: 300, delay: msg.delay }}
            className={`flex flex-col ${msg.side === "right" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.side === "right"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[9px] text-muted-foreground mt-1 px-1">
              {msg.time}
              {i === messages.length - 1 && msg.side === "right" && (
                <span className="ml-1 text-primary">Delivered</span>
              )}
            </span>
          </motion.div>
        ))}
      </div>
      {/* Input bar */}
      <div className="mx-3 mb-3 flex items-center gap-3 rounded-full border border-border/50 bg-muted/50 px-4 py-2.5">
        <div className="h-3 w-3 rounded-full bg-primary/20" />
        <span className="text-[11px] text-muted-foreground flex-1">Message</span>
        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-[10px] text-primary-foreground">↑</span>
        </div>
      </div>
    </div>
  </motion.div>
);

export default iMessageThread;
