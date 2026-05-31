(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb4',
  title: 'SPI Register File Testbench',
  icon: '📋',
  level: 'intermediate',
  lessons: [

    // ─── L1: spi_regfile Testbench (Tier 3) ──────────────────────────────────
    {
      id: 'spitb4l1',
      title: 'L1 — Register File Testbench: Two-Phase SPI Protocol',
      theory: `
<h2>A Real SPI Protocol: Two-Phase Transactions</h2>
<p>Every testbench so far has been a single-byte transaction — one chip select window,
one byte on MOSI. Real SPI peripherals almost always use a two-phase protocol:
the first byte sets <strong>context</strong> (address + direction), and the second byte
carries <strong>data</strong>. This is how SPI flash memories, ADCs, and EEPROM chips
all work.</p>

<p>The <code>spi_regfile</code> module implements exactly this: an 8-register file
accessible via SPI. The master sends an ADDR byte first (which register, read or write),
then a DATA byte (the value to write, or a dummy byte to clock out a read response).</p>

<h2>The DUT: spi_regfile</h2>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td><code>clk, rst</code></td><td>in</td><td>System clock and active-high reset</td></tr>
<tr><td><code>cs_n, sclk, mosi</code></td><td>in</td><td>SPI bus inputs (driven by master / testbench)</td></tr>
<tr><td><code>miso</code></td><td>out</td><td>SPI bus output — register value clocked out on reads</td></tr>
<tr><td><code>wr_valid</code></td><td>out</td><td>One-clock pulse when a write completes</td></tr>
<tr><td><code>wr_addr[2:0]</code></td><td>out</td><td>Register index of the completed write (0–7)</td></tr>
<tr><td><code>wr_data[7:0]</code></td><td>out</td><td>Value written to that register</td></tr>
</table>

<h3>ADDR byte format</h3>
<p>The first byte of every transaction sets direction and register address.
Pack it with the concatenation operator — SV zero-extends shorter literals
when assigning to an 8-bit input:</p>
<table class="truth-table">
<tr><th>Bits 7..6</th><th>Bit 5</th><th>Bits 4..3</th><th>Bits 2..0</th></tr>
<tr><td>00 (pad)</td><td>rw (1=read, 0=write)</td><td>00 (pad)</td><td>addr[2:0]</td></tr>
</table>
<pre class="code-block">// How to build the ADDR byte for a write to register 3:
send8({1'b0, 2'b00, 3'd3});   // rw=0, addr=3

// For a read from register 3:
send8({1'b1, 2'b00, 3'd3});   // rw=1, addr=3</pre>

<h2>Pattern 1 — send8 and recv8 Tasks</h2>
<p><code>send8</code> drives 8 MOSI bits with manual SCLK — same as the <code>spi_bit</code>
pattern from Chapter 3, unrolled for 8 bits in one task.
<code>recv8</code> is the mirror: it pulses SCLK and captures MISO after each rise:</p>
<pre class="code-block">task automatic send8(input logic [7:0] d);
  mosi = d[7]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  mosi = d[6]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  // ... bits 5 through 1 ...
  mosi = d[0]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
endtask

task automatic recv8(output logic [7:0] d);
  mosi = 0;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[7] = miso;
  sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[6] = miso;
  // ... bits 5 through 0 ...
endtask</pre>

<h2>Pattern 2 — spi_write and spi_read Macro Tasks</h2>
<p>Wrap send8/recv8 in two macro tasks that handle the CS_N framing:</p>
<pre class="code-block">// Write: ADDR byte (rw=0) then DATA byte
task automatic spi_write(input logic [2:0] a, input logic [7:0] d);
  cs_n = 0; repeat(2) @(posedge clk); #1;
  send8({1'b0, 2'b00, a});   // ADDR phase
  send8(d);                   // DATA phase — write value
  sclk = 0; repeat(2) @(posedge clk); #1;
  cs_n = 1; repeat(4) @(posedge clk); #1;
endtask

// Read: ADDR byte (rw=1) then recv DATA byte on MISO
task automatic spi_read(input logic [2:0] a, output logic [7:0] d);
  cs_n = 0; repeat(2) @(posedge clk); #1;
  send8({1'b1, 2'b00, a});   // ADDR phase
  recv8(d);                   // DATA phase — capture MISO
  sclk = 0; repeat(2) @(posedge clk); #1;
  cs_n = 1; repeat(4) @(posedge clk); #1;
endtask</pre>

<h2>Verifying Writes: The wr_valid sticky flag</h2>
<p>Like <code>rx_valid</code>, <code>wr_valid</code> is a one-clock pulse.
Use a sticky flag to remember that it fired, then check the accompanying
<code>wr_addr</code> and <code>wr_data</code>:</p>
<pre class="code-block">logic wr_fired;
always_ff @(posedge clk) begin
  if (wr_valid) wr_fired &lt;= 1'b1;
end

// After spi_write:
if (wr_fired &amp;&amp; wr_addr===3'd3 &amp;&amp; wr_data===8'hAB)
  $display("PASS  TC-REG-01: write reg[3]=0xAB");</pre>

<h2>Six Test Cases to Build</h2>
<table class="truth-table">
<tr><th>ID</th><th>Operation</th><th>Check</th></tr>
<tr><td>TC-REG-01</td><td>Write reg[3] = 0xAB</td><td>wr_valid pulsed, wr_addr=3, wr_data=0xAB</td></tr>
<tr><td>TC-REG-02</td><td>Write reg[5] = 0x7E</td><td>wr_valid, wr_addr=5, wr_data=0x7E</td></tr>
<tr><td>TC-REG-03</td><td>Read reg[3]</td><td>read_back === 8'hAB</td></tr>
<tr><td>TC-REG-04</td><td>Read reg[5]</td><td>read_back === 8'h7E</td></tr>
<tr><td>TC-REG-05</td><td>Write reg[0] = 0x00</td><td>wr_valid pulsed</td></tr>
<tr><td>TC-REG-06</td><td>Read reg[0]</td><td>read_back === 8'h00</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and write the testbench.
The DUT (<code>spi_regfile</code>) is pre-loaded in the Testbench tab.
Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare all signals: clk, rst, cs_n, sclk, mosi, miso, wr_valid, wr_addr[2:0], wr_data[7:0]',
        'Instantiate spi_regfile dut — connect all 9 ports by name',
        'Write the send8 task: 8 unrolled mosi/sclk cycles, each with 4-clock low and 4-clock high phases',
        'Write the recv8 task: 8 unrolled sclk cycles, sample miso after each rise',
        'Write the spi_write task: cs_n=0, send8(ADDR with rw=0), send8(DATA), cs_n=1',
        'Write the spi_read task: cs_n=0, send8(ADDR with rw=1), recv8(data), cs_n=1',
        'Add the wr_fired sticky flag: always_ff @(posedge clk) if (wr_valid) wr_fired <= 1\'b1',
        'TC-REG-01: spi_write(3\'d3, 8\'hAB) — check wr_fired && wr_addr===3\'d3 && wr_data===8\'hAB',
        'TC-REG-02: reset wr_fired=0, spi_write(3\'d5, 8\'h7E) — check wr_valid fired',
        'TC-REG-03: spi_read(3\'d3, read_back) — check read_back===8\'hAB',
        'TC-REG-04: spi_read(3\'d5, read_back) — check read_back===8\'h7E',
        'TC-REG-05: spi_write(3\'d0, 8\'h00) then spi_read(3\'d0, read_back) — check 8\'h00',
        '$display("Register file testbench complete."); $finish; end endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines should appear in the Output tab',
      ],
      hint:
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

  // send8: drive 8 MOSI bits MSB-first with manual SCLK
  task automatic send8(input logic [7:0] d);
    mosi=d[7]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[6]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[5]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[4]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[3]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[2]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[1]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi=d[0]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  endtask

  // recv8: pulse SCLK 8 times and capture MISO MSB-first
  task automatic recv8(output logic [7:0] d);
    mosi = 0;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[7] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[6] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[5] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[4] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[3] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[2] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[1] = miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[0] = miso;
  endtask

  task automatic spi_write(input logic [2:0] a, input logic [7:0] d);
    cs_n = 0; repeat(2) @(posedge clk); #1;
    send8({1'b0, 2'b00, a});
    send8(d);
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  task automatic spi_read(input logic [2:0] a, output logic [7:0] d);
    cs_n = 0; repeat(2) @(posedge clk); #1;
    send8({1'b1, 2'b00, a});
    recv8(d);
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] read_back;
  logic       wr_fired;

  always_ff @(posedge clk) begin
    if (wr_valid) wr_fired <= 1'b1;
  end

  initial begin
    $display("=== SPI Register File Testbench ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0; wr_fired = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // TC-REG-01: write 0xAB to reg[3]
    spi_write(3'd3, 8'hAB);
    if (wr_fired && wr_addr === 3'd3 && wr_data === 8'hAB)
      $display("PASS  TC-REG-01: write reg[3]=0xAB, wr_valid pulsed");
    else
      $display("FAIL  TC-REG-01: wr_fired=%0b addr=%0d data=0x%02h",
               wr_fired, wr_addr, wr_data);

    // TC-REG-02: write 0x7E to reg[5]
    wr_fired = 0;
    spi_write(3'd5, 8'h7E);
    if (wr_fired && wr_addr === 3'd5 && wr_data === 8'h7E)
      $display("PASS  TC-REG-02: write reg[5]=0x7E");
    else
      $display("FAIL  TC-REG-02: wr_fired=%0b addr=%0d data=0x%02h",
               wr_fired, wr_addr, wr_data);

    // TC-REG-03: read back reg[3] — expect 0xAB
    spi_read(3'd3, read_back);
    if (read_back === 8'hAB)
      $display("PASS  TC-REG-03: read reg[3]=0x%02h", read_back);
    else
      $display("FAIL  TC-REG-03: read_back=0x%02h expected 0xAB", read_back);

    // TC-REG-04: read back reg[5] — expect 0x7E
    spi_read(3'd5, read_back);
    if (read_back === 8'h7E)
      $display("PASS  TC-REG-04: read reg[5]=0x%02h", read_back);
    else
      $display("FAIL  TC-REG-04: read_back=0x%02h expected 0x7E", read_back);

    // TC-REG-05: write 0x00 to reg[0] (all-zero data edge case)
    wr_fired = 0;
    spi_write(3'd0, 8'h00);
    if (wr_fired && wr_addr === 3'd0 && wr_data === 8'h00)
      $display("PASS  TC-REG-05: write reg[0]=0x00");
    else
      $display("FAIL  TC-REG-05: wr_fired=%0b addr=%0d data=0x%02h",
               wr_fired, wr_addr, wr_data);

    // TC-REG-06: read reg[0] — expect 0x00
    spi_read(3'd0, read_back);
    if (read_back === 8'h00)
      $display("PASS  TC-REG-06: read reg[0]=0x%02h", read_back);
    else
      $display("FAIL  TC-REG-06: read_back=0x%02h expected 0x00", read_back);

    $display("Register file testbench complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;

  // ── Step 1: Signals ──────────────────────────────────────────────────────────
  // logic clk = 0;
  // always #2 clk = ~clk;
  // logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  // logic [2:0] wr_addr;
  // logic [7:0] wr_data;

  // ── Step 2: Instantiate spi_regfile ─────────────────────────────────────────
  // spi_regfile dut (.clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
  //                  .mosi(mosi), .miso(miso),
  //                  .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data));

  // ── Step 3: send8 task (8 MOSI bits, manual SCLK) ───────────────────────────
  // task automatic send8(input logic [7:0] d); ... endtask

  // ── Step 4: recv8 task (8 SCLK pulses, capture MISO) ────────────────────────
  // task automatic recv8(output logic [7:0] d); ... endtask

  // ── Step 5: spi_write macro (cs_n=0, send ADDR+DATA, cs_n=1) ────────────────
  // task automatic spi_write(input logic [2:0] a, input logic [7:0] d); ... endtask

  // ── Step 6: spi_read macro (cs_n=0, send ADDR, recv DATA, cs_n=1) ───────────
  // task automatic spi_read(input logic [2:0] a, output logic [7:0] d); ... endtask

  // ── Step 7: wr_fired sticky flag ────────────────────────────────────────────
  // logic wr_fired;
  // always_ff @(posedge clk) if (wr_valid) wr_fired <= 1'b1;

  // ── Step 8: initial begin ────────────────────────────────────────────────────
  // TC-REG-01: spi_write(3'd3, 8'hAB) → wr_fired && wr_addr==3 && wr_data==0xAB
  // TC-REG-02: spi_write(3'd5, 8'h7E) → wr_fired, wr_addr==5
  // TC-REG-03: spi_read(3'd3, read_back) → read_back === 8'hAB
  // TC-REG-04: spi_read(3'd5, read_back) → read_back === 8'h7E
  // TC-REG-05: spi_write(3'd0, 8'h00) → wr_valid pulsed
  // TC-REG-06: spi_read(3'd0, read_back) → read_back === 8'h00

endmodule
`,
      testbench:
`// spi_regfile — reference DUT (do not edit)
// Your module tb in the Code tab instantiates this module.
module spi_regfile (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  output logic       miso,
  output logic       wr_valid,
  output logic [2:0] wr_addr,
  output logic [7:0] wr_data
);
  logic [7:0] reg0, reg1, reg2, reg3, reg4, reg5, reg6, reg7;
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt, addr;
  logic       state, rw;
  logic       sclk_prev, sclk_rise, sclk_fall;
  logic       cs_n_prev, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;
  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  // Combinatorial: next shift value and register read mux
  logic [7:0] new_shift, reg_rd;
  assign new_shift = {shift_reg[6:0], mosi};
  assign reg_rd = (addr == 3'd0) ? reg0 :
                  (addr == 3'd1) ? reg1 :
                  (addr == 3'd2) ? reg2 :
                  (addr == 3'd3) ? reg3 :
                  (addr == 3'd4) ? reg4 :
                  (addr == 3'd5) ? reg5 :
                  (addr == 3'd6) ? reg6 : reg7;

  always_ff @(posedge clk) begin
    wr_valid <= 1'b0;
    if (rst) begin
      reg0 <= 8'h0; reg1 <= 8'h0; reg2 <= 8'h0; reg3 <= 8'h0;
      reg4 <= 8'h0; reg5 <= 8'h0; reg6 <= 8'h0; reg7 <= 8'h0;
      state <= 0; bit_cnt <= 0; rw <= 0;
    end else begin
      if (cs_n_fall) begin
        state   <= 0;
        bit_cnt <= 0;
      end

      if (sclk_rise) begin
        shift_reg <= new_shift;
        bit_cnt   <= bit_cnt + 1;

        if (bit_cnt == 3'd7 && !state) begin
          // End of ADDR byte — decode rw and address
          rw      <= new_shift[5];    // bit5 of received byte = rw field
          addr    <= new_shift[2:0];  // bits2..0 = register address
          state   <= 1'b1;
          bit_cnt <= 3'd0;
        end else if (bit_cnt == 3'd7 && state && !rw) begin
          // End of DATA byte — write path
          case (addr)
            3'd0: reg0 <= new_shift;
            3'd1: reg1 <= new_shift;
            3'd2: reg2 <= new_shift;
            3'd3: reg3 <= new_shift;
            3'd4: reg4 <= new_shift;
            3'd5: reg5 <= new_shift;
            3'd6: reg6 <= new_shift;
            3'd7: reg7 <= new_shift;
          endcase
          wr_addr  <= addr;
          wr_data  <= new_shift;
          wr_valid <= 1'b1;
        end
      end

      if (sclk_fall) begin
        // Pre-load tx_shift on the first SCLK fall of a read DATA phase
        if (state && bit_cnt == 3'd0 && rw)
          tx_shift <= reg_rd;
        else
          tx_shift <= {tx_shift[6:0], 1'b0};
      end
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule`,
      expected: [
        'PASS  TC-REG-01',
        'PASS  TC-REG-03',
        'PASS  TC-REG-04',
        'Register file testbench complete.'
      ]
    }

  ] // end lessons
});
