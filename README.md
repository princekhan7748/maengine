# MechaStudio: Open-Source Mechanical Engineering IDE
> **The "VS Code for CAE" Simulation Environment**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-brightgreen.svg)](https://www.python.org/)
[![Solvers](https://img.shields.io/badge/Solvers-CalculiX%20%7C%20Elmer%20%7C%20OpenRadioss-orange.svg)](#solvers)
[![CAD](https://img.shields.io/badge/CAD-build123d%20%7C%20OpenCASCADE-purple.svg)](https://build123d.readthedocs.io/)
[![Meshing](https://img.shields.io/badge/Meshing-Gmsh%20API%20(HXT)-yellow.svg)](https://gmsh.info/)

---

## 🎯 The Golden Rule of MechaStudio

> **Never write from scratch what the open-source engineering ecosystem has already battle-tested.**
> MechaStudio operates strictly as an **integrator and orchestrator** of existing, production-grade open-source codes. New custom code is strictly limited to glue logic, schema translation, Language Server Protocol bindings, and UI event orchestration.

---

## 🚀 Why MechaStudio?

Commercial CAE suites (chiefly Ansys Mechanical / Workbench) suffer from severe structural bottlenecks:
* **Punitive Core Licensing:** 4-core base solver limit on 64-core workstations; expensive HPC packs.
* **Git-Hostile Binary Databases:** Binary `.mechdb` and `.wbpz` files that cannot be diffed, merged, or version-controlled.
* **UI & Scripting Fragmentation:** Juggling SpaceClaim, Discovery, Workbench, Mechanical, and MAPDL windows.
* **OS Neglect:** Zero native Apple Silicon (macOS) builds; second-class Linux support.

**MechaStudio solves this by bringing CAE simulation natively into the modern VS Code / Git workflow.**

---

## 🏛️ Integrated Open-Source Building Blocks

| Subsystem | Integrated Open-Source Project | Role in MechaStudio |
| :--- | :--- | :--- |
| **B-Rep CAD Kernel** | [`OpenCASCADE (OCCT)`](https://occt3d.com/) via [`build123d`](https://build123d.readthedocs.io/) | Parametric Python CAD, STEP/IGES import, boolean defeaturing |
| **CAD 3D Viewport** | [`vscode-ocp-cad-viewer`](https://github.com/bernhard-42/vscode-ocp-cad-viewer) (`ocp-vscode`) | Interactive 3D B-Rep rendering directly inside VS Code |
| **Meshing Engine** | [`Gmsh`](https://gmsh.info/) C++/Python API | Multi-threaded HXT 3D Delaunay tet meshing, high-order elastic optimization |
| **Conformal Multi-Body** | `gmsh.model.occ.fragment` | Automated Shared Topology splitting for multi-body assemblies |
| **Mesh I/O & Formats** | [`meshio`](https://pypi.org/project/meshio/) | Format translation between Abaqus, Gmsh, VTK, MED, and LS-DYNA |
| **Implicit Solver** | [`CalculiX CrunchiX (ccx)`](https://www.dhondt.de/) | NAFEMS-verified linear & nonlinear statics, modal vibration, thermal |
| **Multiphysics Engine** | [`Elmer FEM`](https://research.csc.fi/service/elmer/) | Electromagnetics, induction heating, piezoelectricity, and MEMS |
| **Explicit Dynamics** | [`OpenCourant`](https://github.com/OpenCourant/OpenCourant) / [`OpenRadioss`](https://github.com/gabrielrussell/OpenRadioss) | Automotive crash, impact, drop tests, and high-velocity dynamics |
| **Multiphysics Coupling** | [`preCICE`](https://precice.org/) | Partitioned Fluid-Structure Interaction (FSI) and Conjugate Heat Transfer |
| **Durability & Fatigue** | [`pyLife`](https://github.com/boschresearch/pylife) (Bosch Research) | Industrial FKM-guideline S-N curves, rainflow cycle counting |
| **Results Translation** | [`ccx2paraview`](https://github.com/calculix/ccx2paraview) | Converts CalculiX `.frd` files to standard VTK `.vtu` |
| **3D FEA Post-Processing**| [`PyVista`](https://docs.pyvista.org/) / [`VTK`](https://vtk.org/) | Stress contours, deformed warp vectors, section planes, and probe lines |
| **Language Server (LSP)** | [`pygls`](https://github.com/openlawlibrary/pygls) | Live keyword validation, hovers, and autocomplete for CAE decks |
| **SimOps Schema** | [`Pydantic`](https://docs.pydantic.dev/) + [`Jinja2`](https://jinja.palletsprojects.com/) | 100% Git-diffable YAML simulation specifications |

---

## 📁 Repository Structure

```
mechastudio/
├── .venv/                      # Python 3.11 virtual environment
├── mechastudio/                # Core Python Simulation Engine
│   ├── schema/                 # Pydantic schemas for Git-diffable simulation models
│   │   └── model.py            # Unit, Material, Geometry, Step, BC, Load definitions
│   ├── cad/                    # build123d / OpenCASCADE semantic selectors
│   │   └── selectors.py        # Semantic geometric queries (bypassing TNP!)
│   ├── meshing/                # Gmsh API integration
│   │   └── gmsh_mesher.py      # Conformal assembly meshing via occ.fragment & HXT
│   ├── solvers/                # Multi-solver adapters
│   │   └── calculix/           # CalculiX CrunchiX adapter
│   │       ├── deck_generator.py # Jinja2 templates for .inp compilation
│   │       ├── runner.py       # Asynchronous process runner + real-time residual parser
│   │       └── reader.py       # .frd to .vtu / NumPy converter
│   ├── lsp/                    # Language Server Protocol server (pygls)
│   │   └── server.py           # CalculiX / MechaStudio schema LSP server
│   └── pipeline.py             # High-level orchestrator API
├── vscode-extension/           # The VS Code Extension
│   ├── package.json            # Extension manifest, activity bar view, commands
│   ├── language-configuration.json
│   ├── syntaxes/               # CalculiX TextMate grammar
│   └── src/extension.ts        # TypeScript extension logic & Model Tree View
├── templates/                  # Jinja2 solver deck templates
│   └── calculix/
│       └── static.inp.j2
├── examples/                   # Reproducible benchmarks
│   └── cantilever_beam/
│       ├── cantilever.py       # Parametric CAD generator (build123d)
│       ├── simulation.yaml     # Declarative simulation specification
│       └── run_pipeline.py     # End-to-end execution script
└── README.md
```

---

## ⚡ Quick Start: Running the Cantilever Benchmark

```powershell
# 1. Activate the environment
.\.venv\Scripts\Activate.ps1

# 2. Run the end-to-end pipeline test
python examples/cantilever_beam/run_pipeline.py
```

Output:
```text
[1/4] Generating Parametric CAD Model (build123d / OpenCASCADE)...
Exported CAD geometry to: beam.step

[2/4] Initializing MechaStudio Simulation Pipeline from YAML...
  Project Name: Cantilever_Beam_Bending
  Unit System : mm_N_MPa_tonne_s
  Materials   : ['Structural_Steel']

[3/4] Generating Conformal 3D Quadratic Mesh via Gmsh C++/Python API...
  Mesh generated successfully!
  Total Nodes      : 2034
  Total 3D Elements: 963 (Quadratic TET10)

[4/4] Compiling CalculiX Input Deck (.inp) via Jinja2 Template...
  Generated Deck   : Cantilever_Beam_Bending.inp
```
