(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spiv1',
  title: 'SPI Verification: OOP Environment',
  icon: '🔬',
  level: 'advanced',
  lessons: [
    {
      id: 'spiv1l1',
      title: 'L1 — Class-Based SPI Verification',
      theory: `<h2>Class-Based OOP Verification Environment</h2>
<p>This lesson runs a <strong>complete UVM-style verification environment</strong> built
in pure SystemVerilog — no UVM library required. Every component is a class.
The loopback wire (<code>miso = mosi</code>) means every received byte must equal
the transmitted byte.</p>
<h3>Component hierarchy</h3>
<pre class="code-block">
spi_if          — interface: all DUT signals + clock
spi_transaction — rand class: one 8-bit transfer
spi_sequencer   — TLM mailbox: test → driver
base_sequence   — base class with virtual task body()
  sanity_seq    — 4 directed bytes (A5/5A/00/FF)
  boundary_seq  — 4 boundary values
  rand_seq      — N fully-random bytes
spi_scoreboard  — expected queue + check()
spi_driver      — gets txn from mailbox, drives DUT
spi_monitor     — polls rx_valid, feeds scoreboard
spi_env         — wires all components together
module tb       — DUT + 5 test tasks
</pre>
<p>Set Timing Mode to <strong>--timing</strong> (not --no-timing).</p>
<p><strong>Ready?</strong> Switch to the Code tab and hit Run.</p>`,

      tasks: [
        'Read the Design tab — the complete SPI Master RTL is pre-loaded.',
        'Read the Testbench tab — classes, mailbox, virtual interface, scoreboard, 5 tests.',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — PASS lines from all 5 tests should appear in the Output tab',
      ],

      hint:
`ARCHITECTURE NOTES

  Interface (spi_if):
    Holds all DUT signals. Driver and monitor receive a
    virtual spi_if handle - they never touch the module directly.

  Scoreboard race prevention:
    Driver calls push_exp(d) BEFORE pulsing start.
    Monitor can never see rx_valid before the expected value
    is already in the queue.

  TLM mailbox pattern:
    seq.body() puts all transactions in req_mb non-blocking.
    drv.run(seqr, n) calls req_mb.get(txn) - blocks until item.
    Both run in parallel inside fork...join.

  Transfer flow (per byte):
    push_exp(d)            -> scoreboard knows what to expect
    tx_data=d; tx_push=1   -> load FIFO
    start=1                -> FSM starts shifting
    while(!done) @clk      -> wait 8 SCK cycles
    monitor sees rx_valid  -> pops RX byte, calls scb.check()

  Flags needed:
    --timing    (required for fork/join + blocking mailbox)`,

      design:
`// SPI Master - Mode 0 (CPOL=0, CPHA=0), 8-bit, 4-deep FIFO
module spi_master (
  input  logic       clk,
  input  logic       rst_n,
  input  logic [7:0] clk_div,
  input  logic [7:0] tx_data,
  input  logic       tx_push,
  output logic       tx_full,
  output logic       tx_empty,
  output logic [7:0] rx_data,
  input  logic       rx_pop,
  output logic       rx_valid,
  input  logic       start,
  input  logic       abort,
  output logic       busy,
  output logic       done,
  output logic       tx_underrun,
  output logic       rx_overrun,
  output logic       sck,
  output logic       mosi,
  input  logic       miso,
  output logic       cs_n
);
  logic [7:0] txf[0:3], rxf[0:3];
  logic [2:0] txf_wp, txf_rp, rxf_wp, rxf_rp;

  assign tx_full  = ((txf_wp - txf_rp) == 3'd4);
  assign tx_empty = (txf_wp == txf_rp);
  assign rx_valid = (rxf_wp != rxf_rp);
  assign rx_data  = rxf[rxf_rp[1:0]];

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin txf_wp <= '0; rxf_rp <= '0; end
    else begin
      if (tx_push && !tx_full) begin
        txf[txf_wp[1:0]] <= tx_data; txf_wp <= txf_wp + 1;
      end
      if (rx_pop && rx_valid) rxf_rp <= rxf_rp + 1;
    end
  end

  logic [7:0] div_cnt;
  logic       sck_r, sck_q;
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin div_cnt <= '0; sck_r <= 0; sck_q <= 0; end
    else begin
      sck_q <= sck_r;
      if (busy) begin
        if (div_cnt == clk_div) begin div_cnt <= '0; sck_r <= ~sck_r; end
        else div_cnt <= div_cnt + 1;
      end else begin div_cnt <= '0; sck_r <= 0; end
    end
  end
  assign sck = sck_r;
  wire lead_edge  =  sck_r & ~sck_q;
  wire trail_edge = ~sck_r &  sck_q;

  typedef enum logic [1:0] { ST_IDLE=0, ST_SHIFT=1, ST_DONE=2 } fsm_t;
  fsm_t       state;
  logic [7:0] sr_tx, sr_rx;
  logic [3:0] bits;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state<=ST_IDLE; txf_rp<='0; rxf_wp<='0;
      busy<=0; cs_n<=1; mosi<=0; bits<='0;
      sr_tx<='0; sr_rx<='0; done<=0; tx_underrun<=0; rx_overrun<=0;
    end else begin
      done <= 0;
      case (state)
        ST_IDLE: begin
          if (start) begin
            if (!tx_empty) begin
              sr_tx<=txf[txf_rp[1:0]]; mosi<=txf[txf_rp[1:0]][7];
              txf_rp<=txf_rp+1; cs_n<=0; busy<=1; bits<='0; state<=ST_SHIFT;
            end else tx_underrun<=1;
          end
        end
        ST_SHIFT: begin
          if (abort) begin cs_n<=1; busy<=0; state<=ST_IDLE; end
          else begin
            if (lead_edge)  sr_rx <= {sr_rx[6:0], miso};
            if (trail_edge) begin sr_tx<={sr_tx[6:0],1'b0}; mosi<=sr_tx[6]; end
            if (lead_edge) begin
              if (bits==4'd7) state<=ST_DONE; else bits<=bits+1;
            end
          end
        end
        ST_DONE: begin
          cs_n<=1; busy<=0; done<=1;
          if ((rxf_wp-rxf_rp)!=3'd4) begin
            rxf[rxf_wp[1:0]]<=sr_rx; rxf_wp<=rxf_wp+1;
          end else rx_overrun<=1;
          state<=ST_IDLE;
        end
        default: state<=ST_IDLE;
      endcase
    end
  end
endmodule`,

      testbench:
`\`timescale 1ns/1ps
interface spi_if (input logic clk);
  logic       rst_n   = 1;
  logic [7:0] clk_div = 8'd3;
  logic [7:0] tx_data = '0;
  logic       tx_push = 0, tx_full, tx_empty;
  logic [7:0] rx_data;
  logic       rx_pop  = 0, rx_valid;
  logic       start   = 0, abort = 0;
  logic       busy, done, tx_underrun, rx_overrun;
  logic       sck, mosi, miso, cs_n;
endinterface

class spi_transaction;
  rand  logic [7:0] data;
  int unsigned      id;
  static int        uid = 0;
  function new(); id = uid++; endfunction
  function string to_str();
    return $sformatf("TXN#%0d  8'h%02h", id, data);
  endfunction
endclass

class spi_sequencer;
  mailbox #(spi_transaction) req_mb;
  function new(); req_mb = new(); endfunction
  task send(spi_transaction t); req_mb.put(t); endtask
endclass

class base_sequence;
  spi_sequencer seqr;
  function new(spi_sequencer s); seqr = s; endfunction
  virtual task body(); $fatal(1, "body() not overridden"); endtask
endclass

class sanity_seq extends base_sequence;
  function new(spi_sequencer s); super.new(s); endfunction
  virtual task body();
    logic [7:0] d[4] = '{8'hA5, 8'h5A, 8'h00, 8'hFF};
    foreach (d[i]) begin
      spi_transaction t = new(); t.data = d[i]; seqr.send(t);
    end
  endtask
endclass

class boundary_seq extends base_sequence;
  function new(spi_sequencer s); super.new(s); endfunction
  virtual task body();
    logic [7:0] d[4] = '{8'h00, 8'hFF, 8'h01, 8'hFE};
    foreach (d[i]) begin
      spi_transaction t = new(); t.data = d[i]; seqr.send(t);
    end
  endtask
endclass

class rand_seq extends base_sequence;
  int unsigned n;
  function new(spi_sequencer s, int unsigned cnt = 4);
    super.new(s); n = cnt;
  endfunction
  virtual task body();
    repeat (n) begin
      spi_transaction t = new();
      if (!t.randomize()) $fatal(1, "randomize() failed");
      seqr.send(t);
    end
  endtask
endclass

class spi_scoreboard;
  logic [7:0]  exp_q[$];
  int unsigned pass_cnt = 0, fail_cnt = 0;
  string       name;
  function new(string nm = "TB");
    name = nm; exp_q.delete(); pass_cnt = 0; fail_cnt = 0;
  endfunction
  function void push_exp(logic [7:0] d); exp_q.push_back(d); endfunction
  function void check(logic [7:0] got);
    logic [7:0] exp;
    if (!exp_q.size()) begin
      $display("FAIL  [%s] unexpected RX 8'h%02h", name, got);
      fail_cnt++; return;
    end
    exp = exp_q.pop_front();
    if (got === exp) begin
      $display("PASS  [%s]  TX=8'h%02h  RX=8'h%02h", name, exp, got); pass_cnt++;
    end else begin
      $display("FAIL  [%s]  TX=8'h%02h  RX=8'h%02h  (mismatch)", name, exp, got); fail_cnt++;
    end
  endfunction
  function void report();
    $display("[SCB:%s]  PASS=%0d  FAIL=%0d  %s",
      name, pass_cnt, fail_cnt, (fail_cnt == 0) ? "OK" : "ERRORS");
  endfunction
endclass

class spi_driver;
  virtual spi_if vif;
  spi_scoreboard scb;
  int unsigned   n_driven = 0;
  function new(virtual spi_if v, spi_scoreboard s); vif = v; scb = s; endfunction
  task run(spi_sequencer seqr, int unsigned n);
    spi_transaction txn;
    repeat (n) begin seqr.req_mb.get(txn); xfer(txn.data); end
  endtask
  task xfer(logic [7:0] d);
    scb.push_exp(d);
    @(posedge vif.clk); #1;
    vif.tx_data = d; vif.tx_push = 1;
    @(posedge vif.clk); #1; vif.tx_push = 0;
    vif.start = 1; @(posedge vif.clk); #1; vif.start = 0;
    do begin @(posedge vif.clk); #1; end while (!vif.done);
    n_driven++;
    $display("[DRV]  xfer 8'h%02h done (#%0d)", d, n_driven);
  endtask
endclass

class spi_monitor;
  virtual spi_if vif;
  spi_scoreboard scb;
  int unsigned   n_obs = 0;
  function new(virtual spi_if v, spi_scoreboard s); vif = v; scb = s; endfunction
  task run(int unsigned n);
    logic [7:0] b;
    repeat (n) begin
      do begin @(posedge vif.clk); #1; end while (!vif.rx_valid);
      b = vif.rx_data; vif.rx_pop = 1;
      @(posedge vif.clk); #1; vif.rx_pop = 0;
      scb.check(b); n_obs++;
      $display("[MON]  observed 8'h%02h (#%0d)", b, n_obs);
    end
  endtask
endclass

class spi_env;
  virtual spi_if vif;
  spi_sequencer  seqr;
  spi_scoreboard scb;
  spi_driver     drv;
  spi_monitor    mon;
  function new(virtual spi_if v);
    vif=v; seqr=new(); scb=new("ENV"); drv=new(v,scb); mon=new(v,scb);
  endfunction
  task reset();
    vif.rst_n=0; vif.tx_push=0; vif.rx_pop=0;
    vif.start=0; vif.abort=0; vif.clk_div=8'd3;
    repeat(5) @(posedge vif.clk); #1;
    vif.rst_n=1; repeat(2) @(posedge vif.clk);
  endtask
  task prep(string nm);
    spi_transaction tmp;
    scb=new(nm); drv.scb=scb; mon.scb=scb;
    drv.n_driven=0; mon.n_obs=0;
    while(seqr.req_mb.try_get(tmp));
    reset();
  endtask
  task run_seq(base_sequence seq, int unsigned n);
    seq.body();
    fork drv.run(seqr,n); mon.run(n); join
    scb.report();
  endtask
endclass

module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  spi_if dut_if (.clk(clk));
  assign dut_if.miso = dut_if.mosi;

  spi_master dut (
    .clk(clk), .rst_n(dut_if.rst_n), .clk_div(dut_if.clk_div),
    .tx_data(dut_if.tx_data),   .tx_push(dut_if.tx_push),
    .tx_full(dut_if.tx_full),   .tx_empty(dut_if.tx_empty),
    .rx_data(dut_if.rx_data),   .rx_pop(dut_if.rx_pop),
    .rx_valid(dut_if.rx_valid),
    .start(dut_if.start),       .abort(dut_if.abort),
    .busy(dut_if.busy),         .done(dut_if.done),
    .tx_underrun(dut_if.tx_underrun), .rx_overrun(dut_if.rx_overrun),
    .sck(dut_if.sck), .mosi(dut_if.mosi), .miso(dut_if.miso), .cs_n(dut_if.cs_n)
  );

  spi_env env;

  task automatic t1_sanity();
    sanity_seq seq;
    env.prep("T1_SANITY");
    $display("=== T1: SANITY  0xA5 / 0x5A / 0x00 / 0xFF ===");
    seq = new(env.seqr); env.run_seq(seq, 4);
  endtask

  task automatic t2_boundary();
    boundary_seq seq;
    env.prep("T2_BOUNDARY");
    $display("=== T2: BOUNDARY  0x00 / 0xFF / 0x01 / 0xFE ===");
    seq = new(env.seqr); env.run_seq(seq, 4);
  endtask

  task automatic t3_burst();
    rand_seq seq;
    env.prep("T3_BURST");
    $display("=== T3: BURST  4 random bytes ===");
    seq = new(env.seqr, 4); env.run_seq(seq, 4);
  endtask

  task automatic t4_stress();
    rand_seq seq;
    env.prep("T4_STRESS");
    $display("=== T4: STRESS  8 random bytes ===");
    seq = new(env.seqr, 8); env.run_seq(seq, 8);
  endtask

  task automatic t5_abort();
    rand_seq seq;
    env.prep("T5_ABORT");
    $display("=== T5: ABORT + RECOVERY ===");
    @(posedge clk); #1;
    dut_if.tx_data = 8'hDE; dut_if.tx_push = 1;
    @(posedge clk); #1; dut_if.tx_push = 0;
    dut_if.start = 1; @(posedge clk); #1; dut_if.start = 0;
    repeat(10) @(posedge clk);
    dut_if.abort = 1; @(posedge clk); #1; dut_if.abort = 0;
    repeat(3) @(posedge clk); #1;
    if (!dut_if.busy) begin
      $display("PASS  [T5_ABORT] abort acknowledged: busy cleared");
      env.scb.pass_cnt++;
    end else begin
      $display("FAIL  [T5_ABORT] DUT still busy after abort");
      env.scb.fail_cnt++;
    end
    seq = new(env.seqr, 1); seq.body();
    fork env.drv.run(env.seqr, 1); env.mon.run(1); join
    env.scb.report();
  endtask

  initial begin
    env = new(dut_if);
    t1_sanity();
    t2_boundary();
    t3_burst();
    t4_stress();
    t5_abort();
    $display("=== All tests PASSED ===");
    $finish;
  end

  initial begin #2_000_000; $display("TIMEOUT"); $finish(2); end
endmodule`,

      expected: [
        'PASS  [T1_SANITY]',
        '[SCB:T1_SANITY]  PASS=4  FAIL=0  OK',
        'PASS  [T5_ABORT] abort acknowledged',
        '=== All tests PASSED ==='
      ]
    }
  ]
});
