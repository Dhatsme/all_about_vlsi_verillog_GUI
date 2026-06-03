# SPI Deep-Dive — Agent Orchestrator

> **Read this file completely before building anything.**
> This document never changes between sessions. It is the permanent reference for every agent that builds a chapter of the `spi_deep` course.

---

## 1. Mission

Build the **SPI Deep-Dive** course (`spi_deep`) — a 6-month, 16-module standalone track that takes a student from SPI wire definitions all the way through a register-programmable, APB-connected, fully verified SPI master.

**Rules:**
- This course is **entirely independent** of `msv6`, `spi`, or `spitb` courses. Never import, reference, or build on those module IDs.
- All new lesson files live at `static/lessons/modules/<moduleId>.js` where module IDs are from the table in §2.
- Course ID in `courses.js` is `spi_deep`.
- One chapter per session. Stop after step 10 of the build loop.

---

## 2. Curriculum Module Table

| # | Module ID | Title | Phase | Tier | Lessons | Month |
|---|---|---|---|---|---|---|
| 1 | `spi1` | SPI Protocol & Signal Definitions | 1 | 1→2 | 3 | 1 |
| 2 | `spi2` | Clock Divider & SCK Generation | 1 | 2 | 3 | 1 |
| 3 | `spi3` | TX FIFO Design | 2 | 2→3 | 4 | 2 |
| 4 | `spi4` | RX FIFO Design | 2 | 2→3 | 4 | 2 |
| 5 | `spi5` | TX & RX Shift Registers | 2 | 3 | 4 | 2–3 |
| 6 | `spi6` | CPOL/CPHA Timing Engine | 2 | 3→4 | 4 | 3 |
| 7 | `spi7` | CS Controller & Timing | 3 | 3→4 | 4 | 4 |
| 8 | `spi8` | Master FSM | 3 | 4 | 4 | 4 |
| 9 | `spi9` | Error Handling & Interrupt Controller | 3 | 4 | 4 | 4 |
| 10 | `spi10` | SPI Package & Internal Interfaces | 4 | 4 | 3 | 5 |
| 11 | `spi11` | APB Register Interface | 4 | 4→5 | 4 | 5 |
| 12 | `spi12` | Full SPI Master Integration | 4 | 5 | 4 | 5 |
| 13 | `spitb1` | Unit Testbench Suite | 5 | 5 | 4 | 6 |
| 14 | `spitb2` | Corner Case Coverage | 5 | 5 | 4 | 6 |
| 15 | `spitb3` | SVA & Formal Verification | 5 | 5 | 3 | 6 |
| 16 | `spitb4` | Integration & System Verification | 5 | 5 | 4 | 6 |

---

## 3. Build Loop (run every session)

```
1.  Read this file (docs/spi_agent_orchestrator.md) — never skip
2.  Open docs/spi_deep_dive.md — find the first ❌ row → that is the target chapter
3.  Look up the chapter's spec sections in §4 (Module-to-Spec Mapping)
4.  Read the listed spec sections from:
      docs/spi_datapath_spec.md
      docs/spi_master_fsm_spec.md
      Register_spec.txt   (register chapters only)
5.  Check §5 (Dependency Graph) — read prior modules this chapter's testbench needs
6.  Read agent.md — lesson schema, tier rules, Verilator testbench rules
7.  Build  static/lessons/modules/<moduleId>.js
8.  COMMIT 1 (branch: develop):
        files:   static/lessons/modules/<moduleId>.js
        message: 'feat(<moduleId>): <title> — <N> lessons'
9.  COMMIT 2 (branch: develop):
        files:   static/index.html
                 static/lessons/curriculum.js
                 static/lessons/courses.js
        message: 'feat(<moduleId>): register module in index/curriculum/courses'
10. If this chapter is an INTEGRATION CHECKPOINT (§6):
        → Verify the L4 testbench instantiates all required prior modules
        → Check that cross-module signal names match §7 Interface Contracts
11. COMMIT 3 (branch: main):
        files:   docs/spi_deep_dive.md  (❌ → ✅, advance cursor)
        message: 'chore: mark <moduleId> done, advance curriculum cursor'
12. STOP — one chapter per session
```

---

## 4. Module-to-Spec Mapping

Read **exactly** these sections before building each chapter. Reading more is fine; reading less risks missing a critical design constraint.

| Module | Read from spi_datapath_spec.md | Read from spi_master_fsm_spec.md | Read from Register_spec.txt |
|---|---|---|---|
| spi1 | §1 (Introduction), §2.1 (TX overview) | §2 (Signals), §3.1 (state list) | — |
| spi2 | §4 (Clock divider, full section) | §3.4 (SCK handling), §6.3 (bit counter) | CLKDIV register |
| spi3 | §2.2–2.3 (TX FIFO depth/flags) | — | TXDATA, FIFO_CTRL, FIFO_STATUS |
| spi4 | §3.4–3.5 (RX FIFO depth/flags) | — | RXDATA, FIFO_CTRL, FIFO_STATUS |
| spi5 | §2.4–2.6 (TX shift), §3.2 (RX shift) | §6 (shift register equations) | — |
| spi6 | §5 (CPOL/CPHA timing, full section) | §3.4 (SCK/CPHA), §4 (mode table) | CTRL.CPOL, CTRL.CPHA |
| spi7 | §6 (CS controller, full section) | §3.2 (ASSERT_CS/DEASSERT_CS states) | CS_CTRL register |
| spi8 | §11.5–11.12 (FSM outputs per state) | §3 (full FSM spec) | CTRL, STATUS |
| spi9 | §8 (error detection), §9 (interrupts) | §7 (error conditions) | INT_EN, INT_STATUS, MODE_FAULT |
| spi10 | §13.1 (internal signal naming) | §5 (counters/interfaces) | — |
| spi11 | §13.2 (APB slave timing) | — | ALL 18 registers |
| spi12 | All sections | All sections | All registers |
| spitb1 | §14 (DV checklist items 1–10) | §10 (SVA templates) | — |
| spitb2 | §11 (corner case scenarios), §14 (items 11–28) | §7 (error conditions) | — |
| spitb3 | §10 (CDC/timing constraints), §14 (items 29–38) | §10 (SVA assertions) | — |
| spitb4 | §14 (all 38 items) | §10, §11 | All registers |

---

## 5. Dependency Graph

Each chapter's **testbench** may instantiate prior hardware modules. Check this before writing the testbench.

```
spi1   — standalone (no prior hardware)
spi2   — standalone
spi3   — standalone
spi4   — standalone (reuse spi3 FIFO pattern)
spi5   — L4 testbench instantiates: spi2 (clock divider drives launch/sample pulses)
spi6   — L4 testbench instantiates: spi2, spi5
spi7   — standalone CS controller unit test
spi8   — L4 testbench instantiates: spi2, spi5, spi6, spi7   ← Checkpoint B
spi9   — testbench uses spi8 FSM to trigger errors
spi10  — no testbench; schema/interface lesson
spi11  — APB unit test with register map
spi12  — L4 testbench: full spi_top (all modules)           ← Checkpoint C
spitb1 — dedicated unit TBs per module (no new hardware)
spitb2 — uses spi12 spi_top
spitb3 — SVA bound to spi_top
spitb4 — slave model + spi_top + all 38 checklist items     ← Checkpoint D
```

---

## 6. Integration Checkpoint Definitions

| Checkpoint | After Module | L# | What Must Pass |
|---|---|---|---|
| A | spi5 | L4 | spi_clk_div + spi_shift loopback: `PASS rx_data=0xa5` in Mode 0, 8-bit, MSB-first |
| B | spi8 | L4 | 3 back-to-back words in CONT_XFER: CS never toggles mid-burst, bit_cnt resets each word |
| C | spi12 | L4 | APB-driven: all 4 SPI modes × WL=8/16/32; interrupt fires once per burst; RXDATA == TXDATA |
| D | spitb4 | L4 | All 38 DV checklist items print `PASS`; performance within 5% of formula `f_PCLK / (2×(DIV+1))` |

**Checkpoint A** is embedded in `spi5 L4` testbench.
**Checkpoint B** is embedded in `spi8 L4` testbench.
**Checkpoint C** is embedded in `spi12 L4` testbench.
**Checkpoint D** is the entirety of `spitb4 L4`.

---

## 7. Internal Interface Contracts

These signal names are mandatory across all modules. Any deviation causes integration testbenches to fail.

```
MODULE          SIGNAL            DIRECTION    CONNECTS TO
──────────────────────────────────────────────────────────
spi_clk_div  →  rising_edge_p    output       spi_cpha (spi6), spi_shift (spi5)
spi_clk_div  →  falling_edge_p   output       spi_cpha (spi6), spi_shift (spi5)
spi_clk_div  →  sck_out          output       spi_top pad / debug register

spi_cpha     →  launch_pulse     output       spi_shift (spi5)
spi_cpha     →  sample_pulse     output       spi_shift (spi5)
spi_cpha     →  preseed_en       output       spi_master_fsm (ASSERT_CS pre-seed)

spi_shift    →  mosi_out         output       SPI pad
spi_shift    →  rx_data[31:0]    output       spi_rx_fifo (spi4)
spi_shift    →  word_done        output       spi_master_fsm, spi_cs_ctrl

spi_tx_fifo  →  tx_data[31:0]    output       spi_shift
spi_tx_fifo  →  tx_valid         output       spi_master_fsm (empty/underrun detect)
spi_shift    →  tx_ready         output       spi_tx_fifo (pop on word_done)

spi_rx_fifo  →  rx_full          output       spi9 (overrun detect)
spi_master_fsm → fsm_state[6:0]  output       all modules (one-hot)
spi_master_fsm → busy            output       STATUS register, CS controller
spi_master_fsm → abort           output       spi_cs_ctrl, spi_shift

spi_apb_if   →  apb_wr_en        output       spi_reg_block
spi_apb_if   →  apb_rd_en        output       spi_reg_block
spi_apb_if   →  apb_addr[7:0]    output       spi_reg_block
spi_apb_if   →  apb_wdata[31:0]  output       spi_reg_block
spi_reg_block → apb_rdata[31:0]  output       spi_apb_if
spi_reg_block → ctrl_word        output       spi_master_fsm (packed struct, defined in spi_pkg)
```

**One-hot FSM state encoding** (must match across all integration testbenches):
```
IDLE         = 7'b000_0001
LOAD         = 7'b000_0010
ASSERT_CS    = 7'b000_0100
SHIFT        = 7'b000_1000
COMPLETE     = 7'b001_0000
DEASSERT_CS  = 7'b010_0000
ABORT_WAIT   = 7'b100_0000
```

---

## 8. Commit Protocol

Every chapter produces exactly 3 commits (2 to `develop`, 1 to `main`):

```
Commit 1 — develop branch
  Files:   static/lessons/modules/<moduleId>.js
  Format:  feat(<moduleId>): <title> — <N> lessons

Commit 2 — develop branch
  Files:   static/index.html
           static/lessons/curriculum.js
           static/lessons/courses.js
  Format:  feat(<moduleId>): register module in index/curriculum/courses

Commit 3 — main branch
  Files:   docs/spi_deep_dive.md
  Format:  chore: mark <moduleId> done, advance curriculum cursor
```

Use `mcp__github__push_files` for all commits (never `git` CLI for these three).

---

## 9. Registration Rules

### static/index.html
Add one `<script>` tag inside the `<!-- SCRIPTS -->` block, BEFORE `curriculum.js`:
```html
<script src="/lessons/modules/spi1.js"></script>
```

### static/lessons/curriculum.js
Append the module ID to the `CURRICULUM` array (order = display order on landing page).

### static/lessons/courses.js
Course object: `{ id: 'spi_deep', modules: ['spi1'] }`
On first chapter (spi1): create the object.
On subsequent chapters: append the new module ID to the `modules` array.

**Never** add spi_deep module IDs to the `spi` or `spitb` course objects.

---

## 10. Certification Milestones

Embed these as the **final task** in the final lesson of the trigger chapter:

| Certificate | Trigger | Task string |
|---|---|---|
| SPI Foundations | spi5 L4 | `'🎓 SPI Foundations — you built the complete data path: clkdiv, FIFOs, shift registers'` |
| SPI Protocol Engineer | spi8 L4 | `'🎓 SPI Protocol Engineer — your FSM correctly sequences all 4 modes and survives abort'` |
| SPI Silicon Designer | spi12 L4 | `'🎓 SPI Silicon Designer — you built a register-programmable, APB-connected SPI master from scratch'` |
| SPI Verification Engineer | spitb4 L4 | `'🎓 SPI Verification Engineer — 38-item DV checklist complete; your design is handoff-ready'` |

---

## 11. Lesson Content Depth Requirements

This course is a deep-dive. Every lesson must meet these minimum content standards:

**Theory field:**
- At minimum: 1 block diagram or signal-flow diagram in ASCII
- At minimum: 1 truth table or mode table where applicable
- Must explain the WHY, not just the what (constraints, traps, physical reality)
- Call out the most common RTL implementation mistake for this block explicitly
- Reference the spec signal names from §7 above — students see the same names in hardware

**Testbench field:**
- All testbenches use Verilator 5.020 rules (from agent.md)
- Clocked testbenches run at least 20 clock cycles of meaningful stimulus
- Every `$display` line starts with `PASS` or `FAIL`
- Integration checkpoint testbenches print the checkpoint name: `$display("=== Checkpoint A: Clock+Shift Loopback ===")`

**Known design traps (must be mentioned in the relevant chapter's theory):**

| Chapter | Trap | Where to explain |
|---|---|---|
| spi2 | DIV=0 → 2-cycle toggle; enable=0 must freeze at CPOL not mid-toggle | spi2 L3 theory |
| spi3/4 | FIFO full/empty from pointer MSBs, not a count register | spi3 L1 theory |
| spi5 | LSB-first shifts in opposite direction; rx_shift builds from wrong end | spi5 L2 theory |
| spi6 | **CPHA=0 first-bit pre-seed**: MOSI must be valid BEFORE first SCK edge | spi6 L2 theory |
| spi6 | **CPHA=1 last-bit guard**: one extra sample_pulse after word_done | spi6 L3 theory |
| spi7 | CS_POST_DELAY=0 with CONT_XFER: no gap between words (correct!) | spi7 L4 theory |
| spi8 | Shadow registers: config captured on IDLE→LOAD, not during SHIFT | spi8 L4 theory |
| spi9 | TX_UNDERRUN is sticky; FSM continues transmitting zeros, not zeros then abort | spi9 L1 theory |
| spi11 | W1P fields (SOFT_RST, START, ABORT) self-clear next cycle; polling sees 0 | spi11 L2 theory |

---

## 12. Chapter Content Summaries

### spi1 — SPI Protocol & Signal Definitions
Purely educational (no hardware module).
- L1 (T1): MOSI/MISO/SCK/SS_n roles; assign-statement wire model; frame diagram
- L2 (T1): Full-duplex exchange model; shift-register circular buffer; slave-echo pattern
- L3 (T2): 4-mode CPOL×CPHA table; student writes the always_comb mode decoder

### spi2 — Clock Divider & SCK Generation
Builds: `spi_clk_div` module.
- L1 (T2): 16-bit div_cnt counter + sck_int toggle; counter reset on match
- L2 (T2): CPOL idle gate: `sck_out = enable ? sck_int : cpol`; test disable mid-sequence
- L3 (T2): Edge detector: rising_edge_p / falling_edge_p from sck_int XOR sck_prev; count pulses over N cycles

### spi3 — TX FIFO Design
Builds: `spi_tx_fifo` parameterised synchronous FIFO.
- L1 (T2): Pointer arithmetic (wr_ptr, rd_ptr, log2D+1 bits); empty/full from MSBs
- L2 (T2): TX_LEVEL counter + almost_empty / almost_full flags; parameterised watermark
- L3 (T3): Overflow behaviour: drop-on-full; ovf_sticky W1C flag
- L4 (T3): Flush (TX_FLUSH W1P): pointer reset in one cycle; test flush while mid-read

### spi4 — RX FIFO Design
Builds: `spi_rx_fifo` (mirror of spi3; student applies pattern independently).
- L1 (T2): Same pointer arithmetic; write side is the SPI engine not the CPU
- L2 (T2): Underflow: rd_en while empty → returns 0, sets udf_sticky
- L3 (T3): almost_full watermark triggers DMA request
- L4 (T3): Flush (RX_FLUSH W1P); simultaneous push+pop edge case

### spi5 — TX & RX Shift Registers
Builds: `spi_shift` combined shift register.
- L1 (T3): Parallel load + MSB-first: `mosi_out = tx_shift[WL-1]; tx_shift <<= 1`
- L2 (T3): LSB-first mux: `mosi_out = lsb_first ? tx_shift[0] : tx_shift[WL-1]`; shift direction change
- L3 (T3): RX capture: MSB-first `{rx_shift[WL-2:0], miso_in}` vs LSB `{miso_in, rx_shift[WL-1:1]}`
- L4 (T3): word_done from bit_cnt; IO_MODE skip factor; **Checkpoint A testbench** embedded

### spi6 — CPOL/CPHA Timing Engine
Builds: `spi_cpha` timing mux module.
- L1 (T3): Mode edge table: combinational mux of launch/sample from rising/falling pulses
- L2 (T4): CPHA=0 pre-seed: preseed_en fires at ASSERT_CS entry; MOSI pre-loaded
- L3 (T4): CPHA=1 last-bit guard: last_sample_pending register; extra sample after word_done
- L4 (T4): Mode change detection during active transfer: mode_change_err sticky flag

### spi7 — CS Controller & Timing
Builds: `spi_cs_ctrl` module.
- L1 (T3): CS decode + polarity inversion: `spi_csn_o[i] = cs_n_raw[i] ^ cs_pol[i]`
- L2 (T3): Pre-delay counter: pre_cnt counts to cs_pre_delay; transition on match
- L3 (T4): Post-delay counter: post_cnt in DEASSERT_CS state
- L4 (T4): HOLD_CS burst: no CS toggle when `cont_xfer & hold_cs & !tx_empty`; FRAME_GAP counter

### spi8 — Master FSM
Builds: `spi_master_fsm` 7-state one-hot FSM.
- L1 (T4): States + one-hot enum; IDLE→LOAD→ASSERT_CS transitions
- L2 (T4): SHIFT→COMPLETE→DEASSERT_CS; bit_cnt on launch_pulse; transition on bit_cnt==word_len
- L3 (T4): ABORT_WAIT + SOFT_RST paths; output actions table per state
- L4 (T4): Shadow register latch on IDLE→LOAD; CONT_XFER loop; **Checkpoint B testbench** embedded

### spi9 — Error Handling & Interrupt Controller
Builds: `spi_errors` + `spi_irq`.
- L1 (T4): TX underrun: tx_empty on LOAD entry; sticky flag; transmit zeros policy
- L2 (T4): RX overrun: rx_full on COMPLETE entry; word dropped; sticky
- L3 (T4): Mode fault (3 sub-causes): cs_contention, cpol_change_busy, cpha_change_busy
- L4 (T4): Interrupt controller: `spi_irq_o = global_en & |(int_status & int_en)`; W1C clear

### spi10 — SPI Package & Internal Interfaces
Builds: `spi_pkg.sv` SystemVerilog package.
- L1 (T4): typedef enum for FSM state; typedef struct for config bundle
- L2 (T4): interface spi_tx_if (tx_valid/tx_ready/tx_data); interface spi_rx_if
- L3 (T4): Wire spi3/spi4 FIFOs through interface ports; verify same behaviour

### spi11 — APB Register Interface
Builds: `spi_apb_if` + `spi_reg_block` (18 registers).
- L1 (T4): APB slave FSM (IDLE→SETUP→ACCESS); pready/pslverr timing
- L2 (T4): CTRL + STATUS registers; W1P fields; write-mask logic
- L3 (T4): FIFO_CTRL (TX_FLUSH/RX_FLUSH W1P), INT_EN, INT_STATUS (W1C), CLKDIV, CS_CTRL
- L4 (T5): DEBUG + CAPABILITIES + VERSION; tie all 18 registers to module signals

### spi12 — Full SPI Master Integration
Builds: `spi_top` — instantiates all prior modules.
- L1 (T5): Datapath assembly: spi2 + spi5 + spi6 wired with spi_pkg interfaces
- L2 (T5): Control path: spi7 + spi8 + spi9 connected through spi_pkg
- L3 (T5): APB integration: spi11 register bank drives all control; STATUS mirrors outputs; loopback self-test
- L4 (T5): Multi-slave system: 2 CS lines, CONT_XFER burst, interrupt-driven drain; **Checkpoint C testbench** embedded

### spitb1 — Unit Testbench Suite
One dedicated self-checking testbench per prior module.
- L1 (T5): spi_clk_div_tb: edge count over 100 cycles, CPOL idle, enable gating
- L2 (T5): spi_fifo_tb: fill to full, overflow, flush, watermark thresholds (covers both TX and RX)
- L3 (T5): spi_shift_tb: WL=1 and WL=32, all 4 modes, LSB+MSB, loopback
- L4 (T5): spi_fsm_tb: all 7 states, ABORT mid-SHIFT, SOFT_RST, shadow register capture

### spitb2 — Corner Case Coverage
Maps to spi_datapath_spec.md §14 DV checklist items 1–28.
- L1 (T5): Clock extremes: DIV=0, CS delays=0, WL=1 vs WL=32
- L2 (T5): CONT_XFER traps: TX drain at word boundary, TX drain mid-burst, FRAME_GAP+CPHA=1
- L3 (T5): ABORT races: during ASSERT_CS, during last bit (bit_cnt=WL-1), SOFT_RST during SHIFT
- L4 (T5): FIFO races: write while TX_FULL (drop), read while RX_EMPTY (underflow), simultaneous push+pop

### spitb3 — SVA & Formal Verification
SystemVerilog assertions bound to `spi_top`.
- L1 (T5): Safety: BUSY spans LOAD→post-delay; CS before SCK; bit_cnt ≤ WORD_LEN
- L2 (T5): Protocol compliance: MOSI stable on sample edge per mode; CS active during SHIFT
- L3 (T5): Formal: liveness (START → eventually DONE); FIFO integrity (push-then-pop = round-trip)

### spitb4 — Integration & System Verification
Builds: reference SPI slave model + end-to-end system test.
- L1 (T5): SPI slave model: edge-tracks SCK, deserialises MOSI, drives MISO response
- L2 (T5): All 4 modes × 3 word widths (8/16/32): master→slave and slave→master
- L3 (T5): Performance: throughput formula; measure actual cycles vs `f_PCLK/(2×(DIV+1))`; compare to spec
- L4 (T5): 38-item DV checklist from spi_datapath_spec.md §14; each item prints `PASS`; **Checkpoint D**

---

*End of orchestrator. This file does not change between sessions.*
