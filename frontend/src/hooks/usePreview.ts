"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateStl } from "@/lib/api";
import type { DesignParams } from "@shared/api-types";

interface UsePreviewInput {
  params: DesignParams;
  id: string;
}

interface UsePreviewResult {
  stlBytes: ArrayBuffer | null;
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
}

/**
 * Manage STL preview generation tied to the current design.
 *
 * When `design` changes (compared by serialised params), triggers an API call
 * to generate the STL.  Exposes loading / error state and a manual retry.
 */
export function usePreview(design: UsePreviewInput | null): UsePreviewResult {
  const [stlBytes, setStlBytes] = useState<ArrayBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialise params for change detection
  const paramsKey = design ? JSON.stringify(design.params) : null;

  // Track the latest request so stale responses are discarded
  const requestRef = useRef(0);

  const generate = useCallback(
    async (d: UsePreviewInput) => {
      const requestId = ++requestRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const bytes = await generateStl(
          d.params.category,
          d.params as unknown as Record<string, unknown>,
        );

        // Only apply if this is still the latest request
        if (requestId === requestRef.current) {
          setStlBytes(bytes);
        }
      } catch (err) {
        if (requestId === requestRef.current) {
          setError(
            err instanceof Error ? err.message : "STL generation failed",
          );
        }
      } finally {
        if (requestId === requestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [], // generateStl is a module-level import, stable reference
  );

  // Trigger generation when design params change
  useEffect(() => {
    if (!design) {
      setStlBytes(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    generate(design);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]); // intentionally keyed on serialised params, not object ref

  const regenerate = useCallback(() => {
    if (design) {
      generate(design);
    }
  }, [design, generate]);

  return { stlBytes, isLoading, error, regenerate };
}
