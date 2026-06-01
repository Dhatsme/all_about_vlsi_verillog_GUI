(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb5',
  title: 'SPI Advanced Applications Testbench',
  icon: '🔬',
  level: 'advanced',
  lessons: [

    // ─── L1: ADC Slave Testbench ─────────────────────────────────────────────
    {
      id: 'spitb5l1',
      title: 'L1 — ADC Slave Testbench: drv_ &amp; chk_',
      theory: `
<h2>Writing Testbenches Like a Verification Engineer</h2>
<p>Professional hardware teams use a methodology called UVM (Universal Verification Methodology)
to structure testbenches. UVM defines named roles: a <strong>Driver</strong> sends stimulus to the DUT,
and a <strong>Checker</strong> verifies the output is correct.
In UVM these roles are implemented as classes — but the thinking behind them is just
good code organisation, and you can apply it right now using plain SystemVerilog tasks.</p>

<p>This lesson introduces a naming convention used by verification engineers worldwide:</p>
<table class="truth-table">
<tr><th>Prefix</th><th>Role</th><th>What it does</th></tr>
<tr><td><code>drv_</code></td><td>Driver</td><td>Drives signals into the DUT — CS_N, SCLK, MOSI, adc_val</td></tr>
<tr><td><code>chk_</code></td><td>Checker</td><td>Verifies DUT outputs — PASS/FAIL with expected vs actual</td></tr>
<tr><td><code>mon_</code></td><td>Monitor</td><td>Passively observes DUT signals, latches events (introduced in L2)</td></tr>
</table>

<p>Your tasks are functionally identical to what UVM drivers and checkers do.
The only difference is UVM wraps them in classes for reuse across large projects.
Here you use tasks — same thinking, simpler syntax.</p>

<h3>The DUT: spi_adc_slave</h3>
<p>An ADC slave emulator. When CS_N falls, the slave snapshots <code>adc_val</code> into an
internal shift register. It then shifts out that value MSB-first on each SCLK falling edge.
<code>miso</code> is 0 when CS_N is deasserted (idle).</p>

<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>System clock and reset</td></tr>
<tr><td>cs_n</td><td>in</td><td>Chip Select — LOW selects this device</td></tr>
<tr><td>sclk</td><td>in</td><td>SPI clock from master</td></tr>
<tr><td>adc_val[7:0]</td><td>in</td><td>Conversion result to send when CS_N falls</td></tr>
<tr><td>miso</td><td>out</td><td>Serial output — tx_shift[7], 0 when idle</td></tr>
</table>

<h3>Test cases you will implement</h3>
<table class="truth-table">
<tr><th>ID</th><th>Scenario</th><th>Expected</th></tr>
<tr><td>TC-ADC-01</td><td>Normal read: adc_val=0xA5</td><td>rx = 0xA5</td></tr>
<tr><td>TC-ADC-02</td><td>Change adc_val mid-transfer</td><td>rx still = 0xA5 (snapshot)</td></tr>
<tr><td>TC-ADC-03</td><td>CS_N deasserted</td><td>miso = 0</td></tr>
<tr><td>TC-ADC-04</td><td>Back-to-back: 0x3A then 0xC1</td><td>Both correct</td></tr>
</table>

<h3>Key drv_ task pattern</h3>
<pre class="code-block">// drv_adc_read: assert CS_N, wait 1 clk (loads tx_shift),
// sample miso on each sclk RISING edge, then deassert CS_N
task automatic drv_adc_read(input logic [7:0] val, output logic [7:0] result);
  adc_val = val;
  cs_n = 1'b0;
  @(posedge clk); #1;              // tx_shift &lt;= adc_val registered
  result = 8'b0;
  sclk = 1'b1; @(posedge clk); #1; result[7] = miso;  // bit 7
  sclk = 1'b0; @(posedge clk); #1;                    // fall: shifts tx_shift
  sclk = 1'b1; @(posedge clk); #1; result[6] = miso;  // bit 6
  // ... repeat for bits 5 down to 0 ...
  cs_n = 1'b1; @(posedge clk); #1;
endtask
</pre>

<p><strong>Ready?</strong> Switch to the Code tab and build the testbench. Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb: clk=0, always #5 toggle, and all spi_adc_slave ports as logic',
        'Instantiate spi_adc_slave dut with named port connections',
        'Write chk_adc_result(actual, expected): PASS adc_read=0x<val> or FAIL',
        'Write chk_miso_idle: PASS MISO=0 when cs_n deasserted or FAIL',
        'Write drv_adc_read(val, result): cs_n=0 → @clk #1 → 8x(sclk=1 @clk #1 sample miso; sclk=0 @clk #1) → cs_n=1',
        'TC-ADC-01: drv_adc_read(8\'hA5, rdata); chk_adc_result(rdata, 8\'hA5)',
        'TC-ADC-02: inline snapshot — cs_n=0, read 4 bits, change adc_val=8\'hFF, read 4 bits, check result===8\'hA5',
        'TC-ADC-03: chk_miso_idle()',
        'TC-ADC-04: drv_adc_read(8\'h3A) then drv_adc_read(8\'hC1)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst, cs_n, sclk, miso;
  logic [7:0]  adc_val;

  spi_adc_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .adc_val(adc_val), .miso(miso)
  );

  // --- chk_ checker tasks ---
  task automatic chk_adc_result(input logic [7:0] actual, input logic [7:0] expected);
    if (actual === expected)
      $display("PASS  adc_read=0x%0h", actual);
    else
      $display("FAIL  adc_read=0x%0h (expected 0x%0h)", actual, expected);
  endtask

  task automatic chk_miso_idle;
    if (miso === 1'b0)
      $display("PASS  MISO=0 when cs_n deasserted");
    else
      $display("FAIL  MISO not idle-low, got %0b", miso);
  endtask

  // --- drv_ driver task ---
  task automatic drv_adc_read(input logic [7:0] val, output logic [7:0] result);
    adc_val = val;
    cs_n = 1'b0;
    @(posedge clk); #1;
    result = 8'b0;
    sclk = 1'b1; @(posedge clk); #1; result[7] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[6] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[5] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[4] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[3] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[2] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[1] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; result[0] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    cs_n = 1'b1;
    @(posedge clk); #1;
  endtask

  logic [7:0] rdata;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; adc_val = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC-ADC-01: normal read
    drv_adc_read(8'hA5, rdata);
    chk_adc_result(rdata, 8'hA5);

    // TC-ADC-02: snapshot isolation -- change adc_val mid-transfer
    adc_val = 8'hA5;
    cs_n = 1'b0;
    @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[7] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[6] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[5] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[4] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    adc_val = 8'hFF;
    sclk = 1'b1; @(posedge clk); #1; rdata[3] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[2] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[1] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    sclk = 1'b1; @(posedge clk); #1; rdata[0] = miso;
    sclk = 1'b0; @(posedge clk); #1;
    cs_n = 1'b1; @(posedge clk); #1;
    if (rdata === 8'hA5)
      $display("PASS  snapshot preserved");
    else
      $display("FAIL  snapshot not preserved, got 0x%0h", rdata);

    // TC-ADC-03: MISO idle
    chk_miso_idle();

    // TC-ADC-04: back-to-back
    drv_adc_read(8'h3A, rdata);
    chk_adc_result(rdata, 8'h3A);
    drv_adc_read(8'hC1, rdata);
    chk_adc_result(rdata, 8'hC1);

    $display("SPI ADC slave testbench complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  // --- clock ---
  logic clk = 0;
  always #5 clk = ~clk;

  // --- DUT ports ---
  logic        rst;
  logic        cs_n  = 1'b1;
  logic        sclk  = 1'b0;
  logic [7:0]  adc_val;
  logic        miso;

  spi_adc_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .adc_val(adc_val), .miso(miso)
  );

  // --- chk_ checker tasks ---
  // chk_adc_result(actual, expected)
  //   PASS  adc_read=0x<val>  or  FAIL ...

  // chk_miso_idle()
  //   PASS  MISO=0 when cs_n deasserted  or  FAIL ...

  // --- drv_ driver task ---
  // drv_adc_read(val, result)
  //   cs_n=0; @clk #1
  //   8x: sclk=1 @clk #1 result[N]=miso; sclk=0 @clk #1
  //   cs_n=1; @clk #1

  logic [7:0] rdata;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; adc_val = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC-ADC-01: drv_adc_read(8'hA5, rdata); chk_adc_result(rdata, 8'hA5);
    // TC-ADC-02: snapshot isolation (inline)
    // TC-ADC-03: chk_miso_idle()
    // TC-ADC-04: back-to-back 0x3A then 0xC1

    $display("SPI ADC slave testbench complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_adc_slave (
  input  logic       clk, rst,
  input  logic       cs_n, sclk,
  input  logic [7:0] adc_val,
  output logic       miso
);
  logic [7:0] tx_shift;
  logic       sclk_prev, sclk_fall;
  logic       cs_n_prev, cs_n_fall;

  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;

  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

  always_ff @(posedge clk) begin
    if (rst)
      tx_shift <= 8'b0;
    else if (cs_n_fall)
      tx_shift <= adc_val;
    else if (sclk_fall)
      tx_shift <= {tx_shift[6:0], 1'b0};
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];
endmodule`,
      expected: [
        'PASS  adc_read=0xa5',
        'PASS  snapshot preserved',
        'PASS  MISO=0 when cs_n deasserted',
        'SPI ADC slave testbench complete.'
      ]
    },

    // ─── L2: Flash Slave Testbench ───────────────────────────────────────────
    {
      id: 'spitb5l2',
      title: 'L2 — Flash Slave Testbench: mon_ Monitor Signals',
      theory: `
<h2>The Monitor Pattern — Observing Without Interfering</h2>
<p>In L1, checkers sampled outputs at a specific moment in the test sequence.
But some DUT signals are <strong>pulses</strong> — they fire for exactly one clock cycle
and then vanish. If your <code>initial</code> block isn't watching at that exact moment,
you miss the event entirely.</p>

<p>The <strong>Monitor</strong> solves this. A monitor is an <code>always_ff</code> block
that runs in parallel with the test sequence, watching signals continuously.
When it sees the event it cares about, it latches a flag. Your checker then reads
the flag at any convenient time — even several cycles later.</p>

<pre class="code-block">// mon_ sticky-flag pattern
logic mon_wr_fired;
always_ff @(posedge clk) begin
  if (rst)          mon_wr_fired &lt;= 1'b0;
  else if (wr_valid) mon_wr_fired &lt;= 1'b1;  // latches on any wr_valid pulse
end
</pre>

<p>Once <code>mon_wr_fired</code> is set, it stays set until the test explicitly clears it.
This is called a <strong>sticky flag</strong> — a standard UVM scoreboard pattern.</p>

<h3>The DUT: spi_flash_slave</h3>
<p>A 16-byte SPI flash memory emulator. It receives commands over SPI and responds accordingly.
The master sends a 1-byte command, an optional 1-byte address, and optional data.</p>

<table class="truth-table">
<tr><th>Command</th><th>Byte</th><th>Following bytes</th><th>Action</th></tr>
<tr><td>READ</td><td>0x03</td><td>addr (1 byte)</td><td>shifts mem[addr] out on MISO</td></tr>
<tr><td>WRITE</td><td>0x02</td><td>addr, data (2 bytes)</td><td>stores data at mem[addr], pulses wr_valid</td></tr>
<tr><td>READ_STATUS</td><td>0x05</td><td>none</td><td>shifts 0x00 out on MISO</td></tr>
</table>

<h3>Key drv_ tasks you will build</h3>
<table class="truth-table">
<tr><th>Task</th><th>What it does</th></tr>
<tr><td><code>drv_send8(d)</code></td><td>Sends 8 bits MSB-first on MOSI, toggling SCLK</td></tr>
<tr><td><code>drv_recv8(d)</code></td><td>Samples MISO bit-by-bit as SCLK toggles (bit7 pre-loaded)</td></tr>
<tr><td><code>drv_flash_write(addr, data)</code></td><td>Full WRITE transaction: CS_N + CMD + ADDR + DATA</td></tr>
<tr><td><code>drv_flash_read(addr, data)</code></td><td>Full READ transaction: CS_N + CMD + ADDR + RECV</td></tr>
<tr><td><code>drv_flash_status(s)</code></td><td>READ_STATUS transaction: CS_N + CMD + RECV</td></tr>
</table>

<h3>Test cases</h3>
<table class="truth-table">
<tr><th>ID</th><th>Scenario</th><th>Checks</th></tr>
<tr><td>TC-FLASH-01</td><td>WRITE 0xBB to addr 5</td><td>mon_wr_fired=1, wr_addr=5, wr_data=0xBB</td></tr>
<tr><td>TC-FLASH-02</td><td>READ from addr 5</td><td>received = 0xBB</td></tr>
<tr><td>TC-FLASH-03</td><td>READ_STATUS</td><td>received = 0x00</td></tr>
</table>

<p><strong>Note on drv_recv8 timing:</strong> After <code>drv_send8(addr)</code>, SCLK is HIGH and MISO
already carries the MSB of the pre-loaded data. Sample bit 7 immediately, then use
fall/rise pairs for bits 6 down to 0.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb with all flash slave ports: cs_n, sclk, mosi, miso, wr_valid, wr_addr[3:0], wr_data[7:0]',
        'Add mon_wr_fired: always_ff sticky flag that latches when wr_valid fires',
        'Write drv_send8(d): 8x(mosi=d[N]; sclk=0 @clk #1; sclk=1 @clk #1) unrolled',
        'Write drv_recv8(d): d[7]=miso (sclk is high); then 7x(sclk=0 @clk #1; sclk=1 @clk #1; d[N]=miso); sclk=0 @clk #1',
        'Write drv_flash_write(a, d): cs_n=0 @clk #1; drv_send8(CMD); drv_send8(addr); drv_send8(data); sclk=0 @clk #1; cs_n=1 @clk #1',
        'Write drv_flash_read(a, d): cs_n=0 @clk #1; drv_send8(CMD); drv_send8(addr); drv_recv8(d); sclk=0 @clk #1; cs_n=1 @clk #1',
        'Write drv_flash_status(s): cs_n=0 @clk #1; drv_send8(8\'h05); drv_recv8(s); cs_n=1 @clk #1',
        'TC-FLASH-01: drv_flash_write(4\'d5, 8\'hBB); wait 2 clk; check mon_wr_fired && wr_addr===5 && wr_data===0xBB',
        'TC-FLASH-02: drv_flash_read(4\'d5, rdata); check rdata===8\'hBB',
        'TC-FLASH-03: drv_flash_status(status); check status===8\'h00',
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

  // --- mon_ monitor: sticky flag for wr_valid pulse ---
  logic mon_wr_fired;
  always_ff @(posedge clk) begin
    if (rst)           mon_wr_fired <= 1'b0;
    else if (wr_valid) mon_wr_fired <= 1'b1;
  end

  // --- drv_ send 8 bits MSB-first on MOSI ---
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

  // --- drv_ receive 8 bits MSB-first from MISO ---
  // Called right after drv_send8 (sclk is HIGH); miso already = tx_shift[7]
  task automatic drv_recv8(output logic [7:0] d);
    d[7] = miso;                                                  // bit 7 pre-loaded
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[6] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[5] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[4] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[3] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[2] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[1] = miso;
    sclk = 1'b0; @(posedge clk); #1; sclk = 1'b1; @(posedge clk); #1; d[0] = miso;
    sclk = 1'b0; @(posedge clk); #1;
  endtask

  // --- drv_ complete WRITE transaction ---
  task automatic drv_flash_write(input logic [3:0] a, input logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h02);           // WRITE command
    drv_send8({4'b0000, a});    // address (zero-padded)
    drv_send8(d);               // data byte
    sclk = 1'b0; @(posedge clk); #1;
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  // --- drv_ complete READ transaction ---
  task automatic drv_flash_read(input logic [3:0] a, output logic [7:0] d);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h03);           // READ command
    drv_send8({4'b0000, a});    // address
    drv_recv8(d);               // receive data
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  // --- drv_ READ_STATUS transaction ---
  task automatic drv_flash_status(output logic [7:0] s);
    cs_n = 1'b0; @(posedge clk); #1;
    drv_send8(8'h05);           // READ_STATUS command
    drv_recv8(s);               // receive status byte
    cs_n = 1'b1; @(posedge clk); #1;
  endtask

  logic [7:0] rdata, status;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC-FLASH-01: WRITE 0xBB to addr 5, verify wr_valid fires
    drv_flash_write(4'd5, 8'hBB);
    repeat(2) @(posedge clk); #1;
    if (mon_wr_fired && wr_addr === 4'd5 && wr_data === 8'hBB)
      $display("PASS  WRITE addr=5 wr_valid fired");
    else
      $display("FAIL  WRITE: fired=%0b addr=%0d data=0x%0h",
               mon_wr_fired, wr_addr, wr_data);

    // TC-FLASH-02: READ back addr 5 — should return 0xBB
    drv_flash_read(4'd5, rdata);
    if (rdata === 8'hBB)
      $display("PASS  READ addr=5 -> 0x%0h", rdata);
    else
      $display("FAIL  READ addr=5 -> 0x%0h (expected 0xBB)", rdata);

    // TC-FLASH-03: READ_STATUS — should return 0x00 (ready)
    drv_flash_status(status);
    if (status === 8'h00)
      $display("PASS  READ_STATUS -> 0x00");
    else
      $display("FAIL  READ_STATUS -> 0x%0h (expected 0x00)", status);

    $display("SPI flash slave testbench complete.");
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

  // --- mon_ monitor ---
  // mon_wr_fired: sticky always_ff flag that latches on wr_valid

  // --- drv_ driver tasks ---
  // drv_send8(d): 8x unrolled mosi=d[N]; sclk=0 @clk #1; sclk=1 @clk #1
  // drv_recv8(d): d[7]=miso; then 7x fall-rise-sample pairs; final sclk=0
  // drv_flash_write(a, d): cs_n=0 @clk; send CMD+ADDR+DATA; cs_n=1
  // drv_flash_read(a, d):  cs_n=0 @clk; send CMD+ADDR; recv DATA; cs_n=1
  // drv_flash_status(s):   cs_n=0 @clk; send 8'h05; recv STATUS; cs_n=1

  logic [7:0] rdata, status;

  initial begin
    rst = 1'b1; cs_n = 1'b1; sclk = 1'b0; mosi = 1'b0;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC-FLASH-01: drv_flash_write(4'd5, 8'hBB);
    //              check mon_wr_fired && wr_addr===5 && wr_data===0xBB
    // TC-FLASH-02: drv_flash_read(4'd5, rdata); check rdata===8'hBB
    // TC-FLASH-03: drv_flash_status(status); check status===8'h00

    $display("SPI flash slave testbench complete.");
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
  logic [1:0] state;   // 0=CMD 1=ADDR 2=DATA_TX 3=DATA_RX
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
        'PASS  WRITE addr=5 wr_valid fired',
        'PASS  READ addr=5',
        'PASS  READ_STATUS -> 0x00',
        'SPI flash slave testbench complete.'
      ]
    },

    // ─── L3: Bus Controller Portfolio ────────────────────────────────────────
    {
      id: 'spitb5l3',
      title: 'L3 — Portfolio: Bus Controller Testbench &amp; The Agent Pattern',
      theory: `
<h2>The Agent Pattern — When All Three Come Together</h2>
<p>You have now used all three prefixes: <code>drv_</code> drives stimulus, <code>mon_</code>
latches events, and <code>chk_</code> verifies correctness. Together they form a complete
verification <strong>Agent</strong> — the central concept of UVM.</p>

<p>In UVM, an Agent is a class that packages a Driver, a Monitor, and a Sequencer together.
Your plain-task version does the same job:</p>
<table class="truth-table">
<tr><th>Your tasks</th><th>UVM equivalent</th><th>Job</th></tr>
<tr><td><code>drv_start_xfer(dev, tx)</code></td><td>Driver</td><td>Applies inputs to DUT</td></tr>
<tr><td><code>always_ff mon_ blocks</code></td><td>Monitor</td><td>Watches outputs continuously</td></tr>
<tr><td><code>chk_rx_data(actual, expected)</code></td><td>Scoreboard</td><td>Compares result to golden value</td></tr>
<tr><td><code>chk_cs_exclusive(cs0, cs1, cs2, exp)</code></td><td>Coverage Checker</td><td>Verifies protocol property</td></tr>
</table>

<h3>The DUT: spi_bus_ctrl</h3>
<p>A multi-peripheral SPI bus controller that wraps <code>spi_master</code>.
It routes the master&apos;s single CS_N output to one of three slave CS_N pins,
and muxes the selected slave&apos;s MISO back to the master.</p>

<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst, start</td><td>in</td><td>Control signals</td></tr>
<tr><td>dev_sel[1:0]</td><td>in</td><td>0=slave0, 1=slave1, 2=slave2</td></tr>
<tr><td>tx_data[7:0]</td><td>in</td><td>Byte to send</td></tr>
<tr><td>miso0, miso1, miso2</td><td>in</td><td>MISO from each slave</td></tr>
<tr><td>mosi, sclk</td><td>out</td><td>Shared bus lines</td></tr>
<tr><td>cs0_n, cs1_n, cs2_n</td><td>out</td><td>Per-device chip selects</td></tr>
<tr><td>busy, done, rx_data[7:0]</td><td>out</td><td>Transfer status and result</td></tr>
</table>

<h3>Slave models using mon_ always_ff blocks</h3>
<p>Instead of instantiating real DUTs for the slaves, your testbench builds three
<strong>slave models</strong> directly inside module tb using <code>always_ff</code> blocks.
Each model watches its CS_N line and the shared SCLK to shift out a unique byte
(0xAA, 0xBB, 0xCC). This is the <strong>Monitor</strong> role applied to simulation stubs.</p>

<pre class="code-block">// MON: slave 0 model — returns 0xAA
logic [7:0] mon_s0_shift;
logic mon_sclk_prev, mon_cs0_prev;
always_ff @(posedge clk) begin
  mon_sclk_prev &lt;= sclk; mon_cs0_prev &lt;= cs0_n;
end
always_ff @(posedge clk) begin
  if (~cs0_n &amp; mon_cs0_prev) mon_s0_shift &lt;= 8'hAA;        // pre-load on CS fall
  else if (~sclk &amp; mon_sclk_prev &amp; ~cs0_n)                  // sclk_fall &amp; selected
    mon_s0_shift &lt;= {mon_s0_shift[6:0], 1'b0};
end
assign miso0 = cs0_n ? 1'b0 : mon_s0_shift[7];
</pre>

<h3>Test cases</h3>
<table class="truth-table">
<tr><th>ID</th><th>Scenario</th><th>Checks</th></tr>
<tr><td>TC-BUSCTRL-01</td><td>Select slave 0, transfer</td><td>rx_data=0xAA, cs1_n=1, cs2_n=1</td></tr>
<tr><td>TC-BUSCTRL-02</td><td>Select slave 1, transfer</td><td>rx_data=0xBB, cs0_n=1, cs2_n=1</td></tr>
<tr><td>TC-BUSCTRL-03</td><td>Select slave 2, transfer</td><td>rx_data=0xCC, cs0_n=1, cs1_n=1</td></tr>
</table>

<p>🎓 <strong>Portfolio piece</strong> — completing spitb1 through spitb5 means you have built and
verified every layer of the SPI stack from scratch. Multi-peripheral bus controllers
appear in every production embedded system.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build it. See 💡 Show Hint for design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb with spi_bus_ctrl ports plus miso0, miso1, miso2 for slave models',
        'Instantiate spi_bus_ctrl dut with all port connections',
        'Build three always_ff slave models (mon_s0/s1/s2_shift): pre-load on CS fall, shift on SCLK fall',
        'Assign miso0/miso1/miso2 from slave model shift registers',
        'Write drv_start_xfer(dev, tx): set dev_sel=dev, tx_data=tx, pulse start=1 @clk #1; start=0; wait ~150 clk',
        'Write chk_rx_data(actual, expected, label): PASS/FAIL display',
        'Write chk_cs_exclusive(cs0, cs1, cs2, expected_low): verifies only the expected CS_N is low',
        'TC-BUSCTRL-01: slave 0 (drv_start_xfer(0,0)); chk rx=0xAA and cs1_n=1, cs2_n=1',
        'TC-BUSCTRL-02: slave 1; chk rx=0xBB and cs0_n=1, cs2_n=1',
        'TC-BUSCTRL-03: slave 2; chk rx=0xCC and cs0_n=1, cs1_n=1',
        '🎓 Portfolio piece — push this to your GitHub when complete',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines and the final message should appear',
      ],
      hint:
`DESIGN NOTES for the bus controller testbench

Slave models (always_ff inside module tb):
  Declare: logic [7:0] mon_s0_shift, mon_s1_shift, mon_s2_shift;
  Declare: logic mon_sclk_prev, mon_cs0_prev, mon_cs1_prev, mon_cs2_prev;

  always_ff @(posedge clk) begin
    mon_sclk_prev <= sclk;
    mon_cs0_prev  <= cs0_n;
    mon_cs1_prev  <= cs1_n;
    mon_cs2_prev  <= cs2_n;
  end

  Slave 0 (returns 0xAA):
    always_ff @(posedge clk) begin
      if (~cs0_n & mon_cs0_prev) mon_s0_shift <= 8'hAA;
      else if (~sclk & mon_sclk_prev & ~cs0_n) mon_s0_shift <= {mon_s0_shift[6:0], 1'b0};
    end
    assign miso0 = cs0_n ? 1'b0 : mon_s0_shift[7];

  Slave 1 (returns 0xBB): same pattern, cs1_n / 8'hBB / miso1
  Slave 2 (returns 0xCC): same pattern, cs2_n / 8'hCC / miso2

drv_start_xfer task:
  task automatic drv_start_xfer(input logic [1:0] dev, input logic [7:0] tx);
    dev_sel = dev; tx_data = tx; start = 1'b1;
    @(posedge clk); #1; start = 1'b0;
    repeat(150) @(posedge clk); #1;
  endtask

chk_rx_data task:
  task automatic chk_rx_data(input logic [7:0] actual, input logic [7:0] expected,
                              input logic [1:0] slave_id);
    if (actual === expected)
      $display("PASS  slave %0d returned 0x%0h", slave_id, actual);
    else
      $display("FAIL  slave %0d: rx=0x%0h expected 0x%0h", slave_id, actual, expected);
  endtask

chk_cs_exclusive task:
  task automatic chk_cs_exclusive(input logic cs0, cs1, cs2, input logic [1:0] exp_low);
    logic ok;
    ok = (cs0 === (exp_low != 2'd0)) &&
         (cs1 === (exp_low != 2'd1)) &&
         (cs2 === (exp_low != 2'd2));
    if (ok) $display("PASS  CS_N routing correct for slave %0d", exp_low);
    else    $display("FAIL  CS_N mux wrong: cs0=%0b cs1=%0b cs2=%0b", cs0, cs1, cs2);
  endtask

Test sequence:
  TC-BUSCTRL-01: drv_start_xfer(2'd0, 8'h00);
                 chk_rx_data(rx_data, 8'hAA, 2'd0);
                 chk_cs_exclusive(cs0_n, cs1_n, cs2_n, 2'd0);
  TC-BUSCTRL-02: drv_start_xfer(2'd1, 8'h00);
                 chk_rx_data(rx_data, 8'hBB, 2'd1);
  TC-BUSCTRL-03: drv_start_xfer(2'd2, 8'h00);
                 chk_rx_data(rx_data, 8'hCC, 2'd2);`,
      design:
`\`timescale 1ns/1ps
module tb;
  // --- clock ---
  logic clk = 0;
  always #5 clk = ~clk;

  // --- spi_bus_ctrl ports ---
  logic       rst, start, busy, done;
  logic [1:0] dev_sel;
  logic [7:0] tx_data, rx_data;
  logic       mosi, sclk;
  logic       cs0_n, cs1_n, cs2_n;
  logic       miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // --- MON: three slave models (always_ff) ---
  // Each model: pre-load unique byte on CS fall, shift left on sclk fall
  // slave 0 → 0xAA, slave 1 → 0xBB, slave 2 → 0xCC
  // assign miso0/1/2 from shift register MSB (0 when CS deasserted)

  // --- drv_ / chk_ tasks ---
  // drv_start_xfer(dev, tx): pulse start, wait 150 clocks
  // chk_rx_data(actual, expected, slave_id): PASS/FAIL
  // chk_cs_exclusive(cs0, cs1, cs2, exp_low): verify only one CS_N is low

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC-BUSCTRL-01: slave 0 (0xAA)
    // TC-BUSCTRL-02: slave 1 (0xBB)
    // TC-BUSCTRL-03: slave 2 (0xCC)

    $display("Multi-peripheral SPI bus controller testbench complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_master (
  input  logic       clk, rst, start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;
    if (rst) begin
      busy <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_data;
      bit_cnt  <= 0;
      phase    <= 2'd3;
    end else if (busy) begin
      phase <= phase + 1;
      unique case (phase)
        2'd0: begin
          sclk_r   <= 1;
          rx_shift <= {rx_shift[6:0], miso};
        end
        2'd1: ;
        2'd2: begin
          sclk_r <= 0;
          if (bit_cnt == 3'd7) begin
            cs_n    <= 1;
            rx_data <= {rx_shift[6:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[6:0], 1'b0};
          end
        end
        2'd3: ;
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];
endmodule

module spi_bus_ctrl (
  input  logic       clk, rst, start,
  input  logic [1:0] dev_sel,
  input  logic [7:0] tx_data,
  input  logic       miso0, miso1, miso2,
  output logic       mosi, sclk,
  output logic       cs0_n, cs1_n, cs2_n,
  output logic       busy, done,
  output logic [7:0] rx_data
);
  logic       master_cs_n, master_mosi, master_sclk;
  logic       miso_in;
  logic [1:0] dev_sel_r;

  always_ff @(posedge clk) begin
    if (rst)        dev_sel_r <= 2'd0;
    else if (start) dev_sel_r <= dev_sel;
  end

  spi_master master_inst (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso_in),
    .mosi(master_mosi), .sclk(master_sclk),
    .cs_n(master_cs_n), .busy(busy),
    .done(done), .rx_data(rx_data)
  );

  assign cs0_n = (dev_sel_r == 2'd0) ? master_cs_n : 1'b1;
  assign cs1_n = (dev_sel_r == 2'd1) ? master_cs_n : 1'b1;
  assign cs2_n = (dev_sel_r == 2'd2) ? master_cs_n : 1'b1;

  assign miso_in = (dev_sel_r == 2'd0) ? miso0 :
                   (dev_sel_r == 2'd1) ? miso1 : miso2;

  assign mosi = master_mosi;
  assign sclk = master_sclk;
endmodule`,
      expected: [
        'PASS  slave 0 returned 0xaa',
        'PASS  slave 1 returned 0xbb',
        'PASS  slave 2 returned 0xcc',
        'Multi-peripheral SPI bus controller testbench complete.'
      ]
    }

  ] // end lessons
});
