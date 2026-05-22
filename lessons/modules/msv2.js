// Module msv2 — Sequential Logic
// Core: 4 lessons. Bonus: 4 flip-flop practice lessons.
// Verilator 5.020 safe: always_ff, posedge, non-blocking <=
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv2',
  title: 'Sequential Logic',
  icon: '🔄',
  level: 'beginner',
  lessons: [

    // ─── L1 — D Flip-Flop ────────────────────────────────────────────────
    {
      id: 'msv2l1',
      title: 'L1 — D Flip-Flop',
      theory: `
<h2>From Combinational to Sequential</h2>
<p>Everything in Module 1 was <strong>combinational</strong> — outputs react instantly to inputs, like a light switch. But real systems need <strong>memory</strong>: a way to hold a value between moments in time. That requires <strong>sequential logic</strong>.</p>

<div class="flow-diagram">
  <div class="flow-step">Combinational<small>output = f(inputs)</small></div>
  <span class="flow-arrow">→</span>
  <div class="flow-step" style="border-color:var(--accent);color:var(--accent)">Sequential<small>output = f(inputs, history)</small></div>
</div>

<h2>The Clock — The Heartbeat of Digital Logic</h2>
<p>A clock signal alternates between 0 and 1 at a fixed rate (e.g. 1 GHz in a modern CPU = 10<sup>9</sup> times per second). Sequential logic changes output only on the <strong>rising edge</strong> — the exact instant the clock transitions from 0 to 1.</p>

<pre class="code-block">      _____       _____       _____
clk: |     |_____|     |_____|     |
          ↑           ↑           ↑
     rising edges — output updates ONLY here</pre>

<p>Between edges, the output is frozen — no matter what the inputs do. This is what makes sequential logic predictable and safe.</p>

<h2>always_ff — The Sequential Block</h2>
<p>Just as <code>always_comb</code> describes combinational logic, <code>always_ff</code> describes sequential logic. It runs only on the rising clock edge:</p>
<pre class="code-block">always_ff @(posedge clk) begin
  // runs ONCE per clock tick — exactly on the rising edge
end</pre>

<h2>Non-Blocking Assignment <=</h2>
<p>Inside <code>always_ff</code>, you must use <code>&lt;=</code> (non-blocking) instead of <code>=</code>. This is critical: non-blocking means all assignments use the <em>old</em> values from before the clock edge, and all updates happen simultaneously. This matches how real silicon flip-flops work.</p>

<table class="truth-table">
  <tr><th>Assignment</th><th>Where to use</th><th>Meaning</th></tr>
  <tr><td><code>q &lt;= d</code></td><td>always_ff only</td><td>Non-blocking: schedules update, uses old values</td></tr>
  <tr><td><code>q = d</code></td><td>always_comb only</td><td>Blocking: immediate, sequential execution</td></tr>
</table>

<p><strong>Mixing them causes bugs.</strong> Follow this rule without exception: <code>&lt;=</code> in <code>always_ff</code>, <code>=</code> in <code>always_comb</code>.</p>

<h2>Active-Low Reset</h2>
<p>Reset clears the flip-flop to a known state at startup. <strong>Active-low</strong> means the reset is active (ON) when the signal is 0:</p>
<pre class="code-block">if (!rst) q &lt;= 0;   // rst=0 → clear Q to zero (reset is ON)
else      q &lt;= d;   // rst=1 → normal operation</pre>

<p><strong>Why active-low?</strong> In real chips, reset lines are often held high by pull-up resistors. Pulling the line low (asserting reset) requires active drive — this is safer because a floating wire stays in the non-reset state.</p>

<h2>What You Are Building — A D Flip-Flop</h2>
<p>The D (Data) flip-flop is the most fundamental memory element in all of digital design. Every CPU register, pipeline stage, state machine, and counter is built from D flip-flops. There are billions of them inside a modern processor.</p>

<table class="truth-table">
  <tr><th>rst</th><th>clock</th><th>d</th><th>q after edge</th><th>Meaning</th></tr>
  <tr><td>0</td><td>↑</td><td>any</td><td>0</td><td>Reset — clear output</td></tr>
  <tr><td>1</td><td>↑</td><td>0</td><td>0</td><td>Capture: d=0 → q=0</td></tr>
  <tr><td>1</td><td>↑</td><td>1</td><td>1</td><td>Capture: d=1 → q=1</td></tr>
  <tr><td>1</td><td>no edge</td><td>any</td><td>unchanged</td><td>Hold: no edge, no change</td></tr>
</table>

<h2>Common Pitfalls</h2>
<ul>
  <li><strong>Using = instead of <=</strong> in always_ff — causes race conditions in simulation</li>
  <li><strong>Forgetting the reset</strong> — uninitialized flip-flops have unknown (X) state at power-on</li>
  <li><strong>Confusing active-low / active-high</strong> — always check: is reset ON when signal is 0 or 1?</li>
</ul>

<p><strong>Ready?</strong> Switch to the Code tab. Type every line from memory. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──   module dff (',
        '── Line 2 ──   input  logic clk,    ← clock signal, comma',
        '── Line 3 ──   input  logic rst,    ← active-low reset (0 = in reset), comma',
        '── Line 4 ──   input  logic d,      ← data to store, comma',
        '── Line 5 ──   output logic q       ← stored output, NO comma',
        '── Line 6 ──   );',
        '── Blank line ──',
        '── Line 8 ──     always_ff @(posedge clk) begin    ← runs on every rising clock edge',
        '── Line 9 ──       if (!rst) q <= 0;               ← reset takes priority',
        '── Line 10 ──      else      q <= d;               ← <= is non-blocking, required in always_ff',
        '── Line 11 ──    end',
        '── Blank line ──',
        '── Line 13 ──   endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`module dff (
  input  logic clk,   // clock — all sequential logic is driven by this
  input  logic rst,   // active-low reset: rst=0 → clear, rst=1 → normal
  input  logic d,     // data input — the value to capture
  output logic q      // stored output, NO comma (last port)
);

  always_ff @(posedge clk) begin  // runs ONLY on rising clock edge
    if (!rst) q <= 0;             // reset takes priority — clears q to 0
    else      q <= d;             // latch d into q on every clock tick
  end                             // always use <= (non-blocking) in always_ff

endmodule                         // closes the module`,
      design:
`// Type the dff (D flip-flop) module here.
// Read the Theory tab first — it explains clocks and always_ff.
//
// Ports:
//   input  logic clk  — rising edge triggers the flip-flop
//   input  logic rst  — active-low reset: 0 = clear output, 1 = normal
//   input  logic d    — data to store
//   output logic q    — stored value
//
// Logic: always_ff @(posedge clk)
//          if (!rst) q <= 0;
//          else      q <= d;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz clock

  logic rst, d, q;
  dff dut (.clk(clk), .rst(rst), .d(d), .q(q));

  task automatic check(input logic din, exp);
    d = din;
    @(posedge clk); #1;
    if (q === exp)
      $display("PASS  d=%0b -> q=%0b", din, q);
    else
      $display("FAIL  d=%0b -> q=%0b (expected %0b)", din, q, exp);
  endtask

  initial begin
    $display("=== D Flip-Flop Test ===");
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;  // assert then release reset
    check(1, 1);
    check(0, 0);
    check(1, 1);
    // verify reset overrides data
    d = 1; rst = 0; @(posedge clk); #1;
    if (q === 0)
      $display("PASS  reset overrides d: q=%0b", q);
    else
      $display("FAIL  reset failed: q=%0b (expected 0)", q);
    $display("Flip-flop works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  d=1 -> q=1',
        'PASS  reset overrides d',
        'Flip-flop works!'
      ]
    },

    // ─── L2 — 4-bit Register ─────────────────────────────────────────────
    {
      id: 'msv2l2',
      title: 'L2 — 4-bit Register',
      theory: `
<h2>From 1 Bit to 4 Bits</h2>
<p>A flip-flop stores one bit. A <strong>register</strong> stores multiple bits simultaneously — it is simply several flip-flops sharing the same clock and reset, working in parallel. Registers are the most common memory structure inside every processor. A 32-bit ARM core has 16 registers; a RISC-V core has 32.</p>

<h2>Bus Signals — logic [N:0]</h2>
<p>To carry multiple bits at once, SystemVerilog uses a <strong>bus</strong>. The notation <code>[3:0]</code> means 4 bits, numbered bit 3 (MSB = most significant) down to bit 0 (LSB = least significant):</p>
<pre class="code-block">logic [3:0] d;   // 4-bit bus: d[3] d[2] d[1] d[0]
//   [3:0]         MSB=bit3          LSB=bit0
//              ← most significant   least significant →</pre>

<table class="truth-table">
  <tr><th>Notation</th><th>Bits</th><th>Max value</th><th>Real world</th></tr>
  <tr><td><code>[3:0]</code></td><td>4</td><td>15</td><td>Nibble, BCD digit</td></tr>
  <tr><td><code>[7:0]</code></td><td>8</td><td>255</td><td>1 byte, ASCII character</td></tr>
  <tr><td><code>[15:0]</code></td><td>16</td><td>65535</td><td>Half-word (ARM Thumb)</td></tr>
  <tr><td><code>[31:0]</code></td><td>32</td><td>4 billion</td><td>CPU register (ARM, RISC-V)</td></tr>
</table>

<h2>Binary Literals</h2>
<p>To assign a specific bit pattern, use a binary literal: <code>4'b1010</code></p>
<pre class="code-block">4'b1010   // 4-bit binary: 1010 = decimal 10
//↑ bit width  ↑b=binary  ↑ the bit pattern (MSB first)

4'b0000   // all zeros  (used for reset value)
4'hA      // hex A = 1010 (same as 4'b1010)</pre>

<h2>The Register: Same always_ff, Different Port Types</h2>
<p>The logic is identical to L1 — only the port types change from 1-bit <code>logic</code> to 4-bit <code>logic [3:0]</code>. The assignment <code>q &lt;= d</code> transfers all 4 bits simultaneously in one clock:</p>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) q &lt;= 4'b0000;   // reset: clear all 4 bits
  else      q &lt;= d;          // capture all 4 bits at once
end</pre>

<h2>Why Registers Matter in Real Chips</h2>
<p>In a CPU pipeline, registers separate stages so each stage can work independently. A 5-stage pipeline has 4 sets of pipeline registers between stages — each set captures the current instruction's data at the end of the clock so the next stage sees a stable snapshot.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Pattern is identical to L1 — only the port types change. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──   module reg4 (',
        '── Line 2 ──   input  logic       clk,    ← clock, comma',
        '── Line 3 ──   input  logic       rst,    ← active-low reset, comma',
        '── Line 4 ──   input  logic [3:0] d,      ← 4-bit input bus, comma',
        '── Line 5 ──   output logic [3:0] q       ← 4-bit output bus, NO comma',
        '── Line 6 ──   );',
        '── Blank line ──',
        '── Line 8 ──     always_ff @(posedge clk) begin',
        "── Line 9 ──       if (!rst) q <= 4'b0000;   ← reset all 4 bits to zero",
        '── Line 10 ──      else      q <= d;           ← latch full 4-bit bus',
        '── Line 11 ──    end',
        '── Blank line ──',
        '── Line 13 ──   endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear',
      ],
      hint:
`module reg4 (
  input  logic       clk,     // clock
  input  logic       rst,     // active-low reset
  input  logic [3:0] d,       // 4-bit input:  d[3]=MSB  d[0]=LSB
  output logic [3:0] q        // 4-bit output, NO comma
);

  always_ff @(posedge clk) begin
    if (!rst) q <= 4'b0000;   // reset: clear all 4 bits
    else      q <= d;         // latch the full 4-bit bus
  end

endmodule`,
      design:
`// Type the reg4 (4-bit register) module here.
// Read the Theory tab first — it explains [3:0] bus notation.
//
// Ports:
//   input  logic       clk   — clock
//   input  logic       rst   — active-low reset
//   input  logic [3:0] d     — 4-bit data input
//   output logic [3:0] q     — 4-bit stored output
//
// Same always_ff pattern as L1, just with [3:0] buses.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst;
  logic [3:0] d, q;
  reg4 dut (.clk(clk), .rst(rst), .d(d), .q(q));

  task automatic check(input logic [3:0] din, exp);
    d = din;
    @(posedge clk); #1;
    if (q === exp)
      $display("PASS  d=%04b -> q=%04b", din, q);
    else
      $display("FAIL  d=%04b -> q=%04b (expected %04b)", din, q, exp);
  endtask

  initial begin
    $display("=== 4-bit Register Test ===");
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;
    check(4'b1010, 4'b1010);
    check(4'b0101, 4'b0101);
    check(4'b1111, 4'b1111);
    check(4'b0000, 4'b0000);
    $display("Register works!");
    $finish;
  end
endmodule`,
      expected: [
        "PASS  d=1010 -> q=1010",
        "PASS  d=0101 -> q=0101",
        'Register works!'
      ]
    },

    // ─── L3 — Shift Register ─────────────────────────────────────────────
    {
      id: 'msv2l3',
      title: 'L3 — Shift Register',
      theory: `
<h2>Serial Data — One Bit at a Time</h2>
<p>Registers store data in parallel (all bits at once). But many real-world interfaces — SPI, UART, I2C — send data <strong>serially</strong>: one bit per clock. A <strong>shift register</strong> bridges these worlds: it accepts bits one at a time and makes all bits available simultaneously.</p>

<h2>Shift Register Variants</h2>
<table class="truth-table">
  <tr><th>Type</th><th>Input</th><th>Output</th><th>Use</th></tr>
  <tr><td>SIPO</td><td>Serial</td><td>Parallel</td><td>UART/SPI receive → CPU data bus</td></tr>
  <tr><td>PISO</td><td>Parallel</td><td>Serial</td><td>CPU data bus → UART/SPI transmit</td></tr>
  <tr><td>SISO</td><td>Serial</td><td>Serial</td><td>Delay line, pipeline buffer</td></tr>
  <tr><td>PIPO</td><td>Parallel</td><td>Parallel</td><td>Standard register (already built in L2)</td></tr>
</table>
<p>You will build a <strong>SIPO</strong> (Serial In Parallel Out) — the type used inside a UART receiver or SPI slave.</p>

<h2>Concatenation — the {} Operator</h2>
<p>Curly braces glue signals together into a new bus. This is how shifting works:</p>
<pre class="code-block">q &lt;= {q[2:0], sin};
// {q[2:0], sin} means: take bits 2,1,0 of q, append sin as new bit 0
// result is 4 bits: [old_q2, old_q1, old_q0, sin]
//
// Before: q = 1 0 1 0   sin = 1
// After:  q = 0 1 0 1  ← sin entered at bit 0, bit 3 dropped</pre>

<h2>SPI Connection</h2>
<p>In SPI protocol, the slave controller is literally a shift register. Each SPI clock (SCLK) pulse shifts one bit from MISO into the hardware shift register. After 8 clocks, the full byte is available on the parallel output — your CPU reads it in one operation.</p>

<p><strong>Ready?</strong> The structure is familiar from L1 and L2 — only the shift line is new. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — write the full module.',
        'Declare module shift_reg with ports: clk, rst, sin (1-bit serial input), q[3:0] (parallel output)',
        'Open the always_ff @(posedge clk) block',
        "Reset case: if (!rst) q <= 4'b0000;",
        'Shift case: else q <= {q[2:0], sin};    ← {} concatenates: drop MSB, shift left, insert sin at bit 0',
        'Close with end, then endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        "Hit Run — after shifting in 1,0,1,1 the output should read q=1011",
      ],
      hint:
`module shift_reg (
  input  logic       clk,
  input  logic       rst,
  input  logic       sin,   // serial input — one bit per clock
  output logic [3:0] q      // parallel output — all 4 bits at once
);

  always_ff @(posedge clk) begin
    if (!rst) q <= 4'b0000;
    else      q <= {q[2:0], sin};  // shift: drop q[3], move q[2:0] up, insert sin at bit 0
  end

endmodule`,
      design:
`// Type the shift_reg module here.
// Read the Theory tab — it explains {} concatenation and how shifting works.
//
// Ports:
//   input  logic       clk  — clock
//   input  logic       rst  — active-low reset
//   input  logic       sin  — serial input (1 bit per clock)
//   output logic [3:0] q    — parallel output (all 4 bits)
//
// Key line: q <= {q[2:0], sin};
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, sin;
  logic [3:0] q;
  shift_reg dut (.clk(clk), .rst(rst), .sin(sin), .q(q));

  task automatic shift_in(input logic b);
    sin = b;
    @(posedge clk); #1;
  endtask

  initial begin
    $display("=== Shift Register Test ===");
    rst = 0; @(posedge clk); #1; rst = 1;
    // shift in 1, 0, 1, 1  —  q should become 4'b1011
    shift_in(1);
    shift_in(0);
    shift_in(1);
    shift_in(1);
    if (q === 4'b1011)
      $display("PASS  shifted 1,0,1,1 -> q=%04b", q);
    else
      $display("FAIL  shifted 1,0,1,1 -> q=%04b (expected 1011)", q);
    // shift in 0,0,0,0  —  q should clear to 0000
    shift_in(0); shift_in(0); shift_in(0); shift_in(0);
    if (q === 4'b0000)
      $display("PASS  shifted zeros -> q=%04b", q);
    else
      $display("FAIL  shifted zeros -> q=%04b (expected 0000)", q);
    $display("Shift register works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  shifted 1,0,1,1 -> q=1011',
        'PASS  shifted zeros -> q=0000',
        'Shift register works!'
      ]
    },

    // ─── L4 — Clock Divider ───────────────────────────────────────────────
    {
      id: 'msv2l4',
      title: 'L4 — Clock Divider',
      theory: `
<h2>Why Divide a Clock?</h2>
<p>A system clock might run at 100 MHz, but a peripheral (LED blink, UART, LCD) needs a much slower signal. A <strong>clock divider</strong> takes a fast clock and produces a slower pulse — one output tick every N input ticks. It is in virtually every digital chip ever made.</p>

<h2>The Counter Pattern</h2>
<p>Count up to N−1, then reset to 0 and fire one output pulse:</p>
<pre class="code-block">count: 0 → 1 → 2 → 3 → 0 → 1 → 2 → 3 → ...   (N=4)
                       ↑
                  clk_div=1 here (one-cycle pulse), then back to 0</pre>

<p>The output pulse has the same clock rate as the input but only fires once every N cycles — a divide-by-N operation.</p>

<h2>Internal Signals</h2>
<p>You need a counter that lives <em>inside</em> the module. Declare it between the port list and always_ff:</p>
<pre class="code-block">logic [1:0] count;   // 2 bits — enough to count 0,1,2,3</pre>

<h2>Three-Way if in always_ff</h2>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) begin
    count   &lt;= 2'b00;    // reset: clear counter
    clk_div &lt;= 1'b0;     // reset: clear output
  end else if (count == 2'd3) begin  // reached N-1: fire pulse
    count   &lt;= 2'b00;
    clk_div &lt;= 1'b1;     // one-cycle pulse
  end else begin
    count   &lt;= count + 2'b01;  // keep counting
    clk_div &lt;= 1'b0;
  end
end</pre>

<h2>Real-World Context</h2>
<p>UART baud rate generators, SPI clock dividers, PWM period generators, watchdog timer prescalers — all are clock dividers. In FPGAs, a global clock of 100 MHz is divided down to generate UART baud clocks (115,200 Hz needs dividing by ~868) and SPI clocks (1–25 MHz).</p>

<p>This is the hardest lesson in this chapter — three branches and two internal signals. Take it slowly. Stuck? The hint has the full solution.</p>
      `,
      tasks: [
        'Code tab is blank — write the full module.',
        'Declare module clk_divider with ports: clk (in), rst (in), clk_div (out)',
        'Inside the module (after the port list, before always_ff): declare logic [1:0] count;',
        'Open always_ff @(posedge clk) begin',
        'Branch 1 — reset:         if (!rst) begin  count <= 0;  clk_div <= 0;  end',
        "Branch 2 — pulse:         else if (count == 2'd3) begin  count <= 0;  clk_div <= 1;  end",
        'Branch 3 — keep counting: else begin  count <= count + 1;  clk_div <= 0;  end',
        'Close with end, then endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — should see 4 pulses in 16 cycles',
      ],
      hint:
`module clk_divider (
  input  logic clk,
  input  logic rst,
  output logic clk_div
);
  logic [1:0] count;  // internal counter: 2 bits counts 0..3

  always_ff @(posedge clk) begin
    if (!rst) begin              // reset: clear both signals
      count   <= 2'b00;
      clk_div <= 1'b0;
    end else if (count == 2'd3) begin  // reached N-1: fire pulse
      count   <= 2'b00;
      clk_div <= 1'b1;
    end else begin               // still counting
      count   <= count + 2'b01;
      clk_div <= 1'b0;
    end
  end

endmodule`,
      design:
`// Type the clk_divider module here.
// Read the Theory tab — it explains the counter pattern and three-way if.
//
// Ports:
//   input  logic clk      — fast input clock
//   input  logic rst      — active-low reset
//   output logic clk_div  — pulse goes HIGH for 1 cycle every 4 cycles
//
// You also need an internal signal: logic [1:0] count;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, clk_div;
  clk_divider dut (.clk(clk), .rst(rst), .clk_div(clk_div));

  int pulse_count = 0;

  initial begin
    $display("=== Clock Divider Test ===");
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;
    repeat(16) begin
      @(posedge clk); #1;
      if (clk_div) pulse_count++;
    end
    if (pulse_count == 4)
      $display("PASS  4 pulses in 16 cycles (divide-by-4 confirmed)");
    else
      $display("FAIL  expected 4 pulses, got %0d", pulse_count);
    $display("Clock divider works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  4 pulses in 16 cycles',
        'Clock divider works!'
      ]
    },

    // ─── L5 [Bonus] — SR Flip-Flop ──────────────────────────────────────
    {
      id: 'msv2l5',
      title: 'L5 — [Bonus] SR Flip-Flop',
      theory: `
<h2>The SR Flip-Flop — Set and Reset</h2>
<p>The <strong>SR flip-flop</strong> was one of the first memory elements ever built from transistors. It has two control inputs: <strong>S</strong> (Set — forces Q to 1) and <strong>R</strong> (Reset — forces Q to 0). When both are 0, it holds its current value.</p>

<table class="truth-table">
  <tr><th>S</th><th>R</th><th>Q next</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>Q (hold)</td><td>No change — memory</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>Set: force Q high</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Reset: force Q low</td></tr>
  <tr><td>1</td><td>1</td><td>forbidden</td><td>Undefined — avoid this!</td></tr>
</table>

<h2>The Forbidden State</h2>
<p>S=1 and R=1 simultaneously is <strong>undefined</strong>. In a NOR-gate latch, it produces Q=Q_n=0 — which violates the rule that Q and Q_n are always complements. In clocked implementations, the behavior on S=R=1 depends on the design. Here, we hold Q unchanged in simulation to be safe — but <strong>you must never apply S=R=1 in real hardware</strong>.</p>

<h2>SR vs D Flip-Flop</h2>
<table class="truth-table">
  <tr><th>Feature</th><th>D Flip-Flop</th><th>SR Flip-Flop</th></tr>
  <tr><td>Inputs</td><td>1 (data)</td><td>2 (set, reset)</td></tr>
  <tr><td>Always defined?</td><td>Yes</td><td>No (S=R=1 forbidden)</td></tr>
  <tr><td>Common use</td><td>Registers, pipelines</td><td>Control logic, flag bits</td></tr>
  <tr><td>Modern usage</td><td>Dominant in digital design</td><td>Rare — D FF is preferred</td></tr>
</table>

<p>The D flip-flop was invented specifically to fix the SR FF's forbidden state: tie S = D and R = ~D, and S=R=1 is impossible by construction.</p>

<h2>What You Are Building</h2>
<p>A synchronous SR flip-flop (clocked version — cleaner for simulation). It also outputs <code>q_n</code>, the complement of <code>q</code>.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module sr_ff with ports: clk, rst (active-low), s, r (inputs), q, q_n (outputs)',
        'Open always_ff @(posedge clk) begin',
        'First: if (!rst) q <= 0;   ← reset has highest priority',
        'Then: else if (s && !r) q <= 1;   ← S=1,R=0 → Set',
        'Then: else if (!s && r) q <= 0;   ← S=0,R=1 → Reset',
        '(else: hold — no assignment needed in always_ff)',
        'After always_ff: assign q_n = ~q;   ← complement output is combinational',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear',
      ],
      hint:
`module sr_ff (
  input  logic clk,
  input  logic rst,    // active-low reset
  input  logic s,      // Set:   S=1,R=0 → Q becomes 1
  input  logic r,      // Reset: S=0,R=1 → Q becomes 0
  output logic q,
  output logic q_n     // complement: always ~q
);

  always_ff @(posedge clk) begin
    if (!rst)       q <= 1'b0;  // reset overrides everything
    else if (s && !r) q <= 1'b1;  // Set
    else if (!s && r) q <= 1'b0;  // Reset
    // s==r==0: hold (no assignment = implicit hold in always_ff)
    // s==r==1: hold in simulation (forbidden in real hardware!)
  end

  assign q_n = ~q;  // complement is always the inverse of q

endmodule`,
      design:
`// Type the sr_ff module here.
// Read the Theory tab — it explains Set/Reset behaviour and the forbidden state.
//
// Ports:
//   input  logic clk, rst   — clock and active-low reset
//   input  logic s          — Set:   S=1 forces Q=1
//   input  logic r          — Reset: R=1 forces Q=0
//   output logic q          — stored output
//   output logic q_n        — complement of q
//
// Important: assign q_n = ~q;  (outside the always_ff block)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, s, r, q, q_n;
  sr_ff dut (.clk(clk), .rst(rst), .s(s), .r(r), .q(q), .q_n(q_n));

  task automatic apply(input logic si, ri, exp_q);
    s = si; r = ri;
    @(posedge clk); #1;
    if (q === exp_q && q_n === ~exp_q)
      $display("PASS  S=%0b R=%0b -> Q=%0b Q_n=%0b", si, ri, q, q_n);
    else
      $display("FAIL  S=%0b R=%0b -> Q=%0b Q_n=%0b (expected Q=%0b)", si, ri, q, q_n, exp_q);
  endtask

  initial begin
    $display("=== SR Flip-Flop Test ===");
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;
    apply(0, 0, 0);   // hold (Q starts at 0 after reset)
    apply(1, 0, 1);   // Set
    apply(0, 0, 1);   // hold (Q stays 1)
    apply(0, 1, 0);   // Reset
    apply(0, 0, 0);   // hold (Q stays 0)
    apply(1, 0, 1);   // Set again
    $display("SR flip-flop works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  S=1 R=0 -> Q=1 Q_n=0',
        'PASS  S=0 R=1 -> Q=0 Q_n=1',
        'SR flip-flop works!'
      ]
    },

    // ─── L6 [Bonus] — JK Flip-Flop ──────────────────────────────────────
    {
      id: 'msv2l6',
      title: 'L6 — [Bonus] JK Flip-Flop',
      theory: `
<h2>The JK Flip-Flop — Fixing the Forbidden State</h2>
<p>The SR flip-flop has a forbidden state when S=R=1. The <strong>JK flip-flop</strong> solves this elegantly: when J=K=1, instead of undefined behaviour, the output <strong>toggles</strong> — it flips from its current value to the opposite. This makes J=K=1 perfectly valid and useful.</p>

<table class="truth-table">
  <tr><th>J</th><th>K</th><th>Q next</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>Q (hold)</td><td>No change — memory</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>Set: force Q high (like SR S=1)</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Reset: force Q low (like SR R=1)</td></tr>
  <tr><td>1</td><td>1</td><td>~Q (toggle)</td><td>Toggle: flip Q — no forbidden state!</td></tr>
</table>

<h2>How Toggle Works</h2>
<pre class="code-block">Before: Q = 0    J=1 K=1    After: Q = 1
Before: Q = 1    J=1 K=1    After: Q = 0
Before: Q = 0    J=1 K=1    After: Q = 1  (again)
...</pre>
<p>With J=K=1 and a steady clock, Q alternates every clock cycle — dividing the clock frequency by 2. This is how binary ripple counters were built before synchronous counters became standard.</p>

<h2>JK vs SR vs D</h2>
<table class="truth-table">
  <tr><th>FF Type</th><th>Forbidden state?</th><th>Toggle mode?</th><th>Modern use</th></tr>
  <tr><td>SR</td><td>Yes (S=R=1)</td><td>No</td><td>Rare</td></tr>
  <tr><td>JK</td><td>No</td><td>Yes (J=K=1)</td><td>Ripple counters, older designs</td></tr>
  <tr><td>D</td><td>No</td><td>No (need T FF)</td><td>Universal — used everywhere</td></tr>
  <tr><td>T</td><td>No</td><td>Always (T=1)</td><td>Counters, frequency dividers</td></tr>
</table>

<h2>Implementation with unique case</h2>
<pre class="code-block">unique case ({j, k})
  2'b00: q &lt;= q;    // hold
  2'b01: q &lt;= 1'b0; // reset
  2'b10: q &lt;= 1'b1; // set
  2'b11: q &lt;= ~q;   // toggle!
endcase</pre>

<p><strong>Ready?</strong> Switch to Code. This is almost identical to the SR FF — the toggle case in <code>unique case</code> is the only new line. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module jk_ff with ports: clk, rst (active-low), j, k (inputs), q, q_n (outputs)',
        'Open always_ff @(posedge clk) begin',
        'First: if (!rst) q <= 0;',
        'Then: else begin  unique case ({j, k})',
        '  2b00: q <= q;     ← hold',
        '  2b01: q <= 0;     ← reset',
        '  2b10: q <= 1;     ← set',
        '  2b11: q <= ~q;    ← TOGGLE (the new behaviour!)',
        'endcase  end',
        'After always_ff: assign q_n = ~q;',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — verify toggle behaviour fires on J=K=1',
      ],
      hint:
`module jk_ff (
  input  logic clk,
  input  logic rst,
  input  logic j,      // Set (or Toggle with K)
  input  logic k,      // Reset (or Toggle with J)
  output logic q,
  output logic q_n
);

  always_ff @(posedge clk) begin
    if (!rst) q <= 1'b0;
    else begin
      unique case ({j, k})
        2'b00: q <= q;      // Hold
        2'b01: q <= 1'b0;   // Reset
        2'b10: q <= 1'b1;   // Set
        2'b11: q <= ~q;     // Toggle — the key feature of JK FF!
      endcase
    end
  end

  assign q_n = ~q;

endmodule`,
      design:
`// Type the jk_ff module here.
// Read the Theory tab — it explains the toggle behaviour when J=K=1.
//
// Ports:
//   input  logic clk, rst   — clock and active-low reset
//   input  logic j          — Set (J=1,K=0) or part of Toggle (J=K=1)
//   input  logic k          — Reset (J=0,K=1) or part of Toggle (J=K=1)
//   output logic q          — stored output
//   output logic q_n        — complement
//
// Key: use unique case ({j, k}) with 4 cases
// The toggle case: 2'b11: q <= ~q;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, j, k, q, q_n;
  jk_ff dut (.clk(clk), .rst(rst), .j(j), .k(k), .q(q), .q_n(q_n));

  initial begin
    $display("=== JK Flip-Flop Test ===");
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;

    // Set: J=1 K=0 -> Q should become 1
    j = 1; k = 0; @(posedge clk); #1;
    if (q === 1'b1)
      $display("PASS  J=1 K=0: Q=%0b (Set)", q);
    else
      $display("FAIL  J=1 K=0: Q=%0b (expected 1)", q);

    // Reset: J=0 K=1 -> Q should become 0
    j = 0; k = 1; @(posedge clk); #1;
    if (q === 1'b0)
      $display("PASS  J=0 K=1: Q=%0b (Reset)", q);
    else
      $display("FAIL  J=0 K=1: Q=%0b (expected 0)", q);

    // Toggle: J=1 K=1 -> Q flips each clock
    j = 1; k = 1;
    @(posedge clk); #1;
    if (q === 1'b1)
      $display("PASS  J=1 K=1: Q=%0b (Toggle 0->1)", q);
    else
      $display("FAIL  Toggle 1st: Q=%0b (expected 1)", q);

    @(posedge clk); #1;
    if (q === 1'b0)
      $display("PASS  J=1 K=1: Q=%0b (Toggle 1->0)", q);
    else
      $display("FAIL  Toggle 2nd: Q=%0b (expected 0)", q);

    // Hold: J=0 K=0 -> Q stays 0
    j = 0; k = 0; @(posedge clk); #1;
    if (q === 1'b0)
      $display("PASS  J=0 K=0: Q=%0b (Hold)", q);
    else
      $display("FAIL  Hold: Q=%0b (expected 0)", q);

    $display("JK flip-flop works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  J=1 K=0: Q=1 (Set)',
        'PASS  J=1 K=1: Q=1 (Toggle 0->1)',
        'JK flip-flop works!'
      ]
    },

    // ─── L7 [Bonus] — T Flip-Flop ────────────────────────────────────────
    {
      id: 'msv2l7',
      title: 'L7 — [Bonus] T Flip-Flop',
      theory: `
<h2>The T Flip-Flop — Toggle on Demand</h2>
<p>The <strong>T (Toggle) flip-flop</strong> is the simplest sequential element after the D FF. It has a single control input: when <code>T=1</code>, the output toggles on every rising clock edge. When <code>T=0</code>, it holds. It is directly derived from the JK FF by connecting J=K=T.</p>

<table class="truth-table">
  <tr><th>T</th><th>Q next</th><th>Meaning</th></tr>
  <tr><td>0</td><td>Q (hold)</td><td>No change — freeze the output</td></tr>
  <tr><td>1</td><td>~Q (toggle)</td><td>Flip Q on every rising clock edge</td></tr>
</table>

<h2>T FF as a Frequency Divider</h2>
<p>With T=1 permanently, the output toggles every clock cycle — dividing the frequency by 2:</p>
<pre class="code-block">clk: ‾_‾_‾_‾_‾_‾_‾_‾_‾_  (100 MHz)
 T=1 means toggle every edge:
   q: ‾‾__‾‾__‾‾__‾‾__‾‾  (50 MHz — frequency halved)

Chain 4 T FFs: 100 MHz → 50 → 25 → 12.5 → 6.25 MHz</pre>

<p>This is how ripple counters and clock dividers are built from flip-flops. The clock divider you built in L4 is functionally equivalent to a T FF with T=1.</p>

<h2>Building a Counter from T FFs</h2>
<p>A binary counter can be built by chaining T FFs. Each FF's output drives the clock of the next — each stage halves the frequency again, producing a natural binary count:</p>
<pre class="code-block">       T FF 0           T FF 1           T FF 2
clk → [T=1]→q0 → [T=1]→q1 → [T=1]→q2

q2 q1 q0
 0  0  0   (reset)
 0  0  1
 0  1  0
 0  1  1
 1  0  0
 ...  (natural binary count)</pre>

<h2>Implementation</h2>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) q &lt;= 1'b0;
  else if (t) q &lt;= ~q;   // toggle!
  // else: implicit hold (no assignment)
end</pre>

<p><strong>Ready?</strong> This is the simplest flip-flop of all. Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module t_ff with ports: clk, rst (active-low), t (input), q, q_n (outputs)',
        'Open always_ff @(posedge clk) begin',
        'if (!rst) q <= 0;',
        'else if (t) q <= ~q;   ← the entire toggle logic in one line',
        '(no else needed — implicit hold when t=0)',
        'After always_ff: assign q_n = ~q;',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — with T=1, Q should alternate 0,1,0,1,...',
      ],
      hint:
`module t_ff (
  input  logic clk,
  input  logic rst,   // active-low reset
  input  logic t,     // 1 = toggle, 0 = hold
  output logic q,
  output logic q_n
);

  always_ff @(posedge clk) begin
    if (!rst) q <= 1'b0;  // reset
    else if (t) q <= ~q;  // toggle when T=1
    // T=0: implicit hold (no else branch needed)
  end

  assign q_n = ~q;

endmodule`,
      design:
`// Type the t_ff module here.
// Read the Theory tab — it explains the toggle behaviour and frequency division.
//
// Ports:
//   input  logic clk, rst   — clock and active-low reset
//   input  logic t          — 1=toggle Q every clock, 0=hold
//   output logic q          — output
//   output logic q_n        — complement
//
// Core logic (2 lines inside always_ff):
//   if (!rst) q <= 0;
//   else if (t) q <= ~q;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, t, q, q_n;
  t_ff dut (.clk(clk), .rst(rst), .t(t), .q(q), .q_n(q_n));

  initial begin
    $display("=== T Flip-Flop Test ===");
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;

    // Hold: T=0 — Q should stay 0
    t = 0; repeat(3) @(posedge clk); #1;
    if (q === 1'b0)
      $display("PASS  T=0: Q=%0b (hold, no change)", q);
    else
      $display("FAIL  T=0 hold: Q=%0b (expected 0)", q);

    // Toggle: T=1 — Q should flip each clock
    t = 1; @(posedge clk); #1;
    if (q === 1'b1)
      $display("PASS  T=1 tick 1: Q=%0b (toggled 0->1)", q);
    else
      $display("FAIL  T=1 tick 1: Q=%0b (expected 1)", q);

    @(posedge clk); #1;
    if (q === 1'b0)
      $display("PASS  T=1 tick 2: Q=%0b (toggled 1->0)", q);
    else
      $display("FAIL  T=1 tick 2: Q=%0b (expected 0)", q);

    @(posedge clk); #1;
    if (q === 1'b1)
      $display("PASS  T=1 tick 3: Q=%0b (toggled 0->1)", q);
    else
      $display("FAIL  T=1 tick 3: Q=%0b (expected 1)", q);

    // Verify q_n is always complement
    if (q_n === ~q)
      $display("PASS  q_n = ~q verified");
    else
      $display("FAIL  q_n=%0b should be ~q=%0b", q_n, ~q);

    $display("T flip-flop works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  T=0: Q=0 (hold, no change)',
        'PASS  T=1 tick 1: Q=1 (toggled 0->1)',
        'T flip-flop works!'
      ]
    },

    // ─── L8 [Bonus] — 4-bit Synchronous Up/Down Counter ──────────────────
    {
      id: 'msv2l8',
      title: 'L8 — [Bonus] Up/Down Counter',
      theory: `
<h2>The Up/Down Counter — Practice Project</h2>
<p>You have now built D, SR, JK, and T flip-flops. This bonus lesson combines what you know about registers and counters into a practical circuit used in motor controllers, rotary encoders, and address generators: the <strong>synchronous up/down counter</strong>.</p>

<h2>How It Works</h2>
<ul>
  <li><code>en=0</code>: counter is frozen (no change, even if dir changes)</li>
  <li><code>en=1, dir=1</code>: count increments each clock (0→1→2→…→15→0)</li>
  <li><code>en=1, dir=0</code>: count decrements each clock (15→14→…→1→0→15)</li>
  <li><code>overflow</code>: asserted for 1 cycle when count wraps 15→0 while counting up</li>
  <li><code>underflow</code>: asserted for 1 cycle when count wraps 0→15 while counting down</li>
</ul>

<pre class="code-block">  Count up (dir=1):    0→1→2→3→…→14→15→0→1→…
                                       ↑
                               overflow=1 here (one cycle)

  Count down (dir=0):  15→14→…→1→0→15→14→…
                                  ↑
                          underflow=1 here (one cycle)</pre>

<h2>Detecting Overflow/Underflow Before the Transition</h2>
<p>The flags must be set <em>when the wrap happens</em>, not one cycle later. Detect the condition in the same always_ff block, on the same clock edge as the count update:</p>
<pre class="code-block">if (en) begin
  if (dir) begin
    count    &lt;= count + 4'b1;
    overflow &lt;= (count == 4'hF);  // count IS 15 → NEXT will be 0
  end else begin
    count     &lt;= count - 4'b1;
    underflow &lt;= (count == 4'h0); // count IS 0 → NEXT will be 15
  end
end</pre>

<h2>Real-World Use</h2>
<p>Quadrature encoder counters (used in robot wheels and CNC machines) are up/down counters where direction is determined by which of two sensor signals arrives first. Audio volume knobs on digital mixers are often hardware up/down counters.</p>

<p><strong>Ready?</strong> Switch to Code. You have all the tools — always_ff, buses, if/else. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Module up_down_counter: inputs clk, rst (active-low), en, dir — outputs count[3:0], overflow, underflow',
        'Open always_ff @(posedge clk) begin',
        'Reset branch: if (!rst) clear count, overflow, underflow to 0',
        'Else branch: always clear overflow and underflow to 0 first',
        'Then: if (en) check dir — if dir=1 increment, if dir=0 decrement',
        'Set overflow=1 when count==15 and dir=1 (before increment wraps)',
        'Set underflow=1 when count==0 and dir=0 (before decrement wraps)',
        'Close with end, then endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — verify count up to 15, overflow flag, count down to 0, underflow flag',
      ],
      hint:
`module up_down_counter (
  input  logic       clk,
  input  logic       rst,        // active-low reset
  input  logic       en,         // enable: 1 = count, 0 = freeze
  input  logic       dir,        // direction: 1 = up, 0 = down
  output logic [3:0] count,
  output logic       overflow,   // 1-cycle pulse: wrapped 15->0
  output logic       underflow   // 1-cycle pulse: wrapped 0->15
);

  always_ff @(posedge clk) begin
    if (!rst) begin
      count     <= 4'b0;
      overflow  <= 1'b0;
      underflow <= 1'b0;
    end else begin
      overflow  <= 1'b0;   // clear flags every cycle
      underflow <= 1'b0;
      if (en) begin
        if (dir) begin
          count    <= count + 4'b1;
          overflow <= (count == 4'hF);  // detect before wrap
        end else begin
          count     <= count - 4'b1;
          underflow <= (count == 4'h0); // detect before wrap
        end
      end
    end
  end

endmodule`,
      design:
`// Type the up_down_counter module here.
// Read the Theory tab — it explains direction control and overflow/underflow detection.
//
// Ports:
//   input  logic       clk, rst   — clock and active-low reset
//   input  logic       en         — 1=count, 0=freeze
//   input  logic       dir        — 1=count up, 0=count down
//   output logic [3:0] count      — current count value
//   output logic       overflow   — 1-cycle pulse when 15->0 wrap occurs
//   output logic       underflow  — 1-cycle pulse when 0->15 wrap occurs
//
// Key: detect overflow/underflow BEFORE the add/subtract:
//   overflow  <= (count == 4'hF) when dir=1
//   underflow <= (count == 4'h0) when dir=0
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, en, dir, overflow, underflow;
  logic [3:0] count;
  up_down_counter dut (.clk(clk), .rst(rst), .en(en), .dir(dir),
                       .count(count), .overflow(overflow), .underflow(underflow));

  initial begin
    $display("=== Up/Down Counter Test ===");
    rst = 0; en = 0; dir = 1;
    @(posedge clk); #1; rst = 1;

    // Count up from 0 to 3
    en = 1; dir = 1;
    repeat(3) @(posedge clk); #1;
    if (count === 4'd3)
      $display("PASS  Count up to 3: count=%0d", count);
    else
      $display("FAIL  Count up: count=%0d (expected 3)", count);

    // Count to 15 and check overflow
    repeat(12) @(posedge clk); #1;  // count is now 15
    @(posedge clk); #1;             // wraps: count=0, overflow=1
    if (overflow === 1'b1)
      $display("PASS  Overflow detected at wrap: count=%0d", count);
    else
      $display("FAIL  Overflow: expected 1, got %0b", overflow);

    // Count down from 0 and check underflow
    dir = 0;
    @(posedge clk); #1;  // wraps: count=15, underflow=1
    if (underflow === 1'b1)
      $display("PASS  Underflow detected at wrap: count=%0d", count);
    else
      $display("FAIL  Underflow: expected 1, got %0b", underflow);

    // Freeze: en=0 should stop counting
    en = 0; logic [3:0] frozen_count;
    frozen_count = count;
    repeat(3) @(posedge clk); #1;
    if (count === frozen_count)
      $display("PASS  Freeze: count held at %0d", count);
    else
      $display("FAIL  Freeze: count changed to %0d", count);

    $display("Up/Down counter works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Count up to 3: count=3',
        'PASS  Overflow detected at wrap',
        'PASS  Underflow detected at wrap',
        'Up/Down counter works!'
      ]
    }

  ]
});
