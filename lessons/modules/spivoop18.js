(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop18',
  title: 'Ch.18 — Full Regression & Plusargs',
  icon: '📊',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop18l1',
      title: 'L1 — Every Test, One Command',
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
          name: 'spi_coverage_model.sv',
          content:
`// Coverage model from Ch.13 — read-only.
class spi_coverage_model;
  bit cov_zero=0, cov_all_ones=0, cov_alt_hi=0;
  bit cov_alt_lo=0, cov_msb_only=0, cov_lsb_only=0;
  bit cov_hi[16]; bit cov_lo[16];
  function void sample(logic [7:0] d);
    if (d===8'h00) cov_zero=1;     if (d===8'hFF) cov_all_ones=1;
    if (d===8'hAA) cov_alt_hi=1;   if (d===8'h55) cov_alt_lo=1;
    if (d===8'h80) cov_msb_only=1; if (d===8'h01) cov_lsb_only=1;
    cov_hi[d[7:4]]=1; cov_lo[d[3:0]]=1;
  endfunction
  function real get_coverage();
    int h=0;
    if(cov_zero)h++; if(cov_all_ones)h++; if(cov_alt_hi)h++;
    if(cov_alt_lo)h++; if(cov_msb_only)h++; if(cov_lsb_only)h++;
    foreach(cov_hi[i]) if(cov_hi[i]) h++;
    foreach(cov_lo[i]) if(cov_lo[i]) h++;
    return (real'(h)/38.0)*100.0;
  endfunction
endclass`
        },
        {
          name: 'spi_rand_transaction.sv',
          content:
`// Constrained-random transaction from Ch.14 — read-only.
class spi_rand_transaction extends spi_transaction;
  rand logic [7:0] data;
  rand bit         corner_mode;
  constraint c_nonzero { data != 8'h00; data != 8'hFF; }
  constraint c_corner  { if (corner_mode) data inside {8'hAA,8'h55,8'h80,8'h01}; }
endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Full Regression — Every Test, One Command</h2>
<p>A regression is the complete test suite run from start to finish. It runs on every code change and reports a single number: how many tests passed. If that number drops, the change broke something. The regression class is the orchestrator: it knows every test by name, runs them all, counts results, and prints a summary a CI system can parse.</p>

<h3>Part 1 — The regression class skeleton (line by line)</h3>
<pre class="code-block">class spi_regression;
  int pass_count = 0;   // incremented for every test that passes
  int fail_count = 0;   // incremented for every test that fails
  // Using int (not bit) because these are counters, not flags.
  // They must accumulate across many tests without wrapping at 1.

  task run_test(string name, bit result);
  //             └ test name   └ 1=passed 0=failed
    if (result) begin
      $display("PASS  %-20s", name);  // %-20s: left-align in 20-char field
      pass_count++;                   // aligned output makes regression logs scannable
    end else begin
      $display("FAIL  %-20s", name);
      fail_count++;
    end
  endtask
  // run_test is a helper, not a test itself.
  // Every real test calls this at the end to record its outcome.
endclass</pre>

<h3>Part 2 — Individual test tasks inside the class (line by line)</h3>
<pre class="code-block">  // Each test task:
  //   1. Drives stimulus
  //   2. Checks the result into a local 'ok' bit
  //   3. Calls run_test(name, ok) to log and count

  task run_smoke(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    automatic logic [7:0] smoke_bytes[4] = '{8'hA5, 8'h5A, 8'hFF, 8'h00};
    bit ok = 1;
    foreach (smoke_bytes[i]) begin
      drv.drive_byte(smoke_bytes[i]); #4;
      cov.sample(rx);
      if (rx !== smoke_bytes[i]) ok = 0;  // any mismatch fails the test
    end
    run_test("smoke", ok);   // log one result for the whole smoke suite
  endtask

  task run_directed(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    automatic logic [7:0] d_bytes[6] = '{8'hAA,8'h55,8'h80,8'h01,8'hDE,8'hAD};
    bit ok = 1;
    foreach (d_bytes[i]) begin
      drv.drive_byte(d_bytes[i]); #4;
      cov.sample(rx);
      if (rx !== d_bytes[i]) ok = 0;
    end
    run_test("directed", ok);
  endtask

  task run_random_cov(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    spi_rand_transaction txn = new();
    bit ok = 1;
    repeat(20) begin                   // 20 random frames for coverage
      if (!txn.randomize()) continue;
      drv.drive_byte(txn.data); #4;
      cov.sample(rx);
      if (rx !== txn.data) ok = 0;    // DUT must echo back exact data
    end
    run_test("random_coverage", (ok && cov.get_coverage() >= 50.0));
    // test fails if any frame is wrong OR if coverage is below 50%
  endtask</pre>

<h3>Part 3 — run_all() and report() (line by line)</h3>
<pre class="code-block">  task run_all(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    $display("=== SPI Regression Suite ===");
    run_smoke(drv, cov, rx);          // must pass first
    run_directed(drv, cov, rx);       // then directed
    run_random_cov(drv, cov, rx);     // then random
    // Order matters: if smoke fails, the DUT is broken and later tests are meaningless.
    // In professional regressions, a smoke failure can abort the whole run.
  endtask

  function void report();
    $display("--- Coverage: %.1f%% ---", 0.0);  // placeholder; testbench adds real value
    $display("=== Regression: %0d PASS  %0d FAIL ===", pass_count, fail_count);
    if (fail_count == 0)
      $display("PASS: full regression passed");
    else
      $display("FAIL: %0d test(s) failed", fail_count);
    // A CI system parses the last line: PASS = green build, FAIL = red build.
  endfunction</pre>

<h3>Part 4 — Plusargs: runtime test selection</h3>
<p>In professional simulators (VCS, Xcelium, Questa), you pass <code>+TEST=smoke</code> on the command line and the testbench reads it at runtime. This is how UVM’s <code>+UVM_TESTNAME</code> works.</p>
<pre class="code-block">// Professional usage (VCS/Xcelium/Questa):
string test_name;
if ($value$plusargs("TEST=%s", test_name)) begin
//   └ reads +TEST=... from the simulator command line into test_name
  case (test_name)
    "smoke"   : reg.run_smoke(drv, cov, rx);
    "directed": reg.run_directed(drv, cov, rx);
    default   : $fatal(1, "Unknown test: %s", test_name);
  endcase
end else begin
  reg.run_all(drv, cov, rx);  // no +TEST arg = regression mode
end</pre>
<table class="truth-table">
  <tr><th>Mechanism</th><th>Set at</th><th>This app</th><th>VCS/Xcelium/Questa</th></tr>
  <tr><td><code>\`ifdef</code></td><td>Compile time</td><td>⚙ Extra Flags: <code>-DRUN_SMOKE</code></td><td>Same</td></tr>
  <tr><td><code>$value$plusargs</code></td><td>Run time</td><td>Not supported (binary args)</td><td><code>+TEST=smoke</code></td></tr>
</table>
<p>This app uses <code>\`ifdef</code>. The plusargs pattern is shown so you know the equivalent when you move to a professional tool.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build the complete <code>spi_regression</code> class. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare class spi_regression; with int pass_count=0; fail_count=0;',
        'Write task run_test(string name, bit result):',
        '  if result: $display("PASS  %-20s", name); pass_count++;',
        '  else:      $display("FAIL  %-20s", name); fail_count++;',
        'Write task run_smoke(spi_driver drv, spi_coverage_model cov, ref logic[7:0] rx):',
        '  Drive 4 smoke bytes (A5, 5A, FF, 00); check rx===byte for each; call run_test("smoke", ok)',
        'Write task run_directed(...): 6 directed bytes (AA,55,80,01,DE,AD); call run_test("directed", ok)',
        'Write task run_random_cov(...): 20 random frames via spi_rand_transaction; call run_test("random_coverage", ok && cov>=50%)',
        'Write task run_all(...): $display header then call all 3 test tasks in order',
        'Write function void report(): print counts, PASS or FAIL final line',
        'Close with endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — see PASS smoke, PASS directed, PASS random_coverage, then PASS: full regression passed.',
      ],

      hint:
`class spi_regression;
  int pass_count = 0;
  int fail_count = 0;

  task run_test(string name, bit result);
    if (result) begin
      $display("PASS  %-20s", name); pass_count++;
    end else begin
      $display("FAIL  %-20s", name); fail_count++;
    end
  endtask

  task run_smoke(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    automatic logic [7:0] bytes[4] = '{8'hA5, 8'h5A, 8'hFF, 8'h00};
    bit ok = 1;
    foreach (bytes[i]) begin
      drv.drive_byte(bytes[i]); #4;
      cov.sample(rx);
      if (rx !== bytes[i]) ok = 0;
    end
    run_test("smoke", ok);
  endtask

  task run_directed(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    automatic logic [7:0] bytes[6] = '{8'hAA,8'h55,8'h80,8'h01,8'hDE,8'hAD};
    bit ok = 1;
    foreach (bytes[i]) begin
      drv.drive_byte(bytes[i]); #4;
      cov.sample(rx);
      if (rx !== bytes[i]) ok = 0;
    end
    run_test("directed", ok);
  endtask

  task run_random_cov(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    spi_rand_transaction txn = new();
    bit ok = 1;
    repeat(20) begin
      if (!txn.randomize()) continue;
      drv.drive_byte(txn.data); #4;
      cov.sample(rx);
      if (rx !== txn.data) ok = 0;
    end
    run_test("random_coverage", (ok && cov.get_coverage() >= 50.0));
  endtask

  task run_all(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx);
    $display("=== SPI Regression Suite ===");
    run_smoke     (drv, cov, rx);
    run_directed  (drv, cov, rx);
    run_random_cov(drv, cov, rx);
  endtask

  function void report();
    $display("=== Regression: %0d PASS  %0d FAIL ===", pass_count, fail_count);
    if (fail_count == 0)
      $display("PASS: full regression passed");
    else
      $display("FAIL: %0d test(s) failed", fail_count);
  endfunction
endclass`,

      design:
`// Build the spi_regression class here.
//
// class spi_regression;
//   int pass_count = 0;  fail_count = 0;
//
//   task run_test(string name, bit result)
//     PASS/FAIL display with %-20s, increment counter
//
//   task run_smoke(spi_driver drv, spi_coverage_model cov, ref logic[7:0] rx)
//     Drive: A5, 5A, FF, 00 -- check rx===byte -- run_test("smoke", ok)
//
//   task run_directed(spi_driver drv, spi_coverage_model cov, ref logic[7:0] rx)
//     Drive: AA, 55, 80, 01, DE, AD -- run_test("directed", ok)
//
//   task run_random_cov(spi_driver drv, spi_coverage_model cov, ref logic[7:0] rx)
//     20 random frames via spi_rand_transaction
//     run_test("random_coverage", ok && cov.get_coverage()>=50.0)
//
//   task run_all(drv, cov, rx)
//     header, then call all 3 tasks
//
//   function void report()
//     counts + PASS/FAIL summary
//
// endclass
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  spi_if      vif();
  logic [7:0] rx_byte;

  spi_slave dut (
    .sclk(vif.sclk), .cs_n(vif.cs_n),
    .mosi(vif.mosi), .miso(vif.miso),
    .rx_byte(rx_byte)
  );

  initial begin
    spi_driver        drv;
    spi_coverage_model cov;
    spi_regression     reg_suite;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv       = new(vif);
    cov       = new();
    reg_suite = new();

    // ── Test selector ──────────────────────────────────────────────────
    // Default (no Extra Flags): run_all()  → full regression
    // Single test: add -DRUN_SINGLE -DRUN_SMOKE in ⚙ Options -> Extra Flags
    //
    // In VCS/Xcelium/Questa you would instead use plusargs at runtime:
    //   +TEST=smoke   ->  reg_suite.run_smoke(drv, cov, rx_byte)
    //   (no arg)      ->  reg_suite.run_all(drv, cov, rx_byte)
\`ifdef RUN_SINGLE
  \`ifdef RUN_SMOKE   reg_suite.run_smoke     (drv, cov, rx_byte); \`endif
  \`ifdef RUN_DIR     reg_suite.run_directed  (drv, cov, rx_byte); \`endif
  \`ifdef RUN_RAND    reg_suite.run_random_cov(drv, cov, rx_byte); \`endif
\`else
    reg_suite.run_all(drv, cov, rx_byte);
\`endif

    $display("--- Coverage: %.1f%% ---", cov.get_coverage());
    reg_suite.report();
    $finish;
  end
endmodule`,

      expected: [
        "PASS  smoke",
        "PASS  directed",
        "PASS: full regression passed"
      ]
    }
  ]
});
