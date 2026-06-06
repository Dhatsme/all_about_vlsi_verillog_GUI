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
<p>A production-quality testbench <em>measures</em> behaviour: it counts edges over a fixed time window, verifies idle levels after controlled state changes, and checks that one-cycle-wide pulses fire at exactly the right moments. This lesson walks through all three patterns using <code>spi_clk_div</code>.</p>
<h3>Pattern 1 — Frequency by edge counting</h3>
<p>Run the divider for N cycles and count <code>rising_edge_p</code> pulses. With <code>div=4</code>, 5 cycles per half-period means 10 rising edges per 100 cycles. Accept 9–11 to allow for startup latency.</p>
<pre class="code-block">rise_cnt = 0;
for (i = 0; i &lt; 100; i = i + 1) begin
  @(posedge pclk); #1;
  if (rising_edge_p) rise_cnt = rise_cnt + 1;
end
if (rise_cnt &gt;= 9 &amp;&amp; rise_cnt &lt;= 11) $display("PASS ...");</pre>
<h3>Pattern 2 — Idle level check</h3>
<p>When <code>enable</code> goes low, <code>sck_out</code> must freeze at <code>cpol</code> within one cycle — not mid-toggle.</p>
<pre class="code-block">enable = 0; @(posedge pclk); #1;
if (sck_out === 1'b0) $display("PASS  enable=0 freezes SCK at CPOL=0");</pre>
<h3>Pattern 3 — Edge pulse balance</h3>
<p>rising_edge_p and falling_edge_p counts must match exactly. A mismatch means the edge detector has a bug.</p>
<h3>Test plan for spi_clk_div</h3>
<table class="truth-table">
  <tr><th>Test</th><th>DIV</th><th>Window</th><th>Pass condition</th></tr>
  <tr><td>Frequency</td><td>4</td><td>100 cycles</td><td>9 ≤ edges ≤ 11</td></tr>
  <tr><td>CPOL=0 idle</td><td>—</td><td>4 cycles</td><td>sck_out===0</td></tr>
  <tr><td>CPOL=1 idle</td><td>—</td><td>4 cycles</td><td>sck_out===1</td></tr>
  <tr><td>Enable gating</td><td>4</td><td>1 cycle</td><td>sck_out===cpol</td></tr>
  <tr><td>Edge balance</td><td>2</td><td>40 cycles</td><td>rise==fall</td></tr>
</table>
<p>Re-implement <code>spi_clk_div</code>: div_cnt [15:0], sck_int, sck_prev.<br><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_clk_div from Chapter 2.',
        'Declare: div_cnt [15:0], sck_int, sck_prev',
        'always_ff: rst_n low → clear all; enable=1 → count/toggle; enable=0 → freeze at cpol',
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
  logic sck_int, sck_prev;
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin div_cnt<=0; sck_int<=0; sck_prev<=0;
    end else if (enable) begin
      if (div_cnt==div) begin div_cnt<=0; sck_int<=~sck_int; end
      else div_cnt<=div_cnt+1;
      sck_prev<=sck_int;
    end else begin sck_int<=cpol; sck_prev<=cpol; div_cnt<=0; end
  end
  assign sck_out=enable?sck_int:cpol;
  assign rising_edge_p=sck_int&~sck_prev;
  assign falling_edge_p=~sck_int&sck_prev;
endmodule`,
      design: `// Re-implement spi_clk_div. Ports: pclk,rst_n,enable,cpol,div[15:0],sck_out,rising_edge_p,falling_edge_p\n// Internal: div_cnt[15:0], sck_int, sck_prev\n`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk=0; logic rst_n,enable,cpol; logic [15:0] div;
  logic sck_out,rising_edge_p,falling_edge_p;
  always #5 pclk=~pclk;
  spi_clk_div dut(.pclk(pclk),.rst_n(rst_n),.enable(enable),.cpol(cpol),.div(div),
    .sck_out(sck_out),.rising_edge_p(rising_edge_p),.falling_edge_p(falling_edge_p));
  integer rise_cnt,fall_cnt,i;
  initial begin
    rst_n=0;enable=0;cpol=0;div=4; repeat(4)@(posedge pclk); rst_n=1;
    $display("=== Test 1: Frequency ==="); enable=1; rise_cnt=0;
    for(i=0;i<100;i=i+1) begin @(posedge pclk);#1; if(rising_edge_p) rise_cnt=rise_cnt+1; end
    enable=0;
    if(rise_cnt>=9&&rise_cnt<=11) $display("PASS  SCK edges=%0d in 100 cycles",rise_cnt);
    else $display("FAIL  SCK edges=%0d",rise_cnt);
    cpol=0;enable=0; repeat(4)@(posedge pclk);#1;
    if(sck_out===1'b0) $display("PASS  CPOL=0: sck_out idles low");
    else $display("FAIL  CPOL=0: %0b",sck_out);
    cpol=1;enable=0; repeat(4)@(posedge pclk);#1;
    if(sck_out===1'b1) $display("PASS  CPOL=1: sck_out idles high");
    else $display("FAIL  CPOL=1: %0b",sck_out);
    cpol=0;div=4;enable=1; repeat(20)@(posedge pclk); enable=0; @(posedge pclk);#1;
    if(sck_out===1'b0) $display("PASS  enable=0 freezes SCK at CPOL=0");
    else $display("FAIL  enable=0: %0b",sck_out);
    cpol=0;div=2;enable=1; rise_cnt=0;fall_cnt=0;
    for(i=0;i<40;i=i+1) begin @(posedge pclk);#1;
      if(rising_edge_p) rise_cnt=rise_cnt+1;
      if(falling_edge_p) fall_cnt=fall_cnt+1;
    end enable=0;
    if(rise_cnt>0&&rise_cnt==fall_cnt) $display("PASS  rising=%0d falling=%0d (balanced)",rise_cnt,fall_cnt);
    else $display("FAIL  rise=%0d fall=%0d",rise_cnt,fall_cnt);
    $display("Clock divider testbench complete!"); $finish;
  end
endmodule`,
      expected: ['PASS  SCK edges=','PASS  CPOL=0: sck_out idles low','PASS  enable=0 freezes SCK at CPOL=0','Clock divider testbench complete!']
    },
    {
      id: 'spi_long_tb1l2',
      title: 'L2 — FIFO Testbench',
      theory: `<h2>Writing a Self-Checking FIFO Testbench</h2>
<p>A good FIFO testbench deliberately drives every boundary condition: exactly full, overflow attempt, drain to empty, watermark crossings, and flush. This lesson builds all five for the TX FIFO from Chapter 3.</p>
<h3>Helper tasks</h3>
<pre class="code-block">task automatic fifo_write(input logic [7:0] data);
  wr_data=data; wr_en=1; @(posedge pclk);#1; wr_en=0;
endtask</pre>
<h3>Check flags after the clock edge</h3>
<p>Registered flags are valid only <em>after</em> posedge + #1 settle. Checking before gives last-cycle values.</p>
<pre class="code-block">for(i=0;i&lt;8;i=i+1) fifo_write(8'hA0+i);
if(full===1'b1 &amp;&amp; level===4'd8) $display("PASS  FIFO full");</pre>
<h3>Test plan (DEPTH=8, WM=2)</h3>
<table class="truth-table">
  <tr><th>Test</th><th>Op</th><th>Pass condition</th></tr>
  <tr><td>Fill</td><td>8 writes</td><td>full=1, level=8</td></tr>
  <tr><td>Overflow</td><td>write when full</td><td>ovf_sticky=1, level stays 8</td></tr>
  <tr><td>Drain</td><td>8 reads</td><td>empty=1, level=0</td></tr>
  <tr><td>almost_full</td><td>6 writes</td><td>almost_full=1</td></tr>
  <tr><td>almost_empty</td><td>4 reads</td><td>almost_empty=1 at level=2</td></tr>
  <tr><td>Flush</td><td>4 writes + flush</td><td>empty=1, level=0</td></tr>
</table>
<p>Re-implement <code>spi_tx_fifo</code> (DEPTH=8, WM=2). Internal: mem[0:7], wr_ptr/rd_ptr [2:0], lvl [3:0].<br><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_tx_fifo from Chapter 3.',
        'Declare: mem[0:7], wr_ptr[2:0], rd_ptr[2:0], lvl[3:0], ovf_sticky',
        'Flags: full when lvl==8, empty when lvl==0, almost_full when lvl is 6+, almost_empty when lvl is 2 or less',
        'assign rd_data = mem[rd_ptr]',
        'always_ff: rst_n low or flush -- zero pointers, lvl, ovf_sticky',
        'Write when not full: store wr_data, increment wr_ptr, increment lvl',
        'Write when full: set ovf_sticky; Read when not empty: increment rd_ptr, decrement lvl',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_tx_fifo (
  input  logic pclk,rst_n,wr_en,rd_en,flush,
  input  logic [7:0] wr_data,
  output logic [7:0] rd_data,
  output logic full,empty,almost_empty,almost_full,ovf_sticky,
  output logic [3:0] level
);
  logic [7:0] mem[0:7]; logic [2:0] wr_ptr,rd_ptr; logic [3:0] lvl;
  assign level=lvl; assign full=(lvl==4'd8); assign empty=(lvl==4'd0);
  assign almost_full=(lvl>=4'd6); assign almost_empty=(lvl<=4'd2);
  assign rd_data=mem[rd_ptr];
  logic do_wr,do_rd;
  assign do_wr=wr_en&&!full; assign do_rd=rd_en&&!empty;
  always_ff @(posedge pclk or negedge rst_n) begin
    if(!rst_n) begin wr_ptr<=0;rd_ptr<=0;lvl<=0;ovf_sticky<=0;
    end else if(flush) begin wr_ptr<=0;rd_ptr<=0;lvl<=0;ovf_sticky<=0;
    end else begin
      if(do_wr) begin mem[wr_ptr]<=wr_data; wr_ptr<=wr_ptr+1; end
      if(wr_en&&full) ovf_sticky<=1;
      if(do_rd) rd_ptr<=rd_ptr+1;
      if(do_wr&&!do_rd) lvl<=lvl+1;
      else if(!do_wr&&do_rd) lvl<=lvl-1;
    end
  end
endmodule`,
      design: `// Re-implement spi_tx_fifo. DEPTH=8,WM=2. Internal: mem[0:7],wr_ptr/rd_ptr[2:0],lvl[3:0]\n`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk=0;logic rst_n,wr_en,rd_en,flush;
  logic [7:0] wr_data,rd_data;
  logic full,empty,almost_empty,almost_full,ovf_sticky;
  logic [3:0] level;
  always #5 pclk=~pclk;
  spi_tx_fifo dut(.pclk(pclk),.rst_n(rst_n),.wr_en(wr_en),.rd_en(rd_en),.flush(flush),
    .wr_data(wr_data),.rd_data(rd_data),.full(full),.empty(empty),
    .almost_empty(almost_empty),.almost_full(almost_full),.ovf_sticky(ovf_sticky),.level(level));
  integer i;
  task automatic fifo_write(input logic [7:0] data);
    wr_data=data;wr_en=1;@(posedge pclk);#1;wr_en=0;
  endtask
  task automatic fifo_read;
    rd_en=1;@(posedge pclk);#1;rd_en=0;
  endtask
  initial begin
    rst_n=0;wr_en=0;rd_en=0;flush=0;wr_data=0;
    repeat(4)@(posedge pclk);rst_n=1;@(posedge pclk);#1;
    for(i=0;i<8;i=i+1) fifo_write(8'hA0+i);
    if(full===1'b1&&level===4'd8) $display("PASS  FIFO full: level=%0d",level);
    else $display("FAIL  fill: level=%0d full=%0b",level,full);
    fifo_write(8'hFF);
    if(ovf_sticky===1'b1&&level===4'd8) $display("PASS  overflow: ovf_sticky=1 level stays 8");
    else $display("FAIL  overflow: %0b level=%0d",ovf_sticky,level);
    for(i=0;i<8;i=i+1) fifo_read();
    if(empty===1'b1&&level===4'd0) $display("PASS  drained: empty=1 level=0");
    else $display("FAIL  drain: level=%0d",level);
    for(i=0;i<6;i=i+1) fifo_write(8'hB0+i);
    if(almost_full===1'b1) $display("PASS  almost_full at level=%0d",level);
    else $display("FAIL  almost_full: level=%0d",level);
    for(i=0;i<4;i=i+1) fifo_read();
    if(almost_empty===1'b1) $display("PASS  almost_empty at level=%0d",level);
    else $display("FAIL  almost_empty: level=%0d",level);
    for(i=0;i<4;i=i+1) fifo_write(8'hC0+i);
    flush=1;@(posedge pclk);#1;flush=0;
    if(empty===1'b1&&level===4'd0) $display("PASS  flush: empty=1 level=0");
    else $display("FAIL  flush: %0b level=%0d",empty,level);
    $display("FIFO testbench complete!");$finish;
  end
endmodule`,
      expected: ['PASS  FIFO full:','PASS  overflow: ovf_sticky=1','PASS  flush: empty=1 level=0','FIFO testbench complete!']
    },
    {
      id: 'spi_long_tb1l3',
      title: 'L3 — Shift Register Testbench',
      theory: `<h2>Writing a Self-Checking Shift Register Testbench</h2>
<p>The shift register is the heart of SPI. Verifying it needs three dimensions: data integrity (what goes in comes out), bit ordering (MSB-first vs LSB-first send bits in opposite order), and word length (word_done fires after exactly WL bits). This lesson builds all three.</p>
<h3>The loopback wire</h3>
<pre class="code-block">wire miso_in;
assign miso_in = mosi_out;  // rx sees exactly what tx drives</pre>
<h3>Simultaneous launch and sample</h3>
<p>Drive both pulses on the same clock edge. Sample reads the <em>current</em> (pre-shift) MOSI value due to NBA ordering — this mirrors CPHA=0 timing.</p>
<pre class="code-block">for(i=0;i&lt;word_len;i=i+1) begin
  launch_pulse=1; sample_pulse=1;
  @(posedge pclk);#1;
  launch_pulse=0; sample_pulse=0;
end</pre>
<h3>MSB vs LSB-first bit reversal</h3>
<table class="truth-table">
  <tr><th>Mode</th><th>tx_data</th><th>Bits sent</th><th>rx_data[7:0]</th></tr>
  <tr><td>MSB-first</td><td>0xA5</td><td>bit7→bit0</td><td>0xA5 (same)</td></tr>
  <tr><td>LSB-first</td><td>0xF0</td><td>bit0→bit7</td><td>0x0F (reversed)</td></tr>
</table>
<h3>word_done timing</h3>
<p>Count word_done assertions. It must fire exactly once per transfer on the last launch_pulse cycle.</p>
<p>Re-implement <code>spi_shift</code>: tx_shift [31:0], rx_shift [31:0], bit_cnt [4:0].<br><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_shift from Chapter 5.',
        'Declare: tx_shift[31:0], rx_shift[31:0], bit_cnt[4:0]',
        'assign mosi_out = lsb_first ? tx_shift[0] : tx_shift[word_len-1]',
        'On load: tx_shift<=tx_data; bit_cnt<=0',
        'On launch_pulse: shift tx_shift left (MSB) or right (LSB); increment bit_cnt; word_done when bit_cnt==word_len-1',
        'On sample_pulse: rx_shift <= {rx_shift[30:0], miso_in}',
        'word_done resets to 0 at start of every cycle (non-blocking default)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_shift (
  input  logic pclk,rst_n,load,lsb_first,
  input  logic [31:0] tx_data,
  input  logic [4:0]  word_len,
  input  logic launch_pulse,sample_pulse,miso_in,
  output logic mosi_out,
  output logic [31:0] rx_data,
  output logic word_done
);
  logic [31:0] tx_shift,rx_shift; logic [4:0] bit_cnt;
  assign mosi_out=lsb_first?tx_shift[0]:tx_shift[word_len-1];
  assign rx_data=rx_shift;
  always_ff @(posedge pclk or negedge rst_n) begin
    if(!rst_n) begin tx_shift<=0;rx_shift<=0;bit_cnt<=0;word_done<=0;
    end else begin
      word_done<=0;
      if(load) begin tx_shift<=tx_data;bit_cnt<=0; end
      if(launch_pulse) begin
        tx_shift<=lsb_first?{1'b0,tx_shift[31:1]}:{tx_shift[30:0],1'b0};
        bit_cnt<=bit_cnt+1;
        if(bit_cnt==word_len-1) word_done<=1;
      end
      if(sample_pulse) rx_shift<={rx_shift[30:0],miso_in};
    end
  end
endmodule`,
      design: `// Re-implement spi_shift. Ports: pclk,rst_n,load,lsb_first,tx_data[31:0],word_len[4:0],launch_pulse,sample_pulse,miso_in,mosi_out,rx_data[31:0],word_done\n// Internal: tx_shift[31:0],rx_shift[31:0],bit_cnt[4:0]\n`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk=0;logic rst_n,load,lsb_first;
  logic [31:0] tx_data; logic [4:0] word_len;
  logic launch_pulse,sample_pulse;
  wire  miso_in; logic mosi_out,word_done; logic [31:0] rx_data;
  always #5 pclk=~pclk;
  spi_shift dut(.pclk(pclk),.rst_n(rst_n),.load(load),.lsb_first(lsb_first),
    .tx_data(tx_data),.word_len(word_len),.launch_pulse(launch_pulse),
    .sample_pulse(sample_pulse),.miso_in(miso_in),.mosi_out(mosi_out),
    .rx_data(rx_data),.word_done(word_done));
  assign miso_in=mosi_out;
  integer i,done_seen;
  initial begin
    rst_n=0;load=0;lsb_first=0;tx_data=0;word_len=8;launch_pulse=0;sample_pulse=0;
    repeat(4)@(posedge pclk);rst_n=1;@(posedge pclk);#1;
    $display("=== Test 1: MSB-first WL=8 ===");
    lsb_first=0;word_len=8;tx_data=32'hA5;
    load=1;@(posedge pclk);#1;load=0;
    for(i=0;i<8;i=i+1) begin launch_pulse=1;sample_pulse=1;@(posedge pclk);#1;launch_pulse=0;sample_pulse=0; end
    if(rx_data[7:0]===8'hA5) $display("PASS  MSB-first WL=8: rx=0xa5");
    else $display("FAIL  MSB-first: rx=0x%02x",rx_data[7:0]);
    rst_n=0;@(posedge pclk);#1;rst_n=1;@(posedge pclk);#1;
    $display("=== Test 2: LSB-first WL=8 ===");
    lsb_first=1;word_len=8;tx_data=32'hF0;
    load=1;@(posedge pclk);#1;load=0;
    for(i=0;i<8;i=i+1) begin launch_pulse=1;sample_pulse=1;@(posedge pclk);#1;launch_pulse=0;sample_pulse=0; end
    if(rx_data[7:0]===8'h0F) $display("PASS  LSB-first WL=8: rx=0x0f (bit-reversed 0xF0)");
    else $display("FAIL  LSB-first: rx=0x%02x",rx_data[7:0]);
    rst_n=0;@(posedge pclk);#1;rst_n=1;@(posedge pclk);#1;
    $display("=== Test 3: WL=1 ===");
    lsb_first=0;word_len=1;tx_data=32'h1;
    load=1;@(posedge pclk);#1;load=0;
    launch_pulse=1;sample_pulse=1;@(posedge pclk);#1;launch_pulse=0;sample_pulse=0;
    if(rx_data[0]===1'b1) $display("PASS  WL=1: single bit received");
    else $display("FAIL  WL=1: %0b",rx_data[0]);
    rst_n=0;@(posedge pclk);#1;rst_n=1;@(posedge pclk);#1;
    $display("=== Test 4: word_done ===");
    lsb_first=0;word_len=8;tx_data=32'hC3;
    load=1;@(posedge pclk);#1;load=0;done_seen=0;
    for(i=0;i<8;i=i+1) begin
      launch_pulse=1;sample_pulse=1;@(posedge pclk);#1;launch_pulse=0;sample_pulse=0;
      if(word_done) done_seen=done_seen+1;
    end
    if(done_seen===1) $display("PASS  word_done fired exactly once");
    else $display("FAIL  word_done fired %0d times",done_seen);
    $display("Shift register testbench complete!");$finish;
  end
endmodule`,
      expected: ['PASS  MSB-first WL=8: rx=0xa5','PASS  LSB-first WL=8:','PASS  word_done fired exactly once','Shift register testbench complete!']
    },
    {
      id: 'spi_long_tb1l4',
      title: 'L4 — Master FSM Testbench',
      theory: `<h2>Writing a Coverage-Complete FSM Testbench</h2>
<p>A finite-state machine testbench has one primary goal: visit every state and verify the correct outputs and transitions fire under the correct conditions. Missing even one state means a whole class of bugs goes undetected. This lesson builds a 7-state coverage testbench for the SPI master FSM from Chapter 8.</p>
<h3>The 7-state coverage requirement</h3>
<table class="truth-table">
  <tr><th>State</th><th>Key output to verify</th><th>Entry condition</th></tr>
  <tr><td>IDLE (0)</td><td>busy=0</td><td>reset or transfer complete</td></tr>
  <tr><td>LOAD (1)</td><td>load_pulse=1</td><td>start asserted in IDLE</td></tr>
  <tr><td>ASSERT_CS (2)</td><td>cs_active=1</td><td>1 cycle after LOAD</td></tr>
  <tr><td>SHIFT (3)</td><td>enable_sck=1</td><td>pre_delay_done in ASSERT_CS</td></tr>
  <tr><td>COMPLETE (4)</td><td>cs_active=1</td><td>word_done in SHIFT</td></tr>
  <tr><td>DEASSERT_CS (5)</td><td>cs_active=1</td><td>1 cycle after COMPLETE</td></tr>
  <tr><td>ABORT_WAIT (6)</td><td>cs_active=0, busy=1</td><td>abort in SHIFT</td></tr>
</table>
<h3>Timing: drive → wait → check</h3>
<p>Each transition fires on the clock edge after the condition is asserted. Assert the condition, wait one posedge + #1, then check the new state. De-assert the condition immediately to prevent unintended follow-on transitions.</p>
<pre class="code-block">pre_delay_done = 1;       // assert condition
@(posedge pclk); #1;      // wait for transition
pre_delay_done = 0;       // de-assert
if (state_out === 3'd3)   // SHIFT
  $display("PASS  SHIFT: enable_sck=1");</pre>
<h3>Checking one-cycle pulse outputs</h3>
<p>load_pulse and transfer_done fire for exactly one cycle. Check them immediately after the transition that generates them — they will be 0 on the next cycle.</p>
<h3>Testing error paths</h3>
<p>Two non-happy-path sequences are critical: ABORT during SHIFT (goes to ABORT_WAIT then IDLE), and SOFT_RST from any state (returns to IDLE unconditionally overriding any transition).</p>
<h3>What you will build</h3>
<p>Re-implement <code>spi_master_fsm</code> from Chapter 8. Use a 3-bit encoded state with typedef enum.</p>
<pre class="code-block">module spi_master_fsm (
  input  logic pclk, rst_n, start, abort, soft_rst,
  input  logic word_done, pre_delay_done, post_delay_done,
  output logic busy, cs_active, enable_sck,
  output logic load_pulse, transfer_done,
  output logic [2:0] state_out
);</pre>
<p><strong>Ready?</strong> Switch to the Code tab. The testbench walks all 7 states. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — re-implement spi_master_fsm from Chapter 8.',
        'typedef enum logic [2:0] { IDLE=0, LOAD=1, ASSERT_CS=2, SHIFT=3, COMPLETE=4, DEASSERT_CS=5, ABORT_WAIT=6 } state_t',
        'assign busy = (state != IDLE)',
        'assign cs_active = (state==ASSERT_CS || state==SHIFT || state==COMPLETE || state==DEASSERT_CS)',
        'assign enable_sck = (state == SHIFT)',
        'always_ff: rst_n low -> IDLE; each cycle: load_pulse<=0; transfer_done<=0; then case(state)',
        'IDLE: if start -> LOAD + load_pulse<=1',
        'LOAD -> ASSERT_CS (unconditional); ASSERT_CS: if pre_delay_done -> SHIFT',
        'SHIFT: if abort -> ABORT_WAIT; else if word_done -> COMPLETE',
        'COMPLETE -> DEASSERT_CS (unconditional); DEASSERT_CS: if post_delay_done -> IDLE + transfer_done<=1',
        'ABORT_WAIT: if post_delay_done -> IDLE; soft_rst overrides case: if soft_rst -> IDLE',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_master_fsm (
  input  logic pclk,rst_n,start,abort,soft_rst,
  input  logic word_done,pre_delay_done,post_delay_done,
  output logic busy,cs_active,enable_sck,load_pulse,transfer_done,
  output logic [2:0] state_out
);
  typedef enum logic [2:0] {
    IDLE=3'd0, LOAD=3'd1, ASSERT_CS=3'd2, SHIFT=3'd3,
    COMPLETE=3'd4, DEASSERT_CS=3'd5, ABORT_WAIT=3'd6
  } state_t;
  state_t state;
  assign state_out  = state;
  assign busy       = (state != IDLE);
  assign cs_active  = (state==ASSERT_CS||state==SHIFT||state==COMPLETE||state==DEASSERT_CS);
  assign enable_sck = (state==SHIFT);
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin state<=IDLE; load_pulse<=0; transfer_done<=0;
    end else begin
      load_pulse<=0; transfer_done<=0;
      if (soft_rst) state<=IDLE;
      else case (state)
        IDLE:        if (start) begin state<=LOAD; load_pulse<=1; end
        LOAD:        state<=ASSERT_CS;
        ASSERT_CS:   if (pre_delay_done) state<=SHIFT;
        SHIFT:       if (abort) state<=ABORT_WAIT;
                     else if (word_done) state<=COMPLETE;
        COMPLETE:    state<=DEASSERT_CS;
        DEASSERT_CS: if (post_delay_done) begin state<=IDLE; transfer_done<=1; end
        ABORT_WAIT:  if (post_delay_done) state<=IDLE;
        default:     state<=IDLE;
      endcase
    end
  end
endmodule`,
      design: `// Re-implement spi_master_fsm. 7 states: IDLE,LOAD,ASSERT_CS,SHIFT,COMPLETE,DEASSERT_CS,ABORT_WAIT\n// Use typedef enum logic [2:0] for state encoding\n`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk=0;
  logic rst_n,start,abort,soft_rst;
  logic word_done,pre_delay_done,post_delay_done;
  logic busy,cs_active,enable_sck,load_pulse,transfer_done;
  logic [2:0] state_out;
  always #5 pclk=~pclk;
  spi_master_fsm dut(.pclk(pclk),.rst_n(rst_n),.start(start),.abort(abort),.soft_rst(soft_rst),
    .word_done(word_done),.pre_delay_done(pre_delay_done),.post_delay_done(post_delay_done),
    .busy(busy),.cs_active(cs_active),.enable_sck(enable_sck),
    .load_pulse(load_pulse),.transfer_done(transfer_done),.state_out(state_out));
  initial begin
    rst_n=0;start=0;abort=0;soft_rst=0;
    word_done=0;pre_delay_done=0;post_delay_done=0;
    repeat(4)@(posedge pclk);rst_n=1;@(posedge pclk);#1;
    // Test 1: Reset state
    $display("=== Test 1: Reset ===");
    if(state_out===3'd0&&busy===1'b0) $display("PASS  reset: state=IDLE busy=0");
    else $display("FAIL  reset: state=%0d busy=%0b",state_out,busy);
    // Test 2: Full happy path
    $display("=== Test 2: Full transfer ===");
    start=1;@(posedge pclk);#1;start=0;  // IDLE->LOAD
    if(state_out===3'd1&&load_pulse===1'b1) $display("PASS  LOAD: load_pulse=1");
    else $display("FAIL  LOAD: state=%0d lp=%0b",state_out,load_pulse);
    @(posedge pclk);#1;  // LOAD->ASSERT_CS
    if(state_out===3'd2&&cs_active===1'b1) $display("PASS  ASSERT_CS: cs_active=1");
    else $display("FAIL  ASSERT_CS: state=%0d",state_out);
    pre_delay_done=1;@(posedge pclk);#1;pre_delay_done=0;  // ->SHIFT
    if(state_out===3'd3&&enable_sck===1'b1) $display("PASS  SHIFT: enable_sck=1");
    else $display("FAIL  SHIFT: state=%0d",state_out);
    word_done=1;@(posedge pclk);#1;word_done=0;  // ->COMPLETE
    @(posedge pclk);#1;  // ->DEASSERT_CS
    post_delay_done=1;@(posedge pclk);#1;post_delay_done=0;  // ->IDLE
    if(state_out===3'd0&&transfer_done===1'b1) $display("PASS  transfer done: state=IDLE transfer_done=1");
    else $display("FAIL  done: state=%0d done=%0b",state_out,transfer_done);
    // Test 3: ABORT mid-SHIFT
    $display("=== Test 3: ABORT ===");
    start=1;@(posedge pclk);#1;start=0;
    @(posedge pclk);#1;
    pre_delay_done=1;@(posedge pclk);#1;pre_delay_done=0;
    abort=1;@(posedge pclk);#1;abort=0;
    if(state_out===3'd6) $display("PASS  ABORT_WAIT: state=6");
    else $display("FAIL  ABORT: state=%0d",state_out);
    post_delay_done=1;@(posedge pclk);#1;post_delay_done=0;
    if(state_out===3'd0&&busy===1'b0) $display("PASS  abort recovery: IDLE busy=0");
    else $display("FAIL  abort recovery: state=%0d",state_out);
    // Test 4: SOFT_RST
    $display("=== Test 4: SOFT_RST ===");
    start=1;@(posedge pclk);#1;start=0;
    @(posedge pclk);#1;
    soft_rst=1;@(posedge pclk);#1;soft_rst=0;
    if(state_out===3'd0&&busy===1'b0) $display("PASS  soft_rst: state=IDLE busy=0");
    else $display("FAIL  soft_rst: state=%0d",state_out);
    $display("FSM testbench complete!");$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: state=IDLE busy=0',
        'PASS  transfer done: state=IDLE transfer_done=1',
        'PASS  ABORT_WAIT: state=6',
        'FSM testbench complete!'
      ]
    }
  ]
});
