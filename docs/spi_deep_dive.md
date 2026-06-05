# SPI Deep-Dive — Curriculum Tracker

> **This file changes every session.** After each chapter is pushed, update the status column (❌ → ✅) and advance the cursor.
> Course ID: `spi_long` | Branch: `develop` | Docs branch: `claude/spi-master-fsm-spec-CaaqI`

---

## Status Table

| # | Module ID | Title | Phase | Tier | Lessons | Status |
|---|---|---|---|---|---|---|
| 1 | `spi_long1` | SPI Protocol & Signal Definitions | 1 | 1→2 | 3 | ✅ done |
| 2 | `spi_long2` | Clock Divider & SCK Generation | 1 | 2 | 3 | ✅ done |
| 3 | `spi_long3` | TX FIFO Design | 2 | 2→3 | 4 | ✅ done |
| 4 | `spi_long4` | RX FIFO Design | 2 | 2→3 | 4 | ✅ done |
| 5 | `spi_long5` | TX & RX Shift Registers | 2 | 3 | 4 | ✅ done |
| 6 | `spi_long6` | CPOL/CPHA Timing Engine | 2 | 3→4 | 4 | ✅ done |
| 7 | `spi_long7` | CS Controller & Timing | 3 | 3→4 | 4 | ✅ done |
| 8 | `spi_long8` | Master FSM | 3 | 4 | 4 | ✅ done |
| 9 | `spi_long9` | Error Handling & Interrupt Controller | 3 | 4 | 4 | ✅ done |
| 10 | `spi_long10` | SPI Package & Internal Interfaces | 4 | 4 | 3 | ❌ **build this next** |
| 11 | `spi_long11` | APB Register Interface | 4 | 4→5 | 4 | ❌ |
| 12 | `spi_long12` | Full SPI Master Integration | 4 | 5 | 4 | ❌ |
| 13 | `spi_long_tb1` | Unit Testbench Suite | 5 | 5 | 4 | ❌ |
| 14 | `spi_long_tb2` | Corner Case Coverage | 5 | 5 | 4 | ❌ |
| 15 | `spi_long_tb3` | SVA & Formal Verification | 5 | 5 | 3 | ❌ |
| 16 | `spi_long_tb4` | Integration & System Verification | 5 | 5 | 4 | ❌ |

---

## Integration Checkpoints

| Checkpoint | Embedded In | Pass Condition | Status |
|---|---|---|---|
| A — Clock + Shift Loopback | spi_long5 L4 | `PASS rx_data=0xa5` in Mode 0 | ✅ |
| B — FSM + CS + 3-word burst | spi_long8 L4 | CS never toggles mid-burst; word_done fires 3× | ✅ |
| C — Full APB-driven transfer | spi_long12 L4 | All 4 modes × WL=8/16/32; IRQ fires once; RXDATA==TXDATA | ⬜ |
| D — 38-item DV checklist | spi_long_tb4 L4 | All 38 items print `PASS` | ⬜ |

---

## Phase Summaries

### Phase 1 — Foundation (Month 1) | spi_long1–spi_long2
Goal: Student can describe the SPI wire protocol and explain how SCK is generated.
Phase 1 complete ✅

### Phase 2 — Data Path (Months 2–3) | spi_long3–spi_long6
Goal: Every data-path block built: FIFOs, shift registers, timing engine.
**Checkpoint A** ✅ PASSED (spi_long5 L4 loopback)
Phase 2 complete ✅

### Phase 3 — Control Path (Month 4) | spi_long7–spi_long9
Goal: Full SPI transfer under FSM control with error handling.
Modules done: spi_long7, spi_long8, spi_long9.
**Checkpoint B** ✅ PASSED (spi_long8 L4 — 3-word CONT_XFER burst)
Phase 3 complete ✅

### Phase 4 — Integration (Month 5) | spi_long10–spi_long12
Goal: All modules assembled into register-programmable APB-connected SPI master.
**Checkpoint C** fires at end of spi_long12.

### Phase 5 — Verification (Month 6) | spi_long_tb1–spi_long_tb4
Goal: Production-grade verification environment.
**Checkpoint D** fires at end of spi_long_tb4 (38-item checklist).

---

## Certification Milestones

| Certificate | Trigger | Status |
|---|---|---|
| SPI Foundations | spi_long5 L4 | ✅ |
| SPI Protocol Engineer | spi_long8 L4 | ✅ |
| SPI Silicon Designer | spi_long12 L4 | ⬜ |
| SPI Verification Engineer | spi_long_tb4 L4 | ⬜ |

---

## Session Log

| Session | Date | Module Built | Commit |
|---|---|---|---|
| 0 | 2026-06-03 | Phase 0 setup — orchestrator + tracker docs | 78f9ff8 |
| 1 | 2026-06-03 | spi_long1 — SPI Protocol & Signal Definitions (3 lessons) | 34bfd64 |
| 2 | 2026-06-03 | spi_long2 — Clock Divider & SCK Generation (3 lessons) | 5fe0db1 |
| 3 | 2026-06-04 | Rename: spi* → spi_long*; restore spi1/spi2 to develop versions | 82ee1c3 |
| 4 | 2026-06-04 | spi_long3 — TX FIFO Design (4 lessons) | 32e3c79 |
| 5 | 2026-06-04 | spi_long4 — RX FIFO Design (4 lessons) | db01d68 |
| 6 | 2026-06-04 | spi_long5 — TX & RX Shift Registers (4 lessons, Checkpoint A) | 60d8783 |
| 7 | 2026-06-04 | spi_long6 — CPOL/CPHA Timing Engine (4 lessons) | 5d1c572 |
| 8 | 2026-06-04 | spi_long7 — CS Controller & Timing (4 lessons) | 14b2154 |
| 9 | 2026-06-05 | spi_long8 — Master FSM (4 lessons, Checkpoint B) | e398afe |
| 10 | 2026-06-05 | spi_long9 — Error Handling & Interrupt Controller (4 lessons) | 9f3867f |

---

*Cursor: spi_long10 is next. Read `docs/spi_long_writing_guide.md` and `docs/spi_agent_orchestrator.md` before starting.*
