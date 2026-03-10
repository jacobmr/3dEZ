"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import StlViewer from "./StlViewer";

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
}

function downloadStl(stlBytes: ArrayBuffer, category?: string) {
  const blob = new Blob([stlBytes], { type: "model/stl" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${category ?? "design"}.stl`;
  a.click();
  URL.revokeObjectURL(url);
}

function LoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
        <p className="text-sm">Generating 3D model&hellip;</p>
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
            className="rounded-md border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
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
    <div className="flex flex-1 items-center justify-center p-6 text-center text-zinc-500">
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
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
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
}: PreviewPanelProps) {
  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingSpinner />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={onRetry} />;
  } else if (!stlBytes) {
    content = <EmptyState />;
  } else {
    content = (
      <Suspense fallback={<CanvasFallback />}>
        <div className="flex flex-1 animate-fade-in">
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
      </Suspense>
    );
  }

  return (
    <div className="flex h-full flex-col border-t border-zinc-800 lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Preview
        </span>
        {stlBytes && (
          <button
            onClick={() => downloadStl(stlBytes, category)}
            className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            Download STL
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col">{content}</div>
    </div>
  );
}
