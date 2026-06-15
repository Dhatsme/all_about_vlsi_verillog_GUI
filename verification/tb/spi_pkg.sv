`timescale 1ns/1ps
// ============================================================
//  SPI Verification Package — pure SystemVerilog, no UVM
//
//  Class hierarchy:
//    spi_config        — configuration object
//    spi_transaction   — sequence item
//    spi_sequencer     — mailbox-based sequencer
//    base_sequence     — abstract base
//      sanity_seq      — single byte 0xA5
//      walk_seq        — boundary and alternating patterns
//      burst_seq       — N consecutive bytes
//      abort_seq       — mid-transfer abort + recovery
//      rand_seq        — N fully randomised transfers
//    spi_driver        — pin-level DUT driver
//    spi_monitor       — passive SPI bus observer
//    spi_scoreboard    — loopback checker + bus-level checker
//    spi_coverage      — functional coverage collector
//    spi_agent         — driver + monitor + sequencer + coverage
//    spi_env           — agent + scoreboard
//    test_base         — abstract test
//      test_sanity / test_walk / test_burst / test_abort / test_rand
// ============================================================
package spi_pkg;


  // =================================================================
  //  CONFIGURATION OBJECT
  // =================================================================
  class spi_config;
    rand logic [7:0] clk_div;
    rand bit         lsb_first;
         int         num_transfers;

    constraint c_div { clk_div inside {[1:8]}; }
    constraint c_lsb { lsb_first == 0; }

    function new();
      clk_div       = 4;
      lsb_first     = 0;
      num_transfers = 1;
    endfunction

    function string to_string();
      return $sformatf("cfg{div=%0d lsb=%0b n=%0d}",
                       clk_div, lsb_first, num_transfers);
    endfunction
  endclass


  // =================================================================
  //  TRANSACTION (sequence item)
  // =================================================================
  class spi_transaction;
    rand logic [7:0] tx_data;
    rand bit         do_abort;
    rand int         abort_delay;

    logic [7:0] rx_data;
    bit         aborted;
    bit         underrun_seen;

    constraint c_abort_off   { do_abort    == 0; }
    constraint c_abort_delay { abort_delay inside {[3:6]}; }

    function new();
      tx_data = '0; do_abort = 0; abort_delay = 4;
      rx_data = '0; aborted = 0; underrun_seen = 0;
    endfunction

    function spi_transaction clone();
      spi_transaction t = new();
      t.tx_data = this.tx_data; t.do_abort = this.do_abort;
      t.abort_delay = this.abort_delay;
      return t;
    endfunction

    function string to_string();
      if (aborted)
        return $sformatf("TX=%02Xh [ABORTED after %0d cycles]",
                         tx_data, abort_delay);
      else
        return $sformatf("TX=%02Xh  RX=%02Xh  match=%0b",
                         tx_data, rx_data, tx_data === rx_data);
    endfunction
  endclass


  // =================================================================
  //  SEQUENCER
  // =================================================================
  class spi_sequencer;
    mailbox #(spi_transaction) req_mbox;
    mailbox #(spi_transaction) rsp_mbox;

    function new();
      req_mbox = new(16);
      rsp_mbox = new(16);
    endfunction
  endclass


  // =================================================================
  //  BASE SEQUENCE (abstract)
  // =================================================================
  virtual class base_sequence;
    protected spi_sequencer    sqr;
    protected spi_config       cfg;
    spi_transaction            completed_xfers[$];

    function new(spi_sequencer s, spi_config c = null);
      this.sqr = s;
      this.cfg = (c != null) ? c : new();
    endfunction

    protected task send(ref spi_transaction t);
      sqr.req_mbox.put(t);
      sqr.rsp_mbox.get(t);
      completed_xfers.push_back(t);
    endtask

    pure virtual task body();
  endclass


  // =================================================================
  //  CONCRETE SEQUENCES
  // =================================================================

  class sanity_seq extends base_sequence;
    function new(spi_sequencer s, spi_config c = null); super.new(s,c); endfunction
    task body();
      spi_transaction t = new();
      t.tx_data = 8'hA5;
      send(t);
      $display("[sanity_seq]  %s", t.to_string());
    endtask
  endclass

  class walk_seq extends base_sequence;
    function new(spi_sequencer s, spi_config c = null); super.new(s,c); endfunction
    task body();
      logic [7:0] patterns[] = '{8'h00, 8'hFF, 8'hAA, 8'h55,
                                  8'h01, 8'h80, 8'h7F, 8'hFE};
      foreach (patterns[i]) begin
        spi_transaction t = new();
        t.tx_data = patterns[i];
        send(t);
        $display("[walk_seq]    [%0d] %s", i, t.to_string());
      end
    endtask
  endclass

  class burst_seq extends base_sequence;
    int unsigned length;
    logic [7:0]  payload[$];

    function new(spi_sequencer s, int unsigned n = 8, spi_config c = null);
      super.new(s,c); this.length = n;
    endfunction

    task body();
      for (int i = 0; i < int'(length); i++) begin
        spi_transaction t = new();
        if (payload.size() > i) t.tx_data = payload[i];
        else if (!t.randomize()) $fatal(0, "[burst_seq] randomize() failed i=%0d", i);
        send(t);
        $display("[burst_seq]   [%0d/%0d] %s", i+1, length, t.to_string());
      end
    endtask
  endclass

  class abort_seq extends base_sequence;
    function new(spi_sequencer s, spi_config c = null); super.new(s,c); endfunction
    task body();
      spi_transaction t1 = new();
      t1.tx_data = 8'hDE; t1.do_abort = 1; t1.abort_delay = 4;
      send(t1);
      $display("[abort_seq]   xfer1 %s", t1.to_string());
      spi_transaction t2 = new();
      t2.tx_data = 8'hAD;
      send(t2);
      $display("[abort_seq]   xfer2 (recovery) %s", t2.to_string());
    endtask
  endclass

  class rand_seq extends base_sequence;
    int unsigned num;
    function new(spi_sequencer s, int unsigned n = 10, spi_config c = null);
      super.new(s,c); this.num = n;
    endfunction
    task body();
      for (int i = 0; i < int'(num); i++) begin
        spi_transaction t = new();
        if (!t.randomize()) $fatal(0, "[rand_seq] randomize() failed i=%0d", i);
        t.do_abort = 0;
        send(t);
        $display("[rand_seq]    [%0d/%0d] %s", i+1, num, t.to_string());
      end
    endtask
  endclass


  // =================================================================
  //  DRIVER
  //  Uses @(posedge vif.clk); #1 pattern for setup/hold safety.
  //  Does NOT drive vif.miso — handled by loopback assign in tb_top.
  // =================================================================
  class spi_driver;
    virtual spi_if vif;
    spi_sequencer  sqr;
    spi_config     cfg;
    int            xfer_cnt;

    function new(virtual spi_if v, spi_sequencer s, spi_config c);
      this.vif = v; this.sqr = s; this.cfg = c; this.xfer_cnt = 0;
    endfunction

    task run();
      vif.tx_data = '0; vif.tx_push = 0; vif.rx_pop = 0;
      vif.start = 0; vif.abort = 0; vif.clk_div = cfg.clk_div;
      forever begin
        spi_transaction t;
        sqr.req_mbox.get(t);
        drive(t);
        sqr.rsp_mbox.put(t);
        xfer_cnt++;
      end
    endtask

    local task drive(spi_transaction t);
      @(posedge vif.clk); #1;
      vif.tx_data = t.tx_data; vif.tx_push = 1;
      @(posedge vif.clk); #1;
      vif.tx_push = 0;
      vif.start = 1;
      @(posedge vif.clk); #1;
      vif.start = 0;

      if (t.do_abort) begin
        repeat(t.abort_delay) @(posedge vif.clk); #1;
        if (vif.busy) begin
          vif.abort = 1;
          @(posedge vif.clk); #1;
          vif.abort = 0;
          t.aborted = 1;
        end
        while (vif.busy) @(posedge vif.clk); #1;
      end else begin
        while (!vif.done) @(posedge vif.clk);
        @(posedge vif.clk); #1;
        if (vif.rx_valid) begin
          vif.rx_pop = 1;
          @(posedge vif.clk); #1;
          t.rx_data  = vif.rx_data;
          vif.rx_pop = 0;
        end
      end

      t.underrun_seen = vif.tx_underrun;
      @(posedge vif.clk); #1;
    endtask
  endclass


  // =================================================================
  //  MONITOR
  // =================================================================
  class spi_monitor;
    virtual spi_if             vif;
    mailbox #(spi_transaction) analysis_port;

    function new(virtual spi_if v);
      this.vif = v; this.analysis_port = new();
    endfunction

    task run();
      forever begin
        spi_transaction obs = new();
        logic [7:0] captured;
        bit truncated;

        @(negedge vif.cs_n);
        truncated = 0;
        for (int i = 7; i >= 0; i--) begin
          @(posedge vif.sck or posedge vif.cs_n);
          if (vif.cs_n) begin truncated = 1; break; end
          captured[i] = vif.mosi;
        end
        if (!vif.cs_n) @(posedge vif.cs_n);

        if (!truncated) begin
          obs.tx_data = captured;
          analysis_port.try_put(obs);
          $display("[monitor]     SPI bus: MOSI=%02Xh", captured);
        end else
          $display("[monitor]     SPI bus: transfer truncated (abort)");
      end
    endtask
  endclass


  // =================================================================
  //  SCOREBOARD
  // =================================================================
  class spi_scoreboard;
    mailbox #(spi_transaction) expected_port;
    mailbox #(spi_transaction) actual_port;
    int pass_cnt, fail_cnt, skip_cnt;

    function new();
      expected_port = new(); actual_port = new();
      pass_cnt = 0; fail_cnt = 0; skip_cnt = 0;
    endfunction

    function void check_loopback(spi_transaction t);
      if (t.aborted) return;
      if (t.rx_data === t.tx_data) begin
        $display("[scoreboard]  PASS  TX=%02Xh RX=%02Xh (loopback match)",
                 t.tx_data, t.rx_data);
        pass_cnt++;
      end else begin
        $display("[scoreboard]  FAIL  TX=%02Xh RX=%02Xh (expected loopback)",
                 t.tx_data, t.rx_data);
        fail_cnt++;
      end
    endfunction

    task run();
      spi_transaction obs, exp_t;
      forever begin
        actual_port.get(obs);
        if (expected_port.try_get(exp_t)) begin
          if (obs.tx_data !== exp_t.tx_data) begin
            $display("[scoreboard]  BUS-FAIL obs=%02Xh exp=%02Xh",
                     obs.tx_data, exp_t.tx_data);
            fail_cnt++;
          end
        end else skip_cnt++;
      end
    endtask

    function void report();
      $display("");
      $display("╬ Scoreboard Report");
      $display("  Loopback PASS : %0d", pass_cnt);
      $display("  Loopback FAIL : %0d", fail_cnt);
      $display("  Skipped       : %0d (aborts/unmatched)", skip_cnt);
      if (fail_cnt == 0) $display("  >>> ALL CHECKS PASSED <<<");
      else               $display("  >>> FAILURES DETECTED <<<");
    endfunction
  endclass


  // =================================================================
  //  FUNCTIONAL COVERAGE
  // =================================================================
  class spi_coverage;
    spi_transaction last_t;

    covergroup cg_tx_data;
      cp_tx: coverpoint last_t.tx_data {
        bins all_zeros   = {8'h00};
        bins all_ones    = {8'hFF};
        bins alternating = {8'hAA, 8'h55};
        bins walking_1   = {8'h01, 8'h02, 8'h04, 8'h08,
                            8'h10, 8'h20, 8'h40, 8'h80};
        bins others      = default;
      }
    endgroup

    covergroup cg_control;
      cp_abort: coverpoint last_t.aborted {
        bins normal  = {0};
        bins aborted = {1};
      }
    endgroup

    function new();
      last_t = new(); cg_tx_data = new(); cg_control = new();
    endfunction

    function void sample(spi_transaction t);
      last_t = t; cg_tx_data.sample(); cg_control.sample();
    endfunction

    function void report();
      $display("╬ Coverage Report");
      $display("  cg_tx_data = %0.1f%%", cg_tx_data.get_coverage());
      $display("  cg_control = %0.1f%%", cg_control.get_coverage());
    endfunction
  endclass


  // =================================================================
  //  AGENT
  // =================================================================
  class spi_agent;
    spi_driver    drv;
    spi_monitor   mon;
    spi_sequencer sqr;
    spi_coverage  cov;
    spi_config    cfg;

    function new(virtual spi_if v, spi_config c = null);
      cfg = (c != null) ? c : new();
      sqr = new(); drv = new(v, sqr, cfg); mon = new(v); cov = new();
    endfunction

    task run();
      fork drv.run(); mon.run(); join_none
    endtask

    task run_seq(base_sequence seq, spi_scoreboard sb);
      seq.body();
      foreach (seq.completed_xfers[i]) begin
        cov.sample(seq.completed_xfers[i]);
        sb.check_loopback(seq.completed_xfers[i]);
        sb.expected_port.try_put(seq.completed_xfers[i]);
      end
    endtask
  endclass


  // =================================================================
  //  ENVIRONMENT
  // =================================================================
  class spi_env;
    spi_agent      agent;
    spi_scoreboard sb;
    spi_config     cfg;

    function new(virtual spi_if v, spi_config c = null);
      cfg = (c != null) ? c : new();
      agent = new(v, cfg); sb = new();
    endfunction

    task start();
      agent.run();
      fork sb.run(); join_none
    endtask

    task run_seq(base_sequence seq);
      agent.run_seq(seq, sb);
    endtask

    function void report();
      sb.report(); agent.cov.report();
    endfunction
  endclass


  // =================================================================
  //  TEST BASE (abstract)
  // =================================================================
  virtual class test_base;
    string     name;
    spi_env    env;
    spi_config cfg;

    function new(string n, virtual spi_if v);
      this.name = n; this.cfg = new(); this.env = new(v, this.cfg);
    endfunction

    task run();
      $display("");
      $display("▶▶▶ TEST START: %s", name);
      $display("    Config: %s", cfg.to_string());
      env.start();
      @(posedge env.agent.drv.vif.clk);
      body();
      #1000;
      env.report();
      $display("▶▶▶ TEST END:   %s", name);
    endtask

    pure virtual task body();
  endclass


  // =================================================================
  //  CONCRETE TESTS
  // =================================================================

  class test_sanity extends test_base;
    function new(virtual spi_if v); super.new("test_sanity", v); endfunction
    task body();
      sanity_seq seq = new(env.agent.sqr, cfg); env.run_seq(seq);
    endtask
  endclass

  class test_walk extends test_base;
    function new(virtual spi_if v); super.new("test_walk", v); endfunction
    task body();
      walk_seq seq = new(env.agent.sqr, cfg); env.run_seq(seq);
    endtask
  endclass

  class test_burst extends test_base;
    function new(virtual spi_if v); super.new("test_burst_8", v); endfunction
    task body();
      burst_seq seq = new(env.agent.sqr, 8, cfg); env.run_seq(seq);
    endtask
  endclass

  class test_abort extends test_base;
    function new(virtual spi_if v); super.new("test_abort", v); endfunction
    task body();
      abort_seq seq = new(env.agent.sqr, cfg); env.run_seq(seq);
    endtask
  endclass

  class test_rand extends test_base;
    function new(virtual spi_if v); super.new("test_rand_20", v); endfunction
    task body();
      rand_seq seq = new(env.agent.sqr, 20, cfg); env.run_seq(seq);
    endtask
  endclass

endpackage
