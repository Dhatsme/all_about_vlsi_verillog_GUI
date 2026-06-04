(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long1',
  title: 'SPI Protocol & Signal Definitions',
  icon: '🔌',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — SPI Signal Anatomy (Tier 1)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long1l1',
      title: 'L1 — MOSI, MISO, SCK, SS_n',

      theory: `
<h2>Imagine You Have a Brain and a Sensor</h2>
<p>
  Picture a small chip on a circuit board — the "brain" (your processor). It needs
  to talk to a sensor sitting next to it: maybe a temperature sensor, a pressure gauge,
  or a memory chip. The question is: how do two chips share information using as few
  wires as possible?
</p>
<p>
  SPI answers that with just <strong>four wires</strong>. That's the whole protocol.
  Four wires, and both chips can send and receive data at the same time.
</p>

<h3>The Four Wires — a Simple Conversation Analogy</h3>
<p>
  Think of the brain (called the <strong>master</strong>) as a person dictating
  a letter while simultaneously reading a reply. The sensor (called the
  <strong>slave</strong>) is the assistant doing the same in reverse.
  Here is what each wire carries:
</p>
<table class="truth-table">
  <tr><th>Wire</th><th>Think of it as…</th><th>Direction</th></tr>
  <tr><td><strong>MOSI</strong></td><td>Master's words going OUT to the sensor</td><td>→ master sends</td></tr>
  <tr><td><strong>MISO</strong></td><td>Sensor's reply coming back IN to the master</td><td>← sensor sends</td></tr>
  <tr><td><strong>SCK</strong></td><td>A shared metronome — both sides use this clock to know when each bit starts</td><td>→ master drives</td></tr>
  <tr><td><strong>SS_n</strong></td><td>A tap on the shoulder — tells ONE specific sensor "I'm talking to you now"</td><td>→ master drives</td></tr>
</table>
<p>
  The <strong>n</strong> in SS_n stands for "active when LOW." Imagine it like
  a push-button that activates when pressed down. When the master pulls SS_n LOW,
  that sensor wakes up and joins the conversation. All other sensors ignore the bus
  until their own SS_n wire goes LOW.
</p>

<h3>Why Do We Need the Clock Wire?</h3>
<p>
  Without a shared clock, imagine two people trying to speak at different speeds — the
  listener might think "hello" ended after "hel" and start reading the next word too
  early. The SCK wire prevents this: the master controls the speed, and both sides
  read one bit on every tick of that clock. No confusion, no timing drift.
</p>

<h3>What We Are Building in This Lesson</h3>
<p>
  A small connector module called <code>spi_signals</code>. Think of it as the
  labelled ports on the back of a device — it just names and connects four internal
  wires to the four physical pins. No calculations, no memory. Just four connections:
</p>
<pre class="code-block">
  Internal name    →    Physical pin
  tx_bit           →    mosi    (the bit we want to send right now)
  miso_in          →    miso    (the bit the sensor just sent back)
  sck_int          →    sck     (the clock tick we share with the sensor)
  cs_n_raw         →    ss_n    (which sensor we are talking to)
</pre>
<p>
  In L2 we build the shift register — the part that lines up 8 bits to send
  and collects 8 bits arriving. Think of it as the actual letter being written
  and read, one word at a time.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — module header: module spi_signals (',
        'Step 2 — four inputs (Theory Step 1 table):',
        '         input logic tx_bit,    input logic miso_in,',
        '         input logic sck_int,   input logic cs_n_raw,',
        'Step 3 — four outputs (last has NO comma on ss_n):',
        '         output logic mosi,  output logic miso,',
        '         output logic sck,   output logic ss_n',
        'Step 4 — close port list: );',
        'Step 5 — assign mosi = tx_bit;    (shift register MSB → MOSI pad)',
        'Step 6 — assign miso = miso_in;   (MISO pad readable internally)',
        'Step 7 — assign sck  = sck_int;   (clock divider → SCK pad)',
        'Step 8 — assign ss_n = cs_n_raw;  (CS controller → SS_n pad)',
        'Step 9 — endmodule',
        'No always_ff — four assign statements, nothing more',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_signals (
  input  logic tx_bit,    // bit the shift register wants to send
  input  logic miso_in,   // bit that arrived from the slave pad
  input  logic sck_int,   // internal SCK toggle from the clock divider
  input  logic cs_n_raw,  // CS polarity-corrected signal (active-low)
  output logic mosi,      // SPI pad: Master-Out Slave-In
  output logic miso,      // SPI pad: Master-In Slave-Out (alias)
  output logic sck,       // SPI pad: Serial Clock
  output logic ss_n       // SPI pad: Slave Select, active-LOW (note: no comma)
);

  assign mosi = tx_bit;    // what master transmits → the wire
  assign miso = miso_in;   // what arrived on the pad → readable internally
  assign sck  = sck_int;   // clock divider output → pad
  assign ss_n = cs_n_raw;  // CS controller output → pad (already active-low)

endmodule`,

      design:
`// Type the spi_signals module here. Follow Theory Steps 1–3.
//
// Step 1 — Ports (directions from the master's perspective):
//   input  logic tx_bit    — from TX shift register (bit to transmit)
//   input  logic miso_in   — arriving from MISO pad
//   input  logic sck_int   — from clock divider
//   input  logic cs_n_raw  — from CS controller (already active-low)
//   output logic mosi      — → MOSI pad
//   output logic miso      — → MISO pad (alias for miso_in)
//   output logic sck       — → SCK pad
//   output logic ss_n      — → SS_n pad
//
// Step 2 — Four assign lines (no always_ff needed):
//   assign mosi = tx_bit;   assign miso = miso_in;
//   assign sck  = sck_int;  assign ss_n = cs_n_raw;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic tx_bit, miso_in, sck_int, cs_n_raw;
  logic mosi, miso, sck, ss_n;

  spi_signals dut (
    .tx_bit   (tx_bit),
    .miso_in  (miso_in),
    .sck_int  (sck_int),
    .cs_n_raw (cs_n_raw),
    .mosi     (mosi),
    .miso     (miso),
    .sck      (sck),
    .ss_n     (ss_n)
  );

  task automatic check_wire(
    input string name,
    input logic  got,
    input logic  exp
  );
    if (got === exp)
      $display("PASS  %s: %0b", name, got);
    else
      $display("FAIL  %s: got=%0b expected=%0b", name, got, exp);
  endtask

  initial begin
    $display("=== SPI Signal Anatomy ===");

    // MOSI follows tx_bit
    tx_bit = 1; miso_in = 0; sck_int = 0; cs_n_raw = 1; #5;
    check_wire("mosi", mosi, 1'b1);

    tx_bit = 0; #5;
    check_wire("mosi when tx=0", mosi, 1'b0);

    // MISO follows miso_in
    miso_in = 1; #5;
    check_wire("miso", miso, 1'b1);

    // SCK follows sck_int
    sck_int = 1; #5;
    check_wire("sck", sck, 1'b1);

    // SS_n follows cs_n_raw (LOW = asserted)
    cs_n_raw = 0; #5;
    check_wire("ss_n asserted", ss_n, 1'b0);

    $display("SPI signal wiring complete!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  mosi: 1',
        'PASS  ss_n asserted: 0',
        'SPI signal wiring complete!',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — Full-Duplex Exchange (Tier 1)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long1l2',
      title: 'L2 — Full-Duplex Shift Register',

      theory: `
<h2>Imagine a Queue of Eight People Passing Notes</h2>
<p>
  Picture eight people standing in a line. Each person holds a card with either
  a "1" or a "0" on it. These eight cards together form one byte of data.
</p>
<p>
  Now imagine a referee with a whistle. Every time the referee blows the whistle
  (one clock tick of SCK):
</p>
<ul>
  <li>The person at the <strong>front</strong> of the line hands their card through the door — that bit travels out on MOSI to the sensor.</li>
  <li>Everyone else takes one step forward.</li>
  <li>A brand-new person joins at the <strong>back</strong> — carrying the bit that just arrived from the sensor on MISO.</li>
</ul>
<p>
  After eight whistles, the entire original queue has walked out, and eight new
  people (the sensor's reply) have walked in. The master has received a complete
  byte. And at the sensor's side, the exact same thing happened in reverse — it
  also received the master's byte. Both sides exchanged a full byte in the same
  eight clock ticks. That is SPI full-duplex.
</p>
<pre class="code-block">
  MASTER's queue (tx_shift)
  ┌───┬───┬───┬───┬───┬───┬───┬───┐
  │ 7 │ 6 │ 5 │ 4 │ 3 │ 2 │ 1 │ 0 │
  └───┴───┴───┴───┴───┴───┴───┴───┘
  front exits ─── MOSI ──────────────────────────► sensor
  back fills  ◄── MISO ────────────────────────── sensor exits
                 ↑ one person moves per whistle ↑
</pre>
<p>
  This design also makes testing easy. On the first day of bring-up, connect a
  wire directly from MOSI back to MISO on the board — a <strong>loopback</strong>.
  No sensor needed. If you send 0xA5 and receive 0xA5 back, the queue is working.
  If not, something is wrong with the clock, wiring, or reset. Engineers run this
  test before attaching any real sensor.
</p>

<h2>Translating the Queue Into Code — Three Questions</h2>

<h3>Question 1 — What does this block need to remember?</h3>
<p>
  Two queues. One for outgoing bits (<code>tx_shift</code>), one collecting
  incoming bits (<code>rx_shift</code>). Both hold 8 positions:
</p>
<pre class="code-block">
logic [7:0] tx_shift;   // the outgoing queue — person [7] is always at the front
logic [7:0] rx_shift;   // the incoming queue — new arrivals fill position [0]
</pre>

<h3>Question 2 — What three events can change the queue?</h3>
<p>
  Three things can happen — when multiple conditions are true, the one
  listed first wins:
</p>
<pre class="code-block">
always_ff @(posedge clk or negedge rst_n) begin
  if (!rst_n) begin               // Reset: everyone leaves, queue clears
    tx_shift &lt;= 8'b0;
    rx_shift &lt;= 8'b0;
  end else if (load) begin        // Load: a fresh team of 8 lines up to go
    tx_shift &lt;= tx_data;
  end else if (shift_en) begin    // Whistle: one step — front exits, back fills
    tx_shift &lt;= {tx_shift[6:0], 1'b0};      // everyone shifts forward; back gets zero
    rx_shift &lt;= {rx_shift[6:0], miso_in};   // incoming bit joins at the back
  end
end
</pre>

<h3>Question 3 — Why is MOSI always "live" — no delay?</h3>
<p>
  The sensor reads MOSI on the same clock tick as the whistle. If MOSI were
  connected through a register (with a clock delay), the sensor would read
  last tick's person — always one step behind. We avoid this by wiring MOSI
  directly to whoever is standing at the front of the queue right now:
</p>
<pre class="code-block">
assign mosi_out = tx_shift[7];   // front of queue — always visible immediately
assign rx_data  = rx_shift;      // completed incoming queue, readable anytime
</pre>
<p>
  In L3 we answer the last open question: on which whistle — the clock going
  UP or DOWN — does the sensor actually read the card? That is CPOL and CPHA.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header and port list:',
        '         module spi_frame (',
        '         input  logic       clk, rst_n, load, shift_en, miso_in',
        '         input  logic [7:0] tx_data',
        '         output logic       mosi_out',
        '         output logic [7:0] rx_data    ← no trailing comma',
        '         );',
        'Step 2 — Answer Question 1: declare the two state registers (after the port list)',
        '         logic [7:0] tx_shift;   (bits not yet transmitted, MSB exits first)',
        '         logic [7:0] rx_shift;   (bits accumulated from MISO, MSB arrives first)',
        'Step 3 — Answer Question 2: always_ff @(posedge clk or negedge rst_n)',
        '         Priority 1 (if !rst_n): clear both — tx_shift <= 8\'b0; rx_shift <= 8\'b0;',
        '         Priority 2 (else if load): tx_shift <= tx_data;',
        '         Priority 3 (else if shift_en): left-shift both registers',
        '           tx_shift <= {tx_shift[6:0], 1\'b0}    — MSB exits, zeros fill right',
        '           rx_shift <= {rx_shift[6:0], miso_in}  — MISO bit enters at bit 0',
        'Step 4 — Answer Question 3: combinational MOSI (no register, no latency)',
        '         assign mosi_out = tx_shift[7];',
        '         assign rx_data  = rx_shift;',
        'Step 5 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_frame (
  input  logic       clk,
  input  logic       rst_n,      // active-low asynchronous reset
  input  logic       load,       // parallel-load strobe
  input  logic       shift_en,   // one pulse per SCK edge
  input  logic [7:0] tx_data,    // word to transmit
  input  logic       miso_in,    // serial bit from slave
  output logic       mosi_out,   // serial bit to slave
  output logic [7:0] rx_data     // parallel received word
);

  logic [7:0] tx_shift;   // TX shift register
  logic [7:0] rx_shift;   // RX shift register

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      tx_shift <= 8'b0;   // clear on reset
      rx_shift <= 8'b0;
    end else if (load) begin
      tx_shift <= tx_data;  // parallel load — happens in LOAD state
    end else if (shift_en) begin
      tx_shift <= {tx_shift[6:0], 1'b0};    // shift left; MSB leaves via mosi_out
      rx_shift <= {rx_shift[6:0], miso_in}; // shift left; MISO enters at bit 0
    end
  end

  // MOSI is always the current MSB — combinational, not registered.
  // This ensures MOSI is valid BEFORE the next SCK edge.
  assign mosi_out = tx_shift[7];
  assign rx_data  = rx_shift;

endmodule`,

      design:
`// Type the spi_frame module here. Follow Theory Questions 1–3.
//
// Q1 — State: two 8-bit registers
//   logic [7:0] tx_shift;   // MSB sent first; shifts left each SCK edge
//   logic [7:0] rx_shift;   // MSB received first; shifts left, MISO enters bit 0
//
// Q2 — Events in priority order (always_ff):
//   1. reset     → tx_shift <= 0;  rx_shift <= 0;
//   2. load      → tx_shift <= tx_data;
//   3. shift_en  → tx_shift <= {tx_shift[6:0], 1'b0};
//                  rx_shift <= {rx_shift[6:0], miso_in};
//
// Q3 — MOSI must be combinational (no register, zero latency):
//   assign mosi_out = tx_shift[7];
//   assign rx_data  = rx_shift;
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;  // 100 MHz

  logic       rst_n, load, shift_en, miso_in;
  logic       mosi_out;
  logic [7:0] tx_data, rx_data;

  spi_frame dut (
    .clk      (clk),
    .rst_n    (rst_n),
    .load     (load),
    .shift_en (shift_en),
    .tx_data  (tx_data),
    .miso_in  (miso_in),
    .mosi_out (mosi_out),
    .rx_data  (rx_data)
  );

  // Loopback: slave echoes every bit master sends
  assign miso_in = mosi_out;

  // Perform one 8-bit loopback transfer and check result
  task automatic do_transfer(input logic [7:0] data, input logic [7:0] exp);
    integer i;
    // Load word
    load = 1; tx_data = data;
    @(posedge clk); #1;
    load = 0;
    // 8 shift pulses
    for (i = 0; i < 8; i++) begin
      shift_en = 1;
      @(posedge clk); #1;
      shift_en = 0;
    end
    // Check
    if (rx_data === exp)
      $display("PASS  tx=0x%02h -> rx=0x%02h", data, rx_data);
    else
      $display("FAIL  tx=0x%02h -> rx=0x%02h (expected 0x%02h)", data, rx_data, exp);
  endtask

  initial begin
    $display("=== SPI Full-Duplex Loopback ===");
    rst_n = 0; load = 0; shift_en = 0; tx_data = 0;
    repeat(2) @(posedge clk); rst_n = 1;

    do_transfer(8'hA5, 8'hA5);   // loopback: rx should equal tx
    do_transfer(8'hFF, 8'hFF);   // all-ones
    do_transfer(8'h00, 8'h00);   // all-zeros

    $display("Full-duplex loopback works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  tx=0xa5 -> rx=0xa5',
        'PASS  tx=0xff -> rx=0xff',
        'Full-duplex loopback works!',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — CPOL/CPHA Mode Decoder (Tier 2)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long1l3',
      title: 'L3 — CPOL/CPHA Mode Decoder',

      theory: `
<h2>Two People Exchanging Notes — But They Need to Agree on the Signal First</h2>
<p>
  Imagine you and a friend are across a room, passing sticky notes back and forth.
  You agree: every time you raise your hand, you both swap notes at the same moment.
  Simple — it works perfectly.
</p>
<p>
  Now imagine a second friend in another room who uses a completely different signal.
  She swaps when you <em>lower</em> your hand, not raise it. Neither of you is wrong.
  But if you try to exchange notes with her using the first signal, she does nothing.
  You both end up confused, holding the wrong notes.
</p>
<p>
  This is exactly the problem SPI modes solve. Every sensor chip has a preference:
  some swap bits on the rising clock edge, others on the falling edge. The master
  must match the sensor's preference — otherwise every byte received will be garbage.
  CPOL and CPHA are just a way to describe which signal the sensor expects.
</p>

<h3>CPOL — Where Does the Clock Rest?</h3>
<p>
  When no data is being sent, the clock wire has to sit at some level. Think of it
  as your hand position when you're not actively signalling:
</p>
<ul>
  <li><strong>CPOL = 0</strong>: hand rests <strong>DOWN</strong> between transfers. Clock idles LOW. First move is up.</li>
  <li><strong>CPOL = 1</strong>: hand rests <strong>UP</strong> between transfers. Clock idles HIGH. First move is down.</li>
</ul>

<h3>CPHA — Which Move Is the Signal?</h3>
<p>
  Once you know the resting position, CPHA picks which movement counts as "swap":
</p>
<ul>
  <li><strong>CPHA = 0</strong>: the <strong>first</strong> movement away from rest is the signal. Swap immediately on the first edge.</li>
  <li><strong>CPHA = 1</strong>: ignore the first movement; swap on the <strong>second</strong> edge.</li>
</ul>

<h3>The Four Combinations</h3>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>Clock rests</th><th>Swap bits on</th><th>Common use</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>Rising edge (1st move up)</td><td>Most sensors, NOR Flash</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>LOW</td><td>Falling edge (2nd move)</td><td>Some ADCs</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>HIGH</td><td>Falling edge (1st move down)</td><td>Less common</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>HIGH</td><td>Rising edge (2nd move)</td><td>Some gyroscopes</td></tr>
</table>
<p>
  A handy pattern: if CPOL and CPHA are the <em>same</em> (both 0 or both 1),
  the swap happens on the rising edge. If they are <em>different</em>, the swap
  happens on the falling edge. Just one XOR gate captures this completely:
  <code>sample_on_rise = !(cpol XOR cpha)</code>.
</p>

<h3>What Goes Wrong If You Pick the Wrong Mode?</h3>
<p>
  A sensor board has four chips: a pressure sensor (Mode 0), a temperature sensor
  (Mode 0), a gyroscope (Mode 3), and a flash memory chip (Mode 0). All four share
  MOSI, MISO, and SCK — only the CS pins are separate.
</p>
<p>
  Someone writes the RTL and forgets to check the gyroscope's datasheet. It gets
  configured as Mode 0. The gyroscope puts its MISO bit on the wire on the
  <em>falling</em> edge (Mode 3 behaviour), but the master reads MISO on the
  <em>rising</em> edge. The master always reads the bit from <em>last</em> clock
  cycle — every gyroscope byte comes back shifted by one position.
</p>
<p>
  The tricky part: the pressure and temperature sensors still work perfectly, so
  the bug looks random. It takes a logic analyser — looking at exact MISO timing
  against the SCK edges — to find it.
</p>
<p>
  The module we are building reads the two CPOL/CPHA bits set by the host
  processor and produces two simple outputs: "does MOSI launch on the rising
  edge?" and "does MISO get sampled on the rising edge?" Everything else in the
  system uses these two signals to time the transfer correctly.
</p>
<pre class="code-block">
always_comb begin
  idle_level = cpol;         // resting position comes straight from CPOL
  case ({cpol, cpha})
    2'b00: begin             // Mode 0 — most sensors
      launch_on_rise = 0;    // update MOSI on falling edge
      sample_on_rise = 1;    // read MISO on rising edge
    end
    // ... three more cases + a default (the default prevents a latch)
  endcase
end
</pre>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header and port list:',
        '         module spi_mode_decode (',
        '         input  logic cpol,            (clock polarity)',
        '         input  logic cpha,            (clock phase)',
        '         output logic idle_level,      (SCK rest level between transfers)',
        '         output logic launch_on_rise,  (1 = MOSI changes on rising SCK)',
        '         output logic sample_on_rise   (1 = MISO captured on rising SCK, no comma)',
        '         );',
        'Step 2 — Open: always_comb begin',
        'Step 3 — First line inside: idle_level = cpol;  (Step 2 — CPOL is the idle level)',
        'Step 4 — Write: case ({cpol, cpha}) — 2-bit selector over all four modes',
        "         2'b00  Mode 0: launch_on_rise = 0;  sample_on_rise = 1;  (fall/rise)",
        "         2'b01  Mode 1: launch_on_rise = 1;  sample_on_rise = 0;  (rise/fall)",
        "         2'b10  Mode 2: launch_on_rise = 1;  sample_on_rise = 0;  (rise/fall)",
        "         2'b11  Mode 3: launch_on_rise = 0;  sample_on_rise = 1;  (fall/rise)",
        'Step 5 — Add default: launch_on_rise = 0; sample_on_rise = 1;  (prevents latch)',
        'Step 6 — endcase  end  endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_mode_decode (
  input  logic cpol,
  input  logic cpha,
  output logic idle_level,      // SCK level when idle
  output logic launch_on_rise,  // 1 = MOSI updated on rising SCK edge
  output logic sample_on_rise   // 1 = MISO captured on rising SCK edge
);

  always_comb begin
    idle_level = cpol;  // CPOL is the idle level by definition

    case ({cpol, cpha})
      2'b00: begin  // Mode 0 — most common (CPOL=0, CPHA=0)
        launch_on_rise = 1'b0;  // MOSI changes on falling edge
        sample_on_rise = 1'b1;  // MISO sampled on rising edge
      end
      2'b01: begin  // Mode 1
        launch_on_rise = 1'b1;  // MOSI changes on rising edge
        sample_on_rise = 1'b0;  // MISO sampled on falling edge
      end
      2'b10: begin  // Mode 2
        launch_on_rise = 1'b1;  // MOSI changes on rising edge
        sample_on_rise = 1'b0;  // MISO sampled on falling edge
      end
      2'b11: begin  // Mode 3
        launch_on_rise = 1'b0;  // MOSI changes on falling edge
        sample_on_rise = 1'b1;  // MISO sampled on rising edge
      end
      default: begin
        launch_on_rise = 1'b0;
        sample_on_rise = 1'b1;
      end
    endcase
  end

endmodule`,

      design:
`// Type the spi_mode_decode module here. Follow Theory Steps 1–3.
//
// Step 1 — Two config inputs, three decoded outputs:
//   input  logic cpol, cpha
//   output logic idle_level     — = cpol (direct)
//   output logic launch_on_rise — = cpol XOR cpha
//   output logic sample_on_rise — = !(cpol XOR cpha)
//
// Step 2 — always_comb block; first line: idle_level = cpol;
//
// Step 3 — case ({cpol, cpha}) with 4 cases + default:
//   2'b00 → launch=0, sample=1   (Mode 0 — most common)
//   2'b01 → launch=1, sample=0   (Mode 1)
//   2'b10 → launch=1, sample=0   (Mode 2)
//   2'b11 → launch=0, sample=1   (Mode 3)
//   default → launch=0, sample=1 (prevents latch inference)
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic cpol, cpha;
  logic idle_level, launch_on_rise, sample_on_rise;

  spi_mode_decode dut (
    .cpol           (cpol),
    .cpha           (cpha),
    .idle_level     (idle_level),
    .launch_on_rise (launch_on_rise),
    .sample_on_rise (sample_on_rise)
  );

  task automatic check_mode(
    input logic cp, ch,
    input logic exp_idle, exp_launch, exp_sample
  );
    cpol = cp; cpha = ch; #5;
    if (idle_level === exp_idle &&
        launch_on_rise === exp_launch &&
        sample_on_rise === exp_sample)
      $display("PASS  Mode %0d (cpol=%0b cpha=%0b): idle=%0b launch_rise=%0b sample_rise=%0b",
               {cp,ch}, cp, ch, idle_level, launch_on_rise, sample_on_rise);
    else
      $display("FAIL  Mode %0d (cpol=%0b cpha=%0b): got idle=%0b launch=%0b sample=%0b",
               {cp,ch}, cp, ch, idle_level, launch_on_rise, sample_on_rise);
  endtask

  initial begin
    $display("=== CPOL/CPHA Mode Decoder ===");
    //              cpol cpha  idle  launch sample_rise
    check_mode(0,0,  1'b0, 1'b0, 1'b1);  // Mode 0: idle=0, launch-fall, sample-rise
    check_mode(0,1,  1'b0, 1'b1, 1'b0);  // Mode 1: idle=0, launch-rise, sample-fall
    check_mode(1,0,  1'b1, 1'b1, 1'b0);  // Mode 2: idle=1, launch-rise, sample-fall
    check_mode(1,1,  1'b1, 1'b0, 1'b1);  // Mode 3: idle=1, launch-fall, sample-rise
    $display("All 4 SPI modes verified!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  Mode 0',
        'PASS  Mode 3',
        'All 4 SPI modes verified!',
      ],
    },

  ]
});
