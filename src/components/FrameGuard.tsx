import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function protectedFramePath(path: string): boolean {
  return /^\/(dashboard|welcome|me|__sa|__health|reset-password|auth|login|signup)(\/|$)/.test(path) || path.startsWith("/partners/dashboard");
}
export default function FrameGuard({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const blocked = typeof window !== "undefined" && protectedFramePath(pathname) && window.top !== window.self;
  useEffect(() => {
    if (!blocked) return;
    try { if (window.top) window.top.location.href = window.location.href; } catch { /* Cross-origin frames remain blocked. */ }
  }, [blocked]);
  return blocked ? <main><h1>Open Revvin in its own window</h1><a href={pathname} target="_top">Open Revvin</a></main> : children;
}