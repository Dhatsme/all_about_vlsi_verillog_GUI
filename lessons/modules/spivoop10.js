(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop10',
  title: 'Ch.10 — Directed Tests',
  icon: '🎯',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop10l1',
      title: 'L1 — Eight Reference Tests + Two You Write',
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
        },
        {
          name: 'spi_directed_ref.sv',
          content:
`// Reference implementation — read-only.
// spi_directed_base provides 8 directed tests and the send_one() helper.
// Your spi_directed_tests class (in the Code tab) extends this base.
class spi_directed_base;

  // Drive one byte, wait for monitor to capture it, check scoreboard.
  task automatic send_one(spi_env env, logic [7:0] b);
    spi_transaction obs;
    env.scb.push_exp(b);
    env.agent.drv.drive_byte(b);
    env.agent.obs_mbx.get(obs);
    env.scb.check(obs.data);
  endtask

  task run_alternating_hi(spi_env env);
    int pf = env.scb.fails;
    $display("--- alternating_hi: 8'hAA ---");
    send_one(env, 8'hAA);
    $display(env.scb.fails == pf ? "PASS alternating_hi" : "FAIL alternating_hi");
  endtask

  task run_alternating_lo(spi_env env);
    int pf = env.scb.fails;
    $display("--- alternating_lo: 8'h55 ---");
    send_one(env, 8'h55);
    $display(env.scb.fails == pf ? "PASS alternating_lo" : "FAIL alternating_lo");
  endtask

  task run_msb_check(spi_env env);
    int pf = env.scb.fails;
    $display("--- msb_check: 8'h80 (only MSB set) ---");
    send_one(env, 8'h80);
    $display(env.scb.fails == pf ? "PASS msb_check" : "FAIL msb_check");
  endtask

  task run_lsb_check(spi_env env);
    int pf = env.scb.fails;
    $display("--- lsb_check: 8'h01 (only LSB set) ---");
    send_one(env, 8'h01);
    $display(env.scb.fails == pf ? "PASS lsb_check" : "FAIL lsb_check");
  endtask

  task run_back_to_back(spi_env env);
    int pf = env.scb.fails;
    $display("--- back_to_back: 3 frames DE AD BE ---");
    send_one(env, 8'hDE); send_one(env, 8'hAD); send_one(env, 8'hBE);
    $display(env.scb.fails == pf ? "PASS back_to_back" : "FAIL back_to_back");
  endtask

  task run_multi_byte(spi_env env);
    int pf = env.scb.fails;
    $display("--- multi_byte: 4 frames 12 34 56 78 ---");
    send_one(env, 8'h12); send_one(env, 8'h34);
    send_one(env, 8'h56); send_one(env, 8'h78);
    $display(env.scb.fails == pf ? "PASS multi_byte" : "FAIL multi_byte");
  endtask

  task run_walking_ones(spi_env env);
    int pf = env.scb.fails;
    $display("--- walking_ones: 8 frames 01 02 04 ... 80 ---");
    send_one(env, 8'h01); send_one(env, 8'h02);
    send_one(env, 8'h04); send_one(env, 8'h08);
    send_one(env, 8'h10); send_one(env, 8'h20);
    send_one(env, 8'h40); send_one(env, 8'h80);
    $display(env.scb.fails == pf ? "PASS walking_ones" : "FAIL walking_ones");
  endtask

  task run_frame_integrity(spi_env env);
    int pf = env.scb.fails;
    $display("--- frame_integrity: A5 then 5A ---");
    send_one(env, 8'hA5); send_one(env, 8'h5A);
    $display(env.scb.fails == pf ? "PASS frame_integrity" : "FAIL frame_integrity");
  endtask

endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Directed Tests — One Scenario, One Purpose</h2>
<p>A directed test is hand-crafted to exercise one specific behaviour. You know exactly what you are sending, exactly what the DUT should return, and exactly why the test exists. The opposite of a directed test is a random test — you let the tool choose the data. Both have a place; directed tests come first because they document intent and catch predictable bugs fast.</p>

<h3>Inheritance: extending a base class</h3>
<p>The reference file <code>spi_directed_ref.sv</code> (read-only, already loaded) contains <code>spi_directed_base</code> with eight complete tests and a <code>send_one()</code> helper. Your job is to write <code>spi_directed_tests</code> that <strong>extends</strong> the base class and adds two new tests.</p>
<pre class="code-block">class spi_directed_tests extends spi_directed_base;
  task run_nibble_hi(spi_env env);
    int pf = env.scb.fails;
    $display("--- nibble_hi: 8'hF0 ---");
    send_one(env, 8'hF0);   // inherited from base
    $display(env.scb.fails == pf ? "PASS nibble_hi" : "FAIL nibble_hi");
  endtask
  // ... run_nibble_lo
endclass</pre>

<h3>How send_one() works</h3>
<p><code>send_one(env, byte)</code> pushes the expected value to the scoreboard, drives the byte directly via <code>env.agent.drv.drive_byte()</code>, then waits for the monitor to capture it via <code>env.agent.obs_mbx.get()</code> and checks it. One call = one SPI frame, fully verified.</p>

<h3>Single-test isolation with \`ifdef</h3>
<p>Add <code>-DRUN_SINGLE -DRUN_NIBBLE_HI</code> in ⚙ Options → Extra Flags to run only <code>run_nibble_hi</code>. No flags = all 10 tests run in regression order. This is the same compile-time flag pattern used in professional regression suites.</p>

<h3>The eight reference tests</h3>
<table class="truth-table">
  <tr><th>Test</th><th>Byte(s)</th><th>What it catches</th></tr>
  <tr><td>alternating_hi</td><td>AA</td><td>stuck-at-0 on any bit</td></tr>
  <tr><td>alternating_lo</td><td>55</td><td>stuck-at-1 on any bit</td></tr>
  <tr><td>msb_check</td><td>80</td><td>MSB lost or inverted</td></tr>
  <tr><td>lsb_check</td><td>01</td><td>LSB lost or inverted</td></tr>
  <tr><td>back_to_back</td><td>DE AD BE</td><td>cs_n glitch between frames</td></tr>
  <tr><td>multi_byte</td><td>12 34 56 78</td><td>shift-register not flushed</td></tr>
  <tr><td>walking_ones</td><td>01→80</td><td>each bit lane independently</td></tr>
  <tr><td>frame_integrity</td><td>A5 5A</td><td>bit-mirror bug</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and write the two nibble tests. Stuck? Tap 💡 Show Hint for the complete class.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        "Declare: class spi_directed_tests extends spi_directed_base;",
        "Write task run_nibble_hi(spi_env env):",
        "  int pf = env.scb.fails;",
        "  $display(\"--- nibble_hi: 8'hF0 ---\");",
        "  send_one(env, 8'hF0);  // inherited helper drives + checks",
        "  $display(env.scb.fails == pf ? \"PASS nibble_hi\" : \"FAIL nibble_hi\");",
        "Write task run_nibble_lo(spi_env env) — same pattern, byte is 8'h0F",
        'Close the class with endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run (no Extra Flags) — all 10 PASS lines appear.',
        'Then add -DRUN_SINGLE -DRUN_NIBBLE_LO in Extra Flags and run again — only nibble_lo runs.',
      ],
      hint:
`class spi_directed_tests extends spi_directed_base;

  task run_nibble_hi(spi_env env);
    int pf = env.scb.fails;
    $display("--- nibble_hi: 8'hF0 (upper nibble) ---");
    send_one(env, 8'hF0);
    $display(env.scb.fails == pf ? "PASS nibble_hi" : "FAIL nibble_hi");
  endtask

  task run_nibble_lo(spi_env env);
    int pf = env.scb.fails;
    $display("--- nibble_lo: 8'h0F (lower nibble) ---");
    send_one(env, 8'h0F);
    $display(env.scb.fails == pf ? "PASS nibble_lo" : "FAIL nibble_lo");
  endtask

endclass`,
      design:
`// Extend spi_directed_base and add two new directed tests.
//
// class spi_directed_tests extends spi_directed_base;
//
//   task run_nibble_hi(spi_env env);
//     // sends 8'hF0 — upper nibble set, lower nibble clear
//     // use: send_one(env, 8'hF0);  <-- inherited from base
//   endtask
//
//   task run_nibble_lo(spi_env env);
//     // sends 8'h0F — lower nibble set, upper nibble clear
//   endtask
//
// endclass
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
    spi_env            env;
    spi_directed_tests tests;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;

    env   = new(vif);
    tests = new();

    // Start monitor once — shared across all directed tests
    fork env.agent.mon.run(); join_none

    // ── Test selector ──────────────────────────────────────────────────────
    // Default (no flags): all 10 tests run in order  (regression)
    // Single test: -DRUN_SINGLE -DRUN_NIBBLE_HI  in ⚙ Options -> Extra Flags
\`ifdef RUN_SINGLE
  \`ifdef RUN_ALT_HI       tests.run_alternating_hi(env);  \`endif
  \`ifdef RUN_ALT_LO       tests.run_alternating_lo(env);  \`endif
  \`ifdef RUN_MSB          tests.run_msb_check(env);       \`endif
  \`ifdef RUN_LSB          tests.run_lsb_check(env);       \`endif
  \`ifdef RUN_BTB          tests.run_back_to_back(env);    \`endif
  \`ifdef RUN_MULTI        tests.run_multi_byte(env);      \`endif
  \`ifdef RUN_WALKING      tests.run_walking_ones(env);    \`endif
  \`ifdef RUN_INTEGRITY    tests.run_frame_integrity(env); \`endif
  \`ifdef RUN_NIBBLE_HI    tests.run_nibble_hi(env);       \`endif
  \`ifdef RUN_NIBBLE_LO    tests.run_nibble_lo(env);       \`endif
\`else
    tests.run_alternating_hi(env);
    tests.run_alternating_lo(env);
    tests.run_msb_check(env);
    tests.run_lsb_check(env);
    tests.run_back_to_back(env);
    tests.run_multi_byte(env);
    tests.run_walking_ones(env);
    tests.run_frame_integrity(env);
    tests.run_nibble_hi(env);
    tests.run_nibble_lo(env);
\`endif

    env.report();

    if (env.scb.fails == 0)
      $display("PASS: all directed tests passed");
    else
      $display("FAIL: %0d directed test(s) failed", env.scb.fails);

    $finish;
  end
endmodule`,
      expected: [
        "PASS alternating_hi",
        "PASS nibble_lo",
        "PASS: all directed tests passed"
      ]
    }
  ]
});
