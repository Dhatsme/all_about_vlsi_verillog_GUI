(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop19',
  title: 'Ch.19 — Sequence Hierarchy',
  icon: '🧵',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop19l1',
      title: 'L1 — Sequences That Call Sequences',
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
          name: 'spi_seq_ref.sv',
          content:
`// Reference sequences — read-only.
// These show how child sequences override body().
// Your task: write spi_base_seq and spi_full_reg_seq.

// --- spi_smoke_seq: drives 4 corner bytes ---
// class spi_smoke_seq extends spi_base_seq;
//   task body();
//     automatic logic [7:0] b[4] = '{8'hA5,8'h5A,8'hFF,8'h00};
//     foreach (b[i]) begin drv.drive_byte(b[i]); #4; end
//     $display("[smoke_seq] 4 frames driven");
//   endtask
// endclass

// --- spi_directed_seq: drives alternating + walking-ones ---
// class spi_directed_seq extends spi_base_seq;
//   task body();
//     automatic logic [7:0] b[4] = '{8'hAA,8'h55,8'h01,8'h80};
//     foreach (b[i]) begin drv.drive_byte(b[i]); #4; end
//     $display("[directed_seq] 4 frames driven");
//   endtask
// endclass

// --- spi_rand_seq: drives N random bytes ---
// class spi_rand_seq extends spi_base_seq;
//   int n = 10;  // default: 10 frames
//   task body();
//     spi_transaction txn = new();
//     repeat(n) begin
//       void'(std::randomize(txn.data));
//       drv.drive_byte(txn.data); #4;
//     end
//     $display("[rand_seq] %0d random frames driven", n);
//   endtask
// endclass`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Sequence Hierarchy — Sequences That Call Sequences</h2>
<p>A sequence is a class whose sole job is to generate and drive stimulus. Its stimulus logic lives in a task called <code>body()</code>. Because sequences are objects, one sequence can instantiate and call another sequence from inside its own <code>body()</code> — building layered, reusable stimulus from smaller building blocks. This is the structural pattern that UVM sequences use directly.</p>

<h3>Part 1 — The base sequence class (line by line)</h3>
<pre class="code-block">class spi_base_seq;
  spi_driver drv;      // every sequence needs a handle to the driver
  // drv is set by the testbench before calling start();
  // it is NOT created here — the sequence borrows the driver, it does not own it.

  function new(spi_driver d);
    drv = d;           // store the driver reference; set once, used in body()
  endfunction

  virtual task body();  // virtual: child classes MUST override this
    // virtual → the base version is intentionally empty.
    //           Calling start() on the base seq drives nothing.
    //           Child classes give body() real content.
    //           Without virtual, spi_base_seq b = new(drv); b.body();
    //           would always call this empty version even if b holds a child.
  endtask

  task start();         // the API used by testbenches and parent sequences
    $display("[seq] starting %s", this.type_name());
    // type_name() returns the runtime class name — works with virtual dispatch
    body();             // call the overridden body(), not this base class version
    $display("[seq] %s complete", this.type_name());
  endtask

  function string type_name();
    return "spi_base_seq";   // child classes override this too
  endfunction
endclass</pre>

<h3>Part 2 — A child sequence (line by line)</h3>
<pre class="code-block">class spi_smoke_seq extends spi_base_seq;
// └ inherits drv, new(), start()

  function new(spi_driver d); super.new(d); endfunction
  // super.new(d) → runs the parent constructor, which stores drv
  // Must be called: without it, drv is null and body() will segfault.

  virtual task body();
  //       └ also virtual so a grandchild can extend spi_smoke_seq
    automatic logic [7:0] b[4] = '{8'hA5, 8'h5A, 8'hFF, 8'h00};
    foreach (b[i]) begin
      drv.drive_byte(b[i]);  // drv comes from the base class (inherited)
      #4;                    // wait for DUT
    end
    $display("[smoke_seq] 4 frames driven");
  endtask

  function string type_name(); return "spi_smoke_seq"; endfunction
endclass</pre>

<h3>Part 3 — Sequence calling sequence (line by line)</h3>
<p>This is the feature that makes sequences powerful. A parent sequence’s <code>body()</code> creates child sequences and calls their <code>start()</code>. The parent drives an entire scenario by composing smaller sequences. Change one child sequence, and every parent that uses it gets the update automatically.</p>
<pre class="code-block">class spi_full_reg_seq extends spi_base_seq;
  function new(spi_driver d); super.new(d); endfunction

  virtual task body();
    spi_smoke_seq   s_seq;   // handles to child sequences
    spi_directed_seq d_seq;
    // Instantiate with the same drv handle — all sequences share one driver
    s_seq = new(drv);        // new(drv): pass driver reference down
    d_seq = new(drv);

    $display("[full_reg_seq] starting sub-sequences");
    s_seq.start();           // run smoke first
    d_seq.start();           // then directed
    // If smoke fails (DUT is broken), directed running is wasted effort.
    // In UVM, you would check status between calls and abort on failure.
    $display("[full_reg_seq] all sub-sequences complete");
  endtask

  function string type_name(); return "spi_full_reg_seq"; endfunction
endclass</pre>

<h3>Mapping to UVM</h3>
<table class="truth-table">
  <tr><th>This course</th><th>UVM equivalent</th><th>What it does</th></tr>
  <tr><td><code>spi_base_seq</code></td><td><code>uvm_sequence #(item)</code></td><td>Base class with body() and start()</td></tr>
  <tr><td><code>body()</code> task</td><td><code>body()</code> task</td><td>Same name, same purpose</td></tr>
  <tr><td><code>seq.start()</code></td><td><code>seq.start(sequencer)</code></td><td>Runs body(); UVM also needs a sequencer handle</td></tr>
  <tr><td><code>spi_driver</code></td><td><code>uvm_driver #(item)</code></td><td>Receives items and drives the DUT</td></tr>
  <tr><td><code>drv.drive_byte(data)</code></td><td><code>seq_item_port.get_next_item(item)</code></td><td>UVM uses a FIFO channel; concept is the same</td></tr>
</table>
<p>Everything you built in this course has a direct UVM counterpart. The concepts are identical; only the infrastructure wiring changes.</p>
<p><strong>Ready?</strong> Switch to the Code tab and write <code>spi_base_seq</code> and <code>spi_full_reg_seq</code>. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        '--- Class 1: spi_base_seq ---',
        'Declare class spi_base_seq; with member spi_driver drv;',
        'Write function new(spi_driver d): drv = d;',
        'Write virtual task body(); (empty — just a comment explaining why)',
        'Write task start(): $display start, call body(), $display complete',
        'Write function string type_name(): return "spi_base_seq";',
        'endclass',
        '--- Class 2: spi_smoke_seq extends spi_base_seq ---',
        'function new(spi_driver d): super.new(d);',
        'virtual task body(): drive 4 bytes (A5,5A,FF,00) with #4 gaps, then $display',
        'function string type_name(): return "spi_smoke_seq";',
        'endclass',
        '--- Class 3: spi_full_reg_seq extends spi_base_seq ---',
        'virtual task body(): instantiate spi_smoke_seq s=new(drv) and spi_directed_seq d=new(drv)',
        '  Call s.start(); then d.start();',
        'function string type_name(): return "spi_full_reg_seq";',
        'endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — see [seq] starting lines from each sequence, then PASS: sequence hierarchy works.',
      ],

      hint:
`class spi_base_seq;
  spi_driver drv;
  function new(spi_driver d); drv = d; endfunction

  virtual task body();
    // base: empty. Child classes override this with real stimulus.
  endtask

  task start();
    $display("[seq] starting %s", type_name());
    body();
    $display("[seq] %s complete", type_name());
  endtask

  function string type_name(); return "spi_base_seq"; endfunction
endclass

class spi_smoke_seq extends spi_base_seq;
  function new(spi_driver d); super.new(d); endfunction
  virtual task body();
    automatic logic [7:0] b[4] = '{8'hA5, 8'h5A, 8'hFF, 8'h00};
    foreach (b[i]) begin drv.drive_byte(b[i]); #4; end
    $display("[smoke_seq] 4 frames driven");
  endtask
  function string type_name(); return "spi_smoke_seq"; endfunction
endclass

class spi_directed_seq extends spi_base_seq;
  function new(spi_driver d); super.new(d); endfunction
  virtual task body();
    automatic logic [7:0] b[4] = '{8'hAA, 8'h55, 8'h01, 8'h80};
    foreach (b[i]) begin drv.drive_byte(b[i]); #4; end
    $display("[directed_seq] 4 frames driven");
  endtask
  function string type_name(); return "spi_directed_seq"; endfunction
endclass

class spi_full_reg_seq extends spi_base_seq;
  function new(spi_driver d); super.new(d); endfunction
  virtual task body();
    spi_smoke_seq    s = new(drv);
    spi_directed_seq d = new(drv);
    $display("[full_reg_seq] running sub-sequences");
    s.start();
    d.start();
    $display("[full_reg_seq] done");
  endtask
  function string type_name(); return "spi_full_reg_seq"; endfunction
endclass`,

      design:
`// Write three classes:
//
// 1. class spi_base_seq
//    spi_driver drv;
//    new(spi_driver d)  ->  drv = d
//    virtual task body() -> empty
//    task start()       -> display start, body(), display complete
//    function string type_name() -> "spi_base_seq"
//
// 2. class spi_smoke_seq extends spi_base_seq
//    new calls super.new(d)
//    body() drives: A5, 5A, FF, 00 with #4 gaps
//    type_name() -> "spi_smoke_seq"
//
// 3. class spi_directed_seq extends spi_base_seq
//    body() drives: AA, 55, 01, 80
//    type_name() -> "spi_directed_seq"
//
// 4. class spi_full_reg_seq extends spi_base_seq
//    body(): spi_smoke_seq s=new(drv); spi_directed_seq d=new(drv);
//            s.start(); d.start();
//    type_name() -> "spi_full_reg_seq"
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
    spi_driver       drv;
    spi_full_reg_seq fseq;
    int              fails = 0;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv  = new(vif);
    fseq = new(drv);

    $display("=== Running spi_full_reg_seq ===");
    fseq.start();     // calls body() which calls smoke.start() then directed.start()

    // Verify final DUT state (last byte driven was 8'h80)
    if (rx_byte === 8'h80)
      $display("PASS: DUT captured 8'h80 (last byte of directed_seq)");
    else begin
      $display("FAIL: expected 8'h80 got 8'h%0h", rx_byte);
      fails++;
    end

    if (fails == 0)
      $display("PASS: sequence hierarchy works");
    else
      $display("FAIL: %0d check(s) failed", fails);

    $finish;
  end
endmodule`,

      expected: [
        "[seq] starting spi_full_reg_seq",
        "[smoke_seq] 4 frames driven",
        "PASS: sequence hierarchy works"
      ]
    }
  ]
});
