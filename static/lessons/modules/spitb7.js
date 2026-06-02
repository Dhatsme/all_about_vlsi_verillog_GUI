(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spitb7',
  title: 'SPI Bus Controller Missing Test Cases',
  icon: '🧩',
  level: 'advanced',
  lessons: [

    {
      id: 'spitb7l1',
      title: 'L1 — TC1 Device Re-Select &amp; TC2 CS_N Exclusivity',
      theory: `
<h2>Testing the CS_N Routing Engine</h2>
<p>The bus controller's most important job is routing CS_N correctly: exactly one chip
select goes low per transfer, it goes low before SCLK starts, and it returns high
before the next transfer begins. A bug here corrupts two slaves simultaneously —
the classic <em>CS_N collision</em> fault.</p>

<p>Two test cases expose this class of bug:</p>
<table class="truth-table">
<tr><th>TC</th><th>Scenario</th><th>What it catches</th></tr>
<tr><td>TC1</td><td>Device re-select: 0 → 2 → 0</td><td>dev_sel_r not updating between transfers</td></tr>
<tr><td>TC2</td><td>CS_N exclusivity monitor</td><td>Any instant where two CS_N lines are simultaneously low</td></tr>
</table>

<h3>The mon_cs_collision sticky flag</h3>
<p>CS_N collisions last only nanoseconds — too short for a sequential check.
A monitor catches them automatically:</p>
<pre class="code-block">logic mon_cs_collision;
always_ff @(posedge clk) begin
  if (rst) mon_cs_collision &lt;= 1'b0;
  else if ((!cs0_n &amp;&amp; !cs1_n) || (!cs0_n &amp;&amp; !cs2_n) || (!cs1_n &amp;&amp; !cs2_n))
    mon_cs_collision &lt;= 1'b1;  // sticky — once set, stays set
end
</pre>
<p>If the flag is still 0 after all transfers complete, no collision ever happened.</p>

<h3>Slave models inside the testbench</h3>
<p>Each slave model pre-loads a unique byte (0xAA, 0xBB, 0xCC) when its CS_N falls,
then shifts left on every SCLK falling edge. This is identical to spitb5 L3.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build the testbench. Stuck? Tap 💡 Show Hint for the complete solution.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb with spi_bus_ctrl ports: rst, start, dev_sel[1:0], tx_data[7:0], rx_data[7:0], busy, done, mosi, sclk, cs0_n, cs1_n, cs2_n, miso0, miso1, miso2',
        'Instantiate spi_bus_ctrl dut with all named port connections',
        'Add three always_ff slave models: slave0→0xAA cs0_n, slave1→0xBB cs1_n, slave2→0xCC cs2_n (pre-load on CS fall, shift on sclk fall)',
        'Add mon_cs_collision: sticky always_ff that latches if any two CS_N are simultaneously low',
        "Write drv_start_xfer(dev, tx): dev_sel=dev, tx_data=tx, pulse start=1 @clk #1; start=0; repeat(150) @clk #1",
        "TC1: drv_start_xfer(0,0); check 0xAA; drv_start_xfer(2,0); check 0xCC; drv_start_xfer(0,0); check 0xAA",
        'TC2: check !mon_cs_collision; display PASS/FAIL',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS  slave 0 -> 0xaa, PASS  slave 2 -> 0xcc, PASS  CS_N exclusivity should appear',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst, start, busy, done;
  logic [1:0]  dev_sel;
  logic [7:0]  tx_data, rx_data;
  logic        mosi, sclk;
  logic        cs0_n, cs1_n, cs2_n;
  logic        miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  logic [7:0] mon_s0_shift, mon_s1_shift, mon_s2_shift;
  logic mon_sclk_prev, mon_cs0_prev, mon_cs1_prev, mon_cs2_prev;

  always_ff @(posedge clk) begin
    mon_sclk_prev <= sclk;
    mon_cs0_prev  <= cs0_n;
    mon_cs1_prev  <= cs1_n;
    mon_cs2_prev  <= cs2_n;
  end

  always_ff @(posedge clk) begin
    if (~cs0_n & mon_cs0_prev) mon_s0_shift <= 8'hAA;
    else if (~sclk & mon_sclk_prev & ~cs0_n) mon_s0_shift <= {mon_s0_shift[6:0], 1'b0};
  end
  assign miso0 = cs0_n ? 1'b0 : mon_s0_shift[7];

  always_ff @(posedge clk) begin
    if (~cs1_n & mon_cs1_prev) mon_s1_shift <= 8'hBB;
    else if (~sclk & mon_sclk_prev & ~cs1_n) mon_s1_shift <= {mon_s1_shift[6:0], 1'b0};
  end
  assign miso1 = cs1_n ? 1'b0 : mon_s1_shift[7];

  always_ff @(posedge clk) begin
    if (~cs2_n & mon_cs2_prev) mon_s2_shift <= 8'hCC;
    else if (~sclk & mon_sclk_prev & ~cs2_n) mon_s2_shift <= {mon_s2_shift[6:0], 1'b0};
  end
  assign miso2 = cs2_n ? 1'b0 : mon_s2_shift[7];

  logic mon_cs_collision;
  always_ff @(posedge clk) begin
    if (rst) mon_cs_collision <= 1'b0;
    else if ((!cs0_n && !cs1_n) || (!cs0_n && !cs2_n) || (!cs1_n && !cs2_n))
      mon_cs_collision <= 1'b1;
  end

  task automatic drv_start_xfer(input logic [1:0] dev, input logic [7:0] tx);
    dev_sel = dev; tx_data = tx; start = 1'b1;
    @(posedge clk); #1; start = 1'b0;
    repeat(150) @(posedge clk); #1;
  endtask

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    drv_start_xfer(2'd0, 8'h00);
    if (rx_data === 8'hAA) $display("PASS  slave 0 -> 0x%0h", rx_data);
    else $display("FAIL  slave 0 -> 0x%0h (expected 0xaa)", rx_data);

    drv_start_xfer(2'd2, 8'h00);
    if (rx_data === 8'hCC) $display("PASS  slave 2 -> 0x%0h", rx_data);
    else $display("FAIL  slave 2 -> 0x%0h (expected 0xcc)", rx_data);

    drv_start_xfer(2'd0, 8'h00);
    if (rx_data === 8'hAA) $display("PASS  slave 0 re-select -> 0x%0h", rx_data);
    else $display("FAIL  slave 0 re-select -> 0x%0h (expected 0xaa)", rx_data);

    if (!mon_cs_collision) $display("PASS  CS_N exclusivity: no collision detected");
    else $display("FAIL  CS_N exclusivity: collision detected");

    $display("TC1 TC2 complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, busy, done;
  logic [1:0] dev_sel;
  logic [7:0] tx_data, rx_data;
  logic       mosi, sclk;
  logic       cs0_n, cs1_n, cs2_n;
  logic       miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // --- slave models (always_ff) ---
  // slave0->0xAA cs0_n, slave1->0xBB cs1_n, slave2->0xCC cs2_n
  // pre-load on CS fall, shift left on sclk fall

  // --- mon_cs_collision: sticky flag ---
  // latches if any two CS_N lines are simultaneously low

  // --- drv_start_xfer(dev, tx): pulse start, wait 150 clk ---

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;
    // TC1: re-select 0 -> 2 -> 0, check rx_data each time
    // TC2: check !mon_cs_collision
    $display("TC1 TC2 complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_master (
  input  logic       clk, rst, start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;
    if (rst) begin
      busy <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_data;
      bit_cnt  <= 0;
      phase    <= 2'd3;
    end else if (busy) begin
      phase <= phase + 1;
      unique case (phase)
        2'd0: begin
          sclk_r   <= 1;
          rx_shift <= {rx_shift[6:0], miso};
        end
        2'd1: ;
        2'd2: begin
          sclk_r <= 0;
          if (bit_cnt == 3'd7) begin
            cs_n    <= 1;
            rx_data <= {rx_shift[6:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[6:0], 1'b0};
          end
        end
        2'd3: ;
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];
endmodule

module spi_bus_ctrl (
  input  logic       clk, rst, start,
  input  logic [1:0] dev_sel,
  input  logic [7:0] tx_data,
  input  logic       miso0, miso1, miso2,
  output logic       mosi, sclk,
  output logic       cs0_n, cs1_n, cs2_n,
  output logic       busy, done,
  output logic [7:0] rx_data
);
  logic       master_cs_n;
  logic       miso_in;
  logic [1:0] dev_sel_r;

  always_ff @(posedge clk) begin
    if (rst)        dev_sel_r <= 2'd0;
    else if (start) dev_sel_r <= dev_sel;
  end

  spi_master master_inst (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso_in),
    .mosi(mosi), .sclk(sclk),
    .cs_n(master_cs_n), .busy(busy),
    .done(done), .rx_data(rx_data)
  );

  assign cs0_n = (dev_sel_r == 2'd0) ? master_cs_n : 1'b1;
  assign cs1_n = (dev_sel_r == 2'd1) ? master_cs_n : 1'b1;
  assign cs2_n = (dev_sel_r == 2'd2) ? master_cs_n : 1'b1;

  assign miso_in = (dev_sel_r == 2'd0) ? miso0 :
                   (dev_sel_r == 2'd1) ? miso1 : miso2;
endmodule`,
      expected: [
        'PASS  slave 0 -> 0xaa',
        'PASS  slave 2 -> 0xcc',
        'PASS  CS_N exclusivity: no collision detected',
        'TC1 TC2 complete.'
      ]
    },

    {
      id: 'spitb7l2',
      title: 'L2 — TC3 MISO Isolation &amp; TC4 Back-to-Back Transfer',
      theory: `
<h2>MISO Mux Faults and Sequential Stress</h2>
<p>The bus controller's MISO mux selects which slave's MISO drives the master.
A wiring mistake — one wrong bit in the mux select — makes one slave's data silently
appear in another's transfer. Because each slave returns a unique byte, a single wrong
read immediately flags the mux bug.</p>

<table class="truth-table">
<tr><th>TC</th><th>Scenario</th><th>Bug it catches</th></tr>
<tr><td>TC3</td><td>Transfer to each slave independently, verify unique return value</td><td>MISO mux wired wrong (e.g. miso0 used when dev_sel=1)</td></tr>
<tr><td>TC4</td><td>Back-to-back in reverse order: slave2 → 1 → 0</td><td>dev_sel_r not captured at transfer start; stale routing</td></tr>
</table>

<h3>Why reverse order matters</h3>
<p>If the DUT latches dev_sel one cycle too late, the routing for the new transfer
uses the <em>previous</em> dev_sel value. TC3 goes 0→1→2 (ascending), so TC4 reverses to
2→1→0: any latching error now produces a different wrong slave response.
Ordering tests to maximise fault exposure is a core verification skill.</p>

<p>The slave models and drv_start_xfer task are the same as L1.</p>
<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb, instantiate spi_bus_ctrl dut, add three slave models (same pattern as L1)',
        'Write drv_start_xfer(dev, tx): same as L1',
        'TC3: transfer to slave0, slave1, slave2 in order — check each returns 0xAA, 0xBB, 0xCC',
        'TC4: transfer to slave2, slave1, slave0 in reverse — check each returns 0xCC, 0xBB, 0xAA',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS  slave 1 -> 0xbb and PASS  slave 2 -> 0xcc must appear',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst, start, busy, done;
  logic [1:0]  dev_sel;
  logic [7:0]  tx_data, rx_data;
  logic        mosi, sclk;
  logic        cs0_n, cs1_n, cs2_n;
  logic        miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  logic [7:0] mon_s0_shift, mon_s1_shift, mon_s2_shift;
  logic mon_sclk_prev, mon_cs0_prev, mon_cs1_prev, mon_cs2_prev;

  always_ff @(posedge clk) begin
    mon_sclk_prev <= sclk;
    mon_cs0_prev  <= cs0_n;
    mon_cs1_prev  <= cs1_n;
    mon_cs2_prev  <= cs2_n;
  end

  always_ff @(posedge clk) begin
    if (~cs0_n & mon_cs0_prev) mon_s0_shift <= 8'hAA;
    else if (~sclk & mon_sclk_prev & ~cs0_n) mon_s0_shift <= {mon_s0_shift[6:0], 1'b0};
  end
  assign miso0 = cs0_n ? 1'b0 : mon_s0_shift[7];

  always_ff @(posedge clk) begin
    if (~cs1_n & mon_cs1_prev) mon_s1_shift <= 8'hBB;
    else if (~sclk & mon_sclk_prev & ~cs1_n) mon_s1_shift <= {mon_s1_shift[6:0], 1'b0};
  end
  assign miso1 = cs1_n ? 1'b0 : mon_s1_shift[7];

  always_ff @(posedge clk) begin
    if (~cs2_n & mon_cs2_prev) mon_s2_shift <= 8'hCC;
    else if (~sclk & mon_sclk_prev & ~cs2_n) mon_s2_shift <= {mon_s2_shift[6:0], 1'b0};
  end
  assign miso2 = cs2_n ? 1'b0 : mon_s2_shift[7];

  task automatic drv_start_xfer(input logic [1:0] dev, input logic [7:0] tx);
    dev_sel = dev; tx_data = tx; start = 1'b1;
    @(posedge clk); #1; start = 1'b0;
    repeat(150) @(posedge clk); #1;
  endtask

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // TC3: MISO isolation
    drv_start_xfer(2'd0, 8'h00);
    if (rx_data === 8'hAA) $display("PASS  slave 0 -> 0x%0h", rx_data);
    else $display("FAIL  slave 0: 0x%0h expected 0xaa", rx_data);

    drv_start_xfer(2'd1, 8'h00);
    if (rx_data === 8'hBB) $display("PASS  slave 1 -> 0x%0h", rx_data);
    else $display("FAIL  slave 1: 0x%0h expected 0xbb", rx_data);

    drv_start_xfer(2'd2, 8'h00);
    if (rx_data === 8'hCC) $display("PASS  slave 2 -> 0x%0h", rx_data);
    else $display("FAIL  slave 2: 0x%0h expected 0xcc", rx_data);

    // TC4: back-to-back reverse order
    drv_start_xfer(2'd2, 8'h00);
    if (rx_data === 8'hCC) $display("PASS  TC4 slave 2 -> 0x%0h", rx_data);
    else $display("FAIL  TC4 slave 2: 0x%0h expected 0xcc", rx_data);

    drv_start_xfer(2'd1, 8'h00);
    if (rx_data === 8'hBB) $display("PASS  TC4 slave 1 -> 0x%0h", rx_data);
    else $display("FAIL  TC4 slave 1: 0x%0h expected 0xbb", rx_data);

    drv_start_xfer(2'd0, 8'h00);
    if (rx_data === 8'hAA) $display("PASS  TC4 slave 0 -> 0x%0h", rx_data);
    else $display("FAIL  TC4 slave 0: 0x%0h expected 0xaa", rx_data);

    $display("TC3 TC4 complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, busy, done;
  logic [1:0] dev_sel;
  logic [7:0] tx_data, rx_data;
  logic       mosi, sclk;
  logic       cs0_n, cs1_n, cs2_n;
  logic       miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // --- slave models (same pattern as L1) ---
  // --- drv_start_xfer(dev, tx) ---

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;
    // TC3: 0 -> 1 -> 2, check 0xAA, 0xBB, 0xCC
    // TC4: 2 -> 1 -> 0, check 0xCC, 0xBB, 0xAA
    $display("TC3 TC4 complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_master (
  input  logic       clk, rst, start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;
    if (rst) begin
      busy <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_data;
      bit_cnt  <= 0;
      phase    <= 2'd3;
    end else if (busy) begin
      phase <= phase + 1;
      unique case (phase)
        2'd0: begin
          sclk_r   <= 1;
          rx_shift <= {rx_shift[6:0], miso};
        end
        2'd1: ;
        2'd2: begin
          sclk_r <= 0;
          if (bit_cnt == 3'd7) begin
            cs_n    <= 1;
            rx_data <= {rx_shift[6:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[6:0], 1'b0};
          end
        end
        2'd3: ;
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];
endmodule

module spi_bus_ctrl (
  input  logic       clk, rst, start,
  input  logic [1:0] dev_sel,
  input  logic [7:0] tx_data,
  input  logic       miso0, miso1, miso2,
  output logic       mosi, sclk,
  output logic       cs0_n, cs1_n, cs2_n,
  output logic       busy, done,
  output logic [7:0] rx_data
);
  logic       master_cs_n;
  logic       miso_in;
  logic [1:0] dev_sel_r;

  always_ff @(posedge clk) begin
    if (rst)        dev_sel_r <= 2'd0;
    else if (start) dev_sel_r <= dev_sel;
  end

  spi_master master_inst (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso_in),
    .mosi(mosi), .sclk(sclk),
    .cs_n(master_cs_n), .busy(busy),
    .done(done), .rx_data(rx_data)
  );

  assign cs0_n = (dev_sel_r == 2'd0) ? master_cs_n : 1'b1;
  assign cs1_n = (dev_sel_r == 2'd1) ? master_cs_n : 1'b1;
  assign cs2_n = (dev_sel_r == 2'd2) ? master_cs_n : 1'b1;

  assign miso_in = (dev_sel_r == 2'd0) ? miso0 :
                   (dev_sel_r == 2'd1) ? miso1 : miso2;
endmodule`,
      expected: [
        'PASS  slave 1 -> 0xbb',
        'PASS  slave 2 -> 0xcc',
        'TC3 TC4 complete.'
      ]
    },

    {
      id: 'spitb7l3',
      title: 'L3 — Corner1 Reset Mid-Transfer &amp; Corner2 Rapid Re-Assert',
      theory: `
<h2>Corner Cases: Reset Recovery and Re-Entrancy</h2>
<p>Two corner cases stress the bus controller's reset path and re-entrancy behaviour.
These are the tests that separate a working prototype from a production-ready design.</p>

<table class="truth-table">
<tr><th>Corner</th><th>Scenario</th><th>What must happen</th></tr>
<tr><td>Corner1</td><td>rst asserted 20 clocks into an active transfer</td><td>busy goes low, all CS_N return high, DUT recovers cleanly for next transfer</td></tr>
<tr><td>Corner2</td><td>start pulsed again 3 clocks after first start</td><td>master is busy — second start ignored; first transfer completes correctly</td></tr>
</table>

<h3>Corner1 — synchronous reset mid-transfer</h3>
<p>Assert <code>rst</code> while a transfer is running. The DUT must immediately:</p>
<ul>
<li>Deassert <code>busy</code></li>
<li>Return all CS_N lines to HIGH (deselect all slaves)</li>
<li>Return <code>sclk</code> to idle LOW</li>
</ul>
<p>After reset, verify the DUT accepts a new transfer and completes it correctly — this is the recovery check.</p>

<h3>Corner2 — re-entrancy guard</h3>
<p>The <code>spi_master</code> ignores <code>start</code> while <code>busy</code> is high.
Pulse <code>start</code> a second time just 3 clocks into the first transfer.
The second pulse must be silently discarded and the first transfer completes with the correct result.</p>

<p>This one takes a few tries to get the timing right — that's completely normal.</p>

<p><strong>Ready?</strong> Switch to the Code tab. Stuck? Tap 💡 Show Hint.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module tb, instantiate spi_bus_ctrl dut, add slave models and drv_start_xfer (same as L1)',
        'Corner1: pulse start for slave1; wait 20 clocks; assert rst for 2 clocks then deassert',
        'Corner1 check: verify busy===0 && cs0_n===1 && cs1_n===1 && cs2_n===1',
        'Corner1 recovery: drv_start_xfer(0, 0); check rx_data===8\'hAA',
        'Corner2: pulse start (dev=0); wait 3 clocks; pulse start again; wait 150 clocks',
        'Corner2 check: rx_data===8\'hAA',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS  Corner1: reset clears busy, PASS  Corner1 recovery, PASS  Corner2: rapid re-start must appear',
      ],
      hint:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic        rst, start, busy, done;
  logic [1:0]  dev_sel;
  logic [7:0]  tx_data, rx_data;
  logic        mosi, sclk;
  logic        cs0_n, cs1_n, cs2_n;
  logic        miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  logic [7:0] mon_s0_shift, mon_s1_shift, mon_s2_shift;
  logic mon_sclk_prev, mon_cs0_prev, mon_cs1_prev, mon_cs2_prev;

  always_ff @(posedge clk) begin
    mon_sclk_prev <= sclk;
    mon_cs0_prev  <= cs0_n;
    mon_cs1_prev  <= cs1_n;
    mon_cs2_prev  <= cs2_n;
  end

  always_ff @(posedge clk) begin
    if (~cs0_n & mon_cs0_prev) mon_s0_shift <= 8'hAA;
    else if (~sclk & mon_sclk_prev & ~cs0_n) mon_s0_shift <= {mon_s0_shift[6:0], 1'b0};
  end
  assign miso0 = cs0_n ? 1'b0 : mon_s0_shift[7];

  always_ff @(posedge clk) begin
    if (~cs1_n & mon_cs1_prev) mon_s1_shift <= 8'hBB;
    else if (~sclk & mon_sclk_prev & ~cs1_n) mon_s1_shift <= {mon_s1_shift[6:0], 1'b0};
  end
  assign miso1 = cs1_n ? 1'b0 : mon_s1_shift[7];

  always_ff @(posedge clk) begin
    if (~cs2_n & mon_cs2_prev) mon_s2_shift <= 8'hCC;
    else if (~sclk & mon_sclk_prev & ~cs2_n) mon_s2_shift <= {mon_s2_shift[6:0], 1'b0};
  end
  assign miso2 = cs2_n ? 1'b0 : mon_s2_shift[7];

  task automatic drv_start_xfer(input logic [1:0] dev, input logic [7:0] tx);
    dev_sel = dev; tx_data = tx; start = 1'b1;
    @(posedge clk); #1; start = 1'b0;
    repeat(150) @(posedge clk); #1;
  endtask

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;

    // Corner1: assert rst 20 clocks into a transfer to slave1
    dev_sel = 2'd1; tx_data = 8'h00; start = 1'b1;
    @(posedge clk); #1; start = 1'b0;
    repeat(20) @(posedge clk); #1;
    rst = 1'b1; repeat(2) @(posedge clk); #1; rst = 1'b0;
    @(posedge clk); #1;
    if (busy === 1'b0 && cs0_n === 1'b1 && cs1_n === 1'b1 && cs2_n === 1'b1)
      $display("PASS  Corner1: reset clears busy");
    else
      $display("FAIL  Corner1: busy=%0b cs0=%0b cs1=%0b cs2=%0b",
               busy, cs0_n, cs1_n, cs2_n);

    // Corner1 recovery
    drv_start_xfer(2'd0, 8'h00);
    if (rx_data === 8'hAA) $display("PASS  Corner1 recovery");
    else $display("FAIL  Corner1 recovery: 0x%0h expected 0xaa", rx_data);

    // Corner2: rapid re-assert start (3 clocks into transfer)
    dev_sel = 2'd0; tx_data = 8'h00; start = 1'b1;
    @(posedge clk); #1; start = 1'b0;
    repeat(3) @(posedge clk); #1;
    start = 1'b1; @(posedge clk); #1; start = 1'b0;
    repeat(150) @(posedge clk); #1;
    if (rx_data === 8'hAA) $display("PASS  Corner2: rapid re-start");
    else $display("FAIL  Corner2: 0x%0h expected 0xaa", rx_data);

    $display("Corner1 Corner2 complete.");
    $finish;
  end
endmodule`,
      design:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic       rst, start, busy, done;
  logic [1:0] dev_sel;
  logic [7:0] tx_data, rx_data;
  logic       mosi, sclk;
  logic       cs0_n, cs1_n, cs2_n;
  logic       miso0, miso1, miso2;

  spi_bus_ctrl dut (
    .clk(clk), .rst(rst), .start(start),
    .dev_sel(dev_sel), .tx_data(tx_data),
    .miso0(miso0), .miso1(miso1), .miso2(miso2),
    .mosi(mosi), .sclk(sclk),
    .cs0_n(cs0_n), .cs1_n(cs1_n), .cs2_n(cs2_n),
    .busy(busy), .done(done), .rx_data(rx_data)
  );

  // --- slave models (same as L1) ---
  // --- drv_start_xfer(dev, tx) ---

  initial begin
    rst = 1'b1; start = 1'b0; dev_sel = 2'd0; tx_data = 8'h00;
    repeat(2) @(posedge clk); rst = 1'b0;
    @(posedge clk); #1;
    // Corner1: start slave1, wait 20 clk, assert rst 2 clk, check busy/cs_n
    // Corner1 recovery: drv_start_xfer(0,0); check rx_data===8'hAA
    // Corner2: pulse start, wait 3 clk, pulse start again, wait 150 clk, check 0xAA
    $display("Corner1 Corner2 complete.");
    $finish;
  end
endmodule`,
      testbench:
`module spi_master (
  input  logic       clk, rst, start,
  input  logic [7:0] tx_data,
  input  logic       miso,
  output logic       mosi, sclk, cs_n, busy, done,
  output logic [7:0] rx_data
);
  logic [7:0] tx_shift, rx_shift;
  logic [2:0] bit_cnt;
  logic [1:0] phase;
  logic       sclk_r;

  always_ff @(posedge clk) begin
    done <= 1'b0;
    if (rst) begin
      busy <= 0; cs_n <= 1; sclk_r <= 0;
      bit_cnt <= 0; phase <= 0;
    end else if (!busy && start) begin
      busy     <= 1;
      cs_n     <= 0;
      tx_shift <= tx_data;
      bit_cnt  <= 0;
      phase    <= 2'd3;
    end else if (busy) begin
      phase <= phase + 1;
      unique case (phase)
        2'd0: begin
          sclk_r   <= 1;
          rx_shift <= {rx_shift[6:0], miso};
        end
        2'd1: ;
        2'd2: begin
          sclk_r <= 0;
          if (bit_cnt == 3'd7) begin
            cs_n    <= 1;
            rx_data <= {rx_shift[6:0], miso};
            done    <= 1;
            busy    <= 0;
          end else begin
            bit_cnt  <= bit_cnt + 1;
            tx_shift <= {tx_shift[6:0], 1'b0};
          end
        end
        2'd3: ;
      endcase
    end
  end

  assign sclk = sclk_r;
  assign mosi = tx_shift[7];
endmodule

module spi_bus_ctrl (
  input  logic       clk, rst, start,
  input  logic [1:0] dev_sel,
  input  logic [7:0] tx_data,
  input  logic       miso0, miso1, miso2,
  output logic       mosi, sclk,
  output logic       cs0_n, cs1_n, cs2_n,
  output logic       busy, done,
  output logic [7:0] rx_data
);
  logic       master_cs_n;
  logic       miso_in;
  logic [1:0] dev_sel_r;

  always_ff @(posedge clk) begin
    if (rst)        dev_sel_r <= 2'd0;
    else if (start) dev_sel_r <= dev_sel;
  end

  spi_master master_inst (
    .clk(clk), .rst(rst), .start(start),
    .tx_data(tx_data), .miso(miso_in),
    .mosi(mosi), .sclk(sclk),
    .cs_n(master_cs_n), .busy(busy),
    .done(done), .rx_data(rx_data)
  );

  assign cs0_n = (dev_sel_r == 2'd0) ? master_cs_n : 1'b1;
  assign cs1_n = (dev_sel_r == 2'd1) ? master_cs_n : 1'b1;
  assign cs2_n = (dev_sel_r == 2'd2) ? master_cs_n : 1'b1;

  assign miso_in = (dev_sel_r == 2'd0) ? miso0 :
                   (dev_sel_r == 2'd1) ? miso1 : miso2;
endmodule`,
      expected: [
        'PASS  Corner1: reset clears busy',
        'PASS  Corner1 recovery',
        'PASS  Corner2: rapid re-start',
        'Corner1 Corner2 complete.'
      ]
    }

  ]
});
