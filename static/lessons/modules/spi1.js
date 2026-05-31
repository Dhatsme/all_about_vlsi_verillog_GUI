(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi1',
  title: 'SPI Protocol Fundamentals',
  icon: '🔌',
  level: 'beginner',
  lessons: [

    // ─── L1: SIPO Shift Register (Tier 1 — every line spelled out) ──────────
    {
      id: 'spi1l1',
      title: 'L1 — Serial-In Parallel-Out Shift Register',
      theory: `
<h2>The Building Block of SPI</h2>
<p>Every SPI transaction is built on one simple idea: a <strong>shift register</strong>.
Imagine a queue of 8 people standing in a line — on each clock tick, everyone moves one
step forward and a new person joins the back. After 8 ticks, the entire queue has been
replaced, and you can look at all 8 people at once. That is serial-in, parallel-out.</p>

<p>The <strong>SIPO (Serial-In Parallel-Out)</strong> shift register does exactly this with bits.
One bit arrives on <code>serial_in</code> each clock cycle.
After 8 cycles all 8 bits are simultaneously visible on <code>data_out[7:0]</code>.
This is how an SPI slave assembles a byte sent by the master.</p>

<h3>Why serial? The wire-count problem</h3>
<p>Sending 8 bits in parallel needs 8 data wires — one per bit. That is fine on a chip
but impractical between chips on a PCB. SPI solves this by sending bits one at a time
over a <strong>single wire (MOSI)</strong>, using a clock wire to say "sample this bit now."
The four SPI wires are:</p>
<ul>
  <li><strong>SCLK</strong> — Serial Clock, driven by the master</li>
  <li><strong>MOSI</strong> — Master Out Slave In — data from master to slave</li>
  <li><strong>MISO</strong> — Master In Slave Out — data from slave to master</li>
  <li><strong>CS_N</strong> — Chip Select, active-low — frames the transaction</li>
</ul>
<p>The SIPO register sits on the slave's MOSI line. Every time the master pulses SCLK,
the slave samples MOSI and shifts the new bit into <code>data_out</code>. After 8 pulses
the slave holds a complete byte.</p>

<h3>Breaking down the shift expression</h3>
<pre class="code-block">data_out &lt;= {data_out[6:0], serial_in};
</pre>
<p>This single line does three things at once:</p>
<ul>
  <li><code>data_out[6:0]</code> — take the current bits 6 down to 0 (drop bit 7, it has been sent)</li>
  <li><code>serial_in</code> — the new bit arriving from MOSI</li>
  <li><code>{ , }</code> — concatenate them into a new 8-bit value: old bits move left, new bit enters at position 0</li>
</ul>
<p>After 8 clock cycles of receiving bits 7, 6, 5 … 0 in that order, <code>data_out</code>
holds the full original byte. The first bit received ends up at bit 7 (MSB), the last
bit received sits at bit 0 (LSB).</p>

<h3>Full 8-cycle trace — receiving 8'hA5 (10100101)</h3>
<table class="truth-table">
<tr><th>Cycle</th><th>serial_in</th><th>data_out after shift</th></tr>
<tr><td>reset</td><td>—</td><td>0000_0000</td></tr>
<tr><td>1 (bit 7)</td><td>1</td><td>0000_0001</td></tr>
<tr><td>2 (bit 6)</td><td>0</td><td>0000_0010</td></tr>
<tr><td>3 (bit 5)</td><td>1</td><td>0000_0101</td></tr>
<tr><td>4 (bit 4)</td><td>0</td><td>0000_1010</td></tr>
<tr><td>5 (bit 3)</td><td>0</td><td>0001_0100</td></tr>
<tr><td>6 (bit 2)</td><td>1</td><td>0010_1001</td></tr>
<tr><td>7 (bit 1)</td><td>0</td><td>0101_0010</td></tr>
<tr><td>8 (bit 0)</td><td>1</td><td>1010_0101  ← 0xA5 ✓</td></tr>
</table>

<h3>Why non-blocking assignment (&lt;=)?</h3>
<p>Inside <code>always_ff</code> you must use <code>&lt;=</code> (non-blocking).
This tells the simulator: <em>compute the new value now, but write it only after all
always_ff blocks in this time step have finished evaluating.</em>
If you used <code>=</code> (blocking), one always_ff block could overwrite a value that
another block still needs to read, causing race conditions that are notoriously hard
to debug in hardware.</p>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Direction</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>input</td><td>1</td><td>Clock — shift happens on every rising edge</td></tr>
<tr><td>rst</td><td>input</td><td>1</td><td>Active-high synchronous reset — clears all bits</td></tr>
<tr><td>serial_in</td><td>input</td><td>1</td><td>One bit of MOSI data per clock</td></tr>
<tr><td>data_out</td><td>output</td><td>8</td><td>All 8 received bits visible in parallel</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module sipo_shift_reg (         ← module keyword + name + open paren',
        '── Line 2 ──  input  logic clk,               ← clock input, comma',
        '── Line 3 ──  input  logic rst,               ← active-high reset, comma',
        '── Line 4 ──  input  logic serial_in,         ← 1-bit serial input, comma',
        '── Line 5 ──  output logic [7:0] data_out     ← 8-bit parallel output, NO comma',
        '── Line 6 ──  );                               ← close port list with );',
        '── Line 8 ──  always_ff @(posedge clk) begin',
        "── Line 9 ──  if (rst)  data_out <= 8'b0;    ← clear all 8 bits on reset",
        '── Line 10 ── else  data_out <= {data_out[6:0], serial_in};  ← shift + insert new bit',
        '── Line 11 ── end',
        '── Line 13 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module sipo_shift_reg (
  input  logic       clk,        // line 2: system clock
  input  logic       rst,        // line 3: synchronous reset, active-high
  input  logic       serial_in,  // line 4: one bit arrives per clock
  output logic [7:0] data_out    // line 5: 8 parallel output bits — NO comma on last port
);

  always_ff @(posedge clk) begin
    if (rst)                                   // reset takes priority
      data_out <= 8'b0;                        // clear all 8 bits
    else
      data_out <= {data_out[6:0], serial_in};  // shift left, new bit enters at bit 0
  end

endmodule`,
      design:
`// Type the sipo_shift_reg module here.
// Read Theory first — it explains the shift operation.
//
// Ports:
//   input  logic       clk        — rising edge triggers the shift
//   input  logic       rst        — active-high synchronous reset
//   input  logic       serial_in  — one bit of SPI data per clock
//   output logic [7:0] data_out   — all 8 bits visible after 8 clocks
//
// Key line:  data_out <= {data_out[6:0], serial_in}
//            ^ keep old bits 6:0, shift left, new bit enters at position 0
//
// Delete this comment block and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz system clock

  logic       rst, serial_in;
  logic [7:0] data_out;

  sipo_shift_reg dut (
    .clk(clk),
    .rst(rst),
    .serial_in(serial_in),
    .data_out(data_out)
  );

  // Send 8 bits MSB-first — unrolled, no for loop
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

    // ─── L2: PISO Shift Register (Tier 2 — line markers, less text) ─────────
    {
      id: 'spi1l2',
      title: 'L2 — Parallel-In Serial-Out Shift Register',
      theory: `
<h2>Sending Data Over SPI — The PISO Register</h2>
<p>The last lesson built the <em>receive</em> side: a SIPO register that assembles serial bits
into a parallel byte. Now flip that around. The <strong>PISO (Parallel-In Serial-Out)</strong>
register takes a full byte and sends it out one bit at a time.
This is what the SPI master uses on its MOSI line — and what a slave uses on its MISO line
to send a reply back.</p>

<p>Think of it like a printer queue: you hand over a whole document (parallel load),
then pages come out one at a time (serial out). The queue empties from the front —
that is the MSB — and keeps going until all 8 bits have been sent.</p>

<h3>PISO vs SIPO — mirror images</h3>
<p>SIPO and PISO are complementary circuits. In a full SPI system they work as a pair:</p>
<ul>
  <li>The <strong>master</strong> uses PISO to shift a byte out onto MOSI bit by bit</li>
  <li>The <strong>slave</strong> uses SIPO to shift those bits from MOSI back into a parallel byte</li>
  <li>Simultaneously, the slave's PISO pushes its own byte onto MISO while the master's SIPO collects it</li>
</ul>
<p>This is why SPI is called <em>full-duplex</em> — both sides transmit and receive at the same time,
driven by the same SCLK.</p>

<h3>The load-then-shift sequence</h3>
<p>The key control signal is <code>load</code>.
When <code>load = 1</code>, the register captures the full parallel byte on the next rising edge.
When <code>load = 0</code>, each rising edge shifts the register left —
the MSB appears on <code>serial_out</code>.
SPI always sends the MSB first by convention.</p>

<pre class="code-block">// Three-way priority in one always_ff block
if (rst)       shift_reg &lt;= 8'b0;
else if (load) shift_reg &lt;= data_in;                // capture whole byte
else           shift_reg &lt;= {shift_reg[6:0], 1'b0}; // shift left, 0 fills LSB

assign serial_out = shift_reg[7];  // MSB is always the bit on the wire
</pre>

<p>Notice the shift direction: <code>{shift_reg[6:0], 1'b0}</code> moves bits 6–0 up to positions 7–1
and fills position 0 with zero. After each clock, bit 7 has been sent and bit 6 takes its place.
We pad with <code>1'b0</code> because the master ignores whatever spills past bit 0 — it already
knows the transfer is done after 8 edges.</p>

<h3>Why assign for serial_out, not always_ff?</h3>
<p><code>assign serial_out = shift_reg[7]</code> is a <em>continuous assignment</em> — it updates
immediately whenever <code>shift_reg</code> changes, with zero extra delay.
If instead you registered it with <code>always_ff</code>, <code>serial_out</code> would lag one clock
behind the shift, causing the slave to sample the wrong bit.
Always drive combinational outputs with <code>assign</code>.</p>

<h3>Full 8-cycle trace — sending 8'hB2 (10110010)</h3>
<table class="truth-table">
<tr><th>Cycle</th><th>load</th><th>shift_reg</th><th>serial_out (MSB)</th></tr>
<tr><td>0 (load)</td><td>1</td><td>1011_0010</td><td>1  — bit 7</td></tr>
<tr><td>1</td><td>0</td><td>0110_0100</td><td>0  — bit 6</td></tr>
<tr><td>2</td><td>0</td><td>1100_1000</td><td>1  — bit 5</td></tr>
<tr><td>3</td><td>0</td><td>1001_0000</td><td>1  — bit 4</td></tr>
<tr><td>4</td><td>0</td><td>0010_0000</td><td>0  — bit 3</td></tr>
<tr><td>5</td><td>0</td><td>0100_0000</td><td>0  — bit 2</td></tr>
<tr><td>6</td><td>0</td><td>1000_0000</td><td>1  — bit 1</td></tr>
<tr><td>7</td><td>0</td><td>0000_0000</td><td>0  — bit 0  ← transfer complete</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>1</td><td>Clock</td></tr>
<tr><td>rst</td><td>in</td><td>1</td><td>Active-high synchronous reset</td></tr>
<tr><td>load</td><td>in</td><td>1</td><td>1 = capture data_in; 0 = shift out MSB-first</td></tr>
<tr><td>data_in</td><td>in</td><td>8</td><td>Parallel byte to transmit</td></tr>
<tr><td>serial_out</td><td>out</td><td>1</td><td>MSB exits first — connect to MOSI</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ── module declaration: piso_shift_reg with opening paren',
        '── Line 2 ── clock input port, comma',
        '── Line 3 ── active-high reset port, comma',
        '── Line 4 ── load enable port (1=capture, 0=shift), comma',
        '── Line 5 ── 8-bit data_in input port, comma',
        '── Line 6 ── 1-bit serial_out output port, NO comma',
        '── Line 7 ── ); to close port list',
        '── Line 9 ── declare internal 8-bit register: shift_reg',
        '── Line 11 ── always_ff block on posedge clk',
        "── Line 12 ── if rst: clear shift_reg to 8'b0",
        '── Line 13 ── else if load: capture data_in into shift_reg',
        "── Line 14 ── else: shift left, pad LSB with 1'b0",
        '── Line 17 ── assign serial_out = shift_reg[7]   ← MSB is the outgoing bit',
        '── Line 19 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module piso_shift_reg (
  input  logic       clk,
  input  logic       rst,
  input  logic       load,          // 1 = capture parallel data; 0 = shift out
  input  logic [7:0] data_in,       // parallel byte to transmit
  output logic       serial_out     // MSB exits first — connect this to MOSI
);

  logic [7:0] shift_reg;

  always_ff @(posedge clk) begin
    if (rst)
      shift_reg <= 8'b0;
    else if (load)
      shift_reg <= data_in;                    // capture the whole byte at once
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
//   rst=1   -> shift_reg = 8'b0
//   load=1  -> shift_reg = data_in
//   else    -> shift_reg = {shift_reg[6:0], 1'b0}   (shift left)
//   serial_out = shift_reg[7]   (MSB always on output)
//
// Delete this comment block and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, load;
  logic [7:0] data_in;
  logic       serial_out;
  logic [7:0] captured;

  piso_shift_reg dut (
    .clk(clk), .rst(rst), .load(load),
    .data_in(data_in), .serial_out(serial_out)
  );

  // Load then capture 8 serial bits — unrolled, no for loop
  task automatic send_and_capture(
    input  logic [7:0] data,
    output logic [7:0] recv
  );
    data_in = data; load = 1;
    @(posedge clk); #1;
    load = 0;
    recv[7] = serial_out; @(posedge clk); #1;
    recv[6] = serial_out; @(posedge clk); #1;
    recv[5] = serial_out; @(posedge clk); #1;
    recv[4] = serial_out; @(posedge clk); #1;
    recv[3] = serial_out; @(posedge clk); #1;
    recv[2] = serial_out; @(posedge clk); #1;
    recv[1] = serial_out; @(posedge clk); #1;
    recv[0] = serial_out; @(posedge clk); #1;
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

    // ─── L3: SPI Frame & Bit Counter (Tier 3 — structural guidance) ─────────
    {
      id: 'spi1l3',
      title: 'L3 — SPI Frame & Bit Counter',
      theory: `
<h2>Keeping Track: CS_N and Bit Position</h2>
<p>SPI uses a <strong>Chip Select</strong> signal (<code>cs_n</code>, active-low) to frame each transaction.
When <code>cs_n</code> goes LOW, the slave wakes up and starts counting incoming SCLK edges.
After exactly 8 edges, one complete byte has arrived.
When <code>cs_n</code> goes HIGH again, the transaction ends and the counter resets to zero,
ready for the next byte.</p>

<p>This module is the <em>bookkeeper</em> of the slave — it does not touch the data itself.
It just watches the SPI clock, counts edges, and signals when a full byte is ready.
Other modules (like the SIPO from L1) use <code>bit_idx</code> to know which bit they are on,
and watch for <code>byte_done</code> to latch the completed byte.</p>

<h3>The clock domain problem</h3>
<p>Your slave runs on a fast <em>system clock</em> that might be 50 MHz or 100 MHz.
The SPI master's SCLK is far slower — often 1–10 MHz.
That means one SCLK period spans <strong>many</strong> system clock cycles.</p>
<p>You cannot write <code>always_ff @(posedge sclk)</code> because Verilator and most synthesis
tools require all flip-flops in a design to share one clock domain.
Instead, keep everything clocked by <code>clk</code> and <strong>detect</strong> SCLK edges by
comparing consecutive samples:</p>

<pre class="code-block">// Sample SCLK every system clock
always_ff @(posedge clk) sclk_prev &lt;= sclk;

// sclk_rise is HIGH for exactly one system clock — the cycle after SCLK rises
assign sclk_rise = sclk &amp; ~sclk_prev;
</pre>

<p>When <code>sclk</code> is 1 <em>now</em> and was 0 <em>last cycle</em>, the AND gate fires: <code>1 &amp; ~0 = 1</code>.
Every other cycle it stays 0. This gives you a precise, single-clock-wide strobe
that you can safely use inside <code>always_ff @(posedge clk)</code>.</p>

<h3>A complete transaction walkthrough</h3>
<p>Here is what happens cycle by cycle when the master sends one byte:</p>
<ul>
  <li><strong>Before transaction:</strong> <code>cs_n = 1</code>, counter holds at 0, <code>byte_done = 0</code></li>
  <li><strong>cs_n falls LOW:</strong> counter clears (already 0), slave is now listening</li>
  <li><strong>SCLK edges 1–7:</strong> each <code>sclk_rise</code> increments <code>bit_idx</code> from 0 to 6</li>
  <li><strong>SCLK edge 8:</strong> <code>bit_idx</code> is 7, so instead of incrementing: reset it to 0 and pulse <code>byte_done = 1</code></li>
  <li><strong>Next system clock:</strong> <code>byte_done</code> falls back to 0 automatically (the else branch)</li>
  <li><strong>cs_n rises HIGH:</strong> counter resets, slave stops listening</li>
</ul>

<h3>Why byte_done is only one clock wide</h3>
<p>A <em>pulse</em> (one clock wide) is easier for downstream logic than a <em>level</em> (stays high).
If <code>byte_done</code> stayed high, any register watching it would latch the byte on
<em>every</em> clock until it fell — potentially many spurious captures.
A single-cycle pulse fires exactly once and forces the consumer to act immediately.
The key is the <code>else byte_done &lt;= 1'b0</code> at the bottom of the always_ff block —
it clears <code>byte_done</code> on every cycle that is not the 8th edge.</p>

<h3>Signal behaviour summary</h3>
<table class="truth-table">
<tr><th>cs_n</th><th>sclk_rise</th><th>bit_idx action</th><th>byte_done</th></tr>
<tr><td>1</td><td>X</td><td>reset to 0</td><td>0</td></tr>
<tr><td>0</td><td>0</td><td>hold</td><td>0</td></tr>
<tr><td>0</td><td>1  (idx 0–6)</td><td>increment</td><td>0</td></tr>
<tr><td>0</td><td>1  (idx 7)</td><td>reset to 0</td><td>1  (one pulse only)</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>System clock — much faster than SCLK</td></tr>
<tr><td>rst</td><td>in</td><td>Active-high synchronous reset</td></tr>
<tr><td>cs_n</td><td>in</td><td>Chip Select active-low — 0 = transaction in progress</td></tr>
<tr><td>sclk</td><td>in</td><td>SPI clock from master — sampled, not used as clock</td></tr>
<tr><td>bit_idx</td><td>out [2:0]</td><td>Current bit position 0–7</td></tr>
<tr><td>byte_done</td><td>out</td><td>Pulses HIGH for exactly one system clock after bit 7</td></tr>
</table>

<p>The edge-detection pattern is new — this one takes a few tries and that is completely normal.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_byte_counter with ports: clk, rst, cs_n, sclk, bit_idx[2:0], byte_done',
        'Declare two internal logic signals: sclk_prev and sclk_rise',
        'Write a single-line always_ff on posedge clk: sclk_prev <= sclk',
        'Write a continuous assign: sclk_rise = sclk & ~sclk_prev',
        'Write a second always_ff block with this priority logic:',
        '  — rst or cs_n asserted: clear bit_idx to 0, byte_done to 0',
        '  — sclk_rise and bit_idx === 7: set byte_done=1, reset bit_idx to 0',
        '  — sclk_rise otherwise: increment bit_idx by 1, set byte_done=0',
        '  — else: set byte_done=0 (clears itself every non-pulse cycle)',
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

  assign sclk_rise = sclk & ~sclk_prev;

  always_ff @(posedge clk) begin
    if (rst || cs_n) begin
      bit_idx   <= 3'd0;
      byte_done <= 1'b0;
    end else if (sclk_rise) begin
      if (bit_idx === 3'd7) begin
        bit_idx   <= 3'd0;
        byte_done <= 1'b1;
      end else begin
        bit_idx   <= bit_idx + 1;
        byte_done <= 1'b0;
      end
    end else begin
      byte_done <= 1'b0;
    end
  end

endmodule`,
      design:
`// Type the spi_byte_counter module here. See Theory for the concept.
//
// Ports: clk, rst, cs_n, sclk, bit_idx[2:0], byte_done
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;   // fast system clock (4 ns period)

  logic       rst, cs_n, sclk;
  logic [2:0] bit_idx;
  logic       byte_done;

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

    // 7 SCLK pulses — bit_idx should reach 7
    cs_n = 0;
    repeat(7) spi_clk_pulse();
    if (bit_idx === 3'd7)
      $display("PASS  bit_idx=7 after 7 clocks in frame");
    else
      $display("FAIL  bit_idx=%0d expected 7", bit_idx);

    // 8th SCLK rising edge — byte_done fires
    sclk = 1;
    @(posedge clk); #1;
    if (byte_done === 1'b1)
      $display("PASS  byte_done pulses on 8th SCLK");
    else
      $display("FAIL  byte_done=%0b expected 1", byte_done);
    repeat(3) @(posedge clk); #1;
    sclk = 0; repeat(4) @(posedge clk); #1;

    // CS_N deassert resets bit_idx
    cs_n = 1;
    repeat(2) @(posedge clk); #1;
    if (bit_idx === 3'd0)
      $display("PASS  cs_n deassert resets bit_idx to 0");
    else
      $display("FAIL  bit_idx=%0d expected 0", bit_idx);

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
