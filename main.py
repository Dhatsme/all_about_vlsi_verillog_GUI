from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import subprocess, tempfile, os, shutil, json, datetime, logging

app = FastAPI(title="AllAboutVLSI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimRequest(BaseModel):
    design:      str
    testbench:   str
    tool:        str  = "iverilog"   # "iverilog" | "verilator"
    extra_flags: list = []           # extra verilator flags from the UI

class FeedbackRequest(BaseModel):
    lesson_id: str  = ""
    module_id: str  = ""
    rating:    int  = 0    # 1–5 stars; 0 = no rating given
    comment:   str  = ""

SIM_MAIN_CPP = """
#include "Vtb.h"
#include "verilated.h"
#include <iostream>
int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);
    Vtb* top = new Vtb;
    while (!Verilated::gotFinish()) {
        top->eval();
    }
    delete top;
    return 0;
}
"""

# ── FEEDBACK ──────────────────────────────────────────────────────────────────
@app.post("/feedback")
def submit_feedback(req: FeedbackRequest):
    entry = {
        "ts":      datetime.datetime.utcnow().isoformat(),
        "module":  req.module_id,
        "lesson":  req.lesson_id,
        "rating":  req.rating,
        "comment": req.comment,
    }
    with open("feedback.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")
    return {"ok": True}

# ── SIMULATION ────────────────────────────────────────────────────────────────
@app.post("/simulate")
def simulate(req: SimRequest):
    has_iverilog  = shutil.which("iverilog")  is not None
    has_verilator = shutil.which("verilator") is not None

    tool = req.tool
    if tool == "verilator" and not has_verilator:
        return {"success": False, "output": "ERROR: verilator not found on this server.", "vcd": ""}
    if tool == "iverilog" and not has_iverilog:
        return {"success": False, "output": "ERROR: iverilog not found on this server.", "vcd": ""}

    with tempfile.TemporaryDirectory() as tmp:
        ext = "sv" if tool == "verilator" else "v"
        d   = os.path.join(tmp, f"design.{ext}")
        tb  = os.path.join(tmp, f"tb.{ext}")
        out = os.path.join(tmp, "sim")
        vcd = os.path.join(tmp, "wave.vcd")

        # ── auto-inject $dumpfile if missing ──────────────────────────────────
        tb_content = req.testbench
        if "$dumpfile" not in tb_content:
            dump_block = '\ninitial begin $dumpfile("wave.vcd"); $dumpvars(0,tb); end\n'
            idx = tb_content.rfind("endmodule")
            if idx != -1:
                tb_content = tb_content[:idx] + dump_block + tb_content[idx:]
            else:
                tb_content += dump_block

        # ── for verilator: inject `timescale into design if missing ───────────
        # prevents TIMESCALEMOD warning (tb has `timescale, design does not)
        design_content = req.design
        if tool == "verilator" and "`timescale" not in design_content:
            design_content = "`timescale 1ns/1ps\n" + design_content

        open(d,  "w").write(design_content)
        open(tb, "w").write(tb_content)

        # ── VERILATOR ─────────────────────────────────────────────────────────
        if tool == "verilator":
            cpp = os.path.join(tmp, "sim_main.cpp")
            open(cpp, "w").write(SIM_MAIN_CPP)

            # sanitise user flags — only allow dash-prefixed tokens
            safe_extra = [
                f for f in req.extra_flags
                if isinstance(f, str) and f.startswith("-")
            ]

            # resolve timing flag: default --no-timing (strips #delays, avoids
            # NEEDTIMINGOPT).  User can override to --timing via the flags input.
            if "--timing" in safe_extra:
                timing_flag = "--timing"
                safe_extra  = [f for f in safe_extra if f not in ("--timing", "--no-timing")]
            else:
                timing_flag = "--no-timing"
                safe_extra  = [f for f in safe_extra if f != "--no-timing"]

            v_cmd = [
                "verilator", "--cc", "--exe", "--build", "--sv",
                timing_flag,
                *safe_extra,
                "--top-module", "tb",
                "sim_main.cpp", f"design.{ext}", f"tb.{ext}",
            ]

            v = subprocess.run(
                v_cmd, capture_output=True, text=True, timeout=30, cwd=tmp
            )
            if v.returncode != 0:
                return {"success": False, "output": v.stderr.strip(), "vcd": ""}

            binary = os.path.join(tmp, "obj_dir", "Vtb")
            run = subprocess.run(
                [binary], capture_output=True, text=True, timeout=15, cwd=tmp
            )

        # ── IVERILOG ──────────────────────────────────────────────────────────
        else:
            compile_result = subprocess.run(
                ["iverilog", "-g2012", "-o", out, d, tb],
                capture_output=True, text=True, timeout=15, cwd=tmp
            )
            if compile_result.returncode != 0:
                return {"success": False, "output": compile_result.stderr.strip(), "vcd": ""}

            run = subprocess.run(
                ["vvp", out], capture_output=True, text=True, timeout=15, cwd=tmp
            )

        vcd_content = open(vcd).read() if os.path.exists(vcd) else ""

        return {
            "success": run.returncode == 0,
            "output":  (run.stdout + run.stderr).strip(),
            "vcd":     vcd_content,
        }

# ── STATIC FILES ──────────────────────────────────────────────────────────────
_static_dir = Path(__file__).parent / "static"
if not _static_dir.is_dir():
    logging.error(
        "static/ directory not found at %s — creating an empty fallback. "
        "The frontend will not render correctly until static files are present.",
        _static_dir,
    )
    _static_dir.mkdir(parents=True, exist_ok=True)
else:
    logging.info("static/ directory found at %s — mounting frontend.", _static_dir)

# serve static frontend — must be last
app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
