(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long10',
  title: 'SPI Package & Internal Interfaces',
  icon: '📦',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long10l1',
      title: 'L1 — The SPI Package: Shared Types Across All Modules',
      theory: `<h2>SystemVerilog Packages — The Standards Document for Your RTL</h2>
<p>Imagine a factory that builds aeroplanes across five different assembly halls. Hall A builds wings, Hall B builds engines, Hall C builds landing gear. Every hall needs the same bolt specification — "M8 stainless, 30 mm, hex head". If each hall redefines this measurement independently, small discrepancies creep in and parts stop fitting together. The solution is a single standards document: one place where every measurement is defined, and every hall reads from it. In RTL design, a SystemVerilog <strong>package</strong> is that standards document.</p>

<h3>Why Packages Exist</h3>
<p>Without packages, every module that uses the FSM state encoding has to redeclare the same <code>typedef enum</code>. If the FSM gains a new state, every file must be updated — and a missed update causes a silent type mismatch. A package declares the type once, and all modules <code>import</code> it. Change the package, and the change propagates everywhere automatically.</p>

<h3>Where the Package Sits in the System</h3>
<pre class="code-block">
  ┌────────────────────────────────────────────────────────────┐
  │                                                            │
  │  ┌─────────────────┐                                     │
  │  │  spi_pkg ★         │ ← import spi_pkg::* ← all modules│
  │  │                  │                                     │
  │  │  spi_state_t      │ ──► spi_master_fsm (state reg)  │
  │  │  (7-state enum)   │ ──► spi_irq_ctrl   (fsm_state)  │
  │  │                  │                                     │
  │  │  spi_cfg_t        │ ──► spi_cpha       (cpol, cpha)  │
  │  │  (config struct)  │ ──► spi_cs_ctrl    (cs_pre etc)  │
  │  │                  │ ──► spi_shift      (word_len)    │
  │  └─────────────────┘                                     │
  └────────────────────────────────────────────────────────────┘
</pre>

<h3>typedef enum — Named Constants with Type Safety</h3>
<p>Without a typedef, FSM state is just a 7-bit logic value — nothing stops you from accidentally writing <code>state &lt;= 7'b111_1111</code> (not a valid one-hot encoding). With <code>typedef enum logic [6:0]</code>, the compiler knows the legal values and will warn on an out-of-range assignment.</p>
<pre class="code-block">package spi_pkg;

  typedef enum logic [6:0] {
    IDLE        = 7'b000_0001,
    LOAD        = 7'b000_0010,
    ASSERT_CS   = 7'b000_0100,
    SHIFT       = 7'b000_1000,
    COMPLETE    = 7'b001_0000,
    DEASSERT_CS = 7'b010_0000,
    ABORT_WAIT  = 7'b100_0000
  } spi_state_t;</pre>
<p>The enum name ends with <code>_t</code> by convention (like C). A module declares its state register as <code>spi_state_t state;</code> instead of <code>logic [6:0] state;</code>. The difference: the compiler knows <code>state</code> must hold one of the seven named values, and tools like linters and coverage engines can check completeness of the case statements automatically.</p>

<h3>typedef struct packed — Configuration as a Named Bundle</h3>
<p>The transfer configuration (CPOL, CPHA, word length, bit order, IO mode) is read by five different modules. Without a struct, each module declares five separate ports and the wiring at the top level becomes a long list of signal names. With a packed struct, all five fields become a single port:</p>
<pre class="code-block">  typedef struct packed {
    logic        cpol;      // SCK idle level
    logic        cpha;      // edge selection
    logic [4:0]  word_len;  // 1–32 bits per word
    logic        lsb_first; // bit order
    logic [1:0]  io_mode;   // 00=single 01=dual 10=quad
  } spi_cfg_t;              // total: 10 bits

endpackage</pre>
<p><strong>packed</strong> means the fields are contiguous bits in memory — the struct can be treated as a 10-bit bus for synthesis, passed through a wire, stored in a register, or sliced out of a wider data word. An <code>unpacked</code> struct cannot be treated this way.</p>

<h3>Importing a Package</h3>
<p>Any module that needs the types writes one line at the top:</p>
<pre class="code-block">import spi_pkg::*;   // bring all package items into scope
// or
import spi_pkg::spi_cfg_t;  // import only the struct</pre>
<p>The wildcard form (<code>::*</code>) is fine for our course because <code>spi_pkg</code> is the only package and there are no name collisions. In production IP with multiple packages, selective imports prevent ambiguity.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the package. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — open the package: package spi_pkg;',
        'Step 2 — declare spi_state_t: typedef enum logic [6:0] with all 7 one-hot states (IDLE through ABORT_WAIT)',
        'Step 3 — declare spi_cfg_t: typedef struct packed with 5 fields: cpol (1b), cpha (1b), word_len (5b), lsb_first (1b), io_mode (2b)',
        'Step 4 — close the package: endpackage',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`package spi_pkg;

  // One-hot FSM state encoding — 7 states, 7 bits
  typedef enum logic [6:0] {
    IDLE        = 7'b000_0001,
    LOAD        = 7'b000_0010,
    ASSERT_CS   = 7'b000_0100,
    SHIFT       = 7'b000_1000,
    COMPLETE    = 7'b001_0000,
    DEASSERT_CS = 7'b010_0000,
    ABORT_WAIT  = 7'b100_0000
  } spi_state_t;

  // Transfer configuration bundle — 10 bits packed
  typedef struct packed {
    logic        cpol;      // SCK idle level
    logic        cpha;      // edge selection
    logic [4:0]  word_len;  // 1–32 bits (5 bits covers 0–31, use 1–32)
    logic        lsb_first; // 0=MSB first, 1=LSB first
    logic [1:0]  io_mode;   // 00=single, 01=dual, 10=quad
  } spi_cfg_t;

endpackage`,

      design:
`// Type the spi_pkg package here.
// See Theory for the enum and struct definitions.
//
// package spi_pkg;
//   typedef enum logic [6:0] { ... } spi_state_t;
//   typedef struct packed { ... } spi_cfg_t;
// endpackage
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
import spi_pkg::*;
module tb;
  spi_state_t state;
  spi_cfg_t   cfg;

  initial begin
    $display("=== SPI Package Test ===");

    // Enum: IDLE is one-hot bit 0
    state = IDLE;
    if (state === IDLE && state[0] === 1'b1)
      $display("PASS  enum: IDLE one-hot bit 0 asserted");
    else
      $display("FAIL  enum: IDLE = %07b", state);

    // Enum: SHIFT is one-hot bit 3
    state = SHIFT;
    if (state[3] === 1'b1 && state[0] === 1'b0)
      $display("PASS  enum: SHIFT one-hot bit 3 asserted");
    else
      $display("FAIL  enum: SHIFT = %07b", state);

    // Enum: ABORT_WAIT is one-hot bit 6
    state = ABORT_WAIT;
    if (state[6] === 1'b1)
      $display("PASS  enum: ABORT_WAIT one-hot bit 6 asserted");
    else
      $display("FAIL  enum: ABORT_WAIT = %07b", state);

    // Struct: cpol and cpha fields
    cfg.cpol     = 1'b1;
    cfg.cpha     = 1'b0;
    cfg.word_len = 5'd8;
    cfg.lsb_first= 1'b0;
    cfg.io_mode  = 2'b00;
    if (cfg.cpol === 1'b1 && cfg.cpha === 1'b0)
      $display("PASS  struct: cpol=1 cpha=0 fields accessible");
    else
      $display("FAIL  struct: cpol=%0b cpha=%0b", cfg.cpol, cfg.cpha);

    // Struct: word_len field
    if (cfg.word_len === 5'd8)
      $display("PASS  struct: word_len field = 8");
    else
      $display("FAIL  struct: word_len = %0d", cfg.word_len);

    $display("SPI package types work!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  enum: IDLE one-hot bit 0 asserted',
        'PASS  enum: SHIFT one-hot bit 3 asserted',
        'PASS  struct: cpol=1 cpha=0 fields accessible',
        'PASS  struct: word_len field = 8',
        'SPI package types work!',
      ],
    },

    {
      id: 'spi_long10l2',
      title: 'L2 — SPI Interfaces: Named Signal Bundles',
      theory: `<h2>SystemVerilog Interfaces — Pluggable Connectors Between Modules</h2>
<p>Think of a USB-C port. Every device with a USB-C socket can accept any USB-C cable, without knowing what is on the other end. The connector defines a precise set of signals (power, data, ground) in a standard arrangement. When you plug in, both sides agree on the contract without negotiating each individual pin. A SystemVerilog <strong>interface</strong> is exactly this: a named bundle of signals that two modules can share through a single port, rather than wiring every signal individually.</p>

<h3>The Problem Interfaces Solve</h3>
<p>In the SPI master, the TX FIFO connects to the shift register through three signals: <code>tx_valid</code>, <code>tx_ready</code>, and <code>tx_data</code>. Without interfaces, the FIFO module has three output ports and the shift register has three input ports, and the top-level wiring connects each one explicitly. Add a fourth signal later (say, <code>tx_last</code> for end-of-burst marking), and you must add a port to the FIFO, a port to the shift register, and a wire at the top level. With an interface, you add one field to the interface definition and both modules see it automatically.</p>

<h3>The TX Interface</h3>
<p>We define two interfaces: one for the TX path (FIFO → shift register) and one for the RX path (shift register → FIFO).</p>
<pre class="code-block">interface spi_tx_if;
  logic        tx_valid;  // data is available from FIFO
  logic        tx_ready;  // shift register can accept data
  logic [31:0] tx_data;   // up to 32-bit word
endinterface

interface spi_rx_if;
  logic        rx_valid;  // shift register captured a word
  logic [31:0] rx_data;   // captured word
endinterface</pre>
<p>This is the simplest interface form — no direction constraints (modports), no clocking blocks. All signals are accessible to any module that holds the interface port. In production IP, modports restrict which module can drive which signal; for our course we keep the interface flat to focus on the concept before adding constraints.</p>

<h3>Handshake Semantics: valid/ready</h3>
<p>The three-wire TX handshake is the standard ready/valid protocol used throughout the AXI and APB families:</p>
<table class="truth-table">
  <tr><th>tx_valid</th><th>tx_ready</th><th>Meaning</th></tr>
  <tr><td>0</td><td>X</td><td>FIFO has no data to offer</td></tr>
  <tr><td>1</td><td>0</td><td>FIFO has data; shift register is busy — stall</td></tr>
  <tr><td>1</td><td>1</td><td>Transfer occurs this cycle — data is consumed</td></tr>
</table>
<p>A transfer occurs exactly when both valid and ready are high in the same clock cycle. The FIFO drives <code>tx_valid</code> and <code>tx_data</code>; the shift register drives <code>tx_ready</code>. Neither side needs to know the other's internals — only the interface contract matters.</p>

<h3>Instantiating an Interface</h3>
<p>In a testbench or top-level module, an interface is instantiated like a module (with parentheses), but it holds no logic of its own — just the shared wires:</p>
<pre class="code-block">spi_tx_if tx_bus();   // instantiate the interface
spi_rx_if rx_bus();   // another instance

// Pass to a module that uses it:
my_module dut (.pclk(pclk), .tx(tx_bus), .rx(rx_bus));</pre>
<p>Inside the module, signals are accessed as <code>tx.tx_valid</code>, <code>tx.tx_data</code>, etc. — the interface name acts as a namespace.</p>

<h3>Why Not Just Use Structs?</h3>
<p>Structs (from L1) group data fields together. Interfaces group signals that have <em>direction</em> and <em>handshake semantics</em>. A struct is a static memory layout; an interface is a live connection between two modules. Structs cannot have modports, clocking blocks, or internal tasks/functions. For anything that crosses a module boundary with bidirectional signalling, an interface is the right tool.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type both interfaces. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare interface spi_tx_if with three fields: tx_valid (1b), tx_ready (1b), tx_data (32b)',
        'Step 2 — close spi_tx_if with endinterface',
        'Step 3 — declare interface spi_rx_if with two fields: rx_valid (1b), rx_data (32b)',
        'Step 4 — close spi_rx_if with endinterface',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`interface spi_tx_if;
  logic        tx_valid;  // FIFO drives: data is ready to send
  logic        tx_ready;  // shift reg drives: accept data this cycle
  logic [31:0] tx_data;   // FIFO drives: up to 32-bit word
endinterface

interface spi_rx_if;
  logic        rx_valid;  // shift reg drives: word capture complete
  logic [31:0] rx_data;   // shift reg drives: captured word
endinterface`,

      design:
`// Type both SPI interface definitions here.
// See Theory for the signal directions and handshake semantics.
//
// interface spi_tx_if;
//   logic tx_valid;
//   ...
// endinterface
//
// interface spi_rx_if;
//   ...
// endinterface
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  spi_tx_if tx_bus();
  spi_rx_if rx_bus();

  initial begin
    $display("=== SPI Interface Test ===");

    // TX interface: drive valid and data
    tx_bus.tx_valid = 1'b1;
    tx_bus.tx_ready = 1'b0;
    tx_bus.tx_data  = 32'hA5A5_A5A5;
    #1;
    if (tx_bus.tx_valid === 1'b1 && tx_bus.tx_data === 32'hA5A5_A5A5)
      $display("PASS  spi_tx_if: valid=1 data=0xa5a5a5a5");
    else
      $display("FAIL  spi_tx_if: valid=%0b data=%0h", tx_bus.tx_valid, tx_bus.tx_data);

    // TX interface: ready handshake
    tx_bus.tx_ready = 1'b1;
    #1;
    if (tx_bus.tx_ready === 1'b1)
      $display("PASS  spi_tx_if: ready field accessible");
    else
      $display("FAIL  spi_tx_if: ready=%0b", tx_bus.tx_ready);

    // RX interface: drive valid and data
    rx_bus.rx_valid = 1'b1;
    rx_bus.rx_data  = 32'hBEEF_1234;
    #1;
    if (rx_bus.rx_valid === 1'b1 && rx_bus.rx_data === 32'hBEEF_1234)
      $display("PASS  spi_rx_if: valid=1 data=0xbeef1234");
    else
      $display("FAIL  spi_rx_if: valid=%0b data=%0h", rx_bus.rx_valid, rx_bus.rx_data);

    // Zero out and re-check
    tx_bus.tx_valid = 1'b0; tx_bus.tx_data = 32'h0;
    #1;
    if (tx_bus.tx_valid === 1'b0)
      $display("PASS  spi_tx_if: deassert valid");
    else
      $display("FAIL  spi_tx_if: valid should be 0");

    $display("SPI interfaces work!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  spi_tx_if: valid=1 data=0xa5a5a5a5',
        'PASS  spi_tx_if: ready field accessible',
        'PASS  spi_rx_if: valid=1 data=0xbeef1234',
        'SPI interfaces work!',
      ],
    },

    {
      id: 'spi_long10l3',
      title: 'L3 — Wiring It Together: Package Types + Interface Ports',
      theory: `<h2>Package + Interface Together — The Cable Harness</h2>
<p>Imagine a car wiring harness: hundreds of individual wires grouped into labelled connectors. The engine control unit does not have a hundred pins soldered directly to the dashboard — it has a few connectors, each carrying a group of related signals. When you swap the ECU for a newer model, you unplug the connectors and re-plug them. Individual wire mapping is hidden inside the harness. In RTL, this is exactly what we achieve when we combine a package (shared type definitions) with interfaces (grouped signal connectors).</p>
<p>We are building <code>spi_tx_adapter</code>: a small glue module that sits between the TX FIFO and the shift register. It holds the interface port (<code>spi_tx_if</code>) and uses the configuration struct (<code>spi_cfg_t</code>) to gate the data transfer. This is the exact module that spi_long11 and spi_long12 will instantiate inside the full SPI master.</p>

<h3>How the Module Uses Both</h3>
<pre class="code-block">import spi_pkg::*;      // brings spi_cfg_t and spi_state_t into scope

module spi_tx_adapter (
  input  logic     pclk,
  input  logic     rst_n,
  input  spi_cfg_t cfg,   // &lt;-- struct port from package
  spi_tx_if        tx,    // &lt;-- interface port (no direction keyword)
  output logic     load_en,
  output logic [31:0] load_data
);</pre>
<p>Two things are new here:</p>
<ul>
  <li><strong>Struct port</strong>: <code>input spi_cfg_t cfg</code> passes the entire 10-bit config bundle in one port. The module accesses fields as <code>cfg.cpol</code>, <code>cfg.word_len</code>, etc.</li>
  <li><strong>Interface port</strong>: <code>spi_tx_if tx</code> has no <code>input</code> or <code>output</code> keyword — interfaces are bidirectional by default. The module drives <code>tx.tx_ready</code> and reads <code>tx.tx_valid</code> and <code>tx.tx_data</code>.</li>
</ul>

<h3>The Handshake Logic</h3>
<p>The adapter does one job: when the FIFO has valid data (<code>tx.tx_valid=1</code>), latch it into <code>load_data</code> and pulse <code>load_en</code> for one cycle. The shift register uses <code>load_en</code> as its parallel-load strobe. The adapter always asserts <code>tx_ready</code> — it can always accept a word because it has exactly one register of buffer space.</p>
<pre class="code-block">// Handshake: ready is always high (single-register buffer)
assign tx.tx_ready = 1'b1;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    load_en   &lt;= 1'b0;
    load_data &lt;= '0;
  end else if (tx.tx_valid) begin
    load_en   &lt;= 1'b1;
    load_data &lt;= tx.tx_data;   // latch the word
  end else begin
    load_en   &lt;= 1'b0;         // no valid: clear strobe
  end
end</pre>

<h3>Accessing Config Fields</h3>
<p>The adapter can inspect <code>cfg.word_len</code> to know how many bits the shift register will shift, and pass that information forward. For now we expose the full <code>cfg</code> port so the shift register can see it — it does not restrict what fields are used. In a real design the adapter might also check <code>cfg.io_mode</code> to select 1/2/4-bit shift modes.</p>

<h3>What the Testbench Checks</h3>
<p>The testbench instantiates a <code>spi_tx_if</code>, drives <code>tx_valid</code> and <code>tx_data</code>, and verifies that <code>load_en</code> and <code>load_data</code> follow the handshake on the next clock edge. It also checks that <code>tx_ready</code> is always high (the adapter never stalls the FIFO).</p>

<p>In Phase 4, this adapter and the other interface-connected modules get wired into <code>spi_top</code>. The APB register interface assigns fields of <code>spi_cfg_t</code> directly from register writes — which means the CPU's register write instantly propagates through the struct to every module that imports the package. In the next chapter, we build the 18-register APB slave that drives that config bundle.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — above the module, write: import spi_pkg::*;',
        'Step 2 — declare module spi_tx_adapter with ports: pclk and rst_n (input logic), cfg (input spi_cfg_t), tx (spi_tx_if interface port — no direction keyword), load_en (output logic), load_data (output logic [31:0])',
        'Step 3 — write: assign tx.tx_ready = 1\'b1;',
        'Step 4 — write an always_ff block with async active-low reset; on reset, set load_en to 0 and load_data to 0',
        'Step 5 — in the else clause: if (tx.tx_valid) latch tx.tx_data into load_data and set load_en to 1; else set load_en to 0',
        'Step 6 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`import spi_pkg::*;

module spi_tx_adapter (
  input  logic        pclk,
  input  logic        rst_n,
  input  spi_cfg_t    cfg,      // config bundle from spi_pkg
  spi_tx_if           tx,       // interface port — no direction
  output logic        load_en,  // 1-cycle strobe to shift register
  output logic [31:0] load_data // word to load into shift reg
);

  // Adapter always ready — single-register buffer
  assign tx.tx_ready = 1'b1;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      load_en   <= 1'b0;
      load_data <= '0;
    end else if (tx.tx_valid) begin
      load_en   <= 1'b1;
      load_data <= tx.tx_data;  // capture from interface
    end else begin
      load_en   <= 1'b0;
    end
  end

endmodule`,

      design:
`// Build the spi_tx_adapter module here.
// See Theory for the interface port syntax and handshake logic.
`,

      testbench:
`\`timescale 1ns/1ps
// Interfaces and package must be visible to the testbench
import spi_pkg::*;
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic     rst_n;
  spi_cfg_t cfg;
  spi_tx_if tx_bus();
  logic        load_en;
  logic [31:0] load_data;

  spi_tx_adapter dut (
    .pclk(pclk), .rst_n(rst_n),
    .cfg(cfg),
    .tx(tx_bus),
    .load_en(load_en),
    .load_data(load_data)
  );

  initial begin
    $display("=== TX Adapter Integration Test ===");
    rst_n = 0;
    tx_bus.tx_valid = 0; tx_bus.tx_data = 0;
    cfg.cpol = 0; cfg.cpha = 0;
    cfg.word_len = 5'd8; cfg.lsb_first = 0; cfg.io_mode = 0;
    @(posedge pclk); #1; rst_n = 1;

    // No valid — no load, ready is always high
    @(posedge pclk); #1;
    if (load_en === 0 && tx_bus.tx_ready === 1)
      $display("PASS  idle: load_en=0 tx_ready=1");
    else
      $display("FAIL  idle: load_en=%0b ready=%0b", load_en, tx_bus.tx_ready);

    // Valid word arrives — adapter latches it
    tx_bus.tx_valid = 1; tx_bus.tx_data = 32'hA5A5_A5A5;
    @(posedge pclk); #1;
    if (load_en === 1 && load_data === 32'hA5A5_A5A5)
      $display("PASS  valid word: load_en=1 data=0xa5a5a5a5");
    else
      $display("FAIL  valid word: load_en=%0b data=%0h", load_en, load_data);

    // Valid goes low — load_en clears next cycle
    tx_bus.tx_valid = 0;
    @(posedge pclk); #1;
    if (load_en === 0)
      $display("PASS  valid deasserted: load_en cleared");
    else
      $display("FAIL  load_en not cleared: %0b", load_en);

    // Different word
    tx_bus.tx_valid = 1; tx_bus.tx_data = 32'hDEAD_BEEF;
    @(posedge pclk); #1;
    if (load_data === 32'hDEAD_BEEF)
      $display("PASS  second word latched correctly");
    else
      $display("FAIL  second word: load_data=%0h", load_data);

    $display("TX adapter with interface+package works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  idle: load_en=0 tx_ready=1',
        'PASS  valid word: load_en=1 data=0xa5a5a5a5',
        'PASS  valid deasserted: load_en cleared',
        'TX adapter with interface+package works!',
      ],
    },
  ]
});
