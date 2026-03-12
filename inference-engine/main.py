# ──────────────────────────────────────────────────────────────────────────────
# SightX Inference Engine — FastAPI Server
# ──────────────────────────────────────────────────────────────────────────────
# This module exposes a REST API for real-time Diabetic Retinopathy (DR)
# grading.  A client uploads a retinal fundus photograph and receives back
# the predicted severity grade (0–4) together with a confidence score.
#
# Architecture overview:
#   1. On startup the trained DRClassifier (ResNet-50 V2) and its best
#      checkpoint are loaded into memory *once* so that every request
#      benefits from a warm model.
#   2. The single POST endpoint `/predict` accepts a JPEG/PNG upload,
#      runs it through the V2 inference preprocessing pipeline, feeds
#      it to the model, and returns a JSON response.
#
# Dependencies:
#   - FastAPI + Uvicorn   (web server)
#   - PyTorch             (inference runtime)
#   - Pillow              (image I/O)
#   - model.py            (DRClassifier architecture)
#   - preprocessing.py    (preprocess_image helper)
# ──────────────────────────────────────────────────────────────────────────────

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import torch
import io
import time
from PIL import Image

# Local project modules
from model import DRClassifier
from preprocessing import preprocess_image


# ── FastAPI Application Instance ─────────────────────────────────────────────
app = FastAPI(title='SightX Inference Engine', version='1.0')


# ── Startup: Load Model Once Into Memory ─────────────────────────────────────
# Selecting the best available hardware accelerator:
#   • Apple Silicon → 'mps'  (Metal Performance Shaders)
#   • Otherwise     → 'gpu'  (CUDA) if available, else 'cpu'
# Note: CUDA is not listed here because the target deployment environment
# is an Apple-silicon Mac.  Add a CUDA check if deploying to a GPU server.
DEVICE = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

# Instantiate the same architecture used during training (5 DR grades).
model = DRClassifier(num_classes=5)

# Load the saved weights from the best training checkpoint.
# `map_location` ensures weights are mapped to the current device even if
# the checkpoint was saved on a different one (e.g., trained on MPS but
# deployed on CPU).
model.load_state_dict(torch.load('checkpoints/best_model.pt',map_location=DEVICE))

# Switch to evaluation mode:
#   • Disables dropout (all neurons active → deterministic output)
#   • Fixes BatchNorm running statistics (uses training-set mean/var)
# This is *required* for reproducible, stable predictions.
model.eval()

# Move model parameters to the target device for inference.
model.to(DEVICE)


# ── Human-Readable Grade Labels ─────────────────────────────────────────────
# Maps the model's integer output (argmax of logits) to clinically meaningful
# descriptions following the International Clinical DR Severity Scale.
#   Grade 0 — No DR:              no visible retinal abnormalities
#   Grade 1 — Mild NPDR:          microaneurysms only
#   Grade 2 — Moderate NPDR:      more than just microaneurysms
#   Grade 3 — Severe NPDR:        extensive intraretinal abnormalities
#   Grade 4 — Proliferative DR:   neovascularization or vitreous hemorrhage
GRADE_LABELS = {
    0: 'Grade 0: No Diabetic Retinopathy',
    1: 'Grade 1: Mild',
    2: 'Grade 2: Moderate',
    3: 'Grade 3: Severe',
    4: 'Grade 4: Proliferative DR',
}


# ── Prediction Endpoint ─────────────────────────────────────────────────────
@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    """
    Receive a retinal fundus image and return the predicted DR grade with
    a confidence score.

    **Request**
    - Method : POST
    - Content-Type : multipart/form-data
    - Body : a single image file (JPEG or PNG)

    **Response** (JSON)
    ```json
    {
        "grade": "Grade 2: Moderate",
        "confidence": 0.87,
        "inference_time_ms": 142.5
    }
    ```

    **Errors**
    - 400 : Unsupported file type (only JPEG/PNG accepted)
    - 500 : Internal processing error
    """

    # ── 1. Validate the uploaded file type ───────────────────────────────
    # Only JPEG and PNG are accepted because they are the standard formats
    # for fundus cameras.  Rejecting other types early avoids wasting
    # compute on files that would fail downstream.
    if file.content_type not in ['image/jpeg', 'image/png']:
        raise HTTPException(400, 'Only JPEG/PNG images are accepted')

    # Record the start time so we can report inference latency.
    start_time = time.time()

    # ── 2. Load image from the upload stream ─────────────────────────────
    # `file.read()` pulls the raw bytes from the multipart upload.
    # We wrap them in a BytesIO buffer so PIL can open them without
    # touching the filesystem (faster, no temp-file cleanup needed).
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert('RGB')

    # ── 3. Preprocess the image ──────────────────────────────────────────
    # Apply the deterministic inference transforms defined in
    # preprocessing.py (resize → center-crop → normalize).  The output
    # is a float32 tensor of shape [1, 3, 384, 384] ready for the model.
    tensor = preprocess_image(image).to(DEVICE)

    # ── 4. Run inference (no gradient computation) ───────────────────────
    # `torch.no_grad()` disables the autograd engine, which:
    #   • Reduces memory usage (no computation graph stored)
    #   • Speeds up the forward pass slightly
    # This is safe because we never call .backward() during inference.
    with torch.no_grad():
        outputs = model(tensor)

        # Apply softmax to convert raw logits into a probability
        # distribution over the 5 grades.  The probabilities sum to 1.
        probs = torch.softmax(outputs, dim=1)

        # The predicted grade is the class with the highest probability.
        confidence, predicted = torch.max(probs, 1)

    # ── 5. Calculate inference latency ───────────────────────────────────
    elapsed_ms = (time.time() - start_time) * 1000

    # ── 6. Build and return the JSON response ────────────────────────────
    # `.item()` converts single-element tensors to plain Python scalars,
    # which are JSON-serializable.
    return JSONResponse({
        'grade': GRADE_LABELS[predicted.item()],
        'confidence': round(confidence.item(), 4),
        'inference_time_ms': round(elapsed_ms, 2)
    })