(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi1',
  title: 'SPI Protocol Fundamentals',
  icon: '🔌',
  level: 'beginner',
  lessons: [

    // ─── L1: SIPO Shift Register (Tier 1) ───────────────────────────────────
    {
      id: 'spi1l1',
      title: 'L1 — Serial-In Parallel-Out Shift Register',
      theory: `
<h2>The Building Block of SPI</h2>
<p>Every SPI transaction is built on one simple idea: a <strong>shift register</strong>.
Imagine a queue of 8 people — each clock tick, everyone steps one place forward and a new person joins the back.
After 8 ticks, the entire lineup has been replaced.</p>

<p>The <strong>SIPO (Serial-In Parallel-Out)</strong> shift register does exactly this with bits.
One bit arrives on <code>serial_in</code> each clock cycle.
After 8 cycles, all 8 bits are simultaneously visible on <code>data_out[7:0]</code>.
This is how an SPI slave receives a byte from the master.</p>

<pre class="code-block">// Shift left: drop MSB, insert new bit at bit 0
data_out &lt;= {data_out[6:0], serial_in};
// {A, B} concatenates A and B into one wider value
</pre>

<h3>How each clock changes data_out</h3>
<table class="truth-table">
<tr><th>Before (data_out)</th><th>serial_in</th><th>After (data_out)</th></tr>
<tr><td>8'b0000_0000</td><td>1</td><td>8'b0000_0001</td></tr>
<tr><td>8'b0000_0001</td><td>1</td><td>8'b0000_0011</td></tr>
<tr><td>8'b0000_0011</td><td>0</td><td>8'b0000_0110</td></tr>
<tr><td>8'b0000_0110</td><td>1</td><td>8'b0000_1101</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Direction</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>input</td><td>1</td><td>Clock — shift happens on rising edge</td></tr>
<tr><td>rst</td><td>input</td><td>1</td><td>Active-high synchronous reset</td></tr>
<tr><td>serial_in</td><td>input</td><td>1</td><td>One bit of serial data per clock</td></tr>
<tr><td>data_out</td><td>output</td><td>8</td><td>All 8 received bits visible in parallel</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module sipo_shift_reg (   ← module keyword + name + open paren',
        '── Line 2 ──  input  logic clk,          ← clock input, comma',
        '── Line 3 ──  input  logic rst,           ← active-high reset, comma',
        '── Line 4 ──  input  logic serial_in,     ← 1-bit serial input, comma',
        '── Line 5 ──  output logic [7:0] data_out ← 8-bit parallel output, NO comma',
        '── Line 6 ──  );                           ← close port list with );',
        '── Line 8 ──  always_ff @(posedge clk) begin',
        '── Line 9 ──  if (rst)  data_out <= 8\'b0;',
        '── Line 10 ── else  data_out <= {data_out[6:0], serial_in};   ← shift + insert',
        '── Line 11 ── end',
        '── Line 13 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module sipo_shift_reg (
  input  logic clk,             // line 2: system clock
  input  logic rst,             // line 3: synchronous reset, active-high
  input  logic serial_in,       // line 4: one bit arrives per clock
  output logic [7:0] data_out   // line 5: 8 parallel output bits, NO comma
);                              // line 6: close port list

  always_ff @(posedge clk) begin       // fire on every rising clock edge
    if (rst)                           // check reset first
      data_out <= 8'b0;                // clear all 8 bits
    else
      data_out <= {data_out[6:0], serial_in};  // shift left, new bit at bit 0
  end

endmodule`,
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
//        ^ drop bit 7, shift everything left, new bit enters at bit 0
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, serial_in;
  logic [7:0] data_out;

  sipo_shift_reg dut (
    .clk(clk),
    .rst(rst),
    .serial_in(serial_in),
    .data_out(data_out)
  );

  task automatic send_byte(input logic [7:0] data);
    for (int i = 0; i < 8; i++) begin
      serial_in = data[7-i];   // MSB first
      @(posedge clk); #1;
    end
  endtask

  initial begin
    $display("=== SIPO Shift Register Test ===");
    rst = 1; serial_in = 0;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    send_byte(8'hA5);
    if (data_out === 8'hA5)
      $display("PASS  sent 0xA5 -> data_out=0x%02h", data_out);
    else
      $display("FAIL  expected 0xA5 got 0x%02h", data_out);

    send_byte(8'hFF);
    if (data_out === 8'hFF)
      $display("PASS  sent 0xFF -> data_out=0x%02h", data_out);
    else
      $display("FAIL  expected 0xFF got 0x%02h", data_out);

    rst = 1; @(posedge clk); #1; rst = 0;
    if (data_out === 8'h00)
      $display("PASS  reset clears register -> data_out=0x%02h", data_out);
    else
      $display("FAIL  reset did not clear, got 0x%02h", data_out);

    $display("Shift register works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  sent 0xA5',
        'PASS  sent 0xFF',
        'PASS  reset clears register',
        'Shift register works!'
      ]
    },

    // ─── L2: PISO Shift Register (Tier 2) ───────────────────────────────────
    {
      id: 'spi1l2',
      title: 'L2 — Parallel-In Serial-Out Shift Register',
      theory: `
<h2>Sending Data Over SPI — The PISO Register</h2>
<p>In the last lesson the slave assembled a byte from serial bits (SIPO).
Now flip that around: the <strong>PISO (Parallel-In Serial-Out)</strong> register takes a full byte
and sends it out one bit at a time. This is what the SPI master uses on its MOSI line.</p>

<p>The key control signal is <code>load</code>.
When <code>load = 1</code>, the register captures the full parallel byte on the next clock edge.
When <code>load = 0</code>, each clock tick shifts the register left — the MSB appears on <code>serial_out</code>.
SPI always sends MSB first.</p>

<pre class="code-block">// Load or shift
if (load)
  shift_reg &lt;= data_in;              // capture entire byte at once
else
  shift_reg &lt;= {shift_reg[6:0], 1'b0};  // shift left, pad LSB with 0

assign serial_out = shift_reg[7];    // MSB is always the bit being sent
</pre>

<h3>Timing trace for sending 0b1011_0010</h3>
<table class="truth-table">
<tr><th>Cycle</th><th>load</th><th>shift_reg</th><th>serial_out</th></tr>
<tr><td>0</td><td>1</td><td>1011_0010</td><td>1 (bit 7)</td></tr>
<tr><td>1</td><td>0</td><td>0110_0100</td><td>0 (bit 6)</td></tr>
<tr><td>2</td><td>0</td><td>1100_1000</td><td>1 (bit 5)</td></tr>
<tr><td>3</td><td>0</td><td>1001_0000</td><td>1 (bit 4)</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>1</td><td>Clock</td></tr>
<tr><td>rst</td><td>in</td><td>1</td><td>Active-high synchronous reset</td></tr>
<tr><td>load</td><td>in</td><td>1</td><td>1 = load data_in; 0 = shift out</td></tr>
<tr><td>data_in</td><td>in</td><td>8</td><td>Parallel byte to transmit</td></tr>
<tr><td>serial_out</td><td>out</td><td>1</td><td>MOSI — MSB exits first</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ── module declaration piso_shift_reg with opening paren',
        '── Line 2 ── clock input port, with comma',
        '── Line 3 ── active-high reset port, with comma',
        '── Line 4 ── load enable port — 1=load parallel, 0=shift, with comma',
        '── Line 5 ── 8-bit data_in input port, with comma',
        '── Line 6 ── 1-bit serial_out output port, no comma',
        '── Line 7 ── ); close port list',
        '── Line 9 ── declare internal logic [7:0] shift_reg',
        '── Line 11 ── always_ff block triggered on posedge clk',
        '── Line 12 ── if rst: clear shift_reg to 8\'b0',
        '── Line 13 ── else if load: load data_in into shift_reg',
        '── Line 14 ── else: shift left with 1\'b0 at LSB',
        '── Line 17 ── assign serial_out = shift_reg[7]',
        '── Line 19 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module piso_shift_reg (
  input  logic clk,
  input  logic rst,
  input  logic load,           // 1 = load parallel data; 0 = shift out
  input  logic [7:0] data_in,  // parallel byte to transmit
  output logic serial_out      // MSB exits first — connect this to MOSI
);

  logic [7:0] shift_reg;

  always_ff @(posedge clk) begin
    if (rst)
      shift_reg <= 8'b0;
    else if (load)
      shift_reg <= data_in;                   // capture the whole byte
    else
      shift_reg <= {shift_reg[6:0], 1'b0};    // shift left, fill LSB with 0
  end

  assign serial_out = shift_reg[7];           // MSB is always the next bit to send

endmodule`,
      design:
`// Type the piso_shift_reg module here. See Theory for the concept.
//
// Ports: clk, rst, load, data_in[7:0], serial_out
// Internal: logic [7:0] shift_reg
//
// Behaviour:
//   rst=1   -> shift_reg = 0
//   load=1  -> shift_reg = data_in
//   else    -> shift_reg = {shift_reg[6:0], 1'b0}   (shift left)
//   serial_out = shift_reg[7]   (MSB always on output)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, load;
  logic [7:0] data_in;
  logic serial_out;
  logic [7:0] captured;

  piso_shift_reg dut (
    .clk(clk), .rst(rst), .load(load),
    .data_in(data_in), .serial_out(serial_out)
  );

  task automatic send_and_capture(
    input  logic [7:0] data,
    output logic [7:0] recv
  );
    // Load the byte
    data_in = data; load = 1;
    @(posedge clk); #1;  // shift_reg = data, serial_out = data[7]
    load = 0;
    // Capture 8 bits MSB first
    for (int i = 0; i < 8; i++) begin
      recv[7-i] = serial_out;   // capture current MSB
      @(posedge clk); #1;       // shift to next bit
    end
  endtask

  initial begin
    $display("=== PISO Shift Register Test ===");
    rst = 1; load = 0; data_in = 8'h00;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    send_and_capture(8'hA5, captured);
    if (captured === 8'hA5)
      $display("PASS  loaded 0xA5 -> serial captured 0x%02h", captured);
    else
      $display("FAIL  expected 0xA5 captured 0x%02h", captured);

    send_and_capture(8'h3C, captured);
    if (captured === 8'h3C)
      $display("PASS  loaded 0x3C -> serial captured 0x%02h", captured);
    else
      $display("FAIL  expected 0x3C captured 0x%02h", captured);

    rst = 1; @(posedge clk); #1; rst = 0;
    if (serial_out === 1'b0)
      $display("PASS  reset clears serial_out");
    else
      $display("FAIL  reset did not clear serial_out");

    $display("PISO register works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  loaded 0xA5',
        'PASS  loaded 0x3C',
        'PASS  reset clears serial_out',
        'PISO register works!'
      ]
    },

    // ─── L3: SPI Byte Counter (Tier 3) ──────────────────────────────────────
    {
      id: 'spi1l3',
      title: 'L3 — SPI Frame & Bit Counter',
      theory: `
<h2>Keeping Track: CS_N and Bit Position</h2>
<p>SPI uses a <strong>Chip Select</strong> signal (<code>cs_n</code>, active-low) to frame each transaction.
When <code>cs_n</code> goes LOW the slave wakes up and counts incoming SCLK edges.
After exactly 8 edges it knows one byte has arrived.
When <code>cs_n</code> goes HIGH the transaction ends and the counter resets.</p>

<p>Your design challenge: detect SCLK rising edges using the system clock, count them when
<code>cs_n</code> is asserted, and pulse <code>byte_done</code> after every 8th edge.</p>

<pre class="code-block">// Rising-edge strobe — one system-clock wide
always_ff @(posedge clk) sclk_prev &lt;= sclk;
assign sclk_rise = sclk &amp; ~sclk_prev;
</pre>

<h3>Signal behaviour table</h3>
<table class="truth-table">
<tr><th>cs_n</th><th>sclk_rise</th><th>bit_idx action</th><th>byte_done</th></tr>
<tr><td>1</td><td>X</td><td>reset to 0</td><td>0</td></tr>
<tr><td>0</td><td>0</td><td>hold</td><td>hold low</td></tr>
<tr><td>0</td><td>1 (idx 0–6)</td><td>increment</td><td>0</td></tr>
<tr><td>0</td><td>1 (idx 7)</td><td>reset to 0</td><td>1 (one pulse)</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>System clock (much faster than SCLK)</td></tr>
<tr><td>rst</td><td>in</td><td>Active-high synchronous reset</td></tr>
<tr><td>cs_n</td><td>in</td><td>Chip Select active-low — 0 = transaction active</td></tr>
<tr><td>sclk</td><td>in</td><td>SPI clock from master</td></tr>
<tr><td>bit_idx</td><td>out [2:0]</td><td>Current bit position (0–7)</td></tr>
<tr><td>byte_done</td><td>out</td><td>Pulses high for one cycle after bit 7</td></tr>
</table>

<p>The edge-detection pattern is new — this one takes a few tries and that is completely normal.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_byte_counter with ports: clk, rst, cs_n, sclk, bit_idx[2:0], byte_done',
        'Declare two internal logic signals: sclk_prev and sclk_rise',
        'Write an always_ff on posedge clk that registers sclk_prev <= sclk',
        'Write a continuous assign: sclk_rise = sclk & ~sclk_prev   (rising-edge strobe)',
        'Write a second always_ff block that:',
        '  — on rst or cs_n: clears bit_idx and byte_done',
        '  — on sclk_rise when bit_idx === 7: pulses byte_done, resets bit_idx to 0',
        '  — on sclk_rise otherwise: increments bit_idx, clears byte_done',
        '  — else: clears byte_done (it only stays high for one cycle)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_byte_counter (
  input  logic       clk,
  input  logic       rst,
  input  logic       cs_n,
  input  logic       sclk,
  output logic [2:0] bit_idx,
  output logic       byte_done
);

  logic sclk_prev;
  logic sclk_rise;

  always_ff @(posedge clk) sclk_prev <= sclk;

  assign sclk_rise = sclk & ~sclk_prev;  // one-cycle strobe on rising edge

  always_ff @(posedge clk) begin
    if (rst || cs_n) begin
      bit_idx   <= 3'd0;
      byte_done <= 1'b0;
    end else if (sclk_rise) begin
      if (bit_idx === 3'd7) begin
        bit_idx   <= 3'd0;
        byte_done <= 1'b1;   // pulse on the 8th clock
      end else begin
        bit_idx   <= bit_idx + 1;
        byte_done <= 1'b0;
      end
    end else begin
      byte_done <= 1'b0;     // clear between pulses
    end
  end

endmodule`,
      design:
`// Type the spi_byte_counter module here. See Theory for the concept.
//
// Ports: clk, rst, cs_n, sclk, bit_idx[2:0], byte_done
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;   // fast system clock

  logic rst, cs_n, sclk;
  logic [2:0] bit_idx;
  logic byte_done;

  spi_byte_counter dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .bit_idx(bit_idx), .byte_done(byte_done)
  );

  task automatic spi_clk_pulse;
    sclk = 1; repeat(4) @(posedge clk); #1;
    sclk = 0; repeat(4) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Byte Counter Test ===");
    rst = 1; cs_n = 1; sclk = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Send 7 SCLK pulses — bit_idx should reach 7
    cs_n = 0;
    repeat(7) spi_clk_pulse();
    if (bit_idx === 3'd7)
      $display("PASS  bit_idx=7 after 7 clocks in frame");
    else
      $display("FAIL  bit_idx=%0d expected 7", bit_idx);

    // 8th SCLK pulse — sample byte_done right after rising edge
    sclk = 1;
    @(posedge clk); #1;   // sclk_rise fires here — byte_done pulses
    if (byte_done === 1'b1)
      $display("PASS  byte_done pulses on 8th SCLK");
    else
      $display("FAIL  byte_done=%0b expected 1", byte_done);
    repeat(3) @(posedge clk); #1;
    sclk = 0; repeat(4) @(posedge clk); #1;

    // cs_n deassert resets bit_idx
    cs_n = 1;
    repeat(2) @(posedge clk); #1;
    if (bit_idx === 3'd0)
      $display("PASS  cs_n deassert resets bit_idx to 0");
    else
      $display("FAIL  bit_idx=%0d expected 0 after cs_n deassert", bit_idx);

    $display("SPI frame counter works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  bit_idx=7 after 7 clocks',
        'PASS  byte_done pulses on 8th SCLK',
        'PASS  cs_n deassert resets bit_idx',
        'SPI frame counter works!'
      ]
    }

  ] // end lessons
});
