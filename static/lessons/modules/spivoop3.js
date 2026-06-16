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
<h2>What is a mailbox?</h2>
<p>Imagine a physical postbox on a street corner. The <strong>postman (driver)</strong> drops
envelopes in through the slot; the <strong>recipient (monitor or sequencer)</strong> opens the door
and takes them out. Two rules never change:</p>
<ul>
  <li><strong>FIFO order</strong> &#8212; the first envelope dropped in is the first one taken out.</li>
  <li><strong>Decoupled timing</strong> &#8212; the postman does not wait for the recipient, and the
  recipient does not wait for the postman. They work independently.</li>
</ul>
<p>A SystemVerilog <code>mailbox</code> works exactly like that postbox, except the envelopes are
objects and the "street corner" is a synthesized FIFO managed by the simulator.</p>

<h3>Typed vs untyped mailbox</h3>
<p>An <em>untyped</em> mailbox accepts any object class. A <em>typed</em> mailbox locks the slot
to one class only &#8212; the compiler rejects anything else at elaboration time:</p>
<pre class="code-block">
mailbox                    mb_any;  // untyped: no compile-time check
mailbox #(spi_transaction) mb_spi;  // typed: ONLY spi_transaction allowed
</pre>
<p>Always use the typed form in real testbenches. Bugs that the compiler catches in one
second would take an hour to track down in simulation.</p>

<h3>Blocking vs non-blocking &#8212; choose wisely</h3>
<table class="truth-table">
  <tr><th>Method</th><th>Blocks?</th><th>Returns</th><th>When to use</th></tr>
  <tr>
    <td><code>put(t)</code></td>
    <td>Yes &#8212; suspends until space</td>
    <td>void</td>
    <td>Bounded mailbox, inside <code>fork</code></td>
  </tr>
  <tr>
    <td><code>get(r)</code></td>
    <td>Yes &#8212; suspends until item</td>
    <td>void</td>
    <td>Blocking consumer, inside <code>fork</code></td>
  </tr>
  <tr>
    <td><code>try_put(t)</code></td>
    <td>No &#8212; returns immediately</td>
    <td>1 = ok, 0 = full</td>
    <td>Unbounded mailbox (always 1)</td>
  </tr>
  <tr>
    <td><code>try_get(r)</code></td>
    <td>No &#8212; returns immediately</td>
    <td>1 = got item, 0 = empty</td>
    <td>Polling without <code>--timing</code></td>
  </tr>
  <tr>
    <td><code>num()</code></td>
    <td>No</td>
    <td>int count</td>
    <td>Check queue depth any time</td>
  </tr>
</table>
<p>This chapter uses <code>try_put</code> and <code>try_get</code> exclusively. Because they never suspend
the simulation, <code>--no-timing</code> is sufficient &#8212; no <code>fork</code> blocks needed.</p>

<h3>Why wrap the mailbox in a class?</h3>
<p>Raw <code>mailbox</code> calls spread across ten components are impossible to debug.
A thin wrapper class gives you one place to add logging, statistics, and future
assertions &#8212; without touching every component that uses it. That is the OOP
payoff in testbench design.</p>

<h2>Building spi_mailbox &#8212; step by step</h2>
<p>You will build the class in five steps. Each step adds exactly one method.
Do not add anything else until the step description says to.</p>

<h3>Step 1 &#8212; declare the shell and its two members</h3>
<pre class="code-block">
class spi_mailbox;
  mailbox #(spi_transaction) mb;   // handle only; points to nothing yet
  string                     name; // label for debug output
endclass
</pre>
<p>The <code>mailbox</code> variable is a <strong>handle</strong>, not the mailbox itself. It is like declaring a
variable of type "postbox" but not building the physical box yet. You build the box
in <code>new()</code>.</p>

<h3>Step 2 &#8212; constructor: allocate the inner mailbox</h3>
<pre class="code-block">
function new(string n = "MB");
  name = n;
  mb   = new();   // new() with no argument = unbounded (no size cap)
endfunction
</pre>
<p>Calling <code>new()</code> on the mailbox handle allocates the actual FIFO storage. The optional
integer argument sets a capacity bound. Omitting it means the mailbox grows without
limit, so <code>try_put</code> always returns 1 and never blocks.</p>

<h3>Step 3 &#8212; put(): add a transaction to the tail</h3>
<pre class="code-block">
function void put(spi_transaction t);
  void'(mb.try_put(t));  // discard the return value
endfunction
</pre>
<p><code>void'(...)</code> is the SystemVerilog way to explicitly discard a return value you do not
need. Without it Verilator raises a warning about an ignored non-void return. Because
the mailbox is unbounded, <code>try_put</code> always returns 1 &#8212; there is nothing useful to
check.</p>

<h3>Step 4 &#8212; get_nowait(): take from the head, or return null</h3>
<pre class="code-block">
function spi_transaction get_nowait();
  spi_transaction t = null;
  if (mb.try_get(t) != 0)  // returns 1 if an item was available
    return t;               // t is now the dequeued transaction
  return null;              // mailbox was empty
endfunction
</pre>
<p>Two Verilator rules to remember here:</p>
<ul>
  <li><code>try_get</code> returns a 32-bit <code>int</code>. Writing <code>!mb.try_get(t)</code> applies logical-NOT
  to a 32-bit value and triggers <strong>WIDTHTRUNC</strong>. Always compare with <code>!= 0</code>.</li>
  <li>Returning <code>null</code> for an empty queue is the idiomatic SystemVerilog pattern for
  a non-blocking get. The caller checks for null before using the result.</li>
</ul>

<h3>Step 5 &#8212; num(): expose the queue depth</h3>
<pre class="code-block">
function int num();
  return mb.num();  // built-in method: count of items in the FIFO
endfunction
</pre>
<p>This one-liner delegates to the built-in <code>mailbox.num()</code>. Exposing it on the wrapper
lets external code check the queue depth without reaching inside the class.</p>

<p>That is the complete <code>spi_mailbox</code> in five steps. The five testbench checks map
directly to: construction (Step 2), two puts (Step 3), FIFO ordering (Step 4), and
null on empty (Step 4 edge case). <code>num()</code> is exercised in checks 1&#8211;3.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
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
