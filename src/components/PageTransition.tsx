import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

/**
 * The first page a visitor lands on renders in its final state: the
 * prerendered HTML is already visible. Later in-app navigations get a short
 * CSS fade, skipped entirely under reduced motion.
 */
const PageTransition = () => {
  const location = useLocation();
  const firstPath = useRef(location.pathname);
  const navigated = useRef(false);

  useEffect(() => {
    if (location.pathname !== firstPath.current) navigated.current = true;
  }, [location.pathname]);

  const animateEntry = navigated.current || location.pathname !== firstPath.current;

  return (
    <div key={location.pathname} className={animateEntry ? "animate-in fade-in duration-200 motion-reduce:animate-none" : undefined}>
      <Outlet />
    </div>
  );
};

export default PageTransition;
