(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2coop1',
  title: 'I²C OOP TB — Transaction',
  icon: '🔗',
  level: 'intermediate',
  lessons: [
    {
      id: 'i2coop1l1',
      title: 'L1 — i2c_transaction: fields and print()',
      theory: `
<h2>The I²C transaction object</h2>
<p>In a class-based testbench, every bus transaction lives in an object. For I²C, one logical transaction carries three pieces of information that travel together — from the driver that generates stimulus to the scoreboard that checks results. Giving each transaction a dedicated class means the driver, monitor, and scoreboard all speak the same language.</p>

<h3>What travels in one I²C transfer</h3>
<table class="truth-table">
  <tr><th>Field</th><th>Type</th><th>Meaning</th><th>Example value</th></tr>
  <tr><td><code>addr</code></td><td><code>logic [6:0]</code></td><td>7-bit slave address</td><td><code>7'h48</code> (TMP102 temp sensor)</td></tr>
  <tr><td><code>rw</code></td><td><code>logic</code></td><td>0 = write, 1 = read</td><td><code>1'b0</code></td></tr>
  <tr><td><code>data</code></td><td><code>logic [7:0]</code></td><td>payload byte</td><td><code>8'hA5</code></td></tr>
</table>

<h3>Class declaration — every line explained</h3>
<pre class="code-block">class i2c_transaction;       // open the class block
  logic [6:0] addr;          // 7-bit field: range 0x00–0x7F
  logic        rw;           // 1-bit flag: 0=write 1=read
  logic [7:0]  data;         // 8-bit payload

  function new();            // constructor — called when you write: new()
    addr = 7'h00;            // zero-init: avoids X propagation later
    rw   = 1'b0;             // default direction = write
    data = 8'h00;            // zero payload
  endfunction

  function void print();     // display helper
    $display(               // format string — %02h = 2 hex digits
      "I2C txn: addr=7'h%02h rw=%0b data=8'h%02h",
      addr, rw, data);
  endfunction
endclass</pre>

<h3>Why zero-init every field in new()?</h3>
<p>SystemVerilog initialises <code>logic</code> to <code>X</code> by default. A constructor that sets every field to a known value prevents X-propagation bugs from silently passing checks later — a discipline that saves hours of debug time at 3 AM.</p>

<h3>What you will build</h3>
<p>A class called <code>i2c_transaction</code> with three fields, a zero-initialising constructor, and a <code>print()</code> method that formats the transaction to the console. The testbench creates three transaction objects, sets their fields, and verifies the values.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  class i2c_transaction;',
        '── Line 2 ──  logic [6:0] addr;      ← 7-bit slave address',
        '── Line 3 ──  logic rw;              ← R/W flag, 1 bit',
        '── Line 4 ──  logic [7:0] data;      ← payload byte',
        '── Line 5 ──  function new();        ← constructor, no arguments',
        "── Line 6 ──  addr = 7'h00; rw = 1'b0; data = 8'h00;",
        '── Line 7 ──  endfunction',
        '── Line 8 ──  function void print();',
        "── Line 9 ──  $display(\"I2C txn: addr=7'h%02h rw=%0b data=8'h%02h\", addr, rw, data);",
        '── Line 10 ─ endfunction',
        '── Line 11 ─ endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`class i2c_transaction;
  logic [6:0] addr;    // 7-bit slave address (range 0x00-0x7F)
  logic        rw;     // 0 = write, 1 = read
  logic [7:0]  data;   // one payload byte

  function new();
    addr = 7'h00;      // zero-init every field -- avoids X propagation
    rw   = 1'b0;
    data = 8'h00;
  endfunction

  function void print();
    $display("I2C txn: addr=7'h%02h rw=%0b data=8'h%02h",
             addr, rw, data);
  endfunction
endclass`,
      design:
`// Type the i2c_transaction class here.
// Read Theory first -- it explains the I2C transaction model.
//
// Fields:
//   logic [6:0] addr  -- 7-bit slave address
//   logic        rw   -- 0=write, 1=read
//   logic [7:0]  data -- payload byte
//
// Methods:
//   new()   -- zero-init all fields
//   print() -- $display addr, rw, data
//
// Delete this comment block and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  i2c_transaction t0, t1, t2;

  initial begin
    $display("=== i2c_transaction test ===");

    // Write transaction to address 0x48 with data 0xA5
    t0 = new();
    t0.addr = 7'h48;
    t0.rw   = 1'b0;
    t0.data = 8'hA5;
    t0.print();
    if (t0.addr === 7'h48 && t0.rw === 1'b0 && t0.data === 8'hA5)
      $display("PASS  t0: addr=7'h48 rw=0 data=8'hA5");
    else
      $display("FAIL  t0: unexpected field values");

    // Read transaction to address 0x1C
    t1 = new();
    t1.addr = 7'h1C;
    t1.rw   = 1'b1;
    t1.data = 8'h00;
    t1.print();
    if (t1.addr === 7'h1C && t1.rw === 1'b1)
      $display("PASS  t1: read from 7'h1C");
    else
      $display("FAIL  t1: unexpected field values");

    // Reset state from constructor
    t2 = new();
    t2.print();
    if (t2.addr === 7'h00 && t2.rw === 1'b0 && t2.data === 8'h00)
      $display("PASS  t2: reset state correct");
    else
      $display("FAIL  t2: constructor did not zero-init");

    $display("I2C transaction works!");
    $finish;
  end
endmodule`,
      expected: [
        "PASS  t0: addr=7'h48 rw=0 data=8'hA5",
        "PASS  t1: read from 7'h1C",
        "I2C transaction works!"
      ]
    },
    {
      id: 'i2coop1l2',
      title: 'L2 — equals(): scoreboard-ready comparison',
      theory: `
<h2>Why the scoreboard needs equals()</h2>
<p>When the scoreboard compares a received I²C transaction against the expected one, it cannot use <code>==</code> between two class handles — that checks whether both variables point to the same object in memory, not whether the field values match. You need a method that compares fields one by one.</p>

<h3>The handle trap</h3>
<pre class="code-block">i2c_transaction exp = new();  exp.data = 8'hA5;
i2c_transaction got = new();  got.data = 8'hA5;
// exp == got  → FALSE: different heap objects, same field values
// exp === got → FALSE: === on handles also compares the handle itself</pre>

<h3>equals() — every line explained</h3>
<pre class="code-block">// Add this inside the class, after print()
function bit equals(i2c_transaction other);  // line A: argument = the reference txn
  return (addr === other.addr) &amp;&amp;            // line B: compare 7-bit address
         (rw   === other.rw  ) &amp;&amp;            // line C: compare direction flag
         (data === other.data);              // line D: compare payload byte
endfunction                                  // line E: returns 1=match, 0=mismatch</pre>

<h3>Why === not == inside equals()?</h3>
<table class="truth-table">
  <tr><th>Operator</th><th>X vs 0</th><th>X vs X</th><th>Testbench use</th></tr>
  <tr><td><code>==</code></td><td>X (unknown)</td><td>X (unknown)</td><td>Can hide uninitialised values</td></tr>
  <tr><td><code>===</code></td><td>0 (false)</td><td>1 (true)</td><td>Always returns 0 or 1 — safe</td></tr>
</table>
<p>Using <code>===</code> inside <code>equals()</code> means an uninitialised field (value X) never silently passes a comparison. That turns a silent wrong answer into a visible FAIL line, which is exactly what a scoreboard should do.</p>

<h3>What you will build</h3>
<p>Add <code>equals()</code> to your <code>i2c_transaction</code> class from L1. The testbench creates matched and mismatched pairs and verifies that the method returns 1 or 0 correctly across four scenarios: full match, addr mismatch, rw mismatch, and data mismatch.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
      tasks: [
        'Code tab is blank — type every line (start from L1, then add equals()).',
        'Copy your L1 class: declaration, three fields, new(), print()',
        '── After print() ── function bit equals(i2c_transaction other);',
        '── Inside equals ── return (addr === other.addr) && (rw === other.rw) && (data === other.data);',
        '── Close it ──      endfunction',
        '── Close class ──   endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`class i2c_transaction;
  logic [6:0] addr;
  logic        rw;
  logic [7:0]  data;

  function new();
    addr = 7'h00; rw = 1'b0; data = 8'h00;
  endfunction

  function void print();
    $display("I2C txn: addr=7'h%02h rw=%0b data=8'h%02h", addr, rw, data);
  endfunction

  function bit equals(i2c_transaction other);
    return (addr === other.addr) &&   // === catches X/Z differences
           (rw   === other.rw  ) &&
           (data === other.data);
  endfunction
endclass`,
      design:
`// Copy your L1 i2c_transaction class here, then add equals().
//
// New method:
//   function bit equals(i2c_transaction other)
//     compare addr, rw, data with === (not ==)
//     return 1 if all match, 0 if any differ
//   endfunction
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  i2c_transaction a, b;

  initial begin
    $display("=== equals() test ===");

    // Identical transactions -> 1
    a = new(); a.addr = 7'h48; a.rw = 1'b0; a.data = 8'hA5;
    b = new(); b.addr = 7'h48; b.rw = 1'b0; b.data = 8'hA5;
    if (a.equals(b) === 1'b1)
      $display("PASS  match: equals() returned 1");
    else
      $display("FAIL  match: equals() returned 0 for identical txns");

    // Different addr -> 0
    b.addr = 7'h1C;
    if (a.equals(b) === 1'b0)
      $display("PASS  addr mismatch: equals() returned 0");
    else
      $display("FAIL  addr mismatch: equals() returned 1");

    // Different rw -> 0
    b.addr = 7'h48; b.rw = 1'b1;
    if (a.equals(b) === 1'b0)
      $display("PASS  rw mismatch: equals() returned 0");
    else
      $display("FAIL  rw mismatch: equals() returned 1");

    // Different data -> 0
    b.rw = 1'b0; b.data = 8'h00;
    if (a.equals(b) === 1'b0)
      $display("PASS  data mismatch: equals() returned 0");
    else
      $display("FAIL  data mismatch: equals() returned 1");

    $display("equals() works!");
    $finish;
  end
endmodule`,
      expected: [
        "PASS  match: equals() returned 1",
        "PASS  addr mismatch: equals() returned 0",
        "equals() works!"
      ]
    },
    {
      id: 'i2coop1l3',
      title: 'L3 — ACK field, copy(), and transaction queue',
      theory: `
<h2>Adding ACK and deep copy to i2c_transaction</h2>
<p>The full I²C protocol includes an acknowledge bit after every byte. The master releases SDA (lets it float high through the pull-up), and the slave pulls SDA low to say “I received it” (ACK) or lets it stay high to say “stop” (NACK). Adding this field to the transaction means the scoreboard can verify ACK behaviour, not just data values.</p>

<h3>The ack field and ack_str() helper</h3>
<pre class="code-block">logic ack;    // 0 = ACK (slave pulled SDA low)
              // 1 = NACK (slave released SDA -- stayed high)

function string ack_str();      // human-readable label
  return ack ? "NACK" : "ACK"; // ternary: if ack==1 -> "NACK", else "ACK"
endfunction</pre>

<h3>Why copy() is not just assignment</h3>
<p>In SystemVerilog, a class variable is a handle — it stores the address of the object in memory, not the object itself. Writing <code>b = a</code> makes both <code>a</code> and <code>b</code> point at the same memory location. Changing <code>b.data</code> also changes <code>a.data</code>. This is a shallow copy. The driver and scoreboard both need their own independent copy of each transaction.</p>

<h3>copy() — every line explained</h3>
<pre class="code-block">function i2c_transaction copy();  // returns a brand-new i2c_transaction
  i2c_transaction t = new();      // allocate a fresh object on the heap
  t.addr = addr;                   // copy each field individually
  t.rw   = rw;
  t.data = data;
  t.ack  = ack;
  return t;                        // caller gets a handle to the new object
endfunction</pre>

<h3>Transaction queue — SV dynamic array</h3>
<pre class="code-block">i2c_transaction q[$];           // [$] = dynamic queue, unbounded
q.push_back(t0);               // append to the tail
q.push_back(t1);
i2c_transaction head = q.pop_front();  // remove from the head (FIFO)</pre>

<h3>What you will build</h3>
<p>Add <code>ack</code>, <code>ack_str()</code>, and <code>copy()</code> to the transaction class, and update <code>equals()</code> to also compare <code>ack</code>. The testbench verifies that a copy is independent of the original, that <code>equals()</code> catches an ACK mismatch, and that a queue delivers transactions in FIFO order.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
      tasks: [
        'Code tab is blank — type every line (build on L2, add ack + copy()).',
        'Add the ack field after data:  logic ack;',
        "In new(), add:  ack = 1'b0;",
        'Add function string ack_str() returning "ACK" if ack==0, "NACK" if ack==1',
        'Update print() to also display ack_str() at the end of the $display string',
        'Add function i2c_transaction copy() that allocates a new object and copies all 4 fields',
        'Update equals() to also compare ack: && (ack === other.ack)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`class i2c_transaction;
  logic [6:0] addr;
  logic        rw;
  logic [7:0]  data;
  logic        ack;    // 0=ACK 1=NACK -- new in L3

  function new();
    addr = 7'h00; rw = 1'b0; data = 8'h00; ack = 1'b0;
  endfunction

  function string ack_str();
    return ack ? "NACK" : "ACK";  // ternary on 1-bit logic
  endfunction

  function void print();
    $display("I2C txn: addr=7'h%02h rw=%0b data=8'h%02h %s",
             addr, rw, data, ack_str());
  endfunction

  function bit equals(i2c_transaction other);
    return (addr === other.addr) &&
           (rw   === other.rw  ) &&
           (data === other.data) &&
           (ack  === other.ack );   // now also checks the ACK bit
  endfunction

  function i2c_transaction copy();
    i2c_transaction t = new();  // allocate fresh object
    t.addr = addr;              // copy each field individually
    t.rw   = rw;
    t.data = data;
    t.ack  = ack;
    return t;                   // caller gets a handle to the new object
  endfunction
endclass`,
      design:
`// Type the full i2c_transaction class here.
// Build on L2, then add:
//   logic ack  field
//   ack_str() returning "ACK" or "NACK"
//   copy()    returning a new i2c_transaction with all 4 fields copied
//   update equals() to also compare ack
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  i2c_transaction a, b, c;
  i2c_transaction q[$];

  initial begin
    $display("=== i2c_transaction full test ===");

    // ack_str(): ack=0 -> ACK
    a = new(); a.ack = 1'b0;
    if (a.ack_str() == "ACK")
      $display("PASS  ack_str: ack=0 -> ACK");
    else
      $display("FAIL  ack_str: ack=0 got %s", a.ack_str());

    // ack_str(): ack=1 -> NACK
    a.ack = 1'b1;
    if (a.ack_str() == "NACK")
      $display("PASS  ack_str: ack=1 -> NACK");
    else
      $display("FAIL  ack_str: ack=1 got %s", a.ack_str());

    // Deep copy: modifying b must not affect a
    a = new(); a.addr = 7'h48; a.data = 8'hA5; a.ack = 1'b0;
    b = a.copy();
    b.data = 8'hFF;    // change copy
    if (a.data === 8'hA5)
      $display("PASS  copy: original unchanged after modifying copy");
    else
      $display("FAIL  copy: original was modified (shallow copy bug)");

    // equals(): ack mismatch caught
    c = a.copy();
    c.ack = 1'b1;
    if (a.equals(c) === 1'b0)
      $display("PASS  equals: ack mismatch detected");
    else
      $display("FAIL  equals: ack mismatch not caught");

    // Queue FIFO order
    q = {};
    q.push_back(a.copy());
    q.push_back(b.copy());
    begin
      i2c_transaction head = q.pop_front();
      if (head.data === 8'hA5)
        $display("PASS  queue: FIFO order correct");
      else
        $display("FAIL  queue: wrong element dequeued (got 8'h%02h)", head.data);
    end

    $display("I2C transaction complete!");
    $finish;
  end
endmodule`,
      expected: [
        "PASS  ack_str: ack=0 -> ACK",
        "PASS  copy: original unchanged after modifying copy",
        "I2C transaction complete!"
      ]
    }
  ]
});
