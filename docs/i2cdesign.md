# docs/i2cdesign.md — I²C Design Course Content Guide

This file is the build-agent's source of truth for the I²C Design course (i2c1–i2c8).

**How to use:**
1. Find the first row with `❌ **build this next**` — that is the target chapter.
2. Read the lesson table for that chapter — each row is one lesson to build.
3. After building and pushing, change `❌ **build this next**` to `✅ done` and set `❌ **build this next**` on the next chapter.

---

## Curriculum status

| # | Module ID | Title | Lessons | Status |
|---|---|---|---|---|
| 1 | `i2c1` | Open-Drain Fundamentals | i2c1l1–i2c1l6 (6 lessons) | ❌ **build this next** |
| 2 | `i2c2` | Clock and Data Timing | i2c2l1–i2c2l6 (6 lessons) | ❌ |
| 3 | `i2c3` | Byte Transmission | i2c3l1–i2c3l6 (6 lessons) | ❌ |
| 4 | `i2c4` | ACK/NACK and Error Handling | i2c4l1–i2c4l5 (5 lessons) | ❌ |
| 5 | `i2c5` | Master Controller FSM | i2c5l1–i2c5l6 (6 lessons) | ❌ |
| 6 | `i2c6` | Slave Implementation | i2c6l1–i2c6l5 (5 lessons) | ❌ |
| 7 | `i2c7` | Clock Stretching & Multi-Master | i2c7l1–i2c7l5 (5 lessons) | ❌ |
| 8 | `i2c8` | Complete I²C Subsystem | i2c8l1–i2c8l5 (5 lessons) | ❌ |

---

## Chapter content guides

---

### i2c1 — Open-Drain Fundamentals
**File:** `static/lessons/modules/i2c1.js`
**Level:** beginner
**Tier range:** 1 → 2
**Icon:** 🔌

The learner has never seen open-drain signalling before. Every concept is new.
Start with the physical analogy before touching SystemVerilog.

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c1l1 | What is I²C? Bus Topology | 1 | Wire-AND, open-drain principle, why not push-pull | No code — theory + ASCII diagram only. Theory block diagram: VDD → pull-up → SDA wire shared by Master + Slave |
| i2c1l2 | The Open-Drain IO Cell | 1 | `inout wire`, `1'bz` (high-Z release), tristate assign | `open_drain_cell` — 4 ports: tx_en, tx_data, sda (inout wire), rx_data |
| i2c1l3 | Pull-Up Resistors in Simulation | 2 | `pullup` primitive, why `wire` not `logic` for inout | Testbench only — wrap i2c1l2 DUT with `pullup pu(sda);`, verify released sda reads 1 |
| i2c1l4 | Reading Back from the Bus | 2 | `rx_data = sda` read-back, multi-driver bus | Extend i2c1l2: add `assign rx_data = sda;`, verify readback matches driven value |
| i2c1l5 | Wire-AND: Two Drivers on One Bus | 2 | What happens when master AND slave both drive simultaneously | Two-instance testbench: instantiate two `open_drain_cell`s sharing one `wire sda`; show wire-AND: both must release for SDA to go high |
| i2c1l6 | START and STOP Conditions | 2 | SDA transitions while SCL is high; why this is special | `start_stop_detect` — combinational module: output `start_det` high when SDA falls while SCL is high; `stop_det` high when SDA rises while SCL is high |

**Theory block diagrams required:**
- i2c1l1: full ASCII bus topology (VDD, pull-up, SDA, SCL, Master, Slave)
- i2c1l2: signal-flow `flow-diagram`: `tx_en/tx_data → Output Driver → SDA Bus ⇄ → rx_data`
- i2c1l5: ASCII showing two open-drain drivers: only wire-AND produces the correct result
- i2c1l6: timing diagram ASCII showing START (SDA↓ while SCL=1) and STOP (SDA↑ while SCL=1)

**Testbench pattern:** Open-drain pattern (inout) for i2c1l2–i2c1l5; combinational Pattern A for i2c1l6.
**Randomization:** Not required for Tier 1/2. i2c1l5 and i2c1l6 testbenches use directed vectors only.

---

### i2c2 — Clock and Data Timing
**File:** `static/lessons/modules/i2c2.js`
**Level:** beginner → intermediate
**Tier range:** 2 → 3
**Icon:** ⏱️

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c2l1 | SCL Clock Generator | 2 | Counter-based clock divider; `CLK_DIV` parameter | `scl_gen` — parameter CLK_DIV=250 (100 kHz from 50 MHz); output logic scl |
| i2c2l2 | Bit Timing — Setup and Hold | 2 | SDA must be stable while SCL is high; setup/hold diagram | `timing_checker` — combinational: output `violation` if sda changes while scl is high. ASCII timing diagram in theory |
| i2c2l3 | Generating a START Condition | 3 | SDA falls while SCL is still high; then SCL falls | `start_gen` FSM — states: IDLE → SCL_HIGH → SDA_FALL → SCL_FALL → DONE. Output: scl, sda |
| i2c2l4 | Generating a STOP Condition | 3 | SCL rises first, then SDA rises while SCL is high | `stop_gen` FSM — states: IDLE → SCL_LOW → SCL_RISE → SDA_RISE → DONE. Output: scl, sda |
| i2c2l5 | Combining START + STOP | 3 | Sequencing two FSMs; shared SCL | `start_stop_gen` — combined FSM: IDLE → START (reuse) → ... → STOP (reuse) → IDLE. `start_i` input triggers the sequence |
| i2c2l6 | Randomized Timing Testbench | 3 | `$urandom_range` for random byte delays; Pattern E | Testbench for i2c2l5: 20 randomized START→STOP cycles with `$urandom_range(1, 8)` for inter-byte gap |

**Theory block diagrams required:**
- i2c2l1: ASCII timing diagram of SCL: `‾‾‾|___|‾‾‾|___|` with CLK_DIV period labels
- i2c2l2: ASCII SDA/SCL timing showing setup/hold windows
- i2c2l3: FSM state diagram: `IDLE → SCL_HIGH → SDA_FALL → SCL_FALL → DONE`
- i2c2l4: FSM state diagram: `IDLE → SCL_LOW → SCL_RISE → SDA_RISE → DONE`
- i2c2l5: Combined waveform: SCL and SDA during START and STOP

**Testbench pattern:** Pattern E (randomized sequential) for i2c2l6.

---

### i2c3 — Byte Transmission
**File:** `static/lessons/modules/i2c3.js`
**Level:** intermediate
**Tier range:** 2 → 3
**Icon:** 📤
**Certificate trigger:** i2c3l6 — add `'🎓 I²C Fundamentals certificate unlocked — you can transmit and receive I²C bytes'`

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c3l1 | MSB-First Shift Register | 2 | Shift register, `<<` operator, MSB-first convention | `bit_shifter` — 8-bit parallel-load, serial-out shift register. `load` input latches data; each `shift` pulse outputs MSB |
| i2c3l2 | Bit Counter | 2 | Count to 8, detect completion, clear on load | `bit_counter` — counts from 0 to 7; `done` output goes high after 8 shifts; resets on `load` |
| i2c3l3 | Byte TX FSM Skeleton | 3 | Enum states, FSM skeleton with no datapath yet | `byte_tx` FSM states only: `IDLE → LOAD → SHIFT → DONE`. Enum declared; state register; next-state logic. No data outputs yet |
| i2c3l4 | Byte TX — Adding the Datapath | 3 | Connecting shift register to FSM; `tx_bit` output | Extend i2c3l3: wire in shift register and bit counter. Output `tx_bit` = MSB of shift reg. Output `busy` = not IDLE |
| i2c3l5 | Integrating with SCL | 3 | SDA changes only on SCL falling edge; `sda` output valid while SCL high | Extend i2c3l4: gate `shift` pulse on SCL falling edge. Verify SDA is stable while SCL is high (meets setup/hold from i2c2l2) |
| i2c3l6 | Randomized Byte TX Testbench | 3 | 20-iteration randomized byte transmission; Pattern E | Full testbench for `byte_tx`: 20 random bytes via `$urandom_range(0, 255)`, verify each bit on the rising SCL edge. Certificate lesson |

**Theory block diagrams required:**
- i2c3l1: ASCII showing 8-bit shift register with parallel load and serial-out arrow
- i2c3l3: FSM state diagram: `IDLE ──(send)──→ LOAD ──→ SHIFT[×8] ──→ DONE ──→ IDLE`
- i2c3l5: SDA/SCL waveform ASCII showing bit changes aligned to SCL falling edges

**Testbench pattern:** Pattern A (directed combinational) for i2c3l1/l2; Pattern E (randomized sequential) for i2c3l5/l6.

---

### i2c4 — ACK/NACK and Error Handling
**File:** `static/lessons/modules/i2c4.js`
**Level:** intermediate
**Tier range:** 3 → 4
**Icon:** ✅

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c4l1 | The ACK Bit — Protocol | 3 | Ninth clock cycle, slave pulls SDA low = ACK; high = NACK | Theory + testbench only. No design code. Simulate a slave pulling SDA low on the 9th SCL pulse |
| i2c4l2 | ACK Detector | 3 | Sample SDA on SCL rising edge at bit 9 | `ack_det` — combinational: `ack = (bit_cnt == 8) && (sda == 0)` — output `got_ack` and `got_nack` |
| i2c4l3 | ACK in the TX FSM | 4 | Add ACK-wait state after SHIFT; branch on got_ack | Extend i2c3l4 FSM: add `ACK_WAIT` state. On NACK → `ERROR` state; on ACK → `DONE` |
| i2c4l4 | Error Recovery | 4 | What to do after NACK: retry vs abort; `error_out` flag | Extend i2c4l3: add `RETRY` counter (up to 3 attempts), then `ABORT` if all fail. Output `error_out` |
| i2c4l5 | Randomized ACK/NACK Testbench | 4 | Randomized ack/nack responses; 20 transactions | Pattern E testbench: `$urandom_range(0, 3)` for ack delay; randomly inject NACK every ~5 cycles and verify FSM reaches ERROR state correctly |

**Theory block diagrams required:**
- i2c4l1: timing diagram showing 8 data bits + 9th ACK clock cycle, SDA pulled low by slave
- i2c4l3: updated FSM: `IDLE → LOAD → SHIFT → ACK_WAIT → DONE or ERROR`
- i2c4l4: updated FSM: `ERROR → RETRY (up to 3) → ABORT`

---

### i2c5 — Master Controller FSM
**File:** `static/lessons/modules/i2c5.js`
**Level:** intermediate → advanced
**Tier range:** 3 → 4
**Icon:** 🎛️

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c5l1 | Master Transaction Overview | 3 | Full I²C write: START + ADDR + RW + ACK + DATA[n] + STOP | Theory only + ASCII transaction diagram. No code — sets up the next 4 lessons |
| i2c5l2 | Address Phase | 3 | 7-bit address + R/W bit; output 8 bits first | `addr_phase` — load 7-bit addr + rw bit, shift out MSB-first using i2c3 byte_tx pattern |
| i2c5l3 | Data Phase | 4 | Repeat byte TX for each data byte; `data_count` register | `data_phase` — parameterized N bytes; instantiate `byte_tx` N times via a counter |
| i2c5l4 | Master Controller FSM | 4 | Top-level FSM wiring all phases together | `i2c_master` — states: IDLE → START → ADDR → ADDR_ACK → DATA[0..N] → DATA_ACK → STOP → IDLE |
| i2c5l5 | Read Transactions | 4 | Turning around SDA direction; reading bits on SCL rising edge | Extend `i2c_master`: add `RW=1` path: ADDR → ADDR_ACK → RX_DATA → send ACK/NACK → STOP |
| i2c5l6 | Randomized Master Testbench | 4 | 20 randomized write+read transactions; Pattern E | Testbench: `$urandom_range(0, 127)` for address; `$urandom_range(0, 255)` for data; verify full transaction waveform |

**Theory block diagrams required:**
- i2c5l1: full I²C transaction timing diagram: START | ADDR[6:0] | R/W | ACK | DATA[7:0] | ACK | STOP
- i2c5l4: master FSM state diagram covering all states
- i2c5l5: SDA direction turnaround: Master releases SDA → Slave drives DATA bits

---

### i2c6 — Slave Implementation
**File:** `static/lessons/modules/i2c6.js`
**Level:** advanced
**Tier range:** 4
**Icon:** 🔧

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c6l1 | Slave Address Matching | 4 | Compare received address against MY_ADDR parameter; assert `selected` | `addr_match` — sample 7 bits from SDA on each SCL rising edge; compare to `MY_ADDR`; output `selected` after 7 bits |
| i2c6l2 | Slave ACK Generation | 4 | Pull SDA low during the 9th SCL cycle when selected | `slave_ack` — combinational: `sda_out = (bit_cnt == 8 && selected) ? 1'b0 : 1'bz` |
| i2c6l3 | Slave Receiver | 4 | Shift in 8 bits from SDA on SCL rising edges; `data_valid` flag | `slave_rx` — shift register captures SDA on each SCL rising edge; asserts `data_valid` after 8 bits |
| i2c6l4 | Slave FSM | 4 | IDLE → ADDR_SAMPLE → ACK → RX_DATA → ACK → IDLE | `i2c_slave` — top-level slave FSM integrating address matching, ACK generation, and data reception |
| i2c6l5 | Master–Slave Integration Testbench | 4 | Connect i2c5 master to i2c6 slave on shared SDA/SCL wires | Pattern E testbench: 20 randomized write transactions from master to slave; verify slave captures correct data. Uses `wire sda, scl;` shared bus |

**Theory block diagrams required:**
- i2c6l1: ASCII showing slave listening: `SCL↑ → sample SDA → shift into addr_reg → compare`
- i2c6l4: slave FSM state diagram
- i2c6l5: ASCII bus diagram: Master ─── SDA/SCL (wire) ─── Slave, both with open-drain drivers

---

### i2c7 — Clock Stretching & Multi-Master
**File:** `static/lessons/modules/i2c7.js`
**Level:** advanced
**Tier range:** 4 → 5
**Icon:** ⏳

| Lesson ID | Title | Tier | New concept | Circuit to build |
|---|---|---|---|---|
| i2c7l1 | Clock Stretching — Concept | 4 | Slave holds SCL low to buy time; master must detect and wait | Theory + ASCII timing diagram. Extend slave: add `stretch` input; while high, slave holds SCL low via open-drain |
| i2c7l2 | Clock Stretch Detector in Master | 4 | Master checks SCL; if SCL stays low after master releases, a slave is stretching | Extend `i2c_master`: add `scl_stuck` detection (counter-based timeout); assert `stretching` flag; pause SCL generation |
| i2c7l3 | Arbitration — Concept | 4 | Two masters both start transmitting; wire-AND reveals collision | Theory only. ASCII diagram showing two masters, one loses arbitration when it drives 1 but reads 0 |
| i2c7l4 | Arbitration Logic | 5 | Detect collision: master drives SDA=1 but reads SDA=0 → lost arbitration | `arb_detector` — output `lost_arb` when `sda_drive == 1 && sda_in == 0`. Master FSM responds by going to IDLE |
| i2c7l5 | Randomized Multi-Master Testbench | 5 | Two masters, randomized start times; verify only one wins | Pattern E testbench: `$urandom_range(0, 3)` for start-time offset; two master instances share wire SDA; verify exactly one completes transaction |

**Theory block diagrams required:**
- i2c7l1: SCL waveform showing slave holding it low (stretch) while master waits
- i2c7l3: two-master collision: Master A sees SDA=0 it didn't drive → loses, backs off

---

### i2c8 — Complete I²C Subsystem (Portfolio)
**File:** `static/lessons/modules/i2c8.js`
**Level:** advanced
**Tier range:** 5
**Icon:** 🏆
**Certificate trigger:** i2c8l5 — add `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'`

All lessons are Tier 5 (portfolio). Hints are ASCII block diagrams and sub-module lists — NO implementation code.

| Lesson ID | Title | Tier | Spec | What to build |
|---|---|---|---|---|
| i2c8l1 | System Architecture | 5 | Design a complete I²C subsystem block diagram | Top-level `i2c_subsystem` with: i2c_master, i2c_slave (×2), shared SDA/SCL bus, register file for slave data, IRQ output |
| i2c8l2 | Register File Interface | 5 | Slave exposes 8 × 8-bit registers; master can read/write by address | `i2c_regfile` — 8 registers; I²C protocol: first byte = register address, second byte = data |
| i2c8l3 | Interrupt Controller | 5 | Slave asserts IRQ when data arrives in register 7 | Extend `i2c_slave`: add `irq` output; assert when `data_valid && addr == 7` |
| i2c8l4 | Full Integration | 5 | Wire everything together; 30-iteration randomized stress test | `i2c_top` — instantiate master + 2 slaves + regfile; Pattern E testbench with 30 `$urandom_range` transactions |
| i2c8l5 | Portfolio Submission | 5 | Push to GitHub; write README explaining the design decisions | Certificate lesson. No new code — verification task: write at least 50 randomized transactions, document waveforms |

**Theory block diagrams required (all lessons):**
- i2c8l1: full system ASCII block diagram showing all sub-modules and their connections
- i2c8l2: register map table + read/write protocol timing diagram
- i2c8l4: integration ASCII showing data flow from CPU → i2c_master → SDA/SCL → i2c_slave → regfile → IRQ

---

## Tier assignment table (I²C Design course)

| Chapter | Tier range | Notes |
|---|---|---|
| i2c1 (Open-Drain) | 1 → 2 | First hardware course — fully guided |
| i2c2 (Timing) | 2 → 3 | Clock gen at tier 2; FSMs at tier 3 |
| i2c3 (Byte TX) | 2 → 3 | Shift register at tier 2; integration at tier 3 |
| i2c4 (ACK/NACK) | 3 → 4 | ACK detector at tier 3; error recovery at tier 4 |
| i2c5 (Master FSM) | 3 → 4 | Address phase at tier 3; full master at tier 4 |
| i2c6 (Slave) | 4 | All slave lessons at tier 4 |
| i2c7 (Stretching) | 4 → 5 | Clock stretch at tier 4; arbitration at tier 5 |
| i2c8 (Portfolio) | 5 | All portfolio pieces |

---

## Randomization tier gates

| Tier | Randomization requirement |
|---|---|
| Tier 1 | Not required — directed tests only |
| Tier 2 | Not required — directed tests only |
| Tier 3 | MUST include `$urandom_range` loop — minimum 20 iterations |
| Tier 4 | MUST include `$urandom_range` loop — minimum 20 iterations |
| Tier 5 | MUST include `$urandom_range` loop — minimum 30 iterations |
