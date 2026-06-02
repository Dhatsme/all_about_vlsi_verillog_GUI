# I²C Testbench Engineering Course — Curriculum Spec (i2ctb1–i2ctb7)

This file is read by the `chapter-builder` and `course-orchestrator` agents.
It defines chapter content, tier assignments, and quality guidelines for the I²C Testbench Engineering course.

Each chapter writes testbenches for the corresponding I²C Design modules (i2c1–i2c8).
The student already knows the hardware — now they learn to **verify** it.

---

## ⚡ Beginner-Friendliness Rules (apply to ALL chapters)

1. **Start with a real-world hook** — show where this verification technique is used in industry (tape-out sign-off, CI regression, chip bring-up).
2. **ASCII waveform or state diagram first** — draw what the testbench stimulus looks like before any code.
3. **One analogy per new concept** — e.g. "a task is like a function call — you describe the action once, then reuse it as many times as you need."
4. **"Before you code" paragraph** — describe in plain English what the testbench does and what a passing run looks like.
5. **Port table with plain-English Purpose column** — full sentence, not abbreviations.
6. **Never start theory with definitions** — start with *why we test this* and *what can go wrong* before explaining *how to test it*.
7. **Difficulty calibration** — i2ctb1 is truly beginner. Each chapter adds ONE new verification concept on top of the last.

---

## Curriculum State

| # | Module ID | Title | Lessons | Tier | Status |
|---|---|---|---|---|---|
| 1 | `i2ctb1` | I²C Fundamentals Testbench | L1 Testing Open-Drain IO, L2 Testing START/STOP Detector, L3 Testing Serial Shift Register | 1–2 | ✅ done |
| 2 | `i2ctb2` | Bit-Banging Testbenches | L1 Testing SCL Clock Generator, L2 Testing Data Bit TX, L3 Testing Data Bit RX + Clock Stretch | 2 | ✅ done |
| 3 | `i2ctb3` | Byte Transfer Testbenches | L1 Testing TX Byte FSM, L2 Testing RX Byte + ACK, L3 Testing Combined TX/RX Controller | 2–3 | ✅ done |
| 4 | `i2ctb4` | Controller FSM Testbenches | L1 Testing Address Phase, L2 Testing Data Phase, L3 Testing Full Master Controller | 3 | ✅ done |
| 5 | `i2ctb5` | Target Device Testbenches | L1 Testing Address Match, L2 Testing Register Read/Write, L3 Testing Target with IRQ | 3–4 | ✅ done |
| 6 | `i2ctb6` | Register Map Testbenches | L1 Testing Register File, L2 Testing Address Decoder, L3 Testing Auto-increment Pointer | 4 | ✅ done |
| 7 | `i2ctb7` | System-Level Verification | L1 Testing Bus Arbitration, L2 Testing Multi-Master Scenarios, L3 Full System Verification Portfolio | 4–5 | ✅ done |

---

## Tier Assignment

| Chapter | Tier | Notes |
|---|---|---|
| i2ctb1 | 1–2 | Open-drain testbench mechanics; task/check patterns spelled out line by line |
| i2ctb2 | 2 | Parameterised tasks, cycle counting — line markers with concept names |
| i2ctb3 | 2–3 | FSM stimulus sequences; behaviour spec for L3 |
| i2ctb4 | 3 | Full transaction-level sequences — structural guidance throughout |
| i2ctb5 | 3–4 | Target-side testing; behaviour spec for L3 |
| i2ctb6 | 4 | Behaviour spec throughout — what the test must prove, not how |
| i2ctb7 | 4–5 | Portfolio for L3 — full verification plan as job spec |

---

## Certification Milestone

| Certificate | Trigger lesson | Task string |
|---|---|---|
| I²C Verification Engineer | i2ctb7 L3 | `'🎓 I²C Verification Engineer certificate unlocked — you verified a complete I²C subsystem from stimulus to sign-off'` |

---

## Course Registration (courses.js)

Add to `window.COURSES` in `static/lessons/courses.js`:

```javascript
{
  id: 'i2ctb',
  title: 'I²C Testbench Engineering',
  icon: '🧪',
  description: 'Write directed testbenches for every I²C module — from open-drain IO cells to full multi-master subsystems',
  modules: ['i2ctb1'],  // builders append subsequent modules
},
```

---

## Chapter Content Guides

---

### i2ctb1 — I²C Fundamentals Testbench

**Real-world hook:** Before any I²C chip ships, every driver on the bus gets a directed testbench. This chapter shows you how to write the first three — the same patterns used in real pre-silicon verification.

**Key verification concept per lesson:** open-drain bus modelling (pullup primitive) → edge-detection stimulus → shift-register trace.

---

**L1: Testing the Open-Drain IO Cell** (Tier 1)
- Module under test: `i2c_io_cell` (from i2c1)
- New concept: `pullup` primitive + `wire` for inout in testbench; forced-low vs released
- ASCII:
  ```
  tx_en=0: sda ──────── 1  (pull-up wins)
  tx_en=1, tx_data=0: sda ─── 0  (driven low)
  tx_en=0 again: sda ──────── 1  (released)
  ```
- Testbench module: `tb`
- DUT instantiation: `i2c_io_cell dut (...)`; `wire sda`; `pullup pu(sda)`
- Tests (3 scenarios): released (sda=1), driven-low (sda=0), released-again (sda=1)
- Before-you-code: "You are writing a testbench that checks how the IO cell behaves like a rope: let go and it springs back up, pull it down and it stays down."
- Port table for the testbench signals (what to declare as `logic`, what as `wire`)
- Tier 1: every line spelled out including `pullup`, `wire sda`, `logic tx_en`, `logic tx_data`, `logic rx_data`
- Hint: complete annotated testbench; comment on every line including why `wire` not `logic` for sda
- Use iverilog note (not Verilator) — pullup requires iverilog
- Expected: `['PASS  released: sda=1', 'PASS  driving low: sda=0', 'IO cell testbench works!']`

---

**L2: Testing the START/STOP Detector** (Tier 1)
- Module under test: `i2c_cond_detect` (from i2c1)
- New concept: clocked stimulus sequences — driving SCL/SDA to create START/STOP conditions
- ASCII:
  ```
  SCL: ──────────────── 1 ─────────────────
  SDA: ── 1 ────────────┐ 0 ───── 1 ───────
                        ↑ START   ↑ STOP
  ```
- Tests: idle (no output), START sequence (scl=1, sda falls), STOP sequence (scl=1, sda rises)
- Uses `@(posedge clk); #1;` pattern for sampling after clock edge
- Tier 1: every line spelled out — clock generation, DUT instantiation, each stimulus step
- Hint: complete annotated testbench
- Expected: `['PASS  idle: no condition', 'PASS  START detected', 'PASS  STOP detected', 'Condition detector testbench works!']`

---

**L3: Testing the Serial Shift Register** (Tier 2)
- Module under test: `i2c_rx_shift` (from i2c1)
- New concept: `task automatic` for repetitive stimulus — the `shift_bit` task
- ASCII trace: shift in 0xA5 (10100101) bit by bit, show byte_out after each shift
- Tests: reset check, shift in 0xA5 MSB first, verify final byte_out === 8'hA5
- Introduce `task automatic shift_bit(input logic b)` pattern — reusable single-bit shift
- Tier 2: line markers with concept names for task declaration
- Hint: complete solution with key-line comments on the task
- Expected: `['PASS  reset: byte_out=0x00', 'PASS  received byte: 0xa5', 'Shift register testbench works!']`

---

### i2ctb2 — Bit-Banging Testbenches

**Real-world hook:** When you submit RTL for synthesis at a chip company, a regression suite runs these exact clock-generator and bit-tx tests every night. A single broken edge causes a respin.

**Key verification concept per lesson:** parameter sweeping → timing-violation checking → inout bus stimulus.

---

**L1: Testing the SCL Clock Generator** (Tier 2)
- Module under test: `i2c_clk_gen` (from i2c2) with `CLK_DIV = 10`
- New concept: edge counting to verify frequency — count SCL rising edges over N system clocks
- ASCII: show system clk vs SCL waveform with CLK_DIV/2 period marked
- Tests: disabled (no toggles), enabled → count ≥ 5 SCL rising edges in 60 system cycles
- Technique: integer counter incremented on SCL posedge; check after N master cycles
- Tier 2: line markers — clock counter declaration, edge-detect `always_ff`, check task
- Hint: complete solution with comments on the edge-count pattern
- Expected: `['PASS  disabled: no SCL edges', 'PASS  enabled: SCL toggling correctly', 'Clock generator testbench works!']`

---

**L2: Testing the Data Bit Transmitter** (Tier 2)
- Module under test: `i2c_bit_tx` (from i2c2)
- New concept: checking setup/hold timing — sample `sda_out` while SCL is low, verify it doesn't change while SCL is high
- ASCII: setup/hold window around SCL rising edge
- Tests: send 0 → sda_out low during SCL high; send 1 → sda_out high during SCL high; verify no change during SCL high
- Uses open-drain testbench pattern (`wire sda_out`; `pullup`)
- Tier 2: line markers for pullup, wire declarations, SCL-edge-aligned sampling
- Hint: complete annotated testbench
- Expected: `['PASS  bit=0: sda=0 during SCL high', 'PASS  bit=1: sda=1 during SCL high', 'Bit TX testbench works!']`

---

**L3: Testing the Data Bit Receiver + Clock Stretch** (Tier 2)
- Module under test: `i2c_bit_rx` (from i2c2)
- New concept: testing inout `scl` — driving SCL from testbench while monitoring stretch
- ASCII: normal RX (SCL free-running) vs stretched (SCL held low by DUT)
- Tests: normal receive (sda=0, rx_data=0; sda=1, rx_data=1); stretch mode (verify SCL held low)
- Two `pullup` primitives: one for SDA, one for SCL
- Tier 2: line markers — both pullups, two inout wires, stretch stimulus
- Hint: complete testbench with comments on dual-pullup pattern
- Expected: `['PASS  rx_data=0 when sda=0', 'PASS  rx_data=1 when sda=1', 'PASS  SCL stretched low', 'Bit RX testbench works!']`

---

### i2ctb3 — Byte Transfer Testbenches

**Real-world hook:** Every EEPROM write command (writing your WiFi password to flash, for example) goes through this exact byte layer. If the TX FSM has a bug, the write silently fails.

**Key verification concept per lesson:** FSM state coverage → 9-clock ACK sequences → mode-select integration testing.

---

**L1: Testing the TX Byte FSM** (Tier 2–3)
- Module under test: `i2c_tx_byte` (from i2c3)
- New concept: FSM coverage — verifying every state transition fires, not just the happy path
- ASCII state diagram: IDLE → LOAD → SHIFT(×8) → ACK_WAIT → DONE
- Tests: send 0xA5 — verify 8 bits appear on sda_out MSB first; verify `busy` high during TX; verify `done` pulses after ACK; verify NACK path (sda=1 on ACK slot)
- Task: `send_byte(input logic [7:0] data, input logic ack)` — drives 8 SCL cycles + ACK
- Tier 2–3: structural guidance — describe the task structure, not exact lines
- Hint: complete clean solution (no line annotations)
- Expected: `['PASS  byte 0xA5 transmitted', 'PASS  done pulsed after ACK', 'TX byte testbench works!']`

---

**L2: Testing RX Byte + ACK** (Tier 3)
- Module under test: `i2c_rx_byte` (from i2c3)
- New concept: stimulus from the master side — driving 8 SCL pulses with known SDA, checking byte_out
- ASCII: 8 data bits on SDA with SCL, then 9th clock for ACK/NACK
- Tests: receive 0xB6 with ACK; receive 0x00 with NACK; verify `valid` pulses at correct time
- Task: `drive_byte(input logic [7:0] data, output logic [7:0] received)` — 8 SCL pulses
- Tier 3: structural guidance throughout
- Hint: complete clean solution
- Expected: `['PASS  received 0xb6', 'PASS  valid pulsed', 'PASS  NACK driven correctly', 'RX byte testbench works!']`

---

**L3: Testing the Combined TX/RX Controller** (Tier 3)
- Module under test: `i2c_byte_ctrl` (from i2c3)
- New concept: mode-select integration testing — test TX path and RX path through the same interface
- Tests: mode=0 TX path sends known byte; mode=1 RX path receives known byte; switch mode mid-transaction
- Tier 3: structural guidance — describe the two test scenarios, not exact lines
- Hint: complete clean solution
- Expected: `['PASS  TX mode: byte transmitted', 'PASS  RX mode: byte received', 'Byte controller testbench works!']`

---

### i2ctb4 — Controller FSM Testbenches

**Real-world hook:** Linux I²C driver verification teams write exactly these tests before enabling a new peripheral — START, address, data, STOP — and run them at every kernel revision.

**Key verification concept per lesson:** transaction-level abstraction → multi-byte sequences → full read/write round-trip.

---

**L1: Testing the Address Phase** (Tier 3)
- Module under test: `i2c_addr_phase` (from i2c4)
- New concept: transaction-level task — `do_address_phase(addr, rw, ack)` encapsulates the 9-clock sequence
- ASCII: START pulse → 7 address bits → R/W bit → ACK slot
- Tests: correct address + ACK → `addr_ack=1`, `done=1`; wrong address (NACK on slot) → `addr_ack=0`
- Tier 3: structural guidance — describe the task, the two test scenarios, the expected outputs
- Hint: complete clean solution
- Expected: `['PASS  ACK received: addr_ack=1', 'PASS  NACK: addr_ack=0', 'Address phase testbench works!']`

---

**L2: Testing the Data Phase** (Tier 3)
- Module under test: `i2c_data_phase` (from i2c4)
- New concept: multi-byte loop — parameterised N-byte TX/RX sequences
- Tests: 3-byte TX (verify 3×8 bits appear MSB-first); 2-byte RX (drive 2×8 bits, verify received); NACK on last byte
- Tier 3: structural guidance — loop structure, byte-by-byte verification pattern
- Hint: complete clean solution
- Expected: `['PASS  3 bytes transmitted', 'PASS  2 bytes received', 'Data phase testbench works!']`

---

**L3: Testing the Full Master Controller** (Tier 3)
- Module under test: `i2c_master` (from i2c4)
- New concept: end-to-end write + read transaction using the master's top-level interface
- Tests: write transaction (addr=0x48, rw=0, data=0xAB) → verify SDA sequence; read transaction → verify data_out; `ack_err` on NACK
- ASCII: full transaction timing diagram (START → ADDR → DATA → STOP)
- Tier 3: structural guidance — two transaction tasks, error path test
- Hint: complete clean solution
- Expected: `['PASS  write transaction complete', 'PASS  read transaction complete', 'Master controller testbench works!']`

---

### i2ctb5 — Target Device Testbenches

**Real-world hook:** Every chip that sits on an I²C bus — a temperature sensor, a battery gauge, an OLED controller — has a target-side testbench like these in its verification suite.

**Key verification concept per lesson:** address filtering → register model checking → interrupt threshold testing.

---

**L1: Testing Address Match** (Tier 3–4)
- Module under test: `i2c_addr_match` (from i2c5)
- New concept: parametric address sweep — test own address hits, other addresses miss
- Tests: shift in MY_ADDR → selected=1; shift in wrong address → selected=0; check rw_bit captured correctly
- Tier 3–4: structural guidance for positive test; behaviour spec for negative/edge cases
- Hint: complete clean solution
- Expected: `['PASS  own address: selected=1', 'PASS  wrong address: selected=0', 'Address match testbench works!']`

---

**L2: Testing Register Read/Write** (Tier 4)
- Module under test: `i2c_target_reg` (from i2c5)
- New concept: write-then-readback pattern — the golden model approach
- Tests: write 0xDE to reg[3], read back reg[3] → verify 0xDE; write all 8 registers, read all back
- ASCII: write sequence timing (addr → reg_addr → data), then read sequence
- Tier 4: behaviour spec — describe what the test must PROVE, not how to implement it
- Hint: design notes — golden model pattern description, NO code
- Expected: `['PASS  reg[3] readback: 0xde', 'PASS  all 8 registers verified', 'Register RW testbench works!']`

---

**L3: Testing Target with IRQ** (Tier 4)
- Module under test: `i2c_target` (from i2c5)
- New concept: threshold/interrupt testing — write values near, at, and above threshold; verify irq timing
- Tests: write below threshold → irq=0; write at threshold → irq=0; write above threshold → irq=1; clear by writing below
- Tier 4: behaviour spec
- Hint: design notes — threshold sweep description, NO code
- Expected: `['PASS  below threshold: irq=0', 'PASS  above threshold: irq=1', 'Target IRQ testbench works!']`

---

### i2ctb6 — Register Map Testbenches

**Real-world hook:** Every ASIC datasheet lists a register map. Before tape-out, verification engineers write exhaustive register tests — every address, every bit. This chapter shows you how.

**Key verification concept per lesson:** exhaustive address sweep → select-line coverage → burst-access pointer verification.

---

**L1: Testing the Register File** (Tier 4)
- Module under test: `i2c_regfile` (from i2c6) — 16×8-bit registers
- New concept: walking-ones pattern — write 0x01, 0x02, 0x04 … to each register; verify readback
- Tests: write all 16 registers with unique values; read all back; verify no aliasing (write reg[5] doesn't change reg[3])
- Tier 4: behaviour spec — describe what "no aliasing" means to prove
- Hint: design notes on walking-ones and anti-aliasing patterns, NO code
- Expected: `['PASS  all 16 registers written', 'PASS  readback matches', 'Register file testbench works!']`

---

**L2: Testing the Address Decoder** (Tier 4)
- Module under test: `i2c_addr_decode` (from i2c6)
- New concept: select-line coverage — verify exactly one select fires per address, none fire outside range
- Tests: sweep all in-range addresses → verify exactly one select high; out-of-range → all selects low
- Tier 4: behaviour spec
- Hint: design notes on one-hot select verification, NO code
- Expected: `['PASS  in-range: one select active', 'PASS  out-of-range: no select', 'Address decoder testbench works!']`

---

**L3: Testing Auto-increment Pointer** (Tier 4)
- Module under test: `i2c_autoincr` (from i2c6)
- New concept: burst-write verification — write N bytes without re-sending address; verify pointer advanced
- Tests: burst write 4 bytes starting at address 0 → verify regs[0–3] all written; verify pointer wraps at end of range
- Tier 4: behaviour spec
- Hint: design notes — burst sequence description, wrap-around check, NO code
- Expected: `['PASS  burst write: 4 registers updated', 'PASS  pointer wrap-around', 'Auto-increment testbench works!']`

---

### i2ctb7 — System-Level Verification

**Real-world hook:** "Write a multi-master I²C verification environment" appears verbatim in hardware verification engineer job descriptions. This chapter is that interview project.

**Key verification concept per lesson:** arbitration stimulus → clock-sync verification → full coverage-driven subsystem test plan.

---

**L1: Testing Bus Arbitration** (Tier 4–5)
- Module under test: `i2c_arbitrate` (from i2c7)
- New concept: two-master scenario — drive two SDA values simultaneously, verify arb_lost fires for the loser
- ASCII: master A drives 1, master B drives 0 → wired-AND = 0, master A loses
- Tests: both drive same value (no arb_lost); master A=1, bus=0 (arb_lost=1); master A=0, bus=0 (no loss)
- Tier 4–5: structural for the two-master test; behaviour spec for corner cases
- Hint: design notes — wired-AND scenario table, NO code
- Expected: `['PASS  no conflict: arb_lost=0', 'PASS  conflict: arb_lost=1', 'Arbitration testbench works!']`

---

**L2: Testing Multi-Master Scenarios** (Tier 4–5)
- Module under test: `i2c_multi_master` (from i2c7)
- New concept: retry verification — count retries after arb_lost; verify exponential back-off delay grows
- Tests: force arb_lost 3 times → verify retry counter increments; verify delay between retries grows; verify eventual success when bus clear
- Tier 4–5: behaviour spec throughout
- Hint: design notes — retry counter check method, back-off measurement technique, NO code
- Expected: `['PASS  retry count increments', 'PASS  back-off delay grows', 'Multi-master testbench works!']`

---

**L3: Full System Verification Portfolio** (Tier 5) — **I²C Verification Engineer certificate here**
- Module under test: `i2c_subsystem` (from i2c8) — full master + target + regfile on shared bus
- New concept: coverage-driven test plan — 8 scenarios that together prove the subsystem correct
- Scenarios to implement:
  1. Master writes to target register, reads it back — data integrity
  2. NACK on wrong address — error handling
  3. Bus arbitration between two masters — winner completes, loser retries
  4. Clock stretch mid-byte — master waits, byte completes correctly
  5. Burst write 4 bytes, burst read back — auto-increment
  6. IRQ fires on threshold crossing — interrupt path
  7. Back-to-back transactions without STOP — repeated START
  8. Full reset recovery — all state machines return to IDLE
- Tier 5: portfolio — the tasks field IS the 8-scenario list above
- Hint: ASCII block diagram of the full subsystem + suggested task hierarchy, NO code
- Design starter: `// Build the full system verification testbench here. See Theory for the 8-scenario plan.`
- Add certificate task: `'🎓 I²C Verification Engineer certificate unlocked — you verified a complete I²C subsystem from stimulus to sign-off'`
- Add forward: `'You now know how to verify I²C hardware from bit-level primitives to system-level integration — the complete verification engineer skill set.'`
- Expected: `['PASS  scenario 1: write/read-back', 'PASS  scenario 3: arbitration', 'I²C Verification Engineer!']`
