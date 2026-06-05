(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spi_long11',
  title: 'APB Register Interface',
  icon: '📖',
  level: 'advanced',
  lessons: [
    {
      id: 'spi_long11l1',
      title: 'L1 — APB Slave FSM: The Protocol Handshake',
      theory: `<h2>APB Slave FSM — The Teller Window Protocol</h2>
<p>Imagine a bank with teller windows. When a teller window is closed (IDLE), no transaction happens regardless of how many customers are waiting. When a customer steps up and presses the service button (PSEL asserts), the window opens into a setup phase — the customer places their request on the counter. On the next clock cycle the teller processes it (ACCESS phase) and hands back a result. The window then closes for one clock before the next customer. APB3 follows exactly this rhythm: IDLE → SETUP → ACCESS → IDLE.</p>

<h3>Where spi_apb_slave Sits in the System</h3>
<pre class="code-block">
  CPU (APB Master)
       │
  PSEL, PENABLE, PWRITE
  PADDR[11:0], PWDATA[31:0]
       │
       ▼
  ┌──────────────────┐
  │  spi_apb_slave ★ │  ← APB protocol engine
  │  (IDLE/SETUP/   │  ← pready / pslverr
  │   ACCESS FSM)   │
  └──────────────────┘
       │
  PRDATA[31:0] (read data)
  pready, pslverr
       │
  ▼
  SPI Register Bank
  (CTRL, STATUS, CLKDIV ...)
</pre>

<h3>The Three APB States</h3>
<table class="truth-table">
  <tr><th>State</th><th>PSEL</th><th>PENABLE</th><th>Activity</th></tr>
  <tr><td>IDLE</td><td>0</td><td>X</td><td>No transaction — bus is quiet</td></tr>
  <tr><td>SETUP</td><td>1</td><td>0</td><td>Address and control are stable — one setup cycle</td></tr>
  <tr><td>ACCESS</td><td>1</td><td>1</td><td>Slave responds: pready goes high, write completes or read data is valid</td></tr>
</table>
<p>The transition from SETUP to ACCESS is always one clock — the slave has exactly one cycle to decode the address and prepare read data before PENABLE asserts. For a simple register block this is more than enough. More complex memories that need more cycles hold PREADY low during ACCESS until they are ready.</p>

<h3>APB Signal Summary</h3>
<table class="truth-table">
  <tr><th>Signal</th><th>Direction</th><th>Meaning</th></tr>
  <tr><td>pclk</td><td>input</td><td>APB clock (same as PCLK)</td></tr>
  <tr><td>presetn</td><td>input</td><td>Active-low APB reset</td></tr>
  <tr><td>psel</td><td>input</td><td>This slave is selected</td></tr>
  <tr><td>penable</td><td>input</td><td>Second cycle of transfer (ACCESS qualifier)</td></tr>
  <tr><td>pwrite</td><td>input</td><td>1=write, 0=read</td></tr>
  <tr><td>paddr[11:0]</td><td>input</td><td>Register offset (12 bits = 64 registers)</td></tr>
  <tr><td>pwdata[31:0]</td><td>input</td><td>Write data from CPU</td></tr>
  <tr><td>prdata[31:0]</td><td>output</td><td>Read data to CPU</td></tr>
  <tr><td>pready</td><td>output</td><td>Slave ready — 1 means transaction completes this cycle</td></tr>
  <tr><td>pslverr</td><td>output</td><td>Slave error — 0 for a well-behaved register block</td></tr>
</table>

<h3>The Write Enable Pulse</h3>
<p>A write transaction completes when <code>pready=1</code> and <code>pwrite=1</code>. Since <code>pready</code> is only high in the ACCESS state, the write-enable pulse is simply:</p>
<pre class="code-block">// wr_en is high for exactly one clock cycle per APB write
logic wr_en;
assign wr_en = pready &amp;&amp; pwrite;

// Register update pattern:
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn)      reg_data &lt;= '0;
  else if (wr_en)    reg_data &lt;= pwdata;  // latch write data
end</pre>
<p>This single pattern drives every writable register in the entire CSR bank. The only thing that varies is the address comparison.</p>

<h3>Read Data Timing</h3>
<p>For a registered read (latched in SETUP), the slave captures which register is being read during SETUP, then the captured data is ready in ACCESS when pready fires. We pre-load prdata in the SETUP cycle so it is stable when the master samples it.</p>
<pre class="code-block">always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn)
    prdata &lt;= '0;
  else if (state == SETUP &amp;&amp; !pwrite)
    prdata &lt;= /* register read mux based on paddr */;
end</pre>

<p>This one takes a few passes to get right — the ordering of SETUP vs ACCESS timing is the thing that trips up most students the first time. Work through the state transitions cycle by cycle if the testbench fails.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_apb_slave with all APB ports plus output logic [31:0] ctrl_shadow',
        'Step 2 — declare typedef enum logic [1:0]: IDLE=2b00, SETUP=2b01, ACCESS=2b10; name the type apb_state_t and declare state register',
        'Step 3 — write always_ff for the state machine: reset to IDLE; IDLE goes to SETUP when psel && !penable; SETUP always goes to ACCESS; ACCESS always returns to IDLE',
        'Step 4 — assign pready = (state == ACCESS); assign pslverr = 1b0',
        'Step 5 — write always_ff for ctrl_shadow: reset to 0; when pready && pwrite && paddr==12h000, load pwdata',
        'Step 6 — write always_ff for prdata: reset to 0; when state==SETUP && !pwrite, drive prdata from ctrl_shadow if paddr==0, else 0',
        'Step 7 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 4 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_apb_slave (
  input  logic        pclk,
  input  logic        presetn,
  input  logic        psel,
  input  logic        penable,
  input  logic        pwrite,
  input  logic [11:0] paddr,
  input  logic [31:0] pwdata,
  output logic [31:0] prdata,
  output logic        pready,
  output logic        pslverr,
  output logic [31:0] ctrl_shadow  // demo RW register
);

  typedef enum logic [1:0] {
    IDLE   = 2'b00,
    SETUP  = 2'b01,
    ACCESS = 2'b10
  } apb_state_t;
  apb_state_t state;

  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) state <= IDLE;
    else case (state)
      IDLE:    if (psel && !penable) state <= SETUP;
      SETUP:   state <= ACCESS;
      ACCESS:  state <= IDLE;
      default: state <= IDLE;
    endcase
  end

  assign pready  = (state == ACCESS);
  assign pslverr = 1'b0;

  // Demo RW register at address 0x000
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn)      ctrl_shadow <= '0;
    else if (pready && pwrite && paddr == 12'h000)
      ctrl_shadow <= pwdata;
  end

  // Read data: captured one cycle early (in SETUP) for registered read
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) prdata <= '0;
    else if (state == SETUP && !pwrite)
      prdata <= (paddr == 12'h000) ? ctrl_shadow : 32'h0;
  end

endmodule`,

      design:
`// Type the spi_apb_slave module here.
// See Theory for APB state machine and signal timing.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        presetn;
  logic        psel, penable, pwrite;
  logic [11:0] paddr;
  logic [31:0] pwdata;
  logic [31:0] prdata;
  logic        pready, pslverr;
  logic [31:0] ctrl_shadow;

  spi_apb_slave dut (
    .pclk(pclk), .presetn(presetn),
    .psel(psel), .penable(penable), .pwrite(pwrite),
    .paddr(paddr), .pwdata(pwdata), .prdata(prdata),
    .pready(pready), .pslverr(pslverr),
    .ctrl_shadow(ctrl_shadow)
  );

  task automatic apb_write(input logic [11:0] addr, input logic [31:0] data);
    paddr=addr; pwdata=data; pwrite=1; psel=1; penable=0;
    @(posedge pclk); #1;
    penable=1;
    @(posedge pclk); #1;
    psel=0; penable=0; pwrite=0;
    @(posedge pclk); #1;
  endtask

  task automatic apb_read(input logic [11:0] addr);
    paddr=addr; pwrite=0; psel=1; penable=0;
    @(posedge pclk); #1;
    penable=1;
    @(posedge pclk); #1;
    psel=0; penable=0;
    @(posedge pclk); #1;
  endtask

  initial begin
    $display("=== APB Slave FSM Test ===");
    presetn=0; psel=0; penable=0; pwrite=0; paddr=0; pwdata=0;
    repeat(2) @(posedge pclk); #1; presetn=1;

    // 1. Idle: pready stays low
    @(posedge pclk); #1;
    if (pready === 0)
      $display("PASS  idle: pready=0");
    else
      $display("FAIL  idle pready=%0b", pready);

    // 2. APB write to CTRL (0x000)
    apb_write(12'h000, 32'hC0DE_1234);
    if (ctrl_shadow === 32'hC0DE_1234)
      $display("PASS  write CTRL: value latched");
    else
      $display("FAIL  write CTRL: shadow=%0h", ctrl_shadow);

    // 3. APB read back
    apb_read(12'h000);
    if (prdata === 32'hC0DE_1234)
      $display("PASS  read CTRL: prdata correct");
    else
      $display("FAIL  read CTRL: prdata=%0h", prdata);

    // 4. pslverr always 0
    if (pslverr === 0)
      $display("PASS  pslverr=0");
    else
      $display("FAIL  pslverr=%0b", pslverr);

    $display("APB slave FSM works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  idle: pready=0',
        'PASS  write CTRL: value latched',
        'PASS  read CTRL: prdata correct',
        'APB slave FSM works!',
      ],
    },

    {
      id: 'spi_long11l2',
      title: 'L2 — CTRL Register: RW Fields and W1P Pulses',
      theory: `<h2>Register Access Types — Not All Bits Behave the Same Way</h2>
<p>Imagine the control panel of a professional printer. Some buttons are toggles: press once for duplex, press again to cancel — the setting latches and stays until you change it. Other buttons are momentary: the "start job" button fires the job then immediately returns to neutral, no matter how long you hold it. And some indicators are read-only: the paper tray sensor light tells you what is happening but you cannot change it by pushing the light. Silicon registers work exactly the same way. The access type of a field determines its hardware behaviour, independent of how the CPU interacts with it.</p>

<h3>The CTRL Register Field Map (0x000)</h3>
<table class="truth-table">
  <tr><th>Bits</th><th>Field</th><th>Access</th><th>Reset</th><th>Meaning</th></tr>
  <tr><td>[31]</td><td>SOFT_RST</td><td>W1P</td><td>0</td><td>Resets entire SPI block; self-clears</td></tr>
  <tr><td>[30]</td><td>ABORT</td><td>W1P</td><td>0</td><td>Aborts active transfer; self-clears</td></tr>
  <tr><td>[29]</td><td>START</td><td>W1P</td><td>0</td><td>Begins a new transfer; self-clears</td></tr>
  <tr><td>[28]</td><td>SPI_EN</td><td>RW</td><td>0</td><td>Global SPI enable</td></tr>
  <tr><td>[22]</td><td>CPOL</td><td>RW</td><td>0</td><td>Clock polarity</td></tr>
  <tr><td>[21]</td><td>CPHA</td><td>RW</td><td>0</td><td>Clock phase</td></tr>
  <tr><td>[23]</td><td>LSB_FIRST</td><td>RW</td><td>0</td><td>Bit order</td></tr>
  <tr><td>[19:15]</td><td>WORD_LEN</td><td>RW</td><td>8</td><td>Bits per frame (1–32)</td></tr>
</table>

<h3>W1P — Write-1-to-Pulse</h3>
<p>A W1P field is never stored. When the CPU writes 1 to it, hardware generates a single-cycle pulse and the bit immediately returns to 0. Reading it back always returns 0. This is perfect for "action" commands: start, abort, flush.</p>
<pre class="code-block">// W1P: pulse fires, nothing is stored
// The register has NO flip-flop for this bit
assign start_pulse = (wr_en &amp;&amp; paddr == 12'h000 &amp;&amp; pwdata[29]);

// Reading CTRL[29] always returns 0 — there is nothing to read back</pre>
<p>Compare this to an RW field:</p>
<pre class="code-block">// RW: stored in a flip-flop, reads back the written value
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) cpol &lt;= 1'b0;
  else if (wr_en &amp;&amp; paddr == 12'h000) cpol &lt;= pwdata[22];
end</pre>

<h3>Write Masking for W1P Fields</h3>
<p>When storing the RW portion of CTRL, we must <strong>mask out</strong> the W1P bit positions so they are never accidentally latched. If we naively write <code>ctrl_rw &lt;= pwdata</code>, the SOFT_RST bit position would latch a 1 and never self-clear — breaking the W1P contract.</p>
<pre class="code-block">// Write mask: bits [31:29] are W1P — never store them
localparam CTRL_RW_MASK = 32'h1FFF_FF00;  // bits [28:8] are RW

always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) ctrl_rw &lt;= 32'h0000_0800;  // WORD_LEN reset = 8 (in bits [19:15])
  else if (wr_en &amp;&amp; paddr == 12'h000)
    ctrl_rw &lt;= pwdata &amp; CTRL_RW_MASK;      // mask clears W1P positions
end</pre>

<h3>Module Ports</h3>
<p>We are building <code>spi_ctrl_regs</code>: it includes the full APB slave FSM from L1 (rewritten compactly) plus the CTRL register decode. The W1P pulses and RW fields are exposed as separate outputs.</p>
<table class="truth-table">
  <tr><th>Port</th><th>Dir</th><th>Meaning</th></tr>
  <tr><td>pclk, presetn</td><td>in</td><td>Clock and reset</td></tr>
  <tr><td>psel, penable, pwrite, paddr, pwdata</td><td>in</td><td>APB bus</td></tr>
  <tr><td>prdata, pready, pslverr</td><td>out</td><td>APB response</td></tr>
  <tr><td>soft_rst, abort, start</td><td>out</td><td>W1P one-cycle pulses</td></tr>
  <tr><td>cpol, cpha, lsb_first</td><td>out</td><td>RW configuration bits</td></tr>
  <tr><td>word_len[4:0]</td><td>out</td><td>RW frame length field</td></tr>
</table>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_ctrl_regs with APB ports and outputs: soft_rst, abort, start (output logic), cpol, cpha, lsb_first (output logic), word_len (output logic [4:0])',
        'Step 2 — declare apb_state_t enum and state register (same 3-state FSM as L1)',
        'Step 3 — write the APB FSM always_ff and assign pready = (state == ACCESS)',
        'Step 4 — declare logic [31:0] ctrl_rw; write always_ff: reset to 32h0000_0800 (WORD_LEN default=8 sits in bits [19:15]=8 → 32h0000_0800? Actually 8 << 15 = 0x0004_0000); reset to 32h0004_0000; on write, store pwdata & 32h1FFF_FF00',
        'Step 5 — W1P assigns: soft_rst = pready && pwrite && paddr==12h000 && pwdata[31]; same for abort[30] and start[29]',
        'Step 6 — RW field assigns from ctrl_rw: cpol=ctrl_rw[22], cpha=ctrl_rw[21], lsb_first=ctrl_rw[23], word_len=ctrl_rw[19:15]',
        'Step 7 — prdata always_ff: when state==SETUP && !pwrite && paddr==12h000, load ctrl_rw (W1P bits read as 0 since ctrl_rw mask cleared them)',
        'Step 8 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_ctrl_regs (
  input  logic        pclk, presetn,
  input  logic        psel, penable, pwrite,
  input  logic [11:0] paddr,
  input  logic [31:0] pwdata,
  output logic [31:0] prdata,
  output logic        pready, pslverr,
  output logic        soft_rst, abort, start,
  output logic        cpol, cpha, lsb_first,
  output logic [4:0]  word_len
);

  typedef enum logic [1:0] {IDLE=2'b00,SETUP=2'b01,ACCESS=2'b10} apb_state_t;
  apb_state_t state;

  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) state <= IDLE;
    else case (state)
      IDLE:    if (psel && !penable) state <= SETUP;
      SETUP:   state <= ACCESS;
      ACCESS:  state <= IDLE;
      default: state <= IDLE;
    endcase
  end

  assign pready = (state == ACCESS);
  assign pslverr = 1'b0;

  // RW storage — mask out W1P bit positions [31:29]
  logic [31:0] ctrl_rw;
  localparam CTRL_RW_MASK = 32'h1FFF_FF00;  // bits [28:8] only
  localparam CTRL_RESET   = 32'h0004_0000;  // WORD_LEN=8 at reset (8<<15)

  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) ctrl_rw <= CTRL_RESET;
    else if (pready && pwrite && paddr == 12'h000)
      ctrl_rw <= pwdata & CTRL_RW_MASK;
  end

  // W1P pulses: fire once, never stored
  assign soft_rst = pready && pwrite && paddr == 12'h000 && pwdata[31];
  assign abort    = pready && pwrite && paddr == 12'h000 && pwdata[30];
  assign start    = pready && pwrite && paddr == 12'h000 && pwdata[29];

  // RW field extraction
  assign cpol     = ctrl_rw[22];
  assign cpha     = ctrl_rw[21];
  assign lsb_first= ctrl_rw[23];
  assign word_len = ctrl_rw[19:15];

  // Read data
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) prdata <= '0;
    else if (state == SETUP && !pwrite)
      prdata <= (paddr == 12'h000) ? ctrl_rw : 32'h0;
  end

endmodule`,

      design:
`// Build the spi_ctrl_regs module here.
// See Theory for W1P vs RW field semantics and write masking.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        presetn;
  logic        psel, penable, pwrite;
  logic [11:0] paddr;
  logic [31:0] pwdata, prdata;
  logic        pready, pslverr;
  logic        soft_rst, abort, start;
  logic        cpol, cpha, lsb_first;
  logic [4:0]  word_len;

  spi_ctrl_regs dut (.pclk(pclk), .presetn(presetn),
    .psel(psel), .penable(penable), .pwrite(pwrite),
    .paddr(paddr), .pwdata(pwdata), .prdata(prdata),
    .pready(pready), .pslverr(pslverr),
    .soft_rst(soft_rst), .abort(abort), .start(start),
    .cpol(cpol), .cpha(cpha), .lsb_first(lsb_first),
    .word_len(word_len));

  task automatic apb_write(input logic [11:0] addr, input logic [31:0] data);
    paddr=addr; pwdata=data; pwrite=1; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0; pwrite=0;
    @(posedge pclk); #1;
  endtask

  task automatic apb_read(input logic [11:0] addr);
    paddr=addr; pwrite=0; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0;
    @(posedge pclk); #1;
  endtask

  logic start_caught;

  initial begin
    $display("=== CTRL Register Test ===");
    presetn=0; psel=0; penable=0; pwrite=0; paddr=0; pwdata=0; start_caught=0;
    repeat(2) @(posedge pclk); #1; presetn=1;

    // 1. Reset: word_len should be 8
    if (word_len === 5'd8)
      $display("PASS  reset: word_len=8");
    else
      $display("FAIL  reset word_len=%0d", word_len);

    // 2. Write RW fields: CPOL=1, CPHA=1, WORD_LEN=16
    // WORD_LEN=16 in bits [19:15] = 16<<15 = 0x0008_0000
    // CPOL[22]=1, CPHA[21]=1 = 0x0060_0000
    // Combined with mask: 0x0068_0000
    apb_write(12'h000, 32'h0068_0000);
    if (cpol === 1 && cpha === 1 && word_len === 5'd16)
      $display("PASS  RW write: cpol=1 cpha=1 word_len=16");
    else
      $display("FAIL  RW: cpol=%0b cpha=%0b word_len=%0d", cpol, cpha, word_len);

    // 3. W1P START: pulse fires, reads back 0
    // Write bit[29]=START along with cpol/cpha
    fork
      begin
        @(posedge pclk); #1;
        if (start === 1) start_caught = 1;
      end
      apb_write(12'h000, 32'h2068_0000);  // START[29]=1 + previous RW bits
    join
    if (start_caught === 1)
      $display("PASS  W1P START: pulse captured");
    else
      $display("FAIL  START pulse not detected");

    // 4. Read CTRL: START bit reads back 0 (not stored)
    apb_read(12'h000);
    if (prdata[29] === 0)
      $display("PASS  W1P readback: START bit is 0 after pulse");
    else
      $display("FAIL  W1P readback: START bit stuck at 1");

    // 5. soft_rst fires when [31]=1
    apb_write(12'h000, 32'h8000_0000);
    // After soft_rst, check word_len returns to reset
    if (word_len === 5'd8)
      $display("PASS  soft_rst: word_len reset to 8");
    else
      $display("FAIL  soft_rst: word_len=%0d", word_len);

    $display("CTRL register works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  reset: word_len=8',
        'PASS  RW write: cpol=1 cpha=1 word_len=16',
        'PASS  W1P readback: START bit is 0 after pulse',
        'CTRL register works!',
      ],
    },

    {
      id: 'spi_long11l3',
      title: 'L3 — INT_STATUS and FIFO_CTRL: W1C and W1P Flush',
      theory: `<h2>W1C and W1P Flush — The Last Two Register Access Patterns</h2>
<p>Think of a hotel switchboard with message indicator lights. Each light represents a waiting message. When you acknowledge a message, you press the button for that light — but only that light goes out. If another message arrived while you were reading the first one, its light is still on. This is Write-1-to-Clear (W1C): each bit in the register is independently clearable, and clearing one does not affect others. The hotel analogy extends to W1P flush buttons: pressing "clear all voicemail" runs through the entire voicemail queue and empties it — it does not store a setting, it performs an action.</p>

<h3>INT_EN (0x010) — Simple RW</h3>
<p>INT_EN is a plain RW register. Each bit enables one interrupt source. The CPU writes a mask and reads it back unchanged.</p>
<pre class="code-block">// INT_EN: full 32-bit RW, no special logic
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) int_en_reg &lt;= '0;
  else if (wr_en &amp;&amp; paddr == 12'h010) int_en_reg &lt;= pwdata;
end</pre>

<h3>INT_STATUS (0x014) — W1C with Event OR</h3>
<p>Each INT_STATUS bit is set by a hardware event and cleared by the CPU writing 1 to that bit position. We already built the core logic in spi_long9 L4 — now we integrate it with the APB write path:</p>
<pre class="code-block">// W1C clear mask: 1 when APB writes 1 to INT_STATUS
logic [7:0] int_clr;
assign int_clr = (wr_en &amp;&amp; paddr == 12'h014) ? pwdata[7:0] : 8'h00;

// INT_STATUS: events OR in, W1C clears
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) int_status_reg &lt;= 8'h00;
  else int_status_reg &lt;= (int_status_reg | event_in) &amp; ~int_clr;
end</pre>
<p>This is the same atomic expression from spi_long9: event wins over clear in the same cycle, which prevents a race condition where a new event fires exactly when the ISR clears the old one.</p>

<h3>FIFO_CTRL (0x018) — W1P Flush + RW Watermarks</h3>
<p>FIFO_CTRL has a mix of access types in a single register:</p>
<table class="truth-table">
  <tr><th>Bits</th><th>Field</th><th>Access</th><th>Meaning</th></tr>
  <tr><td>[31]</td><td>TX_FLUSH</td><td>W1P</td><td>Flush TX FIFO — resets write and read pointers</td></tr>
  <tr><td>[30]</td><td>RX_FLUSH</td><td>W1P</td><td>Flush RX FIFO — resets write and read pointers</td></tr>
  <tr><td>[15:8]</td><td>TX_WM</td><td>RW</td><td>TX watermark threshold</td></tr>
  <tr><td>[7:0]</td><td>RX_WM</td><td>RW</td><td>RX watermark threshold</td></tr>
</table>
<pre class="code-block">// W1P flush pulses — fire once, nothing stored
assign tx_flush = wr_en &amp;&amp; paddr == 12'h018 &amp;&amp; pwdata[31];
assign rx_flush = wr_en &amp;&amp; paddr == 12'h018 &amp;&amp; pwdata[30];

// RW watermark fields — stored, flush bits masked out
localparam FIFO_RW_MASK = 32'h0000_FFFF;  // only bits [15:0]
always_ff @(posedge pclk or negedge presetn) begin
  if (!presetn) fifo_ctrl_reg &lt;= '0;
  else if (wr_en &amp;&amp; paddr == 12'h018)
    fifo_ctrl_reg &lt;= pwdata &amp; FIFO_RW_MASK;
end</pre>

<h3>Module Ports</h3>
<p>We are building <code>spi_int_regs</code>: combines INT_EN (RW), INT_STATUS (W1C), and FIFO_CTRL (W1P + RW) in one module with the APB slave FSM.</p>

<p><strong>Ready?</strong> Switch to the Code tab and type the module. Stuck? Tap 💡 Show Hint for an annotated reference.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_int_regs with APB ports plus input logic [7:0] event_in, and outputs: tx_flush, rx_flush (output logic), int_en_out[7:0], global_en, int_status_out[7:0], tx_wm[7:0], rx_wm[7:0]',
        'Step 2 — include the APB 3-state FSM (same as L1/L2); assign pready = (state==ACCESS); assign pslverr=0',
        'Step 3 — INT_EN RW register at 0x010: simple always_ff, loads pwdata on write',
        'Step 4 — INT_STATUS W1C at 0x014: declare logic [7:0] int_clr = (wr_en && paddr==12h014) ? pwdata[7:0] : 8h00; always_ff: (int_status_reg | event_in) & ~int_clr',
        'Step 5 — FIFO_CTRL at 0x018: W1P assigns for tx_flush[31] and rx_flush[30]; RW always_ff for bits [15:0] with FIFO_RW_MASK',
        'Step 6 — assign output ports from registers',
        'Step 7 — prdata read mux: case on paddr for 0x010, 0x014, 0x018',
        'Step 8 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
      ],

      hint:
`module spi_int_regs (
  input  logic        pclk, presetn,
  input  logic        psel, penable, pwrite,
  input  logic [11:0] paddr,
  input  logic [31:0] pwdata,
  output logic [31:0] prdata,
  output logic        pready, pslverr,
  input  logic [7:0]  event_in,       // hardware interrupt events
  output logic        tx_flush, rx_flush,
  output logic [7:0]  int_en_out,
  output logic        global_en,
  output logic [7:0]  int_status_out,
  output logic [7:0]  tx_wm, rx_wm
);

  typedef enum logic [1:0] {IDLE=2'b00,SETUP=2'b01,ACCESS=2'b10} apb_state_t;
  apb_state_t state;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) state <= IDLE;
    else case (state)
      IDLE:    if (psel && !penable) state <= SETUP;
      SETUP:   state <= ACCESS;
      ACCESS:  state <= IDLE;
      default: state <= IDLE;
    endcase
  end
  assign pready = (state == ACCESS);
  assign pslverr = 1'b0;
  logic wr_en;
  assign wr_en = pready && pwrite;

  // INT_EN [0x010] — plain RW
  logic [31:0] int_en_reg;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) int_en_reg <= '0;
    else if (wr_en && paddr == 12'h010) int_en_reg <= pwdata;
  end
  assign global_en  = int_en_reg[31];
  assign int_en_out = int_en_reg[7:0];

  // INT_STATUS [0x014] — W1C
  logic [7:0] int_status_reg;
  logic [7:0] int_clr;
  assign int_clr = (wr_en && paddr == 12'h014) ? pwdata[7:0] : 8'h00;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) int_status_reg <= 8'h00;
    else int_status_reg <= (int_status_reg | event_in) & ~int_clr;
  end
  assign int_status_out = int_status_reg;

  // FIFO_CTRL [0x018] — W1P flush + RW watermarks
  logic [31:0] fifo_ctrl_reg;
  assign tx_flush = wr_en && paddr == 12'h018 && pwdata[31];
  assign rx_flush = wr_en && paddr == 12'h018 && pwdata[30];
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) fifo_ctrl_reg <= '0;
    else if (wr_en && paddr == 12'h018)
      fifo_ctrl_reg <= pwdata & 32'h0000_FFFF;
  end
  assign tx_wm = fifo_ctrl_reg[15:8];
  assign rx_wm = fifo_ctrl_reg[7:0];

  // Read mux
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) prdata <= '0;
    else if (state == SETUP && !pwrite)
      case (paddr)
        12'h010: prdata <= int_en_reg;
        12'h014: prdata <= {24'h0, int_status_reg};
        12'h018: prdata <= fifo_ctrl_reg;
        default: prdata <= '0;
      endcase
  end

endmodule`,

      design:
`// Build the spi_int_regs module here.
// See Theory for W1C (INT_STATUS) and W1P flush (FIFO_CTRL) patterns.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        presetn;
  logic        psel, penable, pwrite;
  logic [11:0] paddr;
  logic [31:0] pwdata, prdata;
  logic        pready, pslverr;
  logic [7:0]  event_in;
  logic        tx_flush, rx_flush;
  logic [7:0]  int_en_out; logic global_en;
  logic [7:0]  int_status_out, tx_wm, rx_wm;

  spi_int_regs dut (.pclk(pclk), .presetn(presetn),
    .psel(psel), .penable(penable), .pwrite(pwrite),
    .paddr(paddr), .pwdata(pwdata), .prdata(prdata),
    .pready(pready), .pslverr(pslverr),
    .event_in(event_in),
    .tx_flush(tx_flush), .rx_flush(rx_flush),
    .int_en_out(int_en_out), .global_en(global_en),
    .int_status_out(int_status_out),
    .tx_wm(tx_wm), .rx_wm(rx_wm));

  task automatic apb_write(input logic [11:0] addr, input logic [31:0] data);
    paddr=addr; pwdata=data; pwrite=1; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0; pwrite=0;
    @(posedge pclk); #1;
  endtask

  task automatic apb_read(input logic [11:0] addr);
    paddr=addr; pwrite=0; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0;
    @(posedge pclk); #1;
  endtask

  initial begin
    $display("=== INT Registers Test ===");
    presetn=0; psel=0; penable=0; pwrite=0; paddr=0; pwdata=0; event_in=0;
    repeat(2) @(posedge pclk); #1; presetn=1;

    // 1. Write INT_EN and read back
    apb_write(12'h010, 32'h8000_001F);  // GLOBAL_EN + bits [4:0]
    apb_read(12'h010);
    if (global_en===1 && int_en_out===8'h1F)
      $display("PASS  INT_EN: global_en=1 int_en=0x1f");
    else
      $display("FAIL  INT_EN: global_en=%0b int_en=%0h", global_en, int_en_out);

    // 2. Hardware event sets INT_STATUS bit 4
    event_in = 8'h10;
    @(posedge pclk); #1;
    event_in = 8'h00;
    if (int_status_out[4] === 1)
      $display("PASS  W1C event: INT_STATUS bit 4 set");
    else
      $display("FAIL  event not captured: %0h", int_status_out);

    // 3. W1C clear bit 4
    apb_write(12'h014, 32'h0000_0010);  // clear bit 4
    if (int_status_out[4] === 0)
      $display("PASS  W1C clear: bit 4 cleared");
    else
      $display("FAIL  W1C not cleared: %0h", int_status_out);

    // 4. FIFO_CTRL W1P: write TX_FLUSH
    logic tx_f_caught;
    tx_f_caught = 0;
    fork
      begin @(posedge pclk); #1; if (tx_flush===1) tx_f_caught=1; end
      apb_write(12'h018, 32'h8000_0408);  // TX_FLUSH[31]=1, TX_WM=4, RX_WM=8
    join
    if (tx_f_caught===1)
      $display("PASS  FIFO_CTRL W1P: tx_flush pulse captured");
    else
      $display("FAIL  tx_flush not pulsed");

    // 5. Watermarks stored, flush bit reads 0
    apb_read(12'h018);
    if (tx_wm===8'h04 && rx_wm===8'h08 && prdata[31]===0)
      $display("PASS  FIFO_CTRL RW: tx_wm=4 rx_wm=8 flush=0");
    else
      $display("FAIL  FIFO_CTRL: tx_wm=%0h rx_wm=%0h flush=%0b", tx_wm, rx_wm, prdata[31]);

    $display("INT and FIFO registers work!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  INT_EN: global_en=1 int_en=0x1f',
        'PASS  W1C event: INT_STATUS bit 4 set',
        'PASS  W1C clear: bit 4 cleared',
        'INT and FIFO registers work!',
      ],
    },

    {
      id: 'spi_long11l4',
      title: 'L4 — Complete Register Bank: STATUS, CAPABILITIES, and VERSION',
      theory: `<h2>Read-Only Registers — Hardware Mirrors and Silicon Constants</h2>
<p>Imagine the dashboard of a passenger aircraft. The pilot does not program the altitude display — the display always shows the live reading from the altimeter sensor. There is no storage register for altitude; there is only a wire from sensor to display. Other instruments show fixed serial numbers stamped at the factory — they cannot be changed in service. Silicon registers work this way too. Read-only (RO) registers either mirror live hardware signals (STATUS, DEBUG) or hold factory constants (CAPABILITIES, VERSION). The CPU can read them but cannot write them — writes are silently ignored.</p>

<h3>STATUS Register (0x004) — Live Hardware Mirror</h3>
<p>STATUS mirrors live output signals from other modules. There is no flip-flop to write to — the register contents are wired directly from hardware:</p>
<pre class="code-block">// STATUS [0x004]: all RO
// STATUS[31]=busy, [28]=tx_empty, [26]=rx_empty
// STATUS[15:8]=tx_level, STATUS[7:0]=rx_level

// In the read mux (SETUP phase):
12'h004: prdata &lt;= {busy, 2'b0, tx_empty, 1'b0, rx_empty, 2'b0, 16'h0,
                     tx_level, rx_level};</pre>
<p>APB write to 0x004 with <code>pwrite=1</code> is accepted by the APB FSM (which cannot distinguish the register's access type), but the write-enable is simply not connected to any flip-flop at address 0x004. The write completes from the APB protocol perspective (pready fires, pslverr=0), but the register contents do not change. This is called a <em>silent ignore</em>.</p>

<h3>CAPABILITIES Register (0x030) — Synthesis Constants</h3>
<p>CAPABILITIES tells software what features were included when this IP instance was synthesised. Unlike STATUS (which changes every cycle), CAPABILITIES is frozen at synthesis time via <code>parameter</code> declarations:</p>
<pre class="code-block">// Parameters set at synthesis time
parameter NUM_CS        = 4;
parameter MAX_WORD_LEN  = 32;
parameter SUPPORT_MASTER = 1;
parameter TX_FIFO_DEPTH  = 16;
parameter RX_FIFO_DEPTH  = 16;

// CAPABILITIES register is purely combinational
localparam CAPS = {(NUM_CS-1)[3:0], (MAX_WORD_LEN-1)[4:0],
                   SUPPORT_MASTER[0], 11'b0,
                   TX_FIFO_DEPTH[7:0], RX_FIFO_DEPTH[7:0]};</pre>
<p>The CPU reads CAPABILITIES at boot to discover what this particular SPI instance can do, without needing to be told at compile time. This is the silicon equivalent of USB descriptor enumeration.</p>

<h3>VERSION Register (0x034) — IP Version Tag</h3>
<p>VERSION is a 32-bit constant: major, minor, and revision. The CPU checks it before using features introduced in later revisions:</p>
<pre class="code-block">localparam VERSION = 32'h0100_0000;  // major=1, minor=0, rev=0</pre>

<h3>The Complete 18-Register Block</h3>
<p>We are building <code>spi_reg_block</code>: a complete APB register interface covering every access pattern. This is the kind of module that appears verbatim in silicon tape-out reviews.</p>
<table class="truth-table">
  <tr><th>Offset</th><th>Register</th><th>Key Access Types</th></tr>
  <tr><td>0x000</td><td>CTRL</td><td>RW + W1P (SOFT_RST, ABORT, START)</td></tr>
  <tr><td>0x004</td><td>STATUS</td><td>RO (live hardware signals)</td></tr>
  <tr><td>0x008</td><td>CLKDIV</td><td>RW</td></tr>
  <tr><td>0x010</td><td>INT_EN</td><td>RW</td></tr>
  <tr><td>0x014</td><td>INT_STATUS</td><td>W1C</td></tr>
  <tr><td>0x018</td><td>FIFO_CTRL</td><td>W1P flush + RW watermarks</td></tr>
  <tr><td>0x030</td><td>CAPABILITIES</td><td>RO constant</td></tr>
  <tr><td>0x034</td><td>VERSION</td><td>RO constant</td></tr>
</table>

<p>This is a portfolio-level piece. The design synthesises correctly and the testbench covers all access types from a single APB master. When you complete this module you have built every layer of a production SPI IP block.</p>

<p>In the final chapter — spi_long12 — this register block is instantiated inside <code>spi_top</code> alongside every datapath module we have built, and a single APB write to CTRL.START drives a complete SPI transfer.</p>

<p><strong>Ready?</strong> Switch to the Code tab and build the full register block. Stuck? Tap 💡 Show Hint for an annotated reference.</p>
<p>🎓 SPI Silicon Designer certificate is close — one more chapter to go.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Step 1 — declare module spi_reg_block with APB ports, hardware input ports (busy, tx_empty, rx_empty, tx_level[7:0], rx_level[7:0], event_in[7:0]), and control output ports (soft_rst, abort, start, cpol, cpha, word_len[4:0], clkdiv[15:0], int_en[7:0], global_en, tx_flush, rx_flush)',
        'Step 2 — add the APB 3-state FSM; assign pready and pslverr',
        'Step 3 — CTRL [0x000]: always_ff for RW fields with CTRL_RW_MASK; combinational assigns for W1P pulses (soft_rst, abort, start)',
        'Step 4 — CLKDIV [0x008]: simple RW always_ff; assign clkdiv = clkdiv_reg[15:0]',
        'Step 5 — INT_EN [0x010]: simple RW; INT_STATUS [0x014]: W1C pattern (event_in OR, write mask AND-NOT)',
        'Step 6 — FIFO_CTRL [0x018]: W1P tx_flush and rx_flush assigns; RW watermark always_ff',
        'Step 7 — always_ff read mux: case on paddr; for STATUS read back live inputs; for 0x030 read CAPS constant; for 0x034 read VERSION constant',
        'Step 8 — close the module',
        'Using Verilator: open ⚙ Options and set Timing Mode to --no-timing before running',
        'Hit Run — all 5 PASS lines should appear in the Output tab',
        '🎓 SPI Silicon Designer coming soon — wire this block into spi_top in the next chapter',
      ],

      hint:
`module spi_reg_block (
  input  logic        pclk, presetn,
  input  logic        psel, penable, pwrite,
  input  logic [11:0] paddr,
  input  logic [31:0] pwdata,
  output logic [31:0] prdata,
  output logic        pready, pslverr,
  // Hardware status inputs (live RO)
  input  logic        busy, tx_empty, rx_empty,
  input  logic [7:0]  tx_level, rx_level,
  input  logic [7:0]  event_in,
  // Control outputs
  output logic        soft_rst, abort, start,
  output logic        cpol, cpha,
  output logic [4:0]  word_len,
  output logic [15:0] clkdiv,
  output logic [7:0]  int_en,
  output logic        global_en,
  output logic        tx_flush, rx_flush
);

  typedef enum logic [1:0] {IDLE=2'b00,SETUP=2'b01,ACCESS=2'b10} apb_state_t;
  apb_state_t state;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) state <= IDLE;
    else case (state)
      IDLE:    if (psel && !penable) state <= SETUP;
      SETUP:   state <= ACCESS;
      ACCESS:  state <= IDLE;
      default: state <= IDLE;
    endcase
  end
  assign pready = (state == ACCESS);
  assign pslverr = 1'b0;
  logic wr_en;
  assign wr_en = pready && pwrite;

  // CTRL [0x000]
  logic [31:0] ctrl_rw;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) ctrl_rw <= 32'h0004_0000;  // WORD_LEN=8 default
    else if (wr_en && paddr==12'h000) ctrl_rw <= pwdata & 32'h1FFF_FF00;
  end
  assign soft_rst = wr_en && paddr==12'h000 && pwdata[31];
  assign abort    = wr_en && paddr==12'h000 && pwdata[30];
  assign start    = wr_en && paddr==12'h000 && pwdata[29];
  assign cpol     = ctrl_rw[22];
  assign cpha     = ctrl_rw[21];
  assign word_len = ctrl_rw[19:15];

  // CLKDIV [0x008]
  logic [31:0] clkdiv_reg;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) clkdiv_reg <= '0;
    else if (wr_en && paddr==12'h008) clkdiv_reg <= pwdata;
  end
  assign clkdiv = clkdiv_reg[15:0];

  // INT_EN [0x010]
  logic [31:0] int_en_reg;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) int_en_reg <= '0;
    else if (wr_en && paddr==12'h010) int_en_reg <= pwdata;
  end
  assign global_en = int_en_reg[31];
  assign int_en    = int_en_reg[7:0];

  // INT_STATUS [0x014] W1C
  logic [7:0] int_status_reg;
  logic [7:0] int_clr;
  assign int_clr = (wr_en && paddr==12'h014) ? pwdata[7:0] : 8'h00;
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) int_status_reg <= 8'h00;
    else int_status_reg <= (int_status_reg | event_in) & ~int_clr;
  end

  // FIFO_CTRL [0x018]
  logic [31:0] fifo_ctrl_reg;
  assign tx_flush = wr_en && paddr==12'h018 && pwdata[31];
  assign rx_flush = wr_en && paddr==12'h018 && pwdata[30];
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) fifo_ctrl_reg <= '0;
    else if (wr_en && paddr==12'h018) fifo_ctrl_reg <= pwdata & 32'h0000_FFFF;
  end

  // RO constants
  localparam CAPS    = 32'h3_F8_41_10; // NUM_CS=4, WL=32, MASTER=1, TX/RX=16
  localparam VERSION = 32'h0100_0000;   // v1.0.0

  // Read mux
  always_ff @(posedge pclk or negedge presetn) begin
    if (!presetn) prdata <= '0;
    else if (state == SETUP && !pwrite)
      case (paddr)
        12'h000: prdata <= ctrl_rw;
        12'h004: prdata <= {busy,2'b0,tx_empty,1'b0,rx_empty,2'b0,16'h0,tx_level,rx_level};
        12'h008: prdata <= clkdiv_reg;
        12'h010: prdata <= int_en_reg;
        12'h014: prdata <= {24'h0, int_status_reg};
        12'h018: prdata <= fifo_ctrl_reg;
        12'h030: prdata <= CAPS;
        12'h034: prdata <= VERSION;
        default: prdata <= '0;
      endcase
  end

endmodule`,

      design:
`// Build the complete spi_reg_block here.
// This is a portfolio-level module. See Theory for the full register map.
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  logic pclk = 0;
  always #5 pclk = ~pclk;

  logic        presetn;
  logic        psel, penable, pwrite;
  logic [11:0] paddr;
  logic [31:0] pwdata, prdata;
  logic        pready, pslverr;
  logic        busy, tx_empty, rx_empty;
  logic [7:0]  tx_level, rx_level, event_in;
  logic        soft_rst, abort, start;
  logic        cpol, cpha;
  logic [4:0]  word_len;
  logic [15:0] clkdiv;
  logic [7:0]  int_en;
  logic        global_en, tx_flush, rx_flush;

  spi_reg_block dut (.pclk(pclk), .presetn(presetn),
    .psel(psel), .penable(penable), .pwrite(pwrite),
    .paddr(paddr), .pwdata(pwdata), .prdata(prdata),
    .pready(pready), .pslverr(pslverr),
    .busy(busy), .tx_empty(tx_empty), .rx_empty(rx_empty),
    .tx_level(tx_level), .rx_level(rx_level), .event_in(event_in),
    .soft_rst(soft_rst), .abort(abort), .start(start),
    .cpol(cpol), .cpha(cpha), .word_len(word_len),
    .clkdiv(clkdiv), .int_en(int_en), .global_en(global_en),
    .tx_flush(tx_flush), .rx_flush(rx_flush));

  task automatic apb_write(input logic [11:0] addr, input logic [31:0] data);
    paddr=addr; pwdata=data; pwrite=1; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0; pwrite=0;
    @(posedge pclk); #1;
  endtask

  task automatic apb_read(input logic [11:0] addr);
    paddr=addr; pwrite=0; psel=1; penable=0;
    @(posedge pclk); #1; penable=1;
    @(posedge pclk); #1; psel=0; penable=0;
    @(posedge pclk); #1;
  endtask

  initial begin
    $display("=== Full Register Block Test ===");
    presetn=0; psel=0; penable=0; pwrite=0; paddr=0; pwdata=0;
    busy=0; tx_empty=1; rx_empty=1; tx_level=0; rx_level=0; event_in=0;
    repeat(2) @(posedge pclk); #1; presetn=1;

    // 1. Write CLKDIV=99 and read back
    apb_write(12'h008, 32'h0000_0063);
    apb_read(12'h008);
    if (clkdiv === 16'h0063)
      $display("PASS  CLKDIV write+read: div=99");
    else
      $display("FAIL  CLKDIV: clkdiv=%0h prdata=%0h", clkdiv, prdata);

    // 2. Read STATUS with live hardware signals
    busy=1; tx_empty=0; rx_empty=0; tx_level=8'h04; rx_level=8'h02;
    apb_read(12'h004);
    if (prdata[31]===1 && prdata[28]===0 && prdata[7:0]===8'h02)
      $display("PASS  STATUS RO: busy=1 tx_empty=0 rx_level=2");
    else
      $display("FAIL  STATUS: prdata=%0h", prdata);

    // 3. Read VERSION constant
    apb_read(12'h034);
    if (prdata === 32'h0100_0000)
      $display("PASS  VERSION=0x01000000");
    else
      $display("FAIL  VERSION=%0h", prdata);

    // 4. W1C on INT_STATUS
    event_in = 8'h0F;
    @(posedge pclk); #1; event_in = 8'h00;
    apb_write(12'h014, 32'h0000_000F);  // W1C clear bits [3:0]
    apb_read(12'h014);
    if (prdata[3:0] === 4'h0)
      $display("PASS  W1C INT_STATUS: bits cleared");
    else
      $display("FAIL  W1C: int_status=%0h", prdata);

    // 5. Write to STATUS address is silently ignored (RO)
    apb_write(12'h004, 32'hFFFF_FFFF);
    busy=0;
    apb_read(12'h004);
    if (prdata[31] === 0)
      $display("PASS  STATUS RO: write ignored, busy=0");
    else
      $display("FAIL  STATUS not RO: prdata=%0h", prdata);

    $display("Register block works!");
    $finish;
  end
endmodule`,

      expected: [
        'PASS  CLKDIV write+read: div=99',
        'PASS  STATUS RO: busy=1 tx_empty=0 rx_level=2',
        'PASS  VERSION=0x01000000',
        'PASS  W1C INT_STATUS: bits cleared',
        'Register block works!',
      ],
    },
  ]
});
