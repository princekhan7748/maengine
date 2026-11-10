"""
MAEngine End-to-End Pipeline Demonstration
Executes CAD Generation -> Conformal Meshing (Gmsh) -> Deck Compilation (CalculiX) -> Analysis.
"""

import os
import sys

# Ensure local maengine package is on sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from maengine.pipeline import SimulationPipeline
from examples.cantilever_beam.cantilever import create_cantilever_beam


def main():
    print("=" * 70)
    print(" MAENGINE: OPEN-SOURCE MECHANICAL ENGINEERING IDE PIPELINE")
    print("=" * 70)

    example_dir = os.path.dirname(os.path.abspath(__file__))
    yaml_path = os.path.join(example_dir, "simulation.yaml")
    step_path = os.path.join(example_dir, "beam.step")

    # Step 1: CAD Generation via build123d
    print("\n[1/4] Generating Parametric CAD Model (build123d / OpenCASCADE)...")
    create_cantilever_beam(length=100.0, width=10.0, height=10.0, step_output_path=step_path)

    # Step 2: Initialize MAEngine Pipeline
    print("\n[2/4] Initializing MAEngine Simulation Pipeline from YAML...")
    pipeline = SimulationPipeline.from_yaml(yaml_path, work_dir=os.path.join(example_dir, "sim_output"))
    print(f"  Project Name: {pipeline.project.name}")
    print(f"  Unit System : {pipeline.project.units.value}")
    print(f"  Materials   : {[m.name for m in pipeline.project.materials]}")

    # Step 3: Conformal Meshing via Gmsh
    print("\n[3/4] Generating Conformal 3D Quadratic Mesh via Gmsh C++/Python API...")
    mesh_stats = pipeline.generate_mesh(cad_file_path=step_path)
    print(f"  Mesh generated successfully!")
    print(f"  Total Nodes      : {mesh_stats['num_nodes']}")
    print(f"  Total 3D Elements: {mesh_stats['num_3d_elements']} (Quadratic TET10)")
    print(f"  Output Mesh File : {mesh_stats['output_file']}")

    # Step 4: Deck Compilation for CalculiX
    print("\n[4/4] Compiling CalculiX Input Deck (.inp) via Jinja2 Template...")
    deck_path = pipeline.compile_solver_deck()
    print(f"  Generated Deck   : {deck_path}")

    # Display preview of compiled deck
    print("\n--- CALCULIX DECK PREVIEW (.inp) ---")
    with open(deck_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        for line in lines[:35]:
            print("  ", line.rstrip())
        if len(lines) > 35:
            print("   ... [truncated remainder of deck] ...")
    print("------------------------------------\n")

    print("Pipeline compilation successful! Ready for solver execution.")


if __name__ == "__main__":
    main()

