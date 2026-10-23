# VeeR EL2 Lab — Course Plan v2

Status: plan, agreed direction 2026-10-23. Replaces the course structure in
`docs/veerdesign.md` (which stays as the record of the current, live Foundation
track `vf1`–`vf6` until each chapter is rewritten).

Read with: the `veer-dv-course` skill (environment, rebuild costs, deploy rules)
and `CLAUDE.md` (branch rules, voice and tone).

---

## 1. Goal and outcomes

**Goal:** learn how a real processor is designed and verified, by working with
the real VeeR EL2 RISC-V core — its specs, its RTL, its tests and its
testbenches — and learning to judge whether a test actually proves anything.

After the full course a learner can:

1. Explain how a chip project fits together: specs, RTL, tests, testbenches, tools.
2. Find the right spec for a question (ISA, micro-architecture, interface, register, testplan).
3. Read production SystemVerilog RTL and trace a behaviour to the lines that cause it.
4. Write small RTL blocks and check them against a trusted reference model.
5. Run CPU-level tests and read their evidence: console, log, instruction trace.
6. Explain what a directed test proves, and read interrupt, ECC and PMP tests.
7. Read a UVM testbench: item, sequence, driver, monitor, scoreboard, test, report.
8. Change stimulus and predict the effect before running.
9. Spot a test that passes without checking anything, and say what a real fix needs.

## 2. Prerequisites

Full reference: **`docs/sv_essentials_for_veer.md`**.

Stated on the lab page, before Chapter 0:

| Needed | Where to get it |
|---|---|
| Basic digital logic (gates, flip-flops, binary/hex) | All About VLSI SystemVerilog course `msv1`–`msv2` |
| Basic SystemVerilog modules and testbenches | `msv1`–`msv5` |
| SystemVerilog classes (for the UVM chapters only) | Introduced in Part B; deeper material later |
| RISC-V assembly | **Not required** — taught as needed in Part A (`o1`, `o3`) |

## 3. The running example: a restaurant kitchen

One analogy carries every chapter. Each lesson names the kitchen idea first,
then the real thing.

| Kitchen | VeeR course concept | First used in |
|---|---|---|
| Kitchen blueprint | RTL design in SystemVerilog | o1 |
| Building a working kitchen from the blueprint | Verilator compiling RTL into a simulator (C++ → executable) | o1 |
| Recipe in plain language / in shorthand | Test program in C / in assembly | o1 |
| Translator into the chef's own language | RISC-V GCC compiler → `program.hex` | o1 |
| The chef | VeeR EL2 core | o1 |
| Head office rules for every kitchen in the chain | ISA spec (RISC-V) | o2 |
| This kitchen's own operating manual | Micro-architecture spec (VeeR PRM) | o2 |
| Inspection checklist | Verification plan / testplan | o2 |
| Stations: order intake, prep, cooking, plating | Fetch, decode, execute, load/store units | o3 |
| Ingredients on the chef's counter vs the storeroom down the hall | DCCM vs external memory | vf1 |
| The bell at the order window: "service done" / "problem" | Mailbox `0xD0580000`: `0xFF` / `0x01` | vf1 |
| The chef's logbook of every step | Instruction trace (`exec.log`); steps per minute = IPC | vf2 |
| A recipe step the chef cannot read — calls the manager | Illegal instruction → trap → `mcause` | vf3 |
| Kitchen timer, phone, fire alarm; "do not disturb" sign | Timer/software interrupts, NMI, `mstatus.MIE` | vf3 |
| Freshness check: one bad leaf swapped, two → throw out | ECC: single-bit corrected, double-bit detected | vf3, o4 |
| Locked storeroom | PMP | vf3 |
| Health inspection of one station: order list, runner, observer with clipboard, inspector, report | UVM: sequence, driver, monitor, scoreboard, report summary | vf4 |
| The observer logs every plate as "delivered"; the inspector never compares; the report is spotless while the counter loses food | The passing test that checks nothing; reads return 0 | vf6 |
| Apprentice rebuilds a station from the manual; it is tested side by side with the original | Learner writes RTL; random comparison against the real VeeR block | Part C |

Technical threads that run alongside the analogy:
- **`hello_world`** for every CPU-level idea (source → hex → trace → mailbox).
- **The word `0x12345678`** for memory and ECC: the `ecc` CPU test, the ECC
  block on its own (o4), and the UVM DCCM testbench.

## 4. Lesson format (every lesson)

- **One idea per lesson**, one main task, one run (or one quiz for theory
  lessons). Lesson length follows the chapter's complexity rating (section 4a).
- **Depth over breadth:** every claim is shown with evidence — a source line, an
  RTL line, or a log/trace line the learner finds themselves.
- **The three-part thread:** *the spec says → the RTL does → the test checks.*
  Each lesson quotes one spec excerpt (attributed), one RTL excerpt, and points
  at the line in the output that proves it.
- **Kitchen first, then the real thing.**
- **Check your understanding:** one question at the end, answer in the hint.
- `expected` strings come from real runs (skill section 6). Never use `mcycle`.

## 4a. Complexity rating (judge every chapter before writing it)

**Rule: for each chapter, act as a judge and rate it on two separate scales —
how hard the *theory* is and how hard the *coding* is — as Simple, Medium or
Difficult. The rating decides how long and how deep its lessons are.**

### What each level means

| Level | Theory means… | Coding means… |
|---|---|---|
| **Simple** | One familiar idea; no new vocabulary beyond 1–2 terms | Read or run existing code; no edits, or a one-line edit |
| **Medium** | New concepts that build on each other; 3–4 new terms | Read unfamiliar code and follow it across files; small edits inside existing functions |
| **Difficult** | Several interacting mechanisms (pipelines, traps, UVM phases); easy to misunderstand | Write or fix real code; changes that create new objects/classes; debugging with no answer given |

### How the rating changes the lesson

| Rating | Theory per lesson | Each new term gets | Diagrams |
|---|---|---|---|
| Simple | 120–200 words | One plain sentence | Only if a flow is involved |
| Medium | 250–400 words | **What it is, why it exists, the kitchen equivalent, a real VeeR example, one common confusion** | Required when there is a flow or a structure |
| Difficult | 400–600 words, split across two lessons if longer | Same as Medium, plus a step-by-step worked example | Required; reuse the master diagrams |

- **Few terms, explained fully.** Never introduce more than 3–4 new terms in one
  lesson. A term that is not needed for the lesson's task is left out.
- **Coding difficulty adds steps, not words:** Medium/Difficult coding lessons
  break the task into numbered steps, give a predicted output first, and keep a
  reference solution in the hint (Difficult: design notes only, as in the main
  course's tier 4/5).

### Diagrams

- Use a **flowchart-style diagram** whenever a lesson describes a process (a
  sequence of steps) or a structure (parts connected to each other).
- **One master kitchen diagram** (`veerKitchen(highlight)` in `static/veer-lab/chapters.js`)
  is drawn once and reused in every chapter, with the station the lesson is
  about highlighted. Other reusable diagrams: any vertical flowchart (`veerFlow(steps, highlight)`)
  and the VeeR core block diagram (`veerCore(highlight)`).
- Diagrams are inline SVG using the site's colour variables, so they follow the
  page theme; on phones they scroll sideways inside their own box.

### Ratings

| Chapter | Theory | Coding | Notes |
|---|---|---|---|
| `o1` The big picture | **Medium** | Simple | Many first-time ideas (RTL, simulation, compiler, hex) — explain each in depth |
| `o2` Specs | **Medium** | Simple | Layered specs and the spec → RTL → test thread |
| `o3` Design overview | **Difficult** | Medium | Pipeline and units interacting; reading real RTL across files |
| `o4` Run the design | Medium | Medium | Writing a small SV testbench around real VeeR blocks |
| `vf1` Lab tour and first run | Simple | Simple | Run and observe |
| `vf2` Reading an instruction trace | Medium | Simple | Trace columns, non-blocking loads, IPC |
| `vf3` Tests as specifications | **Difficult** | Medium | Traps, interrupts, ECC, PMP; reading C and assembly tests |
| `vf4` UVM tour | **Difficult** | Medium | Many UVM roles and phases at once |
| `vf5` Changing stimulus | Simple | Medium | Small edits, predict-then-check |
| `vf6` Reading results critically | Medium | Medium | Handle reuse and false passes |
| `vd1` Flip-flop library | Simple | Simple | First RTL written by the learner |
| `vd2` ECC encoder | Medium | Medium | Hamming code; XOR trees |
| `vd3` PMP address match | **Difficult** | **Difficult** | Address-matching modes, priority |
| `vd4` ALU subset | Medium | **Difficult** | Datapath with many operations |
| `vp1` Fix the monitor | Medium | Medium | Slow rebuild |
| `vp2` Fix the scoreboard model | Medium | Medium | Associative arrays |
| `vp3` Debug reads returning 0 | **Difficult** | **Difficult** | Open-ended debugging |
| `vp4` Directed sequences | Medium | Medium | |
| `vp5` New test + factory override | **Difficult** | Medium | UVM factory |
| `vp6` Functional coverage | **Difficult** | **Difficult** | Verilator support to prove first |
| `vp7` Assertions | **Difficult** | **Difficult** | Verilator support to prove first |
| `vp8` Signoff | Medium | Simple | Reading reports, writing a signoff note |

Live chapters written before this rule (`o2`, `vf1`–`vf6`) are re-judged and
lengthened when they are rewritten. **`o1` was rebuilt to this rule on
2026-10-23:** 5 lessons, 260–330 words each, every term explained with what /
why / kitchen / VeeR example / common confusion, 8 diagrams (master kitchen map
reused 4×, core block diagram, 3 flowcharts).

## 5. Course structure

Lesson counts are planning estimates. Chapter IDs are new; `vf*` IDs are kept so
learner progress survives the rewrite.

### Part A — Orientation (new)

| ID | Chapter | Lessons | Type |
|---|---|---|---|
| `o1` | **The big picture** — what is in the lab; where the design lives (RTL folders, link to the repo); why tests are written in C and assembly; how a test reaches the SystemVerilog testbench (GCC → `.elf` → `.hex` → `$readmemh` into the memory model in `tb_top.sv` → mailbox); the tools: RISC-V GCC, Verilator (SV → C++ → g++), UVM library, make | 4 | Theory only |
| `o2` | **Specs** — the six spec types and which question each answers; reading the RISC-V spec (`mcause` table); reading the VeeR PRM (DCCM, ECC); turning a spec into a testplan | 4 | Theory + reading |
| `o3` | **Design overview** — VeeR block diagram; the RTL units; one load instruction traveling through fetch → decode → LSU → DCCM; reading real RTL in the Design viewer | 4 | Read code |
| `o4` | **Run the design** — simulate real VeeR blocks with a small SV testbench: ECC encoder/decoder (verified), then ALU / PMP / DCCM memory once their standalone builds are verified | 3 | Hands-on |

Spec types covered in `o2`:

| Spec type | Example in this course | Answers |
|---|---|---|
| ISA spec | RISC-V Unprivileged + Privileged specs | What `mcause` = 2 means; PMP rules |
| Micro-architecture spec | VeeR EL2 Programmer's Reference Manual | DCCM, ECC, mailbox, pipeline |
| Interface / protocol spec | AXI4, AHB-Lite | How the core talks to memory |
| Block design spec | VeeR docs per unit | What one module must do |
| Register spec | CSR maps | Addresses and fields |
| Verification plan | Testplan | What must be tested; when we are done |

### Part B — Foundation (live as `vf1`–`vf6`; to be rewritten)

Same chapters, rewritten to the lesson format above (one idea per lesson, kitchen
thread, spec → RTL → test). Expected growth from 20 to ~24 lessons.

| ID | Chapter | RTL now shown alongside |
|---|---|---|
| `vf1` | Lab tour and first run | Mailbox logic in `testbench/tb_top.sv` |
| `vf2` | Reading an instruction trace | Load/store unit: why `nbL` lines exist (`lsu/el2_lsu.sv`, `el2_lsu_lsc_ctl.sv`) |
| `vf3` | Tests as specifications | Trap logic in `dec/el2_dec_tlu_ctl.sv`; `el2_pmp.sv`; ECC in `lib/beh_lib.sv` |
| `vf4` | UVM tour | The DUT: `lsu/el2_lsu_dccm_mem.sv` |
| `vf5` | Changing stimulus | (as vf4) |
| `vf6` | Reading results critically | (as vf4) — bridge to Part D |

### Part C — Design track: read and rebuild (new)

Method: **read** an annotated VeeR block → **rebuild** it from a short spec →
**check** it against the original on thousands of random inputs. The original
block is the reference model; any difference shows the exact failing input.
Bridges the SystemVerilog course's RV32I capstone (`msv7`) to production RTL.

| ID | Block | Size | Teaches |
|---|---|---|---|
| `vd1` | Flip-flop library (`rvdff` family, `lib/beh_lib.sv`) | ~20 lines each | How VeeR builds every register; enables, resets |
| `vd2` | ECC encoder (`rvecc_encode`) | ~15 lines | XOR trees, Hamming code, parity |
| `vd3` | PMP address match (`el2_pmp.sv`) | ~100 lines | Comparators, masks, priority |
| `vd4` | ALU subset (`exu/el2_exu_alu_ctl.sv`) | ~250 of 579 lines | Datapath: add/sub, logic, shifts |

~12 lessons.

### Part D — Professional track (planned, `vp1`–`vp8`)

As in the `veer-dv-course` skill section 4: fix the monitor, fix the scoreboard
model, debug reads returning 0, directed sequences, new test + factory override,
functional coverage, assertions, signoff. Expect slow-class rebuilds (~9 min on
2 cores). **Blocked on:** diagnosing why every DCCM read returns 0 (`vp3`).

### Totals

| Part | Chapters | Lessons (est.) |
|---|---|---|
| A Orientation | 4 | 15 |
| B Foundation | 6 | ~24 |
| C Design track | 4 | ~12 |
| D Professional | 8 | ~24 |
| **Total** | **22** | **~75** |

## 6. RTL coverage

Measured on VeeR commit `45c9b42`: **~30,550 lines** of RTL in `design/`.

| Unit | Lines | Covered by this plan |
|---|---|---|
| `ifu` instruction fetch | 6,153 | Not covered (optional extension) |
| `dec` decode, trap logic | 6,106 | Trap/`mcause` sections of `el2_dec_tlu_ctl.sv` |
| `exu` execute | 3,512 | ALU (`vd4`) |
| `lsu` load/store | 3,955 | LSU top, load control, DCCM memory |
| `lib` + `include` | 3,750 | Flip-flops, ECC |
| `dbg`, `dmi` debug | 1,247 | Not covered |
| Top level (`el2_veer.sv`, `el2_pmp.sv`, …) | 5,831 | `el2_pmp.sv` |

| Level | Lines | Share |
|---|---|---|
| Files shown in the course | ~5,100 | ~17% |
| Lines explained line by line | ~1,500–2,000 | ~5–6% |
| Runnable / rebuilt by learners | ~1,100 | ~3.5% |

Optional extension: an instruction-fetch chapter in Part A/C raises "shown" to
~35% for about one extra session.

## 7. Platform additions

| Addition | What it does | Notes |
|---|---|---|
| Course intro panel | Goal, outcomes, prerequisites, the kitchen map | Static content |
| Program source view | Shows the C / assembly source of the selected CPU program next to Program output, Simulation log, Instruction trace | Sources exist in `testbench/asm/` and `testbench/tests/` |
| Design viewer | Read-only browser for a curated list of RTL files and the VeeR block diagram (from VeeR docs, Apache-2.0) | Lessons link to file + line |
| Design runner | Compiles a learner SV testbench (and learner RTL in Part C) with whitelisted VeeR RTL files using Verilator 5.052 `--binary`, runs it, returns output | Small builds (~4 s for ECC), so one temp folder per request is fine; no base-image rebuild needed |
| Reference-model check (Part C) | Generated testbench drives learner block and original block with the same random inputs, reports the first mismatch | Uses the design runner |

All new pages and endpoints stay separate from the frozen lesson GUI.

## 8. Verified so far

- Foundation track `vf1`–`vf6` (20 lessons) live and browser-verified, 2026-10-23.
- **Part A started:** `o1` The big picture (4 lessons) and `o2` Specs (4 lessons)
  built and browser-verified, 2026-10-23. Theory lessons complete through a
  check-your-understanding quiz. Every RTL/spec excerpt is quoted from the real
  files (e.g. the `mcause` selection in `el2_dec_tlu_ctl.sv` line 1451, the NMI
  table in the VeeR manual's memory-map chapter).
- **Platform:** quiz completion for theory lessons, kitchen callout style, and the
  **Program source** view (`GET /veer/program-source`) are live.
- **Prerequisite reference:** `docs/sv_essentials_for_veer.md` — the SystemVerilog
  that VeeR's RTL and testbenches actually use, measured on the code.
- **Design runner feasibility:** real `rvecc_encode` + `rvecc_decode` from
  `lib/beh_lib.sv` with a plain SV testbench, Verilator 5.052, build in 4 s:

```
ecc bits for 12345678 = 1101101
no error   stored=12345678 -> dout=12345678 single=0 double=0
1 bit      stored=2345678  -> dout=12345678 single=1 double=0
2 bits     stored=52345679 -> dout=52345679 single=0 double=1
```

  Matches the CPU-level `ecc` test (`0x12345678` with bit 28 flipped is corrected).

## 9. Open items and risks

| Item | Impact | Action |
|---|---|---|
| Reads from the DCCM UVM testbench return 0; cause unknown | Blocks `vp3`; affects how `vf6` is phrased | Diagnose first (driver timing, `tbench_top.sv` wiring, DCCM bank interface) |
| ALU, PMP, DCCM-memory standalone builds not yet tried | `o4` and Part C scope | Compile each standalone before writing lessons |
| Spec quotes | Licensing | RISC-V specs CC-BY-4.0: quote with attribution; VeeR PRM Apache-2.0 |
| Rewrite changes `vf*` lesson IDs | Learners lose progress | Keep chapter IDs; map old lesson IDs to new ones where possible |

## 10. Build order and effort

One session ≈ one chapter, built and verified the same way as `vf1`–`vf6`
(real runs, browser tests on desktop and phone, push only after the previous
Railway deploy succeeds).

| Step | Work | Sessions |
|---|---|---|
| 1 | Platform: intro panel, Program source view, Design viewer, Design runner | 1–2 |
| 2 | Part A: `o1`, `o2`, `o3`, `o4` | 3–4 |
| 3 | Part B rewrite: `vf1`–`vf6` to the new format | 3–4 |
| 4 | Part C: `vd1`–`vd4` | 4–5 |
| 5 | Diagnose reads-return-0, then Part D spec | 1–2 |
| 6 | Part D: `vp1`–`vp8` | 8+ |
| | **Parts A–C (steps 1–4)** | **~11–15** |
