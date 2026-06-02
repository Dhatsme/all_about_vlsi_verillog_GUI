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

    // ────────────────────────────────────────────────────────────────────
    // L2 — Testing the START/STOP Detector  (Tier 1)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb1l2',
      title: 'L2 — Testing the START/STOP Detector',
      theory: `
<h2>Why the condition detector matters</h2>
<p>Every I&sup2;C controller — in a smartphone, a car ECU, a satellite — must reliably detect START and STOP conditions to know when a transaction begins and ends. A bug here means the controller misses the beginning of a byte, corrupts address bits, or holds the bus hostage. Industry sign-off requires testing idle, START, and STOP in every regression run.</p>

<h2>What can go wrong</h2>
<p>The three classic failures are: (1) the detector fires START during idle, (2) it misses a real START edge, or (3) it confuses START for STOP. The three test scenarios in this lesson cover all three.</p>

<h2>ASCII stimulus — what the testbench drives</h2>
<pre class="code-block">Test 1 — idle (no transition on SDA while SCL=1):
  SCL: 0 ──────────────────────────────────────────
  SDA: 1 ──────────────────────────────────────────
  start_det / stop_det: should stay 0

Test 2 — START condition (SDA falls while SCL=1):
  SCL: ──────── 1 ──────────────────────────────────
  SDA: ── 1 ────┐ 0 ──────────────────────────────
                ↑ SDA falls here
  start_det: pulses 1 one clock after the fall

Test 3 — STOP condition (SDA rises while SCL=1):
  SCL: ──────────────── 1 ─────────────────────────
  SDA: ─────────── 0 ──┐ 1 ────────────────────────
                        ↑ SDA rises here
  stop_det: pulses 1 one clock after the rise</pre>

<h2>The @(posedge clk); #1; sampling pattern</h2>
<p>After every stimulus change, we wait for the next rising clock edge and then delay 1 ns before sampling. This ensures we read the DUT output <em>after</em> it has settled in response to the clock, avoiding a race condition between the testbench and the DUT's always_ff block.</p>

<pre class="code-block">scl = 1; sda = 1; @(posedge clk); #1;  // set inputs, wait one clock
sda = 0;          @(posedge clk); #1;  // SDA falls -- START should fire
if (start_det === 1) ...               // sample after clock + 1ns</pre>

<h2>Clock generation</h2>
<p>Generate a 100 MHz testbench clock with a single line. The <code>always #5</code> toggles every 5 ns, giving a 10 ns period (100 MHz). This clock drives the DUT's clk port.</p>

<pre class="code-block">logic clk = 0;
always #5 clk = ~clk;  // 100 MHz -- toggles every 5 ns</pre>

<h2>Before you code</h2>
<p>You will write a clocked testbench that drives SCL and SDA in three scenarios. In scenario 1 you leave both lines idle and verify no outputs fire. In scenario 2 you raise SCL then drop SDA, then wait one clock and check start_det. In scenario 3 you raise SDA while SCL is still high and check stop_det. A correct run prints four PASS lines and a success message.</p>

<h2>Testbench signal declarations</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic</td><td>Testbench clock — drives the DUT's synchronous always_ff block.</td></tr>
  <tr><td><code>scl</code></td><td>logic</td><td>I&sup2;C clock line stimulus — driven by the testbench to create test conditions.</td></tr>
  <tr><td><code>sda</code></td><td>logic</td><td>I&sup2;C data line stimulus — transitions here trigger START and STOP detection.</td></tr>
  <tr><td><code>start_det</code></td><td>logic</td><td>Output from DUT — should pulse 1 one clock after a START condition.</td></tr>
  <tr><td><code>stop_det</code></td><td>logic</td><td>Output from DUT — should pulse 1 one clock after a STOP condition.</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps',
        '── Line 2 ──  module tb;',
        '── Line 3 ──  logic clk = 0;                       ← initialise clk to 0',
        '── Line 4 ──  always #5 clk = ~clk;               ← 100 MHz clock toggle',
        '── Line 5 ──  (blank line)',
        '── Line 6 ──  logic scl, sda, start_det, stop_det; ← all logic (no inout here)',
        '── Line 7 ──  (blank line)',
        '── Line 8 ──  i2c_cond_detect dut (               ← instantiate DUT',
        '── Line 9 ──  .clk(clk), .scl(scl), .sda(sda),',
        '── Line 10 ── .start_det(start_det), .stop_det(stop_det)',
        '── Line 11 ── );',
        '── Line 12 ── (blank line)',
        '── Line 13 ── initial begin',
        '── Line 14 ── $display("=== I2C Condition Detector Testbench ===");',
        '── Line 15 ── // Test 1: idle — hold SCL=0, SDA=1, wait 3 clocks',
        '── Line 16 ── scl = 0; sda = 1;  repeat(3) @(posedge clk); #1;',
        '── Line 17 ── if (start_det===0 && stop_det===0)  $display("PASS  idle: no condition");',
        '── Line 18 ── else  $display("FAIL  idle: start=%0b stop=%0b", start_det, stop_det);',
        '── Line 19 ── // Test 2: START — raise SCL then drop SDA',
        '── Line 20 ── scl = 1; sda = 1; @(posedge clk); #1;',
        '── Line 21 ── sda = 0;          @(posedge clk); #1;',
        '── Line 22 ── if (start_det===1)  $display("PASS  START detected");',
        '── Line 23 ── else  $display("FAIL  START not detected: start_det=%0b", start_det);',
        '── Line 24 ── // Test 3: STOP — raise SDA while SCL still high',
        '── Line 25 ── @(posedge clk); #1;',
        '── Line 26 ── sda = 1; @(posedge clk); #1;',
        '── Line 27 ── if (stop_det===1)  $display("PASS  STOP detected");',
        '── Line 28 ── else  $display("FAIL  STOP not detected: stop_det=%0b", stop_det);',
        '── Line 29 ── $display("Condition detector testbench works!");',
        '── Line 30 ── $finish;',
        '── Line 31 ── end',
        '── Line 32 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz -- toggles every 5 ns

  logic scl, sda, start_det, stop_det;  // all logic -- no inout in this module

  i2c_cond_detect dut (
    .clk(clk), .scl(scl), .sda(sda),
    .start_det(start_det), .stop_det(stop_det)
  );

  initial begin
    \$display("=== I2C Condition Detector Testbench ===");

    // Test 1: idle -- no transitions on SDA while SCL low, outputs must be 0
    scl = 0; sda = 1;
    repeat(3) @(posedge clk); #1;    // wait 3 clocks, then sample 1 ns after edge
    if (start_det === 0 && stop_det === 0)
      \$display("PASS  idle: no condition");
    else
      \$display("FAIL  idle: start=%0b stop=%0b", start_det, stop_det);

    // Test 2: START condition -- raise SCL, then drop SDA from 1 to 0
    scl = 1; sda = 1; @(posedge clk); #1;  // SCL high, SDA still high
    sda = 0;          @(posedge clk); #1;  // SDA falls -- detector latches on next edge
    if (start_det === 1)
      \$display("PASS  START detected");
    else
      \$display("FAIL  START not detected: start_det=%0b", start_det);

    // Test 3: STOP condition -- raise SDA from 0 to 1 while SCL still high
    @(posedge clk); #1;               // give detector one idle cycle
    sda = 1; @(posedge clk); #1;     // SDA rises -- detector latches stop on next edge
    if (stop_det === 1)
      \$display("PASS  STOP detected");
    else
      \$display("FAIL  STOP not detected: stop_det=%0b", stop_det);

    \$display("Condition detector testbench works!");
    \$finish;
  end
endmodule`,
      design:
`// Type the i2c_cond_detect testbench here.
// Read Theory first -- it explains the @(posedge clk); #1; sampling pattern.
//
// Signals to declare:
//   logic clk        -- 100 MHz testbench clock (always #5 clk = ~clk)
//   logic scl        -- I2C clock stimulus from testbench
//   logic sda        -- I2C data stimulus -- transition this to create START/STOP
//   logic start_det  -- DUT output: pulses 1 one clock after START
//   logic stop_det   -- DUT output: pulses 1 one clock after STOP
//
// Three test scenarios:
//   1. Idle:  scl=0, sda=1 for 3 clocks -> start_det===0, stop_det===0
//   2. START: scl=1; sda falls 1->0     -> start_det===1 one clock later
//   3. STOP:  sda rises 0->1 (scl=1)   -> stop_det===1 one clock later
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic scl, sda, start_det, stop_det;

  i2c_cond_detect dut (
    .clk(clk), .scl(scl), .sda(sda),
    .start_det(start_det), .stop_det(stop_det)
  );

  initial begin
    \$display("=== I2C Condition Detector Testbench ===");
    scl = 0; sda = 1;
    repeat(3) @(posedge clk); #1;
    if (start_det === 0 && stop_det === 0)
      \$display("PASS  idle: no condition");
    else
      \$display("FAIL  idle: start=%0b stop=%0b", start_det, stop_det);
    scl = 1; sda = 1; @(posedge clk); #1;
    sda = 0;          @(posedge clk); #1;
    if (start_det === 1)
      \$display("PASS  START detected");
    else
      \$display("FAIL  START not detected: start_det=%0b", start_det);
    @(posedge clk); #1;
    sda = 1; @(posedge clk); #1;
    if (stop_det === 1)
      \$display("PASS  STOP detected");
    else
      \$display("FAIL  STOP not detected: stop_det=%0b", stop_det);
    \$display("Condition detector testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: no condition',
        'PASS  START detected',
        'PASS  STOP detected',
        'Condition detector testbench works!'
      ]
    },

    // L3 added in next commit

  ]
});
