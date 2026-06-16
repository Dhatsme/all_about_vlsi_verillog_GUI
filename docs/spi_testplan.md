# SPI OOP Testbench — Course Roadmap & Test Plan

Single course: **SPI OOP TB — Build It From Scratch**
Audience: all levels, with experience-path guidance on where to start.
Total: **16 chapters**. Real `spi_slave.sv` RTL DUT introduced at Ch.5.

---

## Experience-path guide

| Background | Recommended start | Can skip |
|---|---|---|
| Student / fresher (0–1 yr) | Ch.1 — read every theory section | nothing |
| 1–2 yr engineer | Ch.1 — skim theory, run pre-built code | Ch.1–4 if already familiar with SV OOP |
| 3+ yr verification engineer | Ch.9 — assertions, coverage, RAL is the real content | Ch.1–8 (assumes driver/monitor/agent knowledge) |
| RTL designer moving to VE | Ch.1 — follow in order | nothing |

---

## Chapter status

| Ch | Module ID | Component | RTL DUT? | Status |
|---|---|---|---|---|
| 1 | `spivoop1` | `spi_transaction` | No | ✅ done |
| 2 | `spivoop2` | `spi_scoreboard` | No | ✅ done |
| 3 | `spivoop3` | `spi_mailbox` | No | ✅ done |
| 4 | `spivoop4` | `spi_if` (interface) | No | ✅ done |
| 5 | `spivoop5` | `spi_driver` + `spi_slave.sv` DUT | **YES** | ✅ done |
| 6 | `spivoop6` | `spi_monitor` | YES | ❌ build next |
| 7 | `spivoop7` | `spi_agent` | YES | ❌ |
| 8 | `spivoop8` | `spi_env` | YES | ❌ |
| 9 | `spivoop9` | Directed tests + `ifdef` test selector | YES | ❌ |
| 10 | `spivoop10` | `spi_checker` (SVA protocol assertions) | YES | ❌ |
| 11 | `spivoop11` | Covergroups + functional coverage model | YES | ❌ |
| 12 | `spivoop12` | Sequence class hierarchy (seq calls seq) | YES | ❌ |
| 13 | `spivoop13` | Virtual sequences + config object | YES | ❌ |
| 14 | `spivoop14` | Register model (RAL) | YES | ❌ |
| 15 | `spivoop15` | Coverage-driven constrained-random | YES | ❌ |
| 16 | `spivoop16` | 40-test library + plusargs + full regression | YES | ❌ |

---

## RTL DUT: `spi_slave.sv`

Introduced at Ch.5 as a pre-loaded read-only file. Drives the course from Ch.5 onward.

**Spec:**
- SPI Mode 0 (CPOL=0, CPHA=0): samples MOSI on rising SCLK, MSB first
- Exposes `rx_byte [7:0]` output for testbench checking (backdoor in Ch.5, scoreboard from Ch.8)
- `miso` outputs 0 in Ch.5; loopback echo wired in Ch.6 when monitor is added

**Planned bugs for advanced chapters:**
- Bug A (Ch.10): MOSI sampled on falling edge instead of rising — students write an SVA concurrent assertion that catches it
- Bug B (Ch.11): LSB-first shift when a specific config register is set — a coverage gap reveals it

---

## Verilator flags by chapter

| Chapters | `timing` flag | Reason |
|---|---|---|
| spivoop1–4 | `--no-timing` | All function-based; no `#delay`, no `@event` |
| spivoop5+ | `--timing` | Driver uses `#2` delays to generate real SCLK edges |

`applyLessonFlags` in `app.js` applies the correct flag automatically when each lesson loads.

---

## Chapter specs (remaining)

### Ch.6 — `spi_monitor` (`spivoop6`)

Passive observer: never drives any signal. Watches the bus and reconstructs transactions.

**What it does:**
1. Wait for `negedge cs_n` (transaction begins)
2. Sample `mosi` on each `posedge sclk`, shift into a byte: `captured = {captured[6:0], mosi}`
3. Wait for `posedge cs_n` (transaction ends)
4. Create an `spi_transaction`, set `.data = captured`, put it into a mailbox

This chapter also wires `miso` on `spi_slave.sv` to echo the previous transaction — students
can now read back what the slave sends and verify full-duplex behaviour.

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

`run(int n)` task: loop n times — get from `stim_mbx`, drive via `drv`, monitor captures
into `obs_mbx`. Uses `fork...join_none` so driver and monitor run concurrently.

**Tier:** 3, `--timing`

---

### Ch.8 — `spi_env` (`spivoop8`)

Wires agent + scoreboard together. The object that tests instantiate.

```
spi_env
  |- spi_agent      agent
  |- spi_scoreboard scb
```

`run(int n)`: starts agent, drains `obs_mbx` into `scb.check()` after each transaction.
`report()` delegates to `scb.report()`.

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

### Ch.9 — Directed tests + `ifdef` selector (`spivoop9`)

10 directed tests, each as a `task` in its own pre-loaded file tab. Student writes 2 of them.

**`ifdef` test selection:**
```sv
`ifdef RUN_SMOKE    run_smoke(env);    `endif
`ifdef RUN_ZEROS    run_zeros(env);    `endif
// ... etc
`ifndef SINGLE_TEST
  run_smoke(env); run_zeros(env); // ... all 10 = regression mode
`endif
```
Student adds `-DRUN_SMOKE` in ⚙ Options → Extra Flags to run one test. Removing the flag runs all 10.

**Test list:** smoke, all\_zeros, all\_ones, alternating, walking\_ones, msb\_first, cs\_idle, multi\_frame, reset, throughput

**Tier:** 4/5 mixed

---

### Ch.10 — SVA protocol checker (`spivoop10`) — *3+ yr engineer content starts here*

Concurrent assertions in a separate `spi_checker` module bound to the interface.

```sv
property p_frame_8bits;
  @(posedge sclk) $fell(cs_n) |-> ##1 ($rose(sclk) [*8]) ##1 $rose(cs_n);
endproperty
assert property (p_frame_8bits) else $error("SPI frame must be exactly 8 bits");

property p_sclk_idle;
  @(posedge sclk) cs_n |-> !$rose(sclk);
endproperty
assert property (p_sclk_idle) else $error("SCLK toggled while CS idle");
```

This chapter introduces Bug A in `spi_slave.sv`: students watch the assertion fire and fix it.

**Tier:** 3 (assertions as structural blocks)

---

### Ch.11 — Covergroups + functional coverage (`spivoop11`)

```sv
covergroup spi_data_cg;
  cp_data: coverpoint txn.data {
    bins zeros   = {8'h00};
    bins ones    = {8'hFF};
    bins alt_hi  = {8'hAA};
    bins alt_lo  = {8'h55};
    bins others  = default;
  }
endgroup
```

Cross coverage: data pattern × frame count. Coverage gap from Bug B (LSB-first path never hit).
Introduces the concept: **tests passing ≠ coverage closed**.

**Tier:** 4

---

### Ch.12 — Sequence class hierarchy (`spivoop12`)

```sv
class spi_base_seq;  virtual task body(spi_env e); endtask  endclass
class spi_byte_seq  extends spi_base_seq;  // sends one configured byte
class spi_burst_seq extends spi_base_seq;  // calls spi_byte_seq N times
class spi_stress_seq extends spi_base_seq; // randomizes count 1–256
```

One sequence calls another sequence. Students see reuse without copy-paste.

**Tier:** 3

---

### Ch.13 — Virtual sequences + config object (`spivoop13`)

`spi_config` class: holds CPOL, CPHA, LSB\_FIRST, CLK\_DIV fields.
Passed to the env constructor; every component reads it instead of hardcoding.

Virtual sequence: configures the slave via a second interface (APB-style write),
then drives data via SPI. Shows multi-agent coordination without full UVM.

**Tier:** 4

---

### Ch.14 — Register model (RAL) (`spivoop14`)

Models the SPI slave’s four configuration registers as SV classes.

```sv
class spi_reg_model;
  spi_ctrl_reg   ctrl;    // CPOL, CPHA, LSB_FIRST at 0x00
  spi_clk_reg    clk_div; // clock divider at 0x04
  spi_data_reg   data;    // TX/RX byte at 0x08
  spi_status_reg status;  // BUSY, TX_FULL, RX_EMPTY at 0x0C
endclass
```

Frontdoor write via APB task. Backdoor via direct assign (for reset verification).
Students write one test that configures the DUT via the RAL before driving SPI frames.

**Tier:** 4

---

### Ch.15 — Coverage-driven constrained-random (`spivoop15`)

Instead of `repeat(100)`, run until coverage goal is met:
```sv
while (spi_data_cg.get_coverage() < 95.0) begin
  txn = new(); void'(txn.randomize());
  env.agent.stim_mbx.put(txn);
  env.run(1);
end
```

Shows the difference between “N tests passed” and “coverage closed”. This is real
verification closure, not just running tests.

**Tier:** 4

---

### Ch.16 — 40-test library + plusargs + full regression (`spivoop16`)

**30 new tests** added here (10 from Ch.9 + 30 = 40 total). Each in its own pre-loaded file tab.
Student writes 5 of the 30 new ones.

**Plusargs for individual test runs:**
```sv
// Requires one-line change in main.py: pass runtime_args to ./obj_dir/Vtb
if ($test$plusargs("SMOKE"))    run_smoke(env);
else if ($test$plusargs("RAND")) run_rand_byte(env);
else                             run_all_40(env);   // full regression
```

**40-test breakdown:**

| Category | Count |
|---|---|
| Smoke + directed (Ch.9) | 10 |
| Constrained-random data patterns | 8 |
| Protocol timing & framing | 8 |
| Error injection | 7 |
| Multi-slave & advanced | 7 |
| **Total** | **40** |

**Tier:** 5 (portfolio)

Final task: `'🎓 Portfolio piece — you built a complete SPI verification environment with 40 test cases. Push this to your GitHub.'`

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
| `spi_env.sv` | `spivoop8-spivoop8l1-design` | Ch.9 |

`spi_slave.sv` always uses hardcoded `content:` — it is a pre-written DUT, not student code.

---

## Backend change needed for Ch.16 (plusargs)

Current: `main.py` runs `./obj_dir/Vtb` with no runtime args.
Needed: accept `runtime_args` in the `/simulate` request body and pass them:
```python
subprocess.run(["./obj_dir/Vtb"] + runtime_args, ...)
```
This is a one-line change. Teach the concept in Ch.16; document the backend wire-up there.
