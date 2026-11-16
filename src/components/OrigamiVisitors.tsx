import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { createOrigamiFrame, origamiAllowed } from "@/lib/origami";

let loaded = false;

const OrigamiVisitors = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!origamiAllowed(pathname)) {
      document.getElementById("origami-visitors")?.remove();
      return;
    }
    if (loaded) return;
    // Two animation frames leave an opportunity for the first paint before loading.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (loaded || !origamiAllowed(window.location.pathname)) return;
        document.body.appendChild(createOrigamiFrame());
        loaded = true;
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [pathname]);

  return null;
};

export default OrigamiVisitors;