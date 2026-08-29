"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const TIMEOUT_MS = 2 * 60 * 1000;
const STORAGE_KEY = "ajalli:last-activity-at";
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

export default function InactivityLogout({ exempt }: { exempt?: boolean }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (exempt) return;
    let cancelled = false;

    async function logout() {
      if (cancelled) return;
      await signOut({ redirect: false });
      router.push("/login");
      router.refresh();
    }

    function markActive() {
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {
        // localStorage unavailable — falls back to the in-memory timer only
      }
    }

    function resetTimer() {
      markActive();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, TIMEOUT_MS);
    }

    // A plain setTimeout only fires while the tab/app stays in the
    // foreground running JS — browsers throttle or fully suspend timers in
    // backgrounded tabs (especially on mobile/PWA), so it can silently miss
    // the deadline while hidden. The last-activity timestamp survives that
    // since it's just a value read from storage: whenever the page becomes
    // visible again (or on first mount, e.g. reopening the PWA from the
    // Home Screen), check real elapsed time and log out immediately if the
    // timeout already passed while backgrounded, instead of waiting for a
    // timer that may never fire.
    function checkElapsedSinceLastActive() {
      try {
        const last = Number(localStorage.getItem(STORAGE_KEY));
        if (last && Date.now() - last >= TIMEOUT_MS) {
          logout();
          return;
        }
      } catch {
        // ignore — no stored timestamp to check against
      }
      resetTimer();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") checkElapsedSinceLastActive();
    }

    checkElapsedSinceLastActive();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router, exempt]);

  return null;
}
