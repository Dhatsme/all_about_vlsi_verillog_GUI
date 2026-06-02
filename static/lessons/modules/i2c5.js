(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c5',
  title: 'I²C Target Device',
  icon: '\u{1F4E1}',
  level: 'intermediate',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Address Match  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c5l1',
      title: 'L1 — Address Match',
      theory: `
<h2>The chip on the other side of the bus</h2>
<p>Every I²C bus has a master (the one who starts transactions) and one or more targets (formerly called slaves). A temperature sensor, an EEPROM, an accelerometer — these are all targets. When the master wants to talk to the temperature sensor it broadcasts a 7-bit address followed by a Read/Write bit. Every target on the bus hears this broadcast. Only the target whose address matches should respond. This lesson builds that address-match detector — the front door of every I²C target chip.</p>

<pre class="code-block">I2C frame after START:
  Bit:  7   6   5   4   3   2   1   0
  SDA:  A6  A5  A4  A3  A2  A1  A0  R/W
        |___________________________|  |
                  7-bit address        R=1/W=0

  After 8 bits the master releases SDA.
  The matching target pulls SDA LOW for one clock = ACK.
  Non-matching targets do nothing (SDA stays HIGH = NACK).</pre>

<h2>Shifting in the address byte</h2>
<p>Think of it like a combination lock: the cylinder turns one notch per bit. After eight turns you check whether the number showing matches your combination. The hardware equivalent is a shift register that fills up over eight SCL cycles, then a comparator that checks whether bits [7:1] match the chip's own address.</p>
<pre class="code-block">// Sample SDA on each rising SCL edge
always_ff @(posedge clk) begin
  if (scl_rise)
    shift_reg &lt;= {shift_reg[6:0], sda};
end
// After 8 bits: compare top 7 bits to MY_ADDR
assign matched = (bit_cnt === 3'd7) &amp;&amp;
                 (shift_reg[7:1] === MY_ADDR);</pre>

<h2>What happens on a match</h2>
<p>When the address matches, the target must acknowledge: it drives SDA low on the 9th SCL cycle. The R/W bit (bit 0 of the received byte) is captured separately so the master can switch to read mode if needed.</p>

<table class="truth-table">
  <tr><th>Condition</th><th>selected</th><th>rw_bit</th><th>Bus action</th></tr>
  <tr><td>Address matches MY_ADDR, R/W=0</td><td>1</td><td>0</td><td>Target ACKs, prepares to receive data</td></tr>
  <tr><td>Address matches MY_ADDR, R/W=1</td><td>1</td><td>1</td><td>Target ACKs, prepares to send data</td></tr>
  <tr><td>Address does not match</td><td>0</td><td>&times;</td><td>Target stays silent (NACK)</td></tr>
</table>

<h2>Before you code</h2>
<p>You are about to build a target address-match detector. It listens on the SCL and SDA lines after a START condition, shifts in 8 bits (MSB first), then asserts <code>selected</code> for one cycle when the received address equals the parameter <code>MY_ADDR</code>. It also captures the R/W bit. No ACK driving yet — that comes in L2. This module is purely a listener and classifier.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock used to sample SCL and SDA edges.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; clears shift register and bit counter.</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock from the master; rising edge is when SDA is sampled.</td></tr>
  <tr><td><code>sda</code></td><td>input logic</td><td>I²C data line; read on each rising SCL edge.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulses high for one cycle when a START condition has been detected (from i2c_cond_detect).</td></tr>
  <tr><td><code>selected</code></td><td>output logic</td><td>Goes high for one clock cycle when the received 7-bit address equals MY_ADDR.</td></tr>
  <tr><td><code>rw_bit</code></td><td>output logic</td><td>Captures bit 0 of the address byte: 0 = master wants to write, 1 = master wants to read.</td></tr>
</table>

<p>Parameter: <code>MY_ADDR [6:0]</code> — the 7-bit address this target claims on the bus.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the module with parameter MY_ADDR and all 7 ports listed in the port table',
        'Declare internal signals: logic [7:0] shift_reg, logic [2:0] bit_cnt, logic scl_d (SCL delayed one cycle for edge detection), logic active (set by start, cleared after 8 bits)',
        'Write an always_ff block to detect the SCL rising edge: scl_d <= scl; scl_rise = scl && !scl_d',
        'Write an always_ff block: on start pulse, reset bit_cnt and set active=1',
        'Inside the active block: on each scl_rise, shift SDA into shift_reg MSB-first and increment bit_cnt',
        'When bit_cnt reaches 8 (after 8 rising edges), assert selected if shift_reg[7:1] === MY_ADDR, capture rw_bit = shift_reg[0], then clear active',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_addr_match #(
  parameter logic [6:0] MY_ADDR = 7'h3C
)(
  input  logic clk,
  input  logic rst,
  input  logic scl,
  input  logic sda,
  input  logic start,
  output logic selected,
  output logic rw_bit
);
  logic [7:0] shift_reg;
  logic [3:0] bit_cnt;   // 0..8
  logic       scl_d;     // SCL delayed one cycle
  logic       scl_rise;  // SCL rising-edge strobe
  logic       active;    // 1 while receiving address bits

  always_ff @(posedge clk) begin
    scl_d <= scl;
  end

  assign scl_rise = scl & ~scl_d;  // combinational edge detect

  always_ff @(posedge clk) begin
    if (!rst) begin
      shift_reg <= 8'b0;
      bit_cnt   <= 4'd0;
      active    <= 1'b0;
      selected  <= 1'b0;
      rw_bit    <= 1'b0;
    end else begin
      selected <= 1'b0;   // default: deassert each cycle

      if (start) begin    // START condition resets the receiver
        bit_cnt  <= 4'd0;
        active   <= 1'b1;
        shift_reg <= 8'b0;
      end else if (active && scl_rise) begin
        shift_reg <= {shift_reg[6:0], sda};  // MSB first
        bit_cnt   <= bit_cnt + 1;
        if (bit_cnt === 4'd7) begin           // 8th rising edge (bits 0..7)
          active   <= 1'b0;
          // After the shift on this edge: shift_reg[7:1] = address, [0] = R/W
          selected <= ({shift_reg[5:0], sda} >> 1) === MY_ADDR[5:0] &&
                      shift_reg[6] === MY_ADDR[6];
          // simpler: compare after full shift is complete next cycle
        end
      end

      // Capture outputs one cycle after last shift
      if (!active && bit_cnt === 4'd8) begin
        selected <= (shift_reg[7:1] === MY_ADDR);
        rw_bit   <= shift_reg[0];
        bit_cnt  <= 4'd9;  // prevent repeated assertion
      end
    end
  end

endmodule`,
      design:
`// Type the i2c_addr_match module here. See Theory for the concept.
//
// Ports: clk, rst, scl, sda, start (inputs); selected, rw_bit (outputs)
// Parameter: MY_ADDR [6:0]  -- the 7-bit address this target owns
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, scl, sda, start_i;
  logic selected, rw_bit;

  // Use default address 0x3C = 7'b011_1100
  i2c_addr_match #(.MY_ADDR(7'h3C)) dut (
    .clk(clk), .rst(rst), .scl(scl), .sda(sda),
    .start(start_i), .selected(selected), .rw_bit(rw_bit)
  );

  // Task: clock in one bit on rising SCL edge
  task automatic send_bit(input logic b);
    sda = b; scl = 0;
    @(posedge clk); #1;
    scl = 1;
    @(posedge clk); #1;
    scl = 0;
    @(posedge clk); #1;
  endtask

  // Task: send a full 8-bit address+RW byte and wait for selected pulse
  task automatic send_addr(input logic [6:0] addr, input logic rw,
                            output logic sel, output logic rwb);
    integer i;
    start_i = 1; @(posedge clk); #1;
    start_i = 0;
    // 7 address bits MSB first, then R/W
    for (i = 6; i >= 0; i--) send_bit(addr[i]);
    send_bit(rw);
    // Allow one extra cycle for registered output
    @(posedge clk); #1;
    @(posedge clk); #1;
    sel = selected;
    rwb = rw_bit;
  endtask

  logic sel_out, rw_out;

  initial begin
    \$display("=== I2C Address Match Test ===");
    rst = 0; scl = 0; sda = 1; start_i = 0;
    repeat(3) @(posedge clk); #1;
    rst = 1;

    // Test 1: correct address 0x3C, write (R/W=0)
    send_addr(7'h3C, 1'b0, sel_out, rw_out);
    if (sel_out === 1'b1 && rw_out === 1'b0)
      \$display("PASS  addr=0x3C W: selected=%0b rw_bit=%0b", sel_out, rw_out);
    else
      \$display("FAIL  addr=0x3C W: selected=%0b rw_bit=%0b", sel_out, rw_out);

    // Test 2: correct address 0x3C, read (R/W=1)
    send_addr(7'h3C, 1'b1, sel_out, rw_out);
    if (sel_out === 1'b1 && rw_out === 1'b1)
      \$display("PASS  addr=0x3C R: selected=%0b rw_bit=%0b", sel_out, rw_out);
    else
      \$display("FAIL  addr=0x3C R: selected=%0b rw_bit=%0b", sel_out, rw_out);

    // Test 3: wrong address 0x48
    send_addr(7'h48, 1'b0, sel_out, rw_out);
    if (sel_out === 1'b0)
      \$display("PASS  addr=0x48: not selected (correct)");
    else
      \$display("FAIL  addr=0x48: selected unexpectedly");

    \$display("Address match works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  addr=0x3C W: selected=1 rw_bit=0',
        'PASS  addr=0x3C R: selected=1 rw_bit=1',
        'PASS  addr=0x48: not selected (correct)',
        'Address match works!'
      ]
    },

    // L2 added next

  ]
});
