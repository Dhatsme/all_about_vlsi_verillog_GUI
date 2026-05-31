(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi3',
  title: 'SPI Slave Design',
  icon: '📥',
  level: 'intermediate',
  lessons: [

    // ─── L1: SPI Slave Receiver (Tier 3 — structural guidance) ──────────────
    {
      id: 'spi3l1',
      title: 'L1 — SPI Slave Receiver',
      theory: `
<h2>The Other Side of the Bus</h2>
<p>So far you have built the master — the device that controls SCLK and initiates
every transaction. Now switch perspectives: you are the <strong>slave</strong>.
The slave does not own the clock. It waits, watches for CS_N to fall, then samples
MOSI on every SCLK rising edge until it has received a full byte.</p>

<p>The good news: you already have every piece you need.
The slave receiver is essentially spi1 L1 (SIPO) combined with spi1 L3 (byte counter),
wired together with one extra output — <code>rx_valid</code> — that pulses when the byte
is complete and ready to be read by the rest of the system.</p>

<h3>Slave vs master: what changes</h3>
<ul>
  <li>The slave does <strong>not</strong> generate SCLK — it is driven by the master</li>
  <li>The slave uses edge detection (<code>sclk_prev</code> pattern) to respond to SCLK</li>
  <li>The slave watches <code>cs_n</code>: when LOW the slave listens; when HIGH it ignores the bus</li>
  <li>The slave signals "byte ready" with a one-cycle <code>rx_valid</code> pulse on the 8th edge</li>
</ul>

<h3>Combining SIPO + byte counter in one module</h3>
<p>On each SCLK rising edge, two things happen simultaneously in one <code>always_ff</code> block:</p>
<ol>
  <li>Shift the new MOSI bit into <code>shift_reg</code>: <code>{shift_reg[6:0], mosi}</code></li>
  <li>Check if <code>bit_cnt</code> has reached 7 — if so, latch <code>rx_data</code> and pulse <code>rx_valid</code></li>
</ol>

<pre class="code-block">// On every SCLK rising edge (inside the busy=1 state)
shift_reg &lt;= {shift_reg[6:0], mosi};   // SIPO shift
if (bit_cnt == 3'd7) begin
  rx_data  &lt;= {shift_reg[6:0], mosi};  // latch completed byte
  rx_valid &lt;= 1'b1;                    // pulse valid for one clock
  bit_cnt  &lt;= 3'd0;
end else begin
  bit_cnt  &lt;= bit_cnt + 1;
  rx_valid &lt;= 1'b0;
end
</pre>

<p>Notice that <code>rx_data</code> uses <code>{shift_reg[6:0], mosi}</code> — not just <code>shift_reg</code>.
This is because <code>shift_reg</code> on that same clock has not finished updating yet
(non-blocking assignment rules). Including <code>mosi</code> directly captures the
8th bit without waiting an extra cycle.</p>

<h3>Transaction timeline</h3>
<table class="truth-table">
<tr><th>cs_n</th><th>SCLK edge</th><th>bit_cnt</th><th>rx_valid</th><th>rx_data</th></tr>
<tr><td>1→0</td><td>—</td><td>reset to 0</td><td>0</td><td>unchanged</td></tr>
<tr><td>0</td><td>↑ (1st–7th)</td><td>0→6</td><td>0</td><td>unchanged</td></tr>
<tr><td>0</td><td>↑ (8th)</td><td>7→0</td><td>1 (pulse)</td><td>updated ✓</td></tr>
<tr><td>0→1</td><td>—</td><td>reset to 0</td><td>0</td><td>holds</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>1</td><td>System clock — slave runs on its own clock</td></tr>
<tr><td>rst</td><td>in</td><td>1</td><td>Active-high synchronous reset</td></tr>
<tr><td>cs_n</td><td>in</td><td>1</td><td>Chip Select — slave listens only when LOW</td></tr>
<tr><td>sclk</td><td>in</td><td>1</td><td>SPI clock from master — sampled, not used as clock</td></tr>
<tr><td>mosi</td><td>in</td><td>1</td><td>Serial data from master — MSB arrives first</td></tr>
<tr><td>rx_data</td><td>out</td><td>8</td><td>Assembled parallel byte — valid when rx_valid=1</td></tr>
<tr><td>rx_valid</td><td>out</td><td>1</td><td>One-cycle pulse after 8th SCLK edge</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_rx with ports: clk, rst, cs_n, sclk, mosi, rx_data[7:0], rx_valid',
        'Declare internal signals: shift_reg[7:0], bit_cnt[2:0], sclk_prev, sclk_rise',
        'Write the always_ff for edge detection: sclk_prev <= sclk',
        'Write the assign: sclk_rise = sclk & ~sclk_prev',
        'Write the main always_ff block with this priority:',
        '  — rst or cs_n: clear shift_reg, bit_cnt, rx_valid; rx_data holds its value',
        '  — sclk_rise and bit_cnt==7: shift MOSI in, latch rx_data, pulse rx_valid=1, reset bit_cnt',
        '  — sclk_rise otherwise: shift MOSI in, increment bit_cnt, clear rx_valid',
        '  — else: clear rx_valid only',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_slave_rx (
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
        rx_data  <= {shift_reg[6:0], mosi};  // capture all 8 bits
        rx_valid <= 1'b1;
        bit_cnt  <= 3'd0;
      end else begin
        bit_cnt  <= bit_cnt + 1;
        rx_valid <= 1'b0;
      end
    end else begin
      rx_valid <= 1'b0;   // pulse only — clear every non-edge cycle
    end
  end

endmodule`,
      design:
`// Type the spi_slave_rx module here. See Theory for the concept.
//
// Ports: clk, rst, cs_n, sclk, mosi, rx_data[7:0], rx_valid
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;   // fast system clock

  logic       rst, cs_n, sclk, mosi;
  logic [7:0] rx_data;
  logic       rx_valid;

  spi_slave_rx dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .mosi(mosi),
    .rx_data(rx_data), .rx_valid(rx_valid)
  );

  // Latch rx_data when rx_valid fires
  logic [7:0] saved_rx;
  always_ff @(posedge clk) begin
    if (rx_valid) saved_rx <= rx_data;
  end

  // Drive one SPI bit: set MOSI, pulse SCLK high then low
  task automatic spi_bit(input logic b);
    mosi = b;
    sclk = 0; repeat(4) @(posedge clk); #1;
    sclk = 1; repeat(4) @(posedge clk); #1;
  endtask

  // Send a full byte MSB first — 8 unrolled spi_bit calls
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
    $display("=== SPI Slave Receiver Test ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    spi_send_byte(8'hA5);
    if (saved_rx === 8'hA5)
      $display("PASS  received 0xA5 with rx_valid pulse");
    else
      $display("FAIL  saved_rx=0x%02h expected 0xA5", saved_rx);

    spi_send_byte(8'h37);
    if (saved_rx === 8'h37)
      $display("PASS  received 0x37 with rx_valid pulse");
    else
      $display("FAIL  saved_rx=0x%02h expected 0x37", saved_rx);

    cs_n = 1; repeat(2) @(posedge clk); #1;
    if (rx_valid === 1'b0)
      $display("PASS  cs_n deassert clears rx_valid");
    else
      $display("FAIL  rx_valid still high after cs_n deassert");

    $display("SPI slave receiver works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  received 0xA5 with rx_valid pulse',
        'PASS  received 0x37 with rx_valid pulse',
        'PASS  cs_n deassert clears rx_valid',
        'SPI slave receiver works!'
      ]
    },

    // ─── L2: Full-Duplex SPI Slave (Tier 4 — behaviour spec) ────────────────
    {
      id: 'spi3l2',
      title: 'L2 — Full-Duplex SPI Slave',
      theory: `
<h2>Simultaneous TX and RX — Full-Duplex</h2>
<p>The slave receiver (L1) only listens. A real SPI slave also <em>talks back</em> at the same time —
it drives MISO with its own data while the master drives MOSI.
Both sides are shifting simultaneously on the same SCLK.
This is called <strong>full-duplex</strong> operation and it is what makes SPI so efficient
compared to protocols like I2C where only one side speaks at a time.</p>

<h3>The pre-load problem</h3>
<p>There is a timing challenge: the slave must start driving MISO <em>before</em> the first
SCLK edge arrives, because the master samples MISO on the very first rising edge.
The solution is to pre-load the TX shift register when CS_N falls — the exact moment
the master is about to start the transaction.</p>

<pre class="code-block">// Detect the falling edge of CS_N
always_ff @(posedge clk) cs_n_prev &lt;= cs_n;
assign cs_n_fall = ~cs_n &amp; cs_n_prev;   // one clock when CS_N goes low

// Pre-load tx_shift when CS_N falls
if (cs_n_fall) tx_shift &lt;= tx_data;
</pre>

<h3>TX shift register — shifting on SCLK falling edge</h3>
<p>The slave shifts its transmit register on the <strong>falling</strong> edge of SCLK (Mode 0).
This means a new bit is presented on MISO while SCLK is low — giving the master
plenty of setup time before the next rising edge when it samples.</p>

<pre class="code-block">// MISO timing: shift on fall, master samples on rise
if (sclk_fall) tx_shift &lt;= {tx_shift[6:0], 1'b0};   // shift left, pad 0
assign miso = cs_n ? 1'b0 : tx_shift[7];             // MSB always on MISO
</pre>

<p><strong>Never use <code>1'bz</code></strong> (tri-state) for MISO when idle.
Tri-state is not synthesisable on most FPGAs and Verilator does not support it.
Drive <code>1'b0</code> when CS_N is deasserted — the master ignores the bus anyway.</p>

<h3>Full timing diagram — one bit</h3>
<table class="truth-table">
<tr><th>Phase</th><th>SCLK</th><th>Slave drives MISO</th><th>Slave samples MOSI</th></tr>
<tr><td>CS_N falls</td><td>—</td><td>tx_data[7] pre-loaded</td><td>—</td></tr>
<tr><td>Low (setup)</td><td>0</td><td>tx_shift[7] stable</td><td>—</td></tr>
<tr><td>Rising edge</td><td>↑</td><td>—</td><td>MOSI → shift_reg</td></tr>
<tr><td>High (hold)</td><td>1</td><td>tx_shift[7] still</td><td>—</td></tr>
<tr><td>Falling edge</td><td>↓</td><td>tx_shift shifts — next bit ready</td><td>—</td></tr>
</table>

<h3>Everything to add on top of spi_slave_rx</h3>
<ul>
  <li><strong>New input:</strong> <code>tx_data[7:0]</code> — the byte the slave wants to send</li>
  <li><strong>New output:</strong> <code>miso</code> — serial data to master</li>
  <li><strong>New internal:</strong> <code>tx_shift[7:0]</code>, <code>cs_n_prev</code>, <code>cs_n_fall</code>, <code>sclk_fall</code></li>
  <li><strong>Pre-load:</strong> <code>tx_shift &lt;= tx_data</code> on <code>cs_n_fall</code></li>
  <li><strong>TX shift:</strong> <code>tx_shift &lt;= {tx_shift[6:0], 1'b0}</code> on <code>sclk_fall</code></li>
  <li><strong>MISO assign:</strong> <code>assign miso = cs_n ? 1'b0 : tx_shift[7]</code></li>
</ul>

<p>You can fold the TX logic into the same <code>always_ff</code> block as the RX logic —
they run in parallel because they react to different edges (rise vs fall).</p>

<p>This one takes careful thought — work through the timing table above with a specific
byte before writing code. That is completely normal for dual-edge logic.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build it. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Start with the spi_slave_rx design from L1 — you will extend it',
        'Add input tx_data[7:0] to the port list',
        'Add output miso to the port list',
        'Declare new internal signals: tx_shift[7:0], cs_n_prev, cs_n_fall, sclk_fall',
        'Add always_ff to register cs_n_prev <= cs_n',
        'Add assigns: cs_n_fall = ~cs_n & cs_n_prev  and  sclk_fall = ~sclk & sclk_prev',
        'In the main always_ff block: on cs_n_fall, load tx_shift <= tx_data',
        'On sclk_fall: shift tx_shift left, pad 1\'b0 at LSB',
        'Add assign miso = cs_n ? 1\'b0 : tx_shift[7]   — never use 1\'bz',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_slave_fd (
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
      // Pre-load TX on CS_N falling edge
      if (cs_n_fall) tx_shift <= tx_data;

      // RX — sample MOSI on rising edge
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

      // TX — shift MISO on falling edge
      if (sclk_fall) tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  // Drive MISO from MSB — never tri-state
  assign miso = cs_n ? 1'b0 : tx_shift[7];

endmodule`,
      design:
`// Build the spi_slave_fd module here. See Theory for the spec.
//
// Ports: clk, rst, cs_n, sclk, mosi, tx_data[7:0],
//        miso, rx_data[7:0], rx_valid
//
// Delete this comment and start typing:
`,
      testbench:
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

  // Send 8 bits and simultaneously capture 8 MISO bits — unrolled
  task automatic spi_xfer(
    input  logic [7:0] tx,
    output logic [7:0] rx
  );
    cs_n = 0; repeat(2) @(posedge clk); #1;
    // bit 7
    mosi = tx[7]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[7] = miso;
    // bit 6
    mosi = tx[6]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[6] = miso;
    // bit 5
    mosi = tx[5]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[5] = miso;
    // bit 4
    mosi = tx[4]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[4] = miso;
    // bit 3
    mosi = tx[3]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[3] = miso;
    // bit 2
    mosi = tx[2]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[2] = miso;
    // bit 1
    mosi = tx[1]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[1] = miso;
    // bit 0
    mosi = tx[0]; sclk = 0; repeat(4) @(posedge clk); #1;
                  sclk = 1; repeat(4) @(posedge clk); #1; rx[0] = miso;
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] miso_captured;

  initial begin
    $display("=== Full-Duplex SPI Slave Test ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0; tx_data = 8'hBE;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Transfer 1: send 0x5A, expect 0xBE back on MISO
    tx_data = 8'hBE;
    spi_xfer(8'h5A, miso_captured);

    if (miso_captured === 8'hBE)
      $display("PASS  MISO returned 0xBE (slave tx_data)");
    else
      $display("FAIL  MISO=0x%02h expected 0xBE", miso_captured);

    if (saved_rx === 8'h5A)
      $display("PASS  slave received 0x5A on MOSI");
    else
      $display("FAIL  slave rx=0x%02h expected 0x5A", saved_rx);

    // Transfer 2: send 0x00, expect 0xF0 on MISO
    tx_data = 8'hF0;
    spi_xfer(8'h00, miso_captured);

    if (miso_captured === 8'hF0)
      $display("PASS  MISO returned 0xF0 on second transfer");
    else
      $display("FAIL  MISO=0x%02h expected 0xF0", miso_captured);

    $display("Full-duplex slave works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  MISO returned 0xBE (slave tx_data)',
        'PASS  slave received 0x5A on MOSI',
        'PASS  MISO returned 0xF0 on second transfer',
        'Full-duplex slave works!'
      ]
    },

    // ─── L3: Portfolio — SPI Loopback System (Tier 5) ───────────────────────
    {
      id: 'spi3l3',
      title: 'L3 — Portfolio: SPI Master-Slave Loopback System',
      theory: `
<h2>Putting It All Together: A Complete SPI System</h2>
<p>You have now built both sides of SPI separately: a master (spi2 L2) and a full-duplex slave (spi3 L2).
This lesson connects them into a working system — a top-level module that instantiates both and wires
the SPI bus between them. This is how real hardware systems are assembled from verified IP blocks.</p>

<p>The technique is called <strong>module instantiation</strong>: you declare instances of previously
built modules and connect their ports with named wires.
You used this in msv3 (ripple adder chaining full adders) — it is the same idea but at the system level.</p>

<h3>The loopback topology</h3>
<p>In a loopback, the master and slave share the same bus signals. What the master sends on MOSI,
the slave receives on its MOSI. What the slave puts on MISO, the master reads on its MISO.
At the end of a transfer:</p>
<ul>
  <li><strong>Master rx_data</strong> = whatever the slave had in tx_data</li>
  <li><strong>Slave rx_data</strong> = whatever the master sent in tx_data</li>
</ul>
<p>A loopback is the standard first test for any SPI implementation — it verifies both sides simultaneously.</p>

<h3>Wiring diagram</h3>
<pre class="code-block">        spi_master                    spi_slave_fd
       ┌──────────┐                  ┌─────────────┐
start→ │          │── mosi_w ───────→│ mosi        │
       │          │── sclk_w ───────→│ sclk        │
       │          │── cs_n_w ───────→│ cs_n        │
       │  miso ←──│←── miso_w ──────│ miso        │
       │ rx_data  │                  │ rx_data     │→ rx_s
       │   done   │                  │ rx_valid    │
       └──────────┘                  └─────────────┘
         ↑ tx_m                         ↑ tx_s
</pre>

<h3>MISO pull-down — no tri-state</h3>
<p>When CS_N is deasserted, no device should be driving MISO.
Do <strong>not</strong> leave MISO floating and do <strong>not</strong> use <code>1'bz</code>.
The slave already handles this: its MISO output is <code>1'b0</code> when CS_N is high.
In your top module simply connect the slave's miso output directly to the master's miso input —
the pull-down is built into the slave.</p>

<h3>Common mistakes to avoid</h3>
<ul>
  <li><strong>Not pre-loading tx_s before start:</strong> set <code>tx_s</code> at least one clock before
  asserting <code>start</code> so the slave has it ready when CS_N falls</li>
  <li><strong>Connecting wrong signals:</strong> master MOSI → slave MOSI (not MISO); double-check every wire</li>
  <li><strong>Checking done too early:</strong> wait for <code>done</code> to pulse before reading <code>rx_m</code></li>
</ul>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>Shared system clock and reset</td></tr>
<tr><td>start</td><td>in</td><td>Pulse to begin a transfer</td></tr>
<tr><td>tx_m[7:0]</td><td>in</td><td>Byte the master sends to the slave</td></tr>
<tr><td>tx_s[7:0]</td><td>in</td><td>Byte the slave sends back to the master</td></tr>
<tr><td>rx_m[7:0]</td><td>out</td><td>What the master received (= tx_s)</td></tr>
<tr><td>rx_s[7:0]</td><td>out</td><td>What the slave received (= tx_m)</td></tr>
<tr><td>rx_valid_s</td><td>out</td><td>Pulses when slave has a complete byte</td></tr>
<tr><td>busy</td><td>out</td><td>HIGH while transfer in progress</td></tr>
<tr><td>done</td><td>out</td><td>One-cycle pulse when master finishes</td></tr>
</table>

<p>🎓 <strong>Portfolio piece</strong> — push this to your GitHub when complete. A working SPI loopback
is a strong addition to a hardware portfolio.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build it. See 💡 Show Hint for the wiring guide.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_loopback with the ports listed in the Theory port table',
        'Declare internal wires (logic): mosi_w, sclk_w, cs_n_w, miso_w',
        'Instantiate spi_master — connect tx_data=tx_m, all bus signals to internal wires',
        'Instantiate spi_slave_fd — connect tx_data=tx_s, rx_data=rx_s, all bus signals to same wires',
        'Connect master miso input to slave miso output (the slave drives it LOW when cs_n=1)',
        'Expose rx_m, rx_s, rx_valid_s, busy, done at the top-level ports',
        'Set tx_s before asserting start so the slave pre-loads correctly',
        '🎓 Portfolio piece — push this to your GitHub when complete',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines and the final message should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for spi_loopback

Internal bus wires (all logic):
  mosi_w   — connects master mosi → slave mosi
  sclk_w   — connects master sclk → slave sclk
  cs_n_w   — connects master cs_n → slave cs_n
  miso_w   — connects slave miso → master miso

Instantiation skeleton:
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

No additional logic needed — the master and slave handle all timing internally.

Testbench tip:
  Set tx_m and tx_s BEFORE asserting start.
  After do_loopback(), check: rx_m === tx_s  and  last_rx_s === tx_m`,
      design:
`// Build the spi_loopback module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, busy, done, rx_valid_s;
  logic [7:0] tx_m, tx_s, rx_m, rx_s;

  spi_loopback dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_m(tx_m), .tx_s(tx_s),
    .rx_m(rx_m), .rx_s(rx_s),
    .rx_valid_s(rx_valid_s), .busy(busy), .done(done)
  );

  logic [7:0] last_rx_s;
  always_ff @(posedge clk) begin
    if (rx_valid_s) last_rx_s <= rx_s;
  end

  task automatic do_loopback(input logic [7:0] m, input logic [7:0] s);
    tx_m = m; tx_s = s; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Loopback System Test ===");
    rst = 1; start = 0; tx_m = 0; tx_s = 0;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    // Transfer 1: master sends 0xAB, slave sends 0xC3
    do_loopback(8'hAB, 8'hC3);
    if (rx_m === 8'hC3)
      $display("PASS  master received 0xC3 from slave");
    else
      $display("FAIL  rx_m=0x%02h expected 0xC3", rx_m);

    if (last_rx_s === 8'hAB)
      $display("PASS  slave received 0xAB from master");
    else
      $display("FAIL  last_rx_s=0x%02h expected 0xAB", last_rx_s);

    // Transfer 2: master sends 0xDE, slave sends 0xAD
    do_loopback(8'hDE, 8'hAD);
    if (rx_m === 8'hAD)
      $display("PASS  master received 0xAD from slave");
    else
      $display("FAIL  rx_m=0x%02h expected 0xAD", rx_m);

    $display("SPI loopback system works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  master received 0xC3 from slave',
        'PASS  slave received 0xAB from master',
        'PASS  master received 0xAD from slave',
        'SPI loopback system works!'
      ]
    }

  ] // end lessons
});
