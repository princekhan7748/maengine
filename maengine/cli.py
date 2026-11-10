"""
MAEngine Command Line Interface (CLI)
Provides command-line entry points for meshing, solving, post-processing, and the Marketplace.
"""

import os
import sys
import argparse
from typing import Optional
from maengine import __version__
from maengine.pipeline import SimulationPipeline
from maengine.marketplace.registry import MarketplaceRegistry, TemplateCategory


def print_banner():
    banner = rf"""
  __  __          ______             _            
 |  \/  |   /\   |  ____|           (_)           
 | \  / |  /  \  | |__   _ __   __ _ _ _ __   ___ 
 | |\/| | / /\ \ |  __| | '_ \ / _` | | '_ \ / _ \
 | |  | |/ ____ \| |____| | | | (_| | | | | |  __/
 |_|  |_/_/    \_\______|_| |_|\__, |_|_| |_|\___|
                                __/ |             
                               |___/   v{__version__}
        Mechanical Analysis Engine (MAEngine)
"""
    print(banner)


def cmd_run(args):
    print(f"[*] Loading MAEngine simulation specification from: {args.yaml}")
    pipeline = SimulationPipeline.from_yaml(args.yaml, output_dir=args.output_dir)
    res = pipeline.run_all()
    print("\n[+] Simulation Pipeline Completed Successfully!")
    print(f"    - Inp Deck:      {res['inp_path']}")
    print(f"    - VTU Grid:      {res['vtu_path']}")
    print(f"    - glTF 3D Scene: {res['gltf_path']}")
    print(f"    - Screenshot:    {res['screenshot_path']}")
    print(f"    - Max Von Mises: {res['summary']['max_von_mises_stress']:.2f} MPa")
    print(f"    - Max Displ:     {res['summary']['max_displacement']:.4f} mm")


def cmd_mesh(args):
    print(f"[*] Meshing CAD geometry for project: {args.yaml}")
    pipeline = SimulationPipeline.from_yaml(args.yaml, output_dir=args.output_dir)
    stats = pipeline.generate_mesh()
    print(f"[+] Conformal 3D quadratic mesh generated at: {pipeline.mesh_path}")
    print(f"    - Nodes:    {stats.get('nodes', 'N/A')}")
    print(f"    - Elements: {stats.get('elements', 'N/A')}")


def cmd_solve(args):
    print(f"[*] Compiling deck and solving with CalculiX CrunchiX: {args.yaml}")
    pipeline = SimulationPipeline.from_yaml(args.yaml, output_dir=args.output_dir)
    pipeline.compile_solver_deck()
    res = pipeline.solve()
    if res.get("success", False):
        print(f"[+] CalculiX solver run completed. Results written to: {pipeline.frd_path}")
    else:
        print(f"[-] Solver failed: {res.get('error', 'Unknown error')}")


def cmd_post(args):
    print(f"[*] Post-processing CalculiX results: {args.yaml}")
    pipeline = SimulationPipeline.from_yaml(args.yaml, output_dir=args.output_dir)
    res = pipeline.post_process()
    print(f"[+] Post-processing completed. 3D glTF model generated at: {res['gltf_path']}")


def cmd_view(args):
    target_file = os.path.abspath(args.file)
    if not os.path.exists(target_file):
        print(f"[-] Error: Target file '{target_file}' not found.")
        sys.exit(1)

    print(f"[*] Inspecting simulation asset: {target_file}")
    ext = os.path.splitext(target_file)[1].lower()
    file_size_kb = os.path.getsize(target_file) / 1024.0
    print(f"    File type: {ext}")
    print(f"    File size: {file_size_kb:.2f} KB")

    if ext == ".vtu":
        try:
            from maengine.post.viewer import FeaResultViewer
            viewer = FeaResultViewer(target_file)
            print(f"    Number of Points:   {viewer.mesh.n_points}")
            print(f"    Number of Cells:    {viewer.mesh.n_cells}")
            print(f"    Available Fields:   {list(viewer.mesh.point_data.keys())}")
            print(f"    Bounds:             {viewer.mesh.bounds}")
            if getattr(args, "interactive", False):
                print("[*] Opening interactive 3D viewport window...")
                viewer.show_desktop_viewport(warp_scale=getattr(args, "warp", 1.0))
        except Exception as e:
            print(f"    [!] Could not parse VTU metadata: {e}")
    elif ext == ".gltf":
        print(f"    Ready for WebGL / Three.js hardware-accelerated rendering in VS Code.")


def cmd_app(args):
    print("[*] Launching MAEngine Mechanical Engineering IDE (VS Code Environment)...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ext_path = os.path.join(base_dir, "vscode-extension")
    workspace_path = os.path.abspath(args.workspace or base_dir)

    import subprocess
    cmd = f'code --extensionDevelopmentPath="{ext_path}" "{workspace_path}"'
    print(f"[*] Command: {cmd}")
    subprocess.Popen(cmd, shell=True)
    print("[+] MAEngine IDE Extension Development Host dispatched!")


def cmd_marketplace(args):
    registry = MarketplaceRegistry()

    if args.mp_action == "list":
        packages = registry.get_all_packages()
        print("\n" + "=" * 80)
        print(f"{'STATUS':<12} | {'PACKAGE ID':<30} | {'CATEGORY':<20} | {'SOLVER':<10}")
        print("=" * 80)
        for p in packages:
            status = "[INSTALLED]" if p.is_installed else "[AVAILABLE]"
            print(f"{status:<12} | {p.id:<30} | {p.category.value:<20} | {p.solver:<10}")
            print(f"             Name: {p.name}")
            print(f"             Desc: {p.description}")
            print(f"             Tags: {', '.join(p.tags)}")
            print("-" * 80)

    elif args.mp_action == "search":
        if not args.query:
            print("[-] Please provide a search query keyword.")
            return
        results = registry.search(args.query)
        print(f"\n[*] Found {len(results)} package(s) matching '{args.query}':\n")
        for p in results:
            status = "[INSTALLED]" if p.is_installed else "[AVAILABLE]"
            print(f"  {status} {p.id} (v{p.version})")
            print(f"      {p.name} - {p.solver}")
            print(f"      {p.description}\n")

    elif args.mp_action == "install":
        if not args.package_id:
            print("[-] Please specify a package id to install, e.g. 'structural.contact_mortar'")
            return
        print(f"[*] Installing package '{args.package_id}' from MAEngine Marketplace...")
        try:
            registry.install_package(args.package_id)
            print(f"[+] Package '{args.package_id}' installed successfully!")
        except Exception as e:
            print(f"[-] Installation failed: {e}")

    elif args.mp_action == "uninstall":
        if not args.package_id:
            print("[-] Please specify a package id to uninstall.")
            return
        print(f"[*] Uninstalling package '{args.package_id}'...")
        try:
            registry.uninstall_package(args.package_id)
            print(f"[+] Package '{args.package_id}' uninstalled.")
        except Exception as e:
            print(f"[-] Uninstallation failed: {e}")

    elif args.mp_action == "export-json":
        print(registry.export_registry_json())


def cmd_version(args):
    print_banner()
    print(f"MAEngine Core:  {__version__}")
    print(f"Python:            {sys.version.split()[0]}")

    # Check CalculiX binary
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ccx_path = os.path.join(base_dir, "bin", "ccx.exe")
    ccx_status = "Available (Bundled)" if os.path.exists(ccx_path) else "Not Found"
    print(f"CalculiX CrunchiX: {ccx_status} at {ccx_path}")

    # Check Gmsh
    try:
        import gmsh
        print(f"Gmsh Mesh Engine:  Available (v{gmsh.__version__ if hasattr(gmsh, '__version__') else 'API'})")
    except ImportError:
        print("Gmsh Mesh Engine:  Not Installed")

    # Check VTK / PyVista
    try:
        import vtk
        print(f"VTK Graphics:      Available (v{vtk.vtkVersion.GetVTKVersion()})")
    except ImportError:
        print("VTK Graphics:      Not Installed")


def main():
    parser = argparse.ArgumentParser(
        prog="maengine",
        description="MAEngine - Open-Source Mechanical Engineering IDE CLI",
    )
    subparsers = parser.add_subparsers(dest="command", help="MAEngine Subcommands")

    # Command: run
    p_run = subparsers.add_parser("run", help="Run complete end-to-end simulation pipeline")
    p_run.add_argument("yaml", help="Path to simulation YAML specification file")
    p_run.add_argument("--output-dir", "-o", default=None, help="Custom output directory")
    p_run.set_defaults(func=cmd_run)

    # Command: mesh
    p_mesh = subparsers.add_parser("mesh", help="Mesh CAD model using Gmsh engine")
    p_mesh.add_argument("yaml", help="Path to simulation YAML specification file")
    p_mesh.add_argument("--output-dir", "-o", default=None, help="Custom output directory")
    p_mesh.set_defaults(func=cmd_mesh)

    # Command: solve
    p_solve = subparsers.add_parser("solve", help="Compile input deck and run CalculiX solver")
    p_solve.add_argument("yaml", help="Path to simulation YAML specification file")
    p_solve.add_argument("--output-dir", "-o", default=None, help="Custom output directory")
    p_solve.set_defaults(func=cmd_solve)

    # Command: post
    p_post = subparsers.add_parser("post", help="Post-process CalculiX .frd results into VTU and glTF")
    p_post.add_argument("yaml", help="Path to simulation YAML specification file")
    p_post.add_argument("--output-dir", "-o", default=None, help="Custom output directory")
    p_post.set_defaults(func=cmd_post)

    # Command: view
    p_view = subparsers.add_parser("view", help="Inspect and display metadata of 3D simulation assets")
    p_view.add_argument("file", help="Path to .vtu, .gltf, or .inp file")
    p_view.add_argument("--interactive", "-i", action="store_true", help="Launch interactive 3D desktop viewport window")
    p_view.add_argument("--warp", "-w", type=float, default=1.0, help="Deformation warp scaling factor")
    p_view.set_defaults(func=cmd_view)

    # Command: app
    p_app = subparsers.add_parser("app", help="Launch MAEngine IDE (VS Code Environment)")
    p_app.add_argument("--workspace", "-w", default=None, help="Path to workspace folder")
    p_app.set_defaults(func=cmd_app)

    # Command: marketplace
    p_mp = subparsers.add_parser("marketplace", help="Search, install, and manage simulation packages")
    mp_subs = p_mp.add_subparsers(dest="mp_action", help="Marketplace Actions")

    mp_list = mp_subs.add_parser("list", help="List all catalog and installed packages")
    mp_list.set_defaults(func=cmd_marketplace)

    mp_search = mp_subs.add_parser("search", help="Search marketplace packages by keyword")
    mp_search.add_argument("query", help="Keyword or tag to search")
    mp_search.set_defaults(func=cmd_marketplace)

    mp_install = mp_subs.add_parser("install", help="Download and install a package")
    mp_install.add_argument("package_id", help="ID of the package to install")
    mp_install.set_defaults(func=cmd_marketplace)

    mp_uninstall = mp_subs.add_parser("uninstall", help="Uninstall a package")
    mp_uninstall.add_argument("package_id", help="ID of the package to uninstall")
    mp_uninstall.set_defaults(func=cmd_marketplace)

    mp_export = mp_subs.add_parser("export-json", help="Export full catalog JSON")
    mp_export.set_defaults(func=cmd_marketplace)

    # Command: version
    p_ver = subparsers.add_parser("version", help="Print MAEngine version and environment status")
    p_ver.set_defaults(func=cmd_version)

    args = parser.parse_args()
    if not hasattr(args, "func"):
        print_banner()
        parser.print_help()
        sys.exit(0)

    args.func(args)


if __name__ == "__main__":
    main()
