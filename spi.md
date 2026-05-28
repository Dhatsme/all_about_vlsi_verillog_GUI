# SPI Protocol Learning Series — Complete Reference

## Purpose

This document is the authoritative blueprint for the SPI Protocol Learning Series.
It defines every module, every lesson, and every field for each lesson object.
Use it when building new chapters or auditing existing ones.

**Branch:** `claude/spi-protocol-learning-series-wdbNg`
**Files:** `static/lessons/modules/spi1.js` through `spi4.js`
**Prerequisite:** Student has completed msv1, msv2, msv3 (Zero to Hero curriculum)

---

## 1. Syntax Baseline — msv1 through msv3

Only constructs introduced in msv1–msv3 may be used silently.
Any new construct must be introduced with a theory callout (see Section 4).

### 1.1 Allowed Data Types

```systemverilog
logic             // only type — never reg, never wire
logic [7:0]       // bus — any width
logic [N:0]       // parameterized bus
int               // 2-state integer for testbench loop counters (msv2)
```

### 1.2 Allowed Procedural Blocks

```systemverilog
always_comb begin ... end
always_ff @(posedge clk) begin ... end
always #5 clk = ~clk;          // testbench clock generation
initial begin ... end           // testbench only
task automatic name(input logic ..., output logic ...); ... endtask
```

### 1.3 Allowed Assignments

```systemverilog
=    // blocking — inside always_comb, initial, and tasks
<=   // non-blocking — inside always_ff ONLY
assign  // continuous — outside all procedural blocks
```

### 1.4 Allowed Control Flow

```systemverilog
if (cond) ...
if (cond) begin ... end else begin ... end
if ... else if ... else ...
unique case (expr)
  2'b00: ...
  default: ...
endcase
repeat(N) @(posedge clk); #1;  // testbench wait loop
repeat(N) task_call();          // repeat a task call
```

### 1.5 Allowed Operators

```systemverilog
&  |  ~  ^            // bitwise
+  -                  // arithmetic
!  &&  ||             // logical
==  ===  !=  <  >     // comparison (=== for 4-state in testbench)
? :                   // ternary
{A, B}                // concatenation
[N:M]                 // bit-slice
```

### 1.6 Allowed Module Features

```systemverilog
module name (input logic ..., output logic ...); endmodule
module_type inst (.port(sig), ...);   // named-port instantiation
logic [N:0] internal_wire;            // internal signal declaration
```

### 1.7 Allowed Literals

```systemverilog
1'b0  1'b1
4'b1010
8'h00  8'hAB
4'd15  3'd7
```

### 1.8 Allowed System Tasks

```systemverilog
$display("PASS  msg %0d %0h", var1, var2);
$finish;
`timescale 1ns/1ps   // MUST be first line of every testbench
```

---

## 2. Syntax NOT Allowed — Do Not Use Silently

| Construct | Workaround |
|---|---|
| `for (int i = 0; i < N; i++)` | Unroll to N explicit lines, OR introduce explicitly in theory |
| `case` without `unique` | Always write `unique case` |
| `logic [7:0] arr[0:N]` multi-dim | Use N+1 separate `logic [7:0] reg0, reg1, ...` + if/else dispatch |
| `1'bz` tri-state | Use `1'b0` for inactive output |
| `return` inside task | Use `repeat(N) @(posedge clk); #1;` then check result after |
| `disable` | Replace with `repeat` + post-loop check |
| `i++` / `i--` | Use `i = i + 1` / `i = i - 1` |
| `integer` (old type) | Use `int` (taught in msv2) |
| `$signed()` cast | Avoid or introduce in theory |
| `wire` anywhere | Use `logic` |
| `reg` anywhere | Use `logic` |

### 2.1 How to Introduce a New Construct

Add this block to the lesson theory HTML before using the construct:

```html
<h3>New in this lesson: the for loop</h3>
<p>A <code>for</code> loop repeats a block a fixed number of times and provides a counter:</p>
<pre class="code-block">for (int i = 0; i &lt; 8; i = i + 1) begin
  serial_in = data[7-i];
  @(posedge clk); #1;
end</pre>
<p>Use <code>for</code> loops only in testbenches and tasks — never in synthesisable design code.</p>
```

---

## 3. Lesson Object Schema

Every lesson must have all 8 fields. Missing any field breaks the GUI renderer.

```javascript
{
  id:        'spi1l1',           // globally unique, format: <moduleId>l<num>
  title:     'L1 — Title Here',
  theory:    `<h2>...</h2>...`,  // HTML string (see Section 4)
  tasks:     ['task string', ...], // array of strings (see Section 5)
  hint:      `module ...`,        // plain string, not HTML (see Section 6)
  design:    `// comment only`,   // starter code, zero synthesisable lines
  testbench: `\`timescale 1ns/1ps\nmodule tb;\n...endmodule`,
  expected:  ['PASS  ...', 'done msg']  // 2–4 substrings from simulation output
}
```

---

## 4. Theory Field Rules

### 4.1 Required Structure (in this order)

1. `<h2>` — what new concept this lesson introduces
2. `<p>` — one-paragraph explanation with physical analogy
3. `<p><strong>Builds on:</strong> msv2 L3 (shift register) — extends it from 4 to 8 bits.</p>`
4. `<pre class="code-block">` — key syntax snippet (never a complete module)
5. ASCII timing diagram in `<pre class="code-block">` for any serial/clocked concept
6. `<table class="truth-table">` — signal table or truth table
7. Port table listing every port and its purpose
8. `<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`

### 4.2 Allowed HTML Elements

```html
<h2>  <h3>
<p>
<pre class="code-block">  ← code snippet, NOT a complete module
<table class="truth-table"><tr><th>col</th></tr><tr><td>val</td></tr></table>
<code>inline keyword</code>
<ul><li>item</li></ul>
<strong>term</strong>
```

### 4.3 HTML Escaping Inside `<pre>`

```
<  →  &lt;
>  →  &gt;
&  →  &amp;
```

Example: `data_out &lt;= {data_out[6:0], serial_in};`

### 4.4 What Never Goes in Theory

- A complete working `module ... endmodule` — that belongs in `hint` only
- The answer to the exercise
- Text that says "easy", "simple", "trivial", "just", "obviously"

### 4.5 Timing Diagram Format

Use a `<pre class="code-block">` block with ASCII art:

```
CS_N: ‾‾‾|_______________|‾‾‾
SCLK: ___|‾|_|‾|_|‾|_|‾|_|___
MOSI: ===|b7|b6|b5|b4|b3|b2|b1|b0|===
MISO: ===|r7|r6|r5|r4|r3|r2|r1|r0|===
```

---

## 5. Tasks Field Rules

### 5.1 Fixed Items

Every lesson tasks array must start and end with these exact items:

```javascript
// First item always:
'Code tab is blank — type every line.',

// Second-to-last always:
'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',

// Last always:
'Hit Run — all N PASS lines should appear in the Output tab',
```

### 5.2 Tier Guide for Middle Tasks

**Tier 1 — every line spelled out:**
```javascript
'── Line 2 ──  input  logic clk,   ← clock input, comma',
'── Line 9 ──  data_out <= {data_out[6:0], serial_in};',
```

**Tier 2 — line markers, concept named:**
```javascript
'── Line 3 ── second input port with comma',
'── Line 9 ── declare internal 8-bit shift_reg',
```

**Tier 3 — structural guidance:**
```javascript
'Declare module spi_master with ports listed in Theory',
'Phase 0: sclk_r=1, rx_shift <= {rx_shift[6:0], miso}',
```

**Tier 4 — behaviour spec:**
```javascript
'Output rx_valid must pulse high for exactly one cycle after bit 7 is received',
'Bit counter must reset to 0 when cs_n deasserts',
```

**Tier 5 — portfolio requirements:**
```javascript
'Implement READ DATA (0x03) and PAGE PROGRAM (0x02) commands',
'Poll Status Register after write until WIP bit = 0',
'🎓 Portfolio piece — push this to your GitHub when complete',
```

---

## 6. Hint Field Rules

Plain template literal (not HTML). Renderer HTML-escapes it and wraps in `<pre>`.
Write raw `&`, `<`, `>` — do NOT use HTML entities inside the hint string.

### 6.1 Tier 1–2 Hint (annotate every line)

```javascript
hint:
`module sipo_shift_reg (
  input  logic clk,             // system clock
  input  logic rst,             // active-high synchronous reset
  input  logic serial_in,       // one bit arrives per clock
  output logic [7:0] data_out   // 8 parallel bits, NO comma
);

  always_ff @(posedge clk) begin
    if (rst)
      data_out <= 8'b0;                           // clear all 8 bits
    else
      data_out <= {data_out[6:0], serial_in};     // shift left, new bit at bit 0
  end

endmodule`,
```

### 6.2 Tier 3 Hint (key lines only)

```javascript
hint:
`module spi_master ( ... );
  // internals
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;

  always_ff @(posedge clk) begin
    if (rst) begin ... end
    else begin
      if (!busy && start) begin
        phase <= 2'd3;  // hold one cycle before first SCLK
      end else if (busy) begin
        phase <= phase + 1;
        unique case (phase)
          2'd0: begin sclk_r <= 1; rx_shift <= {rx_shift[6:0], miso}; end
          2'd2: begin sclk_r <= 0; /* check bit_cnt == 7 */ end
        endcase
      end
    end
  end
endmodule`,
```

### 6.3 Tier 4–5 Hint (design notes only, no implementation)

```javascript
hint:
`DESIGN NOTES for spi_regfile:

  State machine:
    state=0 (ADDR): receive first byte, decode rw_bit and addr[2:0]
    state=1 (DATA): write -> update reg; read -> tx was preloaded

  Register file (8 separate signals — no arrays yet):
    logic [7:0] reg0, reg1, reg2, reg3, reg4, reg5, reg6, reg7;
    Write dispatch: if (addr==3'd0) reg0 <= data; else if ...
    Read dispatch:  assign rd = (addr==3'd0) ? reg0 : (addr==3'd1) ? reg1 : ...

  TX preload timing:
    On sclk_rise bit 7 of ADDR byte: addr and rw_bit are known
    tx_shift <= reg_rd (combinational read of the dispatch chain)
    This gives the slave time to shift MISO out during DATA byte`,
```

---

## 7. Design (Starter Code) Field Rules

Must contain ZERO synthesisable code. Comments only.

**Tier 1–2:**
```javascript
design:
`// Type the sipo_shift_reg module here.
// Read Theory first — it explains the shift operation.
//
// Ports:
//   input  logic clk        — rising edge triggers the shift
//   input  logic rst        — active-high synchronous reset
//   input  logic serial_in  — one bit of SPI data per clock
//   output logic [7:0] data_out — all 8 bits visible after 8 clocks
//
// Logic: data_out <= {data_out[6:0], serial_in}
//
// Delete this and start typing:
`,
```

**Tier 3:**
```javascript
design:
`// Type the spi_master module here. See Theory for the concept.
//
// Ports: clk, rst, start, tx_data[7:0], miso, mosi, sclk, cs_n, busy, rx_data[7:0], done
//
// Delete this and start typing:
`,
```

**Tier 4–5:**
```javascript
design:
`// Build the spi_regfile module here. See Theory for the full spec.
`,
```

---

## 8. Testbench Rules (Verilator 5.020 — Mandatory)

| Rule | Correct | Wrong |
|---|---|---|
| First line | `` `timescale 1ns/1ps `` | missing |
| Module name | `module tb;` | anything else |
| Signal type | `logic` | `reg`, `wire` |
| Combinational | `always_comb` | `always @(*)` |
| Sequential | `always_ff @(posedge clk)` | `always @(posedge clk)` |
| Clocked delay | `@(posedge clk); #1;` | bare `#5;` in clocked context |
| Comparison | `===` for 4-state | `==` for X/Z-safe checks |
| No `for` loops | unroll or use `repeat` | `for (int i...)` silently |
| No `return` | `repeat(N)` then check | `if (done) return;` |
| No `disable` | `repeat(N)` then check | `disable;` |
| No `++` operator | `x = x + 1` | `x++` |
| No `1'bz` | `1'b0` when inactive | `1'bz` |

### 8.1 Combinational Testbench Pattern

```systemverilog
`timescale 1ns/1ps
module tb;
  logic a, b, sum, cout;
  half_adder dut (.a(a), .b(b), .sum(sum), .cout(cout));

  task automatic check(input logic va, vb, e_sum, e_cout);
    a = va; b = vb; #5;
    if (sum === e_sum && cout === e_cout)
      $display("PASS  a=%0b b=%0b -> sum=%0b cout=%0b", va, vb, sum, cout);
    else
      $display("FAIL  a=%0b b=%0b -> sum=%0b cout=%0b (exp %0b %0b)",
               va, vb, sum, cout, e_sum, e_cout);
  endtask

  initial begin
    $display("=== Half Adder Test ===");
    check(0, 0, 0, 0);
    check(0, 1, 1, 0);
    check(1, 0, 1, 0);
    check(1, 1, 0, 1);
    $display("Half adder works!");
    $finish;
  end
endmodule
```

### 8.2 Clocked / Sequential Testbench Pattern

```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz

  logic rst, serial_in;
  logic [7:0] data_out;

  sipo_shift_reg dut (.clk(clk), .rst(rst), .serial_in(serial_in), .data_out(data_out));

  // Send 8 bits MSB first — unrolled, no for loop
  task automatic send_byte(input logic [7:0] data);
    serial_in = data[7]; @(posedge clk); #1;
    serial_in = data[6]; @(posedge clk); #1;
    serial_in = data[5]; @(posedge clk); #1;
    serial_in = data[4]; @(posedge clk); #1;
    serial_in = data[3]; @(posedge clk); #1;
    serial_in = data[2]; @(posedge clk); #1;
    serial_in = data[1]; @(posedge clk); #1;
    serial_in = data[0]; @(posedge clk); #1;
  endtask

  initial begin
    rst = 1; serial_in = 0;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    send_byte(8'hA5);
    if (data_out === 8'hA5)
      $display("PASS  sent 0xA5 -> data_out=0x%02h", data_out);
    else
      $display("FAIL  expected 0xA5 got 0x%02h", data_out);

    $display("Shift register works!");
    $finish;
  end
endmodule
```

### 8.3 SPI Bus Driver Pattern (Manual Clocking)

Used in slave testbenches where the testbench drives SCLK directly:

```systemverilog
// Send 8 bits MSB first over SPI — no for loop
task automatic spi_send_byte(input logic [7:0] data);
  cs_n = 0;
  mosi = data[7]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[6]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[5]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[4]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[3]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[2]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[1]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  mosi = data[0]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(2) @(posedge clk); #1;
  cs_n = 1; repeat(2) @(posedge clk); #1;
endtask

// Receive 8 bits MSB first — capture MISO during clock-low phase
task automatic recv8(output logic [7:0] d);
  mosi = 1'b0;
  sclk = 0; repeat(4) @(posedge clk); #1; d[7] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[6] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[5] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[4] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[3] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[2] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[1] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
  sclk = 0; repeat(4) @(posedge clk); #1; d[0] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
endtask
```

### 8.4 SPI Master Testbench Pattern (DUT drives SCLK)

Used when testing `spi_master` — testbench models the slave:

```systemverilog
// Slave model drives a known byte on MISO
logic [7:0] slave_tx;
logic sclk_prev, cs_n_prev;
always_ff @(posedge clk) begin
  sclk_prev <= sclk;
  cs_n_prev <= cs_n;
end

logic sclk_rise_det, sclk_fall_det, cs_n_fall_det;
assign sclk_rise_det = sclk  & ~sclk_prev;
assign sclk_fall_det = ~sclk & sclk_prev;
assign cs_n_fall_det = ~cs_n & cs_n_prev;

always_ff @(posedge clk) begin
  if (cs_n_fall_det) slave_tx <= 8'hC3;            // preload on CS assert
  else if (sclk_fall_det) slave_tx <= {slave_tx[6:0], 1'b0}; // shift out MSB
end

assign miso = cs_n ? 1'b0 : slave_tx[7];  // never 1'bz

// Wait for transfer — no for+return
task automatic do_xfer(input logic [7:0] tx);
  tx_data = tx; start = 1;
  @(posedge clk); #1; start = 0;
  repeat(100) @(posedge clk); #1;  // 8 bits * 4 phases = 32 cycles; 100 is safe
endtask
```

### 8.5 Done-Flag Pattern (Replaces `for + return`)

```systemverilog
// Instead of: for (int i=0; i<400; i++) begin @(posedge clk); #1; if (done) return; end
// Use: wait generously, check result after
task automatic do_xfer(input logic [7:0] tx);
  tx_data = tx; start = 1;
  @(posedge clk); #1; start = 0;
  repeat(100) @(posedge clk); #1;
endtask
// Then in initial: do_xfer(8'hAB); if (rx_data === ...) ...
```

### 8.6 Register Tracking (Replaces `int counter` in `always_ff`)

```systemverilog
// Instead of: int ack_idx; always_ff @(posedge clk) if (ack) ack_idx++;
// Use: logic [2:0] ack_cnt (fits in always_ff with non-blocking)
logic [2:0] ack_cnt;
always_ff @(posedge clk) begin
  if (rst) ack_cnt <= 0;
  else if (ack) ack_cnt <= ack_cnt + 1;
end
```

---

## 9. Key Circuit Implementations

### 9.1 SIPO — Serial-In Parallel-Out (RX side)

```systemverilog
always_ff @(posedge clk) begin
  if (rst) data_out <= 8'b0;
  else     data_out <= {data_out[6:0], serial_in};  // shift left, new bit at LSB
end
```

### 9.2 PISO — Parallel-In Serial-Out (TX side)

```systemverilog
always_ff @(posedge clk) begin
  if (rst)       shift_reg <= 8'b0;
  else if (load) shift_reg <= data_in;                  // capture byte
  else           shift_reg <= {shift_reg[6:0], 1'b0};  // shift left, pad 0
end
assign serial_out = shift_reg[7];  // MSB exits first
```

### 9.3 Edge Detection (Use for SCLK and CS_N)

```systemverilog
logic sclk_prev;
always_ff @(posedge clk) sclk_prev <= sclk;

assign sclk_rise = sclk  & ~sclk_prev;   // one system-clock HIGH on rising edge
assign sclk_fall = ~sclk & sclk_prev;    // one system-clock HIGH on falling edge

// Same pattern for CS_N:
logic cs_n_prev;
always_ff @(posedge clk) cs_n_prev <= cs_n;
assign cs_n_fall = ~cs_n & cs_n_prev;    // detects CS_N going low (transaction start)
```

### 9.4 SPI Master 4-Phase State Machine

```systemverilog
// phase 0: SCLK rises  — sample MISO
// phase 1: SCLK high   — hold
// phase 2: SCLK falls  — shift MOSI for next bit (or finish)
// phase 3: SCLK low    — hold / MOSI setup

if (!busy && start) begin
  busy <= 1; cs_n <= 0; tx_shift <= tx_data;
  bit_cnt <= 0; phase <= 2'd3;  // one hold cycle before first clock
end else if (busy) begin
  phase <= phase + 1;
  unique case (phase)
    2'd0: begin sclk_r <= 1; rx_shift <= {rx_shift[6:0], miso}; end
    2'd1: ;
    2'd2: begin
      sclk_r <= 0;
      if (bit_cnt == 3'd7) begin
        busy <= 0; cs_n <= 1; done <= 1; rx_data <= rx_shift;
      end else begin
        bit_cnt  <= bit_cnt + 1;
        tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
    2'd3: ;
  endcase
end
assign sclk = sclk_r;
assign mosi = tx_shift[7];
```

### 9.5 Register File Without Arrays (msv5 not yet taught)

```systemverilog
// Eight separate registers
logic [7:0] reg0, reg1, reg2, reg3, reg4, reg5, reg6, reg7;

// Combinational read dispatch
logic [7:0] reg_rd;
assign reg_rd = (addr == 3'd0) ? reg0 :
                (addr == 3'd1) ? reg1 :
                (addr == 3'd2) ? reg2 :
                (addr == 3'd3) ? reg3 :
                (addr == 3'd4) ? reg4 :
                (addr == 3'd5) ? reg5 :
                (addr == 3'd6) ? reg6 : reg7;

// Sequential write dispatch
if (addr == 3'd0) reg0 <= wr_data;
else if (addr == 3'd1) reg1 <= wr_data;
else if (addr == 3'd2) reg2 <= wr_data;
else if (addr == 3'd3) reg3 <= wr_data;
else if (addr == 3'd4) reg4 <= wr_data;
else if (addr == 3'd5) reg5 <= wr_data;
else if (addr == 3'd6) reg6 <= wr_data;
else                   reg7 <= wr_data;

// Reset all eight explicitly
reg0 <= 8'h00; reg1 <= 8'h00; reg2 <= 8'h00; reg3 <= 8'h00;
reg4 <= 8'h00; reg5 <= 8'h00; reg6 <= 8'h00; reg7 <= 8'h00;
```

---

## 10. Difficulty Tier Assignments

| Module | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| spi1 Fundamentals | T1 | T2 | T3 | — |
| spi2 Master Design | T2 | T3 | T3 | T5 |
| spi3 Slave Design | T3 | T4 | T5 | — |
| spi4 Applications | T4 | T4 | T5 | T5 |

---

## 11. Curriculum — All Modules and Lessons

---

### 11.1 Module spi1 — SPI Protocol Fundamentals

**File:** `static/lessons/modules/spi1.js`
**Level:** beginner
**Icon:** 🔌
**Purpose:** Build the two shift registers that underpin all SPI communication, then learn frame detection.

---

#### spi1 L1 — Serial-In Parallel-Out Shift Register (`spi1l1`)

**Tier:** 1 (every line spelled out)
**Builds on:** msv2 L3 (shift register — extends 4-bit to 8-bit)
**New concept:** 8-bit SIPO register, `{A, B}` concatenation for shifting

**Circuit:**
- Module name: `sipo_shift_reg`
- Ports: `input clk, rst, serial_in` / `output [7:0] data_out`
- Logic: `data_out <= {data_out[6:0], serial_in};`

**Truth table to include:**

| Before (data_out) | serial_in | After (data_out) |
|---|---|---|
| 8'b0000_0000 | 1 | 8'b0000_0001 |
| 8'b0000_0001 | 1 | 8'b0000_0011 |
| 8'b0000_0011 | 0 | 8'b0000_0110 |

**Testbench approach:**
- Reset, then call `send_byte(8'hA5)` and verify `data_out === 8'hA5`
- Test `8'hFF`, verify all ones
- Assert reset, verify `8'h00`
- `send_byte` task: 8 explicit `serial_in = data[N]; @(posedge clk); #1;` lines

**Expected output:**
```
PASS  sent 0xA5 -> data_out=0xa5
PASS  sent 0xFF -> data_out=0xff
PASS  reset clears register -> data_out=0x00
Shift register works!
```

---

#### spi1 L2 — Parallel-In Serial-Out Shift Register (`spi1l2`)

**Tier:** 2 (line markers, concept named)
**Builds on:** spi1 L1 (SIPO — reverse direction)
**New concept:** `load` control signal; MSB-first serial transmission

**Circuit:**
- Module name: `piso_shift_reg`
- Ports: `input clk, rst, load, [7:0] data_in` / `output serial_out`
- Internal: `logic [7:0] shift_reg`
- Logic:
  - rst → `shift_reg <= 8'b0`
  - load → `shift_reg <= data_in`
  - else → `shift_reg <= {shift_reg[6:0], 1'b0}`
  - `assign serial_out = shift_reg[7]`

**Timing table to include:**

| Cycle | load | shift_reg | serial_out |
|---|---|---|---|
| 0 | 1 | 1011_0010 | 1 (bit 7) |
| 1 | 0 | 0110_0100 | 0 (bit 6) |
| 2 | 0 | 1100_1000 | 1 (bit 5) |

**Testbench approach:**
- Load, then capture 8 serial bits with `send_and_capture` task
- Test `8'hA5` and `8'h3C`
- `send_and_capture`: load → 8 explicit `recv[N] = serial_out; @(posedge clk); #1;` lines

**Expected output:**
```
PASS  loaded 0xA5 -> serial captured 0xa5
PASS  loaded 0x3C -> serial captured 0x3c
PASS  reset clears serial_out
PISO register works!
```

---

#### spi1 L3 — SPI Frame & Bit Counter (`spi1l3`)

**Tier:** 3 (structural guidance)
**Builds on:** msv2 L4 (counter pattern); spi1 L1 (always_ff on posedge clk)
**New concept:** Edge detection via `sclk_prev`; CS_N framing; `byte_done` pulse

**Circuit:**
- Module name: `spi_byte_counter`
- Ports: `input clk, rst, cs_n, sclk` / `output [2:0] bit_idx, byte_done`
- Internal: `logic sclk_prev, sclk_rise`
- Edge detection: `always_ff @(posedge clk) sclk_prev <= sclk;` then `assign sclk_rise = sclk & ~sclk_prev;`
- On rst/cs_n: clear everything
- On sclk_rise + bit_idx==7: pulse `byte_done`, reset `bit_idx`
- On sclk_rise otherwise: increment `bit_idx`

**Signal table to include:**

| cs_n | sclk_rise | bit_idx action | byte_done |
|---|---|---|---|
| 1 | X | reset to 0 | 0 |
| 0 | 0 | hold | 0 |
| 0 | 1 (idx 0–6) | increment | 0 |
| 0 | 1 (idx 7) | reset to 0 | 1 (pulse) |

**Testbench approach:**
- `spi_clk_pulse` task: toggle sclk high/low with `repeat(4)` delays
- Send 7 pulses, verify `bit_idx === 7`
- Send 8th pulse (just rising edge), verify `byte_done === 1`
- Deassert `cs_n`, verify `bit_idx === 0`

**Expected output:**
```
PASS  bit_idx=7 after 7 clocks in frame
PASS  byte_done pulses on 8th SCLK
PASS  cs_n deassert resets bit_idx to 0
SPI frame counter works!
```

---

### 11.2 Module spi2 — SPI Master Design

**File:** `static/lessons/modules/spi2.js`
**Level:** intermediate
**Icon:** 🕹️
**Purpose:** Build a complete SPI master — clock generation, full byte transfer, 16-bit burst.

---

#### spi2 L1 — SPI Clock Generator (`spi2l1`)

**Tier:** 2 (line markers)
**Builds on:** msv2 L4 (clock divider — exact same counter pattern)
**New concept:** `sclk_rise` and `sclk_fall` edge-strobe outputs from a divided clock

**Circuit:**
- Module name: `spi_clkdiv`
- Ports: `input clk, rst` / `output sclk, sclk_rise, sclk_fall`
- Internal: `logic [1:0] cnt, logic sclk_r, sclk_r_prev`
- Counter: increments every clock; toggles `sclk_r` when `cnt == 2'd3`
- Edge strobes: `assign sclk_rise = sclk_r & ~sclk_r_prev;`

**SCLK waveform table to include:**

| System clk | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| cnt | 0 | 1 | 2 | 3→0 | 1 | 2 | 3→0 | 1 |
| sclk_r | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 0 |
| sclk_rise | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |

**Testbench approach:**
- Declare `int rise_cnt, fall_cnt;` (use `= x + 1`, not `++`)
- `repeat(64)` clock loop counting edges
- Verify `rise_cnt === 8` and `fall_cnt === 8`

**Expected output:**
```
PASS  8 rising edges in 64 system clocks (divide-by-8)
PASS  8 falling edges in 64 system clocks
PASS  sclk is a valid driven logic level
SPI clock divider works!
```

---

#### spi2 L2 — SPI Master Controller Mode 0 (`spi2l2`)

**Tier:** 3 (structural guidance)
**Builds on:** spi1 L2 (PISO TX), spi1 L1 (SIPO RX), spi1 L3 (CS_N framing)
**New concept:** 4-phase state machine per bit; simultaneous TX and RX; `done` pulse

**Circuit:**
- Module name: `spi_master`
- Ports: `input clk, rst, start, [7:0] tx_data, miso` / `output mosi, sclk, cs_n, busy, [7:0] rx_data, done`
- Internal: `tx_shift[7:0], rx_shift[7:0], bit_cnt[2:0], sclk_r, phase[1:0]`
- 4 phases per bit (see Section 9.4 for full code)
- `assign sclk = sclk_r; assign mosi = tx_shift[7];`

**Clock-cycle trace to include in theory:**

```
Cycle:   1    2    3    4    5    6    7    8
Phase:   3    0    1    2    3    0    1    2
SCLK:    0    1    1    0    0    1    1    0
Action: hold rise hold fall hold rise hold fall
MOSI:   [bit7 stable...  →  shift→bit6  → ...]
MISO:   [sampled on phase 0...]
```

**Testbench approach:**
- Slave model preloads `8'hC3` on `cs_n_fall`, shifts out on `sclk_fall`
- MOSI capture register samples on `sclk_rise`
- `do_xfer(8'hAB)` → `repeat(100)` → verify `rx_data === 8'hC3` and `mosi_captured === 8'hAB`

**Expected output:**
```
PASS  received 0xC3 from slave
PASS  slave captured 0xAB on MOSI
PASS  cs_n deasserted after transfer
SPI master works!
```

---

#### spi2 L3 — 16-bit Multi-Byte SPI Transfer (`spi2l3`)

**Tier:** 3 (structural guidance)
**Builds on:** spi2 L2 (direct extension — widen registers to 16 bits)
**New concept:** CS_N stays low across multiple bytes; 4-bit bit counter

**Circuit:**
- Module name: `spi_master_16`
- Ports: same as `spi_master` but `tx_word[15:0]`, `rx_word[15:0]`, `bit_cnt[3:0]`
- Internal: `tx_shift[15:0], rx_shift[15:0], bit_cnt_r[3:0]`
- End condition: `bit_cnt_r == 4'd15` (not 3'd7)
- `assign mosi = tx_shift[15];` (MSB of wider register)

**Two-byte timeline to include:**

| Bit | 0–7 | 8–15 |
|---|---|---|
| cs_n | 0 (asserted) | 0 (still low) |
| MOSI source | tx_word[15:8] MSB first | tx_word[7:0] MSB first |
| After bit 15 | — | cs_n=1, done=1 |

**Testbench approach:**
- Slave model: `slave_tx[15:0]` preloads `16'hDEAD`
- `do_xfer16(16'hCAFE)` → `repeat(200)` → verify `rx_word === 16'hDEAD`

**Expected output:**
```
PASS  received 16'hDEAD from slave
PASS  slave captured 0xCAFE on MOSI
PASS  cs_n deasserted after 16-bit transfer
16-bit SPI burst works!
```

---

#### spi2 L4 — Portfolio: Parameterized SPI Master (`spi2l4`)

**Tier:** 5 (portfolio requirements)
**Builds on:** spi2 L2 (extend to 4 CPOL/CPHA modes)
**New concept:** SPI Mode 0–3; `parameter` keyword; CPOL/CPHA interaction

**Specification:**
- Module name: `spi_master_param`
- Parameters: `N_BITS=8, CPOL=0, CPHA=0, CLK_DIV=4`
- SCLK idles at `CPOL` when idle
- CPHA=0: sample on leading edge; CPHA=1: sample on trailing edge
- Full-duplex; `done` pulses exactly one clock after last bit

**All 4 modes table to include:**

| Mode | CPOL | CPHA | SCLK idle | Sample on |
|---|---|---|---|---|
| 0 | 0 | 0 | LOW | rising |
| 1 | 0 | 1 | LOW | falling |
| 2 | 1 | 0 | HIGH | falling |
| 3 | 1 | 1 | HIGH | rising |

**Hint type:** Design notes only — no implementation code

**Testbench:** Simple MISO=MOSI loopback; verify Mode 0 roundtrip

---

### 11.3 Module spi3 — SPI Slave Design

**File:** `static/lessons/modules/spi3.js`
**Level:** intermediate
**Icon:** 📥
**Purpose:** Build the other side of the bus — receive-only slave, full-duplex slave, loopback system.

---

#### spi3 L1 — SPI Slave Receiver (`spi3l1`)

**Tier:** 3 (structural guidance)
**Builds on:** spi1 L1 (SIPO), spi1 L3 (edge detection + bit counter)
**New concept:** Slave reacts to master SCLK, not its own clock; `rx_valid` pulse

**Circuit:**
- Module name: `spi_slave_rx`
- Ports: `input clk, rst, cs_n, sclk, mosi` / `output [7:0] rx_data, rx_valid`
- Internal: `shift_reg[7:0], bit_cnt[2:0], sclk_prev, sclk_rise`
- On rst/cs_n: clear all
- On sclk_rise: `shift_reg <= {shift_reg[6:0], mosi}`; if `bit_cnt==7`: latch `rx_data`, pulse `rx_valid`
- `rx_valid` clears on all other cycles

**Transaction timeline to include:**

| cs_n | SCLK edge | bit_cnt | rx_valid |
|---|---|---|---|
| 1→0 | — | reset to 0 | 0 |
| 0 | ↑ (1st) | 0→1 | 0 |
| 0 | ↑ (8th) | 7→0 | 1 (pulse) |
| 0→1 | — | reset to 0 | 0 |

**Testbench approach:**
- `spi_send_byte` task: manually clock SCLK with `repeat(4)` delays — 8 unrolled lines
- Use `always_ff` to latch `saved_rx` when `rx_valid` fires
- Send `8'hA5` and `8'h37`, verify each

**Expected output:**
```
PASS  received 0xA5 with rx_valid pulse
PASS  received 0x37 with rx_valid pulse
PASS  cs_n deassert clears rx_valid
SPI slave receiver works!
```

---

#### spi3 L2 — Full-Duplex SPI Slave (`spi3l2`)

**Tier:** 4 (behaviour spec)
**Builds on:** spi3 L1 (receiver) + spi1 L2 (PISO transmitter)
**New concept:** Simultaneous TX and RX; pre-load on CS_N fall; MISO driven LOW when idle

**CRITICAL:** Never use `1'bz` — use `assign miso = cs_n ? 1'b0 : tx_shift[7];`

**Circuit:**
- Module name: `spi_slave_fd`
- Ports: adds `input [7:0] tx_data` and `output miso` to spi_slave_rx
- Internal: adds `tx_shift[7:0], cs_n_prev, cs_n_fall, sclk_fall`
- On cs_n_fall: `tx_shift <= tx_data` (pre-load response)
- On sclk_fall: `tx_shift <= {tx_shift[6:0], 1'b0}` (shift MISO)
- `assign miso = cs_n ? 1'b0 : tx_shift[7];`

**Timing table to include:**

| Phase | SCLK | Slave drives MISO | Slave samples MOSI |
|---|---|---|---|
| Low (setup) | 0 | tx_shift[7] (stable) | — |
| Rising | ↑ | — | MOSI → shift_reg |
| High | 1 | tx_shift[7] (still) | — |
| Falling | ↓ | next bit ready | — |

**Testbench approach:**
- `spi_xfer` task: drives SCLK, sets MOSI, captures MISO per bit — 8 unrolled lines
- Set `tx_data = 8'hBE`, send `8'h5A`, verify MISO returns `8'hBE` and slave RX gets `8'h5A`

**Expected output:**
```
PASS  MISO returned 0xBE (slave tx_data)
PASS  slave received 0x5A on MOSI
PASS  MISO returned 0xF0 on second transfer
Full-duplex slave works!
```

---

#### spi3 L3 — Portfolio: SPI Master-Slave Loopback (`spi3l3`)

**Tier:** 5 (portfolio)
**Builds on:** spi2 L2 (`spi_master`) + spi3 L2 (`spi_slave_fd`)
**New concept:** Multi-module integration; top-level wiring of independently designed IPs

**Specification:**
- Module name: `spi_loopback`
- Instantiate `spi_master` and `spi_slave_fd`
- Wire: master MOSI → slave MOSI, master SCLK → slave SCLK, master CS_N → slave CS_N
- MISO: `assign miso_w = cs_n_w ? 1'b0 : miso_w_out;` (never tri-state)
- Ports: `clk, rst, start, tx_m[7:0], tx_s[7:0], done, rx_m[7:0], rx_s[7:0], rx_valid_s, busy`

**Testbench:**
- `do_loopback` task: set `tx_m` and `tx_s`, pulse `start`, `repeat(200)`
- Verify `rx_m === tx_s` and `last_rx_s === tx_m` for each pattern

**Common mistakes to address in theory:**
- Slave not pre-loaded before first SCLK (set `tx_s` before asserting `start`)
- MISO left floating — use `1'b0` pull-down

---

### 11.4 Module spi4 — SPI Applications

**File:** `static/lessons/modules/spi4.js`
**Level:** advanced
**Icon:** 🔬
**Purpose:** Apply the SPI master to real-world peripheral interfaces.

---

#### spi4 L1 — SPI Register File Interface (`spi4l1`)

**Tier:** 4 (behaviour spec)
**Builds on:** spi3 L1/L2 (slave receiver + MISO TX path)
**New concept:** Two-byte SPI register protocol; address/data framing; read vs write decode

**Protocol framing table:**

| Byte | Bit [7] | Bits [6:5] | Bits [4:0] |
|---|---|---|---|
| Byte 0 | rw (1=read) | reserved | addr[4:0] |
| Byte 1 (write) | write data[7:0] on MOSI | | |
| Byte 1 (read) | register value on MISO | | |

**Circuit:**
- Module name: `spi_regfile`
- Ports: `input clk, rst, cs_n, sclk, mosi` / `output miso, wr_valid, [2:0] wr_addr, [7:0] wr_data`
- **No multi-dim arrays** — use 8 separate `logic [7:0] reg0..reg7`
- State: `logic state` — 0=ADDR, 1=DATA
- On cs_n_fall: reset `bit_cnt`, `state=0`
- On bit 7 of ADDR: decode `rw_bit`, `addr[2:0]`, advance `state=1`, pre-load `tx_shift`
- On bit 7 of DATA (write): dispatch to correct register, pulse `wr_valid`
- `assign miso = cs_n ? 1'b0 : tx_shift[7];`

**Testbench approach:**
- `send8` helper task: 8 unrolled `mosi=d[N]; sclk 0→1` lines
- `recv8` helper task: 8 unrolled `sclk 0→1, d[N]=miso` lines
- `spi_write(addr, data)`: CS_N + send8(addr_byte) + send8(data)
- `spi_read(addr)`: CS_N + send8(addr_byte) + recv8(data)
- Test write then read back reg[3] and reg[5]

**Expected output:**
```
PASS  write reg[3]=0xAB wr_valid pulsed
PASS  read reg[3]=0xab
PASS  read reg[5]=0x7e
SPI register file works!
```

---

#### spi4 L2 — SPI ADC Interface (`spi4l2`)

**Tier:** 4 (behaviour spec)
**Builds on:** spi2 L2 (master 4-phase machine) — extend to 16-bit capture
**New concept:** Bit-field extraction; real ADC protocol framing (MCP3201-like)

**ADC protocol:**

| SCLK cycles | 1–2 | 3 | 4–15 | 16 |
|---|---|---|---|---|
| MISO | null (don't care) | start bit (0) | result[11:0] MSB first | end |

**Circuit:**
- Module name: `spi_adc_reader`
- Ports: `input clk, rst, start, miso` / `output sclk, cs_n, [11:0] result, valid, busy`
- Internal: `shift_reg[15:0], bit_cnt[4:0], sclk_r, phase[1:0]`
- Same 4-phase machine as `spi_master`, count 0–15
- On completion: `result <= shift_reg[12:1]` (skip 2 nulls + 1 start, skip end)
- Use `unique case (phase)` — not `case`

**Testbench approach:**
- ADC model: preloads `16'b1101_0101_0111_1000` on cs_n_fall (encodes `0xABC`)
- Shifts out on `sclk_fall` using `assign` for edge detect (never inline init)
- `do_conversion` task: `repeat(200)` then check `result === 12'hABC`

**Expected output:**
```
PASS  ADC result=0xabc (expected 0xABC)
PASS  cs_n deasserted after conversion
PASS  busy cleared after conversion
SPI ADC reader works!
```

---

#### spi4 L3 — Portfolio: SPI Flash Memory Controller (`spi4l3`)

**Tier:** 5 (portfolio)
**Builds on:** spi2 L2/L3 (multi-byte master), spi2 L4 (parameterized timing)
**New concept:** Command-based SPI protocol; polling; multi-state FSM; real-world flash timing

**Specification:**
- Module name: `spi_flash_ctrl`
- Implement READ DATA (`0x03`) and PAGE PROGRAM (`0x02`)
- PAGE PROGRAM requires WRITE ENABLE (`0x06`) first
- Poll Status Register (`0x05`) after write — loop until WIP bit = 0
- Parameter: `FLASH_CLK_DIV = 4`

**FSM states:**

| State | Action |
|---|---|
| IDLE | wait for `cmd_valid` |
| WREN | send `0x06`, pulse CS |
| CMD | send command opcode |
| ADDR | send 3 address bytes |
| DATA_TX | send N data bytes (write path) |
| DATA_RX | receive N bytes (read path) |
| STATUS_POLL | read `0x05`, check WIP bit; repeat if WIP=1 |
| DONE | pulse `done=1` |

**Hint type:** Design notes only — FSM state table + port list

**Testbench:** Minimal placeholder (full flash model is student's exercise)

---

#### spi4 L4 — Portfolio: SPI Multi-Peripheral Bus Controller (`spi4l4`)

**Tier:** 5 (portfolio)
**Builds on:** All previous SPI lessons
**New concept:** Round-robin arbitration; mutual exclusion of CS lines; idle gap enforcement

**Specification:**
- Module name: `spi_bus_ctrl`
- Parameters: `N_DEVS=4, CLK_DIV=4, N_BITS=8`
- Inputs: `req[3:0]` (request per device), `req_data[7:0]`, `req_dev[1:0]`
- Outputs: `ack, ack_dev[1:0], rd_data[7:0], cs_n[3:0], mosi, sclk`
- Round-robin: track `last_dev`, scan from `last_dev+1`
- Gap state: hold all CS_N high for ≥2 SCLK cycles between transactions
- Exactly one `cs_n[N]` bit low at a time

**FSM outline:**

| State | Action |
|---|---|
| IDLE | scan `req` for next device → SELECT |
| SELECT | assert `cs_n[cur_dev]=0`, load tx_data → TRANSFER |
| TRANSFER | run N_BITS-bit SPI engine → GAP |
| GAP | count idle cycles, pulse `ack` → IDLE |

**Certificate task to add:**
```javascript
'🎓 SPI Protocol Expert certificate unlocked — complete spi1 + spi2 + spi3 + spi4 to claim it',
```

**Testbench approach:**
- Use `logic [2:0] ack_cnt` in `always_ff` (not `int` — avoids non-blocking issues)
- Record which device served at each ack using separate `ack_order_0..3` registers
- `req = 4'b1111` → `repeat(2000)` → verify `ack_cnt >= 4` and `ack_order_0 === 8'd0`

---

## 12. Lesson ID Registry

All IDs must be globally unique across all curriculum modules.

| Module | IDs |
|---|---|
| msv1 | msv1l1, msv1l2, msv1l3 |
| msv2 | msv2l1, msv2l2, msv2l3, msv2l4 |
| msv3 | msv3l1, msv3l2, msv3l3, msv3l4, msv3l5 |
| spi1 | spi1l1, spi1l2, spi1l3 |
| spi2 | spi2l1, spi2l2, spi2l3, spi2l4 |
| spi3 | spi3l1, spi3l2, spi3l3 |
| spi4 | spi4l1, spi4l2, spi4l3, spi4l4 |

---

## 13. File Registration

### index.html (already done — do not re-add)

```html
<script src="/lessons/modules/spi1.js"></script>
<script src="/lessons/modules/spi2.js"></script>
<script src="/lessons/modules/spi3.js"></script>
<script src="/lessons/modules/spi4.js"></script>
<script src="/lessons/curriculum.js"></script>  <!-- these 4 BEFORE curriculum.js -->
```

### curriculum.js

The SPI modules register themselves via `window.CURRICULUM_MODULES.push(...)` in each JS file, so no separate edit to `curriculum.js` is needed — as long as the script tags appear before `curriculum.js` in `index.html`.

---

## 14. Voice and Tone Rules

- Write as if explaining to someone who programs but has never done hardware
- Use physical analogies: "a shift register is like a conveyor belt"
- Never use: "easy", "simple", "trivial", "just", "obviously"
- When genuinely hard: say so — "This one takes a few tries and that is completely normal"
- Portfolio lessons feel like real work: "This is a real interview question at hardware companies"
- End every chapter with forward momentum: "In spi3 you will build the slave that responds to this master"

---

## 15. Quality Checklist (Run Before Every Push)

```
[ ] All lesson IDs globally unique — check against ID registry above
[ ] Every lesson has all 8 fields: id, title, theory, tasks, hint, design, testbench, expected
[ ] Theory has NO complete working module (snippets only)
[ ] Theory has "Builds on: moduleX LN" callout
[ ] Theory has ASCII timing diagram for any serial/clocked concept
[ ] Hint has complete solution (or design notes only for T4/T5)
[ ] Design starter has ZERO synthesisable code
[ ] No for loop used silently — must be introduced with theory callout
[ ] No bare case — always unique case
[ ] No 1'bz anywhere — use 1'b0 for inactive output
[ ] No multi-dim arrays — use separate registers + if/else dispatch
[ ] No return in tasks — use repeat(N) then check after
[ ] No disable — use repeat(N) then check after
[ ] No ++ or -- operators — use = x + 1
[ ] No int in always_ff — use logic [N:0]
[ ] Testbench: logic only, no reg or wire
[ ] Testbench module named exactly tb
[ ] Testbench first line is `timescale 1ns/1ps
[ ] All $display assertion lines begin with PASS  or FAIL  (two spaces after)
[ ] expected[] substrings match verbatim output (lowercase hex from %h format)
[ ] Verilator timing note present in every lesson tasks array
[ ] index.html script tags already present — do not re-add
```

---

## 16. Adding New Lessons — Step-by-Step

To extend this series with a new lesson (e.g., `spi5l1`):

1. Create `static/lessons/modules/spi5.js` using the file skeleton:
   ```javascript
   (window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
     id: 'spi5',
     title: 'New Module Title',
     icon: '🔧',
     level: 'advanced',
     lessons: [ ... ]
   });
   ```
2. Assign a tier from the tier table (Section 10)
3. Write all 8 lesson fields following Sections 4–8
4. Run the quality checklist (Section 15)
5. Add `<script src="/lessons/modules/spi5.js"></script>` to `index.html` before `curriculum.js`
6. Update the ID registry (Section 12)
7. Push all changed files in one commit to the branch
