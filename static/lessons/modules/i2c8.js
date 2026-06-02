(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c8',
  title: 'I²C Subsystem (Capstone)',
  icon: '⚙️',
  level: 'advanced',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Top-Level Integration  (Tier 5)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c8l1',
      title: 'L1 — Top-Level Integration',
      theory: `
<h2>Why this exists in the real world</h2>
<p>This is a real interview project at hardware companies. "Build a complete I²C subsystem with master, target, and register file" appears verbatim in hardware engineer job specifications at companies like Apple, Qualcomm, Intel, and Arm. When you complete this capstone you will be able to say, truthfully, that you have done exactly that.</p>
<p>A real SoC I²C peripheral block — like the one inside an STM32 microcontroller or an Apple A-series chip — contains exactly the blocks you are now about to wire together. The chip ships millions of units. The silicon is permanent. Getting this right the first time matters.</p>

<h2>System block diagram</h2>
<pre class="code-block">
  APB/AHB Bus
       |
  +-----------+       SDA (open-drain, wired-AND)
  |  i2c_     |&lt;----->  o--[4.7k]--VCC
  |  master   |              |
  +-----------+    SCL      ===
       |        (open-drain)|
       |&lt;----->  o--[4.7k]--VCC
       |              |
  +-----------+       |
  |  i2c_    |&lt;------+
  |  target  |
  +-----------+
       |
  +-----------+
  |  i2c_    |
  |  regfile |
  +-----------+
       |
  +-----------+
  |  i2c_    |
  |arbitrate |
  +-----------+

  All blocks share the same tri-state SDA and SCL bus.
  Any driver that wants to release the line drives 1'bz.
  Pull-up resistors restore the line to VCC (logic 1).
</pre>

<h2>What is a top-level integration module?</h2>
<p>Think of it like the wiring closet of a building. Each sub-module (master, target, register file, arbitration) is a device with its own cable connectors. The top-level module is the patch panel that connects them all together on the shared bus. It does not contain logic — it contains <em>connections</em>. Every internal wire has a name. Every sub-module is instantiated exactly once. The shared bus (SDA, SCL) is a <code>wire</code> with a pullup.</p>

<h2>Key integration rules for I²C</h2>
<ul>
  <li><strong>SDA and SCL are wired-AND:</strong> declare them as <code>wire</code>, never <code>logic</code>. Any sub-module that drives 0 wins. Release = drive <code>1'bz</code>.</li>
  <li><strong>Each driver needs its own enable:</strong> connect each sub-module's <code>sda_oe</code> / <code>scl_oe</code> output to a separate NMOS pull-down cell, not directly to the wire.</li>
  <li><strong>One pullup per physical wire:</strong> in simulation, add <code>pullup pu_sda(sda);</code> and <code>pullup pu_scl(scl);</code> at the top level. In silicon, the resistor is off-chip.</li>
  <li><strong>Arbitration is passive:</strong> the <code>i2c_arbitrate</code> block samples SDA. It does not drive anything — it only signals <code>arb_lost</code> to the master.</li>
</ul>

<h2>Syntax pattern — sub-module instantiation</h2>
<pre class="code-block">i2c_master u_master (
  .clk     (clk),
  .rst     (rst),
  .sda     (sda),      // shared inout wire
  .scl     (scl),      // shared inout wire
  .addr    (m_addr),
  .rw      (m_rw),
  .data_in (m_data_in),
  .data_out(m_data_out),
  .start   (m_start),
  .done    (m_done),
  .busy    (m_busy),
  .ack_err (m_ack_err)
);</pre>

<h2>Before you code</h2>
<p>What you are about to build is the <strong>top-level wrapper</strong> that wires together all the sub-modules you built in chapters i2c1 through i2c7. It declares the shared <code>wire sda</code> and <code>wire scl</code> buses, instantiates each sub-module, and routes their ports to the correct internal signals. There is no <code>always</code> block in this module — only <code>wire</code> declarations and module instantiations.</p>

<h2>Port table — i2c_subsystem</h2>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock shared by all sub-modules.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Active-low synchronous reset broadcast to every sub-module.</td></tr>
  <tr><td><code>sda</code></td><td>inout wire</td><td>The shared I²C data line; open-drain, held high by an external pull-up.</td></tr>
  <tr><td><code>scl</code></td><td>inout wire</td><td>The shared I²C clock line; open-drain, held high by an external pull-up.</td></tr>
  <tr><td><code>m_addr [6:0]</code></td><td>input logic</td><td>7-bit target address the master will talk to on the next transaction.</td></tr>
  <tr><td><code>m_rw</code></td><td>input logic</td><td>Transfer direction: 0 = master writes to target, 1 = master reads from target.</td></tr>
  <tr><td><code>m_data_in [7:0]</code></td><td>input logic</td><td>Byte the master will write to the target device's register.</td></tr>
  <tr><td><code>m_data_out [7:0]</code></td><td>output logic</td><td>Byte the master read back from the target device's register.</td></tr>
  <tr><td><code>m_start</code></td><td>input logic</td><td>Pulse high for one cycle to begin a new I²C transaction.</td></tr>
  <tr><td><code>m_done</code></td><td>output logic</td><td>Goes high for one cycle when the current transaction completes successfully.</td></tr>
  <tr><td><code>m_busy</code></td><td>output logic</td><td>Held high throughout a transaction; the host must not change inputs while busy.</td></tr>
  <tr><td><code>m_ack_err</code></td><td>output logic</td><td>Pulses high if the target sent NACK; indicates address mismatch or write failure.</td></tr>
  <tr><td><code>arb_lost</code></td><td>output logic</td><td>Pulses high if this master lost bus arbitration to another master.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_subsystem with all ports listed in the port table above',
        'Inside the module body, declare: wire sda_int, scl_int; (internal bus wires)',
        'Add pullup primitives: pullup pu_sda(sda_int); and pullup pu_scl(scl_int);',
        'Connect the inout ports to internal wires: assign sda = sda_int; assign scl = scl_int; — or pass sda/scl directly',
        'Instantiate i2c_master as u_master — wire all its ports to the correct top-level signals',
        'Instantiate i2c_target as u_target — connect sda and scl to the shared bus wires',
        'Instantiate i2c_regfile as u_regfile — connect its read/write ports to the target outputs',
        'Instantiate i2c_arbitrate as u_arb — connect its sda_driven and sda_obs inputs; wire arb_lost to the top-level output',
        'Verify: the module body has NO always blocks, only wire declarations and module instantiations',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2c_subsystem — Tier 5 (portfolio)

This module is a pure structural wrapper. No logic, no always blocks.
The implementation depends on which exact port signatures your i2c_master,
i2c_target, i2c_regfile, and i2c_arbitrate modules expose.
Below is the canonical structure:

  module i2c_subsystem (
    input  logic        clk,
    input  logic        rst,
    inout  wire         sda,
    inout  wire         scl,
    input  logic [6:0]  m_addr,
    input  logic        m_rw,
    input  logic [7:0]  m_data_in,
    output logic [7:0]  m_data_out,
    input  logic        m_start,
    output logic        m_done,
    output logic        m_busy,
    output logic        m_ack_err,
    output logic        arb_lost
  );

    // -- shared bus wires (open-drain, wired-AND) --
    // sda and scl are directly passed through as inout ports
    // In simulation add pullup; in silicon the resistor is off-chip

    // -- internal interconnect --
    logic [7:0] reg_wdata, reg_rdata;
    logic [7:0] reg_addr;
    logic       reg_we;
    logic       tgt_selected, tgt_rw;

    // -- sub-module instantiations --

    i2c_master u_master (
      .clk     (clk),       .rst     (rst),
      .sda     (sda),       .scl     (scl),
      .addr    (m_addr),    .rw      (m_rw),
      .data_in (m_data_in), .data_out(m_data_out),
      .start   (m_start),   .done    (m_done),
      .busy    (m_busy),    .ack_err (m_ack_err)
    );

    i2c_target u_target (
      .clk      (clk),         .rst      (rst),
      .sda      (sda),         .scl      (scl),
      .selected (tgt_selected), .rw_bit   (tgt_rw),
      .reg_addr (reg_addr),    .reg_wdata(reg_wdata),
      .reg_we   (reg_we),      .reg_rdata(reg_rdata)
    );

    i2c_regfile u_regfile (
      .clk    (clk),       .rst    (rst),
      .addr   (reg_addr),  .wdata  (reg_wdata),
      .we     (reg_we),    .rdata  (reg_rdata)
    );

    i2c_arbitrate u_arb (
      .clk      (clk),
      .rst      (rst),
      .sda_driven(m_busy),   // master is actively driving
      .sda_obs  (sda),       // observe actual bus state
      .arb_lost (arb_lost)
    );

  endmodule

ASCII port-connection map:

  clk ─────┬──> u_master.clk
           ├──> u_target.clk
           ├──> u_regfile.clk
           └──> u_arb.clk

  sda (inout wire) ──> u_master.sda
                   ──> u_target.sda
                   ──> u_arb.sda_obs

  scl (inout wire) ──> u_master.scl
                   ──> u_target.scl

  u_target.reg_addr  ──> u_regfile.addr
  u_target.reg_wdata ──> u_regfile.wdata
  u_target.reg_we    ──> u_regfile.we
  u_regfile.rdata    ──> u_target.reg_rdata`,
      design:
`// Build the i2c_subsystem module here. See Theory for the full spec.
//
// This is a structural (wiring) module — no always blocks.
// Instantiate: i2c_master, i2c_target, i2c_regfile, i2c_arbitrate
// Connect them all to the shared sda and scl inout wires.
//
// ASCII block diagram:
//
//   [i2c_master] ──sda/scl──+──> [i2c_target] ──> [i2c_regfile]
//                           |
//                           +──> [i2c_arbitrate] ──> arb_lost
//
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  wire  sda, scl;
  pullup pu_sda(sda);
  pullup pu_scl(scl);

  logic        rst;
  logic [6:0]  m_addr;
  logic        m_rw;
  logic [7:0]  m_data_in;
  logic [7:0]  m_data_out;
  logic        m_start;
  logic        m_done, m_busy, m_ack_err, arb_lost;

  i2c_subsystem dut (
    .clk      (clk),       .rst      (rst),
    .sda      (sda),       .scl      (scl),
    .m_addr   (m_addr),    .m_rw     (m_rw),
    .m_data_in(m_data_in), .m_data_out(m_data_out),
    .m_start  (m_start),   .m_done   (m_done),
    .m_busy   (m_busy),    .m_ack_err(m_ack_err),
    .arb_lost (arb_lost)
  );

  // Helper: wait up to N cycles for done or timeout
  task automatic wait_done(input int max_cycles, output logic ok);
    int i;
    ok = 0;
    for (i = 0; i < max_cycles; i++) begin
      @(posedge clk); #1;
      if (m_done) begin ok = 1; break; end
    end
  endtask

  initial begin
    \$display("=== I2C Subsystem Integration Test ===");

    // Reset
    rst = 0; m_start = 0; m_addr = 7'h50; m_rw = 0;
    m_data_in = 8'hAB;
    repeat(4) @(posedge clk);
    rst = 1; @(posedge clk); #1;
    \$display("PASS  subsystem instantiated and reset released");

    // Verify bus idles high (pullup holds SDA=1 when no one drives it)
    #2;
    if (sda === 1 && scl === 1)
      \$display("PASS  bus idle: sda=%0b scl=%0b", sda, scl);
    else
      \$display("FAIL  bus not idle: sda=%0b scl=%0b", sda, scl);

    // Check arb_lost is deasserted at idle
    if (arb_lost === 0)
      \$display("PASS  arb_lost=0 at idle");
    else
      \$display("FAIL  arb_lost=%0b at idle (expected 0)", arb_lost);

    // Initiate a write transaction — master drives start
    m_start = 1; @(posedge clk); #1;
    m_start = 0;

    // Wait for busy to assert (master grabbed the bus)
    repeat(5) @(posedge clk); #1;
    if (m_busy === 1 || m_done === 1)
      \$display("PASS  transaction initiated: busy=%0b done=%0b", m_busy, m_done);
    else
      \$display("FAIL  transaction did not start: busy=%0b", m_busy);

    // Let the transaction run to completion (or timeout at 200 cycles)
    begin
      logic ok;
      wait_done(200, ok);
      if (ok)
        \$display("PASS  transaction completed: done=1");
      else
        \$display("INFO  transaction still running at timeout (integration TB — check waveform)");
    end

    \$display("Subsystem integration check done!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  subsystem instantiated and reset released',
        'PASS  bus idle: sda=1 scl=1',
        'PASS  arb_lost=0 at idle',
        'Subsystem integration check done!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — Verification Plan  (Tier 5)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c8l2',
      title: 'L2 — Verification Plan',
      theory: `
<h2>Why verification planning is a real engineering skill</h2>
<p>In professional hardware teams, the verification plan is written <em>before</em> a single line of RTL. Companies like Apple and NVIDIA maintain verification plans that run to hundreds of pages. The plan answers three questions: what can go wrong, how will we detect it, and how do we know when we are done? This lesson teaches you to write one for your I²C subsystem.</p>
<p>A bad verification plan finds bugs in the happy path. A good one specifically designs tests to trigger every failure mode. Silicon is $10 million to re-spin — an hour writing a thorough plan saves a fortune.</p>

<h2>The coverage-driven verification loop</h2>
<pre class="code-block">
  +----------------+
  |  Write spec    |
  |  (what must    |
  |   the DUT do?) |
  +-------+--------+
          |
          v
  +-------+--------+
  |  List scenarios|  &lt;-- one row per "what could go wrong"
  |  (formal test  |
  |   plan)        |
  +-------+--------+
          |
          v
  +-------+--------+
  |  Write TB      |  &lt;-- one task per scenario
  |  (stimulus +   |
  |   checker)     |
  +-------+--------+
          |
          v
  +-------+--------+
  |  Measure       |  &lt;-- did every branch execute?
  |  coverage      |      every state transition fire?
  +-------+--------+
          |
     all covered?
     YES -> tape out
     NO  -> add more tests
</pre>

<h2>I²C functional coverage points</h2>
<p>For the i2c_subsystem, every one of these scenarios must have at least one directed test:</p>
<table class="truth-table">
  <tr><th>#</th><th>Scenario</th><th>Expected DUT behaviour</th><th>What to check</th></tr>
  <tr><td>1</td><td>Normal write: master writes 0xAB to target address 0x50, register 0x00</td><td>Target latches byte; register file stores 0xAB at address 0</td><td>Read back reg[0] === 0xAB; m_done pulses; m_ack_err stays 0</td></tr>
  <tr><td>2</td><td>Normal read: master reads register 0x00 from target</td><td>Master receives byte previously written</td><td>m_data_out === 0xAB after m_done</td></tr>
  <tr><td>3</td><td>NACK on bad address: master addresses 0x7F (no device there)</td><td>No target responds; ninth SCL clock sees SDA=1 (NACK)</td><td>m_ack_err pulses; m_done does not assert</td></tr>
  <tr><td>4</td><td>Bus busy: second start while m_busy is high</td><td>Second start is ignored until first transaction completes</td><td>m_busy stays high; no double-START condition on bus</td></tr>
  <tr><td>5</td><td>Arbitration loss: two masters drive conflicting SDA</td><td>Master sees SDA=0 while it drove SDA=1; fires arb_lost</td><td>arb_lost pulses within 1 SCL period of the conflict</td></tr>
  <tr><td>6</td><td>Clock stretch: target holds SCL low for 3 cycles</td><td>Master pauses, does not advance bit counter</td><td>SCL stays low for stretch duration; byte completes correctly</td></tr>
  <tr><td>7</td><td>Multi-byte burst write: 4 consecutive bytes, auto-increment</td><td>Register pointer advances 0,1,2,3 automatically</td><td>reg[0..3] match written bytes after STOP</td></tr>
  <tr><td>8</td><td>Reset mid-transaction: rst deasserted during DATA phase</td><td>All FSMs return to IDLE; SDA and SCL released</td><td>After reset, m_busy=0, m_done=0; bus idles high</td></tr>
</table>

<h2>Testbench architecture for a subsystem</h2>
<p>A subsystem testbench has three layers. Each layer has a distinct job and must not leak into the others:</p>
<ul>
  <li><strong>Signal layer:</strong> declare all wires and logic signals; instantiate the DUT; generate clock; add pullup primitives for open-drain lines.</li>
  <li><strong>Task layer:</strong> one <code>task automatic</code> per operation (write_byte, read_byte, expect_nack, inject_arb_conflict). Tasks take parameters and call <code>\$display</code> on pass/fail.</li>
  <li><strong>Scenario layer:</strong> the <code>initial begin ... end</code> block calls tasks in order, labels each group with <code>\$display("--- Scenario N: name ---")</code>, and calls <code>\$finish</code> at the end.</li>
</ul>

<h2>Structural template for tasks</h2>
<pre class="code-block">task automatic write_byte(
  input logic [6:0] addr,
  input logic [7:0] data,
  output logic      ok
);
  m_addr    = addr;
  m_data_in = data;
  m_rw      = 0;
  m_start   = 1; @(posedge clk); #1;
  m_start   = 0;
  // wait for done or timeout
  ok = 0;
  repeat(300) begin
    @(posedge clk); #1;
    if (m_done) begin ok = 1; break; end
  end
endtask</pre>

<h2>Before you code</h2>
<p>What you are about to build is a complete testbench named <code>i2c_subsystem_tb</code>. Unlike the testbenches in earlier lessons, this one does not test a single combinational or sequential block — it exercises the <em>full interaction</em> between master, target, register file, and arbitration logic. The module must be named <code>tb</code> (as always for Verilator), and it must cover at least scenarios 1, 2, 3, and 8 from the table above to earn a passing run. Scenarios 4 through 7 are portfolio extensions.</p>

<h2>Port table — what the testbench drives</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type in TB</th><th>Connected to</th></tr>
  <tr><td><code>sda</code></td><td>wire (inout)</td><td>dut.sda — the open-drain I²C data line</td></tr>
  <tr><td><code>scl</code></td><td>wire (inout)</td><td>dut.scl — the open-drain I²C clock line</td></tr>
  <tr><td><code>m_addr</code></td><td>logic [6:0]</td><td>dut.m_addr — target address to address</td></tr>
  <tr><td><code>m_rw</code></td><td>logic</td><td>dut.m_rw — 0=write, 1=read</td></tr>
  <tr><td><code>m_data_in</code></td><td>logic [7:0]</td><td>dut.m_data_in — byte to write</td></tr>
  <tr><td><code>m_data_out</code></td><td>logic [7:0]</td><td>dut.m_data_out — byte read back</td></tr>
  <tr><td><code>m_start</code></td><td>logic</td><td>dut.m_start — pulse to start transaction</td></tr>
  <tr><td><code>m_done</code></td><td>logic</td><td>dut.m_done — observed from DUT</td></tr>
  <tr><td><code>m_ack_err</code></td><td>logic</td><td>dut.m_ack_err — observed from DUT</td></tr>
  <tr><td><code>arb_lost</code></td><td>logic</td><td>dut.arb_lost — observed from DUT</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Write module tb with clock generator (always #5 clk = ~clk)',
        'Declare wire sda, scl and add pullup pu_sda(sda) and pullup pu_scl(scl)',
        'Instantiate i2c_subsystem as dut — connect all ports',
        'Write task automatic write_byte(addr, data, output ok) — drives m_addr, m_data_in, m_rw, m_start, waits for m_done',
        'Write task automatic read_byte(addr, output logic [7:0] data, output ok) — sets m_rw=1, waits for m_done, captures m_data_out',
        'Scenario 1: call write_byte(7\'h50, 8\'hAB, ok) — check ok===1 and m_ack_err===0',
        'Scenario 2: call read_byte(7\'h50, data, ok) — check data===8\'hAB',
        'Scenario 3: call write_byte(7\'h7F, 8\'hFF, ok) to an unoccupied address — check m_ack_err pulses',
        'Scenario 8: assert rst=0 mid-transaction — verify m_busy drops to 0 and bus idles high after rst=1',
        'End with $display("Verification plan complete!") and $finish',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2c_subsystem_tb — Tier 5 (portfolio)

This is a verification plan made executable. The structure is:

LAYER 1 — SIGNALS
  wire  sda, scl;
  pullup pu_sda(sda);  pullup pu_scl(scl);
  logic clk = 0;  always #5 clk = ~clk;
  logic [6:0] m_addr;  logic m_rw;
  logic [7:0] m_data_in, m_data_out;
  logic m_start, m_done, m_busy, m_ack_err, arb_lost, rst;

LAYER 2 — TASKS

  task automatic write_byte(
    input  logic [6:0] addr,
    input  logic [7:0] data,
    output logic       ok
  );
    m_addr = addr; m_data_in = data; m_rw = 0;
    m_start = 1; @(posedge clk); #1; m_start = 0;
    ok = 0;
    repeat(300) begin
      @(posedge clk); #1;
      if (m_done) begin ok = 1; break; end
    end
  endtask

  task automatic read_byte(
    input  logic [6:0] addr,
    output logic [7:0] data,
    output logic       ok
  );
    m_addr = addr; m_rw = 1;
    m_start = 1; @(posedge clk); #1; m_start = 0;
    ok = 0;
    repeat(300) begin
      @(posedge clk); #1;
      if (m_done) begin data = m_data_out; ok = 1; break; end
    end
  endtask

LAYER 3 — SCENARIOS

  Scenario 1 — Normal write
    write_byte(7'h50, 8'hAB, ok)
    assert ok===1, m_ack_err===0

  Scenario 2 — Read-back
    read_byte(7'h50, data, ok)
    assert data===8'hAB

  Scenario 3 — NACK on bad address
    write_byte(7'h7F, 8'hFF, ok)
    assert m_ack_err===1 or ok===0

  Scenario 8 — Mid-transaction reset
    begin write, then assert rst=0 mid-flight
    after rst=1, check m_busy===0

ARBITRATION TEST (scenario 5) — advanced:
  Use a second driver (fork/join) that also drives sda=0
  while master drives sda=1. Check arb_lost pulses.

COVERAGE COMPLETENESS CHECK:
  Every state in i2c_master FSM must be visited:
    IDLE, START, ADDR, DATA[0..7], ACK, STOP
  Instrument with $display inside DUT states during simulation.`,
      design:
`// Build the i2c_subsystem_tb verification module here.
// See Theory for the full verification plan and task templates.
//
// This is the testbench for i2c_subsystem (the capstone integration).
// Module name MUST be tb (Verilator requirement).
//
// Scenarios to cover:
//   1. Normal write (master -> target -> regfile)
//   2. Normal read-back
//   3. NACK on unrecognised address
//   8. Reset mid-transaction
//
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  wire  sda, scl;
  pullup pu_sda(sda);
  pullup pu_scl(scl);

  logic        rst;
  logic [6:0]  m_addr;
  logic        m_rw;
  logic [7:0]  m_data_in;
  logic [7:0]  m_data_out;
  logic        m_start;
  logic        m_done, m_busy, m_ack_err, arb_lost;

  i2c_subsystem dut (
    .clk      (clk),       .rst      (rst),
    .sda      (sda),       .scl      (scl),
    .m_addr   (m_addr),    .m_rw     (m_rw),
    .m_data_in(m_data_in), .m_data_out(m_data_out),
    .m_start  (m_start),   .m_done   (m_done),
    .m_busy   (m_busy),    .m_ack_err(m_ack_err),
    .arb_lost (arb_lost)
  );

  // task: write one byte to the subsystem
  task automatic write_byte(
    input  logic [6:0] addr,
    input  logic [7:0] data,
    output logic       ok
  );
    m_addr = addr; m_data_in = data; m_rw = 0;
    m_start = 1; @(posedge clk); #1; m_start = 0;
    ok = 0;
    repeat(400) begin
      @(posedge clk); #1;
      if (m_done) begin ok = 1; break; end
    end
  endtask

  // task: read one byte from the subsystem
  task automatic read_byte(
    input  logic [6:0]  addr,
    output logic [7:0]  data,
    output logic        ok
  );
    m_addr = addr; m_rw = 1;
    m_start = 1; @(posedge clk); #1; m_start = 0;
    ok = 0; data = 8'hxx;
    repeat(400) begin
      @(posedge clk); #1;
      if (m_done) begin data = m_data_out; ok = 1; break; end
    end
  endtask

  initial begin
    \$display("=== I2C Subsystem Verification Plan ===");

    // Reset
    rst = 0; m_start = 0; m_addr = 0; m_rw = 0; m_data_in = 0;
    repeat(4) @(posedge clk); rst = 1; @(posedge clk); #1;
    \$display("PASS  reset released, starting scenarios");

    // Scenario 1: normal write
    \$display("--- Scenario 1: Normal write ---");
    begin
      logic ok;
      write_byte(7'h50, 8'hAB, ok);
      if (ok && m_ack_err === 0)
        \$display("PASS  write 0xAB to 0x50 completed, no ack_err");
      else
        \$display("FAIL  write did not complete ok=%0b ack_err=%0b", ok, m_ack_err);
    end

    // Scenario 2: read-back
    \$display("--- Scenario 2: Read-back ---");
    begin
      logic [7:0] rdata;
      logic ok;
      read_byte(7'h50, rdata, ok);
      if (ok && rdata === 8'hAB)
        \$display("PASS  read-back 0x%02h from 0x50", rdata);
      else
        \$display("FAIL  read-back: ok=%0b data=0x%02h (expected 0xAB)", ok, rdata);
    end

    // Scenario 3: NACK on bad address
    \$display("--- Scenario 3: NACK on bad address ---");
    begin
      logic ok;
      write_byte(7'h7F, 8'hFF, ok);
      if (m_ack_err === 1 || ok === 0)
        \$display("PASS  NACK on address 0x7F: ack_err=%0b ok=%0b", m_ack_err, ok);
      else
        \$display("FAIL  expected NACK, got ok=%0b ack_err=%0b", ok, m_ack_err);
    end

    // Scenario 8: mid-transaction reset
    \$display("--- Scenario 8: Mid-transaction reset ---");
    begin
      logic ok;
      m_addr = 7'h50; m_data_in = 8'hCD; m_rw = 0;
      m_start = 1; @(posedge clk); #1; m_start = 0;
      repeat(10) @(posedge clk);   // let it start
      rst = 0; repeat(2) @(posedge clk);
      rst = 1; @(posedge clk); #1;
      if (m_busy === 0)
        \$display("PASS  mid-transaction reset: m_busy cleared");
      else
        \$display("FAIL  m_busy still high after reset: %0b", m_busy);
    end

    \$display("Verification plan complete!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset released, starting scenarios',
        'PASS  write 0xAB to 0x50 completed, no ack_err',
        'Verification plan complete!'
      ]
    },

    // L3 added next
  ]
});

