"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ToastItem {
  id: number;
  title: string;
  body: string;
  url?: string;
}

let toastSeq = 0;

export default function PushToastListener() {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== "push-notification") return;
      const payload = event.data.payload ?? {};
      toastSeq += 1;
      const id = toastSeq;
      setToasts((t) => [...t, { id, title: payload.title ?? "Notification", body: payload.body ?? "", url: payload.url }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  function dismiss(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 340,
        width: "calc(100% - 32px)",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card"
          role="alert"
          style={{ padding: 14, cursor: t.url ? "pointer" : "default", boxShadow: "0 12px 34px rgba(0,0,0,.4)" }}
          onClick={() => {
            if (t.url) router.push(t.url);
            dismiss(t.id);
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
            <b style={{ fontSize: 13.5 }}>{t.title}</b>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 4 }}>{t.body}</div>
        </div>
      ))}
    </div>
  );
}
