(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long1',
  title: 'SPI Protocol & Signal Definitions',
  icon: '🔌',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — SPI Signal Anatomy (Tier 1)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long1l1',
      title: 'L1 — MOSI, MISO, SCK, SS_n',

      theory: `
<h2>The Six-Module SPI Master — and Where Signal Definitions Fit</h2>
<p>
  Before writing any RTL, let's see the complete system we are building across
  this course. Every chapter from spi_long1 to spi_long12 contributes one
  module to this pipeline. This chapter covers the protocol layer — what each
  wire means, which direction it flows, and how all six modules eventually
  connect to the four physical pads at the chip boundary.
</p>
<pre class="code-block">
  APB Bus (host processor reads/writes control registers)
       │
       ▼
  ┌──────────────────────┐
  │    spi_reg_block     │  stores: mode, word_len, clk_div, cs_sel, int_en …
  │    (spi_long11)      │
  └──────────┬───────────┘
             │  config signals fan out to every module below
       ┌─────┴────────────────────────────────────────────┐
       │                                                  │
       ▼                                                  ▼
  ┌──────────────┐                              ┌──────────────────┐
  │ spi_clk_div  │  rising_edge_p               │  spi_cs_ctrl     │
  │  (spi_long2) │  falling_edge_p              │  (spi_long7)     │
  └──────┬───────┘  sck_out                     └────────┬─────────┘
         │                                               │
         ▼                                               │
  ┌──────────────┐                                       │
  │  spi_cpha    │  launch_pulse                         │
  │  (spi_long6) │  sample_pulse                         │
  └──────┬───────┘                                       │
         │                          ┌──────────────────┐ │
         ▼                          │  spi_master_fsm  │◄┘ cs_transfer_active
  ┌──────────────┐◄─────────────────│   (spi_long8)    │
  │  spi_shift   │  load, shift_en  └──────────────────┘
  │  (spi_long5) │
  └──────┬───────┘
         │
         │  ◄══ This chapter defines what these pads mean ══►
         ▼
  ┌───────────────────────────────────────────────────────┐
  │                 Chip Boundary (IO pads)               │
  │   spi_mosi_o ──►  MOSI pin  (Master Out, Slave In)   │
  │   spi_miso_i ◄──  MISO pin  (Master In, Slave Out)   │
  │   spi_sck_o  ──►  SCK  pin  (Serial Clock)           │
  │   spi_csn_o  ──►  CS   pin  (Chip Select, active-LOW)│
  └───────────────────────────────────────────────────────┘
</pre>
<p>
  Every module in this course ultimately drives or reads one of these four
  pads. Getting the directions right is the first thing any RTL review
  checks — and the most common mistake on a new SPI bring-up.
</p>

<h3>What Goes Wrong When Signal Directions Are Swapped</h3>
<p>
  The most frequent SPI wiring error on a new PCB is swapping MOSI and MISO.
  Schematic and layout tools sometimes mirror connector pinouts — what the
  schematic calls "MOSI out" connects to the slave's "MOSI in" correctly on
  paper, but the PCB layout reverses the net. The result: the master drives
  its own MISO line, and the slave drives directly into the master's MOSI
  driver — a bus contention on every transfer. The scope shows activity on
  both lines but every byte received is 0xFF because the slave's strong MISO
  driver dominates. The bug is invisible without a probe.
</p>
<p>
  Declaring <code>spi_mosi_o</code> as an <code>output</code> and
  <code>spi_miso_i</code> as an <code>input</code> locks the direction
  contract into the type system. A reversed connection becomes a compile-time
  direction mismatch, not a board spin.
</p>

<h2>The Four SPI Pads — Derived Step by Step</h2>

<h3>Step 1 — What does each wire carry?</h3>
<p>
  SPI moves data in both directions simultaneously on every clock edge.
  Signal names encode the direction <em>from the master's perspective</em>:
</p>
<table class="truth-table">
  <tr><th>Signal</th><th>Direction at master</th><th>What it carries</th><th>Internal source</th></tr>
  <tr><td><code>MOSI</code></td><td>output</td><td>Master → Slave data</td><td>TX shift register MSB</td></tr>
  <tr><td><code>MISO</code></td><td>input</td><td>Slave → Master data</td><td>Slave shift register</td></tr>
  <tr><td><code>SCK</code></td><td>output</td><td>Serial clock</td><td>Clock divider (spi_long2)</td></tr>
  <tr><td><code>SS_n</code></td><td>output</td><td>Slave select, active-LOW</td><td>CS controller (spi_long7)</td></tr>
</table>

<h3>Step 2 — Map to port names using the AMBA pad convention</h3>
<p>
  The suffix <code>_o</code> marks a signal leaving the chip; <code>_i</code>
  marks one arriving. Internal names connect to these pads through
  <code>assign</code> wires — no logic, just routing:
</p>
<pre class="code-block">
module spi_signals (
  input  logic tx_bit,    // from TX shift register: bit to transmit
  input  logic miso_in,   // arriving from MISO pad
  input  logic sck_int,   // from clock divider
  input  logic cs_n_raw,  // from CS controller (already active-low)
  output logic mosi,      // → MOSI pad
  output logic miso,      // → MISO pad (alias for miso_in)
  output logic sck,       // → SCK pad
  output logic ss_n       // → SS_n pad
);
</pre>

<h3>Step 3 — Connect internal signals to pads</h3>
<p>
  No combinational logic needed — four wires, four assigns:
</p>
<pre class="code-block">
  assign mosi = tx_bit;    // shift register MSB → MOSI pad
  assign miso = miso_in;   // MISO pad → readable by RX shift register
  assign sck  = sck_int;   // clock divider output → SCK pad
  assign ss_n = cs_n_raw;  // CS controller output → SS_n pad
</pre>
<p>
  In L2 we will build the shift register that produces <code>tx_bit</code>
  and consumes <code>miso_in</code> — a circular ring that exchanges an
  entire byte between master and slave in eight clock edges.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — module header: module spi_signals (',
        'Step 2 — four inputs (Theory Step 1 table):',
        '         input logic tx_bit,    input logic miso_in,',
        '         input logic sck_int,   input logic cs_n_raw,',
        'Step 3 — four outputs (last has NO comma on ss_n):',
        '         output logic mosi,  output logic miso,',
        '         output logic sck,   output logic ss_n',
        'Step 4 — close port list: );',
        'Step 5 — assign mosi = tx_bit;    (shift register MSB → MOSI pad)',
        'Step 6 — assign miso = miso_in;   (MISO pad readable internally)',
        'Step 7 — assign sck  = sck_int;   (clock divider → SCK pad)',
        'Step 8 — assign ss_n = cs_n_raw;  (CS controller → SS_n pad)',
        'Step 9 — endmodule',
        'No always_ff — four assign statements, nothing more',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_signals (
  input  logic tx_bit,    // bit the shift register wants to send
  input  logic miso_in,   // bit that arrived from the slave pad
  input  logic sck_int,   // internal SCK toggle from the clock divider
  input  logic cs_n_raw,  // CS polarity-corrected signal (active-low)
  output logic mosi,      // SPI pad: Master-Out Slave-In
  output logic miso,      // SPI pad: Master-In Slave-Out (alias)
  output logic sck,       // SPI pad: Serial Clock
  output logic ss_n       // SPI pad: Slave Select, active-LOW (note: no comma)
);

  assign mosi = tx_bit;    // what master transmits → the wire
  assign miso = miso_in;   // what arrived on the pad → readable internally
  assign sck  = sck_int;   // clock divider output → pad
  assign ss_n = cs_n_raw;  // CS controller output → pad (already active-low)

endmodule`,

      design:
`// Type the spi_signals module here. Follow Theory Steps 1–3.
//
// Step 1 — Ports (directions from the master's perspective):
//   input  logic tx_bit    — from TX shift register (bit to transmit)
//   input  logic miso_in   — arriving from MISO pad
//   input  logic sck_int   — from clock divider
//   input  logic cs_n_raw  — from CS controller (already active-low)
//   output logic mosi      — → MOSI pad
//   output logic miso      — → MISO pad (alias for miso_in)
//   output logic sck       — → SCK pad
//   output logic ss_n      — → SS_n pad
//
// Step 2 — Four assign lines (no always_ff needed):
//   assign mosi = tx_bit;   assign miso = miso_in;
//   assign sck  = sck_int;  assign ss_n = cs_n_raw;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic tx_bit, miso_in, sck_int, cs_n_raw;
  logic mosi, miso, sck, ss_n;

  spi_signals dut (
    .tx_bit   (tx_bit),
    .miso_in  (miso_in),
    .sck_int  (sck_int),
    .cs_n_raw (cs_n_raw),
    .mosi     (mosi),
    .miso     (miso),
    .sck      (sck),
    .ss_n     (ss_n)
  );

  task automatic check_wire(
    input string name,
    input logic  got,
    input logic  exp
  );
    if (got === exp)
      $display("PASS  %s: %0b", name, got);
    else
      $display("FAIL  %s: got=%0b expected=%0b", name, got, exp);
  endtask

  initial begin
    $display("=== SPI Signal Anatomy ===");

    // MOSI follows tx_bit
    tx_bit = 1; miso_in = 0; sck_int = 0; cs_n_raw = 1; #5;
    check_wire("mosi", mosi, 1'b1);

    tx_bit = 0; #5;
    check_wire("mosi when tx=0", mosi, 1'b0);

    // MISO follows miso_in
    miso_in = 1; #5;
    check_wire("miso", miso, 1'b1);

    // SCK follows sck_int
    sck_int = 1; #5;
    check_wire("sck", sck, 1'b1);

    // SS_n follows cs_n_raw (LOW = asserted)
    cs_n_raw = 0; #5;
    check_wire("ss_n asserted", ss_n, 1'b0);

    $display("SPI signal wiring complete!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  mosi: 1',
        'PASS  ss_n asserted: 0',
        'SPI signal wiring complete!',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Full-Duplex Exchange (Tier 1)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long1l2',
      title: 'L2 — Full-Duplex Shift Register',

      theory: `
<h2>Why SPI Is a Ring — and Why That Makes Bring-Up Straightforward</h2>
<p>
  The key structural insight in SPI: the master and slave are wired as a
  single circular shift register. Every SCK edge rotates both registers one
  position — one bit leaves the master's MSB and enters the slave's LSB via
  MOSI; simultaneously one bit leaves the slave's MSB and enters the master's
  LSB via MISO. After eight edges, both sides have received the other's
  complete byte.
</p>
<pre class="code-block">
  MASTER tx_shift[7:0]               SLAVE tx_shift[7:0]
  ┌───┬───┬───┬───┬───┬───┬───┬───┐  ┌───┬───┬───┬───┬───┬───┬───┬───┐
  │ 7 │ 6 │ 5 │ 4 │ 3 │ 2 │ 1 │ 0 │  │ 7 │ 6 │ 5 │ 4 │ 3 │ 2 │ 1 │ 0 │
  └───┴───┴───┴───┴───┴───┴───┴───┘  └───┴───┴───┴───┴───┴───┴───┴───┘
    MSB exits ──────────────────────MOSI──────────────────────► enters LSB
    MSB enters ◄─────────────────── MISO ── leaves MSB
                   ▲ both shift on the same SCK edge ▲
</pre>
<p>
  This ring structure makes the first bring-up test trivial: connect MISO to
  MOSI directly on the evaluation board (a loopback wire). No slave IC is
  needed. If the master transmits 0xA5 and receives 0xA5 back after eight
  SCK edges, the shift register, clock divider, and IO cells are all working
  correctly. This is the first test run on every new SPI design — it either
  passes in minutes or immediately identifies a clock, IO direction, or reset
  problem.
</p>

<h2>Building the Shift Register — Three Questions</h2>

<h3>Question 1 — What state must this block remember between clock edges?</h3>
<p>
  Two 8-bit registers: one holding bits not yet transmitted
  (<code>tx_shift</code>), one accumulating received bits
  (<code>rx_shift</code>). All control signals come from outside — the
  block itself only stores data.
</p>
<pre class="code-block">
logic [7:0] tx_shift;   // queued transmit bits, MSB goes out first
logic [7:0] rx_shift;   // accumulating received bits, MSB arrives first
</pre>

<h3>Question 2 — What events change the state, in what priority order?</h3>
<p>
  Three events, handled in decreasing priority so the FSM can safely
  issue a load at any time without interfering with an ongoing shift:
</p>
<pre class="code-block">
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    tx_shift &lt;= 8'b0;   // reset clears both registers
    rx_shift &lt;= 8'b0;
  end else if (load) begin            // FSM LOAD state: capture transmit word
    tx_shift &lt;= tx_data;
  end else if (shift_en) begin        // one pulse per active SCK edge
    tx_shift &lt;= {tx_shift[6:0], 1'b0};     // left-shift: MSB exits via MOSI
    rx_shift &lt;= {rx_shift[6:0], miso_in};  // left-shift: MISO enters at bit 0
  end
end
</pre>

<h3>Question 3 — Why must MOSI be combinational, not registered?</h3>
<p>
  If <code>mosi_out</code> were registered, it would update one clock cycle
  <em>after</em> <code>tx_shift</code> shifts — the bit on the MOSI wire
  would lag the shift register by one cycle. The slave samples MOSI on the
  SCK edge, so MOSI must be stable <em>before</em> that edge arrives.
  A combinational assign from the MSB guarantees zero latency:
</p>
<pre class="code-block">
assign mosi_out = tx_shift[7];  // always reflects the current MSB instantly
</pre>
<p>
  In L3 we will see what controls <em>which</em> SCK edge the slave uses
  to sample MOSI — the CPOL/CPHA mode setting that SPI masters must match
  to each slave device's datasheet.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header and port list:',
        '         module spi_frame (',
        '         input  logic       clk, rst_n, load, shift_en, miso_in',
        '         input  logic [7:0] tx_data',
        '         output logic       mosi_out',
        '         output logic [7:0] rx_data    ← no trailing comma',
        '         );',
        'Step 2 — Answer Question 1: declare the two state registers (after the port list)',
        '         logic [7:0] tx_shift;   (bits not yet transmitted, MSB exits first)',
        '         logic [7:0] rx_shift;   (bits accumulated from MISO, MSB arrives first)',
        'Step 3 — Answer Question 2: always_ff @(posedge clk or negedge rst_n)',
        "         Priority 1 (if !rst_n): clear both — tx_shift <= 8'b0; rx_shift <= 8'b0;",
        '         Priority 2 (else if load): tx_shift <= tx_data;',
        '         Priority 3 (else if shift_en): left-shift both registers',
        "           tx_shift <= {tx_shift[6:0], 1'b0}    — MSB exits, zeros fill right",
        '           rx_shift <= {rx_shift[6:0], miso_in}  — MISO bit enters at bit 0',
        'Step 4 — Answer Question 3: combinational MOSI (no register, no latency)',
        '         assign mosi_out = tx_shift[7];',
        '         assign rx_data  = rx_shift;',
        'Step 5 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_frame (
  input  logic       clk,
  input  logic       rst_n,      // active-low asynchronous reset
  input  logic       load,       // parallel-load strobe
  input  logic       shift_en,   // one pulse per SCK edge
  input  logic [7:0] tx_data,    // word to transmit
  input  logic       miso_in,    // serial bit from slave
  output logic       mosi_out,   // serial bit to slave
  output logic [7:0] rx_data     // parallel received word
);

  logic [7:0] tx_shift;   // TX shift register
  logic [7:0] rx_shift;   // RX shift register

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      tx_shift <= 8'b0;   // clear on reset
      rx_shift <= 8'b0;
    end else if (load) begin
      tx_shift <= tx_data;  // parallel load — happens in LOAD state
    end else if (shift_en) begin
      tx_shift <= {tx_shift[6:0], 1'b0};    // shift left; MSB leaves via mosi_out
      rx_shift <= {rx_shift[6:0], miso_in}; // shift left; MISO enters at bit 0
    end
  end

  // MOSI is always the current MSB — combinational, not registered.
  // This ensures MOSI is valid BEFORE the next SCK edge.
  assign mosi_out = tx_shift[7];
  assign rx_data  = rx_shift;

endmodule`,

      design:
`// Type the spi_frame module here. Follow Theory Questions 1–3.
//
// Q1 — State: two 8-bit registers
//   logic [7:0] tx_shift;   // MSB sent first; shifts left each SCK edge
//   logic [7:0] rx_shift;   // MSB received first; shifts left, MISO enters bit 0
//
// Q2 — Events in priority order (always_ff):
//   1. reset     → tx_shift <= 0;  rx_shift <= 0;
//   2. load      → tx_shift <= tx_data;
//   3. shift_en  → tx_shift <= {tx_shift[6:0], 1'b0};
//                  rx_shift <= {rx_shift[6:0], miso_in};
//
// Q3 — MOSI must be combinational (no register, zero latency):
//   assign mosi_out = tx_shift[7];
//   assign rx_data  = rx_shift;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz

  logic       rst_n, load, shift_en, miso_in;
  logic       mosi_out;
  logic [7:0] tx_data, rx_data;

  spi_frame dut (
    .clk      (clk),
    .rst_n    (rst_n),
    .load     (load),
    .shift_en (shift_en),
    .tx_data  (tx_data),
    .miso_in  (miso_in),
    .mosi_out (mosi_out),
    .rx_data  (rx_data)
  );

  // Loopback: slave echoes every bit master sends
  assign miso_in = mosi_out;

  // Perform one 8-bit loopback transfer and check result
  task automatic do_transfer(input logic [7:0] data, input logic [7:0] exp);
    integer i;
    // Load word
    load = 1; tx_data = data;
    @(posedge clk); #1;
    load = 0;
    // 8 shift pulses
    for (i = 0; i < 8; i++) begin
      shift_en = 1;
      @(posedge clk); #1;
      shift_en = 0;
    end
    // Check
    if (rx_data === exp)
      $display("PASS  tx=0x%02h -> rx=0x%02h", data, rx_data);
    else
      $display("FAIL  tx=0x%02h -> rx=0x%02h (expected 0x%02h)", data, rx_data, exp);
  endtask

  initial begin
    $display("=== SPI Full-Duplex Loopback ===");
    rst_n = 0; load = 0; shift_en = 0; tx_data = 0;
    repeat(2) @(posedge clk); rst_n = 1;

    do_transfer(8'hA5, 8'hA5);   // loopback: rx should equal tx
    do_transfer(8'hFF, 8'hFF);   // all-ones
    do_transfer(8'h00, 8'h00);   // all-zeros

    $display("Full-duplex loopback works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  tx=0xa5 -> rx=0xa5',
        'PASS  tx=0xff -> rx=0xff',
        'Full-duplex loopback works!',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — CPOL/CPHA Mode Decoder (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long1l3',
      title: 'L3 — CPOL/CPHA Mode Decoder',

      theory: `
<h2>Where the Mode Decoder Fits — and the Failure It Prevents</h2>
<p>
  In L1 we saw the full six-module pipeline. The mode decoder is the first step
  inside the timing engine — it translates two register bits into the edge
  assignments that every other module depends on. Get it wrong and the data path
  from L2 silently receives garbage on every transfer.
</p>
<pre class="code-block">
  spi_reg_block ──► {cpol, cpha} ──► spi_mode_decode ──► launch_on_rise
                                           ★                sample_on_rise
                                           │
                                           ▼
                                      spi_cpha (spi_long6)   timing engine
                                      spi_shift (spi_long5)  shift register
</pre>

<h3>The Real Failure: a Four-Sensor Data Logger</h3>
<p>
  A data-logging board has four SPI sensors sharing one bus: a pressure sensor
  (Mode 0), a temperature sensor (Mode 0), a gyroscope (Mode 3), and an SPI NOR
  Flash (Mode 0). Each gets its own CS pin; all four share MOSI, MISO, SCK.
</p>
<p>
  The RTL reads the gyroscope register with Mode 0 instead of Mode 3. The
  gyroscope drives MISO on the <em>falling</em> SCK edge (Mode 3), but the
  master samples MISO on the <em>rising</em> edge, expecting Mode 0 timing.
  Result:
</p>
<ul>
  <li>The master samples MISO one half-cycle too early — capturing the previous bit.</li>
  <li>Every byte from the gyroscope is bit-shifted by one position.</li>
  <li>The pressure and temperature sensors read correctly on the same bus, making the bug look intermittent and device-specific.</li>
  <li>Finding it requires a logic analyser and careful comparison of MISO timing against SCK — not just a register dump.</li>
</ul>
<p>
  The mode decoder ensures the RTL selects the correct edge assignment from the
  value written to CTRL[1:0] by the host processor. One wrong bit causes
  exactly this failure.
</p>

<h2>Deriving the Four Modes — Three Steps</h2>

<h3>Step 1 — What does each bit control?</h3>
<p>
  Two bits, two independent questions about the SCK waveform:
</p>
<table class="truth-table">
  <tr><th>Bit</th><th>Name</th><th>Question it answers</th><th>0 means</th><th>1 means</th></tr>
  <tr><td><code>cpol</code></td><td>Clock POLarity</td><td>What level does SCK rest at between transfers?</td><td>Idle LOW (most devices)</td><td>Idle HIGH</td></tr>
  <tr><td><code>cpha</code></td><td>Clock PHAse</td><td>Which edge does the slave use to sample MOSI?</td><td>First active edge</td><td>Second active edge</td></tr>
</table>

<h3>Step 2 — Map every combination to edge assignments</h3>
<p>
  Four combinations produce four modes. The key outputs we need are
  <code>launch_on_rise</code> (when to update MOSI) and
  <code>sample_on_rise</code> (when to capture MISO):
</p>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCK idle</th><th>launch_on_rise</th><th>sample_on_rise</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>0 (falling edge)</td><td>1 (rising edge)</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>LOW</td><td>1 (rising edge)</td><td>0 (falling edge)</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>HIGH</td><td>1 (rising edge)</td><td>0 (falling edge)</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>HIGH</td><td>0 (falling edge)</td><td>1 (rising edge)</td></tr>
</table>
<p>
  There is a pattern: <code>launch_on_rise = cpol XOR cpha</code>. The XOR captures
  whether the first active SCK edge is rising or falling — which is exactly the
  question CPHA asks about an SCK whose idle level is set by CPOL:
</p>
<pre class="code-block">
  idle_level     =  cpol              // CPOL is the idle level by definition
  launch_on_rise =  (cpol ^ cpha)     // 1 = MOSI changes on rising SCK
  sample_on_rise = !(cpol ^ cpha)     // 1 = MISO captured on rising SCK (= XNOR)
</pre>

<h3>Step 3 — Why always_comb + case, not three assign lines?</h3>
<p>
  We could write three assign statements and be done. We instead write an
  <code>always_comb</code> block with <code>case ({cpol, cpha})</code> because
  spi_long6 (the timing engine) will extend this exact block with CPHA=0
  pre-seed logic and a last-bit guard — and a <code>case</code> statement
  scales cleanly for those additions. Establishing the pattern here at Tier 2
  prepares us for the Tier 4 work ahead:
</p>
<pre class="code-block">
always_comb begin
  idle_level = cpol;   // direct assignment — always equals CPOL
  case ({cpol, cpha})
    2'b00: begin  // Mode 0 — most common (ADCs, NOR Flash, most sensors)
      launch_on_rise = 1'b0;   // MOSI changes on FALLING SCK edge
      sample_on_rise = 1'b1;   // MISO captured on RISING SCK edge
    end
    // ... three more cases + default
  endcase
end
</pre>
<p>
  The <code>default</code> case must assign all outputs. Without it, Verilator
  infers a latch — a timing violation that would appear as metastability in
  silicon if the inputs ever glitch to an undefined state.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header and port list:',
        '         module spi_mode_decode (',
        '         input  logic cpol,            (clock polarity)',
        '         input  logic cpha,            (clock phase)',
        '         output logic idle_level,      (SCK rest level between transfers)',
        '         output logic launch_on_rise,  (1 = MOSI changes on rising SCK)',
        '         output logic sample_on_rise   (1 = MISO captured on rising SCK, no comma)',
        '         );',
        'Step 2 — Open: always_comb begin',
        'Step 3 — First line inside: idle_level = cpol;  (Step 2 — CPOL is the idle level)',
        'Step 4 — Write: case ({cpol, cpha}) — 2-bit selector over all four modes',
        "         2'b00  Mode 0: launch_on_rise = 0;  sample_on_rise = 1;  (fall/rise)",
        "         2'b01  Mode 1: launch_on_rise = 1;  sample_on_rise = 0;  (rise/fall)",
        "         2'b10  Mode 2: launch_on_rise = 1;  sample_on_rise = 0;  (rise/fall)",
        "         2'b11  Mode 3: launch_on_rise = 0;  sample_on_rise = 1;  (fall/rise)",
        'Step 5 — Add default: launch_on_rise = 0; sample_on_rise = 1;  (prevents latch)',
        'Step 6 — endcase  end  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_mode_decode (
  input  logic cpol,
  input  logic cpha,
  output logic idle_level,      // SCK level when idle
  output logic launch_on_rise,  // 1 = MOSI updated on rising SCK edge
  output logic sample_on_rise   // 1 = MISO captured on rising SCK edge
);

  always_comb begin
    idle_level = cpol;  // CPOL is the idle level by definition

    case ({cpol, cpha})
      2'b00: begin  // Mode 0 — most common (CPOL=0, CPHA=0)
        launch_on_rise = 1'b0;  // MOSI changes on falling edge
        sample_on_rise = 1'b1;  // MISO sampled on rising edge
      end
      2'b01: begin  // Mode 1
        launch_on_rise = 1'b1;  // MOSI changes on rising edge
        sample_on_rise = 1'b0;  // MISO sampled on falling edge
      end
      2'b10: begin  // Mode 2
        launch_on_rise = 1'b1;  // MOSI changes on rising edge
        sample_on_rise = 1'b0;  // MISO sampled on falling edge
      end
      2'b11: begin  // Mode 3
        launch_on_rise = 1'b0;  // MOSI changes on falling edge
        sample_on_rise = 1'b1;  // MISO sampled on rising edge
      end
      default: begin
        launch_on_rise = 1'b0;
        sample_on_rise = 1'b1;
      end
    endcase
  end

endmodule`,

      design:
`// Type the spi_mode_decode module here. Follow Theory Steps 1–3.
//
// Step 1 — Two config inputs, three decoded outputs:
//   input  logic cpol, cpha
//   output logic idle_level     — = cpol (direct)
//   output logic launch_on_rise — = cpol XOR cpha
//   output logic sample_on_rise — = !(cpol XOR cpha)
//
// Step 2 — always_comb block; first line: idle_level = cpol;
//
// Step 3 — case ({cpol, cpha}) with 4 cases + default:
//   2'b00 → launch=0, sample=1   (Mode 0 — most common)
//   2'b01 → launch=1, sample=0   (Mode 1)
//   2'b10 → launch=1, sample=0   (Mode 2)
//   2'b11 → launch=0, sample=1   (Mode 3)
//   default → launch=0, sample=1 (prevents latch inference)
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic cpol, cpha;
  logic idle_level, launch_on_rise, sample_on_rise;

  spi_mode_decode dut (
    .cpol           (cpol),
    .cpha           (cpha),
    .idle_level     (idle_level),
    .launch_on_rise (launch_on_rise),
    .sample_on_rise (sample_on_rise)
  );

  task automatic check_mode(
    input logic cp, ch,
    input logic exp_idle, exp_launch, exp_sample
  );
    cpol = cp; cpha = ch; #5;
    if (idle_level === exp_idle &&
        launch_on_rise === exp_launch &&
        sample_on_rise === exp_sample)
      $display("PASS  Mode %0d (cpol=%0b cpha=%0b): idle=%0b launch_rise=%0b sample_rise=%0b",
               {cp,ch}, cp, ch, idle_level, launch_on_rise, sample_on_rise);
    else
      $display("FAIL  Mode %0d (cpol=%0b cpha=%0b): got idle=%0b launch=%0b sample=%0b",
               {cp,ch}, cp, ch, idle_level, launch_on_rise, sample_on_rise);
  endtask

  initial begin
    $display("=== CPOL/CPHA Mode Decoder ===");
    //              cpol cpha  idle  launch sample_rise
    check_mode(0,0,  1'b0, 1'b0, 1'b1);  // Mode 0: idle=0, launch-fall, sample-rise
    check_mode(0,1,  1'b0, 1'b1, 1'b0);  // Mode 1: idle=0, launch-rise, sample-fall
    check_mode(1,0,  1'b1, 1'b1, 1'b0);  // Mode 2: idle=1, launch-rise, sample-fall
    check_mode(1,1,  1'b1, 1'b0, 1'b1);  // Mode 3: idle=1, launch-fall, sample-rise
    $display("All 4 SPI modes verified!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  Mode 0',
        'PASS  Mode 3',
        'All 4 SPI modes verified!',
      ],
    },

  ]
});
