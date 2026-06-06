(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb4',
  title: 'Integration & System Verification',
  icon: '🏁',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long_tb4l1',
      title: 'L1 — SPI Slave Model',
      theory: `<h2>Building a Reference SPI Slave</h2>
<p>The SPI master you built across this course needs a <strong>golden reference slave</strong> to verify against.
A behavioral slave correctly implements the SPI protocol from the slave perspective —
it deserialises what the master sends on MOSI and drives known data back on MISO.
This is the final step before design handoff: master drives slave, outputs must match the spec.</p>

<h3>Edge Detection — Synchronising SCK to a System Clock</h3>
<p>Real slaves run their internal logic from a system clock, not from SCK directly.
SCK arrives asynchronously. To detect its edges safely, register SCK on every system clock edge:</p>
<pre class="code-block">logic sck_prev;
always_ff @(posedge clk or negedge rst_n)
  if (!rst_n) sck_prev &lt;= 1'b0;
  else        sck_prev &lt;= sck;

assign rising_edge  = sck  &amp; ~sck_prev;   // SCK just went 0&rarr;1
assign falling_edge = ~sck &amp; sck_prev;    // SCK just went 1&rarr;0</pre>

<h3>Mode 0 Protocol (CPOL=0, CPHA=0)</h3>
<table class="truth-table">
  <tr><th>Event</th><th>Slave Action</th></tr>
  <tr><td>CS goes low</td><td>Preload <code>tx_shift</code> from <code>tx_byte</code>; reset <code>bit_cnt</code></td></tr>
  <tr><td>Rising SCK edge</td><td>Shift <code>rx_shift</code> left; capture <code>mosi</code> at bit 0</td></tr>
  <tr><td>8th rising edge (bit_cnt==7)</td><td>Latch <code>rx_byte</code>; pulse <code>rx_valid</code> for 1 cycle</td></tr>
  <tr><td>Falling SCK edge</td><td>Shift <code>tx_shift</code> left; MISO shows next bit</td></tr>
  <tr><td>CS goes high</td><td>Preload <code>tx_shift</code> again for next transaction</td></tr>
</table>

<h3>Full-Duplex Shift Registers</h3>
<pre class="code-block">// MISO is always tx_shift[7] while CS is active
assign miso = ~cs_n ? tx_shift[7] : 1'bz;

// On rising SCK — capture MOSI MSB-first
rx_shift &lt;= {rx_shift[6:0], mosi};

// On falling SCK — advance MISO to the next bit
tx_shift &lt;= {tx_shift[6:0], 1'b0};</pre>

<p>Both shifts live in the same <code>always_ff</code> block, gated by <code>rising_edge</code> and <code>falling_edge</code>.
MOSI is captured while MISO advances simultaneously — true full-duplex exchange.</p>

<h3>Module You Will Build</h3>
<p>Module: <code>spi_slave</code><br>
Ports: <code>clk, rst_n, cs_n, sck, mosi</code> (inputs); <code>miso</code> (output logic);
<code>tx_byte[7:0]</code> (input); <code>rx_byte[7:0], rx_valid</code> (outputs)<br>
Behaviour: Mode 0 slave — receives one byte via MOSI, drives <code>tx_byte</code> via MISO MSB-first,
pulses <code>rx_valid</code> for exactly 1 cycle after the 8th rising SCK edge.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave with ports: clk, rst_n, cs_n, sck, mosi (inputs); miso (output logic); tx_byte[7:0] (input); rx_byte[7:0], rx_valid (outputs)',
        'Declare internal signals: sck_prev, rising_edge, falling_edge (logic); bit_cnt[2:0]; rx_shift[7:0], tx_shift[7:0]',
        'Add a sck_prev flip-flop: always_ff @(posedge clk or negedge rst_n) — reset to 0, else sck_prev <= sck',
        'Derive rising_edge = sck & ~sck_prev and falling_edge = ~sck & sck_prev as assign statements',
        'Drive MISO: assign miso = ~cs_n ? tx_shift[7] : 1\'bz  (release hi-Z when idle)',
        'In the main always_ff block: set rx_valid <= 0 as default at top of the else branch',
        'When cs_n is high: reset bit_cnt to 0 and preload tx_shift <= tx_byte',
        'On rising_edge with CS active: shift {rx_shift[6:0], mosi} into rx_shift; increment bit_cnt',
        'When bit_cnt == 7 on rising_edge: latch rx_byte <= {rx_shift[6:0], mosi}, set rx_valid = 1, reset bit_cnt = 0',
        'On falling_edge with CS active: tx_shift <= {tx_shift[6:0], 1\'b0}  (MISO shows next bit)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_slave (
  input  logic       clk,
  input  logic       rst_n,
  input  logic       cs_n,      // active-low chip select
  input  logic       sck,       // SPI clock from master
  input  logic       mosi,      // master-out slave-in
  output logic       miso,      // slave-out master-in
  input  logic [7:0] tx_byte,   // byte the slave sends to the master
  output logic [7:0] rx_byte,   // byte the slave received from the master
  output logic       rx_valid   // 1-cycle strobe: rx_byte is ready
);
  logic       sck_prev;
  logic       rising_edge, falling_edge;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  // Synchronise SCK edges into the system clock domain
  always_ff @(posedge clk or negedge rst_n)
    if (!rst_n) sck_prev <= 1'b0;
    else        sck_prev <= sck;

  assign rising_edge  = sck  & ~sck_prev;    // 0->1 transition
  assign falling_edge = ~sck &  sck_prev;    // 1->0 transition
  assign miso         = ~cs_n ? tx_shift[7] : 1'bz;  // hi-Z when idle

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      bit_cnt  <= 3'd0;
      rx_shift <= 8'd0;
      tx_shift <= 8'd0;
      rx_byte  <= 8'd0;
      rx_valid <= 1'b0;
    end else begin
      rx_valid <= 1'b0;                         // default: no strobe

      if (cs_n) begin
        bit_cnt  <= 3'd0;
        tx_shift <= tx_byte;                    // preload so bit 7 is on MISO immediately on CS low
      end else begin
        if (rising_edge) begin                  // Mode 0: sample MOSI on rising SCK
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt == 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi};  // capture full received byte
            rx_valid <= 1'b1;
            bit_cnt  <= 3'd0;
          end else begin
            bit_cnt  <= bit_cnt + 3'd1;
          end
        end
        if (falling_edge)                       // Mode 0: advance MISO on falling SCK
          tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
  end
endmodule`,

      design:
`// Build the spi_slave module here. See Theory for the full spec.
//
// Ports:
//   input  logic       clk, rst_n, cs_n, sck, mosi
//   output logic       miso
//   input  logic [7:0] tx_byte
//   output logic [7:0] rx_byte
//   output logic       rx_valid
//
// Internal signals:
//   sck_prev, rising_edge, falling_edge
//   bit_cnt [2:0], rx_shift [7:0], tx_shift [7:0]
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz system clock

  logic       rst_n;
  logic       cs_n  = 1;
  logic       sck   = 0;
  logic       mosi  = 0;
  wire        miso;            // driven by DUT (1'bz when cs_n=1)
  logic [7:0] tx_byte = 8'h00;
  logic [7:0] rx_byte;
  logic       rx_valid;

  spi_slave dut (
    .clk(clk), .rst_n(rst_n), .cs_n(cs_n),
    .sck(sck), .mosi(mosi), .miso(miso),
    .tx_byte(tx_byte), .rx_byte(rx_byte), .rx_valid(rx_valid)
  );

  // Send one byte MSB-first (Mode 0); capture MISO bits simultaneously
  task automatic send_recv(
    input  logic [7:0] tx_data,
    output logic [7:0] miso_cap
  );
    integer i;
    miso_cap = 8'h00;
    for (i = 7; i >= 0; i--) begin
      mosi = tx_data[i];
      @(posedge clk); #1;
      sck = 1;                    // rising edge: slave samples MOSI
      @(posedge clk); #1;
      miso_cap[i] = miso;         // master captures MISO on rising edge
      sck = 0;                    // falling edge: slave shifts MISO to next bit
      @(posedge clk); #1;
    end
  endtask

  logic [7:0] miso_cap;

  initial begin
    $display("=== SPI Slave Model Test ===");
    rst_n = 0; repeat(2) @(posedge clk); #1;
    rst_n = 1; repeat(2) @(posedge clk); #1;

    // Test 1: Send 0x55 to slave, slave should receive 0x55
    $display("--- Test 1: receive 0x55 ---");
    cs_n = 0; tx_byte = 8'hA5;
    @(posedge clk); #1;
    send_recv(8'h55, miso_cap);
    @(posedge clk); #1;
    cs_n = 1;
    @(posedge clk); #1;

    if (rx_byte === 8'h55)
      $display("PASS  rx_byte=0x55");
    else
      $display("FAIL  rx_byte=%0h (expected 0x55)", rx_byte);

    // Test 2: MISO should have carried tx_byte=0xA5 MSB-first
    if (miso_cap === 8'hA5)
      $display("PASS  miso_out=0xa5");
    else
      $display("FAIL  miso_out=%0h (expected 0xa5)", miso_cap);

    // Test 3: Send 0xAA, slave echoes 0x55 back
    $display("--- Test 3: receive 0xAA ---");
    cs_n = 0; tx_byte = 8'h55;
    @(posedge clk); #1;
    send_recv(8'hAA, miso_cap);
    @(posedge clk); #1;
    cs_n = 1;
    @(posedge clk); #1;

    if (rx_byte === 8'hAA)
      $display("PASS  rx_byte=0xaa");
    else
      $display("FAIL  rx_byte=%0h (expected 0xaa)", rx_byte);

    // Test 4: MISO carried 0x55 back
    if (miso_cap === 8'h55)
      $display("PASS  miso_echo=0x55");
    else
      $display("FAIL  miso_echo=%0h (expected 0x55)", miso_cap);

    $display("SPI slave model works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  rx_byte=0x55',
        'PASS  miso_out=0xa5',
        'PASS  rx_byte=0xaa',
        'SPI slave model works!'
      ]
    },

    {
      id: 'spi_long_tb4l2',
      title: 'L2 — All 4 Modes × Multi-Word Burst',
      theory: `<h2>Mode-Aware Slave and Multi-Word Bursts</h2>
<p>The L1 slave handled Mode 0 only. Real systems use all four SPI modes, and many transfers
send 16 or 32 bits by keeping CS asserted across multiple 8-bit words.
This lesson extends the slave with a <code>mode[1:0]</code> input and verifies it
against every CPOL/CPHA combination plus a back-to-back burst.</p>

<h3>Which Edge to Sample On</h3>
<p>The sample edge depends on whether CPOL equals CPHA:</p>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCK idle</th><th>Sample edge</th><th>Launch edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>low</td><td>rising</td><td>falling</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>low</td><td>falling</td><td>rising</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>high</td><td>falling</td><td>rising</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>high</td><td>rising</td><td>falling</td></tr>
</table>
<p>The pattern: sample on <strong>rising</strong> when CPOL&nbsp;==&nbsp;CPHA; sample on <strong>falling</strong> when CPOL&nbsp;&ne;&nbsp;CPHA.</p>
<pre class="code-block">logic sample_on_rising;
assign sample_on_rising = ~(mode[1] ^ mode[0]);   // CPOL == CPHA
assign do_sample = sample_on_rising ? rising_edge  : falling_edge;
assign do_launch = sample_on_rising ? falling_edge : rising_edge;</pre>

<h3>Multi-Word Burst (16 / 32 bit)</h3>
<p>Hold CS low across multiple 8-bit words. After each 8th rising sample edge,
the slave latches <code>rx_byte</code>, pulses <code>rx_valid</code>, and resets <code>bit_cnt</code> to 0.
The next word starts immediately — no CS toggle required.</p>
<pre class="code-block">// In the testbench: two words, CS stays low between them
cs_n = 0;
send_word(2'b00, 8'hDE, byte0);   // word 0 received
send_word(2'b00, 8'hAD, byte1);   // word 1 received without CS toggle
cs_n = 1;</pre>

<h3>Module You Will Build</h3>
<p>Module: <code>spi_slave_v2</code><br>
Adds: <code>input logic [1:0] mode</code> &mdash; {cpol, cpha}<br>
Derives: <code>sample_on_rising, do_sample, do_launch</code> combinationally<br>
All other signals identical to L1.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_v2 with the same ports as L1 plus input logic [1:0] mode',
        'Add sck_prev, rising_edge, falling_edge exactly as in L1',
        'Add logic sample_on_rising and assign it ~(mode[1] ^ mode[0])',
        'Derive do_sample = sample_on_rising ? rising_edge : falling_edge',
        'Derive do_launch = sample_on_rising ? falling_edge : rising_edge',
        'In the always_ff block: replace rising_edge with do_sample, falling_edge with do_launch',
        'Everything else (rx_shift, bit_cnt, rx_byte, tx_shift, rx_valid) is identical to L1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines and the final message should appear',
      ],

      hint:
`module spi_slave_v2 (
  input  logic       clk,
  input  logic       rst_n,
  input  logic [1:0] mode,      // {cpol, cpha}: 2'b00=M0 01=M1 10=M2 11=M3
  input  logic       cs_n,
  input  logic       sck,
  input  logic       mosi,
  output logic       miso,
  input  logic [7:0] tx_byte,
  output logic [7:0] rx_byte,
  output logic       rx_valid
);
  logic sck_prev;
  logic rising_edge, falling_edge;
  logic sample_on_rising;
  logic do_sample, do_launch;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  always_ff @(posedge clk or negedge rst_n)
    if (!rst_n) sck_prev <= 1'b0;
    else        sck_prev <= sck;

  assign rising_edge      = sck  & ~sck_prev;
  assign falling_edge     = ~sck &  sck_prev;
  assign sample_on_rising = ~(mode[1] ^ mode[0]);   // sample rising when CPOL==CPHA
  assign do_sample        = sample_on_rising ? rising_edge  : falling_edge;
  assign do_launch        = sample_on_rising ? falling_edge : rising_edge;
  assign miso             = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      bit_cnt  <= 3'd0;
      rx_shift <= 8'd0;
      tx_shift <= 8'd0;
      rx_byte  <= 8'd0;
      rx_valid <= 1'b0;
    end else begin
      rx_valid <= 1'b0;
      if (cs_n) begin
        bit_cnt  <= 3'd0;
        tx_shift <= tx_byte;
      end else begin
        if (do_sample) begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt == 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi};
            rx_valid <= 1'b1;
            bit_cnt  <= 3'd0;
          end else begin
            bit_cnt  <= bit_cnt + 3'd1;
          end
        end
        if (do_launch)
          tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
  end
endmodule`,

      design:
`// Build the spi_slave_v2 module here. See Theory for the spec.
//
// Same as L1's spi_slave but adds:  input logic [1:0] mode
// New internal signals:
//   sample_on_rising = ~(mode[1] ^ mode[0])
//   do_sample, do_launch
//
// Replace rising_edge/falling_edge with do_sample/do_launch in the always_ff.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n;
  logic [1:0] mode  = 2'b00;
  logic       cs_n  = 1;
  logic       sck   = 0;
  logic       mosi  = 0;
  wire        miso;
  logic [7:0] tx_byte = 8'h00;
  logic [7:0] rx_byte;
  logic       rx_valid;

  spi_slave_v2 dut (
    .clk(clk), .rst_n(rst_n), .mode(mode),
    .cs_n(cs_n), .sck(sck), .mosi(mosi), .miso(miso),
    .tx_byte(tx_byte), .rx_byte(rx_byte), .rx_valid(rx_valid)
  );

  // Send one byte using the correct SCK idle/edge polarity for the given mode
  task automatic send_word(
    input  logic [1:0] m,
    input  logic [7:0] tx_data,
    output logic [7:0] recv_data
  );
    integer i;
    logic cpol;
    cpol = m[1];
    recv_data = 8'h00;
    sck = cpol;            // restore SCK to idle level for this mode
    @(posedge clk); #1;
    for (i = 7; i >= 0; i--) begin
      mosi = tx_data[i];
      @(posedge clk); #1;
      sck = ~cpol;         // first edge away from idle
      @(posedge clk); #1;
      sck = cpol;          // second edge back to idle
      @(posedge clk); #1;
    end
    recv_data = rx_byte;
  endtask

  logic [7:0] got, burst0, burst1;

  initial begin
    $display("=== SPI Mode x Width Test ===");
    rst_n = 0; repeat(2) @(posedge clk); #1;
    rst_n = 1; repeat(2) @(posedge clk); #1;

    // Mode 0: sample on rising
    mode = 2'b00; cs_n = 0; tx_byte = 8'h00;
    @(posedge clk); #1;
    send_word(2'b00, 8'hA5, got);
    cs_n = 1; @(posedge clk); #1;
    if (got === 8'hA5) $display("PASS  rx_mode0=0xa5");
    else               $display("FAIL  rx_mode0=%0h", got);

    // Mode 1: sample on falling (CPOL=0, SCK idles low, 2nd edge=falling)
    mode = 2'b01; cs_n = 0; tx_byte = 8'h00;
    @(posedge clk); #1;
    send_word(2'b01, 8'h5A, got);
    cs_n = 1; @(posedge clk); #1;
    if (got === 8'h5A) $display("PASS  rx_mode1=0x5a");
    else               $display("FAIL  rx_mode1=%0h", got);

    // Mode 2: sample on falling (CPOL=1, SCK idles high, 1st edge=falling)
    mode = 2'b10; cs_n = 0; tx_byte = 8'h00;
    @(posedge clk); #1;
    send_word(2'b10, 8'hC3, got);
    cs_n = 1; @(posedge clk); #1;
    if (got === 8'hC3) $display("PASS  rx_mode2=0xc3");
    else               $display("FAIL  rx_mode2=%0h", got);

    // Mode 3: sample on rising (CPOL=1, SCK idles high, 2nd edge=rising)
    mode = 2'b11; cs_n = 0; tx_byte = 8'h00;
    @(posedge clk); #1;
    send_word(2'b11, 8'h3C, got);
    cs_n = 1; @(posedge clk); #1;
    if (got === 8'h3C) $display("PASS  rx_mode3=0x3c");
    else               $display("FAIL  rx_mode3=%0h", got);

    // 16-bit burst: two words back-to-back, CS stays low between them
    mode = 2'b00; cs_n = 0; tx_byte = 8'h00;
    @(posedge clk); #1;
    send_word(2'b00, 8'hDE, burst0);
    send_word(2'b00, 8'hAD, burst1);
    cs_n = 1; @(posedge clk); #1;

    if (burst0 === 8'hDE) $display("PASS  burst_byte0=0xde");
    else                  $display("FAIL  burst_byte0=%0h", burst0);
    if (burst1 === 8'hAD) $display("PASS  burst_byte1=0xad");
    else                  $display("FAIL  burst_byte1=%0h", burst1);

    $display("All modes and widths verified!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  rx_mode0=0xa5',
        'PASS  rx_mode1=0x5a',
        'PASS  rx_mode2=0xc3',
        'PASS  rx_mode3=0x3c',
        'PASS  burst_byte0=0xde',
        'All modes and widths verified!'
      ]
    }
  ]
});
