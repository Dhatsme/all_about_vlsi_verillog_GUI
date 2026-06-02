# CLAUDE.md — All About VLSI — Lesson-Building Agent

This file is read automatically by Claude Code at session start.
It is the operating instructions for the autonomous lesson-building agent.
Read this file completely before doing anything else.

---

## Mission

Build the next unchecked chapter in the curriculum table below.
One chapter = one JS file + two registration edits, pushed in **two separate commits** to stay within output token limits.
Push to `develop` when done. Then mark the chapter done in the appropriate docs/ file (replace `❌` with `✅`).
Repeat for the next chapter.

**Chapter content specs live in docs/:**
- `docs/spi.md` — SystemVerilog Zero to Hero (msv1–msv7) full content guide (all chapters built, kept for reference)
- `docs/i2cdesign.md` — I²C Design course (i2c1–i2c8) content guide ← **next course to build**

The GUI (HTML/CSS/JS app framework) is **frozen** — never modify:
- `static/index.html` (except adding one `<script>` tag per new chapter)
- `static/css/style.css`
- `static/js/app.js`
- `static/js/waveform.js`
- Any existing lesson file

---

## Curriculum state — update this table after every push

| # | Module ID | Title | Lessons | Status |
|---|---|---|---|---|
| 1 | `msv1` | Getting Started with SystemVerilog | L1 AND/OR/NOT gates, L2 Door Chime (~), L3 Fan Controller (|) | ✅ done |
| 2 | `msv2` | Sequential Logic | L1 D Flip-Flop, L2 4-bit Register, L3 Shift Register, L4 Clock Divider | ✅ done |
| 3 | `msv3` | Arithmetic Circuits | L1 Half Adder, L2 Full Adder, L3 4-bit Adder, L4 Subtractor, L5 ALU (portfolio) | ✅ done |
| 4 | `msv4` | Finite State Machines | L1 Traffic Light, L2 Vending Machine, L3 Sequence Detector, L4 Combo Lock (portfolio) | ✅ done |
| 5 | `msv5` | Memory & Storage | L1 Register File, L2 Sync SRAM, L3 FIFO, L4 Stack (portfolio) | ✅ done |
| 6 | `msv6` | Serial Protocols | L1 UART TX, L2 UART RX, L3 SPI Master (portfolio), L4 I2C Controller (portfolio) | ✅ done |
| 7 | `msv7` | Capstone Projects | L1 PWM, L2 VGA Sync, L3 Calculator, L4 RISC-V RV32I Core | ✅ done |

See `docs/i2cdesign.md` for the I²C Design course curriculum (i2c1–i2c8).

---

## Build loop — run this every session

```
1. Read this file top-to-bottom
2. Open docs/i2cdesign.md and find the first ❌ row — that is the target chapter
3. Read agent.md for full schema, difficulty tiers, and testbench patterns
4. Build the lesson file  →  static/lessons/modules/<moduleId>.js
5. Commit 1: push ONLY the lesson JS file to develop branch
6. Commit 2: push ONLY the three registration files (index.html + curriculum.js + courses.js) to develop branch
7. Edit docs/i2cdesign.md: change ❌ to ✅ for the chapter just built
8. Push docs/i2cdesign.md to main
9. Stop — do not build the next chapter in the same session
    (one chapter per session keeps changes reviewable)
```

---

## Step 4 — writing the lesson file

### File location
```
static/lessons/modules/<moduleId>.js    ← e.g. i2c1.js, i2c2.js
```

### File skeleton
```javascript
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c1',
  title: 'I²C Fundamentals',
  icon: '🔗',        // pick a relevant emoji
  level: 'beginner',  // beginner | intermediate | advanced
  lessons: [
    {
      id: 'i2c1l1',
      title: 'L1 — Open-Drain IO Cell',
      theory: `...`,
      tasks: [...],
      hint: `...`,
      design: `...`,
      testbench: `...`,
      expected: [...]
    },
    // ... more lessons
  ]
});
```

### Lesson id rule
`<moduleId>l<lessonNumber>` — e.g. `i2c1l1`, `i2c1l2`. Must be globally unique across all modules.

---

## Step 4a — theory field rules

Use these HTML elements only:
```html
<h2>Main concept</h2>
<h3>Sub-concept</h3>
<p>Explanation text</p>
<pre class="code-block">syntax snippet (NOT full solution)</pre>
<table class="truth-table"><tr><th>col</th></tr><tr><td>val</td></tr></table>
<code>inline keyword</code>
<ul><li>...</li></ul>
<strong>important term</strong>
```

HTML-escape inside `<pre>`: `&` → `&amp;`  `<` → `&lt;`  `>` → `&gt;`

Structure every theory section in this exact order:
1. What new concept this lesson introduces (h2 + one paragraph)
2. A short syntax snippet showing the pattern (pre.code-block) — never a full module
3. **Block diagram** — mandatory for every lesson that builds a circuit. Use `<div class="flow-diagram">` for signal-flow boxes or `<pre class="code-block">` for ASCII bus/FSM diagrams.

   Signal-flow example:
   ```html
   <div class="flow-diagram">
     <div class="flow-step">tx_en<br>tx_data</div>
     <span class="flow-arrow">→</span>
     <div class="flow-step">Output<br>Driver</div>
     <span class="flow-arrow">⇄</span>
     <div class="flow-step">SDA Bus</div>
     <span class="flow-arrow">→</span>
     <div class="flow-step">rx_data</div>
   </div>
   ```

   ASCII bus / FSM example:
   ```html
   <pre class="code-block">VDD
    │  pull-up
   SDA ──┴── Master ──── Slave

   IDLE ──(start)──→ ADDR ──→ ACK ──→ DATA ──→ STOP</pre>
   ```

4. A truth table or example table if the concept has discrete cases
5. What circuit the user will build + its truth table / behaviour
6. **Step-by-step implementation (Tier 1/2 only):** numbered `<h3>Step N — description</h3>` headings, each followed by a `<pre class="code-block">` showing ONLY that step's code fragment. Step numbers must match the tasks array exactly.

   ```html
   <h3>Step 1 — Module header</h3>
   <pre class="code-block">module open_drain_cell (
     input  logic tx_en,
     input  logic tx_data,
     inout  wire  sda,
     output logic rx_data
   );</pre>

   <h3>Step 2 — Drive the open-drain line</h3>
   <p>Release (1'bz) when idle; pull low only when actively sending a 0.</p>
   <pre class="code-block">assign sda = (tx_en &amp;&amp; !tx_data) ? 1'b0 : 1'bz;</pre>

   <h3>Step 3 — Randomized testbench loop (Tier 3+)</h3>
   <pre class="code-block">int i;
   logic [7:0] rand_val;

   for (i = 0; i &lt; 20; i++) begin
     rand_val = $urandom_range(0, 255);
     din = rand_val; @(posedge clk); #1;
   end</pre>
   ```

7. One closing sentence: `<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`

**Never put a complete working module in theory.** That goes in hint only.

---

## Step 4b — tasks field rules

Array of plain strings. Rendered as a checklist in the theory pane.

**Always start with:**
```javascript
'Code tab is blank — type every line.',
```

**Always end with (in this order):**
```javascript
'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
'Hit Run — all N PASS lines should appear in the Output tab',
```

**Middle tasks — Step N: numbered format (ALL tiers):**

Every task string between the mandatory first and last two items MUST use `'Step N: ...'` numbering starting at 1. The granularity of each step scales with the tier:
- Tier 1: one Step per line of code — include the exact text to type
- Tier 2: one Step per line — name the concept but not the full syntax
- Tier 3: one Step per code block — include a mini snippet using `\n` line breaks inside the string
- Tier 4/5: one Step per behaviour requirement

```javascript
// CORRECT — Step N: format
'Step 1: Open the module header — module and_gate (',
'Step 2: Add input a — input logic a,  (trailing comma)',
'Step 6: Write the gate logic — assign out = a & b;',
'Step 7: In the testbench, write the randomized loop:\n  for (i = 0; i < 20; i++) begin\n    rand_a = $urandom_range(0, 255);\n  end',

// WRONG — do not use these forms
'── Line 2 ──   input logic raining,   ← comma',
'Declare the always_ff block with posedge clk',
```

---

## Step 4c — difficulty tiers

Every lesson is assigned one tier. Tier rises lesson-by-lesson and chapter-by-chapter.
See `docs/i2cdesign.md` for the tier assignment table for i2c chapters.

### Tier 1 — every line spelled out
- One `Step N:` task per line of code, with the exact text to type
- Theory has matching `<h3>Step N — description</h3>` with code snippet for each step
- Format: `'Step N: Add second input port — input logic raining,  (trailing comma)'`
- Hint: complete solution with a comment on EVERY line explaining why
- Design starter: full port list in comments + logic formula

Full example tasks array (Tier 1):
```javascript
tasks: [
  'Code tab is blank — type every line.',
  'Step 1: Open the module — module open_drain_cell (',
  'Step 2: Add tx_en input — input logic tx_en,  (trailing comma)',
  'Step 3: Add tx_data input — input logic tx_data,  (trailing comma)',
  'Step 4: Add sda inout — inout wire sda,  (trailing comma)',
  'Step 5: Add rx_data output — output logic rx_data  (NO comma, last port)',
  'Step 6: Close port list — ); on its own line',
  'Step 7: Drive the line — assign sda = (tx_en && !tx_data) ? 1\'b0 : 1\'bz;',
  'Step 8: Read back — assign rx_data = sda;',
  'Step 9: Close — endmodule',
  'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
  'Hit Run — all 2 PASS lines should appear in the Output tab',
],
```

### Tier 2 — step hints, less text
- One `Step N:` task per line but only name the concept, not the full syntax
- Theory has Step N headings with condensed code snippets
- Format: `'Step 3: Second input port with trailing comma'`
- Hint: complete solution with comments on key lines only
- Design starter: port list in comments, logic formula

### Tier 3 — structural guidance
- One `Step N:` task per code block — describe what block to write
- Include a mini code snippet inside the step string using `\n` for line breaks
- **Randomization mandatory:** include a Step for the `$urandom_range` loop
- Format:
  ```javascript
  'Step 2: Add the always_ff block:\n  always_ff @(posedge clk) begin\n    if (!rst) dout <= 0;\n    else dout <= din;\n  end',
  'Step 4: Write the randomized for loop:\n  for (i = 0; i < 20; i++) begin\n    rand_val = $urandom_range(0, 255);\n    din = rand_val; @(posedge clk); #1;\n  end',
  ```
- Hint: complete clean solution, no annotations
- Design starter: module header with port names, nothing else

### Tier 4 — behaviour spec
- One `Step N:` task per behaviour requirement
- **Randomization mandatory:** include a Step requiring a `$urandom_range` testbench loop
- Format: `'Step 2: Output valid must go high exactly 1 cycle after input is latched'`
- Hint: design notes only — ASCII state diagram or truth table, no code
- Design starter: bare `module NAME ( ... );` with empty body

### Tier 5 — portfolio / project
- One `Step N:` task per specification requirement, like a real job spec
- **Randomization mandatory:** spec MUST call for ≥30-iteration randomized stress test
- Hint: ASCII block diagram + suggested sub-module list. NO implementation.
- Design starter: one comment: `// Build the X module here. See Theory for the spec.`
- End with a task: `'🎓 Portfolio piece — push this to your GitHub when complete'`

### Lesson count rule

> If a topic requires more than 4 tasks, **split it into two lessons**.
> Target **5–8 lessons per module** for all I²C chapters — never fewer than 4.
> Each lesson introduces exactly ONE new concept.

---

## Step 4d — hint field rules

Plain template literal string (not HTML). The JS renderer HTML-escapes it and wraps in `<pre>`.
Write raw `&`, `<`, `>` characters — do NOT use HTML entities in hint strings.

```javascript
hint:
`module my_module (
  input  logic clk,      // tier1: annotate every line
  input  logic rst,      // active-low synchronous reset
  output logic q         // registered output, NO comma
);

  always_ff @(posedge clk) begin
    if (!rst) q <= 0;    // reset takes priority
    else      q <= d;    // latch input on rising edge
  end

endmodule`,
```

For tier 4/5, replace code with notes:
```javascript
hint:
`DESIGN NOTES for uart_tx:

  States: IDLE → START → DATA[0..7] → STOP → IDLE

  Baud counter: counts to (CLK_FREQ/BAUD_RATE)-1, fires tick
  Bit counter:  0..7, increments on each baud tick
  Shift reg:    load parallel data on START, shift right each tick

  Ports needed:
    input  logic       clk, rst
    input  logic [7:0] data
    input  logic       send
    output logic       tx
    output logic       busy`,
```

---

## Step 4e — design (starter code) rules

Editor starts with this text. ZERO synthesizable code. Comments only.

**Tier 1/2 template:**
```javascript
design:
`// Type the NAME module here.
// Read Theory first — it explains CONCEPT.
//
// Ports:
//   input  logic clk    — clock signal
//   input  logic rst    — active-low synchronous reset
//   output logic q      — registered output
//
// Behaviour: q latches d on each rising clock edge.
//
// Delete this and start typing:
`,
```

**Tier 3 template:**
```javascript
design:
`// Type the NAME module here. See Theory for the concept.
//
// Ports: clk, rst, in[N:0], out[N:0]
//
// Delete this and start typing:
`,
```

**Tier 4/5 template:**
```javascript
design:
`// Build the NAME module here. See Theory for the full spec.
`,
```

---

## Step 4f — testbench rules (CRITICAL — Verilator 5.020)

All of these rules are mandatory. Breaking them causes silent failures.

| Rule | Correct | WRONG |
|---|---|---|
| Signal type | `logic` | `reg`, `wire` |
| Combinational block | `always_comb` | `always @(*)` |
| Sequential block | `always_ff @(posedge clk)` | `always @(posedge clk)` |
| Module name | `tb` | anything else |
| First line | `` `timescale 1ns/1ps `` | missing |
| Comparison | `===` | `==` for 4-state logic |
| Delay in clocked TB | `@(posedge clk); #1;` | bare `#5;` in clocked context |
| String delimiter | double-quote `"` | single-quote |
| inout connections | `wire` in testbench | `logic` for inout |

### Combinational testbench pattern
```javascript
testbench:
`\`timescale 1ns/1ps
module tb;
  logic a, b, out;
  my_module dut (.a(a), .b(b), .out(out));

  task automatic check(input logic va, vb, exp);
    a = va; b = vb; #5;
    if (out === exp)
      $display("PASS  a=%0b b=%0b -> out=%0b", va, vb, out);
    else
      $display("FAIL  a=%0b b=%0b -> out=%0b (expected %0b)", va, vb, out, exp);
  endtask

  initial begin
    $display("=== My Module Test ===");
    check(0, 0, 0);
    check(1, 1, 1);
    $display("Works!");
    $finish;
  end
endmodule`,
```

### Clocked / sequential testbench pattern
```javascript
testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz

  logic rst, d, q;
  my_ff dut (.clk(clk), .rst(rst), .d(d), .q(q));

  task automatic check(input logic din, exp);
    d = din;
    @(posedge clk); #1;
    if (q === exp)
      $display("PASS  d=%0b -> q=%0b", din, q);
    else
      $display("FAIL  d=%0b -> q=%0b (expected %0b)", din, q, exp);
  endtask

  initial begin
    rst = 1; repeat(2) @(posedge clk); rst = 0;
    check(1, 1);
    check(0, 0);
    $display("Flip-flop works!");
    $finish;
  end
endmodule`,
```

### Open-drain / inout testbench pattern (I²C)
```javascript
testbench:
`\`timescale 1ns/1ps
module tb;
  wire sda;          // inout must be wire in testbench
  pullup pu(sda);    // simulates external pull-up resistor

  logic tx_en, tx_data;
  logic rx_data;
  i2c_io_cell dut (.tx_en(tx_en), .tx_data(tx_data),
                    .sda(sda), .rx_data(rx_data));

  initial begin
    tx_en = 0; #5;   // released: sda should be 1 via pullup
    $display(tx_en === 0 && rx_data === 1 ?
      "PASS  released: sda=1" : "FAIL  released: sda=%0b", rx_data);
    tx_en = 1; tx_data = 0; #5;  // driving low
    $display(rx_data === 0 ?
      "PASS  driving low: sda=0" : "FAIL  driving low: sda=%0b", rx_data);
    $display("IO cell works!");
    $finish;
  end
endmodule`,
```

### FSM testbench pattern
```javascript
// Same clock setup as sequential.
// Drive inputs, wait N cycles, check outputs.
// Label each scenario: $display("--- Test: initial reset ---");
// Cover every state transition in expected[].
// Tier 4+ FSM: add a randomized input-sequence loop (Pattern E style, ≥20 iterations).
```

### Pattern D — Randomized combinational (required for Tier 3+ combinational)
```javascript
testbench:
`\`timescale 1ns/1ps
module tb;
  logic [7:0] a, b, out;
  my_module dut (.a(a), .b(b), .out(out));

  int         i;
  logic [7:0] rand_a, rand_b;

  initial begin
    $display("=== My Module Randomized Test ===");
    for (i = 0; i < 20; i++) begin
      rand_a = $urandom_range(0, 255);
      rand_b = $urandom_range(0, 255);
      a = rand_a; b = rand_b; #5;
      if (out === (rand_a & rand_b))
        $display("PASS  a=%0h b=%0h -> out=%0h", rand_a, rand_b, out);
      else
        $display("FAIL  a=%0h b=%0h -> out=%0h (expected %0h)",
                  rand_a, rand_b, out, rand_a & rand_b);
    end
    $display("Randomized test complete!");
    $finish;
  end
endmodule`,
```

### Pattern E — Randomized sequential (required for Tier 3+ clocked)
```javascript
testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst;
  logic [7:0] din, dout;
  my_register dut (.clk(clk), .rst(rst), .din(din), .dout(dout));

  int         i;
  logic [7:0] rand_val;

  initial begin
    $display("=== Randomized Register Test ===");
    rst = 1; repeat(2) @(posedge clk); rst = 0;
    for (i = 0; i < 20; i++) begin
      rand_val = $urandom_range(0, 255);
      din      = rand_val;
      @(posedge clk); #1;
      if (dout === rand_val)
        $display("PASS  din=%0h -> dout=%0h", rand_val, dout);
      else
        $display("FAIL  din=%0h -> dout=%0h (expected %0h)",
                  rand_val, dout, rand_val);
    end
    $display("Randomized sequential test complete!");
    $finish;
  end
endmodule`,
```

### Randomization rules (CRITICAL)

| Rule | Detail |
|---|---|
| Tier gate | Patterns A/B are for Tier 1/2 only. Tier 3+ MUST use Pattern D or E |
| Minimum iterations | 20 for Tier 3/4 — 30 for Tier 5 portfolio |
| Preferred function | `$urandom_range(max, min)` — **max is the first** argument |
| Loop variable | `int i;` (SystemVerilog type) — never `integer i;` |
| 1-bit signals | `$urandom_range(0, 1)` |
| 8-bit signals | `$urandom_range(0, 255)` |
| Directed vectors | May precede the loop as a sanity block; alone they are not sufficient |
| Verilator 5.020 | `$urandom_range`, `$urandom`, `$random` work without extra flags |

---

## Step 4g — expected field rules

Array of 2–4 substrings that must all appear in simulation output for the lesson to auto-complete.
- Always include at least one `PASS  ...` line
- Always include the final `$display` success message
- Do NOT include every PASS line — just enough to prove the design is correct

```javascript
expected: [
  'PASS  d=1 -> q=1',
  'Flip-flop works!'
]
```

---

## Step 5 — registering the new module

### Edit 1: `static/index.html`

Find the `<!-- SCRIPTS -->` block. Add the new script tag BEFORE `curriculum.js`:
```html
<script src="/lessons/modules/i2c1.js"></script>   ← add here
<script src="/lessons/curriculum.js"></script>
```

### Edit 2: `static/lessons/curriculum.js`

Fetch this file first. Add the new module id into the CURRICULUM array in the correct position.
The array controls display order on the landing page.

### Edit 3: `static/lessons/courses.js`  ← **CRITICAL — modules are invisible without this**

Fetch this file first. Find (or create) the course object whose `modules` array should include the new chapter.
Add the new module id at the end of that array.

```javascript
// Example: adding i2c1 as first chapter of new i2c course
{ id: 'i2c', modules: ['i2c1'] }
// Later: { id: 'i2c', modules: ['i2c1','i2c2', ...] }
```

| New chapter belongs to | Course `id` to update |
|---|---|
| msv1 – msv7 | `svzth` (all done) |
| spi1 – spi5 | `spi` |
| spitb1 – spitbN | `spitb` |
| i2c1 – i2c8 | `i2c` (create on i2c1, append thereafter) |

⚠️  This is the gate that controls whether a module card appears on the landing page.
`index.html` and `curriculum.js` register the module's data; `courses.js` makes it visible.
Omitting this edit means the module loads silently but the user never sees it.

---

## Step 6 — push (TWO commits to stay within token limits)

### Commit 1 — lesson content only
Use `mcp__github__push_files` with just the JS file:
```
files: [
  { path: 'static/lessons/modules/i2c1.js',  content: '...' },
]
message: 'feat(i2c1): I²C fundamentals chapter — 6 lessons'
branch: 'develop'
```

### Commit 2 — registration only
Use `mcp__github__push_files` with the three small registration files:
```
files: [
  { path: 'static/index.html',               content: '...' },
  { path: 'static/lessons/curriculum.js',    content: '...' },
  { path: 'static/lessons/courses.js',       content: '...' },
]
message: 'feat(i2c1): register module in index.html, curriculum.js and courses.js'
branch: 'develop'
```

**Why two commits?** The JS lesson file is ~30 KB of content. Composing it plus both
registration files in a single response exceeds the output token limit and kills the session.
Splitting into content-first then registration keeps each push well within limits.

---

## Step 8 — mark done in docs/i2cdesign.md

After the push, fetch `docs/i2cdesign.md`, change `❌ **build this next**` to `✅ done` for the
chapter just built, and set `❌ **build this next**` on the next row. Push in a separate commit:
```
files: [ { path: 'docs/i2cdesign.md', content: '...' } ]
message: 'chore: mark i2c1 done, advance curriculum cursor'
branch: 'main'
```

---

## Sub-lesson expansion policy

**Rule:** Each lesson covers exactly ONE concept. If a topic needs more than 4 tasks to explain, split it into two lessons. Target **5–8 lessons per module** for all I²C chapters.

### I²C chapter lesson targets

| Chapter | Previous target | New target | Split strategy |
|---|---|---|---|
| i2c1 (Fundamentals) | 3 | 5–6 | One lesson per concept: open-drain theory, IO cell, pull-up, readback, wire-AND, START/STOP |
| i2c2 (Timing) | 3 | 5–7 | SCL gen, bit timing, START gen, STOP gen, combining them |
| i2c3 (Byte TX) | 3 | 5–8 | Shift register, bit counter, FSM skeleton, integration, randomized TB, certificate |
| i2c4–i2c8 | 3 | 5–8 | Same principle — one new concept per lesson |

### Decomposition template

Take a heavy lesson (e.g. "Byte TX FSM") and decompose:
- Sub-lesson A: Declare the state enum and FSM skeleton (no datapath logic yet)
- Sub-lesson B: Implement IDLE → LOAD → SHIFT states
- Sub-lesson C: Implement ACK phase and STOP generation
- Sub-lesson D: Randomized testbench — 20-iteration `$urandom_range` byte loop

Lesson IDs are plain sequential integers — no a/b/c suffixes:
```
i2c2l1, i2c2l2, i2c2l3, i2c2l4, i2c2l5, i2c2l6
```

---

## Certification milestones

Add these as the final task in the last lesson of the trigger chapter:

| Certificate | Trigger lesson | Task string to add |
|---|---|---|
| VLSI Foundations | msv2 L4 | `'🎓 VLSI Foundations certificate unlocked — complete msv1 + msv2 to claim it'` |
| Digital Design | msv4 L4 | `'🎓 Digital Design certificate unlocked — complete msv3 + msv4 to claim it'` |
| Systems Engineer | msv6 L4 | `'🎓 Systems Engineer certificate unlocked — complete msv5 + msv6 to claim it'` |
| VLSI Architect | msv7 L4 | `'🎓 VLSI Architect certificate unlocked — you built a CPU from scratch'` |
| I²C Fundamentals | i2c3 L6 | `'🎓 I²C Fundamentals certificate unlocked — you can transmit and receive I²C bytes'` |
| I²C Design Engineer | i2c8 L5 | `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'` |

---

## Quality checklist — run before every push

```
[ ] All lesson ids are unique (check other module JS files first)
[ ] Every lesson has all 8 fields: id, title, theory, tasks, hint, design, testbench, expected
[ ] Theory has NO complete working module code
[ ] Theory has a block diagram (flow-diagram div or ASCII pre) for every circuit lesson
[ ] Tier 1/2: theory has Step N headings with code snippets matching the tasks
[ ] All task strings use "Step N:" format — no bare strings, no "── Line N ──" strings
[ ] Task Step N numbers match Theory Step N headings exactly
[ ] Hint has the complete solution (or design notes for tier 4/5)
[ ] Design starter has ZERO synthesizable code
[ ] Testbench: `logic` only for driven signals; `wire` for inout connections
[ ] Testbench module named exactly `tb`
[ ] Testbench first line is `\`timescale 1ns/1ps`
[ ] All $display assertion lines begin with PASS or FAIL
[ ] expected[] substrings all appear in a correct simulation run
[ ] Verilator timing task line present in every lesson
[ ] Tier 3+ testbench uses Pattern D or E — $urandom_range loop with ≥20 iterations
[ ] Difficulty tier is correct per docs/i2cdesign.md tier table
[ ] Module contains 5–8 lessons (split any topic that needs >4 tasks)
[ ] index.html <script> tag added before curriculum.js
[ ] curriculum.js updated with module id
[ ] courses.js updated — module id added to the correct course's modules array
[ ] docs/i2cdesign.md updated: ❌ → ✅ for built chapter, cursor advanced
[ ] I²C: inout ports used correctly; SDA/SCL released with 1'bz not 1'b1
[ ] I²C: pullup primitive in every testbench that uses inout wires
```

---

## Voice and tone rules

- Write as if explaining to someone who programs but has never done hardware
- Use physical analogies: "a flip-flop is like a light switch that can only change state when you clap"
- Never use the words "easy", "simple", "trivial", "just", "obviously"
- When a concept is genuinely hard, say so: "This one takes a few tries — that's completely normal"
- Portfolio lessons feel like real work: "This is a real interview question at hardware companies"
- Every chapter ends with forward momentum: "In the next chapter, you'll use this to build X"
- I²C open-drain: "only one person can pull the rope down; everyone else lets go — gravity brings it back up"

---

## Reference

See `agent.md` in this repo for:
- Full lesson object schema with field-by-field documentation
- Detailed testbench patterns for each lesson type
- HTML class reference for theory content
- Hint writing examples at each tier

See `docs/spi.md` for the complete SystemVerilog Zero to Hero chapter content guide (msv1–msv7).
See `docs/i2cdesign.md` for the I²C Design course chapter content guide (i2c1–i2c8).
