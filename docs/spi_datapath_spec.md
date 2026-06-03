# SPI Master Controller — Datapath Specification
**Sources:** `Microarch_spi.pdf` · `Spi spec.pdf` · `Register_spec.txt`
**Scope:** Complete implementation reference — every datapath, every mux, every corner case.
**Not linked to the curriculum.** Use as engineering ground-truth when building RTL or testbenches.

---

## 0. How to Read This Document

Each datapath section follows this structure:
1. Signal flow diagram (ASCII)
2. Detailed logic description
3. Register fields that control this path
4. Corner cases and known bugs

Abbreviations used throughout:
- **PCLK** — APB/system clock
- **SCK** — serial clock output pin (also SCLK in some sources)
- **DIV** — value of `CLKDIV.DIV[15:0]`
- **WL** — `CTRL.WORD_LEN[19:15]` (1–32)
- **CPL** — `CTRL.CPOL[22]`
- **CPH** — `CTRL.CPHA[21]`

---

## 1. Complete Datapath Overview

```
                        APB BUS (PCLK domain)
                              │
              ┌───────────────┼───────────────────────┐
              │               │                       │
         TXDATA write    RXDATA read            CSR read/write
              │               │                       │
              ▼               ▲                       │
        ┌──────────┐    ┌──────────┐           ┌─────────────┐
        │  TX FIFO │    │  RX FIFO │           │  Reg Bank   │
        │ (W deep) │    │ (W deep) │           │ CTRL/STATUS │
        └────┬─────┘    └────▲─────┘           │ CLKDIV etc. │
             │               │                 └──────┬──────┘
             │ pop           │ push                   │
             ▼               │                        │
        ┌──────────┐         │                        │
        │ TX Shift │         │                 ┌──────▼──────┐
        │ Register │         │                 │ Master FSM  │
        └────┬─────┘         │                 └──────┬──────┘
             │               │                        │
          MOSI out        MISO in              ┌──────▼──────┐
             │               │                 │  Clock Div  │
             │         ┌─────┴─────┐           │  & Edge Gen │
             │         │ RX Shift  │           └──────┬──────┘
             │         │ Register  │                  │ SCK
             │         └───────────┘                  │
             │                                 ┌──────▼──────┐
             │                                 │  CS Control │◄─ CS_CTRL reg
             │                                 └──────┬──────┘
             │                                        │ CS_n[N:0]
             ▼                                        ▼
    ──────── SPI PINS: MOSI, MISO, SCK, CS_n ─────────────────
```

Full-duplex: on every active SCK edge, **one bit shifts out on MOSI** and **one bit is captured from MISO** simultaneously. The two paths are entirely independent in hardware — TX underrun cannot corrupt RX capture, and RX overflow cannot stall TX shifting.

---

## 2. TX Datapath

### 2.1 Signal Flow

```
CPU APB write to TXDATA (0x020)
        │
        ▼
  ┌─────────────────────────────────────────────────┐
  │  FIFO Write Port                                │
  │  if (!TX_FULL): mem[wr_ptr] ← pwdata_i[WL-1:0] │
  │                 wr_ptr ← wr_ptr + 1             │
  │  else:          TX_OVF_STICKY ← 1  (drop data)  │
  └──────────────────────┬──────────────────────────┘
                         │  (PCLK domain)
                         ▼
                  ┌─────────────┐
                  │  TX FIFO    │
                  │  depth = D  │
                  │  width = WL │
                  └──────┬──────┘
                         │  pop (PCLK domain, on LOAD state)
                         ▼
                  ┌─────────────┐
                  │  tx_shift   │  WL-bit parallel load
                  │  register   │
                  └──────┬──────┘
                         │  serial shift out, 1 bit per SCK edge
                         ▼
                     MOSI  pin
```

### 2.2 TXDATA Write Semantics

- TXDATA at offset `0x020` is **write-only**. Reads return 0 (implementation-defined).
- Writing while `TX_FULL=1`: data is **silently dropped**; `FIFO_STATUS.TX_OVF_STICKY` is set.
  - The spec allows a bus error response (`pslverr_o=1`) as an alternative — choose one policy at design time and document it.
- Words wider than WL bits: only the `WL-1:0` slice is stored; upper bits are discarded.
- Words narrower than the FIFO width: zero-extended to fill the FIFO entry.

### 2.3 TX FIFO Mechanics

```
Pointers (binary, (log2 D)+1 bits to detect full vs empty):

  wr_ptr[log2D:0]  — increments on every successful write
  rd_ptr[log2D:0]  — increments on every pop by FSM

  TX_EMPTY  = (wr_ptr == rd_ptr)
  TX_FULL   = (wr_ptr[log2D] != rd_ptr[log2D]) &&
              (wr_ptr[log2D-1:0] == rd_ptr[log2D-1:0])
  TX_LEVEL  = wr_ptr - rd_ptr  (unsigned, modulo arithmetic)
```

**Watermark flags:**
- `TX_ALMOST_EMPTY` (FIFO_STATUS[30]): asserted when `TX_LEVEL ≤ TX_WM`
- `TX_ALMOST_FULL`  (FIFO_STATUS[28]): asserted when `TX_LEVEL ≥ (D - TX_WM)`
- Both are **combinational** outputs of the FIFO; they change within the same PCLK cycle as the pointer update.

**Flush (FIFO_CTRL.TX_FLUSH, W1P):** resets both pointers to 0 atomically. If FSM is in SHIFT at the time, the pop-in-progress word has already been latched into `tx_shift`; the flush does not affect it. Sets `TX_EMPTY=1` immediately.

### 2.4 TX Shift Register Load

The FSM loads `tx_shift` from `TX_FIFO.rd_data` during the **LOAD** state (one PCLK cycle):

```
LOAD state, cycle 0:
  if (!TX_EMPTY):
    tx_shift[WL-1:0] ← TX_FIFO.rd_data[WL-1:0]
    rd_ptr ← rd_ptr + 1          -- advances the FIFO
    STATUS.TX_ACTIVE ← 1
  else:
    STATUS.TX_UNDERRUN ← 1       -- flag but continue (send 0x00 dummy)
    tx_shift ← '0                -- shift register loaded with zeros
    (optionally: abort transfer — implementation-defined)
```

**Corner case — WL=1:** Only bit [0] is loaded. `tx_shift` is a 1-bit register. MSB-first and LSB-first produce identical output.

**Corner case — WL=32:** Full 32-bit word. FIFO width must be parameterised to match. Verify TXDATA write is 32-bit wide.

### 2.5 MOSI Drive Logic

During the **SHIFT** state, MOSI is driven on the **launch edge** (see Section 5 for edge selection):

```systemverilog
// MSB-first (LSB_FIRST=0):
  mosi_next = tx_shift[WL-1];      // drive MSB
  tx_shift  = tx_shift << 1;       // shift left after driving

// LSB-first (LSB_FIRST=1):
  mosi_next = tx_shift[0];         // drive LSB
  tx_shift  = tx_shift >> 1;       // shift right after driving
```

The `mosi_next` value is **registered** and driven to the pin on the next PCLK clock — ensuring MOSI is stable before the sample edge.

**Idle value:** When FSM is NOT in SHIFT, MOSI is held at the last-shifted value (or 0 after reset). Some designs configure MOSI=CPOL when idle to avoid glitches; the spec does not mandate a specific idle value.

**Loopback path:** When `CTRL.LOOPBACK_EN=1`, the MOSI output is fed back to the MISO input internally. The external pin is still driven but the external MISO input is ignored. This creates a closed loop for self-test.

### 2.6 IO_MODE (Single / Dual / Quad)

`CTRL.IO_MODE[14:13]`:

| Value | Mode | MOSI lines | MISO lines | Required capability |
|---|---|---|---|---|
| `2'b00` | Single | 1 (MOSI) | 1 (MISO) | always available |
| `2'b01` | Dual | 2 (IO0, IO1) | 2 (IO0, IO1) | `CAPABILITIES.SUPPORT_DUAL=1` |
| `2'b10` | Quad | 4 (IO0–IO3) | 4 (IO0–IO3) | `CAPABILITIES.SUPPORT_QUAD=1` |
| `2'b11` | Reserved | — | — | → sets ILLEGAL_CFG |

In **dual** mode: 2 bits are shifted per SCK edge. `tx_shift` feeds IO0 and IO1 simultaneously. `WL` bits still define the word length; each edge consumes 2 bits → `WL/2` edges per word.

In **quad** mode: 4 bits per SCK edge. Each edge consumes 4 bits → `WL/4` edges per word.

The `bit_cnt` counter tracks **bit positions consumed**, not edge count, so it always counts to `WL` regardless of IO_MODE. The FSM increments it by 1, 2, or 4 depending on mode.

If `IO_MODE` is set to a value not supported by this instance, `STATUS.ILLEGAL_CFG` is set and the START is rejected.

---

## 3. RX Datapath

### 3.1 Signal Flow

```
MISO pin  (or loopback from MOSI)
        │
        ▼  (captured on sample edge — see Section 5)
  ┌─────────────────────────────────────────────────┐
  │  RX Shift Register (WL bits)                    │
  │  MSB-first: {rx_shift[WL-2:0], miso_in}        │
  │  LSB-first: {miso_in, rx_shift[WL-1:1]}        │
  └──────────────────────┬──────────────────────────┘
                         │  parallel capture on COMPLETE
                         ▼
                  ┌─────────────┐
                  │  RX FIFO    │
                  │  depth = D  │
                  │  width = WL │
                  └──────┬──────┘
                         │  pop (PCLK, on RXDATA read)
                         ▼
              CPU APB read from RXDATA (0x024)
```

### 3.2 MISO Sample Logic

MISO is sampled at the **sample edge** (determined by CPOL/CPHA — see Section 5). The sample is registered:

```systemverilog
// Single mode, MSB-first (LSB_FIRST=0):
  if (sample_edge):
    rx_shift ← {rx_shift[WL-2:0], miso_in}

// Single mode, LSB-first (LSB_FIRST=1):
  if (sample_edge):
    rx_shift ← {miso_in, rx_shift[WL-1:1]}
```

`miso_in` is the **registered** MISO pin value — it is not sampled combinationally. This one-cycle pipeline ensures metastability is absorbed.

**CPHA=0 special case:** The first bit from the slave is valid *before the first SCK edge* (it is driven when SS_n asserts). The controller must therefore sample MISO on the *first* edge — which occurs at half a SCK period after SS_n asserts. The shift register should not capture any bits until the first sample edge.

**CPHA=1 special case:** The slave launches its first bit *on the first edge* (not at SS_n assert). The controller samples on the *second* edge. There is therefore a half-period window where MISO is being driven by the slave but not yet sampled — this is intentional.

### 3.3 RX FIFO Push

On entry to the **COMPLETE** state:

```
COMPLETE state, cycle 0:
  if (!RX_FULL):
    RX_FIFO.wr_data ← rx_shift[WL-1:0]
    wr_ptr ← wr_ptr + 1
    STATUS.RX_ACTIVE ← 0
  else:
    FIFO_STATUS.RX_OVF_STICKY ← 1    -- data is lost
    STATUS.RX_OVERRUN ← 1
    (INT fires if INT_EN.RX_OVERRUN=1)
```

The push happens in the *same* PCLK cycle as the COMPLETE state entry. If the FSM immediately re-enters LOAD (CONT_XFER), the push and the next pop can happen on consecutive cycles — the FIFO must handle back-to-back write + read without hazard.

### 3.4 RXDATA Read Semantics

- RXDATA at offset `0x024` is **read-only**.
- Each APB read pops one entry from RX FIFO: `rd_ptr ← rd_ptr + 1`.
- If FIFO is empty (`RX_EMPTY=1`) and CPU reads anyway: returns `32'h0000_0000`; sets `FIFO_STATUS.RX_UDF_STICKY=1`.
- There is **no** blocking on empty read — the APB cycle completes with dummy data. Software must check `STATUS.RX_LEVEL` or `RX_EMPTY` before reading.

### 3.5 RX FIFO Mechanics

Same pointer arithmetic as TX FIFO:

```
  RX_EMPTY  = (wr_ptr == rd_ptr)
  RX_FULL   = (wr_ptr[log2D] != rd_ptr[log2D]) &&
              (wr_ptr[log2D-1:0] == rd_ptr[log2D-1:0])
  RX_LEVEL  = wr_ptr - rd_ptr
```

**RX Watermark:** `FIFO_CTRL.RX_WM[7:0]`
- `RX_ALMOST_FULL`  (FIFO_STATUS[24]): `RX_LEVEL ≥ (D - RX_WM)` — useful for DMA drain trigger
- `RX_ALMOST_EMPTY` (FIFO_STATUS[26]): `RX_LEVEL ≤ RX_WM`

---

## 4. Clock Divider and SCK Generation

### 4.1 Divider Counter

```
  div_cnt: 16-bit counter, runs in PCLK domain

  Each PCLK:
    if (div_cnt == DIV):
      div_cnt ← 0
      sck_int ← ~sck_int     -- toggle internal SCK
    else:
      div_cnt ← div_cnt + 1
```

SCK frequency: `f_SCK = f_PCLK / (2 × (DIV + 1))`

| DIV | f_SCK (100 MHz PCLK) |
|---|---|
| 0 | 50 MHz |
| 1 | 25 MHz |
| 4 | 10 MHz |
| 9 | 5 MHz |
| 49 | 1 MHz |
| 499 | 100 kHz |
| 4999 | 10 kHz |

**Minimum DIV=0:** PCLK must still be at least 4× SCK for CDC constraints (OpenTitan guideline). At DIV=0, PCLK=2×SCK — this is technically too fast for safe CDC. If DIV=0 must be supported, the entire shift logic must run on PCLK with no intermediate SCLK domain crossing.

**DIV update timing:** The divider register (`CLKDIV.DIV`) should be latched into a shadow register that only updates when `STATUS.BUSY=0`. Writing DIV mid-transfer would cause a fractional SCK period and corrupt the frame. Verify: write to CLKDIV while BUSY should be silently buffered until IDLE, **or** rejected with ILLEGAL_CFG.

### 4.2 Edge Detector Signals

The datapath uses two single-cycle pulse signals derived from `sck_int`:

```systemverilog
logic sck_int, sck_prev;
always_ff @(posedge pclk) sck_prev <= sck_int;

logic rising_edge  = ( sck_int && !sck_prev);
logic falling_edge = (!sck_int &&  sck_prev);
```

These pulses are used to clock the shift register and launch logic (see Section 5). They have exactly one PCLK cycle width and are generated one cycle after the SCK toggle.

### 4.3 SCK Output Control

The SCK pin is **gated**: it only toggles during the SHIFT state.

```systemverilog
// SCK output:
assign sck_out = (fsm_state == SHIFT) ? sck_int : CPOL;
```

Before the first SCK edge (ASSERT_CS state) and after the last edge (COMPLETE/DEASSERT_CS): `sck_out = CPOL` — enforcing the idle level.

**Critical:** The gating must not introduce a glitch. The transition from ASSERT_CS → SHIFT should be timed so `sck_int` is already at CPOL level before gating is enabled — this is guaranteed if the divider counter is reset to 0 (and `sck_int` initialised to CPOL) when the FSM enters ASSERT_CS.

### 4.4 Power-Saving Gate

When `CTRL.SPI_EN=0` or FSM is in IDLE, the divider counter can be clock-gated:

```systemverilog
logic div_clk_en = (fsm_state != IDLE) && SPI_EN;
// Feed div_clk_en as clock enable on div_cnt flip-flop
```

This stops the counter from toggling — saves dynamic power when SPI is inactive. Must be removed or bypassed in simulation to avoid X-propagation.

---

## 5. CPOL/CPHA Edge Selection Logic

This is the most misunderstood part of SPI. Every implementation bug related to data corruption traces back here.

### 5.1 Edge Assignments

| Mode | CPOL | CPHA | SCK idle | Launch edge | Sample edge |
|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 (LOW) | Falling (SCK 1→0) | Rising  (SCK 0→1) |
| 1 | 0 | 1 | 0 (LOW) | Rising  (SCK 0→1) | Falling (SCK 1→0) |
| 2 | 1 | 0 | 1 (HIGH) | Rising  (SCK 1→0 is falling, but for CPL=1 first edge is falling) → **Rising after CS** | Falling (first real edge) |
| 3 | 1 | 1 | 1 (HIGH) | Falling | Rising |

More precisely, using the signal names from Section 4.2:

```
launch_pulse = CPOL==0 && CPHA==0 ? falling_edge   // Mode 0
             : CPOL==0 && CPHA==1 ? rising_edge     // Mode 1
             : CPOL==1 && CPHA==0 ? falling_edge    // Mode 2
             :                      rising_edge;    // Mode 3

sample_pulse = CPOL==0 && CPHA==0 ? rising_edge     // Mode 0
             : CPOL==0 && CPHA==1 ? falling_edge    // Mode 1
             : CPOL==1 && CPHA==0 ? falling_edge    // Mode 2 — first edge is falling
             :                      rising_edge;    // Mode 3
```

Simplified: `launch_pulse = (CPHA ? ~sample_pulse_type : sample_pulse_type_complement)`.  
The rule is: **sample and launch are always on opposite edges.**

### 5.2 CPHA=0 First-Bit Pre-Seeding

For CPHA=0 (Modes 0 and 2), the first MOSI bit must be **valid at SS_n assert** — before the first SCK edge. The slave samples it on the very first SCK edge.

Implementation requirement: MOSI must be driven with `tx_shift[MSB]` (or `tx_shift[0]` for LSB-first) at the moment the FSM enters ASSERT_CS, not waiting for the first launch pulse.

```
// In ASSERT_CS state (before SHIFT begins):
if (CPHA == 0):
  mosi_out ← (LSB_FIRST ? tx_shift[0] : tx_shift[WL-1])
  // do NOT shift yet — only pre-seed; shift happens on first launch_pulse inside SHIFT
```

Failure to pre-seed MOSI for CPHA=0 is one of the most common SPI RTL bugs. The slave will sample a stale or undefined value on bit WL-1.

### 5.3 Bit Counter Increment Timing

The `bit_cnt` increments on **launch_pulse** (not sample_pulse):

```
SHIFT state, on launch_pulse:
  bit_cnt ← bit_cnt + 1   (or +2 for dual, +4 for quad)
  shift tx_shift
  update mosi_out

SHIFT state, on sample_pulse:
  capture miso_in → rx_shift
  (bit_cnt does NOT change on sample)
```

The FSM checks `bit_cnt == WL` on the cycle *after* the last launch_pulse. This means the last MOSI bit is launched, then on the same SCK half-cycle the sample edge captures the last MISO bit, then the FSM moves to COMPLETE. This preserves the last full-duplex bit exchange.

**Corner case — CPHA=1, last bit:** The last sample edge occurs *after* the last launch edge. The FSM must not deassert SCK until after this final sample. The COMPLETE state entry must be delayed by one half-SCK period when CPHA=1.

```
// Transition guard:
SHIFT → COMPLETE:
  CPHA==0: transition when bit_cnt == WL (after last launch_pulse)
  CPHA==1: transition one sample_pulse after bit_cnt == WL
```

### 5.4 Mode Change During Transfer

Writing CPOL or CPHA while `BUSY=1` is illegal. Hardware must:
1. Detect the write (APB write to CTRL while BUSY)
2. Set `MODE_FAULT.CPOL_CHANGE_ERR_STICKY` or `CPHA_CHANGE_ERR_STICKY`
3. Set `STATUS.ILLEGAL_CFG`
4. Fire MODE_FAULT interrupt if enabled
5. The ongoing transfer continues with the **old** CPOL/CPHA values (shadow register)

The new CPOL/CPHA value is **latched into the shadow register** at the start of the next LOAD state (when BUSY transitions from 0 to 1 on the next transfer).

---

## 6. CS Generation Datapath

### 6.1 CS Decode and Polarity

```
cs_n_raw[N-1:0] — one-hot active signal

In ASSERT_CS through DEASSERT_CS states:
  cs_n_raw[CS_SEL] = 1   (the selected CS is "active")
  cs_n_raw[others] = 0

CS output pin [i]:
  spi_csn_o[i] = cs_n_raw[i] ^ CS_POL[i]
    (XOR with polarity: CS_POL[i]=0 → active-low → pin goes LOW when active)
    (CS_POL[i]=1 → active-high → pin goes HIGH when active)
```

**CS_SEL validation:** If `CS_SEL ≥ NUM_CS` (from CAPABILITIES register), the START is rejected with ILLEGAL_CFG.

### 6.2 CS Pre-Delay (ASSERT_CS State)

```
ASSERT_CS state:
  cs_n_raw[CS_SEL] ← 1      -- CS asserted
  pre_delay_cnt ← 0
  sck_out = CPOL             -- SCK still at idle level

  Each PCLK:
    pre_delay_cnt ← pre_delay_cnt + 1

  Transition to SHIFT when:
    pre_delay_cnt == CS_PRE_DELAY   (or immediately if CS_PRE_DELAY==0)
```

`CS_PRE_DELAY=0`: CS asserts and SHIFT begins on the same cycle. MOSI must be pre-seeded (CPHA=0) or it will only be valid from the first launch_pulse (CPHA=1).

**Minimum CS-to-SCK setup time:** Many SPI slaves require CS low for ≥ 1 SCK period before the first clock edge. Use `CS_PRE_DELAY ≥ 2*(DIV+1)` PCLK cycles to guarantee one full SCK period of setup. Example: DIV=9 → `CS_PRE_DELAY ≥ 20`.

### 6.3 CS Post-Delay (DEASSERT_CS State)

```
DEASSERT_CS state:
  sck_out = CPOL             -- SCK at idle level
  cs_n_raw[CS_SEL] still asserted
  post_delay_cnt ← 0

  Each PCLK:
    post_delay_cnt ← post_delay_cnt + 1

  Deassert CS and transition to IDLE when:
    post_delay_cnt == CS_POST_DELAY
```

`CS_POST_DELAY=0`: CS deasserts in the same cycle as DEASSERT_CS entry. The last SCK edge → CS deassert hold time is zero. Most slaves require at least half an SCK period here.

### 6.4 HOLD_CS and CONT_XFER — Back-to-Back Words

When `CTRL.CONT_XFER=1` and `CTRL.HOLD_CS=1` and TX FIFO is not empty:

```
COMPLETE state:
  push rx_shift → RX FIFO
  if (CONT_XFER && HOLD_CS && !TX_EMPTY):
    → LOAD state (CS stays asserted, SCK stays at CPOL)
    frame_gap_cnt ← 0   (insert FRAME_GAP idle cycles if > 0)
  else:
    → DEASSERT_CS state
```

**FRAME_GAP:** Idle SCK cycles between words. SCK stays at CPOL level during gap:

```
LOAD state with FRAME_GAP > 0:
  Each PCLK during gap: frame_gap_cnt++
  Wait until frame_gap_cnt == FRAME_GAP × (2×(DIV+1))  before proceeding to ASSERT... 
  (actually FRAME_GAP counts SCK cycles, so each gap SCK = 2×(DIV+1) PCLK cycles)
```

`FRAME_GAP=0`: Words are back-to-back. The last bit of word N and the first bit of word N+1 are separated by exactly **one SCK half-period** (the COMPLETE→LOAD→SHIFT pipeline latency). This is the tightest possible back-to-back burst.

**Corner case — TX_EMPTY during CONT_XFER:** If FIFO drains between words (common in CPU-driven transfers):
1. FSM is in COMPLETE after word N
2. Checks TX_EMPTY → it is 1
3. FSM goes to DEASSERT_CS (CS releases even though CONT_XFER=1)
4. `STATUS.TX_UNDERRUN` is NOT set here — underrun is only flagged if TX empties *during* a SHIFT, not between words
5. When CPU refills TX FIFO later and writes CTRL.START again, a new transaction begins with a fresh CS assert

This is correct behaviour. Do not confuse inter-word TX starvation (goes to DEASSERT_CS) with mid-word TX underrun (sets TX_UNDERRUN).

### 6.5 AUTO_CS=0 (Manual CS)

When `CTRL.AUTO_CS=0`:
- The FSM still executes ASSERT_CS, SHIFT, DEASSERT_CS states in the same sequence
- BUT the CS output is **not driven by the FSM**
- Software (or a GPIO controller) is responsible for asserting the correct CS
- The FSM still waits for PRE_DELAY and POST_DELAY — these can be used as timing guardians
- Useful when CS requires extra buffering or when a GPIO expander is used

---

## 7. DMA Datapath

DMA is optional (`CAPABILITIES.SUPPORT_DMA=1` required).

### 7.1 TX DMA

```
TX DMA request fires when:
  DMA_CTRL.DMA_EN=1  AND
  DMA_CTRL.TX_DMA_EN=1  AND
  TX_LEVEL ≤ DMA_CTRL.TX_THRESHOLD

DMA_STATUS.TX_DMA_ACTIVE = 1 while the request is asserted

Burst: DMA engine writes DMA_CTRL.BURST_LEN+1 words to TXDATA in one burst
Request deasserts once TX_LEVEL > TX_THRESHOLD
```

The TX DMA request is a **level signal** (stays high while condition holds), not a pulse. The DMA controller is responsible for pulsing the acknowledge. TX watermark interrupt (`INT_EN.TX_WM`) can co-exist with DMA — useful to trigger a fallback CPU service if DMA stalls.

### 7.2 RX DMA

```
RX DMA request fires when:
  DMA_CTRL.DMA_EN=1  AND
  DMA_CTRL.RX_DMA_EN=1  AND
  RX_LEVEL ≥ DMA_CTRL.RX_THRESHOLD

DMA_STATUS.RX_DMA_ACTIVE = 1 while active

Burst: DMA engine reads BURST_LEN+1 words from RXDATA
Request deasserts once RX_LEVEL < RX_THRESHOLD
```

**DMA vs interrupt co-existence:** If DMA and interrupt are both enabled for the same FIFO threshold event, both will fire. Software must either disable the interrupt when DMA is running, or the ISR must check DMA_STATUS before servicing.

---

## 8. Error Detection Datapath

### 8.1 TX Underrun

**Trigger:** FSM is in LOAD state, about to start a word, and TX FIFO is empty.

```
Detection point: LOAD state entry
  if (TX_EMPTY):
    STATUS.TX_UNDERRUN ← 1    (sticky)
    FIFO_STATUS.TX_UDF_STICKY ← 1
    tx_shift ← 0              (shift zeros — dummy frame)
    INT_STATUS.TX_UNDERRUN ← 1 if INT_EN.TX_UNDERRUN=1
```

The transfer does **not** abort automatically on underrun (per this spec). It continues shifting zeros. Software can observe `TX_UNDERRUN` and abort manually via `CTRL.ABORT`. A stricter implementation may auto-abort; document the policy.

**Does NOT trigger on:**
- TX FIFO becoming empty *during* a transfer but between words (that is handled by the CONT_XFER logic)
- TX FIFO empty when CTRL.START is written — START is accepted only when TX_EMPTY=0

**Clear path:** Write 1 to `FIFO_CTRL.TX_FLUSH` (W1P) or `CTRL.SOFT_RST`.

### 8.2 RX Overrun

**Trigger:** COMPLETE state, FSM tries to push to RX FIFO, but `RX_FULL=1`.

```
Detection point: COMPLETE state entry
  if (RX_FULL):
    STATUS.RX_OVERRUN ← 1     (sticky)
    FIFO_STATUS.RX_OVF_STICKY ← 1
    rx_shift word is DROPPED  (not stored)
    INT_STATUS.RX_OVERRUN ← 1 if INT_EN.RX_OVERRUN=1
```

The transfer continues regardless. Every subsequent word will also be dropped if the CPU does not drain RX FIFO.

**Clear path:** Write 1 to `FIFO_CTRL.RX_FLUSH` or `CTRL.SOFT_RST`.

### 8.3 Mode Fault

Three hardware detections:

| Sub-cause | Detection point | Register flag |
|---|---|---|
| CS contention | SS_n input pin goes LOW while master is driving SCLK | `MODE_FAULT.CS_CONTENTION_STICKY` |
| CPOL change while busy | APB write to CTRL.CPOL while BUSY=1 | `MODE_FAULT.CPOL_CHANGE_ERR_STICKY` |
| CPHA change while busy | APB write to CTRL.CPHA while BUSY=1 | `MODE_FAULT.CPHA_CHANGE_ERR_STICKY` |

All three also set `STATUS.MODE_FAULT` (summary) and `MODE_FAULT.MODE_FAULT_STICKY`.

**SS contention detection:** Requires the SS_n output to be fed back as an input (or a dedicated SS_n_in pin). If the master drives CS low but sees a *different* CS line unexpectedly low (from another master), it flags contention. Implementation: monitor all CS output lines vs. the decoded select — if any unselected line is driven low externally, flag.

**Recovery:** The FSM does NOT automatically return to IDLE on mode fault. Software must:
1. Read `MODE_FAULT` register to identify sub-cause
2. Write 1 to clear sticky bits (W1C fields)
3. Write `CTRL.ABORT` (W1P) to abort any in-flight transfer
4. Re-initialise configuration before next START

### 8.4 ILLEGAL_CFG

Fires synchronously with the APB write that caused it:

| Illegal action | Flag |
|---|---|
| CTRL.WORD_LEN written as 0 | STATUS.ILLEGAL_CFG |
| CTRL.IO_MODE set to unsupported mode | STATUS.ILLEGAL_CFG |
| CS_CTRL.CS_SEL ≥ NUM_CS | STATUS.ILLEGAL_CFG |
| CTRL.MASTER_EN changed while BUSY | STATUS.ILLEGAL_CFG |

The ILLEGAL_CFG flag is sticky and persists until `CTRL.SOFT_RST`. The offending register write is **rejected** — the field retains its previous value.

---

## 9. Interrupt Datapath

### 9.1 Interrupt Generation

Each event has two bits: an enable bit in `INT_EN` and a sticky status bit in `INT_STATUS`.

```
IRQ output logic:
  spi_irq_o = INT_EN.GLOBAL_EN &
              |(INT_STATUS[11:0] & INT_EN[11:0])
```

The IRQ is a **level signal** — it stays asserted as long as any uncleared enabled interrupt is pending. It is not a pulse. The CPU must clear the sticky bit(s) to deassert the IRQ.

### 9.2 Interrupt Event → Register Mapping

| Event | Sets INT_STATUS bit | Clears with |
|---|---|---|
| TX FIFO at/below TX_WM | TX_WM (bit 0) | W1C |
| RX FIFO at/above RX_WM | RX_WM (bit 1) | W1C |
| TX FIFO empty | TX_EMPTY (bit 2) | W1C |
| RX FIFO full | RX_FULL (bit 3) | W1C |
| Transfer COMPLETE | DONE (bit 4) | W1C |
| Mode fault occurred | MODE_FAULT (bit 5) | W1C |
| TX underrun | TX_UNDERRUN (bit 6) | W1C |
| RX overrun | RX_OVERRUN (bit 7) | W1C |
| Illegal config | ILLEGAL_CFG (bit 8) | W1C |
| ABORT sequence complete | ABORT_DONE (bit 9) | W1C |
| TX DMA service needed | DMA_TX (bit 10) | W1C |
| RX DMA service needed | DMA_RX (bit 11) | W1C |

**TX_WM and RX_WM are re-asserted** every cycle the watermark condition holds. They are NOT edge-triggered: after the ISR clears the bit, if the FIFO is still above/below the watermark threshold, the bit re-sets on the next PCLK. This is intentional — it ensures the CPU must service the condition, not just acknowledge it. If this behaviour is undesirable, software should disable the watermark interrupt inside the ISR and re-enable after servicing.

**DONE interrupt:** Fires once per completed transfer (or burst). In CONT_XFER mode with multiple back-to-back words, DONE fires once when the final DEASSERT_CS completes — not after every word.

---

## 10. Clock Domain Crossings (CDC)

All internal logic runs on **PCLK**. The divider generates SCK as a toggling register, but the shift register is clocked by PCLK using the `rising_edge`/`falling_edge` pulse signals (see Section 4.2). There is therefore **no asynchronous SCK clock domain** in the master — all registers are synchronous to PCLK.

The only genuine CDC crossings are at the **physical pins**:

| Signal | Direction | CDC requirement |
|---|---|---|
| MISO | External → internal | Double-flop synchroniser on PCLK |
| SS_n feedback (for mode fault) | External → internal | Double-flop synchroniser |
| SCK output | Internal → external | No CDC needed (internal is PCLK-synchronous) |
| MOSI output | Internal → external | No CDC needed |
| CS_n output | Internal → external | No CDC needed |

**MISO synchroniser:**

```systemverilog
always_ff @(posedge pclk or negedge presetn_n) begin
  if (!presetn_n) {miso_sync1, miso_sync0} <= 2'b0;
  else            {miso_sync1, miso_sync0} <= {miso_sync0, spi_miso_i};
end
logic miso_in = miso_sync1;  // use this in the datapath
```

The 2-cycle latency means MISO is sampled 2 PCLK cycles after it appears at the pin. This is acceptable as long as PCLK is significantly faster than SCK (≥4× recommended). At DIV=0 (PCLK=2×SCK), the synchroniser introduces more than half an SCK period of delay — this will cause incorrect sampling and is a hard constraint violation.

---

## 11. Corner Cases and Traps

This section catalogues every non-obvious behaviour. These are verification targets.

### 11.1 WL=1 Single-Bit Transfer

- `tx_shift` is a 1-bit register.
- `bit_cnt` counts from 0 to 1 (one increment).
- MSB-first and LSB-first are identical for a 1-bit word.
- CPHA=0: MOSI must be pre-seeded before SHIFT entry.
- CPHA=1 last-bit delay rule still applies — wait one sample_pulse after the single launch_pulse.
- Test: send 0 then 1, verify MISO is captured correctly.

### 11.2 WL=32 Maximum Transfer

- FIFO width must be 32 bits throughout. Verify TXDATA APB write is 32-bit wide.
- `bit_cnt` needs 6 bits (counts 0–32).
- In QUAD mode with WL=32: 8 SCK edges (32÷4). `bit_cnt` steps by 4.
- Test: write a 32-bit word 0xDEADBEEF, verify it arrives at slave bit-perfect in all 4 modes and both LSB/MSB orderings.

### 11.3 DIV=0 Fastest Clock

- SCK = PCLK/2. Every other PCLK is a SCK edge.
- The `rising_edge`/`falling_edge` pulses are asserted on alternating cycles.
- MOSI and MISO pipelines have only 1 PCLK to propagate before the next edge.
- MISO synchroniser introduces 2 PCLK (= 1 SCK) latency — effectively shifts the sample point by 1 SCK cycle. This violates setup time for most real slaves. Only use DIV=0 in loopback mode or with a downstream register stage.
- Pre-delay and post-delay counters in PCLK cycles are very coarse at this speed.

### 11.4 CS_PRE_DELAY=0 and CS_POST_DELAY=0

- ASSERT_CS→SHIFT transition in the same cycle as CS asserts.
- MOSI must be pre-seeded (if CPHA=0) in the LOAD→ASSERT_CS transition, not ASSERT_CS.
- DEASSERT_CS→IDLE in the same cycle CS deasserts.
- Many real slaves violate t_CSS or t_CSH timing at these settings. Use only in loopback.

### 11.5 CONT_XFER: TX FIFO Empties Mid-Burst

Scenario: CONT_XFER=1, HOLD_CS=1, CPU preloads 2 words but a 4-word burst is attempted.

1. Words 1 and 2 transfer normally.
2. Word 3 LOAD: TX_EMPTY=1 → TX_UNDERRUN set; dummy zeros sent.
3. Word 4 LOAD: same.
4. After word 4 COMPLETE, TX_EMPTY still 1 → FSM goes to DEASSERT_CS.

Result: 4 words were clocked, 2 with real data and 2 with zeros. CS deasserts after the 4th. The slave received 4 valid SPI frames — the first 2 meaningful, the last 2 corrupted. This is a software bug, not a hardware fault, but the IP should flag TX_UNDERRUN so software can detect it.

### 11.6 ABORT During ASSERT_CS

- CS is already asserted.
- FSM jumps to ABORT_WAIT.
- CS_POST_DELAY counter runs.
- CS deasserts after post-delay.
- No bits were shifted; RX FIFO unchanged; TX FIFO pop (from LOAD) is NOT reversed — that word is lost.
- STATUS.ABORTED set; INT_STATUS.ABORT_DONE fires.

### 11.7 ABORT on the Last Bit

Scenario: CTRL.ABORT written during the last bit of SHIFT (bit_cnt = WL-1, one launch_pulse left).

- The ABORT signal has 1 PCLK latency to the FSM.
- If the FSM checks ABORT at the launch_pulse for the last bit, it may have already shifted the last bit before seeing ABORT.
- RTL must ensure ABORT is checked **before** the launch_pulse of each bit, not during.
- Race: if ABORT arrives in the same cycle as the last launch, the FSM may complete normally instead of aborting. This is acceptable — document it.

### 11.8 SOFT_RST During Transfer

- All flip-flops reset synchronously.
- The SCK pin goes to CPOL within one PCLK.
- CS deasserts within one PCLK (does NOT wait for post-delay).
- TX FIFO and RX FIFO pointers reset — any in-progress word is lost.
- STATUS.ABORTED is NOT set (SOFT_RST is not ABORT).
- All sticky error flags clear.

The slave may see a partial SCK burst followed by CS deasserting unexpectedly. This will corrupt the slave's state machine. Software must reinitialise the slave after a SOFT_RST.

### 11.9 Back-to-Back COMPLETE and LOAD

In CONT_XFER mode, the FSM transitions COMPLETE→LOAD in one PCLK cycle. In that same cycle:
- RX push to FIFO happens (COMPLETE)
- TX pop from FIFO begins (LOAD)

If RX FIFO is also full at this moment, the RX push is dropped (overrun). The TX pop still happens. These are independent.

If TX FIFO has exactly one remaining word, the LOAD pops it and TX_EMPTY transitions to 1 in the same cycle. The COMPLETE→LOAD path sees TX_EMPTY=0 (pop is in-progress), but the RX FIFO sees a valid push opportunity. Check: does the TX_EMPTY flag used by the COMPLETE transition reflect the state **before** the pop or after? It must be the state before the pop — which is TX_EMPTY=0 (there was one word). So the FSM correctly continues to LOAD. Then during LOAD it pops the word and TX_LEVEL drops to 0.

### 11.10 FRAME_GAP with CPHA=1 Last-Bit Delay

When both CPHA=1 (requiring an extra half-period after the last bit) and FRAME_GAP>0 (requiring idle SCK cycles between words) are active:

1. Last bit of word N: final launch_pulse fires.
2. One sample_pulse later: FSM enters COMPLETE.
3. COMPLETE→LOAD transition: FRAME_GAP counter starts.
4. FRAME_GAP counts down.
5. FSM enters SHIFT for word N+1.

The CPHA=1 delay and FRAME_GAP delays are **additive** — the total inter-word gap is: `(1/2 SCK period for CPHA=1 last bit) + (FRAME_GAP × 1 SCK period)`.

### 11.11 Loopback With Underrun

When LOOPBACK_EN=1 and TX_UNDERRUN fires (zeros are shifted):
- MOSI pin receives 0x00 (dummy).
- Loopback feeds this back to MISO_IN.
- RX shift register captures 0x00.
- RX FIFO receives 0x00.

This is the expected loopback behaviour under underrun — RXDATA will show 0x00 for the dummy word. Software should check TX_UNDERRUN before trusting RXDATA contents.

### 11.12 Simultaneous TXDATA Write and TX Pop

If the CPU writes TXDATA (APB write) in the same PCLK cycle as the FSM pops TX FIFO (LOAD state):

- The write is to `mem[wr_ptr]` which is a **different location** from `mem[rd_ptr]` (unless FIFO is empty and both pointers are equal).
- If FIFO is empty (wr_ptr == rd_ptr): the write arrives at the same address as the read. This is a dual-port RAM read-during-write hazard. Resolution: the FSM should treat this as TX_UNDERRUN (the entry wasn't committed before the read). The new data word will be available on the next LOAD.
- If FIFO has ≥1 entry: no hazard — write and read are to different entries.

---

## 12. Timing Diagram Reference

### 12.1 Mode 0 Single Byte (CPOL=0, CPHA=0, WL=8, LSB_FIRST=0)

```
time:       T0   T1   T2   T3   T4   T5   T6   T7   T8   T9   T10  T11  T12
            IDLE LOAD ASCS    SHIFT (8 SCK cycles, each 2 PCLK)           COMP DECS

SS_n:       ─────────┐                                              ┌────────────
                     └──────────────────────────────────────────────┘
SCK:        ─────────────────┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐────────────
            (idle=0)         └──┘  └──┘  └──┘  └──┘  └──┘  └──┘
MOSI:       ─────────── B7 ─┤B6 ├─B5─┤B4 ├─B3─┤B2─┤─B1─┤B0─┤──────────────────
                  (pre-seed)  ↑launch on falling edge
MISO:       ─────────────────┤M6 ├─M5─┤M4─┤──────────────────────────────────
                         ↑first sample on rising edge
BUSY:       ─────────┌────────────────────────────────────────────────┐─────────
                     └────────────────────────────────────────────────┘
bit_cnt:         0    0    0    1    2    3    4    5    6    7    8
```

Key points:
- MOSI pre-seeded at T2 (ASSERT_CS entry) with B7 before first SCK.
- SCK first rising edge at T3 → MISO B7 sampled.
- SCK first falling edge at T3 → MOSI shifts to B6.
- Repeat for 8 cycles. After T10 (8th falling): bit_cnt=8, COMPLETE.
- SCK stops at 0 (CPOL). CS deasserts after post-delay.

### 12.2 Mode 1 Single Byte (CPOL=0, CPHA=1, WL=8)

```
time:       T0   T1   T2   T3    T4   T5   T6   T7   T8   T9   T10  T11
            IDLE LOAD ASCS SHIFT                                   COMP DECS

SS_n:       ─────────┐                                        ┌────────────
                     └────────────────────────────────────────┘
SCK:        ─────────────────┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐────────
                              └──┘  └──┘  └──┘  └──┘  └──┘
MOSI:       ──────────────── ┤B7├──────── ... ──────────────────────────
                        (first rising edge launches B7 — no pre-seed)
MISO:       ─────────────────────┤M7 ├──────────────────────────────────
                              ↑MISO driven on falling edge (second edge = sample)
```

Key difference: MOSI B7 is NOT present before the first SCK edge. It is launched *on* the first rising edge and the slave samples it on the first falling edge.

### 12.3 Mode 0 CONT_XFER Back-to-Back

```
SS_n:   ┐                                                              ┌────
        └──────────────────────────────────────────────────────────────┘
SCK:    ─── [word 1: 8 edges] ─── [word 2: 8 edges] ─── [word 3...] ───
MOSI:   ─── [W1 B7..B0] ──── [W2 B7..B0] ──── [W3 B7..B0] ────────────
             ↑COMPLETE pushes W1   ↑COMPLETE pushes W2
             ↑LOAD starts W2       ↑LOAD starts W3
```

CS never deasserts. Between words: SCK stays at CPOL for FRAME_GAP cycles. At CONT_XFER boundary the MOSI pre-seeding for the next word's first bit must happen before the first SCK edge of that word.

---

## 13. RTL Implementation Notes

### 13.1 Recommended FSM Encoding

Use one-hot encoding for synthesis clarity:

```systemverilog
typedef enum logic [6:0] {
  IDLE        = 7'b000_0001,
  LOAD        = 7'b000_0010,
  ASSERT_CS   = 7'b000_0100,
  SHIFT       = 7'b000_1000,
  COMPLETE    = 7'b001_0000,
  DEASSERT_CS = 7'b010_0000,
  ABORT_WAIT  = 7'b100_0000
} spi_fsm_t;
```

Gray code is an alternative for power reduction (fewer transitions per cycle). Binary encoding is most compact but hardest to debug.

### 13.2 Shadow Registers

These registers must be double-buffered (shadow + live):

| Register field | When shadow latches to live |
|---|---|
| CLKDIV.DIV | On IDLE→LOAD (start of transfer) |
| CTRL.CPOL | On IDLE→LOAD |
| CTRL.CPHA | On IDLE→LOAD |
| CTRL.WORD_LEN | On IDLE→LOAD |
| CTRL.IO_MODE | On IDLE→LOAD |
| CS_CTRL.CS_PRE_DELAY | On IDLE→LOAD |
| CS_CTRL.CS_POST_DELAY | On IDLE→LOAD |
| CS_CTRL.CS_POL | On IDLE→LOAD |
| CS_CTRL.CS_SEL | On IDLE→LOAD |

Fields that can be updated live (no shadow needed): INT_EN bits, DMA_CTRL, watermark thresholds.

### 13.3 Reset Strategy

Use synchronous reset (`presetn_i` synchronised to PCLK before use):

```systemverilog
// Synchronise reset (2-stage)
always_ff @(posedge pclk) begin
  rst_sync_s1 <= presetn_i;
  rst_sync    <= rst_sync_s1;
end
```

All flip-flops use `rst_sync` as their reset. Asynchronous reset to synchronisers themselves is fine (and needed to avoid X-propagation at startup).

### 13.4 Synthesis Guidelines

- Shift register: use `<<` / `>>` operators — synthesiser maps these to efficient barrel shifters.
- FIFO: instantiate as synchronous-read single-clock FIFO (both ports on PCLK). Use RAM macro if depth > 16.
- Do not use clock gating on SCK as a logic gate — use registered enables (`sck_out` mux to CPOL in non-SHIFT states).
- Avoid combinational paths from MISO input to any register without synchroniser.

---

## 14. Design Verification Targets (Corner Case Checklist)

```
[ ] WL=1, all 4 modes, both LSB/MSB orderings
[ ] WL=32, all 4 modes
[ ] DIV=0 (loopback only — flagged in spec as CDC-unsafe for real slaves)
[ ] CS_PRE_DELAY=0, CS_POST_DELAY=0
[ ] CS_PRE_DELAY=max (15), CS_POST_DELAY=max (15)
[ ] CONT_XFER burst: TX drains exactly at word boundary (no underrun)
[ ] CONT_XFER burst: TX drains mid-burst (underrun fires)
[ ] CONT_XFER burst: RX fills during burst (overrun fires, transfer continues)
[ ] FRAME_GAP=0 back-to-back, verify MOSI bit N-1[0] to word N[WL-1] timing
[ ] FRAME_GAP=max with CONT_XFER
[ ] ABORT during ASSERT_CS (before any SCK edge)
[ ] ABORT on the very last bit (bit_cnt=WL-1)
[ ] SOFT_RST during SHIFT: CS must deassert without post-delay
[ ] TXDATA write while TX_FULL: verify drop + OVF_STICKY, no bus error (or verify bus error if that policy chosen)
[ ] RXDATA read while RX_EMPTY: verify 0x00 returned + UDF_STICKY
[ ] MODE_FAULT: CPOL changed while BUSY (verify old value used, new value deferred)
[ ] MODE_FAULT: CPHA changed while BUSY
[ ] MODE_FAULT: CS_SEL out of range → ILLEGAL_CFG on START
[ ] WORD_LEN=0 write → ILLEGAL_CFG, value rejected, previous value retained
[ ] MASTER_EN change while BUSY → ILLEGAL_CFG
[ ] LOOPBACK_EN=1: verify rx_shift == tx_shift after transfer
[ ] LOOPBACK_EN=1 with TX_UNDERRUN: rx_shift captures zeros
[ ] Back-to-back TXDATA write and TX pop race (FIFO empty case)
[ ] IRQ deasserts after W1C clear; re-asserts if condition persists (watermark case)
[ ] DONE interrupt fires once per CS assertion, not per word in CONT mode
[ ] DMA TX request level behaviour: stays asserted until TX_LEVEL > threshold
[ ] DIV written mid-transfer: new value must NOT take effect until next transfer
[ ] CS_POL=1 (active high): verify pin goes HIGH on CS assert, LOW on deassert
[ ] Multi-CS: only CS_SEL line toggles; others remain at inactive polarity
[ ] CPHA=1 last-bit: COMPLETE delayed one sample_pulse; verify bit count is exactly WL
[ ] Dual IO mode (if supported): 2 bits per edge, verify WL/2 edges per frame
[ ] Quad IO mode (if supported): 4 bits per edge, verify WL/4 edges per frame
[ ] GLOBAL_EN=0: IRQ pin stays low regardless of INT_STATUS bits
```

---

*This document is derived from `Microarch_spi.pdf`, `Spi spec.pdf`, and `Register_spec.txt`.*
*It is a standalone engineering reference and is intentionally decoupled from the curriculum content in `docs/spi_master_fsm_spec.md`.*
