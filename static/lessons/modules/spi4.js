(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi4',
  title: 'SPI Applications',
  icon: '🔬',
  level: 'advanced',
  lessons: [

    // ─── L1: SPI Register File Interface (Tier 4 — behaviour spec) ──────────
    {
      id: 'spi4l1',
      title: 'L1 — SPI Register File Interface',
      theory: `
<h2>How Real Chips Use SPI — The Register Protocol</h2>
<p>Walk up to any datasheet for a sensor, motor driver, or RF module and you will see
the same pattern: "Write 0x03 followed by 0x42 over SPI to configure register 3."
This is the <strong>SPI register protocol</strong> — the universal language between
microcontrollers and peripheral chips.</p>

<p>The protocol is simple. Every transaction is exactly two bytes long, framed by CS_N:</p>
<ul>
  <li><strong>Byte 0 (command):</strong> bit 7 = R/W flag (1=read, 0=write), bits [4:0] = register address</li>
  <li><strong>Byte 1 (write):</strong> the data to store at that address</li>
  <li><strong>Byte 1 (read):</strong> the master sends don't-care bits, the slave drives MISO with the register value</li>
</ul>

<h3>Frame layout</h3>
<table class="truth-table">
<tr><th>Byte</th><th>Bit 7</th><th>Bits [6:5]</th><th>Bits [4:0]</th></tr>
<tr><td>Byte 0 (command)</td><td>rw — 1=read, 0=write</td><td>reserved (ignore)</td><td>register address [4:0]</td></tr>
<tr><td>Byte 1 (write)</td><td colspan="3">data[7:0] on MOSI — value to store</td></tr>
<tr><td>Byte 1 (read)</td><td colspan="3">register value on MISO — slave drives this</td></tr>
</table>

<h3>The two-state machine</h3>
<p>The slave has two phases within one CS_N frame, tracked by a single <code>state</code> bit:</p>
<ul>
  <li><strong>state 0 — ADDR:</strong> receive the first byte, decode R/W and address on the 8th edge</li>
  <li><strong>state 1 — DATA:</strong> receive or send the second byte</li>
</ul>

<pre class="code-block">// State transitions
if (cs_n_fall) begin state &lt;= 1'b0; bit_cnt &lt;= 3'd0; end   // reset on each frame

// On 8th SCLK edge of ADDR byte
if (state == 1'b0 &amp;&amp; bit_cnt == 3'd7) begin
  rw   &lt;= shift_reg[6];     // bit 7 of received byte (shift_reg holds bits 7:1 so far)
  addr &lt;= shift_reg[2:0];   // bottom 3 bits = register address (we support 8 regs)
  state &lt;= 1'b1;
  // pre-load MISO with the register value for read transactions
  tx_shift &lt;= reg_rd;       // combinational read from register file
end
</pre>

<h3>Register file — eight separate registers</h3>
<p>Multi-dimensional arrays (<code>logic [7:0] regs[0:7]</code>) are taught in msv5.
For now, use eight separate registers with a ternary read dispatch and
if/else write dispatch — a pattern you know from msv3 and msv4.</p>

<pre class="code-block">logic [7:0] reg0, reg1, reg2, reg3, reg4, reg5, reg6, reg7;

// Combinational read — which register does addr point to?
logic [7:0] reg_rd;
assign reg_rd = (addr == 3'd0) ? reg0 :
                (addr == 3'd1) ? reg1 :
                (addr == 3'd2) ? reg2 :
                (addr == 3'd3) ? reg3 :
                (addr == 3'd4) ? reg4 :
                (addr == 3'd5) ? reg5 :
                (addr == 3'd6) ? reg6 : reg7;
</pre>

<h3>Write dispatch — on the 8th edge of the DATA byte</h3>
<pre class="code-block">// Write the received byte to the addressed register
if (addr == 3'd0) reg0 &lt;= {shift_reg[6:0], mosi};
else if (addr == 3'd1) reg1 &lt;= {shift_reg[6:0], mosi};
// ... through reg7
</pre>

<h3>MISO — pre-loaded, shifted out MSB first</h3>
<p>For a read transaction, the slave must have the register value on MISO
<em>before</em> the first SCLK edge of byte 1. Pre-load <code>tx_shift</code>
with <code>reg_rd</code> at the end of byte 0, then shift it out on each SCLK falling edge
exactly as in spi3 L2.</p>

<p><code>assign miso = cs_n ? 1'b0 : tx_shift[7];</code> — never <code>1'bz</code>.</p>

<p>This is a real interview question at hardware companies. If you can implement a
two-phase SPI slave with a register file from scratch, you are ready for embedded
hardware roles.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build it. Stuck? Tap 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_regfile with ports: clk, rst, cs_n, sclk, mosi, miso, wr_valid, wr_addr[2:0], wr_data[7:0]',
        'Declare eight separate 8-bit registers: reg0 through reg7',
        'Declare internal signals: shift_reg[7:0], tx_shift[7:0], bit_cnt[2:0], state, rw, addr[2:0]',
        'Add edge detection for sclk_rise, sclk_fall, cs_n_fall (same pattern as spi3)',
        'Write the combinational reg_rd assign chain using ternary operators over addr',
        'In the main always_ff block — on cs_n_fall: reset state=0 and bit_cnt=0',
        'On every sclk_rise: shift MOSI into shift_reg; on sclk_fall: shift tx_shift left',
        'On 8th SCLK edge of state 0 (ADDR): decode rw and addr; if read, pre-load tx_shift=reg_rd; advance state=1',
        'On 8th SCLK edge of state 1 (DATA) and rw=0 (write): dispatch write to the correct register, pulse wr_valid',
        'Add assign miso = cs_n ? 1\'b0 : tx_shift[7]',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for spi_regfile

Signals to declare:
  logic [7:0] reg0, reg1, reg2, reg3, reg4, reg5, reg6, reg7;
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt, addr;
  logic       state;          // 0=ADDR phase, 1=DATA phase
  logic       rw;             // 1=read, 0=write
  logic       sclk_prev, sclk_rise, sclk_fall;
  logic       cs_n_prev, cs_n_fall;

Edge detection (same as spi3):
  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;
  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

Combinational read dispatch:
  logic [7:0] reg_rd;
  assign reg_rd = (addr == 3'd0) ? reg0 :
                  (addr == 3'd1) ? reg1 :
                  (addr == 3'd2) ? reg2 :
                  (addr == 3'd3) ? reg3 :
                  (addr == 3'd4) ? reg4 :
                  (addr == 3'd5) ? reg5 :
                  (addr == 3'd6) ? reg6 : reg7;

Main always_ff logic:
  Reset all regs to 0 on rst.
  On cs_n_fall: state<=0; bit_cnt<=0;
  On sclk_rise: shift_reg <= {shift_reg[6:0], mosi}; bit_cnt <= bit_cnt+1;
  On sclk_fall: tx_shift <= {tx_shift[6:0], 1'b0};

  When sclk_rise AND bit_cnt==7 AND state==0 (end of ADDR byte):
    rw   <= shift_reg[6];        // bit 7 of the byte just received
    addr <= shift_reg[2:0];      // bottom 3 bits = register number
    if (shift_reg[6]) tx_shift <= reg_rd;   // pre-load for read
    state <= 1;
    bit_cnt <= 0;

  When sclk_rise AND bit_cnt==7 AND state==1 AND rw==0 (end of DATA write):
    dispatch write to reg0..reg7 using if/else on addr
    wr_addr  <= addr;
    wr_data  <= {shift_reg[6:0], mosi};
    wr_valid <= 1;   // pulse for one clock
  else: wr_valid <= 0;

Output:
  assign miso = cs_n ? 1'b0 : tx_shift[7];`,
      design:
`// Build the spi_regfile module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [2:0] wr_addr;
  logic [7:0] wr_data;

  spi_regfile dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // ── send8: drive 8 bits MSB-first on MOSI with SCLK ──
  task automatic send8(input logic [7:0] d);
    mosi = d[7]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[6]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[5]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[4]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[3]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[2]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[1]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
    mosi = d[0]; sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1;
  endtask

  // ── recv8: capture 8 MISO bits MSB-first ──
  task automatic recv8(output logic [7:0] d);
    mosi = 0;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[7] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[6] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[5] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[4] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[3] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[2] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[1] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; d[0] = miso;
  endtask

  // ── spi_write: 2-byte write transaction ──
  task automatic spi_write(input logic [2:0] a, input logic [7:0] d);
    cs_n = 0; repeat(2) @(posedge clk); #1;
    send8({1'b0, 2'b00, a});   // rw=0 (write), addr=a
    send8(d);
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  // ── spi_read: 2-byte read transaction ──
  task automatic spi_read(input logic [2:0] a, output logic [7:0] d);
    cs_n = 0; repeat(2) @(posedge clk); #1;
    send8({1'b1, 2'b00, a});   // rw=1 (read), addr=a
    recv8(d);
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] read_back;
  logic wr_fired;

  always_ff @(posedge clk) begin
    if (wr_valid) wr_fired <= 1'b1;
  end

  initial begin
    $display("=== SPI Register File Test ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0; wr_fired = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Write 0xAB to register 3
    spi_write(3'd3, 8'hAB);
    if (wr_fired && wr_addr === 3'd3 && wr_data === 8'hAB)
      $display("PASS  write reg[3]=0xAB wr_valid pulsed");
    else
      $display("FAIL  write reg[3] failed: wr_valid=%0b addr=%0d data=0x%02h",
               wr_fired, wr_addr, wr_data);

    // Write 0x7E to register 5
    wr_fired = 0;
    spi_write(3'd5, 8'h7E);

    // Read back register 3 — should return 0xAB
    spi_read(3'd3, read_back);
    if (read_back === 8'hAB)
      $display("PASS  read reg[3]=0x%02h", read_back);
    else
      $display("FAIL  read reg[3]=0x%02h expected 0xAB", read_back);

    // Read back register 5 — should return 0x7E
    spi_read(3'd5, read_back);
    if (read_back === 8'h7E)
      $display("PASS  read reg[5]=0x%02h", read_back);
    else
      $display("FAIL  read reg[5]=0x%02h expected 0x7E", read_back);

    $display("SPI register file works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  write reg[3]=0xAB wr_valid pulsed',
        'PASS  read reg[3]=0x',
        'PASS  read reg[5]=0x',
        'SPI register file works!'
      ]
    }

  ] // end lessons
});
