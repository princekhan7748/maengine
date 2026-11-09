"""
MechaStudio Marketplace Data Models
Defines package schemas for downloadable simulation templates, material catalogs, and solver plugins.
"""

from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class TemplateCategory(str, Enum):
    STRUCTURAL = "Structural"
    DYNAMICS = "Dynamics & Vibration"
    THERMAL = "Thermal & Fluids"
    MULTIPHYSICS = "Multiphysics & Coupling"
    DURABILITY = "Fatigue & Durability"
    COMPOSITES = "Layered Composites"
    OPTIMIZATION = "Topology Optimization"
    MATERIALS = "Material Libraries"


class TemplatePackage(BaseModel):
    id: str = Field(..., description="Unique package identifier, e.g. 'structural.contact_mortar'")
    name: str = Field(..., description="Human-readable package title")
    version: str = Field("1.0.0", description="SemVer release string")
    category: TemplateCategory = TemplateCategory.STRUCTURAL
    author: str = Field("MechaStudio Community", description="Author or Maintainer")
    description: str = Field(..., description="Detailed description of physics, assumptions, and usage")
    solver: str = Field("CalculiX", description="'CalculiX', 'Elmer FEM', 'OpenRadioss', 'preCICE'")
    tags: List[str] = Field(default_factory=list)
    download_url: Optional[str] = None
    files: List[str] = Field(default_factory=list, description="Included template files, e.g. ['contact.inp.j2']")
    is_installed: bool = False
