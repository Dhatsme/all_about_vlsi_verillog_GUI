(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb3',
  title: 'Byte Transfer Testbenches',
  icon: '📦',
  level: 'intermediate',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Testing the TX Byte FSM  (Tier 2–3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb3l1',
      title: 'L1 — Testing the TX Byte FSM',
      theory: `
<h2>Why the TX byte layer is the most dangerous place to have a bug</h2>
<p>Every EEPROM write — saving your WiFi password to flash, storing sensor calibration data, logging a fault code — goes through a TX byte FSM. If bit 3 comes out in the wrong order, the write command silently corrupts the data. No error flag fires; the wrong byte lands in memory. This kind of bug surfaces only in production, hours after shipping. That is why the TX byte FSM gets its own directed testbench before anything else is integrated.</p>

<h2>What the TX byte FSM does</h2>
<p>The state machine walks through five states. Each state transition advances on a SCL clock edge:</p>

<pre class="code-block">         load_en
IDLE ──────────&gt; LOAD ──&gt; SHIFT(0) ──&gt; SHIFT(1) ──&gt; ... ──&gt; SHIFT(7)
                                                                    |
                                                              ACK_WAIT
                                                                    |
                                                             (ack on sda)
                                                                    |
                                                               DONE ──&gt; IDLE</pre>

<p>At each SHIFT state, the current MSB appears on <code>sda_out</code>. The register shifts left one bit. After all 8 bits, the master waits one more SCL cycle for the receiver to pull SDA low (ACK). If SDA stays high, it is a NACK.</p>

<h2>FSM coverage — testing the happy path is not enough</h2>
<p>A standard test only drives the happy path: correct data, ACK arrives. But real failures hide in the NACK path — when the receiver does not acknowledge. If the FSM gets stuck in ACK_WAIT on a NACK, the bus locks up. Your testbench must drive both scenarios.</p>

<pre class="code-block">// Task skeleton — drives 8 SCL cycles then one ACK slot
task automatic send_byte(input logic [7:0] data,
                          input logic       ack);
  // 1. Assert load_en for one SCL cycle to latch data
  // 2. Loop 8 times: wait SCL low, wait SCL high, sample sda_out
  // 3. On 9th SCL cycle: drive sda = ~ack (low = ACK, high = NACK)
endtask</pre>

<h2>Behaviour table</h2>
<table class="truth-table">
  <tr><th>Phase</th><th>SCL</th><th>SDA action</th><th>What to check</th></tr>
  <tr><td>LOAD</td><td>—</td><td>load_en pulse</td><td>busy goes high</td></tr>
  <tr><td>SHIFT[7..0]</td><td>rising</td><td>sda_out = MSB of remaining</td><td>bits match data MSB-first</td></tr>
  <tr><td>ACK_WAIT</td><td>rising</td><td>testbench drives sda low for ACK</td><td>done pulses after ACK</td></tr>
  <tr><td>NACK path</td><td>rising</td><td>testbench keeps sda high</td><td>done pulses; ack_err = 1</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench that clocks the TX FSM through a complete 9-cycle transmission. You will watch each bit on <code>sda_out</code>, verify the order is MSB-first, then drive the ACK slot and confirm <code>done</code> pulses. A second call with a NACK checks the error path. A passing run prints two PASS lines followed by "TX byte testbench works!".</p>

<h2>Testbench port table</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type in TB</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic, driven by always block</td><td>System clock that advances all flip-flops in the DUT.</td></tr>
  <tr><td><code>rst</code></td><td>logic</td><td>Active-low synchronous reset; hold low for two cycles at start to clear FSM.</td></tr>
  <tr><td><code>scl</code></td><td>logic</td><td>I2C clock driven by the testbench; each rising edge advances one FSM shift step.</td></tr>
  <tr><td><code>load_en</code></td><td>logic</td><td>Pulses high for one cycle to tell the FSM to latch the byte from <code>tx_data</code>.</td></tr>
  <tr><td><code>tx_data</code></td><td>logic [7:0]</td><td>Byte to be transmitted; must be stable before load_en rises.</td></tr>
  <tr><td><code>sda_in</code></td><td>logic</td><td>SDA as seen by the DUT on the ACK slot; drive low for ACK, high for NACK.</td></tr>
  <tr><td><code>sda_out</code></td><td>logic</td><td>Bit the DUT is driving onto SDA; sample this after each SCL rising edge.</td></tr>
  <tr><td><code>busy</code></td><td>logic</td><td>DUT asserts this while a transmission is in progress.</td></tr>
  <tr><td><code>done</code></td><td>logic</td><td>DUT pulses this for one cycle when the 9-bit sequence completes.</td></tr>
  <tr><td><code>ack_err</code></td><td>logic</td><td>DUT sets this when a NACK is received in the ACK slot.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the testbench module: module tb; (no ports)',
        'Generate a 100 MHz system clock: logic clk = 0; always #5 clk = ~clk;',
        'Declare the SCL signal as logic scl = 0; (testbench drives SCL)',
        'Declare all DUT input signals as logic: rst, load_en, tx_data [7:0], sda_in',
        'Declare all DUT output signals as logic: sda_out, busy, done, ack_err',
        'Instantiate i2c_tx_byte dut connecting all ports by name',
        'Write task send_byte(input logic [7:0] data, input logic ack): pulse load_en, toggle SCL 8 times sampling sda_out, drive ACK slot',
        'In initial block: reset DUT for 2 cycles, call send_byte(8\'hA5, 1) — ACK path',
        'Check that done pulsed after the ACK cycle; display PASS or FAIL',
        'Call send_byte(8\'hA5, 0) — NACK path; check ack_err = 1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz system clock

  logic       scl    = 0;
  logic       rst;
  logic       load_en;
  logic [7:0] tx_data;
  logic       sda_in;
  logic       sda_out;
  logic       busy;
  logic       done;
  logic       ack_err;

  i2c_tx_byte dut (
    .clk    (clk),
    .rst    (rst),
    .scl    (scl),
    .load_en(load_en),
    .tx_data(tx_data),
    .sda_in (sda_in),
    .sda_out(sda_out),
    .busy   (busy),
    .done   (done),
    .ack_err(ack_err)
  );

  // Drive one SCL pulse (low -> high -> low) aligned to system clock
  task automatic scl_pulse;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
  endtask

  // send_byte: load data into FSM, clock out 8 bits, drive ACK slot
  task automatic send_byte(input logic [7:0] data, input logic ack);
    logic [7:0] captured;
    integer i;
    tx_data  = data;
    load_en  = 1; @(posedge clk); #1;
    load_en  = 0;
    captured = 8'h00;
    for (i = 7; i >= 0; i--) begin
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1;
      captured[i] = sda_out;   // sample on SCL high
      scl = 0;
    end
    // 9th cycle: ACK slot — drive sda_in low for ACK, high for NACK
    sda_in = ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;         // let done/ack_err settle
  endtask

  initial begin
    \$display("=== TX Byte FSM Test ===");
    rst = 0; load_en = 0; sda_in = 1; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;

    // --- ACK path: transmit 0xA5, receiver ACKs ---
    send_byte(8'hA5, 1);
    if (done === 1 && ack_err === 0)
      \$display("PASS  byte 0xA5 transmitted");
    else
      \$display("FAIL  byte 0xA5: done=%0b ack_err=%0b", done, ack_err);

    // --- NACK path: transmit 0xA5, receiver NACKs ---
    @(posedge clk); #1;
    send_byte(8'hA5, 0);
    if (done === 1 && ack_err === 1)
      \$display("PASS  done pulsed after ACK");
    else
      \$display("FAIL  NACK path: done=%0b ack_err=%0b", done, ack_err);

    \$display("TX byte testbench works!");
    \$finish;
  end
endmodule`,
      design:
`// Type the i2c_tx_byte testbench here.
// Read Theory first -- it explains FSM state coverage and the send_byte task structure.
//
// Ports to declare as logic:
//   clk, scl, rst, load_en, tx_data [7:0], sda_in   -- inputs to DUT
//   sda_out, busy, done, ack_err                     -- outputs from DUT
//
// Task send_byte(data, ack):
//   1. Pulse load_en for one clock
//   2. Toggle SCL 8 times, sample sda_out each high phase
//   3. Drive sda_in low (ACK) or high (NACK) on the 9th SCL cycle
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       scl    = 0;
  logic       rst;
  logic       load_en;
  logic [7:0] tx_data;
  logic       sda_in;
  logic       sda_out;
  logic       busy;
  logic       done;
  logic       ack_err;

  i2c_tx_byte dut (
    .clk    (clk),
    .rst    (rst),
    .scl    (scl),
    .load_en(load_en),
    .tx_data(tx_data),
    .sda_in (sda_in),
    .sda_out(sda_out),
    .busy   (busy),
    .done   (done),
    .ack_err(ack_err)
  );

  task automatic send_byte(input logic [7:0] data, input logic ack);
    integer i;
    tx_data  = data;
    load_en  = 1; @(posedge clk); #1;
    load_en  = 0;
    for (i = 7; i >= 0; i--) begin
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    sda_in = ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== TX Byte FSM Test ===");
    rst = 0; load_en = 0; sda_in = 1; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;

    send_byte(8'hA5, 1);
    if (done === 1 && ack_err === 0)
      \$display("PASS  byte 0xA5 transmitted");
    else
      \$display("FAIL  byte: done=%0b ack_err=%0b", done, ack_err);

    @(posedge clk); #1;
    send_byte(8'hA5, 0);
    if (done === 1 && ack_err === 1)
      \$display("PASS  done pulsed after ACK");
    else
      \$display("FAIL  NACK: done=%0b ack_err=%0b", done, ack_err);

    \$display("TX byte testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  byte 0xA5 transmitted',
        'PASS  done pulsed after ACK',
        'TX byte testbench works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — Testing RX Byte + ACK  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb3l2',
      title: 'L2 — Testing RX Byte + ACK',
      theory: `
<h2>Verifying the receiver — the master plays a different role</h2>
<p>In a real I²C system, a temperature sensor sits quietly on the bus waiting for a read command. When the master sends a READ, the <em>target</em> drives SDA for 8 cycles while the master clocks SCL. The target's RX path is never exercised until a real master asks for data. In simulation you are that master. If you do not drive the SCL pulses and the data bits yourself, the RX byte module never moves out of IDLE — and a silent hang is indistinguishable from a passing test.</p>

<h2>The 9-clock receive sequence</h2>
<pre class="code-block">  SCL:  ___|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|___|‾|___
  SDA:   B7  B6  B5  B4  B3  B2  B1  B0    ACK
         ↑ sample on rising SCL edge           ↑ master drives ACK</pre>

<p>Each bit is sampled by the DUT on the <strong>rising edge of SCL</strong>. The testbench drives SDA before raising SCL, holds it stable through the high phase, then lowers SCL again. After 8 data bits, the master drives SDA low for one more SCL cycle to signal ACK, or leaves it high for NACK.</p>

<h2>The drive_byte task</h2>
<p>Rather than copying 8 blocks of SCL stimulus, you write it once as a task. The task accepts a byte value and loops from bit 7 down to bit 0, driving SDA then toggling SCL:</p>

<pre class="code-block">task automatic drive_byte(input logic [7:0] data);
  integer i;
  for (i = 7; i &gt;= 0; i--) begin
    sda_tb = data[i];          // put the bit on the bus
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
  end
  // testbench drives ACK after the loop
endtask</pre>

<h2>What to check</h2>
<table class="truth-table">
  <tr><th>Test scenario</th><th>Input byte</th><th>ACK driven</th><th>Expected outputs</th></tr>
  <tr><td>Normal receive</td><td>0xB6</td><td>low (ACK)</td><td>byte_out = 0xB6, valid pulses</td></tr>
  <tr><td>All-zero receive</td><td>0x00</td><td>high (NACK)</td><td>byte_out = 0x00, valid pulses; ack_out = 1</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench that acts as the I2C master: driving SDA bit by bit while toggling SCL, then checking that the DUT assembled the correct byte and pulsed <code>valid</code> at the right time. The NACK check confirms the DUT reports the correct acknowledgement state. A passing run shows three PASS lines and "RX byte testbench works!".</p>

<h2>Testbench port table</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type in TB</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic, clock gen</td><td>System clock that drives all flip-flops in the DUT.</td></tr>
  <tr><td><code>rst</code></td><td>logic</td><td>Active-low synchronous reset; assert for two cycles before each test.</td></tr>
  <tr><td><code>scl</code></td><td>logic</td><td>I2C clock driven by the testbench; one rising edge per data bit.</td></tr>
  <tr><td><code>sda_tb</code></td><td>logic</td><td>Serial data driven by the testbench (master side); connects to DUT's sda_in.</td></tr>
  <tr><td><code>byte_out</code></td><td>logic [7:0]</td><td>Assembled byte output from the DUT; checked after the 8th bit.</td></tr>
  <tr><td><code>valid</code></td><td>logic</td><td>DUT pulses this high for one cycle when a complete byte has been received.</td></tr>
  <tr><td><code>ack_out</code></td><td>logic</td><td>DUT drives this on the ACK slot: 0 = ACK driven, 1 = NACK driven.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb; with system clock generation (always #5 clk = ~clk)',
        'Declare scl as logic and sda_tb as logic (master-driven SDA)',
        'Declare output signals from DUT: byte_out [7:0], valid, ack_out',
        'Instantiate i2c_rx_byte dut connecting clk, rst, scl, sda_in (← sda_tb), byte_out, valid, ack_out',
        'Write drive_byte task: loop bit 7..0, drive sda_tb = data[i], pulse SCL high then low each iteration',
        'After the loop: drive ack_out clock (sda_tb low for ACK, high for NACK), pulse SCL, then wait one extra clk cycle',
        'In initial block: reset DUT, call drive_byte(8\'hB6) with ACK; verify byte_out === 8\'hB6 and valid pulsed',
        'Second test: reset, call drive_byte(8\'h00) with NACK; verify byte_out === 8\'h00 and valid pulsed',
        'Check NACK driven correctly: ack_out === 1 in the NACK scenario',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       scl    = 0;
  logic       rst;
  logic       sda_tb;      // testbench drives SDA (master role)
  logic [7:0] byte_out;
  logic       valid;
  logic       ack_out;

  i2c_rx_byte dut (
    .clk    (clk),
    .rst    (rst),
    .scl    (scl),
    .sda_in (sda_tb),
    .byte_out(byte_out),
    .valid  (valid),
    .ack_out(ack_out)
  );

  // drive_byte: clock 8 bits onto SDA MSB-first, then drive ACK/NACK slot
  task automatic drive_byte(input logic [7:0] data, input logic send_ack);
    integer i;
    for (i = 7; i >= 0; i--) begin
      sda_tb = data[i];          // set bit before raising SCL
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    // 9th SCL cycle: master drives ACK (low) or NACK (high)
    sda_tb = send_ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;   // one extra cycle for valid/ack_out to settle
  endtask

  initial begin
    \$display("=== RX Byte + ACK Test ===");

    // --- Test 1: receive 0xB6 with ACK ---
    rst = 0; sda_tb = 1; scl = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    drive_byte(8'hB6, 1);
    if (byte_out === 8'hB6)
      \$display("PASS  received 0xb6");
    else
      \$display("FAIL  received 0x%02h (expected 0xb6)", byte_out);

    if (valid === 1)
      \$display("PASS  valid pulsed");
    else
      \$display("FAIL  valid did not pulse");

    // --- Test 2: receive 0x00 with NACK ---
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;
    drive_byte(8'h00, 0);
    if (ack_out === 1)
      \$display("PASS  NACK driven correctly");
    else
      \$display("FAIL  NACK: ack_out=%0b (expected 1)", ack_out);

    \$display("RX byte testbench works!");
    \$finish;
  end
endmodule`,
      design:
`// Type the i2c_rx_byte testbench here. See Theory for the concept.
//
// Ports: clk, rst, scl, sda_tb (inputs to DUT), byte_out [7:0], valid, ack_out (outputs)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       scl    = 0;
  logic       rst;
  logic       sda_tb;
  logic [7:0] byte_out;
  logic       valid;
  logic       ack_out;

  i2c_rx_byte dut (
    .clk    (clk),
    .rst    (rst),
    .scl    (scl),
    .sda_in (sda_tb),
    .byte_out(byte_out),
    .valid  (valid),
    .ack_out(ack_out)
  );

  task automatic drive_byte(input logic [7:0] data, input logic send_ack);
    integer i;
    for (i = 7; i >= 0; i--) begin
      sda_tb = data[i];
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    sda_tb = send_ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== RX Byte + ACK Test ===");
    rst = 0; sda_tb = 1; scl = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;

    drive_byte(8'hB6, 1);
    if (byte_out === 8'hB6)
      \$display("PASS  received 0xb6");
    else
      \$display("FAIL  received 0x%02h (expected 0xb6)", byte_out);

    if (valid === 1)
      \$display("PASS  valid pulsed");
    else
      \$display("FAIL  valid did not pulse");

    rst = 0; repeat(2) @(posedge clk); #1; rst = 1;
    drive_byte(8'h00, 0);
    if (ack_out === 1)
      \$display("PASS  NACK driven correctly");
    else
      \$display("FAIL  NACK: ack_out=%0b", ack_out);

    \$display("RX byte testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  received 0xb6',
        'PASS  valid pulsed',
        'PASS  NACK driven correctly',
        'RX byte testbench works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L3 — Testing the Combined TX/RX Controller  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb3l3',
      title: 'L3 — Testing the Combined TX/RX Controller',
      theory: `
<h2>Why a combined controller needs its own testbench</h2>
<p>Real I²C transactions alternate directions. A master writes a register address (TX), then immediately reads back the register value (RX) — often switching mode without releasing the bus. A TX testbench and an RX testbench each working in isolation give you no information about whether the mode-switch handshake works. Integration failures live exactly at the seam between two separately-verified sub-modules. This is why the combined controller gets a dedicated test.</p>

<h2>The byte controller interface</h2>
<p>The <code>i2c_byte_ctrl</code> module wraps the TX FSM and the RX datapath behind a single mode-select port. When <code>mode = 0</code> the controller is in TX mode; when <code>mode = 1</code> it is in RX mode. Both paths share the SCL and SDA buses:</p>

<pre class="code-block">mode=0 (TX):
  load_en ──&gt; FSM loads tx_data ──&gt; shifts 8 bits onto sda_out ──&gt; waits ACK

mode=1 (RX):
  8 SCL pulses with sda_in driven ──&gt; byte_out assembled ──&gt; valid pulses</pre>

<h2>Two independent test sequences</h2>
<table class="truth-table">
  <tr><th>Test</th><th>mode</th><th>Stimulus</th><th>What to verify</th></tr>
  <tr><td>TX path</td><td>0</td><td>load 0xC3, clock 8 SCL cycles, drive ACK</td><td>done=1, ack_err=0 after the 9th SCL</td></tr>
  <tr><td>RX path</td><td>1</td><td>drive 0x7E bit-by-bit on sda_in, clock 8 SCL cycles, drive ACK</td><td>byte_out=0x7E, valid=1 after the 8th SCL</td></tr>
</table>

<h2>Reusing your tasks</h2>
<p>You already wrote <code>send_byte</code> in L1 and <code>drive_byte</code> in L2. In this lesson you bring both into a single testbench and add the <code>mode</code> signal as a switch between them. The key structural insight: set <code>mode</code> before asserting <code>load_en</code> or starting SCL pulses, then verify the correct outputs for that mode.</p>

<pre class="code-block">// Structural outline of your test sequence
mode = 0;              // select TX path
send_byte(8'hC3, 1);   // transmit with ACK
check done, ack_err;

mode = 1;              // select RX path
drive_byte(8'h7E, 1);  // receive with ACK
check byte_out, valid;</pre>

<h2>Before you code</h2>
<p>You are writing a single testbench that exercises both paths of the byte controller. The TX path verifies bit transmission and ACK handling. The RX path verifies byte assembly and valid signalling. Together they prove the mode-select logic routes signals correctly in both directions. A passing run shows two PASS lines and "Byte controller testbench works!".</p>

<h2>Testbench port table</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type in TB</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic, clock gen</td><td>System clock shared by both TX FSM and RX datapath.</td></tr>
  <tr><td><code>rst</code></td><td>logic</td><td>Active-low reset; clears both TX and RX state machines.</td></tr>
  <tr><td><code>mode</code></td><td>logic</td><td>0 = TX path active, 1 = RX path active; set before stimulus.</td></tr>
  <tr><td><code>scl</code></td><td>logic</td><td>I2C clock driven by testbench; used by both TX and RX paths.</td></tr>
  <tr><td><code>load_en</code></td><td>logic</td><td>TX-path: pulse high for one cycle to latch tx_data into the FSM.</td></tr>
  <tr><td><code>tx_data</code></td><td>logic [7:0]</td><td>TX-path: byte to transmit; stable before load_en.</td></tr>
  <tr><td><code>sda_in</code></td><td>logic</td><td>RX-path: testbench drives each bit here; also carries ACK in TX path.</td></tr>
  <tr><td><code>sda_out</code></td><td>logic</td><td>TX-path output: the bit the DUT is placing on the bus.</td></tr>
  <tr><td><code>byte_out</code></td><td>logic [7:0]</td><td>RX-path output: assembled byte from 8 serial bits.</td></tr>
  <tr><td><code>valid</code></td><td>logic</td><td>RX-path: pulses high for one cycle when byte_out is ready.</td></tr>
  <tr><td><code>done</code></td><td>logic</td><td>TX-path: pulses high for one cycle after the 9-bit sequence completes.</td></tr>
  <tr><td><code>ack_err</code></td><td>logic</td><td>TX-path: high when a NACK was received in the ACK slot.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb; with 100 MHz clock generation',
        'Declare mode, scl, rst, load_en, tx_data [7:0], sda_in as logic inputs to DUT',
        'Declare sda_out, byte_out [7:0], valid, done, ack_err as logic outputs from DUT',
        'Instantiate i2c_byte_ctrl dut connecting all ports by name',
        'Write task send_byte(data, ack): pulse load_en, 8 SCL toggles, drive sda_in for ACK slot',
        'Write task drive_byte(data, send_ack): loop bit 7..0 driving sda_in + SCL pulses, then ACK slot',
        'TX test: set mode=0, reset DUT, call send_byte(8\'hC3, 1), check done===1 && ack_err===0',
        'RX test: set mode=1, reset DUT, call drive_byte(8\'h7E, 1), check byte_out===8\'h7E && valid===1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       mode;
  logic       scl    = 0;
  logic       rst;
  logic       load_en;
  logic [7:0] tx_data;
  logic       sda_in;
  logic       sda_out;
  logic [7:0] byte_out;
  logic       valid;
  logic       done;
  logic       ack_err;

  i2c_byte_ctrl dut (
    .clk    (clk),
    .rst    (rst),
    .mode   (mode),
    .scl    (scl),
    .load_en(load_en),
    .tx_data(tx_data),
    .sda_in (sda_in),
    .sda_out(sda_out),
    .byte_out(byte_out),
    .valid  (valid),
    .done   (done),
    .ack_err(ack_err)
  );

  // TX path: load byte, clock 8 bits out, drive ACK slot
  task automatic send_byte(input logic [7:0] data, input logic ack);
    integer i;
    tx_data = data;
    load_en = 1; @(posedge clk); #1;
    load_en = 0;
    for (i = 7; i >= 0; i--) begin
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    sda_in = ack ? 1'b0 : 1'b1;   // low = ACK, high = NACK
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;
  endtask

  // RX path: drive 8 data bits then ACK/NACK slot
  task automatic drive_byte(input logic [7:0] data, input logic send_ack);
    integer i;
    for (i = 7; i >= 0; i--) begin
      sda_in = data[i];
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    sda_in = send_ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== Byte Controller TX/RX Test ===");

    // --- TX path: transmit 0xC3 with ACK ---
    mode = 0; rst = 0; load_en = 0; sda_in = 1; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    send_byte(8'hC3, 1);
    if (done === 1 && ack_err === 0)
      \$display("PASS  TX mode: byte transmitted");
    else
      \$display("FAIL  TX mode: done=%0b ack_err=%0b", done, ack_err);

    // --- RX path: receive 0x7E with ACK ---
    mode = 1; rst = 0; sda_in = 1;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    drive_byte(8'h7E, 1);
    if (byte_out === 8'h7E && valid === 1)
      \$display("PASS  RX mode: byte received");
    else
      \$display("FAIL  RX mode: byte_out=0x%02h valid=%0b", byte_out, valid);

    \$display("Byte controller testbench works!");
    \$finish;
  end
endmodule`,
      design:
`// Build the i2c_byte_ctrl testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       mode;
  logic       scl    = 0;
  logic       rst;
  logic       load_en;
  logic [7:0] tx_data;
  logic       sda_in;
  logic       sda_out;
  logic [7:0] byte_out;
  logic       valid;
  logic       done;
  logic       ack_err;

  i2c_byte_ctrl dut (
    .clk    (clk),
    .rst    (rst),
    .mode   (mode),
    .scl    (scl),
    .load_en(load_en),
    .tx_data(tx_data),
    .sda_in (sda_in),
    .sda_out(sda_out),
    .byte_out(byte_out),
    .valid  (valid),
    .done   (done),
    .ack_err(ack_err)
  );

  task automatic send_byte(input logic [7:0] data, input logic ack);
    integer i;
    tx_data = data;
    load_en = 1; @(posedge clk); #1;
    load_en = 0;
    for (i = 7; i >= 0; i--) begin
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    sda_in = ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;
  endtask

  task automatic drive_byte(input logic [7:0] data, input logic send_ack);
    integer i;
    for (i = 7; i >= 0; i--) begin
      sda_in = data[i];
      @(posedge clk); #1; scl = 1;
      @(posedge clk); #1; scl = 0;
    end
    sda_in = send_ack ? 1'b0 : 1'b1;
    @(posedge clk); #1; scl = 1;
    @(posedge clk); #1; scl = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== Byte Controller TX/RX Test ===");

    mode = 0; rst = 0; load_en = 0; sda_in = 1; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    send_byte(8'hC3, 1);
    if (done === 1 && ack_err === 0)
      \$display("PASS  TX mode: byte transmitted");
    else
      \$display("FAIL  TX mode: done=%0b ack_err=%0b", done, ack_err);

    mode = 1; rst = 0; sda_in = 1;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    drive_byte(8'h7E, 1);
    if (byte_out === 8'h7E && valid === 1)
      \$display("PASS  RX mode: byte received");
    else
      \$display("FAIL  RX mode: byte_out=0x%02h valid=%0b", byte_out, valid);

    \$display("Byte controller testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  TX mode: byte transmitted',
        'PASS  RX mode: byte received',
        'Byte controller testbench works!'
      ]
    }

  ]
});
