// Module i2c1 — I²C Fundamentals
// Verilator 5.020 safe (L2, L3). L1 uses pullup primitive — run with iverilog.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c1',
  title: 'I²C Fundamentals',
  icon: '🔗',
  level: 'beginner',
  lessons: [

    // ──────────────────────────────────────────────────────────
    // L1 — Open-Drain I/O Cell (Tier 1)
    // ──────────────────────────────────────────────────────────
    {
      id: 'i2c1l1',
      title: 'L1 — Open-Drain I/O Cell',
      theory: `
<h2>What is I²C?</h2>
<p>I²C (Inter-Integrated Circuit) is a two-wire serial protocol used to link chips on the same board — sensors, displays, EEPROMs, temperature monitors. It needs only two lines: <strong>SCL</strong> (clock) and <strong>SDA</strong> (data). Both wires are <em>open-drain</em>, which is the concept this lesson is all about.</p>

<h2>Open-drain — the rope analogy</h2>
<p>Picture a rope hung from the ceiling with a weight on the end. Anyone on the bus can grab it and <strong>pull it down</strong>. Nobody can push it back up — they just let go. The weight (the pull-up resistor) brings it back to 1 automatically. On I²C, devices only ever drive the wire <strong>low (0)</strong>; to send a 1 they simply release and let the resistor do the work.</p>

<table class="truth-table">
  <tr><th>tx_en</th><th>tx_data</th><th>sda driven to</th><th>What happens</th></tr>
  <tr><td>0</td><td>×</td><td>released (z)</td><td>Pull-up holds sda = 1</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>Device pulls the rope down</td></tr>
  <tr><td>1</td><td>1</td><td>released (z)</td><td>I²C never drives 1 — release instead</td></tr>
</table>

<h2>High-impedance in SystemVerilog</h2>
<p>The value <code>1'bz</code> means <em>not driving</em> — the port is disconnected from the logic. An external pull-up resistor then determines the actual voltage.</p>
<pre class="code-block">assign sda = drive_low ? 1'b0 : 1'bz;
//                        &uarr;         &uarr;
//                   pull low    release (float to 1)</pre>

<h2>The inout port</h2>
<p>SDA is bidirectional: the same physical pin both sends and receives. Declare it as <code>inout wire sda</code> in the module header — use <code>wire</code>, never <code>logic</code>, for bidirectional nets.</p>

<h2>What you will build — i2c_io_cell</h2>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>tx_en</code></td><td>input logic</td><td>1 = this device wants to transmit</td></tr>
  <tr><td><code>tx_data</code></td><td>input logic</td><td>bit to send (only 0 is ever actively driven)</td></tr>
  <tr><td><code>sda</code></td><td>inout wire</td><td>the shared I²C data line</td></tr>
  <tr><td><code>rx_data</code></td><td>output logic</td><td>what we are reading from the bus right now</td></tr>
</table>
<p>Drive logic: <code>assign sda = (tx_en &amp; ~tx_data) ? 1'b0 : 1'bz;</code><br>Read logic: <code>assign rx_data = sda;</code></p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module i2c_io_cell (',
        '── Line 2 ──  input  logic tx_en,        ← comma',
        '── Line 3 ──  input  logic tx_data,      ← comma',
        '── Line 4 ──  inout  wire  sda,          ← comma — use wire not logic for inout',
        '── Line 5 ──  output logic rx_data        ← NO comma (last port)',
        '── Line 6 ──  );',
        '── Blank line ──',
        "── Line 8 ──    assign sda = (tx_en & ~tx_data) ? 1'b0 : 1'bz;   ← z = release",
        '── Line 9 ──    assign rx_data = sda;                              ← always listen',
        '── Blank line ──',
        '── Line 11 ── endmodule',
        'Use the iverilog simulator for this lesson — the pullup primitive requires iverilog',
        'Hit Run — all three PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_io_cell (
  input  logic tx_en,      // 1 = this device is transmitting
  input  logic tx_data,    // bit to send (I2C only drives 0; to send 1, release)
  inout  wire  sda,        // shared bus line -- must be wire, not logic
  output logic rx_data     // read whatever is currently on the bus
);
  // Open-drain: pull low only when tx_en=1 AND tx_data=0; release otherwise
  assign sda = (tx_en & ~tx_data) ? 1'b0 : 1'bz;
  assign rx_data = sda;    // always sample the bus

endmodule`,
      design:
`// Type the i2c_io_cell module here.
// Read Theory first -- it explains open-drain and high-impedance (z).
//
// Ports:
//   input  logic tx_en    -- 1 = this device wants to drive the bus
//   input  logic tx_data  -- bit to transmit (only 0 is ever actively driven)
//   inout  wire  sda      -- the shared I2C data wire (use wire, not logic)
//   output logic rx_data  -- what we read from the bus right now
//
// Logic:
//   assign sda = (tx_en & ~tx_data) ? 1'b0 : 1'bz;
//   assign rx_data = sda;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  wire  sda;               // inout must be wire in testbench
  pullup pu(sda);          // simulates 4.7 kΩ pull-up to VCC

  logic tx_en, tx_data;
  logic rx_data;

  i2c_io_cell dut (
    .tx_en  (tx_en),
    .tx_data(tx_data),
    .sda    (sda),
    .rx_data(rx_data)
  );

  initial begin
    \$display("=== I2C IO Cell Test ===");

    // Not transmitting -- pull-up holds sda HIGH
    tx_en = 0; tx_data = 0; #5;
    if (rx_data === 1)
      \$display("PASS  released: sda=1 (pull-up)");
    else
      \$display("FAIL  released: sda=%0b (expected 1)", rx_data);

    // Drive LOW -- tx_en=1, tx_data=0
    tx_en = 1; tx_data = 0; #5;
    if (rx_data === 0)
      \$display("PASS  driving low: sda=0");
    else
      \$display("FAIL  driving low: sda=%0b (expected 0)", rx_data);

    // Release again
    tx_en = 0; #5;
    if (rx_data === 1)
      \$display("PASS  released again: sda=1");
    else
      \$display("FAIL  released again: sda=%0b (expected 1)", rx_data);

    \$display("IO cell works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  released: sda=1 (pull-up)',
        'PASS  driving low: sda=0',
        'IO cell works!'
      ]
    },

    // ──────────────────────────────────────────────────────────
    // L2 — START and STOP Condition Detector (Tier 1)
    // ──────────────────────────────────────────────────────────
    {
      id: 'i2c1l2',
      title: 'L2 — START and STOP Conditions',
      theory: `
<h2>How I²C frames a transaction</h2>
<p>On I²C, data bits are transferred while SCL is <strong>low</strong>. The protocol reserves one special event for control: a change on SDA while SCL is <strong>high</strong>. This is intentionally never allowed during normal data, which is what makes it detectable.</p>

<h2>The two conditions</h2>
<table class="truth-table">
  <tr><th>Condition</th><th>SCL</th><th>SDA transition</th><th>Meaning</th></tr>
  <tr><td><strong>START</strong></td><td>HIGH</td><td>1 → 0 (falls)</td><td>Begin a new transaction</td></tr>
  <tr><td><strong>STOP</strong></td><td>HIGH</td><td>0 → 1 (rises)</td><td>End the transaction, release bus</td></tr>
</table>

<h2>Detecting an edge with a 1-clock delay</h2>
<p>To detect that SDA <em>changed</em>, compare its current value to its value one clock ago. Store the previous value in a register <code>sda_d</code> (d for “delayed”):</p>
<pre class="code-block">always_ff @(posedge clk) begin
  sda_d &lt;= sda;                        // save previous SDA
  start_det &lt;= scl &amp; sda_d &amp; ~sda;   // SCL=1, SDA fell 1-&gt;0
  stop_det  &lt;= scl &amp; ~sda_d &amp; sda;   // SCL=1, SDA rose 0-&gt;1
end</pre>
<p>This is a one-cycle <em>delay register</em> pattern. It appears constantly in digital design whenever you need to detect a rising or falling edge of a signal.</p>

<h2>What you will build — i2c_cond_detect</h2>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>system clock</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock line</td></tr>
  <tr><td><code>sda</code></td><td>input logic</td><td>I²C data line (receive only here)</td></tr>
  <tr><td><code>start_det</code></td><td>output logic</td><td>pulses 1 for one cycle after a START is seen</td></tr>
  <tr><td><code>stop_det</code></td><td>output logic</td><td>pulses 1 for one cycle after a STOP is seen</td></tr>
</table>
<p>Internal signal: <code>logic sda_d;</code> — SDA delayed by one clock cycle.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module i2c_cond_detect (',
        '── Line 2 ──  input  logic clk,          ← comma',
        '── Line 3 ──  input  logic scl,          ← comma',
        '── Line 4 ──  input  logic sda,          ← comma',
        '── Line 5 ──  output logic start_det,    ← comma',
        '── Line 6 ──  output logic stop_det       ← NO comma (last port)',
        '── Line 7 ──  );',
        '── Blank line ──',
        '── Line 9 ──    logic sda_d;              ← internal register for previous SDA',
        '── Line 10 ──   always_ff @(posedge clk) begin',
        '── Line 11 ──     sda_d     <= sda;',
        '── Line 12 ──     start_det <= scl & sda_d & ~sda;   ← SCL high, SDA fell',
        '── Line 13 ──     stop_det  <= scl & ~sda_d & sda;   ← SCL high, SDA rose',
        '── Line 14 ──   end',
        '── Blank line ──',
        '── Line 16 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all three PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_cond_detect (
  input  logic clk,
  input  logic scl,
  input  logic sda,
  output logic start_det,  // pulses 1 one cycle after START seen
  output logic stop_det    // pulses 1 one cycle after STOP seen
);
  logic sda_d;             // SDA value from the previous clock cycle

  always_ff @(posedge clk) begin
    sda_d     <= sda;
    start_det <= scl & sda_d & ~sda;  // SCL=1, SDA fell 1->0
    stop_det  <= scl & ~sda_d & sda;  // SCL=1, SDA rose 0->1
  end

endmodule`,
      design:
`// Type the i2c_cond_detect module here.
// Read Theory first -- it explains the 1-clock delay trick for edge detection.
//
// Ports: clk, scl, sda (inputs), start_det, stop_det (outputs)
// Internal: logic sda_d  -- SDA delayed one cycle
//
// always_ff block:
//   sda_d     <= sda;
//   start_det <= scl & sda_d & ~sda;   // SCL high, SDA fell
//   stop_det  <= scl & ~sda_d & sda;   // SCL high, SDA rose
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz

  logic scl, sda;
  logic start_det, stop_det;

  i2c_cond_detect dut (
    .clk      (clk),
    .scl      (scl),
    .sda      (sda),
    .start_det(start_det),
    .stop_det (stop_det)
  );

  initial begin
    \$display("=== I2C Condition Detect Test ===");
    scl = 0; sda = 1;
    repeat(3) @(posedge clk); #1;

    // Idle: SCL low -- no conditions should fire
    if (start_det === 0 && stop_det === 0)
      \$display("PASS  idle: no condition");
    else
      \$display("FAIL  idle: start=%0b stop=%0b", start_det, stop_det);

    // START: SCL=1, then SDA falls 1->0
    scl = 1; sda = 1; @(posedge clk); #1;
    sda = 0;          @(posedge clk); #1;
    if (start_det === 1)
      \$display("PASS  START detected");
    else
      \$display("FAIL  START not detected: start_det=%0b", start_det);

    // STOP: SCL=1, SDA rises 0->1
    @(posedge clk); #1;  // one stable cycle
    sda = 1; @(posedge clk); #1;
    if (stop_det === 1)
      \$display("PASS  STOP detected");
    else
      \$display("FAIL  STOP not detected: stop_det=%0b", stop_det);

    \$display("Condition detector works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: no condition',
        'PASS  START detected',
        'PASS  STOP detected',
        'Condition detector works!'
      ]
    },

    // ──────────────────────────────────────────────────────────
    // L3 — Serial Shift Register / I²C Byte Receiver (Tier 2)
    // ──────────────────────────────────────────────────────────
    {
      id: 'i2c1l3',
      title: 'L3 — Serial Shift Register',
      theory: `
<h2>How I²C moves a byte</h2>
<p>I²C transmits 8 data bits <strong>MSB first</strong> (most-significant bit first), one bit per SCL clock cycle. The receiver must collect these eight serial bits and assemble them into a parallel byte. The hardware tool for this job is a <em>shift register</em>.</p>

<h2>Shift register — how it works</h2>
<p>Each clock cycle, the register shifts its contents one position to the left and inserts the new bit on the right (LSB). After 8 cycles the full byte is assembled:</p>
<pre class="code-block">byte_out &lt;= {byte_out[6:0], sda};
//              &uarr;             &uarr;
//       shift left 7 bits   new bit enters at LSB</pre>

<table class="truth-table">
  <tr><th>Cycle</th><th>sda bit</th><th>byte_out (binary)</th></tr>
  <tr><td>reset</td><td>—</td><td>0000_0000</td></tr>
  <tr><td>1 (bit 7)</td><td>1</td><td>0000_0001</td></tr>
  <tr><td>2 (bit 6)</td><td>0</td><td>0000_0010</td></tr>
  <tr><td>3 (bit 5)</td><td>1</td><td>0000_0101</td></tr>
  <tr><td>4 (bit 4)</td><td>0</td><td>0000_1010</td></tr>
  <tr><td>5 (bit 3)</td><td>0</td><td>0001_0100</td></tr>
  <tr><td>6 (bit 2)</td><td>1</td><td>0010_1001</td></tr>
  <tr><td>7 (bit 1)</td><td>0</td><td>0101_0010</td></tr>
  <tr><td>8 (bit 0)</td><td>1</td><td>1010_0101 = 0xA5</td></tr>
</table>

<h2>What you will build — i2c_rx_shift</h2>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>system clock</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>synchronous active-low reset</td></tr>
  <tr><td><code>shift_en</code></td><td>input logic</td><td>1 = sample sda and shift this cycle</td></tr>
  <tr><td><code>sda</code></td><td>input logic</td><td>serial data from the I²C bus</td></tr>
  <tr><td><code>byte_out</code></td><td>output logic [7:0]</td><td>assembled byte (MSB first)</td></tr>
</table>
<p>This one takes a few tries to get the bit ordering right — that is completely normal. The table above traces exactly what should happen for 0xA5.</p>
<p><strong>Ready?</strong> Switch to the Code tab and write the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — write every line.',
        '── Line 1 ──  module i2c_rx_shift (',
        '── Line 2 ──  input  logic       clk,       ← comma',
        '── Line 3 ──  input  logic       rst,       ← comma (synchronous active-low reset)',
        '── Line 4 ──  input  logic       shift_en,  ← comma (1 = capture SDA this cycle)',
        '── Line 5 ──  input  logic       sda,       ← comma (serial data)',
        '── Line 6 ──  output logic [7:0] byte_out    ← NO comma (last port)',
        '── Line 7 ──  );',
        'Declare the always_ff @(posedge clk) block',
        'Inside: if (!rst) reset byte_out to 8\'b0',
        'Inside: else if (shift_en) shift left and insert sda: byte_out <= {byte_out[6:0], sda}',
        'Close the block, then endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — byte 0xA5 should be assembled correctly',
      ],
      hint:
`module i2c_rx_shift (
  input  logic       clk,
  input  logic       rst,        // synchronous active-low reset
  input  logic       shift_en,   // enable: sample sda on this clock edge
  input  logic       sda,        // serial data from I2C bus (MSB first)
  output logic [7:0] byte_out    // assembled byte
);
  always_ff @(posedge clk) begin
    if (!rst)
      byte_out <= 8'b0;                    // reset clears all bits
    else if (shift_en)
      byte_out <= {byte_out[6:0], sda};    // shift left; new bit enters at LSB
  end

endmodule`,
      design:
`// Type the i2c_rx_shift module here. See Theory for the concept.
//
// Ports: clk, rst, shift_en, sda (inputs), byte_out [7:0] (output)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz

  logic rst, shift_en, sda;
  logic [7:0] byte_out;

  i2c_rx_shift dut (
    .clk      (clk),
    .rst      (rst),
    .shift_en (shift_en),
    .sda      (sda),
    .byte_out (byte_out)
  );

  // Shift one serial bit into the register
  task automatic shift_bit(input logic b);
    sda = b; shift_en = 1;
    @(posedge clk); #1;
    shift_en = 0;
  endtask

  initial begin
    \$display("=== I2C RX Shift Register Test ===");
    rst = 0; shift_en = 0; sda = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    @(posedge clk); #1;

    if (byte_out === 8'h00)
      \$display("PASS  reset: byte_out=0x%02h", byte_out);
    else
      \$display("FAIL  reset: byte_out=0x%02h (expected 0x00)", byte_out);

    // Shift in 0xA5 = 8'b10100101 MSB first
    shift_bit(1); shift_bit(0); shift_bit(1); shift_bit(0);
    shift_bit(0); shift_bit(1); shift_bit(0); shift_bit(1);

    if (byte_out === 8'hA5)
      \$display("PASS  received byte: 0x%02h", byte_out);
    else
      \$display("FAIL  received byte: 0x%02h (expected 0xa5)", byte_out);

    \$display("Shift register works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: byte_out=0x00',
        'PASS  received byte: 0xa5',
        'Shift register works!'
      ]
    }

  ]
});
