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

    // L2 added next

  ]
});
