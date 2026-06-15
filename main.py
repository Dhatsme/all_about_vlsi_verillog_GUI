from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import subprocess, tempfile, os, shutil, json, datetime, logging, platform, glob, urllib.request, urllib.error

app = FastAPI(title="AllAboutVLSI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REQUEST MODELS ──────────────────────────────────────────────────────────────────────────────

class SimRequest(BaseModel):
    design:        str
    testbench:     str
    tool:          str  = "iverilog"   # "iverilog" | "verilator"
    extra_flags:   list = []           # Verilator flags chosen in the GUI
    use_uvm:       bool = False        # enable UVM library
    uvm_test:      str  = ""          # +UVM_TESTNAME value
    uvm_verbosity: str  = "UVM_MEDIUM" # +UVM_VERBOSITY value

class FeedbackRequest(BaseModel):
    lesson_id: str = ""
    module_id: str = ""
    rating:    int = 0    # 1–5; 0 = no rating
    comment:   str = ""

# ── C++ HARNESSES ─────────────────────────────────────────────────────────────────────────────
#
# NO-TIMING harness — works with Verilator 4.x and 5.x.
# Uses a manual counter as the VCD timestamp; #delays are stripped by --no-timing.
SIM_MAIN_NO_TIMING = r"""
#include "Vtb.h"
#include "verilated.h"
#include "verilated_vcd_c.h"

int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);
    Vtb* const top = new Vtb;

    Verilated::traceEverOn(true);
    VerilatedVcdC* const tfp = new VerilatedVcdC;
    top->trace(tfp, 99);
    tfp->open("wave.vcd");

    unsigned long long sim_time = 0;
    while (!Verilated::gotFinish() && sim_time < 1000000ULL) {
        top->eval();
        tfp->dump(sim_time++);
    }

    top->final();
    tfp->close();
    delete tfp;
    delete top;
    return 0;
}
"""

# TIMING harness — requires Verilator 5.x (VerilatedContext API).
# Used for --timing mode and UVM (which needs real time semantics).
# MAX_SIM_TIME is overridden for UVM compilations via a -D define.
SIM_MAIN_TIMING = r"""
#include "Vtb.h"
#include "verilated.h"
#include "verilated_vcd_c.h"

#ifndef MAX_SIM_TIME
#define MAX_SIM_TIME 10000000ULL   /* 10 M ticks — override with -DMAX_SIM_TIME=N */
#endif

int main(int argc, char** argv) {
    VerilatedContext* const contextp = new VerilatedContext;
    contextp->commandArgs(argc, argv);   /* forwards +UVM_TESTNAME, etc. */
    Vtb* const top = new Vtb{contextp};

    Verilated::traceEverOn(true);
    VerilatedVcdC* const tfp = new VerilatedVcdC;
    top->trace(tfp, 99);
    tfp->open("wave.vcd");

    while (!contextp->gotFinish() && contextp->time() < MAX_SIM_TIME) {
        contextp->timeInc(1);
        top->eval();
        tfp->dump(contextp->time());
    }

    top->final();
    tfp->close();
    delete tfp;
    delete top;
    delete contextp;
    return 0;
}
"""

# ── macOS: fix missing C++ stdlib headers ─────────────────────────────────────────────────────
# Homebrew Verilator on macOS can't find <cstdint> because libc++ headers
# live inside the Xcode SDK, not in /usr/include/c++.  We detect the SDK
# path once at startup and pass it to every verilator invocation via --CFLAGS.
_MAC_CXX_INCLUDE: str | None = None
if platform.system() == "Darwin":
    try:
        sdk = subprocess.check_output(
            ["xcrun", "--show-sdk-path"], text=True, timeout=5
        ).strip()
        cand = os.path.join(sdk, "usr/include/c++/v1")
        if os.path.isdir(cand):
            _MAC_CXX_INCLUDE = cand
    except Exception:
        pass
    if not _MAC_CXX_INCLUDE:
        for p in sorted(
            glob.glob(
                "/Library/Developer/CommandLineTools/SDKs/MacOSX*.sdk"
                "/usr/include/c++/v1"
            ),
            reverse=True,
        ):
            if os.path.isdir(p):
                _MAC_CXX_INCLUDE = p
                break

def _mac_cflags() -> list[str]:
    return ["--CFLAGS", f"-I{_MAC_CXX_INCLUDE}"] if _MAC_CXX_INCLUDE else []

# ── UVM DETECTION ──────────────────────────────────────────────────────────────────────────────

def _uvm_info() -> dict:
    """Check whether the UVM library is accessible and return metadata."""
    uvm_home = os.environ.get("UVM_HOME", "").strip()
    if not uvm_home:
        return {"available": False, "home": "", "reason": "UVM_HOME not set"}
    pkg = os.path.join(uvm_home, "src", "uvm_pkg.sv")
    if not os.path.exists(pkg):
        return {
            "available": False,
            "home": uvm_home,
            "reason": f"uvm_pkg.sv not found at {pkg}",
        }
    return {"available": True, "home": uvm_home, "reason": ""}

# ── VERILATOR VERSION ───────────────────────────────────────────────────────────────────────────

def _verilator_version() -> dict:
    if not shutil.which("verilator"):
        return {"available": False, "version": None, "major": 0}
    try:
        r = subprocess.run(
            ["verilator", "--version"], capture_output=True, text=True, timeout=5
        )
        ver_str = r.stdout.strip().split("\n")[0]   # "Verilator 5.046 ..."
        parts = ver_str.split()
        ver = parts[1] if len(parts) > 1 else "unknown"
        major = int(ver.split(".")[0]) if ver and ver[0].isdigit() else 0
        return {"available": True, "version": ver_str, "major": major}
    except Exception:
        return {"available": True, "version": "unknown", "major": 0}

# ── INFO ENDPOINTS ──────────────────────────────────────────────────────────────────────────────

@app.get("/verilator-info")
def verilator_info():
    return _verilator_version()

@app.get("/uvm-info")
def uvm_info():
    info = _uvm_info()
    info.update(_verilator_version())
    return info

# ── FEEDBACK ──────────────────────────────────────────────────────────────────

_DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1515914856039977180/v3E209U8tqNY3ZCkd2EKAbqwlVuaLryaFAylGI207gjFHIgyJoRCxDNXcgKBVxzvO7Cw"

def _post_to_discord(entry: dict) -> None:
    stars = "★" * entry["rating"] + "☆" * (5 - entry["rating"]) if entry["rating"] else "no rating"
    msg = (
        f"**New Feedback** {stars}\n"
        f"**Module:** {entry['module']} | **Lesson:** {entry['lesson']}\n"
        f"**Comment:** {entry['comment'] or '_(none)_'}\n"
        f"**Time:** {entry['ts']}"
    )
    payload = json.dumps({"content": msg}).encode()
    try:
        urllib.request.urlopen(
            urllib.request.Request(
                _DISCORD_WEBHOOK, payload,
                {"Content-Type": "application/json"}
            ), timeout=10
        )
    except Exception:
        pass  # never let Discord failure break the user's submit

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
    _post_to_discord(entry)
    return {"ok": True}

# ── SIMULATION ───────────────────────────────────────────────────────────────────────────────────

@app.post("/simulate")
def simulate(req: SimRequest):
    has_iverilog  = shutil.which("iverilog")  is not None
    has_verilator = shutil.which("verilator") is not None

    tool = req.tool
    if tool == "verilator" and not has_verilator:
        return {"success": False,
                "output": "ERROR: verilator not found on this server.", "vcd": ""}
    if tool == "iverilog" and not has_iverilog:
        return {"success": False,
                "output": "ERROR: iverilog not found on this server.", "vcd": ""}

    # UVM pre-check
    if tool == "verilator" and req.use_uvm:
        uvm = _uvm_info()
        if not uvm["available"]:
            return {
                "success": False,
                "output": (
                    f"ERROR: UVM library not available — {uvm['reason']}.\n"
                    "Set the UVM_HOME environment variable to the uvm-verilator "
                    "install directory (see Dockerfile for setup instructions)."
                ),
                "vcd": "",
            }

    with tempfile.TemporaryDirectory() as tmp:
        ext = "sv" if tool == "verilator" else "v"
        d   = os.path.join(tmp, f"design.{ext}")
        tb  = os.path.join(tmp, f"tb.{ext}")
        out = os.path.join(tmp, "sim")
        vcd = os.path.join(tmp, "wave.vcd")

        tb_content     = req.testbench
        design_content = req.design

        if tool == "verilator":
            # Inject `timescale to suppress TIMESCALEMOD warnings
            if "`timescale" not in design_content:
                design_content = "`timescale 1ns/1ps\n" + design_content
            if "`timescale" not in tb_content:
                tb_content = "`timescale 1ns/1ps\n" + tb_content
            # VCD is owned by the C++ harness — never inject $dumpfile here
        else:
            # iverilog: inject $dumpfile / $dumpvars if the user hasn't added them
            if "$dumpfile" not in tb_content:
                dump_block = (
                    '\ninitial begin '
                    '$dumpfile("wave.vcd"); $dumpvars(0,tb); '
                    'end\n'
                )
                idx = tb_content.rfind("endmodule")
                tb_content = (
                    tb_content[:idx] + dump_block + tb_content[idx:]
                    if idx != -1 else tb_content + dump_block
                )

        with open(d,  "w") as f: f.write(design_content)
        with open(tb, "w") as f: f.write(tb_content)

        # ── VERILATOR ─────────────────────────────────────────────────────────────────────────────
        if tool == "verilator":
            # Sanitise user flags — allow dash-prefixed tokens only
            safe_extra = [
                f for f in req.extra_flags
                if isinstance(f, str) and f.startswith("-")
            ]

            # --lint-only is incompatible with --cc --exe --build
            lint_only  = "--lint-only" in safe_extra
            safe_extra = [f for f in safe_extra if f != "--lint-only"]

            # Timing flag
            use_timing = "--timing" in safe_extra or req.use_uvm
            if use_timing:
                timing_flag = "--timing"
                safe_extra  = [f for f in safe_extra
                               if f not in ("--timing", "--no-timing")]
            else:
                timing_flag = "--no-timing"
                safe_extra  = [f for f in safe_extra if f != "--no-timing"]

            # --trace-fst unsupported by our VCD harness
            safe_extra = [f for f in safe_extra if f != "--trace-fst"]

            # Default suppressions (always applied)
            default_warn = ["--Wno-TIMESCALEMOD", "--Wno-STMTDLY"]

            # UVM adds extra suppressions needed to compile uvm_pkg cleanly
            if req.use_uvm:
                default_warn += [
                    "--Wno-fatal",          # don't promote warnings to errors
                    "--Wno-REALCVT",
                    "--Wno-CONSTRAINTIGN",
                    "--Wno-MULTIDRIVEN",
                    "--Wno-MODDUP",
                    "--Wno-UNPACKED",
                    "--Wno-BLKANDNBLK",
                    "--Wno-WIDTHTRUNC",     # common in UVM macros
                    "--Wno-WIDTHEXPAND",
                    "--Wno-CASEINCOMPLETE",
                    "--Wno-UNOPTFLAT",
                    "--Wno-CASTCONST",      # UVM $cast used polymorphically; Verilator flags as always-true/false
                    "--Wno-MISINDENT",      # indentation style warnings in UVM library source
                ]

            # Don't duplicate defaults the user already supplied
            safe_extra = [f for f in safe_extra if f not in default_warn]

            # ── Lint-only ────────────────────────────────────────────────────────────────────────────
            if lint_only:
                lint_cmd = [
                    "verilator", "--lint-only", "--sv",
                    timing_flag, *default_warn, *_mac_cflags(), *safe_extra,
                    f"design.{ext}", f"tb.{ext}",
                ]
                v = subprocess.run(
                    lint_cmd, capture_output=True, text=True,
                    timeout=30, cwd=tmp,
                )
                output = (v.stderr + v.stdout).strip() or "Lint OK — no issues found."
                return {"success": v.returncode == 0, "output": output, "vcd": ""}

            # ── Choose C++ harness ──────────────────────────────────────────────────────────────────────────
            if use_timing:
                # UVM simulations may run longer — raise the tick ceiling
                max_ticks = 100_000_000 if req.use_uvm else 10_000_000
                harness = SIM_MAIN_TIMING.replace(
                    "/* 10 M ticks — override with -DMAX_SIM_TIME=N */",
                    f"/* {max_ticks // 1_000_000} M ticks */"
                )
                # Patch the actual #define value
                harness = harness.replace(
                    "10000000ULL", f"{max_ticks}ULL"
                )
            else:
                harness = SIM_MAIN_NO_TIMING

            cpp = os.path.join(tmp, "sim_main.cpp")
            with open(cpp, "w") as f:
                f.write(harness)

            # ── Build verilator command ────────────────────────────────────────────────────────────────────────
            uvm_flags: list[str] = []
            if req.use_uvm:
                uvm_home = os.environ["UVM_HOME"]
                uvm_flags = [
                    f"+incdir+{uvm_home}/src",
                ]
                uvm_src_file = os.path.join(uvm_home, "src", "uvm_pkg.sv")

            # Parallel C++ build jobs — 0 = use all available cores.
            # Makes a big difference for UVM (large generated C++).
            build_jobs = ["--build-jobs", "0"]

            v_cmd = [
                "verilator", "--cc", "--exe", "--build", "--sv", "--trace",
                timing_flag,
                *build_jobs,
                *default_warn,
                *_mac_cflags(),
                *uvm_flags,
                *safe_extra,
                "--top-module", "tb",
                "sim_main.cpp",
                *([] if not req.use_uvm else [uvm_src_file]),
                f"design.{ext}", f"tb.{ext}",
            ]

            compile_timeout = 300 if req.use_uvm else 30   # UVM pkg is large
            v = subprocess.run(
                v_cmd, capture_output=True, text=True,
                timeout=compile_timeout, cwd=tmp,
            )
            if v.returncode != 0:
                return {
                    "success": False,
                    "output": (v.stderr + v.stdout).strip(),
                    "vcd": "",
                }

            # ── Run simulation ────────────────────────────────────────────────────────────────────────────
            binary = os.path.join(tmp, "obj_dir", "Vtb")
            sim_args = [binary]
            if req.use_uvm:
                if req.uvm_test:
                    sim_args.append(f"+UVM_TESTNAME={req.uvm_test}")
                sim_args.append(f"+UVM_VERBOSITY={req.uvm_verbosity or 'UVM_MEDIUM'}")

            run_timeout = 60 if req.use_uvm else 15
            run = subprocess.run(
                sim_args, capture_output=True, text=True,
                timeout=run_timeout, cwd=tmp,
            )

        # ── IVERILOG ───────────────────────────────────────────────────────────────────────────────────
        else:
            compile_result = subprocess.run(
                ["iverilog", "-g2012", "-o", out, d, tb],
                capture_output=True, text=True, timeout=15, cwd=tmp,
            )
            if compile_result.returncode != 0:
                return {
                    "success": False,
                    "output": compile_result.stderr.strip(),
                    "vcd": "",
                }
            run = subprocess.run(
                ["vvp", out], capture_output=True, text=True,
                timeout=15, cwd=tmp,
            )

        vcd_content = open(vcd).read() if os.path.exists(vcd) else ""
        return {
            "success": run.returncode == 0,
            "output":  (run.stdout + run.stderr).strip(),
            "vcd":     vcd_content,
        }

# ── STATIC FILES ───────────────────────────────────────────────────────────────────────────────
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
