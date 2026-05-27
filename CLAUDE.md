# CLAUDE.md — All About VLSI — Lesson-Building Agent

This file is read automatically by Claude Code at session start.
It is the operating instructions for the autonomous lesson-building agent.
Read this file completely before doing anything else.

---

## Mission

Build the next unchecked chapter in the curriculum table below.
One chapter = one JS file + two registration edits.
Push to `main` when done. Then mark the chapter done in this file (replace `❌` with `✅`).
Repeat for the next chapter.

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
| 4 | `msv4` | Finite State Machines | L1 Traffic Light, L2 Vending Machine, L3 Sequence Detector, L4 Combo Lock (portfolio) | ❌ **build this next** |
| 5 | `msv5` | Memory & Storage | L1 Register File, L2 Sync SRAM, L3 FIFO, L4 Stack (portfolio) | ❌ |
| 6 | `msv6` | Serial Protocols | L1 UART TX, L2 UART RX, L3 SPI Master (portfolio), L4 I2C Controller (portfolio) | ❌ |
| 7 | `msv7` | Capstone Projects | L1 PWM, L2 VGA Sync, L3 Calculator, L4 RISC-V RV32I Core | ✅ done |

---

## Build loop — run this every session

```
1. Read this file top-to-bottom
2. Find the first ❌ row — that is the target chapter
3. Read agent.md for full schema, difficulty tiers, and testbench patterns
4. Build the lesson file  →  static/lessons/modules/<moduleId>.js
5. Register it            →  two edits (index.html + curriculum.js)
6. Push all three files in one commit to main
7. Edit this CLAUDE.md: change ❌ to ✅ for the chapter just built
8. Push this file to main
9. Stop — do not build the next chapter in the same session
    (one chapter per session keeps changes reviewable)
```

---

## Step 4 — writing the lesson file

### File location
```
static/lessons/modules/msv2.js    ← sequential logic
static/lessons/modules/msv3.js    ← arithmetic
... etc
```

### File skeleton
```javascript
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv2',
  title: 'Sequential Logic',
  icon: '🔄',        // pick a relevant emoji
  level: 'beginner',  // beginner | intermediate | advanced
  lessons: [
    {
      id: 'msv2l1',
      title: 'L1 — D Flip-Flop',
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
`<moduleId>l<lessonNumber>` — e.g. `msv2l1`, `msv2l2`. Must be globally unique across all modules.

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
3. A truth table or example table if the concept has discrete cases
4. What circuit the user will build + its truth table / behaviour
5. One closing sentence: `<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`

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

**Middle tasks depend on difficulty tier (see below).**

---

## Step 4c — difficulty tiers

Every lesson is assigned one tier. Tier rises lesson-by-lesson and chapter-by-chapter.

### Tier 1 — every line spelled out
- One task per line of code, with the exact text to type
- Format: `'── Line 2 ──  input logic raining,   ← comma'`
- Hint: complete solution with a comment on EVERY line explaining why
- Design starter: full port list in comments + logic formula
- Use for: first appearance of any new concept (msv2 L1 = tier 1 for always_ff)

### Tier 2 — line markers, less text
- One task per line but only name the concept, not the full text
- Format: `'── Line 3 ──  second input port, with comma'`
- Hint: complete solution with comments on key lines only
- Design starter: port list in comments, logic formula
- Use for: second use of a concept in the same chapter

### Tier 3 — structural guidance
- Tasks describe what block to write, not which line
- Format: `'Declare the always_ff block with posedge clk and active-low reset'`
- Hint: complete clean solution, no annotations
- Design starter: module header with port names, nothing else
- Use for: chapters msv3, msv4 — user knows the primitives now

### Tier 4 — behaviour spec
- Tasks describe what the circuit must do, not how to build it
- Format: `'Output valid must go high exactly 1 cycle after input is latched'`
- Hint: design notes only — ASCII state diagram or truth table, no code
- Design starter: bare `module NAME ( ... );` with empty body
- Use for: chapters msv5, msv6 — user should start struggling productively

### Tier 5 — portfolio / project
- Tasks are a requirements list like a real job spec
- Hint: ASCII block diagram + suggested sub-module list. NO implementation.
- Design starter: one comment: `// Build the X module here. See Theory for the spec.`
- End with a task: `'🎓 Portfolio piece — push this to your GitHub when complete'`
- Use for: last lesson of every chapter from msv3 onward, and all of msv7

### Tier assignment per lesson

| Chapter | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|
| msv2 Sequential | T1 | T2 | T3 | T3 | — |
| msv3 Arithmetic | T2 | T3 | T3 | T4 | T5 |
| msv4 FSM | T3 | T3 | T4 | T5 | — |
| msv5 Memory | T3 | T4 | T4 | T5 | — |
| msv6 Protocols | T4 | T4 | T5 | T5 | — |
| msv7 Capstone | T5 | T5 | T5 | T5 | — |

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

### FSM testbench pattern
```javascript
// Same clock setup as sequential.
// Drive inputs, wait N cycles, check outputs.
// Label each scenario: $display("--- Test: initial reset ---");
// Cover every state transition in expected[].
```

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
<script src="/lessons/modules/msv1.js"></script>
<script src="/lessons/modules/msv2.js"></script>   ← add here
<script src="/lessons/curriculum.js"></script>
```

### Edit 2: `static/lessons/curriculum.js`

Fetch this file first. Add the new module id into the CURRICULUM array in the correct position (after msv1, before msv3 etc). The array controls display order on the landing page.

---

## Step 6 — push

Use `mcp__github__push_files` with ALL changed files in one commit:
```
files: [
  { path: 'static/lessons/modules/msv2.js',  content: '...' },
  { path: 'static/index.html',               content: '...' },
  { path: 'static/lessons/curriculum.js',    content: '...' },
]
message: 'feat(msv2): sequential logic chapter — 4 lessons'
branch: 'main'
```

---

## Step 8 — mark done in this file

After the push, fetch this CLAUDE.md, change `❌ **build this next**` to `✅ done` for the chapter just built, and set `❌ **build this next**` on the next row. Push in a separate commit:
```
message: 'chore: mark msv2 done, advance curriculum cursor'
```

---

## Chapter content guide — what to build

### msv2 — Sequential Logic
**Level:** beginner  **Icon:** 🔄

**L1 — D Flip-Flop** (Tier 1)
- New concept: `always_ff`, `posedge clk`, synchronous reset with `if (!rst)`
- Circuit: 1-bit D flip-flop with active-low synchronous reset
- Truth table: rst=0→q=0, rst=1→q follows d on clock edge
- Theory: explain the difference between combinational (instant) and sequential (clocked) logic
- Analogy: "a flip-flop is memory — it remembers one bit between clock ticks"
- Ports: `clk, rst, d, q`
- Logic: `always_ff @(posedge clk) if (!rst) q <= 0; else q <= d;`
- Note: use `<=` (non-blocking) in always_ff, explain WHY (avoids race conditions)
- Testbench: clocked pattern, test reset then normal operation

**L2 — 4-bit Register** (Tier 2)
- New concept: `logic [3:0]` bus signals, vector assignment
- Circuit: 4-bit D register (4 flip-flops in parallel)
- Explain: `[3:0]` means bit 3 is MSB, bit 0 is LSB
- Ports: `clk, rst, d[3:0], q[3:0]`
- Logic: same always_ff pattern but with buses
- Testbench: load 4'b1010, load 4'b0101, reset

**L3 — Shift Register** (Tier 3)
- New concept: `<<` and `>>` shift operators, serial-in parallel-out
- Circuit: 4-bit SIPO shift register
- Theory: explain shift as each bit moving one position per clock
- Ports: `clk, rst, sin, q[3:0]`
- Logic: `q <= {q[2:0], sin};` — concatenation to shift
- Testbench: shift in 1,0,1,1 — verify q becomes 4'b1011

**L4 — Clock Divider** (Tier 3)
- New concept: counter, modulo rollover
- Circuit: divides clock by N (produce 1 pulse every N cycles)
- Ports: `clk, rst, clk_div` (output)
- Logic: counter counts to N-1 then resets, clk_div toggles
- Testbench: simulate 20 cycles, verify clk_div toggles at correct rate
- Certification note: completing msv1+msv2 unlocks "VLSI Foundations" certificate
  - Add to last task: `'🎓 You\'ve earned the VLSI Foundations certificate — complete msv1 + msv2 to unlock it'`

---

### msv3 — Arithmetic Circuits
**Level:** beginner  **Icon:** ➕

**L1 — Half Adder** (Tier 2)
- New: `^` XOR, multiple outputs, `{cout, sum}` notation
- Ports: `a, b, sum, cout`
- Logic: `sum = a ^ b; cout = a & b;`

**L2 — Full Adder** (Tier 3)
- New: carry-in, 3-input logic
- Ports: `a, b, cin, sum, cout`
- Logic: `sum = a ^ b ^ cin; cout = (a & b) | (cin & (a ^ b));`

**L3 — 4-bit Ripple Adder** (Tier 3)
- New: module instantiation, connecting carry chain
- Instantiate 4 full adders, chain carry
- Show `wire` is not needed — use `logic` for internal signals too

**L4 — 2s Complement Subtractor** (Tier 4)
- New: `~` on a bus, `+ 1`, signed subtraction
- `diff = a + (~b) + 1;`
- Explain 2s complement visually

**L5 — Portfolio: 8-bit ALU** (Tier 5)
- Spec: 4 operations selected by `op[1:0]`: ADD, SUB, AND, OR
- Output: `result[7:0]`, `zero` flag (result === 0), `overflow` flag
- This is a real interview question — say so explicitly in theory

---

### msv4 — Finite State Machines
**Level:** intermediate  **Icon:** 🚦

**L1 — Traffic Light Controller** (Tier 3)
- New: `typedef enum logic [1:0]`, `unique case`
- States: RED, GREEN, YELLOW — cycle on every clock
- Theory: draw ASCII state diagram in theory (use plain text boxes)
- State diagram format (use in theory):
  ```
  RED ──(10 ticks)→ GREEN ──(8 ticks)→ YELLOW ──(2 ticks)→ RED
  ```

**L2 — Vending Machine** (Tier 3)
- States: IDLE, COIN1, COIN2, DISPENSE, CHANGE
- Inputs: coin (25c), select
- Outputs: dispense, return_change
- Good test of Mealy vs Moore — explain the difference

**L3 — Sequence Detector** (Tier 4)
- Detect pattern 1011 in serial input stream
- Overlapping detection (after match, don't reset fully)
- Harder than it looks — acknowledge this in theory

**L4 — Portfolio: Combination Lock** (Tier 5)
- 4-digit code entry FSM
- Inputs: digit[3:0] (BCD), enter
- Outputs: unlocked, error_led
- Must have: wrong-entry penalty state (locked for 10 cycles)
- Real-world application — say so

---

### msv5 — Memory & Storage
**Level:** intermediate  **Icon:** 💾

**L1 — Register File** (Tier 3)
- `logic [7:0] regs [0:7]` — 8 registers, 8-bit wide
- Dual read port, single write port
- Used inside every CPU — make this connection explicit

**L2 — Synchronous SRAM** (Tier 4)
- `logic [7:0] mem [0:255]` — 256 bytes
- Write on clk edge, read combinationally
- Cover byte-enable if possible

**L3 — FIFO** (Tier 4)
- Depth 8, 8-bit wide
- Read/write pointers, full and empty flags
- Classic interview question — say so
- Common mistake: off-by-one on full/empty — address in theory

**L4 — Portfolio: Stack (LIFO)** (Tier 5)
- Push/pop, overflow/underflow detection
- Used in CPU stack pointer implementations

---

### msv6 — Serial Protocols
**Level:** intermediate  **Icon:** 📡

**L1 — UART Transmitter** (Tier 4)
- Baud rate counter, start bit, 8 data bits, stop bit
- Parameters: `parameter CLK_FREQ = 50_000_000, BAUD = 115200`
- Testbench: count ticks between bit transitions to verify baud rate

**L2 — UART Receiver** (Tier 4)
- Oversampling (16x), start bit detection, framing
- Harder than TX — acknowledge explicitly

**L3 — Portfolio: SPI Master** (Tier 5)
- CPOL=0 CPHA=0 mode, 8-bit transfer
- Ports: sclk, mosi, miso, cs_n
- Used in flash memory, sensors, displays

**L4 — Portfolio: I2C Controller** (Tier 5)
- START/STOP conditions, ACK/NACK, 7-bit addressing
- This is hard — hint should have a very detailed state diagram

---

### msv7 — Capstone Projects
**Level:** advanced  **Icon:** 🏆

**L1 — PWM Generator** (Tier 5)
- Variable duty cycle, motor / LED dimming application
- Parameterised resolution (8-bit or 10-bit)

**L2 — VGA Sync Generator** (Tier 5)
- 640×480 @ 60 Hz, horizontal and vertical sync
- Pixel counter, line counter
- Explain that this drives real monitors

**L3 — Simple Calculator** (Tier 5)
- Multi-module top-level design
- Integrates: register file, ALU (from msv3), FSM control
- The first design with a hierarchy — introduce `module instantiation` at top level

**L4 — RISC-V RV32I Core** (Tier 5)
- The ultimate project — implement fetch, decode, execute, writeback
- Support: R-type, I-type, load/store, branch instructions
- Theory: explain the pipeline stages conceptually with a diagram
- Hint: block diagram with module names (IF, ID, EX, MEM, WB)
- Completing msv7 unlocks the "VLSI Architect" certificate
- Add to last task: `'🎓 VLSI Architect certificate unlocked — you built a CPU from scratch'`

---

## Certification milestones

Add these as the final task in the last lesson of the trigger chapter:

| Certificate | Trigger lesson | Task string to add |
|---|---|---|
| VLSI Foundations | msv2 L4 | `'🎓 VLSI Foundations certificate unlocked — complete msv1 + msv2 to claim it'` |
| Digital Design | msv4 L4 | `'🎓 Digital Design certificate unlocked — complete msv3 + msv4 to claim it'` |
| Systems Engineer | msv6 L4 | `'🎓 Systems Engineer certificate unlocked — complete msv5 + msv6 to claim it'` |
| VLSI Architect | msv7 L4 | `'🎓 VLSI Architect certificate unlocked — you built a CPU from scratch'` |

---

## Quality checklist — run before every push

```
[ ] All lesson ids are unique (check other msv*.js files first)
[ ] Every lesson has all 8 fields: id, title, theory, tasks, hint, design, testbench, expected
[ ] Theory has NO complete working module code
[ ] Hint has the complete solution (or design notes for tier 4/5)
[ ] Design starter has ZERO synthesizable code
[ ] Testbench: `logic` only, no `reg` or `wire`
[ ] Testbench module named exactly `tb`
[ ] Testbench first line is `\`timescale 1ns/1ps`
[ ] All $display assertion lines begin with PASS or FAIL
[ ] expected[] substrings all appear in a correct simulation run
[ ] Verilator timing task line present in every lesson
[ ] Difficulty tier is correct per the tier table above
[ ] index.html <script> tag added before curriculum.js
[ ] curriculum.js updated with module id
[ ] This CLAUDE.md updated: ❌ → ✅ for built chapter, cursor advanced
```

---

## Voice and tone rules

- Write as if explaining to someone who programs but has never done hardware
- Use physical analogies: "a flip-flop is like a light switch that can only change state when you clap"
- Never use the words "easy", "simple", "trivial", "just", "obviously"
- When a concept is genuinely hard, say so: "This one takes a few tries — that's completely normal"
- Portfolio lessons feel like real work: "This is a real interview question at hardware companies"
- Every chapter ends with forward momentum: "In the next chapter, you'll use this to build X"

---

## Reference

See `agent.md` in this repo for:
- Full lesson object schema with field-by-field documentation
- Detailed testbench patterns for each lesson type
- HTML class reference for theory content
- Hint writing examples at each tier
