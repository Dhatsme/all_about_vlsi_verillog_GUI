(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop6',
  title: 'Ch.6 — SPI Monitor',
  icon: '👁️',
  level: 'intermediate',
  lessons: [
    {
      id: 'spivoop6l1',
      title: 'L1 — The Passive Observer',
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
          name: 'spi_transaction.sv',
          from: 'spivoop1-spivoop1l1-design',
          fallback:
`class spi_transaction;
  logic [7:0] data;
  function new();
    data = 8'h00;
  endfunction
endclass`
        },
        {
          name: 'spi_driver.sv',
          from: 'spivoop5-spivoop5l1-design',
          fallback:
`class spi_driver;
  virtual spi_if vif;
  function new(virtual spi_if v);
    vif = v;
  endfunction
  task drive_byte(logic [7:0] data);
    vif.cs_n = 0; #2;
    for (int i = 7; i >= 0; i--) begin
      vif.mosi = data[i];
      #2; vif.sclk = 1;
      #2; vif.sclk = 0;
      #2;
    end
    vif.cs_n = 1; #2;
  endtask
endclass`
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

  always_ff @(posedge sclk) begin
    if (!cs_n)
      shift_reg <= {shift_reg[6:0], mosi};
  end

  assign rx_byte = shift_reg;
  assign miso    = 1'b0;
endmodule`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>The Passive Observer</h2>
<p>A <strong>monitor</strong> watches bus activity and reconstructs transactions — without ever driving a signal. While the driver generates SCLK edges and MOSI data, the monitor samples those same wires in parallel and packages what it sees into transaction objects. Those objects go into a mailbox that tests read to know what actually happened on the bus.</p>

<h3>Why separate driver and monitor?</h3>
<p>Think of a wiretap on a phone line: the recorder listens without speaking, and it works whether the caller is Alice or Bob. The monitor is that tap. You can swap out the driver for a faster, randomised one and the monitor keeps working unchanged. You can upgrade the monitor to check timing instead of data values and the driver keeps working unchanged. Neither component knows the other exists.</p>

<h3>How the monitor follows an SPI frame</h3>
<table class="truth-table">
  <tr><th>Signal event</th><th>What the monitor does</th></tr>
  <tr><td><code>negedge cs_n</code></td><td>Wake up. Clear the capture register to zero.</td></tr>
  <tr><td><code>posedge sclk</code> (×8)</td><td>Shift <code>vif.mosi</code> into the shift register — MSB arrives first.</td></tr>
  <tr><td><code>posedge cs_n</code></td><td>Frame complete. Create an <code>spi_transaction</code>, fill in <code>.data</code>, put it in the mailbox.</td></tr>
  <tr><td>idle</td><td>Loop back, waiting for the next <code>negedge cs_n</code>.</td></tr>
</table>

<h3>The run() task structure</h3>
<pre class="code-block">task run();
  logic [7:0] captured;
  forever begin
    @(negedge vif.cs_n);                    // frame start
    captured = 8'h00;
    repeat(8) begin
      @(posedge vif.sclk);                  // rising SCLK: slave samples here too
      captured = {captured[6:0], vif.mosi}; // MSB-first: first bit lands in bit7
    end
    @(posedge vif.cs_n);                    // frame end
    // create txn, set .data = captured, mbx.put(txn)
  end
endtask</pre>

<h3>Why MSB first?</h3>
<p>The shift <code>{captured[6:0], vif.mosi}</code> pushes each new bit into the LSB, sliding existing bits up. After 8 cycles the first received bit sits in bit 7 — exactly where MSB belongs. SPI conventionally sends the most significant bit first, matching this shift behaviour.</p>

<h3>Running driver and monitor in parallel</h3>
<p>The driver generates SCLK edges while the monitor waits for them — they must run concurrently. Use <code>fork...join_none</code> to launch the monitor in the background before the driver starts:</p>
<pre class="code-block">fork
  mon.run();             // starts immediately; never blocks this thread
join_none
drv.drive_byte(8'hA5);  // driver runs; monitor watches the same interface
mbx.get(obs);           // blocks until monitor puts the captured txn here</pre>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for the complete solution.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare: class spi_monitor — two member handles: virtual spi_if vif  and  mailbox #(spi_transaction) mbx',
        'Write: function new(virtual spi_if vif, mailbox #(spi_transaction) mbx) — store both with this.vif = vif and this.mbx = mbx',
        'Write: task run() — declare locals: spi_transaction txn  and  logic [7:0] captured',
        'Wrap the task body in: forever begin ... end',
        'First line inside the loop: @(negedge vif.cs_n); — blocks until CS_N falls (frame start)',
        "Next: captured = 8'h00; — clear the shift register",
        'Next: repeat(8) begin  @(posedge vif.sclk);  captured = {captured[6:0], vif.mosi};  end',
        'After the repeat: @(posedge vif.cs_n); — wait for CS_N to rise (frame end)',
        'Last three lines: txn = new();  txn.data = captured;  mbx.put(txn);',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`class spi_monitor;
  virtual spi_if             vif;
  mailbox #(spi_transaction) mbx;

  function new(virtual spi_if vif, mailbox #(spi_transaction) mbx);
    this.vif = vif;
    this.mbx = mbx;
  endfunction

  task run();
    spi_transaction txn;
    logic [7:0]     captured;
    forever begin
      @(negedge vif.cs_n);
      captured = 8'h00;
      repeat(8) begin
        @(posedge vif.sclk);
        captured = {captured[6:0], vif.mosi};
      end
      @(posedge vif.cs_n);
      txn      = new();
      txn.data = captured;
      mbx.put(txn);
    end
  endtask
endclass`,
      design:
`// Type the spi_monitor class here. See Theory for the concept.
//
// Constructor args: virtual spi_if vif, mailbox #(spi_transaction) mbx
//
// Methods:
//   new(...)  — store vif and mbx handles
//   run()     — loop forever:
//               wait CS_N fall → sample 8 SCLK pulses → wait CS_N rise → put txn
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  spi_if      vif();
  logic [7:0] rx_captured;

  spi_slave dut (
    .sclk(vif.sclk), .cs_n(vif.cs_n),
    .mosi(vif.mosi), .miso(vif.miso),
    .rx_byte(rx_captured)
  );

  initial begin
    spi_driver             drv;
    spi_monitor            mon;
    mailbox #(spi_transaction) mbx;
    spi_transaction        obs;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;

    mbx = new();
    drv = new(vif);
    mon = new(vif, mbx);

    fork mon.run(); join_none

    // Test 1: standard byte
    drv.drive_byte(8'hA5);
    mbx.get(obs);
    if (obs.data === 8'hA5)
      $display("PASS [1] monitor captured 8'ha5");
    else
      $display("FAIL [1] got 8'h%0h expected 8'ha5", obs.data);

    // Test 2: complementary pattern
    drv.drive_byte(8'hC3);
    mbx.get(obs);
    if (obs.data === 8'hC3)
      $display("PASS [2] monitor captured 8'hc3");
    else
      $display("FAIL [2] got 8'h%0h expected 8'hc3", obs.data);

    // Test 3: all zeros
    drv.drive_byte(8'h00);
    mbx.get(obs);
    if (obs.data === 8'h00)
      $display("PASS [3] monitor captured 8'h00");
    else
      $display("FAIL [3] got 8'h%0h expected 8'h00", obs.data);

    // Test 4: all ones
    drv.drive_byte(8'hFF);
    mbx.get(obs);
    if (obs.data === 8'hFF)
      $display("PASS [4] monitor captured 8'hff");
    else
      $display("FAIL [4] got 8'h%0h expected 8'hff", obs.data);

    $display("PASS: spi_monitor works");
    $finish;
  end
endmodule`,
      expected: [
        "PASS [1] monitor captured 8'ha5",
        "PASS [4] monitor captured 8'hff",
        "PASS: spi_monitor works"
      ]
    }
  ]
});
