(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv5',
  title: 'Memory & Storage',
  icon: '💾',
  level: 'intermediate',
  lessons: [

    // ── L1 Register File (Tier 3) ──────────────────────────────────────────
    {
      id: 'msv5l1',
      title: 'L1 — Register File',
      theory: `
<h2>Register File: The CPU's Fast Scratchpad</h2>
<p>Every processor has a small array of registers — the fastest storage inside the chip. A <strong>register file</strong> is an array of flip-flops with multiple read ports and one write port. In RISC-V there are 32 registers; in ARM Cortex-M0, 16. You will build an 8-register, 8-bit file — the same concept, smaller scale.</p>

<h3>Packed array syntax</h3>
<p>Declare an array of 8-bit registers indexed 0 to 7:</p>
<pre class="code-block">logic [7:0] regs [0:7];  // 8 registers, each 8 bits wide</pre>

<h3>Dual read port — combinational</h3>
<p>Most CPUs need to read two operands at the same time (e.g., ADD r1, r2). Read ports are wired combinationally — no clock needed:</p>
<pre class="code-block">assign rdata1 = regs[raddr1];  // read port 1
assign rdata2 = regs[raddr2];  // read port 2</pre>

<h3>Single write port — synchronous</h3>
<p>Writes are clocked to prevent glitches. A write-enable (<code>we</code>) guards the write:</p>
<pre class="code-block">always_ff @(posedge clk) begin
  if (we) regs[waddr] <= wdata;
end</pre>

<h3>Register 0 convention</h3>
<p>In RISC-V, register 0 is hardwired to zero — writes to it are ignored and reads always return 0. This is a common hardware convention that simplifies the instruction set.</p>

<h3>You will build</h3>
<p>Module <code>reg_file</code>: clk, we, two read address/data ports, one write address/data port, 8 registers of 8 bits each. Register 0 is hardwired to zero.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for the complete reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare: logic [7:0] regs [0:7]  (8-element array of 8-bit registers)',
        'Read port 1: assign rdata1 = (raddr1 == 3\'b0) ? 8\'b0 : regs[raddr1]',
        'Read port 2: same pattern for rdata2 / raddr2',
        'Write port: always_ff block, if (we && waddr != 0) regs[waddr] <= wdata',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 4 PASS lines should appear',
      ],
      hint:
`module reg_file (
  input  logic        clk,
  input  logic        we,           // write enable
  input  logic [2:0]  raddr1,       // read port 1 address (0-7)
  input  logic [2:0]  raddr2,       // read port 2 address (0-7)
  input  logic [2:0]  waddr,        // write port address
  input  logic [7:0]  wdata,        // data to write
  output logic [7:0]  rdata1,       // read port 1 data
  output logic [7:0]  rdata2        // read port 2 data
);

  logic [7:0] regs [0:7];  // 8 x 8-bit registers

  // Read ports: combinational, reg[0] hardwired to zero
  assign rdata1 = (raddr1 == 3'b0) ? 8'b0 : regs[raddr1];
  assign rdata2 = (raddr2 == 3'b0) ? 8'b0 : regs[raddr2];

  // Write port: synchronous, ignore writes to reg[0]
  always_ff @(posedge clk) begin
    if (we && waddr != 3'b0)
      regs[waddr] <= wdata;
  end

endmodule`,
      design:
`// Type the reg_file module here. Read Theory for port layout.
//
// Ports:
//   input  logic        clk, we
//   input  logic [2:0]  raddr1, raddr2, waddr
//   input  logic [7:0]  wdata
//   output logic [7:0]  rdata1, rdata2
//
// 8 registers: logic [7:0] regs [0:7]
// Register 0 always reads as 0, writes to reg 0 are ignored.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        clk, we;
  logic [2:0]  raddr1, raddr2, waddr;
  logic [7:0]  wdata, rdata1, rdata2;

  reg_file dut(.clk(clk), .we(we), .raddr1(raddr1), .raddr2(raddr2),
               .waddr(waddr), .wdata(wdata), .rdata1(rdata1), .rdata2(rdata2));

  always #5 clk = ~clk;

  initial begin
    clk = 0; we = 0; waddr = 0; wdata = 0;
    raddr1 = 0; raddr2 = 0;

    // Write 0xAB to reg[1]
    we = 1; waddr = 3'd1; wdata = 8'hAB;
    @(posedge clk); #1;
    we = 0;

    // Read back reg[1]
    raddr1 = 3'd1; #1;
    if (rdata1 === 8'hAB)
      $display("PASS  reg[1] = 0x%h", rdata1);
    else
      $display("FAIL  reg[1]: expected 0xAB got 0x%h", rdata1);

    // Write 0x55 to reg[2]
    we = 1; waddr = 3'd2; wdata = 8'h55;
    @(posedge clk); #1;
    we = 0;

    // Dual read: reg[1] and reg[2] simultaneously
    raddr1 = 3'd1; raddr2 = 3'd2; #1;
    if (rdata1 === 8'hAB && rdata2 === 8'h55)
      $display("PASS  Dual read: r1=0x%h r2=0x%h", rdata1, rdata2);
    else
      $display("FAIL  Dual read: r1=0x%h r2=0x%h", rdata1, rdata2);

    // Write to reg[0] should be ignored
    we = 1; waddr = 3'd0; wdata = 8'hFF;
    @(posedge clk); #1;
    we = 0;
    raddr1 = 3'd0; #1;
    if (rdata1 === 8'h00)
      $display("PASS  reg[0] hardwired to zero");
    else
      $display("FAIL  reg[0] should be 0, got 0x%h", rdata1);

    // Write 0x00 to reg[3], read back
    we = 1; waddr = 3'd3; wdata = 8'h00;
    @(posedge clk); #1; we = 0;
    raddr1 = 3'd3; #1;
    if (rdata1 === 8'h00)
      $display("PASS  reg[3] = 0x00");
    else
      $display("FAIL  reg[3]: expected 0x00 got 0x%h", rdata1);

    $display("Register file works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  reg[1] = 0xab',
        'Register file works!'
      ]
    },

    // ── L2 Synchronous SRAM (Tier 4) ───────────────────────────────────────
    {
      id: 'msv5l2',
      title: 'L2 — Synchronous SRAM',
      theory: `
<h2>Synchronous SRAM: 256-Byte Data Memory</h2>
<p>A register file has a handful of locations (8–32). A <strong>Static RAM (SRAM)</strong> scales to thousands of addresses. It is the type of memory used for L1/L2 cache inside a CPU and for small local memories inside FPGAs.</p>

<h3>SRAM vs register file</h3>
<table class="truth-table">
  <tr><th>Property</th><th>Register File</th><th>SRAM</th></tr>
  <tr><td>Typical depth</td><td>8–32 words</td><td>256–1M+ words</td></tr>
  <tr><td>Read ports</td><td>2 (dual-port)</td><td>1 (usually)</td></tr>
  <tr><td>Read timing</td><td>Combinational</td><td>Combinational (sync on output reg)</td></tr>
  <tr><td>Write timing</td><td>Synchronous</td><td>Synchronous</td></tr>
  <tr><td>Use</td><td>CPU registers</td><td>Cache, local memory</td></tr>
</table>

<h3>Shared address bus</h3>
<p>Unlike the register file which has separate read/write addresses, a single-port SRAM shares one address for both read and write. A <code>we</code> (write-enable) signal selects the operation.</p>

<pre class="code-block">logic [7:0] mem [0:255];  // 256 x 8-bit memory

// Write: synchronous
always_ff @(posedge clk) begin
  if (we) mem[addr] <= wdata;
end

// Read: combinational (async)
assign rdata = mem[addr];</pre>

<h3>Read-during-write behaviour</h3>
<p>When <code>we=1</code>, the combinational read will return the OLD value at that address (because the write has not happened yet). This is called <strong>read-first</strong> behaviour. After the clock edge, the new value is visible. This subtlety matters when writing testbenches.</p>

<h3>You will build</h3>
<p>Module <code>sync_sram</code>: inputs <code>clk, we, addr[7:0], wdata[7:0]</code>, output <code>rdata[7:0]</code>. 256-byte memory, combinational read, synchronous write.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare: logic [7:0] mem [0:255]  (256 bytes of storage)',
        'Write port: always_ff @(posedge clk), if (we) mem[addr] <= wdata',
        'Read port: assign rdata = mem[addr]  (combinational, no clock)',
        'Note: read returns old value when we=1 on the same cycle (read-first)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 3 PASS lines should appear',
      ],
      hint:
`DESIGN NOTES for sync_sram:

  Ports:
    input  logic        clk, we
    input  logic [7:0]  addr, wdata
    output logic [7:0]  rdata

  Memory declaration:
    logic [7:0] mem [0:255];   // 256 words x 8 bits

  Write (synchronous - needs clock):
    always_ff @(posedge clk) begin
      if (we) mem[addr] <= wdata;
    end

  Read (combinational - no clock needed):
    assign rdata = mem[addr];

  Read-first behaviour:
    On the same cycle as a write, rdata shows the OLD value.
    One clock later, the new value is readable.
    This is correct and expected — testbench waits one cycle after write.

  Verilator note:
    Use --no-timing. The mem array may need --Wno-UNINITIALIZED if
    Verilator warns about uninitialized reads (add a check in TB instead).`,
      design:
`// Build the sync_sram module here. Read Theory for the port layout.
//
// Module: sync_sram
// Ports: clk, we (write enable), addr[7:0], wdata[7:0] (inputs), rdata[7:0] (output)
// 256 x 8-bit memory. Synchronous write, combinational read.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        clk, we;
  logic [7:0]  addr, wdata, rdata;

  sync_sram dut(.clk(clk), .we(we), .addr(addr), .wdata(wdata), .rdata(rdata));

  always #5 clk = ~clk;

  initial begin
    clk = 0; we = 0; addr = 0; wdata = 0;

    // Write 0xDE to address 10
    we = 1; addr = 8'd10; wdata = 8'hDE;
    @(posedge clk); #1;  // write happens at posedge
    we = 0;

    // Read back address 10
    addr = 8'd10; #1;
    if (rdata === 8'hDE)
      $display("PASS  mem[10] = 0x%h", rdata);
    else
      $display("FAIL  mem[10]: expected 0xDE got 0x%h", rdata);

    // Write 0xAD to address 200, read back
    we = 1; addr = 8'd200; wdata = 8'hAD;
    @(posedge clk); #1;
    we = 0;
    addr = 8'd200; #1;
    if (rdata === 8'hAD)
      $display("PASS  mem[200] = 0x%h", rdata);
    else
      $display("FAIL  mem[200]: expected 0xAD got 0x%h", rdata);

    // Verify address 10 is unchanged
    addr = 8'd10; #1;
    if (rdata === 8'hDE)
      $display("PASS  mem[10] unchanged after writing mem[200]");
    else
      $display("FAIL  mem[10] corrupted: got 0x%h", rdata);

    $display("SRAM works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  mem[10] = 0xde',
        'SRAM works!'
      ]
    },

    // ── L3 FIFO Buffer (Tier 4) ───────────────────────────────────────────
    {
      id: 'msv5l3',
      title: 'L3 — FIFO Buffer',
      theory: `
<h2>FIFO: First-In, First-Out Buffer</h2>
<p>A <strong>FIFO</strong> is a queue in hardware: data enters at the back and leaves from the front. FIFOs are everywhere: between a CPU and a UART transmitter, between two clock domains, between a DMA engine and DDR memory. Whenever two blocks run at different rates, a FIFO absorbs the mismatch.</p>

<h3>Pointer-based implementation</h3>
<p>A circular buffer with write pointer (<code>wptr</code>), read pointer (<code>rptr</code>), and a count of occupied slots:</p>
<pre class="code-block">// Write
if (push && !full) begin
  mem[wptr] <= wdata;
  wptr <= wptr + 1;  // wraps around automatically (3-bit + depth=8)
  count <= count + 1;
end

// Read
if (pop && !empty) begin
  rptr  <= rptr + 1;
  count <= count - 1;
end
assign rdata = mem[rptr];  // combinational peek</pre>

<h3>Full and empty flags</h3>
<pre class="code-block">assign full  = (count == 4'd8);  // use 4 bits for count (0-8 inclusive)
assign empty = (count == 4'd0);</pre>

<h3>The off-by-one trap</h3>
<p>For a depth-8 FIFO, count reaches 8 (which needs 4 bits — 0 to 8 inclusive). Using a 3-bit counter overflows at 8 back to 0, silently reporting empty when actually full. Always use <code>logic [3:0] count</code> for a depth-8 FIFO.</p>

<h3>Simultaneous push and pop</h3>
<p>When push and pop are both asserted on the same cycle and the FIFO is neither full nor empty, data flows through: one item written, one read. Count stays the same. This is the <em>pass-through</em> case and your implementation should handle it correctly.</p>

<h3>You will build</h3>
<p>Module <code>fifo</code>: depth=8, width=8. Inputs: <code>clk, rst, push, pop, wdata[7:0]</code>. Outputs: <code>rdata[7:0], full, empty</code>.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare: logic [7:0] mem [0:7]  (8-slot buffer)',
        'Declare: logic [2:0] wptr, rptr  (3-bit pointers, wrap automatically)',
        'Declare: logic [3:0] count  (IMPORTANT: 4 bits to hold values 0-8)',
        'assign full = (count == 4\'d8)  and  assign empty = (count == 4\'d0)',
        'assign rdata = mem[rptr]  (combinational peek at front of queue)',
        'Write always_ff: handle push-when-not-full and pop-when-not-empty',
        'Handle simultaneous push AND pop: count stays the same',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 4 PASS lines should appear',
      ],
      hint:
`DESIGN NOTES for fifo (depth=8, width=8):

  Ports:
    input  logic       clk, rst, push, pop
    input  logic [7:0] wdata
    output logic [7:0] rdata
    output logic       full, empty

  Internals:
    logic [7:0] mem [0:7];   // 8-slot circular buffer
    logic [2:0] wptr, rptr;  // pointers wrap at 8 automatically
    logic [3:0] count;       // 4 bits! holds 0 through 8

  Combinational outputs:
    assign full  = (count == 4'd8);
    assign empty = (count == 4'd0);
    assign rdata = mem[rptr];   // peek at front without consuming

  always_ff block:
    case 1: push only (not full)
      mem[wptr] <= wdata;
      wptr  <= wptr + 1;
      count <= count + 1;

    case 2: pop only (not empty)
      rptr  <= rptr + 1;
      count <= count - 1;

    case 3: push AND pop simultaneously (neither full nor empty)
      mem[wptr] <= wdata;
      wptr  <= wptr + 1;
      rptr  <= rptr + 1;
      count unchanged  // one in, one out

  Off-by-one warning:
    3-bit count overflows at 8 back to 0 -> appears empty when full!
    Always use 4-bit count for depth-8 FIFO.`,
      design:
`// Build the fifo module here. Read Theory for the pointer design.
//
// Module: fifo
// Depth=8, Width=8 bits
// Ports: clk, rst, push, pop, wdata[7:0] (inputs), rdata[7:0], full, empty (outputs)
//
// Key: use 4-bit count (not 3-bit) to correctly represent 0..8
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, push, pop, full, empty;
  logic [7:0] wdata, rdata;

  fifo dut(.clk(clk), .rst(rst), .push(push), .pop(pop),
           .wdata(wdata), .rdata(rdata), .full(full), .empty(empty));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; push = 0; pop = 0; wdata = 0;
    @(posedge clk); #1; rst = 0;

    // Check starts empty
    if (empty === 1'b1)
      $display("PASS  FIFO starts empty");
    else
      $display("FAIL  FIFO should start empty, empty=%0b", empty);

    // Push 8 items to fill FIFO
    begin : fill
      integer i;
      for (i = 0; i < 8; i = i + 1) begin
        wdata = i[7:0] + 8'd1; push = 1;
        @(posedge clk); #1;
      end
      push = 0;
    end

    if (full === 1'b1)
      $display("PASS  FIFO is full after 8 pushes");
    else
      $display("FAIL  FIFO should be full, full=%0b", full);

    // Pop first item - should be 1 (first pushed)
    pop = 1; @(posedge clk); #1; pop = 0;
    if (rdata === 8'd1)
      $display("PASS  First pop = %0d (FIFO order correct)", rdata);
    else
      $display("FAIL  First pop: expected 1 got %0d", rdata);

    // Drain remaining 7 items
    begin : drain
      integer j;
      for (j = 0; j < 7; j = j + 1) begin
        pop = 1; @(posedge clk); #1;
      end
      pop = 0;
    end

    if (empty === 1'b1)
      $display("PASS  FIFO empty after draining");
    else
      $display("FAIL  FIFO should be empty, empty=%0b", empty);

    $display("FIFO works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  FIFO starts empty',
        'PASS  FIFO is full after 8 pushes',
        'FIFO works!'
      ]
    },

    // ── L4 Portfolio: Stack / LIFO (Tier 5) ───────────────────────────────
    {
      id: 'msv5l4',
      title: 'L4 — Portfolio: Stack (LIFO)',
      theory: `
<h2>Portfolio Project: Hardware Stack (LIFO)</h2>
<p>A <strong>stack</strong> is a Last-In, First-Out buffer — the most recently pushed item is the first to be popped. Hardware stacks appear in CPU call-return mechanisms, expression evaluators, and interrupt handlers. Building one from scratch demonstrates you understand both pointer management and overflow/underflow protection.</p>

<h3>Your specification</h3>
<ul>
  <li>Depth: 8 entries, each 8 bits wide</li>
  <li>Input: <code>push</code> (write new item) and <code>pop</code> (remove and return top item)</li>
  <li>Output: <code>top[7:0]</code> — always shows the current top-of-stack without consuming it</li>
  <li>Output: <code>overflow</code> — pulse high for one cycle when push attempted on a full stack</li>
  <li>Output: <code>underflow</code> — pulse high for one cycle when pop attempted on empty stack</li>
</ul>

<h3>Stack pointer discipline</h3>
<pre class="code-block">// Push: write then increment
mem[sp] <= wdata;
sp <= sp + 1;

// Pop: decrement then read
sp <= sp - 1;
// top shows mem[sp-1] combinationally</pre>

<h3>Why this matters</h3>
<p>Every function call in a C program pushes a return address onto the CPU’s hardware stack. Buffer overflow attacks exploit missing overflow protection in software stacks — a hardware stack with built-in overflow/underflow detection is intrinsically safer.</p>

<h3>Difference from FIFO</h3>
<p>In a FIFO, you always read from rptr and write to wptr (they advance independently). In a stack, there is only one pointer (sp) that moves up on push and down on pop — both operations share the same pointer direction logic.</p>

<p><strong>Ready?</strong> Switch to Code. There is no hint for portfolio projects. Plan the state on paper first.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Module: stack, depth=8, width=8',
        'Inputs: clk, rst, push, pop, wdata[7:0]',
        'Outputs: top[7:0], overflow, underflow',
        'Stack pointer: logic [2:0] sp  (0 = empty, 8 = full)',
        'Push: write mem[sp], then increment sp (only when sp < 8)',
        'Pop: decrement sp (only when sp > 0)',
        'assign top = (sp == 0) ? 8\'b0 : mem[sp-1]  (peek without consuming)',
        'overflow pulses when push attempted and sp==8',
        'underflow pulses when pop attempted and sp==0',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear',
        '🎓 Portfolio piece — push to your GitHub',
        'Next: msv6 Serial Protocols — UART, SPI, and I2C from scratch',
      ],
      hint: `No hint for portfolio projects. Design checklist:
1. What is the state? (memory array + stack pointer)
2. What are the legal operations? (push when not full, pop when not empty)
3. What are the illegal operations and their side effects? (overflow, underflow pulses)
4. What does 'top' show when the stack is empty?
5. Trace: push(10), push(20), push(30), pop -> should return 30 (LIFO).`,
      design:
`// Build the stack module here.
//
// Module: stack
// Ports:
//   input  logic       clk, rst, push, pop
//   input  logic [7:0] wdata
//   output logic [7:0] top       -- current top of stack (peek)
//   output logic       overflow  -- 1-cycle pulse on push-when-full
//   output logic       underflow -- 1-cycle pulse on pop-when-empty
//
// Depth=8, each entry 8 bits wide.
// Use a stack pointer (sp) from 0 (empty) to 8 (full).
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, push, pop, overflow, underflow;
  logic [7:0] wdata, top;

  stack dut(.clk(clk), .rst(rst), .push(push), .pop(pop),
            .wdata(wdata), .top(top), .overflow(overflow), .underflow(underflow));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; push = 0; pop = 0; wdata = 0;
    @(posedge clk); #1; rst = 0;

    // Push 10, 20, 30
    wdata = 8'd10; push = 1; @(posedge clk); #1;
    wdata = 8'd20;           @(posedge clk); #1;
    wdata = 8'd30;           @(posedge clk); #1; push = 0;

    // Top should be 30
    if (top === 8'd30)
      $display("PASS  top = %0d after pushing 10,20,30", top);
    else
      $display("FAIL  top: expected 30 got %0d", top);

    // Pop: should return 30
    pop = 1; @(posedge clk); #1; pop = 0;
    if (top === 8'd20)
      $display("PASS  After pop: top = %0d (LIFO order)", top);
    else
      $display("FAIL  After pop: expected top=20 got %0d", top);

    // Pop twice more to empty
    pop = 1; @(posedge clk); #1;
             @(posedge clk); #1; pop = 0;

    // Now stack empty - pop should trigger underflow
    pop = 1; @(posedge clk); #1; pop = 0;
    if (underflow === 1'b1)
      $display("PASS  underflow on pop-when-empty");
    else
      $display("FAIL  underflow: expected 1, got %0b", underflow);

    $display("Stack works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  top = 30 after pushing 10,20,30',
        'PASS  underflow on pop-when-empty',
        'Stack works!'
      ]
    }

  ]
});
