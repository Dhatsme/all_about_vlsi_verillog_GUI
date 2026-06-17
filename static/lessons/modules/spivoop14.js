(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop14',
  title: 'Ch.14 — Constrained-Random Testing',
  icon: '🎲',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop14l1',
      title: 'L1 — Let the Tool Find Your Bugs',
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
`// Coverage model from Ch.13 — read-only reference.
class spi_coverage_model;
  bit cov_zero     = 0;
  bit cov_all_ones = 0;
  bit cov_alt_hi   = 0;
  bit cov_alt_lo   = 0;
  bit cov_msb_only = 0;
  bit cov_lsb_only = 0;
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
    int hit = 0, total = 38;
    if (cov_zero)     hit++;
    if (cov_all_ones) hit++;
    if (cov_alt_hi)   hit++;
    if (cov_alt_lo)   hit++;
    if (cov_msb_only) hit++;
    if (cov_lsb_only) hit++;
    foreach (cov_hi[i]) if (cov_hi[i]) hit++;
    foreach (cov_lo[i]) if (cov_lo[i]) hit++;
    return (real'(hit) / real'(total)) * 100.0;
  endfunction

  function void report(string label = "");
    int hi_c = 0, lo_c = 0;
    foreach (cov_hi[i]) if (cov_hi[i]) hi_c++;
    foreach (cov_lo[i]) if (cov_lo[i]) lo_c++;
    $display("Coverage%s: %.1f%%  corners=%0d/6  hi_nibble=%0d/16  lo_nibble=%0d/16",
             label, get_coverage(),
             cov_zero+cov_all_ones+cov_alt_hi+cov_alt_lo+cov_msb_only+cov_lsb_only,
             hi_c, lo_c);
  endfunction
endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Constrained-Random Testing — Let the Tool Find Your Bugs</h2>
<p>Directed tests prove the cases <em>you thought of</em>. Constrained-random testing proves cases you did not think of — by generating thousands of legal stimulus values automatically. You define the rules (constraints), the solver finds values that satisfy them, and the coverage model tells you when you are done. This is the engine behind every industrial verification closure.</p>

<h3>Part 1 — The <code>rand</code> keyword (line by line)</h3>
<pre class="code-block">class spi_rand_transaction extends spi_transaction;
// └ extends: inherits the non-rand 'data' field; we override it with a rand version

  rand logic [7:0] data;
  // rand  → this variable enters the randomization domain
  //           Without rand, calling randomize() leaves data unchanged.
  //           With rand, each randomize() call generates a new pseudo-random value
  //           that satisfies every active constraint in this object.

  rand bit corner_mode;
  // rand bit  → 1-bit rand variable; flips randomly between 0 and 1
  //            Used as a guard inside a constraint (see Part 2).
endclass</pre>

<h3>Part 2 — Constraint blocks (line by line)</h3>
<pre class="code-block">  constraint c_nonzero {
  //         └ name: every constraint must be named (used for disable_iff and debugging)
    data != 8'h00;    // rule 1: solver must never pick all-zero
    data != 8'hFF;    // rule 2: solver must never pick all-ones
    // Multiple rules inside one block are ANDed: BOTH must hold simultaneously.
    // The solver finds a value from the remaining 254 possibilities.
  }

  constraint c_corner {
    if (corner_mode) {         // conditional constraint: only active when corner_mode==1
      data inside {8'hAA, 8'h55, 8'h80, 8'h01};
      //    └ inside operator: data must equal one of these four values
      //      Equivalent to: data==8'hAA || data==8'h55 || data==8'h80 || data==8'h01
      //      but the solver can optimise 'inside' far better than chained ||.
    }
    // When corner_mode==0, this block adds no rules — all 254 non-zero values are legal.
  }</pre>

<h3>Part 3 — Calling randomize() (line by line)</h3>
<pre class="code-block">  spi_rand_transaction txn = new();

  if (!txn.randomize())            // randomize() returns 1 on success, 0 on failure
    $error("randomize failed");    // ALWAYS check the return value.
                                   // Contradictory constraints silently return 0;
                                   // skipping this check hides coverage gaps.

  drv.drive_byte(txn.data);        // txn.data now holds a value satisfying all constraints
  cov.sample(rx_byte);             // sample coverage after the DUT processes the byte</pre>

<h3>Part 4 — Seeding for reproducibility</h3>
<pre class="code-block">  txn.srandom(12345);   // set the seed before randomising
  txn.randomize();      // always produces the same sequence for this seed
  // When a random test fails: print the seed used, then replay with that seed.
  // Your regression log should always record: $display("seed=%0d", seed_value);</pre>

<h3>Directed vs constrained-random: when to use each</h3>
<table class="truth-table">
  <tr><th>Technique</th><th>Use for</th><th>Weakness</th></tr>
  <tr><td>Directed</td><td>Specific known corner cases</td><td>Only finds bugs you anticipated</td></tr>
  <tr><td>Constrained-random</td><td>Exploring the unknown space</td><td>Can miss corner cases if constraints are too loose</td></tr>
  <tr><td>Coverage-guided random</td><td>Running until coverage goal met</td><td>Needs a coverage model (Ch.13)</td></tr>
</table>
<p>The three techniques are complementary. Directed tests run first (fast, targeted). Random runs after (wide, discovery). The coverage model from Ch.13 tells you when random has found enough.</p>
<p><strong>Ready?</strong> Switch to the Code tab and write <code>spi_rand_transaction</code>. The testbench drives three phases: pure random, corner-mode random, and seed-fixed replay. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare: class spi_rand_transaction extends spi_transaction;',
        'Add: rand logic [7:0] data;   ← this shadows the non-rand field from the base',
        'Add: rand bit corner_mode;',
        'Write constraint c_nonzero { data != 8\'h00; data != 8\'hFF; }',
        'Write constraint c_corner with an if(corner_mode) block using the inside operator:',
        "  data inside {8'hAA, 8'h55, 8'h80, 8'h01};",
        'Close the constraint block, then close endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — three coverage snapshots appear; final line shows PASS if above 60%.',
      ],

      hint:
`class spi_rand_transaction extends spi_transaction;
  rand logic [7:0] data;      // shadows base class field; rand = enters randomization domain
  rand bit         corner_mode;

  // Rule: never generate all-zero or all-ones by default
  constraint c_nonzero {
    data != 8'h00;
    data != 8'hFF;
  }

  // Rule: when corner_mode is set, restrict to four boundary values
  constraint c_corner {
    if (corner_mode)
      data inside {8'hAA, 8'h55, 8'h80, 8'h01};
  }
endclass`,

      design:
`// Write the spi_rand_transaction class here.
//
// class spi_rand_transaction extends spi_transaction;
//
//   rand logic [7:0] data;       <-- rand keyword makes this randomizable
//   rand bit         corner_mode; <-- 1-bit mode flag, also randomized
//
//   constraint c_nonzero {
//     data != 8'h00;
//     data != 8'hFF;
//   }
//
//   constraint c_corner {
//     if (corner_mode)
//       data inside {8'hAA, 8'h55, 8'h80, 8'h01};
//   }
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
    spi_driver           drv;
    spi_coverage_model   cov;
    spi_rand_transaction txn;
    int                  fail_rand = 0;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv = new(vif);
    cov = new();
    txn = new();

    // ---- Phase 1: 20 purely random frames (corner_mode unconstrained) ----
    $display("=== Phase 1: 20 random frames ===");
    repeat (20) begin
      if (!txn.randomize()) begin
        $display("FAIL: randomize() returned 0");
        fail_rand++;
      end else begin
        drv.drive_byte(txn.data); #4;
        cov.sample(rx_byte);
      end
    end
    cov.report(" after phase1");

    // ---- Phase 2: 10 corner-mode frames (force corner_mode=1) ----
    $display("=== Phase 2: 10 corner-mode frames ===");
    txn.corner_mode.rand_mode(0);    // freeze corner_mode from randomization
    txn.corner_mode = 1;             // force it to 1
    repeat (10) begin
      if (!txn.randomize()) begin
        $display("FAIL: randomize() returned 0 in corner mode");
        fail_rand++;
      end else begin
        drv.drive_byte(txn.data); #4;
        cov.sample(rx_byte);
      end
    end
    txn.corner_mode.rand_mode(1);    // re-enable corner_mode randomization
    cov.report(" after phase2");

    // ---- Phase 3: seed-fixed replay for reproducibility demo ----
    $display("=== Phase 3: seed-fixed replay (seed=42) ===");
    txn.srandom(42);
    repeat (5) begin
      void'(txn.randomize());
      drv.drive_byte(txn.data); #4;
      cov.sample(rx_byte);
    end
    cov.report(" final");

    if (fail_rand == 0 && cov.get_coverage() >= 60.0)
      $display("PASS: constrained-random coverage >= 60%%");
    else
      $display("FAIL: coverage=%.1f%% rand_errors=%0d", cov.get_coverage(), fail_rand);

    $finish;
  end
endmodule`,

      expected: [
        "Coverage after phase1",
        "Coverage final",
        "PASS: constrained-random coverage >= 60%"
      ]
    }
  ]
});
