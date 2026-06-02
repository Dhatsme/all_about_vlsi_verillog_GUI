(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c4',
  title: 'I²C Controller FSM',
  icon: '\u{1F5FA}',
  level: 'intermediate',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Address Phase  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c4l1',
      title: 'L1 — Address Phase',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>Every I²C master driver in Linux — whether it talks to a temperature sensor, an OLED display, or a battery fuel gauge — starts a transaction the same way: it broadcasts a 7-bit device address and a Read/Write direction bit, then waits to see whether any device pulls SDA low to acknowledge. The module you are about to build is the hardware that performs exactly this address phase.</p>

<h2>The address frame on the wire</h2>
<pre class="code-block">SCL:  ___|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|___
SDA:  &#x203e;&#x203e;&#x203e;|_   A6  A5  A4  A3  A2  A1  A0  R/W  ACK
      START ^                                       ^
                                              9th clock: slave pulls SDA=0 to ACK</pre>

<p>The sequence is:</p>
<ul>
  <li><strong>START</strong>: SDA falls while SCL is high — signals the bus that a transaction is beginning.</li>
  <li><strong>7 address bits</strong> (A6 down to A0): clocked out MSB-first, one bit per SCL cycle, changing on SCL falling edge.</li>
  <li><strong>R/W bit</strong>: 0 = master wants to write, 1 = master wants to read.</li>
  <li><strong>ACK</strong>: on the 9th SCL clock, the addressed slave drives SDA low. If no slave responds, SDA stays high (NACK).</li>
</ul>

<h2>The FSM that drives the address phase</h2>
<p>Think of the state machine as a stage manager calling cues. It moves through four well-defined scenes: generate the START condition, shift out 8 bits (7 address + R/W), sample the ACK, and declare done. The stage manager never skips a cue or repeats one.</p>

<pre class="code-block">// State encoding (do NOT copy verbatim — write the full module yourself)
typedef enum logic [1:0] {
  IDLE, START, SHIFT, ACK_WAIT
} state_t;

// Inside always_ff: on SCL falling edge advance the shift register
// sda_out &lt;= frame[7];   // MSB first
// frame   &lt;= {frame[6:0], 1'b0};  // shift left</pre>

<table class="truth-table">
  <tr><th>State</th><th>Action on entry</th><th>Next state trigger</th></tr>
  <tr><td>IDLE</td><td>SDA released, SCL released</td><td><code>start</code> input goes high</td></tr>
  <tr><td>START</td><td>Drive SDA low while SCL high (START condition)</td><td>After SCL falls: enter SHIFT</td></tr>
  <tr><td>SHIFT</td><td>Clock out frame[7:0] MSB-first, decrement bit counter</td><td>bit_cnt reaches 0</td></tr>
  <tr><td>ACK_WAIT</td><td>Release SDA; sample SDA on SCL rising edge</td><td>Always: capture ack, move to IDLE, assert done</td></tr>
</table>

<h2>Before you code</h2>
<p>What you are about to build is a state machine that drives the first nine clock cycles of every I²C transaction. It receives a 7-bit address and an R/W flag, assembles them into an 8-bit frame, clocks them out MSB-first onto <code>sda_out</code>, and then releases the line to let a slave pull it low as an acknowledgement. When the ACK window closes the module asserts <code>done</code> and records whether the slave acknowledged (<code>addr_ack</code>).</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock that drives all flip-flops inside the module.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — when low, the FSM returns to IDLE and all outputs clear.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulse high for one cycle to kick off a new address phase.</td></tr>
  <tr><td><code>addr</code></td><td>input logic [6:0]</td><td>The 7-bit I²C device address to broadcast on the bus.</td></tr>
  <tr><td><code>rw</code></td><td>input logic</td><td>Direction bit: 0 = write to the slave, 1 = read from the slave.</td></tr>
  <tr><td><code>scl_fall</code></td><td>input logic</td><td>Single-cycle pulse marking each SCL falling edge — use this to advance the shift register.</td></tr>
  <tr><td><code>scl_rise</code></td><td>input logic</td><td>Single-cycle pulse marking each SCL rising edge — use this to sample the ACK bit.</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>The current value read from the SDA bus line (used to detect the slave ACK).</td></tr>
  <tr><td><code>sda_out</code></td><td>output logic</td><td>What this module drives onto SDA: 0 to pull low, 1 to release (open-drain convention).</td></tr>
  <tr><td><code>addr_ack</code></td><td>output logic</td><td>Set to 1 when the slave acknowledged (SDA=0 during the 9th clock); 0 if no slave responded.</td></tr>
  <tr><td><code>done</code></td><td>output logic</td><td>Pulses high for one cycle after the ACK window closes to signal the address phase is complete.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_addr_phase with all eleven ports listed in the port table.',
        'Define a state type: typedef enum logic [1:0] { IDLE, START, SHIFT, ACK_WAIT } state_t;',
        'Declare state register (state_t state), an 8-bit shift register (frame), and a 3-bit bit counter (bit_cnt).',
        'Write the always_ff block: on !rst clear state, frame, bit_cnt, sda_out, addr_ack, done.',
        'In IDLE: when start=1, load frame <= {addr, rw} and move to START state.',
        'In START: assert sda_out=0 (START condition); on scl_fall move to SHIFT with bit_cnt=7.',
        'In SHIFT: on scl_fall output frame[7] to sda_out, shift frame left, decrement bit_cnt; when bit_cnt==0 move to ACK_WAIT.',
        'In ACK_WAIT: release sda_out=1; on scl_rise sample addr_ack <= ~sda_in; assert done=1; return to IDLE.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_addr_phase (
  input  logic       clk,
  input  logic       rst,       // synchronous active-low reset
  input  logic       start,     // pulse: begin address phase
  input  logic [6:0] addr,      // 7-bit device address
  input  logic       rw,        // 0=write, 1=read
  input  logic       scl_fall,  // pulse on each SCL falling edge
  input  logic       scl_rise,  // pulse on each SCL rising edge
  input  logic       sda_in,    // bus SDA value (for ACK sampling)
  output logic       sda_out,   // drive: 0=pull low, 1=release
  output logic       addr_ack,  // 1 if slave acknowledged
  output logic       done       // pulses 1 when phase complete
);

  typedef enum logic [1:0] {
    IDLE, START, SHIFT, ACK_WAIT
  } state_t;

  state_t      state;
  logic [7:0]  frame;    // {addr[6:0], rw} assembled for shifting
  logic [2:0]  bit_cnt;  // counts 7 down to 0

  always_ff @(posedge clk) begin
    done <= 0;  // default: done is a one-cycle pulse

    if (!rst) begin
      state    <= IDLE;
      frame    <= 8'b0;
      bit_cnt  <= 3'd0;
      sda_out  <= 1;   // release
      addr_ack <= 0;
      done     <= 0;
    end else begin
      case (state)

        IDLE: begin
          sda_out <= 1;       // bus released
          if (start) begin
            frame <= {addr, rw};   // pack the 8-bit address frame
            state <= START;
          end
        end

        START: begin
          sda_out <= 0;       // pull SDA low while SCL is still high -> START
          if (scl_fall) begin
            bit_cnt <= 3'd7;  // prepare to shift 8 bits (indices 7..0)
            state   <= SHIFT;
          end
        end

        SHIFT: begin
          if (scl_fall) begin
            sda_out <= frame[7];          // output MSB
            frame   <= {frame[6:0], 1'b0}; // shift left
            if (bit_cnt == 3'd0)
              state <= ACK_WAIT;
            else
              bit_cnt <= bit_cnt - 1'd1;
          end
        end

        ACK_WAIT: begin
          sda_out <= 1;   // release SDA for slave to drive ACK
          if (scl_rise) begin
            addr_ack <= ~sda_in;  // SDA=0 -> slave ACKed
            done     <= 1;
            state    <= IDLE;
          end
        end

      endcase
    end
  end

endmodule`,
      design:
`// Type the i2c_addr_phase module here. See Theory for the FSM states.
//
// Ports: clk, rst, start, addr[6:0], rw, scl_fall, scl_rise,
//        sda_in (inputs); sda_out, addr_ack, done (outputs)
//
// Internals: state_t state, logic [7:0] frame, logic [2:0] bit_cnt
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, rw, scl_fall, scl_rise, sda_in;
  logic [6:0] addr;
  logic       sda_out, addr_ack, done;

  i2c_addr_phase dut (
    .clk(clk), .rst(rst), .start(start),
    .addr(addr), .rw(rw),
    .scl_fall(scl_fall), .scl_rise(scl_rise),
    .sda_in(sda_in),
    .sda_out(sda_out), .addr_ack(addr_ack), .done(done)
  );

  // Helper: apply one SCL cycle (fall then rise)
  task automatic scl_cycle;
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
  endtask

  // Helper: run 8 SHIFT clocks and 1 ACK clock
  task automatic run_addr(input logic ack_driven);
    integer i;
    logic [7:0] expected_frame;
    expected_frame = {addr, rw};
    // START state: one scl_fall to enter SHIFT
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    // 8 SHIFT clocks (bit 7 down to 0)
    for (i = 0; i < 8; i++) begin
      scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
      @(posedge clk); #1;
    end
    // ACK_WAIT: one scl_rise; slave drives sda_in
    sda_in   = ~ack_driven;   // 0=ACK, 1=NACK
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== I2C Address Phase Test ===");
    rst = 0; start = 0; scl_fall = 0; scl_rise = 0;
    sda_in = 1; addr = 7'h4A; rw = 0;
    repeat(3) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // Test 1: reset state — FSM should be idle, sda_out released
    if (sda_out === 1 && done === 0)
      \$display("PASS  reset: sda_out=1 done=0");
    else
      \$display("FAIL  reset: sda_out=%0b done=%0b", sda_out, done);

    // Test 2: start pulse loads frame and enters START state
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    if (sda_out === 0)
      \$display("PASS  START: sda_out pulled low");
    else
      \$display("FAIL  START: sda_out=%0b (expected 0)", sda_out);

    // Test 3: run address phase with slave ACK
    run_addr(1);  // slave ACKs (sda_in=0)
    if (done === 1 && addr_ack === 1)
      \$display("PASS  ACK: done=1 addr_ack=1");
    else
      \$display("FAIL  ACK: done=%0b addr_ack=%0b", done, addr_ack);

    // Test 4: run again with NACK
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    run_addr(0);  // no slave (sda_in=1 -> NACK)
    if (done === 1 && addr_ack === 0)
      \$display("PASS  NACK: done=1 addr_ack=0");
    else
      \$display("FAIL  NACK: done=%0b addr_ack=%0b", done, addr_ack);

    \$display("Address phase works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: sda_out=1 done=0',
        'PASS  START: sda_out pulled low',
        'PASS  ACK: done=1 addr_ack=1',
        'PASS  NACK: done=1 addr_ack=0',
        'Address phase works!'
      ]
    },

    // L2 added next
  ]
});
