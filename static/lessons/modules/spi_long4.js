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
<h2>The Lab's Incoming Data Tray</h2>
<p>
  Imagine a research lab. A motion sensor (IMU) finishes measuring orientation
  every millisecond and drops the result into a shared tray on the bench. The
  CPU is busy doing other calculations — it checks the tray when it's ready.
  Most of the time this works perfectly: the sensor fills the tray, the CPU
  drains it, and life is good.
</p>
<p>
  But what happens if the CPU reaches into the tray before the sensor has
  deposited anything yet? In a physical tray, you would grab air. In hardware,
  you would read stale or garbage data from <code>mem[]</code> — and you would
  never know that happened unless the hardware told you.
</p>
<p>
  This is <strong>underflow</strong>: reading from an empty FIFO. The hardware
  response is to return <code>0x00</code> (a safe, defined value) and set a
  <strong>sticky underflow flag</strong> (<code>udf_sticky</code>) so the CPU
  can detect the mistake later. Think of it as a sticky note left in the empty
  tray: <em>"I came and found nothing here."</em>
</p>

<h3>Where the RX FIFO Lives in Our SPI Master</h3>
<pre class="code-block">
  SPI sensor (MISO pin) sends bits back to us
          │
          ▼
  spi_shift (spi_long5) — assembles bits into words
          │ word_done pulse + rx_data[7:0]
          ▼
  ┌──────────────────────────────────────────────────┐
  │             spi_rx_fifo                      ★   │
  │                                                  │
  │  wr_en ← shift register (word_done)              │
  │  wr_data ← shift register (rx_data)              │
  │                                                  │
  │  rd_en ← CPU (APB read of RXDATA register)       │
  │  rd_data → CPU                                   │
  └─────────────────────────┬────────────────────────┘
                            │ status flags
                            ▼
                       APB register block
</pre>
<p>
  Notice the direction reversal from spi_long3's TX FIFO: here the
  <strong>hardware pushes</strong> and the <strong>CPU pops</strong>.
  The pointer arithmetic and wrap-bit trick are identical — only the
  perspective changes.
</p>

<h3>The Underflow Pattern</h3>
<pre class="code-block">
// Separate always_ff for the sticky underflow flag
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n)               udf_sticky &lt;= 1'b0;
  else if (rd_en &amp;&amp; empty)  udf_sticky &lt;= 1'b1;  // CPU read air
  else if (clr_udf)         udf_sticky &lt;= 1'b0;  // W1C clear
end

// rd_data returns 0x00 on underflow read (not garbage from mem[])
if (rd_en &amp;&amp; !empty)  rd_data &lt;= mem[rd_ptr[2:0]]; rd_ptr &lt;= ...
if (rd_en &amp;&amp; empty)   rd_data &lt;= 8'b0;   // safe zero, no pointer advance
</pre>
<p>
  The pointer does <em>not</em> advance on an underflow read — there is nothing
  to pop. <code>udf_sticky</code> stays set until the CPU writes <code>clr_udf</code>
  through the status register.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module name is spi_rx_fifo (not spi_tx_fifo)',
        'Step 2 — Port list:',
        '         input  logic       clk, rst_n',
        '         input  logic       wr_en    (from SPI shift register, word_done)',
        '         input  logic       rd_en    (from CPU via APB)',
        '         input  logic       clr_udf  (W1C: clears udf_sticky)',
        '         input  logic [7:0] wr_data',
        '         output logic [7:0] rd_data  (returns 0x00 when empty)',
        '         output logic       full, empty',
        '         output logic       udf_sticky',
        'Step 3 — Copy the wrap-bit pointer logic from spi_long3 L1',
        '         (same mem[0:7], wr_ptr[3:0], rd_ptr[3:0], same empty/full assigns)',
        'Step 4 — Add a SEPARATE always_ff for udf_sticky:',
        '         if (!rst_n): udf_sticky <= 0',
        '         else if (rd_en && empty): udf_sticky <= 1',
        '         else if (clr_udf): udf_sticky <= 0',
        'Step 5 — In the pointer always_ff, add underflow handling:',
        '         if (rd_en && !empty): latch rd_data, advance rd_ptr',
        '         else if (rd_en && empty): rd_data <= 0  (safe zero, no ptr advance)',
        'Step 6 — endmodule',
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
// Mirror of spi_tx_fifo but hardware pushes and CPU pops.
//
// Ports:
//   input  logic       clk, rst_n
//   input  logic       wr_en      — from SPI shift register (word_done)
//   input  logic       rd_en      — from CPU via APB read
//   input  logic       clr_udf    — W1C: clears udf_sticky
//   input  logic [7:0] wr_data    — completed received byte
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
    $display("=== RX FIFO: Push Side & Underflow ===");
    rst_n = 0; wr_en = 0; rd_en = 0; clr_udf = 0; wr_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: empty on reset ---
    if (empty === 1'b1 && udf_sticky === 1'b0)
      $display("PASS  reset: empty=1 udf=0");
    else
      $display("FAIL  reset: empty=%0b udf=%0b", empty, udf_sticky);

    // --- Test 2: SPI engine pushes three words, CPU reads first back ---
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
<h2>When the Tray Gets Too Full</h2>
<p>
  Now imagine the sensor is firing fast — producing one measurement every
  millisecond — but the CPU is busy and has not read from the tray in a while.
  Eventually all 8 slots fill up. The next measurement the sensor produces has
  nowhere to go. It gets dropped. The data is gone.
</p>
<p>
  This is <strong>RX overflow</strong> — the mirror image of TX overflow from the
  previous chapter. In the TX FIFO, the CPU wrote too fast. Here, the SPI engine
  is producing data faster than the CPU is consuming it. The <code>ovf_sticky</code>
  flag records that it happened, and the CPU can decide to flush and restart.
</p>
<p>
  Two watermark flags give the CPU <em>advance warning</em> before overflow happens:
</p>
<table class="truth-table">
  <tr><th>Flag</th><th>Fires when…</th><th>CPU action</th></tr>
  <tr><td><code>almost_full</code></td><td>level &gt;= af_thresh</td><td>Start draining — interrupt handler fires or DMA kicks in</td></tr>
  <tr><td><code>almost_empty</code></td><td>level &lt;= ae_thresh</td><td>Sensor has gone quiet — fewer bytes in the queue than expected</td></tr>
</table>

<h3>Level and Flag Formulas</h3>
<p>
  The same four combinational assigns from spi_long3 apply directly here.
  Only the direction of flow has changed; the math is identical:
</p>
<pre class="code-block">
assign level        = wr_ptr - rd_ptr;
assign empty        = (level === 4'd0);
assign full         = (level === 4'd8);
assign almost_empty = (level &lt;= ae_thresh);
assign almost_full  = (level &gt;= af_thresh);
</pre>

<h3>What We Are Building</h3>
<p>
  Extend the L1 <code>spi_rx_fifo</code> with level, programmable watermarks,
  and an <code>ovf_sticky</code> flag. When the shift register fires
  <code>wr_en</code> while the FIFO is full, the word is dropped silently and
  the flag is set. Both <code>udf_sticky</code> (from L1) and
  <code>ovf_sticky</code> (new in this lesson) coexist on this module.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L1 spi_rx_fifo — keep all existing ports',
        'Step 2 — Add new input ports:',
        '         input logic [3:0] ae_thresh, af_thresh',
        '         input logic       clr_ovf',
        'Step 3 — Add new output ports:',
        '         output logic [3:0] level',
        '         output logic       almost_empty, almost_full, ovf_sticky',
        'Step 4 — Replace the empty/full assigns with level-based versions:',
        '         assign level = wr_ptr - rd_ptr;',
        '         assign empty = (level === 4\'d0);',
        '         assign full  = (level === 4\'d8);',
        '         assign almost_empty = (level <= ae_thresh);',
        '         assign almost_full  = (level >= af_thresh);',
        'Step 5 — Add a SEPARATE always_ff for ovf_sticky:',
        '         set on (wr_en && full), clear on clr_ovf',
        'Step 6 — Keep udf_sticky logic from L1 unchanged',
        'Step 7 — endmodule',
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
// See Theory for the formulas — same math as spi_tx_fifo L2+L3.
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
    $display("=== RX FIFO: Level, Watermarks & Overflow ===");
    rst_n = 0; wr_en = 0; rd_en = 0; clr_udf = 0; clr_ovf = 0;
    wr_data = 0; ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: level=0 on reset ---
    if (level === 4'd0 && empty === 1'b1)
      $display("PASS  reset: level=0 empty=1");
    else
      $display("FAIL  reset: level=%0d empty=%0b", level, empty);

    // --- Test 2: 6 pushes → almost_full fires ---
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

    // --- Test 3: fill to full then overflow ---
    wr_en = 1;
    wr_data = 8'hAA; @(posedge clk); #1;
    wr_data = 8'hBB; @(posedge clk); #1;
    wr_data = 8'hCC; @(posedge clk); #1;   // this one overflows
    wr_en = 0;
    if (ovf_sticky === 1'b1 && full === 1'b1)
      $display("PASS  overflow: ovf=1 full=1");
    else
      $display("FAIL  overflow: ovf=%0b full=%0b", ovf_sticky, full);

    // --- Test 4: drain to almost_empty ---
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

    // --- Test 5: udf still works ---
    rd_en = 1; repeat(4) @(posedge clk); rd_en = 0; @(posedge clk); #1;
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
<h2>Changing Experiments — Discard Everything and Start Fresh</h2>
<p>
  Imagine the lab switches from measuring orientation to measuring temperature.
  All the old orientation measurements in the tray are now irrelevant — keeping
  them around would confuse the CPU into thinking they are temperature readings.
  The fastest way to clean out the tray is a flush: in one second, both
  pointers reset to zero and the FIFO appears empty. The old data is still
  physically in <code>mem[]</code>, but the next push will overwrite it.
</p>
<p>
  In a real SPI system, flush happens when the CPU aborts a transfer mid-way,
  changes the word length, or changes the SPI mode. Without flush, the FIFO
  might still contain partial data from the previous configuration.
</p>

<h3>Flush Priority</h3>
<pre class="code-block">
// rst_n &gt; flush &gt; normal wr/rd
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    wr_ptr &lt;= 4'b0; rd_ptr &lt;= 4'b0;
  end else if (flush) begin   // instant empty, one cycle
    wr_ptr &lt;= 4'b0; rd_ptr &lt;= 4'b0;
  end else begin
    // normal wr_en / rd_en processing
  end
end
</pre>
<p>
  Important: flush does <em>not</em> set <code>udf_sticky</code> or
  <code>ovf_sticky</code>. It is an intentional operation, not an error event.
</p>

<h3>Integration Contract — What Connects Here</h3>
<p>
  In the next chapter (spi_long5) you will build the shift registers.
  Here is the precise wiring contract your RX FIFO must satisfy:
</p>
<table class="truth-table">
  <tr><th>Signal</th><th>Connected to</th><th>Direction</th></tr>
  <tr><td><code>wr_en</code></td><td>spi_shift.word_done</td><td>shift → rx_fifo</td></tr>
  <tr><td><code>wr_data</code></td><td>spi_shift.rx_data[7:0]</td><td>shift → rx_fifo</td></tr>
  <tr><td><code>almost_full</code></td><td>spi_master_fsm (throttle)</td><td>rx_fifo → fsm</td></tr>
  <tr><td><code>rd_en</code></td><td>APB read of RXDATA register</td><td>apb → rx_fifo</td></tr>
  <tr><td><code>rd_data</code></td><td>APB RXDATA register output</td><td>rx_fifo → apb</td></tr>
  <tr><td><code>flush</code></td><td>ABORT or SOFT_RST from FSM</td><td>fsm → rx_fifo</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L2 spi_rx_fifo — all existing ports remain',
        'Step 2 — Add one new input port:',
        '         input logic flush   (synchronous pointer reset)',
        'Step 3 — In the pointer always_ff, insert an else-if (flush) branch:',
        '         after the if (!rst_n) branch, BEFORE the else begin',
        '         else if (flush): wr_ptr <= 0; rd_ptr <= 0',
        'Step 4 — Priority order: rst_n > flush > normal wr_en/rd_en',
        'Step 5 — All level/watermark/udf/ovf logic stays unchanged from L2',
        'Step 6 — endmodule',
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
    end else if (flush) begin          // instant empty
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
// See Theory for the flush priority and integration contract table.
//
// New port:
//   input logic flush  — synchronous pointer reset; priority below rst_n, above wr/rd
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
    $display("=== RX FIFO: Flush & Integration Contract ===");
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0;
    clr_udf = 0; clr_ovf = 0; wr_data = 0;
    ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: push 5 words ---
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

    // --- Test 2: flush clears to empty ---
    flush = 1; @(posedge clk); #1; flush = 0;
    if (empty === 1'b1 && level === 4'd0)
      $display("PASS  flush: empty=1 level=0");
    else
      $display("FAIL  flush: empty=%0b level=%0d", empty, level);

    // --- Test 3: write after flush works normally ---
    wr_en = 1; wr_data = 8'hF0; @(posedge clk); #1; wr_en = 0;
    if (level === 4'd1)
      $display("PASS  post-flush push: level=1");
    else
      $display("FAIL  post-flush push: level=%0d", level);

    // --- Test 4: flush does NOT set udf or ovf ---
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
<h2>Telling the SPI Engine: "Please Wait"</h2>
<p>
  Imagine the lab manager is so busy reading reports that they cannot keep up
  with the sensor's output. The sensor cannot stop measuring mid-measurement
  (the physics do not pause). But after completing one measurement, it
  <em>can</em> wait before starting the next one — if someone signals it to pause.
</p>
<p>
  In SPI, once SCK is running, bits arrive every edge regardless. But the FSM
  that controls when the <em>next</em> word transfer begins can check whether
  the RX FIFO has room before re-entering the SHIFT state. If the RX FIFO is
  almost full, the FSM holds in COMPLETE state and waits. This is called
  <strong>back-pressure</strong>.
</p>

<h3>The rx_bp Signal</h3>
<p>
  We add one output port <code>rx_bp</code> (receive back-pressure) as a direct
  alias for <code>almost_full</code>. The FSM reads <code>rx_bp</code> to decide
  whether it is safe to start the next word:
</p>
<pre class="code-block">
assign rx_bp = almost_full;   // named alias — no logic change

// Inside the master FSM (spi_long8), COMPLETE → SHIFT decision:
// COMPLETE: if (!rx_bp && !tx_empty) → next = SHIFT;
//           else if (tx_empty)       → next = DEASSERT_CS;
</pre>
<p>
  Naming it <code>rx_bp</code> at the FIFO level makes integration wiring
  self-documenting: any module that connects to <code>rx_bp</code> knows it
  is receiving a back-pressure signal from the receive path.
</p>

<h3>Complete Port Registry</h3>
<p>
  Before we wire this FIFO into the SPI master (starting spi_long5), here is the
  authoritative list of every port on the final <code>spi_rx_fifo</code>:
</p>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Consumer / Driver</th></tr>
  <tr><td>clk, rst_n</td><td>in</td><td>system</td></tr>
  <tr><td>wr_en, wr_data</td><td>in</td><td>spi_shift (word_done, rx_data)</td></tr>
  <tr><td>rd_en, rd_data</td><td>in/out</td><td>APB read of RXDATA register</td></tr>
  <tr><td>flush</td><td>in</td><td>FSM ABORT / SOFT_RST</td></tr>
  <tr><td>clr_udf, clr_ovf</td><td>in</td><td>CPU W1C write to status register</td></tr>
  <tr><td>ae_thresh, af_thresh</td><td>in</td><td>CPU write to FIFO_CTRL register</td></tr>
  <tr><td>level[3:0]</td><td>out</td><td>DEBUG register</td></tr>
  <tr><td>full, empty</td><td>out</td><td>STATUS register bits</td></tr>
  <tr><td>almost_empty, almost_full</td><td>out</td><td>interrupt controller (watermark IRQ)</td></tr>
  <tr><td>rx_bp</td><td>out</td><td>spi_master_fsm back-pressure</td></tr>
  <tr><td>udf_sticky, ovf_sticky</td><td>out</td><td>error register bits (W1C)</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L3 spi_rx_fifo — all existing ports remain',
        'Step 2 — Add one new output port:',
        '         output logic rx_bp   (back-pressure alias for almost_full)',
        'Step 3 — Add one assign after the almost_full assign:',
        '         assign rx_bp = almost_full;',
        'Step 4 — No other logic changes',
        'Step 5 — endmodule',
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
  output logic       rx_bp,           // back-pressure: alias for almost_full
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
  assign rx_bp        = almost_full;   // named alias for FSM wiring

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
// See Theory for the FSM wiring context and complete port registry.
//
// New port:
//   output logic rx_bp   — alias for almost_full; drives FSM back-pressure
// New assign:
//   assign rx_bp = almost_full;
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
    $display("=== RX FIFO: Back-Pressure ===");
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0;
    clr_udf = 0; clr_ovf = 0; wr_data = 0;
    ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: rx_bp tracks almost_full ---
    wr_en = 1;
    repeat(6) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (rx_bp === 1'b1 && almost_full === 1'b1 && rx_bp === almost_full)
      $display("PASS  rx_bp=1 matches almost_full=1 at level=%0d", level);
    else
      $display("FAIL  rx_bp=%0b almost_full=%0b level=%0d", rx_bp, almost_full, level);

    // --- Test 2: rx_bp deasserts when level drops below af_thresh ---
    rd_en = 1; @(posedge clk); #1; rd_en = 0; @(posedge clk); #1;
    if (rx_bp === 1'b0 && level < af_thresh)
      $display("PASS  rx_bp=0 after drain: level=%0d", level);
    else
      $display("FAIL  rx_bp=%0b level=%0d af_thresh=%0d", rx_bp, level, af_thresh);

    // --- Test 3: flush clears everything, rx_bp deasserts ---
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
