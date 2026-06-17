(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop17',
  title: 'Ch.17 — Register Model (RAL)',
  icon: '🗂️',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop17l1',
      title: 'L1 — One Object Per Register',
      files: [
        {
          name: 'spi_if.sv',
          from: 'spivoop4-spivoop4l1-design',
          fallback:
`interface spi_if;
  logic sclk, cs_n, mosi, miso;
endinterface`
        },
        {
          name: 'spi_slave.sv',
          content:
`module spi_slave (
  input  logic       sclk, cs_n, mosi,
  output logic       miso,
  output logic [7:0] rx_byte
);
  logic [7:0] shift_reg = 8'h00;
  always_ff @(posedge sclk) begin
    if (!cs_n) shift_reg <= {shift_reg[6:0], mosi};
  end
  assign rx_byte = shift_reg;
  assign miso    = 1'b0;
endmodule`
        }
      ],
      verilatorFlags: { simulator: 'verilator', timing: '--timing' },
      theory:
`<h2>Register Abstraction Layer — One Object Per Register</h2>
<p>Real SPI controllers have programmable registers: a Control Register sets CPOL/CPHA and enables the block; a Data Register holds TX/RX data; a Status Register reports BUSY and RX_FULL. Without a register model, every test hardcodes addresses and bit masks. Add one more field to the control register and every test breaks. A register model provides named fields and centralised addresses. Tests never see raw bit patterns.</p>

<h3>SPI register map</h3>
<table class="truth-table">
  <tr><th>Name</th><th>Addr</th><th>Reset</th><th>Fields [7:0]</th></tr>
  <tr><td>CR</td><td>8'h00</td><td>8'h00</td><td>[3]=cpol [2]=cpha [0]=en</td></tr>
  <tr><td>DR</td><td>8'h04</td><td>8'h00</td><td>[7:0]=tx_data</td></tr>
  <tr><td>SR</td><td>8'h08</td><td>8'h00</td><td>[1]=rx_full [0]=busy (RO)</td></tr>
</table>

<h3>Part 1 — The base register class (line by line)</h3>
<pre class="code-block">class spi_register;
  string      name;       // human-readable label for $display
  logic [7:0] addr;       // bus address this register lives at
  logic [7:0] value;      // current (shadow) value held by the model
  logic [7:0] reset_val;  // value after hardware reset
  // shadow value: the model tracks what it last wrote so tests can read back
  // without issuing a bus transaction. In UVM this is called the "mirror".

  function new(string n, logic [7:0] a, logic [7:0] rv);
    name      = n;    // store name
    addr      = a;    // store address
    value     = rv;   // initialise to reset value
    reset_val = rv;   // remember reset value for reset()
  endfunction

  function void write(logic [7:0] data);
    value = data;     // backdoor write: update model only, no bus transaction
  endfunction         // In a frontdoor model, this would also drive the APB/AHB bus.

  function logic [7:0] read();
    return value;     // backdoor read: return the shadow value
  endfunction

  function void reset();
    value = reset_val;   // restore the reset value
  endfunction

  function void print();
    $display("%s @ 8'h%0h : 8'b%08b (8'h%0h)", name, addr, value, value);
    // %08b → binary formatted to exactly 8 digits (leading zeros included)
  endfunction
endclass</pre>

<h3>Part 2 — Control Register with named field accessors (line by line)</h3>
<p>CR has three meaningful bits. Instead of every test writing <code>cr.write(cr.read() | 8'h01)</code> to set EN, the model provides named setters and getters. The field position is defined once; all tests call <code>cr.set_en(1)</code>.</p>
<pre class="code-block">class spi_cr_reg extends spi_register;
  // CR field layout: [7:4]=reserved  [3]=cpol  [2]=cpha  [0]=en

  function new();
    super.new("CR", 8'h00, 8'h00);  // name=CR, addr=0x00, reset=0x00
    // super.new() → runs spi_register constructor before this class
  endfunction

  // --- Getters: extract individual bits from value ---
  function bit get_en();   return value[0]; endfunction
  // value[0] → bit 0 is the EN field per the register map above

  function bit get_cpha(); return value[2]; endfunction
  function bit get_cpol(); return value[3]; endfunction

  // --- Setters: write a single bit without disturbing other fields ---
  function void set_en(bit v);
    value[0] = v;    // write only bit 0; bits 1,2,3 are unchanged
  endfunction        // Compare: value = (value & 8'hFE) | v; — same effect, less clear

  function void set_cpha(bit v); value[2] = v; endfunction
  function void set_cpol(bit v); value[3] = v; endfunction

endclass</pre>

<h3>Part 3 — The register model aggregator (line by line)</h3>
<pre class="code-block">class spi_reg_model;
  spi_cr_reg   cr;   // Control Register (typed specifically so setters are accessible)
  spi_register dr;   // Data Register    (no special fields needed — base class is fine)
  spi_register sr;   // Status Register

  function new();
    cr = new();                          // spi_cr_reg constructor (calls super internally)
    dr = new("DR", 8'h04, 8'h00);       // name, addr, reset_val
    sr = new("SR", 8'h08, 8'h00);
  endfunction

  function void reset_all();
    cr.reset(); dr.reset(); sr.reset();  // restore every register to reset value
  endfunction

  function void print_all();
    cr.print(); dr.print(); sr.print();
  endfunction
endclass</pre>

<h3>Frontdoor vs backdoor access</h3>
<table class="truth-table">
  <tr><th>Access type</th><th>How it works</th><th>When to use</th></tr>
  <tr><td><strong>Backdoor</strong></td><td>Set/get the model’s shadow value directly in software — no bus transaction</td><td>Initial setup, fast reset checking, early verification before bus exists</td></tr>
  <tr><td><strong>Frontdoor</strong></td><td>Drive the actual bus (APB, AHB, SPI) to write/read the physical register in the DUT</td><td>Full integration testing, verifying the bus decode logic itself</td></tr>
</table>
<p>This chapter builds the backdoor model. Ch.18 wires it to a bus sequence for frontdoor access.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build all three classes. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        '--- Class 1: spi_register ---',
        'Declare class spi_register; with four members: string name, logic[7:0] addr, value, reset_val',
        'Write function new(string n, logic[7:0] a, logic[7:0] rv) assigning all four members',
        'Write function void write(logic[7:0] data): value = data;',
        'Write function logic[7:0] read(): return value;',
        'Write function void reset(): value = reset_val;',
        'Write function void print(): $display with %s, addr in hex, value in %08b and hex',
        'endclass',
        '--- Class 2: spi_cr_reg extends spi_register ---',
        'Write function new(): call super.new("CR", 8\'h00, 8\'h00)',
        'Add getter functions: get_en() return value[0], get_cpha() return value[2], get_cpol() return value[3]',
        'Add setter functions: set_en(bit v) value[0]=v, set_cpha, set_cpol',
        'endclass',
        '--- Class 3: spi_reg_model ---',
        'Declare three members: spi_cr_reg cr; spi_register dr; spi_register sr;',
        'Write function new() constructing all three: cr=new(), dr=new("DR",8\'h04,8\'h00), sr=new("SR",8\'h08,8\'h00)',
        'Write reset_all() and print_all()',
        'endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — see register dump, PASS lines for each verification, PASS: register model verified at end.',
      ],

      hint:
`class spi_register;
  string      name;
  logic [7:0] addr;
  logic [7:0] value;
  logic [7:0] reset_val;

  function new(string n, logic [7:0] a, logic [7:0] rv);
    name = n; addr = a; value = rv; reset_val = rv;
  endfunction

  function void        write(logic [7:0] data); value = data;      endfunction
  function logic [7:0] read();                  return value;      endfunction
  function void        reset();                 value = reset_val; endfunction

  function void print();
    $display("%s @ 8'h%0h : 8'b%08b (8'h%0h)", name, addr, value, value);
  endfunction
endclass

class spi_cr_reg extends spi_register;
  function new(); super.new("CR", 8'h00, 8'h00); endfunction

  function bit  get_en();         return value[0]; endfunction
  function bit  get_cpha();       return value[2]; endfunction
  function bit  get_cpol();       return value[3]; endfunction
  function void set_en  (bit v);  value[0] = v;   endfunction
  function void set_cpha(bit v);  value[2] = v;   endfunction
  function void set_cpol(bit v);  value[3] = v;   endfunction
endclass

class spi_reg_model;
  spi_cr_reg   cr;
  spi_register dr;
  spi_register sr;

  function new();
    cr = new();
    dr = new("DR", 8'h04, 8'h00);
    sr = new("SR", 8'h08, 8'h00);
  endfunction

  function void reset_all();  cr.reset();  dr.reset();  sr.reset();  endfunction
  function void print_all();  cr.print();  dr.print();  sr.print();  endfunction
endclass`,

      design:
`// Write three classes here.
//
// 1. class spi_register
//    Members: string name; logic[7:0] addr, value, reset_val;
//    new(string n, logic[7:0] a, logic[7:0] rv)
//    write(), read(), reset(), print()
//
// 2. class spi_cr_reg extends spi_register
//    new() -> super.new("CR", 8'h00, 8'h00)
//    get_en/cpha/cpol()   -> return value[bit]
//    set_en/cpha/cpol(v)  -> value[bit] = v
//
// 3. class spi_reg_model
//    spi_cr_reg cr; spi_register dr; spi_register sr;
//    new() constructs all three
//    reset_all(), print_all()
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  // No DUT needed — this chapter tests the software register model
  initial begin
    spi_reg_model rmodel;
    int fails = 0;
    rmodel = new();

    // 1. Verify reset state
    $display("=== Reset state ===");
    rmodel.print_all();
    if (rmodel.cr.read() === 8'h00 && rmodel.dr.read() === 8'h00)
      $display("PASS reset values correct");
    else begin
      $display("FAIL reset values wrong"); fails++;
    end

    // 2. Set EN bit via named setter
    rmodel.cr.set_en(1);
    if (rmodel.cr.get_en() === 1'b1 && rmodel.cr.read() === 8'h01)
      $display("PASS set_en: value=8'h%0h", rmodel.cr.read());
    else begin
      $display("FAIL set_en: value=8'h%0h", rmodel.cr.read()); fails++;
    end

    // 3. Set CPOL without disturbing EN
    rmodel.cr.set_cpol(1);
    if (rmodel.cr.get_cpol() === 1'b1 && rmodel.cr.get_en() === 1'b1)
      $display("PASS set_cpol: CR=8'b%08b  en=%0b cpol=%0b",
               rmodel.cr.read(), rmodel.cr.get_en(), rmodel.cr.get_cpol());
    else begin
      $display("FAIL set_cpol changed EN"); fails++;
    end

    // 4. Write to DR
    rmodel.dr.write(8'hA5);
    if (rmodel.dr.read() === 8'hA5)
      $display("PASS dr write/read: 8'h%0h", rmodel.dr.read());
    else begin
      $display("FAIL dr write/read"); fails++;
    end

    // 5. Reset all registers
    rmodel.reset_all();
    if (rmodel.cr.read() === 8'h00 && rmodel.dr.read() === 8'h00)
      $display("PASS reset_all: all back to 8'h00");
    else begin
      $display("FAIL reset_all"); fails++;
    end

    if (fails == 0)
      $display("PASS: register model verified");
    else
      $display("FAIL: %0d check(s) failed", fails);

    $finish;
  end
endmodule`,

      expected: [
        "PASS reset values correct",
        "PASS set_cpol: CR=",
        "PASS: register model verified"
      ]
    }
  ]
});
