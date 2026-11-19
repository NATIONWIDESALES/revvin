import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mimics the real client: one channel object per name, and .on() after subscribe() throws.
const channels = new Map<string, { subscribed: boolean }>();
const removed: string[] = [];
vi.mock("@/integrations/supabase/client", () => {
  const query: any = { select: () => query, eq: () => query, order: () => query, limit: () => Promise.resolve({ data: [] }) };
  return {
    supabase: {
      from: () => query,
      channel: (name: string) => {
        const state = channels.get(name) ?? { subscribed: false };
        channels.set(name, state);
        const ch: any = {
          name,
          on: () => { if (state.subscribed) throw new Error(`cannot add postgres_changes callbacks for realtime:${name} after subscribe()`); return ch; },
          subscribe: () => { state.subscribed = true; return ch; },
        };
        return ch;
      },
      removeChannel: (ch: any) => { removed.push(ch.name); },
    },
  };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import NotificationBell from "@/components/NotificationBell";
import SilentBoundary from "@/components/SilentBoundary";

describe("NotificationBell realtime", () => {
  it("mounts, unmounts and remounts without throwing", () => {
    const a = render(<NotificationBell />);
    a.unmount();
    expect(() => render(<NotificationBell />)).not.toThrow();
    expect(removed.length).toBe(1);
  });
  it("two bells mounted at once do not throw", () => {
    expect(() => render(<><NotificationBell /><NotificationBell /></>)).not.toThrow();
  });
  it("a failing widget inside SilentBoundary renders nothing instead of crashing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => { throw new Error("x"); };
    const { container } = render(<div><SilentBoundary><Boom /></SilentBoundary></div>);
    expect(container.innerHTML).toBe("<div></div>");
    spy.mockRestore();
  });
});
