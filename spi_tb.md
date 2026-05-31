# SPI Testbench Reference — Complete Verification Plan

**Series:** SPI Protocol Deep Dive (spi1 – spi5)  
**Simulator:** Verilator 5.020 in `--no-timing` mode  
**Methodology:** Directed testing with functional coverage checklists  
**Total modules:** 14 across 5 chapters

---

## How to use this document

This is the authoritative planning and audit reference for the SPI series testbenches.
It covers what each module must do, how to structure the testbench to verify it, and every
individual test case with its stimulus and acceptance criteria — in plain language, with no
simulation code.

Use it to:
- Understand a module's intent before writing the first line of stimulus
- Design the right set of test cases without missing corner cases
- Audit a finished testbench for gaps against the coverage checklist
- Debug failures by cross-referencing corner case patterns

---

## Part 1 — DUT Inventory

| ID | Module | Chapter | Tier | Role |
|---|---|---|---|---|
| 1 | `sipo_shift_reg` | spi1 L1 | T1 | Receives serial bits; outputs parallel byte |
| 2 | `piso_shift_reg` | spi1 L2 | T2 | Loads parallel byte; transmits serial bits |
| 3 | `spi_byte_counter` | spi1 L3 | T3 | Counts SCLK edges within a CS_N frame |
| 4 | `spi_clkdiv` | spi2 L1 | T2 | Generates divided SCLK with edge strobes |
| 5 | `spi_master` | spi2 L2 | T3 | 8-bit Mode 0 SPI master controller |
| 6 | `spi_master_16` | spi2 L3 | T3 | 16-bit burst SPI master controller |
| 7 | `spi_master_param` | spi2 L4 | T5 | Parameterized master, all four SPI modes |
| 8 | `spi_slave_rx` | spi3 L1 | T3 | Receive-only SPI slave, 8-bit |
| 9 | `spi_slave_fd` | spi3 L2 | T4 | Full-duplex SPI slave, simultaneous RX and TX |
| 10 | `spi_loopback` | spi3 L3 | T5 | Integrated master + slave on same bus |
| 11 | `spi_regfile` | spi4 L1 | T4 | SPI slave with 8-register file (read/write protocol) |
| 12 | `spi_adc_slave` | spi5 L1 | T4 | ADC emulator — shifts out pre-loaded conversion result |
| 13 | `spi_flash_slave` | spi5 L2 | T5 | Flash memory emulator — CMD/ADDR/DATA protocol |
| 14 | `spi_bus_ctrl` | spi5 L3 | T5 | Multi-peripheral bus controller with CS_N routing |

---

## Part 2 — Verification Methodology

### 2.1 Testing strategy

All modules use **directed testing**: the stimulus is manually crafted to hit every defined
behaviour. This approach suits the educational context and Verilator's `--no-timing` mode.

Every testbench follows the same progression of test groups:

| Order | Group | Purpose |
|---|---|---|
| 1 | Reset sequence | Prove reset initialises all state to known values |
| 2 | Normal (golden path) | Prove the primary function with a clean, simple input |
| 3 | Boundary values | Edge conditions at minimum and maximum input values |
| 4 | Corner cases | Unusual but valid sequences that commonly expose bugs |
| 5 | Back-to-back | Multiple transactions without reset in between |
| 6 | Abort/interrupt | CS_N deasserted early, or start pulsed while busy |

### 2.2 Simulator constraints

These rules are mandatory in Verilator 5.020 `--no-timing` mode.  
Breaking any of them causes silent failures or compile errors.

| Rule | Required | Must avoid |
|---|---|---|
| Signal type | `logic` everywhere | `reg`, `wire` |
| Sequential block | `always_ff @(posedge clk)` | `always @(posedge clk)` |
| Combinational block | `always_comb` or `assign` | `always @(*)` |
| Top-level module name | exactly `tb` | any other name |
| First line of testbench | `` `timescale 1ns/1ps `` | missing timescale |
| 4-state comparison | `===` (strict equality) | `==` (passes X through silently) |
| Post-clock sampling | wait for `posedge clk`, then add `#1` | bare `#N` delays only |
| Repetition in testbench | `repeat(N) @(posedge clk)` | `for` loop with `return` |
| Increment | `x = x + 1` | `x++` (C-style, rejected) |
| Tri-state on MISO | drive `1'b0` when idle | `1'bz` (high-impedance) |

### 2.3 Clock conventions

Two standard clock setups are used across the series:

**Slave testbenches** (need margin between SCLK edges relative to fast system clock):
- System clock period: 4 ns (toggles every 2 ns)
- SCLK is driven manually; 4 system clock cycles between each SCLK edge gives comfortable setup/hold margin

**Master testbenches** (SCLK is generated internally by the DUT):
- System clock period: 10 ns (toggles every 5 ns)
- All timing derived from start pulse and phase counter

### 2.4 Reset procedure

Every testbench applies reset in the same way:
1. Assert `rst = 1` before any other stimulus
2. Hold for at least 2 rising clock edges
3. Add a `#1` skew after the last edge so stimulus lands after the clock edge
4. Deassert `rst = 0`
5. Allow 2 idle clock cycles before driving any functional stimulus

Two clock cycles is the minimum needed to initialise all flip-flops including `sclk_prev`
and `cs_n_prev` edge-detection registers.

### 2.5 SPI frame timing

The testbench drives SPI frames with this pattern:

**Before the frame:** deassert SCLK low, assert CS_N low, wait 2 system clocks  
**Each bit:** set MOSI to the next bit value, wait, drive SCLK high, wait, sample MISO  
**End of frame:** drive SCLK low, wait 2 system clocks, deassert CS_N high, wait 4 system clocks  

Between-frame gap of 4 system clocks allows CS_N deassert to propagate through the DUT's
`cs_n_prev` edge-detection register before the next frame begins.

### 2.6 MISO capture timing

MISO must be sampled **while SCLK is high** (Mode 0 — slave changes MISO on SCLK falling edge,
master samples on SCLK rising edge). In the testbench, MISO is read immediately after SCLK rises
and the post-edge `#1` delay passes.

### 2.7 PASS/FAIL output convention

Every assertion uses one of two display formats exactly:

```
PASS  <label> <optional values>
FAIL  <label> <got value> expected <expected value>
```

The `expected[]` field in each lesson object contains substrings matched against simulation
output to determine auto-completion. These substrings must match exactly what the testbench
prints on a correct run.

---

## Part 3 — Functional Coverage Model

A testbench is not complete until every item in the module's coverage list is exercised.
Tick each item off when you have a test case that directly verifies it.

---

### 3.1 sipo_shift_reg

- [ ] `rst` asserts → all 8 bits of `data_out` cleared to 0
- [ ] Single `1` bit shifted in to an all-zero register → correct position in `data_out`
- [ ] Complete byte 0xA5 (alternating) received correctly
- [ ] Complete byte 0xFF (all ones) received correctly
- [ ] Complete byte 0x00 (all zeros) does not change output
- [ ] Back-to-back bytes without reset between them — second overwrites first
- [ ] Reset mid-shift — partial state erased, subsequent full byte correct
- [ ] Bit order verified: first bit received occupies MSB, last occupies LSB

### 3.2 piso_shift_reg

- [ ] `load` asserts → `shift_reg` captures `data_in` on next rising clock edge
- [ ] 8 shift clocks after load → `serial_out` sequence equals `data_in` bits MSB-first
- [ ] `rst` asserts → `shift_reg` cleared, `serial_out` = 0
- [ ] Load asserted for exactly 1 clock, then deasserted before shifting begins
- [ ] Re-load during an active shift — new `data_in` replaces partial shift
- [ ] `serial_out` is 0 when no active shift (after reset or after shift completes)

### 3.3 spi_byte_counter

- [ ] `cs_n = 1` → SCLK edges are ignored, `bit_idx` stays 0
- [ ] 7 SCLK rising edges with `cs_n = 0` → `bit_idx` reaches 7
- [ ] 8th SCLK rising edge → `byte_done` asserts for exactly 1 system clock
- [ ] `byte_done` clears to 0 on the next system clock after it fires
- [ ] `bit_idx` resets to 0 when `byte_done` fires
- [ ] `cs_n` deasserts mid-frame → `bit_idx` resets to 0 within 2 system clocks
- [ ] Two consecutive complete frames → `byte_done` fires exactly once per frame
- [ ] SCLK pulse while `cs_n = 1` does not increment `bit_idx`

### 3.4 spi_clkdiv

- [ ] `sclk` is low immediately after reset releases
- [ ] Exactly 8 rising edges on `sclk` per 64 system clocks
- [ ] Exactly 8 falling edges on `sclk` per 64 system clocks
- [ ] `sclk_rise` and `sclk_fall` are never both 1 in the same system clock cycle
- [ ] `sclk_rise` pulse is exactly 1 system clock wide (no multi-cycle pulse)
- [ ] `sclk_fall` pulse is exactly 1 system clock wide
- [ ] Duty cycle is 50% (equal number of high and low system clocks per `sclk` period)

### 3.5 spi_master

- [ ] `start` asserted → `busy` asserts within 1 clock, `cs_n` falls within 1 clock
- [ ] `tx_data` bits appear on `MOSI` MSB-first during transfer
- [ ] `miso` bits are assembled into `rx_data` correctly (MSB-first)
- [ ] `done` pulses for exactly 1 clock at end of transfer
- [ ] `busy` deasserts at the same clock `done` fires
- [ ] `cs_n` deasserts after the 8th bit completes (not before)
- [ ] Back-to-back transfers produce independent MOSI and rx_data for each
- [ ] `start` asserted while `busy` is high → ignored, current transfer unaffected
- [ ] `rx_data` = 0xFF when MISO is held high throughout
- [ ] `rx_data` = 0x00 when MISO is held low throughout

### 3.6 spi_master_16

- [ ] `cs_n` stays low for all 16 SCLK cycles (never pulses high between byte 1 and byte 2)
- [ ] High byte `tx_word[15:8]` transmitted first on MOSI
- [ ] Low byte `tx_word[7:0]` transmitted second on MOSI
- [ ] 16 MISO bits assembled into `rx_word` correctly, MSB-first
- [ ] `done` fires after bit 15, not bit 7
- [ ] `bit_cnt` reaches 15 before done fires (verify by timing)
- [ ] Back-to-back 16-bit transfers both produce correct MOSI patterns

### 3.7 spi_master_param

- [ ] Mode 0 (CPOL=0 CPHA=0): SCLK idles low; MOSI valid before first rising edge; sample on rise
- [ ] Mode 1 (CPOL=0 CPHA=1): SCLK idles low; MOSI changes on first rising edge; sample on fall
- [ ] Mode 2 (CPOL=1 CPHA=0): SCLK idles high; MOSI valid before first falling edge; sample on fall
- [ ] Mode 3 (CPOL=1 CPHA=1): SCLK idles high; MOSI changes on first falling edge; sample on rise
- [ ] MISO loopback roundtrip correct for each of the 4 modes independently
- [ ] Parameter `N_BITS=8` produces 8 SCLK cycles per transfer
- [ ] Parameter `N_BITS=16` produces 16 SCLK cycles per transfer
- [ ] `done` fires at correct cycle count for both N_BITS values

### 3.8 spi_slave_rx

- [ ] `cs_n = 1` → SCLK edges ignored, `rx_valid` never fires
- [ ] 8 SCLK rising edges with `cs_n = 0` → `rx_valid` pulses, `rx_data` correct
- [ ] `rx_valid` is exactly 1 system clock wide
- [ ] `rx_data` holds its value after `rx_valid` deasserts (until next valid frame)
- [ ] `cs_n` deasserts mid-frame → counter resets; new complete frame produces correct data
- [ ] Back-to-back frames (CS_N toggles between) — each frame produces independent `rx_data`
- [ ] First byte received immediately after reset is correct

### 3.9 spi_slave_fd

- [ ] `tx_data` is captured (pre-loaded into shift register) on the falling edge of `cs_n`
- [ ] `miso` shifts out `tx_data` MSB-first, bit available before first SCLK rise
- [ ] `miso = 0` when `cs_n = 1` (not `z`, not floating)
- [ ] RX (MOSI → `rx_data`) and TX (`tx_data` → MISO) happen simultaneously on the same SCLK
- [ ] `rx_valid` fires on the 8th SCLK rising edge
- [ ] `tx_data` changed after `cs_n` falls does not affect current transfer MISO output
- [ ] Second transfer with different `tx_data` correctly shifts out the new value

### 3.10 spi_loopback

- [ ] Master's `tx_data` arrives as slave's `rx_data` after transfer
- [ ] Slave's `tx_data` arrives as master's `rx_data` after transfer
- [ ] Both directions correct simultaneously (single transfer verifies both)
- [ ] `busy` deasserts after transfer completes
- [ ] `done` fires at correct time relative to last SCLK edge
- [ ] Two back-to-back transfers with different data both pass

### 3.11 spi_regfile

- [ ] Write to register 0 through register 7 — each produces `wr_valid` pulse
- [ ] `wr_addr` and `wr_data` correct when `wr_valid` fires
- [ ] Read from each register returns the value previously written
- [ ] Read before any write returns 0x00 (reset state)
- [ ] Read transaction does not assert `wr_valid`
- [ ] Overwrite a register — subsequent read returns the new value, not the old
- [ ] Two writes to different addresses — both can be read back independently

### 3.12 spi_adc_slave

- [ ] `adc_val` present at `cs_n` falling edge is the value shifted out on MISO
- [ ] `adc_val` change during an active transfer does not corrupt current MISO output
- [ ] MISO shifts out `adc_val` MSB-first
- [ ] `miso = 0` when `cs_n = 1`
- [ ] Back-to-back reads with different `adc_val` — each transfer returns the correct snapshot

### 3.13 spi_flash_slave

- [ ] WRITE command (0x02) stores data byte at the addressed location
- [ ] READ command (0x03) returns the byte previously stored at that address
- [ ] READ_STATUS command (0x05) returns 0x00 (device ready, no write-in-progress)
- [ ] `wr_valid` fires after a WRITE transaction, not after READ or READ_STATUS
- [ ] Write to address 0 and address 15 (boundary addresses) — both readable
- [ ] Overwrite an address — READ returns the new value, not the original
- [ ] READ does not alter the stored value (non-destructive read)
- [ ] Command byte decoded correctly: 0x02 vs 0x03 differ only in bit 0

### 3.14 spi_bus_ctrl

- [ ] `dev_sel = 0` asserts `cs0_n` only; `cs1_n` and `cs2_n` remain high
- [ ] `dev_sel = 1` asserts `cs1_n` only; `cs0_n` and `cs2_n` remain high
- [ ] `dev_sel = 2` asserts `cs2_n` only; `cs0_n` and `cs1_n` remain high
- [ ] MISO from the selected slave is routed to the master's `miso_in` port
- [ ] MISO from non-selected slaves is ignored (does not corrupt `miso_in`)
- [ ] `dev_sel` change between transfers — takes effect at the next `start` pulse
- [ ] `dev_sel` change during an active transfer — does not cause CS_N glitch on any port

---

## Part 4 — Testbench Architecture

### 4.1 Standard testbench structure

Every testbench in the series follows this layered organisation:

**Layer 1 — Clock generator**  
A free-running clock declared as an initialised `logic` driven by an `always` block with
a fixed half-period delay. No other timing uses bare `#N` delays except for the post-edge
`#1` skew.

**Layer 2 — DUT signal declarations and instantiation**  
All signals are `logic`. Ports connected by name, not by position. Signal names match the
DUT port names exactly to avoid confusion.

**Layer 3 — Bus model (for master DUTs)**  
A software model of the responding slave, or a MOSI capture register, running as a separate
`always_ff` block. It detects SCLK edges and CS_N fall by comparing against previous-cycle
values. This runs independently of the testbench stimulus, so timing of reads is decoupled.

**Layer 4 — Reusable task library**  
Tasks declared as `automatic` (each call has its own stack frame). The task set for SPI
testbenches is described in Section 4.3.

**Layer 5 — Test sequence**  
A single `initial` block with labelled test groups. Each group begins with a `$display`
header, runs stimulus, then checks results. The final line is the success message followed
by `$finish`.

### 4.2 Slave model design (for master DUT testbenches)

When the DUT is a master, the testbench needs a responding slave model. The model:

- Detects `cs_n` falling edge using a delayed compare (`~cs_n & cs_n_prev`)
- On `cs_n` fall: pre-loads a programmable 8-bit response into its own shift register
- On each SCLK falling edge (after master has sampled): shifts the response left by 1 bit
- Drives `miso = shift_reg[7]` while `cs_n = 0`, drives `miso = 0` while `cs_n = 1`
- Optionally captures MOSI bits on each SCLK rising edge into a separate capture register

The slave model's response value should be configurable per test case so the testbench
can verify different `rx_data` values without changing the DUT.

### 4.3 Task library

These tasks form the building blocks that all SPI testbenches compose. Each task is
described by its inputs, outputs, and what it does in terms of bus activity.

---

**Task: `send8`**  
Input: 8-bit data value  
Output: none (drives bus signals directly)  
Action: drives each bit of the input onto MOSI MSB-first, producing 8 SCLK rise/fall
transitions. Each bit phase consists of: set MOSI → drive SCLK low → wait → drive SCLK
high → wait. Total bus activity: 8 complete SCLK cycles, each 8 system clocks wide.

---

**Task: `recv8`**  
Input: none  
Output: 8-bit value assembled from 8 MISO samples  
Action: drives 8 SCLK rise/fall transitions with MOSI = 0 (don't-care bits). Samples
MISO once per SCLK high phase, assembling bits MSB-first. Returns the assembled byte.

---

**Task: `spi_write_frame`**  
Input: 8-bit data value  
Output: none  
Action: asserts CS_N low, waits 2 system clocks, calls `send8`, drives SCLK low, waits
2 system clocks, deasserts CS_N high, waits 4 system clocks. Wraps one complete write-only
SPI frame.

---

**Task: `spi_read_frame`**  
Input: none  
Output: 8-bit value  
Action: asserts CS_N low, waits 2 clocks, calls `recv8`, drives SCLK low, waits 2 clocks,
deasserts CS_N, waits 4 clocks. Returns the received byte.

---

**Task: `spi_xfer`**  
Input: 8-bit transmit value  
Output: 8-bit received value  
Action: full-duplex variant of the above. Drives each MOSI bit while simultaneously
sampling each MISO bit on the same SCLK cycle. Wraps CS_N. Returns the received byte.

---

**Task: `spi_write_reg` (regfile only)**  
Input: 3-bit address, 8-bit data  
Output: none  
Action: asserts CS_N, calls `send8` with the command byte `{1'b0, 2'b00, addr}` (write
command, rw-bit = 0), calls `send8` with the data byte, then deasserts CS_N.

---

**Task: `spi_read_reg` (regfile only)**  
Input: 3-bit address  
Output: 8-bit value  
Action: asserts CS_N, calls `send8` with command byte `{1'b1, 2'b00, addr}` (read
command, rw-bit = 1), calls `recv8` to collect the response, then deasserts CS_N.

---

**Task: `spi_flash_xfer` (flash only)**  
Input: command byte, address byte, data byte (for writes); command byte, address byte (for reads)  
Output: received data byte (for reads)  
Action: asserts CS_N, sends command byte, sends address byte, sends or receives data byte,
deasserts CS_N.

---

**Task: `wait_done` (master DUT testbenches)**  
Input: none  
Output: none  
Action: waits a safe number of system clocks for `done` to assert. For 8-bit transfers
use 120 system clocks (8 bits × 4 phases × 4 system clocks/phase = 128 max, 120 is tight
but safe). For 16-bit use 250. For flash (3-byte transfers) use 400.

---

**Task: `check8`**  
Input: actual value (8-bit), expected value (8-bit), label string  
Output: none  
Action: compares with `===`. Prints `PASS  <label> got=0xXX` or `FAIL  <label>
got=0xXX expected=0xXX`. All display lines must start with exactly `PASS` or `FAIL`.

---

### 4.4 Assertion patterns

When checking pulse widths (e.g., `byte_done` or `rx_valid` is exactly 1 clock wide):
- Drive a counter that increments every clock `done` is high
- After the transfer completes, verify the counter equals 1

When checking that a signal never asserts during a sequence:
- Drive a sticky flag: `if (signal) flag = 1`
- After the sequence, verify flag is still 0

When checking timing order (e.g., `busy` asserts before `cs_n` falls):
- Sample both signals on consecutive clocks and record their first-assertion cycle number
- Compare cycle numbers

---

## Part 5 — Test Cases

---

### Module 1: sipo_shift_reg

**Ports:** `clk`, `rst`, `serial_in` → `data_out[7:0]`

**Purpose:** Shift register that receives 1 bit per clock on `serial_in` and assembles
a parallel byte MSB-first in `data_out`. No SCLK or CS_N — the system clock is the
shift clock. Used as the building block for all slave RX logic.

---

**TC-SIPO-01 — Reset clears output**  
Category: Reset  
Precondition: none  
Stimulus: assert `rst = 1`, apply 2 rising clock edges, deassert `rst = 0`  
Verify: `data_out === 8'h00` immediately after reset deasserts  
Rationale: confirms initial state is known before any serial input

---

**TC-SIPO-02 — Receive 0xA5 (checkerboard pattern)**  
Category: Normal  
Precondition: reset complete  
Stimulus: drive `serial_in` with bits `1, 0, 1, 0, 0, 1, 0, 1` (MSB first), one bit per rising clock edge  
Verify: after the 8th clock edge, `data_out === 8'hA5`  
Rationale: alternating bit pattern exposes both directions of shift errors

---

**TC-SIPO-03 — Receive 0xFF (all ones)**  
Category: Boundary  
Precondition: TC-SIPO-02 complete (no reset between)  
Stimulus: drive `serial_in = 1` for 8 consecutive clock edges  
Verify: `data_out === 8'hFF`  
Rationale: confirms no masking of bits to 0

---

**TC-SIPO-04 — Receive 0x00 (all zeros)**  
Category: Boundary  
Precondition: TC-SIPO-03 complete  
Stimulus: drive `serial_in = 0` for 8 consecutive clock edges  
Verify: `data_out === 8'h00`  
Rationale: confirms no masking of bits to 1

---

**TC-SIPO-05 — Back-to-back bytes without reset**  
Category: Back-to-back  
Precondition: reset complete  
Stimulus: send 8 bits for 0xA5, then immediately (same clock) send 8 bits for 0x3C  
Verify: `data_out === 8'hA5` after first 8 clocks; `data_out === 8'h3C` after second 8  
Rationale: confirms shift register overwrites cleanly without ghost bits

---

**TC-SIPO-06 — Reset mid-shift**  
Category: Corner  
Precondition: reset complete  
Stimulus: drive 4 bits of 0xA5 (bits 7..4: `1, 0, 1, 0`), then assert `rst = 1` for 1 clock, deassert; then drive complete 8 bits of 0x37  
Verify: `data_out === 8'h37` (reset wiped the partial state)  
Rationale: confirms abort recovery — a common requirement in real protocol stacks

---

**TC-SIPO-07 — Bit-by-bit shift trace**  
Category: Detailed trace  
Precondition: reset complete  
Stimulus: drive bits for 0xA5 one at a time  
Verify after each clock:

| Clock | serial_in | Expected data_out |
|---|---|---|
| 1 | 1 | 0b0000_0001 |
| 2 | 0 | 0b0000_0010 |
| 3 | 1 | 0b0000_0101 |
| 4 | 0 | 0b0000_1010 |
| 5 | 0 | 0b0001_0100 |
| 6 | 1 | 0b0010_1001 |
| 7 | 0 | 0b0101_0010 |
| 8 | 1 | 0b1010_0101 = 0xA5 |

Rationale: any off-by-one in the shift direction or concatenation formula is exposed immediately

---

### Module 2: piso_shift_reg

**Ports:** `clk`, `rst`, `load`, `data_in[7:0]` → `serial_out`

**Purpose:** Loads a parallel byte on a `load` pulse and shifts it out serially MSB-first,
one bit per clock. Mirror image of `sipo_shift_reg`. Used as the building block for all
master TX logic.

---

**TC-PISO-01 — Load then shift out 0xA5**  
Category: Normal  
Precondition: reset complete  
Stimulus: set `data_in = 8'hA5`, assert `load = 1` for 1 clock, deassert `load = 0`, then apply 8 clock edges  
Capture: `serial_out` on each of the 8 clock edges, assembling MSB-first into a result byte  
Verify: assembled result `=== 8'hA5`  
Rationale: confirms load-then-shift basic functionality

---

**TC-PISO-02 — Load then shift out 0x3C**  
Category: Normal  
Precondition: TC-PISO-01 complete  
Stimulus: same procedure with `data_in = 8'h3C`  
Verify: assembled result `=== 8'h3C`  
Rationale: different value confirms no constant output

---

**TC-PISO-03 — Reset clears serial_out**  
Category: Reset  
Precondition: data loaded (after TC-PISO-02)  
Stimulus: assert `rst = 1` for 1 clock, deassert  
Verify: `serial_out === 1'b0` immediately after reset  
Rationale: confirms shift register is cleared, not left in previous state

---

**TC-PISO-04 — Re-load during active shift**  
Category: Corner  
Precondition: reset complete  
Stimulus: load 0xA5, shift 4 clocks (partial), then load 0x3C, shift 8 more clocks  
Capture: result from the second 8-clock shift sequence  
Verify: result `=== 8'h3C` (not a mix of 0xA5 and 0x3C)  
Rationale: confirms that a new load can interrupt and cleanly replace a partial shift

---

**TC-PISO-05 — MSB-first order verification**  
Category: Detailed trace  
Precondition: reset complete  
Stimulus: load `8'b1100_0011` (0xC3), then shift out 8 clocks  
Verify: `serial_out` sequence across 8 clocks is exactly `1, 1, 0, 0, 0, 0, 1, 1`  
Rationale: any reversal in the shift direction is immediately visible

---

**TC-PISO-06 — serial_out stays 0 after shift completes**  
Category: Post-completion  
Precondition: TC-PISO-05 complete  
Stimulus: allow 4 more clock cycles with `load = 0`  
Verify: `serial_out === 1'b0` on all 4 clocks  
Rationale: shift register should shift in zeros after the loaded byte is exhausted

---

### Module 3: spi_byte_counter

**Ports:** `clk`, `rst`, `cs_n`, `sclk` → `bit_idx[2:0]`, `byte_done`

**Purpose:** Counts rising edges of `sclk` while `cs_n` is low. Outputs the current
bit index (0–7) and fires a one-clock `byte_done` pulse on the 8th edge. Resets on
`cs_n` deassert.

---

**TC-BCNT-01 — SCLK ignored when CS_N is high**  
Category: Gating  
Precondition: reset complete, `cs_n = 1`  
Stimulus: drive 8 SCLK pulses with various MOSI values  
Verify: `bit_idx === 3'd0` throughout; `byte_done` never asserts  
Rationale: gate logic must prevent counting outside a frame

---

**TC-BCNT-02 — 7 pulses advance bit_idx to 7**  
Category: Normal  
Precondition: reset complete, `cs_n = 0`  
Stimulus: drive 7 SCLK rising edges  
Verify: `bit_idx === 3'd7` after 7th edge; `byte_done === 1'b0` (not yet fired)  
Rationale: confirms counting stops at 7 before the 8th edge

---

**TC-BCNT-03 — 8th pulse fires byte_done for exactly 1 clock**  
Category: Normal  
Precondition: TC-BCNT-02 complete  
Stimulus: drive 1 more SCLK rising edge  
Verify: `byte_done === 1'b1` on the clock after the edge  
Verify: `byte_done === 1'b0` on the clock after that  
Rationale: byte_done must be a single-clock pulse for downstream state machines to latch once

---

**TC-BCNT-04 — bit_idx resets to 0 when byte_done fires**  
Category: Normal  
Precondition: TC-BCNT-03 in progress  
Verify: `bit_idx === 3'd0` at the same clock `byte_done` is high  
Rationale: counter must auto-wrap for multi-byte transactions

---

**TC-BCNT-05 — CS_N deassert mid-frame resets counter**  
Category: Corner  
Precondition: reset complete, `cs_n = 0`  
Stimulus: drive 5 SCLK rising edges (bit_idx should reach 5), then deassert `cs_n = 1`  
Verify: `bit_idx === 3'd0` within 2 system clocks of CS_N deassert  
Rationale: aborted frame must not leave bit_idx in a non-zero state for the next frame

---

**TC-BCNT-06 — Two consecutive complete frames**  
Category: Back-to-back  
Precondition: reset complete  
Stimulus: drive frame 1 (8 SCLK pulses, CS_N toggle), then frame 2 (8 SCLK pulses)  
Verify: `byte_done` fires exactly once during frame 1 and exactly once during frame 2  
Verify: `byte_done` does not fire during the inter-frame gap  
Rationale: counter must not carry state between frames

---

### Module 4: spi_clkdiv

**Ports:** `clk`, `rst` → `sclk`, `sclk_rise`, `sclk_fall`

**Purpose:** Divides the system clock by 8 to produce `sclk`. Outputs one-clock-wide
edge strobes `sclk_rise` and `sclk_fall` that downstream logic uses for sampling and
shifting without having to re-detect edges.

---

**TC-CLKDIV-01 — SCLK idles low after reset**  
Category: Reset  
Stimulus: assert `rst = 1`, apply 2 clocks, deassert  
Verify: `sclk === 1'b0` immediately after reset deasserts  
Rationale: SPI Mode 0 requires SCLK low when idle

---

**TC-CLKDIV-02 — 8 rising edges in 64 system clocks**  
Category: Normal  
Stimulus: run 64 system clock cycles after reset  
Verify: count of `sclk` rising transitions equals 8  
Rationale: divide-by-8 means 8 full SCLK cycles per 64 system clocks

---

**TC-CLKDIV-03 — 8 falling edges in 64 system clocks**  
Category: Normal  
Stimulus: same 64-clock window as TC-CLKDIV-02  
Verify: count of `sclk` falling transitions equals 8  
Rationale: confirms 50% duty cycle

---

**TC-CLKDIV-04 — sclk_rise and sclk_fall never simultaneous**  
Category: Sanity  
Stimulus: monitor both strobes for 64 system clocks  
Verify: never a clock cycle where both `sclk_rise` and `sclk_fall` are 1  
Rationale: simultaneous strobes would cause a slave to both sample and shift on the same edge

---

**TC-CLKDIV-05 — Edge strobes are exactly 1 system clock wide**  
Category: Pulse width  
Stimulus: monitor `sclk_rise` for 64 system clocks, recording consecutive 1s  
Verify: maximum run length of `sclk_rise = 1` is exactly 1  
Verify: same for `sclk_fall`  
Rationale: multi-cycle strobes would cause double-shifting or double-sampling

---

### Module 5: spi_master

**Ports:** `clk`, `rst`, `start`, `tx_data[7:0]`, `miso` → `mosi`, `sclk`, `cs_n`, `busy`, `done`, `rx_data[7:0]`

**Purpose:** 8-bit SPI Mode 0 master. On `start` pulse: asserts CS_N, shifts `tx_data`
out on MOSI while sampling MISO into `rx_data`, then deasserts CS_N and fires `done`.

---

**TC-MSTR-01 — TX data appears correctly on MOSI**  
Category: Normal  
Precondition: reset complete; slave model configured to drive 0xC3 on MISO  
Stimulus: set `tx_data = 8'hAB`, pulse `start` for 1 clock  
Action: MOSI capture model records 8 bits during SCLK rising edges  
Verify: captured MOSI byte `=== 8'hAB`  
Rationale: confirms shift-out path

---

**TC-MSTR-02 — MISO data received correctly in rx_data**  
Category: Normal  
Precondition: TC-MSTR-01 transfer (slave driving 0xC3)  
Verify: `rx_data === 8'hC3` after `done` pulses  
Rationale: confirms shift-in path

---

**TC-MSTR-03 — busy asserts on start, deasserts on done**  
Category: Handshake  
Precondition: reset complete  
Stimulus: pulse `start`  
Verify: `busy === 1'b1` on the clock after `start`  
Verify: `busy === 1'b0` at the same clock `done` fires  
Rationale: upstream logic uses `busy` to know when a new transfer can begin

---

**TC-MSTR-04 — CS_N behavior across the transfer**  
Category: Protocol timing  
Precondition: reset complete  
Stimulus: pulse `start`  
Verify: `cs_n` asserts (goes low) within 1 clock of `start`  
Verify: `cs_n` remains low for all 8 SCLK cycles  
Verify: `cs_n` deasserts (goes high) after `done` fires  
Rationale: CS_N framing must be correct for slave to recognize the transfer

---

**TC-MSTR-05 — done is exactly 1 clock wide**  
Category: Pulse width  
Precondition: reset complete  
Stimulus: run a transfer, latch `done` into a counter  
Verify: counter equals 1 after transfer completes  
Rationale: multi-cycle `done` would cause downstream logic to latch rx_data multiple times

---

**TC-MSTR-06 — Back-to-back transfers**  
Category: Back-to-back  
Precondition: first transfer complete  
Stimulus: immediately pulse `start` again with `tx_data = 8'h12` (slave responds 0x34)  
Verify: `rx_data === 8'h34` after second `done`  
Stimulus: immediately pulse `start` with `tx_data = 8'h56` (slave responds 0x78)  
Verify: `rx_data === 8'h78` after third `done`  
Rationale: confirms no state leak between transfers

---

**TC-MSTR-07 — MISO = 0xFF received correctly**  
Category: Boundary  
Precondition: reset complete; slave model configured to drive 0xFF  
Stimulus: pulse `start` with any `tx_data`  
Verify: `rx_data === 8'hFF`  
Rationale: confirms no bit masking to 0

---

**TC-MSTR-08 — Start ignored while busy**  
Category: Corner  
Precondition: reset complete  
Stimulus: pulse `start` to begin transfer; during the transfer pulse `start` again  
Verify: only one `done` fires; `rx_data` corresponds to the first transfer only  
Rationale: master must not restart mid-transfer on a spurious start pulse

---

### Module 6: spi_master_16

**Ports:** `clk`, `rst`, `start`, `tx_word[15:0]`, `miso` → `mosi`, `sclk`, `cs_n`, `busy`, `done`, `rx_word[15:0]`

**Purpose:** 16-bit variant of `spi_master`. Sends and receives a 16-bit word in a
single CS_N assertion. High byte `[15:8]` transmitted first.

---

**TC-M16-01 — CS_N stays low for all 16 SCLK cycles**  
Category: Protocol  
Stimulus: pulse `start`, monitor `cs_n` across the transfer  
Verify: `cs_n === 1'b0` from start to done; never pulses high between cycles 7 and 8  
Rationale: a CS_N glitch between bytes would cause a one-byte slave to deframe

---

**TC-M16-02 — High byte transmitted first**  
Category: Bit order  
Stimulus: `tx_word = 16'hABCD`, pulse `start`  
Action: MOSI capture model records all 16 bits  
Verify: bits 15..8 of captured word equal 0xAB; bits 7..0 equal 0xCD  
Rationale: endianness of 16-bit transfer must be MSB-first byte, MSB-first bit

---

**TC-M16-03 — 16-bit rx_word assembled correctly**  
Category: Normal  
Precondition: slave model configured to drive 0x12 then 0x34 across 16 SCLK cycles  
Stimulus: pulse `start`  
Verify: `rx_word === 16'h1234` after `done`  
Rationale: confirms both bytes of the receive shift register are assembled correctly

---

**TC-M16-04 — done fires after bit 15, not bit 7**  
Category: Timing  
Stimulus: pulse `start`; monitor `done` and `bit_cnt` value  
Verify: `done` does not fire at the 8th SCLK cycle  
Verify: `done` fires at the 16th SCLK cycle  
Rationale: 16-bit transfer must not terminate early like an 8-bit transfer would

---

**TC-M16-05 — Back-to-back 16-bit transfers**  
Category: Back-to-back  
Stimulus: two consecutive transfers with different `tx_word` values  
Verify: each produces independent correct `rx_word` and `mosi` output  
Rationale: confirms no carryover of bit counter or shift register state

---

### Module 7: spi_master_param

**Ports:** `clk`, `rst`, `start`, `tx_data`, `miso`, `cpol`, `cpha` → `mosi`, `sclk`, `cs_n`, `busy`, `done`, `rx_data`  
**Parameter:** `N_BITS` (transfer width, default 8)

**Purpose:** Parameterized master supporting all four SPI modes (CPOL × CPHA combinations)
and configurable transfer width.

---

**TC-PARAM-01 — Mode 0 (CPOL=0, CPHA=0) transfer**  
Category: Normal  
Stimulus: `cpol = 0`, `cpha = 0`, `tx_data = 8'hA5`, pulse `start`  
Verify: `sclk` idles low before and after transfer  
Verify: MOSI is stable before first rising SCLK edge  
Verify: `rx_data === 8'hA5` (MISO loopback to MOSI assumed)  
Rationale: baseline mode used in spi1–spi4

---

**TC-PARAM-02 — Mode 1 (CPOL=0, CPHA=1) transfer**  
Category: Mode coverage  
Stimulus: `cpol = 0`, `cpha = 1`  
Verify: `sclk` idles low  
Verify: MOSI changes on the first rising SCLK edge (not before)  
Verify: data sampled on falling SCLK edge  
Rationale: some sensors and ADCs require CPHA=1

---

**TC-PARAM-03 — Mode 2 (CPOL=1, CPHA=0) transfer**  
Category: Mode coverage  
Stimulus: `cpol = 1`, `cpha = 0`  
Verify: `sclk` idles high  
Verify: MOSI stable before first falling SCLK edge  
Verify: data sampled on falling SCLK edge  
Rationale: common in some display driver ICs

---

**TC-PARAM-04 — Mode 3 (CPOL=1, CPHA=1) transfer**  
Category: Mode coverage  
Stimulus: `cpol = 1`, `cpha = 1`  
Verify: `sclk` idles high  
Verify: MOSI changes on first falling SCLK edge  
Verify: data sampled on rising SCLK edge  
Rationale: used in some SD card SPI mode variants

---

**TC-PARAM-05 — N_BITS=16 produces 16 SCLK cycles**  
Category: Parameter  
Stimulus: recompile with `N_BITS=16`, run a transfer  
Verify: `sclk` produces exactly 16 rising edges during the transfer  
Verify: `done` fires after the 16th cycle  
Rationale: parameterization must scale correctly

---

### Module 8: spi_slave_rx

**Ports:** `clk`, `rst`, `cs_n`, `sclk`, `mosi` → `rx_data[7:0]`, `rx_valid`

**Purpose:** Receive-only SPI slave. Shifts in 8 MOSI bits during a CS_N-framed
SCLK sequence, then fires a one-clock `rx_valid` pulse with the assembled byte on
`rx_data`.

---

**TC-SRXR-01 — Receive 0xA5**  
Category: Normal  
Stimulus: assert CS_N low, drive 8 SCLK cycles with MOSI = bits of 0xA5 MSB-first, deassert CS_N  
Verify: `rx_valid` pulses once; at that moment `rx_data === 8'hA5`  
Rationale: basic receive function

---

**TC-SRXR-02 — Receive 0x37**  
Category: Normal  
Stimulus: same procedure with MOSI = bits of 0x37  
Verify: `rx_data === 8'h37` when `rx_valid` fires  
Rationale: different value, different bit pattern

---

**TC-SRXR-03 — rx_valid is exactly 1 clock wide**  
Category: Pulse width  
Stimulus: run TC-SRXR-01, monitor `rx_valid` with a counter for 4 clocks after CS_N deasserts  
Verify: counter equals 1  
Rationale: downstream latch-on-valid logic must not double-capture

---

**TC-SRXR-04 — SCLK ignored when CS_N is high**  
Category: Gating  
Precondition: reset complete, `cs_n = 1`  
Stimulus: drive 8 SCLK pulses with MOSI = 0xFF  
Verify: `rx_valid` never fires  
Rationale: activity outside a CS_N frame must be invisible to the slave

---

**TC-SRXR-05 — CS_N deassert mid-frame aborts the byte**  
Category: Corner  
Stimulus: assert CS_N, drive 4 SCLK cycles (partial byte), deassert CS_N; then drive a complete fresh frame with MOSI = 0xBB  
Verify: `rx_data === 8'hBB` when `rx_valid` fires (not a corrupted mix)  
Rationale: abort recovery — real masters sometimes deframe on error

---

**TC-SRXR-06 — Back-to-back bytes**  
Category: Back-to-back  
Stimulus: frame 1 sends 0xA5; frame 2 (after CS_N toggle) sends 0x3C  
Verify: `rx_valid` fires once per frame; `rx_data` values are correct for each  
Rationale: confirms no carryover between frames

---

### Module 9: spi_slave_fd

**Ports:** `clk`, `rst`, `cs_n`, `sclk`, `mosi`, `tx_data[7:0]` → `miso`, `rx_data[7:0]`, `rx_valid`

**Purpose:** Full-duplex slave. Pre-loads `tx_data` on CS_N falling edge and shifts it
out on MISO while simultaneously receiving MOSI bits into `rx_data`. Both directions
proceed on the same SCLK.

---

**TC-SLFD-01 — MISO returns tx_data correctly**  
Category: Normal  
Precondition: `tx_data = 8'hBE` before CS_N fall  
Stimulus: assert CS_N, run full-duplex transfer, capture MISO bits  
Verify: MISO bit sequence equals bits of 0xBE MSB-first  
Verify: assembled MISO byte `=== 8'hBE`  
Rationale: TX path from pre-load to MISO

---

**TC-SLFD-02 — Slave receives MOSI correctly**  
Category: Normal  
Precondition: MOSI driving 0x5A during TC-SLFD-01 transfer  
Verify: `rx_data === 8'h5A` when `rx_valid` fires  
Rationale: RX path alongside TX

---

**TC-SLFD-03 — MISO is 0 when CS_N is high**  
Category: Idle state  
Precondition: `cs_n = 1` (no active transfer)  
Verify: `miso === 1'b0`  
Rationale: MISO must not float or drive stale data while idle

---

**TC-SLFD-04 — tx_data change after CS_N fall is ignored**  
Category: Corner  
Precondition: `tx_data = 8'hAA`  
Stimulus: assert CS_N (pre-load occurs), then change `tx_data = 8'h55` before any SCLK edges, run transfer  
Verify: first MISO bit (bit 7) is 1 (bit 7 of 0xAA, not 0x55)  
Rationale: pre-load must latch the value at CS_N fall, not track live `tx_data`

---

**TC-SLFD-05 — Second transfer with different tx_data**  
Category: Back-to-back  
Stimulus: after TC-SLFD-01, set `tx_data = 8'hF0`, run second transfer  
Verify: second transfer MISO byte `=== 8'hF0`  
Rationale: confirms pre-load refreshes each frame

---

**TC-SLFD-06 — rx_valid fires on 8th SCLK rising edge**  
Category: Timing  
Stimulus: run transfer, track which SCLK edge triggers `rx_valid`  
Verify: `rx_valid` fires on or immediately after the 8th rising edge  
Verify: `rx_valid` does not fire before the 8th edge  
Rationale: early rx_valid fires a partial byte

---

### Module 10: spi_loopback

**Ports:** `clk`, `rst`, `start`, `tx_m[7:0]`, `tx_s[7:0]` → `rx_m[7:0]`, `rx_s[7:0]`, `busy`, `done`

**Purpose:** Integrates `spi_master` and `spi_slave_fd` on a shared bus internally.
Both master-to-slave and slave-to-master paths are verified in a single transfer.

---

**TC-LOOP-01 — Master TX reaches slave RX**  
Category: Normal  
Stimulus: `tx_m = 8'hA5`, `tx_s = 8'h3C`, pulse `start`  
Verify: `rx_s === 8'hA5` after `done` fires  
Rationale: MOSI path from master shift-out to slave shift-in

---

**TC-LOOP-02 — Slave TX reaches master RX**  
Category: Normal  
Precondition: TC-LOOP-01 transfer  
Verify: `rx_m === 8'h3C` after `done` fires  
Rationale: MISO path from slave pre-load to master shift-in

---

**TC-LOOP-03 — Both directions simultaneously correct**  
Category: Combined  
Stimulus: single transfer with `tx_m = 8'hDE`, `tx_s = 8'hAD`  
Verify: `rx_s === 8'hDE` AND `rx_m === 8'hAD` both true after `done`  
Rationale: full-duplex — both paths must work at the same time

---

**TC-LOOP-04 — busy/done handshake**  
Category: Handshake  
Stimulus: pulse `start`, monitor `busy` and `done`  
Verify: `busy = 1` during transfer, `busy = 0` at `done`, `done` is 1 clock wide  
Rationale: caller uses busy/done to sequence multiple transfers

---

**TC-LOOP-05 — Back-to-back transfers**  
Category: Back-to-back  
Stimulus: two transfers with different tx_m and tx_s values  
Verify: both produce independent correct rx_m and rx_s  
Rationale: no state leak between transfers

---

### Module 11: spi_regfile

**Ports:** `clk`, `rst`, `cs_n`, `sclk`, `mosi` → `miso`, `wr_valid`, `wr_addr[2:0]`, `wr_data[7:0]`

**Purpose:** Two-phase SPI slave. Each transaction is two bytes: a command byte
`{rw, 2'b00, addr[2:0]}` followed by a data byte. On write (rw=0), stores data and
pulses `wr_valid`. On read (rw=1), shifts out the register value on MISO.

**Register map:** 8 independent 8-bit registers, addressed by bits [2:0] of command byte.

---

**TC-RFILE-01 — Read before write returns 0x00**  
Category: Reset state  
Stimulus: read transaction to address 0 immediately after reset  
Verify: MISO byte `=== 8'h00`  
Rationale: registers must power up / reset to 0

---

**TC-RFILE-02 — wr_valid does not fire on a read transaction**  
Category: Protocol  
Precondition: TC-RFILE-01 read transaction  
Verify: `wr_valid` never asserted during or after the read  
Rationale: reads must not corrupt the write-valid side-channel

---

**TC-RFILE-03 — Write to register 3 produces correct wr_valid output**  
Category: Normal  
Stimulus: write transaction, address=3, data=0xAB  
Verify: `wr_valid` pulses once; `wr_addr === 3'd3`; `wr_data === 8'hAB`  
Rationale: write side-channel output is correct

---

**TC-RFILE-04 — Read back register 3 returns 0xAB**  
Category: Normal  
Precondition: TC-RFILE-03 complete  
Stimulus: read transaction to address 3  
Verify: MISO byte `=== 8'hAB`  
Rationale: written value survives and is readable

---

**TC-RFILE-05 — Write to all 8 registers, read back all 8**  
Category: Full coverage  
Stimulus: 8 write transactions: addr 0→0x11, 1→0x22, 2→0x33, 3→0xAB, 4→0x55, 5→0x7E, 6→0x66, 7→0xFF  
Verify: 8 subsequent reads return the correct value for each address  
Rationale: all 8 addresses must be independently addressable

---

**TC-RFILE-06 — Overwrite register, verify new value**  
Category: Overwrite  
Stimulus: write 0xAB to address 3; then write 0xCD to address 3  
Verify: read from address 3 returns 0xCD, not 0xAB  
Rationale: registers must be overwritable

---

**TC-RFILE-07 — Two writes to different addresses are independent**  
Category: Independence  
Stimulus: write 0x11 to address 1; write 0x22 to address 2  
Verify: read address 1 returns 0x11; read address 2 returns 0x22  
Rationale: writing one register must not corrupt another

---

### Module 12: spi_adc_slave

**Ports:** `clk`, `rst`, `cs_n`, `sclk`, `adc_val[7:0]` → `miso`

**Purpose:** Emulates an ADC that returns a pre-sampled conversion result over SPI.
On CS_N falling edge, latches `adc_val` into a shift register and shifts it out MSB-first
on MISO. No MOSI needed — output only.

---

**TC-ADC-01 — adc_val captured at CS_N fall is shifted out**  
Category: Normal  
Precondition: `adc_val = 8'h7F` before CS_N falls  
Stimulus: assert CS_N, drive 8 SCLK cycles, capture MISO  
Verify: assembled MISO byte `=== 8'h7F`  
Rationale: core ADC read function

---

**TC-ADC-02 — adc_val change during transfer is ignored**  
Category: Corner  
Precondition: `adc_val = 8'hAA`  
Stimulus: assert CS_N (latches 0xAA), then change `adc_val = 8'h55` mid-transfer  
Verify: complete MISO byte after 8 clocks `=== 8'hAA`  
Rationale: ADC result must be stable throughout the shift-out phase

---

**TC-ADC-03 — MISO = 0 when CS_N is high**  
Category: Idle state  
Verify: `miso === 1'b0` with `cs_n = 1` and various `adc_val` values  
Rationale: bus idle must not drive stale data

---

**TC-ADC-04 — Back-to-back reads with different adc_val**  
Category: Back-to-back  
Stimulus: transfer 1 with `adc_val = 8'h3A`; transfer 2 with `adc_val = 8'hC1`  
Verify: MISO byte 1 `=== 8'h3A`; MISO byte 2 `=== 8'hC1`  
Rationale: each transfer must snapshot a fresh `adc_val`

---

**TC-ADC-05 — MISO shifts MSB-first**  
Category: Bit order  
Stimulus: `adc_val = 8'b1010_0101`, run transfer  
Verify: MISO sequence across 8 SCLK cycles is `1, 0, 1, 0, 0, 1, 0, 1`  
Rationale: bit order must match what the master expects

---

### Module 13: spi_flash_slave

**Ports:** `clk`, `rst`, `cs_n`, `sclk`, `mosi` → `miso`, `wr_valid`  
**Internal memory:** 16 bytes (addresses 0x00–0x0F)

**Purpose:** Emulates an 8-byte flash memory with a 3-byte protocol:
command byte, address byte, data byte. Supports three commands:
- `0x03` READ — shifts out `mem[addr]` on MISO
- `0x02` WRITE — stores received data byte at `mem[addr]`, pulses `wr_valid`
- `0x05` READ_STATUS — shifts out 0x00 (device ready)

---

**TC-FLASH-01 — WRITE command stores byte at address**  
Category: Normal  
Stimulus: 3-byte transaction: command=0x02, address=0x05, data=0xBB  
Verify: `wr_valid` pulses once after the data byte completes  
Rationale: write path to memory

---

**TC-FLASH-02 — READ command returns stored byte**  
Category: Normal  
Precondition: TC-FLASH-01 complete  
Stimulus: 3-byte transaction: command=0x03, address=0x05, data=don't-care (send 0x00)  
Verify: MISO byte during data phase `=== 8'hBB`  
Rationale: read path from memory

---

**TC-FLASH-03 — READ_STATUS returns 0x00**  
Category: Command decode  
Stimulus: transaction: command=0x05, no address or data bytes needed  
Verify: MISO byte `=== 8'h00`  
Rationale: status register always reads as ready (no write-in-progress emulation needed)

---

**TC-FLASH-04 — wr_valid fires on WRITE only, not on READ**  
Category: Protocol  
Stimulus: READ transaction followed by WRITE transaction  
Verify: `wr_valid` does not fire during or after the READ  
Verify: `wr_valid` fires once during the WRITE  
Rationale: wr_valid is a write-notify signal, must not fire on reads

---

**TC-FLASH-05 — Write to address 0 and address 15 (boundary)**  
Category: Boundary  
Stimulus: WRITE to address 0x00 with data 0x11; WRITE to address 0x0F with data 0xFF  
Verify: READ from 0x00 returns 0x11; READ from 0x0F returns 0xFF  
Rationale: boundary addresses of the 16-byte memory array

---

**TC-FLASH-06 — Overwrite same address**  
Category: Overwrite  
Stimulus: WRITE 0xAA to address 3; WRITE 0x55 to address 3  
Verify: READ from address 3 returns 0x55  
Rationale: flash emulator must support in-place overwrite

---

**TC-FLASH-07 — READ does not corrupt stored value**  
Category: Non-destructive read  
Precondition: WRITE 0xC3 to address 7  
Stimulus: READ from address 7 twice  
Verify: both reads return 0xC3  
Rationale: reads must be non-destructive

---

**TC-FLASH-08 — Command decode: 0x02 vs 0x03 (differ in bit 0)**  
Category: Corner  
Stimulus: send READ command (0x03) then WRITE command (0x02) to same address  
Verify: READ does not assert `wr_valid`; WRITE does assert `wr_valid`  
Verify: READ returns the stored value; WRITE updates it  
Rationale: these two commands are identical except for bit 0 — a common decode mistake

---

### Module 14: spi_bus_ctrl

**Ports:** `clk`, `rst`, `start`, `dev_sel[1:0]`, `tx_data[7:0]`, `miso0`, `miso1`, `miso2` → `mosi`, `sclk`, `cs0_n`, `cs1_n`, `cs2_n`, `miso_in`, `busy`, `done`, `rx_data[7:0]`

**Purpose:** Multi-peripheral SPI bus controller. Routes CS_N and MISO to one of three
peripheral slaves based on `dev_sel`. The selected slave's CS_N asserts; the others remain
high. MISO from the selected slave is routed to `miso_in`.

---

**TC-BUSCTRL-01 — dev_sel=0 asserts cs0_n only**  
Category: Normal  
Stimulus: `dev_sel = 2'd0`, pulse `start`  
Verify: `cs0_n` asserts (low) during transfer; `cs1_n` and `cs2_n` stay high throughout  
Rationale: only the selected peripheral should respond

---

**TC-BUSCTRL-02 — dev_sel=1 asserts cs1_n only**  
Category: Normal  
Stimulus: `dev_sel = 2'd1`, pulse `start`  
Verify: `cs1_n` asserts; `cs0_n` and `cs2_n` stay high  
Rationale: peripheral 1 selection

---

**TC-BUSCTRL-03 — dev_sel=2 asserts cs2_n only**  
Category: Normal  
Stimulus: `dev_sel = 2'd2`, pulse `start`  
Verify: `cs2_n` asserts; `cs0_n` and `cs1_n` stay high  
Rationale: peripheral 2 selection

---

**TC-BUSCTRL-04 — MISO from selected slave reaches miso_in**  
Category: Routing  
Stimulus: `dev_sel = 2'd1`, slave 1 model drives 0xBE on its MISO, pulse `start`  
Verify: `rx_data === 8'hBE` after `done`  
Rationale: MISO multiplexer must select the correct slave output

---

**TC-BUSCTRL-05 — MISO from non-selected slaves is ignored**  
Category: Isolation  
Stimulus: `dev_sel = 2'd0`, slaves 1 and 2 driving 0xFF on their MISO, slave 0 driving 0x3C  
Verify: `rx_data === 8'h3C` (slave 0's response, not 0xFF)  
Rationale: non-selected MISO inputs must not bleed through

---

**TC-BUSCTRL-06 — dev_sel change between transfers takes effect**  
Category: Re-select  
Stimulus: transfer 1 with `dev_sel = 2'd0`; change `dev_sel = 2'd2`; transfer 2  
Verify: transfer 1 asserts `cs0_n`; transfer 2 asserts `cs2_n`  
Rationale: dev_sel must be re-evaluated on each new start pulse

---

**TC-BUSCTRL-07 — dev_sel change during active transfer does not cause CS_N glitch**  
Category: Corner  
Stimulus: `dev_sel = 2'd0`, start transfer; after 4 SCLK cycles change `dev_sel = 2'd1`  
Verify: `cs0_n` remains asserted throughout the transfer  
Verify: `cs1_n` remains deasserted throughout the transfer  
Rationale: dev_sel is latched at `start`; live changes must not cause mid-transfer crosstalk

---

## Part 6 — Corner Case Reference

The following are the most commonly missed bugs, organised by the failure pattern they produce.

---

### 6.1 Edge-detection off-by-one

**Symptom:** First bit of every frame is wrong or missing; all other bits are correct.

**Root cause:** The `sclk_prev` register is not valid on the very first clock after CS_N
deasserts, because CS_N fall and the first SCLK edge arrive too close together relative
to the `sclk_prev` pipeline register.

**How to expose:** Send a complete byte with zero idle time between CS_N fall and the
first SCLK edge. Compare the received byte to the expected value. Introduce even 1–2
system clock cycles of idle time and verify the byte becomes correct — this confirms
the diagnosis.

**Fix pattern:** Allow at least 2 system clock cycles between CS_N fall and the first
SCLK edge in the testbench. Alternatively, initialise `sclk_prev` and `cs_n_prev` to
their idle values in reset.

---

### 6.2 byte_done persists multiple clocks

**Symptom:** Downstream logic latches the same byte twice, or a toggle-on-valid register
toggles twice per byte.

**Root cause:** Missing `else byte_done <= 1'b0` branch in the sequential block. The
signal asserts and stays high until some other condition clears it.

**How to expose:** Drive a counter that increments every clock `byte_done` is high.
After exactly one complete frame, verify the counter equals 1. Values greater than 1
confirm the bug.

**Fix pattern:** Every output pulse signal must have an unconditional `else signal <= 0`
path in the always_ff block.

---

### 6.3 rx_data captures the wrong value (off by one bit)

**Symptom:** `rx_data` is off by one bit shift; the last MOSI bit is absent, or the
first bit appears doubled.

**Root cause:** On the 8th SCLK edge, the module captures `shift_reg` directly instead
of `{shift_reg[6:0], mosi}`. The last MOSI bit has not yet been shifted in.

**How to expose:** Send the alternating pattern 0xAA (1010_1010) and compare it against
0x55 (0101_0101). A one-bit shift will transform one into the other, making the error
immediately visible.

**Fix pattern:** On the 8th SCLK rising edge, capture `{shift_reg[6:0], mosi}`, not
just `shift_reg`.

---

### 6.4 MISO pre-load too late

**Symptom:** Bit 7 (MSB) of every MISO output is always 0, regardless of `tx_data`.

**Root cause:** `tx_shift` is loaded from `tx_data` on the first SCLK rising edge instead
of on the CS_N falling edge. By the time the first SCLK edge arrives, the slave has already
driven MISO (from the old shift register value) for the bit-7 window.

**How to expose:** Set `tx_data` to a value with a 1 in bit 7 (e.g., 0x80 = 8'b1000_0000).
Run a read transfer. If MISO bit 7 reads as 0, the pre-load is late.

**Fix pattern:** Pre-load `tx_shift <= tx_data` in the `cs_n_fall` branch of the
sequential block, before any SCLK activity.

---

### 6.5 Multi-peripheral CS_N crosstalk

**Symptom:** Two CS_N outputs both assert, or the wrong CS_N asserts, during a transfer.
May also appear as a mid-transfer CS_N glitch when `dev_sel` changes.

**Root cause:** `dev_sel` is used combinationally to drive the CS_N outputs without
registering. A change to `dev_sel` during a transfer immediately changes the CS_N routing.

**How to expose:** Start a transfer with `dev_sel = 0`. Partway through, change `dev_sel`
to 1 and monitor all three CS_N lines with a glitch-detection register. Any transition
on the non-selected lines during the transfer confirms the bug.

**Fix pattern:** Register `dev_sel` into `dev_sel_r` on the `start` pulse. Use `dev_sel_r`
(not `dev_sel`) to drive the CS_N ternary mux.

---

### 6.6 Flash command decode confusion (0x02 vs 0x03)

**Symptom:** A READ command causes a write to memory, or a WRITE command returns stale
data on MISO instead of storing.

**Root cause:** The command byte is decoded using `shift_reg` instead of
`{shift_reg[6:0], mosi}` on the 8th clock, so bit 0 is missing from the decode. Since
READ (0x03) and WRITE (0x02) differ only in bit 0, both decode to the same value.

**How to expose:** Perform a READ followed by a WRITE to the same address. If `wr_valid`
fires during the READ, the decode is broken. If READ returns wrong data after a WRITE,
the same bug is present.

**Fix pattern:** Same as corner case 6.3 — always use the full `{shift_reg[6:0], mosi}`
expression when capturing the final byte value.

---

### 6.7 CS_N toggling between bytes in multi-byte transactions

**Symptom:** A 2-byte or 3-byte transaction (regfile, flash) appears to the slave as two
or three separate 1-byte transactions because CS_N pulses high between bytes.

**Root cause:** Testbench deasserts CS_N after the first byte (common copy-paste from
single-byte testbenches) instead of keeping it low for the full multi-byte frame.

**How to expose:** Verify that `cs_n` stays low from the first bit of byte 0 through
the last bit of the final byte. A logic analyser view of the waveform makes this obvious.

**Fix pattern:** In multi-byte testbench tasks, keep `cs_n = 0` across all `send8`/
`recv8` calls; only deassert at the very end of the full transaction.

---

## Part 7 — Verification Execution Checklist

Run this checklist before marking any module as fully verified.

### Before writing the testbench

- [ ] Read the module's coverage list in Part 3 end-to-end
- [ ] Identify which corner cases from Part 6 apply to this module
- [ ] Confirm the module tier (T1–T5) and match task density to tier

### Structural checks (applies to every testbench)

- [ ] First line is `` `timescale 1ns/1ps ``
- [ ] Module is named exactly `tb`
- [ ] All signals declared as `logic` — no `reg`, no `wire`
- [ ] Clock uses `always #N clk = ~clk` with initialised `logic clk = 0`
- [ ] Reset: `rst=1`, 2 clock edges, `#1`, `rst=0`
- [ ] All `$display` assertion lines start with exactly `PASS` or `FAIL` (no leading spaces or other words)
- [ ] No `for` loops in testbench — use `repeat(N) @(posedge clk)` only
- [ ] No `++` operators — use `= x + 1`
- [ ] No `1'bz` — idle MISO driven `1'b0`
- [ ] All `send8` / `recv8` bits individually unrolled (no loop inside the task)

### Protocol checks

- [ ] Slave model reacts to `cs_n_fall`, not to `rst` or any other signal
- [ ] Transfer wait uses `repeat(N)` with safe margin (100+ for 8-bit, 200+ for 16-bit, 400+ for 3-byte)
- [ ] Post-edge `#1` skew present after every `@(posedge clk)` used for stimulus
- [ ] CS_N stays low for the entire duration of multi-byte transactions

### Coverage checks

- [ ] Every item in the module's Part 3 coverage list is exercised
- [ ] At least one test exercises the reset state
- [ ] At least one test exercises back-to-back operation
- [ ] Relevant corner cases from Part 6 are covered with specific test cases
- [ ] `expected[]` substrings all appear in a correct simulation run

### Final check

- [ ] All PASS lines printed, no FAIL lines, on a correct DUT
- [ ] Simulation ends with `$finish` — does not run forever

---

## Part 8 — Module Dependencies

Understanding which modules depend on others prevents wasted debugging time.

| Module | Depends on | Used by |
|---|---|---|
| `sipo_shift_reg` | none | `spi_slave_rx`, `spi_slave_fd`, `spi_regfile` |
| `piso_shift_reg` | none | `spi_master`, `spi_master_16`, `spi_master_param` |
| `spi_byte_counter` | `sipo_shift_reg` (concept) | `spi_slave_rx`, `spi_regfile` |
| `spi_clkdiv` | none | `spi_master`, `spi_master_16`, `spi_master_param` |
| `spi_master` | `spi_clkdiv`, `piso_shift_reg` | `spi_loopback`, `spi_bus_ctrl` |
| `spi_master_16` | `spi_master` (extended) | standalone |
| `spi_master_param` | `spi_master` (extended) | standalone |
| `spi_slave_rx` | `sipo_shift_reg`, `spi_byte_counter` | `spi_slave_fd` |
| `spi_slave_fd` | `spi_slave_rx` (extended) | `spi_loopback` |
| `spi_loopback` | `spi_master`, `spi_slave_fd` | standalone |
| `spi_regfile` | `spi_slave_fd` (extended) | standalone |
| `spi_adc_slave` | `spi_slave_fd` (concept) | `spi_bus_ctrl` |
| `spi_flash_slave` | `spi_regfile` (extended) | standalone |
| `spi_bus_ctrl` | `spi_master` + all slaves | standalone |

Verify lower-level modules first. A failure in `spi_master` will propagate through
`spi_loopback` and `spi_bus_ctrl`, making those failures look unrelated.

---

## Part 9 — Known Limitations

**No formal verification.** All tests are directed. Random constrained stimulus would
require a UVM or SystemVerilog constraint-solver framework not available in Verilator's
`--no-timing` mode.

**Single clock domain.** SCLK is always software-driven from the testbench or emulated
via edge detection. True asynchronous SCLK (from a different clock domain) requires
`--timing` mode.

**No X-propagation injection.** `===` comparisons detect X values, but testbenches do
not actively inject undefined values (uninitialised MISO, unknown SCLK start state) to
test robustness against X.

**No back-pressure stress testing.** Modules with a `busy` output are checked for
correct response to one mid-transfer `start` pulse. They are not bombarded with
continuous `start` pulses.

**16-bit and parameterized masters.** Test cases for `spi_master_16` and
`spi_master_param` mirror the 8-bit master pattern. Extend TC-MSTR-01 through TC-MSTR-08
by widening data patterns to 16 bits for complete 16-bit coverage.

**Memory boundary testing.** `spi_flash_slave` memory is 16 bytes (addresses 0x00–0x0F).
Addresses above 0x0F are not covered; address wrapping behaviour is not specified.
