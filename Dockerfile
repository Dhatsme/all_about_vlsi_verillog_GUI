# ─────────────────────────────────────────────────────────────────────────────
# AllAboutVLSI — production image (built by Railway)
#
# All simulation tools come prebuilt in the BASE image, which GitHub Actions
# builds, self-tests and publishes (see docker/base.Dockerfile and
# .github/workflows/base-image.yml). This file only adds the app, so Railway
# builds take about a minute.
#
# To change tools (Verilator, UVM, VeeR, ...): edit docker/base.Dockerfile,
# push to develop, wait for the "Base image → GHCR" workflow to publish a new
# tag, then update BASE_IMAGE below to that tag.
#
# To build & run locally:
#   docker build -t aavlsi .
#   docker run -p 8080:8080 aavlsi
# ─────────────────────────────────────────────────────────────────────────────
ARG BASE_IMAGE=ghcr.io/dhatsme/aavlsi-base:20261022-72c3969
FROM ${BASE_IMAGE}

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
