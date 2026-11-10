"""
MAEngine Model Schema
Pydantic V2 models for Git-diffable, human-readable CAE simulation specifications.
"""

from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field


class UnitSystem(str, Enum):
    MM_N_MPA = "mm_N_MPa_tonne_s"   # Standard engineering units (Length: mm, Force: N, Stress: MPa, Mass: tonne, Time: s)
    M_N_PA = "m_N_Pa_kg_s"          # Standard SI units (Length: m, Force: N, Stress: Pa, Mass: kg, Time: s)
    IN_LBF_PSI = "in_lbf_psi_slug_s"# Imperial units (Length: in, Force: lbf, Stress: psi)


class ElasticProperty(BaseModel):
    youngs_modulus: float = Field(..., description="Young's Modulus E (e.g., in MPa or Pa)")
    poissons_ratio: float = Field(..., ge=0.0, le=0.4999, description="Poisson's ratio nu")
    temperature: Optional[float] = None


class PlasticPoint(BaseModel):
    yield_stress: float
    plastic_strain: float


class Material(BaseModel):
    name: str
    density: Optional[float] = Field(None, description="Material density (e.g., tonne/mm^3 or kg/m^3)")
    elastic: ElasticProperty
    plastic: Optional[List[PlasticPoint]] = None
    thermal_conductivity: Optional[float] = None
    specific_heat: Optional[float] = None
    expansion_coefficient: Optional[float] = None


class SemanticSelector(BaseModel):
    """
    Semantic geometric query that overcomes OpenCASCADE Topological Naming Problem (TNP).
    On CAD rebuild/reload, surfaces are matched dynamically by geometry rather than transient IDs.
    """
    geometry_type: Optional[str] = Field(None, description="'plane', 'cylinder', 'sphere', etc.")
    normal_vector: Optional[List[float]] = Field(None, description="Unit normal vector [nx, ny, nz]")
    radius_range: Optional[List[float]] = Field(None, description="[r_min, r_max] for cylindrical holes/fillets")
    fallback_centroid: Optional[List[float]] = Field(None, description="Approximate centroid [x, y, z]")
    tolerance: float = 1e-3


class EntitySet(BaseModel):
    name: str
    entity_type: str = Field("surface", description="'surface', 'node_set', 'element_set', or 'body'")
    cad_tag_indices: List[int] = Field(default_factory=list, description="Direct CAD face/body indices if known")
    semantic_query: Optional[SemanticSelector] = None


class MeshAlgorithm(str, Enum):
    HXT_PARALLEL = "hxt"            # Fast parallel 3D Delaunay
    DELAUNAY = "delaunay"          # Classic 3D Delaunay
    FRONTAL = "frontal"            # Advancing front
    NETGEN = "netgen"              # Netgen Delaunay


class MeshConfig(BaseModel):
    element_order: int = Field(2, ge=1, le=2, description="1 for linear (TET4), 2 for quadratic (TET10)")
    algorithm: MeshAlgorithm = MeshAlgorithm.HXT_PARALLEL
    min_size: float = Field(1.0, gt=0.0, description="Minimum mesh element size")
    max_size: float = Field(10.0, gt=0.0, description="Maximum mesh element size")
    curvature_refinement: float = Field(0.2, description="Target elements per 2*pi radius")
    optimize_high_order: bool = Field(True, description="Optimize high-order quadratic elements with elastic smoothing")


class BoundaryConditionType(str, Enum):
    FIXED = "fixed"                # Encastre (U1=U2=U3=0)
    DISPLACEMENT = "displacement"  # Prescribed displacement vector
    TEMPERATURE = "temperature"    # Prescribed temperature (DOF 11)
    SYMMETRY_X = "x_symmetry"
    SYMMETRY_Y = "y_symmetry"
    SYMMETRY_Z = "z_symmetry"


class BoundaryCondition(BaseModel):
    name: str
    type: BoundaryConditionType
    target_set: str                # Reference to EntitySet.name
    u1: Optional[float] = None    # Prescribed X displacement or temperature
    u2: Optional[float] = None    # Prescribed Y displacement
    u3: Optional[float] = None    # Prescribed Z displacement


class LoadType(str, Enum):
    PRESSURE = "pressure"          # Surface normal pressure
    CONCENTRATED_FORCE = "force"  # Concentrated point/surface force vector
    GRAVITY = "gravity"            # Body acceleration vector
    HEAT_FLUX = "flux"             # Surface heat flux
    TEMPERATURE = "temperature"    # Prescribed temperature body/surface


class Load(BaseModel):
    name: str
    type: LoadType
    target_set: str                # Reference to EntitySet.name
    magnitude: float = 0.0
    direction: Optional[List[float]] = None # Vector [dx, dy, dz]


class StepType(str, Enum):
    STATIC_LINEAR = "static_linear"
    STATIC_NONLINEAR = "static_nonlinear"
    MODAL_FREQUENCY = "modal_frequency"
    STEADY_HEAT_TRANSFER = "steady_heat_transfer"


class Step(BaseModel):
    name: str
    type: StepType = StepType.STATIC_LINEAR
    nlgeom: bool = Field(False, description="Large deformations / geometric nonlinearity")
    num_modes: Optional[int] = Field(None, description="Number of eigenvalues to extract (for modal)")
    boundary_conditions: List[BoundaryCondition] = Field(default_factory=list)
    loads: List[Load] = Field(default_factory=list)
    time_increment_initial: float = 1.0
    time_period: float = 1.0


class SimulationProject(BaseModel):
    """
    Top-level MAEngine simulation document.
    100% serializable to/from Git-friendly YAML.
    """
    name: str = "MAEngine_Analysis"
    units: UnitSystem = UnitSystem.MM_N_MPA
    cad_file: Optional[str] = None
    materials: List[Material] = Field(default_factory=list)
    sets: List[EntitySet] = Field(default_factory=list)
    mesh: MeshConfig = Field(default_factory=MeshConfig)
    steps: List[Step] = Field(default_factory=list)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> "SimulationProject":
        import yaml
        data = yaml.safe_load(yaml_str)
        return cls(**data)

    def to_yaml(self) -> str:
        import yaml
        return yaml.dump(self.model_dump(exclude_none=True), sort_keys=False, indent=2)

