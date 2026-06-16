(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop11',
  title: 'Ch.11 — SVA Protocol Checker',
  icon: '🛡️',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop11l1',
      title: 'L1 — Assertions That Never Sleep',
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
          name: 'spi_checker_ref.sv',
          content:
`// Reference: two completed SVA assertions.
// Open spi_checker.sv (Code tab) and write a third one.

// p_sclk_in_frame:
//   At every rising sclk edge, cs_n must be low.
//   Fires if the driver accidentally toggles sclk outside a frame.
//
// property p_sclk_in_frame;
//   @(posedge sclk) !cs_n;
// endproperty
// assert property (p_sclk_in_frame)
//   else $error("SVA FAIL p_sclk_in_frame: sclk rose while cs_n=1");

// p_miso_zero:
//   Our slave always drives miso=0.
//   If it ever drives 1 during a frame, something is wrong.
//
// property p_miso_zero;
//   @(posedge sclk) !cs_n |-> !miso;
// endproperty
// assert property (p_miso_zero)
//   else $error("SVA FAIL p_miso_zero: miso was 1 during frame");`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>SVA — Assertions That Never Sleep</h2>
<p>A directed test checks one scenario you thought of. A concurrent SVA assertion checks a rule on <em>every clock edge</em>, across every test you ever run, without any test-specific code. Once you write the assertion, it watches permanently. Bugs that slip past your directed tests get caught by assertions.</p>

<h3>Concurrent assertion syntax</h3>
<pre class="code-block">property p_name;
  @(posedge clk) antecedent |-> consequent;
endproperty
assert property (p_name)
  else $error("Violation message");</pre>
<p>The <code>|-&gt;</code> operator is <em>overlapping implication</em>: if the antecedent is true at this clock edge, the consequent must also be true at the same edge. If there is no antecedent, the consequent must hold at every edge.</p>

<h3>SPI Mode 0 rules</h3>
<table class="truth-table">
  <tr><th>Rule</th><th>SVA clock</th><th>Antecedent</th><th>Consequent</th></tr>
  <tr><td>sclk only during frame</td><td>posedge sclk</td><td>—</td><td>!cs_n</td></tr>
  <tr><td>miso = 0 during frame</td><td>posedge sclk</td><td>!cs_n</td><td>!miso</td></tr>
  <tr><td>mosi not X/Z during frame</td><td>posedge sclk</td><td>!cs_n</td><td>mosi === 1'b0 || mosi === 1'b1</td></tr>
</table>

<h3>What you will build</h3>
<p>A <code>spi_checker</code> module instantiated alongside <code>spi_slave</code> in the testbench. Both share the same SPI wires. The checker adds zero logic — it only watches. The testbench drives 4 SPI frames; the checker monitors every posedge sclk and fires <code>$error</code> if a rule is violated.</p>
<pre class="code-block">module spi_checker (
  input logic sclk, cs_n, mosi, miso
);

  property p_sclk_in_frame;
    @(posedge sclk) !cs_n;
  endproperty
  assert property (p_sclk_in_frame)
    else $error("SVA FAIL p_sclk_in_frame: sclk rose while cs_n=1");

  // add p_miso_zero and p_mosi_4state here

endmodule</pre>
<p><strong>Important:</strong> In ⚙ Options → Language &amp; Features, enable <code>--assert</code> before running. Without it Verilator silently ignores all <code>assert property</code> statements.</p>
<p><strong>Ready?</strong> Switch to the Code tab and write the three-property checker. Stuck? Tap 💡 Show Hint for the complete solution.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare: module spi_checker (input logic sclk, cs_n, mosi, miso);',
        'Write property p_sclk_in_frame: @(posedge sclk) !cs_n;',
        'Add: assert property (p_sclk_in_frame) else $error("SVA FAIL p_sclk_in_frame: ...");',
        "Write property p_miso_zero: @(posedge sclk) !cs_n |-> !miso;",
        'Add its assert property + $error line',
        "Write property p_mosi_4state: @(posedge sclk) !cs_n |-> (mosi === 1'b0 || mosi === 1'b1);",
        'Add its assert property + $error line',
        'Close with endmodule',
        'In ⚙ Options → Language & Features: check --assert',
        'Using Verilator: also set Timing Mode to --timing',
        'Hit Run — 4 PASS lines appear; no SVA FAIL lines means the checker found no violations.',
      ],
      hint:
`module spi_checker (
  input logic sclk, cs_n, mosi, miso
);

  // Rule 1: sclk must only rise when a frame is active (cs_n low)
  property p_sclk_in_frame;
    @(posedge sclk) !cs_n;
  endproperty
  assert property (p_sclk_in_frame)
    else $error("SVA FAIL p_sclk_in_frame: sclk rose while cs_n=1");

  // Rule 2: our slave always drives miso=0; check it holds during frames
  property p_miso_zero;
    @(posedge sclk) !cs_n |-> !miso;
  endproperty
  assert property (p_miso_zero)
    else $error("SVA FAIL p_miso_zero: miso was 1 during frame");

  // Rule 3: mosi must be a valid 0 or 1, never X or Z, during a frame
  property p_mosi_4state;
    @(posedge sclk) !cs_n |-> (mosi === 1'b0 || mosi === 1'b1);
  endproperty
  assert property (p_mosi_4state)
    else $error("SVA FAIL p_mosi_4state: mosi is X or Z during frame");

endmodule`,
      design:
`// Write the spi_checker module here.
//
// Ports: input logic sclk, cs_n, mosi, miso
// (no outputs — a checker only watches, never drives)
//
// Three concurrent assertion properties to write:
//
//   p_sclk_in_frame : @(posedge sclk) !cs_n
//     sclk may only rise while cs_n is active
//
//   p_miso_zero : @(posedge sclk) !cs_n |-> !miso
//     miso is always 0 during a frame (our slave drives 0)
//
//   p_mosi_4state : @(posedge sclk) !cs_n |-> (mosi===1'b0 || mosi===1'b1)
//     mosi must never be X or Z during a frame
//
// Remember: enable --assert in Options before running!
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

  // Checker sits alongside DUT, watches the same wires
  spi_checker chk (
    .sclk(vif.sclk), .cs_n(vif.cs_n),
    .mosi(vif.mosi), .miso(vif.miso)
  );

  initial begin
    spi_driver drv;
    int        fail_count = 0;
    logic [7:0] frames [3:0];

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv = new(vif);

    // Drive 4 frames with known data
    frames[0] = 8'hA5;
    frames[1] = 8'h5A;
    frames[2] = 8'hFF;
    frames[3] = 8'h00;

    for (int i = 0; i < 4; i++) begin
      drv.drive_byte(frames[i]);
      #4;
      if (rx_byte === frames[i])
        $display("PASS frame[%0d]: sent 8'h%0h  captured 8'h%0h", i, frames[i], rx_byte);
      else begin
        $display("FAIL frame[%0d]: sent 8'h%0h  captured 8'h%0h", i, frames[i], rx_byte);
        fail_count++;
      end
    end

    // If simulation reaches here without $error aborting it, assertions passed
    if (fail_count == 0)
      $display("PASS: spi_checker found no violations");
    else
      $display("FAIL: %0d frame(s) failed", fail_count);

    $finish;
  end
endmodule`,
      expected: [
        "PASS frame[0]: sent 8'ha5",
        "PASS frame[3]: sent 8'h0",
        "PASS: spi_checker found no violations"
      ]
    }
  ]
});
