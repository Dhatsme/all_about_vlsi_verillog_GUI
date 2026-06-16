(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop5',
  title: 'OOP TB Ch.5 — spi_driver',
  icon: '\u{1F3CE}',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop5l1',
      title: 'L1 — Driving the SPI Bus',
      files: [
        {
          name: 'spi_if.sv',
          from: 'spivoop4-spivoop4l1-design',
          fallback:
`interface spi_if;
  logic sclk;
  logic cs_n;
  logic mosi;
  logic miso;
endinterface`
        },
        {
          name: 'spi_slave.sv',
          content:
`// spi_slave.sv — SPI Mode 0 behavioral slave (CPOL=0, CPHA=0)
// Samples MOSI on rising SCLK while CS is active, exposes received
// byte through rx_byte. miso echo is wired in Ch.6.
module spi_slave (
  input  logic       sclk,
  input  logic       cs_n,
  input  logic       mosi,
  output logic       miso,
  output logic [7:0] rx_byte
);
  logic [7:0] shift_reg = 8'h00;

  // Shift in MOSI on every rising SCLK while CS is asserted
  always_ff @(posedge sclk) begin
    if (!cs_n)
      shift_reg <= {shift_reg[6:0], mosi};  // MSB first
  end

  assign rx_byte = shift_reg;
  assign miso    = 1'b0;   // loopback echo wired in Ch.6
endmodule`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory: `
<h2>First contact with real hardware</h2>
<p>The four components built so far &#8212; <code>spi_transaction</code>, <code>spi_scoreboard</code>,
<code>spi_mailbox</code>, and <code>spi_if</code> &#8212; exist entirely in simulation software.
They carry data and track state, but they never change a signal that a circuit
could see or respond to.</p>
<p>The <strong>driver</strong> is the first component that writes real wires.
It takes a byte and translates it into the pin-level SPI signals a device understands:
assert <code>cs_n</code>, set <code>mosi</code> bit by bit, toggle <code>sclk</code>,
de-assert <code>cs_n</code>. This chapter also introduces the first real DUT:
<code>spi_slave.sv</code>, a behavioral SPI slave that samples <code>mosi</code> on every
rising <code>sclk</code> edge and exposes the received byte through <code>rx_byte</code>.
Your driver will talk to this slave for the rest of the course.</p>

<h3>virtual interface &#8212; how a class holds a wire handle</h3>
<p>A class lives in simulation memory. A wire lives in the elaborated netlist.
They are different worlds. The <code>virtual</code> keyword creates a handle &#8212;
like a pointer &#8212; that bridges them:</p>
<pre class="code-block">
class spi_driver;
  virtual spi_if vif;        // handle &#8212; points nowhere until assigned

  function new(virtual spi_if v);
    vif = v;                 // store the handle from the testbench
  endfunction

  task do_something();
    vif.cs_n = 0;            // writes the real wire through the handle
  endtask
endclass
</pre>
<p>In the testbench: <code>drv = new(vif)</code>. From that moment, every
<code>vif.cs_n</code> inside the driver writes the same signal the DUT sees.</p>

<h3>SPI Mode 0 timing</h3>
<table class="truth-table">
  <tr><th>Signal</th><th>Idle</th><th>Transaction start</th><th>Each of 8 bits</th><th>Transaction end</th></tr>
  <tr><td><code>cs_n</code></td><td>1</td><td>&#8594; 0</td><td>stay 0</td><td>&#8594; 1</td></tr>
  <tr><td><code>mosi</code></td><td>X</td><td>set bit 7</td><td>set bit N before sclk rises</td><td>X</td></tr>
  <tr><td><code>sclk</code></td><td>0</td><td>stay 0</td><td>&#8594; 1 &#8594; 0 (one pulse per bit)</td><td>stay 0</td></tr>
</table>
<p>Mode 0 means CPOL=0 (clock idles low) and CPHA=0 (slave latches on the rising edge).
Set <code>mosi</code> first, then raise <code>sclk</code> &#8212; the slave captures on the rising edge.
Add a <code>#2</code> delay between each transition so the DUT has time to react.</p>

<h3>spi_slave.sv &#8212; the DUT</h3>
<p>Click the <code>spi_slave.sv</code> tab to the left. The slave has a single 8-bit shift
register that shifts in <code>mosi</code> on every rising <code>sclk</code> edge while
<code>cs_n</code> is low. After 8 pulses the register holds the full byte, and the
<code>rx_byte</code> output reflects it. The testbench reads <code>rx_byte</code> directly
after each <code>drive_byte</code> call to verify the slave received the correct data.</p>

<h3>Why &#8212;timing is required from this chapter onward</h3>
<p>Chapters 1&#8211;4 used <code>--no-timing</code> because all code ran in functions with
no time advancement. The driver is a <code>task</code> that uses <code>#2</code> delays to
step simulation time forward &#8212; each <code>#2</code> gives the DUT&#8217;s
<code>always_ff @(posedge sclk)</code> block time to fire. Without <code>--timing</code>,
Verilator ignores all <code>#delay</code> statements and the slave never sees any edges.
<code>verilatorFlags</code> in this chapter auto-selects <code>--timing</code> when the lesson
loads &#8212; no manual change needed.</p>

<h3>What you build</h3>
<p>The <code>spi_driver</code> class: a <code>virtual spi_if</code> member, a constructor
that stores the handle, and a <code>drive_byte</code> task that generates one complete
8-bit SPI frame &#8212; assert <code>cs_n</code>, clock out 8 bits MSB-first with
<code>#2</code> delays between transitions, de-assert <code>cs_n</code>.
The pre-filled testbench connects your driver to <code>spi_slave.sv</code> and checks
that <code>rx_byte</code> matches every byte you sent.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the class. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare the class: class spi_driver;',
        'Declare the handle: virtual spi_if vif;',
        'Constructor: function new(virtual spi_if v);  vif = v;  endfunction',
        'Task header: task drive_byte(logic [7:0] data);',
        'Assert CS: vif.cs_n = 0; then #2;',
        'Loop for (int i = 7; i >= 0; i--): set vif.mosi = data[i], then #2, sclk=1, #2, sclk=0, #2',
        'After loop: vif.cs_n = 1; then #2; endtask',
        'Close: endclass',
        'Using Verilator: open ⚙ Options — --timing is auto-applied (required: drive_byte uses #2 delays to generate real clock edges)',
        'Hit Run — PASS [1] through PASS [3] and PASS: spi_driver works',
      ],

      hint:
`class spi_driver;
  virtual spi_if vif;   // handle to the physical signals

  function new(virtual spi_if v);
    vif = v;            // store the handle from the testbench
  endfunction

  // Drives one 8-bit SPI frame, MSB first, Mode 0 (CPOL=0 CPHA=0)
  task drive_byte(logic [7:0] data);
    vif.cs_n = 0;             // assert chip select - transaction begins
    #2;
    for (int i = 7; i >= 0; i--) begin
      vif.mosi = data[i];    // put bit N on MOSI (bit 7 first)
      #2;                    // setup time before rising edge
      vif.sclk = 1;          // rising edge - slave latches MOSI here
      #2;                    // hold time
      vif.sclk = 0;          // falling edge - prepare for next bit
      #2;
    end
    vif.cs_n = 1;             // de-assert chip select - transaction ends
    #2;
  endtask

endclass

// Common mistakes:
//   Wrong: function drive_byte   <- functions cannot have #delay
//   Right: task    drive_byte
//
//   Wrong: vif.sclk = 1; vif.sclk = 0;  <- no delay: DUT sees nothing
//   Right: vif.sclk = 1; #2; vif.sclk = 0;
//
//   Wrong: for (int i = 0; i < 8; i++)   <- LSB first (wrong for Mode 0)
//   Right: for (int i = 7; i >= 0; i--)  <- MSB first
`,

      design:
`// Chapter 5: write the spi_driver class here.
// See Theory for the virtual interface pattern and SPI Mode 0 timing.
//
// Members:
//   virtual spi_if vif    -- handle to the physical signals
//
// Methods:
//   new(virtual spi_if v)           -- store vif = v
//   task drive_byte(logic [7:0])    -- cs_n low, 8 bits MSB-first with #2 delays, cs_n high
//
// KEY: use task (not function) and add #2 between every signal change
//      --timing is auto-applied for this chapter
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
// Pre-filled test harness -- do not edit this tab.
// Simulator: verilator (auto-selected). Options: --timing (auto-applied).
// --timing is required: drive_byte uses #2 delays to generate real SCLK edges.
module tb;
  spi_if    vif();
  logic [7:0] rx_captured;

  spi_slave dut (
    .sclk    (vif.sclk),
    .cs_n    (vif.cs_n),
    .mosi    (vif.mosi),
    .miso    (vif.miso),
    .rx_byte (rx_captured)
  );

  initial begin
    spi_driver drv;
    $display("=== Chapter 5: spi_driver ===");

    // Idle state
    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;

    drv = new(vif);

    // Test 1: send 8'hA5 (1010_0101 -- alternating pattern)
    drv.drive_byte(8'hA5);
    #1;
    if (rx_captured === 8'hA5)
      $display("PASS [1] slave received 8'h%02h", rx_captured);
    else
      $display("FAIL [1] slave got 8'h%02h (expected 8'ha5)", rx_captured);

    // Test 2: send 8'hFF (all ones)
    drv.drive_byte(8'hFF);
    #1;
    if (rx_captured === 8'hFF)
      $display("PASS [2] slave received 8'h%02h", rx_captured);
    else
      $display("FAIL [2] slave got 8'h%02h (expected 8'hff)", rx_captured);

    // Test 3: send 8'h00 (all zeros)
    drv.drive_byte(8'h00);
    #1;
    if (rx_captured === 8'h00)
      $display("PASS [3] slave received 8'h%02h", rx_captured);
    else
      $display("FAIL [3] slave got 8'h%02h (expected 8'h00)", rx_captured);

    $display("PASS: spi_driver works");
    $finish;
  end
endmodule`,

      expected: [
        "PASS [1] slave received 8'ha5",
        "PASS [3] slave received 8'h00",
        'PASS: spi_driver works'
      ]
    }
  ]
});
