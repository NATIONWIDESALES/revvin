import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/track";
import { analyticsContext, setAnalyticsAudience } from "@/lib/analyticsPrivacy";

/**
 * First-party, public-only pageviews. Third-party script injection is paused:
 * gating our own calls cannot stop an already-loaded automatic SPA tracker
 * observing a later private URL. See the analytics privacy release note.
 * Removing a script element would not unload its listeners or running code.
 */
const Analytics = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const currentAudience = loading ? "unknown" : user ? "signed-in" : "anonymous";
  const lastPath = useRef<string | null>(null);

  useLayoutEffect(() => {
    setAnalyticsAudience(currentAudience);
    return () => setAnalyticsAudience("unknown");
  }, [currentAudience]);

  useEffect(() => {
    const href = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
    const context = analyticsContext(href, currentAudience);
    if (!context) {
      lastPath.current = null;
      return;
    }
    // Query-only changes do not create duplicate pageviews. No token or query
    // ever becomes a dedupe key, page path or analytics property.
    if (lastPath.current === context.path) return;
    lastPath.current = context.path;
    track("page_viewed");
  }, [location.pathname, location.search, location.hash, currentAudience]);

  return null;
};

export default Analytics;
