(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c6',
  title: 'Register Map & Memory',
  icon: '🗂️',
  level: 'advanced',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — 8-bit Register File  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c6l1',
      title: 'L1 — 8-bit Register File',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>Every I²C peripheral chip you have ever used — a temperature sensor, a power-management IC, an OLED display controller — contains a <strong>register file</strong> at its core. When you write <code>0x06</code> to address <code>0x03</code> of a BME280 weather sensor, you are writing into exactly this kind of structure. The chip datasheet's register map table is a specification for the register file you are about to build.</p>

<pre class="code-block">I²C Write transaction targeting a register file:

  START → [Device Addr + W] → ACK → [Reg Addr] → ACK → [Data] → ACK → STOP
                                          |                  |
                                          ↓                  ↓
                                     addr_in[3:0]       data_in[7:0]
                                          |                  |
                                 ┌────────▼──────────────────▼────────┐
                                 │   16 × 8-bit Register File         │
                                 │   regs[0x0] ... regs[0xF]          │
                                 └────────────────────────────────────┘</pre>

<h2>What a register file is — and why it works</h2>
<p>A register file is an array of flip-flops, indexed by an address. Think of it as a tiny hotel: each room (register) has a number (address), holds one guest (8-bit value), and can be read or written independently. Writes require a key (write enable); reads are always available by specifying the room number.</p>
<p>The read side is <strong>combinational</strong> — the output value appears immediately based on the address, like looking up a word in a printed dictionary. The write side is <strong>synchronous</strong> — data is only committed at the clock edge, preventing glitch races.</p>

<pre class="code-block">// Synchronous write (registered)
always_ff @(posedge clk) begin
  if (wr_en)
    regs[addr_in] &lt;= data_in;
end

// Combinational read (immediate)
assign data_out = regs[addr_out];</pre>

<table class="truth-table">
  <tr><th>wr_en</th><th>rd_en</th><th>Effect</th></tr>
  <tr><td>0</td><td>0</td><td>Registers hold their values; data_out reflects addr_out</td></tr>
  <tr><td>1</td><td>0</td><td>data_in written to regs[addr_in] on next clock edge</td></tr>
  <tr><td>0</td><td>1</td><td>data_out immediately shows regs[addr_out]</td></tr>
  <tr><td>1</td><td>1</td><td>Write happens at clock edge; read shows old value this cycle</td></tr>
</table>

<h2>Before you code</h2>
<p>What you are about to build is a 16-register, 8-bit-wide register file. It has separate read and write address ports so a controller can read one register while writing another in the same cycle (useful for interrupt service routines). On reset, all 16 registers clear to zero. Every write is committed at the rising clock edge when <code>wr_en</code> is high. Reads are available every cycle — no enable needed.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock that gates every register write operation.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset that clears all 16 registers to 0x00.</td></tr>
  <tr><td><code>wr_en</code></td><td>input logic</td><td>Write enable — when high, data_in is written to regs[addr_in] at the next clock edge.</td></tr>
  <tr><td><code>addr_in</code></td><td>input logic [3:0]</td><td>4-bit write address selecting which of the 16 registers receives data_in.</td></tr>
  <tr><td><code>data_in</code></td><td>input logic [7:0]</td><td>8-bit value to store in the register pointed to by addr_in.</td></tr>
  <tr><td><code>addr_out</code></td><td>input logic [3:0]</td><td>4-bit read address selecting which register drives data_out this cycle.</td></tr>
  <tr><td><code>data_out</code></td><td>output logic [7:0]</td><td>8-bit value read from the register pointed to by addr_out (combinational, no latency).</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_regfile with ports: clk, rst, wr_en, addr_in [3:0], data_in [7:0], addr_out [3:0], data_out [7:0]',
        'Inside the module, declare the 16-element register array: logic [7:0] regs [0:15]',
        'Write the synchronous always_ff block: on reset clear all 16 regs to 0; else if wr_en write data_in to regs[addr_in]',
        'Hint: clear all registers in reset using a for loop — for (int i = 0; i < 16; i++) regs[i] <= 8\'h00',
        'Write the combinational read: assign data_out = regs[addr_out]',
        'Close the module with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2c_regfile:

  Structure: 16 x 8-bit array of flip-flops
    logic [7:0] regs [0:15];

  Write port (synchronous):
    always_ff @(posedge clk) begin
      if (!rst)
        for (int i = 0; i < 16; i++) regs[i] <= 8'h00;
      else if (wr_en)
        regs[addr_in] <= data_in;
    end

  Read port (combinational):
    assign data_out = regs[addr_out];

  Key design points:
  - Separate addr_in and addr_out allow simultaneous read + write
  - Reset MUST clear all 16 registers (use loop, not just index 0)
  - Read is purely combinational: no clock, no enable needed
  - Write happens on the NEXT clock edge after wr_en goes high
  - Use logic [7:0] regs [0:15] -- packed width, unpacked depth`,
      design:
`// Build the i2c_regfile module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, wr_en;
  logic [3:0] addr_in, addr_out;
  logic [7:0] data_in, data_out;

  i2c_regfile dut (
    .clk     (clk),
    .rst     (rst),
    .wr_en   (wr_en),
    .addr_in (addr_in),
    .data_in (data_in),
    .addr_out(addr_out),
    .data_out(data_out)
  );

  initial begin
    \$display("=== Register File Test ===");

    // Reset — all registers should clear to 0
    rst = 0; wr_en = 0; addr_in = 0; addr_out = 0; data_in = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1;
    @(posedge clk); #1;
    addr_out = 4'h5;
    #1;
    if (data_out === 8'h00)
      \$display("PASS  reset: regs[5]=0x%02h", data_out);
    else
      \$display("FAIL  reset: regs[5]=0x%02h (expected 0x00)", data_out);

    // Write 0xAB to register 3, then read it back
    wr_en = 1; addr_in = 4'h3; data_in = 8'hAB;
    @(posedge clk); #1;
    wr_en = 0;
    addr_out = 4'h3; #1;
    if (data_out === 8'hAB)
      \$display("PASS  write/read: regs[3]=0x%02h", data_out);
    else
      \$display("FAIL  write/read: regs[3]=0x%02h (expected 0xAB)", data_out);

    // Write two registers and read both without re-writing
    wr_en = 1; addr_in = 4'h7; data_in = 8'h55;
    @(posedge clk); #1;
    wr_en = 0;
    addr_out = 4'h7; #1;
    if (data_out === 8'h55)
      \$display("PASS  second write: regs[7]=0x%02h", data_out);
    else
      \$display("FAIL  second write: regs[7]=0x%02h (expected 0x55)", data_out);

    \$display("Register file works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: regs[5]=0x00',
        'PASS  write/read: regs[3]=0xab',
        'PASS  second write: regs[7]=0x55',
        'Register file works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — Address Decoder  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c6l2',
      title: 'L2 — Address Decoder',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>When your microcontroller writes to an I²C peripheral's register address <code>0x10</code>, the chip must figure out whether that byte should go to its configuration register, its data FIFO, or its interrupt control register. That routing decision is made by an <strong>address decoder</strong>. Every SoC peripheral — GPIO, UART, SPI — has one inside. The ARM Cortex-M bus fabric is essentially a large hierarchical address decoder.</p>

<pre class="code-block">I²C register address space for a hypothetical sensor chip:

  BASE = 0x48 (parameterised)

  Incoming byte:  [7:0]
                  ┌────────┬────────┐
                  │ [7:4]  │ [3:0]  │
                  │ BASE   │ offset │
                  └────┬───┴───┬────┘
                       │       │
                    match?   which register?
                       │       │
                    ┌──▼───────▼─────────────────────┐
                    │  Address Decoder                │
                    │                                 │
                    │  sel_cfg   ← offset 0x0         │
                    │  sel_data  ← offset 0x1         │
                    │  sel_irq   ← offset 0x2–0x3     │
                    │  sel_none  ← no match / out of  │
                    │             range                │
                    └─────────────────────────────────┘</pre>

<h2>What an address decoder is — and why it works</h2>
<p>An address decoder is a combinational circuit that answers two questions simultaneously: "Is this address meant for me?" (range check) and "Which sub-block should receive it?" (offset decode). Think of it like a post-office sorting machine: the ZIP code selects the city (base match) and the street address selects the exact house (offset select).</p>
<p>The base address is a parameter so the same decoder RTL can be reused at different locations in the address map — just change the parameter at instantiation, exactly how real IP vendors ship peripheral blocks.</p>

<pre class="code-block">// Parameterised base address comparison
parameter logic [3:0] BASE_ADDR = 4'h4;

// Range check: upper nibble must match BASE_ADDR
logic in_range;
assign in_range = (addr_in[7:4] === BASE_ADDR);

// Offset decode: lower nibble selects the sub-block
always_comb begin
  sel_cfg  = 0; sel_data = 0; sel_irq = 0;
  if (in_range) begin
    case (addr_in[3:0])
      4'h0:       sel_cfg  = 1;
      4'h1:       sel_data = 1;
      4'h2, 4'h3: sel_irq  = 1;
      default: ;  // out of range — no select asserted
    endcase
  end
end</pre>

<table class="truth-table">
  <tr><th>addr_in[7:4]</th><th>addr_in[3:0]</th><th>in_range</th><th>sel_cfg</th><th>sel_data</th><th>sel_irq</th></tr>
  <tr><td>BASE_ADDR</td><td>0x0</td><td>1</td><td>1</td><td>0</td><td>0</td></tr>
  <tr><td>BASE_ADDR</td><td>0x1</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>
  <tr><td>BASE_ADDR</td><td>0x2</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>BASE_ADDR</td><td>0x3</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>other</td><td>any</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
</table>

<h2>Before you code</h2>
<p>What you are about to build is a combinational address decoder with a parameterised 4-bit base address. It receives an 8-bit register address from the I²C controller. The upper nibble is checked against BASE_ADDR; if they match, the lower nibble selects one of three peripheral sub-blocks (cfg, data, irq) by asserting the corresponding select line. If no match, all selects stay low. This is a purely combinational circuit — no clock, no flip-flops.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>addr_in</code></td><td>input logic [7:0]</td><td>8-bit register address received from the I²C bus, to be decoded this cycle.</td></tr>
  <tr><td><code>sel_cfg</code></td><td>output logic</td><td>Goes high when addr_in targets the configuration register (offset 0x0 within BASE_ADDR range).</td></tr>
  <tr><td><code>sel_data</code></td><td>output logic</td><td>Goes high when addr_in targets the data register (offset 0x1 within BASE_ADDR range).</td></tr>
  <tr><td><code>sel_irq</code></td><td>output logic</td><td>Goes high when addr_in targets the interrupt register (offsets 0x2 or 0x3 within BASE_ADDR range).</td></tr>
  <tr><td><code>BASE_ADDR</code></td><td>parameter [3:0]</td><td>Upper-nibble base address of this peripheral — set at instantiation time to relocate the decoder in the address map.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_addr_decode with parameter BASE_ADDR [3:0] = 4\'h4, input addr_in [7:0], outputs sel_cfg, sel_data, sel_irq',
        'Add a combinational logic signal in_range: asserted when addr_in[7:4] matches BASE_ADDR',
        'Write an always_comb block that defaults all three selects to 0',
        'Inside always_comb: if in_range, use a case on addr_in[3:0] — 0x0 → sel_cfg, 0x1 → sel_data, 0x2/0x3 → sel_irq',
        'Verify: when addr_in[7:4] != BASE_ADDR, all selects remain 0 (the default path handles this)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2c_addr_decode:

  Parameter:
    parameter logic [3:0] BASE_ADDR = 4'h4;

  Port list:
    input  logic [7:0] addr_in
    output logic       sel_cfg, sel_data, sel_irq

  Range check (combinational signal):
    logic in_range;
    assign in_range = (addr_in[7:4] === BASE_ADDR);

  Offset decode (always_comb):
    always_comb begin
      sel_cfg  = 0;
      sel_data = 0;
      sel_irq  = 0;
      if (in_range) begin
        case (addr_in[3:0])
          4'h0:          sel_cfg  = 1;
          4'h1:          sel_data = 1;
          4'h2, 4'h3:    sel_irq  = 1;
          default: ;     // out of range -- all selects stay 0
        endcase
      end
    end

  Key design points:
  - Default all outputs to 0 BEFORE the case — prevents latches in synthesis
  - Use === for 4-state comparison in Verilator
  - BASE_ADDR is a parameter so the same block can be placed at any address
  - No clock needed — this is purely combinational routing logic`,
      design:
`// Build the i2c_addr_decode module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [7:0] addr_in;
  logic       sel_cfg, sel_data, sel_irq;

  // Instantiate with default BASE_ADDR = 4'h4
  i2c_addr_decode dut (
    .addr_in (addr_in),
    .sel_cfg (sel_cfg),
    .sel_data(sel_data),
    .sel_irq (sel_irq)
  );

  task automatic check(
    input logic [7:0] addr,
    input logic       exp_cfg, exp_data, exp_irq,
    input string      label
  );
    addr_in = addr; #2;
    if (sel_cfg === exp_cfg && sel_data === exp_data && sel_irq === exp_irq)
      \$display("PASS  %s: cfg=%0b data=%0b irq=%0b", label, sel_cfg, sel_data, sel_irq);
    else
      \$display("FAIL  %s: cfg=%0b data=%0b irq=%0b (exp %0b %0b %0b)",
               label, sel_cfg, sel_data, sel_irq, exp_cfg, exp_data, exp_irq);
  endtask

  initial begin
    \$display("=== Address Decoder Test ===");
    // BASE_ADDR = 0x4, so valid range is 0x40–0x4F
    check(8'h40, 1, 0, 0, "cfg  @ 0x40");
    check(8'h41, 0, 1, 0, "data @ 0x41");
    check(8'h42, 0, 0, 1, "irq  @ 0x42");
    check(8'h43, 0, 0, 1, "irq  @ 0x43");
    check(8'h50, 0, 0, 0, "miss @ 0x50");
    \$display("Address decoder works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  cfg  @ 0x40',
        'PASS  data @ 0x41',
        'PASS  irq  @ 0x42',
        'PASS  miss @ 0x50',
        'Address decoder works!'
      ]
    },

    // L3 added next
  ]
});
