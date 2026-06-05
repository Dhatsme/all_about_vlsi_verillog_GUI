(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long9',
  title: 'Error Handling & Interrupt Controller',
  icon: '🚨',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long9l1',
      title: 'L1 — TX Underrun: When the Pipeline Runs Dry',
      theory: `<h2>TX Underrun — The Sticky Error Flag</h2>
<p>Imagine an assembly line stamping out car doors, one every ten seconds. A worker at the end of the line places a protective film on each door as it arrives. If the film supply runs out, the worker has two choices: stop the entire line (halting the factory), or keep placing blank placeholders and call for more film. In real manufacturing, stopping the line costs far more than shipping a few unprotected doors. Our SPI master makes the same choice: when the TX FIFO runs dry at the start of a word, the shift register loads all zeros and keeps shifting — the SCK clock keeps ticking, the chip-select stays asserted, and a sticky flag goes up so the CPU knows later.</p>

<h3>Where spi_errors Sits in the System</h3>
<pre class="code-block">
  ┌────────────────────────────────────────────────────────────┐
  │                    SPI Master System                       │
  │                                                            │
  │  ┌──────────┐ tx_empty  ┌──────────────────┐              │
  │  │  TX FIFO │──────────►│                  │ underrun_sticky ──► INT_STATUS
  │  └──────────┘           │  spi_errors ★    │              │
  │                         │                  │ tx_shift_zeros ──► shift reg
  │  ┌──────────┐ in_load ─►│                  │              │
  │  │  Master  │           └──────────────────┘              │
  │  │   FSM    │                                              │
  │  └──────────┘                                              │
  └────────────────────────────────────────────────────────────┘
</pre>

<h3>The LOAD State — Where Underrun Is Detected</h3>
<p>When the FSM enters the LOAD state, it expects a word waiting in the TX FIFO. LOAD is the "fetch" cycle — the FIFO read pointer advances and the parallel word transfers into the shift register. If the FIFO is empty at that moment, there is nothing to fetch. This is a TX underrun.</p>
<p>The transfer does <strong>not</strong> stop. The shift register is loaded with zeros and the SCK sequence continues normally. The slave receives a dummy 0x00 frame. Software discovers what happened by reading the sticky flag later.</p>

<h3>The Sticky Flag Pattern</h3>
<p>A sticky flag is a self-latching register bit: once it goes high, it stays high until software explicitly clears it — even if the triggering condition disappears. This is the universal error-reporting pattern in silicon IP blocks. The error might be gone by the time the CPU interrupt service routine runs, but software still needs to know it happened.</p>
<pre class="code-block">// Sticky flag: sets on event, never self-clears
always_ff @(posedge pclk or negedge rst_n) begin
  if (!rst_n)
    underrun_sticky &lt;= 1'b0;
  else if (in_load_state &amp;&amp; tx_empty)
    underrun_sticky &lt;= 1'b1;
  // no else — once set, stays set until W1C clear
end</pre>
<p>There is no <code>else underrun_sticky &lt;= 1'b0</code> clause. That is intentional. The bit clears only via the W1C (Write 1 to Clear) mechanism in the interrupt controller — built in L4.</p>

<h3>The tx_shift_zeros Signal</h3>
<p>The second output tells the shift register what to load when underrun is detected. This is combinational — the same cycle the LOAD state is entered with an empty FIFO, <code>tx_shift_zeros</code> goes high.</p>
<pre class="code-block">assign tx_shift_zeros = in_load_state &amp;&amp; tx_empty;</pre>
<p>The shift register uses this to load <code>'0</code> instead of the FIFO read data. The slave receives a deterministic 0x00 dummy frame rather than undefined data.</p>

<h3>Module Ports</h3>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Width</th><th>Meaning</th></tr>
  <tr><td>pclk</td><td>input</td><td>1</td><td>System clock</td></tr>
  <tr><td>rst_n</td><td>input</td><td>1</td><td>Active-low async reset</td></tr>
  <tr><td>in_load_state</td><td>input</td><td>1</td><td>FSM is in LOAD state this cycle</td></tr>
  <tr><td>tx_empty</td><td>input</td><td>1</td><td>TX FIFO has no words available</td></tr>
  <tr><td>underrun_sticky</td><td>output</td><td>1</td><td>Sticky flag — latches on first underrun</td></tr>
  <tr><td>tx_shift_zeros</td><td>output</td><td>1</td><td>High when shift register should load 0</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_tx_underrun with ports: pclk, rst_n, in_load_state, tx_empty (all input logic) and underrun_sticky, tx_shift_zeros (output logic)',
        'Step 2 — write an always_ff block with async active-low reset; on reset, set underrun_sticky to 0',
        'Step 3 — in the else clause: if (in_load_state && tx_empty) set underrun_sticky to 1; write no else branch — the sticky behaviour comes from the absence of a clear clause',
        'Step 4 — outside the always_ff, write an assign: tx_shift_zeros = in_load_state && tx_empty',
        'Step 5 — close the module with endmodule',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_tx_underrun (
  input  logic pclk,
  input  logic rst_n,
  input  logic in_load_state,   // FSM is in LOAD state
  input  logic tx_empty,        // TX FIFO is empty
  output logic underrun_sticky, // latches on first underrun
  output logic tx_shift_zeros   // tells shift reg to load 0
);

  // Sticky flag — sets when LOAD fires on empty FIFO
  // Never self-clears; requires W1C from IRQ controller (L4)
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)
      underrun_sticky <= 1'b0;
    else if (in_load_state && tx_empty)
      underrun_sticky <= 1'b1;
  end

  // Combinational: active the same cycle underrun is detected
  assign tx_shift_zeros = in_load_state && tx_empty;

endmodule`,

      design:
`// Type the spi_tx_underrun module here.
// See Theory for the sticky flag concept.
//
// Ports:
//   input  logic pclk, rst_n
//   input  logic in_load_state  -- FSM in LOAD state
//   input  logic tx_empty       -- TX FIFO empty
//   output logic underrun_sticky -- latches on detection
//   output logic tx_shift_zeros  -- shift reg loads 0
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic rst_n, in_load_state, tx_empty;
  logic underrun_sticky, tx_shift_zeros;

  spi_tx_underrun dut (
    .pclk(pclk), .rst_n(rst_n),
    .in_load_state(in_load_state), .tx_empty(tx_empty),
    .underrun_sticky(underrun_sticky),
    .tx_shift_zeros(tx_shift_zeros)
  );

  initial begin
    $display("=== TX Underrun Test ===");
    rst_n = 0; in_load_state = 0; tx_empty = 0;
    @(posedge pclk); #1;
    if (underrun_sticky === 0 && tx_shift_zeros === 0)
      $display("PASS  reset: sticky=0 zeros=0");
    else
      $display("FAIL  reset: sticky=%0b zeros=%0b", underrun_sticky, tx_shift_zeros);
    rst_n = 1;

    // LOAD, FIFO not empty — no underrun
    in_load_state = 1; tx_empty = 0;
    @(posedge pclk); #1;
    if (underrun_sticky === 0 && tx_shift_zeros === 0)
      $display("PASS  load+full: no underrun");
    else
      $display("FAIL  load+full: sticky=%0b zeros=%0b", underrun_sticky, tx_shift_zeros);

    // LOAD, FIFO empty — underrun fires
    in_load_state = 1; tx_empty = 1;
    @(posedge pclk); #1;
    if (underrun_sticky === 1 && tx_shift_zeros === 1)
      $display("PASS  load+empty: underrun detected");
    else
      $display("FAIL  load+empty: sticky=%0b zeros=%0b", underrun_sticky, tx_shift_zeros);

    // Condition clears — sticky stays latched
    in_load_state = 0; tx_empty = 0;
    @(posedge pclk); #1;
    if (underrun_sticky === 1 && tx_shift_zeros === 0)
      $display("PASS  sticky persists after condition clears");
    else
      $display("FAIL  sticky=%0b (expected 1)", underrun_sticky);

    // Reset clears sticky
    rst_n = 0;
    @(posedge pclk); #1;
    if (underrun_sticky === 0)
      $display("PASS  reset clears sticky flag");
    else
      $display("FAIL  reset did not clear sticky: %0b", underrun_sticky);

    $display("TX underrun module works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: sticky=0 zeros=0',
        'PASS  load+empty: underrun detected',
        'PASS  sticky persists after condition clears',
        'TX underrun module works!',
      ],
    },

    {
      id: 'spi_long9l2',
      title: 'L2 — RX Overrun: When the Receive Buffer Fills Up',
      theory: `<h2>RX Overrun — The Drop-and-Flag Policy</h2>
<p>Imagine a hotel breakfast buffet with a fixed number of warming trays. Guests keep filling plates, but when all trays are occupied the kitchen keeps cooking — new dishes come out of the oven, are placed briefly on the counter, and then discarded because there is nowhere to put them. The head chef writes "overrun" in the log. Our SPI RX path works exactly this way: when a transfer completes and the shift register tries to push a freshly received word into the RX FIFO, but that FIFO is already full, the word is dropped and <code>overrun_sticky</code> is set.</p>

<h3>Detection Point: COMPLETE State Entry</h3>
<p>The RX overrun check happens at the exact cycle the FSM enters the COMPLETE state — the one cycle where the shift register holds a complete, valid received word. The FSM asks: is there room in the RX FIFO? If not, the word is gone.</p>
<pre class="code-block">// At COMPLETE state entry:
//   if (!rx_full) push rx_shift to FIFO   — normal path
//   else          drop word, set sticky   — overrun
//
// The transfer does NOT stop. The next word begins
// with a fresh empty shift register.</pre>
<p>Why not block and wait for space? Because the SCK clock is already committed. The shift register ticks at a rate set by the divider — pausing the slave's bit counter would distort the SCK waveform. The only safe choices are drop-and-flag or abort-the-transfer. The spec chose drop-and-flag because it is non-destructive to the ongoing SCK sequence.</p>

<h3>Software Prevention</h3>
<p>Overrun is always a software problem: the CPU is not draining the RX FIFO fast enough. The RX watermark interrupt (<code>RX_ALMOST_FULL</code>) exists precisely to give advance warning — it fires when the FIFO still has headroom, not when it is completely full. The correct ISR pattern:</p>
<pre class="code-block">// On RX_WM interrupt: drain the FIFO before it fills
while (rx_level &gt; 0) {
  word = read(RXDATA);
  process(word);
}
clear_w1c(INT_STATUS.RX_WM);</pre>
<p>If the ISR runs quickly enough, the FIFO never reaches full capacity and RX overrun never fires. An <code>overrun_sticky</code> flag in production silicon usually indicates a misconfigured interrupt priority or an ISR that takes too long.</p>

<h3>The drop_word Signal</h3>
<p>Like <code>tx_shift_zeros</code> in L1, <code>drop_word</code> is a combinational output active in the same cycle as detection. It suppresses the push to the RX FIFO — the FIFO write-enable is gated by the inverse of this signal.</p>
<pre class="code-block">assign drop_word = in_complete_state &amp;&amp; rx_full;

// In the RX push logic (context only):
// fifo_wr_en = in_complete_state &amp;&amp; !rx_full;</pre>

<h3>Module Ports</h3>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Width</th><th>Meaning</th></tr>
  <tr><td>pclk</td><td>input</td><td>1</td><td>System clock</td></tr>
  <tr><td>rst_n</td><td>input</td><td>1</td><td>Active-low async reset</td></tr>
  <tr><td>in_complete_state</td><td>input</td><td>1</td><td>FSM just entered COMPLETE state</td></tr>
  <tr><td>rx_full</td><td>input</td><td>1</td><td>RX FIFO is at capacity</td></tr>
  <tr><td>overrun_sticky</td><td>output</td><td>1</td><td>Sticky flag — latches on first overrun</td></tr>
  <tr><td>drop_word</td><td>output</td><td>1</td><td>Suppress push to RX FIFO this cycle</td></tr>
</table>

<p>This module is a mirror of <code>spi_tx_underrun</code> from L1. The structure is identical — a sticky <code>always_ff</code> and a combinational <code>assign</code>. Only the detection condition changes: <code>in_complete_state &amp;&amp; rx_full</code> instead of <code>in_load_state &amp;&amp; tx_empty</code>. Building it a second time at this tier locks in the pattern before it disappears into the error aggregator in L3 and L4.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_rx_overrun with ports: pclk, rst_n, in_complete_state, rx_full (all input logic) and overrun_sticky, drop_word (output logic)',
        'Step 2 — write an always_ff block with async active-low reset; on reset, set overrun_sticky to 0',
        'Step 3 — in the else clause: if (in_complete_state && rx_full) set overrun_sticky to 1; no else branch',
        'Step 4 — write an assign: drop_word = in_complete_state && rx_full',
        'Step 5 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_rx_overrun (
  input  logic pclk,
  input  logic rst_n,
  input  logic in_complete_state, // FSM entered COMPLETE state
  input  logic rx_full,           // RX FIFO is at capacity
  output logic overrun_sticky,    // latches on first overrun
  output logic drop_word          // suppress FIFO push this cycle
);

  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)
      overrun_sticky <= 1'b0;
    else if (in_complete_state && rx_full)
      overrun_sticky <= 1'b1;
  end

  assign drop_word = in_complete_state && rx_full;

endmodule`,

      design:
`// Type the spi_rx_overrun module here.
// See Theory for the drop-and-flag policy.
//
// Ports:
//   input  logic pclk, rst_n
//   input  logic in_complete_state  -- FSM in COMPLETE
//   input  logic rx_full            -- RX FIFO full
//   output logic overrun_sticky     -- latches on detection
//   output logic drop_word          -- suppress FIFO push
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic rst_n, in_complete_state, rx_full;
  logic overrun_sticky, drop_word;

  spi_rx_overrun dut (
    .pclk(pclk), .rst_n(rst_n),
    .in_complete_state(in_complete_state), .rx_full(rx_full),
    .overrun_sticky(overrun_sticky), .drop_word(drop_word)
  );

  initial begin
    $display("=== RX Overrun Test ===");
    rst_n = 0; in_complete_state = 0; rx_full = 0;
    @(posedge pclk); #1;
    if (overrun_sticky === 0 && drop_word === 0)
      $display("PASS  reset: sticky=0 drop=0");
    else
      $display("FAIL  reset state incorrect");
    rst_n = 1;

    // COMPLETE, FIFO has room — no overrun
    in_complete_state = 1; rx_full = 0;
    @(posedge pclk); #1;
    if (overrun_sticky === 0 && drop_word === 0)
      $display("PASS  complete+space: no overrun");
    else
      $display("FAIL  complete+space: sticky=%0b drop=%0b", overrun_sticky, drop_word);

    // COMPLETE, FIFO full — overrun fires
    in_complete_state = 1; rx_full = 1;
    @(posedge pclk); #1;
    if (overrun_sticky === 1 && drop_word === 1)
      $display("PASS  complete+full: overrun detected");
    else
      $display("FAIL  complete+full: sticky=%0b drop=%0b", overrun_sticky, drop_word);

    // Condition clears — sticky persists, drop_word released
    in_complete_state = 0; rx_full = 0;
    @(posedge pclk); #1;
    if (overrun_sticky === 1 && drop_word === 0)
      $display("PASS  sticky persists, drop_word released");
    else
      $display("FAIL  sticky=%0b drop=%0b", overrun_sticky, drop_word);

    // Reset clears sticky
    rst_n = 0;
    @(posedge pclk); #1;
    if (overrun_sticky === 0)
      $display("PASS  reset clears overrun sticky");
    else
      $display("FAIL  reset did not clear: %0b", overrun_sticky);

    $display("RX overrun module works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: sticky=0 drop=0',
        'PASS  complete+full: overrun detected',
        'PASS  sticky persists, drop_word released',
        'RX overrun module works!',
      ],
    },

    {
      id: 'spi_long9l3',
      title: 'L3 — Mode Fault: Three Configuration Violation Detectors',
      theory: `<h2>Mode Fault — Hardware Self-Protection Against Config Violations</h2>
<p>Imagine a pilot on final approach who reaches over and changes the altimeter calibration mid-landing. The aircraft does not crash immediately — the autopilot is still flying with its old numbers — but the flight data recorder marks this as a serious procedural violation. Mode fault in SPI is the same idea: not a data error, but a <em>configuration violation</em>. Something was changed mid-flight that would silently corrupt the protocol if hardware did not detect and record it.</p>
<p>Unlike TX underrun and RX overrun (which detect data loss), mode fault detects changes to the operating rules while a transfer is already in progress. There are three independent sub-causes, each with its own sticky flag.</p>

<h3>Sub-Cause 1: CS Contention</h3>
<p>The SPI master drives its selected chip-select pin low when a transfer begins. Contention occurs when the master's own CS output is low but an unexpected CS line is also pulled low — by a second master on the same bus, or by a noise glitch. The hardware equivalent of two people pulling on the same rope at the same time.</p>
<p>Detection: the pad controller monitors each CS output line versus the external pin state. If an unselected CS line goes low while the master is active, <code>cs_contention_in</code> pulses for one clock cycle. No <code>busy</code> guard is needed — contention is illegal at any time.</p>

<h3>Sub-Cause 2: CPOL Change While Busy</h3>
<p>CPOL defines whether SCK idles high or low. The shadow register introduced in spi_long8 protects the ongoing transfer: it runs with the CPOL value that was latched when the FSM left IDLE. But if the CPU writes a new CPOL value while a transfer is in progress, a software bug has been revealed. The transfer itself is unaffected — but we record the attempt.</p>
<p>Detection: the APB decoder generates a one-cycle pulse <code>cpol_wr</code> whenever the CPU writes to the CPOL field. If <code>busy=1</code> at that moment, the sticky flag sets.</p>
<pre class="code-block">if (busy &amp;&amp; cpol_wr)
  cpol_change_sticky &lt;= 1'b1;</pre>

<h3>Sub-Cause 3: CPHA Change While Busy</h3>
<p>CPHA defines which edge is the sample edge and which is the launch edge. Changing it mid-transfer would mean some bits were captured on one edge and later bits on the opposite — the received word would be corrupted. The shadow register prevents hardware corruption, but the attempt is still flagged.</p>
<pre class="code-block">if (busy &amp;&amp; cpha_wr)
  cpha_change_sticky &lt;= 1'b1;</pre>

<h3>The Summary Output and Recovery</h3>
<p>All three sticky bits feed a combinational OR to produce <code>mode_fault_any</code>. This is what fires the <code>MODE_FAULT</code> interrupt in L4.</p>
<pre class="code-block">assign mode_fault_any = cpol_change_sticky
                      | cpha_change_sticky
                      | cs_contention_sticky;</pre>
<p>The FSM does not automatically abort on mode fault. Software must read the MODE_FAULT register to identify the sub-cause, W1C the sticky bits, write CTRL.ABORT to abort the in-flight transfer, and reinitialise CPOL/CPHA before the next transfer.</p>

<h3>Important: Three Parallel If Statements</h3>
<p>The three stickies must use separate <code>if</code> statements inside the <code>always_ff</code>, <strong>not</strong> <code>else if</code>. Each sub-cause is independent — both CPOL and CPHA can be written in the same clock cycle, and both should latch simultaneously.</p>
<pre class="code-block">// Correct: three parallel ifs — all can fire in the same cycle
if (busy &amp;&amp; cpol_wr)   cpol_change_sticky   &lt;= 1'b1;
if (busy &amp;&amp; cpha_wr)   cpha_change_sticky   &lt;= 1'b1;
if (cs_contention_in)  cs_contention_sticky &lt;= 1'b1;

// Wrong: else-if means only the first match fires each cycle
// if (...) ... else if (...) ...  &lt;-- do NOT do this</pre>

<h3>Module Ports</h3>
<table class="truth-table">
  <tr><th>Port</th><th>Direction</th><th>Meaning</th></tr>
  <tr><td>pclk, rst_n</td><td>input</td><td>Clock and async reset</td></tr>
  <tr><td>busy</td><td>input</td><td>Transfer in progress (from FSM)</td></tr>
  <tr><td>cpol_wr</td><td>input</td><td>APB write to CPOL field this cycle</td></tr>
  <tr><td>cpha_wr</td><td>input</td><td>APB write to CPHA field this cycle</td></tr>
  <tr><td>cs_contention_in</td><td>input</td><td>Contention detected on CS pads</td></tr>
  <tr><td>cpol_change_sticky</td><td>output</td><td>CPOL was written while busy</td></tr>
  <tr><td>cpha_change_sticky</td><td>output</td><td>CPHA was written while busy</td></tr>
  <tr><td>cs_contention_sticky</td><td>output</td><td>CS contention detected</td></tr>
  <tr><td>mode_fault_any</td><td>output</td><td>OR of all three sticky flags</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_mode_fault with all ports from the table',
        'Step 2 — write a single always_ff block with async active-low reset; reset all three sticky outputs to 0 using a begin/end block',
        'Step 3 — in the else begin/end: write three independent if statements (not else-if); each sticky sets independently',
        'Step 4 — CPOL trigger: if (busy && cpol_wr) set cpol_change_sticky',
        'Step 5 — CPHA trigger: if (busy && cpha_wr) set cpha_change_sticky',
        'Step 6 — contention trigger: if (cs_contention_in) set cs_contention_sticky — no busy guard needed',
        'Step 7 — write an assign: mode_fault_any = cpol_change_sticky | cpha_change_sticky | cs_contention_sticky',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_mode_fault (
  input  logic pclk,
  input  logic rst_n,
  input  logic busy,                   // transfer in progress
  input  logic cpol_wr,                // APB write to CPOL field
  input  logic cpha_wr,                // APB write to CPHA field
  input  logic cs_contention_in,       // contention on CS pads
  output logic cpol_change_sticky,
  output logic cpha_change_sticky,
  output logic cs_contention_sticky,
  output logic mode_fault_any
);

  // Three independent sticky flags — parallel if, not else-if
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n) begin
      cpol_change_sticky   <= 1'b0;
      cpha_change_sticky   <= 1'b0;
      cs_contention_sticky <= 1'b0;
    end else begin
      if (busy && cpol_wr)     cpol_change_sticky   <= 1'b1;
      if (busy && cpha_wr)     cpha_change_sticky   <= 1'b1;
      if (cs_contention_in)    cs_contention_sticky <= 1'b1;
    end
  end

  assign mode_fault_any = cpol_change_sticky
                        | cpha_change_sticky
                        | cs_contention_sticky;

endmodule`,

      design:
`// Build the spi_mode_fault module here.
// See Theory for all three sub-causes and the parallel-if rule.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic rst_n, busy, cpol_wr, cpha_wr, cs_contention_in;
  logic cpol_change_sticky, cpha_change_sticky;
  logic cs_contention_sticky, mode_fault_any;

  spi_mode_fault dut (
    .pclk(pclk), .rst_n(rst_n), .busy(busy),
    .cpol_wr(cpol_wr), .cpha_wr(cpha_wr),
    .cs_contention_in(cs_contention_in),
    .cpol_change_sticky(cpol_change_sticky),
    .cpha_change_sticky(cpha_change_sticky),
    .cs_contention_sticky(cs_contention_sticky),
    .mode_fault_any(mode_fault_any)
  );

  initial begin
    $display("=== Mode Fault Test ===");
    rst_n = 0; busy = 0; cpol_wr = 0; cpha_wr = 0; cs_contention_in = 0;
    @(posedge pclk); #1; rst_n = 1;

    // CPOL write when not busy — no fault
    busy = 0; cpol_wr = 1;
    @(posedge pclk); #1; cpol_wr = 0;
    if (cpol_change_sticky === 0)
      $display("PASS  cpol_wr without busy: no fault");
    else
      $display("FAIL  false cpol fault: %0b", cpol_change_sticky);

    // CPOL write while busy — fault fires
    busy = 1; cpol_wr = 1;
    @(posedge pclk); #1; cpol_wr = 0;
    if (cpol_change_sticky === 1)
      $display("PASS  cpol_wr while busy: fault detected");
    else
      $display("FAIL  cpol fault missed: %0b", cpol_change_sticky);

    // CPHA write while busy — independent fault
    cpha_wr = 1;
    @(posedge pclk); #1; cpha_wr = 0;
    if (cpha_change_sticky === 1)
      $display("PASS  cpha_wr while busy: fault detected");
    else
      $display("FAIL  cpha fault missed: %0b", cpha_change_sticky);

    // CS contention — fires regardless of busy
    busy = 0; cs_contention_in = 1;
    @(posedge pclk); #1; cs_contention_in = 0;
    if (cs_contention_sticky === 1)
      $display("PASS  cs_contention: fault detected");
    else
      $display("FAIL  contention fault missed");

    // Summary output
    if (mode_fault_any === 1)
      $display("PASS  mode_fault_any asserted with sticky bits set");
    else
      $display("FAIL  mode_fault_any=%0b", mode_fault_any);

    // Reset clears all
    rst_n = 0;
    @(posedge pclk); #1;
    if (mode_fault_any === 0)
      $display("PASS  reset clears all mode fault flags");
    else
      $display("FAIL  flags not cleared by reset");

    $display("Mode fault module works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  cpol_wr without busy: no fault',
        'PASS  cpol_wr while busy: fault detected',
        'PASS  cs_contention: fault detected',
        'PASS  mode_fault_any asserted with sticky bits set',
        'Mode fault module works!',
      ],
    },

    {
      id: 'spi_long9l4',
      title: 'L4 — Interrupt Controller: W1C, Global Enable, IRQ Level',
      theory: `<h2>The Interrupt Controller — One Wire to the CPU</h2>
<p>Imagine a hospital nurse station that monitors every room via call buttons. Each button has its own indicator light on the panel. The station also has a single buzzer connected to all lights: if any light is on, the buzzer sounds. The head nurse silences a specific light by pressing its reset button — but only if she writes 1 on the reset pad, not 0. And there is a master mute switch that silences the entire buzzer system during surgery. Our SPI interrupt controller works exactly this way.</p>
<p>Every hardware event — TX underrun, RX overrun, mode fault, transfer DONE, FIFO watermarks — drives its own indicator bit in <code>INT_STATUS</code>. The CPU enables which bits it cares about using <code>INT_EN</code>. A global enable acts as the master mute switch. The IRQ output is a level signal that stays high as long as any enabled bit is pending.</p>

<h3>The IRQ Logic Expression</h3>
<pre class="code-block">spi_irq_o = global_en &amp; |(int_status &amp; int_en)</pre>
<p>Reading right to left:</p>
<ul>
  <li><strong><code>int_status &amp; int_en</code></strong> — masking: only bits that are both pending AND enabled produce a 1. Disabled interrupt sources never contribute to the IRQ.</li>
  <li><strong><code>|( ... )</code></strong> — OR-reduce: if <em>any</em> masked bit is 1, the result is 1. A single pending enabled event drives the entire IRQ line high.</li>
  <li><strong><code>&amp; global_en</code></strong> — master switch: the entire interrupt system is silenced with one bit. Useful during initialisation when the CPU does not want spurious interrupts before its ISR is registered.</li>
</ul>

<h3>W1C — Write 1 to Clear</h3>
<p>W1C is the standard pattern for interrupt status registers in silicon IP. Here is why it is necessary: the CPU reads <code>INT_STATUS</code> to see which bits are set. It then wants to clear them. But between the read and the write, a new interrupt event might arrive and set another bit. If the CPU wrote back all zeros, that new event would be silently lost. W1C prevents this: the CPU writes a mask with 1s only in the positions it wants to clear. Bits written as 0 are untouched — so any new events that arrived between the read and the write survive.</p>
<pre class="code-block">// W1C update — a single always_ff line handles everything
int_status &lt;= (int_status | event_in) &amp; ~clear_in;

// event_in   sets bits  (new events arriving this cycle)
// ~clear_in  clears bits (CPU W1C mask)
// if event and clear arrive same cycle: event wins (set beats clear)</pre>
<p>This one expression encodes three rules simultaneously: reset clears all, event_in ORs in new bits each cycle, and clear_in masks out acknowledged bits. The priority is: reset &gt; clear &gt; set — except that within the non-reset path, event wins over clear for the same bit in the same cycle.</p>

<h3>Level vs Edge IRQ Behaviour</h3>
<p>The SPI IRQ output is a <strong>level signal</strong>. It is high as long as any enabled, uncleared bit is set in INT_STATUS. The CPU interrupt controller typically senses the rising edge once, runs the ISR, which clears the bits, which drops the level. If the ISR does not clear all pending bits, the IRQ stays high — forcing the CPU to fully service the condition before the interrupt quiets.</p>

<h3>Watermark Re-Assertion</h3>
<p>Most error bits (TX_UNDERRUN, RX_OVERRUN, MODE_FAULT) fire once and stay sticky until W1C'd. Watermark bits (TX_WM, RX_WM) behave differently: they re-fire every clock cycle the threshold condition still holds. If the CPU clears TX_WM but the FIFO is still below the watermark threshold, the bit sets again on the next clock. This is intentional — the CPU is forced to actually refill the FIFO before the interrupt quiets down.</p>

<h3>Module Ports</h3>
<table class="truth-table">
  <tr><th>Port</th><th>Dir</th><th>Width</th><th>Meaning</th></tr>
  <tr><td>pclk, rst_n</td><td>in</td><td>1</td><td>Clock and async reset</td></tr>
  <tr><td>event_in</td><td>in</td><td>8</td><td>Raw hardware events — bit N high when event N fires this cycle</td></tr>
  <tr><td>clear_in</td><td>in</td><td>8</td><td>W1C clear bus — CPU writes 1 to clear a specific bit</td></tr>
  <tr><td>int_en</td><td>in</td><td>8</td><td>Interrupt enable mask — 1 means this event can assert IRQ</td></tr>
  <tr><td>global_en</td><td>in</td><td>1</td><td>Master IRQ enable switch</td></tr>
  <tr><td>int_status</td><td>out</td><td>8</td><td>Current pending status (readable by CPU)</td></tr>
  <tr><td>spi_irq_o</td><td>out</td><td>1</td><td>IRQ level output to CPU interrupt controller</td></tr>
</table>

<p>The W1C line is the hardest part — trace through the priority: reset wins, then clear_in masks, then event_in sets. If both event and clear arrive for the same bit in the same cycle, the event wins because OR happens before AND-NOT in the expression.</p>

<p>In Phase 4 we wire all of these error modules — underrun, overrun, mode fault, and the IRQ controller — into the full SPI master together with the APB register interface. Every signal you built in this chapter becomes a field in a real register map.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_irq_ctrl with all ports from the table above',
        "Step 2 — write an always_ff block with async active-low reset; on reset, set int_status to 8'h00",
        'Step 3 — in the else clause: int_status <= (int_status | event_in) & ~clear_in — this single line handles set, W1C clear, and simultaneous event+clear atomically',
        'Step 4 — write an assign for spi_irq_o: global_en & |(int_status & int_en)',
        'Step 5 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 6 PASS lines should appear in the Output tab',
        '🎓 Phase 3 complete — you have built the full SPI control path: CS controller, master FSM, and the complete error and interrupt subsystem',
      ],

      hint:
`module spi_irq_ctrl (
  input  logic        pclk,
  input  logic        rst_n,
  input  logic [7:0]  event_in,   // hardware events (each bit = one event type)
  input  logic [7:0]  clear_in,   // W1C clear bus — CPU writes 1 to clear
  input  logic [7:0]  int_en,     // interrupt enable mask
  input  logic        global_en,  // master IRQ enable
  output logic [7:0]  int_status, // pending interrupt status
  output logic        spi_irq_o   // IRQ level output
);

  // W1C status register:
  //   | event_in   — new events set bits each cycle
  //   & ~clear_in  — CPU W1C clears acknowledged bits
  //   if event and clear arrive same cycle, event wins
  always_ff @(posedge pclk or negedge rst_n) begin
    if (!rst_n)
      int_status <= 8'h00;
    else
      int_status <= (int_status | event_in) & ~clear_in;
  end

  // IRQ fires if any enabled pending bit is set and global_en is high
  assign spi_irq_o = global_en & |(int_status & int_en);

endmodule`,

      design:
`// Build the spi_irq_ctrl module here.
// See Theory for the W1C pattern and IRQ level logic.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        rst_n;
  logic [7:0]  event_in, clear_in, int_en;
  logic        global_en;
  logic [7:0]  int_status;
  logic        spi_irq_o;

  spi_irq_ctrl dut (
    .pclk(pclk), .rst_n(rst_n),
    .event_in(event_in), .clear_in(clear_in),
    .int_en(int_en), .global_en(global_en),
    .int_status(int_status), .spi_irq_o(spi_irq_o)
  );

  initial begin
    $display("=== IRQ Controller Test ===");
    rst_n = 0; event_in = 0; clear_in = 0;
    int_en = 0; global_en = 0;
    @(posedge pclk); #1; rst_n = 1;

    // 1. Reset state
    if (int_status === 8'h00 && spi_irq_o === 0)
      $display("PASS  reset: int_status=0 irq=0");
    else
      $display("FAIL  reset: int_status=%0h irq=%0b", int_status, spi_irq_o);

    // 2. Event fires, global_en=0 — IRQ suppressed
    event_in = 8'h10; int_en = 8'hFF; global_en = 0;
    @(posedge pclk); #1; event_in = 8'h00;
    if (int_status[4] === 1 && spi_irq_o === 0)
      $display("PASS  event set but global_en=0: irq suppressed");
    else
      $display("FAIL  global_en=0 test: int_status=%0h irq=%0b", int_status, spi_irq_o);

    // 3. Enable global — IRQ fires on pending status
    global_en = 1; #1;
    if (spi_irq_o === 1)
      $display("PASS  global_en=1: irq fires");
    else
      $display("FAIL  irq did not fire: %0b", spi_irq_o);

    // 4. W1C clear bit 4 — IRQ deasserts
    clear_in = 8'h10;
    @(posedge pclk); #1; clear_in = 8'h00;
    if (int_status[4] === 0 && spi_irq_o === 0)
      $display("PASS  W1C clear: bit 4 cleared, irq=0");
    else
      $display("FAIL  W1C: int_status=%0h irq=%0b", int_status, spi_irq_o);

    // 5. INT_EN mask: event on bit 2, but int_en masks it
    event_in = 8'h04; int_en = 8'hF8;
    @(posedge pclk); #1; event_in = 8'h00;
    if (int_status[2] === 1 && spi_irq_o === 0)
      $display("PASS  int_en mask: bit 2 pending but masked, irq=0");
    else
      $display("FAIL  int_en mask: int_status=%0h irq=%0b", int_status, spi_irq_o);

    // 6. Enable all — IRQ fires on pending bit 2
    int_en = 8'hFF; #1;
    if (spi_irq_o === 1)
      $display("PASS  enable masked bit: irq now fires");
    else
      $display("FAIL  enabling bit did not fire irq: %0b", spi_irq_o);

    $display("IRQ controller works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: int_status=0 irq=0',
        'PASS  global_en=1: irq fires',
        'PASS  W1C clear: bit 4 cleared, irq=0',
        'PASS  int_en mask: bit 2 pending but masked, irq=0',
        'IRQ controller works!',
      ],
    },
  ]
});
