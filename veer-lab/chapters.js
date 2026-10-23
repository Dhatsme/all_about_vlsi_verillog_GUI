// ─────────────────────────────────────────────────────────────────────────────
// VeeR EL2 Lab — course content (rendered by static/veer.html)
//
// Spec: docs/veerdesign.md   ·   Reference: the veer-dv-course skill
// Rules: `expected` strings come from real runs; never use mcycle values
// (they vary slightly between runs). CPU lessons may only use programs listed
// in CPU_TESTS in veer_lab.py.
// ─────────────────────────────────────────────────────────────────────────────
window.VEER_CHAPTERS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PART A — ORIENTATION   (spec: docs/veer_course_plan.md, section 5)
  // Theory lessons: no lab run; a check-your-understanding quiz completes them.
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'o1',
    track: 'Orientation',
    title: 'o1 — The big picture',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'o1l1',
        title: 'L1 — What is in this lab',
        level: 'G1',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>Picture a restaurant kitchen. Someone drew the <strong>blueprint</strong> of the kitchen. A crew
<strong>built</strong> it. Owners write <strong>recipes</strong> for the chef. And an inspector checks that the
food that comes out is right. This whole course uses that kitchen to explain a real processor.</p></div>
<h2>Four things make up a chip project</h2>
<table class="truth-table">
  <tr><th>Piece</th><th>Kitchen</th><th>In this lab</th></tr>
  <tr><td>Specification</td><td>The rules the kitchen must follow</td><td>RISC-V spec + the VeeR manual</td></tr>
  <tr><td>Design (RTL)</td><td>The blueprint</td><td>VeeR EL2, written in SystemVerilog</td></tr>
  <tr><td>Tests</td><td>Recipes that exercise the kitchen</td><td>Programs in C and assembly</td></tr>
  <tr><td>Testbench + tools</td><td>The inspector and the construction crew</td><td>SystemVerilog testbenches, Verilator, compilers</td></tr>
</table>
<p>The <strong>design</strong> describes hardware: wires, logic gates and flip-flops, written as code. You cannot
run a blueprint, so a tool called <strong>Verilator</strong> turns the design into a program that behaves
exactly like the chip, cycle by cycle — a <strong>simulation</strong>.</p>
<p>A <strong>test</strong> gives that simulated chip something to do. A <strong>testbench</strong> is the code
around the chip that feeds it, watches it, and decides whether it behaved correctly.</p>
<p>Everything here is real: VeeR EL2 is an open-source RISC-V processor core from Western Digital, now
maintained by CHIPS Alliance, used as the basis for real silicon.</p>
<p><strong>Ready?</strong> Read the table again, then answer the question below.</p>`,
        tasks: [
          'Match each of the four pieces to its kitchen equivalent',
          'Say in one sentence why a design must be simulated before it can be tested',
        ],
        hint:
`Specification  = the rules           (RISC-V spec, VeeR manual)
Design (RTL)   = the blueprint       (VeeR EL2 in SystemVerilog)
Tests          = the recipes         (C / assembly programs)
Testbench      = the inspector       (SystemVerilog code around the chip)
Tools          = construction crew   (Verilator, compilers)

A design is a description of hardware, not a program,
so a simulator must turn it into something that can run.`,
        quiz: {
          q: 'In the kitchen picture, what is the VeeR SystemVerilog RTL?',
          options: ['The recipe', 'The blueprint of the kitchen', 'The inspector', 'The chef’s logbook'],
          answer: 1,
          why: 'RTL describes how the hardware is built, like a blueprint. Recipes are the test programs; the inspector is the testbench.',
        },
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'o1l2',
        title: 'L2 — Where the design lives',
        level: 'G1',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>A big kitchen's blueprint is not one sheet. There is a sheet for order intake, one for the prep line,
one for the stoves, one for the storeroom — plus a list of every sheet the builders need.</p></div>
<h2>The VeeR design: ~30,550 lines of SystemVerilog</h2>
<p>The design lives in the <code>design/</code> folder of the
<a href="https://github.com/chipsalliance/Cores-VeeR-EL2/tree/main/design" target="_blank" rel="noopener">VeeR EL2 repository</a>.
Each folder is one part of the processor:</p>
<table class="truth-table">
  <tr><th>Folder</th><th>Job</th><th>Kitchen</th><th>Lines</th></tr>
  <tr><td><code>ifu</code></td><td>Instruction fetch: read the next instruction</td><td>Order intake</td><td>6,153</td></tr>
  <tr><td><code>dec</code></td><td>Decode, registers, traps and interrupts</td><td>The head chef reading tickets</td><td>6,106</td></tr>
  <tr><td><code>exu</code></td><td>Execute: ALU, multiply, divide</td><td>The stoves</td><td>3,512</td></tr>
  <tr><td><code>lsu</code></td><td>Load/store: read and write memory</td><td>Runners to the counter and storeroom</td><td>3,955</td></tr>
  <tr><td><code>lib</code>, <code>include</code></td><td>Shared building blocks: flip-flops, ECC</td><td>Standard equipment</td><td>3,750</td></tr>
  <tr><td><code>dbg</code>, <code>dmi</code></td><td>Debug access</td><td>The manager's office</td><td>1,247</td></tr>
  <tr><td>top level (<code>el2_veer.sv</code>, <code>el2_pmp.sv</code>, …)</td><td>Wiring the units together; memory protection</td><td>The floor plan</td><td>5,831</td></tr>
</table>
<p>The top of the design is the module <code>el2_veer_wrapper</code>, which connects the core to its memories.</p>
<h3>Which files are actually built?</h3>
<p>A plain text file, <code>testbench/flist</code>, lists every file the simulator compiles: <strong>51 design
files</strong> plus include folders and settings. It is the builders' list of blueprint sheets.</p>
<p>The design is written in <strong>SystemVerilog</strong>, the same language as the testbenches — but only the
part of it that describes real hardware (no delays, no printing).</p>
<p><strong>Ready?</strong> Open the design folder on GitHub (link above), look around, and answer below.</p>`,
        tasks: [
          'Open the VeeR design folder on GitHub and find the lsu folder',
          'Find el2_lsu_dccm_mem.sv inside lsu — you will verify it in chapter vf4',
          'Which folder holds the logic that decides what happens on a trap?',
        ],
        hint:
`lsu/el2_lsu_dccm_mem.sv is the DCCM (data memory) block.
Traps and interrupts are handled in dec/ (the trap unit is
dec/el2_dec_tlu_ctl.sv — you will read part of it in chapter o2).
testbench/flist lists the 51 design files the simulator builds.`,
        quiz: {
          q: 'A load instruction reads a value from memory. Which design folder handles that?',
          options: ['ifu', 'exu', 'lsu', 'dbg'],
          answer: 2,
          why: 'lsu is the load/store unit — the runners who carry ingredients between the counter, the storeroom and the stoves.',
        },
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'o1l3',
        title: 'L3 — How a C or assembly test reaches the chip',
        level: 'G1',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>The owner writes a recipe in plain language (C) or in shorthand (assembly). The chef only understands
their own code words, so a translator rewrites the recipe, and it is pinned to the board before the kitchen opens.</p></div>
<h2>Why the tests are programs</h2>
<p>A processor's job is to run software, so the most direct test of a processor is software. Two languages are used:</p>
<ul>
  <li><strong>Assembly</strong> (<code>hello_world.s</code>) when the test needs exact control of every instruction —
      for example placing an illegal instruction on purpose.</li>
  <li><strong>C</strong> (<code>irq.c</code>, Dhrystone) for longer programs that would be tedious to write instruction by instruction.</li>
</ul>
<h3>From source to simulated memory</h3>
<pre class="code-block">hello_world.s ── riscv64-unknown-elf-gcc ──► hello_world.exe  (machine code)
               ── objcopy -O verilog     ──► program.hex      (text: address + bytes)
               ── $readmemh in tb_top.sv  ──► the testbench's memory model</pre>
<p>The start of the real <code>program.hex</code>:</p>
<pre class="code-block">@80000000
73 10 20 B0 73 10 20 B8 97 00 00 00 ...</pre>
<p><code>@80000000</code> is the address. The testbench loads the file at time zero:</p>
<pre class="code-block">$readmemh("program.hex",  lmem.mem);   // data memory model
$readmemh("program.hex",  imem.mem);   // instruction memory model</pre>
<p>On reset, VeeR starts fetching at <strong>0x80000000</strong>. Its first instruction is the bytes
<code>73 10 20 B0</code>, which read backwards (RISC-V stores the lowest byte first) are <code>b0201073</code> —
exactly instruction #1 in the trace you will meet in vf2.</p>
<p><strong>Ready?</strong> Answer the question below.</p>`,
        tasks: [
          'Follow hello_world.s through gcc, objcopy and $readmemh to the memory model',
          'Explain why the bytes 73 10 20 B0 become the instruction b0201073',
        ],
        hint:
`gcc       turns source into RISC-V machine code (an .exe / ELF file)
objcopy   writes it as text: "@address" lines followed by bytes
$readmemh (SystemVerilog) reads that text into the memory arrays

Little-endian: the lowest byte is stored first.
Bytes 73 10 20 B0  ->  word 0xB0201073  ->  csrrw zero, minstret, zero`,
        quiz: {
          q: 'Which SystemVerilog task loads the compiled test into the simulated memory?',
          options: ['$display', '$readmemh', '$finish', '$fwrite'],
          answer: 1,
          why: '$readmemh ("read memory, hex") fills a memory array from a hex text file. tb_top.sv calls it for both memory models at time zero.',
        },
      },

      // ── L4 ──────────────────────────────────────────────────────────────────
      {
        id: 'o1l4',
        title: 'L4 — The tools behind the Run button',
        level: 'G1',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>The translator rewrites recipes. A construction crew turns the blueprint into a working kitchen.
A foreman with a checklist decides who does what, in which order.</p></div>
<h2>Four tools, one job each</h2>
<table class="truth-table">
  <tr><th>Tool</th><th>Kitchen</th><th>What it does here</th></tr>
  <tr><td>RISC-V GCC (<code>riscv64-unknown-elf-gcc</code>)</td><td>Translator</td><td>Compiles C/assembly tests to machine code</td></tr>
  <tr><td>Verilator 5.052</td><td>Construction crew</td><td>Turns the SystemVerilog design + testbench into C++</td></tr>
  <tr><td>g++</td><td>Crew's power tools</td><td>Compiles that C++ into one executable: the simulator</td></tr>
  <tr><td>make</td><td>Foreman</td><td>Runs the steps in the right order (<code>tools/Makefile</code>)</td></tr>
</table>
<h3>What Verilator really does</h3>
<pre class="code-block">51 design files + tb_top.sv ── verilator --cc ──► C++ model (obj_dir/)
C++ model + test_tb_top.cpp  ── g++         ──► obj_dir/Vtb_top  (the simulator)
./Vtb_top  reads program.hex, runs, writes the logs you see</pre>
<p><code>test_tb_top.cpp</code> is a small C++ <code>main()</code> that calls <code>tb-&gt;eval()</code> in a loop: every
call moves the simulated chip forward. Building <code>Vtb_top</code> takes about a minute, so this server builds it
<strong>once</strong>; each Run only loads a new <code>program.hex</code>.</p>
<h3>One honest detail</h3>
<p>This server has no RISC-V GCC installed. The VeeR repository ships the programs already compiled
(<code>testbench/hex/</code>), and the lab uses those. The source is still there to read: in the
<strong>Run the CPU</strong> tab, open the <strong>Program source</strong> view.</p>
<p><strong>Ready?</strong> Select <code>hello_world</code> in the lab below, open <strong>Program source</strong>, then answer the question.</p>`,
        tasks: [
          'In the Run the CPU tab, select hello_world and open the Program source view',
          'Find the loop that stores each character to STDOUT',
          'Say which tool turns SystemVerilog into C++, and which turns C++ into the simulator',
        ],
        hint:
`Verilator: SystemVerilog -> C++
g++:       C++ -> executable (obj_dir/Vtb_top)
make:      runs the steps
RISC-V GCC: compiles the test programs (prebuilt .hex here)

In hello_world.s the loop is:
  loop: lb x5, 0(x4); sb x5, 0(x3); addi x4, x4, 1; bnez x5, loop`,
        quiz: {
          q: 'Why does pressing Run on a new program take well under a second, when building the simulator takes about a minute?',
          options: [
            'Verilator rebuilds only the changed design files',
            'The simulator executable is built once; a run only loads a new program.hex',
            'The program runs on the server’s own CPU instead of the simulator',
            'Results are cached from earlier runs',
          ],
          answer: 1,
          why: 'The hardware (the kitchen) does not change between programs. Only the recipe changes, and loading a new program.hex costs almost nothing.',
        },
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'o2',
    track: 'Orientation',
    title: 'o2 — Specs: what the design must do',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'o2l1',
        title: 'L1 — Six kinds of specs',
        level: 'G1',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>Head office sets rules for every kitchen in the chain. This kitchen has its own operating manual. The
delivery company has rules for the loading dock. Each station has a job sheet, the shelves have labels, and the
inspector carries a checklist. Each document answers a different question.</p></div>
<h2>A spec answers one kind of question</h2>
<table class="truth-table">
  <tr><th>Spec</th><th>Kitchen</th><th>Example here</th><th>Answers</th></tr>
  <tr><td>ISA spec</td><td>Head-office rules</td><td>RISC-V specifications</td><td>What must every RISC-V core do? What does <code>mcause</code> = 2 mean?</td></tr>
  <tr><td>Micro-architecture spec</td><td>This kitchen's manual</td><td>VeeR EL2 Programmer's Reference Manual</td><td>How does <em>this</em> core do it? DCCM size, ECC, mailbox</td></tr>
  <tr><td>Interface / protocol spec</td><td>Loading-dock rules</td><td>AXI4, AHB-Lite</td><td>How does the core talk to memory over a bus?</td></tr>
  <tr><td>Block design spec</td><td>Station job sheet</td><td>Per-unit sections of the manual</td><td>What exactly must one module do?</td></tr>
  <tr><td>Register spec</td><td>Shelf labels</td><td>CSR maps</td><td>Which address, which bits, what meaning?</td></tr>
  <tr><td>Verification plan</td><td>Inspector's checklist</td><td>Testplan</td><td>What must be tested, and how do we know we are done?</td></tr>
</table>
<h3>Why the order matters</h3>
<p>Specs form layers. The ISA spec sometimes leaves a choice open; the micro-architecture spec makes the choice; the
RTL implements it; a test checks it. When a test fails, the first question is always <em>which spec says this is
wrong?</em> — not "what does the code do?"</p>
<p>From now on, many lessons follow one thread: <strong>the spec says → the RTL does → the test checks.</strong></p>
<p><strong>Ready?</strong> Answer the question below.</p>`,
        tasks: [
          'For each spec type, say which kitchen document it matches',
          'Pick one question you have about VeeR and decide which spec would answer it',
        ],
        hint:
`"What is mcause 2?"            -> ISA spec (RISC-V)
"How big is VeeR's DCCM?"       -> micro-architecture spec (VeeR manual)
"How does a bus read work?"     -> interface spec (AXI4 / AHB-Lite)
"Which bits of mdccmect count?" -> register spec
"Have we tested ECC enough?"    -> verification plan`,
        quiz: {
          q: 'You want to know how many bytes VeeR EL2’s data memory (DCCM) can be configured to. Which spec answers that?',
          options: ['The RISC-V ISA spec', 'The VeeR EL2 Programmer’s Reference Manual', 'The AXI4 protocol spec', 'The verification plan'],
          answer: 1,
          why: 'DCCM is a VeeR feature, not part of the RISC-V standard. The VeeR manual lists the sizes it can be built with (4 KB up to 512 KB).',
        },
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'o2l2',
        title: 'L2 — The ISA spec: trap causes',
        level: 'G2',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>Head office says: when a cook stops work, they must write the reason on the board using a standard code —
"2" for a recipe step nobody can read, "7" for the kitchen timer. Every kitchen in the chain uses the same codes.</p></div>
<h2>The spec says</h2>
<p>The RISC-V Privileged specification defines the <code>mcause</code> register: when a trap happens, the core writes
a code saying why. Excerpt of its table <em>(RISC-V Privileged Architecture, CC BY 4.0)</em>:</p>
<table class="truth-table">
  <tr><th>Interrupt</th><th>Code</th><th>Meaning</th></tr>
  <tr><td>0</td><td>1</td><td>Instruction access fault</td></tr>
  <tr><td>0</td><td>2</td><td>Illegal instruction</td></tr>
  <tr><td>0</td><td>5</td><td>Load access fault</td></tr>
  <tr><td>0</td><td>7</td><td>Store/AMO access fault</td></tr>
  <tr><td>1</td><td>3</td><td>Machine software interrupt</td></tr>
  <tr><td>1</td><td>7</td><td>Machine timer interrupt</td></tr>
  <tr><td>1</td><td>11</td><td>Machine external interrupt</td></tr>
</table>
<p>"Interrupt = 1" is bit 31 of <code>mcause</code>, so a timer interrupt reads <code>0x80000007</code>.</p>
<h2>The RTL does</h2>
<p>In VeeR's trap unit, <code>design/dec/el2_dec_tlu_ctl.sv</code>, line 1451, that table is written as logic:</p>
<pre class="code-block">assign exc_cause_r[4:0] = ( ({5{take_timer_int}}  &amp; 5'h07) |
                            ({5{take_soft_int}}   &amp; 5'h03) |
                            ({5{illegal_r}}       &amp; 5'h02) |
                            ({5{inst_acc_r}}      &amp; 5'h01) | ...</pre>
<p>Each line is "if this condition, use this code". <code>{5{illegal_r}}</code> copies one bit five times, so the
AND passes <code>5'h02</code> only when the instruction was illegal. This AND-OR style is how VeeR writes most logic.</p>
<h2>The test checks</h2>
<p>The <code>illegal_instruction</code> test (chapter vf3) loads <code>x4 = 2</code>, runs an illegal instruction,
and its trap handler fails the test unless <code>mcause</code> equals <code>x4</code>.</p>
<p><strong>Ready?</strong> Answer the question below.</p>`,
        tasks: [
          'Find code 2 in the spec table, in the RTL excerpt, and in the test description',
          'Work out the full 32-bit mcause value for a machine software interrupt',
        ],
        hint:
`Spec:  illegal instruction = code 2, interrupt bit 0
RTL:   ({5{illegal_r}} & 5'h02)
Test:  li x4, 0x2  ... handler: bne mcause, x4, fail

Machine software interrupt: interrupt bit 1, code 3
-> 0x80000000 | 3 = 0x80000003`,
        quiz: {
          q: 'A trap is reported with mcause = 0x80000007. What happened?',
          options: ['An illegal instruction', 'A store access fault', 'A machine timer interrupt', 'A load access fault'],
          answer: 2,
          why: 'Bit 31 set means interrupt; code 7 with the interrupt bit is the machine timer. Without bit 31, code 7 would be a store access fault.',
        },
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'o2l3',
        title: 'L3 — The VeeR manual: choices the ISA leaves open',
        level: 'G2',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>Head office says "kitchens may have an emergency alarm" but not what code to write when it rings. This kitchen's
own manual fills the gap: "alarm from the wall button: write 0".</p></div>
<h2>The ISA leaves it open; the manual decides</h2>
<p>The RISC-V spec does not fix the <code>mcause</code> value for a <strong>non-maskable interrupt (NMI)</strong> — it
leaves it to each implementation. The VeeR EL2 manual defines it (Programmer's Reference Manual, memory map chapter,
Apache-2.0):</p>
<table class="truth-table">
  <tr><th>mcause</th><th>VeeR NMI cause</th></tr>
  <tr><td>0x0000_0000</td><td>NMI pin assertion (<code>nmi_int</code> input)</td></tr>
  <tr><td>0xF000_0000</td><td>D-bus store error</td></tr>
  <tr><td>0xF000_0001</td><td>D-bus non-blocking load error</td></tr>
</table>
<p>The RTL implements the pin case at the end of the same assignment you saw in L2:</p>
<pre class="code-block">  ... | ({5{lsu_exc_acc_r &amp; lsu_exc_st_r}} &amp; 5'h07)
  ) &amp; ~{5{take_nmi}};      // an NMI forces the cause code to 0</pre>
<p>And the <code>irq</code> test (chapter vf3) checks it: the NMI traps with <code>mcause=0x0</code>.</p>
<h3>A second example: ECC</h3>
<p>The manual also specifies VeeR's memory protection: <em>"The design can use the (39, 32) code - 32 data bits and 7
parity bits"</em>, using a Hamming <strong>SECDED</strong> code (single-bit error correction, double-bit error detection).
The RTL: <code>rvecc_encode</code> produces exactly 7 check bits (<code>output [6:0] ecc_out</code>). The UVM
testbench in vf4 drives 39-bit words for the same reason.</p>
<p><strong>Ready?</strong> Answer the question below.</p>`,
        tasks: [
          'Explain why the NMI mcause value comes from the VeeR manual, not the RISC-V spec',
          'Find the number 39 in three places: the manual, the RTL, the UVM testbench',
        ],
        hint:
`NMI cause:  RISC-V leaves it implementation-defined
            -> VeeR manual: pin NMI = 0x0000_0000
            -> RTL: ... & ~{5{take_nmi}}  (forces 0)
            -> irq test sees mcause=0x0 for the NMI

ECC: manual (39,32) code = 32 data + 7 check bits
     RTL rvecc_encode: output [6:0] ecc_out
     UVM item: wdata is 39 bits (pt.DCCM_FDATA_WIDTH)`,
        quiz: {
          q: 'Another RISC-V core reports its pin NMI with a different mcause value than VeeR. Is that core breaking the RISC-V spec?',
          options: [
            'Yes — every RISC-V core must use 0 for NMIs',
            'No — the RISC-V spec leaves the NMI cause to each implementation',
            'Yes — NMIs must use 0xF000_0000',
            'No — RISC-V cores do not have NMIs',
          ],
          answer: 1,
          why: 'The ISA spec leaves the value open. Each core’s own manual defines it, which is why you check the micro-architecture spec, not only the ISA spec.',
        },
      },

      // ── L4 ──────────────────────────────────────────────────────────────────
      {
        id: 'o2l4',
        title: 'L4 — From spec to testplan',
        level: 'G2',
        tab: null,
        rebuild: 'none',
        theory: `
<div class="kitchen"><span class="kitchen-tag">The kitchen</span>
<p>The inspector does not taste food at random. They turn each rule in the manual into a checklist line: what to
check, how to check it, and what counts as a pass.</p></div>
<h2>A testplan turns requirements into checks</h2>
<p>A <strong>verification plan</strong> (testplan) lists every requirement from the specs and says how it will be
verified. Take one requirement from the VeeR manual:</p>
<p><em>"The count field of the mdccmect register is incremented, if a correctable ECC error is detected on either a
retired load/store instruction or a DMA read access to the DCCM."</em></p>
<p>As testplan rows:</p>
<table class="truth-table">
  <tr><th>ID</th><th>Requirement</th><th>Stimulus</th><th>Check</th><th>Test</th></tr>
  <tr><td>ECC-1</td><td>Single-bit DCCM error is corrected</td><td>Inject a 1-bit error on a write, then load</td><td>Loaded value equals the written value</td><td>ecc</td></tr>
  <tr><td>ECC-2</td><td>Correctable error is counted</td><td>Same as ECC-1</td><td><code>mdccmect</code> count is not 0</td><td>ecc</td></tr>
  <tr><td>ECC-3</td><td>Double-bit error is detected, not used</td><td>Inject a 2-bit error, then load</td><td>Trap with the expected <code>mcause</code></td><td>ecc</td></tr>
  <tr><td>ECC-4</td><td>Count also increments on a DMA read</td><td>Inject, then read by DMA</td><td><code>mdccmect</code> increments</td><td>— <em>(gap)</em></td></tr>
</table>
<p>The <code>ecc</code> test you will run in vf3 covers ECC-1 to ECC-3: it reads back the corrected value and fails
the test if <code>mdccmect</code> did not register the error. Nothing in this lab exercises ECC-4. Writing the plan
is how you <strong>find that gap</strong> — before a customer does.</p>
<p>In the next chapter you will open the design itself and follow one instruction through the core.</p>
<p><strong>Ready?</strong> Answer the question below.</p>`,
        tasks: [
          'Read the four testplan rows and match each to a phrase in the manual sentence',
          'Explain why ECC-4 is a gap, and what a test for it would need',
        ],
        hint:
`The manual sentence has two triggers:
  "a retired load/store instruction"  -> ECC-1, ECC-2 (covered by the ecc test)
  "or a DMA read access to the DCCM"   -> ECC-4 (no test drives DMA here)

A test for ECC-4 needs DMA traffic into the DCCM plus error injection,
then a check that mdccmect increased.`,
        quiz: {
          q: 'What is the main job of a verification plan?',
          options: [
            'To describe how the RTL is written',
            'To list each requirement and how it will be checked, so gaps become visible',
            'To store the test results',
            'To configure the simulator',
          ],
          answer: 1,
          why: 'A testplan maps every requirement to a stimulus and a check. Requirements with no test, like ECC-4, stand out immediately.',
        },
      },
    ],
  },

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

  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vf2',
    track: 'Foundation',
    title: 'vf2 — Reading an instruction trace',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf2l1',
        title: 'L1 — Trace anatomy',
        level: 'G1',
        tab: 'cpu',
        program: 'hello_world',
        rebuild: 'none',
        output_view: 'exec_log',
        theory: `
<h2>One line per finished instruction</h2>
<p>The <strong>Instruction trace</strong> (the file <code>exec.log</code>) is the most detailed record
the testbench keeps. Every time the core <strong>retires</strong> an instruction — finishes it and makes
its result permanent — the testbench writes one line. Verification engineers compare traces like this
against a reference model to catch the exact instruction where the hardware went wrong.</p>
<p>Here is line 9 of the <code>hello_world</code> trace:</p>
<pre class="code-block">        62 :       #9 0 80000020 d05801b7  gp=d0580000                ; lui     gp,0xd0580000</pre>
<h3>Column by column</h3>
<table class="truth-table">
  <tr><th>Field</th><th>In the example</th><th>Meaning</th></tr>
  <tr><td>Cycle</td><td>62</td><td>Clock cycle when the instruction retired</td></tr>
  <tr><td>#inst</td><td>#9</td><td>It is the 9th instruction to retire</td></tr>
  <tr><td>0</td><td>0</td><td>Hardware thread number; VeeR EL2 has one, so always 0</td></tr>
  <tr><td>pc</td><td>80000020</td><td>Address of the instruction in memory</td></tr>
  <tr><td>opcode</td><td>d05801b7</td><td>The instruction itself, as machine code</td></tr>
  <tr><td>reg=value</td><td>gp=d0580000</td><td>Register it wrote, and the new value</td></tr>
  <tr><td>csr=value</td><td>(empty here)</td><td>Control register it wrote, if any</td></tr>
  <tr><td>; mnemonic</td><td>lui gp,0xd0580000</td><td>The instruction in readable assembly; loads and stores add the memory address in [ ]</td></tr>
</table>
<h3>The odd lines: <code>nbL</code></h3>
<p>Some lines have no <code>#inst</code> and end in <code>; nbL</code>, for example
<code>t0=0000002d ; nbL</code>. VeeR EL2 does not freeze while a load is fetching data from slow memory:
the load retires first, and its data arrives a few cycles later as a <strong>non-blocking load</strong>
(nbL) write. <code>0x2d</code> is the ASCII code for <code>-</code>, the first character of the banner.</p>
<p><strong>Ready?</strong> Run <code>hello_world</code>; the view switches to the Instruction trace.</p>`,
        tasks: [
          'Press ▶ Run on VeeR; the Instruction trace opens',
          'Find instruction #9 and read each of its columns',
          'Find the first line ending in "; nbL" — which register gets which value?',
          'Look at the lb line directly above it: how many cycles until its data arrived?',
        ],
        hint:
`The start of the loop in the hello_world trace:

        73 :      #12 0 8000002c 00020283     ; lb      t0,0(tp) [80000130]
        75 :                    t0=0000002d   ; nbL
        78 :      #13 0 80000030 00518023     ; sb      t0,0(gp) [d0580000]

The lb retires at cycle 73 without a result.
Its data (0x2d = '-') arrives at cycle 75: 2 cycles later.
The sb at cycle 78 then stores that byte to the mailbox.`,
        expected: ['gp=d0580000', 'nbL', 'TEST_PASSED'],
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf2l2',
        title: 'L2 — Matching source to trace',
        level: 'G2',
        tab: 'cpu',
        program: 'hello_world',
        rebuild: 'none',
        output_view: 'exec_log',
        theory: `
<h2>From assembly source to retired instructions</h2>
<p>The trace is the ground truth of what the core did. Lining it up with the source code shows how the
program you wrote turns into the instructions the core actually runs — and they are not always one to one.</p>
<p>The start of <code>hello_world.s</code>:</p>
<pre class="code-block">csrw minstret, zero      # clear the instruction counter
csrw minstreth, zero
la   x1, _trap           # address of the trap handler
csrw mtvec, x1           # tell the core where to jump on an error
li   x1, 0x5f555555
csrw 0x7c0, x1           # enable caches
li   x3, STDOUT          # x3 = 0xd0580000, the mailbox
la   x4, hw_data         # x4 = address of the string
loop:
   lb   x5, 0(x4)
   sb   x5, 0(x3)
   addi x4, x4, 1
   bnez x5, loop</pre>
<h3>Three things that surprise people</h3>
<ul>
  <li><strong>Register names change.</strong> The trace uses ABI names: <code>x1</code>=<code>ra</code>,
      <code>x3</code>=<code>gp</code>, <code>x4</code>=<code>tp</code>, <code>x5</code>=<code>t0</code>.</li>
  <li><strong>One line of source can become two instructions.</strong> <code>la</code> and a large
      <code>li</code> are pseudo-instructions: the assembler expands them, for example into
      <code>auipc</code> + <code>addi</code> or <code>lui</code> + <code>addi</code>.</li>
  <li><strong>CSRs appear by number.</strong> <code>csrw minstret</code> shows as <code>csr_b02</code>,
      <code>mtvec</code> as <code>csr_305</code>, and <code>csrw</code> as <code>csrrw zero,...</code>.
      Some instructions are compressed to 16 bits: <code>addi x4,x4,1</code> retires as <code>c.addi tp,1</code>.</li>
</ul>
<p><strong>Ready?</strong> Run <code>hello_world</code> and match every source line above to its trace line(s).</p>`,
        tasks: [
          'Press ▶ Run on VeeR and stay on the Instruction trace',
          'Find the trace lines for "la x1, _trap": which two instructions, and which numbers (#)?',
          'Find "csrw mtvec, x1": which csr_ number does mtvec have?',
          'Find the first instruction of the loop: what is its pc?',
          'Count the cycles for one full loop iteration (lb to the next lb)',
        ],
        hint:
`Source                    Trace (#inst: mnemonic)
csrw minstret, zero    -> #1  csrrw zero,csr_b02,zero
csrw minstreth, zero   -> #2  csrrw zero,csr_b82,zero
la   x1, _trap         -> #3  auipc ra,0x0   + #4 addi ra,ra,280
csrw mtvec, x1         -> #5  csrrw zero,csr_305,ra
li   x1, 0x5f555555    -> #6  lui ra,...     + #7 addi ra,ra,1365
csrw 0x7c0, x1         -> #8  csrrw zero,csr_7c0,ra
li   x3, STDOUT        -> #9  lui gp,0xd0580000
la   x4, hw_data       -> #10 auipc tp,0x0   + #11 addi tp,tp,268
loop (pc 8000002c)     -> #12 lb, #13 sb, #14 c.addi, #15 bne

One iteration: lb at cycle 85, next lb at cycle 93 -> 8 cycles
(a few take 9). The first one takes 12 while caches warm up.`,
        expected: ['csr_305', '8000002c', 'c.addi', 'TEST_PASSED'],
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf2l3',
        title: 'L3 — Instructions per cycle',
        level: 'G2',
        tab: 'cpu',
        program: 'cmark_dccm',
        rebuild: 'none',
        output_view: 'output',
        theory: `
<h2>IPC: how busy is the core?</h2>
<p><strong>Instructions per cycle</strong> (IPC) is the number of instructions retired divided by the
number of clock cycles:</p>
<pre class="code-block">IPC = minstret / mcycle</pre>
<p>VeeR EL2 retires at most one instruction per cycle, so its best possible IPC is 1.0. Every cycle
below that is a cycle the core spent waiting — usually for memory.</p>
<h3>What you have measured so far</h3>
<table class="truth-table">
  <tr><th>Program</th><th>minstret</th><th>mcycle</th><th>IPC</th></tr>
  <tr><td>hello_world</td><td>330</td><td>726</td><td>0.45</td></tr>
  <tr><td>hello_world_dccm</td><td>330</td><td>414</td><td>0.80</td></tr>
  <tr><td>dhry (Dhrystone)</td><td>343,115</td><td>355,033</td><td>0.97</td></tr>
  <tr><td>cmark_dccm (CoreMark)</td><td>?</td><td>?</td><td>?</td></tr>
</table>
<h3>Why hello_world is so slow</h3>
<p>Remember the <code>nbL</code> lines: each <code>lb</code> from external memory delivers its byte
2 cycles late, and the very next instruction, <code>sb</code>, needs that byte. The core has nothing
else to do, so it waits. Run <code>hello_world_dccm</code> and look at its trace: the
<code>lb</code> lines carry <code>t0=...</code> directly, there are no <code>nbL</code> lines, and an
iteration takes about 5 cycles instead of about 9.</p>
<p>Benchmarks like Dhrystone and CoreMark do real computation with data mostly close to the core,
so they keep it busy almost every cycle.</p>
<p>In the next chapter you will stop looking at speed and start looking at <em>correctness</em>: what
the other test programs prove about the core.</p>
<p><strong>Ready?</strong> <code>cmark_dccm</code> is selected. Run it (about 5 seconds), then work out its IPC.</p>`,
        tasks: [
          'Predict: will CoreMark’s IPC be closer to hello_world or to dhry?',
          'Press ▶ Run on VeeR with cmark_dccm selected',
          'Find the Finished line and compute IPC = minstret / mcycle',
          'Optional: run hello_world_dccm and check its trace has no nbL lines',
        ],
        hint:
`cmark_dccm finishes with:

  Finished : minstret = 283001, mcycle = 299857

IPC = 283001 / 299857 = 0.94

Close to dhry (0.97): both are compute-heavy benchmarks with
their data in the DCCM, so the core rarely waits for memory.`,
        expected: ['minstret = 283001', 'TEST_PASSED'],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vf3',
    track: 'Foundation',
    title: 'vf3 — Tests as specifications',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf3l1',
        title: 'L1 — What a directed test proves',
        level: 'G2',
        tab: 'cpu',
        program: 'illegal_instruction',
        rebuild: 'none',
        output_view: 'exec_log',
        theory: `
<h2>A test is a promise written in code</h2>
<p>A <strong>directed test</strong> checks one specific behaviour the specification promises. Reading
one tells you exactly what the designers expected the hardware to do. The pattern is always the same:
<strong>state what should happen, make it happen, then compare</strong>.</p>
<p>The RISC-V specification promises that when the core meets an instruction it cannot decode, it must
stop, record the reason in the <code>mcause</code> register, and jump to a <strong>trap handler</strong>.
Here is the whole <code>illegal_instruction</code> test:</p>
<pre class="code-block">illegal_instruction:
    li x4, 0x2          # expected mcause: 2 = illegal instruction
    li x5, 0x0          # expected mscause (VeeR's extra detail): 0
    .word 0             # an all-zero instruction is illegal
    j fail_if_not_serviced   # 15 nops, then fail: the trap never came</pre>
<p>The shared trap handler reads <code>mcause</code> and <code>mscause</code>, compares them with
<code>x4</code> and <code>x5</code>, and writes <code>0x01</code> to the mailbox if either differs.
If both match, it returns, and the program writes <code>0xFF</code>.</p>
<h3>Trap causes you will meet in this chapter</h3>
<table class="truth-table">
  <tr><th>mcause</th><th>Meaning</th></tr>
  <tr><td>0x2</td><td>Illegal instruction</td></tr>
  <tr><td>0x1</td><td>Instruction access fault (fetching code from a forbidden place)</td></tr>
  <tr><td>0x5</td><td>Load access fault (reading data that cannot be read)</td></tr>
  <tr><td>0x80000007</td><td>Machine timer interrupt (top bit set = interrupt, not error)</td></tr>
  <tr><td>0x80000003</td><td>Machine software interrupt</td></tr>
  <tr><td>0x0</td><td>Non-maskable interrupt (NMI), on VeeR EL2</td></tr>
</table>
<p><strong>Ready?</strong> Run <code>illegal_instruction</code> and find the trap in the Instruction trace.</p>`,
        tasks: [
          'Press ▶ Run on VeeR (the trace opens; the whole test is only 33 instructions)',
          'Find the line where the illegal instruction retires (mnemonic ".short 0")',
          'Look at the pc of the next line: the core jumped to the trap handler',
          'Find "csrrs sp,csr_342,zero": csr_342 is mcause. What value did it read?',
          'Explain what would happen if the core ignored the bad instruction',
        ],
        hint:
`        87 :      #19 0 8000025a 00000000   ; .short  0      <- the illegal instruction
        94 :      #20 0 80000200 30401073   ; csrrw ...      <- trap handler (mtvec = 80000200)
        99 :      #22 0 80000208 34202173  sp=00000002  ; csrrs sp,csr_342,zero

mcause read back as 2 = illegal instruction, matching x4.
If the core ignored the instruction, it would run into
fail_if_not_serviced: 15 nops, then write 0x01 -> TEST_FAILED.`,
        expected: ['sp=00000002', 'minstret = 33', 'TEST_PASSED'],
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf3l2',
        title: 'L2 — Interrupts (irq)',
        level: 'G2',
        tab: 'cpu',
        program: 'irq',
        rebuild: 'none',
        output_view: 'console',
        theory: `
<h2>Interrupts: the outside world taps the core on the shoulder</h2>
<p>An <strong>interrupt</strong> is a signal from outside the program — a timer expiring, another core
asking for attention — that makes the core pause and run a handler. Unlike an error, it is expected
and normal. The core can choose to ignore most interrupts: the <code>MIE</code> bit in the
<code>mstatus</code> register is the master on/off switch.</p>
<p>One kind cannot be switched off: the <strong>NMI</strong> (non-maskable interrupt), used for
emergencies such as a hardware failure.</p>
<h3>What the specification promises</h3>
<table class="truth-table">
  <tr><th>Interrupt</th><th>MIE = 0</th><th>MIE = 1</th></tr>
  <tr><td>NMI</td><td>Taken</td><td>Taken</td></tr>
  <tr><td>Timer</td><td>Ignored</td><td>Taken</td></tr>
  <tr><td>Software</td><td>Ignored</td><td>Taken</td></tr>
</table>
<p>The <code>irq</code> test (written in C) fires all three interrupts twice — once with MIE=0, once with
MIE=1 — and asks the testbench to raise each interrupt line. Every trap it takes is recorded. At the end
it compares the recorded list with a <strong>golden list</strong> of the four traps the table predicts,
in order. Any extra, missing or out-of-order trap means <code>TEST_FAILED</code>.</p>
<p><strong>Ready?</strong> Run <code>irq</code>. Before you look, predict how many traps the test should take.</p>`,
        tasks: [
          'Predict the number of traps from the table above',
          'Press ▶ Run on VeeR and read the Program output',
          'Under "Machine mode, MIE=0", which interrupts caused a "trap!" line?',
          'Under "Machine mode, MIE=1", match each "trap!" mcause to the interrupt that caused it',
          'Find "traps taken" and compare it with your prediction',
        ],
        hint:
`Four traps, exactly as the table predicts:

  MIE=0:  NMI           -> mcause=0x0
          timer, soft   -> ignored (no trap line)
  MIE=1:  NMI           -> mcause=0x0
          timer         -> mcause=0x80000007
          soft          -> mcause=0x80000003

  traps taken: 4

The top bit (0x80000000) of mcause means "interrupt".`,
        expected: ['mcause=0x80000007', 'mcause=0x80000003', 'traps taken: 4', 'TEST_PASSED'],
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf3l3',
        title: 'L3 — Errors on purpose (ecc)',
        level: 'G2',
        tab: 'cpu',
        program: 'ecc',
        rebuild: 'none',
        output_view: 'console',
        theory: `
<h2>Breaking memory on purpose to prove it can heal</h2>
<p>Memory bits occasionally flip by themselves — a particle from space can do it. VeeR's DCCM (data
memory) and ICCM (instruction memory) store extra <strong>ECC</strong> (error-correcting code) bits next
to every word. With them the core can <strong>correct</strong> any single flipped bit and
<strong>detect</strong> two flipped bits, raising a trap instead of using bad data.</p>
<p>How do you test that, when real bit flips are rare? You cause them. The <code>ecc</code> program
asks the testbench to corrupt memory, using extra command bytes on the same mailbox you met in vf1:</p>
<table class="truth-table">
  <tr><th>Byte to mailbox</th><th>Testbench action</th></tr>
  <tr><td>0xE2</td><td>Flip 1 bit in the next DCCM write</td></tr>
  <tr><td>0xE3</td><td>Flip 2 bits in the next DCCM write</td></tr>
  <tr><td>0xE4</td><td>Stop injecting errors</td></tr>
</table>
<h3>The experiment</h3>
<ul>
  <li><strong>ECC checks off:</strong> write <code>0x12345678</code> with 1 bit flipped and
      <code>0xDEADBEEF</code> with 2 flipped. The program reads back the damaged values.</li>
  <li><strong>ECC checks on:</strong> the single-bit error reads back correct. The double-bit error
      raises a trap, and the handler confirms it was the expected kind.</li>
  <li>The program then reboots (a counter in DCCM survives the reboot) and repeats the idea for ICCM,
      by running code from a corrupted instruction memory. Third boot: <code>Finished</code>.</li>
</ul>
<p><strong>Ready?</strong> Run <code>ecc</code> and compare the values with ECC off and on.</p>`,
        tasks: [
          'Press ▶ Run on VeeR and read the Program output',
          'Boot 1, ECC off: which bit changed in 0x12345678? (the leading 0 is not printed)',
          'Boot 1, ECC on: what did the single-bit value read back as?',
          'Find "DCCM double bit error" and "ICCM double bit error": why is a trap the correct result here?',
          'Find "Boot count: 3" and "Finished"',
        ],
        hint:
`ECC off:  DCCM value: 0x2345678    <- 0x12345678 with bit 28 flipped
          DCCM value: 0x9eadbeee   <- 0xDEADBEEF with 2 bits flipped
ECC on:   DCCM value: 0x12345678   <- single-bit error corrected
          DCCM double bit error    <- detected, trap taken (mcause 5 or 7)

Boot 2 does the same for ICCM: executing corrupted code
traps with an instruction access fault -> "ICCM double bit error".

A trap is the correct result: using two-bit-damaged data
silently would be far worse than stopping.`,
        expected: ['DCCM value: 0x12345678', 'DCCM double bit error', 'ICCM double bit error', 'TEST_PASSED'],
      },

      // ── L4 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf3l4',
        title: 'L4 — Memory protection (pmp)',
        level: 'G2',
        tab: 'cpu',
        program: 'pmp',
        rebuild: 'none',
        output_view: 'console',
        theory: `
<h2>Fences inside memory</h2>
<p><strong>PMP</strong> (Physical Memory Protection) lets software draw regions in memory and say what is
allowed in each: <strong>R</strong>ead, <strong>W</strong>rite, e<strong>X</strong>ecute. A region
marked <code>R--</code> can be read but not changed; code cannot run from a region without
<code>X</code>. Access that breaks a rule must trap.</p>
<p>The <code>pmp</code> test walks through every combination of R, W and X for a test area, and for each
one checks writing, reading and executing:</p>
<table class="truth-table">
  <tr><th>Case</th><th>Permissions</th><th>What the test does</th></tr>
  <tr><td>00, 01, 03, 04, 05, 07</td><td>---, R--, RW-, --X, R-X, RWX</td><td>Tests W, R and X, expects pass</td></tr>
  <tr><td>02, 06</td><td>-W-, -WX</td><td>Skipped: write-without-read is reserved by the RISC-V spec</td></tr>
  <tr><td>08</td><td>Locked region</td><td>Executes from it and <em>expects</em> a trap (mcause 0x1)</td></tr>
</table>
<p>Two lessons hide in this output. First, a test can pass <em>because</em> a trap happened: case 08
is checking that forbidden code is stopped. Second, notice the test prints its own score
(<code>9/9 passed</code>) before the testbench prints <code>TEST_PASSED</code>. The program decides,
then reports through the mailbox — the same pattern as every test in this chapter.</p>
<p>In the next chapter you leave the CPU and open a different kind of test: a UVM testbench, where the
checking happens outside the core.</p>
<p><strong>Ready?</strong> Run <code>pmp</code> (about 5 seconds) and find each case's verdict.</p>`,
        tasks: [
          'Press ▶ Run on VeeR and read the Program output',
          'Pick case 01 (R--): what did the test try, and what passed?',
          'Find cases 02 and 06: what happens after "configuring PMP..."?',
          'Find case 08: which mcause did the trap report, and why does the test say pass?',
          'Find the final score line and "*** PASSED ***"',
        ],
        hint:
`Case 02 and 06 print only "configuring PMP..." and move on:
write-only permissions are reserved, so there is nothing to test.

Case 08:
  Trap! mcause=0x00000001 ...   <- instruction access fault
  pass                          <- the trap was the expected outcome

End of output:
  9/9 passed
  *** PASSED ***`,
        expected: ['9/9 passed', '*** PASSED ***', 'TEST_PASSED'],
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vf4',
    track: 'Foundation',
    title: 'vf4 — UVM tour',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf4l1',
        title: 'L1 — Stimulus: item and sequence',
        level: 'G2',
        tab: 'uvm',
        open_file: 'dccm_transaction_sequence_item.sv',
        rebuild: 'none',
        theory: `
<h2>A different kind of test</h2>
<p>In vf1–vf3 a program ran <em>inside</em> the CPU and checked itself. Now you switch to the way most
chips are verified: a <strong>UVM testbench</strong>, written in SystemVerilog, that drives one block
from the outside and checks it. The block here is VeeR's <strong>DCCM</strong> — the data memory you met
in vf1 — on its own, with no CPU around it: 8 memory banks storing 39-bit words (32 data bits + 7 ECC
check bits).</p>
<p>UVM splits the job into pieces with fixed roles. This lesson covers where stimulus comes from.</p>
<h3>The sequence item: one transaction</h3>
<p>A <strong>sequence item</strong> describes one operation on the block — here, one memory access:</p>
<pre class="code-block">rand bit [pt.DCCM_BITS-1:0]        addr;   // 16 bits, random
rand bit [pt.DCCM_FDATA_WIDTH-1:0] wdata;  // 39 bits, random
bit  [pt.DCCM_FDATA_WIDTH-1:0]     rdata;  // filled in by the driver
bit wr_en;  bit rd_en;                     // set by the sequence, not random</pre>
<p><code>rand</code> marks fields that <code>randomize()</code> fills in. The
<code>\`uvm_field_int</code> macros register fields with UVM so the item can print itself — that is the
table you will see in the log.</p>
<h3>The sequences: what to send, in what order</h3>
<pre class="code-block">// dccm_write_read_sequence: one random write, then read the same address
req.randomize();  req.wr_en = 1;  ...send...
                  req.wr_en = 0;  req.rd_en = 1;  ...send...
// dccm_memtest_sequence: repeat that loops times
repeat (loops) \`uvm_do(seq)</pre>
<p>The test sets <code>memtest.loops = 10</code> (in <code>dccm_memtest.sv</code>), so one run makes
10 writes and 10 reads.</p>
<p><strong>Ready?</strong> Read the item file opened below, then press <strong>Build &amp; run</strong>
without changing anything (no rebuild needed, a few seconds).</p>`,
        tasks: [
          'If you edited any testbench file before, press Reset all first',
          'Read dccm_transaction_sequence_item.sv: which fields are rand, which are not?',
          'Open dccm_memtest.sv and find the line that sets loops',
          'Press ▶ Build & run with no edits',
          'In the output, find the first "WR:" line and the item table printed after it',
          'Count the WR: and RD: lines — do they match loops?',
        ],
        hint:
`First write in the log:

  [dccm_driver] WR: 0x0000c776 <= 0x6376d99b27
  Name                           Type                            Size  Value
  dccm_transation_sequence_item  dccm_transaction_sequence_item  -     @201
    addr                         integral                        16    'hc776
    wr_en                        integral                        1     'h1
    wdata                        integral                        39    'h6376d99b27

10 loops -> 10 WR: lines and 10 RD: lines.
(The random values repeat run to run: the simulator uses a fixed seed.)`,
        expected: ['WR: 0x', 'dccm_transaction_sequence_item', 'DCCM TEST PASSED'],
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf4l2',
        title: 'L2 — Drive and observe: driver and monitor',
        level: 'G2',
        tab: 'uvm',
        open_file: 'dccm_driver.sv',
        rebuild: 'none',
        theory: `
<h2>From transactions to wires, and back</h2>
<p>Sequences speak in transactions; the memory has wires. Two components translate.</p>
<h3>The driver: transaction → pins</h3>
<p>The <strong>driver</strong> asks the sequencer for the next item, wiggles the interface signals, and
reports back that it is done:</p>
<pre class="code-block">forever begin
  seq_item_port.get_next_item(req);   // wait for the next transaction
  drive();                            // set addr, wr_en/rd_en, wdata on the pins
  seq_item_port.item_done();          // tell the sequence it may send another
end</pre>
<p>For a read, <code>drive()</code> raises <code>rd_en</code> for one clock, waits one more clock,
then samples <code>rdata</code> and prints <code>RD:</code>.</p>
<h3>The monitor: pins → transaction</h3>
<p>The <strong>monitor</strong> (<code>dccm_monitor.sv</code>) never drives anything. It watches the same
pins, rebuilds a transaction from what it sees, and broadcasts it through an <strong>analysis
port</strong> to anyone listening — here, the scoreboard. Keeping driving and watching separate is
deliberate: the monitor reports what really happened on the wires, not what the driver intended.</p>
<h3>The raw pins</h3>
<p><code>tbench_top.sv</code> also prints the interface every clock, as lines like
<code>a:0000c776 w:1 wd:6376d99b27 r:0 rd:00000000</code> (address, write enable, write data, read
enable, read data). That is the closest thing to a waveform in this log.</p>
<p><strong>Ready?</strong> Read the driver opened below, then press <strong>Build &amp; run</strong> with no edits.</p>`,
        tasks: [
          'If you edited any testbench file before, press Reset all first',
          'In dccm_driver.sv, find get_next_item, drive() and item_done',
          'Open dccm_monitor.sv: which line sends the transaction to the scoreboard?',
          'Press ▶ Build & run with no edits',
          'Find the first RD: line. Which value did the read return? Keep that in mind for vf6',
          'Find a pin line (a:... w:... r:...) where w:1, and one where r:1',
        ],
        hint:
`Monitor -> scoreboard:
  transaction_analisys_port.write(transaction);
  (the misspelling is in the original source)

First read in the log:
  [dccm_driver] RD: 0x0000c776 => 0x00000000

The driver wrote 0x6376d99b27 to address c776, and the read
returned 0. A memory should return what was written. Note it:
vf6 asks why the test still says PASSED.`,
        expected: ['RD: 0x', 'a:0000c776', 'DCCM TEST PASSED'],
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf4l3',
        title: 'L3 — Checking: scoreboard and test',
        level: 'G2',
        tab: 'uvm',
        open_file: 'dccm_base_test.sv',
        rebuild: 'none',
        theory: `
<h2>Who decides pass or fail?</h2>
<p>The <strong>scoreboard</strong> receives every transaction from the monitor and checks it. This one
keeps a model of memory: on a write it remembers the data; on a read it compares the data the
memory returned with what it remembered, and reports <code>uvm_error</code> on a mismatch.</p>
<p>The <strong>test</strong> builds everything and connects it. <code>dccm_base_test.sv</code> does three
jobs, one per UVM <strong>phase</strong>:</p>
<table class="truth-table">
  <tr><th>Phase</th><th>What the base test does</th></tr>
  <tr><td>build_phase</td><td>Creates the agent (driver + monitor + sequencer) and the scoreboard</td></tr>
  <tr><td>connect_phase</td><td>Connects the monitor's analysis port to the scoreboard</td></tr>
  <tr><td>report_phase</td><td>Counts UVM_ERROR + UVM_FATAL; prints PASSED if zero, else FAILED</td></tr>
</table>
<p><code>mem_wr_rd_test</code> (in <code>dccm_memtest.sv</code>) extends it: it sets
<code>loops = 10</code>, then in <code>run_phase</code> raises an <strong>objection</strong> (keeps the
simulation alive), starts the sequence, and drops the objection when it is done.</p>
<p>Notice what that pass rule means: <strong>the test passes if nothing reported an error</strong>. It does
not check that anything was actually checked. Keep that in mind.</p>
<p><strong>Ready?</strong> Read the base test opened below, then press <strong>Build &amp; run</strong> with no edits.</p>`,
        tasks: [
          'If you edited any testbench file before, press Reset all first',
          'In dccm_base_test.sv, find build_phase, connect_phase and report_phase',
          'Find the exact rule that decides "DCCM TEST PASSED"',
          'Open dccm_memtest.sv: where is the objection raised and dropped?',
          'Press ▶ Build & run with no edits and find "DCCM TEST PASSED"',
        ],
        hint:
`report_phase in dccm_base_test.sv:

  errors = svr.get_severity_count(UVM_FATAL)
         + svr.get_severity_count(UVM_ERROR);
  if (errors > 0)  -> "DCCM TEST FAILED!!"
  else             -> "DCCM TEST PASSED!!"

The test passes when nothing reported an error.`,
        expected: ['[mem_wr_rd_test] DCCM TEST PASSED', 'Report counts by severity'],
      },

      // ── L4 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf4l4',
        title: 'L4 — The report summary',
        level: 'G2',
        tab: 'uvm',
        open_file: 'dccm_scoreboard.sv',
        rebuild: 'none',
        theory: `
<h2>Reading the scoreboard of the scoreboard</h2>
<p>Every UVM run ends with a <strong>report summary</strong>: how many messages of each severity, and how
many from each source (the ID in square brackets). Engineers read it first, before any detail.</p>
<pre class="code-block">** Report counts by severity
UVM_INFO :  105
UVM_WARNING :   23
UVM_ERROR :    0
UVM_FATAL :    0
** Report counts by id
[UVM/COMP/NAME]    23
[dccm_driver]    20
[dccm_scoreboard]    80</pre>
<h3>What each number tells you</h3>
<ul>
  <li><strong>23 warnings, all <code>[UVM/COMP/NAME]</code>.</strong> UVM checks component names with a
      pattern matcher that needs DPI (C code linked into the simulation). This build runs without DPI,
      so UVM warns about every component name. They are known and harmless here — but you only know
      that because you read them. Never ignore warnings unread.</li>
  <li><strong><code>[dccm_driver] 20</code></strong>: 10 <code>WR:</code> + 10 <code>RD:</code> lines.</li>
  <li><strong><code>[dccm_scoreboard] 80</code></strong>: the scoreboard prints 4 lines per transaction it
      handles. 20 transactions × 4 = 80.</li>
</ul>
<p>Here is the question that opens the last two chapters: of those 20 transactions the scoreboard
handled, how many were <em>reads</em> that it compared? Open <code>dccm_scoreboard.sv</code> (below)
and find what it prints for a write and for a read.</p>
<p>In the next chapter you will change the stimulus yourself and predict how these numbers move.</p>
<p><strong>Ready?</strong> Press <strong>Build &amp; run</strong> with no edits and read the summary at the end of the output.</p>`,
        tasks: [
          'If you edited any testbench file before, press Reset all first',
          'Press ▶ Build & run with no edits and scroll to "UVM Report Summary"',
          'Check that all 23 warnings have the same ID',
          'Explain where 20 (driver) and 80 (scoreboard) come from',
          'In dccm_scoreboard.sv, find what is printed for a write and for a read — then search the output for "READ DATA"',
        ],
        hint:
`For a write, the scoreboard prints:   ------ :: WRITE DATA :: ------
For a read, it prints:                ------ :: READ DATA Match :: ------
                                  or  ------ :: READ DATA Mismatch :: ------

Search the output for "READ DATA": it does not appear at all.
All 80 scoreboard lines are WRITE DATA blocks — 20 of them,
although only 10 writes happened. vf6 is about why.`,
        expected: ['UVM_WARNING :   23', 'UVM_ERROR :    0', 'UVM_FATAL :    0', '[dccm_scoreboard]    80'],
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vf5',
    track: 'Foundation',
    title: 'vf5 — Changing stimulus',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf5l1',
        title: 'L1 — Predict, edit, check',
        level: 'G3',
        tab: 'uvm',
        open_file: 'dccm_memtest.sv',
        rebuild: 'fast',
        theory: `
<h2>The habit that separates engineers from button-pressers</h2>
<p>From here on, every change follows the same loop: <strong>predict</strong> what the run will show,
<strong>edit</strong>, <strong>run</strong>, then <strong>compare</strong> with your prediction. When the
result surprises you, you have learned something about the testbench — or found a bug in it.</p>
<p>Your first edit is one number. In <code>dccm_memtest.sv</code> the test sets how many write-then-read
pairs the sequence makes:</p>
<pre class="code-block">memtest.loops = 10;</pre>
<h3>What you know from vf4 (loops = 10)</h3>
<table class="truth-table">
  <tr><th>Quantity</th><th>loops = 10</th><th>loops = 3 (your prediction)</th></tr>
  <tr><td>WR: lines / RD: lines</td><td>10 / 10</td><td>?</td></tr>
  <tr><td>[dccm_driver] count</td><td>20</td><td>?</td></tr>
  <tr><td>[dccm_scoreboard] count</td><td>80</td><td>?</td></tr>
  <tr><td>Simulation ends at (<code>$finish at</code>)</td><td>495 ns</td><td>?</td></tr>
</table>
<p>A hint for the last row: the clock period is 10 ns, and each write-then-read pair takes 5 clocks.
Reset is released at 5 ns.</p>
<p>Changing a number inside an existing function is a <strong>fast</strong> edit: the server recompiles
only that file, which takes about 30–50 seconds.</p>
<p><strong>Ready?</strong> Fill in your predictions, change <code>10</code> to <code>3</code> in the file
below, and press <strong>Build &amp; run</strong>.</p>`,
        tasks: [
          'If you edited any testbench file before, press Reset all first',
          'Write your predictions for all four rows of the table',
          'In dccm_memtest.sv, change memtest.loops = 10; to memtest.loops = 3;',
          'Press ▶ Build & run and wait for the rebuild (about 30–50 s)',
          'Compare every number in the report summary and the $finish line with your predictions',
          'Leave the edit in place for now; the next lesson starts with Reset all',
        ],
        hint:
`loops = 3:

  WR: lines 3, RD: lines 3
  [dccm_driver]     6      (3 + 3)
  [dccm_scoreboard]    24  (6 transactions x 4 lines)
  $finish at 145ns         (3 pairs x 50 ns - 5 ns)

Everything scales with loops, except the 23 name warnings:
those come from building the components, not from traffic.`,
        expected: ['[dccm_driver]     6', '[dccm_scoreboard]    24', 'DCCM TEST PASSED'],
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf5l2',
        title: 'L2 — Verbosity and what you can see',
        level: 'G3',
        tab: 'uvm',
        open_file: 'dccm_driver.sv',
        rebuild: 'fast',
        theory: `
<h2>Every message has a volume level</h2>
<p>Each <code>uvm_info</code> message carries a <strong>verbosity</strong>: how important it is.
The simulation also has a verbosity threshold; messages above it are thrown away before they are printed.</p>
<table class="truth-table">
  <tr><th>Verbosity</th><th>Printed at the default threshold (UVM_MEDIUM)?</th></tr>
  <tr><td>UVM_NONE</td><td>Always</td></tr>
  <tr><td>UVM_LOW</td><td>Yes</td></tr>
  <tr><td>UVM_MEDIUM</td><td>Yes</td></tr>
  <tr><td>UVM_HIGH</td><td>No</td></tr>
  <tr><td>UVM_FULL, UVM_DEBUG</td><td>No</td></tr>
</table>
<p>The driver prints its <code>WR:</code> and <code>RD:</code> lines at <code>UVM_LOW</code>:</p>
<pre class="code-block">\`uvm_info(get_type_name(), $sformatf("WR: 0x%08X &lt;= 0x%08X", req.addr, req.wdata), UVM_LOW)</pre>
<p>Real projects print thousands of messages per test, so engineers choose levels carefully: summaries at
LOW, per-transaction detail at HIGH, and raise the threshold only when debugging (with a run-time switch,
<code>+UVM_VERBOSITY=UVM_HIGH</code>; this lab runs at the default).</p>
<h3>Predict first</h3>
<p>If both driver messages move to <code>UVM_HIGH</code>: will the test still pass? What happens to the
<code>[dccm_driver]</code> line in the summary, and to the <code>UVM_INFO</code> total (105 with loops = 10)?</p>
<p><strong>Ready?</strong> Press <strong>Reset all</strong>, change both <code>UVM_LOW</code> in the driver
to <code>UVM_HIGH</code>, and press <strong>Build &amp; run</strong>.</p>`,
        tasks: [
          'Press Reset all (loops goes back to 10)',
          'Write your predictions: pass or fail? [dccm_driver] count? UVM_INFO total?',
          'In dccm_driver.sv, change UVM_LOW to UVM_HIGH on the WR: line and on the RD: line',
          'Press ▶ Build & run (about 30 s)',
          'Search the output for "WR:" and check the summary counts',
          'Why is hiding a message different from removing a check?',
        ],
        hint:
`With both driver messages at UVM_HIGH:

  No WR: or RD: lines appear.
  [dccm_driver] is gone from "Report counts by id".
  UVM_INFO :   85     (105 - 20 hidden driver messages)
  DCCM TEST PASSED    (the driver still drives every transaction)

Verbosity only filters printing. The stimulus and the checks
are unchanged, so the result is the same.`,
        expected: ['UVM_INFO :   85', 'DCCM TEST PASSED'],
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf5l3',
        title: 'L3 — Breaking it on purpose',
        level: 'G3',
        tab: 'uvm',
        open_file: 'dccm_memtest.sv',
        rebuild: 'fast',
        theory: `
<h2>Reading compiler errors without panic</h2>
<p>Every engineer breaks the build many times a day. The skill is reading the error message quickly
and correctly. Verilator reports errors in this shape:</p>
<pre class="code-block">%Error: hdl/dccm_memtest.sv:20:3: syntax error, unexpected endfunction, expecting ';'
        ^ file           ^ line:column  ^ what it found      ^ what it wanted</pre>
<h3>The trap: the line number</h3>
<p>The compiler reports where it <em>noticed</em> the problem, which is often the line after the
mistake. A missing semicolon on line 19 is only discovered when line 20 starts with something that
cannot follow it. One mistake can also cause a second, follow-on error. Fix the <strong>first</strong>
error, then run again.</p>
<p>A syntax error is caught before any C++ is compiled, so the server answers in under a second: no
rebuild, no simulation, <code>build failed</code>.</p>
<h3>Predict first</h3>
<p>If you delete the semicolon at the end of <code>memtest.loops = 10;</code> (line 19), which line number
will the error report?</p>
<p>In the last chapter of this track you will stop editing and start questioning the results themselves.</p>
<p><strong>Ready?</strong> Press <strong>Reset all</strong>, delete that one semicolon, and press
<strong>Build &amp; run</strong>.</p>`,
        tasks: [
          'Press Reset all',
          'Predict the line number the error will report',
          'In dccm_memtest.sv, delete the ; at the end of memtest.loops = 10',
          'Press ▶ Build & run and read the first %Error line: file, line, column, found, expected',
          'Put the semicolon back, run again, and confirm UVM PASS',
          'Press Reset all to leave the testbench clean for the next chapter',
        ],
        hint:
`%Error: hdl/dccm_memtest.sv:20:3: syntax error, unexpected endfunction, expecting ';'
%Error: hdl/dccm_memtest.sv:28:3: syntax error, unexpected endtask, expecting endfunction
%Error: Exiting due to 2 error(s)

The mistake is on line 19; the compiler noticed it at line 20,
where "endfunction" appeared instead of ";".
The second error is a follow-on: fixing the first removes both.`,
        expected: ["expecting ';'", 'Exiting due to'],
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vf6',
    track: 'Foundation',
    title: 'vf6 — Reading results critically',
    lessons: [
      // ── L1 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf6l1',
        title: 'L1 — Count the checks',
        level: 'G3',
        tab: 'uvm',
        open_file: 'dccm_scoreboard.sv',
        rebuild: 'none',
        theory: `
<h2>A green result is a claim. Check it.</h2>
<p>Since vf4 you have seen <code>DCCM TEST PASSED</code> with zero errors. Before trusting any pass,
an experienced verification engineer asks one question: <strong>what did this test actually check?</strong></p>
<p>The scoreboard prints a different block for each kind of transaction:</p>
<table class="truth-table">
  <tr><th>Transaction</th><th>Scoreboard prints</th><th>Is anything compared?</th></tr>
  <tr><td>Write</td><td><code>------ :: WRITE DATA :: ------</code></td><td>No — it only remembers the data</td></tr>
  <tr><td>Read, data matches</td><td><code>------ :: READ DATA Match :: ------</code></td><td>Yes</td></tr>
  <tr><td>Read, data differs</td><td><code>------ :: READ DATA Mismatch :: ------</code> (as UVM_ERROR)</td><td>Yes</td></tr>
</table>
<p>So the number of real checks equals the number of <code>READ DATA</code> blocks.</p>
<h3>Predict first</h3>
<p>The driver makes 10 writes and 10 reads. How many <code>WRITE DATA</code> blocks and how many
<code>READ DATA</code> blocks do you expect?</p>
<p><strong>Ready?</strong> Make sure the testbench is unchanged (Reset all), press <strong>Build &amp; run</strong>,
and count — use your browser's find (Ctrl+F / Cmd+F) on the output.</p>`,
        tasks: [
          'Press Reset all so the testbench is the original',
          'Write your prediction: how many WRITE DATA and READ DATA blocks?',
          'Press ▶ Build & run',
          'Count "WRITE DATA" and "READ DATA" in the output',
          'Compare with the 10 WR: and 10 RD: lines from the driver',
        ],
        hint:
`Unchanged run:
  WRITE DATA blocks: 20
  READ DATA blocks:   0

10 writes happened, but the scoreboard saw 20 "writes".
Every read was handled as a write, so nothing was compared.
The test reports 0 errors because it never checked anything.`,
        expected: ['WRITE DATA', '[dccm_scoreboard]    80', 'DCCM TEST PASSED'],
      },

      // ── L2 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf6l2',
        title: 'L2 — A pass that proves nothing',
        level: 'G3',
        tab: 'uvm',
        open_file: 'dccm_monitor.sv',
        rebuild: 'none',
        theory: `
<h2>Following the evidence</h2>
<p>Line up the driver and the scoreboard at the same simulated time:</p>
<pre class="code-block">@ 45000: [dccm_driver]     RD: 0x0000c776 => 0x00000000
@ 45000: [dccm_scoreboard] ------ :: WRITE DATA       :: ------
@ 45000: [dccm_scoreboard] Addr: c776</pre>
<p>The driver did a <em>read</em>; at the same moment the scoreboard recorded a <em>write</em> to the same
address. The scoreboard only knows what the monitor tells it, so the monitor is the suspect.</p>
<h3>Two problems in the monitor</h3>
<ul>
  <li><strong>One object, reused.</strong> The transaction is created once, in <code>new()</code>, and the
      same object is filled in and sent for every bus operation. The scoreboard keeps a queue of
      transactions — but every entry in it is the same object, overwritten again and again.</li>
  <li><strong><code>wr_en</code> is set but never cleared.</strong> On a write, the monitor sets
      <code>transaction.wr_en = 1</code>. On a read, it sets <code>rd_en</code> but never puts
      <code>wr_en</code> back to 0. From the first write on, every transaction says "write".</li>
</ul>
<p>The scoreboard checks <code>if (mem_pkt.wr_en)</code> first, so every read lands in the write branch.</p>
<h3>And the second warning sign</h3>
<p>Every <code>RD:</code> line returns <code>0x00000000</code>, although each address was written with
random data shortly before. A working memory returns what was written. Nothing flagged it, because no
read was ever compared.</p>
<p>Remember the pass rule from vf4: <em>pass = no errors reported</em>. A checker that never checks
reports no errors. This is one of the most common ways real verification goes wrong.</p>
<p><strong>Ready?</strong> Read <code>dccm_monitor.sv</code> below, find both problems, then run the
unchanged testbench and confirm the <code>RD:</code> values.</p>`,
        tasks: [
          'In dccm_monitor.sv, find where the transaction object is created — how many times does that happen?',
          'Find the line that sets transaction.wr_en. Is there any line that clears it?',
          'In dccm_scoreboard.sv, find the if (mem_pkt.wr_en) check — why does a read land there?',
          'Press ▶ Build & run with no edits and check the value every RD: line returns',
          'Write one sentence: why did this test pass?',
        ],
        hint:
`dccm_monitor.sv:
  line 14: transaction = new();               <- in new(): created once
  line 34: transaction.wr_en = memory_vif.wr_en;  <- set to 1 on a write
           (nothing ever sets wr_en back to 0)

Every RD: line: => 0x00000000

The test passed because the scoreboard never compared a read,
so it never reported an error — and "no errors" is the pass rule.`,
        expected: ['RD: 0x0000c776 => 0x00000000', 'DCCM TEST PASSED'],
      },

      // ── L3 ──────────────────────────────────────────────────────────────────
      {
        id: 'vf6l3',
        title: 'L3 — What a real fix needs',
        level: 'G3',
        tab: 'uvm',
        open_file: 'dccm_scoreboard.sv',
        rebuild: 'none',
        theory: `
<h2>Fixing a checker means expecting to fail</h2>
<p>Suppose you repair the monitor: a new transaction for every bus operation, with <code>wr_en</code>
taken from the bus each time. What happens? We tried it on this server:</p>
<table class="truth-table">
  <tr><th>Run</th><th>READ DATA checks</th><th>UVM_ERROR</th><th>Result</th></tr>
  <tr><td>Original monitor</td><td>0</td><td>0</td><td>PASSED</td></tr>
  <tr><td>Fixed monitor</td><td>10 — all <code>Mismatch</code></td><td>40</td><td>FAILED</td></tr>
</table>
<p>The "better" testbench fails. That is the correct outcome: the checks now run, and they expose that
every read returns 0. A fix to a checker should make you <em>expect</em> new failures; if it changes
nothing, be suspicious.</p>
<h3>What is still wrong after that</h3>
<ul>
  <li><strong>The scoreboard model.</strong> It remembers only the <em>last</em> value written
      (<code>sc_mem</code> is one variable), not one value per address. Any test that writes two addresses
      before reading would compare against the wrong data.</li>
  <li><strong>Reads return 0.</strong> Either the memory, its wiring in <code>tbench_top.sv</code>, or the
      driver's timing for sampling <code>rdata</code> is wrong. Finding which is a real debugging job.</li>
</ul>
<h3>A habit to keep</h3>
<p>To test a testbench, break the design on purpose and check that the test notices. If a deliberately
broken design still passes, the testbench is broken. Here, the design was broken all along (reads return
0) — and the test still passed.</p>
<p>Fixing the monitor, the scoreboard and the read bug is the work of the <strong>Professional track</strong>.
Be ready for slower runs there: a fix that creates a new UVM object rebuilds much of the UVM library and
takes several minutes.</p>
<p><strong>You have finished the Foundation track.</strong> Run the unchanged testbench one last time and read
the scoreboard below with fresh eyes.</p>`,
        tasks: [
          'Press Reset all and ▶ Build & run once more',
          'In dccm_scoreboard.sv, find sc_mem: why can one variable not model a whole memory?',
          'List the three problems this testbench hides (monitor, scoreboard model, reads return 0)',
          'Describe how you would test a testbench: what would you break on purpose?',
        ],
        hint:
`The three hidden problems:
  1. Monitor reuses one object and never clears wr_en
     -> every read is reported as a write, nothing is compared.
  2. Scoreboard keeps one value (sc_mem), not one per address
     -> wrong expectations once two addresses are in flight.
  3. Reads return 0 -> the design path or the driver timing is wrong.

With problem 1 fixed: 10 READ DATA Mismatch, 40 UVM_ERROR,
DCCM TEST FAILED. That failure is progress.`,
        expected: ['UVM_ERROR :    0', 'DCCM TEST PASSED'],
      },
    ],
  },
];
