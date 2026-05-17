// Module 13 — APB Protocol, End-to-End (Build Every Block Yourself)
// To edit this module, change only this file.
//
// Pedagogy: the user writes all meaningful logic. Each lesson gives:
//   • theory — the spec and the concept
//   • a skeleton design with only the port list (they write the body)
//   • a skeleton testbench with only clock/reset + DUT hookup (they write stimulus + checks)
//   • hints that walk through the approach
// The series builds one sub-block per lesson until a full APB system is working.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m13",
  title: "APB Protocol — Build It Yourself, End-to-End",
  icon: "🔌",
  level: "advanced",
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Define the APB Slave interface (ports only, no logic yet)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l1",
      title: "APB Slave — Define the Interface",
      theory: `
<h2>Welcome to the APB Build Series</h2>
<p>By the end of this series you will have written — <strong>from scratch</strong> — every block needed for a working APB bus: slave, master, register file, FSM, wait-state logic, error response, and a complete system testbench.</p>
<p>Each lesson is small and focused. You will <strong>write the module yourself</strong>, guided only by the spec and hints. We provide just the port list so the testbench can talk to your design.</p>

<h2>Lesson 1 — The APB Slave Interface</h2>
<p>The first thing any protocol block needs is a <strong>port declaration</strong>. Get this right and every later lesson slots in neatly.</p>

<h3>APB Signals Reference (AMBA APB3)</h3>
<table style="border-collapse:collapse;width:100%;font-size:0.92em">
  <tr style="background:#1e293b"><th style="padding:6px 10px;text-align:left">Signal</th><th style="padding:6px 10px">Width</th><th style="padding:6px 10px">Dir (slave view)</th></tr>
  <tr><td style="padding:5px 10px"><code>PCLK</code></td><td>1</td><td>input</td></tr>
  <tr><td style="padding:5px 10px"><code>PRESETn</code></td><td>1</td><td>input (active-low)</td></tr>
  <tr><td style="padding:5px 10px"><code>PADDR</code></td><td>32</td><td>input</td></tr>
  <tr><td style="padding:5px 10px"><code>PSEL</code></td><td>1</td><td>input</td></tr>
  <tr><td style="padding:5px 10px"><code>PENABLE</code></td><td>1</td><td>input</td></tr>
  <tr><td style="padding:5px 10px"><code>PWRITE</code></td><td>1</td><td>input</td></tr>
  <tr><td style="padding:5px 10px"><code>PWDATA</code></td><td>32</td><td>input</td></tr>
  <tr><td style="padding:5px 10px"><code>PRDATA</code></td><td>32</td><td>output</td></tr>
  <tr><td style="padding:5px 10px"><code>PREADY</code></td><td>1</td><td>output</td></tr>
  <tr><td style="padding:5px 10px"><code>PSLVERR</code></td><td>1</td><td>output</td></tr>
</table>

<h3>Your Task</h3>
<p>Write a module <code>apb_slave_if</code> that has <strong>all ten APB ports</strong> with the correct direction and width. Inside the module, drive the three outputs to harmless defaults so it compiles cleanly:</p>
<ul>
  <li><code>PRDATA  = 32'h0</code></li>
  <li><code>PREADY  = 1'b1</code> (always ready)</li>
  <li><code>PSLVERR = 1'b0</code></li>
</ul>

<h3>Testbench You Will Write</h3>
<p>In the testbench, declare matching <code>reg</code> / <code>wire</code> signals, generate a 100 MHz clock, release reset after a few cycles, and print a banner plus the three default output values. Target these two messages in your <code>$display</code> so the checker sees them:</p>
<pre class="code-block">PASS interface compiles
PASS defaults PRDATA=00000000 PREADY=1 PSLVERR=0</pre>
      `,
      tasks: [
        "Inside the design module, drive PRDATA, PREADY, PSLVERR to their defaults",
        "In the testbench, declare reg for all inputs and wire for all three outputs",
        "Generate PCLK with an `always #5` block; pulse PRESETn low for 2–3 cycles",
        "After reset, $display the default output values and a 'PASS interface compiles' banner",
        "Run — confirm both PASS lines appear"
      ],
      hint: "Input ports are reg in the testbench, output ports are wire. Use `assign PREADY = 1'b1;` etc. For clock: `reg PCLK=0; always #5 PCLK = ~PCLK;`. Remember $finish; at the end.",
      design: `// L1 — APB Slave Interface
// Declare the ports and drive the three outputs to safe defaults.
// Everything else is up to you.
module apb_slave_if (
  /* declare all 10 APB ports here — see the signal table in theory */
);

  // Drive the outputs to safe defaults so the module compiles and behaves
  // predictably when the testbench wiggles the inputs.
  /* your code here */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;

  // 1. Declare testbench signals matching the DUT ports
  //    (reg for DUT inputs, wire for DUT outputs)
  /* your declarations here */

  // 2. Generate a 100 MHz clock
  /* your clock generator here */

  // 3. Instantiate the DUT
  //    apb_slave_if dut ( .PCLK(PCLK), ... );
  /* your instantiation here */

  // 4. Drive reset + print PASS lines
  initial begin
    /* your stimulus + $display here */
    $finish;
  end

endmodule`,
      expected: ["PASS interface compiles", "PASS defaults"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Phase decoder: combinational SETUP and ACCESS detection
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l2",
      title: "Phase Decoder — Detect SETUP and ACCESS",
      theory: `
<h2>The Two-Phase Protocol</h2>
<p>Every APB transaction has exactly two phases, identified by the combination of <code>PSEL</code> and <code>PENABLE</code>:</p>
<table style="border-collapse:collapse;width:100%;font-size:0.92em">
  <tr style="background:#1e293b"><th style="padding:6px 10px">PSEL</th><th style="padding:6px 10px">PENABLE</th><th style="padding:6px 10px">Phase</th></tr>
  <tr><td style="padding:5px 10px">0</td><td>x</td><td>IDLE</td></tr>
  <tr><td style="padding:5px 10px">1</td><td>0</td><td>SETUP</td></tr>
  <tr><td style="padding:5px 10px">1</td><td>1</td><td>ACCESS</td></tr>
</table>

<h3>Why You Build This First</h3>
<p>Every subsequent block (FSM, write path, read path, master, arbiter) needs to know what phase the bus is in. Encapsulating that in one tiny combinational block means the rest of the series stays clean.</p>

<h3>Waveform</h3>
<pre class="code-block">PCLK     _|‾|_|‾|_|‾|_|‾|_|‾|_
PSEL     ___|‾‾‾‾‾‾‾‾‾‾‾|_____
PENABLE  _______|‾‾‾‾‾‾‾|_____
phase    IDLE   SETUP  ACCESS  IDLE</pre>

<h3>Your Task</h3>
<p>Write a <strong>purely combinational</strong> module <code>apb_phase_decoder</code>:</p>
<ul>
  <li>Inputs: <code>PSEL</code>, <code>PENABLE</code></li>
  <li>Outputs: <code>idle</code>, <code>setup</code>, <code>access</code> — exactly one high at any time</li>
</ul>

<h3>Testbench You Will Write</h3>
<p>Exercise all four input combinations. Use a task to apply inputs, wait a tick, then check the three outputs. Print <code>PASS</code> or <code>FAIL</code> with the inputs and the decoded phase. Target these messages:</p>
<pre class="code-block">PASS PSEL=0 PENABLE=0 → IDLE
PASS PSEL=0 PENABLE=1 → IDLE
PASS PSEL=1 PENABLE=0 → SETUP
PASS PSEL=1 PENABLE=1 → ACCESS</pre>
      `,
      tasks: [
        "Write the three boolean expressions for idle, setup, and access",
        "Use assign statements — no always block needed (it's combinational)",
        "In the testbench, loop through all 4 input combinations",
        "For each combination, print PASS/FAIL with the phase name",
        "Verify exactly one of the three outputs is high at any time"
      ],
      hint: "idle = !PSEL. setup = PSEL & !PENABLE. access = PSEL & PENABLE. In the TB, a simple loop or 4 explicit stimulus lines both work. Use a #1 delay after changing inputs to let combinational logic settle before sampling.",
      design: `// L2 — APB Phase Decoder
// Pure combinational logic. Output exactly one of idle/setup/access at all times.
module apb_phase_decoder (
  input  wire PSEL,
  input  wire PENABLE,
  output wire idle,
  output wire setup,
  output wire access
);

  /* your three assign statements here */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  PSEL, PENABLE;
  wire idle, setup, access;

  apb_phase_decoder dut (.PSEL(PSEL), .PENABLE(PENABLE),
                         .idle(idle), .setup(setup), .access(access));

  // Write a task 'check' that takes expected phase name (string) and the
  // stimulus, applies inputs, waits #1, then compares the decoded output.
  /* your check task here */

  initial begin
    // Exercise all 4 {PSEL,PENABLE} combinations and print PASS/FAIL for each.
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS PSEL=0 PENABLE=0", "PASS PSEL=1 PENABLE=0", "PASS PSEL=1 PENABLE=1"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — APB Slave FSM
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l3",
      title: "APB Slave FSM — IDLE → SETUP → ACCESS",
      theory: `
<h2>Sequencing With a State Machine</h2>
<p>The phase decoder (L2) is combinational — it tells you what the master is doing <em>right now</em>. A slave also needs <strong>state</strong>: what it was doing, what it should do next, and when to assert <code>PREADY</code>.</p>

<h3>The Canonical APB Slave FSM</h3>
<pre class="code-block">         ┌─────────── (!PSEL) ───────────┐
         ▼                                 │
   ┌──────────┐  (PSEL)   ┌────────┐ (PENABLE) ┌────────┐
   │   IDLE   ├──────────►│ SETUP  ├──────────►│ ACCESS │
   └──────────┘           └────────┘           └────┬───┘
         ▲                                          │
         └────────────── (PREADY & !PSEL) ──────────┘
                 (or → SETUP if PSEL stays high)</pre>

<h3>Rules</h3>
<ol>
  <li>Reset → IDLE.</li>
  <li>IDLE: if <code>PSEL</code> rises, go to SETUP.</li>
  <li>SETUP: unconditionally go to ACCESS on the next clock (master always asserts PENABLE one cycle after PSEL in APB3).</li>
  <li>ACCESS: wait for <code>PREADY=1</code>; then go to SETUP if <code>PSEL</code> still high (back-to-back transfers) or IDLE otherwise.</li>
</ol>

<h3>Your Task</h3>
<p>Write <code>apb_slave_fsm</code>. The module gets <code>PCLK</code>, <code>PRESETn</code>, <code>PSEL</code>, <code>PENABLE</code>, <code>PREADY</code> and outputs a 2-bit <code>state</code> (<code>2'd0</code>=IDLE, <code>2'd1</code>=SETUP, <code>2'd2</code>=ACCESS). Use <code>localparam</code> for the state encodings — never magic numbers.</p>

<h3>Testbench You Will Write</h3>
<p>Drive a full transaction sequence and print the state each cycle. Target these messages:</p>
<pre class="code-block">PASS IDLE after reset
PASS IDLE → SETUP on PSEL
PASS SETUP → ACCESS on PENABLE
PASS ACCESS → IDLE on PREADY (with PSEL low)</pre>
      `,
      tasks: [
        "Declare localparams for IDLE, SETUP, ACCESS",
        "Write a single always @(posedge PCLK) block with reset handling",
        "Implement the 4 transitions from the rules list",
        "In the testbench, drive PSEL → PENABLE → PREADY and print state each cycle",
        "Verify reset goes to IDLE, and all 3 forward transitions happen on the expected clock edge"
      ],
      hint: "case(state) inside the always block. Remember: in ACCESS, PSEL being high means another transfer is queued — go to SETUP, not IDLE. Use $display with a case or conditional to print 'IDLE'/'SETUP'/'ACCESS' instead of the number.",
      design: `// L3 — APB Slave FSM
// 3 states, tracked across clock edges.
module apb_slave_fsm (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PREADY,
  output reg  [1:0]  state
);

  // Define state encodings with localparam
  /* your localparams here */

  always @(posedge PCLK) begin
    /* your reset + case-based transitions here */
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg        PSEL=0, PENABLE=0, PREADY=0;
  wire [1:0] state;

  always #5 PCLK = ~PCLK;

  apb_slave_fsm dut (.PCLK(PCLK), .PRESETn(PRESETn),
                     .PSEL(PSEL), .PENABLE(PENABLE), .PREADY(PREADY),
                     .state(state));

  // Helper: map state[1:0] to a readable name in your $display.

  initial begin
    // 1. Hold reset for a few cycles, then confirm state==IDLE
    // 2. Assert PSEL → expect SETUP on next clock
    // 3. Assert PENABLE → expect ACCESS on next clock
    // 4. Assert PREADY and drop PSEL → expect IDLE on next clock
    // Print PASS/FAIL at each checkpoint.
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS IDLE after reset", "PASS IDLE → SETUP", "PASS SETUP → ACCESS", "PASS ACCESS → IDLE"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Register file (reusable storage block)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l4",
      title: "Register File — Reusable Storage Block",
      theory: `
<h2>Separation of Concerns</h2>
<p>The APB spec is a <em>protocol</em>. The storage behind it is a separate concern — it could be a register file, a FIFO, a RAM, a set of peripheral control bits. Good RTL keeps protocol glue and storage <strong>separate</strong> so each can be tested alone.</p>

<h3>What You Will Build</h3>
<p>A tiny register file, parameterised for reuse in later lessons:</p>
<ul>
  <li><code>N = 4</code> (number of registers, default)</li>
  <li><code>W = 32</code> (data width, default)</li>
  <li>Inputs: clock, active-low reset, write enable, write address (<code>$clog2(N)</code> bits), write data, read address</li>
  <li>Output: combinational <code>rdata</code> based on read address</li>
  <li>All registers cleared to <code>0</code> on reset</li>
</ul>

<h3>Why Parameterised?</h3>
<p>Later lessons will drop this same module into bigger designs. Parameters let you resize without rewriting.</p>

<h3>Address Decode for APB</h3>
<p>Your read/write address ports are the already-decoded register index (2 bits for N=4), not the raw <code>PADDR</code>. The APB glue will extract <code>PADDR[3:2]</code> and pass it in. Keep this block protocol-agnostic.</p>

<h3>Testbench You Will Write</h3>
<p>Write into each register with a unique value, read back, confirm. Then reset and confirm zeros. Target messages:</p>
<pre class="code-block">PASS write reg 0
PASS write reg 1
PASS write reg 2
PASS write reg 3
PASS reset clears all</pre>
      `,
      tasks: [
        "Declare the parameters N and W and use them for port widths",
        "Declare the register array `reg [W-1:0] mem [0:N-1];`",
        "Write always block: synchronous reset, then if (we) mem[waddr] <= wdata;",
        "Assign rdata = mem[raddr]; (combinational read)",
        "In the testbench, write 0xAAAA_0000+i to each index, read back each, check"
      ],
      hint: "Use a generate/for loop to clear the array on reset, or a simple integer loop inside the always block: `integer i; if (!rstn) for(i=0;i<N;i=i+1) mem[i]<=0;`. The read is one line: `assign rdata = mem[raddr];`.",
      design: `// L4 — Parameterised Register File
module regfile #(
  parameter N = 4,
  parameter W = 32
)(
  input  wire              clk,
  input  wire              rstn,
  input  wire              we,
  input  wire [$clog2(N)-1:0] waddr,
  input  wire [W-1:0]      wdata,
  input  wire [$clog2(N)-1:0] raddr,
  output wire [W-1:0]      rdata
);

  /* declare the memory array and write the clocked write logic + combinational read */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg         clk=0, rstn=0, we=0;
  reg  [1:0]  waddr=0, raddr=0;
  reg  [31:0] wdata=0;
  wire [31:0] rdata;

  always #5 clk = ~clk;

  regfile #(.N(4), .W(32)) dut (.clk(clk), .rstn(rstn),
    .we(we), .waddr(waddr), .wdata(wdata),
    .raddr(raddr), .rdata(rdata));

  initial begin
    // 1. Hold reset, release.
    // 2. Write 0xAAAA_0000, 0xBBBB_0001, 0xCCCC_0002, 0xDDDD_0003 to regs 0..3.
    // 3. For each, set raddr, wait, and check rdata == expected. Print PASS/FAIL.
    // 4. Assert reset again — confirm every read returns 0. Print 'PASS reset clears all'.
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS write reg 0", "PASS write reg 1", "PASS write reg 2", "PASS write reg 3", "PASS reset clears all"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L5 — APB Write Path (integrate FSM + regfile)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l5",
      title: "APB Write Path — First Functional Slave",
      theory: `
<h2>Integration — Your First Working Slave</h2>
<p>Now you have the pieces. This lesson is where they start working together. You will build an APB slave that handles <strong>writes only</strong>, using the concepts from the previous lessons (you may re-derive them here, or factor later — either is fine).</p>

<h3>Spec</h3>
<ul>
  <li>4 × 32-bit registers, mapped to addresses <code>0x00</code>, <code>0x04</code>, <code>0x08</code>, <code>0x0C</code>.</li>
  <li>Always ready → <code>PREADY = 1'b1</code>.</li>
  <li>Never errors → <code>PSLVERR = 1'b0</code>.</li>
  <li>PRDATA can be <code>0</code> for now — L6 adds the read path.</li>
  <li>A write happens on the clock edge at the end of the ACCESS phase: <code>PSEL &amp; PENABLE &amp; PWRITE &amp; PREADY</code>.</li>
  <li>Expose the 4 registers as outputs so the testbench can observe them.</li>
</ul>

<h3>Address Decode</h3>
<p>Because addresses are 32-bit word-aligned, <code>PADDR[1:0]</code> is always <code>2'b00</code>. Register index = <code>PADDR[3:2]</code>.</p>

<h3>Testbench You Will Write</h3>
<p>Write a task <code>apb_write(addr, data)</code> that drives a full two-phase transaction. Use it 4 times with unique values, then check each of the 4 exposed register outputs. Target messages:</p>
<pre class="code-block">PASS reg[0] = AAAA0000
PASS reg[1] = BBBB0001
PASS reg[2] = CCCC0002
PASS reg[3] = DDDD0003
PASS overwrite reg[0]</pre>
      `,
      tasks: [
        "Tie PREADY=1'b1 and PSLVERR=1'b0. Assign PRDATA = 32'h0.",
        "Build the write-enable: PSEL & PENABLE & PWRITE & PREADY",
        "On the posedge clock, under reset clear all 4 regs; else if write-enable, case on PADDR[3:2] and latch PWDATA",
        "In the testbench, write an apb_write(addr, data) task with two @(posedge PCLK) waits",
        "Call the task 4 times with unique values, then check the reg outputs match"
      ],
      hint: "In apb_write: cycle 1 drive PSEL=1 PENABLE=0 PWRITE=1 PADDR PWDATA; cycle 2 PENABLE=1; cycle 3 drop everything. Use #1 after posedge to apply stimulus cleanly. Expose reg0..reg3 as output reg [31:0] and assign them inside the always block.",
      design: `// L5 — APB Slave with Write Support
module apb_slave_wr (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output wire [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR,
  // observation ports for the testbench
  output reg  [31:0] reg0,
  output reg  [31:0] reg1,
  output reg  [31:0] reg2,
  output reg  [31:0] reg3
);

  /* tie PREADY / PSLVERR / PRDATA to safe defaults */
  /* build wr_en and the clocked case statement that writes the chosen register */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;
  wire [31:0] reg0, reg1, reg2, reg3;

  always #5 PCLK = ~PCLK;

  apb_slave_wr dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR),
    .reg0(reg0), .reg1(reg1), .reg2(reg2), .reg3(reg3)
  );

  // TODO: write an apb_write(addr, data) task.
  // TODO: release reset, perform 4 writes, check each reg output, then overwrite reg0 and re-check.
  /* your task + stimulus here */

  initial begin
    /* main test sequence, ending in $finish; */
  end

endmodule`,
      expected: ["PASS reg[0]", "PASS reg[1]", "PASS reg[2]", "PASS reg[3]", "PASS overwrite reg[0]"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L6 — APB Read Path
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l6",
      title: "APB Read Path — Combinational PRDATA",
      theory: `
<h2>Reads Are Combinational</h2>
<p>Unlike writes (clocked), PRDATA is <strong>combinational</strong> — selected by the current <code>PADDR</code> during the ACCESS phase. No flop. That means your read mux is an <code>always @(*)</code> block or a chain of assigns.</p>

<h3>Why Gate On rd_en?</h3>
<p>If multiple slaves share the PRDATA bus (common on a real SoC), each slave must drive 0 when it is not the target, so the system-level OR-combine works. Your gating condition is <code>rd_en = PSEL &amp; PENABLE &amp; !PWRITE</code>.</p>

<h3>Spec</h3>
<ul>
  <li>Extend your L5 slave with a read mux.</li>
  <li>When <code>rd_en=1</code>: output the register selected by <code>PADDR[3:2]</code>.</li>
  <li>When <code>rd_en=0</code>: output <code>32'h0</code>.</li>
</ul>

<h3>Testbench You Will Write</h3>
<p>Write an <code>apb_read(addr)</code> task that returns PRDATA sampled during ACCESS. Write distinct values into all 4 registers, then read each back. Target:</p>
<pre class="code-block">PASS read reg[0]
PASS read reg[1]
PASS read reg[2]
PASS read reg[3]
PASS PRDATA=0 on non-read</pre>
      `,
      tasks: [
        "Copy/paste (or reference) your L5 write path as the base",
        "Add an always @(*) block that muxes PRDATA from reg0..reg3 when rd_en=1, else 0",
        "Make PRDATA a 'output reg [31:0]' to drive it from the always block",
        "In the testbench, add apb_read(addr, out) — sample PRDATA during ACCESS phase",
        "Write 4 values, read them back, and verify PRDATA=0 during a write"
      ],
      hint: "apb_read: cycle 1 drive PSEL=1 PENABLE=0 PWRITE=0 PADDR. Cycle 2 PENABLE=1, then #2 sample PRDATA. Cycle 3 deassert. Case on PADDR[3:2] inside the always @(*) — default to 32'hDEAD_DEAD to catch bad addresses.",
      design: `// L6 — APB Slave with Write + Read
module apb_slave_rw (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);

  /* internal registers (same 4 as L5) + write logic */
  /* rd_en wire */
  /* combinational PRDATA mux */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_rw dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  // TODO: apb_write(addr, data) task
  // TODO: apb_read(addr, output rdata) task
  // TODO: write 4 distinct values, read each back, print PASS/FAIL
  // TODO: during a write, confirm PRDATA == 0

  initial begin
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS read reg[0]", "PASS read reg[1]", "PASS read reg[2]", "PASS read reg[3]", "PASS PRDATA=0"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L7 — Wait states with PREADY
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l7",
      title: "Wait States — Slow Slaves Using PREADY",
      theory: `
<h2>Not All Slaves Are Fast</h2>
<p>Real peripherals often need multiple cycles per transfer — a flash controller, an ADC, an SPI bridge. APB supports this cleanly: during the ACCESS phase, a slave drives <code>PREADY=0</code> to say "I'm not done yet; hold the bus." When the slave is finally ready, it drives <code>PREADY=1</code> for one cycle and the transfer completes.</p>

<h3>The Rule</h3>
<p><strong>PREADY may be low only during the ACCESS phase.</strong> It must be high (or unused) during SETUP and IDLE.</p>

<h3>Spec</h3>
<ul>
  <li>Extend your L6 slave so every transfer takes <strong>exactly N extra wait cycles</strong> before completing (parameterise as <code>WAIT = 2</code>).</li>
  <li>Use a small counter: when entering ACCESS, load counter = WAIT. Each cycle in ACCESS, decrement. PREADY = (counter == 0).</li>
  <li>The rest of the slave behaviour (write, read) is unchanged.</li>
</ul>

<h3>Testbench You Will Write</h3>
<p>Your master tasks must now <strong>poll PREADY</strong> instead of assuming one-cycle transfers: while in ACCESS with PREADY=0, wait another clock; when PREADY=1, sample data and close the transaction.</p>
<p>Target messages:</p>
<pre class="code-block">PASS slow write completed in 3 cycles
PASS slow read returned correct data
PASS master correctly waited on PREADY</pre>
      `,
      tasks: [
        "Add a WAIT parameter (default 2) and a small counter register",
        "In the FSM/logic: when transition into ACCESS, load counter = WAIT",
        "Decrement counter while in ACCESS; PREADY = (counter == 0)",
        "In the testbench, change apb_write/apb_read to loop on !PREADY after PENABLE",
        "Count how many cycles the transfer took; confirm it matches WAIT+1"
      ],
      hint: "A simple trick: PREADY = (counter == 0); `always @(posedge PCLK) if (access_phase && counter != 0) counter <= counter - 1; else if (setup_phase) counter <= WAIT;`. In the TB: `@(posedge PCLK); while (!PREADY) @(posedge PCLK);` inside the access phase.",
      design: `// L7 — APB Slave with Wait States
module apb_slave_wait #(
  parameter WAIT = 2
)(
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);

  /* internal regs, wait counter, PREADY logic, and the write/read paths */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_wait #(.WAIT(2)) dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  // TODO: apb_write / apb_read tasks that poll PREADY.
  // TODO: count cycles per transfer and confirm it equals WAIT+1 ACCESS cycles.
  // TODO: do one write and one read, print PASS messages.

  initial begin
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS slow write", "PASS slow read", "PASS master correctly waited"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L8 — PSLVERR: signaling bad transactions
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l8",
      title: "PSLVERR — Signaling Bad Transactions",
      theory: `
<h2>Error Reporting</h2>
<p><code>PSLVERR</code> is how a slave tells the master "your transaction failed." It is sampled by the master on the same cycle <code>PREADY</code> is high. After that cycle, PSLVERR is don't-care.</p>

<h3>What Errors Look Like</h3>
<ul>
  <li>Out-of-range address</li>
  <li>Write to a read-only register</li>
  <li>Read from a write-only register</li>
  <li>Bus-level parity/security failure</li>
</ul>

<h3>Spec</h3>
<ul>
  <li>Keep your L6/L7 slave's register map: addresses <code>0x00</code>–<code>0x0C</code> are valid.</li>
  <li>Any other address → drive <code>PSLVERR=1</code> at the same time as <code>PREADY=1</code>.</li>
  <li>On an errored write, do <strong>not</strong> modify any register.</li>
  <li>On an errored read, drive PRDATA = <code>32'hDEAD_DEAD</code>.</li>
</ul>

<h3>Testbench You Will Write</h3>
<p>Exercise three scenarios:</p>
<ol>
  <li>Valid write then valid read — expect PSLVERR=0.</li>
  <li>Write to <code>0x20</code> (bad addr) — expect PSLVERR=1 and registers unchanged.</li>
  <li>Read from <code>0x24</code> (bad addr) — expect PSLVERR=1 and PRDATA=<code>DEAD_DEAD</code>.</li>
</ol>
<pre class="code-block">PASS valid txn, no error
PASS bad write flagged PSLVERR
PASS bad write did not modify regs
PASS bad read returned DEAD_DEAD</pre>
      `,
      tasks: [
        "Decode address validity: valid = (PADDR[31:4] == 0) — since our regs live in 0x00..0x0C",
        "PSLVERR = access_phase & !valid",
        "Gate the write: only latch PWDATA when access_phase & PWRITE & valid",
        "In read mux: PRDATA = valid ? selected_reg : 32'hDEAD_DEAD",
        "TB: check PSLVERR on each transaction end"
      ],
      hint: "A valid address has PADDR[31:4]==0 and PADDR[1:0]==0 for word alignment. Flag misalignment as an error too for extra credit. Sample PSLVERR on the same cycle you sample PREADY=1.",
      design: `// L8 — APB Slave with PSLVERR
module apb_slave_err (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);

  /* valid_addr decode, gated write, error-aware read mux, PSLVERR logic */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_err dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  // TODO: tasks that return captured PSLVERR alongside data.
  // TODO: run valid txn, bad-addr write, bad-addr read.

  initial begin
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS valid txn", "PASS bad write flagged", "PASS bad read returned DEAD_DEAD"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L9 — APB Master
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l9",
      title: "APB Master — Drive the Bus Yourself",
      theory: `
<h2>Switching Sides</h2>
<p>So far your testbench has been playing the part of the master. Now you will write a <strong>synthesisable master</strong> — a module that, given a simple command interface, generates the correct APB signal sequence.</p>

<h3>Command Interface (Simple)</h3>
<ul>
  <li><code>cmd_valid</code> — pulse high for one cycle to start a transaction</li>
  <li><code>cmd_write</code> — 1 for write, 0 for read</li>
  <li><code>cmd_addr</code> (32-bit)</li>
  <li><code>cmd_wdata</code> (32-bit)</li>
  <li><code>cmd_ready</code> — master asserts when idle and can accept a new command</li>
  <li><code>rsp_valid</code> — pulse high when the transaction completes</li>
  <li><code>rsp_rdata</code>, <code>rsp_err</code> — captured on the completion cycle</li>
</ul>

<h3>Master FSM</h3>
<pre class="code-block">IDLE ──(cmd_valid)──► SETUP ──(next clk)──► ACCESS ──(PREADY)──► IDLE
                                                     └─ latch rsp_rdata / rsp_err</pre>

<h3>Spec</h3>
<ul>
  <li>In IDLE: drive PSEL=0, PENABLE=0, cmd_ready=1.</li>
  <li>In SETUP: PSEL=1, PENABLE=0, PADDR=captured_addr, PWRITE=captured_write, PWDATA=captured_wdata, cmd_ready=0.</li>
  <li>In ACCESS: PSEL=1, PENABLE=1, signals held. On PREADY, capture PRDATA/PSLVERR, pulse rsp_valid, return to IDLE.</li>
</ul>

<h3>Testbench You Will Write</h3>
<p>Connect your L8 slave to this master and push commands into the master's command port. Verify the responses match. Target:</p>
<pre class="code-block">PASS master wrote reg[1]
PASS master read back reg[1]
PASS master saw PSLVERR on bad addr</pre>
      `,
      tasks: [
        "Define a 2-state FSM (IDLE, SETUP, ACCESS) with localparams",
        "Latch cmd_* into internal regs when cmd_valid & cmd_ready fire",
        "Drive APB signals combinationally from state + latched commands",
        "On PREADY in ACCESS: capture PRDATA, PSLVERR; pulse rsp_valid; return to IDLE",
        "In the testbench, instantiate master + slave together and run 3 transactions"
      ],
      hint: "Keep the master simple — output the APB signals from an always @(*) case on state. The latched command regs only update on (cmd_valid && cmd_ready && state==IDLE). rsp_valid is a one-cycle pulse in the ACCESS→IDLE transition.",
      design: `// L9 — APB Master
module apb_master (
  input  wire        PCLK,
  input  wire        PRESETn,
  // command interface
  input  wire        cmd_valid,
  input  wire        cmd_write,
  input  wire [31:0] cmd_addr,
  input  wire [31:0] cmd_wdata,
  output wire        cmd_ready,
  // response interface
  output reg         rsp_valid,
  output reg  [31:0] rsp_rdata,
  output reg         rsp_err,
  // APB bus outputs
  output reg  [31:0] PADDR,
  output reg         PSEL,
  output reg         PENABLE,
  output reg         PWRITE,
  output reg  [31:0] PWDATA,
  input  wire [31:0] PRDATA,
  input  wire        PREADY,
  input  wire        PSLVERR
);

  /* FSM + latched cmd regs + combinational APB drivers + response logic */

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg        cmd_valid=0, cmd_write=0;
  reg [31:0] cmd_addr=0, cmd_wdata=0;
  wire       cmd_ready, rsp_valid, rsp_err;
  wire [31:0] rsp_rdata;
  wire [31:0] PADDR, PWDATA, PRDATA;
  wire       PSEL, PENABLE, PWRITE, PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_master m (.*);

  // Use your L8 slave here — wire master's APB outputs to slave's APB inputs.
  apb_slave_err s (.PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR));

  // TODO: write a 'send' task that pushes a command and waits for rsp_valid.
  // TODO: run: write 0x04=AA, read 0x04, write to bad addr 0x20 → expect rsp_err.

  initial begin
    /* your stimulus here */
    $finish;
  end

endmodule`,
      expected: ["PASS master wrote", "PASS master read back", "PASS master saw PSLVERR"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L10 — End-to-end system: master + arbiter-free 2-slave system
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m13l10",
      title: "End-to-End System — Master + Address Decoder + 2 Slaves",
      theory: `
<h2>Putting It All Together</h2>
<p>A real APB subsystem has one master and <strong>many slaves</strong> selected by an <em>address decoder</em>. The decoder drives one <code>PSEL_i</code> per slave based on the top bits of PADDR, and a read-data mux selects the right <code>PRDATA_i</code> back to the master.</p>

<h3>System Diagram</h3>
<pre class="code-block">            ┌─ PSEL0 ─► ┌─────────┐
Master ───► │           │ Slave 0 │  (addr 0x0000_0000–0x0000_FFFF)
            │           └─────────┘
 Addr   ──► │ Decoder                ┌── PRDATA mux ──► Master
            │           ┌─────────┐
            └─ PSEL1 ─► │ Slave 1 │  (addr 0x0001_0000–0x0001_FFFF)
                        └─────────┘</pre>

<h3>Spec</h3>
<ul>
  <li>2 slaves (use two instances of your L8 slave — different base addresses).</li>
  <li>Address decode: <code>PADDR[16]==0</code> → slave 0, <code>PADDR[16]==1</code> → slave 1.</li>
  <li>PSEL to the unselected slave is 0 (so its PRDATA output is 0).</li>
  <li>System PRDATA = PRDATA0 | PRDATA1 (OR-combine — works because inactive slaves drive 0).</li>
  <li>System PSLVERR = PSLVERR0 | PSLVERR1.</li>
  <li>PREADY = (sel0 ? PREADY0 : PREADY1).</li>
</ul>

<h3>Testbench You Will Write</h3>
<p>Drive your L9 master through the decoder and both slaves. Write to each slave, read back, confirm isolation (writing to slave 0 should not affect slave 1).</p>
<pre class="code-block">PASS slave 0 write+read
PASS slave 1 write+read
PASS slaves isolated
PASS system reached end-to-end</pre>
      `,
      tasks: [
        "Write a tiny apb_decoder module: inputs PADDR/PSEL, outputs PSEL0/PSEL1",
        "Instantiate: 1 master, 1 decoder, 2 slaves, 1 PRDATA OR-gate, 1 PREADY mux",
        "Run commands through the master pushing to both slaves",
        "Verify that writing to slave 0 reg does not change slave 1 reg",
        "Print the 4 target PASS messages"
      ],
      hint: "Keep the decoder tiny: `assign PSEL0 = PSEL & ~PADDR[16]; assign PSEL1 = PSEL & PADDR[16];`. OR-combine is safe because slaves must drive PRDATA=0 and PREADY/PSLVERR=0 when their PSEL is low — verify your L8 slave actually does this before wiring it up!",
      design: `// L10 — APB Address Decoder (tiny)
module apb_decoder (
  input  wire        PSEL_in,
  input  wire [31:0] PADDR,
  output wire        PSEL0,
  output wire        PSEL1
);

  /* PSEL fan-out by PADDR[16] */

endmodule

// Top-level system that you will wire up in the TB (or here, if you prefer).
// If you define a wrapper module here, the testbench just instantiates one block.
// Otherwise do all the wiring directly in the testbench below.`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg PCLK=0, PRESETn=0;
  always #5 PCLK = ~PCLK;

  // Master command interface signals
  reg        cmd_valid=0, cmd_write=0;
  reg [31:0] cmd_addr=0, cmd_wdata=0;
  wire       cmd_ready, rsp_valid, rsp_err;
  wire [31:0] rsp_rdata;

  // APB bus signals (master drives)
  wire [31:0] PADDR, PWDATA;
  wire        PSEL, PENABLE, PWRITE;

  // Per-slave select + response signals
  wire PSEL0, PSEL1;
  wire [31:0] PRDATA0, PRDATA1, PRDATA;
  wire PREADY0, PREADY1, PREADY;
  wire PSLVERR0, PSLVERR1, PSLVERR;

  // TODO: instantiate apb_master, apb_decoder, two apb_slave_err
  // TODO: OR-combine PRDATA and PSLVERR, mux PREADY by PSEL0

  // TODO: send task (push cmd, wait for rsp_valid)
  // TODO: write slave0, write slave1, read both back, cross-verify isolation

  initial begin
    /* stimulus + PASS prints */
    $finish;
  end

endmodule`,
      expected: ["PASS slave 0", "PASS slave 1", "PASS slaves isolated", "PASS system reached end-to-end"]
    }

  ]
});
