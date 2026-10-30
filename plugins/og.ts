import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/**
 * Build-time Open Graph images: 1200x630 PNG per public page, in the yard-sign
 * style (forest background, white Barlow Condensed 800 title, yellow chip with
 * the page type, REVVIN.CO wordmark). Rendered locally with satori and resvg;
 * no external service.
 */

const require = createRequire(import.meta.url);

const FOREST = "#14432a";
const SIGN = "#f7c948";
const PAPER = "#fbf8f1";

export interface OgCard {
  /** Path the image describes, for example /pricing. */
  path: string;
  title: string;
  /** Text in the yellow chip, for example "Guide" or "Compare". */
  kind: string;
}

/** File name under /og/ for a page path. */
export const ogFileName = (routePath: string) =>
  `${routePath === "/" ? "home" : routePath.replace(/^\//, "").replace(/\//g, "--")}.png`;

export const ogUrl = (site: string, routePath: string) => `${site}/og/${ogFileName(routePath)}`;

/** The chip label for a page, from its path. */
export const ogKind = (routePath: string): string => {
  if (routePath.startsWith("/compare")) return "Compare";
  if (routePath.startsWith("/guides")) return "Guide";
  if (routePath.startsWith("/tools")) return "Free tool";
  if (routePath.startsWith("/referral-program")) return "Referral program";
  if (routePath.startsWith("/r/")) return "Referral reward";
  if (routePath.startsWith("/earn")) return "Earn";
  if (routePath === "/pricing") return "Pricing";
  if (routePath.startsWith("/partners")) return "Partners";
  return "Revvin";
};

const fontFile = (pkg: string, file: string) =>
  fs.readFileSync(path.join(path.dirname(require.resolve(`${pkg}/package.json`)), "files", file));

type Renderer = (card: OgCard) => Promise<Buffer>;

let rendererPromise: Promise<Renderer> | null = null;

const createRenderer = async (): Promise<Renderer> => {
  const { default: satori } = await import("satori");
  const { Resvg, initWasm } = await import("@resvg/resvg-wasm");
  try {
    await initWasm(fs.readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
  } catch (err) {
    // initWasm throws if it already ran in this process (a second build in watch mode).
    if (!String(err).includes("Already initialized")) throw err;
  }
  const fonts = [
    { name: "Barlow Condensed", data: fontFile("@fontsource/barlow-condensed", "barlow-condensed-latin-800-normal.woff"), weight: 800 as const, style: "normal" as const },
    { name: "Barlow", data: fontFile("@fontsource/barlow", "barlow-latin-700-normal.woff"), weight: 700 as const, style: "normal" as const },
  ];

  return async (card: OgCard) => {
    const title = card.title.replace(/\s*\|\s*Revvin$/, "");
    const size = title.length > 60 ? 64 : title.length > 40 ? 76 : 88;
    const el = {
      type: "div",
      props: {
        style: {
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: FOREST,
          padding: "64px 72px",
          fontFamily: "Barlow",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignSelf: "flex-start",
                background: SIGN,
                color: FOREST,
                fontFamily: "Barlow Condensed",
                fontWeight: 800,
                fontSize: 34,
                padding: "8px 20px",
                borderRadius: 10,
              },
              children: card.kind,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                color: "#ffffff",
                fontFamily: "Barlow Condensed",
                fontWeight: 800,
                fontSize: size,
                lineHeight: 1,
                maxWidth: 1056,
              },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: { display: "flex", color: PAPER, fontFamily: "Barlow Condensed", fontWeight: 800, fontSize: 36 },
              children: "REVVIN.CO",
            },
          },
        ],
      },
    };
    const svg = await satori(el as never, { width: 1200, height: 630, fonts });
    return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
  };
};

/** Write one image per card into dist/og. Returns the number written. */
export const writeOgImages = async (dist: string, cards: OgCard[]) => {
  rendererPromise ??= createRenderer();
  const render = await rendererPromise;
  const dir = path.join(dist, "og");
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const card of cards) {
    fs.writeFileSync(path.join(dir, ogFileName(card.path)), await render(card));
    n++;
  }
  return n;
};
