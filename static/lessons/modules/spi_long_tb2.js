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
<ul>
  <li><strong>DIV=0</strong> &#8212; the counter compares 0==0 on the very first cycle, so SCK toggles every clock. A design that protects against this with <code>if (div != 0)</code> would break the spec.</li>
  <li><strong>CPOL idle</strong> &#8212; when enable=0, sck_out must be exactly cpol. This requires a combinational assign, not a registered output.</li>
  <li><strong>Enable gating mid-burst</strong> &#8212; disabling mid-wave must snap sck_out to cpol immediately.</li>
</ul>

<pre class="code-block">assign sck_out = enable ? sck_int : cpol;
// DIV=0: div_cnt==div fires on cycle 0 (0==0), toggles every clock</pre>

<table class="truth-table">
  <tr><th>DIV</th><th>Toggle period</th><th>rising_edge_p rate</th></tr>
  <tr><td>0</td><td>2 cycles</td><td>every 2 cycles</td></tr>
  <tr><td>1</td><td>4 cycles</td><td>every 4 cycles</td></tr>
  <tr><td>4</td><td>10 cycles</td><td>every 10 cycles</td></tr>
  <tr><td>N</td><td>2(N+1) cycles</td><td>every 2(N+1) cycles</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_clk_div</code> from memory. The testbench checks DIV=0 pulse rate, CPOL=1 idle, enable-snap-to-CPOL mid-burst, and edge pulse mutual exclusion.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_clk_div: ports pclk, rst_n, enable, cpol, div[15:0], sck_out, rising_edge_p, falling_edge_p',
        'div_cnt counts to div, toggles sck_int, resets — DIV=0 means 0==0 fires every cycle',
        'sck_out must be COMBINATIONAL: assign sck_out = enable ? sck_int : cpol',
        'rising_edge_p = sck_int & ~sck_prev & enable   falling_edge_p = ~sck_int & sck_prev & enable',
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
      div_cnt <= 0; sck_int <= 0;
    end else if (!enable) begin
      div_cnt <= 0; sck_int <= cpol;
    end else if (div_cnt == div) begin
      div_cnt <= 0; sck_int <= ~sck_int;
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
`// Re-implement spi_clk_div. sck_out must be a COMBINATIONAL assign.
// DIV=0: div_cnt==div fires every cycle (0==0).
// Delete this and start typing:
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
    .pclk(clk), .rst_n(rst_n), .enable(enable), .cpol(cpol), .div(div),
    .sck_out(sck_out), .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p)
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
    $display(cnt >= 8 ? "PASS  DIV=0: rising pulses=%0d (fastest clock)" :
      "FAIL  DIV=0: rising pulses=%0d (expected >=8)", cnt);
    enable = 0; repeat(2) @(posedge clk);

    cpol = 1; rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    $display(sck_out === 1 ? "PASS  CPOL=1: idle sck_out=1" :
      "FAIL  CPOL=1: sck_out=%0b", sck_out);

    cpol = 0; rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    div = 4; cpol = 1; enable = 1;
    repeat(3) @(posedge clk); enable = 0; @(posedge clk); #1;
    $display(sck_out === 1 ? "PASS  enable=0 mid-burst: sck_out snaps to CPOL=1" :
      "FAIL  enable=0 mid-burst: sck_out=%0b", sck_out);

    cpol = 0; rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;
    div = 4; enable = 1; same_cnt = 0;
    repeat(50) begin @(posedge clk); #1;
      if (rising_edge_p && falling_edge_p) same_cnt = same_cnt + 1;
    end
    $display(same_cnt === 0 ? "PASS  edge pulses mutually exclusive over 50 cycles" :
      "FAIL  both edges high %0d times", same_cnt);

    $display("Clock corner cases complete!"); $finish;
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
<p>FIFOs fail at three boundaries: full (overflow), empty (underflow), and watermark. The comparison operator matters: <code>&gt;=</code> fires at the threshold itself; <code>&gt;</code> misses it by one.</p>

<h3>Overflow sticky flag</h3>
<p>When a write arrives while full, data is silently dropped. <code>ovf_sticky</code> records this event. It is sticky &#8212; reads do not clear it. Only flush clears it as explicit CPU acknowledgement.</p>

<pre class="code-block">// Sticky: set when wr_en &amp;&amp; full; cleared only by flush or rst_n
always_ff @(posedge pclk) begin
  if (!rst_n || flush) ovf_sticky &lt;= 0;
  else if (wr_en &amp;&amp; full) ovf_sticky &lt;= 1;
end
// Inclusive watermark comparisons:
assign almost_full  = (level &gt;= DEPTH - WM);
assign almost_empty = (level &lt;= WM);</pre>

<table class="truth-table">
  <tr><th>level</th><th>almost_full (WM=2,D=8)</th><th>almost_empty (WM=2)</th></tr>
  <tr><td>2</td><td>0</td><td>1</td></tr>
  <tr><td>3</td><td>0</td><td>0</td></tr>
  <tr><td>5</td><td>0</td><td>0</td></tr>
  <tr><td>6</td><td>1</td><td>0</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_tx_fifo</code> from memory (DEPTH=8, WIDTH=8, WM=2). Testbench checks: overflow sticky persists through reads, flush clears it, almost_full fires at exactly level=6, almost_empty at level=2.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_tx_fifo #(.DEPTH(8), .WIDTH(8), .WM(2))',
        'Ports: pclk, rst_n, wr_en, rd_en, flush, wr_data[7:0], rd_data[7:0], full, empty, almost_full, almost_empty, ovf_sticky, level[3:0]',
        'ovf_sticky is sticky: reads do NOT clear it; only flush or rst_n clears it',
        'almost_full = (level >= DEPTH - WM)   almost_empty = (level <= WM)  — both inclusive',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_tx_fifo #(
  parameter DEPTH = 8, WIDTH = 8, WM = 2
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
      end else if (wr_en && full) ovf_sticky <= 1;
      if (rd_en && !empty) rd_ptr <= rd_ptr + 1;
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
`// Re-implement spi_tx_fifo #(.DEPTH(8),.WIDTH(8),.WM(2)) here.
// ovf_sticky: NOT cleared by reads, only by flush/rst_n.
// almost_full >= DEPTH-WM=6, almost_empty <= WM=2 (inclusive).
// Delete this and start typing:
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
    .pclk(clk), .rst_n(rst_n), .wr_en(wr_en), .rd_en(rd_en), .flush(flush),
    .wr_data(wr_data), .rd_data(rd_data), .full(full), .empty(empty),
    .almost_full(almost_full), .almost_empty(almost_empty),
    .ovf_sticky(ovf_sticky), .level(level)
  );

  integer i;

  task automatic fifo_write(input logic [7:0] data);
    wr_data = data; wr_en = 1; @(posedge clk); #1; wr_en = 0;
  endtask
  task automatic fifo_read;
    rd_en = 1; @(posedge clk); #1; rd_en = 0;
  endtask

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; wr_data = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    for (i = 0; i < 8; i = i + 1) fifo_write(8'hAA);
    fifo_write(8'hFF);
    $display(ovf_sticky === 1 ? "PASS  overflow: ovf_sticky=1 when full" :
      "FAIL  overflow: ovf_sticky=%0b", ovf_sticky);
    for (i = 0; i < 8; i = i + 1) fifo_read;
    @(posedge clk); #1;
    $display(empty && ovf_sticky === 1 ?
      "PASS  ovf_sticky persists after drain: empty=1 sticky=1" :
      "FAIL  after drain: empty=%0b ovf_sticky=%0b", empty, ovf_sticky);

    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 5; i = i + 1) fifo_write(8'hBB);
    @(posedge clk); #1;
    $display(!almost_full ? "PASS  level=5: almost_full=0 (threshold is 6)" :
      "FAIL  level=5: almost_full=%0b", almost_full);
    fifo_write(8'hCC); @(posedge clk); #1;
    $display(almost_full ? "PASS  level=6: almost_full=1 (at threshold DEPTH-WM)" :
      "FAIL  level=6: almost_full=%0b", almost_full);

    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 4; i = i + 1) fifo_write(8'hDD);
    fifo_read; @(posedge clk); #1;
    $display(!almost_empty ? "PASS  level=3: almost_empty=0 (threshold is 2)" :
      "FAIL  level=3: almost_empty=%0b", almost_empty);
    fifo_read; @(posedge clk); #1;
    $display(almost_empty ? "PASS  level=2: almost_empty=1 (at threshold WM)" :
      "FAIL  level=2: almost_empty=%0b", almost_empty);

    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 8; i = i + 1) fifo_write(8'hEE);
    fifo_write(8'hEE);
    flush = 1; @(posedge clk); #1; flush = 0; @(posedge clk); #1;
    $display(empty && level === 0 && !ovf_sticky ?
      "PASS  flush: empty=1 level=0 ovf_sticky=0" :
      "FAIL  flush: empty=%0b level=%0d ovf_sticky=%0b", empty, level, ovf_sticky);

    $display("FIFO corner cases complete!"); $finish;
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
<p>A race condition in an FSM happens when two inputs become true in the same clock cycle. The SPI master has two important races: ABORT vs word_done in SHIFT state, and SOFT_RST vs everything else. Hardware resolves races with explicit priority encoding; a testbench proves both that the winner wins and that the loser is suppressed.</p>

<h3>ABORT: only honored in SHIFT</h3>
<p>The ABORT input is checked only when the FSM is in SHIFT. If ABORT fires during ASSERT_CS, it is ignored &#8212; the FSM waits for <code>pre_delay_done</code>. Aborting before SCK starts would leave CS asserted without any clock edges, which can confuse attached peripherals. The safe abort point is after at least one SCK edge.</p>

<pre class="code-block">// Priority in SHIFT: ABORT beats word_done
SHIFT: begin
  if (abort)          next_state = ABORT_WAIT;  // wins
  else if (word_done) next_state = COMPLETE;
end
// ASSERT_CS: ABORT not checked at all
ASSERT_CS: begin
  if (pre_delay_done) next_state = SHIFT;
end</pre>

<table class="truth-table">
  <tr><th>State</th><th>abort=1</th><th>soft_rst=1</th></tr>
  <tr><td>IDLE</td><td>ignored</td><td>stay IDLE</td></tr>
  <tr><td>ASSERT_CS</td><td>ignored</td><td>&#8594; IDLE instantly</td></tr>
  <tr><td>SHIFT</td><td>&#8594; ABORT_WAIT</td><td>&#8594; IDLE instantly</td></tr>
  <tr><td>ABORT_WAIT</td><td>ignored</td><td>&#8594; IDLE instantly</td></tr>
</table>

<h3>SOFT_RST: highest-priority override</h3>
<p>SOFT_RST overrides everything. In any state, one clock cycle of <code>soft_rst=1</code> forces the FSM to IDLE. CS deasserts immediately. The testbench verifies this from both SHIFT and ASSERT_CS.</p>

<h3>What you will build</h3>
<p>Re-implement <code>spi_master_fsm</code> from memory. The testbench drives four race scenarios: ABORT during ASSERT_CS (ignored), ABORT and word_done simultaneously (ABORT wins), SOFT_RST from SHIFT (instant IDLE), SOFT_RST from ASSERT_CS (instant IDLE).</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_master_fsm: 7 states IDLE=0 LOAD=1 ASSERT_CS=2 SHIFT=3 COMPLETE=4 DEASSERT_CS=5 ABORT_WAIT=6',
        'Inputs: pclk, rst_n, start, abort, soft_rst, pre_delay_done, post_delay_done, word_done',
        'Outputs: state[2:0], busy, cs_active, enable_sck, load_pulse, transfer_done',
        'ABORT only checked in SHIFT; in ASSERT_CS it must be ignored',
        'In SHIFT: if (abort) ABORT_WAIT; else if (word_done) COMPLETE — abort has priority',
        'soft_rst overrides all states — check it first before the state machine case',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`// States: IDLE=0 LOAD=1 ASSERT_CS=2 SHIFT=3 COMPLETE=4 DEASSERT_CS=5 ABORT_WAIT=6
// assign busy       = (state != IDLE);
// assign cs_active  = (state==ASSERT_CS || state==SHIFT ||
//                      state==COMPLETE  || state==ABORT_WAIT);
// assign enable_sck = (state == SHIFT);
// assign load_pulse = (state == LOAD);
// assign transfer_done = (state==DEASSERT_CS) & post_delay_done;
//
// always_comb next-state:
//   if (soft_rst) next = IDLE;   <-- check first
//   else case (curr)
//     IDLE:        if (start) next = LOAD;
//     LOAD:        next = ASSERT_CS;
//     ASSERT_CS:   if (pre_delay_done) next = SHIFT;  // abort ignored
//     SHIFT:       if (abort) next = ABORT_WAIT;      // abort wins
//                  else if (word_done) next = COMPLETE;
//     COMPLETE:    next = DEASSERT_CS;
//     DEASSERT_CS: if (post_delay_done) next = IDLE;
//     ABORT_WAIT:  if (post_delay_done) next = IDLE;

module spi_master_fsm (
  input  logic       pclk, rst_n, start, abort, soft_rst,
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

  always_ff @(posedge pclk or negedge rst_n)
    if (!rst_n) curr <= IDLE; else curr <= next;

  always_comb begin
    next = curr;
    if (soft_rst) next = IDLE;
    else case (curr)
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

  assign busy          = (curr != IDLE);
  assign cs_active     = (curr==ASSERT_CS || curr==SHIFT ||
                          curr==COMPLETE  || curr==ABORT_WAIT);
  assign enable_sck    = (curr == SHIFT);
  assign load_pulse    = (curr == LOAD);
  assign transfer_done = (curr == DEASSERT_CS) & post_delay_done;
endmodule`,
      design:
`// Re-implement spi_master_fsm. See Theory for race condition rules.
// ABORT only honored in SHIFT; in ASSERT_CS it is ignored.
// soft_rst overrides ALL states -> IDLE in one clock.
// Delete this and start typing:
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
    .pclk(clk), .rst_n(rst_n), .start(start), .abort(abort), .soft_rst(soft_rst),
    .pre_delay_done(pre_delay_done), .post_delay_done(post_delay_done),
    .word_done(word_done), .state(state), .busy(busy), .cs_active(cs_active),
    .enable_sck(enable_sck), .load_pulse(load_pulse), .transfer_done(transfer_done)
  );

  initial begin
    rst_n = 0; start = 0; abort = 0; soft_rst = 0;
    pre_delay_done = 0; post_delay_done = 0; word_done = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Test 1: ABORT during ASSERT_CS must be ignored
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;                          // LOAD -> ASSERT_CS
    abort = 1; @(posedge clk); #1; abort = 0;   // fire in ASSERT_CS
    $display(state === 3'd2 ?
      "PASS  ABORT in ASSERT_CS ignored: still in ASSERT_CS" :
      "FAIL  ABORT in ASSERT_CS: state=%0d (expected 2)", state);
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;
    $display(state === 3'd3 ?
      "PASS  FSM advances to SHIFT after ignored ABORT" :
      "FAIL  after ignored ABORT: state=%0d (expected 3)", state);

    // Test 2: ABORT and word_done in SHIFT simultaneously -> ABORT wins
    abort = 1; word_done = 1; @(posedge clk); #1; abort = 0; word_done = 0;
    $display(state === 3'd6 ?
      "PASS  ABORT+word_done in SHIFT: ABORT wins -> ABORT_WAIT(6)" :
      "FAIL  ABORT+word_done: state=%0d (expected 6=ABORT_WAIT)", state);
    post_delay_done = 1; @(posedge clk); #1; post_delay_done = 0;
    $display(state === 3'd0 ?
      "PASS  ABORT_WAIT -> IDLE" :
      "FAIL  ABORT_WAIT: state=%0d (expected 0)", state);

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

    $display("ABORT race conditions complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  ABORT in ASSERT_CS ignored:',
        'PASS  ABORT+word_done in SHIFT: ABORT wins',
        'PASS  SOFT_RST from SHIFT:',
        'ABORT race conditions complete!'
      ]
    },

    {
      id: 'spi_long_tb2l4',
      title: 'L4 — FIFO Race Conditions',
      theory: `
<h2>Simultaneous push and pop: who wins?</h2>
<p>A FIFO race happens when the write side and read side both assert their enables in the same clock cycle. The correct outcome depends on whether the FIFO is full, empty, or somewhere in the middle. Get it wrong and the level counter drifts out of sync with the actual data &#8212; a failure mode that can take thousands of cycles to manifest and is nearly impossible to debug.</p>

<h3>The double-NBA trap</h3>
<p>The most common implementation bug: two non-blocking assignments to the same counter variable in one <code>always_ff</code> block. In SystemVerilog, NBA semantics dictate that the LAST assignment scheduled wins. So <code>level &lt;= level + 1</code> followed by <code>level &lt;= level - 1</code> gives <code>level - 1</code> &#8212; the read silently wins and the level drifts low every time there is a simultaneous push+pop.</p>

<pre class="code-block">// WRONG: last NBA assignment wins -> read silently wins
if (wr_en &amp;&amp; !full)  level &lt;= level + 1;
if (rd_en &amp;&amp; !empty) level &lt;= level - 1;  // overwrites the line above

// CORRECT: explicit case statement, simultaneous -> no change
case ({wr_en &amp;&amp; !full, rd_en &amp;&amp; !empty})
  2'b10: level &lt;= level + 1;
  2'b01: level &lt;= level - 1;
  // 2'b11: simultaneous -> unchanged
  // 2'b00: nothing
endcase</pre>

<h3>Boundary simultaneity</h3>
<p>Two extra cases matter at the extremes: when the FIFO is empty and both wr_en and rd_en fire together, the read is blocked (nothing to read) so only the write executes and level rises to 1. When full, only the read executes and level falls to DEPTH-1. The <code>udf_sticky</code> and <code>ovf_sticky</code> flags must NOT fire in these cases because the blocked operation never actually happened.</p>

<table class="truth-table">
  <tr><th>level</th><th>wr_en</th><th>rd_en</th><th>Result</th><th>Sticky fired?</th></tr>
  <tr><td>0 (empty)</td><td>1</td><td>1</td><td>level=1 (only wr)</td><td>no</td></tr>
  <tr><td>1..DEPTH-1</td><td>1</td><td>1</td><td>level unchanged</td><td>no</td></tr>
  <tr><td>DEPTH (full)</td><td>1</td><td>1</td><td>level=DEPTH-1 (only rd)</td><td>no</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_rx_fifo</code> (DEPTH=8, WIDTH=8, WM=2). The RX FIFO adds <code>udf_sticky</code> &#8212; a read-when-empty flag &#8212; in addition to <code>ovf_sticky</code>. The testbench tests: underflow (rd when empty sets udf_sticky, rd_data=0), overflow (wr when full sets ovf_sticky), simultaneous push+pop at level=1 (level stays 1), and simultaneous at empty (only write executes, level=1, udf_sticky does not fire).</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_rx_fifo #(.DEPTH(8), .WIDTH(8), .WM(2))',
        'Same ports as spi_tx_fifo but with udf_sticky added: set when rd_en && empty',
        'rd_data must return 0 when the FIFO is empty: assign rd_data = empty ? \"0 : mem[...]',
        'Simultaneous wr_en+rd_en (both valid): use a case statement so level stays unchanged',
        'Simultaneous at empty: rd is blocked (nothing to read), only wr executes — udf_sticky must NOT fire',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_rx_fifo #(
  parameter DEPTH = 8, WIDTH = 8, WM = 2
) (
  input  logic             pclk, rst_n, wr_en, rd_en, flush,
  input  logic [WIDTH-1:0] wr_data,
  output logic [WIDTH-1:0] rd_data,
  output logic             full, empty, almost_full, almost_empty,
  output logic             ovf_sticky, udf_sticky,
  output logic [$clog2(DEPTH):0] level
);
  logic [WIDTH-1:0]       mem [DEPTH];
  logic [$clog2(DEPTH):0] wr_ptr, rd_ptr;
  logic                   do_wr, do_rd;

  assign do_wr = wr_en && !full;
  assign do_rd = rd_en && !empty;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr <= 0; rd_ptr <= 0; ovf_sticky <= 0; udf_sticky <= 0;
    end else if (flush) begin
      wr_ptr <= 0; rd_ptr <= 0; ovf_sticky <= 0; udf_sticky <= 0;
    end else begin
      if (do_wr) begin
        mem[wr_ptr[$clog2(DEPTH)-1:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (do_rd) rd_ptr <= rd_ptr + 1;
      // sticky flags: fired by blocked (invalid) operations only
      if (wr_en && full)  ovf_sticky <= 1;
      if (rd_en && empty) udf_sticky <= 1;
    end
  end

  // level = wr_ptr - rd_ptr; both pointers increment on simultaneous -> unchanged
  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level == 0);
  assign full         = (level == DEPTH[$clog2(DEPTH):0]);
  assign almost_full  = (level >= (DEPTH - WM)[$clog2(DEPTH):0]);
  assign almost_empty = (level <= WM[$clog2(DEPTH):0]);
  assign rd_data      = empty ? '0 : mem[rd_ptr[$clog2(DEPTH)-1:0]];
endmodule`,
      design:
`// Re-implement spi_rx_fifo #(.DEPTH(8),.WIDTH(8),.WM(2)) here.
// Same as spi_tx_fifo but with udf_sticky added.
// rd_data must be 0 when empty: assign rd_data = empty ? '0 : mem[...];
// Simultaneous push+pop: both pointers advance -> level unchanged.
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, wr_en, rd_en, flush;
  logic [7:0] wr_data, rd_data;
  logic full, empty, almost_full, almost_empty, ovf_sticky, udf_sticky;
  logic [3:0] level;

  spi_rx_fifo #(.DEPTH(8), .WIDTH(8), .WM(2)) dut (
    .pclk(clk), .rst_n(rst_n), .wr_en(wr_en), .rd_en(rd_en), .flush(flush),
    .wr_data(wr_data), .rd_data(rd_data), .full(full), .empty(empty),
    .almost_full(almost_full), .almost_empty(almost_empty),
    .ovf_sticky(ovf_sticky), .udf_sticky(udf_sticky), .level(level)
  );

  integer i;

  task automatic do_write(input logic [7:0] data);
    wr_data = data; wr_en = 1; @(posedge clk); #1; wr_en = 0;
  endtask
  task automatic do_read;
    rd_en = 1; @(posedge clk); #1; rd_en = 0;
  endtask

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; wr_data = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Test 1: underflow - read when empty sets udf_sticky, rd_data=0
    rd_en = 1; @(posedge clk); #1; rd_en = 0;
    $display(udf_sticky === 1 && rd_data === 0 ?
      "PASS  underflow: udf_sticky=1 rd_data=0" :
      "FAIL  underflow: udf_sticky=%0b rd_data=0x%0h", udf_sticky, rd_data);

    // Test 2: overflow - write when full sets ovf_sticky
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 8; i = i + 1) do_write(8'hAA);
    do_write(8'hFF);  // overflow
    $display(ovf_sticky === 1 ?
      "PASS  overflow: ovf_sticky=1 when full" :
      "FAIL  overflow: ovf_sticky=%0b", ovf_sticky);

    // Test 3: simultaneous push+pop at level=1 -> level stays 1
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    do_write(8'hBB);  // level=1
    wr_data = 8'hCC; wr_en = 1; rd_en = 1;  // simultaneous
    @(posedge clk); #1; wr_en = 0; rd_en = 0;
    $display(level === 1 && !ovf_sticky && !udf_sticky ?
      "PASS  simultaneous push+pop at level=1: level stays 1" :
      "FAIL  simultaneous push+pop: level=%0d ovf=%0b udf=%0b", level, ovf_sticky, udf_sticky);

    // Test 4: simultaneous at empty -> only write executes, level=1, udf_sticky=0
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    wr_data = 8'hDD; wr_en = 1; rd_en = 1;  // empty: rd blocked
    @(posedge clk); #1; wr_en = 0; rd_en = 0;
    $display(level === 1 && !udf_sticky ?
      "PASS  simultaneous at empty: only write executes level=1 udf_sticky=0" :
      "FAIL  simultaneous at empty: level=%0d udf_sticky=%0b", level, udf_sticky);

    $display("FIFO race conditions complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  underflow: udf_sticky=1 rd_data=0',
        'PASS  overflow: ovf_sticky=1 when full',
        'PASS  simultaneous push+pop at level=1:',
        'FIFO race conditions complete!'
      ]
    }
  ]
});
