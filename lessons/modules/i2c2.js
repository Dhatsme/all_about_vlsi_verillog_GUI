(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c2',
  title: 'Bit-Banging the Bus',
  icon: '⚡',
  level: 'beginner',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — SCL Clock Generator  (Tier 2)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c2l1',
      title: 'L1 — SCL Clock Generator',
      theory: `
<h2>Where this circuit lives in the real world</h2>
<p>The Arduino Uno microcontroller has no dedicated I²C hardware. When you call <code>Wire.begin()</code> in Arduino code, the library toggles two GPIO pins in software to mimic the I²C waveform — this is called <strong>bit-banging</strong>. Every FPGA and ASIC I²C block does the same thing in hardware: it runs a counter that divides the fast system clock down into a slow SCL clock. You are about to build exactly that divider.</p>

<h2>What the output looks like</h2>
<pre class="code-block">system clk: ‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾|_|‾
counter:        0   1   2   3   4   0   1   2   3   4
                                    ↑ toggle SCL here
SCL out:    ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|_________________|‾‾
                 ← CLK_DIV/2 clocks →← CLK_DIV/2 clocks→</pre>

<h2>Frequency dividers — the physical analogy</h2>
<p>Think of a metronome set to 120 beats per minute, and you want a slower tick at 60 BPM. You count two fast beats and then click — that is a divide-by-2. Here we count <code>CLK_DIV/2</code> system clocks before toggling SCL, so the SCL period is exactly <code>CLK_DIV</code> system clock cycles. Standard 400 kHz I²C from a 100 MHz system clock needs <code>CLK_DIV = 250</code>; in the testbench we use <code>CLK_DIV = 10</code> to keep simulation fast.</p>

<h3>The counter pattern</h3>
<pre class="code-block">// Counter counts 0 .. (CLK_DIV/2 - 1) then wraps to 0
always_ff @(posedge clk) begin
  if (!rst || !en) begin
    cnt &lt;= 0;
    scl &lt;= 1;
  end else if (cnt == CLK_DIV/2 - 1) begin
    cnt &lt;= 0;
    scl &lt;= ~scl;    // toggle SCL every half-period
  end else begin
    cnt &lt;= cnt + 1;
  end
end</pre>

<table class="truth-table">
  <tr><th>cnt value</th><th>Action</th><th>SCL</th></tr>
  <tr><td>0 .. CLK_DIV/2-2</td><td>count up</td><td>unchanged</td></tr>
  <tr><td>CLK_DIV/2-1</td><td>reset cnt, toggle SCL</td><td>flips</td></tr>
  <tr><td>en = 0</td><td>hold reset</td><td>1 (released)</td></tr>
</table>

<h2>Before you code</h2>
<p>What you are about to build is a frequency divider that counts fast clock ticks and toggles its output every half-period. When <code>en</code> is high it generates a steady square wave on <code>scl</code>; when <code>en</code> is low the counter holds and SCL stays high (the idle state for the I²C bus).</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>The fast system clock that drives the counter — runs continuously.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — clears the counter and releases SCL high.</td></tr>
  <tr><td><code>en</code></td><td>input logic</td><td>Enable: 1 = run the clock generator; 0 = stop and hold SCL high.</td></tr>
  <tr><td><code>scl</code></td><td>output logic</td><td>The generated I²C clock signal — a square wave at system_clk / CLK_DIV.</td></tr>
</table>
<p>Parameter: <code>CLK_DIV = 10</code> (the number of system clock cycles per SCL period).</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module i2c_clk_gen #(parameter CLK_DIV = 10) (',
        '── Line 2 ──  input  logic clk,    ← comma',
        '── Line 3 ──  input  logic rst,    ← comma (synchronous active-low reset)',
        '── Line 4 ──  input  logic en,     ← comma (enable the clock generator)',
        '── Line 5 ──  output logic scl     ← NO comma (last port)',
        '── Line 6 ──  );',
        '── Line 7 ──  Declare internal counter: logic [$clog2(CLK_DIV)-1:0] cnt;',
        '── Line 8 ──  always_ff @(posedge clk) begin',
        '── Line 9 ──    if (!rst || !en) begin  ← reset OR disabled: hold state',
        '── Line 10 ──     cnt <= 0;',
        '── Line 11 ──     scl <= 1;             ← SCL idles high on the I²C bus',
        '── Line 12 ──   end else if (cnt == CLK_DIV/2 - 1) begin  ← half-period done?',
        '── Line 13 ──     cnt <= 0;             ← wrap counter',
        '── Line 14 ──     scl <= ~scl;          ← toggle the clock',
        '── Line 15 ──   end else begin',
        '── Line 16 ──     cnt <= cnt + 1;       ← count up',
        '── Line 17 ──   end',
        '── Line 18 ──  end',
        '── Line 19 ──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_clk_gen #(parameter CLK_DIV = 10) (
  input  logic clk,     // fast system clock
  input  logic rst,     // synchronous active-low reset
  input  logic en,      // 1 = run; 0 = stop, SCL stays high
  output logic scl      // generated I2C clock
);
  logic [$clog2(CLK_DIV)-1:0] cnt;  // counter wide enough for CLK_DIV

  always_ff @(posedge clk) begin
    if (!rst || !en) begin      // reset or disabled
      cnt <= 0;
      scl <= 1;                 // I2C bus idles high
    end else if (cnt == CLK_DIV/2 - 1) begin  // half-period complete
      cnt <= 0;                 // restart counter
      scl <= ~scl;              // flip the clock
    end else begin
      cnt <= cnt + 1;           // keep counting
    end
  end

endmodule`,
      design:
`// Type the i2c_clk_gen module here.
// Read Theory first -- it explains frequency division and the counter pattern.
//
// Ports:
//   input  logic clk        -- fast system clock
//   input  logic rst        -- synchronous active-low reset
//   input  logic en         -- 1 = run clock generator, 0 = hold SCL high
//   output logic scl        -- generated I2C SCL square wave
//
// Parameter: CLK_DIV = 10 (SCL period = CLK_DIV system clock cycles)
//
// Internal: logic [$clog2(CLK_DIV)-1:0] cnt  -- half-period counter
//
// Logic: count to CLK_DIV/2-1, then toggle scl and reset cnt.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;   // 100 MHz system clock

  logic rst, en;
  logic scl;

  i2c_clk_gen #(.CLK_DIV(10)) dut (
    .clk(clk), .rst(rst), .en(en), .scl(scl)
  );

  integer i;
  integer scl_edges;
  logic   prev_scl;

  initial begin
    \$display("=== I2C CLK Gen Test ===");

    // Test 1: reset holds SCL high
    rst = 0; en = 0;
    repeat(4) @(posedge clk); #1;
    if (scl === 1)
      \$display("PASS  reset: scl=1 (idle high)");
    else
      \$display("FAIL  reset: scl=%0b (expected 1)", scl);

    // Test 2: disabled (en=0) also holds SCL high
    rst = 1; en = 0;
    repeat(6) @(posedge clk); #1;
    if (scl === 1)
      \$display("PASS  disabled: scl=1 (held high)");
    else
      \$display("FAIL  disabled: scl=%0b (expected 1)", scl);

    // Test 3: enabled — count SCL edges over 3 full periods (60 clk cycles)
    // CLK_DIV=10 => SCL period = 10 system clocks => 6 edges in 60 cycles
    en = 1;
    prev_scl  = scl;
    scl_edges = 0;
    for (i = 0; i < 60; i++) begin
      @(posedge clk); #1;
      if (scl !== prev_scl) begin
        scl_edges = scl_edges + 1;
        prev_scl  = scl;
      end
    end
    if (scl_edges >= 5 && scl_edges <= 7)
      \$display("PASS  running: %0d SCL edges in 60 clk cycles", scl_edges);
    else
      \$display("FAIL  running: %0d SCL edges (expected ~6)", scl_edges);

    \$display("CLK gen works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: scl=1 (idle high)',
        'PASS  disabled: scl=1 (held high)',
        'PASS  running:',
        'CLK gen works!'
      ]
    },


    // ────────────────────────────────────────────────────────────────────
    // L2 — Data Bit Transmitter  (Tier 2)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c2l2',
      title: 'L2 — Data Bit Transmitter',
      theory: `
<h2>Where this rule matters in the real world</h2>
<p>Every I²C device ever made — from the humidity sensor on a drone to the EEPROM inside your SSD — obeys one cardinal rule: <strong>SDA must only change while SCL is LOW</strong>. If SDA moves while SCL is high, every device on the bus interprets it as a START or STOP condition, corrupting the current transfer. The bit transmitter you are about to build enforces that rule in hardware, making it physically impossible to violate.</p>

<h2>Setup and hold — visualised</h2>
<pre class="code-block">SCL:    _____|‾‾‾‾‾‾‾‾‾‾‾|_____
SDA:  XXXXX|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|XXX
             ↑                 ↑
        SDA stable         SDA may
        before rising      change only
        edge               after falling edge</pre>

<h2>The latch-on-falling-edge trick</h2>
<p>The safest moment to update SDA is right after SCL falls low — the receiver has already sampled the previous bit, and there is a full half-period before SCL rises again. We detect the falling edge of SCL with a 1-clock delay register (the same pattern you saw in i2c1 L2) and latch the new data bit at that instant:</p>
<pre class="code-block">logic scl_d;   // SCL from previous clock cycle

always_ff @(posedge clk) begin
  scl_d &lt;= scl;
  if (scl_d &amp;&amp; !scl)      // SCL just fell
    sda_reg &lt;= tx_data;   // safe to update SDA now
end</pre>

<h2>Open-drain reminder</h2>
<p>SDA is open-drain. The transmitter never drives it to 1 — it either pulls it low (0) or releases it (high-Z). To send a 1, release the wire and let the pull-up resistor do the work.</p>
<pre class="code-block">assign sda_out = sda_reg ? 1'bz : 1'b0;
//                   ↑ bit=1: release    ↑ bit=0: pull low</pre>

<table class="truth-table">
  <tr><th>SCL edge</th><th>sda_reg update</th><th>sda_out</th></tr>
  <tr><td>rising</td><td>no change (receiver samples here)</td><td>stable</td></tr>
  <tr><td>falling</td><td>latch tx_data</td><td>updates after latch</td></tr>
  <tr><td>rst=0</td><td>sda_reg = 1 (released)</td><td>1'bz</td></tr>
</table>

<h2>Before you code</h2>
<p>What you are about to build is a one-bit transmitter that watches SCL and only updates SDA at the safe moment — immediately after SCL falls low. It stores the current bit in an internal register so SDA stays stable for the entire SCL high phase.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>Fast system clock used to detect the SCL falling edge.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — releases SDA high (bus idle).</td></tr>
  <tr><td><code>scl</code></td><td>input logic</td><td>The I²C clock input — the transmitter watches this for falling edges.</td></tr>
  <tr><td><code>tx_data</code></td><td>input logic</td><td>The bit you want to send — latched onto SDA at the next SCL falling edge.</td></tr>
  <tr><td><code>sda_out</code></td><td>output logic</td><td>The open-drain SDA value: 0 to pull low, 1'bz to release (send a 1).</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        '── Line 1 ──  module i2c_bit_tx (',
        '── Line 2 ──  input  logic clk,      ← comma',
        '── Line 3 ──  input  logic rst,      ← comma (synchronous active-low reset)',
        '── Line 4 ──  input  logic scl,      ← comma (I²C clock to watch for falling edge)',
        '── Line 5 ──  input  logic tx_data,  ← comma (bit to transmit)',
        '── Line 6 ──  output logic sda_out   ← NO comma (last port)',
        '── Line 7 ──  );',
        '── Line 8 ──  Declare two internal logic signals: scl_d and sda_reg',
        '── Line 9 ──  always_ff @(posedge clk) begin',
        '── Line 10 ──   if (!rst) begin  ← reset: release bus',
        '── Line 11 ──     scl_d   <= 1;   sda_reg <= 1;',
        '── Line 12 ──   end else begin',
        '── Line 13 ──     scl_d <= scl;                    ← delay register for SCL',
        '── Line 14 ──     if (scl_d && !scl)               ← SCL just fell?',
        '── Line 15 ──       sda_reg <= tx_data;            ← latch new bit now',
        '── Line 16 ──   end',
        '── Line 17 ──  end',
        '── Line 18 ──  assign sda_out = sda_reg ? 1\'bz : 1\'b0;  ← open-drain driver',
        '── Line 19 ──  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_bit_tx (
  input  logic clk,       // system clock
  input  logic rst,       // synchronous active-low reset
  input  logic scl,       // I2C clock (generated externally)
  input  logic tx_data,   // bit to transmit
  output logic sda_out    // open-drain SDA output
);
  logic scl_d;    // SCL delayed one cycle (for falling-edge detect)
  logic sda_reg;  // registered bit value, holds SDA stable

  always_ff @(posedge clk) begin
    if (!rst) begin
      scl_d   <= 1;
      sda_reg <= 1;   // release bus on reset
    end else begin
      scl_d <= scl;
      if (scl_d && !scl)       // SCL fell: safe window to change SDA
        sda_reg <= tx_data;    // latch the new bit
    end
  end

  // Open-drain: pull low for 0, release (high-Z) for 1
  assign sda_out = sda_reg ? 1'bz : 1'b0;

endmodule`,
      design:
`// Type the i2c_bit_tx module here.
// Read Theory first -- it explains the I2C SDA timing rule.
//
// Ports: clk, rst, scl, tx_data (inputs), sda_out (output)
// Internal: logic scl_d   -- SCL delayed one cycle
//           logic sda_reg -- holds current SDA bit stable
//
// Logic:
//   Detect SCL falling edge: scl_d && !scl
//   On falling edge: sda_reg <= tx_data
//   Open-drain output: assign sda_out = sda_reg ? 1'bz : 1'b0
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  wire  sda_out;          // inout-style: observe as wire
  pullup pu(sda_out);     // simulate external pull-up

  logic rst, scl, tx_data;

  i2c_bit_tx dut (
    .clk(clk), .rst(rst), .scl(scl),
    .tx_data(tx_data), .sda_out(sda_out)
  );

  // Drive one falling SCL edge and wait a couple of system clocks
  task automatic scl_fall;
    scl = 1; @(posedge clk); #1;
    scl = 0; @(posedge clk); #1;
    @(posedge clk); #1;   // let latch settle
  endtask

  initial begin
    \$display("=== I2C Bit TX Test ===");

    // Reset: SDA should be released (1 via pull-up)
    rst = 0; scl = 1; tx_data = 0;
    repeat(3) @(posedge clk); #1;
    if (sda_out === 1)
      \$display("PASS  reset: sda_out=1 (released)");
    else
      \$display("FAIL  reset: sda_out=%0b (expected 1)", sda_out);

    rst = 1;

    // Transmit 0: after SCL falling edge, SDA should go low
    tx_data = 0;
    scl_fall();
    if (sda_out === 0)
      \$display("PASS  tx_data=0: sda_out=0 (pulled low)");
    else
      \$display("FAIL  tx_data=0: sda_out=%0b (expected 0)", sda_out);

    // Transmit 1: after next SCL falling edge, SDA should be released (1)
    tx_data = 1;
    scl_fall();
    if (sda_out === 1)
      \$display("PASS  tx_data=1: sda_out=1 (released)");
    else
      \$display("FAIL  tx_data=1: sda_out=%0b (expected 1)", sda_out);

    \$display("Bit TX works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: sda_out=1 (released)',
        'PASS  tx_data=0: sda_out=0 (pulled low)',
        'PASS  tx_data=1: sda_out=1 (released)',
        'Bit TX works!'
      ]
    },

    // L3 added next
  ]
});
