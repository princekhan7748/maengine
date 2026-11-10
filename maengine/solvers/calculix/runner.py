"""
CalculiX Process Runner & Telemetry Monitor
Executes ccx asynchronously, streams real-time convergence diagnostics, and triggers VTK conversion.
"""

import os
import subprocess
import threading
from typing import Callable, Optional, Dict, Any, List


class CalculixRunner:
    def __init__(self, ccx_binary_path: Optional[str] = None):
        if ccx_binary_path is None:
            # Check local bin/ccx.exe, then environment, then PATH
            local_bin = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                "bin",
                "ccx.exe" if os.name == "nt" else "ccx"
            )
            if os.path.exists(local_bin):
                ccx_binary_path = local_bin
            else:
                ccx_binary_path = os.environ.get("CCX_PATH", "ccx")

        self.ccx_path = ccx_binary_path

    def run_job(
        self,
        job_dir: str,
        job_name: str,
        on_output_line: Optional[Callable[[str], None]] = None,
        on_residual: Optional[Callable[[Dict[str, float]], None]] = None,
        timeout_seconds: Optional[int] = 600,
    ) -> Dict[str, Any]:
        """
        Executes 'ccx -i <job_name>' inside job_dir.
        Captures output, detects convergence/divergence, and returns summary stats.
        """
        cmd = [self.ccx_path, "-i", job_name]
        
        # Environmental tuning for CalculiX multithreading
        env = os.environ.copy()
        if "OMP_NUM_THREADS" not in env:
            # Default to all physical cores
            cpu_count = os.cpu_count() or 4
            env["OMP_NUM_THREADS"] = str(cpu_count)
            env["CCX_NPROC_RESULTS"] = str(cpu_count)

        proc = subprocess.Popen(
            cmd,
            cwd=job_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env,
        )

        output_lines: List[str] = []
        is_completed = False
        error_message = None

        for line in iter(proc.stdout.readline, ""):
            output_lines.append(line)
            if on_output_line:
                on_output_line(line)

            # Telemetry parsing: check for convergence lines
            line_str = line.strip()
            if "JOB COMPLETED" in line_str:
                is_completed = True
            elif "ERROR in" in line_str or "FATAL ERROR" in line_str:
                error_message = line_str

            # Parse Newton-Raphson iteration residual if present
            # E.g. "average force= ... largest residual force= ..."
            if on_residual and "residual force" in line_str.lower():
                try:
                    parts = line_str.split("=")
                    res_val = float(parts[-1].strip().split()[0])
                    on_residual({"residual": res_val})
                except Exception:
                    pass

        proc.stdout.close()
        return_code = proc.wait(timeout=timeout_seconds)

        frd_file = os.path.join(job_dir, f"{job_name}.frd")
        dat_file = os.path.join(job_dir, f"{job_name}.dat")
        sta_file = os.path.join(job_dir, f"{job_name}.sta")

        has_results = os.path.exists(frd_file) and os.path.getsize(frd_file) > 0

        return {
            "success": is_completed or (return_code == 0 and has_results),
            "return_code": return_code,
            "has_results": has_results,
            "frd_file": frd_file if has_results else None,
            "dat_file": dat_file if os.path.exists(dat_file) else None,
            "sta_file": sta_file if os.path.exists(sta_file) else None,
            "error": error_message if not (is_completed or return_code == 0) else None,
            "output_tail": output_lines[-20:] if output_lines else [],
        }

