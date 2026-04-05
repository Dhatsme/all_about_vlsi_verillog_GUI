// Module 1 — Foundations of Digital Design
// To edit this module, change only this file.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m1",
  title: "Foundations of Digital Design",
  icon: "⚡",
  level: "beginner",
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Your first module. Code is intentionally broken. Fix it to proceed.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l1",
      title: "Your First Module — Fix the AND Gate",
      theory: `
<h2>Your First Verilog Module</h2>
<p>Every Verilog design is a <strong>module</strong> — think of it as a chip with input and output pins. The simplest thing a module can do is wire inputs to outputs through logic.</p>

<h3>The assign statement</h3>
<p><code>assign</code> creates a <em>continuous connection</em> — it stays active forever, like a physical wire. The moment an input changes, the output updates instantly.</p>
<pre class="code-block">assign y = a & b;   // AND gate
assign y = a | b;   // OR gate
assign y = ~a;      // NOT gate</pre>

<h3>Your task</h3>
<p>The design below has a placeholder <code>???</code> where the AND logic should go. <strong>Hit Run now</strong> — you'll see a compilation error. Then fix it.</p>
<p>Replace <code>???</code> with the correct expression: <code>a & b</code></p>
<p>Run again. You should see the full AND gate truth table.</p>
      `,
      tasks: [
        "Run as-is — read the compilation error carefully",
        "Replace ??? with the correct AND expression",
        "Run again — verify the truth table is correct"
      ],
      hint: "The AND operator in Verilog is & (single ampersand). Write: assign y = a & b;",
      design: `// Fix this module — find the ??? and replace it
module and_gate (
  input  wire a,
  input  wire b,
  output wire y
);

  assign y = ???;   // ← replace ??? with the correct expression

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b;
  wire y;

  and_gate dut (.a(a), .b(b), .y(y));

  initial begin
    $display("a  b | y");
    $display("-----+--");
    a=0; b=0; #10; $display("%0b  %0b | %0b", a, b, y);
    a=0; b=1; #10; $display("%0b  %0b | %0b", a, b, y);
    a=1; b=0; #10; $display("%0b  %0b | %0b", a, b, y);
    a=1; b=1; #10; $display("%0b  %0b | %0b", a, b, y);
    $display("\\nAND gate working!");
    $finish;
  end
endmodule`,
      expected: ["0  0 | 0", "1  1 | 1", "AND gate working!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Port name mismatch. A real error beginners hit constantly.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l2",
      title: "Modules & Ports — The Name Must Match",
      theory: `
<h2>Modules and Port Names</h2>
<p>A module declares its ports — the names it exposes to the outside world. When a testbench <em>instantiates</em> your module, it connects to those ports <strong>by name</strong>.</p>

<pre class="code-block">// Module declares: output wire sum
// Testbench connects: .sum(sum_wire)
// These MUST match — typo = compile error</pre>

<h3>Named port connection syntax</h3>
<pre class="code-block">half_adder dut (
  .a(a),         // port a  ← connected to signal a
  .b(b),         // port b  ← connected to signal b
  .sum(sum),     // port sum ← connected to signal sum
  .carry(carry)
);</pre>

<h3>Your task</h3>
<p>The module below declares <code>output wire s</code> but the testbench expects a port named <code>sum</code>. Hit Run to see the error, then rename the port.</p>
<p>You need to rename <strong>both</strong> places: the port declaration AND the assign statement.</p>
      `,
      tasks: [
        "Run as-is — read the port connection error",
        "Rename output port 's' to 'sum' in the port list",
        "Also rename 's' to 'sum' in the assign statement — run again"
      ],
      hint: "Find both places where 's' appears and rename them to 'sum'. Port declarations and assign statements must use the same name.",
      design: `module half_adder (
  input  wire a,
  input  wire b,
  output wire s,      // ← BUG: testbench expects port named 'sum'
  output wire carry
);

  assign s     = a ^ b;   // ← also needs to match
  assign carry = a & b;

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b;
  wire sum, carry;

  half_adder dut (.a(a), .b(b), .sum(sum), .carry(carry));

  initial begin
    $display("a  b | sum carry");
    $display("-----+-----------");
    a=0;b=0;#5; $display("%b  %b |  %b    %b", a,b,sum,carry);
    a=0;b=1;#5; $display("%b  %b |  %b    %b", a,b,sum,carry);
    a=1;b=0;#5; $display("%b  %b |  %b    %b", a,b,sum,carry);
    a=1;b=1;#5; $display("%b  %b |  %b    %b", a,b,sum,carry);
    $display("\\nHalf adder correct!");
    $finish;
  end
endmodule`,
      expected: ["0  0 |  0    0", "1  1 |  0    1", "Half adder correct!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — wire vs reg. The single most common beginner error in Verilog.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l3",
      title: "wire vs reg — A Classic Error",
      theory: `
<h2>wire vs reg</h2>
<p>Verilog has two main signal types. Choosing the wrong one gives you an immediate error.</p>

<table class="truth-table">
  <tr><th>Type</th><th>Driven by</th><th>Used with</th></tr>
  <tr><td><code>wire</code></td><td>assign statement or module output</td><td>continuous logic</td></tr>
  <tr><td><code>reg</code></td><td>always or initial block</td><td>procedural logic</td></tr>
</table>

<h3>The rule</h3>
<pre class="code-block">// If you write assign → LHS must be wire
assign y = a & b;      // y must be wire ✓

// If you write always → LHS must be reg
always @(*) begin
  y = a & b;           // y must be reg ✓
end</pre>

<h3>Your task</h3>
<p>The mux below drives <code>y</code> from an <code>always</code> block, but <code>y</code> is declared as <code>wire</code>. Hit Run to see the error, then fix the declaration.</p>
      `,
      tasks: [
        "Run as-is — read the 'cannot be driven procedurally' error",
        "Change 'output wire y' to 'output reg y'",
        "Run again — mux should now work correctly"
      ],
      hint: "Any signal assigned inside always @(*) must be declared as reg, even if it represents combinational (not registered) logic.",
      design: `module mux2 (
  input  wire a,
  input  wire b,
  input  wire sel,
  output wire y    // ← BUG: driven from always block — wrong type
);

  always @(*) begin
    if (sel) y = a;
    else     y = b;
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b, sel;
  wire y;

  mux2 dut (.a(a), .b(b), .sel(sel), .y(y));

  initial begin
    $display("sel=0 selects a, sel=1 selects b");
    $display("sel | a  b | y");
    $display("----+------+--");
    a=1; b=0; sel=0; #5; $display(" %b  | %b  %b | %b  (expect a=%b)", sel,a,b,y,a);
    a=1; b=0; sel=1; #5; $display(" %b  | %b  %b | %b  (expect b=%b)", sel,a,b,y,b);
    a=0; b=1; sel=0; #5; $display(" %b  | %b  %b | %b  (expect a=%b)", sel,a,b,y,a);
    a=0; b=1; sel=1; #5; $display(" %b  | %b  %b | %b  (expect b=%b)", sel,a,b,y,b);
    $display("\\nMUX working!");
    $finish;
  end
endmodule`,
      expected: ["(expect a=1)", "(expect b=0)", "MUX working!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Logic gates. One gate is intentionally missing.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l4",
      title: "Logic Gates — Add the Missing Gate",
      theory: `
<h2>Logic Gates with assign</h2>
<p>All standard gates map directly to Verilog operators:</p>

<table class="truth-table">
  <tr><th>Gate</th><th>Operator</th><th>Example</th></tr>
  <tr><td>AND</td><td><code>&</code></td><td><code>assign y = a & b;</code></td></tr>
  <tr><td>OR</td><td><code>|</code></td><td><code>assign y = a | b;</code></td></tr>
  <tr><td>NOT</td><td><code>~</code></td><td><code>assign y = ~a;</code></td></tr>
  <tr><td>XOR</td><td><code>^</code></td><td><code>assign y = a ^ b;</code></td></tr>
  <tr><td>XNOR</td><td><code>~^</code></td><td><code>assign y = a ~^ b;</code></td></tr>
  <tr><td>NAND</td><td><code>~&</code></td><td><code>assign y = ~(a & b);</code></td></tr>
  <tr><td>NOR</td><td><code>~|</code></td><td><code>assign y = ~(a | b);</code></td></tr>
</table>

<h3>Your task</h3>
<p>Five gates are implemented. XNOR is missing — <code>out_xnor</code> is never assigned.</p>
<p>Run as-is. You'll see <code>x</code> in the XNOR column (undriven wire). Add the missing assign line.</p>
<p><strong>XNOR truth:</strong> output is 1 when both inputs are equal (both 0 or both 1).</p>
      `,
      tasks: [
        "Run as-is — find which output shows 'x' in the console",
        "Add: assign out_xnor = a ~^ b;  below the other assigns",
        "Run again — XNOR column should now show 1,0,0,1"
      ],
      hint: "XNOR is the complement of XOR. In Verilog: a ~^ b  (tilde followed by caret). Add the line: assign out_xnor = a ~^ b;",
      design: `module all_gates (
  input  wire a, b,
  output wire out_and,
  output wire out_or,
  output wire out_not,
  output wire out_xor,
  output wire out_xnor,  // ← this output is never assigned!
  output wire out_nand,
  output wire out_nor
);

  assign out_and  = a & b;
  assign out_or   = a | b;
  assign out_not  = ~a;
  assign out_xor  = a ^ b;
  // TODO: add assign out_xnor = ???
  assign out_nand = ~(a & b);
  assign out_nor  = ~(a | b);

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b;
  wire and_o, or_o, not_o, xor_o, xnor_o, nand_o, nor_o;

  all_gates dut(
    .a(a), .b(b),
    .out_and(and_o), .out_or(or_o), .out_not(not_o),
    .out_xor(xor_o), .out_xnor(xnor_o),
    .out_nand(nand_o), .out_nor(nor_o)
  );

  initial begin
    $display("a b | AND OR NOT XOR XNOR NAND NOR");
    $display("----+--------------------------------");
    a=0;b=0;#5; $display("%b %b |  %b   %b   %b   %b    %b    %b   %b",a,b,and_o,or_o,not_o,xor_o,xnor_o,nand_o,nor_o);
    a=0;b=1;#5; $display("%b %b |  %b   %b   %b   %b    %b    %b   %b",a,b,and_o,or_o,not_o,xor_o,xnor_o,nand_o,nor_o);
    a=1;b=0;#5; $display("%b %b |  %b   %b   %b   %b    %b    %b   %b",a,b,and_o,or_o,not_o,xor_o,xnor_o,nand_o,nor_o);
    a=1;b=1;#5; $display("%b %b |  %b   %b   %b   %b    %b    %b   %b",a,b,and_o,or_o,not_o,xor_o,xnor_o,nand_o,nor_o);
    $finish;
  end
endmodule`,
      expected: ["0 0 |  0   0   1   0    1    1   1", "1 1 |  1   1   0   0    1    0   0"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L5 — Ternary operator. Wrong syntax in assign, student fixes it.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l5",
      title: "Ternary Operator — Fix the Broken MUX",
      theory: `
<h2>The Ternary Operator</h2>
<p><code>assign</code> is a single expression — you can't put <code>if/else</code> inside it. Instead, Verilog uses the <strong>ternary operator</strong>:</p>

<pre class="code-block">assign out = condition ? value_if_true : value_if_false;</pre>

<h3>Examples</h3>
<pre class="code-block">// 2:1 MUX
assign y = sel ? b : a;      // sel=1 → b, sel=0 → a

// 4:1 MUX using nested ternary
assign y = sel[1] ? (sel[0] ? d : c)
                  : (sel[0] ? b : a);</pre>

<h3>Concatenation</h3>
<p>You can group multiple bits with <code>{}</code>:</p>
<pre class="code-block">assign {carry, sum} = a + b;   // 9-bit result split into carry + sum</pre>

<h3>Your task</h3>
<p>The 2:1 MUX below uses <code>if</code> inside <code>assign</code> — that is a syntax error. Fix both MUX assigns to use the ternary <code>? :</code> operator.</p>
      `,
      tasks: [
        "Run as-is — see the syntax error on the assign line",
        "Fix mux2: replace the if expression with  sel ? b : a",
        "Fix mux4: use nested ternary — check the hint if needed"
      ],
      hint: "mux2: assign mux2_out = sel ? b : a;\nmux4: assign mux4_out = sel[1] ? (sel[0] ? d : c) : (sel[0] ? b : a);",
      design: `module mux_demo (
  input  wire       a, b, c, d,
  input  wire [1:0] sel,
  output wire       mux2_out,
  output wire       mux4_out
);

  // BUG: can't use if inside assign — use ternary ? : instead
  assign mux2_out = if (sel[0]) b else a;

  // BUG: same issue here
  assign mux4_out = if (sel[1]) (if (sel[0]) d else c)
                               else (if (sel[0]) b else a);

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a=1, b=0, c=1, d=0;
  reg  [1:0] sel;
  wire mux2_out, mux4_out;

  mux_demo dut(.a(a),.b(b),.c(c),.d(d),.sel(sel),
               .mux2_out(mux2_out),.mux4_out(mux4_out));

  initial begin
    $display("=== 2:1 MUX (a=1, b=0) ===");
    sel=2'b00;#5; $display("sel[0]=%b -> mux2=%b (expect %b)", sel[0],mux2_out,a);
    sel=2'b01;#5; $display("sel[0]=%b -> mux2=%b (expect %b)", sel[0],mux2_out,b);

    $display("\\n=== 4:1 MUX (a=1,b=0,c=1,d=0) ===");
    sel=2'b00;#5; $display("sel=%02b -> mux4=%b (expect a=%b)",sel,mux4_out,a);
    sel=2'b01;#5; $display("sel=%02b -> mux4=%b (expect b=%b)",sel,mux4_out,b);
    sel=2'b10;#5; $display("sel=%02b -> mux4=%b (expect c=%b)",sel,mux4_out,c);
    sel=2'b11;#5; $display("sel=%02b -> mux4=%b (expect d=%b)",sel,mux4_out,d);
    $display("\\nMUX done!");
    $finish;
  end
endmodule`,
      expected: ["sel[0]=0 -> mux2=1", "sel[0]=1 -> mux2=0", "MUX done!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L6 — 4-state logic. Student sees X, figures out why, fixes it.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l6",
      title: "4-State Logic — Hunting the X",
      theory: `
<h2>4-State Logic: 0, 1, x, z</h2>
<p>Unlike software, Verilog signals can have <strong>four</strong> possible values:</p>

<table class="truth-table">
  <tr><th>Value</th><th>Meaning</th><th>Comes from</th></tr>
  <tr><td><code>0</code></td><td>Logic low</td><td>Normal driven low</td></tr>
  <tr><td><code>1</code></td><td>Logic high</td><td>Normal driven high</td></tr>
  <tr><td><code>x</code></td><td>Unknown</td><td>Uninitialized reg, conflicting drivers</td></tr>
  <tr><td><code>z</code></td><td>High impedance</td><td>Undriven wire, tri-state</td></tr>
</table>

<h3>X propagates</h3>
<pre class="code-block">// If acc starts as x:
acc = acc + data;   // result = x (unknown + anything = unknown)</pre>

<h3>Your task</h3>
<p>The accumulator below is never initialized. Run it — you'll see <code>x</code> in the output. Fix it by initializing <code>acc</code> to <code>0</code> in the <code>initial</code> block.</p>
<p>Number literals reminder: <code>8'h00</code> = 8-bit hex zero, <code>8'd0</code> = 8-bit decimal zero.</p>
      `,
      tasks: [
        "Run as-is — notice 'x' values in the output",
        "Add   acc = 8'h00;   as the first line inside the initial begin block",
        "Run again — accumulator should now sum correctly"
      ],
      hint: "Inside the initial begin block, before the loop, add: acc = 8'h00;  This initializes the accumulator to zero before adding anything.",
      design: `module accumulator_tb;
  reg  [7:0] acc;    // ← never initialized — starts as x
  reg  [7:0] data;
  integer i;

  initial begin
    // TODO: initialize acc to 8'h00 here

    $display("Accumulating 1+2+3+4+5:");
    for (i = 1; i <= 5; i = i + 1) begin
      data = i[7:0];
      acc  = acc + data;
      $display("  after adding %0d: acc = %0d", data, acc);
    end
    $display("Final sum = %0d (expect 15)", acc);
    $finish;
  end
endmodule`,
      testbench: `// This lesson uses a self-contained testbench — the Design tab IS the testbench.
// Switch to the Design tab and fix the code there.
\`timescale 1ns/1ps
module tb;
  initial begin $display("See Design tab for this lesson."); $finish; end
endmodule`,
      expected: ["after adding 5: acc = 15", "Final sum = 15"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L7 — Arithmetic overflow. Student sees wrong output, widens the bus.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l7",
      title: "Operators — The Overflow Trap",
      theory: `
<h2>Arithmetic & Overflow</h2>
<p>When you add two N-bit numbers, the result can be <strong>N+1 bits</strong>. If you store it back in an N-bit wire, the carry is silently dropped.</p>

<pre class="code-block">// 4-bit example:
wire [3:0] a = 4'd15;  // 1111
wire [3:0] b = 4'd1;   //    1
wire [3:0] sum = a + b; // 10000 → truncated to 0000 ← BUG

// Fix: make sum one bit wider
wire [4:0] sum = {1'b0,a} + {1'b0,b};  // = 5'b10000 = 16 ✓</pre>

<h3>Width rules</h3>
<ul>
  <li>Addition: result needs <code>N+1</code> bits for carry</li>
  <li>Multiplication: result needs <code>2×N</code> bits</li>
  <li>Always size your output wide enough to hold the result</li>
</ul>

<h3>Your task</h3>
<p>The adder below has an 8-bit output for an addition that can produce 9 bits. Run it — see <code>255+1 = 0</code> (overflow!). Fix both the output port width and the assign statement to capture the carry.</p>
      `,
      tasks: [
        "Run as-is — see that 255+1=0 and 200+100=44 (both wrong)",
        "Change output wire [7:0] sum  to  output wire [8:0] sum",
        "Change assign sum = a + b  to  assign sum = {1'b0,a} + {1'b0,b} — run again"
      ],
      hint: "Two fixes needed:\n1. Port: output wire [8:0] sum\n2. Assign: assign sum = {1'b0, a} + {1'b0, b};\nThe {1'b0, a} zero-extends a from 8 bits to 9 bits before adding.",
      design: `module adder8 (
  input  wire [7:0] a,
  input  wire [7:0] b,
  output wire [7:0] sum   // ← BUG: 8 bits can't hold carry from 8+8
);

  assign sum = a + b;     // ← BUG: result truncated to 8 bits

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [7:0] a, b;
  wire [8:0] sum;   // testbench uses 9-bit wire — your port must match

  adder8 dut (.a(a), .b(b), .sum(sum));

  initial begin
    $display("a      b    | sum  carry");
    $display("-----------+-----------");
    a=8'd100; b=8'd50;  #5; $display("%3d  + %3d  = %4d  carry=%b", a,b,sum[7:0],sum[8]);
    a=8'd200; b=8'd100; #5; $display("%3d  + %3d  = %4d  carry=%b", a,b,sum[7:0],sum[8]);
    a=8'd255; b=8'd1;   #5; $display("%3d  + %3d  = %4d  carry=%b (expect 256)", a,b,sum[7:0],sum[8]);
    a=8'd255; b=8'd255; #5; $display("%3d  + %3d  = %4d  carry=%b (expect 510)", a,b,sum[7:0],sum[8]);
    $finish;
  end
endmodule`,
      expected: ["255  +   1  =    0  carry=1 (expect 256)", "255  + 255  =  254  carry=1 (expect 510)"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L8 — Vectors. Wrong index direction — iverilog throws an error.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l8",
      title: "Vectors — Index Direction Error",
      theory: `
<h2>Vectors & Bit Selection</h2>
<p>Verilog vectors are declared with <code>[MSB:LSB]</code> — most significant bit first. This is the universal convention.</p>

<pre class="code-block">wire [7:0] data;   // bit 7 = MSB, bit 0 = LSB

data[7]      // single bit — MSB
data[7:4]    // upper nibble (4 bits)
data[3:0]    // lower nibble (4 bits)</pre>

<h3>The direction must match</h3>
<pre class="code-block">wire [7:0] data;   // declared high-to-low

data[0:7]   // ← WRONG — selecting low-to-high from a high-to-low signal
            //   iverilog: "select index direction mismatch"

data[7:0]   // ← CORRECT</pre>

<h3>Your task</h3>
<p>The byte extraction below uses wrong index order on some assigns. Run to see the error, then fix each incorrect range.</p>
      `,
      tasks: [
        "Run as-is — find the index direction mismatch errors",
        "Fix byte3: change word[24:31] to word[31:24]",
        "Fix byte0: change word[0:7] to word[7:0] — run again"
      ],
      hint: "Always write ranges as [higher_index : lower_index]. For a [31:0] word:\n  byte3 = word[31:24]\n  byte2 = word[23:16]\n  byte1 = word[15:8]\n  byte0 = word[7:0]",
      design: `module byte_extractor (
  input  wire [31:0] word,
  output wire [7:0]  byte3,
  output wire [7:0]  byte2,
  output wire [7:0]  byte1,
  output wire [7:0]  byte0
);

  assign byte3 = word[24:31];  // ← BUG: direction is backwards
  assign byte2 = word[23:16];  // ← correct
  assign byte1 = word[15:8];   // ← correct
  assign byte0 = word[0:7];    // ← BUG: direction is backwards

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [31:0] word;
  wire [7:0]  byte3, byte2, byte1, byte0;

  byte_extractor dut(.word(word),.byte3(byte3),.byte2(byte2),
                     .byte1(byte1),.byte0(byte0));

  initial begin
    word = 32'hDEAD_BEEF; #10;
    $display("word = 0xDEADBEEF");
    $display("byte3 = 0x%02h  (expect DE)", byte3);
    $display("byte2 = 0x%02h  (expect AD)", byte2);
    $display("byte1 = 0x%02h  (expect BE)", byte1);
    $display("byte0 = 0x%02h  (expect EF)", byte0);

    word = 32'h1234_5678; #10;
    $display("\\nword = 0x12345678");
    $display("byte3=%02h byte2=%02h byte1=%02h byte0=%02h",byte3,byte2,byte1,byte0);
    $finish;
  end
endmodule`,
      expected: ["byte3 = 0xde  (expect DE)", "byte0 = 0xef  (expect EF)", "byte3=12 byte2=34 byte1=56 byte0=78"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L9 — always block. Incomplete sensitivity list causes wrong simulation.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l9",
      title: "always — The Incomplete Sensitivity List",
      theory: `
<h2>The always Block & Sensitivity List</h2>
<p>An <code>always</code> block re-runs whenever a signal in its <strong>sensitivity list</strong> changes.</p>

<pre class="code-block">always @(a)          // only re-runs when a changes — INCOMPLETE
always @(a or b)     // re-runs when a OR b changes
always @(*)          // re-runs when ANY input changes — RECOMMENDED</pre>

<h3>Why @(*) matters</h3>
<p>If you forget a signal in the list, the hardware still works (it's continuous), but the <em>simulation</em> won't update — you see wrong values. This is a classic simulation vs synthesis mismatch.</p>

<pre class="code-block">// BUG: sel changes but always block doesn't re-run
always @(a or b) begin   // sel is missing!
  if (sel) y = a;
  else     y = b;
end

// FIX:
always @(*) begin        // catches everything automatically
  ...
end</pre>

<h3>Your task</h3>
<p>The priority encoder only watches <code>req[0]</code> in its sensitivity list. Run it — higher priority requests appear to be ignored. Fix the sensitivity list.</p>
      `,
      tasks: [
        "Run as-is — notice req=1110 shows grant=0 (wrong, should be 3)",
        "Change always @(req[0]) to always @(*)",
        "Run again — all priority levels should now work correctly"
      ],
      hint: "Replace  always @(req[0])  with  always @(*)  — the asterisk means 'any signal read inside this block'.",
      design: `module priority_enc (
  input  wire [3:0] req,
  output reg  [1:0] grant,
  output reg        valid
);

  always @(req[0]) begin    // ← BUG: only watching req[0] — other bits ignored in sim
    grant = 2'b00;
    valid = 1'b0;
    if      (req[3]) begin grant = 2'd3; valid = 1; end
    else if (req[2]) begin grant = 2'd2; valid = 1; end
    else if (req[1]) begin grant = 2'd1; valid = 1; end
    else if (req[0]) begin grant = 2'd0; valid = 1; end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] req;
  wire [1:0] grant;
  wire       valid;

  priority_enc dut(.req(req),.grant(grant),.valid(valid));

  task check(input [3:0] r, input [1:0] exp_g, input exp_v, input [63:0] label);
    req = r; #5;
    $display("req=%04b -> grant=%0d valid=%b  %s",
      req, grant, valid,
      (grant==exp_g && valid==exp_v) ? "PASS" : "FAIL ← wrong!");
  endtask

  initial begin
    $display("=== Priority Encoder ===");
    check(4'b0000, 2'd0, 0, "no req   ");
    check(4'b0001, 2'd0, 1, "req[0]   ");
    check(4'b0010, 2'd1, 1, "req[1]   ");
    check(4'b0110, 2'd2, 1, "req[2]>1 ");
    check(4'b1010, 2'd3, 1, "req[3]>1 ");
    check(4'b1111, 2'd3, 1, "req[3] wins");
    $finish;
  end
endmodule`,
      expected: ["req=0110 -> grant=2 valid=1  PASS", "req=1111 -> grant=3 valid=1  PASS"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L10 — case statement. Missing default causes latch + x output.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l10",
      title: "case — The Missing Default",
      theory: `
<h2>case Statements & the Default Rule</h2>
<p>A <code>case</code> statement selects between values — like a multi-way <code>if</code>. But there's a trap: if any case is unhandled and the output isn't assigned, Verilog <strong>infers a latch</strong> (the output holds its old value).</p>

<pre class="code-block">always @(*) begin
  case (sel)
    2'b00: y = a;
    2'b01: y = b;
    // 2'b10 and 2'b11 missing → LATCH inferred!
  endcase
end</pre>

<h3>Always include a default</h3>
<pre class="code-block">always @(*) begin
  case (sel)
    2'b00: y = a;
    2'b01: y = b;
    default: y = 0;  // ← catches all unhandled values
  endcase
end</pre>

<h3>Your task</h3>
<p>The ALU below handles only 3 operations but has 4-bit opcodes — values 4–15 are unhandled. Run it — you'll see <code>x</code> for unknown opcodes. Add a <code>default</code> case to output zero for unrecognized ops.</p>
      `,
      tasks: [
        "Run as-is — see 'x' output for opcode=4 and opcode=15",
        "Add a default case: default: result = 8'h00;",
        "Run again — unknown opcodes should now output 0x00"
      ],
      hint: "Inside the case block, after the last named case (2'b10:), add:\n  default: result = 8'h00;",
      design: `module simple_alu (
  input  wire [1:0]  op,      // 00=ADD, 01=SUB, 10=AND
  input  wire [7:0]  a, b,
  output reg  [7:0]  result
);

  always @(*) begin
    case (op)
      2'b00: result = a + b;
      2'b01: result = a - b;
      2'b10: result = a & b;
      // ← BUG: op=11 is unhandled — latch inferred, output = x
    endcase
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [1:0] op;
  reg  [7:0] a, b;
  wire [7:0] result;

  simple_alu dut(.op(op),.a(a),.b(b),.result(result));

  initial begin
    a = 8'd20; b = 8'd12;
    $display("a=20, b=12");
    $display("op | operation | result");
    $display("---+-----------+-------");
    op=2'b00;#5; $display(" %02b |   ADD     |  %4d  (expect 32)", op,result);
    op=2'b01;#5; $display(" %02b |   SUB     |  %4d  (expect 8)",  op,result);
    op=2'b10;#5; $display(" %02b |   AND     |  0x%02h  (expect 0x04)",op,result);
    op=2'b11;#5; $display(" %02b |  unknown  |  0x%02h  (expect 0x00)",op,result);
    $finish;
  end
endmodule`,
      expected: ["ADD     |    32  (expect 32)", "unknown  |  0x00  (expect 0x00)"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L11 — Blocking vs non-blocking. Student sees the swap bug live, fixes it.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l11",
      title: "Blocking vs Non-Blocking — Fix the Swap Bug",
      theory: `
<h2>Blocking ( = ) vs Non-Blocking ( <= )</h2>
<p>Inside <code>always</code> blocks, Verilog has two assignment operators. Choosing wrong causes real silicon bugs.</p>

<table class="truth-table">
  <tr><th></th><th><code>=</code> Blocking</th><th><code><=</code> Non-Blocking</th></tr>
  <tr><td>Executes</td><td>Immediately, in order</td><td>All RHS captured first, then all LHS updated</td></tr>
  <tr><td>Use in</td><td>Combinational always</td><td>Clocked (sequential) always</td></tr>
</table>

<h3>The classic swap bug</h3>
<pre class="code-block">// WRONG — blocking swap in clocked block:
always @(posedge clk) begin
  a = b;    // a gets new b immediately
  b = a;    // b gets the already-changed a → both end up same value!
end

// CORRECT — non-blocking:
always @(posedge clk) begin
  a <= b;   // schedules: a ← old b
  b <= a;   // schedules: b ← old a
end         // both updates fire at end of time step</pre>

<h3>Golden rule</h3>
<p><strong>Clocked always block? Always use <code><=</code></strong></p>

<h3>Your task</h3>
<p>The swap below uses blocking <code>=</code> in a clocked block. Run it — both registers get the same value. Change <code>=</code> to <code><=</code> in the swap block.</p>
      `,
      tasks: [
        "Run as-is — see both A and B become 20 after the swap (wrong)",
        "In the swap always block, change  a = b  to  a <= b",
        "Also change  b = a  to  b <= a — run again to confirm A=20, B=10"
      ],
      hint: "Only change the two lines in the 'SWAP' always block:\n  a <= b;\n  b <= a;\nThe 'LOAD' block already uses <= correctly — don't touch it.",
      design: `module swap_demo (
  input  wire       clk,
  input  wire       load,
  input  wire [7:0] init_a,
  input  wire [7:0] init_b,
  output reg  [7:0] a,
  output reg  [7:0] b
);

  // LOAD: sets initial values (correct — uses <=)
  always @(posedge clk) begin
    if (load) begin
      a <= init_a;
      b <= init_b;
    end
  end

  // SWAP: exchanges a and b — BUG: uses blocking = in clocked block
  always @(posedge clk) begin
    if (!load) begin
      a = b;   // ← BUG: change to <=
      b = a;   // ← BUG: change to <=
    end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        clk=0, load;
  reg  [7:0] init_a, init_b;
  wire [7:0] a, b;

  swap_demo dut(.clk(clk),.load(load),.init_a(init_a),.init_b(init_b),.a(a),.b(b));
  always #5 clk = ~clk;

  initial begin
    init_a=8'd10; init_b=8'd20; load=1;
    @(posedge clk); #1;
    $display("Loaded: A=%0d B=%0d", a, b);

    load=0;
    @(posedge clk); #1;
    $display("After swap: A=%0d B=%0d  (expect A=20 B=10)", a, b);
    if (a==20 && b==10)
      $display("PASS — swap worked correctly!");
    else
      $display("FAIL — swap is broken (blocking = used in clocked block?)");

    @(posedge clk); #1;
    $display("After 2nd swap: A=%0d B=%0d  (expect A=10 B=20)", a, b);
    $finish;
  end
endmodule`,
      expected: ["PASS — swap worked correctly!", "After 2nd swap: A=10 B=20"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L12 — Parameters. Hard-coded widths break when widths change.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l12",
      title: "Parameters — Stop Hard-Coding Widths",
      theory: `
<h2>Parameters</h2>
<p>Hard-coding widths like <code>[7:0]</code> means copying the module every time you need a different width. <strong>Parameters</strong> let one module work at any size.</p>

<pre class="code-block">module adder #(
  parameter WIDTH = 8       // default: 8-bit
)(
  input  wire [WIDTH-1:0] a, b,
  output wire [WIDTH:0]   sum   // one extra bit for carry
);
  assign sum = {1'b0,a} + {1'b0,b};
endmodule</pre>

<h3>Override at instantiation</h3>
<pre class="code-block">adder u1 (.a(x8), .b(y8), .sum(s9));          // uses default WIDTH=8
adder #(.WIDTH(4))  u2 (.a(x4), .b(y4), .sum(s5));  // overrides to 4-bit
adder #(.WIDTH(16)) u3 (.a(x16),.b(y16),.sum(s17)); // 16-bit</pre>

<h3>Your task</h3>
<p>The module below has <code>8</code> written in four places. Replace every <code>8</code> with the parameter <code>WIDTH</code>. When done, the same module will work at 4, 8, and 16 bits.</p>
      `,
      tasks: [
        "Find all four hard-coded 8s in the module: two in port widths, one in the assign",
        "Add  #( parameter WIDTH = 8 )  to the module header",
        "Replace [7:0] with [WIDTH-1:0] and [8:0] with [WIDTH:0] — run to verify all widths pass"
      ],
      hint: "Module header: module adder #(parameter WIDTH = 8)(\nPort a: input wire [WIDTH-1:0] a,\nPort b: input wire [WIDTH-1:0] b,\nPort sum: output wire [WIDTH:0] sum\nAssign: assign sum = {1'b0, a} + {1'b0, b};",
      design: `// This works only for 8-bit. Make it work for ANY width using a parameter.
module adder (           // ← add  #( parameter WIDTH = 8 )  here
  input  wire [7:0] a,  // ← replace 7 with WIDTH-1
  input  wire [7:0] b,  // ← replace 7 with WIDTH-1
  output wire [8:0] sum // ← replace 8 with WIDTH (sum is WIDTH+1 bits wide)
);
  assign sum = {1'b0, a} + {1'b0, b};
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  // 4-bit instance
  reg  [3:0]  a4=0,  b4=0;
  wire [4:0]  s4;
  adder #(.WIDTH(4))  u4 (.a(a4),  .b(b4),  .sum(s4));

  // 8-bit instance
  reg  [7:0]  a8=0,  b8=0;
  wire [8:0]  s8;
  adder #(.WIDTH(8))  u8 (.a(a8),  .b(b8),  .sum(s8));

  // 16-bit instance
  reg  [15:0] a16=0, b16=0;
  wire [16:0] s16;
  adder #(.WIDTH(16)) u16(.a(a16), .b(b16), .sum(s16));

  initial begin
    $display("=== 4-bit ===");
    a4=4'd9;  b4=4'd8;  #5; $display("9+8   = %0d carry=%b (expect 17)", s4[3:0],s4[4]);
    a4=4'd15; b4=4'd15; #5; $display("15+15 = %0d carry=%b (expect 30)", s4[3:0],s4[4]);

    $display("=== 8-bit ===");
    a8=8'd200; b8=8'd100; #5; $display("200+100 = %0d carry=%b (expect 300)", s8[7:0],s8[8]);
    a8=8'd255; b8=8'd1;   #5; $display("255+1   = %0d carry=%b (expect 256)", s8[7:0],s8[8]);

    $display("=== 16-bit ===");
    a16=16'd60000; b16=16'd10000; #5;
    $display("60000+10000 = %0d carry=%b (expect 70000)", s16[15:0],s16[16]);
    $finish;
  end
endmodule`,
      expected: ["9+8   = 1 carry=1", "255+1   = 0 carry=1 (expect 256)", "60000+10000 = 4464 carry=1 (expect 70000)"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L13 — CAPSTONE: Build a 4-bit comparator from a blank skeleton.
    // This is the payoff lesson — student writes everything from scratch.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l13",
      title: "Capstone — Build a 4-bit Comparator",
      theory: `
<h2>Capstone: Build It Yourself</h2>
<p>You've learned modules, ports, wire/reg, assign, operators, vectors, always, case, and parameters. Now put it together.</p>

<h3>Your goal</h3>
<p>Build a <strong>4-bit comparator</strong> — a module that compares two 4-bit numbers <code>a</code> and <code>b</code> and tells you their relationship:</p>

<table class="truth-table">
  <tr><th>Output</th><th>Meaning</th><th>When true</th></tr>
  <tr><td><code>eq</code></td><td>Equal</td><td>a == b</td></tr>
  <tr><td><code>lt</code></td><td>Less than</td><td>a &lt; b</td></tr>
  <tr><td><code>gt</code></td><td>Greater than</td><td>a &gt; b</td></tr>
</table>

<h3>Rules for this lesson</h3>
<ul>
  <li>Use only <code>assign</code> statements (no always needed)</li>
  <li>The operators you need: <code>==</code> &nbsp; <code>&lt;</code> &nbsp; <code>&gt;</code></li>
  <li>Only one of eq/lt/gt can be 1 at any time</li>
</ul>

<h3>Skeleton</h3>
<p>The module below has the ports declared. Fill in the three assign statements. Run the testbench — it checks 6 cases and prints PASS or FAIL for each.</p>
<p>If all 6 pass, you've completed Module 1. You just wrote a real piece of digital hardware.</p>
      `,
      tasks: [
        "Fill in: assign eq = ???  (hint: use == operator)",
        "Fill in: assign lt = ???  (hint: use < operator)",
        "Fill in: assign gt = ???  and run — get all 6 PASS"
      ],
      hint: "Three one-liners:\n  assign eq = (a == b);\n  assign lt = (a < b);\n  assign gt = (a > b);",
      design: `// CAPSTONE: Complete this module — fill in the three assign statements
module comparator4 (
  input  wire [3:0] a,
  input  wire [3:0] b,
  output wire       eq,   // 1 when a == b
  output wire       lt,   // 1 when a  < b
  output wire       gt    // 1 when a  > b
);

  assign eq = ???;   // ← replace ??? with the equality expression
  assign lt = ???;   // ← replace ??? with the less-than expression
  assign gt = ???;   // ← replace ??? with the greater-than expression

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] a, b;
  wire       eq, lt, gt;

  comparator4 dut (.a(a), .b(b), .eq(eq), .lt(lt), .gt(gt));

  task check(
    input [3:0] ta, tb_in,
    input exp_eq, exp_lt, exp_gt
  );
    a = ta; b = tb_in; #5;
    begin
      reg pass;
      pass = (eq==exp_eq && lt==exp_lt && gt==exp_gt);
      $display("a=%0d b=%0d | eq=%b lt=%b gt=%b | %s",
        a, b, eq, lt, gt, pass ? "PASS" : "FAIL ← check your logic");
    end
  endtask

  initial begin
    $display("a  b  | eq lt gt | result");
    $display("------+----------+-------");
    check(4'd5,  4'd5,  1, 0, 0);  // equal
    check(4'd3,  4'd7,  0, 1, 0);  // less than
    check(4'd9,  4'd2,  0, 0, 1);  // greater than
    check(4'd0,  4'd0,  1, 0, 0);  // both zero
    check(4'd15, 4'd14, 0, 0, 1);  // max vs max-1
    check(4'd1,  4'd15, 0, 1, 0);  // min vs max
    $display("\\nModule 1 complete — you built a real comparator!");
    $finish;
  end
endmodule`,
      expected: [
        "a=5 b=5 | eq=1 lt=0 gt=0 | PASS",
        "a=3 b=7 | eq=0 lt=1 gt=0 | PASS",
        "a=9 b=2 | eq=0 lt=0 gt=1 | PASS",
        "Module 1 complete"
      ]
    }

  ]
});
