# ─────────────────────────────────────────────────────────────────────────────
# AllAboutVLSI — BASE image (all simulation tools, prebuilt)
#
# Built and tested by GitHub Actions (.github/workflows/base-image.yml) and
# published to ghcr.io/dhatsme/aavlsi-base. The Railway Dockerfile starts
# FROM this image and only adds the app code, so Railway builds stay fast.
#
# Contains:
#   - Everything the lessons use (unchanged from the original Dockerfile):
#       iverilog, Ubuntu's Verilator 5.020, Antmicro UVM in /opt/uvm (+warm-up)
#   - VeeR EL2 Lab (static/veer.html): a separate Verilator 5.052 in
#     /opt/verilator-veer, VeeR EL2 in /opt/veer, Verilator-patched UVM, and
#     a prebuilt CPU model + DCCM UVM testbench.
#
# Unlike the Railway Dockerfile, every step here is STRICT: if anything
# fails, the build fails and nothing is published. `aavlsi-selftest` runs in
# CI before publishing.
#
# Build locally (slow, ~1 h on 2 cores):
#   docker build -f docker/base.Dockerfile -t aavlsi-base docker/
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Verilator 5.052 for the VeeR EL2 Lab ─────────────────────────────
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
    && rm -rf /src/verilator \
    && /opt/verilator-veer/bin/verilator --version

# ── Stage 2: base image ───────────────────────────────────────────────────────
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
# Links the published package to the repo on GitHub.
LABEL org.opencontainers.image.source="https://github.com/Dhatsme/all_about_vlsi_verillog_GUI" \
      org.opencontainers.image.description="All About VLSI simulation tools: Verilator, Icarus, UVM, VeeR EL2 Lab"

# ── system deps (same as the original Dockerfile, plus VeeR needs) ────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        iverilog \
        verilator \
        g++ \
        make \
        git \
        python3 \
        python3-pip \
        perl libjson-perl ccache zlib1g-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── UVM for the lessons (unchanged from the original Dockerfile) ──────────────
# Antmicro's Verilator-compatible UVM base-class library.
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

# Pre-warm the UVM package (same as the original Dockerfile).
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

# ── VeeR EL2 Lab ──────────────────────────────────────────────────────────────
# Pinned versions (verified together on 2026-10-22).
ARG VEER_COMMIT=45c9b425f4c666c095a17e21fce4d3b0721cbfa0
ARG VEER_UVM_COMMIT=2e667ac506c12e91d81bde62fe2c08d992731bd4

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
       make -f /opt/veer/tools/Makefile verilator > build.log 2>&1 \
    ; tail -15 build.log && grep -q TEST_PASSED build.log

# UVM testbench (~25 min on 2 cores). Two rules:
#  1. Run from /opt/veer with make -C: VeeR's config script writes its
#     snapshot relative to the launch folder.
#  2. Use exactly the make command veer_lab.py uses (no UVM_ROOT override).
#     Verilator writes source paths into its C++, so any difference forces a
#     full rebuild on the first learner run.
RUN mkdir -p /opt/veer-runs && cd /opt/veer \
    && PATH=/opt/verilator-veer/bin:$PATH RV_ROOT=/opt/veer \
       make -C testbench/uvm/mem simulate -j"$(nproc)" UVM_TEST=mem_wr_rd_test \
       > /opt/veer-runs/uvm_first_run.log 2>&1 \
    ; grep -E "TEST PASSED|UVM_ERROR :|UVM_FATAL :|%Error" /opt/veer-runs/uvm_first_run.log | head -20 \
    ; grep -q "UVM_ERROR :    0" /opt/veer-runs/uvm_first_run.log

# Lets learner runs (non-root users on some hosts) write build outputs.
RUN chmod -R a+rwX /opt/veer /opt/veer-runs && mkdir -p /opt/ccache && chmod a+rwX /opt/ccache

COPY aavlsi-selftest /usr/local/bin/aavlsi-selftest
RUN chmod +x /usr/local/bin/aavlsi-selftest
