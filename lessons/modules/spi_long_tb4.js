// spi_long_tb4.js — SPI Long Course — Module 16
// Integration & System Verification
// Lessons: L1 Reference Slave | L2 All 4 Modes | L3 Throughput | L4 DV Checklist

(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb4',
  title: 'Integration & System Verification',
  icon: '🏁',
  level: 'advanced',
  lessons: [

    // ═══════════════════════════════════════════════════════════════════════
    // L1 — Building a Reference SPI Slave (Mode 0)
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'spi_long_tb4l1',
      title: 'L1 — Building a Reference SPI Slave',
      theory: `<h2>Why You Need a Reference Slave</h2>
<p>You have spent 15 modules building a SPI master — clock divider, FIFO, APB register file,
interrupt logic, four-mode support. To know it is actually correct you need something
<em>obviously</em> correct to test it against. A <strong>reference slave</strong> is that something:
a minimal behavioural model with no pipeline, no FIFO, no interrupts — just shift-register
logic and edge detection. Connect the master and the reference slave to the same bus, run
transfers, compare. If they agree every time, the master is almost certainly correct.
This is the same strategy as comparing a hand-optimised sort against <code>Array.sort()</code>.</p>

<h3>Problem One: SCK Is Asynchronous</h3>
<p>Your slave runs on <code>clk</code> (e.g. 100 MHz). But <code>sck</code> arrives from the
master and is not aligned to your clock — it can change at any point inside your clock period.
A combinational check on <code>sck</code> is dangerous:</p>
<pre class="code-block">if (sck) begin          // WRONG — combinational, glitch-prone
  rx_shift &lt;= ...;      // fires on every SCK transition, not on your clock edge
end</pre>
<p>The correct pattern is to <strong>register SCK</strong> and compare the registered copy against
its own previous value — both signals are now synchronous to <code>clk</code> and the
comparison is glitch-free:</p>
<pre class="code-block">always_ff @(posedge clk) begin
  sck_prev &lt;= sck;            // one-cycle-delayed copy of SCK
  if ( sck &amp;&amp; ~sck_prev) ...; // rising  edge: SCK was 0, now 1
  if (~sck &amp;&amp;  sck_prev) ...; // falling edge: SCK was 1, now 0
end</pre>
<p>The cost is one clock cycle of latency — perfectly acceptable when your system clock is
many times faster than SCK.</p>

<h3>Problem Two: Non-Blocking Assignment Subtlety</h3>
<p>All <code>&lt;=</code> assignments in <code>always_ff</code> are <strong>non-blocking</strong>:
every right-hand side is evaluated using values from the <em>beginning</em> of the time step,
before any updates take effect. This is exactly what you need:</p>
<pre class="code-block">sck_prev &lt;= sck;              // RHS reads OLD sck; sck_prev updated at END of step
if (sck &amp;&amp; ~sck_prev) begin  // reads OLD sck AND OLD sck_prev
  ...                         // fires correctly on the rising edge
end</pre>
<p>If you used blocking assignment (<code>sck_prev = sck;</code>), <code>sck_prev</code> in the
<code>if</code> would already hold the new value and the rising edge would never be detected.
This is one of the most common bugs in sequential SystemVerilog.</p>

<h3>Mode 0 — Every Edge Accounted For</h3>
<p>Mode 0 (CPOL=0, CPHA=0): SCK idles low. Master launches data on falling SCK; slave samples
on rising SCK.</p>
<table class="truth-table">
  <tr><th>Event</th><th>Slave action</th><th>Why</th></tr>
  <tr><td>CS asserts (cs_n 1→0)</td><td>Reset bit_cnt to 0; <code>tx_shift &lt;= tx_byte</code></td><td>Preload MISO MSB before first SCK edge</td></tr>
  <tr><td>Rising SCK (CS active)</td><td>Shift MOSI into rx_shift; increment bit_cnt</td><td>Capture bit master placed on MOSI</td></tr>
  <tr><td>Rising SCK, bit_cnt==7</td><td>Latch rx_byte; pulse rx_valid; reset bit_cnt</td><td>8th bit done — publish complete word, ready for next immediately</td></tr>
  <tr><td>Falling SCK (CS active)</td><td><code>tx_shift &lt;= {tx_shift[6:0], 1'b0}</code></td><td>Advance MISO to next bit; master samples it on next rising edge</td></tr>
  <tr><td>CS de-asserts (cs_n 0→1)</td><td><code>tx_shift &lt;= tx_byte</code>; reset bit_cnt</td><td>Pre-load for next transaction</td></tr>
</table>

<h3>MISO as a Tristate Output</h3>
<p>On a shared SPI bus multiple slaves share the same MISO wire. Each slave must release the
wire (<code>1'bz</code>) when its CS is inactive so another slave can speak. The single-line
solution:</p>
<pre class="code-block">assign miso = ~cs_n ? tx_shift[7] : 1'bz;
//              ↑            ↑           ↑
//         CS active   drive MSB    high-Z (released)</pre>
<p>In the testbench <code>miso</code> is declared as <code>wire</code> — a <code>logic</code>
variable cannot hold <code>z</code>.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the <code>spi_slave</code> module.
Stuck? Tap 💡 Show Hint for the fully-annotated solution.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave — ports: clk, rst_n, cs_n, sck, mosi, tx_byte[7:0] (inputs); miso (output); rx_byte[7:0], rx_valid (outputs)',
        'Declare internal signals: logic sck_prev; logic [2:0] bit_cnt; logic [7:0] rx_shift, tx_shift',
        'Add the continuous assign: assign miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'Open always_ff @(posedge clk or negedge rst_n)',
        'Reset branch: zero all internals — sck_prev, tx_shift, rx_shift, bit_cnt, rx_valid, rx_byte',
        'Else: default rx_valid <= 0; register sck_prev <= sck',
        'cs_n == 1 branch: bit_cnt <= 0; tx_shift <= tx_byte',
        'cs_n == 0, rising edge (sck & ~sck_prev): shift rx_shift left and append mosi; if bit_cnt==7 latch rx_byte, set rx_valid, reset bit_cnt; else increment bit_cnt',
        'cs_n == 0, falling edge (~sck & sck_prev): tx_shift <= {tx_shift[6:0], 1\'b0}',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`// ── spi_slave — Mode 0 reference model ─────────────────────────────────────
// All logic is synchronous to 'clk'. SCK is asynchronous — it is synchronised
// by registering it every cycle and detecting edges from the registered copy.

module spi_slave (
  input  logic       clk,        // system clock (e.g. 100 MHz)
  input  logic       rst_n,      // active-low asynchronous reset
  input  logic       cs_n,       // chip-select, active low (from master)
  input  logic       sck,        // SPI clock (asynchronous to clk)
  input  logic       mosi,       // master-out slave-in
  output logic       miso,       // master-in slave-out; tristate when CS inactive
  input  logic [7:0] tx_byte,    // byte to send — must be stable before CS asserts
  output logic [7:0] rx_byte,    // byte received from master, valid when rx_valid=1
  output logic       rx_valid    // 1-cycle pulse when a complete byte has been received
);

  logic       sck_prev;   // SCK registered one cycle ago — for edge detection
  logic [2:0] bit_cnt;    // counts 0..7 within each 8-bit transfer
  logic [7:0] rx_shift;   // shift register: MOSI bits shifted in MSB-first
  logic [7:0] tx_shift;   // shift register: MSB drives MISO, shifts left on each falling SCK

  // MISO: driven from tx_shift MSB while CS is active; released to Z otherwise.
  // Testbench must declare 'wire miso' because a logic variable cannot hold 1'bz.
  assign miso = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      // Asynchronous reset — zero everything
      sck_prev <= 1'b0;
      tx_shift <= 8'h00;
      rx_shift <= 8'h00;
      bit_cnt  <= 3'd0;
      rx_valid <= 1'b0;
      rx_byte  <= 8'h00;
    end else begin
      rx_valid <= 1'b0;   // default: rx_valid pulses for exactly one cycle
      sck_prev <= sck;    // register SCK — all edge checks below read the OLD value
                          // (non-blocking: RHS evaluated before any LHS is written)

      if (cs_n) begin
        // ── CS inactive (idle) ─────────────────────────────────────────────
        // Reset bit counter and preload tx_shift so MISO[7] (MSB) is
        // already correct before the next CS falling edge.
        bit_cnt  <= 3'd0;
        tx_shift <= tx_byte;

      end else begin
        // ── CS active — data transfer ──────────────────────────────────────

        // Mode 0: SAMPLE on rising SCK edge
        // sck_prev reads the OLD (pre-this-clock) value — non-blocking guarantees this.
        if (sck && ~sck_prev) begin              // rising edge
          rx_shift <= {rx_shift[6:0], mosi};     // shift MOSI into LSB

          if (bit_cnt === 3'd7) begin
            // 8th bit received — latch the complete byte
            rx_byte  <= {rx_shift[6:0], mosi};   // include this final MOSI bit
            rx_valid <= 1'b1;                    // pulse valid for one cycle
            bit_cnt  <= 3'd0;                    // reset: ready for next word immediately
          end else begin
            bit_cnt  <= bit_cnt + 3'd1;
          end
        end

        // Mode 0: LAUNCH next MISO bit on falling SCK edge
        // Shift tx_shift left; new MSB is automatically on miso via the assign above.
        if (~sck && sck_prev) begin              // falling edge
          tx_shift <= {tx_shift[6:0], 1'b0};    // MSB consumed; shift next bit into position
        end

      end // cs_n
    end // rst_n
  end

endmodule`,

      design:
`// Build the spi_slave module here — Mode 0 reference model.
//
// Ports:
//   input  logic       clk, rst_n       — system clock; active-low async reset
//   input  logic       cs_n             — chip-select, active low
//   input  logic       sck              — SPI clock (async to clk — registered inside)
//   input  logic       mosi             — master-out slave-in
//   output logic       miso             — driven = tx_shift[7] when CS active; 1'bz otherwise
//   input  logic [7:0] tx_byte          — byte to transmit (preloaded before CS asserts)
//   output logic [7:0] rx_byte          — completed received byte
//   output logic       rx_valid         — 1-cycle pulse when rx_byte is valid
//
// Internals:
//   logic sck_prev                      — registered SCK for edge detection
//   logic [2:0] bit_cnt                 — 0..7 within each transfer
//   logic [7:0] rx_shift, tx_shift      — serial shift registers
//
// Key rule: all edge detection happens inside one always_ff block.
// Register sck_prev FIRST; edge checks below it read the OLD sck_prev value.
//
// Delete this comment block and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, cs_n = 1, sck = 0, mosi = 0;
  wire        miso;                    // wire — DUT drives 1'bz when CS inactive
  logic [7:0] tx_byte = 0, rx_byte;
  logic       rx_valid;

  spi_slave dut (
    .clk(clk), .rst_n(rst_n), .cs_n(cs_n), .sck(sck), .mosi(mosi),
    .miso(miso), .tx_byte(tx_byte), .rx_byte(rx_byte), .rx_valid(rx_valid)
  );

  task automatic send8 (
    input  logic [7:0] d,
    output logic [7:0] rd,
    output logic [7:0] mc
  );
    integer j;
    rd = 0; mc = 0;
    for (j = 7; j >= 0; j--) begin
      mosi = d[j];
      @(posedge clk); #1;
      sck = 1; @(posedge clk); #1;
      mc[j] = miso;
      sck = 0; @(posedge clk); #1;
    end
    rd = rx_byte;
  endtask

  logic [7:0] rx, mc;

  initial begin
    $display("=== SPI Slave Model Test ===");
    rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    cs_n = 0; sck = 0; @(posedge clk); #1;
    send8(8'h55, rx, mc);
    cs_n = 1; @(posedge clk); #1;
    if (rx === 8'h55)
      $display("PASS  rx=0x55");
    else
      $display("FAIL  rx=0x%0h (expected 0x55)", rx);

    tx_byte = 8'hA5; @(posedge clk); #1;
    cs_n = 0; sck = 0; @(posedge clk); #1;
    send8(8'h00, rx, mc);
    cs_n = 1; @(posedge clk); #1;
    if (mc === 8'hA5)
      $display("PASS  miso_echo=0xa5");
    else
      $display("FAIL  miso_echo=0x%0h (expected 0xa5)", mc);

    tx_byte = 8'h3C; @(posedge clk); #1;
    cs_n = 0; sck = 0; @(posedge clk); #1;
    send8(8'hAA, rx, mc);
    cs_n = 1; @(posedge clk); #1;
    if (rx === 8'hAA)
      $display("PASS  rx=0xaa");
    else
      $display("FAIL  rx=0x%0h (expected 0xaa)", rx);
    if (mc === 8'h3C)
      $display("PASS  miso_echo=0x3c");
    else
      $display("FAIL  miso_echo=0x%0h (expected 0x3c)", mc);

    $display("SPI slave model works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  rx=0x55',
        'PASS  miso_echo=0xa5',
        'PASS  rx=0xaa',
        'SPI slave model works!'
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // L2 — All 4 SPI Modes + Multi-Word Burst
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'spi_long_tb4l2',
      title: 'L2 — All 4 SPI Modes + Multi-Word Burst',
      theory: `<h2>Why There Are Four SPI Modes</h2>
<p>SPI was never standardised — different chip manufacturers made different choices about
which clock edge to use for data capture. Two one-bit parameters encode every variant:</p>
<ul>
  <li><strong>CPOL</strong> (Clock POLarity) — the idle level of SCK when no transfer is happening.
      CPOL=0 means SCK idles <em>low</em>; CPOL=1 means SCK idles <em>high</em>.</li>
  <li><strong>CPHA</strong> (Clock PHAse) — which edge is used for data capture.
      CPHA=0: capture on the <em>first</em> edge after CS asserts;
      CPHA=1: capture on the <em>second</em> edge.</li>
</ul>
<p>Together they produce four combinations. In Mode 0 and Mode 3 the capture edge is a
<em>rising</em> SCK edge. In Mode 1 and Mode 2 it is a <em>falling</em> SCK edge.</p>

<h3>Complete Mode Reference</h3>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCK idle</th><th>Capture edge</th><th>Launch edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>low</td><td>rising ↑</td><td>falling ↓</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>low</td><td>falling ↓</td><td>rising ↑</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>high</td><td>falling ↓</td><td>rising ↑</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>high</td><td>rising ↑</td><td>falling ↓</td></tr>
</table>
<p>Modes 1 and 2 behave identically on the wire (same edges) even though they arrive at that
behaviour by different combinations of CPOL and CPHA. The same is true for Modes 0 and 3.</p>

<h3>Deriving the One-Formula Rule</h3>
<p>Look at the <em>Capture edge</em> column. Rising capture happens for modes 0 and 3 —
exactly when <code>CPOL == CPHA</code> (both 0, or both 1). Falling capture happens for modes 1
and 2 — exactly when <code>CPOL != CPHA</code>. In logic:</p>
<pre class="code-block">// mode = {CPOL, CPHA} = {mode[1], mode[0]}
capture_on_rising = ~(mode[1] ^ mode[0]);  // XOR=0 when equal → rising
capture_on_falling =  (mode[1] ^ mode[0]); // XOR=1 when different → falling</pre>
<p>You do not need four <code>case</code> branches. You need one XOR expression and two
edge conditions inside <code>always_ff</code>:</p>
<pre class="code-block">// Sample (capture) condition — picks the correct edge for any mode:
if ( ((sck &amp;&amp; ~sck_prev) &amp;&amp; ~(mode[1]^mode[0])) |   // rising  — modes 0 &amp; 3
     ((~sck &amp;&amp; sck_prev) &amp;&amp;  (mode[1]^mode[0])) )   // falling — modes 1 &amp; 2
begin
  // sample MOSI here
end

// Launch condition — the opposite edge to sample:
if ( ((~sck &amp;&amp; sck_prev) &amp;&amp; ~(mode[1]^mode[0])) |   // falling — modes 0 &amp; 3
     ((sck &amp;&amp; ~sck_prev)  &amp;&amp;  (mode[1]^mode[0])) )  // rising  — modes 1 &amp; 2
begin
  // shift tx_shift here
end</pre>
<p>That is the complete mode engine. No case statements, no CPOL/CPHA separate signals —
just one XOR routing the edge detection correctly.</p>

<h3>Multi-Word Burst — CS Stays Low</h3>
<p>Toggling CS between every byte wastes time (pre-delay + post-delay per transfer).
Instead, keep CS low and send consecutive words. After the 8th sample edge, the slave
resets <code>bit_cnt</code> to 0 and is immediately ready for the next word — no CS
toggle needed. The master simply continues driving SCK and MOSI.</p>
<p>The only requirement: <code>tx_byte</code> for each successive word must be loaded
into <code>tx_shift</code> before the first falling edge of that new word. In practice
the master controls this timing and the slave's CS-active preload handles it.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build <code>spi_slave_v2</code>.
Stuck? Tap 💡 Show Hint for the fully-annotated solution.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_v2 — same ports as L1 plus input logic [1:0] mode',
        'Keep the same internals: sck_prev, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]',
        'Keep assign miso = ~cs_n ? tx_shift[7] : 1\'bz unchanged',
        'Inside always_ff, after registering sck_prev, replace the hard-coded rising/falling checks with the two mode-aware conditions from Theory',
        'Sample condition: ((sck & ~sck_prev) & ~(mode[1]^mode[0])) | ((~sck & sck_prev) & (mode[1]^mode[0]))',
        'Launch condition: swap the two sub-expressions — falling for modes 0/3, rising for modes 1/2',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines should appear in the Output tab',
      ],

      hint:
`// ── spi_slave_v2 — all 4 modes, multi-word burst ────────────────────────────
// The only change from spi_slave (L1) is the edge-detection conditions:
// hard-coded "rising=sample, falling=launch" is replaced by the XOR formula.

module spi_slave_v2 (
  input  logic       clk, rst_n,
  input  logic [1:0] mode,           // {CPOL, CPHA} — selects which edge to sample on
  input  logic       cs_n, sck, mosi,
  output logic       miso,
  input  logic [7:0] tx_byte,
  output logic [7:0] rx_byte,
  output logic       rx_valid
);

  logic       sck_prev;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  assign miso = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sck_prev <= 0; tx_shift <= 0; rx_shift <= 0;
      bit_cnt  <= 0; rx_valid <= 0; rx_byte  <= 0;
    end else begin
      rx_valid <= 0;
      sck_prev <= sck;    // register SCK; all edge checks below read OLD sck_prev

      if (cs_n) begin
        bit_cnt  <= 0;
        tx_shift <= tx_byte;
      end else begin

        // ── SAMPLE condition ─────────────────────────────────────────────
        // ~(mode[1]^mode[0]) is 1 when CPOL==CPHA (modes 0 & 3) → sample on rising
        //  (mode[1]^mode[0]) is 1 when CPOL!=CPHA (modes 1 & 2) → sample on falling
        if ( ((sck && ~sck_prev) && ~(mode[1]^mode[0])) |   // rising  — modes 0/3
             ((~sck && sck_prev) &&  (mode[1]^mode[0])) )   // falling — modes 1/2
        begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt === 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi};  // latch complete word
            rx_valid <= 1;
            bit_cnt  <= 0;  // immediately ready for next word — supports burst
          end else
            bit_cnt <= bit_cnt + 3'd1;
        end

        // ── LAUNCH condition — the opposite edge to sample ───────────────
        // Modes 0/3: launch on falling; Modes 1/2: launch on rising
        if ( ((~sck && sck_prev) && ~(mode[1]^mode[0])) |   // falling — modes 0/3
             (( sck && ~sck_prev) &&  (mode[1]^mode[0])) )  // rising  — modes 1/2
          tx_shift <= {tx_shift[6:0], 1'b0};  // advance MISO to next bit

      end
    end
  end
endmodule`,

      design:
`// Build spi_slave_v2 here — extends the L1 slave to support all 4 SPI modes.
//
// New port vs L1:  input logic [1:0] mode   ({CPOL, CPHA})
//
// Everything else is identical to L1 EXCEPT the edge conditions:
//
//   SAMPLE condition (replace the hard-coded rising check with):
//     ( (sck & ~sck_prev) & ~(mode[1]^mode[0]) )  |  // rising,  modes 0 & 3
//     ( (~sck & sck_prev) &  (mode[1]^mode[0]) )     // falling, modes 1 & 2
//
//   LAUNCH condition (swap the two sub-expressions):
//     ( (~sck & sck_prev) & ~(mode[1]^mode[0]) )  |  // falling, modes 0 & 3
//     ( (sck & ~sck_prev) &  (mode[1]^mode[0]) )     // rising,  modes 1 & 2
//
// Delete this comment block and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic [1:0] mode = 0;
  logic       rst_n, cs_n = 1, sck = 0, mosi = 0;
  wire        miso;
  logic [7:0] tx_byte = 0, rx_byte;
  logic       rx_valid;

  spi_slave_v2 dut (
    .clk(clk), .rst_n(rst_n), .mode(mode), .cs_n(cs_n),
    .sck(sck), .mosi(mosi), .miso(miso),
    .tx_byte(tx_byte), .rx_byte(rx_byte), .rx_valid(rx_valid)
  );

  task automatic run_word (
    input  logic [1:0] m,
    input  logic [7:0] d,
    output logic [7:0] rd
  );
    logic cpol; integer i;
    cpol = m[1]; rd = 0;
    mode = m; sck = cpol; @(posedge clk); #1;
    cs_n = 0;             @(posedge clk); #1;
    for (i = 7; i >= 0; i--) begin
      mosi = d[i];  @(posedge clk); #1;
      sck = ~cpol;  @(posedge clk); #1;
      sck =  cpol;  @(posedge clk); #1;
    end
    repeat(2) @(posedge clk); #1;
    rd = rx_byte;
    cs_n = 1; sck = 0; @(posedge clk); #1;
  endtask

  logic [7:0] got, b0, b1;

  initial begin
    $display("=== All 4 Modes + Burst Test ===");
    rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    run_word(2'b00, 8'hA5, got);
    if (got===8'hA5) $display("PASS  mode0=0xa5"); else $display("FAIL  mode0=0x%0h", got);

    run_word(2'b01, 8'h5A, got);
    if (got===8'h5A) $display("PASS  mode1=0x5a"); else $display("FAIL  mode1=0x%0h", got);

    run_word(2'b10, 8'hC3, got);
    if (got===8'hC3) $display("PASS  mode2=0xc3"); else $display("FAIL  mode2=0x%0h", got);

    run_word(2'b11, 8'h3C, got);
    if (got===8'h3C) $display("PASS  mode3=0x3c"); else $display("FAIL  mode3=0x%0h", got);

    mode=2'b00; cs_n=0; sck=0; @(posedge clk); #1;
    begin
      integer i;
      for (i=7;i>=0;i--) begin mosi=8'hDE[i]; @(posedge clk);#1; sck=1;@(posedge clk);#1; sck=0;@(posedge clk);#1; end
      repeat(2) @(posedge clk);#1; b0=rx_byte;
      for (i=7;i>=0;i--) begin mosi=8'hAD[i]; @(posedge clk);#1; sck=1;@(posedge clk);#1; sck=0;@(posedge clk);#1; end
      repeat(2) @(posedge clk);#1; b1=rx_byte;
    end
    cs_n=1; @(posedge clk); #1;
    if (b0===8'hDE) $display("PASS  burst_w0=0xde"); else $display("FAIL  burst_w0=0x%0h", b0);
    if (b1===8'hAD) $display("PASS  burst_w1=0xad"); else $display("FAIL  burst_w1=0x%0h", b1);

    $display("All modes and burst verified!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  mode0=0xa5',
        'PASS  mode1=0x5a',
        'PASS  mode2=0xc3',
        'PASS  mode3=0x3c',
        'PASS  burst_w0=0xde',
        'All modes and burst verified!'
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // L3 — Measuring SPI Throughput
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'spi_long_tb4l3',
      title: 'L3 — Measuring SPI Throughput',
      theory: `<h2>The Overhead Problem</h2>
<p>Every SPI transfer burns more clock cycles than the 8 data bits alone. There is a
<strong>CS pre-delay</strong> (master holds CS low but waits before clocking),
a <strong>CS post-delay</strong> (master waits after the last SCK edge before releasing CS),
and sometimes an <strong>inter-word gap</strong> between burst words. All of these waste bus time.</p>
<p>Before taping out — or even before choosing a clock divider ratio — you want to measure:
<em>what fraction of the time CS is active is actually spent transferring data?</em></p>
<p>That fraction is <strong>transfer efficiency</strong>:</p>
<pre class="code-block">efficiency (%) = (SCK_rising_edges * 100) / total_CS_active_cycles

// Example A — 8 bits, SCK period = 2 clocks, no overhead:
//   sck_count = 8,  cycle_count = 16
//   efficiency = (8 * 100) / 16 = 50%
//   (only half the cycles have an SCK edge — the other half are falling edges)
//
// Example B — same transfer with a 5-cycle CS pre-delay:
//   sck_count = 8,  cycle_count = 21
//   efficiency = (8 * 100) / 21 = 38%</pre>
<p>The testbench in this lesson uses <code>sck_count * 200</code> (not 100) as the numerator
because each SCK edge pair (rising + falling) takes 2 clocks — so the maximum achievable
"counting efficiency" is 100% when every pair of clocks has a rising edge.</p>

<h3>Monitor Architecture: Three Phases</h3>
<p>The monitor is a tiny state machine driven purely by the CS edges:</p>
<table class="truth-table">
  <tr><th>Phase</th><th>Trigger</th><th>Action</th></tr>
  <tr><td><strong>Reset</strong></td><td>CS asserts: cs_n_prev=1 &amp;&amp; cs_n=0</td><td>Zero both running counters (sck_cnt and cyc_cnt)</td></tr>
  <tr><td><strong>Count</strong></td><td>CS is active: cs_n=0</td><td>cyc_cnt++ every clock; sck_cnt++ on every SCK rising edge</td></tr>
  <tr><td><strong>Latch</strong></td><td>CS de-asserts: cs_n_prev=0 &amp;&amp; cs_n=1</td><td>Copy running counters to output registers; pulse done for one cycle</td></tr>
</table>
<p>The latch phase is critical: you need a stable snapshot of the counts that does not
change while the system reads them. A 1-cycle <code>done</code> pulse tells the rest of
the system that the output registers are valid.</p>

<h3>Ports and Internals</h3>
<pre class="code-block">module spi_perf_monitor (
  input  logic        clk, rst_n,
  input  logic        cs_n,            // SPI chip-select (active low)
  input  logic        sck,             // SPI clock
  output logic [15:0] sck_count,       // SCK rising edges during last CS window
  output logic [15:0] cycle_count,     // total clock cycles CS was active
  output logic        done             // 1-cycle pulse when CS de-asserts
);
  logic cs_n_prev, sck_prev;
  logic [15:0] sck_cnt, cyc_cnt; // running (internal) counters</pre>

<p><strong>Ready?</strong> Switch to the Code tab and build <code>spi_perf_monitor</code>.
Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_perf_monitor — inputs: clk, rst_n, cs_n, sck; outputs: sck_count[15:0], cycle_count[15:0], done',
        'Declare internals: logic cs_n_prev, sck_prev; logic [15:0] sck_cnt, cyc_cnt',
        'In always_ff: default done=0; register cs_n_prev <= cs_n and sck_prev <= sck every cycle',
        'Phase 1 — CS just asserted (cs_n_prev & ~cs_n): reset sck_cnt and cyc_cnt to 0',
        'Phase 2 — CS active (~cs_n): cyc_cnt++; if rising SCK (sck & ~sck_prev) then sck_cnt++',
        'Phase 3 — CS just de-asserted (~cs_n_prev & cs_n): sck_count <= sck_cnt; cycle_count <= cyc_cnt; done <= 1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear',
      ],

      hint:
`// ── spi_perf_monitor — counts SCK edges and total cycles while CS is active ──
// Three-phase design: Reset on CS assert → Count while CS active → Latch on CS de-assert

module spi_perf_monitor (
  input  logic        clk, rst_n,
  input  logic        cs_n,           // chip-select, active low
  input  logic        sck,            // SPI clock
  output logic [15:0] sck_count,      // SCK rising edges counted (latched at CS de-assert)
  output logic [15:0] cycle_count,    // total clock cycles CS was active (latched)
  output logic        done            // 1-cycle pulse when sck_count/cycle_count are valid
);

  logic        cs_n_prev;    // CS registered one cycle ago — for edge detection
  logic        sck_prev;     // SCK registered one cycle ago — for rising edge detection
  logic [15:0] sck_cnt;      // running counter: SCK rising edges (not yet latched)
  logic [15:0] cyc_cnt;      // running counter: clock cycles (not yet latched)

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      cs_n_prev   <= 1'b1;  // CS inactive after reset
      sck_prev    <= 1'b0;
      sck_cnt     <= 16'd0;
      cyc_cnt     <= 16'd0;
      sck_count   <= 16'd0;
      cycle_count <= 16'd0;
      done        <= 1'b0;
    end else begin
      cs_n_prev <= cs_n;    // register CS — used for edge detection
      sck_prev  <= sck;     // register SCK — used for rising edge detection
      done      <= 1'b0;    // default: done pulses for exactly one cycle

      if (cs_n_prev && ~cs_n) begin
        // ── Phase 1: CS just asserted (falling edge on cs_n) ─────────────
        // Zero the running counters; do NOT count this cycle itself.
        sck_cnt <= 16'd0;
        cyc_cnt <= 16'd0;

      end else if (~cs_n) begin
        // ── Phase 2: CS is active — accumulate ───────────────────────────
        cyc_cnt <= cyc_cnt + 16'd1;  // count every clock cycle
        if (sck && ~sck_prev)        // rising SCK edge
          sck_cnt <= sck_cnt + 16'd1;

      end else if (~cs_n_prev && cs_n) begin
        // ── Phase 3: CS just de-asserted (rising edge on cs_n) ───────────
        // Latch running counters into output registers and pulse done.
        sck_count   <= sck_cnt;
        cycle_count <= cyc_cnt;
        done        <= 1'b1;  // valid for one cycle
      end

    end
  end
endmodule`,

      design:
`// Build the spi_perf_monitor module here.
//
// Inputs:  clk, rst_n, cs_n, sck
// Outputs: sck_count[15:0], cycle_count[15:0], done
//
// Internals:
//   logic cs_n_prev, sck_prev     — registered copies for edge detection
//   logic [15:0] sck_cnt, cyc_cnt — running counters (latched to outputs on CS de-assert)
//
// Three-phase logic (all inside one always_ff):
//   Phase 1  cs_n_prev=1 & cs_n=0  (CS asserts)   → reset sck_cnt, cyc_cnt
//   Phase 2  cs_n=0                (CS active)     → cyc_cnt++; if SCK rising: sck_cnt++
//   Phase 3  cs_n_prev=0 & cs_n=1  (CS de-asserts) → latch outputs; done=1
//
// Delete this comment block and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst_n, cs_n = 1, sck = 0;
  logic [15:0] sck_count, cycle_count;
  logic        done;

  spi_perf_monitor dut (
    .clk(clk), .rst_n(rst_n), .cs_n(cs_n), .sck(sck),
    .sck_count(sck_count), .cycle_count(cycle_count), .done(done)
  );

  integer i, eff;

  initial begin
    $display("=== SPI Performance Monitor Test ===");
    rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Test 1: 8 bits, SCK period=2 clocks, zero overhead
    cs_n = 0; sck = 0; @(posedge clk); #1;
    for (i = 0; i < 8; i++) begin
      sck = 1; @(posedge clk); #1;
      sck = 0; @(posedge clk); #1;
    end
    cs_n = 1; repeat(2) @(posedge clk); #1;

    if (sck_count === 16'd8)
      $display("PASS  t1_sck_count=8");
    else
      $display("FAIL  t1_sck_count=%0d (expected 8)", sck_count);

    eff = (sck_count * 200) / cycle_count;
    if (eff >= 95)
      $display("PASS  t1_efficiency=%0d%%", eff);
    else
      $display("FAIL  t1_efficiency=%0d%% (expected ~100%%)", eff);

    // Test 2: 8 bits with 5-cycle CS pre-delay (~76% efficiency)
    cs_n = 0; sck = 0; @(posedge clk); #1;
    repeat(5) @(posedge clk); #1;
    for (i = 0; i < 8; i++) begin
      sck = 1; @(posedge clk); #1;
      sck = 0; @(posedge clk); #1;
    end
    cs_n = 1; repeat(2) @(posedge clk); #1;

    if (sck_count === 16'd8)
      $display("PASS  t2_sck_count=8");
    else
      $display("FAIL  t2_sck_count=%0d (expected 8)", sck_count);

    eff = (sck_count * 200) / cycle_count;
    if (eff >= 60 && eff <= 85)
      $display("PASS  t2_efficiency=%0d%%", eff);
    else
      $display("FAIL  t2_efficiency=%0d%% (expected ~76%%)", eff);

    $display("Performance monitor verified!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  t1_sck_count=8',
        'PASS  t1_efficiency=100%',
        'PASS  t2_sck_count=8',
        'Performance monitor verified!'
      ]
    },

    // ═══════════════════════════════════════════════════════════════════════
    // L4 — 38-Item DV Checklist × Checkpoint D
    // ═══════════════════════════════════════════════════════════════════════
    {
      id: 'spi_long_tb4l4',
      title: 'L4 — 38-Item DV Checklist × Checkpoint D',
      theory: `<h2>What a DV Checklist Actually Is</h2>
<p>In a real chip project, the design verification team maintains a structured list of tests
that must all pass before any block is considered ready for integration. This is called the
<strong>DV checklist</strong> or <strong>sign-off checklist</strong>. Each item on the list
corresponds to a specific scenario the design must handle correctly — not just the happy path,
but corner cases, all valid modes, edge patterns, and back-to-back operations.</p>
<p>The checklist exists because individual tests can accidentally cover the same scenario
multiple times while leaving other scenarios untested. A structured list with numbered items
ensures coverage is intentional and exhaustive.</p>

<h3>How the 38 Items Are Organised</h3>
<table class="truth-table">
  <tr><th>Items</th><th>Category</th><th>What it proves</th></tr>
  <tr><td>1–8</td><td>Mode 0 — eight data patterns</td><td>0x00, 0xFF, 0xA5, 0x5A, 0xAA, 0x55, 0x0F, 0xF0 — covers all-zeros, all-ones, alternating bits, nibble boundaries</td></tr>
  <tr><td>9–12</td><td>All 4 modes / pattern 0xC3</td><td>Mode engine routes each of the four CPOL/CPHA combinations correctly</td></tr>
  <tr><td>13–16</td><td>All 4 modes / pattern 0x3C</td><td>Complementary pattern — guards against bit-order reversal</td></tr>
  <tr><td>17–20</td><td>MISO echo fidelity — 4 values</td><td>tx_byte flows correctly through tx_shift to the master</td></tr>
  <tr><td>21–24</td><td>Mode 0 four-word burst</td><td>CS held low between words; bit_cnt resets correctly after each word</td></tr>
  <tr><td>25–28</td><td>Mode 2 four-word burst</td><td>Same burst behaviour with CPOL=1 (SCK idles high)</td></tr>
  <tr><td>29–32</td><td>Single-bit patterns / Mode 0</td><td>0x01, 0x02, 0x80, 0x40 — LSB and MSB boundary bits shift correctly</td></tr>
  <tr><td>33–36</td><td>Mode 1 alternating patterns</td><td>Falling-edge capture works across four different patterns</td></tr>
  <tr><td>37–38</td><td>Mode 3 edge-case patterns</td><td>0x7E and 0x81 — adjacent 0/1 transitions at both ends of the byte</td></tr>
</table>

<h3>What Checkpoint D Means</h3>
<p>In many project flows, verification milestones are labelled A through D:</p>
<ul>
  <li><strong>Checkpoint A</strong> — basic functionality (reset, single transfer)</li>
  <li><strong>Checkpoint B</strong> — protocol compliance (all modes, timing)</li>
  <li><strong>Checkpoint C</strong> — stress and corner cases (burst, back-to-back)</li>
  <li><strong>Checkpoint D</strong> — full sign-off; block is ready for integration</li>
</ul>
<p>Passing all 38 items here is equivalent to Checkpoint D. The testbench is pre-loaded;
your only task is to re-implement <code>spi_slave_v2</code> from memory. If every item
prints <code>PASS</code>, the SPI Verification Engineer certificate is awarded.</p>

<p><strong>Ready?</strong> Switch to the Code tab and re-implement <code>spi_slave_v2</code>
from memory. The testbench is already in place. Stuck? Tap 💡 Show Hint for the
fully-annotated reference implementation.</p>`,

      tasks: [
        'Code tab is blank — re-implement spi_slave_v2 from memory.',
        'Ports: clk, rst_n, mode[1:0], cs_n, sck, mosi, tx_byte[7:0] (inputs); miso, rx_byte[7:0], rx_valid (outputs)',
        'Internals: sck_prev, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]',
        'Assign: miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'always_ff: reset zeros everything; default rx_valid=0; register sck_prev',
        'cs_n=1 branch: bit_cnt=0, tx_shift=tx_byte (preload for next transfer)',
        'cs_n=0, sample condition: ((sck & ~sck_prev) & ~(mode[1]^mode[0])) | ((~sck & sck_prev) & (mode[1]^mode[0]))',
        'cs_n=0, launch condition: swap the two sub-expressions from the sample condition',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 38 PASS lines and the certificate should appear',
        '🏅 SPI Verification Engineer — 38-item DV checklist complete; your design is handoff-ready',
      ],

      hint:
`// ── spi_slave_v2 — complete reference implementation ────────────────────────
// Re-type this if you are stuck. Understanding every line is the goal.
// This is identical to the L2 solution — the 38-item testbench just exercises it more.

module spi_slave_v2 (
  input  logic       clk, rst_n,
  input  logic [1:0] mode,           // {CPOL, CPHA}: selects capture and launch edges
  input  logic       cs_n,           // chip-select, active low
  input  logic       sck,            // SPI clock (asynchronous to clk)
  input  logic       mosi,           // master-out slave-in
  output logic       miso,           // master-in slave-out; tristate when CS inactive
  input  logic [7:0] tx_byte,        // byte to transmit; must be stable before CS asserts
  output logic [7:0] rx_byte,        // byte received; valid when rx_valid pulses
  output logic       rx_valid        // 1-cycle pulse when a full byte has been received
);

  logic       sck_prev;   // SCK registered one cycle ago
  logic [2:0] bit_cnt;    // 0..7 within each 8-bit word
  logic [7:0] rx_shift;   // serial-in: MOSI bits enter at LSB, shift toward MSB
  logic [7:0] tx_shift;   // serial-out: MSB drives MISO; shifts left on each launch edge

  // MISO tristate: driven only while CS is active; released to Z otherwise
  assign miso = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sck_prev <= 1'b0;
      tx_shift <= 8'h00;
      rx_shift <= 8'h00;
      bit_cnt  <= 3'd0;
      rx_valid <= 1'b0;
      rx_byte  <= 8'h00;
    end else begin
      rx_valid <= 1'b0;   // default: pulse low every cycle
      sck_prev <= sck;    // register SCK — all edge checks below read the OLD sck_prev
                          // (non-blocking: OLD value guaranteed because RHS evaluated first)

      if (cs_n) begin
        // CS inactive: reset and preload so MISO MSB is ready before next CS assert
        bit_cnt  <= 3'd0;
        tx_shift <= tx_byte;

      end else begin

        // ── SAMPLE CONDITION ──────────────────────────────────────────────
        // CPOL==CPHA (modes 0, 3): ~(mode[1]^mode[0]) = 1 → sample on rising SCK
        // CPOL!=CPHA (modes 1, 2):  (mode[1]^mode[0]) = 1 → sample on falling SCK
        if ( ((sck && ~sck_prev) && ~(mode[1]^mode[0])) |   // rising  — modes 0 & 3
             ((~sck && sck_prev) &&  (mode[1]^mode[0])) )   // falling — modes 1 & 2
        begin
          rx_shift <= {rx_shift[6:0], mosi};     // shift in MOSI at LSB

          if (bit_cnt === 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi};   // include this final bit
            rx_valid <= 1'b1;                    // pulse valid
            bit_cnt  <= 3'd0;                    // reset: ready for next word in a burst
          end else
            bit_cnt <= bit_cnt + 3'd1;
        end

        // ── LAUNCH CONDITION (opposite edge to sample) ────────────────────
        // Modes 0 & 3: launch on falling (complement of rising-sample)
        // Modes 1 & 2: launch on rising  (complement of falling-sample)
        if ( ((~sck && sck_prev) && ~(mode[1]^mode[0])) |   // falling — modes 0 & 3
             (( sck && ~sck_prev) &&  (mode[1]^mode[0])) )  // rising  — modes 1 & 2
          tx_shift <= {tx_shift[6:0], 1'b0};    // MSB consumed; shift next bit to position

      end
    end
  end
endmodule`,

      design:
`// Re-implement spi_slave_v2 here from memory.
// Refer to L2 only if you are completely stuck.
// All 38 DV checks depend on a correct, complete implementation.
//
// Ports:
//   input  logic       clk, rst_n, cs_n, sck, mosi
//   input  logic [1:0] mode          {CPOL, CPHA}
//   input  logic [7:0] tx_byte
//   output logic       miso
//   output logic [7:0] rx_byte
//   output logic       rx_valid
//
// Delete this comment block and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic [1:0] mode = 0;
  logic       rst_n, cs_n = 1, sck = 0, mosi = 0;
  wire        miso;
  logic [7:0] tx_byte = 0, rx_byte;
  logic       rx_valid;

  spi_slave_v2 dut (
    .clk(clk), .rst_n(rst_n), .mode(mode), .cs_n(cs_n),
    .sck(sck), .mosi(mosi), .miso(miso),
    .tx_byte(tx_byte), .rx_byte(rx_byte), .rx_valid(rx_valid)
  );

  integer pass_cnt = 0, fail_cnt = 0;

  task automatic chk(input logic ok, input integer n);
    if (ok) begin pass_cnt++; $display("PASS  check_%0d", n); end
    else    begin fail_cnt++; $display("FAIL  check_%0d", n); end
  endtask

  task automatic run_word (
    input  logic [1:0] m,
    input  logic [7:0] d,
    output logic [7:0] rd
  );
    logic cpol; integer i;
    cpol = m[1]; rd = 0;
    mode = m; sck = cpol; @(posedge clk); #1;
    cs_n = 0;             @(posedge clk); #1;
    for (i = 7; i >= 0; i--) begin
      mosi = d[i];  @(posedge clk); #1;
      sck = ~cpol;  @(posedge clk); #1;
      sck =  cpol;  @(posedge clk); #1;
    end
    repeat(2) @(posedge clk); #1;
    rd = rx_byte;
    cs_n = 1; sck = 0; @(posedge clk); #1;
  endtask

  task automatic run_m0_echo (
    input  logic [7:0] d,
    output logic [7:0] rd,
    output logic [7:0] mc
  );
    integer i; rd = 0; mc = 0;
    mode = 2'b00; sck = 0; @(posedge clk); #1;
    cs_n = 0;              @(posedge clk); #1;
    for (i = 7; i >= 0; i--) begin
      mosi = d[i]; @(posedge clk); #1;
      sck = 1;     @(posedge clk); #1;
      mc[i] = miso;
      sck = 0;     @(posedge clk); #1;
    end
    repeat(2) @(posedge clk); #1;
    rd = rx_byte;
    cs_n = 1; @(posedge clk); #1;
  endtask

  logic [7:0] pat[8], echo[4], bm0[4], bm2[4], brx[4], sngl[4], m1p[4], m3p[2];
  logic [7:0] got, mc;
  integer k;

  initial begin
    pat[0]=8'h00; pat[1]=8'hFF; pat[2]=8'hA5; pat[3]=8'h5A;
    pat[4]=8'hAA; pat[5]=8'h55; pat[6]=8'h0F; pat[7]=8'hF0;
    echo[0]=8'hA5; echo[1]=8'h5A; echo[2]=8'hF0; echo[3]=8'h0F;
    bm0[0]=8'hDE; bm0[1]=8'hAD; bm0[2]=8'hBE; bm0[3]=8'hEF;
    bm2[0]=8'h11; bm2[1]=8'h22; bm2[2]=8'h33; bm2[3]=8'h44;
    sngl[0]=8'h01; sngl[1]=8'h02; sngl[2]=8'h80; sngl[3]=8'h40;
    m1p[0]=8'hBB; m1p[1]=8'hCC; m1p[2]=8'hDD; m1p[3]=8'hEE;
    m3p[0]=8'h7E; m3p[1]=8'h81;

    $display("=== 38-Item DV Checklist ===");
    rst_n=0; repeat(2)@(posedge clk); rst_n=1; @(posedge clk); #1;

    $display("-- Category 1: Mode 0 patterns --");
    for (k=0; k<8; k++) begin
      run_word(2'b00, pat[k], got);
      chk(got===pat[k], k+1);
    end

    $display("-- Category 2: All 4 modes / 0xC3 --");
    for (k=0; k<4; k++) begin
      run_word(k[1:0], 8'hC3, got);
      chk(got===8'hC3, k+9);
    end

    $display("-- Category 3: All 4 modes / 0x3C --");
    for (k=0; k<4; k++) begin
      run_word(k[1:0], 8'h3C, got);
      chk(got===8'h3C, k+13);
    end

    $display("-- Category 4: MISO echo --");
    for (k=0; k<4; k++) begin
      tx_byte = echo[k]; @(posedge clk); #1;
      run_m0_echo(8'h00, got, mc);
      chk(mc===echo[k], k+17);
    end

    $display("-- Category 5: Mode 0 burst --");
    begin
      integer i;
      mode=2'b00; cs_n=0; sck=0; @(posedge clk);#1;
      for (k=0;k<4;k++) begin
        for (i=7;i>=0;i--) begin mosi=bm0[k][i];@(posedge clk);#1; sck=1;@(posedge clk);#1; sck=0;@(posedge clk);#1; end
        repeat(2)@(posedge clk);#1; brx[k]=rx_byte;
      end
      cs_n=1; @(posedge clk);#1;
    end
    for (k=0;k<4;k++) chk(brx[k]===bm0[k], k+21);

    $display("-- Category 6: Mode 2 burst --");
    begin
      integer i;
      mode=2'b10; sck=1; @(posedge clk);#1;
      cs_n=0;           @(posedge clk);#1;
      for (k=0;k<4;k++) begin
        for (i=7;i>=0;i--) begin mosi=bm2[k][i];@(posedge clk);#1; sck=0;@(posedge clk);#1; sck=1;@(posedge clk);#1; end
        repeat(2)@(posedge clk);#1; brx[k]=rx_byte;
      end
      cs_n=1; sck=0; @(posedge clk);#1;
    end
    for (k=0;k<4;k++) chk(brx[k]===bm2[k], k+25);

    $display("-- Category 7: Single-bit patterns --");
    for (k=0;k<4;k++) begin
      run_word(2'b00, sngl[k], got);
      chk(got===sngl[k], k+29);
    end

    $display("-- Category 8: Mode 1 alternating --");
    for (k=0;k<4;k++) begin
      run_word(2'b01, m1p[k], got);
      chk(got===m1p[k], k+33);
    end

    $display("-- Category 9: Mode 3 edge cases --");
    for (k=0;k<2;k++) begin
      run_word(2'b11, m3p[k], got);
      chk(got===m3p[k], k+37);
    end

    $display("=== DV Result: %0d/38 PASS ===", pass_cnt);
    if (fail_cnt === 0)
      $display("PASS  all_38_items");
    else
      $display("FAIL  %0d_checks_failed", fail_cnt);
    $display("SPI Verification Engineer certificate — 38-item DV checklist complete; your design is handoff-ready");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  check_1',
        'PASS  check_38',
        'PASS  all_38_items',
        'SPI Verification Engineer certificate'
      ]
    }

  ]
});
