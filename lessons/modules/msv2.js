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

<h2>Non-Blocking Assignment &lt;=</h2>
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

<p><strong>Why active-low?</strong> In real chips, reset lines are often held high by pull-up resistors. Pulling the line low requires active drive — this is safer because a floating wire stays in the non-reset state.</p>

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
  <li><strong>Using = instead of &lt;=</strong> in always_ff — causes race conditions in simulation</li>
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
<p>To carry multiple bits at once, SystemVerilog uses a <strong>bus</strong>. The notation <code>[3:0]</code> means 4 bits, numbered bit 3 (MSB) down to bit 0 (LSB):</p>
<pre class="code-block">logic [3:0] d;   // 4-bit bus: d[3] d[2] d[1] d[0]
//   [3:0]         MSB=bit3          LSB=bit0</pre>

<table class="truth-table">
  <tr><th>Notation</th><th>Bits</th><th>Max value</th><th>Real world</th></tr>
  <tr><td><code>[3:0]</code></td><td>4</td><td>15</td><td>Nibble, BCD digit</td></tr>
  <tr><td><code>[7:0]</code></td><td>8</td><td>255</td><td>1 byte, ASCII character</td></tr>
  <tr><td><code>[15:0]</code></td><td>16</td><td>65535</td><td>Half-word (ARM Thumb)</td></tr>
  <tr><td><code>[31:0]</code></td><td>32</td><td>4 billion</td><td>CPU register (ARM, RISC-V)</td></tr>
</table>

<h2>Binary Literals</h2>
<pre class="code-block">4'b1010   // 4-bit binary: 1010 = decimal 10
4'b0000   // all zeros  (used for reset value)
4'hA      // hex A = 1010 (same as 4'b1010)</pre>

<h2>The Register: Same always_ff, Different Port Types</h2>
<p>The logic is identical to L1 — only the port types change from 1-bit <code>logic</code> to 4-bit <code>logic [3:0]</code>:</p>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) q &lt;= 4'b0000;   // reset: clear all 4 bits
  else      q &lt;= d;          // capture all 4 bits at once
end</pre>

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

<h2>Concatenation — the {} Operator</h2>
<pre class="code-block">q &lt;= {q[2:0], sin};
// Before: q = 1 0 1 0   sin = 1
// After:  q = 0 1 0 1  ← sin entered at bit 0, bit 3 dropped</pre>

<p><strong>Ready?</strong> The structure is familiar from L1 and L2 — only the shift line is new. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — write the full module.',
        'Declare module shift_reg with ports: clk, rst, sin (1-bit serial input), q[3:0] (parallel output)',
        'Open the always_ff @(posedge clk) block',
        "Reset case: if (!rst) q <= 4'b0000;",
        'Shift case: else q <= {q[2:0], sin};',
        'Close with end, then endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        "Hit Run — after shifting in 1,0,1,1 the output should read q=1011",
      ],
      hint:
`module shift_reg (
  input  logic       clk,
  input  logic       rst,
  input  logic       sin,
  output logic [3:0] q
);
  always_ff @(posedge clk) begin
    if (!rst) q <= 4'b0000;
    else      q <= {q[2:0], sin};
  end
endmodule`,
      design:
`// Type the shift_reg module here.
// Key line: q <= {q[2:0], sin};
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
    sin = b; @(posedge clk); #1;
  endtask
  initial begin
    $display("=== Shift Register Test ===");
    rst = 0; @(posedge clk); #1; rst = 1;
    shift_in(1); shift_in(0); shift_in(1); shift_in(1);
    if (q === 4'b1011)
      $display("PASS  shifted 1,0,1,1 -> q=%04b", q);
    else
      $display("FAIL  shifted 1,0,1,1 -> q=%04b (expected 1011)", q);
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
<pre class="code-block">count: 0 → 1 → 2 → 3 → 0 → 1 → 2 → 3 → ...   (N=4)
                       ↑
                  clk_div=1 here (one-cycle pulse)</pre>

<h2>Internal Signals</h2>
<pre class="code-block">logic [1:0] count;   // 2 bits — counts 0,1,2,3</pre>

<h2>Three-Way if in always_ff</h2>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) begin
    count   &lt;= 2'b00;
    clk_div &lt;= 1'b0;
  end else if (count == 2'd3) begin
    count   &lt;= 2'b00;
    clk_div &lt;= 1'b1;
  end else begin
    count   &lt;= count + 2'b01;
    clk_div &lt;= 1'b0;
  end
end</pre>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — write the full module.',
        'Declare module clk_divider with ports: clk (in), rst (in), clk_div (out)',
        'Declare internal signal: logic [1:0] count;',
        'Open always_ff @(posedge clk) begin',
        "Branch 1 — reset: if (!rst) begin  count <= 0;  clk_div <= 0;  end",
        "Branch 2 — pulse: else if (count == 2'd3) begin  count <= 0;  clk_div <= 1;  end",
        'Branch 3 — keep counting: else begin  count <= count + 1;  clk_div <= 0;  end',
        'Close with end, then endmodule',
        '🎓 VLSI Foundations certificate unlocked — complete msv1 + msv2 to claim it',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — should see 4 pulses in 16 cycles',
      ],
      hint:
`module clk_divider (
  input  logic clk,
  input  logic rst,
  output logic clk_div
);
  logic [1:0] count;
  always_ff @(posedge clk) begin
    if (!rst) begin
      count   <= 2'b00;
      clk_div <= 1'b0;
    end else if (count == 2'd3) begin
      count   <= 2'b00;
      clk_div <= 1'b1;
    end else begin
      count   <= count + 2'b01;
      clk_div <= 1'b0;
    end
  end
endmodule`,
      design:
`// Type the clk_divider module here.
// Internal signal: logic [1:0] count;
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
<p>S=1 and R=1 simultaneously is <strong>undefined</strong>. In a NOR-gate latch it produces Q=Q_n=0, violating the rule that Q and Q_n are always complements. Here we hold Q unchanged in simulation — but <strong>never apply S=R=1 in real hardware</strong>.</p>

<h2>SR vs D Flip-Flop</h2>
<table class="truth-table">
  <tr><th>Feature</th><th>D FF</th><th>SR FF</th></tr>
  <tr><td>Inputs</td><td>1 (data)</td><td>2 (set, reset)</td></tr>
  <tr><td>Forbidden state?</td><td>No</td><td>Yes (S=R=1)</td></tr>
  <tr><td>Modern usage</td><td>Dominant</td><td>Rare — D FF preferred</td></tr>
</table>

<p>The D FF was invented to fix the SR FF: tie S=D and R=~D, so S=R=1 is impossible by construction.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module sr_ff with ports: clk, rst (active-low), s, r (inputs), q, q_n (outputs)',
        'Open always_ff @(posedge clk) begin',
        'if (!rst) q <= 0;',
        'else if (s && !r) q <= 1;   ← Set',
        'else if (!s && r) q <= 0;   ← Reset',
        '(else: implicit hold when s==r==0 or s==r==1)',
        'After always_ff: assign q_n = ~q;',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear',
      ],
      hint:
`module sr_ff (
  input  logic clk, rst,
  input  logic s, r,
  output logic q, q_n
);
  always_ff @(posedge clk) begin
    if (!rst)         q <= 1'b0;
    else if (s && !r) q <= 1'b1;  // Set
    else if (!s && r) q <= 1'b0;  // Reset
    // s==r==0: hold  |  s==r==1: hold (forbidden in real HW)
  end
  assign q_n = ~q;
endmodule`,
      design:
`// Type the sr_ff module here.
// Ports: clk, rst (active-low), s (Set), r (Reset), q, q_n
// Key: assign q_n = ~q; (outside always_ff)
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
    apply(0, 0, 0);
    apply(1, 0, 1);
    apply(0, 0, 1);
    apply(0, 1, 0);
    apply(0, 0, 0);
    apply(1, 0, 1);
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
<p>The SR flip-flop has a forbidden state when S=R=1. The <strong>JK flip-flop</strong> solves this: when J=K=1, instead of undefined behaviour, the output <strong>toggles</strong> — it flips to the opposite value. J=K=1 is perfectly valid and useful.</p>

<table class="truth-table">
  <tr><th>J</th><th>K</th><th>Q next</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>Q (hold)</td><td>No change</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>Set</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Reset</td></tr>
  <tr><td>1</td><td>1</td><td>~Q (toggle)</td><td>Flip! No forbidden state.</td></tr>
</table>

<h2>Toggle = Frequency Divide by 2</h2>
<p>With J=K=1 permanently, Q alternates every clock — dividing clock frequency by 2. Chain 4 JK FFs: 100 MHz → 50 → 25 → 12.5 → 6.25 MHz.</p>

<h2>Implementation</h2>
<pre class="code-block">unique case ({j, k})
  2'b00: q &lt;= q;    // hold
  2'b01: q &lt;= 0;    // reset
  2'b10: q &lt;= 1;    // set
  2'b11: q &lt;= ~q;   // toggle!
endcase</pre>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Declare module jk_ff: clk, rst (active-low), j, k (inputs), q, q_n (outputs)',
        'Open always_ff @(posedge clk)',
        'if (!rst) q <= 0;',
        'else begin  unique case ({j, k})',
        "  2'b00: q <= q;  2'b01: q <= 0;  2'b10: q <= 1;  2'b11: q <= ~q;",
        'endcase  end',
        'assign q_n = ~q;',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — verify toggle fires on J=K=1',
      ],
      hint:
`module jk_ff (
  input  logic clk, rst, j, k,
  output logic q, q_n
);
  always_ff @(posedge clk) begin
    if (!rst) q <= 1'b0;
    else begin
      unique case ({j, k})
        2'b00: q <= q;      // Hold
        2'b01: q <= 1'b0;   // Reset
        2'b10: q <= 1'b1;   // Set
        2'b11: q <= ~q;     // Toggle!
      endcase
    end
  end
  assign q_n = ~q;
endmodule`,
      design:
`// Type the jk_ff module here.
// Key: unique case ({j, k}) with 4 cases. Toggle: 2'b11: q <= ~q;
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
    j = 1; k = 0; @(posedge clk); #1;
    if (q === 1'b1) $display("PASS  J=1 K=0: Q=%0b (Set)", q);
    else $display("FAIL  J=1 K=0: Q=%0b (expected 1)", q);
    j = 0; k = 1; @(posedge clk); #1;
    if (q === 1'b0) $display("PASS  J=0 K=1: Q=%0b (Reset)", q);
    else $display("FAIL  J=0 K=1: Q=%0b (expected 0)", q);
    j = 1; k = 1;
    @(posedge clk); #1;
    if (q === 1'b1) $display("PASS  J=1 K=1: Q=%0b (Toggle 0->1)", q);
    else $display("FAIL  Toggle 1st: Q=%0b (expected 1)", q);
    @(posedge clk); #1;
    if (q === 1'b0) $display("PASS  J=1 K=1: Q=%0b (Toggle 1->0)", q);
    else $display("FAIL  Toggle 2nd: Q=%0b (expected 0)", q);
    j = 0; k = 0; @(posedge clk); #1;
    if (q === 1'b0) $display("PASS  J=0 K=0: Q=%0b (Hold)", q);
    else $display("FAIL  Hold: Q=%0b (expected 0)", q);
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
<p>The <strong>T (Toggle) flip-flop</strong> has a single control input: T=1 toggles the output each clock, T=0 holds. It is derived directly from the JK FF by connecting J=K=T.</p>

<table class="truth-table">
  <tr><th>T</th><th>Q next</th><th>Meaning</th></tr>
  <tr><td>0</td><td>Q (hold)</td><td>No change</td></tr>
  <tr><td>1</td><td>~Q (toggle)</td><td>Flip Q each rising edge</td></tr>
</table>

<h2>T FF as Frequency Divider</h2>
<pre class="code-block">clk: ‾_‾_‾_‾_‾_‾_‾_  (100 MHz)
T=1 means toggle every edge:
  q: ‾‾__‾‾__‾‾__         (50 MHz — frequency halved!)

Chain 4: 100MHz → 50 → 25 → 12.5 → 6.25 MHz</pre>

<h2>Implementation</h2>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) q &lt;= 0;
  else if (t) q &lt;= ~q;  // toggle!
  // T=0: implicit hold
end</pre>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Declare module t_ff: clk, rst (active-low), t (inputs), q, q_n (outputs)',
        'always_ff: if (!rst) q <= 0; else if (t) q <= ~q;',
        'assign q_n = ~q;',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — T=1 should make Q alternate 0,1,0,1,...',
      ],
      hint:
`module t_ff (
  input  logic clk, rst, t,
  output logic q, q_n
);
  always_ff @(posedge clk) begin
    if (!rst) q <= 1'b0;
    else if (t) q <= ~q;  // toggle when T=1
    // T=0: implicit hold
  end
  assign q_n = ~q;
endmodule`,
      design:
`// Type the t_ff module here.
// Core: if (!rst) q <= 0; else if (t) q <= ~q;
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
    t = 0; repeat(3) @(posedge clk); #1;
    if (q === 1'b0) $display("PASS  T=0: Q=%0b (hold, no change)", q);
    else $display("FAIL  T=0 hold: Q=%0b (expected 0)", q);
    t = 1; @(posedge clk); #1;
    if (q === 1'b1) $display("PASS  T=1 tick 1: Q=%0b (toggled 0->1)", q);
    else $display("FAIL  T=1 tick 1: Q=%0b (expected 1)", q);
    @(posedge clk); #1;
    if (q === 1'b0) $display("PASS  T=1 tick 2: Q=%0b (toggled 1->0)", q);
    else $display("FAIL  T=1 tick 2: Q=%0b (expected 0)", q);
    @(posedge clk); #1;
    if (q === 1'b1) $display("PASS  T=1 tick 3: Q=%0b (toggled 0->1)", q);
    else $display("FAIL  T=1 tick 3: Q=%0b (expected 1)", q);
    if (q_n === ~q) $display("PASS  q_n = ~q verified");
    else $display("FAIL  q_n=%0b should be ~q=%0b", q_n, ~q);
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

    // ─── L8 [Bonus] — 4-bit Up/Down Counter ────────────────────────────────────
    {
      id: 'msv2l8',
      title: 'L8 — [Bonus] Up/Down Counter',
      theory: `
<h2>The Up/Down Counter — Practice Project</h2>
<p>You have now built D, SR, JK, and T flip-flops. This lesson combines registers and counters into a practical circuit: the <strong>synchronous up/down counter</strong>, used in motor controllers, rotary encoders, and address generators.</p>

<h2>How It Works</h2>
<ul>
  <li><code>en=0</code>: counter is frozen</li>
  <li><code>en=1, dir=1</code>: count increments each clock (0→1→…→15→0)</li>
  <li><code>en=1, dir=0</code>: count decrements each clock (15→14→…→0→15)</li>
  <li><code>overflow</code>: 1-cycle pulse when 15→0 while counting up</li>
  <li><code>underflow</code>: 1-cycle pulse when 0→15 while counting down</li>
</ul>

<h2>Detecting Flags Before the Transition</h2>
<pre class="code-block">if (en) begin
  if (dir) begin
    count    &lt;= count + 4'b1;
    overflow &lt;= (count == 4'hF);  // IS 15 now → NEXT will be 0
  end else begin
    count     &lt;= count - 4'b1;
    underflow &lt;= (count == 4'h0); // IS 0 now → NEXT will be 15
  end
end</pre>

<p><strong>Ready?</strong> Switch to Code. You have all the tools — always_ff, buses, if/else. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Module up_down_counter: inputs clk, rst (active-low), en, dir — outputs count[3:0], overflow, underflow',
        'Reset: clear count, overflow, underflow to 0',
        'Else: always clear overflow and underflow to 0 first',
        'Then if (en): if dir=1 increment + detect overflow; if dir=0 decrement + detect underflow',
        'overflow <= (count == 4hF) when counting up (BEFORE the add)',
        'underflow <= (count == 4h0) when counting down (BEFORE the subtract)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — verify count up, overflow, count down, underflow',
      ],
      hint:
`module up_down_counter (
  input  logic       clk, rst, en, dir,
  output logic [3:0] count,
  output logic       overflow, underflow
);
  always_ff @(posedge clk) begin
    if (!rst) begin
      count <= 4'b0; overflow <= 0; underflow <= 0;
    end else begin
      overflow  <= 1'b0;
      underflow <= 1'b0;
      if (en) begin
        if (dir) begin
          count    <= count + 4'b1;
          overflow <= (count == 4'hF);
        end else begin
          count     <= count - 4'b1;
          underflow <= (count == 4'h0);
        end
      end
    end
  end
endmodule`,
      design:
`// Type the up_down_counter module here.
// Ports: clk, rst (active-low), en, dir, count[3:0], overflow, underflow
// Key: detect overflow/underflow BEFORE the add/subtract.
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;
  logic rst, en, dir, overflow, underflow;
  logic [3:0] count;
  logic [3:0] saved_count;
  up_down_counter dut (.clk(clk), .rst(rst), .en(en), .dir(dir),
                       .count(count), .overflow(overflow), .underflow(underflow));
  initial begin
    $display("=== Up/Down Counter Test ===");
    rst = 0; en = 0; dir = 1;
    @(posedge clk); #1; rst = 1;
    // Count up 3 steps
    en = 1; dir = 1;
    repeat(3) @(posedge clk); #1;
    if (count === 4'd3)
      $display("PASS  Count up to 3: count=%0d", count);
    else
      $display("FAIL  Count up: count=%0d (expected 3)", count);
    // Count to 15 and check overflow
    repeat(12) @(posedge clk); #1;
    @(posedge clk); #1;
    if (overflow === 1'b1)
      $display("PASS  Overflow detected at wrap: count=%0d", count);
    else
      $display("FAIL  Overflow: expected 1, got %0b", overflow);
    // Count down from 0 -> underflow
    dir = 0;
    @(posedge clk); #1;
    if (underflow === 1'b1)
      $display("PASS  Underflow detected at wrap: count=%0d", count);
    else
      $display("FAIL  Underflow: expected 1, got %0b", underflow);
    // Freeze test
    en = 0;
    saved_count = count;
    repeat(3) @(posedge clk); #1;
    if (count === saved_count)
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
