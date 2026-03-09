"""Parametric modeler package for 3dEZ.

Public API
----------
ModelEngine
    Registry-based engine that routes categories to template functions.
    Auto-registers all V1 templates on instantiation.
generate_stl
    Convenience alias — instantiate an engine and call ``generate``.
"""

from app.modeler.engine import ModelEngine
from app.modeler.export import export_stl_bytes as generate_stl
from app.modeler.templates import TEMPLATE_REGISTRY


def create_engine() -> ModelEngine:
    """Create a ModelEngine pre-loaded with all registered templates."""
    engine = ModelEngine()
    for category, fn in TEMPLATE_REGISTRY.items():
        engine.register_template(category, fn)
    return engine


__all__ = ["ModelEngine", "TEMPLATE_REGISTRY", "create_engine", "generate_stl"]
