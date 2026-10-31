import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TEAM_BIO } from "@/config/brand";

export interface RelatedLink {
  to: string;
  label: string;
}

/** "Related" block closing every guide, comparison and trade page. */
export const RelatedLinks = ({ links }: { links: RelatedLink[] }) => (
  <nav aria-labelledby="related-heading" data-block="related" className="mt-14">
    <h2 id="related-heading" className="text-3xl">Related</h2>
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {links.map((l) => (
        <li key={l.to}>
          <Link
            to={l.to}
            className="block rounded-[14px] border border-line bg-card px-5 py-4 font-semibold text-forest transition-colors hover:border-primary"
          >
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);

/** About the author box on every guide and comparison. */
export const AuthorBox = () => (
  <aside aria-labelledby="author-heading" data-block="author" className="mt-10 rounded-[14px] border border-line bg-card p-6">
    <h2 id="author-heading" className="text-2xl">About the author</h2>
    <p className="mt-3 font-semibold text-foreground">The Revvin team</p>
    <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">{TEAM_BIO}</p>
    <Link to="/about#team" className="mt-3 inline-block text-sm font-semibold text-primary underline">
      More about the Revvin team
    </Link>
  </aside>
);

/** A ready-to-copy message. Copying happens in the browser only. */
export const CopyBlock = ({ label, text }: { label: string; text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <figure className="rounded-[14px] border border-line bg-card p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold text-forest">{label}</span>
        <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={copy} aria-label={`Copy: ${label}`}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </figcaption>
      <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed text-foreground">{text}</p>
      <span className="sr-only" aria-live="polite">{copied ? "Copied to clipboard" : ""}</span>
    </figure>
  );
};

export interface SimpleTable {
  caption: string;
  head: string[];
  rows: string[][];
}

/** Plain comparison table for guides (no checked-on line). */
export const GuideTable = ({ t }: { t: SimpleTable }) => (
  <figure className="my-8">
    <div className="overflow-x-auto rounded-[14px] border border-line bg-card" tabIndex={0} role="region" aria-label={t.caption}>
      <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {t.head.map((h) => (
              <th key={h} scope="col" className="p-3 font-display text-lg font-bold text-forest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.join("|")} className="border-b border-line align-top last:border-0">
              <th scope="row" className="p-3 font-semibold text-foreground">{r[0]}</th>
              {r.slice(1).map((c, i) => (
                <td key={i} className="p-3 text-muted-foreground">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </figure>
);
