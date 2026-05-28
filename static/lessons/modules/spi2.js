(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi2',
  title: 'SPI Master Design',
  icon: '🕹️',
  level: 'intermediate',
  lessons: [

    // ─── L1: SPI Clock Divider (Tier 2) ─────────────────────────────────────
    {
      id: 'spi2l1',
      title: 'L1 — SPI Clock Generator',
      theory: `
<h2>Slowing the Clock Down for SPI</h2>
<p>A system clock might run at 50 MHz or 100 MHz, but a typical SPI device expects 1–25 MHz.
Before building the full master you need a <strong>clock divider</strong> that takes the fast system
clock and produces a slower SCLK — plus two one-cycle strobe signals
(<code>sclk_rise</code> and <code>sclk_fall</code>) so other logic can act exactly when SCLK transitions.</p>

<p>The divider works by counting system-clock ticks.
When the count reaches a threshold, toggle the output clock and reset the counter.
For a divide-by-8 result (SCLK period = 8 system clocks), toggle every 4 counts.</p>

<pre class="code-block">logic [1:0] cnt;     // counts 0, 1, 2, 3, 0, 1, 2, 3 ...
logic sclk_r;        // registered SCLK output

// Toggle SCLK every 4 system clocks
if (cnt == 2'd3) sclk_r &lt;= ~sclk_r;

// Edge strobes via previous-value comparison
assign sclk_rise = sclk_r &amp; ~sclk_r_prev;
assign sclk_fall = ~sclk_r &amp; sclk_r_prev;
</pre>

<h3>SCLK waveform</h3>
<table class="truth-table">
<tr><th>System clk</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th></tr>
<tr><td>cnt</td><td>0</td><td>1</td><td>2</td><td>3→0</td><td>1</td><td>2</td><td>3→0</td><td>1</td><td>2</td></tr>
<tr><td>sclk_r</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>sclk_rise</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
</table>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>System clock input</td></tr>
<tr><td>rst</td><td>in</td><td>Active-high synchronous reset</td></tr>
<tr><td>sclk</td><td>out</td><td>SPI clock (divide-by-8 of system clock)</td></tr>
<tr><td>sclk_rise</td><td>out</td><td>One-cycle strobe on every SCLK rising edge</td></tr>
<tr><td>sclk_fall</td><td>out</td><td>One-cycle strobe on every SCLK falling edge</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ── module declaration spi_clkdiv with opening paren',
        '── Line 2 ── clock input port, with comma',
        '── Line 3 ── reset input port, with comma',
        '── Line 4 ── sclk output port, with comma',
        '── Line 5 ── sclk_rise output port, with comma',
        '── Line 6 ── sclk_fall output port, no comma',
        '── Line 7 ── ); close port list',
        '── Line 9 ── declare logic [1:0] cnt, logic sclk_r, logic sclk_r_prev',
        '── Line 13 ── always_ff to register sclk_r_prev <= sclk_r on posedge clk',
        '── Line 15 ── always_ff block: reset clears cnt and sclk_r; else increments cnt and toggles sclk_r when cnt==3',
        '── Line 24 ── assign sclk = sclk_r',
        '── Line 25 ── assign sclk_rise = sclk_r & ~sclk_r_prev',
        '── Line 26 ── assign sclk_fall = ~sclk_r & sclk_r_prev',
        '── Line 28 ── endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_clkdiv (
  input  logic clk,
  input  logic rst,
  output logic sclk,
  output logic sclk_rise,
  output logic sclk_fall
);

  logic [1:0] cnt;
  logic       sclk_r;
  logic       sclk_r_prev;

  always_ff @(posedge clk) sclk_r_prev <= sclk_r;

  always_ff @(posedge clk) begin
    if (rst) begin
      cnt    <= 2'd0;
      sclk_r <= 1'b0;
    end else begin
      cnt <= cnt + 1'b1;
      if (cnt == 2'd3) sclk_r <= ~sclk_r;   // toggle every 4 clocks
    end
  end

  assign sclk      = sclk_r;
  assign sclk_rise = sclk_r & ~sclk_r_prev;   // high one cycle on rising edge
  assign sclk_fall = ~sclk_r & sclk_r_prev;   // high one cycle on falling edge

endmodule`,
      design:
`// Type the spi_clkdiv module here. See Theory for the concept.
//
// Ports: clk, rst, sclk, sclk_rise, sclk_fall
// Internal: logic [1:0] cnt, logic sclk_r, logic sclk_r_prev
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, sclk, sclk_rise, sclk_fall;

  spi_clkdiv dut (
    .clk(clk), .rst(rst),
    .sclk(sclk), .sclk_rise(sclk_rise), .sclk_fall(sclk_fall)
  );

  int rise_cnt, fall_cnt;

  initial begin
    $display("=== SPI Clock Divider Test ===");
    rst = 1;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    rise_cnt = 0; fall_cnt = 0;
    repeat(64) begin
      @(posedge clk); #1;
      if (sclk_rise) rise_cnt = rise_cnt + 1;
      if (sclk_fall) fall_cnt = fall_cnt + 1;
    end

    if (rise_cnt === 8)
      $display("PASS  8 rising edges in 64 system clocks (divide-by-8)");
    else
      $display("FAIL  expected 8 rising edges, got %0d", rise_cnt);

    if (fall_cnt === 8)
      $display("PASS  8 falling edges in 64 system clocks");
    else
      $display("FAIL  expected 8 falling edges, got %0d", fall_cnt);

    if (sclk === 1'b0 || sclk === 1'b1)
      $display("PASS  sclk is a valid driven logic level");
    else
      $display("FAIL  sclk is X or Z");

    $display("SPI clock divider works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  8 rising edges',
        'PASS  8 falling edges',
        'PASS  sclk is a valid',
        'SPI clock divider works!'
      ]
    },

    // ─── L2: SPI Master Mode 0 (Tier 3) ─────────────────────────────────────
    {
      id: 'spi2l2',
      title: 'L2 — SPI Master Controller (Mode 0)',
      theory: `
<h2>The SPI Master — Orchestrating a Transaction</h2>
<p>An SPI master controls the clock and initiates every transfer.
In <strong>Mode 0</strong> (CPOL=0, CPHA=0): SCLK idles LOW, data is captured on the <em>rising</em> edge,
and new data is driven on the <em>falling</em> edge.
The master and slave simultaneously exchange one bit per SCLK cycle — this is full-duplex communication.</p>

<p>A clean implementation uses a 4-phase state machine per bit.
Each bit takes exactly 4 system clocks to transfer:</p>

<pre class="code-block">// 4 phases per bit — controlled by a 2-bit phase counter
// Phase 0: SCLK rises  — sample MISO into rx_shift
// Phase 1: SCLK high   — hold
// Phase 2: SCLK falls  — shift tx for next bit (or finish)
// Phase 3: SCLK low    — hold / MOSI setup
</pre>

<h3>One 8-bit SPI transfer (Mode 0)</h3>
<table class="truth-table">
<tr><th>Step</th><th>cs_n</th><th>sclk</th><th>MOSI</th><th>MISO sampled</th></tr>
<tr><td>CS assert</td><td>0</td><td>0</td><td>bit 7</td><td>—</td></tr>
<tr><td>Bit 0</td><td>0</td><td>↑</td><td>bit 7</td><td>slave bit 7</td></tr>
<tr><td>Bit 0</td><td>0</td><td>↓</td><td>→ bit 6</td><td>—</td></tr>
<tr><td>…</td><td>0</td><td>…</td><td>…</td><td>…</td></tr>
<tr><td>Bit 7</td><td>0</td><td>↑</td><td>bit 0</td><td>slave bit 0</td></tr>
<tr><td>CS deassert</td><td>1</td><td>0</td><td>—</td><td>—</td></tr>
</table>

<h3>Ports</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>System clock and reset</td></tr>
<tr><td>start</td><td>in</td><td>Pulse to begin transfer</td></tr>
<tr><td>tx_data[7:0]</td><td>in</td><td>Byte to transmit</td></tr>
<tr><td>miso</td><td>in</td><td>Serial data from slave</td></tr>
<tr><td>mosi</td><td>out</td><td>Serial data to slave</td></tr>
<tr><td>sclk, cs_n</td><td>out</td><td>SPI clock and chip select</td></tr>
<tr><td>busy, done</td><td>out</td><td>Transfer in-progress / just-completed flags</td></tr>
<tr><td>rx_data[7:0]</td><td>out</td><td>Byte received from slave</td></tr>
</table>

<p>This is a real interview question at hardware companies. Take your time with it.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_master with all ports listed in the Theory tab',
        'Declare internals: tx_shift[7:0], rx_shift[7:0], bit_cnt[2:0], sclk_r, phase[1:0]',
        'Write the always_ff block. On reset: clear everything, cs_n=1.',
        'On start (not busy): assert cs_n=0, load tx_data, set phase=3 (one hold cycle before first SCLK)',
        'When busy, increment phase each clock and implement a case statement:',
        '  phase 0: sclk_r=1, rx_shift <= {rx_shift[6:0], miso}',
        '  phase 1: hold',
        '  phase 2: sclk_r=0; if last bit: deassert cs_n, set done, save rx_data; else increment bit_cnt and shift tx_shift',
        '  phase 3: hold',
        'Add: assign sclk = sclk_r;   assign mosi = tx_shift[7];',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_master (
  input  logic       clk,
  input  logic       rst,
  input  logic       start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi,
  output logic       sclk,
  output logic       cs_n,
  output logic       busy,
  output logic [7:0] rx_data,
  output logic       done
);

  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic       sclk_r;
  logic [1:0] phase;

  always_ff @(posedge clk) begin
    if (rst) begin
      busy <= 0; done <= 0; sclk_r <= 0; cs_n <= 1;
      bit_cnt <= 0; phase <= 0;
      tx_shift <= 0; rx_shift <= 0; rx_data <= 0;
    end else begin
      done <= 0;
      if (!busy && start) begin
        busy     <= 1;
        cs_n     <= 0;
        tx_shift <= tx_data;
        bit_cnt  <= 0;
        phase    <= 2'd3;    // hold CS low one cycle before first SCLK
        sclk_r   <= 0;
      end else if (busy) begin
        phase <= phase + 1;
        unique case (phase)
          2'd0: begin                          // SCLK rising
            sclk_r   <= 1;
            rx_shift <= {rx_shift[6:0], miso}; // sample MISO
          end
          2'd1: ;                              // hold high
          2'd2: begin                          // SCLK falling
            sclk_r <= 0;
            if (bit_cnt == 3'd7) begin
              busy    <= 0;
              cs_n    <= 1;
              done    <= 1;
              rx_data <= rx_shift;
            end else begin
              bit_cnt  <= bit_cnt + 1;
              tx_shift <= {tx_shift[6:0], 1'b0};  // shift next MOSI bit
            end
          end
          2'd3: ;                              // hold low / MOSI setup
        endcase
      end
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];   // MSB always on MOSI

endmodule`,
      design:
`// Type the spi_master module here. See Theory for the full spec.
//
// Ports: clk, rst, start, tx_data[7:0], miso, mosi, sclk, cs_n, busy, rx_data[7:0], done
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  spi_master dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .rx_data(rx_data), .done(done)
  );

  // Slave model: drives 0xC3 on MISO (preloads on CS assert)
  logic [7:0] slave_tx;
  logic sclk_prev, cs_n_prev;

  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end

  logic sclk_rise_det, sclk_fall_det, cs_n_fall_det;
  assign sclk_rise_det = sclk  & ~sclk_prev;
  assign sclk_fall_det = ~sclk & sclk_prev;
  assign cs_n_fall_det = ~cs_n & cs_n_prev;

  always_ff @(posedge clk) begin
    if (cs_n_fall_det)
      slave_tx <= 8'hC3;
    else if (sclk_fall_det)
      slave_tx <= {slave_tx[6:0], 1'b0};
  end

  assign miso = cs_n ? 1'b0 : slave_tx[7];

  // Capture MOSI to verify what was sent
  logic [7:0] mosi_captured;
  always_ff @(posedge clk) begin
    if (cs_n)
      mosi_captured <= 8'h00;
    else if (sclk_rise_det)
      mosi_captured <= {mosi_captured[6:0], mosi};
  end

  task automatic do_xfer(input logic [7:0] tx);
    tx_data = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(100) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Master Mode-0 Test ===");
    rst = 1; start = 0; tx_data = 8'h00;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    do_xfer(8'hAB);

    if (rx_data === 8'hC3)
      $display("PASS  received 0xC3 from slave");
    else
      $display("FAIL  expected rx=0xC3 got 0x%02h", rx_data);

    if (mosi_captured === 8'hAB)
      $display("PASS  slave captured 0xAB on MOSI");
    else
      $display("FAIL  slave got 0x%02h on MOSI, expected 0xAB", mosi_captured);

    if (cs_n === 1'b1)
      $display("PASS  cs_n deasserted after transfer");
    else
      $display("FAIL  cs_n still asserted after transfer");

    $display("SPI master works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  received 0xC3 from slave',
        'PASS  slave captured 0xAB on MOSI',
        'PASS  cs_n deasserted',
        'SPI master works!'
      ]
    },

    // ─── L3: Multi-Byte Burst Transfer (Tier 3) ─────────────────────────────
    {
      id: 'spi2l3',
      title: 'L3 — Multi-Byte SPI Transfer',
      theory: `
<h2>Keeping CS_N Low Across Multiple Bytes</h2>
<p>Many SPI devices expect a <strong>burst</strong>: CS_N stays low while the master sends several bytes
in sequence without gaps between them.
A memory chip, for example, first receives a command byte, then an address byte, then data — all in one
unbroken transaction.</p>

<p>Extending the single-byte master is straightforward: replace the 8-bit shift registers with 16-bit ones
and count 0–15 instead of 0–7.
CS_N stays low across all 16 bits and deasserts only when bit_cnt reaches 15.</p>

<pre class="code-block">// 16-bit burst — same 4-phase logic, just wider registers
logic [15:0] tx_shift, rx_shift;
logic  [3:0] bit_cnt;           // counts 0–15

if (bit_cnt == 4'd15) begin     // last bit
  done    &lt;= 1; busy &lt;= 0; cs_n &lt;= 1;
  rx_word &lt;= rx_shift;
end else
  bit_cnt &lt;= bit_cnt + 1;
</pre>

<h3>Two-byte transfer timeline</h3>
<table class="truth-table">
<tr><th>Bit</th><th>0–7</th><th>8–15</th></tr>
<tr><td>cs_n</td><td>0 (asserted)</td><td>0 (still low!)</td></tr>
<tr><td>MOSI source</td><td>tx_word[15:8] MSB first</td><td>tx_word[7:0] MSB first</td></tr>
<tr><td>After bit 15</td><td>—</td><td>cs_n=1, done=1</td></tr>
</table>

<h3>Ports</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>tx_word[15:0]</td><td>in</td><td>Two bytes: [15:8]=byte0, [7:0]=byte1</td></tr>
<tr><td>rx_word[15:0]</td><td>out</td><td>Two bytes received from slave</td></tr>
<tr><td>bit_cnt[3:0]</td><td>out</td><td>Current bit (0–15) — exposed for debugging</td></tr>
<tr><td>Others</td><td>—</td><td>Same as single-byte master</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_master_16 with ports: clk, rst, start, tx_word[15:0], miso, mosi, sclk, cs_n, busy, rx_word[15:0], bit_cnt[3:0], done',
        'Declare internals: tx_shift[15:0], rx_shift[15:0], bit_cnt_r[3:0], sclk_r, phase[1:0]',
        'Keep the same 4-phase state machine as spi_master (L2)',
        'On start: load tx_word into tx_shift, set bit_cnt_r=0, phase=3',
        'Phase 0: SCLK rises, shift MISO into rx_shift (16-bit concatenation)',
        'Phase 2: SCLK falls; if bit_cnt_r==15: finish; else increment bit_cnt_r and shift tx_shift',
        'Expose bit_cnt_r on the bit_cnt output port',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_master_16 (
  input  logic        clk,
  input  logic        rst,
  input  logic        start,
  input  logic [15:0] tx_word,
  input  logic        miso,
  output logic        mosi,
  output logic        sclk,
  output logic        cs_n,
  output logic        busy,
  output logic [15:0] rx_word,
  output logic  [3:0] bit_cnt,
  output logic        done
);

  logic [15:0] tx_shift, rx_shift;
  logic  [3:0] bit_cnt_r;
  logic        sclk_r;
  logic  [1:0] phase;

  always_ff @(posedge clk) begin
    if (rst) begin
      busy <= 0; done <= 0; sclk_r <= 0; cs_n <= 1;
      bit_cnt_r <= 0; phase <= 0;
      tx_shift <= 0; rx_shift <= 0; rx_word <= 0;
    end else begin
      done <= 0;
      if (!busy && start) begin
        busy      <= 1;
        cs_n      <= 0;
        tx_shift  <= tx_word;
        bit_cnt_r <= 0;
        phase     <= 2'd3;
        sclk_r    <= 0;
      end else if (busy) begin
        phase <= phase + 1;
        unique case (phase)
          2'd0: begin
            sclk_r   <= 1;
            rx_shift <= {rx_shift[14:0], miso};
          end
          2'd1: ;
          2'd2: begin
            sclk_r <= 0;
            if (bit_cnt_r == 4'd15) begin
              busy    <= 0;
              cs_n    <= 1;
              done    <= 1;
              rx_word <= rx_shift;
            end else begin
              bit_cnt_r <= bit_cnt_r + 1;
              tx_shift  <= {tx_shift[14:0], 1'b0};
            end
          end
          2'd3: ;
        endcase
      end
    end
  end

  assign sclk    = sclk_r;
  assign mosi    = tx_shift[15];
  assign bit_cnt = bit_cnt_r;

endmodule`,
      design:
`// Type the spi_master_16 module here. See Theory for the concept.
//
// Ports: clk, rst, start, tx_word[15:0], miso,
//        mosi, sclk, cs_n, busy, rx_word[15:0], bit_cnt[3:0], done
//
// Same 4-phase machine as spi_master — just 16 bits wide.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [15:0] tx_word, rx_word;
  logic [3:0]  bit_cnt;

  spi_master_16 dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_word(tx_word), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .rx_word(rx_word), .bit_cnt(bit_cnt), .done(done)
  );

  // Slave model: drives 0xDEAD on MISO (16-bit)
  logic [15:0] slave_tx;
  logic sclk_prev, cs_n_prev;
  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end
  logic sclk_rise_d, sclk_fall_d, cs_n_fall_d;
  assign sclk_rise_d = sclk  & ~sclk_prev;
  assign sclk_fall_d = ~sclk & sclk_prev;
  assign cs_n_fall_d = ~cs_n & cs_n_prev;

  always_ff @(posedge clk) begin
    if (cs_n_fall_d)
      slave_tx <= 16'hDEAD;
    else if (sclk_fall_d)
      slave_tx <= {slave_tx[14:0], 1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx[15];

  // Capture MOSI
  logic [15:0] mosi_cap;
  always_ff @(posedge clk) begin
    if (cs_n)       mosi_cap <= 16'h0000;
    else if (sclk_rise_d) mosi_cap <= {mosi_cap[14:0], mosi};
  end

  task automatic do_xfer16(input logic [15:0] tx);
    tx_word = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI 16-bit Master Test ===");
    rst = 1; start = 0; tx_word = 16'h0000;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    do_xfer16(16'hCAFE);

    if (rx_word === 16'hDEAD)
      $display("PASS  received 16'hDEAD from slave");
    else
      $display("FAIL  expected 0xDEAD got 0x%04h", rx_word);

    if (mosi_cap === 16'hCAFE)
      $display("PASS  slave captured 0xCAFE on MOSI");
    else
      $display("FAIL  MOSI captured 0x%04h expected 0xCAFE", mosi_cap);

    if (cs_n === 1'b1)
      $display("PASS  cs_n deasserted after 16-bit transfer");
    else
      $display("FAIL  cs_n still asserted");

    $display("16-bit SPI burst works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  received 16\'hDEAD',
        'PASS  slave captured 0xCAFE',
        'PASS  cs_n deasserted',
        '16-bit SPI burst works!'
      ]
    },

    // ─── L4: Portfolio — Parameterized SPI Master (Tier 5) ──────────────────
    {
      id: 'spi2l4',
      title: 'L4 — Portfolio: Parameterized SPI Master',
      theory: `
<h2>Portfolio Project: Configurable SPI Master</h2>
<p>The SPI standard defines four clock modes determined by two bits:</p>

<table class="truth-table">
<tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCLK idle</th><th>Sample on</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>rising edge</td></tr>
<tr><td>1</td><td>0</td><td>1</td><td>LOW</td><td>falling edge</td></tr>
<tr><td>2</td><td>1</td><td>0</td><td>HIGH</td><td>falling edge</td></tr>
<tr><td>3</td><td>1</td><td>1</td><td>HIGH</td><td>rising edge</td></tr>
</table>

<p>Your task: build a fully parameterized SPI master that works correctly across all four modes.
This is the kind of IP block used in every modern SoC — FPGA toolchains ship with one,
and every hardware engineer has written at least one from scratch.</p>

<h3>Full specification</h3>
<ul>
  <li>Parameters: <code>N_BITS</code> (transfer width, default 8), <code>CPOL</code> (0 or 1), <code>CPHA</code> (0 or 1), <code>CLK_DIV</code> (SCLK divider, default 4)</li>
  <li>SCLK idles at CPOL value when cs_n=1</li>
  <li>CPHA=0: data setup before first edge, sample on first edge</li>
  <li>CPHA=1: data setup on first edge, sample on second edge</li>
  <li>Full-duplex: simultaneous TX and RX on every transfer</li>
  <li>Ports: clk, rst, start, tx_data[N_BITS-1:0], miso, mosi, sclk, cs_n, busy, rx_data[N_BITS-1:0], done</li>
  <li>A <code>done</code> pulse must appear exactly one clock after the last bit is transferred</li>
</ul>

<h3>Suggested approach</h3>
<ul>
  <li>Parameterize the counter width using <code>$clog2(N_BITS)</code></li>
  <li>Use a generate block or conditional logic for CPOL idle state</li>
  <li>Use CPHA to decide which clock edge samples vs shifts</li>
  <li>Write separate testbenches for all four modes</li>
</ul>

<p>This is a real interview question at hardware companies — they will ask you to explain every design decision.</p>
<p>🎓 Portfolio piece — push this to your GitHub when complete</p>
`,
      tasks: [
        'Code tab is blank — design from scratch.',
        'Implement spi_master_param with parameters: N_BITS=8, CPOL=0, CPHA=0, CLK_DIV=4',
        'SCLK must idle at CPOL when cs_n=1',
        'For CPHA=0: present data before first SCLK edge, sample on first edge',
        'For CPHA=1: first SCLK edge shifts TX, second edge samples RX',
        'Transfer exactly N_BITS bits per assertion of start',
        'done must pulse for exactly one clock cycle after the last bit',
        'Write testbench covering Mode 0 (CPOL=0 CPHA=0) and Mode 3 (CPOL=1 CPHA=1)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
        '🎓 Portfolio piece — push this to your GitHub when complete',
      ],
      hint:
`DESIGN NOTES for spi_master_param:

  Parameters:
    N_BITS  — transfer width (use $clog2(N_BITS) for counter width)
    CPOL    — idle polarity of SCLK
    CPHA    — clock phase (0 = sample on leading edge, 1 = sample on trailing edge)
    CLK_DIV — system-clock ticks per half SCLK period

  SCLK generation:
    Use a counter that counts to CLK_DIV-1, then toggles sclk_r
    When idle (cs_n=1): drive sclk_r = CPOL (parameter)

  Mode 0 (CPOL=0, CPHA=0):
    Leading edge = rising: sample MISO on rising, shift MOSI on falling
    Equivalent to the spi_master you built in L2

  Mode 1 (CPOL=0, CPHA=1):
    Leading edge = rising but data changes ON rising, sample on falling
    Same SCLK waveform as Mode 0, but phase is shifted by one half-period

  Mode 2 (CPOL=1, CPHA=0):
    Same sample/shift timing as Mode 0 but SCLK idles HIGH

  Mode 3 (CPOL=1, CPHA=1):
    Same as Mode 1 but SCLK idles HIGH

  Hint for CPHA implementation:
    CPHA=0: start transfer with a rising edge first (sample = CPHA XOR CPOL)
    CPHA=1: start transfer with a falling edge first
    Or: use (CPOL XOR CPHA) to determine which edge samples

  Ports needed:
    input  logic                   clk, rst, start, miso
    input  logic [N_BITS-1:0]      tx_data
    output logic                   mosi, sclk, cs_n, busy, done
    output logic [N_BITS-1:0]      rx_data`,
      design:
`// Build the spi_master_param module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  // Instantiate Mode 0 (default parameters)
  spi_master_param #(.N_BITS(8), .CPOL(0), .CPHA(0), .CLK_DIV(4)) dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .rx_data(rx_data), .done(done)
  );

  // Simple loopback: MISO = MOSI (slave echoes back)
  assign miso = mosi;

  task automatic do_xfer(input logic [7:0] tx);
    tx_data = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== Parameterized SPI Master Test ===");
    rst = 1; start = 0; tx_data = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    do_xfer(8'h5A);
    if (rx_data === 8'h5A)
      $display("PASS  Mode0 loopback 0x5A");
    else
      $display("FAIL  Mode0 expected 0x5A got 0x%02h", rx_data);

    do_xfer(8'hA5);
    if (rx_data === 8'hA5)
      $display("PASS  Mode0 loopback 0xA5");
    else
      $display("FAIL  Mode0 expected 0xA5 got 0x%02h", rx_data);

    $display("Parameterized SPI master works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Mode0 loopback 0x5A',
        'PASS  Mode0 loopback 0xA5',
        'Parameterized SPI master works!'
      ]
    }

  ] // end lessons
});
