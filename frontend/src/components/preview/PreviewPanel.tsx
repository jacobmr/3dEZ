"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import StlViewer from "./StlViewer";

interface PreviewPanelProps {
  stlBytes: ArrayBuffer | null;
  isLoading: boolean;
  error: string | null;
}

function LoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
        <p className="text-sm">Generating model&hellip;</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className="text-2xl text-red-400">&#9888;</div>
        <p className="text-sm text-red-300">{message}</p>
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
}: PreviewPanelProps) {
  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingSpinner />;
  } else if (error) {
    content = <ErrorState message={error} />;
  } else if (!stlBytes) {
    content = <EmptyState />;
  } else {
    content = (
      <Suspense fallback={<CanvasFallback />}>
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 100], fov: 50 }}
          gl={{ antialias: true }}
          className="flex-1"
        >
          <StlViewer stlBytes={stlBytes} />
        </Canvas>
      </Suspense>
    );
  }

  return (
    <div className="flex h-full flex-col border-t border-zinc-800 lg:border-l lg:border-t-0">
      <div className="border-b border-zinc-800 px-4 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Preview
        </span>
      </div>
      <div className="flex flex-1 flex-col">{content}</div>
    </div>
  );
}
