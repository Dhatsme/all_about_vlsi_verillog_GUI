(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop1',
  title: 'OOP TB Ch.1 — spi_transaction',
  icon: '\u{1F9EC}',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop1l1',
      title: 'L1 — The Transaction Class',
      verilatorFlags: { simulator: 'verilator', timing: '--no-timing' },
      theory: `
<h2>Chapter 1: the transaction class</h2>
<p>Every OOP testbench wraps one unit of work into a class. For SPI that unit
is one 8-bit byte transfer. That wrapper is <code>spi_transaction</code>.</p>
<p>This course uses SystemVerilog classes, mailboxes, and virtual interfaces.
<strong>iverilog does not support any of these.</strong>
Verilator is auto-selected for this chapter — no setup needed.</p>
<p>This is the only class you write this chapter — no interface, no driver, no DUT.
If Verilator rejects this file nothing else will work, so you find out immediately.</p>

<h3>What the class contains</h3>
<table class="truth-table">
  <tr><th>Member</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>data</code></td><td><code>rand logic [7:0]</code></td><td>The byte to transfer. <code>rand</code> lets Verilator randomize it.</td></tr>
  <tr><td><code>id</code></td><td><code>int unsigned</code></td><td>This object's unique serial number, assigned in <code>new()</code>.</td></tr>
  <tr><td><code>uid</code></td><td><code>static int</code></td><td>Counter shared by every instance. One copy for the whole class.</td></tr>
</table>

<h3>Key pattern</h3>
<pre class="code-block">
class spi_transaction;
  rand  logic [7:0] data;
  int unsigned      id;
  static int        uid = 0;

  function new();
    id = uid++;       // post-increment: id = current uid, then uid grows
  endfunction

  function string to_str();
    return $sformatf("TXN#%0d  8'h%02h", id, data);
  endfunction
endclass
</pre>

<p><strong>Ready?</strong> Switch to the Code tab, write the class, then Run. Stuck? Tap 💡 Hint.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  class spi_transaction;',
        '── Line 2 ──  rand logic [7:0] data;',
        '── Line 3 ──  int unsigned id;',
        '── Line 4 ──  static int uid = 0;',
        '── Line 6 ──  function new();',
        '── Line 7 ──    id = uid++;',
        '── Line 8 ──  endfunction',
        '── Line 10 ─  function string to_str();',
        '── Line 11 ─    return $sformatf("TXN#%0d  8\'h%02h", id, data);',
        '── Line 12 ─  endfunction',
        '── Line 13 ─  endclass',
        'Hit Run — PASS [1], PASS [2], PASS: spi_transaction works',
      ],

      hint:
`class spi_transaction;
  rand  logic [7:0] data;   // Verilator randomizes this on randomize()
  int unsigned      id;     // unique serial number, set once in new()
  static int        uid = 0;// one copy shared by all instances

  function new();
    id = uid++;   // post-increment: id = current, then uid grows
  endfunction

  function string to_str();
    return $sformatf("TXN#%0d  8'h%02h", id, data);
  endfunction

endclass

// Common mistakes:
//   Wrong:  if (!t.randomize())    <- WIDTHTRUNC warning, randomize() is 32-bit
//   Right:  if (t.randomize() == 0)
//
//   Wrong:  while(!mb.try_get(x))  <- same issue
//   Right:  while(mb.try_get(x) != 0)
`,

      design:
`// Chapter 1: write the spi_transaction class here.
//
// Members:
//   rand  logic [7:0]  data    the byte being transferred
//   int unsigned       id      this object's unique serial number
//   static int         uid     class-level counter shared by ALL instances
//
// Methods:
//   new()       -- id = uid++;
//   to_str()    -- return $sformatf("TXN#%0d  8'h%02h", id, data);
//
// Delete these comments and type the class:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness. Do not edit this tab.
// Simulator: verilator (auto-selected). Options: --no-timing (auto-applied).
module tb;
  initial begin
    spi_transaction t;

    $display("=== Chapter 1: spi_transaction ===");

    // Test 1: first object must have id=0
    t = new();
    if (t.id === 0)
      $display("PASS [1] construction ok  id=%0d", t.id);
    else
      $display("FAIL [1] id=%0d (expected 0)", t.id);

    // Test 2: randomize() must succeed
    if (t.randomize() == 0)
      $fatal(1, "randomize() returned 0 -- verify Verilator is selected, not iverilog");
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
