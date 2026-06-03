# SPI Master FSM Specification
**Source documents:** `Microarch_spi.pdf` · `Spi spec.pdf` · `Register_spec.txt`
**Branch context:** `claude/spi-master-fsm-spec-CaaqI`

---

## 1. Purpose

This document is the reusable reference for building SPI Master FSM lessons and
testbenches in this curriculum.  It is derived verbatim from the three design
documents uploaded to the root of the repo.  Every design decision traces back
to one of those sources.

---

## 2. Top-Level Architecture

```
+--------------------------------------------+
|              SPI Controller                |
|                                            |
|  +-------------+   +------------------+   |
|  |  APB IF     |<->|  Control Regs    |   |
|  +-------------+   +------------------+   |
|        |                    |             |
|        v                    v             |
|  +-------------+   +------------------+  |
|  |   TX FIFO   |   |    RX FIFO       |  |
|  +-------------+   +------------------+  |
|        |                    ^             |
|        v                    |             |
|  +-------------------------------+        |
|  |      SPI Protocol Engine      |        |
|  |      (Master / Slave FSM)     |        |
|  +-------------------------------+        |
|            |                              |
|            v                              |
|  +---------------------------------+      |
|  |      Interrupt Controller       |      |
|  +---------------------------------+      |
+--------------------------------------------+
```

Key modules:
- **APB Interface** — AMBA APB3/4 slave; decodes psel/penable/paddr, drives pready/pslverr
- **Control/Status Registers** — memory-mapped CSR bank (see Section 4)
- **Clock Divider** — generates SCLK from pclk_i using CLKDIV.DIV; SCK_freq = pclk_i / (2×(DIV+1))
- **TX FIFO** — depth 16–64 words (parameterised); CPU writes TXDATA → FIFO; FSM pops
- **RX FIFO** — depth 16–64 words; FSM pushes captured word; CPU reads RXDATA → FIFO pop
- **SPI Protocol Engine** — the Master FSM described in Section 3
- **Interrupt Controller** — collects sticky flags, ORs with INT_EN, drives spi_irq_o

---

## 3. Master FSM

### 3.1 States

| State | Encoding (debug[3:0]) | Description |
|---|---|---|
| `IDLE` | 4'h0 | Quiescent. SCK = CPOL, CS = deasserted, BUSY = 0 |
| `LOAD` | 4'h1 | Pop one word from TX FIFO into shift register |
| `ASSERT_CS` | 4'h2 | Assert selected CS line; count CS_PRE_DELAY PCLK cycles |
| `SHIFT` | 4'h3 | Toggle SCK, drive MOSI, sample MISO; bit counter runs |
| `COMPLETE` | 4'h4 | Last bit done; push RX word to RX FIFO; decide continuation |
| `DEASSERT_CS` | 4'h5 | Deassert CS; count CS_POST_DELAY PCLK cycles |
| `ABORT_WAIT` | 4'h6 | Abort in progress; finish post-delay then go IDLE |

The DEBUG register (`0x02C`) field `FSM_STATE[31:28]` exposes this encoding at runtime.

---

### 3.2 State Transition Table

```
                    ┌──────────────────────────────────────────────────┐
                    │ SOFT_RST or SPI_EN=0 (from any state)            │
                    ▼                                                   │
 ┌──────┐  START & !TX_EMPTY  ┌──────┐  word loaded   ┌───────────┐   │
 │ IDLE │ ──────────────────► │ LOAD │ ─────────────► │ ASSERT_CS │   │
 └──────┘  & SPI_EN & MASTER  └──────┘                └───────────┘   │
    ▲                                                       │          │
    │                                              pre_delay_done      │
    │                                                       ▼          │
    │                                               ┌───────────┐      │
    │         CONT_XFER & HOLD_CS & !TX_EMPTY        │   SHIFT   │      │
    │         ◄─────────────────────────────────────┤           │      │
    │                                               └───────────┘      │
    │                                                       │          │
    │                                             bit_cnt == WORD_LEN  │
    │                                                       ▼          │
    │                                               ┌──────────┐       │
    │  !CONT_XFER OR TX_EMPTY OR !HOLD_CS           │ COMPLETE │       │
    │  ◄────────────────────────────────────────────┤          │       │
    │  (via DEASSERT_CS)                            └──────────┘       │
    │                                                                   │
    │  ABORT (from SHIFT or ASSERT_CS or LOAD)                         │
    └───────────────────────────── ABORT_WAIT ─────────────────────────┘
```

#### Transition conditions

| From | To | Condition |
|---|---|---|
| IDLE | LOAD | `START` pulse AND `TX_EMPTY=0` AND `SPI_EN=1` AND `MASTER_EN=1` |
| LOAD | ASSERT_CS | TX word latched into shift register (1 cycle) |
| ASSERT_CS | SHIFT | `pre_delay_counter == CS_PRE_DELAY` |
| SHIFT | SHIFT | `bit_cnt < WORD_LEN` (stay, toggle SCK) |
| SHIFT | COMPLETE | `bit_cnt == WORD_LEN` (last bit shifted) |
| COMPLETE | LOAD | `CONT_XFER=1` AND `HOLD_CS=1` AND `TX_EMPTY=0` |
| COMPLETE | DEASSERT_CS | `!CONT_XFER` OR `TX_EMPTY=1` OR `!HOLD_CS` |
| DEASSERT_CS | IDLE | `post_delay_counter == CS_POST_DELAY` |
| any | ABORT_WAIT | `CTRL.ABORT` write (W1P) |
| ABORT_WAIT | IDLE | post-delay done; sets `STATUS.ABORTED` |
| any | IDLE | `CTRL.SOFT_RST` write (W1P) OR `SPI_EN` cleared |

---

### 3.3 Output Actions Per State

| State | SCK | CS | MOSI | MISO | BUSY | Other |
|---|---|---|---|---|---|---|
| IDLE | `CPOL` | deasserted | hold | ignored | 0 | — |
| LOAD | `CPOL` | deasserted | hold | ignored | 1 | Pop TX FIFO; load shift reg |
| ASSERT_CS | `CPOL` | **asserted** | MSB of shift reg | ignored | 1 | Pre-delay counter runs |
| SHIFT | toggling | asserted | shift reg MSB/LSB | **sampled** | 1 | `bit_cnt++`; shift reg rotates |
| COMPLETE | `CPOL` | asserted | hold | ignored | 1 | Push RX shift reg → RX FIFO; fire DONE interrupt |
| DEASSERT_CS | `CPOL` | **deasserted** | hold | ignored | 1 | Post-delay counter runs |
| ABORT_WAIT | `CPOL` | deasserted | hold | ignored | 1 | Post-delay then set `STATUS.ABORTED` |

> **LSB_FIRST**: when `CTRL.LSB_FIRST=1`, MOSI is driven from bit 0 upward; MISO is received into the MSB end.
> **AUTO_CS**: when `CTRL.AUTO_CS=0`, CS is controlled purely by the CS_CTRL register / software GPIO; the FSM still runs the same states but leaves CS pin undriven by the engine.

---

### 3.4 CPOL / CPHA Mode Table

| Mode | CPOL | CPHA | SCK idle | MOSI launched on | MISO sampled on |
|---|---|---|---|---|---|
| 0 | 0 | 0 | LOW  | Falling edge | Rising edge  (1st edge) |
| 1 | 0 | 1 | LOW  | Rising edge  | Falling edge (2nd edge) |
| 2 | 1 | 0 | HIGH | Rising edge  | Falling edge (1st edge) |
| 3 | 1 | 1 | HIGH | Falling edge | Rising edge  (2nd edge) |

In the SHIFT state the SCK toggle logic must look at `{CPOL, CPHA}` to decide:
- Which first edge direction to start with
- Whether to sample on the leading or trailing edge

The general rule: **CPHA=0** → sample on the *first* clock edge after CS asserts;
**CPHA=1** → sample on the *second* edge (data is launched on the first edge).

---

## 4. Registers Used by the Master FSM

### CTRL — 0x000

| Field | Bits | How the FSM uses it |
|---|---|---|
| `SOFT_RST` | [31] W1P | Synchronous path: return to IDLE, clear all counters |
| `ABORT` | [30] W1P | Abort active transfer; next state = ABORT_WAIT |
| `START` | [29] W1P | IDLE → LOAD trigger (ignored if SPI_EN=0 or MASTER_EN=0) |
| `SPI_EN` | [28] RW | Gate: FSM freezes in IDLE when 0 |
| `MASTER_EN` | [27] RW | Gate: if 0 the slave FSM runs instead |
| `AUTO_CS` | [25] RW | 1 = FSM drives CS; 0 = software/GPIO drives CS |
| `HOLD_CS` | [24] RW | 1 = don't deassert CS between words when CONT_XFER=1 |
| `LSB_FIRST` | [23] RW | 1 = shift LSB out first on MOSI |
| `CPOL` | [22] RW | Clock polarity (see mode table) |
| `CPHA` | [21] RW | Clock phase (see mode table) |
| `CONT_XFER` | [20] RW | 1 = reload and continue without deasserting CS |
| `WORD_LEN` | [19:15] RW | Bit counter maximum (legal 1–32; 0 → ILLEGAL_CFG) |
| `IO_MODE` | [14:13] RW | 00=single, 01=dual, 10=quad (affects SHIFT state) |
| `FRAME_GAP` | [12:8] RW | PCLK idle cycles between consecutive words in CONT mode |

### CLKDIV — 0x008

| Field | Bits | How the FSM uses it |
|---|---|---|
| `DIV` | [15:0] RW | SCK half-period = DIV+1 PCLK cycles; sampled once on LOAD |

### CS_CTRL — 0x00C

| Field | Bits | How the FSM uses it |
|---|---|---|
| `CS_SEL` | [3:0] RW | Index of CS output to toggle |
| `CS_POL` | [15:12] RW | Per-CS active polarity (0=active-low, 1=active-high) |
| `CS_PRE_DELAY` | [23:20] RW | PCLK cycles to wait in ASSERT_CS before first SCK edge |
| `CS_POST_DELAY` | [27:24] RW | PCLK cycles to wait in DEASSERT_CS before returning to IDLE |

### STATUS — 0x004 (written by FSM, read by software)

| Field | Set when | Cleared when |
|---|---|---|
| `BUSY` | LOAD entry | DEASSERT_CS exit (or ABORT_WAIT exit) |
| `TX_ACTIVE` | SHIFT entry | SHIFT exit |
| `RX_ACTIVE` | SHIFT entry | SHIFT exit |
| `DONE_STS` | COMPLETE entry | SOFT_RST |
| `ABORTED` | ABORT_WAIT exit | SOFT_RST |
| `TX_UNDERRUN` | SHIFT: TX FIFO empty when word needed | SOFT_RST or FIFO_CTRL.TX_FLUSH |
| `RX_OVERRUN` | COMPLETE: RX FIFO full | SOFT_RST or FIFO_CTRL.RX_FLUSH |
| `ILLEGAL_CFG` | CTRL written with WORD_LEN=0 or mode change while BUSY | SOFT_RST |
| `MODE_FAULT` | CS contention; CPOL/CPHA changed while BUSY | MODE_FAULT register W1C |

---

## 5. Internal Counters

| Counter | Width | Role |
|---|---|---|
| `clk_div_cnt` | 16-bit | Counts to DIV; toggles internal SCK each time it hits DIV |
| `bit_cnt` | 5-bit | Counts 0 to WORD_LEN−1; increments on the active SCK edge |
| `pre_delay_cnt` | 4-bit | Counts to CS_PRE_DELAY in ASSERT_CS state |
| `post_delay_cnt` | 4-bit | Counts to CS_POST_DELAY in DEASSERT_CS and ABORT_WAIT |
| `frame_gap_cnt` | 5-bit | Counts to FRAME_GAP idle cycles between words in CONT mode |

---

## 6. Shift Register Behaviour

```
TX shift register (load on LOAD state):
  shift_reg[WORD_LEN-1:0] ← TX_FIFO.pop()

On launch edge in SHIFT:
  mosi_out ← (LSB_FIRST ? shift_reg[0] : shift_reg[WORD_LEN-1])
  shift_reg ← (LSB_FIRST ? shift_reg >> 1 : shift_reg << 1)

On sample edge in SHIFT:
  rx_shift_reg ← (LSB_FIRST ? {miso_in, rx_shift[WORD_LEN-1:1]}
                             : {rx_shift[WORD_LEN-2:0], miso_in})

On COMPLETE:
  RX_FIFO.push(rx_shift_reg)
```

---

## 7. Error Conditions

### TX Underrun
- **Trigger:** FSM is in SHIFT (CONT_XFER mode) and TX FIFO is empty when it tries to LOAD the next word
- **Action:** Set `STATUS.TX_UNDERRUN`, fire `INT_STATUS.TX_UNDERRUN` if `INT_EN.TX_UNDERRUN=1`, continue with 0x00 dummy data OR abort (implementation-defined; spec recommends abort)

### RX Overrun
- **Trigger:** COMPLETE state tries to push to RX FIFO but it is full
- **Action:** Set `STATUS.RX_OVERRUN`, fire interrupt if enabled; word is dropped

### Mode Fault
- **Trigger (multi-master):** SS input pin seen low unexpectedly while master is in IDLE or SHIFT
- **Trigger (config):** CPOL or CPHA register written while BUSY=1
- **Trigger (config):** WORD_LEN written as 0
- **Action:** Set `STATUS.MODE_FAULT`, fire interrupt, return FSM to IDLE

### Abort
- **Trigger:** `CTRL.ABORT` W1P written while FSM is active
- **Action:** SCK stops immediately (held at CPOL level), CS deasserted after CS_POST_DELAY, then `STATUS.ABORTED` set and `INT_STATUS.ABORT_DONE` fires

---

## 8. Reset Behaviour

On `presetn_i` assertion (or `CTRL.SOFT_RST`):
- FSM → IDLE
- SCK → CPOL level
- CS_n → deasserted (all lines)
- MOSI → 0
- All counters → 0
- TX FIFO pointers reset (treated as empty)
- RX FIFO pointers reset (treated as empty)
- STATUS → all 0 except TX_EMPTY=1, RX_EMPTY=1
- All interrupt flags → 0
- VERSION and CAPABILITIES registers → unchanged (synthesis-time constants)

---

## 9. Typical Software Transfer Sequence

```
1. Write CLKDIV.DIV      = desired SCK divisor
2. Write CS_CTRL         = CS_SEL + CS_POL + PRE/POST delays
3. Write CTRL            = SPI_EN=1, MASTER_EN=1, CPOL, CPHA, WORD_LEN, AUTO_CS=1
4. Write TXDATA          = word0   (pushes into TX FIFO)
   Write TXDATA          = word1   (optional burst)
5. Write CTRL.START      = 1       (W1P, self-clears)
   → FSM: IDLE → LOAD → ASSERT_CS → SHIFT → COMPLETE → DEASSERT_CS → IDLE
6. Poll STATUS.BUSY == 0  (or wait for INT_STATUS.DONE interrupt)
7. Read RXDATA           = received word(s)
```

---

## 10. SVA Assertions (Reference)

```systemverilog
// BUSY must be high from LOAD until post-delay done
property busy_span;
  @(posedge clk) $rose(busy) |-> busy throughout
    (##[1:$] $fell(busy));
endproperty

// CS must be asserted before first SCK edge
property cs_before_sck;
  @(posedge clk) $rose(cs_active) |->
    !$changed(sck_out) [*CS_PRE_DELAY];
endproperty

// bit_cnt never exceeds WORD_LEN
property bit_cnt_bound;
  @(posedge clk) bit_cnt <= WORD_LEN;
endproperty

// MODE_FAULT if CPOL/CPHA changed while BUSY
property no_mode_change_while_busy;
  @(posedge clk) busy |-> $stable(cpol) && $stable(cpha);
endproperty
```

---

## 11. Debug Register Fields

From `DEBUG` register at `0x02C`:

| Field | Bits | What to watch for |
|---|---|---|
| `FSM_STATE` | [31:28] | Should advance 0→1→2→3→4→5→0 in a normal transfer |
| `BIT_CNT` | [27:23] | Counts 0 to WORD_LEN−1 during SHIFT; must not exceed |
| `SCK_OUT` | [22] | Must match CPOL when outside SHIFT |
| `CS_OUT` | [21] | Must be asserted during ASSERT_CS/SHIFT/COMPLETE |
| `MOSI_OUT` | [20] | Reflects current bit being shifted out |
| `MISO_SAMPLE` | [19] | Last sampled MISO input |
| `TX_SHIFT_LOAD` | [18] | Pulse expected once per frame on LOAD→ASSERT_CS |
| `RX_SHIFT_LOAD` | [17] | Pulse expected once per frame on COMPLETE |

---

## 12. Lesson Mapping (for curriculum use)

| Chapter | Key FSM concept to teach |
|---|---|
| spi1 | IDLE → SHIFT loop; single-byte Mode 0 |
| spi2 | Clock divider; all 4 CPOL/CPHA modes |
| spi3 | TX FIFO integration; multi-byte burst |
| spi4 | CS timing: PRE_DELAY, POST_DELAY; HOLD_CS; CONT_XFER |
| spi5 | Error handling: underrun, overrun, mode fault, abort |

---

*This spec is synthesised from the three source documents in the repo root.
All RTL built from it must be verified against the `Register_spec.txt` field
widths and the testbench patterns in `agent.md`.*
