// Module 4 — Advanced RTL Design
// To edit this module, change only this file.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m4",
  title: "Advanced RTL Design",
  icon: "🔬",
  level: "intermediate",
  lessons: [
    {
      id: "m4l1",
      title: "Parameters and Generate",
      theory: `
<h2>Parameters and Generate</h2>
<p>Parameters make modules reusable. Generate blocks create repeated hardware structures programmatically.</p>

<h3>Parameters</h3>
<pre class="code-block">module adder #(parameter WIDTH=8)(
  input  [WIDTH-1:0] a, b,
  output [WIDTH-1:0] sum
);
  assign sum = a + b;
endmodule

// Instantiate with different widths:
adder #(8)  u8  (.a(a8), .b(b8), .sum(s8));
adder #(32) u32 (.a(a32),.b(b32),.sum(s32));</pre>

<h3>Generate — for loops</h3>
<pre class="code-block">genvar i;
generate
  for (i=0; i<8; i=i+1) begin : gen_block
    // hardware instantiation repeated 8 times
    and_gate ga (.a(bus_a[i]), .b(bus_b[i]), .y(out[i]));
  end
endgenerate</pre>

<h3>Generate — if/case</h3>
<pre class="code-block">generate
  if (WIDTH == 8)
    small_adder u(.a(a),.b(b),.s(s));
  else
    large_adder u(.a(a),.b(b),.s(s));
endgenerate</pre>
      `,
      tasks: ["Build a parameterized N-bit adder-subtractor", "Use parameter for width", "Test 8-bit and 16-bit modes"],
      hint: "Subtraction = addition with inverted b and cin=1. Use cin to select add/sub.",
      design: `module adder_sub #(parameter N=8)(
  input  wire          clk,
  input  wire [N-1:0]  a, b,
  input  wire          sub,   // 0=add, 1=subtract
  output wire [N-1:0]  result,
  output wire          overflow,
  output wire          carry_out
);

  wire [N:0] full;
  wire [N-1:0] b_eff;

  // XOR each bit of b with sub (inverts b when sub=1)
  genvar i;
  generate
    for (i=0; i<N; i=i+1) begin : xor_gen
      assign b_eff[i] = b[i] ^ sub;
    end
  endgenerate

  // Add: a + b_eff + sub (sub as carry in completes 2's complement)
  assign full      = a + b_eff + sub;
  assign result    = full[N-1:0];
  assign carry_out = full[N];
  // Signed overflow: when signs of inputs same but result different sign
  assign overflow  = (a[N-1] == b_eff[N-1]) && (result[N-1] != a[N-1]);

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [7:0] a, b;
  reg        sub, clk=0;
  wire [7:0] result;
  wire       overflow, carry_out;

  adder_sub #(8) dut(.clk(clk),.a(a),.b(b),.sub(sub),.result(result),.overflow(overflow),.carry_out(carry_out));

  initial begin
    $display("8-bit Adder/Subtractor");
    sub=0;a=8'd50; b=8'd30; #5;
    $display("ADD: %0d + %0d = %0d (ov=%b)",a,b,result,overflow);

    sub=1;a=8'd50; b=8'd30; #5;
    $display("SUB: %0d - %0d = %0d (ov=%b)",a,b,result,overflow);

    sub=1;a=8'd10; b=8'd30; #5;
    $display("SUB: %0d - %0d = %0d (ov=%b)",a,b,$signed(result),overflow);

    sub=0;a=8'd200;b=8'd100;#5;
    $display("ADD: %0d + %0d = %0d (carry=%b overflow=%b)",a,b,result,carry_out,overflow);

    $finish;
  end
endmodule`,
      expected: ["ADD: 50 + 30 = 80", "SUB: 50 - 30 = 20"]
    },

    {
      id: "m4l2",
      title: "Memory: ROM, RAM, Register File",
      theory: `
<h2>Memory in Verilog</h2>

<h3>ROM (Read-Only Memory)</h3>
<p>Initialized at compile time using a case statement or $readmemh. Output is purely combinational.</p>
<pre class="code-block">reg [7:0] rom [0:15];  // 16 locations, 8-bit wide

initial $readmemh("rom.hex", rom);

assign data_out = rom[address];</pre>

<h3>Synchronous RAM</h3>
<p>Write on clock edge, read combinationally (asynchronous read) or on clock edge (synchronous read). Synchronous read infers block RAM in FPGAs.</p>
<pre class="code-block">// Synchronous write, asynchronous read
always @(posedge clk)
  if (we) mem[addr] <= data_in;

assign data_out = mem[addr];</pre>

<h3>Register File</h3>
<p>Used in CPUs — multiple read ports and write ports. Classic 32-register RISC register file has 2 read ports and 1 write port.</p>

<h3>FPGA Inference</h3>
<ul>
  <li>Small memories → Distributed RAM (LUTs)</li>
  <li>Larger memories → Block RAM (BRAM)</li>
  <li>Synchronous read → BRAM inference</li>
</ul>
      `,
      tasks: ["Build a 32x8 register file", "2 read ports, 1 write port", "Test simultaneous read and write"],
      hint: "Register 0 is hardwired to 0 in RISC-V style. Check rd_addr1 != 0 before reading.",
      design: `module register_file #(
  parameter ADDR_W = 5,   // 2^5 = 32 registers
  parameter DATA_W = 8
)(
  input  wire             clk,
  // Write port
  input  wire             we,
  input  wire [ADDR_W-1:0] wr_addr,
  input  wire [DATA_W-1:0] wr_data,
  // Read port 1
  input  wire [ADDR_W-1:0] rd_addr1,
  output wire [DATA_W-1:0] rd_data1,
  // Read port 2
  input  wire [ADDR_W-1:0] rd_addr2,
  output wire [DATA_W-1:0] rd_data2
);

  reg [DATA_W-1:0] regs [0:(1<<ADDR_W)-1];

  integer k;
  initial begin
    for (k=0; k<(1<<ADDR_W); k=k+1)
      regs[k] = 0;
  end

  // Write (synchronous)
  always @(posedge clk)
    if (we && wr_addr != 0)   // reg[0] always = 0
      regs[wr_addr] <= wr_data;

  // Read (asynchronous — combinational)
  assign rd_data1 = (rd_addr1 == 0) ? 0 : regs[rd_addr1];
  assign rd_data2 = (rd_addr2 == 0) ? 0 : regs[rd_addr2];

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        clk=0, we;
  reg  [4:0] wr_addr, rd_addr1, rd_addr2;
  reg  [7:0] wr_data;
  wire [7:0] rd_data1, rd_data2;

  register_file dut(.clk(clk),.we(we),
    .wr_addr(wr_addr),.wr_data(wr_data),
    .rd_addr1(rd_addr1),.rd_data1(rd_data1),
    .rd_addr2(rd_addr2),.rd_data2(rd_data2));

  always #5 clk=~clk;

  initial begin
    we=0;
    // write to several registers
    we=1; wr_addr=5'd1;  wr_data=8'hAA; @(posedge clk);#1;
          wr_addr=5'd2;  wr_data=8'hBB; @(posedge clk);#1;
          wr_addr=5'd31; wr_data=8'hFF; @(posedge clk);#1;
          wr_addr=5'd0;  wr_data=8'hDE; @(posedge clk);#1; // should not write
    we=0;

    // read back
    rd_addr1=5'd1;  rd_addr2=5'd2;  #5;
    $display("reg[1]=%02h  reg[2]=%02h",rd_data1,rd_data2);

    rd_addr1=5'd31; rd_addr2=5'd0;  #5;
    $display("reg[31]=%02h  reg[0]=%02h (reg0 hardwired 0)",rd_data1,rd_data2);

    $finish;
  end
endmodule`,
      expected: ["reg[1]=aa  reg[2]=bb", "reg[31]=ff  reg[0]=00"]
    },

    {
      id: "m4l3",
      title: "FIFO Design",
      theory: `
<h2>FIFO — First In First Out Buffer</h2>
<p>A FIFO is one of the most important building blocks in digital design. It buffers data between two parts of a system running at different rates or in different clock domains.</p>

<h3>Key Signals</h3>
<ul>
  <li><code>wr_en</code> — write enable (push data in)</li>
  <li><code>rd_en</code> — read enable (pop data out)</li>
  <li><code>full</code> — cannot write more</li>
  <li><code>empty</code> — nothing to read</li>
  <li><code>wr_data</code> — data going in</li>
  <li><code>rd_data</code> — data coming out</li>
</ul>

<h3>Circular Buffer Implementation</h3>
<p>Use a memory array with read and write pointers. When a pointer reaches the end, it wraps to 0.</p>
<pre class="code-block">full  = (wr_ptr + 1) == rd_ptr
empty = (wr_ptr == rd_ptr)</pre>

<h3>Pointer Width Trick</h3>
<p>Use N+1 bit pointers for a depth-N FIFO. This allows distinguishing full from empty when pointers are equal:</p>
<pre class="code-block">// N=3 bits -> depth=8 -> use 4-bit pointers
empty = (wr_ptr == rd_ptr)
full  = (wr_ptr[N] != rd_ptr[N]) && (wr_ptr[N-1:0] == rd_ptr[N-1:0])</pre>
      `,
      tasks: ["Build an 8-deep synchronous FIFO", "Implement full/empty flags", "Test write-then-read, overflow protection"],
      hint: "Use (DEPTH+1)-bit pointers. full when MSBs differ but lower bits same. empty when all bits same.",
      design: `module sync_fifo #(
  parameter DEPTH = 8,
  parameter WIDTH = 8
)(
  input  wire             clk, rst,
  input  wire             wr_en, rd_en,
  input  wire [WIDTH-1:0] wr_data,
  output reg  [WIDTH-1:0] rd_data,
  output wire             full,
  output wire             empty,
  output wire [$clog2(DEPTH):0] count
);

  localparam PTR_W = $clog2(DEPTH) + 1;

  reg [WIDTH-1:0]   mem [0:DEPTH-1];
  reg [PTR_W-1:0]   wr_ptr = 0, rd_ptr = 0;

  assign full  = (wr_ptr[PTR_W-1] != rd_ptr[PTR_W-1]) &&
                 (wr_ptr[PTR_W-2:0] == rd_ptr[PTR_W-2:0]);
  assign empty = (wr_ptr == rd_ptr);
  assign count = wr_ptr - rd_ptr;

  always @(posedge clk or posedge rst) begin
    if (rst) begin
      wr_ptr <= 0; rd_ptr <= 0;
    end else begin
      if (wr_en && !full) begin
        mem[wr_ptr[PTR_W-2:0]] <= wr_data;
        wr_ptr <= wr_ptr + 1;
      end
      if (rd_en && !empty) begin
        rd_data <= mem[rd_ptr[PTR_W-2:0]];
        rd_ptr  <= rd_ptr + 1;
      end
    end
  end

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        clk=0,rst=1,wr_en=0,rd_en=0;
  reg  [7:0] wr_data;
  wire [7:0] rd_data;
  wire       full,empty;
  wire [3:0] count;

  sync_fifo #(8,8) dut(.clk(clk),.rst(rst),.wr_en(wr_en),.rd_en(rd_en),
    .wr_data(wr_data),.rd_data(rd_data),.full(full),.empty(empty),.count(count));

  always #5 clk=~clk;
  integer i;

  initial begin
    #12 rst=0;
    $display("Writing 8 values...");
    wr_en=1;
    for(i=0;i<8;i=i+1) begin
      wr_data=i*10; @(posedge clk);#1;
      $display("  wrote %0d  count=%0d full=%b",wr_data,count,full);
    end
    wr_en=0;
    $display("FIFO full=%b count=%0d",full,count);

    $display("\\nReading all values...");
    rd_en=1;
    for(i=0;i<8;i=i+1) begin
      @(posedge clk);#1;
      $display("  read=%0d count=%0d",rd_data,count);
    end
    rd_en=0;
    $display("FIFO empty=%b",empty);
    $finish;
  end
endmodule`,
      expected: ["full=1", "empty=1", "wrote 0"]
    }
  ]
});
