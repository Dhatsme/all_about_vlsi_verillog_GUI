// i2c1.js — I²C Open-Drain Fundamentals (6 lessons, Tier 1–2)
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c1',
  title: 'I²C Open-Drain Fundamentals',
  icon: '🔗',
  level: 'beginner',
  lessons: [

  // ── L1 ──────────────────────────────────────────────────────────────────
  {
    id: 'i2c1l1',
    title: 'L1 — What is I²C? The Wire-AND Bus',
    theory: `
<h2>I²C — a two-wire serial bus</h2>
<p>I²C (Inter-Integrated Circuit) connects chips with just two wires: <strong>SDA</strong> (serial data) and <strong>SCL</strong> (serial clock). Multiple devices share both wires simultaneously. One Master drives the clock; one or more Slaves listen and respond.</p>

<pre class="code-block">// The two I²C wires:
//   SDA — Serial DAta   (data + address bits)
//   SCL — Serial CLock  (driven by the Master)</pre>

<pre class="code-block">        VDD (3.3 V)
         │         │
       [4kΩ]     [4kΩ]    ← pull-up resistors (external)
         │         │
SDA ─────┴──── Master ──── Slave A ──── Slave B
SCL ───────── Master ──── Slave A ──── Slave B</pre>

<h2>Wire-AND — the open-drain rule</h2>
<p>Every I²C device can only <strong>pull the wire LOW</strong> (drive 0) or <strong>release it</strong> (float). The pull-up resistor brings a released wire back to HIGH. If <em>anyone</em> pulls low, the entire bus reads LOW — this is called <strong>wire-AND</strong>.</p>
<p>Think of it like a rope tied to a spring: anyone can grab and pull it down, but only the spring (pull-up) brings it back up when everyone lets go.</p>

<div class="flow-diagram">
  <div class="flow-step">Device A<br>(0 or release)</div>
  <span class="flow-arrow">⇄</span>
  <div class="flow-step">SDA wire<br>(shared)</div>
  <span class="flow-arrow">⇄</span>
  <div class="flow-step">Device B<br>(0 or release)</div>
  <span class="flow-arrow">←</span>
  <div class="flow-step">Pull-up<br>to VDD</div>
</div>

<h2>Wire-AND truth table</h2>
<table class="truth-table">
  <tr><th>dev_a</th><th>dev_b</th><th>bus</th><th>Meaning</th></tr>
  <tr><td>1 (release)</td><td>1 (release)</td><td>1</td><td>Bus idle — pull-up wins</td></tr>
  <tr><td>1</td><td>0 (pull low)</td><td>0</td><td>B controls the bus</td></tr>
  <tr><td>0 (pull low)</td><td>1</td><td>0</td><td>A controls the bus</td></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>Both agree — still 0</td></tr>
</table>

<p>In SystemVerilog, <code>assign bus = dev_a &amp; dev_b</code> models this exactly: 1 = released, 0 = pulling low, AND = wire-AND (0 always wins).</p>

<h3>Step 1 — Module header</h3>
<pre class="code-block">module wire_and_demo (
  input  logic dev_a,
  input  logic dev_b,
  output logic bus
);</pre>

<h3>Step 2 — Wire-AND assign</h3>
<pre class="code-block">  assign bus = dev_a &amp; dev_b;</pre>

<h3>Step 3 — Close the module</h3>
<pre class="code-block">endmodule</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
    tasks: [
      'Code tab is blank — type every line.',
      'Step 1: Open the module — module wire_and_demo (',
      'Step 2: Add dev_a — input logic dev_a,  (trailing comma)',
      'Step 3: Add dev_b — input logic dev_b,  (trailing comma)',
      'Step 4: Add bus output — output logic bus  (NO comma, last port)',
      'Step 5: Close port list — ); on its own line',
      'Step 6: Wire-AND logic — assign bus = dev_a & dev_b;',
      'Step 7: Close — endmodule',
      'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
      'Hit Run — all 4 PASS lines should appear in the Output tab',
    ],
    hint:
`module wire_and_demo (
  input  logic dev_a,   // 1 = device releases bus, 0 = pulls low
  input  logic dev_b,   // same convention as dev_a
  output logic bus      // 0 if any device pulls low — wire-AND
);
  assign bus = dev_a & dev_b;  // AND models wire-AND: 0 always wins
endmodule`,
    design:
`// Type the wire_and_demo module here.
// Read Theory first — it explains the wire-AND bus principle.
//
// Ports:
//   input  logic dev_a   — 1 = released, 0 = pulling low
//   input  logic dev_b   — same convention
//   output logic bus     — wire-AND result (0 if anyone pulls low)
//
// Behaviour: bus = dev_a & dev_b
//
// Delete this and start typing:
`,
    testbench:
`\`timescale 1ns/1ps
module tb;
  logic dev_a, dev_b, bus;
  wire_and_demo dut (.dev_a(dev_a), .dev_b(dev_b), .bus(bus));

  task automatic check(input logic a, b, exp);
    dev_a = a; dev_b = b; #5;
    if (bus === exp)
      $display("PASS  dev_a=%0b dev_b=%0b -> bus=%0b", a, b, bus);
    else
      $display("FAIL  dev_a=%0b dev_b=%0b -> bus=%0b (expected %0b)", a, b, bus, exp);
  endtask

  initial begin
    $display("=== Wire-AND Bus Demo ===");
    check(1, 1, 1);  // both release  -> pull-up: HIGH
    check(1, 0, 0);  // B pulls low   -> LOW
    check(0, 1, 0);  // A pulls low   -> LOW
    check(0, 0, 0);  // both pull low -> LOW
    $display("Wire-AND works!");
    $finish;
  end
endmodule`,
    expected: [
      'PASS  dev_a=1 dev_b=1 -> bus=1',
      'PASS  dev_a=0 dev_b=0 -> bus=0',
      'Wire-AND works!',
    ],
  },

  // ── L2 ──────────────────────────────────────────────────────────────────
  {
    id: 'i2c1l2',
    title: 'L2 — The Open-Drain IO Cell',
    theory: `
<h2>The open-drain IO cell</h2>
<p>Every I²C device needs a standard IO cell. It has two modes: <strong>drive the bus LOW</strong> (pull SDA to 0) or <strong>release it</strong> (output <code>1'bz</code>, high-impedance). Never actively drive HIGH — the pull-up resistor does that automatically.</p>

<pre class="code-block">// Release (high-Z): no driver → pull-up brings line to 1
assign sda = 1'bz;

// Drive low: actively pull the wire to 0
assign sda = 1'b0;</pre>

<h2>The tristate conditional assign</h2>
<p>Combine both behaviours in one assign using a ternary:</p>
<pre class="code-block">// Drive 0 only when enabled AND sending a 0; else release
assign sda = (tx_en &amp;&amp; !tx_data) ? 1'b0 : 1'bz;</pre>

<div class="flow-diagram">
  <div class="flow-step">tx_en<br>tx_data</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">Tristate<br>Driver<br>(? 0 : z)</div>
  <span class="flow-arrow">⇄</span>
  <div class="flow-step">SDA<br>(inout wire)</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">rx_data<br>= sda</div>
</div>

<h2>inout wire — the bidirectional port</h2>
<p>SDA is the same physical pin for both driving AND reading. In SystemVerilog, bidirectional ports use <strong><code>inout wire</code></strong>. Using <code>logic</code> for an inout port is not supported for tristate — always use <code>wire</code>.</p>

<h3>Step 1 — Module header with all 4 ports</h3>
<pre class="code-block">module open_drain_cell (
  input  logic tx_en,
  input  logic tx_data,
  inout  wire  sda,
  output logic rx_data
);</pre>

<h3>Step 2 — Drive or release the bus</h3>
<p>When <code>tx_en=1</code> and <code>tx_data=0</code> we pull SDA low. Any other combination: release.</p>
<pre class="code-block">  assign sda = (tx_en &amp;&amp; !tx_data) ? 1'b0 : 1'bz;</pre>

<h3>Step 3 — Read back from the bus</h3>
<pre class="code-block">  assign rx_data = sda;</pre>

<h3>Step 4 — Close the module</h3>
<pre class="code-block">endmodule</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
    tasks: [
      'Code tab is blank — type every line.',
      'Step 1: Open the module header — module open_drain_cell (',
      'Step 2: Add tx_en input — input logic tx_en,  (trailing comma)',
      'Step 3: Add tx_data input — input logic tx_data,  (trailing comma)',
      'Step 4: Add sda inout — inout wire sda,  (trailing comma)',
      'Step 5: Add rx_data output — output logic rx_data  (NO comma, last port)',
      'Step 6: Close port list — ); on its own line',
      'Step 7: Tristate assign — assign sda = (tx_en && !tx_data) ? 1\'b0 : 1\'bz;',
      'Step 8: Readback — assign rx_data = sda;',
      'Step 9: Close — endmodule',
      'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
      'Hit Run — all 3 PASS lines should appear in the Output tab',
    ],
    hint:
`module open_drain_cell (
  input  logic tx_en,    // 1 = this device is transmitting
  input  logic tx_data,  // the bit to send (0 = pull low, 1 = release)
  inout  wire  sda,      // bidirectional — MUST be wire, not logic
  output logic rx_data   // what we read back from the bus
);
  // Only pull low when enabled AND sending a 0
  // All other cases: float (1'bz) — never actively drive HIGH
  assign sda     = (tx_en && !tx_data) ? 1'b0 : 1'bz;
  assign rx_data = sda;   // read back whatever is on the bus
endmodule`,
    design:
`// Type the open_drain_cell module here.
// Read Theory first — it explains tristate (1'bz) drivers.
//
// Ports:
//   input  logic tx_en    — 1 = this device is transmitting
//   input  logic tx_data  — bit to send (0 = pull low, 1 = release)
//   inout  wire  sda      — bidirectional bus wire (NOT logic!)
//   output logic rx_data  — bus readback
//
// Key assign: sda = (tx_en && !tx_data) ? 1'b0 : 1'bz;
//
// Delete this and start typing:
`,
    testbench:
`\`timescale 1ns/1ps
module tb;
  wire  sda;           // inout must be wire in testbench
  pullup pu(sda);      // simulates external 4.7 kΩ pull-up resistor

  logic tx_en, tx_data, rx_data;
  open_drain_cell dut (
    .tx_en(tx_en), .tx_data(tx_data),
    .sda(sda),     .rx_data(rx_data)
  );

  initial begin
    $display("=== Open-Drain IO Cell ===");

    // Released (tx_en=0): pull-up brings sda HIGH
    tx_en = 0; tx_data = 0; #5;
    if (rx_data === 1)
      $display("PASS  released: sda=%0b (pull-up active)", rx_data);
    else
      $display("FAIL  released: sda=%0b (expected 1)", rx_data);

    // tx_data=1 while enabled: still releases (open-drain never drives HIGH)
    tx_en = 1; tx_data = 1; #5;
    if (rx_data === 1)
      $display("PASS  tx_data=1: sda=%0b (released)", rx_data);
    else
      $display("FAIL  tx_data=1: sda=%0b (expected 1)", rx_data);

    // tx_data=0 while enabled: pull bus LOW
    tx_en = 1; tx_data = 0; #5;
    if (rx_data === 0)
      $display("PASS  tx_data=0: sda=%0b (driven LOW)", rx_data);
    else
      $display("FAIL  tx_data=0: sda=%0b (expected 0)", rx_data);

    $display("IO cell works!");
    $finish;
  end
endmodule`,
    expected: [
      'PASS  released: sda=1',
      'PASS  tx_data=0: sda=0',
      'IO cell works!',
    ],
  },

  // ── L3 ──────────────────────────────────────────────────────────────────
  {
    id: 'i2c1l3',
    title: 'L3 — Pull-Up Resistors in Simulation',
    theory: `
<h2>Why pullup matters in simulation</h2>
<p>A real PCB has a physical resistor tied to VDD. In Verilator, a released <code>wire</code> floats to <code>z</code> (displayed as <code>x</code> in $display). You must add the <strong><code>pullup</code> primitive</strong> in your testbench to model the resistor.</p>

<pre class="code-block">wire sda;
pullup pu(sda);   // models external 4.7 kΩ resistor to VDD</pre>

<div class="flow-diagram">
  <div class="flow-step">VDD</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">pullup<br>pu(sda)</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">sda wire<br>(shared)</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">DUT<br>inout port</div>
</div>

<h2>Wire vs logic for inout</h2>
<table class="truth-table">
  <tr><th>Situation</th><th>sda type</th><th>Result</th></tr>
  <tr><td>DUT releases + pullup</td><td>wire</td><td>1 ✓ correct</td></tr>
  <tr><td>DUT releases, no pullup</td><td>wire</td><td>z → shows as x ✗</td></tr>
  <tr><td>DUT drives 0 + pullup</td><td>wire</td><td>0 ✓ driver wins</td></tr>
</table>

<p>A <code>wire</code> resolves multiple drivers using the 4-state table. A <code>logic</code> cannot have two simultaneous drivers — so inout always needs <code>wire</code>.</p>

<h2>Adding a <code>driving</code> status output</h2>
<p>This lesson extends the IO cell with a <strong><code>driving</code></strong> output: a flag that is HIGH whenever the cell is actively pulling the bus low. Useful for debugging — you can instantly see which device is holding the bus.</p>

<pre class="code-block">output logic driving   // 1 = we are actively pulling bus low</pre>

<h3>Step 1 — Module header with 5th port</h3>
<pre class="code-block">module io_cell_v2 (
  input  logic tx_en,
  input  logic tx_data,
  inout  wire  sda,
  output logic rx_data,
  output logic driving
);</pre>

<h3>Step 2 — Tristate assign (same pattern as L2)</h3>
<pre class="code-block">  assign sda     = (tx_en &amp;&amp; !tx_data) ? 1'b0 : 1'bz;
  assign rx_data = sda;</pre>

<h3>Step 3 — Driving flag</h3>
<pre class="code-block">  assign driving = tx_en &amp;&amp; !tx_data;</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
    tasks: [
      'Code tab is blank — type every line.',
      'Step 1: Module header — io_cell_v2 with 5 ports',
      'Step 2: tx_en and tx_data — input logic; sda — inout wire',
      'Step 3: rx_data and driving — both output logic  (NO comma on last port)',
      'Step 4: Close port list — ); on its own line',
      'Step 5: Tristate assign — same pattern as L2: assign sda = (tx_en && !tx_data) ? 1\'b0 : 1\'bz;',
      'Step 6: Readback — assign rx_data = sda;',
      'Step 7: Driving flag — assign driving = tx_en && !tx_data;',
      'Step 8: Close — endmodule',
      'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
      'Hit Run — all 3 PASS lines should appear in the Output tab',
    ],
    hint:
`module io_cell_v2 (
  input  logic tx_en,
  input  logic tx_data,
  inout  wire  sda,
  output logic rx_data,
  output logic driving    // 1 = actively pulling bus low
);
  assign sda     = (tx_en && !tx_data) ? 1'b0 : 1'bz;
  assign rx_data = sda;
  assign driving = tx_en && !tx_data;   // same condition as the driver
endmodule`,
    design:
`// Type the io_cell_v2 module here.
// Extends open_drain_cell with a 'driving' status output.
//
// Ports:
//   input  logic tx_en
//   input  logic tx_data
//   inout  wire  sda         — MUST be wire
//   output logic rx_data
//   output logic driving     — 1 when actively pulling bus low
//
// Delete this and start typing:
`,
    testbench:
`\`timescale 1ns/1ps
module tb;
  wire  sda;            // wire — required for pullup + inout
  pullup pu(sda);       // without this, released sda = x, not 1

  logic tx_en, tx_data, rx_data, driving;
  io_cell_v2 dut (
    .tx_en(tx_en), .tx_data(tx_data),
    .sda(sda), .rx_data(rx_data), .driving(driving)
  );

  initial begin
    $display("=== IO Cell v2 with Driving Flag ===");

    // Released: pull-up makes sda=1, driving=0
    tx_en = 0; tx_data = 0; #5;
    if (rx_data === 1 && driving === 0)
      $display("PASS  released: sda=%0b driving=%0b", rx_data, driving);
    else
      $display("FAIL  released: sda=%0b driving=%0b", rx_data, driving);

    // Driving low: sda=0, driving=1
    tx_en = 1; tx_data = 0; #5;
    if (rx_data === 0 && driving === 1)
      $display("PASS  driving low: sda=%0b driving=%0b", rx_data, driving);
    else
      $display("FAIL  driving low: sda=%0b driving=%0b", rx_data, driving);

    // tx_data=1 (release): sda=1, driving=0
    tx_en = 1; tx_data = 1; #5;
    if (rx_data === 1 && driving === 0)
      $display("PASS  tx=1 release: sda=%0b driving=%0b", rx_data, driving);
    else
      $display("FAIL  tx=1 release: sda=%0b driving=%0b", rx_data, driving);

    $display("IO cell v2 works!");
    $finish;
  end
endmodule`,
    expected: [
      'PASS  released: sda=1 driving=0',
      'PASS  driving low: sda=0 driving=1',
      'IO cell v2 works!',
    ],
  },

  // ── L4 ──────────────────────────────────────────────────────────────────
  {
    id: 'i2c1l4',
    title: 'L4 — Reading Back and Detecting Collisions',
    theory: `
<h2>Why read back from the bus?</h2>
<p>On a shared I²C bus, two Masters may try to transmit at the same time. A Master that reads back the bus while transmitting can detect when another device overrides it — this is called <strong>arbitration loss</strong>.</p>
<p>The rule: if you sent a 1 (released) but the bus reads back 0, another device is pulling it low. You lost arbitration and must back off.</p>

<pre class="code-block">// Collision: we released (tx_data=1) but bus is LOW (sda=0)
collision = tx_en &amp;&amp; tx_data &amp;&amp; (sda === 1'b0);</pre>

<div class="flow-diagram">
  <div class="flow-step">tx_en<br>tx_data</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">Tristate<br>driver</div>
  <span class="flow-arrow">⇄</span>
  <div class="flow-step">SDA<br>wire</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">rx_data<br>collision<br>detect</div>
</div>

<h2>Collision truth table</h2>
<table class="truth-table">
  <tr><th>tx_en</th><th>tx_data</th><th>sda (actual)</th><th>collision</th></tr>
  <tr><td>0</td><td>x</td><td>1 (idle)</td><td>0 — not transmitting</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>0 — we drove it low, expected</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>0 — we released, bus idle</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>1 — we released but someone else drove LOW!</td></tr>
</table>

<h3>Step 1 — Module header with collision port</h3>
<pre class="code-block">module io_cell_readback (
  input  logic tx_en,
  input  logic tx_data,
  inout  wire  sda,
  output logic rx_data,
  output logic collision
);</pre>

<h3>Step 2 — Tristate + readback assigns</h3>
<pre class="code-block">  assign sda     = (tx_en &amp;&amp; !tx_data) ? 1'b0 : 1'bz;
  assign rx_data = sda;</pre>

<h3>Step 3 — Collision detection</h3>
<pre class="code-block">  assign collision = tx_en &amp;&amp; tx_data &amp;&amp; (sda === 1'b0);</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
    tasks: [
      'Code tab is blank — type every line.',
      'Step 1: Module header — io_cell_readback with 5 ports',
      'Step 2: tx_en and tx_data — input logic; sda — inout wire; rx_data and collision — output logic',
      'Step 3: Close port list — );',
      'Step 4: Tristate assign — assign sda = (tx_en && !tx_data) ? 1\'b0 : 1\'bz;',
      'Step 5: Readback — assign rx_data = sda;',
      'Step 6: Collision — assign collision = tx_en && tx_data && (sda === 1\'b0);',
      'Step 7: Close — endmodule',
      'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
      'Hit Run — all 3 PASS lines should appear in the Output tab',
    ],
    hint:
`module io_cell_readback (
  input  logic tx_en,
  input  logic tx_data,
  inout  wire  sda,
  output logic rx_data,
  output logic collision   // high when we released but bus is still low
);
  assign sda       = (tx_en && !tx_data) ? 1'b0 : 1'bz;
  assign rx_data   = sda;
  // Collision: we tried to send 1 (release) but bus reads 0
  assign collision = tx_en && tx_data && (sda === 1'b0);
endmodule`,
    design:
`// Type the io_cell_readback module here.
// Adds arbitration-loss (collision) detection to the IO cell.
//
// Ports:
//   input  logic tx_en
//   input  logic tx_data
//   inout  wire  sda
//   output logic rx_data
//   output logic collision   — 1 when we sent 1 but bus reads 0
//
// collision = tx_en && tx_data && (sda === 1'b0)
//
// Delete this and start typing:
`,
    testbench:
`\`timescale 1ns/1ps
module tb;
  wire  sda;
  pullup pu(sda);

  logic tx_en, tx_data, rx_data, collision;
  io_cell_readback dut (
    .tx_en(tx_en), .tx_data(tx_data),
    .sda(sda), .rx_data(rx_data), .collision(collision)
  );

  // Second driver to force a collision
  logic force_low;
  assign sda = force_low ? 1'b0 : 1'bz;

  initial begin
    $display("=== IO Cell Readback + Collision Test ===");
    force_low = 0;

    // Not transmitting: no collision
    tx_en = 0; tx_data = 0; #5;
    if (collision === 0)
      $display("PASS  idle: collision=%0b", collision);
    else
      $display("FAIL  idle: collision=%0b (expected 0)", collision);

    // Driving low ourselves: no collision
    tx_en = 1; tx_data = 0; #5;
    if (rx_data === 0 && collision === 0)
      $display("PASS  drive low: sda=%0b collision=%0b", rx_data, collision);
    else
      $display("FAIL  drive low: sda=%0b collision=%0b", rx_data, collision);

    // We release (tx_data=1) but another device forces low
    tx_en = 1; tx_data = 1; force_low = 1; #5;
    if (collision === 1)
      $display("PASS  collision detected: sda=%0b collision=%0b", rx_data, collision);
    else
      $display("FAIL  collision missed: sda=%0b collision=%0b", rx_data, collision);

    $display("Collision detection works!");
    $finish;
  end
endmodule`,
    expected: [
      'PASS  idle: collision=0',
      'PASS  collision detected',
      'Collision detection works!',
    ],
  },

  // ── L5 ──────────────────────────────────────────────────────────────────
  {
    id: 'i2c1l5',
    title: 'L5 — Wire-AND: Two Drivers on One Bus',
    theory: `
<h2>Multiple drivers on a single wire</h2>
<p>The real power of open-drain emerges when <strong>two devices share one wire</strong>. In SystemVerilog, a <code>wire</code> net with multiple <code>assign</code> statements resolves the result using the standard 4-state table: <strong>0 beats z</strong>.</p>

<pre class="code-block">// Two assigns to the SAME wire — legal for wire (not logic)
assign sda = (en_a &amp;&amp; !data_a) ? 1'b0 : 1'bz;  // driver A
assign sda = (en_b &amp;&amp; !data_b) ? 1'b0 : 1'bz;  // driver B
// Result: 0 if either drives low; z (→1 via pullup) if both release</pre>

<pre class="code-block">        VDD
         │
       [4kΩ]  pullup
         │
sda ─────┴──── Driver A (en_a, data_a)
         │
         └──── Driver B (en_b, data_b)

Resolution: 0 wins over z.  z+z → pulled to 1 by pullup.</pre>

<h2>Why this works only for wire</h2>
<p>A <code>logic</code> net with two drivers produces an error (or x). A <code>wire</code> uses the built-in resolution function: the strongest driver wins, and 0 is stronger than z.</p>

<h3>Step 1 — Module header with dual drivers</h3>
<pre class="code-block">module dual_driver (
  input  logic en_a, data_a,
  input  logic en_b, data_b,
  inout  wire  sda
);</pre>

<h3>Step 2 — Two assigns to the same wire</h3>
<pre class="code-block">  assign sda = (en_a &amp;&amp; !data_a) ? 1'b0 : 1'bz;
  assign sda = (en_b &amp;&amp; !data_b) ? 1'b0 : 1'bz;</pre>

<h3>Step 3 — Close the module</h3>
<pre class="code-block">endmodule</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,
    tasks: [
      'Code tab is blank — type every line.',
      'Step 1: Module header — dual_driver with 5 ports',
      'Step 2: en_a, data_a, en_b, data_b — all input logic; sda — inout wire  (NO comma on last port)',
      'Step 3: Close port list — );',
      'Step 4: First driver assign — assign sda = (en_a && !data_a) ? 1\'b0 : 1\'bz;',
      'Step 5: Second driver assign — assign sda = (en_b && !data_b) ? 1\'b0 : 1\'bz;',
      'Step 6: Close — endmodule',
      'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
      'Hit Run — all 4 PASS lines should appear in the Output tab',
    ],
    hint:
`module dual_driver (
  input  logic en_a, data_a,   // driver A control
  input  logic en_b, data_b,   // driver B control
  inout  wire  sda              // shared bus — wire supports multiple assigns
);
  // Two assigns to the SAME wire: legal for wire, illegal for logic
  assign sda = (en_a && !data_a) ? 1'b0 : 1'bz;
  assign sda = (en_b && !data_b) ? 1'b0 : 1'bz;
  // Resolution: 0 beats z. If both release, pullup wins (→1).
endmodule`,
    design:
`// Type the dual_driver module here.
// Shows two independent open-drain assigns to the SAME inout wire.
//
// Ports:
//   input  logic en_a, data_a   — driver A
//   input  logic en_b, data_b   — driver B
//   inout  wire  sda            — shared bus
//
// Two assign lines to sda — legal because it is a wire, not logic.
//
// Delete this and start typing:
`,
    testbench:
`\`timescale 1ns/1ps
module tb;
  wire  sda;
  pullup pu(sda);

  logic en_a, data_a, en_b, data_b;
  logic bus_level;
  dual_driver dut (
    .en_a(en_a), .data_a(data_a),
    .en_b(en_b), .data_b(data_b),
    .sda(sda)
  );
  assign bus_level = sda;

  task automatic check(
    input logic ea, da, eb, db, exp;
    input string label
  );
    en_a=ea; data_a=da; en_b=eb; data_b=db; #5;
    if (bus_level === exp)
      $display("PASS  %s: sda=%0b", label, bus_level);
    else
      $display("FAIL  %s: sda=%0b (expected %0b)", label, bus_level, exp);
  endtask

  initial begin
    $display("=== Dual-Driver Wire-AND Test ===");
    check(0,0, 0,0, 1, "both release");
    check(1,0, 0,0, 0, "A pulls low");
    check(0,0, 1,0, 0, "B pulls low");
    check(1,0, 1,0, 0, "both pull low");
    $display("Dual driver wire-AND works!");
    $finish;
  end
endmodule`,
    expected: [
      'PASS  both release: sda=1',
      'PASS  A pulls low: sda=0',
      'Dual driver wire-AND works!',
    ],
  },

  // ── L6 ──────────────────────────────────────────────────────────────────
  {
    id: 'i2c1l6',
    title: 'L6 — START and STOP Conditions',
    theory: `
<h2>START and STOP — the I²C frame markers</h2>
<p>Every I²C transaction begins with a <strong>START condition</strong> and ends with a <strong>STOP condition</strong>. These are the <em>only</em> times SDA changes while SCL is HIGH. During normal data transfer, SDA only changes while SCL is LOW.</p>

<pre class="code-block">// START: SDA falls (1→0) while SCL is HIGH
start_det = scl &amp;&amp; !sda &amp;&amp; sda_prev;

// STOP:  SDA rises (0→1) while SCL is HIGH
stop_det  = scl &amp;&amp; sda &amp;&amp; !sda_prev;</pre>

<pre class="code-block">SCL: ──────┐      ┌────────────┐      ┌──────
SDA: ───┐  │      │        ┌───┘      │
        │START         STOP│
     SDA↓ while SCL=1   SDA↑ while SCL=1</pre>

<div class="flow-diagram">
  <div class="flow-step">scl<br>sda<br>sda_prev</div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">start_det<br>scl &amp;&amp;<br>!sda &amp;&amp; sda_prev</div>
  <span class="flow-arrow">+</span>
  <div class="flow-step">stop_det<br>scl &amp;&amp;<br>sda &amp;&amp; !sda_prev</div>
</div>

<h2>Condition table</h2>
<table class="truth-table">
  <tr><th>scl</th><th>sda_prev</th><th>sda</th><th>start_det</th><th>stop_det</th></tr>
  <tr><td>0</td><td>x</td><td>x</td><td>0</td><td>0 — SCL low, ignore</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>0</td><td>0 — stable HIGH</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>0</td><td>0 — stable LOW</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>1</td><td>0 — START</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1 — STOP</td></tr>
</table>

<h3>Step 1 — Module header</h3>
<pre class="code-block">module start_stop_detect (
  input  logic scl,
  input  logic sda,
  input  logic sda_prev,
  output logic start_det,
  output logic stop_det
);</pre>

<h3>Step 2 — START detection</h3>
<pre class="code-block">  assign start_det = scl &amp;&amp; !sda &amp;&amp; sda_prev;</pre>

<h3>Step 3 — STOP detection</h3>
<pre class="code-block">  assign stop_det  = scl &amp;&amp; sda &amp;&amp; !sda_prev;</pre>

<h3>Step 4 — Close</h3>
<pre class="code-block">endmodule</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
<p>In the next chapter you will build the SCL clock generator and the precise bit timing that makes START and STOP reliable.</p>`,
    tasks: [
      'Code tab is blank — type every line.',
      'Step 1: Module header — start_stop_detect with 5 ports',
      'Step 2: scl, sda, sda_prev — input logic; start_det, stop_det — output logic',
      'Step 3: Close port list — );',
      'Step 4: START detect — assign start_det = scl && !sda && sda_prev;',
      'Step 5: STOP detect  — assign stop_det  = scl && sda && !sda_prev;',
      'Step 6: Close — endmodule',
      'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
      'Hit Run — all 5 PASS lines should appear in the Output tab',
    ],
    hint:
`module start_stop_detect (
  input  logic scl,
  input  logic sda,
  input  logic sda_prev,   // SDA value sampled one step ago
  output logic start_det,  // 1 on START condition
  output logic stop_det    // 1 on STOP condition
);
  // START: SDA falls (was 1, now 0) while SCL is HIGH
  assign start_det = scl && !sda && sda_prev;
  // STOP: SDA rises (was 0, now 1) while SCL is HIGH
  assign stop_det  = scl && sda && !sda_prev;
endmodule`,
    design:
`// Type the start_stop_detect module here.
// Read Theory first — it explains START and STOP conditions.
//
// Ports:
//   input  logic scl       — clock line (1 = high)
//   input  logic sda       — current data line value
//   input  logic sda_prev  — data line value from previous sample
//   output logic start_det — 1 when START condition detected
//   output logic stop_det  — 1 when STOP condition detected
//
// START: SDA falls while SCL is HIGH  -> scl && !sda && sda_prev
// STOP:  SDA rises while SCL is HIGH  -> scl && sda && !sda_prev
//
// Delete this and start typing:
`,
    testbench:
`\`timescale 1ns/1ps
module tb;
  logic scl, sda, sda_prev;
  logic start_det, stop_det;

  start_stop_detect dut (
    .scl(scl), .sda(sda), .sda_prev(sda_prev),
    .start_det(start_det), .stop_det(stop_det)
  );

  task automatic check(
    input logic s, d, dp, es, ep;
    input string label
  );
    scl=s; sda=d; sda_prev=dp; #5;
    if (start_det===es && stop_det===ep)
      $display("PASS  %s: start=%0b stop=%0b", label, start_det, stop_det);
    else
      $display("FAIL  %s: start=%0b stop=%0b (exp %0b/%0b)",
               label, start_det, stop_det, es, ep);
  endtask

  initial begin
    $display("=== START/STOP Detect Test ===");
    check(0,0,1, 0,0, "SCL low: no detect");
    check(1,1,1, 0,0, "stable HIGH: no detect");
    check(1,0,0, 0,0, "stable LOW: no detect");
    check(1,0,1, 1,0, "START: SDA 1->0 while SCL=1");
    check(1,1,0, 0,1, "STOP:  SDA 0->1 while SCL=1");
    $display("START/STOP detection works!");
    $finish;
  end
endmodule`,
    expected: [
      'PASS  START: SDA 1->0 while SCL=1: start=1 stop=0',
      'PASS  STOP:  SDA 0->1 while SCL=1: start=0 stop=1',
      'START/STOP detection works!',
    ],
  },

  ]  // end lessons
});
