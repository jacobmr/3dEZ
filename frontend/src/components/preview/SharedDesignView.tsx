"use client";

import { useEffect, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import StlViewer from "./StlViewer";
import { getSharedDesign, generateStl } from "@/lib/api";
import type { SharedDesignData } from "@/lib/api";

interface SharedDesignViewProps {
  token: string;
}

export default function SharedDesignView({ token }: SharedDesignViewProps) {
  const [design, setDesign] = useState<SharedDesignData | null>(null);
  const [stlBytes, setStlBytes] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSharedDesign(token);
        setDesign(data);

        // Try to generate STL for preview
        try {
          const bytes = await generateStl(data.category, data.parameters);
          setStlBytes(bytes);
        } catch {
          // STL generation may not be available outside Docker
        }
      } catch {
        setError("This shared design was not found or the link has expired.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  function handleDownload() {
    if (!stlBytes || !design) return;
    const cat = design.category.replace(/\s+/g, "_");
    const ver = design.version > 0 ? `_v${design.version}` : "";
    const filename = `${cat}${ver}.stl`;
    const blob = new Blob([stlBytes], { type: "model/stl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-zinc-600 dark:border-t-zinc-300" />
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Loading shared design&hellip;
          </p>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-3xl text-red-400">&#9888;</div>
          <p className="text-sm text-red-300">{error ?? "Design not found"}</p>
          <a
            href="/"
            className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Go to 3dEZ
          </a>
        </div>
      </div>
    );
  }

  const displayName =
    design.name ?? `${design.category.replace(/_/g, " ")} v${design.version}`;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-900">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center justify-between bg-gray-900 px-4 text-white">
        <a href="/" className="text-lg font-bold tracking-tight">
          3dEZ
        </a>
        <span className="text-xs text-gray-400">Shared Design</span>
      </header>

      {/* Design info bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-gray-800 capitalize dark:text-zinc-100">
            {displayName}
          </h1>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">
            {design.category.replace(/_/g, " ")}
          </span>
          {design.version > 1 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              v{design.version}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stlBytes && (
            <button
              onClick={handleDownload}
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

      {/* 3D Preview */}
      <div className="flex flex-1">
        {stlBytes ? (
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-zinc-600 dark:border-t-zinc-300" />
              </div>
            }
          >
            <Canvas
              frameloop="demand"
              camera={{ position: [0, 0, 100], fov: 50 }}
              gl={{ antialias: true }}
              className="flex-1"
            >
              <StlViewer
                stlBytes={stlBytes}
                category={design.category}
                params={design.parameters}
              />
            </Canvas>
          </Suspense>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center text-gray-400 dark:text-zinc-500">
            <div>
              <div className="mb-2 text-3xl">&#9651;</div>
              <p className="text-sm">
                3D preview requires the generation service
              </p>
              <p className="mt-1 text-xs text-gray-300 dark:text-zinc-600">
                Parameters:{" "}
                {JSON.stringify(design.parameters, null, 2).slice(0, 200)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
