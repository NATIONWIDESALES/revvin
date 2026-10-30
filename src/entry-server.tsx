import { renderToPipeableStream } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { Writable } from "node:stream";
import type { ComponentType, ReactNode } from "react";
import App from "./App";

// StaticRouter requires location; App always passes it on the server.
const ServerRouter = StaticRouter as unknown as ComponentType<{ children?: ReactNode; location?: string }>;

/**
 * Build-time render of one public route to HTML. Waits for every lazy route
 * chunk (onAllReady) so the document holds the finished page, not a fallback.
 * Rejects on any render error so the prerender can fall back to its plain
 * text document for that route.
 */
export function render(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    let failed: unknown = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sink = new Writable({
      write(chunk, _enc, cb) {
        html += chunk.toString();
        cb();
      },
      final(cb) {
        clearTimeout(timer);
        if (failed) reject(failed);
        else resolve(html);
        cb();
      },
    });
    const stream = renderToPipeableStream(<App Router={ServerRouter} location={url} />, {
      onAllReady() {
        stream.pipe(sink);
      },
      onShellError(err) {
        clearTimeout(timer);
        reject(err);
      },
      onError(err) {
        failed = err;
      },
    });
    timer = setTimeout(() => {
      stream.abort();
      reject(new Error(`render timed out: ${url}`));
    }, 15000);
  });
}
