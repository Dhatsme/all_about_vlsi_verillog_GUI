(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop20',
  title: 'Ch.20 — UVM Bridge',
  icon: '🌉',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop20l1',
      title: 'L1 — Everything You Built Has a UVM Name',
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
`<h2>UVM Bridge — Everything You Built Has a UVM Name</h2>
<p>UVM (Universal Verification Methodology) is a library of base classes that standardises what you built in this course. Every component you wrote maps directly to a UVM class. The concepts are identical; UVM adds factory registration, phase-based execution, TLM ports, and reporting infrastructure on top. If you understand this course, you understand UVM — you just need to learn the wiring syntax.</p>

<h3>The full mapping table</h3>
<table class="truth-table">
  <tr><th>This course</th><th>UVM class</th><th>Key difference</th></tr>
  <tr><td><code>spi_transaction</code></td><td><code>uvm_sequence_item</code></td><td>UVM adds <code>do_copy</code>, <code>do_compare</code>, <code>convert2string</code> macros</td></tr>
  <tr><td><code>spi_driver</code></td><td><code>uvm_driver #(spi_item)</code></td><td>Items arrive via <code>seq_item_port.get_next_item()</code> not a direct task call</td></tr>
  <tr><td><code>spi_monitor</code></td><td><code>uvm_monitor</code></td><td>Observations sent via <code>uvm_analysis_port</code> broadcast (not a single mailbox)</td></tr>
  <tr><td><code>spi_scoreboard</code></td><td><code>uvm_scoreboard</code></td><td>Receives from analysis port via <code>uvm_analysis_imp</code></td></tr>
  <tr><td><code>spi_agent</code></td><td><code>uvm_agent</code></td><td>Has <code>is_active</code> flag: ACTIVE drives, PASSIVE only monitors</td></tr>
  <tr><td><code>spi_env</code></td><td><code>uvm_env</code></td><td>Same: owns agents and scoreboards</td></tr>
  <tr><td><code>spi_base_seq / body()</code></td><td><code>uvm_sequence / body()</code></td><td>Same task name; UVM adds sequencer handle and <code>start_item()</code>/<code>finish_item()</code></td></tr>
  <tr><td><code>spi_config</code></td><td><code>uvm_object</code> in config_db</td><td>UVM stores config in a global database: <code>uvm_config_db#(T)::set/get</code></td></tr>
  <tr><td><code>spi_reg_model</code></td><td><code>uvm_reg_block</code></td><td>UVM RAL has frontdoor adapters, auto-reset checking, mirror/desired value split</td></tr>
  <tr><td><code>spi_coverage_model</code></td><td><code>uvm_subscriber</code> + covergroup</td><td>UVM uses language <code>covergroup</code> keyword sampled via analysis port</td></tr>
</table>

<h3>What UVM adds that this course did not build</h3>
<ul>
  <li><strong>Factory</strong>: <code>uvm_component_utils</code> macro registers a class so tests can override it without recompilation — e.g., swap <code>spi_driver</code> for <code>spi_bad_driver</code> via command line.</li>
  <li><strong>Phases</strong>: <code>build_phase</code>, <code>connect_phase</code>, <code>run_phase</code>, <code>check_phase</code> replace your <code>initial begin</code> block with structured lifecycle hooks.</li>
  <li><strong>TLM ports</strong>: <code>uvm_analysis_port</code> broadcasts to multiple subscribers simultaneously — your mailbox goes to exactly one receiver.</li>
  <li><strong>Reporting</strong>: <code>`uvm_info</code>, <code>`uvm_error</code>, <code>`uvm_fatal</code> macros with verbosity levels and automatic timestamps.</li>
</ul>

<h3>Part 1 — What a UVM test looks like vs yours</h3>
<pre class="code-block">// YOUR version (this course):
class my_test;
  spi_env env;
  task run();
    env = new(vif);
    env.run(10);
    env.report();
  endtask
endclass

// UVM version:
class my_uvm_test extends uvm_test;
  `uvm_component_utils(my_uvm_test)   // factory registration
  spi_env env;

  function void build_phase(uvm_phase phase);
    env = spi_env::type_id::create("env", this);  // factory create
    uvm_config_db #(spi_config)::set(this, "*", "cfg", cfg);
  endfunction

  task run_phase(uvm_phase phase);
    my_seq seq = my_seq::type_id::create("seq");
    phase.raise_objection(this);   // tell UVM simulation is running
    seq.start(env.agent.sequencer);
    phase.drop_objection(this);    // tell UVM simulation can end
  endtask
endclass</pre>
<p>The structure is the same. The wiring is more explicit. The factory and phases are the main new concepts to learn.</p>

<h3>Part 2 — Your spi_driver as a uvm_driver</h3>
<pre class="code-block">// YOUR version:
class spi_driver;
  task drive_byte(logic [7:0] data);
    vif.cs_n = 0; // ... drive signals ...
  endtask
endclass

// UVM version:
class spi_uvm_driver extends uvm_driver #(spi_item);
  `uvm_component_utils(spi_uvm_driver)
  virtual spi_if vif;

  task run_phase(uvm_phase phase);
    forever begin
      spi_item item;
      seq_item_port.get_next_item(item);  // blocks until sequence sends an item
      drive_byte(item.data);              // same logic you wrote
      seq_item_port.item_done();          // signal: ready for next item
    end
  endtask

  task drive_byte(logic [7:0] data);
    vif.cs_n = 0; #2;                    // exactly your code
    for (int i = 7; i >= 0; i--) begin
      vif.mosi = data[i]; #2; vif.sclk = 1; #2; vif.sclk = 0; #2;
    end
    vif.cs_n = 1; #2;
  endtask
endclass</pre>

<h3>Your learning path from here</h3>
<ol style="padding-left:1.2em;">
  <li>Install the UVM library (bundled with VCS, Xcelium, or Questa — or get open-source UVM from Accellera).</li>
  <li>Re-implement Ch.5 (driver) as a <code>uvm_driver</code>. The <code>drive_byte()</code> task is identical. Only the lifecycle wiring changes.</li>
  <li>Add <code>uvm_analysis_port</code> to the monitor. Remove the mailbox.</li>
  <li>Wire the scoreboard as a <code>uvm_subscriber</code>.</li>
  <li>Everything else — sequences, config objects, coverage, RAL — you already know how to think about.</li>
</ol>
<p>🎓 <strong>This course is complete.</strong> You built 19 verification components from scratch. You understand the class hierarchy, the data flow, the coverage methodology, and the sequence pattern. UVM is the industry standardisation of exactly what you built.</p>
<p><strong>Ready?</strong> Switch to the Code tab and write a <code>uvm_bridge_report</code> class that prints the full mapping table as a self-test. This is your capstone. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare class uvm_bridge_report;',
        'Declare: string course_components[10] — the 10 classes you built in this course',
        'Declare: string uvm_equivalents[10]   — the 10 matching UVM class names',
        'Write function new(): populate both arrays with the mapping (see Theory table)',
        '  course_components[0] = "spi_transaction";  uvm_equivalents[0] = "uvm_sequence_item";',
        '  ... fill in all 10 pairs ...',
        'Write function void print_mapping():',
        '  $display header line',
        '  foreach loop: $display("  %-25s -> %s", course_components[i], uvm_equivalents[i])',
        '  $display footer',
        'Write function void report():',
        '  print_mapping();',
        '  $display("PASS: UVM bridge complete");',
        'Close with endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — see the full mapping table printed, then PASS: UVM bridge complete.',
        '🎓 Capstone piece — you built a complete OOP SPI verification environment from scratch.',
      ],

      hint:
`class uvm_bridge_report;
  string course_components[10];
  string uvm_equivalents[10];

  function new();
    course_components[0] = "spi_transaction";     uvm_equivalents[0] = "uvm_sequence_item";
    course_components[1] = "spi_scoreboard";      uvm_equivalents[1] = "uvm_scoreboard";
    course_components[2] = "spi_driver";          uvm_equivalents[2] = "uvm_driver";
    course_components[3] = "spi_monitor";         uvm_equivalents[3] = "uvm_monitor";
    course_components[4] = "spi_agent";           uvm_equivalents[4] = "uvm_agent";
    course_components[5] = "spi_env";             uvm_equivalents[5] = "uvm_env";
    course_components[6] = "spi_base_seq/body()"; uvm_equivalents[6] = "uvm_sequence/body()";
    course_components[7] = "spi_config";          uvm_equivalents[7] = "uvm_object+config_db";
    course_components[8] = "spi_reg_model";       uvm_equivalents[8] = "uvm_reg_block (RAL)";
    course_components[9] = "spi_coverage_model";  uvm_equivalents[9] = "uvm_subscriber+cg";
  endfunction

  function void print_mapping();
    $display("=== This course -> UVM equivalents ===");
    foreach (course_components[i])
      $display("  %-26s -> %s", course_components[i], uvm_equivalents[i]);
    $display("======================================");
  endfunction

  function void report();
    print_mapping();
    $display("PASS: UVM bridge complete");
  endfunction
endclass`,

      design:
`// Capstone: write the uvm_bridge_report class.
//
// class uvm_bridge_report;
//   string course_components[10];
//   string uvm_equivalents[10];
//
//   function new()
//     Populate both arrays with the 10-entry mapping from the Theory table:
//     [0] spi_transaction      -> uvm_sequence_item
//     [1] spi_scoreboard       -> uvm_scoreboard
//     [2] spi_driver           -> uvm_driver
//     [3] spi_monitor          -> uvm_monitor
//     [4] spi_agent            -> uvm_agent
//     [5] spi_env              -> uvm_env
//     [6] spi_base_seq/body()  -> uvm_sequence/body()
//     [7] spi_config           -> uvm_object+config_db
//     [8] spi_reg_model        -> uvm_reg_block (RAL)
//     [9] spi_coverage_model   -> uvm_subscriber+cg
//
//   function void print_mapping()
//     header + foreach loop + footer
//
//   function void report()
//     print_mapping(); then display PASS message
//
// endclass
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  initial begin
    uvm_bridge_report rpt = new();
    rpt.report();
    $finish;
  end
endmodule`,

      expected: [
        "spi_transaction",
        "uvm_sequence_item",
        "PASS: UVM bridge complete"
      ]
    }
  ]
});
