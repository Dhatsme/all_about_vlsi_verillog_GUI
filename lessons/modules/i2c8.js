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

    // L2 added next
  ]
});
