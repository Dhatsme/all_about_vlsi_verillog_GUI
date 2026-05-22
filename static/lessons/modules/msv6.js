(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv6',
  title: 'Serial Protocols',
  icon: '📡',
  level: 'intermediate',
  lessons: [

    // ── L1 Parameterized Modules (Tier 3) ──────────────────────────────────
    {
      id: 'msv6l1',
      title: 'L1 — Parameterized Modules',
      theory: `
<h2>Parameterized Modules: One Module, Many Configurations</h2>
<p>Every module you have built so far has fixed sizes: a 4-bit register always holds 4 bits, a divider always divides by the same number. <strong>Parameters</strong> let you write the logic once and configure it differently each time you instantiate it — the same way a function argument works in software.</p>

<h3>The parameter keyword</h3>
<p>Parameters are declared in the module header with <code>#()</code> syntax. They have a default value and can be overridden at instantiation time:</p>
<pre class="code-block">module prescaler #(
  parameter N = 8   // divide by N, default is 8
) (
  input  logic clk,
  input  logic rst,
  output logic tick
);
  // N is usable anywhere inside this module
endmodule</pre>

<h3>localparam — internal computed constants</h3>
<p><code>localparam</code> is a constant derived from other parameters. It is computed inside the module and <strong>cannot</strong> be overridden from outside:</p>
<pre class="code-block">parameter  CLK_FREQ = 50_000_000;       // caller can override this
parameter  BAUD     = 115_200;          // caller can override this
localparam BAUD_DIV = CLK_FREQ / BAUD; // computed here, not overridable</pre>

<h3>$clog2 — right-sizing a counter</h3>
<p><code>$clog2(N)</code> returns the number of bits needed to hold N distinct values (ceiling of log₂N). Use it to size counters automatically so they are never too wide or too narrow:</p>
<pre class="code-block">parameter N = 100;
logic [$clog2(N)-1:0] cnt;   // $clog2(100)=7 -&gt; 7-bit counter
// $clog2(8)   = 3  -&gt; 3-bit counter (0-7)
// $clog2(10)  = 4  -&gt; 4-bit counter (0-9)
// $clog2(434) = 9  -&gt; 9-bit counter (0-511)</pre>

<h3>Overriding parameters at instantiation</h3>
<p>Use <code>#(.PARAM_NAME(value))</code> when you place a module. Unspecified parameters keep their defaults. This is how the UART testbench in L3 replaces a 50 MHz real-time simulation with a 10-cycle one:</p>
<pre class="code-block">prescaler #(.N(4))  div4  (.clk(clk), .rst(rst), .tick(t4));
prescaler #(.N(16)) div16 (.clk(clk), .rst(rst), .tick(t16));
// Both use the same module file — N is the only difference</pre>

<h3>You will build</h3>
<p>Module <code>prescaler</code>: parameter N (default 8). Outputs a 1-cycle <code>tick</code> pulse every N clock cycles. Testbench overrides N=4 and counts ticks to verify timing.</p>

<p><strong>Ready?</strong> Switch to Code and type the module. Stuck? Tap 💡 Show Hint for the complete reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module prescaler #(',
        '── Line 2 ──  parameter N = 8',
        '── Line 3 ──  ) (',
        '── Line 4 ──  input  logic clk,',
        '── Line 5 ──  input  logic rst,',
        '── Line 6 ──  output logic tick        ← NO comma on last port',
        '── Line 7 ──  );',
        '── Line 8 ──  logic [$clog2(N)-1:0] cnt;   ← auto-sized counter',
        '── Line 9 ──  always_ff @(posedge clk or posedge rst) begin',
        "── Line 10──  if (rst) begin  cnt <= '0;  tick <= 1'b0;  end",
        "── Line 11──  else if (cnt == N-1) begin  cnt <= '0;  tick <= 1'b1;  end",
        "── Line 12──  else begin  cnt <= cnt + 1;  tick <= 1'b0;  end",
        '── Line 13──  end',
        '── Line 14──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines for N=4 tick timing should appear',
      ],
      hint:
`module prescaler #(
  parameter N = 8       // divide by N (default 8, overridable)
) (
  input  logic clk,
  input  logic rst,
  output logic tick     // 1-cycle pulse every N clock cycles
);

  logic [$clog2(N)-1:0] cnt;  // just enough bits to count 0..N-1

  always_ff @(posedge clk or posedge rst) begin
    if (rst) begin
      cnt  <= '0;        // '0 = all zeros, works for any width
      tick <= 1'b0;
    end else if (cnt == N-1) begin
      cnt  <= '0;        // reset counter
      tick <= 1'b1;      // fire tick for 1 cycle
    end else begin
      cnt  <= cnt + 1;
      tick <= 1'b0;
    end
  end

endmodule`,
      design:
`// Type the prescaler module here.
// Read Theory first -- it explains parameter, localparam, and $clog2.
//
// Module: prescaler
// Parameter: N (default 8) -- divides clock by N
// Ports:
//   input  logic clk, rst
//   output logic tick  -- 1-cycle pulse every N clock cycles
//
// Key line: logic [$clog2(N)-1:0] cnt;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst, tick;
  integer tick_count;

  // Override: divide by 4 instead of default 8
  prescaler #(.N(4)) dut (.clk(clk), .rst(rst), .tick(tick));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; tick_count = 0;
    @(posedge clk); #1; rst = 0;

    // Count ticks over 40 cycles: should get exactly 10 ticks (40/4=10)
    begin : count_ticks
      integer i;
      for (i = 0; i < 40; i = i + 1) begin
        @(posedge clk); #1;
        if (tick === 1'b1) tick_count = tick_count + 1;
      end
    end

    if (tick_count === 10)
      $display("PASS  Got %0d ticks in 40 cycles (N=4)", tick_count);
    else
      $display("FAIL  Got %0d ticks, expected 10", tick_count);

    // Verify first tick fires at exactly cycle 4
    rst = 1; @(posedge clk); #1; rst = 0;
    repeat(3) @(posedge clk); #1;
    @(posedge clk); #1;
    if (tick === 1'b1)
      $display("PASS  First tick at cycle 4");
    else
      $display("FAIL  Tick at wrong cycle: tick=%0b", tick);

    $display("Prescaler works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Got 10 ticks in 40 cycles (N=4)',
        'Prescaler works!'
      ]
    },

    // ── L2 Baud Rate Generator (Tier 3) ────────────────────────────────────
    {
      id: 'msv6l2',
      title: 'L2 — Baud Rate Generator',
      theory: `
<h2>Baud Rate Generator: The Heartbeat of UART</h2>
<p>In L1 you learned <code>parameter</code>, <code>localparam</code>, and <code>$clog2</code>. Now apply those tools to build the <strong>baud rate generator</strong> — the timing component every UART depends on. If baud timing is off by even a few percent, every received byte is corrupted.</p>

<h3>What is baud rate?</h3>
<p>Baud rate is bits-per-second on the serial line. At 115200 baud, one bit lasts:</p>
<pre class="code-block">bit_period = 1 / 115_200 ≈ 8.68 µs</pre>
<p>With a 50 MHz system clock (20 ns per tick), one bit spans exactly:</p>
<pre class="code-block">BAUD_DIV = 50_000_000 / 115_200 = 434 clock cycles per bit</pre>

<h3>The baud_tick pulse</h3>
<p>The generator counts from 0 to BAUD_DIV-1, resets, and fires a 1-cycle <code>baud_tick</code> pulse. Downstream logic uses this tick to advance one bit at a time. This is the prescaler from L1 — with UART-specific parameter names:</p>
<pre class="code-block">localparam BAUD_DIV = CLK_FREQ / BAUD;
logic [$clog2(BAUD_DIV)-1:0] cnt;

// cnt: 0 -&gt; BAUD_DIV-1 -&gt; 0 -&gt; ...
// baud_tick = 1'b1 for exactly 1 cycle each rollover</pre>

<h3>Why build this separately?</h3>
<p>The UART transmitter in L3 embeds this counter inside a larger FSM. Testing the baud generator alone verifies timing before you add FSM complexity. Build small, test small — it is faster than debugging the full design.</p>

<h3>Testbench shortcut</h3>
<p>At real clock rates, BAUD_DIV=434 requires 434-cycle waits in simulation. Override: <code>#(.CLK_FREQ(10), .BAUD(1))</code> gives BAUD_DIV=10 — easy to count by hand. The RTL logic is identical; only the timing constant changes.</p>

<h3>You will build</h3>
<p>Module <code>baud_gen</code>: parameters CLK_FREQ (default 50_000_000) and BAUD (default 115_200). Output: <code>baud_tick</code> — high for 1 cycle every BAUD_DIV cycles.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for the complete design.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module baud_gen #(',
        '── Line 2 ──  parameter CLK_FREQ = 50_000_000,    ← system clock Hz',
        '── Line 3 ──  parameter BAUD     = 115_200         ← bits per second',
        '── Line 4 ──  ) (',
        '── Line 5 ──  input  logic clk,',
        '── Line 6 ──  input  logic rst,',
        '── Line 7 ──  output logic baud_tick               ← NO comma',
        '── Line 8 ──  );',
        '── Line 9 ──  localparam BAUD_DIV = CLK_FREQ / BAUD;   ← ticks per bit',
        '── Line 10──  logic [$clog2(BAUD_DIV)-1:0] cnt;        ← auto-sized',
        '── Line 11──  always_ff @(posedge clk or posedge rst) begin',
        "── Line 12──  if (rst) begin  cnt <= '0;  baud_tick <= 1'b0;  end",
        "── Line 13──  else if (cnt == BAUD_DIV-1) begin  cnt <= '0;  baud_tick <= 1'b1;  end",
        "── Line 14──  else begin  cnt <= cnt + 1;  baud_tick <= 1'b0;  end",
        '── Line 15──  end',
        '── Line 16──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — tick should fire every 10 cycles when CLK_FREQ=10 BAUD=1',
      ],
      hint:
`module baud_gen #(
  parameter  CLK_FREQ = 50_000_000,   // system clock (Hz)
  parameter  BAUD     = 115_200       // baud rate (bits/sec)
) (
  input  logic clk,
  input  logic rst,
  output logic baud_tick              // 1-cycle pulse every BAUD_DIV cycles
);

  localparam BAUD_DIV = CLK_FREQ / BAUD;           // ticks per bit period
  logic [$clog2(BAUD_DIV)-1:0] cnt;                // auto-sized counter

  always_ff @(posedge clk or posedge rst) begin
    if (rst) begin
      cnt       <= '0;
      baud_tick <= 1'b0;
    end else if (cnt == BAUD_DIV - 1) begin
      cnt       <= '0;
      baud_tick <= 1'b1;   // pulse for exactly 1 cycle
    end else begin
      cnt       <= cnt + 1;
      baud_tick <= 1'b0;
    end
  end

endmodule`,
      design:
`// Type the baud_gen module here. Read Theory for the formula.
//
// Module: baud_gen
// Parameters: CLK_FREQ (default 50_000_000), BAUD (default 115_200)
// Ports:
//   input  logic clk, rst
//   output logic baud_tick  -- 1-cycle pulse every (CLK_FREQ/BAUD) cycles
//
// Key lines:
//   localparam BAUD_DIV = CLK_FREQ / BAUD;
//   logic [$clog2(BAUD_DIV)-1:0] cnt;
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst, baud_tick;
  integer tick_count;
  integer first_tick;
  integer cycle_cnt;

  // CLK_FREQ=10, BAUD=1 -> BAUD_DIV=10 -> tick every 10 cycles
  baud_gen #(.CLK_FREQ(10), .BAUD(1)) dut (.clk(clk), .rst(rst), .baud_tick(baud_tick));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; tick_count = 0; first_tick = -1; cycle_cnt = 0;
    @(posedge clk); #1; rst = 0;

    begin : count_loop
      integer i;
      for (i = 0; i < 50; i = i + 1) begin
        @(posedge clk); #1;
        cycle_cnt = cycle_cnt + 1;
        if (baud_tick === 1'b1) begin
          tick_count = tick_count + 1;
          if (first_tick == -1) first_tick = cycle_cnt;
        end
      end
    end

    if (tick_count === 5)
      $display("PASS  Got %0d ticks in 50 cycles (BAUD_DIV=10)", tick_count);
    else
      $display("FAIL  Got %0d ticks, expected 5", tick_count);

    if (first_tick === 10)
      $display("PASS  First tick at cycle %0d", first_tick);
    else
      $display("FAIL  First tick at cycle %0d, expected 10", first_tick);

    $display("Baud generator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Got 5 ticks in 50 cycles (BAUD_DIV=10)',
        'Baud generator works!'
      ]
    },

    // ── L3 UART Transmitter (Tier 4, line-by-line) ────────────────────────
    {
      id: 'msv6l3',
      title: 'L3 — UART Transmitter',
      theory: `
<h2>UART Transmitter: Putting It All Together</h2>
<p>You now have every building block needed:</p>
<ul>
  <li><strong>L1:</strong> <code>parameter</code>, <code>localparam</code>, <code>$clog2</code>, <code>#(.p(v))</code> override</li>
  <li><strong>L2:</strong> Baud rate counter — fires a tick every bit period</li>
  <li><strong>msv4:</strong> <code>typedef enum</code> FSM with <code>always_ff</code></li>
  <li><strong>msv2 L3:</strong> Shift register — moves bits one at a time</li>
</ul>
<p>This lesson combines all four into a working UART transmitter.</p>

<h3>UART frame format</h3>
<pre class="code-block">Idle:      TX = 1  (line always high when idle)
Start bit: TX = 0  (1 bit period -- receiver detects falling edge)
Data:      8 bits, LSB first (bit 0 transmitted first)
Stop bit:  TX = 1  (1 bit period -- marks end of frame)
Total:     10 bit-periods per byte</pre>

<h3>What lives inside uart_tx</h3>
<table class="truth-table">
  <tr><th>Part</th><th>Learned in</th><th>Role</th></tr>
  <tr><td>parameter CLK_FREQ, BAUD</td><td>msv6 L1</td><td>Makes module reusable at any clock speed</td></tr>
  <tr><td>localparam BAUD_DIV</td><td>msv6 L1</td><td>Clock ticks per bit period</td></tr>
  <tr><td>baud_cnt counter</td><td>msv6 L2</td><td>Times exactly one bit period</td></tr>
  <tr><td>typedef enum FSM</td><td>msv4 L1</td><td>IDLE / START / DATA / STOP states</td></tr>
  <tr><td>shift_reg &gt;&gt; 1</td><td>msv2 L3</td><td>Outputs bits LSB-first, one per baud tick</td></tr>
  <tr><td>bit_cnt [2:0]</td><td>msv2 L4</td><td>Counts 0-7 to know when 8 bits are done</td></tr>
</table>

<h3>FSM state table</h3>
<table class="truth-table">
  <tr><th>State</th><th>tx output</th><th>busy</th><th>Exits when</th></tr>
  <tr><td>IDLE</td><td>1 (idle high)</td><td>0</td><td>send=1 → START</td></tr>
  <tr><td>START</td><td>0 (start bit)</td><td>1</td><td>baud_cnt == BAUD_DIV-1 → DATA</td></tr>
  <tr><td>DATA</td><td>shift_reg[0] (LSB first)</td><td>1</td><td>8 baud ticks done → STOP</td></tr>
  <tr><td>STOP</td><td>1 (stop bit)</td><td>1</td><td>baud_cnt == BAUD_DIV-1 → IDLE</td></tr>
</table>

<h3>The shift register</h3>
<pre class="code-block">// On entering START: load the byte
shift_reg &lt;= data;

// Each baud tick in DATA: output LSB, shift right
tx        &lt;= shift_reg[0];
shift_reg &lt;= shift_reg &gt;&gt; 1;    // next bit becomes [0]</pre>

<p><strong>Ready?</strong> Follow the tasks tab line by line. This module is 63 lines — work one block at a time. Stuck? Tap 💡 for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        '── PART 1: Module header ──',
        '── Line 1  ──  module uart_tx #(',
        '── Line 2  ──  parameter CLK_FREQ = 50_000_000,',
        '── Line 3  ──  parameter BAUD     = 115_200',
        '── Line 4  ──  ) (',
        '── Line 5  ──  input  logic       clk,',
        '── Line 6  ──  input  logic       rst,',
        '── Line 7  ──  input  logic       send,',
        '── Line 8  ──  input  logic [7:0] data,',
        '── Line 9  ──  output logic       tx,',
        '── Line 10 ──  output logic       busy              ← NO comma',
        '── Line 11 ──  );',
        '── PART 2: Internal signals ──',
        '── Line 12 ──  localparam BAUD_DIV = CLK_FREQ / BAUD;',
        '── Line 13 ──  typedef enum logic [1:0] { IDLE, START, DATA, STOP } state_t;',
        '── Line 14 ──  state_t state;',
        '── Line 15 ──  logic [$clog2(BAUD_DIV)-1:0] baud_cnt;',
        '── Line 16 ──  logic [7:0] shift_reg;',
        '── Line 17 ──  logic [2:0] bit_cnt;',
        '── PART 3: Reset ──',
        '── Line 18 ──  always_ff @(posedge clk or posedge rst) begin',
        '── Line 19 ──  if (rst) begin',
        '── Line 20 ──    state    <= IDLE;',
        "── Line 21 ──    baud_cnt <= '0;",
        "── Line 22 ──    bit_cnt  <= '0;",
        "── Line 23 ──    tx       <= 1'b1;    ← idle-high",
        "── Line 24 ──    busy     <= 1'b0;",
        '── Line 25 ──  end',
        '── PART 4: IDLE state ──',
        '── Line 26 ──  else if (state == IDLE) begin',
        "── Line 27 ──    tx   <= 1'b1;",
        "── Line 28 ──    busy <= 1'b0;",
        '── Line 29 ──    if (send) begin',
        '── Line 30 ──      shift_reg <= data;',
        "── Line 31 ──      baud_cnt  <= '0;",
        "── Line 32 ──      bit_cnt   <= '0;",
        '── Line 33 ──      state     <= START;',
        "── Line 34 ──      busy      <= 1'b1;",
        '── Line 35 ──    end',
        '── Line 36 ──  end',
        '── PART 5: START state (sends start bit = 0) ──',
        '── Line 37 ──  else if (state == START) begin',
        "── Line 38 ──    tx <= 1'b0;",
        '── Line 39 ──    if (baud_cnt == BAUD_DIV-1) begin',
        "── Line 40 ──      baud_cnt <= '0;",
        '── Line 41 ──      state    <= DATA;',
        '── Line 42 ──    end else baud_cnt <= baud_cnt + 1;',
        '── Line 43 ──  end',
        '── PART 6: DATA state (8 bits, LSB first) ──',
        '── Line 44 ──  else if (state == DATA) begin',
        '── Line 45 ──    tx <= shift_reg[0];',
        '── Line 46 ──    if (baud_cnt == BAUD_DIV-1) begin',
        "── Line 47 ──      baud_cnt  <= '0;",
        '── Line 48 ──      shift_reg <= shift_reg >> 1;',
        "── Line 49 ──      if (bit_cnt == 3'd7) begin",
        '── Line 50 ──        state <= STOP;',
        '── Line 51 ──      end else',
        '── Line 52 ──        bit_cnt <= bit_cnt + 1;',
        '── Line 53 ──    end else baud_cnt <= baud_cnt + 1;',
        '── Line 54 ──  end',
        '── PART 7: STOP state (sends stop bit = 1) ──',
        '── Line 55 ──  else if (state == STOP) begin',
        "── Line 56 ──    tx <= 1'b1;",
        '── Line 57 ──    if (baud_cnt == BAUD_DIV-1) begin',
        '── Line 58 ──      state <= IDLE;',
        "── Line 59 ──      busy  <= 1'b0;",
        '── Line 60 ──    end else baud_cnt <= baud_cnt + 1;',
        '── Line 61 ──  end',
        '── Line 62 ──  end   ← closes always_ff',
        '── Line 63 ──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS for busy=1 at start, then PASS for busy=0 at end of frame',
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
      if (send): shift_reg=data, baud_cnt=0, bit_cnt=0, state=START, busy=1

    START:
      tx=0
      when baud_cnt==BAUD_DIV-1: reset baud_cnt, state=DATA

    DATA:
      tx=shift_reg[0]
      when baud_cnt==BAUD_DIV-1:
        shift_reg >>= 1, baud_cnt=0
        if bit_cnt==7: state=STOP  else: bit_cnt++

    STOP:
      tx=1
      when baud_cnt==BAUD_DIV-1: state=IDLE, busy=0

  Testbench uses CLK_FREQ=10, BAUD=1 so BAUD_DIV=10.
  Full frame = 10+80+10 = 100 cycles. Wait 110 after send.`,
      design:
`// Build the uart_tx module here. Follow the tasks tab line by line.
//
// Module: uart_tx
// Parameters: CLK_FREQ (default 50_000_000), BAUD (default 115_200)
// Ports: clk, rst, send, data[7:0] (inputs)  tx, busy (outputs)
// States: IDLE -> START -> DATA (8 bits) -> STOP -> IDLE
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, send, tx, busy;
  logic [7:0] data;

  uart_tx #(.CLK_FREQ(10), .BAUD(1)) dut(
    .clk(clk), .rst(rst), .send(send), .data(data), .tx(tx), .busy(busy));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; send = 0; data = 0;
    @(posedge clk); #1; rst = 0;

    data = 8'h55; send = 1;
    @(posedge clk); #1; send = 0;

    if (busy === 1'b1)
      $display("PASS  TX started: busy=1");
    else
      $display("FAIL  TX should be busy, got busy=%0b", busy);

    repeat(110) @(posedge clk); #1;

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

    // ── L4 UART Receiver (Tier 4) ──────────────────────────────────────────
    {
      id: 'msv6l4',
      title: 'L4 — UART Receiver',
      theory: `
<h2>UART Receiver: Center Sampling</h2>
<p>Receiving is harder than transmitting. The receiver must detect the falling edge of the start bit and sample each bit at its <em>center</em> to avoid noise at the edges.</p>

<h3>Center-sampling strategy</h3>
<pre class="code-block">Detect falling edge (start bit) -&gt; wait BAUD_DIV/2 cycles
Now at center of start bit -&gt; verify still 0
Every BAUD_DIV cycles after that -&gt; sample at center</pre>

<h3>FSM states</h3>
<table class="truth-table">
  <tr><th>State</th><th>Action</th></tr>
  <tr><td>IDLE</td><td>Wait for rx=0 (start bit)</td></tr>
  <tr><td>START</td><td>Wait BAUD_DIV/2 cycles to reach center</td></tr>
  <tr><td>DATA</td><td>Sample rx every BAUD_DIV cycles, 8 bits</td></tr>
  <tr><td>STOP</td><td>Wait 1 bit period, pulse valid=1 for 1 cycle</td></tr>
</table>

<h3>The valid pulse</h3>
<p><code>valid</code> is asserted for <strong>exactly one clock cycle</strong>. Latch it in the testbench:</p>
<pre class="code-block">always_ff @(posedge clk)
  if (valid) got_valid &lt;= 1'b1;</pre>

<h3>You will build</h3>
<p>Module <code>uart_rx</code>: same parameters as uart_tx. Inputs: <code>clk, rst, rx</code>. Outputs: <code>data[7:0], valid</code>.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Same parameters as uart_tx: CLK_FREQ, BAUD, BAUD_DIV',
        'States: IDLE, START, DATA, STOP',
        'In IDLE: detect rx=0 (falling edge of start bit)',
        'In START: wait BAUD_DIV/2 cycles to reach center of start bit',
        'In DATA: sample rx every BAUD_DIV cycles into shift_reg (LSB first), count 8 bits',
        'In STOP: wait 1 bit period, pulse valid=1 for exactly 1 cycle, output shift_reg',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — received byte should match 0xA5',
      ],
      hint:
`DESIGN NOTES for uart_rx:

  State behavior:
    IDLE:  if (!rx): go to START, reset baud_cnt
    START: wait baud_cnt == BAUD_DIV/2-1, go to DATA
    DATA:  every baud_cnt==BAUD_DIV-1: shift_reg={rx,shift_reg[7:1]}, bit_cnt++
           if bit_cnt==7: go to STOP
    STOP:  wait baud_cnt==BAUD_DIV-1, data<=shift_reg, valid<=1, go to IDLE

  valid is a 1-cycle pulse — latch it in testbench with always_ff.`,
      design:
`// Build the uart_rx module here.
// States: IDLE -> START (half-period delay) -> DATA (8 bits) -> STOP -> IDLE
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, rx, valid;
  logic [7:0] data;
  logic       got_valid;

  uart_rx #(.CLK_FREQ(10), .BAUD(1)) dut(
    .clk(clk), .rst(rst), .rx(rx), .data(data), .valid(valid));

  always #5 clk = ~clk;

  always_ff @(posedge clk)
    if (valid) got_valid <= 1'b1;

  task drive_bit(input logic b);
    integer k;
    for (k = 0; k < 10; k = k + 1) begin
      rx = b; @(posedge clk); #1;
    end
  endtask

  initial begin
    clk = 0; rst = 1; rx = 1; got_valid = 0;
    @(posedge clk); #1; rst = 0;

    drive_bit(0);    // start
    drive_bit(1);    // bit 0
    drive_bit(0);    // bit 1
    drive_bit(1);    // bit 2
    drive_bit(0);    // bit 3
    drive_bit(0);    // bit 4
    drive_bit(1);    // bit 5
    drive_bit(0);    // bit 6
    drive_bit(1);    // bit 7
    drive_bit(1);    // stop

    repeat(15) @(posedge clk); #1;

    if (got_valid === 1'b1 && data === 8'hA5)
      $display("PASS  Received 0x%h correctly", data);
    else
      $display("FAIL  got_valid=%0b data=0x%h", got_valid, data);

    $display("UART RX works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Received 0xa5 correctly',
        'UART RX works!'
      ]
    },

    // ── L5 Portfolio: SPI Master (Tier 5) ─────────────────────────────────
    {
      id: 'msv6l5',
      title: 'L5 — Portfolio: SPI Master',
      theory: `
<h2>Portfolio Project: SPI Master Controller</h2>
<p><strong>SPI</strong> (Serial Peripheral Interface) is the fastest common serial bus. Every ADC, DAC, flash chip, and display driver uses SPI. Unlike UART, SPI is synchronous — the master provides <code>sclk</code> which both sides use.</p>

<h3>SPI signals</h3>
<table class="truth-table">
  <tr><th>Signal</th><th>Direction</th><th>Description</th></tr>
  <tr><td>sclk</td><td>Master → Slave</td><td>Serial clock</td></tr>
  <tr><td>mosi</td><td>Master → Slave</td><td>Master Out Slave In</td></tr>
  <tr><td>miso</td><td>Slave → Master</td><td>Master In Slave Out</td></tr>
  <tr><td>cs_n</td><td>Master → Slave</td><td>Chip Select, active LOW</td></tr>
</table>

<h3>CPOL=0 CPHA=0 (Mode 0)</h3>
<pre class="code-block">cs_n  ‾‾‾___________________________________________‾‾‾
sclk  ‾‾‾_‾_‾_‾_‾_‾_‾_‾_‾‾‾  (8 pulses)
mosi  ---[b7][b6][b5][b4][b3][b2][b1][b0]---</pre>

<p><strong>Ready?</strong> Switch to Code. No hint — this is your portfolio piece. Plan on paper first.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Module: spi_master',
        'Inputs: clk, rst, start, tx_data[7:0], miso',
        'Outputs: sclk, mosi, cs_n, rx_data[7:0], done',
        'CPOL=0 CPHA=0: clock idles low, sample on rising sclk edge, MSB first',
        'cs_n=0 during transfer, done pulses 1 cycle when complete',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — done should pulse and rx_data should match miso byte',
        '🎓 Portfolio piece — push to your GitHub',
      ],
      hint: `No hint for portfolio projects. SPI checklist:
1. States: IDLE, TRANSFER, DONE.
2. sclk toggles every N system clocks (use parameter for divider).
3. Drive mosi on falling sclk edges, sample miso on rising sclk edges.
4. Count 8 bit-pairs. cs_n=0 during TRANSFER.
5. After 8 bits: done=1 for 1 cycle, output rx_data, return to IDLE.`,
      design:
`// Build the spi_master module here.
// CPOL=0 CPHA=0, 8-bit transfer, MSB first.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, start, miso, sclk, mosi, cs_n, done;
  logic [7:0] tx_data, rx_data;
  logic       got_done;

  spi_master dut(.clk(clk), .rst(rst), .start(start), .miso(miso),
                 .tx_data(tx_data), .sclk(sclk), .mosi(mosi),
                 .cs_n(cs_n), .rx_data(rx_data), .done(done));

  always #5 clk = ~clk;

  integer miso_bit;
  initial begin
    miso = 1; miso_bit = 7;
    @(negedge cs_n);
    repeat(8) begin
      @(posedge sclk); miso = 8'hC3 >> miso_bit & 1;
      miso_bit = miso_bit - 1;
    end
  end

  always_ff @(posedge clk) if (done) got_done <= 1'b1;

  initial begin
    clk = 0; rst = 1; start = 0; tx_data = 0; got_done = 0;
    @(posedge clk); #1; rst = 0;
    tx_data = 8'hA5; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(200) @(posedge clk); #1;
    if (got_done === 1'b1)
      $display("PASS  done pulsed");
    else
      $display("FAIL  done never pulsed");
    if (rx_data === 8'hC3)
      $display("PASS  Received 0x%h from slave", rx_data);
    else
      $display("FAIL  rx_data=0x%h expected 0xC3", rx_data);
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

    // ── L6 Portfolio: I2C Controller (Tier 5) ─────────────────────────────
    {
      id: 'msv6l6',
      title: 'L6 — Portfolio: I2C Controller',
      theory: `
<h2>Portfolio Project: I2C Master Controller</h2>
<p><strong>I2C</strong> uses only 2 wires: SDA (data) and SCL (clock). Every EEPROM, temperature sensor, and OLED display uses I2C. This is the Systems Engineer certificate project — the hardest protocol in this module.</p>

<h3>Open-drain bus and tristate — new syntax</h3>
<p>Both SDA and SCL are open-drain. Model with a tristate driver:</p>
<pre class="code-block">inout wire sda;           // bidirectional port — new keyword
logic sda_oe;             // output enable
assign sda = sda_oe ? 1'b0 : 1'bz;  // 1'bz = high-impedance (released)
// Pull-up resistor holds SDA high when released</pre>

<h3>START and STOP conditions</h3>
<pre class="code-block">START: SDA falls while SCL is HIGH
STOP:  SDA rises while SCL is HIGH</pre>

<h3>I2C write transaction</h3>
<pre class="code-block">START -&gt; 7-bit addr + W(0) -&gt; ACK -&gt; 8 data bits -&gt; ACK -&gt; STOP</pre>

<p><strong>Ready?</strong> Switch to Code. No hint — this is a Systems Engineer certificate project. Plan every state on paper first.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Module: i2c_master with inout wire sda',
        'assign sda = sda_oe ? 1\'b0 : 1\'bz  (open-drain model)',
        'START: pull SDA low while SCL high',
        'Send 7-bit addr + write bit, then receive ACK (release SDA, sample on SCL high)',
        'Send 8 data bits, receive ACK again',
        'STOP: release SDA while SCL high',
        'Set ack_err=1 if NACK received',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — verify busy=0 and no ACK errors',
        '🎓 Systems Engineer certificate — push to your GitHub when complete',
        'Congratulations — you have completed the Serial Protocols module!',
      ],
      hint: `No hint for certificate projects. I2C roadmap:

States: IDLE -> START -> ADDR(9) -> DATA(9) -> STOP -> IDLE

Bit clock: counter at CLK_FREQ/(4*I2C_FREQ) for quarter-period timing.
SCL phases per bit: low1, rising, high, falling.
SDA changes in low phase (except START/STOP which change in high phase).

ACK: release SDA on 9th clock, sample on SCL high. SDA=0 is ACK, SDA=1 is NACK.

Open-drain: assign sda = sda_oe ? 1'b0 : 1'bz;`,
      design:
`// Build the i2c_master module here. Systems Engineer certificate project.
// inout wire sda;  logic sda_oe;  assign sda = sda_oe ? 1'b0 : 1'bz;
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic       clk, rst, start_xfer, busy, ack_err, scl;
  logic [6:0] addr;
  logic [7:0] wdata;
  wire        sda;
  logic       sda_slave_oe;

  assign sda = sda_slave_oe ? 1'b0 : 1'bz;

  i2c_master #(.CLK_FREQ(100), .I2C_FREQ(10)) dut(
    .clk(clk), .rst(rst), .start_xfer(start_xfer),
    .addr(addr), .wdata(wdata),
    .sda(sda), .scl(scl), .busy(busy), .ack_err(ack_err));

  always #5 clk = ~clk;

  integer scl_cnt;
  initial begin
    sda_slave_oe = 0; scl_cnt = 0;
    forever begin
      @(posedge scl); scl_cnt = scl_cnt + 1;
      if (scl_cnt == 9 || scl_cnt == 18) begin
        @(negedge scl); sda_slave_oe = 1;
        @(negedge scl); sda_slave_oe = 0;
      end
    end
  end

  initial begin
    clk = 0; rst = 1; start_xfer = 0; addr = 7'h4A; wdata = 8'h37;
    @(posedge clk); #1; rst = 0;
    start_xfer = 1; @(posedge clk); #1; start_xfer = 0;
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
