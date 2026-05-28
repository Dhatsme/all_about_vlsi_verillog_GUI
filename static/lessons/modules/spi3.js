(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi3',
  title: 'SPI Slave Design',
  icon: '📥',
  level: 'intermediate',
  lessons: [

    // ─── L1: SPI Slave Receiver (Tier 3) ────────────────────────────────────
    {
      id: 'spi3l1',
      title: 'L1 — SPI Slave Receiver',
      theory: `
<h2>The Other Side of the Bus — Building a Slave</h2>
<p>You built the master; now build what it talks to.
An SPI slave has no clock of its own — it reacts to the master's SCLK and CS_N signals.
In Mode 0 the slave samples MOSI on every rising SCLK edge and shifts data into a register.
After 8 edges it has received a complete byte and asserts <code>rx_valid</code> for one cycle.</p>

<p>Because the slave runs from the <em>system clock</em> (not SCLK directly), it must use
the edge-detection pattern from Module 1 to catch each SCLK rising edge precisely.</p>

<pre class="code-block">// Shift MOSI into register on each SCLK rising edge
if (sclk_rise) begin
  shift_reg &lt;= {shift_reg[6:0], mosi};   // LSB gets newest bit
  if (bit_cnt == 3'd7) begin
    rx_data  &lt;= {shift_reg[6:0], mosi};  // save complete byte
    rx_valid &lt;= 1'b1;
  end
end
</pre>

<h3>Transaction timeline</h3>
<table class="truth-table">
<tr><th>cs_n</th><th>SCLK edge</th><th>bit_cnt</th><th>rx_valid</th></tr>
<tr><td>1→0</td><td>—</td><td>reset to 0</td><td>0</td></tr>
<tr><td>0</td><td>↑ (1st)</td><td>0→1</td><td>0</td></tr>
<tr><td>0</td><td>↑ (7th)</td><td>6→7</td><td>0</td></tr>
<tr><td>0</td><td>↑ (8th)</td><td>7→0</td><td>1 (pulse)</td></tr>
<tr><td>0→1</td><td>—</td><td>reset to 0</td><td>0</td></tr>
</table>

<h3>Ports</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>System clock and reset</td></tr>
<tr><td>cs_n</td><td>in</td><td>Chip Select active-low from master</td></tr>
<tr><td>sclk</td><td>in</td><td>SPI clock from master</td></tr>
<tr><td>mosi</td><td>in</td><td>Serial data from master</td></tr>
<tr><td>rx_data[7:0]</td><td>out</td><td>Complete byte when rx_valid=1</td></tr>
<tr><td>rx_valid</td><td>out</td><td>Pulses for one clock when byte is ready</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_rx with ports: clk, rst, cs_n, sclk, mosi, rx_data[7:0], rx_valid',
        'Declare internals: shift_reg[7:0], bit_cnt[2:0], sclk_prev (for edge detection)',
        'Register sclk_prev <= sclk in one always_ff block',
        'Assign sclk_rise = sclk & ~sclk_prev',
        'Write the main always_ff block:',
        '  — on rst or cs_n: clear shift_reg, bit_cnt, rx_valid',
        '  — on sclk_rise: shift MOSI into shift_reg, increment bit_cnt',
        '  — when bit_cnt rolls from 7 to 0: latch rx_data and pulse rx_valid=1',
        '  — else clear rx_valid (it only stays high one cycle)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_slave_rx (
  input  logic       clk,
  input  logic       rst,
  input  logic       cs_n,
  input  logic       sclk,
  input  logic       mosi,
  output logic [7:0] rx_data,
  output logic       rx_valid
);

  logic [7:0] shift_reg;
  logic [2:0] bit_cnt;
  logic       sclk_prev;
  logic       sclk_rise;

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
        bit_cnt  <= 3'd0;
        rx_data  <= {shift_reg[6:0], mosi};
        rx_valid <= 1'b1;
      end else begin
        bit_cnt  <= bit_cnt + 1;
        rx_valid <= 1'b0;
      end
    end else begin
      rx_valid <= 1'b0;
    end
  end

endmodule`,
      design:
`// Type the spi_slave_rx module here. See Theory for the concept.
//
// Ports: clk, rst, cs_n, sclk, mosi, rx_data[7:0], rx_valid
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;   // fast system clock

  logic rst, cs_n, sclk, mosi;
  logic [7:0] rx_data;
  logic rx_valid;

  spi_slave_rx dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .mosi(mosi),
    .rx_data(rx_data), .rx_valid(rx_valid)
  );

  // Send one SPI byte MSB first, Mode 0
  task automatic spi_send_byte(input logic [7:0] data);
    cs_n = 0;
    mosi = data[7]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[6]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[5]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[4]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[3]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[2]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[1]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = data[0]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(2) @(posedge clk); #1;
  endtask

  logic [7:0] saved_rx;
  logic       saw_valid;

  // Monitor rx_valid in background
  always_ff @(posedge clk) begin
    if (rx_valid) begin
      saved_rx  <= rx_data;
      saw_valid <= 1;
    end
  end

  initial begin
    $display("=== SPI Slave Receiver Test ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0; saw_valid = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    spi_send_byte(8'hA5);
    repeat(4) @(posedge clk); #1;
    if (saved_rx === 8'hA5 && saw_valid)
      $display("PASS  received 0xA5 with rx_valid pulse");
    else
      $display("FAIL  got 0x%02h valid=%0b expected 0xA5", saved_rx, saw_valid);

    saw_valid = 0;
    spi_send_byte(8'h37);
    repeat(4) @(posedge clk); #1;
    if (saved_rx === 8'h37 && saw_valid)
      $display("PASS  received 0x37 with rx_valid pulse");
    else
      $display("FAIL  got 0x%02h valid=%0b expected 0x37", saved_rx, saw_valid);

    // Verify cs_n=1 resets the slave
    cs_n = 0; sclk = 0;
    repeat(3) begin
      sclk = 1; repeat(4) @(posedge clk); #1;
      sclk = 0; repeat(4) @(posedge clk); #1;
    end
    cs_n = 1; repeat(2) @(posedge clk); #1;
    if (rx_valid === 1'b0)
      $display("PASS  cs_n deassert clears rx_valid");
    else
      $display("FAIL  rx_valid not cleared on cs_n deassert");

    $display("SPI slave receiver works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  received 0xA5',
        'PASS  received 0x37',
        'PASS  cs_n deassert clears',
        'SPI slave receiver works!'
      ]
    },

    // ─── L2: Full-Duplex SPI Slave (Tier 4) ─────────────────────────────────
    {
      id: 'spi3l2',
      title: 'L2 — Full-Duplex SPI Slave',
      theory: `
<h2>Two-Way Traffic: Receiving and Sending Simultaneously</h2>
<p>Real SPI is full-duplex: every clock cycle the master sends a bit on MOSI
<em>and</em> the slave sends a bit back on MISO.
To extend the slave receiver you need a second shift register that holds the byte
the slave wants to return.</p>

<p>The slave must <strong>pre-load</strong> its transmit register when CS_N falls,
then shift out the MSB first on each SCLK cycle.
In Mode 0 the slave drives MISO on the SCLK <em>falling</em> edge (so it is stable when the master
samples on the rising edge).</p>

<pre class="code-block">// On CS_N assert: load the response byte
if (cs_n_fall) tx_shift &lt;= tx_data;

// On SCLK falling edge: shift MISO output
else if (sclk_fall) tx_shift &lt;= {tx_shift[6:0], 1'b0};

assign miso = cs_n ? 1'b0 : tx_shift[7];  // drive 0 when not selected
</pre>

<h3>Timing across one bit period (Mode 0)</h3>
<table class="truth-table">
<tr><th>Phase</th><th>SCLK</th><th>Slave drives MISO</th><th>Slave samples MOSI</th></tr>
<tr><td>Low (setup)</td><td>0</td><td>tx_shift[7] (stable)</td><td>—</td></tr>
<tr><td>Rising</td><td>↑</td><td>—</td><td>MOSI → shift_reg</td></tr>
<tr><td>High</td><td>1</td><td>tx_shift[7] (still)</td><td>—</td></tr>
<tr><td>Falling</td><td>↓</td><td>next bit ready</td><td>—</td></tr>
</table>

<h3>Additional ports</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>tx_data[7:0]</td><td>in</td><td>Byte to send to master (loaded on CS_N assert)</td></tr>
<tr><td>miso</td><td>out</td><td>Serial output to master</td></tr>
<tr><td>rx_data, rx_valid</td><td>out</td><td>Same as spi_slave_rx</td></tr>
</table>

<p>This one takes a few tries to get the TX/RX timing balanced — that is completely normal.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Start from spi_slave_rx and add these inputs/outputs: tx_data[7:0] input, miso output',
        'Declare additional internals: tx_shift[7:0], cs_n_prev, sclk_fall',
        'Register cs_n_prev <= cs_n alongside sclk_prev',
        'Derive cs_n_fall = ~cs_n & cs_n_prev (falling edge strobe)',
        'Derive sclk_fall = ~sclk & sclk_prev (falling edge strobe)',
        'In the main always_ff: on cs_n_fall, load tx_data into tx_shift',
        'On sclk_fall: shift tx_shift left with 1\'b0 at LSB (MSB exits on miso)',
        'Add: assign miso = cs_n ? 1\'b0 : tx_shift[7]   (drive 0 when inactive — no tri-state needed)',
        'Keep all the RX logic from spi_slave_rx unchanged',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_slave_fd (
  input  logic       clk,
  input  logic       rst,
  input  logic       cs_n,
  input  logic       sclk,
  input  logic       mosi,
  input  logic [7:0] tx_data,    // pre-loaded response byte
  output logic       miso,       // serial output to master
  output logic [7:0] rx_data,
  output logic       rx_valid
);

  logic [7:0] rx_shift, tx_shift;
  logic [2:0] bit_cnt;
  logic       sclk_prev, cs_n_prev;
  logic       sclk_rise, sclk_fall, cs_n_fall;

  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end

  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk & sclk_prev;
  assign cs_n_fall = ~cs_n & cs_n_prev;

  always_ff @(posedge clk) begin
    if (rst || cs_n) begin
      rx_shift <= 8'b0;
      bit_cnt  <= 3'd0;
      rx_valid <= 1'b0;
    end else begin
      // Pre-load TX on CS_N assert
      if (cs_n_fall) tx_shift <= tx_data;

      // RX path: sample MOSI on rising edge
      if (sclk_rise) begin
        rx_shift <= {rx_shift[6:0], mosi};
        if (bit_cnt == 3'd7) begin
          bit_cnt  <= 3'd0;
          rx_data  <= {rx_shift[6:0], mosi};
          rx_valid <= 1'b1;
        end else begin
          bit_cnt  <= bit_cnt + 1;
          rx_valid <= 1'b0;
        end
      end else begin
        rx_valid <= 1'b0;
      end

      // TX path: shift MISO on falling edge
      if (sclk_fall) tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];

endmodule`,
      design:
`// Type the spi_slave_fd module here. See Theory for the concept.
//
// Ports: clk, rst, cs_n, sclk, mosi, tx_data[7:0],
//        miso, rx_data[7:0], rx_valid
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic rst, cs_n, sclk, mosi;
  logic [7:0] tx_data, rx_data;
  logic miso, rx_valid;

  spi_slave_fd dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .mosi(mosi), .tx_data(tx_data),
    .miso(miso), .rx_data(rx_data), .rx_valid(rx_valid)
  );

  logic [7:0] miso_captured;
  logic [7:0] saved_rx;
  logic       saw_valid;

  // Full-duplex transfer: send data, capture MISO simultaneously
  task automatic spi_xfer(
    input  logic [7:0] send,
    output logic [7:0] recv_miso
  );
    cs_n = 0; repeat(3) @(posedge clk); #1;
    recv_miso = 8'h00;
    mosi = send[7]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[7] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[6]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[6] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[5]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[5] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[4]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[4] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[3]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[3] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[2]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[2] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[1]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[1] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = send[0]; sclk = 0; repeat(4) @(posedge clk); #1; recv_miso[0] = miso; sclk = 1; repeat(4) @(posedge clk); #1;
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(2) @(posedge clk); #1;
  endtask

  always_ff @(posedge clk) begin
    if (rx_valid) begin
      saved_rx  <= rx_data;
      saw_valid <= 1;
    end
  end

  initial begin
    $display("=== SPI Full-Duplex Slave Test ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0;
    tx_data = 8'hBE; saw_valid = 0; saved_rx = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Master sends 0x5A; slave should return 0xBE
    spi_xfer(8'h5A, miso_captured);
    repeat(4) @(posedge clk); #1;

    if (miso_captured === 8'hBE)
      $display("PASS  MISO returned 0xBE (slave tx_data)");
    else
      $display("FAIL  MISO captured 0x%02h expected 0xBE", miso_captured);

    if (saved_rx === 8'h5A && saw_valid)
      $display("PASS  slave received 0x5A on MOSI");
    else
      $display("FAIL  slave RX 0x%02h valid=%0b expected 0x5A", saved_rx, saw_valid);

    // Second transfer with new tx_data
    saw_valid = 0; tx_data = 8'hF0;
    spi_xfer(8'hCC, miso_captured);
    repeat(4) @(posedge clk); #1;

    if (miso_captured === 8'hF0)
      $display("PASS  MISO returned 0xF0 on second transfer");
    else
      $display("FAIL  second transfer MISO 0x%02h expected 0xF0", miso_captured);

    $display("Full-duplex slave works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  MISO returned 0xBE',
        'PASS  slave received 0x5A on MOSI',
        'PASS  MISO returned 0xF0',
        'Full-duplex slave works!'
      ]
    },

    // ─── L3: Portfolio — SPI Master-Slave Loopback (Tier 5) ─────────────────
    {
      id: 'spi3l3',
      title: 'L3 — Portfolio: SPI Master-Slave Loopback System',
      theory: `
<h2>Portfolio Project: Connecting Master and Slave</h2>
<p>You now have a working SPI master (<code>spi_master</code>) and a full-duplex slave (<code>spi_slave_fd</code>).
This project connects them in a single top-level module and runs an end-to-end loopback test.
Wiring two independently designed IPs together and verifying they interoperate is exactly
the kind of integration work done on real chip teams.</p>

<h3>System block diagram</h3>
<pre class="code-block">         ┌───────────────┐        ┌───────────────┐
start ──&gt;│               │─SCLK──&gt;│               │
tx_m[7:0]│  spi_master   │─MOSI──&gt;│  spi_slave_fd │
         │               │&lt;─MISO─│               │──&gt; rx_s[7:0]
         │               │─CS_N──&gt;│               │──&gt; rx_valid_s
tx_s[7:0]│               │        │               │
done ───&lt;│               │        │               │
rx_m[7:0]│               │        │               │
         └───────────────┘        └───────────────┘
</pre>

<h3>Full specification</h3>
<ul>
  <li>Top module name: <code>spi_loopback</code></li>
  <li>Instantiate <code>spi_master</code> and <code>spi_slave_fd</code> as sub-modules</li>
  <li>Wire: master.mosi → slave.mosi, master.sclk → slave.sclk, master.cs_n → slave.cs_n, slave.miso → master.miso</li>
  <li>Expose to top-level: start, tx_m, tx_s, done, rx_m (from master), rx_s, rx_valid_s (from slave)</li>
  <li>Your testbench must verify: (a) master rx_data equals slave tx_data; (b) slave rx_data equals master tx_data</li>
  <li>Run at least 4 different data patterns</li>
</ul>

<h3>Things that can go wrong</h3>
<ul>
  <li>Slave not pre-loaded before first SCLK — add a CS_N setup time</li>
  <li>MISO high-Z causing X propagation — add a pull-down on MISO when cs_n=1</li>
  <li>Off-by-one in bit count — trace SCLK edges carefully</li>
</ul>

<p>When this simulation passes, you have a verified SPI subsystem. That is something worth showing.</p>
`,
      tasks: [
        'Design spi_loopback top module that instantiates spi_master and spi_slave_fd',
        'Wire the four SPI signals (SCLK, MOSI, MISO, CS_N) between master and slave',
        'Handle MISO tri-state: pull down to 0 when cs_n=1 to prevent X propagation',
        'Expose inputs: clk, rst, start, tx_m[7:0], tx_s[7:0]',
        'Expose outputs: done, rx_m[7:0], rx_s[7:0], rx_valid_s, busy',
        'Write a testbench that sends 4 different pattern pairs',
        'Verify master rx_m equals slave tx_s for each transfer',
        'Verify slave rx_s equals master tx_m for each transfer',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
        '🎓 Portfolio piece — push this to your GitHub when complete',
      ],
      hint:
`DESIGN NOTES for spi_loopback:

  Sub-module wiring:
    wire sclk_w, mosi_w, miso_w, cs_n_w;

    spi_master master_inst (
      .clk(clk), .rst(rst), .start(start),
      .tx_data(tx_m), .miso(miso_w),
      .mosi(mosi_w), .sclk(sclk_w), .cs_n(cs_n_w),
      .busy(busy), .rx_data(rx_m), .done(done)
    );

    spi_slave_fd slave_inst (
      .clk(clk), .rst(rst),
      .cs_n(cs_n_w), .sclk(sclk_w),
      .mosi(mosi_w), .tx_data(tx_s),
      .miso(miso_w_out), .rx_data(rx_s), .rx_valid(rx_valid_s)
    );

    // MISO: slave drives when selected, pull to 0 otherwise
    assign miso_w = cs_n_w ? 1'b0 : miso_w_out;

  Testbench patterns to try:
    Pattern 1: tx_m = 0xAB, tx_s = 0xCD
    Pattern 2: tx_m = 0xFF, tx_s = 0x00
    Pattern 3: tx_m = 0x5A, tx_s = 0xA5  (bit-reversed)
    Pattern 4: tx_m = 0x12, tx_s = 0x34

  Common mistake: tx_s is sampled when CS_N asserts.
  If you change tx_s AFTER cs_n goes low the slave sees the old value.
  Always set tx_s before asserting start.`,
      design:
`// Build the spi_loopback top module here. See Theory for the spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, start, busy, done, rx_valid_s;
  logic [7:0] tx_m, tx_s, rx_m, rx_s;

  spi_loopback dut (
    .clk(clk), .rst(rst),
    .start(start), .tx_m(tx_m), .tx_s(tx_s),
    .done(done), .rx_m(rx_m), .rx_s(rx_s),
    .rx_valid_s(rx_valid_s), .busy(busy)
  );

  logic [7:0] last_rx_s;
  always_ff @(posedge clk)
    if (rx_valid_s) last_rx_s <= rx_s;

  task automatic do_loopback(
    input  logic [7:0] master_data,
    input  logic [7:0] slave_response
  );
    tx_m = master_data; tx_s = slave_response;
    start = 1; @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Master-Slave Loopback Test ===");
    rst = 1; start = 0; tx_m = 0; tx_s = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    do_loopback(8'hAB, 8'hCD);
    repeat(4) @(posedge clk); #1;
    if (rx_m === 8'hCD && last_rx_s === 8'hAB)
      $display("PASS  loopback 0xAB<->0xCD");
    else
      $display("FAIL  rx_m=0x%02h rx_s=0x%02h", rx_m, last_rx_s);

    do_loopback(8'h5A, 8'hA5);
    repeat(4) @(posedge clk); #1;
    if (rx_m === 8'hA5 && last_rx_s === 8'h5A)
      $display("PASS  loopback 0x5A<->0xA5");
    else
      $display("FAIL  rx_m=0x%02h rx_s=0x%02h", rx_m, last_rx_s);

    $display("SPI loopback system works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  loopback 0xAB<->0xCD',
        'PASS  loopback 0x5A<->0xA5',
        'SPI loopback system works!'
      ]
    }

  ] // end lessons
});
