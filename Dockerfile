# ─────────────────────────────────────────────────────────────────────────────
# AllAboutVLSI — production image
#
# Ubuntu 24.04 ships Verilator 5.x (required for --timing / UVM).
# To build & run locally:
#   docker build -t aavlsi .
#   docker run -p 8080:8080 aavlsi
# ─────────────────────────────────────────────────────────────────────────────
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

# Patch uvm_sequencer.svh for Verilator 5.020 strict parameterized-type checking.
# Verilator 5.020 rejects passing 'this' (resolved as the specialized type
# uvm_sequencer#(REQ,RSP)) where the port constructor expects uvm_component.
# An explicit cast is the correct fix; this is a Verilator bug, not a UVM bug.
RUN sed -i "s/seq_item_export = new (\"seq_item_export\", this)/seq_item_export = new (\"seq_item_export\", uvm_component'(this))/" \
        /opt/uvm/src/seq/uvm_sequencer.svh

ENV UVM_HOME=/opt/uvm

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
