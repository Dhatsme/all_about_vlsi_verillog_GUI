# SPI OOP Testbench Course — Test Plan

This file documents the conversation-agreed roadmap for completing the SPI OOP
testbench course and the architecture for the 40-test-case advanced chapter.

---

## Where we are

| Chapter | Module ID   | Component built       | Status  |
|---------|-------------|----------------------|---------|
| Ch.1    | `spivoop1`  | `spi_transaction`    | ✅ done  |
| Ch.2    | `spivoop2`  | `spi_scoreboard`     | ✅ done  |
| Ch.3    | `spivoop3`  | `spi_mailbox`        | ✅ done  |
| Ch.4    | `spivoop4`  | `spi_if` (interface) | ✅ done  |
| Ch.5    | `spivoop5`  | `spi_driver`         | ❌ build next |
| Ch.6    | `spivoop6`  | `spi_monitor`        | ❌       |
| Ch.7    | `spivoop7`  | `spi_agent`          | ❌       |
| Ch.8    | `spivoop8`  | `spi_env`            | ❌       |
| Ch.9    | `spivoop9`  | Directed tests (10)  | ❌       |
| Ch.10   | `spivoop10` | Advanced test library (40 total) | ❌ |

**Answer: 6 more chapters** to reach a fully advanced 40-test course (spivoop5 – spivoop10).

---

## Remaining chapter specs

### Ch.5 — `spi_driver` (`spivoop5`)

Student builds a class that drives the SPI bus through a `virtual spi_if` handle.

**What the driver does:**
1. Accept a `spi_transaction` from the mailbox
2. Assert `cs_n` low
3. Clock out `transaction.data` MSB-first — toggle `sclk`, set `mosi` each bit
4. De-assert `cs_n` high

**Key SV patterns taught:**
- `virtual spi_if vif` handle, passed via constructor
- `task` (not function) because the driver has timing (`@(posedge clk)`)
- `for` loop bit-shifting: `mosi = data[7-i]`
- `--timing` NOT needed yet: testbench drives the driver from `initial begin` without `fork`

**Tier:** 3 (structural guidance)
**Files pre-loaded:** spivoop1–4 outputs (spi_transaction, spi_scoreboard, spi_mailbox, spi_if)

---

### Ch.6 — `spi_monitor` (`spivoop6`)

Student builds a class that watches the SPI bus and captures what was sent.

**What the monitor does:**
1. Wait for `cs_n` to go low (transaction starts)
2. Sample `mosi` on each `sclk` rising edge, shift into a byte
3. Wait for `cs_n` to go high (transaction ends)
4. Create an `spi_transaction` with the captured byte
5. Put it into the mailbox

**Key SV patterns taught:**
- Non-modifying observer: never drives any signal
- `@(negedge vif.cs_n)` / `@(posedge vif.cs_n)` event waiting
- Captured data reconstruction: `captured = {captured[6:0], vif.mosi}`
- `--timing` required from this chapter onward (event-driven tasks need it)

**Tier:** 3
**Files pre-loaded:** spivoop1–5 outputs

> **Note:** From Ch.6 onward, `verilatorFlags.timing` changes to `'--timing'`.
> `applyLessonFlags` in app.js handles this automatically.

---

### Ch.7 — `spi_agent` (`spivoop7`)

Student builds the agent: a container that owns a driver, a monitor, and a mailbox.

**Structure:**
```
spi_agent
  |- spi_mailbox   stim_mbx   // stimulus IN: tests put() transactions here
  |- spi_mailbox   obs_mbx    // observations OUT: monitor put()s captured txns here
  |- spi_driver    drv
  |- spi_monitor   mon
```

**Key patterns:**
- Constructor creates all sub-objects and passes handles
- `run()` task: loop — get from stim_mbx, drive, monitor captures to obs_mbx
- Single `fork...join_none` to run driver and monitor concurrently (introduces `--timing`)

**Tier:** 3
**Files pre-loaded:** spivoop1–6 outputs

---

### Ch.8 — `spi_env` (`spivoop8`)

Student builds the environment: agent + scoreboard wired together.

**Structure:**
```
spi_env
  |- spi_agent     agent
  |- spi_scoreboard scb
```

**What env adds:**
- `connect()`: wires `agent.obs_mbx` output into `scb.check()` calls
- `run()`: starts agent, loops draining obs_mbx and feeding scoreboard
- `report()`: delegates to `scb.report()`

The env is the object tests instantiate. From here, a test is just:
```sv
spi_env env = new(vif);
env.agent.stim_mbx.put(txn);  // stimulus
env.run(8);                    // run 8 transactions
env.report();                  // check pass/fail
```

**Tier:** 4 (behaviour spec)
**Files pre-loaded:** spivoop1–7 outputs

---

### Ch.9 — Directed test library (`spivoop9`)

Student writes 10 directed tests, each in its own file. The testbench `include`s them all.

Files introduced:
```
test_smoke.sv          // 1 transaction: 8'hA5, check loopback
test_all_zeros.sv      // 8'h00 — all MOSI bits low
test_all_ones.sv       // 8'hFF — all MOSI bits high
test_alternating.sv    // 8'hAA then 8'h55
test_walking_ones.sv   // 8'h01, 8'h02, 8'h04 ... 8'h80
test_msb_first.sv      // verify bit 7 is first on MOSI
test_cs_idle.sv        // cs_n must be 1 between frames
test_multi_frame.sv    // 4 back-to-back transactions
test_reset.sv          // assert cs_n mid-frame, verify recovery
test_throughput.sv     // 16 frames, time it, report bytes/sec
```

Each file defines one `task run_test(spi_env env)` function. The top-level testbench
creates the env and calls each task in sequence.

**Tier:** 4 / 5 mixed
**Files pre-loaded:** spivoop1–8 outputs (complete env)

---

### Ch.10 — Advanced random test library (`spivoop10`)

Student writes constrained-random tests to reach 40 total. 30 new tests added here.
Each file in `tests/` is a separate file tab visible in the lesson.

**40-test breakdown:**

| Category | Count | Test files |
|----------|-------|------------|
| Smoke / directed (from Ch.9) | 10 | `test_smoke.sv` … `test_throughput.sv` |
| Constrained-random data patterns | 8 | `test_rand_byte.sv`, `test_rand_burst4.sv`, `test_rand_burst8.sv`, `test_rand_burst16.sv`, `test_rand_burst256.sv`, `test_rand_corner.sv`, `test_rand_power2.sv`, `test_rand_ascii.sv` |
| Protocol timing & framing | 8 | `test_cs_setup.sv`, `test_cs_hold.sv`, `test_interframe_gap.sv`, `test_spi_mode0.sv`, `test_spi_mode1.sv`, `test_spi_mode2.sv`, `test_spi_mode3.sv`, `test_fast_clock.sv` |
| Error injection | 7 | `test_glitch_miso.sv`, `test_cs_deassert_early.sv`, `test_cs_deassert_late.sv`, `test_spurious_clk.sv`, `test_overflow.sv`, `test_underflow.sv`, `test_mosi_hold_violation.sv` |
| Multi-slave & advanced | 7 | `test_two_slaves.sv`, `test_daisy_chain.sv`, `test_loopback_mosi_miso.sv`, `test_simultaneous_txrx.sv`, `test_full_duplex.sv`, `test_scoreboard_stress.sv`, `test_coverage_check.sv` |
| **Total** | **40** | |

**File architecture (how it runs):**

```
tb.sv  (top-level testbench — student does not write this)
  |
  +-- spi_if vif();
  +-- spi_env env = new(vif);
  |
  +-- `include "tests/test_smoke.sv"
  +-- `include "tests/test_all_zeros.sv"
  +-- ... (40 includes total)
  |
  initial begin
    run_smoke(env);        // each include provides one task
    run_all_zeros(env);
    ...                    // 40 task calls
    env.report();          // single final scoreboard summary
    $finish;
  end
```

Each test file template:
```sv
// tests/test_rand_byte.sv
task automatic run_rand_byte(spi_env env);
  spi_transaction txn;
  $display("--- Test: rand_byte ---");
  repeat (8) begin
    txn = new();
    void'(txn.randomize());          // let SV pick the data
    env.agent.scb.push_exp(txn.data); // tell scoreboard what to expect
    env.agent.stim_mbx.put(txn);      // queue the stimulus
  end
  env.run(8);
endtask
```

**Student task for Ch.10:** write 5 of the 30 new test files. The other 25 are
pre-loaded in their own read-only tabs. Tier 5 (portfolio).

---

## `from`/`fallback` key map (reference)

When a chapter loads prior-chapter files, it uses these localStorage keys:

| File shown | `from` key (without `aavlsi_code_` prefix) |
|------------|--------------------------------------------|
| `spi_transaction.sv` | `spivoop1-spivoop1l1-design` |
| `spi_scoreboard.sv`  | `spivoop2-spivoop2l1-design` |
| `spi_mailbox.sv`     | `spivoop3-spivoop3l1-design` |
| `spi_if.sv`          | `spivoop4-spivoop4l1-design` |
| `spi_driver.sv`      | `spivoop5-spivoop5l1-design` |
| `spi_monitor.sv`     | `spivoop6-spivoop6l1-design` |
| `spi_agent.sv`       | `spivoop7-spivoop7l1-design` |
| `spi_env.sv`         | `spivoop8-spivoop8l1-design` |

If the student has completed the referenced chapter, `resolveFileContent()` in
`app.js` loads their own code. Otherwise the `fallback` reference implementation
is used so the chapter still compiles.

---

## Verilator flags by chapter

| Chapters     | `timing` flag   | Reason |
|--------------|-----------------|--------|
| spivoop1–5   | `--no-timing`   | No `#delay`, no `@event` in tasks — all function-based |
| spivoop6–10  | `--timing`      | Monitor uses `@(posedge sclk)` event wait — requires fork-safe timing |

`applyLessonFlags` in `app.js` applies the correct flag automatically when the lesson loads.

---

## Certification milestone

The last lesson of **spivoop10** should include the task string:

```javascript
'🎓 Portfolio piece — you built a complete SPI verification environment with 40 test cases. Push this to your GitHub.'
```

A dedicated certificate (e.g., `spi-oop`) can be added to `courses.js` once Ch.10 is built.
