"""
Cantilever Beam Model Generator (Code-CAD via build123d)
Demonstrates parametric CAD creation and export to STEP for MAEngine.
"""

import os
from build123d import *

def create_cantilever_beam(length: float = 100.0, width: float = 10.0, height: float = 10.0, step_output_path: str = "beam.step"):
    """
    Creates a rectangular cantilever beam and exports to STEP format.
    """
    with BuildPart() as beam:
        # Box centered on Y and Z, extending from X=0 to X=length
        Box(length, width, height, align=(Align.MIN, Align.CENTER, Align.CENTER))

    # Export to STEP
    os.makedirs(os.path.dirname(os.path.abspath(step_output_path)), exist_ok=True)
    export_step(beam.part, step_output_path)
    print(f"Exported CAD geometry to: {step_output_path}")

    return beam.part

if __name__ == "__main__":
    out_step = os.path.join(os.path.dirname(__file__), "beam.step")
    create_cantilever_beam(length=100.0, width=10.0, height=10.0, step_output_path=out_step)

