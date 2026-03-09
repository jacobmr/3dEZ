# Phase 4: 3D Preview - Research

**Researched:** 2026-03-09
**Domain:** Three.js STL rendering with React Three Fiber, dimension overlays, mobile WebGL
**Confidence:** HIGH

<research_summary>

## Summary

Researched the Three.js ecosystem for building an interactive STL viewer with dimension annotations in a React/Next.js app. The project already has Three.js 0.183.2, React Three Fiber 9.5.0, and drei 10.7.7 installed — no new core dependencies needed.

The standard approach uses R3F's `useLoader(STLLoader, url)` to load binary STL from the backend, drei's `OrbitControls` for camera interaction, and drei's `Html` + `Line` + `Text` components for dimension overlays. Dimension annotations are built as custom R3F components — no mature npm package exists for CAD-style dimension lines in R3F, but the building blocks (Line, Text, Billboard) are solid.

**Primary recommendation:** Use R3F + drei exclusively (already installed). Load STL via `useLoader`, build custom `<DimensionLine>` component with drei `Line` + `Text` + `Billboard`. Use `frameloop="demand"` for battery savings on mobile. Skip react-stl-viewer (outdated, less flexible than custom R3F).
</research_summary>

<standard_stack>

## Standard Stack

### Core (Already Installed)

| Library            | Version | Purpose                     | Why Standard                          |
| ------------------ | ------- | --------------------------- | ------------------------------------- |
| three              | 0.183.2 | 3D rendering engine         | Industry standard for web 3D          |
| @react-three/fiber | 9.5.0   | React renderer for Three.js | Declarative 3D, component model       |
| @react-three/drei  | 10.7.7  | Helpers and abstractions    | OrbitControls, Html, Line, Text, etc. |
| @types/three       | 0.183.1 | TypeScript types            | Type safety for Three.js              |

### Supporting (No New Dependencies Needed)

| Library                              | Version              | Purpose                | When to Use                      |
| ------------------------------------ | -------------------- | ---------------------- | -------------------------------- |
| three/examples/jsm/loaders/STLLoader | (bundled with three) | STL file loading       | Loading backend-generated STL    |
| drei Text                            | (bundled with drei)  | SDF text rendering     | Dimension labels on 3D model     |
| drei Line                            | (bundled with drei)  | Line2 rendering        | Dimension line segments          |
| drei Html                            | (bundled with drei)  | DOM overlay on 3D      | Tooltips, info panels            |
| drei Billboard                       | (bundled with drei)  | Camera-facing elements | Dimension labels always readable |
| drei OrbitControls                   | (bundled with drei)  | Camera interaction     | Orbit, zoom, pan                 |
| drei Edges                           | (bundled with drei)  | Edge highlighting      | Wireframe-style edge display     |

### Alternatives Considered

| Instead of             | Could Use                  | Tradeoff                                                                                                          |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Custom R3F STL viewer  | react-stl-viewer (npm)     | react-stl-viewer is outdated (last release Jan 2024), less flexible, limited customization for dimension overlays |
| drei OrbitControls     | drei CameraControls        | CameraControls has more features (transitions, truck) but OrbitControls is simpler and sufficient for STL viewing |
| drei Text (SDF)        | drei Text3D                | Text3D is heavier (requires font JSON), SDF Text is crisp at any zoom and lighter                                 |
| Custom dimension lines | threejs-dimensioning-arrow | Specialized shader approach, but low maintenance and not R3F-native                                               |

**Installation:**

```bash
# No new packages needed — all already installed
# Three.js STLLoader is accessed via:
# import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
```

</standard_stack>

<architecture_patterns>

## Architecture Patterns

### Recommended Component Structure

```
frontend/src/components/preview/
├── PreviewPanel.tsx         # Container: Canvas + loading/error states
├── StlViewer.tsx            # R3F scene: mesh + lights + controls
├── StlMesh.tsx              # STL loading + material + auto-centering
├── DimensionOverlay.tsx     # All dimension annotations for a model
├── DimensionLine.tsx        # Single dimension line (arrow + label)
└── ViewerControls.tsx       # OrbitControls + zoom-to-fit + reset
```

### Pattern 1: STL Loading with useLoader

**What:** Use R3F's `useLoader` hook with Three.js STLLoader to load binary STL from a URL/blob
**When to use:** Every time the backend generates a new STL
**Example:**

```typescript
// Source: R3F docs + Three.js STLLoader docs
import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'

function StlMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)

  // Auto-center: compute bounding box, shift to origin
  geometry.computeBoundingBox()
  geometry.center()

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#8899aa" metalness={0.3} roughness={0.6} />
    </mesh>
  )
}
```

### Pattern 2: Loading STL from Binary Blob (not URL)

**What:** Our backend returns binary STL bytes via POST — can't use useLoader directly with a URL
**When to use:** When STL is fetched via POST request (our case)
**Example:**

```typescript
// Parse STL bytes into geometry without useLoader
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { useMemo } from 'react'
import * as THREE from 'three'

function StlMesh({ stlBytes }: { stlBytes: ArrayBuffer }) {
  const geometry = useMemo(() => {
    const loader = new STLLoader()
    const geom = loader.parse(stlBytes)
    geom.computeBoundingBox()
    geom.center()
    // Compute normals for lighting
    geom.computeVertexNormals()
    return geom
  }, [stlBytes])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#8899aa" metalness={0.3} roughness={0.6} />
    </mesh>
  )
}
```

### Pattern 3: Dimension Overlay with drei Line + Text + Billboard

**What:** Custom component rendering CAD-style dimension lines (two arrows + extension lines + measurement label)
**When to use:** Displaying width, height, depth measurements on the 3D model
**Example:**

```typescript
// Source: drei Line + Text + Billboard docs
import { Line, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'

interface DimensionLineProps {
  start: [number, number, number]
  end: [number, number, number]
  label: string
  offset?: number  // distance from model surface
  color?: string
}

function DimensionLine({ start, end, label, offset = 5, color = '#333' }: DimensionLineProps) {
  // Compute midpoint for label placement
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ]

  return (
    <group>
      {/* Main dimension line */}
      <Line points={[start, end]} color={color} lineWidth={1.5} />

      {/* Extension lines (perpendicular ticks at ends) */}
      {/* ... tick marks at start/end ... */}

      {/* Label at midpoint, always faces camera */}
      <Billboard position={mid}>
        <Text
          fontSize={0.15}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="white"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  )
}
```

### Pattern 4: On-Demand Rendering for Mobile Performance

**What:** Only re-render when something changes, not 60fps continuous
**When to use:** Static STL viewer (model doesn't animate)
**Example:**

```typescript
// Source: R3F scaling-performance docs
import { Canvas } from '@react-three/fiber'

function PreviewPanel({ stlBytes }: { stlBytes: ArrayBuffer | null }) {
  return (
    <Canvas
      frameloop="demand"  // Only render when invalidated
      camera={{ position: [0, 0, 100], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
    >
      {/* OrbitControls auto-invalidates on interaction */}
      <OrbitControls makeDefault />
      {stlBytes && <StlMesh stlBytes={stlBytes} />}
    </Canvas>
  )
}
```

### Pattern 5: Auto-Fit Camera to Model Bounds

**What:** After loading STL, adjust camera to frame the entire model
**When to use:** Every time a new STL loads
**Example:**

```typescript
// Source: drei docs + Three.js Box3 API
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

function useFitToView(geometry: THREE.BufferGeometry) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.5;
    camera.position.set(distance, distance * 0.5, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [geometry, camera, invalidate]);
}
```

### Anti-Patterns to Avoid

- **Creating STLLoader instance every render:** Parse once in useMemo, not in render body
- **Using continuous frameloop for static model:** Wastes battery on mobile; use `frameloop="demand"`
- **Dimension overlays as HTML positioned with CSS:** Use drei Html/Billboard to keep 3D-aligned
- **Loading STL as file URL when we have binary bytes:** Use `loader.parse(arrayBuffer)` instead
- **Not computing vertex normals:** STL files may lack normals; always call `geometry.computeVertexNormals()` for correct lighting
- **Not centering geometry:** STL origin varies; always `geometry.center()` after loading
  </architecture_patterns>

<dont_hand_roll>

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                        | Don't Build                          | Use Instead                          | Why                                                                     |
| ------------------------------ | ------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------- |
| Camera orbit/zoom/pan          | Custom mouse handlers + matrix math  | drei `OrbitControls`                 | Touch support, damping, zoom limits, mobile gestures — all handled      |
| STL file parsing               | Custom binary parser                 | Three.js `STLLoader.parse()`         | Handles both ASCII and binary STL, endianness, normals                  |
| Text rendering in 3D           | Canvas texture with text             | drei `Text` (SDF)                    | Crisp at any zoom level, handles fonts, outlines, no texture management |
| Camera-facing labels           | Manual quaternion rotation per frame | drei `Billboard`                     | Handles camera tracking automatically every frame                       |
| Line rendering with width      | THREE.Line (1px only)                | drei `Line` (Line2)                  | Supports `lineWidth` in pixels, vertex colors, segments                 |
| Loading state during STL fetch | Custom loading spinner logic         | React `Suspense` + useLoader         | Automatic suspension while loading, fallback components                 |
| Camera fit-to-model            | Manual FOV calculation               | drei `useBounds` or manual Box3 calc | useBounds handles animation, padding, auto-framing                      |

**Key insight:** R3F + drei already solves every sub-problem in this phase. The only truly custom component is `DimensionLine` (combining Line + Text + Billboard), and even that uses drei primitives. Don't wrap Three.js classes manually when R3F components exist.
</dont_hand_roll>

<common_pitfalls>

## Common Pitfalls

### Pitfall 1: STL Geometry Missing Normals

**What goes wrong:** Model appears black/unlit despite having lights in scene
**Why it happens:** Binary STL files from some generators omit per-vertex normals; Three.js STLLoader preserves them as-is
**How to avoid:** Always call `geometry.computeVertexNormals()` after loading
**Warning signs:** Mesh visible but completely dark or flat-shaded with harsh edges

### Pitfall 2: Canvas Sizing Issues in Next.js

**What goes wrong:** Canvas renders at 0 height or doesn't fill container
**Why it happens:** R3F Canvas tries to fill parent; if parent has no explicit height, it collapses
**How to avoid:** Ensure parent container has explicit height (`h-full`, `flex-1`, or explicit px/vh)
**Warning signs:** Canvas visible but tiny, or white space where preview should be

### Pitfall 3: Mobile WebGL Context Loss

**What goes wrong:** 3D preview goes blank on mobile after tab switch
**Why it happens:** Mobile browsers aggressively reclaim WebGL contexts
**How to avoid:** Listen for `webglcontextlost`/`webglcontextrestored` events; on restore, re-render
**Warning signs:** Preview works initially but goes blank after multitasking

### Pitfall 4: STL Loading from POST Response (Not URL)

**What goes wrong:** Can't use `useLoader(STLLoader, url)` because backend requires POST with parameters
**Why it happens:** useLoader is designed for GET requests to static URLs
**How to avoid:** Fetch STL bytes manually with `fetch()`, then use `STLLoader.parse(arrayBuffer)` in a useMemo. Pass bytes as props, not URL
**Warning signs:** Trying to create object URLs or data URIs as workarounds

### Pitfall 5: Dimension Labels Unreadable at Certain Zoom Levels

**What goes wrong:** Dimension text too small when zoomed out, too large when zoomed in
**Why it happens:** 3D text scales with scene; needs fixed screen-space size
**How to avoid:** Use drei `Html` for screen-space text, OR use `Text` with `Billboard` + a scale factor derived from camera distance. drei `Html` with `distanceFactor` prop handles this automatically
**Warning signs:** Text size changing dramatically during zoom

### Pitfall 6: OrbitControls Conflict with Page Scroll on Mobile

**What goes wrong:** Touch interactions on the 3D canvas prevent page scrolling
**Why it happens:** OrbitControls captures all touch events by default
**How to avoid:** Wrap Canvas in a container that explicitly handles touch-action CSS; consider `enableDamping` and `touches` configuration
**Warning signs:** User can't scroll past the 3D viewer on mobile
</common_pitfalls>

<code_examples>

## Code Examples

Verified patterns from official sources:

### Complete STL Viewer Component

```typescript
// Source: R3F Canvas docs + drei OrbitControls + Three.js STLLoader
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Suspense, useMemo, useEffect } from 'react'
import * as THREE from 'three'

interface StlViewerProps {
  stlBytes: ArrayBuffer
}

function Model({ stlBytes }: StlViewerProps) {
  const geometry = useMemo(() => {
    const loader = new STLLoader()
    const geom = loader.parse(stlBytes)
    geom.computeBoundingBox()
    geom.center()
    geom.computeVertexNormals()
    return geom
  }, [stlBytes])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#94a3b8"
        metalness={0.2}
        roughness={0.7}
      />
    </mesh>
  )
}

function StlViewer({ stlBytes }: StlViewerProps) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [80, 60, 80], fov: 50 }}
      gl={{ antialias: true }}
      shadows
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <Model stlBytes={stlBytes} />
      <ContactShadows position={[0, -0.5, 0]} opacity={0.3} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}
```

### Dimension Line Component

```typescript
// Source: drei Line + Text + Billboard docs
import { Line, Text, Billboard } from '@react-three/drei'

interface DimensionLineProps {
  start: THREE.Vector3Tuple
  end: THREE.Vector3Tuple
  label: string
  offset?: THREE.Vector3Tuple  // offset direction for extension lines
  color?: string
}

function DimensionLine({
  start, end, label,
  offset = [0, 0, 0],
  color = '#1e293b'
}: DimensionLineProps) {
  const offsetStart: THREE.Vector3Tuple = [
    start[0] + offset[0], start[1] + offset[1], start[2] + offset[2]
  ]
  const offsetEnd: THREE.Vector3Tuple = [
    end[0] + offset[0], end[1] + offset[1], end[2] + offset[2]
  ]
  const mid: THREE.Vector3Tuple = [
    (offsetStart[0] + offsetEnd[0]) / 2,
    (offsetStart[1] + offsetEnd[1]) / 2,
    (offsetStart[2] + offsetEnd[2]) / 2,
  ]

  return (
    <group>
      {/* Extension lines from model to dimension line */}
      <Line points={[start, offsetStart]} color={color} lineWidth={0.5} dashed />
      <Line points={[end, offsetEnd]} color={color} lineWidth={0.5} dashed />
      {/* Main dimension line */}
      <Line points={[offsetStart, offsetEnd]} color={color} lineWidth={1.5} />
      {/* Label */}
      <Billboard position={mid}>
        <Text
          fontSize={2}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="white"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  )
}
```

### Loading STL from Backend POST

```typescript
// Source: Standard fetch + STLLoader.parse pattern
async function fetchStl(
  category: string,
  parameters: Record<string, unknown>,
): Promise<ArrayBuffer> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, parameters }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "STL generation failed");
  }
  return response.arrayBuffer();
}
```

</code_examples>

<sota_updates>

## State of the Art (2025-2026)

| Old Approach            | Current Approach        | When Changed | Impact                                      |
| ----------------------- | ----------------------- | ------------ | ------------------------------------------- |
| Three.js r150           | Three.js r183 (0.183.2) | 2024-2025    | Better TypeScript, ESM modules, WebGPU prep |
| R3F v8                  | R3F v9.5.0              | 2024         | React 19 support, improved reconciler       |
| drei v9                 | drei v10.7.7            | 2024-2025    | New components, better performance          |
| Manual Line rendering   | drei Line (Line2)       | 2022+        | Pixel-width lines, better quality           |
| Canvas texture for text | drei Text (troika SDF)  | 2021+        | Crisp at any zoom, better performance       |

**New tools/patterns to consider:**

- **WebGPU renderer:** R3F 9+ has experimental WebGPU support, but NOT production-ready. Stick with WebGL for now
- **drei `useBounds`:** Helper for camera fit-to-model animation (replaces manual Box3 calculation)
- **`frameloop="demand"`:** On-demand rendering is mature and recommended for static viewers
- **React 19 + Suspense:** Better loading states with R3F's built-in Suspense support
- **drei `ContactShadows`:** Ground-plane soft shadows without shadow maps (cheaper on mobile)

**Deprecated/outdated:**

- **react-stl-viewer npm:** Last updated Jan 2024, uses older Three.js, doesn't support R3F scene composition
- **Manual raycasting for measurements:** Use drei's built-in interaction system instead
- **CSS3DRenderer for labels:** drei Html component handles this better with occlusion support
- **Continuous rendering for static models:** Use `frameloop="demand"` to save mobile battery
  </sota_updates>

<open_questions>

## Open Questions

1. **Dimension data format from backend**
   - What we know: Backend generates STL with parameters like width, height, depth
   - What's unclear: Whether dimension annotations should use bounding box auto-detection or receive explicit dimension metadata from the backend alongside the STL
   - Recommendation: Return dimension metadata alongside STL in the generate endpoint (e.g., `{ stl_bytes, dimensions: { width: 80, height: 50, depth: 30 } }`). Bounding box detection alone can't tell you which dimension is "width" vs "depth"

2. **Mobile touch interaction: scroll vs orbit**
   - What we know: OrbitControls captures touch events, potentially blocking page scroll
   - What's unclear: Best UX pattern for mobile — full-screen viewer with back button, or inline with touch-action management
   - Recommendation: On mobile, make the preview panel tap-to-expand to full screen with explicit close button. Avoids scroll conflicts entirely

3. **STL byte transfer efficiency**
   - What we know: Binary STL for typical parts is under 5MB
   - What's unclear: Whether to use Blob URL, ArrayBuffer directly, or consider WebSocket streaming for large models
   - Recommendation: ArrayBuffer via fetch is fine for <5MB STL. Add Content-Length header from backend for progress indicator
     </open_questions>

<sources>
## Sources

### Primary (HIGH confidence)

- /pmndrs/react-three-fiber (Context7) — Canvas setup, useLoader, performance scaling, frameloop
- /pmndrs/drei (Context7) — OrbitControls, Line, Text, Billboard, Html, Edges, ContactShadows
- /mrdoob/three.js (Context7) — STLLoader, STLLoader.parse(), STLLoader.loadAsync()
- [R3F Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) — On-demand rendering, instancing, LOD, PerformanceMonitor

### Secondary (MEDIUM confidence)

- [R3F Discussion #1267](https://github.com/pmndrs/react-three-fiber/discussions/1267) — STL loading with useLoader pattern, verified against Context7 docs
- [react-stl-viewer npm](https://www.npmjs.com/package/react-stl-viewer) — Evaluated and rejected (outdated, less flexible)
- [roomle/threejs-dimensioning-arrow](https://github.com/roomle/threejs-dimensioning-arrow) — Dimension arrow shader approach, informed custom component design
- [Codrops: Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) — Performance optimization patterns

### Tertiary (LOW confidence - needs validation)

- Mobile WebGL context loss handling — community patterns, needs testing on actual devices
- Dimension label sizing with distanceFactor — needs visual tuning during implementation
  </sources>

<metadata>
## Metadata

**Research scope:**

- Core technology: Three.js 0.183.2 + React Three Fiber 9.5.0 + drei 10.7.7
- Ecosystem: STLLoader, OrbitControls, Line, Text, Billboard, Html, ContactShadows
- Patterns: STL blob loading, dimension overlays, on-demand rendering, auto-fit camera
- Pitfalls: Missing normals, canvas sizing, mobile WebGL, POST-based STL loading, scroll conflicts

**Confidence breakdown:**

- Standard stack: HIGH — already installed, verified with Context7, widely used
- Architecture: HIGH — patterns from official R3F/drei docs, verified code examples
- Pitfalls: HIGH — documented in R3F discussions and Three.js forums
- Code examples: HIGH — from Context7/official sources, adapted for our binary STL use case

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days — R3F/drei ecosystem stable)
</metadata>

---

_Phase: 04-3d-preview_
_Research completed: 2026-03-09_
_Ready for planning: yes_
