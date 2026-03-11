/**
 * Design parameter type definitions for 3dEZ.
 *
 * TypeScript mirrors of backend/src/app/models/designs.py.
 * Keep both files in sync.
 */

/** Supported design categories. */
export type DesignCategory =
  | "mounting_bracket"
  | "enclosure"
  | "organizer"
  | "csg_primitive";

/** Fields common to every design category. */
export interface BaseDesignParams {
  category: DesignCategory;
  units?: "mm" | "in";
  notes?: string;
}

/** Parameters for an L/U-shaped mounting bracket. */
export interface MountingBracketParams extends BaseDesignParams {
  category: "mounting_bracket";
  width: number;
  height: number;
  depth: number;
  thickness?: number;
  hole_diameter?: number;
  hole_count?: number;
  lip_height?: number;
}

/** Parameters for a box / enclosure with optional lid. */
export interface EnclosureParams extends BaseDesignParams {
  category: "enclosure";
  inner_width: number;
  inner_height: number;
  inner_depth: number;
  wall_thickness?: number;
  lid_type?: "snap" | "slide" | "screw" | "none";
  ventilation_slots?: boolean;
  cable_hole_diameter?: number;
  corner_radius?: number;
}

/** Parameters for a grid-style desk / drawer organizer. */
export interface OrganizerParams extends BaseDesignParams {
  category: "organizer";
  width: number;
  height: number;
  depth: number;
  compartments_x?: number;
  compartments_y?: number;
  wall_thickness?: number;
  has_labels?: boolean;
  stackable?: boolean;
}

/** A single primitive in a CSG assembly. */
export interface CsgPart {
  label: string;
  dims:
    | { shape: "box"; width: number; height: number; depth: number }
    | { shape: "cylinder"; radius: number; height: number }
    | { shape: "sphere"; radius: number };
  pos_x?: number;
  pos_y?: number;
  pos_z?: number;
  rot_x?: number;
  rot_y?: number;
  rot_z?: number;
  operation?: "union" | "difference";
  fillet_radius?: number;
}

/** Flat ordered list of CSG primitives. */
export interface CsgTree {
  name?: string;
  parts: CsgPart[];
}

/** Parameters for a composable CSG primitive design. */
export interface CsgPrimitiveParams extends BaseDesignParams {
  category: "csg_primitive";
  tree: CsgTree;
}

/** Discriminated union of all design parameter types. */
export type DesignParams =
  | MountingBracketParams
  | EnclosureParams
  | OrganizerParams
  | CsgPrimitiveParams;
