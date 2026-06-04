(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long2',
  title: 'Clock Divider & SCK Generation',
  icon: '⏱️',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Counter & Toggle (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long2l1',
      title: 'L1 — Counter & Toggle',

      theory: `
<h2>The Master Controls the Conversation Speed</h2>
<p>
  Imagine two people speaking over a walkie-talkie. If one speaks at twice the
  speed the other can hear, words get lost. SPI has the same problem: your
  processor might run at 100 MHz, but the sensor on the other end might only
  handle SPI at 10 MHz. The clock divider bridges this gap — it takes the fast
  system clock and produces a slower, sensor-friendly SPI clock called SCK.
</p>
<p>
  The sensor doesn't care how fast your processor runs internally. It only sees
  SCK, and it expects SCK to tick at a predictable, safe rate defined in its
  datasheet. One wrong SCK frequency can cause missed bits, corrupted reads, or
  no response at all. The host processor sets the <code>div</code> register once
  before starting a transfer — and the divider handles everything from there.
</p>

<h3>The Module We Are Building</h3>
<pre class="code-block">
  pclk (e.g. 100 MHz system clock)
       │
       ▼
  ┌──────────────────────────────────────────────────┐
  │                  spi_clk_div                 ★   │
  │                                                  │
  │   div_cnt[15:0]:  counts 0 → div → 0 → div ...  │
  │                                                  │
  │   sck_int:        toggles each time cnt wraps    │
  │                                                  │
  └──────────────────────────┬───────────────────────┘
                             │
                          sck_out  →  to sensor's SCK pin
</pre>
<p>
  The input <code>div</code> sets the half-period: SCK toggles every
  <code>div</code> pclk cycles. With pclk = 100 MHz and <code>div = 5</code>,
  SCK completes one full period every 10 pclk ticks → SCK = 10 MHz.
  With <code>div = 50</code>, SCK = 1 MHz. The formula:
  <strong>SCK frequency = pclk / (2 × (div + 1))</strong>.
</p>

<h3>Building the Counter — Two Questions</h3>

<h4>Question 1 — What does the counter need to count to?</h4>
<p>
  The counter increments every pclk cycle and wraps when it reaches <code>div</code>.
  On the wrap, <code>sck_int</code> flips. One full SCK period = two wraps
  = <code>2 × (div + 1)</code> pclk cycles.
</p>
<pre class="code-block">
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) begin
    div_cnt &lt;= 16'd0;
    sck_int &lt;= 1'b0;      // reset to known idle
  end else if (div_cnt == div) begin
    div_cnt &lt;= 16'd0;     // wrap the counter
    sck_int &lt;= ~sck_int;  // flip SCK
  end else begin
    div_cnt &lt;= div_cnt + 1'b1;
  end
end
</pre>

<h4>Question 2 — What happens when div = 0?</h4>
<p>
  When <code>div = 0</code>, the counter equals <code>div</code> on the very
  first clock tick, so SCK toggles every single pclk cycle — the fastest
  possible rate (pclk ÷ 2). This is not a bug; it is a natural boundary case
  that the design handles without any special code.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header: module spi_clk_div (',
        '         input  logic        pclk, rst_n, enable',
        '         input  logic [15:0] div',
        '         output logic        sck_out',
        '         );',
        'Step 2 — Declare two internal signals:',
        '         logic [15:0] div_cnt;   (the running counter)',
        '         logic        sck_int;   (internal toggle)',
        'Step 3 — always_ff @(posedge pclk or negedge rst_n)',
        '         if (!rst_n): div_cnt <= 0;  sck_int <= 0;',
        "         else if (div_cnt == div): div_cnt <= 0;  sck_int <= ~sck_int;",
        '         else: div_cnt <= div_cnt + 1;',
        'Step 4 — assign sck_out = sck_int;   (CPOL gate added in L2)',
        'Step 5 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_clk_div (
  input  logic        pclk,
  input  logic        rst_n,    // active-low async reset
  input  logic        enable,   // declared now; used in L2 for CPOL gating
  input  logic [15:0] div,      // half-period: SCK toggles every div+1 pclk cycles
  output logic        sck_out   // SPI clock to sensor
);

  logic [15:0] div_cnt;   // up-counter, wraps at div
  logic        sck_int;   // raw SCK toggle register

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= 16'd0;
      sck_int <= 1'b0;
    end else if (div_cnt == div) begin   // reached half-period
      div_cnt <= 16'd0;
      sck_int <= ~sck_int;              // toggle SCK
    end else begin
      div_cnt <= div_cnt + 1'b1;
    end
  end

  assign sck_out = sck_int;   // CPOL idle gate added in L2

endmodule`,

      design:
`// Type the spi_clk_div module here.
//
// Ports:
//   input  logic        pclk       — fast system clock
//   input  logic        rst_n      — active-low async reset
//   input  logic        enable     — declare now; gated in L2
//   input  logic [15:0] div        — half-period in pclk cycles
//   output logic        sck_out    — slow SPI clock output
//
// Internal:
//   logic [15:0] div_cnt  — counts 0 to div, then wraps
//   logic        sck_int  — toggles on each wrap
//
// always_ff: reset → count → toggle when cnt == div
// assign sck_out = sck_int;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        pclk = 0;
  always #5 pclk = ~pclk;   // 100 MHz

  logic        rst_n, enable;
  logic [15:0] div;
  logic        sck_out;

  spi_clk_div dut (
    .pclk    (pclk),
    .rst_n   (rst_n),
    .enable  (enable),
    .div     (div),
    .sck_out (sck_out)
  );

  // Count SCK toggles over N pclk cycles
  task automatic count_toggles(
    input  integer n_clocks,
    output integer cnt
  );
    integer i;
    logic prev;
    cnt  = 0;
    prev = sck_out;
    for (i = 0; i < n_clocks; i++) begin
      @(posedge pclk); #1;
      if (sck_out !== prev) begin cnt++; prev = sck_out; end
    end
  endtask

  integer tcount;

  initial begin
    \$display("=== Clock Divider: Counter & Toggle ===");
    rst_n = 0; enable = 1; div = 4;
    repeat(4) @(posedge pclk); rst_n = 1;

    // DIV=4: toggles every 5 clocks → ~10 toggles in 50 clocks (5 full cycles)
    count_toggles(50, tcount);
    if (tcount >= 9 && tcount <= 11)
      \$display("PASS DIV=4: %0d toggles in 50 clocks", tcount);
    else
      \$display("FAIL DIV=4: %0d toggles (expected ~10)", tcount);

    // DIV=0: fastest — toggles every pclk → ~20 toggles in 20 clocks
    rst_n = 0; div = 0;
    repeat(2) @(posedge pclk); rst_n = 1;
    count_toggles(20, tcount);
    if (tcount >= 18)
      \$display("PASS DIV=0: %0d toggles (fastest mode)", tcount);
    else
      \$display("FAIL DIV=0: %0d toggles (expected ~20)", tcount);

    \$display("Clock divider works!");
    \$finish;
  end
endmodule`,

      expected: [
        'PASS DIV=4:',
        'PASS DIV=0:',
        'Clock divider works!',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — CPOL Idle Gate (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long2l2',
      title: 'L2 — CPOL Idle Gate',

      theory: `
<h2>What Level Should SCK Rest at When Nobody Is Talking?</h2>
<p>
  Imagine a radio channel with a squelch. When nobody is transmitting, the
  squelch holds the output at a known, quiet level — no random noise coming
  through. Sensors on an SPI bus expect the same from SCK. Between transfers,
  SCK must stay at a fixed, agreed-upon voltage level. If it bounces randomly,
  the sensor counts phantom edges and starts shifting bits into its receive
  register — receiving garbage.
</p>
<p>
  CPOL defines that agreed-upon rest level:
</p>
<ul>
  <li><strong>CPOL = 0</strong>: SCK rests LOW. First transfer edge is a rising edge.</li>
  <li><strong>CPOL = 1</strong>: SCK rests HIGH. First transfer edge is a falling edge.</li>
</ul>
<p>
  We implement this with one conditional assign. When <code>enable = 0</code>
  (no transfer), we force SCK to the CPOL level. When <code>enable = 1</code>,
  we let the divider run freely:
</p>
<pre class="code-block">
assign sck_out = enable ? sck_int : cpol;
//                         ↑ running     ↑ idle: forced to CPOL
</pre>

<h3>Updated Block Diagram</h3>
<pre class="code-block">
  pclk ─►┌──────────────────────────────────────────────┐
         │               spi_clk_div                   │
  rst_n─►│                                              │
  enable─►│  div_cnt counter                             │
  cpol ──►│  sck_int toggle                              │
  div ───►│                                              │
         │      ┌─── enable ? ───────────────┐          │
         │      │  sck_int   : cpol          │──────────►│ sck_out
         │      └────────────────────────────┘          │
         └──────────────────────────────────────────────┘
</pre>

<h3>One Subtle Detail: the Mid-Toggle Glitch</h3>
<p>
  If <code>enable</code> drops LOW while <code>sck_int</code> is HIGH and
  CPOL = 0, the output snaps to LOW instantly. Sensors with sensitive clock
  detectors might count this snap as an extra edge. A robust design waits for
  the counter to reach zero before disabling. For this lesson, the simple gate
  teaches the CPOL principle clearly — note the edge case as something to
  harden in a production revision.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type the full updated spi_clk_div module.',
        'Step 1 — Add input logic cpol to the port list (after enable)',
        'Step 2 — Keep the same always_ff counter and toggle from L1 unchanged',
        'Step 3 — Change the output assign to:',
        '         assign sck_out = enable ? sck_int : cpol;',
        '         (enable=0 → SCK is frozen at CPOL level)',
        '         (enable=1 → SCK runs from the divider)',
        'Step 4 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_clk_div (
  input  logic        pclk,
  input  logic        rst_n,
  input  logic        enable,   // 1 = transfer active; 0 = idle
  input  logic        cpol,     // idle SCK level when enable=0
  input  logic [15:0] div,
  output logic        sck_out
);

  logic [15:0] div_cnt;
  logic        sck_int;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= 16'd0;
      sck_int <= 1'b0;
    end else if (div_cnt == div) begin
      div_cnt <= 16'd0;
      sck_int <= ~sck_int;
    end else begin
      div_cnt <= div_cnt + 1'b1;
    end
  end

  // CPOL gate: SCK stays at idle level when no transfer is active
  assign sck_out = enable ? sck_int : cpol;

endmodule`,

      design:
`// Extend spi_clk_div from L1. Add cpol and update the output assign.
//
// New port: input logic cpol  — SCK idle level (0 or 1)
//
// Change:
//   assign sck_out = enable ? sck_int : cpol;
//   (when idle: SCK holds at cpol — sensor sees a stable, quiet line)
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        pclk = 0;
  always #5 pclk = ~pclk;

  logic        rst_n, enable, cpol;
  logic [15:0] div;
  logic        sck_out;

  spi_clk_div dut (
    .pclk    (pclk),
    .rst_n   (rst_n),
    .enable  (enable),
    .cpol    (cpol),
    .div     (div),
    .sck_out (sck_out)
  );

  initial begin
    \$display("=== CPOL Idle Gate ===");
    rst_n = 0; enable = 0; cpol = 0; div = 4;
    repeat(4) @(posedge pclk); rst_n = 1;

    // Disabled, CPOL=0: SCK must stay LOW
    repeat(30) @(posedge pclk); #1;
    if (sck_out === 1'b0)
      \$display("PASS disabled CPOL=0: sck_out=%0b (correct idle)", sck_out);
    else
      \$display("FAIL disabled CPOL=0: sck_out=%0b (expected 0)", sck_out);

    // Disabled, CPOL=1: SCK must stay HIGH
    cpol = 1; #1;
    if (sck_out === 1'b1)
      \$display("PASS disabled CPOL=1: sck_out=%0b (correct idle)", sck_out);
    else
      \$display("FAIL disabled CPOL=1: sck_out=%0b (expected 1)", sck_out);

    // Enabled: SCK should now toggle freely
    cpol = 0; enable = 1;
    repeat(30) @(posedge pclk); #1;
    \$display("PASS enabled: sck_out running (last=%0b)", sck_out);

    \$display("CPOL idle gate works!");
    \$finish;
  end
endmodule`,

      expected: [
        'PASS disabled CPOL=0',
        'PASS disabled CPOL=1',
        'CPOL idle gate works!',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — Edge Detector & Complete Module (Tier 2→3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long2l3',
      title: 'L3 — Edge Detector & Pulse Generation',

      theory: `
<h2>The Starting Gun — One Pulse Per Clock Edge</h2>
<p>
  Every module downstream of the clock divider — the shift register, the timing
  engine — needs to know the exact moment an SCK edge occurs. They don't want
  a level to poll. They want a one-cycle pulse: "rising edge happened right now."
</p>
<p>
  Why exactly one cycle? Think of it like a doorbell. If the doorbell rang
  continuously for five cycles, someone might answer five times. But if it fires
  once and stops, the action happens exactly once per ring. An edge detector turns
  an SCK transition into a precise single-cycle starting gun.
</p>

<h3>The Complete spi_clk_div Block Diagram</h3>
<pre class="code-block">
  pclk ──►┌──────────────────────────────────────────────────┐
          │                 spi_clk_div                  ★   │
  rst_n ──►│                                                  │
  enable ──►│  div_cnt [15:0]  — up-counter                   │
  cpol ───►│  sck_int         — raw toggle                   │
  div ────►│                                                  │
          │  sck_out = enable ? sck_int : cpol  ─────────────►│ sck_out
          │                          │                        │
          │            sck_prev ◄────┘  (registered, 1 cycle lag) │
          │                                                  │
          │  rising_edge_p  = sck_out & ~sck_prev ──────────►│ rising_edge_p
          │  falling_edge_p = ~sck_out & sck_prev ──────────►│ falling_edge_p
          └──────────────────────────────────────────────────┘
</pre>

<h3>How One-Cycle Pulses Are Generated</h3>
<p>
  Register <code>sck_out</code> into <code>sck_prev</code> every pclk cycle.
  <code>sck_prev</code> is always exactly one cycle old. Comparing the two:
</p>
<ul>
  <li><code>sck_out = 1</code> and <code>sck_prev = 0</code> → transition 0→1 just happened → rising edge pulse for exactly one cycle.</li>
  <li><code>sck_out = 0</code> and <code>sck_prev = 1</code> → transition 1→0 just happened → falling edge pulse.</li>
  <li>Both equal → no edge → both outputs stay LOW.</li>
</ul>
<pre class="code-block">
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n) sck_prev &lt;= 1'b0;
  else        sck_prev &lt;= sck_out;   // capture after CPOL gate
end

assign rising_edge_p  = sck_out &amp; ~sck_prev;   // 0 → 1
assign falling_edge_p = ~sck_out &amp; sck_prev;   // 1 → 0
</pre>
<p>
  <strong>Important:</strong> we register <code>sck_out</code> (after the CPOL gate),
  not <code>sck_int</code> (before). This means edge pulses only appear when the
  enable gate is open — no spurious pulses during idle.
</p>
<p>
  These two outputs are the most-consumed signals in the SPI master. Every module
  from spi_long5 onwards uses them to know when to act.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the complete module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type the complete final spi_clk_div.',
        'Step 1 — Add two new output ports:',
        '         output logic rising_edge_p',
        '         output logic falling_edge_p',
        'Step 2 — Add internal register: logic sck_prev;',
        'Step 3 — In always_ff, add inside the else branch (not inside if/else if):',
        '         sck_prev <= sck_out;   (captured after the CPOL gate)',
        'Step 4 — Keep from L2: assign sck_out = enable ? sck_int : cpol;',
        'Step 5 — Add two new assigns after the sck_out assign:',
        '         assign rising_edge_p  = sck_out & ~sck_prev;',
        '         assign falling_edge_p = ~sck_out & sck_prev;',
        'Step 6 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_clk_div (
  input  logic        pclk,
  input  logic        rst_n,
  input  logic        enable,
  input  logic        cpol,
  input  logic [15:0] div,
  output logic        sck_out,
  output logic        rising_edge_p,    // 1-cycle pulse: SCK just went HIGH
  output logic        falling_edge_p    // 1-cycle pulse: SCK just went LOW
);

  logic [15:0] div_cnt;
  logic        sck_int;
  logic        sck_prev;   // one-cycle-old snapshot of sck_out

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt  <= 16'd0;
      sck_int  <= 1'b0;
      sck_prev <= 1'b0;
    end else begin
      if (div_cnt == div) begin
        div_cnt <= 16'd0;
        sck_int <= ~sck_int;
      end else begin
        div_cnt <= div_cnt + 1'b1;
      end
      sck_prev <= sck_out;   // AFTER gate: no spurious pulses during idle
    end
  end

  assign sck_out        = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_out & ~sck_prev;
  assign falling_edge_p = ~sck_out & sck_prev;

endmodule`,

      design:
`// Complete spi_clk_div — adds edge detection to L2.
//
// New output ports:
//   output logic rising_edge_p   — 1-cycle HIGH when sck_out 0→1
//   output logic falling_edge_p  — 1-cycle HIGH when sck_out 1→0
//
// New internal: logic sck_prev
//
// In always_ff (else branch, after the if/else if counter):
//   sck_prev <= sck_out;
//
// New assigns:
//   assign rising_edge_p  = sck_out & ~sck_prev;
//   assign falling_edge_p = ~sck_out & sck_prev;
//
// Keep from L2: assign sck_out = enable ? sck_int : cpol;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        pclk = 0;
  always #5 pclk = ~pclk;

  logic        rst_n, enable, cpol;
  logic [15:0] div;
  logic        sck_out, rising_edge_p, falling_edge_p;

  spi_clk_div dut (
    .pclk           (pclk),
    .rst_n          (rst_n),
    .enable         (enable),
    .cpol           (cpol),
    .div            (div),
    .sck_out        (sck_out),
    .rising_edge_p  (rising_edge_p),
    .falling_edge_p (falling_edge_p)
  );

  task automatic count_edges(
    input  integer n,
    output integer r_cnt, f_cnt
  );
    integer i;
    r_cnt = 0; f_cnt = 0;
    for (i = 0; i < n; i++) begin
      @(posedge pclk); #1;
      if (rising_edge_p)  r_cnt++;
      if (falling_edge_p) f_cnt++;
    end
  endtask

  integer rc, fc;

  initial begin
    \$display("=== Edge Detector ===");
    rst_n = 0; enable = 0; cpol = 0; div = 4;
    repeat(4) @(posedge pclk); rst_n = 1;

    // Disabled: no edge pulses should appear
    count_edges(20, rc, fc);
    if (rc === 0 && fc === 0)
      \$display("PASS reset: no spurious edges (r=%0d f=%0d)", rc, fc);
    else
      \$display("FAIL reset: spurious edges (r=%0d f=%0d)", rc, fc);

    // Enabled, DIV=4: 50 clocks → ~5 rising + 5 falling
    enable = 1;
    count_edges(50, rc, fc);
    if (rc >= 4 && rc <= 6)
      \$display("PASS DIV=4: %0d rising edges in 50 clocks", rc);
    else
      \$display("FAIL DIV=4: %0d rising edges (expected ~5)", rc);

    \$display("Edge detector works!");
    \$finish;
  end
endmodule`,

      expected: [
        'PASS reset: no spurious edges',
        'PASS DIV=4:',
        'Edge detector works!',
      ],
    },

  ]
});
