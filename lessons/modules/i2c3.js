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

    // L2 added next
  ]
});
