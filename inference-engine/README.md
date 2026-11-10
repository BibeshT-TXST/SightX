# SightX Inference Engine (V2)

The SightX Inference Engine is a clinical diagnostic service. It uses a custom ResNet-50 V2 architecture to grade Diabetic Retinopathy (DR) severity from retinal fundus photographs. In the AWS deployment it runs as an **SQS worker on EC2**; the FastAPI server remains for local use.

## 🚀 Advanced Inference Strategy
- **Monte-Carlo TTA Ensemble**: Each prediction runs through a 108-iteration Test-Time Augmentation loop to ensure robustness and capture epistemic uncertainty. Passes run in batches, and the reported probabilities are averaged over every pass.
- **Bayesian Prior Correction**: The engine corrects for training-set imbalance (EyePACS) using Bayesian normalization against real-world clinical prevalence.
- **Risk-Minimized Decisions**: Decisions are made using Bayesian decision theory, prioritizing clinical safety by penalizing false negatives according to a medical cost matrix.
- **AI Suggestion**: After grading, the worker asks Amazon Bedrock (Nova Micro) for a short suggestion based on the patient's earlier results. Only dates, tiers and clinician decisions are sent; never names or patient IDs.

## 🛠 Tech Stack
- **Runtime**: [PyTorch](https://pytorch.org/) (CPU in the cloud; CUDA/MPS used automatically when available)
- **Image Processing**: [Torchvision](https://pytorch.org/vision/) + [Pillow](https://python-pillow.org/)
- **Math & Ops**: [NumPy](https://numpy.org/), [SciPy](https://scipy.org/)
- **Worker**: [boto3](https://boto3.amazonaws.com/) (SQS, S3, Bedrock, RDS IAM tokens) + [psycopg 3](https://www.psycopg.org/)
- **Local API**: [FastAPI](https://fastapi.tiangolo.com/)

## 🗂 Layout

| File | Purpose |
| :--- | :--- |
| `predictor.py` | Loads the model once; `predict(image_bytes) -> dict` runs TTA and post-processing |
| `worker.py` | Long-polls SQS, grades scans from S3, writes results to Postgres, adds the Bedrock suggestion |
| `main.py` | Local FastAPI server: `POST /predict` |
| `model.py`, `preprocessing.py`, `clinical_postprocessor.py`, `temperature_calibration.py` | Model, transforms, clinical decision logic |
| `train.py`, `evaluate.py`, `calibrate_temperature.py`, `test_postprocessor.py` | Training and evaluation (need the dataset) |
| `tests/` | Worker tests (stubbed AWS and DB) and a predictor smoke test (real model, CPU) |

### Requirements files
- `requirements.txt` — serving (`predictor.py`, `main.py`)
- `requirements-worker.txt` — serving + `boto3` + `psycopg` (the EC2 worker and the Docker image)
- `requirements-train.txt` — serving + pandas, scikit-learn, OpenCV (training and evaluation)

## ⚙️ Worker Configuration

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `INFERENCE_QUEUE_URL` | (required) | SQS queue to poll |
| `DB_HOST` | (required) | Postgres host |
| `DB_PORT`, `DB_NAME`, `DB_USER` | `5432`, `sightx`, `sightx_worker` | |
| `DB_PASSWORD` | unset | Local only; on AWS an RDS IAM token is used |
| `DB_SSLMODE` | `require` | |
| `AWS_REGION` | `us-east-2` | |
| `MAX_RECEIVE_COUNT` | `3` | Must match the queue's dead-letter setting |
| `TTA_PASSES` / `TTA_BATCH_SIZE` | `108` / `8` | Passes per scan / per forward pass (the EC2 worker uses batch 4) |
| `BEDROCK_MODEL_ID` | `us.amazon.nova-micro-v1:0` | Empty disables suggestions |
| `MODEL_WEIGHTS_PATH` | `checkpoints/best_model.pt` | |
| `MODEL_WEIGHTS_S3_URI` | unset | Optional `s3://bucket/key` to download weights at start |

How the worker handles failures: an unreadable or oversized image fails the job at once; any other error requeues it, and the last allowed delivery marks it `failed` and leaves the message for the dead-letter queue. Duplicate messages are ignored, and a Bedrock failure leaves the job graded. On AWS it runs as the `sightx-worker` systemd service; see [infrastructure/README.md](../infrastructure/README.md).

## 📖 Developer Guidelines

### Standard Operating Procedures (SOPs)
- **Model Warm-up**: The model is loaded into memory on startup from `checkpoints/best_model.pt` (tracked in git on purpose). Serving builds the network without ImageNet weights (`pretrained=False`) since the checkpoint replaces them.
- **Resolution Standard**: All inference pipelines must maintain a `384x384` resolution to stay consistent with V2 training weights.
- **Accelerator Selection**: The engine automatically detects and utilizes GPU (NVIDIA) or MPS (Apple Silicon) if available.

### Do's ✅
- **Use TTA for Diagnostics**: Always maintain the TTA ensemble loop for official clinical results.
- **Calibrate Probabilities**: Ensure `OPTIMAL_TEMPERATURE` is periodically re-calibrated using `calibrate_temperature.py`.
- **Sanitize Responses**: Return clear clinical tiers (`Doctor Visit Mandatory`, etc.) alongside raw model grades.

### Don'ts ❌
- **Modify Pre-processing**: Do not alter `preprocessing.py` normalization tokens (`IMAGENET_MEAN/STD`) as they are baked into the pre-trained backbone.
- **Bypass Post-processor**: Never return raw softmax outputs directly; they must pass through the `clinical_postprocessor.py` for risk minimization.
- **Send Identifiers to Bedrock**: Prompts may only contain dates, tiers and decisions.

## 🚀 Execution

1. **Local Server**:
   ```bash
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```
   For training or evaluation scripts (`train.py`, `evaluate.py`, etc.), install `requirements-train.txt` instead; it includes the runtime set.

2. **Tests** (CPU-only torch keeps the install small):
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements-worker.txt
   python -m unittest tests.test_worker       # run separately: it stubs predictor
   python -m unittest tests.test_predictor
   ```

3. **Docker Image** (FastAPI by default, or the worker with `python worker.py`):
   ```bash
   docker build -t sightx-inference .
   ```

---
© 2026 SightX • Clinical AI Documentation
