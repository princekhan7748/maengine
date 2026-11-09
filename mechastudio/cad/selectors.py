"""
Semantic Geometric Selectors
Overcomes the OpenCASCADE Topological Naming Problem (TNP) by querying faces and edges
via intrinsic invariant geometry (normals, radii, areas, centroids) rather than transient integer IDs.
"""

from typing import List, Optional, Tuple, Callable
import numpy as np


class SemanticSelectorEngine:
    """
    Evaluates geometric predicates on CAD models (build123d / OpenCASCADE shapes)
    to deterministically find target faces and edges across parametric rebuilds.
    """

    @staticmethod
    def find_planar_faces_by_normal(
        faces: List[any],
        target_normal: Tuple[float, float, float],
        tolerance_degrees: float = 2.0,
    ) -> List[int]:
        """
        Finds all planar faces whose unit surface normal matches target_normal within angular tolerance.
        Returns the matching 1-based face indices for Gmsh / CalculiX.
        """
        target_n = np.array(target_normal, dtype=float)
        target_n = target_n / np.linalg.norm(target_n)
        tol_cos = np.cos(np.radians(tolerance_degrees))

        matched_indices = []
        for idx, face in enumerate(faces, start=1):
            try:
                # build123d / OCP Face inspection
                if hasattr(face, "normal_at"):
                    norm = np.array(face.normal_at().to_tuple(), dtype=float)
                    norm = norm / np.linalg.norm(norm)
                    if np.dot(norm, target_n) >= tol_cos:
                        matched_indices.append(idx)
            except Exception:
                continue

        return matched_indices

    @staticmethod
    def find_cylindrical_faces_by_radius(
        faces: List[any],
        min_radius: float,
        max_radius: float,
    ) -> List[int]:
        """
        Finds all cylindrical hole or shaft faces whose radius falls within [min_radius, max_radius].
        """
        matched_indices = []
        for idx, face in enumerate(faces, start=1):
            try:
                if hasattr(face, "geom_type") and "CYLINDER" in str(face.geom_type).upper():
                    r = face.radius
                    if min_radius <= r <= max_radius:
                        matched_indices.append(idx)
            except Exception:
                continue

        return matched_indices

    @staticmethod
    def find_face_by_proximity(
        faces: List[any],
        target_centroid: Tuple[float, float, float],
        distance_tolerance: float = 1.0,
    ) -> Optional[int]:
        """
        Fuzzy centroid matching: finds the face whose center of mass is closest to target_centroid.
        """
        target = np.array(target_centroid, dtype=float)
        best_idx = None
        best_dist = float("inf")

        for idx, face in enumerate(faces, start=1):
            try:
                if hasattr(face, "center"):
                    pt = np.array(face.center().to_tuple(), dtype=float)
                    dist = np.linalg.norm(pt - target)
                    if dist < best_dist and dist <= distance_tolerance:
                        best_dist = dist
                        best_idx = idx
            except Exception:
                continue

        return best_idx
