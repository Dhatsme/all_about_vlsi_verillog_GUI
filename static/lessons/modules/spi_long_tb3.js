(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb3',
  title: 'SVA & Formal Verification',
  icon: '🔍',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long_tb3l1',
      title: 'L1 — Safety Property Monitoring',
      theory: `
<h2>SystemVerilog Assertions: properties that never sleep</h2>
<p>A directed testbench checks specific scenarios. A property checks an invariant on every single clock cycle for the entire simulation. Miss it in a directed test and it stays broken; a property catches the exact cycle. This is the power of SystemVerilog Assertions (SVA).</p>

<h3>SVA syntax overview</h3>
<ul>
  <li><strong>Implication</strong> <code>|-&gt;</code>: if the antecedent is true, the consequent must be true in the same cycle.</li>
  <li><strong>Next-cycle implication</strong> <code>|-&gt;=</code>: consequent checked one cycle later.</li>
</ul>

<pre class="code-block">// SVA concurrent assertions:
assert property (@(posedge pclk) (state != IDLE) |-&gt; busy);
assert property (@(posedge pclk) enable_sck |-&gt; cs_active);

// Verilator equivalent (always_ff monitoring):
logic [15:0] busy_viol = 0;
always_ff @(posedge clk) begin
  if (rst_n)
    if (state !== 3'd0 &amp;&amp; !busy) busy_viol &lt;= busy_viol + 1;
end</pre>

<table class="truth-table">
  <tr><th>Property</th><th>SVA form</th><th>What it catches</th></tr>
  <tr><td>Busy invariant</td><td><code>state != IDLE |-&gt; busy</code></td><td>busy=0 during a transfer</td></tr>
  <tr><td>CS before SCK</td><td><code>enable_sck |-&gt; cs_active</code></td><td>SCK without CS asserted</td></tr>
  <tr><td>transfer_done once</td><td>fires exactly once per transfer</td><td>missing or duplicate done pulses</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_master_fsm</code>. The testbench runs three complete transfers while an <code>always_ff</code> monitoring block counts violations on every clock cycle. Zero violations = all three safety properties hold.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_master_fsm (same 7-state FSM from previous chapters)',
        'busy must be 1 in every state except IDLE',
        'cs_active covers ASSERT_CS, SHIFT, COMPLETE, ABORT_WAIT',
        'transfer_done is a 1-cycle pulse when DEASSERT_CS && post_delay_done',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_master_fsm (
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
`// Re-implement spi_master_fsm.
// busy=1 in every state except IDLE.
// cs_active=1 in ASSERT_CS, SHIFT, COMPLETE, ABORT_WAIT.
// transfer_done = 1-cycle pulse: DEASSERT_CS && post_delay_done.
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

  logic [15:0] busy_viol = 0, cs_sck_viol = 0, done_cnt = 0;

  always_ff @(posedge clk) begin
    if (rst_n) begin
      if (state !== 3'd0 && !busy)  busy_viol   <= busy_viol   + 1;
      if (enable_sck && !cs_active) cs_sck_viol <= cs_sck_viol + 1;
      if (transfer_done)            done_cnt    <= done_cnt    + 1;
    end
  end

  task automatic do_transfer;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;
    repeat(4) @(posedge clk); #1;
    word_done = 1; @(posedge clk); #1; word_done = 0;
    @(posedge clk); #1;
    post_delay_done = 1; @(posedge clk); #1; post_delay_done = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    rst_n = 0; start = 0; abort = 0; soft_rst = 0;
    pre_delay_done = 0; post_delay_done = 0; word_done = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    do_transfer; do_transfer; do_transfer;

    $display(busy_viol === 0 ?
      "PASS  busy invariant: holds throughout 3 transfers (0 violations)" :
      "FAIL  busy invariant: %0d violations", busy_viol);
    $display(cs_sck_viol === 0 ?
      "PASS  CS-before-SCK: SCK never enabled without CS (0 violations)" :
      "FAIL  CS-before-SCK: %0d violations", cs_sck_viol);
    $display(done_cnt === 3 ?
      "PASS  transfer_done: fired exactly 3 times (one per transfer)" :
      "FAIL  transfer_done: fired %0d times (expected 3)", done_cnt);

    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;
    abort = 1; @(posedge clk); #1; abort = 0;
    post_delay_done = 1; @(posedge clk); #1; post_delay_done = 0;
    @(posedge clk); #1;
    $display(!busy && state === 3'd0 ?
      "PASS  ABORT path: busy=0 state=IDLE no invariant violations" :
      "FAIL  ABORT path: busy=%0b state=%0d", busy, state);

    $display("Safety properties complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  busy invariant: holds',
        'PASS  CS-before-SCK: SCK never enabled',
        'PASS  transfer_done: fired exactly 3',
        'Safety properties complete!'
      ]
    },

    {
      id: 'spi_long_tb3l2',
      title: 'L2 — Protocol Compliance Monitoring',
      theory: `
<h2>Protocol compliance: every bit on the right edge</h2>
<p>An SPI master can pass a loopback test and still violate the protocol &#8212; if it outputs bits in the wrong order, real peripherals silently receive garbage. Formal protocol compliance checks that every bit on every transfer is exactly correct.</p>

<h3>MOSI bit ordering as a property</h3>
<p>For MSB-first transmission of <code>tx_data[7:0]</code>, the bit driven on MOSI at the k-th sample pulse must be <code>tx_data[7-k]</code>. Track the sample index with a counter and compare mosi_out against the expected value on every sample edge.</p>

<pre class="code-block">// SVA (conceptual):
assert property (@(posedge clk) sample_pulse |-&gt;
  mosi_out === expected[7 - sample_count]);

// Verilator equivalent:
logic [3:0] sample_idx = 0;
logic [15:0] mosi_viol = 0;
always_ff @(posedge clk) begin
  if (sample_pulse &amp;&amp; sample_idx &lt; 8) begin
    if (mosi_out !== expected[7-sample_idx]) mosi_viol &lt;= mosi_viol + 1;
    sample_idx &lt;= sample_idx + 1;
  end
end</pre>

<h3>word_done liveness</h3>
<p>&#8220;Liveness&#8221; means &#8220;something good eventually happens.&#8221; For the shift register: after load fires, word_done must fire exactly once after WL launch pulses &#8212; not zero times (stuck), not two times (spurious). The counter verifies the exact count.</p>

<h3>What you will build</h3>
<p>Re-implement <code>spi_shift</code>. The testbench drives 8 simultaneous launch+sample pulses, monitors MOSI bit ordering, counts word_done, verifies loopback integrity, and checks LSB-first gives bit-reversed data.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_shift: ports pclk, rst_n, load, lsb_first, io_mode[1:0], tx_data[31:0], word_len[4:0], launch_pulse, sample_pulse, miso_in, mosi_out, rx_data[31:0], word_done',
        'On load: capture tx_data, set mosi_out to first bit (MSB or LSB depending on lsb_first)',
        'On launch_pulse: shift tx_shift, update mosi_out to next bit, increment bit_cnt',
        'On sample_pulse: shift miso_in into rx_shift',
        'word_done: 1-cycle pulse when bit_cnt+1 == word_len after a launch_pulse',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_shift (
  input  logic        pclk, rst_n, load, lsb_first,
  input  logic [1:0]  io_mode,
  input  logic [31:0] tx_data,
  input  logic [4:0]  word_len,
  input  logic        launch_pulse, sample_pulse, miso_in,
  output logic        mosi_out, word_done,
  output logic [31:0] rx_data
);
  logic [31:0] tx_shift, rx_shift;
  logic [4:0]  bit_cnt;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      tx_shift <= 0; rx_shift <= 0; bit_cnt <= 0;
      mosi_out <= 0; word_done <= 0;
    end else begin
      word_done <= 0;
      if (load) begin
        tx_shift <= tx_data; rx_shift <= 0; bit_cnt <= 0;
        mosi_out <= lsb_first ? tx_data[0] : tx_data[word_len-1];
      end else begin
        if (launch_pulse) begin
          tx_shift <= lsb_first ? (tx_shift >> 1) : (tx_shift << 1);
          mosi_out <= lsb_first ? tx_shift[1] : tx_shift[word_len-2];
          bit_cnt  <= bit_cnt + 1;
          if (bit_cnt + 1 == word_len) word_done <= 1;
        end
        if (sample_pulse)
          rx_shift <= lsb_first ? {miso_in, rx_shift[31:1]}
                                 : {rx_shift[30:0], miso_in};
      end
    end
  end

  assign rx_data = rx_shift;
endmodule`,
      design:
`// Re-implement spi_shift here.
// On load: capture tx_data, reset bit_cnt, set mosi_out to first bit.
// On launch_pulse: shift, update mosi_out, count; word_done when bit_cnt+1==word_len.
// On sample_pulse: shift miso_in into rx_shift.
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  localparam WL = 8;

  logic rst_n, load, lsb_first, launch_pulse, sample_pulse, miso_in, mosi_out, word_done;
  logic [1:0] io_mode;
  logic [31:0] tx_data, rx_data;
  logic [4:0] word_len;

  spi_shift dut (
    .pclk(clk), .rst_n(rst_n), .load(load), .lsb_first(lsb_first),
    .io_mode(io_mode), .tx_data(tx_data), .word_len(word_len),
    .launch_pulse(launch_pulse), .sample_pulse(sample_pulse),
    .miso_in(miso_in), .mosi_out(mosi_out), .rx_data(rx_data), .word_done(word_done)
  );

  assign miso_in = mosi_out;

  logic [7:0]  expected_data = 8'hA5;
  logic [3:0]  sample_idx    = 0;
  logic [15:0] mosi_viol     = 0;
  logic [15:0] word_done_cnt = 0;

  always_ff @(posedge clk) begin
    if (rst_n) begin
      if (sample_pulse && sample_idx < WL) begin
        if (mosi_out !== expected_data[WL-1-sample_idx[2:0]])
          mosi_viol <= mosi_viol + 1;
        sample_idx <= sample_idx + 1;
      end
      if (word_done) word_done_cnt <= word_done_cnt + 1;
    end
  end

  initial begin
    rst_n = 0; load = 0; lsb_first = 0; io_mode = 0;
    word_len = WL; tx_data = 0; launch_pulse = 0; sample_pulse = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    tx_data = 32'hA5; load = 1; @(posedge clk); #1; load = 0;
    repeat(WL) begin
      launch_pulse = 1; sample_pulse = 1;
      @(posedge clk); #1;
      launch_pulse = 0; sample_pulse = 0;
    end
    @(posedge clk); #1;

    $display(mosi_viol === 0 ?
      "PASS  protocol: MOSI bit order correct for 0xA5 MSB-first (0 violations)" :
      "FAIL  protocol: MOSI ordering %0d violations", mosi_viol);
    $display(word_done_cnt === 1 ?
      "PASS  protocol: word_done fired exactly once (WL=8)" :
      "FAIL  protocol: word_done fired %0d times (expected 1)", word_done_cnt);
    $display(rx_data[WL-1:0] === 8'hA5 ?
      "PASS  protocol: loopback rx_data=0xa5 matches tx_data" :
      "FAIL  protocol: rx_data=0x%0h (expected 0xa5)", rx_data[WL-1:0]);

    lsb_first = 1; tx_data = 32'hF0;
    load = 1; @(posedge clk); #1; load = 0;
    repeat(WL) begin
      launch_pulse = 1; sample_pulse = 1;
      @(posedge clk); #1;
      launch_pulse = 0; sample_pulse = 0;
    end
    @(posedge clk); #1;
    $display(rx_data[WL-1:0] === 8'h0F ?
      "PASS  protocol: LSB-first rx_data=0x0f (bit-reversed loopback)" :
      "FAIL  protocol: LSB-first rx_data=0x%0h (expected 0x0f)", rx_data[WL-1:0]);

    $display("Protocol compliance complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  protocol: MOSI bit order correct',
        'PASS  protocol: word_done fired exactly once',
        'PASS  protocol: loopback rx_data=0xa5',
        'Protocol compliance complete!'
      ]
    },

    {
      id: 'spi_long_tb3l3',
      title: 'L3 — Formal Proof Hints',
      theory: `
<h2>Formal verification: proving properties, not just testing them</h2>
<p>Simulation shows a design works for the scenarios you thought of. Formal verification proves it works for ALL scenarios within a defined model. Industry tools like JasperGold or SymbiYosys use formal methods; the techniques they require &#8212; liveness, ordering, invariants &#8212; can be prototyped in simulation using the patterns you have already learned.</p>

<h3>The three classes of formal property</h3>
<ul>
  <li><strong>Safety</strong>: &#8220;nothing bad ever happens.&#8221; Example: level never exceeds DEPTH.</li>
  <li><strong>Liveness</strong>: &#8220;something good eventually happens.&#8221; Example: a write causes empty to go false within 1 cycle.</li>
  <li><strong>Ordering</strong>: &#8220;events preserve a relationship.&#8221; Example: FIFO outputs items in write order (first-in-first-out).</li>
</ul>

<pre class="code-block">// Safety (invariant): level never exceeds DEPTH
assert property (@(posedge clk) level &lt;= DEPTH);

// Liveness: write causes non-empty within 1 cycle
assert property (@(posedge clk)
  (wr_en &amp;&amp; !full) |-&gt;= !empty);

// Ordering: FIFO read matches write order
// (verified via simulation: write A,B,C then read A,B,C)</pre>

<h3>What you will build</h3>
<p>Re-implement <code>spi_tx_fifo</code> from memory (DEPTH=8, WIDTH=8, WM=2). The testbench verifies three formal properties: (1) ordering &#8212; pop sequence matches push sequence; (2) liveness &#8212; push causes non-empty in 1 cycle; (3) level monotonicity &#8212; level increases by exactly 1 per write. Passing all three is the formal-equivalent sign-off for the FIFO.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_tx_fifo #(.DEPTH(8), .WIDTH(8), .WM(2)) from memory',
        'Ordering property: pop sequence must match push sequence (FIFO, not stack)',
        'Liveness property: after push, empty goes false and level=1 in the next cycle',
        'Monotonicity: level increases by exactly 1 per write when not full',
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
// The testbench verifies formal ordering, liveness, and monotonicity.
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

  integer i, order_viol, mono_viol;
  logic [3:0] prev_level;

  task automatic fifo_write(input logic [7:0] data);
    wr_data = data; wr_en = 1; @(posedge clk); #1; wr_en = 0;
  endtask
  task automatic fifo_read;
    rd_en = 1; @(posedge clk); #1; rd_en = 0;
  endtask

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; wr_data = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Property 1: ordering -- pop sequence matches push sequence (FIFO not stack)
    fifo_write(8'hAA); fifo_write(8'hBB);
    fifo_write(8'hCC); fifo_write(8'hDD);
    @(posedge clk); #1;  // settle after last write
    order_viol = 0;
    if (rd_data !== 8'hAA) order_viol = order_viol + 1; fifo_read;
    if (rd_data !== 8'hBB) order_viol = order_viol + 1; fifo_read;
    if (rd_data !== 8'hCC) order_viol = order_viol + 1; fifo_read;
    if (rd_data !== 8'hDD) order_viol = order_viol + 1;
    $display(order_viol === 0 ?
      "PASS  formal ordering: 4 items read back in FIFO order (0 violations)" :
      "FAIL  formal ordering: %0d values out of order", order_viol);

    // Property 2: liveness -- push causes empty=0 within 1 cycle
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    fifo_write(8'h42);
    $display(!empty && level === 1 ?
      "PASS  formal liveness: push causes non-empty within 1 cycle (level=1)" :
      "FAIL  formal liveness: empty=%0b level=%0d after write", empty, level);

    // Property 3: level monotonicity -- increments by 1 per write
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    mono_viol = 0;
    for (i = 1; i <= 4; i = i + 1) begin
      fifo_write(8'hFF);
      if (level !== i[3:0]) mono_viol = mono_viol + 1;
    end
    $display(mono_viol === 0 ?
      "PASS  formal monotonicity: level increments 1-4 correctly (0 violations)" :
      "FAIL  formal monotonicity: %0d wrong level values", mono_viol);

    // Property 4: safety -- level never exceeds DEPTH after writes and reads
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    for (i = 0; i < 8; i = i + 1) fifo_write(8'hCC);  // fill to DEPTH
    fifo_write(8'hCC); fifo_write(8'hCC);  // attempt overflow (level must stay 8)
    $display(level === 4'd8 && full ?
      "PASS  formal safety: level=8 (DEPTH) never exceeded" :
      "FAIL  formal safety: level=%0d full=%0b", level, full);

    $display("Formal properties complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  formal ordering: 4 items read back in FIFO order',
        'PASS  formal liveness: push causes non-empty',
        'PASS  formal monotonicity: level increments',
        'Formal properties complete!'
      ]
    }
  ]
});
