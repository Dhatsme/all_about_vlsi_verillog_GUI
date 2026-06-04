(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long2',
  title: 'Clock Divider & SCK Generation',
  icon: '⏱',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Counter & Toggle (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long2l1',
      title: 'L1 — Counter & Toggle',

      theory: `
<h2>The Clock Divider: Counting Down to SCK</h2>
<p>
  The SPI master never drives its serial clock (SCK) directly from the system clock —
  that would be too fast for most peripherals and would waste power even when no transfer
  is in progress. Instead it uses a <strong>programmable divider</strong>: a 16-bit counter
  that counts PCLK rising edges and <em>toggles</em> an internal SCK flip-flop when the
  count reaches a target value stored in the <code>CLKDIV.DIV[15:0]</code> register.
</p>

<pre class="code-block">
  f_SCK = f_PCLK / (2 &times; (DIV + 1))
</pre>

<p>
  The factor of 2 appears because one full SCK period needs <em>two</em> toggles — one
  rising half-period and one falling half-period. Adding 1 accounts for the counter
  counting from 0 through DIV, which is DIV+1 PCLK cycles per toggle.
</p>

<table class="truth-table">
  <tr><th>DIV</th><th>f_SCK (100 MHz PCLK)</th><th>Typical use</th></tr>
  <tr><td>0</td><td>50 MHz</td><td>Maximum — toggles every 1 PCLK cycle</td></tr>
  <tr><td>4</td><td>10 MHz</td><td>High-speed flash, display controllers</td></tr>
  <tr><td>9</td><td>5 MHz</td><td>Pressure sensors, fast ADCs</td></tr>
  <tr><td>49</td><td>1 MHz</td><td>General-purpose ADC / sensors</td></tr>
  <tr><td>499</td><td>100 kHz</td><td>Slow peripherals</td></tr>
</table>

<h3>The Counter + Toggle Pattern</h3>
<p>
  A 16-bit register <code>div_cnt</code> increments each PCLK cycle. When it equals
  <code>div</code>, it resets to 0 and the internal SCK register <code>sck_int</code>
  toggles. Both the reset and the toggle are clocked — no glitches:
</p>

<pre class="code-block">
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt &lt;= '0;
      sck_int &lt;= 1'b0;
    end else begin
      if (div_cnt == div) begin
        div_cnt &lt;= '0;
        // toggle sck_int here
      end else begin
        div_cnt &lt;= div_cnt + 1'b1;
      end
    end
  end
</pre>

<h3>Timing trace for DIV=4 (half-period = 5 cycles)</h3>
<pre class="code-block">
  pclk    _|1|_|2|_|3|_|4|_|5|_|6|_|7|_|8|_|9|_|10|_
  div_cnt  0   1   2   3   4   0   1   2   3   4   0
  sck_int  0   0   0   0   0   1   1   1   1   1   0
                               ^ toggle at count==4
</pre>

<h3>Circuit to build: spi_clk_div (v1)</h3>
<p>
  Your module has four ports: <code>pclk</code>, <code>rst_n</code>,
  <code>div[15:0]</code>, and <code>sck_out</code>. Declare two internal signals:
  <code>div_cnt[15:0]</code> (the counter) and <code>sck_int</code> (the toggle
  register). Connect them with <code>assign sck_out = sck_int;</code>.
</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module.
Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module spi_clk_div (   ← module name, open paren',
        '── Line 2 ──  input  logic        pclk,    ← system clock; comma',
        '── Line 3 ──  input  logic        rst_n,   ← active-low async reset; comma',
        '── Line 4 ──  input  logic [15:0] div,     ← divider value 0–65535; comma',
        '── Line 5 ──  output logic        sck_out  ← serial clock output; NO comma',
        '── Line 6 ──  );',
        '── Lines 7–8 ──  declare: logic [15:0] div_cnt;  and  logic sck_int;',
        '── Lines 9–17 ──  always_ff block: reset both to 0; else if div_cnt==div reset to 0 and toggle sck_int; else increment div_cnt',
        '── Line 18 ──  assign sck_out = sck_int;',
        '── Line 19 ──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_clk_div (
  input  logic        pclk,
  input  logic        rst_n,     // async active-low reset
  input  logic [15:0] div,       // f_SCK = f_PCLK / (2*(div+1))
  output logic        sck_out
);

  logic [15:0] div_cnt;
  logic        sck_int;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= '0;
      sck_int <= 1'b0;
    end else begin
      if (div_cnt == div) begin
        div_cnt <= '0;          // reset counter on match
        sck_int <= ~sck_int;    // toggle: this fires once per half-period
      end else begin
        div_cnt <= div_cnt + 1'b1;
      end
    end
  end

  assign sck_out = sck_int;

endmodule`,

      design:
`// Type the spi_clk_div module here.
// See Theory — explains the counter + toggle pattern and the frequency formula.
//
// Ports:
//   input  logic        pclk    — system clock
//   input  logic        rst_n   — active-low async reset
//   input  logic [15:0] div     — divider value; f_SCK = f_PCLK / (2*(div+1))
//   output logic        sck_out — serial clock output
//
// Internal signals to declare:
//   logic [15:0] div_cnt   — 16-bit counter (0 to div)
//   logic        sck_int   — internal SCK toggle register
//
// Behaviour: div_cnt counts up; on div_cnt==div reset to 0 and toggle sck_int.
//
// Delete this comment and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;   // 100 MHz

  logic        rst_n;
  logic [15:0] div;
  logic        sck_out;

  spi_clk_div dut (.pclk(pclk), .rst_n(rst_n), .div(div), .sck_out(sck_out));

  initial begin
    $display("=== spi_clk_div Counter Test ===");

    // -- DIV=4: half-period=5 cycles; SCK must go HIGH at cycle 5 --
    rst_n = 0; div = 4;
    repeat(2) @(posedge pclk); rst_n = 1;
    repeat(5) @(posedge pclk); #1;
    $display(sck_out === 1'b1 ?
      "PASS  DIV=4: SCK=1 after 5 cycles" :
      "FAIL  DIV=4: SCK=%0b after 5 cycles (expected 1)", sck_out);

    // -- SCK returns LOW after 10 total cycles (one full period) --
    repeat(5) @(posedge pclk); #1;
    $display(sck_out === 1'b0 ?
      "PASS  DIV=4: SCK=0 after 10 cycles" :
      "FAIL  DIV=4: SCK=%0b after 10 cycles (expected 0)", sck_out);

    // -- DIV=0: fastest — toggles every PCLK cycle --
    rst_n = 0; div = 0;
    repeat(2) @(posedge pclk); rst_n = 1;
    @(posedge pclk); #1;
    $display(sck_out === 1'b1 ?
      "PASS  DIV=0: SCK=1 after 1 cycle (maximum rate)" :
      "FAIL  DIV=0: SCK=%0b after 1 cycle", sck_out);
    @(posedge pclk); #1;
    $display(sck_out === 1'b0 ?
      "PASS  DIV=0: SCK=0 after 2 cycles" :
      "FAIL  DIV=0: SCK=%0b after 2 cycles", sck_out);

    $display("Clock divider works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  DIV=4: SCK=1 after 5 cycles',
        'PASS  DIV=0: SCK=1 after 1 cycle',
        'Clock divider works!'
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — CPOL Idle Gate (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long2l2',
      title: 'L2 — CPOL Idle Gate',

      theory: `
<h2>CPOL: Idle Level and the Enable Gate</h2>
<p>
  A bare clock divider would keep toggling SCK even when the master is idle —
  confusing slaves and wasting power. Two things need fixing simultaneously:
</p>
<ul>
  <li><strong>CPOL (Clock Polarity):</strong> when SPI is inactive, SCK must sit at
    a well-defined idle level. <code>CPOL=0</code> → SCK idles LOW; <code>CPOL=1</code>
    → SCK idles HIGH. The slave expects to see this level from the moment it powers up
    until CS asserts.</li>
  <li><strong>Enable gate:</strong> the divider must freeze when the master is idle.
    Letting the counter free-run means SCK resumes from an unpredictable phase —
    the first edge after re-enabling could be in the wrong direction.</li>
</ul>

<pre class="code-block">
  // SCK output: combinational — instant, no flip-flop lag
  assign sck_out = enable ? sck_int : cpol;
</pre>

<p>
  The moment <code>enable</code> drops low, <code>sck_out</code> immediately shows
  <code>cpol</code> — even if <code>sck_int</code> is mid-toggle. There is no extra
  latency cycle.
</p>

<h3>Design trap: sck_int must be at CPOL before re-enabling</h3>
<p>
  If <code>sck_int</code> is at the wrong level when <code>enable</code> goes high,
  the very first SCK edge will be in the wrong direction — a silent protocol error.
  The fix: while <code>enable=0</code>, the <code>always_ff</code> block <em>forces</em>
  <code>sck_int &lt;= cpol</code>. When <code>enable</code> goes high next time,
  <code>sck_int</code> is already at <code>CPOL</code> and the first toggle produces
  the correct first edge.
</p>

<pre class="code-block">
  else if (!enable) begin
    div_cnt &lt;= '0;     // reset counter — clean start when re-enabled
    sck_int &lt;= cpol;   // pre-load idle level
  end
</pre>

<h3>CPOL × enable truth table</h3>
<table class="truth-table">
  <tr><th>enable</th><th>cpol</th><th>sck_out</th><th>Behaviour</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>Idle LOW — Mode 0 / Mode 1</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>Idle HIGH — Mode 2 / Mode 3</td></tr>
  <tr><td>1</td><td>0</td><td>sck_int</td><td>Toggling from LOW base</td></tr>
  <tr><td>1</td><td>1</td><td>sck_int</td><td>Toggling from HIGH base</td></tr>
</table>

<h3>Circuit to build: spi_clk_div (v2)</h3>
<p>
  Add <code>enable</code> and <code>cpol</code> input ports between <code>rst_n</code>
  and <code>div</code>. Add the <code>else if (!enable)</code> branch in the
  <code>always_ff</code> block — it must appear <em>before</em> the counting else
  so it takes priority. Change the <code>assign sck_out</code> line to the ternary gate.
</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module.
Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Port list ──  add  input logic enable  and  input logic cpol  between rst_n and div',
        "── always_ff ──  add  else if (!enable)  branch BEFORE the counter else: inside it force div_cnt <= '0  and  sck_int <= cpol",
        '── assign ──  change  assign sck_out = sck_int  to  assign sck_out = enable ? sck_int : cpol',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_clk_div (
  input  logic        pclk,
  input  logic        rst_n,
  input  logic        enable,   // 0 = freeze counter, hold SCK at CPOL
  input  logic        cpol,     // idle level: 0 = LOW (Mode 0/1), 1 = HIGH (Mode 2/3)
  input  logic [15:0] div,
  output logic        sck_out
);

  logic [15:0] div_cnt;
  logic        sck_int;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= '0;
      sck_int <= 1'b0;
    end else if (!enable) begin
      div_cnt <= '0;     // freeze counter when disabled
      sck_int <= cpol;   // pre-load idle level — no glitch when re-enabled
    end else begin
      if (div_cnt == div) begin
        div_cnt <= '0;
        sck_int <= ~sck_int;
      end else begin
        div_cnt <= div_cnt + 1'b1;
      end
    end
  end

  // Combinational: instantly shows CPOL when disabled — no registered lag
  assign sck_out = enable ? sck_int : cpol;

endmodule`,

      design:
`// Extend spi_clk_div with enable and cpol ports.
// See Theory — explains the CPOL idle level and the design trap.
//
// New ports to add (between rst_n and div):
//   input logic enable — 0 = freeze counter, hold sck_int at cpol level
//   input logic cpol   — idle level: 0 = LOW (Mode 0/1), 1 = HIGH (Mode 2/3)
//
// Changes to make inside always_ff:
//   Add  else if (!enable)  branch BEFORE the counter else
//   Inside it: div_cnt <= '0  and  sck_int <= cpol
//
// Change the assign:
//   assign sck_out = enable ? sck_int : cpol
//
// Delete this comment and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        rst_n, enable, cpol;
  logic [15:0] div;
  logic        sck_out;

  spi_clk_div dut (.pclk(pclk), .rst_n(rst_n), .enable(enable),
                   .cpol(cpol), .div(div), .sck_out(sck_out));

  initial begin
    $display("=== spi_clk_div CPOL Idle Test ===");

    // -- disabled, CPOL=0: sck_out must be 0 --
    rst_n = 0; enable = 0; cpol = 0; div = 4;
    repeat(2) @(posedge pclk); rst_n = 1; @(posedge pclk); #1;
    $display(sck_out === 1'b0 ?
      "PASS  disabled CPOL=0: sck_out=0" :
      "FAIL  disabled CPOL=0: sck_out=%0b (expected 0)", sck_out);

    // -- disabled, CPOL=1: combinational output must flip immediately --
    cpol = 1; #1;
    $display(sck_out === 1'b1 ?
      "PASS  disabled CPOL=1: sck_out=1" :
      "FAIL  disabled CPOL=1: sck_out=%0b (expected 1)", sck_out);

    // -- enable with CPOL=0: let sck_int latch to 0, then count --
    cpol = 0; @(posedge pclk); #1;   // sck_int <- cpol = 0 via !enable path
    enable = 1;
    repeat(5) @(posedge pclk); #1;   // 5 cycles -> first toggle: sck_int = 1
    $display(sck_out === 1'b1 ?
      "PASS  CPOL=0 enabled: SCK goes high after (div+1)=5 cycles" :
      "FAIL  CPOL=0 enabled: sck_out=%0b after 5 cycles (expected 1)", sck_out);

    // -- disable mid-sequence: sck_out must snap to CPOL=0 immediately --
    enable = 0; #1;
    $display(sck_out === 1'b0 ?
      "PASS  mid-disable: sck_out snaps to CPOL=0" :
      "FAIL  mid-disable: sck_out=%0b (expected 0 = CPOL)", sck_out);

    $display("CPOL idle gate works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  disabled CPOL=0: sck_out=0',
        'PASS  CPOL=0 enabled: SCK goes high',
        'CPOL idle gate works!'
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — Edge Detector & Integration Contract (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long2l3',
      title: 'L3 — Edge Detector & Integration Contract',

      theory: `
<h2>Edge Detection: Single-Cycle Pulses for the Shift Register</h2>
<p>
  The shift register built in Chapter 5 cannot watch <code>sck_out</code> continuously
  — it needs a single-cycle <em>pulse</em> that fires at the exact moment SCK transitions.
  That pulse tells it when to launch a new MOSI bit and when to sample MISO.
  The two output signals are <code>rising_edge_p</code> and <code>falling_edge_p</code>.
</p>

<p>
  The pattern: store a delayed copy of <code>sck_int</code> in a flip-flop called
  <code>sck_prev</code>. Compare current vs. delayed values combinationally:
</p>

<pre class="code-block">
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) sck_prev &lt;= 1'b0;
    else        sck_prev &lt;= sck_int;   // one-cycle-delayed copy
  end

  assign rising_edge_p  =  sck_int &amp; ~sck_prev;  // 0-&gt;1 transition
  assign falling_edge_p = ~sck_int &amp;  sck_prev;  // 1-&gt;0 transition
</pre>

<h3>Integration contract — what spi_clk_div exports</h3>
<table class="truth-table">
  <tr><th>Output port</th><th>Used by</th><th>Meaning</th></tr>
  <tr><td><code>sck_out</code></td><td>SPI pad, debug register</td><td>SCK pin signal</td></tr>
  <tr><td><code>rising_edge_p</code></td><td>spi_cpha (Ch 6), spi_shift (Ch 5)</td><td>1-cycle pulse on SCK 0→1</td></tr>
  <tr><td><code>falling_edge_p</code></td><td>spi_cpha (Ch 6), spi_shift (Ch 5)</td><td>1-cycle pulse on SCK 1→0</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the complete module.
Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Add two new output ports: output logic rising_edge_p  and  output logic falling_edge_p',
        'Declare internal signal: logic sck_prev;',
        'Add a second always_ff block: reset sck_prev to 0; else sck_prev <= sck_int',
        'Add two assign statements: rising_edge_p = sck_int & ~sck_prev;  and  falling_edge_p = ~sck_int & sck_prev',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_clk_div (
  input  logic        pclk,
  input  logic        rst_n,
  input  logic        enable,
  input  logic        cpol,
  input  logic [15:0] div,
  output logic        sck_out,
  output logic        rising_edge_p,    // 1-cycle pulse on sck_int 0->1
  output logic        falling_edge_p    // 1-cycle pulse on sck_int 1->0
);

  logic [15:0] div_cnt;
  logic        sck_int;
  logic        sck_prev;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= '0;
      sck_int <= 1'b0;
    end else if (!enable) begin
      div_cnt <= '0;
      sck_int <= cpol;
    end else begin
      if (div_cnt == div) begin
        div_cnt <= '0;
        sck_int <= ~sck_int;
      end else begin
        div_cnt <= div_cnt + 1'b1;
      end
    end
  end

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) sck_prev <= 1'b0;
    else        sck_prev <= sck_int;
  end

  assign sck_out        = enable ? sck_int : cpol;
  assign rising_edge_p  =  sck_int & ~sck_prev;
  assign falling_edge_p = ~sck_int &  sck_prev;

endmodule`,

      design:
`// Add the edge detector to the complete spi_clk_div.
// New output ports: rising_edge_p, falling_edge_p
// New internal: logic sck_prev
// New always_ff: sck_prev <= sck_int
// New assigns: rising_edge_p = sck_int & ~sck_prev
//              falling_edge_p = ~sck_int & sck_prev
//
// Delete this comment and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        rst_n, enable, cpol;
  logic [15:0] div;
  logic        sck_out, rising_edge_p, falling_edge_p;

  spi_clk_div dut (
    .pclk(pclk), .rst_n(rst_n), .enable(enable), .cpol(cpol), .div(div),
    .sck_out(sck_out), .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p)
  );

  int rise_count = 0, fall_count = 0;
  always_ff @(posedge pclk) begin
    if (rising_edge_p)  rise_count <= rise_count + 1;
    if (falling_edge_p) fall_count <= fall_count + 1;
  end

  initial begin
    $display("=== spi_clk_div Edge Detector Test ===");
    rst_n = 0; enable = 0; cpol = 0; div = 4;
    repeat(3) @(posedge pclk); rst_n = 1; @(posedge pclk); #1;
    $display(rise_count === 0 && fall_count === 0 ?
      "PASS  reset: no spurious pulses" :
      "FAIL  reset: rise=%0d fall=%0d (expected 0,0)", rise_count, fall_count);

    enable = 1;
    repeat(51) @(posedge pclk); #1;
    $display(rise_count === 5 ?
      "PASS  DIV=4: %0d rising_edge_p pulses in 51 cycles" :
      "FAIL  DIV=4: %0d rising_edge_p pulses (expected 5)", rise_count);
    $display(fall_count === 5 ?
      "PASS  DIV=4: %0d falling_edge_p pulses in 51 cycles" :
      "FAIL  DIV=4: %0d falling_edge_p pulses (expected 5)", fall_count);

    $display("Edge detector works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: no spurious pulses',
        'PASS  DIV=4: 5 rising_edge_p pulses in 51 cycles',
        'Edge detector works!'
      ]
    }

  ]
});
