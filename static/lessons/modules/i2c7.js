(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c7',
  title: 'Multi-Master & Arbitration',
  icon: '⚖️',
  level: 'advanced',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Bus Arbitration Logic  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c7l1',
      title: 'L1 — Bus Arbitration Logic',
      theory: `
<h2>When two masters talk at the same time</h2>
<p>Inside a modern phone SoC there are typically three or four processors — an application CPU, a modem DSP, a sensor hub, and a power manager. All of them may need to query the same I²C temperature sensor or PMIC at the same instant. The I²C standard solves this without a central referee: any master can start a transfer whenever it thinks the bus is free, and a built-in hardware rule decides who wins without data corruption or bus lockup. That rule is <strong>arbitration</strong>.</p>

<pre class="code-block">Multi-master scenario (two masters start simultaneously):

Master A wants to send: 1 0 1 0 0 1 1 0  (0xA6)
Master B wants to send: 1 0 0 1 1 1 0 0  (0x9C)

Bit 0 (MSB): A drives 1, B drives 1  → bus = 1, both continue
Bit 1:       A drives 0, B drives 0  → bus = 0, both continue
Bit 2:       A drives 1, B drives 0  → bus = 0  ← A loses!
             A reads back SDA = 0, but A drove 1 → arb_lost!
             A stops immediately; B continues uninterrupted</pre>

<h2>Open-drain is the key</h2>
<p>Open-drain makes arbitration work for free. Think of it like a shared speaker system: if anyone presses the mute button the room goes silent regardless of how many people are trying to talk. On I²C, driving a 0 always wins over a 1 — a 0 pulls the wire to ground through a transistor, which overcomes any number of "released" (high-impedance) states. So the rule is simple: <em>if I try to send a 1 but the bus reads 0, someone else drove it low and they win</em>.</p>

<h3>The arbitration rule</h3>
<table class="truth-table">
  <tr><th>sda_out (we drive)</th><th>sda_in (bus reads)</th><th>arb_lost</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>We drove 0 and bus is 0 — we are still winning</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>We released and bus is high — we are still winning</td></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>We drove 0; other master also drove 0 — both still in</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>We tried to send 1 but bus is 0 — we lost arbitration</td></tr>
</table>

<h3>Key I²C arbitration property</h3>
<p>The winning master never knows arbitration happened — its data travels undisturbed. Only the losing master detects the loss (by reading back a different value than it sent) and backs off. There is no collison in the electrical sense; open-drain ensures that the two driven values merge to the lower value (0) harmlessly.</p>

<pre class="code-block">// Arbitration-lost condition (combinational):
assign arb_lost = tx_en &amp;&amp; sda_out &amp;&amp; ~sda_in;
//                  ^           ^          ^
//                active    drove 1    bus is 0</pre>

<p>The module must also latch the loss event into a registered <code>arb_lost_r</code> flag so the master FSM can act on it at any time, and then clear it when <code>clear</code> is asserted.</p>

<h2>Before you code</h2>
<p>You are about to build a combinational arbitration detector. It watches one wire that the local master is driving (<code>sda_out</code>) and one wire that reads the actual bus (<code>sda_in</code>). Whenever the master tried to release the bus (drive 1) but finds it is being held low by another master, it raises the <code>arb_lost</code> flag immediately, and a registered version <code>arb_lost_r</code> sticks until the master clears it. This is exactly what happens inside every Linux I²C driver when the kernel logs "arbitration lost".</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock used to register the sticky loss flag.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset that clears all state.</td></tr>
  <tr><td><code>tx_en</code></td><td>input logic</td><td>1 when this master is actively driving the bus (not in IDLE).</td></tr>
  <tr><td><code>sda_out</code></td><td>input logic</td><td>The bit this master intends to send (1 = release, 0 = pull low).</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>What we actually read back from the shared SDA bus wire.</td></tr>
  <tr><td><code>clear</code></td><td>input logic</td><td>Pulse high to clear the sticky arb_lost_r flag after the master backs off.</td></tr>
  <tr><td><code>arb_lost</code></td><td>output logic</td><td>Combinational: goes high the instant arbitration is lost this cycle.</td></tr>
  <tr><td><code>arb_lost_r</code></td><td>output logic</td><td>Registered sticky flag: stays high after a loss until clear is pulsed.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_arbitrate with ports: clk, rst, tx_en, sda_out, sda_in, clear (inputs); arb_lost, arb_lost_r (outputs)',
        'Add a combinational assign: arb_lost = tx_en && sda_out && ~sda_in',
        'Add an always_ff @(posedge clk) block for the registered sticky flag',
        'Inside the always_ff: if (!rst) clear arb_lost_r to 0',
        'Inside the always_ff: else if (clear) clear arb_lost_r to 0',
        'Inside the always_ff: else if (arb_lost) set arb_lost_r to 1',
        'Close the always_ff block and add endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_arbitrate (
  input  logic clk,
  input  logic rst,       // synchronous active-low reset
  input  logic tx_en,     // 1 = this master is actively transmitting
  input  logic sda_out,   // bit this master wants to send (1 = release)
  input  logic sda_in,    // actual bus value read back
  input  logic clear,     // pulse to clear sticky arb_lost_r
  output logic arb_lost,  // combinational: 1 when we try to send 1 but bus is 0
  output logic arb_lost_r // sticky: stays 1 after loss until cleared
);

  // Arbitration lost: we tried to release (sda_out=1) but bus is pulled low
  assign arb_lost = tx_en && sda_out && ~sda_in;

  // Register the loss event so the master FSM can react at any time
  always_ff @(posedge clk) begin
    if (!rst)
      arb_lost_r <= 1'b0;
    else if (clear)
      arb_lost_r <= 1'b0;   // master acknowledges loss, clears flag
    else if (arb_lost)
      arb_lost_r <= 1'b1;   // latch loss event
  end

endmodule`,
      design:
`// Build the i2c_arbitrate module here. See Theory for the full spec.
//
// Ports: clk, rst, tx_en, sda_out, sda_in, clear (inputs)
//        arb_lost (output) -- combinational
//        arb_lost_r (output) -- registered sticky flag
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, tx_en, sda_out, sda_in, clear;
  logic arb_lost, arb_lost_r;

  i2c_arbitrate dut (
    .clk(clk), .rst(rst),
    .tx_en(tx_en), .sda_out(sda_out), .sda_in(sda_in),
    .clear(clear),
    .arb_lost(arb_lost), .arb_lost_r(arb_lost_r)
  );

  initial begin
    \$display("=== I2C Arbitration Logic Test ===");
    rst = 0; tx_en = 0; sda_out = 1; sda_in = 1; clear = 0;
    @(posedge clk); #1;
    rst = 1;

    // Test 1: idle (tx_en=0), bus high — no loss
    tx_en = 0; sda_out = 1; sda_in = 1; #1;
    if (arb_lost === 1'b0)
      \$display("PASS  idle: no arb_lost");
    else
      \$display("FAIL  idle: arb_lost=%0b (expected 0)", arb_lost);

    // Test 2: driving 0, bus is 0 — no loss (we are winning)
    tx_en = 1; sda_out = 0; sda_in = 0; #1;
    if (arb_lost === 1'b0)
      \$display("PASS  driving 0, bus=0: no arb_lost");
    else
      \$display("FAIL  driving 0, bus=0: arb_lost=%0b (expected 0)", arb_lost);

    // Test 3: drove 1 but bus is 0 — arbitration lost!
    tx_en = 1; sda_out = 1; sda_in = 0; #1;
    if (arb_lost === 1'b1)
      \$display("PASS  drove 1 but bus=0: arb_lost asserted");
    else
      \$display("FAIL  drove 1 but bus=0: arb_lost=%0b (expected 1)", arb_lost);

    // Test 4: sticky flag latches and clears
    @(posedge clk); #1;  // register the loss into arb_lost_r
    sda_out = 1; sda_in = 1; tx_en = 0; // stop driving; loss gone combinationally
    @(posedge clk); #1;
    if (arb_lost_r === 1'b1) begin
      clear = 1; @(posedge clk); #1; clear = 0;
      @(posedge clk); #1;
      if (arb_lost_r === 1'b0)
        \$display("PASS  sticky flag cleared by clear pulse");
      else
        \$display("FAIL  sticky flag not cleared: arb_lost_r=%0b", arb_lost_r);
    end else begin
      \$display("FAIL  sticky flag not set: arb_lost_r=%0b (expected 1)", arb_lost_r);
    end

    \$display("Arbitration logic works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: no arb_lost',
        'PASS  drove 1 but bus=0: arb_lost asserted',
        'PASS  sticky flag cleared by clear pulse',
        'Arbitration logic works!'
      ]
    },

    // L2 added next
  ]
});
