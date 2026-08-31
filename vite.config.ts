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
        // Function form (not the object form): only these exact packages are
        // pinned into their own chunk. Shared transitive deps stay where Rollup
        // puts them, so a marketing page does not statically pull in a vendor
        // chunk just because it shares a small utility with it.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (id.includes("node_modules/react-router")) return "router";
          if (id.includes("node_modules/framer-motion")) return "motion";
          if (id.includes("node_modules/@supabase/")) return "supabase";
          // recharts is deliberately NOT pinned: it is only used by the lazy
          // referrer dashboard, so Rollup folds it into that route chunk.
          // Pinning it created a vendor chunk that the entry ended up importing
          // statically through shared utilities, loading ~100KB gz on marketing
          // pages for nothing.
          if (/node_modules\/(leaflet|react-leaflet)\//.test(id)) return "leaflet";
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
