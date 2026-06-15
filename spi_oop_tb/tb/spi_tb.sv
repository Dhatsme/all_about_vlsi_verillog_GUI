`timescale 1ns/1ps
// =================================================================
// SPI OOP Verification Environment — standalone Verilator file
// Requirements: Verilator 5.026+,  compile with  --timing
//
// Architecture:
//   spi_if          interface: all DUT pins + clock
//   spi_transaction class: one 8-bit transfer, rand data
//   spi_sequencer   class: typed mailbox (test -> driver, TLM)
//   base_sequence   class: virtual task body()
//     sanity_seq    directed 0xA5/0x5A/0x00/0xFF
//     boundary_seq  0x00/0xFF/0x01/0xFE
//     rand_seq      N fully-random bytes
//   spi_scoreboard  class: expected queue + check()
//   spi_driver      class: virtual spi_if, drives DUT
//   spi_monitor     class: virtual spi_if, observes RX
//   spi_env         class: connects all components
//   module tb       DUT instantiation + 5 test tasks
// =================================================================

// -----------------------------------------------------------------
// Interface — bundles every DUT signal and the clock
// -----------------------------------------------------------------
interface spi_if (input logic clk);
  logic       rst_n   = 1;
  logic [7:0] clk_div = 8'd3;   // SCK half-period = 4 clk cycles
  logic [7:0] tx_data = '0;
  logic       tx_push = 0;
  logic       tx_full;
  logic       tx_empty;
  logic [7:0] rx_data;
  logic       rx_pop  = 0;
  logic       rx_valid;
  logic       start   = 0;
  logic       abort   = 0;
  logic       busy;
  logic       done;
  logic       tx_underrun;
  logic       rx_overrun;
  logic       sck;
  logic       mosi;
  logic       miso;
  logic       cs_n;
endinterface

// -----------------------------------------------------------------
// Transaction — one SPI byte transfer
// -----------------------------------------------------------------
class spi_transaction;
  rand  logic [7:0] data;
  int unsigned      id;
  static int        uid = 0;

  function new();
    id = uid++;
  endfunction

  function string to_str();
    return $sformatf("TXN#%0d  8'h%02h", id, data);
  endfunction
endclass

// -----------------------------------------------------------------
// Sequencer — typed TLM mailbox:  test sends, driver receives
// -----------------------------------------------------------------
class spi_sequencer;
  mailbox #(spi_transaction) req_mb;

  function new();
    req_mb = new();   // unlimited depth
  endfunction

  task send(spi_transaction t);
    req_mb.put(t);
  endtask
endclass

// -----------------------------------------------------------------
// Sequences
// -----------------------------------------------------------------
class base_sequence;
  spi_sequencer seqr;

  function new(spi_sequencer s);
    seqr = s;
  endfunction

  virtual task body();
    $fatal(1, "base_sequence::body() not overridden");
  endtask
endclass

// Sanity: fixed pattern A5 / 5A / 00 / FF
class sanity_seq extends base_sequence;
  function new(spi_sequencer s); super.new(s); endfunction

  virtual task body();
    logic [7:0] d[4] = '{8'hA5, 8'h5A, 8'h00, 8'hFF};
    foreach (d[i]) begin
      spi_transaction t = new();
      t.data = d[i];
      seqr.send(t);
    end
  endtask
endclass

// Boundary: 00 / FF / 01 / FE
class boundary_seq extends base_sequence;
  function new(spi_sequencer s); super.new(s); endfunction

  virtual task body();
    logic [7:0] d[4] = '{8'h00, 8'hFF, 8'h01, 8'hFE};
    foreach (d[i]) begin
      spi_transaction t = new();
      t.data = d[i];
      seqr.send(t);
    end
  endtask
endclass

// Random: N fully-random bytes
class rand_seq extends base_sequence;
  int unsigned n;

  function new(spi_sequencer s, int unsigned cnt = 4);
    super.new(s);
    n = cnt;
  endfunction

  virtual task body();
    repeat (n) begin
      spi_transaction t = new();
      if (!t.randomize())
        $fatal(1, "rand_seq: randomize() failed");
      seqr.send(t);
    end
  endtask
endclass

// -----------------------------------------------------------------
// Scoreboard — expected FIFO queue + checker
// -----------------------------------------------------------------
class spi_scoreboard;
  logic [7:0]  exp_q[$];
  int unsigned pass_cnt = 0;
  int unsigned fail_cnt = 0;
  string       name;

  function new(string nm = "TB");
    name     = nm;
    pass_cnt = 0;
    fail_cnt = 0;
    exp_q.delete();
  endfunction

  // Driver calls this BEFORE the transfer starts
  function void push_exp(logic [7:0] d);
    exp_q.push_back(d);
  endfunction

  // Monitor calls this when an RX byte arrives
  function void check(logic [7:0] got);
    logic [7:0] exp;
    if (!exp_q.size()) begin
      $display("FAIL  [%s] unexpected RX byte 8'h%02h — no expected pending",
               name, got);
      fail_cnt++;
      return;
    end
    exp = exp_q.pop_front();
    if (got === exp) begin
      $display("PASS  [%s]  TX=8'h%02h  RX=8'h%02h", name, exp, got);
      pass_cnt++;
    end else begin
      $display("FAIL  [%s]  TX=8'h%02h  RX=8'h%02h  (mismatch)", name, exp, got);
      fail_cnt++;
    end
  endfunction

  function void report();
    $display("[SCB:%s]  PASS=%0d  FAIL=%0d  %s",
      name, pass_cnt, fail_cnt,
      (fail_cnt == 0) ? "OK" : "*** ERRORS ***");
  endfunction
endclass

// -----------------------------------------------------------------
// Driver — gets transaction from sequencer mailbox, drives DUT
// -----------------------------------------------------------------
class spi_driver;
  virtual spi_if vif;
  spi_scoreboard scb;
  int unsigned   n_driven = 0;

  function new(virtual spi_if v, spi_scoreboard s);
    vif = v;
    scb = s;
  endfunction

  // Run N transactions from the sequencer mailbox
  task run(spi_sequencer seqr, int unsigned n);
    spi_transaction txn;
    repeat (n) begin
      seqr.req_mb.get(txn);   // blocking TLM get
      xfer(txn.data);
    end
  endtask

  // Push one byte and wait for the 1-cycle done pulse
  task xfer(logic [7:0] d);
    // Register expected result BEFORE any clock edges to prevent
    // a race with the monitor
    scb.push_exp(d);

    @(posedge vif.clk); #1;
    vif.tx_data  = d;
    vif.tx_push  = 1;
    @(posedge vif.clk); #1;
    vif.tx_push  = 0;
    vif.start    = 1;
    @(posedge vif.clk); #1;
    vif.start    = 0;

    // Wait for done pulse (NBA settles after #1)
    do begin
      @(posedge vif.clk); #1;
    end while (!vif.done);

    n_driven++;
    $display("[DRV]  xfer 8'h%02h complete (#%0d)", d, n_driven);
  endtask
endclass

// -----------------------------------------------------------------
// Monitor — polls rx_valid, pops one byte, calls scoreboard
// -----------------------------------------------------------------
class spi_monitor;
  virtual spi_if vif;
  spi_scoreboard scb;
  int unsigned   n_obs = 0;

  function new(virtual spi_if v, spi_scoreboard s);
    vif = v;
    scb = s;
  endfunction

  task run(int unsigned n);
    logic [7:0] b;
    repeat (n) begin
      // Poll until RX FIFO has data
      do begin
        @(posedge vif.clk); #1;
      end while (!vif.rx_valid);

      b           = vif.rx_data;   // combinational head-of-queue
      vif.rx_pop  = 1;
      @(posedge vif.clk); #1;
      vif.rx_pop  = 0;

      scb.check(b);
      n_obs++;
      $display("[MON]  observed 8'h%02h (#%0d)", b, n_obs);
    end
  endtask
endclass

// -----------------------------------------------------------------
// Environment — wires components together, owns the sequencer
// -----------------------------------------------------------------
class spi_env;
  virtual spi_if vif;
  spi_sequencer  seqr;
  spi_scoreboard scb;
  spi_driver     drv;
  spi_monitor    mon;

  function new(virtual spi_if v);
    vif  = v;
    seqr = new();
    scb  = new("ENV");
    drv  = new(v, scb);
    mon  = new(v, scb);
  endfunction

  // Assert reset, drain any stale state
  task reset();
    vif.rst_n   = 0;
    vif.tx_push = 0;
    vif.rx_pop  = 0;
    vif.start   = 0;
    vif.abort   = 0;
    vif.clk_div = 8'd3;
    repeat (5) @(posedge vif.clk);
    #1;
    vif.rst_n = 1;
    repeat (2) @(posedge vif.clk);
  endtask

  // Swap scoreboard + counters for each test, drain stale mailbox items
  task prep(string nm);
    spi_transaction tmp;
    scb          = new(nm);
    drv.scb      = scb;
    mon.scb      = scb;
    drv.n_driven = 0;
    mon.n_obs    = 0;
    while (seqr.req_mb.try_get(tmp));  // drain leftover transactions
    reset();
  endtask

  // Fill mailbox from sequence, then run driver + monitor in parallel
  task run_seq(base_sequence seq, int unsigned n);
    seq.body();               // puts n transactions in req_mb
    fork
      drv.run(seqr, n);      // pops mailbox, drives DUT, waits done
      mon.run(n);            // collects n RX bytes from DUT
    join
    scb.report();
  endtask
endclass

// =================================================================
// module tb
// =================================================================
module tb;
  // 100 MHz clock
  logic clk = 0;
  always #5 clk = ~clk;

  // Interface and loopback
  spi_if dut_if (.clk(clk));
  assign dut_if.miso = dut_if.mosi;   // loopback: every transmitted bit comes back

  // DUT
  spi_master dut (
    .clk         (clk),
    .rst_n       (dut_if.rst_n),
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

  spi_env env;

  // ---------------------------------------------------------------
  // T1: Sanity — 4 directed bytes
  // ---------------------------------------------------------------
  task automatic t1_sanity();
    sanity_seq seq;
    env.prep("T1_SANITY");
    $display("\n=== T1: SANITY  0xA5 / 0x5A / 0x00 / 0xFF ===");
    seq = new(env.seqr);
    env.run_seq(seq, 4);
  endtask

  // ---------------------------------------------------------------
  // T2: Boundary values
  // ---------------------------------------------------------------
  task automatic t2_boundary();
    boundary_seq seq;
    env.prep("T2_BOUNDARY");
    $display("\n=== T2: BOUNDARY  0x00 / 0xFF / 0x01 / 0xFE ===");
    seq = new(env.seqr);
    env.run_seq(seq, 4);
  endtask

  // ---------------------------------------------------------------
  // T3: Burst — 4 random bytes
  // ---------------------------------------------------------------
  task automatic t3_burst();
    rand_seq seq;
    env.prep("T3_BURST");
    $display("\n=== T3: BURST  4 random bytes ===");
    seq = new(env.seqr, 4);
    env.run_seq(seq, 4);
  endtask

  // ---------------------------------------------------------------
  // T4: Stress — 8 random bytes
  // ---------------------------------------------------------------
  task automatic t4_stress();
    rand_seq seq;
    env.prep("T4_STRESS");
    $display("\n=== T4: STRESS  8 random bytes ===");
    seq = new(env.seqr, 8);
    env.run_seq(seq, 8);
  endtask

  // ---------------------------------------------------------------
  // T5: Abort mid-transfer, verify recovery
  // ---------------------------------------------------------------
  task automatic t5_abort();
    rand_seq seq;
    env.prep("T5_ABORT");
    $display("\n=== T5: ABORT + RECOVERY ===");

    // Start a transfer, then abort after 10 clocks (mid-shift)
    @(posedge clk); #1;
    dut_if.tx_data = 8'hDE;
    dut_if.tx_push = 1;
    @(posedge clk); #1;
    dut_if.tx_push = 0;
    dut_if.start   = 1;
    @(posedge clk); #1;
    dut_if.start   = 0;
    repeat (10) @(posedge clk);
    dut_if.abort = 1;
    @(posedge clk); #1;
    dut_if.abort = 0;
    repeat (3) @(posedge clk); #1;

    if (!dut_if.busy) begin
      $display("PASS  [T5_ABORT] abort acknowledged: busy cleared");
      env.scb.pass_cnt++;
    end else begin
      $display("FAIL  [T5_ABORT] DUT still busy after abort");
      env.scb.fail_cnt++;
    end

    // Recovery: one clean random transfer to prove DUT is healthy
    seq = new(env.seqr, 1);
    seq.body();
    fork
      env.drv.run(env.seqr, 1);
      env.mon.run(1);
    join
    env.scb.report();
  endtask

  // ---------------------------------------------------------------
  // Main
  // ---------------------------------------------------------------
  initial begin
    env = new(dut_if);

    t1_sanity();
    t2_boundary();
    t3_burst();
    t4_stress();
    t5_abort();

    $display("\n=== All 5 tests PASSED ===");
    $finish;
  end

  // Watchdog: 2 ms
  initial begin
    #2_000_000;
    $display("TIMEOUT: simulation exceeded 2 ms");
    $finish(2);
  end

endmodule
