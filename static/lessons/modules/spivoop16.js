(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop16',
  title: 'Ch.16 — Config Object',
  icon: '⚙️',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop16l1',
      title: 'L1 — Stop Hardcoding, Start Configuring',
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
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Config Objects — Stop Hardcoding, Start Configuring</h2>
<p>Every hardcoded number in a testbench is a future bug. When a test uses <code>#10</code> for inter-frame gap, changing it to stress-test mode means editing the source. A config object moves every tunable value into one place. To run a stress scenario, you extend the config class and override the fields you want to change — without touching any test code.</p>

<h3>Part 1 — The base config class (line by line)</h3>
<pre class="code-block">class spi_config;
  // Every field is a runtime-settable parameter.
  // Declare with a default value so the class works out-of-the-box.

  int unsigned word_len        = 8;     // bits per SPI frame; 8 is standard
  // int unsigned → non-negative integer; word_len is always positive

  real         inter_frame_ns  = 10.0;  // gap between CS deassertion and next frame
  // real → floating-point; gaps are often fractional nanoseconds in timing specs

  real         cov_goal        = 80.0;  // coverage % that declares closure
  int unsigned max_rand_txns   = 200;   // safety valve for the random loop
  bit          verbose         = 0;     // 0 = quiet, 1 = print every transaction

  function new();
  // No arguments: config objects are always constructed with defaults,
  // then individual fields are overridden by the test that needs them.
  //
  // This constructor is here for clarity; it does nothing that
  // default initialisation does not already do.
  endfunction

  function void print();
    $display("spi_config: word_len=%0d inter_frame=%.1fns cov_goal=%.0f%%",
             word_len, inter_frame_ns, cov_goal);
    // %.0f → real formatted with 0 decimal places (integer-like display)
  endfunction
endclass</pre>

<h3>Part 2 — Extending config for a specific scenario (line by line)</h3>
<p>A stress config is a config object where specific fields are tightened. Use <code>extends</code> and call <code>super.new()</code> to inherit all defaults, then override only what differs. Tests that do not care about stress get the base config; the stress test passes a stress config.</p>
<pre class="code-block">class spi_stress_config extends spi_config;
// └ inherits every field from spi_config with their default values

  function new();
    super.new();            // ALWAYS call this first when extending a class with a new()
    // super.new() → runs the parent constructor before this constructor
    //               If omitted: parent fields are uninitialised
    //               If called last: parent defaults overwrite your overrides!

    inter_frame_ns = 2.0;   // minimum gap — stresses cs_n timing
    max_rand_txns  = 500;   // more transactions to find rare bugs
    cov_goal       = 95.0;  // higher bar for stress scenario
    verbose        = 1;     // print every frame in stress mode
  endfunction

endclass</pre>

<h3>Part 3 — How config flows through the hierarchy</h3>
<p>The testbench creates a config object and passes it down to every component that needs a parameter. No component hardcodes a value; they all read from the config.</p>
<pre class="code-block">// In a parameterized driver (concept only, not what you build today):
class spi_configured_driver;
  spi_config  cfg;           // store a reference, not a copy
  virtual spi_if vif;

  function new(virtual spi_if v, spi_config c);
    vif = v;
    cfg = c;                 // hold the reference; changes to cfg are visible immediately
  endfunction

  task drive_frame(logic [7:0] data);
    vif.cs_n = 0; #2;
    for (int i = cfg.word_len - 1; i >= 0; i--)  // cfg.word_len, not hardcoded 8
      begin vif.mosi = data[i]; #2; vif.sclk = 1; #2; vif.sclk = 0; #2; end
    vif.cs_n = 1;
    #(cfg.inter_frame_ns);   // gap from config, not hardcoded
  endtask
endclass</pre>

<h3>Part 4 — Compile-time parameter vs runtime config field</h3>
<table class="truth-table">
  <tr><th>Mechanism</th><th>Set when?</th><th>Use for</th><th>Example</th></tr>
  <tr><td><code>parameter</code> / <code>localparam</code></td><td>Compile time</td><td>DUT structural dimensions</td><td><code>parameter DATA_WIDTH = 8</code></td></tr>
  <tr><td>Config object field</td><td>Run time (sim start)</td><td>Testbench behaviour tuning</td><td><code>cfg.cov_goal = 95.0</code></td></tr>
  <tr><td><code>plusarg</code> (<code>+KEY=VAL</code>)</td><td>Run time (command line)</td><td>Regression-level switching</td><td><code>+COV_GOAL=95</code></td></tr>
</table>
<p>Config objects handle the middle layer. They are more flexible than compile-time parameters and easier to manage in code than command-line plusargs.</p>
<p><strong>Ready?</strong> Switch to the Code tab and write <code>spi_config</code> and <code>spi_stress_config</code>. The testbench creates both, prints them, and runs a short verification loop using each. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare class spi_config; (no extends)',
        'Add five fields with defaults:',
        '  int unsigned word_len = 8;',
        '  real inter_frame_ns = 10.0;',
        '  real cov_goal = 80.0;',
        '  int unsigned max_rand_txns = 200;',
        '  bit verbose = 0;',
        'Write function new(); endfunction  (empty constructor)',
        'Write function void print() with a $display showing all fields',
        'Close with endclass',
        'Declare class spi_stress_config extends spi_config;',
        'Write function new(): call super.new(); then override inter_frame_ns=2.0, max_rand_txns=500, cov_goal=95.0, verbose=1',
        'Close with endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — two config printouts appear, then PASS default config and PASS stress config.',
      ],

      hint:
`class spi_config;
  int unsigned word_len       = 8;
  real         inter_frame_ns = 10.0;
  real         cov_goal       = 80.0;
  int unsigned max_rand_txns  = 200;
  bit          verbose        = 0;

  function new();
  endfunction

  function void print();
    $display("spi_config: word_len=%0d inter_frame=%.1fns cov_goal=%.0f%%",
             word_len, inter_frame_ns, cov_goal);
  endfunction
endclass

class spi_stress_config extends spi_config;
  function new();
    super.new();
    inter_frame_ns = 2.0;
    max_rand_txns  = 500;
    cov_goal       = 95.0;
    verbose        = 1;
  endfunction
endclass`,

      design:
`// Write two classes here.
//
// 1. class spi_config;
//    Fields (with defaults):
//      int unsigned word_len       = 8
//      real         inter_frame_ns = 10.0
//      real         cov_goal       = 80.0
//      int unsigned max_rand_txns  = 200
//      bit          verbose        = 0
//    function new(); (empty)
//    function void print(); (display word_len, inter_frame_ns, cov_goal)
//
// 2. class spi_stress_config extends spi_config;
//    function new();
//      super.new();         <- always first
//      inter_frame_ns = 2.0;
//      max_rand_txns  = 500;
//      cov_goal       = 95.0;
//      verbose        = 1;
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

  task automatic run_with_config(
    input spi_driver  drv,
    input spi_config  cfg,
    ref   logic [7:0] rx
  );
    logic [7:0] frames [3:0] = '{8'hA5, 8'h5A, 8'hFF, 8'h00};
    int fails = 0;
    foreach (frames[i]) begin
      drv.drive_byte(frames[i]);
      #(cfg.inter_frame_ns);    // gap from config
      if (rx !== frames[i]) fails++;
      if (cfg.verbose)
        $display("  [verbose] sent=%0h  rx=%0h", frames[i], rx);
    end
    if (fails == 0)
      $display("PASS %s: 4 frames OK", cfg.verbose ? "stress config" : "default config");
    else
      $display("FAIL %s: %0d mismatch(es)", cfg.verbose ? "stress config" : "default config", fails);
  endtask

  initial begin
    spi_driver        drv;
    spi_config        def_cfg;
    spi_stress_config stress_cfg;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv       = new(vif);
    def_cfg   = new();
    stress_cfg = new();

    $display("=== Run 1: default config ===");
    def_cfg.print();
    run_with_config(drv, def_cfg, rx_byte);

    $display("=== Run 2: stress config ===");
    stress_cfg.print();
    run_with_config(drv, stress_cfg, rx_byte);

    $finish;
  end
endmodule`,

      expected: [
        "spi_config: word_len=8",
        "PASS default config: 4 frames OK",
        "PASS stress config: 4 frames OK"
      ]
    }
  ]
});
