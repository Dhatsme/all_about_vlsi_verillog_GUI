(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long5',
  title: 'TX & RX Shift Registers',
  icon: '🔀',
  level: 'intermediate',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────────
    // L1 — Parallel Load & MSB-First Shift (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long5l1',
      title: 'L1 — Parallel Load & MSB-First Shift',

      theory: `
<h2>The Radio Broadcaster Who Can Only Transmit One Word at a Time</h2>
<p>
  Imagine a radio journalist who has a full news report written out (8 bits in
  parallel inside the CPU). The radio channel can only send one word per
  minute — one bit per SCK edge. The journalist reads the report word-by-word
  from left to right (MSB first), sending each word over the air, one at a time.
</p>
<p>
  The SPI shift register does exactly this: it captures the full 8-bit word
  from the TX FIFO in one clock cycle (parallel load), then drives each bit
  onto MOSI one at a time on every <code>launch_pulse</code>.
</p>

<h3>Where spi_shift Lives in the SPI Master</h3>
<pre class="code-block">
  TX FIFO → rd_data[7:0]
                 │ load pulse
                 ▼
  ┌──────────────────────────────────────────────────┐
  │                 spi_shift                    ★   │
  │                                                  │
  │  tx_shift[7:0]:  loaded from tx_data             │
  │                  shifts left on launch_pulse      │
  │                  (MSB exits first onto MOSI)      │
  │                                                  │
  │  rx_shift[7:0]:  shifts in miso_in (added L3)    │
  │                                                  │
  │  bit_cnt:        counts 0..7 (added L4)          │
  └──────────────┬───────────────────────────────────┘
                 │
              mosi_out  ──►  MOSI pin  ──►  sensor
</pre>

<h3>The MSB-First Pattern</h3>
<p>
  Load the word. On each <code>launch_pulse</code>: output the top bit
  (<code>tx_shift[7]</code>) and shift the register left by one — the next
  highest bit moves into position. After 8 pulses the entire word is gone:
</p>
<pre class="code-block">
assign mosi_out = tx_shift[7];   // always driving MSB of current register

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n)
    tx_shift &lt;= 8'b0;
  else if (load)
    tx_shift &lt;= tx_data;                    // latch full word
  else if (launch_pulse)
    tx_shift &lt;= {tx_shift[6:0], 1'b0};     // MSB exits, zeros fill from right
end
</pre>

<h3>The Transmission in Action</h3>
<table class="truth-table">
  <tr><th>Cycle</th><th>tx_shift</th><th>mosi_out (tx_shift[7])</th></tr>
  <tr><td>load (0xA5 = 1010_0101)</td><td>1010_0101</td><td>1</td></tr>
  <tr><td>pulse 1</td><td>0100_1010</td><td>0</td></tr>
  <tr><td>pulse 2</td><td>1001_0100</td><td>1</td></tr>
  <tr><td>pulse 3</td><td>0010_1000</td><td>0</td></tr>
  <tr><td>…</td><td>…</td><td>…</td></tr>
  <tr><td>pulse 8</td><td>0000_0000</td><td>0 (last bit sent)</td></tr>
</table>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Module header: module spi_shift (',
        '         input  logic       pclk, rst_n',
        '         input  logic       load          (capture tx_data this cycle)',
        '         input  logic       launch_pulse  (shift left by 1)',
        '         input  logic [7:0] tx_data',
        '         output logic       mosi_out',
        '         );',
        'Step 2 — Internal: logic [7:0] tx_shift;',
        'Step 3 — assign mosi_out = tx_shift[7];   (always drive MSB)',
        'Step 4 — always_ff @(posedge pclk or negedge rst_n):',
        '         if (!rst_n): tx_shift <= 0',
        '         else if (load): tx_shift <= tx_data',
        '         else if (launch_pulse): tx_shift <= {tx_shift[6:0], 1\'b0}',
        'Step 5 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_shift (
  input  logic       pclk, rst_n,
  input  logic       load,
  input  logic       launch_pulse,
  input  logic [7:0] tx_data,
  output logic       mosi_out
);
  logic [7:0] tx_shift;

  assign mosi_out = tx_shift[7];   // MSB always on wire

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)
      tx_shift <= 8'b0;
    else if (load)
      tx_shift <= tx_data;                   // parallel load
    else if (launch_pulse)
      tx_shift <= {tx_shift[6:0], 1'b0};    // shift left: MSB exits
  end

endmodule`,

      design:
`// Type the spi_shift module here.
// Read Theory — it shows the parallel-load + shift-left pattern.
//
// Ports:
//   input  logic       pclk, rst_n
//   input  logic       load          — capture tx_data into tx_shift
//   input  logic       launch_pulse  — shift left on this pulse
//   input  logic [7:0] tx_data
//   output logic       mosi_out      — always tx_shift[7]
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, load, launch_pulse;
  logic [7:0] tx_data;
  logic       mosi_out;

  spi_shift dut (
    .pclk(clk), .rst_n(rst_n),
    .load(load), .launch_pulse(launch_pulse),
    .tx_data(tx_data), .mosi_out(mosi_out)
  );

  logic [7:0] captured;
  integer i;

  initial begin
    $display("=== Shift Register: MSB-First ===");
    rst_n = 0; load = 0; launch_pulse = 0; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: load 0xA5 ---
    tx_data = 8'hA5; load = 1; @(posedge clk); #1; load = 0;
    if (mosi_out === 1'b1)
      $display("PASS  after load 0xA5: mosi_out=1 (MSB=1)");
    else
      $display("FAIL  after load 0xA5: mosi_out=%0b (expected 1)", mosi_out);

    // --- Test 2: shift out all 8 bits MSB first ---
    captured = 8'b0;
    for (i = 7; i >= 0; i--) begin
      captured[i] = mosi_out;
      launch_pulse = 1; @(posedge clk); #1; launch_pulse = 0;
    end
    if (captured === 8'hA5)
      $display("PASS  8 bits shifted: captured=0x%02h", captured);
    else
      $display("FAIL  8 bits shifted: captured=0x%02h (expected 0xA5)", captured);

    // --- Test 3: load 0x3C and verify MSB ---
    tx_data = 8'h3C; load = 1; @(posedge clk); #1; load = 0;
    if (mosi_out === 1'b0)
      $display("PASS  load 0x3C: mosi_out=0 (MSB=0)");
    else
      $display("FAIL  load 0x3C: mosi_out=%0b (expected 0)", mosi_out);

    $display("Shift register MSB-first done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  after load 0xA5: mosi_out=1 (MSB=1)',
        'PASS  8 bits shifted: captured=0xA5',
        'PASS  load 0x3C: mosi_out=0 (MSB=0)',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L2 — LSB-First Mux (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long5l2',
      title: 'L2 — LSB-First Mux',

      theory: `
<h2>Two Different Newspapers: Some Start at the Front, Some at the Back</h2>
<p>
  In some countries, newspapers are read left-to-right — start at the cover,
  end at the back page. In others (and some technical fields), information is
  indexed from the back. SPI devices follow the same split: most devices expect
  the <strong>most significant bit first</strong> (like reading a cover page),
  but a few older sensors, memories, and display controllers expect the
  <strong>least significant bit first</strong>.
</p>
<p>
  The SPI master must support both without redesigning the shift register.
  The solution is a single <code>lsb_first</code> control bit that does two
  things simultaneously: it changes which end of <code>tx_shift</code> drives
  MOSI, and it changes which direction the register shifts:
</p>
<table class="truth-table">
  <tr><th>lsb_first</th><th>mosi_out drives…</th><th>Shift direction</th><th>First bit sent</th></tr>
  <tr><td>0 (default)</td><td>tx_shift[7]</td><td>left  ← zeros fill from right</td><td>Bit 7 (MSB)</td></tr>
  <tr><td>1</td><td>tx_shift[0]</td><td>right → zeros fill from left</td><td>Bit 0 (LSB)</td></tr>
</table>

<h3>One Assign, One Condition</h3>
<pre class="code-block">
assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[7];

// Inside always_ff, launch_pulse branch:
if (lsb_first)
  tx_shift &lt;= {1'b0, tx_shift[7:1]};   // shift right: LSB exits
else
  tx_shift &lt;= {tx_shift[6:0], 1'b0};   // shift left:  MSB exits
</pre>
<p>
  The parallel load is unchanged — <code>tx_data</code> always loads into
  <code>tx_shift</code> directly. Only the output tap and shift direction
  depend on <code>lsb_first</code>.
</p>
<p>
  Both modes are tested by the testbench using 0xB4 (1011_0100). In MSB-first,
  bits leave as: 1,0,1,1,0,1,0,0. In LSB-first, bits leave as: 0,0,1,0,1,1,0,1.
  Both correctly reconstruct to 0xB4 when received in the matching order.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L1 spi_shift skeleton',
        'Step 2 — Add new input port: input logic lsb_first',
        'Step 3 — Change the mosi_out assign:',
        '         assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[7];',
        'Step 4 — Change the launch_pulse branch in always_ff:',
        '         if (lsb_first): tx_shift <= {1\'b0, tx_shift[7:1]};  (shift right)',
        '         else:           tx_shift <= {tx_shift[6:0], 1\'b0};  (shift left)',
        'Step 5 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_shift (
  input  logic       pclk, rst_n,
  input  logic       load, lsb_first,
  input  logic       launch_pulse,
  input  logic [7:0] tx_data,
  output logic       mosi_out
);
  logic [7:0] tx_shift;

  assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[7];

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)
      tx_shift <= 8'b0;
    else if (load)
      tx_shift <= tx_data;
    else if (launch_pulse) begin
      if (lsb_first)
        tx_shift <= {1'b0, tx_shift[7:1]};   // shift right
      else
        tx_shift <= {tx_shift[6:0], 1'b0};   // shift left
    end
  end

endmodule`,

      design:
`// Extend spi_shift with lsb_first bit-order control.
//
// New port:   input logic lsb_first
// Change:     mosi_out = lsb_first ? tx_shift[0] : tx_shift[7]
// Change:     launch_pulse branch: shift right if lsb_first, left otherwise
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, load, lsb_first, launch_pulse;
  logic [7:0] tx_data;
  logic       mosi_out;

  spi_shift dut (
    .pclk(clk), .rst_n(rst_n),
    .load(load), .lsb_first(lsb_first),
    .launch_pulse(launch_pulse),
    .tx_data(tx_data), .mosi_out(mosi_out)
  );

  logic [7:0] captured;
  integer i;

  initial begin
    $display("=== Shift Register: LSB/MSB Mux ===");
    rst_n = 0; load = 0; lsb_first = 0; launch_pulse = 0; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: MSB-first 0xB4 ---
    lsb_first = 0; tx_data = 8'hB4;
    load = 1; @(posedge clk); #1; load = 0;
    captured = 8'b0;
    for (i = 7; i >= 0; i--) begin
      captured[i] = mosi_out;
      launch_pulse = 1; @(posedge clk); #1; launch_pulse = 0;
    end
    if (captured === 8'hB4)
      $display("PASS  MSB-first 0xB4: captured=0x%02h", captured);
    else
      $display("FAIL  MSB-first 0xB4: captured=0x%02h (expected 0xB4)", captured);

    // --- Test 2: LSB-first 0xB4 ---
    lsb_first = 1; tx_data = 8'hB4;
    load = 1; @(posedge clk); #1; load = 0;
    captured = 8'b0;
    for (i = 0; i <= 7; i++) begin
      captured[i] = mosi_out;
      launch_pulse = 1; @(posedge clk); #1; launch_pulse = 0;
    end
    if (captured === 8'hB4)
      $display("PASS  LSB-first 0xB4: captured=0x%02h", captured);
    else
      $display("FAIL  LSB-first 0xB4: captured=0x%02h (expected 0xB4)", captured);

    // --- Test 3: MSB-first first bit of 0xFF ---
    lsb_first = 0; tx_data = 8'hFF;
    load = 1; @(posedge clk); #1; load = 0;
    if (mosi_out === 1'b1)
      $display("PASS  MSB-first 0xFF: first bit=1");
    else
      $display("FAIL  MSB-first 0xFF: first bit=%0b", mosi_out);

    // --- Test 4: LSB-first first bit of 0xFE (LSB=0) ---
    lsb_first = 1; tx_data = 8'hFE;
    load = 1; @(posedge clk); #1; load = 0;
    if (mosi_out === 1'b0)
      $display("PASS  LSB-first 0xFE: first bit=0 (LSB=0)");
    else
      $display("FAIL  LSB-first 0xFE: first bit=%0b (expected 0)", mosi_out);

    $display("LSB/MSB mux done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  MSB-first 0xB4: captured=0xB4',
        'PASS  LSB-first 0xB4: captured=0xB4',
        'PASS  MSB-first 0xFF: first bit=1',
        'LSB/MSB mux done!',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L3 — RX Capture (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long5l3',
      title: 'L3 — RX Capture',

      theory: `
<h2>Full-Duplex: Talking and Listening at the Same Time</h2>
<p>
  Imagine a two-way radio where both stations transmit simultaneously — one
  on the left channel, one on the right. You can hear your partner while you're
  talking. SPI works exactly the same way: while MOSI is shifting data out to
  the sensor, the sensor is simultaneously shifting its own data back in on MISO.
  Every SCK edge is both a transmit moment and a receive moment.
</p>
<p>
  We add a second shift register — <code>rx_shift</code> — that captures one
  bit from MISO on every <code>sample_pulse</code>. While the TX path shifts
  <em>left</em> (MSB out), the RX path shifts the incoming bit to the right
  end (MSB-first receive mode):
</p>
<pre class="code-block">
// MSB-first: first sample → arrives at rx_shift[0]; last → arrives after 7 shifts
rx_shift &lt;= {rx_shift[6:0], miso_in};   // shift left, new bit at LSB position

// LSB-first: first sample → arrives at rx_shift[7]; shifts right
rx_shift &lt;= {miso_in, rx_shift[7:1]};   // shift right, new bit at MSB position
</pre>

<h3>launch_pulse and sample_pulse Are Separate</h3>
<p>
  In SPI Mode 0: the master <em>launches</em> bits on the falling SCK edge and
  <em>samples</em> the slave's bit on the rising edge. These two events are a
  half-period apart — they never collide. Both can live in the same
  <code>always_ff</code> block as independent <code>if</code> branches
  (not <code>if-else</code>).
</p>
<p>
  The testbench connects <code>miso_in = mosi_out</code> — the SPI loopback
  pattern used for bring-up testing. Everything you transmit, you receive back.
  With 0xA5 loaded and 8 simultaneous launch+sample pulses, the result should
  be <code>rx_data = 0xA5</code>.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L2 spi_shift — all existing ports remain',
        'Step 2 — Add new input ports:',
        '         input logic       sample_pulse',
        '         input logic       miso_in',
        'Step 3 — Add new output port:',
        '         output logic [7:0] rx_data',
        'Step 4 — Add internal register: logic [7:0] rx_shift;',
        'Step 5 — Add assign: assign rx_data = rx_shift;',
        'Step 6 — In always_ff, ADD a sample_pulse if-branch (independent from launch_pulse):',
        '         if (sample_pulse):',
        '           if (lsb_first): rx_shift <= {miso_in, rx_shift[7:1]};',
        '           else:           rx_shift <= {rx_shift[6:0], miso_in};',
        'Step 7 — Reset rx_shift to 0 in the rst_n branch',
        'Step 8 — endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_shift (
  input  logic       pclk, rst_n,
  input  logic       load, lsb_first,
  input  logic       launch_pulse, sample_pulse,
  input  logic       miso_in,
  input  logic [7:0] tx_data,
  output logic       mosi_out,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;

  assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[7];
  assign rx_data  = rx_shift;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      tx_shift <= 8'b0;
      rx_shift <= 8'b0;
    end else if (load) begin
      tx_shift <= tx_data;
    end else begin
      if (launch_pulse) begin
        if (lsb_first) tx_shift <= {1'b0, tx_shift[7:1]};
        else           tx_shift <= {tx_shift[6:0], 1'b0};
      end
      if (sample_pulse) begin
        if (lsb_first) rx_shift <= {miso_in, rx_shift[7:1]};
        else           rx_shift <= {rx_shift[6:0], miso_in};
      end
    end
  end

endmodule`,

      design:
`// Extend spi_shift with RX capture path.
//
// New ports:
//   input  logic       sample_pulse
//   input  logic       miso_in
//   output logic [7:0] rx_data
//
// New internal: logic [7:0] rx_shift
// assign rx_data = rx_shift;
// In always_ff: separate sample_pulse if-branch (not else-if!)
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst_n, load, lsb_first;
  logic       launch_pulse, sample_pulse, miso_in;
  logic [7:0] tx_data, rx_data;
  logic       mosi_out;

  spi_shift dut (
    .pclk(clk), .rst_n(rst_n),
    .load(load), .lsb_first(lsb_first),
    .launch_pulse(launch_pulse), .sample_pulse(sample_pulse),
    .miso_in(miso_in),
    .tx_data(tx_data), .mosi_out(mosi_out),
    .rx_data(rx_data)
  );

  integer i;

  initial begin
    $display("=== Shift Register: RX Capture ===");
    rst_n = 0; load = 0; lsb_first = 0;
    launch_pulse = 0; sample_pulse = 0; miso_in = 0; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: MSB-first loopback 0xA5 ---
    lsb_first = 0; tx_data = 8'hA5;
    load = 1; @(posedge clk); #1; load = 0;
    for (i = 0; i < 8; i++) begin
      miso_in = mosi_out;
      launch_pulse = 1; sample_pulse = 1;
      @(posedge clk); #1;
      launch_pulse = 0; sample_pulse = 0;
    end
    if (rx_data === 8'hA5)
      $display("PASS  MSB loopback: rx_data=0x%02h", rx_data);
    else
      $display("FAIL  MSB loopback: rx_data=0x%02h (expected 0xA5)", rx_data);

    // --- Test 2: LSB-first loopback 0xC3 ---
    lsb_first = 1; tx_data = 8'hC3;
    load = 1; @(posedge clk); #1; load = 0;
    for (i = 0; i < 8; i++) begin
      miso_in = mosi_out;
      launch_pulse = 1; sample_pulse = 1;
      @(posedge clk); #1;
      launch_pulse = 0; sample_pulse = 0;
    end
    if (rx_data === 8'hC3)
      $display("PASS  LSB loopback: rx_data=0x%02h", rx_data);
    else
      $display("FAIL  LSB loopback: rx_data=0x%02h (expected 0xC3)", rx_data);

    // --- Test 3: inject 0x5A on MISO ---
    lsb_first = 0; tx_data = 8'h00;
    load = 1; @(posedge clk); #1; load = 0;
    begin
      automatic logic [7:0] pat = 8'h5A;
      for (i = 7; i >= 0; i--) begin
        miso_in = pat[i];
        sample_pulse = 1; @(posedge clk); #1; sample_pulse = 0;
      end
    end
    if (rx_data === 8'h5A)
      $display("PASS  injected 0x5A: rx_data=0x%02h", rx_data);
    else
      $display("FAIL  injected 0x5A: rx_data=0x%02h (expected 0x5A)", rx_data);

    $display("RX capture done!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  MSB loopback: rx_data=0xA5',
        'PASS  LSB loopback: rx_data=0xC3',
        'PASS  injected 0x5A: rx_data=0x5A',
      ]
    },

    // ─────────────────────────────────────────────────────────────────────────
    // L4 — word_done & Checkpoint A (Tier 3)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: 'spi_long5l4',
      title: 'L4 — word_done & Checkpoint A',

      theory: `
<h2>The Editor's Buzzer: Signalling When the Broadcast Is Complete</h2>
<p>
  The journalist is mid-broadcast, transmitting bits one by one. The editor needs
  to know the moment the eighth bit goes out — not the seventh, not the ninth.
  They press a buzzer the instant the last word leaves the building.
</p>
<p>
  In hardware, <code>word_done</code> is that buzzer: a one-cycle pulse that
  fires exactly when <code>bit_cnt</code> reaches <code>word_len - 1</code>.
  The FSM uses this pulse to trigger the next state: deassert CS, start the
  next word, or stop the transfer. Getting this timing exactly right is
  critical — one cycle late means the CS falls before the last bit is sampled.
</p>

<h3>The Bit Counter Pattern</h3>
<pre class="code-block">
logic [2:0] bit_cnt;

always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n || load) bit_cnt &lt;= 3'b0;   // reset on reset OR on new word load
  else if (launch_pulse) bit_cnt &lt;= bit_cnt + 1;
end

assign word_done = launch_pulse &amp;&amp; (bit_cnt === word_len - 1);
</pre>
<p>
  <code>word_done</code> fires <em>during</em> the last launch pulse — it is
  combinational and depends on the current <code>bit_cnt</code> and
  <code>launch_pulse</code> together. The next cycle, after the clock edge,
  <code>bit_cnt</code> will have incremented past <code>word_len - 1</code>,
  and <code>word_done</code> deasserts.
</p>

<h3>Checkpoint A — Clock Divider + Shift Register Working Together</h3>
<p>
  This lesson's testbench is the first <strong>integration test</strong> in the
  course. Two modules work together for the first time:
</p>
<table class="truth-table">
  <tr><th>spi_clk_div output</th><th>spi_shift input</th><th>SPI Mode 0 meaning</th></tr>
  <tr><td>falling_edge_p</td><td>launch_pulse</td><td>TX shifts out on falling SCK edge</td></tr>
  <tr><td>rising_edge_p</td><td>sample_pulse</td><td>RX samples MISO on rising SCK edge</td></tr>
</table>
<p>
  With <code>miso_in = mosi_out</code> (hardware loopback wire), loading
  <code>0xA5</code> and running 8 SCK edges should give <code>rx_data = 0xA5</code>
  when <code>word_done</code> fires. This is <strong>Checkpoint A</strong> — if
  it passes, your clock divider and shift register are correctly integrated.
</p>
<p>
  <strong>Note:</strong> <code>word_len = 3'd7</code> in the testbench means
  8 bits (bit_cnt counts 0..7, fires at bit 7 which is word_len-1 = 6...
  actually counts 8 pulses total). Check the formula: if word_len=7, done when bit_cnt==6
  on the 7th launch, then one more = 8 total. Verify your bit_cnt reset on load.
</p>
<p>
  🎓 <strong>SPI Foundations certificate:</strong> completing this lesson means
  you have built the complete data path — clock divider, TX FIFO, RX FIFO, and
  shift registers. The remaining modules add the control logic on top.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Start from the L3 spi_shift — all existing ports remain',
        'Step 2 — Add new ports:',
        '         input  logic [2:0] word_len',
        '         output logic       word_done',
        'Step 3 — Add internal: logic [2:0] bit_cnt;',
        'Step 4 — In always_ff: reset bit_cnt on rst_n OR on load; increment on launch_pulse',
        '         Note: bit_cnt should reset FIRST in the load branch (before tx_shift loads)',
        'Step 5 — assign word_done = launch_pulse && (bit_cnt === word_len - 1);',
        'Step 6 — endmodule',
        'The testbench includes spi_clk_div inline — no extra file needed',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS rx_data=0xa5 and Checkpoint A PASS must appear in Output tab',
        '🎓 SPI Foundations certificate unlocked — you built the complete data path: clkdiv, FIFOs, shift registers',
      ],

      hint:
`\`timescale 1ns/1ps
module spi_shift (
  input  logic       pclk, rst_n,
  input  logic       load, lsb_first,
  input  logic       launch_pulse, sample_pulse,
  input  logic       miso_in,
  input  logic [2:0] word_len,
  input  logic [7:0] tx_data,
  output logic       mosi_out,
  output logic [7:0] rx_data,
  output logic       word_done
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;

  assign mosi_out  = lsb_first ? tx_shift[0] : tx_shift[7];
  assign rx_data   = rx_shift;
  assign word_done = launch_pulse && (bit_cnt === word_len - 1);

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      tx_shift <= 8'b0; rx_shift <= 8'b0; bit_cnt <= 3'b0;
    end else if (load) begin
      tx_shift <= tx_data; bit_cnt <= 3'b0;
    end else begin
      if (launch_pulse) begin
        if (lsb_first) tx_shift <= {1'b0, tx_shift[7:1]};
        else           tx_shift <= {tx_shift[6:0], 1'b0};
        bit_cnt <= bit_cnt + 1;
      end
      if (sample_pulse) begin
        if (lsb_first) rx_shift <= {miso_in, rx_shift[7:1]};
        else           rx_shift <= {rx_shift[6:0], miso_in};
      end
    end
  end

endmodule`,

      design:
`// Extend spi_shift with word_done bit counter.
// See Theory for the assign formula and Checkpoint A wiring.
//
// New port:     input  logic [2:0] word_len
// New port:     output logic       word_done
// New internal: logic [2:0] bit_cnt
//
// assign word_done = launch_pulse && (bit_cnt === word_len - 1);
// always_ff: reset bit_cnt on rst_n|load; increment on launch_pulse
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps

// spi_clk_div inline (from spi_long2) — no separate file needed
module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out, rising_edge_p, falling_edge_p
);
  logic [15:0] div_cnt;
  logic        sck_int, sck_prev;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= 0; sck_int <= 0; sck_prev <= 0;
    end else if (enable) begin
      sck_prev <= sck_int;
      if (div_cnt >= div) begin div_cnt <= 0; sck_int <= ~sck_int; end
      else div_cnt <= div_cnt + 1;
    end else begin
      sck_prev <= cpol; sck_int <= cpol; div_cnt <= 0;
    end
  end
  assign sck_out        = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_int & ~sck_prev;
  assign falling_edge_p = ~sck_int & sck_prev;
endmodule

module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        enable, cpol;
  logic [15:0] div;
  logic        sck_out, rise_p, fall_p;
  logic        load, lsb_first, mosi_out, word_done, miso_in;
  logic [7:0]  tx_data, rx_data;
  logic [2:0]  word_len;

  spi_clk_div u_clk (
    .pclk(pclk), .rst_n(1'b1),
    .enable(enable), .cpol(cpol), .div(div),
    .sck_out(sck_out), .rising_edge_p(rise_p), .falling_edge_p(fall_p)
  );

  spi_shift u_sft (
    .pclk(pclk), .rst_n(1'b1),
    .load(load), .lsb_first(lsb_first),
    .launch_pulse(fall_p),
    .sample_pulse(rise_p),
    .miso_in(miso_in),
    .word_len(word_len),
    .tx_data(tx_data),
    .mosi_out(mosi_out),
    .rx_data(rx_data),
    .word_done(word_done)
  );

  assign miso_in = mosi_out;   // loopback: receive what we transmit

  initial begin
    $display("=== Checkpoint A: clk_div + shift loopback ===");
    enable = 0; cpol = 0; div = 16'd1;
    load = 0; lsb_first = 0; tx_data = 8'hA5; word_len = 3'd7;
    repeat(4) @(posedge pclk); #1;
    load = 1; @(posedge pclk); #1; load = 0;
    enable = 1;

    fork
      begin repeat(200) @(posedge pclk); $display("FAIL  timeout"); $finish; end
      begin
        @(posedge word_done); #2;
        if (rx_data === 8'hA5)
          $display("PASS rx_data=0xa5");
        else
          $display("FAIL rx_data=0x%02h (expected 0xa5)", rx_data);
        $display("Checkpoint A PASS — clk_div + shift loopback verified");
        $finish;
      end
    join
  end
endmodule`,

      expected: [
        'PASS rx_data=0xa5',
        'Checkpoint A PASS',
      ]
    },

  ]
});
