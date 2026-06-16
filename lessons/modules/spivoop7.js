(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop7',
  title: 'Ch.7 — SPI Agent',
  icon: '🤖',
  level: 'intermediate',
  lessons: [
    {
      id: 'spivoop7l1',
      title: 'L1 — Container and Coordinator',
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
          name: 'spi_monitor.sv',
          from: 'spivoop6-spivoop6l1-design',
          fallback:
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
endclass`
        },
        {
          name: 'spi_slave.sv',
          content:
`// spi_slave.sv — SPI Mode 0 behavioral slave (CPOL=0, CPHA=0)
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
`<h2>The Agent — Container and Coordinator</h2>
<p>An <strong>agent</strong> is a container class that owns a driver, a monitor, and two mailboxes. It is the unit of reuse in a class-based testbench: need two SPI buses? Instantiate two agents. Need to replace the driver with a faster one? Change it inside the agent — no test changes. Tests never reach inside to touch the driver or monitor directly; they communicate only through the agent's two mailboxes.</p>

<h3>Agent structure</h3>
<pre class="code-block">class spi_agent;
  spi_driver              drv;
  spi_monitor             mon;
  mailbox #(spi_transaction) stim_mbx;  // stimulus IN: tests put() here
  mailbox #(spi_transaction) obs_mbx;   // observations OUT: monitor put()s here

  function new(virtual spi_if vif);
    stim_mbx = new();  obs_mbx = new();
    drv = new(vif);
    mon = new(vif, obs_mbx);   // monitor writes into obs_mbx
  endfunction
endclass</pre>

<h3>Transaction flow through the agent</h3>
<table class="truth-table">
  <tr><th>Who</th><th>Action</th><th>Mailbox</th></tr>
  <tr><td>Test</td><td><code>stim_mbx.put(txn)</code></td><td>stim_mbx ← txn</td></tr>
  <tr><td>Agent <code>run()</code></td><td><code>stim_mbx.get(txn)</code> → <code>drv.drive_byte(txn.data)</code></td><td>SPI bus activity</td></tr>
  <tr><td>Monitor <code>run()</code></td><td>samples bus → <code>obs_mbx.put(txn)</code></td><td>obs_mbx ← txn</td></tr>
  <tr><td>Test</td><td><code>obs_mbx.get(obs)</code> → compare</td><td>obs_mbx → test</td></tr>
</table>

<h3>The run(n) task</h3>
<p><code>run(n)</code> starts the monitor in the background, then drives exactly <code>n</code> transactions from <code>stim_mbx</code>:</p>
<pre class="code-block">task run(int n);
  fork mon.run(); join_none   // monitor watches in background
  repeat(n) begin
    spi_transaction txn;
    stim_mbx.get(txn);        // blocks until test puts a transaction
    drv.drive_byte(txn.data);
  end
endtask</pre>
<p>After <code>run(n)</code> returns, the test calls <code>obs_mbx.get()</code> to collect observations. <code>get()</code> is a blocking call — if the monitor is still processing the last frame, the test waits until it is done.</p>

<h3>Why the test queues transactions before calling run()</h3>
<p>Putting transactions into <code>stim_mbx</code> before calling <code>run()</code> is a common pattern. The mailbox buffers them; <code>run()</code> drains them in order. It decouples test setup (what to send) from execution (when to send it), which makes test code readable and reusable.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the class. Stuck? Tap 💡 Show Hint for the complete solution.</p>`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare class spi_agent with four members: spi_driver drv, spi_monitor mon, mailbox #(spi_transaction) stim_mbx, mailbox #(spi_transaction) obs_mbx',
        'Write function new(virtual spi_if vif):',
        '  Create both mailboxes: stim_mbx = new();  obs_mbx = new();',
        '  Create driver:  drv = new(vif)',
        '  Create monitor: mon = new(vif, obs_mbx)  — pass obs_mbx so monitor writes observations there',
        'Write task run(int n):',
        '  First line: fork mon.run(); join_none',
        '  Then: repeat(n) begin  spi_transaction txn;  stim_mbx.get(txn);  drv.drive_byte(txn.data);  end',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`class spi_agent;
  spi_driver             drv;
  spi_monitor            mon;
  mailbox #(spi_transaction) stim_mbx;
  mailbox #(spi_transaction) obs_mbx;

  function new(virtual spi_if vif);
    stim_mbx = new();
    obs_mbx  = new();
    drv      = new(vif);
    mon      = new(vif, obs_mbx);
  endfunction

  task run(int n);
    fork mon.run(); join_none
    repeat(n) begin
      spi_transaction txn;
      stim_mbx.get(txn);
      drv.drive_byte(txn.data);
    end
  endtask
endclass`,
      design:
`// Type the spi_agent class here. See Theory for the concept.
//
// Members:
//   spi_driver              drv
//   spi_monitor             mon
//   mailbox #(spi_transaction) stim_mbx   // stimulus IN
//   mailbox #(spi_transaction) obs_mbx    // observations OUT
//
// new(virtual spi_if vif):
//   stim_mbx = new();  obs_mbx = new();
//   drv = new(vif)
//   mon = new(vif, obs_mbx)   <- monitor writes to obs_mbx
//
// task run(int n):
//   fork mon.run(); join_none
//   repeat(n): get txn from stim_mbx, drive drv.drive_byte(txn.data)
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
    spi_agent       agt;
    spi_transaction txn, obs;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;

    agt = new(vif);

    // Queue 3 transactions into stimulus mailbox before running
    txn = new(); txn.data = 8'hA5; agt.stim_mbx.put(txn);
    txn = new(); txn.data = 8'hC3; agt.stim_mbx.put(txn);
    txn = new(); txn.data = 8'h00; agt.stim_mbx.put(txn);

    // Agent drives all 3 frames; monitor captures them into obs_mbx
    agt.run(3);

    // Collect and verify observations (get() blocks until monitor is done)
    agt.obs_mbx.get(obs);
    if (obs.data === 8'hA5)
      $display("PASS [1] agent observed 8'ha5");
    else
      $display("FAIL [1] got 8'h%0h expected 8'ha5", obs.data);

    agt.obs_mbx.get(obs);
    if (obs.data === 8'hC3)
      $display("PASS [2] agent observed 8'hc3");
    else
      $display("FAIL [2] got 8'h%0h expected 8'hc3", obs.data);

    agt.obs_mbx.get(obs);
    if (obs.data === 8'h00)
      $display("PASS [3] agent observed 8'h00");
    else
      $display("FAIL [3] got 8'h%0h expected 8'h00", obs.data);

    $display("PASS: spi_agent works");
    $finish;
  end
endmodule`,
      expected: [
        "PASS [1] agent observed 8'ha5",
        "PASS [3] agent observed 8'h00",
        "PASS: spi_agent works"
      ]
    }
  ]
});
