# SPI Deep-Dive — Port Registry

> **Authoritative port manifest.** Updated every session as the final step before the
> cursor-advance commit. Read this before writing any integration testbench.
> Rows must match the hint field of the final lesson in each module's JS file.
>
> Fallback: if a module's row is missing (session failed to update), open
> `static/lessons/modules/<moduleId>.js` and read the final lesson's `hint` field.

---

## Port Table

| Chapter | SV Module Name | Inputs | Outputs |
|---------|---------------|--------|---------|
| spi1 | *(educational — no integration contract)* | — | — |
| spi2 | `spi_clk_div` | `pclk`, `rst_n`, `enable`, `cpol`, `div[15:0]` | `sck_out`, `rising_edge_p`, `falling_edge_p` |

---

## Integration Wiring Notes

These notes record how producer port names map to consumer port names at each
integration checkpoint. Use them verbatim when writing integration testbenches.

### Checkpoint A — spi5 L4 (spi_clk_div + spi_shift, Mode 0 hardcoded)

```systemverilog
// Mode 0: CPOL=0, CPHA=0
// spi_clk_div outputs raw edge pulses by physical direction.
// spi_shift inputs are named by semantic role (launch/sample).
// For Mode 0: launch on falling SCK, sample on rising SCK.
// spi6 (CPOL/CPHA engine) is NOT instantiated in Checkpoint A — wire manually:

logic raw_rise, raw_fall;

spi_clk_div u_clk (
  .rising_edge_p(raw_rise),
  .falling_edge_p(raw_fall),
  // ... other ports
);

spi_shift u_sft (
  .launch_pulse(raw_fall),   // Mode 0: launch on falling SCK (SCK 1->0)
  .sample_pulse(raw_rise),   // Mode 0: sample on rising SCK  (SCK 0->1)
  // ... other ports
);
```

*(Checkpoint B and C wiring notes will be added when spi7 and spi12 are built.)*
