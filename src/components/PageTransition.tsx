import { motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

const PageTransition = () => {
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <Outlet />;
  }

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Outlet />
    </motion.div>
  );
};

export default PageTransition;
