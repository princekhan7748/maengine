"""
MechaStudio Gmsh Meshing Engine
Wraps Gmsh C++/Python API for high-performance 3D conformal tetrahedral meshing.
"""

import os
from typing import List, Dict, Optional, Tuple
import gmsh
from mechastudio.schema.model import MeshConfig, MeshAlgorithm


class GmshMesher:
    def __init__(self, verbose: int = 1):
        self.verbose = verbose
        self._is_initialized = False

    def __enter__(self):
        self.initialize()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.finalize()

    def initialize(self):
        if not self._is_initialized:
            gmsh.initialize()
            gmsh.option.setNumber("General.Verbosity", self.verbose)
            self._is_initialized = True

    def finalize(self):
        if self._is_initialized:
            gmsh.finalize()
            self._is_initialized = False

    def mesh_cad_file(
        self,
        cad_path: str,
        output_mesh_path: str,
        config: MeshConfig,
        surface_tags: Optional[Dict[str, List[int]]] = None,
        volume_tags: Optional[Dict[str, List[int]]] = None,
    ) -> Dict[str, any]:
        """
        Imports CAD geometry (STEP / IGES / BREP), fragments multi-body interfaces
        conformally, generates 3D tetrahedrals, and writes out Abaqus/CalculiX .inp or .msh.
        """
        self.initialize()
        gmsh.model.add("MechaStudioModel")

        # 1. Import CAD via embedded OpenCASCADE
        shapes = gmsh.model.occ.importShapes(cad_path)
        gmsh.model.occ.synchronize()

        # 2. Extract volumes and surfaces
        volumes = gmsh.model.getEntities(dim=3)
        surfaces = gmsh.model.getEntities(dim=2)

        # 3. Non-manifold boolean fragmentation for multi-body assemblies
        if len(volumes) > 1:
            # Shared Topology: Splits overlapping boundaries into conformal matching interfaces
            v_tags = [v[1] for v in volumes]
            gmsh.model.occ.fragment([(3, v) for v in v_tags], [])
            gmsh.model.occ.synchronize()
            volumes = gmsh.model.getEntities(dim=3)
            surfaces = gmsh.model.getEntities(dim=2)

        # 4. Configure mesh algorithm and sizing
        # Algorithm 3D: 1=Delaunay, 4=Frontal, 10=HXT (parallel)
        algo_map = {
            MeshAlgorithm.HXT_PARALLEL: 10,
            MeshAlgorithm.DELAUNAY: 1,
            MeshAlgorithm.FRONTAL: 4,
            MeshAlgorithm.NETGEN: 1,
        }
        gmsh.option.setNumber("Mesh.Algorithm3D", algo_map.get(config.algorithm, 10))
        gmsh.option.setNumber("Mesh.ElementOrder", config.element_order)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", config.min_size)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", config.max_size)

        # Curvature-based local mesh refinement
        if config.curvature_refinement > 0:
            gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 1)
            gmsh.option.setNumber("Mesh.MinimumElementsPerTwoPi", int(1 / config.curvature_refinement))

        # 5. Define Physical Groups (translates to ELSET and NSET in CalculiX)
        # Assign default volume physical group if not specified
        if volume_tags:
            for group_name, vol_ids in volume_tags.items():
                p_tag = gmsh.model.addPhysicalGroup(3, vol_ids)
                gmsh.model.setPhysicalName(3, p_tag, group_name)
        else:
            all_vol_ids = [v[1] for v in volumes]
            p_tag = gmsh.model.addPhysicalGroup(3, all_vol_ids)
            gmsh.model.setPhysicalName(3, p_tag, "EALL")

        # Assign surface physical groups (for boundary conditions & loads)
        if surface_tags:
            for group_name, surf_ids in surface_tags.items():
                p_tag = gmsh.model.addPhysicalGroup(2, surf_ids)
                gmsh.model.setPhysicalName(2, p_tag, group_name)

        # 6. Generate 3D Mesh
        gmsh.model.mesh.generate(3)

        # 7. High-order element optimization (removes negative Jacobians on curved boundaries)
        if config.element_order > 1 and config.optimize_high_order:
            gmsh.model.mesh.optimize("HighOrderElastic")

        # 8. Write mesh file (.inp or .msh)
        os.makedirs(os.path.dirname(os.path.abspath(output_mesh_path)), exist_ok=True)
        gmsh.write(output_mesh_path)

        # Gather mesh statistics
        node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
        elem_types, elem_tags, _ = gmsh.model.mesh.getElements(dim=3)
        total_3d_elements = sum(len(t) for t in elem_tags)

        stats = {
            "num_nodes": len(node_tags),
            "num_3d_elements": total_3d_elements,
            "element_order": config.element_order,
            "output_file": output_mesh_path,
        }

        return stats
