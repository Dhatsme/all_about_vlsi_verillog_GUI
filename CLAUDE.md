# CLAUDE.md — All About VLSI Verilog GUI

## Project Overview

Pure frontend HTML/CSS/JS app for interactive Verilog/SystemVerilog lessons with live Verilator simulation. No build step, no framework, no Docker.

## Architecture

```
static/
  index.html          ← single-page app shell (DO NOT MODIFY except <script> tags)
  css/style.css       ← global styles (DO NOT MODIFY)
  js/app.js           ← lesson loader and UI logic (DO NOT MODIFY)
  js/waveform.js      ← waveform renderer (DO NOT MODIFY)
  lessons/
    modules/
      msv1.js         ← Digital Logic Fundamentals
      msv2.js         ← Sequential Logic & Registers
      msv3.js         ← Arithmetic & Control
      msv4.js         ← Finite State Machines
      msv5.js         ← Memory & Register Files
      msv6.js         ← Serial Protocols & Parameterization
server.py             ← FastAPI static server
```

## Module Format

Every lesson file must use this IIFE pattern:

```js
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msvNlM',
  title: '...',
  tier: N,
  theory: `...`,
  tasks: [...],
  testbench: `...`
});
```

## Critical Constraints

- **NEVER** touch Docker, Dockerfiles, or docker-compose
- **NEVER** modify `static/index.html` (except adding `<script>` tags for new modules)
- **NEVER** modify `static/css/style.css`
- **NEVER** modify `static/js/app.js`
- **NEVER** modify `static/js/waveform.js`
- Use `logic` only — no `reg` or `wire` in RTL (wire allowed in `inout wire` ports)
- Use `always_ff` and `always_comb` — no `always @(*)`
- Use `===` for X/Z-safe comparisons in testbenches
- Add `#1` after clock edge in testbenches before checking outputs
- Testbench top module must be named `tb`
- First line of every Verilog file: `` `timescale 1ns/1ps ``

## Tier Definitions

| Tier | Description | Expected time |
|------|-------------|---------------|
| 1 | Read theory, copy code | 5 min |
| 2 | Fill in a few lines | 10 min |
| 3 | Write module from skeleton | 20 min |
| 4 | Write module from scratch | 30 min |
| 5 | Portfolio project | 60 min |

## Curriculum Status

| Module | Title | Lessons | Tiers | Status |
|--------|-------|---------|-------|--------|
| msv1 | Digital Logic Fundamentals | L1–L4 | T1/T2/T2/T3 | ✅ done |
| msv2 | Sequential Logic & Registers | L1–L4 | T2/T2/T3/T3 | ✅ done |
| msv3 | Arithmetic & Control | L1–L4 | T2/T3/T3/T4 | ✅ done |
| msv4 | Finite State Machines | L1–L4 | T2/T3/T3/T4 | ✅ done |
| msv5 | Memory & Register Files | L1–L4 | T3/T3/T4/T4 | ✅ done |
| msv6 | Serial Protocols & Parameterization | L1–L6 | T3/T3/T4/T4/T5/T5 | ✅ done |
| msv7 | Advanced Digital Design | L1–L4 | T5/T5/T5/T5 | ❌ build this next |

## Concept Map & Prerequisite Audit

### What each chapter introduces

| Chapter | New syntax / concepts introduced |
|---------|----------------------------------|
| msv1 | `module`/`endmodule`, `input`/`output logic`, `always_comb`, `&|~^`, `assign` |
| msv2 | `always_ff @(posedge clk)`, `<=`, vectors, literals, `{}` concat, sync active-low reset, `<<`/`>>` |
| msv3 | Multiple outputs, module instantiation, `+`/`-`/`*`, `==`/`<`/`>`, ternary `?:`, `unique case` |
| msv4 | `typedef enum`, two-block Moore FSM, async reset `@(posedge clk or posedge rst)` |
| msv5 | `logic [7:0] regs [0:7]` packed array, `integer` + named-block for-loops in testbench |
| msv6 | `parameter`, `localparam`, `$clog2()`, `#(.p(v))` override, `inout wire`, `1'bz` tristate |

### Gap audit (problems found and fixed)

| Gap | First appeared | Fix applied |
|-----|----------------|-------------|
| async reset never explained vs sync reset | msv4 L1 | Added comparison table to msv4 L1 theory |
| packed array syntax never introduced | msv5 L1 | Added dedicated section to msv5 L1 theory |
| `integer`/for-loop in testbench never shown | msv5 L3 TB | Added testbench note to msv5 L3 theory |
| `parameter`/`localparam`/`$clog2` never introduced | msv6 (was L1) | New msv6 L1: Parameterized Modules (prescaler) |
| `#(.p(v))` parameter override never shown | msv6 testbenches | Covered in msv6 L1 tasks |
| `inout wire`/`1'bz` tristate never introduced | msv6 L6 (I2C) | Added open-drain/tristate section to msv6 L6 theory |

### msv6 lesson restructure (6 lessons)

The original msv6 had 4 lessons. UART TX required concepts (parameter, localparam, $clog2) that were never introduced. Fix: added 2 prerequisite lessons before UART TX.

| Lesson | ID | Title | New concepts | Tier |
|--------|----|-------|--------------|------|
| L1 | msv6l1 | Parameterized Modules | `parameter`, `localparam`, `$clog2()`, `#(.N(4))` | T3 |
| L2 | msv6l2 | Baud Rate Generator | Apply L1 to UART timing, `CLK_FREQ/BAUD` | T3 |
| L3 | msv6l3 | UART Transmitter | Full TX FSM (was old L1) | T4 |
| L4 | msv6l4 | UART Receiver | Full RX FSM (was old L2) | T4 |
| L5 | msv6l5 | SPI Master | SPI protocol (was old L3) | T5 |
| L6 | msv6l6 | I2C Controller | I2C + tristate (was old L4) | T5 |

## msv7 Chapter Content Guide

| Lesson | Title | Module | Description |
|--------|-------|--------|-------------|
| msv7l1 | PWM Generator | `pwm_gen` | Parameterized PWM, duty cycle control, deadtime |
| msv7l2 | VGA Sync Generator | `vga_sync` | 640×480 timing, hsync/vsync, pixel coordinates |
| msv7l3 | Calculator | `calculator` | Multi-op ALU with pipelined stages, overflow detect |
| msv7l4 | RISC-V RV32I Core | `riscv_core` | Fetch/decode/execute pipeline, register file, memory |

All msv7 lessons are Tier 5 portfolio projects.

## Certification Thresholds

| Badge | Unlocks after |
|-------|---------------|
| Digital Logic Engineer | msv1 L4 |
| Sequential Logic Engineer | msv2 L4 |
| RTL Design Engineer | msv3 L4 |
| FSM Design Engineer | msv4 L4 |
| Memory Systems Engineer | msv5 L4 |
| Systems Engineer | msv6 L6 |
| Advanced Digital Design Engineer | msv7 L4 |

## Quality Checklist (for every new chapter)

- [ ] Every task has a unique `id` matching pattern `msvNlMtK`
- [ ] `expectedOutput` matches what Verilator actually prints
- [ ] Testbench top module is named `tb`
- [ ] First line of every Verilog block is `` `timescale 1ns/1ps ``
- [ ] No `reg` or bare `wire` in RTL (only `logic`; `inout wire` ports are OK)
- [ ] All comparisons in testbench use `===`
- [ ] `#1` delay after clock edge before checking outputs
- [ ] No syntax used before it is introduced in a previous chapter
- [ ] Each new syntax concept has a dedicated theory section explaining it
