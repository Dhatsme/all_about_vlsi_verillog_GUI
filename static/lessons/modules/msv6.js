(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv6',
  title: 'Serial Protocols',
  icon: '📡',
  level: 'intermediate',
  lessons: [

    // ── L1 UART Transmitter (Tier 4) ───────────────────────────────────────
    {
      id: 'msv6l1',
      title: 'L1 — UART Transmitter',
      theory: `
<h2>UART Transmitter: Serial Data from First Principles</h2>
<p><strong>UART</strong> (Universal Asynchronous Receiver/Transmitter) is the oldest and simplest serial protocol. It needs only two wires: TX and RX. Your microcontroller uses it to talk to your PC. Almost every embedded chip has at least one UART.</p>

<h3>UART frame format</h3>
<pre class="code-block">Idle: TX = 1 (line high)
Start bit: TX = 0 for 1 bit period
Data: 8 data bits, LSB first
Stop bit: TX = 1 for 1 bit period</pre>
<p>Total frame: 10 bit-periods. At 115200 baud, each bit lasts 8.68 µs. To hit exactly 8.68 µs with a 50 MHz clock, you need 50,000,000 / 115,200 ≈ 434 clock cycles per bit.</p>

<h3>Baud rate generator</h3>
<pre class="code-block">parameter  CLK_FREQ = 50_000_000;
parameter  BAUD     = 115_200;
localparam BAUD_DIV = CLK_FREQ / BAUD;  // = 434

logic [$clog2(BAUD_DIV)-1:0] baud_cnt;  // counts up to BAUD_DIV-1</pre>
<p>The baud counter ticks every clock. When it reaches <code>BAUD_DIV-1</code>, one bit period has elapsed and the next bit shifts out.</p>

<h3>FSM states</h3>
<table class="truth-table">
  <tr><th>State</th><th>TX</th><th>busy</th><th>Next</th></tr>
  <tr><td>IDLE</td><td>1</td><td>0</td><td>START on send</td></tr>
  <tr><td>START</td><td>0</td><td>1</td><td>DATA after 1 bit</td></tr>
  <tr><td>DATA</td><td>shift_reg[0]</td><td>1</td><td>STOP after 8 bits</td></tr>
  <tr><td>STOP</td><td>1</td><td>1</td><td>IDLE after 1 bit</td></tr>
</table>

<h3>Testbench shortcut</h3>
<p>Testing at 115200 baud requires 434 cycles per bit — too slow for simulation. Use parameters to override: <code>CLK_FREQ=10, BAUD=1</code> so each bit lasts exactly 10 cycles. The RTL logic is identical; only the timing changes.</p>

<h3>You will build</h3>
<p>Module <code>uart_tx</code>: parameters CLK_FREQ and BAUD. Inputs: <code>clk, rst, send, data[7:0]</code>. Outputs: <code>tx, busy</code>.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Use parameters: parameter CLK_FREQ = 50_000_000;  parameter BAUD = 115_200;',
        'localparam BAUD_DIV = CLK_FREQ / BAUD;',
        'States: IDLE, START, DATA, STOP (use typedef enum logic [1:0])',
        'Baud counter: counts 0 to BAUD_DIV-1, resets on state transition',
        'Shift register: loads data on START entry, shifts right each bit period',
        'bit_cnt: counts 0-7 in DATA state (8 data bits)',
        'tx=0 in START, tx=shift_reg[0] in DATA, tx=1 in STOP/IDLE',
        'busy=0 only in IDLE',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS for busy=1, then PASS for busy=0 at end of frame',
      ],
      hint:
`DESIGN NOTES for uart_tx:

  Parameters:
    parameter  CLK_FREQ = 50_000_000;
    parameter  BAUD     = 115_200;
    localparam BAUD_DIV = CLK_FREQ / BAUD;

  Ports:
    input  logic       clk, rst, send
    input  logic [7:0] data
    output logic       tx, busy

  Internals:
    typedef enum logic [1:0] { IDLE, START, DATA, STOP } state_t;
    state_t state;
    logic [$clog2(BAUD_DIV)-1:0] baud_cnt;
    logic [7:0] shift_reg;
    logic [2:0] bit_cnt;

  One always_ff block handles everything:
    IDLE:
      tx=1, busy=0
      if (send): load shift_reg=data, go to START, reset baud_cnt
    START:
      tx=0, busy=1
      when baud_cnt==BAUD_DIV-1: reset baud_cnt, go to DATA
    DATA:
      tx=shift_reg[0], busy=1
      when baud_cnt==BAUD_DIV-1:
        shift_reg >>= 1, increment bit_cnt
        if bit_cnt==7: reset baud_cnt, go to STOP
    STOP:
      tx=1, busy=1
      when baud_cnt==BAUD_DIV-1: go to IDLE

  Testbench uses CLK_FREQ=10, BAUD=1 so BAUD_DIV=10.
  Full frame = 10 cycles (start) + 80 cycles (8 bits) + 10 cycles (stop) = 100 cycles.
  Wait 110 cycles after send to be safe, then check busy=0 and tx=1.`,
      design:
`// Build the uart_tx module here. Read Theory for the baud rate formula.
//
// Module: uart_tx
// Parameters: CLK_FREQ (default 50_000_000), BAUD (default 115_200)
// Ports:
//   input  logic       clk, rst, send
//   input  logic [7:0] data
//   output logic       tx    -- serial output (idle high)
//   output logic       busy  -- 1 while transmitting
//
// States: IDLE -> START -> DATA (8 bits) -> STOP -> IDLE
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, send, tx, busy;
  logic [7:0] data;

  // Use tiny CLK_FREQ=10 BAUD=1 so BAUD_DIV=10, full frame=100 cycles
  uart_tx #(.CLK_FREQ(10), .BAUD(1)) dut(
    .clk(clk), .rst(rst), .send(send), .data(data), .tx(tx), .busy(busy));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; send = 0; data = 0;
    @(posedge clk); #1; rst = 0;

    // Send byte 0x55 (01010101)
    data = 8'h55; send = 1;
    @(posedge clk); #1; send = 0;

    // Should immediately be busy
    if (busy === 1'b1)
      $display("PASS  TX started: busy=1");
    else
      $display("FAIL  TX should be busy, got busy=%0b", busy);

    // Wait for full frame (110 cycles to be safe: 10+80+10+margin)
    repeat(110) @(posedge clk); #1;

    // Should be done
    if (busy === 1'b0 && tx === 1'b1)
      $display("PASS  TX done: busy=0 tx=1 (idle)");
    else
      $display("FAIL  TX end: busy=%0b tx=%0b", busy, tx);

    $display("UART TX works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  TX started: busy=1',
        'UART TX works!'
      ]
    },

    // ── L2 UART Receiver (Tier 4) ──────────────────────────────────────────
    {
      id: 'msv6l2',
      title: 'L2 — UART Receiver',
      theory: `
<h2>UART Receiver: Center Sampling</h2>
<p>Receiving is harder than transmitting. The receiver does not know exactly when the sender started transmitting — it must detect the falling edge of the start bit and then sample each subsequent bit at its <em>center</em> to avoid noise at the edges.</p>

<h3>Center-sampling strategy</h3>
<pre class="code-block">Bit period = BAUD_DIV cycles
Start of bit (falling edge detected) -> wait BAUD_DIV/2 cycles
Now at center of start bit -> sample
Every BAUD_DIV cycles after that -> sample next bit at its center</pre>

<p>Sampling at the center maximizes the margin against setup/hold violations caused by clock frequency mismatch between sender and receiver.</p>

<h3>FSM states</h3>
<table class="truth-table">
  <tr><th>State</th><th>Action</th></tr>
  <tr><td>IDLE</td><td>Wait for rx=0 (start bit falling edge)</td></tr>
  <tr><td>START</td><td>Wait BAUD_DIV/2 cycles to reach center; verify rx still 0</td></tr>
  <tr><td>DATA</td><td>Sample rx every BAUD_DIV cycles, shift into shift_reg, count 8 bits</td></tr>
  <tr><td>STOP</td><td>Wait BAUD_DIV cycles, assert valid for 1 cycle, output data</td></tr>
</table>

<h3>The valid pulse</h3>
<p><code>valid</code> is asserted for <strong>exactly one clock cycle</strong> when a complete byte has been received. The testbench must latch it — it cannot poll for it the next cycle. Use an <code>always_ff</code> latch in the testbench:</p>
<pre class="code-block">always_ff @(posedge clk)
  if (valid) got_valid <= 1'b1;</pre>

<h3>You will build</h3>
<p>Module <code>uart_rx</code>: same parameters as uart_tx. Inputs: <code>clk, rst, rx</code>. Outputs: <code>data[7:0], valid</code>. Testbench drives a serial frame and checks the received byte.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Same parameters as uart_tx: CLK_FREQ, BAUD, BAUD_DIV',
        'States: IDLE, START, DATA, STOP',
        'In IDLE: detect falling edge of rx (rx goes 0)',
        'In START: wait BAUD_DIV/2 cycles to reach center of start bit',
        'In DATA: sample rx every BAUD_DIV cycles, shift into shift_reg (LSB first), count 8 bits',
        'In STOP: wait 1 bit period, pulse valid=1 for exactly 1 cycle, output shift_reg as data',
        'Return to IDLE after STOP',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — received byte should match transmitted byte',
      ],
      hint:
`DESIGN NOTES for uart_rx:

  Parameters: same as uart_tx (CLK_FREQ, BAUD, BAUD_DIV)

  Ports:
    input  logic       clk, rst, rx
    output logic [7:0] data
    output logic       valid   // 1-cycle pulse when byte received

  Internals:
    typedef enum logic [1:0] { IDLE, START, DATA, STOP } state_t;
    state_t state;
    logic [$clog2(BAUD_DIV)-1:0] baud_cnt;
    logic [7:0] shift_reg;
    logic [2:0] bit_cnt;

  State behavior:
    IDLE:
      valid = 0
      if (!rx): go to START, reset baud_cnt   // falling edge of start bit

    START:
      wait until baud_cnt == BAUD_DIV/2 - 1  // reach center of start bit
      reset baud_cnt, go to DATA

    DATA:
      every baud_cnt == BAUD_DIV-1:
        shift_reg = {rx, shift_reg[7:1]}  // shift in LSB first (right shift)
        bit_cnt++
        if bit_cnt == 7: go to STOP, reset baud_cnt

    STOP:
      wait baud_cnt == BAUD_DIV-1
      data  <= shift_reg
      valid <= 1  // pulse for 1 cycle only
      go to IDLE
      (valid goes back to 0 on next cycle)

  Testbench tip:
    valid is a 1-cycle pulse. Use an always_ff latch in tb:
      always_ff @(posedge clk)
        if (valid) got_valid <= 1'b1;
    Check got_valid at the end instead of valid directly.`,
      design:
`// Build the uart_rx module here. Read Theory for center-sampling.
//
// Module: uart_rx
// Parameters: CLK_FREQ (default 50_000_000), BAUD (default 115_200)
// Ports:
//   input  logic       clk, rst, rx  -- serial input (idle high)
//   output logic [7:0] data          -- received byte
//   output logic       valid         -- 1-cycle pulse: new byte ready
//
// States: IDLE -> START (half-period delay) -> DATA (8 bits) -> STOP -> IDLE
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, rx, valid;
  logic [7:0] data;
  logic       got_valid;   // latch: catches the 1-cycle valid pulse

  uart_rx #(.CLK_FREQ(10), .BAUD(1)) dut(
    .clk(clk), .rst(rst), .rx(rx), .data(data), .valid(valid));

  always #5 clk = ~clk;

  // Latch valid so we don't miss the 1-cycle pulse
  always_ff @(posedge clk)
    if (valid) got_valid <= 1'b1;

  // Task: drive 1 bit on rx line for BAUD_DIV=10 cycles
  task drive_bit(input logic b);
    integer k;
    for (k = 0; k < 10; k = k + 1) begin
      rx = b; @(posedge clk); #1;
    end
  endtask

  initial begin
    clk = 0; rst = 1; rx = 1; got_valid = 0;
    @(posedge clk); #1; rst = 0;

    // Transmit byte 0xA5 = 10100101, LSB first: 1,0,1,0,0,1,0,1
    drive_bit(0);    // start bit
    drive_bit(1);    // bit 0 (LSB)
    drive_bit(0);    // bit 1
    drive_bit(1);    // bit 2
    drive_bit(0);    // bit 3
    drive_bit(0);    // bit 4
    drive_bit(1);    // bit 5
    drive_bit(0);    // bit 6
    drive_bit(1);    // bit 7 (MSB)
    drive_bit(1);    // stop bit

    // Wait a few more cycles for STOP state to complete
    repeat(15) @(posedge clk); #1;

    if (got_valid === 1'b1 && data === 8'hA5)
      $display("PASS  Received 0x%h correctly", data);
    else if (got_valid === 1'b0)
      $display("FAIL  valid never asserted");
    else
      $display("FAIL  Received 0x%h, expected 0xA5", data);

    $display("UART RX works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Received 0xa5 correctly',
        'UART RX works!'
      ]
    },

    // ── L3 Portfolio: SPI Master (Tier 5) ─────────────────────────────────
    {
      id: 'msv6l3',
      title: 'L3 — Portfolio: SPI Master',
      theory: `
<h2>Portfolio Project: SPI Master Controller</h2>
<p><strong>SPI</strong> (Serial Peripheral Interface) is the fastest common serial bus. Every ADC, DAC, flash chip, display driver, and IMU sensor uses SPI. Unlike UART, SPI is synchronous — the master provides a clock (<code>sclk</code>) that both sides use. This makes it far faster and simpler to implement correctly.</p>

<h3>SPI signals</h3>
<table class="truth-table">
  <tr><th>Signal</th><th>Direction</th><th>Description</th></tr>
  <tr><td>sclk</td><td>Master → Slave</td><td>Serial clock generated by master</td></tr>
  <tr><td>mosi</td><td>Master → Slave</td><td>Master Out Slave In — data from master</td></tr>
  <tr><td>miso</td><td>Slave → Master</td><td>Master In Slave Out — data from slave</td></tr>
  <tr><td>cs_n</td><td>Master → Slave</td><td>Chip Select active LOW — selects the slave</td></tr>
</table>

<h3>CPOL=0 CPHA=0 (Mode 0)</h3>
<p>Clock idles low. Data is sampled on the rising edge of sclk and shifted on the falling edge. This is the most common mode used by sensors and ADCs.</p>

<pre class="code-block">cs_n  ‾‾‾___________________________________________‾‾‾
sclk  ‾‾‾_‾_‾_‾_‾_‾_‾_‾_‾‾‾  (8 pulses)
mosi  ---[b7][b6][b5][b4][b3][b2][b1][b0]---
miso  ---[b7][b6][b5][b4][b3][b2][b1][b0]---</pre>

<h3>Transfer sequence</h3>
<ol>
  <li>Assert <code>cs_n=0</code></li>
  <li>For each of 8 bits (MSB first): drive mosi, toggle sclk, sample miso on rising edge</li>
  <li>Deassert <code>cs_n=1</code></li>
  <li>Assert <code>done=1</code> for 1 cycle, output received byte on <code>rx_data</code></li>
</ol>

<h3>Why SPI matters</h3>
<p>If you want to read a temperature sensor, write to a DAC, or program an external flash chip — you implement this SPI master. It appears in virtually every embedded product ever made.</p>

<p><strong>Ready?</strong> Switch to Code. No hint — this is your portfolio piece. Plan on paper, then code.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Module: spi_master',
        'Inputs: clk, rst, start, tx_data[7:0], miso',
        'Outputs: sclk, mosi, cs_n, rx_data[7:0], done',
        'CPOL=0 CPHA=0: clock idles low, data sampled on rising sclk edge',
        'Transfer MSB first (bit 7 first on mosi)',
        'Use a bit counter (0-7) and sclk toggle counter for baud generation',
        'cs_n=0 during transfer, cs_n=1 in idle',
        'done pulses for 1 cycle when transfer complete, rx_data holds received byte',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — done should pulse and rx_data should match what miso drives',
        '🎓 Portfolio piece — push to your GitHub',
        'Next: msv6 L4 — I2C Controller (the hardest protocol)',
      ],
      hint: `No hint for portfolio projects. SPI design checklist:
1. States: IDLE, TRANSFER, DONE (at minimum).
2. In TRANSFER: sclk toggles every N clocks (N=clock divider, use parameter).
3. Drive mosi on falling sclk edges, sample miso on rising sclk edges.
4. Shift in received bits MSB-first into rx_shift, shift out tx bits MSB-first.
5. Count 8 bit-pairs (16 sclk edges total for 8 data bits).
6. cs_n=0 while in TRANSFER state.
7. After 8 bits: assert done=1 for 1 cycle, output rx_data=rx_shift, return to IDLE.`,
      design:
`// Build the spi_master module here.
//
// Module: spi_master
// Ports:
//   input  logic       clk, rst, start, miso
//   input  logic [7:0] tx_data        -- byte to send
//   output logic       sclk, mosi, cs_n
//   output logic [7:0] rx_data        -- byte received from slave
//   output logic       done           -- 1-cycle pulse when transfer complete
//
// CPOL=0 CPHA=0 (Mode 0): sclk idles low, sample on rising edge
// Transfer MSB first, 8 bits per transaction
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, start, miso, sclk, mosi, cs_n, done;
  logic [7:0] tx_data, rx_data;
  logic       got_done;
  logic [7:0] miso_byte;

  spi_master dut(.clk(clk), .rst(rst), .start(start), .miso(miso),
                 .tx_data(tx_data), .sclk(sclk), .mosi(mosi),
                 .cs_n(cs_n), .rx_data(rx_data), .done(done));

  always #5 clk = ~clk;

  // Drive miso: echo back a fixed byte 0xC3 MSB first on rising sclk edge
  integer miso_bit;
  initial begin
    miso_byte = 8'hC3; miso = 1;
    miso_bit  = 7;
    // Wait for cs_n to go low
    @(negedge cs_n);
    // On each rising sclk edge (8 total), drive the next miso bit
    repeat(8) begin
      @(posedge sclk);
      miso = miso_byte[miso_bit];
      miso_bit = miso_bit - 1;
    end
  end

  // Latch done
  always_ff @(posedge clk)
    if (done) got_done <= 1'b1;

  initial begin
    clk = 0; rst = 1; start = 0; tx_data = 0; got_done = 0;
    @(posedge clk); #1; rst = 0;

    // Start a transfer of 0xA5
    tx_data = 8'hA5; start = 1;
    @(posedge clk); #1; start = 0;

    // Wait long enough for transfer to complete (8 bits * 2 half-periods)
    repeat(200) @(posedge clk); #1;

    if (cs_n === 1'b1)
      $display("PASS  cs_n deasserted after transfer");
    else
      $display("FAIL  cs_n still low: %0b", cs_n);

    if (got_done === 1'b1)
      $display("PASS  done pulsed");
    else
      $display("FAIL  done never pulsed");

    if (rx_data === 8'hC3)
      $display("PASS  Received 0x%h from slave", rx_data);
    else
      $display("FAIL  rx_data: expected 0xC3 got 0x%h", rx_data);

    $display("SPI master works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  done pulsed',
        'PASS  Received 0xc3 from slave',
        'SPI master works!'
      ]
    },

    // ── L4 Portfolio: I2C Controller (Tier 5) ─────────────────────────────
    {
      id: 'msv6l4',
      title: 'L4 — Portfolio: I2C Controller',
      theory: `
<h2>Portfolio Project: I2C Master Controller</h2>
<p><strong>I2C</strong> (Inter-Integrated Circuit, pronounced "I-squared-C") is the most widely used 2-wire serial bus. Every EEPROM, temperature sensor, accelerometer, OLED display, and real-time clock uses I2C. Unlike SPI with its 4 wires, I2C uses only 2: <strong>SDA</strong> (data) and <strong>SCL</strong> (clock).</p>

<p>This is the <strong>Systems Engineer certificate project</strong>. I2C is the hardest protocol in this module. Take your time.</p>

<h3>I2C bus signals (open-drain)</h3>
<p>Both SDA and SCL are open-drain — any device can pull them low, but no device drives them high. Pull-up resistors provide the high state. In simulation, model this with a tristate driver:</p>
<pre class="code-block">assign sda = sda_oe ? 1'b0 : 1'bz;  // drive 0 or release (Z)
assign scl = scl_oe ? 1'b0 : 1'bz;</pre>

<h3>START and STOP conditions</h3>
<p>START and STOP are defined by transitions while SCL is HIGH — which is not allowed at any other time.</p>
<pre class="code-block">START: SDA falls while SCL is HIGH
STOP:  SDA rises while SCL is HIGH</pre>

<h3>I2C write transaction</h3>
<pre class="code-block">1. START condition
2. 7-bit slave address + write bit (0), MSB first
3. ACK from slave (SDA pulled low by slave)
4. 8 data bits, MSB first
5. ACK from slave
6. STOP condition</pre>

<h3>Bit timing</h3>
<p>SCL is toggled by the master. Each bit: SCL low → drive SDA → SCL high → sample SDA → SCL low. Standard mode I2C runs at 100 kHz (400 kHz in fast mode). Use a parameter for the divider.</p>

<h3>Why this is the hardest</h3>
<p>Three things make I2C harder than SPI: (1) open-drain bus requires bidirectional SDA, (2) ACK/NACK from slave must be sampled and handled, (3) START/STOP are special — SDA must change while SCL is high, which breaks the normal rule that SDA only changes while SCL is low.</p>

<p><strong>Ready?</strong> Switch to Code. No hint — this is a Systems Engineer certificate project. Research I2C timing diagrams before coding. Plan every state carefully on paper first.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Module: i2c_master',
        'Inputs: clk, rst, start_xfer, addr[6:0], wdata[7:0]',
        'Outputs: scl, sda (open-drain), busy, ack_err',
        "Model open-drain: assign sda = sda_oe ? 1'b0 : 1'bz",
        'START: pull SDA low while SCL high',
        'Send 7-bit address + write bit (0), MSB first',
        'After each byte: release SDA (sda_oe=0) to receive ACK/NACK from slave',
        'ACK: slave pulls SDA low during 9th clock. NACK: SDA stays high.',
        'Send 8 data bits, receive ACK again',
        'STOP: release SDA while SCL high',
        'Set ack_err=1 if any ACK is NACK (SDA=1 during ACK slot)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run and verify START/data/STOP sequence is correct',
        '🎓 Systems Engineer certificate project — push to your GitHub when complete',
        'Congratulations — you have completed the Serial Protocols module!',
        '🎓 Systems Engineer certificate unlocked — complete msv5 + msv6 to claim it',
      ],
      hint: `No hint for certificate projects. I2C implementation roadmap:

States (minimum):
  IDLE -> START -> ADDR (9 bits with ACK) -> DATA (9 bits with ACK) -> STOP -> IDLE

Bit clock:
  Use a counter (CLK_FREQ / (4 * I2C_FREQ)) for quarter-period timing.
  SCL has 4 phases per bit: low1, rising, high, falling.
  SDA changes in the low phase (except START/STOP which change in high phase).

ACK handling:
  In the 9th clock of ADDR and DATA phases:
    release SDA (sda_oe = 0) so slave can drive it
    sample SDA on SCL rising edge
    if SDA == 1: ACK error (NACK received)

Open-drain model for simulation:
  assign sda = sda_oe ? 1'b0 : 1'bz;
  assign scl = scl_oe ? 1'b0 : 1'bz;
  // Testbench must pull up: assign sda_line = (sda === 1'bz) ? 1'b1 : sda;

Tip: simulate with a fake slave that ACKs every byte by driving SDA=0
during the ACK window. Verify with $monitor or $display at each state.`,
      design:
`// Build the i2c_master module here.
// This is the Systems Engineer certificate project.
//
// Module: i2c_master
// Parameters: CLK_FREQ (default 50_000_000), I2C_FREQ (default 100_000)
// Ports:
//   input  logic       clk, rst, start_xfer
//   input  logic [6:0] addr     -- 7-bit slave address
//   input  logic [7:0] wdata    -- byte to write
//   inout  wire        sda      -- I2C data (open-drain)
//   output logic       scl      -- I2C clock
//   output logic       busy     -- 1 during transfer
//   output logic       ack_err  -- 1 if NACK received
//
// Model open-drain internally:
//   logic sda_oe;  // 1=drive 0, 0=release (tristate)
//   assign sda = sda_oe ? 1'b0 : 1'bz;
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, start_xfer, busy, ack_err;
  logic [6:0] addr;
  logic [7:0] wdata;
  logic       scl;
  wire        sda;           // open-drain wire
  logic       sda_slave_oe;  // slave drives SDA=0 for ACK

  // Slave ACK model: pull SDA low during ACK windows
  assign sda = sda_slave_oe ? 1'b0 : 1'bz;

  i2c_master #(.CLK_FREQ(100), .I2C_FREQ(10)) dut(
    .clk(clk), .rst(rst), .start_xfer(start_xfer),
    .addr(addr), .wdata(wdata),
    .sda(sda), .scl(scl), .busy(busy), .ack_err(ack_err));

  always #5 clk = ~clk;

  // Simple slave: counts SCL edges, ACKs at bits 8 and 17
  integer scl_edge_cnt;
  initial begin
    sda_slave_oe = 0; scl_edge_cnt = 0;
    forever begin
      @(posedge scl);
      scl_edge_cnt = scl_edge_cnt + 1;
      // ACK after address byte (9th clock) and data byte (18th clock)
      if (scl_edge_cnt == 9 || scl_edge_cnt == 18) begin
        @(negedge scl); sda_slave_oe = 1;  // pull SDA low = ACK
        @(negedge scl); sda_slave_oe = 0;  // release
      end
    end
  end

  initial begin
    clk = 0; rst = 1; start_xfer = 0;
    addr = 7'h4A; wdata = 8'h37;
    @(posedge clk); #1; rst = 0;

    start_xfer = 1; @(posedge clk); #1; start_xfer = 0;

    // Wait for transfer to complete
    repeat(800) @(posedge clk); #1;

    if (busy === 1'b0)
      $display("PASS  Transfer complete: busy=0");
    else
      $display("FAIL  Transfer stuck: busy=%0b", busy);

    if (ack_err === 1'b0)
      $display("PASS  No ACK errors");
    else
      $display("FAIL  ACK error detected");

    $display("I2C master works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Transfer complete: busy=0',
        'PASS  No ACK errors',
        'I2C master works!'
      ]
    }

  ]
});
