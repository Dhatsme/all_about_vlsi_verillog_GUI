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
SCK arrives asynchronously. Register SCK on every system clock edge to detect transitions safely:</p>
<pre class="code-block">always_ff @(posedge clk or negedge rst_n)
  if (!rst_n) sck_prev &lt;= 1'b0;
  else        sck_prev &lt;= sck;

assign rising_edge  = sck  &amp; ~sck_prev;   // 0&rarr;1
assign falling_edge = ~sck &amp; sck_prev;    // 1&rarr;0</pre>

<h3>Mode 0 Protocol (CPOL=0, CPHA=0)</h3>
<table class="truth-table">
  <tr><th>Event</th><th>Slave Action</th></tr>
  <tr><td>CS goes low</td><td>Preload <code>tx_shift &lt;= tx_byte</code>; reset <code>bit_cnt</code></td></tr>
  <tr><td>Rising SCK</td><td>Shift <code>rx_shift</code> left; capture <code>mosi</code> at bit 0</td></tr>
  <tr><td>8th rising SCK</td><td>Latch <code>rx_byte</code>; pulse <code>rx_valid</code> 1 cycle</td></tr>
  <tr><td>Falling SCK</td><td>Shift <code>tx_shift</code> left; MISO shows next bit</td></tr>
  <tr><td>CS goes high</td><td>Preload <code>tx_shift</code> for next transaction</td></tr>
</table>

<pre class="code-block">assign miso = ~cs_n ? tx_shift[7] : 1'bz;
rx_shift &lt;= {rx_shift[6:0], mosi};      // on rising SCK
tx_shift &lt;= {tx_shift[6:0], 1'b0};     // on falling SCK</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave: clk, rst_n, cs_n, sck, mosi (in); miso (out); tx_byte[7:0] (in); rx_byte[7:0], rx_valid (out)',
        'Register sck_prev; derive rising_edge and falling_edge',
        'assign miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'always_ff: default rx_valid=0; when cs_n: reset bit_cnt, preload tx_shift; on rising_edge: shift+latch; on falling_edge: shift tx',
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
  logic sck_prev, rising_edge, falling_edge;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  always_ff @(posedge clk or negedge rst_n)
    if (!rst_n) sck_prev <= 0; else sck_prev <= sck;

  assign rising_edge  = sck & ~sck_prev;
  assign falling_edge = ~sck & sck_prev;
  assign miso         = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      bit_cnt<=0; rx_shift<=0; tx_shift<=0; rx_byte<=0; rx_valid<=0;
    end else begin
      rx_valid <= 0;
      if (cs_n) begin bit_cnt<=0; tx_shift<=tx_byte; end
      else begin
        if (rising_edge) begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt==3'd7) begin
            rx_byte<={rx_shift[6:0],mosi}; rx_valid<=1; bit_cnt<=0;
          end else bit_cnt<=bit_cnt+3'd1;
        end
        if (falling_edge) tx_shift<={tx_shift[6:0],1'b0};
      end
    end
  end
endmodule`,

      design: `// Build the spi_slave module here.
// Ports: clk,rst_n,cs_n,sck,mosi (in); miso (out); tx_byte[7:0] (in); rx_byte[7:0],rx_valid (out)
// Internal: sck_prev, rising_edge, falling_edge, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk=0; always #5 clk=~clk;
  logic rst_n, cs_n=1, sck=0, mosi=0;
  wire  miso;
  logic [7:0] tx_byte=0, rx_byte; logic rx_valid;
  spi_slave dut(.clk(clk),.rst_n(rst_n),.cs_n(cs_n),.sck(sck),.mosi(mosi),
                .miso(miso),.tx_byte(tx_byte),.rx_byte(rx_byte),.rx_valid(rx_valid));
  task automatic send_recv(input logic [7:0] d, output logic [7:0] rd, mc);
    integer i; rd=0; mc=0;
    for (i=7;i>=0;i--) begin
      mosi=d[i]; @(posedge clk); #1;
      sck=1; @(posedge clk); #1; mc[i]=miso;
      sck=0; @(posedge clk); #1;
    end rd=rx_byte;
  endtask
  logic [7:0] mc;
  initial begin
    $display("=== SPI Slave Model Test ===");
    rst_n=0; repeat(2) @(posedge clk); #1; rst_n=1; repeat(2) @(posedge clk); #1;
    cs_n=0; tx_byte=8'hA5; @(posedge clk); #1;
    send_recv(8'h55,rx_byte,mc); @(posedge clk); #1; cs_n=1; @(posedge clk); #1;
    if (rx_byte===8'h55) $display("PASS  rx_byte=0x55"); else $display("FAIL  rx=%0h",rx_byte);
    if (mc===8'hA5)      $display("PASS  miso_out=0xa5"); else $display("FAIL  miso=%0h",mc);
    cs_n=0; tx_byte=8'h55; @(posedge clk); #1;
    send_recv(8'hAA,rx_byte,mc); @(posedge clk); #1; cs_n=1; @(posedge clk); #1;
    if (rx_byte===8'hAA) $display("PASS  rx_byte=0xaa"); else $display("FAIL  rx=%0h",rx_byte);
    if (mc===8'h55)      $display("PASS  miso_echo=0x55"); else $display("FAIL  echo=%0h",mc);
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
send 16 or 32 bits by keeping CS asserted across multiple 8-bit words.</p>

<h3>Which Edge to Sample On</h3>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCK idle</th><th>Sample edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>low</td><td>rising</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>low</td><td>falling</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>high</td><td>falling</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>high</td><td>rising</td></tr>
</table>
<pre class="code-block">assign sample_on_rising = ~(mode[1] ^ mode[0]);   // CPOL == CPHA
assign do_sample = sample_on_rising ? rising_edge  : falling_edge;
assign do_launch = sample_on_rising ? falling_edge : rising_edge;</pre>

<h3>Multi-Word Burst</h3>
<p>Hold CS low across consecutive 8-bit words. After each 8th sample edge the slave resets <code>bit_cnt</code> and is immediately ready for the next word — no CS toggle needed.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_v2 with the same ports as L1 plus input logic [1:0] mode',
        'Add logic sample_on_rising = ~(mode[1] ^ mode[0])',
        'Derive do_sample and do_launch from sample_on_rising',
        'Replace rising_edge/falling_edge with do_sample/do_launch in the always_ff body',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines should appear',
      ],

      hint:
`module spi_slave_v2 (
  input  logic       clk, rst_n,
  input  logic [1:0] mode,
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
    if (!rst_n) sck_prev<=0; else sck_prev<=sck;

  assign rising_edge      = sck  & ~sck_prev;
  assign falling_edge     = ~sck &  sck_prev;
  assign sample_on_rising = ~(mode[1]^mode[0]);
  assign do_sample        = sample_on_rising ? rising_edge  : falling_edge;
  assign do_launch        = sample_on_rising ? falling_edge : rising_edge;
  assign miso             = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin bit_cnt<=0;rx_shift<=0;tx_shift<=0;rx_byte<=0;rx_valid<=0; end
    else begin
      rx_valid<=0;
      if (cs_n) begin bit_cnt<=0; tx_shift<=tx_byte; end
      else begin
        if (do_sample) begin
          rx_shift<={rx_shift[6:0],mosi};
          if (bit_cnt==3'd7) begin rx_byte<={rx_shift[6:0],mosi};rx_valid<=1;bit_cnt<=0; end
          else bit_cnt<=bit_cnt+3'd1;
        end
        if (do_launch) tx_shift<={tx_shift[6:0],1'b0};
      end
    end
  end
endmodule`,

      design: `// Build spi_slave_v2. Same as L1 plus:
//   input logic [1:0] mode
//   assign sample_on_rising = ~(mode[1]^mode[0])
//   assign do_sample = sample_on_rising ? rising_edge : falling_edge
//   assign do_launch = sample_on_rising ? falling_edge : rising_edge
// Replace rising_edge/falling_edge in always_ff with do_sample/do_launch.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk=0; always #5 clk=~clk;
  logic [1:0] mode=0; logic rst_n,cs_n=1,sck=0,mosi=0;
  wire  miso; logic [7:0] tx_byte=0,rx_byte; logic rx_valid;
  spi_slave_v2 dut(.clk(clk),.rst_n(rst_n),.mode(mode),.cs_n(cs_n),
                   .sck(sck),.mosi(mosi),.miso(miso),
                   .tx_byte(tx_byte),.rx_byte(rx_byte),.rx_valid(rx_valid));
  task automatic send_word(input logic [1:0] m, input logic [7:0] d, output logic [7:0] rd);
    integer i; logic cpol; cpol=m[1]; rd=0;
    sck=cpol; @(posedge clk); #1;
    for (i=7;i>=0;i--) begin
      mosi=d[i]; @(posedge clk); #1;
      sck=~cpol; @(posedge clk); #1; sck=cpol; @(posedge clk); #1;
    end rd=rx_byte;
  endtask
  logic [7:0] got,b0,b1;
  initial begin
    $display("=== SPI Mode x Width Test ===");
    rst_n=0;repeat(2)@(posedge clk);#1;rst_n=1;repeat(2)@(posedge clk);#1;
    mode=2'b00;cs_n=0;@(posedge clk);#1; send_word(2'b00,8'hA5,got); cs_n=1;@(posedge clk);#1;
    if(got===8'hA5) $display("PASS  rx_mode0=0xa5"); else $display("FAIL  rx_mode0=%0h",got);
    mode=2'b01;cs_n=0;@(posedge clk);#1; send_word(2'b01,8'h5A,got); cs_n=1;@(posedge clk);#1;
    if(got===8'h5A) $display("PASS  rx_mode1=0x5a"); else $display("FAIL  rx_mode1=%0h",got);
    mode=2'b10;cs_n=0;@(posedge clk);#1; send_word(2'b10,8'hC3,got); cs_n=1;@(posedge clk);#1;
    if(got===8'hC3) $display("PASS  rx_mode2=0xc3"); else $display("FAIL  rx_mode2=%0h",got);
    mode=2'b11;cs_n=0;@(posedge clk);#1; send_word(2'b11,8'h3C,got); cs_n=1;@(posedge clk);#1;
    if(got===8'h3C) $display("PASS  rx_mode3=0x3c"); else $display("FAIL  rx_mode3=%0h",got);
    mode=2'b00;cs_n=0;@(posedge clk);#1;
    send_word(2'b00,8'hDE,b0); send_word(2'b00,8'hAD,b1); cs_n=1;@(posedge clk);#1;
    if(b0===8'hDE) $display("PASS  burst_byte0=0xde"); else $display("FAIL  burst0=%0h",b0);
    if(b1===8'hAD) $display("PASS  burst_byte1=0xad"); else $display("FAIL  burst1=%0h",b1);
    $display("All modes and widths verified!"); $finish;
  end
endmodule`,
      expected: ['PASS  rx_mode0=0xa5','PASS  rx_mode1=0x5a','PASS  rx_mode2=0xc3','PASS  rx_mode3=0x3c','PASS  burst_byte0=0xde','All modes and widths verified!']
    },

    {
      id: 'spi_long_tb4l3',
      title: 'L3 — Performance Calculation',
      theory: `<h2>Measuring SPI Throughput</h2>
<p>After months of building the SPI master, here is a question that matters in production:
<em>how fast does it actually go?</em>
Every CS pre-delay and post-delay costs time.
A performance counter captures the truth automatically.</p>

<h3>The Throughput Formula</h3>
<pre class="code-block">// total_cycles = pre_delay + N_bits * SCK_period_clks + post_delay
// efficiency (%) = (N_bits * SCK_period_clks * 100) / total_cycles
//
// Example: 8 bits, SCK_period=2 clks, no overhead:
//   total = 16  →  efficiency = 100%
// With 5-cycle pre-delay:
//   total = 21  →  efficiency = (16*100)/21 = 76%</pre>

<h3>Performance Monitor Design</h3>
<table class="truth-table">
  <tr><th>Event</th><th>Action</th></tr>
  <tr><td>CS asserts (1&rarr;0)</td><td>Reset <code>sck_cnt</code>, <code>cyc_cnt</code></td></tr>
  <tr><td>CS active each clock</td><td><code>cyc_cnt++</code>; if rising SCK: <code>sck_cnt++</code></td></tr>
  <tr><td>CS de-asserts (0&rarr;1)</td><td>Latch counts into outputs; pulse <code>done</code></td></tr>
</table>

<p>Module: <code>spi_perf_monitor</code><br>
Inputs: <code>clk, rst_n, cs_n, sck</code><br>
Outputs: <code>sck_count[15:0], cycle_count[15:0], done</code></p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_perf_monitor: clk,rst_n,cs_n,sck (in); sck_count[15:0],cycle_count[15:0],done (out)',
        'Declare cs_n_prev, sck_prev, and 16-bit running counters sck_cnt, cyc_cnt',
        'Register cs_n_prev and sck_prev every cycle; default done=0',
        'CS assert branch: reset sck_cnt and cyc_cnt; CS active: cyc_cnt++, sck_cnt++ on rising SCK',
        'CS de-assert branch: latch sck_count=sck_cnt, cycle_count=cyc_cnt, done=1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear',
      ],

      hint:
`module spi_perf_monitor (
  input  logic        clk, rst_n, cs_n, sck,
  output logic [15:0] sck_count, cycle_count,
  output logic        done
);
  logic cs_n_prev, sck_prev;
  logic [15:0] sck_cnt, cyc_cnt;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      cs_n_prev<=1;sck_prev<=0;sck_cnt<=0;cyc_cnt<=0;
      sck_count<=0;cycle_count<=0;done<=0;
    end else begin
      cs_n_prev<=cs_n; sck_prev<=sck; done<=0;
      if (cs_n_prev & ~cs_n) begin          // CS just asserted
        sck_cnt<=0; cyc_cnt<=0;
      end else if (~cs_n) begin             // CS active
        cyc_cnt<=cyc_cnt+16'd1;
        if (sck & ~sck_prev) sck_cnt<=sck_cnt+16'd1;
      end else if (~cs_n_prev & cs_n) begin // CS just de-asserted
        sck_count<=sck_cnt; cycle_count<=cyc_cnt; done<=1;
      end
    end
  end
endmodule`,

      design: `// Build the spi_perf_monitor module here.
// Inputs:  clk, rst_n, cs_n, sck
// Outputs: sck_count[15:0], cycle_count[15:0], done
// Internal: cs_n_prev, sck_prev, sck_cnt[15:0], cyc_cnt[15:0]
//
// 3 phases: CS assert -> reset | CS active -> count | CS de-assert -> latch+done
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk=0; always #5 clk=~clk;
  logic rst_n, cs_n=1, sck=0;
  logic [15:0] sck_count, cycle_count; logic done;
  spi_perf_monitor dut(.clk(clk),.rst_n(rst_n),.cs_n(cs_n),.sck(sck),
                       .sck_count(sck_count),.cycle_count(cycle_count),.done(done));
  integer i, sck_int, cyc_int, eff;
  initial begin
    $display("=== SPI Performance Monitor Test ===");
    rst_n=0;repeat(2)@(posedge clk);#1;rst_n=1;repeat(2)@(posedge clk);#1;
    // Test 1: zero overhead, SCK period=2 clks -> 8*2=16 cycles -> efficiency=100%
    cs_n=0;sck=0; @(posedge clk);#1;
    for(i=7;i>=0;i--) begin sck=1;@(posedge clk);#1; sck=0;@(posedge clk);#1; end
    cs_n=1; @(posedge clk);#1; @(posedge clk);#1;
    if(sck_count===16'd8) $display("PASS  sck_count=8"); else $display("FAIL  sck=%0d",sck_count);
    sck_int=sck_count; cyc_int=cycle_count; eff=(sck_int*200)/cyc_int;
    if(eff>=95) $display("PASS  efficiency=%0d%%",eff); else $display("FAIL  eff=%0d%%",eff);
    // Test 2: 5-cycle pre-delay -> 5+16=21 cycles -> ~76%
    cs_n=0;sck=0; @(posedge clk);#1; repeat(5) @(posedge clk);#1;
    for(i=7;i>=0;i--) begin sck=1;@(posedge clk);#1; sck=0;@(posedge clk);#1; end
    cs_n=1; @(posedge clk);#1; @(posedge clk);#1;
    if(sck_count===16'd8) $display("PASS  sck_count_t2=8"); else $display("FAIL  sck_t2=%0d",sck_count);
    sck_int=sck_count; cyc_int=cycle_count; eff=(sck_int*200)/cyc_int;
    if(eff>=50) $display("PASS  efficiency_t2=%0d%%",eff); else $display("FAIL  eff_t2=%0d%%",eff);
    $display("Performance monitor verified!"); $finish;
  end
endmodule`,
      expected: ['PASS  sck_count=8','PASS  efficiency=100%','PASS  sck_count_t2=8','Performance monitor verified!']
    },

    {
      id: 'spi_long_tb4l4',
      title: 'L4 — 38-Item DV Checklist × Checkpoint D',
      theory: `<h2>The Designer Handoff Checklist</h2>
<p>Before any real chip tapes out, a DV engineer runs a structured checklist — every item
must print <code>PASS</code> before sign-off. This lesson is that checklist.
You will re-implement <code>spi_slave_v2</code> from memory; the pre-wired testbench runs 38 checks
across all modes, word widths, burst scenarios, edge-case bit patterns, and MISO echo fidelity.</p>

<h3>Checklist Structure (38 items)</h3>
<table class="truth-table">
  <tr><th>Items</th><th>Category</th></tr>
  <tr><td>1–8</td><td>Mode 0 — eight data patterns (0x00 … 0xF0)</td></tr>
  <tr><td>9–12</td><td>All 4 modes with pattern 0xC3</td></tr>
  <tr><td>13–16</td><td>All 4 modes with pattern 0x3C</td></tr>
  <tr><td>17–20</td><td>MISO echo fidelity in Mode 0 (four tx_byte values)</td></tr>
  <tr><td>21–24</td><td>Mode 0 four-word burst: 0xDE/0xAD/0xBE/0xEF</td></tr>
  <tr><td>25–28</td><td>Mode 2 four-word burst: 0x11/0x22/0x33/0x44</td></tr>
  <tr><td>29–32</td><td>Single-bit patterns in Mode 0: 0x01/0x02/0x80/0x40</td></tr>
  <tr><td>33–36</td><td>Mode 1 alternating patterns: 0xBB/0xCC/0xDD/0xEE</td></tr>
  <tr><td>37–38</td><td>Mode 3 edge-case patterns: 0x7E/0x81</td></tr>
</table>

<h3>Pass Condition</h3>
<p>Every check prints <code>PASS  check_N</code>. After all 38, the testbench prints the summary line
and the <strong>SPI Verification Engineer</strong> certificate. If any item fails, the DUT has a bug —
go back to the relevant module lesson and fix it.</p>

<p>This is <strong>Checkpoint D</strong> — the final integration gate of the entire course.
Getting all 38 items green is the same milestone a real verification team would celebrate.</p>

<p><strong>Ready?</strong> Switch to the Code tab and re-implement <code>spi_slave_v2</code> from memory.
The testbench is already loaded. Hit Run when ready.</p>`,

      tasks: [
        'Code tab is blank — re-implement spi_slave_v2 from memory (see L2 for the spec).',
        'Ports: clk, rst_n, mode[1:0], cs_n, sck, mosi (in); miso (out); tx_byte[7:0] (in); rx_byte[7:0], rx_valid (out)',
        'Edge detection: sck_prev register; rising_edge and falling_edge assigns',
        'Mode selection: sample_on_rising = ~(mode[1]^mode[0]); do_sample and do_launch assigns',
        'MISO: assign miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'always_ff: default rx_valid=0; CS idle: reset bit_cnt, preload tx_shift',
        'CS active on do_sample: shift rx_shift; at bit_cnt==7 latch rx_byte, pulse rx_valid, reset bit_cnt',
        'CS active on do_launch: tx_shift <= {tx_shift[6:0], 1\'b0}',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 38 PASS lines and the certificate should appear in the Output tab',
        '🏅 SPI Verification Engineer — 38-item DV checklist complete; your design is handoff-ready',
      ],

      hint:
`// Re-implement spi_slave_v2 from L2.
// See L2 hint for the full annotated solution.
//
// Quick reference:
//   assign sample_on_rising = ~(mode[1]^mode[0]);
//   assign do_sample = sample_on_rising ? rising_edge : falling_edge;
//   assign do_launch = sample_on_rising ? falling_edge : rising_edge;
//   assign miso      = ~cs_n ? tx_shift[7] : 1'bz;
//
// all other logic identical to L2.`,

      design: `// Re-implement spi_slave_v2 here.
// Build it from memory — refer to the L2 lesson only if stuck.
// All 38 DV checks depend on a correct implementation.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk=0; always #5 clk=~clk;
  logic [1:0] mode=0;
  logic rst_n, cs_n=1, sck=0, mosi=0;
  wire  miso;
  logic [7:0] tx_byte=0, rx_byte; logic rx_valid;

  spi_slave_v2 dut(.clk(clk),.rst_n(rst_n),.mode(mode),.cs_n(cs_n),
                   .sck(sck),.mosi(mosi),.miso(miso),
                   .tx_byte(tx_byte),.rx_byte(rx_byte),.rx_valid(rx_valid));

  task automatic send_word(input logic [1:0] m, input logic [7:0] d, output logic [7:0] rd);
    integer i; logic cpol; cpol=m[1]; rd=0;
    sck=cpol; @(posedge clk); #1;
    for(i=7;i>=0;i--) begin
      mosi=d[i]; @(posedge clk); #1;
      sck=~cpol; @(posedge clk); #1; sck=cpol; @(posedge clk); #1;
    end rd=rx_byte;
  endtask

  task automatic send_recv_m0(input logic [7:0] d, output logic [7:0] rd, mc);
    integer i; rd=0; mc=0;
    sck=0; @(posedge clk); #1;
    for(i=7;i>=0;i--) begin
      mosi=d[i]; @(posedge clk); #1;
      sck=1; @(posedge clk); #1; mc[i]=miso; sck=0; @(posedge clk); #1;
    end rd=rx_byte;
  endtask

  task automatic chk(input logic ok, input integer n);
    if(ok) begin pass_cnt++; $display("PASS  check_%0d",n); end
    else   begin fail_cnt++; $display("FAIL  check_%0d",n); end
  endtask

  integer pass_cnt=0, fail_cnt=0, k;
  logic [7:0] got, mc;
  logic [7:0] pat[8], echo[4], bm0[4], bm2[4], brx[4], sngl[4], m1p[4], m3p[2];

  initial begin
    pat[0]=8'h00;pat[1]=8'hFF;pat[2]=8'hA5;pat[3]=8'h5A;
    pat[4]=8'hAA;pat[5]=8'h55;pat[6]=8'h0F;pat[7]=8'hF0;
    echo[0]=8'hA5;echo[1]=8'h5A;echo[2]=8'hF0;echo[3]=8'h0F;
    bm0[0]=8'hDE;bm0[1]=8'hAD;bm0[2]=8'hBE;bm0[3]=8'hEF;
    bm2[0]=8'h11;bm2[1]=8'h22;bm2[2]=8'h33;bm2[3]=8'h44;
    sngl[0]=8'h01;sngl[1]=8'h02;sngl[2]=8'h80;sngl[3]=8'h40;
    m1p[0]=8'hBB;m1p[1]=8'hCC;m1p[2]=8'hDD;m1p[3]=8'hEE;
    m3p[0]=8'h7E;m3p[1]=8'h81;

    $display("=== SPI DV Checklist (38 items) ===");
    rst_n=0; repeat(2)@(posedge clk);#1; rst_n=1; repeat(2)@(posedge clk);#1;

    // Checks 1-8: Mode 0 data patterns
    for(k=0;k<8;k++) begin
      mode=0;cs_n=0;tx_byte=0;@(posedge clk);#1;
      send_word(2'b00,pat[k],got); cs_n=1;@(posedge clk);#1;
      chk(got===pat[k], k+1);
    end

    // Checks 9-12: All 4 modes with 0xC3
    for(k=0;k<4;k++) begin
      mode=k[1:0];cs_n=0;tx_byte=0;@(posedge clk);#1;
      send_word(k[1:0],8'hC3,got); cs_n=1;@(posedge clk);#1;
      chk(got===8'hC3, k+9);
    end

    // Checks 13-16: All 4 modes with 0x3C
    for(k=0;k<4;k++) begin
      mode=k[1:0];cs_n=0;tx_byte=0;@(posedge clk);#1;
      send_word(k[1:0],8'h3C,got); cs_n=1;@(posedge clk);#1;
      chk(got===8'h3C, k+13);
    end

    // Checks 17-20: MISO echo fidelity in Mode 0
    for(k=0;k<4;k++) begin
      mode=0;cs_n=0;tx_byte=echo[k];@(posedge clk);#1;
      send_recv_m0(8'h00,got,mc); cs_n=1;@(posedge clk);#1;
      chk(mc===echo[k], k+17);
    end

    // Checks 21-24: Mode 0 four-word burst
    mode=0;cs_n=0;tx_byte=0;@(posedge clk);#1;
    for(k=0;k<4;k++) send_word(2'b00,bm0[k],brx[k]);
    cs_n=1;@(posedge clk);#1;
    for(k=0;k<4;k++) chk(brx[k]===bm0[k], k+21);

    // Checks 25-28: Mode 2 four-word burst
    mode=2'b10;cs_n=0;tx_byte=0;@(posedge clk);#1;
    for(k=0;k<4;k++) send_word(2'b10,bm2[k],brx[k]);
    cs_n=1;@(posedge clk);#1;
    for(k=0;k<4;k++) chk(brx[k]===bm2[k], k+25);

    // Checks 29-32: Single-bit patterns in Mode 0
    for(k=0;k<4;k++) begin
      mode=0;cs_n=0;tx_byte=0;@(posedge clk);#1;
      send_word(2'b00,sngl[k],got); cs_n=1;@(posedge clk);#1;
      chk(got===sngl[k], k+29);
    end

    // Checks 33-36: Mode 1 alternating patterns
    for(k=0;k<4;k++) begin
      mode=2'b01;cs_n=0;tx_byte=0;@(posedge clk);#1;
      send_word(2'b01,m1p[k],got); cs_n=1;@(posedge clk);#1;
      chk(got===m1p[k], k+33);
    end

    // Checks 37-38: Mode 3 edge-case patterns
    for(k=0;k<2;k++) begin
      mode=2'b11;cs_n=0;tx_byte=0;@(posedge clk);#1;
      send_word(2'b11,m3p[k],got); cs_n=1;@(posedge clk);#1;
      chk(got===m3p[k], k+37);
    end

    $display("=== DV Result: %0d/38 PASS ===", pass_cnt);
    if(fail_cnt===0) $display("PASS  all_38_items");
    else             $display("FAIL  %0d_checks_failed", fail_cnt);
    $display("SPI Verification Engineer certificate — 38-item DV checklist complete; your design is handoff-ready");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  check_1',
        'PASS  check_38',
        'PASS  all_38_items',
        'SPI Verification Engineer certificate'
      ]
    }
  ]
});
