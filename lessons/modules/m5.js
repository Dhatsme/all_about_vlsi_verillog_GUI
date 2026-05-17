// Module 5 — Real-World Protocols
// To edit this module, change only this file.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m5",
  title: "Real-World Protocols",
  icon: "📡",
  level: "advanced",
  lessons: [
    {
      id: "m5l1",
      title: "UART Transmitter",
      theory: `
<h2>UART — Universal Asynchronous Receiver/Transmitter</h2>
<p>UART is the most fundamental serial communication protocol. It's how your Arduino talks to your PC, how microcontrollers send debug output, how GPS modules send data.</p>

<h3>UART Frame</h3>
<pre>
IDLE  START  D0  D1  D2  D3  D4  D5  D6  D7  STOP
 1      0     ?   ?   ?   ?   ?   ?   ?   ?    1
</pre>
<ul>
  <li><strong>Idle</strong>: line stays HIGH</li>
  <li><strong>Start bit</strong>: always 0 (signals transmission start)</li>
  <li><strong>Data bits</strong>: 8 bits, LSB first</li>
  <li><strong>Stop bit</strong>: always 1</li>
  <li><strong>No clock line</strong> — both sides agree on baud rate beforehand</li>
</ul>

<h3>Baud Rate</h3>
<p>Common baud rates: 9600, 115200, 1MHz. Each bit lasts <code>clk_freq / baud_rate</code> clock cycles.</p>
<pre class="code-block">// For 9600 baud with 50MHz clock:
CLKS_PER_BIT = 50_000_000 / 9600 = 5208</pre>

<h3>Transmitter FSM</h3>
<p>States: IDLE → START → DATA (8 states or counter) → STOP → IDLE</p>
      `,
      tasks: ["Build a UART transmitter", "Send byte 0x55 (01010101)", "Observe start/stop bits in waveform"],
      hint: "Use a bit counter (0-7) and a baud counter. Move to next bit when baud counter hits CLKS_PER_BIT.",
      design: `module uart_tx #(
  parameter CLKS_PER_BIT = 5208  // 50MHz / 9600 baud
)(
  input  wire       clk, rst,
  input  wire       tx_valid,    // pulse to start transmission
  input  wire [7:0] tx_data,
  output reg        tx,           // serial output
  output reg        tx_busy       // high while transmitting
);

  localparam IDLE  = 3'd0,
             START = 3'd1,
             DATA  = 3'd2,
             STOP  = 3'd3;

  reg [2:0]  state = IDLE;
  reg [12:0] baud_cnt = 0;
  reg [2:0]  bit_idx  = 0;
  reg [7:0]  shift_reg;

  always @(posedge clk or posedge rst) begin
    if (rst) begin
      state <= IDLE; tx <= 1; tx_busy <= 0;
      baud_cnt <= 0; bit_idx <= 0;
    end else begin
      case (state)
        IDLE: begin
          tx <= 1; tx_busy <= 0;
          if (tx_valid) begin
            shift_reg <= tx_data;
            state     <= START;
            tx_busy   <= 1;
            baud_cnt  <= 0;
          end
        end

        START: begin
          tx <= 0;   // start bit
          if (baud_cnt == CLKS_PER_BIT-1) begin
            baud_cnt <= 0; bit_idx <= 0; state <= DATA;
          end else baud_cnt <= baud_cnt + 1;
        end

        DATA: begin
          tx <= shift_reg[bit_idx];
          if (baud_cnt == CLKS_PER_BIT-1) begin
            baud_cnt <= 0;
            if (bit_idx == 7) state <= STOP;
            else              bit_idx <= bit_idx + 1;
          end else baud_cnt <= baud_cnt + 1;
        end

        STOP: begin
          tx <= 1;   // stop bit
          if (baud_cnt == CLKS_PER_BIT-1) begin
            state <= IDLE; baud_cnt <= 0;
          end else baud_cnt <= baud_cnt + 1;
        end
      endcase
    end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg       clk=0,rst=1,tx_valid=0;
  reg [7:0] tx_data;
  wire      tx, tx_busy;

  // small CLKS_PER_BIT for fast simulation
  uart_tx #(10) dut(.clk(clk),.rst(rst),.tx_valid(tx_valid),
                    .tx_data(tx_data),.tx(tx),.tx_busy(tx_busy));

  always #5 clk=~clk;

  integer i;
  reg [9:0] frame;

  initial begin
    #12 rst=0;
    tx_data=8'h55; // 0101_0101
    $display("Sending 0x55 = 01010101");
    $display("Bit sequence (LSB first): start=0, d=10101010, stop=1");
    tx_valid=1; @(posedge clk); #1; tx_valid=0;

    // capture 10 bits (start + 8 data + stop)
    wait(tx==0);  // start bit
    $display("\\nCapturing serial stream:");
    for(i=0;i<10;i=i+1) begin
      // sample mid-bit
      repeat(5) @(posedge clk);
      $display("  bit[%0d] = %b", i, tx);
      repeat(5) @(posedge clk);
    end

    wait(!tx_busy);
    $display("\\nTransmission complete. tx_busy=%b",tx_busy);
    $finish;
  end
endmodule`,
      expected: ["bit[0] = 0", "Transmission complete"]
    },

    {
      id: "m5l2",
      title: "SPI Master Controller",
      theory: `
<h2>SPI — Serial Peripheral Interface</h2>
<p>SPI is a synchronous 4-wire protocol used for high-speed communication with sensors, ADCs, DACs, flash memory, and displays.</p>

<h3>SPI Signals</h3>
<ul>
  <li><code>SCLK</code> — Serial Clock (master generates)</li>
  <li><code>MOSI</code> — Master Out Slave In</li>
  <li><code>MISO</code> — Master In Slave Out</li>
  <li><code>CS_N</code> — Chip Select (active low)</li>
</ul>

<h3>SPI Modes (CPOL/CPHA)</h3>
<table class="truth-table">
  <tr><th>Mode</th><th>CPOL</th><th>CPHA</th><th>Clock idle</th><th>Sample edge</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>LOW</td><td>Rising</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>LOW</td><td>Falling</td></tr>
  <tr><td>2</td><td>1</td><td>0</td><td>HIGH</td><td>Falling</td></tr>
  <tr><td>3</td><td>1</td><td>1</td><td>HIGH</td><td>Rising</td></tr>
</table>

<h3>Transaction</h3>
<p>Assert CS_N low → clock out bits on MOSI while clocking in bits from MISO → deassert CS_N high.</p>
      `,
      tasks: ["Build SPI Mode 0 master", "Transmit and receive 8 bits simultaneously", "Observe CS/SCLK/MOSI timing"],
      hint: "Drive MOSI on falling SCLK edge, sample MISO on rising SCLK edge for Mode 0.",
      design: `module spi_master #(
  parameter CLK_DIV = 4,   // SCLK = clk / (2*CLK_DIV)
  parameter WIDTH   = 8
)(
  input  wire             clk, rst,
  input  wire             start,
  input  wire [WIDTH-1:0] tx_data,
  output reg  [WIDTH-1:0] rx_data,
  output reg              busy,
  output reg              sclk,
  output reg              mosi,
  input  wire             miso,
  output reg              cs_n
);

  reg [$clog2(CLK_DIV*2):0] clk_cnt;
  reg [3:0]                  bit_cnt;
  reg [WIDTH-1:0]            shift_out, shift_in;
  reg                        sclk_prev;

  always @(posedge clk or posedge rst) begin
    if (rst) begin
      busy<=0; sclk<=0; cs_n<=1; mosi<=0;
      clk_cnt<=0; bit_cnt<=0; rx_data<=0;
    end else begin
      sclk_prev <= sclk;

      if (!busy && start) begin
        busy      <= 1;
        cs_n      <= 0;
        shift_out <= tx_data;
        bit_cnt   <= WIDTH-1;
        clk_cnt   <= 0;
        sclk      <= 0;
      end else if (busy) begin
        if (clk_cnt == CLK_DIV-1) begin
          sclk    <= ~sclk;
          clk_cnt <= 0;
        end else clk_cnt <= clk_cnt + 1;

        // rising edge of sclk: sample MISO
        if (!sclk_prev && sclk) begin
          shift_in <= {shift_in[WIDTH-2:0], miso};
        end
        // falling edge of sclk: drive MOSI
        if (sclk_prev && !sclk) begin
          if (bit_cnt == 0) begin
            busy    <= 0;
            cs_n    <= 1;
            rx_data <= {shift_in[WIDTH-2:0], miso};
          end else begin
            mosi    <= shift_out[bit_cnt-1];
            bit_cnt <= bit_cnt - 1;
          end
        end
        if (!sclk && !sclk_prev && bit_cnt == WIDTH-1)
          mosi <= shift_out[WIDTH-1];  // first bit
      end
    end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  clk=0,rst=1,start=0;
  reg  [7:0] tx_data;
  wire [7:0] rx_data;
  wire       busy,sclk,mosi,cs_n;
  reg        miso=0;

  spi_master #(4,8) dut(.clk(clk),.rst(rst),.start(start),
    .tx_data(tx_data),.rx_data(rx_data),.busy(busy),
    .sclk(sclk),.mosi(mosi),.miso(miso),.cs_n(cs_n));

  always #5 clk=~clk;

  // simulate slave loopback: miso = mosi (echo)
  always @(*) miso = mosi;

  initial begin
    #12 rst=0;
    tx_data=8'hA5;
    $display("SPI Transfer: sending 0xA5");
    $display("CS_N SCLK MOSI MISO");
    start=1; @(posedge clk);#1; start=0;

    repeat(200) begin
      @(posedge clk);#1;
      if(!cs_n) $display("  %b    %b    %b    %b", cs_n,sclk,mosi,miso);
    end

    wait(!busy);
    $display("\\nSent: 0x%02h  Received: 0x%02h",tx_data,rx_data);
    $finish;
  end
endmodule`,
      expected: ["SPI Transfer", "Sent: 0xa5"]
    }
  ]
});
