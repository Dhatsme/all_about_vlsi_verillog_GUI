(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop9',
  title: 'Ch.9 — Test Taxonomy & Smoke Tests',
  icon: '🔬',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop9l1',
      title: 'L1 — Know What You\'re Testing',
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
  function void push_exp(logic [7:0] d); exp_q.push_back(d); endfunction
  function void check(logic [7:0] actual);
    logic [7:0] exp;
    if (exp_q.size() == 0) begin fails++; return; end
    exp = exp_q.pop_front();
    if (actual === exp) begin
      $display("PASS scoreboard: got 8'h%0h (expected 8'h%0h)", actual, exp); passes++;
    end else begin
      $display("FAIL scoreboard: got 8'h%0h expected 8'h%0h", actual, exp); fails++;
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
  virtual spi_if vif;
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
  spi_driver drv; spi_monitor mon;
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
          name: 'spi_env.sv',
          from: 'spivoop8-spivoop8l1-design',
          fallback:
`class spi_env;
  spi_agent      agent;
  spi_scoreboard scb;
  function new(virtual spi_if vif);
    agent = new(vif); scb = new();
  endfunction
  task run(int n);
    spi_transaction obs;
    agent.run(n);
    repeat(n) begin agent.obs_mbx.get(obs); scb.check(obs.data); end
  endtask
  function void report(); scb.report(); endfunction
endclass`
        },
        {
          name: 'spi_slave.sv',
          content:
`module spi_slave (
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
`<h2>Test Taxonomy — Know What You\'re Testing Before You Test It</h2>
<p>Writing 40 tests without a plan produces 40 similar tests that find the same bugs. Before writing any test, assign it to a category. The category tells you what the test must prove, how long it may take, and what failure means. This chapter introduces the taxonomy and the first category: smoke tests.</p>

<h3>The five test categories</h3>
<table class="truth-table">
  <tr><th>Category</th><th>Purpose</th><th>Count</th><th>Runtime</th></tr>
  <tr><td><strong>Smoke</strong></td><td>Prove the environment is alive. If this fails, stop.</td><td>2–5</td><td>&lt; 10 s</td></tr>
  <tr><td><strong>Directed</strong></td><td>Test one specific scenario you designed by hand.</td><td>10–20</td><td>seconds</td></tr>
  <tr><td><strong>Assertion</strong></td><td>Check a protocol rule holds across all time, not just at one moment.</td><td>5–10 properties</td><td>always on</td></tr>
  <tr><td><strong>Random</strong></td><td>Explore the space you didn\'t think to check manually.</td><td>hundreds</td><td>minutes</td></tr>
  <tr><td><strong>Coverage-guided</strong></td><td>Run until a coverage goal is met, not until N tests pass.</td><td>goal-driven</td><td>hours</td></tr>
</table>

<h3>What makes a smoke test</h3>
<p>A smoke test has three rules:</p>
<ul>
  <li>It tests the most basic end-to-end path — if this is broken, nothing else is worth running.</li>
  <li>It runs in seconds, not minutes — it is part of every build, not just nightly regression.</li>
  <li>A failing smoke test is a blocker: the build is broken until it passes.</li>
</ul>
<p>For SPI, the three smoke tests are: send a typical byte (8\'hA5), send all zeros (8\'h00), send all ones (8\'hFF). These cover the most common failure modes — stuck bits, inverted logic, and shift-register reset bugs — in three frames.</p>

<h3>Test class pattern</h3>
<p>Each test is a task inside a <code>spi_tests</code> class. The env is passed in as an argument — the test doesn\'t create or own the env, it just uses it. This lets the same test run against different environments in later chapters.</p>
<pre class="code-block">class spi_tests;
  task run_smoke_basic(spi_env env);
    spi_transaction txn;
    int prev_fails = env.scb.fails;  // snapshot before this test
    env.scb.push_exp(8'hA5);
    txn = new(); txn.data = 8'hA5;
    env.agent.stim_mbx.put(txn);
    env.run(1);
    if (env.scb.fails == prev_fails)
      $display("PASS smoke_basic");
    else
      $display("FAIL smoke_basic");
  endtask
  // ... smoke_zeros, smoke_ones
endclass</pre>

<h3>\`ifdef test selector</h3>
<p>The testbench wraps each test call in a compile-time guard. With no flags, all tests run (regression mode). Add <code>-DRUN_SINGLE -DRUN_SMOKE_BASIC</code> in ⚙ Options → Extra Flags to run just one test — this is how verification teams isolate a failing test without rewriting the testbench.</p>
<pre class="code-block">\`ifdef RUN_SINGLE
  \`ifdef RUN_SMOKE_BASIC  tests.run_smoke_basic(env);  \`endif
  \`ifdef RUN_SMOKE_ZEROS  tests.run_smoke_zeros(env);  \`endif
\`else
  tests.run_smoke_basic(env);   // regression: run all
  tests.run_smoke_zeros(env);
\`endif</pre>

<p><strong>Ready?</strong> Switch to the Code tab and write the three smoke test tasks. Stuck? Tap 💡 Show Hint for the complete solution.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare class spi_tests (no member variables needed — just three tasks)',
        'Write task run_smoke_basic(spi_env env):',
        '  Declare: spi_transaction txn;  int prev_fails = env.scb.fails;',
        "  $display(\"--- smoke_basic: sending 8'hA5 ---\");",
        "  Push expected: env.scb.push_exp(8'hA5);",
        "  Queue txn: txn = new(); txn.data = 8'hA5; env.agent.stim_mbx.put(txn);",
        '  Drive: env.run(1);',
        '  Print PASS or FAIL based on: env.scb.fails == prev_fails',
        'Write run_smoke_zeros(spi_env env) — same pattern, byte is 8\'h00',
        'Write run_smoke_ones(spi_env env) — same pattern, byte is 8\'hFF',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run (no Extra Flags) — all 3 PASS lines appear. Then try -DRUN_SINGLE -DRUN_SMOKE_BASIC to run just one.',
      ],
      hint:
`class spi_tests;

  task run_smoke_basic(spi_env env);
    spi_transaction txn;
    int prev_fails = env.scb.fails;
    $display("--- smoke_basic: sending 8'hA5 ---");
    env.scb.push_exp(8'hA5);
    txn = new(); txn.data = 8'hA5;
    env.agent.stim_mbx.put(txn);
    env.run(1);
    if (env.scb.fails == prev_fails)
      $display("PASS smoke_basic");
    else
      $display("FAIL smoke_basic");
  endtask

  task run_smoke_zeros(spi_env env);
    spi_transaction txn;
    int prev_fails = env.scb.fails;
    $display("--- smoke_zeros: sending 8'h00 ---");
    env.scb.push_exp(8'h00);
    txn = new(); txn.data = 8'h00;
    env.agent.stim_mbx.put(txn);
    env.run(1);
    if (env.scb.fails == prev_fails)
      $display("PASS smoke_zeros");
    else
      $display("FAIL smoke_zeros");
  endtask

  task run_smoke_ones(spi_env env);
    spi_transaction txn;
    int prev_fails = env.scb.fails;
    $display("--- smoke_ones: sending 8'hFF ---");
    env.scb.push_exp(8'hFF);
    txn = new(); txn.data = 8'hFF;
    env.agent.stim_mbx.put(txn);
    env.run(1);
    if (env.scb.fails == prev_fails)
      $display("PASS smoke_ones");
    else
      $display("FAIL smoke_ones");
  endtask

endclass`,
      design:
`// Type the spi_tests class here. See Theory for the pattern.
//
// Three smoke test tasks, each taking spi_env env as argument:
//   run_smoke_basic  — sends 8'hA5
//   run_smoke_zeros  — sends 8'h00
//   run_smoke_ones   — sends 8'hFF
//
// Pattern per test:
//   int prev_fails = env.scb.fails;
//   env.scb.push_exp(<byte>);
//   txn = new(); txn.data = <byte>; env.agent.stim_mbx.put(txn);
//   env.run(1);
//   print PASS or FAIL based on env.scb.fails == prev_fails
//
// Delete this and start typing:
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
    spi_env   env;
    spi_tests tests;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;

    env   = new(vif);
    tests = new();

    // ── Test selection ─────────────────────────────────────────────────────
    // Default (no Extra Flags): all 3 smoke tests run in sequence (regression)
    // Single test: add  -DRUN_SINGLE -DRUN_SMOKE_BASIC  in ⚙ Options -> Extra Flags
\`ifdef RUN_SINGLE
  \`ifdef RUN_SMOKE_BASIC  tests.run_smoke_basic(env);  \`endif
  \`ifdef RUN_SMOKE_ZEROS  tests.run_smoke_zeros(env);  \`endif
  \`ifdef RUN_SMOKE_ONES   tests.run_smoke_ones(env);   \`endif
\`else
    tests.run_smoke_basic(env);
    tests.run_smoke_zeros(env);
    tests.run_smoke_ones(env);
\`endif

    env.report();

    if (env.scb.fails == 0)
      $display("PASS: all smoke tests passed");
    else
      $display("FAIL: %0d smoke test(s) failed", env.scb.fails);

    $finish;
  end
endmodule`,
      expected: [
        "PASS smoke_basic",
        "PASS smoke_ones",
        "PASS: all smoke tests passed"
      ]
    }
  ]
});
