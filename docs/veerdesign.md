# VeeR EL2 Lab — Foundation track: course spec

Content guide for the **VeeR EL2 Lab Foundation track** (`vf1`–`vf6`), taught on
`static/veer.html`. Lessons live in `static/veer-lab/chapters.js` (not in the main
lesson GUI, which is frozen).

Learners **read, run and observe** a real open-source RISC-V core (CHIPS Alliance
VeeR EL2) and its real UVM testbench. They make only small edits. Nothing here
asks them to write a new class; that is the Professional track (`vp1`–`vp8`,
spec to come).

Read with: the `veer-dv-course` skill (environment, rebuild cost classes,
deploy rules) and `CLAUDE.md` (branch rules, voice and tone).

---

## Status

| # | Chapter ID | Title | Lessons | Status |
|---|---|---|---|---|
| 1 | `vf1` | Lab tour and first run | L1 Meet VeeR EL2, L2 How a program talks to the testbench, L3 Same program, different memory | ✅ done |
| 2 | `vf2` | Reading an instruction trace | L1 Trace anatomy, L2 Matching source to trace, L3 Instructions per cycle | ❌ **build this next** |
| 3 | `vf3` | Tests as specifications | L1 What a directed test proves, L2 Interrupts (`irq`), L3 Errors on purpose (`ecc`, `illegal_instruction`), L4 Memory protection (`pmp`) | ❌ |
| 4 | `vf4` | UVM tour | L1 Stimulus: item and sequence, L2 Drive and observe: driver and monitor, L3 Checking: scoreboard and test, L4 The report summary | ❌ |
| 5 | `vf5` | Changing stimulus | L1 Predict, edit, check (loop count), L2 Verbosity and what you can see, L3 Breaking it on purpose (syntax errors) | ❌ |
| 6 | `vf6` | Reading results critically | L1 Count the checks, L2 A pass that proves nothing, L3 What a real fix needs (bridge to Professional track) | ❌ |

---

## Guidance levels (replace the main course's tiers 1–5)

Learners here mostly run and read, so lessons are graded by how much the lesson
tells them up front.

| Level | Learner gets | Used in |
|---|---|---|
| G1 — guided | Exact steps; the lesson says what to look for and where | vf1, vf2 L1 |
| G2 — find it | The lesson names the thing to find, not where it is | vf2 L2–L3, vf3, vf4 |
| G3 — predict, then check | Learner writes a prediction before running; the run confirms or refutes it | vf5, vf6 |

---

## Lesson object (in `static/veer-lab/chapters.js`)

```javascript
{
  id: 'vf1l1',                 // <chapterId>l<n>, globally unique
  title: 'L1 — Meet VeeR EL2',
  level: 'G1',
  tab: 'cpu',                  // 'cpu' | 'uvm' — which lab tab the lesson uses
  program: 'hello_world',      // cpu lessons: preselected program (must be in CPU_TESTS)
  open_file: null,             // uvm lessons: file to open in the editor
  rebuild: 'none',             // none | fast | slow  (skill section 3)
  theory: `...HTML...`,        // same HTML subset as the main course
  tasks: ['...'],              // checklist strings
  hint: `...plain text...`,
  expected: ['...'],           // substrings that must ALL appear in the run output
  output_view: 'console'       // cpu lessons: which output view to show after a run
}
```

Rules:
- `expected` must come from a real run (skill section 6). Never use `mcycle`
  values: they vary slightly between runs (hello_world showed 726 and 742).
  `minstret` (instructions retired) is stable.
- CPU lessons may only use programs in `CPU_TESTS` in `veer_lab.py`.
- Every lesson ends with: `<p><strong>Ready?</strong> ...</p>` telling the
  learner which tab and button to use.
- Voice and tone: `CLAUDE.md` rules apply (no "easy/simple/just/obviously").

---

## vf1 — Lab tour and first run  (G1, rebuild: none)

Goal: the learner can run a program on a real CPU model, find its output, and
say how the testbench decides pass or fail.

Verified facts used in this chapter (Verilator 5.052, VeeR commit `45c9b42`):
- `hello_world`: console shows the three-line banner; log ends
  `TEST_PASSED`, `Finished : minstret = 330, mcycle = 726` (mcycle varies a little).
- `hello_world_dccm`: same 330 instructions, ~414 cycles, log has
  `DCCM pre-load from f0040000 to f0041050`.
- Mailbox (console) address is `0xD0580000` (`mem_mailbox` in `tb_top.sv`).
  Bytes 0x06–0x7E are printed as characters; `0xFF` → `TEST_PASSED`;
  `0x01` → `TEST_FAILED`; 2,000,000 cycles without either → `TEST_FAILED`.
- `hello_world.s`: clears `minstret`, sets `mtvec` to `_trap`, enables caches
  in MRAC (CSR `0x7c0`), loops `lb`/`sb` over the string to `STDOUT`, then
  writes `0xff`. The trap handler writes `1`.

### L1 — Meet VeeR EL2
- What VeeR EL2 is (32-bit RISC-V core from Western Digital, maintained by CHIPS
  Alliance) and what a Verilator model is (the RTL compiled into a C++ program).
- The lab already compiled the core; pressing Run loads a program (`program.hex`) into
  simulated memory and lets the core execute it.
- Task: run `hello_world`, find the banner in Program output.
- expected: `Hello World from VeeR EL2`, `TEST_PASSED`

### L2 — How a program talks to the testbench
- There is no screen: the program stores bytes to one address (the mailbox),
  and the testbench watches that address.
- Table: byte value → what the testbench does.
- Show the 4-line loop from `hello_world.s` (snippet only).
- Task: open Simulation log, find `mem_mailbox = D0580000`, `TEST_PASSED`, `minstret`.
- expected: `mem_mailbox         = D0580000`, `TEST_PASSED`

### L3 — Same program, different memory
- DCCM = data memory right next to the core (closely coupled), vs external
  memory over the bus. Same instructions, fewer cycles.
- Task: run `hello_world`, note minstret and mcycle; run `hello_world_dccm`,
  compare. Same minstret (330), far fewer cycles.
- expected: `DCCM pre-load`, `minstret = 330`, `TEST_PASSED`
- Close with forward momentum to vf2 (the instruction trace).

---

## vf2 — Reading an instruction trace  (G1→G2, rebuild: none)

Uses `exec.log` (Instruction trace view; the API returns the first 150 lines).
Format: `cycle : #inst 0 pc opcode reg=value csr=value ; mnemonic`.
- L1: column by column, using the first 12 lines of `hello_world`.
- L2: match `hello_world.s` to the trace (`csrrw ... csr_b02` = clear minstret,
  `csr_305` = mtvec, `lui gp,0xd0580000` = STDOUT address).
- L3: instructions per cycle = minstret / mcycle; compare `hello_world`,
  `hello_world_dccm`, `dhry` (343,115 instructions / ~355,033 cycles ≈ 0.97 IPC).
Verify the 150-line limit is enough for L2 before writing.

## vf3 — Tests as specifications  (G2, rebuild: none)
Programs: `irq`, `ecc`, `illegal_instruction`, `pmp`. Each lesson: what feature
the test exercises, what the test must observe to write `0xFF`, and where that
shows in the logs. Read the matching `testbench/asm/*.s` (or `tests/`) source
before writing each lesson; quote snippets only.

## vf4 — UVM tour  (G2, rebuild: none — run unchanged)
Map the 11 files in the UVM tab to UVM roles (the page already labels them).
L4 reads the report summary: `UVM_ERROR : 0`, `UVM_FATAL : 0`,
`UVM_WARNING : 23` (component-name warnings), `DCCM TEST PASSED`.

## vf5 — Changing stimulus  (G3, rebuild: fast)
Only edits inside existing methods (fast class, ~26 s). Measure each edit's
rebuild time before publishing; if any is slow class, change the exercise.
L3 uses deliberate syntax errors (0.5 s, `%Error` lines).

## vf6 — Reading results critically  (G3, rebuild: none)
Count `READ DATA Match` / `READ DATA Mismatch` in an unchanged run: zero.
Explain why (the monitor reuses one object; `wr_en` never clears) without
asking for the fix. L3 previews the Professional track (vp1 fixes the monitor;
the run then shows 10 mismatches).
