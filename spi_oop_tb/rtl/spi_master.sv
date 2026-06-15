// SPI Master — Mode 0 (CPOL=0, CPHA=0), 8-bit, 4-deep TX/RX FIFO
// Standalone RTL for class-based OOP testbench.
`timescale 1ns/1ps

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

  // SPI bus (Mode 0: CPOL=0, CPHA=0)
  output logic       sck,
  output logic       mosi,
  input  logic       miso,
  output logic       cs_n
);

  // ----------------------------------------------------------------
  // 4-deep FIFO — 3-bit wrap-bit pointers, 2-bit array index
  // ----------------------------------------------------------------
  logic [7:0] txf [0:3];
  logic [7:0] rxf [0:3];
  logic [2:0] txf_wp, txf_rp;
  logic [2:0] rxf_wp, rxf_rp;

  assign tx_full  = ((txf_wp - txf_rp) == 3'd4);
  assign tx_empty = (txf_wp == txf_rp);
  assign rx_valid = (rxf_wp != rxf_rp);
  assign rx_data  = rxf[rxf_rp[1:0]];

  // External FIFO push / pop
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      txf_wp <= '0;
      rxf_rp <= '0;
    end else begin
      if (tx_push && !tx_full) begin
        txf[txf_wp[1:0]] <= tx_data;
        txf_wp            <= txf_wp + 1;
      end
      if (rx_pop && rx_valid)
        rxf_rp <= rxf_rp + 1;
    end
  end

  // ----------------------------------------------------------------
  // SCK generator — CPOL=0: idle low
  // ----------------------------------------------------------------
  logic [7:0] div_cnt;
  logic       sck_r, sck_q;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= '0;
      sck_r   <= 0;
      sck_q   <= 0;
    end else begin
      sck_q <= sck_r;
      if (busy) begin
        if (div_cnt == clk_div) begin
          div_cnt <= '0;
          sck_r   <= ~sck_r;
        end else
          div_cnt <= div_cnt + 1;
      end else begin
        div_cnt <= '0;
        sck_r   <= 0;
      end
    end
  end

  assign sck = sck_r;

  // Mode 0: sample on rising edge, shift on falling edge
  wire lead_edge  =  sck_r & ~sck_q;   // rising  — sample MISO
  wire trail_edge = ~sck_r &  sck_q;   // falling — update MOSI

  // ----------------------------------------------------------------
  // Shift FSM
  // ----------------------------------------------------------------
  typedef enum logic [1:0] {
    ST_IDLE  = 2'd0,
    ST_SHIFT = 2'd1,
    ST_DONE  = 2'd2
  } fsm_t;

  fsm_t       state;
  logic [7:0] sr_tx, sr_rx;
  logic [3:0] bits;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state       <= ST_IDLE;
      txf_rp      <= '0;
      rxf_wp      <= '0;
      busy        <= 0;
      cs_n        <= 1;
      mosi        <= 0;
      bits        <= '0;
      sr_tx       <= '0;
      sr_rx       <= '0;
      done        <= 0;
      tx_underrun <= 0;
      rx_overrun  <= 0;
    end else begin
      done <= 0;  // default: pulse low every cycle

      case (state)

        ST_IDLE: begin
          if (start) begin
            if (!tx_empty) begin
              sr_tx  <= txf[txf_rp[1:0]];
              mosi   <= txf[txf_rp[1:0]][7]; // pre-drive MSB before first SCK
              txf_rp <= txf_rp + 1;
              cs_n   <= 0;
              busy   <= 1;
              bits   <= '0;
              state  <= ST_SHIFT;
            end else begin
              tx_underrun <= 1;
            end
          end
        end

        ST_SHIFT: begin
          if (abort) begin
            cs_n  <= 1;
            busy  <= 0;
            state <= ST_IDLE;
          end else begin
            if (lead_edge)
              sr_rx <= {sr_rx[6:0], miso};
            if (trail_edge) begin
              sr_tx <= {sr_tx[6:0], 1'b0};
              mosi  <= sr_tx[6];
            end
            if (lead_edge) begin
              if (bits == 4'd7)
                state <= ST_DONE;
              else
                bits <= bits + 1;
            end
          end
        end

        ST_DONE: begin
          cs_n <= 1;
          busy <= 0;
          done <= 1;
          if ((rxf_wp - rxf_rp) != 3'd4) begin
            rxf[rxf_wp[1:0]] <= sr_rx;
            rxf_wp            <= rxf_wp + 1;
          end else begin
            rx_overrun <= 1;
          end
          state <= ST_IDLE;
        end

        default: state <= ST_IDLE;

      endcase
    end
  end

endmodule
