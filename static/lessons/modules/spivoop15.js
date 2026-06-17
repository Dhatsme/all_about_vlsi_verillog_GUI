(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop15',
  title: 'Ch.15 — Coverage-Driven Closure',
  icon: '🎯',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop15l1',
      title: 'L1 — Run Until Done, Not Until N Tests Pass',
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
  bit cov_zero = 0, cov_all_ones = 0, cov_alt_hi = 0;
  bit cov_alt_lo = 0, cov_msb_only = 0, cov_lsb_only = 0;
  bit cov_hi[16];
  bit cov_lo[16];

  function void sample(logic [7:0] data);
    if (data === 8'h00) cov_zero     = 1;
    if (data === 8'hFF) cov_all_ones = 1;
    if (data === 8'hAA) cov_alt_hi   = 1;
    if (data === 8'h55) cov_alt_lo   = 1;
    if (data === 8'h80) cov_msb_only = 1;
    if (data === 8'h01) cov_lsb_only = 1;
    cov_hi[ data[7:4] ] = 1;
    cov_lo[ data[3:0] ] = 1;
  endfunction

  function real get_coverage();
    int hit = 0;
    if (cov_zero)     hit++; if (cov_all_ones) hit++;
    if (cov_alt_hi)   hit++; if (cov_alt_lo)   hit++;
    if (cov_msb_only) hit++; if (cov_lsb_only) hit++;
    foreach (cov_hi[i]) if (cov_hi[i]) hit++;
    foreach (cov_lo[i]) if (cov_lo[i]) hit++;
    return (real'(hit) / 38.0) * 100.0;
  endfunction

  function void report(string label = "");
    int hi_c = 0, lo_c = 0;
    foreach (cov_hi[i]) if (cov_hi[i]) hi_c++;
    foreach (cov_lo[i]) if (cov_lo[i]) lo_c++;
    $display("Coverage%s: %.1f%%  corners=%0d/6  hi=%0d/16  lo=%0d/16",
      label, get_coverage(),
      cov_zero+cov_all_ones+cov_alt_hi+cov_alt_lo+cov_msb_only+cov_lsb_only,
      hi_c, lo_c);
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
  constraint c_corner {
    if (corner_mode)
      data inside {8'hAA, 8'h55, 8'h80, 8'h01};
  }
endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Coverage-Driven Closure — Run Until Done</h2>
<p>Every verification plan has a <strong>coverage goal</strong>: a number like 95% above which the team declares the DUT sufficiently tested. The simulation does not stop after a fixed number of tests. It stops when coverage meets the goal. This is coverage-driven closure, and it is the standard exit criterion for every tapeout from a chip company.</p>

<h3>Why fixed test counts are wrong</h3>
<p>If you run 1000 random tests but they all fall in the same coverage bins, you have 1000 tests and 30% coverage. If you run 47 targeted tests that hit every bin, you are done. A fixed test count cannot tell you which situation you are in. A coverage goal can.</p>

<h3>Part 1 — The closure class skeleton</h3>
<pre class="code-block">class spi_coverage_test;

  task automatic run_to_goal(
    spi_driver         drv,      // drives SPI bytes into the DUT
    spi_coverage_model cov,      // tracks which bins have been hit
    ref logic [7:0]    rx,       // live DUT output — read after each drive
    real               goal_pct, // stop when coverage reaches this %
    int                max_txns  // safety valve: never loop more than this
  );
    spi_rand_transaction txn = new();
    // └ one transaction object, reused across all iterations
    //   randomize() generates a new value each call; the object is not recreated

    int count = 0;
    // └ counts random transactions driven in Phase 2
    //   Phase 1 (corner seeding) is separate and not counted here

endtask
endclass</pre>

<h3>Part 2 — Phase 1: directed corner seed</h3>
<p>Random stimulus alone is slow to hit corner cases like 8'h00 or 8'hFF. Drive them first as directed tests, then let random fill the rest. This is the directed+random pyramid used in all professional environments.</p>
<pre class="code-block">    // Seed with 6 corner values first (directed, guaranteed to hit)
    begin
      automatic logic [7:0] corners[6] = '{8'h00,8'hFF,8'hAA,8'h55,8'h80,8'h01};
      // automatic  → block-local variable (new each time this begin..end runs)
      // '{...}    → array literal: 6 values in order
      foreach (corners[i]) begin
        drv.drive_byte(corners[i]);    // drive corner byte
        #4;                            // wait for DUT shift register to settle
        cov.sample(rx);               // rx is the live DUT output read right now
      end
    end
    $display("[seed] after 6 corners: %.1f%%", cov.get_coverage());
    // %.1f  → format real with 1 decimal place</pre>

<h3>Part 3 — Phase 2: the closure loop</h3>
<p>This is the heart of coverage-driven verification. The loop condition checks two things on every iteration: has the goal been met? Has the safety limit been hit? Both must be false to continue.</p>
<pre class="code-block">    while (cov.get_coverage() &lt; goal_pct &amp;&amp; count &lt; max_txns) begin
    // └ goal not yet met           └ safety valve not triggered
    //   If goal is met, exit immediately — no extra tests.
    //   If max_txns is hit, exit with a warning — coverage gap exists.

      if (!txn.randomize()) begin   // randomize() returns 0 on constraint failure
        count++; continue;          // skip this iteration but count it (avoid infinite loop)
      end

      drv.drive_byte(txn.data);     // drive the new random byte
      #4;                           // #4 ns: DUT latches 8 bits at 2ns/bit
      cov.sample(rx);              // sample the DUT output into coverage bins
      count++;

      if (count % 10 == 0)          // every 10 transactions: print a progress report
        $display("[%0d txns] coverage = %.1f%%", count, cov.get_coverage());
        // count % 10 == 0  → modulo: true at 10, 20, 30...
    end</pre>

<h3>Part 4 — Final report</h3>
<pre class="code-block">    // After the loop: did we succeed or hit the safety valve?
    if (cov.get_coverage() >= goal_pct)
      $display("PASS goal_met: %.1f%% achieved in %0d random txns",
               cov.get_coverage(), count);
    else
      $display("WARN max_txns hit: %.1f%% after %0d txns — add constraints",
               cov.get_coverage(), count);
    // └ WARN not FAIL: low coverage is a verification gap, not a DUT bug.
    //   The action is to improve the testbench, not the DUT.</pre>

<h3>Coverage convergence curve</h3>
<p>Coverage climbs fast at first (easy bins fill up), then slows as only rare values remain. The last 5–10% is the hardest to close. When the curve flattens, add targeted constraints to force the simulator into the uncovered region rather than running more random tests. This is called <strong>biased randomisation</strong>.</p>
<p><strong>Ready?</strong> Switch to the Code tab and assemble the full <code>spi_coverage_test</code> class. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare: class spi_coverage_test;',
        'Write: task automatic run_to_goal(spi_driver drv, spi_coverage_model cov, ref logic [7:0] rx, real goal_pct, int max_txns);',
        '  Declare: spi_rand_transaction txn = new();  int count = 0;',
        '  Phase 1 — directed seed: use automatic logic[7:0] corners[6] array + foreach loop',
        '  Each iteration: drv.drive_byte(corners[i]); #4; cov.sample(rx);',
        "  After loop: $display(\"[seed] after 6 corners: %.1f%%\", cov.get_coverage());",
        '  Phase 2 — closure loop: while (cov.get_coverage() < goal_pct && count < max_txns)',
        '    Inside: randomize check, drive_byte, #4, cov.sample(rx), count++',
        '    Progress: if (count % 10 == 0) $display(...)',
        '  Final report: if/else on cov.get_coverage() >= goal_pct',
        'Close endtask, then endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — see seeding + progress lines + PASS goal_met at the end.',
      ],

      hint:
`class spi_coverage_test;

  task automatic run_to_goal(
    spi_driver         drv,
    spi_coverage_model cov,
    ref logic [7:0]    rx,
    real               goal_pct,
    int                max_txns
  );
    spi_rand_transaction txn = new();
    int count = 0;

    // Phase 1: directed corner seed
    begin
      automatic logic [7:0] corners[6] = '{8'h00,8'hFF,8'hAA,8'h55,8'h80,8'h01};
      foreach (corners[i]) begin
        drv.drive_byte(corners[i]); #4;
        cov.sample(rx);
      end
    end
    $display("[seed] after 6 corners: %.1f%%", cov.get_coverage());

    // Phase 2: coverage-driven random loop
    while (cov.get_coverage() < goal_pct && count < max_txns) begin
      if (!txn.randomize()) begin count++; continue; end
      drv.drive_byte(txn.data); #4;
      cov.sample(rx);
      count++;
      if (count % 10 == 0)
        $display("[%0d txns] coverage = %.1f%%", count, cov.get_coverage());
    end

    if (cov.get_coverage() >= goal_pct)
      $display("PASS goal_met: %.1f%% achieved in %0d random txns",
               cov.get_coverage(), count);
    else
      $display("WARN max_txns hit: %.1f%% after %0d txns",
               cov.get_coverage(), count);
  endtask

endclass`,

      design:
`// Write the spi_coverage_test class here.
//
// class spi_coverage_test;
//
//   task automatic run_to_goal(
//     spi_driver         drv,
//     spi_coverage_model cov,
//     ref logic [7:0]    rx,      // live DUT output
//     real               goal_pct,
//     int                max_txns
//   );
//     spi_rand_transaction txn = new();  int count = 0;
//
//     // Phase 1: directed seed
//     //   automatic logic[7:0] corners[6] = '{8'h00,8'hFF,8'hAA,8'h55,8'h80,8'h01};
//     //   foreach loop: drive_byte, #4, cov.sample(rx)
//
//     // Phase 2: while(coverage < goal && count < max)
//     //   randomize check, drive, #4, sample, count++, log every 10
//
//     // Final: if/else report
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
  logic [7:0] rx_byte;

  spi_slave dut (
    .sclk(vif.sclk), .cs_n(vif.cs_n),
    .mosi(vif.mosi), .miso(vif.miso),
    .rx_byte(rx_byte)
  );

  initial begin
    spi_driver         drv;
    spi_coverage_model cov;
    spi_coverage_test  test;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv  = new(vif);
    cov  = new();
    test = new();

    // Goal: 80% coverage within 100 random transactions
    test.run_to_goal(drv, cov, rx_byte, 80.0, 100);

    cov.report(" final");
    $finish;
  end
endmodule`,

      expected: [
        "[seed] after 6 corners:",
        "PASS goal_met:",
        "Coverage final:"
      ]
    }
  ]
});
