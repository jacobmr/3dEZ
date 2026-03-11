"""CSG primitive template — assembles a build123d Part from a CsgTree dict."""

from __future__ import annotations

from typing import Any


def generate_csg_primitive(tree: dict[str, Any], **_kwargs: Any):
    """Entry point called by the template registry.

    Receives ``tree`` as a keyword arg (a raw dict) and validates it
    into a :class:`CsgTree` before evaluating.
    """
    from app.modeler.csg_evaluator import evaluate_csg_tree
    from app.models.designs import CsgTree

    csg_tree = CsgTree.model_validate(tree)
    return evaluate_csg_tree(csg_tree)
