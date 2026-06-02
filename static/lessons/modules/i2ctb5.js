(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb5',
  title: 'Target Device Testbenches',
  icon: '🎯',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────
    // L1 — Testing Address Match  (Tier 3)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb5l1',
      title: 'L1 — Testing Address Match',
      theory: `
<h2>Why target-side testing matters</h2>
<p>Every I²C device that <em>receives</em> commands — a temperature sensor, a battery gauge, an OLED driver — begins every transaction with the same question: "Is that 7-bit address mine?" If the address match logic is wrong, the chip either ignores its own master or responds to traffic meant for another device. Both bugs are silent and catastrophic. At tape-out time, the address filter gets its own dedicated regression test before anything else runs.</p>

<h2>How address recognition works</h2>
<p>After a START condition, the master shifts out 7 address bits followed by a R/W bit — 8 SCL pulses in total. The target captures those bits and compares the top 7 against its own address. If they match, it asserts <code>selected</code> and records the R/W bit. If they do not match, it stays silent.</p>

<pre class="code-block">
// Waveform: address 0x4C (0100_1100) with R/W=0 (write)
//
// SCL:  ___/‾\_/‾\_/‾\_/‾\_/‾\_/‾\_/‾\_/‾\___
// SDA:  ___0___1___0___0___1___1___0___0_______
//        A6  A5  A4  A3  A2  A1  A0  R/W
//        MSB                          LSB
//
//  After 8th falling SCL edge:
//    selected = 1  (address matched 0x4C)
//    rw_bit   = 0  (write transaction)
</pre>

<h2>Parametric address sweep — the right way to test</h2>
<p>Testing only the happy path (own address hits) misses the most dangerous bug: a target responding to <em>someone else's</em> address. The correct approach is a <strong>parametric sweep</strong> — test at least three addresses: the device's own address, one address below it, and one address above it. Only the exact match should assert <code>selected</code>.</p>

<p>Think of it like testing a combination lock: you try 1234 (should open), 1233 (should stay locked), 1235 (should stay locked). One passing case is never enough.</p>

<pre class="code-block">// Pattern: task to shift in 8 bits (7-bit addr + rw)
task automatic shift_addr(input logic [6:0] addr, input logic rw);
  integer i;
  for (i = 6; i >= 0; i--) begin
    sda_in = addr[i];          // MSB first
    @(posedge scl_tb); #1;    // DUT samples on SCL rising edge
  end
  sda_in = rw;                 // 8th bit is R/W
  @(posedge scl_tb); #1;
endtask</pre>

<table class="truth-table">
  <tr><th>Address shifted in</th><th>MY_ADDR parameter</th><th>selected</th><th>rw_bit</th></tr>
  <tr><td>MY_ADDR</td><td>7'h4C</td><td>1</td><td>matches rw input</td></tr>
  <tr><td>MY_ADDR - 1</td><td>7'h4C</td><td>0</td><td>don't care</td></tr>
  <tr><td>MY_ADDR + 1</td><td>7'h4C</td><td>0</td><td>don't care</td></tr>
</table>

<p>Before you write any code: you are building a testbench that acts as the I²C master. It drives a clock (<code>scl_tb</code>), drives <code>sda_in</code> bit by bit MSB-first, then checks whether the DUT correctly asserted <code>selected</code> and captured <code>rw_bit</code>. A passing run prints three PASS lines — one for the correct address, one for a miss below, one for a miss above — and then a success banner.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock used to register SCL and SDA samples internally.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset that clears <code>selected</code> and <code>rw_bit</code>.</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock driven by the master; DUT captures SDA on each rising edge.</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>Serial address bits driven by the master onto the SDA line.</td></tr>
  <tr><td><code>my_addr</code></td><td>input logic [6:0]</td><td>The 7-bit address this target device is configured to respond to.</td></tr>
  <tr><td><code>selected</code></td><td>output logic</td><td>Goes high after the 8th SCL pulse when the received address equals <code>my_addr</code>.</td></tr>
  <tr><td><code>rw_bit</code></td><td>output logic</td><td>Captures the 8th bit (the R/W flag) from the address frame.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the i2c_addr_match module with ports: clk, rst, scl, sda_in, my_addr [6:0], selected, rw_bit',
        'Declare internal signals: a 3-bit bit_cnt counter, a 7-bit addr_shift shift register, and a logic done_ff flag',
        'Write the always_ff block: on reset clear all internal signals',
        'In the else branch: when scl rises (use a 1-cycle delay register for scl_d), shift sda_in into addr_shift and increment bit_cnt',
        'After 8 shifts (bit_cnt === 7): capture rw_bit from sda_in, compare addr_shift to my_addr, set selected accordingly, then reset bit_cnt',
        'Declare the shift_addr task: takes a 7-bit addr and a rw bit, loops 6 down to 0 driving sda_in on each posedge scl_tb, then drives rw',
        'Test scenario 1: assert reset, deassert reset, call shift_addr(MY_ADDR, 0), check selected===1 and rw_bit===0',
        'Test scenario 2: call shift_addr(MY_ADDR-1, 1), check selected===0',
        'Test scenario 3: call shift_addr(MY_ADDR+1, 0), check selected===0',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`// ── DUT module ──
module i2c_addr_match (
  input  logic       clk,
  input  logic       rst,
  input  logic       scl,
  input  logic       sda_in,
  input  logic [6:0] my_addr,
  output logic       selected,
  output logic       rw_bit
);
  logic       scl_d;        // previous SCL for rising-edge detect
  logic [2:0] bit_cnt;      // counts 0..7 (8 bits per frame)
  logic [6:0] addr_shift;   // shift register for incoming address bits

  always_ff @(posedge clk) begin
    if (!rst) begin
      scl_d      <= 1'b0;
      bit_cnt    <= 3'd0;
      addr_shift <= 7'd0;
      selected   <= 1'b0;
      rw_bit     <= 1'b0;
    end else begin
      scl_d <= scl;
      if (scl && !scl_d) begin          // rising edge of SCL
        if (bit_cnt < 3'd7) begin
          addr_shift <= {addr_shift[5:0], sda_in};  // shift in MSB first
          bit_cnt    <= bit_cnt + 1;
        end else begin                  // 8th pulse: the R/W bit
          rw_bit   <= sda_in;
          selected <= (addr_shift == my_addr);
          bit_cnt  <= 3'd0;
          addr_shift <= 7'd0;
        end
      end
    end
  end
endmodule

// ── Testbench ──
// \`timescale 1ns/1ps
// module tb; ...
// localparam MY_ADDR = 7'h4C;
// wire scl_tb is toggled by the testbench
// task shift_addr shifts 7 address bits + rw onto sda_in`,
      design:
`// Type the i2c_addr_match module here. See Theory for the concept.
//
// Ports: clk, rst, scl, sda_in (inputs)
//        my_addr [6:0] (input - configured address)
//        selected, rw_bit (outputs)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst;
  logic        scl_tb;
  logic        sda_in;
  logic [6:0]  my_addr_tb;
  logic        selected;
  logic        rw_bit;

  localparam [6:0] MY_ADDR = 7'h4C;

  i2c_addr_match dut (
    .clk     (clk),
    .rst     (rst),
    .scl     (scl_tb),
    .sda_in  (sda_in),
    .my_addr (my_addr_tb),
    .selected(selected),
    .rw_bit  (rw_bit)
  );

  // Shift 7-bit address + R/W into the DUT (MSB first, sampled on SCL rising edge)
  task automatic shift_addr(input logic [6:0] addr, input logic rw);
    integer i;
    for (i = 6; i >= 0; i--) begin
      sda_in = addr[i];
      scl_tb = 0; @(posedge clk); #1;
      scl_tb = 1; @(posedge clk); #1;
    end
    // 8th pulse: R/W bit
    sda_in = rw;
    scl_tb = 0; @(posedge clk); #1;
    scl_tb = 1; @(posedge clk); #1;
    scl_tb = 0; @(posedge clk); #1; // settle
  endtask

  initial begin
    \$display("=== I2C Address Match Test ===");
    rst = 0; scl_tb = 0; sda_in = 0; my_addr_tb = MY_ADDR;
    repeat(3) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // Test 1: own address, write (rw=0)
    shift_addr(MY_ADDR, 1'b0);
    @(posedge clk); #1;
    if (selected === 1'b1 && rw_bit === 1'b0)
      \$display("PASS  own address: selected=1");
    else
      \$display("FAIL  own address: selected=%0b rw_bit=%0b (expected selected=1 rw=0)", selected, rw_bit);

    // Reset between tests
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1; @(posedge clk); #1;

    // Test 2: one address below (should NOT select)
    shift_addr(MY_ADDR - 1, 1'b1);
    @(posedge clk); #1;
    if (selected === 1'b0)
      \$display("PASS  wrong address: selected=0");
    else
      \$display("FAIL  wrong address: selected=%0b (expected 0)", selected);

    // Reset between tests
    rst = 0; repeat(2) @(posedge clk); #1; rst = 1; @(posedge clk); #1;

    // Test 3: one address above (should NOT select)
    shift_addr(MY_ADDR + 1, 1'b0);
    @(posedge clk); #1;
    if (selected === 1'b0)
      \$display("PASS  address above: selected=0");
    else
      \$display("FAIL  address above: selected=%0b (expected 0)", selected);

    \$display("Address match testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  own address: selected=1',
        'PASS  wrong address: selected=0',
        'Address match testbench works!'
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // L2 — Testing Register Read/Write  (Tier 4)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb5l2',
      title: 'L2 — Testing Register Read/Write',
      theory: `
<h2>Why register testing is a first-class concern</h2>
<p>The firmware that runs on a microcontroller talks to an I²C peripheral entirely through its register map. If register 3 returns the wrong value after a write, every firmware feature that depends on it breaks — silently. This is why silicon validation teams run <strong>write-then-readback</strong> tests on every single register before any functional testing begins. It is the simplest possible test and also the most important.</p>

<h2>The golden model approach</h2>
<p>A golden model is a software copy of what the hardware should contain. In a register testbench, the golden model is a plain array declared in the testbench:</p>

<pre class="code-block">// Golden model: what we expect each register to contain
logic [7:0] expected_regs [0:7];

// Write to DUT and record in golden model simultaneously
expected_regs[3] = 8'hDE;
// ... drive the I2C write sequence to reg[3] with data 8'hDE ...

// Read back from DUT and compare against golden model
// ... drive the I2C read sequence for reg[3] ...
if (readback === expected_regs[3])
  $display("PASS  reg[%0d] readback: 0x%02h", 3, readback);</pre>

<p>The golden model never has bugs in it — it is just an assignment. If the DUT readback disagrees, the DUT is wrong.</p>

<h2>Write and read sequences on I²C</h2>
<p>Writing a register requires two transactions on the bus:</p>

<pre class="code-block">
// WRITE sequence (timing diagram)
//
//  SCL:  S [7-bit ADDR][W] A [8-bit REG_ADDR] A [8-bit DATA] A P
//          ^--- address frame ---^  ^-- reg select --^  ^-- data --^
//
// READ sequence (after a write to set the pointer):
//
//  SCL:  S [7-bit ADDR][W] A [8-bit REG_ADDR] A
//        Sr [7-bit ADDR][R] A [8-bit DATA] NA P
//          ^--- write addr to set pointer ---^   ^--- read data ---^
</pre>

<table class="truth-table">
  <tr><th>Phase</th><th>Direction</th><th>What happens</th></tr>
  <tr><td>Address + W</td><td>Master to target</td><td>Target recognises its address and enters write mode</td></tr>
  <tr><td>Register address</td><td>Master to target</td><td>Target stores the register pointer internally</td></tr>
  <tr><td>Data byte</td><td>Master to target</td><td>Target writes the byte into the register at the pointer</td></tr>
  <tr><td>Repeated START + R</td><td>Master issues</td><td>Target switches to read mode, holds current pointer</td></tr>
  <tr><td>Data byte</td><td>Target to master</td><td>Target drives the stored register value onto SDA</td></tr>
</table>

<p>Before you write any code: you are proving two things. First, that a single register can be written and read back correctly. Second, that writing to register N does not corrupt register M — the aliasing check. Your testbench writes all 8 registers with distinct values, then reads them all back and compares against a software golden model array. A passing run prints a PASS for each register's readback and a banner at the end.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock that synchronises all internal register operations.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset that clears all registers to 0x00.</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock from the master; register write/read is synchronised to this.</td></tr>
  <tr><td><code>sda</code></td><td>inout wire</td><td>Bidirectional I²C data line; target drives it low during ACK and read phases.</td></tr>
  <tr><td><code>my_addr</code></td><td>input logic [6:0]</td><td>The 7-bit device address this register file responds to.</td></tr>
  <tr><td><code>reg_out</code></td><td>output logic [7:0]</td><td>Direct probe output exposing the currently addressed register for testbench verification.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the i2c_target_reg module with all ports listed in the port table above',
        'Declare an 8-element register file: logic [7:0] regs [0:7]',
        'Implement a write FSM: IDLE -> ADDR_PHASE -> REG_ADDR -> WRITE_DATA; on each state transition, capture address bits on SCL rising edges using a shift register',
        'Implement a read FSM: after repeated START + address + R bit, drive sda low for each 0-bit of the register being read (MSB first) over 8 SCL cycles; send NACK slot (release sda)',
        'Wire reg_out to regs[current_ptr] for testbench visibility',
        'In the testbench, declare a logic [7:0] golden[0:7] array as your software model',
        'Write the write_reg task: drives address frame, reg address byte, data byte, checks ACK',
        'Write the read_reg task: drives write phase to set pointer, then repeated START, address + R, receives 8 bits, drives NACK',
        'Test: write 0xDE to reg[3], read back, check readback === golden[3] === 0xDE',
        'Test: write all 8 registers with unique values (0xA0..0xA7), read all back, compare against golden array',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 8 PASS lines plus the banner should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2c_target_reg testbench:

GOLDEN MODEL PATTERN:
  Declare in testbench:  logic [7:0] golden [0:7];
  On each write:         golden[addr] = data;
  On each readback:      if (rx === golden[addr]) $display("PASS ...");

WRITE TASK STRUCTURE:
  task write_reg(input logic [2:0] reg_addr, input logic [7:0] data);
    1. Drive START condition (SDA falls while SCL high)
    2. Shift 7-bit MY_ADDR + W bit over 8 SCL pulses
    3. Wait for ACK slot (release SDA, check DUT pulls low)
    4. Shift 8-bit reg_addr over 8 SCL pulses
    5. Wait for ACK slot
    6. Shift 8-bit data over 8 SCL pulses
    7. Wait for ACK slot
    8. Drive STOP condition (SDA rises while SCL high)

READ TASK STRUCTURE:
  task read_reg(input logic [2:0] reg_addr, output logic [7:0] rx);
    1. Write reg_addr (as above) to set the pointer
    2. Drive Repeated START
    3. Shift 7-bit MY_ADDR + R bit over 8 SCL pulses
    4. Wait for ACK slot
    5. Receive 8 bits: on each SCL rising edge, rx = {rx[6:0], sda}
    6. Drive NACK (release SDA on 9th clock)
    7. Drive STOP

ALIASING CHECK:
  After writing all 8 regs: read each back in the same loop.
  If ANY readback differs from golden[], it is an aliasing bug.

NO CODE — implement based on these notes.`,
      design:
`// Build the i2c_target_reg module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst;
  logic       scl_tb;
  wire        sda;
  logic       sda_drive;
  logic       sda_val;
  logic [6:0] my_addr_tb;
  logic [7:0] reg_out;

  // Open-drain SDA: testbench drives low when sda_drive=1 and sda_val=0
  assign sda = (sda_drive && !sda_val) ? 1'b0 : 1'bz;
  pullup pu(sda);

  localparam [6:0] MY_ADDR = 7'h28;

  i2c_target_reg dut (
    .clk     (clk),
    .rst     (rst),
    .scl     (scl_tb),
    .sda     (sda),
    .my_addr (my_addr_tb),
    .reg_out (reg_out)
  );

  // Golden model
  logic [7:0] golden [0:7];

  // SCL half-period helper
  task automatic half_scl;
    @(posedge clk); #1;
  endtask

  // Drive one bit onto SDA and pulse SCL
  task automatic drive_bit(input logic b);
    sda_drive = 1; sda_val = b;
    scl_tb = 0; half_scl;
    scl_tb = 1; half_scl;
  endtask

  // START condition: SDA falls while SCL high
  task automatic do_start;
    sda_drive = 1; sda_val = 1; scl_tb = 1; half_scl;
    sda_val = 0; half_scl;
    scl_tb = 0; half_scl;
  endtask

  // STOP condition: SDA rises while SCL high
  task automatic do_stop;
    sda_drive = 1; sda_val = 0; scl_tb = 0; half_scl;
    scl_tb = 1; half_scl;
    sda_val = 1; half_scl;
    scl_tb = 0; half_scl;
    sda_drive = 0;
  endtask

  // Send one byte MSB first and consume ACK slot
  task automatic send_byte(input logic [7:0] data);
    integer i;
    for (i = 7; i >= 0; i--)
      drive_bit(data[i]);
    // ACK slot: release and let DUT pull low
    sda_drive = 0;
    scl_tb = 0; half_scl;
    scl_tb = 1; half_scl;
    scl_tb = 0; half_scl;
  endtask

  // Receive one byte MSB first, then drive NACK
  task automatic recv_byte(output logic [7:0] rx);
    integer i;
    logic b;
    rx = 8'h00;
    sda_drive = 0; // release so DUT can drive
    for (i = 7; i >= 0; i--) begin
      scl_tb = 0; half_scl;
      scl_tb = 1; half_scl;
      rx[i] = sda;
    end
    // NACK: drive SDA high (release = 1 via pullup)
    sda_drive = 1; sda_val = 1;
    scl_tb = 0; half_scl;
    scl_tb = 1; half_scl;
    scl_tb = 0; half_scl;
  endtask

  // Write a register: START + ADDR+W + reg_addr + data + STOP
  task automatic write_reg(input logic [2:0] raddr, input logic [7:0] data);
    do_start;
    send_byte({MY_ADDR, 1'b0}); // address + write
    send_byte({5'h0, raddr});   // register address
    send_byte(data);
    do_stop;
  endtask

  // Read a register: write to set pointer, repeated START, ADDR+R, recv byte, STOP
  task automatic read_reg(input logic [2:0] raddr, output logic [7:0] rx);
    // Set register pointer
    do_start;
    send_byte({MY_ADDR, 1'b0});
    send_byte({5'h0, raddr});
    // Repeated START + read
    do_start;
    send_byte({MY_ADDR, 1'b1}); // address + read
    recv_byte(rx);
    do_stop;
  endtask

  integer j;
  logic [7:0] readback;

  initial begin
    \$display("=== I2C Register Read/Write Test ===");
    rst = 0; scl_tb = 0; sda_drive = 1; sda_val = 1; my_addr_tb = MY_ADDR;
    for (j = 0; j < 8; j++) golden[j] = 8'h00;
    repeat(3) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // Test 1: single register write/readback
    golden[3] = 8'hDE;
    write_reg(3'd3, 8'hDE);
    read_reg(3'd3, readback);
    if (readback === golden[3])
      \$display("PASS  reg[3] readback: 0x%02h", readback);
    else
      \$display("FAIL  reg[3] readback: 0x%02h (expected 0x%02h)", readback, golden[3]);

    // Test 2: all 8 registers
    for (j = 0; j < 8; j++) begin
      golden[j] = 8'hA0 + j;
      write_reg(j[2:0], 8'hA0 + j);
    end
    for (j = 0; j < 8; j++) begin
      read_reg(j[2:0], readback);
      if (readback === golden[j])
        \$display("PASS  reg[%0d] readback: 0x%02h", j, readback);
      else
        \$display("FAIL  reg[%0d] readback: 0x%02h (expected 0x%02h)", j, readback, golden[j]);
    end

    \$display("PASS  all 8 registers verified");
    \$display("Register RW testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reg[3] readback: 0xde',
        'PASS  all 8 registers verified',
        'Register RW testbench works!'
      ]
    },

    // L3 added next

  ]
});

