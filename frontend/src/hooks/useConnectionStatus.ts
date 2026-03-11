"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = "online" | "offline" | "reconnecting";

/**
 * Track browser online/offline status and verify with a lightweight
 * health-check ping when coming back online.
 */
export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/health", {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        setStatus("online");
      } else {
        setStatus("offline");
      }
    } catch {
      setStatus("offline");
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus("reconnecting");
      checkConnection();
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial state
    if (!navigator.onLine) {
      setStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [checkConnection]);

  return status;
}
