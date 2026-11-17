import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { protectedFramePath } from "@/lib/frameProtection";
export { protectedFramePath } from "@/lib/frameProtection";
export default function FrameGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const blocked = typeof window !== "undefined" && protectedFramePath(pathname) && window.top !== window.self;
  useEffect(() => {
    if (!blocked) return;
    try { if (window.top) window.top.location.href = window.location.href; } catch { /* Cross-origin frames remain blocked. */ }
  }, [blocked]);
  return blocked ? null : children;
}