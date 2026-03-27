"""
SightX Inference Engine — FastAPI Server

This module exposes a REST API for real-time Diabetic Retinopathy (DR) 
grading using a trained ResNet-50 V2 model.
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import torch
import io
import time
from PIL import Image
from collections import Counter

# Local project modules
from model import DRClassifier
from preprocessing import inference_transforms, tta_transforms
from clinical_postprocessor import classify_clinical_tier, GRADE_TO_TIER, TIER_LABELS


# ── FastAPI Application Instance ─────────────────────────────────────────────
app = FastAPI(title='SightX Inference Engine', version='1.0')


# Selecting the best available hardware accelerator:
#   • NVIDIA GPU    → 'cuda' (CUDA Toolkit)
#   • Apple Silicon → 'mps'  (Metal Performance Shaders)
#   • Otherwise     → 'cpu'  (Standard fallback)
#
# This ensures the 9GB container actually utilizes your hardware 
# on Windows, Linux, or Mac without any code changes.
if torch.cuda.is_available():
    DEVICE = torch.device('cuda')
elif torch.backends.mps.is_available():
    DEVICE = torch.device('mps')
else:
    DEVICE = torch.device('cpu')

# ── Model Initialization ──
model = DRClassifier(num_classes=5)

# Load weights and map to the designated accelerator (CUDA, MPS, or CPU)
model.load_state_dict(torch.load('checkpoints/best_model.pt', map_location=DEVICE))

# Evaluation mode: Disables dropout and stabilizes BatchNorm
model.eval()
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

    # ── 4. Test-Time Augmentation (TTA) Ensemble ──
    total_time_ms = 0
    all_raw_grades, all_confidences = [], []
    final_result = None

    with torch.no_grad():
        for i in range(108):
            iter_start = time.time()
            
            # i=0: Anchor pass (deterministic); i>0: TTA passes (stochastic)
            tensor = (inference_transforms(image) if i == 0 else tta_transforms(image)).unsqueeze(0).to(DEVICE)
            
            logits = model(tensor)
            result = classify_clinical_tier(logits.cpu().numpy().flatten(), prior_mode='clinical')
            
            total_time_ms += (time.time() - iter_start) * 1000
            all_raw_grades.append(result['raw_grade'])
            all_confidences.append(result['confidence'])
            final_result = result

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