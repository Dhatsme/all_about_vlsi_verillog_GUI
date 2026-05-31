(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb2',
  title: 'SPI Master Testbenches',
  icon: '⚡',
  level: 'intermediate',
  lessons: [

    // ─── L1: spi_clkdiv (Tier 2) ──────────────────────────────────────────
    {
      id: 'spitb2l1',
      title: 'L1 — Clock Divider Testbench: Counting Edges',
      theory: `
<h2>Shifting from Data to Timing Verification</h2>
<p>In Chapter 1 you checked <em>data values</em> — did the byte come out correctly?
The <code>spi_clkdiv</code> module produces no data at all. Its entire job is timing:
divide the system clock by 8, produce a clean 50% duty-cycle <code>sclk</code>, and
emit one-clock-wide edge strobes so downstream logic never has to detect edges itself.</p>

<p>Testing a timing circuit requires different techniques than testing a data path:</p>
<ul>
  <li><strong>Edge counting</strong> — count how many rising and falling transitions occur in a known time window</li>
  <li><strong>Overlap detection</strong> — verify that two mutually exclusive signals are never simultaneously high</li>
  <li><strong>Pulse-width checking</strong> — verify that a pulse is exactly 1 clock wide, not 2 or 0</li>
</ul>
<p>All three patterns appear in this lesson. They recur throughout the entire testbench course.</p>

<h2>The DUT: spi_clkdiv</h2>
<table class="truth-table">
<tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
<tr><td><code>clk</code></td><td>input</td><td>System clock input</td></tr>
<tr><td><code>rst</code></td><td>input</td><td>Active-low synchronous reset</td></tr>
<tr><td><code>sclk</code></td><td>output</td><td>Divided SPI clock — 1/8 of system clock frequency</td></tr>
<tr><td><code>sclk_rise</code></td><td>output</td><td>One-clock pulse: high when sclk just rose</td></tr>
<tr><td><code>sclk_fall</code></td><td>output</td><td>One-clock pulse: high when sclk just fell</td></tr>
</table>

<p>Internally, a 2-bit counter wraps every 4 clocks and toggles <code>sclk</code>.
One full <code>sclk</code> cycle (high + low) takes 8 system clocks.
Over 64 system clocks there are exactly 8 complete <code>sclk</code> cycles —
8 rising edges and 8 falling edges.</p>

<h2>Pattern 1 — Edge Counting</h2>
<p>Declare two counters and increment them inside a monitoring block that runs for
the measurement window (64 system clocks):</p>
<pre class="code-block">logic [3:0] rise_cnt = 0, fall_cnt = 0;

// Inside the 64-clock measurement loop:
repeat(64) begin
  @(posedge clk); #1;
  if (sclk_rise) rise_cnt = rise_cnt + 1;
  if (sclk_fall) fall_cnt = fall_cnt + 1;
end</pre>
<p>Note: these assignments inside an <code>initial</code> block use blocking <code>=</code>,
not <code>&lt;=</code>. Blocking assignment is correct here because you want the count
to update immediately within the sequential procedural execution.</p>

<h2>Pattern 2 — Overlap Detection</h2>
<p>A sticky error flag fires once and stays set:</p>
<pre class="code-block">logic overlap_err = 0;
// Inside the same loop:
if (sclk_rise && sclk_fall) overlap_err = 1;</pre>
<p>After the loop, <code>if (!overlap_err)</code> confirms the two strobes were never
simultaneously high. This catches bugs where both edges fire on the same cycle —
a subtle hardware mistake that would cause double-shifting.</p>

<h2>Pattern 3 — Pulse-Width via Consecutive-High Detection</h2>
<p>To verify that <code>sclk_rise</code> is exactly 1 clock wide, track whether it was
high on the previous clock:</p>
<pre class="code-block">logic prev_rise = 0;
logic pulse_err = 0;
// Inside the loop:
if (sclk_rise && prev_rise) pulse_err = 1;  // two consecutive highs = bug
prev_rise = sclk_rise;</pre>
<p>If <code>sclk_rise</code> stays high for two consecutive clocks, <code>pulse_err</code>
trips. One clock after <code>sclk_rise</code>, <code>prev_rise</code> is 1 but
<code>sclk_rise</code> should be 0 — the condition is false and no error fires.</p>

<h2>Idle State After Reset</h2>
<p>SPI Mode 0 requires SCLK to be low when idle. Check this before releasing reset,
while <code>rst</code> is still asserted:</p>
<pre class="code-block">rst=1; repeat(2) @(posedge clk); #1;
if (sclk===1'b0) $display("PASS  TC-CLKDIV-04  sclk idles LOW after reset");
rst=0;</pre>

<p><strong>Ready?</strong> Switch to the Code tab and write the clock divider testbench.
The DUT is pre-loaded in the Testbench tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Lines 1–4 ──  `timescale, module tb, clock (logic clk=0; always #5 clk=~clk;)',
        '── Lines 5–7 ──  declare logic rst, sclk, sclk_rise, sclk_fall; and instantiate spi_clkdiv dut',
        '── Lines 8–12 ──  declare logic [3:0] rise_cnt=0, fall_cnt=0; logic overlap_err=0, pulse_err=0, prev_rise=0;',
        '── Lines 13–15 ──  initial begin; reset: rst=1; repeat(2) @(posedge clk); #1;',
        '── TC-CLKDIV-04 ──  while rst=1: if (sclk===1\'b0) PASS else FAIL; then rst=0;',
        '── Lines 16–24 ──  repeat(64) begin loop: @(posedge clk); #1; increment rise_cnt/fall_cnt; set overlap_err; set pulse_err via prev_rise',
        '── TC-CLKDIV-01 ──  if (rise_cnt===4\'d8) PASS else FAIL',
        '── TC-CLKDIV-02 ──  if (fall_cnt===4\'d8) PASS else FAIL',
        '── TC-CLKDIV-03 ──  if (!overlap_err) PASS else FAIL  (no simultaneous rise+fall)',
        '── TC-CLKDIV-05 ──  if (!pulse_err) PASS else FAIL  (sclk_rise is 1 clock wide)',
        '$display("Clock divider testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 5 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE TESTBENCH — spi_clkdiv

\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, sclk, sclk_rise, sclk_fall;

  spi_clkdiv dut (.clk(clk), .rst(rst),
                  .sclk(sclk), .sclk_rise(sclk_rise), .sclk_fall(sclk_fall));

  logic [3:0] rise_cnt = 0, fall_cnt = 0;
  logic       overlap_err = 0, pulse_err = 0, prev_rise = 0;

  initial begin
    $display("=== Clock Divider Testbench ===");
    rst=1; repeat(2) @(posedge clk); #1;

    // TC-CLKDIV-04: sclk must idle LOW before reset releases
    if (sclk===1'b0)
      $display("PASS  TC-CLKDIV-04  sclk idles LOW after reset");
    else
      $display("FAIL  TC-CLKDIV-04  sclk=%0b expected 0", sclk);

    rst=0;

    // Measure 64 system clocks — should see exactly 8 rises and 8 falls
    repeat(64) begin
      @(posedge clk); #1;
      if (sclk_rise) rise_cnt = rise_cnt + 1;     // blocking = inside initial block
      if (sclk_fall) fall_cnt = fall_cnt + 1;
      if (sclk_rise && sclk_fall) overlap_err = 1; // both high same cycle = bug
      if (sclk_rise && prev_rise) pulse_err  = 1; // rise high 2 cycles = too wide
      prev_rise = sclk_rise;
    end

    // TC-CLKDIV-01: 8 rising edges in 64 clocks
    if (rise_cnt===4'd8)
      $display("PASS  TC-CLKDIV-01  8 rising edges in 64 clocks");
    else
      $display("FAIL  TC-CLKDIV-01  rise_cnt=%0d expected 8", rise_cnt);

    // TC-CLKDIV-02: 8 falling edges in 64 clocks
    if (fall_cnt===4'd8)
      $display("PASS  TC-CLKDIV-02  8 falling edges in 64 clocks");
    else
      $display("FAIL  TC-CLKDIV-02  fall_cnt=%0d expected 8", fall_cnt);

    // TC-CLKDIV-03: sclk_rise and sclk_fall must never overlap
    if (!overlap_err)
      $display("PASS  TC-CLKDIV-03  sclk_rise and sclk_fall never overlap");
    else
      $display("FAIL  TC-CLKDIV-03  simultaneous sclk_rise and sclk_fall detected");

    // TC-CLKDIV-05: sclk_rise pulses are exactly 1 clock wide
    if (!pulse_err)
      $display("PASS  TC-CLKDIV-05  sclk_rise pulse width is 1 clock");
    else
      $display("FAIL  TC-CLKDIV-05  sclk_rise held high for multiple clocks");

    $display("Clock divider testbench complete.");
    $finish;
  end
endmodule`,
      design:
`// Testbench for spi_clkdiv
// DUT is pre-loaded in the Testbench tab.
\`timescale 1ns/1ps
module tb;

endmodule
`,
      testbench:
`// spi_clkdiv — reference DUT (do not edit)
module spi_clkdiv (
  input  logic clk,
  input  logic rst,
  output logic sclk,
  output logic sclk_rise,
  output logic sclk_fall
);
  logic [1:0] cnt;
  logic sclk_r, sclk_prev;

  always_ff @(posedge clk) begin
    if (!rst) begin cnt <= 2'd0; sclk_r <= 1'b0; end
    else if (cnt == 2'd3) begin cnt <= 2'd0; sclk_r <= ~sclk_r; end
    else cnt <= cnt + 1;
  end

  always_ff @(posedge clk) sclk_prev <= sclk_r;

  assign sclk      = sclk_r;
  assign sclk_rise = sclk_r  & ~sclk_prev;
  assign sclk_fall = ~sclk_r &  sclk_prev;
endmodule`,
      expected: [
        'PASS  TC-CLKDIV-04',
        'PASS  TC-CLKDIV-01',
        'PASS  TC-CLKDIV-03',
        'Clock divider testbench complete.'
      ]
    },

    // ─── L2: spi_master — Slave Model Infrastructure (Tier 3) ────────────
    {
      id: 'spitb2l2',
      title: 'L2 — SPI Master: Building the Slave Model',
      theory: `
<h2>The Central Challenge of Testing a Master</h2>
<p>When you test a <em>slave</em>, you control every input — CS_N, SCLK, MOSI —
manually from the testbench. Testing a <em>master</em> is fundamentally different:
the master controls CS_N and SCLK itself. Your testbench cannot drive those signals.
Instead, you must build a <strong>simulated slave</strong> inside the testbench that
<em>reacts</em> to whatever the master generates.</p>

<p>The slave model has two jobs:</p>
<ul>
  <li><strong>Drive MISO</strong> — pre-load a response value when CS_N falls, then
  shift it out on each SCLK falling edge</li>
  <li><strong>Capture MOSI</strong> — record each MOSI bit on each SCLK rising edge
  so you can verify the master sent the right data</li>
</ul>

<h2>Edge Detection Inside a Testbench</h2>
<p>The slave model uses the same edge-detection technique as the DUT itself:
compare the signal against its registered previous value.</p>
<pre class="code-block">logic sp, cp;                    // sclk_prev, cs_n_prev
always_ff @(posedge clk) begin
  sp &lt;= sclk;
  cp &lt;= cs_n;
end
logic sclk_rise_s, cs_n_fall_s;
assign sclk_rise_s = sclk  &amp; ~sp;   // SCLK just rose
assign cs_n_fall_s = ~cs_n &amp;  cp;   // CS_N just fell</pre>
<p>These detect edges on the SPI bus signals driven by the DUT — so the model
automatically reacts to whatever the master produces, regardless of timing.</p>

<h2>The MISO Pre-Load Pattern</h2>
<p>In Mode 0, the slave must have the first MISO bit ready <em>before</em> the first
SCLK rising edge. The correct trigger is CS_N falling, not SCLK:</p>
<pre class="code-block">logic [7:0] slave_resp = 8'hC3;   // programmable response
logic [7:0] slave_tx;

always_ff @(posedge clk) begin
  if (cs_n_fall_s) slave_tx &lt;= slave_resp;           // pre-load on CS_N fall
  else if (sclk_fall_s) slave_tx &lt;= {slave_tx[6:0], 1'b0}; // shift on SCLK fall
end

assign miso = cs_n ? 1'b0 : slave_tx[7];</pre>
<p>The master (spi_master DUT) adds 1 idle clock between CS_N falling and the first
SCLK edge. This gives the slave model exactly 1 clock to pre-load before SCLK rises.
Pre-loading on CS_N fall (not on SCLK) is what makes this timing work.</p>

<h2>The MOSI Capture Model</h2>
<p>While the slave drives MISO, it also records what the master put on MOSI.
This is how you verify the master sent the right byte:</p>
<pre class="code-block">logic [7:0] mosi_cap;
logic [2:0] mosi_bit = 3'd7;   // start from MSB

always_ff @(posedge clk) begin
  if (cs_n_fall_s) mosi_bit &lt;= 3'd7;           // reset bit index on CS_N fall
  else if (sclk_rise_s) begin
    mosi_cap[mosi_bit] &lt;= mosi;                // capture MOSI on SCLK rise
    mosi_bit &lt;= mosi_bit - 1;
  end
end</pre>
<p>After a transfer completes, <code>mosi_cap</code> holds the 8 bits the master sent.
Compare it against <code>tx_data</code> to verify the TX path.</p>

<h2>The do_xfer Task</h2>
<p>A task wraps start-pulse + wait-for-completion into one call.
The spi_master DUT takes 33 system clocks per 8-bit transfer (1 setup + 8 bits × 4
phases). Using <code>repeat(50)</code> gives a comfortable safety margin:</p>
<pre class="code-block">task automatic do_xfer(input logic [7:0] tx, input logic [7:0] resp);
  slave_resp = resp;
  tx_data = tx;
  start = 1; @(posedge clk); #1; start = 0;
  repeat(50) @(posedge clk); #1;
endtask</pre>
<p>Set <code>slave_resp</code> before pulsing start so the slave model
pre-loads the correct value when CS_N falls.</p>

<h2>Verifying the Infrastructure</h2>
<p>Before writing all 8 test cases, run one transfer to confirm the slave model
works correctly. This is a common engineering practice: verify your test infrastructure
before trusting its results.</p>
<pre class="code-block">do_xfer(8'hAB, 8'hC3);
// slave captured MOSI = 0xAB?
if (mosi_cap===8'hAB) $display("PASS  slave model correctly captured MOSI");
// master received MISO = 0xC3?
if (rx_data===8'hC3)  $display("PASS  rx_data matches slave response");</pre>

<p><strong>Ready?</strong> Switch to the Code tab and build the slave model infrastructure.
The DUT is pre-loaded in the Testbench tab. This lesson is complete when the infrastructure
verification passes. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module, clock, and all DUT signals: rst, start, miso, mosi, sclk, cs_n, busy, done, tx_data[7:0], rx_data[7:0]',
        'Instantiate spi_master dut with all 11 ports',
        'Declare slave_resp[7:0] initialised to 8\'hC3, and slave_tx[7:0]',
        'Declare edge-detection registers sp, cp and assigns: sclk_rise_s, sclk_fall_s, cs_n_fall_s',
        'Write the slave model always_ff block: preload slave_tx on cs_n_fall_s, shift on sclk_fall_s',
        'Add assign miso = cs_n ? 1\'b0 : slave_tx[7];',
        'Declare mosi_cap[7:0] and mosi_bit[2:0] initialised to 7',
        'Write the MOSI capture always_ff block: reset mosi_bit on cs_n_fall_s, capture mosi on sclk_rise_s',
        'Write task automatic do_xfer: set slave_resp, pulse start, repeat(50)',
        'Write initial block: reset sequence, call do_xfer(8\'hAB, 8\'hC3)',
        'Check mosi_cap===8\'hAB and rx_data===8\'hC3 with PASS/FAIL',
        '$display("Master infrastructure verified."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 2 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE TESTBENCH — spi_master infrastructure (L2)

\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  spi_master dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // ── Slave model ────────────────────────────────────────────────────────
  logic [7:0] slave_resp = 8'hC3;  // programmable: change before each xfer
  logic [7:0] slave_tx;
  logic       sp, cp;               // sclk_prev, cs_n_prev
  logic       sclk_rise_s, sclk_fall_s, cs_n_fall_s;

  always_ff @(posedge clk) begin sp <= sclk; cp <= cs_n; end
  assign sclk_rise_s = sclk  & ~sp;
  assign sclk_fall_s = ~sclk &  sp;
  assign cs_n_fall_s = ~cs_n &  cp;

  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      slave_tx <= slave_resp;              // pre-load on CS_N fall
    else if (sclk_fall_s) slave_tx <= {slave_tx[6:0], 1'b0};  // shift on SCLK fall
  end
  assign miso = cs_n ? 1'b0 : slave_tx[7];  // drive MISO; 0 when idle

  // ── MOSI capture ───────────────────────────────────────────────────────
  logic [7:0] mosi_cap;
  logic [2:0] mosi_bit = 3'd7;

  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      mosi_bit <= 3'd7;          // reset index each frame
    else if (sclk_rise_s) begin
      mosi_cap[mosi_bit] <= mosi;                    // capture MOSI bit on SCLK rise
      mosi_bit           <= mosi_bit - 1;
    end
  end

  // ── Transfer task ──────────────────────────────────────────────────────
  task automatic do_xfer(input logic [7:0] tx, input logic [7:0] resp);
    slave_resp = resp;            // set response BEFORE start (pre-load timing)
    tx_data = tx;
    start = 1; @(posedge clk); #1; start = 0;
    repeat(50) @(posedge clk); #1;  // 33 clocks needed; 50 is safe margin
  endtask

  initial begin
    $display("=== SPI Master Infrastructure Verification ===");
    rst=1; start=0; tx_data=0;
    repeat(2) @(posedge clk); #1; rst=0;

    // Verify the slave model and MOSI capture work before running full test suite
    do_xfer(8'hAB, 8'hC3);

    if (mosi_cap===8'hAB)
      $display("PASS  slave model correctly captured MOSI=0xAB");
    else
      $display("FAIL  mosi_cap=0x%02h expected 0xAB", mosi_cap);

    if (rx_data===8'hC3)
      $display("PASS  rx_data matches slave response 0xC3");
    else
      $display("FAIL  rx_data=0x%02h expected 0xC3", rx_data);

    $display("Master infrastructure verified.");
    $finish;
  end
endmodule`,
      design:
`// SPI Master — Slave Model Infrastructure
// DUT (spi_master) is pre-loaded in the Testbench tab.
\`timescale 1ns/1ps
module tb;

endmodule
`,
      testbench:
`// spi_master — reference DUT (do not edit)
module spi_master (
  input  logic       clk,
  input  logic       rst,
  input  logic       start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi,
  output logic       sclk,
  output logic       cs_n,
  output logic       busy,
  output logic       done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r, active;

  always_ff @(posedge clk) begin
    if (!rst) begin
      sclk_r<=1'b0; cs_n<=1'b1; busy<=1'b0; done<=1'b0; active<=1'b0;
      bit_cnt<=3'd0; phase<=2'd3; tx_shift<=8'h00; rx_shift<=8'h00; rx_data<=8'h00;
    end else begin
      done <= 1'b0;
      if (!active && start) begin
        active<=1'b1; busy<=1'b1; cs_n<=1'b0; tx_shift<=tx_data;
        bit_cnt<=3'd0; phase<=2'd3; sclk_r<=1'b0;
      end else if (active) begin
        phase <= phase + 1;
        unique case (phase)
          2'd0: begin sclk_r<=1'b1; rx_shift<={rx_shift[6:0], miso}; end
          2'd1: ;
          2'd2: begin
            sclk_r<=1'b0;
            if (bit_cnt==3'd7) begin
              cs_n<=1'b1; rx_data<=rx_shift; done<=1'b1; busy<=1'b0; active<=1'b0;
            end else begin
              bit_cnt<=bit_cnt+1; tx_shift<={tx_shift[6:0],1'b0};
            end
          end
          2'd3: ;
        endcase
      end
    end
  end
  assign sclk = sclk_r;
  assign mosi = tx_shift[7];
endmodule`,
      expected: [
        'PASS  slave model correctly captured MOSI',
        'PASS  rx_data matches slave response',
        'Master infrastructure verified.'
      ]
    },

    // ─── L3: spi_master — Full Test Suite (Tier 3) ────────────────────────
    {
      id: 'spitb2l3',
      title: 'L3 — SPI Master: Complete Test Suite',
      theory: `
<h2>From Infrastructure to Test Suite</h2>
<p>In L2 you built and verified the slave model. Now you apply it across a complete
set of test cases that exercises every behaviour of <code>spi_master</code>.
This is the largest single testbench in the series — 8 test cases covering the
TX path, RX path, handshake signals, timing, and error handling.</p>

<p>The slave model and <code>do_xfer</code> task are provided in the starter code
below — start from there and add each test case. Never re-test infrastructure you
already verified; start from TC-MSTR-01.</p>

<h2>TC-MSTR-01 and TC-MSTR-02 — TX and RX Paths</h2>
<p>Run one transfer with a known <code>tx_data</code> and a programmed slave response.
Check both directions independently:</p>
<pre class="code-block">do_xfer(8'hAB, 8'hC3);
// TC-MSTR-01: verify MOSI (TX path)
if (mosi_cap===8'hAB) $display("PASS  TC-MSTR-01  MOSI=0xAB correct");
// TC-MSTR-02: verify rx_data (RX path)
if (rx_data===8'hC3)  $display("PASS  TC-MSTR-02  rx_data=0xC3 correct");</pre>

<h2>TC-MSTR-03 — Handshake: busy and cs_n</h2>
<p>After a completed transfer, <code>busy</code> must be 0 and <code>cs_n</code>
must be 1 (deasserted). Check both on the same clock:</p>
<pre class="code-block">if (!busy &amp;&amp; cs_n)
  $display("PASS  TC-MSTR-03  busy=0 cs_n=1 after transfer");</pre>

<h2>TC-MSTR-04 — done Pulse Width</h2>
<p>Use a <code>done_cnt</code> accumulator (introduced in Chapter 1 L3) to verify
<code>done</code> fires exactly once per transfer. Declare it as a logic variable
with an <code>always_ff</code> monitor, then reset it to 0 before each transfer you
are measuring.</p>

<h2>TC-MSTR-05 — Back-to-Back Transfers</h2>
<p>Call <code>do_xfer</code> twice in a row with different data. Verify each
transfer produces independent and correct results. This catches state-leak bugs
where bit counters or shift registers are not fully reset between transfers.</p>

<h2>TC-MSTR-06 — MISO = 0xFF (All-Ones Boundary)</h2>
<p>Set <code>slave_resp = 8'hFF</code> and verify <code>rx_data === 8'hFF</code>.
This confirms no bits are accidentally masked to 0 in the RX shift register.</p>

<h2>TC-MSTR-07 — Start Ignored While Busy</h2>
<p>Pulse <code>start</code> a second time immediately after the first transfer begins
(while <code>busy = 1</code>). Verify only one <code>done</code> fires and the transfer
completes with the original data — the second start must be ignored:</p>
<pre class="code-block">// Start first transfer
tx_data=8'hAA; start=1; @(posedge clk); #1; start=0;
// Immediately pulse start again while busy
repeat(3) @(posedge clk); #1;
start=1; @(posedge clk); #1; start=0;
// Wait and check: only 1 done should have fired
repeat(50) @(posedge clk); #1;
if (done_cnt===2'd1) $display("PASS  TC-MSTR-07  start ignored while busy");</pre>

<h2>TC-MSTR-08 — MOSI = 0x00 (All-Zeros Boundary)</h2>
<p>Transmit <code>8'h00</code> and verify slave captures all-zeros. This confirms
no bits are accidentally masked to 1.</p>

<p><strong>Ready?</strong> Switch to the Code tab. The slave model infrastructure is
provided in the starter — add the 8 test cases. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab has the slave model starter — add the test cases below the do_xfer task.',
        'Add logic [1:0] done_cnt=0; and an always_ff monitor that increments done_cnt when done fires',
        'TC-MSTR-01: do_xfer(8\'hAB, 8\'hC3); check mosi_cap===8\'hAB',
        'TC-MSTR-02: same transfer; check rx_data===8\'hC3',
        'TC-MSTR-03: after transfer; check !busy && cs_n',
        'TC-MSTR-04: reset done_cnt=0; do_xfer; check done_cnt===2\'d1',
        'TC-MSTR-05: back-to-back: do_xfer(8\'h12, 8\'h34) then do_xfer(8\'h56, 8\'h78); check both pairs',
        'TC-MSTR-06: do_xfer(8\'h00, 8\'hFF); check rx_data===8\'hFF',
        'TC-MSTR-07: start first xfer; 3 clocks later pulse start again; verify done_cnt===1 after waiting',
        'TC-MSTR-08: do_xfer(8\'h00, 8\'h00); check mosi_cap===8\'h00',
        '$display("SPI master testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 10 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE TESTBENCH — spi_master full test suite (L3)

\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  spi_master dut (
    .clk(clk), .rst(rst), .start(start), .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n), .busy(busy), .done(done), .rx_data(rx_data)
  );

  // ── Slave model ────────────────────────────────────────────────────────
  logic [7:0] slave_resp = 8'hC3;
  logic [7:0] slave_tx;
  logic       sp, cp;
  logic       sclk_rise_s, sclk_fall_s, cs_n_fall_s;
  always_ff @(posedge clk) begin sp<=sclk; cp<=cs_n; end
  assign sclk_rise_s = sclk  & ~sp;
  assign sclk_fall_s = ~sclk &  sp;
  assign cs_n_fall_s = ~cs_n &  cp;
  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      slave_tx <= slave_resp;
    else if (sclk_fall_s) slave_tx <= {slave_tx[6:0], 1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx[7];

  // ── MOSI capture ───────────────────────────────────────────────────────
  logic [7:0] mosi_cap;
  logic [2:0] mosi_bit = 3'd7;
  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      mosi_bit <= 3'd7;
    else if (sclk_rise_s) begin mosi_cap[mosi_bit]<=mosi; mosi_bit<=mosi_bit-1; end
  end

  // ── done counter ───────────────────────────────────────────────────────
  logic [1:0] done_cnt = 0;
  always_ff @(posedge clk) if (done) done_cnt <= done_cnt + 1;

  // ── Transfer task ──────────────────────────────────────────────────────
  task automatic do_xfer(input logic [7:0] tx, input logic [7:0] resp);
    slave_resp=resp; tx_data=tx;
    start=1; @(posedge clk); #1; start=0;
    repeat(50) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Master Full Test Suite ===");
    rst=1; start=0; tx_data=0; repeat(2) @(posedge clk); #1; rst=0;

    // TC-MSTR-01: TX path — MOSI must match tx_data
    do_xfer(8'hAB, 8'hC3);
    if (mosi_cap===8'hAB)
      $display("PASS  TC-MSTR-01  MOSI=0xAB correct");
    else
      $display("FAIL  TC-MSTR-01  mosi_cap=0x%02h expected 0xAB", mosi_cap);

    // TC-MSTR-02: RX path — rx_data must match slave response
    if (rx_data===8'hC3)
      $display("PASS  TC-MSTR-02  rx_data=0xC3 correct");
    else
      $display("FAIL  TC-MSTR-02  rx_data=0x%02h expected 0xC3", rx_data);

    // TC-MSTR-03: handshake — busy=0 and cs_n=1 after transfer
    if (!busy && cs_n)
      $display("PASS  TC-MSTR-03  busy=0 cs_n=1 after transfer");
    else
      $display("FAIL  TC-MSTR-03  busy=%0b cs_n=%0b", busy, cs_n);

    // TC-MSTR-04: done fires exactly once per transfer
    done_cnt=0;
    do_xfer(8'h00, 8'h00);
    if (done_cnt===2'd1)
      $display("PASS  TC-MSTR-04  done fired exactly once");
    else
      $display("FAIL  TC-MSTR-04  done_cnt=%0d expected 1", done_cnt);

    // TC-MSTR-05: back-to-back transfers — no state leak
    do_xfer(8'h12, 8'h34);
    if (mosi_cap===8'h12 && rx_data===8'h34)
      $display("PASS  TC-MSTR-05  back-to-back xfer 1 correct");
    else
      $display("FAIL  TC-MSTR-05  mosi=0x%02h rx=0x%02h", mosi_cap, rx_data);
    do_xfer(8'h56, 8'h78);
    if (mosi_cap===8'h56 && rx_data===8'h78)
      $display("PASS  TC-MSTR-05  back-to-back xfer 2 correct");
    else
      $display("FAIL  TC-MSTR-05  mosi=0x%02h rx=0x%02h", mosi_cap, rx_data);

    // TC-MSTR-06: MISO=0xFF — no bits masked to 0
    do_xfer(8'hFF, 8'hFF);
    if (rx_data===8'hFF)
      $display("PASS  TC-MSTR-06  rx_data=0xFF all-ones correct");
    else
      $display("FAIL  TC-MSTR-06  rx_data=0x%02h expected 0xFF", rx_data);

    // TC-MSTR-07: start ignored while busy
    done_cnt=0;
    slave_resp=8'hAA; tx_data=8'hAA;
    start=1; @(posedge clk); #1; start=0;
    repeat(3) @(posedge clk); #1;
    start=1; @(posedge clk); #1; start=0;  // second start during transfer
    repeat(50) @(posedge clk); #1;
    if (done_cnt===2'd1)
      $display("PASS  TC-MSTR-07  start ignored while busy, done fired once");
    else
      $display("FAIL  TC-MSTR-07  done_cnt=%0d expected 1", done_cnt);

    // TC-MSTR-08: tx_data=0x00 — no bits masked to 1
    do_xfer(8'h00, 8'h00);
    if (mosi_cap===8'h00)
      $display("PASS  TC-MSTR-08  MOSI=0x00 all-zeros correct");
    else
      $display("FAIL  TC-MSTR-08  mosi_cap=0x%02h expected 0x00", mosi_cap);

    $display("SPI master testbench complete.");
    $finish;
  end
endmodule`,
      design:
`// SPI Master — Full Test Suite
// DUT is pre-loaded in the Testbench tab.
// Slave model infrastructure is provided below — add the test cases.
\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  spi_master dut (
    .clk(clk), .rst(rst), .start(start), .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n), .busy(busy), .done(done), .rx_data(rx_data)
  );

  // ── Slave model (pre-built) ────────────────────────────────────────────
  logic [7:0] slave_resp = 8'hC3;
  logic [7:0] slave_tx;
  logic sp, cp, sclk_rise_s, sclk_fall_s, cs_n_fall_s;
  always_ff @(posedge clk) begin sp<=sclk; cp<=cs_n; end
  assign sclk_rise_s=sclk&~sp; assign sclk_fall_s=~sclk&sp; assign cs_n_fall_s=~cs_n&cp;
  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      slave_tx<=slave_resp;
    else if (sclk_fall_s) slave_tx<={slave_tx[6:0],1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx[7];

  // ── MOSI capture (pre-built) ───────────────────────────────────────────
  logic [7:0] mosi_cap;
  logic [2:0] mosi_bit = 3'd7;
  always_ff @(posedge clk) begin
    if (cs_n_fall_s) mosi_bit<=3'd7;
    else if (sclk_rise_s) begin mosi_cap[mosi_bit]<=mosi; mosi_bit<=mosi_bit-1; end
  end

  // ── TODO: add done_cnt accumulator ────────────────────────────────────

  // ── Transfer task (pre-built) ─────────────────────────────────────────
  task automatic do_xfer(input logic [7:0] tx, input logic [7:0] resp);
    slave_resp=resp; tx_data=tx;
    start=1; @(posedge clk); #1; start=0;
    repeat(50) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Master Full Test Suite ===");
    rst=1; start=0; tx_data=0; repeat(2) @(posedge clk); #1; rst=0;

    // ── TODO: add TC-MSTR-01 through TC-MSTR-08 ───────────────────────

    $display("SPI master testbench complete.");
    $finish;
  end
endmodule
`,
      testbench:
`// spi_master — reference DUT (do not edit)
module spi_master (
  input  logic       clk, rst, start, miso,
  input  logic [7:0] tx_data,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r, active;
  always_ff @(posedge clk) begin
    if (!rst) begin
      sclk_r<=0; cs_n<=1; busy<=0; done<=0; active<=0;
      bit_cnt<=0; phase<=3; tx_shift<=0; rx_shift<=0; rx_data<=0;
    end else begin
      done<=0;
      if (!active && start) begin
        active<=1; busy<=1; cs_n<=0; tx_shift<=tx_data;
        bit_cnt<=0; phase<=3; sclk_r<=0;
      end else if (active) begin
        phase<=phase+1;
        unique case(phase)
          2'd0: begin sclk_r<=1; rx_shift<={rx_shift[6:0],miso}; end
          2'd1: ;
          2'd2: begin
            sclk_r<=0;
            if (bit_cnt==3'd7) begin cs_n<=1; rx_data<=rx_shift; done<=1; busy<=0; active<=0; end
            else begin bit_cnt<=bit_cnt+1; tx_shift<={tx_shift[6:0],1'b0}; end
          end
          2'd3: ;
        endcase
      end
    end
  end
  assign sclk=sclk_r; assign mosi=tx_shift[7];
endmodule`,
      expected: [
        'PASS  TC-MSTR-01',
        'PASS  TC-MSTR-02',
        'PASS  TC-MSTR-05',
        'PASS  TC-MSTR-07',
        'SPI master testbench complete.'
      ]
    },

    // ─── L4: spi_master_16 (Tier 4) ───────────────────────────────────────
    {
      id: 'spitb2l4',
      title: 'L4 — 16-bit Master Testbench: Widening the Transfer',
      theory: `
<h2>Scaling from 8 to 16 Bits</h2>
<p>The <code>spi_master_16</code> module transfers a 16-bit word in a single CS_N
assertion. High byte <code>[15:8]</code> is sent first, low byte <code>[7:0]</code>
second. The testbench techniques from L2/L3 apply directly — the only change is width:
wider data registers, a 4-bit bit counter, and a longer wait time.</p>

<p>This lesson is Tier 4 (behaviour spec). You receive the port list and the
expected behaviour — design the testbench structure yourself.</p>

<h2>Ports</h2>
<table class="truth-table">
<tr><th>Port</th><th>Width</th><th>Direction</th><th>Notes</th></tr>
<tr><td><code>tx_word</code></td><td>16</td><td>input</td><td>Word to transmit, high byte first</td></tr>
<tr><td><code>rx_word</code></td><td>16</td><td>output</td><td>Received word, assembled MSB first</td></tr>
<tr><td><code>start, busy, done, cs_n, sclk, mosi, miso</code></td><td>1</td><td>—</td><td>Same as 8-bit master</td></tr>
</table>

<h2>New Test Cases</h2>

<h3>TC-M16-01: CS_N stays low for all 16 SCLK cycles</h3>
<p>Monitor <code>cs_n</code> with a sticky flag during the transfer.
If <code>cs_n</code> ever goes high between the first and last bit, the flag trips.
A false pulse between bytes 1 and 2 would cause a one-byte slave to deframe:</p>
<pre class="code-block">logic cs_n_glitch = 0;
always_ff @(posedge clk) begin
  if (!cs_n_prev &amp;&amp; cs_n) cs_n_glitch &lt;= 1;  // cs_n rose while active
end</pre>

<h3>TC-M16-02: High byte transmitted first</h3>
<p>Use a 16-bit MOSI capture model. The first 8 captured bits should equal
<code>tx_word[15:8]</code>; the next 8 should equal <code>tx_word[7:0]</code>:</p>
<pre class="code-block">// 16-bit MOSI capture — counts 0..15
logic [15:0] mosi_cap16;
logic  [3:0] mosi_bit16 = 4'd15;
always_ff @(posedge clk) begin
  if (cs_n_fall_s) mosi_bit16 &lt;= 4'd15;
  else if (sclk_rise_s) begin
    mosi_cap16[mosi_bit16] &lt;= mosi;
    mosi_bit16 &lt;= mosi_bit16 - 1;
  end
end</pre>

<h3>TC-M16-03: rx_word assembled correctly</h3>
<p>Program the slave model to drive a known 16-bit sequence across 16 SCLK cycles.
The slave model shifts left on each SCLK fall, same as for 8-bit — just runs for 16 edges.
Verify <code>rx_word === 16'h1234</code> after done.</p>

<h3>TC-M16-04: done fires after bit 15, not bit 7</h3>
<p>Monitor when <code>done</code> fires relative to the SCLK edge count.
After 8 edges done must still be 0; after 16 edges done must be 1.</p>

<h2>Extending the Slave Model for 16 Bits</h2>
<p>The slave model widens from 8 to 16 bits. It pre-loads on CS_N fall and shifts
on each of the 16 SCLK falling edges — the logic is identical, just wider:</p>
<pre class="code-block">logic [15:0] slave_resp16 = 16'h1234;
logic [15:0] slave_tx16;
always_ff @(posedge clk) begin
  if (cs_n_fall_s)      slave_tx16 &lt;= slave_resp16;
  else if (sclk_fall_s) slave_tx16 &lt;= {slave_tx16[14:0], 1'b0};
end
assign miso = cs_n ? 1'b0 : slave_tx16[15];</pre>

<p><strong>Ready?</strong> Switch to the Code tab and build the 16-bit master testbench.
The DUT is pre-loaded in the Testbench tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare 16-bit versions of tx_word, rx_word, slave_resp16, slave_tx16, mosi_cap16',
        'Declare 4-bit mosi_bit16 = 4\'d15 and a cs_n_glitch sticky flag',
        'Write the slave model using slave_tx16 (16-bit shift, pre-load on cs_n_fall_s)',
        'Write the 16-bit MOSI capture model using mosi_bit16 counting from 15 down to 0',
        'Write do_xfer16 task: wait repeat(100) (16 bits × 4 phases + margin)',
        'TC-M16-01: run transfer; check cs_n_glitch===1\'b0 (CS_N never pulsed high)',
        'TC-M16-02: check mosi_cap16===tx_word (high byte sent first, correct order)',
        'TC-M16-03: slave drives 16\'h1234; verify rx_word===16\'h1234',
        'TC-M16-04: do_xfer16; verify done fired exactly once (use done_cnt)',
        '$display("16-bit master testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 4 PASS lines should appear',
      ],
      hint:
`COMPLETE TESTBENCH — spi_master_16

\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [15:0] tx_word, rx_word;

  spi_master_16 dut (
    .clk(clk), .rst(rst), .start(start), .tx_word(tx_word), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n), .busy(busy), .done(done), .rx_word(rx_word)
  );

  // ── 16-bit slave model ─────────────────────────────────────────────────
  logic [15:0] slave_resp16 = 16'h1234;
  logic [15:0] slave_tx16;
  logic        sp, cp, sclk_rise_s, sclk_fall_s, cs_n_fall_s;
  always_ff @(posedge clk) begin sp<=sclk; cp<=cs_n; end
  assign sclk_rise_s=sclk&~sp; assign sclk_fall_s=~sclk&sp; assign cs_n_fall_s=~cs_n&cp;
  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      slave_tx16<=slave_resp16;
    else if (sclk_fall_s) slave_tx16<={slave_tx16[14:0],1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx16[15];

  // ── 16-bit MOSI capture ────────────────────────────────────────────────
  logic [15:0] mosi_cap16;
  logic  [3:0] mosi_bit16 = 4'd15;
  always_ff @(posedge clk) begin
    if (cs_n_fall_s)      mosi_bit16<=4'd15;
    else if (sclk_rise_s) begin mosi_cap16[mosi_bit16]<=mosi; mosi_bit16<=mosi_bit16-1; end
  end

  // ── CS_N glitch detector ───────────────────────────────────────────────
  logic cs_n_glitch = 0;
  logic cs_n_was_low = 0;
  logic cs_n_prev2;
  always_ff @(posedge clk) begin
    cs_n_prev2<=cs_n;
    if (!cs_n) cs_n_was_low<=1;
    if (cs_n_was_low && !cs_n_prev2 && cs_n) cs_n_glitch<=1; // rose mid-transfer
  end

  // ── done counter ───────────────────────────────────────────────────────
  logic [1:0] done_cnt = 0;
  always_ff @(posedge clk) if (done) done_cnt<=done_cnt+1;

  task automatic do_xfer16(input logic [15:0] tx, input logic [15:0] resp);
    slave_resp16=resp; tx_word=tx;
    start=1; @(posedge clk); #1; start=0;
    repeat(100) @(posedge clk); #1;  // 16 bits × 4 phases + margin
  endtask

  initial begin
    $display("=== 16-bit Master Testbench ===");
    rst=1; start=0; tx_word=0; repeat(2) @(posedge clk); #1; rst=0;

    do_xfer16(16'hABCD, 16'h1234);

    // TC-M16-01: CS_N must stay low for entire 16-bit transfer
    if (!cs_n_glitch)
      $display("PASS  TC-M16-01  CS_N stayed low for all 16 SCLK cycles");
    else
      $display("FAIL  TC-M16-01  CS_N glitch detected mid-transfer");

    // TC-M16-02: high byte first — verify full 16-bit MOSI order
    if (mosi_cap16===16'hABCD)
      $display("PASS  TC-M16-02  MOSI=0x%04h high-byte-first correct", mosi_cap16);
    else
      $display("FAIL  TC-M16-02  mosi_cap16=0x%04h expected 0xABCD", mosi_cap16);

    // TC-M16-03: rx_word assembled correctly
    if (rx_word===16'h1234)
      $display("PASS  TC-M16-03  rx_word=0x%04h correct", rx_word);
    else
      $display("FAIL  TC-M16-03  rx_word=0x%04h expected 0x1234", rx_word);

    // TC-M16-04: done fires exactly once
    if (done_cnt===2'd1)
      $display("PASS  TC-M16-04  done fired exactly once");
    else
      $display("FAIL  TC-M16-04  done_cnt=%0d expected 1", done_cnt);

    $display("16-bit master testbench complete.");
    $finish;
  end
endmodule`,
      design:
`// Build the spi_master_16 testbench here.
// DUT is pre-loaded in the Testbench tab.
`,
      testbench:
`// spi_master_16 — reference DUT (do not edit)
module spi_master_16 (
  input  logic        clk, rst, start, miso,
  input  logic [15:0] tx_word,
  output logic        mosi, sclk, cs_n, busy, done,
  output logic [15:0] rx_word
);
  logic [15:0] tx_shift, rx_shift;
  logic  [3:0] bit_cnt;
  logic  [1:0] phase;
  logic        sclk_r, active;
  always_ff @(posedge clk) begin
    if (!rst) begin
      sclk_r<=0; cs_n<=1; busy<=0; done<=0; active<=0;
      bit_cnt<=0; phase<=3; tx_shift<=0; rx_shift<=0; rx_word<=0;
    end else begin
      done<=0;
      if (!active && start) begin
        active<=1; busy<=1; cs_n<=0; tx_shift<=tx_word;
        bit_cnt<=0; phase<=3; sclk_r<=0;
      end else if (active) begin
        phase<=phase+1;
        unique case(phase)
          2'd0: begin sclk_r<=1; rx_shift<={rx_shift[14:0],miso}; end
          2'd1: ;
          2'd2: begin
            sclk_r<=0;
            if (bit_cnt==4'd15) begin cs_n<=1; rx_word<=rx_shift; done<=1; busy<=0; active<=0; end
            else begin bit_cnt<=bit_cnt+1; tx_shift<={tx_shift[14:0],1'b0}; end
          end
          2'd3: ;
        endcase
      end
    end
  end
  assign sclk=sclk_r; assign mosi=tx_shift[15];
endmodule`,
      expected: [
        'PASS  TC-M16-01',
        'PASS  TC-M16-02',
        'PASS  TC-M16-03',
        '16-bit master testbench complete.'
      ]
    },

    // ─── L5: spi_master_param Portfolio (Tier 5) ──────────────────────────
    {
      id: 'spitb2l5',
      title: 'L5 — Parameterized Master: Multi-Mode Portfolio Testbench',
      theory: `
<h2>The Four SPI Modes</h2>
<p>Real hardware datasheets specify a device's SPI mode as a two-bit code: CPOL and CPHA.
A testbench that only covers Mode 0 misses three-quarters of the SPI world. This lesson
builds a comprehensive multi-mode testbench — a genuine portfolio artefact.</p>

<table class="truth-table">
<tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCLK idle</th><th>Sample edge</th><th>Common uses</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>Rising</td><td>Most sensors, ADCs, SD cards</td></tr>
<tr><td>1</td><td>0</td><td>1</td><td>LOW</td><td>Falling</td><td>Some LCD controllers</td></tr>
<tr><td>2</td><td>1</td><td>0</td><td>HIGH</td><td>Falling</td><td>Some motor driver ICs</td></tr>
<tr><td>3</td><td>1</td><td>1</td><td>HIGH</td><td>Rising</td><td>Some accelerometers</td></tr>
</table>

<h2>The DUT: spi_master_param</h2>
<p>The parameterized master accepts <code>cpol</code> and <code>cpha</code> as input
ports (not compile-time parameters) so mode can be switched between transfers.
The <code>N_BITS</code> parameter controls transfer width (8 or 16).</p>

<p>The provided implementation supports all four CPOL/CPHA combinations for Mode 0 and Mode 2
(CPOL varies, CPHA=0). CPHA=1 support is partial — your testbench should detect which
modes pass and which expose limitations. Finding bugs is a valid and valuable test result.</p>

<h2>Mode-Specific Slave Models</h2>
<p>Each SPI mode requires a different slave model because the sample and shift edges are different:</p>
<ul>
  <li><strong>Mode 0/Mode 2:</strong> CPHA=0 — sample on first active edge, shift on second.
  The slave model from L2/L3 works directly for Mode 0. For Mode 2, swap rise/fall:
  slave pre-loads on CS_N fall; shifts on SCLK rising edge (not falling).</li>
  <li><strong>Mode 1/Mode 3:</strong> CPHA=1 — first edge shifts master output, second samples.
  The slave shifts on SCLK rising, samples on SCLK falling.</li>
</ul>

<h2>Test Infrastructure Per Mode</h2>
<p>The cleanest approach is a parameterised task that selects the correct slave model
behaviour based on the mode under test:</p>
<pre class="code-block">task automatic do_mode_xfer(
  input logic       cpol_v, cpha_v,
  input logic [7:0] tx, resp
);
  cpol=cpol_v; cpha=cpha_v;
  slave_resp=resp;
  tx_data=tx;
  start=1; @(posedge clk); #1; start=0;
  repeat(50) @(posedge clk); #1;
endtask</pre>

<h2>What to Verify Per Mode</h2>
<p>For each mode, the minimum verification set is:</p>
<ul>
  <li>SCLK idles at the correct level (low for CPOL=0, high for CPOL=1)</li>
  <li>The sample edge is correct (MOSI captured on the right SCLK transition)</li>
  <li>A full loopback: <code>tx_data === rx_data</code> when MISO = MOSI (wire loopback)</li>
  <li>CS_N asserts and deasserts at the correct time</li>
</ul>

<h2>Verifying SCLK Idle Level</h2>
<p>Sample <code>sclk</code> immediately after reset deasserts, before <code>start</code>
is pulsed. For CPOL=0 modes it must be 0; for CPOL=1 modes it must be 1:</p>
<pre class="code-block">cpol=1'b1; cpha=1'b0;
@(posedge clk); #1;         // give DUT 1 clock to latch cpol
if (sclk===1'b1) $display("PASS  Mode 2: sclk idles HIGH (cpol=1)");</pre>

<p>This is a real interview question at hardware verification roles. A testbench that
covers all four SPI modes, catches a known CPHA=1 limitation, and reports which modes
pass and which fail is ready for a GitHub portfolio.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build it. Stuck? Tap 💡 Show Hint
for the full design notes and suggested test structure.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare DUT ports including cpol and cpha inputs (both 1-bit logic)',
        'Instantiate spi_master_param dut — note it has cpol and cpha as runtime ports, not just parameters',
        'Build a slave model that can handle Mode 0 (MISO shifts on sclk_fall); tie miso=mosi for loopback verification',
        'Write a do_mode_xfer task that sets cpol/cpha, programs tx_data, pulses start, waits 50 clocks',
        'Mode 0 (cpol=0, cpha=0): verify sclk idles LOW; verify loopback rx_data===tx_data',
        'Mode 2 (cpol=1, cpha=0): verify sclk idles HIGH; verify loopback rx_data===tx_data',
        'Mode 1 (cpol=0, cpha=1): run transfer; report PASS or FAIL (DUT may not implement this fully)',
        'Mode 3 (cpol=1, cpha=1): run transfer; report PASS or FAIL',
        'Add a summary section: count passing modes and display total',
        '$display("Parameterized master portfolio testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — at minimum Mode 0 and Mode 2 should show PASS',
        '🎓 Portfolio piece — push this testbench to your GitHub when complete',
      ],
      hint:
`DESIGN NOTES — spi_master_param multi-mode testbench

The four SPI modes require different slave model edge assignments:

  Mode 0 (CPOL=0 CPHA=0): slave preloads on cs_n_fall, shifts on sclk_fall
  Mode 1 (CPOL=0 CPHA=1): slave preloads on cs_n_fall, shifts on sclk_rise
  Mode 2 (CPOL=1 CPHA=0): slave preloads on cs_n_fall, shifts on sclk_rise
  Mode 3 (CPOL=1 CPHA=1): slave preloads on cs_n_fall, shifts on sclk_fall

Simplification: for loopback verification (miso = mosi), you don't need a real
slave model — just wire miso directly to mosi and verify rx_data === tx_data.

Test sequence outline:

  1. reset
  2. Mode 0: set cpol=0,cpha=0; check sclk===0 before start; do loopback; check rx_data
  3. Mode 2: set cpol=1,cpha=0; check sclk===1 before start; do loopback; check rx_data
  4. Mode 1: set cpol=0,cpha=1; do loopback; check rx_data (may FAIL — document result)
  5. Mode 3: set cpol=1,cpha=1; do loopback; check rx_data (may FAIL — document result)
  6. N_BITS=16 test: if parameter is compiled, verify 16-bit loopback

SCLK idle check pattern (run BEFORE start pulse):
  cpol=1; cpha=0;
  @(posedge clk); #1;   // 1 clock for DUT to reflect new cpol
  if (sclk===cpol) PASS else FAIL

DUT summary: spi_master_param implements CPOL (Modes 0 and 2 both pass).
CPHA=1 (Modes 1 and 3) may show incorrect rx_data — that is the expected result
for an incomplete implementation. A good testbench finds bugs.

Ports:
  input  logic       clk, rst, start, miso
  input  logic [N_BITS-1:0] tx_data
  input  logic       cpol, cpha
  output logic       mosi, sclk, cs_n, busy, done
  output logic [N_BITS-1:0] rx_data`,
      design:
`// Build the spi_master_param multi-mode testbench here.
// DUT is pre-loaded in the Testbench tab.
`,
      testbench:
`// spi_master_param — reference DUT (do not edit)
// Supports CPOL=0 and CPOL=1 (Modes 0 and 2 with CPHA=0).
// CPHA=1 is partially implemented — your testbench should detect the limitation.
module spi_master_param #(parameter N_BITS = 8) (
  input  logic              clk, rst, start, miso, cpol, cpha,
  input  logic [N_BITS-1:0] tx_data,
  output logic              mosi, sclk, cs_n, busy, done,
  output logic [N_BITS-1:0] rx_data
);
  logic [N_BITS-1:0] tx_shift, rx_shift;
  logic [$clog2(N_BITS)-1:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r, active;

  always_ff @(posedge clk) begin
    if (!rst) begin
      sclk_r<=0; cs_n<=1; busy<=0; done<=0; active<=0;
      bit_cnt<=0; phase<=3; tx_shift<=0; rx_shift<=0; rx_data<=0;
    end else begin
      done<=0;
      if (!active && start) begin
        active<=1; busy<=1; cs_n<=0; tx_shift<=tx_data;
        bit_cnt<=0; phase<=3; sclk_r<=cpol;
      end else if (active) begin
        phase<=phase+1;
        unique case(phase)
          2'd0: begin
            sclk_r<=~cpol;
            if (!cpha) rx_shift<={rx_shift[N_BITS-2:0], miso};
          end
          2'd1: ;
          2'd2: begin
            sclk_r<=cpol;
            if (cpha) rx_shift<={rx_shift[N_BITS-2:0], miso};
            if (bit_cnt==N_BITS-1) begin
              cs_n<=1;
              rx_data <= cpha ? {rx_shift[N_BITS-2:0],miso} : rx_shift;
              done<=1; busy<=0; active<=0;
            end else begin
              bit_cnt<=bit_cnt+1; tx_shift<={tx_shift[N_BITS-2:0],1'b0};
            end
          end
          2'd3: ;
        endcase
      end
    end
  end
  assign sclk=sclk_r; assign mosi=tx_shift[N_BITS-1];
endmodule`,
      expected: [
        'PASS  Mode 0',
        'PASS  Mode 2',
        'Parameterized master portfolio testbench complete.'
      ]
    }

  ] // end lessons
});
