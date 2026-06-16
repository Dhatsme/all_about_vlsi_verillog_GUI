(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop4',
  title: 'OOP TB Ch.4 — spi_if',
  icon: '\u{1F50C}',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop4l1',
      title: 'L1 — The SPI Interface',
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
        },
        {
          name: 'spi_mailbox.sv',
          content:
`class spi_mailbox;
  mailbox #(spi_transaction) mb;
  string                     name;
  function new(string n = "MB");
    name = n;
    mb   = new();
  endfunction
  function void put(spi_transaction t);
    void'(mb.try_put(t));
  endfunction
  function spi_transaction get_nowait();
    spi_transaction t = null;
    if (mb.try_get(t) != 0)
      return t;
    return null;
  endfunction
  function int num();
    return mb.num();
  endfunction
endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--no-timing' },
      theory: `
<h2>The gap between software and hardware</h2>
<p>The three classes built so far — <code>spi_transaction</code>, <code>spi_scoreboard</code>,
and <code>spi_mailbox</code> — live entirely in the software world of the testbench.
They carry data and logic, but they never touch a wire.
The <strong>interface</strong> is the bridge that connects the class world to real signals.</p>
<p>Without an interface you would thread four separate ports — <code>sclk</code>, <code>cs_n</code>,
<code>mosi</code>, <code>miso</code> — through every module boundary and re-declare them in every class.
An interface bundles all four into one named group that you pass as a single handle.</p>

<h3>SPI signals</h3>
<table class="truth-table">
  <tr><th>Signal</th><th>Direction</th><th>Idles at</th><th>Meaning</th></tr>
  <tr>
    <td><code>sclk</code></td>
    <td>master &#8594; slave</td>
    <td>0</td>
    <td>Serial clock. Master drives it. Data shifts on the rising edge.</td>
  </tr>
  <tr>
    <td><code>cs_n</code></td>
    <td>master &#8594; slave</td>
    <td>1</td>
    <td>Chip select, active-low. Drive low to select the slave; high to release it.</td>
  </tr>
  <tr>
    <td><code>mosi</code></td>
    <td>master &#8594; slave</td>
    <td>0</td>
    <td>Master Out Slave In — the byte being sent from master to slave.</td>
  </tr>
  <tr>
    <td><code>miso</code></td>
    <td>slave &#8594; master</td>
    <td>0</td>
    <td>Master In Slave Out — the byte coming back from slave to master.</td>
  </tr>
</table>

<h3>The interface keyword</h3>
<p>An interface looks like a module with no logic — just signal declarations
between <code>interface</code> and <code>endinterface</code>:</p>
<pre class="code-block">
interface spi_if;
  logic sclk;
  logic cs_n;
  logic mosi;
  logic miso;
endinterface
</pre>
<p>Instantiate it inside a testbench module.
<strong>Parentheses are required</strong> even though there are no ports to connect:</p>
<pre class="code-block">
module tb;
  spi_if vif();   // instantiate — () required

  initial begin
    vif.cs_n = 0;   // drive a signal through the interface
    vif.sclk = 1;
  end
endmodule
</pre>

<h3>virtual interface — how classes reach the wires</h3>
<p>A class cannot hold a module or interface <em>instance</em>.
It can hold a <em>handle</em> to one, declared with the <code>virtual</code> keyword.
Think of it like a pointer to the interface:</p>
<pre class="code-block">
class spi_driver;
  virtual spi_if vif;        // handle — points nowhere until assigned

  function new(virtual spi_if v);
    vif = v;                 // store the handle passed from testbench
  endfunction

  task drive_cs(logic val);
    vif.cs_n = val;          // writes the real wire through the handle
  endtask
endclass
</pre>
<p>In the testbench: <code>drv = new(vif)</code>. From that moment, every write the driver
makes to <code>vif.cs_n</code> changes the actual signal visible to the DUT.
You will connect all of this in Chapter 5 when you build the driver.</p>

<h3>What you build this chapter</h3>
<p>The <code>spi_if</code> interface: four <code>logic</code> signals, nothing else.
No modports, no clocking blocks — those come when you need them.
The pre-filled testbench instantiates it, writes each signal, and reads it back
to confirm all four wires are correctly declared.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  interface spi_if;',
        '── Line 2 ──  logic sclk;   serial clock, idles low',
        '── Line 3 ──  logic cs_n;   chip select active-low, idles high',
        '── Line 4 ──  logic mosi;   master-out slave-in',
        '── Line 5 ──  logic miso;   master-in slave-out',
        '── Line 6 ──  endinterface',
        'Hit Run — PASS [1] through PASS [4] and PASS: spi_if works',
      ],

      hint:
`interface spi_if;
  logic sclk;   // serial clock: master drives, idles low between frames
  logic cs_n;   // chip select active-low: drive low to begin a transaction
  logic mosi;   // master out -> slave in: byte leaving the master
  logic miso;   // slave out -> master in: byte arriving from slave
endinterface

// Instantiate in testbench -- () required even with no ports:
//   spi_if vif();
//   vif.cs_n = 0;        <- drive a signal
//   logic x = vif.miso;  <- read a signal

// Pass to a class via virtual interface handle:
//   class my_driver;
//     virtual spi_if vif;
//     function new(virtual spi_if v); vif = v; endfunction
//     task drive(); vif.cs_n = 0; endtask
//   endclass
//   // In tb: my_driver drv = new(vif);
`,

      design:
`// Chapter 4: write the spi_if interface here.
// See Theory for what each signal does.
//
// Ports (all logic): sclk, cs_n, mosi, miso
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness -- do not edit this tab.
// Simulator: verilator (auto-selected). Options: --no-timing (auto-applied).
module tb;
  spi_if vif();   // instantiate interface

  initial begin
    $display("=== Chapter 4: spi_if ===");

    // Initialise all signals to idle state
    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0; vif.miso = 0;

    // Test 1: cs_n idles high (slave deselected)
    if (vif.cs_n === 1)
      $display("PASS [1] cs_n idles high (deselected)");
    else
      $display("FAIL [1] cs_n=%0b (expected 1)", vif.cs_n);

    // Test 2: assert cs_n low -- transaction begins
    vif.cs_n = 0;
    if (vif.cs_n === 0)
      $display("PASS [2] cs_n asserted low (transaction begins)");
    else
      $display("FAIL [2] cs_n=%0b (expected 0)", vif.cs_n);

    // Test 3: drive mosi high
    vif.mosi = 1;
    if (vif.mosi === 1)
      $display("PASS [3] mosi driven high");
    else
      $display("FAIL [3] mosi=%0b (expected 1)", vif.mosi);

    // Test 4: drive sclk high
    vif.sclk = 1;
    if (vif.sclk === 1)
      $display("PASS [4] sclk driven high");
    else
      $display("FAIL [4] sclk=%0b (expected 1)", vif.sclk);

    $display("PASS: spi_if works");
    $finish;
  end
endmodule`,

      expected: [
        'PASS [1] cs_n idles high',
        'PASS [3] mosi driven high',
        'PASS: spi_if works'
      ]
    }
  ]
});
