"use client";

/**
 * Web push through Firebase Cloud Messaging.
 *
 * Opt-in only: nothing here runs until the user flips the switch in Settings.
 * With the NEXT_PUBLIC_FIREBASE_* variables unset the feature is simply absent.
 *
 * The token itself is not a secret — FCM only accepts sends from our server
 * key — so keeping it in localStorage to remove it on sign-out is fine.
 */

import { registerPushToken, removePushToken } from "@/app/(app)/settings/actions";

// Each variable is spelled out: Next only inlines literal `process.env.NEXT_PUBLIC_*`.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const PUSH_TOKEN_KEY = "ln-push-token";

/** FCM keeps its worker off `/`, so it never competes with `sw.js`. */
const FCM_SCOPE = "/firebase-cloud-messaging-push-scope";

export function isPushConfigured(): boolean {
  return Boolean(
    vapidKey &&
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
  );
}

export function storedPushToken(): string | null {
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function messaging() {
  // Loaded on demand so the Firebase SDK never weighs down ordinary pages.
  const [{ initializeApp, getApps }, fcm] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  if (!(await fcm.isSupported())) return null;
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  return { fcm, instance: fcm.getMessaging(app) };
}

/** Asks permission, gets a token and registers it. Returns an error message or null. */
export async function enablePush(): Promise<string | null> {
  if (!isPushConfigured()) return "Notifications are not set up on this server.";
  const loaded = await messaging();
  if (!loaded) return "This browser does not support notifications.";

  if ((await Notification.requestPermission()) !== "granted") {
    return "Notifications are blocked. Allow them in your browser's site settings.";
  }

  // The worker cannot read env vars, so the public config travels in its URL.
  const params = new URLSearchParams(firebaseConfig as Record<string, string>);
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${params}`,
    { scope: FCM_SCOPE },
  );

  const token = await loaded.fcm.getToken(loaded.instance, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  const result = await registerPushToken(token);
  if (!result.ok) return result.error;

  try {
    localStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch {
    // Without storage the token cannot be removed on sign-out; still usable.
  }
  return null;
}

/** Unregisters this browser. Best-effort: a dead token is pruned by the backend anyway. */
export async function disablePush(): Promise<void> {
  const token = storedPushToken();
  if (!token) return;
  try {
    localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // Ignore.
  }
  await removePushToken(token);
  try {
    const loaded = await messaging();
    if (loaded) await loaded.fcm.deleteToken(loaded.instance);
  } catch {
    // The backend no longer has it, which is what matters.
  }
}
