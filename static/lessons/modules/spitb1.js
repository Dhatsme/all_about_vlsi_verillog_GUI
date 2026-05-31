(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb1',
  title: 'SPI Testbench Foundations',
  icon: '🧪',
  level: 'intermediate',
  lessons: [

    // ─── L1: SIPO Testbench (Tier 1) ──────────────────────────────────────
    {
      id: 'spitb1l1',
      title: 'L1 — Writing Your First SPI Testbench',
      theory: `
<h2>What Is a Testbench?</h2>
<p>In hardware design a <strong>testbench</strong> is a simulation wrapper that sits around
your design (the DUT — Device Under Test), drives stimulus into it, and checks that every
output is correct. Think of it as a robot engineer: it plugs wires into your chip, flips
switches in a deliberate sequence, reads the output LEDs, and flags any that light up wrong.</p>

<p>Every testbench has two responsibilities:</p>
<ul>
  <li><strong>Driver</strong> — generates clock, reset, and input signals in the right order</li>
  <li><strong>Checker</strong> — reads outputs and compares against expected values, printing PASS or FAIL</li>
</ul>

<p>In a normal SystemVerilog lesson <em>you write the DUT</em> and the testbench is given.
<strong>This course inverts that completely.</strong> The DUT is pre-loaded in the Testbench
tab — you write <code>module tb</code> in the Code tab. The simulator compiles both files
together, so your <code>module tb</code> can instantiate the DUT module by name.</p>

<h2>The DUT: sipo_shift_reg</h2>
<p>SIPO (Serial-In Parallel-Out) is the most fundamental building block in all SPI receiver
logic. It shifts one new bit into a register on every rising clock edge and makes all 8 bits
available in parallel at the output. Every SPI slave you will ever write contains this pattern.</p>

<table class="truth-table">
<tr><th>Port</th><th>Direction</th><th>Width</th><th>Purpose</th></tr>
<tr><td><code>clk</code></td><td>input</td><td>1</td><td>System clock — shift happens on the rising edge</td></tr>
<tr><td><code>rst</code></td><td>input</td><td>1</td><td>Active-low synchronous reset — <code>rst=0</code> clears the register</td></tr>
<tr><td><code>serial_in</code></td><td>input</td><td>1</td><td>Serial bit input — one bit per clock</td></tr>
<tr><td><code>data_out</code></td><td>output</td><td>8</td><td>Parallel byte — the accumulated 8-bit result</td></tr>
</table>

<p>The entire logic is one line of non-blocking assignment:</p>
<pre class="code-block">data_out &lt;= {data_out[6:0], serial_in};</pre>
<p>This shifts <code>data_out</code> left by one position each clock and inserts
<code>serial_in</code> into bit 0. The first bit received ends up in bit 7 (MSB); the last
bit ends up in bit 0 (LSB). After exactly 8 clocks, the 8 serial bits have been assembled
into a complete parallel byte.</p>

<h3>8-clock trace for 0xA5 (1010_0101 in binary)</h3>
<table class="truth-table">
<tr><th>Clock</th><th>serial_in</th><th>data_out (binary)</th><th>data_out (hex)</th></tr>
<tr><td>— (after reset)</td><td>—</td><td>0000_0000</td><td>0x00</td></tr>
<tr><td>1</td><td>1</td><td>0000_0001</td><td>0x01</td></tr>
<tr><td>2</td><td>0</td><td>0000_0010</td><td>0x02</td></tr>
<tr><td>3</td><td>1</td><td>0000_0101</td><td>0x05</td></tr>
<tr><td>4</td><td>0</td><td>0000_1010</td><td>0x0A</td></tr>
<tr><td>5</td><td>0</td><td>0001_0100</td><td>0x14</td></tr>
<tr><td>6</td><td>1</td><td>0010_1001</td><td>0x29</td></tr>
<tr><td>7</td><td>0</td><td>0101_0010</td><td>0x52</td></tr>
<tr><td>8</td><td>1</td><td>1010_0101</td><td>0xA5 ✓</td></tr>
</table>

<h2>Verilator 5.020 — Rules Your Testbench Must Follow</h2>
<p>Verilator is stricter than many simulators. Breaking any of these rules causes silent
failures or compiler errors that are very difficult to trace back to the source.</p>

<table class="truth-table">
<tr><th>Rule</th><th>Correct</th><th>Wrong — causes silent failure</th></tr>
<tr><td>Signal type</td><td><code>logic</code> everywhere</td><td><code>reg</code>, <code>wire</code></td></tr>
<tr><td>Sequential block</td><td><code>always_ff @(posedge clk)</code></td><td><code>always @(posedge clk)</code></td></tr>
<tr><td>Module name</td><td>exactly <code>tb</code></td><td>any other name</td></tr>
<tr><td>First line</td><td><code>`timescale 1ns/1ps</code></td><td>missing timescale</td></tr>
<tr><td>Comparison</td><td><code>===</code> (4-state strict)</td><td><code>==</code> (passes X silently)</td></tr>
<tr><td>Post-edge sample</td><td><code>@(posedge clk); #1;</code></td><td>bare <code>#5;</code> without clock</td></tr>
<tr><td>Repetition</td><td><code>repeat(N) @(posedge clk);</code></td><td><code>for (int i=0; i&lt;N; i++)</code></td></tr>
<tr><td>Increment</td><td><code>x = x + 1</code></td><td><code>x++</code> (C-style, rejected)</td></tr>
<tr><td>Tri-state</td><td>drive <code>1'b0</code> when idle</td><td><code>1'bz</code> causes compile error</td></tr>
</table>

<h2>Four-Layer Testbench Structure</h2>
<p>Every testbench in this course follows the same four-layer organisation. Writing them in
this order keeps the code readable and makes debugging straightforward.</p>

<pre class="code-block">// ── Layer 1: clock generator ─────────────────────────────────────
logic clk = 0;
always #5 clk = ~clk;   // 100 MHz — half-period is 5 ns

// ── Layer 2: DUT signal declarations + instantiation ─────────────
logic       rst, serial_in;
logic [7:0] data_out;
sipo_shift_reg dut (
  .clk(clk), .rst(rst),
  .serial_in(serial_in), .data_out(data_out)
);

// ── Layer 3: reusable tasks ───────────────────────────────────────
task automatic send_byte(...); ... endtask

// ── Layer 4: test sequence ────────────────────────────────────────
initial begin
  // reset → test group 1 → test group 2 → ... → $finish
end</pre>

<h2>The send_byte Task</h2>
<p>Driving 8 individual bits by hand for every test case would be tedious and would
scatter the real test logic in repetitive boilerplate. A task bundles the repetition
and lets the test sequence read like plain English: <code>send_byte(8'hA5);</code></p>

<pre class="code-block">task automatic send_byte(input logic [7:0] d);
  serial_in=d[7]; @(posedge clk); #1;  // bit 7 (MSB) first
  serial_in=d[6]; @(posedge clk); #1;
  serial_in=d[5]; @(posedge clk); #1;
  serial_in=d[4]; @(posedge clk); #1;
  serial_in=d[3]; @(posedge clk); #1;
  serial_in=d[2]; @(posedge clk); #1;
  serial_in=d[1]; @(posedge clk); #1;
  serial_in=d[0]; @(posedge clk); #1;  // bit 0 (LSB) last
endtask</pre>

<p>Two things to notice:</p>
<ul>
  <li><strong>MSB first:</strong> <code>d[7]</code> is driven first. The DUT's shift
  formula pushes older bits left, so the first bit received ends up at position 7 of the
  final byte — exactly MSB-first order.</li>
  <li><strong><code>#1</code> after every clock edge:</strong> This one-nanosecond skew
  ensures the testbench reads outputs <em>after</em> the DUT's flip-flops have settled,
  not at the exact moment they are switching. Without it, you may read the old value.</li>
</ul>

<h2>The PASS/FAIL Display Convention</h2>
<p>All assertion output must start with exactly the word <code>PASS</code> or <code>FAIL</code>.
The simulator uses these strings to auto-complete the lesson when correct output appears.</p>

<pre class="code-block">if (data_out === 8'hA5)
  $display("PASS  TC-02  received 0xA5");
else
  $display("FAIL  TC-02  data_out=0x%02h expected 0xA5", data_out);</pre>

<p>Use <code>===</code> (triple equals). The 4-state strict comparison treats an X output as
a distinct value that does <em>not</em> equal 8'hA5, so the FAIL branch fires and you see the
bug. With <code>==</code> (double equals), X silently compares as equal to anything and the
test incorrectly passes.</p>

<h2>The Reset Sequence</h2>
<p>Hold reset for exactly 2 clock cycles before any test, then add the post-edge <code>#1</code>
skew before driving the first real input:</p>
<pre class="code-block">rst=1; serial_in=0;
repeat(2) @(posedge clk); #1;
rst=0;</pre>
<p>Two cycles guarantee that all registers — including edge-detection flip-flops like
<code>sclk_prev</code> and <code>cs_n_prev</code> that appear in later modules — are fully
initialised before any stimulus arrives.</p>

<p><strong>Ready?</strong> Switch to the Code tab and write the testbench from scratch.
The DUT (<code>sipo_shift_reg</code>) is pre-loaded in the Testbench tab for reference —
your <code>module tb</code> will be compiled alongside it. Stuck? Tap 💡 Show Hint for the
fully annotated complete testbench.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps   ← Verilator requires this as the very first line',
        '── Line 2 ──  module tb;   ← must be named exactly tb',
        '── Line 3 ──  logic clk = 0;   ← logic type, initialised to 0 inline',
        '── Line 4 ──  always #5 clk = ~clk;   ← 100 MHz clock, half-period = 5 ns',
        '── Lines 5–6 ──  logic rst, serial_in;  and on the next line  logic [7:0] data_out;',
        '── Line 7 ──  sipo_shift_reg dut (.clk(clk), .rst(rst), .serial_in(serial_in), .data_out(data_out));',
        '── Lines 8–9 ──  task automatic send_byte(input logic [7:0] d);  then first bit line: serial_in=d[7]; @(posedge clk); #1;',
        '── Lines 10–16 ──  7 more bit lines (d[6] through d[0]), each ending with @(posedge clk); #1;  then endtask',
        '── Lines 17–20 ──  initial begin  then  $display("=== SIPO Testbench ===");  then reset: rst=1; serial_in=0; repeat(2) @(posedge clk); #1; rst=0;',
        '── TC-01 ──  if (data_out===8\'h00) $display("PASS  TC-01  reset clears data_out"); else $display("FAIL  TC-01 ...", data_out);',
        '── TC-02 ──  send_byte(8\'hA5);  then PASS/FAIL check for data_out===8\'hA5',
        '── TC-03 ──  send_byte(8\'hFF);  then PASS/FAIL check for data_out===8\'hFF',
        '── TC-05 ──  send_byte(8\'hA5); send_byte(8\'h3C);  then check data_out===8\'h3C  (back-to-back)',
        '── TC-06 ──  serial_in=1; repeat(4) @(posedge clk); #1;  then  rst=1; @(posedge clk); #1; rst=0;  then send_byte(8\'h37) and check 0x37  (reset mid-shift)',
        '$display("SIPO testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 5 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE ANNOTATED TESTBENCH — sipo_shift_reg

\`timescale 1ns/1ps        // required first line
module tb;                 // must be named exactly 'tb'

  logic clk = 0;           // initialised inline — no reset needed for clk
  always #5 clk = ~clk;    // 100 MHz system clock

  logic       rst;          // active-low reset: rst=1 means reset active
  logic       serial_in;    // serial bit input driven by testbench
  logic [7:0] data_out;     // parallel output from DUT

  sipo_shift_reg dut (      // instantiate DUT — always use named port connections
    .clk(clk),
    .rst(rst),
    .serial_in(serial_in),
    .data_out(data_out)
  );

  // send_byte: drive all 8 bits of d onto serial_in, MSB first, one bit per clock
  task automatic send_byte(input logic [7:0] d);
    serial_in=d[7]; @(posedge clk); #1;  // bit 7 (MSB) first
    serial_in=d[6]; @(posedge clk); #1;  // #1 ensures we sample AFTER edge settles
    serial_in=d[5]; @(posedge clk); #1;
    serial_in=d[4]; @(posedge clk); #1;
    serial_in=d[3]; @(posedge clk); #1;
    serial_in=d[2]; @(posedge clk); #1;
    serial_in=d[1]; @(posedge clk); #1;
    serial_in=d[0]; @(posedge clk); #1;  // bit 0 (LSB) last
  endtask

  initial begin
    $display("=== SIPO Testbench ===");
    rst=1; serial_in=0;              // apply reset, set input to idle
    repeat(2) @(posedge clk); #1;   // hold reset for 2 clocks
    rst=0;                           // release reset

    // TC-01: verify reset clears data_out to zero
    if (data_out===8'h00)
      $display("PASS  TC-01  reset clears data_out");
    else
      $display("FAIL  TC-01  data_out=0x%02h expected 0x00", data_out);

    // TC-02: 0xA5 = 1010_0101 — alternating pattern catches bit-order bugs
    send_byte(8'hA5);
    if (data_out===8'hA5)
      $display("PASS  TC-02  received 0xA5");
    else
      $display("FAIL  TC-02  data_out=0x%02h expected 0xA5", data_out);

    // TC-03: all ones — confirms no bits are masked to 0
    send_byte(8'hFF);
    if (data_out===8'hFF)
      $display("PASS  TC-03  received 0xFF");
    else
      $display("FAIL  TC-03  data_out=0x%02h expected 0xFF", data_out);

    // TC-05: back-to-back without reset — second byte must overwrite first
    send_byte(8'hA5); send_byte(8'h3C);
    if (data_out===8'h3C)
      $display("PASS  TC-05  back-to-back 0x3C correct");
    else
      $display("FAIL  TC-05  data_out=0x%02h expected 0x3C", data_out);

    // TC-06: reset mid-shift — partial byte must be erased, clean byte after
    serial_in=1; repeat(4) @(posedge clk); #1;  // drive 4 garbage bits
    rst=1; @(posedge clk); #1; rst=0;            // assert reset mid-frame
    send_byte(8'h37);                             // fresh clean byte after reset
    if (data_out===8'h37)
      $display("PASS  TC-06  reset mid-shift then 0x37");
    else
      $display("FAIL  TC-06  data_out=0x%02h expected 0x37", data_out);

    $display("SIPO testbench complete.");
    $finish;
  end
endmodule`,
      design:
`// Your testbench for sipo_shift_reg goes here.
// The DUT (sipo_shift_reg) is pre-loaded in the Testbench tab.
// Both files are compiled together — your module tb instantiates sipo_shift_reg dut.
\`timescale 1ns/1ps
module tb;

  // ── Step 1: Declare signals ─────────────────────────────────────────────
  // logic clk = 0;
  // always #5 clk = ~clk;
  // logic rst, serial_in;
  // logic [7:0] data_out;

  // ── Step 2: Instantiate the DUT ─────────────────────────────────────────
  // sipo_shift_reg dut (.clk(clk), .rst(rst), .serial_in(serial_in), .data_out(data_out));

  // ── Step 3: Write the send_byte task ────────────────────────────────────
  // task automatic send_byte(input logic [7:0] d);
  //   serial_in=d[7]; @(posedge clk); #1;
  //   ... (8 bits total, d[7] through d[0])
  // endtask

  // ── Step 4: Write the initial block ─────────────────────────────────────
  // initial begin
  //   $display("=== SIPO Testbench ===");
  //   reset sequence
  //   TC-01: check reset clears data_out
  //   TC-02: send_byte(8'hA5), check 0xA5
  //   TC-03: send_byte(8'hFF), check 0xFF
  //   TC-05: back-to-back, check 0x3C
  //   TC-06: reset mid-shift, check 0x37
  //   $display("SIPO testbench complete."); $finish;
  // end

endmodule
`,
      testbench:
`// sipo_shift_reg — reference DUT (do not edit)
// Your module tb in the Code tab will instantiate this module.
module sipo_shift_reg (
  input  logic       clk,
  input  logic       rst,
  input  logic       serial_in,
  output logic [7:0] data_out
);
  always_ff @(posedge clk) begin
    if (!rst) data_out <= 8'h00;
    else      data_out <= {data_out[6:0], serial_in};
  end
endmodule`,
      expected: [
        'PASS  TC-01',
        'PASS  TC-02',
        'PASS  TC-05',
        'SIPO testbench complete.'
      ]
    },

    // ─── L2: PISO Testbench (Tier 2) ──────────────────────────────────────
    {
      id: 'spitb1l2',
      title: 'L2 — The PISO Testbench: Capturing Serial Output',
      theory: `
<h2>A Different Direction: Testing a Transmitter</h2>
<p>The SIPO testbench from L1 was straightforward: send bits in, read a parallel output.
Testing a PISO (Parallel-In Serial-Out) is harder because the output is serial —
one bit per clock — and you have to <em>reassemble</em> those bits back into a byte
to verify they are correct. This is the same challenge an oscilloscope engineer
faces when probing an SPI bus: you can only see one bit at a time.</p>

<p>PISO is the transmitter building block. Every SPI master you will ever write uses
this pattern to shift a loaded byte out onto MOSI one bit per clock.</p>

<h2>The DUT: piso_shift_reg</h2>
<table class="truth-table">
<tr><th>Port</th><th>Direction</th><th>Width</th><th>Purpose</th></tr>
<tr><td><code>clk</code></td><td>input</td><td>1</td><td>System clock</td></tr>
<tr><td><code>rst</code></td><td>input</td><td>1</td><td>Active-low synchronous reset</td></tr>
<tr><td><code>load</code></td><td>input</td><td>1</td><td>Assert for 1 clock to latch data_in into shift register</td></tr>
<tr><td><code>data_in</code></td><td>input</td><td>8</td><td>Parallel byte to load</td></tr>
<tr><td><code>serial_out</code></td><td>output</td><td>1</td><td>Serial bit output — MSB first, one bit per clock</td></tr>
</table>

<p>Internal operation:</p>
<pre class="code-block">// On load pulse: latch data_in
if (load) shift_reg &lt;= data_in;
// Otherwise: shift left, output MSB
else      shift_reg &lt;= {shift_reg[6:0], 1'b0};

assign serial_out = shift_reg[7];  // always driven from bit 7</pre>

<p>After a <code>load</code> pulse, <code>shift_reg</code> holds the full byte.
On each subsequent clock, <code>shift_reg</code> shifts left by one bit, which moves
the next bit into position 7 and drives it onto <code>serial_out</code>.
After 8 clocks, the entire byte has been shifted out.</p>

<h3>Load-then-shift trace for 0xC3 (1100_0011)</h3>
<table class="truth-table">
<tr><th>Clock</th><th>load</th><th>shift_reg</th><th>serial_out</th></tr>
<tr><td>0</td><td>1</td><td>1100_0011 (loaded)</td><td>1 (bit 7)</td></tr>
<tr><td>1</td><td>0</td><td>1000_0110</td><td>1 (bit 7 of new value)</td></tr>
<tr><td>2</td><td>0</td><td>0000_1100</td><td>0</td></tr>
<tr><td>3</td><td>0</td><td>0001_1000</td><td>0</td></tr>
<tr><td>4</td><td>0</td><td>0011_0000</td><td>0</td></tr>
<tr><td>5</td><td>0</td><td>0110_0000</td><td>0</td></tr>
<tr><td>6</td><td>0</td><td>1100_0000</td><td>1</td></tr>
<tr><td>7</td><td>0</td><td>1000_0000</td><td>1</td></tr>
</table>
<p>The bit sequence read from <code>serial_out</code> across the 8 clocks after load: <strong>1, 1, 0, 0, 0, 0, 1, 1</strong> — which is exactly 0xC3 read MSB-first.</p>

<h2>The load_and_capture Task</h2>
<p>The key challenge is assembling the serial bits back into a byte. The task does this
by reading <code>serial_out</code> at each clock and storing each bit explicitly:</p>
<pre class="code-block">task automatic load_and_capture(input  logic [7:0] d,
                                 output logic [7:0] r);
  data_in=d; load=1; @(posedge clk); #1;  // pulse load for 1 clock
  load=0;
  r[7]=serial_out; @(posedge clk); #1;    // capture MSB first
  r[6]=serial_out; @(posedge clk); #1;
  r[5]=serial_out; @(posedge clk); #1;
  r[4]=serial_out; @(posedge clk); #1;
  r[3]=serial_out; @(posedge clk); #1;
  r[2]=serial_out; @(posedge clk); #1;
  r[1]=serial_out; @(posedge clk); #1;
  r[0]=serial_out; @(posedge clk); #1;    // capture LSB last
endtask</pre>
<p>After this task, <code>r</code> holds the reconstructed byte.
If <code>r === d</code>, the PISO shifted out the correct bits in the correct order.</p>

<h2>The Re-Load Corner Case</h2>
<p>What happens if you assert <code>load</code> again in the middle of a shift sequence?
The shift register should be immediately overwritten with the new <code>data_in</code> value,
abandoning the partial shift. This is an important real-world behaviour — masters sometimes
abort a transaction and start a new one — and it is commonly missed in testbenches.</p>

<p>To test it: start a shift of 0xA5, wait 4 clocks (half the byte), then load 0x3C
and capture the full 8-bit output. The result should be exactly 0x3C, with no trace
of the earlier 0xA5.</p>

<h2>Why Back-to-Back Loading Matters</h2>
<p>A real SPI master loads a new byte immediately after the previous transfer completes.
If the shift register's state is not cleanly replaced on <code>load</code>, old bits can
leak into the next transfer. Always follow a load-and-capture with a second load-and-capture
to confirm independence.</p>

<p><strong>Ready?</strong> Switch to the Code tab and write the PISO testbench.
The DUT is pre-loaded in the Testbench tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Lines 1–4 ──  `timescale, module tb, clock generator (logic clk=0; always #5 clk=~clk;)',
        '── Lines 5–8 ──  declare logic rst, load; logic [7:0] data_in; logic serial_out; logic [7:0] captured;',
        '── Line 9 ──  instantiate piso_shift_reg dut with 5 ports: clk, rst, load, data_in, serial_out',
        '── Lines 10–20 ──  task automatic load_and_capture(input logic [7:0] d, output logic [7:0] r): pulse load=1 one clock, then capture 8 serial_out bits MSB-first into r[7]..r[0]',
        '── Lines 21–24 ──  initial begin; reset sequence (rst=1, repeat(2), rst=0)',
        '── TC-PISO-01 ──  load_and_capture(8\'hA5, captured); PASS/FAIL check for captured===8\'hA5',
        '── TC-PISO-02 ──  load_and_capture(8\'h3C, captured); check 0x3C',
        '── TC-PISO-03 ──  load 0xFF (load=1 one clock), then rst=1 one clock, rst=0; check serial_out===1\'b0',
        '── TC-PISO-04 ──  load 0xA5, shift 4 clocks (no capture), then load_and_capture(8\'h3C, captured); check 0x3C (re-load corner case)',
        '── TC-PISO-05 ──  load_and_capture(8\'hC3, captured); check 0xC3 (MSB-first order verify)',
        '$display("PISO testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 5 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE TESTBENCH — piso_shift_reg

\`timescale 1ns/1ps
module tb;

  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, load;
  logic [7:0] data_in;
  logic       serial_out;
  logic [7:0] captured;        // assembles serial bits back into a byte

  piso_shift_reg dut (
    .clk(clk), .rst(rst), .load(load),
    .data_in(data_in), .serial_out(serial_out)
  );

  // load_and_capture: pulse load, then read 8 serial_out bits MSB-first
  task automatic load_and_capture(input logic [7:0] d, output logic [7:0] r);
    data_in=d; load=1; @(posedge clk); #1;  // load for 1 clock
    load=0;
    r[7]=serial_out; @(posedge clk); #1;    // capture MSB first
    r[6]=serial_out; @(posedge clk); #1;
    r[5]=serial_out; @(posedge clk); #1;
    r[4]=serial_out; @(posedge clk); #1;
    r[3]=serial_out; @(posedge clk); #1;
    r[2]=serial_out; @(posedge clk); #1;
    r[1]=serial_out; @(posedge clk); #1;
    r[0]=serial_out; @(posedge clk); #1;    // capture LSB last
  endtask

  initial begin
    $display("=== PISO Testbench ===");
    rst=1; load=0; data_in=0;
    repeat(2) @(posedge clk); #1; rst=0;

    // TC-PISO-01: shift out 0xA5 and verify
    load_and_capture(8'hA5, captured);
    if (captured===8'hA5)
      $display("PASS  TC-PISO-01  shifted out 0xA5 correctly");
    else
      $display("FAIL  TC-PISO-01  captured=0x%02h expected 0xA5", captured);

    // TC-PISO-02: shift out 0x3C
    load_and_capture(8'h3C, captured);
    if (captured===8'h3C)
      $display("PASS  TC-PISO-02  shifted out 0x3C correctly");
    else
      $display("FAIL  TC-PISO-02  captured=0x%02h expected 0x3C", captured);

    // TC-PISO-03: reset clears serial_out to 0
    data_in=8'hFF; load=1; @(posedge clk); #1; load=0;
    rst=1; @(posedge clk); #1; rst=0;
    if (serial_out===1'b0)
      $display("PASS  TC-PISO-03  reset clears serial_out");
    else
      $display("FAIL  TC-PISO-03  serial_out=%0b expected 0", serial_out);

    // TC-PISO-04: re-load mid-shift — previous partial shift must be abandoned
    data_in=8'hA5; load=1; @(posedge clk); #1; load=0;
    repeat(4) @(posedge clk); #1;               // shift 4 bits of 0xA5
    load_and_capture(8'h3C, captured);           // re-load 0x3C and capture
    if (captured===8'h3C)
      $display("PASS  TC-PISO-04  re-load mid-shift returns correct value");
    else
      $display("FAIL  TC-PISO-04  captured=0x%02h expected 0x3C", captured);

    // TC-PISO-05: 0xC3 = 1100_0011 — verifies MSB-first bit order
    load_and_capture(8'hC3, captured);
    if (captured===8'hC3)
      $display("PASS  TC-PISO-05  MSB-first order correct for 0xC3");
    else
      $display("FAIL  TC-PISO-05  captured=0x%02h expected 0xC3", captured);

    $display("PISO testbench complete.");
    $finish;
  end
endmodule`,
      design:
`// Testbench for piso_shift_reg
// DUT is pre-loaded in the Testbench tab.
\`timescale 1ns/1ps
module tb;

endmodule
`,
      testbench:
`// piso_shift_reg — reference DUT (do not edit)
// Your module tb in the Code tab will instantiate this module.
module piso_shift_reg (
  input  logic       clk,
  input  logic       rst,
  input  logic       load,
  input  logic [7:0] data_in,
  output logic       serial_out
);
  logic [7:0] shift_reg;

  always_ff @(posedge clk) begin
    if (!rst)      shift_reg <= 8'h00;
    else if (load) shift_reg <= data_in;
    else           shift_reg <= {shift_reg[6:0], 1'b0};
  end

  assign serial_out = shift_reg[7];
endmodule`,
      expected: [
        'PASS  TC-PISO-01',
        'PASS  TC-PISO-02',
        'PASS  TC-PISO-04',
        'PASS  TC-PISO-05',
        'PISO testbench complete.'
      ]
    },

    // ─── L3: Byte Counter Testbench (Tier 3) ──────────────────────────────
    {
      id: 'spitb1l3',
      title: 'L3 — Byte Counter Testbench: Verifying Protocol Timing',
      theory: `
<h2>From Data Verification to Timing Verification</h2>
<p>L1 and L2 tested <em>data values</em> — you checked that a received or transmitted
byte matched a known pattern. The <code>spi_byte_counter</code> module has no data
path at all. It is purely a timing circuit: it counts rising SCLK edges inside a CS_N
frame and fires a one-clock pulse called <code>byte_done</code> on the 8th edge.</p>

<p>This introduces two new testbench patterns that appear in almost every SPI verification
task:</p>
<ul>
  <li><strong>Pulse-width verification:</strong> <code>byte_done</code> must be high for
  exactly 1 system clock — not 2, not 0. How do you check that without writing a state
  machine?</li>
  <li><strong>Gating verification:</strong> SCLK edges must be completely ignored when
  <code>cs_n = 1</code>. How do you prove that nothing happened?</li>
</ul>

<h2>The DUT: spi_byte_counter</h2>
<table class="truth-table">
<tr><th>Port</th><th>Direction</th><th>Width</th><th>Purpose</th></tr>
<tr><td><code>clk</code></td><td>input</td><td>1</td><td>System clock</td></tr>
<tr><td><code>rst</code></td><td>input</td><td>1</td><td>Active-low synchronous reset</td></tr>
<tr><td><code>cs_n</code></td><td>input</td><td>1</td><td>Chip Select active-low — gating signal</td></tr>
<tr><td><code>sclk</code></td><td>input</td><td>1</td><td>SPI clock from master</td></tr>
<tr><td><code>bit_idx</code></td><td>output</td><td>3</td><td>Current bit index 0–7 within the frame</td></tr>
<tr><td><code>byte_done</code></td><td>output</td><td>1</td><td>Asserts for exactly 1 clock on the 8th SCLK rising edge</td></tr>
</table>

<h3>Correct behaviour</h3>
<ul>
  <li>While <code>cs_n = 1</code>: <code>bit_idx</code> stays 0, <code>byte_done</code> stays 0</li>
  <li>While <code>cs_n = 0</code>: each SCLK rising edge increments <code>bit_idx</code></li>
  <li>On the 8th rising edge (when <code>bit_idx</code> would reach 7): <code>byte_done</code> fires for exactly 1 clock and <code>bit_idx</code> resets to 0</li>
  <li>If <code>cs_n</code> deasserts mid-frame: <code>bit_idx</code> resets to 0 within 2 system clocks</li>
</ul>

<h2>The clk_pulse Task</h2>
<p>For the byte counter testbench, you need to drive individual SCLK pulses at a rate
much slower than the system clock (so the DUT's edge-detection flip-flop can see each
transition). One standard SCLK cycle = 4 system clocks high + 4 system clocks low:</p>
<pre class="code-block">task automatic clk_pulse;
  sclk=1; repeat(4) @(posedge clk); #1;
  sclk=0; repeat(4) @(posedge clk); #1;
endtask</pre>
<p>An SCLK half-period of 4 system clocks gives the DUT's <code>sclk_prev</code>
register ample time to capture the transition before the testbench checks <code>bit_idx</code>.</p>

<h2>The Sticky-Flag Pattern</h2>
<p>To prove that a signal <em>never</em> asserted during a sequence, use a sticky flag:
a register that latches once when the signal goes high and stays latched forever.</p>
<pre class="code-block">logic flag = 0;
always_ff @(posedge clk) begin
  if (byte_done) flag &lt;= 1'b1;
end</pre>
<p>After the test sequence, check <code>flag === 1'b0</code>. If <code>byte_done</code>
fired even once — including at a time when it should not have — the flag will be 1.</p>

<h2>Counting Pulse Width</h2>
<p>To verify that <code>byte_done</code> is exactly 1 clock wide, count how many consecutive
clocks it is high using an accumulating counter:</p>
<pre class="code-block">logic [1:0] done_count = 0;
always_ff @(posedge clk) begin
  if (byte_done) done_count &lt;= done_count + 1;
end</pre>
<p>Reset <code>done_count = 0</code> before each test group (it is a variable in the
initial block, so you can assign it directly: <code>done_count = 0;</code>).
After the transfer, check <code>done_count === 2'd1</code>. A value of 2 or more
means the pulse lasted longer than 1 clock — a real bug that would cause downstream
logic to latch the same byte twice.</p>

<h2>Two-Frame Back-to-Back Test</h2>
<p>The back-to-back frame test is the most important timing test for the byte counter.
It verifies that: (a) <code>byte_done</code> fires exactly once per frame, (b) there
is no spurious firing during the inter-frame gap, and (c) the counter resets correctly
for the second frame. Reset <code>done_count = 0</code> before both frames, then
verify <code>done_count === 2'd2</code> at the end.</p>

<p><strong>Ready?</strong> Switch to the Code tab and write the byte counter testbench.
The DUT is pre-loaded in the Testbench tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the testbench module: `timescale, module tb, clock generator with #2 half-period (250 MHz — needed for margin around SCLK edges)',
        'Declare DUT signals: logic rst, cs_n, sclk; logic [2:0] bit_idx; logic byte_done',
        'Instantiate spi_byte_counter dut with 6 ports',
        'Declare logic [1:0] done_count = 0; and add an always_ff block: if (byte_done) done_count <= done_count + 1',
        'Write task clk_pulse: sclk=1, repeat(4) @(posedge clk), #1, sclk=0, repeat(4) @(posedge clk), #1',
        'TC-BCNT-01: cs_n=1, call clk_pulse 8 times, verify bit_idx===3\'d0 (SCLK ignored when cs_n=1)',
        'TC-BCNT-02: cs_n=0, call clk_pulse 7 times, verify bit_idx===3\'d7 and byte_done===1\'b0',
        'TC-BCNT-03/04: drive sclk=1 one clock, verify byte_done===1\'b1 and bit_idx===3\'d0; then next clock verify byte_done===1\'b0',
        'TC-BCNT-05: cs_n=0, call clk_pulse 5 times, cs_n=1, wait 2 clocks, verify bit_idx===3\'d0',
        'TC-BCNT-06: done_count=0; drive two complete frames (8 pulses each, cs_n toggle between); verify done_count===2\'d2',
        '$display("Byte counter testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 7 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE TESTBENCH — spi_byte_counter

\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;   // 250 MHz — faster clock gives margin around SCLK edges

  logic       rst, cs_n, sclk;
  logic [2:0] bit_idx;
  logic       byte_done;

  spi_byte_counter dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .bit_idx(bit_idx), .byte_done(byte_done)
  );

  // Accumulate byte_done pulses — used to check pulse width and frame count
  logic [1:0] done_count = 0;
  always_ff @(posedge clk) begin
    if (byte_done) done_count <= done_count + 1;
  end

  // clk_pulse: one complete SCLK rise + fall, 4 system clocks each half
  task automatic clk_pulse;
    sclk=1; repeat(4) @(posedge clk); #1;
    sclk=0; repeat(4) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Byte Counter Testbench ===");
    rst=1; cs_n=1; sclk=0;
    repeat(4) @(posedge clk); #1; rst=0;

    // TC-BCNT-01: SCLK pulses must be ignored when cs_n=1
    repeat(8) clk_pulse();
    if (bit_idx===3'd0)
      $display("PASS  TC-BCNT-01  SCLK ignored when cs_n=1");
    else
      $display("FAIL  TC-BCNT-01  bit_idx=%0d expected 0", bit_idx);

    // TC-BCNT-02: 7 pulses with cs_n=0 → bit_idx should reach 7, byte_done still 0
    cs_n=0;
    repeat(7) clk_pulse();
    if (bit_idx===3'd7 && byte_done===1'b0)
      $display("PASS  TC-BCNT-02  7 pulses: bit_idx=7, byte_done=0");
    else
      $display("FAIL  TC-BCNT-02  bit_idx=%0d byte_done=%0b", bit_idx, byte_done);

    // TC-BCNT-03/04: 8th pulse fires byte_done for exactly 1 clock, resets bit_idx
    sclk=1; repeat(4) @(posedge clk); #1;
    if (byte_done===1'b1 && bit_idx===3'd0)
      $display("PASS  TC-BCNT-03/04  byte_done=1, bit_idx reset to 0");
    else
      $display("FAIL  TC-BCNT-03/04  byte_done=%0b bit_idx=%0d", byte_done, bit_idx);
    repeat(3) @(posedge clk); #1;
    if (byte_done===1'b0)
      $display("PASS  TC-BCNT-03  byte_done cleared next clock");
    else
      $display("FAIL  TC-BCNT-03  byte_done still high after 1 clock");
    sclk=0; repeat(4) @(posedge clk); #1;

    // TC-BCNT-05: cs_n deassert mid-frame resets bit_idx
    cs_n=0; repeat(5) clk_pulse(); cs_n=1;
    repeat(2) @(posedge clk); #1;
    if (bit_idx===3'd0)
      $display("PASS  TC-BCNT-05  cs_n deassert resets bit_idx");
    else
      $display("FAIL  TC-BCNT-05  bit_idx=%0d expected 0 after cs_n deassert", bit_idx);

    // TC-BCNT-06: two consecutive frames — byte_done must fire exactly twice
    done_count=0;
    cs_n=0; repeat(8) clk_pulse(); cs_n=1; repeat(2) @(posedge clk); #1;
    cs_n=0; repeat(8) clk_pulse(); cs_n=1; repeat(2) @(posedge clk); #1;
    if (done_count===2'd2)
      $display("PASS  TC-BCNT-06  byte_done fired exactly twice across two frames");
    else
      $display("FAIL  TC-BCNT-06  done_count=%0d expected 2", done_count);

    $display("Byte counter testbench complete.");
    $finish;
  end
endmodule`,
      design:
`// Build the spi_byte_counter testbench here.
// DUT is pre-loaded in the Testbench tab.
`,
      testbench:
`// spi_byte_counter — reference DUT (do not edit)
// Your module tb in the Code tab will instantiate this module.
module spi_byte_counter (
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
    if (!rst) begin
      bit_idx  <= 3'd0;
      byte_done <= 1'b0;
    end else if (cs_n) begin
      bit_idx  <= 3'd0;
      byte_done <= 1'b0;
    end else if (sclk_rise) begin
      if (bit_idx == 3'd7) begin
        bit_idx  <= 3'd0;
        byte_done <= 1'b1;
      end else begin
        bit_idx  <= bit_idx + 1;
        byte_done <= 1'b0;
      end
    end else begin
      byte_done <= 1'b0;
    end
  end
endmodule`,
      expected: [
        'PASS  TC-BCNT-01',
        'PASS  TC-BCNT-02',
        'PASS  TC-BCNT-03/04',
        'PASS  TC-BCNT-06',
        'Byte counter testbench complete.'
      ]
    }

  ] // end lessons
});
