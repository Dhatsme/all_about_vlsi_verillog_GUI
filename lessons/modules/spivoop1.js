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
<h2>Start here: the transaction class</h2>
<p>Every OOP testbench is built on a single idea: <strong>wrap one unit of
work into a class</strong>. For an SPI master, one unit of work is
<em>one 8-bit byte transfer</em>. That wrapper is <code>spi_transaction</code>.</p>

<p>This is the first class you write — before the interface, before the driver,
before the DUT is even connected. It has <strong>no dependencies at all</strong>.
If Verilator rejects this file, nothing else will work either, so you find out
immediately.</p>

<h3>What the class holds</h3>
<table class="truth-table">
  <tr><th>Member</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>data</code></td><td><code>rand logic [7:0]</code></td><td>The byte to transfer. <code>rand</code> lets Verilator pick a value when you call <code>randomize()</code>.</td></tr>
  <tr><td><code>id</code></td><td><code>int unsigned</code></td><td>This object’s unique serial number. Assigned in the constructor.</td></tr>
  <tr><td><code>uid</code></td><td><code>static int</code></td><td>A class-level counter shared across <em>every</em> instance. Each <code>new()</code> reads it then increments it.</td></tr>
</table>

<h3>What <code>static</code> means</h3>
<p>A normal member lives inside one object. A <code>static</code> member lives
in the class itself — one copy, shared by all objects.</p>
<pre class="code-block">
class counter_demo;
  static int total = 0;  // shared across all objects
  int        my_id;      // unique per object
  function new();
    my_id = total;       // read the shared counter
    total++;             // then increment it
  endfunction
endclass
// After:  a = new(); b = new(); c = new();
//   a.my_id = 0,  b.my_id = 1,  c.my_id = 2
//   counter_demo::total = 3
</pre>

<h3>What <code>rand</code> + <code>randomize()</code> does</h3>
<pre class="code-block">
class packet;
  rand logic [7:0] data;   // marked for randomization
endclass

initial begin
  packet p = new();
  // data is still 0 here
  void'(p.randomize());    // Verilator assigns a random value
  $display("%h", p.data);  // prints something like 3f, a2, 7c ...
end
</pre>

<h3>The class you will write</h3>
<pre class="code-block">
class spi_transaction;
  rand  logic [7:0] data;
  int unsigned      id;
  static int        uid = 0;

  function new();          // constructor
    id = uid++;            // post-increment: id = uid, then uid+1
  endfunction

  function string to_str();
    return $sformatf("TXN#%0d  data=8'h%02h", id, data);
  endfunction
endclass
</pre>

<p>The testbench tab is pre-filled. It creates 7 transaction objects,
calls <code>randomize()</code>, and checks that IDs are sequential and
<code>uid</code> counts correctly. <strong>Your job: write the class in
the Design tab.</strong></p>

<p><strong>Ready?</strong> Switch to the Code tab and type the class.
Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  class spi_transaction;   ← opens the class',
        '── Line 2 ──  rand logic [7:0] data;   ← the byte field, marked randomizable',
        '── Line 3 ──  int unsigned id;         ← this object’s unique serial number',
        '── Line 4 ──  static int uid = 0;      ← class-level counter, shared by ALL objects',
        '── Line 5 ──  (blank line)',
        '── Line 6 ──  function new();          ← constructor — runs when you write: t = new()',
        '── Line 7 ──    id = uid++;            ← grab current uid, assign to id, then increment uid',
        '── Line 8 ──  endfunction',
        '── Line 9 ──  (blank line)',
        '── Line 10 ─  function string to_str();',
        '── Line 11 ─    return $sformatf("TXN#%0d  data=8’h%02h", id, data);',
        '── Line 12 ─  endfunction',
        '── Line 13 ─  endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — 4 PASS lines + "PASS: spi_transaction works" should appear in the Output tab',
      ],

      hint:
`// Complete annotated solution
// =====================================================

class spi_transaction;

  rand  logic [7:0] data;   // 'rand' = Verilator randomizes this on randomize()
                             //          without rand, data stays 0 forever
  int unsigned      id;     // this object's serial number (set in new(), never changes)
  static int        uid = 0;// 'static' = ONE copy for the whole class, not per-object
                             //            used as a counter: 0, 1, 2, 3 ...

  function new();            // constructor — called by:  t = new();
    id = uid++;              // post-increment:
                             //   1) id   = uid    (grab current value)
                             //   2) uid  = uid+1  (then increment)
                             // so first object gets id=0, second id=1, etc.
  endfunction

  function string to_str();  // convenience method for $display calls
    return $sformatf(        // like sprintf — builds a formatted string
      "TXN#%0d  data=8'h%02h",
      //  %0d = decimal with no leading spaces
      //  %02h = hex, minimum 2 digits (00, 0a, ff)
      id, data
    );
  endfunction

endclass

// ===== WHY we start here ===========================
// spi_transaction is the atom of the OOP testbench.
// Every other component (driver, monitor, scoreboard)
// handles spi_transaction objects. By testing this
// class alone first, we confirm that Verilator supports:
//   class, rand, static, $sformatf, randomize()
// before touching a single DUT signal.
`,

      design:
`// ======================================================
// Chapter 1 of 9: spi_transaction
// ======================================================
// Write the spi_transaction class below.
// The testbench tab already has the test harness.
//
// Members:
//   rand  logic [7:0]  data    one SPI byte, Verilator can randomize it
//   int unsigned       id      this object's unique serial number
//   static int         uid     class-level counter shared by ALL instances
//
// Methods:
//   function new()
//     id = uid++;              // grab current count, then increment
//   endfunction
//
//   function string to_str()
//     return $sformatf("TXN#%0d  data=8'h%02h", id, data);
//   endfunction
//
// Delete these comments and type the class:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness for Chapter 1.
// DO NOT EDIT THIS TAB.
// Write your spi_transaction class in the Design tab.
module tb;
  initial begin
    spi_transaction t;
    $display("=== Chapter 1: spi_transaction ===");

    // Test A: first object has id=0, data=0
    t = new();
    $display("[A] %s", t.to_str());
    if (t.id === 0 && t.data === 8'h00)
      $display("PASS [A] first id=0  data=0x00");
    else
      $display("FAIL [A] id=%0d data=%02h (expected id=0 data=0)", t.id, t.data);

    // Test B: randomize() assigns a value without error
    t = new();
    if (!t.randomize()) $fatal(1, "randomize() returned 0 - Verilator rand not working");
    $display("[B] randomized: %s", t.to_str());
    $display("PASS [B] randomize() succeeded");

    // Test C: uid counter increments correctly (5 objects so far)
    repeat (3) begin
      t = new();
      if (!t.randomize()) $fatal(1, "randomize() failed");
      $display("[C] %s", t.to_str());
    end
    if (spi_transaction::uid === 5)
      $display("PASS [C] uid=%0d after 5 objects", spi_transaction::uid);
    else
      $display("FAIL [C] uid=%0d (expected 5)", spi_transaction::uid);

    // Test D: two new objects get consecutive ids
    begin
      spi_transaction a = new();
      spi_transaction b = new();
      if (b.id === a.id + 1)
        $display("PASS [D] sequential ids: a=%0d  b=%0d", a.id, b.id);
      else
        $display("FAIL [D] ids not sequential: a=%0d  b=%0d", a.id, b.id);
    end

    $display("PASS: spi_transaction works");
    $finish;
  end
endmodule`,

      expected: [
        'PASS [A] first id=0',
        'PASS [B] randomize() succeeded',
        'PASS [C] uid=',
        'PASS: spi_transaction works'
      ]
    }
  ]
});
