import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

/**
 * The first page a visitor lands on renders in its final state: the
 * prerendered HTML is already visible, so fading it from opacity 0 on mount
 * made the headline vanish and return. Only later in-app navigations fade.
 */
const PageTransition = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const firstPath = useRef(location.pathname);
  const navigated = useRef(false);

  useEffect(() => {
    if (location.pathname !== firstPath.current) navigated.current = true;
  }, [location.pathname]);

  if (prefersReduced) {
    return <Outlet />;
  }

  const animateEntry = navigated.current || location.pathname !== firstPath.current;

  return (
    <motion.div
      key={location.pathname}
      initial={animateEntry ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Outlet />
    </motion.div>
  );
};

export default PageTransition;
