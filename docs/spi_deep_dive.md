# SPI Deep-Dive — Curriculum Tracker

> **This file changes every session.** After each chapter is pushed, update the status column (❌ → ✅) and advance the cursor.
> Course ID: `spi_deep` | Branch: `develop` | Docs branch: `main`

---

## Status Table

| # | Module ID | Title | Phase | Tier | Lessons | Status |
|---|---|---|---|---|---|---|
| 1 | `spi1` | SPI Protocol & Signal Definitions | 1 | 1→2 | 3 | ❌ **build this next** |
| 2 | `spi2` | Clock Divider & SCK Generation | 1 | 2 | 3 | ❌ |
| 3 | `spi3` | TX FIFO Design | 2 | 2→3 | 4 | ❌ |
| 4 | `spi4` | RX FIFO Design | 2 | 2→3 | 4 | ❌ |
| 5 | `spi5` | TX & RX Shift Registers | 2 | 3 | 4 | ❌ |
| 6 | `spi6` | CPOL/CPHA Timing Engine | 2 | 3→4 | 4 | ❌ |
| 7 | `spi7` | CS Controller & Timing | 3 | 3→4 | 4 | ❌ |
| 8 | `spi8` | Master FSM | 3 | 4 | 4 | ❌ |
| 9 | `spi9` | Error Handling & Interrupt Controller | 3 | 4 | 4 | ❌ |
| 10 | `spi10` | SPI Package & Internal Interfaces | 4 | 4 | 3 | ❌ |
| 11 | `spi11` | APB Register Interface | 4 | 4→5 | 4 | ❌ |
| 12 | `spi12` | Full SPI Master Integration | 4 | 5 | 4 | ❌ |
| 13 | `spitb1` | Unit Testbench Suite | 5 | 5 | 4 | ❌ |
| 14 | `spitb2` | Corner Case Coverage | 5 | 5 | 4 | ❌ |
| 15 | `spitb3` | SVA & Formal Verification | 5 | 5 | 3 | ❌ |
| 16 | `spitb4` | Integration & System Verification | 5 | 5 | 4 | ❌ |

---

## Integration Checkpoints

| Checkpoint | Embedded In | Pass Condition | Status |
|---|---|---|---|
| A — Clock + Shift Loopback | spi5 L4 | `PASS rx_data=0xa5` in Mode 0 | ⬜ |
| B — FSM + CS + 3-word burst | spi8 L4 | CS never toggles mid-burst; bit_cnt resets each word | ⬜ |
| C — Full APB-driven transfer | spi12 L4 | All 4 modes × WL=8/16/32; IRQ fires once; RXDATA==TXDATA | ⬜ |
| D — 38-item DV checklist | spitb4 L4 | All 38 items print `PASS` | ⬜ |

---

## Phase Summaries

### Phase 1 — Foundation (Month 1) | spi1–spi2
Goal: Student can describe the SPI wire protocol and explain how SCK is generated.
Modules: spi1 (concepts), spi2 (clock divider hardware)
No integration checkpoint in this phase.

### Phase 2 — Data Path (Months 2–3) | spi3–spi6
Goal: Student has built every data-path block: FIFOs, shift registers, timing engine.
Modules: spi3 (TX FIFO), spi4 (RX FIFO), spi5 (shift regs), spi6 (CPOL/CPHA mux)
**Checkpoint A** fires at end of spi5 (clock divider + shift loopback).

### Phase 3 — Control Path (Month 4) | spi7–spi9
Goal: Student can drive a full SPI transfer under FSM control with error handling.
Modules: spi7 (CS controller), spi8 (master FSM), spi9 (errors + IRQ)
**Checkpoint B** fires at end of spi8 (full CONT_XFER burst).

### Phase 4 — Integration (Month 5) | spi10–spi12
Goal: Student assembles all modules into a register-programmable APB-connected SPI master.
Modules: spi10 (SV package), spi11 (APB registers), spi12 (spi_top)
**Checkpoint C** fires at end of spi12 (APB-driven full transfer in all 4 modes).

### Phase 5 — Verification (Month 6) | spitb1–spitb4
Goal: Student writes a production-grade verification environment against their own design.
Modules: spitb1 (unit TBs), spitb2 (corner cases), spitb3 (SVA/formal), spitb4 (system test)
**Checkpoint D** fires at end of spitb4 (38-item checklist fully passing).

---

## Certification Milestones

| Certificate | Trigger | Status |
|---|---|---|
| SPI Foundations | spi5 L4 | ⬜ |
| SPI Protocol Engineer | spi8 L4 | ⬜ |
| SPI Silicon Designer | spi12 L4 | ⬜ |
| SPI Verification Engineer | spitb4 L4 | ⬜ |

---

## Session Log

| Session | Date | Module Built | Commit |
|---|---|---|---|
| 0 | 2026-06-03 | Phase 0 setup — orchestrator + tracker docs | — |

---

*Cursor: spi1 is next. Read `docs/spi_agent_orchestrator.md` before starting.*
