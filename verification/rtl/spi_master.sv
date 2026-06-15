`timescale 1ns/1ps
// SPI Master — Mode 0 (CPOL=0, CPHA=0), 8-bit data, 4-deep FIFO
// Prototype DUT for class-based verification environment.
// Replace with your full production DUT once the TB architecture is validated.
module spi_master #(
  parameter int DATA_W = 8,
  parameter int FIFO_D = 4
)(
  input  logic              clk,
  input  logic              rst_n,
  input  logic [7:0]        clk_div,      // SCK half-period = (clk_div+1) clk cycles

  // TX FIFO interface
  input  logic [DATA_W-1:0] tx_data,
  input  logic              tx_push,
  output logic              tx_full,
  output logic              tx_empty,

  // RX FIFO interface
  output logic [DATA_W-1:0] rx_data,
  input  logic              rx_pop,
  output logic              rx_valid,

  // Control
  input  logic              start,
  input  logic              abort,
  output logic              busy,
  output logic              done,         // 1-cycle pulse on word completion
  output logic              tx_underrun,
  output logic              rx_overrun,

  // SPI bus (Mode 0 — CPOL=0, CPHA=0)
  output logic              sck,
  output logic              mosi,
  input  logic              miso,
  output logic              cs_n
);

  localparam int  PTR_W     = $clog2(FIFO_D) + 1;   // wrap-bit pointer width
  localparam int  IDX_W     = $clog2(FIFO_D);        // index width

  // ── TX FIFO (wrap-bit pointer trick) ─────────────────────────────────
  logic [DATA_W-1:0] txf [0:FIFO_D-1];
  logic [PTR_W-1:0]  txf_wp;             // written by external push block
  logic [PTR_W-1:0]  txf_rp;             // written by FSM block

  assign tx_full  = ((txf_wp - txf_rp) == PTR_W'(FIFO_D));
  assign tx_empty = (txf_wp == txf_rp);

  // ── RX FIFO ──────────────────────────────────────────────────────────
  logic [DATA_W-1:0] rxf [0:FIFO_D-1];
  logic [PTR_W-1:0]  rxf_wp;             // written by FSM block
  logic [PTR_W-1:0]  rxf_rp;             // written by external pop block

  assign rx_valid = (rxf_wp != rxf_rp);
  assign rx_data  = rxf[rxf_rp[IDX_W-1:0]];

  // ── External FIFO push / pop ─────────────────────────────────────────
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      txf_wp <= '0;
      rxf_rp <= '0;
    end else begin
      if (tx_push && !tx_full) begin
        txf[txf_wp[IDX_W-1:0]] <= tx_data;
        txf_wp <= txf_wp + 1;
      end
      if (rx_pop && rx_valid)
        rxf_rp <= rxf_rp + 1;
    end
  end

  // ── SCK generator ────────────────────────────────────────────────────
  logic [7:0] div_cnt;
  logic       sck_r;   // raw SCK (CPOL=0)
  logic       sck_q;   // one-cycle delayed for edge detection

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      div_cnt <= '0; sck_r <= 0; sck_q <= 0;
    end else begin
      sck_q <= sck_r;
      if (busy) begin
        if (div_cnt == clk_div) begin div_cnt <= '0; sck_r <= ~sck_r; end
        else                          div_cnt <= div_cnt + 1;
      end else begin
        div_cnt <= '0; sck_r <= 0;
      end
    end
  end
  assign sck = sck_r;

  // Glitch-free edge detect (registered)
  wire lead_edge  = sck_r & ~sck_q;    // 0 → 1  (rising)
  wire trail_edge = ~sck_r &  sck_q;   // 1 → 0  (falling)
  // Mode 0: sample MISO on leading (rising), update MOSI on trailing (falling)

  // ── Shift FSM ────────────────────────────────────────────────────────
  typedef enum logic [1:0] {
    ST_IDLE  = 2'b00,
    ST_SHIFT = 2'b01,
    ST_DONE  = 2'b10
  } fsm_t;

  fsm_t              state;
  logic [DATA_W-1:0] sr_tx;             // TX shift register
  logic [DATA_W-1:0] sr_rx;             // RX shift register
  logic [3:0]        bits;              // rising-edge counter (0 .. DATA_W-1)

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
      done <= 0;

      case (state)

        ST_IDLE: begin
          if (start) begin
            if (!tx_empty) begin
              sr_tx      <= txf[txf_rp[IDX_W-1:0]];
              mosi       <= txf[txf_rp[IDX_W-1:0]][DATA_W-1]; // pre-seed MSB before first SCK
              txf_rp     <= txf_rp + 1;
              cs_n       <= 0;
              busy       <= 1;
              bits       <= '0;
              state      <= ST_SHIFT;
            end else
              tx_underrun <= 1;
          end
        end

        ST_SHIFT: begin
          if (abort) begin
            cs_n  <= 1;
            busy  <= 0;
            state <= ST_IDLE;
          end else begin
            // Capture MISO on every rising SCK edge
            if (lead_edge)
              sr_rx <= {sr_rx[DATA_W-2:0], miso};

            // Update MOSI on every falling SCK edge
            if (trail_edge) begin
              sr_tx <= {sr_tx[DATA_W-2:0], 1'b0};
              mosi  <= sr_tx[DATA_W-2];
            end

            // Transition after DATA_W captures
            if (lead_edge) begin
              if (bits == DATA_W - 1) state <= ST_DONE;
              else                    bits  <= bits + 1;
            end
          end
        end

        ST_DONE: begin
          cs_n <= 1;
          busy <= 0;
          done <= 1;
          if ((rxf_wp - rxf_rp) < PTR_W'(FIFO_D)) begin
            rxf[rxf_wp[IDX_W-1:0]] <= sr_rx;
            rxf_wp                 <= rxf_wp + 1;
          end else
            rx_overrun <= 1;
          state <= ST_IDLE;
        end

        default: state <= ST_IDLE;

      endcase
    end
  end

endmodule
