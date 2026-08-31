import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import prerenderPlugin from "./plugins/prerender";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin(), prerenderPlugin()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        // Split the heaviest shared dependencies so they cache independently
        // across deploys instead of being re-downloaded with app code.
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          motion: ["framer-motion"],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts"],
          leaflet: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
