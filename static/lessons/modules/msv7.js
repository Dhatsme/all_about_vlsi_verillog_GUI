// msv7.js — Advanced Digital Design
// 4 portfolio lessons: PWM, VGA Sync, Calculator, RISC-V RV32I
// All Tier 5. Prerequisites: all msv1–msv6 concepts.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv7',
  title: 'Advanced Digital Design',
  icon: '🎟️',
  level: 'advanced',
  lessons: [

    // ── L1: PWM Generator (Tier 5) ───────────────────────────────────
    {
      id: 'msv7l1',
      title: 'L1 — PWM Generator',
      theory: `
<h2>Portfolio Project: Parameterized PWM Generator</h2>
<p>A <strong>Pulse Width Modulated (PWM)</strong> signal switches between 0 and 1 at a fixed
frequency. The fraction of the period spent HIGH is the <strong>duty cycle</strong>.
Motor drivers, LED dimmers, and servo controllers are all PWM-controlled.</p>

<h3>How a PWM counter works</h3>
<pre class="code-block">// Period counter: 0 → PERIOD-1 → 0 → ...
// pwm_out = 1 when cnt &lt; duty
//         = 0 when cnt &gt;= duty
//
// duty=0            pwm_out always 0   (0% duty)
// duty=PERIOD/2     50% duty cycle
// duty=PERIOD       pwm_out always 1   (100% duty)</pre>

<h3>New concept: deadtime</h3>
<p><strong>Deadtime</strong> is a brief gap where both outputs are 0 between switching. This prevents
both the HIGH-side and LOW-side transistors of an H-bridge from conducting at once (shoot-through).
You control deadtime by outputting a second signal that is the complement of pwm_out,
but delayed by DEADTIME cycles:</p>
<pre class="code-block">output logic pwm_out,     // HIGH-side drive
output logic pwm_n_out    // LOW-side drive (NOT pwm with deadtime gap)

// Simple implementation: shift register of length DEADTIME
logic [DEADTIME-1:0] delay_sr;
always_ff @(posedge clk or posedge rst) begin
  if (rst) delay_sr &lt;= '0;
  else     delay_sr &lt;= {delay_sr[DEADTIME-2:0], pwm_out};
end
assign pwm_n_out = ~delay_sr[DEADTIME-1];  // complement of delayed pwm</pre>

<h3>Parameters you will use</h3>
<table class="truth-table">
  <tr><th>Parameter</th><th>Default</th><th>Meaning</th></tr>
  <tr><td>PERIOD</td><td>100</td><td>Counter period (clock cycles per PWM period)</td></tr>
  <tr><td>DEADTIME</td><td>4</td><td>Deadtime gap in clock cycles</td></tr>
</table>

<h3>Inputs and outputs</h3>
<pre class="code-block">input  logic                    clk, rst
input  logic [$clog2(PERIOD):0] duty     // 0 to PERIOD
output logic                    pwm_out
output logic                    pwm_n_out</pre>

<p><strong>Plan first, then code.</strong> No hint for portfolio projects. Testbench uses
PERIOD=10, DEADTIME=2 and checks 0%, 50%, and 100% duty cycles.</p>
`,
      tasks: [
        'Plan on paper first: counter range, duty compare, deadtime shift register.',
        'Module: pwm_gen  Parameters: PERIOD=100, DEADTIME=4',
        'Ports: clk, rst (in); duty[$clog2(PERIOD):0] (in); pwm_out, pwm_n_out (out)',
        'Internal signals: counter [$clog2(PERIOD)-1:0]; deadtime shift register',
        'Counter: 0 to PERIOD-1, reset on posedge rst',
        'pwm_out: 1 when counter < duty, 0 when counter >= duty',
        'Deadtime SR: shifts pwm_out right each cycle, depth = DEADTIME',
        'pwm_n_out: complement of the SR output (NOT the delayed pwm)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — verify PASS for 0%, 50%, 100% duty and deadtime gap',
        '🎓 Push to your GitHub when done',
      ],
      hint: `No hint for portfolio projects.
PWM checklist:
  1. Counter: logic [$clog2(PERIOD)-1:0] cnt; counts 0..PERIOD-1
  2. pwm_out combinational: always_comb pwm_out = (cnt < duty);
     OR registered in always_ff
  3. Deadtime SR: logic [DEADTIME-1:0] sr;
     always_ff: sr <= {sr[DEADTIME-2:0], pwm_out};
  4. pwm_n_out: assign pwm_n_out = ~sr[DEADTIME-1];
  5. Testbench uses PERIOD=10, DEADTIME=2.`,
      design:
`// Build the pwm_gen module here. Read Theory for the design pattern.
//
// Module: pwm_gen
// Parameters: PERIOD (default 100), DEADTIME (default 4)
// Ports:
//   input  logic                     clk, rst
//   input  logic [$clog2(PERIOD):0]  duty   (0=0%, PERIOD=100%)
//   output logic                     pwm_out, pwm_n_out
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst;
  logic [3:0] duty;   // $clog2(10)=4 bits
  logic       pwm_out, pwm_n_out;

  // PERIOD=10, DEADTIME=2
  pwm_gen #(.PERIOD(10), .DEADTIME(2)) dut(
    .clk(clk), .rst(rst), .duty(duty),
    .pwm_out(pwm_out), .pwm_n_out(pwm_n_out));

  always #5 clk = ~clk;

  function automatic integer count_high(integer cycles);
    integer i; integer n;
    n = 0;
    for (i = 0; i < cycles; i = i + 1) begin
      @(posedge clk); #1;
      if (pwm_out === 1'b1) n = n + 1;
    end
    return n;
  endfunction

  integer hi;
  initial begin
    clk = 0; rst = 1; duty = 0;
    @(posedge clk); #1; rst = 0;

    // 0% duty
    duty = 0;
    hi = count_high(20);
    if (hi === 0)
      $display("PASS  0%% duty: pwm_out high %0d/20 cycles", hi);
    else
      $display("FAIL  0%% duty: got %0d high cycles", hi);

    // 50% duty (5/10)
    duty = 5;
    hi = count_high(20);
    if (hi === 10)
      $display("PASS  50%% duty: pwm_out high %0d/20 cycles", hi);
    else
      $display("FAIL  50%% duty: got %0d high cycles, expected 10", hi);

    // 100% duty
    duty = 10;
    hi = count_high(20);
    if (hi === 20)
      $display("PASS  100%% duty: pwm_out high %0d/20 cycles", hi);
    else
      $display("FAIL  100%% duty: got %0d high cycles", hi);

    // Check deadtime: when duty=5, both outputs should never be 1 simultaneously
    duty = 5; rst = 1; @(posedge clk); #1; rst = 0;
    begin : dt_check
      integer i; integer overlap;
      overlap = 0;
      for (i = 0; i < 30; i = i + 1) begin
        @(posedge clk); #1;
        if (pwm_out === 1'b1 && pwm_n_out === 1'b1)
          overlap = overlap + 1;
      end
      if (overlap === 0)
        $display("PASS  No shoot-through: pwm_out and pwm_n_out never both 1");
      else
        $display("FAIL  Shoot-through detected: %0d overlap cycles", overlap);
    end

    $display("PWM generator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  0% duty',
        'PASS  50% duty',
        'PASS  100% duty',
        'PASS  No shoot-through',
        'PWM generator works!'
      ]
    },

    // ── L2: VGA Sync Generator (Tier 5) ─────────────────────────────
    {
      id: 'msv7l2',
      title: 'L2 — VGA Sync Generator',
      theory: `
<h2>Portfolio Project: VGA Sync Generator</h2>
<p>VGA monitors expect a 640×480 @ 60 Hz raster signal. The sync generator produces
<code>hsync</code> and <code>vsync</code> pulses at exact pixel timings, plus the current
pixel coordinates so a downstream colour generator can paint the screen.</p>

<h3>VGA 640×480 @ 60 Hz timing</h3>
<p>Each line has more than 640 pixels — the extra pixels are the blanking interval (retrace time).
The complete horizontal timing is:</p>
<table class="truth-table">
  <tr><th>Region</th><th>Pixels</th><th>Counter range</th></tr>
  <tr><td>Active display</td><td>640</td><td>0 – 639</td></tr>
  <tr><td>Front porch</td><td>16</td><td>640 – 655</td></tr>
  <tr><td>Sync pulse (hsync=0)</td><td>96</td><td>656 – 751</td></tr>
  <tr><td>Back porch</td><td>48</td><td>752 – 799</td></tr>
  <tr><th colspan="2">Total horizontal</th><td>800 cycles/line</td></tr>
</table>
<p>The vertical timing counts in <em>lines</em>:</p>
<table class="truth-table">
  <tr><th>Region</th><th>Lines</th><th>Counter range</th></tr>
  <tr><td>Active display</td><td>480</td><td>0 – 479</td></tr>
  <tr><td>Front porch</td><td>10</td><td>480 – 489</td></tr>
  <tr><td>Sync pulse (vsync=0)</td><td>2</td><td>490 – 491</td></tr>
  <tr><td>Back porch</td><td>33</td><td>492 – 524</td></tr>
  <tr><th colspan="2">Total vertical</th><td>525 lines/frame</td></tr>
</table>

<h3>Key signals</h3>
<pre class="code-block">output logic        hsync, vsync   // active LOW pulses
output logic        display_on     // HIGH only inside active region
output logic [9:0]  pixel_x        // 0..639 (10 bits: $clog2(800)=10)
output logic [9:0]  pixel_y        // 0..479

// hsync: LOW when h_cnt in [656, 751]
// vsync: LOW when v_cnt in [490, 491]
// display_on: h_cnt &lt; 640 &amp;&amp; v_cnt &lt; 480
// v_cnt increments when h_cnt rolls over (end of each line)</pre>

<h3>Using localparam for timing constants</h3>
<pre class="code-block">localparam H_ACTIVE  = 640,  H_FP = 16,  H_SYNC = 96, H_BP = 48;
localparam H_TOTAL   = H_ACTIVE + H_FP + H_SYNC + H_BP;  // 800
localparam H_SYNC_START = H_ACTIVE + H_FP;                // 656
localparam H_SYNC_END   = H_SYNC_START + H_SYNC;          // 752</pre>

<p>Use the same pattern for vertical. <strong>Plan every constant before coding.</strong></p>
<p>The 25.175 MHz pixel clock needed for real VGA is replaced by a simple test clock in the testbench.</p>
`,
      tasks: [
        'Plan all localparam constants before writing RTL.',
        'Module: vga_sync  No external parameters needed (timing is fixed for 640x480)',
        'Ports: clk, rst (in); hsync, vsync, display_on (out); pixel_x[9:0], pixel_y[9:0] (out)',
        'Internal: h_cnt [9:0] (0..799), v_cnt [9:0] (0..524)',
        'h_cnt increments every clock; resets to 0 at H_TOTAL-1',
        'v_cnt increments when h_cnt == H_TOTAL-1; resets to 0 at V_TOTAL-1',
        'hsync: LOW (0) when h_cnt in [H_SYNC_START, H_SYNC_END-1]',
        'vsync: LOW (0) when v_cnt in [V_SYNC_START, V_SYNC_END-1]',
        'display_on: HIGH when h_cnt < 640 && v_cnt < 480',
        'pixel_x = h_cnt when display_on, else 0  (or just h_cnt)',
        'pixel_y = v_cnt when display_on, else 0  (or just v_cnt)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — testbench checks hsync/vsync pulse widths and display_on window',
        '🎓 Push to your GitHub when done',
      ],
      hint: `No hint for portfolio projects.
VGA checklist:
  1. Define all 10 localparams (H_ACTIVE, H_FP, H_SYNC, H_BP, H_TOTAL,
     H_SYNC_START, H_SYNC_END; same for V_*).
  2. Two counters: h_cnt [9:0], v_cnt [9:0].
  3. h_cnt: increments every clock, resets at H_TOTAL.
  4. v_cnt: increments when h_cnt==H_TOTAL-1, resets at V_TOTAL.
  5. hsync = ~(h_cnt >= H_SYNC_START && h_cnt < H_SYNC_END)
  6. vsync = ~(v_cnt >= V_SYNC_START && v_cnt < V_SYNC_END)
  7. display_on = (h_cnt < H_ACTIVE) && (v_cnt < V_ACTIVE)`,
      design:
`// Build the vga_sync module here. Use localparams for all timing constants.
//
// Module: vga_sync
// Ports:
//   input  logic        clk, rst
//   output logic        hsync, vsync, display_on
//   output logic [9:0]  pixel_x, pixel_y
//
// 640x480 @ 60Hz timing constants:
//   H: active=640, fp=16, sync=96, bp=48  -> total=800
//   V: active=480, fp=10, sync=2,  bp=33  -> total=525
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst;
  logic       hsync, vsync, display_on;
  logic [9:0] pixel_x, pixel_y;

  vga_sync dut(.clk(clk), .rst(rst),
               .hsync(hsync), .vsync(vsync), .display_on(display_on),
               .pixel_x(pixel_x), .pixel_y(pixel_y));

  always #5 clk = ~clk;

  integer h_low_cnt, v_low_cnt;
  integer active_pixels;
  integer frame_cycles;

  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1; rst = 0;

    // Count hsync low pulses over one full line (800 cycles)
    h_low_cnt = 0;
    begin : hcount
      integer i;
      for (i = 0; i < 800; i = i + 1) begin
        @(posedge clk); #1;
        if (hsync === 1'b0) h_low_cnt = h_low_cnt + 1;
      end
    end
    if (h_low_cnt === 96)
      $display("PASS  hsync pulse width = %0d cycles (expected 96)", h_low_cnt);
    else
      $display("FAIL  hsync pulse width = %0d (expected 96)", h_low_cnt);

    // Count active display pixels in one line
    active_pixels = 0;
    begin : apcount
      integer i;
      for (i = 0; i < 800; i = i + 1) begin
        @(posedge clk); #1;
        if (display_on === 1'b1) active_pixels = active_pixels + 1;
      end
    end
    if (active_pixels === 640)
      $display("PASS  Active pixels per line = %0d (expected 640)", active_pixels);
    else
      $display("FAIL  Active pixels = %0d (expected 640)", active_pixels);

    // Run 525 lines and count vsync low cycles
    rst = 1; @(posedge clk); #1; rst = 0;
    v_low_cnt = 0;
    frame_cycles = 800 * 525;
    begin : vcount
      integer i;
      for (i = 0; i < frame_cycles; i = i + 1) begin
        @(posedge clk); #1;
        if (vsync === 1'b0) v_low_cnt = v_low_cnt + 1;
      end
    end
    if (v_low_cnt === 2 * 800)
      $display("PASS  vsync pulse = %0d cycles (expected %0d)", v_low_cnt, 2*800);
    else
      $display("FAIL  vsync pulse = %0d cycles (expected %0d)", v_low_cnt, 2*800);

    $display("VGA sync generator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  hsync pulse width = 96 cycles',
        'PASS  Active pixels per line = 640',
        'PASS  vsync pulse',
        'VGA sync generator works!'
      ]
    },

    // ── L3: Calculator (Tier 5) ─────────────────────────────────────
    {
      id: 'msv7l3',
      title: 'L3 — Pipelined Calculator',
      theory: `
<h2>Portfolio Project: Pipelined Calculator</h2>
<p>A <strong>pipeline</strong> breaks a computation into stages, each one clock cycle.
While stage 2 processes the result of input A, stage 1 is already accepting input B.
This doubles throughput compared to a purely sequential design.</p>

<h3>New concept: $signed() — signed arithmetic</h3>
<p>Verilog/SystemVerilog defaults to <em>unsigned</em> arithmetic. To correctly handle
negative numbers, wrap operands with <code>$signed()</code>:</p>
<pre class="code-block">// Without $signed: subtraction may overflow for negative results
logic [7:0] a = 8'd5;
logic [7:0] b = 8'd10;
logic [7:0] diff = a - b;   // 5-10 = 251 (unsigned wrap!)

// With $signed: correctly produces -5
logic signed [7:0] diff;
assign diff = $signed(a) - $signed(b);   // = -5 (two's complement)</pre>

<h3>Overflow detection</h3>
<pre class="code-block">// 8-bit signed range: -128 to +127
// Overflow if two positives produce negative, or two negatives produce positive
logic overflow;
always_comb begin
  {overflow_bit, result} = $signed({a[7], a}) + $signed({b[7], b});
  overflow = overflow_bit ^ result[7];  // sign bit of sum != expected sign
end</pre>

<h3>2-stage pipeline structure</h3>
<pre class="code-block">// Stage 1 register: latch inputs and decode opcode
always_ff @(posedge clk) begin
  s1_a  &lt;= a_in;   s1_b &lt;= b_in;
  s1_op &lt;= op_in;  s1_valid &lt;= valid_in;
end
// Stage 2 register: compute result from stage 1 values
always_ff @(posedge clk) begin
  case (s1_op)
    ADD: s2_result &lt;= $signed(s1_a) + $signed(s1_b);
    SUB: s2_result &lt;= $signed(s1_a) - $signed(s1_b);
    ...
  endcase
  s2_valid &lt;= s1_valid;
end</pre>

<h3>Operations to support</h3>
<table class="truth-table">
  <tr><th>op[1:0]</th><th>Operation</th><th>Notes</th></tr>
  <tr><td>2'b00</td><td>ADD</td><td>$signed add, detect overflow</td></tr>
  <tr><td>2'b01</td><td>SUB</td><td>$signed subtract, detect overflow</td></tr>
  <tr><td>2'b10</td><td>AND</td><td>bitwise AND (unsigned)</td></tr>
  <tr><td>2'b11</td><td>OR</td><td>bitwise OR (unsigned)</td></tr>
</table>

<p>Output <code>result_valid</code> goes high 2 cycles after <code>valid_in</code>.</p>
`,
      tasks: [
        'New syntax: $signed(x) for signed arithmetic — read Theory carefully.',
        'Module: calculator',
        'Ports: clk, rst, valid_in (in); a[7:0], b[7:0], op[1:0] (in); result[7:0], result_valid, overflow (out)',
        'Stage 1 FF: register a, b, op, valid on every posedge clk',
        'Stage 2 FF: compute result using unique case on op, propagate valid',
        'ADD: $signed(s1_a) + $signed(s1_b)  with overflow detection',
        'SUB: $signed(s1_a) - $signed(s1_b)  with overflow detection',
        'AND: s1_a & s1_b  (no overflow)',
        'OR:  s1_a | s1_b  (no overflow)',
        'overflow: asserted for ADD/SUB when signed result overflows 8-bit range',
        'result_valid: s2_valid (2 cycles after valid_in)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — verify ADD, SUB, AND, OR, and overflow detection all PASS',
        '🎓 Push to your GitHub when done',
      ],
      hint: `No hint for portfolio projects.
Calculator checklist:
  Stage 1 (register inputs):
    logic [7:0] s1_a, s1_b; logic [1:0] s1_op; logic s1_valid;
    always_ff: latch all inputs on posedge clk or reset to 0

  Stage 2 (compute results):
    logic [7:0] s2_result; logic s2_valid, s2_overflow;
    always_ff with unique case on s1_op

  Overflow (ADD/SUB only):
    logic [8:0] sum9; // 9-bit intermediate
    sum9 = {s1_a[7], s1_a} + {s1_b[7], s1_b};
    overflow = sum9[8] ^ sum9[7];  // carry XOR sign change

  Output assignments:
    assign result       = s2_result;
    assign result_valid = s2_valid;
    assign overflow     = s2_overflow;`,
      design:
`// Build the pipelined calculator here. Read Theory for $signed() and pipeline pattern.
//
// Module: calculator
// Ports:
//   input  logic       clk, rst, valid_in
//   input  logic [7:0] a, b
//   input  logic [1:0] op   (00=ADD 01=SUB 10=AND 11=OR)
//   output logic [7:0] result
//   output logic       result_valid, overflow
//
// 2-stage pipeline: Stage1 = register inputs, Stage2 = compute
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, valid_in;
  logic [7:0] a, b, result;
  logic [1:0] op;
  logic       result_valid, overflow;

  calculator dut(.clk(clk), .rst(rst), .valid_in(valid_in),
                 .a(a), .b(b), .op(op),
                 .result(result), .result_valid(result_valid), .overflow(overflow));

  always #5 clk = ~clk;

  // Send one operation and wait 3 cycles for pipelined result
  task send_op(
    input [7:0] ta, tb_v,
    input [1:0] top,
    input [7:0] exp_result,
    input       exp_overflow,
    input string label
  );
    @(posedge clk); #1;
    a = ta; b = tb_v; op = top; valid_in = 1;
    @(posedge clk); #1; valid_in = 0;
    @(posedge clk); #1;
    if (result_valid === 1'b1 && result === exp_result && overflow === exp_overflow)
      $display("PASS  %s: result=0x%02h overflow=%0b", label, result, overflow);
    else
      $display("FAIL  %s: result=0x%02h (exp 0x%02h) overflow=%0b (exp %0b)",
               label, result, exp_result, overflow, exp_overflow);
  endtask

  initial begin
    clk = 0; rst = 1; valid_in = 0; a = 0; b = 0; op = 0;
    @(posedge clk); #1; rst = 0;

    send_op(8'd10,  8'd20,   2'b00, 8'd30,  1'b0, "ADD  10+20=30");
    send_op(8'd100, 8'd50,   2'b01, 8'd50,  1'b0, "SUB 100-50=50");
    send_op(8'hFF,  8'hAA,   2'b10, 8'hAA,  1'b0, "AND FF&AA=AA");
    send_op(8'hF0,  8'h0F,   2'b11, 8'hFF,  1'b0, "OR  F0|0F=FF");
    // Signed overflow: 127 + 1 = -128 (overflow)
    send_op(8'd127, 8'd1,    2'b00, 8'd128, 1'b1, "ADD overflow 127+1");
    // Signed negative: 5 - 10 = -5 = 8'hFB
    send_op(8'd5,   8'd10,   2'b01, 8'hFB,  1'b0, "SUB 5-10=-5");

    $display("Calculator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  ADD  10+20=30',
        'PASS  SUB 100-50=50',
        'PASS  AND FF&AA=AA',
        'PASS  OR  F0|0F=FF',
        'PASS  ADD overflow 127+1',
        'PASS  SUB 5-10=-5',
        'Calculator works!'
      ]
    },

    // ── L4: RISC-V RV32I Core (Tier 5) ─────────────────────────────
    {
      id: 'msv7l4',
      title: 'L4 — RISC-V RV32I Core',
      theory: `
<h2>Portfolio Capstone: RISC-V RV32I Processor</h2>
<p>The <a href="https://riscv.org">RISC-V</a> RV32I is a real, open-standard 32-bit
instruction set used in production silicon. Building even a simple version teaches
every fundamental concept in computer architecture.</p>

<h3>New concept: $readmemh — loading a memory file</h3>
<p>Use <code>$readmemh</code> to initialise an instruction memory array from a hex file:
</p>
<pre class="code-block">logic [31:0] imem [0:255];   // 256-word instruction memory
initial $readmemh("prog.hex", imem);
// prog.hex format (one 32-bit word per line):
// 00500113   // ADDI x2, x0, 5
// 00A10133   // ADD  x2, x2, x10
// ...</pre>
<p>In simulation without a file, <code>$readmemh</code> leaves memory as X. The testbench
in this lesson injects instructions directly instead of using a file.</p>

<h3>New concept: generate blocks</h3>
<p><code>generate</code> lets you unroll loops or conditionally instantiate hardware at
elaboration time — before simulation starts:</p>
<pre class="code-block">genvar i;
generate
  for (i = 0; i &lt; 32; i++) begin : reg_reset
    // This creates 32 separate always_ff blocks at compile time
  end
endgenerate

// More commonly: a single generate to pick between two implementations
generate
  if (USE_FAST) begin : fast
    fast_adder u (.*);
  end else begin : slow
    slow_adder u (.*);
  end
endgenerate</pre>

<h3>Minimal RV32I subset to implement</h3>
<table class="truth-table">
  <tr><th>Instruction</th><th>Encoding</th><th>Operation</th></tr>
  <tr><td>ADD  rd,rs1,rs2</td><td>R-type</td><td>rd = rs1 + rs2</td></tr>
  <tr><td>ADDI rd,rs1,imm</td><td>I-type</td><td>rd = rs1 + sign_ext(imm[11:0])</td></tr>
  <tr><td>AND  rd,rs1,rs2</td><td>R-type</td><td>rd = rs1 &amp; rs2</td></tr>
  <tr><td>OR   rd,rs1,rs2</td><td>R-type</td><td>rd = rs1 | rs2</td></tr>
  <tr><td>LW   rd,imm(rs1)</td><td>I-type</td><td>rd = mem[rs1 + sign_ext(imm)]</td></tr>
  <tr><td>SW   rs2,imm(rs1)</td><td>S-type</td><td>mem[rs1 + sign_ext(imm)] = rs2</td></tr>
  <tr><td>BEQ  rs1,rs2,off</td><td>B-type</td><td>if rs1==rs2: PC += sign_ext(off)</td></tr>
  <tr><td>JAL  rd,off</td><td>J-type</td><td>rd = PC+4; PC += sign_ext(off)</td></tr>
</table>

<h3>3-stage pipeline (Fetch / Decode+Execute / Writeback)</h3>
<pre class="code-block">// Stage 1: FETCH
pc  &lt;= next_pc;
instr &lt;= imem[pc &gt;&gt; 2];   // word-addressed

// Stage 2: DECODE + EXECUTE
// Decode fields from instr[31:0] (RISC-V fixed-width 32-bit encoding)
rs1  = instr[19:15];    rs2 = instr[24:20];    rd = instr[11:7];
funct3 = instr[14:12];  funct7 = instr[31:25]; opcode = instr[6:0];
// Execute ALU op

// Stage 3: WRITEBACK
regfile[wb_rd] &lt;= wb_result;</pre>

<h3>RV32I opcode map (7-bit opcode field)</h3>
<pre class="code-block">7'b0110011  R-type ALU  (ADD, AND, OR, ...)
7'b0010011  I-type ALU  (ADDI, ANDI, ORI, ...)
7'b0000011  LOAD        (LW)
7'b0100011  STORE       (SW)
7'b1100011  BRANCH      (BEQ, BNE, ...)
7'b1101111  JAL</pre>

<p><strong>This is the hardest project in the entire curriculum.</strong>
Plan every state, every pipeline register, and every mux on paper before writing a line of code.
Start with ADD and ADDI only; get those passing; then add the rest.</p>
`,
      tasks: [
        'New syntax: $readmemh, generate blocks — read Theory first.',
        'Plan ALL pipeline registers and control signals on paper before coding.',
        'Step 1: Register file — 32×32-bit registers, x0 always 0.',
        'Step 2: Instruction memory — logic [31:0] imem [0:63], initialise in testbench.',
        'Step 3: Data memory — logic [31:0] dmem [0:63].',
        'Step 4: Fetch stage — PC register, fetch imem[PC>>2].',
        'Step 5: Decode — extract opcode, rd, rs1, rs2, funct3, funct7, immediates.',
        'Step 6: Execute — ALU for R-type and I-type; sign-extend immediates.',
        'Step 7: Memory stage — LW reads dmem, SW writes dmem.',
        'Step 8: Writeback — write result to regfile[rd] (never write x0).',
        'Step 9: Branch/Jump — BEQ and JAL update PC.',
        'Implement in order: ADD → ADDI → AND → OR → LW → SW → BEQ → JAL.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — testbench injects hand-encoded instructions and checks register values.',
        '🎓 Advanced Digital Design Engineer certificate — push to GitHub when complete!',
      ],
      hint: `No hint for portfolio projects. RISC-V roadmap:

  Register file:
    logic [31:0] regs [0:31];
    always_ff: regs[0] <= 32'd0; (x0 hardwired to 0)
    always_ff: if (wb_we && wb_rd != 0) regs[wb_rd] <= wb_data;

  Instruction decode fields:
    wire [6:0]  opcode = instr[6:0];
    wire [4:0]  rd     = instr[11:7];
    wire [2:0]  funct3 = instr[14:12];
    wire [4:0]  rs1    = instr[19:15];
    wire [4:0]  rs2    = instr[24:20];
    wire [6:0]  funct7 = instr[31:25];

  Immediate extraction:
    I-type: {{20{instr[31]}}, instr[31:20]}
    S-type: {{20{instr[31]}}, instr[31:25], instr[11:7]}
    B-type: {{19{instr[31]}}, instr[31], instr[7], instr[30:25], instr[11:8], 1'b0}
    J-type: {{11{instr[31]}}, instr[31], instr[19:12], instr[20], instr[30:21], 1'b0}

  Opcodes: R=7'h33, I-ALU=7'h13, LOAD=7'h03, STORE=7'h23, BRANCH=7'h63, JAL=7'h6F`,
      design:
`// Build the RISC-V RV32I core here.
// Read Theory for new concepts: $readmemh, generate, RV32I encoding.
//
// Module: riscv_core
// Ports:
//   input  logic        clk, rst
//   output logic [31:0] pc_out    (current PC, for testbench inspection)
//   output logic [31:0] reg_out   (register value for testbench inspection)
//   input  logic [4:0]  reg_sel   (which register to expose on reg_out)
//
// Start with ADD and ADDI only, verify, then add more instructions.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        clk, rst;
  logic [31:0] pc_out, reg_out;
  logic [4:0]  reg_sel;

  riscv_core dut(.clk(clk), .rst(rst),
                 .pc_out(pc_out), .reg_out(reg_out), .reg_sel(reg_sel));

  always #5 clk = ~clk;

  // Read a register
  task read_reg(input [4:0] r, output [31:0] v);
    reg_sel = r; #1; v = reg_out;
  endtask

  logic [31:0] rv;

  initial begin
    clk = 0; rst = 1;
    // Inject program into DUT imem via force (or use $readmemh)
    // Program:
    //   0: ADDI x1, x0, 5     -> x1 = 5
    //   4: ADDI x2, x0, 3     -> x2 = 3
    //   8: ADD  x3, x1, x2    -> x3 = 8
    //  12: AND  x4, x1, x2    -> x4 = 1 (5&3)
    //  16: OR   x5, x1, x2    -> x5 = 7 (5|3)
    //  20: SW   x1, 0(x0)     -> mem[0] = 5
    //  24: LW   x6, 0(x0)     -> x6 = mem[0] = 5
    //  28: BEQ  x1, x1, +8   -> PC = 36 (skip next)
    //  32: ADDI x7, x0, 99   -> should be skipped
    //  36: JAL  x8, 0        -> x8 = 40, loop here
    //  40: NOP (ADDI x0,x0,0)
    // RV32I encodings:
    force dut.imem[0]  = 32'h00500093; // ADDI x1,  x0, 5
    force dut.imem[1]  = 32'h00300113; // ADDI x2,  x0, 3
    force dut.imem[2]  = 32'h002081B3; // ADD  x3,  x1, x2
    force dut.imem[3]  = 32'h0020F233; // AND  x4,  x1, x2
    force dut.imem[4]  = 32'h0020E2B3; // OR   x5,  x1, x2
    force dut.imem[5]  = 32'h00102023; // SW   x1,  0(x0)
    force dut.imem[6]  = 32'h00002303; // LW   x6,  0(x0)
    force dut.imem[7]  = 32'h00108463; // BEQ  x1,  x1, +8
    force dut.imem[8]  = 32'h06300393; // ADDI x7,  x0, 99 (skipped)
    force dut.imem[9]  = 32'h0000046F; // JAL  x8,  0
    force dut.imem[10] = 32'h00000013; // NOP
    @(posedge clk); #1; rst = 0;

    // Run enough cycles for all instructions + pipeline flush
    repeat(40) @(posedge clk); #1;

    read_reg(1, rv);
    if (rv === 32'd5)  $display("PASS  x1 = %0d (ADDI)", rv);
    else               $display("FAIL  x1 = %0d (expected 5)", rv);

    read_reg(3, rv);
    if (rv === 32'd8)  $display("PASS  x3 = %0d (ADD)", rv);
    else               $display("FAIL  x3 = %0d (expected 8)", rv);

    read_reg(4, rv);
    if (rv === 32'd1)  $display("PASS  x4 = %0d (AND 5&3)", rv);
    else               $display("FAIL  x4 = %0d (expected 1)", rv);

    read_reg(5, rv);
    if (rv === 32'd7)  $display("PASS  x5 = %0d (OR 5|3)", rv);
    else               $display("FAIL  x5 = %0d (expected 7)", rv);

    read_reg(6, rv);
    if (rv === 32'd5)  $display("PASS  x6 = %0d (LW/SW round-trip)", rv);
    else               $display("FAIL  x6 = %0d (expected 5)", rv);

    read_reg(7, rv);
    if (rv === 32'd0)  $display("PASS  x7 = %0d (BEQ skipped ADDI)", rv);
    else               $display("FAIL  x7 = %0d (expected 0, BEQ should skip)", rv);

    $display("RISC-V RV32I core works!");
    $display("🎓 Advanced Digital Design Engineer certificate earned!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  x1 = 5 (ADDI)',
        'PASS  x3 = 8 (ADD)',
        'PASS  x4 = 1 (AND 5&3)',
        'PASS  x5 = 7 (OR 5|3)',
        'PASS  x6 = 5 (LW/SW round-trip)',
        'PASS  x7 = 0 (BEQ skipped ADDI)',
        'RISC-V RV32I core works!'
      ]
    }

  ]
});
