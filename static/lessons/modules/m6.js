// Module 6 — Chip Design Concepts
// To edit this module, change only this file.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m6",
  title: "Chip Design Concepts",
  icon: "🏗",
  level: "advanced",
  lessons: [
    {
      id: "m6l1",
      title: "Clock Domain Crossing",
      theory: `
<h2>Clock Domain Crossing (CDC)</h2>
<p>In real chips, different subsystems run at different clock frequencies. When data passes between these domains, metastability can occur — a flip-flop output gets stuck between 0 and 1, causing catastrophic failure.</p>

<h3>Metastability</h3>
<p>When a flip-flop's setup/hold time is violated, its output is undefined for a time called the <strong>resolution time</strong>. If not resolved before the next clock edge, the error propagates.</p>

<h3>Solutions</h3>
<ul>
  <li><strong>2-FF Synchronizer</strong> — simplest, for single-bit signals</li>
  <li><strong>Handshake</strong> — for multi-bit data, adds latency</li>
  <li><strong>Async FIFO</strong> — for streaming data between domains (uses Gray code pointers)</li>
  <li><strong>DMUX</strong> — for multi-bit with enable</li>
</ul>

<h3>2-FF Synchronizer</h3>
<pre class="code-block">// First FF may go metastable, second FF sees resolved value
always @(posedge clk_b) begin
  sync1 <= async_signal;  // may go metastable
  sync2 <= sync1;          // resolved by now
end
output = sync2;</pre>

<h3>Gray Code for CDC Pointers</h3>
<p>Gray code changes only one bit at a time, so even if a CDC event occurs during a pointer update, at most 1 bit can be wrong — resulting in off-by-one, not corruption.</p>
      `,
      tasks: ["Implement a 2-FF synchronizer", "Simulate clock domain crossing", "Observe why single FF is dangerous"],
      hint: "Drive async_in from clk_a domain. Synchronize into clk_b domain with 2 chained FFs.",
      design: `// 2-FF Synchronizer — safe CDC for single-bit signals
module cdc_sync2 (
  input  wire clk_b,     // destination clock
  input  wire rst_b,     // destination reset
  input  wire async_in,  // signal from other domain
  output wire sync_out   // synchronized output
);

  reg ff1, ff2;

  // Both FFs in destination clock domain
  // ff1 may go metastable; ff2 sees resolved value
  always @(posedge clk_b or posedge rst_b) begin
    if (rst_b) begin ff1 <= 0; ff2 <= 0; end
    else begin
      ff1 <= async_in;   // may briefly be metastable
      ff2 <= ff1;         // resolved
    end
  end

  assign sync_out = ff2;

endmodule

// Gray code converter (for async FIFO pointers)
module bin2gray #(parameter N=4)(
  input  wire [N-1:0] bin,
  output wire [N-1:0] gray
);
  assign gray = bin ^ (bin >> 1);
endmodule

module gray2bin #(parameter N=4)(
  input  wire [N-1:0] gray,
  output wire [N-1:0] bin
);
  genvar i;
  generate
    for (i=0; i<N; i=i+1)
      assign bin[i] = ^gray[N-1:i];
  endgenerate
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg clk_a=0, clk_b=0, rst=1;
  reg async_sig=0;
  wire sync_out;

  // Different frequencies: clk_a = faster, clk_b = slower
  always #3  clk_a = ~clk_a;  // 167MHz
  always #7  clk_b = ~clk_b;  // 71MHz

  cdc_sync2 sync(.clk_b(clk_b),.rst_b(rst),.async_in(async_sig),.sync_out(sync_out));

  // Gray code test
  reg [3:0] bin_val;
  wire [3:0] gray_val, bin_back;
  bin2gray #(4) b2g(.bin(bin_val),.gray(gray_val));
  gray2bin #(4) g2b(.gray(gray_val),.bin(bin_back));

  integer i;
  initial begin
    #15 rst=0;

    $display("=== 2-FF CDC Synchronizer ===");
    $display("Toggling signal in clk_a domain, observing in clk_b domain");
    repeat(3) begin
      @(posedge clk_a); async_sig=1;
      repeat(3) @(posedge clk_b);
      $display("async=1 -> sync_out=%b (should be 1)", sync_out);
      @(posedge clk_a); async_sig=0;
      repeat(3) @(posedge clk_b);
      $display("async=0 -> sync_out=%b (should be 0)", sync_out);
    end

    $display("\\n=== Gray Code Conversion ===");
    $display("bin  gray  back");
    for(i=0;i<8;i=i+1) begin
      bin_val=i; #2;
      $display("%04b %04b  %04b %s", bin_val,gray_val,bin_back, bin_val==bin_back?"OK":"FAIL");
    end
    $finish;
  end
endmodule`,
      expected: ["sync_out=1 (should be 1)", "OK"]
    },

    {
      id: "m6l2",
      title: "Simple ALU — Putting It All Together",
      theory: `
<h2>Building a Complete ALU</h2>
<p>An ALU (Arithmetic Logic Unit) is the computational core of every processor. Let's build a real 8-bit ALU with flags — the kind you'd find in an 8-bit microcontroller.</p>

<h3>Operations</h3>
<ul>
  <li><code>000</code> — ADD</li>
  <li><code>001</code> — SUB</li>
  <li><code>010</code> — AND</li>
  <li><code>011</code> — OR</li>
  <li><code>100</code> — XOR</li>
  <li><code>101</code> — NOT A</li>
  <li><code>110</code> — SHL (shift left)</li>
  <li><code>111</code> — SHR (shift right)</li>
</ul>

<h3>Flags</h3>
<ul>
  <li><strong>Z (Zero)</strong> — result is zero</li>
  <li><strong>N (Negative)</strong> — MSB of result is 1</li>
  <li><strong>C (Carry)</strong> — unsigned overflow</li>
  <li><strong>V (Overflow)</strong> — signed overflow</li>
</ul>

<h3>This is the foundation of</h3>
<p>Every instruction your CPU executes passes through an ALU like this. Add registers, a PC, and an instruction decoder — you have a CPU.</p>
      `,
      tasks: ["Implement the complete 8-bit ALU", "Verify all 8 operations", "Check all 4 flags for each operation"],
      hint: "For overflow: V = (a[7]==b_eff[7]) && (result[7]!=a[7]). Carry comes from bit 8 of the full addition.",
      design: `module alu_8bit (
  input  wire [7:0] a, b,
  input  wire [2:0] op,
  output reg  [7:0] result,
  output wire       flag_z,  // zero
  output wire       flag_n,  // negative
  output reg        flag_c,  // carry
  output reg        flag_v   // overflow
);

  wire [8:0] add_full = {1'b0,a} + {1'b0,b};
  wire [8:0] sub_full = {1'b0,a} - {1'b0,b};

  always @(*) begin
    flag_c = 0; flag_v = 0;
    case (op)
      3'b000: begin // ADD
        result = add_full[7:0];
        flag_c = add_full[8];
        flag_v = (a[7]==b[7]) && (result[7]!=a[7]);
      end
      3'b001: begin // SUB
        result = sub_full[7:0];
        flag_c = sub_full[8];  // borrow
        flag_v = (a[7]!=b[7]) && (result[7]!=a[7]);
      end
      3'b010: result = a & b;  // AND
      3'b011: result = a | b;  // OR
      3'b100: result = a ^ b;  // XOR
      3'b101: result = ~a;     // NOT
      3'b110: begin result = a << 1; flag_c = a[7]; end  // SHL
      3'b111: begin result = a >> 1; flag_c = a[0]; end  // SHR
    endcase
  end

  assign flag_z = (result == 8'h00);
  assign flag_n = result[7];

endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  [7:0] a, b;
  reg  [2:0] op;
  wire [7:0] result;
  wire       flag_z, flag_n, flag_c, flag_v;

  alu_8bit dut(.a(a),.b(b),.op(op),.result(result),
    .flag_z(flag_z),.flag_n(flag_n),.flag_c(flag_c),.flag_v(flag_v));

  task test;
    input [7:0] ta,tb_v;
    input [2:0] top;
    input [20*8:1] name;
    begin
      a=ta; b=tb_v; op=top; #5;
      $display("%-8s a=%02h b=%02h -> %02h  Z=%b N=%b C=%b V=%b",
               name,a,b,result,flag_z,flag_n,flag_c,flag_v);
    end
  endtask

  initial begin
    $display("8-bit ALU with Flags");
    $display("Op       a    b   -> res  Z N C V");
    $display("----------------------------------------");
    test(8'h0F, 8'h01, 3'b000, "ADD     ");
    test(8'hFF, 8'h01, 3'b000, "ADD+Carry");
    test(8'h7F, 8'h01, 3'b000, "ADD+OVF ");
    test(8'h10, 8'h05, 3'b001, "SUB     ");
    test(8'hAB, 8'hCD, 3'b010, "AND     ");
    test(8'hAB, 8'hCD, 3'b011, "OR      ");
    test(8'hAB, 8'hAB, 3'b100, "XOR     ");
    test(8'hAA, 8'h00, 3'b101, "NOT     ");
    test(8'h55, 8'h00, 3'b110, "SHL     ");
    test(8'h55, 8'h00, 3'b111, "SHR     ");
    $finish;
  end
endmodule`,
      expected: ["ADD     ", "SUB     ", "XOR", "Z=1"]
    }
  ]
});
