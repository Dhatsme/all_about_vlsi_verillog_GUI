// m15.js — UVM on Verilator (minimal hello-world)
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'm15',
  title: 'UVM on Verilator',
  icon: '🔬',
  level: 'advanced',
  lessons: [
    {
      id: 'm15-l1',
      title: 'Hello UVM',
      theory: `
        <h2>UVM — Universal Verification Methodology</h2>
        <p>UVM is the industry-standard SystemVerilog framework for structured,
        reusable verification environments. This lesson runs a minimal UVM test
        on Verilator using the Antmicro UVM library bundled in this server.</p>

        <h3>Key concepts</h3>
        <ul>
          <li><code>uvm_test</code> — base class for all tests; extend it and override <code>run_phase</code>.</li>
          <li><strong>Objection mechanism</strong> — <code>phase.raise_objection(this)</code> keeps the
              simulation alive; <code>phase.drop_objection(this)</code> ends it.</li>
          <li><code>\`uvm_info(TAG, MSG, VERBOSITY)</code> — prints a tagged message to the console.</li>
          <li><code>\`uvm_component_utils(class_name)</code> — registers the class with the UVM factory
              so <code>run_test()</code> can find it by string name.</li>
          <li><code>run_test("hello_test")</code> — called from the <code>tb</code> initial block;
              UVM instantiates and runs the named test.</li>
        </ul>

        <h3>How to run this lesson</h3>
        <ol>
          <li>Select <strong>verilator</strong> in the simulator dropdown (top-right).</li>
          <li>Click <strong>⚙ Options</strong> → tick <strong>Enable UVM</strong>.</li>
          <li>Set <em>Test name</em> to <code>hello_test</code>.</li>
          <li>Click <strong>▶ Run</strong>. First run compiles <code>uvm_pkg</code> (~30 s on cold server;
              instant on Railway where the image is pre-warmed).</li>
        </ol>
      `,
      tasks: [
        'Switch simulator to verilator → ⚙ Options → Enable UVM → Test name: hello_test',
        'Click ▶ Run and see UVM_INFO lines appear in the console',
        'Edit the message string in run_phase and run again to confirm it rebuilds',
      ],
      hint: 'If you see "UVM library not found" locally, run the project via Docker — UVM_HOME is configured there. On Railway the library is always available.',

      // ── Design — trivial; all logic is in the UVM testbench ──────────────────
      design: `// Minimal DUT — the UVM test is self-contained in the testbench.
module dut;
endmodule
`,

      // ── Testbench — minimal single-file UVM hello-world ──────────────────────
      testbench: `\`include "uvm_macros.svh"
import uvm_pkg::*;

// ── UVM Test ─────────────────────────────────────────────────────────────────
class hello_test extends uvm_test;
  \`uvm_component_utils(hello_test)

  function new(string name = "hello_test", uvm_component parent = null);
    super.new(name, parent);
  endfunction

  task run_phase(uvm_phase phase);
    phase.raise_objection(this);

    \`uvm_info("HELLO", "=== Hello from UVM on Verilator! ===", UVM_NONE)
    \`uvm_info("HELLO", "run_phase executing — objections raised.", UVM_NONE)
    \`uvm_info("HELLO", "Dropping objection — test complete.",      UVM_NONE)

    phase.drop_objection(this);
  endtask
endclass

// ── Top-level TB module (must be named 'tb') ─────────────────────────────────
module tb;
  initial run_test("hello_test");
endmodule
`,
      expected: ['Hello from UVM on Verilator!'],
    },
  ],
});
