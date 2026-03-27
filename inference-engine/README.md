# SightX Inference Engine (V2)

The SightX Inference Engine is a clinical diagnostic service. It uses a custom ResNet-50 V2 architecture to grade Diabetic Retinopathy (DR) severity from retinal fundus photographs.

## 🚀 Advanced Inference Strategy
- **Monte-Carlo TTA Ensemble**: Each prediction runs through a 108-iteration Test-Time Augmentation loop to ensure robustness and capture epistemic uncertainty.
- **Bayesian Prior Correction**: The engine corrects for training-set imbalance (EyePACS) using Bayesian normalization against real-world clinical prevalence.
- **Risk-Minimized Decisions**: Decisions are made using Bayesian decision theory, prioritizing clinical safety by penalizing false negatives according to a medical cost matrix.

## 🛠 Tech Stack
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Runtime**: [PyTorch](https://pytorch.org/) (CUDA/MPS Accelerated)
- **Image Processing**: [Torchvision](https://pytorch.org/vision/) + [Pillow](https://python-pillow.org/)
- **Math & Ops**: [NumPy](https://numpy.org/)

## 📖 Developer Guidelines

### Standard Operating Procedures (SOPs)
- **Model Warm-up**: The model is loaded into memory on startup. Ensure the `checkpoints/best_model.pt` is present in the container.
- **Resolution Standard**: All inference pipelines must maintain a `384x384` resolution to stay consistent with V2 training weights.
- **Accelerator Selection**: The engine automatically detects and utilizes GPU (NVIDIA) or MPS (Apple Silicon) if available.

### Do's ✅
- **Use TTA for Diagnostics**: Always maintain the TTA ensemble loop for official clinical results.
- **Calibrate Probabilities**: Ensure `OPTIMAL_TEMPERATURE` is periodically re-calibrated using `calibrate_temperature.py`.
- **Sanitize Responses**: Return clear clinical tiers (`Doctor Visit Mandatory`, etc.) alongside raw model grades.

### Don'ts ❌
- **Modify Pre-processing**: Do not alter `preprocessing.py` normalization tokens (`IMAGENET_MEAN/STD`) as they are baked into the pre-trained backbone.
- **Bypass Post-processor**: Never return raw softmax outputs directly; they must pass through the `clinical_postprocessor.py` for risk minimization.

## 🚀 Execution

1. **Local Server**:
   ```bash
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Docker Deployment**:
   ```bash
   docker-compose build inference-engine
   ```

---
© 2026 SightX • Clinical AI Documentation
