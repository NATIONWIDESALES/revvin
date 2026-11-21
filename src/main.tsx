import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { blockFramedPage } from "./lib/frameProtection";
import { installChunkRecovery } from "./lib/chunkRecovery";
import { captureFirstTouch } from "./lib/firstTouch";
import { ResizeObserver as CompatibleResizeObserver } from "@juggle/resize-observer";

// Radix size measurement is used on pages that never load the slider.
if (typeof window !== "undefined" && typeof window.ResizeObserver !== "function") {
  window.ResizeObserver = CompatibleResizeObserver;
}

installChunkRecovery();
captureFirstTouch(window.location.href);

const root = document.getElementById("root");

// Prerendered pages ship the real page markup (data-ssr), so React attaches to
// it instead of replacing it. Anything else renders from scratch.
if (blockFramedPage(window.location.pathname)) {
  root?.replaceChildren();
} else if (root?.dataset.ssr === "1") {
  hydrateRoot(root, <App />);
} else if (root) {
  createRoot(root).render(<App />);
}
