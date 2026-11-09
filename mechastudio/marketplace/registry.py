"""
MechaStudio Marketplace Registry Engine
Manages discovery, installation, and removal of simulation object templates,
material libraries, and solver plugins.
"""

import os
import json
import shutil
from typing import List, Optional, Dict, Any
from mechastudio.marketplace.models import TemplatePackage, TemplateCategory


# Baseline Catalog Definitions
BUILTIN_PACKAGES: List[Dict[str, Any]] = [
    {
        "id": "structural.static_linear",
        "name": "Linear Elastic Static Stress Analysis",
        "version": "1.0.0",
        "category": TemplateCategory.STRUCTURAL,
        "author": "MechaStudio Core Team",
        "description": "Standard 3D continuum linear elastic stress and deflection solver deck with automatic boundary and load mapping.",
        "solver": "CalculiX",
        "tags": ["fea", "static", "linear", "stress", "von-mises"],
        "files": ["static.inp.j2"],
        "is_installed": True,
    },
    {
        "id": "dynamics.modal_frequency",
        "name": "Natural Frequency & Normal Modes (Eigenvalue Lanczos)",
        "version": "1.0.0",
        "category": TemplateCategory.DYNAMICS,
        "author": "MechaStudio Core Team",
        "description": "Extracts undamped natural frequencies and 3D mode shapes using CalculiX multi-threaded Lanczos solver.",
        "solver": "CalculiX",
        "tags": ["vibration", "eigenvalues", "lanczos", "modal", "frequencies"],
        "files": ["modal.inp.j2"],
        "is_installed": True,
    },
    {
        "id": "thermal.steady_state",
        "name": "Steady-State Thermal Conduction & Flux",
        "version": "1.0.0",
        "category": TemplateCategory.THERMAL,
        "author": "MechaStudio Core Team",
        "description": "Calculates 3D temperature distributions, thermal gradients, and heat flux vectors across multi-body assemblies.",
        "solver": "CalculiX",
        "tags": ["thermal", "conduction", "heat-flux", "temperature"],
        "files": ["thermal.inp.j2"],
        "is_installed": True,
    },
    {
        "id": "structural.contact_mortar",
        "name": "Nonlinear Surface-to-Surface Contact (Mortar / Penalty)",
        "version": "1.2.0",
        "category": TemplateCategory.STRUCTURAL,
        "author": "OpenCAE Community",
        "description": "Nonlinear contact formulation featuring surface-to-surface penalty interaction, friction modeling, and chattering mitigation.",
        "solver": "CalculiX",
        "tags": ["contact", "nonlinear", "penalty", "friction", "assembly"],
        "files": ["contact.inp.j2"],
        "is_installed": False,
    },
    {
        "id": "materials.aerospace_metals",
        "name": "Aerospace Structural Alloys Catalog",
        "version": "2.1.0",
        "category": TemplateCategory.MATERIALS,
        "author": "MMPDS Open Data",
        "description": "Temperature-dependent elastic-plastic properties, densities, and yield strengths for Ti-6Al-4V, Al-7075-T6, Inconel 718, and 17-4PH.",
        "solver": "Multi-Solver",
        "tags": ["materials", "titanium", "aluminum", "inconel", "aerospace"],
        "files": ["aerospace_alloys.yaml"],
        "is_installed": False,
    },
    {
        "id": "dynamics.harmonic_response",
        "name": "Steady-State Linear Dynamics & Harmonic Response",
        "version": "1.1.0",
        "category": TemplateCategory.DYNAMICS,
        "author": "VibroAcoustic Lab",
        "description": "Frequency response sweep calculating peak frequency amplitudes, phase angles, and Frequency Response Functions (FRF).",
        "solver": "CalculiX",
        "tags": ["dynamics", "harmonic", "frequency-sweep", "frf", "resonance"],
        "files": ["harmonic.inp.j2"],
        "is_installed": False,
    },
    {
        "id": "multiphysics.thermo_mechanical",
        "name": "Sequential Thermo-Mechanical Coupled Expansion",
        "version": "1.0.0",
        "category": TemplateCategory.MULTIPHYSICS,
        "author": "MechaStudio Core Team",
        "description": "Maps thermal temperature fields directly to thermal expansion strains to evaluate thermal stresses and thermal buckling.",
        "solver": "CalculiX",
        "tags": ["multiphysics", "thermal-stress", "expansion", "coupled"],
        "files": ["thermo_mechanical.inp.j2"],
        "is_installed": False,
    },
    {
        "id": "durability.high_cycle_fatigue",
        "name": "High-Cycle Fatigue & Wöhler S-N Damage (pyLife)",
        "version": "1.0.0",
        "category": TemplateCategory.DURABILITY,
        "author": "Fraunhofer LBF / pyLife Team",
        "description": "Wöhler S-N curve damage calculation, stress amplitude life prediction, and Palmgren-Miner cumulative damage via pyLife.",
        "solver": "pyLife",
        "tags": ["fatigue", "durability", "woehler", "sn-curve", "damage"],
        "files": ["fatigue_sn.py"],
        "is_installed": False,
    },
]


# Default mock package contents for downloadable items
PACKAGE_ASSETS: Dict[str, Dict[str, str]] = {
    "structural.contact_mortar": {
        "contact.inp.j2": """*HEADING
Model: {{ project.name }} - Nonlinear Contact Analysis
** SURFACE INTERACTION & CONTACT PAIRS
*SURFACE INTERACTION, NAME=P_CONTACT
*SURFACE BEHAVIOR, PRESSURE-OVERCLOSURE=LINEAR
1.0e6, 0.0
*CONTACT PAIR, INTERACTION=P_CONTACT, TYPE=SURFACE TO SURFACE
SLAVE_SURF, MASTER_SURF
*STEP, NLGEOM, INC=100
*STATIC
0.01, 1.0, 1e-5, 0.1
*NODE FILE
U, RF
*EL FILE
S, E
*CONTACT FILE
CDIS, CSTR
*END STEP
""",
    },
    "materials.aerospace_metals": {
        "aerospace_alloys.yaml": """# Aerospace Structural Alloys Catalog (MMPDS)
materials:
  - name: Ti-6Al-4V_Grade5
    density: 4.43e-9 # tonne/mm^3
    elastic:
      youngs_modulus: 113800.0 # MPa
      poissons_ratio: 0.342
    thermal_conductivity: 6.7 # W/(m*K)
    specific_heat: 526.0
    expansion_coefficient: 8.6e-6
    plastic:
      - yield_stress: 880.0
        plastic_strain: 0.0
      - yield_stress: 950.0
        plastic_strain: 0.05
      - yield_stress: 1000.0
        plastic_strain: 0.10

  - name: Al-7075-T651
    density: 2.81e-9 # tonne/mm^3
    elastic:
      youngs_modulus: 71700.0 # MPa
      poissons_ratio: 0.33
    thermal_conductivity: 130.0 # W/(m*K)
    specific_heat: 960.0
    expansion_coefficient: 23.4e-6
    plastic:
      - yield_stress: 503.0
        plastic_strain: 0.0
      - yield_stress: 572.0
        plastic_strain: 0.08

  - name: Inconel_718
    density: 8.19e-9 # tonne/mm^3
    elastic:
      youngs_modulus: 204900.0 # MPa
      poissons_ratio: 0.294
    thermal_conductivity: 11.4 # W/(m*K)
    specific_heat: 435.0
    expansion_coefficient: 13.0e-6
    plastic:
      - yield_stress: 1034.0
        plastic_strain: 0.0
      - yield_stress: 1240.0
        plastic_strain: 0.12
""",
    },
    "dynamics.harmonic_response": {
        "harmonic.inp.j2": """*HEADING
Model: {{ project.name }} - Steady-State Harmonic Linear Dynamics
*INCLUDE, INPUT={{ mesh_file }}
*STEP
*STEADY STATE DYNAMICS
10.0, 5000.0, 50, 3
*BOUNDARY
FIXED_SET, 1, 3, 0.0
*CLOAD
FORCE_SET, 2, 1000.0
*NODE FILE
PU, RF
*END STEP
""",
    },
    "multiphysics.thermo_mechanical": {
        "thermo_mechanical.inp.j2": """*HEADING
Model: {{ project.name }} - Coupled Thermo-Mechanical Expansion
*INCLUDE, INPUT={{ mesh_file }}
*STEP
*COUPLED TEMPERATURE-DISPLACEMENT
0.1, 1.0
*BOUNDARY
FIXED_SET, 1, 3, 0.0
HOT_SURF, 11, 11, 373.15
COLD_SURF, 11, 11, 293.15
*NODE FILE
U, NT, RF
*EL FILE
S, E, HFL
*END STEP
""",
    },
    "durability.high_cycle_fatigue": {
        "fatigue_sn.py": """\"\"\"
MechaStudio - pyLife High Cycle Fatigue Wöhler Estimator
Integrates CalculiX cyclic stresses with open-source pyLife.
\"\"\"
import pylife.materiallaws.woehler_curve as wc
import numpy as np

def compute_fatigue_damage(stress_amplitude_mpa: float, cycles: float = 1e6):
    # Standard Wöhler parameters for Structural Steel
    sd = 200.0 # Fatigue limit MPa
    nd = 1e6   # Knee point cycles
    k = 5.0    # Slope before knee
    
    if stress_amplitude_mpa <= sd:
        damage = 0.0
        life_cycles = float("inf")
    else:
        life_cycles = nd * (sd / stress_amplitude_mpa) ** k
        damage = cycles / life_cycles
        
    return {
        "stress_amplitude_mpa": stress_amplitude_mpa,
        "cycles_applied": cycles,
        "predicted_life_cycles": life_cycles,
        "palmgren_miner_damage": damage,
        "status": "Safe" if damage < 1.0 else "Failure"
    }

if __name__ == "__main__":
    result = compute_fatigue_damage(250.0, 500000)
    print("pyLife Damage Report:", result)
""",
    },
}


class MarketplaceRegistry:
    """
    Registry for downloading, installing, and managing CAE simulation packages.
    """
    def __init__(self, marketplace_dir: Optional[str] = None):
        if marketplace_dir is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            marketplace_dir = os.path.join(base_dir, "templates", "marketplace")

        self.marketplace_dir = marketplace_dir
        self.state_file = os.path.join(self.marketplace_dir, "installed.json")
        os.makedirs(self.marketplace_dir, exist_ok=True)
        self._ensure_state_file()

    def _ensure_state_file(self):
        if not os.path.exists(self.state_file):
            # Seed with default built-in packages marked as installed
            default_state = {
                "installed_package_ids": [
                    "structural.static_linear",
                    "dynamics.modal_frequency",
                    "thermal.steady_state",
                ]
            }
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(default_state, f, indent=2)

    def _get_installed_ids(self) -> List[str]:
        try:
            with open(self.state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("installed_package_ids", [])
        except Exception:
            return ["structural.static_linear", "dynamics.modal_frequency", "thermal.steady_state"]

    def _save_installed_ids(self, ids: List[str]):
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump({"installed_package_ids": sorted(list(set(ids)))}, f, indent=2)

    def get_all_packages(self) -> List[TemplatePackage]:
        """
        Returns full list of packages with updated is_installed flags.
        """
        installed_ids = set(self._get_installed_ids())
        packages = []
        for raw in BUILTIN_PACKAGES:
            pkg_dict = dict(raw)
            pkg_dict["is_installed"] = pkg_dict["id"] in installed_ids
            packages.append(TemplatePackage(**pkg_dict))
        return packages

    def list_available(
        self,
        category: Optional[TemplateCategory] = None,
        search_term: Optional[str] = None
    ) -> List[TemplatePackage]:
        """
        Filters packages by category and/or search term.
        """
        packages = self.get_all_packages()
        if category:
            packages = [p for p in packages if p.category == category]
        if search_term:
            term = search_term.lower()
            packages = [
                p for p in packages
                if term in p.id.lower()
                or term in p.name.lower()
                or term in p.description.lower()
                or any(term in tag.lower() for tag in p.tags)
            ]
        return packages

    def list_installed(self) -> List[TemplatePackage]:
        """
        Returns all currently installed packages.
        """
        return [p for p in self.get_all_packages() if p.is_installed]

    def get_package(self, package_id: str) -> Optional[TemplatePackage]:
        for p in self.get_all_packages():
            if p.id == package_id:
                return p
        return None

    def install_package(self, package_id: str) -> bool:
        """
        Installs package files to templates/marketplace/<package_id> and updates state.
        """
        pkg = self.get_package(package_id)
        if not pkg:
            raise ValueError(f"Package '{package_id}' not found in Marketplace catalog.")

        pkg_install_dir = os.path.join(self.marketplace_dir, package_id)
        os.makedirs(pkg_install_dir, exist_ok=True)

        # Write package metadata manifest
        manifest_path = os.path.join(pkg_install_dir, "package.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            f.write(pkg.model_dump_json(indent=2))

        # Write asset files if available in packaged assets
        if package_id in PACKAGE_ASSETS:
            for fname, content in PACKAGE_ASSETS[package_id].items():
                target_path = os.path.join(pkg_install_dir, fname)
                with open(target_path, "w", encoding="utf-8") as f:
                    f.write(content)

        # Update registry state
        installed = self._get_installed_ids()
        if package_id not in installed:
            installed.append(package_id)
            self._save_installed_ids(installed)

        return True

    def uninstall_package(self, package_id: str) -> bool:
        """
        Uninstalls a non-core package.
        """
        # Protect built-in baseline templates from uninstallation
        core_builtins = ["structural.static_linear", "dynamics.modal_frequency", "thermal.steady_state"]
        if package_id in core_builtins:
            raise ValueError(f"Package '{package_id}' is a protected MechaStudio baseline component and cannot be uninstalled.")

        pkg_install_dir = os.path.join(self.marketplace_dir, package_id)
        if os.path.exists(pkg_install_dir):
            shutil.rmtree(pkg_install_dir)

        installed = self._get_installed_ids()
        if package_id in installed:
            installed.remove(package_id)
            self._save_installed_ids(installed)

        return True

    def search(self, query: str) -> List[TemplatePackage]:
        return self.list_available(search_term=query)

    def export_registry_json(self) -> str:
        """
        Exports full catalog JSON for frontend consumption (e.g. VS Code Webview).
        """
        packages = self.get_all_packages()
        return json.dumps([p.model_dump() for p in packages], indent=2)

