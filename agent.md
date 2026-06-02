# agent.md — Chapter Author's Guide

This file tells any AI agent (or human) exactly how to write new chapters for **All About VLSI**.
It captures every design decision made during the creation of `msv1` (the first chapter),
so every future chapter feels like it came from the same author.

---

## 1. Project at a glance

| Item | Detail |
|---|---|
| Repo | `dhatsme/all_about_vlsi_verillog_gui` |
| Branch | `main` (Railway auto-deploys from here) |
| Simulator | iverilog (default) + Verilator 5.020 (optional) |
| Lesson files | `static/lessons/modules/mXX.js` |
| Registration | `static/index.html` — add `<script src="/lessons/modules/mXX.js"></script>` BEFORE `curriculum.js` |
| Curriculum order | `static/lessons/curriculum.js` — push to `CURRICULUM` array in display order |

### File naming convention

```
msv1.js   → "sv" prefix = SystemVerilog series, chapter 1
m2.js     → original series, chapter 2
m17.js    → next free number after m16
```

Choose the next free `mXX` number (currently m1–m6, m13–m16 exist; use m17 onward for new work).

---

## 2. Lesson JS object — complete schema

Every lesson inside a module's `lessons` array must have exactly these fields:

```javascript
{
  id:         'mXXlY',          // unique across ALL modules — e.g. 'm17l1'
  title:      'L1 — Short Title',

  // ── THEORY ───────────────────────────────────────────────────────────
  // HTML string. Rendered into .theory-content div.
  // Rules:
  //   - NO complete code examples — those go in hint only
  //   - Explain the WHY and WHAT, not the exact keystrokes
  //   - End with exactly one sentence pointing to Code tab + hint
  //   - Use: <h2>, <h3>, <p>, <pre class="code-block">, <table class="truth-table">,
  //          <code>, <ul>/<ol>, <li>, <strong>, <em>
  //   - HTML-escape & → &amp;  < → &lt;  > → &gt;  inside pre blocks
  theory: `...`,

  // ── TASKS ────────────────────────────────────────────────────────────
  // Array of strings. Shown as checklist in theory pane.
  // Rules:
  //   - First item always: what state the editor is in
  //   - ALL tiers: use "Step N:" numbered format for every middle task
  //   - Tier 1-2: one Step per line of code, with the exact text to type
  //   - Tier 3-4: one Step per code block; include mini snippet using \n
  //   - Tier 5 (project): one Step per spec requirement
  //   - Tier 3+ MUST include a Step for the $urandom_range loop
  //   - Second-to-last item: Verilator timing note (see template below)
  //   - Last item: "Hit Run — X test cases must print PASS"
  tasks: [
    'Code tab is blank — type every line.',
    // ... Step N: tasks ...
    'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
    'Hit Run — all N PASS lines should appear in the Output tab',
  ],

  // ── HINT ─────────────────────────────────────────────────────────────
  // Plain string (NOT HTML). JS escapes it and wraps in <pre class="hint-pre">.
  // Rules:
  //   - ALWAYS contains the complete working solution
  //   - Tier 1-2: annotated — inline comments on every line explaining the why
  //   - Tier 3-4: clean code, no annotations
  //   - Tier 5 (project): design notes / block diagram in ASCII, NOT full code
  //   - Use raw & < > characters — the JS renderer escapes them
  hint: `module foo (\n  ...\n);\n  ...\nendmodule`,

  // ── DESIGN (starter code) ────────────────────────────────────────────
  // What the user sees when they open the Code tab.
  // Rules:
  //   - ALWAYS blank of synthesizable code — comments only
  //   - List the ports and the logic formula as comments
  //   - End with: // Delete this and start typing:
  //   - Tier 1-2: detailed port list in comments
  //   - Tier 3+: shorter comment scaffold, less hand-holding
  design: `// Type the foo module here.\n// ...\n`,

  // ── TESTBENCH ────────────────────────────────────────────────────────
  // Complete, runnable SystemVerilog testbench.
  // Rules — Verilator 5.020 compatibility (MANDATORY):
  //   - Use `logic` not `reg`/`wire`
  //   - Use `always_comb` not `always @(*)`
  //   - Delays: use `task automatic check(...); ... #5; ... endtask` pattern
  //   - NEVER use #delay outside a task or initial block
  //   - `$display` for output — use PASS/FAIL prefix for `expected` matching
  //   - End with `$finish;`
  //   - `\`timescale 1ns/1ps` on line 1
  //   - Module name must be exactly `tb`
  //   - Tier 3+: MUST include $urandom_range loop (Pattern D or E)
  testbench: `\`timescale 1ns/1ps\nmodule tb;\n  ...\nendmodule`,

  // ── EXPECTED ─────────────────────────────────────────────────────────
  // Array of substrings that MUST appear in simulation output for lesson to be
  // marked complete. Keep to 2-4 lines — enough to prove correctness.
  expected: [
    'PASS  ...',
    'Circuit works!'
  ]
}
```

---

## 3. Theory tab — writing rules

### Structure (in this order)
1. **Concept heading** — what new idea this lesson introduces
2. **Analogy or diagram** — ground it in something physical
3. **Block diagram** — show a circuit diagram, bus topology, or FSM state diagram.
   Use `<div class="flow-diagram">` for signal-flow boxes, or ASCII art in `<pre class="code-block">` for bus topologies and state machines. Every lesson that builds a circuit MUST have one.

   Signal flow example:
   ```html
   <div class="flow-diagram">
     <div class="flow-step">tx_en<br>tx_data</div>
     <span class="flow-arrow">→</span>
     <div class="flow-step">Output<br>Driver<br>(tristate)</div>
     <span class="flow-arrow">⇄</span>
     <div class="flow-step">SDA Bus<br>(wire-AND)</div>
     <span class="flow-arrow">→</span>
     <div class="flow-step">rx_data</div>
   </div>
   ```

   Bus topology / FSM example:
   ```html
   <pre class="code-block">VDD
    │  pull-up
   SDA ──┴── Master ──── Slave
   SCL ──┬── Master ──── Slave

   IDLE ──(start)──→ ADDR ──→ ACK ──→ DATA ──→ STOP</pre>
   ```

4. **Syntax block** — show the pattern, not a complete module
5. **Truth table or example table** — for any boolean logic
6. **What you are building** — describe the circuit, show truth table
7. **Step-by-step implementation (Tier 1/2 only)** — numbered headings that mirror the tasks array exactly. Each step gets one `<h3>Step N — description</h3>` followed by a `<pre class="code-block">` showing ONLY that step's code fragment (never the full module).

   Example:
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

   <h3>Step 3 — Read back from the bus</h3>
   <pre class="code-block">assign rx_data = sda;</pre>

   <h3>Step 4 — Randomized testbench loop (Tier 3+)</h3>
   <p>Use <code>$urandom_range(0, 255)</code> inside a for loop — 20 iterations minimum.</p>
   <pre class="code-block">int i;
   logic [7:0] rand_val;

   for (i = 0; i &lt; 20; i++) begin
     rand_val = $urandom_range(0, 255);
     din = rand_val;
     @(posedge clk); #1;
   end</pre>
   ```

8. **One-line call to action** — "Switch to Code tab. Stuck? Tap 💡 Show Hint."

### Do NOT put in theory
- Complete module code (goes in hint)
- Line-by-line instructions (go in tasks)
- Answers to the exercise

### HTML classes available
```html
<pre class="code-block">        <!-- monospaced, dark card, syntax-style -->
<table class="truth-table">        <!-- bordered, mono font -->
<code>                             <!-- inline, accent colour -->
<div class="flow-diagram">         <!-- horizontal flow boxes -->
  <div class="flow-step">...</div>
  <span class="flow-arrow">→</span>
</div>
```

---

## 4. Difficulty tiers — the scaffolding curve

This is the core pedagogical rule. Every lesson has one of five tiers.
Tier rises **within** a chapter and **across** chapters.

### Tier 1 — Fully guided (msv1 L1)
- Tasks use **Step N:** format, one step per line of code, with the exact text to type
- Theory has matching **Step N —** headings each followed by a code snippet
- Hint is the full solution with annotation on every line
- Design starter has detailed port comments
- Good for: first-ever concept, new syntax never seen before

Example tasks array:
```javascript
tasks: [
  'Code tab is blank — type every line.',
  'Step 1: Open the module header — module and_gate (',
  'Step 2: Add input a — input logic a,  (trailing comma)',
  'Step 3: Add input b — input logic b,  (trailing comma)',
  'Step 4: Add output — output logic out  (NO comma, last port)',
  'Step 5: Close port list — ); on its own line',
  'Step 6: Write the gate logic — assign out = a & b;',
  'Step 7: Close — endmodule',
  'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
  'Hit Run — all 4 PASS lines should appear in the Output tab',
],
```

### Tier 2 — Step hints (msv1 L2, L3)
- Tasks use **Step N:** format naming the concept, not the full syntax
- Theory has Step N headings with condensed code snippets
- Hint is the full solution with brief inline comments
- Design starter has port list in comments
- Good for: second time using a concept, minor extension

Example tasks:
```javascript
'Step 1: Timescale directive — `timescale 1ns/1ps',
'Step 2: Module header with 4 ports',
'Step 3: Conditional assign for the tristate sda line',
'Step 4: Read-back assign for rx_data',
```

### Tier 3 — Structural guidance
- Tasks use **Step N:** format, one step per code block (not per line)
- Include a mini code snippet inside the step string where helpful (use `\n` for line breaks)
- Hint is clean, unannotated complete solution
- Design starter has only the module header with port names as comments
- Good for: applying a known concept in a slightly harder context
- This is where users start to struggle a little — that is intentional
- **Randomization mandatory:** tasks MUST include a Step for the `$urandom_range` loop

Example tasks:
```javascript
'Step 1: Declare the module ports — clk, rst, [7:0] din, [7:0] dout',
'Step 2: Add the always_ff block:\n  always_ff @(posedge clk) begin\n    if (!rst) dout <= 0;\n    else dout <= din;\n  end',
'Step 3: In the testbench declare — int i; logic [7:0] rand_val;',
'Step 4: Write the randomized for loop:\n  for (i = 0; i < 20; i++) begin\n    rand_val = $urandom_range(0, 255);\n    din = rand_val; @(posedge clk); #1;\n  end',
```

### Tier 4 — Spec only
- Tasks use **Step N:** format describing desired behaviour, not implementation
- Hint has only design notes: a truth table, a state diagram in ASCII, or key equations
- Design starter is a bare port list, nothing else
- Good for: mid-series, when the user knows the primitives
- **Randomization mandatory:** spec MUST call for a randomized testbench loop

Example tasks:
```javascript
'Step 1: The counter must roll over from 9 back to 0',
'Step 2: Output valid must go high exactly 1 cycle after input is latched',
'Step 3: Your testbench must run 20 randomized iterations using $urandom_range(0, 9)',
```

### Tier 5 — Project / portfolio piece
- Tasks are **Step N:** requirements list, like a real spec document
- Hint contains an ASCII block diagram and suggested module decomposition, no code
- Design starter is completely blank except for the module header
- End of lesson shows "🎓 Portfolio piece — add this to your GitHub"
- Good for: capstone lessons, end-of-chapter projects
- **Randomization mandatory:** spec MUST call for ≥30-iteration randomized stress test

Example tasks:
```javascript
'Step 1: Implement START and STOP condition generation on SDA',
'Step 2: Support clock stretching — hold SCL low when slave pulls it low',
'Step 3: Your testbench must run 30 randomized byte transactions using $urandom_range(0, 255)',
'🎓 Portfolio piece — push this to your GitHub when complete',
```

### Lesson count rule

> If a topic requires more than 4 tasks to explain, **split it into two lessons**.
> Aim for **5–8 lessons per module** — never fewer than 4.
> This is especially important for I²C chapters where each protocol concept
> (open-drain, START, ACK, clock stretching) deserves its own focused lesson.

### Tier mapping per chapter

| Chapter | Tier range | Notes |
|---|---|---|
| msv1 (Getting Started) | 1 → 2 | All lessons tier 1 or 2 |
| msv2 (Sequential Logic) | 2 → 3 | Introduce flip-flops at tier 2, registers at tier 3 |
| msv3 (Arithmetic) | 3 | Adder, subtractor, comparator |
| msv4 (State Machines) | 3 → 4 | FSM theory at 3, design your own at 4 |
| msv5 (Memory & Storage) | 4 | SRAM, FIFO |
| msv6 (Serial Protocols) | 4 → 5 | UART-TX at 4, SPI at 5 |
| msv7 (Projects) | 5 | All portfolio pieces |

---

## 5. Full curriculum roadmap

Build chapters in this order. Each chapter is one JS file.

### Chapter msv2 — Sequential Logic (next to build)
**File:** `static/lessons/modules/msv2.js`  
**Register in index.html before curriculum.js**

| Lesson | Topic | Tier | New concept |
|---|---|---|---|
| L1 | D Flip-Flop | 2 | `always_ff`, `posedge clk`, `reset` |
| L2 | 4-bit Register | 2 | `logic [3:0]`, bus signals |
| L3 | Shift Register | 3 | Multi-bit shift, `<<` operator |
| L4 | Clock Divider | 3 | Counter, modulo logic |

**Key Verilator note for sequential:** Use `--timing` in Verilator for any design with `#delay` in testbench. For lessons L1–L4 use `task automatic` with `@(posedge clk)` instead of `#delay`.

**Testbench pattern for clocked designs:**
```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz

  logic rst, d, q;
  dff dut (.clk(clk), .rst(rst), .d(d), .q(q));

  task automatic tick(input logic din, input logic exp);
    d = din;
    @(posedge clk); #1;   // sample just after clock edge
    if (q === exp)
      $display("PASS  d=%0b -> q=%0b", din, q);
    else
      $display("FAIL  d=%0b -> q=%0b (expected %0b)", din, q, exp);
  endtask

  initial begin
    rst = 1; @(posedge clk); #1; rst = 0;
    tick(1, 1);
    tick(0, 0);
    $display("Flip-flop works!");
    $finish;
  end
endmodule
```

---

### Chapter msv3 — Arithmetic Circuits
**File:** `static/lessons/modules/msv3.js`

| Lesson | Topic | Tier | New concept |
|---|---|---|---|
| L1 | Half Adder | 2 | `^` (XOR), multi-output module |
| L2 | Full Adder | 3 | Carry chain, `{cout, sum}` concatenation |
| L3 | 4-bit Ripple Adder | 3 | `generate`-free chain, module instantiation |
| L4 | 2s Complement Subtractor | 4 | Invert + add 1, signed arithmetic |
| L5 | **Portfolio: 8-bit ALU** | 5 | ADD/SUB/AND/OR/XOR selected by opcode |

---

### Chapter msv4 — Finite State Machines
**File:** `static/lessons/modules/msv4.js`

| Lesson | Topic | Tier | New concept |
|---|---|---|---|
| L1 | Traffic Light (2-state) | 3 | `typedef enum`, `unique case` |
| L2 | Vending Machine | 3 | 4-state FSM, coin accumulator |
| L3 | Sequence Detector | 4 | Overlapping patterns, Moore vs Mealy |
| L4 | **Portfolio: Combination Lock** | 5 | 6-digit FSM, error recovery state |

**FSM template for theory:**
```
STATE DIAGRAM  (always draw this in theory)

  IDLE ──button──→ S1 ──button──→ S2
   ↑                                │
   └────────────────────────────────┘  (reset)
```

---

### Chapter msv5 — Memory & Storage
**File:** `static/lessons/modules/msv5.js`

| Lesson | Topic | Tier | New concept |
|---|---|---|---|
| L1 | Register File (8×8) | 3 | 2D `logic` arrays, read/write ports |
| L2 | Synchronous SRAM | 4 | `logic [7:0] mem [0:255]` |
| L3 | FIFO (depth 8) | 4 | Read/write pointers, full/empty flags |
| L4 | **Portfolio: Stack (LIFO)** | 5 | Push/pop with overflow detection |

---

### Chapter msv6 — Serial Protocols
**File:** `static/lessons/modules/msv6.js`

| Lesson | Topic | Tier | New concept |
|---|---|---|---|
| L1 | UART Transmitter | 4 | Start/stop bits, baud rate counter |
| L2 | UART Receiver | 4 | Oversampling, framing error |
| L3 | **Portfolio: SPI Master** | 5 | CPOL/CPHA modes, 8-bit transfer |
| L4 | **Portfolio: I2C Controller** | 5 | ACK/NACK, repeated start |

---

### Chapter msv7 — Capstone Projects
**File:** `static/lessons/modules/msv7.js`  
**Level: advanced**

| Lesson | Topic | Tier | Portfolio value |
|---|---|---|---|
| L1 | PWM Generator | 5 | Motor/LED control |
| L2 | VGA Sync Generator | 5 | Display output, pixel clock |
| L3 | Simple Calculator | 5 | Multi-module design, top-level |
| L4 | **Capstone: RISC-V RV32I Core** | 5 | CPU design — the ultimate project |

---

## 6. Certification milestones

At the end of these chapters, display a certificate prompt in the Output pane.
The frontend already has the `showBanner('pass', ...)` mechanism — use it with a special message.

| Certificate | Earned after | How to trigger |
|---|---|---|
| **VLSI Foundations** | All of msv1 + msv2 complete | Last lesson of msv2 sets banner: "🎓 Certificate unlocked: VLSI Foundations" |
| **Digital Design** | All of msv3 + msv4 complete | Same pattern |
| **Systems Engineer** | All of msv5 + msv6 complete | Same pattern |
| **VLSI Architect** | All of msv7 complete | Same pattern + confetti toast |

To implement: add to `markComplete()` in `app.js` a check:
```javascript
const CERT_MILESTONES = {
  'msv2l4': { name: 'VLSI Foundations',  modules: ['msv1','msv2'] },
  'msv4l4': { name: 'Digital Design',    modules: ['msv3','msv4'] },
  'msv6l4': { name: 'Systems Engineer',  modules: ['msv5','msv6'] },
  'msv7l4': { name: 'VLSI Architect',    modules: ['msv7'] },
};
```

---

## 7. Verilator 5.020 compatibility rules

These are MANDATORY. Violations cause cryptic errors that confuse learners.

| Rule | Correct | Wrong |
|---|---|---|
| Signal type | `logic` | `reg`, `wire` |
| Combinational block | `always_comb` | `always @(*)` |
| Sequential block | `always_ff @(posedge clk)` | `always @(posedge clk)` |
| Clocked testbench delay | `@(posedge clk); #1;` | `#5;` in clocked context |
| Module name in testbench | `tb` | anything else |
| Timescale | `` `timescale 1ns/1ps `` on line 1 | missing |
| Timing option | Task must mention `--no-timing` | silently broken |
| String in `$display` | double-quoted | single-quoted |
| Unsigned compare | Use `===` not `==` for 4-state | comparison bugs |

### When to use `--timing` vs `--no-timing`
- `--no-timing`: all combinational designs (msv1, msv3), and clocked designs where testbench uses `@(posedge clk)` not `#delay`
- `--timing`: any testbench with `#delay` outside a procedural block, or UVM

Always write the Verilator task line in tasks as:
> `'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running'`

(Change to `--timing` only if the lesson truly requires it.)

---

## 8. Testbench patterns by lesson type

### Pattern A — Combinational (Tier 1/2 only)
```systemverilog
`timescale 1ns/1ps
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
endmodule
```

### Pattern B — Clocked / sequential (Tier 1/2 only)
```systemverilog
`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, in, out;
  my_ff dut (.clk(clk), .rst(rst), .in(in), .out(out));

  task automatic check(input logic d, exp);
    in = d;
    @(posedge clk); #1;
    if (out === exp)
      $display("PASS  in=%0b -> out=%0b", d, out);
    else
      $display("FAIL  in=%0b -> out=%0b (expected %0b)", d, out, exp);
  endtask

  initial begin
    rst = 1; repeat(2) @(posedge clk); rst = 0;
    check(1, 1);
    check(0, 0);
    $display("Flip-flop works!");
    $finish;
  end
endmodule
```

### Pattern C — FSM
```systemverilog
// Same clk setup as pattern B.
// Drive inputs, wait N cycles, check outputs.
// Label each test with $display("--- Test: idle state ---");
// Tier 4+ FSM testbenches: add a randomized input-sequence loop (Pattern E style).
```

### Pattern D — Randomized combinational (Tier 3+ required)
```systemverilog
`timescale 1ns/1ps
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
endmodule
```

**When to use:** Any Tier 3+ combinational lesson. Replace the handful of directed `check()` calls with this loop.

### Pattern E — Randomized sequential (Tier 3+ required for clocked designs)
```systemverilog
`timescale 1ns/1ps
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
      din = rand_val;
      @(posedge clk); #1;
      if (dout === rand_val)
        $display("PASS  din=%0h -> dout=%0h", rand_val, dout);
      else
        $display("FAIL  din=%0h -> dout=%0h (expected %0h)", rand_val, dout, rand_val);
    end
    $display("Randomized test complete!");
    $finish;
  end
endmodule
```

**When to use:** Any Tier 3+ clocked lesson (register, shift register, counter, FIFO, UART, I²C byte TX).

### Mandatory randomization rule (Tier 3 and above)

Every Tier 3, 4, or 5 testbench **MUST** include at least one randomized loop of 20 or more iterations.

| Rule | Detail |
|---|---|
| Preferred function | `$urandom_range(max, min)` — note: **max is the first** argument |
| Loop variable | `int i;` (SystemVerilog) — never `integer i;` (Verilog) |
| Minimum iterations | 20 for Tier 3/4; 30 for Tier 5 portfolio |
| Directed tests | Allowed as a pre-loop sanity block; alone they are **not** sufficient for Tier 3+ |
| 1-bit signals | `$urandom_range(0, 1)` |
| 8-bit signals | `$urandom_range(0, 255)` |
| Verilator 5.020 | `$urandom_range`, `$urandom`, `$random` all work without extra flags |
| iverilog | Same functions work without extra options |

---

## 9. Hint writing rules

- **Tier 1**: annotate every line — `// line 2: first input, comma`
- **Tier 2**: annotate key lines — `// & = AND,  ~ = NOT`
- **Tier 3**: no annotations, clean code only
- **Tier 4**: design notes in comments, no complete code block
- **Tier 5**: ASCII block diagram + suggested port list, no implementation

Hint is a raw JS template literal — use `&`, `<`, `>` directly.  
The `renderTheory()` function HTML-escapes it automatically before display.

---

## 10. Design starter writing rules

The design tab must always be blank of logic. Give only:
1. A one-line comment saying what to type and where to read first
2. The port list as comments (format: `//   direction type name — description`)
3. The logic formula as a comment
4. `// Delete this and start typing:` as the last line

Tier 3+: shorten the scaffold — list ports but omit formulas.
Tier 5: one comment only: `// Build the XXXX module here. See Theory for the spec.`

---

## 11. How to add a new module — step by step

1. Create `static/lessons/modules/msv2.js` (or next free number)
2. Follow the lesson object schema in section 2
3. The file must call:
   ```javascript
   (window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({ ... });
   ```
4. Open `static/index.html`, find the `<!-- SCRIPTS -->` block, add:
   ```html
   <script src="/lessons/modules/msv2.js"></script>
   ```
   It must appear **before** `<script src="/lessons/curriculum.js"></script>`
5. Open `static/lessons/curriculum.js`, add the module id to the `CURRICULUM` array in the correct position
6. Commit both files in one push
7. Test: open the app, the module card should appear on the landing page

---

## 12. Quality checklist before pushing any chapter

- [ ] Every lesson has all 8 required fields (id, title, theory, tasks, hint, design, testbench, expected)
- [ ] Theory has NO complete working code — only concept snippets
- [ ] Theory has a block diagram (flow-diagram div or ASCII pre) showing what circuit is built
- [ ] Tier 1/2: theory has Step N headings with matching code snippets for each step
- [ ] Task Step N numbers match the Theory Step N headings exactly
- [ ] All task strings use "Step N:" format — no bare descriptions, no "── Line N ──" strings
- [ ] Hint has the complete solution
- [ ] Design tab is blank of logic
- [ ] Testbench uses `logic` everywhere (no `reg`/`wire`)
- [ ] Testbench module is named exactly `tb`
- [ ] `$display` uses `PASS` or `FAIL` prefix on assertion lines
- [ ] `expected` array substrings all appear in a correct run
- [ ] Verilator timing task line is in tasks array
- [ ] Difficulty tier is correct for the chapter's position in the series
- [ ] Tier 3+ testbench uses Pattern D or E with `$urandom_range` loop (≥20 iterations)
- [ ] Lesson ids are globally unique (check existing files)
- [ ] Each module targets 5–8 lessons — if a topic needs >4 tasks, split into two lessons
- [ ] `index.html` script tag added before curriculum.js
- [ ] `curriculum.js` updated with module id

---

## 13. Voice and tone

- Write theory as if explaining to someone who knows programming but has never touched hardware
- Use physical analogies: "think of a module like a chip from an electronics store"
- Never say "easy" or "simple" — it discourages users who find it hard
- Celebrate progress: task completions use encouraging language
- When introducing a hard concept, acknowledge it: "This one takes a few tries — that's normal"
- Portfolio lessons should feel like real work: "Your first professional-grade design"
