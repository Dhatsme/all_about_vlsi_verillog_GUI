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
        sck_int <= ~sck_int;   // toggle every (div+1) cycles
      end else begin
        div_cnt <= div_cnt + 1;
      end
      sck_prev <= sck_int;     // one-cycle delay for edge detector
    end else begin
      sck_int  <= cpol;        // freeze at idle level
      sck_prev <= cpol;        // keep edge detector quiet
      div_cnt  <= 0;           // reset so next enable starts clean
    end
  end

  assign sck_out       = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_int & ~sck_prev;   // low-to-high
  assign falling_edge_p = ~sck_int & sck_prev;   // high-to-low

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

    // Test 1: Frequency -- DIV=4 => period=10 pclk => ~10 rising edges in 100
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

    // Test 2: CPOL idle levels
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

    // Test 3: Enable gating
    $display("=== Test 3: Enable gating ===");
    cpol = 0; div = 4; enable = 1;
    repeat(20) @(posedge pclk);
    enable = 0;
    @(posedge pclk); #1;
    if (sck_out === 1'b0)
      $display("PASS  enable=0 freezes SCK at CPOL=0");
    else
      $display("FAIL  enable=0 sck_out=%0b", sck_out);

    // Test 4: Edge pulse balance
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
    }
  ]
});
