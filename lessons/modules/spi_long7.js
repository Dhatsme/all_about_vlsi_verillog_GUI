(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long7',
  title: 'CS Controller & Timing',
  icon: '🎯',
  level: 'advanced',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — CS Decode & Polarity (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long7l1',
      title: 'L1 — CS Decode & Polarity',

      theory: `
<h2>Where spi_cs_ctrl Lives — and the Failure It Prevents</h2>
<p>
  We are building a six-module SPI master across this course. Before writing
  any RTL, let's understand exactly where this block fits in the complete
  hardware pipeline. The diagram below shows every module — this chapter
  builds the block marked <strong>★</strong>.
</p>
<pre class="code-block">
  APB Bus (CPU writes control registers and triggers transfers)
       │
       ▼
  ┌──────────────────────┐
  │    spi_reg_block     │  holds: cs_sel, cs_pol, clk_div, cpol, cpha, word_len
  │    (spi_long11)      │
  └──────────┬───────────┘
             │  config signals broadcast to every module below
       ┌─────┴──────────────────────────────────────────────┐
       │                                                    │
       ▼                                                    ▼
  ┌──────────────────┐  cs_transfer_active        ┌──────────────────┐ ★
  │  spi_master_fsm  │ ─────────────────────────► │  spi_cs_ctrl     │
  │   (spi_long8)    │  pre_assert, post_assert    │  (this chapter)  │
  │   next chapter   │ ─────────────────────────► └────────┬─────────┘
  └────────┬─────────┘                                     │
           │ launch_pulse, sample_pulse           spi_csn_o[3:0]
           ▼                                              │
  ┌──────────────────┐                                    ▼
  │    spi_cpha      │                    ┌──────────────────────────────┐
  │   (spi_long6)    │                    │  4 SPI slave IC pins         │
  └────────┬─────────┘                    │  CS[0] flash  CS[2] ADC      │
           │ mode-corrected pulses         │  CS[1] IMU    CS[3] DAC      │
           ▼                              └──────────────────────────────┘
  ┌──────────────────┐
  │    spi_shift     │  mosi_out ──► MOSI pin    miso_in ◄── MISO pin
  │   (spi_long5)    │
  └──────────────────┘
</pre>
<p>
  The FSM (next chapter) is the conductor. It raises
  <code>cs_transfer_active</code> when entering ASSERT_CS state, signalling
  this block to drive the correct pin. It pulses <code>pre_assert</code> and
  <code>post_assert</code> to start the timing counters we add in L2 and L3.
  The CS controller itself has <strong>no state machine</strong> — it reacts
  combinationally to the FSM's commands within one gate delay.
</p>

<h3>The Real Failure: a Four-Slave Sensor Hub</h3>
<p>
  Picture a PCB with four SPI slaves sharing MOSI / MISO / SCK:
</p>
<table class="truth-table">
  <tr><th>CS pin</th><th>Device type</th><th>Active level</th><th>What breaks on a rogue CS glitch</th></tr>
  <tr><td>CS[0]</td><td>SPI NOR Flash</td><td>active-low</td><td>Page Program aborts silently — written page goes blank</td></tr>
  <tr><td>CS[1]</td><td>IMU (gyro + accel)</td><td>active-low</td><td>Register burst read corrupted mid-transfer</td></tr>
  <tr><td>CS[2]</td><td>SAR ADC</td><td>active-low</td><td>Conversion reset, stale sample returned</td></tr>
  <tr><td>CS[3]</td><td>DAC (active-high CS)</td><td><strong>active-high</strong></td><td>Spurious HIGH latches an invalid code into the DAC output</td></tr>
</table>
<p>
  Consider this scenario: a Page Program command is issued to the NOR flash
  (256-byte write, 3 ms internal erase-write cycle). Mid-transfer, a register
  write sets <code>cs_sel = 1</code> without clearing
  <code>cs_transfer_active</code>. Without a proper decode block, CS[0]
  glitches HIGH mid-command. The NOR flash datasheet states:
  <em>"A rising edge on CS# during a Page Program terminates the operation;
  data shifted in is discarded."</em> No error flag is raised. The CPU polls
  the STATUS register, sees WIP = 0 (write complete), and the transaction
  proceeds. The 256-byte page is blank. This class of RTL bug takes days
  to trace.
</p>
<p>
  The fix: <code>cs_sel</code> is latched into a shadow register on transfer
  start (in spi_long8). Only the FSM drives <code>cs_transfer_active</code>.
  Output pins never change during a transfer — only between them.
</p>

<h2>Deriving the Two-Line Implementation</h2>
<p>
  Good RTL designers answer a chain of questions — each answer produces
  exactly one line of hardware.
</p>

<h3>Step 1 — What does this block need to know?</h3>
<p>
  Three inputs: which slave (<code>cs_sel[1:0]</code>, binary 0–3),
  whether a transfer is running (<code>cs_transfer_active</code>),
  and the per-pin active level (<code>cs_pol[3:0]</code>).
  One output: <code>spi_csn_o[3:0]</code> — one bit wired directly to each
  IC chip-select pin. Declare these first; the logic follows from them.
</p>
<pre class="code-block">
module spi_cs_ctrl (
  input  logic [1:0] cs_sel,
  input  logic       cs_transfer_active,
  input  logic [3:0] cs_pol,
  output logic [3:0] spi_csn_o
);
</pre>

<h3>Step 2 — Why not wire cs_sel directly to the output pins?</h3>
<p>
  <code>cs_sel</code> is 2-bit <em>binary</em> (values 0–3). Each slave
  needs its own dedicated wire — four independent bits, exactly one active
  at a time. That is a <strong>one-hot vector</strong>. The left-shift
  operator converts binary to one-hot in a single expression.
  The <code>cs_transfer_active</code> gate collapses the vector to zero when
  the bus is idle — no CS edge fires between transfers.
</p>
<pre class="code-block">
logic [3:0] cs_active_vec;
//  cs_sel=0  →  4'b0001 &lt;&lt; 0  =  4'b0001   (only pin 0 high)
//  cs_sel=1  →  4'b0001 &lt;&lt; 1  =  4'b0010   (only pin 1 high)
//  cs_sel=2  →  4'b0001 &lt;&lt; 2  =  4'b0100   (only pin 2 high)
//  cs_sel=3  →  4'b0001 &lt;&lt; 3  =  4'b1000   (only pin 3 high)
assign cs_active_vec = cs_transfer_active ? (4'b0001 &lt;&lt; cs_sel) : 4'b0000;
// gate: cs_transfer_active=0 → 4'b0000 — no CS edge when FSM is idle
</pre>

<h3>Step 3 — How do we handle the active-high DAC on CS[3]?</h3>
<p>
  Most devices idle HIGH and go LOW when selected (<code>cs_pol[i]=0</code>,
  active-low). Some analog ICs idle LOW and go HIGH when selected
  (<code>cs_pol[i]=1</code>, active-high). Work through all four cases to
  find a single formula that handles both per-pin, without branching:
</p>
<table class="truth-table">
  <tr><th>cs_active_vec[i]</th><th>cs_pol[i]</th><th>~active[i] ^ pol[i]</th><th>IC pin state</th></tr>
  <tr><td>0 — not selected</td><td>0 — active-low</td><td>1 ^ 0 = <strong>1</strong></td><td>HIGH — slave idle ✓</td></tr>
  <tr><td>1 — selected</td><td>0 — active-low</td><td>0 ^ 0 = <strong>0</strong></td><td>LOW — slave asserted ✓</td></tr>
  <tr><td>0 — not selected</td><td>1 — active-high</td><td>1 ^ 1 = <strong>0</strong></td><td>LOW — slave idle ✓</td></tr>
  <tr><td>1 — selected</td><td>1 — active-high</td><td>0 ^ 1 = <strong>1</strong></td><td>HIGH — slave asserted ✓</td></tr>
</table>
<pre class="code-block">
assign spi_csn_o = ~cs_active_vec ^ cs_pol;
// cs_pol=4'b0000 (all active-low):  spi_csn_o = ~cs_active_vec  (common case)
// cs_pol=4'b1000 (CS[3] active-high): CS[3] output inverted; pins 0-2 unchanged
</pre>

<h3>Step 4 — Trace a complete scenario</h3>
<table class="truth-table">
  <tr><th>Scenario</th><th>cs_sel</th><th>cs_pol</th><th>cs_active_vec</th><th>spi_csn_o</th></tr>
  <tr><td>Bus idle (no transfer)</td><td>—</td><td>4'b0000</td><td>4'b0000</td><td>4'b1111 — all slaves idle HIGH</td></tr>
  <tr><td>Flash write (slave 0)</td><td>0</td><td>4'b0000</td><td>4'b0001</td><td>4'b1110 — CS[0] LOW ✓, others idle</td></tr>
  <tr><td>ADC read (slave 2)</td><td>2</td><td>4'b0000</td><td>4'b0100</td><td>4'b1011 — CS[2] LOW ✓, others idle</td></tr>
  <tr><td>DAC update (slave 3, active-high)</td><td>3</td><td>4'b1000</td><td>4'b1000</td><td>4'b1111 — CS[3] HIGH = asserted ✓</td></tr>
</table>
<p>
  No <code>always_ff</code>, no clock. Two <code>assign</code> statements —
  the FSM raises <code>cs_transfer_active</code> and the correct CS pin
  responds within one gate propagation delay (~1–2 ns on FPGA fabric).
</p>
<p>
  In L2 we will add the pre-delay counter: after CS asserts, the FSM stalls
  in ASSERT_CS for a programmable number of PCLK cycles before enabling SCK.
  This enforces the t<sub>CSS</sub> setup time that precision devices require —
  at 50 MHz PCLK even the minimum register value of 1 gives 20 ns, which
  clears the 5 ns datasheet spec for common flash parts with room to spare.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare the module with 3 inputs: cs_sel[1:0], cs_transfer_active, cs_pol[3:0]',
        '         and 1 output: spi_csn_o[3:0]  (one bit per IC chip-select pin)',
        'Step 2 — inside the module declare: logic [3:0] cs_active_vec;',
        'Step 3 — one-hot decode: assign cs_active_vec = cs_transfer_active ? (4\'b0001 << cs_sel) : 4\'b0000;',
        '         self-check: trace cs_sel=2 → 4\'b0001 << 2 = 4\'b0100 — only pin 2 is 1, rest are 0',
        'Step 4 — polarity gate: assign spi_csn_o = ~cs_active_vec ^ cs_pol;',
        '         self-check: cs_pol=0, sel=2 → ~4\'b0100 ^ 0 = 4\'b1011 — CS[2] LOW (asserted) ✓',
        'No always_ff — both lines are purely combinational, react within gate-delay time',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 8 PASS lines (all cs_sel × both polarities) then "CS decode done!" in Output tab',
      ],

      hint:
`module spi_cs_ctrl (
  input  logic [1:0] cs_sel,             // 2-bit binary: which of 4 slaves (0–3)
  input  logic       cs_transfer_active, // from FSM: 1 = transfer active, 0 = idle
  input  logic [3:0] cs_pol,             // per-pin: 0=active-low (default), 1=active-high
  output logic [3:0] spi_csn_o           // direct to IC chip-select pins
);
  // Step 2: one-hot decode — 2-bit binary → 4-bit one-hot vector
  //   cs_sel=0 → 0001, cs_sel=1 → 0010, cs_sel=2 → 0100, cs_sel=3 → 1000
  //   gate: cs_transfer_active=0 → 0000 (no CS edge when FSM is idle)
  logic [3:0] cs_active_vec;
  assign cs_active_vec = cs_transfer_active ? (4'b0001 << cs_sel) : 4'b0000;

  // Step 3: polarity gate — ~cs_active_vec ^ cs_pol  (XNOR per bit)
  //   cs_pol[i]=0 (active-low):  idle HIGH, selected LOW   ← most devices
  //   cs_pol[i]=1 (active-high): idle LOW,  selected HIGH  ← some analog ICs
  assign spi_csn_o = ~cs_active_vec ^ cs_pol;

endmodule`,

      design:
`// Type the spi_cs_ctrl module here. Follow Theory Steps 1–4.
//
// Step 1 — Ports:
//   input  logic [1:0] cs_sel              — which slave (0–3)
//   input  logic       cs_transfer_active  — 1 = FSM is in a transfer
//   input  logic [3:0] cs_pol              — per-pin: 0=active-low (default)
//   output logic [3:0] spi_csn_o           — one bit per IC chip-select pin
//
// Step 2 — Internal:
//   logic [3:0] cs_active_vec              — one-hot intermediate
//
// Step 3 — assign cs_active_vec = cs_transfer_active ? (4'b0001 << cs_sel) : 4'b0000;
// Step 4 — assign spi_csn_o = ~cs_active_vec ^ cs_pol;
//
// No always_ff — delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [1:0] cs_sel;
  logic       cs_transfer_active;
  logic [3:0] cs_pol;
  logic [3:0] spi_csn_o;

  spi_cs_ctrl dut (
    .cs_sel(cs_sel),
    .cs_transfer_active(cs_transfer_active),
    .cs_pol(cs_pol),
    .spi_csn_o(spi_csn_o)
  );

  // Check that exactly one pin is driven and at the correct level
  task automatic check(
    input logic [1:0] sel,
    input logic [3:0] pol,
    input logic       active
  );
    logic [3:0] expected;
    logic [3:0] active_vec;
    cs_sel = sel; cs_pol = pol; cs_transfer_active = active; #5;
    active_vec = active ? (4'b0001 << sel) : 4'b0000;
    expected   = ~active_vec ^ pol;
    if (spi_csn_o === expected)
      $display("PASS  sel=%0d pol=%04b active=%0b: csn=%04b", sel, pol, active, spi_csn_o);
    else
      $display("FAIL  sel=%0d pol=%04b active=%0b: csn=%04b (exp %04b)",
               sel, pol, active, spi_csn_o, expected);
  endtask

  initial begin
    $display("=== CS Decode & Polarity ===");

    // All-active-low devices (cs_pol=0): CS pins should be HIGH idle, one LOW when active
    check(0, 4'b0000, 1); // sel=0 active: csn=1110
    check(1, 4'b0000, 1); // sel=1 active: csn=1101
    check(2, 4'b0000, 1); // sel=2 active: csn=1011
    check(3, 4'b0000, 1); // sel=3 active: csn=0111

    // No transfer: all CS should be idle HIGH (pol=0)
    check(0, 4'b0000, 0); // active=0: all pins HIGH

    // Active-high device on CS[2] only (cs_pol[2]=1)
    check(2, 4'b0100, 1); // sel=2 active-high: csn[2]=1, others=1 (idle-high)
    check(2, 4'b0100, 0); // sel=2 idle:        csn[2]=0 (active-high idle=LOW)

    // Mixed polarity: CS[0]=active-high, rest active-low
    check(0, 4'b0001, 1); // sel=0 active-high selected: csn[0]=1 (HIGH asserted)

    $display("CS decode done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  sel=0 pol=0000 active=1: csn=1110',
        'PASS  sel=3 pol=0000 active=1: csn=0111',
        'PASS  sel=0 pol=0000 active=0: csn=1111',
        'CS decode done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Pre-Delay Counter (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long7l2',
      title: 'L2 — Pre-Delay Counter',

      theory: `
<h2>Setup Time: Why CS Must Settle Before SCK Starts</h2>
<p>
  Every SPI slave datasheet has a timing parameter called <strong>t<sub>CSS</sub></strong>
  (CS setup to SCK) — the minimum time the CS pin must be stable and asserted
  before the first SCK edge arrives. For a 25 MHz SPI flash this might be 5 ns.
  For a precision ADC it can be 50 ns or more. Violate it and the slave's
  internal state machine hasn't finished powering up its input buffer; the first
  bits captured may be garbage.
</p>
<p>
  The fix is straightforward: after CS asserts, <em>count</em> a programmable number of
  PCLK cycles before the FSM is allowed to enable SCK. That counter value comes
  from the <code>CS_PRE_DELAY</code> register field — the firmware author sets it
  based on the slowest device on the bus. The FSM enters <strong>ASSERT_CS</strong>,
  immediately drives CS low, then waits for <code>pre_done</code> before
  advancing to <strong>SHIFT</strong> and turning on the clock divider.
</p>
<p>
  The critical insight: CS is already asserted when counting starts. The counter
  does not assert CS — the FSM does that by raising <code>cs_transfer_active</code>.
  The counter only <em>stalls</em> the FSM until the setup time is satisfied.
</p>

<h3>Sequence in the SPI Master</h3>
<pre class="code-block">
 FSM state:    IDLE → LOAD → ASSERT_CS ─────── SHIFT → ...
                                    │  pre_done ↑
 cs_transfer_active:   _____________|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
 spi_csn_o[sel]:       ‾‾‾‾‾‾‾‾‾‾‾‾|___________________  ← LOW here
 pre_assert:           ____________|‾|_________________  ← 1-cycle pulse
 pre_cnt:                            0  1  2  ...  N
 pre_done:                              _______________
                                       ↑ fires at cnt == N
</pre>

<h2>The Counter State Machine: One Register, Three Rules</h2>
<p>
  A well-designed hardware counter has exactly three behaviours, handled in strict
  priority order inside a single <code>always_ff</code>:
</p>
<ol>
  <li><strong>Reset</strong> — on <code>!rst_n</code>: clear counter, clear running flag.</li>
  <li><strong>Trigger</strong> — on <code>pre_assert</code> (1-cycle pulse from FSM):
      set running=1, counter=0. Takes priority over counting.</li>
  <li><strong>Count</strong> — while running: increment counter each cycle;
      stop and clear running when counter equals <code>cs_pre_delay</code>.</li>
</ol>
<pre class="code-block">
logic [7:0] pre_cnt;
logic       pre_running;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    pre_cnt     &lt;= 0;
    pre_running &lt;= 0;
  end else if (pre_assert) begin       // trigger (priority over counting)
    pre_cnt     &lt;= 0;
    pre_running &lt;= 1;
  end else if (pre_running) begin      // count
    if (pre_cnt == cs_pre_delay)
      pre_running &lt;= 0;               // stop when target reached
    else
      pre_cnt &lt;= pre_cnt + 1;
  end
end

// pre_done: combinational — 1 while running AND count has hit target
assign pre_done = pre_running &amp;&amp; (pre_cnt == cs_pre_delay);
</pre>
<p>
  <code>pre_done</code> is combinational so the FSM sees it in the same cycle
  the counter hits the target — no extra latency. It goes low one cycle later
  when <code>pre_running</code> clears. The FSM must not re-assert
  <code>pre_assert</code> until the next ASSERT_CS state; the counter ignores
  any trigger while it is already running.
</p>
<p>
  In L3 we will build the mirror of this block — the post-delay counter that
  enforces t<sub>CSH</sub> (CS hold after last SCK edge) before deassert.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L1 spi_cs_ctrl',
        '── New ports ── input logic pclk, rst_n',
        '── New port ── input logic [7:0] cs_pre_delay    — cycle count from register',
        '── New port ── input logic pre_assert             — 1-cycle pulse from FSM',
        '── New port ── output logic pre_done              — to FSM: delay elapsed',
        '── Internal ── logic [7:0] pre_cnt',
        '── Internal ── logic pre_running',
        'always_ff: priority chain — reset, then pre_assert trigger, then count',
        'assign pre_done = pre_running && (pre_cnt == cs_pre_delay);',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines for delays 0, 3, and 7 then "Pre-delay done!" in Output tab',
      ],

      hint:
`module spi_cs_ctrl (
  input  logic       pclk, rst_n,
  input  logic [1:0] cs_sel,
  input  logic       cs_transfer_active,
  input  logic [3:0] cs_pol,
  input  logic [7:0] cs_pre_delay,
  input  logic       pre_assert,
  output logic [3:0] spi_csn_o,
  output logic       pre_done
);
  logic [3:0] cs_active_vec;
  assign cs_active_vec = cs_transfer_active ? (4'b0001 << cs_sel) : 4'b0000;
  assign spi_csn_o     = ~cs_active_vec ^ cs_pol;

  logic [7:0] pre_cnt;
  logic       pre_running;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      pre_cnt     <= 0;
      pre_running <= 0;
    end else if (pre_assert) begin       // trigger: restart counter
      pre_cnt     <= 0;
      pre_running <= 1;
    end else if (pre_running) begin      // count up to target
      if (pre_cnt == cs_pre_delay)
        pre_running <= 0;               // stop: done
      else
        pre_cnt <= pre_cnt + 1;
    end
  end

  // combinational: done fires the same cycle counter hits target
  assign pre_done = pre_running && (pre_cnt == cs_pre_delay);

endmodule`,

      design:
`// Extend spi_cs_ctrl with the pre-delay counter.
// See Theory for the 3-rule priority chain.
//
// New ports:
//   input  logic       pclk, rst_n
//   input  logic [7:0] cs_pre_delay  — from register, number of wait cycles
//   input  logic       pre_assert    — 1-cycle trigger from FSM
//   output logic       pre_done      — combinational: 1 when count == cs_pre_delay
//
// New internal: logic [7:0] pre_cnt; logic pre_running;
//
// always_ff priority: rst_n → pre_assert → pre_running count
// assign pre_done = pre_running && (pre_cnt == cs_pre_delay);
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic [1:0] cs_sel;
  logic       cs_transfer_active, pre_assert;
  logic [3:0] cs_pol;
  logic [7:0] cs_pre_delay;
  logic [3:0] spi_csn_o;
  logic       pre_done;

  spi_cs_ctrl dut (
    .pclk(clk), .rst_n(1'b1),
    .cs_sel(cs_sel), .cs_transfer_active(cs_transfer_active),
    .cs_pol(cs_pol), .cs_pre_delay(cs_pre_delay),
    .pre_assert(pre_assert),
    .spi_csn_o(spi_csn_o), .pre_done(pre_done)
  );

  // Count cycles from pre_assert until pre_done, verify it equals cs_pre_delay+1
  task automatic check_delay(input logic [7:0] delay);
    integer cycles;
    cs_pre_delay = delay;
    pre_assert = 1; @(posedge clk); #1; pre_assert = 0;
    cycles = 0;
    fork
      begin
        repeat(300) begin
          @(posedge clk); #1;
          cycles = cycles + 1;
          if (pre_done) disable fork;
        end
      end
    join
    // pre_done fires when pre_cnt==delay, which happens after delay+1 count cycles
    if (cycles == delay + 1)
      $display("PASS  cs_pre_delay=%0d: pre_done after %0d cycles", delay, cycles);
    else
      $display("FAIL  cs_pre_delay=%0d: pre_done after %0d cycles (expected %0d)",
               delay, cycles, delay + 1);
    repeat(2) @(posedge clk);
  endtask

  initial begin
    cs_sel = 0; cs_transfer_active = 1; cs_pol = 0; pre_assert = 0;
    cs_pre_delay = 0;
    repeat(2) @(posedge clk); #1;
    $display("=== Pre-Delay Counter ===");
    check_delay(0);   // minimum: done on very next cycle
    check_delay(3);   // 4 cycles total
    check_delay(7);   // 8 cycles total
    $display("Pre-delay done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  cs_pre_delay=0: pre_done after 1 cycles',
        'PASS  cs_pre_delay=3: pre_done after 4 cycles',
        'PASS  cs_pre_delay=7: pre_done after 8 cycles',
        'Pre-delay done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — Post-Delay Counter (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long7l3',
      title: 'L3 — Post-Delay Counter',

      theory: `
<h2>Hold Time: Why CS Must Outlive the Last SCK Edge</h2>
<p>
  After the last SCK edge, the slave is still driving MISO with the final bit.
  That bit is valid for only a brief window — the <strong>t<sub>CSH</sub></strong>
  (CS hold time) parameter in the datasheet. If the master deasserts CS too quickly,
  the slave's output buffer tri-states while the master's sample is still being
  registered. The last received bit may be corrupted or entirely missed.
</p>
<p>
  More dangerously: some SPI flash chips use the falling edge of CS to commit a
  write operation internally. Deasserting CS one cycle early can abort a page
  program mid-write, leaving the flash in an indeterminate state with no error
  returned. The post-delay counter prevents this by holding CS active for exactly
  <code>cs_post_delay</code> PCLK cycles after the FSM leaves the SHIFT state.
</p>

<h3>Symmetric to Pre-Delay, but Triggered Differently</h3>
<pre class="code-block">
 FSM state:    ... SHIFT ─────── DEASSERT_CS ─────────── IDLE
                          post_done ↑
 cs_transfer_active: ‾‾‾‾‾‾‾‾‾‾‾‾‾|_________________________
 spi_csn_o[sel]:     ______________|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾  ← CS released
 post_assert:        ______________|‾|_______________________  ← 1-cycle trigger
 post_cnt:                           0  1  ...  N
 post_done:                                    ____________
                                               ↑ fires at cnt == N
</pre>
<p>
  Notice that <code>cs_transfer_active</code> goes LOW immediately when the FSM
  enters DEASSERT_CS — the pin releases in the same cycle. The post counter then
  stalls the FSM in DEASSERT_CS until the hold time has elapsed and it can safely
  return to IDLE. This is different from the pre-delay, where CS was already
  asserted before counting started.
</p>

<h2>Implementation: Mirror the Pre-Delay Counter</h2>
<p>
  The post-delay counter is structurally identical to the pre-delay counter —
  same three-rule priority chain, same combinational <code>post_done</code> output.
  The only differences are the signal names and the trigger source.
</p>
<pre class="code-block">
logic [7:0] post_cnt;
logic       post_running;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    post_cnt     &lt;= 0;
    post_running &lt;= 0;
  end else if (post_assert) begin      // trigger from FSM on SHIFT→DEASSERT
    post_cnt     &lt;= 0;
    post_running &lt;= 1;
  end else if (post_running) begin
    if (post_cnt == cs_post_delay)
      post_running &lt;= 0;
    else
      post_cnt &lt;= post_cnt + 1;
  end
end

assign post_done = post_running &amp;&amp; (post_cnt == cs_post_delay);
</pre>
<p>
  Having both delays as independent counters means the FSM can trigger each
  exactly once per transaction without coordination logic. They share no state.
  In spi_long8's FSM we will write the transitions:
  <code>ASSERT_CS → SHIFT</code> on <code>pre_done</code>, and
  <code>SHIFT → DEASSERT_CS</code> / <code>DEASSERT_CS → IDLE</code>
  on <code>post_done</code>.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L2 spi_cs_ctrl',
        '── New port ── input logic [7:0] cs_post_delay    — from register',
        '── New port ── input logic post_assert             — 1-cycle trigger from FSM',
        '── New port ── output logic post_done              — to FSM: hold time elapsed',
        '── Internal ── logic [7:0] post_cnt; logic post_running',
        'always_ff: same 3-rule chain as pre_cnt — rst_n, post_assert trigger, count',
        'assign post_done = post_running && (post_cnt == cs_post_delay);',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — pre and post delays both verified in Output tab',
      ],

      hint:
`module spi_cs_ctrl (
  input  logic       pclk, rst_n,
  input  logic [1:0] cs_sel,
  input  logic       cs_transfer_active,
  input  logic [3:0] cs_pol,
  input  logic [7:0] cs_pre_delay, cs_post_delay,
  input  logic       pre_assert, post_assert,
  output logic [3:0] spi_csn_o,
  output logic       pre_done, post_done
);
  logic [3:0] cs_active_vec;
  assign cs_active_vec = cs_transfer_active ? (4'b0001 << cs_sel) : 4'b0000;
  assign spi_csn_o     = ~cs_active_vec ^ cs_pol;

  logic [7:0] pre_cnt, post_cnt;
  logic       pre_running, post_running;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      pre_cnt <= 0; pre_running <= 0;
      post_cnt <= 0; post_running <= 0;
    end else begin
      // Pre-delay counter
      if (pre_assert) begin
        pre_cnt <= 0; pre_running <= 1;
      end else if (pre_running) begin
        if (pre_cnt == cs_pre_delay) pre_running <= 0;
        else pre_cnt <= pre_cnt + 1;
      end
      // Post-delay counter (independent)
      if (post_assert) begin
        post_cnt <= 0; post_running <= 1;
      end else if (post_running) begin
        if (post_cnt == cs_post_delay) post_running <= 0;
        else post_cnt <= post_cnt + 1;
      end
    end
  end

  assign pre_done  = pre_running  && (pre_cnt  == cs_pre_delay);
  assign post_done = post_running && (post_cnt == cs_post_delay);

endmodule`,

      design:
`// Extend spi_cs_ctrl with the post-delay counter.
// Mirror the pre-delay counter exactly — same structure, different port names.
//
// New ports:
//   input  logic [7:0] cs_post_delay
//   input  logic       post_assert
//   output logic       post_done
//
// New internal: logic [7:0] post_cnt; logic post_running;
//
// In always_ff: add parallel post-delay counter block (same 3-rule chain)
// assign post_done = post_running && (post_cnt == cs_post_delay);
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic [1:0] cs_sel;
  logic       cs_transfer_active;
  logic [3:0] cs_pol;
  logic [7:0] cs_pre_delay, cs_post_delay;
  logic       pre_assert, post_assert;
  logic [3:0] spi_csn_o;
  logic       pre_done, post_done;

  spi_cs_ctrl dut (
    .pclk(clk), .rst_n(1'b1),
    .cs_sel(cs_sel), .cs_transfer_active(cs_transfer_active),
    .cs_pol(cs_pol),
    .cs_pre_delay(cs_pre_delay), .cs_post_delay(cs_post_delay),
    .pre_assert(pre_assert), .post_assert(post_assert),
    .spi_csn_o(spi_csn_o),
    .pre_done(pre_done), .post_done(post_done)
  );

  task automatic count_to_done(input logic done_sig, output integer cycles);
    cycles = 0;
    fork
      begin
        repeat(300) begin @(posedge clk); #1; cycles++; if (done_sig) disable fork; end
      end
    join
  endtask

  integer cyc;

  initial begin
    cs_sel = 1; cs_transfer_active = 1; cs_pol = 0;
    cs_pre_delay = 0; cs_post_delay = 0;
    pre_assert = 0; post_assert = 0;
    repeat(2) @(posedge clk); #1;

    $display("=== Pre/Post Delay Counters ===");

    // Pre-delay = 4 cycles
    cs_pre_delay = 4;
    pre_assert = 1; @(posedge clk); #1; pre_assert = 0;
    count_to_done(pre_done, cyc);
    if (cyc == 5)
      $display("PASS  pre_delay=4: done after %0d cycles", cyc);
    else
      $display("FAIL  pre_delay=4: done after %0d cycles (exp 5)", cyc);

    repeat(3) @(posedge clk); #1;

    // Post-delay = 2 cycles (CS already released — cs_transfer_active=0)
    cs_post_delay = 2;
    post_assert = 1; @(posedge clk); #1; post_assert = 0;
    count_to_done(post_done, cyc);
    if (cyc == 3)
      $display("PASS  post_delay=2: done after %0d cycles", cyc);
    else
      $display("FAIL  post_delay=2: done after %0d cycles (exp 3)", cyc);

    // Both counters independent — trigger simultaneously
    cs_pre_delay = 1; cs_post_delay = 3;
    pre_assert = 1; post_assert = 1;
    @(posedge clk); #1;
    pre_assert = 0; post_assert = 0;
    // Pre fires at cycle 2, post at cycle 4
    @(posedge clk); @(posedge clk); #1;
    if (pre_done === 1)
      $display("PASS  simultaneous: pre_done fires at cycle 2");
    else
      $display("FAIL  simultaneous: pre_done=%0b (expected 1)", pre_done);

    $display("Pre/post delay done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  pre_delay=4: done after 5 cycles',
        'PASS  post_delay=2: done after 3 cycles',
        'PASS  simultaneous: pre_done fires at cycle 2',
        'Pre/post delay done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — HOLD_CS Burst & Frame Gap (Tier 4)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long7l4',
      title: 'L4 — HOLD_CS Burst & Frame Gap',

      theory: `
<h2>Back-to-Back Transfers: The CS Toggle Problem</h2>
<p>
  When a CPU wants to send a 64-byte block to an SPI flash, the naive approach is
  to call the SPI driver 64 times — each call goes through IDLE→LOAD→ASSERT_CS→
  SHIFT→DEASSERT_CS→IDLE. Between every byte, CS deasserts, waits the full post
  delay, then re-asserts and waits the full pre delay. For a 1 MHz SPI bus with
  5-cycle pre/post delays, each inter-byte gap wastes 10 μs. Transferring 64 bytes
  takes 640 μs in overhead alone — 10× the actual data time.
</p>
<p>
  SPI masters solve this with <strong>HOLD_CS mode</strong> (also called
  continuous or burst transfer): CS stays asserted between words as long as
  the TX FIFO is not empty and the firmware requested a burst. The master runs
  SHIFT → LOAD → SHIFT → LOAD without ever touching the CS pin. The slave sees
  one long uninterrupted transaction instead of 64 short ones.
</p>
<p>
  The tradeoff: if words must be separated by a minimum gap for the slave's
  internal processing (some ADCs need at least N SCK cycles of quiet time
  between samples), the master must insert a <strong>frame gap</strong> —
  a short SCK-idle window between words while CS stays asserted.
</p>

<h3>CS Controller Signals for Burst Mode</h3>
<pre class="code-block">
 Normal mode (hold_cs=0):
   word 1:  __|‾‾SHIFT‾‾|___POST___|___PRE___|‾‾SHIFT‾‾|__ : word 2
             CS asserted      CS deasserted    CS re-asserted

 HOLD_CS mode (hold_cs=1, tx not empty):
   word 1:  __|‾‾SHIFT‾‾|‾‾GAP‾‾|‾‾SHIFT‾‾|‾‾GAP‾‾|‾‾SHIFT‾‾|__
             CS stays asserted throughout (no deassert between words)
             only frame_gap counter runs between words
</pre>

<h2>The HOLD_CS Guard Logic</h2>
<p>
  The CS controller adds one new output: <code>hold_cs_active</code>. When high,
  it tells the FSM to loop back to LOAD instead of advancing to DEASSERT_CS.
  The condition is three-way: continuous-transfer is enabled, hold is requested,
  and the TX FIFO is not empty (nothing to send → must still deassert).
</p>
<pre class="code-block">
// Suppress deassert when burst conditions are all met
assign hold_cs_active = cont_xfer &amp;&amp; hold_cs &amp;&amp; !tx_empty;
</pre>
<p>
  The frame-gap counter is a third independent counter, identical in structure
  to pre/post. It triggers on <code>gap_assert</code> (fired by FSM at the
  SHIFT→LOAD boundary during burst) and produces <code>gap_done</code> when
  <code>frame_gap</code> cycles have elapsed.
</p>
<pre class="code-block">
logic [7:0] gap_cnt;
logic       gap_running;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    gap_cnt     &lt;= 0; gap_running &lt;= 0;
  end else if (gap_assert) begin
    gap_cnt     &lt;= 0; gap_running &lt;= 1;
  end else if (gap_running) begin
    if (gap_cnt == frame_gap) gap_running &lt;= 0;
    else gap_cnt &lt;= gap_cnt + 1;
  end
end
assign gap_done = gap_running &amp;&amp; (gap_cnt == frame_gap);
</pre>
<p>
  With frame_gap=0 the gap counter fires in one cycle — the FSM reloads
  immediately. This is the default for devices that need no inter-word delay.
  The FSM in spi_long8 will use <code>hold_cs_active</code> and
  <code>gap_done</code> together to decide the SHIFT exit path.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L3 spi_cs_ctrl',
        '── New ports ── input logic cont_xfer, hold_cs, tx_empty',
        '── New port ── input logic [7:0] frame_gap',
        '── New port ── input logic gap_assert',
        '── New port ── output logic hold_cs_active',
        '── New port ── output logic gap_done',
        '── Internal ── logic [7:0] gap_cnt; logic gap_running',
        'assign hold_cs_active = cont_xfer && hold_cs && !tx_empty;',
        'Add gap counter always_ff block (same 3-rule pattern as pre/post)',
        'assign gap_done = gap_running && (gap_cnt == frame_gap);',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS for hold_cs suppression and gap timing in Output tab',
      ],

      hint:
`module spi_cs_ctrl (
  input  logic       pclk, rst_n,
  input  logic [1:0] cs_sel,
  input  logic       cs_transfer_active,
  input  logic [3:0] cs_pol,
  input  logic [7:0] cs_pre_delay, cs_post_delay, frame_gap,
  input  logic       pre_assert, post_assert, gap_assert,
  input  logic       cont_xfer, hold_cs, tx_empty,
  output logic [3:0] spi_csn_o,
  output logic       pre_done, post_done, gap_done,
  output logic       hold_cs_active
);
  logic [3:0] cs_active_vec;
  assign cs_active_vec  = cs_transfer_active ? (4'b0001 << cs_sel) : 4'b0000;
  assign spi_csn_o      = ~cs_active_vec ^ cs_pol;
  assign hold_cs_active = cont_xfer && hold_cs && !tx_empty;

  logic [7:0] pre_cnt, post_cnt, gap_cnt;
  logic       pre_running, post_running, gap_running;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      pre_cnt  <= 0; pre_running  <= 0;
      post_cnt <= 0; post_running <= 0;
      gap_cnt  <= 0; gap_running  <= 0;
    end else begin
      if (pre_assert) begin pre_cnt <= 0; pre_running <= 1; end
      else if (pre_running) begin
        if (pre_cnt == cs_pre_delay) pre_running <= 0; else pre_cnt <= pre_cnt + 1;
      end

      if (post_assert) begin post_cnt <= 0; post_running <= 1; end
      else if (post_running) begin
        if (post_cnt == cs_post_delay) post_running <= 0; else post_cnt <= post_cnt + 1;
      end

      if (gap_assert) begin gap_cnt <= 0; gap_running <= 1; end
      else if (gap_running) begin
        if (gap_cnt == frame_gap) gap_running <= 0; else gap_cnt <= gap_cnt + 1;
      end
    end
  end

  assign pre_done  = pre_running  && (pre_cnt  == cs_pre_delay);
  assign post_done = post_running && (post_cnt == cs_post_delay);
  assign gap_done  = gap_running  && (gap_cnt  == frame_gap);

endmodule`,

      design:
`// Complete spi_cs_ctrl with HOLD_CS burst suppression and frame gap counter.
//
// New ports:
//   input  logic       cont_xfer, hold_cs, tx_empty
//   input  logic [7:0] frame_gap
//   input  logic       gap_assert
//   output logic       hold_cs_active  — suppresses deassert when bursting
//   output logic       gap_done
//
// assign hold_cs_active = cont_xfer && hold_cs && !tx_empty;
// Add gap_cnt / gap_running counter (same pattern as pre/post)
// assign gap_done = gap_running && (gap_cnt == frame_gap);
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic [1:0] cs_sel;
  logic       cs_transfer_active;
  logic [3:0] cs_pol;
  logic [7:0] cs_pre_delay, cs_post_delay, frame_gap;
  logic       pre_assert, post_assert, gap_assert;
  logic       cont_xfer, hold_cs, tx_empty;
  logic [3:0] spi_csn_o;
  logic       pre_done, post_done, gap_done, hold_cs_active;

  spi_cs_ctrl dut (
    .pclk(clk), .rst_n(1'b1),
    .cs_sel(cs_sel), .cs_transfer_active(cs_transfer_active),
    .cs_pol(cs_pol),
    .cs_pre_delay(cs_pre_delay), .cs_post_delay(cs_post_delay),
    .frame_gap(frame_gap),
    .pre_assert(pre_assert), .post_assert(post_assert), .gap_assert(gap_assert),
    .cont_xfer(cont_xfer), .hold_cs(hold_cs), .tx_empty(tx_empty),
    .spi_csn_o(spi_csn_o),
    .pre_done(pre_done), .post_done(post_done), .gap_done(gap_done),
    .hold_cs_active(hold_cs_active)
  );

  integer cyc;

  initial begin
    cs_sel = 0; cs_transfer_active = 1; cs_pol = 4'b0000;
    cs_pre_delay = 0; cs_post_delay = 0; frame_gap = 0;
    pre_assert = 0; post_assert = 0; gap_assert = 0;
    cont_xfer = 0; hold_cs = 0; tx_empty = 0;
    repeat(2) @(posedge clk); #1;

    $display("=== HOLD_CS Burst & Frame Gap ===");

    // Test 1: hold_cs_active HIGH only when all three conditions met
    cont_xfer = 1; hold_cs = 1; tx_empty = 0; @(posedge clk); #1;
    if (hold_cs_active === 1'b1)
      $display("PASS  cont=1 hold=1 !empty: hold_cs_active=1");
    else
      $display("FAIL  hold_cs_active=%0b (expected 1)", hold_cs_active);

    // tx_empty breaks the burst
    tx_empty = 1; @(posedge clk); #1;
    if (hold_cs_active === 1'b0)
      $display("PASS  tx_empty=1: hold_cs_active=0 (burst ends)");
    else
      $display("FAIL  tx_empty=1: hold_cs_active=%0b (expected 0)", hold_cs_active);

    // hold_cs=0 also breaks burst even with data
    tx_empty = 0; hold_cs = 0; @(posedge clk); #1;
    if (hold_cs_active === 1'b0)
      $display("PASS  hold_cs=0: hold_cs_active=0");
    else
      $display("FAIL  hold_cs=0: hold_cs_active=%0b (expected 0)", hold_cs_active);

    // Test 2: frame gap counter — 3-cycle gap between words
    hold_cs = 1; tx_empty = 0; frame_gap = 3;
    gap_assert = 1; @(posedge clk); #1; gap_assert = 0;
    cyc = 0;
    fork
      begin repeat(20) begin @(posedge clk); #1; cyc++; if (gap_done) disable fork; end end
    join
    if (cyc == 4)
      $display("PASS  frame_gap=3: gap_done after %0d cycles", cyc);
    else
      $display("FAIL  frame_gap=3: gap_done after %0d cycles (expected 4)", cyc);

    $display("Burst and gap done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  cont=1 hold=1 !empty: hold_cs_active=1',
        'PASS  tx_empty=1: hold_cs_active=0 (burst ends)',
        'PASS  frame_gap=3: gap_done after 4 cycles',
        'Burst and gap done!',
      ]
    },

  ]
});
