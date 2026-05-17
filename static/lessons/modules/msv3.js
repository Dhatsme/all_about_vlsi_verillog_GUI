(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv3',
  title: 'Arithmetic Circuits',
  icon: '➕',
  level: 'beginner',
  lessons: [

    // ── L1 Half Adder (Tier 2) ────────────────────────────────────────────
    {
      id: 'msv3l1',
      title: 'L1 — Half Adder',
      theory: `
<h2>Your First Arithmetic Circuit: the Half Adder</h2>
<p>So far every circuit had one output. An adder needs two: <code>sum</code> (the result bit) and <code>cout</code> (the carry into the next column). The carry is exactly what happens when you add 1+1 on paper — the column overflows and you write a 1 above the next column.</p>

<h3>XOR — the new operator</h3>
<p>Addition without carry is XOR. In binary, 1+1=10 — the sum bit is 0 and carry is 1. The XOR operator <code>^</code> gives you just the sum bit. AND gives you the carry.</p>

<pre class="code-block">assign sum  = a ^ b;   // 0^0=0  0^1=1  1^0=1  1^1=0
assign cout = a &amp; b;   // carry only when BOTH inputs are 1</pre>

<h3>Multiple outputs in one module</h3>
<p>A module can have as many <code>output logic</code> ports as needed. All ports appear in the port list separated by commas — the last port has no trailing comma.</p>

<table class="truth-table">
  <tr><th>a</th><th>b</th><th>sum</th><th>cout</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>1</td></tr>
</table>

<h3>You will build</h3>
<p>Module <code>half_adder</code>: two inputs <code>a</code> and <code>b</code>, two outputs <code>sum</code> and <code>cout</code>. Two <code>assign</code> statements — one per output.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module half_adder (   ← keyword + name + open paren',
        '── Line 2 ──  input logic a,   ← comma after first input',
        '── Line 3 ──  input logic b,   ← comma after second input',
        '── Line 4 ──  output logic sum,   ← comma — not the last port',
        '── Line 5 ──  output logic cout   ← NO comma — last port',
        '── Line 6 ──  );   ← close the port list',
        '── Line 7 ──  blank line',
        '── Line 8 ──  assign sum = ... using the ^ XOR operator',
        '── Line 9 ──  assign cout = ... using the & AND operator',
        '── Line 10 ── blank line then endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module half_adder (
  input  logic a,      // 1-bit input A
  input  logic b,      // 1-bit input B
  output logic sum,    // sum = a XOR b  (single-column result)
  output logic cout    // carry-out = a AND b  (no trailing comma)
);

  assign sum  = a ^ b;   // ^ is XOR: 1+1 overflows to 0, carry goes out
  assign cout = a & b;   // carry only when both inputs are 1

endmodule`,
      design:
`// Type the half_adder module here.
// Read Theory first — it explains XOR and multiple outputs.
//
// Ports:
//   input  logic a     — first 1-bit input
//   input  logic b     — second 1-bit input
//   output logic sum   — a XOR b (the sum bit)
//   output logic cout  — a AND b (carry-out)
//
// Formula:
//   sum  = a ^ b
//   cout = a & b
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic a, b, sum, cout;
  half_adder dut(.a(a), .b(b), .sum(sum), .cout(cout));

  initial begin
    $display("=== Half Adder Test ===");

    a = 0; b = 0; #5;
    if (sum === 1'b0 && cout === 1'b0)
      $display("PASS  a=0 b=0 -> sum=0 cout=0");
    else
      $display("FAIL  a=0 b=0: got sum=%0b cout=%0b", sum, cout);

    a = 0; b = 1; #5;
    if (sum === 1'b1 && cout === 1'b0)
      $display("PASS  a=0 b=1 -> sum=1 cout=0");
    else
      $display("FAIL  a=0 b=1: got sum=%0b cout=%0b", sum, cout);

    a = 1; b = 0; #5;
    if (sum === 1'b1 && cout === 1'b0)
      $display("PASS  a=1 b=0 -> sum=1 cout=0");
    else
      $display("FAIL  a=1 b=0: got sum=%0b cout=%0b", sum, cout);

    a = 1; b = 1; #5;
    if (sum === 1'b0 && cout === 1'b1)
      $display("PASS  a=1 b=1 -> sum=0 cout=1");
    else
      $display("FAIL  a=1 b=1: got sum=%0b cout=%0b", sum, cout);

    $display("Half adder works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  a=1 b=1 -> sum=0 cout=1',
        'Half adder works!'
      ]
    },

    // ── L2 Full Adder (Tier 3) ────────────────────────────────────────────
    {
      id: 'msv3l2',
      title: 'L2 — Full Adder',
      theory: `
<h2>Full Adder: Adding Three Bits</h2>
<p>A half adder can only add two bits. When you chain adders into a multi-bit adder, each stage must also accept the carry from the previous stage. That third input is called <strong>carry-in</strong> (<code>cin</code>), and the circuit that handles it is the <strong>full adder</strong>.</p>

<h3>The formula</h3>
<p>Sum is XOR of all three inputs. Carry-out is 1 whenever at least two of the three inputs are 1.</p>

<pre class="code-block">assign sum  = a ^ b ^ cin;
assign cout = (a &amp; b) | (cin &amp; (a ^ b));</pre>

<p>Read the carry-out formula aloud: "carry if (A and B are both 1) OR (cin is 1 and exactly one of A/B is 1)." This is the <em>majority-of-three</em> function.</p>

<table class="truth-table">
  <tr><th>a</th><th>b</th><th>cin</th><th>sum</th><th>cout</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr>
</table>

<h3>You will build</h3>
<p>Module <code>full_adder</code>: inputs <code>a, b, cin</code> and outputs <code>sum, cout</code>. The testbench checks all 8 input combinations. You will reuse this module in L3.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Write the module header: full_adder with three inputs (a, b, cin) and two outputs (sum, cout)',
        'Write the assign for sum: XOR of all three inputs using ^ twice',
        'Write the assign for cout: carry when any two of the three inputs are 1',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 8 PASS lines should appear in the Output tab',
      ],
      hint:
`module full_adder (
  input  logic a, b, cin,   // three 1-bit inputs
  output logic sum, cout     // sum bit and carry-out
);

  assign sum  = a ^ b ^ cin;               // XOR all three
  assign cout = (a & b) | (cin & (a ^ b)); // majority-of-three

endmodule`,
      design:
`// Type the full_adder module here. See Theory for the formula.
//
// Ports: a, b, cin (inputs)   sum, cout (outputs)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic a, b, cin, sum, cout;
  full_adder dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

  initial begin
    $display("=== Full Adder Test ===");

    a=0; b=0; cin=0; #5;
    if (sum===1'b0 && cout===1'b0) $display("PASS  a=0 b=0 cin=0 -> sum=0 cout=0");
    else $display("FAIL  a=0 b=0 cin=0: got sum=%0b cout=%0b", sum, cout);

    a=0; b=0; cin=1; #5;
    if (sum===1'b1 && cout===1'b0) $display("PASS  a=0 b=0 cin=1 -> sum=1 cout=0");
    else $display("FAIL  a=0 b=0 cin=1: got sum=%0b cout=%0b", sum, cout);

    a=0; b=1; cin=0; #5;
    if (sum===1'b1 && cout===1'b0) $display("PASS  a=0 b=1 cin=0 -> sum=1 cout=0");
    else $display("FAIL  a=0 b=1 cin=0: got sum=%0b cout=%0b", sum, cout);

    a=0; b=1; cin=1; #5;
    if (sum===1'b0 && cout===1'b1) $display("PASS  a=0 b=1 cin=1 -> sum=0 cout=1");
    else $display("FAIL  a=0 b=1 cin=1: got sum=%0b cout=%0b", sum, cout);

    a=1; b=0; cin=0; #5;
    if (sum===1'b1 && cout===1'b0) $display("PASS  a=1 b=0 cin=0 -> sum=1 cout=0");
    else $display("FAIL  a=1 b=0 cin=0: got sum=%0b cout=%0b", sum, cout);

    a=1; b=0; cin=1; #5;
    if (sum===1'b0 && cout===1'b1) $display("PASS  a=1 b=0 cin=1 -> sum=0 cout=1");
    else $display("FAIL  a=1 b=0 cin=1: got sum=%0b cout=%0b", sum, cout);

    a=1; b=1; cin=0; #5;
    if (sum===1'b0 && cout===1'b1) $display("PASS  a=1 b=1 cin=0 -> sum=0 cout=1");
    else $display("FAIL  a=1 b=1 cin=0: got sum=%0b cout=%0b", sum, cout);

    a=1; b=1; cin=1; #5;
    if (sum===1'b1 && cout===1'b1) $display("PASS  a=1 b=1 cin=1 -> sum=1 cout=1");
    else $display("FAIL  a=1 b=1 cin=1: got sum=%0b cout=%0b", sum, cout);

    $display("Full adder works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  a=1 b=1 cin=1 -> sum=1 cout=1',
        'Full adder works!'
      ]
    },

    // ── L3 Ripple Carry Adder (Tier 3) ───────────────────────────────────
    {
      id: 'msv3l3',
      title: 'L3 — 4-bit Ripple Carry Adder',
      theory: `
<h2>4-bit Ripple Carry Adder: Your First Multi-Module Design</h2>
<p>A 4-bit adder is four full adders wired in a chain. The carry-out of stage 0 feeds the carry-in of stage 1, and so on — the carry <em>ripples</em> from the least-significant bit to the most-significant bit.</p>

<h3>Module instantiation</h3>
<p>In SystemVerilog you can use a module you already defined as a building block inside a new module. Name the sub-module type, then the instance name, then connect ports by name with a dot:</p>

<pre class="code-block">full_adder fa0 (    // type: full_adder   instance: fa0
  .a(a[0]),         // .port_name(connected_signal)
  .b(b[0]),
  .cin(cin),
  .sum(sum[0]),
  .cout(carry[0])   // internal carry to next stage
);</pre>

<h3>Internal signals use <code>logic</code></h3>
<p>The carry wires between stages are internal to <code>ripple_adder</code>. Declare them as <code>logic</code> — Verilator 5 does not allow <code>wire</code>.</p>

<pre class="code-block">logic [2:0] carry;  // 3 carries connecting 4 stages</pre>

<h3>The carry chain</h3>
<pre class="code-block">cin -&gt; [fa0] -&gt; carry[0] -&gt; [fa1] -&gt; carry[1] -&gt; [fa2] -&gt; carry[2] -&gt; [fa3] -&gt; cout</pre>

<h3>You will build</h3>
<p>Two modules in one file: <code>full_adder</code> (same as L2 — type it again from memory) and <code>ripple_adder</code> (instantiates four of them). Ports of <code>ripple_adder</code>: <code>a[3:0], b[3:0], cin, sum[3:0], cout</code>.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'First: type the full_adder module from L2 (you need it as a sub-module)',
        'Then: write the ripple_adder module header — ports: a[3:0], b[3:0], cin (inputs), sum[3:0], cout (outputs)',
        'Declare: logic [2:0] carry  — the 3 intermediate carries between 4 stages',
        'Instantiate fa0: connect a[0], b[0], cin  →  sum[0], carry[0]',
        'Instantiate fa1: connect a[1], b[1], carry[0]  →  sum[1], carry[1]',
        'Instantiate fa2: connect a[2], b[2], carry[1]  →  sum[2], carry[2]',
        'Instantiate fa3: connect a[3], b[3], carry[2]  →  sum[3], cout',
        'Close ripple_adder with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module full_adder (
  input  logic a, b, cin,
  output logic sum, cout
);
  assign sum  = a ^ b ^ cin;
  assign cout = (a & b) | (cin & (a ^ b));
endmodule

module ripple_adder (
  input  logic [3:0] a, b,
  input  logic       cin,
  output logic [3:0] sum,
  output logic       cout
);
  logic [2:0] carry;

  full_adder fa0 (.a(a[0]), .b(b[0]), .cin(cin),      .sum(sum[0]), .cout(carry[0]));
  full_adder fa1 (.a(a[1]), .b(b[1]), .cin(carry[0]), .sum(sum[1]), .cout(carry[1]));
  full_adder fa2 (.a(a[2]), .b(b[2]), .cin(carry[1]), .sum(sum[2]), .cout(carry[2]));
  full_adder fa3 (.a(a[3]), .b(b[3]), .cin(carry[2]), .sum(sum[3]), .cout(cout));

endmodule`,
      design:
`// Type BOTH modules here: full_adder first, then ripple_adder.
// See Theory for the carry chain connection diagram.
//
// ripple_adder ports:
//   input  logic [3:0] a, b
//   input  logic       cin
//   output logic [3:0] sum
//   output logic       cout
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [3:0] a, b, sum;
  logic cin, cout;
  ripple_adder dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));

  initial begin
    $display("=== 4-bit Ripple Adder Test ===");

    a = 4'd0; b = 4'd0; cin = 1'b0; #5;
    if (sum === 4'd0 && cout === 1'b0)
      $display("PASS  0 + 0 = 0 cout=0");
    else
      $display("FAIL  0 + 0: got sum=%0d cout=%0b", sum, cout);

    a = 4'd5; b = 4'd3; cin = 1'b0; #5;
    if (sum === 4'd8 && cout === 1'b0)
      $display("PASS  5 + 3 = 8 cout=0");
    else
      $display("FAIL  5 + 3: got sum=%0d cout=%0b", sum, cout);

    a = 4'd15; b = 4'd1; cin = 1'b0; #5;
    if (sum === 4'd0 && cout === 1'b1)
      $display("PASS  15 + 1 = 0 cout=1 (overflow)");
    else
      $display("FAIL  15 + 1: got sum=%0d cout=%0b", sum, cout);

    $display("Ripple adder works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  5 + 3 = 8 cout=0',
        'Ripple adder works!'
      ]
    },

    // ── L4 Subtractor (Tier 4) ────────────────────────────────────────────
    {
      id: 'msv3l4',
      title: 'L4 — 2s Complement Subtractor',
      theory: `
<h2>Subtraction Using 2s Complement</h2>
<p>There is no subtract gate in hardware. Instead, <code>a - b</code> is computed as <code>a + (-b)</code>, where <code>-b</code> in binary is the <strong>2s complement</strong> of b: flip every bit, then add 1.</p>

<h3>The identity</h3>
<pre class="code-block">a - b  =  a + (~b) + 1</pre>
<p><code>~b</code> is the bitwise NOT — every 0 becomes 1 and vice versa. Adding 1 completes the 2s complement negation.</p>

<h3>Borrow flag</h3>
<p>A borrow occurs when <code>a &lt; b</code> and the result wraps around. In a 4-bit system, 3&minus;5 wraps to 14. The borrow flag tells you the wrap happened.</p>
<p>In hardware: when the 5-bit addition carries out, no borrow occurred. When it does not carry out, borrow=1. So <code>borrow = ~carry_out</code>.</p>

<h3>Visualise: the number circle</h3>
<pre class="code-block">       0
   15     1
 14         2
13           3
12           4
 11         5
   10     6
      9 8 7</pre>
<p>Going backwards past 0 (e.g. 3&minus;5) lands on 14. The borrow flag tells you the subtraction crossed zero.</p>

<h3>You will build</h3>
<p>Module <code>subtractor</code>: inputs <code>a[3:0], b[3:0]</code>, outputs <code>diff[3:0], borrow</code>. The borrow direction surprises most people the first time — that is completely normal.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'The module must compute diff = a - b for 4-bit unsigned inputs',
        'Use the 2s complement identity: a - b = a + (~b) + 1',
        'Use a 5-bit intermediate logic signal to capture the full result including carry',
        'borrow = 1 when a < b  —  this is the inverse of the carry-out from the 5-bit addition',
        'Manually verify: 5-3=2 borrow=0,  7-7=0 borrow=0,  3-5 borrow=1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 3 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for subtractor:

  The 2s complement trick:
    a - b  =  a + (~b) + 1
    ~b flips every bit of the 4-bit bus b

  Use a 5-bit intermediate to capture the carry:
    {1'b0, a} + {1'b0, ~b} + 5'b00001  ->  5-bit result

  From the 5-bit result:
    bits [3:0]  =  diff
    bit  [4]    =  carry_out
    borrow      =  ~carry_out  (carry inverted)

  When a >= b: carry_out=1 -> borrow=0
  When a <  b: carry_out=0 -> borrow=1

  Manual trace:
    5-3:  00101+01100+00001=10010  carry=1 diff=2  borrow=0 OK
    7-7:  00111+01000+00001=10000  carry=1 diff=0  borrow=0 OK
    3-5:  00011+01010+00001=01110  carry=0 diff=14 borrow=1 OK`,
      design:
`// Build the subtractor module here. See Theory for the full spec.
//
// Ports: a[3:0], b[3:0] (inputs)   diff[3:0], borrow (outputs)
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [3:0] a, b, diff;
  logic borrow;
  subtractor dut(.a(a), .b(b), .diff(diff), .borrow(borrow));

  initial begin
    $display("=== Subtractor Test ===");

    a = 4'd5; b = 4'd3; #5;
    if (diff === 4'd2 && borrow === 1'b0)
      $display("PASS  5 - 3 = 2 borrow=0");
    else
      $display("FAIL  5 - 3: got diff=%0d borrow=%0b", diff, borrow);

    a = 4'd7; b = 4'd7; #5;
    if (diff === 4'd0 && borrow === 1'b0)
      $display("PASS  7 - 7 = 0 borrow=0");
    else
      $display("FAIL  7 - 7: got diff=%0d borrow=%0b", diff, borrow);

    a = 4'd3; b = 4'd5; #5;
    if (borrow === 1'b1)
      $display("PASS  3 - 5: borrow=1 (underflow)");
    else
      $display("FAIL  3 - 5: expected borrow=1, got %0b", borrow);

    $display("Subtractor works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  5 - 3 = 2 borrow=0',
        'Subtractor works!'
      ]
    },

    // ── L5 Portfolio: 8-bit ALU (Tier 5) ─────────────────────────────────
    {
      id: 'msv3l5',
      title: 'L5 — Portfolio: 8-bit ALU',
      theory: `
<h2>Portfolio Project: 8-bit ALU</h2>
<p>This is a real interview question at hardware companies. An <strong>Arithmetic Logic Unit (ALU)</strong> is the computational core of every CPU — it performs arithmetic and logic operations selected by an opcode. Building one from scratch is a rite of passage in digital design.</p>

<h3>Your ALU specification</h3>
<table class="truth-table">
  <tr><th>op[1:0]</th><th>Operation</th><th>result</th></tr>
  <tr><td>2'b00</td><td>ADD</td><td>a + b</td></tr>
  <tr><td>2'b01</td><td>SUB</td><td>a &minus; b (2s complement)</td></tr>
  <tr><td>2'b10</td><td>AND</td><td>a &amp; b (bitwise)</td></tr>
  <tr><td>2'b11</td><td>OR</td><td>a | b (bitwise)</td></tr>
</table>

<h3>Status flags</h3>
<ul>
  <li><code>zero</code>: 1 when result === 8'h00. Every real ALU has this — it enables branch-if-equal instructions.</li>
  <li><code>overflow</code>: 1 when signed addition or subtraction overflows (positive+positive=negative, or vice versa).</li>
</ul>

<h3>Implementation approach</h3>
<p>Use <code>always_comb</code> with <code>unique case(op)</code> to select the operation. Assign <code>zero</code> and <code>overflow</code> as separate expressions outside the case block.</p>

<h3>Why this matters</h3>
<p>The ALU you build here is structurally identical to what you would find in an ARM Cortex-M0 or a RISC-V core. In msv7 you will wire it into a full CPU pipeline — keep this module.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for detailed design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Module alu: inputs a[7:0], b[7:0], op[1:0]  —  outputs result[7:0], zero, overflow',
        'op=00 ADD (a+b),  op=01 SUB (a-b),  op=10 AND (a&b),  op=11 OR (a|b)',
        'Use always_comb with unique case(op) for operation select',
        'Assign the zero flag: result is all zeros',
        'Assign the overflow flag: signed overflow on ADD or SUB',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 4 PASS lines should appear in the Output tab',
        '🎓 Portfolio piece — push this ALU to your GitHub when complete',
        'In msv4 you will build Finite State Machines — circuits that remember which state they are in',
      ],
      hint:
`DESIGN NOTES for alu (8-bit, 4 operations):

  Ports:
    input  logic [7:0] a, b
    input  logic [1:0] op
    output logic [7:0] result
    output logic       zero, overflow

  Operation select — use always_comb + unique case(op):
    2'b00  ADD:  result = a + b;
    2'b01  SUB:  result = a + (~b) + 8'b00000001;
    2'b10  AND:  result = a & b;
    2'b11  OR:   result = a | b;
    default:     result = 8'b0;

  Zero flag (after the case block, still inside always_comb):
    zero = (result == 8'h00) ? 1'b1 : 1'b0;

  Overflow flag (signed, ADD and SUB only):
    ADD overflow: both operands same sign, result opposite
      (a[7] == b[7]) && (result[7] != a[7])
    SUB overflow: operands opposite sign, result same sign as b
      (a[7] != b[7]) && (result[7] == b[7])
    Other ops: overflow = 1'b0;

  Test cases to verify mentally:
    ADD  10+20     = 30       zero=0 overflow=0
    SUB  20-10     = 10       zero=0 overflow=0
    AND  F0 & 0F   = 00       zero=1
    OR   F0 | 0F   = FF       zero=0`,
      design:
`// Build the alu module here. See Theory for the full specification.
//
// This is a portfolio project — push it to your GitHub when complete.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [7:0] a, b, result;
  logic [1:0] op;
  logic zero, overflow;
  alu dut(.a(a), .b(b), .op(op), .result(result), .zero(zero), .overflow(overflow));

  initial begin
    $display("=== 8-bit ALU Test ===");

    a = 8'd10; b = 8'd20; op = 2'b00; #5;
    if (result === 8'd30 && zero === 1'b0)
      $display("PASS  ADD: 10 + 20 = %0d", result);
    else
      $display("FAIL  ADD: got %0d zero=%0b", result, zero);

    a = 8'd20; b = 8'd10; op = 2'b01; #5;
    if (result === 8'd10)
      $display("PASS  SUB: 20 - 10 = %0d", result);
    else
      $display("FAIL  SUB: got %0d", result);

    a = 8'hF0; b = 8'h0F; op = 2'b10; #5;
    if (result === 8'h00 && zero === 1'b1)
      $display("PASS  AND: 0xF0 & 0x0F = 0x00 zero=1");
    else
      $display("FAIL  AND: got 0x%h zero=%0b", result, zero);

    a = 8'hF0; b = 8'h0F; op = 2'b11; #5;
    if (result === 8'hFF)
      $display("PASS  OR: 0xF0 | 0x0F = 0xFF");
    else
      $display("FAIL  OR: got 0x%h", result);

    $display("ALU works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  ADD: 10 + 20 = 30',
        'ALU works!'
      ]
    }

  ]
});
