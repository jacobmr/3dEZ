"use client";

import { useConnectionStatus } from "@/hooks/useConnectionStatus";

/**
 * Thin banner shown at the top of the viewport when the connection is lost
 * or reconnecting.  Renders nothing when online.
 */
export default function ConnectionBanner() {
  const status = useConnectionStatus();

  if (status === "online") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
        status === "offline"
          ? "bg-red-600 text-white"
          : "bg-amber-500 text-amber-950"
      }`}
    >
      {status === "offline" ? (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
          You are offline — changes will not be saved until reconnected.
        </>
      ) : (
        <>
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-900/60" />
          Reconnecting&hellip;
        </>
      )}
    </div>
  );
}
