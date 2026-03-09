"use client";

import DimensionLine from "./DimensionLine";

type Vec3 = [number, number, number];

interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

interface DimensionOverlayProps {
  /** Design category (e.g. "mounting_bracket", "enclosure"). */
  category: string;
  /** Design parameters — only numeric dimension keys are used. */
  params: Record<string, unknown>;
  /** Axis-aligned bounding box of the mesh geometry. */
  boundingBox: BoundingBox;
}

/** Fraction of bounding-box size used to offset dimension lines from the mesh. */
const OFFSET_FACTOR = 0.1;

/**
 * Resolve a dimension value from param keys that vary by category.
 *
 * For example "width" maps to "width" for brackets/organizers but
 * "inner_width" for enclosures.
 */
function resolveDimension(
  params: Record<string, unknown>,
  ...keys: string[]
): number | null {
  for (const k of keys) {
    const v = params[k];
    if (typeof v === "number" && v > 0) return v;
  }
  return null;
}

/**
 * Format a numeric dimension as a label string (e.g. "42 mm").
 */
function formatLabel(value: number, units: string): string {
  // Show integer if whole, otherwise one decimal
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted} ${units}`;
}

/**
 * Renders dimension lines for width, height, depth, and wall_thickness
 * based on the model's bounding box and the provided design parameters.
 *
 * Dimension lines are offset slightly beyond the bounding box so they
 * don't overlap the mesh surface.
 */
export default function DimensionOverlay({
  params,
  boundingBox,
}: DimensionOverlayProps) {
  const { min, max } = boundingBox;
  const units = typeof params.units === "string" ? params.units : "mm";

  // Compute offsets for each axis
  const xSize = max[0] - min[0];
  const ySize = max[1] - min[1];
  const zSize = max[2] - min[2];

  const xOffset = Math.max(xSize * OFFSET_FACTOR, 1);
  const yOffset = Math.max(ySize * OFFSET_FACTOR, 1);
  const zOffset = Math.max(zSize * OFFSET_FACTOR, 1);

  const width = resolveDimension(params, "width", "inner_width");
  const height = resolveDimension(params, "height", "inner_height");
  const depth = resolveDimension(params, "depth", "inner_depth");
  const wallThickness = resolveDimension(params, "wall_thickness", "thickness");

  const lines: React.ReactNode[] = [];

  // Width — along X axis, offset below the model (negative Y)
  if (width !== null) {
    const y = min[1] - yOffset;
    const z = min[2];
    lines.push(
      <DimensionLine
        key="width"
        start={[min[0], y, z]}
        end={[max[0], y, z]}
        label={formatLabel(width, units)}
        color="#ffcc00"
      />,
    );
  }

  // Height — along Y axis, offset to the right (positive X)
  if (height !== null) {
    const x = max[0] + xOffset;
    const z = min[2];
    lines.push(
      <DimensionLine
        key="height"
        start={[x, min[1], z]}
        end={[x, max[1], z]}
        label={formatLabel(height, units)}
        color="#00ccff"
      />,
    );
  }

  // Depth — along Z axis, offset below the model (negative Y)
  if (depth !== null) {
    const x = min[0];
    const y = min[1] - yOffset;
    lines.push(
      <DimensionLine
        key="depth"
        start={[x, y, min[2]]}
        end={[x, y, max[2]]}
        label={formatLabel(depth, units)}
        color="#ff6644"
      />,
    );
  }

  // Wall thickness — short line along X at the top-front edge
  if (wallThickness !== null) {
    const y = max[1] + yOffset;
    const z = max[2];
    lines.push(
      <DimensionLine
        key="wall_thickness"
        start={[min[0], y, z]}
        end={[min[0] + wallThickness, y, z]}
        label={formatLabel(wallThickness, units)}
        color="#88ff88"
      />,
    );
  }

  if (lines.length === 0) return null;

  return <group>{lines}</group>;
}
