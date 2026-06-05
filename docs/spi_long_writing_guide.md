# spi_long Series — Writing Guide & Token Budget

> Read this before writing any spi_long chapter. These rules were set by the course author and must be preserved across all sessions.

---

## Token Budget per Lesson

| Field | Target chars | Notes |
|---|---|---|
| theory | 2,500–4,000 | 30% more than base msv series |
| tasks | 300–600 | Step-based format |
| hint | 600–1,200 | Complete working solution |
| design | 150–300 | Comments only |
| testbench | 800–1,500 | Verilator-safe |
| expected | 80–150 | 3–4 substrings |
| **Per lesson total** | **~5,000–8,500 chars** | **≈ 1,500–2,000 tokens** |
| **Per module (4 lessons)** | **~22,000–32,000 chars** | **≈ 7,000–8,500 tokens** |

The "30% more tokens" instruction means the theory sections must be substantially deeper than
the base msv series. Use the full budget — do not truncate theory to stay short.

---

## Tone & Voice Rules

1. **Opening analogy** — Every L1 theory must start with `Imagine...` or `Think of...` followed
   by a real-life parallel (not hardware). Set the physical intuition before any RTL.

2. **Build-up vocabulary** — Never lead with jargon. Introduce the technical term *after* the
   physical intuition: *"This window of silence — called t_CSS in the datasheet — must be at
   least 5 ns for most SPI flash devices."*

3. **"We are building" tone** — First-person plural throughout.
   - ✓ `We are building the clock divider.`
   - ✗ `You will build` / `Your task is to build`

4. **Designer perspective** — This course is for RTL designers, not embedded programmers.
   - ✓ `the CPU`, `the host processor`, `the APB master`
   - ✗ `firmware`, `the embedded software`, `the MCU code`

5. **No IC part numbers** — Generic descriptions only.
   - ✓ `SPI NOR Flash`, `SPI ADC`, `active-high DAC`
   - ✗ `W25Q128`, `MCP4921`, `MAX31865`

6. **Acknowledge difficulty** — When a concept is hard, say so:
   *"This one takes a few passes — that is completely normal."*
   Never use the words `easy`, `simple`, `trivial`, `just`, `obviously`.

7. **Forward momentum** — Every chapter ends pointing at what the next chapter builds.

8. **Portfolio framing** — Tier 5 lessons feel like real work:
   *"This is the kind of design that appears in silicon tape-out reviews."*

---

## Task Format Rules

**ALWAYS Step-based. NEVER line-number-based.**

```
✓ Step 1 — declare the module with ports: pclk, rst_n, enable
✓ Step 2 — add always_ff with async reset block
✓ Step 3 — assign sck_out = enable ? sck_int : cpol;

✗ ── Line 2 ──  input logic pclk,  ← comma
✗ ── Port ──   output logic sck_out
```

Standard task wrap:
```
First task : 'Code tab is blank — type every line.'
Second-to-last: 'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running'
Last: 'Hit Run — all N PASS lines should appear in the Output tab'
```

---

## Block Diagram Rule

Every **L1** theory section MUST include an ASCII block diagram showing:
- The module being built (marked ★)
- The modules that feed into it (with signal names on arrows)
- The modules it feeds into
- The SPI bus pins at the bottom

Diagram width should be 60–80 chars. Use `<pre class="code-block">` for rendering.

---

## Code Complexity Progression

| Module | Complexity level | What increases |
|---|---|---|
| spi_long1 | Foundational | Combinational only, assign statements |
| spi_long2 | Simple sequential | 1 counter, 1 toggle, edge detector |
| spi_long3 | FIFO fundamentals | Pointer arithmetic, flags, overflow |
| spi_long4 | FIFO variant | Mirror spi3 with underflow semantics |
| spi_long5 | Data path | Parallel load, shift, word_done counter |
| spi_long6 | Mode engine | XOR mux, registered outputs, shadow regs |
| spi_long7 | Timing engine | 3 independent counters, burst guard |
| spi_long8 | FSM core | 7-state one-hot, shadow regs, burst loop |
| spi_long9 | Error + IRQ | Sticky flags, W1C, global enable |
| spi_long10 | SV package | typedef struct, interface blocks |
| spi_long11 | APB registers | APB slave FSM, 18-register CSR bank |
| spi_long12 | Full integration | All modules wired, APB-driven transfer |

Code in later modules may use:
- `unique case` (from spi_long8 onward)
- Packed structs (from spi_long10 onward)
- Parameterised modules (use in hints, not required in tasks)
- `always_comb` for next-state logic (spi_long8 onward)

---

## Testbench Rules (Verilator 5.020)

| Rule | Correct | Wrong |
|---|---|---|
| Signal type | `logic` | `reg`, `wire` |
| Combinational | `always_comb` | `always @(*)` |
| Sequential | `always_ff @(posedge clk)` | `always @(posedge clk)` |
| Module name | `tb` | anything else |
| First line | `` `timescale 1ns/1ps `` | missing |
| Comparison | `===` | `==` for 4-state |
| Clocked delay | `@(posedge clk); #1;` | bare `#5;` in clocked context |
| inout ports | `wire` in testbench | `logic` for inout |

---

## Integration Checkpoints

Integration testbenches require **inlining** all dependency modules directly in the
testbench file. Never `include` external files — the web simulator has no file system.

| Checkpoint | In lesson | Inline modules needed |
|---|---|---|
| A | spi_long5 L4 | spi_clk_div + spi_shift |
| B | spi_long8 L4 | spi_clk_div + spi_cpha(L1) + spi_shift + spi_cs_ctrl + spi_master_fsm |
| C | spi_long12 L4 | All modules + spi_apb_if |
| D | spi_long_tb4 L4 | Complete system |

---

## Certification Milestones

| Certificate | Lesson | Task string |
|---|---|---|
| SPI Foundations | spi_long5 L4 | `'🎓 SPI Foundations — you built the complete data path: clkdiv, FIFOs, shift registers'` |
| SPI Protocol Engineer | spi_long8 L4 | `'🎓 SPI Protocol Engineer — your FSM correctly sequences all 4 modes and survives abort'` |
| SPI Silicon Designer | spi_long12 L4 | `'🎓 SPI Silicon Designer — you built a register-programmable, APB-connected SPI master'` |
| SPI Verification Engineer | spi_long_tb4 L4 | `'🎓 SPI Verification Engineer — 38-item DV checklist complete; your design is handoff-ready'` |

---

## Session Commit Protocol

```
1 commit per lesson (one JS push at a time if token budget is tight)
- OR -
1 commit for full module JS file
1 commit for registration files (courses.js update)
1 commit to docs/spi_deep_dive.md (main branch, ❌→✅)
```

Always push lesson file to `develop` first. Registration follows in the same branch.
Docs update goes to `claude/spi-master-fsm-spec-CaaqI` branch.

---

*Last updated: 2026-06-05 | Course: spi_long | Total modules: 16*
