// msv7.js — Advanced Digital Design
// 4 portfolio lessons: PWM, VGA Sync, Calculator, RISC-V RV32I
// All Tier 5. Prerequisites: all msv1–msv6 concepts.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv7',
  title: 'Advanced Digital Design',
  icon: '🏆',
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
  logic [3:0] duty;
  logic       pwm_out, pwm_n_out;

  pwm_gen #(.PERIOD(10), .DEADTIME(2)) dut(
    .clk(clk), .rst(rst), .duty(duty),
    .pwm_out(pwm_out), .pwm_n_out(pwm_n_out));

  always #5 clk = ~clk;

  function automatic integer count_high(integer cycles);
    integer i; integer n; n = 0;
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
    duty = 0; hi = count_high(20);
    if (hi === 0) $display("PASS  0%% duty: %0d/20", hi);
    else          $display("FAIL  0%% duty: %0d high", hi);
    duty = 5; hi = count_high(20);
    if (hi === 10) $display("PASS  50%% duty: %0d/20", hi);
    else           $display("FAIL  50%% duty: %0d high", hi);
    duty = 10; hi = count_high(20);
    if (hi === 20) $display("PASS  100%% duty: %0d/20", hi);
    else           $display("FAIL  100%% duty: %0d high", hi);
    duty = 5; rst = 1; @(posedge clk); #1; rst = 0;
    begin : dt_check
      integer i; integer overlap; overlap = 0;
      for (i = 0; i < 30; i = i + 1) begin
        @(posedge clk); #1;
        if (pwm_out === 1'b1 && pwm_n_out === 1'b1) overlap = overlap + 1;
      end
      if (overlap === 0) $display("PASS  No shoot-through");
      else               $display("FAIL  Shoot-through: %0d cycles", overlap);
    end
    $display("PWM generator works!"); $finish;
  end
endmodule`,
      expected: ['PASS  0% duty', 'PASS  50% duty', 'PASS  100% duty', 'PASS  No shoot-through', 'PWM generator works!']
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
<table class="truth-table">
  <tr><th>H Region</th><th>Pixels</th><th>Range</th></tr>
  <tr><td>Active</td><td>640</td><td>0–639</td></tr>
  <tr><td>Front porch</td><td>16</td><td>640–655</td></tr>
  <tr><td>Sync (hsync=0)</td><td>96</td><td>656–751</td></tr>
  <tr><td>Back porch</td><td>48</td><td>752–799</td></tr>
  <tr><th colspan="2">Total</th><td>800 cycles/line</td></tr>
</table>
<table class="truth-table">
  <tr><th>V Region</th><th>Lines</th><th>Range</th></tr>
  <tr><td>Active</td><td>480</td><td>0–479</td></tr>
  <tr><td>Front porch</td><td>10</td><td>480–489</td></tr>
  <tr><td>Sync (vsync=0)</td><td>2</td><td>490–491</td></tr>
  <tr><td>Back porch</td><td>33</td><td>492–524</td></tr>
  <tr><th colspan="2">Total</th><td>525 lines/frame</td></tr>
</table>

<pre class="code-block">localparam H_ACTIVE=640, H_FP=16, H_SYNC=96, H_BP=48;
localparam H_TOTAL = H_ACTIVE+H_FP+H_SYNC+H_BP; // 800
localparam H_SYNC_START = H_ACTIVE+H_FP;         // 656
localparam H_SYNC_END   = H_SYNC_START+H_SYNC;   // 752</pre>

<p><strong>Plan every localparam before coding.</strong> Use the same pattern for vertical.</p>
`,
      tasks: [
        'Plan all localparam constants before writing RTL.',
        'Module: vga_sync',
        'Ports: clk, rst (in); hsync, vsync, display_on (out); pixel_x[9:0], pixel_y[9:0] (out)',
        'h_cnt [9:0]: increments every clock, resets at H_TOTAL',
        'v_cnt [9:0]: increments when h_cnt==H_TOTAL-1, resets at V_TOTAL',
        'hsync: LOW when h_cnt in [H_SYNC_START, H_SYNC_END-1]',
        'vsync: LOW when v_cnt in [V_SYNC_START, V_SYNC_END-1]',
        'display_on: HIGH when h_cnt < 640 && v_cnt < 480',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — testbench checks hsync/vsync pulse widths and active pixel count',
        '🎓 Push to your GitHub when done',
      ],
      hint: `No hint for portfolio projects.
VGA checklist:
  H: ACTIVE=640 FP=16 SYNC=96 BP=48 TOTAL=800
  V: ACTIVE=480 FP=10 SYNC=2  BP=33 TOTAL=525
  hsync = ~(h_cnt >= H_SYNC_START && h_cnt < H_SYNC_END)
  vsync = ~(v_cnt >= V_SYNC_START && v_cnt < V_SYNC_END)
  display_on = (h_cnt < 640) && (v_cnt < 480)`,
      design:
`// Build the vga_sync module here.
// H: active=640, fp=16, sync=96, bp=48, total=800
// V: active=480, fp=10, sync=2,  bp=33, total=525
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, hsync, vsync, display_on;
  logic [9:0] pixel_x, pixel_y;
  vga_sync dut(.clk(clk),.rst(rst),.hsync(hsync),.vsync(vsync),
               .display_on(display_on),.pixel_x(pixel_x),.pixel_y(pixel_y));
  always #5 clk = ~clk;
  integer h_low, active_px, v_low;
  initial begin
    clk=0; rst=1; @(posedge clk); #1; rst=0;
    h_low=0;
    begin : hc integer i; for(i=0;i<800;i=i+1) begin @(posedge clk);#1; if(hsync===1'b0) h_low=h_low+1; end end
    if(h_low===96) $display("PASS  hsync pulse = %0d cycles",h_low);
    else           $display("FAIL  hsync = %0d (expected 96)",h_low);
    active_px=0;
    begin : ap integer i; for(i=0;i<800;i=i+1) begin @(posedge clk);#1; if(display_on===1'b1) active_px=active_px+1; end end
    if(active_px===640) $display("PASS  Active pixels/line = %0d",active_px);
    else                $display("FAIL  Active px = %0d (expected 640)",active_px);
    rst=1; @(posedge clk);#1; rst=0;
    v_low=0;
    begin : vc integer i; for(i=0;i<800*525;i=i+1) begin @(posedge clk);#1; if(vsync===1'b0) v_low=v_low+1; end end
    if(v_low===1600) $display("PASS  vsync pulse = %0d cycles",v_low);
    else             $display("FAIL  vsync = %0d (expected 1600)",v_low);
    $display("VGA sync generator works!"); $finish;
  end
endmodule`,
      expected: ['PASS  hsync pulse', 'PASS  Active pixels', 'PASS  vsync pulse', 'VGA sync generator works!']
    },

    // ── L3: Pipelined Calculator (Tier 5) ───────────────────────────
    {
      id: 'msv7l3',
      title: 'L3 — Pipelined Calculator',
      theory: `
<h2>Portfolio Project: Pipelined Calculator</h2>
<p>A <strong>pipeline</strong> breaks a computation into stages separated by registers.
Each stage takes one clock cycle. This lesson introduces two new concepts.</p>

<h3>New concept: $signed() — signed arithmetic</h3>
<p>SystemVerilog defaults to unsigned. Wrap operands with <code>$signed()</code> for correct negative results:</p>
<pre class="code-block">logic [7:0] a = 8'd5, b = 8'd10;
logic [7:0] diff = a - b;            // WRONG: 251 (unsigned wrap)
logic signed [7:0] diff2;
assign diff2 = $signed(a) - $signed(b);  // CORRECT: -5</pre>

<h3>New concept: 2-stage pipeline</h3>
<pre class="code-block">// Stage 1: register inputs
always_ff @(posedge clk) begin
  s1_a &lt;= a_in; s1_b &lt;= b_in; s1_op &lt;= op_in; s1_valid &lt;= valid_in;
end
// Stage 2: compute
always_ff @(posedge clk) begin
  unique case (s1_op)
    2'b00: s2_result &lt;= $signed(s1_a) + $signed(s1_b);
    2'b01: s2_result &lt;= $signed(s1_a) - $signed(s1_b);
    2'b10: s2_result &lt;= s1_a &amp; s1_b;
    2'b11: s2_result &lt;= s1_a | s1_b;
  endcase
  s2_valid &lt;= s1_valid;
end</pre>

<h3>Operations: op[1:0] — 00=ADD, 01=SUB, 10=AND, 11=OR</h3>
<p>Output <code>result_valid</code> goes high 2 cycles after <code>valid_in</code>.</p>
`,
      tasks: [
        'New syntax: $signed(x) and 2-stage pipeline — read Theory carefully.',
        'Module: calculator',
        'Ports: clk, rst, valid_in (in); a[7:0], b[7:0], op[1:0] (in); result[7:0], result_valid, overflow (out)',
        'Stage 1 FF: latch a, b, op, valid_in on every posedge clk',
        'Stage 2 FF: unique case on op, compute with $signed for ADD/SUB',
        'overflow: for ADD/SUB use 9-bit intermediate: sum9={a[7],a}+{b[7],b}; overflow=sum9[8]^sum9[7]',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — verify ADD, SUB, AND, OR, overflow all PASS',
        '🎓 Push to your GitHub when done',
      ],
      hint: `No hint for portfolio projects.
Calculator checklist:
  Stage 1: logic [7:0] s1_a, s1_b; logic [1:0] s1_op; logic s1_valid;
  Stage 2: logic [7:0] s2_result; logic s2_valid, s2_ovf;
  Overflow: logic [8:0] s; s={s1_a[7],s1_a}+{s1_b[7],s1_b}; ovf=s[8]^s[7];
  assign result=s2_result; result_valid=s2_valid; overflow=s2_ovf;`,
      design:
`// Build the pipelined calculator here.
// op: 00=ADD($signed) 01=SUB($signed) 10=AND 11=OR
// 2-stage pipeline: stage1=register inputs, stage2=compute
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk,rst,valid_in,result_valid,overflow;
  logic [7:0] a,b,result;
  logic [1:0] op;
  calculator dut(.clk(clk),.rst(rst),.valid_in(valid_in),.a(a),.b(b),.op(op),
                 .result(result),.result_valid(result_valid),.overflow(overflow));
  always #5 clk=~clk;
  task send_op(input [7:0] ta,tb_v; input [1:0] top; input [7:0] er; input eov; input string lbl);
    @(posedge clk);#1; a=ta; b=tb_v; op=top; valid_in=1;
    @(posedge clk);#1; valid_in=0;
    @(posedge clk);#1;
    if(result_valid===1'b1 && result===er && overflow===eov)
      $display("PASS  %s",lbl);
    else
      $display("FAIL  %s: got 0x%02h ovf=%0b",lbl,result,overflow);
  endtask
  initial begin
    clk=0; rst=1; valid_in=0; a=0; b=0; op=0;
    @(posedge clk);#1; rst=0;
    send_op(10,20, 2'b00, 30,  0, "ADD 10+20=30");
    send_op(100,50,2'b01, 50,  0, "SUB 100-50=50");
    send_op(8'hFF,8'hAA, 2'b10, 8'hAA, 0, "AND FF&AA=AA");
    send_op(8'hF0,8'h0F, 2'b11, 8'hFF, 0, "OR F0|0F=FF");
    send_op(127,1, 2'b00, 128, 1, "ADD overflow 127+1");
    send_op(5,10,  2'b01, 8'hFB, 0, "SUB 5-10=-5");
    $display("Calculator works!"); $finish;
  end
endmodule`,
      expected: ['PASS  ADD 10+20=30','PASS  SUB 100-50=50','PASS  AND FF&AA=AA','PASS  OR F0|0F=FF','PASS  ADD overflow 127+1','PASS  SUB 5-10=-5','Calculator works!']
    },

    // ── L4: RISC-V RV32I Core (Tier 5) ─────────────────────────────
    {
      id: 'msv7l4',
      title: 'L4 — RISC-V RV32I Core',
      theory: `
<h2>Portfolio Capstone: RISC-V RV32I Processor</h2>
<p>The RISC-V RV32I is a real, open-standard 32-bit instruction set used in production silicon.
Building even a simple version teaches every fundamental concept in computer architecture.</p>

<h3>New concept: $readmemh — loading instruction memory</h3>
<pre class="code-block">logic [31:0] imem [0:255];    // 256-word instruction memory
initial $readmemh("prog.hex", imem);
// prog.hex: one 32-bit word per line (hex, no 0x prefix)
// 00500093   // ADDI x1, x0, 5</pre>

<h3>New concept: generate blocks</h3>
<pre class="code-block">genvar i;
generate
  for (i = 0; i &lt; 32; i++) begin : reg_init
    // elaboration-time unrolling
  end
endgenerate</pre>

<h3>Minimal RV32I instructions to implement</h3>
<table class="truth-table">
  <tr><th>Instr</th><th>Type</th><th>Operation</th></tr>
  <tr><td>ADD rd,rs1,rs2</td><td>R</td><td>rd=rs1+rs2</td></tr>
  <tr><td>ADDI rd,rs1,imm</td><td>I</td><td>rd=rs1+sext(imm)</td></tr>
  <tr><td>AND/OR rd,rs1,rs2</td><td>R</td><td>bitwise</td></tr>
  <tr><td>LW rd,imm(rs1)</td><td>I</td><td>rd=mem[rs1+sext(imm)]</td></tr>
  <tr><td>SW rs2,imm(rs1)</td><td>S</td><td>mem[rs1+sext(imm)]=rs2</td></tr>
  <tr><td>BEQ rs1,rs2,off</td><td>B</td><td>if rs1==rs2: PC+=sext(off)</td></tr>
  <tr><td>JAL rd,off</td><td>J</td><td>rd=PC+4; PC+=sext(off)</td></tr>
</table>

<h3>Decode fields</h3>
<pre class="code-block">opcode=instr[6:0]; rd=instr[11:7]; funct3=instr[14:12];
rs1=instr[19:15];  rs2=instr[24:20]; funct7=instr[31:25];</pre>

<p><strong>This is the hardest project in the curriculum.</strong>
Plan every pipeline register and mux on paper. Start with ADD and ADDI only.</p>
`,
      tasks: [
        'New syntax: $readmemh, generate — read Theory first.',
        'Plan ALL pipeline registers and control signals on paper.',
        'Register file: logic [31:0] regs[0:31]; x0 always 0.',
        'Instruction memory: logic [31:0] imem[0:63]; testbench injects via force.',
        'Data memory: logic [31:0] dmem[0:63].',
        'Fetch: PC register, imem[PC>>2].',
        'Decode: extract opcode, rd, rs1, rs2, funct3, funct7, immediates.',
        'Execute: ALU for R-type/I-type with sign-extended immediates.',
        'Memory: LW reads dmem, SW writes dmem.',
        'Writeback: regfile[rd] <= result; never write x0.',
        'Branch/Jump: BEQ and JAL update PC.',
        'Implement order: ADD → ADDI → AND → OR → LW → SW → BEQ → JAL.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Run — testbench checks 7 register values after program execution.',
        '🎓 VLSI Architect certificate unlocked — you built a CPU from scratch',
      ],
      hint: `No hint for portfolio projects. RISC-V roadmap:

  Register file:
    logic [31:0] regs[0:31];
    always_ff: if(wb_we && wb_rd!=0) regs[wb_rd] <= wb_data;
    // x0 is always 0 — do not write it

  Instruction decode:
    opcode=instr[6:0]; rd=instr[11:7]; funct3=instr[14:12];
    rs1=instr[19:15]; rs2=instr[24:20]; funct7=instr[31:25];

  Immediates:
    I: {{20{instr[31]}}, instr[31:20]}
    S: {{20{instr[31]}}, instr[31:25], instr[11:7]}
    B: {{19{instr[31]}}, instr[31],instr[7],instr[30:25],instr[11:8],1'b0}
    J: {{11{instr[31]}}, instr[31],instr[19:12],instr[20],instr[30:21],1'b0}

  Opcodes: R=7'h33 IALU=7'h13 LOAD=7'h03 STORE=7'h23 BRANCH=7'h63 JAL=7'h6F`,
      design:
`// Build the RISC-V RV32I core here.
//
// Module: riscv_core
// Ports:
//   input  logic        clk, rst
//   output logic [31:0] pc_out
//   output logic [31:0] reg_out
//   input  logic [4:0]  reg_sel
//
// Start with ADD and ADDI only, then add more instructions.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst;
  logic [31:0] pc_out, reg_out;
  logic [4:0]  reg_sel;
  riscv_core dut(.clk(clk),.rst(rst),.pc_out(pc_out),.reg_out(reg_out),.reg_sel(reg_sel));
  always #5 clk=~clk;
  task read_reg(input [4:0] r, output [31:0] v); reg_sel=r; #1; v=reg_out; endtask
  logic [31:0] rv;
  initial begin
    clk=0; rst=1;
    force dut.imem[0] = 32'h00500093; // ADDI x1,x0,5
    force dut.imem[1] = 32'h00300113; // ADDI x2,x0,3
    force dut.imem[2] = 32'h002081B3; // ADD  x3,x1,x2
    force dut.imem[3] = 32'h0020F233; // AND  x4,x1,x2
    force dut.imem[4] = 32'h0020E2B3; // OR   x5,x1,x2
    force dut.imem[5] = 32'h00102023; // SW   x1,0(x0)
    force dut.imem[6] = 32'h00002303; // LW   x6,0(x0)
    force dut.imem[7] = 32'h00108463; // BEQ  x1,x1,+8
    force dut.imem[8] = 32'h06300393; // ADDI x7,x0,99 (skipped)
    force dut.imem[9] = 32'h0000046F; // JAL  x8,0
    force dut.imem[10]= 32'h00000013; // NOP
    @(posedge clk);#1; rst=0;
    repeat(40) @(posedge clk);#1;
    read_reg(1,rv); if(rv===32'd5) $display("PASS  x1=%0d",rv); else $display("FAIL  x1=%0d",rv);
    read_reg(3,rv); if(rv===32'd8) $display("PASS  x3=%0d",rv); else $display("FAIL  x3=%0d",rv);
    read_reg(4,rv); if(rv===32'd1) $display("PASS  x4=%0d",rv); else $display("FAIL  x4=%0d",rv);
    read_reg(5,rv); if(rv===32'd7) $display("PASS  x5=%0d",rv); else $display("FAIL  x5=%0d",rv);
    read_reg(6,rv); if(rv===32'd5) $display("PASS  x6=%0d (LW/SW)",rv); else $display("FAIL  x6=%0d",rv);
    read_reg(7,rv); if(rv===32'd0) $display("PASS  x7=0 (BEQ skipped)"); else $display("FAIL  x7=%0d",rv);
    $display("RISC-V RV32I core works!");
    $display("VLSI Architect certificate unlocked!");
    $finish;
  end
endmodule`,
      expected: ['PASS  x1=5','PASS  x3=8','PASS  x4=1','PASS  x5=7','PASS  x6=5','PASS  x7=0','RISC-V RV32I core works!']
    }

  ]
});
