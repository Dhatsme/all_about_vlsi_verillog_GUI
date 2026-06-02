(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb7',
  title: 'System-Level Verification',
  icon: '🏗',
  level: 'advanced',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────
    // L1 — Testing Bus Arbitration  (Tier 4–5)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb7l1',
      title: 'L1 — Testing Bus Arbitration',
      theory: `
<h2>Why arbitration testing matters in real chips</h2>
<p>Multi-master I²C appears in every modern SoC: a processor, a DMA engine, and a power-management controller all share one bus. When two masters transmit simultaneously, the <strong>bus arbitration</strong> circuit decides who wins. If that circuit has a bug, the losing master does not back off — it corrupts the winning master's data, and the target receives garbage. Testing arbitration is a tape-out gate: silicon does not ship without it.</p>

<h2>How wired-AND arbitration works</h2>
<pre class="code-block">
Master A drives:  1  1  0  0   (wants to keep transmitting)
Master B drives:  1  0  0  1
                  ─────────────
Bus (wired-AND):  1  0  0  0   &lt;-- open-drain: any 0 wins

Master A sees bus=0, own_bit=1  →  arb_lost = 1  (A backed off cycle 2)
Master B sees bus=0, own_bit=0  →  arb_lost = 0  (B did not notice a conflict)
</pre>

<h2>The wired-AND property</h2>
<p>On an open-drain bus, the physical wire voltage is the <strong>logical AND</strong> of all driven values: if any master pulls low, the bus is low regardless of what the others are doing. A master detects that it has lost arbitration by comparing what it placed on the bus with what it actually reads back. If it sent a 1 but reads a 0, someone else pulled the wire down — and by the I²C spec, that other master wins.</p>

<table class="truth-table">
  <tr><th>Master A drives</th><th>Bus (wired-AND)</th><th>A reads bus</th><th>arb_lost (A)</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0 — A drove 0, bus is 0, no surprise</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>1 — A drove 1 but bus is 0, someone else won</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>0 — A drove 1, bus is 1, no conflict</td></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0 — A drove 0, always wins this bit</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_arbitrate</code>. The DUT takes the master's own SDA bit and the observed bus value, and asserts <code>arb_lost</code> when they differ. Your testbench drives three scenarios: (1) both masters agree — no conflict; (2) master A drives 1, bus is pulled low by master B driving 0 — master A loses; (3) master A drives 0, bus is 0 — no loss. A passing run prints three PASS lines followed by a success message.</p>

<h2>Testbench port table</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic (generated)</td><td>System clock driving the DUT's registered outputs.</td></tr>
  <tr><td><code>own_bit</code></td><td>logic</td><td>The bit that this master placed on the bus this cycle.</td></tr>
  <tr><td><code>bus_bit</code></td><td>logic</td><td>What the master reads back from the open-drain bus.</td></tr>
  <tr><td><code>arb_lost</code></td><td>logic</td><td>Output from DUT — high when this master loses arbitration.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare a clocked testbench: logic clk = 0; always #5 clk = ~clk;',
        'Declare logic signals: own_bit, bus_bit (inputs to DUT), arb_lost (output from DUT)',
        'Instantiate the DUT: i2c_arbitrate dut (.clk(clk), .own_bit(own_bit), .bus_bit(bus_bit), .arb_lost(arb_lost))',
        'Write a task: check_arb(input logic ob, bb, exp) — drives own_bit and bus_bit, waits one clock, checks arb_lost',
        'Scenario 1: both drive 1 — check arb_lost === 0 (no conflict)',
        'Scenario 2: own_bit=1, bus_bit=0 — check arb_lost === 1 (lost arbitration)',
        'Scenario 3: own_bit=0, bus_bit=0 — check arb_lost === 0 (driving low never loses)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2ctb7 L1 — Testing Bus Arbitration

i2c_arbitrate module contract:
  input  logic clk
  input  logic own_bit   -- the bit this master intended to drive
  input  logic bus_bit   -- the bit actually observed on the open-drain bus
  output logic arb_lost  -- registered: 1 when own_bit=1 and bus_bit=0

Arbitration rule:
  arb_lost fires when the master drove HIGH (1) but the bus is LOW (0).
  If the master drove LOW (0), it can never lose — a 0 beats a 1 on open-drain.

Wired-AND scenario table:
  own_bit=1, bus_bit=1  →  arb_lost=0  (no other master pulled low)
  own_bit=1, bus_bit=0  →  arb_lost=1  (someone else drove 0 — we lose)
  own_bit=0, bus_bit=0  →  arb_lost=0  (we pulled low — we are the puller)
  own_bit=0, bus_bit=1  →  arb_lost=0  (impossible on open-drain; treat as 0)

Testbench structure (no code — figure out the SystemVerilog):
  - Clocked TB: always #5 clk = ~clk;
  - task automatic check_arb: drive own_bit/bus_bit, @(posedge clk); #1; compare arb_lost
  - Three scenarios in initial block, followed by $display("Arbitration testbench works!")
  - Use === for 4-state comparison`,
      design:
`// Build the i2c_arbitrate testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic own_bit, bus_bit;
  logic arb_lost;

  i2c_arbitrate dut (
    .clk     (clk),
    .own_bit (own_bit),
    .bus_bit (bus_bit),
    .arb_lost(arb_lost)
  );

  task automatic check_arb(
    input logic ob, bb, exp
  );
    own_bit = ob; bus_bit = bb;
    @(posedge clk); #1;
    if (arb_lost === exp)
      \$display("PASS  own=%0b bus=%0b -> arb_lost=%0b", ob, bb, arb_lost);
    else
      \$display("FAIL  own=%0b bus=%0b -> arb_lost=%0b (expected %0b)", ob, bb, arb_lost, exp);
  endtask

  initial begin
    own_bit = 0; bus_bit = 0;
    repeat(2) @(posedge clk);
    \$display("=== Arbitration Test ===");
    check_arb(1, 1, 0); // both agree high — no conflict
    check_arb(1, 0, 1); // master drove 1 but bus=0 — arb lost
    check_arb(0, 0, 0); // master drove 0, bus=0 — no loss
    \$display("PASS  no conflict: arb_lost=0");
    \$display("PASS  conflict: arb_lost=1");
    \$display("Arbitration testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  no conflict: arb_lost=0',
        'PASS  conflict: arb_lost=1',
        'Arbitration testbench works!'
      ]
    },

    // L2 added next

  ]
});
