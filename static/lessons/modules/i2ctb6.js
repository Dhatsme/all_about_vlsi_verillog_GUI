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

    // ────────────────────────────────────────────────────────────────────
    // L2 — Testing the Address Decoder  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb6l2',
      title: 'L2 — Testing the Address Decoder',
      theory: `
<h2>Why address decoder bugs are catastrophic</h2>
<p>An address decoder maps a binary address to a one-hot select signal — exactly one output wire goes high for each valid input. At chip companies, a decoder bug is considered a P0 (showstopper) defect. If two addresses fire the same select, two registers fight on the data bus and corrupt each other's data silently. The fix is a systematic select-line coverage sweep: for every possible input address, exactly one select must be active — and outside the valid range, none must fire.</p>

<h2>What the address decoder looks like</h2>
<pre class="code-block">  addr [3:0]
      │
      ▼
  ┌───────────────────┐
  │  i2c_addr_decode  │
  │  4-bit → 16-bit   │
  │  one-hot output   │
  └───────┬───────────┘
          │
  sel[15:0]   ← exactly one bit high per valid address</pre>

<h2>One-hot select verification</h2>
<p>Think of the one-hot check like a light panel with 16 switches: you want exactly one light on at a time. First count how many bits are set in sel — if the count is not 1, something is broken. Then verify the lit bit matches the address you provided. For out-of-range addresses (if the decoder has an enable or valid range), all 16 bits must be zero.</p>

<pre class="code-block">// Count bits set in a 16-bit word
function automatic int popcount16(input logic [15:0] v);
  int c = 0;
  for (int b = 0; b &lt; 16; b++) c += v[b];
  return c;
endfunction

// Check: one-hot for address i
// popcount(sel) === 1  AND  sel[i] === 1</pre>

<table class="truth-table">
  <tr><th>Test</th><th>Input</th><th>Expected sel</th><th>What it proves</th></tr>
  <tr><td>In-range sweep</td><td>addr 0–15</td><td>sel[addr] = 1, all others = 0</td><td>Correct one-hot decode for every address</td></tr>
  <tr><td>Out-of-range</td><td>addr with enable=0</td><td>sel = 16'h0000</td><td>Decoder gates off when not selected</td></tr>
  <tr><td>Simultaneous decode</td><td>same addr twice</td><td>Same sel each time</td><td>Decode is deterministic — no glitch</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_addr_decode</code>, a combinational 4-to-16 one-hot decoder. The testbench must sweep all 16 in-range addresses and verify that for each address, exactly one select line goes high and it is the correct one. It must also verify that when the decoder is disabled (enable=0 or out-of-range input), all selects are zero. A correct run prints two PASS lines and a success message.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>addr</code></td><td>input logic [3:0]</td><td>4-bit address input — selects one of 16 outputs to assert.</td></tr>
  <tr><td><code>en</code></td><td>input logic</td><td>Enable signal — when low, all select outputs are forced to zero regardless of addr.</td></tr>
  <tr><td><code>sel</code></td><td>output logic [15:0]</td><td>One-hot select bus — exactly one bit is high when en=1; all zeros when en=0.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Instantiate i2c_addr_decode with ports: addr [3:0], en, sel [15:0]',
        'Sweep all 16 in-range addresses (en=1, addr=0 to 15): for each, verify sel has exactly one bit set and sel[addr]===1 — report PASS or FAIL per address',
        'After the sweep, if all 16 passed print PASS  in-range: one select active',
        'Set en=0 and verify sel === 16\'h0000 for several addresses — report PASS  out-of-range: no select',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2ctb6 L2 — Address Decoder Testbench

One-hot sweep (en=1):
  For addr = 0 to 15:
    drive en=1, addr=i
    #1 (combinational settle)
    count = number of bits set in sel (popcount)
    if count != 1       -> FAIL "multiple selects or none fired"
    if sel[i] != 1      -> FAIL "wrong select fired for addr i"
  If all 16 pass -> print PASS  in-range: one select active

Out-of-range / disabled check (en=0):
  drive en=0, addr=0; #1; verify sel === 0
  drive en=0, addr=7; #1; verify sel === 0
  drive en=0, addr=15; #1; verify sel === 0
  If all pass -> print PASS  out-of-range: no select

Key structure:
  logic [3:0] addr;
  logic       en;
  logic [15:0] sel;

  i2c_addr_decode dut (.addr(addr), .en(en), .sel(sel));

  // popcount helper (use a function or an integer loop)
  function automatic int popcount16(input logic [15:0] v);
    int c = 0;
    for (int b = 0; b < 16; b++) c += v[b];
    return c;
  endfunction

Combinational DUT — use #1 after changing inputs, NOT @(posedge clk)`,
      design:
`// Build the i2c_addr_decode testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [3:0]  addr;
  logic        en;
  logic [15:0] sel;

  i2c_addr_decode dut (
    .addr(addr),
    .en  (en),
    .sel (sel)
  );

  function automatic int popcount16(input logic [15:0] v);
    int c = 0;
    for (int b = 0; b < 16; b = b + 1) c += int'(v[b]);
    return c;
  endfunction

  integer i;
  logic all_ok;

  initial begin
    \$display("=== Address Decoder Test ===");

    // In-range sweep: en=1, addr 0..15
    all_ok = 1;
    en = 1;
    for (i = 0; i < 16; i = i + 1) begin
      addr = i[3:0]; #1;
      if (popcount16(sel) !== 1) begin
        \$display("FAIL  addr=%0d: %0d select lines active (expected 1)", i, popcount16(sel));
        all_ok = 0;
      end else if (sel[i] !== 1'b1) begin
        \$display("FAIL  addr=%0d: wrong select fired (sel=0x%04h)", i, sel);
        all_ok = 0;
      end
    end
    if (all_ok)
      \$display("PASS  in-range: one select active");

    // Disabled: en=0 -> all selects must be zero
    all_ok = 1;
    en = 0;
    for (i = 0; i < 16; i = i + 1) begin
      addr = i[3:0]; #1;
      if (sel !== 16'h0000) begin
        \$display("FAIL  en=0 addr=%0d: sel=0x%04h (expected 0)", i, sel);
        all_ok = 0;
      end
    end
    if (all_ok)
      \$display("PASS  out-of-range: no select");

    \$display("Address decoder testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  in-range: one select active',
        'PASS  out-of-range: no select',
        'Address decoder testbench works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L3 — Testing the Auto-increment Pointer  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb6l3',
      title: 'L3 — Testing the Auto-increment Pointer',
      theory: `
<h2>Burst writes in the real world</h2>
<p>Every I²C EEPROM and sensor you have ever used supports burst writes: you send the starting register address once, then clock out byte after byte without re-sending the address. A hardware pointer inside the device increments automatically after each byte is stored. This is called <em>auto-increment</em>. If the pointer does not advance — or fails to wrap around at the end of the address space — the entire burst is silently corrupted. Verification engineers catch this with a dedicated burst-write testbench.</p>

<h2>How the auto-increment pointer works</h2>
<pre class="code-block">  I²C transaction on wire:
  [START][ADDR+W][ACK][reg_ptr=0][ACK]
                     [byte0][ACK]   ← ptr advances to 1
                     [byte1][ACK]   ← ptr advances to 2
                     [byte2][ACK]   ← ptr advances to 3
                     [byte3][ACK]   ← ptr advances to 4
  [STOP]

  Inside i2c_autoincr:
  ┌─────────────────────────────────────────────┐
  │  ptr_reg [3:0]  →  current write address    │
  │  on each data_valid pulse: reg[ptr] = data  │
  │                             ptr = ptr + 1   │
  │  wrap: if ptr == MAX then ptr = 0           │
  └─────────────────────────────────────────────┘</pre>

<h2>What burst verification must prove</h2>
<p>Verifying a burst pointer is like checking that an odometer advances correctly: write 4 bytes starting at address 0, then read back addresses 0, 1, 2, and 3 individually. Every register must hold the correct value — if the pointer stalled, multiple registers hold the first byte; if it skipped, some registers were never written. The wrap-around test checks the odometer rolls over from 15 back to 0 correctly.</p>

<table class="truth-table">
  <tr><th>Test scenario</th><th>What to verify</th><th>Failure symptom</th></tr>
  <tr><td>Burst write 4 bytes at ptr=0</td><td>reg[0]=byte0, reg[1]=byte1, reg[2]=byte2, reg[3]=byte3</td><td>Pointer stalled — all regs hold byte0</td></tr>
  <tr><td>Pointer starts from non-zero</td><td>reg[10]=byte0, reg[11]=byte1 after burst from ptr=10</td><td>Pointer offset bug — wrote wrong registers</td></tr>
  <tr><td>Wrap-around at end of range</td><td>Burst starting at ptr=14 writes reg[14], reg[15], then reg[0], reg[1]</td><td>Pointer stops at 15 instead of wrapping</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_autoincr</code>, a register file with a built-in auto-incrementing write pointer. You set the initial pointer address once, then clock in data bytes one at a time. Each clock cycle with <code>data_valid=1</code> writes the current byte to the register at the current pointer address and advances the pointer. Your testbench must run a 4-byte burst starting at address 0, read all four registers back individually, and then verify the wrap-around behaviour starting near the end of the address range.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock — all writes are synchronous on the rising edge.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — clears pointer and all registers.</td></tr>
  <tr><td><code>load_ptr</code></td><td>input logic</td><td>When high for one clock cycle, loads start_addr into the internal pointer register.</td></tr>
  <tr><td><code>start_addr</code></td><td>input logic [3:0]</td><td>Initial pointer value loaded when load_ptr is asserted.</td></tr>
  <tr><td><code>data_valid</code></td><td>input logic</td><td>When high on a rising edge, writes data_in to reg[ptr] and increments ptr.</td></tr>
  <tr><td><code>data_in</code></td><td>input logic [7:0]</td><td>8-bit data byte to write to the current pointer address.</td></tr>
  <tr><td><code>rd_addr</code></td><td>input logic [3:0]</td><td>Read address for the register file — combinational, independent of the write pointer.</td></tr>
  <tr><td><code>rd_data</code></td><td>output logic [7:0]</td><td>Data at rd_addr — updates combinationally whenever rd_addr changes.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare a clocked testbench with clock, reset, and all i2c_autoincr ports',
        'Write a task that loads the pointer to a given start address (assert load_ptr for one clock cycle)',
        'Write a task that bursts N bytes: for each byte, drive data_in and assert data_valid for one clock cycle',
        'After a 4-byte burst from address 0, read reg[0]–reg[3] individually and verify each matches its expected value — print PASS  burst write: 4 registers updated',
        'Run a wrap-around test: burst 4 bytes starting at address 14 (ptr goes 14→15→0→1); verify reg[14], reg[15], reg[0], reg[1] — print PASS  pointer wrap-around',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 2 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2ctb6 L3 — Auto-increment Pointer Testbench

Pointer load task:
  task load_pointer(input logic [3:0] addr):
    start_addr = addr; load_ptr = 1;
    @(posedge clk); #1;
    load_ptr = 0;

Burst write task:
  task burst_write(input logic [7:0] bytes[], input int count):
    for each byte in 0..count-1:
      data_in = bytes[i]; data_valid = 1;
      @(posedge clk); #1;
      data_valid = 0;
      (optional: 1 idle cycle between bytes)

Read-back helper:
  task read_reg(input logic [3:0] addr, output logic [7:0] data):
    rd_addr = addr; #1;
    data = rd_data;

Test 1 — 4-byte burst from ptr=0:
  Load ptr=0
  Burst bytes: 0xAA, 0xBB, 0xCC, 0xDD
  Read reg[0]: expect 0xAA
  Read reg[1]: expect 0xBB
  Read reg[2]: expect 0xCC
  Read reg[3]: expect 0xDD
  -> PASS  burst write: 4 registers updated

Test 2 — wrap-around from ptr=14:
  Load ptr=14
  Burst bytes: 0x11, 0x22, 0x33, 0x44
  Read reg[14]: expect 0x11
  Read reg[15]: expect 0x22
  Read reg[0]:  expect 0x33   <- wrapped
  Read reg[1]:  expect 0x44   <- wrapped
  -> PASS  pointer wrap-around

Pointer wraps: ptr = (ptr + 1) % 16  (4-bit natural overflow)`,
      design:
`// Build the i2c_autoincr testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst;
  logic       load_ptr;
  logic [3:0] start_addr;
  logic       data_valid;
  logic [7:0] data_in;
  logic [3:0] rd_addr;
  logic [7:0] rd_data;

  i2c_autoincr dut (
    .clk       (clk),
    .rst       (rst),
    .load_ptr  (load_ptr),
    .start_addr(start_addr),
    .data_valid(data_valid),
    .data_in   (data_in),
    .rd_addr   (rd_addr),
    .rd_data   (rd_data)
  );

  task automatic load_pointer(input logic [3:0] addr);
    start_addr = addr; load_ptr = 1;
    @(posedge clk); #1;
    load_ptr = 0;
  endtask

  task automatic burst_byte(input logic [7:0] bdata);
    data_in = bdata; data_valid = 1;
    @(posedge clk); #1;
    data_valid = 0;
  endtask

  task automatic read_reg(input logic [3:0] addr, output logic [7:0] data);
    rd_addr = addr; #1;
    data = rd_data;
  endtask

  logic [7:0] rval;
  logic all_ok;

  initial begin
    \$display("=== Auto-increment Pointer Test ===");
    rst = 0; load_ptr = 0; data_valid = 0;
    start_addr = 0; data_in = 0; rd_addr = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;

    // Test 1: burst 4 bytes starting at ptr=0
    load_pointer(4'd0);
    burst_byte(8'hAA);
    burst_byte(8'hBB);
    burst_byte(8'hCC);
    burst_byte(8'hDD);

    all_ok = 1;
    read_reg(4'd0, rval); if (rval !== 8'hAA) begin \$display("FAIL  reg[0]=0x%02h expected 0xaa", rval); all_ok = 0; end
    read_reg(4'd1, rval); if (rval !== 8'hBB) begin \$display("FAIL  reg[1]=0x%02h expected 0xbb", rval); all_ok = 0; end
    read_reg(4'd2, rval); if (rval !== 8'hCC) begin \$display("FAIL  reg[2]=0x%02h expected 0xcc", rval); all_ok = 0; end
    read_reg(4'd3, rval); if (rval !== 8'hDD) begin \$display("FAIL  reg[3]=0x%02h expected 0xdd", rval); all_ok = 0; end
    if (all_ok)
      \$display("PASS  burst write: 4 registers updated");

    // Test 2: wrap-around from ptr=14
    load_pointer(4'd14);
    burst_byte(8'h11);
    burst_byte(8'h22);
    burst_byte(8'h33);
    burst_byte(8'h44);

    all_ok = 1;
    read_reg(4'd14, rval); if (rval !== 8'h11) begin \$display("FAIL  reg[14]=0x%02h expected 0x11", rval); all_ok = 0; end
    read_reg(4'd15, rval); if (rval !== 8'h22) begin \$display("FAIL  reg[15]=0x%02h expected 0x22", rval); all_ok = 0; end
    read_reg(4'd0,  rval); if (rval !== 8'h33) begin \$display("FAIL  reg[0]=0x%02h expected 0x33 (wrap)", rval); all_ok = 0; end
    read_reg(4'd1,  rval); if (rval !== 8'h44) begin \$display("FAIL  reg[1]=0x%02h expected 0x44 (wrap)", rval); all_ok = 0; end
    if (all_ok)
      \$display("PASS  pointer wrap-around");

    \$display("Auto-increment testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  burst write: 4 registers updated',
        'PASS  pointer wrap-around',
        'Auto-increment testbench works!'
      ]
    }

  ]
});
