// Module 1 — Foundations of Digital Design
// 4 guided lessons (observe → ports → assign → vectors) + 1 capstone.
// Pedagogy: L1 is read-only ready code. Each lesson removes one more layer of
// scaffolding. Capstone = blank slate, 22 step-by-step tasks, student types everything.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m1",
  title: "Foundations of Digital Design",
  icon: "⚡",
  level: "beginner",
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — The module keyword. Code is COMPLETE. Student only reads and runs.
    // Goal: understand every line of a working Verilog module before writing any.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l1",
      title: "Topic 1 — The module Keyword",
      theory: `
<h2>What is Verilog?</h2>
<p>Verilog is a <strong>Hardware Description Language (HDL)</strong>. Instead of writing software that runs on a processor, you write Verilog to <em>describe</em> the structure of a digital circuit — gates, wires, flip-flops — that gets turned into real silicon.</p>

<h2>The module — every design starts here</h2>
<p>Every Verilog design is a <strong>module</strong>. Think of it exactly like a chip: it has named <em>input pins</em>, named <em>output pins</em>, and logic connecting them. The structure is always the same:</p>

<pre class="code-block">module  module_name  ( port_list );

    // logic goes here

endmodule</pre>

<table class="truth-table">
  <tr><th>Keyword</th><th>What it does</th></tr>
  <tr><td><code>module</code></td><td>Opens a new design block — like a chip boundary</td></tr>
  <tr><td><code>module_name</code></td><td>The name of your chip/circuit — you choose it</td></tr>
  <tr><td><code>( port_list )</code></td><td>The pins — inputs and outputs listed inside parentheses</td></tr>
  <tr><td><code>;</code></td><td>Terminates the module header — don't forget it</td></tr>
  <tr><td><code>endmodule</code></td><td>Closes the module — every module must have one</td></tr>
</table>

<h2>Ports — the pins of the chip</h2>
<p>Each port has three parts: <strong>direction</strong>, <strong>type</strong>, and <strong>name</strong>.</p>

<pre class="code-block">input  wire a,    // ← direction=input,  type=wire, name=a
input  wire b,    // ← direction=input,  type=wire, name=b
output wire y     // ← direction=output, type=wire, name=y
                  //   note: NO comma after the last port</pre>

<h2>assign — connecting input to output</h2>
<p>The <code>assign</code> statement creates a <em>continuous wire connection</em>. The moment an input changes, the output updates instantly — just like a physical wire through a gate.</p>

<pre class="code-block">assign y = a &amp; b;   // y is always equal to (a AND b)</pre>

<h2>This lesson — read, study, run</h2>
<p>The design tab contains a <strong>complete, working AND gate</strong>. Every line is annotated. Your job this lesson is to <em>read</em> each line, understand what it does, then hit Run and observe the truth table output.</p>
<p>Do not change anything — just study the structure you'll be writing yourself very soon.</p>
      `,
      tasks: [
        "Open the Design tab — read every line including the comments",
        "Find the 'module' keyword on line 1, and the module name 'and_gate'",
        "Find the two input ports (a, b) and the one output port (y)",
        "Notice: output port 'y' has no comma after it — it is the last port",
        "Find '); ' on its own line — this closes the port list",
        "Find the 'assign' statement — this is the AND gate logic",
        "Find 'endmodule' at the bottom — every module must end with it",
        "Hit Run — read the truth table and confirm all four rows are correct"
      ],
      hint: "Nothing to change — this lesson is read-only. Just hit Run and study the output!",
      design: `// ─────────────────────────────────────────────────────
//  COMPLETE WORKING CODE — read every annotated line,
//  then hit Run. You will write code just like this soon.
// ─────────────────────────────────────────────────────

module and_gate (        // 'module' starts the design block
                         // 'and_gate' is the name of this module
  input  wire a,         // input port named 'a'
  input  wire b,         // input port named 'b'
  output wire y          // output port named 'y'  ← NO comma (last port)
);                       // ); closes the port list

  assign y = a & b;     // 'assign' drives output 'y' continuously
                         // 'a & b' means a AND b   (&  is the AND operator)

endmodule                // every module must close with endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b;
  wire y;

  and_gate dut (.a(a), .b(b), .y(y));

  initial begin
    $display("AND gate truth table:");
    $display("a  b | y");
    $display("-----+--");
    a=0; b=0; #10; $display("%0b  %0b | %0b", a, b, y);
    a=0; b=1; #10; $display("%0b  %0b | %0b", a, b, y);
    a=1; b=0; #10; $display("%0b  %0b | %0b", a, b, y);
    a=1; b=1; #10; $display("%0b  %0b | %0b", a, b, y);
    $display("\\nAND gate works!");
    $finish;
  end
endmodule`,
      expected: ["0  0 | 0", "1  1 | 1", "AND gate works!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Declaring ports. Module header and assigns are given.
    // Student types ONLY the port declarations — every character, every comma.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l2",
      title: "Topic 2 — Declaring Ports",
      theory: `
<h2>Ports — the Interface of Your Module</h2>
<p>Ports are the named pins through which a module communicates with the outside world. Every port you declare appears between the <code>(</code> and <code>);</code> of the module header.</p>

<h2>Port declaration syntax</h2>
<p>Each port declaration has exactly three parts:</p>

<pre class="code-block">  direction   type   name ,
  ─────────   ────   ──── ─
  input       wire   a    ,    // comma separates from next port
  output      wire   y         // NO comma — this is the last port</pre>

<h3>Direction</h3>
<table class="truth-table">
  <tr><th>Keyword</th><th>Meaning</th><th>Think of it as…</th></tr>
  <tr><td><code>input</code></td><td>Signal flows <em>into</em> the module</td><td>An input pin on a chip</td></tr>
  <tr><td><code>output</code></td><td>Signal flows <em>out of</em> the module</td><td>An output pin on a chip</td></tr>
</table>

<h3>Type — always wire for now</h3>
<p>Use <code>wire</code> for every port in this lesson. A <code>wire</code> carries a signal continuously — like a physical metal wire. (You will meet <code>reg</code> later when you write clocked logic.)</p>

<h3>Name rules</h3>
<ul>
  <li>Letters, digits, underscores only</li>
  <li>Cannot start with a digit</li>
  <li>Case-sensitive: <code>Sum</code> ≠ <code>sum</code></li>
  <li>Must match exactly what the assign statements use</li>
</ul>

<h3>The comma rule</h3>
<pre class="code-block">module half_adder (
  input  wire a,      // ← comma after a  (more ports follow)
  input  wire b,      // ← comma after b  (more ports follow)
  output wire sum,    // ← comma after sum (more ports follow)
  output wire carry   // ← NO comma — this is the last port
);</pre>

<h2>Your task — half adder port declarations</h2>
<p>A <strong>half adder</strong> adds two 1-bit numbers. It needs two inputs (<code>a</code>, <code>b</code>) and two outputs (<code>sum</code>, <code>carry</code>).</p>
<p>The module header and the logic are already written. You type <strong>only the four port declarations</strong> where the comments tell you to.</p>
      `,
      tasks: [
        "Find '// YOUR PORTS HERE' inside the parentheses — that is where you type",
        "Type the first input:   input  wire a,",
        "Press Enter, then type the second input:   input  wire b,",
        "Press Enter, then type the sum output:   output wire sum,",
        "Press Enter, then type the carry output:   output wire carry",
        "No comma after 'carry' — it is the last port",
        "The ); and the assign statements are already there — do not touch them",
        "Run — if your port names match what the assigns use (a, b, sum, carry) it compiles",
        "Verify: row a=1 b=1 → sum=0 carry=1   (1+1 in binary = 10, so sum=0 with carry=1)"
      ],
      hint: "  input  wire a,\n  input  wire b,\n  output wire sum,\n  output wire carry",
      design: `module half_adder (
  // YOUR PORTS HERE — declare four ports:
  //   input  wire a,
  //   input  wire b,
  //   output wire sum,
  //   output wire carry   ← no comma on the last one


);

  // Logic is provided — focus only on the port declarations above
  assign sum   = a ^ b;   // XOR gives the sum bit
  assign carry = a & b;   // AND gives the carry bit

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b;
  wire sum, carry;

  half_adder dut (.a(a), .b(b), .sum(sum), .carry(carry));

  initial begin
    $display("Half Adder (a + b):");
    $display("a  b | sum  carry");
    $display("-----+----------");
    a=0; b=0; #5; $display("%0b  %0b |  %0b     %0b", a, b, sum, carry);
    a=0; b=1; #5; $display("%0b  %0b |  %0b     %0b", a, b, sum, carry);
    a=1; b=0; #5; $display("%0b  %0b |  %0b     %0b", a, b, sum, carry);
    a=1; b=1; #5; $display("%0b  %0b |  %0b     %0b", a, b, sum, carry);
    $display("\\nPorts declared correctly!");
    $finish;
  end
endmodule`,
      expected: ["0  0 |  0     0", "1  1 |  0     1", "Ports declared correctly!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — The assign statement. Module + ports given. Student writes logic.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l3",
      title: "Topic 3 — The assign Statement",
      theory: `
<h2>assign — Continuous Logic</h2>
<p>The <code>assign</code> statement connects an output to an expression. It is <em>continuous</em>: the output updates <strong>the instant any input changes</strong>, just like a physical wire running through a logic gate. There is no clock, no delay — it is always active.</p>

<pre class="code-block">assign  output_name  =  expression  ;</pre>

<h2>The logic operators</h2>
<table class="truth-table">
  <tr><th>Gate</th><th>Operator</th><th>Example</th><th>a=1, b=0 → result</th></tr>
  <tr><td>AND</td><td><code>&amp;</code></td><td><code>assign y = a &amp; b;</code></td><td>0</td></tr>
  <tr><td>OR</td><td><code>|</code></td><td><code>assign y = a | b;</code></td><td>1</td></tr>
  <tr><td>NOT</td><td><code>~</code></td><td><code>assign y = ~a;</code></td><td>0</td></tr>
  <tr><td>XOR</td><td><code>^</code></td><td><code>assign y = a ^ b;</code></td><td>1</td></tr>
  <tr><td>NAND</td><td><code>~(a &amp; b)</code></td><td><code>assign y = ~(a &amp; b);</code></td><td>1</td></tr>
  <tr><td>NOR</td><td><code>~(a | b)</code></td><td><code>assign y = ~(a | b);</code></td><td>0</td></tr>
  <tr><td>XNOR</td><td><code>~^</code></td><td><code>assign y = a ~^ b;</code></td><td>0</td></tr>
</table>

<h2>One assign per output</h2>
<p>Each output port needs its own <code>assign</code> statement. You cannot drive one output from two assigns — that creates a conflict:</p>

<pre class="code-block">// WRONG — two assigns driving same output
assign y = a &amp; b;
assign y = a | b;    // ← conflict!

// CORRECT — one assign per output
assign out_and = a &amp; b;
assign out_or  = a | b;</pre>

<h2>Combining operators</h2>
<pre class="code-block">// Parentheses work exactly like in math
assign y = (a &amp; b) | (~a &amp; c);   // (a AND b) OR (NOT_a AND c)</pre>

<h2>Your task</h2>
<p>The module and all four output ports are declared for you. Your job is to write the four <code>assign</code> statements that drive those outputs.</p>
      `,
      tasks: [
        "The module declaration and all ports are already written — scroll to '// YOUR CODE HERE'",
        "Write the AND assign: type   assign out_and = a & b;",
        "Note: & is ONE ampersand (AND). Two ampersands && means something else in Verilog",
        "Write the OR assign: type   assign out_or  = a | b;",
        "Note: | is the pipe character — on most keyboards above the Enter or Backslash key",
        "Write the NOT assign: type   assign out_not = ~a;",
        "Note: NOT takes only ONE input. ~ is the tilde key — top-left of most keyboards",
        "Write the XOR assign: type   assign out_xor = a ^ b;",
        "Note: ^ is the caret — above the 6 key. XOR means 'one or the other but not both'",
        "Run — the testbench checks every output against the expected truth table",
        "Verify: a=1 b=1 → AND=1, OR=1, NOT=0, XOR=0"
      ],
      hint: "assign out_and = a & b;\nassign out_or  = a | b;\nassign out_not = ~a;\nassign out_xor = a ^ b;",
      design: `module gate_demo (
  input  wire a,
  input  wire b,
  output wire out_and,
  output wire out_or,
  output wire out_not,
  output wire out_xor
);

  // YOUR CODE HERE — write four assign statements
  //
  // Pattern:   assign  port_name  =  expression ;
  //
  // assign out_and = ??? ;   ← a AND b   (operator: &)
  // assign out_or  = ??? ;   ← a OR  b   (operator: |)
  // assign out_not = ??? ;   ← NOT a     (operator: ~a   only one input!)
  // assign out_xor = ??? ;   ← a XOR b   (operator: ^)

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  a, b;
  wire out_and, out_or, out_not, out_xor;

  gate_demo dut (.a(a), .b(b),
    .out_and(out_and), .out_or(out_or),
    .out_not(out_not), .out_xor(out_xor));

  task check;
    input a_in, b_in;
    input exp_and, exp_or, exp_not, exp_xor;
    begin
      a = a_in; b = b_in; #5;
      $display("a=%0b b=%0b | AND=%0b OR=%0b NOT=%0b XOR=%0b | %s",
        a, b, out_and, out_or, out_not, out_xor,
        (out_and==exp_and && out_or==exp_or &&
         out_not==exp_not && out_xor==exp_xor) ? "PASS" : "FAIL");
    end
  endtask

  initial begin
    $display("Gate Demo — four logic operations:");
    $display("a  b | AND  OR  NOT  XOR");
    $display("-----+-------------------");
    check(0, 0,  0, 0, 1, 0);
    check(0, 1,  0, 1, 1, 1);
    check(1, 0,  0, 1, 0, 1);
    check(1, 1,  1, 1, 0, 0);
    $display("\\nAssign statements done!");
    $finish;
  end
endmodule`,
      expected: ["a=0 b=0 | AND=0 OR=0 NOT=1 XOR=0 | PASS",
                 "a=1 b=1 | AND=1 OR=1 NOT=0 XOR=0 | PASS",
                 "Assign statements done!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — Vectors. Module + ports given. Student writes bit-select / concat.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l4",
      title: "Topic 4 — Vectors (Multi-bit Signals)",
      theory: `
<h2>Vectors — Grouping Bits Under One Name</h2>
<p>A single <code>wire</code> carries one bit. A <strong>vector</strong> groups many bits under one name — essential for buses, data bytes, addresses, and any multi-bit value.</p>

<h2>Declaring a vector</h2>
<pre class="code-block">wire [7:0] data;    // 8-bit vector — bit 7 down to bit 0
//   ─────
//   [MSB : LSB]   MSB = most significant bit (highest index)
//                 LSB = least significant bit  (index 0)</pre>

<p>The convention is always <strong>high index on the left</strong>:</p>
<pre class="code-block">wire [7:0]  byte_val;    //  8 bits:  bits 7,6,5,4,3,2,1,0
wire [15:0] word_val;    // 16 bits:  bits 15 down to 0
wire [3:0]  nibble;      //  4 bits:  bits 3,2,1,0</pre>

<h2>Selecting bits from a vector</h2>
<pre class="code-block">data[7]      // single bit — picks out bit 7 (the MSB)
data[0]      // single bit — picks out bit 0 (the LSB)
data[7:4]    // 4-bit part-select — bits 7,6,5,4   (upper nibble)
data[3:0]    // 4-bit part-select — bits 3,2,1,0   (lower nibble)
data[5:2]    // 4-bit part-select — bits 5,4,3,2</pre>

<h2>Concatenation — joining signals with { }</h2>
<p>The curly braces <code>{ }</code> join multiple signals side by side into a wider vector:</p>
<pre class="code-block">assign out = {high_byte, low_byte};      // two 8-bit → one 16-bit

// Swap nibbles of a byte:
assign swapped = {data[3:0], data[7:4]};
// {lower_nibble, upper_nibble} → lower goes to high position, upper to low</pre>

<h2>Example — 0xAB through a byte unpacker</h2>
<pre class="code-block">// data = 8'hAB = 1010_1011
//               ^^^^─────── bits [7:4] = 0xA (upper nibble)
//                   ^^^^─── bits [3:0] = 0xB (lower nibble)
// bit7       = data[7]      = 1
// upper      = data[7:4]    = 0xA
// lower      = data[3:0]    = 0xB
// swapped    = {data[3:0], data[7:4]}  = 0xBA</pre>

<h2>Your task</h2>
<p>The module has an 8-bit input <code>data</code> and four outputs. All ports are declared. Write the four <code>assign</code> statements using bit-select and concatenation.</p>
      `,
      tasks: [
        "The module and all five ports are already declared — scroll to '// YOUR CODE HERE'",
        "Study the port widths: data is [7:0], upper and lower are [3:0], bit7 is 1-bit, swapped is [7:0]",
        "Extract the upper nibble (bits 7 down to 4): type   assign upper = data[7:4];",
        "Note: [7:4] selects four bits — bit 7, bit 6, bit 5, and bit 4",
        "Extract the lower nibble (bits 3 down to 0): type   assign lower = data[3:0];",
        "Extract just the MSB (single bit): type   assign bit7 = data[7];",
        "Note: data[7] selects only ONE bit — no colon, just a single index",
        "Swap the nibbles using concatenation: type   assign swapped = {data[3:0], data[7:4]};",
        "Note: {X, Y} joins X and Y. Lower nibble written first becomes the HIGH nibble in the result",
        "Run — the testbench uses 0xAB: expect upper=0xa, lower=0xb, bit7=1, swapped=0xba"
      ],
      hint: "assign upper   = data[7:4];\nassign lower   = data[3:0];\nassign bit7    = data[7];\nassign swapped = {data[3:0], data[7:4]};",
      design: `module byte_unpacker (
  input  wire [7:0] data,      // 8-bit input  — bits [7:0]
  output wire [3:0] upper,     // upper nibble — bits [7:4]
  output wire [3:0] lower,     // lower nibble — bits [3:0]
  output wire       bit7,      // single MSB   — bit  [7]
  output wire [7:0] swapped    // nibbles exchanged
);

  // YOUR CODE HERE — write four assign statements
  //
  // assign upper   = ??? ;    ← select bits [7:4]   from data
  // assign lower   = ??? ;    ← select bits [3:0]   from data
  // assign bit7    = ??? ;    ← select single bit [7] from data
  // assign swapped = ??? ;    ← {lower_bits, upper_bits}  — concatenate in reverse order

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [7:0] data;
  wire [3:0] upper, lower;
  wire       bit7;
  wire [7:0] swapped;

  byte_unpacker dut (.data(data), .upper(upper),
                     .lower(lower), .bit7(bit7), .swapped(swapped));

  task check;
    input [7:0] d;
    begin
      data = d; #5;
      $display("data=0x%02h | upper=0x%h lower=0x%h bit7=%b swapped=0x%02h | %s",
        data, upper, lower, bit7, swapped,
        (upper==d[7:4] && lower==d[3:0] && bit7==d[7] && swapped=={d[3:0],d[7:4]})
        ? "PASS" : "FAIL");
    end
  endtask

  initial begin
    $display("Byte Unpacker:");
    check(8'hAB);
    check(8'hF0);
    check(8'h5C);
    check(8'h00);
    check(8'hFF);
    $display("\\nVectors working!");
    $finish;
  end
endmodule`,
      expected: ["data=0xab | upper=0xa lower=0xb bit7=1 swapped=0xba | PASS",
                 "data=0xf0 | upper=0xf lower=0x0 bit7=1 swapped=0x0f | PASS",
                 "Vectors working!"]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L5 — CAPSTONE: Build a 4-bit Mini ALU from scratch.
    // Student types EVERY line: module keyword, all ports, all assigns, endmodule.
    // 22 step-by-step tasks. Hint reveals the complete solution.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "m1l5",
      title: "Capstone — Build a 4-bit Mini ALU",
      theory: `
<h2>Capstone: You Write Everything</h2>
<p>You've learned four foundational concepts:</p>
<ol>
  <li><strong>The module keyword</strong> — how to open and close a module</li>
  <li><strong>Declaring ports</strong> — how to define inputs and outputs</li>
  <li><strong>assign statements</strong> — how to write continuous logic</li>
  <li><strong>Vectors</strong> — how to work with multi-bit signals</li>
</ol>
<p>Now you put them all together — with <em>no scaffolding</em>. You type every line.</p>

<h2>What you're building: a Mini ALU</h2>
<p>An <strong>ALU (Arithmetic Logic Unit)</strong> is the heart of every processor — it performs arithmetic and logical operations on data. You will build a simple 4-bit version.</p>
<p>Your ALU takes two 4-bit inputs (<code>a</code> and <code>b</code>) and produces seven outputs simultaneously:</p>

<table class="truth-table">
  <tr><th>Output</th><th>Width</th><th>Operation</th><th>Example (a=5=0101, b=3=0011)</th></tr>
  <tr><td><code>result_and</code></td><td>4-bit</td><td>a AND b</td><td>0001 = 1</td></tr>
  <tr><td><code>result_or</code></td><td>4-bit</td><td>a OR b</td><td>0111 = 7</td></tr>
  <tr><td><code>result_xor</code></td><td>4-bit</td><td>a XOR b</td><td>0110 = 6</td></tr>
  <tr><td><code>result_not</code></td><td>4-bit</td><td>NOT a</td><td>1010 = 0xA</td></tr>
  <tr><td><code>hi_a</code></td><td>2-bit</td><td>a[3:2] — high 2 bits</td><td>01 = 1</td></tr>
  <tr><td><code>lo_a</code></td><td>2-bit</td><td>a[1:0] — low 2 bits</td><td>01 = 1</td></tr>
  <tr><td><code>combined</code></td><td>8-bit</td><td>{a, b} — concatenated</td><td>01010011 = 0x53</td></tr>
</table>

<h2>Complete syntax reference</h2>
<pre class="code-block">// Module header
module  name  (
  input  wire [N-1:0]  port_name,   // N-bit input
  output wire [N-1:0]  port_name    // N-bit output (last — no comma)
);

// Logic
  assign port_name = expression;

endmodule</pre>

<h2>Follow the tasks — one line at a time</h2>
<p>The design tab is blank. The tasks walk you through every single line. If you get stuck, use the hint — it shows the complete solution.</p>
      `,
      tasks: [
        "The design tab is blank — you write everything from line 1",
        "Type the module keyword and name:   module mini_alu (",
        "Press Enter — you are now inside the port list",
        "Declare 4-bit input a:   input wire [3:0] a,",
        "Declare 4-bit input b:   input wire [3:0] b,",
        "Declare AND result output:   output wire [3:0] result_and,",
        "Declare OR result output:   output wire [3:0] result_or,",
        "Declare XOR result output:   output wire [3:0] result_xor,",
        "Declare NOT result output:   output wire [3:0] result_not,",
        "Declare 2-bit high-bits output:   output wire [1:0] hi_a,",
        "Declare 2-bit low-bits output:   output wire [1:0] lo_a,",
        "Declare 8-bit combined output:   output wire [7:0] combined",
        "No comma after 'combined' — it is the last port",
        "Close the port list:   );",
        "Add a blank line — good style",
        "Write AND operation:   assign result_and = a & b;",
        "Write OR operation:    assign result_or  = a | b;",
        "Write XOR operation:   assign result_xor = a ^ b;",
        "Write NOT operation:   assign result_not = ~a;",
        "Extract high 2 bits of a:   assign hi_a = a[3:2];",
        "Extract low 2 bits of a:    assign lo_a = a[1:0];",
        "Concatenate a and b:         assign combined = {a, b};",
        "Close the module:   endmodule",
        "Hit Run — if all rows show PASS you just built a real ALU!"
      ],
      hint: `module mini_alu (
  input  wire [3:0] a,
  input  wire [3:0] b,
  output wire [3:0] result_and,
  output wire [3:0] result_or,
  output wire [3:0] result_xor,
  output wire [3:0] result_not,
  output wire [1:0] hi_a,
  output wire [1:0] lo_a,
  output wire [7:0] combined
);

  assign result_and = a & b;
  assign result_or  = a | b;
  assign result_xor = a ^ b;
  assign result_not = ~a;
  assign hi_a       = a[3:2];
  assign lo_a       = a[1:0];
  assign combined   = {a, b};

endmodule`,
      design: `// CAPSTONE — Build the mini_alu module from scratch.
// Follow the tasks in the left panel one step at a time.
//
// Port spec (copy this as your guide):
//   Inputs:
//     [3:0] a          4-bit input A
//     [3:0] b          4-bit input B
//
//   Outputs:
//     [3:0] result_and    a AND b
//     [3:0] result_or     a OR  b
//     [3:0] result_xor    a XOR b
//     [3:0] result_not    NOT a
//     [1:0] hi_a          a[3:2]  high 2 bits of a
//     [1:0] lo_a          a[1:0]  low  2 bits of a
//     [7:0] combined      {a, b}  a concatenated with b
//
// Start typing below this comment block ↓`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [3:0] a, b;
  wire [3:0] result_and, result_or, result_xor, result_not;
  wire [1:0] hi_a, lo_a;
  wire [7:0] combined;

  mini_alu dut (
    .a(a), .b(b),
    .result_and(result_and), .result_or(result_or),
    .result_xor(result_xor), .result_not(result_not),
    .hi_a(hi_a), .lo_a(lo_a),
    .combined(combined)
  );

  task check;
    input [3:0] ta, tb_v;
    begin
      a = ta; b = tb_v; #5;
      $display("a=%0h b=%0h | AND=%0h OR=%0h XOR=%0h NOT=%0h | hi=%0h lo=%0h comb=%02h | %s",
        a, b, result_and, result_or, result_xor, result_not, hi_a, lo_a, combined,
        (result_and==(ta&tb_v) && result_or==(ta|tb_v) && result_xor==(ta^tb_v) &&
         result_not==(~ta & 4'hF) && hi_a==ta[3:2] && lo_a==ta[1:0] &&
         combined=={ta,tb_v}) ? "PASS" : "FAIL");
    end
  endtask

  initial begin
    $display("=== Mini ALU Test ===");
    check(4'h5, 4'h3);    // a=0101  b=0011
    check(4'hC, 4'hA);    // a=1100  b=1010
    check(4'h0, 4'hF);    // a=0000  b=1111
    check(4'hF, 4'hF);    // a=1111  b=1111
    check(4'h9, 4'h6);    // a=1001  b=0110
    $display("\\nCapstone complete — you built a real ALU!");
    $finish;
  end
endmodule`,
      expected: [
        "a=5 b=3 | AND=1 OR=7 XOR=6 NOT=a | hi=1 lo=1 comb=53 | PASS",
        "a=c b=a | AND=8 OR=e XOR=6 NOT=3 | hi=3 lo=0 comb=ca | PASS",
        "Capstone complete"
      ]
    }

  ]
});
