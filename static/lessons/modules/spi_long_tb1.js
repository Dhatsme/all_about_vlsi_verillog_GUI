(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long_tb1',
  title: 'Unit Testbench Suite',
  icon: '🧪',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long_tb1l1',
      title: 'L1 — Clock Divider Testbench',
      theory: `<h2>Writing a Self-Checking Clock Divider Testbench</h2>
<p>Simulation without assertions is just waveform art. A production-quality testbench <em>measures</em> behaviour: it counts edges over a fixed time window, verifies idle levels after controlled state changes, and checks that one-cycle-wide pulses fire at exactly the right moments. This lesson walks through all three patterns using <code>spi_clk_div</code> — the 16-bit counter-based clock divider you built in Chapter 2.</p>
<h3>Why quantitative checking matters</h3>
<p>The naive approach just drives inputs and watches the waveform. That works for exploratory debugging, but it misses subtle bugs: a divider running at 90% of the target frequency looks correct on a zoomed-out waveform yet will cause SPI timing violations in silicon. The testbench below catches that class of bug by counting edges over a large window and failing if the count falls outside a tight tolerance band.</p>
<h3>Pattern 1 — Frequency measurement by edge counting</h3>
<p>Run the divider for N reference clock cycles and count how many <code>rising_edge_p</code> pulses appear. With <code>div=4</code>, the internal counter counts 0→4 then toggles — 5 cycles per half-period, 10 cycles per full period. Over 100 cycles you expect 10 rising edges.</p>
<pre class="code-block">rise_cnt = 0;
for (i = 0; i &lt; 100; i = i + 1) begin
  @(posedge pclk); #1;
  if (rising_edge_p) rise_cnt = rise_cnt + 1;
end
if (rise_cnt &gt;= 9 &amp;&amp; rise_cnt &lt;= 11)
  $display("PASS  SCK edges=%0d in 100 cycles", rise_cnt);</pre>
<p>The tolerance window (9–11 rather than exactly 10) accounts for the first toggle arriving after reset is released.</p>
<h3>Pattern 2 — Idle level after enable deassertion</h3>
<p>When <code>enable</code> goes low, <code>sck_out</code> must freeze at the <code>cpol</code> idle level within one clock cycle. The check is a single-cycle settle wait:</p>
<pre class="code-block">enable = 0;
@(posedge pclk); #1;
if (sck_out === 1'b0) $display("PASS  enable=0 freezes SCK at CPOL=0");</pre>
<h3>Pattern 3 — Edge pulse balance</h3>
<p><code>rising_edge_p</code> and <code>falling_edge_p</code> counts must match exactly over any complete run. If they differ, the edge detector has a bug.</p>
<pre class="code-block">if (rise_cnt == fall_cnt)
  $display("PASS  rising=%0d falling=%0d (balanced)", rise_cnt, fall_cnt);</pre>
<h3>Test plan for spi_clk_div</h3>
<table class="truth-table">
  <tr><th>Test</th><th>Signal</th><th>DIV</th><th>Window</th><th>Pass condition</th></tr>
  <tr><td>Frequency</td><td>rising_edge_p count</td><td>4</td><td>100 cycles</td><td>9 ≤ count ≤ 11</td></tr>
  <tr><td>CPOL=0 idle</td><td>sck_out when enable=0</td><td>—</td><td>4 cycles</td><td>sck_out===0</td></tr>
  <tr><td>CPOL=1 idle</td><td>sck_out when enable=0</td><td>—</td><td>4 cycles</td><td>sck_out===1</td></tr>
  <tr><td>Enable gating</td><td>sck_out after enable↓</td><td>4</td><td>1 cycle</td><td>sck_out===0</td></tr>
  <tr><td>Edge balance</td><td>rise vs fall count</td><td>2</td><td>40 cycles</td><td>rise==fall</td></tr>
</table>
<h3>What you will build</h3>
<p>Re-implement <code>spi_clk_div</code> in the Code tab. Internal: div_cnt [15:0], sck_int, sck_prev.</p>
<pre class="code-block">module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out, rising_edge_p, falling_edge_p
);</pre>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_clk_div from Chapter 2.',
        'Declare registers: div_cnt [15:0], sck_int, sck_prev',
        'always_ff: on rst_n low, clear div_cnt, sck_int, sck_prev',
        'enable=1: count div_cnt; when div_cnt==div reset and toggle sck_int; delay sck_int into sck_prev',
        'enable=0: force sck_int and sck_prev to cpol; reset div_cnt',
        'assign sck_out = enable ? sck_int : cpol',
        'assign rising_edge_p = sck_int & ~sck_prev',
        'assign falling_edge_p = ~sck_int & sck_prev',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_clk_div (
  input  logic        pclk, rst_n, enable, cpol,
  input  logic [15:0] div,
  output logic        sck_out, rising_edge_p, falling_edge_p
);
  logic [15:0] div_cnt;
  logic        sck_int;
  logic        sck_prev;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= 0; sck_int <= 0; sck_prev <= 0;
    end else if (enable) begin
      if (div_cnt == div) begin div_cnt <= 0; sck_int <= ~sck_int;
      end else div_cnt <= div_cnt + 1;
      sck_prev <= sck_int;
    end else begin
      sck_int <= cpol; sck_prev <= cpol; div_cnt <= 0;
    end
  end

  assign sck_out       = enable ? sck_int : cpol;
  assign rising_edge_p  = sck_int & ~sck_prev;
  assign falling_edge_p = ~sck_int & sck_prev;
endmodule`,
      design:
`// Re-implement spi_clk_div here.
// Ports: pclk, rst_n, enable, cpol, div[15:0], sck_out, rising_edge_p, falling_edge_p
// Internal: div_cnt [15:0], sck_int, sck_prev
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        pclk = 0;
  logic        rst_n, enable, cpol;
  logic [15:0] div;
  logic        sck_out, rising_edge_p, falling_edge_p;
  always #5 pclk = ~pclk;
  spi_clk_div dut (.pclk(pclk),.rst_n(rst_n),.enable(enable),
    .cpol(cpol),.div(div),.sck_out(sck_out),
    .rising_edge_p(rising_edge_p),.falling_edge_p(falling_edge_p));
  integer rise_cnt; integer fall_cnt; integer i;
  initial begin
    rst_n=0; enable=0; cpol=0; div=4;
    repeat(4) @(posedge pclk); rst_n=1;
    $display("=== Test 1: Frequency ===");
    enable=1; rise_cnt=0;
    for (i=0;i<100;i=i+1) begin @(posedge pclk);#1; if(rising_edge_p) rise_cnt=rise_cnt+1; end
    enable=0;
    if(rise_cnt>=9&&rise_cnt<=11) $display("PASS  SCK edges=%0d in 100 cycles",rise_cnt);
    else $display("FAIL  SCK edges=%0d",rise_cnt);
    $display("=== Test 2: CPOL idle ===");
    cpol=0; enable=0; repeat(4)@(posedge pclk);#1;
    if(sck_out===1'b0) $display("PASS  CPOL=0: sck_out idles low");
    else $display("FAIL  CPOL=0: sck_out=%0b",sck_out);
    cpol=1; enable=0; repeat(4)@(posedge pclk);#1;
    if(sck_out===1'b1) $display("PASS  CPOL=1: sck_out idles high");
    else $display("FAIL  CPOL=1: sck_out=%0b",sck_out);
    $display("=== Test 3: Enable gating ===");
    cpol=0; div=4; enable=1; repeat(20)@(posedge pclk); enable=0;
    @(posedge pclk);#1;
    if(sck_out===1'b0) $display("PASS  enable=0 freezes SCK at CPOL=0");
    else $display("FAIL  enable=0 sck_out=%0b",sck_out);
    $display("=== Test 4: Edge pulses ===");
    cpol=0; div=2; enable=1; rise_cnt=0; fall_cnt=0;
    for(i=0;i<40;i=i+1) begin @(posedge pclk);#1;
      if(rising_edge_p) rise_cnt=rise_cnt+1;
      if(falling_edge_p) fall_cnt=fall_cnt+1;
    end
    enable=0;
    if(rise_cnt>0&&rise_cnt==fall_cnt) $display("PASS  rising=%0d falling=%0d (balanced)",rise_cnt,fall_cnt);
    else $display("FAIL  rising=%0d falling=%0d",rise_cnt,fall_cnt);
    $display("Clock divider testbench complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  SCK edges=',
        'PASS  CPOL=0: sck_out idles low',
        'PASS  enable=0 freezes SCK at CPOL=0',
        'Clock divider testbench complete!'
      ]
    },
    {
      id: 'spi_long_tb1l2',
      title: 'L2 — FIFO Testbench',
      theory: `<h2>Writing a Self-Checking FIFO Testbench</h2>
<p>FIFOs are the most failure-prone component in digital designs because they combine pointer arithmetic, flag generation, and flow control in one module. A good FIFO testbench does not just push a few values and read them back — it deliberately drives the FIFO into every boundary condition: exactly full, exactly empty, overflow attempt, watermark crossing, and a flush. This lesson builds that testbench for the synchronous TX FIFO you designed in Chapter 3.</p>
<h3>The five boundary conditions every FIFO testbench must cover</h3>
<ul>
  <li><strong>Full detection</strong> — level must equal DEPTH and full must assert after the 8th write</li>
  <li><strong>Overflow protection</strong> — a write when full must be silently dropped and ovf_sticky must latch</li>
  <li><strong>Empty detection</strong> — level must reach 0 and empty must assert after the last read</li>
  <li><strong>Watermarks</strong> — almost_full when level ≥ 6; almost_empty when level ≤ 2 (WM=2)</li>
  <li><strong>Flush</strong> — one cycle of flush=1 must reset both pointers and level to 0</li>
</ul>
<h3>Helper tasks keep the test body readable</h3>
<pre class="code-block">task automatic fifo_write(input logic [7:0] data);
  wr_data = data; wr_en = 1;
  @(posedge pclk); #1;
  wr_en = 0;
endtask</pre>
<h3>Check flags after the clock edge</h3>
<p>Registered flags (full, level, etc.) are valid only <em>after</em> the clock edge and a #1 settle delay.</p>
<pre class="code-block">for (i = 0; i &lt; 8; i = i + 1) fifo_write(8'hA0 + i);
if (full === 1'b1 &amp;&amp; level === 4'd8)
  $display("PASS  FIFO full: level=8 full=1");</pre>
<h3>Test plan (DEPTH=8, WM=2)</h3>
<table class="truth-table">
  <tr><th>Test</th><th>Operation</th><th>Pass condition</th></tr>
  <tr><td>Fill</td><td>8 writes</td><td>full=1, level=8</td></tr>
  <tr><td>Overflow</td><td>write when full</td><td>ovf_sticky=1, level stays 8</td></tr>
  <tr><td>Drain</td><td>8 reads</td><td>empty=1, level=0</td></tr>
  <tr><td>almost_full</td><td>6 writes</td><td>almost_full=1</td></tr>
  <tr><td>almost_empty</td><td>4 reads</td><td>almost_empty=1 at level=2</td></tr>
  <tr><td>Flush</td><td>4 writes then flush</td><td>empty=1, level=0</td></tr>
</table>
<h3>What you will build</h3>
<p>Re-implement <code>spi_tx_fifo</code> with fixed DEPTH=8, WIDTH=8, WM=2.</p>
<pre class="code-block">module spi_tx_fifo (
  input  logic       pclk, rst_n, wr_en, rd_en, flush,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic       full, empty, almost_empty, almost_full, ovf_sticky,
  output logic [3:0] level
);</pre>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_tx_fifo from Chapter 3.',
        'Declare: logic [7:0] mem [0:7]; wr_ptr [2:0], rd_ptr [2:0], lvl [3:0], ovf_sticky',
        'Flags: full when lvl==8, empty when lvl==0, almost_full when lvl is 6+, almost_empty when lvl is 2 or less',
        'assign rd_data = mem[rd_ptr]',
        'always_ff: rst_n low or flush -- zero pointers, lvl, ovf_sticky',
        'Write when not full: store wr_data, increment wr_ptr, increment lvl',
        'Write when full: set ovf_sticky',
        'Read when not empty: increment rd_ptr, decrement lvl',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_tx_fifo (
  input  logic       pclk, rst_n, wr_en, rd_en, flush,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic       full, empty, almost_empty, almost_full, ovf_sticky,
  output logic [3:0] level
);
  logic [7:0] mem [0:7];
  logic [2:0] wr_ptr, rd_ptr;
  logic [3:0] lvl;
  assign level=lvl; assign full=(lvl==4'd8); assign empty=(lvl==4'd0);
  assign almost_full=(lvl>=4'd6); assign almost_empty=(lvl<=4'd2);
  assign rd_data=mem[rd_ptr];
  logic do_wr, do_rd;
  assign do_wr=wr_en&&!full; assign do_rd=rd_en&&!empty;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin wr_ptr<=0;rd_ptr<=0;lvl<=0;ovf_sticky<=0;
    end else if (flush) begin wr_ptr<=0;rd_ptr<=0;lvl<=0;ovf_sticky<=0;
    end else begin
      if(do_wr) begin mem[wr_ptr]<=wr_data; wr_ptr<=wr_ptr+1; end
      if(wr_en&&full) ovf_sticky<=1;
      if(do_rd) rd_ptr<=rd_ptr+1;
      if(do_wr&&!do_rd) lvl<=lvl+1;
      else if(!do_wr&&do_rd) lvl<=lvl-1;
    end
  end
endmodule`,
      design:
`// Re-implement spi_tx_fifo here. DEPTH=8, WIDTH=8, WM=2
// Internal: mem[0:7], wr_ptr [2:0], rd_ptr [2:0], lvl [3:0]
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk=0; logic rst_n,wr_en,rd_en,flush;
  logic [7:0] wr_data; logic [7:0] rd_data;
  logic full,empty,almost_empty,almost_full,ovf_sticky;
  logic [3:0] level;
  always #5 pclk=~pclk;
  spi_tx_fifo dut(.pclk(pclk),.rst_n(rst_n),.wr_en(wr_en),.rd_en(rd_en),
    .flush(flush),.wr_data(wr_data),.rd_data(rd_data),.full(full),.empty(empty),
    .almost_empty(almost_empty),.almost_full(almost_full),.ovf_sticky(ovf_sticky),.level(level));
  integer i;
  task automatic fifo_write(input logic [7:0] data);
    wr_data=data; wr_en=1; @(posedge pclk);#1; wr_en=0;
  endtask
  task automatic fifo_read;
    rd_en=1; @(posedge pclk);#1; rd_en=0;
  endtask
  initial begin
    rst_n=0;wr_en=0;rd_en=0;flush=0;wr_data=0;
    repeat(4)@(posedge pclk); rst_n=1; @(posedge pclk);#1;
    $display("=== Test 1: Fill ===");
    for(i=0;i<8;i=i+1) fifo_write(8'hA0+i);
    if(full===1'b1&&level===4'd8) $display("PASS  FIFO full: level=%0d full=1",level);
    else $display("FAIL  fill: level=%0d full=%0b",level,full);
    $display("=== Test 2: Overflow ===");
    fifo_write(8'hFF);
    if(ovf_sticky===1'b1&&level===4'd8) $display("PASS  overflow: ovf_sticky=1 level stays 8");
    else $display("FAIL  overflow: ovf_sticky=%0b level=%0d",ovf_sticky,level);
    $display("=== Test 3: Drain ===");
    for(i=0;i<8;i=i+1) fifo_read();
    if(empty===1'b1&&level===4'd0) $display("PASS  drained: level=%0d empty=1",level);
    else $display("FAIL  drain: level=%0d",level);
    $display("=== Test 4: Watermarks ===");
    for(i=0;i<6;i=i+1) fifo_write(8'hB0+i);
    if(almost_full===1'b1) $display("PASS  almost_full at level=%0d",level);
    else $display("FAIL  almost_full: level=%0d",level);
    for(i=0;i<4;i=i+1) fifo_read();
    if(almost_empty===1'b1) $display("PASS  almost_empty at level=%0d",level);
    else $display("FAIL  almost_empty: level=%0d",level);
    $display("=== Test 5: Flush ===");
    for(i=0;i<4;i=i+1) fifo_write(8'hC0+i);
    flush=1; @(posedge pclk);#1; flush=0;
    if(empty===1'b1&&level===4'd0) $display("PASS  flush: empty=1 level=0");
    else $display("FAIL  flush: empty=%0b level=%0d",empty,level);
    $display("FIFO testbench complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  FIFO full:',
        'PASS  overflow: ovf_sticky=1',
        'PASS  flush: empty=1 level=0',
        'FIFO testbench complete!'
      ]
    },
    {
      id: 'spi_long_tb1l3',
      title: 'L3 — Shift Register Testbench',
      theory: `<h2>Writing a Self-Checking Shift Register Testbench</h2>
<p>The shift register is the heart of SPI — every bit passes through it. Verifying it correctly needs three dimensions: data integrity (what goes in comes out), bit ordering (MSB-first vs LSB-first send bits in opposite orders), and word length (word_done fires after exactly WL bits, not WL−1 or WL+1). This lesson builds a testbench that covers all three.</p>
<h3>The loopback wire</h3>
<p>Connect <code>miso_in</code> directly to <code>mosi_out</code> with a <code>wire</code> assignment. Since <code>mosi_out</code> is combinational from the shift register state, the loopback captures the exact TX bit at sample time — no separate slave model needed.</p>
<pre class="code-block">wire miso_in;
assign miso_in = mosi_out;  // loopback: rx sees exactly what tx drives</pre>
<h3>Simultaneous launch and sample pulses</h3>
<p>Drive <code>launch_pulse</code> and <code>sample_pulse</code> high on the same clock cycle. In Verilog simulation, the sample reads the <em>current</em> (pre-shift) value of <code>mosi_out</code> because both registered updates happen in the NBA phase of the same clock edge. This mirrors CPHA=0 / Mode 0 timing.</p>
<pre class="code-block">for (i = 0; i &lt; word_len; i = i + 1) begin
  launch_pulse = 1; sample_pulse = 1;
  @(posedge pclk); #1;
  launch_pulse = 0; sample_pulse = 0;
end</pre>
<h3>MSB vs LSB-first bit reversal</h3>
<p>MSB-first loopback produces <code>rx_data[7:0] == tx_data[7:0]</code>. LSB-first sends the lowest bit first; with a shift-left RX buffer the received byte appears bit-reversed. Send 0xF0 and receive 0x0F.</p>
<table class="truth-table">
  <tr><th>Mode</th><th>tx_data</th><th>Bits sent (first→last)</th><th>rx_data[7:0]</th></tr>
  <tr><td>MSB-first</td><td>0xA5</td><td>1,0,1,0,0,1,0,1</td><td>0xA5</td></tr>
  <tr><td>LSB-first</td><td>0xF0</td><td>0,0,0,0,1,1,1,1</td><td>0x0F</td></tr>
</table>
<h3>word_done timing check</h3>
<p>Count how many times <code>word_done</code> asserts over a complete transfer. It must fire exactly once — on the last launch_pulse cycle. An off-by-one in the bit_cnt comparison fires it early or fires it twice.</p>
<h3>What you will build</h3>
<p>Re-implement <code>spi_shift</code> from Chapter 5. Internal: tx_shift [31:0], rx_shift [31:0], bit_cnt [4:0].</p>
<pre class="code-block">module spi_shift (
  input  logic        pclk, rst_n, load, lsb_first,
  input  logic [31:0] tx_data,
  input  logic [4:0]  word_len,
  input  logic        launch_pulse, sample_pulse, miso_in,
  output logic        mosi_out,
  output logic [31:0] rx_data,
  output logic        word_done
);</pre>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint for the annotated reference.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_shift from Chapter 5.',
        'Declare: tx_shift [31:0], rx_shift [31:0], bit_cnt [4:0]',
        'assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[word_len-1]',
        'assign rx_data = rx_shift',
        'always_ff: rst_n low -- zero tx_shift, rx_shift, bit_cnt, word_done',
        'On load: copy tx_data into tx_shift, reset bit_cnt to 0, word_done to 0',
        'On launch_pulse: shift tx_shift left (MSB) or right (LSB); increment bit_cnt; set word_done when bit_cnt==word_len-1',
        'On sample_pulse: rx_shift <= {rx_shift[30:0], miso_in}',
        'word_done resets to 0 at the start of every non-rst cycle (non-blocking)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_shift (
  input  logic        pclk, rst_n, load, lsb_first,
  input  logic [31:0] tx_data,
  input  logic [4:0]  word_len,
  input  logic        launch_pulse, sample_pulse, miso_in,
  output logic        mosi_out,
  output logic [31:0] rx_data,
  output logic        word_done
);
  logic [31:0] tx_shift, rx_shift;
  logic [4:0]  bit_cnt;

  assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[word_len - 1];
  assign rx_data  = rx_shift;

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      tx_shift<=0; rx_shift<=0; bit_cnt<=0; word_done<=0;
    end else begin
      word_done <= 0;
      if (load) begin tx_shift<=tx_data; bit_cnt<=0; end
      if (launch_pulse) begin
        tx_shift <= lsb_first ? {1'b0,tx_shift[31:1]} : {tx_shift[30:0],1'b0};
        bit_cnt  <= bit_cnt + 1;
        if (bit_cnt == word_len - 1) word_done <= 1;
      end
      if (sample_pulse) rx_shift <= {rx_shift[30:0], miso_in};
    end
  end
endmodule`,
      design:
`// Re-implement spi_shift here. See Theory for the test plan.
// Ports: pclk, rst_n, load, lsb_first, tx_data[31:0], word_len[4:0],
//        launch_pulse, sample_pulse, miso_in, mosi_out, rx_data[31:0], word_done
// Internal: tx_shift [31:0], rx_shift [31:0], bit_cnt [4:0]
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic        pclk = 0;
  logic        rst_n, load, lsb_first;
  logic [31:0] tx_data;
  logic [4:0]  word_len;
  logic        launch_pulse, sample_pulse;
  wire         miso_in;
  logic        mosi_out, word_done;
  logic [31:0] rx_data;
  always #5 pclk = ~pclk;
  spi_shift dut (.pclk(pclk),.rst_n(rst_n),.load(load),.lsb_first(lsb_first),
    .tx_data(tx_data),.word_len(word_len),.launch_pulse(launch_pulse),
    .sample_pulse(sample_pulse),.miso_in(miso_in),.mosi_out(mosi_out),
    .rx_data(rx_data),.word_done(word_done));
  assign miso_in = mosi_out;
  integer i; integer done_seen;
  initial begin
    rst_n=0;load=0;lsb_first=0;tx_data=0;
    word_len=8;launch_pulse=0;sample_pulse=0;
    repeat(4)@(posedge pclk); rst_n=1; @(posedge pclk);#1;
    // Test 1: WL=8 MSB-first loopback 0xA5
    $display("=== Test 1: MSB-first WL=8 ===");
    lsb_first=0; word_len=8; tx_data=32'hA5;
    load=1; @(posedge pclk);#1; load=0;
    for(i=0;i<8;i=i+1) begin
      launch_pulse=1; sample_pulse=1; @(posedge pclk);#1;
      launch_pulse=0; sample_pulse=0;
    end
    if(rx_data[7:0]===8'hA5) $display("PASS  MSB-first WL=8: rx=0xa5");
    else $display("FAIL  MSB-first WL=8: rx=0x%02x",rx_data[7:0]);
    // reset
    rst_n=0; @(posedge pclk);#1; rst_n=1; @(posedge pclk);#1;
    // Test 2: WL=8 LSB-first 0xF0 -> expect 0x0F
    $display("=== Test 2: LSB-first WL=8 ===");
    lsb_first=1; word_len=8; tx_data=32'hF0;
    load=1; @(posedge pclk);#1; load=0;
    for(i=0;i<8;i=i+1) begin
      launch_pulse=1; sample_pulse=1; @(posedge pclk);#1;
      launch_pulse=0; sample_pulse=0;
    end
    if(rx_data[7:0]===8'h0F) $display("PASS  LSB-first WL=8: rx=0x0f (bit-reversed 0xF0)");
    else $display("FAIL  LSB-first WL=8: rx=0x%02x",rx_data[7:0]);
    // reset
    rst_n=0; @(posedge pclk);#1; rst_n=1; @(posedge pclk);#1;
    // Test 3: WL=1 single bit
    $display("=== Test 3: WL=1 ===");
    lsb_first=0; word_len=1; tx_data=32'h1;
    load=1; @(posedge pclk);#1; load=0;
    launch_pulse=1; sample_pulse=1; @(posedge pclk);#1;
    launch_pulse=0; sample_pulse=0;
    if(rx_data[0]===1'b1) $display("PASS  WL=1: single bit received");
    else $display("FAIL  WL=1: rx_data[0]=%0b",rx_data[0]);
    // reset
    rst_n=0; @(posedge pclk);#1; rst_n=1; @(posedge pclk);#1;
    // Test 4: word_done fires exactly once
    $display("=== Test 4: word_done ===");
    lsb_first=0; word_len=8; tx_data=32'hC3;
    load=1; @(posedge pclk);#1; load=0;
    done_seen=0;
    for(i=0;i<8;i=i+1) begin
      launch_pulse=1; sample_pulse=1; @(posedge pclk);#1;
      launch_pulse=0; sample_pulse=0;
      if(word_done) done_seen=done_seen+1;
    end
    if(done_seen===1) $display("PASS  word_done fired exactly once");
    else $display("FAIL  word_done fired %0d times",done_seen);
    $display("Shift register testbench complete!"); $finish;
  end
endmodule`,
      expected: [
        'PASS  MSB-first WL=8: rx=0xa5',
        'PASS  LSB-first WL=8:',
        'PASS  word_done fired exactly once',
        'Shift register testbench complete!'
      ]
    }
  ]
});
