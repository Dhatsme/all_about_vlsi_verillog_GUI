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
<h2>The Airport Boarding Queue</h2>
<p>
  Imagine you are at a busy airport boarding gate. Passengers (bytes from the CPU)
  arrive at their own pace — sometimes five at once, sometimes none for a while.
  But the flight crew (SPI shift register) can only process one passenger at a time,
  at a fixed boarding pace set by SCK. Without a waiting area, passengers who arrive
  while the flight crew is busy would simply be lost forever.
</p>
<p>
  The TX FIFO is that waiting area — eight numbered seats arranged in a circle.
  Two attendants manage the queue: a <strong>write pointer</strong> who shows
  arriving passengers to the next empty seat, and a <strong>read pointer</strong>
  who escorts them onto the plane one by one. Neither attendant needs to know what
  the other is doing — they just keep moving forward around the circle.
</p>

<h3>Where the TX FIFO Lives in Our SPI Master</h3>
<pre class="code-block">
  The CPU writes bytes into TXDATA
  register via the APB bus
          │
          ▼
  ┌──────────────────────────────────────────────────┐
  │             spi_tx_fifo                      ★   │
  │                                                  │
  │  wr_ptr ──► mem[0]  mem[1]  ...  mem[7]          │
  │                               │                  │
  │                            rd_ptr                │
  │                                                  │
  │  Outputs: rd_data, full, empty                   │
  └─────────────────────────┬────────────────────────┘
                            │ rd_data
                            ▼
                     spi_shift (spi_long5)
                            │
                         MOSI pin ──► sensor
</pre>

<h3>The Circular Queue and the Wrap Bit Trick</h3>
<p>
  Both pointers start at 0. Each write increments <code>wr_ptr</code>; each read
  increments <code>rd_ptr</code>. Both wrap from 7 back to 0. With 8 slots and
  3-bit index pointers (0–7), how do we tell <strong>empty</strong>
  (both pointers at slot 0 — no data) from <strong>full</strong>
  (one pointer has lapped the other — all 8 slots used)?
</p>
<p>
  Think of it like laps on a running track. Two runners start at the same spot.
  If they are on the same lap and at the same position → they have not separated →
  <strong>empty</strong>. If one has lapped the other and they are at the same
  position → a full lap of separation → <strong>full</strong>. We track this
  with a <strong>wrap bit</strong> — a 4th bit that flips every time the 3-bit
  index wraps from 7 to 0:
</p>
<table class="truth-table">
  <tr><th>wr_ptr[3] == rd_ptr[3]?</th><th>wr_ptr[2:0] == rd_ptr[2:0]?</th><th>Condition</th></tr>
  <tr><td>Yes (same lap)</td><td>Yes (same position)</td><td><strong>EMPTY</strong></td></tr>
  <tr><td>No (different laps)</td><td>Yes (same position)</td><td><strong>FULL</strong></td></tr>
  <tr><td>any</td><td>No</td><td>Partially filled</td></tr>
</table>
<pre class="code-block">
logic [7:0] mem [0:7];         // 8 storage slots
logic [3:0] wr_ptr, rd_ptr;    // 4-bit: [3]=lap bit, [2:0]=slot index

assign empty = (wr_ptr === rd_ptr);
assign full  = (wr_ptr[2:0] === rd_ptr[2:0]) &amp;&amp; (wr_ptr[3] !== rd_ptr[3]);

always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    wr_ptr  &lt;= 4'b0;
    rd_ptr  &lt;= 4'b0;
    rd_data &lt;= 8'b0;
  end else begin
    if (wr_en &amp;&amp; !full) begin
      mem[wr_ptr[2:0]] &lt;= wr_data;
      wr_ptr &lt;= wr_ptr + 1;      // wrap bit flips naturally at 8
    end
    if (rd_en &amp;&amp; !empty) begin
      rd_data &lt;= mem[rd_ptr[2:0]];
      rd_ptr  &lt;= rd_ptr + 1;
    end
  end
end
</pre>
<p>
  Notice <code>rd_data</code> is registered — it appears one clock cycle after
  <code>rd_en</code> asserts. This one-cycle latency is normal for synchronous
  FIFOs and exactly what the SPI shift register expects.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header: module spi_tx_fifo (',
        '         input  logic       clk, rst_n',
        '         input  logic       wr_en, rd_en',
        '         input  logic [7:0] wr_data',
        '         output logic [7:0] rd_data',
        '         output logic       full, empty',
        '         );',
        'Step 2 — Declare storage and 4-bit pointers:',
        '         logic [7:0] mem [0:7];',
        '         logic [3:0] wr_ptr, rd_ptr;',
        'Step 3 — Two combinational assigns for empty and full (use the wrap-bit formulas from Theory)',
        'Step 4 — always_ff @(posedge clk or negedge rst_n):',
        '         if (!rst_n): zero wr_ptr, rd_ptr, rd_data',
        '         else if (wr_en && !full): write mem[wr_ptr[2:0]], increment wr_ptr',
        '         else if (rd_en && !empty): latch rd_data from mem[rd_ptr[2:0]], increment rd_ptr',
        'Step 5 — endmodule',
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
// Read Theory first — it explains the wrap-bit trick for empty/full.
//
// Ports:
//   input  logic       clk        — system clock
//   input  logic       rst_n      — active-low async reset
//   input  logic       wr_en      — push one byte this cycle
//   input  logic       rd_en      — pop one byte this cycle
//   input  logic [7:0] wr_data    — byte to push
//   output logic [7:0] rd_data    — byte popped (registered, 1-cycle latency)
//   output logic       full       — no room to write
//   output logic       empty      — nothing to read
//
// Internals: mem[0:7], wr_ptr[3:0], rd_ptr[3:0]
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
    $display("=== TX FIFO: Pointer Arithmetic ===");
    rst_n = 0; wr_en = 0; rd_en = 0; wr_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: empty on reset ---
    if (empty === 1'b1 && full === 1'b0)
      $display("PASS  reset: empty=1 full=0");
    else
      $display("FAIL  reset: empty=%0b full=%0b", empty, full);

    // --- Test 2: write three bytes, read first back ---
    wr_en = 1;
    wr_data = 8'hA5; @(posedge clk); #1;
    wr_data = 8'h3C; @(posedge clk); #1;
    wr_data = 8'h7F; @(posedge clk); #1;
    wr_en = 0;

    rd_en = 1; @(posedge clk); #1;   // rd_ptr advances, rd_data latches 0xA5
    rd_en = 0; @(posedge clk); #1;
    if (rd_data === 8'hA5)
      $display("PASS  read[0]: rd_data=0x%02h", rd_data);
    else
      $display("FAIL  read[0]: rd_data=0x%02h (expected 0xA5)", rd_data);

    // --- Test 3: fill to full (8 entries) ---
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
      $display("FAIL  full flag not set: full=%0b", full);

    // --- Test 4: write while full is ignored ---
    wr_en = 1; wr_data = 8'hFF; @(posedge clk); #1; wr_en = 0;
    if (full === 1'b1)
      $display("PASS  still full after blocked write");
    else
      $display("FAIL  full flag changed unexpectedly: full=%0b", full);

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
<h2>The Water Tank with a Level Gauge</h2>
<p>
  Imagine a water tower with a glass level gauge on the side. You pump water in
  from the top (CPU writes bytes into the FIFO) and draw it out from a tap at
  the bottom (SPI engine reads bytes at SCK rate). The level gauge tells you
  exactly how much water — how many bytes — are currently waiting inside.
</p>
<p>
  Real hardware needs this count, not just the binary full/empty extremes.
  The SPI controller uses it to decide whether to start a new burst, when to
  request more data from the CPU via a DMA trigger, or when to raise an interrupt.
  The fill count is called the <strong>level</strong>.
</p>

<h3>Deriving Level from Pointers</h3>
<p>
  Because our 4-bit pointers wrap naturally using the lap-bit trick, the fill level
  is simply the unsigned difference of the two full 4-bit values. No special cases:
</p>
<pre class="code-block">
assign level = wr_ptr - rd_ptr;   // 4-bit result, naturally 0..8
</pre>
<p>
  When <code>wr_ptr == rd_ptr</code> → result = 0 (empty).
  When one pointer has lapped the other by exactly 8 → result = 8 (full).
  Everything in between gives the true fill count.
</p>

<h3>Four Status Flags from Level</h3>
<p>
  Think of the water tower with four sensor probes installed at different heights
  — each one lights up when the water reaches it:
</p>
<table class="truth-table">
  <tr><th>Flag</th><th>Condition</th><th>Meaning</th></tr>
  <tr><td><code>empty</code></td><td>level == 0</td><td>No data — SPI engine would underrun</td></tr>
  <tr><td><code>full</code></td><td>level == 8</td><td>No room — CPU must pause writing</td></tr>
  <tr><td><code>almost_empty</code></td><td>level &lt;= 1</td><td>Last byte — warn CPU to refill soon</td></tr>
  <tr><td><code>almost_full</code></td><td>level &gt;= 7</td><td>One slot left — give CPU early warning</td></tr>
</table>
<p>
  The <code>almost_empty</code> and <code>almost_full</code> thresholds are
  hardcoded to 1 entry in this lesson. In L3 we make them software-configurable.
  All four flags are purely combinational — pure <code>assign</code> statements,
  no clock needed.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L1 spi_tx_fifo skeleton — same ports, same internals',
        'Step 2 — Add two new output ports:',
        '         output logic [3:0] level',
        '         output logic       almost_empty, almost_full',
        'Step 3 — Add four combinational assigns:',
        '         assign level        = wr_ptr - rd_ptr;',
        '         assign empty        = (level === 4\'d0);',
        '         assign full         = (level === 4\'d8);',
        '         assign almost_empty = (level <= 4\'d1);',
        '         assign almost_full  = (level >= 4\'d7);',
        'Step 4 — Keep the always_ff block identical to L1 (pointer updates only)',
        'Step 5 — endmodule',
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
// See Theory for the assign formulas — all purely combinational.
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
    $display("=== TX FIFO: Level & Flags ===");
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
<h2>Setting Your Own Alarm Thresholds</h2>
<p>
  Think of your phone's battery alarms. One person might want a warning at 20%
  and a critical alert at 10%. Another might want them at 30% and 15% — maybe
  they are a heavy user who needs more time to find a charger. The phone does not
  hardcode these thresholds; it lets each user pick the levels that matter to them.
</p>
<p>
  Real SPI controllers work the same way. The CPU writes watermark registers
  once at startup, and the FIFO raises flags when the level crosses those
  programmed thresholds. A DMA engine might want to refill the FIFO when 4 slots
  are empty. A power-sensitive driver might only trigger an interrupt when the FIFO
  is completely empty. The hardware does not decide — software does.
</p>

<h3>Watermark Semantics</h3>
<table class="truth-table">
  <tr><th>Port</th><th>Flag fires when…</th><th>Typical value</th></tr>
  <tr><td><code>ae_thresh</code></td><td>level &lt;= ae_thresh</td><td>2 — refill when only 2 words remain</td></tr>
  <tr><td><code>af_thresh</code></td><td>level &gt;= af_thresh</td><td>6 — stop writing at 6 entries</td></tr>
</table>
<p>
  The CPU writes these thresholds through the <code>FIFO_CTRL</code> register once
  at boot. The FIFO itself does not know or care where they came from — it just
  receives them as input ports and applies the comparisons every cycle.
</p>
<pre class="code-block">
input logic [3:0] ae_thresh,   // almost-empty fires when level &lt;= this
input logic [3:0] af_thresh,   // almost-full  fires when level &gt;= this

assign almost_empty = (level &lt;= ae_thresh);
assign almost_full  = (level &gt;= af_thresh);
</pre>

<h3>Boundary Constraint</h3>
<p>
  Thresholds are bounded: <code>ae_thresh</code> should stay in
  <code>[0, DEPTH-1]</code> and <code>af_thresh</code> in
  <code>[1, DEPTH]</code>. Setting <code>ae_thresh = 8</code> would make
  <code>almost_empty</code> always HIGH, which is legal but useless.
  Hardware clamps nothing — any out-of-range value from software is software's problem.
  This one takes a few tries to get right — that is completely normal.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L2 module — keep all existing ports and internals',
        'Step 2 — Add two new input ports:',
        '         input logic [3:0] ae_thresh   (almost-empty threshold)',
        '         input logic [3:0] af_thresh   (almost-full threshold)',
        'Step 3 — Replace the hardcoded almost_empty and almost_full assigns:',
        '         assign almost_empty = (level <= ae_thresh);',
        '         assign almost_full  = (level >= af_thresh);',
        'Step 4 — All pointer logic (always_ff) stays identical to L2',
        'Step 5 — endmodule',
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
    $display("=== TX FIFO: Programmable Watermarks ===");
    ae_thresh = 4'd2; af_thresh = 4'd6;

    // --- Test 1: ae_thresh=2, fill to 2 ---
    reset_fifo();
    wr_en = 1;
    wr_data = 8'hAA; @(posedge clk); #1;
    wr_data = 8'hBB; @(posedge clk); #1;
    wr_en = 0;
    if (almost_empty === 1'b1 && level === 4'd2)
      $display("PASS  ae_thresh=2 level=2: almost_empty=1");
    else
      $display("FAIL  ae_thresh=2 level=2: almost_empty=%0b level=%0d", almost_empty, level);

    // --- Test 2: add one more word, almost_empty clears ---
    wr_en = 1; wr_data = 8'hCC; @(posedge clk); #1; wr_en = 0;
    if (almost_empty === 1'b0 && level === 4'd3)
      $display("PASS  level=3 > ae_thresh=2: almost_empty=0");
    else
      $display("FAIL  level=3: almost_empty=%0b (expected 0)", almost_empty);

    // --- Test 3: af_thresh=6, fill to 6 ---
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
    ae_thresh = 4'd3;
    rd_en = 1;
    repeat(3) @(posedge clk); #1;
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
<h2>The Bouncer and the Fire Alarm</h2>
<p>
  Picture the airport boarding gate again — but now all 8 seats in the waiting
  area are taken. A ninth passenger arrives anyway and tries to push in.
  The boarding agent (our hardware) cannot create an extra seat, so they gently
  turn the passenger away. But there is a problem: if nobody notices that someone
  was turned away, that byte is silently lost — and the CPU has no idea the
  transfer is incomplete.
</p>
<p>
  This is the <strong>sticky overflow flag</strong>. When a write arrives while
  the FIFO is full, the incoming byte is dropped, and a flag is raised that stays
  raised until the CPU explicitly clears it. The CPU polls the flag after every
  transfer to detect if it missed feeding the FIFO in time.
</p>
<p>
  Now imagine a fire alarm clears the entire gate instantly. Everyone in the waiting
  area has to leave immediately — no orderly boarding, no individual checkouts.
  In one second the waiting area is empty. That is the <strong>flush</strong>
  input: both pointers reset to zero in a single clock cycle, making the FIFO
  appear empty instantly. The old data is still physically in <code>mem[]</code>
  but will be overwritten by the next writes.
</p>

<h3>Sticky Flag Pattern — Set Beats Clear</h3>
<pre class="code-block">
// Separate always_ff for the sticky flag
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n)
    ovf_sticky &lt;= 1'b0;
  else if (wr_en &amp;&amp; full)      // overflow event — set wins
    ovf_sticky &lt;= 1'b1;
  else if (clr_ovf)            // W1C: CPU writes 1 to clear
    ovf_sticky &lt;= 1'b0;
end
</pre>
<p>
  The priority matters: <strong>set takes priority over clear</strong>. If an
  overflow and a software clear arrive in the same cycle, the flag stays set.
  This prevents a race where the CPU thinks it cleared the flag but another
  overflow had already happened.
</p>

<h3>Flush — Reset Without Reset</h3>
<pre class="code-block">
// Pointer logic: rst_n > flush > normal wr/rd
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin
    wr_ptr &lt;= 4'b0; rd_ptr &lt;= 4'b0;
  end else if (flush) begin          // fire alarm: empty instantly
    wr_ptr &lt;= 4'b0; rd_ptr &lt;= 4'b0;
  end else begin
    if (wr_en &amp;&amp; !full)   ... // normal write
    if (rd_en &amp;&amp; !empty)  ... // normal read
  end
end
</pre>

<h3>What We Are Building</h3>
<p>
  Extend the L3 module with two new inputs (<code>flush</code> and
  <code>clr_ovf</code>) and one new output (<code>ovf_sticky</code>).
  The always_ff block for pointers gains a flush branch above the normal
  read/write logic. The overflow flag lives in its own always_ff block.
  This is a real interview question at hardware companies — the set-beats-clear
  priority and the flush-before-write ordering trip up almost everyone the first time.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L3 module skeleton — all existing ports remain',
        'Step 2 — Add three new ports:',
        '         input  logic flush     (synchronous pointer reset)',
        '         input  logic clr_ovf   (W1C: clears ovf_sticky)',
        '         output logic ovf_sticky',
        'Step 3 — Add a SEPARATE always_ff block for ovf_sticky:',
        '         if (!rst_n): ovf_sticky <= 0',
        '         else if (wr_en && full): ovf_sticky <= 1   (set wins)',
        '         else if (clr_ovf): ovf_sticky <= 0',
        'Step 4 — In the pointer always_ff, add a flush branch BEFORE wr_en/rd_en:',
        '         if (!rst_n): reset pointers',
        '         else if (flush): wr_ptr <= 0; rd_ptr <= 0',
        '         else: normal wr/rd pointer updates',
        'Step 5 — Overflow rule: when wr_en && full, do NOT advance wr_ptr',
        'Step 6 — endmodule',
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
    if (!rst_n)             ovf_sticky <= 1'b0;
    else if (wr_en && full) ovf_sticky <= 1'b1;   // overflow wins
    else if (clr_ovf)       ovf_sticky <= 1'b0;
  end

  // Pointer and storage — rst > flush > wr/rd
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
// Two separate always_ff blocks:
//   1. ovf_sticky: if set event, else if clr event
//   2. pointers:   if rst, else if flush, else normal wr/rd
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
    $display("=== TX FIFO: Overflow & Flush ===");
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; clr_ovf = 0;
    wr_data = 8'h00; ae_thresh = 4'd2; af_thresh = 4'd6;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: fill to full (8 writes), no overflow yet ---
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

    // --- Test 2: write while full → overflow sticky set ---
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
