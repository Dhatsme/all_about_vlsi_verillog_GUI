// m16.js — SystemVerilog Essentials (Verilator, no UVM)
// Bridge module: SV syntax and constructs before moving to UVM.
// Simulator: verilator  |  UVM: off  |  Extra flags: --timing
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'm16',
  title: 'SystemVerilog Essentials',
  icon: '⚡',
  level: 'advanced',
  lessons: [

    // ─── L1 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l1',
      title: 'L1 — logic, always_ff & always_comb',
      theory: `
        <h2>SystemVerilog Data Types and Procedural Blocks</h2>
        <p>Verilog's split between <code>reg</code> (driven procedurally) and
        <code>wire</code> (driven continuously) is a common source of confusion.
        SystemVerilog replaces both with a single type: <code>logic</code>.</p>

        <h3>Key changes from Verilog</h3>
        <table>
          <tr><th>Verilog</th><th>SystemVerilog</th><th>Why</th></tr>
          <tr><td><code>reg / wire</code></td><td><code>logic</code></td><td>One type, fewer mistakes</td></tr>
          <tr><td><code>always @(posedge clk)</code></td><td><code>always_ff @(posedge clk)</code></td><td>Explicitly sequential; tools warn if latches form</td></tr>
          <tr><td><code>always @(*)</code></td><td><code>always_comb</code></td><td>Auto-sensitivity; no missing-sensitivity bugs</td></tr>
        </table>

        <h3>How to run</h3>
        <ol>
          <li>Set simulator to <strong>verilator</strong>.</li>
          <li>In <strong>⚙ Options</strong> add extra flag <code>--timing</code>.</li>
          <li>Click <strong>▶ Run</strong> — you should see three PASS lines.</li>
        </ol>
      `,
      tasks: [
        'Set simulator to verilator, add --timing in ⚙ Options',
        'Click ▶ Run and see 3 PASS lines',
        'Change the counter width from 4 to 8 bits and run again',
      ],
      hint: 'logic can be driven by always_ff OR assign — you do not need separate reg/wire declarations.',

      design: `// SV design — 4-bit up-counter using logic + always_ff
module counter #(parameter W = 4)(
  input  logic             clk,
  input  logic             rst_n,
  output logic [W-1:0]     count
);
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) count <= '0;          // '0 fills all bits with 0
    else        count <= count + 1'b1;
  end
endmodule`,

      testbench: `\`timescale 1ns/1ps
module tb;
  logic       clk  = 0;
  logic       rst_n = 0;
  logic [3:0] count;

  always #5 clk = ~clk;   // 100 MHz

  counter #(.W(4)) dut (.clk(clk), .rst_n(rst_n), .count(count));

  // always_comb in testbench — reacts instantly when count changes
  logic [3:0] expected;
  always_comb expected = count;   // just mirrors for this demo

  initial begin
    $display("=== L1: logic / always_ff / always_comb ===");

    // hold in reset for 3 clocks
    repeat(3) @(posedge clk);
    if (count === 4'b0000)
      $display("PASS reset holds count at 0");
    else
      $display("FAIL count=%0d during reset", count);

    // release reset — counter should start counting
    rst_n = 1;
    repeat(4) @(posedge clk);
    #1;
    if (count === 4'd4)
      $display("PASS counted to 4 after reset");
    else
      $display("FAIL count=%0d (expected 4)", count);

    // check wrap-around at 15 → 0
    repeat(12) @(posedge clk);
    #1;
    if (count === 4'd0)
      $display("PASS counter wrapped at 16");
    else
      $display("FAIL count=%0d (expected 0 after wrap)", count);

    $finish;
  end
endmodule`,
      expected: ['PASS reset holds', 'PASS counted to 4', 'PASS counter wrapped'],
    },

    // ─── L2 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l2',
      title: 'L2 — enum & typedef for FSMs',
      theory: `
        <h2>Named States with enum</h2>
        <p>In plain Verilog, FSM states are just <code>localparam</code> integers — easy to mis-spell
        and impossible for tools to check exhaustively. SystemVerilog's
        <code>typedef enum</code> gives states real names and lets simulators warn on unhandled cases.</p>

        <pre><code>typedef enum logic [1:0] {
  IDLE   = 2'b00,
  SETUP  = 2'b01,
  ACCESS = 2'b10
} state_t;</code></pre>

        <p>You can then declare <code>state_t state, next;</code> instead of <code>reg [1:0]</code>.
        The simulator prints the state <em>name</em> (IDLE / SETUP …) in waveform viewers.</p>

        <h3>How to run</h3>
        <ol>
          <li>Simulator → <strong>verilator</strong>, add <code>--timing</code>.</li>
          <li>Run — expect 4 PASS lines for each FSM transition.</li>
        </ol>
      `,
      tasks: [
        'Run and confirm all 4 PASS lines appear',
        'Add a fourth state WAIT to the enum and wire it up as a one-cycle stall between SETUP and ACCESS',
        'Verify the new state appears in PASS output',
      ],
      hint: 'In Verilator, display an enum variable with %s by casting: $display("%s", state.name()) — or just use %0d for the integer value.',

      design: `// 3-state APB-like FSM using enum typedef
typedef enum logic [1:0] {
  IDLE   = 2'd0,
  SETUP  = 2'd1,
  ACCESS = 2'd2
} state_t;

module fsm_enum (
  input  logic  clk,
  input  logic  rst_n,
  input  logic  start,
  input  logic  done,
  output state_t state
);
  state_t next;

  // registered state
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) state <= IDLE;
    else        state <= next;
  end

  // combinational next-state logic
  always_comb begin
    unique case (state)
      IDLE:   next = start ? SETUP  : IDLE;
      SETUP:  next = ACCESS;
      ACCESS: next = done  ? IDLE   : ACCESS;
      default: next = IDLE;
    endcase
  end
endmodule`,

      testbench: `\`timescale 1ns/1ps
// Forward-declare the enum so tb can use it
typedef enum logic [1:0] { IDLE=2'd0, SETUP=2'd1, ACCESS=2'd2 } state_t;

module tb;
  logic   clk   = 0;
  logic   rst_n = 0;
  logic   start = 0;
  logic   done  = 0;
  state_t state;

  always #5 clk = ~clk;

  fsm_enum dut (.clk(clk), .rst_n(rst_n), .start(start), .done(done), .state(state));

  initial begin
    $display("=== L2: enum typedef FSM ===");

    repeat(2) @(posedge clk);
    rst_n = 1; #1;
    if (state === IDLE) $display("PASS state==IDLE after reset");
    else                $display("FAIL state=%0d", state);

    @(posedge clk); start = 1; @(posedge clk); #1; start = 0;
    if (state === SETUP) $display("PASS IDLE -> SETUP on start");
    else                 $display("FAIL state=%0d (expected SETUP)", state);

    @(posedge clk); #1;
    if (state === ACCESS) $display("PASS SETUP -> ACCESS");
    else                  $display("FAIL state=%0d (expected ACCESS)", state);

    // stay in ACCESS while done=0
    repeat(2) @(posedge clk); #1;
    if (state === ACCESS) $display("PASS ACCESS holds while done=0");
    else                  $display("FAIL left ACCESS prematurely state=%0d", state);

    done = 1; @(posedge clk); #1; done = 0;
    if (state === IDLE) $display("PASS ACCESS -> IDLE on done");
    else                $display("FAIL state=%0d (expected IDLE)", state);

    $finish;
  end
endmodule`,
      expected: ['PASS state==IDLE', 'PASS IDLE -> SETUP', 'PASS SETUP -> ACCESS', 'PASS ACCESS holds', 'PASS ACCESS -> IDLE'],
    },

    // ─── L3 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l3',
      title: 'L3 — packed structs',
      theory: `
        <h2>struct packed — bundling signals into a type</h2>
        <p>A <code>struct packed</code> groups related bits into a single named type. Unlike
        a normal struct, every field is contiguous in memory — the whole struct can be cast
        to a plain <code>logic [N-1:0]</code> vector and back.</p>

        <pre><code>typedef struct packed {
  logic [31:0] addr;
  logic [31:0] data;
  logic        write;
  logic  [3:0] strobe;
} bus_pkt_t;</code></pre>

        <p>Structs make port lists shorter, improve readability, and match how UVM sequences
        pass transaction objects between components.</p>

        <h3>How to run</h3>
        <ol>
          <li>Simulator → <strong>verilator</strong>, add <code>--timing</code>.</li>
          <li>Run — confirm PASS for write and read transactions.</li>
        </ol>
      `,
      tasks: [
        'Run and confirm PASS for write + read',
        'Add a 2-bit size field to bus_pkt_t and update the testbench to set size=2 on writes',
        'Display size in $display and confirm it round-trips correctly',
      ],
      hint: 'With Verilator you can assign an entire struct: pkt = \'{ addr: 32\'h4, data: 32\'hAB, write: 1\'b1, strobe: 4\'hF };',

      design: `typedef struct packed {
  logic [31:0] addr;
  logic [31:0] data;
  logic        write;
  logic  [3:0] strobe;
} bus_pkt_t;

// A tiny transaction FIFO (depth 1) using the struct as port type
module pkt_reg (
  input  logic     clk,
  input  logic     rst_n,
  input  bus_pkt_t in_pkt,
  input  logic     in_valid,
  output bus_pkt_t out_pkt,
  output logic     out_valid
);
  bus_pkt_t stored;
  logic     valid_r;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      valid_r <= 1'b0;
      stored  <= '0;
    end else if (in_valid) begin
      stored  <= in_pkt;
      valid_r <= 1'b1;
    end
  end

  assign out_pkt   = stored;
  assign out_valid = valid_r;
endmodule`,

      testbench: `\`timescale 1ns/1ps
typedef struct packed {
  logic [31:0] addr;
  logic [31:0] data;
  logic        write;
  logic  [3:0] strobe;
} bus_pkt_t;

module tb;
  logic     clk   = 0;
  logic     rst_n = 0;
  bus_pkt_t in_pkt;
  logic     in_valid = 0;
  bus_pkt_t out_pkt;
  logic     out_valid;

  always #5 clk = ~clk;

  pkt_reg dut (.*);

  initial begin
    $display("=== L3: packed struct ===");
    in_pkt = '0;

    repeat(2) @(posedge clk); rst_n = 1;

    // Send a write transaction
    @(posedge clk); #1;
    in_pkt  = '{ addr: 32'h0000_0010, data: 32'hDEAD_BEEF,
                 write: 1'b1, strobe: 4'hF };
    in_valid = 1;
    @(posedge clk); #1;
    in_valid = 0;

    if (out_valid && out_pkt.addr === 32'h0000_0010 &&
        out_pkt.data === 32'hDEAD_BEEF && out_pkt.write === 1'b1)
      $display("PASS write pkt stored: addr=%08h data=%08h wr=%b",
               out_pkt.addr, out_pkt.data, out_pkt.write);
    else
      $display("FAIL write pkt: valid=%b addr=%08h data=%08h",
               out_valid, out_pkt.addr, out_pkt.data);

    // Send a read transaction (write=0)
    @(posedge clk); #1;
    in_pkt  = '{ addr: 32'h0000_0020, data: 32'h0,
                 write: 1'b0, strobe: 4'h0 };
    in_valid = 1;
    @(posedge clk); #1;
    in_valid = 0;

    if (out_valid && out_pkt.addr === 32'h0000_0020 && out_pkt.write === 1'b0)
      $display("PASS read pkt stored:  addr=%08h wr=%b",
               out_pkt.addr, out_pkt.write);
    else
      $display("FAIL read pkt: addr=%08h wr=%b", out_pkt.addr, out_pkt.write);

    $finish;
  end
endmodule`,
      expected: ['PASS write pkt stored', 'PASS read pkt stored'],
    },

    // ─── L4 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l4',
      title: 'L4 — interfaces & modports',
      theory: `
        <h2>SystemVerilog Interfaces</h2>
        <p>An <strong>interface</strong> bundles a group of wires into a reusable connection
        type. Instead of repeating a 10-signal APB port list on every module, you define
        the interface once and pass a single handle.</p>

        <pre><code>interface apb_if (input logic clk);
  logic [31:0] paddr;
  logic        psel, penable, pwrite;
  logic [31:0] pwdata, prdata;
  logic        pready;

  modport master (output paddr, psel, penable, pwrite, pwdata,
                  input  prdata, pready);
  modport slave  (input  paddr, psel, penable, pwrite, pwdata,
                  output prdata, pready);
endinterface</code></pre>

        <p><code>modport</code> names a sub-view with explicit directions — each module sees
        only what it should drive or read.</p>

        <h3>How to run</h3>
        <ol>
          <li>Simulator → <strong>verilator</strong>, add <code>--timing</code>.</li>
          <li>Run — expect PASS for a write and a read through the interface.</li>
        </ol>
      `,
      tasks: [
        'Run and confirm PASS for write + read through the interface',
        'Add a pslverr signal to the interface and have the slave assert it when paddr > 32\'h0C',
        'Check pslverr in the testbench and print PASS when it fires',
      ],
      hint: 'In Verilator, interface ports are declared as: module slave(apb_if.slave bus); — use the modport name after the dot.',

      design: `// ── Interface definition ─────────────────────────────────────────────────
interface apb_if (input logic clk);
  logic [31:0] paddr;
  logic        psel;
  logic        penable;
  logic        pwrite;
  logic [31:0] pwdata;
  logic [31:0] prdata;
  logic        pready;

  modport master_mp (
    output paddr, psel, penable, pwrite, pwdata,
    input  prdata, pready
  );
  modport slave_mp (
    input  paddr, psel, penable, pwrite, pwdata,
    output prdata, pready
  );
endinterface

// ── Simple APB slave — 4 × 32-bit registers ──────────────────────────────
module apb_slave (apb_if.slave_mp bus, input logic rst_n);
  logic [31:0] regs [0:3];

  assign bus.pready = 1'b1;

  always_ff @(posedge bus.clk or negedge rst_n) begin
    if (!rst_n) foreach (regs[i]) regs[i] <= '0;
    else if (bus.psel && bus.penable && bus.pwrite)
      regs[bus.paddr[3:2]] <= bus.pwdata;
  end

  always_comb begin
    if (bus.psel && bus.penable && !bus.pwrite)
      bus.prdata = regs[bus.paddr[3:2]];
    else
      bus.prdata = '0;
  end
endmodule`,

      testbench: `\`timescale 1ns/1ps
module tb;
  logic clk   = 0;
  logic rst_n = 0;

  always #5 clk = ~clk;

  apb_if bus (.clk(clk));
  apb_slave dut (.bus(bus.slave_mp), .rst_n(rst_n));

  // Drive the master side
  initial begin
    bus.psel    = 0; bus.penable = 0;
    bus.pwrite  = 0; bus.paddr   = '0; bus.pwdata  = '0;
  end

  task apb_write(input logic [31:0] addr, data);
    @(posedge clk); #1;
    bus.paddr = addr; bus.pwdata = data;
    bus.pwrite = 1;  bus.psel   = 1; bus.penable = 0;
    @(posedge clk); #1;
    bus.penable = 1;
    @(posedge clk); #1;
    bus.psel = 0; bus.penable = 0; bus.pwrite = 0;
  endtask

  task apb_read(input logic [31:0] addr, output logic [31:0] rdata);
    @(posedge clk); #1;
    bus.paddr = addr; bus.pwrite = 0; bus.psel = 1; bus.penable = 0;
    @(posedge clk); #1;
    bus.penable = 1; #2;
    rdata = bus.prdata;
    @(posedge clk); #1;
    bus.psel = 0; bus.penable = 0;
  endtask

  logic [31:0] rd;

  initial begin
    $display("=== L4: interfaces & modports ===");
    repeat(2) @(posedge clk); rst_n = 1;

    apb_write(32'h00, 32'hCAFE_0001);
    apb_write(32'h04, 32'hBEEF_0002);

    apb_read(32'h00, rd);
    if (rd === 32'hCAFE_0001) $display("PASS reg[0] = %08h", rd);
    else                      $display("FAIL reg[0] = %08h", rd);

    apb_read(32'h04, rd);
    if (rd === 32'hBEEF_0002) $display("PASS reg[1] = %08h", rd);
    else                      $display("FAIL reg[1] = %08h", rd);

    // Overwrite and re-read
    apb_write(32'h00, 32'h1234_ABCD);
    apb_read (32'h00, rd);
    if (rd === 32'h1234_ABCD) $display("PASS overwrite reg[0] = %08h", rd);
    else                      $display("FAIL overwrite = %08h", rd);

    $finish;
  end
endmodule`,
      expected: ['PASS reg[0]', 'PASS reg[1]', 'PASS overwrite reg[0]'],
    },

    // ─── L5 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l5',
      title: 'L5 — SystemVerilog classes (OOP preview)',
      theory: `
        <h2>Classes — Objects in SystemVerilog</h2>
        <p>A <strong>class</strong> is a blueprint for objects: it bundles data (member variables)
        and behaviour (methods). This is the foundation that UVM builds on — every UVM component,
        sequence, and transaction is a class.</p>

        <h3>Key concepts</h3>
        <ul>
          <li><code>class Foo; ... endclass</code> — declares a class.</li>
          <li><code>Foo obj = new();</code> — allocates an instance on the heap.</li>
          <li><code>function / task</code> — methods inside the class.</li>
          <li><code>extends</code> — inheritance; child class reuses parent's members.</li>
          <li><code>virtual</code> — marks a method as overridable (polymorphism).</li>
        </ul>

        <p>In simulation, classes live in the <em>program / module / initial</em> context — they
        are not synthesisable hardware. UVM uses them exclusively for testbench logic.</p>

        <h3>How to run</h3>
        <ol>
          <li>Simulator → <strong>verilator</strong>, add <code>--timing</code>.</li>
          <li>Run — no hardware DUT here; it is all class-based testbench logic.</li>
        </ol>
      `,
      tasks: [
        'Run and confirm PASS for base class and child class',
        'Add a third child class ReadTransaction with write=0 and a display method',
        'Instantiate it and call display() — confirm PASS',
      ],
      hint: 'Verilator supports SV classes in testbench (non-synthesisable) code. The DUT here is a stub — all logic is in the classes.',

      design: `// Stub DUT — all action is in the testbench classes
module dut_stub;
endmodule`,

      testbench: `\`timescale 1ns/1ps
// ── Base transaction class ────────────────────────────────────────────────
class Transaction;
  logic [31:0] addr;
  logic [31:0] data;
  logic        write;

  function new(logic [31:0] a = 0, logic [31:0] d = 0, logic w = 0);
    addr  = a;
    data  = d;
    write = w;
  endfunction

  virtual function string description();
    return $sformatf("Transaction addr=%08h data=%08h write=%0b",
                     addr, data, write);
  endfunction
endclass

// ── Child class — adds a byte-enable field ────────────────────────────────
class BurstTransaction extends Transaction;
  int unsigned length;

  function new(logic [31:0] a, logic [31:0] d, logic w, int unsigned len);
    super.new(a, d, w);
    length = len;
  endfunction

  virtual function string description();
    return $sformatf("BurstTransaction addr=%08h data=%08h write=%0b len=%0d",
                     addr, data, write, length);
  endfunction
endclass

// ── Testbench ─────────────────────────────────────────────────────────────
module tb;
  initial begin
    Transaction      base_txn;
    BurstTransaction burst_txn;
    Transaction      poly_ref;   // polymorphic handle

    $display("=== L5: SystemVerilog classes ===");

    // Base class
    base_txn = new(32'hAABB_0000, 32'h1234_5678, 1'b1);
    if (base_txn.addr === 32'hAABB_0000 && base_txn.write === 1'b1)
      $display("PASS base class: %s", base_txn.description());
    else
      $display("FAIL base class addr=%08h", base_txn.addr);

    // Child class — inherits addr/data/write, adds length
    burst_txn = new(32'hCCDD_0004, 32'hDEAD_BEEF, 1'b1, 8);
    if (burst_txn.length === 8 && burst_txn.addr === 32'hCCDD_0004)
      $display("PASS child class: %s", burst_txn.description());
    else
      $display("FAIL child class addr=%08h len=%0d",
               burst_txn.addr, burst_txn.length);

    // Polymorphism — base handle points to child object
    poly_ref = burst_txn;
    if (poly_ref.addr === 32'hCCDD_0004)
      $display("PASS polymorphic handle: %s", poly_ref.description());
    else
      $display("FAIL polymorphic handle addr=%08h", poly_ref.addr);

    $finish;
  end
endmodule`,
      expected: ['PASS base class', 'PASS child class', 'PASS polymorphic handle'],
    },

    // ─── L6 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l6',
      title: 'L6 — Putting it together: SV testbench + DUT',
      theory: `
        <h2>Combining SV Features in a Real Testbench</h2>
        <p>This final lesson wires together everything from L1–L5:</p>
        <ul>
          <li><strong>DUT</strong>: the APB slave from L4, written with <code>logic</code>,
              <code>always_ff</code>, <code>always_comb</code>.</li>
          <li><strong>Interface</strong>: <code>apb_if</code> with modports connects master and slave.</li>
          <li><strong>Transaction class</strong>: a simple <code>ApbTxn</code> object holds each transfer.</li>
          <li><strong>Driver</strong>: a class method drives the interface from the transaction.</li>
          <li><strong>Scoreboard</strong>: compares expected vs actual and prints PASS/FAIL.</li>
        </ul>
        <p>This pattern — transaction → driver → DUT → scoreboard — is exactly what UVM
        formalises with its agent/sequencer/driver/monitor hierarchy.</p>

        <h3>How to run</h3>
        <ol>
          <li>Simulator → <strong>verilator</strong>, add <code>--timing</code>.</li>
          <li>Run — expect PASS for each write/read pair.</li>
        </ol>
      `,
      tasks: [
        'Run and confirm all PASS lines appear',
        'Add a reset_sequence() method to the driver that toggles rst_n low for 5 clocks and then releases',
        'Call it at the start of the initial block and verify the scoreboard still PASSes',
      ],
      hint: 'This is the same structure UVM uses — m15 (UVM lesson) replaces the hand-rolled driver/scoreboard with uvm_driver and uvm_scoreboard base classes.',

      design: `// ── Interface ─────────────────────────────────────────────────────────────
interface apb_if (input logic clk);
  logic [31:0] paddr;
  logic        psel, penable, pwrite;
  logic [31:0] pwdata, prdata;
  logic        pready;

  modport master_mp (
    output paddr, psel, penable, pwrite, pwdata,
    input  prdata, pready
  );
  modport slave_mp (
    input  paddr, psel, penable, pwrite, pwdata,
    output prdata, pready
  );
endinterface

// ── DUT: 4-register APB slave ─────────────────────────────────────────────
module apb_slave (apb_if.slave_mp bus, input logic rst_n);
  logic [31:0] regs [0:3];

  assign bus.pready = 1'b1;

  always_ff @(posedge bus.clk or negedge rst_n) begin
    if (!rst_n) foreach (regs[i]) regs[i] <= '0;
    else if (bus.psel && bus.penable && bus.pwrite)
      regs[bus.paddr[3:2]] <= bus.pwdata;
  end

  always_comb begin
    if (bus.psel && bus.penable && !bus.pwrite)
      bus.prdata = regs[bus.paddr[3:2]];
    else
      bus.prdata = '0;
  end
endmodule`,

      testbench: `\`timescale 1ns/1ps
// ── Transaction class ─────────────────────────────────────────────────────
class ApbTxn;
  logic [31:0] addr;
  logic [31:0] data;
  logic        write;
  logic [31:0] exp_rdata;   // expected read-back value

  function new(logic [31:0] a, logic [31:0] d, logic w, logic [31:0] exp=0);
    addr      = a;
    data      = d;
    write     = w;
    exp_rdata = exp;
  endfunction
endclass

// ── Driver — drives apb_if from an ApbTxn ────────────────────────────────
class ApbDriver;
  virtual apb_if.master_mp vif;

  function new(virtual apb_if.master_mp vif);
    this.vif = vif;
  endfunction

  task drive(ApbTxn txn);
    @(posedge vif.clk); #1;
    vif.paddr  = txn.addr;
    vif.pwdata = txn.data;
    vif.pwrite = txn.write;
    vif.psel   = 1; vif.penable = 0;
    @(posedge vif.clk); #1;
    vif.penable = 1;
    #2;   // sample prdata before clock edge
    @(posedge vif.clk); #1;
    vif.psel = 0; vif.penable = 0;
  endtask
endclass

// ── Scoreboard ───────────────────────────────────────────────────────────
class Scoreboard;
  int pass_cnt = 0;
  int fail_cnt = 0;

  function void check(string label, logic [31:0] got, logic [31:0] exp);
    if (got === exp) begin
      $display("PASS %s: got=%08h", label, got);
      pass_cnt++;
    end else begin
      $display("FAIL %s: got=%08h exp=%08h", label, got, exp);
      fail_cnt++;
    end
  endfunction

  function void report();
    $display("--- Scoreboard: %0d PASS / %0d FAIL ---", pass_cnt, fail_cnt);
  endfunction
endclass

// ── Top-level testbench ───────────────────────────────────────────────────
module tb;
  logic clk   = 0;
  logic rst_n = 0;

  always #5 clk = ~clk;

  apb_if      bus (.clk(clk));
  apb_slave   dut (.bus(bus.slave_mp), .rst_n(rst_n));

  ApbDriver   drv;
  Scoreboard  sb;
  ApbTxn      txn;
  logic [31:0] rd_val;

  initial begin
    $display("=== L6: SV testbench + DUT integration ===");

    bus.psel = 0; bus.penable = 0;
    bus.pwrite = 0; bus.paddr = '0; bus.pwdata = '0;

    drv = new(bus.master_mp);
    sb  = new();

    repeat(3) @(posedge clk); rst_n = 1;

    // Write 3 registers
    txn = new(32'h00, 32'hAABB_0001, 1'b1); drv.drive(txn);
    txn = new(32'h04, 32'h1122_3302, 1'b1); drv.drive(txn);
    txn = new(32'h08, 32'hDEAD_0003, 1'b1); drv.drive(txn);

    // Read back and check via scoreboard
    txn = new(32'h00, '0, 1'b0);
    drv.drive(txn); #1;
    rd_val = bus.prdata;
    sb.check("reg[0]", rd_val, 32'hAABB_0001);

    txn = new(32'h04, '0, 1'b0);
    drv.drive(txn); #1;
    rd_val = bus.prdata;
    sb.check("reg[1]", rd_val, 32'h1122_3302);

    txn = new(32'h08, '0, 1'b0);
    drv.drive(txn); #1;
    rd_val = bus.prdata;
    sb.check("reg[2]", rd_val, 32'hDEAD_0003);

    sb.report();
    $finish;
  end
endmodule`,
      expected: ['PASS reg[0]', 'PASS reg[1]', 'PASS reg[2]', 'Scoreboard: 3 PASS'],
    },

    // ─── L7 ──────────────────────────────────────────────────────────────────
    {
      id: 'm16-l7',
      title: 'L7 — SystemVerilog Assertions (SVA)',
      theory: `
        <h2>SystemVerilog Assertions</h2>
        <p>Assertions let you embed correctness checks <em>inside</em> the design or testbench.
        Instead of writing <code>if (bad_condition) $display("FAIL")</code> everywhere, you
        declare a property once and the simulator checks it automatically on every clock cycle.</p>

        <h3>Two flavours</h3>
        <table>
          <tr><th>Type</th><th>Syntax</th><th>When checked</th></tr>
          <tr>
            <td><strong>Immediate</strong></td>
            <td><code>assert (expr) else $error("msg");</code></td>
            <td>Right now — like an if-statement</td>
          </tr>
          <tr>
            <td><strong>Concurrent</strong></td>
            <td><code>assert property (@(posedge clk) prop);</code></td>
            <td>Every clock edge, for the life of the simulation</td>
          </tr>
        </table>

        <h3>Property & sequence keywords</h3>
        <pre><code>// |-> : overlapping implication (check starts same cycle)
// |=> : non-overlapping implication (check starts next cycle)
// ##N : N-cycle delay
// [*N]: repeat N times

property req_ack;
  @(posedge clk) req |=> ##[0:3] ack;
endproperty
assert property (req_ack) else $error("ack not seen within 4 cycles of req");</code></pre>

        <p>Concurrent assertions are the backbone of formal verification and also run
        during simulation — any violation prints an error message with the failing time.</p>

        <h3>How to run</h3>
        <ol>
          <li>Simulator → <strong>verilator</strong>.</li>
          <li>In <strong>⚙ Options</strong> tick <code>--assert</code> and add <code>--timing</code>.</li>
          <li>Run — expect PASS lines from the immediate checks and no assertion failures.</li>
        </ol>
      `,
      tasks: [
        'Enable --assert in ⚙ Options, add --timing, set simulator to verilator',
        'Run and confirm all PASS lines appear with no assertion errors',
        'Force a failure: change the ack_delay parameter from 2 to 6 (beyond the ##[0:3] window) and observe the assertion error',
      ],
      hint: 'Concurrent assertions in Verilator require --assert. Violations print %Error lines that count as simulation failures.',

      design: `// Handshake unit: asserts ack within 1-4 cycles of req
module handshake #(parameter ACK_DELAY = 2) (
  input  logic clk,
  input  logic rst_n,
  input  logic req,
  output logic ack
);
  logic [2:0] cnt;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      cnt <= '0;
      ack <= 1'b0;
    end else if (req && cnt == '0) begin
      cnt <= 1;
      ack <= 1'b0;
    end else if (cnt != '0) begin
      if (cnt == ACK_DELAY[2:0]) begin
        ack <= 1'b1;
        cnt <= '0;
      end else begin
        cnt <= cnt + 1'b1;
        ack <= 1'b0;
      end
    end else begin
      ack <= 1'b0;
    end
  end

  // ── Concurrent assertion: ack must arrive within 4 cycles of req ──────
  property req_ack_window;
    @(posedge clk) disable iff (!rst_n)
    req |=> ##[0:3] ack;
  endproperty
  assert property (req_ack_window)
    else $error("SVA FAIL: ack not seen within 4 cycles of req at time %0t", $time);

  // ── Concurrent assertion: ack must not fire without a preceding req ────
  property no_spurious_ack;
    @(posedge clk) disable iff (!rst_n)
    ack |-> $past(req, 1) || $past(req, 2) || $past(req, 3) || $past(req, 4);
  endproperty
  assert property (no_spurious_ack)
    else $error("SVA FAIL: ack fired without a preceding req at time %0t", $time);
endmodule`,

      testbench: `\`timescale 1ns/1ps
module tb;
  logic clk   = 0;
  logic rst_n = 0;
  logic req   = 0;
  logic ack;

  always #5 clk = ~clk;   // 100 MHz

  // ACK_DELAY=2 — ack arrives 2 cycles after req, well within the 4-cycle window
  handshake #(.ACK_DELAY(2)) dut (.clk(clk), .rst_n(rst_n), .req(req), .ack(ack));

  // ── Immediate assertion helper ────────────────────────────────────────
  task check_ack(input string label, input logic exp_ack);
    // immediate assertion
    assert (ack === exp_ack)
      $display("PASS %s: ack=%b", label, ack);
    else begin
      $display("FAIL %s: ack=%b (expected %b)", label, ack, exp_ack);
      $error("immediate assertion failed");
    end
  endtask

  integer i;
  initial begin
    $display("=== L7: SystemVerilog Assertions (SVA) ===");

    // Reset
    repeat(3) @(posedge clk); rst_n = 1;

    // ── Test 1: no req → no ack ──────────────────────────────────────────
    repeat(3) @(posedge clk); #1;
    check_ack("no req → no ack", 1'b0);

    // ── Test 2: req pulse → expect ack after ACK_DELAY clocks ───────────
    @(posedge clk); #1; req = 1;
    @(posedge clk); #1; req = 0;

    // wait up to 5 cycles for ack
    for (i = 0; i < 5; i++) begin
      @(posedge clk); #1;
      if (ack) break;
    end
    check_ack("req→ack handshake", 1'b1);

    // ── Test 3: ack clears next cycle ────────────────────────────────────
    @(posedge clk); #1;
    check_ack("ack cleared after 1 cycle", 1'b0);

    // ── Test 4: two back-to-back requests ────────────────────────────────
    @(posedge clk); #1; req = 1;
    @(posedge clk); #1; req = 0;
    repeat(4) @(posedge clk); #1;
    // second req
    req = 1; @(posedge clk); #1; req = 0;
    for (i = 0; i < 5; i++) begin
      @(posedge clk); #1;
      if (ack) break;
    end
    check_ack("second req→ack", 1'b1);

    $display("PASS all immediate assertions passed; check above for SVA violations");
    $finish;
  end
endmodule`,
      expected: ['PASS no req', 'PASS req→ack handshake', 'PASS ack cleared', 'PASS second req', 'PASS all immediate assertions'],
    },

  ]
});
