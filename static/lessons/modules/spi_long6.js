(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long6',
  title: 'CPOL/CPHA Timing Engine',
  icon: '⏱',
  level: 'advanced',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Mode Edge Table (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long6l1',
      title: 'L1 — Mode Edge Table',

      theory: `
<h2>The CPOL/CPHA Timing Engine: Mode-Aware Edge Assignment</h2>
<p>
  The clock divider (spi_long2) produces two raw one-cycle pulses:
  <code>rising_edge_p</code> and <code>falling_edge_p</code>. But which pulse
  triggers TX (MOSI launch) and which triggers RX (MISO sample) depends on the
  SPI mode selected by <strong>CPOL</strong> (clock polarity) and
  <strong>CPHA</strong> (clock phase). The CPOL/CPHA timing engine is the mux
  that makes that mode-correct assignment.
</p>

<h3>The Four SPI Modes</h3>
<table class="truth-table">
  <tr><th>CPOL</th><th>CPHA</th><th>Mode</th><th>SCK idle</th><th>Launch (TX) edge</th><th>Sample (RX) edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>Falling ↓</td><td>Rising ↑</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>LOW</td><td>Rising ↑</td><td>Falling ↓</td></tr>
  <tr><td>1</td><td>0</td><td>2</td><td>HIGH</td><td>Rising ↑</td><td>Falling ↓</td></tr>
  <tr><td>1</td><td>1</td><td>3</td><td>HIGH</td><td>Falling ↓</td><td>Rising ↑</td></tr>
</table>

<h3>The XOR Trick</h3>
<p>
  Modes 0 and 3 both use <em>falling=launch, rising=sample</em>. Modes 1 and 2 swap them.
  The selector is simply <code>CPOL XOR CPHA</code>:
</p>
<pre class="code-block">
logic mode_swap;
assign mode_swap    = cpol ^ cpha;         // 0 → Modes 0,3  |  1 → Modes 1,2
assign launch_pulse = mode_swap ? rising_edge_p  : falling_edge_p;
assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;
</pre>
<p>
  No flip-flops needed here — this is purely combinational. The raw SCK edge pulses
  flow straight through the mux to the shift register (spi_long5).
</p>

<h3>What You Will Build</h3>
<p>
  Module <code>spi_cpha</code>: a 5-line combinational block that translates raw
  SCK edge pulses into mode-correct launch and sample pulses. No clock port is
  needed in L1 — everything is asynchronous.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Ports ── input logic cpol, cpha',
        '── Ports ── input logic rising_edge_p, falling_edge_p',
        '── Ports ── output logic launch_pulse, sample_pulse',
        '── Internal ── logic mode_swap',
        'assign mode_swap = cpol ^ cpha;',
        'assign launch_pulse = mode_swap ? rising_edge_p : falling_edge_p;',
        'assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 8 PASS lines (2 per mode × 4 modes) then "Mode table done!" in Output tab',
      ],

      hint:
`module spi_cpha (
  input  logic cpol, cpha,
  input  logic rising_edge_p, falling_edge_p,
  output logic launch_pulse, sample_pulse
);
  // mode_swap=0 (CPOL^CPHA=0): Modes 0&3 -> fall=launch, rise=sample
  // mode_swap=1 (CPOL^CPHA=1): Modes 1&2 -> rise=launch, fall=sample
  logic mode_swap;
  assign mode_swap    = cpol ^ cpha;
  assign launch_pulse = mode_swap ? rising_edge_p  : falling_edge_p;
  assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;
endmodule`,

      design:
`// Type the spi_cpha module here.
// Read Theory — it shows the XOR mux pattern for all 4 SPI modes.
//
// Ports:
//   input  logic cpol, cpha
//   input  logic rising_edge_p, falling_edge_p
//   output logic launch_pulse, sample_pulse
//
// Internal: logic mode_swap = cpol ^ cpha
// No always_ff — purely combinational.
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic cpol, cpha, rising_edge_p, falling_edge_p;
  logic launch_pulse, sample_pulse;

  spi_cpha dut (
    .cpol(cpol), .cpha(cpha),
    .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p),
    .launch_pulse(launch_pulse), .sample_pulse(sample_pulse)
  );

  // exp_fall_launch: 1 if falling edge -> launch (Modes 0,3)
  //                  0 if falling edge -> sample (Modes 1,2)
  task automatic check(input logic cp, ch, exp_fall_launch);
    cpol = cp; cpha = ch;
    // inject falling edge
    falling_edge_p = 1; rising_edge_p = 0; #5;
    if (launch_pulse === exp_fall_launch)
      $display("PASS  cpol=%0b cpha=%0b fall: launch=%0b", cp, ch, launch_pulse);
    else
      $display("FAIL  cpol=%0b cpha=%0b fall: launch=%0b (exp %0b)", cp, ch, launch_pulse, exp_fall_launch);
    // inject rising edge
    falling_edge_p = 0; rising_edge_p = 1; #5;
    if (sample_pulse === exp_fall_launch)
      $display("PASS  cpol=%0b cpha=%0b rise: sample=%0b", cp, ch, sample_pulse);
    else
      $display("FAIL  cpol=%0b cpha=%0b rise: sample=%0b (exp %0b)", cp, ch, sample_pulse, exp_fall_launch);
    falling_edge_p = 0; rising_edge_p = 0; #2;
  endtask

  initial begin
    cpol = 0; cpha = 0; rising_edge_p = 0; falling_edge_p = 0;
    $display("=== CPOL/CPHA Mode Edge Table ===");
    check(0, 0, 1);  // Mode 0: fall->launch (exp_fall_launch=1)
    check(0, 1, 0);  // Mode 1: rise->launch (fall->sample, exp=0)
    check(1, 0, 0);  // Mode 2: rise->launch (exp=0)
    check(1, 1, 1);  // Mode 3: fall->launch (exp=1)
    $display("Mode table done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  cpol=0 cpha=0 fall: launch=1',
        'PASS  cpol=1 cpha=1 fall: launch=1',
        'Mode table done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — CPHA=0 Pre-Seed (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long6l2',
      title: 'L2 — CPHA=0 Pre-Seed',

      theory: `
<h2>CPHA=0 First-Bit Pre-Seed: Data Before the Clock</h2>
<p>
  In CPHA=0 modes (Modes 0 and 2), the slave samples MISO on the <em>first</em>
  SCK edge — not the second. That means the master must have bit 7 on MOSI
  <strong>before any SCK edge fires</strong>, at the exact cycle CS asserts.
  Miss this and the slave captures an undefined first bit, silently corrupting
  the frame.
</p>
<p>
  The one-cycle <strong>preseed_en</strong> pulse tells the shift register:
  "CS just went active with CPHA=0 — put bit 7 on MOSI now, before the first edge."
</p>

<h3>Timing Diagram (CPHA=0, Mode 0)</h3>
<pre class="code-block">
CS  :        ___|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
SCK :        ___|‾|_|‾|_|‾|_| ...
MOSI:  ------|b7 |b6 |b5|...       &lt;-- b7 on wire BEFORE first rising SCK
preseed:  ___|‾‾|_____________
               ↑ fires here (one cycle after CS asserts, cpha=0)
</pre>

<h3>Detecting the CS Rising Edge</h3>
<p>
  A delayed copy <code>cs_active_r</code> latches on each posedge. Comparing
  <code>cs_active</code> to <code>cs_active_r</code> gives a one-cycle pulse
  on the first cycle after CS asserts:
</p>
<pre class="code-block">
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    cs_active_r &lt;= 0;
    preseed_en  &lt;= 0;
  end else begin
    cs_active_r &lt;= cs_active;
    preseed_en  &lt;= cs_active &amp;&amp; !cs_active_r &amp;&amp; !cpha;
  end
end
</pre>

<h3>What You Will Build</h3>
<p>
  Extend <code>spi_cpha</code> with <code>pclk</code>, <code>rst_n</code>,
  <code>cs_active</code> inputs and a registered <code>preseed_en</code> output.
  The preseed fires exactly one clock after CS asserts (when cpha=0).
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L1 spi_cpha',
        '── New ports ── input logic pclk, rst_n',
        '── New port ── input logic cs_active',
        '── New port ── output logic preseed_en',
        '── Internal ── logic cs_active_r',
        'always_ff: if !rst_n → clear cs_active_r and preseed_en',
        'else: cs_active_r <= cs_active; preseed_en <= cs_active && !cs_active_r && !cpha',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_cpha (
  input  logic pclk, rst_n,
  input  logic cpol, cpha,
  input  logic rising_edge_p, falling_edge_p,
  input  logic cs_active,
  output logic launch_pulse, sample_pulse,
  output logic preseed_en
);
  logic mode_swap;
  assign mode_swap    = cpol ^ cpha;
  assign launch_pulse = mode_swap ? rising_edge_p  : falling_edge_p;
  assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;

  logic cs_active_r;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      cs_active_r <= 0;
      preseed_en  <= 0;
    end else begin
      cs_active_r <= cs_active;
      preseed_en  <= cs_active && !cs_active_r && !cpha;
    end
  end
endmodule`,

      design:
`// Extend spi_cpha with the CPHA=0 pre-seed logic.
//
// New ports:
//   input  logic pclk, rst_n
//   input  logic cs_active      — 1 while CS is asserted
//   output logic preseed_en     — 1-cycle pulse when CS activates with cpha=0
//
// New internal: logic cs_active_r
//
// always_ff: cs_active_r <= cs_active; preseed_en <= cs_active && !cs_active_r && !cpha
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, cpol, cpha, cs_active;
  logic rising_edge_p, falling_edge_p;
  logic launch_pulse, sample_pulse, preseed_en;

  spi_cpha dut (
    .pclk(clk), .rst_n(rst_n),
    .cpol(cpol), .cpha(cpha),
    .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p),
    .cs_active(cs_active),
    .launch_pulse(launch_pulse), .sample_pulse(sample_pulse),
    .preseed_en(preseed_en)
  );

  initial begin
    rst_n = 0; cpol = 0; cpha = 0; cs_active = 0;
    rising_edge_p = 0; falling_edge_p = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // Test 1: cpha=0 — preseed fires one cycle after CS asserts
    cpha = 0; cs_active = 1;
    @(posedge clk); #1;
    if (preseed_en === 1'b1)
      $display("PASS  cpha=0 cs asserts: preseed_en=1");
    else
      $display("FAIL  cpha=0 cs asserts: preseed_en=%0b (expected 1)", preseed_en);

    // Test 2: CS stays high — preseed must be one-shot
    @(posedge clk); #1;
    if (preseed_en === 1'b0)
      $display("PASS  cpha=0 cs held: preseed_en=0 (one-shot)");
    else
      $display("FAIL  cpha=0 cs held: preseed_en=%0b (expected 0)", preseed_en);

    // Test 3: cpha=1 — no preseed when CS asserts
    cpha = 1; cs_active = 0;
    @(posedge clk); #1;
    cs_active = 1;
    @(posedge clk); #1;
    if (preseed_en === 1'b0)
      $display("PASS  cpha=1 cs asserts: preseed_en=0 (no preseed)");
    else
      $display("FAIL  cpha=1 cs asserts: preseed_en=%0b (expected 0)", preseed_en);

    $display("Pre-seed done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  cpha=0 cs asserts: preseed_en=1',
        'PASS  cpha=1 cs asserts: preseed_en=0 (no preseed)',
        'Pre-seed done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — CPHA=1 Last-Sample Guard (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long6l3',
      title: 'L3 — CPHA=1 Last-Sample Guard',

      theory: `
<h2>CPHA=1 Last-Sample Guard: One More Bit to Capture</h2>
<p>
  In CPHA=1, TX launches on one edge and RX samples on the next. When the final
  bit launches (the cycle <code>word_done</code> fires), the slave's MISO response
  for that last bit is still arriving — the shift register hasn't captured it yet.
</p>
<p>
  If the FSM deasserts CS immediately on <code>word_done</code>, the last RX bit
  is lost forever. The timing engine signals this outstanding sample with the sticky
  flag <strong>last_sample_pending</strong>.
</p>

<h3>Timing Diagram (CPHA=1, Mode 1)</h3>
<pre class="code-block">
SCK  : ‾|_|‾|_|‾|_|‾|_|        &lt;-- 8 edges for 8 bits
MOSI :  [b7][b6][b5][b4]...     &lt;-- TX shifts on rising edge (cpha=1)
MISO :    [b7][b6]...[b0]       &lt;-- RX samples on falling edge
                          ↑
         word_done fires here (on 8th rising edge)
         but MISO b0 sample fires on the NEXT falling edge
         → last_sample_pending = 1 until that sample fires
</pre>

<pre class="code-block">
// In always_ff:
if (word_done &amp;&amp; cpha)
  last_sample_pending &lt;= 1;   // arm: last launch fired, one sample left
else if (sample_pulse)
  last_sample_pending &lt;= 0;   // clear: the extra sample fired
</pre>

<h3>What You Will Build</h3>
<p>
  Extend <code>spi_cpha</code> with a <code>word_done</code> input and a registered
  <code>last_sample_pending</code> output. The Master FSM (spi_long8) will read this
  flag to decide when it is safe to deassert CS after CPHA=1 transfers.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L2 spi_cpha',
        '── New port ── input logic word_done',
        '── New port ── output logic last_sample_pending',
        'In always_ff reset block: last_sample_pending <= 0',
        'In always_ff else block: if (word_done && cpha) last_sample_pending <= 1',
        'In always_ff else block: else if (sample_pulse) last_sample_pending <= 0',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_cpha (
  input  logic pclk, rst_n,
  input  logic cpol, cpha,
  input  logic rising_edge_p, falling_edge_p,
  input  logic cs_active, word_done,
  output logic launch_pulse, sample_pulse,
  output logic preseed_en, last_sample_pending
);
  logic mode_swap;
  assign mode_swap    = cpol ^ cpha;
  assign launch_pulse = mode_swap ? rising_edge_p  : falling_edge_p;
  assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;

  logic cs_active_r;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      cs_active_r         <= 0;
      preseed_en          <= 0;
      last_sample_pending <= 0;
    end else begin
      cs_active_r <= cs_active;
      preseed_en  <= cs_active && !cs_active_r && !cpha;
      if (word_done && cpha)
        last_sample_pending <= 1;   // arm: one sample still outstanding
      else if (sample_pulse)
        last_sample_pending <= 0;   // clear: extra sample fired
    end
  end
endmodule`,

      design:
`// Extend spi_cpha with the CPHA=1 last-sample guard.
//
// New port: input  logic word_done
// New port: output logic last_sample_pending   — sticky flag
//
// In always_ff reset:   last_sample_pending <= 0;
// In always_ff else:
//   if (word_done && cpha) last_sample_pending <= 1;
//   else if (sample_pulse) last_sample_pending <= 0;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, cpol, cpha, cs_active, word_done;
  logic rising_edge_p, falling_edge_p;
  logic launch_pulse, sample_pulse, preseed_en, last_sample_pending;

  spi_cpha dut (
    .pclk(clk), .rst_n(rst_n),
    .cpol(cpol), .cpha(cpha),
    .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p),
    .cs_active(cs_active), .word_done(word_done),
    .launch_pulse(launch_pulse), .sample_pulse(sample_pulse),
    .preseed_en(preseed_en),
    .last_sample_pending(last_sample_pending)
  );

  initial begin
    rst_n = 0; cpol = 0; cpha = 1; cs_active = 1; word_done = 0;
    rising_edge_p = 0; falling_edge_p = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // Test 1: cpha=1 — last_sample_pending arms when word_done fires on launch edge
    // For cpha=1 (mode_swap=1): launch=rising_edge_p, sample=falling_edge_p
    word_done = 1; rising_edge_p = 1;
    @(posedge clk); #1;
    word_done = 0; rising_edge_p = 0;
    if (last_sample_pending === 1'b1)
      $display("PASS  cpha=1 word_done: last_sample_pending=1");
    else
      $display("FAIL  cpha=1 word_done: last_sample_pending=%0b (expected 1)", last_sample_pending);

    // Test 2: next falling edge (sample) clears last_sample_pending
    falling_edge_p = 1;
    @(posedge clk); #1;
    falling_edge_p = 0;
    if (last_sample_pending === 1'b0)
      $display("PASS  sample pulse clears last_sample_pending");
    else
      $display("FAIL  sample pulse: last_sample_pending=%0b (expected 0)", last_sample_pending);

    // Test 3: cpha=0 — word_done should NOT arm last_sample_pending
    cpha = 0; word_done = 1; falling_edge_p = 1;  // cpha=0: fall=launch
    @(posedge clk); #1;
    word_done = 0; falling_edge_p = 0;
    if (last_sample_pending === 1'b0)
      $display("PASS  cpha=0 word_done: last_sample_pending stays 0");
    else
      $display("FAIL  cpha=0 word_done: last_sample_pending=%0b (expected 0)", last_sample_pending);

    $display("Last sample guard done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  cpha=1 word_done: last_sample_pending=1',
        'PASS  sample pulse clears last_sample_pending',
        'Last sample guard done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Mode Change Error Detection (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long6l4',
      title: 'L4 — Mode Change Error Detection',

      theory: `
<h2>Mode Change Error: Locking CPOL/CPHA Mid-Transfer</h2>
<p>
  If software writes a new value to <code>CPOL</code> or <code>CPHA</code> while a
  transfer is in progress, the edge assignment shifts mid-frame. The slave receives
  a malformed sequence with no indication of the error — the data is silently wrong.
  This is one of the trickiest SPI bugs to find in a real system.
</p>
<p>
  The solution is a pair of <strong>shadow registers</strong>: they capture the mode
  at transfer start and compare to the live registers each cycle. Any divergence while
  <code>BUSY</code> asserts a one-cycle <code>mode_change_err</code> flag that the
  error handler (spi_long9) latches.
</p>

<h3>Shadow Register Pattern</h3>
<pre class="code-block">
logic cpol_shadow, cpha_shadow;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    cpol_shadow &lt;= 0;  cpha_shadow &lt;= 0;
  end else if (!busy) begin
    cpol_shadow &lt;= cpol;   // track live mode while idle
    cpha_shadow &lt;= cpha;
  end
  // frozen when busy=1: any live change is detectable
end

assign mode_change_err = busy &amp;&amp;
                         ((cpol !== cpol_shadow) || (cpha !== cpha_shadow));
</pre>

<h3>What You Will Build</h3>
<p>
  Add <code>busy</code> input and <code>mode_change_err</code> output plus the two
  shadow registers to the existing <code>spi_cpha</code> module. This completes
  all four CPOL/CPHA timing concerns: mode mux, pre-seed, last-sample guard,
  and mode change protection.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L3 spi_cpha',
        '── New port ── input logic busy',
        '── New port ── output logic mode_change_err',
        '── Internal ── logic cpol_shadow, cpha_shadow',
        'In always_ff reset: cpol_shadow <= 0; cpha_shadow <= 0',
        'In always_ff else: if (!busy) cpol_shadow <= cpol; cpha_shadow <= cpha',
        'assign mode_change_err = busy && ((cpol !== cpol_shadow) || (cpha !== cpha_shadow));',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_cpha (
  input  logic pclk, rst_n,
  input  logic cpol, cpha,
  input  logic rising_edge_p, falling_edge_p,
  input  logic cs_active, word_done, busy,
  output logic launch_pulse, sample_pulse,
  output logic preseed_en, last_sample_pending,
  output logic mode_change_err
);
  logic mode_swap;
  assign mode_swap    = cpol ^ cpha;
  assign launch_pulse = mode_swap ? rising_edge_p  : falling_edge_p;
  assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;

  logic cs_active_r;
  logic cpol_shadow, cpha_shadow;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      cs_active_r         <= 0;
      preseed_en          <= 0;
      last_sample_pending <= 0;
      cpol_shadow         <= 0;
      cpha_shadow         <= 0;
    end else begin
      cs_active_r <= cs_active;
      preseed_en  <= cs_active && !cs_active_r && !cpha;
      if (word_done && cpha)
        last_sample_pending <= 1;
      else if (sample_pulse)
        last_sample_pending <= 0;
      if (!busy) begin
        cpol_shadow <= cpol;
        cpha_shadow <= cpha;
      end
    end
  end

  assign mode_change_err = busy && ((cpol !== cpol_shadow) || (cpha !== cpha_shadow));
endmodule`,

      design:
`// Complete spi_cpha with mode change error detection.
// See Theory for the shadow register pattern.
//
// New port: input  logic busy
// New port: output logic mode_change_err
//
// New internal: logic cpol_shadow, cpha_shadow
//
// always_ff reset: cpol_shadow <= 0; cpha_shadow <= 0
// always_ff else: if (!busy) { cpol_shadow <= cpol; cpha_shadow <= cpha; }
//
// assign mode_change_err = busy && ((cpol !== cpol_shadow) || (cpha !== cpha_shadow));
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, cpol, cpha, cs_active, word_done, busy;
  logic rising_edge_p, falling_edge_p;
  logic launch_pulse, sample_pulse;
  logic preseed_en, last_sample_pending, mode_change_err;

  spi_cpha dut (
    .pclk(clk), .rst_n(rst_n),
    .cpol(cpol), .cpha(cpha),
    .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p),
    .cs_active(cs_active), .word_done(word_done), .busy(busy),
    .launch_pulse(launch_pulse), .sample_pulse(sample_pulse),
    .preseed_en(preseed_en),
    .last_sample_pending(last_sample_pending),
    .mode_change_err(mode_change_err)
  );

  initial begin
    rst_n = 0; cpol = 0; cpha = 0; cs_active = 0; word_done = 0; busy = 0;
    rising_edge_p = 0; falling_edge_p = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // Let shadows latch cpol=0, cpha=0 during idle
    repeat(2) @(posedge clk); #1;

    // --- Baseline: busy=1, mode unchanged — no error ---
    busy = 1;
    @(posedge clk); #1;
    if (mode_change_err === 1'b0)
      $display("PASS  busy, stable mode: mode_change_err=0");
    else
      $display("FAIL  busy, stable mode: mode_change_err=%0b (expected 0)", mode_change_err);

    // --- Change CPOL while busy — error must fire ---
    cpol = 1;
    @(posedge clk); #1;
    if (mode_change_err === 1'b1)
      $display("PASS  cpol changed while busy: mode_change_err=1");
    else
      $display("FAIL  cpol changed while busy: mode_change_err=%0b (expected 1)", mode_change_err);

    // --- Restore CPOL — error must clear ---
    cpol = 0;
    @(posedge clk); #1;
    if (mode_change_err === 1'b0)
      $display("PASS  cpol restored: mode_change_err=0");
    else
      $display("FAIL  cpol restored: mode_change_err=%0b (expected 0)", mode_change_err);

    // --- Change CPHA while busy — error fires again ---
    cpha = 1;
    @(posedge clk); #1;
    if (mode_change_err === 1'b1)
      $display("PASS  cpha changed while busy: mode_change_err=1");
    else
      $display("FAIL  cpha changed while busy: mode_change_err=%0b (expected 1)", mode_change_err);

    $display("Mode guard done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  busy, stable mode: mode_change_err=0',
        'PASS  cpol changed while busy: mode_change_err=1',
        'PASS  cpha changed while busy: mode_change_err=1',
        'Mode guard done!',
      ]
    },

  ]
});
