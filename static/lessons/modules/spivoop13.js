(window.CURRICULUM_MODULES = window.CURRICULUM_MODULES || []).push({
  id: 'spivoop13',
  title: 'Ch.13 — Functional Coverage',
  icon: '📊',
  level: 'advanced',
  lessons: [
    {
      id: 'spivoop13l1',
      title: 'L1 — Build a Coverage Model From Scratch',
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
          name: 'spi_transaction.sv',
          from: 'spivoop1-spivoop1l1-design',
          fallback:
`class spi_transaction;
  logic [7:0] data;
  function new(); data = 8'h00; endfunction
endclass`
        },
        {
          name: 'spi_driver.sv',
          from: 'spivoop5-spivoop5l1-design',
          fallback:
`class spi_driver;
  virtual spi_if vif;
  function new(virtual spi_if v); vif = v; endfunction
  task drive_byte(logic [7:0] data);
    vif.cs_n = 0; #2;
    for (int i = 7; i >= 0; i--) begin
      vif.mosi = data[i]; #2; vif.sclk = 1; #2; vif.sclk = 0; #2;
    end
    vif.cs_n = 1; #2;
  endtask
endclass`
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
`<h2>Functional Coverage — Proving You Tested What Matters</h2>
<p>Code coverage tells you which <em>lines ran</em>. Functional coverage tells you which <em>scenarios occurred</em>. A testbench can achieve 100% line coverage while never sending the byte <code>8'hFF</code> or never stressing back-to-back frames. Functional coverage tracks the scenarios <em>you defined as important</em>, and the simulation is not done until every one of them is hit.</p>

<h3>What a bin is</h3>
<p>A <strong>bin</strong> is a single flag: 0 means “not yet seen”, 1 means “this scenario occurred at least once”. The coverage percentage is simply <em>how many bins are 1</em> divided by <em>total bins</em>. You define which scenarios deserve bins; the coverage model tracks whether they happened.</p>

<h3>Part 1 — Declaring the bins (line by line)</h3>
<pre class="code-block">class spi_coverage_model;          // plain class, no base needed
  // Corner-case bins: six values that are especially likely to expose bugs
  bit cov_zero     = 0;           // 8'h00 — all-zero pattern, tests stuck-at-1
  bit cov_all_ones = 0;           // 8'hFF — all-one pattern, tests stuck-at-0
  bit cov_alt_hi   = 0;           // 8'hAA — 1010_1010, alternating from bit7
  bit cov_alt_lo   = 0;           // 8'h55 — 0101_0101, alternating from bit0
  bit cov_msb_only = 0;           // 8'h80 — only bit 7 set; catches MSB shift bugs
  bit cov_lsb_only = 0;           // 8'h01 — only bit 0 set; catches LSB shift bugs

  // Nibble-sweep bins: one flag per nibble value (0x0..0xF)
  bit cov_hi[16];                 // cov_hi[n] = 1 if upper nibble n was ever sent
  bit cov_lo[16];                 // cov_lo[n] = 1 if lower nibble n was ever sent
                                  // 16+16 = 32 nibble bins cover all 256 byte values
endclass</pre>

<p>Using <code>bit</code> (not <code>int</code>) for flags keeps the intent clear: this is a boolean, not a counter. Verilator defaults <code>bit</code> arrays to 0, so no explicit initialisation is needed for <code>cov_hi</code> and <code>cov_lo</code>.</p>

<h3>Part 2 — The sample() function (line by line)</h3>
<p><code>sample()</code> is called once per SPI frame, right after the scoreboard checks the byte. It updates whichever bins apply to this byte.</p>
<pre class="code-block">  function void sample(logic [7:0] data);
    // Corner bins: simple equality checks
    if (data === 8'h00) cov_zero     = 1;  // mark zero bin as hit
    if (data === 8'hFF) cov_all_ones = 1;  // mark all-ones bin as hit
    if (data === 8'hAA) cov_alt_hi   = 1;
    if (data === 8'h55) cov_alt_lo   = 1;
    if (data === 8'h80) cov_msb_only = 1;
    if (data === 8'h01) cov_lsb_only = 1;

    // Nibble bins: extract the nibble, use it as array index
    cov_hi[ data[7:4] ] = 1;   // data[7:4] → bits 7 down to 4 = upper nibble (0..15)
    cov_lo[ data[3:0] ] = 1;   // data[3:0] → bits 3 down to 0 = lower nibble (0..15)
    // Example: data = 8'hA5 → data[7:4]=4'hA=10, data[3:0]=4'h5=5
    //          → cov_hi[10]=1, cov_lo[5]=1
  endfunction</pre>

<h3>Part 3 — Calculating coverage (line by line)</h3>
<p>The function returns a percentage as a <code>real</code> (floating-point) number.</p>
<pre class="code-block">  function real get_coverage();
    int hit   = 0;               // local counter; recomputed fresh every call
    int total = 6 + 16 + 16;    // 6 corner bins + 16 hi bins + 16 lo bins = 38

    // Count corner bins
    if (cov_zero)     hit++;     // if flag is 1, this bin was hit
    if (cov_all_ones) hit++;
    if (cov_alt_hi)   hit++;
    if (cov_alt_lo)   hit++;
    if (cov_msb_only) hit++;
    if (cov_lsb_only) hit++;

    // Count nibble bins with foreach
    foreach (cov_hi[i]) if (cov_hi[i]) hit++;   // loops i=0..15
    foreach (cov_lo[i]) if (cov_lo[i]) hit++;

    // Divide and convert to percentage
    return (real'(hit) / real'(total)) * 100.0;
    // real'(hit) → cast int to float before dividing
    // Without the cast, int/int truncates: 19/38 = 0, not 50.0
  endfunction</pre>

<h3>Part 4 — The report() function</h3>
<pre class="code-block">  function void report();
    int hi_count = 0, lo_count = 0;
    foreach (cov_hi[i]) if (cov_hi[i]) hi_count++;
    foreach (cov_lo[i]) if (cov_lo[i]) lo_count++;
    $display("Coverage: %.1f%% (%0d/38 bins)", get_coverage(),
             (cov_zero+cov_all_ones+cov_alt_hi+cov_alt_lo+cov_msb_only+cov_lsb_only)
             + hi_count + lo_count);
    $display("  Corner bins: zero=%0b all_ones=%0b alt_hi=%0b alt_lo=%0b msb=%0b lsb=%0b",
             cov_zero, cov_all_ones, cov_alt_hi, cov_alt_lo, cov_msb_only, cov_lsb_only);
    $display("  Upper nibble: %0d/16 bins hit", hi_count);
    $display("  Lower nibble: %0d/16 bins hit", lo_count);
  endfunction</pre>

<h3>Coverage goal and convergence</h3>
<p>A verification plan specifies a goal: “run until coverage &ge; 95%”. The testbench loop becomes: <em>while (cov.get_coverage() &lt; 95.0) drive_random_byte();</em>. Directed tests hit the first 60–80%; constrained-random fills the remainder. This chapter builds the model; Ch.15 adds the random loop.</p>
<p><strong>Ready?</strong> Switch to the Code tab and build the class. The testbench will drive 12 specific bytes and print coverage twice — after the first 6 and after all 12. Stuck? Tap 💡 Show Hint.</p>`,

      tasks: [
        'Code tab is blank — type every line.',
        'Declare class spi_coverage_model;',
        'Add 6 corner-case bit flags: cov_zero, cov_all_ones, cov_alt_hi, cov_alt_lo, cov_msb_only, cov_lsb_only — all initialised = 0',
        'Add nibble arrays: bit cov_hi[16]; and bit cov_lo[16];',
        'Write function void sample(logic [7:0] data):',
        '  Six if-statements updating corner flags (use === for 4-state safety)',
        '  cov_hi[ data[7:4] ] = 1;  then  cov_lo[ data[3:0] ] = 1;',
        'Write function real get_coverage():',
        '  int hit=0; int total=38;',
        '  Six if-checks incrementing hit for each corner flag',
        '  foreach(cov_hi[i]) and foreach(cov_lo[i]) loops',
        '  return (real\'(hit) / real\'(total)) * 100.0;',
        'Write function void report(): 3 $display lines as shown in Theory',
        'Close with endclass',
        'Using Verilator: open ⚙ Options and set Timing Mode to --timing before running',
        'Hit Run — see two coverage snapshots; final line shows PASS if above 80%.',
      ],

      hint:
`class spi_coverage_model;
  bit cov_zero     = 0;
  bit cov_all_ones = 0;
  bit cov_alt_hi   = 0;
  bit cov_alt_lo   = 0;
  bit cov_msb_only = 0;
  bit cov_lsb_only = 0;
  bit cov_hi[16];
  bit cov_lo[16];

  function void sample(logic [7:0] data);
    if (data === 8'h00) cov_zero     = 1;
    if (data === 8'hFF) cov_all_ones = 1;
    if (data === 8'hAA) cov_alt_hi   = 1;
    if (data === 8'h55) cov_alt_lo   = 1;
    if (data === 8'h80) cov_msb_only = 1;
    if (data === 8'h01) cov_lsb_only = 1;
    cov_hi[ data[7:4] ] = 1;
    cov_lo[ data[3:0] ] = 1;
  endfunction

  function real get_coverage();
    int hit   = 0;
    int total = 38;
    if (cov_zero)     hit++;
    if (cov_all_ones) hit++;
    if (cov_alt_hi)   hit++;
    if (cov_alt_lo)   hit++;
    if (cov_msb_only) hit++;
    if (cov_lsb_only) hit++;
    foreach (cov_hi[i]) if (cov_hi[i]) hit++;
    foreach (cov_lo[i]) if (cov_lo[i]) hit++;
    return (real'(hit) / real'(total)) * 100.0;
  endfunction

  function void report();
    int hi_count = 0, lo_count = 0;
    foreach (cov_hi[i]) if (cov_hi[i]) hi_count++;
    foreach (cov_lo[i]) if (cov_lo[i]) lo_count++;
    $display("Coverage: %.1f%% (%0d/38 bins)", get_coverage(),
             (cov_zero+cov_all_ones+cov_alt_hi+cov_alt_lo+cov_msb_only+cov_lsb_only)
             + hi_count + lo_count);
    $display("  Corner bins: zero=%0b all_ones=%0b alt_hi=%0b alt_lo=%0b msb=%0b lsb=%0b",
             cov_zero, cov_all_ones, cov_alt_hi, cov_alt_lo, cov_msb_only, cov_lsb_only);
    $display("  Upper nibble: %0d/16 bins hit", hi_count);
    $display("  Lower nibble: %0d/16 bins hit", lo_count);
  endfunction

endclass`,

      design:
`// Build the spi_coverage_model class here.
//
// Member variables:
//   bit cov_zero, cov_all_ones, cov_alt_hi, cov_alt_lo, cov_msb_only, cov_lsb_only
//   bit cov_hi[16]  -- one flag per upper-nibble value 0x0..0xF
//   bit cov_lo[16]  -- one flag per lower-nibble value 0x0..0xF
//
// function void sample(logic [7:0] data)
//   Check data against each corner value. Update nibble arrays:
//     cov_hi[ data[7:4] ] = 1;
//     cov_lo[ data[3:0] ] = 1;
//
// function real get_coverage()
//   Count hit bins / 38 total, return as percentage.
//   Use real'(hit) / real'(total) * 100.0
//
// function void report()
//   Three $display lines: overall %, corner bits, nibble counts.
//
// Delete this and start typing:
`,

      testbench:
`\`timescale 1ns/1ps
module tb;
  spi_if      vif();
  logic [7:0] rx_byte;

  spi_slave dut (
    .sclk(vif.sclk), .cs_n(vif.cs_n),
    .mosi(vif.mosi), .miso(vif.miso),
    .rx_byte(rx_byte)
  );

  // Helper task: drive one byte, sample coverage
  task automatic drive_and_sample(
    input spi_driver drv,
    input spi_coverage_model cov,
    input logic [7:0] b
  );
    drv.drive_byte(b); #4;
    cov.sample(rx_byte);
  endtask

  initial begin
    spi_driver        drv;
    spi_coverage_model cov;

    vif.sclk = 0; vif.cs_n = 1; vif.mosi = 0;
    drv = new(vif);
    cov = new();

    // --- Phase 1: 6 corner-case bytes ---
    $display("=== Phase 1: corner cases ===");
    drive_and_sample(drv, cov, 8'h00);  // zero
    drive_and_sample(drv, cov, 8'hFF);  // all-ones
    drive_and_sample(drv, cov, 8'hAA);  // alt-hi
    drive_and_sample(drv, cov, 8'h55);  // alt-lo
    drive_and_sample(drv, cov, 8'h80);  // MSB only
    drive_and_sample(drv, cov, 8'h01);  // LSB only
    cov.report();

    // --- Phase 2: nibble sweep (one byte per upper-nibble row) ---
    $display("=== Phase 2: nibble sweep ===");
    drive_and_sample(drv, cov, 8'h12);
    drive_and_sample(drv, cov, 8'h34);
    drive_and_sample(drv, cov, 8'h56);
    drive_and_sample(drv, cov, 8'h78);
    drive_and_sample(drv, cov, 8'h9A);
    drive_and_sample(drv, cov, 8'hBC);
    cov.report();

    if (cov.get_coverage() >= 80.0)
      $display("PASS: coverage above 80%%");
    else
      $display("FAIL: coverage %.1f%% is below 80%%", cov.get_coverage());

    $finish;
  end
endmodule`,

      expected: [
        "Coverage:",
        "Corner bins:",
        "PASS: coverage above 80%"
      ]
    }
  ]
});
