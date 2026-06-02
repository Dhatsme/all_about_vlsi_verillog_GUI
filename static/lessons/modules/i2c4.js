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

    // ────────────────────────────────────────────────────────────────────
    // L2 — Data Phase  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c4l2',
      title: 'L2 — Data Phase',
      theory: `
<h2>Where this fits in the real world</h2>
<p>After a Linux I²C driver sends the address frame and receives an ACK, it immediately continues with the data phase — writing configuration bytes to a sensor or reading measurement registers back. This module handles exactly that: it moves N bytes across the wire after the address phase has selected the device.</p>

<h2>Data byte timing on the bus</h2>
<pre class="code-block">SCL:  _|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_|&#x203e;|_  ...next byte or STOP
SDA:  D7  D6  D5  D4  D3  D2  D1  D0  ACK
      ^                               ^
   change on SCL fall             9th clock: receiver ACKs</pre>

<p>Each byte follows the same pattern as the address byte: 8 data bits MSB-first, then a 9th clock where the receiver either ACKs (SDA=0) or NACKs (SDA=1). In TX mode the master drives SDA; in RX mode the slave drives SDA and the master releases the line.</p>

<h2>The NACK-on-last-byte rule</h2>
<p>Think of ACK as the receiver saying "I got that, send more." When the master has received the last byte it wants, it deliberately does NOT ACK — it sends a NACK to tell the slave to release the bus. The master then issues a STOP.</p>

<table class="truth-table">
  <tr><th>Byte index</th><th>Master action at 9th clock (RX mode)</th><th>Meaning</th></tr>
  <tr><td>0 … N-2</td><td>Drive SDA=0 (ACK)</td><td>"Keep sending, I'm ready for more"</td></tr>
  <tr><td>N-1 (last)</td><td>Release SDA=1 (NACK)</td><td>"That's enough — I'm done reading"</td></tr>
</table>

<h2>FSM for the data phase</h2>
<pre class="code-block">// States inside i2c_data_phase:
// IDLE  -> BYTE_START -> SHIFT (8x) -> ACK_PHASE -> (loop or DONE)
//
// Key signals to track:
//   byte_cnt : how many bytes remain
//   bit_cnt  : bit index within current byte (7 downto 0)
//   mode     : 0=TX (master drives), 1=RX (master releases, samples)
//   tx_shift : 8-bit shift register for TX
//   rx_shift : 8-bit accumulator for RX</pre>

<h2>Before you code</h2>
<p>What you are about to build handles N consecutive I²C data bytes after the address phase completes. It loops through a four-state inner cycle for each byte: begin, shift 8 bits, handle ACK/NACK, then either start the next byte or assert <code>done</code>. The <code>byte_count</code> parameter tells the FSM how many bytes to process. In TX mode it shifts <code>tx_data</code> out MSB-first and listens for ACK; in RX mode it accumulates incoming bits and drives ACK after each byte except the last.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock driving all state registers.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; returns FSM to IDLE.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulse high to begin the data phase (connected to addr_phase done output).</td></tr>
  <tr><td><code>mode</code></td><td>input logic</td><td>0 = transmit (master drives SDA), 1 = receive (master samples SDA).</td></tr>
  <tr><td><code>tx_data</code></td><td>input logic [7:0]</td><td>The byte the master wants to send in TX mode.</td></tr>
  <tr><td><code>byte_count</code></td><td>input logic [3:0]</td><td>Total number of data bytes to transfer (1–15).</td></tr>
  <tr><td><code>scl_fall</code></td><td>input logic</td><td>One-cycle pulse on each SCL falling edge — advance the shift register here.</td></tr>
  <tr><td><code>scl_rise</code></td><td>input logic</td><td>One-cycle pulse on each SCL rising edge — sample SDA here in RX mode.</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>Current SDA bus value; used to receive bits and detect ACK.</td></tr>
  <tr><td><code>sda_out</code></td><td>output logic</td><td>What this module drives onto SDA (open-drain convention: 1=release, 0=pull low).</td></tr>
  <tr><td><code>rx_data</code></td><td>output logic [7:0]</td><td>Last byte received from the slave (valid when byte_done pulses).</td></tr>
  <tr><td><code>byte_done</code></td><td>output logic</td><td>Pulses high for one cycle each time a full byte has been transferred.</td></tr>
  <tr><td><code>data_ack</code></td><td>output logic</td><td>1 if the last TX byte was acknowledged by the slave; 0 if NACK.</td></tr>
  <tr><td><code>done</code></td><td>output logic</td><td>Pulses high when all byte_count bytes have been transferred.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_data_phase with all thirteen ports in the port table.',
        'Define a state type: typedef enum logic [1:0] { IDLE, SHIFT, ACK_PHASE, DONE_ST } state_t;',
        'Declare: state_t state; logic [7:0] tx_shift, rx_shift; logic [2:0] bit_cnt; logic [3:0] bytes_left;',
        'Write the always_ff block: on !rst clear all registers, release sda_out, clear done and byte_done.',
        'In IDLE: when start=1 load tx_shift <= tx_data, bytes_left <= byte_count, bit_cnt <= 7; enter SHIFT.',
        'In SHIFT: on scl_fall — if mode=0 drive sda_out <= tx_shift[7] and shift left; if mode=1 sample rx_shift on scl_rise instead. Decrement bit_cnt; when bit_cnt==0 enter ACK_PHASE.',
        'In ACK_PHASE: if mode=0 (TX) release sda_out=1 and on scl_rise capture data_ack <= ~sda_in; if mode=1 (RX) drive ACK unless it is the last byte (NACK on last). After ACK: if bytes_left>1 decrement and loop back to SHIFT; else assert done.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_data_phase (
  input  logic       clk,
  input  logic       rst,         // synchronous active-low reset
  input  logic       start,       // begin data phase
  input  logic       mode,        // 0=TX, 1=RX
  input  logic [7:0] tx_data,     // byte to transmit (TX mode)
  input  logic [3:0] byte_count,  // total bytes to transfer
  input  logic       scl_fall,    // pulse: SCL falling edge
  input  logic       scl_rise,    // pulse: SCL rising edge
  input  logic       sda_in,      // current SDA bus value
  output logic       sda_out,     // driven SDA (1=release, 0=pull low)
  output logic [7:0] rx_data,     // last byte received (RX mode)
  output logic       byte_done,   // pulses when one byte complete
  output logic       data_ack,    // 1 = slave ACKed last TX byte
  output logic       done         // pulses when all bytes done
);

  typedef enum logic [1:0] {
    IDLE, SHIFT, ACK_PHASE, DONE_ST
  } state_t;

  state_t     state;
  logic [7:0] tx_shift;    // working copy of tx byte, shifted
  logic [7:0] rx_shift;    // accumulates received bits
  logic [2:0] bit_cnt;     // bit index within current byte
  logic [3:0] bytes_left;  // bytes still to transfer

  always_ff @(posedge clk) begin
    byte_done <= 0;
    done      <= 0;

    if (!rst) begin
      state      <= IDLE;
      tx_shift   <= 8'b0;
      rx_shift   <= 8'b0;
      bit_cnt    <= 3'd7;
      bytes_left <= 4'd0;
      sda_out    <= 1;
      data_ack   <= 0;
      rx_data    <= 8'b0;
    end else begin
      case (state)

        IDLE: begin
          sda_out <= 1;
          if (start) begin
            tx_shift   <= tx_data;
            bytes_left <= byte_count;
            bit_cnt    <= 3'd7;
            state      <= SHIFT;
          end
        end

        SHIFT: begin
          if (mode == 1'b0) begin
            // TX: drive SDA on falling edge
            if (scl_fall) begin
              sda_out  <= tx_shift[7];
              tx_shift <= {tx_shift[6:0], 1'b0};
              if (bit_cnt == 3'd0)
                state <= ACK_PHASE;
              else
                bit_cnt <= bit_cnt - 1'd1;
            end
          end else begin
            // RX: sample SDA on rising edge
            if (scl_rise) begin
              rx_shift <= {rx_shift[6:0], sda_in};
              if (bit_cnt == 3'd0) begin
                rx_data <= {rx_shift[6:0], sda_in};
                state   <= ACK_PHASE;
              end else
                bit_cnt <= bit_cnt - 1'd1;
            end
          end
        end

        ACK_PHASE: begin
          if (mode == 1'b0) begin
            // TX: release SDA, sample ACK on rise
            sda_out <= 1;
            if (scl_rise) begin
              data_ack  <= ~sda_in;
              byte_done <= 1;
              if (bytes_left <= 4'd1) begin
                done  <= 1;
                state <= IDLE;
              end else begin
                bytes_left <= bytes_left - 1'd1;
                bit_cnt    <= 3'd7;
                state      <= SHIFT;
              end
            end
          end else begin
            // RX: drive ACK (SDA=0) unless last byte (NACK)
            if (scl_fall) begin
              sda_out <= (bytes_left <= 4'd1) ? 1'b1 : 1'b0;
            end
            if (scl_rise && bytes_left <= 4'd1) begin
              byte_done <= 1;
              done      <= 1;
              state     <= IDLE;
            end else if (scl_rise) begin
              byte_done  <= 1;
              bytes_left <= bytes_left - 1'd1;
              bit_cnt    <= 3'd7;
              state      <= SHIFT;
            end
          end
        end

        default: state <= IDLE;
      endcase
    end
  end

endmodule`,
      design:
`// Type the i2c_data_phase module here. See Theory for the FSM.
//
// Ports: clk, rst, start, mode, tx_data[7:0], byte_count[3:0],
//        scl_fall, scl_rise, sda_in (inputs);
//        sda_out, rx_data[7:0], byte_done, data_ack, done (outputs)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, mode, scl_fall, scl_rise, sda_in;
  logic [7:0] tx_data;
  logic [3:0] byte_count;
  logic       sda_out, byte_done, data_ack, done;
  logic [7:0] rx_data;

  i2c_data_phase dut (
    .clk(clk), .rst(rst), .start(start), .mode(mode),
    .tx_data(tx_data), .byte_count(byte_count),
    .scl_fall(scl_fall), .scl_rise(scl_rise), .sda_in(sda_in),
    .sda_out(sda_out), .rx_data(rx_data),
    .byte_done(byte_done), .data_ack(data_ack), .done(done)
  );

  // Apply one SCL fall then rise
  task automatic scl_cycle;
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    @(posedge clk); #1;
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
  endtask

  // Shift out 8 SCL cycles then one ACK cycle
  task automatic run_tx_byte(input logic slave_ack);
    integer i;
    for (i = 0; i < 8; i++) begin
      scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
      @(posedge clk); #1;
    end
    // ACK window
    sda_in   = ~slave_ack;
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
  endtask

  // Shift in 8 bits from bus then one ACK cycle
  task automatic run_rx_byte(input logic [7:0] bus_byte, input logic is_last);
    integer i;
    for (i = 7; i >= 0; i--) begin
      sda_in   = bus_byte[i];
      scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
      @(posedge clk); #1;
    end
    // ACK window (master drives ACK or NACK on fall, slave checks on rise)
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== I2C Data Phase Test ===");
    rst = 0; start = 0; mode = 0; scl_fall = 0; scl_rise = 0;
    sda_in = 1; tx_data = 8'hC3; byte_count = 4'd1;
    repeat(3) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // Test 1: idle state — sda_out released
    if (sda_out === 1 && done === 0)
      \$display("PASS  idle: sda_out=1 done=0");
    else
      \$display("FAIL  idle: sda_out=%0b done=%0b", sda_out, done);

    // Test 2: TX one byte with slave ACK
    mode = 0; tx_data = 8'hC3; byte_count = 4'd1;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    run_tx_byte(1);  // slave ACKs
    if (done === 1 && data_ack === 1)
      \$display("PASS  TX byte: done=1 data_ack=1");
    else
      \$display("FAIL  TX byte: done=%0b data_ack=%0b", done, data_ack);

    // Test 3: TX with NACK
    mode = 0; tx_data = 8'h5A; byte_count = 4'd1;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    run_tx_byte(0);  // no ACK
    if (done === 1 && data_ack === 0)
      \$display("PASS  TX NACK: done=1 data_ack=0");
    else
      \$display("FAIL  TX NACK: done=%0b data_ack=%0b", done, data_ack);

    // Test 4: RX one byte
    mode = 1; byte_count = 4'd1;
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    run_rx_byte(8'hA5, 1);
    if (done === 1 && rx_data === 8'hA5)
      \$display("PASS  RX byte: done=1 rx_data=0x%02h", rx_data);
    else
      \$display("FAIL  RX byte: done=%0b rx_data=0x%02h (expected 0xa5)", done, rx_data);

    \$display("Data phase works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: sda_out=1 done=0',
        'PASS  TX byte: done=1 data_ack=1',
        'PASS  TX NACK: done=1 data_ack=0',
        'PASS  RX byte: done=1 rx_data=0xa5',
        'Data phase works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L3 — Full Master Controller  (Tier 3)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c4l3',
      title: 'L3 — Full Master Controller',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>The Raspberry Pi communicates with GPIO expanders, environmental sensors, and real-time clocks using a single I²C master. The module you are about to build is the top-level hardware that sits behind that peripheral bus entry — it sequences the START condition, address frame, data bytes, and STOP condition into one cohesive transaction. Every I²C master driver in Linux ultimately reduces to this state machine.</p>

<h2>The complete I²C transaction on the wire</h2>
<pre class="code-block">SCL:  &#x203e;&#x203e;|_|&#x203e;|_|&#x203e; ... 8 addr clocks ... |_|&#x203e;|  data bytes  |&#x203e;&#x203e;&#x203e;
SDA:  &#x203e;|_   addr+rw (8 bits)  ACK  data (N bytes)    _|&#x203e;
      ^ START                                           ^ STOP
         SDA falls while SCL high        SDA rises while SCL high</pre>

<p>The top-level FSM stitches the two sub-phase modules together:</p>
<ul>
  <li><strong>IDLE</strong>: wait for the <code>start</code> pulse from the CPU or DMA controller.</li>
  <li><strong>START</strong>: begin the START condition — pull SDA low while SCL stays high.</li>
  <li><strong>ADDR</strong>: invoke the address phase (7-bit address + R/W + ACK).</li>
  <li><strong>DATA</strong>: invoke the data phase for N bytes; abort on NACK if <code>ack_err_en</code> is set.</li>
  <li><strong>STOP</strong>: release SDA while SCL is high — signal end of transaction.</li>
</ul>

<h2>FSM state diagram</h2>
<pre class="code-block">             start pulse
IDLE ─────────────────────────&gt; START
                                  │ scl_fall
                                  v
                                ADDR ─── addr_done, no_ack ──&gt; STOP (ack_err)
                                  │ addr_done, ack OK
                                  v
                                DATA ─── all bytes done ──────&gt; STOP
                                  │ ack_err mid-transfer
                                  v
                                STOP ─── one cycle ───────────&gt; IDLE
                                  (SDA rises while SCL high)</pre>

<h2>Open-drain arbitration in the master</h2>
<p>The master drives both SCL and SDA as open-drain: it never drives either line high by forcing 1 — it releases (outputs <code>1'bz</code>) and lets the pull-up resistors bring the voltage up. The top-level module collects <code>sda_out</code> from whichever sub-module is active and muxes it onto the actual bidirectional wire.</p>
<pre class="code-block">// Conceptual output mux (do NOT copy verbatim)
assign sda = sda_drive ? 1'b0 : 1'bz;  // open-drain output cell
assign sda_in = sda;                    // always sampling the bus</pre>

<h2>Before you code</h2>
<p>What you are about to build is the top-level I²C master FSM. It receives a 7-bit address, a direction flag, and up to one data byte, then drives the complete I²C transaction — START, address, data, STOP — onto the open-drain SDA and SCL wires. The <code>busy</code> flag stays high for the entire transaction. When the transaction ends, <code>done</code> pulses for one cycle and <code>ack_err</code> indicates whether any NACK was received.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock that drives the FSM and all sub-modules.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset; returns to IDLE and releases both bus lines.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulse high for one cycle to begin a transaction — valid only when busy=0.</td></tr>
  <tr><td><code>addr</code></td><td>input logic [6:0]</td><td>7-bit I²C address of the target device.</td></tr>
  <tr><td><code>rw</code></td><td>input logic</td><td>Transaction direction: 0 = write, 1 = read.</td></tr>
  <tr><td><code>data_in</code></td><td>input logic [7:0]</td><td>Byte to write to the slave in TX mode.</td></tr>
  <tr><td><code>scl_fall</code></td><td>input logic</td><td>One-cycle pulse on each SCL falling edge from the clock generator.</td></tr>
  <tr><td><code>scl_rise</code></td><td>input logic</td><td>One-cycle pulse on each SCL rising edge from the clock generator.</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>Current SDA bus value sampled externally.</td></tr>
  <tr><td><code>sda_out</code></td><td>output logic</td><td>What this master drives onto SDA: 0=pull low, 1=release (open-drain).</td></tr>
  <tr><td><code>data_out</code></td><td>output logic [7:0]</td><td>Byte read from the slave in RX mode (valid when done pulses).</td></tr>
  <tr><td><code>busy</code></td><td>output logic</td><td>High for the entire duration of the transaction; low when idle.</td></tr>
  <tr><td><code>done</code></td><td>output logic</td><td>Pulses high for one cycle when the transaction completes (success or error).</td></tr>
  <tr><td><code>ack_err</code></td><td>output logic</td><td>Set high (and held) if a NACK was received during address or data phase.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap \u{1F4A1} Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_master with all fourteen ports from the port table.',
        'Define state type: typedef enum logic [2:0] { IDLE, ST_START, ADDR, DATA, ST_STOP } state_t;',
        'Declare internal registers: state, addr_start, data_start, addr_ack, data_ack, data_done signals for sub-module handshaking.',
        'Write the always_ff block: on !rst release sda_out, clear busy, done, ack_err, return to IDLE.',
        'In IDLE: when start=1 register addr/rw/data_in, assert busy, enter ST_START.',
        'In ST_START: drive sda_out=0 (SDA falls); on scl_fall pulse addr_start and enter ADDR.',
        'In ADDR: when addr_done pulses, check addr_ack — if NACK set ack_err and enter ST_STOP; otherwise enter DATA.',
        'In DATA: when data_done pulses, check data_ack — if NACK set ack_err; capture data_out; enter ST_STOP.',
        'In ST_STOP: drive sda_out=0; on scl_rise release sda_out=1 (SDA rises = STOP); assert done; clear busy; enter IDLE.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_master (
  input  logic       clk,
  input  logic       rst,       // synchronous active-low reset
  input  logic       start,     // begin transaction (when busy=0)
  input  logic [6:0] addr,      // 7-bit target address
  input  logic       rw,        // 0=write, 1=read
  input  logic [7:0] data_in,   // byte to write (TX mode)
  input  logic       scl_fall,  // pulse: SCL falling edge
  input  logic       scl_rise,  // pulse: SCL rising edge
  input  logic       sda_in,    // bus SDA value
  output logic       sda_out,   // open-drain SDA drive
  output logic [7:0] data_out,  // byte read (RX mode, valid at done)
  output logic       busy,      // high during transaction
  output logic       done,      // one-cycle pulse: transaction ended
  output logic       ack_err    // high if NACK was received
);

  typedef enum logic [2:0] {
    IDLE, ST_START, ADDR, DATA, ST_STOP
  } state_t;

  state_t state;

  // ─── Registered copies of inputs (sampled when start fires) ───────
  logic [6:0] r_addr;
  logic       r_rw;
  logic [7:0] r_data_in;

  // ─── Handshake signals to/from address phase sub-logic ────────────
  logic addr_start_pulse;  // one-cycle start for addr phase
  logic addr_done_q;       // latched done from addr phase
  logic addr_ack_q;        // latched ack from addr phase

  // ─── Handshake signals to/from data phase sub-logic ──────────────
  logic data_start_pulse;
  logic data_done_q;
  logic data_ack_q;
  logic [7:0] rx_byte;

  // ─── Inline address phase FSM ─────────────────────────────────────
  // (In a real design you would instantiate i2c_addr_phase and
  //  i2c_data_phase here. For this self-contained lesson we inline
  //  simplified versions so the testbench can drive them directly.)

  typedef enum logic [1:0] {
    AP_IDLE, AP_SHIFT, AP_ACK
  } ap_state_t;
  ap_state_t ap_state;
  logic [7:0] ap_frame;
  logic [2:0] ap_bit;

  always_ff @(posedge clk) begin
    addr_done_q <= 0;
    if (!rst) begin
      ap_state  <= AP_IDLE;
      ap_frame  <= 8'b0;
      ap_bit    <= 3'd7;
      addr_ack_q <= 0;
    end else begin
      case (ap_state)
        AP_IDLE: if (addr_start_pulse) begin
          ap_frame <= {r_addr, r_rw};
          ap_bit   <= 3'd7;
          ap_state <= AP_SHIFT;
        end
        AP_SHIFT: if (scl_fall) begin
          ap_frame <= {ap_frame[6:0], 1'b0};
          if (ap_bit == 3'd0) ap_state <= AP_ACK;
          else ap_bit <= ap_bit - 1'd1;
        end
        AP_ACK: if (scl_rise) begin
          addr_ack_q  <= ~sda_in;
          addr_done_q <= 1;
          ap_state    <= AP_IDLE;
        end
        default: ap_state <= AP_IDLE;
      endcase
    end
  end

  // ─── Inline data phase FSM ────────────────────────────────────────
  typedef enum logic [1:0] {
    DP_IDLE, DP_SHIFT, DP_ACK
  } dp_state_t;
  dp_state_t dp_state;
  logic [7:0] dp_frame;
  logic [2:0] dp_bit;
  logic [7:0] dp_rx;

  always_ff @(posedge clk) begin
    data_done_q <= 0;
    if (!rst) begin
      dp_state  <= DP_IDLE;
      dp_frame  <= 8'b0;
      dp_bit    <= 3'd7;
      data_ack_q <= 0;
      dp_rx     <= 8'b0;
    end else begin
      case (dp_state)
        DP_IDLE: if (data_start_pulse) begin
          dp_frame <= r_data_in;
          dp_bit   <= 3'd7;
          dp_state <= DP_SHIFT;
        end
        DP_SHIFT: begin
          if (r_rw == 1'b0 && scl_fall) begin   // TX
            dp_frame <= {dp_frame[6:0], 1'b0};
            if (dp_bit == 3'd0) dp_state <= DP_ACK;
            else dp_bit <= dp_bit - 1'd1;
          end else if (r_rw == 1'b1 && scl_rise) begin  // RX
            dp_rx <= {dp_rx[6:0], sda_in};
            if (dp_bit == 3'd0) dp_state <= DP_ACK;
            else dp_bit <= dp_bit - 1'd1;
          end
        end
        DP_ACK: if (scl_rise) begin
          data_ack_q  <= (r_rw == 1'b0) ? ~sda_in : 1'b1;
          rx_byte     <= dp_rx;
          data_done_q <= 1;
          dp_state    <= DP_IDLE;
        end
        default: dp_state <= DP_IDLE;
      endcase
    end
  end

  // ─── Top-level transaction FSM ────────────────────────────────────
  always_ff @(posedge clk) begin
    done             <= 0;
    addr_start_pulse <= 0;
    data_start_pulse <= 0;

    if (!rst) begin
      state    <= IDLE;
      busy     <= 0;
      ack_err  <= 0;
      sda_out  <= 1;
      data_out <= 8'b0;
      r_addr   <= 7'b0;
      r_rw     <= 0;
      r_data_in<= 8'b0;
    end else begin
      case (state)

        IDLE: begin
          sda_out <= 1;
          busy    <= 0;
          if (start) begin
            r_addr    <= addr;
            r_rw      <= rw;
            r_data_in <= data_in;
            ack_err   <= 0;
            busy      <= 1;
            state     <= ST_START;
          end
        end

        ST_START: begin
          sda_out <= 0;   // SDA falls while SCL high = START
          if (scl_fall) begin
            addr_start_pulse <= 1;
            state            <= ADDR;
          end
        end

        ADDR: begin
          // sda_out driven by inline addr FSM during this state
          if (addr_done_q) begin
            if (!addr_ack_q) begin
              ack_err <= 1;
              state   <= ST_STOP;
            end else begin
              data_start_pulse <= 1;
              state            <= DATA;
            end
          end
        end

        DATA: begin
          if (data_done_q) begin
            if (!data_ack_q && r_rw == 1'b0)
              ack_err <= 1;
            data_out <= rx_byte;
            state    <= ST_STOP;
          end
        end

        ST_STOP: begin
          sda_out <= 0;   // hold SDA low
          if (scl_rise) begin
            sda_out <= 1; // SDA rises while SCL high = STOP
            done    <= 1;
            busy    <= 0;
            state   <= IDLE;
          end
        end

      endcase
    end
  end

endmodule`,
      design:
`// Build the i2c_master module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, rw, scl_fall, scl_rise, sda_in;
  logic [6:0] addr;
  logic [7:0] data_in;
  logic       sda_out, busy, done, ack_err;
  logic [7:0] data_out;

  i2c_master dut (
    .clk(clk), .rst(rst), .start(start),
    .addr(addr), .rw(rw), .data_in(data_in),
    .scl_fall(scl_fall), .scl_rise(scl_rise), .sda_in(sda_in),
    .sda_out(sda_out), .data_out(data_out),
    .busy(busy), .done(done), .ack_err(ack_err)
  );

  // Drive 8 SCL cycles for a byte frame
  task automatic run_byte_clocks(input logic slave_sda);
    integer i;
    for (i = 0; i < 8; i++) begin
      scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
      scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
      @(posedge clk); #1;
    end
    // ACK window
    sda_in   = slave_sda;
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
  endtask

  // Drive STOP condition: one scl_rise after ST_STOP sda=0
  task automatic run_stop;
    scl_rise = 1; @(posedge clk); #1; scl_rise = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    \$display("=== I2C Master Controller Test ===");
    rst = 0; start = 0; scl_fall = 0; scl_rise = 0;
    sda_in = 1; addr = 7'h3C; rw = 0; data_in = 8'hAB;
    repeat(3) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // Test 1: idle — not busy, no errors
    if (busy === 0 && done === 0 && ack_err === 0)
      \$display("PASS  idle: busy=0 done=0 ack_err=0");
    else
      \$display("FAIL  idle: busy=%0b done=%0b ack_err=%0b", busy, done, ack_err);

    // Test 2: start a TX transaction — busy should go high
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    if (busy === 1)
      \$display("PASS  started: busy=1");
    else
      \$display("FAIL  started: busy=%0b (expected 1)", busy);

    // Provide START scl_fall to move FSM from ST_START -> ADDR
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    @(posedge clk); #1;

    // Run address byte (slave ACKs = sda_in=0)
    run_byte_clocks(1'b0);   // addr ACK

    // Run data byte (slave ACKs)
    run_byte_clocks(1'b0);   // data ACK

    // Run STOP
    run_stop();

    // Test 3: done should pulse, no ack_err
    if (done === 1 && ack_err === 0 && busy === 0)
      \$display("PASS  write done: done=1 ack_err=0 busy=0");
    else
      \$display("FAIL  write done: done=%0b ack_err=%0b busy=%0b", done, ack_err, busy);

    // Test 4: transaction with address NACK
    start = 1; @(posedge clk); #1; start = 0;
    @(posedge clk); #1;
    scl_fall = 1; @(posedge clk); #1; scl_fall = 0;
    @(posedge clk); #1;
    run_byte_clocks(1'b1);   // addr NACK (sda_in=1)
    // After NACK the FSM goes to STOP; run stop
    run_stop();
    repeat(3) @(posedge clk); #1;
    if (ack_err === 1)
      \$display("PASS  addr NACK: ack_err=1");
    else
      \$display("FAIL  addr NACK: ack_err=%0b (expected 1)", ack_err);

    \$display("Master controller works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: busy=0 done=0 ack_err=0',
        'PASS  started: busy=1',
        'PASS  write done: done=1 ack_err=0 busy=0',
        'PASS  addr NACK: ack_err=1',
        'Master controller works!'
      ]
    }

  ]
});


