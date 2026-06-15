`timescale 1ns/1ps
// SPI verification interface
// Connects DUT ports to class-based TB components via virtual interface handles.
interface spi_if #(parameter int DATA_W = 8) (
  input logic clk,
  input logic rst_n
);

  // ── Configuration (driven by driver before each test) ─────────────────
  logic [7:0]        clk_div;

  // ── TX FIFO interface ─────────────────────────────────────────────────
  logic [DATA_W-1:0] tx_data;
  logic              tx_push;
  logic              tx_full;
  logic              tx_empty;

  // ── RX FIFO interface ─────────────────────────────────────────────────
  logic [DATA_W-1:0] rx_data;
  logic              rx_pop;
  logic              rx_valid;

  // ── Control ───────────────────────────────────────────────────────────
  logic              start;
  logic              abort;
  logic              busy;
  logic              done;
  logic              tx_underrun;
  logic              rx_overrun;

  // ── SPI bus ───────────────────────────────────────────────────────────
  logic              sck;
  logic              mosi;
  logic              miso;   // driven by loopback assign or slave model in tb_top
  logic              cs_n;

  // ── Clocking block — driver (active stimulus) ─────────────────────────
  // #1 output skew keeps driven values stable well after the clock edge.
  clocking driver_cb @(posedge clk);
    default input #1 output #1;
    // Outputs to DUT
    output tx_data, tx_push, rx_pop, start, abort, clk_div, miso;
    // Inputs from DUT
    input  tx_full, tx_empty, rx_data, rx_valid;
    input  busy, done, tx_underrun, rx_overrun;
    input  sck, mosi, cs_n;
  endclocking

  // ── Clocking block — monitor (passive observation) ────────────────────
  clocking monitor_cb @(posedge clk);
    default input #1;
    input tx_data, tx_push, tx_full, tx_empty;
    input rx_data, rx_pop, rx_valid;
    input start, abort, busy, done;
    input sck, mosi, miso, cs_n;
  endclocking

  // ── Modports ──────────────────────────────────────────────────────────
  modport DRIVER  (clocking driver_cb,  input clk, rst_n);
  modport MONITOR (clocking monitor_cb, input clk, rst_n);

endinterface
