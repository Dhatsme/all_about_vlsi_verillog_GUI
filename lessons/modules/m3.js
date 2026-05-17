// Module 3 — Sequential Logic
// To edit this module, change only this file.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m3",
  title: "Sequential Logic",
  icon: "⏱",
  level: "intermediate",
  lessons: [
    {
      id: "m3l1",
      title: "Flip-Flops: D, T, JK, SR",
      theory: `
<h2>Flip-Flops</h2>
<p>A flip-flop is a 1-bit memory element. It captures its input on a clock edge and holds the value until the next edge. This is the foundation of ALL sequential logic.</p>

<h3>always @(posedge clk)</h3>
<p>This is the most important construct in Verilog. It triggers only on the rising edge of the clock — this is how you create registers and flip-flops.</p>

<h3>D Flip-Flop (most common)</h3>
<pre class="code-block">always @(posedge clk) begin
  q <= d;   // non-blocking assignment!
end</pre>

<h3>Non-Blocking Assignment (<=)</h3>
<p>Inside <code>always @(posedge clk)</code>, ALWAYS use <code><=</code> (non-blocking). It evaluates the RHS first, then assigns all at once. This models real flip-flop behavior where all FF outputs update simultaneously.</p>
<pre class="code-block">// WRONG — creates race condition
always @(posedge clk) begin
  a = b;   // blocking: a gets new b immediately
  c = a;   // c gets the NEW a, not the old one!
end

// RIGHT — all FFs update together
always @(posedge clk) begin
  a <= b;  // non-blocking: schedules assignment
  c <= a;  // c gets the OLD a (correct!)
end</pre>

<h3>Synchronous vs Asynchronous Reset</h3>
<pre class="code-block">// Synchronous reset — reset only takes effect on clock edge
always @(posedge clk) begin
  if (rst) q <= 0;
  else     q <= d;
end

// Asynchronous reset — reset takes effect immediately
always @(posedge clk or posedge rst) begin
  if (rst) q <= 0;
  else     q <= d;
end</pre>
      `,
      tasks: ["Implement all 4 flip-flop types", "Use async reset", "Verify T and JK behavior"],
      hint: "T FF: q <= t ? ~q : q. JK: if(j&~k) q<=1; if(k&~j) q<=0; if(j&k) q<=~q;",
      design: `// D Flip-Flop
module dff (input clk, rst, d, output reg q);
  always @(posedge clk or posedge rst)
    if (rst) q <= 0; else q <= d;
endmodule

// T Flip-Flop (toggle)
module tff (input clk, rst, t, output reg q);
  always @(posedge clk or posedge rst)
    if (rst) q <= 0;
    else     q <= t ? ~q : q;
endmodule

// SR Flip-Flop
module srff (input clk, rst, s, r, output reg q);
  always @(posedge clk or posedge rst) begin
    if (rst)   q <= 0;
    else if (s && !r) q <= 1;
    else if (r && !s) q <= 0;
    // s=1,r=1 is forbidden; s=0,r=0 holds
  end
endmodule

// JK Flip-Flop
module jkff (input clk, rst, j, k, output reg q);
  always @(posedge clk or posedge rst) begin
    if (rst) q <= 0;
    else case ({j,k})
      2'b00: q <= q;
      2'b01: q <= 0;
      2'b10: q <= 1;
      2'b11: q <= ~q;
      default: q <= q;
    endcase
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg clk=0, rst=1, d, t_in, s, r, j, k;
  wire dq, tq, srq, jkq;

  dff  u0(.clk(clk),.rst(rst),.d(d),          .q(dq));
  tff  u1(.clk(clk),.rst(rst),.t(t_in),        .q(tq));
  srff u2(.clk(clk),.rst(rst),.s(s),.r(r),    .q(srq));
  jkff u3(.clk(clk),.rst(rst),.j(j),.k(k),    .q(jkq));

  always #5 clk=~clk;

  task tick; begin @(posedge clk); #1; end endtask

  initial begin
    d=0;t_in=0;s=0;r=0;j=0;k=0;
    #12 rst=0;

    $display("=== D Flip-Flop ===");
    d=1; tick; $display("d=1 -> q=%b", dq);
    d=0; tick; $display("d=0 -> q=%b", dq);

    $display("\\n=== T Flip-Flop (toggle) ===");
    t_in=1; tick; $display("t=1 -> q=%b (toggled)", tq);
    t_in=1; tick; $display("t=1 -> q=%b (toggled)", tq);
    t_in=0; tick; $display("t=0 -> q=%b (held)",    tq);

    $display("\\n=== JK Flip-Flop ===");
    j=1;k=0; tick; $display("j=1,k=0 -> q=%b (set)",    jkq);
    j=0;k=1; tick; $display("j=0,k=1 -> q=%b (reset)",  jkq);
    j=1;k=1; tick; $display("j=1,k=1 -> q=%b (toggle)", jkq);
    j=1;k=1; tick; $display("j=1,k=1 -> q=%b (toggle)", jkq);
    $finish;
  end
endmodule`,
      expected: ["d=1 -> q=1", "t=1 -> q=1 (toggled)", "j=1,k=0 -> q=1 (set)"]
    },

    {
      id: "m3l2",
      title: "Counters",
      theory: `
<h2>Counters</h2>
<p>Counters are the most common sequential circuits. They count clock edges and are used everywhere — timers, address generators, state machines, PWM generators.</p>

<h3>Types of Counters</h3>
<ul>
  <li><strong>Up counter</strong> — increments each clock</li>
  <li><strong>Down counter</strong> — decrements each clock</li>
  <li><strong>Up/Down counter</strong> — direction controlled by input</li>
  <li><strong>Modulo-N counter</strong> — counts 0 to N-1, then wraps</li>
  <li><strong>Gray code counter</strong> — only one bit changes per step</li>
</ul>

<h3>Synchronous Load</h3>
<pre class="code-block">always @(posedge clk) begin
  if (rst)  count <= 0;
  else if (load) count <= data;  // parallel load
  else          count <= count + 1;
end</pre>

<h3>Counter Width</h3>
<p>An N-bit counter counts from 0 to 2^N - 1. For modulo-N, add a comparison reset:</p>
<pre class="code-block">always @(posedge clk)
  if (count == N-1) count <= 0;
  else              count <= count + 1;</pre>
      `,
      tasks: ["Build a configurable up/down counter", "Add synchronous load", "Test modulo-10 counting"],
      hint: "Use a parameter for the modulus. Check count==MODULUS-1 for wrap.",
      design: `module counter #(
  parameter WIDTH = 4,
  parameter MODULUS = 10
)(
  input  wire             clk, rst,
  input  wire             up_down,  // 1=up, 0=down
  input  wire             load,
  input  wire [WIDTH-1:0] data,
  output reg  [WIDTH-1:0] count,
  output wire             tc          // terminal count
);

  assign tc = up_down ? (count == MODULUS-1) : (count == 0);

  always @(posedge clk or posedge rst) begin
    if (rst)        count <= 0;
    else if (load)  count <= data;
    else if (up_down) begin
      if (count == MODULUS-1) count <= 0;
      else                    count <= count + 1;
    end else begin
      if (count == 0) count <= MODULUS-1;
      else            count <= count - 1;
    end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        clk=0, rst=1, up_down=1, load=0;
  reg  [3:0] data=0;
  wire [3:0] count;
  wire       tc;

  counter #(.WIDTH(4),.MODULUS(10)) dut(
    .clk(clk),.rst(rst),.up_down(up_down),
    .load(load),.data(data),.count(count),.tc(tc));

  always #5 clk=~clk;

  integer i;
  initial begin
    #12 rst=0;
    $display("=== Counting UP (mod-10) ===");
    for(i=0;i<12;i=i+1) begin
      @(posedge clk);#1;
      $display("count=%0d tc=%b",count,tc);
    end

    $display("\\n=== Synchronous Load ===");
    data=7; load=1; @(posedge clk);#1; load=0;
    $display("After load: count=%0d",count);

    $display("\\n=== Counting DOWN ===");
    up_down=0;
    for(i=0;i<5;i=i+1) begin
      @(posedge clk);#1;
      $display("count=%0d",count);
    end
    $finish;
  end
endmodule`,
      expected: ["count=0", "count=9", "After load: count=7"]
    },

    {
      id: "m3l3",
      title: "Shift Registers",
      theory: `
<h2>Shift Registers</h2>
<p>A shift register moves data one position left or right each clock cycle. Used in serial communication (UART, SPI), delay lines, and data conversion.</p>

<h3>Types</h3>
<ul>
  <li><strong>SISO</strong> — Serial In, Serial Out. Simple delay line.</li>
  <li><strong>SIPO</strong> — Serial In, Parallel Out. Deserializer.</li>
  <li><strong>PISO</strong> — Parallel In, Serial Out. Serializer.</li>
  <li><strong>PIPO</strong> — Parallel In, Parallel Out. Standard register.</li>
</ul>

<h3>SIPO Implementation</h3>
<pre class="code-block">always @(posedge clk)
  shift_reg <= {shift_reg[N-2:0], serial_in};
  // shifts left, new bit enters at LSB</pre>

<h3>Universal Shift Register</h3>
<p>Controlled by a 2-bit mode: hold, shift-left, shift-right, parallel-load.</p>

<h3>Applications</h3>
<ul>
  <li>UART transmitter — converts parallel byte to serial bits</li>
  <li>CRC computation — serial data + feedback</li>
  <li>Ring counter — one-hot state machine</li>
  <li>Johnson counter — interesting patterns for clock dividers</li>
</ul>
      `,
      tasks: ["Build a universal shift register", "Test all 4 modes", "Observe serial transmission"],
      hint: "Mode 2'b00=hold, 2'b01=shift-right, 2'b10=shift-left, 2'b11=parallel load.",
      design: `module universal_shift_reg #(parameter N=8)(
  input  wire       clk, rst,
  input  wire [1:0] mode,      // 00=hold 01=shr 10=shl 11=load
  input  wire       s_in_r,    // serial in for right shift
  input  wire       s_in_l,    // serial in for left shift
  input  wire [N-1:0] p_in,   // parallel in
  output reg  [N-1:0] q,
  output wire         s_out_r, // serial out (LSB)
  output wire         s_out_l  // serial out (MSB)
);

  assign s_out_r = q[0];
  assign s_out_l = q[N-1];

  always @(posedge clk or posedge rst) begin
    if (rst) q <= 0;
    else case (mode)
      2'b00: q <= q;                        // hold
      2'b01: q <= {s_in_r, q[N-1:1]};      // shift right
      2'b10: q <= {q[N-2:0], s_in_l};      // shift left
      2'b11: q <= p_in;                     // parallel load
    endcase
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg       clk=0,rst=1;
  reg [1:0] mode;
  reg       s_in_r=0,s_in_l=1;
  reg [7:0] p_in=8'hA5;
  wire[7:0] q;
  wire      s_out_r, s_out_l;

  universal_shift_reg #(8) dut(
    .clk(clk),.rst(rst),.mode(mode),
    .s_in_r(s_in_r),.s_in_l(s_in_l),.p_in(p_in),
    .q(q),.s_out_r(s_out_r),.s_out_l(s_out_l));

  always #5 clk=~clk;
  integer i;

  initial begin
    #12 rst=0;

    mode=2'b11; @(posedge clk);#1;  // load
    $display("Parallel Load: q=%08b (0xA5=%08b)", q, 8'hA5);

    $display("\\nShift Right x4 (s_in_r=0):");
    mode=2'b01; s_in_r=0;
    for(i=0;i<4;i=i+1) begin @(posedge clk);#1; $display("  q=%08b", q); end

    mode=2'b11; @(posedge clk);#1;  // reload
    $display("\\nShift Left x4 (s_in_l=1):");
    mode=2'b10; s_in_l=1;
    for(i=0;i<4;i=i+1) begin @(posedge clk);#1; $display("  q=%08b", q); end

    $finish;
  end
endmodule`,
      expected: ["Parallel Load: q=10100101", "Shift Right", "Shift Left"]
    },

    {
      id: "m3l4",
      title: "Finite State Machines — Moore",
      theory: `
<h2>Finite State Machines (FSM)</h2>
<p>FSMs are the backbone of digital control logic. Every protocol controller, traffic light, vending machine, and CPU control unit is an FSM at its core.</p>

<h3>Moore vs Mealy</h3>
<ul>
  <li><strong>Moore FSM</strong> — output depends only on <em>current state</em>. Outputs are registered. Safer, more common.</li>
  <li><strong>Mealy FSM</strong> — output depends on <em>current state AND inputs</em>. Faster response but glitchy.</li>
</ul>

<h3>3-Block FSM Template (Best Practice)</h3>
<pre class="code-block">// Block 1: State register (sequential)
always @(posedge clk or posedge rst)
  if (rst) state <= IDLE;
  else     state <= next_state;

// Block 2: Next state logic (combinational)
always @(*) begin
  next_state = state; // default: stay
  case (state)
    IDLE: if (start) next_state = WORK;
    WORK: if (done)  next_state = IDLE;
  endcase
end

// Block 3: Output logic (Moore: based on state only)
always @(*) begin
  case (state)
    IDLE: out = 0;
    WORK: out = 1;
  endcase
end</pre>

<h3>State Encoding</h3>
<pre class="code-block">localparam IDLE = 2'b00,
           S1   = 2'b01,
           S2   = 2'b10,
           DONE = 2'b11;</pre>
      `,
      tasks: ["Implement a sequence detector (101)", "Use 3-block Moore FSM style", "Detect overlapping sequences"],
      hint: "States: IDLE, GOT1, GOT10, GOT101. Transition on each input bit. Output=1 only in GOT101.",
      design: `// Sequence Detector: detects "101" in serial input (Moore FSM)
module seq_det_101 (
  input  wire clk, rst,
  input  wire x,         // serial input
  output wire detected   // 1 when "101" seen
);

  localparam IDLE   = 2'd0,
             GOT1   = 2'd1,
             GOT10  = 2'd2,
             GOT101 = 2'd3;

  reg [1:0] state, next_state;

  // Block 1: State register
  always @(posedge clk or posedge rst)
    if (rst) state <= IDLE;
    else     state <= next_state;

  // Block 2: Next state logic
  always @(*) begin
    next_state = IDLE;
    case (state)
      IDLE:   next_state = x ? GOT1  : IDLE;
      GOT1:   next_state = x ? GOT1  : GOT10;
      GOT10:  next_state = x ? GOT101: IDLE;
      GOT101: next_state = x ? GOT1  : GOT10;  // overlap
    endcase
  end

  // Block 3: Output (Moore — only depends on state)
  assign detected = (state == GOT101);

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  clk=0, rst=1, x;
  wire detected;

  seq_det_101 dut(.clk(clk),.rst(rst),.x(x),.detected(detected));
  always #5 clk=~clk;

  // apply serial bit stream
  task send_bit;
    input b;
    begin x=b; @(posedge clk); #1; end
  endtask

  integer i;
  reg [11:0] stream = 12'b110101101011;

  initial begin
    x=0; #12 rst=0;
    $display("Sequence Detector: looking for '101'");
    $display("bit | state | detected");
    for(i=11;i>=0;i=i-1) begin
      send_bit(stream[i]);
      $display(" %b  |       | %b %s", x, detected, detected?"<-- DETECTED":"");
    end
    $finish;
  end
endmodule`,
      expected: ["DETECTED"]
    },

    {
      id: "m3l5",
      title: "Finite State Machines — Mealy",
      theory: `
<h2>Mealy FSM</h2>
<p>In a Mealy machine, the output is a function of BOTH the current state AND the current input. This makes it react faster (one clock earlier than Moore) but outputs can glitch with input noise.</p>

<h3>Key Difference from Moore</h3>
<pre class="code-block">// Moore output block:
always @(*) case(state)
  S0: out = 0;   // output from state only
endcase

// Mealy output block:
always @(*) case(state)
  S0: out = (x==1) ? 1 : 0;  // output from state AND input
endcase</pre>

<h3>When to use Mealy</h3>
<ul>
  <li>When you need faster response (protocol handshake)</li>
  <li>When fewer states is important</li>
  <li>UART, SPI, I2C bit-level controllers</li>
</ul>

<h3>Mealy Disadvantages</h3>
<ul>
  <li>Outputs can glitch (combinational path from input to output)</li>
  <li>Harder to debug</li>
  <li>Timing analysis more complex</li>
</ul>

<h3>Safe Mealy: Register the Output</h3>
<p>Add a flop on the output to eliminate glitches — this is a common industry practice called "registered Mealy."</p>
      `,
      tasks: ["Implement a Mealy 101 detector", "Compare with Moore — one less state?", "Check overlapping detection"],
      hint: "Mealy needs only 3 states: IDLE, GOT1, GOT10. Output fires in GOT10 when x=1.",
      design: `// Mealy Sequence Detector "101"
// Mealy needs 1 fewer state than Moore!
module mealy_101 (
  input  wire clk, rst, x,
  output reg  detected   // registered output (safe Mealy)
);

  localparam IDLE  = 2'd0,
             GOT1  = 2'd1,
             GOT10 = 2'd2;

  reg [1:0] state, next_state;
  reg       next_det;

  // State register
  always @(posedge clk or posedge rst) begin
    if (rst) begin state <= IDLE; detected <= 0; end
    else     begin state <= next_state; detected <= next_det; end
  end

  // Next state + Mealy output
  always @(*) begin
    next_state = IDLE;
    next_det   = 0;
    case (state)
      IDLE:  next_state = x ? GOT1  : IDLE;
      GOT1:  next_state = x ? GOT1  : GOT10;
      GOT10: begin
        if (x) begin next_det = 1; next_state = GOT1; end  // detected!
        else         next_state = IDLE;
      end
    endcase
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  clk=0,rst=1,x;
  wire detected;
  mealy_101 dut(.clk(clk),.rst(rst),.x(x),.detected(detected));
  always #5 clk=~clk;
  task send; input b; begin x=b;@(posedge clk);#1; end endtask

  initial begin
    x=0;#12 rst=0;
    $display("Mealy 101 Detector");
    // send 1101011
    send(1);$display("x=1 det=%b",detected);
    send(1);$display("x=1 det=%b",detected);
    send(0);$display("x=0 det=%b",detected);
    send(1);$display("x=1 det=%b <- should be 1",detected);
    send(0);$display("x=0 det=%b",detected);
    send(1);$display("x=1 det=%b <- should be 1",detected);
    send(1);$display("x=1 det=%b",detected);
    $finish;
  end
endmodule`,
      expected: ["det=1 <- should be 1"]
    }
  ]
});
