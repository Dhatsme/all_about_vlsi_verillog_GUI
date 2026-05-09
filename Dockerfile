# ─────────────────────────────────────────────────────────────────────────────
# AllAboutVLSI — production image
#
# We build Verilator 5.006 from source instead of using the Ubuntu 24.04 apt
# package (5.020), which has a parameterized-class type-checking regression
# that breaks uvm-verilator compilation with hard %Error (not suppressible).
# 5.006 predates that regression and compiles the full UVM package cleanly.
#
# To build & run locally:
#   docker build -t aavlsi .
#   docker run -p 8080:8080 aavlsi
# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

# ── system deps + Verilator build deps ────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        iverilog \
        g++ \
        make \
        git \
        python3 \
        python3-pip \
        autoconf \
        flex \
        bison \
        libfl2 \
        libfl-dev \
        perl \
    && rm -rf /var/lib/apt/lists/*

# ── Verilator 5.006 from source ───────────────────────────────────────────────
# Ubuntu 24.04 ships 5.020 which has type-checking regressions with uvm-verilator.
# We build 5.006 in-place and skip `make install` (which fails due to doc tooling);
# instead we set VERILATOR_ROOT so the wrapper script finds the include directory.
RUN git clone --depth=1 --branch v5.006 \
        https://github.com/verilator/verilator.git /opt/verilator && \
    cd /opt/verilator && \
    autoconf && \
    ./configure --disable-doc && \
    make -j4

ENV VERILATOR_ROOT=/opt/verilator
ENV PATH="/opt/verilator/bin:${PATH}"

# ── UVM for Verilator ─────────────────────────────────────────────────────────
RUN git clone --depth=1 \
        https://github.com/antmicro/uvm-verilator.git \
        /opt/uvm

ENV UVM_HOME=/opt/uvm

# Pre-warm the UVM package: compile it to C++ once during image build.
RUN mkdir -p /opt/uvm-warmup && \
    printf '`timescale 1ns/1ps\nmodule uvm_top_stub; import uvm_pkg::*; endmodule\n' \
        > /opt/uvm-warmup/uvm_stub.sv && \
    verilator --cc --sv --timing --build-jobs 0 \
        --Wno-fatal --Wno-TIMESCALEMOD --Wno-STMTDLY \
        --Wno-WIDTHTRUNC --Wno-WIDTHEXPAND --Wno-REALCVT \
        --Wno-CONSTRAINTIGN --Wno-MULTIDRIVEN --Wno-MODDUP \
        --Wno-UNPACKED --Wno-BLKANDNBLK --Wno-CASEINCOMPLETE \
        --Wno-UNOPTFLAT \
        +incdir+/opt/uvm/src \
        /opt/uvm/src/uvm_pkg.sv \
        /opt/uvm-warmup/uvm_stub.sv \
        -Mdir /opt/uvm-warmup/obj_dir 2>&1 | tail -10 || true

# ── Python deps ───────────────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# ── app ───────────────────────────────────────────────────────────────────────
COPY . .
RUN mkdir -p /app/static && chmod -R 755 /app/static

# Railway injects $PORT at runtime; default to 8080 locally
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
