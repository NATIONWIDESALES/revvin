import { Building2, Users, Shield, ArrowRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoMode, DemoPersona } from "@/contexts/DemoModeContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const personas: { id: DemoPersona; icon: any; title: string; desc: string; route: string; color: string }[] = [
  { id: "business", icon: Building2, title: "I'm a Business", desc: "Fund wallet → Create offer → Accept referral → Close deal → Release payout", route: "/dashboard", color: "border-primary/40 hover:border-primary bg-primary/5" },
  { id: "referrer", icon: Users, title: "I'm a Referrer", desc: "Browse offers → Filter by city → Submit referral → Track status → See earnings", route: "/browse", color: "border-earnings/40 hover:border-earnings bg-earnings/5" },
  { id: "admin", icon: Shield, title: "I'm an Admin", desc: "Verify business → Review disputes → Approve payouts → View audit log", route: "/dashboard", color: "border-accent/40 hover:border-accent bg-accent/5" },
];

const DemoEntryScreen = () => {
  const { showDemoEntry, setShowDemoEntry, setDemoPersona, setDemoMode } = useDemoMode();
  const navigate = useNavigate();

  if (!showDemoEntry) return null;

  const select = (p: DemoPersona) => {
    setDemoPersona(p);
    setShowDemoEntry(false);
    setDemoMode(true);
    const persona = personas.find(x => x.id === p);
    if (persona) navigate(persona.route);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-md"
        onClick={() => setShowDemoEntry(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-2xl mx-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 mb-4">
              <Gamepad2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Demo Mode</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Experience Revvin as...</h2>
            <p className="mt-2 text-sm text-muted-foreground">Choose a persona to start a guided walkthrough of the platform</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                className={`rounded-2xl border-2 p-6 text-left transition-all ${p.color}`}
              >
                <p.icon className="h-8 w-8 mb-3 text-foreground" />
                <h3 className="font-display text-lg font-bold mb-2">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                  Start Demo <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowDemoEntry(false)} className="text-xs text-muted-foreground">
              Skip — I'll explore on my own
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DemoEntryScreen;
