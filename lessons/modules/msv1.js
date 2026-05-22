// Module msv1 — Getting Started with SystemVerilog
// All three lessons have blank design tabs — user types every line.
// Verilator 5.020 safe: logic, always_comb, bitwise operators only.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv1',
  title: 'Getting Started with SystemVerilog',
  icon: '🚆',
  level: 'beginner',
  lessons: [

    // ─── L1 — rain_alarm ──────────────────────────────────────────────────────────
    {
      id: 'msv1l1',
      title: 'L1 — Your First Module',
      theory: `
<h2>What is SystemVerilog?</h2>
<p>SystemVerilog describes <strong>hardware</strong> — not programs that run step by step, but circuits that exist physically and react to signals instantly. Everything you write becomes gates and wires on a real chip. When you press Run, Verilator compiles your description into a C++ simulation of those gates.</p>

<div class="flow-diagram">
  <div class="flow-step">SystemVerilog<small>your description</small></div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">Synthesis tool<small>maps to gates</small></div>
  <span class="flow-arrow">→</span>
  <div class="flow-step">Silicon<small>actual chip</small></div>
</div>

<p>This is fundamentally different from Python or C. In software, line 2 runs after line 1. In hardware, <em>all gates operate simultaneously</em> — every gate sees its input and produces its output at the same time, continuously.</p>

<h2>The module — Your Basic Building Block</h2>
<p>Every circuit is a <strong>module</strong>. Think of it like a chip you'd buy from an electronics store: it has <em>input pins</em>, <em>output pins</em>, and logic inside connecting them. On a real chip, the module boundary becomes the die boundary or a well-defined functional block.</p>

<pre class="code-block">module  NAME  ( port_list );

  // — logic lives here —

endmodule</pre>

<table class="truth-table">
  <tr><th>Keyword</th><th>What it does</th><th>Analogy</th></tr>
  <tr><td><code>module</code></td><td>Opens a new circuit block</td><td>"Start of chip design"</td></tr>
  <tr><td><code>NAME</code></td><td>You choose — describes what the circuit does</td><td>Part number on a chip</td></tr>
  <tr><td><code>( port_list );</code></td><td>All the pins listed here</td><td>Pin diagram on a datasheet</td></tr>
  <tr><td><code>endmodule</code></td><td>Closes the block — every module must have this</td><td>End of chip boundary</td></tr>
</table>

<h2>Declaring Ports (Pins)</h2>
<p>Each port needs three things: <strong>direction</strong> &rarr; <strong>type</strong> &rarr; <strong>name</strong></p>
<pre class="code-block">  input  logic raining,     // ← comma: more ports follow
  input  logic window_open, // ← comma
  output logic alert        // ← NO comma: this is the LAST port</pre>

<table class="truth-table">
  <tr><th>Word</th><th>Meaning</th><th>Real-world analogy</th></tr>
  <tr><td><code>input</code></td><td>Signal comes INTO this module</td><td>Sensor connected to chip pin</td></tr>
  <tr><td><code>output</code></td><td>Signal goes OUT of this module</td><td>LED or buzzer driven by chip</td></tr>
  <tr><td><code>logic</code></td><td>Universal signal type in SystemVerilog</td><td>A wire that carries 0 or 1</td></tr>
</table>

<p><strong>Comma rule:</strong> every port gets a comma <em>except the very last one</em>. After all ports, write <code>);</code> to close the port list. This is the most common syntax error for beginners — a missing or extra comma.</p>

<h2>always_comb — Combinational Logic</h2>
<p>A block that describes logic with no clock or memory. Every time an input changes, the output re-evaluates instantly — just like real gates. The simulator reruns this block whenever any input signal changes.</p>
<pre class="code-block">  always_comb begin
    alert = raining &amp; window_open;  // &amp; = AND gate
  end</pre>

<p>You can also use <code>assign</code> for single-line combinational expressions: <code>assign alert = raining &amp; window_open;</code> — both are equivalent for simple logic.</p>

<h2>Operators</h2>
<table class="truth-table">
  <tr><th>Symbol</th><th>Gate</th><th>Meaning</th><th>Example</th></tr>
  <tr><td><code>&amp;</code></td><td>AND</td><td>1 only when BOTH inputs are 1</td><td>Lock requires card AND PIN</td></tr>
  <tr><td><code>|</code></td><td>OR</td><td>1 when AT LEAST ONE input is 1</td><td>Alarm if door OR window opens</td></tr>
  <tr><td><code>~</code></td><td>NOT</td><td>Inverts: 0&rarr;1, 1&rarr;0</td><td>Active when button NOT pressed</td></tr>
  <tr><td><code>^</code></td><td>XOR</td><td>1 when inputs are DIFFERENT</td><td>Parity bit, sum in adder</td></tr>
</table>

<h2>What You Are Building — A Rain Alarm</h2>
<p>Alert fires only when it is raining <strong>AND</strong> the window is open. This is a real IoT circuit — connect two moisture/reed sensors and a buzzer:</p>
<table class="truth-table">
  <tr><th>raining</th><th>window_open</th><th>alert</th><th>Reason</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>All clear</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>Raining, window closed — safe</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Window open, dry — no problem</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>Rain + open window = ALERT!</td></tr>
</table>

<h2>Common Mistakes to Avoid</h2>
<ul>
  <li><strong>Missing comma</strong> after a non-last port — syntax error</li>
  <li><strong>Extra comma</strong> after the last port — syntax error</li>
  <li><strong>Missing semicolon</strong> after <code>);</code> or <code>begin</code> lines</li>
  <li><strong>Forgetting endmodule</strong> — the compiler will report a mysterious error at end-of-file</li>
  <li><strong>Using = instead of &lt;= in always_ff</strong> (not relevant here, but remember for Module 2)</li>
</ul>

<p><strong>Ready?</strong> Switch to the Code tab and type every line from memory. Stuck? Tap 💡 Show Hint — it has a fully annotated reference.</p>
      `,
      tasks: [
        'Switch to the Code tab — the editor is blank. You type every character.',
        '── Line 1: open the module ──',
        '  module rain_alarm (',
        '── Line 2: first input port (comma at the end!) ──',
        '  input  logic raining,',
        '── Line 3: second input port (comma at the end!) ──',
        '  input  logic window_open,',
        '── Line 4: output port — NO comma (it is the last port) ──',
        '  output logic alert',
        '── Line 5: close the port list with ); ──',
        ');',
        '── Blank line, then open the logic block ──',
        '  always_comb begin',
        '── The logic: AND both inputs together ──',
        '    alert = raining & window_open;',
        '── Close the always_comb block ──',
        '  end',
        '── Blank line, then close the module ──',
        'endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all four PASS lines should appear in the Output tab',
      ],
      hint:
`module rain_alarm (          // line 1: keyword + module name
  input  logic raining,      // line 2: first input, comma
  input  logic window_open,  // line 3: second input, comma
  output logic alert         // line 4: output, NO comma
);                           // line 5: ); closes the port list

  always_comb begin          // line 7: opens logic block
    alert = raining & window_open;  // line 8: & = AND gate
  end                        // line 9: closes the block

endmodule                    // line 11: closes the module`,
      design:
`// Type the rain_alarm module here.
// Read the Theory tab first — it explains every keyword.
//
// Ports to declare:
//   input  logic raining      — 1 = rain detected
//   input  logic window_open  — 1 = window is open
//   output logic alert        — 1 = sound the alarm
//
// Logic: alert = raining & window_open   (& means AND)
//
// Delete this comment block and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic raining, window_open, alert;

  rain_alarm dut (
    .raining    (raining),
    .window_open(window_open),
    .alert      (alert)
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
    check(0, 0,  0);
    check(1, 0,  0);
    check(0, 1,  0);
    check(1, 1,  1);
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

    // ─── L2 — Door Chime ──────────────────────────────────────────────────────
    {
      id: 'msv1l2',
      title: 'L2 — Door Chime',
      theory: `
<h2>New Operator: ~ (NOT / Inverter)</h2>
<p>NOT is the simplest gate — one input, one output. It flips the bit: 0 becomes 1, 1 becomes 0. Put <code>~</code> directly in front of a signal name — no space needed:</p>
<pre class="code-block">~muted   // muted=0 → ~muted=1 (sound CAN play)
         // muted=1 → ~muted=0 (sound is OFF)</pre>

<h2>Reading NOT in English</h2>
<p>When you see <code>~muted</code>, say aloud: <em>"not muted"</em>. This is how hardware engineers think about inverted signals. Active-low signals in real chips use this convention — a signal named <code>n_reset</code> or <code>reset_n</code> is active when LOW (0), meaning the device resets when the signal is 0.</p>

<h2>Combining AND and NOT</h2>
<pre class="code-block">chime = button &amp; ~muted;
//             ↑    ↑
//             AND  NOT muted
// Read: "chime rings when button pressed AND sound is not muted"</pre>

<h2>De Morgan’s Theorem — A Sneak Preview</h2>
<p>De Morgan's theorem is the most important identity in logic design. It says:</p>
<pre class="code-block">~(a &amp; b)  =  (~a) | (~b)   // NOT of AND = OR of NOTs
~(a | b)  =  (~a) &amp; (~b)   // NOT of OR  = AND of NOTs</pre>
<p>This means every gate can be implemented using only NAND or only NOR — which is how real chip foundries work. You won't use De Morgan's directly today, but recognise it when you see inverted outputs.</p>

<h2>What You Are Building — A Smart Doorbell</h2>
<table class="truth-table">
  <tr><th>button</th><th>muted</th><th>chime</th><th>Reason</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>Nobody pressed</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>Pressed, not muted — chime!</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>Pressed but muted — silence</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Muted, no press — silence</td></tr>
</table>

<h2>Port List Rules (Recap)</h2>
<ul>
  <li>Every port except the last gets a <strong>comma</strong></li>
  <li>After all ports write <code>);</code> — semicolon closes the header</li>
  <li>Logic goes inside <code>always_comb begin&hellip;end</code></li>
  <li><code>endmodule</code> on its own line at the very bottom</li>
  <li>Module name must match between the <code>module</code> line and the testbench instantiation</li>
</ul>

<p><strong>Ready?</strong> Switch to the Code tab and type the full module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──   module door_chime (',
        '── Line 2 ──   input  logic button,      ← comma',
        '── Line 3 ──   input  logic muted,        ← comma',
        '── Line 4 ──   output logic chime         ← NO comma (last port)',
        '── Line 5 ──   );',
        '── Blank line ──',
        '── Line 7 ──     always_comb begin',
        '── Line 8 ──       chime = button & ~muted;     ← & = AND, ~ = NOT',
        '── Line 9 ──     end',
        '── Blank line ──',
        '── Line 11 ──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all four PASS lines should print',
      ],
      hint:
`module door_chime (
  input  logic button,    // line 2: 1 = button pressed, comma
  input  logic muted,     // line 3: 1 = sound off, comma
  output logic chime      // line 4: 1 = ring, NO comma
);

  always_comb begin
    chime = button & ~muted;  // & = AND,  ~ = NOT
  end

endmodule`,
      design:
`// Type the door_chime module here.
// Read the Theory tab first — it explains the ~ (NOT) operator.
//
// Ports:
//   input  logic button  — 1 = button pressed
//   input  logic muted   — 1 = sound disabled
//   output logic chime   — 1 = ring the chime
//
// Logic: chime = button & ~muted
//
// Delete this and start typing:
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
    check(0, 0,  0);
    check(1, 0,  1);
    check(1, 1,  0);
    check(0, 1,  0);
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

    // ─── L3 — Fan Controller ────────────────────────────────────────────────────
    {
      id: 'msv1l3',
      title: 'L3 — Three Inputs & Compound Logic',
      theory: `
<h2>Three Inputs, Richer Logic</h2>
<p>Real circuits rarely have just two inputs. This lesson adds a third input and introduces the <strong>OR operator</strong> and grouping with parentheses. You also see how to express a real engineering specification as a Boolean equation.</p>

<h2>The OR Operator</h2>
<pre class="code-block">a | b   // 1 when a=1 OR b=1 (or both)  —  the inclusive-OR gate</pre>

<table class="truth-table">
  <tr><th>a</th><th>b</th><th>a | b</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>Neither input is 1</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>b is 1</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>a is 1</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>Both are 1 — still 1 (inclusive-OR)</td></tr>
</table>

<h2>Mixing Operators — Always Use Parentheses</h2>
<p>Without parentheses you rely on operator precedence rules that differ between languages. In SystemVerilog, <code>&amp;</code> has higher precedence than <code>|</code>, just like <code>*</code> is higher than <code>+</code> in algebra. But <strong>always use parentheses</strong> to make intent unambiguous and prevent bugs:</p>
<pre class="code-block">// Ambiguous — what does this mean?
out = a &amp; b | c;

// Clear — parentheses tell the story:
out = (a &amp; b) | c;   // (a AND b) OR c
out = a &amp; (b | c);   // a AND (b OR c)  — completely different circuit!</pre>

<h2>Operator Precedence (high to low)</h2>
<table class="truth-table">
  <tr><th>Precedence</th><th>Operator</th><th>Name</th></tr>
  <tr><td>Highest</td><td><code>~</code></td><td>NOT (unary)</td></tr>
  <tr><td>↓</td><td><code>&amp;</code></td><td>AND</td></tr>
  <tr><td>↓</td><td><code>^</code></td><td>XOR</td></tr>
  <tr><td>Lowest</td><td><code>|</code></td><td>OR</td></tr>
</table>
<p><em>But use parentheses anyway — they make your intent clear to future readers (and to you next week).</em></p>

<h2>What You Are Building — A Smart Fan Controller</h2>
<p>Turn the fan on when the room is <em>hot</em> OR when it is <em>humid and occupied</em> (no point wasting power if the room is empty):</p>
<pre class="code-block">fan_on = hot | (humid &amp; occupied);</pre>

<table class="truth-table">
  <tr><th>hot</th><th>humid</th><th>occupied</th><th>fan_on</th><th>Reason</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>All normal — fan off</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>Hot alone — fan on</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>0</td><td>Humid, empty room — save power</td></tr>
  <tr><td>0</td><td>0</td><td>1</td><td>0</td><td>Occupied, dry — fan stays off</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>1</td><td>Humid AND someone here</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>1</td><td>All conditions met</td></tr>
</table>

<h2>Real-World Context</h2>
<p>This exact logic runs in HVAC (heating, ventilation, air conditioning) controllers. A simple microcontroller or FPGA reads temperature and humidity sensors and drives a relay using combinational logic like this. The same pattern — OR of multiple AND conditions — is called a <strong>Sum of Products (SOP)</strong> expression and is the standard form for any combinational specification.</p>

<p><strong>Ready?</strong> Switch to the Code tab and write the complete module yourself. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — write everything from scratch.',
        '── Line 1 ──   module fan_ctrl (',
        '── Line 2 ──   input  logic hot,          ← comma',
        '── Line 3 ──   input  logic humid,          ← comma',
        '── Line 4 ──   input  logic occupied,       ← comma',
        '── Line 5 ──   output logic fan_on          ← NO comma (last port)',
        '── Line 6 ──   );',
        '── Blank line ──',
        '── Line 8 ──     always_comb begin',
        '── Line 9 ──       fan_on = hot | (humid & occupied);   ← | is OR, parens around (humid & occupied)',
        '── Line 10 ──    end',
        '── Blank line ──',
        '── Line 12 ──   endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 test cases must print PASS',
        'If FAIL: check | is OR, & is AND, and you have (humid & occupied) with parens',
      ],
      hint:
`module fan_ctrl (
  input  logic hot,       // line 2: temp sensor, comma
  input  logic humid,     // line 3: humidity sensor, comma
  input  logic occupied,  // line 4: motion sensor, comma
  output logic fan_on     // line 5: output, NO comma
);

  always_comb begin
    fan_on = hot | (humid & occupied);  // | = OR,  & = AND
  end

endmodule`,
      design:
`// Type the fan_ctrl module here.
// Read the Theory tab first — it explains | (OR) and parentheses.
//
// Ports:
//   input  logic hot       — 1 = room is hot
//   input  logic humid     — 1 = room is humid
//   input  logic occupied  — 1 = room is occupied
//   output logic fan_on    — 1 = turn the fan on
//
// Logic: fan_on = hot | (humid & occupied)
//
// Delete this and start typing:
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
    check(0, 0, 0,  0);
    check(1, 0, 0,  1);
    check(0, 1, 0,  0);
    check(0, 0, 1,  0);
    check(0, 1, 1,  1);
    check(1, 1, 1,  1);
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
