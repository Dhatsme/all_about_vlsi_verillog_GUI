(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long4',
  title: 'RX FIFO Design',
  icon: '📥',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Push Side & Underflow (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long4l1',
      title: 'L1 — Push Side & Underflow',

      theory: `
<h2>The RX FIFO: Data Arrives from Hardware, Not Software</h2>
<p>
  The TX FIFO is written by the CPU and read by the SPI engine. The RX FIFO is the
  mirror: it is <strong>written by the SPI shift register</strong> every time a word
  completes, and <strong>read by the CPU</strong> when it polls or is interrupted.
</p>
<p>
  The structural design is identical to the TX FIFO — same pointer arithmetic, same
  MSB wrap trick, same storage array. What changes is the <em>perspective</em>:
</p>

<table class="truth-table">
  <tr><th>Signal</th><th>TX FIFO driven by</th><th>RX FIFO driven by</th></tr>
  <tr><td>wr_en / wr_data</td><td>CPU (APB write)</td><td>SPI shift register (word_done)</td></tr>
  <tr><td>rd_en / rd_data</td><td>SPI shift register</td><td>CPU (APB read)</td></tr>
  <tr><td>Overflow → drop</td><td>CPU writes too fast</td><td>SPI engine produces faster than CPU reads</td></tr>
  <tr><td>Underflow → 0</td><td>SPI reads empty</td><td>CPU reads before data arrives</td></tr>
</table>

<h3>New Error: Underflow on Read</h3>
<p>
  In the TX FIFO, reading an empty FIFO is harmless — the SPI engine simply idles.
  In the RX FIFO, the CPU reading an empty FIFO is a real error: the read returns
  stale or undefined data. The hardware should record this with a
  <strong>sticky underflow flag</strong> (<code>udf_sticky</code>) and return
  <code>0x00000000</code> rather than exposing unpredictable memory contents.
</p>

<pre class="code-block">
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n)            udf_sticky &lt;= 1'b0;
  else if (rd_en &amp;&amp; empty) udf_sticky &lt;= 1'b1;  // underflow
  else if (clr_udf)      udf_sticky &lt;= 1'b0;    // W1C clear
end
</pre>

<p>
  The <code>rd_data</code> output should be forced to zero on an underflow read.
  The pointer does <em>not</em> advance — there is nothing to pop.
</p>

<h3>What You Will Build</h3>
<p>
  Module <code>spi_rx_fifo</code> — same structure as <code>spi_tx_fifo</code>
  from L1 of the previous chapter, but with the <code>udf_sticky</code> underflow
  flag replacing the overflow flag, and <code>rd_data</code> zeroed on an empty read.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Module name is spi_rx_fifo (not spi_tx_fifo)',
        '── Port ── input logic clk, rst_n',
        '── Port ── input logic wr_en, rd_en   ← wr_en comes from SPI shift register',
        '── Port ── input logic clr_udf         ← W1C: clears udf_sticky',
        '── Port ── input logic [7:0] wr_data',
        '── Port ── output logic [7:0] rd_data',
        '── Port ── output logic full, empty',
        '── Port ── output logic udf_sticky     ← set when rd_en fires while empty',
        'Copy the MSB wrap-bit pointer logic from spi_tx_fifo L1',
        'Add separate always_ff for udf_sticky: set on (rd_en && empty), clear on clr_udf',
        'In the pointer always_ff: rd_en && empty → do NOT advance rd_ptr; rd_data stays 0',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_rx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic       clr_udf,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic       full, empty,
  output logic       udf_sticky
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign empty = (wr_ptr === rd_ptr);
  assign full  = (wr_ptr[2:0] === rd_ptr[2:0]) && (wr_ptr[3] !== rd_ptr[3]);

  // Underflow flag — set beats clear
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)              udf_sticky <= 1'b0;
    else if (rd_en && empty) udf_sticky <= 1'b1;   // CPU reads nothing
    else if (clr_udf)        udf_sticky <= 1'b0;
  end

  // Pointer and storage
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr  <= 4'b0;
      rd_ptr  <= 4'b0;
      rd_data <= 8'b0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[2:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[2:0]];
        rd_ptr  <= rd_ptr + 1;
      end else if (rd_en && empty) begin
        rd_data <= 8'b0;               // force zero on underflow
      end
    end
  end

endmodule`,

      design:
`// Type the spi_rx_fifo module here.
// Same structure as spi_tx_fifo but from the hardware-push perspective.
//
// Ports:
//   input  logic       clk, rst_n
//   input  logic       wr_en      — written by SPI shift register (word_done)
//   input  logic       rd_en      — read by CPU via APB
//   input  logic       clr_udf    — W1C: clears udf_sticky
//   input  logic [7:0] wr_data
//   output logic [7:0] rd_data    — 0x00 when read while empty
//   output logic       full, empty
//   output logic       udf_sticky — set when rd_en && empty; stays until clr_udf
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en, clr_udf;
  logic [7:0] wr_data, rd_data;
  logic       full, empty, udf_sticky;

  spi_rx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .clr_udf(clr_udf),
    .wr_data(wr_data), .rd_data(rd_data),
    .full(full), .empty(empty),
    .udf_sticky(udf_sticky)
  );

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; clr_udf = 0; wr_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: empty on reset ---
    if (empty === 1'b1 && udf_sticky === 1'b0)
      $display("PASS  reset: empty=1 udf=0");
    else
      $display("FAIL  reset: empty=%0b udf=%0b", empty, udf_sticky);

    // --- Test 2: SPI engine pushes three words, CPU reads them back ---
    wr_en = 1;
    wr_data = 8'hD4; @(posedge clk); #1;
    wr_data = 8'h2B; @(posedge clk); #1;
    wr_data = 8'hE7; @(posedge clk); #1;
    wr_en = 0;

    rd_en = 1; @(posedge clk); #1;
    rd_en = 0; @(posedge clk); #1;
    if (rd_data === 8'hD4)
      $display("PASS  read[0]: rd_data=0x%02h", rd_data);
    else
      $display("FAIL  read[0]: rd_data=0x%02h (expected 0xD4)", rd_data);

    // --- Test 3: underflow — CPU reads from empty FIFO ---
    rd_en = 1; @(posedge clk); #1; @(posedge clk); #1; rd_en = 0; @(posedge clk); #1;
    rd_en = 1; @(posedge clk); #1; rd_en = 0; @(posedge clk); #1;
    if (udf_sticky === 1'b1 && rd_data === 8'h00)
      $display("PASS  underflow: udf=1 rd_data=0x00");
    else
      $display("FAIL  underflow: udf=%0b rd_data=0x%02h", udf_sticky, rd_data);

    // --- Test 4: clr_udf clears the flag ---
    clr_udf = 1; @(posedge clk); #1; clr_udf = 0;
    if (udf_sticky === 1'b0)
      $display("PASS  clr_udf: udf=0");
    else
      $display("FAIL  clr_udf: udf=%0b (expected 0)", udf_sticky);

    $display("RX FIFO underflow test done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: empty=1 udf=0',
        'PASS  read[0]: rd_data=0xD4',
        'PASS  underflow: udf=1 rd_data=0x00',
        'RX FIFO underflow test done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Level, Watermarks & Overflow (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long4l2',
      title: 'L2 — Level, Watermarks & Overflow',

      theory: `
<h2>Adding the Full Flag Set to the RX FIFO</h2>
<p>
  Now apply the same level, watermark, and overflow logic that you built for the TX
  FIFO, but to <code>spi_rx_fifo</code>. The formulas are identical — the only
  change is that in the RX path the overflow condition means the SPI engine produced
  data faster than the CPU consumed it (instead of the CPU writing too fast).
</p>

<h3>Recap: Level and Flags</h3>
<pre class="code-block">
assign level        = wr_ptr - rd_ptr;
assign empty        = (level === 4'd0);
assign full         = (level === 4'd8);
assign almost_empty = (level &lt;= ae_thresh);
assign almost_full  = (level &gt;= af_thresh);
</pre>

<h3>RX Overflow Semantics</h3>
<p>
  When the shift register fires <code>wr_en</code> while the FIFO is full, the
  incoming word is dropped — the shift register does not stall. The sticky flag
  <code>ovf_sticky</code> is set so the CPU knows data was lost.
</p>
<p>
  In real hardware this is a serious event: it means the CPU DMA or interrupt handler
  was not draining the FIFO fast enough. The firmware response is usually to flush
  and restart the transfer.
</p>

<h3>What You Will Build</h3>
<p>
  Extend the L1 <code>spi_rx_fifo</code> with:
</p>
<ul>
  <li><code>level [3:0]</code>, <code>almost_empty</code>, <code>almost_full</code></li>
  <li>Programmable thresholds <code>ae_thresh</code>, <code>af_thresh</code></li>
  <li><code>ovf_sticky</code> (set on write-while-full) and <code>clr_ovf</code> input</li>
</ul>
<p>
  Both <code>udf_sticky</code> and <code>ovf_sticky</code> exist on this module.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from the L1 spi_rx_fifo',
        '── Add ports ── input logic [3:0] ae_thresh, af_thresh',
        '── Add port ──  input logic clr_ovf',
        '── Add ports ── output logic [3:0] level',
        '── Add ports ── output logic almost_empty, almost_full, ovf_sticky',
        "Replace empty/full assigns with level-based versions (level === 4'd0, level === 4'd8)",
        'Add: assign almost_empty = (level <= ae_thresh); assign almost_full = (level >= af_thresh);',
        'Add a separate always_ff for ovf_sticky: set on (wr_en && full), clear on clr_ovf',
        'Keep udf_sticky logic from L1 unchanged',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_rx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic       clr_udf, clr_ovf,
  input  logic [3:0] ae_thresh, af_thresh,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic [3:0] level,
  output logic       full, empty,
  output logic       almost_empty, almost_full,
  output logic       udf_sticky, ovf_sticky
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level === 4'd0);
  assign full         = (level === 4'd8);
  assign almost_empty = (level <= ae_thresh);
  assign almost_full  = (level >= af_thresh);

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)              udf_sticky <= 1'b0;
    else if (rd_en && empty) udf_sticky <= 1'b1;
    else if (clr_udf)        udf_sticky <= 1'b0;
  end

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)              ovf_sticky <= 1'b0;
    else if (wr_en && full)  ovf_sticky <= 1'b1;
    else if (clr_ovf)        ovf_sticky <= 1'b0;
  end

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr  <= 4'b0;
      rd_ptr  <= 4'b0;
      rd_data <= 8'b0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[2:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[2:0]];
        rd_ptr  <= rd_ptr + 1;
      end else if (rd_en && empty) begin
        rd_data <= 8'b0;
      end
    end
  end

endmodule`,

      design:
`// Extend spi_rx_fifo with level counter, watermarks, and overflow flag.
// See Theory — exact same formulas as spi_tx_fifo L2+L3, applied here.
//
// New ports:
//   input  logic [3:0] ae_thresh, af_thresh
//   input  logic       clr_ovf
//   output logic [3:0] level
//   output logic       almost_empty, almost_full, ovf_sticky
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en, clr_udf, clr_ovf;
  logic [3:0] ae_thresh, af_thresh, level;
  logic [7:0] wr_data, rd_data;
  logic       full, empty, almost_empty, almost_full, udf_sticky, ovf_sticky;

  spi_rx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .clr_udf(clr_udf), .clr_ovf(clr_ovf),
    .ae_thresh(ae_thresh), .af_thresh(af_thresh),
    .wr_data(wr_data), .rd_data(rd_data),
    .level(level),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full),
    .udf_sticky(udf_sticky), .ovf_sticky(ovf_sticky)
  );

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; clr_udf = 0; clr_ovf = 0;
    wr_data = 0; ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    if (level === 4'd0 && empty === 1'b1)
      $display("PASS  reset: level=0 empty=1");
    else
      $display("FAIL  reset: level=%0d empty=%0b", level, empty);

    wr_en = 1;
    repeat(6) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (almost_full === 1'b1 && level === 4'd6)
      $display("PASS  6 pushes: almost_full=1 level=6");
    else
      $display("FAIL  6 pushes: almost_full=%0b level=%0d", almost_full, level);

    wr_en = 1;
    wr_data = 8'hAA; @(posedge clk); #1;
    wr_data = 8'hBB; @(posedge clk); #1;
    wr_data = 8'hCC; @(posedge clk); #1;
    wr_en = 0;
    if (ovf_sticky === 1'b1 && full === 1'b1)
      $display("PASS  overflow: ovf=1 full=1");
    else
      $display("FAIL  overflow: ovf=%0b full=%0b", ovf_sticky, full);

    clr_ovf = 1; @(posedge clk); #1; clr_ovf = 0;
    rd_en = 1;
    repeat(6) begin
      @(posedge clk); #1;
    end
    rd_en = 0; @(posedge clk); #1;
    if (almost_empty === 1'b1 && level <= 4'd2)
      $display("PASS  drained: almost_empty=1 level=%0d", level);
    else
      $display("FAIL  drained: almost_empty=%0b level=%0d", almost_empty, level);

    rd_en = 1;
    repeat(4) @(posedge clk);
    rd_en = 0; @(posedge clk); #1;
    rd_en = 1; @(posedge clk); #1; rd_en = 0;
    if (udf_sticky === 1'b1)
      $display("PASS  udf still works: udf=1");
    else
      $display("FAIL  udf broken: udf=%0b", udf_sticky);

    $display("RX FIFO level and flags done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: level=0 empty=1',
        'PASS  6 pushes: almost_full=1 level=6',
        'PASS  overflow: ovf=1 full=1',
        'PASS  drained: almost_empty=1 level=',
        'RX FIFO level and flags done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — Flush & Integration Contract (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long4l3',
      title: 'L3 — Flush & Integration Contract',

      theory: `
<h2>Flush and the RX FIFO's Role in the Data Path</h2>
<p>
  The <code>flush</code> input has the same meaning as in the TX FIFO: reset both
  pointers to zero in one clock, instantly making the buffer appear empty. The CPU
  uses this when it needs to discard stale receive data — for example after an abort
  or a mode change.
</p>

<h3>Flush Priority</h3>
<pre class="code-block">
// Priority: rst_n > flush > normal wr/rd
if (!rst_n)     → reset all
else if (flush) → wr_ptr = 0; rd_ptr = 0
else            → normal operation
</pre>

<h3>Integration Contract — what spi_long5 will connect</h3>
<p>
  In the next chapter you will build the shift registers. The shift register module
  produces a <code>word_done</code> pulse every time it finishes shifting 8/16/32 bits.
  That pulse drives <code>wr_en</code> on this FIFO. This is the
  <strong>integration contract</strong> for the RX FIFO:
</p>

<table class="truth-table">
  <tr><th>Signal</th><th>Connected to</th><th>Direction</th></tr>
  <tr><td>wr_en</td><td>spi_shift.word_done</td><td>shift → rx_fifo</td></tr>
  <tr><td>wr_data</td><td>spi_shift.rx_data[7:0]</td><td>shift → rx_fifo</td></tr>
  <tr><td>almost_full</td><td>spi_master_fsm (throttle)</td><td>rx_fifo → fsm</td></tr>
  <tr><td>rd_en</td><td>APB read of RXDATA register</td><td>apb → rx_fifo</td></tr>
  <tr><td>rd_data</td><td>APB RXDATA register</td><td>rx_fifo → apb</td></tr>
</table>

<h3>What You Will Build</h3>
<p>
  Add the <code>flush</code> port to the L2 module. The always_ff gains one
  <code>else if (flush)</code> branch before the normal read/write block. No other
  changes needed.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from the L2 spi_rx_fifo',
        '── New port ── input logic flush,   ← synchronous pointer reset',
        'In the pointer always_ff: add else-if (flush) branch — wr_ptr <= 0; rd_ptr <= 0',
        'Priority: rst_n > flush > normal wr_en/rd_en',
        'All other logic (level, watermarks, udf, ovf) unchanged from L2',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_rx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic       flush, clr_udf, clr_ovf,
  input  logic [3:0] ae_thresh, af_thresh,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic [3:0] level,
  output logic       full, empty,
  output logic       almost_empty, almost_full,
  output logic       udf_sticky, ovf_sticky
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level === 4'd0);
  assign full         = (level === 4'd8);
  assign almost_empty = (level <= ae_thresh);
  assign almost_full  = (level >= af_thresh);

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)              udf_sticky <= 1'b0;
    else if (rd_en && empty) udf_sticky <= 1'b1;
    else if (clr_udf)        udf_sticky <= 1'b0;
  end

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)             ovf_sticky <= 1'b0;
    else if (wr_en && full) ovf_sticky <= 1'b1;
    else if (clr_ovf)       ovf_sticky <= 1'b0;
  end

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr  <= 4'b0;
      rd_ptr  <= 4'b0;
      rd_data <= 8'b0;
    end else if (flush) begin
      wr_ptr <= 4'b0;
      rd_ptr <= 4'b0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[2:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[2:0]];
        rd_ptr  <= rd_ptr + 1;
      end else if (rd_en && empty) begin
        rd_data <= 8'b0;
      end
    end
  end

endmodule`,

      design:
`// Add flush to spi_rx_fifo.
// See Theory for the flush priority and the integration contract table.
//
// New port:
//   input logic flush   — synchronous pointer reset; priority below rst_n, above wr/rd
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en, flush, clr_udf, clr_ovf;
  logic [3:0] ae_thresh, af_thresh, level;
  logic [7:0] wr_data, rd_data;
  logic       full, empty, almost_empty, almost_full, udf_sticky, ovf_sticky;

  spi_rx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .flush(flush), .clr_udf(clr_udf), .clr_ovf(clr_ovf),
    .ae_thresh(ae_thresh), .af_thresh(af_thresh),
    .wr_data(wr_data), .rd_data(rd_data),
    .level(level),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full),
    .udf_sticky(udf_sticky), .ovf_sticky(ovf_sticky)
  );

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0;
    clr_udf = 0; clr_ovf = 0; wr_data = 0;
    ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    wr_en = 1;
    repeat(5) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (level === 4'd5)
      $display("PASS  5 pushes: level=5");
    else
      $display("FAIL  5 pushes: level=%0d", level);

    flush = 1; @(posedge clk); #1; flush = 0;
    if (empty === 1'b1 && level === 4'd0)
      $display("PASS  flush: empty=1 level=0");
    else
      $display("FAIL  flush: empty=%0b level=%0d", empty, level);

    wr_en = 1; wr_data = 8'hF0; @(posedge clk); #1; wr_en = 0;
    if (level === 4'd1)
      $display("PASS  post-flush push: level=1");
    else
      $display("FAIL  post-flush push: level=%0d", level);

    if (udf_sticky === 1'b0 && ovf_sticky === 1'b0)
      $display("PASS  flush: no spurious udf/ovf flags");
    else
      $display("FAIL  flush: udf=%0b ovf=%0b (expected both 0)", udf_sticky, ovf_sticky);

    $display("RX FIFO flush done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  5 pushes: level=5',
        'PASS  flush: empty=1 level=0',
        'PASS  post-flush push: level=1',
        'RX FIFO flush done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Back-Pressure Signal & Port Registry (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long4l4',
      title: 'L4 — Back-Pressure & Port Registry',

      theory: `
<h2>Telling the SPI Engine to Slow Down</h2>
<p>
  The RX FIFO has an <code>almost_full</code> flag, but the SPI engine cannot stop
  mid-transfer — once SCK is running, bits arrive every clock edge regardless. What
  the engine <em>can</em> do is refuse to start the <em>next</em> word transfer when
  the RX FIFO is too full to accept it safely.
</p>
<p>
  This is <strong>back-pressure</strong>: the FIFO signals upstream that it is nearly
  full, and the upstream block waits before producing more data. In the SPI master
  this means the FSM holds in <code>COMPLETE</code> state (after finishing a word)
  and does not loop back into <code>SHIFT</code> for the next word until
  <code>rx_almost_full</code> deasserts.
</p>

<pre class="code-block">
// Inside the master FSM (spi_long8), COMPLETE → SHIFT transition:
COMPLETE: begin
  if (!rx_almost_full &amp;&amp; !tx_empty)
    next = SHIFT;       // start next word only when RX has room
  else if (tx_empty)
    next = DEASSERT_CS;
end
</pre>

<h3>Naming Convention for Integration</h3>
<p>
  When the RX FIFO's <code>almost_full</code> drives the FSM, it is renamed at the
  integration level to make the data-flow direction unambiguous:
</p>

<table class="truth-table">
  <tr><th>FIFO port name</th><th>Wire name at top level</th><th>Consumer</th></tr>
  <tr><td>almost_full</td><td>rx_af</td><td>spi_master_fsm: hold in COMPLETE</td></tr>
  <tr><td>almost_empty</td><td>rx_ae</td><td>interrupt controller: fire RX watermark IRQ</td></tr>
  <tr><td>ovf_sticky</td><td>rx_ovf</td><td>error register: bit RXOVR</td></tr>
  <tr><td>udf_sticky</td><td>rx_udf</td><td>error register: bit RXUDF</td></tr>
</table>

<h3>What You Will Build</h3>
<p>
  Add one output port to the L3 module: <code>rx_bp</code> (receive back-pressure),
  a direct alias for <code>almost_full</code>. This makes the integration wiring
  explicit without renaming the flag internally.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from the L3 spi_rx_fifo',
        '── New port ── output logic rx_bp,   ← back-pressure alias for almost_full',
        '── Add assign ── assign rx_bp = almost_full;',
        'No other logic changes — just the alias port and assign',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_rx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic       flush, clr_udf, clr_ovf,
  input  logic [3:0] ae_thresh, af_thresh,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic [3:0] level,
  output logic       full, empty,
  output logic       almost_empty, almost_full,
  output logic       rx_bp,
  output logic       udf_sticky, ovf_sticky
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level === 4'd0);
  assign full         = (level === 4'd8);
  assign almost_empty = (level <= ae_thresh);
  assign almost_full  = (level >= af_thresh);
  assign rx_bp        = almost_full;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)              udf_sticky <= 1'b0;
    else if (rd_en && empty) udf_sticky <= 1'b1;
    else if (clr_udf)        udf_sticky <= 1'b0;
  end

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)             ovf_sticky <= 1'b0;
    else if (wr_en && full) ovf_sticky <= 1'b1;
    else if (clr_ovf)       ovf_sticky <= 1'b0;
  end

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr  <= 4'b0;
      rd_ptr  <= 4'b0;
      rd_data <= 8'b0;
    end else if (flush) begin
      wr_ptr <= 4'b0;
      rd_ptr <= 4'b0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[2:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[2:0]];
        rd_ptr  <= rd_ptr + 1;
      end else if (rd_en && empty) begin
        rd_data <= 8'b0;
      end
    end
  end

endmodule`,

      design:
`// Add rx_bp back-pressure output to spi_rx_fifo.
// See Theory for the FSM wiring context.
//
// New port:   output logic rx_bp   — alias for almost_full
// New assign: assign rx_bp = almost_full;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en, flush, clr_udf, clr_ovf;
  logic [3:0] ae_thresh, af_thresh, level;
  logic [7:0] wr_data, rd_data;
  logic       full, empty, almost_empty, almost_full, rx_bp;
  logic       udf_sticky, ovf_sticky;

  spi_rx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .flush(flush), .clr_udf(clr_udf), .clr_ovf(clr_ovf),
    .ae_thresh(ae_thresh), .af_thresh(af_thresh),
    .wr_data(wr_data), .rd_data(rd_data),
    .level(level),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full),
    .rx_bp(rx_bp),
    .udf_sticky(udf_sticky), .ovf_sticky(ovf_sticky)
  );

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0;
    clr_udf = 0; clr_ovf = 0; wr_data = 0;
    ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    wr_en = 1;
    repeat(6) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (rx_bp === 1'b1 && almost_full === 1'b1)
      $display("PASS  rx_bp=1 matches almost_full=1 at level=%0d", level);
    else
      $display("FAIL  rx_bp=%0b almost_full=%0b level=%0d", rx_bp, almost_full, level);

    rd_en = 1; @(posedge clk); #1; rd_en = 0; @(posedge clk); #1;
    if (rx_bp === 1'b0 && level < af_thresh)
      $display("PASS  rx_bp=0 after drain: level=%0d", level);
    else
      $display("FAIL  rx_bp=%0b level=%0d af_thresh=%0d", rx_bp, level, af_thresh);

    wr_en = 1; repeat(6) begin wr_data = wr_data+1; @(posedge clk); #1; end wr_en = 0;
    flush = 1; @(posedge clk); #1; flush = 0; @(posedge clk); #1;
    if (rx_bp === 1'b0 && empty === 1'b1)
      $display("PASS  post-flush: rx_bp=0 empty=1");
    else
      $display("FAIL  post-flush: rx_bp=%0b empty=%0b", rx_bp, empty);

    $display("RX FIFO back-pressure done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  rx_bp=1 matches almost_full=1 at level=',
        'PASS  rx_bp=0 after drain:',
        'PASS  post-flush: rx_bp=0 empty=1',
        'RX FIFO back-pressure done!',
      ]
    },

  ]
});
