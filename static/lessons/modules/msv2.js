// Module msv2 — Sequential Logic
// 4 lessons, tiers 1→2→3. Verilator 5.020 safe.
// Testbenches use @(posedge clk) not #delay — works with --no-timing.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv2',
  title: 'Sequential Logic',
  icon: '🔄',
  level: 'beginner',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────
    // L1 — D Flip-Flop (Tier 1)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv2l1',
      title: 'L1 — D Flip-Flop',
      theory: `
<h2>From combinational to sequential</h2>
<p>Everything in Module 1 was <strong>combinational</strong> — outputs reacted instantly to inputs, like a light switch. Real digital systems also need <strong>memory</strong> — the ability to hold a value between moments in time. That requires <strong>sequential logic</strong>.</p>

<h2>The clock — the heartbeat of digital logic</h2>
<p>A clock is a signal that alternates between 0 and 1 at a fixed rate (e.g. 100 million times per second). Sequential logic only changes its output on the <strong>rising edge</strong> — the exact instant the clock goes from 0 to 1.</p>

<div class="flow-diagram">
  <div class="flow-step">0<small>LOW</small></div>
  <span class="flow-arrow">↑</span>
  <div class="flow-step" style="border-color:var(--accent);color:var(--accent)">rising edge<small>← output updates HERE</small></div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">1<small>HIGH</small></div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">0<small>LOW</small></div>
  <span class="flow-arrow">↑</span>
  <div class="flow-step" style="border-color:var(--accent);color:var(--accent)">rising edge<small>← again</small></div>
</div>

<h2>always_ff — the sequential block</h2>
<p>Just like <code>always_comb</code> was for combinational logic, <code>always_ff</code> is for sequential logic. It runs only on the rising clock edge:</p>
<pre class="code-block">always_ff @(posedge clk) begin
  // runs once per clock tick
end</pre>

<h2>Non-blocking assignment &lt;=</h2>
<p>Inside <code>always_ff</code>, use <code>&lt;=</code> (non-blocking) instead of <code>=</code>. This ensures all assignments happen simultaneously using the <em>old</em> values — exactly how real flip-flops behave in silicon.</p>
<pre class="code-block">q &lt;= d;   // correct — non-blocking, use inside always_ff
q = d;    // wrong  — blocking, causes subtle bugs in sequential logic</pre>

<h2>Active-low reset</h2>
<p><strong>Active-low</strong> means the reset is ON when the signal is 0. So <code>!rst</code> reads as “in reset”:</p>
<pre class="code-block">if (!rst) q &lt;= 0;  // rst=0 → clear output to 0
else      q &lt;= d;  // rst=1 → normal operation</pre>

<h2>What you are building — a D flip-flop</h2>
<p>The most fundamental memory element in all of digital design. It captures <code>d</code> on every rising clock edge and holds it until the next:</p>
<table class="truth-table">
  <tr><th>rst</th><th>clock</th><th>d</th><th>q after edge</th></tr>
  <tr><td>0</td><td>&uarr;</td><td>any</td><td>0 (reset)</td></tr>
  <tr><td>1</td><td>&uarr;</td><td>0</td><td>0</td></tr>
  <tr><td>1</td><td>&uarr;</td><td>1</td><td>1</td></tr>
  <tr><td>1</td><td>no edge</td><td>any</td><td>unchanged</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type every line. Stuck? Tap 💡 Show Hint for a fully annotated reference.</p>
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

    // ─────────────────────────────────────────────────────────────────────
    // L2 — 4-bit Register (Tier 2)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv2l2',
      title: 'L2 — 4-bit Register',
      theory: `
<h2>From 1 bit to 4 bits</h2>
<p>A flip-flop stores one bit. A <strong>register</strong> stores multiple bits simultaneously — it is simply several flip-flops sharing the same clock and reset, working in parallel. Registers are the most common memory structure inside every processor.</p>

<h2>Bus signals — logic [N:0]</h2>
<p>To carry multiple bits at once, SystemVerilog uses a <strong>bus</strong>. The notation <code>[3:0]</code> means 4 bits, numbered from bit 3 (MSB) down to bit 0 (LSB):</p>
<pre class="code-block">logic [3:0] d;   // 4-bit bus: d[3] d[2] d[1] d[0]
//   [3:0] → 4 bits total
//    MSB → bit 3      LSB → bit 0</pre>

<table class="truth-table">
  <tr><th>Notation</th><th>Bits</th><th>Range</th></tr>
  <tr><td><code>[3:0]</code></td><td>4</td><td>0 to 15</td></tr>
  <tr><td><code>[7:0]</code></td><td>8</td><td>0 to 255 (1 byte)</td></tr>
  <tr><td><code>[15:0]</code></td><td>16</td><td>0 to 65535</td></tr>
  <tr><td><code>[31:0]</code></td><td>32</td><td>0 to 4 billion (CPU register)</td></tr>
</table>

<h2>Binary literals</h2>
<p>To assign a specific bit pattern, use a binary literal: <code>4'b1010</code></p>
<pre class="code-block">4'b1010   // 4-bit binary: 1010 = decimal 10
//↑ bit width    ↑b = binary    ↑ the bit pattern</pre>

<h2>What you are building</h2>
<p>A 4-bit register: same <code>always_ff</code> pattern as L1, but with <code>[3:0]</code> buses. The reset value is <code>4'b0000</code> — all four bits cleared to zero.</p>

<p><strong>Ready?</strong> Switch to the Code tab. The pattern is identical to L1 — only the port types change. Stuck? Tap 💡 Show Hint.</p>
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

    // ─────────────────────────────────────────────────────────────────────
    // L3 — Shift Register (Tier 3)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv2l3',
      title: 'L3 — Shift Register',
      theory: `
<h2>Serial data — one bit at a time</h2>
<p>Registers store data in parallel (all bits at once). But many real-world interfaces — SPI, UART, I2C — send data <strong>serially</strong>: one bit per clock. A <strong>shift register</strong> bridges these worlds: it accepts bits one at a time and makes them available all at once.</p>

<h2>Concatenation — the {} operator</h2>
<p>Curly braces <code>{}</code> glue signals together into a new bus. This is how shifting works:</p>
<pre class="code-block">q &lt;= {q[2:0], sin};
//     ↑       ↑
//  keep bits   new bit comes
//  2,1,0       in at bit 0
//  (drop q[3],  shift everything left)</pre>

<h2>How a 4-bit shift register works</h2>
<p>Each clock tick: the existing 3 LSBs move one position toward the MSB, and a new serial bit enters at position 0:</p>
<pre class="code-block">Before:  q = 1 0 1 0    sin = 1
                         ↓
After:   q = 0 1 0 1  ← 1  (sin entered here)
              ↑ ↑ ↑
          old bits shifted left, bit 3 dropped</pre>

<h2>What you are building</h2>
<p>A 4-bit serial-in parallel-out (SIPO) shift register. After 4 clock ticks you can read all 4 received bits at once from <code>q</code>.</p>
<p>Shift in the sequence <strong>1, 0, 1, 1</strong> — after 4 clocks <code>q</code> should be <code>4'b1011</code>.</p>

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

    // ─────────────────────────────────────────────────────────────────────
    // L4 — Clock Divider (Tier 3)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv2l4',
      title: 'L4 — Clock Divider',
      theory: `
<h2>Why divide a clock?</h2>
<p>A system clock might run at 100 MHz, but a peripheral (LED blink, UART, LCD) needs a much slower signal. A <strong>clock divider</strong> takes a fast clock and produces a slower pulse — one output tick every N input ticks. It is in virtually every digital chip ever made.</p>

<h2>The counter pattern</h2>
<p>Count up to N−1, then reset to 0 and fire one output pulse:</p>
<pre class="code-block">count: 0 → 1 → 2 → 3 → 0 → 1 → 2 → 3 → ...  (N=4)
             ↑           ↑
         clk_div=0     clk_div=1 (pulse, then back to 0)</pre>

<h2>Internal signals</h2>
<p>You need a counter that lives inside the module. Declare it between the port list and always_ff:</p>
<pre class="code-block">logic [1:0] count;   // 2 bits — enough to count 0..3</pre>

<h2>Three-way if in always_ff</h2>
<pre class="code-block">always_ff @(posedge clk) begin
  if (!rst) begin           // reset: clear everything
    count   &lt;= 2'b00;
    clk_div &lt;= 1'b0;
  end else if (count == 2'd3) begin  // reached N-1: pulse
    count   &lt;= 2'b00;
    clk_div &lt;= 1'b1;
  end else begin            // normal: keep counting
    count   &lt;= count + 2'b01;
    clk_div &lt;= 1'b0;
  end
end</pre>

<p>This is the hardest lesson in this chapter — three branches and two internal signals. Take it slowly. Stuck? The hint has the full solution.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
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
        '🎓 VLSI Foundations certificate unlocked — you have completed msv1 + msv2!',
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
    }

  ]
});
