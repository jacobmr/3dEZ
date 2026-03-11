"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import StlViewer from "./StlViewer";
import VersionHistory from "./VersionHistory";
import { shareDesign } from "@/lib/api";
import type { DesignHistoryEntry } from "@/lib/api";

interface PreviewPanelProps {
  stlBytes: ArrayBuffer | null;
  isLoading: boolean;
  error: string | null;
  /** Design category for dimension annotations. */
  category?: string;
  /** Design parameters for dimension annotations. */
  params?: Record<string, unknown>;
  /** Callback to retry STL generation after an error. */
  onRetry?: () => void;
  /** Previous STL bytes for before/after comparison. */
  previousStlBytes?: ArrayBuffer | null;
  /** Whether currently showing the previous (before) state. */
  showingPrevious?: boolean;
  /** Toggle between before and after views. */
  onToggleBeforeAfter?: () => void;
  /** Description of the modification that was applied. */
  modificationDescription?: string | null;
  /** Design version number (1, 2, 3, ...). */
  version?: number;
  /** Design ID for download tracking. */
  designId?: string | null;
  /** Conversation ID for version history lookup. */
  conversationId?: string | null;
  /** Called when user selects a version from history. */
  onSelectVersion?: (entry: DesignHistoryEntry) => void;
  /** Called when user clicks revert on a version. */
  onRevertVersion?: (entry: DesignHistoryEntry) => void;
  /** Incremented to force version history refresh. */
  versionHistoryRefreshKey?: number;
}

function downloadStl(
  stlBytes: ArrayBuffer,
  category?: string,
  version?: number,
  designId?: string | null,
) {
  const cat = (category ?? "design").replace(/\s+/g, "_");
  const ver = version && version > 0 ? `_v${version}` : "";
  const filename = `${cat}${ver}.stl`;

  const blob = new Blob([stlBytes], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Fire-and-forget download tracking
  if (designId) {
    fetch(`/api/designs/${designId}/download`, {
      method: "POST",
      headers: {
        "X-Session-ID": localStorage.getItem("3dez-session-id") ?? "",
      },
    }).catch(() => {});
  }
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        {/* Skeleton 3D box shape */}
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-700" />
          <div
            className="absolute inset-2 animate-pulse rounded-md bg-gray-300 dark:bg-zinc-600"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="absolute inset-4 animate-pulse rounded bg-gray-200 dark:bg-zinc-700"
            style={{ animationDelay: "300ms" }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-zinc-600 dark:border-t-zinc-300" />
          <p className="text-sm text-gray-400 dark:text-zinc-400">
            Generating 3D model&hellip;
          </p>
        </div>
      </div>
    </div>
  );
}

function RegeneratingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[1px] animate-fade-in">
      <div className="flex flex-col items-center gap-2 rounded-lg bg-white/90 px-4 py-3 shadow-lg dark:bg-zinc-800/90">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600 dark:border-indigo-700 dark:border-t-indigo-400" />
        <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
          Regenerating&hellip;
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const isDockerError = message.includes("Docker environment");

  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="text-2xl text-red-400">&#9888;</div>
        <p className="text-sm text-red-300">
          {isDockerError ? "3D preview requires Docker environment" : message}
        </p>
        {onRetry && !isDockerError && (
          <button
            onClick={onRetry}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-gray-400 dark:text-zinc-500">
      <div>
        <div className="mb-2 text-3xl">&#9651;</div>
        <p className="text-sm">Design something to see it here</p>
      </div>
    </div>
  );
}

function CanvasFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-zinc-600 dark:border-t-zinc-300" />
    </div>
  );
}

/**
 * Container for the 3D STL preview.
 * Handles loading, error, empty, and data states.
 */
export default function PreviewPanel({
  stlBytes,
  isLoading,
  error,
  category,
  params,
  onRetry,
  previousStlBytes,
  showingPrevious,
  onToggleBeforeAfter,
  modificationDescription,
  version,
  designId,
  conversationId,
  onSelectVersion,
  onRevertVersion,
  versionHistoryRefreshKey,
}: PreviewPanelProps) {
  const hasBeforeAfter = !!previousStlBytes && !!onToggleBeforeAfter;

  // Share state
  const [shareStatus, setShareStatus] = useState<"idle" | "loading" | "copied">(
    "idle",
  );

  const handleShare = useCallback(async () => {
    if (!designId || shareStatus === "loading") return;
    setShareStatus("loading");
    try {
      const result = await shareDesign(designId);
      const url = `${window.location.origin}${result.share_url}`;
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    } catch {
      setShareStatus("idle");
    }
  }, [designId, shareStatus]);

  // Track STL changes for fade transition
  const [fadeKey, setFadeKey] = useState(0);
  const prevStlRef = useRef<ArrayBuffer | null>(null);

  // "Updated" indicator — briefly shown when STL swaps on a revision
  const [showUpdated, setShowUpdated] = useState(false);

  useEffect(() => {
    if (stlBytes && prevStlRef.current && stlBytes !== prevStlRef.current) {
      // STL changed — trigger fade and show "Updated" badge
      setFadeKey((k) => k + 1);
      if (version && version > 1) {
        setShowUpdated(true);
        const timer = setTimeout(() => setShowUpdated(false), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevStlRef.current = stlBytes;
  }, [stlBytes, version]);

  // Determine if this is a regeneration (loading while STL already exists)
  const isRegenerating = isLoading && !!stlBytes;

  let content: React.ReactNode;

  if (isLoading && !stlBytes) {
    // First-time generation — show skeleton
    content = <LoadingSkeleton />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={onRetry} />;
  } else if (!stlBytes) {
    content = <EmptyState />;
  } else {
    content = (
      <Suspense fallback={<CanvasFallback />}>
        <div className="relative flex flex-1">
          <div
            key={fadeKey}
            className={`flex flex-1 animate-stl-swap transition-opacity duration-300 ${isRegenerating ? "opacity-50" : "opacity-100"}`}
          >
            <Canvas
              frameloop="demand"
              camera={{ position: [0, 0, 100], fov: 50 }}
              gl={{ antialias: true }}
              className="flex-1"
            >
              <StlViewer
                stlBytes={stlBytes}
                category={category}
                params={params}
              />
            </Canvas>
          </div>
          {isRegenerating && <RegeneratingOverlay />}
        </div>
      </Suspense>
    );
  }

  return (
    <div className="flex h-full flex-col border-t border-gray-200 lg:border-l lg:border-t-0 dark:border-zinc-800">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-zinc-400">
            Preview
          </span>
          {/* Version badge */}
          {version && version > 1 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              v{version}
            </span>
          )}
          {/* "Updated" indicator — fades out after 3s */}
          {showUpdated && (
            <span className="animate-fade-in rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 transition-opacity dark:bg-green-900/30 dark:text-green-400">
              Updated
            </span>
          )}
          {hasBeforeAfter && (
            <button
              onClick={onToggleBeforeAfter}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                showingPrevious
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {showingPrevious ? "Before" : "After"}
            </button>
          )}
          {modificationDescription && !showingPrevious && (
            <span className="max-w-[200px] truncate text-xs text-gray-400 dark:text-zinc-500">
              {modificationDescription}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stlBytes && designId && (
            <button
              onClick={handleShare}
              disabled={shareStatus === "loading"}
              className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M12 2a2 2 0 1 1-1.4 3.42L7.2 7.72a2 2 0 0 1 0 .56l3.4 2.3A2 2 0 1 1 10 12a2 2 0 0 1 .02-.28L6.6 9.42a2 2 0 1 1 0-2.84l3.42-2.3A2 2 0 0 1 12 2Z" />
              </svg>
              {shareStatus === "copied" ? "Copied!" : "Share"}
            </button>
          )}
          {stlBytes && (
            <button
              onClick={() => downloadStl(stlBytes, category, version, designId)}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path d="M8 10.5a.75.75 0 0 1-.53-.22l-3-3a.75.75 0 1 1 1.06-1.06L7.25 7.94V2.75a.75.75 0 0 1 1.5 0v5.19l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3A.75.75 0 0 1 8 10.5Z" />
                <path d="M2.75 13a.75.75 0 0 1 0-1.5h10.5a.75.75 0 0 1 0 1.5H2.75Z" />
              </svg>
              Download STL
            </button>
          )}
        </div>
      </div>
      {onSelectVersion && onRevertVersion && (
        <VersionHistory
          conversationId={conversationId ?? null}
          currentVersion={version ?? 1}
          onSelectVersion={onSelectVersion}
          onRevert={onRevertVersion}
          refreshKey={versionHistoryRefreshKey}
        />
      )}
      <div className="flex flex-1 flex-col">{content}</div>
    </div>
  );
}
