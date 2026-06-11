# i2cdesign.md — I²C Design Course — Lesson-Building Agent

This file drives the autonomous lesson-building agent for the I²C Design course.
It follows the same format and rules as CLAUDE.md.
Read CLAUDE.md first for the full schema, testbench rules, difficulty tiers, and quality checklist.

---

## Mission

Build the next unchecked chapter in the I²C curriculum table below.
One chapter = one JS file + two registration edits, pushed in **two separate commits**.
Push to `develop` when done. Mark the chapter done here (replace `❌` with `✅`).

The GUI is **frozen** — same rules as CLAUDE.md.

---

## Prerequisites — additions needed in SV Zero to Hero

Before building the I²C course, these concepts must exist in the msv series.
If any are missing, create a short standalone lesson or bridge lesson before starting i2c1.

**Critical (students will be lost without these):**
- `inout` port direction — bidirectional signal declaration
- `1'bz` — high-impedance value; how it interacts with pull-up resistors
- `pullup` primitive in testbenches — `pullup pu(wire_name);`
- Tristate / open-drain driver: `assign sda = drive_low ? 1'b0 : 1'bz;`
- Wire-AND behaviour: any driver pulling low wins; released bus floats to 1

**High Priority (needed for clock stretching and arbitration):**
- Monitoring an `inout` signal while also driving it
- Parameterized modules: `parameter CLK_FREQ = 50_000_000`
- Synchronous detection of external signal changes (SCL released by slave)

**Nice to Have (deeper understanding):**
- `$time` in testbenches for timing verification
- `always_comb` with `x` / `z` handling
- Multi-driver bus resolution rules in Verilator

---

## Curriculum state — update this table after every push

| # | Module ID | Title | Lessons | Status |
|---|---|---|---|---|
| 1 | `i2c1` | I²C Fundamentals | L1 Open-Drain IO, L2 START/STOP Conditions, L3 Bit-Bang Controller | ✅ done |
| 2 | `i2c2` | Clock & Data Timing | L1 SCL Generator, L2 SDA Sample & Drive, L3 Setup/Hold Checker | ✅ done |
| 3 | `i2c3` | Master Byte Operations | L1 Byte Transmitter, L2 ACK/NACK Detection, L3 Byte Receiver | ✅ done |
| 4 | `i2c4` | Full Transactions | L1 Master Write, L2 Master Read, L3 Repeated START | ✅ done |
| 5 | `i2c5` | I²C Slave Design | L1 Address Decoder, L2 Slave Byte Engine, L3 Portfolio: Register-File Slave | ✅ done |
| 6 | `i2c6` | Clock Stretching | L1 Stretch Detect, L2 Slave Clock Stretch, L3 Portfolio: Stretching Slave | ✅ done |
| 7 | `i2c7` | Multi-Master & Arbitration | L1 Bus Idle Detector, L2 Arbitration Logic, L3 Portfolio: Arbitrating Master | ✅ done |
| 8 | `i2c8` | Advanced I²C | L1 10-bit Addressing, L2 SMBus Alert, L3 Portfolio: Full I²C Subsystem | ✅ done |

*I²C Design course complete. All 8 modules built and registered in courses.js.*

---

## Registration — adding i2c modules to courses.js

When building i2c1 (first chapter), create a new course entry in `courses.js`:

```javascript
{ id: 'i2c', modules: ['i2c1'] }  // grow this array as more chapters are built
```

For each subsequent chapter, append its id to the `i2c` modules array.
Final state (after all 8 chapters):
```javascript
{ id: 'i2c', modules: ['i2c1','i2c2','i2c3','i2c4','i2c5','i2c6','i2c7','i2c8'] }
```

| New chapter belongs to | Course `id` to update |
|---|---|
| i2c1 – i2c8 | `i2c` |

---

## Tier assignment per lesson

| Chapter | L1 | L2 | L3 |
|---|---|---|---|
| i2c1 Fundamentals | T2 | T3 | T3 |
| i2c2 Timing | T3 | T3 | T4 |
| i2c3 Byte Ops | T3 | T3 | T3 |
| i2c4 Transactions | T3 | T4 | T4 |
| i2c5 Slave | T3 | T4 | T5 |
| i2c6 Stretching | T4 | T4 | T5 |
| i2c7 Arbitration | T4 | T4 | T5 |
| i2c8 Advanced | T4 | T4 | T5 |

---

## Chapter content guide — what to build

### i2c1 — I²C Fundamentals
**Level:** beginner  **Icon:** 🔗

**L1 — Open-Drain IO Cell** (Tier 2)
- New: `inout` port, `1'bz`, `pullup` primitive, wire-AND bus model
- Circuit: `i2c_io_cell` — single open-drain I/O pad
- Analogy: "a push-button that can only pull down, never push up — the pull-up resistor does the pushing"
- Ports: `tx_en, tx_data (in logic); sda (inout wire); rx_data (out logic)`
- Logic: `assign sda = (tx_en && !tx_data) ? 1'b0 : 1'bz;  assign rx_data = sda;`
- Testbench: two cells on shared wire + `pullup pu(sda);`; verify both-released=1, one-low=0, both-low=0
- Expected: `PASS  both released: sda=1`, `PASS  one drives low: sda=0`, `IO cell works!`

**L2 — START and STOP Conditions** (Tier 3)
- New: SDA transitions while SCL is high are special — the only legal bus events
- Circuit: `i2c_start_stop` — generates START (SDA falls while SCL high) and STOP (SDA rises while SCL high)
- Analogy: "START is tapping someone on the shoulder; STOP is waving goodbye"
- Ports: `clk, rst, send_start, send_stop (in); scl, sda (inout wire); busy, done (out)`
- States: IDLE → SS_SCL_HIGH → SS_SDA_LOW → SS_SCL_LOW → IDLE (for START); reverse for STOP
- Testbench: drive send_start, wait for done; verify SDA fell while SCL was high
- Expected: `PASS  START condition generated`, `PASS  STOP condition generated`, `START/STOP works!`

**L3 — Bit-Bang Controller** (Tier 3)
- New: 4-phase I²C bit period — LO_SETUP, RISE, HI_SAMPLE, FALL
- Circuit: `i2c_bit_ctrl` — drives one complete I²C bit: change SDA on SCL-low, then clock it
- 4 phases (each one system-clock tick wide for simulation): LO_SETUP → RISE → HI_SAMPLE → FALL
- Ports: `clk, rst, bit_in, send (in); scl, sda (inout wire); bit_out, done (out)`
- Logic: in LO_SETUP drive SDA; in RISE release SCL (1'bz); in HI_SAMPLE sample sda; in FALL pull SCL low
- Testbench: send bit=1 then bit=0; verify bit_out matches what was driven on SDA
- Expected: `PASS  bit=1 transmitted and received`, `PASS  bit=0 transmitted and received`, `Bit controller works!`

---

### i2c2 — Clock & Data Timing
**Level:** beginner  **Icon:** ⏱

**L1 — SCL Clock Generator** (Tier 3)
- New: parameterized baud divider; `parameter CLK_DIV`; tick pulses for lo/hi phases
- Circuit: `i2c_clk_gen` — free-running divider producing SCL at target frequency
- Ports: `clk, rst, en (in); parameter CLK_DIV = 250 (50 MHz → 100 kHz); scl_out, tick_lo, tick_hi (out)`
- Logic: counter 0..CLK_DIV-1; tick_lo at 0, tick_hi at CLK_DIV/2; scl_out low in bottom half
- Testbench: count SCL periods; verify half-period = CLK_DIV system clocks; duty cycle = 50%
- Expected: `PASS  SCL period correct`, `PASS  duty cycle 50%`, `Clock generator works!`

**L2 — SDA Sample and Drive** (Tier 3)
- New: setup/hold concept — SDA changes on SCL-low, is read on SCL-high
- Circuit: `i2c_sda_ctrl` — latches next_bit on tick_lo; samples sda_in on tick_hi
- Analogy: "change the channel while the TV is off (SCL low); watch when it's on (SCL high)"
- Ports: `clk, rst, tick_lo, tick_hi, next_bit, sda_in (in); sda_drive, sda_oe, sampled_bit (out)`
- Logic: on tick_lo: latch next_bit into drive register; on tick_hi: capture sda_in into sampled_bit
- Testbench: simulate SCL ticks; verify SDA driven on lo tick, sampled on hi tick
- Expected: `PASS  bit driven on SCL low`, `PASS  bit sampled on SCL high`, `SDA control works!`

**L3 — Setup/Hold Violation Checker** (Tier 4)
- New: assertion-style monitor; checking timing windows around clock edges
- Circuit: `i2c_timing_check` — monitors SDA for changes closer than tSU/tHD to SCL edges
- Real purpose: metastability prevention — this is how timing violations are caught in simulation before silicon
- Ports: `clk, scl, sda (in); parameter TSU_CYCLES = 2, THD_CYCLES = 2; violation (out)`
- Logic: track time since last SCL edge and last SDA change; flag violation if change within window
- Testbench: inject a clean transition (no violation); inject a marginal transition (violation)
- Expected: `PASS  clean transition: no violation`, `PASS  violation detected correctly`, `Timing checker works!`

---

### i2c3 — Master Byte Operations
**Level:** intermediate  **Icon:** 📦

**L1 — Byte Transmitter** (Tier 3)
- New: 8-bit shift register, MSB-first serialization onto I²C bus
- Circuit: `i2c_byte_tx` — shifts 8-bit parallel data out MSB first, one bit per SCL cycle
- Ports: `clk, rst, start_tx, data_in[7:0], tick_lo (in); sda_bit, tx_done (out)`
- Logic: on start_tx load shift_reg = data_in; on each tick_lo shift left and drive MSB on SDA; tx_done after 8 bits
- Testbench: transmit 0xA5 (10100101); verify 8 serial SDA bits match that pattern in order
- Expected: `PASS  byte 0xA5 serialised correctly`, `PASS  tx_done asserts after 8 bits`, `Byte TX works!`

**L2 — ACK/NACK Detection** (Tier 3)
- New: 9th SCL pulse; master releases SDA and reads the slave's response
- Circuit: `i2c_ack_rx` — on 9th cycle releases SDA, samples it on tick_hi
- Analogy: "you ask a question and wait — if the room is silent (SDA=1) nobody answered (NACK)"
- Ports: `clk, rst, start_ack, tick_lo, tick_hi, sda_in (in); ack_ok, nack_err, ack_done (out)`
- Logic: in 9th cycle: release SDA (1'bz); on tick_hi: ack_ok = (sda_in===0); nack_err = (sda_in===1)
- Testbench: simulate slave pulling SDA low (ACK); simulate SDA floating high (NACK); verify both outcomes
- Expected: `PASS  ACK received correctly`, `PASS  NACK detected correctly`, `ACK/NACK works!`

**L3 — Byte Receiver** (Tier 3)
- New: deserializing 8 incoming bits MSB-first back into a parallel byte
- Circuit: `i2c_byte_rx` — samples sda_in on each tick_hi, shifts into 8-bit register
- Ports: `clk, rst, start_rx, tick_hi, sda_in (in); data_out[7:0], rx_done (out)`
- Logic: on each tick_hi: shift_reg = {shift_reg[6:0], sda_in}; after 8 ticks: rx_done=1, data_out=shift_reg
- Testbench: drive 8 serial bits = 0xC3 (11000011) on sda_in; verify data_out === 8'hC3
- Expected: `PASS  byte 0xC3 received correctly`, `PASS  rx_done asserts after 8 bits`, `Byte RX works!`

---

### i2c4 — Full Transactions
**Level:** intermediate  **Icon:** 📨

**L1 — Master Write Transaction** (Tier 3)
- New: top-level FSM combining all components into one I²C write
- Circuit: `i2c_master_write` — START → 7-bit addr + W(0) → ACK → data byte → ACK → STOP
- States: IDLE → START → ADDR → ADDR_ACK → DATA → DATA_ACK → STOP → DONE
- Ports: `clk, rst, send, addr[6:0], wdata[7:0] (in); scl, sda (inout wire); busy, ack_err, done (out)`
- Testbench: minimal slave model that ACKs address and data; verify correct byte sequence on bus
- Expected: `PASS  address byte sent correctly`, `PASS  data byte sent correctly`, `Master write works!`

**L2 — Master Read Transaction** (Tier 4)
- New: direction reversal — master releases SDA during data phase so slave can drive it; master sends NACK to end read
- Circuit: `i2c_master_read` — START → addr + R(1) → ACK → receive data byte → NACK → STOP
- This one takes thinking — master must release SDA during data reception but hold it for address and NACK
- States: IDLE → START → ADDR → ADDR_ACK → DATA_RX → MASTER_NACK → STOP → DONE
- Ports: `clk, rst, send, addr[6:0] (in); rdata[7:0] (out); scl, sda (inout wire); busy, done (out)`
- Testbench: slave model drives 0x55 on SDA during data phase; verify master captures 0x55
- Expected: `PASS  slave data 0x55 received`, `PASS  master NACK sent after last byte`, `Master read works!`

**L3 — Repeated START** (Tier 4)
- New: Sr — restart without releasing the bus; used for combined write-then-read (e.g. set register address, then read value)
- Circuit: `i2c_master_combined` — write phase → Repeated START → read phase → STOP, without STOP between phases
- Real use case: sensor register access — write 1-byte address (0x10), Sr, read 1-byte value
- Ports: `clk, rst, send, addr[6:0], wdata[7:0] (in); rdata[7:0] (out); scl, sda (inout wire); busy, done (out)`
- Testbench: write 0x10 then Sr then read 1 byte = 0xAB from slave
- Expected: `PASS  write phase complete`, `PASS  repeated START generated`, `PASS  read phase complete`, `Combined transfer works!`

---

### i2c5 — I²C Slave Design
**Level:** intermediate  **Icon:** 🔌

**L1 — Address Decoder** (Tier 3)
- New: slave passively monitors bus; recognises its own address after a START condition
- Circuit: `i2c_addr_decode` — shifts in 8 bits after START; compares bits[7:1] to MY_ADDR; captures R/W bit
- Ports: `clk, rst, scl, sda_in (in); parameter MY_ADDR = 7'h50; addr_match, rw_bit (out)`
- Logic: shift 8 bits on SCL rising; after 8th bit compare upper 7 to MY_ADDR; addr_match pulses if equal
- Testbench: send address 0x50 (match) then 0x48 (no match); verify addr_match only fires for 0x50
- Expected: `PASS  matching address detected`, `PASS  non-matching address ignored`, `Address decoder works!`

**L2 — Slave Byte Engine** (Tier 4)
- New: slave driving SDA (sending ACK or read data); slave-side 9-bit byte exchange
- Circuit: `i2c_slave_engine` — write path: receive 8 bits → pull SDA low on 9th cycle (ACK); read path: drive tx_data MSB-first
- The tricky part: slave must release SDA at exactly the right time — not too early, not too late
- Ports: `clk, rst, scl, sda (inout wire); tx_data[7:0], load_tx (in); rx_data[7:0], rx_valid, ack_sent (out)`
- Logic: write: receive 8 bits, then assert `assign sda = ack_cycle ? 1'b0 : 1'bz`; read: shift tx_data MSB-first
- Testbench: master sends 0x37 → verify slave ACKs and rx_data=0x37; master reads → verify tx_data driven
- Expected: `PASS  slave ACK on write`, `PASS  write data 0x37 received`, `PASS  read data driven correctly`, `Slave engine works!`

**L3 — Portfolio: Register-File Slave** (Tier 5)
- Spec: 16-byte register file accessible over I²C
  - Write: master sends 1-byte register index then 1-byte value; slave stores it
  - Read: master sends 1-byte register index (write), then Repeated START + read address; slave returns register value
  - Parameter: `MY_ADDR = 7'h50`
- Sub-modules: `i2c_addr_decode` + `i2c_slave_engine` + `logic [7:0] regfile [0:15]`
- Expose `regfile` output for testbench inspection
- Testbench: write 0xAB to reg[3]; read back reg[3]; verify 0xAB returned
- Expected: `PASS  register write accepted`, `PASS  register read returned 0xAB`, `Register slave works!`
- Hint: design notes only — no code; describe the state machine and how reg index is captured

---

### i2c6 — Clock Stretching
**Level:** intermediate  **Icon:** ⏳

**L1 — Clock Stretch Detector** (Tier 4)
- New: slave can hold SCL low to pause master; master must check SCL is actually high before advancing
- Circuit: `i2c_stretch_detect` — master drives SCL high (releases 1'bz), then polls scl_in; waits until scl_in=1
- Common bug: advancing the state machine based on the drive signal rather than the actual SCL pin — catch it here
- Ports: `clk, rst, scl_drive, scl_in (in); scl_oe, stretched, stretch_done (out)`
- Logic: when scl_drive=1 (master wants SCL high): release SCL (scl_oe=0); if scl_in===0 stretched=1; proceed when scl_in===1
- Testbench: hold scl_in low for 10 extra cycles after master releases; verify master waits, then proceeds
- Expected: `PASS  master waits during stretch`, `PASS  master proceeds when SCL released`, `Clock stretch detect works!`

**L2 — Slave Clock Stretch** (Tier 4)
- New: slave as SCL driver — actively pulling SCL low to buy processing time
- Circuit: `i2c_slave_stretch` — slave asserts SCL low after ACK while busy_processing=1; releases when done
- Ports: `clk, rst, scl (inout wire); busy_processing (in); stretch_active (out)`
- Logic: `assign scl = stretch_req ? 1'b0 : 1'bz;` — slave can only pull low, never drive high
- Testbench: simulate 20-cycle processing delay; verify SCL held low for 20 cycles then released
- Expected: `PASS  SCL held low during processing`, `PASS  SCL released when ready`, `Slave stretch works!`

**L3 — Portfolio: Clock-Stretching Slave** (Tier 5)
- Spec: Register-file slave (i2c5 L3) extended with clock stretching after every ACK
  - Slave stretches SCL for 8 system-clock cycles after each ACK to simulate EEPROM write latency
  - Master model in testbench must handle stretching and not time out
- Sub-modules: `i2c_slave_stretch` + register-file slave from i2c5 L3
- Verify no data corruption occurs during stretch periods
- Testbench: write 3 bytes to different registers; verify all arrive intact despite 8-cycle stretch each
- Expected: `PASS  slave stretch respected`, `PASS  data integrity after stretch`, `Stretching slave works!`
- Hint: design notes + ASCII state diagram showing STRETCH state inserted between ACK and next byte

---

### i2c7 — Multi-Master & Arbitration
**Level:** advanced  **Icon:** ⚔

**L1 — Bus Idle Detector** (Tier 4)
- New: before starting a transaction a master must wait for tBUF (both SCL and SDA high long enough)
- Circuit: `i2c_bus_idle` — counts cycles where scl_in AND sda_in are both high; asserts bus_free after tBUF
- Real consequence: starting too early causes a spurious START condition on another master's data
- Ports: `clk, rst, scl_in, sda_in (in); parameter TBUF_CYCLES = 50; bus_free (out)`
- Logic: counter++ when scl_in&&sda_in; reset on any activity; bus_free when counter>=TBUF_CYCLES
- Testbench: STOP condition followed by 60 idle cycles; verify bus_free asserts at cycle 50; verify it clears on START
- Expected: `PASS  bus_free asserts after tBUF`, `PASS  bus_free clears on START`, `Bus idle detector works!`

**L2 — Arbitration Logic** (Tier 4)
- New: wire-AND means the master driving 0 always wins; a master that drove 1 but sees 0 has lost
- Circuit: `i2c_arbitrate` — during SCL-high phase compares what master drove vs what bus actually shows
- Core equation: `arb_lost = scl_high_phase && sda_oe && (sda_drive === 1'b1) && (sda_in === 1'b0);`
- Analogy: "two people whispering different things at once — the one who said zero drowns out the one"
- Ports: `clk, rst, scl_high_phase, sda_drive, sda_oe, sda_in (in); arb_lost (out)`
- Logic: on posedge during scl_high_phase: if you drove 1 but see 0, another master is pulling low — you lose
- Testbench: simulate master A driving 1 and master B driving 0 simultaneously; verify A's arb_lost asserts
- Expected: `PASS  arbitration winner continues`, `PASS  loser detects arb_lost`, `Arbitration works!`

**L3 — Portfolio: Arbitrating Master** (Tier 5)
- Spec: full I²C master with bus-idle guard and real-time arbitration
  - Must wait for bus_free before asserting START
  - During transaction: monitor arb_lost; on arb_lost abort immediately, wait for bus_free, then retry
  - Retry limit: 3 attempts before asserting fatal_err
- Sub-modules: `i2c_bus_idle` + `i2c_arbitrate` + master write engine (i2c4 L1)
- Testbench: two master instances on shared bus; one sends 0x00 bytes (loses), one sends 0xFF bytes (wins); verify exactly one transaction succeeds per window
- Hint: ASCII state diagram with ARB_LOST → ABORT → WAIT_IDLE → RETRY path; no code
- Expected: `PASS  master waits for bus idle`, `PASS  arb_lost causes retry`, `PASS  winner completes transaction`, `Arbitrating master works!`

---

### i2c8 — Advanced I²C
**Level:** advanced  **Icon:** 🔬

**L1 — 10-bit Addressing** (Tier 4)
- New: extended address space (up to 1023 devices); two-byte address frame starting with 11110xx
- Circuit: `i2c_addr10_tx` — master encodes 10-bit address: first byte = 11110 + addr[9:8] + R/W; second byte = addr[7:0]
- Ports: `clk, rst, send, addr[9:0], rw (in); scl, sda (inout wire); busy, done (out)`
- Testbench: send 10-bit address 0x1B3 (R/W=0); verify first byte = 8'b11110_11_0, second byte = 8'hB3
- Expected: `PASS  first address byte correct`, `PASS  second address byte correct`, `10-bit address works!`

**L2 — SMBus Alert Line** (Tier 4)
- New: SMBALERT# — shared open-drain interrupt; Alert Response Address (ARA=0x0C) lets master identify alerting slave
- Circuit: `i2c_smbalert` — slave asserts alert_out (open-drain); master detects low on SMBALERT# line and issues ARA read; slave returns MY_ADDR
- Real use: battery management ICs (BQ series), temperature sensors (LM75) use this pattern
- Ports: `clk, rst, alert_trigger (in); alert_out (inout wire); scl, sda (inout wire); parameter MY_ADDR = 7'h48`
- Logic: alert_out = alert_active ? 1'b0 : 1'bz; on ARA read return MY_ADDR
- Testbench: slave asserts alert; master detects and reads ARA; verify correct slave address returned; verify alert cleared
- Expected: `PASS  alert asserted correctly`, `PASS  ARA response matches slave address`, `SMBus alert works!`

**L3 — Portfolio: Full I²C Subsystem** (Tier 5)
- Spec: complete I²C system integrating all previous modules
  - **Master:** arbitrating master (i2c7 L3)
  - **Slave A:** clock-stretching register-file slave at 0x50 (i2c6 L3)
  - **Slave B:** SMBus alert slave at 0x48 (i2c8 L2)
  - **Shared bus:** one `wire scl`, one `wire sda`, `pullup` on both
- Required test scenarios:
  1. Master writes to Slave A (with clock stretching); verify data integrity
  2. Slave B asserts SMBALERT#; master performs ARA; verify alert cleared
  3. Two master models compete; verify arbitration resolves correctly
- Hint: ASCII block diagram showing all sub-modules and shared bus connections; no code
- Expected: `PASS  Slave A write with stretch`, `PASS  SMBus alert resolved`, `PASS  arbitration correct`, `Full I2C subsystem works!`
- Certification: `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'`

---

## Certification milestones

| Certificate | Trigger lesson | Task string to add |
|---|---|---|
| I²C Fundamentals | i2c3 L3 | `'🎓 I²C Fundamentals certificate unlocked — you can transmit and receive I²C bytes'` |
| I²C Design Engineer | i2c8 L3 | `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'` |

---

## Quality checklist — I²C additions

Run the standard CLAUDE.md quality checklist first, then these I²C-specific checks:

```
[ ] inout ports declared correctly (not input/output by mistake)
[ ] SDA/SCL driven with 1'bz (not 1'b1) when releasing the bus
[ ] pullup primitive present in every testbench that uses inout wires
[ ] Testbench wire declared as `wire` (not logic) for inout connections
[ ] No master drives SCL or SDA to 1'b1 — it only releases (1'bz)
[ ] Clock stretch tests verify master actually waits (not just that stretched flag asserts)
[ ] Arbitration test checks both winner and loser behaviour
[ ] 10-bit address tests verify both address bytes independently
[ ] SMBus alert test verifies alert cleared after ARA read
[ ] All PASS/FAIL display strings begin with PASS or FAIL
[ ] i2c course entry in courses.js updated with new module id
```

---

## Voice and tone rules for I²C

- Same rules as CLAUDE.md
- I²C is genuinely hard — open-drain and tristate confuse almost everyone at first. Acknowledge it directly
- Open-drain analogy: "only one person can pull the rope down; everyone else lets go — gravity (the pull-up) brings it back up"
- Clock stretching analogy: "a slow waiter holding up one finger — 'hold on, I'm not ready yet'"
- Arbitration analogy: "two people whispering different words at the same time — the louder sound (zero) wins"
- 10-bit addressing: frame it as "the same I²C protocol, just a longer name tag"
- Every chapter ends with forward momentum: "In the next chapter, you'll use this to build X"
