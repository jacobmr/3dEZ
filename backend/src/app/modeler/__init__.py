"""Parametric modeler package for 3dEZ.

Public API
----------
ModelEngine
    Registry-based engine that routes categories to template functions.
generate_stl
    Convenience alias — instantiate an engine and call ``generate``.
"""

from app.modeler.engine import ModelEngine
from app.modeler.export import export_stl_bytes as generate_stl

__all__ = ["ModelEngine", "generate_stl"]
