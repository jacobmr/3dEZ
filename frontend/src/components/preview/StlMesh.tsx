"use client";

import { useMemo, useEffect } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { BufferGeometry } from "three";

type Vec3 = [number, number, number];

export interface MeshBounds {
  min: Vec3;
  max: Vec3;
}

interface StlMeshProps {
  stlBytes: ArrayBuffer;
  /** Called after geometry is parsed with the (centered) bounding box. */
  onBoundsComputed?: (bounds: MeshBounds) => void;
}

export default function StlMesh({ stlBytes, onBoundsComputed }: StlMeshProps) {
  const geometry: BufferGeometry = useMemo(() => {
    const loader = new STLLoader();
    const geom = loader.parse(stlBytes);
    geom.computeBoundingBox();
    geom.center();
    // Recompute after centering so the box is origin-relative
    geom.computeBoundingBox();
    geom.computeVertexNormals();
    return geom;
  }, [stlBytes]);

  // Report bounding box to parent whenever geometry changes
  useEffect(() => {
    if (onBoundsComputed && geometry.boundingBox) {
      const bb = geometry.boundingBox;
      onBoundsComputed({
        min: [bb.min.x, bb.min.y, bb.min.z],
        max: [bb.max.x, bb.max.y, bb.max.z],
      });
    }
  }, [geometry, onBoundsComputed]);

  // Dispose geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#8899aa" metalness={0.3} roughness={0.6} />
    </mesh>
  );
}
