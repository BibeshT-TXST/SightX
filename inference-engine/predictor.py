"""
SightX Predictor — Diabetic Retinopathy grading, independent of transport

Loads the ResNet-50 V2 model once at import time and exposes `predict()`,
which takes raw image bytes and returns the clinical result as a dict.
The FastAPI server (main.py) and the SQS worker both call it, so neither
depends on how the other receives images.
"""

import io
import os
import time
from collections import Counter

import numpy as np
import torch
from PIL import Image, UnidentifiedImageError

# Local project modules
from model import DRClassifier
from preprocessing import inference_transforms, tta_transforms
from clinical_postprocessor import (
    classify_clinical_tier,
    aggregate_to_tiers,
    risk_minimized_decision,
    GRADE_TO_TIER,
    TIER_LABELS,
)


class InvalidImageError(ValueError):
    """Raised when the input bytes cannot be decoded as an image."""


# Selecting the best available hardware accelerator:
#   • NVIDIA GPU    → 'cuda' (CUDA Toolkit)
#   • Apple Silicon → 'mps'  (Metal Performance Shaders)
#   • Otherwise     → 'cpu'  (Standard fallback)
if torch.cuda.is_available():
    DEVICE = torch.device('cuda')
elif torch.backends.mps.is_available():
    DEVICE = torch.device('mps')
else:
    DEVICE = torch.device('cpu')

# ── Model Initialization ──
# MODEL_WEIGHTS_PATH lets a host load weights from somewhere other than the
# repo checkout (for example, a file downloaded from S3 at startup).
MODEL_WEIGHTS_PATH = os.getenv('MODEL_WEIGHTS_PATH', 'checkpoints/best_model.pt')

# pretrained=False: the checkpoint below overwrites every weight, so skip
# downloading the ImageNet ones (no network access needed at startup)
model = DRClassifier(num_classes=5, pretrained=False)

# Load weights and map to the designated accelerator (CUDA, MPS, or CPU)
model.load_state_dict(torch.load(MODEL_WEIGHTS_PATH, map_location=DEVICE))

# Evaluation mode: Disables dropout and stabilizes BatchNorm
model.eval()
model.to(DEVICE)


# ── Test-Time Augmentation Settings ──
# TTA_PASSES:     total passes per image (pass 0 is the deterministic anchor)
# TTA_BATCH_SIZE: passes per forward pass; lower it if the host runs out of memory
TTA_PASSES = int(os.getenv('TTA_PASSES', '108'))
TTA_BATCH_SIZE = int(os.getenv('TTA_BATCH_SIZE', '8'))

if TTA_PASSES < 1 or TTA_BATCH_SIZE < 1:
    raise ValueError('TTA_PASSES and TTA_BATCH_SIZE must be at least 1')


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


def predict(image_bytes: bytes) -> dict:
    """
    Grade one retinal fundus image.

    Parameters
    ----------
    image_bytes : bytes
        Raw JPEG or PNG file contents.

    Returns
    -------
    dict
        The clinical tier, averaged probabilities, ensemble grade and total
        inference time. JSON-serializable.

    Raises
    ------
    InvalidImageError
        If the bytes cannot be decoded as an image.
    """
    # Record the start time so we can report inference latency.
    start_time = time.time()

    # ── 1. Decode the image ──────────────────────────────────────────────
    # BytesIO lets PIL open the bytes without touching the filesystem.
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    except (UnidentifiedImageError, OSError) as e:
        raise InvalidImageError('Could not decode image') from e

    # ── 2. Test-Time Augmentation (TTA) Ensemble ─────────────────────────
    # Passes run TTA_BATCH_SIZE at a time: one forward pass over a batch is
    # much cheaper than the same number of single-image passes.
    all_raw_grades, all_confidences, all_grade_probs = [], [], []

    with torch.no_grad():
        for batch_start in range(0, TTA_PASSES, TTA_BATCH_SIZE):
            batch_end = min(batch_start + TTA_BATCH_SIZE, TTA_PASSES)

            # Pass 0: anchor (deterministic); later passes: TTA (stochastic)
            batch = torch.stack([
                inference_transforms(image) if i == 0 else tta_transforms(image)
                for i in range(batch_start, batch_end)
            ]).to(DEVICE)

            batch_logits = model(batch).cpu().numpy()

            for logits in batch_logits:
                result = classify_clinical_tier(logits, prior_mode='clinical')
                all_raw_grades.append(result['raw_grade'])
                all_confidences.append(result['confidence'])
                all_grade_probs.append(result['grade_probs'])

    # ── 3. Calculate Ensembled Metrics ───────────────────────────────────
    # Total wall-clock time for the whole prediction (the UI shows it as
    # "Inference Time"), not the average of a single pass.
    total_inference_time_ms = (time.time() - start_time) * 1000
    mode_raw_grade = Counter(all_raw_grades).most_common(1)[0][0]
    avg_confidence = sum(all_confidences) / len(all_confidences)

    # Average the probabilities over every pass so they agree with the
    # ensemble tier reported alongside them.
    mean_grade_probs = np.mean(all_grade_probs, axis=0)
    mean_tier_probs = aggregate_to_tiers(mean_grade_probs)
    _, mean_expected_costs = risk_minimized_decision(mean_tier_probs)

    # Map the ensemble mode_raw_grade directly to the semantic clinical tier
    ensemble_tier_id = GRADE_TO_TIER[mode_raw_grade]
    ensemble_tier_info = TIER_LABELS[ensemble_tier_id]

    # ── 4. Build the result ──────────────────────────────────────────────
    return {
        # Clinical tier decisions (directly mapping the mode grade)
        'tier': ensemble_tier_info['name'],
        'tier_emoji': ensemble_tier_info['emoji'],
        'action': ensemble_tier_info['action'],
        'confidence': avg_confidence,

        # Detailed probability breakdown
        'tier_probabilities': {
            'no_disease': round(float(mean_tier_probs[0]), 4),
            'recommended': round(float(mean_tier_probs[1]), 4),
            'required': round(float(mean_tier_probs[2]), 4),
        },
        'expected_costs': {
            'no_disease': round(float(mean_expected_costs[0]), 2),
            'recommended': round(float(mean_expected_costs[1]), 2),
            'required': round(float(mean_expected_costs[2]), 2),
        },
        'grade_probabilities': {
            f'grade_{i}': round(float(p), 4) for i, p in enumerate(mean_grade_probs)
        },

        # Monte-carlo ensemble metrics
        'raw_model_grade': mode_raw_grade,
        'raw_model_grade_label': GRADE_LABELS[mode_raw_grade],
        'inference_time_ms': round(total_inference_time_ms, 2),
    }
