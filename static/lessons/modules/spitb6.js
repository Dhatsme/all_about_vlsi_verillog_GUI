(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb6',
  title: 'SPI Flash Missing Test Cases',
  icon: '🔍',
  level: 'advanced',
  lessons: [

    // ─── L1 ──────────────────────────────────────────────────────────────────
    {
      id: 'spitb6l1',
      title: 'L1 — TC1 wr_valid Write-Only — TC2 Boundary Addresses',
      theory: `
<h2>Verifying What Should NOT Happen</h2>
<p>Good testbenches check two things: that correct outputs appear when expected,
and that incorrect outputs do <strong>not</strong> appear when they should not.
TC1 checks the second kind — it verifies that <code>wr_valid</code> fires <em>only</em>
on a WRITE command, and never on READ or READ_STATUS.</p>

<p>The tool is a <strong>counter monitor</strong> — an <code>always_ff</code> block that
counts every <code>wr_valid</code> pulse. You snapshot the counter before and after
each transaction to detect any unexpected increments.</p>

<pre class="code-block">// mon_wr_count: counts every wr_valid pulse
logic [3:0] mon_wr_count;
always_ff @(posedge clk) begin
  if (rst)           mon_wr_count &lt;= 4'd0;
  else if (wr_valid) mon_wr_count &lt;= mon_wr_count + 4'd1;
end
</pre>

<p>Snapshot pattern: save the count before the transaction, check it has not changed after.</p>
<pre class="code-block">logic [3:0] cnt_before;
cnt_before = mon_wr_count;
drv_flash_read(addr, rdata);          // should NOT fire wr_valid
repeat(2) @(posedge clk); #1;
if (mon_wr_count === cnt_before)
  $display("PASS  READ did not fire wr_valid");
</pre>

<h3>TC2 — Boundary Addresses</h3>
<p>The flash slave has a 4-bit address space: addresses 0 to 15.
Writing and reading the boundaries (0 and 15) catches off-by-one errors
that only manifest at the extremes of the address range.</p>

<table class="truth-table">
<tr><th>TC</th><th>Action</th><th>Expected</th></tr>
<tr><td>TC1a</td><td>READ addr 5</td><td>mon_wr_count unchanged</td></tr>
<tr><td>TC1b</td><td>READ_STATUS</td><td>mon_wr_count unchanged</td></tr>
<tr><td>TC1c</td><td>WRITE addr 3</td><td>mon_wr_count += 1</td></tr>
<tr><td>TC2a</td><td>Write 0xDE to addr 0, read back</td><td>0xDE</td></tr>
<tr><td>TC2b</td><td>Write 0xF0 to addr 15, read back</td><td>0xF0</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and build the testbench. Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb with spi_flash_slave ports (clk, rst, cs_n, sclk, mosi, miso, wr_valid, wr_addr[3:0], wr_data[7:0])',
        'Add logic [3:0] mon_wr_count with always_ff that increments on wr_valid',
        'Copy drv_send8 (8x unrolled mosi=d[N]; sclk fall @clk #1; rise @clk #1)',
        'Copy drv_recv8 (d[7]=miso; then 7x fall-rise-sample; final sclk=0)',
        'Copy drv_flash_write, drv_flash_read, drv_flash_status from spitb5l2',
        'TC1a: cnt_before=mon_wr_count; drv_flash_read(5, rdata); repeat(2)@clk; check count===cnt_before',
        'TC1b: snapshot; drv_flash_status(status); check count===cnt_before',
        "TC1c: snapshot; drv_flash_write(3, 8'hA1); repeat(2)@clk; check count===cnt_before+4'd1",
        "TC2a: drv_flash_write(0, 8'hDE); drv_flash_read(0, rdata); check rdata===8'hDE",
        "TC2b: drv_flash_write(15, 8'hF0); drv_flash_read(15, rdata); check rdata===8'hF0",
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // --- mon_ counter: increments on every wr_valid pulse ---
  logic [3:0] mon_wr_count;
  always_ff @(posedge clk) begin
    if (rst)           mon_wr_count <= 4'd0;
    else if (wr_valid) mon_wr_count <= mon_wr_count + 4'd1;
  end

  task automatic drv_send8(input logic [7:0] d);
    mosi = d[7]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[6]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[5]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[4]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[3]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[2]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[1]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[0]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_recv8(output logic [7:0] d);
    d[7] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[6] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[5] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[4] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[3] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[2] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[1] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[0] = miso;
    sclk = 1'b0; @(posedge clk); #1;
  endtask

  task automatic drv_flash_write(input logic [3:0] a, input logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h02);
    drv_send8({4'b0000, a});
    drv_send8(d);
    sclk = 1'b0; @(posedge clk); #1;
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_flash_read(input logic [3:0] a, output logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h03);
    drv_send8({4'b0000, a});
    drv_recv8(d);
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_flash_status(output logic [7:0] s);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h05);
    drv_recv8(s);
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  logic [7:0] rdata, status;
  logic [3:0] cnt_before;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // Seed memory so READ has data to return
    drv_flash_write(4'd5, 8'h55);
    repeat(2) @(posedge clk); #1;

    // TC1a: READ must NOT fire wr_valid
    cnt_before = mon_wr_count;
    drv_flash_read(4'd5, rdata);
    repeat(2) @(posedge clk); #1;
    if (mon_wr_count === cnt_before)
      $display("PASS  READ did not fire wr_valid");
    else
      $display("FAIL  READ fired wr_valid (count now %0d)", mon_wr_count);

    // TC1b: STATUS must NOT fire wr_valid
    cnt_before = mon_wr_count;
    drv_flash_status(status);
    repeat(2) @(posedge clk); #1;
    if (mon_wr_count === cnt_before)
      $display("PASS  STATUS did not fire wr_valid");
    else
      $display("FAIL  STATUS fired wr_valid");

    // TC1c: WRITE must fire wr_valid exactly once
    cnt_before = mon_wr_count;
    drv_flash_write(4'd3, 8'hA1);
    repeat(2) @(posedge clk); #1;
    if (mon_wr_count === cnt_before + 4'd1)
      $display("PASS  WRITE fired wr_valid once");
    else
      $display("FAIL  WRITE wr_valid delta=%0d", mon_wr_count - cnt_before);

    // TC2a: boundary addr 0
    drv_flash_write(4'd0, 8'hDE);
    repeat(2) @(posedge clk); #1;
    drv_flash_read(4'd0, rdata);
    if (rdata === 8'hDE)
      $display("PASS  boundary addr=0 -> 0x%0h", rdata);
    else
      $display("FAIL  boundary addr=0 -> 0x%0h expected 0xDE", rdata);

    // TC2b: boundary addr 15
    drv_flash_write(4'd15, 8'hF0);
    repeat(2) @(posedge clk); #1;
    drv_flash_read(4'd15, rdata);
    if (rdata === 8'hF0)
      $display("PASS  boundary addr=15 -> 0x%0h", rdata);
    else
      $display("FAIL  boundary addr=15 -> 0x%0h expected 0xF0", rdata);

    $display("TC1 TC2 complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // --- mon_ counter ---
  // logic [3:0] mon_wr_count
  // always_ff: if rst => 0; else if wr_valid => count + 1

  // --- drv_ tasks ---
  // drv_send8(d), drv_recv8(d)
  // drv_flash_write(a, d), drv_flash_read(a, d), drv_flash_status(s)

  logic [7:0] rdata, status;
  logic [3:0] cnt_before;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // Seed: drv_flash_write(4'd5, 8'h55)
    // TC1a: cnt_before=mon_wr_count; drv_flash_read; check unchanged
    // TC1b: cnt_before; drv_flash_status; check unchanged
    // TC1c: cnt_before; drv_flash_write; check cnt_before+1
    // TC2a: write 0xDE to addr 0; read back; check 0xDE
    // TC2b: write 0xF0 to addr 15; read back; check 0xF0

    $display("TC1 TC2 complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_flash_slave (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  output logic       miso,
  output logic       wr_valid,
  output logic [3:0] wr_addr,
  output logic [7:0] wr_data
);
  logic [7:0] mem [0:15];
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] state;
  logic [3:0] addr;
  logic       rw;
  logic       sclk_prev, cs_n_prev;
  logic       sclk_rise, sclk_fall, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;
  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  always_ff @(posedge clk) begin
    wr_valid <= 1'b0;
    if (rst) begin
      state <= 2'd0; bit_cnt <= 3'd0; rw <= 1'b0;
      shift_reg <= 8'h00; tx_shift <= 8'h00;
      addr <= 4'd0; wr_addr <= 4'd0; wr_data <= 8'h00;
      mem[0]  <= 8'h00; mem[1]  <= 8'h00; mem[2]  <= 8'h00; mem[3]  <= 8'h00;
      mem[4]  <= 8'h00; mem[5]  <= 8'h00; mem[6]  <= 8'h00; mem[7]  <= 8'h00;
      mem[8]  <= 8'h00; mem[9]  <= 8'h00; mem[10] <= 8'h00; mem[11] <= 8'h00;
      mem[12] <= 8'h00; mem[13] <= 8'h00; mem[14] <= 8'h00; mem[15] <= 8'h00;
    end else if (cs_n_fall) begin
      state <= 2'd0; bit_cnt <= 3'd0;
    end else if (sclk_rise) begin
      shift_reg <= {shift_reg[6:0], mosi};
      if (bit_cnt == 3'd7) begin
        bit_cnt <= 3'd0;
        case (state)
          2'd0: begin
            case ({shift_reg[6:0], mosi})
              8'h03: begin rw <= 1'b1; state <= 2'd1; end
              8'h02: begin rw <= 1'b0; state <= 2'd1; end
              8'h05: begin tx_shift <= 8'h00; state <= 2'd2; end
              default: state <= 2'd0;
            endcase
          end
          2'd1: begin
            addr <= {shift_reg[2:0], mosi};
            if (rw) begin
              tx_shift <= mem[{shift_reg[2:0], mosi}];
              state <= 2'd2;
            end else
              state <= 2'd3;
          end
          2'd3: begin
            mem[addr]  <= {shift_reg[6:0], mosi};
            wr_addr    <= addr;
            wr_data    <= {shift_reg[6:0], mosi};
            wr_valid   <= 1'b1;
            state      <= 2'd0;
          end
          default: state <= state;
        endcase
      end else
        bit_cnt <= bit_cnt + 1;
    end else if (sclk_fall) begin
      tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule`,
      expected: [
        'PASS  READ did not fire wr_valid',
        'PASS  STATUS did not fire wr_valid',
        'PASS  WRITE fired wr_valid once',
        'PASS  boundary addr=0',
        'PASS  boundary addr=15',
        'TC1 TC2 complete.'
      ]
    },

    // ─── L2 ──────────────────────────────────────────────────────────────────
    {
      id: 'spitb6l2',
      title: 'L2 — TC3 Overwrite — TC4 Non-Destructive Read',
      theory: `
<h2>Memory Semantics: Overwrite and Idempotent Reads</h2>
<p>Two fundamental memory properties every testbench must verify:</p>
<ul>
<li><strong>Last-write-wins</strong>: writing to an address twice must leave only the second value.
Any implementation bug that merges, ORs, or retains old bits will fail TC3.</li>
<li><strong>Non-destructive read</strong>: reading a memory location must never alter its content.
Some early SRAM designs had read-disturb failures — TC4 catches this class of bug.</li>
</ul>

<h3>TC3 — Overwrite</h3>
<pre class="code-block">drv_flash_write(4'd7, 8'hAA);   // first write
drv_flash_write(4'd7, 8'hBB);   // overwrite same address
drv_flash_read (4'd7, rdata);   // expect 0xBB
</pre>

<h3>TC4 — Non-Destructive Read</h3>
<pre class="code-block">drv_flash_write(4'd3, 8'hDE);
drv_flash_read (4'd3, rdata);   // first read  -> 0xDE
drv_flash_read (4'd3, rdata);   // second read -> still 0xDE
</pre>

<table class="truth-table">
<tr><th>TC</th><th>Sequence</th><th>Expected</th></tr>
<tr><td>TC3</td><td>write 0xAA, write 0xBB, read</td><td>0xBB (last write wins)</td></tr>
<tr><td>TC4 read1</td><td>write 0xDE, read</td><td>0xDE</td></tr>
<tr><td>TC4 read2</td><td>read again (no write)</td><td>0xDE (unchanged)</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb with all spi_flash_slave ports',
        'Copy drv_send8, drv_recv8, drv_flash_write, drv_flash_read from previous lessons',
        "TC3: write 8'hAA to addr 7, then write 8'hBB to addr 7, then read — check rdata===8'hBB",
        "TC4: write 8'hDE to addr 3, read twice — both reads check rdata===8'hDE",
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  task automatic drv_send8(input logic [7:0] d);
    mosi = d[7]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[6]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[5]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[4]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[3]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[2]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[1]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[0]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_recv8(output logic [7:0] d);
    d[7] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[6] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[5] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[4] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[3] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[2] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[1] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[0] = miso;
    sclk = 1'b0; @(posedge clk); #1;
  endtask

  task automatic drv_flash_write(input logic [3:0] a, input logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h02);
    drv_send8({4'b0000, a});
    drv_send8(d);
    sclk = 1'b0; @(posedge clk); #1;
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_flash_read(input logic [3:0] a, output logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h03);
    drv_send8({4'b0000, a});
    drv_recv8(d);
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  logic [7:0] rdata;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC3: overwrite
    drv_flash_write(4'd7, 8'hAA);
    repeat(2) @(posedge clk); #1;
    drv_flash_write(4'd7, 8'hBB);
    repeat(2) @(posedge clk); #1;
    drv_flash_read(4'd7, rdata);
    if (rdata === 8'hBB)
      $display("PASS  overwrite addr=7 -> 0x%0h", rdata);
    else
      $display("FAIL  overwrite addr=7 -> 0x%0h expected 0xBB", rdata);

    // TC4: non-destructive read
    drv_flash_write(4'd3, 8'hDE);
    repeat(2) @(posedge clk); #1;
    drv_flash_read(4'd3, rdata);
    if (rdata === 8'hDE)
      $display("PASS  non-destructive read1=0x%0h", rdata);
    else
      $display("FAIL  read1=0x%0h expected 0xDE", rdata);
    drv_flash_read(4'd3, rdata);
    if (rdata === 8'hDE)
      $display("PASS  non-destructive read2=0x%0h", rdata);
    else
      $display("FAIL  read2=0x%0h expected 0xDE", rdata);

    $display("TC3 TC4 complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // --- drv_ tasks: drv_send8, drv_recv8, drv_flash_write, drv_flash_read ---

  logic [7:0] rdata;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC3: write 0xAA to addr 7; write 0xBB to addr 7; read back -> check 0xBB
    // TC4: write 0xDE to addr 3; read twice -> both check 0xDE

    $display("TC3 TC4 complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_flash_slave (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  output logic       miso,
  output logic       wr_valid,
  output logic [3:0] wr_addr,
  output logic [7:0] wr_data
);
  logic [7:0] mem [0:15];
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] state;
  logic [3:0] addr;
  logic       rw;
  logic       sclk_prev, cs_n_prev;
  logic       sclk_rise, sclk_fall, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;
  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  always_ff @(posedge clk) begin
    wr_valid <= 1'b0;
    if (rst) begin
      state <= 2'd0; bit_cnt <= 3'd0; rw <= 1'b0;
      shift_reg <= 8'h00; tx_shift <= 8'h00;
      addr <= 4'd0; wr_addr <= 4'd0; wr_data <= 8'h00;
      mem[0]  <= 8'h00; mem[1]  <= 8'h00; mem[2]  <= 8'h00; mem[3]  <= 8'h00;
      mem[4]  <= 8'h00; mem[5]  <= 8'h00; mem[6]  <= 8'h00; mem[7]  <= 8'h00;
      mem[8]  <= 8'h00; mem[9]  <= 8'h00; mem[10] <= 8'h00; mem[11] <= 8'h00;
      mem[12] <= 8'h00; mem[13] <= 8'h00; mem[14] <= 8'h00; mem[15] <= 8'h00;
    end else if (cs_n_fall) begin
      state <= 2'd0; bit_cnt <= 3'd0;
    end else if (sclk_rise) begin
      shift_reg <= {shift_reg[6:0], mosi};
      if (bit_cnt == 3'd7) begin
        bit_cnt <= 3'd0;
        case (state)
          2'd0: begin
            case ({shift_reg[6:0], mosi})
              8'h03: begin rw <= 1'b1; state <= 2'd1; end
              8'h02: begin rw <= 1'b0; state <= 2'd1; end
              8'h05: begin tx_shift <= 8'h00; state <= 2'd2; end
              default: state <= 2'd0;
            endcase
          end
          2'd1: begin
            addr <= {shift_reg[2:0], mosi};
            if (rw) begin
              tx_shift <= mem[{shift_reg[2:0], mosi}];
              state <= 2'd2;
            end else
              state <= 2'd3;
          end
          2'd3: begin
            mem[addr]  <= {shift_reg[6:0], mosi};
            wr_addr    <= addr;
            wr_data    <= {shift_reg[6:0], mosi};
            wr_valid   <= 1'b1;
            state      <= 2'd0;
          end
          default: state <= state;
        endcase
      end else
        bit_cnt <= bit_cnt + 1;
    end else if (sclk_fall) begin
      tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule`,
      expected: [
        'PASS  overwrite addr=7',
        'PASS  non-destructive read1',
        'PASS  non-destructive read2',
        'TC3 TC4 complete.'
      ]
    },

    // ─── L3 ──────────────────────────────────────────────────────────────────
    {
      id: 'spitb6l3',
      title: 'L3 — TC5 Command Decode 0x02 vs 0x03 — Corner CS_N Abort',
      theory: `
<h2>Command Decode and the CS_N Abort Corner Case</h2>
<p>TC5 verifies that the DUT correctly distinguishes the WRITE command (0x02)
from the READ command (0x03). Command-decode bugs are more common than they
look — a wrong bit mask or a copy-paste error can silently swap behaviour.
The test strategy is straightforward: write via 0x02, read back via 0x03,
and confirm the data round-trips correctly.</p>

<h3>TC5 — Command Decode</h3>
<pre class="code-block">drv_flash_write(4'd9, 8'hC3);   // issues 0x02 WRITE command
drv_flash_read (4'd9, rdata);   // issues 0x03 READ command
// expect rdata === 8'hC3
</pre>

<h3>Corner: CS_N Abort Mid-Transaction</h3>
<p>What happens when the master deasserts CS_N before a transaction completes?
A correct DUT must discard the partial transaction and leave memory unchanged.
This is a mandatory SPI protocol property — bus errors must not corrupt storage.</p>

<p>Test sequence: write a known value to addr 11, then start a new WRITE to addr 11
but abort it after sending CMD+ADDR, before sending the DATA byte.
Read addr 11 and verify it still holds the original value.</p>

<pre class="code-block">drv_flash_write(4'd11, 8'h77);  // pre-condition
// partial WRITE: send CMD then ADDR, then abort
cs_n = 1'b0; @(posedge clk); #1;
drv_send8(8'h02);               // WRITE command
drv_send8(8'h0B);               // addr 11 = 0x0B
sclk = 1'b0; @(posedge clk); #1;
cs_n = 1'b1; @(posedge clk); #1;  // abort before DATA
// memory at addr 11 must still be 0x77
</pre>

<p>This one takes a few tries to get the timing right — that is completely normal.
The key insight: <code>wr_valid</code> only fires when the full DATA byte is received
(state 3, bit 7). Aborting before that means the write never commits.</p>

<table class="truth-table">
<tr><th>TC</th><th>Scenario</th><th>Expected</th></tr>
<tr><td>TC5</td><td>Write via 0x02, read via 0x03</td><td>Data round-trips correctly</td></tr>
<tr><td>Corner</td><td>Abort after CMD+ADDR, before DATA</td><td>mem[11] = 0x77 (unchanged)</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb with all spi_flash_slave ports',
        'Copy drv_send8, drv_recv8, drv_flash_write, drv_flash_read',
        "TC5: drv_flash_write(4'd9, 8'hC3); repeat(2)@clk; drv_flash_read(4'd9, rdata); check rdata===8'hC3",
        "Corner setup: drv_flash_write(4'd11, 8'h77); repeat(2)@clk",
        "Corner abort: cs_n=0 @clk #1; drv_send8(8'h02); drv_send8(8'h0B); sclk=0 @clk #1; cs_n=1 @clk #1",
        "Corner verify: repeat(2)@clk; drv_flash_read(4'd11, rdata); check rdata===8'h77",
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — both PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  task automatic drv_send8(input logic [7:0] d);
    mosi = d[7]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[6]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[5]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[4]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[3]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[2]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[1]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
    mosi = d[0]; sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_recv8(output logic [7:0] d);
    d[7] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[6] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[5] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[4] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[3] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[2] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[1] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[0] = miso;
    sclk = 1'b0; @(posedge clk); #1;
  endtask

  task automatic drv_flash_write(input logic [3:0] a, input logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h02);
    drv_send8({4'b0000, a});
    drv_send8(d);
    sclk = 1'b0; @(posedge clk); #1;
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  task automatic drv_flash_read(input logic [3:0] a, output logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h03);
    drv_send8({4'b0000, a});
    drv_recv8(d);
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  logic [7:0] rdata;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC5: command decode
    drv_flash_write(4'd9, 8'hC3);
    repeat(2) @(posedge clk); #1;
    drv_flash_read(4'd9, rdata);
    if (rdata === 8'hC3)
      $display("PASS  cmd decode 0x02/0x03 -> 0x%0h", rdata);
    else
      $display("FAIL  cmd decode -> 0x%0h expected 0xC3", rdata);

    // Corner: CS_N abort before DATA byte
    drv_flash_write(4'd11, 8'h77);       // pre-condition
    repeat(2) @(posedge clk); #1;
    cs_n = 1'b0; @(posedge clk); #1;    // start new WRITE
    drv_send8(8'h02);                    // CMD
    drv_send8(8'h0B);                    // ADDR = 11
    sclk = 1'b0; @(posedge clk); #1;    // ensure sclk low
    cs_n = 1'b1; @(posedge clk); #1;    // abort
    repeat(2) @(posedge clk); #1;
    drv_flash_read(4'd11, rdata);
    if (rdata === 8'h77)
      $display("PASS  CS_N abort: memory unchanged -> 0x%0h", rdata);
    else
      $display("FAIL  CS_N abort: memory corrupted -> 0x%0h expected 0x77", rdata);

    $display("TC5 Corner complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // --- drv_ tasks: drv_send8, drv_recv8, drv_flash_write, drv_flash_read ---

  logic [7:0] rdata;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC5: drv_flash_write(4'd9, 8'hC3); drv_flash_read(4'd9, rdata); check 0xC3
    // Corner: drv_flash_write(4'd11, 8'h77);
    //   cs_n=0 @clk #1; drv_send8(8'h02); drv_send8(8'h0B);
    //   sclk=0 @clk #1; cs_n=1 @clk #1;  // abort
    //   drv_flash_read(4'd11, rdata); check 0x77

    $display("TC5 Corner complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_flash_slave (
  input  logic       clk, rst,
  input  logic       cs_n, sclk, mosi,
  output logic       miso,
  output logic       wr_valid,
  output logic [3:0] wr_addr,
  output logic [7:0] wr_data
);
  logic [7:0] mem [0:15];
  logic [7:0] shift_reg, tx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] state;
  logic [3:0] addr;
  logic       rw;
  logic       sclk_prev, cs_n_prev;
  logic       sclk_rise, sclk_fall, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;
  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  always_ff @(posedge clk) begin
    wr_valid <= 1'b0;
    if (rst) begin
      state <= 2'd0; bit_cnt <= 3'd0; rw <= 1'b0;
      shift_reg <= 8'h00; tx_shift <= 8'h00;
      addr <= 4'd0; wr_addr <= 4'd0; wr_data <= 8'h00;
      mem[0]  <= 8'h00; mem[1]  <= 8'h00; mem[2]  <= 8'h00; mem[3]  <= 8'h00;
      mem[4]  <= 8'h00; mem[5]  <= 8'h00; mem[6]  <= 8'h00; mem[7]  <= 8'h00;
      mem[8]  <= 8'h00; mem[9]  <= 8'h00; mem[10] <= 8'h00; mem[11] <= 8'h00;
      mem[12] <= 8'h00; mem[13] <= 8'h00; mem[14] <= 8'h00; mem[15] <= 8'h00;
    end else if (cs_n_fall) begin
      state <= 2'd0; bit_cnt <= 3'd0;
    end else if (sclk_rise) begin
      shift_reg <= {shift_reg[6:0], mosi};
      if (bit_cnt == 3'd7) begin
        bit_cnt <= 3'd0;
        case (state)
          2'd0: begin
            case ({shift_reg[6:0], mosi})
              8'h03: begin rw <= 1'b1; state <= 2'd1; end
              8'h02: begin rw <= 1'b0; state <= 2'd1; end
              8'h05: begin tx_shift <= 8'h00; state <= 2'd2; end
              default: state <= 2'd0;
            endcase
          end
          2'd1: begin
            addr <= {shift_reg[2:0], mosi};
            if (rw) begin
              tx_shift <= mem[{shift_reg[2:0], mosi}];
              state <= 2'd2;
            end else
              state <= 2'd3;
          end
          2'd3: begin
            mem[addr]  <= {shift_reg[6:0], mosi};
            wr_addr    <= addr;
            wr_data    <= {shift_reg[6:0], mosi};
            wr_valid   <= 1'b1;
            state      <= 2'd0;
          end
          default: state <= state;
        endcase
      end else
        bit_cnt <= bit_cnt + 1;
    end else if (sclk_fall) begin
      tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule`,
      expected: [
        'PASS  cmd decode 0x02/0x03',
        'PASS  CS_N abort: memory unchanged',
        'TC5 Corner complete.'
      ]
    }

  ] // end lessons
});
