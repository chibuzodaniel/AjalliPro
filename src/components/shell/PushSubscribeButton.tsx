"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/app/(app)/push/actions";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}

type Status = "unsupported" | "checking" | "subscribed" | "unsubscribed" | "denied" | "working" | "needs-install";

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    // iOS only supports push notifications for a PWA added to the Home
    // Screen — a regular Safari tab (even bookmarked) can request
    // permission and "subscribe" successfully but will never actually
    // receive a push. Catch that case with a clear instruction instead of
    // silently doing nothing.
    if (isIos() && !isStandalone()) {
      setStatus("needs-install");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!cancelled) setStatus(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubscribe() {
    setStatus("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setStatus("unsupported");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await subscribeToPush({ endpoint: sub.endpoint, keys: json.keys });
      setStatus("subscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }

  async function handleUnsubscribe() {
    setStatus("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setStatus("subscribed");
    }
  }

  if (status === "unsupported") return null;
  if (status === "checking") return null;

  if (status === "needs-install") {
    return (
      <div
        className="nav-item"
        title="On iPhone/iPad: tap Share, then 'Add to Home Screen', then open the app from your Home Screen to enable notifications"
        style={{ cursor: "default", fontSize: 12, lineHeight: 1.4, opacity: 0.8 }}
      >
        <span className="ic">🔕</span>
        Add to Home Screen to enable notifications on iOS
      </div>
    );
  }

  if (status === "denied") {
    return (
      <button
        className="nav-item"
        disabled
        title="Notifications are blocked in your browser settings"
        style={{ opacity: 0.5, cursor: "not-allowed", width: "100%", background: "none", border: "none", textAlign: "left" }}
      >
        <span className="ic">🔕</span>
        Notifications blocked
      </button>
    );
  }

  if (status === "subscribed") {
    return (
      <button
        className="nav-item"
        onClick={handleUnsubscribe}
        style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
      >
        <span className="ic">🔔</span>
        Notifications on
      </button>
    );
  }

  return (
    <button
      className="nav-item"
      onClick={handleSubscribe}
      disabled={status === "working"}
      style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer" }}
    >
      <span className="ic">🔔</span>
      {status === "working" ? "Enabling…" : "Enable notifications"}
    </button>
  );
}
