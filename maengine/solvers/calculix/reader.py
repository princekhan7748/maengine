"""
CalculiX Result (.frd) Reader and VTK/PyVista Converter
Converts CalculiX results into standard .vtu format and loads them into PyVista for visualization.
"""

import os
import re
from typing import Optional, Dict, Any, List, Tuple
import numpy as np
import pyvista as pv
import vtk


class CalculixResultReader:
    def __init__(self, frd_path: str):
        if not os.path.exists(frd_path):
            raise FileNotFoundError(f"CalculiX result file not found: {frd_path}")
        self.frd_path = os.path.abspath(frd_path)
        self.base_name = os.path.splitext(self.frd_path)[0]
        self.vtu_path = f"{self.base_name}.vtu"

    def convert_to_vtu(self, overwrite: bool = True) -> str:
        """
        Parses the fixed-width CalculiX .frd file directly and writes a standard VTK Unstructured Grid (.vtu).
        Guarantees compatibility across all CalculiX versions (2-digit and 3-digit exponents).
        """
        if not overwrite and os.path.exists(self.vtu_path):
            return self.vtu_path

        with open(self.frd_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        nodes: Dict[int, List[float]] = {}
        elements: Dict[int, Dict[str, Any]] = {}
        disp: Dict[int, List[float]] = {}
        stress: Dict[int, List[float]] = {}
        stress_vm: Dict[int, float] = {}

        curr_block = None
        curr_elem_id = None

        for line in lines:
            if line.startswith("    2C"):
                curr_block = "NODES"
            elif line.startswith("    3C"):
                curr_block = "ELEMENTS"
            elif line.startswith(" -4"):
                if "DISP" in line:
                    curr_block = "DISP"
                elif "STRESS" in line:
                    curr_block = "STRESS"
                else:
                    curr_block = None
            elif line.startswith("    -3"):
                curr_block = None
            elif line.startswith(" -1"):
                if curr_block == "NODES":
                    nid = int(line[3:13])
                    coords = [float(x) for x in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", line[13:])]
                    if len(coords) >= 3:
                        nodes[nid] = coords[:3]
                elif curr_block == "ELEMENTS":
                    tokens = re.findall(r"[-+]?\d+", line)
                    if len(tokens) >= 3:
                        eid = int(tokens[1])
                        etype = int(tokens[2])
                        elements[eid] = {"type": etype, "nodes": []}
                        curr_elem_id = eid
                elif curr_block == "DISP":
                    nid = int(line[3:13])
                    vals = [float(x) for x in re.findall(r"[-+]?\d*\.?\d+[eE][-+]?\d{2,3}", line[13:])]
                    if len(vals) >= 3:
                        disp[nid] = vals[:3]
                elif curr_block == "STRESS":
                    nid = int(line[3:13])
                    vals = [float(x) for x in re.findall(r"[-+]?\d*\.?\d+[eE][-+]?\d{2,3}", line[13:])]
                    if len(vals) >= 6:
                        sxx, syy, szz, sxy, syz, szx = vals[:6]
                        vm = float(np.sqrt(0.5 * ((sxx - syy)**2 + (syy - szz)**2 + (szz - sxx)**2 + 6 * (sxy**2 + syz**2 + szx**2))))
                        stress_vm[nid] = vm
                        stress[nid] = vals[:6]
            elif line.startswith(" -2") and curr_block == "ELEMENTS" and curr_elem_id is not None:
                for t in line.split():
                    if t not in ["-2", "-1"]:
                        elements[curr_elem_id]["nodes"].append(int(t))

        # Build VTK Unstructured Grid
        sorted_nids = sorted(nodes.keys())
        nid_to_idx = {nid: idx for idx, nid in enumerate(sorted_nids)}

        points = np.array([nodes[nid] for nid in sorted_nids], dtype=float)

        # Assemble elements (CalculiX type 6 is 10-node quadratic tetrahedron C3D10)
        cell_types = []
        cells = []

        # Mapping CalculiX C3D10 node ordering to VTK_QUADRATIC_TETRA (VTK cell type 24)
        # CalculiX: 1,2,3,4 (corners), 5,6,7,8,9,10 (midsides)
        for eid, edata in elements.items():
            enodes = edata["nodes"]
            if len(enodes) == 10 and edata["type"] == 6:
                # Quadratic tetrahedron
                local_indices = [nid_to_idx[n] for n in enodes if n in nid_to_idx]
                if len(local_indices) == 10:
                    cells.append(10)
                    cells.extend(local_indices)
                    cell_types.append(vtk.VTK_QUADRATIC_TETRA)
            elif len(enodes) == 4 and edata["type"] == 3:
                # Linear tetrahedron
                local_indices = [nid_to_idx[n] for n in enodes if n in nid_to_idx]
                if len(local_indices) == 4:
                    cells.append(4)
                    cells.extend(local_indices)
                    cell_types.append(vtk.VTK_TETRA)

        cells_array = np.array(cells, dtype=np.int64)
        cell_types_array = np.array(cell_types, dtype=np.uint8)

        grid = pv.UnstructuredGrid(cells_array, cell_types_array, points)

        # Attach Displacements
        if disp:
            disp_array = np.zeros((len(sorted_nids), 3), dtype=float)
            for nid, d in disp.items():
                if nid in nid_to_idx:
                    disp_array[nid_to_idx[nid]] = d
            grid.point_data["DISP"] = disp_array
            grid.point_data["DISP_MAG"] = np.linalg.norm(disp_array, axis=1)

        # Attach Stresses
        if stress_vm:
            vm_array = np.zeros(len(sorted_nids), dtype=float)
            for nid, s in stress_vm.items():
                if nid in nid_to_idx:
                    vm_array[nid_to_idx[nid]] = s
            grid.point_data["STRESS_VM"] = vm_array

        if stress:
            stress_array = np.zeros((len(sorted_nids), 6), dtype=float)
            for nid, s in stress.items():
                if nid in nid_to_idx:
                    stress_array[nid_to_idx[nid]] = s
            grid.point_data["STRESS"] = stress_array

        # Save to .vtu
        grid.save(self.vtu_path)
        return self.vtu_path

    def load_pyvista_grid(self) -> pv.UnstructuredGrid:
        """
        Loads the converted .vtu file into a PyVista UnstructuredGrid for rendering and analysis.
        """
        if not os.path.exists(self.vtu_path):
            self.convert_to_vtu()
        return pv.read(self.vtu_path)

    def extract_summary(self) -> Dict[str, Any]:
        """
        Extracts key quantitative metrics: Max von Mises stress, max deflection.
        """
        grid = self.load_pyvista_grid()
        summary = {
            "num_points": grid.n_points,
            "num_cells": grid.n_cells,
            "max_displacement": float(np.max(grid.point_data["DISP_MAG"])) if "DISP_MAG" in grid.point_data else 0.0,
            "max_von_mises_stress": float(np.max(grid.point_data["STRESS_VM"])) if "STRESS_VM" in grid.point_data else 0.0,
            "vtu_file": self.vtu_path,
        }
        return summary
