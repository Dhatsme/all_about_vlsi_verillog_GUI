(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb1',
  title: 'I²C Fundamentals Testbench',
  icon: '\u{1F9EA}',
  level: 'beginner',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Testing the Open-Drain IO Cell  (Tier 1)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb1l1',
      title: 'L1 — Testing the Open-Drain IO Cell',
      theory: `
<h2>Why we test open-drain hardware first</h2>
<p>Before any I&sup2;C chip reaches the factory floor, a verification engineer writes a testbench for the very first building block: the open-drain IO cell. If this cell is wrong, every single byte transmitted on the bus will be corrupted. Real pre-silicon sign-off at chip companies starts exactly here — one small module, three test scenarios, zero tolerance for failure.</p>

<h2>What can go wrong — and how we catch it</h2>
<p>The three classic IO-cell bugs are: (1) the cell drives a 1 instead of releasing, (2) it never drives low, or (3) it drives the bus even when tx_en is deasserted. Each of these kills the bus. Our three test scenarios cover exactly these three failure modes.</p>

<h2>ASCII stimulus diagram</h2>
<pre class="code-block">Scenario 1 — released (tx_en=0):
  tx_en  : 0 ──────────────────────────
  sda    : ─────── 1  (pull-up wins)

Scenario 2 — driven low (tx_en=1, tx_data=0):
  tx_en  : 1 ──────────────────────────
  tx_data: 0 ──────────────────────────
  sda    : ─────── 0  (cell pulls low)

Scenario 3 — released again (tx_en=0):
  tx_en  : 0 ──────────────────────────
  sda    : ─────── 1  (pull-up restores)</pre>

<h2>The open-drain bus and the pullup primitive</h2>
<p>Think of a shared rope hung from the ceiling. Any device on the bus can grab the rope and pull it down to 0. Nobody can push it back up — they just let go. When everyone lets go, a pull-up resistor (modelled in simulation by the <code>pullup</code> primitive) restores the line to 1 automatically. In SystemVerilog simulation, if a net has no active driver, its value is Z (high-impedance). The <code>pullup</code> primitive resolves Z to 1.</p>

<h2>Key testbench rule — wire, not logic, for inout</h2>
<p>In a testbench, an <code>inout</code> net must be declared as <code>wire</code>. A <code>logic</code> signal can only have one driver; a <code>wire</code> resolves correctly when the DUT drives it low and the pullup tries to drive it high. Using <code>logic</code> for SDA will cause X or simulation errors.</p>

<pre class="code-block">wire  sda;          // inout -- must be wire in the testbench
pullup pu(sda);     // models the external 4.7 k&Omega; resistor on the PCB
logic tx_en;        // driven inputs -- logic is fine here
logic tx_data;</pre>

<h2>Before you code</h2>
<p>You are writing a testbench that checks how the IO cell behaves like a rope: let go and it springs back up, pull it down and it stays down. You will declare <code>wire sda</code> and a <code>pullup</code>, then drive three scenarios in sequence. A correct run prints three PASS lines followed by a success message.</p>

<h2>Testbench port declarations</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type</th><th>Direction in TB</th><th>Purpose</th></tr>
  <tr><td><code>sda</code></td><td>wire</td><td>inout net</td><td>The shared I&sup2;C data line — must be wire so pullup and DUT can both drive it.</td></tr>
  <tr><td><code>tx_en</code></td><td>logic</td><td>output to DUT</td><td>Enable signal — set to 1 when we want the cell to drive the bus.</td></tr>
  <tr><td><code>tx_data</code></td><td>logic</td><td>output to DUT</td><td>Bit to transmit — only 0 is ever actively driven on I&sup2;C.</td></tr>
  <tr><td><code>rx_data</code></td><td>logic</td><td>input from DUT</td><td>What the DUT reads back from the bus — should match the bus value.</td></tr>
</table>
<p><strong>Note:</strong> This lesson requires the <strong>iverilog</strong> simulator. The <code>pullup</code> primitive is not supported by Verilator. Select iverilog in the simulator options before running.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps',
        '── Line 2 ──  module tb;',
        '── Line 3 ──  wire  sda;                     ← inout must be wire, NOT logic',
        '── Line 4 ──  pullup pu(sda);                ← models the 4.7k pull-up resistor on the PCB',
        '── Line 5 ──  (blank line)',
        '── Line 6 ──  logic tx_en, tx_data;          ← driven inputs: logic is fine',
        '── Line 7 ──  logic rx_data;                 ← sampled output from DUT',
        '── Line 8 ──  (blank line)',
        '── Line 9 ──  i2c_io_cell dut (              ← instantiate the DUT',
        '── Line 10 ── .tx_en  (tx_en),',
        '── Line 11 ── .tx_data(tx_data),',
        '── Line 12 ── .sda    (sda),',
        '── Line 13 ── .rx_data(rx_data)',
        '── Line 14 ── );',
        '── Line 15 ── initial begin',
        '── Line 16 ── $display("=== I2C IO Cell Testbench ===");',
        '── Line 17 ── // Scenario 1: released — tx_en=0, pull-up should hold sda=1',
        '── Line 18 ── tx_en = 0; tx_data = 0; #5;',
        '── Line 19 ── if (rx_data === 1)  $display("PASS  released: sda=1");  else  $display("FAIL  released: sda=%0b", rx_data);',
        '── Line 20 ── // Scenario 2: driven low — tx_en=1, tx_data=0, sda must be 0',
        '── Line 21 ── tx_en = 1; tx_data = 0; #5;',
        '── Line 22 ── if (rx_data === 0)  $display("PASS  driving low: sda=0");  else  $display("FAIL  driving low: sda=%0b", rx_data);',
        '── Line 23 ── // Scenario 3: released again — tx_en=0, pull-up restores sda=1',
        '── Line 24 ── tx_en = 0; #5;',
        '── Line 25 ── if (rx_data === 1)  $display("PASS  released again: sda=1");  else  $display("FAIL  released again: sda=%0b", rx_data);',
        '── Line 26 ── $display("IO cell testbench works!");',
        '── Line 27 ── $finish;',
        '── Line 28 ── end',
        '── Line 29 ── endmodule',
        'Use the iverilog simulator — the pullup primitive requires iverilog, not Verilator',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  wire  sda;           // inout must be wire -- logic cannot resolve multiple drivers
  pullup pu(sda);      // models the 4.7 kOhm pull-up resistor; resolves Z -> 1

  logic tx_en, tx_data;  // driven from the testbench -- logic is fine for these
  logic rx_data;          // read back from DUT output

  i2c_io_cell dut (       // instantiate the module under test
    .tx_en  (tx_en),
    .tx_data(tx_data),
    .sda    (sda),        // wire connects to DUT's inout port
    .rx_data(rx_data)
  );

  initial begin
    \$display("=== I2C IO Cell Testbench ===");

    // Scenario 1: nobody is driving -- pull-up should hold sda HIGH
    tx_en = 0; tx_data = 0; #5;
    if (rx_data === 1)
      \$display("PASS  released: sda=1");
    else
      \$display("FAIL  released: sda=%0b (expected 1)", rx_data);

    // Scenario 2: tx_en=1, tx_data=0 -- cell pulls sda LOW
    tx_en = 1; tx_data = 0; #5;
    if (rx_data === 0)
      \$display("PASS  driving low: sda=0");
    else
      \$display("FAIL  driving low: sda=%0b (expected 0)", rx_data);

    // Scenario 3: release again -- pull-up restores sda HIGH
    tx_en = 0; #5;
    if (rx_data === 1)
      \$display("PASS  released again: sda=1");
    else
      \$display("FAIL  released again: sda=%0b (expected 1)", rx_data);

    \$display("IO cell testbench works!");
    \$finish;
  end
endmodule`,
      design:
`// Type the i2c_io_cell testbench here.
// Read Theory first -- it explains why wire (not logic) is needed for sda.
//
// Signals to declare:
//   wire  sda          -- inout net; resolves DUT drive + pullup
//   pullup pu(sda)     -- models the external pull-up resistor
//   logic tx_en        -- enable: 1 = this device drives the bus
//   logic tx_data      -- bit to transmit (only 0 is ever actively driven)
//   logic rx_data      -- DUT's output: what it reads from the bus
//
// Three scenarios to test:
//   1. tx_en=0         -> sda=1 (pull-up wins)
//   2. tx_en=1, tx_data=0 -> sda=0 (cell pulls low)
//   3. tx_en=0 again   -> sda=1 (pull-up restores)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  wire  sda;
  pullup pu(sda);

  logic tx_en, tx_data;
  logic rx_data;

  i2c_io_cell dut (
    .tx_en  (tx_en),
    .tx_data(tx_data),
    .sda    (sda),
    .rx_data(rx_data)
  );

  initial begin
    \$display("=== I2C IO Cell Testbench ===");
    tx_en = 0; tx_data = 0; #5;
    if (rx_data === 1)
      \$display("PASS  released: sda=1");
    else
      \$display("FAIL  released: sda=%0b (expected 1)", rx_data);
    tx_en = 1; tx_data = 0; #5;
    if (rx_data === 0)
      \$display("PASS  driving low: sda=0");
    else
      \$display("FAIL  driving low: sda=%0b (expected 0)", rx_data);
    tx_en = 0; #5;
    if (rx_data === 1)
      \$display("PASS  released again: sda=1");
    else
      \$display("FAIL  released again: sda=%0b (expected 1)", rx_data);
    \$display("IO cell testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  released: sda=1',
        'PASS  driving low: sda=0',
        'IO cell testbench works!'
      ]
    },

    // L2 added in next commit

  ]
});
