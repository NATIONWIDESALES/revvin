import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform animate-in fade-in slide-in-from-bottom-4 duration-200 hover:scale-110 active:scale-95 motion-reduce:animate-none"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
};

export default ScrollToTopButton;
