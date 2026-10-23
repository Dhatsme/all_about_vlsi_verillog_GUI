// ─────────────────────────────────────────────────────────────────────────────
// VeeR EL2 Lab — course content (rendered by static/veer.html)
//
// Spec: docs/veerdesign.md   ·   Reference: the veer-dv-course skill
// Rules: `expected` strings come from real runs; never use mcycle values
// (they vary slightly between runs). CPU lessons may only use programs listed
// in CPU_TESTS in veer_lab.py.
// ─────────────────────────────────────────────────────────────────────────────
window.VEER_CHAPTERS = [
  {
    id: 'vf1',
    track: 'Foundation',
    title: 'vf1 — Lab tour and first run',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf1l1',
        title: 'L1 — Meet VeeR EL2',
        level: 'G1',
        tab: 'cpu',
        program: 'hello_world',
        rebuild: 'none',
        output_view: 'console',
        theory: `
<h2>A real CPU, running on our server</h2>
<p><strong>VeeR EL2</strong> is a 32-bit RISC-V processor core designed by Western Digital and now
maintained in the open by CHIPS Alliance. Companies put cores like this inside their chips to run
control software. Everything you see in this lab is its real design and its real test setup —
nothing is cut down for teaching.</p>
<p>The core is written in SystemVerilog. Our server has already turned that design into a
<strong>Verilator model</strong>: Verilator translates the hardware description into a C++ program
that behaves cycle by cycle like the chip would. Building that model takes a minute or two, so it
is done once, ahead of time.</p>
<h3>What happens when you press Run</h3>
<ul>
  <li>The server copies a compiled RISC-V program into the model's memory as <code>program.hex</code>.</li>
  <li>The model resets the core and lets it execute that program, one clock cycle at a time.</li>
  <li>When the program finishes, you see three things: what it printed, the simulator's log, and a
      trace of every instruction the core executed.</li>
</ul>
<pre class="code-block">program.hex  ──►  VeeR EL2 model (Verilator)  ──►  Program output
                                                ──►  Simulation log
                                                ──►  Instruction trace</pre>
<p>Your first program is <code>hello_world</code>. It prints a three-line banner and then tells the
testbench it succeeded.</p>
<p><strong>Ready?</strong> The program is already selected below. Press <strong>Run on VeeR</strong>
and look at the Program output.</p>`,
        tasks: [
          'Check that hello_world is selected in the program list',
          'Press ▶ Run on VeeR and wait for the green verdict',
          'In Program output, find the line "Hello World from VeeR EL2"',
          'Notice the [... ns] stamps: simulated time, not real time',
        ],
        hint:
`Program output shows only what the program printed:

  [830 ns] -------------------------
  [3030 ns] Hello World from VeeR EL2
  [5110 ns] -------------------------

The verdict next to the Run button should read TEST_PASSED.
If the Run button is greyed out, the simulator is still being
installed on the server — try again later.`,
        expected: ['Hello World from VeeR EL2', 'TEST_PASSED'],
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf1l2',
        title: 'L2 — How a program talks to the testbench',
        level: 'G1',
        tab: 'cpu',
        program: 'hello_world',
        rebuild: 'none',
        output_view: 'output',
        theory: `
<h2>No screen, no keyboard: a mailbox</h2>
<p>A simulated CPU has no screen. So how did <code>hello_world</code> print anything? It writes
each character, one byte at a time, to a single memory address called the <strong>mailbox</strong>.
The testbench — the code wrapped around the CPU — watches that address. Think of it as a letterbox:
the program drops notes in, and the testbench reads every note as it lands.</p>
<p>Here is the loop from <code>hello_world.s</code> that does the printing:</p>
<pre class="code-block">loop:
   lb   x5, 0(x4)      # load the next character of the string
   sb   x5, 0(x3)      # store it to the mailbox (x3 = 0xD0580000)
   addi x4, x4, 1      # move to the next character
   bnez x5, loop       # stop after the 0 byte at the end</pre>
<h3>What the testbench does with each byte</h3>
<table class="truth-table">
  <tr><th>Byte written to the mailbox</th><th>Testbench reaction</th></tr>
  <tr><td>0x06 – 0x7E (a printable character)</td><td>Prints it to the Program output</td></tr>
  <tr><td>0xFF</td><td>Prints <code>TEST_PASSED</code> and stops</td></tr>
  <tr><td>0x01</td><td>Prints <code>TEST_FAILED</code> and stops</td></tr>
  <tr><td>Nothing for 2,000,000 cycles</td><td>Prints <code>TEST_FAILED</code> (time-out)</td></tr>
</table>
<p>After the string, <code>hello_world</code> writes <code>0xFF</code>. If anything goes wrong, the CPU
jumps to a trap handler that writes <code>0x01</code> instead. That one byte is how every test in
this lab reports pass or fail.</p>
<p>The <strong>Simulation log</strong> shows the testbench's own messages, including the mailbox
address it is watching and two counters from inside the core: <code>minstret</code> (instructions
retired, meaning fully completed) and <code>mcycle</code> (clock cycles).</p>
<p><strong>Ready?</strong> Run <code>hello_world</code> again; the view switches to the Simulation log.</p>`,
        tasks: [
          'Press ▶ Run on VeeR (hello_world stays selected)',
          'In the Simulation log, find the line "mem_mailbox = D0580000"',
          'Find TEST_PASSED: that is the testbench reacting to the 0xFF byte',
          'Find the "Finished" line and note the minstret and mcycle values',
        ],
        hint:
`The Simulation log for hello_world contains (cycle count may differ a little):

  mem_mailbox         = D0580000
  ...
  [7290 ns] TEST_PASSED
  Finished : minstret = 330, mcycle = 726

minstret = 330 means the core completed 330 instructions.
mcycle   = 726 means that took about 726 clock cycles.`,
        expected: ['D0580000', 'TEST_PASSED', 'minstret = 330'],
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf1l3',
        title: 'L3 — Same program, different memory',
        level: 'G1',
        tab: 'cpu',
        program: 'hello_world_dccm',
        rebuild: 'none',
        output_view: 'output',
        theory: `
<h2>Where data lives changes how fast the CPU runs</h2>
<p>In <code>hello_world</code>, the text string sits in <strong>external memory</strong>: every
character is fetched over the system bus, which takes several cycles each time.</p>
<p>VeeR EL2 also has a <strong>DCCM</strong> — Data Closely Coupled Memory — a small memory wired
directly to the core. Reading from it is like taking a book from your own desk instead of walking
to the library. <code>hello_world_dccm</code> is the same program, but its string is loaded into the
DCCM before the core starts.</p>
<h3>What to compare</h3>
<table class="truth-table">
  <tr><th>Program</th><th>minstret (instructions)</th><th>mcycle (cycles)</th></tr>
  <tr><td>hello_world</td><td>330</td><td>about 726</td></tr>
  <tr><td>hello_world_dccm</td><td>?</td><td>?</td></tr>
</table>
<p>Before you run it, make a prediction: will the instruction count change? Will the cycle count?</p>
<p>The log will also show a line starting <code>DCCM pre-load</code>: that is the testbench copying the
string into the DCCM before reset.</p>
<p>This is the core idea behind performance work on real chips: the <em>same</em> instructions can
take very different amounts of time depending on where the data lives. In the next chapter you will
read the instruction trace line by line and see exactly where those cycles go.</p>
<p><strong>Ready?</strong> <code>hello_world_dccm</code> is selected. Run it and fill in the table.</p>`,
        tasks: [
          'Write down your prediction for minstret and mcycle',
          'Press ▶ Run on VeeR with hello_world_dccm selected',
          'Find the "DCCM pre-load" line in the Simulation log',
          'Compare minstret and mcycle with hello_world from the previous lesson',
          'Explain in one sentence why the cycle count dropped but the instruction count did not',
        ],
        hint:
`hello_world_dccm prints (cycle count may differ a little):

  [5 ns] DCCM pre-load from f0040000 to f0041050
  ...
  Finished : minstret = 330, mcycle = 414

Same 330 instructions — the program did not change.
About 40% fewer cycles — loads from the DCCM finish faster
than loads that travel over the bus to external memory.`,
        expected: ['DCCM pre-load', 'minstret = 330', 'TEST_PASSED'],
      },
    ],
  },
];
