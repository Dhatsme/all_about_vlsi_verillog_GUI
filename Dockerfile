FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

# system deps: iverilog, verilator, C++ toolchain
RUN apt-get update && apt-get install -y \
    iverilog verilator g++ make \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install Python deps from requirements.txt
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# copy the rest of the app
COPY . .

# Ensure the static directory exists and has correct permissions so FastAPI
# can serve the frontend. This guards against accidental omission or a
# .dockerignore rule stripping the directory at build time.
RUN mkdir -p /app/static && chmod -R 755 /app/static

# Railway injects $PORT at runtime; default to 8080 locally
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
