# ─────────────────────────────────────────────────────────────────────────────
# AllAboutVLSI — production image
#
# Ubuntu 24.04 ships Verilator 5.x (required for --timing / UVM).
# To build & run locally:
#   docker build -t aavlsi .
#   docker run -p 8080:8080 aavlsi
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: clone UVM (needs git, which we don’t want in the runtime image)
# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:24.04 AS uvm-fetch
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 \
        https://github.com/antmicro/uvm-verilator.git \
        /opt/uvm

# Disable the uvm_sequencer include (Verilator 5.020 type-compat issue).
# Lessons only need uvm_test / phases / reporting, not sequencers.
RUN sed -i 's|`include "uvm_seq.svh"|// `include "uvm_seq.svh"  // disabled: sequencer has Verilator 5.020 type compat issue|' \
        /opt/uvm/src/uvm_pkg.sv


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: runtime image (no git, no warmup cache)
# ─────────────────────────────────────────────────────────────────────────────
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

# ── system deps ──────────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        iverilog \
        verilator \
        g++ \
        make \
        python3 \
        python3-pip \
    && rm -rf /var/lib/apt/lists/*

# ── UVM source (copied from fetch stage — no git needed at runtime) ─────────
COPY --from=uvm-fetch /opt/uvm /opt/uvm
ENV UVM_HOME=/opt/uvm

# ── Python deps ──────────────────────────────────────────────────────────────────
WORKDIR /app
COPY requirements.txt .
# Ubuntu 24.04 uses PEP-668 externally-managed Python; --break-system-packages
# is required when installing into the system site-packages from pip.
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# ── app ─────────────────────────────────────────────────────────────────────────────
COPY . .
RUN mkdir -p /app/static && chmod -R 755 /app/static

# Railway / Docker injects $PORT at runtime; default to 8080 locally
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
