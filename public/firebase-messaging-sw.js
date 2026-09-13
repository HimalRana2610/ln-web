/*
  Firebase Cloud Messaging worker, registered by src/lib/push.ts only after the
  user turns notifications on in Settings.

  A worker cannot read build-time env vars, so the public Firebase config is
  passed in the registration URL's query string. Nothing in it is secret.

  Keep the SDK version in step with the `firebase` package in package.json.
*/

importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Foreground pages get no system notification from FCM; background ones do.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "LectureNote AI", {
    body: body ?? "",
    icon: "/favicon.ico",
    data: { link: payload.fcmOptions?.link ?? payload.data?.link ?? "/dashboard" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link ?? "/dashboard";
  event.waitUntil(self.clients.openWindow(link));
});
