/**
 * Design parameter type definitions for 3dEZ.
 *
 * TypeScript mirrors of backend/src/app/models/designs.py.
 * Keep both files in sync.
 */

/** Supported design categories. */
export type DesignCategory = "mounting_bracket" | "enclosure" | "organizer";

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

/** Discriminated union of all design parameter types. */
export type DesignParams =
  | MountingBracketParams
  | EnclosureParams
  | OrganizerParams;
