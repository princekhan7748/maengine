"""
MechaStudio High-Level Simulation Pipeline
The central orchestrator connecting CAD (build123d), Meshing (Gmsh),
Deck Compilation (Jinja2), Solver Execution (CalculiX), and Post-Processing (VTK/PyVista).
"""

import os
from typing import Optional, Dict, Any, Callable
from mechastudio.schema.model import SimulationProject
from mechastudio.meshing.gmsh_mesher import GmshMesher
from mechastudio.solvers.calculix.deck_generator import CalculixDeckGenerator
from mechastudio.solvers.calculix.runner import CalculixRunner
from mechastudio.solvers.calculix.reader import CalculixResultReader


class SimulationPipeline:
    def __init__(self, project: SimulationProject, work_dir: Optional[str] = None):
        self.project = project
        self.work_dir = os.path.abspath(work_dir or os.path.join(os.getcwd(), "sim_runs", project.name))
        os.makedirs(self.work_dir, exist_ok=True)

        self.mesh_path = os.path.join(self.work_dir, "model_mesh.inp")
        self.deck_path = os.path.join(self.work_dir, f"{project.name}.inp")
        self.runner = CalculixRunner()

    @classmethod
    def from_yaml(cls, yaml_path: str, work_dir: Optional[str] = None) -> "SimulationPipeline":
        with open(yaml_path, "r", encoding="utf-8") as f:
            yaml_str = f.read()
        proj = SimulationProject.from_yaml(yaml_str)
        return cls(proj, work_dir=work_dir)

    def generate_mesh(self, cad_file_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Meshes the CAD model into conformal 3D tetrahedral elements using Gmsh.
        """
        cad_path = cad_file_path or self.project.cad_file
        if not cad_path or not os.path.exists(cad_path):
            raise FileNotFoundError(f"CAD file not found: {cad_path}")

        # Map project sets to Gmsh physical groups
        surface_tags = {}
        for entity_set in self.project.sets:
            if entity_set.cad_tag_indices:
                surface_tags[entity_set.name] = entity_set.cad_tag_indices

        with GmshMesher() as mesher:
            stats = mesher.mesh_cad_file(
                cad_path=cad_path,
                output_mesh_path=self.mesh_path,
                config=self.project.mesh,
                surface_tags=surface_tags if surface_tags else None,
            )
        return stats

    def compile_solver_deck(self) -> str:
        """
        Compiles the CalculiX .inp file from project schema and generated mesh.
        """
        generator = CalculixDeckGenerator()
        rel_mesh = os.path.basename(self.mesh_path)
        return generator.generate_deck(
            project=self.project,
            mesh_file_rel_path=rel_mesh,
            output_inp_path=self.deck_path,
        )

    def solve(
        self,
        on_output_line: Optional[Callable[[str], None]] = None,
        on_residual: Optional[Callable[[Dict[str, float]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Runs CalculiX CrunchiX on the compiled deck.
        """
        return self.runner.run_job(
            job_dir=self.work_dir,
            job_name=self.project.name,
            on_output_line=on_output_line,
            on_residual=on_residual,
        )

    def get_results(self) -> CalculixResultReader:
        """
        Returns reader instance pointing to the generated .frd result.
        """
        frd_file = os.path.join(self.work_dir, f"{self.project.name}.frd")
        return CalculixResultReader(frd_file)
