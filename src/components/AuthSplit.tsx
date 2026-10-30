import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Wordmark from "@/components/brand/Wordmark";
import HeroYardSign from "@/components/marketing/HeroYardSign";

export const AUTH_BENEFITS = [
  "Live in about a minute",
  "Free for your first 100 customers",
  "You pay rewards only when a job closes",
] as const;

/**
 * Split layout for sign up, sign in, password reset and onboarding: the form
 * on paper, and a forest panel with the yard sign. On phones the form comes first.
 */
const AuthSplit = ({ children, showWordmark = true }: { children: ReactNode; showWordmark?: boolean }) => (
  <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] bg-background lg:grid-cols-2">
    <main className="flex min-w-0 flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-12">
      {showWordmark && (
        <Link to="/" className="mb-8 self-start" aria-label="REVVIN.CO home"><Wordmark size="md" /></Link>
      )}
      <div className="mx-auto w-full max-w-md flex-1 lg:flex lg:flex-col lg:justify-center">{children}</div>
    </main>
    <aside className="surface-forest flex min-w-0 flex-col justify-center overflow-hidden px-6 py-12 lg:px-14">
      <ul className="space-y-3">
        {AUTH_BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-3 font-display text-2xl font-bold sm:text-3xl">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full bg-sign" />
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-12"><HeroYardSign compact /></div>
    </aside>
  </div>
);

export default AuthSplit;
