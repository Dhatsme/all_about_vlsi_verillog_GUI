(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi2',
  title: 'SPI Master Design',
  icon: '🕹️',
  level: 'intermediate',
  lessons: [

    // ─── L1: SPI Clock Generator (Tier 2 — line markers) ────────────────────
    {
      id: 'spi2l1',
      title: 'L1 — SPI Clock Generator',
      theory: `
<h2>Generating SCLK from the System Clock</h2>
<p>The SPI master is the only device that produces the clock (SCLK).
Every other chip on the bus is a slave that waits for the master to drive SCLK before
responding. Before you can build a master controller, you need a reliable clock divider
that produces SCLK from your fast system clock — and also tells the rest of the
master logic exactly <em>when</em> SCLK rises and falls.</p>

<p>You built a clock divider in msv2 L4: a counter that rolls over and toggles an output.
This lesson extends that same idea with two extra outputs — <code>sclk_rise</code> and
<code>sclk_fall</code> — single-cycle strobes that fire exactly when SCLK transitions.
These strobes are what the master state machine will use to time its TX shifts and
RX samples precisely.</p>

<h3>Divide-by-8: counter and toggle</h3>
<p>A 2-bit counter counts 0→1→2→3→0→… Every time it hits 3 (2'd3) it resets to 0 and
toggles <code>sclk_r</code>. That means <code>sclk_r</code> changes state every 4 system clocks,
giving a period of 8 system clocks — a divide-by-8 ratio.</p>

<pre class="code-block">// Counter-based toggle — same pattern as msv2 clock divider
always_ff @(posedge clk) begin
  if (rst) begin
    cnt    &lt;= 2'd0;
    sclk_r &lt;= 1'b0;
  end else if (cnt == 2'd3) begin
    cnt    &lt;= 2'd0;
    sclk_r &lt;= ~sclk_r;   // toggle SCLK every 4 system clocks
  end else begin
    cnt &lt;= cnt + 1;
  end
end
</pre>

<h3>Edge strobes from the divided clock</h3>
<p>The master needs to know the exact system clock on which SCLK rises or falls.
Use the same delayed-compare trick from spi1 L3:</p>

<pre class="code-block">always_ff @(posedge clk) sclk_r_prev &lt;= sclk_r;

assign sclk_rise = sclk_r  &amp; ~sclk_r_prev;  // 1 for one system clock on rise
assign sclk_fall = ~sclk_r &amp;  sclk_r_prev;  // 1 for one system clock on fall
assign sclk      = sclk_r;                  // expose the clock to the SPI bus
</pre>

<h3>SCLK waveform timing</h3>
<table class="truth-table">
<tr><th>System clk cycle</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th></tr>
<tr><td>cnt</td><td>0</td><td>1</td><td>2</td><td>3→0</td><td>1</td><td>2</td><td>3→0</td><td>1</td></tr>
<tr><td>sclk_r</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td><td>0</td><td>0</td></tr>
<tr><td>sclk_rise</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
<tr><td>sclk_fall</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td></tr>
</table>

<p>In 64 system clocks you get exactly 8 full SCLK cycles — 8 rising edges and
8 falling edges. That is exactly how many edges are needed to transfer one 8-bit byte.</p>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>1</td><td>System clock</td></tr>
<tr><td>rst</td><td>in</td><td>1</td><td>Active-high synchronous reset</td></tr>
<tr><td>sclk</td><td>out</td><td>1</td><td>SPI clock output to slave</td></tr>
<tr><td>sclk_rise</td><td>out</td><td>1</td><td>One-cycle strobe on rising edge of SCLK</td></tr>
<tr><td>sclk_fall</td><td>out</td><td>1</td><td>One-cycle strobe on falling edge of SCLK</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ── module declaration: spi_clkdiv with opening paren',
        '── Line 2 ── clock input port, comma',
        '── Line 3 ── active-high reset port, comma',
        '── Line 4 ── sclk output port, comma',
        '── Line 5 ── sclk_rise output port, comma',
        '── Line 6 ── sclk_fall output port, NO comma',
        '── Line 7 ── ); close port list',
        '── Line 9 ── declare internal signals: logic [1:0] cnt; logic sclk_r, sclk_r_prev',
        '── Line 13 ── always_ff on posedge clk: rst clears cnt and sclk_r',
        '── Line 16 ── else if cnt == 2\'d3: reset cnt to 0, toggle sclk_r',
        '── Line 19 ── else: increment cnt by 1',
        '── Line 23 ── always_ff on posedge clk: register sclk_r into sclk_r_prev',
        '── Line 25 ── three assign lines: sclk_rise, sclk_fall, sclk',
        '── Line 29 ── endmodule',
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
  logic       sclk_r, sclk_r_prev;

  always_ff @(posedge clk) begin
    if (rst) begin
      cnt    <= 2'd0;
      sclk_r <= 1'b0;
    end else if (cnt == 2'd3) begin
      cnt    <= 2'd0;
      sclk_r <= ~sclk_r;   // toggle every 4 system clocks
    end else begin
      cnt <= cnt + 1;
    end
  end

  always_ff @(posedge clk) sclk_r_prev <= sclk_r;

  assign sclk_rise = sclk_r  & ~sclk_r_prev;
  assign sclk_fall = ~sclk_r &  sclk_r_prev;
  assign sclk      = sclk_r;

endmodule`,
      design:
`// Type the spi_clkdiv module here. See Theory for the concept.
//
// Ports: clk, rst, sclk, sclk_rise, sclk_fall
// Internal: logic [1:0] cnt; logic sclk_r, sclk_r_prev
//
// Delete this comment and start typing:
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

  // Count edges over 64 system clocks — no ++ operator, use = x + 1
  logic [3:0] rise_cnt, fall_cnt;

  initial begin
    $display("=== SPI Clock Generator Test ===");
    rst = 1; repeat(2) @(posedge clk); #1;
    rst = 0;
    rise_cnt = 0; fall_cnt = 0;

    repeat(64) begin
      @(posedge clk); #1;
      if (sclk_rise) rise_cnt = rise_cnt + 1;
      if (sclk_fall) fall_cnt = fall_cnt + 1;
    end

    if (rise_cnt === 4'd8)
      $display("PASS  8 rising edges in 64 system clocks (divide-by-8)");
    else
      $display("FAIL  rise_cnt=%0d expected 8", rise_cnt);

    if (fall_cnt === 4'd8)
      $display("PASS  8 falling edges in 64 system clocks");
    else
      $display("FAIL  fall_cnt=%0d expected 8", fall_cnt);

    if (sclk === 1'b0 || sclk === 1'b1)
      $display("PASS  sclk is a valid driven logic level");
    else
      $display("FAIL  sclk is not a valid logic level");

    $display("SPI clock divider works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  8 rising edges in 64 system clocks',
        'PASS  8 falling edges in 64 system clocks',
        'PASS  sclk is a valid driven logic level',
        'SPI clock divider works!'
      ]
    },

    // ─── L2: SPI Master Mode 0 (Tier 3 — structural guidance) ───────────────
    {
      id: 'spi2l2',
      title: 'L2 — SPI Master Controller (Mode 0)',
      theory: `
<h2>Building a Complete SPI Master</h2>
<p>You now have all the building blocks: PISO (spi1 L2) for transmitting bits, SIPO (spi1 L1)
for receiving them, and a clock divider (spi2 L1) for timing. This lesson combines all
three into a complete SPI master that can send and receive a full byte in a single transaction.</p>

<p>The master controls the entire bus. It drives SCLK, asserts CS_N, puts bits on MOSI,
and samples MISO. The slave just reacts. A real hardware handshake looks like this:</p>
<ul>
  <li>Software sets <code>tx_data</code> and pulses <code>start</code></li>
  <li>Master asserts <code>busy</code>, drops <code>cs_n</code> LOW, loads the TX shift register</li>
  <li>Master generates 8 SCLK cycles, shifting out MOSI and sampling MISO simultaneously</li>
  <li>After bit 7: master deasserts <code>cs_n</code>, latches <code>rx_data</code>, pulses <code>done</code>, clears <code>busy</code></li>
</ul>

<h3>The 4-phase per-bit state machine</h3>
<p>SPI Mode 0 (CPOL=0 CPHA=0) requires:</p>
<ul>
  <li>SCLK idles LOW</li>
  <li>Master samples MISO on the <strong>rising</strong> edge of SCLK</li>
  <li>Master shifts MOSI on the <strong>falling</strong> edge (so MOSI is stable during the rise)</li>
</ul>
<p>To achieve this cleanly, use a 4-phase counter per bit:</p>

<pre class="code-block">// phase 0: SCLK rises  — sample MISO into rx_shift
// phase 1: SCLK high   — hold (setup time for slave)
// phase 2: SCLK falls  — shift tx_shift for next bit, check if done
// phase 3: SCLK low    — hold (MOSI setup time before next rise)
</pre>

<h3>Cycle-by-cycle trace for one bit</h3>
<table class="truth-table">
<tr><th>Phase</th><th>SCLK action</th><th>What happens</th></tr>
<tr><td>3 (pre-start)</td><td>stays LOW</td><td>CS_N asserts, tx_shift loaded, MOSI driven</td></tr>
<tr><td>0</td><td>rises to HIGH</td><td>rx_shift &lt;= {rx_shift[6:0], miso}</td></tr>
<tr><td>1</td><td>stays HIGH</td><td>hold — slave finishing its output</td></tr>
<tr><td>2</td><td>falls to LOW</td><td>if last bit: done, else shift tx, increment bit_cnt</td></tr>
<tr><td>3</td><td>stays LOW</td><td>MOSI settles on new bit before next rise</td></tr>
</table>

<h3>Internal signals to declare</h3>
<table class="truth-table">
<tr><th>Signal</th><th>Width</th><th>Role</th></tr>
<tr><td>tx_shift</td><td>8</td><td>PISO — MSB drives MOSI</td></tr>
<tr><td>rx_shift</td><td>8</td><td>SIPO — assembles incoming bits</td></tr>
<tr><td>bit_cnt</td><td>3</td><td>Counts 0–7</td></tr>
<tr><td>phase</td><td>2</td><td>4-phase counter per bit (0–3)</td></tr>
<tr><td>sclk_r</td><td>1</td><td>Registered SCLK value — drives the pin via assign</td></tr>
<tr><td>busy</td><td>1</td><td>HIGH during a transfer</td></tr>
</table>

<p>Use <code>assign sclk = sclk_r; assign mosi = tx_shift[7];</code> — continuous,
zero-lag connections to the SPI pins.</p>

<p>This is the most complex module in chapter 2 — the 4-phase timing takes a few reads
to click. Work through the cycle trace above with a pencil before coding. That said,
you have built every individual piece already.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_master with ports: clk, rst, start, tx_data[7:0], miso, mosi, sclk, cs_n, busy, rx_data[7:0], done',
        'Declare internal signals: tx_shift[7:0], rx_shift[7:0], bit_cnt[2:0], phase[1:0], sclk_r',
        'Write the main always_ff block — idle case: if !busy and start: assert busy, drop cs_n, load tx_shift, set phase=3',
        'In the busy case: always increment phase (0→1→2→3→0)',
        'Phase 0 action: raise sclk_r, sample MISO into rx_shift via SIPO shift',
        'Phase 2 action: lower sclk_r; if bit_cnt==7: deassert cs_n, latch rx_data, pulse done, clear busy; else shift tx_shift left, increment bit_cnt',
        'Phases 1 and 3: no action (hold periods)',
        'Add two assign lines: sclk = sclk_r and mosi = tx_shift[7]',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_master (
  input  logic       clk, rst, start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);

  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;   // default: done is a one-cycle pulse

    if (rst) begin
      busy    <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_data;
      bit_cnt  <= 0;
      phase    <= 2'd3;   // start with a low-hold before the first rise
    end else if (busy) begin
      phase <= phase + 1;
      unique case (phase)
        2'd0: begin   // SCLK rises — sample MISO
          sclk_r   <= 1;
          rx_shift <= {rx_shift[6:0], miso};
        end
        2'd1: ;       // hold high
        2'd2: begin   // SCLK falls — shift MOSI for next bit
          sclk_r <= 0;
          if (bit_cnt == 3'd7) begin
            cs_n    <= 1;
            rx_data <= {rx_shift[6:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[6:0], 1'b0};
          end
        end
        2'd3: ;       // hold low — MOSI settles before next rise
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];

endmodule`,
      design:
`// Build the spi_master module here. See Theory for the spec.
//
// Ports: clk, rst, start, tx_data[7:0], miso,
//        mosi, sclk, cs_n, busy, rx_data[7:0], done
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  spi_master dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // ── Slave model — preloads 8'hC3, shifts out on SCLK falling edge ──
  logic [7:0] slave_tx;
  logic       sclk_prev, cs_n_prev;
  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end
  logic sclk_rise_det, sclk_fall_det, cs_n_fall_det;
  assign sclk_rise_det = sclk  & ~sclk_prev;
  assign sclk_fall_det = ~sclk &  sclk_prev;
  assign cs_n_fall_det = ~cs_n &  cs_n_prev;
  always_ff @(posedge clk) begin
    if (cs_n_fall_det) slave_tx <= 8'hC3;
    else if (sclk_fall_det) slave_tx <= {slave_tx[6:0], 1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx[7];

  // ── MOSI capture — sample on SCLK rising edge ──
  logic [7:0] mosi_captured;
  logic [2:0] mosi_bit;
  always_ff @(posedge clk) begin
    if (cs_n_fall_det) mosi_bit <= 3'd7;
    else if (sclk_rise_det) begin
      mosi_captured[mosi_bit] <= mosi;
      mosi_bit <= mosi_bit - 1;
    end
  end

  // ── Transfer task — no for+return ──
  task automatic do_xfer(input logic [7:0] tx);
    tx_data = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(100) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== SPI Master Test ===");
    rst = 1; start = 0; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    do_xfer(8'hAB);

    if (rx_data === 8'hC3)
      $display("PASS  received 0xC3 from slave");
    else
      $display("FAIL  rx_data=0x%02h expected 0xC3", rx_data);

    if (mosi_captured === 8'hAB)
      $display("PASS  slave captured 0xAB on MOSI");
    else
      $display("FAIL  mosi_captured=0x%02h expected 0xAB", mosi_captured);

    if (cs_n === 1'b1)
      $display("PASS  cs_n deasserted after transfer");
    else
      $display("FAIL  cs_n still low after transfer");

    $display("SPI master works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  received 0xC3 from slave',
        'PASS  slave captured 0xAB on MOSI',
        'PASS  cs_n deasserted after transfer',
        'SPI master works!'
      ]
    },

    // ─── L3: 16-bit SPI Master (Tier 3 — structural guidance) ───────────────
    {
      id: 'spi2l3',
      title: 'L3 — 16-bit Multi-Byte SPI Transfer',
      theory: `
<h2>Extending to 16 Bits — CS_N Stays Low</h2>
<p>Many real SPI devices expect a 16-bit transaction: a command byte followed by a data byte,
both clocked out in one continuous burst with CS_N held low the entire time.
Sensors, DACs, ADCs, and display controllers all commonly use this pattern.</p>

<p>The change from the 8-bit master (spi2 L2) is small — widen the shift registers
from 8 bits to 16, widen the bit counter from 3 bits to 4, and change the end condition
from <code>bit_cnt == 7</code> to <code>bit_cnt == 15</code>.
CS_N stays asserted (LOW) across all 16 bits because the slave keeps listening as long
as CS_N is held low.</p>

<h3>Two-byte frame layout</h3>
<table class="truth-table">
<tr><th>Bit position</th><th>0 – 7</th><th>8 – 15</th></tr>
<tr><td>cs_n</td><td>0 (asserted)</td><td>0 (still asserted)</td></tr>
<tr><td>MOSI source</td><td>tx_word[15:8] — high byte, MSB first</td><td>tx_word[7:0] — low byte, MSB first</td></tr>
<tr><td>After bit 15</td><td>—</td><td>cs_n=1, done=1, transfer complete</td></tr>
</table>

<p>Because the MSB of a 16-bit value is bit 15, the initial MOSI assign changes to
<code>assign mosi = tx_shift[15];</code> and the shift at the end of each phase-2
moves bits as <code>{tx_shift[14:0], 1'b0}</code>.</p>

<h3>What changes from the 8-bit master</h3>
<ul>
  <li><code>tx_data[7:0]</code> → <code>tx_word[15:0]</code></li>
  <li><code>rx_data[7:0]</code> → <code>rx_word[15:0]</code></li>
  <li><code>tx_shift[7:0]</code>, <code>rx_shift[7:0]</code> → both <code>[15:0]</code></li>
  <li><code>bit_cnt[2:0]</code> → <code>bit_cnt[3:0]</code></li>
  <li>End condition: <code>bit_cnt == 3'd7</code> → <code>bit_cnt == 4'd15</code></li>
  <li><code>assign mosi = tx_shift[15]</code> (MSB of wider register)</li>
</ul>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk, rst, start, miso</td><td>in</td><td>1</td><td>Same as spi_master</td></tr>
<tr><td>tx_word</td><td>in</td><td>16</td><td>16-bit word to transmit (high byte first)</td></tr>
<tr><td>mosi, sclk, cs_n, busy, done</td><td>out</td><td>1</td><td>Same as spi_master</td></tr>
<tr><td>rx_word</td><td>out</td><td>16</td><td>16-bit word received from slave</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_master_16 — ports same as spi_master but tx_word[15:0] and rx_word[15:0]',
        'Widen all internal shift registers to [15:0] and the bit counter to [3:0]',
        'The always_ff logic is identical to spi_master with these two changes:',
        '  — End condition: bit_cnt == 4\'d15 (not 3\'d7)',
        '  — tx_shift shift: {tx_shift[14:0], 1\'b0} (15 bits kept, not 6)',
        'Keep the same 4-phase structure: phase 0 samples MISO, phase 2 shifts or finishes',
        'Change the assign mosi line to use tx_shift[15] instead of tx_shift[7]',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_master_16 (
  input  logic        clk, rst, start,
  input  logic [15:0] tx_word,
  input  logic        miso,
  output logic        mosi, sclk, cs_n, busy, done,
  output logic [15:0] rx_word
);

  logic [15:0] tx_shift, rx_shift;
  logic [3:0]  bit_cnt;
  logic [1:0]  phase;
  logic        sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;

    if (rst) begin
      busy    <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_word;
      bit_cnt  <= 0;
      phase    <= 2'd3;
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
          if (bit_cnt == 4'd15) begin
            cs_n    <= 1;
            rx_word <= {rx_shift[14:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[14:0], 1'b0};
          end
        end
        2'd3: ;
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[15];

endmodule`,
      design:
`// Build the spi_master_16 module here. See Theory for the spec.
//
// Ports: clk, rst, start, tx_word[15:0], miso,
//        mosi, sclk, cs_n, busy, rx_word[15:0], done
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [15:0] tx_word, rx_word;

  spi_master_16 dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_word(tx_word), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .done(done), .rx_word(rx_word)
  );

  // ── Slave model — preloads 16'hDEAD, shifts out on falling edge ──
  logic [15:0] slave_tx;
  logic        sclk_prev, cs_n_prev;
  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end
  logic sclk_rise_det, sclk_fall_det, cs_n_fall_det;
  assign sclk_rise_det = sclk  & ~sclk_prev;
  assign sclk_fall_det = ~sclk &  sclk_prev;
  assign cs_n_fall_det = ~cs_n &  cs_n_prev;
  always_ff @(posedge clk) begin
    if (cs_n_fall_det) slave_tx <= 16'hDEAD;
    else if (sclk_fall_det) slave_tx <= {slave_tx[14:0], 1'b0};
  end
  assign miso = cs_n ? 1'b0 : slave_tx[15];

  // ── MOSI capture ──
  logic [15:0] mosi_captured;
  logic [3:0]  mosi_bit;
  always_ff @(posedge clk) begin
    if (cs_n_fall_det) mosi_bit <= 4'd15;
    else if (sclk_rise_det) begin
      mosi_captured[mosi_bit] <= mosi;
      mosi_bit <= mosi_bit - 1;
    end
  end

  task automatic do_xfer16(input logic [15:0] tx);
    tx_word = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== 16-bit SPI Master Test ===");
    rst = 1; start = 0; tx_word = 0;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    do_xfer16(16'hCAFE);

    if (rx_word === 16'hDEAD)
      $display("PASS  received 16'hDEAD from slave");
    else
      $display("FAIL  rx_word=0x%04h expected 0xDEAD", rx_word);

    if (mosi_captured === 16'hCAFE)
      $display("PASS  slave captured 0xCAFE on MOSI");
    else
      $display("FAIL  mosi_captured=0x%04h expected 0xCAFE", mosi_captured);

    if (cs_n === 1'b1)
      $display("PASS  cs_n deasserted after 16-bit transfer");
    else
      $display("FAIL  cs_n still low after transfer");

    $display("16-bit SPI burst works!");
    $finish;
  end
endmodule`,
      expected: [
        "PASS  received 16'hDEAD from slave",
        'PASS  slave captured 0xCAFE on MOSI',
        'PASS  cs_n deasserted after 16-bit transfer',
        '16-bit SPI burst works!'
      ]
    },

    // ─── L4: Portfolio — Parameterized SPI Master (Tier 5) ──────────────────
    {
      id: 'spi2l4',
      title: 'L4 — Portfolio: Parameterized SPI Master (All 4 Modes)',
      theory: `
<h2>SPI Modes 0–3: The Real World is Messier</h2>
<p>The master you built in L2 works in SPI Mode 0. But the SPI standard defines
<strong>four modes</strong>, determined by two parameters: <strong>CPOL</strong>
(clock polarity) and <strong>CPHA</strong> (clock phase).
Different devices use different modes, and a production SPI master must support all four.</p>

<p>Understanding why modes exist: some devices were designed to work with an idle-high clock,
others idle-low. Some sample on the first edge, others on the second. SPI modes are a
negotiation between these design choices.</p>

<h3>The four SPI modes</h3>
<table class="truth-table">
<tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>SCLK idles</th><th>Master samples MISO on</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>rising edge (leading)</td></tr>
<tr><td>1</td><td>0</td><td>1</td><td>LOW</td><td>falling edge (trailing)</td></tr>
<tr><td>2</td><td>1</td><td>0</td><td>HIGH</td><td>falling edge (leading)</td></tr>
<tr><td>3</td><td>1</td><td>1</td><td>HIGH</td><td>rising edge (trailing)</td></tr>
</table>

<h3>CPOL — clock polarity</h3>
<p>CPOL=0: SCLK rests at 0 between transactions. The first clock edge is a rising edge.<br>
CPOL=1: SCLK rests at 1 between transactions. The first clock edge is a falling edge.</p>

<h3>CPHA — clock phase</h3>
<p>CPHA=0: data is sampled on the <em>leading</em> (first) edge of each SCLK cycle.
MOSI is driven on the clock idle-to-active transition.<br>
CPHA=1: data is sampled on the <em>trailing</em> (second) edge.
MOSI is driven one half-cycle earlier — on the leading edge — and sampled on the trailing edge.</p>

<h3>The portfolio specification</h3>
<p>Build <code>spi_master_param</code> with these parameters:</p>
<ul>
  <li><code>parameter N_BITS = 8</code> — transfer width (supports 8 or 16)</li>
  <li><code>parameter CPOL  = 0</code> — clock polarity</li>
  <li><code>parameter CPHA  = 0</code> — clock phase</li>
  <li><code>parameter CLK_DIV = 4</code> — system clocks per half SCLK period</li>
</ul>

<p>Requirements:</p>
<ul>
  <li>SCLK idles at level <code>CPOL</code> when not transferring</li>
  <li>CPHA=0: sample on the leading edge, shift on the trailing edge</li>
  <li>CPHA=1: shift on the leading edge, sample on the trailing edge</li>
  <li><code>done</code> pulses exactly one clock after the last bit completes</li>
  <li>Full-duplex: simultaneous TX and RX on every transfer</li>
  <li>MISO driven to <code>1'b0</code> when CS_N is deasserted (never <code>1'bz</code>)</li>
</ul>

<p>This is a real interview question at hardware companies. A VLSI engineer who can
parameterise a multi-mode SPI master from scratch is immediately useful on day one.</p>
<p>🎓 <strong>Portfolio piece</strong> — push this to your GitHub when complete.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build it. See 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_master_param with parameters N_BITS, CPOL, CPHA, CLK_DIV',
        'Ports: clk, rst, start, tx_data[N_BITS-1:0], miso / mosi, sclk, cs_n, busy, done, rx_data[N_BITS-1:0]',
        'SCLK must idle at CPOL when not transferring',
        'CLK_DIV counter controls the half-period of SCLK',
        'Use CPHA to determine: leading-edge=sample or leading-edge=shift',
        'Transfer N_BITS bits with CS_N held low throughout',
        'done pulses for exactly one clock after the last bit',
        '🎓 Portfolio piece — push this to your GitHub when complete',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines and the final message should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for spi_master_param

Parameters:
  N_BITS  — word width (use to size shift registers and bit counter)
  CPOL    — idle level of SCLK (initialize sclk_r <= CPOL[0] in reset)
  CPHA    — which edge samples vs shifts
  CLK_DIV — counts to CLK_DIV-1 per half SCLK period

State machine structure:
  IDLE  — wait for start; drive sclk=CPOL; cs_n=1
  START — cs_n=0, load tx_shift, start clk_cnt
  EDGE1 — first edge of SCLK
          CPHA=0: sample MISO here
          CPHA=1: shift MOSI here
  EDGE2 — second edge of SCLK
          CPHA=0: shift MOSI here
          CPHA=1: sample MISO here; if last bit → DONE
  DONE  — cs_n=1, latch rx_data, pulse done, go to IDLE

Clock divider:
  Increment clk_cnt each system clock.
  When clk_cnt == CLK_DIV-1: toggle sclk_r, reset clk_cnt.
  Trigger EDGE1/EDGE2 state transitions on sclk toggle.

Key signals:
  sclk_r   — registered sclk; assign sclk = sclk_r
  tx_shift — N_BITS-wide PISO; assign mosi = tx_shift[N_BITS-1]
  rx_shift — N_BITS-wide SIPO; rx_data <= rx_shift on done
  bit_cnt  — counts 0 to N_BITS-1

MISO when idle:
  assign miso_driven = cs_n ? 1'b0 : tx_shift[N_BITS-1];
  (leave miso as an input; master doesn't drive miso)

Mode summary to verify:
  Mode 0 (CPOL=0 CPHA=0): sclk idles 0, sample on rise, shift on fall
  Mode 1 (CPOL=0 CPHA=1): sclk idles 0, shift on rise, sample on fall
  Mode 2 (CPOL=1 CPHA=0): sclk idles 1, sample on fall, shift on rise
  Mode 3 (CPOL=1 CPHA=1): sclk idles 1, shift on fall, sample on rise`,
      design:
`// Build the spi_master_param module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, miso, mosi, sclk, cs_n, busy, done;
  logic [7:0] tx_data, rx_data;

  // Test Mode 0 (CPOL=0, CPHA=0)
  spi_master_param #(.N_BITS(8), .CPOL(0), .CPHA(0), .CLK_DIV(4)) dut (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso),
    .mosi(mosi), .sclk(sclk), .cs_n(cs_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // MISO = MOSI loopback
  assign miso = cs_n ? 1'b0 : mosi;

  task automatic do_xfer(input logic [7:0] tx);
    tx_data = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== Parameterized SPI Master Test (Mode 0) ===");
    rst = 1; start = 0; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst = 0;

    do_xfer(8'hA5);
    if (rx_data === 8'hA5)
      $display("PASS  Mode 0 loopback 0xA5 -> rx_data=0x%02h", rx_data);
    else
      $display("FAIL  rx_data=0x%02h expected 0xA5", rx_data);

    do_xfer(8'h3C);
    if (rx_data === 8'h3C)
      $display("PASS  Mode 0 loopback 0x3C -> rx_data=0x%02h", rx_data);
    else
      $display("FAIL  rx_data=0x%02h expected 0x3C", rx_data);

    if (sclk === 1'b0)
      $display("PASS  SCLK idles LOW after transfer (CPOL=0)");
    else
      $display("FAIL  SCLK not idle LOW after transfer");

    $display("Parameterized SPI master works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Mode 0 loopback 0xA5',
        'PASS  Mode 0 loopback 0x3C',
        'PASS  SCLK idles LOW after transfer',
        'Parameterized SPI master works!'
      ]
    }

  ] // end lessons
});
