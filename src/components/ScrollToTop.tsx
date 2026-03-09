import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Restores scroll to top on navigation.
 * - If there's a hash (e.g. /page#section), we try to scroll that element into view.
 */
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Allow the next paint so layout is ready before scrolling.
    requestAnimationFrame(() => {
      if (location.hash) {
        const id = decodeURIComponent(location.hash.replace(/^#/, ""));
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: "start" });
          return;
        }
      }

      window.scrollTo(0, 0);
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
};

export default ScrollToTop;
