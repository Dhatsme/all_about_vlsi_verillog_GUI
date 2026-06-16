(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop3',
  title: 'OOP TB Ch.3 — spi_mailbox',
  icon: '\u{1F4EC}',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop3l1',
      title: 'L1 — The Typed Mailbox',
      files: [
        {
          name: 'spi_transaction.sv',
          content:
`class spi_transaction;
  rand  logic [7:0] data;
  int unsigned      id;
  static int        uid = 0;
  function new(); id = uid++; endfunction
  function string to_str(); return $sformatf("TXN#%0d  8'h%02h", id, data); endfunction
endclass`
        },
        {
          name: 'spi_scoreboard.sv',
          content:
`class spi_scoreboard;
  string       name;
  int          pass_cnt;
  int          fail_cnt;
  logic [7:0]  exp_q[$];
  function new(string n = "SCB");
    name = n; pass_cnt = 0; fail_cnt = 0;
  endfunction
  function void push_exp(logic [7:0] expected);
    exp_q.push_back(expected);
  endfunction
  function void check(logic [7:0] actual);
    logic [7:0] expected;
    if (exp_q.size() == 0) begin
      fail_cnt++;
      $display("FAIL [%s] unexpected: got 8'h%02h", name, actual);
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
endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--no-timing' },
      theory: `
<h2>What a mailbox does</h2>
<p>A mailbox is a thread-safe FIFO channel between components. The driver puts transactions in;
the sequencer takes them out. In SystemVerilog a <em>typed</em> mailbox lets the compiler
catch type errors before the simulator ever runs:</p>
<pre class="code-block">
mailbox #(spi_transaction) mb = new();  // typed: only spi_transaction allowed
</pre>

<h3>try_put and try_get — the non-blocking pair</h3>
<p>The blocking built-ins (<code>put</code>, <code>get</code>) suspend the caller until the mailbox is ready.
They need <code>--timing</code> mode and <code>fork</code> blocks. The non-blocking versions return immediately—no suspension, no timing flag needed:</p>
<table class="truth-table">
  <tr><th>Method</th><th>Returns</th><th>Behaviour</th></tr>
  <tr><td><code>try_put(t)</code></td><td>1</td><td>unbounded mailbox: always succeeds immediately</td></tr>
  <tr><td><code>try_get(r)</code></td><td>1</td><td>got an item — r is now valid</td></tr>
  <tr><td><code>try_get(r)</code></td><td>0</td><td>mailbox was empty — r unchanged</td></tr>
  <tr><td><code>num()</code></td><td>int</td><td>items currently in the queue</td></tr>
</table>

<h3>Wrapper class pattern (partial view)</h3>
<pre class="code-block">
class spi_mailbox;
  mailbox #(spi_transaction) mb;
  string name;

  function new(string n = "MB");
    name = n;
    mb   = new();    // no bound argument = unbounded FIFO
  endfunction

  function void put(spi_transaction t);
    void'(mb.try_put(t));   // discard return value; unbounded never fails
  endfunction
  // ... get_nowait() returns spi_transaction or null
  // ... num() wraps mb.num()
endclass
</pre>

<h3>What you build this chapter</h3>
<p>The full <code>spi_mailbox</code> class. <code>spi_transaction</code> from Chapter 1 is pre-loaded —
click the <code>spi_transaction.sv</code> tab to the left to review it.
The pre-filled testbench verifies construction, two puts, FIFO ordering, and the null
return from an empty <code>get_nowait()</code>.</p>

<p><strong>Ready?</strong> Switch to the Code tab and write <code>spi_mailbox</code>.
Stuck? Tap \u{1F4A1} Hint.</p>
`,

      tasks: [
        'Click the spi_transaction.sv tab to the left to review the pre-loaded class.',
        'Code tab is blank — type the spi_mailbox class.',
        '── Line 1 ──  class spi_mailbox;',
        '── Line 2 ──  mailbox #(spi_transaction) mb;',
        '── Line 3 ──  string name;',
        '── Line 5 ──  function new(string n = "MB"); name=n; mb=new(); endfunction',
        '── Line 8 ──  put(): void\'(mb.try_put(t));',
        '── Line 12 ─  get_nowait(): local t=null; if try_get(t)!=0 return t; return null;',
        '── Line 18 ─  num(): return mb.num();',
        '── Line 20 ─  endclass',
        'Hit Run — PASS [1] through PASS [5] and PASS: spi_mailbox works',
      ],

      hint:
`// spi_transaction is pre-loaded in the spi_transaction.sv tab.
class spi_mailbox;
  mailbox #(spi_transaction) mb;  // typed FIFO channel
  string                     name;

  function new(string n = "MB");
    name = n;
    mb   = new();   // unbounded: no size limit
  endfunction

  function void put(spi_transaction t);
    void'(mb.try_put(t));  // always succeeds for unbounded mailbox
  endfunction

  // Returns the next transaction, or null if the mailbox is empty.
  function spi_transaction get_nowait();
    spi_transaction t = null;
    if (mb.try_get(t) != 0)   // != 0 avoids WIDTHTRUNC warning
      return t;
    return null;
  endfunction

  function int num();
    return mb.num();   // built-in count of queued items
  endfunction

endclass

// Common mistakes:
//   Wrong:  if (!mb.try_get(t))          <- WIDTHTRUNC: ! on 32-bit int
//   Right:  if (mb.try_get(t) != 0)
//
//   Wrong:  mailbox mb;                  <- untyped, no compile-time check
//   Right:  mailbox #(spi_transaction) mb
`,

      design:
`// Chapter 3: write the spi_mailbox class here.
// spi_transaction is pre-loaded in the spi_transaction.sv tab to the left.
//
// Members:
//   mailbox #(spi_transaction)  mb    -- typed FIFO channel
//   string                      name
//
// Methods:
//   new(string n)        -- name=n; mb=new();
//   put(spi_transaction) -- void'(mb.try_put(t));
//   get_nowait()         -- returns spi_transaction or null if empty
//   num()                -- returns int (item count)
//
// KEY: use mb.try_get(t) != 0  (never !mb.try_get(t) -- WIDTHTRUNC error)
//
// Delete these comments and write the class:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness — do not edit this tab.
// Simulator: verilator (auto-selected). Options: --no-timing (auto-applied).
module tb;
  initial begin
    spi_mailbox     mbx;
    spi_transaction t, r;

    $display("=== Chapter 3: spi_mailbox ===");

    // Test 1: construction
    mbx = new("TEST_MB");
    if (mbx.num() === 0)
      $display("PASS [1] construction ok  name=%s  num=%0d", mbx.name, mbx.num());
    else
      $display("FAIL [1] num=%0d (expected 0)", mbx.num());

    // Test 2: put one transaction
    t = new(); t.data = 8'hA5;
    mbx.put(t);
    if (mbx.num() === 1)
      $display("PASS [2] num=%0d after first put", mbx.num());
    else
      $display("FAIL [2] num=%0d (expected 1)", mbx.num());

    // Test 3: put a second transaction
    t = new(); t.data = 8'h3C;
    mbx.put(t);
    if (mbx.num() === 2)
      $display("PASS [3] num=%0d after second put", mbx.num());
    else
      $display("FAIL [3] num=%0d (expected 2)", mbx.num());

    // Test 4: FIFO order -- first put must come out first
    r = mbx.get_nowait();
    if (r != null && r.data === 8'hA5)
      $display("PASS [4] FIFO ok: got 8'h%02h (first in first out)", r.data);
    else begin
      if (r === null)
        $display("FAIL [4] get_nowait returned null (expected 8'ha5)");
      else
        $display("FAIL [4] got 8'h%02h (expected 8'ha5)", r.data);
    end

    // Test 5: get_nowait on empty mailbox must return null
    void'(mbx.get_nowait());   // drain the remaining 8'h3c item
    r = mbx.get_nowait();      // mailbox is now empty
    if (r === null)
      $display("PASS [5] get_nowait returns null when empty");
    else
      $display("FAIL [5] expected null from empty mailbox, got 8'h%02h", r.data);

    $display("PASS: spi_mailbox works");
    $finish;
  end
endmodule`,

      expected: [
        'PASS [1] construction ok',
        'PASS [3] num=2',
        'PASS [4] FIFO ok',
        'PASS: spi_mailbox works'
      ]
    }
  ]
});
