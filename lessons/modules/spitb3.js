(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb3',
  title: 'SPI Slave Testbenches',
  icon: '🎯',
  level: 'intermediate',
  lessons: [

    // ─── L1: spi_slave_rx Testbench (Tier 2) ─────────────────────────────────
    {
      id: 'spitb3l1',
      title: 'L1 — Slave Receiver Testbench: You Are the Master',
      theory: `
<h2>You Are the Master Now</h2>
<p>In every previous testbench you were the <em>checker</em>: drive inputs, verify outputs.
Testing a SPI slave is different — your testbench must also behave as a
<strong>SPI master</strong>. You manually control the three bus signals a real master owns:
<code>cs_n</code>, <code>sclk</code>, and <code>mosi</code>.
If any of these is wrong, the slave will not respond and you will not know why until you
trace the waveform bit by bit. That is not where you want to be at 2 AM before a tape-out.</p>

<p>This is not as complex as it sounds. Two small tasks — one to send a single SPI bit,
one to send a full byte — keep the test body readable and the signal driving correct.</p>

<h2>The DUT: spi_slave_rx</h2>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td><code>clk</code></td><td>in</td><td>System clock — runs 8× faster than SCLK in this testbench</td></tr>
<tr><td><code>rst</code></td><td>in</td><td>Active-low synchronous reset</td></tr>
<tr><td><code>cs_n</code></td><td>in</td><td>Chip select active-low — slave ignores SCLK/MOSI while cs_n=1</td></tr>
<tr><td><code>sclk</code></td><td>in</td><td>Serial clock — slave samples MOSI on every rising edge</td></tr>
<tr><td><code>mosi</code></td><td>in</td><td>Serial data in (master drives, slave reads)</td></tr>
<tr><td><code>rx_data</code></td><td>out</td><td>Assembled parallel byte — valid when rx_valid is high</td></tr>
<tr><td><code>rx_valid</code></td><td>out</td><td>One-clock pulse — fires when the 8th SCLK edge arrives</td></tr>
</table>

<p>Internally the DUT uses a registered copy of <code>sclk</code> called <code>sclk_prev</code>
to detect rising edges. This edge detector has one system-clock of latency — you must hold
each SCLK phase for at least 2 system clocks. Four is the safe margin used throughout this course.</p>

<h2>Pattern 1 — The spi_bit Task</h2>
<p>One SPI bit = set MOSI, then hold SCLK low for 4 clocks (setup), then hold SCLK high for
4 clocks (sampling window). The slave samples on the SCLK rising edge.</p>
<pre class="code-block">task automatic spi_bit(input logic b);
  mosi = b;
  sclk = 0; repeat(4) @(posedge clk); #1;   // hold SCLK low
  sclk = 1; repeat(4) @(posedge clk); #1;   // SCLK rises — slave samples
endtask</pre>
<p>The <code>#1</code> after each clock edge gives the DUT flip-flops 1 ns to settle before
the testbench reads outputs. Skip it and you may observe signals mid-transition.</p>

<h2>Pattern 2 — The spi_send_byte Task</h2>
<p>Assert CS_N, send 8 bits MSB-first via <code>spi_bit</code>, return SCLK to idle, deassert CS_N:</p>
<pre class="code-block">task automatic spi_send_byte(input logic [7:0] data);
  cs_n = 0;          // assert chip select
  spi_bit(data[7]);  // MSB first
  spi_bit(data[6]);
  // ... (bits 5 through 1) ...
  spi_bit(data[0]);  // LSB last
  sclk = 0; repeat(2) @(posedge clk); #1;   // SCLK back to idle
  cs_n = 1; repeat(4) @(posedge clk); #1;   // deassert chip select
endtask</pre>

<h2>Pattern 3 — The rx_valid Capture Register</h2>
<p><code>rx_valid</code> is a one-clock pulse. If you read it after the pulse has passed
you always see 0. A capture register that runs continuously solves this:</p>
<pre class="code-block">logic [7:0] saved_rx;
always_ff @(posedge clk) begin
  if (rx_valid) saved_rx &lt;= rx_data;
end</pre>
<p>After <code>spi_send_byte</code> returns, read <code>saved_rx</code> — not <code>rx_data</code>.</p>

<h2>Five Test Cases to Build</h2>
<table class="truth-table">
<tr><th>ID</th><th>Stimulus</th><th>Check</th></tr>
<tr><td>TC-SLAVE-01</td><td>Reset held — no transfer</td><td><code>rx_valid === 1'b0</code></td></tr>
<tr><td>TC-SLAVE-02</td><td><code>spi_send_byte(8'hA5)</code></td><td><code>saved_rx === 8'hA5</code></td></tr>
<tr><td>TC-SLAVE-03</td><td><code>spi_send_byte(8'h37)</code></td><td><code>saved_rx === 8'h37</code></td></tr>
<tr><td>TC-SLAVE-04</td><td>Deassert <code>cs_n=1</code> mid-stream</td><td><code>rx_valid === 1'b0</code></td></tr>
<tr><td>TC-SLAVE-05</td><td>Back-to-back 0xFF then 0x00</td><td><code>saved_rx === 8'h00</code></td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type your <code>module tb</code>.
The DUT (<code>spi_slave_rx</code>) is pre-loaded in the Testbench tab.
Stuck? Tap 💡 Show Hint for the fully annotated solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Block 1 ──  `timescale 1ns/1ps  then  module tb;',
        '── Block 2 ──  logic clk = 0;  always #2 clk = ~clk;  then  logic rst, cs_n, sclk, mosi;  logic [7:0] rx_data;  logic rx_valid;',
        '── Block 3 ──  Instantiate spi_slave_rx dut — connect all 7 ports by name',
        '── Block 4 ──  logic [7:0] saved_rx;  always_ff @(posedge clk) if (rx_valid) saved_rx <= rx_data;',
        '── Block 5 ──  task automatic spi_bit(input logic b): mosi=b, sclk=0 repeat(4) clk, sclk=1 repeat(4) clk — each with #1',
        '── Block 6 ──  task automatic spi_send_byte(input logic [7:0] data): cs_n=0, call spi_bit 8 times MSB-first, then sclk=0, cs_n=1',
        '── TC-SLAVE-01 ──  during reset: if (rx_valid===1\'b0) $display("PASS  TC-SLAVE-01 ..."); else $display("FAIL..."); rst=0;',
        '── TC-SLAVE-02 ──  spi_send_byte(8\'hA5);  if (saved_rx===8\'hA5) PASS else FAIL',
        '── TC-SLAVE-03 ──  spi_send_byte(8\'h37);  check saved_rx===8\'h37',
        '── TC-SLAVE-04 ──  cs_n=1; repeat(2) @(posedge clk); #1;  check rx_valid===1\'b0',
        '── TC-SLAVE-05 ──  spi_send_byte(8\'hFF); spi_send_byte(8\'h00);  check saved_rx===8\'h00',
        '$display("Slave receiver testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 5 PASS lines should appear in the Output tab',
      ],
      hint:
`COMPLETE ANNOTATED TESTBENCH — spi_slave_rx

\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;    // 250 MHz — fine resolution for manual SCLK control

  logic       rst, cs_n, sclk, mosi;
  logic [7:0] rx_data;
  logic       rx_valid;

  spi_slave_rx dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .mosi(mosi),
    .rx_data(rx_data), .rx_valid(rx_valid)
  );

  // Capture register: holds rx_data whenever the one-clock rx_valid pulse fires
  logic [7:0] saved_rx;
  always_ff @(posedge clk) begin
    if (rx_valid) saved_rx <= rx_data;
  end

  // spi_bit: set MOSI to b, hold SCLK low 4 clocks then high 4 clocks
  // 4 clocks each side gives the sclk_prev edge detector a safe setup margin
  task automatic spi_bit(input logic b);
    mosi = b;
    sclk = 0; repeat(4) @(posedge clk); #1;
    sclk = 1; repeat(4) @(posedge clk); #1;
  endtask

  // spi_send_byte: full SPI byte transaction, MSB first
  task automatic spi_send_byte(input logic [7:0] data);
    cs_n = 0;
    spi_bit(data[7]);
    spi_bit(data[6]);
    spi_bit(data[5]);
    spi_bit(data[4]);
    spi_bit(data[3]);
    spi_bit(data[2]);
    spi_bit(data[1]);
    spi_bit(data[0]);
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Slave Receiver Testbench ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0;
    repeat(4) @(posedge clk); #1;

    // TC-SLAVE-01: rx_valid must stay 0 while reset is active
    if (rx_valid === 1'b0)
      $display("PASS  TC-SLAVE-01: rx_valid low during reset");
    else
      $display("FAIL  TC-SLAVE-01: rx_valid unexpectedly high during reset");
    rst = 0;

    // TC-SLAVE-02: 0xA5 = 1010_0101 — alternating pattern catches bit-order bugs
    spi_send_byte(8'hA5);
    if (saved_rx === 8'hA5)
      $display("PASS  TC-SLAVE-02: received 0xA5");
    else
      $display("FAIL  TC-SLAVE-02: saved_rx=0x%02h expected 0xA5", saved_rx);

    // TC-SLAVE-03: different value confirms shift register is not stuck
    spi_send_byte(8'h37);
    if (saved_rx === 8'h37)
      $display("PASS  TC-SLAVE-03: received 0x37");
    else
      $display("FAIL  TC-SLAVE-03: saved_rx=0x%02h expected 0x37", saved_rx);

    // TC-SLAVE-04: cs_n high clears rx_valid (DUT resets on cs_n=1)
    cs_n = 1; repeat(2) @(posedge clk); #1;
    if (rx_valid === 1'b0)
      $display("PASS  TC-SLAVE-04: rx_valid cleared after cs_n deassert");
    else
      $display("FAIL  TC-SLAVE-04: rx_valid stuck high");

    // TC-SLAVE-05: back-to-back — second byte must overwrite first in saved_rx
    spi_send_byte(8'hFF);
    spi_send_byte(8'h00);
    if (saved_rx === 8'h00)
      $display("PASS  TC-SLAVE-05: back-to-back 0x00 captured");
    else
      $display("FAIL  TC-SLAVE-05: saved_rx=0x%02h expected 0x00", saved_rx);

    $display("Slave receiver testbench complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;

  // ── Step 1: Signals ─────────────────────────────────────────────────────────
  // logic clk = 0;
  // always #2 clk = ~clk;
  // logic       rst, cs_n, sclk, mosi;
  // logic [7:0] rx_data;
  // logic       rx_valid;

  // ── Step 2: Instantiate spi_slave_rx ────────────────────────────────────────
  // spi_slave_rx dut (
  //   .clk(clk), .rst(rst), .cs_n(cs_n),
  //   .sclk(sclk), .mosi(mosi),
  //   .rx_data(rx_data), .rx_valid(rx_valid)
  // );

  // ── Step 3: Capture register ─────────────────────────────────────────────────
  // logic [7:0] saved_rx;
  // always_ff @(posedge clk) if (rx_valid) saved_rx <= rx_data;

  // ── Step 4: spi_bit task ─────────────────────────────────────────────────────
  // task automatic spi_bit(input logic b);
  //   mosi = b;
  //   sclk = 0; repeat(4) @(posedge clk); #1;
  //   sclk = 1; repeat(4) @(posedge clk); #1;
  // endtask

  // ── Step 5: spi_send_byte task ───────────────────────────────────────────────
  // task automatic spi_send_byte(input logic [7:0] data);
  //   cs_n = 0;
  //   spi_bit(data[7]); ... spi_bit(data[0]);
  //   sclk = 0; repeat(2) @(posedge clk); #1;
  //   cs_n = 1; repeat(4) @(posedge clk); #1;
  // endtask

  // ── Step 6: initial begin ────────────────────────────────────────────────────
  // TC-SLAVE-01: rx_valid === 0 during reset
  // TC-SLAVE-02: spi_send_byte(8'hA5) → saved_rx === 8'hA5
  // TC-SLAVE-03: spi_send_byte(8'h37) → saved_rx === 8'h37
  // TC-SLAVE-04: cs_n=1 → rx_valid === 0
  // TC-SLAVE-05: back-to-back 0xFF then 0x00 → saved_rx === 8'h00

endmodule
`,
      testbench:
`// spi_slave_rx — reference DUT (do not edit)
// Your module tb in the Code tab instantiates this module.
module spi_slave_rx (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  output logic [7:0] rx_data,
  output logic       rx_valid
);
  logic [7:0] shift_reg;
  logic [2:0] bit_cnt;
  logic       sclk_prev, sclk_rise;

  always_ff @(posedge clk) sclk_prev <= sclk;
  assign sclk_rise = sclk & ~sclk_prev;

  always_ff @(posedge clk) begin
    if (rst || cs_n) begin
      shift_reg <= 8'b0;
      bit_cnt   <= 3'd0;
      rx_valid  <= 1'b0;
    end else if (sclk_rise) begin
      shift_reg <= {shift_reg[6:0], mosi};
      if (bit_cnt == 3'd7) begin
        rx_data  <= {shift_reg[6:0], mosi};
        rx_valid <= 1'b1;
        bit_cnt  <= 3'd0;
      end else begin
        bit_cnt  <= bit_cnt + 1;
        rx_valid <= 1'b0;
      end
    end else begin
      rx_valid <= 1'b0;
    end
  end
endmodule`,
      expected: [
        'PASS  TC-SLAVE-01',
        'PASS  TC-SLAVE-02',
        'PASS  TC-SLAVE-04',
        'Slave receiver testbench complete.'
      ]
    },

    // ─── L2: spi_slave_fd Testbench (Tier 3) ─────────────────────────────────
    {
      id: 'spitb3l2',
      title: 'L2 — Full-Duplex Slave Testbench: Driving and Sampling Simultaneously',
      theory: `
<h2>Driving and Sampling at the Same Time</h2>
<p>L1 only verified the slave's receive path — you drove MOSI and checked that the slave
assembled the byte correctly. A full-duplex slave adds a transmit path: while the master
is driving MOSI bit by bit, the slave is simultaneously driving MISO bit by bit in the
other direction. Both sides shift on the same SCLK edges, in opposite directions.</p>

<p>Verifying full-duplex means your testbench must do two things on every SCLK cycle:
drive MOSI to the slave <em>and</em> read MISO back from the slave.
This is the exact behaviour of a real SPI master chip.</p>

<h2>The DUT: spi_slave_fd</h2>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Added vs spi_slave_rx</th></tr>
<tr><td><code>tx_data[7:0]</code></td><td>in</td><td>Byte the slave wants to transmit on MISO</td></tr>
<tr><td><code>miso</code></td><td>out</td><td>Serial data out — slave drives, master reads</td></tr>
<tr><td>All other ports</td><td>—</td><td>Same as spi_slave_rx</td></tr>
</table>

<h3>MISO timing — pre-load, then shift</h3>
<p>The slave pre-loads its internal TX shift register with <code>tx_data</code> the moment
CS_N falls. This is why <code>tx_data</code> must be set <em>before</em> asserting CS_N —
the DUT latches it on the very first rising clock edge after CS_N goes low.</p>

<p>After pre-loading, the slave shifts MISO on each SCLK <em>falling</em> edge (presenting
the next bit while SCLK is low, before the master samples on the rising edge):</p>
<pre class="code-block">// DUT internal behaviour — not shown in Testbench tab for brevity
// cs_n_fall → tx_shift &lt;= tx_data         (pre-load)
// sclk_fall → tx_shift &lt;= {tx_shift[6:0], 1'b0}  (shift)
// assign miso = cs_n ? 1'b0 : tx_shift[7]  (always drive MSB)</pre>

<h2>The spi_xfer Task — Full-Duplex Version</h2>
<p>Add MISO capture to the <code>spi_bit</code> pattern. Sample MISO after SCLK rises —
at that point the slave's bit has been stable since the previous SCLK fall:</p>
<pre class="code-block">task automatic spi_xfer(
  input  logic [7:0] tx,
  output logic [7:0] rx
);
  cs_n = 0; repeat(2) @(posedge clk); #1;  // CS_N fall — slave pre-loads
  mosi = tx[7]; sclk = 0; repeat(4) @(posedge clk); #1;
                sclk = 1; repeat(4) @(posedge clk); #1; rx[7] = miso;
  mosi = tx[6]; sclk = 0; repeat(4) @(posedge clk); #1;
                sclk = 1; repeat(4) @(posedge clk); #1; rx[6] = miso;
  // ... (bits 5 through 1 same pattern) ...
  mosi = tx[0]; sclk = 0; repeat(4) @(posedge clk); #1;
                sclk = 1; repeat(4) @(posedge clk); #1; rx[0] = miso;
  sclk = 0; repeat(2) @(posedge clk); #1;
  cs_n = 1; repeat(4) @(posedge clk); #1;
endtask</pre>
<p>Note that <code>rx[7] = miso</code> uses blocking <code>=</code> inside an
<code>initial</code> block — this captures the current value of <code>miso</code>
immediately rather than scheduling it for end-of-timestep. This is correct and
intentional in procedural testbench code.</p>

<h2>Four Test Cases to Build</h2>
<table class="truth-table">
<tr><th>ID</th><th>MOSI sent</th><th>tx_data</th><th>Check</th></tr>
<tr><td>TC-FD-01</td><td>0x5A</td><td>0xBE</td><td><code>miso_captured === 8'hBE</code></td></tr>
<tr><td>TC-FD-02</td><td>same</td><td>same</td><td><code>saved_rx === 8'h5A</code></td></tr>
<tr><td>TC-FD-03</td><td>0x00</td><td>0xF0</td><td><code>miso_captured === 8'hF0</code></td></tr>
<tr><td>TC-FD-04</td><td>cs_n deassert</td><td>—</td><td><code>rx_valid === 1'b0</code></td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and build the <code>spi_xfer</code> task.
The DUT is in the Testbench tab. Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare all signals: clk, rst, cs_n, sclk, mosi, miso, tx_data[7:0], rx_data[7:0], rx_valid',
        'Instantiate spi_slave_fd dut — connect all 9 ports by name',
        'Add the saved_rx capture register: always_ff @(posedge clk) if (rx_valid) saved_rx <= rx_data',
        'Write the spi_xfer task: cs_n=0 setup (2 clocks), then 8 unrolled bit exchanges sampling miso after each SCLK rise, cs_n=1 teardown',
        'TC-FD-01: set tx_data=8\'hBE, spi_xfer(8\'h5A, miso_captured) — check miso_captured===8\'hBE',
        'TC-FD-02: same transfer — check saved_rx===8\'h5A (slave correctly received MOSI)',
        'TC-FD-03: set tx_data=8\'hF0, spi_xfer(8\'h00, miso_captured) — check miso_captured===8\'hF0',
        'TC-FD-04: cs_n=1; repeat(2) @(posedge clk); #1; — check rx_valid===1\'b0',
        '$display("Full-duplex slave testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 4 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso;
  logic [7:0] tx_data, rx_data;
  logic       rx_valid;

  spi_slave_fd dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .tx_data(tx_data),
    .miso(miso), .rx_data(rx_data), .rx_valid(rx_valid)
  );

  logic [7:0] saved_rx;
  always_ff @(posedge clk) begin
    if (rx_valid) saved_rx <= rx_data;
  end

  task automatic spi_xfer(
    input  logic [7:0] tx,
    output logic [7:0] rx
  );
    cs_n = 0; repeat(2) @(posedge clk); #1;
    mosi = tx[7]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[7] = miso;
    mosi = tx[6]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[6] = miso;
    mosi = tx[5]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[5] = miso;
    mosi = tx[4]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[4] = miso;
    mosi = tx[3]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[3] = miso;
    mosi = tx[2]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[2] = miso;
    mosi = tx[1]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[1] = miso;
    mosi = tx[0]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[0] = miso;
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] miso_captured;

  initial begin
    $display("=== Full-Duplex SPI Slave Testbench ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0; tx_data = 8'h00;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    tx_data = 8'hBE;
    spi_xfer(8'h5A, miso_captured);
    if (miso_captured === 8'hBE)
      $display("PASS  TC-FD-01: MISO returned 0xBE");
    else
      $display("FAIL  TC-FD-01: miso=0x%02h expected 0xBE", miso_captured);

    if (saved_rx === 8'h5A)
      $display("PASS  TC-FD-02: slave received 0x5A");
    else
      $display("FAIL  TC-FD-02: saved_rx=0x%02h expected 0x5A", saved_rx);

    tx_data = 8'hF0;
    spi_xfer(8'h00, miso_captured);
    if (miso_captured === 8'hF0)
      $display("PASS  TC-FD-03: MISO updated to 0xF0 on second transfer");
    else
      $display("FAIL  TC-FD-03: miso=0x%02h expected 0xF0", miso_captured);

    cs_n = 1; repeat(2) @(posedge clk); #1;
    if (rx_valid === 1'b0)
      $display("PASS  TC-FD-04: rx_valid cleared after cs_n deassert");
    else
      $display("FAIL  TC-FD-04: rx_valid stuck high");

    $display("Full-duplex slave testbench complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;

  // ── Step 1: Signals ──────────────────────────────────────────────────────────
  // logic clk = 0;
  // always #2 clk = ~clk;
  // logic       rst, cs_n, sclk, mosi, miso;
  // logic [7:0] tx_data, rx_data;
  // logic       rx_valid;

  // ── Step 2: Instantiate spi_slave_fd ────────────────────────────────────────
  // spi_slave_fd dut (
  //   .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
  //   .mosi(mosi), .tx_data(tx_data),
  //   .miso(miso), .rx_data(rx_data), .rx_valid(rx_valid)
  // );

  // ── Step 3: Capture register ─────────────────────────────────────────────────
  // logic [7:0] saved_rx;
  // always_ff @(posedge clk) if (rx_valid) saved_rx <= rx_data;

  // ── Step 4: spi_xfer task ────────────────────────────────────────────────────
  // task automatic spi_xfer(input logic [7:0] tx, output logic [7:0] rx);
  //   cs_n = 0; repeat(2) @(posedge clk); #1;
  //   for each bit 7..0:
  //     mosi = tx[N]; sclk=0; repeat(4) @(posedge clk); #1;
  //                   sclk=1; repeat(4) @(posedge clk); #1; rx[N] = miso;
  //   sclk=0; repeat(2) @(posedge clk); #1; cs_n=1; repeat(4) @(posedge clk); #1;
  // endtask

  // ── Step 5: initial begin ────────────────────────────────────────────────────
  // TC-FD-01: tx_data=0xBE, xfer 0x5A → check miso_captured === 8'hBE
  // TC-FD-02: same transfer → check saved_rx === 8'h5A
  // TC-FD-03: tx_data=0xF0, xfer 0x00 → check miso_captured === 8'hF0
  // TC-FD-04: cs_n=1 → check rx_valid === 0

endmodule
`,
      testbench:
`// spi_slave_fd — reference DUT (do not edit)
// Your module tb in the Code tab instantiates this module.
module spi_slave_fd (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  input  logic [7:0] tx_data,
  output logic       miso,
  output logic [7:0] rx_data,
  output logic       rx_valid
);
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt;
  logic       sclk_prev, sclk_rise, sclk_fall;
  logic       cs_n_prev, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;

  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  always_ff @(posedge clk) begin
    if (rst || cs_n) begin
      shift_reg <= 8'b0;
      bit_cnt   <= 3'd0;
      rx_valid  <= 1'b0;
    end else begin
      if (cs_n_fall) tx_shift <= tx_data;

      if (sclk_rise) begin
        shift_reg <= {shift_reg[6:0], mosi};
        if (bit_cnt == 3'd7) begin
          rx_data  <= {shift_reg[6:0], mosi};
          rx_valid <= 1'b1;
          bit_cnt  <= 3'd0;
        end else begin
          bit_cnt  <= bit_cnt + 1;
          rx_valid <= 1'b0;
        end
      end else begin
        rx_valid <= 1'b0;
      end

      if (sclk_fall) tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule`,
      expected: [
        'PASS  TC-FD-01',
        'PASS  TC-FD-02',
        'PASS  TC-FD-03',
        'Full-duplex slave testbench complete.'
      ]
    },

    // ─── L3: spi_loopback Testbench (Tier 4) ─────────────────────────────────
    {
      id: 'spitb3l3',
      title: 'L3 — Loopback System Testbench: System-Level Verification',
      theory: `
<h2>When the DUT Is a Complete System</h2>
<p>In L1 and L2, your testbench had to manually drive SPI bus signals (CS_N, SCLK, MOSI)
because those signals belonged to the master, and there was no master in the DUT.
<code>spi_loopback</code> changes that: it instantiates both a master and a slave internally,
connects the SPI bus wires between them, and exposes only high-level control signals to the
outside world.</p>

<p>Your testbench now works at the system level — no bus wiggling, no manual SCLK pulses.
You set the data you want each side to send, pulse <code>start</code>, wait, and read the
received data on both sides. This is how real system-level verification environments work:
the closer you are to the top level, the less you interact with raw signals.</p>

<h2>spi_loopback Port Map</h2>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td><code>clk, rst</code></td><td>in</td><td>System clock and reset — same as every other module</td></tr>
<tr><td><code>start</code></td><td>in</td><td>Pulse high for 1 clock to begin a transfer</td></tr>
<tr><td><code>tx_m[7:0]</code></td><td>in</td><td>Byte the master sends to the slave on MOSI</td></tr>
<tr><td><code>tx_s[7:0]</code></td><td>in</td><td>Byte the slave sends to the master on MISO</td></tr>
<tr><td><code>rx_m[7:0]</code></td><td>out</td><td>What the master received from the slave (should equal tx_s)</td></tr>
<tr><td><code>rx_s[7:0]</code></td><td>out</td><td>What the slave received from the master (should equal tx_m)</td></tr>
<tr><td><code>rx_valid_s</code></td><td>out</td><td>One-clock pulse when slave has assembled a complete byte</td></tr>
<tr><td><code>done</code></td><td>out</td><td>One-clock pulse when master transfer completes</td></tr>
<tr><td><code>busy</code></td><td>out</td><td>High while a transfer is in progress</td></tr>
</table>

<h3>The fundamental loopback invariant</h3>
<p>After every transfer, two equalities must hold simultaneously:</p>
<ul>
  <li><strong>rx_m === tx_s</strong> — the master received what the slave sent</li>
  <li><strong>last_rx_s === tx_m</strong> — the slave received what the master sent</li>
</ul>
<p>If either fails, you have a wiring bug in the loopback module, a timing bug in the
master FSM, or a pre-load bug in the slave. The two checks together localise the fault.</p>

<h3>do_loopback task pattern</h3>
<p>Set both tx values before pulsing start — the slave pre-loads on CS_N fall (1 clock into
the transfer), not on <code>start</code>. If you load <code>tx_s</code> after the transfer
has already begun, the slave will ship the old value on MISO.</p>
<pre class="code-block">task automatic do_loopback(input logic [7:0] m, input logic [7:0] s);
  tx_m = m; tx_s = s;          // set data BEFORE start
  start = 1; @(posedge clk); #1; start = 0;
  repeat(200) @(posedge clk); #1;  // wait &gt; 64 sys-clocks (8 bits × 8 phases)
endtask</pre>

<h3>Capture register for rx_s</h3>
<p>Like <code>rx_valid</code>, <code>rx_valid_s</code> is a one-clock pulse. Use the same
capture-register pattern from L1:</p>
<pre class="code-block">logic [7:0] last_rx_s;
always_ff @(posedge clk) if (rx_valid_s) last_rx_s &lt;= rx_s;</pre>

<p><strong>Ready?</strong> Switch to the Code tab and write <code>module tb</code>.
The complete DUT (loopback + master + slave) is pre-loaded in the Testbench tab.
Stuck? Tap 💡 Show Hint for the design notes.</p>
`,
      tasks: [
        'The loopback DUT contains both master and slave — you do not drive any SPI bus signals directly.',
        'Declare: clk, rst, start, tx_m[7:0], tx_s[7:0], rx_m[7:0], rx_s[7:0], rx_valid_s, done, busy',
        'Add a last_rx_s capture register: always_ff @(posedge clk) if (rx_valid_s) last_rx_s <= rx_s',
        'Write do_loopback(m, s): set tx_m=m, tx_s=s, pulse start 1 clock, repeat(200) @(posedge clk)',
        'TC-LOOP-01: do_loopback(8\'hAB, 8\'hC3) — check rx_m === 8\'hC3 (master received slave\'s byte)',
        'TC-LOOP-02: same transfer — check last_rx_s === 8\'hAB (slave received master\'s byte)',
        'TC-LOOP-03: do_loopback(8\'hDE, 8\'hAD) — check both rx_m and last_rx_s',
        'TC-LOOP-04: do_loopback(8\'hFF, 8\'h00) — all-ones master vs all-zeros slave, check both',
        '$display("Loopback testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines and the final message should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for spi_loopback testbench

  The DUT wraps both master and slave internally.
  No SPI bus signals (sclk, mosi, miso, cs_n) are visible at the top level.

  Ports you drive:
    clk, rst           — clock and reset
    start              — pulse 1 clock to begin a transfer
    tx_m[7:0]          — byte the master sends (set BEFORE start)
    tx_s[7:0]          — byte the slave sends back (set BEFORE start)

  Ports you read:
    rx_m[7:0]          — what the master received (= tx_s if correct)
    rx_s[7:0]          — what the slave received  (= tx_m if correct)
    rx_valid_s         — one-clock pulse when slave byte is ready
    done               — one-clock pulse when master finishes
    busy               — high while transfer is in progress

  Capture register for rx_s (same pattern as L1 and L2):
    logic [7:0] last_rx_s;
    always_ff @(posedge clk) if (rx_valid_s) last_rx_s <= rx_s;

  do_loopback task skeleton:
    task automatic do_loopback(input logic [7:0] m, input logic [7:0] s);
      tx_m = m; tx_s = s;
      start = 1; @(posedge clk); #1; start = 0;
      repeat(200) @(posedge clk); #1;
    endtask

  Fundamental invariant after every transfer:
    rx_m      === tx_s  (master received what slave sent)
    last_rx_s === tx_m  (slave received what master sent)

  Test cases to implement:
    TC-LOOP-01: do_loopback(8'hAB, 8'hC3) — check rx_m === 8'hC3
    TC-LOOP-02: same transfer — check last_rx_s === 8'hAB
    TC-LOOP-03: do_loopback(8'hDE, 8'hAD) — check rx_m AND last_rx_s
    TC-LOOP-04: do_loopback(8'hFF, 8'h00) — all-ones vs all-zeros

  Common mistakes:
    Setting tx_s after start — slave pre-loads on CS_N fall, not on start
    Reading rx_m before repeat(200) finishes — wait for the full window
    Checking rx_s instead of last_rx_s — rx_s is only valid while rx_valid_s pulses`,
      design:
`\`timescale 1ns/1ps
// Build module tb here. The DUT (spi_loopback, which contains spi_master and
// spi_slave_fd) is pre-loaded in the Testbench tab.
// Drive: clk, rst, start, tx_m[7:0], tx_s[7:0]
// Read:  rx_m[7:0], rx_s[7:0], rx_valid_s, done, busy
// See the hint for the design notes.
module tb;
endmodule
`,
      testbench:
`// ── Reference DUTs (do not edit) ────────────────────────────────────────────
// spi_master, spi_slave_fd, and spi_loopback are all compiled here.
// Your module tb in the Code tab instantiates spi_loopback.

module spi_master (
  input  logic       clk, rst, start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;
    if (rst) begin
      busy    <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_data;
      bit_cnt  <= 0;
      phase    <= 2'd3;
    end else if (busy) begin
      phase <= phase + 1;
      unique case (phase)
        2'd0: begin sclk_r <= 1; rx_shift <= {rx_shift[6:0], miso}; end
        2'd1: ;
        2'd2: begin
          sclk_r <= 0;
          if (bit_cnt == 3'd7) begin
            cs_n    <= 1;
            rx_data <= {rx_shift[6:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[6:0], 1'b0};
          end
        end
        2'd3: ;
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];
endmodule

module spi_slave_fd (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  input  logic [7:0] tx_data,
  output logic       miso,
  output logic [7:0] rx_data,
  output logic       rx_valid
);
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt;
  logic       sclk_prev, sclk_rise, sclk_fall;
  logic       cs_n_prev, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;

  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  always_ff @(posedge clk) begin
    if (rst || cs_n) begin
      shift_reg <= 8'b0;
      bit_cnt   <= 3'd0;
      rx_valid  <= 1'b0;
    end else begin
      if (cs_n_fall) tx_shift <= tx_data;
      if (sclk_rise) begin
        shift_reg <= {shift_reg[6:0], mosi};
        if (bit_cnt == 3'd7) begin
          rx_data  <= {shift_reg[6:0], mosi};
          rx_valid <= 1'b1;
          bit_cnt  <= 3'd0;
        end else begin
          bit_cnt  <= bit_cnt + 1;
          rx_valid <= 1'b0;
        end
      end else begin
        rx_valid <= 1'b0;
      end
      if (sclk_fall) tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule

module spi_loopback (
  input  logic       clk, rst,
  input  logic       start,
  input  logic [7:0] tx_m,
  input  logic [7:0] tx_s,
  output logic [7:0] rx_m,
  output logic [7:0] rx_s,
  output logic       rx_valid_s,
  output logic       busy, done
);
  logic mosi_w, sclk_w, cs_n_w, miso_w;

  spi_master master_inst (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_m), .miso(miso_w),
    .mosi(mosi_w), .sclk(sclk_w), .cs_n(cs_n_w),
    .busy(busy), .done(done), .rx_data(rx_m)
  );

  spi_slave_fd slave_inst (
    .clk(clk), .rst(rst),
    .cs_n(cs_n_w), .sclk(sclk_w), .mosi(mosi_w),
    .tx_data(tx_s),
    .miso(miso_w),
    .rx_data(rx_s), .rx_valid(rx_valid_s)
  );
endmodule`,
      expected: [
        'PASS  TC-LOOP-01',
        'PASS  TC-LOOP-02',
        'PASS  TC-LOOP-03',
        'Loopback testbench complete.'
      ]
    }

  ] // end lessons
});
