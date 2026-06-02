(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb6',
  title: 'Register Map Testbenches',
  icon: '📋',
  level: 'advanced',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Testing the Register File  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb6l1',
      title: 'L1 — Testing the Register File',
      theory: `
<h2>Why register file testing matters in chip sign-off</h2>
<p>Every ASIC datasheet lists a register map. Before tape-out, the verification team runs exhaustive register tests — every address, every bit — because a silent register alias (write to address 5 corrupts address 3) can brick a chip that costs millions of dollars to re-spin. The walking-ones test and anti-aliasing sweep are standard sign-off requirements at every major chip company.</p>

<h2>What the register file looks like in hardware</h2>
<pre class="code-block">          write address ─┐
          write data ────┤
          write enable ──┤
                         ▼
          ┌──────────────────────┐
          │   i2c_regfile        │
          │   16 × 8-bit regs    │
          │   reg[0] … reg[15]   │
          └──────────┬───────────┘
                     │
          read address ─┐  ← combinational read
          read data  ◄──┘</pre>

<h2>The walking-ones pattern</h2>
<p>Think of walking-ones like checking each seat in a cinema: you sit in seat 1, check the view, then move to seat 2 — you never sit in two seats at once. In register verification, you write a unique value to every register (0x01, 0x02, 0x04, 0x08 … or simply the address itself) and then read back every register. If any two registers share storage, the pattern breaks and you catch the bug instantly.</p>

<pre class="code-block">// Pattern — write unique values then read all back
for (int i = 0; i &lt; 16; i++) begin
  // write unique_value to reg[i]
end
for (int i = 0; i &lt; 16; i++) begin
  // read reg[i] and compare to expected unique_value
end</pre>

<h2>Anti-aliasing check</h2>
<p>After the walking-ones pass, write a new value to one register (say reg[5]) and immediately read all 16 registers back. Only reg[5] should have changed. If any other register also changed, that is an alias — two addresses mapping to the same physical storage cell.</p>

<table class="truth-table">
  <tr><th>Test</th><th>What it proves</th><th>Failure means</th></tr>
  <tr><td>Walking-ones write/readback</td><td>Every register holds its value independently</td><td>At least two addresses share storage</td></tr>
  <tr><td>Anti-aliasing sweep</td><td>Writing reg[N] does not disturb reg[M]</td><td>Address decoder bug — N and M decode the same cell</td></tr>
  <tr><td>All-zero then all-ones</td><td>Every bit in every register can store 0 and 1</td><td>Stuck-at fault in one or more bit cells</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_regfile</code>, a 16-register 8-bit-wide register file. The testbench must (1) write a unique value to all 16 registers, (2) read them all back and verify each one, and (3) run the anti-aliasing check. A correct simulation prints two PASS lines and a success message. This is the same test a verification engineer would run in a pre-silicon regression suite at a chip company.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock — all register writes are synchronous on the rising edge.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — clears all registers to zero.</td></tr>
  <tr><td><code>wr_en</code></td><td>input logic</td><td>Write-enable strobe — when high on a rising clock edge, writes wr_data into the register at wr_addr.</td></tr>
  <tr><td><code>wr_addr</code></td><td>input logic [3:0]</td><td>4-bit write address — selects one of 16 registers to write.</td></tr>
  <tr><td><code>wr_data</code></td><td>input logic [7:0]</td><td>8-bit data word to write into the selected register.</td></tr>
  <tr><td><code>rd_addr</code></td><td>input logic [3:0]</td><td>4-bit read address — selects which register to present on rd_data (combinational).</td></tr>
  <tr><td><code>rd_data</code></td><td>output logic [7:0]</td><td>8-bit data word read from the selected register — updates immediately when rd_addr changes.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Write a clocked testbench: clock generation, DUT instantiation with all 7 ports',
        'After reset, write a unique value (use the address itself, or i*2+1) to each of the 16 registers using a loop or sequential writes',
        'Read back all 16 registers and verify each value matches what was written — report PASS  all 16 registers written / readback matches or FAIL',
        'Run the anti-aliasing check: write 0xFF to reg[5], then verify all other registers still hold their original unique values',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2ctb6 L1 — Register File Testbench

Walking-ones pattern (write unique values):
  For each address i (0 to 15):
    drive wr_addr=i, wr_data=(i*2+1) or any unique byte
    pulse wr_en=1 for one clock cycle
    after the clock edge, set wr_en=0

Read-back pass:
  For each address i (0 to 15):
    drive rd_addr=i
    #1 (combinational read settles)
    compare rd_data to expected value
    if mismatch -> print FAIL, note address and values

Anti-aliasing check:
  Record the current contents of all 16 registers.
  Write 0xFF to reg[5].
  Read back ALL 16 registers.
  Verify only reg[5] changed — all others must match original values.
  If any reg[i] (i != 5) changed -> alias detected, FAIL.

Key testbench structure:
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, wr_en;
  logic [3:0] wr_addr, rd_addr;
  logic [7:0] wr_data;
  logic [7:0] rd_data;

  i2c_regfile dut (.clk(clk), .rst(rst),
    .wr_en(wr_en), .wr_addr(wr_addr), .wr_data(wr_data),
    .rd_addr(rd_addr), .rd_data(rd_data));

  task automatic write_reg(input logic [3:0] addr, input logic [7:0] data);
    wr_addr = addr; wr_data = data; wr_en = 1;
    @(posedge clk); #1;
    wr_en = 0;
  endtask

  task automatic read_reg(input logic [3:0] addr, output logic [7:0] data);
    rd_addr = addr; #1;
    data = rd_data;
  endtask`,
      design:
`// Build the i2c_regfile testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst;
  logic       wr_en;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;
  logic [3:0] rd_addr;
  logic [7:0] rd_data;

  i2c_regfile dut (
    .clk    (clk),
    .rst    (rst),
    .wr_en  (wr_en),
    .wr_addr(wr_addr),
    .wr_data(wr_data),
    .rd_addr(rd_addr),
    .rd_data(rd_data)
  );

  task automatic write_reg(input logic [3:0] addr, input logic [7:0] data);
    wr_addr = addr; wr_data = data; wr_en = 1;
    @(posedge clk); #1;
    wr_en = 0;
  endtask

  task automatic read_reg(input logic [3:0] addr, output logic [7:0] data);
    rd_addr = addr; #1;
    data = rd_data;
  endtask

  integer i;
  logic [7:0] expected [0:15];
  logic [7:0] saved    [0:15];
  logic [7:0] rval;
  logic all_ok;

  initial begin
    \$display("=== Register File Test ===");
    rst = 0; wr_en = 0; wr_addr = 0; wr_data = 0; rd_addr = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;

    // Write unique value to each register
    for (i = 0; i < 16; i = i + 1) begin
      expected[i] = (i * 2 + 1) & 8'hFF;
      write_reg(i[3:0], expected[i]);
    end
    \$display("PASS  all 16 registers written");

    // Read back and verify
    all_ok = 1;
    for (i = 0; i < 16; i = i + 1) begin
      read_reg(i[3:0], rval);
      if (rval !== expected[i]) begin
        \$display("FAIL  readback reg[%0d]: got 0x%02h expected 0x%02h", i, rval, expected[i]);
        all_ok = 0;
      end
    end
    if (all_ok)
      \$display("PASS  readback matches");

    // Anti-aliasing: save all, write reg[5]=0xFF, check others unchanged
    for (i = 0; i < 16; i = i + 1) begin
      read_reg(i[3:0], saved[i]);
    end
    write_reg(4'd5, 8'hFF);
    all_ok = 1;
    for (i = 0; i < 16; i = i + 1) begin
      read_reg(i[3:0], rval);
      if (i == 5) begin
        if (rval !== 8'hFF) begin
          \$display("FAIL  reg[5] not updated: got 0x%02h", rval);
          all_ok = 0;
        end
      end else begin
        if (rval !== saved[i]) begin
          \$display("FAIL  alias: reg[%0d] changed after writing reg[5]", i);
          all_ok = 0;
        end
      end
    end
    if (all_ok)
      \$display("PASS  no aliasing detected");

    \$display("Register file testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  all 16 registers written',
        'PASS  readback matches',
        'Register file testbench works!'
      ]
    },

    // L2 added next
  ]
});
