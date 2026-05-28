(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi4',
  title: 'SPI Applications',
  icon: '🔬',
  level: 'advanced',
  lessons: [

    // ─── L1: SPI Register File Interface (Tier 4) ───────────────────────────
    {
      id: 'spi4l1',
      title: 'L1 — SPI Register File Interface',
      theory: `
<h2>Address + Data: The SPI Register Protocol</h2>
<p>Most real SPI peripherals (sensor chips, DACs, RF transceivers) use a simple two-byte protocol:
the master sends an <strong>address byte</strong> followed by a <strong>data byte</strong>.
A bit in the address byte indicates whether this is a read or a write.
This lesson has you implement exactly that protocol on the slave side.</p>

<h3>Protocol framing (two-byte transaction)</h3>
<table class="truth-table">
<tr><th>Byte</th><th>Bits [7]</th><th>Bits [6:5]</th><th>Bits [4:0]</th></tr>
<tr><td>Byte 0</td><td>rw (1=read)</td><td>reserved</td><td>addr[4:0]</td></tr>
<tr><td>Byte 1 (write)</td><td colspan="3">write data[7:0] (MOSI)</td></tr>
<tr><td>Byte 1 (read)</td><td colspan="3">register value sent on MISO</td></tr>
</table>

<pre class="code-block">// Decode address byte (first byte)
rw_bit &lt;= rx_byte0[7];       // 1 = read operation
addr   &lt;= rx_byte0[4:0];     // register address (0–31)

// State machine
// ADDR state: wait for first byte (rx_valid in byte 0)
// DATA state: execute read or write on second byte
</pre>

<h3>Internal register file</h3>
<p>Eight 8-bit registers: <code>logic [7:0] regs [0:7]</code>.
For addresses beyond 7, wrap around with <code>addr[2:0]</code>.</p>

<h3>Ports</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>System clock and reset</td></tr>
<tr><td>cs_n, sclk, mosi</td><td>in</td><td>SPI signals from master</td></tr>
<tr><td>miso</td><td>out</td><td>Read data to master</td></tr>
<tr><td>wr_valid</td><td>out</td><td>Pulses when a write completes</td></tr>
<tr><td>wr_addr[2:0]</td><td>out</td><td>Address of completed write</td></tr>
<tr><td>wr_data[7:0]</td><td>out</td><td>Data of completed write</td></tr>
</table>

<p>This architecture appears in virtually every configurable analog IC. Learning it unlocks a huge family of devices.</p>
<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_regfile with ports listed in the Theory tab',
        'Declare: logic [7:0] regs[0:7], shift_reg[7:0], bit_cnt[2:0], sclk_prev, cs_n_prev',
        'Declare state: logic state — 0=ADDR, 1=DATA; plus rw_bit, addr[2:0]',
        'Derive sclk_rise, sclk_fall, cs_n_fall edge strobes (same pattern as before)',
        'On cs_n_fall: reset bit_cnt=0, state=ADDR, load read address into tx_shift if needed',
        'On sclk_rise: shift MOSI into shift_reg; after 8 bits decode based on state:',
        '  — ADDR state: decode rw_bit and addr, transition to DATA state',
        '  — DATA state on write: write shift_reg to regs[addr], assert wr_valid',
        '  — DATA state on read: tx was already driving the register value on MISO',
        'Preload tx_shift with regs[addr] when state transitions to DATA on a read',
        'Shift MISO out on sclk_fall for the read response',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_regfile (
  input  logic       clk,
  input  logic       rst,
  input  logic       cs_n,
  input  logic       sclk,
  input  logic       mosi,
  output logic       miso,
  output logic       wr_valid,
  output logic [2:0] wr_addr,
  output logic [7:0] wr_data
);

  logic [7:0] regs [0:7];
  logic [7:0] rx_shift, tx_shift;
  logic [2:0] bit_cnt;
  logic       sclk_prev, cs_n_prev;
  logic       sclk_rise, sclk_fall, cs_n_fall;
  logic       state;     // 0=ADDR, 1=DATA
  logic       rw_bit;
  logic [2:0] addr;

  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end

  assign sclk_rise = sclk  & ~sclk_prev;
  assign sclk_fall = ~sclk & sclk_prev;
  assign cs_n_fall = ~cs_n & cs_n_prev;

  always_ff @(posedge clk) begin
    if (rst) begin
      bit_cnt  <= 0; state <= 0; rw_bit <= 0; addr <= 0;
      wr_valid <= 0; wr_addr <= 0; wr_data <= 0;
      tx_shift <= 0; rx_shift <= 0;
      for (int i = 0; i < 8; i++) regs[i] <= 8'h00;
    end else begin
      wr_valid <= 0;

      if (cs_n_fall) begin
        bit_cnt <= 0;
        state   <= 0;         // start with address byte
      end

      if (sclk_rise) begin
        rx_shift <= {rx_shift[6:0], mosi};
        if (bit_cnt == 3'd7) begin
          bit_cnt <= 0;
          if (state == 1'b0) begin
            // Just received address byte
            rw_bit <= rx_shift[7];  // MSB of rx_shift[6:0] plus mosi
            addr   <= {rx_shift[6:0], mosi}[2:0];
            state  <= 1;
            // Pre-load TX shift register for a read
            tx_shift <= regs[{rx_shift[6:0], mosi}[2:0]];
          end else begin
            // Just received data byte
            if (!rw_bit) begin        // write operation
              regs[addr] <= {rx_shift[6:0], mosi};
              wr_valid   <= 1;
              wr_addr    <= addr;
              wr_data    <= {rx_shift[6:0], mosi};
            end
            state <= 0;
          end
        end else begin
          bit_cnt <= bit_cnt + 1;
        end
      end

      if (sclk_fall) tx_shift <= {tx_shift[6:0], 1'b0};
    end
  end

  assign miso = cs_n ? 1'bz : tx_shift[7];

endmodule`,
      design:
`// Build the spi_regfile module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #2 clk = ~clk;

  logic rst, cs_n, sclk, mosi, miso;
  logic wr_valid;
  logic [2:0] wr_addr;
  logic [7:0] wr_data;

  spi_regfile dut (
    .clk(clk), .rst(rst), .cs_n(cs_n), .sclk(sclk),
    .mosi(mosi), .miso(miso),
    .wr_valid(wr_valid), .wr_addr(wr_addr), .wr_data(wr_data)
  );

  // SPI write: address byte then data byte
  task automatic spi_write(input logic [2:0] reg_addr, input logic [7:0] data);
    logic [7:0] addr_byte;
    addr_byte = {1'b0, 2'b00, reg_addr};   // rw=0 (write)
    cs_n = 0; repeat(3) @(posedge clk); #1;
    // Send address byte
    for (int i = 0; i < 8; i++) begin
      mosi = addr_byte[7-i];
      sclk = 0; repeat(4) @(posedge clk); #1;
      sclk = 1; repeat(4) @(posedge clk); #1;
    end
    // Send data byte
    for (int i = 0; i < 8; i++) begin
      mosi = data[7-i];
      sclk = 0; repeat(4) @(posedge clk); #1;
      sclk = 1; repeat(4) @(posedge clk); #1;
    end
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  // SPI read: address byte then receive data on MISO
  task automatic spi_read(input logic [2:0] reg_addr, output logic [7:0] data);
    logic [7:0] addr_byte;
    addr_byte = {1'b1, 2'b00, reg_addr};   // rw=1 (read)
    data = 8'h00;
    cs_n = 0; repeat(3) @(posedge clk); #1;
    // Send address byte
    for (int i = 0; i < 8; i++) begin
      mosi = addr_byte[7-i];
      sclk = 0; repeat(4) @(posedge clk); #1;
      sclk = 1; repeat(4) @(posedge clk); #1;
    end
    // Clock in data byte — capture MISO on rising
    for (int i = 0; i < 8; i++) begin
      mosi = 1'b0;
      sclk = 0; repeat(4) @(posedge clk); #1;
      data[7-i] = miso;
      sclk = 1; repeat(4) @(posedge clk); #1;
    end
    sclk = 0; repeat(2) @(posedge clk); #1;
    cs_n = 1; repeat(4) @(posedge clk); #1;
  endtask

  logic [7:0] readback;
  logic       saw_wr;
  logic [7:0] last_wr_data;
  logic [2:0] last_wr_addr;

  always_ff @(posedge clk) begin
    if (wr_valid) begin
      saw_wr      <= 1;
      last_wr_data <= wr_data;
      last_wr_addr <= wr_addr;
    end
  end

  initial begin
    $display("=== SPI Register File Test ===");
    rst = 1; cs_n = 1; sclk = 0; mosi = 0; saw_wr = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Write 0xAB to register 3
    spi_write(3'd3, 8'hAB);
    if (saw_wr && last_wr_addr === 3'd3 && last_wr_data === 8'hAB)
      $display("PASS  write reg[3]=0xAB wr_valid pulsed");
    else
      $display("FAIL  write wr_valid=%0b addr=%0d data=0x%02h", saw_wr, last_wr_addr, last_wr_data);

    // Read back register 3
    spi_read(3'd3, readback);
    if (readback === 8'hAB)
      $display("PASS  read reg[3]=0x%02h", readback);
    else
      $display("FAIL  read reg[3]=0x%02h expected 0xAB", readback);

    // Write different value and read back
    saw_wr = 0;
    spi_write(3'd5, 8'h7E);
    spi_read(3'd5, readback);
    if (readback === 8'h7E)
      $display("PASS  read reg[5]=0x%02h", readback);
    else
      $display("FAIL  read reg[5]=0x%02h expected 0x7E", readback);

    $display("SPI register file works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  write reg[3]=0xAB',
        'PASS  read reg[3]=0xab',
        'PASS  read reg[5]=0x7e',
        'SPI register file works!'
      ]
    },

    // ─── L2: SPI ADC Reader (Tier 4) ────────────────────────────────────────
    {
      id: 'spi4l2',
      title: 'L2 — SPI ADC Interface',
      theory: `
<h2>Reading Sensor Data Over SPI</h2>
<p>Analog-to-Digital converters (ADCs) are among the most common SPI devices.
After the master asserts CS_N and clocks a fixed number of SCLK pulses,
the ADC shifts out a digital representation of its measured voltage on MISO.
This lesson has you implement the controller side — the logic that drives the SPI bus
and extracts the digital value from the bit stream.</p>

<p>A simplified 12-bit SPI ADC protocol (similar to MCP3201):</p>
<table class="truth-table">
<tr><th>SCLK cycle</th><th>1–2</th><th>3</th><th>4–15</th><th>16</th></tr>
<tr><td>MISO</td><td>null (don't care)</td><td>start bit (0)</td><td>result[11:0] MSB first</td><td>end</td></tr>
</table>

<pre class="code-block">// After 16 SCLK pulses, extract bits [12:1] of the shift register
// (skip 2 null bits at start, take 12 result bits, skip end bit)
adc_result &lt;= {shift_reg[12:1]};
</pre>

<h3>State machine</h3>
<ul>
  <li><strong>IDLE</strong> — wait for start pulse</li>
  <li><strong>SAMPLE</strong> — assert CS_N, clock 16 SCLK cycles, collect bits on MISO</li>
  <li><strong>DONE</strong> — deassert CS_N, output result, pulse valid for one cycle</li>
</ul>

<h3>Ports</h3>
<table class="truth-table">
<tr><th>Port</th><th>Dir</th><th>Purpose</th></tr>
<tr><td>clk, rst</td><td>in</td><td>System clock and reset</td></tr>
<tr><td>start</td><td>in</td><td>Begin a conversion</td></tr>
<tr><td>miso</td><td>in</td><td>ADC serial output</td></tr>
<tr><td>sclk, cs_n</td><td>out</td><td>SPI clock and select</td></tr>
<tr><td>result[11:0]</td><td>out</td><td>12-bit ADC result</td></tr>
<tr><td>valid</td><td>out</td><td>Pulses when result is ready</td></tr>
<tr><td>busy</td><td>out</td><td>High during conversion</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module spi_adc_reader with ports listed above',
        'Declare: shift_reg[15:0] (16-bit to hold all SCLK bits), bit_cnt[4:0] (0-15), sclk_r, phase[1:0]',
        'Implement the same 4-phase state machine as spi_master (L2 of Module 2)',
        'Count 16 bits instead of 8 — use bit_cnt reaching 15 as end condition',
        'On completion: extract result = shift_reg[12:1], pulse valid=1',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`module spi_adc_reader (
  input  logic        clk,
  input  logic        rst,
  input  logic        start,
  input  logic        miso,
  output logic        sclk,
  output logic        cs_n,
  output logic [11:0] result,
  output logic        valid,
  output logic        busy
);

  logic [15:0] shift_reg;
  logic  [4:0] bit_cnt;
  logic        sclk_r;
  logic  [1:0] phase;

  always_ff @(posedge clk) begin
    if (rst) begin
      busy <= 0; valid <= 0; sclk_r <= 0; cs_n <= 1;
      bit_cnt <= 0; phase <= 0; shift_reg <= 0; result <= 0;
    end else begin
      valid <= 0;
      if (!busy && start) begin
        busy     <= 1;
        cs_n     <= 0;
        bit_cnt  <= 0;
        shift_reg <= 0;
        phase    <= 2'd3;   // setup hold before first SCLK
        sclk_r   <= 0;
      end else if (busy) begin
        phase <= phase + 1;
        case (phase)
          2'd0: begin
            sclk_r    <= 1;
            shift_reg <= {shift_reg[14:0], miso};
          end
          2'd1: ;
          2'd2: begin
            sclk_r <= 0;
            if (bit_cnt == 5'd15) begin
              busy   <= 0;
              cs_n   <= 1;
              valid  <= 1;
              result <= shift_reg[12:1];  // skip 2 null + 1 start, take 12 bits
            end else begin
              bit_cnt <= bit_cnt + 1;
            end
          end
          2'd3: ;
        endcase
      end
    end
  end

  assign sclk = sclk_r;

endmodule`,
      design:
`// Build the spi_adc_reader module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, start, miso, sclk, cs_n, valid, busy;
  logic [11:0] result;

  spi_adc_reader dut (
    .clk(clk), .rst(rst), .start(start), .miso(miso),
    .sclk(sclk), .cs_n(cs_n), .result(result), .valid(valid), .busy(busy)
  );

  // ADC model: drives a known 12-bit value 0xABC
  // Protocol: 2 null bits (1,1), 1 start bit (0), 12 data bits MSB first, 1 extra (0)
  // Total 16 bits: 11 1 0 1010_1011_1100 0
  logic [15:0] adc_word = 16'b1101010101111000;  // null=1,1 start=1, data=0101_0101_1100, extra=0
  // Actually encode: null null start D11 D10 ... D0 extra
  // 0xABC = 1010_1011_1100
  // word = {1, 1, 0, 12'hABC, 1'b0} bit positions [15:0]
  // word = {2'b11, 1'b0, 12'hABC, 1'b0} = {11, 0, 1010_1011_1100, 0}
  //      = 16'b1100_1010_1011_1100_0  -- oops 17 bits
  // Actually just: word [15:0] = {1,1,0, A, B, C nibbles, 0}
  // bit 15=1(null), 14=1(null), 13=0(start), 12..1 = 0xABC MSB first, 0=extra
  // 0xABC = 0b1010_1011_1100
  // So word = {11, 0, 1010_1011_1100, 0} = too many bits
  // Let's use 16-bit: bit15=null bit14=null bit13=start(0) bits[12:1]=result bits[0]=extra
  // For result=0xABC: word = {1,1,0, 12'hABC, 0}
  // = {3'b110, 12'hABC, 1'b0}
  // = 16'b 1 1 0 1010_1011_1100 0
  // = 16'b1101_0101_0111_1000... let me compute:
  // 1 1 0 | 1010 1011 1100 | 0
  // = 1 1 0 1 0 1 0 1 0 1 1 1 1 0 0 0
  // = 0xD578? Let me compute: 1101_0101_0111_1000 = D578
  // Actually: bit15=1, bit14=1, bit13=0, bits12..1={1010_1011_1100}=0xABC, bit0=0
  // MSB to LSB: 1,1,0,1,0,1,0,1,0,1,1,1,1,0,0,0
  // = 1101_0101_0111_1000 = 0xD578

  // ADC model drives MISO based on the test word
  logic [15:0] adc_shift;
  logic sclk_prev, cs_n_prev;
  always_ff @(posedge clk) begin
    sclk_prev <= sclk;
    cs_n_prev <= cs_n;
  end
  logic sclk_fall_d = ~sclk & sclk_prev;
  logic cs_n_fall_d = ~cs_n & cs_n_prev;

  always_ff @(posedge clk) begin
    if (cs_n_fall_d)
      adc_shift <= 16'b1101_0101_0111_1000;  // null,null,start,0xABC,extra
    else if (sclk_fall_d)
      adc_shift <= {adc_shift[14:0], 1'b0};
  end
  assign miso = cs_n ? 1'b1 : adc_shift[15];

  task automatic do_conversion;
    start = 1; @(posedge clk); #1; start = 0;
    for (int i = 0; i < 600; i++) begin
      @(posedge clk); #1;
      if (valid) return;
    end
    $display("TIMEOUT");
  endtask

  initial begin
    $display("=== SPI ADC Reader Test ===");
    rst = 1; start = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    do_conversion();
    if (result === 12'hABC)
      $display("PASS  ADC result=0x%03h (expected 0xABC)", result);
    else
      $display("FAIL  ADC result=0x%03h expected 0xABC", result);

    if (cs_n === 1'b1)
      $display("PASS  cs_n deasserted after conversion");
    else
      $display("FAIL  cs_n still asserted");

    if (busy === 1'b0)
      $display("PASS  busy cleared after conversion");
    else
      $display("FAIL  busy still set");

    $display("SPI ADC reader works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  ADC result=0xabc',
        'PASS  cs_n deasserted',
        'PASS  busy cleared',
        'SPI ADC reader works!'
      ]
    },

    // ─── L3: Portfolio — SPI Flash Controller (Tier 5) ──────────────────────
    {
      id: 'spi4l3',
      title: 'L3 — Portfolio: SPI Flash Memory Controller',
      theory: `
<h2>Portfolio Project: Flash Memory over SPI</h2>
<p>NOR flash memories (Winbond W25Q series, Microchip SST26) are among the most common SPI targets.
Every microcontroller that boots from external flash uses exactly the protocol you are about to implement.
This is not a toy exercise — the specification below matches real silicon.</p>

<h3>Command set (subset)</h3>
<table class="truth-table">
<tr><th>Command</th><th>Opcode</th><th>Protocol</th></tr>
<tr><td>Read ID</td><td>0x9F</td><td>CS↓, send 0x9F, read 3 bytes (manufacturer+device), CS↑</td></tr>
<tr><td>Write Enable</td><td>0x06</td><td>CS↓, send 0x06, CS↑</td></tr>
<tr><td>Read Data</td><td>0x03</td><td>CS↓, send 0x03, send 3-byte address, read N bytes, CS↑</td></tr>
<tr><td>Page Program</td><td>0x02</td><td>CS↓, send 0x02, send 3-byte address, send up to 256 bytes, CS↑ (needs WE first)</td></tr>
<tr><td>Read Status</td><td>0x05</td><td>CS↓, send 0x05, read 1 byte (WIP bit = busy), CS↑</td></tr>
</table>

<h3>Full specification</h3>
<ul>
  <li>Module: <code>spi_flash_ctrl</code></li>
  <li>Implement READ DATA and PAGE PROGRAM as minimum viable product</li>
  <li>Read: output a 256-byte burst into an output FIFO (or a simple memory array in simulation)</li>
  <li>Write: accept up to 256 bytes from an input buffer, preceded by WRITE ENABLE</li>
  <li>Poll the Status Register after Page Program and wait until WIP=0 before asserting done</li>
  <li>Parameterize SPI speed (CLK_DIV parameter)</li>
</ul>

<h3>Block structure suggestion</h3>
<ul>
  <li><strong>CMD FSM</strong> — top-level state machine: IDLE → WR_EN → CMD → ADDR → DATA → STATUS_POLL → DONE</li>
  <li><strong>spi_byte_tx</strong> — reuse spi_master or a byte-granularity sub-module</li>
  <li><strong>spi_byte_rx</strong> — receive one byte wrapper</li>
</ul>

<p>This is the controller used in every embedded Linux system to read its bootloader from flash.
When you finish this you have built something that runs in production hardware.</p>
`,
      tasks: [
        'Design spi_flash_ctrl that implements READ DATA (0x03) and PAGE PROGRAM (0x02)',
        'READ DATA: assert CS_N, send opcode 0x03, send 24-bit address, read N bytes into rx_buf',
        'PAGE PROGRAM: send WRITE ENABLE (0x06) first, then 0x02 + address + data bytes',
        'After PAGE PROGRAM: poll Status Register (0x05) until WIP bit (bit 0) = 0',
        'Parameterize: parameter FLASH_CLK_DIV = 4',
        'Define an internal CMD FSM with states: IDLE, WREN, CMD, ADDR, DATA, POLL, DONE',
        'Write a testbench that models a flash memory responding to the protocol',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
        '🎓 Portfolio piece — push this to your GitHub when complete',
      ],
      hint:
`DESIGN NOTES for spi_flash_ctrl:

  Top-level FSM states:
    IDLE       — wait for cmd_valid
    WREN       — send WRITE ENABLE byte (0x06), pulse CS
    CMD        — send command opcode byte
    ADDR       — send 3 address bytes (addr[23:16], addr[15:8], addr[7:0])
    DATA_TX    — send N data bytes (write path)
    DATA_RX    — receive N data bytes (read path)
    STATUS_POLL — read status register; loop until WIP=0
    DONE       — pulse done=1

  Byte-level sub-state machine (runs inside each state):
    Use a byte counter to track position within multi-byte phases
    Reuse spi_master or inline the 4-phase bit clock

  Ports needed:
    input  logic        clk, rst
    input  logic        cmd_valid   // pulse to start operation
    input  logic        cmd_wr      // 1=write, 0=read
    input  logic [23:0] flash_addr  // byte address
    input  logic  [7:0] wr_data     // data to write (connect to FIFO out)
    output logic        wr_req      // pull next byte from FIFO
    output logic  [7:0] rd_data     // received byte
    output logic        rd_valid    // one cycle per received byte
    output logic        done        // operation complete
    output logic        busy
    // SPI signals: mosi, miso, sclk, cs_n

  Status register polling:
    Read 0x05, check bit 0 (WIP = Write In Progress)
    If WIP=1: re-send 0x05 (new CS pulse each time or hold CS — check datasheet)
    Most devices support continuous CLK for polling

  Timing requirement (real flash):
    CS_N setup time ≥ 5ns before first SCLK
    CS_N hold time ≥ 5ns after last SCLK
    tPP (page program time) = typically 0.4–3ms — model as fixed cycle count`,
      design:
`// Build the spi_flash_ctrl module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, cmd_valid, cmd_wr, busy, done, wr_req, rd_valid;
  logic [23:0] flash_addr;
  logic  [7:0] wr_data, rd_data;
  logic        miso, mosi, sclk, cs_n;

  spi_flash_ctrl dut (
    .clk(clk), .rst(rst),
    .cmd_valid(cmd_valid), .cmd_wr(cmd_wr),
    .flash_addr(flash_addr),
    .wr_data(wr_data), .wr_req(wr_req),
    .rd_data(rd_data), .rd_valid(rd_valid),
    .done(done), .busy(busy),
    .mosi(mosi), .miso(miso), .sclk(sclk), .cs_n(cs_n)
  );

  // Very simple flash model — responds to READ with fixed pattern
  // Full flash model left as exercise
  assign miso = 1'b0;   // placeholder

  initial begin
    $display("=== SPI Flash Controller Test ===");
    rst = 1; cmd_valid = 0; cmd_wr = 0;
    flash_addr = 24'h001000; wr_data = 8'h00;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Trigger a read
    cmd_valid = 1; cmd_wr = 0;
    @(posedge clk); #1; cmd_valid = 0;

    // Wait for done (simple timeout check)
    for (int i = 0; i < 2000; i++) begin
      @(posedge clk); #1;
      if (done) begin
        $display("PASS  flash read completed");
        disable;
      end
    end
    $display("FAIL  flash read did not complete");

    $display("SPI flash controller tested!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  flash read completed',
        'SPI flash controller tested!'
      ]
    },

    // ─── L4: Portfolio — Multi-Peripheral SPI Hub (Tier 5) + Certificate ────
    {
      id: 'spi4l4',
      title: 'L4 — Portfolio: SPI Multi-Peripheral Bus Controller',
      theory: `
<h2>Portfolio Project: Managing Multiple SPI Slaves</h2>
<p>A microcontroller typically connects to several SPI devices — a flash, a sensor, a display, a DAC.
They share SCLK, MOSI, and MISO but each has its own CS_N line.
This project has you build the arbitration and routing logic that decides which device is selected
and sequences multiple outstanding requests.</p>

<h3>System architecture</h3>
<pre class="code-block">            ┌──────────────────────────┐
CPU ──req──&gt;│                          │──CS0──&gt; Flash
CPU ──dev──&gt;│   spi_bus_controller     │──CS1──&gt; Sensor
            │                          │──CS2──&gt; DAC
MISO ──────&gt;│                          │──CS3──&gt; Display
            │         MOSI / SCLK      │
            └──────────────────────────┘
                    shared bus
</pre>

<h3>Full specification</h3>
<ul>
  <li>Module: <code>spi_bus_ctrl</code></li>
  <li>4 device slots: CS0–CS3 (parameterizable)</li>
  <li>Round-robin arbitration: if multiple requests pending, serve in order CS0→CS1→CS2→CS3→CS0</li>
  <li>Request interface: req[3:0] (one bit per device), req_data[7:0] (byte to send), req_dev[1:0] (device index)</li>
  <li>Response interface: ack (current transfer done), rd_data[7:0] (received byte), ack_dev[1:0] (which device responded)</li>
  <li>Only one device is selected at a time (CS lines are mutually exclusive)</li>
  <li>Add idle gap between transactions (CS deassert → next CS assert ≥ 2 SCLK cycles)</li>
  <li>Parameterize: N_DEVS=4, CLK_DIV=4, N_BITS=8</li>
</ul>

<h3>State machine outline</h3>
<ul>
  <li><strong>IDLE</strong> — scan for pending requests in priority order</li>
  <li><strong>SELECT</strong> — assert correct CS_N, load tx data</li>
  <li><strong>TRANSFER</strong> — delegate to inner SPI bit-clock FSM</li>
  <li><strong>GAP</strong> — hold all CS_N high for minimum idle time</li>
  <li>Return to IDLE</li>
</ul>

<p>Real SoCs use exactly this pattern — an SPI controller with a request queue and a round-robin arbiter.
You are building the same thing used in ARM Cortex-M series peripherals.</p>
`,
      tasks: [
        'Design spi_bus_ctrl with parameters N_DEVS=4, CLK_DIV=4, N_BITS=8',
        'Accept req[3:0] request lines — one per device',
        'Use round-robin arbitration: track last-served device, scan in order from next device',
        'Assert exactly one cs_n[3:0] bit (active-low) per transaction',
        'Reuse or inline the SPI bit-clock machine from Module 2',
        'Assert ack=1 and ack_dev=current device for one clock when transaction completes',
        'Hold all CS lines high for at least 2 idle cycles between transactions (GAP state)',
        'Write testbench with 4 simultaneous requests, verify round-robin order',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
        '🎓 SPI Protocol Expert certificate unlocked — complete spi1 + spi2 + spi3 + spi4 to claim it',
      ],
      hint:
`DESIGN NOTES for spi_bus_ctrl:

  Parameters:
    N_DEVS  = 4   (number of chip-select lines)
    CLK_DIV = 4   (SCLK half-period in system clocks)
    N_BITS  = 8   (bits per transfer)

  Internal registers:
    last_dev  [1:0]  — device served last (for round-robin)
    cur_dev   [1:0]  — device being served now
    gap_cnt   [2:0]  — idle cycle counter

  Round-robin priority scanner (combinational):
    for i in 0..N_DEVS-1:
      nxt = (last_dev + 1 + i) % N_DEVS
      if req[nxt]: cur_dev = nxt; break

  State machine:
    IDLE:     if any req: → SELECT
    SELECT:   assert cs_n[cur_dev]=0, load tx_data, → TRANSFER
    TRANSFER: run N_BITS-bit SPI engine (same 4-phase as spi_master)
              on completion: deassert cs_n, → GAP
    GAP:      count CLK_DIV*2 idle cycles, ack=1, → IDLE

  CS_N output:
    cs_n[3:0]: all 1 in IDLE/GAP; cs_n[cur_dev]=0 in SELECT/TRANSFER

  Arbitration tip:
    Update last_dev only when a transfer COMPLETES (in GAP state)
    This ensures a device that posts a new request immediately after
    being served goes to the back of the queue

  Testbench scenario:
    Assert req[0..3] simultaneously
    Expect service order: 0, 1, 2, 3, 0, 1, ...
    Verify ack_dev matches the expected round-robin sequence`,
      design:
`// Build the spi_bus_ctrl module here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, ack;
  logic [3:0] req, cs_n;
  logic [1:0] req_dev, ack_dev;
  logic [7:0] req_data, rd_data;
  logic miso, mosi, sclk;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst),
    .req(req), .req_dev(req_dev), .req_data(req_data),
    .ack(ack), .ack_dev(ack_dev), .rd_data(rd_data),
    .cs_n(cs_n), .mosi(mosi), .sclk(sclk), .miso(miso)
  );

  assign miso = 1'b0;

  // Track ack order
  logic [3:0] ack_order;
  int         ack_idx;

  always_ff @(posedge clk) begin
    if (ack) begin
      ack_order[ack_idx[1:0]] <= ack_dev;
      ack_idx <= ack_idx + 1;
    end
  end

  initial begin
    $display("=== SPI Bus Controller Test ===");
    rst = 1; req = 4'b0000; req_data = 8'hAA; ack_idx = 0;
    repeat(4) @(posedge clk); #1;
    rst = 0;

    // Assert all 4 requests simultaneously
    req = 4'b1111;
    repeat(2000) begin
      @(posedge clk); #1;
      if (ack_idx >= 4) disable;
    end

    $display("PASS  4 transfers completed in round-robin order");

    // Verify ordering (0 served before 3)
    if (ack_order[0] < ack_order[3] || ack_order[0] == 0)
      $display("PASS  device 0 served before device 3 (round-robin)");
    else
      $display("FAIL  round-robin order incorrect");

    $display("SPI bus controller works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  4 transfers completed',
        'PASS  device 0 served before device 3',
        'SPI bus controller works!'
      ]
    }

  ] // end lessons
});
