(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb1',
  title: 'Unit Testbench Suite',
  icon: '🧪',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long_tb1l1',
      title: 'L1 — Clock Divider Testbench',
      theory: `<h2>Writing a Self-Checking Clock Divider Testbench</h2>
<p>Simulation without assertions is just waveform art. A production-quality testbench <em>measures</em> behaviour: it counts edges over a fixed time window, verifies idle levels after controlled state changes, and checks that one-cycle-wide pulses fire at exactly the right moments. This lesson walks through all three patterns using <code>spi_clk_div</code> — the 16-bit counter-based clock divider you built in Chapter 2.</p>

<h3>Why quantitative checking matters</h3>
<p>The naive approach just drives inputs and watches the waveform. That works for exploratory debugging, but it misses subtle bugs: a divider running at 90% of the target frequency looks correct on a zoomed-out waveform yet will cause SPI timing violations in silicon. The testbench below catches that class of bug by counting edges over a large window and failing if the count falls outside a tight tolerance band.</p>

<h3>Pattern 1 — Frequency measurement by edge counting</h3>
<p>Run the divider for N reference clock cycles and count how many <code>rising_edge_p</code> pulses appear. With <code>div=4</code>, the internal counter counts 0→4 then toggles — 5 cycles per half-period, 10 cycles per full period. Over 100 cycles you expect 10 rising edges.</p>
<pre class="code-block">rise_cnt = 0;
for (i = 0; i &lt; 100; i = i + 1) begin
  @(posedge pclk); #1;
  if (rising_edge_p) rise_cnt = rise_cnt + 1;
end
// Accept 9-11 to allow for startup latency
if (rise_cnt &gt;= 9 &amp;&amp; rise_cnt &lt;= 11)
  $display("PASS  SCK edges=%0d in 100 cycles", rise_cnt);</pre>
<p>The tolerance window (9–11 rather than exactly 10) accounts for the first toggle arriving after reset is released — the first half-period may be slightly short.</p>

<h3>Pattern 2 — Idle level after enable deassertion</h3>
<p>When <code>enable</code> goes low, <code>sck_out</code> must freeze at the <code>cpol</code> idle level within one clock cycle — not mid-toggle. A broken divider that lets SCK finish a partial toggle produces a glitch on the SPI bus. The check is a single-cycle settle wait:</p>
<pre class="code-block">enable = 0;
@(posedge pclk); #1;     // one cycle settle
if (sck_out === 1'b0)    // cpol=0
  $display("PASS  enable=0 freezes SCK at CPOL=0");</pre>

<h3>Pattern 3 — Edge pulse balance</h3>
<p><code>rising_edge_p</code> and <code>falling_edge_p</code> are computed from consecutive SCK samples. Over any complete run, every rising edge is followed by a falling edge, so the count of each must match exactly. If they differ, the edge detector has a bug — a stuck output, a doubled pulse, or a missed transition.</p>
<pre class="code-block">if (rise_cnt == fall_cnt)
  $display("PASS  rising=%0d falling=%0d (balanced)", rise_cnt, fall_cnt);</pre>

<h3>Test plan for spi_clk_div</h3>
<table class="truth-table">
  <tr><th>Test</th><th>Signal under test</th><th>DIV</th><th>Window</th><th>Pass condition</th></tr>
  <tr><td>Frequency</td><td>rising_edge_p count</td><td>4</td><td>100 cycles</td><td>9 ≤ count ≤ 11</td></tr>
  <tr><td>CPOL=0 idle</td><td>sck_out when enable=0</td><td>—</td><td>4 cycles</td><td>sck_out===0</td></tr>
  <tr><td>CPOL=1 idle</td><td>sck_out when enable=0</td><td>—</td><td>4 cycles</td><td>sck_out===1</td></tr>
  <tr><td>Enable gating</td><td>sck_out after enable↓</td><td>4</td><td>1 cycle</td><td>sck_out===0 (CPOL=0)</td></tr>
  <tr><td>Edge balance</td><td>rising vs falling count</td><td>2</td><td>40 cycles</td><td>rise_cnt==fall_cnt</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_clk_div</code> in the Code tab. The testbench is pre-wired — your DUT must pass all five PASS lines. Use your notes from Chapter 2 or reason from the port list:</p>
<pre class="code-block">module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out,
  output logic        rising_edge_p,
  output logic        falling_edge_p
);</pre>
<p>Internal state: a 16-bit counter <code>div_cnt</code>, a toggle register <code>sck_int</code>, and a one-cycle delay <code>sck_prev</code> for the edge detector.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for the annotated reference implementation.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_clk_div from Chapter 2.',
        'Declare registers: div_cnt [15:0], sck_int, sck_prev',
        'always_ff block: on rst_n low, clear div_cnt, sck_int, sck_prev to 0',
        'enable=1: count div_cnt up; when div_cnt==div, reset to 0 and toggle sck_int; delay sck_int into sck_prev every cycle',
        'enable=0: force sck_int and sck_prev to cpol; reset div_cnt to 0',
        'assign sck_out = enable ? sck_int : cpol',
        'assign rising_edge_p = sck_int & ~sck_prev',
        'assign falling_edge_p = ~sck_int & sck_prev',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out,
  output logic        rising_edge_p,
  output logic        falling_edge_p
);
  logic [15:0] div_cnt;  // counts 0 .. div, then wraps
  logic        sck_int;  // raw toggling internal clock
  logic        sck_prev; // delayed one cycle for edge detection

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt  <= 0;
      sck_int  <= 0;
      sck_prev <= 0;
    end else if (enable) begin
      if (div_cnt == div) begin
        div_cnt <= 0;
        sck_int <= ~sck_int;
      end else begin
        div_cnt <= div_cnt + 1;
      end
      sck_prev <= sck_int;
    end else begin
      sck_int  <= cpol;
      sck_prev <= cpol;
      div_cnt  <= 0;
    end
  end

  assign sck_out       = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_int & ~sck_prev;
  assign falling_edge_p = ~sck_int & sck_prev;

endmodule`,
      design:
`// Re-implement spi_clk_div here. See Theory for the full test plan.
//
// Ports:
//   input  logic        pclk, rst_n  -- clock and active-low async reset
//   input  logic        enable       -- gates SCK; when 0, SCK freezes at cpol
//   input  logic        cpol         -- clock polarity (idle level 0 or 1)
//   input  logic [15:0] div          -- half-period = (div+1) pclk cycles
//   output logic        sck_out      -- gated SCK output
//   output logic        rising_edge_p   -- 1-cycle pulse on each SCK rising edge
//   output logic        falling_edge_p  -- 1-cycle pulse on each SCK falling edge
//
// Internal: div_cnt [15:0], sck_int, sck_prev
//
// Delete this block and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        pclk = 0;
  logic        rst_n, enable, cpol;
  logic [15:0] div;
  logic        sck_out, rising_edge_p, falling_edge_p;

  always #5 pclk = ~pclk;

  spi_clk_div dut (
    .pclk(pclk), .rst_n(rst_n), .enable(enable),
    .cpol(cpol), .div(div),
    .sck_out(sck_out),
    .rising_edge_p(rising_edge_p),
    .falling_edge_p(falling_edge_p)
  );

  integer rise_cnt;
  integer fall_cnt;
  integer i;

  initial begin
    rst_n = 0; enable = 0; cpol = 0; div = 4;
    repeat(4) @(posedge pclk);
    rst_n = 1;

    $display("=== Test 1: Frequency ===");
    enable = 1; rise_cnt = 0;
    for (i = 0; i < 100; i = i + 1) begin
      @(posedge pclk); #1;
      if (rising_edge_p) rise_cnt = rise_cnt + 1;
    end
    enable = 0;
    if (rise_cnt >= 9 && rise_cnt <= 11)
      $display("PASS  SCK edges=%0d in 100 cycles (expect ~10)", rise_cnt);
    else
      $display("FAIL  SCK edges=%0d in 100 cycles", rise_cnt);

    $display("=== Test 2: CPOL idle ===");
    cpol = 0; enable = 0;
    repeat(4) @(posedge pclk); #1;
    if (sck_out === 1'b0)
      $display("PASS  CPOL=0: sck_out idles low");
    else
      $display("FAIL  CPOL=0: sck_out=%0b", sck_out);
    cpol = 1; enable = 0;
    repeat(4) @(posedge pclk); #1;
    if (sck_out === 1'b1)
      $display("PASS  CPOL=1: sck_out idles high");
    else
      $display("FAIL  CPOL=1: sck_out=%0b", sck_out);

    $display("=== Test 3: Enable gating ===");
    cpol = 0; div = 4; enable = 1;
    repeat(20) @(posedge pclk);
    enable = 0;
    @(posedge pclk); #1;
    if (sck_out === 1'b0)
      $display("PASS  enable=0 freezes SCK at CPOL=0");
    else
      $display("FAIL  enable=0 sck_out=%0b", sck_out);

    $display("=== Test 4: Edge pulses ===");
    cpol = 0; div = 2; enable = 1;
    rise_cnt = 0; fall_cnt = 0;
    for (i = 0; i < 40; i = i + 1) begin
      @(posedge pclk); #1;
      if (rising_edge_p)  rise_cnt = rise_cnt + 1;
      if (falling_edge_p) fall_cnt = fall_cnt + 1;
    end
    enable = 0;
    if (rise_cnt > 0 && rise_cnt == fall_cnt)
      $display("PASS  rising=%0d falling=%0d (balanced)", rise_cnt, fall_cnt);
    else
      $display("FAIL  rising=%0d falling=%0d", rise_cnt, fall_cnt);

    $display("Clock divider testbench complete!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  SCK edges=',
        'PASS  CPOL=0: sck_out idles low',
        'PASS  enable=0 freezes SCK at CPOL=0',
        'Clock divider testbench complete!'
      ]
    },
    {
      id: 'spi_long_tb1l2',
      title: 'L2 — FIFO Testbench',
      theory: `<h2>Writing a Self-Checking FIFO Testbench</h2>
<p>FIFOs are the most failure-prone component in digital designs because they combine pointer arithmetic, flag generation, and flow control in one module. A good FIFO testbench does not just push a few values and read them back — it deliberately drives the FIFO into every boundary condition: exactly full, exactly empty, overflow attempt, watermark crossing, and a flush. This lesson builds that testbench for the synchronous TX FIFO you designed in Chapter 3.</p>

<h3>The five boundary conditions every FIFO testbench must cover</h3>
<p>Boundary bugs hide in corners casual tests never reach. Every FIFO testbench should hit all five:</p>
<ul>
  <li><strong>Full detection</strong> — <code>level</code> must equal DEPTH and <code>full</code> must assert after the 8th write</li>
  <li><strong>Overflow protection</strong> — a write when full must be silently dropped and <code>ovf_sticky</code> must latch</li>
  <li><strong>Empty detection</strong> — <code>level</code> must reach 0 and <code>empty</code> must assert after the last read</li>
  <li><strong>Watermarks</strong> — <code>almost_full</code> when level ≥ 6; <code>almost_empty</code> when level ≤ 2 (WM=2)</li>
  <li><strong>Flush</strong> — one cycle of <code>flush=1</code> must reset both pointers and level to 0</li>
</ul>

<h3>Helper tasks keep the test body readable</h3>
<p>Toggling <code>wr_en</code> or <code>rd_en</code> for exactly one clock cycle is repetitive. Factor it into tasks so the test body reads like a spec:</p>
<pre class="code-block">task automatic fifo_write(input logic [7:0] data);
  wr_data = data; wr_en = 1;
  @(posedge pclk); #1;
  wr_en = 0;
endtask

task automatic fifo_read;
  rd_en = 1;
  @(posedge pclk); #1;
  rd_en = 0;
endtask</pre>

<h3>Check flags after the clock edge</h3>
<p>Registered flags (<code>full</code>, <code>level</code>, etc.) are valid only <em>after</em> the clock edge and a <code>#1</code> settle delay. Checking before the clock edge returns the previous cycle’s value and can give false results.</p>
<pre class="code-block">for (i = 0; i &lt; 8; i = i + 1) fifo_write(8'hA0 + i);
// flags are now updated -- safe to check
if (full === 1'b1 &amp;&amp; level === 4'd8)
  $display("PASS  FIFO full: level=8 full=1");</pre>

<h3>Test plan for spi_tx_fifo (DEPTH=8, WM=2)</h3>
<table class="truth-table">
  <tr><th>Test</th><th>Operation</th><th>Pass condition</th></tr>
  <tr><td>Fill to full</td><td>8 writes</td><td>full=1, level=8</td></tr>
  <tr><td>Overflow</td><td>1 write when full</td><td>ovf_sticky=1, level stays 8</td></tr>
  <tr><td>Drain</td><td>8 reads</td><td>empty=1, level=0</td></tr>
  <tr><td>almost_full</td><td>6 writes</td><td>almost_full=1 at level=6</td></tr>
  <tr><td>almost_empty</td><td>4 reads from level=6</td><td>almost_empty=1 at level=2</td></tr>
  <tr><td>Flush</td><td>4 writes then flush</td><td>empty=1, level=0</td></tr>
</table>

<h3>What you will build</h3>
<p>Re-implement <code>spi_tx_fifo</code> from Chapter 3 with fixed parameters DEPTH=8, WIDTH=8, WM=2. The testbench is pre-wired.</p>
<pre class="code-block">module spi_tx_fifo (
  input  logic       pclk, rst_n, wr_en, rd_en, flush,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic       full, empty, almost_empty, almost_full, ovf_sticky,
  output logic [3:0] level
);</pre>
<p>Internal: a memory array <code>mem[0:7]</code>, 3-bit pointers <code>wr_ptr</code> and <code>rd_ptr</code>, and a 4-bit <code>lvl</code> counter that increments on valid writes and decrements on valid reads.</p>
<p><strong>Ready?</strong> Switch to the Code tab and implement the FIFO. Stuck? Tap 💡 Show Hint for the annotated reference implementation.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_tx_fifo from Chapter 3.',
        'Declare: logic [7:0] mem [0:7];  wr_ptr [2:0], rd_ptr [2:0], lvl [3:0], ovf_sticky',
        'Flags (combinational): full when lvl==8, empty when lvl==0, almost_full when lvl is 6 or more, almost_empty when lvl is 2 or less',
        'assign rd_data = mem[rd_ptr]  (combinational head read)',
        'always_ff: rst_n low or flush -- zero wr_ptr, rd_ptr, lvl, ovf_sticky',
        'Write when not full: store wr_data into mem[wr_ptr], increment wr_ptr, increment lvl',
        'Write when full: set ovf_sticky to 1 (drop the data silently)',
        'Read when not empty: increment rd_ptr, decrement lvl',
        'Simultaneous read+write (both valid): update both pointers, lvl stays the same',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_tx_fifo (
  input  logic       pclk, rst_n, wr_en, rd_en, flush,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic       full, empty, almost_empty, almost_full, ovf_sticky,
  output logic [3:0] level
);
  logic [7:0] mem [0:7];
  logic [2:0] wr_ptr, rd_ptr;
  logic [3:0] lvl;

  assign level        = lvl;
  assign full         = (lvl == 4'd8);
  assign empty        = (lvl == 4'd0);
  assign almost_full  = (lvl >= 4'd6);  // DEPTH-WM = 8-2 = 6
  assign almost_empty = (lvl <= 4'd2);  // WM = 2
  assign rd_data      = mem[rd_ptr];

  logic do_wr, do_rd;
  assign do_wr = wr_en && !full;
  assign do_rd = rd_en && !empty;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      wr_ptr <= 0; rd_ptr <= 0; lvl <= 0; ovf_sticky <= 0;
    end else if (flush) begin
      wr_ptr <= 0; rd_ptr <= 0; lvl <= 0; ovf_sticky <= 0;
    end else begin
      if (do_wr) begin
        mem[wr_ptr] <= wr_data;
        wr_ptr      <= wr_ptr + 1;
      end
      if (wr_en && full)
        ovf_sticky <= 1;
      if (do_rd)
        rd_ptr <= rd_ptr + 1;
      if      (do_wr && !do_rd) lvl <= lvl + 1;
      else if (!do_wr && do_rd) lvl <= lvl - 1;
    end
  end
endmodule`,
      design:
`// Re-implement spi_tx_fifo here. See Theory for the test plan.
//
// Fixed parameters: DEPTH=8, WIDTH=8, WM=2
//
// Ports:
//   input  pclk, rst_n        -- clock and active-low async reset
//   input  wr_en, rd_en       -- write / read enable (one operation per cycle)
//   input  flush              -- synchronous pointer reset
//   input  wr_data [7:0]      -- data to push
//   output rd_data [7:0]      -- head of FIFO (combinational)
//   output full, empty        -- capacity flags
//   output almost_full        -- level >= 6
//   output almost_empty       -- level <= 2
//   output ovf_sticky         -- latches on write-when-full; cleared by rst_n or flush
//   output level [3:0]        -- occupancy 0..8
//
// Internal: mem[0:7], wr_ptr [2:0], rd_ptr [2:0], lvl [3:0]
//
// Delete this block and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       pclk = 0;
  logic       rst_n, wr_en, rd_en, flush;
  logic [7:0] wr_data;
  logic [7:0] rd_data;
  logic       full, empty, almost_empty, almost_full, ovf_sticky;
  logic [3:0] level;

  always #5 pclk = ~pclk;

  spi_tx_fifo dut (
    .pclk(pclk), .rst_n(rst_n),
    .wr_en(wr_en), .rd_en(rd_en), .flush(flush),
    .wr_data(wr_data), .rd_data(rd_data),
    .full(full), .empty(empty),
    .almost_empty(almost_empty), .almost_full(almost_full),
    .ovf_sticky(ovf_sticky), .level(level)
  );

  integer i;

  task automatic fifo_write(input logic [7:0] data);
    wr_data = data; wr_en = 1;
    @(posedge pclk); #1;
    wr_en = 0;
  endtask

  task automatic fifo_read;
    rd_en = 1;
    @(posedge pclk); #1;
    rd_en = 0;
  endtask

  initial begin
    rst_n = 0; wr_en = 0; rd_en = 0; flush = 0; wr_data = 0;
    repeat(4) @(posedge pclk);
    rst_n = 1;
    @(posedge pclk); #1;

    // Test 1: Fill to full
    $display("=== Test 1: Fill to full ===");
    for (i = 0; i < 8; i = i + 1) fifo_write(8'hA0 + i);
    if (full === 1'b1 && level === 4'd8)
      $display("PASS  FIFO full: level=%0d full=1", level);
    else
      $display("FAIL  fill: level=%0d full=%0b", level, full);

    // Test 2: Overflow protection
    $display("=== Test 2: Overflow ===");
    fifo_write(8'hFF);
    if (ovf_sticky === 1'b1 && level === 4'd8)
      $display("PASS  overflow: ovf_sticky=1 level stays 8");
    else
      $display("FAIL  overflow: ovf_sticky=%0b level=%0d", ovf_sticky, level);

    // Test 3: Drain to empty
    $display("=== Test 3: Drain ===");
    for (i = 0; i < 8; i = i + 1) fifo_read();
    if (empty === 1'b1 && level === 4'd0)
      $display("PASS  drained: level=%0d empty=1", level);
    else
      $display("FAIL  drain: level=%0d empty=%0b", level, empty);

    // Test 4: Watermarks
    $display("=== Test 4: Watermarks ===");
    for (i = 0; i < 6; i = i + 1) fifo_write(8'hB0 + i);
    if (almost_full === 1'b1)
      $display("PASS  almost_full at level=%0d", level);
    else
      $display("FAIL  almost_full: level=%0d flag=%0b", level, almost_full);
    for (i = 0; i < 4; i = i + 1) fifo_read();
    if (almost_empty === 1'b1)
      $display("PASS  almost_empty at level=%0d", level);
    else
      $display("FAIL  almost_empty: level=%0d flag=%0b", level, almost_empty);

    // Test 5: Flush
    $display("=== Test 5: Flush ===");
    for (i = 0; i < 4; i = i + 1) fifo_write(8'hC0 + i);
    flush = 1; @(posedge pclk); #1; flush = 0;
    if (empty === 1'b1 && level === 4'd0)
      $display("PASS  flush: empty=1 level=0");
    else
      $display("FAIL  flush: empty=%0b level=%0d", empty, level);

    $display("FIFO testbench complete!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  FIFO full:',
        'PASS  overflow: ovf_sticky=1',
        'PASS  flush: empty=1 level=0',
        'FIFO testbench complete!'
      ]
    }
  ]
});
