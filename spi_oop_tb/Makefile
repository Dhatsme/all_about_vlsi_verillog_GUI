# SPI OOP Verification — Verilator 5.026+
# Usage:
#   make          — compile and run
#   make compile  — compile only
#   make clean    — remove build artefacts
#   make SEED=42  — use a fixed random seed

VERILATOR  ?= verilator
TOP        := tb
OUTDIR     := obj_dir
SEED       ?= 0

RTL_SRC    := rtl/spi_master.sv
TB_SRC     := tb/spi_tb.sv

# --binary     : compile to a simulation executable (Verilator 5.008+)
# --timing     : enable fork/join + blocking mailbox.get()
# -sv          : parse as SystemVerilog
VFLAGS     := --binary --timing -sv \
               --top-module $(TOP) \
               -Mdir $(OUTDIR) \
               -o Vtb

SIM_BIN    := $(OUTDIR)/Vtb

.PHONY: all compile run clean

all: run

compile: $(SIM_BIN)

$(SIM_BIN): $(RTL_SRC) $(TB_SRC)
	$(VERILATOR) $(VFLAGS) $(RTL_SRC) $(TB_SRC)

run: $(SIM_BIN)
	@echo "--- Running simulation (seed=$(SEED)) ---"
	$(SIM_BIN) +verilator+seed+$(SEED)

clean:
	rm -rf $(OUTDIR)
