"""
MechaStudio 3D FEA Post-Processing and Viewport Generator
Provides interactive 3D rendering for VS Code Webview (glTF/ThreeJS/VTK) and desktop viewports.
"""

import os
from typing import Optional, List, Dict, Any, Tuple
import numpy as np
import pyvista as pv


class FeaResultViewer:
    def __init__(self, vtu_path: str):
        if not os.path.exists(vtu_path):
            raise FileNotFoundError(f"VTU file not found: {vtu_path}")
        self.vtu_path = os.path.abspath(vtu_path)
        self.mesh = pv.read(self.vtu_path)

    def get_available_fields(self) -> Dict[str, List[str]]:
        """Returns available point and cell scalar/vector fields."""
        return {
            "point_fields": list(self.mesh.point_data.keys()),
            "cell_fields": list(self.mesh.cell_data.keys())
        }

    def create_deformed_mesh(self, scale_factor: float = 1.0, disp_array_name: str = "DISP") -> pv.UnstructuredGrid:
        """
        Creates a new mesh deformed by the displacement field vector.
        """
        for candidate in [disp_array_name, "U", "disp"]:
            if candidate in self.mesh.point_data:
                disp_array_name = candidate
                break

        if disp_array_name in self.mesh.point_data:
            return self.mesh.warp_by_vector(disp_array_name, factor=scale_factor)
        return self.mesh.copy()

    def export_gltf(
        self,
        output_gltf_path: str,
        scalar_field: Optional[str] = "STRESS_VM",
        warp_scale: float = 1.0,
        colormap: str = "turbo",
    ) -> str:
        """
        Exports the 3D deformed finite element surface mesh into standard glTF 2.0.
        Can be loaded with 60 FPS hardware acceleration in any Webview or Three.js scene.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_gltf_path)), exist_ok=True)
        deformed_mesh = self.create_deformed_mesh(scale_factor=warp_scale)

        plotter = pv.Plotter(notebook=False, off_screen=True)
        plotter.set_background("#1e1e1e")

        if scalar_field and scalar_field in deformed_mesh.point_data:
            plotter.add_mesh(
                deformed_mesh,
                scalars=scalar_field,
                cmap=colormap,
                show_edges=True,
                edge_color="#333333",
            )
        else:
            plotter.add_mesh(deformed_mesh, color="#007acc", show_edges=True)

        plotter.export_gltf(output_gltf_path)
        plotter.close()
        return output_gltf_path

    def export_screenshot(
        self,
        output_png_path: str,
        scalar_field: Optional[str] = "STRESS_VM",
        warp_scale: float = 1.0,
        colormap: str = "turbo",
        window_size: Tuple[int, int] = (1280, 720),
    ) -> str:
        """
        Renders an off-screen high-resolution 3D screenshot with color bar and deformed warp.
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_png_path)), exist_ok=True)
        deformed_mesh = self.create_deformed_mesh(scale_factor=warp_scale)

        plotter = pv.Plotter(notebook=False, off_screen=True, window_size=window_size)
        plotter.set_background("#1e1e1e")

        if scalar_field and scalar_field in deformed_mesh.point_data:
            plotter.add_mesh(
                deformed_mesh,
                scalars=scalar_field,
                cmap=colormap,
                show_edges=True,
                edge_color="#333333",
                scalar_bar_args={
                    "title": f"{scalar_field} (MPa)",
                    "color": "white",
                    "position_x": 0.85,
                    "position_y": 0.15,
                    "height": 0.7,
                    "width": 0.08,
                    "title_font_size": 14,
                    "label_font_size": 12,
                }
            )
        else:
            plotter.add_mesh(deformed_mesh, color="#007acc", show_edges=True)

        plotter.add_axes()
        plotter.camera_position = "iso"
        plotter.screenshot(output_png_path)
        plotter.close()
        return output_png_path

    def show_desktop_viewport(
        self,
        scalar_field: Optional[str] = "STRESS_VM",
        warp_scale: float = 1.0,
        colormap: str = "turbo",
    ):
        """
        Launches an interactive desktop 3D OpenGL viewport window.
        """
        deformed_mesh = self.create_deformed_mesh(scale_factor=warp_scale)
        plotter = pv.Plotter(title="MechaStudio - 3D FEA Simulation Viewport")
        plotter.set_background("#1e1e1e")

        if scalar_field and scalar_field in deformed_mesh.point_data:
            plotter.add_mesh(
                deformed_mesh,
                scalars=scalar_field,
                cmap=colormap,
                show_edges=True,
                edge_color="#333333",
                scalar_bar_args={"title": f"{scalar_field} (MPa)", "color": "white"}
            )
        else:
            plotter.add_mesh(deformed_mesh, color="#007acc", show_edges=True)

        plotter.add_axes()
        plotter.camera_position = "iso"
        plotter.show()
