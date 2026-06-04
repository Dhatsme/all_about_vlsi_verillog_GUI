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
<h2>The Shift Register: Converting Parallel Data to Serial Bits</h2>
<p>
  The FIFO holds complete words; the SPI bus transmits one bit per SCK edge.
  The <strong>shift register</strong> is the converter between these two worlds.
  On a <code>load</code> pulse it captures a parallel word from the TX FIFO;
  then on each <code>launch_pulse</code> it shifts the next bit onto MOSI.
</p>

<h3>MSB-First Shifting</h3>
<p>
  SPI defaults to transmitting the most-significant bit first. After loading
  <code>tx_data</code> into an internal register <code>tx_shift</code>, each
  launch pulse outputs the top bit and left-shifts the register by one:
</p>
<pre class="code-block">
always_ff @(posedge pclk) begin
  if (load)
    tx_shift &lt;= tx_data;          // parallel capture
  else if (launch_pulse)
    tx_shift &lt;= {tx_shift[6:0], 1'b0};  // shift left, MSB exits
end

assign mosi_out = tx_shift[7];   // always driving MSB
</pre>

<p>
  The bit that "falls off" the left is what appears on MOSI. After 8 pulses the
  entire byte has been transmitted, MSB first.
</p>

<table class="truth-table">
  <tr><th>Cycle</th><th>tx_shift</th><th>mosi_out</th></tr>
  <tr><td>load (0xA5 = 1010_0101)</td><td>1010_0101</td><td>1</td></tr>
  <tr><td>pulse 1</td><td>0100_1010</td><td>0</td></tr>
  <tr><td>pulse 2</td><td>1001_0100</td><td>1</td></tr>
  <tr><td>pulse 3</td><td>0010_1000</td><td>0</td></tr>
  <tr><td>…</td><td>…</td><td>…</td></tr>
</table>

<h3>What You Will Build</h3>
<p>
  Module <code>spi_shift</code> with 8-bit <code>tx_data</code> and
  <code>tx_shift</code>. The <code>mosi_out</code> wire always reflects
  <code>tx_shift[7]</code>. No RX path yet — that comes in L3.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        '── Port ── input logic pclk, rst_n',
        '── Port ── input logic load             ← capture tx_data into tx_shift',
        '── Port ── input logic launch_pulse     ← shift left by 1 on this pulse',
        '── Port ── input logic [7:0] tx_data',
        '── Port ── output logic mosi_out',
        '── Internal ── logic [7:0] tx_shift',
        '── assign ── mosi_out = tx_shift[7];    ← always drive the top bit',
        'always_ff: if load → tx_shift <= tx_data; else if launch_pulse → shift left',
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
      tx_shift <= tx_data;         // parallel load
    else if (launch_pulse)
      tx_shift <= {tx_shift[6:0], 1'b0};  // shift left
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
<h2>Bit Order: MSB-First vs LSB-First</h2>
<p>
  Most SPI devices expect MSB-first — but not all. Some sensors and memory chips
  transmit LSB-first. The SPI master must support both without changing the shift
  register structure. The trick is a single mux on the output and the shift direction:
</p>

<table class="truth-table">
  <tr><th>lsb_first</th><th>mosi_out</th><th>Shift direction</th></tr>
  <tr><td>0 (MSB-first)</td><td>tx_shift[7]</td><td>left  ← {tx_shift[6:0], 1'b0}</td></tr>
  <tr><td>1 (LSB-first)</td><td>tx_shift[0]</td><td>right → {1'b0, tx_shift[7:1]}</td></tr>
</table>

<p>
  Both modes use the same parallel load. Only the output tap and shift direction
  change. Implement this with an <code>always_comb</code> mux for <code>mosi_out</code>
  and a conditional shift inside the <code>always_ff</code>:
</p>

<pre class="code-block">
assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[7];

// In always_ff:
else if (launch_pulse) begin
  if (lsb_first)
    tx_shift &lt;= {1'b0, tx_shift[7:1]};   // shift right
  else
    tx_shift &lt;= {tx_shift[6:0], 1'b0};   // shift left
end
</pre>

<h3>What You Will Build</h3>
<p>
  Extend the L1 module with an <code>lsb_first</code> input port and the mux
  above. Testbench transmits 0xB4 in both modes and checks bit order.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L1 spi_shift',
        '── New port ── input logic lsb_first',
        '── Change assign ── mosi_out = lsb_first ? tx_shift[0] : tx_shift[7];',
        'In always_ff launch_pulse branch: if lsb_first → shift right; else → shift left',
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
    rst_n = 0; load = 0; lsb_first = 0; launch_pulse = 0; tx_data = 0;
    repeat(2) @(posedge clk); #1;
    rst_n = 1;

    // --- Test 1: MSB-first 0xB4 = 1011_0100 ---
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

    // --- Test 2: LSB-first 0xB4 = bit0=0,bit1=0,bit2=1,bit3=0,bit4=1,bit5=1,bit6=0,bit7=1 ---
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
<h2>Receiving: Sampling MISO on Each Clock Edge</h2>
<p>
  While MOSI shifts data out, MISO shifts data <em>in</em>. On each
  <code>sample_pulse</code> the shift register samples the MISO line and
  appends it to an internal receive register <code>rx_shift</code>. After
  the full word has been received, <code>rx_shift</code> holds the complete
  parallel value.
</p>

<h3>MSB-First RX</h3>
<pre class="code-block">
// First sample → MSB, last → LSB
rx_shift &lt;= {rx_shift[6:0], miso_in};
</pre>

<h3>LSB-First RX</h3>
<pre class="code-block">
// First sample → LSB, last → MSB
rx_shift &lt;= {miso_in, rx_shift[7:1]};
</pre>

<h3>TX and RX Run in Parallel</h3>
<p>
  <code>launch_pulse</code> and <code>sample_pulse</code> are separate inputs.
  In SPI Mode 0, launch fires on falling SCK and sample fires on rising SCK —
  they never collide. Both can be handled in the same <code>always_ff</code> block.
</p>

<h3>What You Will Build</h3>
<p>
  Extend L2's module with <code>sample_pulse</code>, <code>miso_in</code>, and
  <code>rx_data [7:0]</code>. The <code>rx_shift</code> register updates on
  <code>sample_pulse</code> using the same <code>lsb_first</code> mux.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L2 spi_shift',
        '── New port ── input logic sample_pulse',
        '── New port ── input logic miso_in',
        '── New port ── output logic [7:0] rx_data',
        '── Internal ── logic [7:0] rx_shift',
        '── assign ── rx_data = rx_shift;',
        'In always_ff: add else-if (sample_pulse) — shift miso_in using lsb_first mux',
        'MSB-first: rx_shift <= {rx_shift[6:0], miso_in}',
        'LSB-first: rx_shift <= {miso_in, rx_shift[7:1]}',
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
//   output logic [7:0] rx_data      — = rx_shift
//
// New internal: logic [7:0] rx_shift
// In always_ff: sample_pulse branch shifts miso_in in (lsb_first mux)
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
<h2>Knowing When a Word Is Complete</h2>
<p>
  The shift register needs to tell the rest of the system when a full word has
  been transmitted and received. It does this with a one-cycle
  <strong>word_done</strong> pulse. A bit counter increments on each
  <code>launch_pulse</code>; when it reaches <code>word_len</code> it fires
  <code>word_done</code> and resets on the next load.
</p>
<pre class="code-block">
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n || load) bit_cnt &lt;= 3'b0;
  else if (launch_pulse) bit_cnt &lt;= bit_cnt + 1;
end

assign word_done = launch_pulse &amp;&amp; (bit_cnt === word_len - 1);
</pre>

<h3>Checkpoint A — spi_clk_div + spi_shift Loopback</h3>
<p>
  This lesson's testbench is the first <strong>integration test</strong> in the
  course. It instantiates two modules wired together:
</p>
<ul>
  <li><strong>spi_clk_div</strong> (spi_long2) — generates <code>rising_edge_p</code>
      and <code>falling_edge_p</code></li>
  <li><strong>spi_shift</strong> (this chapter) — driven by those pulses</li>
</ul>

<table class="truth-table">
  <tr><th>spi_clk_div output</th><th>spi_shift input</th><th>Mode 0 role</th></tr>
  <tr><td>falling_edge_p</td><td>launch_pulse</td><td>TX shifts out on falling SCK</td></tr>
  <tr><td>rising_edge_p</td><td>sample_pulse</td><td>RX samples on rising SCK</td></tr>
</table>

<p>
  With <code>miso_in = mosi_out</code> (loopback) and <code>tx_data = 0xA5</code>,
  after <code>word_done</code> fires <code>rx_data</code> must equal
  <code>0xA5</code>. This is <strong>Checkpoint A</strong>.
</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Start from L3 spi_shift',
        '── New port ── input logic [2:0] word_len',
        '── New port ── output logic word_done',
        '── Internal ── logic [2:0] bit_cnt',
        'In always_ff: reset bit_cnt on rst_n or load; increment on launch_pulse',
        'assign word_done = launch_pulse && (bit_cnt === word_len - 1);',
        'The testbench includes spi_clk_div inline — no extra file needed',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS rx_data=0xa5 and Checkpoint A PASS must appear in Output tab',
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
  assign sck_out       = enable ? sck_int : cpol;
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

  assign miso_in = mosi_out;

  initial begin
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

