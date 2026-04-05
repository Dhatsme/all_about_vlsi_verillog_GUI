FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    iverilog verilator g++ make \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install fastapi uvicorn python-multipart
WORKDIR /app
COPY . .
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
