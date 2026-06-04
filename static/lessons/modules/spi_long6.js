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
<h2>The Traffic Convention Varies by Country</h2>
<p>
  In the UK, cars drive on the left. In the US, on the right. Both systems work
  perfectly well — you just need to know which convention applies before you
  cross the border. SPI modes work exactly the same way: there are four different
  "driving conventions" that different devices use to decide when data is valid
  on the wire.
</p>
<p>
  The clock divider (spi_long2) produces two raw one-cycle pulses every SCK
  period: <code>rising_edge_p</code> fires for one pclk cycle on every rising
  SCK edge, and <code>falling_edge_p</code> fires for one pclk cycle on every
  falling SCK edge. The CPOL/CPHA timing engine is the block that decides which
  of these means <em>"put the next data bit on MOSI now"</em> (launch) and which
  means <em>"read what the slave put on MISO"</em> (sample). The answer depends
  on which SPI mode is configured.
</p>

<h3>Where spi_cpha Sits in the Full SPI Master</h3>
<pre class="code-block">
  spi_clk_div
  ┌─────────────────────────────┐
  │  16-bit counter → SCK       │
  │  rising_edge_p  ────────────┼──► ┌──────────────────────────────┐ ★
  │  falling_edge_p ────────────┼──► │         spi_cpha             │
  └─────────────────────────────┘    │                              │
                                     │  cpol ──┐                    │
  spi_reg_block (spi_long11)         │  cpha ──┴► mode_swap (XOR)  │
  ┌─────────────────────────────┐    │                              │
  │  cpol, cpha register fields─┼──► │  launch_pulse ──────────────┼──► spi_shift
  └─────────────────────────────┘    │  sample_pulse ──────────────┼──► spi_shift
                                     └──────────────────────────────┘
</pre>
<p>
  In L1, <code>spi_cpha</code> is entirely combinational — no clock port.
  Raw SCK pulses flow in; correctly timed launch and sample pulses come out.
  Later lessons add registered outputs (preseed, last_sample_pending, shadow
  registers) which are why the clock port appears in L2.
</p>

<h3>The Four SPI Modes — Which Edge Does What</h3>
<table class="truth-table">
  <tr><th>CPOL</th><th>CPHA</th><th>Mode</th><th>SCK idle level</th><th>Launch (TX) edge</th><th>Sample (RX) edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>Falling ↓</td><td>Rising ↑</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>LOW</td><td>Rising ↑</td><td>Falling ↓</td></tr>
  <tr><td>1</td><td>0</td><td>2</td><td>HIGH</td><td>Rising ↑</td><td>Falling ↓</td></tr>
  <tr><td>1</td><td>1</td><td>3</td><td>HIGH</td><td>Falling ↓</td><td>Rising ↑</td></tr>
</table>
<p>
  Look carefully at the table. Modes 0 and 3 share the same edge assignment
  (falling = launch, rising = sample). Modes 1 and 2 share the opposite.
  The dividing line is exactly <strong>CPOL XOR CPHA</strong>: when that
  expression equals 0, we are in the "fall-launch" group; when it equals 1,
  we are in the "rise-launch" group.
</p>

<h3>The XOR Trick: One Bit Selects the Mux</h3>
<table class="truth-table">
  <tr><th>cpol</th><th>cpha</th><th>mode_swap = cpol ^ cpha</th><th>launch goes to…</th><th>sample goes to…</th></tr>
  <tr><td>0</td><td>0</td><td>0 (Modes 0 &amp; 3)</td><td>falling_edge_p</td><td>rising_edge_p</td></tr>
  <tr><td>0</td><td>1</td><td>1 (Modes 1 &amp; 2)</td><td>rising_edge_p</td><td>falling_edge_p</td></tr>
  <tr><td>1</td><td>0</td><td>1 (Modes 1 &amp; 2)</td><td>rising_edge_p</td><td>falling_edge_p</td></tr>
  <tr><td>1</td><td>1</td><td>0 (Modes 0 &amp; 3)</td><td>falling_edge_p</td><td>rising_edge_p</td></tr>
</table>
<pre class="code-block">
logic mode_swap;
assign mode_swap    = cpol ^ cpha;         // 0 → Modes 0,3  |  1 → Modes 1,2
assign launch_pulse = mode_swap ? rising_edge_p  : falling_edge_p;
assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;
</pre>
<p>
  No flip-flops needed — this is purely combinational. Three lines of RTL
  handle all four SPI modes used across the entire industry. The raw SCK
  edge pulses pass straight through the mux and arrive at <code>spi_shift</code>
  correctly labelled for the chosen mode.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header: module spi_cpha (',
        '         input  logic cpol, cpha,',
        '         input  logic rising_edge_p, falling_edge_p,',
        '         output logic launch_pulse, sample_pulse',
        '         );',
        'Step 2 — Declare internal wire: logic mode_swap;',
        'Step 3 — XOR: assign mode_swap = cpol ^ cpha;',
        'Step 4 — Launch mux: assign launch_pulse = mode_swap ? rising_edge_p : falling_edge_p;',
        'Step 5 — Sample mux: assign sample_pulse = mode_swap ? falling_edge_p : rising_edge_p;',
        'Step 6 — endmodule',
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
<h2>The TV Announcer Must Already Be Speaking When the Broadcast Begins</h2>
<p>
  Imagine a live television broadcast. The producer counts down: 3, 2, 1 — and
  at exactly zero, millions of people tune in. The announcer cannot say "wait, let
  me clear my throat" once the camera is on. The first word must already be leaving
  their lips at the moment the broadcast starts.
</p>
<p>
  SPI Mode 0 works exactly the same way. In CPHA=0, the slave device samples MISO
  on the <em>very first SCK edge</em> — not the second, not after a warm-up period.
  That means the master must have bit 7 (MSB) already stable on MOSI the cycle CS
  asserts, <strong>before any SCK edge fires</strong>. Fail to do this and the slave
  captures an undefined first bit, silently corrupting the entire frame. The CPU
  reads back garbage and has no idea why.
</p>
<p>
  The one-cycle <strong>preseed_en</strong> pulse is the solution: it tells the
  shift register "CS just went active with CPHA=0 — load bit 7 onto MOSI right now,
  before the clock divider even starts."
</p>

<h3>Timing Diagram — CPHA=0, Mode 0</h3>
<pre class="code-block">
CS    :        ___|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
SCK   :        ___|‾|_|‾|_|‾|_|‾|_| ...
MOSI  :  ─────|b7 |b6 |b5|b4| ...      &lt;-- b7 already on wire BEFORE first rising SCK
preseed:  ─────|‾‾‾|___________________________
                   ↑ fires on first cycle AFTER CS asserts (cpha=0 only)
</pre>
<p>
  The pulse is exactly one PCLK wide. The shift register uses it to drive bit 7 onto
  MOSI in the same cycle — so by the time the first rising edge of SCK arrives, the
  setup time is already satisfied.
</p>

<h3>Detecting the CS Assertion Edge</h3>
<p>
  We need a one-cycle pulse exactly when <code>cs_active</code> goes from 0 to 1.
  The classic technique: register a delayed copy (<code>cs_active_r</code>), then
  compare the current value against the registered copy. The gap between them is a
  one-cycle pulse:
</p>
<pre class="code-block">
// cs_active_r is cs_active delayed by one clock cycle
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    cs_active_r &lt;= 0;
    preseed_en  &lt;= 0;
  end else begin
    cs_active_r &lt;= cs_active;                       // delayed copy
    preseed_en  &lt;= cs_active &amp;&amp; !cs_active_r &amp;&amp; !cpha;  // rising edge + cpha=0
  end
end
</pre>
<p>
  Three conditions must all be true simultaneously: CS is currently high
  (<code>cs_active</code>), CS was NOT high last cycle (<code>!cs_active_r</code>),
  and the mode requires pre-seeding (<code>!cpha</code>). In CPHA=1, the first
  bit is NOT required before the first edge — so preseed_en stays zero.
</p>
<p>
  This lesson adds a clock port (<code>pclk</code>, <code>rst_n</code>) to
  <code>spi_cpha</code> for the first time, making it a registered module.
  The combinational outputs from L1 remain unchanged; we just add one registered
  output alongside them.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from L1 spi_cpha (copy your L1 solution)',
        'Step 2 — Add new input ports: pclk, rst_n',
        'Step 3 — Add new input port: cs_active  (1 while CS is asserted)',
        'Step 4 — Change preseed_en to a registered output (output logic preseed_en)',
        'Step 5 — Declare internal register: logic cs_active_r;',
        'Step 6 — Add always_ff @(posedge pclk or negedge rst_n):',
        '         if (!rst_n): cs_active_r <= 0; preseed_en <= 0;',
        '         else: cs_active_r <= cs_active;',
        '               preseed_en  <= cs_active && !cs_active_r && !cpha;',
        'Step 7 — endmodule',
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
<h2>Closing the Door Before the Last Letter Arrives</h2>
<p>
  Picture a letterbox: the postman slides eight letters through, one by one.
  The last letter is halfway through the slot when you shut the door — it falls
  on the outside, lost forever. Nobody knows. The count says eight letters were
  sent; only seven arrived.
</p>
<p>
  In CPHA=1, the master launches bits on one edge and samples MISO on the
  <em>opposite</em> edge. When the final bit launches — the moment
  <code>word_done</code> fires — the slave is in the middle of driving its
  response for that last bit. The sample for it will arrive on the <em>next</em>
  SCK edge, which hasn't happened yet.
</p>
<p>
  If the Master FSM sees <code>word_done</code> and immediately deasserts CS,
  that next sample edge never fires. The last received bit is lost — and just
  like the letterbox, no error is raised. The CPU reads a byte with the last bit
  wrong.
</p>
<p>
  The timing engine solves this with a sticky flag: <strong>last_sample_pending</strong>.
  It stays high from the moment <code>word_done</code> fires (CPHA=1 only) until
  the outstanding sample pulse actually arrives. The Master FSM checks this flag
  before deassering CS — "door stays open until the last letter is through."
</p>

<h3>Timing Diagram — CPHA=1, Mode 1</h3>
<pre class="code-block">
SCK  : ‾|_|‾|_|‾|_|‾|_|           &lt;-- 8 SCK periods
MOSI :  [b7][b6][b5][b4][b3][b2][b1][b0]   TX shifts on rising edge (cpha=1)
MISO :    [b7][b6][b5][b4][b3][b2][b1][b0] RX samples on falling edge
                                       ↑
      word_done fires on rising edge 8 (launch of b0)
      But b0 on MISO is sampled on the NEXT falling edge  ←── not yet!
      last_sample_pending = 1 until that sample fires
</pre>

<h3>The Last-Sample State Machine</h3>
<pre class="code-block">
// Arm when the last launch fires AND we are in CPHA=1 mode:
if (word_done &amp;&amp; cpha)
  last_sample_pending &lt;= 1;   // one final sample still needed

// Clear when that sample edge arrives:
else if (sample_pulse)
  last_sample_pending &lt;= 0;   // safe to deassert CS now
</pre>
<p>
  The <code>else if</code> means: once armed, the next <code>sample_pulse</code>
  (regardless of which SCK edge triggered it) clears the flag. This works because
  after <code>word_done</code> the shift register has finished; the very next
  sample pulse is definitively the last-bit sample.
</p>
<p>
  In CPHA=0, the last sample fires on the same edge as the last launch — no
  pipeline gap — so <code>word_done && cpha</code> is never true and
  <code>last_sample_pending</code> stays zero throughout.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from L2 spi_cpha (copy your L2 solution)',
        'Step 2 — Add new input port: word_done',
        'Step 3 — Add new output port: output logic last_sample_pending',
        'Step 4 — In the always_ff reset block: last_sample_pending <= 0;',
        'Step 5 — In the always_ff else block, add AFTER the preseed line:',
        '         if (word_done && cpha)    last_sample_pending <= 1;',
        '         else if (sample_pulse)    last_sample_pending <= 0;',
        'Step 6 — endmodule',
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
<h2>The Referee Locks the Rulebook When the Match Begins</h2>
<p>
  Imagine a boxing match. Before the first bell, the referee announces the rules:
  five-round fight, three-minute rounds. Now imagine someone tries to change the
  rules to "six rounds" mid-fight after round three. Any sensible referee would
  immediately raise a flag — "you can't change the rules mid-match." The
  fighters agreed to the original rules; changing them mid-bout is a foul.
</p>
<p>
  In SPI, CPOL and CPHA work the same way. They are agreed upon before the transfer
  starts — the master and slave are both configured to use Mode 0. If software writes
  a new CPOL or CPHA value to the register block <em>while a transfer is in progress</em>,
  the edge assignment in <code>spi_cpha</code> shifts immediately. The slave continues
  expecting Mode 0 edges; the master suddenly starts launching on the wrong edge.
  The slave receives a malformed bit stream with absolutely no indication of the error —
  the data is silently wrong.
</p>
<p>
  This one of the hardest SPI bugs to debug in hardware. The system appears to work
  correctly for normal single-byte transfers, but fails intermittently when a
  context switch or interrupt fires exactly mid-transfer and overwrites the mode
  register. Two shadow registers catch it instantly.
</p>

<h3>Shadow Registers: Freeze the Mode at Transfer Start</h3>
<p>
  The idea is simple: maintain a second copy of CPOL and CPHA that is allowed to
  update only when the bus is idle (<code>!busy</code>). When <code>busy</code>
  asserts, the shadow copy is frozen. If the live registers diverge from the shadow
  copy while <code>busy</code> is high, someone changed the rules mid-match.
</p>
<pre class="code-block">
logic cpol_shadow, cpha_shadow;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    cpol_shadow &lt;= 0;  cpha_shadow &lt;= 0;
  end else if (!busy) begin
    cpol_shadow &lt;= cpol;   // track live mode while idle: always up to date
    cpha_shadow &lt;= cpha;
  end
  // when busy=1: shadow is frozen; live registers may change; difference = error
end

// combinational: fires in the same cycle the mismatch appears
assign mode_change_err = busy &amp;&amp;
                         ((cpol !== cpol_shadow) || (cpha !== cpha_shadow));
</pre>
<p>
  Notice: when <code>busy</code> goes low, the shadow registers immediately start
  tracking the live values again. By the time the next transfer begins, the shadow
  is in sync. The only window that matters is while <code>busy = 1</code>.
</p>

<h3>The Complete spi_cpha Module</h3>
<p>
  This L4 version is the complete, production-grade <code>spi_cpha</code> module.
  It integrates all four concerns introduced across L1–L4:
</p>
<table class="truth-table">
  <tr><th>Feature</th><th>Introduced</th><th>Signals added</th></tr>
  <tr><td>Mode-edge mux (XOR trick)</td><td>L1</td><td>launch_pulse, sample_pulse</td></tr>
  <tr><td>CPHA=0 first-bit pre-seed</td><td>L2</td><td>cs_active, preseed_en</td></tr>
  <tr><td>CPHA=1 last-bit sample guard</td><td>L3</td><td>word_done, last_sample_pending</td></tr>
  <tr><td>Mode-change error detection</td><td>L4</td><td>busy, cpol_shadow, cpha_shadow, mode_change_err</td></tr>
</table>
<p>
  The Master FSM (spi_long8, next chapter) will wire all of these outputs together:
  <code>preseed_en</code> triggers the first-bit load; <code>last_sample_pending</code>
  gates CS deassert; <code>mode_change_err</code> routes to the error handler.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from L3 spi_cpha (copy your L3 solution)',
        'Step 2 — Add new input port: input logic busy',
        'Step 3 — Add new output port: output logic mode_change_err',
        'Step 4 — Declare internal registers: logic cpol_shadow, cpha_shadow;',
        'Step 5 — In always_ff reset block:  cpol_shadow <= 0; cpha_shadow <= 0;',
        'Step 6 — In always_ff else block, add after the preseed/last_sample logic:',
        '         if (!busy) begin cpol_shadow <= cpol; cpha_shadow <= cpha; end',
        'Step 7 — Add combinational assign AFTER the always_ff block:',
        '         assign mode_change_err = busy && ((cpol !== cpol_shadow) || (cpha !== cpha_shadow));',
        'Step 8 — endmodule',
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
