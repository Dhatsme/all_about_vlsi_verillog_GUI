(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb2',
  title: 'Corner Case Coverage',
  icon: '🧩',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long_tb2l1',
      title: 'L1 — Clock Divider Corner Cases',
      theory: `
<h2>Corner cases: where bugs live</h2>
<p>Most hardware bugs don&#39;t hide in the middle of the operating range &#8212; they hide at the edges. DIV=0, WL=1, a FIFO at exactly capacity, or enable toggling at the same cycle as a counter wrap: these boundary inputs expose assumptions baked silently into the design.</p>
<p>This chapter maps to the DV checklist in the SPI datapath spec. Each lesson targets a specific module and drives inputs that typical smoke tests miss.</p>

<h3>Clock divider corner cases</h3>
<p>Three edges matter for <code>spi_clk_div</code>:</p>
<ul>
  <li><strong>DIV=0</strong> &#8212; the counter compares 0==0 on the very first cycle, so SCK toggles every clock. This is the absolute fastest rate. A design that protects against this with <code>if (div != 0)</code> would break the spec, which says DIV=0 should produce the fastest clock.</li>
  <li><strong>CPOL idle</strong> &#8212; when enable=0, sck_out must be exactly cpol, not whatever sck_int happened to be. The combinational gate <code>sck_out = enable ? sck_int : cpol</code> handles this, but only if the implementation uses an <code>assign</code> rather than registering sck_out.</li>
  <li><strong>Enable gating mid-burst</strong> &#8212; disabling mid-wave must snap sck_out to cpol immediately (combinational), not wait for the next counter wrap.</li>
</ul>

<pre class="code-block">// sck_out is COMBINATIONAL &#8212; responds in the same cycle
assign sck_out = enable ? sck_int : cpol;

// DIV=0 works transparently:
// div_cnt==div fires on cycle 0 (0==0), toggles sck_int every clock</pre>

<table class="truth-table">
  <tr><th>DIV</th><th>Toggle period</th><th>rising_edge_p rate</th></tr>
  <tr><td>0</td><td>2 cycles</td><td>every 2 cycles</td></tr>
  <tr><td>1</td><td>4 cycles</td><td>every 4 cycles</td></tr>
  <tr><td>4</td><td>10 cycles</td><td>every 10 cycles</td></tr>
  <tr><td>N</td><td>2(N+1) cycles</td><td>every 2(N+1) cycles</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_clk_div</code> from memory. The testbench is pre-wired with four quantitative checks: DIV=0 pulse rate, CPOL=1 idle level, enable-snap-to-CPOL mid-burst, and mutual exclusion of the two edge pulses. All four must print PASS.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_clk_div: ports pclk, rst_n, enable, cpol, div[15:0], sck_out, rising_edge_p, falling_edge_p',
        'div_cnt[15:0] counts to div then resets and toggles sck_int — when div==0 the condition fires every cycle',
        'sck_out must be a COMBINATIONAL assign: sck_out = enable ? sck_int : cpol',
        'rising_edge_p = sck_int & ~sck_prev & enable  where sck_prev is a registered copy of sck_int',
        'falling_edge_p = ~sck_int & sck_prev & enable',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out, rising_edge_p, falling_edge_p
);
  logic [15:0] div_cnt;
  logic        sck_int, sck_prev;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= 0;
      sck_int <= 0;
    end else if (!enable) begin
      div_cnt <= 0;
      sck_int <= cpol;     // park at idle level when not running
    end else if (div_cnt == div) begin
      div_cnt <= 0;
      sck_int <= ~sck_int; // DIV=0: 0==0 fires every cycle
    end else begin
      div_cnt <= div_cnt + 1;
    end
  end

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) sck_prev <= 0;
    else        sck_prev <= sck_int;
  end

  assign sck_out        = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_int & ~sck_prev & enable;
  assign falling_edge_p = ~sck_int & sck_prev & enable;
endmodule`,
      design:
`// Re-implement spi_clk_div here. See Theory for corner case details.
//
// Ports:
//   input  logic        pclk, rst_n, enable, cpol
//   input  logic [15:0] div
//   output logic        sck_out, rising_edge_p, falling_edge_p
//
// Key: sck_out is a COMBINATIONAL gate (assign), not a register.
// DIV=0 corner: div_cnt==div fires immediately every cycle.
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, enable, cpol;
  logic [15:0] div;
  logic sck_out, rising_edge_p, falling_edge_p;

  spi_clk_div dut (
    .pclk(clk), .rst_n(rst_n), .enable(enable),
    .cpol(cpol), .div(div),
    .sck_out(sck_out), .rising_edge_p(rising_edge_p),
    .falling_edge_p(falling_edge_p)
  );

  integer cnt, same_cnt;

  task automatic count_rising(input integer ncycles, output integer pulses);
    integer i;
    pulses = 0;
    for (i = 0; i < ncycles; i = i + 1) begin
      @(posedge clk); #1;
      if (rising_edge_p) pulses = pulses + 1;
    end
  endtask

  initial begin
    rst_n = 0; enable = 0; cpol = 0; div = 4;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Test 1: DIV=0 fastest clock
    // div_cnt==div fires every cycle (0==0) -> toggle every clock
    // rising_edge_p fires every 2 cycles -> expect >=8 pulses over 20 cycles
    div = 0; enable = 1;
    count_rising(20, cnt);
    $display(cnt >= 8 ?
      "PASS  DIV=0: rising pulses=%0d (fastest clock)" :
      "FAIL  DIV=0: rising pulses=%0d (expected >=8)", cnt);
    enable = 0; repeat(2) @(posedge clk);

    // Test 2: CPOL=1 idle level
    // sck_out must be 1 when enable=0 and cpol=1
    cpol = 1; rst_n = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    $display(sck_out === 1 ?
      "PASS  CPOL=1: idle sck_out=1" :
      "FAIL  CPOL=1: sck_out=%0b (expected 1)", sck_out);

    // Test 3: enable=0 snaps sck_out to CPOL mid-burst
    // Reset with cpol=0 so sck_int=0; then set cpol=1, enable=1 for 3 cycles
    // (sck_int still 0, before first toggle at cycle 5);
    // disabling must force sck_out=cpol=1 even though sck_int=0
    cpol = 0; rst_n = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    div = 4; cpol = 1; enable = 1;
    repeat(3) @(posedge clk);  // 3 < 5, sck_int still 0
    enable = 0; @(posedge clk); #1;
    $display(sck_out === 1 ?
      "PASS  enable=0 mid-burst: sck_out snaps to CPOL=1" :
      "FAIL  enable=0 mid-burst: sck_out=%0b (expected 1)", sck_out);

    // Test 4: rising_edge_p and falling_edge_p never both high simultaneously
    cpol = 0; rst_n = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    div = 4; enable = 1; same_cnt = 0;
    repeat(50) begin
      @(posedge clk); #1;
      if (rising_edge_p && falling_edge_p) same_cnt = same_cnt + 1;
    end
    $display(same_cnt === 0 ?
      "PASS  edge pulses mutually exclusive over 50 cycles" :
      "FAIL  both edges high %0d times simultaneously", same_cnt);

    $display("Clock corner cases complete!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  DIV=0: rising pulses=',
        'PASS  CPOL=1: idle sck_out=1',
        'PASS  enable=0 mid-burst: sck_out snaps to CPOL=1',
        'Clock corner cases complete!'
      ]
    }
  ]
});
