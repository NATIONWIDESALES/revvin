import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root")!;

// Prerendered pages ship the real page markup (data-ssr), so React attaches to
// it instead of replacing it. Anything else renders from scratch.
if (root.dataset.ssr === "1") {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}
