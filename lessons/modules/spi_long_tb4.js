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
  <tr><td>8th rising edge</td><td>Latch <code>rx_byte</code>; pulse <code>rx_valid</code> for 1 cycle</td></tr>
  <tr><td>Falling SCK edge</td><td>Shift <code>tx_shift</code> left; MISO shows next bit</td></tr>
  <tr><td>CS goes high</td><td>Preload <code>tx_shift</code> again for next transaction</td></tr>
</table>

<h3>Full-Duplex Shift Registers</h3>
<pre class="code-block">assign miso = ~cs_n ? tx_shift[7] : 1'bz;
rx_shift &lt;= {rx_shift[6:0], mosi};      // on rising SCK
tx_shift &lt;= {tx_shift[6:0], 1'b0};     // on falling SCK</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave with ports: clk, rst_n, cs_n, sck, mosi (inputs); miso (output logic); tx_byte[7:0] (input); rx_byte[7:0], rx_valid (outputs)',
        'Declare: sck_prev, rising_edge, falling_edge, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]',
        'Register sck_prev on posedge clk with async rst_n; derive rising_edge and falling_edge',
        'Assign miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'In always_ff: default rx_valid<=0; when cs_n high: reset bit_cnt, preload tx_shift<=tx_byte',
        'On rising_edge: shift rx_shift; when bit_cnt==7 latch rx_byte, set rx_valid, reset bit_cnt',
        'On falling_edge: tx_shift <= {tx_shift[6:0], 1\'b0}',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_slave (
  input  logic       clk, rst_n, cs_n, sck, mosi,
  output logic       miso,
  input  logic [7:0] tx_byte,
  output logic [7:0] rx_byte,
  output logic       rx_valid
);
  logic       sck_prev, rising_edge, falling_edge;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  always_ff @(posedge clk or negedge rst_n)
    if (!rst_n) sck_prev <= 1'b0;
    else        sck_prev <= sck;

  assign rising_edge  = sck  & ~sck_prev;
  assign falling_edge = ~sck &  sck_prev;
  assign miso         = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      bit_cnt <= 0; rx_shift <= 0; tx_shift <= 0; rx_byte <= 0; rx_valid <= 0;
    end else begin
      rx_valid <= 0;
      if (cs_n) begin bit_cnt <= 0; tx_shift <= tx_byte; end
      else begin
        if (rising_edge) begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt == 3'd7) begin
            rx_byte <= {rx_shift[6:0], mosi}; rx_valid <= 1; bit_cnt <= 0;
          end else bit_cnt <= bit_cnt + 3'd1;
        end
        if (falling_edge) tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
  end
endmodule`,

      design:
`// Build the spi_slave module here.
// Ports: clk, rst_n, cs_n, sck, mosi (in); miso (out); tx_byte[7:0] (in); rx_byte[7:0], rx_valid (out)
// Internal: sck_prev, rising_edge, falling_edge, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;
  logic       rst_n, cs_n = 1, sck = 0, mosi = 0;
  wire        miso;
  logic [7:0] tx_byte = 0, rx_byte;
  logic       rx_valid;

  spi_slave dut (.clk(clk),.rst_n(rst_n),.cs_n(cs_n),.sck(sck),.mosi(mosi),
                 .miso(miso),.tx_byte(tx_byte),.rx_byte(rx_byte),.rx_valid(rx_valid));

  task automatic send_recv(input logic [7:0] d, output logic [7:0] mc);
    integer i; mc = 0;
    for (i=7; i>=0; i--) begin
      mosi = d[i]; @(posedge clk); #1;
      sck = 1; @(posedge clk); #1; mc[i] = miso;
      sck = 0; @(posedge clk); #1;
    end
  endtask

  logic [7:0] mc;
  initial begin
    $display("=== SPI Slave Model Test ===");
    rst_n=0; repeat(2) @(posedge clk); #1; rst_n=1; repeat(2) @(posedge clk); #1;
    cs_n=0; tx_byte=8'hA5; @(posedge clk); #1;
    send_recv(8'h55, mc); @(posedge clk); #1; cs_n=1; @(posedge clk); #1;
    if (rx_byte===8'h55) $display("PASS  rx_byte=0x55");
    else                  $display("FAIL  rx_byte=%0h", rx_byte);
    if (mc===8'hA5)       $display("PASS  miso_out=0xa5");
    else                  $display("FAIL  miso_out=%0h", mc);
    cs_n=0; tx_byte=8'h55; @(posedge clk); #1;
    send_recv(8'hAA, mc); @(posedge clk); #1; cs_n=1; @(posedge clk); #1;
    if (rx_byte===8'hAA) $display("PASS  rx_byte=0xaa");
    else                  $display("FAIL  rx_byte=%0h", rx_byte);
    if (mc===8'h55)       $display("PASS  miso_echo=0x55");
    else                  $display("FAIL  miso_echo=%0h", mc);
    $display("SPI slave model works!"); $finish;
  end
endmodule`,

      expected: ['PASS  rx_byte=0x55','PASS  miso_out=0xa5','PASS  rx_byte=0xaa','SPI slave model works!']
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
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCK idle</th><th>Sample edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>low</td><td>rising</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>low</td><td>falling</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>high</td><td>falling</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>high</td><td>rising</td></tr>
</table>
<p>Pattern: sample on <strong>rising</strong> when CPOL&nbsp;==&nbsp;CPHA; sample on <strong>falling</strong> when CPOL&nbsp;&ne;&nbsp;CPHA.</p>
<pre class="code-block">assign sample_on_rising = ~(mode[1] ^ mode[0]);   // CPOL == CPHA
assign do_sample = sample_on_rising ? rising_edge  : falling_edge;
assign do_launch = sample_on_rising ? falling_edge : rising_edge;</pre>

<h3>Multi-Word Burst</h3>
<p>Hold CS low across multiple 8-bit words. After each 8th sample edge, the slave
latches <code>rx_byte</code>, pulses <code>rx_valid</code>, and resets <code>bit_cnt</code> to 0.
The next word starts immediately — no CS toggle needed.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_v2 adding input logic [1:0] mode to L1 ports',
        'Derive sample_on_rising = ~(mode[1] ^ mode[0])',
        'Derive do_sample = sample_on_rising ? rising_edge : falling_edge; and do_launch = sample_on_rising ? falling_edge : rising_edge',
        'Replace rising_edge with do_sample and falling_edge with do_launch in the always_ff body',
        'Everything else identical to L1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines should appear',
      ],

      hint:
`module spi_slave_v2 (
  input  logic       clk, rst_n,
  input  logic [1:0] mode,      // {cpol,cpha}: 00=M0 01=M1 10=M2 11=M3
  input  logic       cs_n, sck, mosi,
  output logic       miso,
  input  logic [7:0] tx_byte,
  output logic [7:0] rx_byte,
  output logic       rx_valid
);
  logic sck_prev, rising_edge, falling_edge;
  logic sample_on_rising, do_sample, do_launch;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  always_ff @(posedge clk or negedge rst_n)
    if (!rst_n) sck_prev <= 0; else sck_prev <= sck;

  assign rising_edge      = sck  & ~sck_prev;
  assign falling_edge     = ~sck &  sck_prev;
  assign sample_on_rising = ~(mode[1] ^ mode[0]);   // sample on rising when CPOL==CPHA
  assign do_sample        = sample_on_rising ? rising_edge  : falling_edge;
  assign do_launch        = sample_on_rising ? falling_edge : rising_edge;
  assign miso             = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      bit_cnt<=0; rx_shift<=0; tx_shift<=0; rx_byte<=0; rx_valid<=0;
    end else begin
      rx_valid <= 0;
      if (cs_n) begin bit_cnt<=0; tx_shift<=tx_byte; end
      else begin
        if (do_sample) begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt==3'd7) begin
            rx_byte<={rx_shift[6:0],mosi}; rx_valid<=1; bit_cnt<=0;
          end else bit_cnt<=bit_cnt+3'd1;
        end
        if (do_launch) tx_shift<={tx_shift[6:0],1'b0};
      end
    end
  end
endmodule`,

      design:
`// Build spi_slave_v2. Same as L1 spi_slave but add:
//   input logic [1:0] mode
//   logic sample_on_rising = ~(mode[1] ^ mode[0])
//   logic do_sample, do_launch
// Replace rising_edge/falling_edge with do_sample/do_launch in the always_ff body.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;
  logic [1:0] mode = 0;
  logic       rst_n, cs_n=1, sck=0, mosi=0;
  wire        miso;
  logic [7:0] tx_byte=0, rx_byte;
  logic       rx_valid;

  spi_slave_v2 dut (.clk(clk),.rst_n(rst_n),.mode(mode),.cs_n(cs_n),
                    .sck(sck),.mosi(mosi),.miso(miso),
                    .tx_byte(tx_byte),.rx_byte(rx_byte),.rx_valid(rx_valid));

  task automatic send_word(input logic [1:0] m, input logic [7:0] d, output logic [7:0] rd);
    integer i; logic cpol; cpol=m[1]; rd=0;
    sck=cpol; @(posedge clk); #1;
    for (i=7; i>=0; i--) begin
      mosi=d[i]; @(posedge clk); #1;
      sck=~cpol; @(posedge clk); #1;
      sck=cpol;  @(posedge clk); #1;
    end
    rd=rx_byte;
  endtask

  logic [7:0] got, b0, b1;
  initial begin
    $display("=== SPI Mode x Width Test ===");
    rst_n=0; repeat(2) @(posedge clk); #1; rst_n=1; repeat(2) @(posedge clk); #1;

    mode=2'b00; cs_n=0; tx_byte=0; @(posedge clk); #1;
    send_word(2'b00,8'hA5,got); cs_n=1; @(posedge clk); #1;
    if (got===8'hA5) $display("PASS  rx_mode0=0xa5"); else $display("FAIL  rx_mode0=%0h",got);

    mode=2'b01; cs_n=0; @(posedge clk); #1;
    send_word(2'b01,8'h5A,got); cs_n=1; @(posedge clk); #1;
    if (got===8'h5A) $display("PASS  rx_mode1=0x5a"); else $display("FAIL  rx_mode1=%0h",got);

    mode=2'b10; cs_n=0; @(posedge clk); #1;
    send_word(2'b10,8'hC3,got); cs_n=1; @(posedge clk); #1;
    if (got===8'hC3) $display("PASS  rx_mode2=0xc3"); else $display("FAIL  rx_mode2=%0h",got);

    mode=2'b11; cs_n=0; @(posedge clk); #1;
    send_word(2'b11,8'h3C,got); cs_n=1; @(posedge clk); #1;
    if (got===8'h3C) $display("PASS  rx_mode3=0x3c"); else $display("FAIL  rx_mode3=%0h",got);

    // 16-bit burst: two words, CS stays low
    mode=2'b00; cs_n=0; @(posedge clk); #1;
    send_word(2'b00,8'hDE,b0);
    send_word(2'b00,8'hAD,b1);
    cs_n=1; @(posedge clk); #1;
    if (b0===8'hDE) $display("PASS  burst_byte0=0xde"); else $display("FAIL  burst_byte0=%0h",b0);
    if (b1===8'hAD) $display("PASS  burst_byte1=0xad"); else $display("FAIL  burst_byte1=%0h",b1);

    $display("All modes and widths verified!"); $finish;
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
    },

    {
      id: 'spi_long_tb4l3',
      title: 'L3 — Performance Calculation',
      theory: `<h2>Measuring SPI Throughput</h2>
<p>After months of building the SPI master, here is a question that matters in production:
<em>how fast does it actually go?</em> Throughput is easy to state in theory but tricky to measure:
every CS pre-delay, SCK half-period, and post-delay costs time.
A performance counter captures the truth automatically.</p>

<h3>The Throughput Formula</h3>
<p>SPI theoretical peak = SCK frequency. But real transactions pay CS overhead:</p>
<pre class="code-block">// total_cycles = pre_delay + N_bits * SCK_period_clks + post_delay
// efficiency (%) = (N_bits * SCK_period_clks * 100) / total_cycles

// Example: 8 bits, SCK_period=2 clks, pre=0, post=0
// total = 8 * 2 = 16 clocks  →  efficiency = 100%

// With 5-cycle pre-delay:
// total = 5 + 16 = 21 clocks  →  efficiency = (16*100)/21 = 76%</pre>

<h3>Performance Monitor Design</h3>
<p>The monitor watches <code>cs_n</code> and <code>sck</code> with system-clock edge detectors:</p>
<table class="truth-table">
  <tr><th>Event</th><th>Monitor Action</th></tr>
  <tr><td>CS asserts (cs_n 1&rarr;0)</td><td>Reset running counters <code>sck_cnt</code> and <code>cyc_cnt</code></td></tr>
  <tr><td>CS active, each system clock</td><td><code>cyc_cnt++</code>; if rising SCK: <code>sck_cnt++</code></td></tr>
  <tr><td>CS de-asserts (cs_n 0&rarr;1)</td><td>Latch <code>sck_count &lt;= sck_cnt</code>, <code>cycle_count &lt;= cyc_cnt</code>; pulse <code>done</code></td></tr>
</table>

<h3>Efficiency Computation in the Testbench</h3>
<pre class="code-block">// SCK_period = 2 system clocks in this testbench
integer sck_int, cyc_int, eff;
sck_int = sck_count;
cyc_int = cycle_count;
eff = (sck_int * 200) / cyc_int;   // 200 = SCK_period * 100
$display("efficiency = %0d%%", eff);</pre>

<h3>Module You Will Build</h3>
<p>Module: <code>spi_perf_monitor</code><br>
Inputs: <code>clk, rst_n, cs_n, sck</code><br>
Outputs: <code>sck_count[15:0], cycle_count[15:0], done</code><br>
Internal: <code>cs_n_prev, sck_prev</code> (edge detection); <code>sck_cnt, cyc_cnt</code> (running counters)</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_perf_monitor with inputs clk, rst_n, cs_n, sck and outputs sck_count[15:0], cycle_count[15:0], done',
        'Declare: cs_n_prev, sck_prev (logic); sck_cnt[15:0], cyc_cnt[15:0] (running counters)',
        'In always_ff: update cs_n_prev <= cs_n and sck_prev <= sck every cycle; default done <= 0',
        'CS assert branch (cs_n_prev=1, cs_n=0): reset sck_cnt and cyc_cnt to 0',
        'CS active branch (~cs_n): cyc_cnt += 1; if (sck & ~sck_prev): sck_cnt += 1',
        'CS de-assert branch (~cs_n_prev & cs_n): latch sck_count=sck_cnt, cycle_count=cyc_cnt; done=1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_perf_monitor (
  input  logic        clk,
  input  logic        rst_n,
  input  logic        cs_n,
  input  logic        sck,
  output logic [15:0] sck_count,
  output logic [15:0] cycle_count,
  output logic        done
);
  logic cs_n_prev, sck_prev;
  logic [15:0] sck_cnt, cyc_cnt;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      cs_n_prev<=1; sck_prev<=0; sck_cnt<=0; cyc_cnt<=0;
      sck_count<=0; cycle_count<=0; done<=0;
    end else begin
      cs_n_prev <= cs_n;
      sck_prev  <= sck;
      done      <= 0;

      if (cs_n_prev & ~cs_n) begin          // CS just asserted: reset
        sck_cnt <= 0;
        cyc_cnt <= 0;
      end else if (~cs_n) begin             // CS active: count
        cyc_cnt <= cyc_cnt + 16'd1;
        if (sck & ~sck_prev)
          sck_cnt <= sck_cnt + 16'd1;
      end else if (~cs_n_prev & cs_n) begin // CS just de-asserted: latch
        sck_count   <= sck_cnt;
        cycle_count <= cyc_cnt;
        done        <= 1;
      end
    end
  end
endmodule`,

      design:
`// Build the spi_perf_monitor module here. See Theory for the spec.
//
// Inputs:  clk, rst_n, cs_n, sck
// Outputs: sck_count [15:0], cycle_count [15:0], done
// Internal: cs_n_prev, sck_prev, sck_cnt [15:0], cyc_cnt [15:0]
//
// Three phases:
//   1. CS asserts  (cs_n_prev=1, cs_n=0) → reset sck_cnt, cyc_cnt
//   2. CS active   (~cs_n)               → cyc_cnt++; if rising SCK: sck_cnt++
//   3. CS de-assert(~cs_n_prev, cs_n=1)  → latch both counts, done=1
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst_n;
  logic        cs_n = 1;
  logic        sck  = 0;
  logic [15:0] sck_count;
  logic [15:0] cycle_count;
  logic        done;

  spi_perf_monitor dut (
    .clk(clk), .rst_n(rst_n),
    .cs_n(cs_n), .sck(sck),
    .sck_count(sck_count),
    .cycle_count(cycle_count),
    .done(done)
  );

  integer i, sck_int, cyc_int, eff;

  initial begin
    $display("=== SPI Performance Monitor Test ===");
    rst_n = 0; repeat(2) @(posedge clk); #1;
    rst_n = 1; repeat(2) @(posedge clk); #1;

    // Test 1: zero overhead, SCK_period=2 clks, 8 bits = 16 cycles theoretical
    $display("--- Test 1: no CS overhead ---");
    cs_n = 0; sck = 0;
    @(posedge clk); #1;             // CS assert detected; counters reset
    for (i = 7; i >= 0; i--) begin
      sck = 1; @(posedge clk); #1;  // rising SCK edge
      sck = 0; @(posedge clk); #1;  // falling SCK edge
    end
    cs_n = 1;
    @(posedge clk); #1;             // de-assert detected; counts latched
    @(posedge clk); #1;             // outputs stable

    if (sck_count === 16'd8)
      $display("PASS  sck_count=8");
    else
      $display("FAIL  sck_count=%0d (expected 8)", sck_count);

    sck_int = sck_count;
    cyc_int = cycle_count;
    eff = (sck_int * 200) / cyc_int;   // *200 because SCK_period=2
    if (eff >= 95)
      $display("PASS  efficiency=%0d%%", eff);
    else
      $display("FAIL  efficiency=%0d%% (expected >= 95)", eff);

    // Test 2: 5-cycle pre-delay — efficiency should drop to ~76%
    $display("--- Test 2: 5-cycle pre-delay ---");
    cs_n = 0; sck = 0;
    @(posedge clk); #1;             // CS assert
    repeat(5) @(posedge clk); #1;  // pre-delay overhead
    for (i = 7; i >= 0; i--) begin
      sck = 1; @(posedge clk); #1;
      sck = 0; @(posedge clk); #1;
    end
    cs_n = 1;
    @(posedge clk); #1;
    @(posedge clk); #1;

    if (sck_count === 16'd8)
      $display("PASS  sck_count_t2=8");
    else
      $display("FAIL  sck_count_t2=%0d (expected 8)", sck_count);

    sck_int = sck_count;
    cyc_int = cycle_count;
    eff = (sck_int * 200) / cyc_int;
    if (eff >= 50)
      $display("PASS  efficiency_t2=%0d%%", eff);
    else
      $display("FAIL  efficiency_t2=%0d%% (expected >= 50)", eff);

    $display("Performance monitor verified!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  sck_count=8',
        'PASS  efficiency=100%',
        'PASS  sck_count_t2=8',
        'Performance monitor verified!'
      ]
    }
  ]
});
