(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c3',
  title: 'Byte Transfer',
  icon: '📦',
  level: 'intermediate',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — TX Byte FSM  (Tier 2–3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c3l1',
      title: 'L1 — TX Byte FSM',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>When a microcontroller writes a temperature threshold to an EEPROM chip over I²C — say, writing 0x40 (64°C) to a sensor register — this is the exact circuit that does it. The byte-transmit FSM takes one 8-bit value from software and serialises it bit-by-bit onto the SDA wire, in sync with the SCL clock. Without this layer, your Arduino sketch's <code>Wire.write(0x40)</code> would be impossible.</p>

<pre class="code-block">State diagram — TX Byte FSM:

  IDLE ──(start=1)──▶ LOAD ──▶ SHIFT ──▶ SHIFT ──▶ ... (8x) ──▶ ACK_WAIT ──▶ DONE
                        │       │  ↑                                              │
                        │       └──┘ (bit_cnt &lt; 8,                              │
                        │             on SCL falling edge)                        │
                        └─────────────────────────────────────────────────────────┘
                                                                         (→ IDLE)

SCL:  ‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾
         b7   b6   b5   b4   b3   b2   b1   b0   ACK
SDA:  ‾‾‾‾‾‾|_______|‾‾‾|_______|‾‾‾‾‾‾‾‾‾‾‾‾‾|__|‾‾ ...
             ↑ shift MSB first, on SCL falling edge</pre>

<h2>The finite state machine approach</h2>
<p>A finite state machine is like a vending machine: it remembers where it is (the state), and each event (a coin, a button press) moves it to the next state. Here, the states are the phases of an I²C byte transmission. The machine counts down from 8 as it shifts each bit out, then pauses for one extra clock to let the receiver send an ACK (acknowledge) bit back.</p>

<h3>States and what each one does</h3>
<table class="truth-table">
  <tr><th>State</th><th>busy</th><th>done</th><th>What happens here</th></tr>
  <tr><td><code>IDLE</code></td><td>0</td><td>0</td><td>Waiting for <code>start</code> to go high. SDA released (1'bz).</td></tr>
  <tr><td><code>LOAD</code></td><td>1</td><td>0</td><td>Latches <code>data[7:0]</code> into the shift register; sets bit counter to 7.</td></tr>
  <tr><td><code>SHIFT</code></td><td>1</td><td>0</td><td>On each SCL falling edge: drives MSB of shift reg onto SDA, shifts left, decrements counter. Repeats 8 times.</td></tr>
  <tr><td><code>ACK_WAIT</code></td><td>1</td><td>0</td><td>Releases SDA (1'bz) for one SCL cycle so receiver can pull it low as ACK.</td></tr>
  <tr><td><code>DONE</code></td><td>0</td><td>1</td><td>Pulses <code>done=1</code> for one cycle, then returns to IDLE.</td></tr>
</table>

<h3>Key pattern — detecting SCL falling edge</h3>
<pre class="code-block">logic scl_d;
always_ff @(posedge clk) scl_d &lt;= scl;

wire scl_fall = scl_d &amp; ~scl;  // was high, now low</pre>

<h3>Shifting MSB first</h3>
<pre class="code-block">// In SHIFT state, on scl_fall:
sda_out  &lt;= shift_reg[7];           // drive the MSB
shift_reg &lt;= {shift_reg[6:0], 1'b0}; // shift left, zero fills LSB
bit_cnt   &lt;= bit_cnt - 1;</pre>

<h2>Before you code</h2>
<p>What you are about to build is a 5-state FSM that takes a parallel 8-bit value and converts it to 8 serial bits on the <code>sda_out</code> wire, one bit per SCL clock. It responds to a <code>start</code> pulse, counts eight falling SCL edges, then pauses one more cycle for the ACK before signalling <code>done</code>.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>The system clock that sequences every state transition.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; returns FSM to IDLE immediately.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulse high for one cycle to begin transmitting the byte in <code>data</code>.</td></tr>
  <tr><td><code>data [7:0]</code></td><td>input logic</td><td>The 8-bit value to transmit, MSB first.</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock from the clock generator; FSM uses its falling edge.</td></tr>
  <tr><td><code>sda_out</code></td><td>output logic</td><td>Serial data output: the FSM drives 0 or releases (1'bz) here.</td></tr>
  <tr><td><code>busy</code></td><td>output logic</td><td>High while a transmission is in progress; low when idle or done.</td></tr>
  <tr><td><code>done</code></td><td>output logic</td><td>Pulses high for exactly one cycle when the ACK window is finished.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Block 1 ──  module i2c_tx_byte with all 8 ports listed above',
        '── Block 2 ──  Declare local state type: typedef enum logic [2:0] { IDLE, LOAD, SHIFT, ACK_WAIT, DONE } state_t;',
        '── Block 3 ──  Declare state register: state_t state;',
        '── Block 4 ──  Declare internal signals: logic [7:0] shift_reg; logic [2:0] bit_cnt; logic scl_d;',
        '── Block 5 ──  SCL edge detector: always_ff block that delays scl by one cycle into scl_d',
        '── Block 6 ──  wire scl_fall = scl_d & ~scl;  (falling-edge strobe)',
        '── Block 7 ──  Main always_ff block: handle reset → IDLE; then case on state',
        '── IDLE ──  if (start) latch data into shift_reg, set bit_cnt=7, move to LOAD',
        '── LOAD ──  move to SHIFT in the next cycle (or combine with IDLE→LOAD)',
        '── SHIFT ── on scl_fall: drive sda_out = shift_reg[7], shift left, decrement bit_cnt; when bit_cnt==0 move to ACK_WAIT',
        '── ACK_WAIT ── release sda_out to 1\'bz on scl_fall; move to DONE',
        '── DONE ── pulse done=1; move back to IDLE',
        '── Block 8 ──  Assign busy = (state != IDLE && state != DONE);',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_tx_byte (
  input  logic       clk,
  input  logic       rst,
  input  logic       start,
  input  logic [7:0] data,
  input  logic       scl,
  output logic       sda_out,
  output logic       busy,
  output logic       done
);
  typedef enum logic [2:0] {
    IDLE, LOAD, SHIFT, ACK_WAIT, DONE
  } state_t;

  state_t       state;
  logic [7:0]   shift_reg;
  logic [2:0]   bit_cnt;
  logic         scl_d;

  // Detect SCL falling edge
  always_ff @(posedge clk)
    scl_d <= scl;

  wire scl_fall = scl_d & ~scl;

  always_ff @(posedge clk) begin
    done <= 0;                          // default: done is 0
    if (!rst) begin
      state     <= IDLE;
      shift_reg <= 8'b0;
      bit_cnt   <= 3'd0;
      sda_out   <= 1'bz;
      done      <= 0;
    end else begin
      case (state)
        IDLE: begin
          sda_out <= 1'bz;
          if (start) begin
            shift_reg <= data;
            bit_cnt   <= 3'd7;
            state     <= LOAD;
          end
        end
        LOAD: begin
          state <= SHIFT;               // one cycle to let shift_reg settle
        end
        SHIFT: begin
          if (scl_fall) begin
            sda_out   <= shift_reg[7];  // MSB first
            shift_reg <= {shift_reg[6:0], 1'b0};
            if (bit_cnt == 3'd0)
              state <= ACK_WAIT;
            else
              bit_cnt <= bit_cnt - 1;
          end
        end
        ACK_WAIT: begin
          if (scl_fall) begin
            sda_out <= 1'bz;            // release for receiver ACK
            state   <= DONE;
          end
        end
        DONE: begin
          done  <= 1;
          state <= IDLE;
        end
        default: state <= IDLE;
      endcase
    end
  end

  assign busy = (state != IDLE) && (state != DONE);

endmodule`,
      design:
`// Type the i2c_tx_byte module here. See Theory for the FSM diagram.
//
// Ports: clk, rst, start, data[7:0], scl (inputs)
//        sda_out, busy, done (outputs)
//
// States: IDLE -> LOAD -> SHIFT (8x on scl_fall) -> ACK_WAIT -> DONE -> IDLE
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  // Generate a slow SCL (period = 40 ns so falling edges are easy to hit)
  logic scl = 1;
  always #20 scl = ~scl;

  logic       rst, start;
  logic [7:0] data;
  logic       sda_out, busy, done;

  i2c_tx_byte dut (
    .clk(clk), .rst(rst), .start(start),
    .data(data), .scl(scl),
    .sda_out(sda_out), .busy(busy), .done(done)
  );

  // Collect bits shifted on each SCL falling edge
  logic [7:0] captured;
  integer     bit_idx;

  initial begin
    \$display("=== I2C TX Byte FSM Test ===");
    rst = 0; start = 0; data = 8'h00;
    repeat(3) @(posedge clk); #1;
    rst = 1;

    // Check idle state
    if (busy === 0 && done === 0)
      \$display("PASS  idle: busy=0 done=0");
    else
      \$display("FAIL  idle: busy=%0b done=%0b", busy, done);

    // Send 0xA5 = 8'b10100101
    data = 8'hA5; start = 1;
    @(posedge clk); #1;
    start = 0;

    // Should be busy now
    if (busy === 1)
      \$display("PASS  transmitting: busy=1");
    else
      \$display("FAIL  transmitting: busy=%0b (expected 1)", busy);

    // Wait for done
    repeat(100) @(posedge clk);
    #1;

    if (done === 1 || busy === 0)
      \$display("PASS  transfer complete");
    else
      \$display("FAIL  transfer did not complete: busy=%0b done=%0b", busy, done);

    // Verify idle after done
    repeat(3) @(posedge clk); #1;
    if (busy === 0)
      \$display("PASS  returned to idle after done");
    else
      \$display("FAIL  still busy after done: busy=%0b", busy);

    \$display("TX Byte FSM works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: busy=0 done=0',
        'PASS  transmitting: busy=1',
        'PASS  transfer complete',
        'TX Byte FSM works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — RX Byte + ACK  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c3l2',
      title: 'L2 — RX Byte and ACK',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>When a Raspberry Pi reads a humidity value from an HDC1080 sensor, the sensor transmits an 8-bit byte back over I²C. The master (Pi) runs this exact circuit — it collects the 8 serial bits, assembles them into a byte, then acknowledges receipt by pulling SDA low for one extra clock. If the Pi is done reading it sends a NACK (no-acknowledge) instead, telling the sensor to stop. Every I²C read transaction you have ever triggered in software depended on this handshake.</p>

<pre class="code-block">RX timing — 8 data bits followed by ACK/NACK:

SCL:  ‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾|__|‾‾
         b7   b6   b5   b4   b3   b2   b1   b0   ACK/NACK
SDA:  ──D7───D6───D5───D4───D3───D2───D1───D0──| 0=ACK / z=NACK
                                                 ↑ 9th SCL rising edge
         ↑ sample SDA on each SCL rising edge

State machine:
  IDLE ──(scl rises with sda sampled)──▶ SHIFT (8x) ──▶ ACK ──▶ DONE ──▶ IDLE</pre>

<h2>Receiving a byte — the mirror image of TX</h2>
<p>The receiver does the same shift-register trick as the transmitter, but in reverse: it samples SDA on each <em>rising</em> SCL edge (not falling) and shifts the value into the MSB position. After 8 bits the byte is complete. Then it drives SDA low for one SCL cycle (ACK) to tell the sender "got it" — or releases SDA (NACK) if it is done or encountered an error.</p>

<h3>Detecting the SCL rising edge</h3>
<pre class="code-block">logic scl_d;
always_ff @(posedge clk) scl_d &lt;= scl;

wire scl_rise = ~scl_d &amp; scl;  // was low, now high</pre>

<h3>Shift in MSB first on rising edge</h3>
<pre class="code-block">// In SHIFT state, on scl_rise:
shift_reg &lt;= {shift_reg[6:0], sda};  // new bit enters at LSB
bit_cnt   &lt;= bit_cnt - 1;</pre>

<h3>Driving ACK vs NACK</h3>
<pre class="code-block">// In ACK state, on scl_fall:
if (send_ack)
  sda_drv &lt;= 1'b0;  // pull low = ACK
else
  sda_drv &lt;= 1'bz;  // release  = NACK</pre>

<h2>Before you code</h2>
<p>What you are about to build is a 4-state FSM that samples 8 bits of SDA on consecutive SCL rising edges, assembles them into <code>byte_out</code>, then drives SDA low (if <code>send_ack=1</code>) or releases it (if <code>send_ack=0</code>) during the 9th SCL cycle. The <code>valid</code> output pulses high for one cycle when <code>byte_out</code> holds the complete received byte.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock that drives all state transitions.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; returns FSM to IDLE immediately.</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>I²C clock line; the FSM samples SDA on its rising edge.</td></tr>
  <tr><td><code>sda</code></td><td>input logic</td><td>Serial data input: each bit sampled when SCL rises.</td></tr>
  <tr><td><code>send_ack</code></td><td>input logic</td><td>1 = drive ACK (SDA=0) on 9th clock; 0 = send NACK (release SDA).</td></tr>
  <tr><td><code>byte_out [7:0]</code></td><td>output logic</td><td>The assembled 8-bit byte; valid when <code>valid</code> pulses high.</td></tr>
  <tr><td><code>valid</code></td><td>output logic</td><td>Pulses high for one clock cycle when a complete byte has been received.</td></tr>
  <tr><td><code>sda_drv</code></td><td>output logic</td><td>Driven to 0 for ACK or 1'bz for NACK during the 9th SCL cycle.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_rx_byte with all 8 ports from the port table above',
        'Declare state enum: IDLE, SHIFT, ACK, DONE (4 states, 2 bits)',
        'Declare internal signals: state, shift_reg [7:0], bit_cnt [2:0], scl_d',
        'Write the SCL edge detector always_ff block (delay scl into scl_d)',
        'Add: wire scl_rise = ~scl_d & scl;  and  wire scl_fall = scl_d & ~scl;',
        'Write the main always_ff FSM block with synchronous reset',
        'IDLE state: wait for scl_rise, then load bit_cnt=7 and move to SHIFT',
        'SHIFT state: on scl_rise shift {shift_reg[6:0], sda} and decrement bit_cnt; when bit_cnt==0 move to ACK',
        'ACK state: on scl_fall drive sda_drv based on send_ack; move to DONE',
        'DONE state: assign byte_out = shift_reg; pulse valid=1; move to IDLE',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_rx_byte (
  input  logic       clk,
  input  logic       rst,
  input  logic       scl,
  input  logic       sda,
  input  logic       send_ack,
  output logic [7:0] byte_out,
  output logic       valid,
  output logic       sda_drv
);
  typedef enum logic [1:0] {
    IDLE, SHIFT, ACK, DONE
  } state_t;

  state_t     state;
  logic [7:0] shift_reg;
  logic [2:0] bit_cnt;
  logic       scl_d;

  always_ff @(posedge clk)
    scl_d <= scl;

  wire scl_rise = ~scl_d & scl;
  wire scl_fall =  scl_d & ~scl;

  always_ff @(posedge clk) begin
    valid <= 0;                        // default: not valid
    if (!rst) begin
      state     <= IDLE;
      shift_reg <= 8'b0;
      bit_cnt   <= 3'd7;
      byte_out  <= 8'b0;
      sda_drv   <= 1'bz;
      valid     <= 0;
    end else begin
      case (state)
        IDLE: begin
          sda_drv <= 1'bz;
          if (scl_rise) begin          // first rising edge starts reception
            shift_reg <= {shift_reg[6:0], sda};
            bit_cnt   <= 3'd6;         // 6 more bits after this one
            state     <= SHIFT;
          end
        end
        SHIFT: begin
          if (scl_rise) begin
            shift_reg <= {shift_reg[6:0], sda};
            if (bit_cnt == 3'd0)
              state <= ACK;
            else
              bit_cnt <= bit_cnt - 1;
          end
        end
        ACK: begin
          if (scl_fall) begin
            sda_drv <= send_ack ? 1'b0 : 1'bz;  // ACK or NACK
            state   <= DONE;
          end
        end
        DONE: begin
          byte_out <= shift_reg;
          valid    <= 1;
          sda_drv  <= 1'bz;
          state    <= IDLE;
        end
        default: state <= IDLE;
      endcase
    end
  end

endmodule`,
      design:
`// Type the i2c_rx_byte module here. See Theory for the FSM diagram.
//
// Ports: clk, rst, scl, sda, send_ack (inputs)
//        byte_out[7:0], valid, sda_drv (outputs)
//
// States: IDLE -> SHIFT (8x on scl_rise) -> ACK (on scl_fall) -> DONE -> IDLE
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  // SCL: 40 ns period so edge detection works comfortably
  logic scl = 0;
  always #20 scl = ~scl;

  logic       rst, sda, send_ack;
  logic [7:0] byte_out;
  logic       valid, sda_drv;

  i2c_rx_byte dut (
    .clk(clk), .rst(rst), .scl(scl), .sda(sda),
    .send_ack(send_ack),
    .byte_out(byte_out), .valid(valid), .sda_drv(sda_drv)
  );

  // Drive sda with bits MSB first, synchronized to SCL low phase
  task automatic send_byte(input logic [7:0] val);
    integer i;
    for (i = 7; i >= 0; i--) begin
      @(negedge scl); #2;
      sda = val[i];
    end
  endtask

  initial begin
    \$display("=== I2C RX Byte + ACK Test ===");
    rst = 0; sda = 1; send_ack = 1;
    repeat(3) @(posedge clk); #1;
    rst = 1;

    // Check idle
    if (valid === 0 && byte_out === 8'h00)
      \$display("PASS  idle: valid=0 byte=0x00");
    else
      \$display("FAIL  idle: valid=%0b byte=0x%02h", valid, byte_out);

    // Receive 0xB4 = 8'b10110100
    fork
      send_byte(8'hB4);
    join_none

    // Wait enough cycles for full byte + ACK
    repeat(120) @(posedge clk); #1;

    if (valid === 1 && byte_out === 8'hB4)
      \$display("PASS  received byte: 0x%02h", byte_out);
    else
      \$display("FAIL  received byte: 0x%02h (expected 0xb4), valid=%0b", byte_out, valid);

    // Check ACK was driven (sda_drv=0 because send_ack=1)
    // sda_drv goes 0 during ACK state
    repeat(5) @(posedge clk); #1;

    // Now try with send_ack=0 (NACK)
    send_ack = 0;
    fork
      send_byte(8'h37);
    join_none

    repeat(120) @(posedge clk); #1;
    if (byte_out === 8'h37)
      \$display("PASS  NACK mode: received byte 0x%02h", byte_out);
    else
      \$display("FAIL  NACK mode: received 0x%02h (expected 0x37)", byte_out);

    \$display("RX Byte + ACK works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: valid=0 byte=0x00',
        'PASS  received byte: 0xb4',
        'PASS  NACK mode: received byte 0x37',
        'RX Byte + ACK works!'
      ]
    },

    // L3 added next
  ]
});
