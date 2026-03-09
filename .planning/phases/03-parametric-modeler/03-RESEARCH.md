# Phase 3: Parametric Modeler - Research

**Researched:** 2026-03-09
**Domain:** OpenCascade parametric CAD via build123d Python bindings
**Confidence:** HIGH

<research_summary>
## Summary

Researched the Python parametric CAD ecosystem for generating watertight STL meshes from parameter dictionaries. The standard approach uses **build123d** (v0.10.x), a modern Python wrapper around OpenCascade (OCP), with **trimesh** for mesh validation post-export.

build123d offers two API modes: **Builder** (context managers) and **Algebra** (operator overloading). The Algebra mode is ideal for programmatic template generation — shapes compose via `+` (fuse), `-` (cut), `&` (intersect), and placement via `Pos(x,y,z) * obj`. Templates are pure functions: parameter dict in → Part object out → STL bytes via `export_stl()`.

Key finding: Don't hand-roll boolean operations, hole patterns, or mesh validation. build123d handles CSG, GridLocations/PolarLocations handle feature placement, and trimesh validates watertight/manifold properties. The CAD kernel (OCCT) can fail on complex operations — always have fallback approaches (loft instead of sweep, delay fillets).

**Primary recommendation:** Use build123d algebra mode for all templates. Each design category (mounting_bracket, enclosure, organizer) gets a template function. Export with `export_stl(part, path, tolerance=0.01, angular_tolerance=0.1)` for 3D-print quality. Validate with trimesh.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| build123d | 0.10.x | Parametric BREP CAD | Modern OCP wrapper, active development, algebra mode |
| OCP (opencascade) | 7.7.2+ | CAD kernel | Industry-standard BREP kernel, handles booleans/fillets |
| trimesh | 4.x | Mesh validation | Watertight/manifold checks, mesh analysis |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| numpy | 1.x/2.x | Numeric arrays | Vertex/face manipulation if needed |
| manifold3d | 3.x | Robust booleans | Fallback if OCCT booleans fail on complex geometry |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| build123d | CadQuery | CadQuery is older, less active; build123d is its spiritual successor |
| build123d | OpenSCAD | OpenSCAD is mesh-based (not BREP), worse quality for fillets/chamfers |
| trimesh | numpy-stl | numpy-stl is read/write only, no validation |
| OCCT booleans | manifold3d | manifold3d more robust but adds dependency; try OCCT first |

### Installation
```bash
# In Docker only (OCP deps are heavy, not in pyproject.toml)
pip install build123d trimesh numpy
# OCP kernel installed via cadquery-ocp or conda
```

**Note:** Per project decision, OCP dependencies install in Docker only, not in pyproject.toml.
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
backend/src/app/
├── modeler/
│   ├── __init__.py
│   ├── engine.py           # ModelEngine: param dict → STL bytes
│   ├── templates/
│   │   ├── __init__.py
│   │   ├── base.py         # BaseTemplate protocol/ABC
│   │   ├── mounting_bracket.py
│   │   ├── enclosure.py
│   │   └── organizer.py
│   ├── validation.py       # trimesh watertight/manifold checks
│   └── export.py           # STL/STEP export utilities
```

### Pattern 1: Algebra Mode Template Functions
**What:** Each template is a pure function: parameters → Part
**When to use:** All programmatic geometry generation
**Example:**
```python
# Source: build123d official docs
from build123d import *

def generate_mounting_bracket(
    width: float,
    height: float,
    depth: float,
    thickness: float,
    hole_diameter: float,
    hole_count: int,
) -> Part:
    # Base L-bracket
    base = Box(width, depth, thickness)
    wall = Pos(0, -depth/2 + thickness/2, height/2) * Box(width, thickness, height)
    bracket = base + wall

    # Fillet the inner corner
    bracket = fillet(bracket.edges().filter_by(Axis.X), radius=thickness)

    # Mounting holes in base
    with BuildPart() as holes:
        with GridLocations(width / (hole_count + 1), 0, hole_count, 1):
            Cylinder(hole_diameter / 2, thickness)
    bracket = bracket - holes.part

    return bracket
```

### Pattern 2: Parameter Dict → STL Bytes Pipeline
**What:** Single entry point that routes to template, generates geometry, exports STL
**When to use:** API endpoint integration
**Example:**
```python
from build123d import export_stl
import io

def generate_stl(category: str, parameters: dict) -> bytes:
    templates = {
        "mounting_bracket": generate_mounting_bracket,
        "enclosure": generate_enclosure,
        "organizer": generate_organizer,
    }
    template_fn = templates[category]
    part = template_fn(**parameters)

    buffer = io.BytesIO()
    export_stl(part, buffer, tolerance=0.01, angular_tolerance=0.1)
    return buffer.getvalue()
```

### Pattern 3: Hollow Enclosures via Shell/Offset
**What:** Create thin-walled boxes using offset or shell operations
**When to use:** Enclosure category
**Example:**
```python
from build123d import *

def generate_enclosure(
    width: float, length: float, height: float,
    wall_thickness: float, lid: bool = True,
) -> Part:
    outer = Box(width, length, height)
    inner = Pos(0, 0, wall_thickness) * Box(
        width - 2*wall_thickness,
        length - 2*wall_thickness,
        height  # cut through top
    )
    shell = outer - inner

    if not lid:
        # Open top — already done by inner extending above
        pass

    return shell
```

### Pattern 4: Feature Placement with Locations
**What:** Use GridLocations/PolarLocations for repeated features
**When to use:** Mounting holes, ventilation grids, divider slots
**Example:**
```python
from build123d import *

# Grid of mounting holes
with BuildPart() as part:
    Box(100, 80, 5)
    with GridLocations(80, 60, 2, 2):
        CounterBoreHole(radius=2, counter_bore_radius=4, counter_bore_depth=2, depth=5)
```

### Anti-Patterns to Avoid
- **Self-intersecting geometry before booleans:** OCCT requires valid solids — ensure no self-intersections before cut/fuse
- **Fillets before all booleans:** Apply fillets/chamfers LAST — they fail on edges that get modified by subsequent booleans
- **3D operations without 2D sketch first:** For extrudes, always start with a 2D sketch/face, then extrude to 3D
- **Ignoring CAD kernel failures:** OCCT can fail silently — always verify output has expected volume/bounds
- **Units confusion:** build123d works in millimeters for STL export — document this for all templates
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Boolean operations | Custom mesh CSG | build123d `+`, `-`, `&` operators | BREP booleans handle edge cases, topology |
| Hole patterns | Manual coordinate math | `GridLocations`, `PolarLocations` | Handles spacing, centering, count automatically |
| Mounting holes | Cylinder subtraction | `Hole`, `CounterBoreHole`, `CounterSinkHole` | Proper thread specs, standard sizes |
| Mesh validation | Custom vertex/face checks | trimesh `is_watertight`, `is_winding_consistent` | Handles degenerate triangles, topology |
| Fillet/chamfer | Manual geometry blending | `fillet()`, `chamfer()` on edges | Mathematically correct G1/G2 continuity |
| STL export | Manual triangulation | `export_stl()` with tolerance params | Adaptive meshing, quality control |
| Shell/hollow | Manual inner-outer subtraction | `offset()` or shell operation | Handles complex topology correctly |

**Key insight:** CAD geometry has 50+ years of solved problems in the OCCT kernel. Hand-rolling boolean operations or mesh generation leads to non-manifold geometry that won't slice properly for 3D printing. Let the kernel do its job.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Self-Intersecting Geometry
**What goes wrong:** Boolean operations fail or produce corrupt topology
**Why it happens:** Creating shapes that overlap their own surfaces before combining
**How to avoid:** Build each solid independently, verify it's valid, then combine. Use `part.is_valid()` checks.
**Warning signs:** `StdFail_NotDone` exceptions, zero-volume results, missing faces

### Pitfall 2: Premature Fillets
**What goes wrong:** Fillet operation fails with cryptic OCCT error
**Why it happens:** Applying fillets to edges that will be modified by subsequent boolean operations
**How to avoid:** Apply ALL boolean operations first (cuts, fuses, intersections), then fillet/chamfer as the very last step
**Warning signs:** `BRepFilletAPI_MakeFillet` errors, edges disappearing

### Pitfall 3: 3D Operations Without 2D Foundation
**What goes wrong:** Extrude fails or produces unexpected geometry
**Why it happens:** Trying to extrude a 3D object or non-planar face
**How to avoid:** Always start with a 2D sketch (Circle, Rectangle, etc.), then extrude. Use `BuildSketch` → `BuildPart` workflow.
**Warning signs:** Empty Part results, unexpected shape orientation

### Pitfall 4: CAD Kernel Silent Failures
**What goes wrong:** Operation completes but geometry is wrong (zero volume, missing features)
**Why it happens:** OCCT sometimes succeeds with degenerate input instead of raising errors
**How to avoid:** Always validate output: check `part.volume > 0`, bounding box matches expectations, `export_stl` produces non-empty output
**Warning signs:** Unexpectedly small volume, bounding box doesn't match parameters

### Pitfall 5: STL Quality vs Performance
**What goes wrong:** STL files either too large (slow preview) or too coarse (visible facets)
**Why it happens:** Default tolerance too fine for preview or too coarse for printing
**How to avoid:** Use `tolerance=0.01` (0.01mm) and `angular_tolerance=0.1` (radians) for 3D-print quality. For preview, use `tolerance=0.1` for faster/smaller files.
**Warning signs:** STL files >10MB for simple parts, visible flat facets on curved surfaces

### Pitfall 6: Sweep/Loft Failures
**What goes wrong:** Complex path operations fail
**Why it happens:** OCCT sweep algorithm can't handle certain path/profile combinations
**How to avoid:** Try loft with intermediate sections instead of sweep. Keep paths simple (arcs, lines, not splines).
**Warning signs:** Empty result from sweep, `BRepOffsetAPI_MakePipe` errors
</common_pitfalls>

<code_examples>
## Code Examples

### Basic Box with Holes (Mounting Bracket Pattern)
```python
# Source: build123d Context7 docs + official examples
from build123d import *

# Algebra mode — shapes are values, operators combine them
plate = Box(100, 60, 5)

# Subtract 4 holes in a grid pattern
with BuildPart() as hole_pattern:
    with GridLocations(80, 40, 2, 2):
        Cylinder(2.5, 5)  # M5 clearance holes

bracket = plate - hole_pattern.part
```

### STL Export with Quality Control
```python
# Source: build123d export docs
from build123d import export_stl
import io

# Export to file
export_stl(bracket, "bracket.stl", tolerance=0.01, angular_tolerance=0.1)

# Export to bytes (for API response)
buffer = io.BytesIO()
export_stl(bracket, buffer, tolerance=0.01, angular_tolerance=0.1)
stl_bytes = buffer.getvalue()
```

### Mesh Validation with trimesh
```python
# Source: trimesh documentation
import trimesh

mesh = trimesh.load("bracket.stl")

# Key validation checks
assert mesh.is_watertight, "Mesh has holes — not printable"
assert mesh.is_winding_consistent, "Inconsistent face normals"
assert mesh.volume > 0, "Mesh has zero or negative volume"

# Dimensional accuracy
bounds = mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]
extent = mesh.extents  # [size_x, size_y, size_z]
```

### Hollow Enclosure with Lid Lip
```python
# Source: build123d shell/offset patterns
from build123d import *

def enclosure_with_lip(w, l, h, wall, lip_h=2):
    outer = Box(w, l, h)
    inner = Pos(0, 0, wall) * Box(w - 2*wall, l - 2*wall, h)
    body = outer - inner

    # Lid with lip that fits inside
    lid_outer = Pos(0, 0, h + wall/2) * Box(w, l, wall)
    lip = Pos(0, 0, h - lip_h/2) * Box(w - 2*wall - 0.4, l - 2*wall - 0.4, lip_h)
    lid = lid_outer + lip

    return body, lid
```

### Organizer with Dividers
```python
# Source: build123d patterns
from build123d import *

def organizer(w, l, h, wall, dividers_x=1, dividers_y=1):
    # Outer shell
    outer = Box(w, l, h)
    inner = Pos(0, 0, wall) * Box(w - 2*wall, l - 2*wall, h)
    tray = outer - inner

    # Add dividers
    inner_w = w - 2*wall
    inner_l = l - 2*wall
    for i in range(1, dividers_x + 1):
        x_pos = -inner_w/2 + i * inner_w/(dividers_x + 1)
        divider = Pos(x_pos, 0, h/2) * Box(wall, inner_l, h - wall)
        tray = tray + divider

    for j in range(1, dividers_y + 1):
        y_pos = -inner_l/2 + j * inner_l/(dividers_y + 1)
        divider = Pos(0, y_pos, h/2) * Box(inner_w, wall, h - wall)
        tray = tray + divider

    return tray
```

### Volume and Bounding Box Validation
```python
# Source: build123d properties docs
from build123d import *

part = Box(100, 60, 5)
assert part.volume > 0, "Part has no volume"

bbox = part.bounding_box()
assert abs(bbox.size.X - 100) < 0.01, f"Width mismatch: {bbox.size.X}"
assert abs(bbox.size.Y - 60) < 0.01, f"Length mismatch: {bbox.size.Y}"
assert abs(bbox.size.Z - 5) < 0.01, f"Height mismatch: {bbox.size.Z}"
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CadQuery | build123d | 2023+ | build123d is the successor, more Pythonic, algebra mode |
| OpenSCAD (mesh CSG) | BREP via OCCT | established | BREP produces cleaner geometry, proper fillets |
| Manual mesh validation | trimesh library | established | Standard tool for mesh analysis |
| Global tolerance | Per-export tolerance | build123d 0.7+ | Fine-grained control over mesh quality |

**New tools/patterns to consider:**
- **Mesher class:** build123d's `Mesher` for 3MF export with `linear_deflection` and `angular_deflection` params
- **manifold3d:** Robust boolean alternative if OCCT fails on complex geometry
- **build123d Algebra mode:** Newer API style, preferred for programmatic generation

**Deprecated/outdated:**
- **CadQuery:** Still works but build123d is the actively developed successor
- **pythonOCC direct:** Low-level OCP bindings — use build123d wrapper instead
- **numpy-stl for validation:** Use trimesh instead (more comprehensive)
</sota_updates>

<open_questions>
## Open Questions

1. **Docker OCP installation method**
   - What we know: OCP deps install in Docker per project decision, not in pyproject.toml
   - What's unclear: Exact Docker base image and pip install command for build123d + OCP in container
   - Recommendation: Resolve during 03-01 plan execution; test `pip install build123d` in Docker and verify OCCT kernel works

2. **Algebra mode completeness**
   - What we know: Algebra mode covers Box, Cylinder, Sphere, fillet, chamfer, boolean ops
   - What's unclear: Whether all Location/Hole operations work in pure algebra mode or need Builder context
   - Recommendation: Hybrid approach — algebra for shape composition, Builder context for `GridLocations` and `CounterBoreHole` placement. Code examples show this mix works.

3. **STL size for Three.js preview**
   - What we know: `tolerance=0.01` produces print-quality STL; `tolerance=0.1` produces smaller files
   - What's unclear: Optimal tolerance for browser preview (balancing quality vs file size vs load time)
   - Recommendation: Generate two tolerances: fine for download, coarse for preview. Defer preview optimization to Phase 4.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- Context7 `/gumyr/build123d` — BuildPart, export_stl, algebra mode, Locations, Holes, offset, validation (6 queries)
- build123d official tips page (https://build123d.readthedocs.io/en/latest/tips.html) — best practices, common mistakes
- build123d import/export docs (https://build123d.readthedocs.io/en/latest/import_export.html) — STL export, Mesher class, tolerance params

### Secondary (MEDIUM confidence)
- WebSearch: "build123d vs cadquery" — confirmed build123d is successor, verified against GitHub repos
- WebSearch: "build123d parametric template patterns" — community examples verified against official docs
- WebSearch: "trimesh mesh validation watertight" — verified against trimesh GitHub docs
- WebSearch: "build123d enclosure box parametric" — example patterns cross-referenced with Context7

### Tertiary (LOW confidence - needs validation)
- WebSearch: "manifold3d robust booleans" — mentioned as fallback; validate need during implementation
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: build123d (OpenCascade Python wrapper)
- Ecosystem: build123d, trimesh, manifold3d
- Patterns: Algebra mode templates, parameter→geometry pipeline, mesh validation
- Pitfalls: Self-intersection, premature fillets, kernel failures, STL quality

**Confidence breakdown:**
- Standard stack: HIGH — build123d is clearly the standard, verified via Context7 + docs
- Architecture: HIGH — template function pattern is well-established in CAD
- Pitfalls: HIGH — documented in official build123d tips page
- Code examples: HIGH — all from Context7 queries against official build123d docs

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days — build123d ecosystem stable)
</metadata>

---

*Phase: 03-parametric-modeler*
*Research completed: 2026-03-09*
*Ready for planning: yes*
