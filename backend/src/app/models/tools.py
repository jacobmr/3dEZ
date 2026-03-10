"""Claude tool-use definitions for 3dEZ.

Each entry follows the Anthropic tool format:
  { "name": str, "description": str, "input_schema": <JSON Schema> }

Keep the ``extract_design_parameters`` input_schema in sync with
:pymod:`app.models.designs.DesignParamsUnion`.
"""

from __future__ import annotations

DESIGN_TOOLS: list[dict] = [
    {
        "name": "extract_design_parameters",
        "description": (
            "Extract structured design parameters from the user's description. "
            "Choose the correct category and fill in all dimensions and features "
            "mentioned. Use sensible defaults for anything not explicitly stated."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["mounting_bracket", "enclosure", "organizer"],
                    "description": "Design category",
                },
                "units": {
                    "type": "string",
                    "enum": ["mm", "in"],
                    "default": "mm",
                    "description": "Measurement unit system",
                },
                "notes": {
                    "type": "string",
                    "default": "",
                    "description": "Free-form user notes",
                },
                # -- mounting_bracket fields --
                "width": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Overall width (mounting_bracket, organizer)",
                },
                "height": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Overall height (mounting_bracket, organizer)",
                },
                "depth": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Overall depth / projection (mounting_bracket, organizer)",
                },
                "thickness": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "default": 3.0,
                    "description": "Material thickness (mounting_bracket)",
                },
                "hole_diameter": {
                    "type": "number",
                    "minimum": 0,
                    "default": 4.5,
                    "description": "Mounting-hole diameter (0 = no holes) (mounting_bracket)",
                },
                "hole_count": {
                    "type": "integer",
                    "minimum": 0,
                    "default": 2,
                    "description": "Number of mounting holes (mounting_bracket)",
                },
                "lip_height": {
                    "type": "number",
                    "minimum": 0,
                    "default": 5.0,
                    "description": "Height of retaining lip (mounting_bracket)",
                },
                # -- enclosure fields --
                "inner_width": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Interior width (enclosure)",
                },
                "inner_height": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Interior height (enclosure)",
                },
                "inner_depth": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "description": "Interior depth (enclosure)",
                },
                "wall_thickness": {
                    "type": "number",
                    "exclusiveMinimum": 0,
                    "default": 2.0,
                    "description": "Wall thickness (enclosure, organizer — default 2.0 for enclosure, 1.5 for organizer)",
                },
                "lid_type": {
                    "type": "string",
                    "enum": ["snap", "slide", "screw", "none"],
                    "default": "snap",
                    "description": "Lid attachment method (enclosure)",
                },
                "ventilation_slots": {
                    "type": "boolean",
                    "default": False,
                    "description": "Add ventilation slot pattern (enclosure)",
                },
                "cable_hole_diameter": {
                    "type": "number",
                    "minimum": 0,
                    "default": 0.0,
                    "description": "Cable pass-through hole diameter (0 = none) (enclosure)",
                },
                "corner_radius": {
                    "type": "number",
                    "minimum": 0,
                    "default": 2.0,
                    "description": "Fillet radius on vertical edges (enclosure)",
                },
                # -- organizer fields --
                "compartments_x": {
                    "type": "integer",
                    "minimum": 1,
                    "default": 1,
                    "description": "Grid columns (organizer)",
                },
                "compartments_y": {
                    "type": "integer",
                    "minimum": 1,
                    "default": 1,
                    "description": "Grid rows (organizer)",
                },
                "has_labels": {
                    "type": "boolean",
                    "default": False,
                    "description": "Emboss label areas on compartments (organizer)",
                },
                "stackable": {
                    "type": "boolean",
                    "default": False,
                    "description": "Add stacking alignment features (organizer)",
                },
            },
            "required": ["category"],
        },
    },
    {
        "name": "analyze_photo",
        "description": (
            "Analyze a user's uploaded photo to extract physical context for "
            "3D design. Call this when the user uploads a photo of where their "
            "design will be used."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "environment": {
                    "type": "string",
                    "description": (
                        "Type of environment (e.g., 'desk setup', 'workshop wall', "
                        "'kitchen cabinet', 'garage shelf')"
                    ),
                },
                "surface_material": {
                    "type": "string",
                    "description": (
                        "Material of mounting/placement surface (e.g., 'drywall', "
                        "'wood', 'metal', 'tile')"
                    ),
                },
                "reference_objects": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": (
                                    "Object name (e.g., 'US wall outlet', "
                                    "'USB-A port', 'M4 screw')"
                                ),
                            },
                            "known_dimension_mm": {
                                "type": "number",
                                "description": "Known real-world dimension in mm",
                            },
                            "dimension_type": {
                                "type": "string",
                                "enum": ["width", "height", "diameter"],
                            },
                        },
                        "required": ["name", "known_dimension_mm", "dimension_type"],
                    },
                    "description": "Objects with known dimensions visible in the photo",
                },
                "nearby_objects": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": (
                        "Other objects visible that provide context "
                        "(e.g., 'monitor', 'keyboard', 'power strip')"
                    ),
                },
                "suggested_constraints": {
                    "type": "string",
                    "description": (
                        "Spatial constraints inferred from the photo "
                        "(e.g., 'must fit between outlet and shelf edge, "
                        "roughly 80mm gap')"
                    ),
                },
            },
            "required": ["environment", "reference_objects"],
        },
    },
    {
        "name": "infer_dimensions",
        "description": (
            "After analyzing a photo, use identified reference objects to "
            "estimate dimensions of the target area or object. Call this after "
            "analyze_photo when you can estimate dimensions from reference objects."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reference_used": {
                    "type": "string",
                    "description": (
                        "Which reference object was used for calibration "
                        "(e.g., 'US wall outlet - 70mm wide')"
                    ),
                },
                "estimated_dimensions": {
                    "type": "object",
                    "properties": {
                        "width_mm": {
                            "type": "number",
                            "description": "Estimated width in mm",
                        },
                        "height_mm": {
                            "type": "number",
                            "description": "Estimated height in mm",
                        },
                        "depth_mm": {
                            "type": "number",
                            "description": "Estimated depth in mm (if determinable)",
                        },
                    },
                    "required": ["width_mm", "height_mm"],
                },
                "confidence": {
                    "type": "string",
                    "enum": ["high", "medium", "low"],
                    "description": (
                        "Confidence in estimate based on reference quality "
                        "and distance"
                    ),
                },
                "notes": {
                    "type": "string",
                    "description": (
                        "Explanation of how dimensions were estimated, "
                        "any caveats"
                    ),
                },
            },
            "required": [
                "reference_used",
                "estimated_dimensions",
                "confidence",
                "notes",
            ],
        },
    },
    {
        "name": "request_clarification",
        "description": (
            "Ask the user a clarifying question when a required design "
            "parameter is ambiguous or missing."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "The clarifying question to present to the user",
                },
                "options": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of suggested answers",
                },
                "parameter_name": {
                    "type": "string",
                    "description": "The parameter this question aims to resolve",
                },
            },
            "required": ["question", "parameter_name"],
        },
    },
]
