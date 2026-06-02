# I²C Design Course — Curriculum Spec (i2c1–i2c8)

This file is read by the `i2c-chapter-builder` and `i2c-orchestrator` agents.
It defines chapter content, tier assignments, and quality guidelines.

---

## ⚡ Beginner-Friendliness Rules (apply to ALL chapters)

These rules were added after reviewing i2c1. Every chapter must follow them:

1. **Start with a real-world hook** — before any code or ports, one paragraph showing where this circuit appears in the physical world (phone charging IC, temperature sensor, OLED display, etc.)
2. **ASCII diagram first** — draw the bus state or waveform in ASCII art before showing any SystemVerilog. Example:
   ```
   SCL:  ‾‾‾‾|__|‾‾‾‾|__|‾‾‾‾
   SDA:  ‾‾‾‾‾‾‾‾|______|‾‾‾‾
             ↑ data stable here
   ```
3. **One analogy per new concept** — never introduce a new hardware idea without a physical analogy first.
4. **"Before you code" paragraph** — immediately before the port table, add a short paragraph in plain English describing what the circuit does as if explaining to someone who has never seen hardware code.
5. **Port table with plain-English column** — the "Purpose" column must read as a complete sentence a non-engineer could understand, not a terse abbreviation.
6. **Never start theory with definitions** — start with *why this exists* and *what problem it solves* before explaining *what it is*.
7. **Difficulty calibration** — i2c1 is truly beginner (someone who just finished msv1). Each chapter adds ONE new concept on top of the last. Never jump more than one complexity level between lessons.

---

## Curriculum State

| # | Module ID | Title | Lessons | Tier | Status |
|---|---|---|---|---|---|
| 1 | `i2c1` | I²C Fundamentals | L1 Open-Drain IO Cell, L2 START/STOP Detector, L3 Serial Shift Register | 1–2 | ✅ done |
| 2 | `i2c2` | Bit-Banging the Bus | L1 SCL Clock Generator, L2 Data Bit TX, L3 Data Bit RX + Clock Stretch | 2 | ❌ **build this next** |
| 3 | `i2c3` | Byte Transfer | L1 TX Byte FSM, L2 RX Byte + ACK, L3 Combined TX/RX Controller | 2–3 | ❌ |
| 4 | `i2c4` | I²C Controller FSM | L1 Address Phase, L2 Data Phase, L3 Full Master Controller | 3 | ❌ |
| 5 | `i2c5` | I²C Target Device | L1 Address Match, L2 Register Read/Write, L3 Target with IRQ | 3–4 | ❌ |
| 6 | `i2c6` | Register Map & Memory | L1 8-bit Register File, L2 Address Decoder, L3 Auto-increment Pointer | 4 | ❌ |
| 7 | `i2c7` | Multi-Master & Arbitration | L1 Bus Arbitration Logic, L2 Clock Sync, L3 Collision Detect & Retry | 4–5 | ❌ |
| 8 | `i2c8` | I²C Subsystem (Capstone) | L1 Top-level Integration, L2 Verification Plan, L3 Full Subsystem Portfolio | 5 | ❌ |

---

## Tier Assignment

| Chapter | Tier | Notes |
|---|---|---|
| i2c1 | 1–2 | Every line spelled out (L1–L2), structural guidance (L3) |
| i2c2 | 2 | Line markers with concept names, less exact text |
| i2c3 | 2–3 | Structural for FSMs; behaviour spec for L3 |
| i2c4 | 3 | Full FSM — structural guidance throughout |
| i2c5 | 3–4 | Target device — behaviour spec for L3 |
| i2c6 | 4 | Behaviour spec throughout |
| i2c7 | 4–5 | Portfolio for L3 |
| i2c8 | 5 | Full capstone — portfolio all three lessons |

---

## Certification Milestones

| Certificate | Trigger lesson | Task string |
|---|---|---|
| I²C Fundamentals | i2c3 L3 | `'🎓 I²C Fundamentals certificate unlocked — you can transmit and receive I²C bytes'` |
| I²C Design Engineer | i2c8 L3 | `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'` |

---

## Chapter Content Guides

### i2c1 — I²C Fundamentals ✅ DONE

**Real-world hook:** Phones use I²C to talk to battery gauges, charging ICs, touchscreens.

**L1: Open-Drain I/O Cell** (Tier 1)
- Module: `i2c_io_cell`
- Ports: `tx_en`, `tx_data` (inputs), `sda` (inout wire), `rx_data` (output)
- ASCII: show rope analogy as signal diagram
- Logic: `assign sda = (tx_en & ~tx_data) ? 1'b0 : 1'bz;`

**L2: START/STOP Detector** (Tier 1)
- Module: `i2c_cond_detect`
- Ports: `clk`, `scl`, `sda` (inputs), `start_det`, `stop_det` (outputs)
- ASCII: show SCL/SDA waveform with START and STOP marked
- Uses 1-clock delay register `sda_d`

**L3: Serial Shift Register** (Tier 2)
- Module: `i2c_rx_shift`
- Ports: `clk`, `rst`, `shift_en`, `sda` (inputs), `byte_out [7:0]` (output)
- Shows byte assembly cycle-by-cycle (trace 0xA5)

---

### i2c2 — Bit-Banging the Bus

**Real-world hook:** Microcontrollers without hardware I²C (like Arduino Uno bit-banging) use this exact pattern to synthesize SCL and SDA in software — now you build it in hardware.

**L1: SCL Clock Generator** (Tier 2)
- Module: `i2c_clk_gen`
- Ports: `clk`, `rst`, `en` (inputs), `scl` (output)
- Parameter: `CLK_DIV = 10` (testbench speed; real I²C uses 250 for 400 kHz from 100 MHz)
- ASCII: show counter → SCL toggle waveform
- Logic: counter counts to CLK_DIV/2-1, toggles SCL
- Before-you-code: "This is a frequency divider — it takes a fast clock and outputs a slower one that becomes the I²C bus clock."

**L2: Data Bit Transmitter** (Tier 2)
- Module: `i2c_bit_tx`
- Ports: `clk`, `rst`, `scl`, `tx_data` (inputs), `sda_out` (output)
- I²C timing rule: SDA must only change when SCL is LOW
- ASCII: show setup/hold around SCL rising edge
- Logic: latch `tx_data` on SCL falling edge; drive `sda_out` as open-drain

**L3: Data Bit Receiver + Clock Stretch** (Tier 2)
- Module: `i2c_bit_rx`
- Ports: `clk`, `rst`, `scl` (inout wire), `sda` (inout wire), `rx_data` (output), `stretch` (input)
- Sample SDA on SCL rising edge
- Clock stretching: when `stretch=1`, hold SCL low (drive it 0) to pause the master
- Testbench: verifies rx_data captures SDA on rising SCL edge

---

### i2c3 — Byte Transfer

**Real-world hook:** When you write a temperature value to an EEPROM over I²C, this is the byte layer that moves your 8-bit value across the wire.

**L1: TX Byte FSM** (Tier 2–3)
- Module: `i2c_tx_byte`
- Ports: `clk`, `rst`, `start`, `data [7:0]`, `scl` (inputs); `sda_out`, `busy`, `done` (outputs)
- States: IDLE → LOAD → SHIFT (8x) → ACK_WAIT → DONE
- ASCII state diagram required in theory
- Shifts MSB first on each SCL falling edge

**L2: RX Byte + ACK** (Tier 3)
- Module: `i2c_rx_byte`
- Ports: `clk`, `rst`, `scl`, `sda` (inputs), `send_ack` (input); `byte_out [7:0]`, `valid` (outputs)
- Accumulate 8 bits via shift register; on 9th clock drive ACK (SDA=0) or NACK (release)
- `valid` pulses 1 when byte is complete

**L3: Combined TX/RX Controller** (Tier 3) — **I²C Fundamentals certificate here**
- Module: `i2c_byte_ctrl`
- `mode` input: 0=TX, 1=RX
- Integrates tx_byte and rx_byte into unified interface
- Add certificate task

---

### i2c4 — I²C Controller FSM

**Real-world hook:** Every I²C master driver in Linux ultimately reduces to this state machine — START, address, R/W, data bytes, STOP.

**L1: Address Phase** (Tier 3)
- Module: `i2c_addr_phase`
- Generates START, shifts out 7-bit address + R/W bit, listens for ACK on 9th clock
- Outputs: `addr_ack`, `done`
- ASCII: full address frame timing diagram

**L2: Data Phase** (Tier 3)
- Module: `i2c_data_phase`
- Handles N-byte TX or RX after address phase
- `byte_count` parameter
- Internally instantiates `i2c_byte_ctrl`

**L3: Full Master Controller** (Tier 3)
- Module: `i2c_master`
- Top-level FSM: IDLE → START → ADDR → DATA[N] → STOP → IDLE
- Ports: `clk`, `rst`, `sda` (inout), `scl` (inout), `addr [6:0]`, `rw`, `data_in [7:0]`, `data_out [7:0]`, `start`, `done`, `busy`, `ack_err`

---

### i2c5 — I²C Target Device

**Real-world hook:** The temperature sensor or EEPROM on the other side of the bus — this is how it listens and responds.

**L1: Address Match** (Tier 3–4)
- Module: `i2c_addr_match`
- Detects START, shifts in 8 bits, compares to `MY_ADDR [6:0]` parameter
- Output: `selected`, `rw_bit`

**L2: Register Read/Write** (Tier 4)
- Module: `i2c_target_reg`
- 8 internal 8-bit registers at addresses 0x00–0x07
- Write: latch data to `regs[addr]`; Read: shift out `regs[addr]`

**L3: Target with IRQ** (Tier 4)
- Module: `i2c_target`
- Full target: address match + register file + interrupt
- `irq` goes high when a register crosses a threshold (parameter)

---

### i2c6 — Register Map & Memory

**Real-world hook:** Every chip datasheet has a register map. This is how you build one in hardware — the same pattern used in real ASIC peripheral blocks.

**L1: 8-bit Register File** (Tier 4)
- Module: `i2c_regfile`
- 16×8-bit registers, synchronous write, combinational read

**L2: Address Decoder** (Tier 4)
- Module: `i2c_addr_decode`
- Maps I²C register addresses to internal peripheral selects
- Parameterised base address

**L3: Auto-increment Pointer** (Tier 4)
- Module: `i2c_autoincr`
- Internal pointer increments after each byte access
- Enables burst reads/writes without re-sending address

---

### i2c7 — Multi-Master & Arbitration

**Real-world hook:** Modern SoCs have multiple CPUs. Both may try to use I²C at the same moment — arbitration decides who wins without corrupting the bus.

**L1: Bus Arbitration Logic** (Tier 4–5)
- Module: `i2c_arbitrate`
- If SDA driven = 1 but observed SDA = 0, another master won → `arb_lost` pulse

**L2: Clock Synchronisation** (Tier 4–5)
- Module: `i2c_clk_sync`
- Wired-AND of N masters' SCL outputs; slowest master stretches clock

**L3: Collision Detect & Retry** (Tier 5 — portfolio)
- Module: `i2c_multi_master`
- Integrates arbitration + clock sync + exponential back-off counter

---

### i2c8 — I²C Subsystem (Capstone) — **I²C Design Engineer certificate here**

**Real-world hook:** This is a real interview project at hardware companies. "Build a complete I²C subsystem with master, target, and register file" appears verbatim in hardware engineer job specs.

**L1: Top-Level Integration** (Tier 5)
- Module: `i2c_subsystem`
- Integrates master, target, register file, arbitration on a shared SDA/SCL bus
- Design starter: ASCII block diagram comment only

**L2: Verification Plan** (Tier 5)
- Module: `i2c_subsystem_tb`
- Test scenarios: write→read-back, NACK on bad address, arbitration
- Hint: list of scenarios, NO code

**L3: Full Subsystem Portfolio** (Tier 5)
- Add certificate task
- Forward: "You now understand the complete I²C protocol from hardware primitives to multi-master systems."
