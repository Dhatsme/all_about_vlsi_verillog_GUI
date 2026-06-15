(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop1',
  title: 'OOP TB Ch.1 — spi_transaction',
  icon: '\u{1F9EC}',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop1l1',
      title: 'L1 — The Transaction Class',
      theory: `
<h2>Before anything else: switch to Verilator</h2>
<p>This course uses SystemVerilog classes, mailboxes, and virtual interfaces.
<strong>iverilog does not support any of these.</strong>
In the top-right corner of the lesson page, open the simulator dropdown and
select <strong>verilator</strong>. Then open <strong>⚙ Options</strong> and set
Timing Mode to <strong>--timing</strong>. Do this before you hit Run on any
lesson in this course.</p>

<h2>Chapter 1: the transaction class</h2>
<p>Every OOP testbench is built around one idea: <strong>wrap one unit of work
into a class</strong>. For an SPI master that unit is one 8-bit byte transfer.
That wrapper is <code>spi_transaction</code>.</p>

<p>This is the <em>only</em> class you write this chapter. No interface, no driver,
no DUT. Just the class. If Verilator rejects this file nothing else will work,
so you catch problems immediately.</p>

<h3>What the class contains</h3>
<table class="truth-table">
  <tr><th>Member</th><th>Type</th><th>What it is</th></tr>
  <tr><td><code>data</code></td><td><code>rand logic [7:0]</code></td><td>The byte to transfer. <code>rand</code> lets Verilator randomize it when you call <code>randomize()</code>.</td></tr>
  <tr><td><code>id</code></td><td><code>int unsigned</code></td><td>This object’s unique serial number. Assigned once in <code>new()</code>.</td></tr>
  <tr><td><code>uid</code></td><td><code>static int</code></td><td>A counter shared by every instance. One copy for the whole class.</td></tr>
</table>

<h3>Syntax you will use</h3>
<pre class="code-block">
class spi_transaction;
  rand  logic [7:0] data;   // 'rand' = Verilator randomizes this
  int unsigned      id;     // per-object field
  static int        uid = 0;// shared counter

  function new();           // constructor
    id = uid++;             // id = current uid, then uid grows
  endfunction

  function string to_str();
    return $sformatf("TXN#%0d  8'h%02h", id, data);
  endfunction
endclass
</pre>

<p>The Testbench tab is pre-filled with two checks: does construction work,
and does <code>randomize()</code> succeed. Write the class in the Design tab,
switch to Verilator + --timing, and hit Run.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,

      tasks: [
        'STEP 0 — Switch the simulator: top-right dropdown → select verilator (not iverilog)',
        'STEP 0 — Open ⚙ Options → set Timing Mode to --timing',
        'Now open the Code tab and type the class in the Design tab.',
        '── Line 1 ──  class spi_transaction;',
        '── Line 2 ──  rand logic [7:0] data;',
        '── Line 3 ──  int unsigned id;',
        '── Line 4 ──  static int uid = 0;',
        '── Line 5 ──  (blank)',
        '── Line 6 ──  function new();',
        '── Line 7 ──    id = uid++;',
        '── Line 8 ──  endfunction',
        '── Line 9 ──  (blank)',
        '── Line 10 ─  function string to_str();',
        '── Line 11 ─    return $sformatf("TXN#%0d  8\'h%02h", id, data);',
        '── Line 12 ─  endfunction',
        '── Line 13 ─  endclass',
        'Hit Run — two PASS lines + "PASS: spi_transaction works" should appear',
      ],

      hint:
`class spi_transaction;
  rand  logic [7:0] data;   // 'rand' = Verilator picks a random value on randomize()
  int unsigned      id;     // this object's serial number (set once in new, never changes)
  static int        uid = 0;// 'static' = ONE copy shared by all objects, used as counter

  function new();
    id = uid++;   // post-increment: id gets current value, then uid grows by 1
  endfunction

  function string to_str();
    return $sformatf("TXN#%0d  8'h%02h", id, data);
    //      %0d = decimal     %02h = hex, min 2 digits
  endfunction

endclass

// If you see 'mailbox doesn't name a type' or 'class doesn't name a type':
//   -> You are using iverilog.  Switch the dropdown to verilator.
//
// If randomize() returns 0:
//   -> Options -> Timing Mode -> --timing  is not set.
`,

      design:
`// Chapter 1 of 9: write the spi_transaction class here.
//
// Members:
//   rand  logic [7:0]  data    — the byte being transferred
//   int unsigned       id      — this object's unique serial number
//   static int         uid     — class-level counter, shared by ALL instances
//
// Methods:
//   new()       — id = uid++
//   to_str()    — return $sformatf("TXN#%0d  8'h%02h", id, data);
//
// Delete this comment and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness. Do not edit this tab.
// IMPORTANT: simulator dropdown must be set to verilator, not iverilog.
// IMPORTANT: Options -> Timing Mode -> --timing
module tb;
  initial begin
    spi_transaction t;

    $display("=== Chapter 1: spi_transaction ===");

    // Test 1: construct an object, first id must be 0
    t = new();
    if (t.id === 0)
      $display("PASS [1] construction ok  id=%0d", t.id);
    else
      $display("FAIL [1] id=%0d (expected 0)", t.id);

    // Test 2: randomize() must succeed and to_str() must work
    if (!t.randomize())
      $fatal(1, "randomize() returned 0 -- set --timing in Options, use Verilator not iverilog");
    $display("PASS [2] randomize ok  %s", t.to_str());

    $display("PASS: spi_transaction works");
    $finish;
  end
endmodule`,

      expected: [
        'PASS [1] construction ok',
        'PASS [2] randomize ok',
        'PASS: spi_transaction works'
      ]
    }
  ]
});
