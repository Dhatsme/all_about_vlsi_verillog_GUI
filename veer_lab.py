"""
VeeR EL2 Lab — backend for static/veer.html

Two experiments on the open-source VeeR EL2 RISC-V core (CHIPS Alliance):

  1. CPU run   — run a prebuilt Verilator model of VeeR EL2 on one of the
                 bundled test programs (hello_world, dhry, cmark, ...).
                 Cheap (~0.2-5 s), runs in parallel in a temp folder.

  2. UVM run   — rebuild and run the DCCM (data memory) UVM testbench with
                 the learner's edited testbench files. The testbench was
                 prebuilt in the Docker image, so an edit rebuilds in tens of
                 seconds thanks to make + ccache. Runs are serialised with a
                 lock because they share one build folder.

Everything is located through environment variables so the same code works
in the Docker image and on a dev machine:

  VEER_ROOT          VeeR EL2 checkout                (default /opt/veer)
  VEER_VERILATOR_BIN folder with the Verilator used   (default /opt/verilator-veer/bin)
                     for VeeR (5.052, separate from the system Verilator
                     that the other lessons use)
  VEER_CPU_EXE       prebuilt CPU model executable    (default /opt/veer-runs/hello/obj_dir/Vtb_top)
  VEER_UVM_ROOT      Antmicro's Verilator-patched UVM (default $VEER_ROOT/testbench/uvm/mem/uvm)
  VEER_UVM_PRISTINE  untouched copy of the testbench  (default $VEER_ROOT/testbench/uvm/mem/hdl.pristine)
                     hdl/ folder, used to reset files
"""

from __future__ import annotations

import os
import re
import shutil
import signal
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/veer", tags=["veer"])

# ── locations ─────────────────────────────────────────────────────────────────
VEER_ROOT = Path(os.environ.get("VEER_ROOT", "/opt/veer"))
VEER_VERILATOR_BIN = os.environ.get("VEER_VERILATOR_BIN", "/opt/verilator-veer/bin")
VEER_CPU_EXE = Path(os.environ.get("VEER_CPU_EXE", "/opt/veer-runs/hello/obj_dir/Vtb_top"))
HEX_DIR = VEER_ROOT / "testbench" / "hex" / "user_mode0"
UVM_DIR = VEER_ROOT / "testbench" / "uvm" / "mem"
UVM_HDL = UVM_DIR / "hdl"
UVM_ROOT = Path(os.environ.get("VEER_UVM_ROOT", str(UVM_DIR / "uvm")))
UVM_PRISTINE = Path(os.environ.get("VEER_UVM_PRISTINE", str(UVM_DIR / "hdl.pristine")))

# ── limits ────────────────────────────────────────────────────────────────────
CPU_TIMEOUT_S = 30          # coremark at default size finishes well inside this
UVM_LOCK_WAIT_S = 120       # how long a request waits for a busy UVM build
UVM_TIMEOUT_S = 900         # cold rebuild after a big edit can take minutes
MAX_FILE_BYTES = 200_000
MAX_LOG_LINES = 2000      # UVM runs with more loops print ~40 lines per transaction

# Programs shown in the CPU dropdown, with a one-line explanation each.
# Only names in this dict can be run.
CPU_TESTS = {
    "hello_world":      "Prints Hello World over the memory-mapped console",
    "hello_world_dccm": "Same, but the string lives in the DCCM data memory",
    "dhry":             "Dhrystone integer benchmark",
    "cmark":            "CoreMark benchmark (code + data in external memory)",
    "cmark_dccm":       "CoreMark with data and stack in DCCM (faster)",
    "irq":              "NMI, timer and software interrupts, with interrupts off and on",
    "ecc":              "Memory ECC error injection and detection",
    "illegal_instruction": "Executes an illegal opcode and checks the trap",
    "pmp":              "Physical memory protection checks",
}

# Source files behind each bundled program (paths under testbench/), main
# file first. Shown read-only in the page's "Program source" view.
CPU_SOURCES = {
    "hello_world":         ["asm/hello_world.s"],
    "hello_world_dccm":    ["asm/hello_world_dccm.s"],
    "dhry":                ["tests/dhry/dhry_1.c", "tests/dhry/dhry_2.c"],
    "cmark":               ["asm/cmark.c"],
    "cmark_dccm":          ["asm/cmark.c"],
    "irq":                 ["tests/irq/irq.c", "tests/irq/crt0.s"],
    "ecc":                 ["tests/ecc/ecc.c", "tests/ecc/crt0.s"],
    "illegal_instruction": ["asm/illegal_instruction.s", "asm/common.s"],
    "pmp":                 ["tests/pmp/main.c", "tests/pmp/pmp.c"],
}

_uvm_lock = threading.Lock()


# ── helpers ───────────────────────────────────────────────────────────────────
def _veer_env() -> dict:
    env = os.environ.copy()
    env["PATH"] = f"{VEER_VERILATOR_BIN}:{env.get('PATH', '')}"
    env["RV_ROOT"] = str(VEER_ROOT)
    env.setdefault("CCACHE_DIR", "/opt/ccache")
    return env


def _tail(text: str, n: int = MAX_LOG_LINES) -> str:
    lines = text.splitlines()
    if len(lines) <= n:
        return text
    return f"... ({len(lines) - n} earlier lines hidden) ...\n" + "\n".join(lines[-n:])


def _head(text: str, n: int) -> str:
    lines = text.splitlines()
    if len(lines) <= n:
        return text
    return "\n".join(lines[:n]) + f"\n... ({len(lines) - n} more lines) ..."


def _uvm_files() -> list[str]:
    src = UVM_PRISTINE if UVM_PRISTINE.is_dir() else UVM_HDL
    return sorted(p.name for p in src.glob("*.sv"))


def _verilator_version() -> str:
    try:
        r = subprocess.run(["verilator", "--version"], capture_output=True, text=True,
                           timeout=5, env=_veer_env())
        return r.stdout.strip()
    except Exception as e:  # noqa: BLE001
        return f"unavailable ({e})"


# ── info ──────────────────────────────────────────────────────────────────────
@router.get("/info")
def veer_info():
    tests = [{"name": k, "about": v} for k, v in CPU_TESTS.items()
             if (HEX_DIR / f"{k}.hex").is_file()]
    return {
        "cpu_ready": VEER_CPU_EXE.is_file(),
        "uvm_ready": (UVM_DIR / "mem_tb-sim" / "mem_tb").is_file(),
        "uvm_busy": _uvm_lock.locked(),
        "verilator": _verilator_version(),
        "cpu_tests": tests,
        "uvm_files": _uvm_files(),
    }


@router.get("/uvm-files")
def veer_uvm_files():
    """Original (unedited) testbench files, so the page can load and reset them."""
    src = UVM_PRISTINE if UVM_PRISTINE.is_dir() else UVM_HDL
    return {p.name: p.read_text() for p in sorted(src.glob("*.sv"))}


@router.get("/program-source")
def veer_program_source(test: str = "hello_world"):
    """Read-only source of a bundled CPU program (only names in CPU_SOURCES)."""
    if test not in CPU_SOURCES:
        return {"ok": False, "files": [], "error": f"Unknown program '{test}'."}
    base = VEER_ROOT / "testbench"
    files = []
    for rel in CPU_SOURCES[test]:
        p = base / rel
        if p.is_file():
            files.append({"name": rel, "content": p.read_text(errors="replace")[:MAX_FILE_BYTES]})
    return {"ok": bool(files), "files": files}


# ── CPU run ───────────────────────────────────────────────────────────────────
class CpuRequest(BaseModel):
    test: str = "hello_world"


@router.post("/run-cpu")
def veer_run_cpu(req: CpuRequest):
    if req.test not in CPU_TESTS:
        return {"success": False, "output": f"Unknown test '{req.test}'."}
    hex_file = HEX_DIR / f"{req.test}.hex"
    if not VEER_CPU_EXE.is_file() or not hex_file.is_file():
        return {"success": False,
                "output": "The VeeR CPU model is not built on this server yet."}

    tmp = tempfile.mkdtemp(prefix="veer_cpu_")
    try:
        shutil.copy(hex_file, Path(tmp) / "program.hex")
        t0 = time.time()
        try:
            run = subprocess.run([str(VEER_CPU_EXE)], cwd=tmp, capture_output=True,
                                 text=True, timeout=CPU_TIMEOUT_S)
            out, rc = run.stdout + run.stderr, run.returncode
        except subprocess.TimeoutExpired as e:
            out = (e.stdout or b"").decode(errors="replace") if isinstance(e.stdout, bytes) else (e.stdout or "")
            out += f"\n\nStopped after {CPU_TIMEOUT_S} s (time limit)."
            rc = -1
        secs = round(time.time() - t0, 2)

        def read(name: str, n: int) -> str:
            p = Path(tmp) / name
            return _head(p.read_text(errors="replace"), n) if p.is_file() else ""

        passed = "TEST_PASSED" in out
        return {
            "success": rc == 0 and passed,
            "passed": passed,
            "seconds": secs,
            "output": _tail(out),
            "console": read("console.log", 200),
            "exec_log": read("exec.log", 150),
        }
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ── UVM run ───────────────────────────────────────────────────────────────────
class UvmRequest(BaseModel):
    files: dict[str, str] = {}          # file name -> edited content
    test: str = "mem_wr_rd_test"        # +UVM_TESTNAME
    verbosity: str = "UVM_LOW"


_SUMMARY_RE = re.compile(r"UVM_(ERROR|FATAL|WARNING)\s*:\s*(\d+)")
_VERBOSITIES = {"UVM_NONE", "UVM_LOW", "UVM_MEDIUM", "UVM_HIGH", "UVM_FULL", "UVM_DEBUG"}


def _write_if_changed(path: Path, content: str) -> bool:
    if path.is_file() and path.read_text() == content:
        return False
    path.write_text(content)
    return True


@router.post("/run-uvm")
def veer_run_uvm(req: UvmRequest):
    allowed = set(_uvm_files())
    bad = [n for n in req.files if n not in allowed]
    if bad:
        return {"success": False, "output": f"These files can't be edited here: {', '.join(bad)}"}
    if any(len(c.encode()) > MAX_FILE_BYTES for c in req.files.values()):
        return {"success": False, "output": "A file is larger than 200 KB."}
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]{0,63}", req.test):
        return {"success": False, "output": "Test name must be a SystemVerilog class name."}
    verbosity = req.verbosity if req.verbosity in _VERBOSITIES else "UVM_LOW"
    if not (UVM_DIR / "mem_tb-sim" / "mem_tb").is_file():
        return {"success": False,
                "output": "The UVM testbench is not built on this server yet."}

    if not _uvm_lock.acquire(timeout=UVM_LOCK_WAIT_S):
        return {"success": False, "busy": True,
                "output": "Another UVM build is running. Please try again in a minute."}
    try:
        # Start from the original files, then apply the learner's edits.
        # Only files whose content actually changed are rewritten, so make
        # and ccache rebuild as little as possible.
        changed = []
        for name in allowed:
            content = req.files.get(name)
            if content is None:
                content = (UVM_PRISTINE / name).read_text() if UVM_PRISTINE.is_dir() else None
            if content is not None and _write_if_changed(UVM_HDL / name, content):
                changed.append(name)

        # IMPORTANT: this must be the same make command the Docker image used to
        # prebuild the testbench. Verilator writes source paths into the C++
        # it generates, so a different UVM_ROOT spelling (e.g. absolute vs the
        # default relative "uvm") changes all ~1,750 files and forces a full
        # ~25 min rebuild instead of a few seconds. UVM_ROOT is only passed
        # when VEER_UVM_ROOT is set explicitly.
        cmd = ["make", "-C", str(UVM_DIR), "simulate",
               f"-j{os.cpu_count() or 2}", f"UVM_TEST={req.test}"]
        if "VEER_UVM_ROOT" in os.environ:
            cmd.append(f"UVM_ROOT={UVM_ROOT}")
        t0 = time.time()
        # cwd must be VEER_ROOT: VeeR's config script writes its snapshot
        # relative to the launch folder. start_new_session puts make and every
        # compiler it spawns in one process group, so a timeout can stop all
        # of them (otherwise orphaned g++ jobs keep eating the CPU).
        proc = subprocess.Popen(cmd, cwd=VEER_ROOT, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, text=True,
                                env=_veer_env(), start_new_session=True)
        try:
            raw, _ = proc.communicate(timeout=UVM_TIMEOUT_S)
            rc = proc.returncode
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.communicate()
            raw = (f"Build/run stopped after {UVM_TIMEOUT_S} s (time limit).\n"
                   "Files already compiled are kept, so running again continues "
                   "where this run stopped.")
            rc = -1
        secs = round(time.time() - t0, 1)

        # Drop the compiler command lines (hundreds of them) — keep what a
        # learner needs: Verilator errors, UVM messages and the report.
        keep = [l for l in raw.splitlines()
                if not l.startswith(("ccache ", "g++ ", "make[", "echo ", "rm "))
                and "Entering directory" not in l and "Leaving directory" not in l]
        out = "\n".join(keep)
        if verbosity in ("UVM_NONE",):
            out = "\n".join(l for l in keep if not l.startswith("UVM_INFO"))

        counts = {k.lower(): int(v) for k, v in _SUMMARY_RE.findall(out)}
        compiled = "--- UVM Report Summary ---" in out
        passed = compiled and rc == 0 and counts.get("error", 1) == 0 and counts.get("fatal", 1) == 0
        return {
            "success": passed,
            "compiled": compiled,
            "seconds": secs,
            "changed_files": changed,
            "counts": counts,
            "output": _tail(out),
        }
    finally:
        _uvm_lock.release()
