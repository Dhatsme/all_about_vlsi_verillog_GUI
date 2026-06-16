(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop12',
  title: 'Ch.12 — Debug Methodology',
  icon: '🔍',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop12l1',
      title: 'L1 — Read the Bits, Not Just the Hex',
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
`<h2>Debug Methodology — Read the Bits, Not Just the Hex</h2>
<p>When a scoreboard reports <code>FAIL: got 8'h45 expected 8'h85</code>, hex alone does not tell you which bit is wrong. Experienced engineers immediately convert to binary: <code>0100_0101</code> vs <code>1000_0101</code>. The mismatch is bit 7 — exactly the pattern of an MSB-lost bug. Training your eye to see this in seconds is a core verification skill.</p>

<h3>Per-bit XOR analysis</h3>
<p><code>diff = actual ^ expected</code> produces a bitmask where every 1 marks a wrong bit. A <code>for</code> loop over bits 7..0 then pinpoints exactly which positions are mismatched — no mental arithmetic needed.</p>
<pre class="code-block">logic [7:0] diff = actual ^ expected;
for (int i = 7; i &gt;= 0; i--) begin
  if (diff[i])
    $display("  bit[%0d]: got %0b expected %0b", i, actual[i], expected[i]);
end</pre>

<h3>The debug loop</h3>
<ol style="padding-left:1.2em;">
  <li>Run regression — note which test fails.</li>
  <li>Re-run that test alone (<code>-DRUN_SINGLE</code>) to get cleaner output.</li>
  <li>Add <code>$display</code> prints to isolate the failing frame.</li>
  <li>Convert hex to binary. Apply XOR. Identify the failing bit.</li>
  <li>Cross-reference with driver shift loop — is the bit order correct?</li>
  <li>Fix, re-run regression, confirm all tests pass.</li>
</ol>

<h3>What you will build</h3>
<p>A <code>spi_debug_monitor</code> class with a <code>report_frame()</code> task. It prints the actual and expected values in both binary and hex, XORs them, and lists every mismatched bit. The testbench plants one deliberate mismatch so you can verify the class catches it.</p>
<pre class="code-block">class spi_debug_monitor;
  int frame_count = 0;
  task report_frame(logic [7:0] actual, logic [7:0] expected);
    logic [7:0] diff;
    frame_count++;
    diff = actual ^ expected;
    $display("[DBG %0d] actual=%b (8'h%0h)  expected=%b (8'h%0h)",
             frame_count, actual, actual, expected, expected);
    if (diff === 8'h00) begin
      $display("PASS frame %0d: match", frame_count);
    end else begin
      $display("FAIL frame %0d: diff bits = %b", frame_count, diff);
      for (int i = 7; i &gt;= 0; i--) begin
        if (diff[i])
          $display("  bit[%0d]: got %0b expected %0b", i, actual[i], expected[i]);
      end
    end
  endtask
endclass</pre>
<p><strong>Ready?</strong> Switch to the Code tab and build the class. Stuck? Tap 💡 Show Hint.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare: class spi_debug_monitor;',
        '  int frame_count = 0;',
        'Write task report_frame(logic [7:0] actual, logic [7:0] expected);',
        '  Declare: logic [7:0] diff;',
        '  frame_count++;',
        '  diff = actual ^ expected;',
        "  $display(\"[DBG %0d] actual=%b (8'h%0h)  expected=%b (8'h%0h)\", frame_count, actual, actual, expected, expected);",
        '  if (diff === 8\'h00): $display("PASS frame %0d: match", frame_count)',
        '  else: $display("FAIL frame %0d: diff bits = %b", frame_count, diff)',
        '  Inside else: for (int i = 7; i >= 0; i--) loop — print bit[i] if diff[i] is set',
        'Close endtask, then endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — 3 PASS frame lines, 1 FAIL frame with per-bit detail, then PASS: debug complete.',
      ],
      hint:
`class spi_debug_monitor;
  int frame_count = 0;

  task report_frame(logic [7:0] actual, logic [7:0] expected);
    logic [7:0] diff;
    frame_count++;
    diff = actual ^ expected;
    $display("[DBG %0d] actual=%b (8'h%0h)  expected=%b (8'h%0h)",
             frame_count, actual, actual, expected, expected);
    if (diff === 8'h00) begin
      $display("PASS frame %0d: match", frame_count);
    end else begin
      $display("FAIL frame %0d: diff bits = %b", frame_count, diff);
      for (int i = 7; i >= 0; i--) begin
        if (diff[i])
          $display("  bit[%0d]: got %0b expected %0b", i, actual[i], expected[i]);
      end
    end
  endtask

endclass`,
      design:
`// Build the spi_debug_monitor class here.
//
// class spi_debug_monitor;
//   int frame_count = 0;
//
//   task report_frame(logic [7:0] actual, logic [7:0] expected);
//     // 1. frame_count++
//     // 2. diff = actual ^ expected
//     // 3. $display both values in %b (binary) and %0h (hex)
//     // 4. if diff===0: PASS frame N: match
//     //    else:        FAIL frame N: diff bits = <binary diff>
//     //                 then loop i=7..0, print bit[i] if diff[i]
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
    spi_driver        drv;
    spi_debug_monitor dbg;
    logic [7:0] sent;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv = new(vif);
    dbg = new();

    // Frame 1: correct
    sent = 8'hA5;
    drv.drive_byte(sent); #4;
    dbg.report_frame(rx_byte, sent);

    // Frame 2: correct
    sent = 8'h5A;
    drv.drive_byte(sent); #4;
    dbg.report_frame(rx_byte, sent);

    // Frame 3: correct
    sent = 8'hFF;
    drv.drive_byte(sent); #4;
    dbg.report_frame(rx_byte, sent);

    // Frame 4: planted mismatch — driver sent 8'hA5, but wrong expected value given
    // This simulates a scoreboard mismatch you would see during a real debug session
    sent = 8'hA5;
    drv.drive_byte(sent); #4;
    dbg.report_frame(rx_byte, 8'hFF);  // wrong expected: shows which bits differ

    $display("--- debug summary: %0d frames analysed ---", dbg.frame_count);
    if (dbg.frame_count == 4)
      $display("PASS: debug complete");
    else
      $display("FAIL: wrong frame count %0d", dbg.frame_count);

    $finish;
  end
endmodule`,
      expected: [
        "PASS frame 1: match",
        "FAIL frame 4: diff bits =",
        "PASS: debug complete"
      ]
    }
  ]
});
