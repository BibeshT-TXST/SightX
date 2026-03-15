# ── calibrate_temperature.py (run once, save T) ──
# This file runs on the validation set to find the optimal temperature for scaling the model's logits.
"""
Run this script after training to find the optimal temperature.
The result is a single float that you hardcode into clinical_postprocessor.py.

Usage:
    conda activate sightx
    python calibrate_temperature.py
"""
import torch
import numpy as np
from torch.utils.data import DataLoader
from model import DRClassifier
from preprocessing import inference_transforms
from train import EyePACSDataset

DEVICE = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')

# Load model
model = DRClassifier(num_classes=5).to(DEVICE)
model.load_state_dict(torch.load('checkpoints/best_model.pt', map_location=DEVICE))
model.eval()

# Load validation data
val_ds = EyePACSDataset('data/val_split.csv', 'data/train', inference_transforms)
val_dl = DataLoader(val_ds, batch_size=32, shuffle=False)

# Collect raw logits (NOT softmax) for every validation image
all_logits = []
all_labels = []
with torch.no_grad():
    for images, labels in val_dl:
        # model(images) returns logits, NOT probabilities
        logits = model(images.to(DEVICE))
        all_logits.append(logits.cpu().numpy())
        all_labels.append(labels.numpy())

all_logits = np.concatenate(all_logits)
all_labels = np.concatenate(all_labels)

# Find optimal temperature
from temperature_calibration import find_optimal_temperature
T = find_optimal_temperature(all_logits, all_labels)
print(f"\n✓ Optimal temperature: {T:.4f}")
print(f"  → Hardcode this value as TEMPERATURE in clinical_postprocessor.py")
