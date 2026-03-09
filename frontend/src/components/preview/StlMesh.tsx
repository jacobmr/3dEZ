"use client";

import { useMemo, useEffect } from "react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { BufferGeometry } from "three";

interface StlMeshProps {
  stlBytes: ArrayBuffer;
}

export default function StlMesh({ stlBytes }: StlMeshProps) {
  const geometry: BufferGeometry = useMemo(() => {
    const loader = new STLLoader();
    const geom = loader.parse(stlBytes);
    geom.computeBoundingBox();
    geom.center();
    geom.computeVertexNormals();
    return geom;
  }, [stlBytes]);

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
