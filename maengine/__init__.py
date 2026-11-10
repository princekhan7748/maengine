"""
MAEngine: Open-Source Mechanical Engineering IDE
Core Python simulation engine & multi-solver orchestrator.
"""

from maengine.schema.model import SimulationProject, UnitSystem, Material, Step, Load, BoundaryCondition
from maengine.pipeline import SimulationPipeline
from maengine.marketplace.registry import MarketplaceRegistry

__version__ = "0.1.0"
__all__ = [
    "SimulationPipeline",
    "SimulationProject",
    "UnitSystem",
    "Material",
    "Step",
    "Load",
    "BoundaryCondition",
    "MarketplaceRegistry",
    "__version__",
]
