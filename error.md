# Known Verilator 5.020 Compile Errors

Two recurring failures and their fixes. Read this before debugging a "works in one
course, not another" report — it is almost always the **flag/harness**, not a
different Verilator version. Both courses use the same binary (Verilator 5.020,
apt on `ubuntu:24.04`).

### 1 · `Unknown verilator comment: '/*verilator ...*/'`
- **Cause:** Verilator treats any comment whose first word is lowercase `verilator`
  as a pragma. `/*verilator randomizes this on randomize()*/` is not a real pragma → abort.
- **Fix:** Never begin a comment with lowercase `verilator`. Capitalize
  (`// Verilator ...`) or reword. Check `hint` / `design` / `testbench` strings in lesson files.

### 2 · `call of overloaded 'dump(...)' is ambiguous` — `sim_main.cpp`, `--no-timing`
- **Cause:** `SIM_MAIN_NO_TIMING` in `main.py` declares `unsigned long long sim_time`.
  On Linux x86-64, `uint64_t` is `unsigned long` — a *different* 64-bit type — so
  `tfp->dump(sim_time++)` matches no `VerilatedVcdC::dump()` overload exactly.
- **Fix:** Declare `uint64_t sim_time = 0;` in `main.py`. The `--timing` harness is
  unaffected (it dumps `contextp->time()`, already `uint64_t`).
- **Tell:** every `--no-timing` + trace chapter hits this once its SystemVerilog
  compiles; `--timing` chapters never do.
