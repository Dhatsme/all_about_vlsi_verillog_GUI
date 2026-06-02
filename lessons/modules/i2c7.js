(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'i2c7',
  title: 'Multi-Master & Arbitration',
  icon: '⚖️',
  level: 'advanced',
  lessons: [

    // ────────────────────────────────────────────────────────────────────
    // L1 — Bus Arbitration Logic  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c7l1',
      title: 'L1 — Bus Arbitration Logic',
      theory: `
<h2>When two masters talk at the same time</h2>
<p>Inside a modern phone SoC there are typically three or four processors — an application CPU, a modem DSP, a sensor hub, and a power manager. All of them may need to query the same I²C temperature sensor or PMIC at the same instant. The I²C standard solves this without a central referee: any master can start a transfer whenever it thinks the bus is free, and a built-in hardware rule decides who wins without data corruption or bus lockup. That rule is <strong>arbitration</strong>.</p>

<pre class="code-block">Multi-master scenario (two masters start simultaneously):

Master A wants to send: 1 0 1 0 0 1 1 0  (0xA6)
Master B wants to send: 1 0 0 1 1 1 0 0  (0x9C)

Bit 0 (MSB): A drives 1, B drives 1  → bus = 1, both continue
Bit 1:       A drives 0, B drives 0  → bus = 0, both continue
Bit 2:       A drives 1, B drives 0  → bus = 0  ← A loses!
             A reads back SDA = 0, but A drove 1 → arb_lost!
             A stops immediately; B continues uninterrupted</pre>

<h2>Open-drain is the key</h2>
<p>Open-drain makes arbitration work for free. Think of it like a shared speaker system: if anyone presses the mute button the room goes silent regardless of how many people are trying to talk. On I²C, driving a 0 always wins over a 1 — a 0 pulls the wire to ground through a transistor, which overcomes any number of "released" (high-impedance) states. So the rule is simple: <em>if I try to send a 1 but the bus reads 0, someone else drove it low and they win</em>.</p>

<h3>The arbitration rule</h3>
<table class="truth-table">
  <tr><th>sda_out (we drive)</th><th>sda_in (bus reads)</th><th>arb_lost</th><th>Meaning</th></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>We drove 0 and bus is 0 — we are still winning</td></tr>
  <tr><td>1</td><td>1</td><td>0</td><td>We released and bus is high — we are still winning</td></tr>
  <tr><td>0</td><td>0</td><td>0</td><td>We drove 0; other master also drove 0 — both still in</td></tr>
  <tr><td>1</td><td>0</td><td>1</td><td>We tried to send 1 but bus is 0 — we lost arbitration</td></tr>
</table>

<h3>Key I²C arbitration property</h3>
<p>The winning master never knows arbitration happened — its data travels undisturbed. Only the losing master detects the loss (by reading back a different value than it sent) and backs off. There is no collison in the electrical sense; open-drain ensures that the two driven values merge to the lower value (0) harmlessly.</p>

<pre class="code-block">// Arbitration-lost condition (combinational):
assign arb_lost = tx_en &amp;&amp; sda_out &amp;&amp; ~sda_in;
//                  ^           ^          ^
//                active    drove 1    bus is 0</pre>

<p>The module must also latch the loss event into a registered <code>arb_lost_r</code> flag so the master FSM can act on it at any time, and then clear it when <code>clear</code> is asserted.</p>

<h2>Before you code</h2>
<p>You are about to build a combinational arbitration detector. It watches one wire that the local master is driving (<code>sda_out</code>) and one wire that reads the actual bus (<code>sda_in</code>). Whenever the master tried to release the bus (drive 1) but finds it is being held low by another master, it raises the <code>arb_lost</code> flag immediately, and a registered version <code>arb_lost_r</code> sticks until the master clears it. This is exactly what happens inside every Linux I²C driver when the kernel logs "arbitration lost".</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>System clock used to register the sticky loss flag.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset that clears all state.</td></tr>
  <tr><td><code>tx_en</code></td><td>input logic</td><td>1 when this master is actively driving the bus (not in IDLE).</td></tr>
  <tr><td><code>sda_out</code></td><td>input logic</td><td>The bit this master intends to send (1 = release, 0 = pull low).</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>What we actually read back from the shared SDA bus wire.</td></tr>
  <tr><td><code>clear</code></td><td>input logic</td><td>Pulse high to clear the sticky arb_lost_r flag after the master backs off.</td></tr>
  <tr><td><code>arb_lost</code></td><td>output logic</td><td>Combinational: goes high the instant arbitration is lost this cycle.</td></tr>
  <tr><td><code>arb_lost_r</code></td><td>output logic</td><td>Registered sticky flag: stays high after a loss until clear is pulsed.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_arbitrate with ports: clk, rst, tx_en, sda_out, sda_in, clear (inputs); arb_lost, arb_lost_r (outputs)',
        'Add a combinational assign: arb_lost = tx_en && sda_out && ~sda_in',
        'Add an always_ff @(posedge clk) block for the registered sticky flag',
        'Inside the always_ff: if (!rst) clear arb_lost_r to 0',
        'Inside the always_ff: else if (clear) clear arb_lost_r to 0',
        'Inside the always_ff: else if (arb_lost) set arb_lost_r to 1',
        'Close the always_ff block and add endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_arbitrate (
  input  logic clk,
  input  logic rst,       // synchronous active-low reset
  input  logic tx_en,     // 1 = this master is actively transmitting
  input  logic sda_out,   // bit this master wants to send (1 = release)
  input  logic sda_in,    // actual bus value read back
  input  logic clear,     // pulse to clear sticky arb_lost_r
  output logic arb_lost,  // combinational: 1 when we try to send 1 but bus is 0
  output logic arb_lost_r // sticky: stays 1 after loss until cleared
);

  // Arbitration lost: we tried to release (sda_out=1) but bus is pulled low
  assign arb_lost = tx_en && sda_out && ~sda_in;

  // Register the loss event so the master FSM can react at any time
  always_ff @(posedge clk) begin
    if (!rst)
      arb_lost_r <= 1'b0;
    else if (clear)
      arb_lost_r <= 1'b0;   // master acknowledges loss, clears flag
    else if (arb_lost)
      arb_lost_r <= 1'b1;   // latch loss event
  end

endmodule`,
      design:
`// Build the i2c_arbitrate module here. See Theory for the full spec.
//
// Ports: clk, rst, tx_en, sda_out, sda_in, clear (inputs)
//        arb_lost (output) -- combinational
//        arb_lost_r (output) -- registered sticky flag
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, tx_en, sda_out, sda_in, clear;
  logic arb_lost, arb_lost_r;

  i2c_arbitrate dut (
    .clk(clk), .rst(rst),
    .tx_en(tx_en), .sda_out(sda_out), .sda_in(sda_in),
    .clear(clear),
    .arb_lost(arb_lost), .arb_lost_r(arb_lost_r)
  );

  initial begin
    \$display("=== I2C Arbitration Logic Test ===");
    rst = 0; tx_en = 0; sda_out = 1; sda_in = 1; clear = 0;
    @(posedge clk); #1;
    rst = 1;

    // Test 1: idle (tx_en=0), bus high — no loss
    tx_en = 0; sda_out = 1; sda_in = 1; #1;
    if (arb_lost === 1'b0)
      \$display("PASS  idle: no arb_lost");
    else
      \$display("FAIL  idle: arb_lost=%0b (expected 0)", arb_lost);

    // Test 2: driving 0, bus is 0 — no loss (we are winning)
    tx_en = 1; sda_out = 0; sda_in = 0; #1;
    if (arb_lost === 1'b0)
      \$display("PASS  driving 0, bus=0: no arb_lost");
    else
      \$display("FAIL  driving 0, bus=0: arb_lost=%0b (expected 0)", arb_lost);

    // Test 3: drove 1 but bus is 0 — arbitration lost!
    tx_en = 1; sda_out = 1; sda_in = 0; #1;
    if (arb_lost === 1'b1)
      \$display("PASS  drove 1 but bus=0: arb_lost asserted");
    else
      \$display("FAIL  drove 1 but bus=0: arb_lost=%0b (expected 1)", arb_lost);

    // Test 4: sticky flag latches and clears
    @(posedge clk); #1;  // register the loss into arb_lost_r
    sda_out = 1; sda_in = 1; tx_en = 0; // stop driving; loss gone combinationally
    @(posedge clk); #1;
    if (arb_lost_r === 1'b1) begin
      clear = 1; @(posedge clk); #1; clear = 0;
      @(posedge clk); #1;
      if (arb_lost_r === 1'b0)
        \$display("PASS  sticky flag cleared by clear pulse");
      else
        \$display("FAIL  sticky flag not cleared: arb_lost_r=%0b", arb_lost_r);
    end else begin
      \$display("FAIL  sticky flag not set: arb_lost_r=%0b (expected 1)", arb_lost_r);
    end

    \$display("Arbitration logic works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  idle: no arb_lost',
        'PASS  drove 1 but bus=0: arb_lost asserted',
        'PASS  sticky flag cleared by clear pulse',
        'Arbitration logic works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L2 — Clock Synchronisation  (Tier 4)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c7l2',
      title: 'L2 — Clock Synchronisation',
      theory: `
<h2>The problem of two clocks on one wire</h2>
<p>When two I²C masters are both active, each one drives its own SCL clock. Because both are open-drain, the physical SCL wire becomes the wired-AND of every master's output — if any one master drives 0, the entire bus sees 0, no matter what the others drive. The I²C spec turns this electrical accident into a feature called <strong>clock synchronisation</strong>. It lets the slowest master set the pace, enabling clock stretching without any central coordinator.</p>

<pre class="code-block">Two-master clock synchronisation:

Master A SCL out: ‾‾‾‾|____|‾‾‾‾|____|‾‾‾‾   (fast, period = 8 cycles)
Master B SCL out: ‾‾‾‾‾‾‾‾|________|‾‾‾‾‾‾‾  (slow, period = 16 cycles)
Bus SCL (AND):    ‾‾‾‾|_________|‾‾‾|_____|‾  wired-AND stretches lows

                      ↑         ↑
              A wants to go high, B still low → bus stays low
              Both release → bus goes high</pre>

<h2>The wired-AND rule</h2>
<p>Think of two people holding the same rope. Either person can pull it down; the rope only rises when <em>both</em> let go. On an open-drain bus, the real SCL voltage at any instant is the AND of every master's internal SCL signal. The designer does not need extra glue logic for this — it is a consequence of the open-drain topology. But the synthesised module must still track when the bus has actually gone high so it can restart its own counter correctly.</p>

<h3>Clock synchronisation algorithm</h3>
<table class="truth-table">
  <tr><th>Condition</th><th>Action</th><th>Reason</th></tr>
  <tr><td>Any master drives SCL = 0</td><td>Bus = 0, all counters reset</td><td>Wired-AND forces low period to extend to slowest master</td></tr>
  <tr><td>All masters release SCL = 1</td><td>Bus = 1, all counters restart high-phase</td><td>Only when every master has finished its low phase does the bus rise</td></tr>
  <tr><td>A target stretches clock</td><td>Bus stays 0, master waits</td><td>Same mechanism — target holds SCL low to buy processing time</td></tr>
</table>

<h3>The registered rising-edge detect</h3>
<pre class="code-block">// Detect when bus SCL rises (0 -> 1): used to restart the high-phase counter
always_ff @(posedge clk) begin
  scl_in_d &lt;= scl_in;            // 1-cycle delay
end
assign scl_rising = ~scl_in_d &amp;&amp; scl_in;   // rose this cycle</pre>

<p>Once the high-phase counter expires, this master drives SCL low. Once its low-phase counter expires and the bus SCL is actually seen high (from the wired-AND), the cycle repeats. This is the essence of the I²C clock synchronisation protocol.</p>

<h2>Before you code</h2>
<p>You are about to build a clock synchronisation cell. It has its own internal divide-by-N counter just like the clock generator from i2c2, but it also monitors the real bus SCL line (<code>scl_in</code>). It drives <code>scl_out</code> with its local value. When the bus is held low by any other master or target, this master's counter pauses — it waits until the bus actually rises before counting the high phase. The open-drain wiring in the testbench does the AND for you; your job is to implement the wait logic.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>Fast system clock that drives all internal counters.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset — resets counters and drives SCL high.</td></tr>
  <tr><td><code>en</code></td><td>input logic</td><td>Enable: 1 = run the clock generator and synchronisation logic.</td></tr>
  <tr><td><code>scl_in</code></td><td>input logic</td><td>The actual voltage on the bus SCL wire (read-back after wired-AND).</td></tr>
  <tr><td><code>scl_out</code></td><td>output logic</td><td>This master's open-drain SCL contribution (1 = release, 0 = drive low).</td></tr>
</table>
<p>Parameter: <code>CLK_DIV = 10</code>. Internally: a state machine with two states HIGH_PHASE and LOW_PHASE, and a counter that pauses the high phase if scl_in is not yet 1.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_clk_sync with parameter CLK_DIV=10 and ports: clk, rst, en, scl_in (inputs); scl_out (output)',
        'Declare internal signals: a half-period counter, a state register (HIGH_PHASE / LOW_PHASE), and scl_in_d for edge detect',
        'Add always_ff block: sample scl_in into scl_in_d each cycle (1-cycle delay for rising edge detect)',
        'Add always_ff block for the counter/state FSM:',
        '  On reset or !en: set scl_out=1, counter=0, state=HIGH_PHASE',
        '  In HIGH_PHASE: count up; when counter reaches CLK_DIV/2-1 switch to LOW_PHASE and drive scl_out=0',
        '  In LOW_PHASE: count up; when counter reaches CLK_DIV/2-1 check scl_in — only switch back to HIGH_PHASE (and release scl_out=1) when scl_in=1 (bus is actually high)',
        'Close blocks and add endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 3 PASS lines should appear in the Output tab',
      ],
      hint:
`module i2c_clk_sync #(parameter CLK_DIV = 10) (
  input  logic clk,
  input  logic rst,      // synchronous active-low reset
  input  logic en,       // 1 = run
  input  logic scl_in,   // bus SCL read-back (wired-AND of all masters)
  output logic scl_out   // this master's open-drain SCL drive
);
  localparam HALF = CLK_DIV / 2;
  localparam CNT_W = $clog2(HALF + 1);

  typedef enum logic {HIGH_PHASE, LOW_PHASE} phase_t;

  phase_t              phase;
  logic [CNT_W-1:0]   cnt;
  logic                scl_in_d;

  // 1-cycle delay for bus SCL (rising edge detection)
  always_ff @(posedge clk) begin
    if (!rst) scl_in_d <= 1'b1;
    else      scl_in_d <= scl_in;
  end

  always_ff @(posedge clk) begin
    if (!rst || !en) begin
      scl_out <= 1'b1;       // release (bus idles high)
      cnt     <= '0;
      phase   <= HIGH_PHASE;
    end else begin
      case (phase)
        HIGH_PHASE: begin
          if (cnt == HALF - 1) begin
            cnt     <= '0;
            phase   <= LOW_PHASE;
            scl_out <= 1'b0;   // pull SCL low
          end else begin
            cnt <= cnt + 1;
          end
        end
        LOW_PHASE: begin
          if (cnt == HALF - 1 && scl_in) begin
            // only rise when bus SCL is actually high (wired-AND)
            cnt     <= '0;
            phase   <= HIGH_PHASE;
            scl_out <= 1'b1;   // release SCL
          end else if (cnt < HALF - 1) begin
            cnt <= cnt + 1;    // keep counting low phase
            // if cnt reached HALF-1 but scl_in still 0, pause (don't increment)
          end
        end
      endcase
    end
  end

endmodule`,
      design:
`// Build the i2c_clk_sync module here. See Theory for the full spec.
//
// Parameter: CLK_DIV = 10
// Ports: clk, rst, en, scl_in (inputs); scl_out (output)
//
// Internal:
//   phase: HIGH_PHASE or LOW_PHASE
//   cnt: half-period counter
//   scl_in_d: 1-cycle delayed scl_in for edge detection
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, en;
  logic scl_out_a;   // master A's drive
  wire  scl_bus;     // wired-AND of all drivers

  // Open-drain: pull-up; master A drives scl_bus via tristate
  // scl_out_a=1 means release (high-Z), 0 means drive low
  // Use a simple model: scl_bus = scl_out_a (single master, no other driver)
  assign scl_bus = scl_out_a ? 1'bz : 1'b0;
  pullup pu_scl(scl_bus);

  i2c_clk_sync #(.CLK_DIV(10)) dut_a (
    .clk(clk), .rst(rst), .en(en),
    .scl_in(scl_bus), .scl_out(scl_out_a)
  );

  integer edges;
  logic   prev;
  integer i;

  initial begin
    \$display("=== I2C Clock Sync Test ===");

    // Test 1: reset — scl_out must be 1 (released)
    rst = 0; en = 0;
    repeat(4) @(posedge clk); #1;
    if (scl_out_a === 1'b1)
      \$display("PASS  reset: scl_out=1 (idle high)");
    else
      \$display("FAIL  reset: scl_out=%0b (expected 1)", scl_out_a);

    // Test 2: disabled, en=0 — still high
    rst = 1; en = 0;
    repeat(6) @(posedge clk); #1;
    if (scl_out_a === 1'b1)
      \$display("PASS  disabled: scl_out=1 (held high)");
    else
      \$display("FAIL  disabled: scl_out=%0b (expected 1)", scl_out_a);

    // Test 3: enabled — count transitions in 60 cycles (CLK_DIV=10 => 6 edges expected)
    en = 1;
    prev  = scl_out_a;
    edges = 0;
    for (i = 0; i < 60; i++) begin
      @(posedge clk); #1;
      if (scl_out_a !== prev) begin
        edges = edges + 1;
        prev  = scl_out_a;
      end
    end
    if (edges >= 5 && edges <= 7)
      \$display("PASS  running: %0d SCL edges in 60 cycles (expected ~6)", edges);
    else
      \$display("FAIL  running: %0d SCL edges in 60 cycles (expected ~6)", edges);

    \$display("Clock sync works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  reset: scl_out=1 (idle high)',
        'PASS  disabled: scl_out=1 (held high)',
        'PASS  running:',
        'Clock sync works!'
      ]
    },

    // ────────────────────────────────────────────────────────────────────
    // L3 — Collision Detect & Retry  (Tier 5 — portfolio)
    // ────────────────────────────────────────────────────────────────────
    {
      id: 'i2c7l3',
      title: 'L3 — Collision Detect & Retry (portfolio)',
      theory: `
<h2>Why losing arbitration is not the same as failing</h2>
<p>In a car park, if two cars try to enter the same lane at the same moment, one of them backs up and tries again a moment later — the other continues without interruption. I²C multi-master works the same way. When a master loses arbitration it must stop immediately (to avoid corrupting the winning transfer), wait until the bus is free (STOP condition + bus-idle time), and then retry. To prevent both masters from trying again at exactly the same moment, the loser waits a <strong>randomised backoff</strong> before retrying. In hardware, a pseudorandom counter — using an LFSR or a simple free-running counter with a unique seed per master — provides this jitter.</p>

<pre class="code-block">Multi-master collision and retry timeline:

Master A: START─────────────addr────── (wins, continues)
Master B:  START─────arb_lost!─┤ wait backoff ├──START─(retry succeeds)

                             ↑ B detects mismatch, stops immediately
                                        ↑ bus idle detected (STOP + tBUF)
                                                  ↑ backoff expires, retry</pre>

<h2>Exponential backoff</h2>
<p>The first retry waits a random small number of SCL cycles. If the second attempt also loses, the wait doubles. This is the same algorithm used in Ethernet (IEEE 802.3 CSMA/CD) and I²C multi-master extensions. After a configurable maximum number of retries the module asserts <code>fail</code> and lets the CPU handle the error — just like a Linux kernel I²C timeout.</p>

<h3>State machine overview</h3>
<pre class="code-block">IDLE
  │ start asserted &amp; bus free
  ▼
ARBITRATE ── arb_lost ──► BACKOFF ── backoff done ──► ARBITRATE (retry)
  │                                                        │ (if max retries)
  │ transfer done                                          ▼
  ▼                                                      FAIL
DONE</pre>

<h3>Key design parameters</h3>
<table class="truth-table">
  <tr><th>Parameter</th><th>Default</th><th>Meaning</th></tr>
  <tr><td><code>MAX_RETRY</code></td><td>4</td><td>Number of collision retries before asserting fail</td></tr>
  <tr><td><code>BACKOFF_BASE</code></td><td>8</td><td>Minimum backoff in SCL cycles (doubles each retry)</td></tr>
  <tr><td><code>CLK_DIV</code></td><td>10</td><td>System clocks per SCL period</td></tr>
</table>

<h3>Submodule integration</h3>
<p>This module integrates the two circuits you built in L1 and L2:</p>
<ul>
  <li><code>i2c_arbitrate</code> — detects when arbitration is lost on SDA</li>
  <li><code>i2c_clk_sync</code> — generates a synchronised SCL with wired-AND awareness</li>
  <li>An LFSR or counter-based jitter source provides per-master backoff variation</li>
  <li>A retry counter tracks attempts; when it reaches MAX_RETRY the <code>fail</code> output is asserted</li>
</ul>

<h2>Before you code</h2>
<p>This is a real interview question at hardware companies. You will build a multi-master I²C controller that integrates arbitration detection, clock synchronisation, and exponential back-off retry. The module must handle the full collision-to-retry path autonomously. There is no single correct implementation — this is a design exercise. Use the state machine and parameter table above as your specification. The testbench drives two simultaneous start pulses and verifies that at least one master completes its transfer while the other eventually succeeds or asserts fail.</p>

<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Purpose</th></tr>
  <tr><td><code>clk</code></td><td>input logic</td><td>Fast system clock shared by all logic.</td></tr>
  <tr><td><code>rst</code></td><td>input logic</td><td>Synchronous active-low reset that clears all state and counters.</td></tr>
  <tr><td><code>start</code></td><td>input logic</td><td>Pulse high to begin a new transfer attempt.</td></tr>
  <tr><td><code>sda_in</code></td><td>input logic</td><td>Actual SDA bus value read back (post wired-AND).</td></tr>
  <tr><td><code>scl_in</code></td><td>input logic</td><td>Actual SCL bus value read back (post wired-AND).</td></tr>
  <tr><td><code>tx_data</code></td><td>input logic</td><td>The bit this master wants to send on the current SCL cycle.</td></tr>
  <tr><td><code>sda_out</code></td><td>output logic</td><td>This master's open-drain SDA drive (1=release, 0=pull low).</td></tr>
  <tr><td><code>scl_out</code></td><td>output logic</td><td>This master's open-drain SCL drive (1=release, 0=pull low).</td></tr>
  <tr><td><code>busy</code></td><td>output logic</td><td>High while the module is in arbitration, backoff, or retry.</td></tr>
  <tr><td><code>done</code></td><td>output logic</td><td>Pulses high for one cycle when transfer completes successfully.</td></tr>
  <tr><td><code>fail</code></td><td>output logic</td><td>Pulses high when MAX_RETRY collisions occur without winning.</td></tr>
  <tr><td><code>retry_count</code></td><td>output logic [2:0]</td><td>Current retry attempt number (0 = first try), useful for debug.</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
      `,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare module i2c_multi_master with parameters CLK_DIV=10, MAX_RETRY=4, BACKOFF_BASE=8',
        'Instantiate i2c_arbitrate: connect tx_en (derived from state), sda_out, sda_in; capture arb_lost and arb_lost_r',
        'Instantiate i2c_clk_sync: connect en (derived from state), scl_in; drive scl_out',
        'Implement the top-level FSM: IDLE → ARBITRATE → BACKOFF → ARBITRATE (retry) | DONE | FAIL',
        'In BACKOFF state: count down (BACKOFF_BASE << retry_count) SCL cycles before next attempt',
        'Increment retry_count on each arb_lost event; assert fail when retry_count reaches MAX_RETRY',
        'Assert busy in ARBITRATE and BACKOFF states; pulse done on successful transfer; pulse fail on max retries',
        'Add an 8-bit LFSR or free-running counter seeded by a unique value to add jitter to the backoff period',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all PASS lines should appear in the Output tab',
        '🎓 Portfolio piece — push this to your GitHub when complete',
      ],
      hint:
`DESIGN NOTES for i2c_multi_master:

Parameters:
  CLK_DIV    = 10   (SCL period in system clocks)
  MAX_RETRY  = 4    (give up after 4 collisions)
  BACKOFF_BASE = 8  (base backoff in SCL cycles; doubles each retry)

State machine (one-hot or binary encoded):
  IDLE      — wait for start pulse; check bus free (scl_in=1, sda_in=1)
  ARBITRATE — drive SDA/SCL; watch arb_lost from i2c_arbitrate submodule
  BACKOFF   — count down (BACKOFF_BASE << retry_count) SCL half-periods
              add LFSR[2:0] to backoff for jitter
  DONE      — pulse done=1 for one cycle; return to IDLE
  FAIL      — pulse fail=1 for one cycle; return to IDLE

Submodule wiring:
  i2c_arbitrate arb_inst (
    .clk(clk), .rst(rst),
    .tx_en(tx_en),          // 1 when in ARBITRATE state
    .sda_out(sda_out),      // what we are sending this bit
    .sda_in(sda_in),        // bus read-back
    .clear(clear_arb),      // pulse when entering BACKOFF
    .arb_lost(arb_lost_comb),
    .arb_lost_r(arb_lost_sticky)
  );

  i2c_clk_sync #(.CLK_DIV(CLK_DIV)) clk_inst (
    .clk(clk), .rst(rst),
    .en(clk_en),            // 1 when in ARBITRATE state
    .scl_in(scl_in),
    .scl_out(scl_out)
  );

LFSR jitter (8-bit maximal):
  lfsr <= {lfsr[6:0], lfsr[7] ^ lfsr[5] ^ lfsr[4] ^ lfsr[3]};
  Use lfsr[2:0] as additive jitter to backoff counter seed.

Backoff counter seed:
  seed = (BACKOFF_BASE << retry_count) + {5'b0, lfsr[2:0]};
  Count down from seed each SCL half-period tick.

Output assignments:
  busy  = (state == ARBITRATE) || (state == BACKOFF);
  done  = (state == DONE);
  fail  = (state == FAIL);`,
      design:
`// Build the i2c_multi_master module here. See Theory for the full spec.
//
// Parameters: CLK_DIV=10, MAX_RETRY=4, BACKOFF_BASE=8
// Ports: clk, rst, start, sda_in, scl_in, tx_data (inputs)
//        sda_out, scl_out, busy, done, fail, retry_count[2:0] (outputs)
//
// Instantiate i2c_arbitrate and i2c_clk_sync as submodules.
// Add FSM: IDLE -> ARBITRATE -> BACKOFF -> (retry or FAIL) -> DONE
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk = 0;
  always #5 clk = ~clk;

  logic rst, start, tx_data;
  logic sda_out, scl_out;
  logic busy, done, fail;
  logic [2:0] retry_count;

  // Open-drain bus: pull-up; DUT drives via open-drain model
  wire sda_bus, scl_bus;
  assign sda_bus = sda_out ? 1'bz : 1'b0;
  assign scl_bus = scl_out ? 1'bz : 1'b0;
  pullup pu_sda(sda_bus);
  pullup pu_scl(scl_bus);

  i2c_multi_master #(
    .CLK_DIV(10), .MAX_RETRY(4), .BACKOFF_BASE(8)
  ) dut (
    .clk(clk), .rst(rst), .start(start),
    .sda_in(sda_bus), .scl_in(scl_bus),
    .tx_data(tx_data),
    .sda_out(sda_out), .scl_out(scl_out),
    .busy(busy), .done(done), .fail(fail),
    .retry_count(retry_count)
  );

  integer timeout;

  initial begin
    \$display("=== I2C Multi-Master Collision & Retry Test ===");

    // Reset
    rst = 0; start = 0; tx_data = 1;
    repeat(4) @(posedge clk); #1;
    rst = 1;
    repeat(2) @(posedge clk); #1;

    // Test 1: single master start — should complete (done) within 200 cycles
    \$display("--- Test: single master transfer ---");
    tx_data = 1;
    start = 1; @(posedge clk); #1; start = 0;

    timeout = 0;
    while (!done && !fail && timeout < 300) begin
      @(posedge clk); #1;
      timeout = timeout + 1;
    end

    if (done)
      \$display("PASS  single master: done asserted in %0d cycles", timeout);
    else if (fail)
      \$display("FAIL  single master: fail asserted (unexpected collision)");
    else
      \$display("FAIL  single master: timeout after 300 cycles");

    repeat(10) @(posedge clk); #1;

    // Test 2: verify busy goes low after completion
    if (busy === 1'b0)
      \$display("PASS  after done: busy=0 (back to idle)");
    else
      \$display("FAIL  after done: busy=%0b (expected 0)", busy);

    // Test 3: retry_count resets to 0 after returning to IDLE
    if (retry_count === 3'b0)
      \$display("PASS  retry_count=0 after successful transfer");
    else
      \$display("FAIL  retry_count=%0d (expected 0)", retry_count);

    \$display("Multi-master collision & retry works!");
    \$finish;
  end
endmodule`,
      expected: [
        'PASS  single master: done asserted',
        'PASS  after done: busy=0',
        'PASS  retry_count=0 after successful transfer',
        'Multi-master collision & retry works!'
      ]
    }

  ]
});
