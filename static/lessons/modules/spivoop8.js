(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop8',
  title: 'Ch.8 — SPI Environment',
  icon: '🌍',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop8l1',
      title: 'L1 — Every Test\'s Starting Point',
      files: [
        {
          name: 'spi_if.sv',
          from: 'spivoop4-spivoop4l1-design',
          fallback:
`interface spi_if;
  logic sclk, cs_n, mosi, miso;
endinterface`
        },
        {
          name: 'spi_transaction.sv',
          from: 'spivoop1-spivoop1l1-design',
          fallback:
`class spi_transaction;
  logic [7:0] data;
  function new(); data = 8'h00; endfunction
endclass`
        },
        {
          name: 'spi_scoreboard.sv',
          from: 'spivoop2-spivoop2l1-design',
          fallback:
`class spi_scoreboard;
  logic [7:0] exp_q[$];
  int passes = 0, fails = 0;

  function void push_exp(logic [7:0] d);
    exp_q.push_back(d);
  endfunction

  function void check(logic [7:0] actual);
    logic [7:0] exp;
    if (exp_q.size() == 0) begin
      $display("FAIL scoreboard: unexpected 8'h%0h", actual);
      fails++; return;
    end
    exp = exp_q.pop_front();
    if (actual === exp) begin
      $display("PASS scoreboard: got 8'h%0h (expected 8'h%0h)", actual, exp);
      passes++;
    end else begin
      $display("FAIL scoreboard: got 8'h%0h expected 8'h%0h", actual, exp);
      fails++;
    end
  endfunction

  function void report();
    $display("=== Scoreboard report: %0d PASS  %0d FAIL ===", passes, fails);
  endfunction
endclass`
        },
        {
          name: 'spi_driver.sv',
          from: 'spivoop5-spivoop5l1-design',
          fallback:
`class spi_driver;
  virtual spi_if vif;
  function new(virtual spi_if v); vif = v; endfunction
  task drive_byte(logic [7:0] data);
    vif.cs_n = 0; #2;
    for (int i = 7; i >= 0; i--) begin
      vif.mosi = data[i]; #2; vif.sclk = 1; #2; vif.sclk = 0; #2;
    end
    vif.cs_n = 1; #2;
  endtask
endclass`
        },
        {
          name: 'spi_monitor.sv',
          from: 'spivoop6-spivoop6l1-design',
          fallback:
`class spi_monitor;
  virtual spi_if             vif;
  mailbox #(spi_transaction) mbx;
  function new(virtual spi_if vif, mailbox #(spi_transaction) mbx);
    this.vif = vif; this.mbx = mbx;
  endfunction
  task run();
    spi_transaction txn; logic [7:0] captured;
    forever begin
      @(negedge vif.cs_n); captured = 8'h00;
      repeat(8) begin @(posedge vif.sclk); captured = {captured[6:0], vif.mosi}; end
      @(posedge vif.cs_n);
      txn = new(); txn.data = captured; mbx.put(txn);
    end
  endtask
endclass`
        },
        {
          name: 'spi_agent.sv',
          from: 'spivoop7-spivoop7l1-design',
          fallback:
`class spi_agent;
  spi_driver             drv;
  spi_monitor            mon;
  mailbox #(spi_transaction) stim_mbx, obs_mbx;
  function new(virtual spi_if vif);
    stim_mbx = new(); obs_mbx = new();
    drv = new(vif); mon = new(vif, obs_mbx);
  endfunction
  task run(int n);
    fork mon.run(); join_none
    repeat(n) begin
      spi_transaction txn; stim_mbx.get(txn); drv.drive_byte(txn.data);
    end
  endtask
endclass`
        },
        {
          name: 'spi_slave.sv',
          content:
`// spi_slave.sv — SPI Mode 0 behavioral slave
module spi_slave (
  input  logic       sclk, cs_n, mosi,
  output logic       miso,
  output logic [7:0] rx_byte
);
  logic [7:0] shift_reg = 8'h00;
  always_ff @(posedge sclk) begin
    if (!cs_n) shift_reg <= {shift_reg[6:0], mosi};
  end
  assign rx_byte = shift_reg;
  assign miso    = 1'b0;
endmodule`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>The Environment — Every Test's Starting Point</h2>
<p>An <strong>environment</strong> wires the agent and scoreboard together into one object. Every test instantiates exactly one env, queues stimulus into it, calls <code>run(n)</code>, and reads a report. Tests never reach inside the env to touch the agent or scoreboard directly — the env is the contract between the test and everything beneath it.</p>

<h3>Why this boundary matters</h3>
<p>If you add a second interface, swap the scoreboard for one that checks timing instead of data, or change the DUT, only the env changes — not the tests. Tests describe <em>what</em> to verify; the env handles <em>how</em>. This is the same principle as a unit test framework: the test writes assertions, the framework runs them.</p>

<h3>Env structure</h3>
<pre class="code-block">class spi_env;
  spi_agent      agent;   // driver + monitor + mailboxes
  spi_scoreboard scb;     // expected queue + pass/fail tracking

  function new(virtual spi_if vif);
    agent = new(vif);     // agent needs the interface handle
    scb   = new();        // scoreboard needs no arguments
  endfunction
endclass</pre>

<h3>What run(n) does inside</h3>
<table class="truth-table">
  <tr><th>Step</th><th>Call</th><th>Effect</th></tr>
  <tr><td>1</td><td><code>agent.run(n)</code></td><td>Drives n transactions; monitor fills <code>agent.obs_mbx</code></td></tr>
  <tr><td>2</td><td><code>agent.obs_mbx.get(obs)</code> ×n</td><td>Drain each captured transaction</td></tr>
  <tr><td>3</td><td><code>scb.check(obs.data)</code> ×n</td><td>Scoreboard compares each against its expected queue</td></tr>
</table>

<h3>A complete test — this is what Ch.9 onward looks like</h3>
<p>Once the env exists, writing a test takes four lines:</p>
<pre class="code-block">spi_env env = new(vif);

env.scb.push_exp(8'hA5);              // tell scoreboard what to expect
txn = new(); txn.data = 8'hA5;
env.agent.stim_mbx.put(txn);          // queue the stimulus

env.run(1);                            // drive + capture + check
env.report();                          // print PASS / FAIL summary</pre>

<p>That is a complete, self-checking test. Every test in Ch.9 onward follows this pattern — the only thing that changes is which bytes are sent and what is expected.</p>

<p><strong>Ready?</strong> Switch to the Code tab and write the env class. Stuck? Tap 💡 Show Hint for the complete solution.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare class spi_env with two members: spi_agent agent and spi_scoreboard scb',
        'Write function new(virtual spi_if vif) — create agent = new(vif) and scb = new()',
        'Write task run(int n):',
        '  Declare local: spi_transaction obs',
        '  Call agent.run(n) — drives and fills obs_mbx',
        '  Then repeat(n) begin  agent.obs_mbx.get(obs);  scb.check(obs.data);  end',
        'Write function void report() — delegate to scb.report()',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — scoreboard shows 3 PASS  0 FAIL and the final PASS line appears',
      ],
      hint:
`class spi_env;
  spi_agent      agent;
  spi_scoreboard scb;

  function new(virtual spi_if vif);
    agent = new(vif);
    scb   = new();
  endfunction

  task run(int n);
    spi_transaction obs;
    agent.run(n);
    repeat(n) begin
      agent.obs_mbx.get(obs);
      scb.check(obs.data);
    end
  endtask

  function void report();
    scb.report();
  endfunction
endclass`,
      design:
`// Build the spi_env class here. See Theory for the spec.
//
// Members:  spi_agent agent,  spi_scoreboard scb
//
// new(virtual spi_if vif): agent = new(vif);  scb = new();
//
// task run(int n):
//   agent.run(n)
//   repeat(n): agent.obs_mbx.get(obs);  scb.check(obs.data);
//
// function void report(): scb.report()
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  spi_if      vif();
  logic [7:0] rx_captured;

  spi_slave dut (
    .sclk(vif.sclk), .cs_n(vif.cs_n),
    .mosi(vif.mosi), .miso(vif.miso),
    .rx_byte(rx_captured)
  );

  initial begin
    spi_env         env;
    spi_transaction txn;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;

    env = new(vif);

    // Tell scoreboard what to expect
    env.scb.push_exp(8'hA5);
    env.scb.push_exp(8'h3C);
    env.scb.push_exp(8'hFF);

    // Queue stimulus into the agent
    txn = new(); txn.data = 8'hA5; env.agent.stim_mbx.put(txn);
    txn = new(); txn.data = 8'h3C; env.agent.stim_mbx.put(txn);
    txn = new(); txn.data = 8'hFF; env.agent.stim_mbx.put(txn);

    // Drive all 3, monitor captures, scoreboard checks
    env.run(3);
    env.report();

    if (env.scb.fails == 0)
      $display("PASS: spi_env works");
    else
      $display("FAIL: spi_env: %0d scoreboard failures", env.scb.fails);

    $finish;
  end
endmodule`,
      expected: [
        "PASS scoreboard: got 8'ha5",
        "=== Scoreboard report: 3 PASS  0 FAIL ===",
        "PASS: spi_env works"
      ]
    }
  ]
});
