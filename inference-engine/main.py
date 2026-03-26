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
from preprocessing import inference_transforms, tta_transforms
from clinical_postprocessor import classify_clinical_tier, GRADE_TO_TIER, TIER_LABELS


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
    0: 'Grade 0: No DR',
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

    # ── 3. Base Image Loaded ─────────────────────────────────────────────
    # We will apply transforms uniquely inside the 108 loop for Test-Time Augmentation.

    # ── 4. Run TTA inference 108 times (no gradient computation) ─────────────
    from collections import Counter
    
    total_time_ms = 0
    all_raw_grades = []
    all_confidences = []
    final_result = None

    # `torch.no_grad()` disables the autograd engine to reduce memory and speed up forward passes.
    with torch.no_grad():
        for i in range(108):
            iter_start = time.time()
            
            # Use deterministic transform for the very first pass to anchor the main result,
            # use TTA for the other 107 passes to build the ensemble distribution.
            if i == 0:
                tensor = inference_transforms(image).unsqueeze(0).to(DEVICE)
            else:
                tensor = tta_transforms(image).unsqueeze(0).to(DEVICE)
            
            logits = model(tensor)
            logits_np = logits.cpu().numpy().flatten()
            
            result = classify_clinical_tier(logits_np, prior_mode='clinical')
            
            iter_end = time.time()
            total_time_ms += (iter_end - iter_start) * 1000
            
            all_raw_grades.append(result['raw_grade'])
            all_confidences.append(result['confidence'])
            final_result = result # Keep the last one for detailed probs

    # ── 5. Calculate Ensembled Metrics ───────────────────────────────────
    avg_inference_time_ms = total_time_ms / 108.0
    mode_raw_grade = Counter(all_raw_grades).most_common(1)[0][0]
    avg_confidence = sum(all_confidences) / len(all_confidences)

    # Map the ensemble mode_raw_grade directly to the semantic clinical tier
    ensemble_tier_id = GRADE_TO_TIER[mode_raw_grade]
    ensemble_tier_info = TIER_LABELS[ensemble_tier_id]

    # ── 6. Build and return the JSON response ────────────────────────────
    return JSONResponse({
        # Clinical tier decisions (directly mapping the mode grade)
        'tier': ensemble_tier_info['name'],
        'tier_emoji': ensemble_tier_info['emoji'],
        'action': ensemble_tier_info['action'],
        'confidence': avg_confidence,
        
        # Detailed probability breakdown
        'tier_probabilities': {
            'no_disease': final_result['tier_probs'][0],
            'recommended': final_result['tier_probs'][1],
            'required': final_result['tier_probs'][2],
        },
        'expected_costs': {
            'no_disease': final_result['expected_costs'][0],
            'recommended': final_result['expected_costs'][1],
            'required': final_result['expected_costs'][2],
        },
        'grade_probabilities': {
            f'grade_{i}': p for i, p in enumerate(final_result['grade_probs'])
        },
        
        # Monte-carlo ensemble metrics
        'raw_model_grade': mode_raw_grade,
        'raw_model_grade_label': GRADE_LABELS[mode_raw_grade],
        'inference_time_ms': round(avg_inference_time_ms, 2)
    })