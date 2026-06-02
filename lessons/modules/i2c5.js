(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c5',
  title: 'I²C Target Device',
  icon: '\u{1F4E1}',
  level: 'intermediate',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Address Match  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c5l1',
      title: 'L1 — Address Match',
      theory: `
<h2>The chip on the other side of the bus</h2>
<p>Every I²C bus has a master (the one who starts transactions) and one or more targets (formerly called slaves). A temperature sensor, an EEPROM, an accelerometer — these are all targets. When the master wants to talk to the temperature sensor it broadcasts a 7-bit address followed by a Read/Write bit. Every target on the bus hears this broadcast. Only the target whose address matches should respond. This lesson builds that address-match detector — the front door of every I²C target chip.</p>

<pre class="code-block">I2C frame after START:
  Bit:  7   6   5   4   3   2   1   0
  SDA:  A6  A5  A4  A3  A2  A1  A0  R/W
        |___________________________|  |
                  7-bit address        R=1/W=0

  After 8 bits the master releases SDA.
  The matching target pulls SDA LOW for one clock = ACK.
  Non-matching targets do nothing (SDA stays HIGH = NACK).</pre>

<h2>Shifting in the address byte</h2>
<p>Think of it like a combination lock: the cylinder turns one notch per bit. After eight turns you check whether the number showing matches your combination. The hardware equivalent is a shift register that fills up over eight SCL cycles, then a comparator that checks whether bits [7:1] match the chip's own address.</p>
<pre class="code-block">// Sample SDA on each rising SCL edge
always_ff @(posedge clk) begin
  if (scl_rise)
    shift_reg &lt;= {shift_reg[6:0], sda};
end
// After 8 bits: compare top 7 bits to MY_ADDR
assign matched = (bit_cnt === 3'd7) &amp;&amp;
                 (shift_reg[7:1] === MY_ADDR);</pre>

<h2>What happens on a match</h2>
<p>When the address matches, the target must acknowledge: it drives SDA low on the 9th SCL cycle. The R/W bit (bit 0 of the received byte) is captured separately so the master can switch to read mode if needed.</p>

<table class="truth-table">
  <tr><th>Condition</th><th>selected</th><th>rw_bit</th><th>Bus action</th></tr>
  <tr><td>Address matches MY_ADDR, R/W=0</td><td>1</td><td>0</td><td>Target ACKs, prepares to receive data</td></tr>
  <tr><td>Address matches MY_ADDR, R/W=1</td><td>1</td><td>1</td><td>Target ACKs, prepares to send data</td></tr>
  <tr><td>Address does not match</td><td>0</td><td>&times;</td><td>Target stays silent (NACK)</td></tr>
</table>

<h2>Before you code</h2>
<p>You are about to build a target address-match detector. It listens on the SCL and SDA lines after a START condition, shifts in 8 bits (MSB first), then asserts <code>selected</code> for one cycle when the received address equals the parameter <code>MY_ADDR</code>. It also captures the R/W bit. No ACK driving yet — that comes in L2. This module is purely a listener and classifier.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock used to sample SCL and SDA edges.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; clears shift register and bit counter.</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock from the master; rising edge is when SDA is sampled.</td></tr>
  <tr><td><code>sda</code></td><td>input logic</td><td>I²C data line; read on each rising SCL edge.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulses high for one cycle when a START condition has been detected (from i2c_cond_detect).</td></tr>
  <tr><td><code>selected</code></td><td>output logic</td><td>Goes high for one clock cycle when the received 7-bit address equals MY_ADDR.</td></tr>
  <tr><td><code>rw_bit</code></td><td>output logic</td><td>Captures bit 0 of the address byte: 0 = master wants to write, 1 = master wants to read.</td></tr>
</table>

<p>Parameter: <code>MY_ADDR [6:0]</code> — the 7-bit address this target claims on the bus.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the module with parameter MY_ADDR and all 7 ports listed in the port table',
        'Declare internal signals: logic [7:0] shift_reg, logic [2:0] bit_cnt, logic scl_d (SCL delayed one cycle for edge detection), logic active (set by start, cleared after 8 bits)',
        'Write an always_ff block to detect the SCL rising edge: scl_d <= scl; scl_rise = scl && !scl_d',
        'Write an always_ff block: on start pulse, reset bit_cnt and set active=1',
        'Inside the active block: on each scl_rise, shift SDA into shift_reg MSB-first and increment bit_cnt',
        'When bit_cnt reaches 8 (after 8 rising edges), assert selected if shift_reg[7:1] === MY_ADDR, capture rw_bit = shift_reg[0], then clear active',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_addr_match #(
  parameter logic [6:0] MY_ADDR = 7'h3C
)(
  input  logic clk,
  input  logic rst,
  input  logic scl,
  input  logic sda,
  input  logic start,
  output logic selected,
  output logic rw_bit
);
  logic [7:0] shift_reg;
  logic [3:0] bit_cnt;   // 0..8
  logic       scl_d;     // SCL delayed one cycle
  logic       scl_rise;  // SCL rising-edge strobe
  logic       active;    // 1 while receiving address bits

  always_ff @(posedge clk) begin
    scl_d <= scl;
  end

  assign scl_rise = scl & ~scl_d;  // combinational edge detect

  always_ff @(posedge clk) begin
    if (!rst) begin
      shift_reg <= 8'b0;
      bit_cnt   <= 4'd0;
      active    <= 1'b0;
      selected  <= 1'b0;
      rw_bit    <= 1'b0;
    end else begin
      selected <= 1'b0;   // default: deassert each cycle

      if (start) begin    // START condition resets the receiver
        bit_cnt  <= 4'd0;
        active   <= 1'b1;
        shift_reg <= 8'b0;
      end else if (active && scl_rise) begin
        shift_reg <= {shift_reg[6:0], sda};  // MSB first
        bit_cnt   <= bit_cnt + 1;
        if (bit_cnt === 4'd7) begin           // 8th rising edge (bits 0..7)
          active   <= 1'b0;
          // After the shift on this edge: shift_reg[7:1] = address, [0] = R/W
          selected <= ({shift_reg[5:0], sda} >> 1) === MY_ADDR[5:0] &&
                      shift_reg[6] === MY_ADDR[6];
          // simpler: compare after full shift is complete next cycle
        end
      end

      // Capture outputs one cycle after last shift
      if (!active && bit_cnt === 4'd8) begin
        selected <= (shift_reg[7:1] === MY_ADDR);
        rw_bit   <= shift_reg[0];
        bit_cnt  <= 4'd9;  // prevent repeated assertion
      end
    end
  end

endmodule`,
      design:
`// Type the i2c_addr_match module here. See Theory for the concept.
//
// Ports: clk, rst, scl, sda, start (inputs); selected, rw_bit (outputs)
// Parameter: MY_ADDR [6:0]  -- the 7-bit address this target owns
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, scl, sda, start_i;
  logic selected, rw_bit;

  // Use default address 0x3C = 7'b011_1100
  i2c_addr_match #(.MY_ADDR(7'h3C)) dut (
    .clk(clk), .rst(rst), .scl(scl), .sda(sda),
    .start(start_i), .selected(selected), .rw_bit(rw_bit)
  );

  // Task: clock in one bit on rising SCL edge
  task automatic send_bit(input logic b);
    sda = b; scl = 0;
    @(posedge clk); #1;
    scl = 1;
    @(posedge clk); #1;
    scl = 0;
    @(posedge clk); #1;
  endtask

  // Task: send a full 8-bit address+RW byte and wait for selected pulse
  task automatic send_addr(input logic [6:0] addr, input logic rw,
                            output logic sel, output logic rwb);
    integer i;
    start_i = 1; @(posedge clk); #1;
    start_i = 0;
    // 7 address bits MSB first, then R/W
    for (i = 6; i >= 0; i--) send_bit(addr[i]);
    send_bit(rw);
    // Allow one extra cycle for registered output
    @(posedge clk); #1;
    @(posedge clk); #1;
    sel = selected;
    rwb = rw_bit;
  endtask

  logic sel_out, rw_out;

  initial begin
    \$display("=== I2C Address Match Test ===");
    rst = 0; scl = 0; sda = 1; start_i = 0;
    repeat(3) @(posedge clk); #1;
    rst = 1;

    // Test 1: correct address 0x3C, write (R/W=0)
    send_addr(7'h3C, 1'b0, sel_out, rw_out);
    if (sel_out === 1'b1 && rw_out === 1'b0)
      \$display("PASS  addr=0x3C W: selected=%0b rw_bit=%0b", sel_out, rw_out);
    else
      \$display("FAIL  addr=0x3C W: selected=%0b rw_bit=%0b", sel_out, rw_out);

    // Test 2: correct address 0x3C, read (R/W=1)
    send_addr(7'h3C, 1'b1, sel_out, rw_out);
    if (sel_out === 1'b1 && rw_out === 1'b1)
      \$display("PASS  addr=0x3C R: selected=%0b rw_bit=%0b", sel_out, rw_out);
    else
      \$display("FAIL  addr=0x3C R: selected=%0b rw_bit=%0b", sel_out, rw_out);

    // Test 3: wrong address 0x48
    send_addr(7'h48, 1'b0, sel_out, rw_out);
    if (sel_out === 1'b0)
      \$display("PASS  addr=0x48: not selected (correct)");
    else
      \$display("FAIL  addr=0x48: selected unexpectedly");

    \$display("Address match works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  addr=0x3C W: selected=1 rw_bit=0',
        'PASS  addr=0x3C R: selected=1 rw_bit=1',
        'PASS  addr=0x48: not selected (correct)',
        'Address match works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — Register Read/Write  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c5l2',
      title: 'L2 — Register Read/Write',
      theory: `
<h2>The register file inside every sensor</h2>
<p>When you read a temperature from an I²C sensor (say, a TMP102 or SHT31), you send the sensor's address, then a register number like <code>0x00</code>, then read back 2 bytes. Those registers live in exactly the kind of circuit you are about to build: a small RAM-like block where each address holds one 8-bit value. The master tells you which register it wants by sending a register-address byte first. You then either store the next byte in that register (write) or shift out that register's current value (read).</p>

<pre class="code-block">I2C Write to register 0x02 with value 0xAB:
  [START] [ADDR+W] [ACK] [0x02] [ACK] [0xAB] [ACK] [STOP]
                         ^reg addr    ^data byte

I2C Read from register 0x02:
  [START] [ADDR+W] [ACK] [0x02] [ACK]
  [START] [ADDR+R] [ACK] [0xAB] [NACK] [STOP]
                          ^value shifted out MSB-first</pre>

<h2>Two-phase target behaviour</h2>
<p>Think of it like a post-office window with numbered mailboxes. Phase 1: the customer says the box number (register address byte). Phase 2: they either push a letter in (write data byte) or you pull a letter out (read). The window clerk — your FSM — stays in one state until the next byte arrives.</p>

<table class="truth-table">
  <tr><th>FSM State</th><th>What arrives on SDA</th><th>Action</th></tr>
  <tr><td>IDLE</td><td>START + address match</td><td>Move to RECV_REG</td></tr>
  <tr><td>RECV_REG</td><td>8-bit register address byte</td><td>Latch reg_addr; move to RECV_DATA or SEND_DATA based on rw_bit</td></tr>
  <tr><td>RECV_DATA</td><td>8-bit data byte (write)</td><td>Store byte in regs[reg_addr]; ACK; stay or go IDLE on STOP</td></tr>
  <tr><td>SEND_DATA</td><td>9th clock (ACK from master)</td><td>Shift out regs[reg_addr] MSB-first; go IDLE on NACK or STOP</td></tr>
</table>

<h2>Internal register file</h2>
<pre class="code-block">logic [7:0] regs [0:7];   // 8 registers, each 8 bits wide

// Write path (synchronous):
if (state == RECV_DATA &amp;&amp; byte_done)
  regs[reg_addr] &lt;= rx_byte;

// Read path (combinational):
assign tx_byte = regs[reg_addr];</pre>

<h2>Before you code</h2>
<p>You are about to build an I²C target register block. It receives the address-match signal from L1, then listens for a register-address byte, then either writes an incoming data byte to that register or shifts out the register's current contents. Eight 8-bit registers live at addresses 0x00–0x07. This module does not drive the SDA line itself — it produces a <code>tx_bit</code> that an external open-drain cell would drive, and consumes an <code>rx_bit</code> that an external cell provides.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; clears all registers and FSM state.</td></tr>
  <tr><td><code>selected</code></td><td>input logic</td><td>Comes from i2c_addr_match: pulses high when the address matches this target.</td></tr>
  <tr><td><code>rw_bit</code></td><td>input logic</td><td>0 = master is writing to us; 1 = master wants to read from us.</td></tr>
  <tr><td><code>scl_rise</code></td><td>input logic</td><td>Strobe: one-cycle pulse on every rising SCL edge.</td></tr>
  <tr><td><code>scl_fall</code></td><td>input logic</td><td>Strobe: one-cycle pulse on every falling SCL edge.</td></tr>
  <tr><td><code>rx_bit</code></td><td>input logic</td><td>The bit currently on SDA, sampled by an external cell on scl_rise.</td></tr>
  <tr><td><code>stop</code></td><td>input logic</td><td>Pulses high when a STOP condition is detected; resets FSM to IDLE.</td></tr>
  <tr><td><code>tx_bit</code></td><td>output logic</td><td>The bit this module wants to transmit on SDA during a read phase.</td></tr>
  <tr><td><code>ack_out</code></td><td>output logic</td><td>Drive low (ACK) or release (NACK) on the 9th clock after each byte.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the module i2c_target_reg with all 10 ports listed in the port table',
        'Declare the register file: logic [7:0] regs [0:7]',
        'Declare FSM states using typedef enum: IDLE, RECV_REG, RECV_DATA, SEND_DATA',
        'Declare shift register (logic [7:0] shift_reg), bit counter (logic [3:0] bit_cnt), register address (logic [2:0] reg_addr)',
        'In the IDLE state: on selected pulse, load shift_reg with 0, reset bit_cnt, transition to RECV_REG',
        'In RECV_REG state: on each scl_rise shift rx_bit into shift_reg; after 8 bits latch reg_addr = shift_reg[2:0], assert ack_out=0, then go RECV_DATA or SEND_DATA based on rw_bit',
        'In RECV_DATA state: shift in 8 bits from rx_bit; after 8 bits write shift_reg to regs[reg_addr]; assert ack_out=0; return to IDLE',
        'In SEND_DATA state: on each scl_fall output shift_reg[7] as tx_bit, then shift left; after 8 bits set ack_out=1 (NACK); return to IDLE',
        'On stop pulse in any state: return to IDLE',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_target_reg (
  input  logic clk,
  input  logic rst,
  input  logic selected,
  input  logic rw_bit,
  input  logic scl_rise,
  input  logic scl_fall,
  input  logic rx_bit,
  input  logic stop,
  output logic tx_bit,
  output logic ack_out
);
  typedef enum logic [1:0] {
    IDLE      = 2'd0,
    RECV_REG  = 2'd1,
    RECV_DATA = 2'd2,
    SEND_DATA = 2'd3
  } state_t;

  state_t      state;
  logic [7:0]  regs [0:7];
  logic [7:0]  shift_reg;
  logic [3:0]  bit_cnt;
  logic [2:0]  reg_addr;

  always_ff @(posedge clk) begin
    if (!rst) begin
      state     <= IDLE;
      bit_cnt   <= 4'd0;
      shift_reg <= 8'd0;
      reg_addr  <= 3'd0;
      tx_bit    <= 1'b1;
      ack_out   <= 1'b1;
      // clear registers
      for (int i = 0; i < 8; i++) regs[i] <= 8'd0;
    end else begin
      ack_out <= 1'b1;  // default: NACK / release

      if (stop) begin
        state <= IDLE;
      end else begin
        case (state)
          IDLE: begin
            if (selected) begin
              shift_reg <= 8'd0;
              bit_cnt   <= 4'd0;
              state     <= RECV_REG;
            end
          end

          RECV_REG: begin
            if (scl_rise) begin
              shift_reg <= {shift_reg[6:0], rx_bit};
              bit_cnt   <= bit_cnt + 1;
              if (bit_cnt === 4'd7) begin
                reg_addr <= shift_reg[2:0];  // lower 3 bits = reg index
                ack_out  <= 1'b0;            // ACK the register byte
                bit_cnt  <= 4'd0;
                state    <= rw_bit ? SEND_DATA : RECV_DATA;
                if (rw_bit)
                  shift_reg <= regs[shift_reg[2:0]]; // preload for TX
              end
            end
          end

          RECV_DATA: begin
            if (scl_rise) begin
              shift_reg <= {shift_reg[6:0], rx_bit};
              bit_cnt   <= bit_cnt + 1;
              if (bit_cnt === 4'd7) begin
                regs[reg_addr] <= {shift_reg[6:0], rx_bit};
                ack_out <= 1'b0;  // ACK data byte
                bit_cnt <= 4'd0;
                state   <= IDLE;
              end
            end
          end

          SEND_DATA: begin
            tx_bit <= shift_reg[7];  // drive MSB
            if (scl_fall) begin
              shift_reg <= {shift_reg[6:0], 1'b1};
              bit_cnt   <= bit_cnt + 1;
              if (bit_cnt === 4'd7) begin
                ack_out <= 1'b1;  // NACK after last bit
                state   <= IDLE;
              end
            end
          end
        endcase
      end
    end
  end

endmodule`,
      design:
`// Build the i2c_target_reg module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, selected, rw_bit, scl_rise, scl_fall, rx_bit, stop;
  logic tx_bit, ack_out;

  i2c_target_reg dut (
    .clk(clk), .rst(rst),
    .selected(selected), .rw_bit(rw_bit),
    .scl_rise(scl_rise), .scl_fall(scl_fall),
    .rx_bit(rx_bit), .stop(stop),
    .tx_bit(tx_bit), .ack_out(ack_out)
  );

  // Helper: generate one SCL rise then fall strobe
  task automatic clk_pulse();
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    @(posedge clk); #1;
  endtask

  // Send 8 bits MSB first through rx_bit with clock pulses
  task automatic send_byte(input logic [7:0] data);
    integer i;
    for (i = 7; i >= 0; i--) begin
      rx_bit = data[i];
      clk_pulse();
    end
  endtask

  logic [7:0] rx_byte_collected;
  integer k;

  initial begin
    \$display("=== I2C Target Register Test ===");
    rst = 0; selected = 0; rw_bit = 0;
    scl_rise = 0; scl_fall = 0; rx_bit = 0; stop = 0;
    repeat(3) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // --- Test 1: Write 0xAB to register 2 ---
    \$display("--- Write 0xAB to reg 2 ---");
    selected = 1; rw_bit = 0; @(posedge clk); #1; selected = 0;
    // Send register address byte: 0x02
    send_byte(8'h02);
    @(posedge clk); #1;
    // Send data byte: 0xAB
    send_byte(8'hAB);
    @(posedge clk); #1;
    // ACK should have been asserted
    if (ack_out === 1'b0)
      \$display("PASS  write ACK asserted after data byte");
    else
      \$display("FAIL  write ACK: ack_out=%0b (expected 0)", ack_out);
    stop = 1; @(posedge clk); #1; stop = 0;

    repeat(2) @(posedge clk); #1;

    // --- Test 2: Read register 2 back ---
    \$display("--- Read back reg 2 ---");
    selected = 1; rw_bit = 0; @(posedge clk); #1; selected = 0;
    // Send register address 0x02
    send_byte(8'h02);
    @(posedge clk); #1;
    stop = 1; @(posedge clk); #1; stop = 0;

    // Repeated start with rw_bit=1
    selected = 1; rw_bit = 1; @(posedge clk); #1; selected = 0;
    // Collect 8 bits from tx_bit
    rx_byte_collected = 8'hFF;
    for (k = 7; k >= 0; k--) begin
      @(posedge clk); #1;
      rx_byte_collected[k] = tx_bit;
      clk_pulse();
    end
    if (rx_byte_collected === 8'hAB)
      \$display("PASS  read reg2 = 0x%02h (expected 0xAB)", rx_byte_collected);
    else
      \$display("FAIL  read reg2 = 0x%02h (expected 0xAB)", rx_byte_collected);
    stop = 1; @(posedge clk); #1; stop = 0;

    // --- Test 3: Write 0x55 to register 0 ---
    \$display("--- Write 0x55 to reg 0 ---");
    selected = 1; rw_bit = 0; @(posedge clk); #1; selected = 0;
    send_byte(8'h00);
    @(posedge clk); #1;
    send_byte(8'h55);
    @(posedge clk); #1;
    if (ack_out === 1'b0)
      \$display("PASS  write reg0 ACK asserted");
    else
      \$display("FAIL  write reg0 ACK: ack_out=%0b", ack_out);
    stop = 1; @(posedge clk); #1; stop = 0;

    \$display("Register read/write works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  write ACK asserted after data byte',
        'PASS  read reg2 = 0xab',
        'PASS  write reg0 ACK asserted',
        'Register read/write works!'
      ]
    },

    // L3 added next

  ]
});

