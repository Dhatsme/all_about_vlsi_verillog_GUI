`timescale 1ns/1ps
import spi_pkg::*;

// Compile order:
//   1. verification/rtl/spi_master.sv
//   2. verification/tb/spi_if.sv
//   3. verification/tb/spi_pkg.sv
//   4. verification/tb/tb_top.sv
//
// Run: +TEST=<name>
//   test_sanity | test_walk | test_burst_8 | test_abort | test_rand_20 | all
module tb_top;

  logic clk  = 0;
  logic rst_n = 0;
  always #5 clk = ~clk;
  initial begin repeat(8) @(posedge clk); rst_n = 1; end

  spi_if #(.DATA_W(8)) dut_if (.clk(clk), .rst_n(rst_n));

  spi_master #(.DATA_W(8), .FIFO_D(4)) dut (
    .clk         (clk),
    .rst_n       (rst_n),
    .clk_div     (dut_if.clk_div),
    .tx_data     (dut_if.tx_data),
    .tx_push     (dut_if.tx_push),
    .tx_full     (dut_if.tx_full),
    .tx_empty    (dut_if.tx_empty),
    .rx_data     (dut_if.rx_data),
    .rx_pop      (dut_if.rx_pop),
    .rx_valid    (dut_if.rx_valid),
    .start       (dut_if.start),
    .abort       (dut_if.abort),
    .busy        (dut_if.busy),
    .done        (dut_if.done),
    .tx_underrun (dut_if.tx_underrun),
    .rx_overrun  (dut_if.rx_overrun),
    .sck         (dut_if.sck),
    .mosi        (dut_if.mosi),
    .miso        (dut_if.miso),
    .cs_n        (dut_if.cs_n)
  );

  // Loopback: slave echoes master. Replace with real slave model when ready.
  assign dut_if.miso = dut_if.mosi;

  initial begin
    string test_name;
    @(posedge rst_n);
    repeat(2) @(posedge clk);

    if (!$value$plusargs("TEST=%s", test_name))
      test_name = "test_sanity";

    $display("");
    $display("===================================================");
    $display("  SPI Verification Env  —  %s", test_name);
    $display("===================================================");

    case (test_name)
      "test_sanity"  : begin test_sanity tc = new(dut_if); tc.run(); end
      "test_walk"    : begin test_walk   tc = new(dut_if); tc.run(); end
      "test_burst_8" : begin test_burst  tc = new(dut_if); tc.run(); end
      "test_abort"   : begin test_abort  tc = new(dut_if); tc.run(); end
      "test_rand_20" : begin test_rand   tc = new(dut_if); tc.run(); end
      "all" : begin
        begin test_sanity tc = new(dut_if); tc.run(); end
        begin test_walk   tc = new(dut_if); tc.run(); end
        begin test_burst  tc = new(dut_if); tc.run(); end
        begin test_abort  tc = new(dut_if); tc.run(); end
        begin test_rand   tc = new(dut_if); tc.run(); end
      end
      default : begin
        $display("ERROR: Unknown test '%s'", test_name);
        $display("Valid: test_sanity test_walk test_burst_8 test_abort test_rand_20 all");
        $finish(1);
      end
    endcase

    $display("");
    $display("==================================================");
    $display("  Simulation complete.");
    $display("==================================================");
    $finish;
  end

  initial begin #5_000_000; $display("FATAL: timeout"); $finish(2); end

endmodule
