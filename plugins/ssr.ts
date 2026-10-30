import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Builds src/entry-server.tsx for Node and returns its render(url) function.
 * The prerender uses it to put the real page markup into each public route's
 * HTML, which the browser then hydrates instead of rebuilding.
 *
 * Returns null if the server build fails, so the prerender can fall back to
 * its plain text documents rather than failing the whole build.
 */
export type SsrRender = (url: string) => Promise<string>;

export const buildSsrRenderer = async (root: string): Promise<SsrRender | null> => {
  const outDir = path.join(root, "node_modules", ".revvin-ssr");
  try {
    const { build } = await import("vite");
    const { default: react } = await import("@vitejs/plugin-react-swc");
    await build({
      configFile: false,
      root,
      mode: "production",
      logLevel: "error",
      plugins: [react()],
      resolve: { alias: { "@": path.join(root, "src") } },
      build: {
        ssr: path.join(root, "src/entry-server.tsx"),
        outDir,
        emptyOutDir: true,
        minify: false,
        rollupOptions: { output: { format: "esm", entryFileNames: "entry-server.mjs" } },
      },
    });
    const mod = (await import(`${pathToFileURL(path.join(outDir, "entry-server.mjs")).href}?t=${Date.now()}`)) as {
      render: SsrRender;
    };
    return mod.render;
  } catch (err) {
    console.warn(`[prerender] server render build failed, using text documents: ${String(err).slice(0, 400)}`);
    return null;
  }
};
