"""Evaluate a flat CsgTree into a build123d Part using algebra-mode CSG."""

from __future__ import annotations

from app.models.designs import BoxDims, CsgTree, CylinderDims, SphereDims


def evaluate_csg_tree(tree: CsgTree):
    """Process an ordered list of CSG primitives into a single solid.

    Parts are applied left-to-right: ``union`` adds material,
    ``difference`` subtracts.  The first part is always treated as
    the base body (union).
    """
    import build123d as bd

    result = None
    for part in tree.parts:
        if isinstance(part.dims, BoxDims):
            solid = bd.Box(part.dims.width, part.dims.height, part.dims.depth)
        elif isinstance(part.dims, CylinderDims):
            solid = bd.Cylinder(part.dims.radius, part.dims.height)
        else:  # SphereDims
            solid = bd.Sphere(part.dims.radius)

        if part.fillet_radius > 0:
            try:
                solid = bd.fillet(solid.edges(), part.fillet_radius)
            except Exception:
                pass  # skip fillet if geometry rejects it

        loc = bd.Location(
            (part.pos_x, part.pos_y, part.pos_z),
            (part.rot_x, part.rot_y, part.rot_z),
        )
        solid = solid.moved(loc)

        if result is None:
            result = solid
        elif part.operation == "union":
            result = result + solid
        else:
            result = result - solid

    # Ensure result is a Part, not a ShapeList
    # Boolean operations can return ShapeList, so wrap if needed
    if result is not None and not isinstance(result, bd.Part):
        result = bd.Part(result)

    return result
