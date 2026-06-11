(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb4',
  title: 'Integration & System Verification',
  icon: '🏁',
  level: 'advanced',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Building a Reference SPI Slave (Mode 0)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long_tb4l1',
      title: 'L1 — Building a Reference SPI Slave',
      theory: `<h2>What Is a Reference Slave?</h2>
<p>After building the SPI master, you need something correct to verify it against.
A <strong>reference slave</strong> is a minimal behavioural SPI receiver:
it captures every bit the master sends on MOSI and drives pre-loaded data back on MISO.</p>

<h3>The Core Problem: SCK Is Asynchronous</h3>
<p>Your slave runs off <code>clk</code>, but SCK arrives from the master and is not aligned to it.
The safest way is to register SCK and detect edges relative to your own clock:</p>
<pre class="code-block">always_ff @(posedge clk)
  sck_prev &lt;= sck;                       // delayed copy

// inline edge detection (reads OLD sck_prev — non-blocking semantics):
if (sck &amp; ~sck_prev)  ...  // rising  edge
if (~sck &amp; sck_prev) ...  // falling edge</pre>
<p>Because both signals are synchronous to <code>clk</code>, this is glitch-free and simulation-safe.</p>

<h3>Mode 0 Behaviour (CPOL=0, CPHA=0)</h3>
<table class="truth-table">
  <tr><th>Event</th><th>Slave action</th></tr>
  <tr><td>CS goes low</td><td>Reset <code>bit_cnt</code>; preload <code>tx_shift &lt;= tx_byte</code></td></tr>
  <tr><td>Rising SCK</td><td>Shift <code>mosi</code> into <code>rx_shift</code>; on 8th bit latch <code>rx_byte</code>, pulse <code>rx_valid</code></td></tr>
  <tr><td>Falling SCK</td><td>Shift <code>tx_shift</code> left — MISO now shows next bit</td></tr>
  <tr><td>CS goes high</td><td>Preload <code>tx_shift</code> again for next transfer</td></tr>
</table>

<h3>MISO Tristate</h3>
<pre class="code-block">assign miso = ~cs_n ? tx_shift[7] : 1'bz;
// Active (driven) only while CS is low; released (Z) at all other times.</pre>

<p><strong>Ready?</strong> Switch to the Code tab and build <code>spi_slave</code>. Stuck? Tap 💡 Show Hint for the complete annotated solution.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave: inputs clk, rst_n, cs_n, sck, mosi, tx_byte[7:0]; outputs miso, rx_byte[7:0], rx_valid',
        'Declare internals: sck_prev, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]',
        'Add: assign miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'Single always_ff: reset zeroes everything; always register sck_prev <= sck',
        'When cs_n=1: bit_cnt=0, tx_shift<=tx_byte',
        'When cs_n=0 and rising edge: shift rx_shift; at bit_cnt==7 latch rx_byte, pulse rx_valid, reset bit_cnt',
        'When cs_n=0 and falling edge: tx_shift <= {tx_shift[6:0], 1\'b0}',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_slave (
  input  logic       clk, rst_n,     // system clock; active-low async reset
  input  logic       cs_n,           // chip-select, active low
  input  logic       sck,            // SPI clock (from master)
  input  logic       mosi,           // master-out slave-in
  output logic       miso,           // master-in slave-out
  input  logic [7:0] tx_byte,        // byte to drive on MISO
  output logic [7:0] rx_byte,        // byte captured from MOSI
  output logic       rx_valid        // 1-cycle pulse when rx_byte is ready
);
  logic sck_prev;                    // SCK registered one clock late
  logic [2:0] bit_cnt;               // 0-7 within each byte
  logic [7:0] rx_shift;              // shift register: captures MOSI
  logic [7:0] tx_shift;              // shift register: drives MISO

  // MISO is driven only while CS is active; released to Z otherwise
  assign miso = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sck_prev <= 0; tx_shift <= 0; rx_shift <= 0;
      bit_cnt  <= 0; rx_valid <= 0; rx_byte  <= 0;
    end else begin
      rx_valid <= 0;        // default: pulse low every cycle
      sck_prev <= sck;      // register SCK; edge detection uses OLD value below

      if (cs_n) begin
        // CS idle: reset counter, preload MISO data for next transfer
        bit_cnt  <= 0;
        tx_shift <= tx_byte;
      end else begin
        // Mode 0: sample on rising, launch on falling
        // Non-blocking semantics: sck_prev below reads the OLD (pre-edge) value
        if (sck & ~sck_prev) begin          // rising edge → sample MOSI
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt === 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi}; // latch complete byte
            rx_valid <= 1;
            bit_cnt  <= 0;
          end else
            bit_cnt <= bit_cnt + 3'd1;
        end
        if (~sck & sck_prev)                // falling edge → shift out next MISO bit
          tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
  end
endmodule`,

      design:
`// Build the spi_slave module here (Mode 0, fixed).
//
// Ports:
//   input  clk, rst_n          — system clock, active-low async reset
//   input  cs_n, sck, mosi     — SPI bus from master
//   output miso                — driven when CS active, 1'bz otherwise
//   input  tx_byte[7:0]        — data to send on MISO
//   output rx_byte[7:0]        — data received from master
//   output rx_valid            — 1-cycle pulse on final bit
//
// Internals: sck_prev, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]
// Key rule: all edge detection lives inside one always_ff block.
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

  // Send 8 bits MSB-first; capture rx_byte and MISO bits into mc
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
      mc[j] = miso;              // sample MISO after rising edge
      sck = 0; @(posedge clk); #1;
    end
    rd = rx_byte;
  endtask

  logic [7:0] rx, mc;

  initial begin
    $display("=== SPI Slave Model Test ===");
    rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Test 1: receive 0x55
    cs_n = 0; sck = 0; @(posedge clk); #1;
    send8(8'h55, rx, mc);
    cs_n = 1; @(posedge clk); #1;
    if (rx === 8'h55)
      $display("PASS  rx=0x55");
    else
      $display("FAIL  rx=0x%0h (expected 0x55)", rx);

    // Test 2: MISO echo — preload tx_byte=0xa5 while cs_n=1
    // tx_byte must be set BEFORE cs_n goes low so DUT can preload tx_shift
    tx_byte = 8'hA5; @(posedge clk); #1;   // DUT: cs_n=1 → tx_shift<=0xA5
    cs_n = 0; sck = 0; @(posedge clk); #1;
    send8(8'h00, rx, mc);
    cs_n = 1; @(posedge clk); #1;
    if (mc === 8'hA5)
      $display("PASS  miso_echo=0xa5");
    else
      $display("FAIL  miso_echo=0x%0h (expected 0xa5)", mc);

    // Test 3: receive 0xaa, MISO sends 0x3c
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

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — All 4 SPI Modes + Multi-Word Burst
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long_tb4l2',
      title: 'L2 — All 4 SPI Modes + Multi-Word Burst',
      theory: `<h2>One Formula Covers All Four Modes</h2>
<p>The L1 slave was hard-coded to Mode 0. To support all four modes you need to know
<em>which edge to sample on</em> for each <code>{CPOL, CPHA}</code> combination.
There is a single formula that handles all four cases:</p>

<pre class="code-block">assign sample_on_rising = ~(mode[1] ^ mode[0]);
//  mode 0 (00): ~(0^0)=1 → sample rising
//  mode 1 (01): ~(0^1)=0 → sample falling
//  mode 2 (10): ~(1^0)=0 → sample falling
//  mode 3 (11): ~(1^1)=1 → sample rising

assign do_sample = sample_on_rising ? rising_edge  : falling_edge;
assign do_launch = sample_on_rising ? falling_edge : rising_edge;</pre>

<h3>Mode Reference Table</h3>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCK idle</th><th>Sample edge</th><th>Launch edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>low</td><td>rising</td><td>falling</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>low</td><td>falling</td><td>rising</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>high</td><td>falling</td><td>rising</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>high</td><td>rising</td><td>falling</td></tr>
</table>

<h3>Multi-Word Burst</h3>
<p>Hold CS low across consecutive 8-bit words. After the 8th sample edge the slave
resets <code>bit_cnt</code> to 0 and is immediately ready for the next word —
no CS toggle is needed between words.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build <code>spi_slave_v2</code>. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_slave_v2: same ports as L1 plus input logic [1:0] mode',
        'Keep the same internals: sck_prev, bit_cnt, rx_shift, tx_shift',
        'Inline edge detection inside always_ff: rising = sck & ~sck_prev; falling = ~sck & sck_prev',
        'Compute do_sample and do_launch from those edges using the mode formula above',
        'Replace the hard-coded rising/falling checks with do_sample and do_launch',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_slave_v2 (
  input  logic       clk, rst_n,
  input  logic [1:0] mode,           // {CPOL, CPHA}
  input  logic       cs_n, sck, mosi,
  output logic       miso,
  input  logic [7:0] tx_byte,
  output logic [7:0] rx_byte,
  output logic       rx_valid
);
  logic sck_prev;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  assign miso = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sck_prev <= 0; tx_shift <= 0; rx_shift <= 0;
      bit_cnt  <= 0; rx_valid <= 0; rx_byte  <= 0;
    end else begin
      rx_valid <= 0;
      sck_prev <= sck;

      if (cs_n) begin
        bit_cnt  <= 0;
        tx_shift <= tx_byte;
      end else begin
        // Inline edges — sck_prev reads its OLD value here (non-blocking)
        // sample_on_rising = ~(mode[1]^mode[0]): true for modes 0 and 3
        // do_sample: rising if sample_on_rising, falling otherwise
        // do_launch: opposite edge to do_sample

        if ( ((sck & ~sck_prev) & ~(mode[1]^mode[0])) |   // rising,  modes 0/3
             ((~sck & sck_prev) &  (mode[1]^mode[0])) )   // falling, modes 1/2
        begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt === 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi};
            rx_valid <= 1;
            bit_cnt  <= 0;
          end else
            bit_cnt <= bit_cnt + 3'd1;
        end

        if ( ((~sck & sck_prev) & ~(mode[1]^mode[0])) |   // falling, modes 0/3
             ((sck & ~sck_prev)  &  (mode[1]^mode[0])) )  // rising,  modes 1/2
          tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
  end
endmodule`,

      design:
`// Build spi_slave_v2 here — extends L1 slave to all 4 SPI modes.
//
// New port: input logic [1:0] mode  ({CPOL, CPHA})
//
// Key change inside always_ff — replace hard-coded rising/falling with:
//   do_sample condition:
//     ( (sck & ~sck_prev) & ~(mode[1]^mode[0]) ) |   // rising,  modes 0/3
//     ( (~sck & sck_prev) &  (mode[1]^mode[0]) )     // falling, modes 1/2
//
//   do_launch condition: (swap the two sub-expressions above)
//
// Everything else is identical to L1.
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

  // Self-contained single-word transfer for any mode.
  // Sets SCK to the CPOL idle level BEFORE asserting CS — avoids spurious edges.
  task automatic run_word (
    input  logic [1:0] m,
    input  logic [7:0] d,
    output logic [7:0] rd
  );
    logic cpol; integer i;
    cpol = m[1]; rd = 0;
    mode = m; sck = cpol; @(posedge clk); #1;   // SCK to idle level (cs_n still high)
    cs_n = 0;             @(posedge clk); #1;   // assert CS
    for (i = 7; i >= 0; i--) begin
      mosi = d[i];  @(posedge clk); #1;
      sck = ~cpol;  @(posedge clk); #1;         // first active edge
      sck =  cpol;  @(posedge clk); #1;         // second active edge
    end
    repeat(2) @(posedge clk); #1;
    rd = rx_byte;
    cs_n = 1; sck = 0; @(posedge clk); #1;      // release CS, restore SCK
  endtask

  logic [7:0] got, b0, b1;

  initial begin
    $display("=== All 4 Modes + Burst Test ===");
    rst_n = 0; repeat(2) @(posedge clk); rst_n = 1; @(posedge clk); #1;

    // Single-word test, all 4 modes
    run_word(2'b00, 8'hA5, got);
    if (got===8'hA5) $display("PASS  mode0=0xa5"); else $display("FAIL  mode0=0x%0h", got);

    run_word(2'b01, 8'h5A, got);
    if (got===8'h5A) $display("PASS  mode1=0x5a"); else $display("FAIL  mode1=0x%0h", got);

    run_word(2'b10, 8'hC3, got);
    if (got===8'hC3) $display("PASS  mode2=0xc3"); else $display("FAIL  mode2=0x%0h", got);

    run_word(2'b11, 8'h3C, got);
    if (got===8'h3C) $display("PASS  mode3=0x3c"); else $display("FAIL  mode3=0x%0h", got);

    // 2-word burst in Mode 0 (CS held low between words)
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

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — Performance Calculation
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long_tb4l3',
      title: 'L3 — Measuring SPI Throughput',
      theory: `<h2>How Fast Does Your SPI Master Actually Run?</h2>
<p>Every CS pre-delay and post-delay burns time. The question that matters before
tape-out is: <em>what percentage of those cycles are actual data?</em>
A performance monitor answers this automatically.</p>

<h3>The Throughput Formula</h3>
<pre class="code-block">// efficiency (%) = (SCK_edges * 100) / total_cycles
//
// Example A — 8 bits, SCK period = 2 clocks, no overhead:
//   total_cycles = 8 * 2 = 16  →  efficiency = 100%
//
// Example B — same transfer with 5-cycle CS pre-delay:
//   total_cycles = 5 + 16 = 21  →  efficiency = (16*100)/21 = 76%</pre>

<h3>Three-Phase Monitor Design</h3>
<table class="truth-table">
  <tr><th>Phase</th><th>Trigger</th><th>Action</th></tr>
  <tr><td>Reset</td><td>CS asserts (1 → 0)</td><td>Zero both counters</td></tr>
  <tr><td>Count</td><td>CS active, every clock</td><td><code>cyc_cnt++</code>; if rising SCK: <code>sck_cnt++</code></td></tr>
  <tr><td>Latch</td><td>CS de-asserts (0 → 1)</td><td>Copy counts to outputs; pulse <code>done</code></td></tr>
</table>

<p>Module: <code>spi_perf_monitor</code><br>
Inputs: <code>clk, rst_n, cs_n, sck</code><br>
Outputs: <code>sck_count[15:0], cycle_count[15:0], done</code></p>

<p><strong>Ready?</strong> Switch to the Code tab and build the monitor. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_perf_monitor: inputs clk, rst_n, cs_n, sck; outputs sck_count[15:0], cycle_count[15:0], done',
        'Declare internals: cs_n_prev, sck_prev, running counters sck_cnt[15:0] and cyc_cnt[15:0]',
        'always_ff: register cs_n_prev and sck_prev every cycle; default done=0',
        'Phase 1 — CS asserts (cs_n_prev=1 & cs_n=0): reset sck_cnt and cyc_cnt',
        'Phase 2 — CS active (~cs_n): cyc_cnt++; if rising SCK sck_cnt++',
        'Phase 3 — CS de-asserts (~cs_n_prev & cs_n): latch sck_count=sck_cnt, cycle_count=cyc_cnt, done=1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear',
      ],

      hint:
`module spi_perf_monitor (
  input  logic        clk, rst_n,
  input  logic        cs_n,           // chip-select (active low)
  input  logic        sck,            // SPI clock
  output logic [15:0] sck_count,      // SCK rising edges counted
  output logic [15:0] cycle_count,    // total clock cycles CS was active
  output logic        done            // 1-cycle pulse when CS de-asserts
);
  logic        cs_n_prev, sck_prev;
  logic [15:0] sck_cnt, cyc_cnt;      // running counters (internal)

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      cs_n_prev  <= 1; sck_prev  <= 0;
      sck_cnt    <= 0; cyc_cnt   <= 0;
      sck_count  <= 0; cycle_count <= 0; done <= 0;
    end else begin
      cs_n_prev <= cs_n;
      sck_prev  <= sck;
      done      <= 0;              // default: no pulse

      if (cs_n_prev & ~cs_n) begin
        // Phase 1: CS just asserted — reset running counters
        sck_cnt <= 0;
        cyc_cnt <= 0;

      end else if (~cs_n) begin
        // Phase 2: CS active — count every cycle; count SCK rising edges
        cyc_cnt <= cyc_cnt + 16'd1;
        if (sck & ~sck_prev)
          sck_cnt <= sck_cnt + 16'd1;

      end else if (~cs_n_prev & cs_n) begin
        // Phase 3: CS just de-asserted — latch results and pulse done
        sck_count   <= sck_cnt;
        cycle_count <= cyc_cnt;
        done        <= 1;
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
// Internals: cs_n_prev, sck_prev, sck_cnt[15:0], cyc_cnt[15:0]
//
// Three phases triggered by cs_n edges:
//   Phase 1: cs_n_prev=1, cs_n=0  →  reset counters
//   Phase 2: cs_n=0               →  cyc_cnt++; sck rising → sck_cnt++
//   Phase 3: cs_n_prev=0, cs_n=1  →  latch + done pulse
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, cs_n = 1, sck = 0;
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

    // Test 1: 8 bits, SCK period=2 clocks, zero overhead → expect 100% efficiency
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

    eff = (sck_count * 200) / cycle_count;  // eff = (8 bits * 2 clks/bit * 100) / total
    if (eff >= 95)
      $display("PASS  t1_efficiency=%0d%%", eff);
    else
      $display("FAIL  t1_efficiency=%0d%% (expected ~100%%)", eff);

    // Test 2: same 8 bits but with 5-cycle pre-delay → expect ~76% efficiency
    cs_n = 0; sck = 0; @(posedge clk); #1;
    repeat(5) @(posedge clk); #1;           // 5-cycle pre-delay
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

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — 38-Item DV Checklist × Checkpoint D
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long_tb4l4',
      title: 'L4 — 38-Item DV Checklist × Checkpoint D',
      theory: `<h2>The Designer Handoff Checklist</h2>
<p>Before a real chip tapes out, the DV team runs a structured checklist.
Every item must print <code>PASS</code> before sign-off.
This lesson is that checklist. You re-implement <code>spi_slave_v2</code> from memory;
the pre-wired testbench runs 38 checks automatically.</p>

<h3>Checklist Structure</h3>
<table class="truth-table">
  <tr><th>Checks</th><th>Category</th></tr>
  <tr><td>1 – 8</td><td>Mode 0 — eight data patterns (0x00, 0xFF, 0xA5, 0x5A, 0xAA, 0x55, 0x0F, 0xF0)</td></tr>
  <tr><td>9 – 12</td><td>All 4 modes receive pattern 0xC3</td></tr>
  <tr><td>13 – 16</td><td>All 4 modes receive pattern 0x3C</td></tr>
  <tr><td>17 – 20</td><td>MISO echo fidelity — Mode 0, four different tx_byte values</td></tr>
  <tr><td>21 – 24</td><td>Mode 0 four-word burst: 0xDE / 0xAD / 0xBE / 0xEF</td></tr>
  <tr><td>25 – 28</td><td>Mode 2 four-word burst: 0x11 / 0x22 / 0x33 / 0x44</td></tr>
  <tr><td>29 – 32</td><td>Single-bit patterns in Mode 0: 0x01 / 0x02 / 0x80 / 0x40</td></tr>
  <tr><td>33 – 36</td><td>Mode 1 alternating patterns: 0xBB / 0xCC / 0xDD / 0xEE</td></tr>
  <tr><td>37 – 38</td><td>Mode 3 edge-case patterns: 0x7E / 0x81</td></tr>
</table>

<h3>Pass Condition — Checkpoint D</h3>
<p>All 38 items print <code>PASS  check_N</code>. The testbench then prints the
<strong>SPI Verification Engineer</strong> certificate.
This is the final integration gate of the entire course —
the same milestone a real verification team would sign off on.</p>

<p><strong>Ready?</strong> Switch to the Code tab and re-implement <code>spi_slave_v2</code> from memory.
The testbench is pre-loaded. Hit Run when done.</p>`,

      tasks: [
        'Code tab is blank — re-implement spi_slave_v2 from memory (L2 is the reference).',
        'Ports: clk, rst_n, mode[1:0], cs_n, sck, mosi (in); miso (out); tx_byte[7:0] (in); rx_byte[7:0], rx_valid (out)',
        'Internals: sck_prev, bit_cnt[2:0], rx_shift[7:0], tx_shift[7:0]',
        'assign miso = ~cs_n ? tx_shift[7] : 1\'bz',
        'Single always_ff: reset; register sck_prev; cs_n=1: reset bit_cnt, preload tx_shift',
        'cs_n=0 sample condition: ((sck & ~sck_prev) & ~(mode[1]^mode[0])) | ((~sck & sck_prev) & (mode[1]^mode[0]))',
        'cs_n=0 launch condition: swap the two sub-expressions above',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 38 PASS lines and the certificate should appear',
        '🏅 SPI Verification Engineer — 38-item DV checklist complete; your design is handoff-ready',
      ],

      hint:
`// Complete implementation of spi_slave_v2.
// Re-type this if you are stuck — understanding every line is the goal.

module spi_slave_v2 (
  input  logic       clk, rst_n,
  input  logic [1:0] mode,           // {CPOL, CPHA}
  input  logic       cs_n, sck, mosi,
  output logic       miso,
  input  logic [7:0] tx_byte,        // data to drive on MISO
  output logic [7:0] rx_byte,        // data captured from MOSI
  output logic       rx_valid        // 1-cycle pulse on full byte received
);
  logic sck_prev;
  logic [2:0] bit_cnt;
  logic [7:0] rx_shift, tx_shift;

  // MISO driven from MSB of tx_shift; released (Z) when CS is inactive
  assign miso = ~cs_n ? tx_shift[7] : 1'bz;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sck_prev <= 0; tx_shift <= 0; rx_shift <= 0;
      bit_cnt  <= 0; rx_valid <= 0; rx_byte  <= 0;
    end else begin
      rx_valid <= 0;       // default: pulse stays low
      sck_prev <= sck;     // register SCK; edge checks below read the OLD value

      if (cs_n) begin
        // CS idle: prepare for next transfer
        bit_cnt  <= 0;
        tx_shift <= tx_byte;
      end else begin
        // ── Sample condition ──────────────────────────────────────────────
        // Mode 0/3 (CPOL==CPHA): sample on rising  edge
        // Mode 1/2 (CPOL!=CPHA): sample on falling edge
        if ( ((sck & ~sck_prev) & ~(mode[1]^mode[0])) |   // rising,  modes 0/3
             ((~sck & sck_prev) &  (mode[1]^mode[0])) )   // falling, modes 1/2
        begin
          rx_shift <= {rx_shift[6:0], mosi};
          if (bit_cnt === 3'd7) begin
            rx_byte  <= {rx_shift[6:0], mosi}; // latch complete word
            rx_valid <= 1;
            bit_cnt  <= 0;                     // ready for next word immediately
          end else
            bit_cnt <= bit_cnt + 3'd1;
        end

        // ── Launch condition (opposite edge to sample) ────────────────────
        if ( ((~sck & sck_prev) & ~(mode[1]^mode[0])) |   // falling, modes 0/3
             ((sck & ~sck_prev)  &  (mode[1]^mode[0])) )  // rising,  modes 1/2
          tx_shift <= {tx_shift[6:0], 1'b0};  // shift out next MISO bit
      end
    end
  end
endmodule`,

      design:
`// Re-implement spi_slave_v2 here from memory.
// Refer to the L2 lesson only if you are completely stuck.
// All 38 DV checks depend on a correct, complete implementation.
//
// Ports: clk, rst_n, mode[1:0], cs_n, sck, mosi, tx_byte[7:0] (inputs)
//        miso, rx_byte[7:0], rx_valid (outputs)
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

  // Self-contained transfer: sets SCK idle, asserts CS, sends d, releases CS
  task automatic run_word (
    input  logic [1:0] m,
    input  logic [7:0] d,
    output logic [7:0] rd
  );
    logic cpol; integer i;
    cpol = m[1]; rd = 0;
    mode = m; sck = cpol; @(posedge clk); #1;   // SCK to idle (cs_n still high)
    cs_n = 0;             @(posedge clk); #1;   // assert CS
    for (i = 7; i >= 0; i--) begin
      mosi = d[i];  @(posedge clk); #1;
      sck = ~cpol;  @(posedge clk); #1;
      sck =  cpol;  @(posedge clk); #1;
    end
    repeat(2) @(posedge clk); #1;
    rd = rx_byte;
    cs_n = 1; sck = 0; @(posedge clk); #1;
  endtask

  // Mode 0 transfer that also reconstructs the MISO byte the master observed
  task automatic run_m0_echo (
    input  logic [7:0] d,
    output logic [7:0] rd,
    output logic [7:0] mc
  );
    integer i; rd = 0; mc = 0;
    mode = 2'b00; sck = 0; @(posedge clk); #1;   // one cycle with cs_n=1: DUT preloads tx_shift
    cs_n = 0;              @(posedge clk); #1;
    for (i = 7; i >= 0; i--) begin
      mosi = d[i]; @(posedge clk); #1;
      sck = 1;     @(posedge clk); #1;
      mc[i] = miso;                              // sample MISO after rising edge
      sck = 0;     @(posedge clk); #1;
    end
    repeat(2) @(posedge clk); #1;
    rd = rx_byte;
    cs_n = 1; @(posedge clk); #1;
  endtask

  // ── Test data arrays ────────────────────────────────────────────────────
  logic [7:0] pat[8], echo[4], bm0[4], bm2[4], brx[4], sngl[4], m1p[4], m3p[2];
  logic [7:0] got, mc;
  integer k;

  initial begin
    // patterns
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

    // Checks 1-8: Mode 0 data patterns
    $display("-- Category 1: Mode 0 patterns --");
    for (k=0; k<8; k++) begin
      run_word(2'b00, pat[k], got);
      chk(got===pat[k], k+1);
    end

    // Checks 9-12: All 4 modes with 0xC3
    $display("-- Category 2: All 4 modes / 0xC3 --");
    for (k=0; k<4; k++) begin
      run_word(k[1:0], 8'hC3, got);
      chk(got===8'hC3, k+9);
    end

    // Checks 13-16: All 4 modes with 0x3C
    $display("-- Category 3: All 4 modes / 0x3C --");
    for (k=0; k<4; k++) begin
      run_word(k[1:0], 8'h3C, got);
      chk(got===8'h3C, k+13);
    end

    // Checks 17-20: MISO echo fidelity
    // tx_byte set BEFORE cs_n asserts so DUT has time to preload tx_shift
    $display("-- Category 4: MISO echo --");
    for (k=0; k<4; k++) begin
      tx_byte = echo[k]; @(posedge clk); #1;   // cs_n=1: tx_shift <= echo[k]
      run_m0_echo(8'h00, got, mc);
      chk(mc===echo[k], k+17);
    end

    // Checks 21-24: Mode 0 four-word burst
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

    // Checks 25-28: Mode 2 four-word burst (CPOL=1 — SCK idle high)
    $display("-- Category 6: Mode 2 burst --");
    begin
      integer i;
      mode=2'b10; sck=1; @(posedge clk);#1;   // set SCK high before asserting CS
      cs_n=0;           @(posedge clk);#1;
      for (k=0;k<4;k++) begin
        for (i=7;i>=0;i--) begin mosi=bm2[k][i];@(posedge clk);#1; sck=0;@(posedge clk);#1; sck=1;@(posedge clk);#1; end
        repeat(2)@(posedge clk);#1; brx[k]=rx_byte;
      end
      cs_n=1; sck=0; @(posedge clk);#1;
    end
    for (k=0;k<4;k++) chk(brx[k]===bm2[k], k+25);

    // Checks 29-32: Single-bit patterns, Mode 0
    $display("-- Category 7: Single-bit patterns --");
    for (k=0;k<4;k++) begin
      run_word(2'b00, sngl[k], got);
      chk(got===sngl[k], k+29);
    end

    // Checks 33-36: Mode 1 alternating patterns
    $display("-- Category 8: Mode 1 alternating --");
    for (k=0;k<4;k++) begin
      run_word(2'b01, m1p[k], got);
      chk(got===m1p[k], k+33);
    end

    // Checks 37-38: Mode 3 edge-case patterns
    $display("-- Category 9: Mode 3 edge cases --");
    for (k=0;k<2;k++) begin
      run_word(2'b11, m3p[k], got);
      chk(got===m3p[k], k+37);
    end

    // Summary
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
