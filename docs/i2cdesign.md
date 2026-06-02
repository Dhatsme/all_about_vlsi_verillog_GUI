# i2cdesign.md — I²C Protocol Design Course Guide

This file is the content planning document for the **I²C Protocol — Design Deep Dive** course
(`i2c` course ID in `courses.js`). It mirrors the methodology of the SPI and SystemVerilog
Zero to Hero course guides in structure and tier system.

**Scope:** Design-side I²C modules only. Testbench engineering for I²C is a separate course.

---

## Quick Reference

| Item | Detail |
|---|---|
| Course ID | `i2c` |
| Module IDs | `i2c1` through `i2c8` (8 chapters) |
| File pattern | `static/lessons/modules/i2cNNN.js` |
| Level range | beginner → advanced |
| Prerequisite courses | SystemVerilog Zero to Hero (msv1–msv7) |
| Additional prereqs | See **Part A** below |
| Simulator targets | Verilator 5.020 + iverilog |

---

## PART A — Prerequisite Topics to Add to SystemVerilog Zero to Hero

The current msv1–msv7 curriculum does not cover these topics, which I²C needs.
They should be added to the SV Zero to Hero course before or alongside the I²C course
so students are not blocked.

---

### A.1 — Tristate Buffers and Open-Drain Bus Modeling *(new msv lesson or msv6 extension)*

**Why I²C needs this:**
Both SDA and SCL are open-drain lines. Any device on the bus can pull the line low,
but no device actively drives it high — the line floats high via external pull-up resistors.
This is fundamentally different from the push-pull outputs used in all prior courses.

**Concepts to teach:**

| Concept | Explanation |
|---|---|
| `inout` port direction | Port that can be both read and driven |
| High-impedance `1'bz` | Let the pull-up resistor "win" — tri-state output |
| Open-drain drive pattern | `assign sda = drive_low ? 1'b0 : 1'bz` |
| Wire-AND logic | If any device drives `0`, the whole bus reads `0` |
| `pullup` primitive | `pullup p1(sda)` — passive pull-up in simulation |
| Reading back the line | Master drives `1'bz` then reads `sda` to see if someone else pulled it low |

**Recommended lesson placement:** msv6 L0 (insert before UART TX) or a standalone msv6-ext module.

**Suggested lesson title:** "Open-Drain Buses — How I²C, I³C, and SMBus Really Work"

**Minimum code snippet to include in theory:**
```systemverilog
// Open-drain output pattern — the ONLY correct way for I2C
assign sda = sda_drive_low ? 1'b0 : 1'bz;
// Read back what's actually on the wire:
wire sda_in = sda;   // if another device pulled it low, sda_in == 0
```

**Testbench setup for open-drain simulation:**
```systemverilog
wire sda;
pullup (sda);           // simulates pull-up resistor
pullup (scl);
i2c_master dut (.sda(sda), .scl(scl), ...);
```

---

### A.2 — Bidirectional Clock Lines and Clock Stretching *(new msv6/msv7 concept)*

**Why I²C needs this:**
In I²C, the slave can hold SCL LOW to pause the master — called clock stretching.
The master must monitor SCL even while it thinks it is driving it. This is a bus pattern
not encountered in any of msv1–msv7's designs.

**Concepts to teach:**

| Concept | Explanation |
|---|---|
| Clock monitoring during drive | Master drives SCL high → waits → reads SCL → only proceeds if SCL actually went high |
| Synchronous wait loop | FSM stays in WAIT_SCL_HIGH state until `scl_in === 1` |
| Maximum stretch timeout | Safety counter — if slave stretches too long, master aborts |

**Recommended lesson placement:** Introduce as a short section in the I²C master chapter (i2c3).

---

### A.3 — Multi-Driver Arbitration and Bus Collision Detection *(new advanced topic)*

**Why I²C needs this:**
Multi-master I²C requires each master to read back SDA while driving it. If a master drives
`1` but reads `0`, another master has won arbitration and the losing master must back off immediately.

**Concepts to teach:**

| Concept | Explanation |
|---|---|
| Arbitration while transmitting | Each SCL falling edge: compare driven bit vs actual SDA |
| Lost arbitration detection | `driven_bit == 1 && sda_in == 0` → lose |
| Graceful back-off | Master that loses goes to IDLE without generating STOP |
| Priority outcome | The master sending the lower address / data value wins naturally |

**Recommended lesson placement:** i2c7 (Multi-Master Arbitration chapter).

---

### A.4 — Parameterized Timing with `localparam` and `$clog2` *(extension of msv2 clock divider)*

**Why I²C needs this:**
I²C baud rate is derived from system clock: `SCL_PERIOD = CLK_FREQ / I2C_FREQ`.
Students need to handle large counter widths calculated at elaboration time.

**Concepts to teach:**

| Concept | Explanation |
|---|---|
| `parameter CLK_FREQ = 50_000_000` | System clock in Hz |
| `parameter I2C_FREQ = 100_000` | Target SCL frequency |
| `localparam HALF_PERIOD = CLK_FREQ / (2 * I2C_FREQ)` | Ticks per half-period |
| `logic [$clog2(HALF_PERIOD)-1:0] cnt` | Counter auto-sized to fit |
| 50% duty cycle enforcement | Count to HALF_PERIOD, flip SCL, count again |

**Recommended lesson placement:** Add as msv2 L5 "Precision Clock Generator" (Tier 3) or
include in i2c2 as a stand-alone baud rate section.

---

### A.5 — `integer` for Loop Variables in Testbenches *(minor SV clarification)*

Already covered in msv1–msv7, but students often forget that Verilator requires loop
variable declarations outside the `for` statement in some contexts. No new lesson needed —
add a note to agent.md.

---

### Summary Table: Prerequisites to Add

| Priority | Topic | Suggested Location | Blocking for I²C? |
|---|---|---|---|
| **CRITICAL** | Tristate / open-drain / `inout` ports | New msv6 lesson or msv6 extension | Yes — I²C cannot be simulated without this |
| **HIGH** | Clock stretching concept | I²C chapter 3 theory | Yes — any real I²C slave uses it |
| **HIGH** | Arbitration / bus collision detection | I²C chapter 7 | Yes — multi-master mode |
| **MEDIUM** | Parameterized clock dividers with `$clog2` | msv2 extension or i2c2 | No — manageable inline |
| **LOW** | `inout` in interface arrays | I²C chapter 8 | No — advanced only |

---

## PART B — I²C Design Course: Full Curriculum

### Protocol Quick Reference

```
I²C Bus Wires:
  SDA — Serial Data  (open-drain, bidirectional)
  SCL — Serial Clock (open-drain, master generates, slave can stretch)

Speed Grades:
  Standard Mode (Sm)  — 100 kbps
  Fast Mode (Fm)      — 400 kbps
  Fast-Mode Plus (Fm+)— 1 Mbps
  High-Speed (Hs)     — 3.4 Mbps  (needs special current-source master)

Transaction Frame:
  [START] [ADDR 7-bit] [R/W] [ACK] [DATA byte] [ACK] ... [STOP or RESTART]

Conditions:
  START:        SDA falls while SCL is HIGH
  STOP:         SDA rises  while SCL is HIGH
  DATA:         SDA changes only when SCL is LOW
  ACK:          Receiver pulls SDA LOW during the 9th SCL pulse
  NACK:         Receiver leaves SDA HIGH during the 9th SCL pulse
  RESTART:      START condition without a preceding STOP — keeps bus locked
```

---

### Course Curriculum Table

| # | Module ID | Title | Lessons | Level | Status |
|---|---|---|---|---|---|
| 1 | `i2c1` | I²C Protocol Fundamentals | L1 Bus Anatomy, L2 START/STOP, L3 Bit Timing Generator | beginner | ❌ build |
| 2 | `i2c2` | Baud Rate Engine & SCL Generator | L1 Precision Clock Div, L2 SCL Driver, L3 Clock Stretch Detector | beginner | ❌ |
| 3 | `i2c3` | I²C Master — Write Path | L1 Address Phase, L2 Single-Byte Write, L3 Multi-Byte Write, L4 NAK Handling | intermediate | ❌ |
| 4 | `i2c4` | I²C Master — Read Path | L1 Read Direction Bit, L2 Single-Byte Read, L3 Multi-Byte Read + NACK-to-Stop, L4 Repeated START | intermediate | ❌ |
| 5 | `i2c5` | I²C Slave | L1 Address Decoder, L2 Slave Receiver, L3 Slave Transmitter, L4 Clock Stretcher | intermediate | ❌ |
| 6 | `i2c6` | Register-Map Slave | L1 8-Reg Shadow File, L2 Auto-Increment Address, L3 R/W Register Interface, L4 Portfolio: I²C Sensor Emulator | intermediate | ❌ |
| 7 | `i2c7` | Multi-Master & Advanced Features | L1 Arbitration Detector, L2 Multi-Master Controller, L3 10-bit Addressing, L4 Portfolio: Multi-Master Bus | advanced | ❌ |
| 8 | `i2c8` | Capstone Projects | L1 Portfolio: I²C–SPI Bridge, L2 Portfolio: I²C DMA Controller, L3 Portfolio: I²C EEPROM Controller | advanced | ❌ |

---

## Chapter Content Guide

---

### i2c1 — I²C Protocol Fundamentals
**Level:** beginner  **Icon:** 🔗  **Tier range:** T2 → T3

This chapter introduces the protocol at the signal level. Students implement only combinational
or simple sequential logic — no full FSMs yet. The goal is for students to be able to identify
every bit on a logic analyser trace before writing any controller.

---

#### i2c1 L1 — Bus Anatomy and Waveform Reading (Tier 2)

**New concepts:** open-drain, `inout`, `pullup`, `1'bz`

**Theory highlights:**
- Draw the physical bus: two wires, pull-up resistors, multiple devices
- Explain wire-AND: any device can pull low; no device drives high
- Show the open-drain output pattern in code (NOT the full solution)
- Analogy: "SDA is like a shared whiteboard. Any person can erase (pull low), but no one
  writes in white — the board returns to white (high) on its own."

**Circuit to build:** `i2c_io_cell` — a single open-drain I/O pad model

**Ports:**
```
input  logic tx_en,      // 1 = drive low, 0 = release
input  logic tx_data,    // what to drive when tx_en=1 (only 0 is valid for OD)
inout  wire  sda,        // the actual open-drain wire
output logic rx_data     // what we observe on sda
```

**Logic:**
```systemverilog
assign sda     = (tx_en && !tx_data) ? 1'b0 : 1'bz;
assign rx_data = sda;
```

**Testbench pattern:** Combinational. Instantiate two io_cells on the same wire + a `pullup`.
Drive one low while the other releases → verify wire reads 0.
Drive both released → verify wire reads 1.

**Expected output lines:**
- `PASS  both released: sda=1`
- `PASS  one drives low: sda=0`
- `PASS  both drive low: sda=0`
- `I2C IO cell works!`

---

#### i2c1 L2 — START and STOP Condition Detector (Tier 2)

**New concepts:** detecting SDA edge while SCL is HIGH, combinational vs registered detection

**Theory highlights:**
- A START is not a clock edge — it is a SDA-falling event gated by SCL being HIGH
- A STOP  is a SDA-rising  event gated by SCL being HIGH
- Diagram both conditions on a waveform sketch (use ASCII art in theory)
- Data bits: SDA must be stable while SCL is HIGH — any SDA change while SCL=HIGH is a START or STOP

**Circuit to build:** `i2c_start_stop_det`

**Ports:**
```
input  logic clk, rst,
input  logic sda, scl,
output logic start_det,   // pulses 1 cycle on detection
output logic stop_det
```

**Logic (combinational detect, registered output):**
```systemverilog
// Register previous SDA
always_ff @(posedge clk) sda_prev <= sda;
// START: sda_prev=1, sda=0, scl=1
assign start_det = scl & sda_prev & ~sda;
assign stop_det  = scl & ~sda_prev & sda;
```

**Testbench pattern:** Clocked. Drive SDA/SCL sequences, assert `start_det`/`stop_det`.

**Expected output lines:**
- `PASS  START detected`
- `PASS  STOP detected`
- `PASS  data bit does not trigger START`
- `Condition detector works!`

---

#### i2c1 L3 — Bit Timing Generator (Tier 3)

**New concepts:** four-phase SCL clock (quarter periods), `localparam` for timing

**Theory highlights:**
- I²C needs 4 distinct clock phases per bit: SCL_LO_SETUP, SCL_RISING, SCL_HI_SAMPLE, SCL_FALLING
- This is needed because SDA must be set up before SCL rises, and sampled before SCL falls
- Draw a timing diagram with the 4 phases labelled
- Parameters: `CLK_FREQ`, `I2C_FREQ`, derived `QUART_PERIOD = CLK_FREQ / (4 * I2C_FREQ)`

**Circuit to build:** `i2c_bit_timer`

**Ports:**
```
input  logic clk, rst, enable,
output logic phase_lo_setup,  // SCL LOW, set up SDA now
output logic phase_scl_rise,  // release SCL
output logic phase_hi_sample, // SCL HIGH, sample SDA now
output logic phase_scl_fall   // pull SCL low
```

**Internal:**
```systemverilog
parameter CLK_FREQ  = 50_000_000;
parameter I2C_FREQ  = 100_000;
localparam QPERIOD  = CLK_FREQ / (4 * I2C_FREQ);  // 125 ticks @ 50 MHz / 100 kHz
logic [$clog2(QPERIOD)-1:0] cnt;
logic [1:0] phase;   // 0=LO_SETUP 1=RISE 2=HI_SAMPLE 3=FALL
```

**Testbench pattern:** Clocked. Count how many cycles each phase pulse lasts, verify QPERIOD.

**Expected output lines:**
- `PASS  phase_lo_setup duration correct`
- `PASS  phase_hi_sample duration correct`
- `PASS  SCL period correct`
- `Bit timer works!`

---

### i2c2 — Baud Rate Engine & SCL Generator
**Level:** beginner  **Icon:** ⏱  **Tier range:** T3

This chapter builds the clock generation subsystem that all subsequent chapters depend on.
Students parameterize it so it works at Standard, Fast, and Fast-Plus speeds.

---

#### i2c2 L1 — Precision SCL Clock Divider (Tier 3)

**New concept:** deriving a precise half-period from a fast system clock, 50% duty cycle

**Ports:**
```
input  logic clk, rst, enable,
output logic scl_int   // internal SCL toggle — feeds the SCL driver
```

**Parameters:** `CLK_FREQ = 50_000_000`, `I2C_FREQ = 100_000`
**Derived:** `HALF = CLK_FREQ / (2 * I2C_FREQ) - 1`

**Key RTL pattern:**
```systemverilog
localparam HALF = CLK_FREQ / (2 * I2C_FREQ) - 1;
logic [$clog2(HALF+1)-1:0] cnt;
always_ff @(posedge clk)
  if (rst || !enable)     begin cnt <= '0; scl_int <= 1'b1; end
  else if (cnt == HALF)   begin cnt <= '0; scl_int <= ~scl_int; end
  else                    cnt <= cnt + 1;
```

**Testbench:** Count SCL edges over 1000 system clocks, verify frequency within ±1%.

---

#### i2c2 L2 — SCL Open-Drain Driver (Tier 3)

**New concept:** SCL is also open-drain — must use `1'bz` to release, `0` to pull low

**Ports:**
```
input  logic clk, rst,
input  logic scl_drive_low,   // 1 = pull SCL low
inout  wire  scl,
output logic scl_in           // observe actual SCL (for clock stretch)
```

**Key insight:** Master "drives" SCL high by releasing it (`1'bz`), not by actively driving `1`.

**RTL:**
```systemverilog
assign scl   = scl_drive_low ? 1'b0 : 1'bz;
assign scl_in = scl;
```

**Testbench:** Combine with `pullup`, verify open-drain semantics.

---

#### i2c2 L3 — Clock Stretch Detector (Tier 3)

**New concept:** slave can hold SCL low longer than master's clock period — master must wait

**Ports:**
```
input  logic clk, rst,
input  logic scl_in,          // actual SCL observed on the wire
input  logic scl_expected,    // what master intended SCL to be
output logic stretch_active,  // HIGH while slave is stretching
output logic stretch_timeout  // HIGH if stretch exceeds TIMEOUT cycles
```

**Parameters:** `TIMEOUT = 10_000` (system clock cycles — ~200 µs at 50 MHz)

**State logic:** When `scl_expected==1 && scl_in==0`, slave is stretching. Count timeout cycles.

**Testbench:** Simulate stretch by externally holding scl wire low while master releases.

---

### i2c3 — I²C Master — Write Path
**Level:** intermediate  **Icon:** ✍  **Tier range:** T3 → T4

Students build a real, functional I²C master. This is the first chapter with a multi-state FSM.
The write path is covered first because it is simpler (master controls data direction).

---

#### i2c3 L1 — Address Phase FSM (Tier 3)

**New concept:** 7-bit address + R/W bit shift-out, bit-serial transmission

**Theory highlights:**
- Show the address byte structure: [A6][A5][A4][A3][A2][A1][A0][R/W]
- Address is sent MSB first
- After the 8th bit, master releases SDA and waits for ACK (9th SCL pulse)
- Draw a full state diagram:
  ```
  IDLE → START_COND → SEND_ADDR (8 bits) → WAIT_ACK → [NACK→STOP | ACK→DATA]
  ```

**Circuit to build:** `i2c_addr_phase`

**Ports:**
```
input  logic       clk, rst, start,
input  logic [6:0] addr,
input  logic       rw,           // 0=write, 1=read
inout  wire        sda,
inout  wire        scl,
output logic       addr_done,
output logic       ack_received, // 1 = slave ACKed
output logic       busy
```

**Testbench:** Use a simple slave stub that ACKs address `7'h50`. Verify address byte appears correctly on SDA.

---

#### i2c3 L2 — Single-Byte Write (Tier 3)

**New concept:** Combining address phase + data phase in one FSM

**Theory highlights:**
- After address ACK, master drives 8 data bits MSB-first
- 9th SCL: master releases SDA, samples for slave ACK
- State diagram extends:
  ```
  ... → WAIT_ADDR_ACK → SEND_DATA (8 bits) → WAIT_DATA_ACK → STOP_COND → IDLE
  ```
- First complete I²C transaction!

**Circuit to build:** `i2c_master_write1` (single byte)

**Ports:**
```
input  logic       clk, rst, start,
input  logic [6:0] slave_addr,
input  logic [7:0] data,
inout  wire        sda, scl,
output logic       done, ack_err, busy
```

**Testbench:** Slave stub captures 8-bit data; verify `data==8'hA5` received.

**Expected output lines:**
- `PASS  address byte correct`
- `PASS  data byte 0xA5 received`
- `PASS  ACK detected`
- `Single-byte write works!`

---

#### i2c3 L3 — Multi-Byte Write (Tier 3)

**New concept:** parameterized byte count, internal byte counter, auto-STOP on last byte

**Ports:**
```
input  logic        clk, rst, start,
input  logic [6:0]  slave_addr,
input  logic [7:0]  data[0:7],     // up to 8 bytes
input  logic [3:0]  byte_count,
inout  wire         sda, scl,
output logic        done, ack_err, busy
```

**Key FSM extension:**
- Add `byte_idx` counter: after each data ACK, increment; if `byte_idx == byte_count - 1`, go to STOP
- Theory: explain why many I²C devices auto-increment internal register address on multi-byte write

**Testbench:** Write 4 bytes `{0x10, 0x20, 0x30, 0x40}` to slave `7'h50`. Verify all 4 received.

---

#### i2c3 L4 — NACK Handling and Error Recovery (Tier 4)

**New concept:** NACK from slave is not a crash — master must gracefully stop the transaction

**Theory highlights:**
- Slave NACKs when: busy, wrong address, full buffer, checksum error, end of read
- Master response to NACK: generate STOP, pulse `ack_err`, return to IDLE
- Distinguish "address NACK" (slave doesn't exist) from "data NACK" (buffer full)
- Common mistake: ignoring NACK and continuing to send data — say so explicitly

**Circuit enhancement:** Add `addr_nack` and `data_nack` output flags to the multi-byte master.

**Testbench:** Simulate a slave that NACKs the 3rd data byte. Verify master stops cleanly.

---

### i2c4 — I²C Master — Read Path
**Level:** intermediate  **Icon:** 📖  **Tier range:** T3 → T4

---

#### i2c4 L1 — Direction Bit and Bus Turn-Around (Tier 3)

**New concept:** R/W=1 means master must RELEASE SDA after the address ACK — slave now drives data

**Theory highlights:**
- After address+ACK for a READ, SDA ownership changes from master to slave
- Master must not drive SDA during data bytes — it is now listening
- The "turn-around" is silent: master releases SDA during ACK, slave begins driving
- Draw a waveform showing master releasing SDA and slave picking it up

**Circuit to build:** `i2c_bus_turnaround_demo` — shows SDA direction switch using tx_en signal.

---

#### i2c4 L2 — Single-Byte Read (Tier 3)

**Circuit to build:** `i2c_master_read1`

**Ports:**
```
input  logic       clk, rst, start,
input  logic [6:0] slave_addr,
inout  wire        sda, scl,
output logic [7:0] rx_data,
output logic       rx_valid, ack_err, busy
```

**State diagram:**
```
IDLE → START → ADDR (rw=1) → WAIT_ACK → RX_DATA (8 bits) → SEND_NACK → STOP → IDLE
```

Note: Master sends NACK on the last byte to tell slave "stop, I'm done."

**Testbench:** Slave stub drives `8'hB7` on SDA. Verify `rx_data == 8'hB7`.

---

#### i2c4 L3 — Multi-Byte Read with Master NACK-to-Stop (Tier 4)

**New concept:** Master ACKs all bytes except the last one; last byte gets NACK + STOP

**Theory highlights:**
- ACK from master = "give me more"
- NACK from master = "that was the last byte I wanted — stop sending"
- Off-by-one error is extremely common: students NAK one byte too early. Acknowledge this.

**Ports:**
```
input  logic [3:0]  byte_count,
output logic [7:0]  rx_buf[0:7],
output logic        done
```

**Testbench:** Read 3 bytes from slave. Verify master ACKs bytes 0 and 1, NACKs byte 2.

---

#### i2c4 L4 — Repeated START (Combined Write-then-Read) (Tier 4)

**New concept:** RESTART — a new START condition without a STOP; keeps bus locked

**Theory highlights:**
- Common pattern: write register address (2 bytes), then RESTART, read data
- RESTART vs STOP+START: with RESTART, no other master can steal the bus between the transactions
- Real-world use: reading a specific register from an I²C sensor (EEPROM, IMU, ADC)

**Circuit to build:** `i2c_master_rw_combo`

**Ports:**
```
input  logic [6:0]  slave_addr,
input  logic [7:0]  reg_addr,
input  logic [3:0]  read_count,
output logic [7:0]  rx_buf[0:7],
output logic        done, busy, ack_err
```

**State diagram additions:**
```
... WRITE_REG_ADDR → WAIT_WRITE_ACK → RESTART_COND → ADDR (rw=1) → READ_BYTES → DONE
```

**Testbench:** Write register address `0x10` then read 2 bytes. Verify both transaction phases.

---

### i2c5 — I²C Slave
**Level:** intermediate  **Icon:** 🎧  **Tier range:** T3 → T4

The slave is harder than the master — it cannot control timing and must respond to whatever
the master sends. This chapter is where students move from "controlling the bus" to "reacting to it."

---

#### i2c5 L1 — Address Decoder (Tier 3)

**New concept:** Slave monitors SDA during address phase and compares to its own address

**Theory highlights:**
- Slave does NOT generate SCL — it only samples on SCL rising edges
- Slave compares 7 incoming bits to its configured address
- On the 8th SCL (R/W bit), slave knows whether this is a write or read request
- Slave must respond within one SCL period — no time to think!
- Start detection: watch for START condition, then start counting SCL edges

**Circuit to build:** `i2c_addr_decoder`

**Ports:**
```
input  logic       clk, rst,
input  logic       sda_in, scl_in,
input  logic [6:0] my_addr,
input  logic       start_det,   // from i2c1 L2
output logic       addr_match,
output logic       rw_bit,
output logic       send_ack     // pulse: slave must now drive SDA low for ACK
```

---

#### i2c5 L2 — Slave Receiver (Write from Master) (Tier 3)

**New concept:** slave shift register, 9th clock = ACK generation

**Circuit to build:** `i2c_slave_rx`

**Ports:**
```
input  logic       clk, rst, enable, // enable when addr_match
input  logic       sda_in, scl_in,
output logic [7:0] rx_byte,
output logic       rx_valid,
output logic       sda_oe            // drive SDA low for ACK
```

**Key detail:** Slave drives ACK by asserting `sda_oe` (which connects to the io_cell `tx_en`).

**Testbench:** Master sends `8'h42` to address-matched slave. Verify `rx_byte == 8'h42`.

**Expected output lines:**
- `PASS  slave received 0x42`
- `PASS  ACK generated correctly`
- `Slave receiver works!`

---

#### i2c5 L3 — Slave Transmitter (Read to Master) (Tier 4)

**New concept:** slave drives SDA during data phase; master drives SCL but only observes SDA

**Theory highlights:**
- Slave preloads data BEFORE the 9th SCL pulse (address ACK)
- Slave shifts out 8 bits MSB-first on SDA, changing SDA only when SCL is LOW
- After 8 bits, slave releases SDA and samples the 9th SCL for master's ACK/NACK
- If master NACKs, slave releases SDA and waits for STOP

**Circuit to build:** `i2c_slave_tx`

**Ports:**
```
input  logic [7:0] tx_data,          // data to send
input  logic       tx_load,          // latch tx_data into shift register
input  logic       sda_in, scl_in,
input  logic       enable,
output logic       sda_oe,           // slave drives SDA when this is HIGH
output logic       done, master_nack
```

**Testbench:** Slave sends `8'hD3`, master verifies `rx_data == 8'hD3`.

---

#### i2c5 L4 — Clock Stretching Slave (Tier 4)

**New concept:** slave deliberately holds SCL low to buy time before it can respond

**Theory highlights:**
- Slave pulls SCL low by asserting the `scl_drive_low` signal (open-drain!)
- Use case: slave needs to fetch data from internal memory before the master can read it
- Master's clock stretch detector (from i2c2 L3) handles the other side
- Danger: if slave stretches forever, bus hangs — always have a timeout on both ends

**Circuit to build:** `i2c_slave_with_stretch`

**Ports:** extend `i2c_slave_tx` with:
```
input  logic       need_time,    // 1 = slave not ready
output logic       scl_drive_low // holds SCL low during stretching
```

**State extension:** Add `STRETCH` state before `TX_DATA`: hold SCL low until `need_time` goes LOW.

---

### i2c6 — Register-Map Slave
**Level:** intermediate  **Icon:** 🗂  **Tier range:** T3 → T5

A register-map slave is the most common I²C device: temperature sensors, IMUs, ADCs, EEPROMs.
The slave has an internal address pointer and an array of registers the master can read and write.

---

#### i2c6 L1 — 8-Register Shadow File (Tier 3)

**New concept:** array of registers addressable by index; separate read and write ports

**Circuit to build:** `i2c_regfile`

**Ports:**
```
input  logic       clk, rst,
input  logic [2:0] reg_addr,
input  logic [7:0] wr_data,
input  logic       we,
output logic [7:0] rd_data
```

**Testbench:** Write `8'h55` to register `3'b010`, read it back.

---

#### i2c6 L2 — Auto-Increment Address Pointer (Tier 3)

**New concept:** `reg_ptr` counter that auto-increments after each byte read or written

**Theory highlights:**
- Most I²C devices auto-increment the register pointer on every byte
- First byte from master after address = register address; subsequent bytes = data
- Read transaction: master writes register address (write phase), then RESTART, then reads data
- This allows bulk transfer: write to address 0x00, then send 16 bytes to fill registers 0x00–0x0F

**Circuit enhancement:** Add `reg_ptr` logic to `i2c_regfile`. Auto-increment on each `we` or `re`.

---

#### i2c6 L3 — Full R/W Register Slave Interface (Tier 4)

**New concept:** Combining address decoder + slave RX + slave TX + regfile into one top-level slave

**Circuit to build:** `i2c_reg_slave` (top-level integrating all i2c5 and i2c6 submodules)

**Ports:**
```
input  logic       clk, rst,
inout  wire        sda, scl,
input  logic [6:0] my_addr,
// debug/verification ports:
output logic [7:0] regs_out[0:7]   // read all registers for testbench visibility
```

**Testbench:** Full transaction sequence:
1. Master writes `{0x05, 0xAB, 0xCD}` — sets reg[5]=0xAB, reg[6]=0xCD
2. Master reads reg[5] via RESTART — expects 0xAB
3. Verify via `regs_out`

---

#### i2c6 L4 — Portfolio: I²C Sensor Emulator (Tier 5)

**Spec:** Build a complete I²C-addressable sensor that emulates an 8-channel ADC.

**Register map:**
| Addr | Name | Access | Description |
|---|---|---|---|
| 0x00 | CONFIG | R/W | Conversion rate, channel select |
| 0x01 | STATUS | R | Conversion done flag, overflow |
| 0x02–0x11 | CHANx_L/H | R | 12-bit result per channel (2 bytes each) |
| 0x12 | INT_MASK | R/W | Interrupt enable per channel |

**Ports:**
```
input  logic       clk, rst,
inout  wire        sda, scl,
input  logic [6:0] my_addr,
input  logic [11:0] adc_in[0:7],   // simulated ADC samples from testbench
output logic        irq             // interrupt out (active-low, open-drain)
```

**Tasks checklist:**
- Implement all register map reads
- CONFIG write changes simulated sample rate (fast/slow internal counter)
- STATUS[0] goes high after each sample cycle
- IRQ fires when enabled channel exceeds a threshold stored in a config register
- Tasks: `'🎓 Portfolio piece — push this to your GitHub when complete'`

---

### i2c7 — Multi-Master & Advanced Features
**Level:** advanced  **Icon:** 🔀  **Tier range:** T4 → T5

---

#### i2c7 L1 — Arbitration Detector (Tier 4)

**New concept:** A master loses arbitration when it drives SDA=1 but observes SDA=0

**Theory highlights:**
- In multi-master I²C, two masters can both generate START conditions simultaneously
- During transmission, each master reads back SDA after setting it
- If a master drove HIGH but the bus reads LOW, another master drove LOW → loser backs off
- The winner is the one sending the lower address (lower address = more zeros in the MSBs)
- Losing master must go IDLE immediately without generating STOP

**Circuit to build:** `i2c_arb_detector`

**Ports:**
```
input  logic clk, rst,
input  logic sda_driven,   // what this master intended to drive
input  logic sda_in,       // actual observed SDA
input  logic scl_in,       // only sample on SCL rising edge
output logic arb_lost      // 1 = we lost arbitration
```

**Logic:**
```systemverilog
// On each SCL rising edge: if we drove 1 but see 0, we lost
assign arb_lost = scl_in & sda_driven & ~sda_in;
```

**Testbench:** Two masters simultaneously drive different values on SDA; verify loser asserts `arb_lost`.

---

#### i2c7 L2 — Multi-Master Controller (Tier 4)

**New concept:** Integrating arbitration into the master FSM; back-off and retry

**Theory highlights:**
- Add `arb_lost` input to the master FSM from i2c3
- On `arb_lost`: immediately stop driving SCL and SDA, go to IDLE
- Do NOT generate STOP — the winning master is still in control of the bus
- Retry: after IDLE, wait for bus to go free (no START/activity for a timeout period), then retry

**Circuit to build:** `i2c_mm_master` — extends i2c3's master with arbitration handling

**New FSM states:**
```
... ARB_LOST → WAIT_BUS_FREE (count N cycles of both SDA=1, SCL=1) → IDLE
```

---

#### i2c7 L3 — 10-bit Addressing (Tier 4)

**New concept:** Two-byte address header for devices with 10-bit addresses

**Theory highlights:**
- 7-bit addressing supports 127 devices (some addresses reserved) — enough for simple systems
- 10-bit addressing adds a second address byte and uses a special prefix `11110xx`
- Frame structure:
  ```
  START [11110 A9 A8 0] ACK [A7:A0] ACK [DATA...] STOP
  ```
  For reads: same, but add RESTART + `[11110 A9 A8 1]` ACK before data
- Backwards compatible: 7-bit slaves ignore the 10-bit prefix address

**Circuit to build:** `i2c_master_10bit` — extends i2c_master_read1/write1 with 10-bit mode parameter

**Parameter:** `parameter ADDR_MODE = 7` — set to 10 for 10-bit mode

---

#### i2c7 L4 — Portfolio: Multi-Master I²C Bus Controller (Tier 5)

**Spec:** Build a complete dual-master I²C bus system.

**Architecture:**
```
Master_0 ──┐
            ├── [open-drain SDA/SCL bus] ── Slave_0 (sensor emulator from i2c6 L4)
Master_1 ──┘
```

**Requirements:**
- Both masters can independently initiate transactions
- Arbitration: only one master wins per transaction; loser retries after back-off
- Master 0: writes to slave register map periodically
- Master 1: reads from slave register map periodically
- Both masters handle NACK, arbitration loss, bus timeout
- Verification ports: expose which master is currently driving the bus

**Tasks checklist:**
- Design `i2c_mm_bus_ctrl` top module instantiating both masters and the slave
- Implement deterministic arbitration test: both masters start simultaneously
- Demonstrate loser backs off correctly and retries
- `'🎓 Portfolio piece — push this to your GitHub when complete'`

---

### i2c8 — Capstone Projects
**Level:** advanced  **Icon:** 🏆  **Tier range:** T5 (all portfolio)

---

#### i2c8 L1 — Portfolio: I²C–SPI Protocol Bridge (Tier 5)

**Spec:** A device that appears as an I²C slave to a host CPU, but drives an SPI master to
communicate with SPI-only peripherals (sensors, DACs, ADCs).

**Real-world use case:** Many microcontrollers only have I²C; some sensors only have SPI.
A bridge chip sits between them. This is a real product category (e.g., SC18IS602B, PCA9541).

**Architecture:**
```
[Host CPU] ──I²C SDA/SCL──> [i2c_spi_bridge] ──SPI MOSI/MISO/SCLK/CS──> [SPI Peripheral]
```

**Ports:**
```
input  logic       clk, rst,
inout  wire        sda, scl,          // I2C slave interface
input  logic [6:0] my_addr,
output logic       spi_sclk, spi_mosi, spi_cs_n,  // SPI master outputs
input  logic       spi_miso
```

**Register map (accessed via I²C):**
| Addr | Name | Description |
|---|---|---|
| 0x00 | SPI_CTRL | CPOL, CPHA, clock divider |
| 0x01 | TX_DATA | Byte to send via SPI |
| 0x02 | RX_DATA | Last byte received via SPI |
| 0x03 | STATUS | SPI busy, done flags |
| 0x04 | CS_CTRL | Which CS_N to assert |

**Tasks checklist:**
- I²C slave uses register map from i2c6
- Write to TX_DATA → triggers SPI transaction → result appears in RX_DATA
- STATUS[0] = busy while SPI transaction is in progress
- Reuse spi_master module from the SPI course (demonstrate cross-course module reuse)
- `'🎓 Portfolio piece — push this to your GitHub when complete'`

---

#### i2c8 L2 — Portfolio: I²C DMA Controller (Tier 5)

**Spec:** A DMA engine that can autonomously burst-read N bytes from an I²C device and
write them into a memory-mapped SRAM without CPU intervention.

**Real-world use case:** Streaming sensor data (IMU, camera) to memory at high rate.
This is how embedded Linux SoCs talk to I²C sensors.

**Architecture:**
```
[Config Registers] → [DMA Engine FSM] → [I²C Master] → [I²C Sensor]
                                      ↓
                                  [SRAM write port]
```

**Ports:**
```
input  logic        clk, rst,
// Config (written by CPU before DMA starts):
input  logic [6:0]  slave_addr,
input  logic [7:0]  reg_addr,
input  logic [7:0]  burst_len,
input  logic [15:0] mem_base,
input  logic        start,
// SRAM write port:
output logic [15:0] mem_addr,
output logic [7:0]  mem_wdata,
output logic        mem_we,
// Status:
output logic        done, busy, err,
// I2C bus:
inout  wire         sda, scl
```

**Tasks checklist:**
- DMA FSM: IDLE → WRITE_REG_ADDR → RESTART → READ_BURST → FILL_SRAM → DONE
- Each byte received from I²C is written to `mem_base + byte_index`
- Error handling: NACK from slave → assert `err`, abort transfer
- `'🎓 Portfolio piece — push this to your GitHub when complete'`

---

#### i2c8 L3 — Portfolio: I²C EEPROM Controller (Tier 5)

**Spec:** Implement a complete controller for a 24-series I²C EEPROM
(e.g., 24C02 / 24C256), including page-write optimization and read-with-polling.

**Real-world use case:** EEPROMs are on nearly every PCB for storing calibration data,
MAC addresses, and configuration. Understanding page-write timing and ACK polling is a
real VLSI interview topic.

**Key EEPROM behaviors to implement:**

| Feature | Description |
|---|---|
| Page write | Burst up to 64 bytes in one transaction (faster than byte-by-byte) |
| Write cycle | After STOP, EEPROM is busy for up to 5ms — does not ACK |
| ACK polling | Master repeatedly attempts address-write; EEPROM NACKs until ready, then ACKs |
| Sequential read | Auto-increment address, read across page boundary |
| Word address | 16-bit internal address sent as two bytes (for >256-byte EEPROMs) |

**Ports:**
```
input  logic        clk, rst,
// Command interface:
input  logic        cmd_valid,
input  logic        cmd_is_read,     // 0=write, 1=read
input  logic [15:0] cmd_addr,        // EEPROM word address
input  logic [7:0]  cmd_wdata,
output logic [7:0]  cmd_rdata,
output logic        cmd_ready, cmd_rvalid, cmd_err,
// I2C:
inout  wire         sda, scl,
// Device select (A2 A1 A0 pins on 24Cxx):
input  logic [2:0]  dev_sel
```

**Tasks checklist:**
- Implement byte write with post-write ACK polling (3ms typical, 5ms worst case)
- Implement page write: collect up to 64 bytes before generating STOP
- Implement sequential read with 16-bit address
- ACK polling loop: retry address-write with `TIMEOUT` iteration limit
- Demonstrate reading back what was written
- `'🎓 I²C Protocol Design certificate unlocked — complete i2c1 through i2c8 to claim it'`
- `'🎓 Portfolio piece — push this to your GitHub when complete'`

---

## Certification Milestone

| Certificate | Trigger | Task string |
|---|---|---|
| I²C Protocol Designer | i2c8 L3 | `'🎓 I²C Protocol Design certificate unlocked — complete i2c1 through i2c8 to claim it'` |

---

## Tier Assignment per Chapter

| Chapter | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| i2c1 Protocol Fundamentals | T2 | T2 | T3 | — |
| i2c2 Baud Rate Engine | T3 | T3 | T3 | — |
| i2c3 Master Write | T3 | T3 | T3 | T4 |
| i2c4 Master Read | T3 | T3 | T4 | T4 |
| i2c5 Slave | T3 | T3 | T4 | T4 |
| i2c6 Register-Map Slave | T3 | T3 | T4 | T5 |
| i2c7 Multi-Master | T4 | T4 | T4 | T5 |
| i2c8 Capstone | T5 | T5 | T5 | — |

---

## SystemVerilog Constructs Introduced Per Chapter

| Chapter | New SV Construct |
|---|---|
| i2c1 | `inout`, `1'bz`, `pullup`, open-drain assign |
| i2c2 | `localparam` timing, `$clog2` counter width |
| i2c3 | Shift register + bit counter FSM, `unique case` with 8+ states |
| i2c4 | Conditional NACK generation, combined write-read FSM |
| i2c5 | Slave perspective FSM (no SCL control), `sda_oe` pattern |
| i2c6 | 2D register file, auto-increment pointer |
| i2c7 | Arbitration combinational detect, back-off timer, retry logic |
| i2c8 | Multi-module top-level integration, cross-protocol reuse |

---

## Testbench Patterns Specific to I²C

### Slave Stub (for testing master chapters)
```systemverilog
// Minimal slave: ACKs address 7'h50, receives or drives one byte
module i2c_slave_stub (inout wire sda, inout wire scl);
  pullup (sda); pullup (scl);     // inside TB, not in DUT
  logic sda_drive;
  assign sda = sda_drive ? 1'b0 : 1'bz;
  // ... detect START, count SCL edges, ACK, capture/drive data
endmodule
```

### Master Stub (for testing slave chapters)
```systemverilog
// Minimal master: generates SCL, drives SDA byte-by-byte
// Use direct task-level stimulus — no FSM needed in the stub
task send_byte(input [7:0] b);
  // shift b[7:0] MSB first on SDA, toggle SCL each bit
endtask
```

### Open-Drain Testbench Wiring (mandatory for all I²C TB)
```systemverilog
wire sda, scl;
pullup p_sda(sda);
pullup p_scl(scl);
// Never assign sda/scl directly — only drive via 1'bz / 1'b0
```

---

## Voice and Tone Notes for I²C Chapters

- **Acknowledge the complexity honestly:** "I²C looks like two wires, but it hides more design
  challenges than any other serial protocol in this course. Take your time."
- **Use the logic analyser metaphor:** In every theory section, tell students they can decode the
  waveforms on a real Saleae or DSLogic — grounding the lesson in real-world hardware is motivating.
- **Name-drop real devices:** 24C256 EEPROM, MPU-6050 IMU, TMP102 temperature sensor.
  Students learn faster when they know they are building something that controls real silicon.
- **Clock stretching warning:** "Every I²C slave spec sheet says whether it stretches. Ignoring
  this in your master will cause rare, hard-to-reproduce bugs. Read the datasheet."
- **Multi-master is hard — say so:** "Multi-master I²C is rare in practice and genuinely
  difficult to get right. If this chapter breaks your brain the first time, that is expected."

---

## Topics Intentionally Deferred (future i2c testbench course)

The following belong in a separate `i2ctb` course (similar to `spitb`):

- Formal verification of arbitration correctness
- Coverage-driven testing of all NACK scenarios
- UVM agent for I²C bus
- Protocol-aware assertions (concurrent SVA for ACK timing)
- Scoreboard for register-map transactions
- Fault injection: stuck-at-low SDA, glitch on SCL, stretched beyond timeout

---

## Registration Checklist (when building)

```
[ ] Create static/lessons/modules/i2cN.js
[ ] Add <script src="/lessons/modules/i2cN.js"></script> to index.html (before curriculum.js)
[ ] Add 'i2cN' to curriculum.js CURRICULUM array
[ ] Add { id: 'i2c', modules: ['i2c1',...] } to courses.js window.COURSES
[ ] Update CLAUDE.md with new course table entry
[ ] Update this file: mark lesson done after push
[ ] Hard refresh browser after push to clear cache
```

---

*Document version 1.0 — June 2026*  
*8 chapters · 28 lessons · beginner through advanced · design-side only*
