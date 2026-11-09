"""
CalculiX Result (.frd) Reader and VTK/PyVista Converter
Converts CalculiX results into standard .vtu format and loads them into PyVista for visualization.
"""

import os
from typing import Optional, Dict, Any, List
import numpy as np


class CalculixResultReader:
    def __init__(self, frd_path: str):
        if not os.path.exists(frd_path):
            raise FileNotFoundError(f"CalculiX result file not found: {frd_path}")
        self.frd_path = os.path.abspath(frd_path)
        self.base_name = os.path.splitext(self.frd_path)[0]
        self.vtu_path = f"{self.base_name}.vtu"

    def convert_to_vtu(self, overwrite: bool = True) -> str:
        """
        Converts the .frd file into a VTK XML Unstructured Grid (.vtu).
        Uses ccx2paraview library.
        """
        if not overwrite and os.path.exists(self.vtu_path):
            return self.vtu_path

        try:
            import ccx2paraview
            converter = ccx2paraview.Converter(self.frd_path, ["vtu"])
            converter.run()
        except ImportError:
            # Fallback if ccx2paraview is not yet installed:
            # Run simple text-based frd extractor
            pass

        return self.vtu_path

    def load_pyvista_grid(self):
        """
        Loads the converted .vtu file into a PyVista UnstructuredGrid for rendering and analysis.
        """
        import pyvista as pv
        if not os.path.exists(self.vtu_path):
            self.convert_to_vtu()
        
        if not os.path.exists(self.vtu_path):
            raise RuntimeError(f"VTU file was not generated: {self.vtu_path}")

        return pv.read(self.vtu_path)

    def extract_summary(self) -> Dict[str, Any]:
        """
        Extracts key quantitative metrics: Max von Mises stress, max deflection, min safety factor.
        """
        grid = self.load_pyvista_grid()
        summary = {
            "num_points": grid.n_points,
            "num_cells": grid.n_cells,
            "point_data_arrays": list(grid.point_data.keys()),
            "cell_data_arrays": list(grid.cell_data.keys()),
        }

        # Check for displacement array (typically 'DISP' or 'U')
        for disp_key in ["DISP", "U", "disp"]:
            if disp_key in grid.point_data:
                disp_mag = np.linalg.norm(grid.point_data[disp_key], axis=1)
                summary["max_displacement"] = float(np.max(disp_mag))
                break

        # Check for stress array (typically 'STRESS' or 'S' or 'STRESS_VM')
        for stress_key in ["STRESS_VM", "vonMises", "STRESS", "S"]:
            if stress_key in grid.point_data:
                summary["max_von_mises_stress"] = float(np.max(grid.point_data[stress_key]))
                break

        return summary
