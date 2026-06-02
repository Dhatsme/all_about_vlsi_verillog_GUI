# I²C Design Course — Content Guide (i2c1–i2c8)

This file is the authoritative content spec for the I²C Design course.
The build agent reads it each session to find the next chapter to build.

---

## Curriculum state

| # | Module ID | Title | Lessons | Tier | Status |
|---|---|---|---|---|---|
| 1 | `i2c1` | I²C Fundamentals | L1 Open-Drain IO Cell, L2 START/STOP Detector, L3 Serial Shift Register | 1–2 | ✅ done |
| 2 | `i2c2` | Bit-Banging the Bus | L1 SCL Clock Generator, L2 Data Bit TX, L3 Data Bit RX with Clock Stretch | 2 | ❌ **build this next** |
| 3 | `i2c3` | Byte Transfer | L1 TX Byte FSM, L2 RX Byte + ACK, L3 Combined TX/RX Controller | 2–3 | ❌ |
| 4 | `i2c4` | I²C Controller FSM | L1 Address Phase, L2 Data Phase, L3 Full Master Controller | 3 | ❌ |
| 5 | `i2c5` | I²C Target Device | L1 Address Match, L2 Register Read/Write, L3 Target with IRQ | 3–4 | ❌ |
| 6 | `i2c6` | Register Map & Memory | L1 8-bit Register File, L2 Address Decoder, L3 Auto-increment Pointer | 4 | ❌ |
| 7 | `i2c7` | Multi-Master & Arbitration | L1 Bus Arbitration Logic, L2 Clock Sync, L3 Collision Detect & Retry | 4–5 | ❌ |
| 8 | `i2c8` | I²C Subsystem (Capstone) | L1 Top-level Integration, L2 Verification Plan, L3 Full Subsystem Portfolio | 5 | ❌ |

---

## Tier assignment table

| Chapter | Tier | Rationale |
|---|---|---|
| i2c1 | 1–2 | First chapter — every line spelled out |
| i2c2 | 2 | Line markers, less text |
| i2c3 | 2–3 | Structural guidance for FSM lessons |
| i2c4 | 3 | Full FSM — structural guidance |
| i2c5 | 3–4 | Target device — behaviour spec for L3 |
| i2c6 | 4 | Register map — behaviour spec throughout |
| i2c7 | 4–5 | Arbitration — portfolio for L3 |
| i2c8 | 5 | Capstone — full portfolio |

---

## Certification milestones

| Certificate | Trigger | Task string to add |
|---|---|---|
| I²C Fundamentals | i2c3 L3 | `'🎓 I²C Fundamentals certificate unlocked — you can transmit and receive I²C bytes'` |
| I²C Design Engineer | i2c8 L3 | `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'` |

---

## Chapter content guides

### i2c1 — I²C Fundamentals (DONE)

**L1: Open-Drain I/O Cell** (Tier 1)
- Module: `i2c_io_cell`
- Ports: `tx_en`, `tx_data` (inputs), `sda` (inout wire), `rx_data` (output)
- Logic: `assign sda = (tx_en & ~tx_data) ? 1'b0 : 1'bz; assign rx_data = sda;`
- Testbench: iverilog only — uses `pullup pu(sda)` primitive

**L2: START and STOP Condition Detector** (Tier 1)
- Module: `i2c_cond_detect`
- Ports: `clk`, `scl`, `sda` (inputs), `start_det`, `stop_det` (outputs)
- Internal: `logic sda_d` — one-clock delayed SDA
- Logic: `start_det <= scl & sda_d & ~sda; stop_det <= scl & ~sda_d & sda;`

**L3: Serial Shift Register** (Tier 2)
- Module: `i2c_rx_shift`
- Ports: `clk`, `rst`, `shift_en`, `sda` (inputs), `byte_out [7:0]` (output)
- Logic: `byte_out <= {byte_out[6:0], sda};` on posedge when `shift_en=1`
- Test: shift in 0xA5 = 10100101 MSB-first

---

### i2c2 — Bit-Banging the Bus

**L1: SCL Clock Generator** (Tier 2)
- Module: `i2c_clk_gen`
- Ports: `clk`, `rst`, `en` (inputs), `scl` (output)
- Concept: divide system clock down to I²C bit rate (e.g. 400 kHz from 100 MHz = divide by 250)
- Use a counter: count to `CLK_DIV/2 - 1`, toggle SCL
- Parameter: `CLK_DIV = 10` (for testbench speed)

**L2: Data Bit Transmitter** (Tier 2)
- Module: `i2c_bit_tx`
- Ports: `clk`, `rst`, `scl`, `tx_data`, `tx_en` (inputs), `sda` (inout wire)
- Concept: hold SDA stable while SCL is high (setup/hold timing)
- SDA changes only when SCL is low
- Logic: register `tx_data` on SCL falling edge; drive open-drain

**L3: Data Bit Receiver with Clock Stretch** (Tier 2)
- Module: `i2c_bit_rx`
- Ports: `clk`, `rst`, `scl` (inout wire), `sda` (inout wire), `rx_data` (output), `stretch` (input)
- Concept: sample SDA on rising SCL edge; hold SCL low if `stretch=1` (clock stretching)
- Target device pulls SCL low to pause the master
- Testbench: checks that rx_data captures SDA on SCL rising edge

---

### i2c3 — Byte Transfer

**L1: TX Byte FSM** (Tier 2–3)
- Module: `i2c_tx_byte`
- Ports: `clk`, `rst`, `start`, `data [7:0]`, `scl` (input) (inputs), `sda_out` (output), `busy`, `done` (outputs)
- States: IDLE → LOAD → SHIFT[0..7] → DONE
- Shifts out `data[7]` first on each SCL low-to-high
- FSM Tier 3 structural guidance

**L2: RX Byte + ACK** (Tier 3)
- Module: `i2c_rx_byte`
- Ports: `clk`, `rst`, `scl`, `sda` (inputs), `send_ack` (input), `byte_out [7:0]`, `valid` (outputs)
- Shift register accumulates 8 bits; on 9th clock drives ACK (SDA=0) or NACK (release)
- Testbench: clocks in 8 bits then checks `valid` and `byte_out`

**L3: Combined TX/RX Controller** (Tier 3)
- Module: `i2c_byte_ctrl`
- Wraps tx_byte and rx_byte into a unified controller
- `mode` input selects TX or RX
- `data_in [7:0]` for TX, `data_out [7:0]` for RX
- `start`, `done`, `busy` handshake
- Add certification task: `'🎓 I²C Fundamentals certificate unlocked — you can transmit and receive I²C bytes'`

---

### i2c4 — I²C Controller FSM

**L1: Address Phase** (Tier 3)
- Module: `i2c_addr_phase`
- Generates START, then shifts out 7-bit address + R/W bit
- Listens for ACK on 9th clock
- Outputs: `addr_ack` (1 = target acknowledged), `done`

**L2: Data Phase** (Tier 3)
- Module: `i2c_data_phase`
- Handles multi-byte TX or RX after address phase
- `byte_count` input, loops N times
- Integrates `i2c_byte_ctrl` internally

**L3: Full Master Controller** (Tier 3)
- Module: `i2c_master`
- Top-level: generates START, address phase, data phase(s), STOP
- States: IDLE → START → ADDR → DATA → STOP → IDLE
- Ports: `clk`, `rst`, `sda` (inout), `scl` (inout), `addr [6:0]`, `rw`, `data_in [7:0]`, `data_out [7:0]`, `start`, `done`, `busy`, `ack_err`

---

### i2c5 — I²C Target Device

**L1: Address Match** (Tier 3–4)
- Module: `i2c_addr_match`
- Detects START, shifts in 8 bits, compares to `MY_ADDR` parameter
- Output: `selected`, `rw_bit`

**L2: Register Read/Write** (Tier 4)
- Module: `i2c_target_reg`
- 8 internal 8-bit registers at addresses 0x00–0x07
- On write: latch data to `regs[addr]`
- On read: shift out `regs[addr]`

**L3: Target with IRQ** (Tier 4)
- Module: `i2c_target`
- Full target: address match + register file + interrupt output
- `irq` goes high when a register reaches a threshold (parameter)
- Testbench: master writes to register, checks IRQ fires

---

### i2c6 — Register Map & Memory

**L1: 8-bit Register File** (Tier 4)
- Module: `i2c_regfile`
- 16 × 8-bit registers, synchronous write, combinational read
- Write port: `we`, `waddr [3:0]`, `wdata [7:0]`
- Read port: `raddr [3:0]`, `rdata [7:0]`

**L2: Address Decoder** (Tier 4)
- Module: `i2c_addr_decode`
- Maps I²C register addresses to internal peripheral select signals
- Parameterised base address
- Outputs: `reg_sel [3:0]`, `byte_offset [7:0]`

**L3: Auto-increment Pointer** (Tier 4)
- Module: `i2c_autoincr`
- Internal pointer increments after each byte read/write
- Wraps around at end of register bank
- Enables burst reads/writes without re-sending address

---

### i2c7 — Multi-Master & Arbitration

**L1: Bus Arbitration Logic** (Tier 4–5)
- Module: `i2c_arbitrate`
- Compares SDA being driven vs SDA observed
- If another master is driving 0 while we drive 1: arbitration lost
- Output: `arb_lost` pulse

**L2: Clock Synchronisation** (Tier 4–5)
- Module: `i2c_clk_sync`
- Wired-AND of multiple SCL outputs
- The slowest master stretches SCL (dominant low)
- Parameterised number of masters

**L3: Collision Detect & Retry** (Tier 5 — portfolio)
- Module: `i2c_multi_master`
- Integrates arbitration + clock sync + back-off counter
- On arb_lost: disable output, wait random back-off, retry
- Full portfolio piece

---

### i2c8 — I²C Subsystem (Capstone)

**L1: Top-Level Integration** (Tier 5)
- Module: `i2c_subsystem`
- Integrates: master controller, target device, register file, arbitration
- Shared SDA / SCL bus via inout wires and pullup
- Design starter: block diagram comment + port list only

**L2: Verification Plan** (Tier 5)
- Module: `i2c_subsystem_tb`
- Portfolio testbench: write to target register, read back, verify
- Tests: successful write, successful read, NACK on bad address, arbitration scenario
- No hint code — hint is a list of test scenarios

**L3: Full Subsystem Portfolio** (Tier 5)
- Ties everything together
- Add certification task: `'🎓 I²C Design Engineer certificate unlocked — you built a complete I²C subsystem from scratch'`
- Forward momentum: "You now understand the complete I²C protocol from hardware primitives to multi-master systems. Real silicon ships with exactly this architecture."
