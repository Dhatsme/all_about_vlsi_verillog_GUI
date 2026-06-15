#!/usr/bin/env bash
# One-shot build + run for the SPI OOP testbench.
# Requirements: Verilator 5.026+ on PATH
#
# Usage:
#   ./run.sh              — random seed
#   ./run.sh 42           — fixed seed 42
set -euo pipefail

SEED=${1:-0}
OUTDIR=obj_dir

echo "=== Compiling ==="
verilator --binary --timing -sv \
  --top-module tb \
  -Mdir "${OUTDIR}" \
  -o Vtb \
  rtl/spi_master.sv \
  tb/spi_tb.sv

echo ""
echo "=== Running (seed=${SEED}) ==="
"${OUTDIR}/Vtb" +verilator+seed+${SEED}
