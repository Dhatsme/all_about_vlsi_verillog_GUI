(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi5',
  title: 'Bonus: Advanced SPI Applications',
  icon: '🎓',
  level: 'advanced',
  lessons: [

    // ─── L1: SPI ADC Emulator (Tier 4 — behaviour spec) ─────────────────────
    {
      id: 'spi5l1',
      title: 'L1 — SPI ADC Emulator',
      theory: `
<h2>How ADC Chips Talk SPI</h2>
<p>Analog-to-Digital Converters (ADCs) are some of the most common SPI peripherals in
embedded systems — they convert a voltage (temperature, pressure, light level) into
a digital number that your microcontroller can process.
Chips like the MCP3204, ADS1115, and MAX11612 all use SPI as their interface.</p>

<p>The SPI protocol for a read-only ADC is the simplest possible transaction:
the master asserts CS_N, clocks out 8 SCLK pulses, and the ADC chip drives MISO
with the conversion result — MSB first. The master does not send any meaningful data
on MOSI (the ADC ignores it). When CS_N deasserts, the transaction is complete.</p>

<h3>The pre-load trick</h3>
<p>Real ADCs latch the conversion result into an internal shift register the moment CS_N
falls. By the time the first SCLK edge arrives, the value is already queued up and
just shifts out one bit at a time. This is identical to the <code>cs_n_fall</code>
pre-load pattern from spi3 L2.</p>

<pre class="code-block">// When CS_N falls, capture the current ADC value
if (cs_n_fall) tx_shift &lt;= adc_val;

// Shift out MSB first on each SCLK falling edge
if (sclk_fall) tx_shift &lt;= {tx_shift[6:0], 1'b0};

assign miso = cs_n ? 1'b0 : tx_shift[7];
</pre>

<h3>What adc_val represents</h3>
<p><code>adc_val[7:0]</code> is an input port — in a real design it would come from
the actual analog conversion hardware inside the chip.
In your simulation testbench you simply drive it with a known value
and verify the master reads it back correctly.</p>

<h3>ADC transaction waveform</h3>
<table class="truth-table">
<tr><th>CS_N</th><th>SCLK edges</th><th>MISO</th><th>Note</th></tr>
<tr><td>1→0</td><td>—</td><td>0</td><td>tx_shift pre-loaded with adc_val</td></tr>
<tr><td>0</td><td>1st</td><td>adc_val[7]</td><td>MSB out</td></tr>
<tr><td>0</td><td>2nd</td><td>adc_val[6]</td><td></td></tr>
<tr><td>0</td><td>…</td><td>…</td><td></td></tr>
<tr><td>0</td><td>8th</td><td>adc_val[0]</td><td>LSB out</td></tr>
<tr><td>0→1</td><td>—</td><td>0</td><td>transaction ends</td></tr>
</table>

<h3>Why this pattern matters</h3>
<p>Once you understand the ADC slave side, using it from a master is mechanical:
assert CS_N, send 8 SCLK pulses, capture 8 MISO bits, deassert CS_N.
The spi_master from spi2 L2 already does exactly this — point it at your ADC
emulator and the value comes back in <code>rx_data</code> automatically.</p>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Width</th><th>Purpose</th></tr>
<tr><td>clk</td><td>in</td><td>1</td><td>System clock</td></tr>
<tr><td>rst</td><td>in</td><td>1</td><td>Active-high synchronous reset</td></tr>
<tr><td>cs_n</td><td>in</td><td>1</td><td>Chip Select — LOW = master is reading</td></tr>
<tr><td>sclk</td><td>in</td><td>1</td><td>SPI clock from master</td></tr>
<tr><td>adc_val</td><td>in</td><td>8</td><td>Conversion result to send to master</td></tr>
<tr><td>miso</td><td>out</td><td>1</td><td>Serial output — adc_val shifted out MSB first</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and build it. Stuck? Tap 💡 Show Hint for an annotated solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_adc_slave with ports: clk, rst, cs_n, sclk, adc_val[7:0], miso',
        'Declare internal signals: tx_shift[7:0], sclk_prev, sclk_fall, cs_n_prev, cs_n_fall',
        'Write always_ff registers for sclk_prev and cs_n_prev',
        'Write assigns for sclk_fall and cs_n_fall',
        'Write the main always_ff block:',
        '  — rst: clear tx_shift',
        '  — cs_n_fall: pre-load tx_shift <= adc_val',
        '  — sclk_fall: shift tx_shift left, pad 1\'b0 at LSB',
        'Add assign miso = cs_n ? 1\'b0 : tx_shift[7]',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
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
      tx_shift <= adc_val;              // latch value when master selects us
    else if (sclk_fall)
      tx_shift <= {tx_shift[6:0], 1'b0}; // shift MSB out each falling edge
  end

  assign miso = cs_n ? 1'b0 : tx_shift[7];

endmodule`,
      design:
`// Build the spi_adc_slave module here. See Theory for the spec.
//
// Ports: clk, rst, cs_n, sclk, adc_val[7:0], miso
//
// Delete this comment and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, miso;
  logic [7:0] adc_val;

  spi_adc_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n),
    .sclk(sclk), .adc_val(adc_val), .miso(miso)
  );

  // Capture 8 MISO bits during an ADC read — unrolled
  task automatic adc_read(output logic [7:0] result);
    cs_n = 0; repeat(2) @(posedge clk); #1;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[7] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[6] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[5] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[4] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[3] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[2] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[1] = miso;
    sclk = 0; repeat(4) @(posedge clk); #1; sclk = 1; repeat(4) @(posedge clk); #1; result[0] = miso;
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] reading;

  initial begin
    $display("=== SPI ADC Emulator Test ===");
    rst = 1; cs_n = 1; sclk = 0; adc_val = 8'h00;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Read back 0xA5
    adc_val = 8'hA5;
    adc_read(reading);
    if (reading === 8'hA5)
      $display("PASS  adc_val=0xA5 -> master read 0x%02h", reading);
    else
      $display("FAIL  expected 0xA5 got 0x%02h", reading);

    // Read back 0x3C
    adc_val = 8'h3C;
    adc_read(reading);
    if (reading === 8'h3C)
      $display("PASS  adc_val=0x3C -> master read 0x%02h", reading);
    else
      $display("FAIL  expected 0x3C got 0x%02h", reading);

    // MISO must be 0 when cs_n=1
    if (miso === 1'b0)
      $display("PASS  MISO=0 when cs_n deasserted");
    else
      $display("FAIL  MISO not 0 when idle");

    $display("SPI ADC emulator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  adc_val=0xA5',
        'PASS  adc_val=0x3C',
        'PASS  MISO=0 when cs_n deasserted',
        'SPI ADC emulator works!'
      ]
    },

    // ─── L2: SPI Flash Memory Emulator (Tier 5 — portfolio) ─────────────────
    {
      id: 'spi5l2',
      title: 'L2 — SPI Flash Memory Emulator',
      theory: `
<h2>Flash Memory Over SPI — How Storage Chips Work</h2>
<p>SPI flash memory chips (W25Q series, AT25 series, MX25L series) are everywhere:
boot ROMs in routers, configuration storage in FPGAs, firmware on microcontrollers.
They all use the same command-based SPI protocol: the master sends a 1-byte command,
optionally followed by an address and data, and the flash responds accordingly.</p>

<p>This lesson implements a simplified SPI flash slave with three commands.
Building this teaches the most important SPI pattern: a <strong>multi-phase state machine</strong>
where the meaning of each byte depends on what came before it.</p>

<h3>The three commands</h3>
<table class="truth-table">
<tr><th>Command byte</th><th>Name</th><th>Following bytes</th><th>Response</th></tr>
<tr><td>0x03</td><td>READ</td><td>1 byte address</td><td>mem[addr] on MISO during 3rd byte</td></tr>
<tr><td>0x02</td><td>WRITE</td><td>1 byte address, 1 byte data</td><td>stores data at mem[addr]</td></tr>
<tr><td>0x05</td><td>READ_STATUS</td><td>none</td><td>returns 0x00 (ready) on MISO during 2nd byte</td></tr>
</table>

<h3>The four-state machine</h3>
<pre class="code-block">// states: 0=CMD, 1=ADDR, 2=DATA_TX (read), 3=DATA_RX (write)
//
// CS_N falls → reset to CMD state, bit_cnt=0
//
// End of CMD byte (bit_cnt==7, state==CMD):
//   0x03 → state=ADDR,    rw=1 (read)
//   0x02 → state=ADDR,    rw=0 (write)
//   0x05 → state=DATA_TX, pre-load tx_shift=8'h00 (status=ready)
//
// End of ADDR byte (state==ADDR):
//   rw=1 → state=DATA_TX, pre-load tx_shift = mem[addr]
//   rw=0 → state=DATA_RX
//
// End of DATA byte (state==DATA_RX):
//   write received byte into mem[addr]
</pre>

<h3>New concept: memory arrays</h3>
<p>This module uses a small memory array — a construct you will study in depth in msv5.
Here is the syntax with a brief explanation so you can use it now:</p>

<pre class="code-block">// Declare a 16-element array, each element 8 bits wide
logic [7:0] mem [0:15];

// Read: just index it like a variable
tx_shift &lt;= mem[addr];

// Write: assign to the indexed element
mem[addr] &lt;= rx_byte;
</pre>

<p><code>logic [7:0] mem [0:15]</code> means: 16 slots (addresses 0 through 15),
each slot holding an 8-bit value. Reads are combinational; writes use <code>&lt;=</code>
inside <code>always_ff</code>. Think of it as 16 named registers where the name
is a number rather than a word.</p>

<h3>Pre-loading for reads</h3>
<p>As with the ADC and register file: for a READ command, pre-load <code>tx_shift</code>
with <code>mem[addr]</code> at the end of the ADDR byte, before the first SCLK edge
of the data phase. The value then shifts out automatically.</p>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>Clock and reset</td></tr>
<tr><td>cs_n, sclk, mosi</td><td>in</td><td>SPI bus inputs</td></tr>
<tr><td>miso</td><td>out</td><td>Serial data back to master</td></tr>
<tr><td>wr_valid</td><td>out</td><td>Pulses when a WRITE completes</td></tr>
<tr><td>wr_addr[3:0]</td><td>out</td><td>Address of completed write (0–15)</td></tr>
<tr><td>wr_data[7:0]</td><td>out</td><td>Data of completed write</td></tr>
</table>

<p>🎓 <strong>Portfolio piece</strong> — a working SPI flash emulator is a strong addition
to a hardware portfolio and a common FPGA interview topic.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build it. See 💡 Show Hint for the design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_flash_slave with ports: clk, rst, cs_n, sclk, mosi, miso, wr_valid, wr_addr[3:0], wr_data[7:0]',
        'Declare the memory array: logic [7:0] mem [0:15]',
        'Declare internal signals: shift_reg[7:0], tx_shift[7:0], bit_cnt[2:0], state[1:0], addr[3:0], rw',
        'Declare and assign edge detection signals: sclk_rise, sclk_fall, cs_n_fall',
        'On rst: clear all registers and zero out mem[0]..mem[15] individually',
        'On cs_n_fall: state=CMD(0), bit_cnt=0',
        'On sclk_rise: shift MOSI into shift_reg, increment bit_cnt',
        'On sclk_fall: shift tx_shift left',
        'On 8th edge of CMD state: decode command (0x03→READ, 0x02→WRITE, 0x05→STATUS)',
        'On 8th edge of ADDR state: save address; if READ pre-load tx_shift=mem[addr]; advance state',
        'On 8th edge of DATA_RX state: write received byte to mem[addr], pulse wr_valid',
        'Add assign miso = cs_n ? 1\'b0 : tx_shift[7]',
        '🎓 Portfolio piece — push this to your GitHub when complete',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for spi_flash_slave

State encoding:
  2'd0 = CMD       — waiting for command byte
  2'd1 = ADDR      — waiting for address byte
  2'd2 = DATA_TX   — shifting out data on MISO (read or status)
  2'd3 = DATA_RX   — receiving data on MOSI (write)

Internal signals:
  logic [7:0] mem [0:15];        // 16-byte memory
  logic [7:0] shift_reg;         // MOSI receive shift register
  logic [7:0] tx_shift;          // MISO transmit shift register
  logic [2:0] bit_cnt;           // 0-7
  logic [1:0] state;
  logic [3:0] addr;              // 4 bits = 0..15
  logic       rw;                // 1=read (0x03), 0=write (0x02)

Edge detection (same as spi3):
  always_ff @(posedge clk) sclk_prev <= sclk;
  always_ff @(posedge clk) cs_n_prev <= cs_n;
  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk &  sclk_prev;
  assign cs_n_fall = ~cs_n &  cs_n_prev;

Main always_ff:
  Reset: zero all registers.
         mem[0]..mem[15] <= 8'h00; (16 lines)

  On cs_n_fall: state<=CMD; bit_cnt<=0;

  On sclk_rise:
    shift_reg <= {shift_reg[6:0], mosi};
    bit_cnt   <= bit_cnt + 1;

  On sclk_fall:
    tx_shift <= {tx_shift[6:0], 1'b0};

  When sclk_rise AND bit_cnt==7 (8th edge, end of byte):

    State CMD:
      if shift_reg[6:0]+mosi == 0x03: rw<=1; state<=ADDR;
      if shift_reg[6:0]+mosi == 0x02: rw<=0; state<=ADDR;
      if shift_reg[6:0]+mosi == 0x05: state<=DATA_TX; tx_shift<=8'h00; (status=ready)
      bit_cnt <= 0;
      (use {shift_reg[6:0], mosi} for the full received byte)

    State ADDR:
      addr <= {shift_reg[2:0], mosi};   // bottom 4 bits
      if rw: tx_shift <= mem[{shift_reg[2:0], mosi}];  // pre-load for read
             state <= DATA_TX;
      else:  state <= DATA_RX;
      bit_cnt <= 0;

    State DATA_RX:
      mem[addr] <= {shift_reg[6:0], mosi};
      wr_addr   <= addr;
      wr_data   <= {shift_reg[6:0], mosi};
      wr_valid  <= 1;
      state <= CMD; bit_cnt <= 0;
    (DATA_TX needs no action — shifting happens on sclk_fall already)

  Default: wr_valid <= 0;

Output:
  assign miso = cs_n ? 1'b0 : tx_shift[7];`,
      design:
`// Build the spi_flash_slave module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic       rst, cs_n, sclk, mosi, miso, wr_valid;
  logic [3:0] wr_addr;
  logic [7:0] wr_data;

  spi_flash_slave dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // send 8 bits MSB first
  task automatic send8(input logic [7:0] d);
    mosi = d[7]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[6]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[5]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[4]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[3]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[2]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[1]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
    mosi = d[0]; sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1;
  endtask

  // receive 8 bits MSB first on MISO
  task automatic recv8(output logic [7:0] d);
    mosi = 0;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[7]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[6]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[5]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[4]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[3]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[2]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[1]=miso;
    sclk=0; repeat(4) @(posedge clk); #1; sclk=1; repeat(4) @(posedge clk); #1; d[0]=miso;
  endtask

  task automatic flash_write(input logic [3:0] a, input logic [7:0] d);
    cs_n=0; repeat(2) @(posedge clk); #1;
    send8(8'h02);                        // WRITE command
    send8({4'b0, a});                    // address
    send8(d);                            // data
    sclk=0; repeat(2) @(posedge clk); #1;
    cs_n=1; repeat(4) @(posedge clk); #1;
  endtask

  task automatic flash_read(input logic [3:0] a, output logic [7:0] d);
    cs_n=0; repeat(2) @(posedge clk); #1;
    send8(8'h03);                        // READ command
    send8({4'b0, a});                    // address
    recv8(d);                            // receive data
    sclk=0; repeat(2) @(posedge clk); #1;
    cs_n=1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] read_back;
  logic       wr_seen;
  always_ff @(posedge clk) if (wr_valid) wr_seen <= 1;

  initial begin
    $display("=== SPI Flash Emulator Test ===");
    rst=1; cs_n=1; sclk=0; mosi=0; wr_seen=0;
    repeat(4) @(posedge clk); #1;
    rst=0;

    // Write 0xBE to address 7
    flash_write(4'd7, 8'hBE);
    if (wr_seen && wr_addr===4'd7 && wr_data===8'hBE)
      $display("PASS  WRITE addr=7 data=0xBE wr_valid pulsed");
    else
      $display("FAIL  WRITE failed: wr_valid=%0b addr=%0d data=0x%02h",
               wr_seen, wr_addr, wr_data);

    // Read back address 7 — should return 0xBE
    flash_read(4'd7, read_back);
    if (read_back === 8'hBE)
      $display("PASS  READ addr=7 -> 0x%02h", read_back);
    else
      $display("FAIL  READ addr=7 -> 0x%02h expected 0xBE", read_back);

    // Write 0x42 to address 3, read back
    flash_write(4'd3, 8'h42);
    flash_read(4'd3, read_back);
    if (read_back === 8'h42)
      $display("PASS  READ addr=3 -> 0x%02h", read_back);
    else
      $display("FAIL  READ addr=3 -> 0x%02h expected 0x42", read_back);

    $display("SPI flash emulator works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  WRITE addr=7 data=0xBE wr_valid pulsed',
        'PASS  READ addr=7',
        'PASS  READ addr=3',
        'SPI flash emulator works!'
      ]
    },

    // ─── L3: Multi-Peripheral Bus Controller (Tier 5 — portfolio) ───────────
    {
      id: 'spi5l3',
      title: 'L3 — Portfolio: Multi-Peripheral SPI Bus Controller',
      theory: `
<h2>One Master, Many Slaves — The Real Bus</h2>
<p>In every real embedded system, a single SPI master talks to multiple peripherals:
the application processor might simultaneously manage a flash chip, an ADC, and a
display controller — all on the same MOSI/MISO/SCLK wires.
The only thing that changes per device is <strong>which CS_N line is asserted</strong>.</p>

<p>MOSI, MISO, and SCLK are shared — every device hears every transaction.
But only the device whose CS_N is LOW will respond.
All others ignore the clock and hold MISO at zero (or tri-state it in discrete hardware;
in FPGA designs we use <code>1'b0</code> as you know).</p>

<h3>The architecture</h3>
<pre class="code-block">         ┌─────────────────┐
start →  │  spi_bus_ctrl   │
dev_sel→ │                 │── mosi ──────────────── (all slaves)
tx_data→ │  (wraps         │── sclk ──────────────── (all slaves)
         │   spi_master)   │── cs0_n ───────────────  slave 0 only
rx_data← │                 │── cs1_n ───────────────  slave 1 only
done ←   │                 │── cs2_n ───────────────  slave 2 only
         └─────────────────┘   miso ←── mux ← slave[dev_sel]
</pre>

<h3>CS_N routing — assert only the selected slave</h3>
<p>The internal <code>spi_master</code> produces a single <code>master_cs_n</code> output.
You route it to the correct external CS_N pin using ternary logic,
while holding all others HIGH (deasserted):</p>

<pre class="code-block">assign cs0_n = (dev_sel == 2'd0) ? master_cs_n : 1'b1;
assign cs1_n = (dev_sel == 2'd1) ? master_cs_n : 1'b1;
assign cs2_n = (dev_sel == 2'd2) ? master_cs_n : 1'b1;
</pre>

<h3>MISO routing — read from the selected slave</h3>
<p>Each slave drives its own MISO. You select which one to pass to the master
using a ternary multiplexer:</p>

<pre class="code-block">assign miso_in = (dev_sel == 2'd0) ? miso0 :
                 (dev_sel == 2'd1) ? miso1 : miso2;
</pre>

<p>Register <code>dev_sel</code> at the moment <code>start</code> is asserted and hold it
stable for the entire transaction — if it changes mid-transfer the routing breaks.
Use a registered copy: <code>always_ff: if (start) dev_sel_r &lt;= dev_sel;</code></p>

<h3>Why this matters in practice</h3>
<p>This exact pattern appears in every hardware abstraction layer (HAL) ever written.
Whether it is a Linux SPI driver, an Arduino SPI library, or bare-metal embedded C,
the underlying hardware does exactly what you are building here:
assert one CS_N, transfer, deassert, done.</p>

<h3>The circuit you will build</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>System clock and reset</td></tr>
<tr><td>start</td><td>in</td><td>Begin transfer to selected device</td></tr>
<tr><td>dev_sel[1:0]</td><td>in</td><td>0=slave0, 1=slave1, 2=slave2</td></tr>
<tr><td>tx_data[7:0]</td><td>in</td><td>Byte to send</td></tr>
<tr><td>miso0, miso1, miso2</td><td>in</td><td>MISO from each slave</td></tr>
<tr><td>mosi, sclk</td><td>out</td><td>Shared bus outputs</td></tr>
<tr><td>cs0_n, cs1_n, cs2_n</td><td>out</td><td>Per-device chip selects</td></tr>
<tr><td>busy, done</td><td>out</td><td>Transfer status</td></tr>
<tr><td>rx_data[7:0]</td><td>out</td><td>Byte received from selected device</td></tr>
</table>

<p>🎓 <strong>Portfolio piece</strong> — multi-peripheral bus controllers appear in every
production embedded system. Completing spi1 through spi5 means you have built every layer
of the SPI stack from scratch.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build it. See 💡 Show Hint for the design notes.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_bus_ctrl with all ports from the Theory table',
        'Declare internal wires: master_cs_n, master_mosi, master_sclk, miso_in',
        'Declare logic [1:0] dev_sel_r — a registered copy of dev_sel',
        'In always_ff: if start, latch dev_sel_r <= dev_sel; this freezes device selection during the transfer',
        'Instantiate spi_master — connect master_cs_n, master_mosi, master_sclk, miso_in',
        'Write three assign lines routing master_cs_n to cs0_n/cs1_n/cs2_n based on dev_sel_r',
        'Write one assign mux routing the correct miso input to miso_in based on dev_sel_r',
        'Connect master mosi/sclk outputs directly to module outputs',
        '🎓 Portfolio piece — push this to your GitHub when complete',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines and the final message should appear',
      ],
      hint:
`DESIGN NOTES for spi_bus_ctrl

Internal signals:
  logic       master_cs_n, master_mosi, master_sclk, master_busy, master_done;
  logic [7:0] master_rx;
  logic       miso_in;
  logic [1:0] dev_sel_r;   // registered to stay stable during transfer

Latch dev_sel on start:
  always_ff @(posedge clk) begin
    if (rst)       dev_sel_r <= 2'd0;
    else if (start) dev_sel_r <= dev_sel;
  end

Instantiate spi_master:
  spi_master master_inst (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso_in),
    .mosi(master_mosi), .sclk(master_sclk),
    .cs_n(master_cs_n), .busy(busy),
    .done(done), .rx_data(rx_data)
  );

CS_N routing (hold unselected slaves HIGH):
  assign cs0_n = (dev_sel_r == 2'd0) ? master_cs_n : 1'b1;
  assign cs1_n = (dev_sel_r == 2'd1) ? master_cs_n : 1'b1;
  assign cs2_n = (dev_sel_r == 2'd2) ? master_cs_n : 1'b1;

MISO mux (route selected slave back to master):
  assign miso_in = (dev_sel_r == 2'd0) ? miso0 :
                   (dev_sel_r == 2'd1) ? miso1 : miso2;

Shared outputs (connect through directly):
  assign mosi = master_mosi;
  assign sclk = master_sclk;

Testbench tip:
  Three slave models each return a unique byte (0xAA, 0xBB, 0xCC).
  Select device 0, transfer, verify rx=0xAA.
  Select device 1, verify rx=0xBB.
  Select device 2, verify rx=0xCC.`,
      design:
`// Build the spi_bus_ctrl module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

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

  // ── Three simple slave models — each returns a unique byte ──
  // Slave 0 → 0xAA
  logic [7:0] s0_shift, s1_shift, s2_shift;
  logic sclk_prev, cs0_prev, cs1_prev, cs2_prev;
  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs0_prev  <= cs0_n;
    cs1_prev  <= cs1_n;
    cs2_prev  <= cs2_n;
  end
  logic sclk_fall_det;
  assign sclk_fall_det = ~sclk & sclk_prev;
  always_ff @(posedge clk) begin
    if (~cs0_n &  cs0_prev) s0_shift <= 8'hAA;
    else if (sclk_fall_det & ~cs0_n) s0_shift <= {s0_shift[6:0], 1'b0};
    if (~cs1_n &  cs1_prev) s1_shift <= 8'hBB;
    else if (sclk_fall_det & ~cs1_n) s1_shift <= {s1_shift[6:0], 1'b0};
    if (~cs2_n &  cs2_prev) s2_shift <= 8'hCC;
    else if (sclk_fall_det & ~cs2_n) s2_shift <= {s2_shift[6:0], 1'b0};
  end
  assign miso0 = cs0_n ? 1'b0 : s0_shift[7];
  assign miso1 = cs1_n ? 1'b0 : s1_shift[7];
  assign miso2 = cs2_n ? 1'b0 : s2_shift[7];

  task automatic do_xfer(input logic [1:0] dev, input logic [7:0] tx);
    dev_sel = dev; tx_data = tx; start = 1;
    @(posedge clk); #1; start = 0;
    repeat(150) @(posedge clk); #1;
  endtask

  initial begin
    $display("=== Multi-Peripheral SPI Bus Controller Test ===");
    rst=1; start=0; dev_sel=0; tx_data=0;
    repeat(2) @(posedge clk); #1;
    rst=0;

    do_xfer(2'd0, 8'h00);
    if (rx_data === 8'hAA && cs1_n===1'b1 && cs2_n===1'b1)
      $display("PASS  slave 0 returned 0xAA, others deasserted");
    else
      $display("FAIL  slave0: rx=0x%02h cs1_n=%0b cs2_n=%0b",
               rx_data, cs1_n, cs2_n);

    do_xfer(2'd1, 8'h00);
    if (rx_data === 8'hBB && cs0_n===1'b1 && cs2_n===1'b1)
      $display("PASS  slave 1 returned 0xBB, others deasserted");
    else
      $display("FAIL  slave1: rx=0x%02h cs0_n=%0b cs2_n=%0b",
               rx_data, cs0_n, cs2_n);

    do_xfer(2'd2, 8'h00);
    if (rx_data === 8'hCC && cs0_n===1'b1 && cs1_n===1'b1)
      $display("PASS  slave 2 returned 0xCC, others deasserted");
    else
      $display("FAIL  slave2: rx=0x%02h cs0_n=%0b cs1_n=%0b",
               rx_data, cs0_n, cs1_n);

    $display("Multi-peripheral SPI bus works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  slave 0 returned 0xAA',
        'PASS  slave 1 returned 0xBB',
        'PASS  slave 2 returned 0xCC',
        'Multi-peripheral SPI bus works!'
      ]
    }

  ] // end lessons
});
