"use client";

import { useMemo } from "react";
import { Line, Text, Billboard } from "@react-three/drei";
import type { Vector3 as FiberVector3 } from "@react-three/fiber";

type Vec3 = [number, number, number];

interface DimensionLineProps {
  /** World-space start point of the dimension. */
  start: Vec3;
  /** World-space end point of the dimension. */
  end: Vec3;
  /** Text to display at the midpoint (e.g. "50 mm"). */
  label: string;
  /** Line / label colour (default "#ffcc00"). */
  color?: string;
}

/** Length of tick marks at each end of the dimension line. */
const TICK_LEN = 1.5;
/** Line width in pixels. */
const LINE_WIDTH = 1.5;
/** Extension-line width in pixels. */
const EXT_LINE_WIDTH = 1;
/** Label font size. */
const FONT_SIZE = 2.5;

/**
 * Compute a perpendicular direction for tick marks.
 *
 * Picks the cross product of the line direction with a world axis that is
 * least parallel to the line, ensuring the perpendicular is never degenerate.
 */
function perpendicular(start: Vec3, end: Vec3): Vec3 {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len === 0) return [0, 1, 0];

  const dir: Vec3 = [dx / len, dy / len, dz / len];

  // Choose the world axis least aligned with the line direction
  const absX = Math.abs(dir[0]);
  const absY = Math.abs(dir[1]);
  const absZ = Math.abs(dir[2]);

  let up: Vec3;
  if (absX <= absY && absX <= absZ) {
    up = [1, 0, 0];
  } else if (absY <= absZ) {
    up = [0, 1, 0];
  } else {
    up = [0, 0, 1];
  }

  // Cross product: dir x up
  const cx = dir[1] * up[2] - dir[2] * up[1];
  const cy = dir[2] * up[0] - dir[0] * up[2];
  const cz = dir[0] * up[1] - dir[1] * up[0];
  const cLen = Math.sqrt(cx * cx + cy * cy + cz * cz);
  if (cLen === 0) return [0, 1, 0];

  return [cx / cLen, cy / cLen, cz / cLen];
}

/**
 * A single CAD-style dimension annotation.
 *
 * Draws a line between two 3D points with perpendicular tick marks at each
 * end and a camera-facing label at the midpoint.
 */
export default function DimensionLine({
  start,
  end,
  label,
  color = "#ffcc00",
}: DimensionLineProps) {
  const { midpoint, tickStartA, tickStartB, tickEndA, tickEndB } =
    useMemo(() => {
      const mid: Vec3 = [
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2,
        (start[2] + end[2]) / 2,
      ];

      const perp = perpendicular(start, end);
      const half = TICK_LEN / 2;

      return {
        midpoint: mid,
        tickStartA: [
          start[0] + perp[0] * half,
          start[1] + perp[1] * half,
          start[2] + perp[2] * half,
        ] as Vec3,
        tickStartB: [
          start[0] - perp[0] * half,
          start[1] - perp[1] * half,
          start[2] - perp[2] * half,
        ] as Vec3,
        tickEndA: [
          end[0] + perp[0] * half,
          end[1] + perp[1] * half,
          end[2] + perp[2] * half,
        ] as Vec3,
        tickEndB: [
          end[0] - perp[0] * half,
          end[1] - perp[1] * half,
          end[2] - perp[2] * half,
        ] as Vec3,
      };
    }, [start, end]);

  const mainPoints: FiberVector3[] = [start, end];
  const tickStartPoints: FiberVector3[] = [tickStartA, tickStartB];
  const tickEndPoints: FiberVector3[] = [tickEndA, tickEndB];

  return (
    <group>
      {/* Main dimension line */}
      <Line points={mainPoints} color={color} lineWidth={LINE_WIDTH} />

      {/* Tick marks at start */}
      <Line points={tickStartPoints} color={color} lineWidth={EXT_LINE_WIDTH} />

      {/* Tick marks at end */}
      <Line points={tickEndPoints} color={color} lineWidth={EXT_LINE_WIDTH} />

      {/* Label at midpoint — always faces camera */}
      <Billboard position={midpoint}>
        <Text
          fontSize={FONT_SIZE}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.15}
          outlineColor="#000000"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}
