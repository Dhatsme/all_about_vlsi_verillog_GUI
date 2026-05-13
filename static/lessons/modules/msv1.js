// Module msv1 — Getting Started with SystemVerilog
// All three lessons have blank design tabs — user types every line.
// Verilator 5.020 safe: logic, always_comb, bitwise operators only.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv1',
  title: 'Getting Started with SystemVerilog',
  icon: '🚦',
  level: 'beginner',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────
    // L1 — User types rain_alarm from scratch
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv1l1',
      title: 'L1 — Your First Module',
      theory: `
<h2>What is SystemVerilog?</h2>
<p>SystemVerilog describes <strong>hardware</strong> — not programs that run step by step, but circuits that exist physically and react to signals instantly. Everything you write becomes gates and wires on a real chip.</p>

<h2>The module — your basic building block</h2>
<p>Every circuit is a <strong>module</strong>. Think of it like a chip you’d buy from an electronics store: it has <em>input pins</em>, <em>output pins</em>, and logic inside connecting them.</p>

<pre class="code-block">module  NAME  ( port_list );

  // — logic lives here —

endmodule</pre>

<table class="truth-table">
  <tr><th>Keyword</th><th>What it does</th></tr>
  <tr><td><code>module</code></td><td>Opens a new circuit block</td></tr>
  <tr><td><code>NAME</code></td><td>You choose — should describe what the circuit does</td></tr>
  <tr><td><code>( port_list );</code></td><td>All the pins — inputs and outputs listed here</td></tr>
  <tr><td><code>endmodule</code></td><td>Closes the block — every module must have this</td></tr>
</table>

<h2>Declaring ports (pins)</h2>
<p>Each port needs three words: <strong>direction</strong> &rarr; <strong>type</strong> &rarr; <strong>name</strong></p>
<pre class="code-block">  input  logic raining,     // ← comma: more ports follow
  input  logic window_open, // ← comma
  output logic alert        // ← NO comma: this is the LAST port</pre>

<table class="truth-table">
  <tr><th>Word</th><th>Meaning</th></tr>
  <tr><td><code>input</code></td><td>Signal comes INTO this module from outside</td></tr>
  <tr><td><code>output</code></td><td>Signal goes OUT of this module</td></tr>
  <tr><td><code>logic</code></td><td>Universal signal type in SystemVerilog — use it for every signal</td></tr>
</table>

<p><strong>Comma rule:</strong> every port gets a comma <em>except the very last one</em>. After all ports, write <code>);</code> to close the port list.</p>

<h2>always_comb — combinational logic</h2>
<p>A block that describes logic with no clock. Every time an input changes, the output re-evaluates instantly — just like real gates.</p>
<pre class="code-block">  always_comb begin
    alert = raining &amp; window_open;  // &amp; = AND gate
  end</pre>

<h2>Operators</h2>
<table class="truth-table">
  <tr><th>Symbol</th><th>Gate</th><th>Meaning</th></tr>
  <tr><td><code>&amp;</code></td><td>AND</td><td>1 only when BOTH inputs are 1</td></tr>
  <tr><td><code>|</code></td><td>OR</td><td>1 when AT LEAST ONE input is 1</td></tr>
  <tr><td><code>~</code></td><td>NOT</td><td>Inverts the bit: 0&rarr;1, 1&rarr;0</td></tr>
  <tr><td><code>^</code></td><td>XOR</td><td>1 when inputs are DIFFERENT</td></tr>
</table>

<h2>What you are building — a rain alarm</h2>
<p>Alert fires only when it is raining <strong>AND</strong> the window is open:</p>
<table class="truth-table">
  <tr><th>raining</th><th>window_open</th><th>alert</th><th>Reason</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>All clear</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>Raining, window closed — safe</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Window open, dry — no problem</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>Rain + open window = ALERT!</td></tr>
</table>

<h2>Complete reference — every line you will type</h2>
<pre class="code-block">module rain_alarm (          // line 1: keyword + module name
  input  logic raining,      // line 2: first input, comma
  input  logic window_open,  // line 3: second input, comma
  output logic alert         // line 4: output, NO comma
);                           // line 5: ); closes the port list

  always_comb begin          // line 7: opens logic block
    alert = raining &amp; window_open;  // line 8: AND the two inputs
  end                        // line 9: closes the block

endmodule                    // line 11: closes the module</pre>

<p><strong>Now switch to the Code tab</strong> and type every line following the tasks below.</p>
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
        'Hit Run — all four PASS lines should appear in the Output tab',
      ],
      hint:
`module rain_alarm (
  input  logic raining,
  input  logic window_open,
  output logic alert
);

  always_comb begin
    alert = raining & window_open;
  end

endmodule`,
      design:
`// Type the rain_alarm module here.
// Read the Theory tab first — it has a full annotated reference card.
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

    // ─────────────────────────────────────────────────────────────────────
    // L2 — Door chime: introduces ~ (NOT operator)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv1l2',
      title: 'L2 — Door Chime',
      theory: `
<h2>New operator: ~ (NOT)</h2>
<p>NOT flips a single bit. Put <code>~</code> directly in front of a signal name — no space needed:</p>
<pre class="code-block">~muted   // muted=0 &rarr; ~muted=1 (sound ON)
         // muted=1 &rarr; ~muted=0 (sound OFF)</pre>

<h2>Combining AND and NOT in one expression</h2>
<pre class="code-block">chime = button &amp; ~muted;
//             &uarr;    &uarr;
//             AND  NOT muted</pre>
<p>Read it as: &ldquo;chime is 1 when button is pressed AND the sound is not muted.&rdquo;</p>

<h2>What you are building — a smart doorbell</h2>
<table class="truth-table">
  <tr><th>button</th><th>muted</th><th>chime</th><th>Reason</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>Nobody pressed</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>Pressed, not muted — chime!</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>Pressed but muted — silence</td></tr>
  <tr><td>0</td><td>1</td><td>0</td><td>Muted, no press — silence</td></tr>
</table>

<h2>Port list rules (recap)</h2>
<ul>
  <li>Every port except the last gets a <strong>comma</strong></li>
  <li>After all ports write <code>);</code> — semicolon closes the header</li>
  <li>Logic goes inside <code>always_comb begin&hellip;end</code></li>
  <li><code>endmodule</code> on its own line at the very bottom</li>
</ul>

<h2>Complete reference card</h2>
<pre class="code-block">module door_chime (
  input  logic button,    // line 2: 1 = button pressed, comma
  input  logic muted,     // line 3: 1 = sound off, comma
  output logic chime      // line 4: 1 = ring, NO comma
);

  always_comb begin
    chime = button &amp; ~muted;  // AND with NOT
  end

endmodule</pre>

<p><strong>Switch to Code tab &rarr;</strong> type the full module following the tasks.</p>
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
        'Hit Run — all four PASS lines should print',
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
`// Type the door_chime module here.
// Read the Theory tab first — it has the reference card.
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

    // ─────────────────────────────────────────────────────────────────────
    // L3 — Fan controller: three inputs, OR operator, parentheses
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'msv1l3',
      title: 'L3 — Three Inputs & Compound Logic',
      theory: `
<h2>Three inputs, richer logic</h2>
<p>Real circuits rarely have just two inputs. This lesson adds a third input and introduces the <strong>OR operator</strong> and grouping with parentheses.</p>

<h2>The OR operator</h2>
<pre class="code-block">a | b   // 1 when a=1 OR b=1 (or both)</pre>

<h2>Mixing operators — always use parentheses</h2>
<p>Without parentheses you rely on hidden precedence rules. Parentheses make intent unambiguous and prevent bugs:</p>
<pre class="code-block">// Ambiguous — what does this mean?
out = a &amp; b | c;

// Clear — parentheses tell the story:
out = (a &amp; b) | c;   // (a AND b) OR c</pre>

<h2>What you are building — a smart fan controller</h2>
<p>Turn the fan on when the room is <em>hot</em> OR when it is <em>humid and occupied</em>:</p>
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

<h2>Complete reference card</h2>
<pre class="code-block">module fan_ctrl (
  input  logic hot,       // line 2: temp sensor, comma
  input  logic humid,     // line 3: humidity sensor, comma
  input  logic occupied,  // line 4: motion sensor, comma
  output logic fan_on     // line 5: output, NO comma
);

  always_comb begin
    fan_on = hot | (humid &amp; occupied);  // | is OR
  end

endmodule</pre>

<p><strong>Switch to Code tab &rarr;</strong> no scaffold — write the complete module yourself.</p>
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
        'Hit Run — all 6 test cases must print PASS',
        'If FAIL: check | is OR, & is AND, and you have (humid & occupied) with parens',
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
`// Type the fan_ctrl module here.
// Read the Theory tab first — it has the reference card.
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
