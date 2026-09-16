import { supabase } from "@/integrations/supabase/client";
import { SERVICE_WORKER_PATH, VAPID_PUBLIC_KEY, isIos, isStandalone } from "@/config/pwa";

/**
 * Web push opt-in and opt-out from the app.
 *
 * A subscription only exists where a service worker is registered, which is the
 * published site. Permission is always requested from a real tap, because iOS
 * refuses a request that does not come from a user gesture.
 */

export type PushState =
  | "unsupported"
  | "needs-install"
  | "no-worker"
  | "default"
  | "granted"
  | "denied";

const toUint8Array = (base64Url: string) => {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const platformLabel = () => {
  if (typeof navigator === "undefined") return "unknown";
  if (isIos()) return isStandalone() ? "ios-standalone" : "ios-browser";
  if (/Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
};

/** What the settings UI should show right now. */
export async function readPushState(): Promise<PushState> {
  if (!pushSupported()) {
    // iOS only exposes push to an installed app, so this is the case to explain
    // rather than a browser that simply cannot do it.
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (isIos() && !isStandalone()) return "needs-install";
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return "no-worker";
  return Notification.permission as PushState;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export interface SubscribeResult {
  ok: boolean;
  state: PushState;
  message?: string;
}

/** Must be called straight from a click. */
export async function enablePush(businessId: string | null): Promise<SubscribeResult> {
  const state = await readPushState();
  if (state === "unsupported" || state === "needs-install" || state === "no-worker") {
    return { ok: false, state };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      state: permission as PushState,
      message:
        permission === "denied"
          ? "Notifications are blocked for this site in your browser settings."
          : "Notifications were not turned on.",
    };
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY),
    }));

  const raw = subscription.toJSON() as { endpoint?: string; keys?: Record<string, string> };
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId || !raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
    return { ok: false, state: "granted", message: "Could not save this device." };
  }

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    business_id: businessId,
    endpoint: raw.endpoint,
    p256dh: raw.keys.p256dh,
    auth: raw.keys.auth,
    user_agent: navigator.userAgent.slice(0, 300),
    platform: platformLabel(),
  });

  // A duplicate endpoint means this device is already stored, which is a
  // success from the person's point of view.
  if (error && error.code !== "23505") {
    return { ok: false, state: "granted", message: "Could not save this device." };
  }
  return { ok: true, state: "granted" };
}

export async function disablePush(): Promise<boolean> {
  const subscription = await currentSubscription();
  if (!subscription) return true;
  const endpoint = subscription.endpoint;
  try {
    await subscription.unsubscribe();
  } catch {
    /* the row still has to go */
  }
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return !error;
}

export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase.functions.invoke("send-push", {
    body: {
      title: "Revvin test notification",
      body: "Push notifications are working on this device.",
      url: "/dashboard",
      tag: "revvin-test",
    },
  });
  if (error) return { ok: false, message: "Could not send the test notification." };
  return { ok: true, message: "Sent. It should appear in a moment." };
}

export const SERVICE_WORKER_URL = SERVICE_WORKER_PATH;
