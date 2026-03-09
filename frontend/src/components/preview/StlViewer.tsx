"use client";

import { OrbitControls, ContactShadows } from "@react-three/drei";
import StlMesh from "./StlMesh";

interface StlViewerProps {
  stlBytes: ArrayBuffer;
}

/**
 * R3F scene contents — renders inside a Canvas.
 * Composes the STL mesh with three-point lighting, orbit controls,
 * and subtle contact shadows on the ground plane.
 */
export default function StlViewer({ stlBytes }: StlViewerProps) {
  return (
    <>
      <StlMesh stlBytes={stlBytes} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, 2]} intensity={0.3} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.25}
        blur={1.5}
        far={10}
      />
    </>
  );
}
