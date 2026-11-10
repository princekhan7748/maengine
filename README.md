# MAEngine: Mechanical Analysis Engine
> **Open-Source Mechanical Engineering IDE & Simulation Workbench**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-brightgreen.svg)](https://www.python.org/)
[![Solvers](https://img.shields.io/badge/Solvers-CalculiX%20%7C%20Elmer%20%7C%20OpenRadioss-orange.svg)](#solvers)
[![CAD](https://img.shields.io/badge/CAD-build123d%20%7C%20OpenCASCADE-purple.svg)](https://build123d.readthedocs.io/)
[![Meshing](https://img.shields.io/badge/Meshing-Gmsh%20API%20(HXT)-yellow.svg)](https://gmsh.info/)

---

## 🎯 The Golden Rule of MAEngine

> **Never write from scratch what the open-source engineering ecosystem has already battle-tested.**
> MAEngine operates strictly as an **integrator and orchestrator** of existing, production-grade open-source codes. New custom code is strictly limited to glue logic, schema translation, Language Server Protocol bindings, and UI event orchestration.

---

## 🚀 Why MAEngine?

Commercial CAE suites (chiefly Ansys Mechanical / Workbench) suffer from severe structural bottlenecks:
* **Punitive Core Licensing:** 4-core base solver limit on 64-core workstations; expensive HPC packs.
* **Git-Hostile Binary Databases:** Binary `.mechdb` and `.wbpz` files that cannot be diffed, merged, or version-controlled.
* **UI & Scripting Fragmentation:** Juggling SpaceClaim, Discovery, Workbench, Mechanical, and MAPDL windows.
* **OS Neglect:** Zero native Apple Silicon (macOS) builds; second-class Linux support.

**MAEngine solves this by bringing CAE simulation natively into a standalone Code - OSS desktop application.**

---

## 🏛️ Integrated Open-Source Building Blocks

| Subsystem | Integrated Open-Source Project | Role in MAEngine |
| :--- | :--- | :--- |
| **B-Rep CAD Kernel** | [`OpenCASCADE (OCCT)`](https://occt3d.com/) via [`build123d`](https://build123d.readthedocs.io/) | Parametric Python CAD, STEP/IGES import, boolean defeaturing |
| **CAD 3D Viewport** | [`Three.js`](https://threejs.org/) + `ocp-cad-viewer` | Interactive 3D B-Rep rendering directly inside MAEngine |
| **Meshing Engine** | [`Gmsh`](https://gmsh.info/) C++/Python API | Multi-threaded HXT 3D Delaunay tet meshing, high-order elastic optimization |
| **Conformal Multi-Body** | `gmsh.model.occ.fragment` | Automated Shared Topology splitting for multi-body assemblies |
| **Mesh I/O & Formats** | [`meshio`](https://pypi.org/project/meshio/) | Format translation between Abaqus, Gmsh, VTK, MED, and LS-DYNA |
| **Implicit Solver** | [`CalculiX CrunchiX (ccx)`](https://www.dhondt.de/) | NAFEMS-verified linear & nonlinear statics, modal vibration, thermal |
| **Multiphysics Engine** | [`Elmer FEM`](https://research.csc.fi/service/elmer/) | Electromagnetics, induction heating, piezoelectricity, and MEMS |
| **Explicit Dynamics** | [`OpenCourant`](https://github.com/OpenCourant/OpenCourant) / [`OpenRadioss`](https://github.com/gabrielrussell/OpenRadioss) | Automotive crash, impact, drop tests, and high-velocity dynamics |
| **Multiphysics Coupling** | [`preCICE`](https://precice.org/) | Partitioned Fluid-Structure Interaction (FSI) and Conjugate Heat Transfer |
| **Durability & Fatigue** | [`pyLife`](https://github.com/boschresearch/pylife) (Bosch Research) | Industrial FKM-guideline S-N curves, rainflow cycle counting |
| **Results Translation** | [`ccx2paraview`](https://github.com/calculix/ccx2paraview) | Converts CalculiX `.frd` files to standard VTK `.vtu` |
| **3D FEA Post-Processing**| [`PyVista`](https://docs.pyvista.org/) / [`Three.js`](https://threejs.org/) | Stress contours, deformed warp vectors, section planes, and probe lines |
| **Language Server (LSP)** | [`pygls`](https://github.com/openlawlibrary/pygls) | Live keyword validation, hovers, and autocomplete for CAE decks |
| **SimOps Schema** | [`Pydantic`](https://docs.pydantic.dev/) + [`Jinja2`](https://jinja.palletsprojects.com/) | 100% Git-diffable YAML simulation specifications |

---

## 📁 Repository Structure

```
maengine/
├── .venv/                      # Python 3.11 virtual environment
├── bin/                        # Bundled CalculiX CrunchiX multi-threaded binaries (ccx.exe)
├── maengine/                   # Core Python Simulation Engine
│   ├── __main__.py             # python -m maengine CLI entry point
│   ├── cli.py                  # Full MAEngine CLI (run, mesh, solve, post, view, marketplace)
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
│   │       └── reader.py       # Robust .frd to .vtu / NumPy converter (3-digit exponent support)
│   ├── post/                   # 3D Post-Processing & Rendering
│   │   └── viewer.py           # Hardware-accelerated glTF 2.0 & PNG screenshot exporter
│   ├── marketplace/            # Extensible Simulation Hub / Marketplace
│   │   ├── models.py           # TemplatePackage, TemplateCategory schemas
│   │   └── registry.py         # Catalog discovery, installation, and dependency manager
│   ├── lsp/                    # Language Server Protocol server (pygls)
│   │   └── server.py           # CalculiX / MAEngine schema LSP server
│   └── pipeline.py             # High-level orchestrator API
├── workbench/                  # Standalone Code - OSS Desktop Application
│   └── src/vs/workbench/
│       ├── contrib/
│       │   ├── maengineShell/          # MAEngine main application shell & start page
│       │   ├── maengineProject/        # Project navigator & multi-window parts
│       │   ├── maengineCad/            # CAD B-Rep 3D geometry editor
│       │   ├── maengineMaterial/       # Material card editor
│       │   ├── maengineMesh/           # Gmsh conformal mesher pane
│       │   ├── maenginePhysics/        # Boundary conditions & load decks
│       │   ├── maengineSolver/         # CalculiX solver manager
│       │   ├── maengineResults/        # 3D deformed FEA results viewer
│       │   └── maengineMarketplace/    # Engineering object template marketplace
│       └── services/maengineProject/   # MAEngine project service
├── templates/                  # Jinja2 solver deck templates
│   ├── calculix/
│   │   ├── static.inp.j2       # Linear / nonlinear static stress analysis
│   │   ├── modal.inp.j2        # Natural frequency Lanczos eigenvalue extraction
│   │   └── thermal.inp.j2      # Steady-state thermal conduction & heat flux
│   └── marketplace/            # Installed user & community simulation packages
├── examples/                   # Reproducible benchmarks
│   └── cantilever_beam/
│       ├── cantilever.py       # Parametric CAD generator (build123d)
│       ├── simulation.yaml     # Declarative simulation specification
│       └── run_pipeline.py     # End-to-end execution script
├── pyproject.toml              # Modern Python build specification & CLI entry point
├── setup.py                    # Setuptools develop wrapper
└── README.md
```

---

## ⚡ Quick Start: CLI & Commands

### 1. View Environment & Solver Status
```powershell
python -m maengine version
```

### 2. Run the Cantilever Benchmark Pipeline
```powershell
python -m maengine run examples/cantilever_beam/simulation.yaml
```

Output:
```
[*] Loading MAEngine simulation specification from: examples/cantilever_beam/simulation.yaml
[+] Conformal 3D quadratic mesh generated (436 nodes, 161 elements)
[+] CalculiX input deck compiled (Cantilever_Beam_Bending.inp)
[+] Running CalculiX CrunchiX (ccx.exe)... Solved in 0.46s
[+] Result converted to VTK Unstructured Grid (.vtu)
[+] 3D glTF Scene exported: sim_output/results.gltf
[+] High-res contour screenshot saved: sim_output/stress_contour.png

Simulation Metrics:
  - Max Deflection:       12.4061 mm   (Analytical: 12.381 mm - 99.8% accurate)
  - Max Von Mises Stress: 3,918.36 MPa (Analytical: 3,900.00 MPa - 99.5% accurate)
```

### 3. Explore the Simulation Marketplace
```powershell
# List all available and installed simulation packages
python -m maengine marketplace list

# Search for specific physics (e.g. contact, vibration, aerospace)
python -m maengine marketplace search contact

# Install an advanced simulation template
python -m maengine marketplace install structural.contact_mortar

# Uninstall a template
python -m maengine marketplace uninstall structural.contact_mortar
```

### 4. Launch Desktop Workbench
```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-maengine.ps1
```
