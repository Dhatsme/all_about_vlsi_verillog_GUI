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
<p>A directed testbench checks specific scenarios. A property checks an invariant on every single clock cycle for the entire simulation. Miss it in a directed test and it stays broken; miss it with a property and the simulation immediately flags the cycle. This is the power of SystemVerilog Assertions (SVA).</p>

<h3>SVA syntax overview</h3>
<p>A concurrent assertion runs continuously during simulation. The two most important constructs are:</p>
<ul>
  <li><strong>Implication</strong> <code>|&#8209;&gt;</code>: if the antecedent is true, the consequent must also be true in the same cycle.</li>
  <li><strong>Next-cycle implication</strong> <code>|&#8209;&gt;=</code>: consequent is checked one cycle later.</li>
</ul>

<pre class="code-block">// SVA concurrent assertion:
assert property (@(posedge pclk)
  (state != IDLE) |-&gt; busy);       // busy must hold whenever not IDLE

assert property (@(posedge pclk)
  enable_sck |-&gt; cs_active);       // SCK only when CS is asserted

assert property (@(posedge pclk)
  $rose(start) |-&gt;= (state != IDLE)); // after start, busy next cycle</pre>

<h3>Verilator-compatible monitoring</h3>
<p>Verilator 5.020 has limited support for concurrent SVA. The equivalent technique is an <code>always_ff</code> block that monitors outputs on every posedge and accumulates a violation counter. Zero violations after a full run = the property holds.</p>

<pre class="code-block">// Verilator equivalent of the busy invariant:
logic [15:0] busy_viol = 0;
always_ff @(posedge clk) begin
  if (rst_n)
    if (state !== 3&#39;d0 &amp;&amp; !busy) busy_viol &lt;= busy_viol + 1;
end
// At end of sim: assert(busy_viol == 0)</pre>

<h3>Three safety properties for the SPI master</h3>
<table class="truth-table">
  <tr><th>Property</th><th>SVA form</th><th>What it catches</th></tr>
  <tr><td>Busy invariant</td><td><code>(state != IDLE) |-&gt; busy</code></td><td>busy=0 during a transfer (CPU thinks idle)</td></tr>
  <tr><td>CS before SCK</td><td><code>enable_sck |-&gt; cs_active</code></td><td>SCK edges without CS asserted (SPI violation)</td></tr>
  <tr><td>transfer_done once</td><td>fires exactly once per full transfer</td><td>missing or duplicate done pulses</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_master_fsm</code> from memory. The testbench runs three complete transfers while an <code>always_ff</code> monitoring block counts property violations on every clock cycle. Zero violations = all three safety properties hold. A fourth check verifies the ABORT path cleans up correctly.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Re-implement spi_master_fsm (same 7-state FSM as previous lessons)',
        'busy must be 1 in every state except IDLE — the monitoring block will catch any violation',
        'cs_active must be 1 whenever enable_sck=1 — cs_active covers ASSERT_CS, SHIFT, COMPLETE, ABORT_WAIT',
        'transfer_done fires as a 1-cycle pulse on the DEASSERT_CS → IDLE transition',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`// Same FSM as spi_long_tb2 L3. Key output assignments:
//
// assign busy          = (curr != IDLE);
// assign cs_active     = (curr==ASSERT_CS || curr==SHIFT ||
//                         curr==COMPLETE  || curr==ABORT_WAIT);
// assign enable_sck    = (curr == SHIFT);
// assign load_pulse    = (curr == LOAD);
// assign transfer_done = (curr == DEASSERT_CS) & post_delay_done;
//
// Safety properties that the monitoring block checks:
//   1. busy=1 whenever state != IDLE
//   2. enable_sck=1 only when cs_active=1
//   3. transfer_done fires exactly once per full transfer

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
`// Re-implement spi_master_fsm here.
// The testbench monitoring block will check safety properties on every cycle.
// busy = 1 in every state except IDLE.
// cs_active = 1 in ASSERT_CS, SHIFT, COMPLETE, ABORT_WAIT.
// transfer_done = 1-cycle pulse on DEASSERT_CS + post_delay_done.
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

  // SVA-equivalent monitoring: count invariant violations on every posedge
  logic [15:0] busy_viol = 0;    // busy must=1 when state != IDLE
  logic [15:0] cs_sck_viol = 0; // cs_active must=1 when enable_sck=1
  logic [15:0] done_cnt = 0;    // transfer_done pulse counter

  always_ff @(posedge clk) begin
    if (rst_n) begin
      if (state !== 3'd0 && !busy)    busy_viol    <= busy_viol + 1;
      if (enable_sck && !cs_active)   cs_sck_viol  <= cs_sck_viol + 1;
      if (transfer_done)              done_cnt     <= done_cnt + 1;
    end
  end

  task automatic do_transfer;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;  // LOAD -> ASSERT_CS
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;  // -> SHIFT
    repeat(4) @(posedge clk); #1;  // stay in SHIFT
    word_done = 1; @(posedge clk); #1; word_done = 0;  // -> COMPLETE
    @(posedge clk); #1;  // COMPLETE -> DEASSERT_CS
    post_delay_done = 1; @(posedge clk); #1; post_delay_done = 0;  // -> IDLE
    @(posedge clk); #1;  // settle
  endtask

  initial begin
    rst_n = 0; start = 0; abort = 0; soft_rst = 0;
    pre_delay_done = 0; post_delay_done = 0; word_done = 0;
    repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Run 3 complete transfers; monitoring fires on every posedge
    do_transfer;
    do_transfer;
    do_transfer;

    // Check property 1: busy invariant (SVA: state != IDLE |-> busy)
    $display(busy_viol === 0 ?
      "PASS  busy invariant: holds throughout 3 transfers (0 violations)" :
      "FAIL  busy invariant: %0d violations", busy_viol);

    // Check property 2: CS-before-SCK (SVA: enable_sck |-> cs_active)
    $display(cs_sck_viol === 0 ?
      "PASS  CS-before-SCK: SCK never enabled without CS (0 violations)" :
      "FAIL  CS-before-SCK: %0d violations", cs_sck_viol);

    // Check property 3: transfer_done fires exactly once per transfer
    $display(done_cnt === 3 ?
      "PASS  transfer_done: fired exactly 3 times (one per transfer)" :
      "FAIL  transfer_done: fired %0d times (expected 3)", done_cnt);

    // Check ABORT path: busy returns to 0 cleanly
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    pre_delay_done = 1; @(posedge clk); #1; pre_delay_done = 0;
    abort = 1; @(posedge clk); #1; abort = 0;  // ABORT_WAIT
    post_delay_done = 1; @(posedge clk); #1; post_delay_done = 0;  // -> IDLE
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
    }
  ]
});
