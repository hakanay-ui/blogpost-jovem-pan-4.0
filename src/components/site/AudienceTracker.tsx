import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { externalReferrer, isPublicPage } from "@/lib/audience";
import { recordPageVisit } from "@/lib/audience.queries";

const SESSION_KEY = "jp-audience-session";
const SESSION_IDLE_MS = 30 * 60 * 1000;

export function AudienceTracker() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!isPublicPage(pathname) || lastPath.current === pathname || navigator.webdriver) return;
    lastPath.current = pathname;
    try {
      const now = Date.now();
      const stored = sessionStorage.getItem(SESSION_KEY);
      const previous = stored ? JSON.parse(stored) : null;
      const sessionId = typeof previous?.id === "string" && now - previous.lastActivity < SESSION_IDLE_MS
        ? previous.id : crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, lastActivity: now }));
      void recordPageVisit({
        event_id: crypto.randomUUID(),
        session_id: sessionId,
        path: pathname.slice(0, 1024),
        referrer: externalReferrer(document.referrer, window.location.origin),
      }).catch(() => { /* Audience collection must never interrupt reading. */ });
    } catch { /* Storage may be blocked in private browsing. */ }
  }, [pathname]);

  return null;
}