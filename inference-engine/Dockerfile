# ── Build Stage: Base Application Environment ──
FROM python:3.10-slim-bookworm

# Application environment configuration
WORKDIR /app
ENV PYTHONUNBUFFERED=1

# ── Dependency Installation ──
# CPU-only torch/torchvision first: the default PyPI wheels bundle CUDA
# libraries (several GB) that a CPU host never uses. The CPU index has
# both x86_64 and arm64 (Graviton) builds.
RUN pip install --no-cache-dir torch torchvision \
    --index-url https://download.pytorch.org/whl/cpu

# The remaining runtime and worker dependencies; torch/torchvision are
# already satisfied
COPY requirements.txt requirements-worker.txt ./
RUN pip install --no-cache-dir -r requirements-worker.txt

# ── Source Orchestration ──
COPY . .

# Exposure: FastAPI standard interface
EXPOSE 8000

# Default: the FastAPI server. The EC2 worker runs the same image with
# `python worker.py` as the command.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
