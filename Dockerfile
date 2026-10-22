# ─────────────────────────────────────────────────────────────────────────────
# AllAboutVLSI — production image
#
# Ubuntu 24.04 ships Verilator 5.x (required for --timing / UVM).
# To build & run locally:
#   docker build -t aavlsi .
#   docker run -p 8080:8080 aavlsi
#
# Two Verilators live in this image:
#   /usr/bin/verilator            5.020 (Ubuntu package) — used by /simulate
#                                 and every lesson. Unchanged.
#   /opt/verilator-veer/bin/...   5.052 (built below)    — used only by the
#                                 VeeR EL2 Lab (static/veer.html, veer_lab.py).
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Verilator 5.052 for the VeeR EL2 Lab ─────────────────────────────
# Built from source once; Docker caches this stage until the version changes.
# Verified 2026-10-22: VeeR EL2 + its DCCM UVM testbench pass with this version
# and Antmicro's uvm-verilator "current-patches" branch.
FROM ubuntu:24.04 AS verilator-veer
ARG VEER_VERILATOR_VERSION=v5.052
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        git ca-certificates make autoconf g++ flex bison libfl-dev libfl2 \
        help2man perl python3 zlib1g-dev ccache \
    && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/verilator/verilator /src/verilator \
    && cd /src/verilator \
    && git checkout ${VEER_VERILATOR_VERSION} \
    && autoconf \
    && ./configure --prefix=/opt/verilator-veer \
    && make -j"$(nproc)" \
    && make install \
    && rm -rf /src/verilator

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

# ── system deps ───────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        iverilog \
        verilator \
        g++ \
        make \
        git \
        python3 \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

# ── UVM for Verilator ─────────────────────────────────────────────────────────
# Antmicro's Verilator-compatible UVM base-class library.
# Strips the DPI / feature-macros that Verilator can't handle, keeping the
# standard UVM component hierarchy, factory, config_db, sequences, TLM, etc.
RUN git clone --depth=1 \
        https://github.com/antmicro/uvm-verilator.git \
        /opt/uvm

ENV UVM_HOME=/opt/uvm

# uvm_sequencer.svh has a parameterized-type bug with Verilator 5.020 that
# cannot be suppressed with a flag — it is a hard %Error. The hello-world
# and basic UVM lessons only need uvm_test / phases / reporting; they don't
# use sequencers. Commenting out the sequencer include in uvm_pkg.sv lets
# the package compile cleanly without removing anything the lessons use.
RUN sed -i 's|`include "uvm_seq.svh"|// `include "uvm_seq.svh"  // disabled: sequencer has Verilator 5.020 type compat issue|' \
        /opt/uvm/src/uvm_pkg.sv

# Pre-warm the UVM package: compile it to C++ once during the image build so
# that the expensive elaboration step does NOT have to run on every user request.
# We compile a minimal "uvm_only" stub whose sole job is to import the UVM pkg;
# this forces Verilator to generate and compile all the UVM C++ files.
# The resulting obj_dir is cached in the image at /opt/uvm-cache.
RUN mkdir -p /opt/uvm-warmup && \
    printf '`timescale 1ns/1ps\nmodule uvm_top_stub; import uvm_pkg::*; endmodule\n' \
        > /opt/uvm-warmup/uvm_stub.sv && \
    verilator --cc --sv --timing --build-jobs 0 \
        --Wno-fatal --Wno-TIMESCALEMOD --Wno-STMTDLY \
        --Wno-WIDTHTRUNC --Wno-WIDTHEXPAND --Wno-REALCVT \
        --Wno-CONSTRAINTIGN --Wno-MULTIDRIVEN --Wno-MODDUP \
        --Wno-UNPACKED --Wno-BLKANDNBLK --Wno-CASEINCOMPLETE \
        --Wno-UNOPTFLAT --Wno-MISINDENT --Wno-CASTCONST \
        +incdir+/opt/uvm/src \
        /opt/uvm/src/uvm_pkg.sv \
        /opt/uvm-warmup/uvm_stub.sv \
        -Mdir /opt/uvm-warmup/obj_dir 2>&1 | tail -5 || true

# ── VeeR EL2 Lab (static/veer.html) ───────────────────────────────────────────
# Real RISC-V core (CHIPS Alliance VeeR EL2) + its DCCM UVM testbench, run with
# the separate Verilator 5.052 from stage 1. Everything is prebuilt here so a
# learner's run only recompiles what they changed.
#
# Pinned versions (verified together on 2026-10-22):
ARG VEER_COMMIT=45c9b425f4c666c095a17e21fce4d3b0721cbfa0
ARG VEER_UVM_COMMIT=2e667ac506c12e91d81bde62fe2c08d992731bd4

# Extra runtime needs: perl JSON (VeeR's config script), ccache, zlib headers.
RUN apt-get update && apt-get install -y --no-install-recommends \
        perl libjson-perl ccache zlib1g-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=verilator-veer /opt/verilator-veer /opt/verilator-veer
ENV VEER_ROOT=/opt/veer \
    VEER_VERILATOR_BIN=/opt/verilator-veer/bin \
    VEER_CPU_EXE=/opt/veer-runs/hello/obj_dir/Vtb_top \
    CCACHE_DIR=/opt/ccache

RUN git clone https://github.com/chipsalliance/Cores-VeeR-EL2 /opt/veer \
    && cd /opt/veer && git checkout ${VEER_COMMIT} \
    && git clone -b current-patches https://github.com/antmicro/uvm-verilator \
         /opt/veer/testbench/uvm/mem/uvm \
    && cd /opt/veer/testbench/uvm/mem/uvm && git checkout ${VEER_UVM_COMMIT} \
    && cp -r /opt/veer/testbench/uvm/mem/hdl /opt/veer/testbench/uvm/mem/hdl.pristine

# CPU model (~1 min). Uses the bundled .hex programs, no RISC-V gcc needed.
RUN mkdir -p /opt/veer-runs/hello && cd /opt/veer-runs/hello \
    && PATH=/opt/verilator-veer/bin:$PATH RV_ROOT=/opt/veer \
       make -f /opt/veer/tools/Makefile verilator | tee build.log \
    && grep -q TEST_PASSED build.log

# UVM testbench (slow: ~25 min on 2 cores, faster with more).
# Two rules, both learned the hard way:
#  1. Run from /opt/veer with make -C: VeeR's config script writes its
#     snapshot relative to the launch folder.
#  2. Use exactly the make command veer_lab.py uses (no UVM_ROOT override).
#     Verilator writes source paths into its C++, so any difference forces a
#     full ~25 min rebuild on the first learner run.
RUN cd /opt/veer \
    && PATH=/opt/verilator-veer/bin:$PATH RV_ROOT=/opt/veer \
       make -C testbench/uvm/mem simulate -j"$(nproc)" UVM_TEST=mem_wr_rd_test \
       | tee /opt/veer-runs/uvm_first_run.log \
    && grep -q "UVM_ERROR :    0" /opt/veer-runs/uvm_first_run.log

# ── Python deps ───────────────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
# Ubuntu 24.04 uses PEP-668 externally-managed Python; --break-system-packages
# is required when installing into the system site-packages from pip.
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# ── app ───────────────────────────────────────────────────────────────────────
COPY . .

# Ensure the static directory exists and has correct permissions so FastAPI
# can serve the frontend. This guards against accidental omission or a
# .dockerignore rule stripping the directory at build time.
RUN mkdir -p /app/static && chmod -R 755 /app/static

# Railway injects $PORT at runtime; default to 8080 locally
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
