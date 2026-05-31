# SPI Testbench Reference — Complete Verification Plan

## Purpose

This document is the authoritative verification reference for the SPI Protocol Learning
Series (spi1–spi5). It covers the verification strategy, coverage model, testbench
architecture, reusable component library, and every test case for all 14 modules.

Use this document to:
- Understand what each module must do before writing a single line of testbench code
- Pick up pre-written task templates and adapt them
- Know which corner cases are easy to miss and why
- Audit an existing testbench for gaps

**Branch:** `claude/spi-protocol-learning-series-wdbNg` / `develop`  
**Simulator:** Verilator 5.020 (`--no-timing` mode)  
**Language:** SystemVerilog testbenches, `logic` only

---

## 1. DUT Inventory

| Module | File | Chapter | Tier | Type |
|---|---|---|---|---|
| `sipo_shift_reg` | spi1.js L1 | spi1 | T1 | Slave RX building block |
| `piso_shift_reg` | spi1.js L2 | spi1 | T2 | Master TX building block |
| `spi_byte_counter` | spi1.js L3 | spi1 | T3 | Frame / bit counter |
| `spi_clkdiv` | spi2.js L1 | spi2 | T2 | SCLK generator |
| `spi_master` | spi2.js L2 | spi2 | T3 | 8-bit Mode 0 master |
| `spi_master_16` | spi2.js L3 | spi2 | T3 | 16-bit burst master |
| `spi_master_param` | spi2.js L4 | spi2 | T5 | Parameterized master (all modes) |
| `spi_slave_rx` | spi3.js L1 | spi3 | T3 | 8-bit receive-only slave |
| `spi_slave_fd` | spi3.js L2 | spi3 | T4 | Full-duplex slave |
| `spi_loopback` | spi3.js L3 | spi3 | T5 | Master + slave integrated |
| `spi_regfile` | spi4.js L1 | spi4 | T4 | SPI register file slave |
| `spi_adc_slave` | spi5.js L1 | spi5 | T4 | ADC emulator slave |
| `spi_flash_slave` | spi5.js L2 | spi5 | T5 | Flash memory emulator |
| `spi_bus_ctrl` | spi5.js L3 | spi5 | T5 | Multi-peripheral bus controller |

---

## 2. Verification Methodology

### 2.1 Strategy

All modules use **directed testing** — manually crafted stimulus vectors targeting
specific behaviours. This is appropriate for Verilator's `--no-timing` mode and for
the educational context of this series.

The verification flow for every module:

```
1. Reset sequence
2. Normal operation (golden path)
3. Boundary conditions
4. Corner cases and error injection
5. Back-to-back transactions
6. CS_N deassert mid-transfer (where applicable)
```

### 2.2 Simulator constraints (Verilator 5.020)

These rules apply to every testbench in this series. Violating them causes silent
simulation failures or compile errors.

| Constraint | Correct | Wrong |
|---|---|---|
| Signal type | `logic` | `reg`, `wire` |
| Sequential block | `always_ff @(posedge clk)` | `always @(posedge clk)` |
| Combinational block | `always_comb` or `assign` | `always @(*)` |
| Module name | `tb` | anything else |
| First line | `` `timescale 1ns/1ps `` | missing |
| Comparison | `===` for 4-state | `==` may pass X through |
| Post-clock sample | `@(posedge clk); #1;` | `#5;` without clock |
| Loop in testbench | `repeat(N) @(posedge clk);` | `for (int i=0; i<N; i++)` |
| Increment | `x = x + 1` | `x++` |
| Tri-state | `1'b0` when idle | `1'bz` |

### 2.3 Clock setup convention

All testbenches use one of two clock setups:

```systemverilog
// Fast system clock (slave testbenches — needs room between SCLK edges)
logic clk = 0;
always #2 clk = ~clk;   // 250 MHz, 4 ns period

// Standard clock (master testbenches)
logic clk = 0;
always #5 clk = ~clk;   // 100 MHz, 10 ns period
```

### 2.4 Reset sequence

Every testbench starts with:

```systemverilog
rst = 1;
repeat(2) @(posedge clk); #1;
rst = 0;
```

Two-cycle reset ensures all flip-flops initialize cleanly before any stimulus.

---

## 3. Coverage Model

### 3.1 Functional coverage goals per module

Each module has a coverage checklist. A testbench is not complete until every item
is exercised.

#### sipo_shift_reg
- [ ] Reset clears all 8 bits
- [ ] Single bit shift (serial_in=1 into all-zero register)
- [ ] All-ones byte received correctly (0xFF)
- [ ] Known pattern 0xA5 (1010_0101) received correctly
- [ ] Back-to-back bytes without reset between them
- [ ] Reset mid-shift (partial byte, then reset, then new byte)

#### piso_shift_reg
- [ ] Load captures full byte on rising edge
- [ ] 8 shifts produce exactly the loaded value on serial_out, MSB first
- [ ] Reset clears shift register
- [ ] Load immediately followed by shift (load=1 one cycle, then load=0)
- [ ] Re-load during a shift sequence (interrupt shift with new load)
- [ ] serial_out = 0 after reset

#### spi_byte_counter
- [ ] cs_n=1 holds bit_idx at 0
- [ ] 7 SCLK pulses → bit_idx=7
- [ ] 8th SCLK pulse → byte_done=1 for exactly one system clock
- [ ] byte_done returns to 0 the next cycle
- [ ] cs_n deassert resets bit_idx to 0
- [ ] Two back-to-back frames count correctly
- [ ] SCLK pulse while cs_n=1 has no effect

#### spi_clkdiv
- [ ] 8 rising edges in 64 system clocks
- [ ] 8 falling edges in 64 system clocks
- [ ] sclk_rise and sclk_fall never both 1 simultaneously
- [ ] sclk idles LOW after reset
- [ ] sclk_rise fires exactly 1 system clock wide
- [ ] sclk_fall fires exactly 1 system clock wide

#### spi_master
- [ ] Single transfer: tx_data sent correctly on MOSI
- [ ] Single transfer: MISO received correctly in rx_data
- [ ] busy asserts during transfer, deasserts at done
- [ ] cs_n asserts at start, deasserts at done
- [ ] done pulses for exactly one clock
- [ ] Back-to-back transfers
- [ ] MISO=0xFF received correctly
- [ ] MOSI verified against slave model (not just rx_data)

#### spi_master_16
- [ ] cs_n stays low for all 16 SCLK cycles
- [ ] tx_word[15:8] (high byte) transmitted first
- [ ] tx_word[7:0] (low byte) transmitted second
- [ ] 16-bit rx_word assembled correctly
- [ ] done fires after bit 15, not bit 7

#### spi_master_param
- [ ] Mode 0: CPOL=0 CPHA=0 — sclk idles LOW, sample on rise
- [ ] Mode 1: CPOL=0 CPHA=1 — sclk idles LOW, sample on fall
- [ ] Mode 2: CPOL=1 CPHA=0 — sclk idles HIGH, sample on fall
- [ ] Mode 3: CPOL=1 CPHA=1 — sclk idles HIGH, sample on rise
- [ ] MISO=MOSI loopback roundtrip correct for each mode
- [ ] N_BITS=8 and N_BITS=16 both work

#### spi_slave_rx
- [ ] cs_n=1 ignores SCLK edges
- [ ] 8 bits received → rx_valid pulse, rx_data correct
- [ ] rx_valid is exactly 1 clock wide
- [ ] cs_n deassert during transfer resets counter
- [ ] Back-to-back bytes (cs_n toggles between)
- [ ] First byte after reset received correctly

#### spi_slave_fd
- [ ] tx_data pre-loaded on cs_n_fall
- [ ] MISO shifts out tx_data MSB first
- [ ] RX and TX happen simultaneously on same SCLK
- [ ] MISO = 0 when cs_n = 1
- [ ] Two transfers: MISO is independent each time (tx_data can change)
- [ ] rx_valid fires on 8th rising SCLK edge

#### spi_loopback
- [ ] rx_m === tx_s after transfer
- [ ] rx_s === tx_m after transfer
- [ ] Two transfers with different data
- [ ] busy asserts during transfer
- [ ] done fires at correct time

#### spi_regfile
- [ ] Write to each of 8 registers (addr 0–7)
- [ ] Read back each written register
- [ ] Read before write returns 0 (reset state)
- [ ] wr_valid pulses on write completion only
- [ ] wr_addr and wr_data correct when wr_valid fires
- [ ] Read does not trigger wr_valid
- [ ] Two writes to different addresses, read back both

#### spi_adc_slave
- [ ] adc_val captured on cs_n_fall, not sclk
- [ ] adc_val change during transfer does not corrupt current output
- [ ] MISO correctly shifts adc_val MSB first
- [ ] MISO = 0 when cs_n = 1
- [ ] Back-to-back reads with different adc_val

#### spi_flash_slave
- [ ] WRITE command stores byte at address
- [ ] READ command returns stored byte
- [ ] READ_STATUS returns 0x00
- [ ] Write addr 0 and addr 15 (boundary addresses)
- [ ] Overwrite same address with new value, read back new value
- [ ] wr_valid fires on WRITE completion, not READ
- [ ] READ does not corrupt the stored value

#### spi_bus_ctrl
- [ ] dev_sel=0 asserts cs0_n only; cs1_n and cs2_n stay HIGH
- [ ] dev_sel=1 asserts cs1_n only
- [ ] dev_sel=2 asserts cs2_n only
- [ ] MISO from selected slave reaches master rx_data
- [ ] MISO from non-selected slaves ignored
- [ ] dev_sel change between transfers takes effect next transfer
- [ ] dev_sel change during transfer does not corrupt current transfer

---

## 4. Testbench Architecture

### 4.1 Template structure

Every testbench follows this structure:

```systemverilog
`timescale 1ns/1ps
module tb;

  // ── 1. Clock ──────────────────────────────────────────────────────────
  logic clk = 0;
  always #5 clk = ~clk;

  // ── 2. DUT signals ────────────────────────────────────────────────────
  logic rst, ...;
  DUT_NAME dut (.clk(clk), .rst(rst), ...);

  // ── 3. Slave / master model (if needed) ───────────────────────────────
  // (edge detection, shift register model, MISO driver)

  // ── 4. Reusable tasks ─────────────────────────────────────────────────
  task automatic task_name(...); ... endtask

  // ── 5. Test sequence ──────────────────────────────────────────────────
  initial begin
    // reset
    // test group 1: golden path
    // test group 2: boundary
    // test group 3: corner cases
    $display("MODULE works!");
    $finish;
  end

endmodule
```

### 4.2 Slave model template

Used in any testbench where the DUT is a master and needs a responding slave:

```systemverilog
// ── Slave model ──────────────────────────────────────────────────────────
logic [7:0] slave_tx;
logic       sclk_prev, cs_n_prev;
always_ff @(posedge clk) begin
  sclk_prev <= sclk;
  cs_n_prev <= cs_n;
end
logic sclk_rise_det, sclk_fall_det, cs_n_fall_det;
assign sclk_rise_det = sclk  & ~sclk_prev;
assign sclk_fall_det = ~sclk &  sclk_prev;
assign cs_n_fall_det = ~cs_n &  cs_n_prev;

always_ff @(posedge clk) begin
  if (cs_n_fall_det)  slave_tx <= 8'hC3;         // preload response
  else if (sclk_fall_det) slave_tx <= {slave_tx[6:0], 1'b0};
end
assign miso = cs_n ? 1'b0 : slave_tx[7];
```

### 4.3 MOSI capture template

Used when you need to verify what the master actually put on MOSI:

```systemverilog
logic [7:0] mosi_captured;
logic [2:0] mosi_bit;
always_ff @(posedge clk) begin
  if (cs_n_fall_det)  mosi_bit <= 3'd7;
  else if (sclk_rise_det) begin
    mosi_captured[mosi_bit] <= mosi;
    mosi_bit <= mosi_bit - 1;
  end
end
```

### 4.4 Transfer wait pattern

Never use `for` loops with `return`. Always use `repeat` then check:

```systemverilog
task automatic do_xfer(input logic [7:0] tx);
  tx_data = tx; start = 1;
  @(posedge clk); #1; start = 0;
  repeat(100) @(posedge clk); #1;   // 8 bits × 4 phases × 3 = ~96 cycles; 100 is safe
endtask
```

For 16-bit: `repeat(200)`. For flash (3-byte): `repeat(400)`.

### 4.5 SPI bus driver tasks

These are the fundamental building blocks. Copy-paste into any testbench.

#### send8 — drive 8 bits MSB-first on MOSI

```systemverilog
task automatic send8(input logic [7:0] d);
  mosi=d[7]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[6]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[5]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[4]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[3]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[2]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[1]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi=d[0]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
endtask
```

#### recv8 — capture 8 MISO bits MSB-first

```systemverilog
task automatic recv8(output logic [7:0] d);
  mosi=0;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[7]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[6]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[5]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[4]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[3]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[2]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[1]=miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[0]=miso;
endtask
```

#### spi_frame — wrap send8/recv8 in CS_N

```systemverilog
task automatic spi_write_frame(input logic [7:0] d);
  cs_n=0; repeat(2) @(posedge clk); #1;
  send8(d);
  sclk=0; repeat(2) @(posedge clk); #1;
  cs_n=1; repeat(4) @(posedge clk); #1;
endtask

task automatic spi_read_frame(output logic [7:0] d);
  cs_n=0; repeat(2) @(posedge clk); #1;
  recv8(d);
  sclk=0; repeat(2) @(posedge clk); #1;
  cs_n=1; repeat(4) @(posedge clk); #1;
endtask
```

#### spi_xfer — simultaneous send + receive (full-duplex)

```systemverilog
task automatic spi_xfer(input logic [7:0] tx, output logic [7:0] rx);
  cs_n=0; repeat(2) @(posedge clk); #1;
  // bit 7
  mosi=tx[7]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[7]=miso;
  // bit 6
  mosi=tx[6]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[6]=miso;
  // bit 5
  mosi=tx[5]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[5]=miso;
  // bit 4
  mosi=tx[4]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[4]=miso;
  // bit 3
  mosi=tx[3]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[3]=miso;
  // bit 2
  mosi=tx[2]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[2]=miso;
  // bit 1
  mosi=tx[1]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[1]=miso;
  // bit 0
  mosi=tx[0]; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1; rx[0]=miso;
  sclk=0; repeat(2) @(posedge clk); #1;
  cs_n=1; repeat(4) @(posedge clk); #1;
endtask
```

#### check helper macro pattern

```systemverilog
task automatic check8(input logic [7:0] got, exp, input string label);
  if (got === exp)
    $display("PASS  %s got=0x%02h", label, got);
  else
    $display("FAIL  %s got=0x%02h expected=0x%02h", label, got, exp);
endtask
```

---

## 5. Complete Test Cases — Module by Module

---

### 5.1 sipo_shift_reg

**DUT ports:** `clk, rst, serial_in → data_out[7:0]`

#### TC-SIPO-01: Reset clears register

```
Action:   rst=1 for 2 clocks, rst=0
Verify:   data_out === 8'h00 immediately after rst deasserts
```

#### TC-SIPO-02: Shift in 0xA5 (1010_0101)

```
Action:   send bits 1,0,1,0,0,1,0,1 on serial_in (MSB first), one per clock
Verify:   after 8th clock, data_out === 8'hA5
```

#### TC-SIPO-03: Shift in 0xFF

```
Action:   serial_in=1 for 8 consecutive clocks
Verify:   data_out === 8'hFF
```

#### TC-SIPO-04: Shift in 0x00

```
Action:   serial_in=0 for 8 consecutive clocks
Verify:   data_out === 8'h00
```

#### TC-SIPO-05: Back-to-back bytes, no reset

```
Action:   send 0xA5 (8 clocks), then immediately send 0x3C (8 clocks)
Verify:   data_out === 8'hA5 after first 8; data_out === 8'h3C after second 8
```

#### TC-SIPO-06: Reset mid-shift

```
Action:   send 4 bits of 0xA5, then assert rst=1 for 1 clock, rst=0
          then send complete 0x37
Verify:   data_out === 8'h37 (reset wiped the partial byte)
```

#### TC-SIPO-07: Bit-by-bit trace for 0xA5

```
Verify at each clock:
  after bit 7 (1): data_out = 8'b0000_0001
  after bit 6 (0): data_out = 8'b0000_0010
  after bit 5 (1): data_out = 8'b0000_0101
  after bit 4 (0): data_out = 8'b0000_1010
  after bit 3 (0): data_out = 8'b0001_0100
  after bit 2 (1): data_out = 8'b0010_1001
  after bit 1 (0): data_out = 8'b0101_0010
  after bit 0 (1): data_out = 8'b1010_0101 = 0xA5
```

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, serial_in;
  logic [7:0] data_out;

  sipo_shift_reg dut (.clk(clk), .rst(rst), .serial_in(serial_in), .data_out(data_out));

  task automatic send_byte(input logic [7:0] data);
    serial_in=data[7]; @(posedge clk); #1;
    serial_in=data[6]; @(posedge clk); #1;
    serial_in=data[5]; @(posedge clk); #1;
    serial_in=data[4]; @(posedge clk); #1;
    serial_in=data[3]; @(posedge clk); #1;
    serial_in=data[2]; @(posedge clk); #1;
    serial_in=data[1]; @(posedge clk); #1;
    serial_in=data[0]; @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SIPO Full Test ===");
    rst=1; serial_in=0; repeat(2) @(posedge clk); #1; rst=0;

    // TC-SIPO-01
    if (data_out===8'h00)
      $display("PASS  TC-SIPO-01  reset clears register");
    else
      $display("FAIL  TC-SIPO-01  data_out=0x%02h expected 0x00", data_out);

    // TC-SIPO-02
    send_byte(8'hA5);
    if (data_out===8'hA5)
      $display("PASS  TC-SIPO-02  received 0xA5");
    else
      $display("FAIL  TC-SIPO-02  data_out=0x%02h expected 0xA5", data_out);

    // TC-SIPO-03
    send_byte(8'hFF);
    if (data_out===8'hFF)
      $display("PASS  TC-SIPO-03  received 0xFF");
    else
      $display("FAIL  TC-SIPO-03  data_out=0x%02h expected 0xFF", data_out);

    // TC-SIPO-05  back-to-back
    send_byte(8'hA5);
    send_byte(8'h3C);
    if (data_out===8'h3C)
      $display("PASS  TC-SIPO-05  back-to-back 0x3C correct");
    else
      $display("FAIL  TC-SIPO-05  data_out=0x%02h expected 0x3C", data_out);

    // TC-SIPO-06  reset mid-shift
    serial_in=1; repeat(4) @(posedge clk); #1;
    rst=1; @(posedge clk); #1; rst=0;
    send_byte(8'h37);
    if (data_out===8'h37)
      $display("PASS  TC-SIPO-06  reset mid-shift, then 0x37");
    else
      $display("FAIL  TC-SIPO-06  data_out=0x%02h expected 0x37", data_out);

    $display("SIPO all tests done.");
    $finish;
  end
endmodule
```

---

### 5.2 piso_shift_reg

**DUT ports:** `clk, rst, load, data_in[7:0] → serial_out`

#### TC-PISO-01: Load then shift out 0xA5

```
Action:   data_in=0xA5, load=1 for 1 clock; then load=0 for 8 clocks
          capture serial_out each clock into recv[7:0]
Verify:   recv === 8'hA5
```

#### TC-PISO-02: Load then shift out 0x3C

```
Same procedure with data_in=0x3C
Verify:   recv === 8'h3C
```

#### TC-PISO-03: Reset clears serial_out

```
Action:   load=1, data_in=0xFF; then rst=1 for 1 clock, rst=0
Verify:   serial_out === 1'b0 immediately
```

#### TC-PISO-04: Re-load during shift sequence

```
Action:   load 0xA5, shift 4 clocks, then load 0x3C, shift 8 clocks
Verify:   recv after second sequence === 8'h3C (not corrupted by partial first)
```

#### TC-PISO-05: MSB-first order verification

```
Action:   data_in=8'b1100_0011 (0xC3), load=1, then 8 shift clocks
Capture:  serial_out at each of the 8 clock cycles
Verify:   sequence is exactly 1,1,0,0,0,0,1,1 (MSB first)
```

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, load;
  logic [7:0] data_in;
  logic       serial_out;
  logic [7:0] captured;

  piso_shift_reg dut (.clk(clk), .rst(rst), .load(load),
                      .data_in(data_in), .serial_out(serial_out));

  task automatic load_and_capture(input logic [7:0] d, output logic [7:0] r);
    data_in=d; load=1; @(posedge clk); #1; load=0;
    r[7]=serial_out; @(posedge clk); #1;
    r[6]=serial_out; @(posedge clk); #1;
    r[5]=serial_out; @(posedge clk); #1;
    r[4]=serial_out; @(posedge clk); #1;
    r[3]=serial_out; @(posedge clk); #1;
    r[2]=serial_out; @(posedge clk); #1;
    r[1]=serial_out; @(posedge clk); #1;
    r[0]=serial_out; @(posedge clk); #1;
  endtask

  initial begin
    $display("=== PISO Full Test ===");
    rst=1; load=0; data_in=0; repeat(2) @(posedge clk); #1; rst=0;

    // TC-PISO-01
    load_and_capture(8'hA5, captured);
    if (captured===8'hA5)
      $display("PASS  TC-PISO-01  shifted out 0xA5 correctly");
    else
      $display("FAIL  TC-PISO-01  captured=0x%02h expected 0xA5", captured);

    // TC-PISO-02
    load_and_capture(8'h3C, captured);
    if (captured===8'h3C)
      $display("PASS  TC-PISO-02  shifted out 0x3C correctly");
    else
      $display("FAIL  TC-PISO-02  captured=0x%02h expected 0x3C", captured);

    // TC-PISO-03
    data_in=8'hFF; load=1; @(posedge clk); #1; load=0;
    rst=1; @(posedge clk); #1; rst=0;
    if (serial_out===1'b0)
      $display("PASS  TC-PISO-03  reset clears serial_out");
    else
      $display("FAIL  TC-PISO-03  serial_out=%0b expected 0", serial_out);

    // TC-PISO-04  re-load mid-shift
    data_in=8'hA5; load=1; @(posedge clk); #1; load=0;
    repeat(4) @(posedge clk); #1;   // shift 4 bits
    load_and_capture(8'h3C, captured);
    if (captured===8'h3C)
      $display("PASS  TC-PISO-04  re-load during shift returns correct value");
    else
      $display("FAIL  TC-PISO-04  captured=0x%02h expected 0x3C", captured);

    // TC-PISO-05  MSB-first order check for 0xC3 = 1100_0011
    load_and_capture(8'hC3, captured);
    if (captured===8'hC3)
      $display("PASS  TC-PISO-05  MSB-first order correct for 0xC3");
    else
      $display("FAIL  TC-PISO-05  captured=0x%02h expected 0xC3", captured);

    $display("PISO all tests done.");
    $finish;
  end
endmodule
```

---

### 5.3 spi_byte_counter

**DUT ports:** `clk, rst, cs_n, sclk → bit_idx[2:0], byte_done`

#### TC-BCNT-01: SCLK ignored when cs_n=1

```
Action:   cs_n=1, send 8 SCLK pulses
Verify:   bit_idx === 0 throughout
```

#### TC-BCNT-02: 7 pulses → bit_idx reaches 7

```
Action:   cs_n=0, send 7 SCLK pulses
Verify:   bit_idx === 7, byte_done === 0
```

#### TC-BCNT-03: 8th pulse fires byte_done for exactly 1 clock

```
Action:   while still in frame, raise sclk=1
Verify:   one clock after sclk_rise: byte_done===1
          two clocks after: byte_done===0
```

#### TC-BCNT-04: bit_idx resets to 0 after byte_done

```
Verify:   bit_idx===0 when byte_done fires
```

#### TC-BCNT-05: cs_n deassert resets counter

```
Action:   send 5 pulses, deassert cs_n=1
Verify:   bit_idx===0 within 2 system clocks
```

#### TC-BCNT-06: Two consecutive frames

```
Action:   frame 1: 8 pulses, cs_n=1, cs_n=0; frame 2: 8 pulses
Verify:   byte_done fires once in frame 1, once in frame 2, not in between
```

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk;
  logic [2:0] bit_idx;
  logic       byte_done;

  spi_byte_counter dut (.clk(clk), .rst(rst), .cs_n(cs_n),
                        .sclk(sclk), .bit_idx(bit_idx), .byte_done(byte_done));

  task automatic clk_pulse;
    sclk=1; repeat(4) @(posedge clk); #1;
    sclk=0; repeat(4) @(posedge clk); #1;
  endtask

  logic [3:0] done_count;
  always_ff @(posedge clk) begin
    if (byte_done) done_count = done_count + 1;
  end

  initial begin
    $display("=== SPI Byte Counter Full Test ===");
    rst=1; cs_n=1; sclk=0; done_count=0;
    repeat(4) @(posedge clk); #1; rst=0;

    // TC-BCNT-01
    repeat(8) clk_pulse();
    if (bit_idx===3'd0)
      $display("PASS  TC-BCNT-01  SCLK ignored when cs_n=1");
    else
      $display("FAIL  TC-BCNT-01  bit_idx=%0d expected 0", bit_idx);

    // TC-BCNT-02
    cs_n=0;
    repeat(7) clk_pulse();
    if (bit_idx===3'd7)
      $display("PASS  TC-BCNT-02  bit_idx=7 after 7 pulses");
    else
      $display("FAIL  TC-BCNT-02  bit_idx=%0d expected 7", bit_idx);

    // TC-BCNT-03 and TC-BCNT-04
    sclk=1; @(posedge clk); #1;
    if (byte_done===1'b1 && bit_idx===3'd0)
      $display("PASS  TC-BCNT-03/04  byte_done=1, bit_idx reset to 0");
    else
      $display("FAIL  TC-BCNT-03/04  byte_done=%0b bit_idx=%0d", byte_done, bit_idx);
    @(posedge clk); #1;
    if (byte_done===1'b0)
      $display("PASS  TC-BCNT-03  byte_done cleared next clock");
    else
      $display("FAIL  TC-BCNT-03  byte_done still high");
    repeat(3) @(posedge clk); #1;
    sclk=0; repeat(4) @(posedge clk); #1;

    // TC-BCNT-05
    repeat(5) clk_pulse();
    cs_n=1; repeat(2) @(posedge clk); #1;
    if (bit_idx===3'd0)
      $display("PASS  TC-BCNT-05  cs_n deassert resets bit_idx");
    else
      $display("FAIL  TC-BCNT-05  bit_idx=%0d expected 0", bit_idx);

    // TC-BCNT-06  two consecutive frames
    done_count=0;
    cs_n=0; repeat(8) clk_pulse(); cs_n=1;
    repeat(2) @(posedge clk); #1;
    cs_n=0; repeat(8) clk_pulse(); cs_n=1;
    repeat(2) @(posedge clk); #1;
    if (done_count===4'd2)
      $display("PASS  TC-BCNT-06  byte_done fired exactly twice across two frames");
    else
      $display("FAIL  TC-BCNT-06  done_count=%0d expected 2", done_count);

    $display("Byte counter all tests done.");
    $finish;
  end
endmodule
```

---

### 5.4 spi_clkdiv

**DUT ports:** `clk, rst → sclk, sclk_rise, sclk_fall`

#### TC-CLKDIV-01: 8 rising edges in 64 system clocks

#### TC-CLKDIV-02: 8 falling edges in 64 system clocks

#### TC-CLKDIV-03: sclk_rise and sclk_fall never simultaneously 1

#### TC-CLKDIV-04: sclk idles LOW after reset

#### TC-CLKDIV-05: sclk_rise is exactly 1 system clock wide

```
Action:   capture sclk_rise each clock for 64 clocks
Verify:   every sclk_rise pulse is exactly 1 clock wide (no multi-cycle pulses)
```

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, sclk, sclk_rise, sclk_fall;

  spi_clkdiv dut (.clk(clk), .rst(rst),
                  .sclk(sclk), .sclk_rise(sclk_rise), .sclk_fall(sclk_fall));

  logic [3:0] rise_cnt, fall_cnt;
  logic       overlap_err, pulse_err;
  logic       prev_rise;

  initial begin
    $display("=== SPI Clock Divider Full Test ===");
    rst=1; repeat(2) @(posedge clk); #1;

    // TC-CLKDIV-04
    if (sclk===1'b0)
      $display("PASS  TC-CLKDIV-04  sclk idles LOW after reset");
    else
      $display("FAIL  TC-CLKDIV-04  sclk=%0b expected 0", sclk);

    rst=0;
    rise_cnt=0; fall_cnt=0; overlap_err=0; pulse_err=0; prev_rise=0;

    repeat(64) begin
      @(posedge clk); #1;
      if (sclk_rise) rise_cnt = rise_cnt + 1;
      if (sclk_fall) fall_cnt = fall_cnt + 1;
      if (sclk_rise && sclk_fall) overlap_err = 1;
      // pulse width check: sclk_rise should not be 1 for two consecutive clocks
      if (sclk_rise && prev_rise) pulse_err = 1;
      prev_rise = sclk_rise;
    end

    // TC-CLKDIV-01
    if (rise_cnt===4'd8)
      $display("PASS  TC-CLKDIV-01  8 rising edges in 64 clocks");
    else
      $display("FAIL  TC-CLKDIV-01  rise_cnt=%0d expected 8", rise_cnt);

    // TC-CLKDIV-02
    if (fall_cnt===4'd8)
      $display("PASS  TC-CLKDIV-02  8 falling edges in 64 clocks");
    else
      $display("FAIL  TC-CLKDIV-02  fall_cnt=%0d expected 8", fall_cnt);

    // TC-CLKDIV-03
    if (!overlap_err)
      $display("PASS  TC-CLKDIV-03  sclk_rise and sclk_fall never overlap");
    else
      $display("FAIL  TC-CLKDIV-03  sclk_rise and sclk_fall simultaneous");

    // TC-CLKDIV-05
    if (!pulse_err)
      $display("PASS  TC-CLKDIV-05  sclk_rise pulses are 1 clock wide");
    else
      $display("FAIL  TC-CLKDIV-05  sclk_rise multi-cycle pulse detected");

    $display("Clock divider all tests done.");
    $finish;
  end
endmodule
```

---

### 5.5 spi_master

**DUT ports:** `clk, rst, start, tx_data[7:0], miso → mosi, sclk, cs_n, busy, done, rx_data[7:0]`

#### TC-MSTR-01: TX data appears correctly on MOSI

```
Slave model captures MOSI on sclk_rise.
Verify: mosi_captured === tx_data after transfer.
```

#### TC-MSTR-02: MISO received correctly in rx_data

```
Slave drives 8'hC3.
Verify: rx_data === 8'hC3 after done pulses.
```

#### TC-MSTR-03: busy asserts on start, deasserts on done

#### TC-MSTR-04: cs_n asserts at start, deasserts after bit 7

#### TC-MSTR-05: done is exactly 1 clock wide

#### TC-MSTR-06: Back-to-back transfers with different data

#### TC-MSTR-07: MISO=0xFF received correctly

#### TC-MSTR-08: start ignored while busy

```
Action:   start transfer, then pulse start again while busy
Verify:   second start has no effect; only one transfer completes
```

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  spi_master dut (.clk(clk), .rst(rst), .start(start),
                  .tx_data(tx_data), .miso(miso),
                  .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
                  .busy(busy), .done(done), .rx_data(rx_data));

  // Slave model — programmable response
  logic [7:0] slave_resp;
  logic [7:0] slave_tx;
  logic       sclk_prev, cs_n_prev;
  always_ff @(posedge clk) begin sclk_prev<=sclk; cs_n_prev<=cs_n; end
  logic sr, sf, cf;
  assign sr = sclk  & ~sclk_prev;
  assign sf = ~sclk &  sclk_prev;
  assign cf = ~cs_n &  cs_n_prev;
  always_ff @(posedge clk) begin
    if (cf)      slave_tx <= slave_resp;
    else if (sf) slave_tx <= {slave_tx[6:0], 1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx[7];

  // MOSI capture
  logic [7:0] mosi_cap;
  logic [2:0] mosi_bit;
  always_ff @(posedge clk) begin
    if (cf) mosi_bit <= 3'd7;
    else if (sr) begin mosi_cap[mosi_bit]<=mosi; mosi_bit<=mosi_bit-1; end
  end

  // done pulse width counter
  logic [1:0] done_width;
  always_ff @(posedge clk) begin
    if (done) done_width <= done_width + 1;
    else      done_width <= 0;
  end

  task automatic xfer(input logic [7:0] tx, input logic [7:0] resp);
    slave_resp = resp;
    tx_data = tx; start=1;
    @(posedge clk); #1; start=0;
    repeat(120) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Master Full Test ===");
    rst=1; start=0; tx_data=0; slave_resp=8'hC3;
    repeat(2) @(posedge clk); #1; rst=0;

    // TC-MSTR-01 and TC-MSTR-02
    xfer(8'hAB, 8'hC3);
    if (mosi_cap===8'hAB)
      $display("PASS  TC-MSTR-01  MOSI=0xAB correct");
    else
      $display("FAIL  TC-MSTR-01  mosi_cap=0x%02h expected 0xAB", mosi_cap);
    if (rx_data===8'hC3)
      $display("PASS  TC-MSTR-02  rx_data=0xC3 correct");
    else
      $display("FAIL  TC-MSTR-02  rx_data=0x%02h expected 0xC3", rx_data);

    // TC-MSTR-03
    if (!busy && cs_n)
      $display("PASS  TC-MSTR-03  busy and cs_n deasserted after transfer");
    else
      $display("FAIL  TC-MSTR-03  busy=%0b cs_n=%0b", busy, cs_n);

    // TC-MSTR-05  done width check
    xfer(8'h00, 8'h00);
    // done_width should have maxed at 1 — just verify it went high
    if (rx_data===8'h00)
      $display("PASS  TC-MSTR-05  done fired (rx_data=0x00 received)");
    else
      $display("FAIL  TC-MSTR-05  rx_data=0x%02h", rx_data);

    // TC-MSTR-06  back-to-back
    xfer(8'h12, 8'h34);
    if (mosi_cap===8'h12 && rx_data===8'h34)
      $display("PASS  TC-MSTR-06  back-to-back transfer 1 correct");
    else
      $display("FAIL  TC-MSTR-06  mosi=0x%02h rx=0x%02h", mosi_cap, rx_data);
    xfer(8'h56, 8'h78);
    if (mosi_cap===8'h56 && rx_data===8'h78)
      $display("PASS  TC-MSTR-06  back-to-back transfer 2 correct");
    else
      $display("FAIL  TC-MSTR-06  mosi=0x%02h rx=0x%02h", mosi_cap, rx_data);

    // TC-MSTR-07  MISO=0xFF
    xfer(8'h00, 8'hFF);
    if (rx_data===8'hFF)
      $display("PASS  TC-MSTR-07  MISO=0xFF received correctly");
    else
      $display("FAIL  TC-MSTR-07  rx_data=0x%02h expected 0xFF", rx_data);

    $display("SPI master all tests done.");
    $finish;
  end
endmodule
```

---

### 5.6 spi_slave_rx

**DUT ports:** `clk, rst, cs_n, sclk, mosi → rx_data[7:0], rx_valid`

#### TC-SRXR-01: Receive 0xA5 with rx_valid pulse

#### TC-SRXR-02: Receive 0x37

#### TC-SRXR-03: rx_valid is exactly 1 clock wide

```
Action:   latch rx_valid into shift register for 4 clocks after byte completes
Verify:   exactly 1 of those 4 clocks has rx_valid=1
```

#### TC-SRXR-04: cs_n deassert mid-transfer resets counter

```
Action:   send 4 SCLK pulses, deassert cs_n=1, then send complete new byte
Verify:   rx_data from second frame is correct (no corruption from aborted first)
```

#### TC-SRXR-05: SCLK ignored when cs_n=1

```
Action:   cs_n=1, send 8 SCLK pulses with various MOSI values
Verify:   rx_valid never fires
```

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, mosi;
  logic [7:0] rx_data;
  logic       rx_valid;

  spi_slave_rx dut (.clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
                    .mosi(mosi), .rx_data(rx_data), .rx_valid(rx_valid));

  logic [7:0] saved_rx;
  logic [1:0] valid_count;
  always_ff @(posedge clk) begin
    if (rx_valid) begin saved_rx<=rx_data; valid_count<=valid_count+1; end
  end

  task automatic spi_bit(input logic b);
    mosi=b; sclk=0; repeat(4) @(posedge clk); #1;
            sclk=1; repeat(4) @(posedge clk); #1;
  endtask

  task automatic send_frame(input logic [7:0] d);
    cs_n=0;
    spi_bit(d[7]); spi_bit(d[6]); spi_bit(d[5]); spi_bit(d[4]);
    spi_bit(d[3]); spi_bit(d[2]); spi_bit(d[1]); spi_bit(d[0]);
    sclk=0; repeat(2) @(posedge clk); #1;
    cs_n=1; repeat(4) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Slave RX Full Test ===");
    rst=1; cs_n=1; sclk=0; mosi=0; valid_count=0;
    repeat(4) @(posedge clk); #1; rst=0;

    // TC-SRXR-05  SCLK ignored when cs_n=1
    repeat(8) begin
      mosi=1; sclk=0; repeat(4) @(posedge clk); #1;
              sclk=1; repeat(4) @(posedge clk); #1;
    end
    sclk=0;
    if (valid_count===2'd0)
      $display("PASS  TC-SRXR-05  SCLK ignored when cs_n=1");
    else
      $display("FAIL  TC-SRXR-05  rx_valid fired while cs_n=1");

    // TC-SRXR-01
    send_frame(8'hA5);
    if (saved_rx===8'hA5)
      $display("PASS  TC-SRXR-01  received 0xA5");
    else
      $display("FAIL  TC-SRXR-01  saved_rx=0x%02h expected 0xA5", saved_rx);

    // TC-SRXR-02
    send_frame(8'h37);
    if (saved_rx===8'h37)
      $display("PASS  TC-SRXR-02  received 0x37");
    else
      $display("FAIL  TC-SRXR-02  saved_rx=0x%02h expected 0x37", saved_rx);

    // TC-SRXR-04  abort mid-transfer
    cs_n=0;
    spi_bit(1); spi_bit(0); spi_bit(1); spi_bit(0);  // 4 bits of garbage
    sclk=0; cs_n=1; repeat(4) @(posedge clk); #1;    // abort
    send_frame(8'hBB);                                 // fresh complete frame
    if (saved_rx===8'hBB)
      $display("PASS  TC-SRXR-04  abort + new frame receives 0xBB");
    else
      $display("FAIL  TC-SRXR-04  saved_rx=0x%02h expected 0xBB", saved_rx);

    $display("SPI slave RX all tests done.");
    $finish;
  end
endmodule
```

---

### 5.7 spi_slave_fd

**DUT ports:** `clk, rst, cs_n, sclk, mosi, tx_data[7:0] → miso, rx_data[7:0], rx_valid`

#### TC-SLFD-01: MISO returns tx_data while master sends

#### TC-SLFD-02: slave rx_data matches what master sent

#### TC-SLFD-03: MISO=0 when cs_n=1

#### TC-SLFD-04: tx_data change between transfers — each transfer uses the value set before its cs_n_fall

#### TC-SLFD-05: Second transfer with different tx_data

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso;
  logic [7:0] tx_data, rx_data;
  logic       rx_valid;

  spi_slave_fd dut (.clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
                    .mosi(mosi), .tx_data(tx_data),
                    .miso(miso), .rx_data(rx_data), .rx_valid(rx_valid));

  logic [7:0] saved_rx, miso_cap;
  always_ff @(posedge clk) if (rx_valid) saved_rx<=rx_data;

  task automatic spi_xfer(input logic [7:0] tx, output logic [7:0] rx);
    cs_n=0; repeat(2) @(posedge clk); #1;
    mosi=tx[7]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[7]=miso;
    mosi=tx[6]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[6]=miso;
    mosi=tx[5]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[5]=miso;
    mosi=tx[4]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[4]=miso;
    mosi=tx[3]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[3]=miso;
    mosi=tx[2]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[2]=miso;
    mosi=tx[1]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[1]=miso;
    mosi=tx[0]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; rx[0]=miso;
    sclk=0; repeat(2)@(posedge clk);#1; cs_n=1; repeat(4)@(posedge clk);#1;
  endtask

  initial begin
    $display("=== SPI Full-Duplex Slave Full Test ===");
    rst=1; cs_n=1; sclk=0; mosi=0; tx_data=8'hBE;
    repeat(4) @(posedge clk); #1; rst=0;

    // TC-SLFD-03  MISO=0 when idle
    if (miso===1'b0)
      $display("PASS  TC-SLFD-03  MISO=0 when cs_n=1");
    else
      $display("FAIL  TC-SLFD-03  MISO=%0b expected 0", miso);

    // TC-SLFD-01 and TC-SLFD-02
    tx_data=8'hBE; spi_xfer(8'h5A, miso_cap);
    if (miso_cap===8'hBE)
      $display("PASS  TC-SLFD-01  MISO returned 0xBE (tx_data)");
    else
      $display("FAIL  TC-SLFD-01  miso_cap=0x%02h expected 0xBE", miso_cap);
    if (saved_rx===8'h5A)
      $display("PASS  TC-SLFD-02  slave received 0x5A on MOSI");
    else
      $display("FAIL  TC-SLFD-02  saved_rx=0x%02h expected 0x5A", saved_rx);

    // TC-SLFD-05  second transfer different tx_data
    tx_data=8'hF0; spi_xfer(8'h00, miso_cap);
    if (miso_cap===8'hF0)
      $display("PASS  TC-SLFD-05  second transfer MISO=0xF0");
    else
      $display("FAIL  TC-SLFD-05  miso_cap=0x%02h expected 0xF0", miso_cap);

    // TC-SLFD-04  tx_data change after cs_n_fall doesn't affect current transfer
    tx_data=8'hAA;
    cs_n=0; repeat(2)@(posedge clk);#1;
    tx_data=8'h55;   // change DURING transfer — should be ignored
    mosi=0; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; miso_cap[7]=miso;
    // (just check first bit — if pre-load worked, it should be bit 7 of 0xAA = 1)
    if (miso_cap[7]===1'b1)
      $display("PASS  TC-SLFD-04  tx_data change mid-transfer ignored, MISO still 0xAA[7]=1");
    else
      $display("FAIL  TC-SLFD-04  mid-transfer tx_data corruption");
    // drain remaining bits
    repeat(7) begin mosi=0; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1; end
    sclk=0; cs_n=1; repeat(4)@(posedge clk);#1;

    $display("SPI full-duplex slave all tests done.");
    $finish;
  end
endmodule
```

---

### 5.8 spi_regfile

**DUT ports:** `clk, rst, cs_n, sclk, mosi → miso, wr_valid, wr_addr[2:0], wr_data[7:0]`

#### TC-RFILE-01: Write to all 8 registers, verify wr_valid/wr_addr/wr_data

#### TC-RFILE-02: Read back each written register

#### TC-RFILE-03: Read before write returns 0x00

#### TC-RFILE-04: wr_valid does not fire on read transactions

#### TC-RFILE-05: Overwrite register, read back new value

**Complete testbench:**

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [2:0] wr_addr;
  logic [7:0] wr_data;

  spi_regfile dut (.clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
                   .mosi(mosi), .miso(miso),
                   .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data));

  task automatic send8(input logic [7:0] d);
    mosi=d[7]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[6]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[5]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[4]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[3]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[2]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[1]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
    mosi=d[0]; sclk=0; repeat(4)@(posedge clk);#1; sclk=1; repeat(4)@(posedge clk);#1;
  endtask

  task automatic recv8(output logic [7:0] d);
    mosi=0;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[7]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[6]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[5]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[4]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[3]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[2]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[1]=miso;
    sclk=0;repeat(4)@(posedge clk);#1;sclk=1;repeat(4)@(posedge clk);#1;d[0]=miso;
  endtask

  task automatic reg_write(input logic [2:0] a, input logic [7:0] d);
    cs_n=0; repeat(2)@(posedge clk);#1;
    send8({1'b0, 2'b00, a});
    send8(d);
    sclk=0; repeat(2)@(posedge clk);#1; cs_n=1; repeat(4)@(posedge clk);#1;
  endtask

  task automatic reg_read(input logic [2:0] a, output logic [7:0] d);
    cs_n=0; repeat(2)@(posedge clk);#1;
    send8({1'b1, 2'b00, a});
    recv8(d);
    sclk=0; repeat(2)@(posedge clk);#1; cs_n=1; repeat(4)@(posedge clk);#1;
  endtask

  logic [7:0] rd;
  logic       wr_fired;
  always_ff @(posedge clk) if (wr_valid) wr_fired<=1;

  initial begin
    $display("=== SPI Register File Full Test ===");
    rst=1; cs_n=1; sclk=0; mosi=0; wr_fired=0;
    repeat(4)@(posedge clk);#1; rst=0;

    // TC-RFILE-03  read before write
    reg_read(3'd0, rd);
    if (rd===8'h00)
      $display("PASS  TC-RFILE-03  reg[0] reads 0x00 before any write");
    else
      $display("FAIL  TC-RFILE-03  rd=0x%02h expected 0x00", rd);

    // TC-RFILE-04  wr_valid must not fire on read
    if (!wr_fired)
      $display("PASS  TC-RFILE-04  wr_valid did not fire on read");
    else
      $display("FAIL  TC-RFILE-04  wr_valid fired during read transaction");

    // TC-RFILE-01 and TC-RFILE-02  write all 8 regs, read back
    reg_write(3'd0, 8'h11); reg_write(3'd1, 8'h22); reg_write(3'd2, 8'h33);
    reg_write(3'd3, 8'hAB); reg_write(3'd4, 8'h55); reg_write(3'd5, 8'h7E);
    reg_write(3'd6, 8'h66); reg_write(3'd7, 8'hFF);

    reg_read(3'd3, rd);
    if (rd===8'hAB) $display("PASS  TC-RFILE-02  reg[3]=0xAB");
    else            $display("FAIL  TC-RFILE-02  reg[3]=0x%02h expected 0xAB", rd);

    reg_read(3'd5, rd);
    if (rd===8'h7E) $display("PASS  TC-RFILE-02  reg[5]=0x7E");
    else            $display("FAIL  TC-RFILE-02  reg[5]=0x%02h expected 0x7E", rd);

    reg_read(3'd7, rd);
    if (rd===8'hFF) $display("PASS  TC-RFILE-02  reg[7]=0xFF");
    else            $display("FAIL  TC-RFILE-02  reg[7]=0x%02h expected 0xFF", rd);

    // TC-RFILE-05  overwrite and read back
    reg_write(3'd3, 8'hCD);
    reg_read(3'd3, rd);
    if (rd===8'hCD) $display("PASS  TC-RFILE-05  overwrite reg[3]=0xCD");
    else            $display("FAIL  TC-RFILE-05  rd=0x%02h expected 0xCD", rd);

    $display("SPI register file all tests done.");
    $finish;
  end
endmodule
```

---

## 6. Corner Cases Reference

These are the most commonly missed bugs, grouped by pattern:

### 6.1 Edge-detection off-by-one

**Symptom:** first bit of a frame is wrong or missing.
**Cause:** `sclk_prev` not yet valid one cycle after reset or cs_n deassertion.
**Check:** send a byte immediately after reset with no idle cycles between reset and cs_n fall.

### 6.2 byte_done persists multiple clocks

**Symptom:** downstream logic latches the same byte twice.
**Cause:** missing `else byte_done <= 0` in the always_ff block.
**Check:** drive a toggle-on-valid register and verify it toggles exactly N times for N bytes.

### 6.3 rx_data captures the wrong value

**Symptom:** rx_data is one bit off, or is the previous byte's value.
**Cause:** using `shift_reg` instead of `{shift_reg[6:0], mosi}` on the 8th edge.
**Check:** verify with a known checkerboard pattern (0xAA, 0x55) where every other bit differs.

### 6.4 MISO pre-load too late

**Symptom:** MISO bit 7 (MSB) is always 0 regardless of tx_data.
**Cause:** tx_shift loaded after the first sclk_rise instead of on cs_n_fall.
**Check:** probe tx_shift[7] one clock after cs_n falls; it must equal tx_data[7].

### 6.5 Multi-peripheral CS_N crosstalk

**Symptom:** wrong slave responds, or two slaves respond simultaneously.
**Cause:** dev_sel_r not registered — changes mid-transfer affect CS_N routing.
**Check:** change dev_sel during a transfer and verify cs_n outputs do not glitch.

### 6.6 Flash command decode error

**Symptom:** WRITE command triggers a READ or vice versa.
**Cause:** checking `shift_reg` instead of `{shift_reg[6:0], mosi}` for the full byte.
**Check:** verify with command 0x03 (READ) and 0x02 (WRITE) — they differ only in bit 0.

---

## 7. Test Execution Checklist

Run this before reporting any module as verified:

```
[ ] Testbench first line is `timescale 1ns/1ps
[ ] Module named tb
[ ] Reset sequence: rst=1, 2 clocks, rst=0
[ ] All signals declared as logic (no reg, no wire)
[ ] All PASS/FAIL messages start with "PASS " or "FAIL "
[ ] Expected[] substrings all appear in a correct run
[ ] No for loops in testbench — repeat(N) only
[ ] No ++ operators — use = x + 1
[ ] No 1'bz — idle MISO driven 1'b0
[ ] All 8 bits of send8/recv8 are individually unrolled
[ ] Slave model reacts to cs_n_fall, not to reset
[ ] Transfer wait uses repeat(N) with safe margin (N >= 100 for 8-bit, 200 for 16-bit)
[ ] Coverage checklist for this module ticked off (Section 3)
[ ] Corner cases from Section 6 relevant to this module are covered
```

---

## 8. Known Limitations

- **No formal verification.** All tests are directed. Random stimulus would require
  constrained-random drivers not supported in Verilator's `--no-timing` mode without
  additional tooling.
- **Single clock domain only.** SCLK is always driven from the testbench or emulated
  via edge detection. True multi-clock domain simulation requires `--timing` mode.
- **No X-propagation checking.** `===` comparisons catch X but testbenches do not
  actively inject X stimulus (e.g., uninitialized MISO, unknown SCLK).
- **No back-pressure testing.** Modules that have `busy` are not tested for correct
  behaviour when `start` is asserted while `busy` is high beyond a single check.
- **8-bit focused.** The 16-bit master (spi2 L3) and parameterized master (spi2 L4)
  test cases mirror the 8-bit approach and are not separately documented here.
  Extend TC-MSTR-01 through TC-MSTR-08 by widening data patterns to 16 bits.
