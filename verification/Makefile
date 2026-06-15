# SPI Verification Environment — Makefile
# Supports Questa (ModelSim), VCS, and Xcelium.
#
# Usage:
#   make questa   TEST=test_sanity
#   make questa   TEST=test_walk
#   make questa   TEST=test_burst_8
#   make questa   TEST=test_abort
#   make questa   TEST=test_rand_20
#   make questa   TEST=all
#
#   make vcs      TEST=test_sanity
#   make xrun     TEST=test_sanity
#   make regress             (runs all 5 tests via VCS)

TEST  ?= test_sanity
SEED  ?= 1

SRCS  = rtl/spi_master.sv  \
        tb/spi_if.sv        \
        tb/spi_pkg.sv       \
        tb/tb_top.sv

# ── Questa / ModelSim ─────────────────────────────────────────────────
questa:
	vlib work
	vmap work work
	vlog -sv -work work $(SRCS)
	vsim -batch -do "run -all; quit" -sv_seed $(SEED) \
	     work.tb_top +TEST=$(TEST)

questa-gui:
	vlib work
	vmap work work
	vlog -sv -work work $(SRCS)
	vsim -sv_seed $(SEED) work.tb_top +TEST=$(TEST)

# ── VCS (Synopsys) ───────────────────────────────────────────────────
vcs:
	vcs -sverilog -full64 -timescale=1ns/1ps \
	    $(SRCS) -o simv -debug_all
	./simv +TEST=$(TEST) +ntb_random_seed=$(SEED)

# ── Xcelium (Cadence) ──────────────────────────────────────────────
xrun:
	xrun -sv -timescale 1ns/1ps $(SRCS) +TEST=$(TEST) \
	     -svseed $(SEED)

# ── Regression: all 5 tests, fail on first failure ─────────────────
regress:
	$(MAKE) vcs TEST=test_sanity  SEED=1
	$(MAKE) vcs TEST=test_walk    SEED=1
	$(MAKE) vcs TEST=test_burst_8 SEED=1
	$(MAKE) vcs TEST=test_abort   SEED=1
	$(MAKE) vcs TEST=test_rand_20 SEED=42
	@echo "Regression complete."

clean:
	rm -rf work simv *.log *.key csrc DVEfiles ucli.key
	\.phony: questa questa-gui vcs xrun regress clean
