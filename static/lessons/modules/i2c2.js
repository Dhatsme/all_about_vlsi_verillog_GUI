(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c2',
  title: 'Bit-Banging the Bus',
  icon: '⚡',
  level: 'beginner',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — SCL Clock Generator  (Tier 2)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c2l1',
      title: 'L1 — SCL Clock Generator',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>The Arduino Uno microcontroller has no dedicated I²C hardware. When you call <code>Wire.begin()</code> in Arduino code, the library toggles two GPIO pins in software to mimic the I²C waveform — this is called <strong>bit-banging</strong>. Every FPGA and ASIC I²C block does the same thing in hardware: it runs a counter that divides the fast system clock down into a slow SCL clock. You are about to build exactly that divider.</p>

<h2>What the output looks like</h2>
<pre class="code-block">system clk: ‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾
counter:        0   1   2   3   4   0   1   2   3   4
                                    ↑ toggle SCL here
SCL out:    ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|_________________|‾‾
                 ← CLK_DIV/2 clocks →← CLK_DIV/2 clocks→</pre>

<h2>Frequency dividers — the physical analogy</h2>
<p>Think of a metronome set to 120 beats per minute, and you want a slower tick at 60 BPM. You count two fast beats and then click — that is a divide-by-2. Here we count <code>CLK_DIV/2</code> system clocks before toggling SCL, so the SCL period is exactly <code>CLK_DIV</code> system clock cycles. Standard 400 kHz I²C from a 100 MHz system clock needs <code>CLK_DIV = 250</code>; in the testbench we use <code>CLK_DIV = 10</code> to keep simulation fast.</p>

<h3>The counter pattern</h3>
<pre class="code-block">// Counter counts 0 .. (CLK_DIV/2 - 1) then wraps to 0
always_ff @(posedge clk) begin
  if (!rst || !en) begin
    cnt &lt;= 0;
    scl &lt;= 1;
  end else if (cnt == CLK_DIV/2 - 1) begin
    cnt &lt;= 0;
    scl &lt;= ~scl;    // toggle SCL every half-period
  end else begin
    cnt &lt;= cnt + 1;
  end
end</pre>

<table class="truth-table">
  <tr><th>cnt value</th><th>Action</th><th>SCL</th></tr>
  <tr><td>0 .. CLK_DIV/2-2</td><td>count up</td><td>unchanged</td></tr>
  <tr><td>CLK_DIV/2-1</td><td>reset cnt, toggle SCL</td><td>flips</td></tr>
  <tr><td>en = 0</td><td>hold reset</td><td>1 (released)</td></tr>
</table>

<h2>Before you code</h2>
<p>What you are about to build is a frequency divider that counts fast clock ticks and toggles its output every half-period. When <code>en</code> is high it generates a steady square wave on <code>scl</code>; when <code>en</code> is low the counter holds and SCL stays high (the idle state for the I²C bus).</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>The fast system clock that drives the counter — runs continuously.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — clears the counter and releases SCL high.</td></tr>
  <tr><td><code>en</code></td><td>input logic</td><td>Enable: 1 = run the clock generator; 0 = stop and hold SCL high.</td></tr>
  <tr><td><code>scl</code></td><td>output logic</td><td>The generated I²C clock signal — a square wave at system_clk / CLK_DIV.</td></tr>
</table>
<p>Parameter: <code>CLK_DIV = 10</code> (the number of system clock cycles per SCL period).</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module i2c_clk_gen #(parameter CLK_DIV = 10) (',
        '── Line 2 ──  input  logic clk,    ← comma',
        '── Line 3 ──  input  logic rst,    ← comma (synchronous active-low reset)',
        '── Line 4 ──  input  logic en,     ← comma (enable the clock generator)',
        '── Line 5 ──  output logic scl     ← NO comma (last port)',
        '── Line 6 ──  );',
        '── Line 7 ──  Declare internal counter: logic [$clog2(CLK_DIV)-1:0] cnt;',
        '── Line 8 ──  always_ff @(posedge clk) begin',
        '── Line 9 ──    if (!rst || !en) begin  ← reset OR disabled: hold state',
        '── Line 10 ──     cnt <= 0;',
        '── Line 11 ──     scl <= 1;             ← SCL idles high on the I²C bus',
        '── Line 12 ──   end else if (cnt == CLK_DIV/2 - 1) begin  ← half-period done?',
        '── Line 13 ──     cnt <= 0;             ← wrap counter',
        '── Line 14 ──     scl <= ~scl;          ← toggle the clock',
        '── Line 15 ──   end else begin',
        '── Line 16 ──     cnt <= cnt + 1;       ← count up',
        '── Line 17 ──   end',
        '── Line 18 ──  end',
        '── Line 19 ──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_clk_gen #(parameter CLK_DIV = 10) (
  input  logic clk,     // fast system clock
  input  logic rst,     // synchronous active-low reset
  input  logic en,      // 1 = run; 0 = stop, SCL stays high
  output logic scl      // generated I2C clock
);
  logic [$clog2(CLK_DIV)-1:0] cnt;  // counter wide enough for CLK_DIV

  always_ff @(posedge clk) begin
    if (!rst || !en) begin      // reset or disabled
      cnt <= 0;
      scl <= 1;                 // I2C bus idles high
    end else if (cnt == CLK_DIV/2 - 1) begin  // half-period complete
      cnt <= 0;                 // restart counter
      scl <= ~scl;              // flip the clock
    end else begin
      cnt <= cnt + 1;           // keep counting
    end
  end

endmodule`,
      design:
`// Type the i2c_clk_gen module here.
// Read Theory first -- it explains frequency division and the counter pattern.
//
// Ports:
//   input  logic clk        -- fast system clock
//   input  logic rst        -- synchronous active-low reset
//   input  logic en         -- 1 = run clock generator, 0 = hold SCL high
//   output logic scl        -- generated I2C SCL square wave
//
// Parameter: CLK_DIV = 10 (SCL period = CLK_DIV system clock cycles)
//
// Internal: logic [$clog2(CLK_DIV)-1:0] cnt  -- half-period counter
//
// Logic: count to CLK_DIV/2-1, then toggle scl and reset cnt.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz system clock

  logic rst, en;
  logic scl;

  i2c_clk_gen #(.CLK_DIV(10)) dut (
    .clk(clk), .rst(rst), .en(en), .scl(scl)
  );

  integer i;
  integer scl_edges;
  logic   prev_scl;

  initial begin
    \$display("=== I2C CLK Gen Test ===");

    // Test 1: reset holds SCL high
    rst = 0; en = 0;
    repeat(4) @(posedge clk); #1;
    if (scl === 1)
      \$display("PASS  reset: scl=1 (idle high)");
    else
      \$display("FAIL  reset: scl=%0b (expected 1)", scl);

    // Test 2: disabled (en=0) also holds SCL high
    rst = 1; en = 0;
    repeat(6) @(posedge clk); #1;
    if (scl === 1)
      \$display("PASS  disabled: scl=1 (held high)");
    else
      \$display("FAIL  disabled: scl=%0b (expected 1)", scl);

    // Test 3: enabled — count SCL edges over 3 full periods (60 clk cycles)
    // CLK_DIV=10 => SCL period = 10 system clocks => 6 edges in 60 cycles
    en = 1;
    prev_scl  = scl;
    scl_edges = 0;
    for (i = 0; i < 60; i++) begin
      @(posedge clk); #1;
      if (scl !== prev_scl) begin
        scl_edges = scl_edges + 1;
        prev_scl  = scl;
      end
    end
    if (scl_edges >= 5 && scl_edges <= 7)
      \$display("PASS  running: %0d SCL edges in 60 clk cycles", scl_edges);
    else
      \$display("FAIL  running: %0d SCL edges (expected ~6)", scl_edges);

    \$display("CLK gen works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: scl=1 (idle high)',
        'PASS  disabled: scl=1 (held high)',
        'PASS  running:',
        'CLK gen works!'
      ]
    },

    // L2 added next
  ]
});
