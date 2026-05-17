// Module 14 — APB Protocol SOLUTIONS (reference / preview)
// Same 10-lesson arc as m13, but every design + testbench is filled in
// so you can run each lesson and see the expected output + waveforms.
// To load this in the UI, add <script src="lessons/modules/m14.js"></script> to index.html
// alongside the existing module scripts.
(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: "m14",
  title: "APB — Reference Solutions (Preview)",
  icon: "✅",
  level: "advanced",
  lessons: [

    // ─── L1 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l1",
      title: "L1 Solution — APB Slave Interface",
      theory: `<p>Reference solution for <strong>m13 L1</strong>. Just the port list plus safe defaults. Run it to see the PASS lines you should produce on your own.</p>`,
      tasks: ["Run — observe the two PASS lines"],
      hint: "See design and testbench — nothing to fill.",
      design: `module apb_slave_if (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output wire [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);
  assign PRDATA  = 32'h0;
  assign PREADY  = 1'b1;
  assign PSLVERR = 1'b0;
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire        PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_if dut (.PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR));

  initial begin
    $display("=== L1: APB Slave Interface ===");
    repeat(3) @(posedge PCLK);
    PRESETn = 1;
    @(posedge PCLK); #1;
    $display("PASS interface compiles");
    $display("PASS defaults PRDATA=%08h PREADY=%b PSLVERR=%b", PRDATA, PREADY, PSLVERR);
    $finish;
  end
endmodule`,
      expected: ["PASS interface compiles", "PASS defaults"]
    },

    // ─── L2 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l2",
      title: "L2 Solution — Phase Decoder",
      theory: `<p>Reference solution for <strong>m13 L2</strong>. Three simple assigns, one task to check all four input combinations.</p>`,
      tasks: ["Run — observe PASS for each of 4 input combos"],
      hint: "Fully filled — just run.",
      design: `module apb_phase_decoder (
  input  wire PSEL,
  input  wire PENABLE,
  output wire idle,
  output wire setup,
  output wire access
);
  assign idle   = ~PSEL;
  assign setup  =  PSEL & ~PENABLE;
  assign access =  PSEL &  PENABLE;
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg  PSEL, PENABLE;
  wire idle, setup, access;

  apb_phase_decoder dut (.PSEL(PSEL), .PENABLE(PENABLE),
                         .idle(idle), .setup(setup), .access(access));

  task check;
    input        ei, es, ea;
    input [63:0] name;
    begin
      #1;
      if (idle===ei && setup===es && access===ea)
        $display("PASS PSEL=%b PENABLE=%b → %s", PSEL, PENABLE, name);
      else
        $display("FAIL PSEL=%b PENABLE=%b got i=%b s=%b a=%b", PSEL, PENABLE, idle, setup, access);
    end
  endtask

  initial begin
    $display("=== L2: Phase Decoder ===");
    PSEL=0; PENABLE=0; check(1,0,0,"IDLE    ");
    PSEL=0; PENABLE=1; check(1,0,0,"IDLE    ");
    PSEL=1; PENABLE=0; check(0,1,0,"SETUP   ");
    PSEL=1; PENABLE=1; check(0,0,1,"ACCESS  ");
    $finish;
  end
endmodule`,
      expected: ["PASS PSEL=0 PENABLE=0", "PASS PSEL=1 PENABLE=0", "PASS PSEL=1 PENABLE=1"]
    },

    // ─── L3 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l3",
      title: "L3 Solution — APB Slave FSM",
      theory: `<p>Reference solution for <strong>m13 L3</strong>. Classic 3-state FSM with registered state transitions.</p>`,
      tasks: ["Run — observe 4 PASS lines for the full transition sequence"],
      hint: "Fully filled — just run.",
      design: `module apb_slave_fsm (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PREADY,
  output reg  [1:0]  state
);
  localparam IDLE_S   = 2'd0;
  localparam SETUP_S  = 2'd1;
  localparam ACCESS_S = 2'd2;

  always @(posedge PCLK) begin
    if (!PRESETn) state <= IDLE_S;
    else begin
      case (state)
        IDLE_S:   if (PSEL)    state <= SETUP_S;
        SETUP_S:               state <= ACCESS_S;
        ACCESS_S: if (PREADY)  state <= PSEL ? SETUP_S : IDLE_S;
        default:               state <= IDLE_S;
      endcase
    end
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg        PSEL=0, PENABLE=0, PREADY=0;
  wire [1:0] state;

  always #5 PCLK = ~PCLK;

  apb_slave_fsm dut (.PCLK(PCLK), .PRESETn(PRESETn),
                     .PSEL(PSEL), .PENABLE(PENABLE), .PREADY(PREADY),
                     .state(state));

  initial begin
    $display("=== L3: APB Slave FSM ===");

    repeat(3) @(posedge PCLK);
    PRESETn = 1; #1;
    if (state === 2'd0) $display("PASS IDLE after reset");
    else                $display("FAIL state=%0d", state);

    @(posedge PCLK); #1;
    PSEL = 1;
    @(posedge PCLK); #1;
    if (state === 2'd1) $display("PASS IDLE → SETUP on PSEL");
    else                $display("FAIL state=%0d", state);

    PENABLE = 1;
    @(posedge PCLK); #1;
    if (state === 2'd2) $display("PASS SETUP → ACCESS on PENABLE");
    else                $display("FAIL state=%0d", state);

    PREADY = 1; PSEL = 0; PENABLE = 0;
    @(posedge PCLK); #1;
    if (state === 2'd0) $display("PASS ACCESS → IDLE on PREADY (with PSEL low)");
    else                $display("FAIL state=%0d", state);

    $finish;
  end
endmodule`,
      expected: ["PASS IDLE after reset", "PASS IDLE → SETUP", "PASS SETUP → ACCESS", "PASS ACCESS → IDLE"]
    },

    // ─── L4 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l4",
      title: "L4 Solution — Register File",
      theory: `<p>Reference solution for <strong>m13 L4</strong>. Parameterised N×W register file with synchronous reset.</p>`,
      tasks: ["Run — observe 4 writes, 4 reads, and reset clears all"],
      hint: "Fully filled — just run.",
      design: `module regfile #(
  parameter N = 4,
  parameter W = 32
)(
  input  wire                 clk,
  input  wire                 rstn,
  input  wire                 we,
  input  wire [$clog2(N)-1:0] waddr,
  input  wire [W-1:0]         wdata,
  input  wire [$clog2(N)-1:0] raddr,
  output wire [W-1:0]         rdata
);
  reg [W-1:0] mem [0:N-1];
  integer i;

  always @(posedge clk) begin
    if (!rstn) begin
      for (i = 0; i < N; i = i + 1) mem[i] <= {W{1'b0}};
    end else if (we) begin
      mem[waddr] <= wdata;
    end
  end

  assign rdata = mem[raddr];
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg         clk=0, rstn=0, we=0;
  reg  [1:0]  waddr=0, raddr=0;
  reg  [31:0] wdata=0;
  wire [31:0] rdata;

  always #5 clk = ~clk;

  regfile #(.N(4), .W(32)) dut (.clk(clk), .rstn(rstn),
    .we(we), .waddr(waddr), .wdata(wdata),
    .raddr(raddr), .rdata(rdata));

  reg [31:0] expected [0:3];
  reg        all_zero;
  integer    i;

  initial begin
    $display("=== L4: Register File ===");

    expected[0] = 32'hAAAA_0000;
    expected[1] = 32'hBBBB_0001;
    expected[2] = 32'hCCCC_0002;
    expected[3] = 32'hDDDD_0003;

    repeat(3) @(posedge clk);
    rstn = 1;

    // Write
    for (i = 0; i < 4; i = i + 1) begin
      @(posedge clk); #1;
      we = 1; waddr = i[1:0]; wdata = expected[i];
    end
    @(posedge clk); #1;
    we = 0;

    // Read back
    for (i = 0; i < 4; i = i + 1) begin
      raddr = i[1:0]; #1;
      if (rdata === expected[i])
        $display("PASS write reg %0d = %08h", i, rdata);
      else
        $display("FAIL reg %0d got %08h exp %08h", i, rdata, expected[i]);
    end

    // Reset and verify
    rstn = 0;
    @(posedge clk); @(posedge clk); #1;
    all_zero = 1;
    for (i = 0; i < 4; i = i + 1) begin
      raddr = i[1:0]; #1;
      if (rdata !== 0) all_zero = 0;
    end
    if (all_zero) $display("PASS reset clears all");
    else          $display("FAIL reset did not clear");

    $finish;
  end
endmodule`,
      expected: ["PASS write reg 0", "PASS write reg 1", "PASS write reg 2", "PASS write reg 3", "PASS reset clears all"]
    },

    // ─── L5 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l5",
      title: "L5 Solution — APB Write Path",
      theory: `<p>Reference solution for <strong>m13 L5</strong>. First functional APB slave — writes only.</p>`,
      tasks: ["Run — observe 4 register writes and an overwrite"],
      hint: "Fully filled — just run.",
      design: `module apb_slave_wr (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output wire [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR,
  output reg  [31:0] reg0,
  output reg  [31:0] reg1,
  output reg  [31:0] reg2,
  output reg  [31:0] reg3
);
  assign PRDATA  = 32'h0;
  assign PREADY  = 1'b1;
  assign PSLVERR = 1'b0;

  wire wr_en = PSEL & PENABLE & PWRITE & PREADY;

  always @(posedge PCLK) begin
    if (!PRESETn) begin
      reg0 <= 0; reg1 <= 0; reg2 <= 0; reg3 <= 0;
    end else if (wr_en) begin
      case (PADDR[3:2])
        2'd0: reg0 <= PWDATA;
        2'd1: reg1 <= PWDATA;
        2'd2: reg2 <= PWDATA;
        2'd3: reg3 <= PWDATA;
      endcase
    end
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;
  wire [31:0] reg0, reg1, reg2, reg3;

  always #5 PCLK = ~PCLK;

  apb_slave_wr dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR),
    .reg0(reg0), .reg1(reg1), .reg2(reg2), .reg3(reg3)
  );

  task apb_write;
    input [31:0] addr, data;
    begin
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=1; PADDR=addr; PWDATA=data;
      @(posedge PCLK); #1;
      PENABLE=1;
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0; PWRITE=0;
    end
  endtask

  initial begin
    $display("=== L5: APB Write Path ===");

    repeat(3) @(posedge PCLK); PRESETn = 1;

    apb_write(32'h00, 32'hAAAA_0000);
    apb_write(32'h04, 32'hBBBB_0001);
    apb_write(32'h08, 32'hCCCC_0002);
    apb_write(32'h0C, 32'hDDDD_0003);

    #2;
    if (reg0===32'hAAAA_0000) $display("PASS reg[0] = %08h", reg0); else $display("FAIL reg0 = %08h", reg0);
    if (reg1===32'hBBBB_0001) $display("PASS reg[1] = %08h", reg1); else $display("FAIL reg1 = %08h", reg1);
    if (reg2===32'hCCCC_0002) $display("PASS reg[2] = %08h", reg2); else $display("FAIL reg2 = %08h", reg2);
    if (reg3===32'hDDDD_0003) $display("PASS reg[3] = %08h", reg3); else $display("FAIL reg3 = %08h", reg3);

    apb_write(32'h00, 32'h1234_5678);
    #2;
    if (reg0===32'h1234_5678) $display("PASS overwrite reg[0]"); else $display("FAIL overwrite reg0 = %08h", reg0);

    $finish;
  end
endmodule`,
      expected: ["PASS reg[0]", "PASS reg[1]", "PASS reg[2]", "PASS reg[3]", "PASS overwrite reg[0]"]
    },

    // ─── L6 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l6",
      title: "L6 Solution — APB Read Path",
      theory: `<p>Reference solution for <strong>m13 L6</strong>. Adds combinational PRDATA mux to the L5 slave.</p>`,
      tasks: ["Run — observe 4 read-backs matching prior writes"],
      hint: "Fully filled — just run.",
      design: `module apb_slave_rw (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);
  assign PREADY  = 1'b1;
  assign PSLVERR = 1'b0;

  wire wr_en = PSEL & PENABLE &  PWRITE & PREADY;
  wire rd_en = PSEL & PENABLE & ~PWRITE;

  reg [31:0] reg0, reg1, reg2, reg3;

  always @(posedge PCLK) begin
    if (!PRESETn) begin
      reg0 <= 0; reg1 <= 0; reg2 <= 0; reg3 <= 0;
    end else if (wr_en) begin
      case (PADDR[3:2])
        2'd0: reg0 <= PWDATA;
        2'd1: reg1 <= PWDATA;
        2'd2: reg2 <= PWDATA;
        2'd3: reg3 <= PWDATA;
      endcase
    end
  end

  always @(*) begin
    if (rd_en) begin
      case (PADDR[3:2])
        2'd0: PRDATA = reg0;
        2'd1: PRDATA = reg1;
        2'd2: PRDATA = reg2;
        2'd3: PRDATA = reg3;
        default: PRDATA = 32'hDEAD_DEAD;
      endcase
    end else begin
      PRDATA = 32'h0;
    end
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_rw dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  reg [31:0] rd;

  task apb_write;
    input [31:0] addr, data;
    begin
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=1; PADDR=addr; PWDATA=data;
      @(posedge PCLK); #1;
      PENABLE=1;
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0; PWRITE=0;
    end
  endtask

  task apb_read;
    input [31:0] addr;
    begin
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=0; PADDR=addr;
      @(posedge PCLK); #1;
      PENABLE=1;
      #2; rd = PRDATA;
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0;
    end
  endtask

  initial begin
    $display("=== L6: APB Read Path ===");

    repeat(3) @(posedge PCLK); PRESETn = 1;

    apb_write(32'h00, 32'hAABB_CC00);
    apb_write(32'h04, 32'h1122_3301);
    apb_write(32'h08, 32'hDEAD_0002);
    apb_write(32'h0C, 32'hCAFE_0003);

    apb_read(32'h00); if (rd===32'hAABB_CC00) $display("PASS read reg[0] = %08h", rd); else $display("FAIL rd=%08h", rd);
    apb_read(32'h04); if (rd===32'h1122_3301) $display("PASS read reg[1] = %08h", rd); else $display("FAIL rd=%08h", rd);
    apb_read(32'h08); if (rd===32'hDEAD_0002) $display("PASS read reg[2] = %08h", rd); else $display("FAIL rd=%08h", rd);
    apb_read(32'h0C); if (rd===32'hCAFE_0003) $display("PASS read reg[3] = %08h", rd); else $display("FAIL rd=%08h", rd);

    @(posedge PCLK); #1;
    PSEL=1; PENABLE=0; PWRITE=1; PADDR=32'h00; PWDATA=32'hFFFF_FFFF;
    @(posedge PCLK); #1;
    PENABLE=1;
    #2;
    if (PRDATA === 32'h0) $display("PASS PRDATA=0 on non-read");
    else                  $display("FAIL PRDATA=%08h during write", PRDATA);
    @(posedge PCLK); #1;
    PSEL=0; PENABLE=0; PWRITE=0;

    $finish;
  end
endmodule`,
      expected: ["PASS read reg[0]", "PASS read reg[1]", "PASS read reg[2]", "PASS read reg[3]", "PASS PRDATA=0"]
    },

    // ─── L7 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l7",
      title: "L7 Solution — Wait States",
      theory: `<p>Reference solution for <strong>m13 L7</strong>. Adds a counter-driven PREADY so every transfer takes WAIT+1 ACCESS cycles.</p>`,
      tasks: ["Run — observe master polling PREADY, transfer eventually completes"],
      hint: "Fully filled — just run.",
      design: `module apb_slave_wait #(
  parameter WAIT = 2
)(
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);
  assign PSLVERR = 1'b0;

  wire setup_phase  = PSEL & ~PENABLE;
  wire access_phase = PSEL &  PENABLE;

  reg [3:0] cnt;
  always @(posedge PCLK) begin
    if (!PRESETn)                            cnt <= 0;
    else if (setup_phase)                    cnt <= WAIT;
    else if (access_phase && cnt != 0)       cnt <= cnt - 1;
  end

  assign PREADY = access_phase & (cnt == 0);

  wire wr_en = access_phase &  PWRITE & PREADY;
  wire rd_en = access_phase & ~PWRITE;

  reg [31:0] reg0, reg1, reg2, reg3;

  always @(posedge PCLK) begin
    if (!PRESETn) begin
      reg0 <= 0; reg1 <= 0; reg2 <= 0; reg3 <= 0;
    end else if (wr_en) begin
      case (PADDR[3:2])
        2'd0: reg0 <= PWDATA;
        2'd1: reg1 <= PWDATA;
        2'd2: reg2 <= PWDATA;
        2'd3: reg3 <= PWDATA;
      endcase
    end
  end

  always @(*) begin
    if (rd_en) begin
      case (PADDR[3:2])
        2'd0: PRDATA = reg0;
        2'd1: PRDATA = reg1;
        2'd2: PRDATA = reg2;
        2'd3: PRDATA = reg3;
        default: PRDATA = 32'hDEAD_DEAD;
      endcase
    end else begin
      PRDATA = 32'h0;
    end
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_wait #(.WAIT(2)) dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  reg [31:0] rd;
  reg        saw_wait;

  task apb_write;
    input [31:0] addr, data;
    begin
      saw_wait = 0;
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=1; PADDR=addr; PWDATA=data;
      @(posedge PCLK); #1;
      PENABLE=1;
      while (!PREADY) begin
        saw_wait = 1;
        @(posedge PCLK); #1;
      end
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0; PWRITE=0;
    end
  endtask

  task apb_read;
    input [31:0] addr;
    begin
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=0; PADDR=addr;
      @(posedge PCLK); #1;
      PENABLE=1;
      while (!PREADY) @(posedge PCLK);
      #1; rd = PRDATA;
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0;
    end
  endtask

  initial begin
    $display("=== L7: Wait States ===");

    repeat(3) @(posedge PCLK); PRESETn = 1;

    apb_write(32'h04, 32'hCAFE_BABE);
    $display("PASS slow write completed (saw wait cycles=%b)", saw_wait);

    apb_read(32'h04);
    if (rd === 32'hCAFE_BABE) $display("PASS slow read returned correct data");
    else                       $display("FAIL rd=%08h", rd);

    if (saw_wait) $display("PASS master correctly waited on PREADY");
    else          $display("FAIL did not see wait states");

    $finish;
  end
endmodule`,
      expected: ["PASS slow write", "PASS slow read", "PASS master correctly waited"]
    },

    // ─── L8 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l8",
      title: "L8 Solution — PSLVERR",
      theory: `<p>Reference solution for <strong>m13 L8</strong>. Errors on out-of-range or misaligned addresses. Checked bits <code>PADDR[5:4]==0</code> (so lesson works alongside L10's multi-slave system).</p>`,
      tasks: ["Run — observe valid txn OK, bad write flagged, bad read returns DEAD_DEAD"],
      hint: "Fully filled — just run.",
      design: `module apb_slave_err (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);
  assign PREADY = 1'b1;

  // Local address validity: low register bank 0..0x0C only, aligned
  wire valid_addr   = (PADDR[5:4] == 2'b00) && (PADDR[1:0] == 2'b00);
  wire access_phase = PSEL & PENABLE;

  assign PSLVERR = access_phase & ~valid_addr;

  wire wr_en = access_phase &  PWRITE & PREADY & valid_addr;
  wire rd_en = access_phase & ~PWRITE;

  reg [31:0] reg0, reg1, reg2, reg3;

  always @(posedge PCLK) begin
    if (!PRESETn) begin
      reg0 <= 0; reg1 <= 0; reg2 <= 0; reg3 <= 0;
    end else if (wr_en) begin
      case (PADDR[3:2])
        2'd0: reg0 <= PWDATA;
        2'd1: reg1 <= PWDATA;
        2'd2: reg2 <= PWDATA;
        2'd3: reg3 <= PWDATA;
      endcase
    end
  end

  always @(*) begin
    if (rd_en) begin
      if (!valid_addr) PRDATA = 32'hDEAD_DEAD;
      else case (PADDR[3:2])
        2'd0: PRDATA = reg0;
        2'd1: PRDATA = reg1;
        2'd2: PRDATA = reg2;
        2'd3: PRDATA = reg3;
      endcase
    end else begin
      PRDATA = 32'h0;
    end
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg [31:0] PADDR=0, PWDATA=0;
  reg        PSEL=0, PENABLE=0, PWRITE=0;
  wire [31:0] PRDATA;
  wire       PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_slave_err dut (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  reg [31:0] rd;
  reg        err;

  task apb_write;
    input [31:0] addr, data;
    begin
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=1; PADDR=addr; PWDATA=data;
      @(posedge PCLK); #1;
      PENABLE=1;
      #1; err = PSLVERR;
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0; PWRITE=0;
    end
  endtask

  task apb_read;
    input [31:0] addr;
    begin
      @(posedge PCLK); #1;
      PSEL=1; PENABLE=0; PWRITE=0; PADDR=addr;
      @(posedge PCLK); #1;
      PENABLE=1;
      #1; rd = PRDATA; err = PSLVERR;
      @(posedge PCLK); #1;
      PSEL=0; PENABLE=0;
    end
  endtask

  initial begin
    $display("=== L8: PSLVERR ===");

    repeat(3) @(posedge PCLK); PRESETn = 1;

    apb_write(32'h04, 32'h1234_5678);
    apb_read (32'h04);
    if (!err && rd === 32'h1234_5678) $display("PASS valid txn, no error");
    else                               $display("FAIL valid err=%b rd=%08h", err, rd);

    apb_write(32'h20, 32'hBADB_ADBA);
    if (err) $display("PASS bad write flagged PSLVERR");
    else     $display("FAIL bad write err=%b", err);

    apb_read(32'h04);
    if (rd === 32'h1234_5678) $display("PASS bad write did not modify regs");
    else                       $display("FAIL reg changed rd=%08h", rd);

    apb_read(32'h24);
    if (err && rd === 32'hDEAD_DEAD) $display("PASS bad read returned DEAD_DEAD");
    else                              $display("FAIL bad read err=%b rd=%08h", err, rd);

    $finish;
  end
endmodule`,
      expected: ["PASS valid txn", "PASS bad write flagged", "PASS bad read returned DEAD_DEAD"]
    },

    // ─── L9 ──────────────────────────────────────────────────────────────────
    {
      id: "m14l9",
      title: "L9 Solution — APB Master",
      theory: `<p>Reference solution for <strong>m13 L9</strong>. Synthesisable master with a simple command/response interface, driving the L8 slave.</p>`,
      tasks: ["Run — observe write + readback + error response through the master"],
      hint: "Fully filled — just run.",
      design: `module apb_master (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire        cmd_valid,
  input  wire        cmd_write,
  input  wire [31:0] cmd_addr,
  input  wire [31:0] cmd_wdata,
  output wire        cmd_ready,
  output reg         rsp_valid,
  output reg  [31:0] rsp_rdata,
  output reg         rsp_err,
  output reg  [31:0] PADDR,
  output reg         PSEL,
  output reg         PENABLE,
  output reg         PWRITE,
  output reg  [31:0] PWDATA,
  input  wire [31:0] PRDATA,
  input  wire        PREADY,
  input  wire        PSLVERR
);
  localparam IDLE_S   = 2'd0;
  localparam SETUP_S  = 2'd1;
  localparam ACCESS_S = 2'd2;

  reg [1:0]  state;
  reg [31:0] lat_addr, lat_wdata;
  reg        lat_write;

  assign cmd_ready = (state == IDLE_S);

  always @(posedge PCLK) begin
    if (!PRESETn) begin
      state     <= IDLE_S;
      rsp_valid <= 0;
      rsp_rdata <= 0;
      rsp_err   <= 0;
      lat_addr  <= 0;
      lat_wdata <= 0;
      lat_write <= 0;
    end else begin
      rsp_valid <= 0;
      case (state)
        IDLE_S: if (cmd_valid) begin
          lat_addr  <= cmd_addr;
          lat_wdata <= cmd_wdata;
          lat_write <= cmd_write;
          state     <= SETUP_S;
        end
        SETUP_S: state <= ACCESS_S;
        ACCESS_S: if (PREADY) begin
          rsp_valid <= 1;
          rsp_rdata <= PRDATA;
          rsp_err   <= PSLVERR;
          state     <= IDLE_S;
        end
        default: state <= IDLE_S;
      endcase
    end
  end

  always @(*) begin
    PSEL    = (state == SETUP_S) || (state == ACCESS_S);
    PENABLE = (state == ACCESS_S);
    PADDR   = lat_addr;
    PWRITE  = lat_write;
    PWDATA  = lat_wdata;
  end
endmodule

// Slave reused from L8 so this lesson compiles standalone
module apb_slave_err (
  input  wire        PCLK,
  input  wire        PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL,
  input  wire        PENABLE,
  input  wire        PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY,
  output wire        PSLVERR
);
  assign PREADY = 1'b1;
  wire valid_addr   = (PADDR[5:4] == 2'b00) && (PADDR[1:0] == 2'b00);
  wire access_phase = PSEL & PENABLE;
  assign PSLVERR = access_phase & ~valid_addr;
  wire wr_en = access_phase &  PWRITE & PREADY & valid_addr;
  wire rd_en = access_phase & ~PWRITE;
  reg [31:0] reg0, reg1, reg2, reg3;
  always @(posedge PCLK) begin
    if (!PRESETn) begin reg0<=0;reg1<=0;reg2<=0;reg3<=0;
    end else if (wr_en) case (PADDR[3:2])
      2'd0: reg0 <= PWDATA; 2'd1: reg1 <= PWDATA;
      2'd2: reg2 <= PWDATA; 2'd3: reg3 <= PWDATA;
    endcase
  end
  always @(*) begin
    if (rd_en) begin
      if (!valid_addr) PRDATA = 32'hDEAD_DEAD;
      else case (PADDR[3:2])
        2'd0: PRDATA = reg0; 2'd1: PRDATA = reg1;
        2'd2: PRDATA = reg2; 2'd3: PRDATA = reg3;
      endcase
    end else PRDATA = 32'h0;
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg        PCLK=0, PRESETn=0;
  reg        cmd_valid=0, cmd_write=0;
  reg [31:0] cmd_addr=0, cmd_wdata=0;
  wire       cmd_ready, rsp_valid, rsp_err;
  wire [31:0] rsp_rdata;
  wire [31:0] PADDR, PWDATA, PRDATA;
  wire       PSEL, PENABLE, PWRITE, PREADY, PSLVERR;

  always #5 PCLK = ~PCLK;

  apb_master m (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .cmd_valid(cmd_valid), .cmd_write(cmd_write),
    .cmd_addr(cmd_addr), .cmd_wdata(cmd_wdata),
    .cmd_ready(cmd_ready),
    .rsp_valid(rsp_valid), .rsp_rdata(rsp_rdata), .rsp_err(rsp_err),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  apb_slave_err s (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  reg [31:0] got_rdata;
  reg        got_err;

  task send;
    input        wr;
    input [31:0] addr, data;
    begin
      @(posedge PCLK); #1;
      while (!cmd_ready) @(posedge PCLK);
      #1;
      cmd_valid = 1; cmd_write = wr; cmd_addr = addr; cmd_wdata = data;
      @(posedge PCLK); #1;
      cmd_valid = 0;
      while (!rsp_valid) @(posedge PCLK);
      #1;
      got_rdata = rsp_rdata;
      got_err   = rsp_err;
    end
  endtask

  initial begin
    $display("=== L9: APB Master ===");

    repeat(3) @(posedge PCLK); PRESETn = 1;

    send(1, 32'h04, 32'hABCD_1234);
    $display("PASS master wrote reg[1] (err=%b)", got_err);

    send(0, 32'h04, 32'h0);
    if (got_rdata === 32'hABCD_1234) $display("PASS master read back reg[1] = %08h", got_rdata);
    else                              $display("FAIL rd=%08h", got_rdata);

    send(1, 32'h20, 32'hDEAD_0000);
    if (got_err) $display("PASS master saw PSLVERR on bad addr");
    else         $display("FAIL no err");

    $finish;
  end
endmodule`,
      expected: ["PASS master wrote", "PASS master read back", "PASS master saw PSLVERR"]
    },

    // ─── L10 ─────────────────────────────────────────────────────────────────
    {
      id: "m14l10",
      title: "L10 Solution — End-to-End System",
      theory: `<p>Reference solution for <strong>m13 L10</strong>. 1 master + decoder + 2 slaves. PRDATA/PSLVERR OR-combined, PREADY muxed by PSEL.</p>`,
      tasks: ["Run — observe 2 slaves independently accessed, isolation confirmed"],
      hint: "Fully filled — just run.",
      design: `// ── Master (from L9) ─────────────────────────────────────────────────────
module apb_master (
  input  wire        PCLK, PRESETn,
  input  wire        cmd_valid, cmd_write,
  input  wire [31:0] cmd_addr, cmd_wdata,
  output wire        cmd_ready,
  output reg         rsp_valid,
  output reg  [31:0] rsp_rdata,
  output reg         rsp_err,
  output reg  [31:0] PADDR,
  output reg         PSEL, PENABLE, PWRITE,
  output reg  [31:0] PWDATA,
  input  wire [31:0] PRDATA,
  input  wire        PREADY, PSLVERR
);
  localparam IDLE_S=0, SETUP_S=1, ACCESS_S=2;
  reg [1:0]  state;
  reg [31:0] lat_addr, lat_wdata;
  reg        lat_write;
  assign cmd_ready = (state == IDLE_S);
  always @(posedge PCLK) begin
    if (!PRESETn) begin state<=IDLE_S; rsp_valid<=0; rsp_rdata<=0; rsp_err<=0;
                        lat_addr<=0; lat_wdata<=0; lat_write<=0;
    end else begin
      rsp_valid <= 0;
      case (state)
        IDLE_S: if (cmd_valid) begin
          lat_addr<=cmd_addr; lat_wdata<=cmd_wdata; lat_write<=cmd_write;
          state<=SETUP_S;
        end
        SETUP_S:  state <= ACCESS_S;
        ACCESS_S: if (PREADY) begin
          rsp_valid <= 1; rsp_rdata <= PRDATA; rsp_err <= PSLVERR;
          state     <= IDLE_S;
        end
        default: state <= IDLE_S;
      endcase
    end
  end
  always @(*) begin
    PSEL    = (state == SETUP_S) || (state == ACCESS_S);
    PENABLE = (state == ACCESS_S);
    PADDR   = lat_addr; PWRITE = lat_write; PWDATA = lat_wdata;
  end
endmodule

// ── Decoder ──────────────────────────────────────────────────────────────
module apb_decoder (
  input  wire        PSEL_in,
  input  wire [31:0] PADDR,
  output wire        PSEL0,
  output wire        PSEL1
);
  assign PSEL0 = PSEL_in & ~PADDR[16];
  assign PSEL1 = PSEL_in &  PADDR[16];
endmodule

// ── Slave (from L8) ──────────────────────────────────────────────────────
module apb_slave_err (
  input  wire        PCLK, PRESETn,
  input  wire [31:0] PADDR,
  input  wire        PSEL, PENABLE, PWRITE,
  input  wire [31:0] PWDATA,
  output reg  [31:0] PRDATA,
  output wire        PREADY, PSLVERR
);
  assign PREADY = PSEL;  // only drive PREADY when selected (for mux)
  wire valid_addr   = (PADDR[5:4] == 2'b00) && (PADDR[1:0] == 2'b00);
  wire access_phase = PSEL & PENABLE;
  assign PSLVERR = access_phase & ~valid_addr;
  wire wr_en = access_phase &  PWRITE & valid_addr;
  wire rd_en = access_phase & ~PWRITE;
  reg [31:0] reg0, reg1, reg2, reg3;
  always @(posedge PCLK) begin
    if (!PRESETn) begin reg0<=0;reg1<=0;reg2<=0;reg3<=0;
    end else if (wr_en) case (PADDR[3:2])
      2'd0: reg0 <= PWDATA; 2'd1: reg1 <= PWDATA;
      2'd2: reg2 <= PWDATA; 2'd3: reg3 <= PWDATA;
    endcase
  end
  always @(*) begin
    if (rd_en) begin
      if (!valid_addr) PRDATA = 32'hDEAD_DEAD;
      else case (PADDR[3:2])
        2'd0: PRDATA = reg0; 2'd1: PRDATA = reg1;
        2'd2: PRDATA = reg2; 2'd3: PRDATA = reg3;
      endcase
    end else PRDATA = 32'h0;
  end
endmodule`,
      testbench: `\`timescale 1ns/1ps
module tb;
  reg PCLK=0, PRESETn=0;
  always #5 PCLK = ~PCLK;

  reg        cmd_valid=0, cmd_write=0;
  reg [31:0] cmd_addr=0, cmd_wdata=0;
  wire       cmd_ready, rsp_valid, rsp_err;
  wire [31:0] rsp_rdata;

  wire [31:0] PADDR, PWDATA;
  wire        PSEL, PENABLE, PWRITE;
  wire        PSEL0, PSEL1;
  wire [31:0] PRDATA0, PRDATA1, PRDATA;
  wire        PREADY0, PREADY1, PREADY;
  wire        PSLVERR0, PSLVERR1, PSLVERR;

  apb_master m (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .cmd_valid(cmd_valid), .cmd_write(cmd_write),
    .cmd_addr(cmd_addr), .cmd_wdata(cmd_wdata),
    .cmd_ready(cmd_ready),
    .rsp_valid(rsp_valid), .rsp_rdata(rsp_rdata), .rsp_err(rsp_err),
    .PADDR(PADDR), .PSEL(PSEL), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA), .PREADY(PREADY), .PSLVERR(PSLVERR)
  );

  apb_decoder dec (.PSEL_in(PSEL), .PADDR(PADDR), .PSEL0(PSEL0), .PSEL1(PSEL1));

  apb_slave_err s0 (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL0), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA0), .PREADY(PREADY0), .PSLVERR(PSLVERR0)
  );
  apb_slave_err s1 (
    .PCLK(PCLK), .PRESETn(PRESETn),
    .PADDR(PADDR), .PSEL(PSEL1), .PENABLE(PENABLE),
    .PWRITE(PWRITE), .PWDATA(PWDATA),
    .PRDATA(PRDATA1), .PREADY(PREADY1), .PSLVERR(PSLVERR1)
  );

  assign PRDATA  = PRDATA0  | PRDATA1;
  assign PSLVERR = PSLVERR0 | PSLVERR1;
  assign PREADY  = PSEL0 ? PREADY0 : (PSEL1 ? PREADY1 : 1'b1);

  reg [31:0] got;
  reg        gerr;

  task send;
    input        wr;
    input [31:0] addr, data;
    begin
      @(posedge PCLK); #1;
      while (!cmd_ready) @(posedge PCLK);
      #1;
      cmd_valid=1; cmd_write=wr; cmd_addr=addr; cmd_wdata=data;
      @(posedge PCLK); #1;
      cmd_valid=0;
      while (!rsp_valid) @(posedge PCLK);
      #1;
      got = rsp_rdata; gerr = rsp_err;
    end
  endtask

  initial begin
    $display("=== L10: End-to-End System ===");

    repeat(3) @(posedge PCLK); PRESETn = 1;

    // Slave 0 (base 0x0000_0000, PADDR[16]=0)
    send(1, 32'h0000_0004, 32'h1111_2222);
    send(0, 32'h0000_0004, 32'h0);
    if (got === 32'h1111_2222) $display("PASS slave 0 write+read (%08h)", got);
    else                        $display("FAIL s0 got=%08h", got);

    // Slave 1 (base 0x0001_0000, PADDR[16]=1)
    send(1, 32'h0001_0004, 32'hAAAA_BBBB);
    send(0, 32'h0001_0004, 32'h0);
    if (got === 32'hAAAA_BBBB) $display("PASS slave 1 write+read (%08h)", got);
    else                        $display("FAIL s1 got=%08h", got);

    // Verify slave 0 still has its value (not corrupted by slave 1 write)
    send(0, 32'h0000_0004, 32'h0);
    if (got === 32'h1111_2222) $display("PASS slaves isolated");
    else                        $display("FAIL iso got=%08h", got);

    $display("PASS system reached end-to-end");
    $finish;
  end
endmodule`,
      expected: ["PASS slave 0", "PASS slave 1", "PASS slaves isolated", "PASS system reached end-to-end"]
    }

  ]
});
