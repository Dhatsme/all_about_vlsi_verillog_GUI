`timescale 1ns/1ps
interface spi_if #(parameter int DATA_W = 8) (
  input logic clk,
  input logic rst_n
);
  logic [7:0]        clk_div;
  logic [DATA_W-1:0] tx_data;
  logic              tx_push;
  logic              tx_full;
  logic              tx_empty;
  logic [DATA_W-1:0] rx_data;
  logic              rx_pop;
  logic              rx_valid;
  logic              start;
  logic              abort;
  logic              busy;
  logic              done;
  logic              tx_underrun;
  logic              rx_overrun;
  logic              sck;
  logic              mosi;
  logic              miso;
  logic              cs_n;

  clocking driver_cb @(posedge clk);
    default input #1 output #1;
    output tx_data, tx_push, rx_pop, start, abort, clk_div, miso;
    input  tx_full, tx_empty, rx_data, rx_valid;
    input  busy, done, tx_underrun, rx_overrun;
    input  sck, mosi, cs_n;
  endclocking

  clocking monitor_cb @(posedge clk);
    default input #1;
    input tx_data, tx_push, tx_full, tx_empty;
    input rx_data, rx_pop, rx_valid;
    input start, abort, busy, done;
    input sck, mosi, miso, cs_n;
  endclocking

  modport DRIVER  (clocking driver_cb,  input clk, rst_n);
  modport MONITOR (clocking monitor_cb, input clk, rst_n);
endinterface
