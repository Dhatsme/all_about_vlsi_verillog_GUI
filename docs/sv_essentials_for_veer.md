# SystemVerilog Essentials for the VeeR Project

The prerequisite reference for the **VeeR EL2 Lab** (`static/veer.html`). It
teaches exactly the SystemVerilog that the real VeeR EL2 RTL and its testbenches
use — no more — so a learner can read, run and later write VeeR-style code.

- **Prerequisite for:** every VeeR chapter (`o*`, `vf*`, `vd*`, `vp*`).
- **Assumes:** the learner has done "SystemVerilog Zero to Hero" `msv1`–`msv5`
  (gates, `always_ff`, `always_comb`, FSMs, memories), or equivalent.
- **Source of truth:** VeeR EL2 commit `45c9b42`
  ([github.com/chipsalliance/Cores-VeeR-EL2](https://github.com/chipsalliance/Cores-VeeR-EL2)).
  Every excerpt below is from that code (Apache-2.0) and every count was
  measured on it.
- **Plan:** `docs/veer_course_plan.md`. Running example: the restaurant kitchen.

---

## How VeeR's style differs from textbook SystemVerilog

Measured across ~30,550 lines of VeeR RTL in `design/`:

| Construct | Uses in VeeR | Textbook expectation |
|---|---|---|
| `assign` (continuous assignment) | **4,404** | Common |
| Instances of VeeR's own flip-flop modules (`rvdff`, `rvdffe`, …) | **600** | Rare — textbooks write `always_ff` |
| `always_ff` blocks | **8** (mostly inside the `rvdff` library) | Very common |
| `always_comb` blocks | 117 | Common |
| Replication `{N{x}}` | **1,076** | Occasional |
| `localparam` / `parameter` | 278 / 31 | Common |
| `` `ifdef `` / `` `ifndef `` | 151 | Occasional |
| `generate` loops (`genvar`) | 101 | Occasional |
| Reduction operators (`^x`, `\|x`, `&x`) | 153 | Rare |
| Packed multi-dimensional arrays `[N-1:0][W-1:0]` | 164 | Rare |
| `typedef struct packed` / `typedef enum` | 29 / 12 | Occasional |
| `interface` / `modport` | 2 / 14 | Occasional |
| `logic` vs `wire` vs `reg` | 6,752 / 186 / 20 | Mixed |

**The VeeR style in one sentence:** almost all logic is written as `assign`
expressions, every register is an instance of a library flip-flop, and the whole
design is configured by one parameter struct called `pt`.

### What "SystemVerilog Zero to Hero" (`msv1`–`msv7`) already covers

| Topic | msv coverage | Covered here |
|---|---|---|
| `logic`, modules, ports, `assign`, operators | ✅ msv1, msv3 | Recap + VeeR idioms |
| `always_ff`, `always_comb`, `case` | ✅ msv2, msv4 | Recap |
| FSMs, `typedef enum` | ✅ msv4 | Recap |
| Memories, `$readmemh` | ✅ msv5, msv7 | Recap |
| `parameter`, `localparam` | ⚠️ msv6–msv7 only | ✅ §5 |
| Replication, reduction operators | ⚠️ msv7 only | ✅ §2 |
| `generate` / `genvar` | ⚠️ light (msv3, msv7) | ✅ §7 |
| Packed structs | ❌ | ✅ §6 |
| Packages, `import` | ❌ | ✅ §5 |
| Interfaces, `modport` | ❌ | ✅ §8 |
| Preprocessor `` `include `` / `` `define `` / `` `ifdef `` | ❌ | ✅ §9 |
| Classes, handles, inheritance | ❌ | ✅ §13 |
| Randomization | ❌ | ✅ §14 |
| Virtual interfaces, UVM building blocks | ❌ | ✅ §15–§16 |

---

# Part 1 — Reading VeeR RTL (the design)

## 1. Modules, ports and connections

**Kitchen:** a module is one station; ports are the hatches food passes through.

VeeR declares everything as `logic` and connects instances by name. It also uses
the **implicit `.*` connection**: any port not listed is connected to a signal
of the same name.

```systemverilog
// design/lsu/el2_lsu_lsc_ctl.sv, line 200
rvdff #(1) access_fault_rff (.din(access_fault_m), .dout(access_fault_r),
                             .clk(lsu_c1_r_clk), .*);
```

`.*` here connects `rst_l` (and anything else not named) automatically.

- **Pitfall:** `.*` hides connections. When reading, check the instantiated
  module's port list for what `.*` filled in.
- **Check:** in the line above, which port of `rvdff` is connected by `.*`?
  (Answer: `rst_l`.)

## 2. Combinational logic with `assign`

**Kitchen:** an `assign` is a rule on the wall that is always true — "the light
over the pass is on whenever a plate is waiting".

### 2.1 Bit-select, part-select, concatenation

```systemverilog
logic [31:0] din;
assign hi = din[31:16];            // part-select
assign b0 = din[0];                // bit-select
assign w  = {hi, din[15:0]};       // concatenation: 32 bits
```

### 2.2 Replication `{N{x}}` — used 1,076 times

Copies a value N times. VeeR uses it everywhere to build masks and to apply a
1-bit condition to a whole bus.

```systemverilog
assign masked = data & {32{valid}};   // all 32 bits pass only when valid=1
assign sext   = {{20{imm[11]}}, imm}; // sign-extend a 12-bit immediate to 32
```

### 2.3 Reduction operators — used 153 times

`^x` XORs all bits of `x` (parity), `|x` ORs them (any bit set?), `&x` ANDs them
(all bits set?). VeeR's ECC is built from them:

```systemverilog
// design/lib/beh_lib.sv, rvecc_encode (excerpt)
assign ecc_out[6:0] = {(^din[31:0])^(^ecc_out_temp[5:0]), ecc_out_temp[5:0]};
```

### 2.4 Conditional operator

```systemverilog
assign dout = single_ecc_error ? corrected : din;   // a 2-to-1 mux
```

- **Pitfall:** width mismatches. Verilator warns (`WIDTHEXPAND`,
  `WIDTHTRUNC`); VeeR's code writes widths explicitly (`dout[WIDTH-1:0]`).
- **Check:** what does `|{8{1'b0}}` evaluate to? (Answer: `0`.)

## 3. `always_comb` and `case`

Used 117 times, mostly for decoders and muxes too large for one `assign`.

```systemverilog
always_comb begin
  result = '0;                    // default first: no latches
  unique case (op)
    2'b00: result = a + b;
    2'b01: result = a - b;
    2'b10: result = a & b;
    default: result = a | b;
  endcase
end
```

- **Rule:** assign every output on every path (a default at the top). A
  missing assignment creates a latch.
- `unique case` tells tools exactly one item matches; simulators warn if not.

## 4. Registers the VeeR way: the `rvdff` library

**Kitchen:** instead of each cook building their own fridge, the kitchen buys
one standard fridge model and installs 600 of them.

VeeR writes almost no `always_ff` directly. Every register is an instance of a
flip-flop module from `design/lib/beh_lib.sv`:

```systemverilog
// design/lib/beh_lib.sv, line 19 (simplified)
module rvdff #( parameter WIDTH=1, SHORT=0 ) (
  input  logic [WIDTH-1:0] din,
  input  logic             clk,
  input  logic             rst_l,       // active-LOW reset
  output logic [WIDTH-1:0] dout
);
  always_ff @(posedge clk or negedge rst_l) begin
    if (rst_l == 0) dout[WIDTH-1:0] <= 0;
    else            dout[WIDTH-1:0] <= din[WIDTH-1:0];
  end
endmodule
```

The family includes `rvdff` (plain), `rvdffs` (with enable), `rvdffe`
(enable + clock gating), `rvdffsc` (enable + clear) and others.

Why a library: one place to change reset style, add clock gating, or swap in a
technology-specific cell for every register at once.

- **Naming:** signals end in the pipeline stage they belong to —
  `access_fault_m` (M stage) registered into `access_fault_r` (R stage).
- **Reset:** `rst_l` is **active low** (`_l` suffix). Reset when `rst_l == 0`.
- **Check:** how many flip-flops does `rvdff #(4) x (...)` create? (Answer: 4.)

## 5. Parameters, packages and the `pt` struct

### 5.1 `parameter` and `localparam`

```systemverilog
module rvdff #( parameter WIDTH=1 ) ( ... );     // set by the instantiator
localparam DCCM_INDEX_DEPTH = ...;               // computed, cannot be overridden
```

### 5.2 The `pt` parameter struct

VeeR is configurable (memory sizes, bus type, features). A Perl script
(`configs/veer.config`) writes every setting into one generated file,
`el2_param.vh`, which becomes a single parameter named `pt`:

```systemverilog
// generated el2_param.vh (excerpt, as a comment in the file)
// parameter el2_param_t pt = '{
//    BHT_ADDR_HI : 8'h09,
//    ...
//    DCCM_SIZE   : 14'h0040,     // 64 KB in this configuration
```

Modules include it in their parameter list and read fields with a dot:

```systemverilog
module el2_lsu_dccm_mem
  import el2_pkg::*;
#(
`include "el2_param.vh"
)( ... );
  ... pt.DCCM_NUM_BANKS ... pt.DCCM_FDATA_WIDTH ...
```

### 5.3 Packages and `import`

A `package` groups types and constants shared by many modules.
`import el2_pkg::*;` makes everything in `el2_pkg` visible (53 imports in VeeR).

- **Check:** where would you change the DCCM size for the whole core?
  (Answer: in the configuration, which regenerates `pt`; never in the modules.)

## 6. Packed structs and enums

A packed struct names the fields of a bus. It is still a plain bit vector
underneath.

```systemverilog
// design/include/el2_def.sv, line 8
typedef struct packed {
  logic        trace_rv_i_valid_ip;
  logic [31:0] trace_rv_i_insn_ip;
  logic [31:0] trace_rv_i_address_ip;
  logic        trace_rv_i_exception_ip;
  logic [4:0]  trace_rv_i_ecause_ip;
  logic        trace_rv_i_interrupt_ip;
  logic [31:0] trace_rv_i_tval_ip;
} el2_trace_pkt_t;
```

Use: `el2_trace_pkt_t pkt; ... pkt.trace_rv_i_valid_ip ...`. The first field
is the most significant bits.

`typedef enum` (12 uses) names states and codes; `msv4` covers it.

- **Check:** how many bits wide is `el2_trace_pkt_t`?
  (Answer: 1+32+32+1+5+1+32 = 104.)

## 7. `generate` loops (`genvar`)

Builds repeated hardware. The DCCM has 8 banks, created by one loop:

```systemverilog
// testbench/uvm/mem/hdl/tbench_top.sv (DCCM wiring, excerpt)
for (genvar i = 0; i < pt.DCCM_NUM_BANKS; i++) begin : gen_dccm_mem
  el2_ram #(DCCM_INDEX_DEPTH, 39) ram (
    .CLK(mem_export.clk), .WE(mem_export.dccm_wren_bank[i]),
    .ADR(mem_export.dccm_addr_bank[i]), .D(dccm_wr_fdata_bank[i]),
    .Q(dccm_bank_fdout[i]), ...
  );
end : gen_dccm_mem
```

- The label (`gen_dccm_mem`) names each copy: `gen_dccm_mem[3].ram`.
- `generate if` picks hardware by parameter (`if (SHORT == 1) ... else ...` in
  `rvdff`).

## 8. Interfaces and `modport`

**Kitchen:** a standard serving hatch with labelled slots. Each side gets a
view saying which slots it may fill and which it may only read.

```systemverilog
// design/lib/el2_mem_if.sv (structure)
interface el2_mem_if;
  logic clk;
  logic [pt.DCCM_NUM_BANKS-1:0] dccm_wren_bank;
  ...
  modport veer_dccm ( input clk, output dccm_wren_bank, ... );  // core's view
  ...
endinterface
```

The core connects one port of type `el2_mem_if.veer_dccm` instead of dozens of
separate wires. `el2_mem_if` has 14 modports, one per user.

## 9. The preprocessor: `` `include ``, `` `define ``, `` `ifdef ``

Runs before compilation, as text substitution.

```systemverilog
`include "el2_param.vh"        // paste a file here
`define RV_ICCM_ENABLE         // define a flag (usually from the config)
`ifdef RV_ICCM_ENABLE          // keep this code only if the flag exists
   ... ICCM logic ...
`endif
`ifdef VERILATOR               // code only for the Verilator simulator
```

VeeR has 151 `` `ifdef `` blocks. Most select optional features (ICCM, caches,
lockstep). When reading a file, check which flags are defined in
`common_defines.vh` for the configuration being run.

## 10. Packed multi-dimensional arrays

```systemverilog
logic [pt.DCCM_NUM_BANKS-1:0][pt.DCCM_FDATA_WIDTH-1:0] dccm_wr_fdata_bank;
//     8 banks                ×  39 bits each   = 312 bits, one vector
assign bank3 = dccm_wr_fdata_bank[3];          // 39 bits
```

Index from the left: the first `[ ]` picks the bank, the second the bit.

## 11. Functions

Pure combinational helpers (17 in VeeR's RTL). Same rules as `always_comb`:
no timing, every path returns a value.

---

# Part 2 — Reading the testbenches

## 12. Simulation-only constructs

The CPU testbench (`testbench/tb_top.sv`) and the UVM testbench use code that
never becomes hardware:

| Construct | VeeR example | Purpose |
|---|---|---|
| `initial` | Load program, open log files | Runs once at time 0 |
| `#5`, `always #5 clk = ~clk;` | UVM `tbench_top.sv` clock | Delays (needs Verilator `--timing`) |
| `$readmemh("program.hex", lmem.mem)` | `tb_top.sv` line 2552 | Load the compiled test into the memory model |
| `$fopen` / `$fwrite` | `exec.log`, `console.log` | Write log files |
| `$display`, `$write` | `TEST_PASSED` | Print to the simulation log |
| `$finish` | After the mailbox receives 0xFF | End simulation |
| Hierarchical reference | `` `DEC.tlu.minstretl `` | Read a signal deep inside the design (for minstret/mcycle) |

**How a C or assembly test reaches SystemVerilog:** GCC compiles the program to
an `.elf`, it is converted to `program.hex` (a text file of hex bytes), and the
testbench loads it with `$readmemh` into the memory model at time 0. The CPU
then fetches its first instruction from that memory. Chapter `o1` teaches this
in full.

## 13. Classes, handles and inheritance

**Kitchen:** a class is an order form template; an object is one filled-in
form; a handle is a note saying where that form is.

```systemverilog
class dccm_transaction_sequence_item extends uvm_sequence_item;   // inheritance
  rand bit [15:0] addr;
  ...
endclass

dccm_transaction_sequence_item t;   // a handle: no object yet
t = new();                          // create one object
```

**The handle trap (the bug behind `vf6`):** if the monitor creates one object
in `new()` and sends the *same handle* every time, every receiver holds the
same object, overwritten again and again:

```systemverilog
// dccm_monitor.sv: created once, reused for every transaction
transaction = new();                         // in new()
...
transaction_analisys_port.write(transaction); // same object every time
```

- **Check:** a queue holds 20 handles to the same object. How many different
  transactions does it contain? (Answer: one.)

## 14. Randomization

```systemverilog
rand bit [15:0] addr;          // randomize() picks a value
bit wr_en;                     // not rand: the sequence sets it by hand
req.randomize();               // returns 1 on success
```

Constraints (`constraint c { addr < 16'h100; }`) limit the random values.
Verilator 5.052 supports `randomize()` and constraints; the DCCM testbench
compiles with `-Wno-CONSTRAINTIGN` to silence constraint warnings — check
behaviour before teaching complex constraints.

## 15. Virtual interfaces and `uvm_config_db`

Classes cannot hold a module port, so the testbench passes them a **virtual
interface** — a handle to an interface instance — through the configuration
database:

```systemverilog
// dccm_driver.sv
virtual dccm_interface memory_vif;
if (!uvm_config_db#(virtual dccm_interface)::get(this, "", "memory_vif", memory_vif))
  `uvm_fatal("NO_VIF", "virtual interface must be set ...");
```

## 16. UVM building blocks

Covered in depth in chapter `vf4`. The SystemVerilog you need to read them:

| UVM piece | SystemVerilog it relies on |
|---|---|
| `` `uvm_component_utils(x) `` | Macro (§9) registering the class with the factory |
| `x::type_id::create("name", this)` | Static method returning a new object (factory) |
| `build_phase`, `connect_phase`, `run_phase`, `report_phase` | Virtual methods UVM calls in order |
| `uvm_analysis_port` / `write()` | Broadcast a handle (§13 trap applies) |
| `` `uvm_info(id, msg, UVM_LOW) `` | Macro printing with a verbosity level |
| `raise_objection` / `drop_objection` | Keep the simulation running until the test is done |

---

# Part 3 — Writing VeeR-style RTL (for the Design track `vd*`)

Rules for code learners write and drop into VeeR:

1. Declare everything as `logic`; give every bus an explicit width.
2. Combinational logic: `assign` for expressions, `always_comb` with a default
   for decoders. No latches.
3. Registers: instantiate `rvdff` / `rvdffs` / `rvdffe` with `rst_l` (active
   low). Do not write your own `always_ff` unless the exercise asks for it.
4. Name signals with their pipeline stage suffix (`_d`, `_x`, `_m`, `_r`) when
   working inside a pipeline.
5. Read configuration from `pt.*`; never hard-code sizes that `pt` provides.
6. Synthesizable subset only: no `#` delays, no `initial`, no `$display` in RTL.
7. Compile clean under Verilator with `-Wall`; explain any warning you waive.
8. Prove it: run the reference-model comparison (Design track) and the CPU
   tests if the block is integrated into the core.

---

# Verilator notes for this project

| Topic | What to know |
|---|---|
| Versions | Lessons use Verilator **5.020**; the VeeR Lab uses **5.052** |
| 2-state | `x` and `z` become 0/1; X-propagation cannot be shown live |
| `--timing` | Needed for `#` delays and `@(posedge ...)` in testbenches |
| Compile flow | Verilator turns SV into C++; g++ compiles it into an executable; running the executable is the simulation |
| Warnings | `WIDTH*`, `UNUSED`, `CASEINCOMPLETE` are common; read them, do not silence them blindly |
| SVA / covergroups | Partial support; prove a feature on 5.052 before relying on it |

---

# Self-assessment

Answer these before starting chapter `o1`. If more than two are unclear,
revisit the listed sections.

1. What does `{4{2'b10}}` evaluate to? (§2.2 — `8'b10101010`)
2. What does `^8'b0000_0111` evaluate to? (§2.3 — `1`: three ones, odd parity)
3. Why does VeeR write `rvdff #(8) r (...)` instead of an `always_ff`? (§4)
4. Is `rst_l` reset when it is 0 or 1? (§4 — 0)
5. Where does `pt.DCCM_SIZE` get its value? (§5.2 — the generated `el2_param.vh`)
6. In a packed struct, which field is in the most significant bits? (§6 — the first)
7. What is `gen_dccm_mem[2].ram`? (§7 — the third copy of the RAM made by the generate loop)
8. What does `` `ifdef VERILATOR `` do? (§9)
9. How does `hello_world` get from C/assembly into the simulated memory? (§12 — GCC → hex → `$readmemh`)
10. Twenty sends of one handle: how many transactions does the receiver see? (§13 — one)
