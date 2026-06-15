(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop2',
  title: 'OOP TB Ch.2 — spi_scoreboard',
  icon: '\u{1F3C6}',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop2l1',
      title: 'L1 — The Scoreboard Class',
      theory: `
<h2>What a scoreboard does</h2>
<p>A scoreboard is the testbench's referee. It keeps a FIFO queue of expected results and
checks each actual result that comes back from the DUT. When actual matches expected,
it increments a pass counter. When they differ, it increments a fail counter and logs the mismatch.</p>
<p>At the end of every test you call <code>report()</code> once. If <code>fail_cnt</code> is zero the test
passed. That is the entire job of a scoreboard.</p>

<h3>The golden reference queue</h3>
<pre class="code-block">
// Stimulus side: tell scoreboard what to expect BEFORE driving DUT
scb.push_exp(8'hAB);
drive_dut(8'hAB);

// Monitor side: check each result as it comes back
scb.check(dut.rx_byte);
</pre>

<h3>The check() pattern — partial view</h3>
<pre class="code-block">
function void check(logic [7:0] actual);
  logic [7:0] expected;
  // WIDTHTRUNC rule: use == 0, never !exp_q.size()
  if (exp_q.size() == 0) begin
    fail_cnt++;
    return;   // unexpected transaction, nothing to compare
  end
  expected = exp_q.pop_front();   // FIFO: removes from the front
  if (actual === expected) pass_cnt++;
  else                     fail_cnt++;
endfunction
</pre>

<h3>Outcomes at a glance</h3>
<table class="truth-table">
  <tr><th>Queue state</th><th>actual vs expected</th><th>Effect</th></tr>
  <tr><td>empty</td><td>—</td><td>fail_cnt++, log FAIL unexpected</td></tr>
  <tr><td>has item</td><td>actual === expected</td><td>pass_cnt++</td></tr>
  <tr><td>has item</td><td>actual !== expected</td><td>fail_cnt++</td></tr>
</table>

<h3>What you build this chapter</h3>
<p>The complete <code>spi_scoreboard</code> class: constructor, <code>push_exp()</code>, <code>check()</code>, and <code>report()</code>.
The pre-filled testbench calls these methods directly — no DUT, no interface needed.
This proves the scoreboard logic is correct before you attach it to anything real.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the class. Stuck? Tap \u{1F4A1} Hint.</p>
`,

      tasks: [
        'FIRST: top-right dropdown -> select verilator (not iverilog)',
        'Code tab is blank — type every line.',
        '── Line 1 ──  class spi_scoreboard;',
        '── Line 2 ──  string name;',
        '── Line 3 ──  int pass_cnt, fail_cnt;',
        '── Line 4 ──  logic [7:0] exp_q[$];   // [$] makes this a queue',
        '── Line 6 ──  function new(string n = "SCB"); name=n; pass_cnt=0; fail_cnt=0; endfunction',
        '── Line 8 ──  push_exp function: single line — exp_q.push_back(expected)',
        '── Line 12 ─  check function: guard if size==0 → fail; else pop_front and compare with ===',
        '── Line 25 ─  report function: if fail_cnt==0 print ALL OK else print ERRORS',
        '── Line 28 ─  endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS [1], PASS [2] pass_cnt=1, PASS [3] fail_cnt=2, PASS: spi_scoreboard works',
      ],

      hint:
`class spi_scoreboard;
  string       name;
  int          pass_cnt;   // incremented on match
  int          fail_cnt;   // incremented on mismatch or unexpected txn
  logic [7:0]  exp_q[$];  // queue: push_back adds to tail, pop_front takes from head

  function new(string n = "SCB");
    name     = n;
    pass_cnt = 0;
    fail_cnt = 0;
  endfunction

  function void push_exp(logic [7:0] expected);
    exp_q.push_back(expected);  // stimulus calls this before driving DUT
  endfunction

  function void check(logic [7:0] actual);
    logic [7:0] expected;
    // Verilator: size() returns int (32-bit). Use == 0, never !exp_q.size()
    if (exp_q.size() == 0) begin
      fail_cnt++;
      $display("FAIL [%s] unexpected transaction: 8'h%02h", name, actual);
      return;
    end
    expected = exp_q.pop_front();
    if (actual === expected) begin
      pass_cnt++;
      $display("PASS [%s] got 8'h%02h", name, actual);
    end else begin
      fail_cnt++;
      $display("FAIL [%s] got 8'h%02h expected 8'h%02h", name, actual, expected);
    end
  endfunction

  function void report();
    if (fail_cnt == 0)
      $display("[%s] PASS=%0d FAIL=%0d  ALL OK", name, pass_cnt, fail_cnt);
    else
      $display("[%s] PASS=%0d FAIL=%0d  ERRORS", name, pass_cnt, fail_cnt);
  endfunction

endclass

// Common mistakes:
//   Wrong:  if (!exp_q.size())        <- WIDTHTRUNC: ! on 32-bit int
//   Right:  if (exp_q.size() == 0)
//
//   Wrong:  exp_q declared as reg or wire
//   Right:  logic [7:0] exp_q[$]
`,

      design:
`// Chapter 2: write the spi_scoreboard class here.
//
// Members:
//   string       name        -- label printed in every $display
//   int          pass_cnt    -- incremented when actual === expected
//   int          fail_cnt    -- incremented on mismatch or empty-queue check
//   logic [7:0]  exp_q[$]   -- FIFO queue: push_back / pop_front
//
// Methods:
//   new(string n)                -- store name, zero counters
//   push_exp(logic [7:0])        -- exp_q.push_back(expected)
//   check(logic [7:0] actual)    -- guard empty queue; pop_front; compare; update counters
//   report()                     -- one-line summary with ALL OK or ERRORS
//
// KEY: use exp_q.size() == 0  (never !exp_q.size() -- causes WIDTHTRUNC error)
//
// Delete these comments and type the class:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness — do not edit this tab.
// Simulator: verilator.  Options: --no-timing (or --timing, both work).
module tb;
  initial begin
    spi_scoreboard scb;

    $display("=== Chapter 2: spi_scoreboard ===");

    // Test 1: construction
    scb = new("TEST_SCB");
    if (scb.pass_cnt === 0 && scb.fail_cnt === 0)
      $display("PASS [1] construction ok  name=%s", scb.name);
    else
      $display("FAIL [1] counters not zeroed in new()");

    // Test 2: push then matching check => pass_cnt -> 1
    scb.push_exp(8'hAB);
    scb.check(8'hAB);   // match -> PASS logged inside check()

    // Test 3: push then deliberate mismatch => fail_cnt -> 1
    scb.push_exp(8'hFF);
    scb.check(8'h00);   // mismatch -> FAIL logged inside check()

    // Test 4: check with empty queue => fail_cnt -> 2
    scb.check(8'hBE);   // unexpected -> FAIL logged inside check()

    // After tests 2-4: pass=1, fail=2
    scb.report();

    if (scb.pass_cnt === 1)
      $display("PASS [2] pass_cnt=%0d (correct)", scb.pass_cnt);
    else
      $display("FAIL [2] pass_cnt=%0d (expected 1)", scb.pass_cnt);

    if (scb.fail_cnt === 2)
      $display("PASS [3] fail_cnt=%0d (correct)", scb.fail_cnt);
    else
      $display("FAIL [3] fail_cnt=%0d (expected 2)", scb.fail_cnt);

    $display("PASS: spi_scoreboard works");
    $finish;
  end
endmodule`,

      expected: [
        'PASS [1] construction ok',
        '[TEST_SCB] PASS=1',
        'PASS [2] pass_cnt=1',
        'PASS: spi_scoreboard works'
      ]
    }
  ]
});
