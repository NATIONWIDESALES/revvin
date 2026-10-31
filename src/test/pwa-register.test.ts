import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/pwa", () => ({
  SERVICE_WORKER_PATH: "/sw.js",
  shouldRegisterServiceWorker: () => true,
}));

import { initServiceWorker } from "@/pwa/register";

interface MockRegistration {
  update: ReturnType<typeof vi.fn>;
  waiting: unknown;
  addEventListener: (type: string, fn: () => void) => void;
}

function mockServiceWorker(registration: MockRegistration, withController = true) {
  const listeners: Record<string, (() => void)[]> = {};
  const sw = {
    controller: withController ? { scriptURL: "https://revvin.co/sw.js" } : null,
    addEventListener: (type: string, fn: () => void) => {
      (listeners[type] ??= []).push(fn);
    },
    register: vi.fn(async () => registration),
    getRegistrations: vi.fn(async () => []),
  };
  Object.defineProperty(window.navigator, "serviceWorker", { value: sw, configurable: true });
  return { sw, fire: (type: string) => (listeners[type] ?? []).forEach((fn) => fn()) };
}

const makeRegistration = (): MockRegistration => ({
  update: vi.fn(async () => undefined),
  waiting: null,
  addEventListener: () => {},
});

describe("service worker registration freshness", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("registers with updateViaCache none and checks for an update immediately", async () => {
    const registration = makeRegistration();
    const { sw } = mockServiceWorker(registration);
    await initServiceWorker(() => {});
    expect(sw.register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" });
    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("checks again when the tab becomes visible", async () => {
    const registration = makeRegistration();
    mockServiceWorker(registration);
    await initServiceWorker(() => {});
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it("reloads exactly once when a new worker takes over from an old one", async () => {
    const registration = makeRegistration();
    const { fire } = mockServiceWorker(registration, true);
    const reload = vi.fn();
    await initServiceWorker(() => {}, reload);
    fire("controllerchange");
    fire("controllerchange");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not arm a reload on a first visit with no controlling worker", async () => {
    const registration = makeRegistration();
    const { fire } = mockServiceWorker(registration, false);
    const reload = vi.fn();
    await initServiceWorker(() => {}, reload);
    fire("controllerchange");
    expect(reload).not.toHaveBeenCalled();
  });
});
