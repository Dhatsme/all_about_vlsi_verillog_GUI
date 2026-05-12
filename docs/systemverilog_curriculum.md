# SystemVerilog — Complete Coding-Focused Curriculum
## Goal: Coding Expertise from Zero to Professional

> **Philosophy:** Theory in one paragraph, then code immediately. Every chapter has
> runnable SystemVerilog. Every part ends with a complete build project.

---

## Structure Overview

| Part | Focus | Level | Chapters | Build Project |
|------|-------|-------|----------|---------------|
| Part 1 | Language Foundations | Beginner | 1–8 | 8-bit ALU |
| Part 2 | RTL Design | Intermediate | 9–18 | SPI Master Controller |
| Part 3 | Verification Fundamentals | Intermediate | 19–24 | Layered TB for UART |
| Part 4 | Object-Oriented Verification | Advanced | 25–31 | Class-Based AXI-Lite Scoreboard |
| Part 5 | UVM — Universal Verification Methodology | Advanced | 32–43 | Full UVM Env for DMA Controller |
| Part 6 | Specialized & Expert Topics | Expert | 44–50 | Open-ended Capstone |

**Total: 50 Chapters + 6 Build Projects**

---

## PART 1 — Language Foundations (Beginner)

### Chapter 1: Introduction to SystemVerilog
**Code focus:** write, compile, and simulate your first module.
- What is SystemVerilog (IEEE 1800-2017) and why it matters
- SV vs Verilog — what changed and why
- Design (RTL) vs verification use cases
- Simulation tools: Verilator, ModelSim/Questa, VCS, Xcelium, Icarus
- File extensions: `.sv`, `.svh`
- Compile → elaborate → simulate flow
- **Code:** `hello_world` module using `$display`, `$finish`
- **Code:** basic half-adder in `always_comb`, simulated with a testbench

---

### Chapter 2: Data Types — Fundamentals
**Code focus:** declare and manipulate every major type.
- 4-state types: `logic`, `wire`, `reg`, `tri` — and when to use each
- 2-state types: `bit`, `byte`, `shortint`, `int`, `longint`, `integer`
- `real`, `shortreal`, `time`, `realtime`
- `string` type and built-in methods: `len`, `toupper`, `tolower`, `substr`, `atoi`, `itoa`
- `void` for functions with no return
- `signed` vs `unsigned` arithmetic and implicit conversions
- Type casting: `'(expr)` static cast, `$cast` runtime safe cast
- `$bits()`, `$size()`, `$dimensions()` introspection
- **Code:** type comparison testbench — overflow, sign extension, 4-state arithmetic, string ops

---

### Chapter 3: Packed and Unpacked Arrays
**Code focus:** declare, index, and manipulate all array flavors.
- Packed arrays: `logic [7:0] byte_val` — contiguous bits
- Unpacked arrays: `logic arr [8]` — software-style elements
- Big-endian vs little-endian bit ordering
- Multi-dimensional packed and unpacked
- Dynamic arrays: `int d[]`, `.new(N)`, `.size()`, `.delete()`
- Associative arrays: `int map[string]`, `.exists()`, `.delete()`, `.num()`, `.first()`, `.next()`
- Queues: `int q[$]`, `.push_back()`, `.push_front()`, `.pop_back()`, `.pop_front()`
- Array manipulation methods: `sum`, `product`, `and`, `or`, `xor`, `min`, `max`
- Search methods: `find`, `find_index`, `find_first`, `find_last`
- Ordering methods: `sort`, `rsort`, `shuffle`, `reverse`, `unique`
- **Code:** packet parser — use queue to buffer bytes, associative array to count opcodes

---

### Chapter 4: Operators and Expressions
**Code focus:** write expressions that compute correctly for all edge cases.
- Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- Relational: `<`, `>`, `<=`, `>=`
- Equality: `==`, `!=` (X/Z unsafe), `===`, `!==` (4-state exact match)
- Logical: `&&`, `||`, `!`
- Bitwise: `&`, `|`, `~`, `^`, `~^` (XNOR)
- Reduction: `&a`, `|a`, `^a` — parity, all-ones, all-zeros checks
- Shift: `<<`, `>>` (logical), `<<<`, `>>>` (arithmetic)
- Conditional (ternary): `cond ? a : b`
- `inside` operator: `x inside {4, 8, [10:20]}`
- Streaming operators: `{<<{data}}` (bit-reverse), `{>>{data}}`
- Concatenation `{}` and replication `{N{}}`
- Operator precedence — common mistakes and fixes
- **Code:** barrel shifter and parity generator using reduction operators

---

### Chapter 5: Enhanced Procedural Blocks
**Code focus:** write sequential and combinational logic that synthesizes cleanly.
- `always_ff @(posedge clk or negedge rst_n)` — infers flip-flops
- `always_comb` — auto-sensitivity list, no inferred latches
- `always_latch` — when latches are intentional
- `initial` and `final` — simulation only
- `begin...end` sequential grouping
- `fork...join` — all threads must complete
- `fork...join_any` — return when first thread done
- `fork...join_none` — spawn and continue
- Named blocks and `disable`
- Sensitivity list pitfalls: missing signals, over-triggering
- **Code:** D flip-flop, JK flip-flop, shift register, priority encoder — each in the correct `always_*` style

---

### Chapter 6: Control Flow — Enhanced
**Code focus:** write clean decision logic free of lint warnings.
- `if-else` chains
- `case`, `casez`, `casex` — differences and hazards
- `unique case` — warns if overlap or no match (use in FSMs)
- `priority case` — first match wins (use in priority encoders)
- `unique if`, `priority if`
- `for` loop with scoped variable
- `foreach` — iterate all array dimensions
- `while`, `do-while`, `repeat(N)`, `forever`
- `break`, `continue`, `return`, `disable`
- **Code:** 7-segment decoder (`unique case`), priority arbiter (`priority if`), binary-to-Gray loop

---

### Chapter 7: Functions and Tasks — Enhanced
**Code focus:** write reusable, correct procedural code.
- Function: returns a value, no time advance
- Task: no return value, can consume simulation time
- `automatic` keyword — stack allocation, required for recursion
- Default argument values
- Pass by value (default) vs `ref` vs `const ref`
- `void` functions
- Recursive functions (factorial, Fibonacci, `$clog2` reimplementation)
- System functions: `$unsigned`, `$signed`, `$clog2`, `$floor`, `$ceil`, `$pow`, `$sqrt`
- **Code:** recursive binary search, CRC-8 calculation function, byte-to-hex string formatter task

---

### Chapter 8: Modules, Ports, and Instantiation
**Code focus:** compose designs from multiple modules cleanly.
- Module declaration with parameters and typed ports
- `input`, `output`, `inout`, `ref` port directions
- Named port connections and `.name` shorthand
- `.*` wildcard connection
- `#(parameter_name(value))` override at instantiation
- Hierarchical references: `top.u_dut.signal`
- `$unit` scope — why to avoid it
- **Code:** 4-bit ripple carry adder built from full-adder instances; 2-to-1 mux tree

---

## ★ Part 1 Build Project: 8-Bit ALU

**Spec:** Design and verify a fully parameterizable 8-bit ALU.

| Task | What you build |
|------|----------------|
| Design | `alu.sv` — supports ADD, SUB, AND, OR, XOR, NOT, SHL, SHR, compare ops |
| Parameters | `WIDTH` (default 8), `OP_BITS` (number of operation select bits) |
| Ports | `a`, `b` inputs; `op` select; `result`, `zero`, `carry`, `overflow` outputs |
| Testbench | `tb_alu.sv` — exhaustive test for 8-bit, directed tests for edge cases |
| Coverage | Verify every opcode is exercised |
| Assertions | Immediate assertions: zero flag correct, overflow detection |

---

## PART 2 — RTL Design (Intermediate)

### Chapter 9: Parameters and Type Parameters
**Code focus:** write modules that work for any width without code duplication.
- `parameter int WIDTH = 8` — module-level constant
- `localparam` — derived constant, not overridable
- Parameter types: `int`, `logic`, `real`, `string`, `type`
- Type parameter: `parameter type T = logic [7:0]`
- `$bits(T)`, `$typename(T)` — query type at compile time
- Overriding parameters at instantiation
- **Code:** parameterized register file, parameterized priority encoder

---

### Chapter 10: Typedef, Structs, and Unions
**Code focus:** build rich type systems that make port lists self-documenting.
- `typedef logic [7:0] byte_t`
- Packed struct — contiguous bits, synthesizable, usable as port
  ```systemverilog
  typedef struct packed {
    logic [3:0] opcode;
    logic [3:0] operand;
  } instr_t;
  ```
- Unpacked struct — arbitrary field types (testbench use)
- Nested structs
- Packed union — overlapping bit interpretations
- Tagged union — type-safe discriminated union
- Struct arrays as register files
- **Code:** instruction decode unit using a packed struct for the instruction word

---

### Chapter 11: Enumerated Types
**Code focus:** write FSMs that are readable, lint-clean, and correctly encoded.
- Enum declaration with explicit base type
- Auto-increment and explicit value assignment
- Enum methods: `.first()`, `.last()`, `.next()`, `.prev()`, `.num()`, `.name()`
- `$cast` for safe enum assignment from integer
- `inside` for enum membership check
- One-hot, binary, and Gray encoding comparison
- Synthesis encoding attributes
- **Code:** traffic light FSM with enum, `unique case`, and self-checking testbench

---

### Chapter 12: Interfaces and Modports
**Code focus:** eliminate copy-paste port lists using interfaces.
- Interface declaration and instantiation
- `modport` — directional view for each agent
  ```systemverilog
  modport master (output PADDR, PWDATA, input PRDATA);
  modport slave  (input  PADDR, PWDATA, output PRDATA);
  ```
- Clocking blocks in interfaces for testbench timing
- `@(clk_blk.sig)` vs `@(posedge clk)` — race avoidance
- Input/output skew on clocking blocks
- Parameterized interfaces
- Interface arrays
- **Code:** APB interface definition; connect a master and slave through it

---

### Chapter 13: Packages
**Code focus:** share types, functions, and parameters across files without pollution.
- `package...endpackage` declaration
- Contents: `typedef`, `function`, `task`, `parameter`, `class`
- `import pkg::item` — selective import
- `import pkg::*` — wildcard import
- Package scope `pkg::item` in port lists
- Compilation ordering requirements
- **Code:** `cpu_pkg.sv` containing all instruction typedefs; import into ALU and decoder

---

### Chapter 14: Generate Constructs
**Code focus:** write one module that generates N copies of hardware.
- `genvar` — loop variable for generate blocks
- `for` generate — replicate hardware
  ```systemverilog
  for (genvar i = 0; i < N; i++) begin : stage
    adder u_add (.a(a[i]), .b(b[i]), .s(s[i]));
  end
  ```
- `if` generate — optional hardware based on parameter
- `case` generate — multi-way hardware selection
- Named generate blocks and hierarchical access: `stage[2].u_add`
- **Code:** parameterized N-bit ripple carry adder, parameterized barrel shifter

---

### Chapter 15: Finite State Machines
**Code focus:** code any FSM correctly the first time.
- Moore vs Mealy — trade-offs in code structure
- 2-block FSM: state register + combined next-state/output
- 3-block FSM: state register, next-state logic, output logic (cleanest)
- Enum-based state encoding
- `unique case` for full state coverage
- One-hot encoding — when and how
- Safe FSM: default state transition to handle glitches
- FSM reset strategy
- **Code:** vending machine controller, traffic light with pedestrian button, serial UART receiver FSM

---

### Chapter 16: Memory Modeling
**Code focus:** build common memory structures from scratch.
- Single-port synchronous ROM with `$readmemh` init
- Single-port synchronous SRAM: read-first, write-first, no-change
- Dual-port SRAM: simultaneous read/write, collision handling
- FIFO design: circular buffer with head/tail pointers
- FIFO full/empty/almost-full flags
- Registered vs combinational output FIFO
- `$readmemh`, `$readmemb`, `$writememh`
- **Code:** synchronous FIFO with configurable depth and width; FIFO testbench checking fill/drain

---

### Chapter 17: Clocking, Resets, and CDC Basics
**Code focus:** write designs that work reliably across clock domains.
- Synchronous reset: sampled at clock edge — simple and safe
- Asynchronous reset: immediate effect, requires synchronizer
- Reset synchronizer: asynchronous assert, synchronous deassert
- Glitch-free clock mux design
- Metastability concept and MTBF
- Two-flop synchronizer for single-bit CDC
- Pulse synchronizer for narrow pulses
- Gray code for multi-bit CDC (pointer synchronization)
- `$rose`, `$fell`, `$stable`, `$changed` in assertions
- **Code:** async FIFO with Gray-coded pointers (full implementation)

---

### Chapter 18: Synthesis-Safe SystemVerilog
**Code focus:** write RTL that synthesizes to exactly what you intend.
- Synthesizable vs non-synthesizable constructs — checklist
- Inferred latches: root causes, how `always_comb` prevents them
- Incomplete case — add `default`, use `unique case`
- X-propagation: simulation vs synthesis discrepancy
- Combinational loops — detection and fix
- Integer overflow and truncation pitfalls
- Signed arithmetic hazards
- Lint-clean coding checklist
- Synthesis attributes: `(* keep *)`, `(* full_case *)`, `(* parallel_case *)`
- **Code:** audit and fix a broken RTL file with latches, incomplete case, and combinational loop

---

## ★ Part 2 Build Project: SPI Master Controller

**Spec:** Design a full SPI master, parameterized for any data width and clock divider.

| Task | What you build |
|------|----------------|
| Design | `spi_master.sv` — FSM-controlled, CPOL/CPHA configurable, parameterized |
| Interface | `spi_if.sv` — SCLK, MOSI, MISO, CS_N signals with modports |
| Testbench | `tb_spi.sv` — loopback test (tie MOSI to MISO), verify round-trip data |
| Assertions | No overlapping transactions; CS_N low during transfer; clock count correct |
| Parameters | `DATA_WIDTH`, `CLK_DIV`, `CPOL`, `CPHA` |

---

## PART 3 — Verification Fundamentals (Intermediate)

### Chapter 19: Testbench Architecture
**Code focus:** structure a testbench that scales.
- Flat testbench: everything in one block — when it's OK
- Layered testbench: separate clock gen, driver, monitor, checker
- DUT instantiation via interface
- Clock and reset generation patterns
- `$dumpfile` / `$dumpvars` for VCD waveform capture
- `$monitor`, `$strobe`, `$display` — when to use each
- `$timeformat` — control time display
- `$stop` vs `$finish`
- **Code:** structured testbench for a FIFO — separate stimulus, monitor, and checker tasks

---

### Chapter 20: SystemVerilog Assertions — Immediate
**Code focus:** catch bugs at the point they occur.
- Immediate assertion syntax: `assert (expr) else $error(...)`
- Deferred immediate: `assert final` — checked after NBA updates
- Action block: `else begin ... end`
- Severity levels: `$fatal`, `$error`, `$warning`, `$info`
- `$assertoff` / `$asserton` — control during reset
- Using assertions in RTL: protocol enforcement at design boundaries
- Using assertions in tasks: argument validation
- **Code:** add immediate assertions to the SPI master — check CS_N, check data width, check no reentrance

---

### Chapter 21: Concurrent Assertions — Sequences
**Code focus:** write temporal properties over clock cycles.
- Concurrent assertion vs immediate — evaluated over time
- Syntax: `assert property (@(posedge clk) disable iff (!rst_n) prop)`
- `##1` — one-cycle delay
- `##N` — N-cycle delay
- `##[N:M]` — N to M cycle range
- `##[*]` / `##[+]` — zero-or-more / one-or-more
- `|->` overlapping implication
- `|=>` non-overlapping implication
- `and`, `or` sequence operators
- `intersect`, `within`, `throughout`
- Repetition: `[*N]` consecutive, `[->N]` goto, `[=N]` non-consecutive
- **Code:** handshake protocol checker (req → ack within 1–4 cycles), FIFO never-overflow property

---

### Chapter 22: Concurrent Assertions — Properties
**Code focus:** write reusable, readable property libraries.
- `property...endproperty` — named property for reuse
- `$past(sig, N)` — value N cycles ago
- `$rose`, `$fell`, `$stable`, `$changed` — edge and stability
- `$sampled` — value in observed region
- Local variables inside sequences
- `cover property` — reachability checking
- `assume property` — constrain inputs for formal
- Named sequences as building blocks
- Recursive properties (advanced)
- **Code:** AXI-Lite property library: valid-ready handshake, no mid-transfer address change, data stability

---

### Chapter 23: Constrained Random Verification
**Code focus:** write constraints that generate exactly the interesting stimulus.
- `rand` — uniform random distribution
- `randc` — cyclic, no repeat until all values visited
- `constraint` blocks — declare relationships
- Range constraints: `{ x inside {[1:100]}; }`
- Weighted distribution: `{ x dist {0 := 1, [1:254] := 8, 255 := 1}; }`
- Implication: `if (mode == WRITE) { addr != 0; }`
- `solve x before y` — fix ordering for dependent rand
- `randomize()` — check return value!
- `pre_randomize()` / `post_randomize()` callbacks
- `constraint_mode(0/1)` — enable/disable a constraint
- `rand_mode(0/1)` — enable/disable randomization of a variable
- Inline: `obj.randomize() with { x > 5; }`
- **Code:** random AXI-Lite transaction generator with address alignment, burst length, and strobe constraints

---

### Chapter 24: Functional Coverage
**Code focus:** measure what your testbench actually tested.
- `covergroup` and `endgroup`
- `covergroup cg @(posedge clk)` — clocked sampling
- `coverpoint` on variable or expression
- Explicit bins: `bins b_zero = {0}`
- Auto-range bins: `bins b_mid[] = {[10:20]}`
- Default bin: `bins others = default`
- `ignore_bins` and `illegal_bins`
- Wildcard bins: `wildcard bins bW = {4'b1??0}`
- `cross cp1, cp2` — cross coverage
- `binsof` filtering in cross
- `option.per_instance`, `option.weight`, `option.goal`, `option.at_least`
- `$get_coverage()` — query at end of sim
- **Code:** AXI-Lite coverage model — cover all op types, address ranges, burst lengths, and their cross product

---

## ★ Part 3 Build Project: Layered Testbench for UART

**Spec:** Write a complete structured testbench for a UART transmitter.

| Task | What you build |
|------|----------------|
| DUT | `uart_tx.sv` — baud-rate divisor parameterized, 8N1 format |
| Driver | Task-based driver: send byte, configure baud |
| Monitor | Sample TX line, reconstruct received byte |
| Checker | Compare sent vs received, timing assertions |
| CRV | Randomize data bytes, baud rate selection |
| SVA | Start bit timing, stop bit present, no glitch mid-frame |
| Coverage | All byte values, all baud rates, back-to-back transfers |

---

## PART 4 — Object-Oriented Programming for Verification (Advanced)

### Chapter 25: Classes — Fundamentals
**Code focus:** build the first class-based testbench component.
- Class declaration, properties, methods
- Constructor `new()` and `super.new()`
- `this` keyword — disambiguate instance vs local
- `static` properties and methods — shared across instances
- Access control: `local`, `protected`, default public
- `extern` — declare inside, define outside
- `typedef class` forward declaration
- **Code:** `Transaction` class with rand fields, `print()`, `compare()` methods

---

### Chapter 26: Inheritance and Polymorphism
**Code focus:** extend base classes without modifying them.
- `class derived extends base`
- Constructor chaining: `super.new()`
- Method override — same signature, new behavior
- `virtual` methods — runtime dispatch
- Abstract class: `virtual class base`
- Pure virtual: `pure virtual function void execute()`
- Cannot instantiate abstract classes — enforce interface contract
- `$cast(derived_h, base_h)` — safe downcast, returns 0 on failure
- Polymorphic containers: `base_txn queue[$]`
- **Code:** transaction class hierarchy — `base_txn`, `read_txn`, `write_txn`; polymorphic scoreboard queue

---

### Chapter 27: Handles, Copying, and Memory
**Code focus:** avoid the most common OOP bugs in SV.
- Object handle vs value type — critical distinction
- `null` handle and null dereference errors
- Shallow assignment: `obj2 = obj1` — shared reference!
- Shallow copy: `obj2 = new obj1` — copies fields, not nested objects
- Deep copy: write a recursive `copy()` method
- `clone()` pattern — returns deep-copied handle
- `$cast` for downcasting with type checking
- Garbage collection — automatic reference counting
- **Code:** deep-copy a nested transaction tree; verify independence after copy

---

### Chapter 28: Parameterized Classes
**Code focus:** write generic data structures once.
- `class fifo #(type T = int, int DEPTH = 16)`
- Instantiation: `fifo #(.T(my_txn), .DEPTH(32)) txn_fifo`
- Parameterized base class and derived specialization
- Generic scoreboard that works for any transaction type
- **Code:** typed FIFO class; typed scoreboard class; instantiate both with `axi_txn`

---

### Chapter 29: Virtual Interfaces
**Code focus:** connect OOP testbench classes to RTL signals.
- Why static interface handles don't work inside classes
- `virtual my_if vif` — a handle to a concrete interface
- Passing virtual interface to a class object
- Driving via `vif.clk_blk.signal <= value` — clocking block driven
- Sampling via `vif.clk_blk.signal` — observed region sampling
- Output skew: why `@(posedge clk); #1; drive...` works
- Input skew: `#1step` before reading
- **Code:** AXI-Lite driver class using virtual interface clocking block; AXI-Lite monitor class

---

### Chapter 30: Mailboxes, Semaphores, and Events
**Code focus:** connect concurrent threads safely.

**Mailbox**
- `mailbox #(T) mbx = new()` — typed, thread-safe queue
- `put()` blocks if full, `get()` blocks if empty
- `try_put()` / `try_get()` — non-blocking
- `peek()` — non-destructive read
- `num()` — items pending

**Semaphore**
- `semaphore sem = new(N)` — N initial keys
- `get(N)` — acquire (blocks), `put(N)` — release, `try_get(N)` — non-blocking

**Events**
- `event e` / `->e` trigger / `@e` wait
- `e.triggered` — level-sensitive (no missed trigger)
- `wait fork` / `disable fork`

- **Code:** generator → mailbox → driver pipeline; semaphore protecting shared bus; event for reset-done sync

---

### Chapter 31: Program Blocks and Simulation Scheduling
**Code focus:** understand the simulation time wheel to avoid races.
- 4-region time step: Active → NBA → Observed → Reactive
- Why races happen between DUT and testbench
- `program` block — runs in reactive region, avoids races
- Clocking block input: sampled in observed region
- Clocking block output: driven in reactive region
- `#1step` — sample just before active region
- `$monitor` in reactive region
- **Code:** race demonstration testbench; fix it using clocking block; show timing with `$time` annotations

---

## ★ Part 4 Build Project: Class-Based AXI-Lite Scoreboard

**Spec:** Build a full class-based verification environment for an AXI-Lite slave.

| Task | What you build |
|------|----------------|
| DUT | `axi_lite_slave.sv` — register file with 8 read/write registers |
| Transaction | `axi_txn` class with `rand` addr, data, strobe, op |
| Driver | Class using virtual AXI-Lite interface clocking block |
| Monitor | Reconstruct transactions from pin activity |
| Scoreboard | In-order checker with reference model (shadow register map) |
| Generator | Constrained random: aligned addresses, valid strobes |
| Coverage | All addresses, all strobes, read-after-write scenario |
| Mailboxes | Generator→Driver, Monitor→Scoreboard pipelines |

---

## PART 5 — UVM — Universal Verification Methodology (Advanced)

### Chapter 32: UVM Introduction
**Code focus:** write your first compilable UVM testbench.
- `uvm_object` vs `uvm_component` — the fundamental split
- UVM phasing: build → connect → start_of_sim → run → check → report
- Factory: `create()` instead of `new()`
- `uvm_report_*` severity levels
- `run_test("test_name")` — simulation entry point
- `+UVM_TESTNAME` plusarg
- **Code:** minimum UVM testbench — test, env stub, `$display` in run_phase, compilation clean

---

### Chapter 33: UVM Transaction Items
**Code focus:** write a complete, reusable sequence item.
- `class my_txn extends uvm_sequence_item`
- `` `uvm_object_utils(my_txn) `` macro
- `rand` fields + constraints
- Field automation macros: `` `uvm_field_int ``, `` `uvm_field_string ``, `` `uvm_field_enum ``
- `do_copy()`, `do_compare()`, `do_print()`, `do_pack()`, `do_unpack()`
- `convert2string()` for debug
- `sprint()`, `print()` usage
- **Code:** AXI-Lite transaction item — addr, data, strobe, op, id fields; test with `randomize()` + `print()`

---

### Chapter 34: UVM Sequences and Sequencers
**Code focus:** generate ordered stimulus through the UVM sequence mechanism.
- `uvm_sequencer #(REQ)` — arbitrates sequences
- `uvm_sequence #(REQ)` — generates items in `body()`
- `start_item(req)` → `finish_item(req)` handshake
- `` `uvm_do(item) `` macro — create + randomize + send
- `` `uvm_do_with(item, {x > 5;}) `` — inline constraints
- `seq.start(sequencer_handle)` — from test
- Default sequence via `uvm_config_db`
- `get_response(rsp)` — read response from driver
- **Code:** write sequence, read sequence, mixed read-write sequence for AXI-Lite

---

### Chapter 35: UVM Driver
**Code focus:** write a driver that correctly bridges UVM sequences to DUT pins.
- `class my_drv extends uvm_driver #(my_txn)`
- `` `uvm_component_utils `` registration
- `run_phase` main loop
- `seq_item_port.get_next_item(req)` — blocking
- Drive DUT via virtual interface clocking block
- `seq_item_port.item_done()` — mandatory completion signal
- Optional: `seq_item_port.put(rsp)` — response
- **Code:** AXI-Lite driver — write and read transaction handling with proper handshake

---

### Chapter 36: UVM Monitor
**Code focus:** passively capture all DUT activity for checking and coverage.
- `class my_mon extends uvm_monitor`
- Passive: observe only, never drive
- Reconstruct transaction from pin-level sampling
- `uvm_analysis_port #(my_txn) ap`
- `ap.write(txn)` — broadcast to all subscribers
- `run_phase` — infinite sampling loop
- **Code:** AXI-Lite monitor — detect write/read completion, build transaction, write to analysis port

---

### Chapter 37: UVM Scoreboard
**Code focus:** implement an automatic checker that never misses a bug.
- `class my_sb extends uvm_scoreboard`
- `` `uvm_analysis_imp_decl `` for multiple ports
- `write_expected(txn)` and `write_actual(txn)` — separate write methods
- In-order checking: queue expected, compare when actual arrives
- Out-of-order: associative array keyed by transaction ID
- Reference model: shadow register map
- `check_phase` — verify queue drained, no missing responses
- `uvm_tlm_analysis_fifo #(T)` — buffer between monitor and scoreboard
- **Code:** AXI-Lite scoreboard with shadow register file; mismatch error with `$sformatf` details

---

### Chapter 38: UVM Agent
**Code focus:** package driver + monitor + sequencer as one reusable block.
- `class my_agent extends uvm_agent`
- `is_active`: `UVM_ACTIVE` (with driver) vs `UVM_PASSIVE` (monitor only)
- `build_phase`: create components conditionally on `is_active`
- `connect_phase`: driver port → sequencer export
- Export monitor analysis port to environment
- Configuration object pattern: `my_agent_cfg`
- **Code:** AXI-Lite agent; configuration object with `is_active`, `vif` handle

---

### Chapter 39: UVM Environment
**Code focus:** compose agents, scoreboard, and coverage into one environment.
- `class my_env extends uvm_env`
- `build_phase`: create all components
- `connect_phase`: wire analysis ports (monitor → scoreboard, monitor → coverage)
- Multi-agent environment pattern
- **Code:** AXI-Lite env — one master agent, scoreboard, coverage collector; all wired up

---

### Chapter 40: UVM Test
**Code focus:** write multiple tests that reuse the same environment.
- `class base_test extends uvm_test`
- `build_phase`: create and configure env
- `run_phase`: start sequences, manage objections
- Test specialization: `class stress_test extends base_test`
- Sequence override per test
- `phase.raise_objection(this)` / `phase.drop_objection(this)`
- **Code:** base_test (reset + 10 random txns), write_only_test, read_after_write_test, stress_test

---

### Chapter 41: UVM Configuration Database
**Code focus:** pass configuration without fragile hierarchical connections.
- `uvm_config_db #(T)::set(context, path, name, value)`
- `uvm_config_db #(T)::get(this, "", name, var)` — returns 1/0
- Pass virtual interface to driver and monitor
- Pass configuration object to agent
- Hierarchical path `"*"` vs exact `"env.agent.driver"`
- Debug: `+UVM_CONFIG_DB_TRACE`
- **Code:** wire up AXI-Lite virtual interface from top-level TB to driver/monitor via config_db

---

### Chapter 42: UVM Factory and Overrides
**Code focus:** swap components at runtime without touching test code.
- `` `uvm_component_utils `` / `` `uvm_object_utils `` registration
- `create()` must be used, not `new()` directly
- Type override: replace all instances of a type
  ```systemverilog
  set_type_override_by_type(base_seq::get_type(), stress_seq::get_type());
  ```
- Instance override: replace one specific instance
- `+UVM_TESTNAME` for command-line test selection
- Factory print: `factory.print()`
- **Code:** override base_seq with error_injection_seq in one test without changing env code

---

### Chapter 43: UVM Phases, Virtual Sequences, and RAL

**Phases deep dive:**
- Build phases (top-down): `build` → `connect` → `end_of_elaboration` → `start_of_simulation`
- Run phase and parallel sub-phases: `reset` → `configure` → `main` → `shutdown`
- Cleanup (bottom-up): `extract` → `check` → `report` → `final`
- Phase objections and drain time
- `phase_ready_to_end()` override

**Virtual Sequences:**
- `uvm_virtual_sequencer` — holds handles to real sequencers
- Coordinates stimulus across multiple agents simultaneously
- Reset + configure + main stimulus in one virtual sequence

**Register Abstraction Layer (RAL):**
- `uvm_reg` — models one register
- `uvm_reg_block` — models the full register map
- Frontdoor: access via bus protocol sequences
- Backdoor: direct DUT hierarchy reference (fast)
- Built-in sequences: `uvm_reg_hw_reset_seq`, `uvm_mem_walk_seq`
- Register adapter: translate `uvm_reg_bus_op` ↔ AXI-Lite transaction

- **Code:** virtual sequence running reset, write-all-registers, read-back-all-registers in order

---

## ★ Part 5 Build Project: Full UVM Environment for DMA Controller

**Spec:** Build a production-style UVM testbench for a simple DMA controller.

| Task | What you build |
|------|----------------|
| DUT | `dma_ctrl.sv` — AXI-Lite config port + AXI master read/write |
| Agents | AXI-Lite config agent (active) + AXI memory agent (passive) |
| Scoreboard | Verify data transferred from source to destination correctly |
| Reference model | Software model of DMA transfer in `post_randomize` |
| RAL | Register model for DMA config registers (src addr, dst addr, length, ctrl) |
| Test suite | reset_test, single_transfer_test, scatter_gather_test, error_injection_test |
| Coverage | All transfer lengths, aligned/unaligned, back-to-back |
| Factory use | Swap in error injection sequence from command line |

---

## PART 6 — Specialized and Expert Topics

### Chapter 44: Formal Verification Introduction
**Code focus:** write properties that a formal tool can prove exhaustively.
- Formal vs simulation: proof vs sampling
- Bounded model checking (BMC): prove for N cycles
- `assume` — constrain inputs
- `assert` — what must always hold
- `cover` — prove reachability
- Vacuity: assertion passes because antecedent never fires
- Tools: JasperGold, SymbiYosys (open), OneSpin
- **Code:** formally verify AXI-Lite slave: no deadlock, response always follows request, data integrity

---

### Chapter 45: DPI — Direct Programming Interface
**Code focus:** call C functions from SV for reference models and performance.
- `import "DPI-C" function int c_func(input int x)`
- `export "DPI-C" function sv_func`
- Data type mapping: `int`, `real`, `byte`, `bit`, `string`, `chandle`
- Arrays: `svOpenArrayHandle`, `svLeft()`, `svRight()`, `svGetArrayPtr()`
- Packed structs map to C integers
- `chandle` — opaque C pointer
- Building: link C object with SV simulation
- **Code:** CRC-32 reference model in C, called from SV testbench; compare with RTL output

---

### Chapter 46: Clock Domain Crossing — Advanced
**Code focus:** write CDC-correct designs and verify them with assertions.
- Metastability and MTBF — why two-flop works
- Two-flop synchronizer — implementation
- Multi-bit CDC problem — why two-flop is NOT enough
- Handshake synchronizer: req/ack across domains
- Asynchronous FIFO — complete implementation:
  - Gray-coded pointers
  - Pointer comparison in destination domain
  - Full and empty flag derivation
- Reset synchronizer: async assert, sync deassert
- CDC SVA properties: stability, handshake protocol
- **Code:** complete async FIFO with full testbench; CDC property set

---

### Chapter 47: Coverage Closure Strategy
**Code focus:** systematically drive coverage to target and know when you're done.
- Coverage plan (cover spec): map requirements → coverpoints
- Merging databases from parallel regression runs
- Coverage hole analysis: missed bins, unreachable?
- Directed test writing to close specific holes
- Constraint tuning: `dist` weights for corner cases
- Exclusion management: justify every exclusion in writing
- fcov (functional) vs ccov (code): line, branch, expression, toggle, FSM
- Coverage-driven regression: auto-run until target met
- **Code:** coverage closure script; exclusion file; constrained sequence targeting hard-to-reach bins

---

### Chapter 48: Low-Power Design in SystemVerilog
**Code focus:** write power-aware RTL and understand UPF flow.
- UPF (IEEE 1801) — power domains, supply networks
- Isolation cells: prevent X propagation during power-down
- Level shifters: voltage translation between domains
- Retention registers: save/restore state
- Always-on logic domain
- Power state table (PST)
- UPF directives: `create_power_domain`, `set_isolation`, `set_retention`
- Power-aware simulation — checking isolation, retention behavior
- **Code:** low-power audio codec RTL with UPF; isolation and retention simulation

---

### Chapter 49: SystemVerilog for FPGA Design
**Code focus:** write RTL that infers the right FPGA primitives.
- FPGA vs ASIC optimization targets
- Block RAM (BRAM) inference templates — Xilinx and Intel
  - Single/dual-port, registered output, read-first/write-first
- DSP block inference: multiply-accumulate chains
- LUTRAM: small distributed RAM
- Synchronous reset — preferred on most FPGAs (LUT reset cost)
- Synthesis attributes:
  - `(* ram_style = "block" *)` — Xilinx
  - `(* ramstyle = "M20K" *)` — Intel
- Clock constraint strategy with `create_clock`, `create_generated_clock`
- Timing closure: identifying and fixing critical path
- **Code:** BRAM-inferred FIFO for Xilinx; DSP-inferred FIR filter tap

---

### Chapter 50: Debug, Lint, and Signoff
**Code focus:** take a design from "works in simulation" to "ready to tape out".

**Lint:**
- Lint tools: SpyGlass, Ascent Lint, Verilator `--lint-only`
- Common rules: unconnected ports, implicit net, full-case, multi-driven net
- Waiver management: document every waiver

**Simulation Debug:**
- VCD, FSDB, EVCD waveform formats
- Assertion failure messages with `$sformatf`
- `$value$plusargs` — runtime control
- UVM debug: `+UVM_VERBOSITY=UVM_DEBUG`, `+UVM_CONFIG_DB_TRACE`, `+UVM_FACTORY_NO_OVERRIDE`

**Signoff Checklist:**
- [ ] Lint clean (0 errors, all warnings waived with justification)
- [ ] Functional coverage ≥ target (e.g., 98%)
- [ ] Code coverage ≥ target (e.g., 90% line/branch)
- [ ] All assertions pass — 0 failures across full regression
- [ ] CDC analysis clean
- [ ] No unresolved X sources
- [ ] Formal properties proven or bounded to sufficient depth
- [ ] Timing constraints met post-synthesis
- [ ] All UPF power rules pass (if applicable)
- [ ] Documentation complete: block spec, verification plan, coverage report, exclusion log

- **Code:** run full lint on the DMA project; fix all findings; produce signoff report

---

## ★ Part 6 Capstone Project: Choose Your Own

Apply everything to a design of your choice. Suggested options:

| Option | Scope |
|--------|-------|
| RISC-V RV32I core | Full design + UVM testbench, ISA-level scoreboard, formal property set |
| PCIe TLP generator | AXI-Stream interface, packet assembly, CRV for all TLP types |
| DDR4 controller | Complex FSM, timing constraints, CDC between DFI and core clock |
| SHA-256 accelerator | Data path design, DPI-C reference model in C, formal correctness proof |
| MIPI CSI-2 receiver | High-speed serial, clock recovery, packet parser, full UVM env |

---

## Recommended Learning Path

```
BEGINNER  (0–3 months)   Chapters 1–8   + ALU Project
INTERMEDIATE (3–6 months)
  Design path:           Chapters 9–18  + SPI Project
  Verification path:     Chapters 19–24 + UART TB Project
ADVANCED  (6–9 months)   Chapters 25–31 + AXI-Lite OOP Project
UVM       (9–15 months)  Chapters 32–43 + DMA UVM Project
EXPERT    (15+ months)   Chapters 44–50 + Capstone
```

---

## Topic Coverage Summary

| Domain | Chapters | Build Artifact |
|--------|----------|----------------|
| Language Basics | 1–8 | 8-bit ALU |
| RTL Design Patterns | 9–18 | SPI Master |
| Assertions (SVA) | 20–22 | Protocol checkers |
| Constrained Random | 23 | AXI-Lite stimulus |
| Functional Coverage | 24 | AXI-Lite coverage model |
| OOP Verification | 25–28 | Transaction class hierarchy |
| TB Infrastructure | 29–31 | AXI-Lite class-based TB |
| UVM Full Flow | 32–43 | DMA UVM environment |
| Formal Verification | 44 | AXI-Lite proven properties |
| DPI / Co-simulation | 45 | CRC-32 C reference model |
| CDC | 46 | Async FIFO |
| Coverage Closure | 47 | Closure strategy + scripts |
| Low Power | 48 | UPF-aware codec |
| FPGA | 49 | BRAM FIFO + DSP FIR |
| Signoff | 50 | DMA project signoff |

---

*Document version 1.0 — May 2026*  
*50 chapters · 6 build projects · coding-first throughout*
