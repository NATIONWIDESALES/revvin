import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
export const hasMobileStartBar = (path: string) => ["/", "/pricing", "/about"].includes(path) || /^\/(compare|guides|referral-program)\/[a-z0-9-]+$/.test(path);
export default function MobileStartBar({ pathname }: { pathname: string }) {
  const [pastHero, setPastHero] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const target = document.querySelector("[data-hero-cta]") ?? document.querySelector("main h1");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom < 0));
    observer.observe(target);
    const focus = () => setFocused(Boolean(document.activeElement?.matches("input,select,textarea,[contenteditable=true]")));
    const blur = () => { window.setTimeout(focus, 0); };
    document.addEventListener("focusin", focus); document.addEventListener("focusout", blur);
    return () => { observer.disconnect(); document.removeEventListener("focusin", focus); document.removeEventListener("focusout", blur); };
  }, [pathname]);
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden" hidden={!pastHero || focused}>
    <Button asChild size="lg" className="w-full"><Link to="/signup">Start free</Link></Button>
  </div>;
}