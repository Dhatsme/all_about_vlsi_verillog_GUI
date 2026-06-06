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
  <li><strong>DIV=0</strong> &#8212; the counter compares 0==0 on the very first cycle, so SCK toggles every clock. This is the absolute fastest rate. A design that protects against this with <code>if (div != 0)</code> would break the spec.</li>
  <li><strong>CPOL idle</strong> &#8212; when enable=0, sck_out must be exactly cpol. This requires a combinational assign, not a registered output.</li>
  <li><strong>Enable gating mid-burst</strong> &#8212; disabling mid-wave must snap sck_out to cpol immediately, not wait for the next counter wrap.</li>
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
<p>Re-implement <code>spi_clk_div</code> from memory. The testbench checks DIV=0 pulse rate, CPOL=1 idle, enable-snap-to-CPOL, and edge pulse mutual exclusion. All four must print PASS.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint.</p>
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
      sck_int <= cpol;
    end else if (div_cnt == div) begin
      div_cnt <= 0;
      sck_int <= ~sck_int;
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

    div = 0; enable = 1;
    count_rising(20, cnt);
    $display(cnt >= 8 ?
      "PASS  DIV=0: rising pulses=%0d (fastest clock)" :
      "FAIL  DIV=0: rising pulses=%0d (expected >=8)", cnt);
    enable = 0; repeat(2) @(posedge clk);

    cpol = 1; rst_n = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    $display(sck_out === 1 ?
      "PASS  CPOL=1: idle sck_out=1" :
      "FAIL  CPOL=1: sck_out=%0b (expected 1)", sck_out);

    cpol = 0; rst_n = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    div = 4; cpol = 1; enable = 1;
    repeat(3) @(posedge clk);
    enable = 0; @(posedge clk); #1;
    $display(sck_out === 1 ?
      "PASS  enable=0 mid-burst: sck_out snaps to CPOL=1" :
      "FAIL  enable=0 mid-burst: sck_out=%0b (expected 1)", sck_out);

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
    },

    {
      id: 'spi_long_tb2l2',
      title: 'L2 — FIFO Corner Cases',
      theory: `
<h2>FIFO boundaries: the off-by-one kills silicon</h2>
<p>FIFOs fail at three boundaries: the full boundary (overflow), the empty boundary (underflow), and the watermark threshold. Each one is a discrete step, and the comparison operator matters: <code>&gt;=</code> fires at the threshold itself; <code>&gt;</code> misses it by one. Real bugs in production silicon have shipped because of that single character.</p>

<h3>Overflow sticky flag</h3>
<p>When a write arrives while the FIFO is full, the data is silently dropped. The <code>ovf_sticky</code> flag records this event so the CPU can detect data loss later. It is sticky &#8212; reads do not clear it. Only a flush clears it, acting as an explicit acknowledgement: &#8220;I know data was lost; discard the state.&#8221;</p>

<pre class="code-block">// Sticky set: fires when wr_en &amp;&amp; full; never cleared by reads
always_ff @(posedge pclk) begin
  if (!rst_n || flush) ovf_sticky &lt;= 0;
  else if (wr_en &amp;&amp; full) ovf_sticky &lt;= 1;
end

// Watermark: inclusive comparison (fire AT the threshold)
assign almost_full  = (level &gt;= DEPTH - WM);
assign almost_empty = (level &lt;= WM);</pre>

<table class="truth-table">
  <tr><th>level</th><th>almost_full (WM=2,D=8)</th><th>almost_empty (WM=2)</th></tr>
  <tr><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>2</td><td>0</td><td>1</td></tr>
  <tr><td>3</td><td>0</td><td>0</td></tr>
  <tr><td>5</td><td>0</td><td>0</td></tr>
  <tr><td>6</td><td>1</td><td>0</td></tr>
  <tr><td>8</td><td>1</td><td>0</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_tx_fifo</code> from memory (DEPTH=8, WIDTH=8, WM=2). The testbench checks overflow sticky persists through reads, flush clears it, and watermark fires at exactly the threshold level. This one takes a few tries &#8212; that&#39;s completely normal.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_tx_fifo #(.DEPTH(8), .WIDTH(8), .WM(2))',
        'Ports: pclk, rst_n, wr_en, rd_en, flush, wr_data[7:0], rd_data[7:0], full, empty, almost_full, almost_empty, ovf_sticky, level[3:0]',
        'ovf_sticky is sticky: set when wr_en && full; cleared only by flush or rst_n — reads must NOT clear it',
        'almost_full = (level >= DEPTH - WM) and almost_empty = (level <= WM)  — inclusive >= and <=',
        'flush resets wr_ptr and rd_ptr to 0 and clears ovf_sticky',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_tx_fifo #(
  parameter DEPTH = 8,
  parameter WIDTH = 8,
  parameter WM    = 2
) (
  input  logic             pclk, rst_n, wr_en, rd_en, flush,
  input  logic [WIDTH-1:0] wr_data,
  output logic [WIDTH-1:0] rd_data,
  output logic             full, empty, almost_full, almost_empty, ovf_sticky,
  output logic [$clog2(DEPTH):0] level
);
  logic [WIDTH-1:0]       mem [DEPTH];
  logic [$clog2(DEPTH):0] wr_ptr, rd_ptr;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr <= 0; rd_ptr <= 0; ovf_sticky <= 0;
    end else if (flush) begin
      wr_ptr <= 0; rd_ptr <= 0; ovf_sticky <= 0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[$clog2(DEPTH)-1:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end else if (wr_en && full) begin
        ovf_sticky <= 1;
      end
      if (rd_en && !empty)
        rd_ptr <= rd_ptr + 1;
    end
  end

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level == 0);
  assign full         = (level == DEPTH[$clog2(DEPTH):0]);
  assign almost_full  = (level >= (DEPTH - WM)[$clog2(DEPTH):0]);
  assign almost_empty = (level <= WM[$clog2(DEPTH):0]);
  assign rd_data      = mem[rd_ptr[$clog2(DEPTH)-1:0]];
endmodule`,
      design:
`// Re-implement spi_tx_fifo here. See Theory for corner case focus.
//
// module spi_tx_fifo #(parameter DEPTH=8, WIDTH=8, WM=2) ( ... );
//
// Key corner cases tested:
//   ovf_sticky: set by write-when-full, NOT cleared by reads, cleared by flush
//   almost_full fires at level >= DEPTH-WM = 6  (inclusive)
//   almost_empty fires at level <= WM = 2        (inclusive)
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, wr_en, rd_en, flush;
  logic [7:0] wr_data, rd_data;
  logic full, empty, almost_full, almost_empty, ovf_sticky;
  logic [3:0] level;

  spi_tx_fifo #(.DEPTH(8), .WIDTH(8), .WM(2)) dut (
    .pclk(clk), .rst_n(rst_n), .wr_en(wr_en), .rd_en(rd_en),
    .flush(flush), .wr_data(wr_data), .rd_data(rd_data),
    .full(full), .empty(empty), .almost_full(almost_full),
    .almost_empty(almost_empty), .ovf_sticky(ovf_sticky), .level(level)
  );

  integer i;

  task automatic fifo_write(input logic [7:0] data);
    wr_data = data; wr_en = 1;
    @(posedge clk); #1;
    wr_en = 0;
  endtask

  task automatic fifo_read;
    rd_en = 1;
    @(posedge clk); #1;
    rd_en = 0;
  endtask

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; wr_data = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    for (i = 0; i < 8; i = i + 1) fifo_write(8'hAA);
    fifo_write(8'hFF);
    $display(ovf_sticky === 1 ?
      "PASS  overflow: ovf_sticky=1 when full" :
      "FAIL  overflow: ovf_sticky=%0b (expected 1)", ovf_sticky);
    for (i = 0; i < 8; i = i + 1) fifo_read;
    @(posedge clk); #1;
    $display(empty && ovf_sticky === 1 ?
      "PASS  ovf_sticky persists after drain: empty=1 sticky=1" :
      "FAIL  after drain: empty=%0b ovf_sticky=%0b", empty, ovf_sticky);

    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 5; i = i + 1) fifo_write(8'hBB);
    @(posedge clk); #1;
    $display(!almost_full ?
      "PASS  level=5: almost_full=0 (threshold is 6)" :
      "FAIL  level=5: almost_full=%0b (expected 0)", almost_full);
    fifo_write(8'hCC);
    @(posedge clk); #1;
    $display(almost_full ?
      "PASS  level=6: almost_full=1 (at threshold DEPTH-WM)" :
      "FAIL  level=6: almost_full=%0b (expected 1)", almost_full);

    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 4; i = i + 1) fifo_write(8'hDD);
    fifo_read;
    @(posedge clk); #1;
    $display(!almost_empty ?
      "PASS  level=3: almost_empty=0 (threshold is 2)" :
      "FAIL  level=3: almost_empty=%0b (expected 0)", almost_empty);
    fifo_read;
    @(posedge clk); #1;
    $display(almost_empty ?
      "PASS  level=2: almost_empty=1 (at threshold WM)" :
      "FAIL  level=2: almost_empty=%0b (expected 1)", almost_empty);

    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 8; i = i + 1) fifo_write(8'hEE);
    fifo_write(8'hEE);
    flush = 1; @(posedge clk); #1; flush = 0; @(posedge clk); #1;
    $display(empty && level === 0 && !ovf_sticky ?
      "PASS  flush: empty=1 level=0 ovf_sticky=0" :
      "FAIL  flush: empty=%0b level=%0d ovf_sticky=%0b", empty, level, ovf_sticky);

    $display("FIFO corner cases complete!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  overflow: ovf_sticky=1 when full',
        'PASS  ovf_sticky persists after drain:',
        'PASS  level=6: almost_full=1',
        'FIFO corner cases complete!'
      ]
    },

    {
      id: 'spi_long_tb2l3',
      title: 'L3 — ABORT Race Conditions',
      theory: `
<h2>Race conditions in FSM design</h2>
<p>A race condition in an FSM happens when two inputs become true in the same clock cycle and the spec requires a specific winner. The SPI master FSM has two important races: ABORT vs word_done in the SHIFT state, and SOFT_RST vs everything else in every state. Hardware resolves races with explicit priority; a well-designed testbench proves both that the winner wins and that the loser is truly suppressed.</p>

<h3>ABORT: only honored in SHIFT</h3>
<p>The ABORT input is only checked when the FSM is in SHIFT state. If ABORT fires during ASSERT_CS, the FSM ignores it and waits for <code>pre_delay_done</code> before entering SHIFT. This is intentional: aborting before SCK starts would leave CS asserted mid-frame without any clock edges, which could confuse attached peripherals. The safe abort point is after at least one SCK edge.</p>

<pre class="code-block">// Priority in SHIFT state: ABORT beats word_done
SHIFT: begin
  if (abort)     next_state = ABORT_WAIT;  // abort has priority
  else if (word_done) next_state = COMPLETE;
end

// ASSERT_CS ignores ABORT entirely:
ASSERT_CS: begin
  if (pre_delay_done) next_state = SHIFT;  // abort not checked here
end</pre>

<table class="truth-table">
  <tr><th>State</th><th>abort=1</th><th>soft_rst=1</th></tr>
  <tr><td>IDLE</td><td>ignored</td><td>stay IDLE</td></tr>
  <tr><td>ASSERT_CS</td><td>ignored</td><td>&#8594; IDLE instantly</td></tr>
  <tr><td>SHIFT</td><td>&#8594; ABORT_WAIT</td><td>&#8594; IDLE instantly</td></tr>
  <tr><td>ABORT_WAIT</td><td>ignored</td><td>&#8594; IDLE instantly</td></tr>
</table>

<h3>SOFT_RST: the highest-priority override</h3>
<p>SOFT_RST overrides everything. In any state, asserting <code>soft_rst</code> for one clock cycle forces the FSM to IDLE. CS deasserts immediately &#8212; which may violate setup/hold on attached peripherals, but is acceptable for emergency stops. The testbench verifies this from both SHIFT and ASSERT_CS.</p>

<h3>What you will build</h3>
<p>Re-implement <code>spi_master_fsm</code> from memory (7 states, one-hot or binary encoding). The testbench drives four race scenarios: ABORT during ASSERT_CS (ignored), ABORT and word_done simultaneously in SHIFT (ABORT wins), SOFT_RST from SHIFT (instant IDLE), SOFT_RST from ASSERT_CS (instant IDLE). All four must print PASS.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_master_fsm with 7 states: IDLE=0, LOAD=1, ASSERT_CS=2, SHIFT=3, COMPLETE=4, DEASSERT_CS=5, ABORT_WAIT=6',
        'Inputs: pclk, rst_n, start, abort, soft_rst, pre_delay_done, post_delay_done, word_done',
        'Outputs: state[2:0], busy, cs_active, enable_sck, load_pulse, transfer_done',
        'ABORT is only checked in SHIFT state — in ASSERT_CS it is ignored',
        'In SHIFT: abort has priority over word_done (ABORT_WAIT beats COMPLETE)',
        'soft_rst overrides all states — next_state = IDLE regardless of current state',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`// typedef enum logic [2:0] {IDLE=0,LOAD=1,ASSERT_CS=2,SHIFT=3,
//   COMPLETE=4,DEASSERT_CS=5,ABORT_WAIT=6} state_t;
//
// assign busy          = (state != IDLE);
// assign cs_active     = (state==ASSERT_CS || state==SHIFT ||
//                         state==COMPLETE  || state==ABORT_WAIT);
// assign enable_sck    = (state == SHIFT);
// assign load_pulse    = (state == LOAD);  // fires for 1 cycle
// assign transfer_done = (state == DEASSERT_CS) && post_delay_done;
//
// Next-state logic (soft_rst checked first in every branch):
//   IDLE:         if (start) -> LOAD
//   LOAD:         -> ASSERT_CS (unconditional)
//   ASSERT_CS:    if (pre_delay_done) -> SHIFT  [abort ignored here]
//   SHIFT:        if (abort) -> ABORT_WAIT       [abort has priority]
//                 else if (word_done) -> COMPLETE
//   COMPLETE:     -> DEASSERT_CS (unconditional)
//   DEASSERT_CS:  if (post_delay_done) -> IDLE
//   ABORT_WAIT:   if (post_delay_done) -> IDLE
//   soft_rst:     overrides all -> IDLE

module spi_master_fsm (
  input  logic       pclk, rst_n,
  input  logic       start, abort, soft_rst,
  input  logic       pre_delay_done, post_delay_done, word_done,
  output logic [2:0] state,
  output logic       busy, cs_active, enable_sck, load_pulse, transfer_done
);
  typedef enum logic [2:0] {
    IDLE=0, LOAD=1, ASSERT_CS=2, SHIFT=3,
    COMPLETE=4, DEASSERT_CS=5, ABORT_WAIT=6
  } state_t;

  state_t curr, next;
  assign state = curr;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) curr <= IDLE;
    else        curr <= next;
  end

  always_comb begin
    next = curr;
    if (soft_rst) begin
      next = IDLE;
    end else begin
      case (curr)
        IDLE:        if (start)           next = LOAD;
        LOAD:                             next = ASSERT_CS;
        ASSERT_CS:   if (pre_delay_done)  next = SHIFT;
        SHIFT:       if (abort)           next = ABORT_WAIT;
                     else if (word_done)  next = COMPLETE;
        COMPLETE:                         next = DEASSERT_CS;
        DEASSERT_CS: if (post_delay_done) next = IDLE;
        ABORT_WAIT:  if (post_delay_done) next = IDLE;
        default:                          next = IDLE;
      endcase
    end
  end

  assign busy          = (curr != IDLE);
  assign cs_active     = (curr == ASSERT_CS || curr == SHIFT ||
                          curr == COMPLETE  || curr == ABORT_WAIT);
  assign enable_sck    = (curr == SHIFT);
  assign load_pulse    = (curr == LOAD);
  assign transfer_done = (curr == DEASSERT_CS) & post_delay_done;
endmodule`,
      design:
`// Re-implement spi_master_fsm here. See Theory for race condition rules.
//
// Ports:
//   input  pclk, rst_n, start, abort, soft_rst
//   input  pre_delay_done, post_delay_done, word_done
//   output state[2:0], busy, cs_active, enable_sck, load_pulse, transfer_done
//
// Race rules:
//   ABORT: only honored in SHIFT; ignored in all other states
//   In SHIFT: abort has priority over word_done
//   soft_rst: overrides ALL states -> IDLE in one clock
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, start, abort, soft_rst;
  logic pre_delay_done, post_delay_done, word_done;
  logic [2:0] state;
  logic busy, cs_active, enable_sck, load_pulse, transfer_done;

  spi_master_fsm dut (
    .pclk(clk), .rst_n(rst_n), .start(start),
    .abort(abort), .soft_rst(soft_rst),
    .pre_delay_done(pre_delay_done), .post_delay_done(post_delay_done),
    .word_done(word_done),
    .state(state), .busy(busy), .cs_active(cs_active),
    .enable_sck(enable_sck), .load_pulse(load_pulse),
    .transfer_done(transfer_done)
  );

  initial begin
    rst_n = 0; start = 0; abort = 0; soft_rst = 0;
    pre_delay_done = 0; post_delay_done = 0; word_done = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Test 1: ABORT during ASSERT_CS must be ignored
    start = 1; @(posedge clk); #1; start = 0;  // IDLE -> LOAD
    @(posedge clk); #1;                         // LOAD -> ASSERT_CS
    abort = 1; @(posedge clk); #1; abort = 0;  // fire abort in ASSERT_CS
    $display(state === 3'd2 ?
      "PASS  ABORT in ASSERT_CS ignored: still in ASSERT_CS" :
      "FAIL  ABORT in ASSERT_CS: state=%0d (expected 2=ASSERT_CS)", state);
    // Now advance normally
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;
    $display(state === 3'd3 ?
      "PASS  FSM advances to SHIFT after ignored ABORT" :
      "FAIL  after ignored ABORT: state=%0d (expected 3=SHIFT)", state);

    // Test 2: ABORT and word_done simultaneously in SHIFT -> ABORT wins
    abort = 1; word_done = 1; @(posedge clk); #1; abort = 0; word_done = 0;
    $display(state === 3'd6 ?
      "PASS  ABORT+word_done in SHIFT: ABORT wins -> ABORT_WAIT(6)" :
      "FAIL  ABORT+word_done: state=%0d (expected 6=ABORT_WAIT)", state);
    post_delay_done = 1; @(posedge clk); #1; post_delay_done = 0;
    $display(state === 3'd0 ?
      "PASS  ABORT_WAIT -> IDLE" :
      "FAIL  ABORT_WAIT: state=%0d (expected 0=IDLE)", state);

    // Test 3: SOFT_RST from SHIFT -> immediate IDLE
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;  // ASSERT_CS
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;  // SHIFT
    soft_rst = 1; @(posedge clk); #1; soft_rst = 0;
    $display(state === 3'd0 && !busy ?
      "PASS  SOFT_RST from SHIFT: immediate IDLE busy=0" :
      "FAIL  SOFT_RST from SHIFT: state=%0d busy=%0b", state, busy);

    // Test 4: SOFT_RST from ASSERT_CS -> immediate IDLE
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;  // ASSERT_CS
    soft_rst = 1; @(posedge clk); #1; soft_rst = 0;
    $display(state === 3'd0 && !busy ?
      "PASS  SOFT_RST from ASSERT_CS: immediate IDLE busy=0" :
      "FAIL  SOFT_RST from ASSERT_CS: state=%0d busy=%0b", state, busy);

    $display("ABORT race conditions complete!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  ABORT in ASSERT_CS ignored:',
        'PASS  ABORT+word_done in SHIFT: ABORT wins',
        'PASS  SOFT_RST from SHIFT:',
        'ABORT race conditions complete!'
      ]
    }
  ]
});
