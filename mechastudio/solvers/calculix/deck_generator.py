"""
CalculiX Input Deck (.inp) Generator
Compiles Pydantic SimulationProject schemas into Abaqus-compliant CalculiX decks via Jinja2.
"""

import os
from typing import Dict, Any, List, Optional
import jinja2
from mechastudio.schema.model import SimulationProject, StepType


class CalculixDeckGenerator:
    def __init__(self, templates_dir: Optional[str] = None):
        if templates_dir is None:
            # Default to templates/calculix relative to workspace
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            templates_dir = os.path.join(base_dir, "templates", "calculix")
        
        self.templates_dir = templates_dir
        self.env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(self.templates_dir),
            trim_blocks=True,
            lstrip_blocks=True,
        )

    def generate_deck(
        self,
        project: SimulationProject,
        mesh_file_rel_path: str,
        output_inp_path: str,
        default_material: Optional[str] = None,
    ) -> str:
        """
        Renders the complete CalculiX .inp file.
        """
        # Determine sections: map element sets to materials
        mat_name = default_material or (project.materials[0].name if project.materials else "DEFAULT_STEEL")
        sections = [
            {"elset": "EALL", "material": mat_name}
        ]

        # Select template based on step type
        template_name = "static.inp.j2"
        template = self.env.get_template(template_name)

        rendered_deck = template.render(
            project=project,
            mesh_file=mesh_file_rel_path,
            sections=sections,
        )

        os.makedirs(os.path.dirname(os.path.abspath(output_inp_path)), exist_ok=True)
        with open(output_inp_path, "w", encoding="utf-8") as f:
            f.write(rendered_deck)

        return output_inp_path
