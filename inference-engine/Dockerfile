# ── Build Stage: Base Application Environment ──
FROM python:3.10-slim-bookworm

# Application environment configuration
WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Install system utilities required for high-performance image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# ── Dependency Installation ──
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Source Orchestration ──
COPY . .

# Exposure: FastAPI standard interface
EXPOSE 8000

# Entrypoint: Launch high-performance Uvicorn worker
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]