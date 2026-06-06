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
  <li><strong>Implication</strong> <code>|&#8209;&gt;</code>: if the antecedent is true, the consequent must also be true in the same cycle.</li>
  <li><strong>Next-cycle implication</strong> <code>|-&gt;=</code>: consequent is checked one cycle later.</li>
</ul>

<pre class="code-block">// SVA concurrent assertions:
assert property (@(posedge pclk) (state != IDLE) |-&gt; busy);
assert property (@(posedge pclk) enable_sck |-&gt; cs_active);
// These run every cycle automatically.

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
<p>Re-implement <code>spi_master_fsm</code> from memory. The testbench runs three complete transfers while an <code>always_ff</code> monitoring block counts property violations. Zero violations = all three safety properties hold.</p>
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
`// Re-implement spi_master_fsm here.
// The testbench monitoring block checks safety properties on every cycle.
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

  logic [15:0] busy_viol = 0;
  logic [15:0] cs_sck_viol = 0;
  logic [15:0] done_cnt = 0;

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
<p>An SPI master can pass a loopback test and still violate the protocol &#8212; if it outputs bits in the wrong order, or outputs a new bit before the slave has sampled the previous one, real peripherals silently receive garbage. Formal protocol compliance checks that every bit on every transfer is exactly correct.</p>

<h3>MOSI bit ordering as a property</h3>
<p>For MSB-first transmission of <code>tx_data[7:0]</code>, the bit driven on MOSI at the k-th sample pulse must be <code>tx_data[7-k]</code>. This is a quantitative invariant over a sequence of events &#8212; exactly the kind of thing SVA was designed for.</p>

<pre class="code-block">// SVA sequence (conceptual):
// At each sample_pulse edge, MOSI must match the expected bit:
assert property (@(posedge clk) sample_pulse |-&gt;
  mosi_out === expected_data[7 - $countones(sample_history)]);

// Verilator approach: track sample index with a counter,
// compare mosi_out against expected bit on each sample edge.
logic [3:0] sample_idx = 0;
logic [15:0] mosi_viol = 0;
always_ff @(posedge clk) begin
  if (sample_pulse &amp;&amp; sample_idx &lt; 8) begin
    if (mosi_out !== expected[7-sample_idx]) mosi_viol &lt;= mosi_viol + 1;
    sample_idx &lt;= sample_idx + 1;
  end
end</pre>

<h3>word_done liveness</h3>
<p>&#8220;Liveness&#8221; in formal verification means &#8220;something good eventually happens.&#8221; For the shift register: after load fires, word_done must fire exactly once after WL launch pulses &#8212; not zero times (stuck), not two times (spurious extra). The monitoring block counts word_done pulses and the initial block verifies the exact count.</p>

<h3>What you will build</h3>
<p>Re-implement <code>spi_shift</code> from memory. The testbench: (1) drives 8 simultaneous launch+sample pulses in loopback mode, (2) monitors MOSI bit ordering against the expected 0xA5 sequence, (3) counts word_done pulses, (4) verifies LSB-first gives bit-reversed rx_data. All four must print PASS.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_shift: ports pclk, rst_n, load, lsb_first, io_mode[1:0], tx_data[31:0], word_len[4:0], launch_pulse, sample_pulse, miso_in, mosi_out, rx_data[31:0], word_done',
        'On load: capture tx_data into tx_shift; set mosi_out to tx_data[WL-1] (MSB) or tx_data[0] (LSB)',
        'On launch_pulse: shift tx_shift and update mosi_out to next bit; increment bit_cnt',
        'On sample_pulse: shift miso_in into rx_shift',
        'word_done fires (1 cycle) when bit_cnt reaches word_len after a launch_pulse',
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
        tx_shift <= tx_data;
        rx_shift <= 0;
        bit_cnt  <= 0;
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
`// Re-implement spi_shift here. See Theory for protocol compliance focus.
//
// On load: capture tx_data, reset bit_cnt to 0, set mosi_out to first bit.
// On launch_pulse: shift tx_shift, update mosi_out to next bit, count bits.
// On sample_pulse: shift miso_in into rx_shift.
// word_done: 1-cycle pulse when bit_cnt+1 == word_len.
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

  assign miso_in = mosi_out;  // loopback: slave echoes MOSI back as MISO

  // Protocol monitors
  logic [7:0]  expected_data = 8'hA5;   // expected bit pattern
  logic [3:0]  sample_idx    = 0;       // counts sample pulses received
  logic [15:0] mosi_viol     = 0;       // MOSI ordering violations
  logic [15:0] word_done_cnt = 0;       // word_done pulse counter

  always_ff @(posedge clk) begin
    if (rst_n) begin
      // Property: mosi_out matches expected bit at each sample edge
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

    // Load 0xA5 MSB-first, drive 8 simultaneous launch+sample pulses
    tx_data = 32'hA5; load = 1; @(posedge clk); #1; load = 0;
    repeat(WL) begin
      launch_pulse = 1; sample_pulse = 1;
      @(posedge clk); #1;
      launch_pulse = 0; sample_pulse = 0;
    end
    @(posedge clk); #1;

    // Property 1: MOSI bit ordering correct for 0xA5 MSB-first
    $display(mosi_viol === 0 ?
      "PASS  protocol: MOSI bit order correct for 0xA5 MSB-first (0 violations)" :
      "FAIL  protocol: MOSI ordering %0d violations", mosi_viol);

    // Property 2: word_done liveness -- fired exactly once for 8 launch pulses
    $display(word_done_cnt === 1 ?
      "PASS  protocol: word_done fired exactly once (WL=8)" :
      "FAIL  protocol: word_done fired %0d times (expected 1)", word_done_cnt);

    // Property 3: loopback integrity -- rx_data matches tx_data
    $display(rx_data[WL-1:0] === 8'hA5 ?
      "PASS  protocol: loopback rx_data=0xa5 matches tx_data" :
      "FAIL  protocol: rx_data=0x%0h (expected 0xa5)", rx_data[WL-1:0]);

    // Property 4: LSB-first -- bit-reversed loopback
    // tx_data=0xF0=11110000; LSB-first sends 0,0,0,0,1,1,1,1
    // RX shifts into MSB positions -> rx_data[7:0] = 0x0F
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
    }
  ]
});
