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

    // ────────────────────────────────────────────────────────────────────
    // L3 — Testing the Serial Shift Register  (Tier 2)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb1l3',
      title: 'L3 — Testing the Serial Shift Register',
      theory: `
<h2>Why shift-register testing matters in industry</h2>
<p>Every byte received over I&sup2;C passes through a shift register. In chip bring-up, engineers trace each bit individually to confirm the byte is assembled MSB-first and that the reset path works. A misaligned shift register delivers the right byte only one out of 256 times — hard to spot without systematic testing.</p>

<h2>What can go wrong</h2>
<p>Two common bugs: (1) bits are shifted LSB-first instead of MSB-first — byte appears byte-reversed, (2) reset doesn't clear all 8 bits — garbage value lurks in the high bits. Both are invisible in a single-value spot-check but show up when you test a known full byte like 0xA5.</p>

<h2>ASCII trace — shifting in 0xA5 = 8'b10100101 MSB first</h2>
<pre class="code-block">Reset:          byte_out = 0x00  (00000000)
After bit 7=1:  byte_out = 0x01  (00000001)
After bit 6=0:  byte_out = 0x02  (00000010)
After bit 5=1:  byte_out = 0x05  (00000101)
After bit 4=0:  byte_out = 0x0A  (00001010)
After bit 3=0:  byte_out = 0x14  (00010100)
After bit 2=1:  byte_out = 0x29  (00101001)
After bit 1=0:  byte_out = 0x52  (01010010)
After bit 0=1:  byte_out = 0xA5  (10100101)  ← correct!</pre>

<h2>The task automatic pattern</h2>
<p>Repeating eight separate stimulus blocks would be tedious and error-prone. Instead, we define a <code>task automatic</code> that encapsulates the single-bit shift stimulus. Think of it like a function call: describe the action once, then call it eight times. The keyword <code>automatic</code> makes the task use fresh local storage on each call — important in simulation.</p>

<pre class="code-block">task automatic shift_bit(input logic b);
  sda = b;       // put bit on the data line
  shift_en = 1;  // tell DUT to sample and shift
  @(posedge clk); #1;   // wait one clock cycle
  shift_en = 0;  // deassert enable
endtask</pre>

<h2>Using the task to drive 0xA5</h2>
<p>Once the task is defined, driving 0xA5 MSB-first is eight readable calls:</p>

<pre class="code-block">// 0xA5 = 8'b1010_0101  MSB first:
shift_bit(1); shift_bit(0); shift_bit(1); shift_bit(0);
shift_bit(0); shift_bit(1); shift_bit(0); shift_bit(1);
if (byte_out === 8'hA5) ...</pre>

<h2>Before you code</h2>
<p>You will write a testbench with a <code>task automatic shift_bit</code> that drives one bit into the DUT. Then in the <code>initial</code> block you will: (1) reset the DUT and verify byte_out is 0x00, (2) call shift_bit eight times to shift in 0xA5, (3) check byte_out === 8'hA5. A correct run prints two PASS lines followed by a success message.</p>

<h2>Testbench signal declarations</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic</td><td>100 MHz testbench clock — drives the DUT's always_ff block.</td></tr>
  <tr><td><code>rst</code></td><td>logic</td><td>Active-low synchronous reset — drive low then release to clear the shift register.</td></tr>
  <tr><td><code>shift_en</code></td><td>logic</td><td>Enable signal — pulse high for one clock cycle inside shift_bit to shift one bit.</td></tr>
  <tr><td><code>sda</code></td><td>logic</td><td>Serial data input — set this to each bit value before pulsing shift_en.</td></tr>
  <tr><td><code>byte_out</code></td><td>logic [7:0]</td><td>Assembled parallel byte from DUT — verify this after all 8 bits are shifted in.</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps',
        '── Line 2 ──  module tb;',
        '── Line 3 ──  logic clk = 0;  always #5 clk = ~clk;   ← 100 MHz clock',
        '── Line 4 ──  (blank line)',
        '── Line 5 ──  logic rst, shift_en, sda;               ← DUT inputs',
        '── Line 6 ──  logic [7:0] byte_out;                   ← DUT output, 8-bit bus',
        '── Line 7 ──  (blank line)',
        '── Line 8 ──  i2c_rx_shift dut (                      ← instantiate DUT',
        '── Line 9 ──  .clk(clk), .rst(rst), .shift_en(shift_en),',
        '── Line 10 ── .sda(sda), .byte_out(byte_out)',
        '── Line 11 ── );',
        '── Line 12 ── (blank line)',
        '── Line 13 ── task automatic shift_bit(input logic b); ← reusable single-bit shift task',
        '── Line 14 ──   sda = b; shift_en = 1;                ← set data, assert enable',
        '── Line 15 ──   @(posedge clk); #1;                   ← wait one clock cycle',
        '── Line 16 ──   shift_en = 0;                         ← deassert enable',
        '── Line 17 ── endtask',
        '── Line 18 ── (blank line)',
        '── Line 19 ── initial begin',
        '── Line 20 ── $display("=== I2C RX Shift Register Testbench ===");',
        '── Line 21 ── rst = 0; shift_en = 0; sda = 0;',
        '── Line 22 ── repeat(2) @(posedge clk); rst = 1; @(posedge clk); #1;  ← apply then release reset',
        '── Line 23 ── if (byte_out === 8\'h00)  $display("PASS  reset: byte_out=0x00");',
        '── Line 24 ── else  $display("FAIL  reset: byte_out=0x%02h", byte_out);',
        '── Line 25 ── // Shift in 0xA5 = 8\'b10100101 MSB first',
        '── Line 26 ── shift_bit(1); shift_bit(0); shift_bit(1); shift_bit(0);',
        '── Line 27 ── shift_bit(0); shift_bit(1); shift_bit(0); shift_bit(1);',
        '── Line 28 ── if (byte_out === 8\'hA5)  $display("PASS  received byte: 0x%02h", byte_out);',
        '── Line 29 ── else  $display("FAIL  received byte: 0x%02h (expected 0xa5)", byte_out);',
        '── Line 30 ── $display("Shift register testbench works!");',
        '── Line 31 ── $finish;',
        '── Line 32 ── end',
        '── Line 33 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz

  logic rst, shift_en, sda;   // DUT inputs -- all logic, no inout here
  logic [7:0] byte_out;        // DUT output -- 8-bit parallel result

  i2c_rx_shift dut (
    .clk(clk), .rst(rst), .shift_en(shift_en),
    .sda(sda), .byte_out(byte_out)
  );

  // task automatic: reusable single-bit shift stimulus
  // 'automatic' gives each call its own storage -- important in simulation
  task automatic shift_bit(input logic b);
    sda = b;              // put the bit on the serial data line
    shift_en = 1;         // tell the DUT to sample and shift this cycle
    @(posedge clk); #1;  // wait one full clock, then sample 1 ns after edge
    shift_en = 0;         // deassert enable between bits
  endtask

  initial begin
    \$display("=== I2C RX Shift Register Testbench ===");

    // Step 1: apply reset (active-low), then release
    rst = 0; shift_en = 0; sda = 0;
    repeat(2) @(posedge clk);   // hold reset for 2 cycles
    rst = 1; @(posedge clk); #1;
    if (byte_out === 8'h00)
      \$display("PASS  reset: byte_out=0x00");
    else
      \$display("FAIL  reset: byte_out=0x%02h (expected 0x00)", byte_out);

    // Step 2: shift in 0xA5 = 8'b10100101 MSB first
    // bit 7 first, bit 0 last
    shift_bit(1); shift_bit(0); shift_bit(1); shift_bit(0);
    shift_bit(0); shift_bit(1); shift_bit(0); shift_bit(1);

    if (byte_out === 8'hA5)
      \$display("PASS  received byte: 0x%02h", byte_out);
    else
      \$display("FAIL  received byte: 0x%02h (expected 0xa5)", byte_out);

    \$display("Shift register testbench works!");
    \$finish;
  end
endmodule`,
      design:
`// Type the i2c_rx_shift testbench here. See Theory for the concept.
//
// Signals to declare:
//   logic clk          -- 100 MHz clock (always #5 clk = ~clk)
//   logic rst          -- active-low synchronous reset
//   logic shift_en     -- enable: pulse high for one cycle per bit
//   logic sda          -- serial data input
//   logic [7:0] byte_out  -- assembled byte from DUT
//
// Write a task automatic shift_bit(input logic b):
//   set sda, assert shift_en, wait one clock, deassert shift_en
//
// In initial block:
//   1. Reset and verify byte_out === 8'h00
//   2. Call shift_bit 8 times for 0xA5 (10100101 MSB first)
//   3. Verify byte_out === 8'hA5
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, shift_en, sda;
  logic [7:0] byte_out;

  i2c_rx_shift dut (
    .clk(clk), .rst(rst), .shift_en(shift_en),
    .sda(sda), .byte_out(byte_out)
  );

  task automatic shift_bit(input logic b);
    sda = b; shift_en = 1;
    @(posedge clk); #1;
    shift_en = 0;
  endtask

  initial begin
    \$display("=== I2C RX Shift Register Testbench ===");
    rst = 0; shift_en = 0; sda = 0;
    repeat(2) @(posedge clk);
    rst = 1; @(posedge clk); #1;
    if (byte_out === 8'h00)
      \$display("PASS  reset: byte_out=0x00");
    else
      \$display("FAIL  reset: byte_out=0x%02h (expected 0x00)", byte_out);
    shift_bit(1); shift_bit(0); shift_bit(1); shift_bit(0);
    shift_bit(0); shift_bit(1); shift_bit(0); shift_bit(1);
    if (byte_out === 8'hA5)
      \$display("PASS  received byte: 0x%02h", byte_out);
    else
      \$display("FAIL  received byte: 0x%02h (expected 0xa5)", byte_out);
    \$display("Shift register testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: byte_out=0x00',
        'PASS  received byte: 0xa5',
        'Shift register testbench works!'
      ]
    }

  ]
});
