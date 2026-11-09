"""
MechaStudio: Open-Source Mechanical Engineering IDE
Core Python simulation engine & multi-solver orchestrator.
"""

from mechastudio.schema.model import SimulationProject, UnitSystem, Material, Step, Load, BoundaryCondition
from mechastudio.pipeline import SimulationPipeline
from mechastudio.marketplace.registry import MarketplaceRegistry

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
