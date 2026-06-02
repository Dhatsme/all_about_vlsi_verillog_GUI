(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb2',
  title: 'Bit-Banging Testbenches',
  icon: '🧪',
  level: 'intermediate',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Testing the SCL Clock Generator  (Tier 2)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb2l1',
      title: 'L1 — Testing the SCL Clock Generator',
      theory: `
<h2>Why clock generators get their own testbench</h2>
<p>When you submit RTL for synthesis at a chip company, a regression suite runs clock-generator and bit-tx tests every night. A single broken edge — one half-period too long, one missing toggle — causes the whole bus to hang. Every I²C target on the board stops responding, and tracking the fault back to a clock divider can take hours. Testing the clock generator in isolation, before integrating anything else, is how you catch that bug in minutes instead of hours.</p>

<h2>What the SCL clock generator does</h2>
<p>The <code>i2c_clk_gen</code> module divides a fast system clock down to the I²C SCL frequency. When <code>en</code> is low, SCL stays high (bus released). When <code>en</code> goes high, SCL begins toggling at exactly one toggle every <code>CLK_DIV/2</code> system clock cycles.</p>

<pre class="code-block">// Timing with CLK_DIV = 10 (system clk period = 1 unit)
//
// sys_clk: _|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|
//              0  1  2  3  4  5  6  7  8  9 10 11 12 ...
//
// SCL:     ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|___________|‾‾‾‾‾‾‾‾‾‾‾|___
//              en=0 (disabled)     CLK_DIV/2 low  CLK_DIV/2 high
//                                  ^ rising edge counted here</pre>

<h2>The edge-counting technique</h2>
<p>Think of counting SCL rising edges like counting cars passing a toll booth. You station an observer (a flip-flop) at the booth. Every time a car passes (SCL goes from 0 to 1), the observer tallies one more. After watching for a fixed window of system clock cycles, you check the tally. If the clock generator is working correctly, the count matches what the math predicts: for a 60-system-clock window with CLK_DIV=10, you expect at least 5 rising edges (one rising edge every 10 system clocks).</p>

<pre class="code-block">// Edge-count pattern — count SCL rising edges
logic scl_prev;
int   edge_count;

always_ff @(posedge sys_clk) begin
  scl_prev &lt;= scl;
  if (scl &amp;&amp; !scl_prev)    // detect 0-&gt;1 transition
    edge_count &lt;= edge_count + 1;
end</pre>

<table class="truth-table">
  <tr><th>en</th><th>Expected SCL behaviour</th><th>Expected edge count (60 cycles)</th></tr>
  <tr><td>0</td><td>SCL held high, no toggles</td><td>0</td></tr>
  <tr><td>1</td><td>SCL toggles every CLK_DIV/2 cycles</td><td>&ge; 5</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_clk_gen</code> with <code>CLK_DIV = 10</code>. The testbench has two scenarios: first, it holds <code>en=0</code> for 20 system cycles and verifies that no SCL edges occurred. Then it asserts <code>en=1</code> and watches for 60 system cycles, counting SCL rising edges — it passes if the count reaches at least 5. A second always_ff block runs in parallel, quietly tallying every SCL 0&rarr;1 transition, while the initial block drives stimuli and makes assertions.</p>

<table class="truth-table">
  <tr><th>Port/Signal</th><th>Direction</th><th>Declare as</th><th>Purpose</th></tr>
  <tr><td><code>sys_clk</code></td><td>driven by TB</td><td><code>logic</code></td><td>System clock; TB toggles it with <code>always #5</code></td></tr>
  <tr><td><code>rst</code></td><td>driven by TB</td><td><code>logic</code></td><td>Active-low synchronous reset; assert then release before test</td></tr>
  <tr><td><code>en</code></td><td>driven by TB</td><td><code>logic</code></td><td>Enable the clock generator; 0 = idle, 1 = generating SCL</td></tr>
  <tr><td><code>scl</code></td><td>output from DUT</td><td><code>logic</code></td><td>The SCL output that the testbench monitors for edges</td></tr>
  <tr><td><code>scl_prev</code></td><td>internal TB</td><td><code>logic</code></td><td>SCL value one cycle ago, used to detect rising edges</td></tr>
  <tr><td><code>edge_count</code></td><td>internal TB</td><td><code>int</code></td><td>Tally of SCL rising edges seen during the enabled window</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps   ← simulator timescale directive',
        '── Line 2 ──  module tb;',
        '── Line 4 ──  logic sys_clk = 0;   ← system clock, starts low',
        '── Line 5 ──  always #5 sys_clk = ~sys_clk;   ← 100 MHz toggle',
        '── Line 7 ──  logic rst, en, scl;   ← DUT signals',
        '── Line 8 ──  logic scl_prev;       ← previous SCL value for edge detect',
        '── Line 9 ──  int   edge_count;     ← rising-edge tally',
        '── Line 11 ── i2c_clk_gen #(.CLK_DIV(10)) dut (.sys_clk(sys_clk), .rst(rst), .en(en), .scl(scl));',
        '── Line 13 ── always_ff @(posedge sys_clk) begin   ← edge-count block',
        '── Line 14 ──   scl_prev <= scl;                   ← delay register',
        '── Line 15 ──   if (scl && !scl_prev) edge_count <= edge_count + 1;   ← 0->1 detected',
        '── Line 16 ── end',
        '── Line 18 ── initial begin — start the test sequence',
        '── Line 19 ──   reset sequence: rst=0 for 2 cycles, then rst=1',
        '── Line 21 ──   disabled test: en=0, edge_count=0, wait 20 cycles, check edge_count===0',
        '── Line 26 ──   enabled test: edge_count=0, en=1, wait 60 cycles, check edge_count>=5',
        '── Line 31 ──   $display("Clock generator testbench works!"); $finish;',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;

  logic sys_clk = 0;
  always #5 sys_clk = ~sys_clk;   // 100 MHz system clock

  logic rst, en, scl;
  logic scl_prev;   // one-cycle delay of SCL for edge detection
  int   edge_count; // tally of SCL rising edges

  // Instantiate the clock generator with CLK_DIV=10
  i2c_clk_gen #(.CLK_DIV(10)) dut (
    .sys_clk(sys_clk),
    .rst    (rst),
    .en     (en),
    .scl    (scl)
  );

  // Parallel always_ff block: count every SCL 0->1 transition
  always_ff @(posedge sys_clk) begin
    scl_prev <= scl;                          // store previous SCL
    if (scl && !scl_prev)                    // rising edge detected
      edge_count <= edge_count + 1;
  end

  initial begin
    $display("=== SCL Clock Generator Test ===");

    // Reset sequence
    rst = 0; en = 0; edge_count = 0;
    repeat(2) @(posedge sys_clk); #1;
    rst = 1;

    // Test 1: disabled — no SCL edges expected
    edge_count = 0;
    repeat(20) @(posedge sys_clk); #1;
    if (edge_count === 0)
      $display("PASS  disabled: no SCL edges");
    else
      $display("FAIL  disabled: saw %0d edges (expected 0)", edge_count);

    // Test 2: enabled — expect >= 5 rising edges in 60 system cycles
    edge_count = 0;
    en = 1;
    repeat(60) @(posedge sys_clk); #1;
    if (edge_count >= 5)
      $display("PASS  enabled: SCL toggling correctly (%0d edges)", edge_count);
    else
      $display("FAIL  enabled: only %0d edges in 60 cycles (expected >=5)", edge_count);

    $display("Clock generator testbench works!");
    $finish;
  end
endmodule`,
      design:
`// Type the i2c_clk_gen testbench here.
// Read Theory first — it explains the edge-counting technique.
//
// Ports to connect to i2c_clk_gen:
//   sys_clk  — system clock (logic, driven by TB)
//   rst      — active-low reset (logic, driven by TB)
//   en       — enable SCL generation (logic, driven by TB)
//   scl      — SCL output (logic, monitored by TB)
//
// Internal TB signals:
//   scl_prev    — previous SCL value (logic)
//   edge_count  — rising-edge counter (int)
//
// Scenarios:
//   1. en=0 for 20 sys cycles => edge_count must stay 0
//   2. en=1 for 60 sys cycles => edge_count must reach >= 5
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;

  logic sys_clk = 0;
  always #5 sys_clk = ~sys_clk;

  logic rst, en, scl;
  logic scl_prev;
  int   edge_count;

  i2c_clk_gen #(.CLK_DIV(10)) dut (
    .sys_clk(sys_clk),
    .rst    (rst),
    .en     (en),
    .scl    (scl)
  );

  always_ff @(posedge sys_clk) begin
    scl_prev <= scl;
    if (scl && !scl_prev)
      edge_count <= edge_count + 1;
  end

  initial begin
    $display("=== SCL Clock Generator Test ===");
    rst = 0; en = 0; edge_count = 0;
    repeat(2) @(posedge sys_clk); #1;
    rst = 1;

    edge_count = 0;
    repeat(20) @(posedge sys_clk); #1;
    if (edge_count === 0)
      \$display("PASS  disabled: no SCL edges");
    else
      \$display("FAIL  disabled: saw %0d edges (expected 0)", edge_count);

    edge_count = 0;
    en = 1;
    repeat(60) @(posedge sys_clk); #1;
    if (edge_count >= 5)
      \$display("PASS  enabled: SCL toggling correctly (%0d edges)", edge_count);
    else
      \$display("FAIL  enabled: only %0d edges in 60 cycles (expected >=5)", edge_count);

    \$display("Clock generator testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  disabled: no SCL edges',
        'PASS  enabled: SCL toggling correctly',
        'Clock generator testbench works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — Testing the Data Bit Transmitter  (Tier 2)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb2l2',
      title: 'L2 — Testing the Data Bit Transmitter',
      theory: `
<h2>Why setup and hold violations cause silent data corruption</h2>
<p>At chip companies, one of the most feared bugs is a setup-time violation on the I²C bus. The target device samples SDA on the rising edge of SCL. If SDA changes too close to that rising edge — or worse, while SCL is already high — the sample is unreliable. The target might latch a 1 instead of a 0. Your data is wrong, but no error flag fires. The write "succeeds" and you find the corruption hours later when a readback fails. This testbench catches that class of bug before a single transistor is manufactured.</p>

<h2>Setup and hold windows around the SCL rising edge</h2>
<p>Think of the SCL rising edge as the closing of a camera shutter. For the photo to be sharp, the subject (SDA) must be perfectly still before the shutter closes (setup time) and stay still for a moment after (hold time). If SDA moves during exposure — blurry photo, wrong bit.</p>

<pre class="code-block">// Setup/hold window around SCL rising edge
//
// SDA:  ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
//                   ↑ must be stable here ↑
// SCL:  ____________|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|___
//                   ↑ rising edge         ↑ falling edge
//       SDA must not change while SCL is high</pre>

<h2>How to check stability in a testbench</h2>
<p>Sample SDA once when SCL goes high, then sample it again just before SCL goes low. If the two samples match, SDA was stable. The testbench uses the open-drain model: <code>sda_out</code> is an inout wire with a pullup, so released = 1 and driven-low = 0, exactly as on a real bus.</p>

<pre class="code-block">// SCL-edge-aligned sampling pattern
logic sda_at_rise, sda_at_fall;

// After SCL goes high:
@(posedge scl); #1;
sda_at_rise = sda_out;   // capture SDA shortly after rising edge

// Just before SCL goes low:
@(negedge scl); #1;
sda_at_fall = sda_out;   // capture SDA shortly after falling edge

// Stability check: both samples must match
if (sda_at_rise === sda_at_fall) ... // SDA was stable during SCL high</pre>

<table class="truth-table">
  <tr><th>bit_in</th><th>Expected sda_out during SCL high</th><th>What to check</th></tr>
  <tr><td>0</td><td>0 (driven low)</td><td>sda_out === 0 at both rise and fall samples</td></tr>
  <tr><td>1</td><td>1 (released, pullup wins)</td><td>sda_out === 1 at both rise and fall samples</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_bit_tx</code>. The DUT takes <code>clk</code>, <code>rst</code>, <code>scl</code>, and <code>bit_in</code>, and drives <code>sda_out</code> as an open-drain inout. Your testbench supplies SCL manually (toggle it yourself — you control timing here), asserts a bit value, then samples SDA at the SCL rising edge and falling edge to verify it was stable throughout. Two scenarios: send bit=0 and verify SDA is low during SCL high; send bit=1 and verify SDA is high during SCL high.</p>

<table class="truth-table">
  <tr><th>Port/Signal</th><th>Direction</th><th>Declare as</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>driven by TB</td><td><code>logic</code></td><td>System clock; free-running 100 MHz oscillator in the TB</td></tr>
  <tr><td><code>rst</code></td><td>driven by TB</td><td><code>logic</code></td><td>Active-low reset; assert for 2 cycles then release before test starts</td></tr>
  <tr><td><code>scl</code></td><td>driven by TB</td><td><code>logic</code></td><td>SCL line driven manually by the TB to control the sampling window</td></tr>
  <tr><td><code>bit_in</code></td><td>driven by TB</td><td><code>logic</code></td><td>The data bit the DUT should transmit on the next SCL cycle</td></tr>
  <tr><td><code>sda_out</code></td><td>inout from DUT</td><td><code>wire</code></td><td>Open-drain SDA — must be wire so the pullup primitive can drive it</td></tr>
  <tr><td><code>pu</code></td><td>pullup primitive</td><td><code>pullup</code></td><td>Simulates the external I²C pull-up resistor; releases sda_out to 1</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps',
        '── Line 2 ──  module tb;',
        '── Line 4 ──  wire  sda_out;          ← inout must be wire, not logic',
        '── Line 5 ──  pullup pu(sda_out);     ← simulates external pull-up resistor',
        '── Line 7 ──  logic clk = 0;  always #5 clk = ~clk;   ← 100 MHz clock',
        '── Line 8 ──  logic rst, scl, bit_in;   ← driven signals are logic',
        '── Line 10 ── i2c_bit_tx dut instantiation with all four ports',
        '── Line 12 ── task automatic check_bit — takes expected value, drives SCL high then low, samples SDA',
        '── Line 13 ──   inside task: scl=0 first (SDA changes while SCL low)',
        '── Line 14 ──   scl=1; @(posedge clk); #1; — sample SDA at rise',
        '── Line 15 ──   scl=0; @(posedge clk); #1; — done with this bit',
        '── Line 16 ──   compare sda_out with expected, display PASS or FAIL',
        '── Line 19 ── initial begin — reset, then check_bit(0,0), check_bit(1,1)',
        '── Line 25 ── $display("Bit TX testbench works!"); $finish;',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;

  wire  sda_out;          // inout: must be wire so pullup can drive it
  pullup pu(sda_out);     // external pull-up resistor — released = 1

  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz system clock

  logic rst, scl, bit_in;

  i2c_bit_tx dut (
    .clk    (clk),
    .rst    (rst),
    .scl    (scl),
    .bit_in (bit_in),
    .sda_out(sda_out)
  );

  // Sample SDA while SCL is high — check it matches expected value
  task automatic check_bit(input logic b, input logic exp);
    bit_in = b;
    scl = 0;                         // SCL low: DUT sets up SDA now
    @(posedge clk); #1;
    scl = 1;                         // SCL rising edge: sample window opens
    @(posedge clk); #1;
    if (sda_out === exp)
      $display("PASS  bit=%0b: sda=%0b during SCL high", b, sda_out);
    else
      $display("FAIL  bit=%0b: sda=%0b during SCL high (expected %0b)", b, sda_out, exp);
    scl = 0;                         // SCL falling edge: bit done
    @(posedge clk); #1;
  endtask

  initial begin
    $display("=== I2C Bit TX Test ===");
    rst = 0; scl = 0; bit_in = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    check_bit(0, 0);   // send 0 -> SDA should be driven low
    check_bit(1, 1);   // send 1 -> SDA should be released (pullup = 1)

    $display("Bit TX testbench works!");
    $finish;
  end
endmodule`,
      design:
`// Type the i2c_bit_tx testbench here.
// Read Theory first — it explains the setup/hold window check.
//
// Ports to connect to i2c_bit_tx:
//   clk     — system clock (logic)
//   rst     — active-low reset (logic)
//   scl     — SCL line driven by TB (logic)
//   bit_in  — bit to transmit (logic)
//   sda_out — open-drain output (wire + pullup)
//
// Scenarios:
//   1. Send bit=0 => sda_out must be 0 while SCL is high
//   2. Send bit=1 => sda_out must be 1 while SCL is high
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;

  wire  sda_out;
  pullup pu(sda_out);

  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, scl, bit_in;

  i2c_bit_tx dut (
    .clk    (clk),
    .rst    (rst),
    .scl    (scl),
    .bit_in (bit_in),
    .sda_out(sda_out)
  );

  task automatic check_bit(input logic b, input logic exp);
    bit_in = b;
    scl = 0;
    @(posedge clk); #1;
    scl = 1;
    @(posedge clk); #1;
    if (sda_out === exp)
      \$display("PASS  bit=%0b: sda=%0b during SCL high", b, sda_out);
    else
      \$display("FAIL  bit=%0b: sda=%0b during SCL high (expected %0b)", b, sda_out, exp);
    scl = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== I2C Bit TX Test ===");
    rst = 0; scl = 0; bit_in = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    check_bit(0, 0);
    check_bit(1, 1);

    \$display("Bit TX testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  bit=0: sda=0 during SCL high',
        'PASS  bit=1: sda=1 during SCL high',
        'Bit TX testbench works!'
      ]
    },

    // L3 added in next commit
  ]
});
