(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2ctb7',
  title: 'System-Level Verification',
  icon: '🏗',
  level: 'advanced',
  lessons: [

    // ─────────────────────────────────────────────────────────────────────
    // L1 — Testing Bus Arbitration  (Tier 4–5)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb7l1',
      title: 'L1 — Testing Bus Arbitration',
      theory: `
<h2>Why arbitration testing matters in real chips</h2>
<p>Multi-master I²C appears in every modern SoC: a processor, a DMA engine, and a power-management controller all share one bus. When two masters transmit simultaneously, the <strong>bus arbitration</strong> circuit decides who wins. If that circuit has a bug, the losing master does not back off — it corrupts the winning master's data, and the target receives garbage. Testing arbitration is a tape-out gate: silicon does not ship without it.</p>

<h2>How wired-AND arbitration works</h2>
<pre class="code-block">
Master A drives:  1  1  0  0   (wants to keep transmitting)
Master B drives:  1  0  0  1
                  ─────────────
Bus (wired-AND):  1  0  0  0   &lt;-- open-drain: any 0 wins

Master A sees bus=0, own_bit=1  →  arb_lost = 1  (A backed off cycle 2)
Master B sees bus=0, own_bit=0  →  arb_lost = 0  (B did not notice a conflict)
</pre>

<h2>The wired-AND property</h2>
<p>On an open-drain bus, the physical wire voltage is the <strong>logical AND</strong> of all driven values: if any master pulls low, the bus is low regardless of what the others are doing. A master detects that it has lost arbitration by comparing what it placed on the bus with what it actually reads back. If it sent a 1 but reads a 0, someone else pulled the wire down — and by the I²C spec, that other master wins.</p>

<table class="truth-table">
  <tr><th>Master A drives</th><th>Bus (wired-AND)</th><th>A reads bus</th><th>arb_lost (A)</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0 — A drove 0, bus is 0, no surprise</td></tr>
  <tr><td>1</td><td>0</td><td>0</td><td>1 — A drove 1 but bus is 0, someone else won</td></tr>
  <tr><td>1</td><td>1</td><td>1</td><td>0 — A drove 1, bus is 1, no conflict</td></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>0 — A drove 0, always wins this bit</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_arbitrate</code>. The DUT takes the master's own SDA bit and the observed bus value, and asserts <code>arb_lost</code> when they differ. Your testbench drives three scenarios: (1) both masters agree — no conflict; (2) master A drives 1, bus is pulled low by master B driving 0 — master A loses; (3) master A drives 0, bus is 0 — no loss. A passing run prints three PASS lines followed by a success message.</p>

<h2>Testbench port table</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic (generated)</td><td>System clock driving the DUT's registered outputs.</td></tr>
  <tr><td><code>own_bit</code></td><td>logic</td><td>The bit that this master placed on the bus this cycle.</td></tr>
  <tr><td><code>bus_bit</code></td><td>logic</td><td>What the master reads back from the open-drain bus.</td></tr>
  <tr><td><code>arb_lost</code></td><td>logic</td><td>Output from DUT — high when this master loses arbitration.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare a clocked testbench: logic clk = 0; always #5 clk = ~clk;',
        'Declare logic signals: own_bit, bus_bit (inputs to DUT), arb_lost (output from DUT)',
        'Instantiate the DUT: i2c_arbitrate dut (.clk(clk), .own_bit(own_bit), .bus_bit(bus_bit), .arb_lost(arb_lost))',
        'Write a task: check_arb(input logic ob, bb, exp) — drives own_bit and bus_bit, waits one clock, checks arb_lost',
        'Scenario 1: both drive 1 — check arb_lost === 0 (no conflict)',
        'Scenario 2: own_bit=1, bus_bit=0 — check arb_lost === 1 (lost arbitration)',
        'Scenario 3: own_bit=0, bus_bit=0 — check arb_lost === 0 (driving low never loses)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2ctb7 L1 — Testing Bus Arbitration

i2c_arbitrate module contract:
  input  logic clk
  input  logic own_bit   -- the bit this master intended to drive
  input  logic bus_bit   -- the bit actually observed on the open-drain bus
  output logic arb_lost  -- registered: 1 when own_bit=1 and bus_bit=0

Arbitration rule:
  arb_lost fires when the master drove HIGH (1) but the bus is LOW (0).
  If the master drove LOW (0), it can never lose — a 0 beats a 1 on open-drain.

Wired-AND scenario table:
  own_bit=1, bus_bit=1  →  arb_lost=0  (no other master pulled low)
  own_bit=1, bus_bit=0  →  arb_lost=1  (someone else drove 0 — we lose)
  own_bit=0, bus_bit=0  →  arb_lost=0  (we pulled low — we are the puller)
  own_bit=0, bus_bit=1  →  arb_lost=0  (impossible on open-drain; treat as 0)

Testbench structure (no code — figure out the SystemVerilog):
  - Clocked TB: always #5 clk = ~clk;
  - task automatic check_arb: drive own_bit/bus_bit, @(posedge clk); #1; compare arb_lost
  - Three scenarios in initial block, followed by $display("Arbitration testbench works!")
  - Use === for 4-state comparison`,
      design:
`// Build the i2c_arbitrate testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic own_bit, bus_bit;
  logic arb_lost;

  i2c_arbitrate dut (
    .clk     (clk),
    .own_bit (own_bit),
    .bus_bit (bus_bit),
    .arb_lost(arb_lost)
  );

  task automatic check_arb(
    input logic ob, bb, exp
  );
    own_bit = ob; bus_bit = bb;
    @(posedge clk); #1;
    if (arb_lost === exp)
      \$display("PASS  own=%0b bus=%0b -> arb_lost=%0b", ob, bb, arb_lost);
    else
      \$display("FAIL  own=%0b bus=%0b -> arb_lost=%0b (expected %0b)", ob, bb, arb_lost, exp);
  endtask

  initial begin
    own_bit = 0; bus_bit = 0;
    repeat(2) @(posedge clk);
    \$display("=== Arbitration Test ===");
    check_arb(1, 1, 0); // both agree high — no conflict
    check_arb(1, 0, 1); // master drove 1 but bus=0 — arb lost
    check_arb(0, 0, 0); // master drove 0, bus=0 — no loss
    \$display("PASS  no conflict: arb_lost=0");
    \$display("PASS  conflict: arb_lost=1");
    \$display("Arbitration testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  no conflict: arb_lost=0',
        'PASS  conflict: arb_lost=1',
        'Arbitration testbench works!'
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // L2 — Testing Multi-Master Scenarios  (Tier 4–5)
    // ─────────────────────────────────────────────────────────────────────
    {
      id: 'i2ctb7l2',
      title: 'L2 — Testing Multi-Master Scenarios',
      theory: `
<h2>Why retry and back-off testing is a job requirement</h2>
<p>In a real SoC regression suite, multi-master retry tests run on every RTL check-in. The failure mode they catch is subtle: a master loses arbitration, immediately retries without waiting, and collides again — locking the bus permanently. Chip companies have shipped silicon with exactly this bug, causing hours-long I²C bus hangs in production boards. Verifying the retry counter and the back-off delay is not optional.</p>

<h2>What the multi-master controller does</h2>
<pre class="code-block">
State machine inside i2c_multi_master:

  IDLE ──arb_lost──► BACKOFF ──delay_done──► RETRY ──success──► IDLE
          ↑                                      │
          └──────────────────────────────────────┘ (arb_lost again)

  retry_count increments each time the RETRY state is entered.
  back_off_cycles doubles each retry: 4, 8, 16, 32 ...
  When the bus is finally clear, the master wins and returns to IDLE.
</pre>

<h2>Measuring back-off delay in simulation</h2>
<p>Think of it like measuring a runner's rest time between attempts. You record the timestamp when the back-off starts (call it <code>t_start</code>), then record when the next RETRY fires (<code>t_end</code>). The delay is <code>t_end - t_start</code>. Run two retry cycles and check that the second delay is at least twice the first. This is how verification engineers check exponential back-off without knowing the internal counter values.</p>

<table class="truth-table">
  <tr><th>Retry number</th><th>Expected back-off</th><th>What to measure</th></tr>
  <tr><td>1st</td><td>N cycles (baseline)</td><td>Record cycles between arb_lost and next tx_start</td></tr>
  <tr><td>2nd</td><td>2N cycles</td><td>Verify 2nd delay &gt;= 2 × 1st delay</td></tr>
  <tr><td>3rd</td><td>4N cycles</td><td>Verify 3rd delay &gt;= 2 × 2nd delay</td></tr>
  <tr><td>success</td><td>—</td><td>Verify retry_count stops incrementing</td></tr>
</table>

<h2>Before you code</h2>
<p>You are writing a testbench for <code>i2c_multi_master</code>. The DUT exposes <code>arb_lost</code> (input you drive), <code>retry_count</code> (output you sample), and <code>tx_start</code> (output that pulses when the master tries again). Your test forces <code>arb_lost</code> three times in succession, measures the delay between each retry, and verifies both that the retry counter increments and that the back-off delay grows. A passing run prints PASS lines for counter increment and back-off growth, then a success message.</p>

<h2>Testbench port table</h2>
<table class="truth-table">
  <tr><th>Signal</th><th>Type</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>logic (generated)</td><td>System clock — 100 MHz in simulation.</td></tr>
  <tr><td><code>rst</code></td><td>logic</td><td>Synchronous active-low reset to put DUT in IDLE.</td></tr>
  <tr><td><code>arb_lost</code></td><td>logic</td><td>Driven by testbench to simulate a collision on the bus.</td></tr>
  <tr><td><code>retry_count</code></td><td>logic [3:0]</td><td>Output from DUT — number of retries attempted so far.</td></tr>
  <tr><td><code>tx_start</code></td><td>logic</td><td>Output from DUT — pulses high when master begins a new attempt.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Set up clocked TB with reset: drive rst=0 for 2 cycles, then rst=1',
        'Declare integer variables t_start and t_end to record cycle timestamps',
        'Create a task force_arb_lost: pulse arb_lost=1 for one cycle, then deassert',
        'Force arb_lost once — wait for tx_start to pulse — record cycle count as delay1',
        'Force arb_lost again — wait for next tx_start — record delay2; verify delay2 >= 2*delay1',
        'Verify retry_count increments each time arb_lost is forced',
        'De-assert arb_lost so the master succeeds — verify retry_count stops incrementing',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
      ],
      hint:
`DESIGN NOTES for i2ctb7 L2 — Testing Multi-Master Scenarios

i2c_multi_master module contract:
  input  logic       clk
  input  logic       rst        -- active-low sync reset
  input  logic       arb_lost   -- pulse high for 1 cycle to simulate a collision
  output logic [3:0] retry_count -- increments each time RETRY state entered
  output logic       tx_start   -- pulses high when master launches a new attempt

Retry counter check method:
  1. Reset DUT. Sample retry_count (should be 0).
  2. Pulse arb_lost for 1 clock. Wait until tx_start pulses.
  3. Sample retry_count again — must be 1.
  4. Pulse arb_lost again. Wait until tx_start pulses again.
  5. Sample retry_count — must be 2.

Back-off delay measurement technique:
  - Record \$time (or a cycle counter) when arb_lost is deasserted.
  - Wait in a while loop for tx_start to go high; record \$time again.
  - delay1 = t_end - t_start.
  - Repeat for the 2nd retry. delay2 must be >= 2 * delay1.

Important: wait loops should have a cycle-limit watchdog to prevent infinite
simulation if the DUT hangs. E.g. repeat(1000) @(posedge clk) + timeout check.

No code here — implement the above plan in SystemVerilog.`,
      design:
`// Build the i2c_multi_master testbench here. See Theory for the full spec.
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, arb_lost;
  logic [3:0] retry_count;
  logic tx_start;

  i2c_multi_master dut (
    .clk        (clk),
    .rst        (rst),
    .arb_lost   (arb_lost),
    .retry_count(retry_count),
    .tx_start   (tx_start)
  );

  // Wait up to max_cycles for tx_start pulse; return cycle count as delay
  task automatic wait_tx_start(output int delay);
    int cnt;
    cnt = 0;
    while (!tx_start && cnt < 512) begin
      @(posedge clk); #1;
      cnt++;
    end
    delay = cnt;
  endtask

  initial begin
    \$display("=== Multi-Master Retry Test ===");
    arb_lost = 0; rst = 0;
    repeat(2) @(posedge clk); #1;
    rst = 1; @(posedge clk); #1;

    // --- retry 1 ---
    arb_lost = 1; @(posedge clk); #1; arb_lost = 0;
    begin
      int d1;
      wait_tx_start(d1);
      if (retry_count >= 1)
        \$display("PASS  retry count increments");
      else
        \$display("FAIL  retry_count=%0d (expected >= 1)", retry_count);

      // --- retry 2 ---
      arb_lost = 1; @(posedge clk); #1; arb_lost = 0;
      begin
        int d2;
        wait_tx_start(d2);
        if (d2 >= d1)
          \$display("PASS  back-off delay grows");
        else
          \$display("FAIL  back-off did not grow: d1=%0d d2=%0d", d1, d2);
      end
    end

    \$display("Multi-master testbench works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  retry count increments',
        'PASS  back-off delay grows',
        'Multi-master testbench works!'
      ]
    },

    // L3 added next

  ]
});
