// Module 2 — Combinational Circuits
// To edit this module, change only this file.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m2",
  title: "Combinational Circuits",
  icon: "🔀",
  level: "beginner",
  lessons: [
    {
      id: "m2l1",
      title: "Always Blocks — Combinational",
      theory: `
<h2>always Blocks for Combinational Logic</h2>
<p>While <code>assign</code> is clean for simple logic, <code>always @(*)</code> is used for complex combinational circuits, especially those needing <code>if-else</code> or <code>case</code> statements.</p>

<h3>Sensitivity List</h3>
<pre class="code-block">always @(*) begin    // * = all inputs (recommended)
  // combinational logic here
end

always @(a or b or c) begin  // explicit list (older style)
  // same effect
end</pre>

<h3>Key Rules for Combinational always</h3>
<ul>
  <li>The output must be <code>reg</code> type (even though it's combinational)</li>
  <li>Every possible input combination must assign the output — or you get a latch!</li>
  <li>Use <code>always @(*)</code> not <code>always @(posedge clk)</code></li>
</ul>

<h3>Latch Warning</h3>
<p>If you forget the else clause, the synthesizer creates an unwanted latch:</p>
<pre class="code-block">// BAD — creates latch (out remembers old value when en=0)
always @(*) begin
  if (en) out = data;
  // missing else!
end

// GOOD — fully specified
always @(*) begin
  if (en) out = data;
  else    out = 0;
end</pre>
      `,
      tasks: ["Write a priority encoder using if-else", "Ensure all cases are covered", "Check output for each input"],
      hint: "Priority encoder: check inputs from highest to lowest. First '1' found determines output.",
      design: `module priority_encoder (
  input  wire [3:0] in,
  output reg  [1:0] out,
  output reg        valid   // 1 if any input is high
);

  always @(*) begin
    valid = 1'b1;
    if      (in[3]) out = 2'd3;
    else if (in[2]) out = 2'd2;
    else if (in[1]) out = 2'd1;
    else if (in[0]) out = 2'd0;
    else begin
      out   = 2'd0;
      valid = 1'b0;
    end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] in;
  wire [1:0] out;
  wire       valid;

  priority_encoder dut(.in(in),.out(out),.valid(valid));

  initial begin
    $display("Priority Encoder Test");
    $display("in   | out valid");
    in=4'b0000;#5;$display("%04b |  %0d   %b", in,out,valid);
    in=4'b0001;#5;$display("%04b |  %0d   %b", in,out,valid);
    in=4'b0010;#5;$display("%04b |  %0d   %b", in,out,valid);
    in=4'b0100;#5;$display("%04b |  %0d   %b", in,out,valid);
    in=4'b1000;#5;$display("%04b |  %0d   %b", in,out,valid);
    in=4'b1010;#5;$display("%04b |  %0d   %b  (in[3] wins)", in,out,valid);
    in=4'b0110;#5;$display("%04b |  %0d   %b  (in[2] wins)", in,out,valid);
    $finish;
  end
endmodule`,
      expected: ["0000 |  0   0", "1000 |  3   1", "1010 |  3   1  (in[3] wins)"]
    },

    {
      id: "m2l2",
      title: "Case Statements",
      theory: `
<h2>case, casez, casex</h2>
<p>The <code>case</code> statement is the cleanest way to implement multiplexers, decoders, and state machines in Verilog.</p>

<h3>case</h3>
<pre class="code-block">always @(*) begin
  case (sel)
    2'b00: out = a;
    2'b01: out = b;
    2'b10: out = c;
    2'b11: out = d;
    default: out = 0;  // always include default!
  endcase
end</pre>

<h3>casez — z matches don't-care</h3>
<pre class="code-block">casez (in)       // z or ? = don't care
  4'b1???: out = 3;   // if bit[3]=1, regardless of others
  4'b01??: out = 2;
  4'b001?: out = 1;
  4'b0001: out = 0;
  default: out = 0;
endcase</pre>

<h3>casex — x and z both match don't-care</h3>
<p>Avoid casex in RTL — x (unknown) should not be used as don't-care in synthesis. Use casez instead.</p>

<h3>Always Include default</h3>
<p>Without <code>default</code>, unlisted cases can infer latches.</p>
      `,
      tasks: ["Implement a 7-segment decoder", "Map 0-9 to segment patterns", "Test all digit inputs"],
      hint: "7-seg segments: abcdefg. For digit '0': segments a,b,c,d,e,f ON = 7'b1111110",
      design: `module seg7_decoder (
  input  wire [3:0] digit,
  output reg  [6:0] seg    // segments: gfedcba
);
  // segment encoding: 7'b_gfedcba
  // 0=ON, 1=OFF (common anode) or reverse (common cathode)
  // here: 1=segment ON

  always @(*) begin
    case (digit)
      4'd0: seg = 7'b0111111; // 0: a,b,c,d,e,f
      4'd1: seg = 7'b0000110; // 1: b,c
      4'd2: seg = 7'b1011011; // 2: a,b,d,e,g
      4'd3: seg = 7'b1001111; // 3: a,b,c,d,g
      4'd4: seg = 7'b1100110; // 4: b,c,f,g
      4'd5: seg = 7'b1101101; // 5: a,c,d,f,g
      4'd6: seg = 7'b1111101; // 6: a,c,d,e,f,g
      4'd7: seg = 7'b0000111; // 7: a,b,c
      4'd8: seg = 7'b1111111; // 8: all
      4'd9: seg = 7'b1101111; // 9: a,b,c,d,f,g
      default: seg = 7'b0000000; // blank
    endcase
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] digit;
  wire [6:0] seg;

  seg7_decoder dut(.digit(digit),.seg(seg));

  integer i;
  initial begin
    $display("7-Segment Decoder (gfedcba)");
    $display("digit | seg[6:0]");
    for (i=0; i<=9; i=i+1) begin
      digit = i; #5;
      $display("  %0d   | %07b", digit, seg);
    end
    digit = 15; #5;
    $display("  F   | %07b (blank)", seg);
    $finish;
  end
endmodule`,
      expected: ["0   | 0111111", "8   | 1111111"]
    },

    {
      id: "m2l3",
      title: "Adders: Half, Full, Ripple Carry",
      theory: `
<h2>Adder Circuits</h2>
<p>Adders are the heart of every ALU and processor. Understanding them from first principles gives you insight into how computers actually compute.</p>

<h3>Half Adder</h3>
<p>Adds two 1-bit numbers. Produces Sum and Carry.</p>
<pre class="code-block">sum   = a ^ b
carry = a & b</pre>

<h3>Full Adder</h3>
<p>Adds three 1-bit numbers (a, b, carry_in). This is the building block for multi-bit adders.</p>
<pre class="code-block">sum  = a ^ b ^ cin
cout = (a & b) | (b & cin) | (a & cin)</pre>

<h3>Ripple Carry Adder</h3>
<p>Chain N full adders — each carry output feeds the next. Simple but slow (carry must propagate through all stages).</p>

<h3>Carry Lookahead (preview)</h3>
<p>Computes all carries in parallel. Faster but more hardware. This is what real CPUs use.</p>
      `,
      tasks: ["Build a 4-bit ripple carry adder", "Instantiate full adders hierarchically", "Test overflow cases"],
      hint: "Chain 4 full_adders: cout of stage N becomes cin of stage N+1. First cin=0.",
      design: `// Full Adder — building block
module full_adder (
  input  wire a, b, cin,
  output wire sum, cout
);
  assign sum  = a ^ b ^ cin;
  assign cout = (a & b) | (b & cin) | (a & cin);
endmodule

// 4-bit Ripple Carry Adder
module rca_4bit (
  input  wire [3:0] a, b,
  input  wire       cin,
  output wire [3:0] sum,
  output wire       cout
);
  wire c1, c2, c3;  // internal carry wires

  full_adder fa0 (.a(a[0]),.b(b[0]),.cin(cin), .sum(sum[0]),.cout(c1));
  full_adder fa1 (.a(a[1]),.b(b[1]),.cin(c1),  .sum(sum[1]),.cout(c2));
  full_adder fa2 (.a(a[2]),.b(b[2]),.cin(c2),  .sum(sum[2]),.cout(c3));
  full_adder fa3 (.a(a[3]),.b(b[3]),.cin(c3),  .sum(sum[3]),.cout(cout));

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] a, b;
  reg        cin;
  wire [3:0] sum;
  wire       cout;

  rca_4bit dut(.a(a),.b(b),.cin(cin),.sum(sum),.cout(cout));

  initial begin
    $display("4-bit Ripple Carry Adder");
    $display("  a    b   cin | cout sum | decimal");
    $display("-------------------------------");
    cin=0;

    a=4'd3;  b=4'd5;  #10;
    $display(" %04b %04b   %b  |   %b  %04b |  %0d + %0d = %0d",a,b,cin,cout,sum,a,b,{cout,sum});

    a=4'd7;  b=4'd8;  #10;
    $display(" %04b %04b   %b  |   %b  %04b |  %0d + %0d = %0d",a,b,cin,cout,sum,a,b,{cout,sum});

    a=4'd15; b=4'd15; #10;
    $display(" %04b %04b   %b  |   %b  %04b |  %0d + %0d = %0d (overflow!)",a,b,cin,cout,sum,a,b,{cout,sum});

    a=4'd15; b=4'd1; cin=1; #10;
    $display(" %04b %04b   %b  |   %b  %04b |  %0d+%0d+cin=%0d",a,b,cin,cout,sum,a,b,{cout,sum});

    $finish;
  end
endmodule`,
      expected: ["3 + 5 =  8", "15 + 15"]
    },

    {
      id: "m2l4",
      title: "Comparators and Arithmetic",
      theory: `
<h2>Comparators</h2>
<p>Comparison operators in Verilog work on vectors and return a 1-bit result. They are synthesized into comparator circuits.</p>

<h3>Comparison Operators</h3>
<pre class="code-block">a == b   // equal
a != b   // not equal
a >  b   // greater than
a <  b   // less than
a >= b   // greater or equal
a <= b   // less or equal</pre>

<h3>Logical vs Bitwise</h3>
<pre class="code-block">// Logical (returns 1-bit)
a && b   // logical AND — true if both non-zero
a || b   // logical OR

// Bitwise (bit-by-bit on vectors)
a & b    // bitwise AND
a | b    // bitwise OR</pre>

<h3>Signed Arithmetic</h3>
<pre class="code-block">// By default, Verilog treats values as UNSIGNED
// Use 'signed' keyword for signed comparison
wire signed [7:0] a, b;
assign lt = a < b;  // now treats as 2's complement</pre>

<h3>Shift Operators</h3>
<pre class="code-block">a >> 1   // logical right shift (fills with 0)
a << 1   // logical left shift
a >>> 1  // arithmetic right shift (fills with sign bit)
a <<< 1  // arithmetic left shift</pre>
      `,
      tasks: ["Build a magnitude comparator", "Handle equal, greater, less outputs", "Test signed vs unsigned"],
      hint: "Three outputs: eq=(a==b), gt=(a>b), lt=(a<b). Only one should be 1 at a time.",
      design: `module comparator_4bit (
  input  wire [3:0] a, b,
  output wire       eq,   // a == b
  output wire       gt,   // a > b
  output wire       lt    // a < b
);

  assign eq = (a == b);
  assign gt = (a >  b);
  assign lt = (a <  b);

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] a, b;
  wire       eq, gt, lt;

  comparator_4bit dut(.a(a),.b(b),.eq(eq),.gt(gt),.lt(lt));

  initial begin
    $display("4-bit Comparator");
    $display(" a   b  | eq gt lt");
    $display("---------+---------");
    a=4'd5;  b=4'd5;  #5; $display("%4d %4d |  %b  %b  %b", a,b,eq,gt,lt);
    a=4'd7;  b=4'd3;  #5; $display("%4d %4d |  %b  %b  %b", a,b,eq,gt,lt);
    a=4'd2;  b=4'd9;  #5; $display("%4d %4d |  %b  %b  %b", a,b,eq,gt,lt);
    a=4'd15; b=4'd0;  #5; $display("%4d %4d |  %b  %b  %b", a,b,eq,gt,lt);
    a=4'd0;  b=4'd15; #5; $display("%4d %4d |  %b  %b  %b", a,b,eq,gt,lt);
    $finish;
  end
endmodule`,
      expected: ["5    5 |  1  0  0", "7    3 |  0  1  0", "2    9 |  0  0  1"]
    }
  ]
});
