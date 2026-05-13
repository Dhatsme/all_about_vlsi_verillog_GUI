// Module SV1 — Getting Started with SystemVerilog
// One lesson: anatomy of a module → user types a complete rain alarm from scratch.
// Verilator 5.020 safe: logic type, always_comb, basic operators only.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv1',
  title: 'Getting Started with SystemVerilog',
  icon: '🚦',
  level: 'beginner',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────
    // L1 — Read a complete module, understand every line.
    // The code is fully written. Student reads, studies, then hits Run.
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv1l1',
      title: 'L1 — Anatomy of a Module',
      theory: `
<h2>Welcome to SystemVerilog</h2>
<p>SystemVerilog is a language for describing <strong>hardware</strong> — not programs that run step by step,
but circuits that exist physically and react to signals instantly.
Everything you write becomes gates, wires, and flip-flops on a chip.</p>

<h2>The module — your basic building block</h2>
<p>In SystemVerilog, every circuit is a <strong>module</strong>. Think of a module exactly like a chip
you'd buy at an electronics store: it has <em>input pins</em>, <em>output pins</em>,
and logic inside connecting them.</p>

<pre class="code-block">module  chip_name  ( port_list );

  // — logic lives here —

endmodule</pre>

<table class="truth-table">
  <tr><th>Part</th><th>What it does</th></tr>
  <tr><td><code>module</code></td><td>Opens a new hardware block — like drawing a chip boundary</td></tr>
  <tr><td><code>chip_name</code></td><td>You choose the name — describes what the circuit does</td></tr>
  <tr><td><code>( port_list );</code></td><td>The pins — each input and output listed here</td></tr>
  <tr><td><code>endmodule</code></td><td>Closes the boundary — every module must have one</td></tr>
</table>

<h2>Ports — the pins on the chip</h2>
<p>Each port has three words: <strong>direction</strong>, <strong>type</strong>, <strong>name</strong>.</p>
<pre class="code-block">  input  logic raining,     // direction=input  type=logic  name=raining
  input  logic window_open, // direction=input  type=logic  name=window_open
  output logic alert        // direction=output type=logic  name=alert
  //                  ↑
  //        NO comma on the last port — this is a common mistake</pre>

<table class="truth-table">
  <tr><th>Keyword</th><th>Meaning</th></tr>
  <tr><td><code>input</code></td><td>Signal comes <em>into</em> this module from outside</td></tr>
  <tr><td><code>output</code></td><td>Signal goes <em>out</em> of this module to the outside</td></tr>
  <tr><td><code>logic</code></td><td>The universal signal type in SystemVerilog — use it for everything</td></tr>
</table>

<h3>Why <code>logic</code> and not <code>wire</code>?</h3>
<p>Older Verilog used <code>wire</code> for outputs of gates and <code>reg</code> for outputs of procedural
blocks — confusing rules that led to bugs. SystemVerilog replaces both with a single
keyword: <code>logic</code>. It works everywhere. Just use <code>logic</code> for every signal.</p>

<h2>always_comb — where combinational logic lives</h2>
<p><code>always_comb</code> is a procedural block that describes <strong>combinational logic</strong> — logic
that has no clock and whose output depends only on the current inputs.
Every time an input changes, the block re-evaluates instantly.</p>

<pre class="code-block">  always_comb begin
    alert = raining &amp; window_open;   // &amp; means AND
  end</pre>

<table class="truth-table">
  <tr><th>Operator</th><th>Gate</th><th>Example</th></tr>
  <tr><td><code>&amp;</code></td><td>AND</td><td><code>a &amp; b</code> — 1 only when both a=1 AND b=1</td></tr>
  <tr><td><code>|</code></td><td>OR</td><td><code>a | b</code> — 1 when a=1 OR b=1 (or both)</td></tr>
  <tr><td><code>~</code></td><td>NOT</td><td><code>~a</code> — flips the bit: 0→1, 1→0</td></tr>
  <tr><td><code>^</code></td><td>XOR</td><td><code>a ^ b</code> — 1 when a and b are different</td></tr>
</table>

<h2>This lesson — read every line, then hit Run</h2>
<p>The design tab contains a <strong>complete, working rain alarm</strong>.
Every line is annotated. Read each line carefully — you will write code
exactly like this yourself in the very next lesson.</p>
<p>After reading, switch to the Testbench tab and read that too.
Then hit <strong>Run</strong> — watch the four test cases print in the console.</p>
      `,
      tasks: [
        'Open the Design tab — read every single annotated line top to bottom',
        'Find the keyword module on line 1 and the name rain_alarm',
        'Find the two input ports: raining and window_open — both use type logic',
        'Find the output port: alert — notice there is NO comma after it (it is the last port)',
        'Find ); on its own line — this semicolon closes the port list, not a curly brace',
        'Find the always_comb begin block — this is where combinational logic lives',
        'Read the logic: alert = raining & window_open — the & is the AND operator',
        'Find end — this closes the always_comb block',
        'Find endmodule at the bottom — the module boundary is now closed',
        'Switch to the Testbench tab — read how it declares logic signals and connects the DUT',
        'Hit Run — all four cases should print PASS',
        'Notice case 3: raining=1, window_open=1 → alert=1 (rain AND open window = danger!)'
      ],
      hint: 'Nothing to change this lesson — just read and run. The next lesson starts blank!',
      design:
`// ──────────────────────────────────────────────────────────────
//  COMPLETE CODE — read every annotated line, then hit Run.
//  You will write code just like this from scratch in Lesson 2.
// ──────────────────────────────────────────────────────────────

module rain_alarm (          // 'module' opens the circuit boundary
                             // 'rain_alarm' is the name of this module
  input  logic raining,      // pin 1: 1 = rain sensor detects rain
  input  logic window_open,  // pin 2: 1 = window is open
  output logic alert         // pin 3: 1 = sound the alarm  ← NO comma (last port)
);                           // ); closes the port list

  always_comb begin          // combinational block: re-evaluates when any input changes
    alert = raining & window_open;  // & is AND — alert only when BOTH are 1
  end                        // closes the always_comb block

endmodule                    // closes the module boundary`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic raining, window_open, alert;  // declare signals as logic (SV style)

  rain_alarm dut (                    // instantiate the module under test
    .raining    (raining),            // connect port raining    to signal raining
    .window_open(window_open),        // connect port window_open to signal window_open
    .alert      (alert)               // connect port alert       to signal alert
  );

  task automatic check(
    input logic r, w,
    input logic exp
  );
    raining = r; window_open = w; #5;
    if (alert === exp)
      $display("PASS  raining=%0b window_open=%0b -> alert=%0b", r, w, alert);
    else
      $display("FAIL  raining=%0b window_open=%0b -> alert=%0b (expected %0b)", r, w, alert, exp);
  endtask

  initial begin
    $display("=== Rain Alarm Test ===");
    check(0, 0,  0);   // no rain, window closed  — no alert
    check(1, 0,  0);   // raining but window shut — no alert
    check(0, 1,  0);   // window open but dry     — no alert
    check(1, 1,  1);   // rain + open window      — ALERT!
    $display("Rain alarm working correctly!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  raining=0 window_open=0 -> alert=0',
        'PASS  raining=1 window_open=1 -> alert=1',
        'Rain alarm working correctly!'
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // L2 — Write it yourself from scratch.
    // Design tab is blank. Tasks walk through every single line.
    // Goal: type a complete working module, hit Run, see all PASS.
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv1l2',
      title: 'L2 — Write Your First Module',
      theory: `
<h2>Now you type everything</h2>
<p>Last lesson you read a complete module. This lesson the design tab is <strong>blank</strong>.
You will type every single line yourself, following the tasks on the left.
The testbench is already provided — your job is to write the design that makes it pass.</p>

<h2>Quick reference — the structure you are building</h2>
<pre class="code-block">module  NAME  (
  input  logic  PORT_NAME,   ← comma after every port except the last
  input  logic  PORT_NAME,
  output logic  PORT_NAME    ← NO comma here — it is the last port
);

  always_comb begin
    output_port = expression;
  end

endmodule</pre>

<h2>What you are building: a door chime</h2>
<p>A smart doorbell that chimes <em>only when</em> someone presses the button
<strong>and</strong> the sound is not muted:</p>

<div class="flow-diagram">
  <div class="flow-step">button<small>input</small></div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">AND gate<small>always_comb</small></div>
  <div class="flow-arrow">→</div>
  <div class="flow-step">chime<small>output</small></div>
  <div class="flow-arrow">←</div>
  <div class="flow-step">~muted<small>NOT muted</small></div>
</div>

<table class="truth-table">
  <tr><th>button</th><th>muted</th><th>chime</th><th>Why</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>Nobody pressed the button</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>Button pressed, not muted — chime!</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>Button pressed but muted — silence</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Muted and nobody pressed — silent</td></tr>
</table>

<h2>The logic expression</h2>
<pre class="code-block">chime = button &amp; ~muted;
//             ↑   ↑
//             AND  NOT muted (inverts: muted=1 → ~muted=0, muted=0 → ~muted=1)</pre>

<h2>Port list — the two tricky rules</h2>
<ul>
  <li><strong>Comma rule:</strong> every port gets a comma <em>except the very last one</em></li>
  <li><strong>Semicolon rule:</strong> the closing <code>);</code> needs a semicolon — it ends the module header</li>
</ul>

<h2>Ready? Start typing in the Design tab — follow the tasks one line at a time.</h2>
      `,
      tasks: [
        'The design tab is blank — you type everything. Follow these tasks one line at a time.',
        'Type the module keyword and name (leave a space before the opening paren):',
        '  module door_chime (',
        'Press Enter. Now declare the first input port:',
        '  input  logic button,',
        '  (two spaces indent, then input, two spaces, logic, one space, button, comma)',
        'Press Enter. Declare the second input port:',
        '  input  logic muted,',
        'Press Enter. Declare the output port — NO comma at the end:',
        '  output logic chime',
        'Press Enter. Close the port list with );',
        ');',
        'Press Enter twice (blank line for readability). Now open the logic block:',
        '  always_comb begin',
        'Press Enter. Write the logic expression — button AND (NOT muted):',
        '    chime = button & ~muted;',
        '  (four spaces indent, then chime, space, =, space, button, space, &, space, ~muted, semicolon)',
        'Press Enter. Close the always_comb block:',
        '  end',
        'Press Enter twice. Close the module:',
        'endmodule',
        'Hit Run — all four rows should print PASS',
        'Verify row 2: button=1 muted=0 → chime=1 (chime rings!)',
        'Verify row 3: button=1 muted=1 → chime=0 (muted — silence)'
      ],
      hint:
`module door_chime (
  input  logic button,
  input  logic muted,
  output logic chime
);

  always_comb begin
    chime = button & ~muted;
  end

endmodule`,
      design:
`// Write your door_chime module here.
// Follow the tasks in the left panel — one line at a time.
//
// Port spec:
//   input  logic button    — 1 when doorbell button is pressed
//   input  logic muted     — 1 when sound is disabled
//   output logic chime     — 1 when the chime should ring
//
// Logic: chime = button AND (NOT muted)
//
// Start typing below this comment block:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic button, muted, chime;

  door_chime dut (
    .button(button),
    .muted (muted),
    .chime (chime)
  );

  task automatic check(
    input logic b, m,
    input logic exp
  );
    button = b; muted = m; #5;
    if (chime === exp)
      $display("PASS  button=%0b muted=%0b -> chime=%0b", b, m, chime);
    else
      $display("FAIL  button=%0b muted=%0b -> chime=%0b (expected %0b)", b, m, chime, exp);
  endtask

  initial begin
    $display("=== Door Chime Test ===");
    check(0, 0,  0);   // no press, not muted  — silent
    check(1, 0,  1);   // pressed, not muted   — chime!
    check(1, 1,  0);   // pressed but muted    — silent
    check(0, 1,  0);   // no press and muted   — silent
    $display("Door chime works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  button=0 muted=0 -> chime=0',
        'PASS  button=1 muted=0 -> chime=1',
        'PASS  button=1 muted=1 -> chime=0',
        'Door chime works!'
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // L3 — Three inputs, one output. No scaffold. User writes everything.
    // Introduces OR operator and parentheses in expressions.
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv1l3',
      title: 'L3 — Three Inputs & Compound Logic',
      theory: `
<h2>More inputs, richer logic</h2>
<p>Real hardware rarely has just two inputs. This lesson you build a module
with <strong>three inputs</strong> and learn how to combine AND, OR, and NOT in one expression.</p>

<h2>Combining operators</h2>
<p>Operators in SystemVerilog follow standard precedence rules (NOT binds tighter than AND, AND binds tighter than OR), but <strong>parentheses always win</strong> and make intent crystal clear:</p>
<pre class="code-block">// Without parentheses — relies on precedence, harder to read
out = a &amp; b | c;

// With parentheses — unambiguous and self-documenting
out = (a &amp; b) | c;    // (a AND b) OR c</pre>

<h2>Always use parentheses for compound expressions</h2>
<pre class="code-block">// These are all valid SystemVerilog:
out = (a &amp; b) | ~c;          // (a AND b) OR (NOT c)
out = ~a &amp; (b | c);          // (NOT a) AND (b OR c)
out = (a | b) &amp; (b | c);     // (a OR b) AND (b OR c)</pre>

<h2>What you are building: a fan controller</h2>
<p>A smart fan that turns on when the room is <em>hot</em>, <em>or</em> when it's <em>humid and occupied</em>:</p>
<pre class="code-block">fan_on = hot | (humid &amp; occupied);
//       ─┬─   ──────────┬───────
//        │              └── humidity sensor AND motion sensor
//        └── temperature sensor alone is enough to trigger</pre>

<table class="truth-table">
  <tr><th>hot</th><th>humid</th><th>occupied</th><th>fan_on</th><th>Reason</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>All normal — fan off</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>Hot room — fan on regardless</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>1</td><td>Humid AND someone is in the room</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>0</td><td>Humid but empty room — save power</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>1</td><td>Hot AND humid AND occupied — definitely on!</td></tr>
</table>

<h2>Port spec for this lesson</h2>
<pre class="code-block">module fan_ctrl (
  input  logic hot,        // temperature sensor: 1 = room is hot
  input  logic humid,      // humidity sensor:    1 = room is humid
  input  logic occupied,   // motion sensor:      1 = someone is in the room
  output logic fan_on      // 1 = turn the fan on
);
  // Logic:
  //   fan_on = hot | (humid &amp; occupied);
endmodule</pre>

<h2>Your turn — write the whole module in the design tab</h2>
<p>No scaffold this time. Open the design tab, clear the starter comment, and type the complete module from <code>module</code> to <code>endmodule</code>. The testbench is ready and waiting.</p>
      `,
      tasks: [
        'Clear the design tab (select all, delete) — you are starting from nothing',
        'Line 1:  module fan_ctrl (',
        'Line 2:  input  logic hot,          ← comma — more ports follow',
        'Line 3:  input  logic humid,         ← comma',
        'Line 4:  input  logic occupied,      ← comma',
        'Line 5:  output logic fan_on         ← NO comma — last port',
        'Line 6:  );                          ← closes port list',
        'Blank line',
        'Line 8:    always_comb begin',
        'Line 9:      fan_on = hot | (humid & occupied);   ← OR and AND with parens',
        'Line 10:   end',
        'Blank line',
        'Line 12:  endmodule',
        'Hit Run — all 6 test cases must print PASS',
        'If any FAIL: check your operator — | is OR, & is AND, use (humid & occupied) with parens'
      ],
      hint:
`module fan_ctrl (
  input  logic hot,
  input  logic humid,
  input  logic occupied,
  output logic fan_on
);

  always_comb begin
    fan_on = hot | (humid & occupied);
  end

endmodule`,
      design:
`// Write the fan_ctrl module from scratch.
// Port spec:
//   input  logic hot        — 1 = room is hot
//   input  logic humid      — 1 = room is humid
//   input  logic occupied   — 1 = someone is in the room
//   output logic fan_on     — 1 = turn the fan on
//
// Logic:  fan_on = hot | (humid & occupied)
//
// Clear this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic hot, humid, occupied, fan_on;

  fan_ctrl dut (
    .hot     (hot),
    .humid   (humid),
    .occupied(occupied),
    .fan_on  (fan_on)
  );

  task automatic check(
    input logic h, hu, occ,
    input logic exp
  );
    hot = h; humid = hu; occupied = occ; #5;
    if (fan_on === exp)
      $display("PASS  hot=%0b humid=%0b occupied=%0b -> fan_on=%0b", h, hu, occ, fan_on);
    else
      $display("FAIL  hot=%0b humid=%0b occupied=%0b -> fan_on=%0b (expected %0b)", h, hu, occ, fan_on, exp);
  endtask

  initial begin
    $display("=== Fan Controller Test ===");
    check(0, 0, 0,  0);   // all off         — fan off
    check(1, 0, 0,  1);   // hot only        — fan on
    check(0, 1, 0,  0);   // humid, empty    — fan off
    check(0, 0, 1,  0);   // occupied, dry   — fan off
    check(0, 1, 1,  1);   // humid + person  — fan on
    check(1, 1, 1,  1);   // all on          — fan on
    $display("Fan controller works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  hot=0 humid=0 occupied=0 -> fan_on=0',
        'PASS  hot=1 humid=0 occupied=0 -> fan_on=1',
        'PASS  hot=0 humid=1 occupied=1 -> fan_on=1',
        'Fan controller works!'
      ]
    }

  ]
});
