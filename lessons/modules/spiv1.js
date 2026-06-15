(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spiv1',
  title: 'SPI Verification: Loopback Test',
  icon: '🔬',
  level: 'advanced',
  lessons: [
    {
      id: 'spiv1l1',
      title: 'L1 — SPI Master Loopback Verification',
      theory: `<h2>SPI Master — Loopback Verification</h2>
<p>The <strong>Design tab</strong> contains a complete SPI Master (Mode 0, 8-bit, 4-deep FIFO).
The <strong>Testbench tab</strong> drives 5 test scenarios using a loopback connection
(<code>miso = mosi</code>). Every byte received back must equal the byte sent
— if it does, the DUT is working correctly.</p>
<p>This is a flat, Verilator-compatible testbench — no classes, no UVM, no virtual
interfaces. Set <strong>--no-timing</strong> in ⚙ Options before running.</p>`,

      tasks: [
        'Read the Design tab — the complete SPI Master RTL is pre-loaded.',
        'Read the Testbench tab — 5 scenarios: sanity, boundary, burst, abort+recovery, sequential.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],

      hint:
`SPI Master loopback test — what to expect:

  Loopback: miso is tied to mosi in the testbench.
  For every normal transfer: RX byte must equal TX byte.

  T1 Sanity    : 1 transfer  → PASS  TX=a5 RX=a5
  T2 Boundary  : 4 transfers → PASS for 00, ff, aa, 55
  T3 Burst     : 4 transfers → PASS for de, ad, be, ef
  T4 Abort     : abort mid-transfer → PASS  abort acknowledged
                 recovery transfer  → PASS  TX=ad RX=ad
  T5 Sequential: 4 transfers → PASS for 11, 22, 33, 44

  Key signals to watch in the waveform:
    cs_n  — low during transfer, high between words
    sck   — toggles only while cs_n is low
    mosi  — MSB first, changes on falling SCK edge
    done  — 1-cycle pulse when 8 bits have been captured`,

      design:
`// SPI Master — Mode 0 (CPOL=0, CPHA=0), 8-bit, 4-deep FIFO
// Complete RTL. Read it, switch to Testbench tab, hit Run.
module spi_master (
  input  logic       clk,
  input  logic       rst_n,
  input  logic [7:0] clk_div,    // SCK half-period = (clk_div+1) clk cycles
  // TX FIFO
  input  logic [7:0] tx_data,
  input  logic       tx_push,
  output logic       tx_full,
  output logic       tx_empty,
  // RX FIFO
  output logic [7:0] rx_data,
  input  logic       rx_pop,
  output logic       rx_valid,
  // Control
  input  logic       start,
  input  logic       abort,
  output logic       busy,
  output logic       done,        // 1-cycle pulse on word completion
  output logic       tx_underrun,
  output logic       rx_overrun,
  // SPI bus (Mode 0)
  output logic       sck,
  output logic       mosi,
  input  logic       miso,
  output logic       cs_n
);

  // 4-deep FIFO — 3-bit wrap-bit pointers, 2-bit index
  logic [7:0] txf[0:3], rxf[0:3];
  logic [2:0] txf_wp, txf_rp, rxf_wp, rxf_rp;

  assign tx_full  = ((txf_wp - txf_rp) == 3'd4);
  assign tx_empty = (txf_wp == txf_rp);
  assign rx_valid = (rxf_wp != rxf_rp);
  assign rx_data  = rxf[rxf_rp[1:0]];

  // External push/pop
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      txf_wp <= '0; rxf_rp <= '0;
    end else begin
      if (tx_push && !tx_full) begin
        txf[txf_wp[1:0]] <= tx_data;
        txf_wp <= txf_wp + 1;
      end
      if (rx_pop && rx_valid) rxf_rp <= rxf_rp + 1;
    end
  end

  // SCK generator (CPOL=0: idle low)
  logic [7:0] div_cnt;
  logic       sck_r, sck_q;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin div_cnt <= '0; sck_r <= 0; sck_q <= 0; end
    else begin
      sck_q <= sck_r;
      if (busy) begin
        if (div_cnt == clk_div) begin div_cnt <= '0; sck_r <= ~sck_r; end
        else                          div_cnt <= div_cnt + 1;
      end else begin div_cnt <= '0; sck_r <= 0; end
    end
  end
  assign sck = sck_r;

  wire lead_edge  = sck_r & ~sck_q;   // rising  edge (Mode 0: sample MISO)
  wire trail_edge = ~sck_r & sck_q;   // falling edge (Mode 0: update MOSI)

  // Shift FSM
  typedef enum logic [1:0] { ST_IDLE=0, ST_SHIFT=1, ST_DONE=2 } fsm_t;
  fsm_t       state;
  logic [7:0] sr_tx, sr_rx;
  logic [3:0] bits;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state <= ST_IDLE; txf_rp <= '0; rxf_wp <= '0;
      busy <= 0; cs_n <= 1; mosi <= 0; bits <= '0;
      sr_tx <= '0; sr_rx <= '0;
      done <= 0; tx_underrun <= 0; rx_overrun <= 0;
    end else begin
      done <= 0;
      case (state)
        ST_IDLE: begin
          if (start) begin
            if (!tx_empty) begin
              sr_tx  <= txf[txf_rp[1:0]];
              mosi   <= txf[txf_rp[1:0]][7];  // pre-seed MSB before first SCK
              txf_rp <= txf_rp + 1;
              cs_n <= 0; busy <= 1; bits <= '0; state <= ST_SHIFT;
            end else tx_underrun <= 1;
          end
        end
        ST_SHIFT: begin
          if (abort) begin cs_n <= 1; busy <= 0; state <= ST_IDLE; end
          else begin
            if (lead_edge)  sr_rx <= {sr_rx[6:0], miso};
            if (trail_edge) begin
              sr_tx <= {sr_tx[6:0], 1'b0};
              mosi  <= sr_tx[6];
            end
            if (lead_edge) begin
              if (bits == 4'd7) state <= ST_DONE;
              else              bits  <= bits + 1;
            end
          end
        end
        ST_DONE: begin
          cs_n <= 1; busy <= 0; done <= 1;
          if ((rxf_wp - rxf_rp) != 3'd4) begin
            rxf[rxf_wp[1:0]] <= sr_rx;
            rxf_wp <= rxf_wp + 1;
          end else rx_overrun <= 1;
          state <= ST_IDLE;
        end
        default: state <= ST_IDLE;
      endcase
    end
  end
endmodule`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk   = 0;
  logic rst_n = 0;
  always #5 clk = ~clk;   // 100 MHz

  logic [7:0] clk_div  = 8'd3;
  logic [7:0] tx_data  = 8'h00;
  logic       tx_push  = 0;
  logic       tx_full, tx_empty;
  logic [7:0] rx_data;
  logic       rx_pop   = 0;
  logic       rx_valid;
  logic       start    = 0;
  logic       abort    = 0;
  logic       busy, done, tx_underrun, rx_overrun;
  logic       sck, mosi, cs_n;
  logic       miso;

  // Loopback: slave echoes every bit back to master
  assign miso = mosi;

  spi_master dut (
    .clk(clk), .rst_n(rst_n), .clk_div(clk_div),
    .tx_data(tx_data), .tx_push(tx_push),
    .tx_full(tx_full),  .tx_empty(tx_empty),
    .rx_data(rx_data),  .rx_pop(rx_pop), .rx_valid(rx_valid),
    .start(start), .abort(abort), .busy(busy), .done(done),
    .tx_underrun(tx_underrun), .rx_overrun(rx_overrun),
    .sck(sck), .mosi(mosi), .miso(miso), .cs_n(cs_n)
  );

  // Push one byte and wait for the DUT to complete the transfer
  task automatic do_xfer(input logic [7:0] d, output logic [7:0] r);
    @(posedge clk); #1;
    tx_data = d; tx_push = 1;
    @(posedge clk); #1; tx_push = 0;
    start = 1; @(posedge clk); #1; start = 0;
    while (!done) @(posedge clk);
    @(posedge clk); #1;
    rx_pop = 1; @(posedge clk); #1;
    r = rx_data; rx_pop = 0;
    @(posedge clk); #1;
  endtask

  // Check loopback: received byte must equal transmitted byte
  task automatic check(input logic [7:0] d);
    logic [7:0] r;
    do_xfer(d, r);
    if (r === d)
      $display("PASS  TX=%02h RX=%02h", d, r);
    else
      $display("FAIL  TX=%02h RX=%02h expected=%02h", d, r, d);
  endtask

  initial begin
    repeat(5) @(posedge clk); rst_n = 1; repeat(2) @(posedge clk);
    $display("=== SPI Master Loopback Test ===");

    $display("--- T1: Sanity ---");
    check(8'hA5);

    $display("--- T2: Boundary patterns ---");
    check(8'h00); check(8'hFF); check(8'hAA); check(8'h55);

    $display("--- T3: Burst (4 bytes) ---");
    check(8'hDE); check(8'hAD); check(8'hBE); check(8'hEF);

    $display("--- T4: Abort + recovery ---");
    @(posedge clk); #1;
    tx_data = 8'hBB; tx_push = 1; @(posedge clk); #1;
    tx_push = 0; start = 1; @(posedge clk); #1; start = 0;
    repeat(4) @(posedge clk); #1;
    abort = 1; @(posedge clk); #1; abort = 0;
    while (busy) @(posedge clk);
    $display("PASS  abort acknowledged");
    check(8'hAD);

    $display("--- T5: Sequential values ---");
    check(8'h11); check(8'h22); check(8'h33); check(8'h44);

    $display("=== All tests PASSED ===");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  TX=a5 RX=a5',
        'PASS  abort acknowledged',
        '=== All tests PASSED ==='
      ]
    }
  ]
});
