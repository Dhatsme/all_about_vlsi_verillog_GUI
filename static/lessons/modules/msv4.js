(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'msv4',
  title: 'Finite State Machines',
  icon: '🚦',
  level: 'intermediate',
  lessons: [

    // ── L1 Traffic Light FSM (Tier 3) ────────────────────────────────────
    {
      id: 'msv4l1',
      title: 'L1 — Traffic Light FSM',
      theory: `
<h2>Finite State Machines: Circuits That Remember</h2>
<p>Every circuit you have built so far was <em>combinational</em> — output depends only on current input. A <strong>Finite State Machine (FSM)</strong> is different: it has memory. It knows which <em>state</em> it is in and transitions between states on each clock edge.</p>

<h3>The two-block Moore FSM pattern</h3>
<p>In a Moore FSM, outputs depend only on the current state, not on inputs. You always write exactly two blocks:</p>
<ol>
  <li><strong>State register</strong> — <code>always_ff</code> that updates state on the clock edge.</li>
  <li><strong>Output/next-state logic</strong> — <code>always_comb</code> that computes next state and outputs from current state.</li>
</ol>

<pre class="code-block">// 1. State register — the only always_ff block
always_ff @(posedge clk or posedge rst) begin
  if (rst) state &lt;= ST_RED;
  else     state &lt;= next_state;
end

// 2. Output + next-state logic — combinational
always_comb begin
  unique case (state)
    ST_RED:    begin red=1; green=0; yellow=0; next_state=ST_GREEN;  end
    ST_GREEN:  begin red=0; green=1; yellow=0; next_state=ST_YELLOW; end
    ST_YELLOW: begin red=0; green=0; yellow=1; next_state=ST_RED;    end
    default:   begin red=1; green=0; yellow=0; next_state=ST_RED;    end
  endcase
end</pre>

<h3>Naming states with typedef enum</h3>
<p>Use <code>typedef enum logic [1:0] { ... } state_t;</code> to give states readable names. Verilator 5 requires <code>logic</code> as the base type.</p>

<pre class="code-block">typedef enum logic [1:0] {
  ST_RED    = 2'd0,
  ST_GREEN  = 2'd1,
  ST_YELLOW = 2'd2
} state_t;

state_t state, next_state;</pre>

<h3>Async reset vs sync reset — what changed from msv2</h3>
<p>In msv2 you wrote <code>always_ff @(posedge clk)</code> with active-low synchronous reset: <code>if (!rst) q &lt;= 0;</code>. The flip-flop only checks the reset signal <em>at the clock edge</em>.</p>
<p>FSM designs use <strong>asynchronous reset</strong>: <code>always_ff @(posedge clk or posedge rst)</code>. Adding <code>posedge rst</code> to the sensitivity list means the state register clears <em>immediately</em> when rst goes high — without waiting for the next clock edge. Notice the reset polarity flips too: it is now active-HIGH (<code>if (rst)</code>) instead of active-low (<code>if (!rst)</code>). Both patterns exist in real hardware; be consistent within a design.</p>
<table class="truth-table">
  <tr><th>Style</th><th>Sensitivity list</th><th>Reset check</th><th>Clears when</th></tr>
  <tr><td>Sync reset (msv2)</td><td>@(posedge clk)</td><td>if (!rst)</td><td>Next clock edge after rst goes low</td></tr>
  <tr><td>Async reset (msv4+)</td><td>@(posedge clk or posedge rst)</td><td>if (rst)</td><td>Immediately when rst goes high</td></tr>
</table>

<h3>Timing in this design</h3>
<p>The testbench counts clock cycles. RED lasts 10 cycles, GREEN 8 cycles, YELLOW 2 cycles. The FSM transitions automatically — your job is only to describe each state's output and its successor.</p>

<h3>You will build</h3>
<p>Module <code>traffic_light</code>: inputs <code>clk, rst</code>, outputs <code>red, green, yellow</code>. Three states, one-hot outputs, fixed timing via cycle counting.</p>

<p><strong>Ready?</strong> Switch to Code and type the module. Stuck? Tap 💡 Show Hint for the complete reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare the typedef enum with three states: ST_RED, ST_GREEN, ST_YELLOW',
        'Declare: state_t state, next_state;  and a counter: logic [3:0] cnt;',
        'Write the always_ff block: on posedge clk/rst, reset to ST_RED, else update state and cnt',
        'Write the always_comb block: unique case on state, set one-hot outputs and compute next_state',
        'RED=10 cycles, GREEN=8 cycles, YELLOW=2 cycles — use cnt to control transitions',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — PASS lines for GREEN and YELLOW states should appear',
      ],
      hint:
`module traffic_light (
  input  logic clk, rst,
  output logic red, green, yellow
);

  typedef enum logic [1:0] {
    ST_RED    = 2'd0,
    ST_GREEN  = 2'd1,
    ST_YELLOW = 2'd2
  } state_t;

  state_t      state, next_state;
  logic [3:0]  cnt;           // cycle counter within each state

  // 1. State register + counter
  always_ff @(posedge clk or posedge rst) begin
    if (rst) begin
      state <= ST_RED;
      cnt   <= 4'd0;
    end else begin
      state <= next_state;
      cnt   <= (state != next_state) ? 4'd0 : cnt + 4'd1;
    end
  end

  // 2. Output + next-state logic
  always_comb begin
    red   = 1'b0;
    green = 1'b0;
    yellow= 1'b0;
    unique case (state)
      ST_RED:    begin
        red  = 1'b1;
        next_state = (cnt == 4'd9)  ? ST_GREEN  : ST_RED;
      end
      ST_GREEN:  begin
        green = 1'b1;
        next_state = (cnt == 4'd7)  ? ST_YELLOW : ST_GREEN;
      end
      ST_YELLOW: begin
        yellow = 1'b1;
        next_state = (cnt == 4'd1)  ? ST_RED    : ST_YELLOW;
      end
      default: begin
        red = 1'b1;
        next_state = ST_RED;
      end
    endcase
  end

endmodule`,
      design:
`// Type the traffic_light FSM here. Read Theory for the two-block pattern.
//
// Ports:
//   input  logic clk, rst
//   output logic red, green, yellow
//
// States: ST_RED (10 cycles) -> ST_GREEN (8 cycles) -> ST_YELLOW (2 cycles) -> back to ST_RED
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst, red, green, yellow;
  traffic_light dut(.clk(clk), .rst(rst), .red(red), .green(green), .yellow(yellow));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1;
    @(posedge clk); #1;
    rst = 0;

    // Wait for RED phase (10 cycles)
    repeat(10) @(posedge clk); #1;
    if (green === 1'b1)
      $display("PASS  After RED phase: green is ON");
    else
      $display("FAIL  After RED phase: green=%0b yellow=%0b", green, yellow);

    // Wait for GREEN phase (8 cycles)
    repeat(8) @(posedge clk); #1;
    if (yellow === 1'b1)
      $display("PASS  After GREEN phase: yellow is ON");
    else
      $display("FAIL  After GREEN phase: green=%0b yellow=%0b", green, yellow);

    // Wait for YELLOW phase (2 cycles)
    repeat(2) @(posedge clk); #1;
    if (red === 1'b1)
      $display("PASS  After YELLOW phase: red is ON again");
    else
      $display("FAIL  After YELLOW phase: red=%0b", red);

    $display("Traffic light FSM works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  After RED phase: green is ON',
        'Traffic light FSM works!'
      ]
    },

    // ── L2 Vending Machine FSM (Tier 3) ──────────────────────────────────
    {
      id: 'msv4l2',
      title: 'L2 — Vending Machine FSM',
      theory: `
<h2>Vending Machine: FSM with Input-Driven Transitions</h2>
<p>The traffic light transitions on a timer. Real FSMs transition based on <strong>inputs</strong>. A vending machine is the classic example: it accepts coins and dispenses a product when enough money is inserted.</p>

<h3>Specification</h3>
<p>A drink costs 15 rupees. Coins are 5 rupees each. One coin per clock cycle can be inserted.</p>
<table class="truth-table">
  <tr><th>State</th><th>Coins so far</th><th>On coin=1</th><th>Output: dispense</th></tr>
  <tr><td>IDLE</td><td>0</td><td>→ FIVE</td><td>0</td></tr>
  <tr><td>FIVE</td><td>5</td><td>→ TEN</td><td>0</td></tr>
  <tr><td>TEN</td><td>10</td><td>→ DISPENSE</td><td>0</td></tr>
  <tr><td>DISPENSE</td><td>15 (done)</td><td>—</td><td>1 (one cycle pulse)</td></tr>
</table>

<h3>Mealy vs Moore</h3>
<p>In this design <code>dispense</code> depends only on the current state (DISPENSE), making it a Moore FSM. The state transitions depend on the <code>coin</code> input — that is normal for any FSM.</p>

<h3>Key pattern: input-dependent transition</h3>
<pre class="code-block">IDLE: next_state = coin ? FIVE : IDLE;</pre>
<p>The ternary operator inside <code>always_comb</code> is the standard way to express "if input is asserted, move to next state, else stay."</p>

<h3>You will build</h3>
<p>Module <code>vending_machine</code>: inputs <code>clk, rst, coin</code>, output <code>dispense</code>. Four states. After dispensing, automatically return to IDLE.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for the complete reference.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare typedef enum with four states: IDLE, FIVE, TEN, DISPENSE',
        'Write the always_ff state register: rst -> IDLE, else state <= next_state',
        'Write always_comb: case on state, compute next_state from coin input',
        'IDLE: if coin, go to FIVE, else stay',
        'FIVE: if coin, go to TEN, else stay',
        'TEN: if coin, go to DISPENSE, else stay',
        'DISPENSE: always go back to IDLE (dispense is a one-cycle pulse)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — 3 PASS lines should appear',
      ],
      hint:
`module vending_machine (
  input  logic clk, rst, coin,
  output logic dispense
);

  typedef enum logic [1:0] {
    IDLE     = 2'd0,
    FIVE     = 2'd1,
    TEN      = 2'd2,
    DISPENSE = 2'd3
  } state_t;

  state_t state, next_state;

  // 1. State register
  always_ff @(posedge clk or posedge rst) begin
    if (rst) state <= IDLE;
    else     state <= next_state;
  end

  // 2. Next-state + output logic
  always_comb begin
    dispense = 1'b0;
    unique case (state)
      IDLE:     next_state = coin ? FIVE     : IDLE;
      FIVE:     next_state = coin ? TEN      : FIVE;
      TEN:      next_state = coin ? DISPENSE : TEN;
      DISPENSE: begin
        dispense   = 1'b1;
        next_state = IDLE;
      end
      default:  next_state = IDLE;
    endcase
  end

endmodule`,
      design:
`// Type the vending_machine FSM here. Read Theory for the state table.
//
// Ports:
//   input  logic clk, rst, coin
//   output logic dispense
//
// States: IDLE -> FIVE -> TEN -> DISPENSE -> IDLE
// A 5-rupee coin is inserted each time coin=1.
// dispense pulses high for one cycle when 15 rupees collected.
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst, coin, dispense;
  vending_machine dut(.clk(clk), .rst(rst), .coin(coin), .dispense(dispense));

  always #5 clk = ~clk;

  initial begin
    clk = 0; rst = 1; coin = 0;
    @(posedge clk); #1;
    rst = 0;

    // Insert first coin
    coin = 1; @(posedge clk); #1; coin = 0;
    @(posedge clk); #1;
    if (dispense === 1'b0)
      $display("PASS  After 1 coin: no dispense yet");
    else
      $display("FAIL  After 1 coin: dispense=%0b", dispense);

    // Insert second coin
    coin = 1; @(posedge clk); #1; coin = 0;
    @(posedge clk); #1;
    if (dispense === 1'b0)
      $display("PASS  After 2 coins: no dispense yet");
    else
      $display("FAIL  After 2 coins: dispense=%0b", dispense);

    // Insert third coin -> should dispense
    coin = 1; @(posedge clk); #1; coin = 0;
    @(posedge clk); #1;
    if (dispense === 1'b1)
      $display("PASS  After 3 coins: dispensed!");
    else
      $display("FAIL  After 3 coins: dispense=%0b", dispense);

    $display("Vending machine FSM works!");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  After 3 coins: dispensed!',
        'Vending machine FSM works!'
      ]
    },

    // ── L3 Sequence Detector (Tier 4) ────────────────────────────────────
    {
      id: 'msv4l3',
      title: 'L3 — 1011 Sequence Detector',
      theory: `
<h2>Sequence Detector: Detecting a Pattern in a Bit Stream</h2>
<p>A <strong>sequence detector</strong> asserts its output for one cycle whenever a specific bit pattern appears on a serial input. Sequence detectors are used in protocol decoders, data link layers, and packet framing circuits.</p>

<h3>Target pattern: 1011 (overlapping)</h3>
<p>The FSM watches a single-bit serial input <code>din</code> and asserts <code>detected</code> high for one clock cycle each time the pattern 1011 appears. <strong>Overlapping</strong> means: if the tail of one match is the start of the next, count it — after 101<strong>1</strong>, the final 1 begins a new potential match.</p>

<h3>State diagram (Moore FSM)</h3>
<pre class="code-block">
         din=0        din=0       din=1
  S0 ----------&gt; S0    S2 -------&gt; S0
  S0 --din=1--&gt;  S1    S2 --din=1-&gt; S3
  S1 --din=0--&gt;  S2    S3 --din=0-&gt; S2
  S1 --din=1--&gt;  S1    S3 --din=1-&gt; S4 (detected!)
                       S4 --din=0-&gt; S2
                       S4 --din=1-&gt; S1  (overlap: last 1 starts new match)
</pre>
<p>S0 = reset/start, S1 = saw "1", S2 = saw "10", S3 = saw "101", S4 = saw "1011" (detected=1).</p>

<h3>Overlapping transition from S4</h3>
<p>After a match, the final bit was 1. If the next bit is also 1, we already have the first 1 of a new sequence — go to S1. If the next bit is 0, we have "10" — go to S2. This is what makes the detector overlapping.</p>

<h3>You will build</h3>
<p>Module <code>seq_det</code>: inputs <code>clk, rst, din</code>, output <code>detected</code>. Five states. <code>detected</code> is 1 only in S4.</p>

<p><strong>Ready?</strong> Switch to Code. Stuck? Tap 💡 Show Hint for design notes and the state transition table.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'Declare typedef enum with 5 states: S0, S1, S2, S3, S4',
        'S4 is the detected state — output detected=1 only in S4',
        'Write always_ff state register (reset to S0)',
        'Write always_comb: case on state, compute next_state based on din',
        'S0: din=0->S0, din=1->S1',
        'S1: din=0->S2, din=1->S1  (already have a 1, another 1 keeps S1)',
        'S2: din=0->S0, din=1->S3  (had 10, if 0 again reset, if 1 -> 101)',
        'S3: din=0->S2, din=1->S4  (had 101, 0 takes us back to 10, 1 completes 1011)',
        'S4: din=0->S2, din=1->S1  (overlap! last bit was 1)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — overlapping match should fire twice in the test sequence',
      ],
      hint:
`DESIGN NOTES for seq_det (1011 overlapping Moore FSM):

  5 states: S0 (start) S1 (saw 1) S2 (saw 10) S3 (saw 101) S4 (detected 1011)
  output detected = 1 ONLY in S4 — assign it in always_comb.

  State transition table:
    state  din  next_state
    S0      0   S0
    S0      1   S1
    S1      0   S2
    S1      1   S1    <- repeated 1, restart
    S2      0   S0    <- 100 is not a prefix of 1011, full reset
    S2      1   S3
    S3      0   S2    <- 1010 ends in 10, which IS a prefix
    S3      1   S4    <- match!
    S4      0   S2    <- last bit 1, then 0 -> we have "10"
    S4      1   S1    <- overlap: last bit 1, another 1 -> S1

  Code skeleton:
    typedef enum logic [2:0] { S0,S1,S2,S3,S4 } state_t;
    state_t state, next_state;

    always_ff @(posedge clk or posedge rst)
      if (rst) state <= S0; else state <= next_state;

    always_comb begin
      detected   = (state == S4);
      unique case (state)
        S0: next_state = din ? S1 : S0;
        S1: next_state = din ? S1 : S2;
        S2: next_state = din ? S3 : S0;
        S3: next_state = din ? S4 : S2;
        S4: next_state = din ? S1 : S2;
        default: next_state = S0;
      endcase
    end`,
      design:
`// Build the sequence detector here. Read Theory for the state diagram.
//
// Module: seq_det
// Ports: clk, rst (inputs), din (1-bit serial input), detected (output)
// Pattern: 1011 (overlapping detection)
//
// Hint: 5 states — S0 S1 S2 S3 S4(detected)
//
// Delete this and start typing:
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst, din, detected;
  seq_det dut(.clk(clk), .rst(rst), .din(din), .detected(detected));

  always #5 clk = ~clk;

  task feed(input logic bit_val);
    din = bit_val;
    @(posedge clk); #1;
  endtask

  integer match_count;

  initial begin
    clk = 0; rst = 1; din = 0; match_count = 0;
    @(posedge clk); #1;
    rst = 0;

    // Feed 1,0,1,1 -> first match
    feed(1); feed(0); feed(1); feed(1);
    if (detected === 1'b1) begin
      $display("PASS  First 1011 detected");
      match_count = match_count + 1;
    end else
      $display("FAIL  Expected first detection, got detected=%0b", detected);

    // Overlap: feed 0,1,1 -> second match (last 1 from prev + 0,1,1 = 1011 overlapping)
    feed(0); feed(1); feed(1);
    if (detected === 1'b1) begin
      $display("PASS  Overlapping 1011 detected");
      match_count = match_count + 1;
    end else
      $display("FAIL  Expected overlapping detection, got detected=%0b", detected);

    // No match: feed 1,0,0,0
    feed(1); feed(0); feed(0); feed(0);
    if (detected === 1'b0)
      $display("PASS  No false trigger on 1000");
    else
      $display("FAIL  False trigger: detected=%0b", detected);

    $display("Sequence detector done, %0d matches found", match_count);
    $finish;
  end
endmodule`,
      expected: [
        'PASS  First 1011 detected',
        'PASS  Overlapping 1011 detected',
        'Sequence detector done, 2 matches found'
      ]
    },

    // ── L4 Portfolio: Combo Lock (Tier 5) ────────────────────────────────
    {
      id: 'msv4l4',
      title: 'L4 — Portfolio: Combo Lock',
      theory: `
<h2>Portfolio Project: 4-Digit Combination Lock</h2>
<p>This is your Digital Design certificate project. A combination lock is an FSM that accepts a 4-digit sequence and unlocks only if all four digits match the programmed combination — and adds a time penalty if a wrong digit is entered.</p>

<h3>Your specification</h3>
<ul>
  <li>Combination: <code>4 → 2 → 7 → 1</code> (BCD values, 4-bit each)</li>
  <li>Input: <code>digit[3:0]</code> — the current digit, <code>enter</code> — pulse to submit it</li>
  <li>Output: <code>unlocked</code> — stays high as long as lock is in OPEN state</li>
  <li>Output: <code>penalty</code> — high for 4 cycles when a wrong digit is entered</li>
  <li>After OPEN: pressing <code>enter</code> relocks the system (go to D0)</li>
</ul>

<h3>State map</h3>
<pre class="code-block">D0 --(enter &amp; digit==4)--&gt; D1
D0 --(enter &amp; digit!=4)--&gt; PENALTY -&gt; D0
D1 --(enter &amp; digit==2)--&gt; D2
D1 --(enter &amp; digit!=2)--&gt; PENALTY -&gt; D0
D2 --(enter &amp; digit==7)--&gt; D3
D2 --(enter &amp; digit!=7)--&gt; PENALTY -&gt; D0
D3 --(enter &amp; digit==1)--&gt; OPEN
D3 --(enter &amp; digit!=1)--&gt; PENALTY -&gt; D0
OPEN --(enter)--&gt; D0 (relock)</pre>

<h3>Penalty state</h3>
<p>Use a counter to stay in PENALTY for exactly 4 cycles before returning to D0. This models real combo locks that disable input after a wrong guess.</p>

<h3>Why this matters</h3>
<p>Combination locks appear in smart card readers, PIN pads, and access control systems. The pattern — correct sequence of inputs to unlock, penalty on wrong entry — is used in every tamper-resistant embedded device.</p>

<p><strong>Ready?</strong> Switch to Code. There is no hint for this one — this is your portfolio piece. Plan the states on paper first, then type.</p>
`,
      tasks: [
        'Code tab is blank — type every line.',
        'States: D0, D1, D2, D3, OPEN, PENALTY (6 states — use logic [2:0] base)',
        'Correct combination: digit 4, 2, 7, 1 entered in sequence with enter=1',
        'On wrong digit with enter=1: go to PENALTY state for 4 cycles, then D0',
        'In OPEN: unlocked=1 — stay until enter=1, then relock to D0',
        'In PENALTY: penalty=1 for 4 cycles (use a 2-bit counter)',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — correct sequence should unlock, wrong digit should trigger penalty',
        '🎓 Portfolio piece — push to your GitHub as part of the Digital Design certificate',
        'Next: msv5 Memory & Storage — register files, SRAM, and FIFO buffers',
      ],
      hint: `No hint for portfolio projects. Plan on paper:
1. List all states and their outputs.
2. Write the state transition table for every (state, digit, enter) combination.
3. Code the always_ff and always_comb blocks.
4. Trace through the correct sequence manually to verify.
5. Trace a wrong entry to verify penalty fires.`,
      design:
`// Build the combo_lock module here.
//
// Ports:
//   input  logic       clk, rst
//   input  logic [3:0] digit   -- current digit being entered
//   input  logic       enter   -- pulse: 1 = submit this digit
//   output logic       unlocked -- 1 = lock is open
//   output logic       penalty  -- 1 = wrong entry, inputs locked for 4 cycles
//
// Combination: 4 -> 2 -> 7 -> 1
//
// Hint: 6 states: D0 D1 D2 D3 OPEN PENALTY
`,
      testbench:
`\`timescale 1ns/1ps
module tb;
  logic clk, rst, enter, unlocked, penalty;
  logic [3:0] digit;
  combo_lock dut(.clk(clk), .rst(rst), .digit(digit), .enter(enter),
                 .unlocked(unlocked), .penalty(penalty));

  always #5 clk = ~clk;

  task press(input logic [3:0] d);
    digit = d; enter = 1;
    @(posedge clk); #1;
    enter = 0;
    @(posedge clk); #1;
  endtask

  initial begin
    clk = 0; rst = 1; enter = 0; digit = 0;
    @(posedge clk); #1;
    rst = 0;

    // Enter correct sequence: 4, 2, 7, 1
    press(4'd4);
    press(4'd2);
    press(4'd7);
    press(4'd1);

    if (unlocked === 1'b1)
      $display("PASS  Correct sequence: lock is OPEN");
    else
      $display("FAIL  Correct sequence: unlocked=%0b", unlocked);

    // Relock by pressing enter
    enter = 1; @(posedge clk); #1; enter = 0;
    @(posedge clk); #1;
    if (unlocked === 1'b0)
      $display("PASS  Relocked successfully");
    else
      $display("FAIL  Did not relock: unlocked=%0b", unlocked);

    // Enter wrong first digit -> penalty
    press(4'd9);
    if (penalty === 1'b1)
      $display("PASS  Wrong digit triggers penalty");
    else
      $display("FAIL  Wrong digit: penalty=%0b", penalty);

    $display("Combo lock test done");
    $finish;
  end
endmodule`,
      expected: [
        'PASS  Correct sequence: lock is OPEN',
        'PASS  Wrong digit triggers penalty',
        'Combo lock test done'
      ]
    }

  ]
});
