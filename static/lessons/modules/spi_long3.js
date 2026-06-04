(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long3',
  title: 'TX FIFO Design',
  icon: '📤',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Pointer Arithmetic & Storage (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long3l1',
      title: 'L1 — Pointer Arithmetic & Storage',

      theory: `
<h2>How a FIFO Tracks Its Data</h2>
<p>
  A synchronous FIFO (First-In, First-Out) buffer is the bridge between software and
  hardware. The CPU writes words at any time; the SPI shift register reads them one
  by one at the SCK rate. The FIFO hides this speed mismatch so neither side has to
  wait for the other to be ready.
</p>
<p>
  A FIFO needs two things: a <strong>storage array</strong> and two
  <strong>pointers</strong> — one for the write head (<code>wr_ptr</code>) and one
  for the read head (<code>rd_ptr</code>). Both pointers start at 0. Each write
  increments <code>wr_ptr</code>; each read increments <code>rd_ptr</code>.
  When a pointer reaches DEPTH, it wraps back to 0.
</p>

<pre class="code-block">
// Depth-8 FIFO — 3-bit pointers (0..7 + wrap bit = 4 bits)
parameter DEPTH = 8;
parameter W     = 8;

logic [W-1:0]   mem [0:DEPTH-1];   // storage
logic [2:0]     wr_ptr, rd_ptr;    // 3-bit binary pointers

// Write
always_ff @(posedge clk)
  if (wr_en &amp;&amp; !full)
    mem[wr_ptr] &lt;= wr_data;

// Read (registered output)
always_ff @(posedge clk)
  rd_data &lt;= mem[rd_ptr];
</pre>

<h3>Empty & Full from MSB Trick</h3>
<p>
  With a power-of-two depth, empty and full can be detected cheaply by extending
  the pointers by one extra bit — the <em>wrap bit</em>. When the wrap bits
  <strong>match</strong>, the pointers are in the same lap → FIFO is
  <strong>empty</strong>. When the wrap bits <strong>differ</strong> but the low bits
  match, one pointer has lapped the other → FIFO is <strong>full</strong>.
</p>

<table class="truth-table">
  <tr><th>wr_ptr[MSB] == rd_ptr[MSB]</th><th>wr_ptr[low] == rd_ptr[low]</th><th>Condition</th></tr>
  <tr><td>yes</td><td>yes</td><td>EMPTY (both laps match)</td></tr>
  <tr><td>no</td><td>yes</td><td>FULL (lapped by exactly DEPTH entries)</td></tr>
  <tr><td>any</td><td>no</td><td>Partially filled</td></tr>
</table>

<h3>What You Will Build</h3>
<p>
  Module <code>spi_tx_fifo</code> with depth 8 and width 8. Parameters
  <code>DEPTH</code> and <code>W</code> are fixed for this lesson;
  you will parameterise them later. Implement the storage array, the two
  pointers with wrap arithmetic, and the <code>empty</code> / <code>full</code>
  flags using the MSB trick.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  `timescale 1ns/1ps',
        '── Line 2 ──  module spi_tx_fifo (   ← open parenthesis',
        '── Line 3 ──    input  logic       clk, rst_n,   ← clock and active-low reset',
        '── Line 4 ──    input  logic       wr_en, rd_en,   ← write/read enables',
        '── Line 5 ──    input  logic [7:0] wr_data,',
        '── Line 6 ──    output logic [7:0] rd_data,',
        '── Line 7 ──    output logic       full, empty   ← no trailing comma on last port',
        '── Line 8 ──  );',
        '── Line 9 ──  localparam DEPTH = 8;',
        '── Line 10 ── logic [7:0] mem [0:7];   ← 8-entry storage array',
        '── Line 11 ── logic [3:0] wr_ptr, rd_ptr;   ← 4-bit: 3 index bits + 1 wrap bit',
        '── Line 12 ── assign empty = (wr_ptr === rd_ptr);',
        '── Line 13 ── assign full  = (wr_ptr[2:0] === rd_ptr[2:0]) && (wr_ptr[3] !== rd_ptr[3]);',
        '── Line 14 ── always_ff block: on posedge clk or negedge rst_n — reset both pointers to 0',
        '── Line 15 ── else: if wr_en && !full → mem[wr_ptr[2:0]] <= wr_data; wr_ptr <= wr_ptr + 1',
        '── Line 16 ── else: if rd_en && !empty → rd_data <= mem[rd_ptr[2:0]]; rd_ptr <= rd_ptr + 1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_tx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic       full, empty
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];          // storage array
  logic [3:0] wr_ptr, rd_ptr;           // 4-bit: [3]=wrap bit, [2:0]=index

  assign empty = (wr_ptr === rd_ptr);
  assign full  = (wr_ptr[2:0] === rd_ptr[2:0]) && (wr_ptr[3] !== rd_ptr[3]);

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr  <= 4'b0;
      rd_ptr  <= 4'b0;
      rd_data <= 8'b0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[2:0]] <= wr_data;   // write to indexed slot
        wr_ptr <= wr_ptr + 1;          // wrap bit flips naturally at 8
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[2:0]];   // registered read (one-cycle latency)
        rd_ptr  <= rd_ptr + 1;
      end
    end
  end

endmodule`,

      design:
`// Type the spi_tx_fifo module here.
// Read Theory first — it explains the MSB wrap-bit trick for empty/full.
//
// Ports:
//   input  logic       clk        — system clock
//   input  logic       rst_n      — active-low async reset
//   input  logic       wr_en      — push one word this cycle
//   input  logic       rd_en      — pop one word this cycle
//   input  logic [7:0] wr_data    — data to push
//   output logic [7:0] rd_data    — data popped (registered, 1-cycle latency)
//   output logic       full       — no room to write
//   output logic       empty      — nothing to read
//
// Internals needed: mem[0:7], wr_ptr[3:0], rd_ptr[3:0]
// MSB of pointer = wrap bit; low 3 bits = array index
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en;
  logic [7:0] wr_data, rd_data;
  logic       full, empty;

  spi_tx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .wr_data(wr_data), .rd_data(rd_data),
    .full(full), .empty(empty)
  );

  initial begin
    // Reset
    rst_n = 0; wr_en = 0; rd_en = 0; wr_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: empty on reset ---
    if (empty === 1'b1 && full === 1'b0)
      $display("PASS  reset: empty=1 full=0");
    else
      $display("FAIL  reset: empty=%0b full=%0b (expected empty=1 full=0)", empty, full);

    // --- Test 2: write three bytes, read them back in order ---
    wr_en = 1;
    wr_data = 8'hA5; @(posedge clk); #1;
    wr_data = 8'h3C; @(posedge clk); #1;
    wr_data = 8'h7F; @(posedge clk); #1;
    wr_en = 0;

    // Read first word (rd_en asserts → data appears next cycle)
    rd_en = 1; @(posedge clk); #1;  // rd_ptr advances, rd_data latches 0xA5
    rd_en = 0; @(posedge clk); #1;
    if (rd_data === 8'hA5)
      $display("PASS  read[0]: rd_data=0x%02h", rd_data);
    else
      $display("FAIL  read[0]: rd_data=0x%02h (expected 0xA5)", rd_data);

    // Read second word
    rd_en = 1; @(posedge clk); #1;
    rd_en = 0; @(posedge clk); #1;
    if (rd_data === 8'h3C)
      $display("PASS  read[1]: rd_data=0x%02h", rd_data);
    else
      $display("FAIL  read[1]: rd_data=0x%02h (expected 0x3C)", rd_data);

    // --- Test 3: fill to full ---
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    wr_en = 1;
    repeat(8) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (full === 1'b1)
      $display("PASS  full after 8 writes: full=1");
    else
      $display("FAIL  full flag not set after 8 writes: full=%0b", full);

    $display("TX FIFO pointer test done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: empty=1 full=0',
        'PASS  read[0]: rd_data=0xA5',
        'PASS  full after 8 writes: full=1',
        'TX FIFO pointer test done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Level Counter & Status Flags (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long3l2',
      title: 'L2 — Level Counter & Status Flags',

      theory: `
<h2>Counting How Full the FIFO Is</h2>
<p>
  Empty and full flags tell you the extremes, but real hardware also needs to know
  <em>how many words</em> are waiting. The SPI controller uses this count to decide
  whether to start a burst, throttle a DMA, or request an interrupt. The count is
  called the <strong>fill level</strong>.
</p>

<h3>Deriving Level from Pointers</h3>
<p>
  Because both pointers wrap modulo DEPTH (using the MSB trick), the fill level is
  simply the difference of the full 4-bit pointers, interpreted as an unsigned
  number. This works because the wrap bit is included in the subtraction:
</p>
<pre class="code-block">
assign level = wr_ptr - rd_ptr;   // 4-bit result, naturally 0..8
</pre>
<p>
  When <code>wr_ptr == rd_ptr</code> the result is 0 (empty). When one pointer has
  lapped the other by exactly DEPTH the result is 8 (full). No special cases needed.
</p>

<h3>Status Flags Derived from Level</h3>
<table class="truth-table">
  <tr><th>Flag</th><th>Condition</th><th>Meaning</th></tr>
  <tr><td><code>empty</code></td><td>level == 0</td><td>No data to read</td></tr>
  <tr><td><code>full</code></td><td>level == DEPTH</td><td>No room to write</td></tr>
  <tr><td><code>almost_empty</code></td><td>level &lt;= 1</td><td>Only 1 word left — SPI engine about to starve</td></tr>
  <tr><td><code>almost_full</code></td><td>level &gt;= DEPTH-1</td><td>Only 1 slot left — CPU must stop soon</td></tr>
</table>

<p>
  <code>almost_empty</code> and <code>almost_full</code> thresholds will become
  programmable watermarks in L3. For now they are hardcoded to 1 entry.
</p>

<h3>What You Will Build</h3>
<p>
  Extend the L1 module with a 4-bit <code>level</code> output and the four flags
  above. All are <code>assign</code> statements — purely combinational.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from the L1 spi_tx_fifo skeleton — same ports, same internals',
        '── Add port ──  output logic [3:0] level,',
        '── Add port ──  output logic       almost_empty, almost_full',
        '── Add assign ── level = wr_ptr - rd_ptr;   (4-bit subtraction with natural wrap)',
        '── Add assign ── empty = (level === 4\'d0);',
        '── Add assign ── full  = (level === 4\'d8);',
        '── Add assign ── almost_empty = (level <= 4\'d1);',
        '── Add assign ── almost_full  = (level >= 4\'d7);',
        'Keep the always_ff block identical to L1 (pointer updates only)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_tx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic [3:0] level,
  output logic       full, empty,
  output logic       almost_empty, almost_full
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level === 4'd0);
  assign full         = (level === 4'd8);
  assign almost_empty = (level <= 4'd1);
  assign almost_full  = (level >= 4'd7);

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
      end
    end
  end

endmodule`,

      design:
`// Extend spi_tx_fifo with a level counter and four status flags.
// See Theory for the assign formulas.
//
// New ports to add:
//   output logic [3:0] level        — 0..8 fill count
//   output logic       almost_empty — level <= 1
//   output logic       almost_full  — level >= 7
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en;
  logic [7:0] wr_data, rd_data;
  logic [3:0] level;
  logic       full, empty, almost_empty, almost_full;

  spi_tx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .wr_data(wr_data), .rd_data(rd_data),
    .level(level),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full)
  );

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; wr_data = 8'h00;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: level=0 on reset ---
    if (level === 4'd0 && empty === 1'b1)
      $display("PASS  reset: level=0 empty=1");
    else
      $display("FAIL  reset: level=%0d empty=%0b", level, empty);

    // --- Test 2: level tracks writes ---
    wr_en = 1;
    repeat(4) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (level === 4'd4)
      $display("PASS  4 writes: level=4");
    else
      $display("FAIL  4 writes: level=%0d (expected 4)", level);

    // --- Test 3: almost_full fires at level 7 ---
    wr_en = 1;
    repeat(3) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (almost_full === 1'b1 && full === 1'b0)
      $display("PASS  7 entries: almost_full=1 full=0");
    else
      $display("FAIL  7 entries: almost_full=%0b full=%0b", almost_full, full);

    // --- Test 4: full at level 8 ---
    wr_en = 1; wr_data = wr_data + 1; @(posedge clk); #1; wr_en = 0;
    if (full === 1'b1 && level === 4'd8)
      $display("PASS  8 entries: full=1 level=8");
    else
      $display("FAIL  8 entries: full=%0b level=%0d", full, level);

    // --- Test 5: almost_empty after draining to 1 ---
    rst_n = 0; @(posedge clk); #1; rst_n = 1; @(posedge clk); #1;
    wr_en = 1; wr_data = 8'hBB; @(posedge clk); #1; wr_en = 0;
    if (almost_empty === 1'b1 && level === 4'd1)
      $display("PASS  1 entry: almost_empty=1 level=1");
    else
      $display("FAIL  1 entry: almost_empty=%0b level=%0d", almost_empty, level);

    $display("TX FIFO level flags done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: level=0 empty=1',
        'PASS  4 writes: level=4',
        'PASS  7 entries: almost_full=1 full=0',
        'PASS  8 entries: full=1 level=8',
        'TX FIFO level flags done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — Programmable Watermarks (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long3l3',
      title: 'L3 — Programmable Watermarks',

      theory: `
<h2>Making Thresholds Software-Configurable</h2>
<p>
  Hardcoding <code>almost_empty = (level &lt;= 1)</code> works for a single use case,
  but real SPI controllers let the firmware tune these thresholds via registers.
  A DMA engine might want to refill the FIFO when <em>4</em> slots are empty;
  a power-sensitive sensor might want an interrupt only when the FIFO is
  <em>completely</em> empty. That is what the <strong>watermark</strong> registers
  are for.
</p>

<h3>Watermark Semantics</h3>
<table class="truth-table">
  <tr><th>Register</th><th>Flag raised when…</th><th>Typical value</th></tr>
  <tr><td><code>ae_thresh</code> — almost-empty threshold</td><td>level &lt;= ae_thresh</td><td>2 (refill when 2 words remain)</td></tr>
  <tr><td><code>af_thresh</code> — almost-full threshold</td><td>level &gt;= af_thresh</td><td>6 (stop writing at 6 words)</td></tr>
</table>

<p>
  The CPU writes these thresholds once at startup through the
  <code>FIFO_CTRL</code> register. The FIFO itself does not know or care that
  they came from a register — it just receives them as ports.
</p>

<pre class="code-block">
assign almost_empty = (level &lt;= ae_thresh);
assign almost_full  = (level &gt;= af_thresh);
</pre>

<h3>Parameter Constraint</h3>
<p>
  Thresholds are bounded: <code>ae_thresh</code> must be in <code>[0, DEPTH-1]</code>
  and <code>af_thresh</code> in <code>[1, DEPTH]</code>. Setting
  <code>ae_thresh = DEPTH</code> would make <code>almost_empty</code>
  permanently high, which is legal but useless. The hardware clamps silently;
  any out-of-range value from software is its own problem.
</p>

<h3>What You Will Build</h3>
<p>
  Extend L2's module with two new inputs — <code>ae_thresh</code> and
  <code>af_thresh</code> — each 4 bits wide. Replace the hardcoded comparisons
  with the parameterised versions above. Everything else stays the same.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from the L2 module — add two new input ports',
        '── New port ── input logic [3:0] ae_thresh,   ← almost-empty threshold',
        '── New port ── input logic [3:0] af_thresh,   ← almost-full threshold',
        '── Change assign ── almost_empty = (level <= ae_thresh);',
        '── Change assign ── almost_full  = (level >= af_thresh);',
        'All other logic (pointers, storage, full/empty) stays identical to L2',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_tx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic [3:0] ae_thresh,    // almost-empty fires when level <= this
  input  logic [3:0] af_thresh,    // almost-full  fires when level >= this
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic [3:0] level,
  output logic       full, empty,
  output logic       almost_empty, almost_full
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level === 4'd0);
  assign full         = (level === 4'd8);
  assign almost_empty = (level <= ae_thresh);   // threshold from port
  assign almost_full  = (level >= af_thresh);   // threshold from port

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
      end
    end
  end

endmodule`,

      design:
`// Extend spi_tx_fifo with programmable watermark thresholds.
// See Theory for the port names and assign formulas.
//
// New ports:
//   input logic [3:0] ae_thresh   — almost_empty fires when level <= ae_thresh
//   input logic [3:0] af_thresh   — almost_full  fires when level >= af_thresh
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en;
  logic [3:0] ae_thresh, af_thresh, level;
  logic [7:0] wr_data, rd_data;
  logic       full, empty, almost_empty, almost_full;

  spi_tx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .ae_thresh(ae_thresh), .af_thresh(af_thresh),
    .wr_data(wr_data), .rd_data(rd_data),
    .level(level),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full)
  );

  task automatic reset_fifo();
    rst_n = 0; wr_en = 0; rd_en = 0; wr_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1; @(posedge clk); #1;
  endtask

  initial begin
    ae_thresh = 4'd2; af_thresh = 4'd6;

    // --- Test 1: ae_thresh=2, fill to 2, check almost_empty fires ---
    reset_fifo();
    wr_en = 1;
    wr_data = 8'hAA; @(posedge clk); #1;
    wr_data = 8'hBB; @(posedge clk); #1;
    wr_en = 0;
    if (almost_empty === 1'b1 && level === 4'd2)
      $display("PASS  ae_thresh=2 level=2: almost_empty=1");
    else
      $display("FAIL  ae_thresh=2 level=2: almost_empty=%0b level=%0d", almost_empty, level);

    // --- Test 2: add one more word, almost_empty should clear ---
    wr_en = 1; wr_data = 8'hCC; @(posedge clk); #1; wr_en = 0;
    if (almost_empty === 1'b0 && level === 4'd3)
      $display("PASS  level=3 > ae_thresh=2: almost_empty=0");
    else
      $display("FAIL  level=3: almost_empty=%0b (expected 0)", almost_empty);

    // --- Test 3: af_thresh=6, fill to 6, check almost_full fires ---
    reset_fifo();
    wr_en = 1;
    repeat(6) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (almost_full === 1'b1 && level === 4'd6)
      $display("PASS  af_thresh=6 level=6: almost_full=1");
    else
      $display("FAIL  af_thresh=6 level=6: almost_full=%0b level=%0d", almost_full, level);

    // --- Test 4: change threshold at runtime ---
    ae_thresh = 4'd3;  // now almost_empty should fire at level=3 or below
    // drain down to 3 words
    rd_en = 1;
    repeat(3) begin
      @(posedge clk); #1;
    end
    rd_en = 0;
    if (almost_empty === 1'b1)
      $display("PASS  ae_thresh changed to 3: almost_empty=1 at level=%0d", level);
    else
      $display("FAIL  ae_thresh changed to 3: almost_empty=%0b level=%0d", almost_empty, level);

    $display("TX FIFO watermarks done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  ae_thresh=2 level=2: almost_empty=1',
        'PASS  level=3 > ae_thresh=2: almost_empty=0',
        'PASS  af_thresh=6 level=6: almost_full=1',
        'TX FIFO watermarks done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Overflow Flag & Flush (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long3l4',
      title: 'L4 — Overflow Flag & Flush',

      theory: `
<h2>Handling Write Overflows and Software Flushes</h2>
<p>
  In a real system, software can get ahead of itself — it writes to the TX FIFO
  even though it is already full. Two things must happen:
</p>
<ul>
  <li>The incoming word is <strong>dropped silently</strong> (no pointer advances).</li>
  <li>A <strong>sticky overflow flag</strong> (<code>ovf_sticky</code>) is set and
      stays set until the CPU explicitly clears it via a W1C (write-1-to-clear)
      control bit in the <code>FIFO_STATUS</code> register.</li>
</ul>

<h3>Sticky Flag Pattern</h3>
<pre class="code-block">
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n)
    ovf_sticky &lt;= 1'b0;
  else if (wr_en &amp;&amp; full)       // overflow event
    ovf_sticky &lt;= 1'b1;
  else if (clr_ovf)             // W1C clear from CPU
    ovf_sticky &lt;= 1'b0;
end
</pre>
<p>
  The priority matters: set takes priority over clear. That way a simultaneous
  overflow and clear is registered as an overflow (not silently lost).
</p>

<h3>Flush — Reset Without Reset</h3>
<p>
  The <code>flush</code> input lets firmware drain the FIFO instantly —
  faster than reading every word. It resets both pointers to 0 in one clock cycle,
  making the FIFO appear empty. No actual data is touched in <code>mem[]</code>;
  the next write simply overwrites the old contents.
</p>
<pre class="code-block">
if (flush) begin
  wr_ptr &lt;= 4'b0;
  rd_ptr &lt;= 4'b0;
end
</pre>
<p>
  Flush has lower priority than reset but higher priority than normal
  read/write operations.
</p>

<h3>What You Will Build</h3>
<p>
  Extend L3's module with <code>flush</code> and <code>clr_ovf</code> inputs and
  the <code>ovf_sticky</code> output. The always_ff block gains two new priority
  branches above the normal pointer updates.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from the L3 module skeleton',
        '── New port ── input logic flush,    ← synchronous pointer reset',
        '── New port ── input logic clr_ovf,  ← W1C: clears ovf_sticky',
        '── New port ── output logic ovf_sticky,',
        'Add a separate always_ff block for ovf_sticky: set on (wr_en && full), clear on clr_ovf',
        'In the pointer always_ff: add an else-if (flush) branch that zeros both pointers (before wr_en/rd_en checks)',
        'Overflow rule: when wr_en && full, do NOT advance wr_ptr — drop the word',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_tx_fifo (
  input  logic       clk, rst_n,
  input  logic       wr_en, rd_en,
  input  logic       flush, clr_ovf,
  input  logic [3:0] ae_thresh, af_thresh,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic [3:0] level,
  output logic       full, empty,
  output logic       almost_empty, almost_full,
  output logic       ovf_sticky
);
  localparam DEPTH = 8;

  logic [7:0] mem [0:DEPTH-1];
  logic [3:0] wr_ptr, rd_ptr;

  assign level        = wr_ptr - rd_ptr;
  assign empty        = (level === 4'd0);
  assign full         = (level === 4'd8);
  assign almost_empty = (level <= ae_thresh);
  assign almost_full  = (level >= af_thresh);

  // Sticky overflow flag — set beats clear
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n)           ovf_sticky <= 1'b0;
    else if (wr_en && full) ovf_sticky <= 1'b1;   // overflow wins
    else if (clr_ovf)     ovf_sticky <= 1'b0;
  end

  // Pointer and storage logic
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr  <= 4'b0;
      rd_ptr  <= 4'b0;
      rd_data <= 8'b0;
    end else if (flush) begin                      // flush takes priority
      wr_ptr <= 4'b0;
      rd_ptr <= 4'b0;
    end else begin
      if (wr_en && !full) begin                    // normal write (drop if full)
        mem[wr_ptr[2:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[2:0]];
        rd_ptr  <= rd_ptr + 1;
      end
    end
  end

endmodule`,

      design:
`// Extend spi_tx_fifo with flush and overflow detection.
// See Theory for the sticky flag pattern and flush priority.
//
// New ports:
//   input  logic flush      — synchronous pointer reset (clears FIFO in 1 cycle)
//   input  logic clr_ovf    — W1C: clears ovf_sticky when asserted
//   output logic ovf_sticky — set when wr_en fires while full; stays until clr_ovf
//
// Priority in always_ff: rst_n > flush > normal wr/rd
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, wr_en, rd_en, flush, clr_ovf;
  logic [3:0] ae_thresh, af_thresh, level;
  logic [7:0] wr_data, rd_data;
  logic       full, empty, almost_empty, almost_full, ovf_sticky;

  spi_tx_fifo dut (
    .clk(clk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en),
    .flush(flush), .clr_ovf(clr_ovf),
    .ae_thresh(ae_thresh), .af_thresh(af_thresh),
    .wr_data(wr_data), .rd_data(rd_data),
    .level(level),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full),
    .ovf_sticky(ovf_sticky)
  );

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; clr_ovf = 0;
    wr_data = 8'h00; ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: fill to full (8 writes) ---
    wr_en = 1;
    repeat(8) begin
      wr_data = wr_data + 1;
      @(posedge clk); #1;
    end
    wr_en = 0;
    if (full === 1'b1 && ovf_sticky === 1'b0)
      $display("PASS  full with no overflow yet");
    else
      $display("FAIL  full=%0b ovf_sticky=%0b (expected full=1 ovf=0)", full, ovf_sticky);

    // --- Test 2: write while full → overflow sticky ---
    wr_en = 1; wr_data = 8'hFF; @(posedge clk); #1; wr_en = 0;
    if (ovf_sticky === 1'b1 && full === 1'b1)
      $display("PASS  overflow: ovf_sticky=1 full=1");
    else
      $display("FAIL  overflow: ovf_sticky=%0b full=%0b", ovf_sticky, full);

    // --- Test 3: clr_ovf clears the flag ---
    clr_ovf = 1; @(posedge clk); #1; clr_ovf = 0;
    if (ovf_sticky === 1'b0)
      $display("PASS  clr_ovf: ovf_sticky=0");
    else
      $display("FAIL  clr_ovf: ovf_sticky=%0b (expected 0)", ovf_sticky);

    // --- Test 4: flush resets pointers to empty ---
    flush = 1; @(posedge clk); #1; flush = 0;
    if (empty === 1'b1 && level === 4'd0)
      $display("PASS  flush: empty=1 level=0");
    else
      $display("FAIL  flush: empty=%0b level=%0d", empty, level);

    // --- Test 5: write after flush works normally ---
    wr_en = 1; wr_data = 8'hA5; @(posedge clk); #1; wr_en = 0;
    if (level === 4'd1 && ovf_sticky === 1'b0)
      $display("PASS  post-flush write: level=1 ovf=0");
    else
      $display("FAIL  post-flush write: level=%0d ovf=%0b", level, ovf_sticky);

    $display("TX FIFO overflow and flush done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  full with no overflow yet',
        'PASS  overflow: ovf_sticky=1 full=1',
        'PASS  clr_ovf: ovf_sticky=0',
        'PASS  flush: empty=1 level=0',
        'TX FIFO overflow and flush done!',
      ]
    },

  ]
});
