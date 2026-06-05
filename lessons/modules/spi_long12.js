(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long12',
  title: 'Full SPI Master Integration',
  icon: '🏗️',
  level: 'advanced',
  lessons: [

    // ── L1 ──────────────────────────────────────────────────────────────────
    {
      id: 'spi_long12l1',
      title: 'L1 — Datapath Assembly: Clock, Timing, and Shift',
      theory:
`<h2>Assembling the SPI Datapath</h2>
<p>Imagine a newspaper printing press. Raw paper — your clock signal — feeds in from one end continuously. The press rollers are timed precisely: one roller stamps ink onto the paper on the falling stroke (the <em>launch edge</em>) and a camera photographs the impression on the rising stroke (the <em>sample edge</em>). The ink pattern is your serialised MOSI data; the photograph is the captured MISO word. By the time the paper exits, the front page has been both printed and read in a single mechanical pass. The SPI datapath works exactly this way. In <code>spi_top_v1</code> you wire three subsystems together — the clock divider, the CPHA timing engine, and the shift registers — into one self-contained module that converts a 32-bit parallel word into a serial MOSI stream and reassembles the incoming MISO stream back into a parallel word. Every block you built in Phases 1 and 2 lives inside this one integration.</p>

<h3>Where spi_top_v1 sits in the full system</h3>
<pre class="code-block">
  APB bus ──► spi_reg_block ──► cfg signals
              spi_ctrl_path ──► enable, load
                                     │
         ┌───────────────────────────▼──────────────────────────────┐
         │  ★  spi_top_v1  (this lesson)                            │
         │                                                           │
         │  [1] Clock divider                                        │
         │      cfg_div ──► div_cnt ──► toggle sck_int              │
         │      enable, cfg_cpol ──► sck_o                          │──► SCK
         │      sck_int → sck_prev → rising_edge_p, falling_edge_p  │
         │                                                           │
         │  [2] CPHA engine  {cfg_cpol, cfg_cpha} ─►                │
         │                   launch_pulse, sample_pulse              │
         │                                                           │
         │  [3] TX shift register                                    │
         │      tx_data + load ──► tx_shift ──► mosi_o             │──► MOSI
         │                                                           │
         │  [4] RX shift register                                    │
         │      miso_i + sample_pulse ──► rx_shift ──► rx_data      │◄── MISO
         │                                                           │
         │  [5] Bit counter  launch_pulse + load ──► word_done      │
         └───────────────────────────────────────────────────────────┘
</pre>

<h3>Internal signal chain</h3>
<table class="truth-table">
  <tr><th>Stage</th><th>Key Inputs</th><th>Outputs</th></tr>
  <tr><td>Clock divider</td><td>pclk, cfg_div, enable, cfg_cpol</td><td>sck_o, rising_edge_p, falling_edge_p</td></tr>
  <tr><td>CPHA engine</td><td>rising/falling_edge_p, cfg_cpol, cfg_cpha</td><td>launch_pulse, sample_pulse</td></tr>
  <tr><td>TX shift reg</td><td>tx_data, load, launch_pulse, cfg_lsb_first</td><td>mosi_o</td></tr>
  <tr><td>RX shift reg</td><td>miso_i, sample_pulse, cfg_lsb_first</td><td>rx_data[31:0]</td></tr>
  <tr><td>Bit counter</td><td>launch_pulse, load, cfg_word_len</td><td>word_done</td></tr>
</table>

<h3>CPHA edge assignment for all four modes</h3>
<table class="truth-table">
  <tr><th>CPOL</th><th>CPHA</th><th>Mode</th><th>launch_pulse</th><th>sample_pulse</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>falling_edge_p</td><td>rising_edge_p</td></tr>
  <tr><td>0</td><td>1</td><td>1</td><td>rising_edge_p</td><td>falling_edge_p</td></tr>
  <tr><td>1</td><td>0</td><td>2</td><td>rising_edge_p</td><td>falling_edge_p</td></tr>
  <tr><td>1</td><td>1</td><td>3</td><td>falling_edge_p</td><td>rising_edge_p</td></tr>
</table>
<p>Modes 0 and 3 share the same relative edge assignment (launch on the idle-going edge). Modes 1 and 2 share the opposite. The clock divider generates an identical toggle pattern for all modes — only the CPHA engine's mux changes which physical edge drives which function.</p>

<h3>Load and word_done handshake</h3>
<p>The control layer (built in L2) pulses <code>load</code> for exactly one pclk cycle. This resets <code>bit_cnt</code> to zero and latches <code>tx_data</code> into the TX shift register simultaneously. The datapath responds by pulsing <code>word_done</code> for one cycle when the bit counter reaches <code>cfg_word_len - 1</code> at the same time as a <code>launch_pulse</code>. This clean single-cycle handshake lets the control layer decide whether to load the next word or deassert CS without any timing coupling between the two layers.</p>
<pre class="code-block">// TX shift — MSB-first
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n)        tx_shift &lt;= '0;
  else if (load)     tx_shift &lt;= tx_data;               // latch word
  else if (launch_p) tx_shift &lt;= {tx_shift[30:0], 1'b0}; // shift left
end
assign mosi_o    = tx_shift[cfg_word_len - 1];  // MSB of active window
assign word_done = launch_pulse &amp;&amp; (bit_cnt == cfg_word_len - 1);</pre>

<p><strong>Ready?</strong> Switch to the Code tab and build <code>spi_top_v1</code>. This is the integration that makes every Phase 2 module useful as a complete system. Stuck? Tap 💡 Show Hint for the port list and internal block breakdown.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Declare module spi_top_v1 with inputs: pclk, rst_n, enable, load, cfg_cpol, cfg_cpha, cfg_lsb_first, cfg_word_len[4:0], cfg_div[15:0], tx_data[31:0], miso_i; outputs: sck_o, mosi_o, rx_data[31:0], word_done, rising_edge_p, falling_edge_p',
        'Step 2 — Clock divider: declare div_cnt[15:0] and sck_int; on terminal count (div_cnt==cfg_div) toggle sck_int and reset div_cnt, else increment div_cnt; assign sck_o = enable ? sck_int : cfg_cpol',
        'Step 3 — Edge detect: declare sck_prev; always_ff latches sck_int each pclk; assign rising_edge_p = sck_int & ~sck_prev; falling_edge_p = ~sck_int & sck_prev',
        'Step 4 — CPHA engine (always_comb): Mode 0 cpol=0,cpha=0: launch=falling,sample=rising; Mode 1: swap; Mode 2 cpol=1,cpha=0: same as Mode 1; Mode 3: same as Mode 0',
        'Step 5 — TX shift register: on load latch tx_data; on launch_pulse shift left (MSB-first) or right (LSB-first) per cfg_lsb_first; assign mosi_o = cfg_lsb_first ? tx_shift[0] : tx_shift[cfg_word_len-1]',
        'Step 6 — RX shift register: on sample_pulse MSB-first {rx_shift[30:0],miso_i}, LSB-first {miso_i,rx_shift[31:1]}; assign rx_data = rx_shift',
        'Step 7 — Bit counter: declare bit_cnt[4:0]; reset to 0 on load; increment on launch_pulse; assign word_done = launch_pulse && (bit_cnt == cfg_word_len - 1)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`DESIGN NOTES for spi_top_v1 — port contracts and block notes (no code)

  Ports:
    input  pclk, rst_n, enable, load
    input  cfg_cpol, cfg_cpha, cfg_lsb_first
    input  [4:0]  cfg_word_len   // value = number of bits, e.g. 8 for 8-bit
    input  [15:0] cfg_div        // SCK half-period in pclk cycles
    input  [31:0] tx_data
    input         miso_i
    output        sck_o, mosi_o
    output [31:0] rx_data
    output        word_done, rising_edge_p, falling_edge_p

  Internal state:
    div_cnt[15:0]  — clock divider counter 0..cfg_div
    sck_int        — raw SCK before enable gating
    sck_prev       — one-pclk delayed sck_int
    tx_shift[31:0] — TX shift register
    rx_shift[31:0] — RX shift register
    bit_cnt[4:0]   — launched-bit counter, resets on load

  Clock divider rules:
    terminal count = (div_cnt == cfg_div)
    on terminal: sck_int <= ~sck_int; div_cnt <= 0
    else:        div_cnt <= div_cnt + 1
    sck_o = enable ? sck_int : cfg_cpol

  CPHA edge-to-function mapping:
    Mode 0 (cpol=0,cpha=0): launch=falling_edge_p, sample=rising_edge_p
    Mode 1 (cpol=0,cpha=1): launch=rising_edge_p,  sample=falling_edge_p
    Mode 2 (cpol=1,cpha=0): launch=rising_edge_p,  sample=falling_edge_p
    Mode 3 (cpol=1,cpha=1): launch=falling_edge_p, sample=rising_edge_p

  word_done fires exactly on the last launch_pulse:
    word_done = launch_pulse && (bit_cnt == cfg_word_len - 1)
    bit_cnt resets to 0 on load, increments on every launch_pulse`,

      design:
`// Build the spi_top_v1 module here. See Theory for the full spec.
// This is the SPI datapath: clock divider + CPHA engine + TX/RX shift registers.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic rst_n, enable, load;
  logic cfg_cpol, cfg_cpha, cfg_lsb_first;
  logic [4:0]  cfg_word_len;
  logic [15:0] cfg_div;
  logic [31:0] tx_data;
  logic sck_o, mosi_o;
  logic [31:0] rx_data;
  logic word_done, rising_edge_p, falling_edge_p;
  int   sck_edges;

  spi_top_v1 dut (
    .pclk(pclk), .rst_n(rst_n), .enable(enable), .load(load),
    .cfg_cpol(cfg_cpol), .cfg_cpha(cfg_cpha),
    .cfg_lsb_first(cfg_lsb_first),
    .cfg_word_len(cfg_word_len), .cfg_div(cfg_div),
    .tx_data(tx_data), .miso_i(mosi_o),
    .sck_o(sck_o), .mosi_o(mosi_o),
    .rx_data(rx_data), .word_done(word_done),
    .rising_edge_p(rising_edge_p), .falling_edge_p(falling_edge_p)
  );

  always @(sck_o) sck_edges++;

  initial begin
    $display("=== spi_top_v1 Datapath Test ===");
    rst_n=0; enable=0; load=0; sck_edges=0;
    cfg_cpol=0; cfg_cpha=0; cfg_lsb_first=0;
    cfg_word_len=5'd8; cfg_div=16'd3;
    tx_data=32'h0;
    repeat(4) @(posedge pclk); #1;
    rst_n=1; @(posedge pclk); #1;

    // SCK idles at CPOL=0 when disabled
    repeat(20) @(posedge pclk); #1;
    if (sck_o === 1'b0)
      $display("PASS SCK idle=0 when disabled (CPOL=0)");
    else
      $display("FAIL SCK not idle: sck_o=%0b expected 0", sck_o);

    // Mode 0, 8-bit transfer, loopback 0xA5
    sck_edges = 0;
    tx_data = 32'h0000_00A5;
    enable=1; load=1; @(posedge pclk); #1; load=0;

    fork
      begin repeat(500) @(posedge pclk);
            $display("FAIL timeout mode0"); $finish; end
      begin @(posedge word_done); end
    join_any
    disable fork;
    @(posedge pclk); #1;

    if (rx_data[7:0] === 8'hA5)
      $display("PASS rx_data=0xa5 Mode 0 loopback");
    else
      $display("FAIL rx_data=%0h (expected 0xa5)", rx_data[7:0]);

    if (sck_edges >= 16)
      $display("PASS SCK generated %0d edges for 8-bit transfer", sck_edges);
    else
      $display("FAIL only %0d SCK edges (expected>=16)", sck_edges);

    // Mode 3 (CPOL=1, CPHA=1), data 0x5A
    enable=0; cfg_cpol=1; cfg_cpha=1;
    @(posedge pclk); #1;
    if (sck_o === 1'b1)
      $display("PASS SCK idle=1 when CPOL=1");
    else
      $display("FAIL SCK idle mismatch CPOL=1: sck_o=%0b", sck_o);

    tx_data = 32'h0000_005A;
    enable=1; load=1; @(posedge pclk); #1; load=0;

    fork
      begin repeat(500) @(posedge pclk);
            $display("FAIL timeout mode3"); $finish; end
      begin @(posedge word_done); end
    join_any
    disable fork;
    @(posedge pclk); #1;

    if (rx_data[7:0] === 8'h5A)
      $display("PASS rx_data=0x5a Mode 3 loopback");
    else
      $display("FAIL Mode 3 rx=%0h (expected 0x5a)", rx_data[7:0]);

    $display("Datapath assembly works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS SCK idle=0 when disabled (CPOL=0)',
        'PASS rx_data=0xa5 Mode 0 loopback',
        'PASS SCK generated',
        'PASS rx_data=0x5a Mode 3 loopback',
        'Datapath assembly works!'
      ]
    },

    // ── L2 ──────────────────────────────────────────────────────────────────
    {
      id: 'spi_long12l2',
      title: 'L2 — Control Path: FSM and CS Controller',
      theory:
`<h2>Giving the Datapath a Brain</h2>
<p>The datapath from L1 is a passive engine — it shifts bits faithfully but has no idea when to start, which CS line to assert, or when to stop. Without a control layer, the clock runs forever, MOSI streams random bits, and no peripheral ever knows a frame has begun. The control path adds intelligence: an FSM that sequences the datapath through well-defined states, a CS controller that asserts the correct chip-select line with the correct polarity and the correct timing margins, and an error watchdog that detects protocol violations before they corrupt a transfer. In <code>spi_top_v2</code> you combine the L1 datapath with this control logic into one self-contained module driven by direct control signals. The APB register interface arrives in L3 — here the focus is the state machine itself.</p>

<h3>The six-state master FSM</h3>
<table class="truth-table">
  <tr><th>State</th><th>Entry Condition</th><th>Exit Condition</th><th>Key Actions</th></tr>
  <tr><td>IDLE</td><td>reset or DEASSERT_CS done</td><td>start pulse</td><td>busy=0, SCK gated off</td></tr>
  <tr><td>LOAD</td><td>start pulse seen</td><td>always one cycle</td><td>capture shadow config; check tx_empty → set tx_underrun if empty</td></tr>
  <tr><td>ASSERT_CS</td><td>LOAD done</td><td>pre_delay counter expires</td><td>assert CSN; count cfg_cs_pre cycles; SCK still gated off</td></tr>
  <tr><td>SHIFT</td><td>pre_delay done</td><td>word_done from datapath</td><td>enable=1 (SCK running); datapath shifts bits</td></tr>
  <tr><td>COMPLETE</td><td>word_done</td><td>always one cycle</td><td>SCK gated off; check rx_full → set rx_overrun if full</td></tr>
  <tr><td>DEASSERT_CS</td><td>COMPLETE done</td><td>post_delay counter expires</td><td>deassert CSN; count cfg_cs_post cycles; then IDLE</td></tr>
</table>

<h3>Shadow register capture</h3>
<p>Configuration fields (CPOL, CPHA, WORD_LEN, CS_SEL) must not change mid-transfer. The FSM captures them into <em>shadow registers</em> in the LOAD state — one clock after start is seen. All subsequent states use the shadow values, not the live inputs. This means the CPU can write a new configuration while a transfer is running and it will only take effect on the next start.</p>
<pre class="code-block">// Shadow capture — fires once in LOAD
always_ff @(posedge pclk or negedge rst_n) begin
  if (state == LOAD) begin
    shd_cpol     &lt;= cfg_cpol;
    shd_cpha     &lt;= cfg_cpha;
    shd_word_len &lt;= cfg_word_len;
    shd_cs_sel   &lt;= cfg_cs_sel;
  end
end</pre>

<h3>CS controller</h3>
<p>The CS controller decodes <code>shd_cs_sel</code> into a one-hot raw CS vector, then inverts each bit individually against its polarity setting. Active-low is the default (polarity bit = 0 means CSN goes low when selected):</p>
<pre class="code-block">// One-hot decode: cs_raw[i] = 1 when i is the selected line
always_comb begin
  cs_raw = 4'h0;
  if (cs_active) cs_raw[shd_cs_sel] = 1'b1;
end
// Polarity inversion: csn_o[i] = cs_raw[i] ^ cfg_cs_pol[i]
assign csn_o = cs_raw ^ cfg_cs_pol;</pre>
<p><code>cs_active</code> is 1 from ASSERT_CS through COMPLETE — it goes low one cycle before DEASSERT_CS begins counting, giving the post-delay its full duration.</p>

<h3>busy signal</h3>
<p><code>busy</code> is high in every state except IDLE. It is the signal the CPU polls to know when a new transfer can be started. In L3, the APB STATUS register bit [31] mirrors this signal.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Start from your L1 module and add the FSM, shadow registers, and CS controller. This one takes a few passes to get right — the state machine timing and the CS controller are the parts that trip most designers the first time.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Declare module spi_top_v2. Copy all ports from spi_top_v1 and add: inputs start, cfg_cs_sel[1:0], cfg_cs_pol[3:0], cfg_cs_pre[7:0], cfg_cs_post[7:0]; outputs csn_o[3:0], busy, transfer_done, tx_underrun',
        'Step 2 — Copy all datapath logic from spi_top_v1 (clock divider, edge detect, CPHA engine, TX/RX shift registers, bit counter) — the FSM drives enable and load into this same logic',
        'Step 3 — Declare typedef enum logic [2:0] with states IDLE, LOAD, ASSERT_CS, SHIFT, COMPLETE, DEASSERT_CS; declare state register',
        'Step 4 — Write the FSM always_ff: IDLE→LOAD on start; LOAD→ASSERT_CS always; ASSERT_CS→SHIFT when pre_delay_done; SHIFT→COMPLETE on word_done; COMPLETE→DEASSERT_CS always; DEASSERT_CS→IDLE when post_delay_done',
        'Step 5 — Shadow register always_ff: capture cfg_cpol/cpha/word_len/cs_sel into shd_* registers in LOAD state',
        'Step 6 — CS controller: declare cs_raw[3:0]; always_comb sets cs_raw[shd_cs_sel]=1 when in ASSERT_CS/SHIFT/COMPLETE; assign csn_o = cs_raw ^ cfg_cs_pol',
        'Step 7 — Pre/post delay counters: declare pre_cnt[7:0] and post_cnt[7:0]; increment in ASSERT_CS/DEASSERT_CS states; pre_delay_done = (pre_cnt==cfg_cs_pre); post_delay_done = (post_cnt==cfg_cs_post)',
        'Step 8 — Assign: busy = (state != IDLE); transfer_done = (state==COMPLETE); enable driven high in SHIFT; load pulsed in LOAD',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`DESIGN NOTES for spi_top_v2 — state machine and CS controller (no code)

  Additional ports beyond spi_top_v1:
    input  start            // one-cycle pulse to begin a transfer
    input  [1:0]  cfg_cs_sel  // which CS line (0..3)
    input  [3:0]  cfg_cs_pol  // polarity per line (0=active-low)
    input  [7:0]  cfg_cs_pre  // pre-CS delay in pclk cycles
    input  [7:0]  cfg_cs_post // post-CS delay in pclk cycles
    output [3:0]  csn_o       // chip-select outputs
    output        busy         // high in any non-IDLE state
    output        transfer_done // one-cycle pulse in COMPLETE
    output        tx_underrun  // set in LOAD if tx_data is not available

  FSM state transitions:
    IDLE        ──start──►  LOAD
    LOAD        ──always──► ASSERT_CS   (one-cycle state; capture shadow regs here)
    ASSERT_CS   ──pre_done──► SHIFT     (count cfg_cs_pre cycles first)
    SHIFT       ──word_done──► COMPLETE  (enable=1 here; datapath shifts)
    COMPLETE    ──always──► DEASSERT_CS (one-cycle; check rx_full here)
    DEASSERT_CS ──post_done──► IDLE     (count cfg_cs_post cycles first)

  CS logic:
    cs_active = (state == ASSERT_CS) | (state == SHIFT) | (state == COMPLETE)
    cs_raw[shd_cs_sel] = cs_active  (only one bit set)
    csn_o = cs_raw ^ cfg_cs_pol     (XOR with polarity)

  Shadow registers (captured in LOAD):
    shd_cpol, shd_cpha, shd_word_len, shd_cs_sel
    Use shd_* instead of cfg_* for all datapath and CS logic

  enable and load feeds into the L1 datapath logic:
    enable = (state == SHIFT)
    load   = (state == LOAD)    [drives the shift register load AND bit_cnt reset]`,

      design:
`// Build the spi_top_v2 module here.
// Extend spi_top_v1 with an FSM, shadow registers, and CS controller.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic rst_n, start;
  logic cfg_cpol, cfg_cpha, cfg_lsb_first;
  logic [4:0]  cfg_word_len;
  logic [15:0] cfg_div;
  logic [1:0]  cfg_cs_sel;
  logic [3:0]  cfg_cs_pol;
  logic [7:0]  cfg_cs_pre, cfg_cs_post;
  logic [31:0] tx_data;
  logic sck_o, mosi_o;
  logic [3:0]  csn_o;
  logic [31:0] rx_data;
  logic busy, transfer_done, tx_underrun;

  spi_top_v2 dut (
    .pclk(pclk), .rst_n(rst_n), .start(start),
    .cfg_cpol(cfg_cpol), .cfg_cpha(cfg_cpha), .cfg_lsb_first(cfg_lsb_first),
    .cfg_word_len(cfg_word_len), .cfg_div(cfg_div),
    .cfg_cs_sel(cfg_cs_sel), .cfg_cs_pol(cfg_cs_pol),
    .cfg_cs_pre(cfg_cs_pre), .cfg_cs_post(cfg_cs_post),
    .tx_data(tx_data), .miso_i(mosi_o),
    .sck_o(sck_o), .mosi_o(mosi_o), .csn_o(csn_o),
    .rx_data(rx_data), .busy(busy),
    .transfer_done(transfer_done), .tx_underrun(tx_underrun)
  );

  initial begin
    $display("=== spi_top_v2 Control Path Test ===");
    rst_n=0; start=0;
    cfg_cpol=0; cfg_cpha=0; cfg_lsb_first=0;
    cfg_word_len=5'd8; cfg_div=16'd3;
    cfg_cs_sel=2'd0; cfg_cs_pol=4'h0;
    cfg_cs_pre=8'h0; cfg_cs_post=8'h0;
    tx_data=32'h0000_00C3;
    repeat(4) @(posedge pclk); #1;
    rst_n=1; @(posedge pclk); #1;

    // Verify idle
    if (!busy && csn_o === 4'hF)
      $display("PASS idle: busy=0 csn_o=0xf (all deasserted)");
    else
      $display("FAIL idle: busy=%0b csn_o=%0h", busy, csn_o);

    // Start a transfer
    start=1; @(posedge pclk); #1; start=0;

    // Wait for CS to assert (csn_o[0] should go low)
    fork
      begin repeat(20) @(posedge pclk); end
      begin @(negedge csn_o[0]); end
    join_any
    disable fork;
    @(posedge pclk); #1;

    if (csn_o[0] === 1'b0 && busy === 1'b1)
      $display("PASS CS asserted: csn_o[0]=0 busy=1");
    else
      $display("FAIL CS assertion: csn_o=%0h busy=%0b", csn_o, busy);

    // Wait for transfer to complete
    fork
      begin repeat(400) @(posedge pclk);
            $display("FAIL timeout waiting for complete"); $finish; end
      begin @(negedge busy); end
    join_any
    disable fork;
    @(posedge pclk); #1;

    if (!busy && csn_o === 4'hF)
      $display("PASS transfer complete: busy=0 csn_o=0xf");
    else
      $display("FAIL post-transfer: busy=%0b csn_o=%0h", busy, csn_o);

    if (rx_data[7:0] === 8'hC3)
      $display("PASS rx_data=0xc3 (loopback correct)");
    else
      $display("FAIL rx_data=%0h (expected 0xc3)", rx_data[7:0]);

    $display("Control path works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS idle: busy=0 csn_o=0xf',
        'PASS CS asserted: csn_o[0]=0 busy=1',
        'PASS transfer complete: busy=0 csn_o=0xf',
        'PASS rx_data=0xc3 (loopback correct)',
        'Control path works!'
      ]
    },

    // ── L3 ──────────────────────────────────────────────────────────────────
    {
      id: 'spi_long12l3',
      title: 'L3 — APB Register Wiring: Connecting the CPU to the Engine',
      theory:
`<h2>Bridging the CPU to the Hardware</h2>
<p>After L1 and L2 you have a complete SPI engine that works beautifully when driven by direct port signals. The problem is that no CPU talks to hardware through direct port signals — it uses a bus. The APB register interface is that bus adapter. Every configuration choice (CPOL, CPHA, WORD_LEN, CLKDIV, CS_SEL) lives in a register that the CPU writes through the APB bus. Every status signal (BUSY, TX_EMPTY, RX_EMPTY) lives in a register that the CPU reads. The APB interface you built in spi_long11 now gets wired to the engine you built in L1–L2. In <code>spi_top_v3</code> you connect these two worlds: APB writes flow downstream to configuration ports; hardware outputs flow upstream to the STATUS read-mux.</p>

<h3>Register-to-port mapping</h3>
<table class="truth-table">
  <tr><th>Register</th><th>Offset</th><th>Direction</th><th>Connects to</th></tr>
  <tr><td>CTRL.SPI_EN</td><td>0x000 [28]</td><td>CPU → HW</td><td>spi_en_reg (gates START acceptance)</td></tr>
  <tr><td>CTRL.CPOL</td><td>0x000 [22]</td><td>CPU → HW</td><td>cfg_cpol shadow input</td></tr>
  <tr><td>CTRL.CPHA</td><td>0x000 [21]</td><td>CPU → HW</td><td>cfg_cpha shadow input</td></tr>
  <tr><td>CTRL.WORD_LEN</td><td>0x000 [19:15]</td><td>CPU → HW</td><td>cfg_word_len shadow input (reset=8)</td></tr>
  <tr><td>CTRL.START</td><td>0x000 [29]</td><td>W1P pulse</td><td>start input of FSM</td></tr>
  <tr><td>CLKDIV.DIV</td><td>0x008 [15:0]</td><td>CPU → HW</td><td>cfg_div (SCK half-period - 1)</td></tr>
  <tr><td>STATUS.BUSY</td><td>0x004 [31]</td><td>HW → CPU</td><td>busy output of FSM</td></tr>
  <tr><td>STATUS.TX_EMPTY</td><td>0x004 [28]</td><td>HW → CPU</td><td>tx_data_valid (inverted)</td></tr>
  <tr><td>STATUS.RX_EMPTY</td><td>0x004 [26]</td><td>HW → CPU</td><td>rx_data_ready (inverted)</td></tr>
  <tr><td>TXDATA</td><td>0x020</td><td>WO write</td><td>tx_data_reg; sets tx_data_valid</td></tr>
  <tr><td>RXDATA</td><td>0x024</td><td>RO read</td><td>rx_data_reg; clears rx_data_ready on read</td></tr>
</table>

<h3>TX and RX data registers</h3>
<p>In a full implementation TX and RX FIFOs sit between the APB bus and the shift register. In <code>spi_top_v3</code> we use a single-entry register model — exactly one word can be queued at a time — which is sufficient to verify the complete APB transaction sequence:</p>
<pre class="code-block">// TXDATA write [0x020] — store and mark valid
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn)              tx_data_valid &lt;= 1'b0;
  else if (wr_en &amp;&amp; paddr==12'h020) begin
    tx_data_reg   &lt;= pwdata;
    tx_data_valid &lt;= 1'b1;
  end
  else if (state == LOAD)    tx_data_valid &lt;= 1'b0;  // consumed by FSM
end

// After transfer: store received word
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn)          rx_data_ready &lt;= 1'b0;
  else if (transfer_done) begin
    rx_data_reg   &lt;= rx_data_from_shift;
    rx_data_ready &lt;= 1'b1;
  end
  else if (wr_en &amp;&amp; paddr==12'h024) rx_data_ready &lt;= 1'b0; // consumed by CPU read
end</pre>

<h3>STATUS register — live RO view</h3>
<p>STATUS (0x004) is never written by the CPU. It mirrors live hardware outputs combinationally in the APB read mux. There is no flip-flop storing STATUS — the register contents change every cycle as hardware state changes:</p>
<pre class="code-block">// In the SETUP-phase read mux:
12'h004: prdata &lt;= {busy, 2'b0, ~tx_data_valid, 1'b0, ~rx_data_ready,
                     26'h0};</pre>

<p><strong>Ready?</strong> Switch to the Code tab. Start from your L2 module and add the APB slave FSM plus the register bank. The APB FSM is the same three-state machine from spi_long11 — you can copy that pattern here. Stuck? Tap 💡 Show Hint for the register wiring table and connection notes.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Declare module spi_top_v3 with APB ports (pclk, presetn, psel, penable, pwrite, paddr[11:0], pwdata[31:0], prdata[31:0], pready, pslverr) and SPI ports (sck_o, mosi_o, miso_i, csn_o[3:0])',
        'Step 2 — Include the APB 3-state FSM (IDLE→SETUP→ACCESS) from spi_long11; assign pready=(state==ACCESS); assign pslverr=1b0; assign wr_en=pready&&pwrite',
        'Step 3 — CTRL register [0x000]: always_ff with CTRL_RW_MASK=32h1FFF_FF00; reset=32h0004_0000; W1P assigns: start=wr_en&&paddr==0&&pwdata[29]; extract cpol=ctrl_rw[22], cpha=ctrl_rw[21], word_len=ctrl_rw[19:15]',
        'Step 4 — CLKDIV register [0x008]: simple RW always_ff; extract cfg_div=clkdiv_reg[15:0]',
        'Step 5 — TXDATA [0x020] write: always_ff stores pwdata into tx_data_reg and sets tx_data_valid; tx_data_valid clears when FSM enters LOAD (state==LOAD)',
        'Step 6 — Copy all L2 datapath and FSM logic; wire tx_data_reg as the tx_data input; wire tx_data_valid as the tx_empty inverse',
        'Step 7 — RXDATA [0x024] read: on transfer_done, store shift-register rx_data into rx_data_reg and set rx_data_ready; APB read of 0x024 returns rx_data_reg',
        'Step 8 — Read mux always_ff (SETUP phase): case(paddr): 0x000=ctrl_rw, 0x004={busy,2b0,~tx_data_valid,1b0,~rx_data_ready,26b0}, 0x008=clkdiv_reg, 0x024=rx_data_reg',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`DESIGN NOTES for spi_top_v3 — APB wiring notes (no code)

  Replaces direct port config with an APB register bank:

  Register bank (inline — not a separate module):
    CTRL [0x000]  RW+W1P: cpol[22], cpha[21], word_len[19:15], spi_en[28]
                  W1P: start[29], abort[30], soft_rst[31]
                  CTRL_RW_MASK = 32h1FFF_FF00
                  reset value  = 32h0004_0000  (WORD_LEN=8)

    STATUS [0x004] RO live view:
                  [31]=busy, [28]=~tx_data_valid, [26]=~rx_data_ready

    CLKDIV [0x008] RW: cfg_div = clkdiv_reg[15:0]

    TXDATA [0x020] WO: write stores pwdata in tx_data_reg, sets tx_data_valid
                       FSM in LOAD uses tx_data_reg and clears tx_data_valid

    RXDATA [0x024] RO: transfer_done stores shift rx_data in rx_data_reg
                       APB read returns rx_data_reg

  Wiring from APB registers to L2 logic:
    cfg_cpol    ← ctrl_rw[22]
    cfg_cpha    ← ctrl_rw[21]
    cfg_word_len← ctrl_rw[19:15]
    cfg_div     ← clkdiv_reg[15:0]
    start pulse ← wr_en && paddr==12h000 && pwdata[29]
    tx_data     ← tx_data_reg  (was a port in L2, now internal)
    tx_empty    ← ~tx_data_valid

  Default config: cfg_cs_sel=0, cfg_cs_pol=4h0, cfg_cs_pre=0, cfg_cs_post=0`,

      design:
`// Build the spi_top_v3 module here.
// Extend spi_top_v2 with an APB register interface.
// The APB bus replaces the direct cfg_* input ports.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        presetn;
  logic        psel, penable, pwrite;
  logic [11:0] paddr;
  logic [31:0] pwdata, prdata;
  logic        pready, pslverr;
  logic        sck_o, mosi_o;
  logic [3:0]  csn_o;

  spi_top_v3 dut (
    .pclk(pclk), .presetn(presetn),
    .psel(psel), .penable(penable), .pwrite(pwrite),
    .paddr(paddr), .pwdata(pwdata), .prdata(prdata),
    .pready(pready), .pslverr(pslverr),
    .sck_o(sck_o), .mosi_o(mosi_o), .miso_i(mosi_o),
    .csn_o(csn_o)
  );

  task automatic apb_write(input logic [11:0] addr, input logic [31:0] data);
    paddr=addr; pwdata=data; pwrite=1; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0; pwrite=0;
    @(posedge pclk); #1;
  endtask

  task automatic apb_read(input logic [11:0] addr);
    paddr=addr; pwrite=0; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0;
    @(posedge pclk); #1;
  endtask

  initial begin
    $display("=== spi_top_v3 APB Integration Test ===");
    presetn=0; psel=0; penable=0; pwrite=0; paddr=0; pwdata=0;
    repeat(4) @(posedge pclk); #1;
    presetn=1; @(posedge pclk); #1;

    // 1. Configure: SPI_EN=1, CPOL=0, CPHA=0, WL=8
    //    CTRL = SPI_EN[28]=1 | WL=8[19:15]=8<<15=0x0004_0000
    //    = 0x1004_0000
    apb_write(12'h000, 32'h1004_0000);
    apb_read(12'h000);
    if (prdata[28] === 1 && prdata[19:15] === 5'd8)
      $display("PASS CTRL configured: spi_en=1 word_len=8");
    else
      $display("FAIL CTRL: prdata=%0h", prdata);

    // 2. Set CLKDIV=3 (SCK half-period = 4 pclk)
    apb_write(12'h008, 32'h0000_0003);

    // 3. Write TXDATA = 0xAB
    apb_write(12'h020, 32'h0000_00AB);
    apb_read(12'h004);
    if (prdata[28] === 0)  // STATUS.TX_EMPTY should be 0 (data waiting)
      $display("PASS TXDATA loaded: TX_EMPTY=0");
    else
      $display("FAIL TXDATA not loaded: STATUS=%0h", prdata);

    // 4. Start transfer (write CTRL with START[29]=1)
    apb_write(12'h000, 32'h3004_0000);

    // 5. Poll STATUS.BUSY until clear (timeout 500 polls)
    begin : poll
      for (int j = 0; j < 500; j++) begin
        apb_read(12'h004);
        if (prdata[31] === 0) disable poll;
        @(posedge pclk); #1;
      end
    end

    if (prdata[31] === 0)
      $display("PASS transfer complete: busy=0");
    else
      $display("FAIL still busy after timeout");

    // 6. Read RXDATA and verify
    apb_read(12'h024);
    if (prdata[7:0] === 8'hAB)
      $display("PASS RXDATA=0xab (loopback correct)");
    else
      $display("FAIL RXDATA=%0h (expected 0xab)", prdata[7:0]);

    $display("APB wiring works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS CTRL configured: spi_en=1 word_len=8',
        'PASS TXDATA loaded: TX_EMPTY=0',
        'PASS transfer complete: busy=0',
        'PASS RXDATA=0xab (loopback correct)',
        'APB wiring works!'
      ]
    },

    // ── L4 ──────────────────────────────────────────────────────────────────
    {
      id: 'spi_long12l4',
      title: 'L4 — Complete spi_top and Checkpoint C',
      theory:
`<h2>The Portfolio Module: spi_top</h2>
<p>Every module built across 11 chapters converges here. <code>spi_top</code> is the complete, register-programmable SPI master: the APB register bank from spi_long11 drives configuration into the control path from L2, which sequences the datapath from L1. CS timing, interrupts, and multi-slave selection are all governed by registers the CPU writes. A single APB write to <code>CTRL.START</code> causes a chain reaction that ends with a complete SPI frame on the wires, received data in the RX register, and an interrupt to the CPU. This is the kind of module that appears in silicon IP catalogues — it synthesises, it verifies, and it can be dropped into any SoC with an APB bus. Checkpoint C verifies it works correctly in all four SPI modes with two different word lengths.</p>

<h3>Additional registers beyond L3</h3>
<table class="truth-table">
  <tr><th>Register</th><th>Offset</th><th>Key Fields</th><th>Connects to</th></tr>
  <tr><td>CS_CTRL</td><td>0x00C</td><td>CS_SEL[3:0], CS_POL[15:12], CS_PRE[23:20], CS_POST[27:24]</td><td>FSM CS controller</td></tr>
  <tr><td>INT_EN</td><td>0x010</td><td>GLOBAL_EN[31], DONE[4]</td><td>IRQ logic</td></tr>
  <tr><td>INT_STATUS</td><td>0x014</td><td>DONE[4] W1C</td><td>fires on transfer_done</td></tr>
</table>

<h3>Multi-slave support</h3>
<p>CS_CTRL.CS_SEL (bits [3:0]) selects which of the four <code>csn_o</code> lines asserts during a transfer. The shadow register capture at LOAD freezes CS_SEL for the duration of the transfer, so the CPU can queue the next CS selection while a transfer runs. CS_CTRL.CS_POL (bits [15:12]) applies per-line polarity inversion — set a bit to make that CS line active-high instead of active-low.</p>
<pre class="code-block">// CS_CTRL [0x00C] decode
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) cs_ctrl_reg &lt;= '0;
  else if (wr_en &amp;&amp; paddr == 12'h00C) cs_ctrl_reg &lt;= pwdata;
end
assign cfg_cs_sel  = cs_ctrl_reg[3:0];
assign cfg_cs_pol  = cs_ctrl_reg[15:12];
assign cfg_cs_pre  = cs_ctrl_reg[23:20];
assign cfg_cs_post = cs_ctrl_reg[27:24];</pre>

<h3>Interrupt controller wiring</h3>
<p>The IRQ output is a level signal. It goes high when any enabled event is pending and stays high until the CPU clears the INT_STATUS bit via W1C write. A single transfer produces exactly one DONE event, so if INT_EN.DONE=1 and INT_EN.GLOBAL_EN=1, the IRQ fires once and holds until cleared:</p>
<pre class="code-block">// INT_STATUS.DONE [bit 4] — W1C, fires on transfer_done
logic [7:0] int_status_reg;
logic [7:0] int_clr;
assign int_clr = (wr_en &amp;&amp; paddr==12'h014) ? pwdata[7:0] : 8'h00;
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) int_status_reg &lt;= 8'h00;
  else int_status_reg &lt;= (int_status_reg | {3'b0, transfer_done, 4'b0}) &amp; ~int_clr;
end
assign spi_irq_o = global_en &amp;&amp; |(int_status_reg &amp; int_en_reg[7:0]);</pre>

<h3>Checkpoint C APB transaction sequence</h3>
<p>The CPU follows this sequence for every transfer. This is the canonical APB-to-SPI flow that Checkpoint C verifies in all four modes:</p>
<pre class="code-block">1. Write CLKDIV  (0x008): set SCK frequency
2. Write CS_CTRL (0x00C): set CS line, polarity, timing
3. Write INT_EN  (0x010): enable DONE interrupt if using IRQ
4. Write CTRL    (0x000): configure CPOL, CPHA, WORD_LEN, SPI_EN
5. Write TXDATA  (0x020): queue the transmit word
6. Write CTRL    (0x000): same config + START[29]=1 (W1P)
7. Poll STATUS   (0x004) until BUSY[31]=0
8. Read  RXDATA  (0x024): retrieve received word
9. Write INT_STATUS (0x014): clear DONE if using IRQ</pre>

<p>In the next course — Phase 5 verification — you will write directed testbenches, SVA assertions, and a full DV checklist against this module. For now, Checkpoint C exercises the golden path across modes and word lengths.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build the complete <code>spi_top</code>. Start from spi_top_v3 and add CS_CTRL, INT_EN, INT_STATUS, and spi_irq_o. Stuck? Tap 💡 Show Hint for the additional register wiring notes.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — Declare module spi_top with APB ports, SPI pins (sck_o, mosi_o, miso_i, csn_o[3:0]), and output spi_irq_o',
        'Step 2 — Include all L3 logic (APB FSM, CTRL, CLKDIV, STATUS, TXDATA, RXDATA, full datapath, FSM, CS controller)',
        'Step 3 — Add CS_CTRL register [0x00C]: RW always_ff; extract cfg_cs_sel=cs_ctrl_reg[3:0], cfg_cs_pol=cs_ctrl_reg[15:12], cfg_cs_pre=cs_ctrl_reg[23:20], cfg_cs_post=cs_ctrl_reg[27:24]',
        'Step 4 — Add INT_EN register [0x010]: RW always_ff; extract global_en=int_en_reg[31], done_en=int_en_reg[4]',
        'Step 5 — Add INT_STATUS register [0x014]: W1C pattern — (int_status_reg | {3b0,transfer_done,4b0}) & ~int_clr where int_clr = wr_en&&paddr==14&&pwdata[7:0]',
        'Step 6 — Assign spi_irq_o = global_en && |(int_status_reg & int_en_reg[7:0])',
        'Step 7 — Add CS_CTRL and INT registers to the APB read mux (SETUP phase)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — Checkpoint C: PASS should appear in the Output tab',
        '🎓 SPI Silicon Designer certificate unlocked — you built a register-programmable, APB-connected SPI master from scratch',
      ],

      hint:
`DESIGN NOTES for spi_top — final integration (no code)

  Additional registers beyond spi_top_v3:

  CS_CTRL [0x00C]  RW:
    bits [3:0]   = CS_SEL   → cfg_cs_sel  (which line asserts)
    bits [15:12] = CS_POL   → cfg_cs_pol  (polarity per line)
    bits [23:20] = CS_PRE   → cfg_cs_pre  (pre-CS delay, pclk cycles)
    bits [27:24] = CS_POST  → cfg_cs_post (post-CS delay, pclk cycles)

  INT_EN [0x010]  RW:
    bit [31] = GLOBAL_EN → global_en
    bit [4]  = DONE_EN   → enables transfer-complete interrupt

  INT_STATUS [0x014]  W1C:
    bit [4] = DONE_STICKY — set by transfer_done pulse, cleared by W1C
    W1C clear mask: int_clr = (wr_en && paddr==12h014) ? pwdata[7:0] : 8h0
    update:         int_status_reg <= (int_status_reg | event) & ~int_clr
    DONE event:     {3b0, transfer_done, 4b0}  (bit 4)

  IRQ:
    spi_irq_o = global_en && |(int_status_reg & int_en_reg[7:0])

  CS_CTRL and INT registers must be added to the SETUP-phase read mux.

  APB Checkpoint C transaction order:
    CLKDIV=3 → CS_CTRL=0 → INT_EN if needed → CTRL(mode,WL) → TXDATA → CTRL+START → poll → RXDATA`,

      design:
`// Build the complete spi_top module here.
// Extend spi_top_v3 with CS_CTRL, INT_EN, INT_STATUS, and spi_irq_o.
// This is the portfolio piece: a complete APB-connected SPI master.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        presetn;
  logic        psel, penable, pwrite;
  logic [11:0] paddr;
  logic [31:0] pwdata, prdata;
  logic        pready, pslverr;
  logic        sck_o, mosi_o;
  logic [3:0]  csn_o;
  logic        spi_irq_o;
  int          pass_count;

  spi_top dut (
    .pclk(pclk), .presetn(presetn),
    .psel(psel), .penable(penable), .pwrite(pwrite),
    .paddr(paddr), .pwdata(pwdata), .prdata(prdata),
    .pready(pready), .pslverr(pslverr),
    .sck_o(sck_o), .mosi_o(mosi_o), .miso_i(mosi_o),
    .csn_o(csn_o), .spi_irq_o(spi_irq_o)
  );

  task automatic apb_write(input logic [11:0] addr, input logic [31:0] data);
    paddr=addr; pwdata=data; pwrite=1; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0; pwrite=0;
    @(posedge pclk); #1;
  endtask

  task automatic apb_read(input logic [11:0] addr);
    paddr=addr; pwrite=0; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0;
    @(posedge pclk); #1;
  endtask

  task automatic wait_not_busy;
    for (int j = 0; j < 600; j++) begin
      apb_read(12'h004);
      if (prdata[31] === 0) return;
      @(posedge pclk); #1;
    end
    $display("FAIL timeout waiting for busy=0");
    $finish;
  endtask

  // Run one transfer and return RXDATA[7:0]
  task automatic run_transfer(
    input logic [31:0] ctrl_val,  // CTRL config (no START bit)
    input logic [7:0]  txbyte,
    output logic [7:0] rxbyte
  );
    apb_write(12'h000, ctrl_val);
    apb_write(12'h020, {24'h0, txbyte});
    apb_write(12'h000, ctrl_val | 32'h2000_0000);  // +START[29]
    wait_not_busy;
    apb_read(12'h024);
    rxbyte = prdata[7:0];
  endtask

  logic [7:0] rx;

  initial begin
    $display("=== spi_top Checkpoint C ===");
    presetn=0; psel=0; penable=0; pwrite=0; paddr=0; pwdata=0;
    pass_count=0;
    repeat(4) @(posedge pclk); #1;
    presetn=1; @(posedge pclk); #1;

    // Common setup
    apb_write(12'h008, 32'h0000_0003); // CLKDIV=3
    apb_write(12'h00C, 32'h0000_0000); // CS_CTRL: sel=0, pol=active-low, pre=0, post=0

    // Mode 0 (CPOL=0, CPHA=0): CTRL = SPI_EN[28] | WL=8[bit18]
    run_transfer(32'h1004_0000, 8'hAB, rx);
    if (rx === 8'hAB) begin
      $display("PASS Mode 0 WL=8 rx=0xab");
      pass_count++;
    end else
      $display("FAIL Mode 0 WL=8 rx=%0h (expected 0xab)", rx);

    // Mode 1 (CPOL=0, CPHA=1): add CPHA[21]
    run_transfer(32'h1024_0000, 8'hAB, rx);
    if (rx === 8'hAB) begin
      $display("PASS Mode 1 WL=8 rx=0xab");
      pass_count++;
    end else
      $display("FAIL Mode 1 WL=8 rx=%0h", rx);

    // Mode 2 (CPOL=1, CPHA=0): add CPOL[22]
    run_transfer(32'h1044_0000, 8'hAB, rx);
    if (rx === 8'hAB) begin
      $display("PASS Mode 2 WL=8 rx=0xab");
      pass_count++;
    end else
      $display("FAIL Mode 2 WL=8 rx=%0h", rx);

    // Mode 3 (CPOL=1, CPHA=1): add both
    run_transfer(32'h1064_0000, 8'hAB, rx);
    if (rx === 8'hAB) begin
      $display("PASS Mode 3 WL=8 rx=0xab");
      pass_count++;
    end else
      $display("FAIL Mode 3 WL=8 rx=%0h", rx);

    // Mode 0, WL=16: WL=16 in bits[19:15] = 16<<15 = bit19 = 0x0008_0000
    apb_write(12'h000, 32'h1008_0000);           // configure WL=16
    apb_write(12'h020, 32'h0000_DEAD);           // TXDATA = 0xDEAD
    apb_write(12'h000, 32'h3008_0000);           // START
    wait_not_busy;
    apb_read(12'h024);
    if (prdata[15:0] === 16'hDEAD) begin
      $display("PASS Mode 0 WL=16 rx=0xdead");
      pass_count++;
    end else
      $display("FAIL Mode 0 WL=16 rx=%0h", prdata[15:0]);

    // IRQ test: enable DONE interrupt and verify IRQ fires
    apb_write(12'h010, 32'h8000_0010); // GLOBAL_EN[31]=1, DONE_EN[4]=1
    apb_write(12'h014, 32'h0000_00FF); // clear any pending INT_STATUS
    apb_write(12'h000, 32'h1004_0000); // back to WL=8 Mode 0
    apb_write(12'h020, 32'h0000_0055); // TXDATA
    apb_write(12'h000, 32'h3004_0000); // START
    wait_not_busy;
    if (spi_irq_o === 1'b1)
      $display("PASS IRQ asserted after transfer");
    else
      $display("FAIL IRQ not asserted");
    apb_write(12'h014, 32'h0000_0010); // W1C clear DONE
    @(posedge pclk); #1;
    if (spi_irq_o === 1'b0)
      $display("PASS IRQ cleared after W1C");
    else
      $display("FAIL IRQ still asserted after clear");

    if (pass_count === 5)
      $display("Checkpoint C: PASS");
    else
      $display("Checkpoint C: FAIL (%0d/5 mode tests passed)", pass_count);

    $finish;
  end
endmodule`,

      expected: [
        'PASS Mode 0 WL=8 rx=0xab',
        'PASS Mode 3 WL=8 rx=0xab',
        'PASS Mode 0 WL=16 rx=0xdead',
        'PASS IRQ asserted after transfer',
        'Checkpoint C: PASS'
      ]
    }

  ]
});
