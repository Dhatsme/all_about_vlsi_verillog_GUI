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

    // L2 added next

  ]
});
