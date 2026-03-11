"use client";

import { useState, useCallback } from "react";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import StlMesh from "./StlMesh";
import type { MeshBounds } from "./StlMesh";
import DimensionOverlay from "./DimensionOverlay";

interface StlViewerProps {
  stlBytes: ArrayBuffer;
  /** Design category (e.g. "mounting_bracket"). */
  category?: string;
  /** Design parameters — passed to DimensionOverlay. */
  params?: Record<string, unknown>;
}

/**
 * R3F scene contents — renders inside a Canvas.
 * Composes the STL mesh with three-point lighting, orbit controls,
 * contact shadows, and optional dimension annotations.
 */
export default function StlViewer({
  stlBytes,
  category,
  params,
}: StlViewerProps) {
  const [bounds, setBounds] = useState<MeshBounds | null>(null);

  const handleBoundsComputed = useCallback((b: MeshBounds) => {
    setBounds(b);
  }, []);

  const showDimensions = bounds !== null && category != null && params != null;

  return (
    <>
      <StlMesh stlBytes={stlBytes} onBoundsComputed={handleBoundsComputed} />

      {showDimensions && (
        <DimensionOverlay
          category={category}
          params={params}
          boundingBox={bounds}
        />
      )}

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, 2]} intensity={0.3} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        touchAction="none"
        rotateSpeed={0.7}
        panSpeed={0.8}
        zoomSpeed={0.8}
      />
      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.25}
        blur={1.5}
        far={10}
      />
    </>
  );
}
