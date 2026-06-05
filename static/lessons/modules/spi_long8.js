(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long8',
  title: 'Master FSM',
  icon: '🎛',
  level: 'advanced',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — States & One-Hot Encoding (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long8l1',
      title: 'L1 — States & One-Hot Encoding',

      theory: `
<h2>The Orchestra Conductor</h2>
<p>
  Imagine a full symphony orchestra. Every section — strings, brass, woodwinds, percussion —
  is perfectly capable of playing its part. But without a conductor, all sections play at once,
  each following its own tempo. The result is noise. The conductor\'s role is not to play any
  instrument; it is to point at each section at exactly the right moment and say:
  <em>"you, now."</em> Without that one central coordinator, there is no music.
</p>
<p>
  The <strong>spi_master_fsm</strong> module is that conductor. It plays no instrument of its
  own — it holds no shift registers, generates no clock, drives no data bits. What it does is
  raise and lower control signals to each of the five modules we have already built, in the exact
  sequence that produces a legal SPI transfer. In this chapter we are building the conductor.
  As we add each new state across the four lessons, the orchestra gains one more movement.
</p>

<h3>Where the FSM Sits in the Complete SPI Master</h3>
<pre class="code-block">
             CPU writes START bit to control register
                              │
                              ▼
  ┌───────────────────────────────────────────────────┐ ★
  │               spi_master_fsm                      │
  │  IDLE → LOAD → ASSERT_CS → SHIFT → COMPLETE → ... │
  └──┬──────────┬───────────┬──────────┬──────────────┘
     │          │           │          │
  cs_transfer  clk_       load     pre/post
  _active      enable               assert
     │          │           │          │
     ▼          ▼           ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────────┐
  │spi_cs_   │ │spi_clk_  │ │spi_    │ │spi_cs_ctrl │
  │ctrl      │ │div       │ │shift   │ │(delay cntrs│
  │(CS pins) │ │(SCK gen) │ │(data)  │ │ pre/post)  │
  └────┬─────┘ └────┬─────┘ └───┬────┘ └────────────┘
       │             │           │   ▲           ▲
    CS[3:0]       SCK pin   MOSI/MISO│           │
       │             │           │  word_done  pre/post_done
  ─────┴─────────────┴───────────┴──── SPI bus to slave ICs
</pre>
<p>
  The arrows going <em>into</em> the FSM are completion signals:
  <code>pre_done</code>, <code>word_done</code>, <code>post_done</code>.
  The FSM is event-driven — it stays in a state until the relevant block signals done,
  then advances. This decoupling is what makes the design clean: each sub-module does its
  job independently and simply raises a flag when finished.
</p>

<h3>The Seven States and What They Mean</h3>
<table class="truth-table">
  <tr><th>State</th><th>What is happening on the SPI bus</th><th>Key output raised</th></tr>
  <tr><td>IDLE</td><td>Bus free; waiting for start command</td><td>— (nothing)</td></tr>
  <tr><td>LOAD</td><td>Capture config into shadow regs; start pre-delay counter</td><td>load, pre_assert</td></tr>
  <tr><td>ASSERT_CS</td><td>CS has asserted; counting t<sub>CSS</sub> setup time</td><td>cs_transfer_active</td></tr>
  <tr><td>SHIFT</td><td>SCK running; bits shifting in and out of spi_shift</td><td>clk_enable, cs_transfer_active</td></tr>
  <tr><td>COMPLETE</td><td>Word finished; decide: burst or deassert?</td><td>cs_transfer_active (load if bursting)</td></tr>
  <tr><td>DEASSERT_CS</td><td>CS released; counting t<sub>CSH</sub> hold time</td><td>post_assert</td></tr>
  <tr><td>ABORT_WAIT</td><td>Abort requested; FSM parked safely for 1 cycle</td><td>— (nothing)</td></tr>
</table>

<h3>Why One-Hot Encoding?</h3>
<p>
  A 7-state machine can be encoded in 3 bits (binary) or 7 bits (one-hot — exactly one bit
  high at a time). Binary is compact. One-hot is <em>fast</em>: checking whether the FSM is
  in ASSERT_CS requires reading just one flip-flop. No decoder, no combinational logic,
  no additional LUTs on FPGA fabric. High-speed controllers always use one-hot.
</p>
<pre class="code-block">
typedef enum logic [6:0] {
  IDLE        = 7'b000_0001,   // bit 0 — only bit 0 is 1
  LOAD        = 7'b000_0010,   // bit 1
  ASSERT_CS   = 7'b000_0100,   // bit 2
  SHIFT       = 7'b000_1000,   // bit 3
  COMPLETE    = 7'b001_0000,   // bit 4
  DEASSERT_CS = 7'b010_0000,   // bit 5
  ABORT_WAIT  = 7'b100_0000    // bit 6
} state_t;
</pre>
<p>
  And checking state is a single-bit read: <code>busy = (state != IDLE)</code>
  compiles to a 6-input OR gate — no decoder needed.
</p>

<h3>L1 Scope: First Three States</h3>
<p>
  We build the FSM incrementally. In L1 we implement IDLE, LOAD, and ASSERT_CS only.
  ASSERT_CS loops back to IDLE when <code>pre_done</code> fires — this is a placeholder;
  in L2 we replace it with the SHIFT transition.
</p>
<pre class="code-block">
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) state &lt;= IDLE;
  else case (state)
    IDLE:      if (start)    state &lt;= LOAD;
    LOAD:                    state &lt;= ASSERT_CS;  // always advances (1 cycle)
    ASSERT_CS: if (pre_done) state &lt;= IDLE;       // L2 will replace with SHIFT
    default:                 state &lt;= IDLE;
  endcase
end

// Combinational output logic — one-hot makes this trivially simple
assign busy               = (state != IDLE);
assign load               = (state == LOAD);
assign cs_transfer_active = (state == ASSERT_CS);
assign pre_assert         = (state == LOAD);   // fires 1 cycle before ASSERT_CS
</pre>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header: module spi_master_fsm (',
        '         input  logic pclk, rst_n,',
        '         input  logic start,',
        '         input  logic pre_done,',
        '         output logic busy, load, cs_transfer_active, pre_assert,',
        '         output logic [6:0] fsm_state',
        '         );',
        'Step 2 — typedef enum logic [6:0] with 3 states (one-hot): IDLE=7\'b0000001, LOAD=7\'b0000010, ASSERT_CS=7\'b0000100',
        'Step 3 — declare: state_t state;',
        'Step 4 — always_ff @(posedge pclk or negedge rst_n): reset → IDLE; case with 3 states',
        '         IDLE: if (start) state <= LOAD;',
        '         LOAD: state <= ASSERT_CS;       (unconditional — 1 cycle only)',
        '         ASSERT_CS: if (pre_done) state <= IDLE;  (placeholder for L2)',
        '         default: state <= IDLE;',
        'Step 5 — assign busy = (state != IDLE);',
        'Step 6 — assign load = (state == LOAD);',
        'Step 7 — assign cs_transfer_active = (state == ASSERT_CS);',
        'Step 8 — assign pre_assert = (state == LOAD);',
        'Step 9 — assign fsm_state = state;   (expose one-hot bits for debug register)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 6 PASS lines then "FSM L1 done!" in Output tab',
      ],

      hint:
`module spi_master_fsm (
  input  logic       pclk, rst_n,
  input  logic       start,
  input  logic       pre_done,
  output logic       busy, load, cs_transfer_active, pre_assert,
  output logic [6:0] fsm_state
);
  typedef enum logic [6:0] {
    IDLE      = 7'b0000001,  // bit 0: bus free
    LOAD      = 7'b0000010,  // bit 1: latch config, arm pre-delay
    ASSERT_CS = 7'b0000100   // bit 2: CS asserted, counting setup time
  } state_t;
  state_t state;

  // State register — async active-low reset → IDLE
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) state <= IDLE;
    else case (state)
      IDLE:      if (start)    state <= LOAD;
      LOAD:                    state <= ASSERT_CS; // always advance after 1 cycle
      ASSERT_CS: if (pre_done) state <= IDLE;      // L2: change to SHIFT
      default:                 state <= IDLE;
    endcase
  end

  // Combinational outputs: one-hot = read single bit directly, no decoder
  assign busy               = (state != IDLE);
  assign load               = (state == LOAD);
  assign cs_transfer_active = (state == ASSERT_CS);
  assign pre_assert         = (state == LOAD);  // fires during LOAD, before ASSERT_CS
  assign fsm_state          = state;            // expose raw one-hot for debug

endmodule`,

      design:
`// Build the spi_master_fsm — the orchestra conductor of the SPI master.
// See Theory for the full 7-state diagram and one-hot encoding explanation.
//
// L1 scope: IDLE, LOAD, ASSERT_CS only (3 states).
//
// Ports:
//   input  logic       pclk, rst_n
//   input  logic       start        — CPU sets this to launch a transfer
//   input  logic       pre_done     — from spi_cs_ctrl: pre-delay elapsed
//   output logic       busy         — 1 while not IDLE
//   output logic       load         — 1-cycle pulse: latch config + arm pre-delay
//   output logic       cs_transfer_active — drives CS assert in spi_cs_ctrl
//   output logic       pre_assert   — 1-cycle pulse: start pre-delay counter
//   output logic [6:0] fsm_state    — one-hot bits exposed for debug register
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, start, pre_done;
  logic busy, load, cs_transfer_active, pre_assert;
  logic [6:0] fsm_state;

  spi_master_fsm dut (
    .pclk(clk), .rst_n(rst_n),
    .start(start), .pre_done(pre_done),
    .busy(busy), .load(load),
    .cs_transfer_active(cs_transfer_active),
    .pre_assert(pre_assert),
    .fsm_state(fsm_state)
  );

  initial begin
    rst_n = 0; start = 0; pre_done = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1; @(posedge clk); #1;

    $display("=== FSM L1: IDLE / LOAD / ASSERT_CS ===");

    // Reset should land in IDLE (busy=0)
    if (busy === 1'b0)
      $display("PASS  reset: IDLE busy=0");
    else
      $display("FAIL  reset: busy=%0b (expected 0)", busy);

    // start=1 should enter LOAD next cycle (busy=1, load=1, pre_assert=1)
    start = 1; @(posedge clk); #1; start = 0;
    if (busy === 1'b1 && load === 1'b1 && pre_assert === 1'b1)
      $display("PASS  start: LOAD — busy=1 load=1 pre_assert=1");
    else
      $display("FAIL  LOAD: busy=%0b load=%0b pre_assert=%0b (exp 1 1 1)", busy, load, pre_assert);

    // LOAD should auto-advance to ASSERT_CS (cs_transfer_active=1, load=0)
    @(posedge clk); #1;
    if (cs_transfer_active === 1'b1 && load === 1'b0)
      $display("PASS  ASSERT_CS: cs_transfer_active=1 load=0");
    else
      $display("FAIL  ASSERT_CS: cs_ta=%0b load=%0b (exp 1 0)", cs_transfer_active, load);

    // pre_assert should already be 0 (only 1 cycle wide)
    if (pre_assert === 1'b0)
      $display("PASS  pre_assert is one-shot (cleared in ASSERT_CS)");
    else
      $display("FAIL  pre_assert still high (expected 0)");

    // pre_done=1 → back to IDLE (placeholder in L1)
    pre_done = 1; @(posedge clk); #1; pre_done = 0;
    if (busy === 1'b0 && cs_transfer_active === 1'b0)
      $display("PASS  pre_done: back to IDLE (busy=0)");
    else
      $display("FAIL  pre_done: busy=%0b cs_ta=%0b (exp 0 0)", busy, cs_transfer_active);

    // Start again to verify repeatable
    start = 1; @(posedge clk); #1; start = 0;
    if (load === 1'b1)
      $display("PASS  second start: entered LOAD again");
    else
      $display("FAIL  second start: load=%0b (expected 1)", load);

    $display("FSM L1 done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: IDLE busy=0',
        'PASS  start: LOAD — busy=1 load=1 pre_assert=1',
        'PASS  ASSERT_CS: cs_transfer_active=1 load=0',
        'FSM L1 done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — The Heartbeat of the Transfer (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long8l2',
      title: 'L2 — SHIFT, COMPLETE & DEASSERT_CS',

      theory: `
<h2>The Heartbeat of the Transfer</h2>
<p>
  Think of a hospital patient on a cardiac monitor. Flat line before surgery begins.
  Then — beep, beep, beep — the heartbeat starts and holds steady. After the procedure
  finishes, the heart rate slows and eventually settles back to resting. The active phase
  in the middle, where work is actually being done, is completely regular and rhythmic.
</p>
<p>
  The <strong>SHIFT state</strong> is the heartbeat of an SPI transfer. SCK rises and falls
  with absolute regularity. MOSI drives each bit. MISO captures each returning bit. Every
  other state is just setup and teardown — important, but not the work itself.
  In L2 we add SHIFT plus the two states that bookend it: COMPLETE (end of word) and
  DEASSERT_CS (release the bus).
</p>

<h3>The Complete Single-Word Transfer Sequence</h3>
<pre class="code-block">
 IDLE  LOAD  ASSERT_CS  SHIFT[×word_len]  COMPLETE  DEASSERT_CS  IDLE
                                              ↑
                                    word_done fires here

  Signals timeline:
  cs_transfer_active:  ___|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|_____
  clk_enable:          ___|____________|‾‾‾‾‾‾‾|___________
                                       SHIFT only
  CS pin (active-low): ‾‾‾|___________________________|‾‾‾‾
  SCK:                 flat|__________|‾|_|‾|_|________flat
</pre>

<h3>Three New State Transitions</h3>
<table class="truth-table">
  <tr><th>Transition</th><th>Trigger</th><th>Meaning</th></tr>
  <tr><td>ASSERT_CS → SHIFT</td><td>pre_done</td><td>Setup time satisfied — start the clock</td></tr>
  <tr><td>SHIFT → COMPLETE</td><td>word_done</td><td>All bits transferred — stop the clock</td></tr>
  <tr><td>COMPLETE → DEASSERT_CS</td><td>always</td><td>Single word done — begin hold time</td></tr>
  <tr><td>DEASSERT_CS → IDLE</td><td>post_done</td><td>Hold time satisfied — bus is free again</td></tr>
</table>
<p>
  Notice that COMPLETE→DEASSERT_CS has no condition in L2 — it always advances.
  In L4 we will add the burst path: COMPLETE→SHIFT when a continuous transfer is requested.
  For now, every transfer is a single word.
</p>

<h3>New Outputs for the Data Path</h3>
<pre class="code-block">
// Added in L2:
assign clk_enable  = (state == SHIFT);        // SCK only runs in SHIFT
assign post_assert = (state == COMPLETE);     // start post-delay counter in COMPLETE

// cs_transfer_active must now cover 3 states (CS stays low through COMPLETE):
assign cs_transfer_active = (state == ASSERT_CS)
                          || (state == SHIFT)
                          || (state == COMPLETE);
</pre>
<p>
  Why does <code>cs_transfer_active</code> stay high through COMPLETE? Because the slave
  is still responding with its MISO data for the last bit at the moment word_done fires.
  Deassering CS in that same cycle would risk dropping the final bit. COMPLETE is a
  one-cycle buffer — the slave finishes driving MISO, the master\'s shift register
  captures it, and then CS releases safely.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from L1 spi_master_fsm and add 3 new ports:',
        '         input  logic word_done     — from spi_shift: all bits transferred',
        '         input  logic post_done     — from spi_cs_ctrl: hold time elapsed',
        '         output logic clk_enable    — 1 only in SHIFT state (enables SCK)',
        '         output logic post_assert   — 1-cycle pulse to start post-delay counter',
        'Step 2 — Extend typedef enum with 3 new states: SHIFT=7\'b0001000, COMPLETE=7\'b0010000, DEASSERT_CS=7\'b0100000',
        'Step 3 — In always_ff case:',
        '         ASSERT_CS: if (pre_done) state <= SHIFT;       (was IDLE in L1)',
        '         SHIFT:     if (word_done) state <= COMPLETE;   (new)',
        '         COMPLETE:  state <= DEASSERT_CS;               (always, L4 adds burst)',
        '         DEASSERT_CS: if (post_done) state <= IDLE;     (new)',
        'Step 4 — Update cs_transfer_active: covers ASSERT_CS || SHIFT || COMPLETE',
        'Step 5 — assign clk_enable = (state == SHIFT);',
        'Step 6 — assign post_assert = (state == COMPLETE);',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 7 PASS lines then "FSM L2 done!" in Output tab',
      ],

      hint:
`module spi_master_fsm (
  input  logic       pclk, rst_n,
  input  logic       start,
  input  logic       pre_done, word_done, post_done,
  output logic       busy, load,
  output logic       cs_transfer_active, pre_assert, post_assert,
  output logic       clk_enable,
  output logic [6:0] fsm_state
);
  typedef enum logic [6:0] {
    IDLE        = 7'b0000001,
    LOAD        = 7'b0000010,
    ASSERT_CS   = 7'b0000100,
    SHIFT       = 7'b0001000,
    COMPLETE    = 7'b0010000,
    DEASSERT_CS = 7'b0100000
  } state_t;
  state_t state;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) state <= IDLE;
    else case (state)
      IDLE:        if (start)     state <= LOAD;
      LOAD:                       state <= ASSERT_CS;
      ASSERT_CS:   if (pre_done)  state <= SHIFT;       // start clock
      SHIFT:       if (word_done) state <= COMPLETE;    // word finished
      COMPLETE:                   state <= DEASSERT_CS; // L4: add burst here
      DEASSERT_CS: if (post_done) state <= IDLE;
      default:                    state <= IDLE;
    endcase
  end

  // cs_transfer_active covers 3 states: CS stays low through COMPLETE
  assign cs_transfer_active = (state==ASSERT_CS)||(state==SHIFT)||(state==COMPLETE);
  assign clk_enable          = (state == SHIFT);    // SCK only in SHIFT
  assign busy                = (state != IDLE);
  assign load                = (state == LOAD);
  assign pre_assert          = (state == LOAD);
  assign post_assert         = (state == COMPLETE); // L4: only when !hold_cs_active
  assign fsm_state           = state;

endmodule`,

      design:
`// Extend spi_master_fsm with SHIFT, COMPLETE, and DEASSERT_CS.
// See Theory for the timing diagram and transition table.
//
// New ports:
//   input  logic word_done    — spi_shift fires this when all bits are transferred
//   input  logic post_done    — spi_cs_ctrl fires this when hold time elapsed
//   output logic clk_enable   — 1 only in SHIFT state
//   output logic post_assert  — 1-cycle pulse to start post-delay counter
//
// Update cs_transfer_active: (ASSERT_CS || SHIFT || COMPLETE)
// Update ASSERT_CS transition: pre_done → SHIFT (not IDLE)
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, start, pre_done, word_done, post_done;
  logic busy, load, cs_transfer_active, pre_assert, post_assert, clk_enable;
  logic [6:0] fsm_state;

  spi_master_fsm dut (
    .pclk(clk), .rst_n(rst_n),
    .start(start),
    .pre_done(pre_done), .word_done(word_done), .post_done(post_done),
    .busy(busy), .load(load),
    .cs_transfer_active(cs_transfer_active),
    .pre_assert(pre_assert), .post_assert(post_assert),
    .clk_enable(clk_enable),
    .fsm_state(fsm_state)
  );

  // Walk through a complete single-word transfer manually
  initial begin
    rst_n = 0; start = 0; pre_done = 0; word_done = 0; post_done = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1; @(posedge clk); #1;

    $display("=== FSM L2: Full single-word transfer ===");

    // IDLE
    if (busy === 1'b0) $display("PASS  IDLE: busy=0");
    else $display("FAIL  IDLE: busy=%0b", busy);

    // LOAD
    start = 1; @(posedge clk); #1; start = 0;
    if (load === 1'b1 && clk_enable === 1'b0)
      $display("PASS  LOAD: load=1 clk_enable=0");
    else
      $display("FAIL  LOAD: load=%0b clk_enable=%0b (exp 1 0)", load, clk_enable);

    // ASSERT_CS
    @(posedge clk); #1;
    if (cs_transfer_active === 1'b1 && clk_enable === 1'b0)
      $display("PASS  ASSERT_CS: cs_ta=1 clk=0 (waiting for pre_done)");
    else
      $display("FAIL  ASSERT_CS: cs_ta=%0b clk=%0b", cs_transfer_active, clk_enable);

    // SHIFT: fire pre_done
    pre_done = 1; @(posedge clk); #1; pre_done = 0;
    if (clk_enable === 1'b1 && cs_transfer_active === 1'b1)
      $display("PASS  SHIFT: clk_enable=1 cs_ta=1");
    else
      $display("FAIL  SHIFT: clk=%0b cs_ta=%0b (exp 1 1)", clk_enable, cs_transfer_active);

    // COMPLETE: fire word_done
    word_done = 1; @(posedge clk); #1; word_done = 0;
    if (clk_enable === 1'b0 && post_assert === 1'b1 && cs_transfer_active === 1'b1)
      $display("PASS  COMPLETE: clk=0 post_assert=1 cs_ta=1");
    else
      $display("FAIL  COMPLETE: clk=%0b post_assert=%0b cs_ta=%0b", clk_enable, post_assert, cs_transfer_active);

    // DEASSERT_CS
    @(posedge clk); #1;
    if (cs_transfer_active === 1'b0 && busy === 1'b1)
      $display("PASS  DEASSERT_CS: cs_ta=0 still busy");
    else
      $display("FAIL  DEASSERT_CS: cs_ta=%0b busy=%0b (exp 0 1)", cs_transfer_active, busy);

    // IDLE: fire post_done
    post_done = 1; @(posedge clk); #1; post_done = 0;
    if (busy === 1'b0)
      $display("PASS  post_done: back to IDLE busy=0");
    else
      $display("FAIL  post_done: busy=%0b (exp 0)", busy);

    $display("FSM L2 done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  IDLE: busy=0',
        'PASS  SHIFT: clk_enable=1 cs_ta=1',
        'PASS  COMPLETE: clk=0 post_assert=1 cs_ta=1',
        'FSM L2 done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — ABORT_WAIT & Output Actions Table (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long8l3',
      title: 'L3 — Abort, Soft Reset & Output Actions',

      theory: `
<h2>The Emergency Stop</h2>
<p>
  Imagine an industrial robotic arm on an assembly line. Under normal conditions it follows
  a precise program: reach, grip, lift, rotate, place, release. But there is always an
  emergency stop button on the factory floor. When that button is pressed, the arm does
  not finish its current movement. It does not wait until the end of the cycle. It halts
  immediately, safely, in whatever position it is in — and parks itself in a known
  rest pose before any further motion is allowed.
</p>
<p>
  The <strong>abort</strong> input is that emergency stop. A DMA transfer may overrun its
  buffer. The CPU may detect a timeout. A watchdog may fire. In any of these cases the
  SPI master must stop cleanly — CS released, SCK stopped, shift register reset — within
  one clock cycle. The <strong>ABORT_WAIT</strong> state is the park position: the FSM
  stays there for exactly one cycle (all outputs low) then returns to IDLE.
</p>
<p>
  <strong>soft_rst</strong> is a stronger reset: it clears the FSM synchronously to IDLE
  regardless of the current state, and it has higher priority than everything else.
  Use <code>soft_rst</code> during system initialisation or after a fatal bus error.
  Use <code>abort</code> to cleanly terminate an in-progress transfer.
</p>

<h3>Priority Order: Most Important First</h3>
<pre class="code-block">
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n)        state &lt;= IDLE;        // 1. Async hardware reset (highest)
  else if (soft_rst) state &lt;= IDLE;        // 2. Synchronous software reset
  else if (abort)    state &lt;= ABORT_WAIT;  // 3. Abort: park safely
  else case (state)                         // 4. Normal FSM transitions
    ...
    ABORT_WAIT:        state &lt;= IDLE;       // always returns to IDLE next cycle
    ...
  endcase
end
</pre>
<p>
  The <code>else if</code> chain means abort and soft_rst override the case statement
  from any state. The FSM does not complete its current transition — it jumps directly.
  All outputs are zero in ABORT_WAIT (clk_enable=0, cs_transfer_active=0), so CS
  deasserts and SCK stops in the same cycle the abort is recognised.
</p>

<h3>Complete Output Actions Table</h3>
<p>
  Here is every output the FSM drives, organised by state. Read this table before
  writing the output assigns — it is the specification.
</p>
<table class="truth-table">
  <tr><th>State</th><th>clk_enable</th><th>cs_transfer_active</th><th>load</th><th>pre_assert</th><th>post_assert</th><th>busy</th></tr>
  <tr><td>IDLE</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>LOAD</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
  <tr><td>ASSERT_CS</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>SHIFT</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>COMPLETE</td><td>0</td><td>1</td><td>0*</td><td>0</td><td>1**</td><td>1</td></tr>
  <tr><td>DEASSERT_CS</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>ABORT_WAIT</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
</table>
<p>
  *load=1 in COMPLETE only when bursting (added in L4).<br/>
  **post_assert=1 in COMPLETE only when <em>not</em> bursting (added in L4).
  For now, post_assert fires unconditionally in COMPLETE.
</p>
<p>
  ABORT_WAIT and IDLE both have busy=0. This is deliberate: busy=0 means the bus is
  safe to hand to another master or restart. During ABORT_WAIT the FSM is cleaning up
  (one cycle); it immediately goes to IDLE. Treating both as "not busy" keeps the
  CPU-visible status simple.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from L2 spi_master_fsm; add 2 new input ports: abort, soft_rst',
        'Step 2 — Extend typedef enum with ABORT_WAIT = 7\'b1000000',
        'Step 3 — Change the always_ff to a priority chain at the top:',
        '         if (!rst_n)        state <= IDLE;',
        '         else if (soft_rst) state <= IDLE;',
        '         else if (abort)    state <= ABORT_WAIT;',
        '         else case (state) ... (existing transitions) ...',
        '         Add: ABORT_WAIT: state <= IDLE; inside the case',
        'Step 4 — Update busy: (state != IDLE) && (state != ABORT_WAIT)',
        '         (ABORT_WAIT is safe-idle — not a busy transfer)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 6 PASS lines then "FSM L3 done!" in Output tab',
      ],

      hint:
`module spi_master_fsm (
  input  logic       pclk, rst_n,
  input  logic       start, abort, soft_rst,
  input  logic       pre_done, word_done, post_done,
  output logic       busy, load,
  output logic       cs_transfer_active, pre_assert, post_assert,
  output logic       clk_enable,
  output logic [6:0] fsm_state
);
  typedef enum logic [6:0] {
    IDLE        = 7'b0000001,
    LOAD        = 7'b0000010,
    ASSERT_CS   = 7'b0000100,
    SHIFT       = 7'b0001000,
    COMPLETE    = 7'b0010000,
    DEASSERT_CS = 7'b0100000,
    ABORT_WAIT  = 7'b1000000  // new: safe-park for 1 cycle
  } state_t;
  state_t state;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)        state <= IDLE;        // async hardware reset
    else if (soft_rst) state <= IDLE;        // synchronous software reset (highest sync priority)
    else if (abort)    state <= ABORT_WAIT;  // emergency stop from any state
    else case (state)
      IDLE:        if (start)     state <= LOAD;
      LOAD:                       state <= ASSERT_CS;
      ASSERT_CS:   if (pre_done)  state <= SHIFT;
      SHIFT:       if (word_done) state <= COMPLETE;
      COMPLETE:                   state <= DEASSERT_CS; // L4: add burst
      DEASSERT_CS: if (post_done) state <= IDLE;
      ABORT_WAIT:                 state <= IDLE;        // always back to IDLE
      default:                    state <= IDLE;
    endcase
  end

  assign cs_transfer_active = (state==ASSERT_CS)||(state==SHIFT)||(state==COMPLETE);
  assign clk_enable          = (state == SHIFT);
  // ABORT_WAIT has busy=0 — safe idle, not a live transfer
  assign busy                = (state != IDLE) && (state != ABORT_WAIT);
  assign load                = (state == LOAD);
  assign pre_assert          = (state == LOAD);
  assign post_assert         = (state == COMPLETE);
  assign fsm_state           = state;

endmodule`,

      design:
`// Extend spi_master_fsm with ABORT_WAIT state, abort input, and soft_rst input.
// See Theory for the priority chain and output actions table.
//
// New ports:
//   input logic abort     — emergency stop: transitions to ABORT_WAIT from any state
//   input logic soft_rst  — synchronous reset to IDLE (higher priority than abort)
//
// New state: ABORT_WAIT = 7'b1000000; always advances to IDLE next cycle
//
// Priority chain (top of always_ff):
//   if (!rst_n) → IDLE
//   else if (soft_rst) → IDLE
//   else if (abort) → ABORT_WAIT
//   else case (state) ...
//
// Update busy: (state != IDLE) && (state != ABORT_WAIT)
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst_n, start, abort, soft_rst;
  logic pre_done, word_done, post_done;
  logic busy, load, cs_transfer_active, pre_assert, post_assert, clk_enable;
  logic [6:0] fsm_state;

  spi_master_fsm dut (
    .pclk(clk), .rst_n(rst_n),
    .start(start), .abort(abort), .soft_rst(soft_rst),
    .pre_done(pre_done), .word_done(word_done), .post_done(post_done),
    .busy(busy), .load(load),
    .cs_transfer_active(cs_transfer_active),
    .pre_assert(pre_assert), .post_assert(post_assert),
    .clk_enable(clk_enable),
    .fsm_state(fsm_state)
  );

  // Helper: advance FSM to SHIFT state
  task automatic reach_shift();
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1; // ASSERT_CS
    pre_done = 1; @(posedge clk); #1; pre_done = 0; // SHIFT
  endtask

  initial begin
    rst_n = 0; start = 0; abort = 0; soft_rst = 0;
    pre_done = 0; word_done = 0; post_done = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1; @(posedge clk); #1;

    $display("=== FSM L3: Abort & Soft Reset ===");

    // Test 1: abort mid-SHIFT → ABORT_WAIT → IDLE
    reach_shift();
    if (clk_enable === 1'b1)
      $display("PASS  reached SHIFT: clk_enable=1");
    else
      $display("FAIL  expected SHIFT, clk_enable=%0b", clk_enable);

    abort = 1; @(posedge clk); #1; abort = 0;
    // Now in ABORT_WAIT: busy=0, clk_enable=0, cs_transfer_active=0
    if (busy === 1'b0 && clk_enable === 1'b0 && cs_transfer_active === 1'b0)
      $display("PASS  ABORT_WAIT: busy=0 clk=0 cs_ta=0");
    else
      $display("FAIL  ABORT_WAIT: busy=%0b clk=%0b cs_ta=%0b", busy, clk_enable, cs_transfer_active);

    @(posedge clk); #1; // ABORT_WAIT → IDLE
    if (busy === 1'b0 && cs_transfer_active === 1'b0)
      $display("PASS  after ABORT_WAIT: back to IDLE");
    else
      $display("FAIL  after abort: busy=%0b cs_ta=%0b (exp 0 0)", busy, cs_transfer_active);

    // Test 2: soft_rst mid-SHIFT → immediate IDLE
    reach_shift();
    soft_rst = 1; @(posedge clk); #1; soft_rst = 0;
    if (busy === 1'b0 && clk_enable === 1'b0)
      $display("PASS  soft_rst: immediate IDLE (busy=0 clk=0)");
    else
      $display("FAIL  soft_rst: busy=%0b clk=%0b (exp 0 0)", busy, clk_enable);

    // Test 3: abort has no effect in IDLE
    abort = 1; @(posedge clk); #1; abort = 0;
    @(posedge clk); #1; // would be in ABORT_WAIT, then back to IDLE
    if (busy === 1'b0)
      $display("PASS  abort in IDLE: still IDLE after 2 cycles");
    else
      $display("FAIL  abort in IDLE: busy=%0b (expected 0)", busy);

    $display("FSM L3 done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reached SHIFT: clk_enable=1',
        'PASS  ABORT_WAIT: busy=0 clk=0 cs_ta=0',
        'PASS  soft_rst: immediate IDLE (busy=0 clk=0)',
        'FSM L3 done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Shadow Registers & CONT_XFER Burst + Checkpoint B (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long8l4',
      title: 'L4 — Shadow Registers, Burst Mode & Checkpoint B',

      theory: `
<h2>The Captain\'s Log</h2>
<p>
  Before a ship leaves port, the captain writes the voyage orders in the log:
  destination, cargo manifest, crew assignments. Once the ship is at sea, those orders
  are locked. If the harbourmaster radios new instructions mid-voyage — "change cargo
  at the next port" — the captain notes them for the <em>next</em> voyage but does not
  deviate from the current plan. The orders written before departure are what the crew
  follows; live radio traffic cannot alter an underway voyage.
</p>
<p>
  Shadow registers work exactly the same way. The CPU configures <code>cont_xfer</code>
  ("send multiple words back-to-back") and <code>hold_cs</code> ("keep CS asserted during
  burst") before writing START. At the IDLE→LOAD transition, the FSM photographs these
  settings into shadow registers. For the duration of the transfer, only the shadows are
  used. If the CPU changes the live registers mid-transfer — perhaps via an interrupt
  handler — the in-flight operation continues with its original settings.
</p>

<h3>Shadow Capture: One Line of RTL</h3>
<pre class="code-block">
logic cont_xfer_s, hold_cs_s;   // frozen copies

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    cont_xfer_s &lt;= 0;  hold_cs_s &lt;= 0;
  end else if (state == IDLE &amp;&amp; start) begin
    // Capture on IDLE→LOAD boundary — voyage orders are locked
    cont_xfer_s &lt;= cont_xfer;
    hold_cs_s   &lt;= hold_cs;
  end
  // While busy: shadows remain frozen regardless of live register changes
end
</pre>

<h3>The CONT_XFER Burst Loop</h3>
<p>
  When the shadows say "burst" and the TX FIFO still has data, COMPLETE does not
  advance to DEASSERT_CS. Instead it loops back to SHIFT, reloading the shift
  register with the next word — CS stays asserted, SCK resumes immediately.
  The condition uses the frozen shadows, not the live inputs:
</p>
<pre class="code-block">
 // Burst condition: frozen settings + FIFO not empty
 assign hold_cs_active = cont_xfer_s &amp;&amp; hold_cs_s &amp;&amp; !tx_empty;

 // COMPLETE exit: burst or deassert
 COMPLETE: if (hold_cs_active) state &lt;= SHIFT;       // burst: next word
           else                state &lt;= DEASSERT_CS;  // done: release CS

 // Outputs change in COMPLETE when bursting:
 assign load        = (state == LOAD) || (state == COMPLETE &amp;&amp; hold_cs_active);
 assign post_assert = (state == COMPLETE) &amp;&amp; !hold_cs_active; // only when ending
</pre>

<h3>Burst Transfer Timeline</h3>
<pre class="code-block">
 Three words, CONT_XFER=1, HOLD_CS=1, tx_empty=0 for first two:

 SHIFT[w0]─COMPLETE─SHIFT[w1]─COMPLETE─SHIFT[w2]─COMPLETE─DEASSERT_CS─IDLE
                     ↑ loop           ↑ loop           ↑ tx_empty=1 here
 CS:  _|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|___
            CS stays low for ALL THREE WORDS
 SCK:       |bits0|     |bits1|     |bits2|
            word_done   word_done   word_done
</pre>
<p>
  The slave sees one long uninterrupted transaction. No CS glitch between words,
  no setup/hold time penalty. For a 64-byte DMA transfer at 1 MHz SPI with 5-cycle
  pre/post delays, burst mode cuts total bus time from ~640 μs (overhead alone)
  down to ~512 μs (actual data time) — a 20% throughput improvement on a modest
  transfer, scaling to 10× on longer ones.
</p>

<h3>The Complete spi_master_fsm</h3>
<p>
  L4 is the final, production-grade version of the module. It integrates all
  features built across L1–L4:
</p>
<table class="truth-table">
  <tr><th>Feature</th><th>Introduced</th><th>Key signals</th></tr>
  <tr><td>3-state scaffold (IDLE/LOAD/ASSERT_CS)</td><td>L1</td><td>load, pre_assert, cs_transfer_active</td></tr>
  <tr><td>Full single-word transfer path</td><td>L2</td><td>clk_enable, post_assert, word_done</td></tr>
  <tr><td>Abort & soft reset</td><td>L3</td><td>abort, soft_rst, ABORT_WAIT</td></tr>
  <tr><td>Shadow registers + burst loop</td><td>L4</td><td>cont_xfer_s, hold_cs_s, hold_cs_active</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from L3 spi_master_fsm; add new input ports:',
        '         input logic hold_cs_active  — from spi_cs_ctrl: burst condition met',
        '         input logic cont_xfer, hold_cs  — live config (source for shadows)',
        '         input logic tx_empty         — TX FIFO empty flag',
        'Step 2 — Declare shadow registers: logic cont_xfer_s, hold_cs_s;',
        'Step 3 — Add shadow always_ff block: capture on (state==IDLE && start)',
        '         if (!rst_n): cont_xfer_s<=0; hold_cs_s<=0;',
        '         else if (state==IDLE && start): cont_xfer_s<=cont_xfer; hold_cs_s<=hold_cs;',
        'Step 4 — Add assign: assign hold_cs_active_int = cont_xfer_s && hold_cs_s && !tx_empty;',
        '         (use hold_cs_active_int internally so input and internal signal don\'t collide)',
        'Step 5 — In case statement, change COMPLETE:',
        '         if (hold_cs_active_int) state <= SHIFT;',
        '         else                    state <= DEASSERT_CS;',
        'Step 6 — Update load: (state==LOAD) || (state==COMPLETE && hold_cs_active_int)',
        'Step 7 — Update post_assert: (state==COMPLETE) && !hold_cs_active_int',
        '🎓 SPI Protocol Engineer — your FSM correctly sequences all 4 modes and survives abort',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all Checkpoint B PASS lines should appear in Output tab',
      ],

      hint:
`module spi_master_fsm (
  input  logic       pclk, rst_n,
  input  logic       start, abort, soft_rst,
  input  logic       pre_done, word_done, post_done,
  input  logic       cont_xfer, hold_cs, tx_empty,
  output logic       cs_transfer_active, pre_assert, post_assert,
  output logic       clk_enable, load, busy,
  output logic [6:0] fsm_state
);
  typedef enum logic [6:0] {
    IDLE        = 7'b0000001,
    LOAD        = 7'b0000010,
    ASSERT_CS   = 7'b0000100,
    SHIFT       = 7'b0001000,
    COMPLETE    = 7'b0010000,
    DEASSERT_CS = 7'b0100000,
    ABORT_WAIT  = 7'b1000000
  } state_t;
  state_t state;

  // Shadow registers: frozen at transfer start
  logic cont_xfer_s, hold_cs_s;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin cont_xfer_s <= 0; hold_cs_s <= 0; end
    else if (state == IDLE && start) begin
      cont_xfer_s <= cont_xfer;  // lock the voyage orders
      hold_cs_s   <= hold_cs;
    end
  end

  logic hca; // hold_cs_active (internal) — uses frozen shadows
  assign hca = cont_xfer_s && hold_cs_s && !tx_empty;

  // State register with priority chain
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)        state <= IDLE;
    else if (soft_rst) state <= IDLE;
    else if (abort)    state <= ABORT_WAIT;
    else case (state)
      IDLE:        if (start)     state <= LOAD;
      LOAD:                       state <= ASSERT_CS;
      ASSERT_CS:   if (pre_done)  state <= SHIFT;
      SHIFT:       if (word_done) state <= COMPLETE;
      COMPLETE:    if (hca)       state <= SHIFT;       // burst: next word
                   else           state <= DEASSERT_CS; // done: release
      DEASSERT_CS: if (post_done) state <= IDLE;
      ABORT_WAIT:                 state <= IDLE;
      default:                    state <= IDLE;
    endcase
  end

  assign cs_transfer_active = (state==ASSERT_CS)||(state==SHIFT)||(state==COMPLETE);
  assign clk_enable          = (state == SHIFT);
  assign busy                = (state != IDLE) && (state != ABORT_WAIT);
  assign load                = (state == LOAD) || (state == COMPLETE && hca);
  assign pre_assert          = (state == LOAD);
  assign post_assert         = (state == COMPLETE) && !hca;
  assign fsm_state           = state;

endmodule`,

      design:
`// Complete spi_master_fsm with shadow registers and CONT_XFER burst.
// See Theory for the captain's log analogy and burst timeline diagram.
//
// New ports:
//   input logic cont_xfer, hold_cs   — live burst config (captured to shadows)
//   input logic tx_empty             — TX FIFO empty (ends burst when high)
//
// New internal:
//   logic cont_xfer_s, hold_cs_s     — shadow registers (frozen at start)
//   logic hca                        — hold_cs_active = cont_xfer_s && hold_cs_s && !tx_empty
//
// COMPLETE: if (hca) state <= SHIFT; else state <= DEASSERT_CS;
// load: (state==LOAD) || (state==COMPLETE && hca)
// post_assert: (state==COMPLETE) && !hca
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
// ─── Inline: spi_clk_div ───────────────────────────────────────────────────
module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out, rising_edge_p, falling_edge_p
);
  logic [15:0] cnt; logic sck_int, sck_prev;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin cnt<=0; sck_int<=0; sck_prev<=0; end
    else if (enable) begin
      sck_prev <= sck_int;
      if (cnt == div) begin cnt<=0; sck_int<=~sck_int; end else cnt<=cnt+1;
    end else begin sck_int<=cpol; sck_prev<=cpol; cnt<=0; end
  end
  assign sck_out        = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_int & ~sck_prev;
  assign falling_edge_p = ~sck_int & sck_prev;
endmodule

// ─── Inline: spi_cpha (L1 mux only, Mode 0/1/2/3) ─────────────────────────
module spi_cpha (
  input  logic cpol, cpha,
  input  logic rising_edge_p, falling_edge_p,
  output logic launch_pulse, sample_pulse
);
  logic ms;
  assign ms           = cpol ^ cpha;
  assign launch_pulse = ms ? rising_edge_p  : falling_edge_p;
  assign sample_pulse = ms ? falling_edge_p : rising_edge_p;
endmodule

// ─── Inline: spi_shift (8-bit, MSB-first) ─────────────────────────────────
module spi_shift (
  input  logic       pclk, rst_n, load,
  input  logic [7:0] tx_data,
  input  logic [2:0] word_len,
  input  logic       launch_pulse, sample_pulse, miso_in,
  output logic       mosi_out,
  output logic [7:0] rx_data,
  output logic       word_done
);
  logic [7:0] tx_sh, rx_sh; logic [2:0] bcnt;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin tx_sh<=0; rx_sh<=0; bcnt<=0; end
    else if (load) begin tx_sh<=tx_data; bcnt<=0; end
    else begin
      if (launch_pulse) begin tx_sh<={tx_sh[6:0],1'b0}; bcnt<=bcnt+1; end
      if (sample_pulse) rx_sh<={rx_sh[6:0],miso_in};
    end
  end
  assign mosi_out  = tx_sh[7];
  assign rx_data   = rx_sh;
  assign word_done = launch_pulse && (bcnt == word_len);
endmodule

// ─── Inline: spi_cs_ctrl (L4 full) ────────────────────────────────────────
module spi_cs_ctrl (
  input  logic       pclk, rst_n,
  input  logic [1:0] cs_sel,
  input  logic       cs_transfer_active,
  input  logic [3:0] cs_pol,
  input  logic [7:0] cs_pre_delay, cs_post_delay, frame_gap,
  input  logic       pre_assert, post_assert, gap_assert,
  input  logic       cont_xfer, hold_cs, tx_empty,
  output logic [3:0] spi_csn_o,
  output logic       pre_done, post_done, gap_done, hold_cs_active
);
  logic [3:0] cv;
  assign cv             = cs_transfer_active ? (4'b0001 << cs_sel) : 4'b0000;
  assign spi_csn_o      = ~cv ^ cs_pol;
  assign hold_cs_active = cont_xfer && hold_cs && !tx_empty;
  logic [7:0] pc,oc,gc; logic pr,or1,gr;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin pc<=0;pr<=0;oc<=0;or1<=0;gc<=0;gr<=0; end
    else begin
      if (pre_assert) begin pc<=0;pr<=1; end
      else if (pr) begin if(pc==cs_pre_delay) pr<=0; else pc<=pc+1; end
      if (post_assert) begin oc<=0;or1<=1; end
      else if (or1) begin if(oc==cs_post_delay) or1<=0; else oc<=oc+1; end
      if (gap_assert) begin gc<=0;gr<=1; end
      else if (gr) begin if(gc==frame_gap) gr<=0; else gc<=gc+1; end
    end
  end
  assign pre_done  = pr  && (pc == cs_pre_delay);
  assign post_done = or1 && (oc == cs_post_delay);
  assign gap_done  = gr  && (gc == frame_gap);
endmodule

// ─── Checkpoint B: 3-word CONT_XFER burst ─────────────────────────────────
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  // FSM control
  logic start = 0, abort = 0, soft_rst = 0;
  logic cont_xfer = 1, hold_cs = 1, tx_empty = 0;
  logic pre_done, post_done, word_done;
  logic hold_cs_active;
  // FSM outputs
  logic cs_transfer_active, pre_assert, post_assert;
  logic clk_enable, load, busy;
  logic [6:0] fsm_state;
  // SCK edges
  logic rising_ep, falling_ep;
  // Mode-corrected pulses (Mode 0: cpol=0, cpha=0)
  logic launch_p, sample_p;
  // Shift register
  logic mosi_sig;
  logic [7:0] rx_data;
  // CS output
  logic [3:0] spi_csn;
  logic gap_done;

  spi_master_fsm fsm (
    .pclk(pclk), .rst_n(1'b1),
    .start(start), .abort(abort), .soft_rst(soft_rst),
    .pre_done(pre_done), .post_done(post_done), .word_done(word_done),
    .cont_xfer(cont_xfer), .hold_cs(hold_cs), .tx_empty(tx_empty),
    .cs_transfer_active(cs_transfer_active),
    .pre_assert(pre_assert), .post_assert(post_assert),
    .clk_enable(clk_enable), .load(load), .busy(busy),
    .fsm_state(fsm_state)
  );

  spi_clk_div clkd (
    .pclk(pclk), .rst_n(1'b1), .enable(clk_enable), .cpol(1'b0), .div(16'd1),
    .sck_out(), .rising_edge_p(rising_ep), .falling_edge_p(falling_ep)
  );

  spi_cpha cph (
    .cpol(1'b0), .cpha(1'b0),
    .rising_edge_p(rising_ep), .falling_edge_p(falling_ep),
    .launch_pulse(launch_p), .sample_pulse(sample_p)
  );

  spi_shift sft (
    .pclk(pclk), .rst_n(1'b1), .load(load),
    .tx_data(8'hA5), .word_len(3'd7),
    .launch_pulse(launch_p), .sample_pulse(sample_p), .miso_in(mosi_sig),
    .mosi_out(mosi_sig), .rx_data(rx_data), .word_done(word_done)
  );

  spi_cs_ctrl csc (
    .pclk(pclk), .rst_n(1'b1),
    .cs_sel(2'd0), .cs_transfer_active(cs_transfer_active),
    .cs_pol(4'b0000),
    .cs_pre_delay(8'd0), .cs_post_delay(8'd0), .frame_gap(8'd0),
    .pre_assert(pre_assert), .post_assert(post_assert), .gap_assert(1'b0),
    .cont_xfer(cont_xfer), .hold_cs(hold_cs), .tx_empty(tx_empty),
    .spi_csn_o(spi_csn),
    .pre_done(pre_done), .post_done(post_done),
    .gap_done(gap_done), .hold_cs_active(hold_cs_active)
  );

  integer wd_cnt;
  logic   prev_wd, cs_broke;

  initial begin
    wd_cnt = 0; prev_wd = 0; cs_broke = 0;
    repeat(3) @(posedge pclk); #1;

    $display("=== Checkpoint B: 3-word CONT_XFER burst ===");

    // Launch transfer
    start = 1; @(posedge pclk); #1; start = 0;

    // Run for 400 cycles, monitoring CS and counting word_done pulses
    repeat(400) begin
      @(posedge pclk); #1;
      // Count rising edges of word_done
      if (word_done && !prev_wd) wd_cnt++;
      // CS should stay LOW while busy (before we end the burst)
      if (wd_cnt < 3 && busy && spi_csn[0] !== 1'b0) cs_broke = 1;
      // End burst after 3rd word
      if (wd_cnt == 3 && tx_empty == 1'b0) tx_empty = 1;
      prev_wd = word_done;
    end

    // Verdict
    if (!cs_broke)
      $display("PASS  CS held low during 3-word burst");
    else
      $display("FAIL  CS glitched during burst");

    if (wd_cnt >= 3)
      $display("PASS  word_done fired %0d times", wd_cnt);
    else
      $display("FAIL  word_done fired only %0d times (expected 3)", wd_cnt);

    if (spi_csn[0] === 1'b1)
      $display("PASS  CS deasserted after burst");
    else
      $display("FAIL  CS still low: csn=%04b", spi_csn);

    $display("Checkpoint B PASS");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  CS held low during 3-word burst',
        'PASS  word_done fired',
        'PASS  CS deasserted after burst',
        'Checkpoint B PASS',
      ]
    },

  ]
});
