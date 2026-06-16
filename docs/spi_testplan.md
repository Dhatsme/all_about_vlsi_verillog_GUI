# SPI OOP Testbench — Course Roadmap & Test Plan

Single course: **SPI OOP TB — Build It From Scratch**
Audience: all levels, with experience-path guidance on where to start.
Total: **20 chapters**. Real `spi_slave.sv` RTL DUT introduced at Ch.5.

> **Course philosophy:** The goal is not to teach SPI protocol verification.
> The goal is to teach *verification methodology and engineering thought process*
> using SPI as a familiar, tractable vehicle. By Ch.20, a student can apply
> the same methodology to any protocol — AXI, PCIe, USB, or their own custom bus.

---

## Experience-path guide

| Background | Recommended start | Can skip |
|---|---|---|
| Student / fresher (0–1 yr) | Ch.1 — read every theory section | nothing |
| 1–2 yr engineer | Ch.1 — skim theory, run pre-built code | Ch.1–4 if already familiar with SV OOP |
| 3+ yr verification engineer | Ch.9 — methodology is the real content | Ch.1–8 (assumes driver/monitor/agent knowledge) |
| RTL designer moving to VE | Ch.1 — follow in order | nothing |

---

## Estimated time per phase

| Phase | Chapters | Student / fresher | 3+ yr engineer |
|---|---|---|---|
| Phase 1 — Components | Ch.1–4 | ~3 hrs | skip or 1 hr skim |
| Phase 2 — Integration + DUT | Ch.5–8 | ~4 hrs | ~2 hrs |
| Phase 3 — Test strategy | Ch.9–12 | ~5 hrs | ~4 hrs |
| Phase 4 — Advanced methodology | Ch.13–17 | ~6 hrs | ~5 hrs |
| Phase 5 — Closure & industry | Ch.18–20 | ~4 hrs | ~4 hrs |
| **Total** | **20 ch** | **~22 hrs** | **~12 hrs** |

---

## Chapter overview — all 20

| Ch | Module ID | Phase | Component / Topic | RTL DUT? | Status |
|---|---|---|---|---|---|
| 1 | `spivoop1` | Components | `spi_transaction` | No | ✅ done |
| 2 | `spivoop2` | Components | `spi_scoreboard` | No | ✅ done |
| 3 | `spivoop3` | Components | `spi_mailbox` | No | ✅ done |
| 4 | `spivoop4` | Components | `spi_if` (interface) | No | ✅ done |
| 5 | `spivoop5` | Integration | `spi_driver` + `spi_slave.sv` DUT | **YES** | ✅ done |
| 6 | `spivoop6` | Integration | `spi_monitor` | YES | ❌ build next |
| 7 | `spivoop7` | Integration | `spi_agent` | YES | ❌ |
| 8 | `spivoop8` | Integration | `spi_env` | YES | ❌ |
| 9 | `spivoop9` | Test strategy | Test taxonomy + smoke tests | YES | ❌ |
| 10 | `spivoop10` | Test strategy | Directed tests + `ifdef` selector | YES | ❌ |
| 11 | `spivoop11` | Test strategy | SVA protocol checker | YES | ❌ |
| 12 | `spivoop12` | Test strategy | Debug methodology | YES | ❌ |
| 13 | `spivoop13` | Adv. methodology | Covergroups + functional coverage | YES | ❌ |
| 14 | `spivoop14` | Adv. methodology | Constrained-random + sequence classes | YES | ❌ |
| 15 | `spivoop15` | Adv. methodology | Virtual sequences + config object | YES | ❌ |
| 16 | `spivoop16` | Adv. methodology | Register model (RAL) | YES | ❌ |
| 17 | `spivoop17` | Adv. methodology | Coverage-driven closure | YES | ❌ |
| 18 | `spivoop18` | Closure | Full regression + error injection + plusargs | YES | ❌ |
| 19 | `spivoop19` | Closure | Debug under coverage pressure | YES | ❌ |
| 20 | `spivoop20` | Closure | UVM bridge — migrate your env to UVM | YES | ❌ |

---

## Test count distribution across chapters

Tests are spread across 9 chapters rather than dumped into one place.
Each chapter teaches *one class of testing* — students understand WHY before they type.

| Chapter | Test class | Tests added | Running total |
|---|---|---|---|
| Ch.9 | Smoke: bare-minimum sanity | 3 | 3 |
| Ch.10 | Directed: hand-crafted corner cases | 10 | 13 |
| Ch.11 | Assertion-based: protocol rule violations | 6 assertions | — |
| Ch.13 | Coverage-aware: close coverpoints | 4 | 17 |
| Ch.14 | Constrained-random: automated exploration | 8 | 25 |
| Ch.15 | Virtual: multi-agent coordinated scenarios | 5 | 30 |
| Ch.17 | Coverage-guided: steer random to gaps | 5 | 35 |
| Ch.18 | Error injection: deliberate bad inputs | 5 | 40 |
| **Total** | | **40 tests + 6 assertions** | **40** |

---

## RTL DUT: `spi_slave.sv`

Introduced at Ch.5 as a pre-loaded read-only file. Drives the course from Ch.5 onward.

**Spec:**
- SPI Mode 0 (CPOL=0, CPHA=0): samples MOSI on rising SCLK, MSB first
- Exposes `rx_byte [7:0]` output for testbench checking (backdoor in Ch.5, scoreboard from Ch.8)
- `miso` outputs 0 in Ch.5; loopback echo wired in Ch.6 when monitor is added

**Planned bugs for advanced chapters:**
- Bug A (Ch.11): MOSI sampled on falling edge instead of rising — students write an SVA
  concurrent assertion that catches it (teaches: assertions find bugs tests miss)
- Bug B (Ch.13): LSB-first shift when a specific config register bit is set — a coverage
  gap reveals it (teaches: passing tests ≠ closed coverage)

---

## Verilator flags by chapter

| Chapters | `timing` flag | Reason |
|---|---|---|
| spivoop1–4 | `--no-timing` | All function-based; no `#delay`, no `@event` |
| spivoop5+ | `--timing` | Driver uses `#2` delays to generate real SCLK edges |

`applyLessonFlags` in `app.js` applies the correct flag automatically when each lesson loads.

---

## Phase 1 — Components (Ch.1–4) — COMPLETE

All four components built and registered. Students build each class in isolation,
testing it with a focused testbench before wiring anything together.

| Chapter | Concept introduced | Key SV skill |
|---|---|---|
| Ch.1 spi_transaction | Data transfer object; what a "transaction" means in VE | class, member variables, constructor |
| Ch.2 spi_scoreboard | Self-checking testbench; golden model concept | expected queue, dynamic arrays, foreach |
| Ch.3 spi_mailbox | Producer-consumer decoupling; blocking vs non-blocking | mailbox#(T), put(), get(), try_get() |
| Ch.4 spi_if | Signal grouping; virtual interface handle | interface, modport, virtual in class |

---

## Phase 2 — Integration + RTL DUT (Ch.5–8)

Components are wired together and connected to a real RTL DUT.
Key lesson: a component only proves its own logic until it touches real silicon.

### Ch.5 — `spi_driver` + `spi_slave.sv` DUT (`spivoop5`) ✅ done

See current spivoop5.js. Driver holds a virtual interface handle, drives SCLK edges
with `#2` delays, connects to spi_slave. First chapter with `--timing`.

---

### Ch.6 — `spi_monitor` (`spivoop6`)

Passive observer: never drives any signal. Watches the bus and reconstructs transactions.

**Methodology concept:** separation of driving and observing. A monitor never contaminates
the bus. This is why driver and monitor are separate objects even when they share an interface.

**What it does:**
1. Wait for `negedge cs_n` (transaction begins)
2. Sample `mosi` on each `posedge sclk`, shift into a byte: `captured = {captured[6:0], mosi}`
3. Wait for `posedge cs_n` (transaction ends)
4. Create an `spi_transaction`, set `.data = captured`, put it into a mailbox

This chapter also wires `miso` on `spi_slave.sv` to echo the previous byte — students
can now verify full-duplex behaviour by comparing TX vs RX.

**Tier:** 3 (structural guidance), `--timing`
**Files pre-loaded:** spi_if (Ch.4), spi_slave (Ch.5), spi_transaction (Ch.1), spi_driver (Ch.5)

---

### Ch.7 — `spi_agent` (`spivoop7`)

Container class owning driver + monitor + two mailboxes.

```
spi_agent
  |- spi_mailbox   stim_mbx   // stimulus IN: tests queue transactions here
  |- spi_mailbox   obs_mbx    // observations OUT: monitor puts captured txns here
  |- spi_driver    drv
  |- spi_monitor   mon
```

**Methodology concept:** why group driver + monitor into an agent?
Because they work the same interface. Swapping agent A for agent B swaps both
stimulus and observation for that interface — the test doesn't change.

`run(int n)` task: loop n times — get from `stim_mbx`, drive via `drv`, monitor captures
into `obs_mbx`. Uses `fork...join_none` so driver and monitor run concurrently.

**Tier:** 3, `--timing`

---

### Ch.8 — `spi_env` (`spivoop8`)

Wires agent + scoreboard together. The single object that all tests instantiate.

```
spi_env
  |- spi_agent      agent
  |- spi_scoreboard scb
```

**Methodology concept:** the environment is the boundary between the test and the DUT.
Tests never reach inside to touch the driver directly — they push transactions into stim_mbx
and read results from scb. This decoupling lets you replace the DUT (or the driver) without
rewriting any test.

After Ch.8 a complete test looks like:
```sv
spi_env env = new(vif);
txn = new(); txn.data = 8'hA5;
env.agent.scb.push_exp(8'hA5);
env.agent.stim_mbx.put(txn);
env.run(1);
env.report();
```

**Tier:** 4 (behaviour spec), `--timing`

---

## Phase 3 — Test strategy (Ch.9–12)

With a complete environment available, the question shifts:
**"What should I test, and how do I know when I'm done?"**
This phase introduces the engineer's mindset, not just coding patterns.

### Ch.9 — Test taxonomy + smoke tests (`spivoop9`) — *3 tests*

**Methodology concept:** not all tests are equal. Before writing 40 tests, define
your taxonomy. A smoke test is a contract: if it fails, don't run anything else.

**Test taxonomy introduced:**
```
Smoke     — must pass every morning. 1-3 tests. Run in < 10 seconds.
Directed  — hand-crafted corner cases. One specific scenario per test.
Random    — automated exploration. Statistical confidence.
Assertion — property-based. Protocol rules, not data values.
Coverage  — prove you covered the intent, not just ran N tests.
```

**Tests added (3 smoke tests):**
- `run_smoke_basic` — 8'hA5, one frame, check rx_byte
- `run_smoke_zeros` — 8'h00, verify no shift noise
- `run_smoke_ones`  — 8'hFF, all-ones frame

Student writes test helper tasks inside a `spi_tests` class. Env is passed in as an argument.

**`ifdef` test selector (preview):** wraps each test call so the default TB runs all 3
as regression; `-DRUN_SMOKE_BASIC` in Extra Flags runs just one. Full `ifdef` system
taught in Ch.10.

**Tier:** 3, `--timing`

---

### Ch.10 — Directed tests + `ifdef` selector (`spivoop10`) — *10 tests*

**Methodology concept:** directed tests encode your understanding of the DUT.
Each test is a hypothesis: "when I send X, the DUT must do Y." If the test fails,
either your hypothesis is wrong or the DUT has a bug — both are useful information.

**`ifdef` test selection:**
```sv
`ifdef RUN_SMOKE      run_smoke_basic(env);    `endif
`ifdef RUN_ZEROS      run_zeros(env);          `endif
// ... etc
`ifndef SINGLE_TEST
  run_all_13(env);  // smoke (Ch.9) + directed (Ch.10) = regression
`endif
```
Student adds `-DRUN_ZEROS` in ⚙ Options → Extra Flags to isolate one test.
Removing the flag runs all 13 (3 smoke + 10 directed).

**10 directed tests added:**
- alternating_hi: 8'hAA — alternating bits
- alternating_lo: 8'h55 — complementary pattern
- walking_ones: 8'h01 through 8'h80 — shifts the set bit
- msb_check: 8'h80 — verify MSB-first shift order
- lsb_check: 8'h01 — verify LSB position preserved
- multi_frame: send 4 consecutive bytes, check all 4
- cs_idle: drive SCLK briefly with CS high — must be ignored
- back_to_back: two frames with minimal cs_n idle gap
- reset_recovery: assert cs_n mid-frame, verify rx_byte resets
- throughput: 16 frames in a burst, check time elapsed

**Tier:** 4/5 mixed

---

### Ch.11 — SVA protocol checker (`spivoop11`) — *6 assertions, 0 new data tests*

**Methodology concept:** assertions check protocol rules, not data values.
A failing assertion means the testbench or DUT violated the interface contract,
not just that it computed the wrong answer. Assertions are always-on monitors;
you don't have to remember to check them.

**6 concurrent assertions in `spi_checker` module:**
```sv
// 1. Frame must be exactly 8 SCLK cycles
property p_frame_8bits;
  @(posedge sclk) $fell(cs_n) |-> ##1 ($rose(sclk) [*8]) ##1 $rose(cs_n);
endproperty
assert property (p_frame_8bits);

// 2. SCLK must not toggle while CS is idle
property p_sclk_idle;
  @(posedge sclk) cs_n |-> !$rose(sclk);
endproperty
assert property (p_sclk_idle);

// ... 4 more covering: CS min idle, CS setup, CS hold, no glitch on MOSI during sample
```

This chapter introduces **Bug A** in `spi_slave.sv`: MOSI sampled on falling edge.
Students watch assertion 1 fire (8-bit frame count is off), locate the bug, fix it.
Shows why assertions catch bugs that data-value tests miss.

**Tier:** 3 (assertions as structural blocks), `--timing`

---

### Ch.12 — Debug methodology (`spivoop12`) — *0 new tests, essential skill*

**Methodology concept:** a failing test is not a failed project — it is information.
This chapter teaches a systematic debug process before students hit the hard chapters.

**Topics:**
- Reading simulation output: PASS/FAIL lines, `$display` formatting best practices
- `$dumpfile` / `$dumpvars` — generate a VCD waveform for external viewing
- Bisecting a failure: comment out tests, add `$display` at each pipeline stage
- The "expected vs actual" template: every FAIL line should print both
- When to trust the testbench vs when to trust the DUT
- Intentionally breaking the driver to see what failures look like (calibration)

**Lab exercise:** students introduce a deliberate bug into their spi_driver
(drive MOSI after falling SCLK instead of before rising), observe the failure mode,
then fix it. Builds intuition for reading waveforms and error messages.

**Tier:** 3, `--timing`

---

## Phase 4 — Advanced methodology (Ch.13–17)

*3+ yr engineers start here if they skipped Phase 1–2.*
Each chapter introduces one pillar of industrial verification methodology.

### Ch.13 — Covergroups + functional coverage (`spivoop13`) — *4 tests*

**Methodology concept:** coverage is a measurement, not a pass/fail.
"All tests passed" means you ran your tests. Coverage tells you whether those tests
touched every intended scenario. Closing coverage is the real closure criterion.

```sv
covergroup spi_data_cg;
  cp_data: coverpoint txn.data {
    bins zeros   = {8'h00};
    bins ones    = {8'hFF};
    bins alt_hi  = {8'hAA};
    bins alt_lo  = {8'h55};
    bins others  = default;
  }
  cp_frame_count: coverpoint frame_count {
    bins single   = {1};
    bins small    = {[2:4]};
    bins medium   = {[5:15]};
    bins large    = {[16:$]};
  }
  // Cross coverage: did we see each data pattern in each frame-count scenario?
  cx_data_x_frames: cross cp_data, cp_frame_count;
endgroup
```

**4 coverage-closing tests added:**
- `run_coverage_sweep`: sends 8 specific values to hit each coverpoint bin
- `run_frame_sizes`: 1-frame, 4-frame, 8-frame, 16-frame bursts
- `run_cross_corner`: zeros in a large burst; ones in a single frame
- `run_coverage_report`: prints `spi_data_cg.get_coverage()` after each run

This chapter introduces **Bug B**: LSB-first shift on a specific bit combination.
The cross-coverage report shows 0% for `alt_hi × large` — the only scenario
that triggers the bug. Students see how coverage guides them to the uncovered corner.

**Tier:** 4, `--timing`

---

### Ch.14 — Constrained-random + sequence classes (`spivoop14`) — *8 tests*

**Methodology concept:** directed tests explore corners you can think of;
constrained-random explores corners you cannot. The constraint language is how you
tell the solver what the legal space is — not what to test.

```sv
class spi_rand_txn extends spi_transaction;
  constraint c_valid_byte { data inside {[8'h01 : 8'hFE]}; }  // exclude 0x00, 0xFF
  constraint c_not_alternating { data != 8'hAA; data != 8'h55; } // avoid directed corners
endclass
```

**Sequence class hierarchy:**
```sv
class spi_base_seq;   virtual task body(spi_env e); endtask  endclass
class spi_byte_seq  extends spi_base_seq;  // sends one configured byte
class spi_burst_seq extends spi_base_seq;  // calls spi_byte_seq N times
class spi_stress_seq extends spi_base_seq; // randomizes count 1–256
```

**Methodology concept:** sequences encode reusable *scenarios*, not data values.
A test composes sequences; it doesn't describe clock cycles.

**8 tests added:**
- `run_rand_100`: 100 constrained-random bytes, check all hit the scoreboard
- `run_rand_burst_short`: 10 random bursts of 1–4 bytes
- `run_rand_burst_long`: 10 random bursts of 8–32 bytes
- `run_rand_boundary`: constrain data to {0x00, 0xFF, 0x01, 0xFE} — boundary values
- `run_rand_walking_rand`: random walking-ones with solve...before ordering
- `run_stress_1k`: 1000 transactions, measure throughput
- `run_seq_library_demo`: shows byte_seq, burst_seq, stress_seq in sequence
- `run_rand_report`: print coverage after random run; compare to Ch.13 baseline

**Tier:** 3–4, `--timing`

---

### Ch.15 — Virtual sequences + config object (`spivoop15`) — *5 tests*

**Methodology concept:** real DUTs have more than one interface.
A virtual sequence coordinates multiple agents without either agent knowing about the other.
The config object is how components share parameters without hard-coding.

**`spi_config` class:**
```sv
class spi_config;
  logic cpol     = 0;  // clock polarity
  logic cpha     = 0;  // clock phase
  logic lsb_first = 0; // bit order
  int   clk_div  = 2;  // SCLK = CLK / (2 * clk_div)
endclass
```

**Virtual sequence pattern:**
```sv
class spi_full_test_seq extends spi_base_seq;
  spi_config cfg;
  task body(spi_env e);
    // Phase 1: configure slave via APB (second agent — simulated here as a task)
    apb_write(SPI_CTRL_ADDR, {cfg.lsb_first, cfg.cpha, cfg.cpol});
    // Phase 2: drive SPI data via first agent
    spi_burst_seq burst = new();
    burst.count = 8;
    burst.body(e);
  endtask
endclass
```

**5 tests added:**
- `run_mode0_config`: configure CPOL=0 CPHA=0 via config object, verify behaviour
- `run_msb_vs_lsb`: configure LSB_FIRST=0 then =1, verify byte reversal
- `run_multi_config_sweep`: iterate over all 4 SPI mode combinations
- `run_vseq_burst_after_config`: configure then burst, verify config persists
- `run_config_reset`: change config mid-test, verify DUT responds

**Tier:** 4, `--timing`

---

### Ch.16 — Register model (RAL) (`spivoop16`) — *0 new data tests; register access pattern*

**Methodology concept:** if the DUT has registers, the testbench needs a model of those
registers. Without a RAL, every test hardcodes addresses and bit fields. With a RAL,
you write `ral.ctrl.lsb_first.set(1); ral.ctrl.update();` and the model handles
address mapping, field masking, and write/read-back verification.

**Register map for SPI slave:**
```sv
class spi_reg_model;
  spi_ctrl_reg   ctrl;    // 0x00: CPOL[0], CPHA[1], LSB_FIRST[2]
  spi_clk_reg    clk_div; // 0x04: CLK_DIV[7:0]
  spi_data_reg   txrx;    // 0x08: TX_DATA[7:0] / RX_DATA[15:8]
  spi_status_reg status;  // 0x0C: BUSY[0], TX_FULL[1], RX_EMPTY[2]
endclass
```

**Access methods:**
- Frontdoor write: task sends APB cycle to real DUT address
- Backdoor read: direct access via `$root.tb.dut.ctrl_reg` (no clock needed)
- Shadow register: model tracks last written value; read-back check compares shadow vs DUT

**Lab:** Students write the `spi_ctrl_reg` class and one frontdoor-write task.
The other three register classes are pre-loaded. Students write one test:
configure the DUT via RAL, run a burst, verify behaviour matches the configuration.

**Tier:** 4, `--timing`

---

### Ch.17 — Coverage-driven closure (`spivoop17`) — *5 tests*

**Methodology concept:** "run until done" rather than "run N times".
The termination criterion is a coverage goal, not a test count.
This is the difference between a script and a verification plan.

```sv
// Instead of: repeat(100) begin ... end
// Write:
while (spi_data_cg.get_coverage() < 95.0) begin
  spi_rand_txn txn = new();
  void'(txn.randomize());
  env.agent.stim_mbx.put(txn);
  env.run(1);
  spi_data_cg.sample(txn); // update coverage model
  if ($time > MAX_SIM_TIME) break; // safety valve
end
$display("Coverage closed at %.1f%% after %0d transactions",
         spi_data_cg.get_coverage(), txn_count);
```

**5 tests added:**
- `run_until_data_covered`: close `cp_data` coverpoint — target 100%
- `run_until_frame_covered`: close `cp_frame_count` — target 100%
- `run_until_cross_covered`: close the cross — target 90%
- `run_until_all_covered`: close all three — composite goal 95%
- `run_coverage_comparison`: compare random-only vs coverage-guided runs;
  print which reaches the goal faster and with fewer transactions

**Tier:** 4, `--timing`

---

## Phase 5 — Closure & industry (Ch.18–20)

### Ch.18 — Full regression + error injection + plusargs (`spivoop18`) — *5 error tests*

**Methodology concept:** a regression is not just "run everything".
A regression is a commitment: if any test fails, the build is broken.
Error injection tests your testbench, not just the DUT.

**Plusargs for individual test runs:**
```sv
// Requires one-line change in main.py: pass runtime_args to ./obj_dir/Vtb
if      ($test$plusargs("SMOKE"))    run_smoke_suite(env);
else if ($test$plusargs("DIRECTED")) run_directed_suite(env);
else if ($test$plusargs("RAND"))     run_random_suite(env);
else if ($test$plusargs("ERRORS"))   run_error_suite(env);
else                                 run_full_regression(env); // default
```

Student adds `+SMOKE` in ⚙ Options → Extra Flags to run the smoke suite.
No flag: full regression (all 40 tests).

**5 error-injection tests added:**
- `run_err_short_frame`: de-assert CS after 4 clocks — must not corrupt later frames
- `run_err_glitch_cs`: brief CS glitch during frame — DUT must abort cleanly
- `run_err_extra_sclk`: drive 9 SCLK pulses — 9th clock must be ignored
- `run_err_mosi_noise`: MOSI toggled while CS is idle — must not affect rx_byte
- `run_err_simultaneous_tx`: two back-to-back frames with no CS gap — verify framing

**Backend change (document here, implement separately):**
```python
# main.py: accept runtime_args in /simulate request body
subprocess.run(["./obj_dir/Vtb"] + runtime_args, ...)
```
This is a one-line change. Students learn the concept in the GUI;
the full plusargs flow works once main.py is patched.

**Tier:** 5 (portfolio phase), `--timing`

---

### Ch.19 — Debug under coverage pressure (`spivoop19`) — *0 new tests; methodology chapter*

**Methodology concept:** coverage sometimes stalls. A corner case exists in the spec
but random stimulus cannot reach it naturally. This chapter teaches the engineer's
response: read the coverage report, identify the gap, write a targeted directed test
or tighten the constraint to steer the solver.

**Topics:**
- Reading a functional coverage report: which bins are 0%, which are < 100%
- Coverage exclusion: when it is legitimate to mark a bin as "unreachable"
- Constraint tightening: `solve a before b`, weight with `dist`
- Adding a directed test for a specific uncovered bin (regression-safe — it must keep passing)
- The coverage plateau: detect when adding more random tests gives diminishing returns
- Turnaround time discipline: rerun only the relevant subset, not all 40 tests

**Lab exercise:** students are given a partially-closed coverage report with two gaps
(one legitimate corner, one unreachable-by-design). They write:
1. A directed test that closes the reachable gap
2. A coverage exclusion comment that documents why the unreachable bin is excluded
3. A modified constraint that helps random close the cross-coverage gap

**Tier:** 4, `--timing`

---

### Ch.20 — UVM bridge (`spivoop20`) — *final portfolio chapter*

**Methodology concept:** UVM is not a different methodology — it is this methodology
with a standardized class library underneath. `spi_driver` → `uvm_driver`,
`spi_env` → `uvm_env`, `spi_base_seq` → `uvm_sequence`. The concepts are identical;
the plumbing is standardized.

**What this chapter teaches:**
- `uvm_component` vs `uvm_object` — the split your env already makes (env vs transaction)
- `uvm_config_db` — how UVM replaces the manual config object from Ch.15
- `uvm_tlm_analysis_port` — how UVM replaces the mailbox from Ch.3
- `uvm_sequence` / `uvm_sequencer` — how UVM wraps the sequence hierarchy from Ch.14
- `+UVM_TESTNAME` — the plusargs system from Ch.18, standardized

**Lab:** students are given a skeleton UVM version of their spi_driver and spi_env.
They fill in the `run_phase` task (identical to their Ch.5 drive_byte logic)
and the `spi_seq.body()` task (identical to their Ch.9 smoke test).
The rest of the boilerplate is pre-loaded.

**Goal:** by the end of Ch.20, students look at a real UVM testbench and recognize
every component. They can join a team using any standard UVM-based simulator.

**Tier:** 5 (portfolio), `--timing`

Final task: `'🎓 SPI Verification Engineer certificate unlocked — you built a complete verification environment, closed coverage, and can read any UVM testbench. Push this to your GitHub.'`

---

## `from`/`fallback` key map

| File | `from` key | First needed |
|---|---|---|
| `spi_if.sv` | `spivoop4-spivoop4l1-design` | Ch.5 |
| `spi_driver.sv` | `spivoop5-spivoop5l1-design` | Ch.6 |
| `spi_transaction.sv` | `spivoop1-spivoop1l1-design` | Ch.6 |
| `spi_scoreboard.sv` | `spivoop2-spivoop2l1-design` | Ch.7 |
| `spi_mailbox.sv` | `spivoop3-spivoop3l1-design` | Ch.7 |
| `spi_monitor.sv` | `spivoop6-spivoop6l1-design` | Ch.7 |
| `spi_agent.sv` | `spivoop7-spivoop7l1-design` | Ch.8 |
| `spi_env.sv` | `spivoop8-spivoop8l1-design` | Ch.9+ |

`spi_slave.sv` always uses hardcoded `content:` — it is a pre-written DUT, not student code.

---

## What this course covers vs what it doesn't

| Topic | Covered? | Where |
|---|---|---|
| SV OOP: class, extends, virtual | ✅ | Ch.1–8 |
| Interfaces + virtual handles | ✅ | Ch.4–5 |
| Mailbox + producer-consumer | ✅ | Ch.3, 7 |
| Driver / monitor / agent / env | ✅ | Ch.5–8 |
| Directed testing methodology | ✅ | Ch.9–10 |
| SVA concurrent assertions | ✅ | Ch.11 |
| Debug process | ✅ | Ch.12 |
| Functional coverage + covergroups | ✅ | Ch.13, 17 |
| Constrained-random + sequences | ✅ | Ch.14 |
| Virtual sequences + config | ✅ | Ch.15 |
| Register model (RAL) | ✅ | Ch.16 |
| Coverage-driven closure | ✅ | Ch.17 |
| Error injection | ✅ | Ch.18 |
| Plusargs + regression management | ✅ | Ch.18 |
| Debug under coverage pressure | ✅ | Ch.19 |
| UVM class library mapping | ✅ | Ch.20 |
| Formal verification (bounded model checking) | ❌ | separate course |
| CDC / clock domain crossing | ❌ | separate course |
| Full UVM with factory + override | ❌ | UVM deep-dive course |
| Multi-DUT / SoC-level integration | ❌ | advanced systems course |
