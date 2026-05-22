// Module msv3 — Arithmetic Circuits
// Core: 5 lessons. Bonus: 2 practice lessons.
// Verilator 5.020 safe: assign, always_comb, logic buses
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv3',
  title: 'Arithmetic Circuits',
  icon: '➕',
  level: 'beginner',
  lessons: [

    // ── L1 Half Adder ─────────────────────────────────────────────────────────
    {
      id: 'msv3l1',
      title: 'L1 — Half Adder',
      theory: `
<h2>Your First Arithmetic Circuit: the Half Adder</h2>
<p>So far every circuit had one output. An adder needs two: <code>sum</code> (the result bit) and <code>cout</code> (the carry into the next column). The carry is exactly what happens when you add 1+1 on paper — the column overflows and you write a 1 above the next column.</p>

<h2>Binary Addition Rules</h2>
<pre class="code-block">  0 + 0 = 0   carry=0    (no overflow)
  0 + 1 = 1   carry=0
  1 + 0 = 1   carry=0
  1 + 1 = 10  carry=1    (decimal: 1+1=2, write 0 carry 1)</pre>

<p>The <em>sum bit</em> (right digit) follows XOR. The <em>carry</em> (left digit) follows AND.</p>

<h2>XOR — The New Operator</h2>
<p>XOR is 1 when inputs are <em>different</em>. It is the "odd parity" gate — output is 1 when an odd number of inputs are 1:</p>
<table class="truth-table">
  <tr><th>a</th><th>b</th><th>a ^ b (XOR)</th><th>a &amp; b (AND)</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>0</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>0</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>1 ← carry!</td></tr>
</table>

<h2>The assign Statement</h2>
<p>For combinational logic, <code>assign</code> is a cleaner alternative to <code>always_comb</code>. It creates a continuous connection — the right side is re-evaluated any time its inputs change:</p>
<pre class="code-block">assign sum  = a ^ b;   // XOR: sum bit
assign cout = a &amp; b;   // AND: carry bit</pre>

<h2>Multiple Outputs in One Module</h2>
<p>A module can have as many <code>output logic</code> ports as needed. Every port gets a comma <em>except the last one</em>. Here we have two outputs:</p>
<pre class="code-block">  output logic sum,    // ← comma: not the last port
  output logic cout    // ← NO comma: this IS the last port</pre>

<h2>Half Adder Truth Table</h2>
<table class="truth-table">
  <tr><th>a</th><th>b</th><th>sum = a^b</th><th>cout = a&amp;b</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0+0=0, no carry</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>0</td><td>0+1=1, no carry</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1+0=1, no carry</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>1</td><td>1+1=10 in binary — sum=0, carry=1</td></tr>
</table>

<h2>Why "Half" Adder?</h2>
<p>It's called "half" because it can only add two bits — it has no carry input. To add multi-bit numbers, each column also needs to accept the carry from the previous column. That requires a <strong>full adder</strong> (next lesson) which adds three bits: a + b + cin.</p>

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

    // ── L2 Full Adder ────────────────────────────────────────────────────────
    {
      id: 'msv3l2',
      title: 'L2 — Full Adder',
      theory: `
<h2>Full Adder: Adding Three Bits</h2>
<p>A half adder can only add two bits. When you chain adders into a multi-bit adder, each stage must also accept the carry from the previous stage. That third input is called <strong>carry-in</strong> (<code>cin</code>), and the circuit that handles it is the <strong>full adder</strong>.</p>

<h2>Why Three Inputs?</h2>
<p>Imagine adding two 4-bit numbers in binary, column by column from right to left:</p>
<pre class="code-block">     1 1 0 1    (13)
   + 0 1 1 1    ( 7)
   ──────────
 carries: 1 1 1 0
   = 1 0 1 0 0  (20)

Column 0: 1+1       = 10  → sum=0 carry=1   (half adder works here)
Column 1: 0+1+1     = 10  → sum=0 carry=1   (FULL adder: cin from col 0)
Column 2: 1+1+1     = 11  → sum=1 carry=1   (FULL adder: cin from col 1)
Column 3: 1+0+1     = 10  → sum=0 carry=1   (FULL adder: cin from col 2)</pre>

<p>Every column except the rightmost needs to add 3 bits: a, b, and the carry-in from the previous column.</p>

<h2>The Formula</h2>
<p>Sum is XOR of all three inputs (XOR is the "odd parity" function — 1 when an odd number of inputs are 1). Carry-out is the majority function — 1 when at least 2 of the 3 inputs are 1.</p>

<pre class="code-block">assign sum  = a ^ b ^ cin;
assign cout = (a &amp; b) | (cin &amp; (a ^ b));
//           ↑ both a,b=1  OR  cin=1 and exactly one of a/b=1</pre>

<h2>Full Adder Truth Table (all 8 combinations)</h2>
<table class="truth-table">
  <tr><th>a</th><th>b</th><th>cin</th><th>sum</th><th>cout</th><th>Decimal</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0+0+0=0</td></tr>
  <tr><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>0+0+1=1</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>1</td><td>0</td><td>0+1+0=1</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0+1+1=2 → 10</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td><td>1+0+0=1</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td><td>1+0+1=2 → 10</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td><td>1+1+0=2 → 10</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1+1+1=3 → 11</td></tr>
</table>

<p>You will reuse this module in L3 (Ripple Carry Adder). Keep the module name exactly <code>full_adder</code>.</p>

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

    // ── L3 Ripple Carry Adder ─────────────────────────────────────────────────
    {
      id: 'msv3l3',
      title: 'L3 — 4-bit Ripple Carry Adder',
      theory: `
<h2>4-bit Ripple Carry Adder: Your First Multi-Module Design</h2>
<p>A 4-bit adder is four full adders wired in a chain. The carry-out of stage 0 feeds the carry-in of stage 1, and so on — the carry <em>ripples</em> from the least-significant bit to the most-significant bit.</p>

<h2>The Carry Chain</h2>
<pre class="code-block">cin → [fa0] → carry[0] → [fa1] → carry[1] → [fa2] → carry[2] → [fa3] → cout
       a[0]b[0]            a[1]b[1]            a[2]b[2]            a[3]b[3]
       sum[0]              sum[1]              sum[2]              sum[3]</pre>

<h2>Module Instantiation</h2>
<p>In SystemVerilog you can use a module you already defined as a building block. Name the type, give the instance a unique name, then connect ports by name with a dot:</p>

<pre class="code-block">full_adder fa0 (    // type: full_adder   instance name: fa0
  .a(a[0]),         // .port_name(connected_signal)
  .b(b[0]),
  .cin(cin),
  .sum(sum[0]),
  .cout(carry[0])   // internal carry to next stage
);</pre>

<h2>Internal Signals</h2>
<p>The carry wires between stages are internal to <code>ripple_adder</code>. Declare them as <code>logic</code> (Verilator 5 does not allow <code>wire</code> for internal connections).</p>

<pre class="code-block">logic [2:0] carry;  // 3 internal carries connecting 4 stages</pre>

<h2>Why Ripple Carry is Slow</h2>
<p>Each carry must propagate through the previous stage before the next stage can compute. For a 32-bit ripple adder, carry must propagate through 32 full adders in series. This is why real CPUs use <strong>carry-lookahead adders</strong> or <strong>prefix adders</strong> that compute all carries in parallel — but the ripple carry adder teaches the fundamental concept.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Type <code>full_adder</code> first, then <code>ripple_adder</code>. Stuck? Tap 💡 Show Hint.</p>
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

    // ── L4 Subtractor ───────────────────────────────────────────────────────────
    {
      id: 'msv3l4',
      title: 'L4 — 2s Complement Subtractor',
      theory: `
<h2>Subtraction Using 2s Complement</h2>
<p>There is no subtract gate in hardware. Instead, <code>a - b</code> is computed as <code>a + (-b)</code>, where <code>-b</code> in binary is the <strong>2s complement</strong> of b: flip every bit (<code>~b</code>), then add 1.</p>

<h2>The Identity</h2>
<pre class="code-block">a - b  =  a + (~b) + 1</pre>
<p><code>~b</code> is the bitwise NOT — every 0 becomes 1 and vice versa. Adding 1 completes the 2s complement negation. This is exactly why the borrow/carry flag works the way it does.</p>

<h2>Why 2s Complement?</h2>
<p>Because the same hardware (an adder) can add and subtract. The ALU in every CPU — ARM, RISC-V, x86 — uses this trick. A subtractor is just an adder with the second input inverted and carry-in=1. No separate subtract hardware is needed.</p>

<h2>The Borrow Flag</h2>
<p>A borrow occurs when <code>a &lt; b</code> and the result wraps around. In a 4-bit system, 3−5 wraps to 14. The borrow flag tells you the wrap happened.</p>
<p>In hardware: when the 5-bit addition does carry out, no borrow occurred. When it does <em>not</em> carry out, borrow=1. So <code>borrow = ~carry_out</code>.</p>

<pre class="code-block">Manual trace (4-bit):
  5-3:  00101 + 01100 + 00001 = 10010   carry=1  diff=2   borrow=0  OK
  7-7:  00111 + 01000 + 00001 = 10000   carry=1  diff=0   borrow=0  OK
  3-5:  00011 + 01010 + 00001 = 01110   carry=0  diff=14  borrow=1  OK (underflow)</pre>

<p>The borrow direction surprises most people the first time — that is completely normal.</p>

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
  When a <  b: carry_out=0 -> borrow=1`,
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

    // ── L5 Portfolio: 8-bit ALU ───────────────────────────────────────────────
    {
      id: 'msv3l5',
      title: 'L5 — Portfolio: 8-bit ALU',
      theory: `
<h2>Portfolio Project: 8-bit ALU</h2>
<p>This is a real interview question at hardware companies. An <strong>Arithmetic Logic Unit (ALU)</strong> is the computational core of every CPU — it performs arithmetic and logic operations selected by an opcode. Building one from scratch is a rite of passage in digital design.</p>

<h3>Your ALU Specification</h3>
<table class="truth-table">
  <tr><th>op[1:0]</th><th>Operation</th><th>result</th></tr>
  <tr><td>2'b00</td><td>ADD</td><td>a + b</td></tr>
  <tr><td>2'b01</td><td>SUB</td><td>a &minus; b (2s complement)</td></tr>
  <tr><td>2'b10</td><td>AND</td><td>a &amp; b (bitwise)</td></tr>
  <tr><td>2'b11</td><td>OR</td><td>a | b (bitwise)</td></tr>
</table>

<h3>Status Flags</h3>
<ul>
  <li><code>zero</code>: 1 when result === 8'h00. Every real ALU has this — it enables branch-if-equal instructions.</li>
  <li><code>overflow</code>: 1 when signed addition or subtraction overflows (positive+positive=negative, or vice versa).</li>
</ul>

<h3>Implementation Approach</h3>
<p>Use <code>always_comb</code> with <code>unique case(op)</code> to select the operation. Assign <code>zero</code> and <code>overflow</code> as separate expressions outside the case block.</p>

<h3>Why This Matters</h3>
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
    Other ops: overflow = 1'b0;`,
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
    },

    // ── L6 [Bonus]: 4-bit Multiplier ─────────────────────────────────────────────
    {
      id: 'msv3l6',
      title: 'L6 — [Bonus] 4-bit Multiplier',
      theory: `
<h2>Binary Multiplication — Shift and Add</h2>
<p>Multiplication in binary works exactly like long multiplication on paper — except each partial product is either 0 or the multiplicand (because each bit is either 0 or 1).</p>

<pre class="code-block">Example: 5 × 3  (0101 × 0011)

     0101   (5)
  ×  0011   (3)
  ────────
     0101   ← partial product: bit0=1, so 0101 × 1 = 0101
    0101·   ← partial product: bit1=1, so 0101 × 1 = 0101, shifted left by 1
   0000··   ← partial product: bit2=0, so 0000
  0000···   ← partial product: bit3=0, so 0000
  ────────
  00001111   = 15   (5 × 3 = 15 ✓)</pre>

<h2>4-bit × 4-bit = 8-bit Result</h2>
<p>When you multiply two N-bit numbers, the result can be up to 2N bits wide. 4-bit × 4-bit can produce values up to 15×15=225, which needs 8 bits. In SystemVerilog, the <code>*</code> operator handles this automatically if you size the output correctly.</p>

<pre class="code-block">logic [3:0] a, b;
logic [7:0] product;

assign product = a * b;
// Synthesis tool generates a Wallace tree multiplier or array multiplier
// Width rule: if a is N bits and b is M bits, product needs N+M bits</pre>

<h2>What the Synthesizer Does</h2>
<p>When you write <code>a * b</code>, the synthesis tool generates an optimized multiplier circuit. Common implementations:</p>
<table class="truth-table">
  <tr><th>Type</th><th>Speed</th><th>Area</th><th>Use</th></tr>
  <tr><td>Array multiplier</td><td>Slow (N gate delays)</td><td>Medium</td><td>Simple FPGAs</td></tr>
  <tr><td>Wallace tree</td><td>Fast (log N delays)</td><td>Larger</td><td>High-speed CPUs</td></tr>
  <tr><td>Booth encoded</td><td>Fastest</td><td>Largest</td><td>Modern ARM/Intel</td></tr>
  <tr><td>DSP block</td><td>Single cycle</td><td>None (dedicated HW)</td><td>FPGAs (Xilinx/Intel)</td></tr>
</table>

<h2>Manual Partial Products (Understanding the Hardware)</h2>
<p>To understand what the synthesizer builds, here is the same multiplication written explicitly with partial products:</p>
<pre class="code-block">logic [7:0] pp0, pp1, pp2, pp3;
assign pp0 = b[0] ? {4'b0, a}        : 8'b0;  // a × b[0] × 2^0
assign pp1 = b[1] ? {3'b0, a, 1'b0}  : 8'b0;  // a × b[1] × 2^1  (shift left 1)
assign pp2 = b[2] ? {2'b0, a, 2'b0}  : 8'b0;  // a × b[2] × 2^2  (shift left 2)
assign pp3 = b[3] ? {1'b0, a, 3'b0}  : 8'b0;  // a × b[3] × 2^3  (shift left 3)
assign product = pp0 + pp1 + pp2 + pp3;</pre>
<p>Both implementations give identical results. The synthesis tool generates whichever is faster for your target.</p>

<p><strong>Ready?</strong> Switch to Code. Write both versions: the simple <code>a * b</code> first to get PASS, then try the partial products version as extra credit. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Module multiplier4: inputs a[3:0], b[3:0] — output product[7:0]',
        'The simplest correct implementation: assign product = a * b;',
        'That is a complete, synthesisable 4-bit multiplier!',
        'Extra credit: also try the partial products version from Theory (uses 4 assign lines + addition)',
        'Both should produce identical results on all test cases',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear',
      ],
      hint:
`// Simple version (uses * operator):
module multiplier4 (
  input  logic [3:0] a, b,
  output logic [7:0] product
);
  assign product = a * b;  // synthesis generates a Wallace tree or array multiplier
endmodule

// Manual partial products version (shows what the hardware actually does):
// module multiplier4 (
//   input  logic [3:0] a, b,
//   output logic [7:0] product
// );
//   logic [7:0] pp0, pp1, pp2, pp3;
//   assign pp0 = b[0] ? {4'b0, a}       : 8'b0;  // bit 0: no shift
//   assign pp1 = b[1] ? {3'b0, a, 1'b0} : 8'b0;  // bit 1: shift left 1
//   assign pp2 = b[2] ? {2'b0, a, 2'b0} : 8'b0;  // bit 2: shift left 2
//   assign pp3 = b[3] ? {1'b0, a, 3'b0} : 8'b0;  // bit 3: shift left 3
//   assign product = pp0 + pp1 + pp2 + pp3;
// endmodule`,
      design:
`// Type the multiplier4 module here.
// Read Theory first — it explains binary multiplication and partial products.
//
// Ports:
//   input  logic [3:0] a     — first 4-bit factor
//   input  logic [3:0] b     — second 4-bit factor
//   output logic [7:0] product — 8-bit result (needs 8 bits: max 15×15=225)
//
// Simple: assign product = a * b;
// Manual: use 4 partial product assigns + addition (see Hint)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [3:0] a, b;
  logic [7:0] product;
  multiplier4 dut(.a(a), .b(b), .product(product));

  initial begin
    $display("=== 4-bit Multiplier Test ===");

    a = 4'd5; b = 4'd3; #5;
    if (product === 8'd15)
      $display("PASS  5 x 3 = %0d", product);
    else
      $display("FAIL  5 x 3: got %0d (expected 15)", product);

    a = 4'd0; b = 4'd7; #5;
    if (product === 8'd0)
      $display("PASS  0 x 7 = %0d", product);
    else
      $display("FAIL  0 x 7: got %0d (expected 0)", product);

    a = 4'd15; b = 4'd15; #5;
    if (product === 8'd225)
      $display("PASS  15 x 15 = %0d", product);
    else
      $display("FAIL  15 x 15: got %0d (expected 225)", product);

    a = 4'd7; b = 4'd8; #5;
    if (product === 8'd56)
      $display("PASS  7 x 8 = %0d", product);
    else
      $display("FAIL  7 x 8: got %0d (expected 56)", product);

    a = 4'd1; b = 4'd1; #5;
    if (product === 8'd1)
      $display("PASS  1 x 1 = %0d", product);
    else
      $display("FAIL  1 x 1: got %0d (expected 1)", product);

    $display("Multiplier works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  5 x 3 = 15',
        'PASS  15 x 15 = 225',
        'Multiplier works!'
      ]
    },

    // ── L7 [Bonus]: Magnitude Comparator ──────────────────────────────────────
    {
      id: 'msv3l7',
      title: 'L7 — [Bonus] Magnitude Comparator',
      theory: `
<h2>The Magnitude Comparator</h2>
<p>A <strong>magnitude comparator</strong> compares two numbers and tells you which is larger. It produces three flags: <code>eq</code> (equal), <code>lt</code> (less than), <code>gt</code> (greater than). Exactly one of these is 1 at any time.</p>

<h2>Where Comparators Are Used</h2>
<ul>
  <li><strong>CPU branch instructions</strong>: BEQ, BNE, BLT, BGE in RISC-V — all use a comparator to decide whether to take a branch</li>
  <li><strong>Priority encoders</strong>: select the highest-priority request among several</li>
  <li><strong>Sorting networks</strong>: hardware sorting uses chains of compare-and-swap cells</li>
  <li><strong>Timer comparators</strong>: fire when a counter reaches a threshold (PWM duty cycle)</li>
</ul>

<h2>SystemVerilog Comparison Operators</h2>
<table class="truth-table">
  <tr><th>Operator</th><th>Meaning</th><th>Result type</th></tr>
  <tr><td><code>a == b</code></td><td>Equal (logical)</td><td>1-bit: 1 if equal</td></tr>
  <tr><td><code>a != b</code></td><td>Not equal</td><td>1-bit: 1 if not equal</td></tr>
  <tr><td><code>a &lt; b</code></td><td>Less than (unsigned)</td><td>1-bit: 1 if a &lt; b</td></tr>
  <tr><td><code>a &gt; b</td><td>Greater than (unsigned)</td><td>1-bit: 1 if a &gt; b</td></tr>
  <tr><td><code>a &lt;= b</code></td><td>Less than or equal</td><td>1-bit</td></tr>
  <tr><td><code>a &gt;= b</code></td><td>Greater than or equal</td><td>1-bit</td></tr>
  <tr><td><code>a === b</code></td><td>Case equality (sim only)</td><td>1-bit: includes X/Z comparison</td></tr>
</table>

<p>In hardware (synthesis), <code>==</code> generates an XNOR tree (compare each bit pair). <code>&lt;</code> generates a subtractor and checks the borrow flag. The synthesis tool optimises automatically.</p>

<h2>Mutual Exclusion</h2>
<p>Exactly one flag is 1 at any time. This constraint can be useful — in a priority arbiter, you can OR the flags directly into a one-hot select signal:</p>
<pre class="code-block">assign eq = (a == b);   // 1 when a equals b
assign lt = (a &lt;  b);   // 1 when a is less than b
assign gt = (a &gt;  b);   // 1 when a is greater than b
// Always: eq + lt + gt = 1  (exactly one is true)</pre>

<h2>Signed vs Unsigned Comparison</h2>
<p>By default, SystemVerilog treats <code>logic</code> buses as <strong>unsigned</strong>. For signed comparison, cast to <code>signed</code>:</p>
<pre class="code-block">// Unsigned (default): 4'b1111 = 15, which is greater than 4'b0001 = 1
assign gt_unsigned = (a > b);

// Signed: 4'b1111 = -1 (two's complement), which is less than 4'b0001 = +1
assign gt_signed = ($signed(a) > $signed(b));</pre>

<p>In this lesson you build an unsigned comparator. The RISC-V ISA has both: SLTU (unsigned) and SLT (signed) compare instructions.</p>

<p><strong>Ready?</strong> This is the most concise module you have ever written — three <code>assign</code> lines. Switch to Code. Stuck? Tap 💡 Show Hint.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Module comparator4: inputs a[3:0], b[3:0] — outputs eq, lt, gt',
        'assign eq = (a == b);  ← 1 when equal',
        'assign lt = (a  < b);  ← 1 when a is less than b (unsigned)',
        'assign gt = (a  > b);  ← 1 when a is greater than b (unsigned)',
        'Close with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear',
        'Bonus: try $signed(a) > $signed(b) for signed comparison — try a=4\'hF, b=4\'h1 and observe the difference',
      ],
      hint:
`module comparator4 (
  input  logic [3:0] a, b,    // 4-bit unsigned inputs
  output logic       eq,      // 1 when a == b
  output logic       lt,      // 1 when a  < b  (unsigned)
  output logic       gt       // 1 when a  > b  (unsigned)
);

  assign eq = (a == b);
  assign lt = (a <  b);
  assign gt = (a >  b);
  // Exactly one of eq/lt/gt is 1 at any time

endmodule

// Bonus: signed comparator uses $signed() cast:
// assign lt_signed = ($signed(a) < $signed(b));
// assign gt_signed = ($signed(a) > $signed(b));`,
      design:
`// Type the comparator4 module here.
// Read Theory first — it explains comparison operators and signed vs unsigned.
//
// Ports:
//   input  logic [3:0] a, b   — 4-bit values to compare
//   output logic       eq     — 1 when a == b
//   output logic       lt     — 1 when a <  b (unsigned)
//   output logic       gt     — 1 when a >  b (unsigned)
//
// Three assign lines. That is the entire module.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic [3:0] a, b;
  logic eq, lt, gt;
  comparator4 dut(.a(a), .b(b), .eq(eq), .lt(lt), .gt(gt));

  task automatic check(input logic [3:0] av, bv,
                       input logic exp_eq, exp_lt, exp_gt);
    a = av; b = bv; #5;
    if (eq===exp_eq && lt===exp_lt && gt===exp_gt)
      $display("PASS  a=%0d b=%0d -> eq=%0b lt=%0b gt=%0b", av, bv, eq, lt, gt);
    else
      $display("FAIL  a=%0d b=%0d: eq=%0b lt=%0b gt=%0b (expected eq=%0b lt=%0b gt=%0b)",
               av, bv, eq, lt, gt, exp_eq, exp_lt, exp_gt);
  endtask

  initial begin
    $display("=== Magnitude Comparator Test ===");
    check(4'd5,  4'd5,  1, 0, 0);  // equal
    check(4'd3,  4'd7,  0, 1, 0);  // less than
    check(4'd9,  4'd4,  0, 0, 1);  // greater than
    check(4'd0,  4'd15, 0, 1, 0);  // min < max
    check(4'd15, 4'd0,  0, 0, 1);  // max > min
    check(4'd0,  4'd0,  1, 0, 0);  // zero == zero
    // Verify exactly one flag set at a time
    a = 4'd7; b = 4'd3; #5;
    if ((eq + lt + gt) === 3'd1)
      $display("PASS  Exactly one flag set: eq=%0b lt=%0b gt=%0b", eq, lt, gt);
    else
      $display("FAIL  Multiple flags set simultaneously!");
    $display("Comparator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  a=5 b=5 -> eq=1 lt=0 gt=0',
        'PASS  a=3 b=7 -> eq=0 lt=1 gt=0',
        'PASS  Exactly one flag set',
        'Comparator works!'
      ]
    }

  ]
});
