# ──────────────────────────────────────────────────────────────────────────────
# Batch Test: Raw vs. Post-Processed Tier Accuracy
# ──────────────────────────────────────────────────────────────────────────────
# This script loads 1000 images (250 each from Grades 1-4) directly using
# the model (bypassing HTTP for speed) to compare:
#   1. Raw model performance on the 3 clinical tiers
#   2. Post-processed pipeline performance on the 3 clinical tiers
#
# The goal is to see if the probability post-processing correctly triages
# more positive cases into the "Recommended" and "Required" tiers than the
# biased raw model.
# ──────────────────────────────────────────────────────────────────────────────

import os
import torch
import numpy as np
import pandas as pd
from collections import defaultdict
import time
from sklearn.metrics import confusion_matrix

from model import DRClassifier
from preprocessing import inference_transforms
from train import EyePACSDataset
from clinical_postprocessor import classify_clinical_tier, GRADE_TO_TIER, TIER_LABELS

# Setup
DEVICE = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
SAMPLES_PER_GRADE = 250
GRADES_TO_TEST = [1, 2, 3, 4]

# Load original labels to find a balanced subset
val_csv = 'data/val_split.csv'
if not os.path.exists(val_csv):
    val_csv = 'data/trainLabels.csv'  # Fallback

df = pd.read_csv(val_csv)

print(f"Loading {SAMPLES_PER_GRADE} images per grade ({GRADES_TO_TEST})...")
test_images = []
for grade in GRADES_TO_TEST:
    grade_df = df[df['level'] == grade].sample(n=min(SAMPLES_PER_GRADE, len(df[df['level'] == grade])), random_state=42)
    test_images.extend([(row['image'], row['level']) for _, row in grade_df.iterrows()])

print(f"Total test images: {len(test_images)}")

# Load model
model = DRClassifier(num_classes=5).to(DEVICE)
model.load_state_dict(torch.load('checkpoints/best_model.pt', map_location=DEVICE))
model.eval()

# Metrics tracking
raw_correct = 0
post_correct = 0
true_tiers = []
raw_tiers = []
post_tiers = []

from PIL import Image

start_time = time.time()
print("\nRunning inference...")

# Run directly through model to bypass HTTP server crash issues
with torch.no_grad():
    for i, (img_name, true_grade) in enumerate(test_images):
        if i % 100 == 0:
            print(f"  Processed {i}/{len(test_images)}")
            
        img_path = os.path.join('data', 'train', f"{img_name}.jpeg")
        if not os.path.exists(img_path):
            continue
            
        # Ensure image is loaded correctly
        image = Image.open(img_path).convert('RGB')
        tensor = inference_transforms(image).unsqueeze(0).to(DEVICE)
        
        # Raw inference
        logits = model(tensor)
        logits_np = logits.cpu().numpy().flatten()
        
        # 1. Raw prediction (argmax) -> converted to tier
        raw_grade = int(np.argmax(logits_np))
        raw_tier = GRADE_TO_TIER[raw_grade]
        
        # 2. Post-processed pipeline -> tier
        result = classify_clinical_tier(logits_np, prior_mode='clinical')
        post_tier = result['tier']
        
        true_tier = GRADE_TO_TIER[true_grade]
        
        # Record
        true_tiers.append(true_tier)
        raw_tiers.append(raw_tier)
        post_tiers.append(post_tier)
        
        if raw_tier == true_tier:
            raw_correct += 1
        if post_tier == true_tier:
            post_correct += 1

elapsed = time.time() - start_time
print(f"\nCompleted in {elapsed:.1f}s")

# ── Reporting ───────────────────────────────────────────────────────────────

print("\n" + "="*50)
print("BATCH TEST RESULTS (TIER CLASSIFICATION)")
print("="*50)
print(f"Tested on {len(true_tiers)} images (Grades 1-4)")
print(f"Total Raw Tier Accuracy:        {raw_correct/len(true_tiers):.1%}")
print(f"Total Post-Processed Accuracy:  {post_correct/len(true_tiers):.1%}")

# Confusion matrices
raw_cm = confusion_matrix(true_tiers, raw_tiers, labels=[0, 1, 2])
post_cm = confusion_matrix(true_tiers, post_tiers, labels=[0, 1, 2])

tier_names = ['No Disease', 'Recommended', 'Required']

def print_cm(cm, title):
    print("\n" + "-"*40)
    print(f"{title} Confusion Matrix:")
    print("-" * 40)
    print(f"True | Pred | {tier_names[0]:<12} | {tier_names[1]:<12} | {tier_names[2]:<12}")
    print("-" * 65)
    
    # We only have true tiers 1 and 2 in this test (no Grade 0)
    for i in [1, 2]:
        print(f"{tier_names[i]:<20} | {cm[i][0]:<12} | {cm[i][1]:<12} | {cm[i][2]:<12}")

print_cm(raw_cm, "RAW MODEL (Argmax -> Tier)")
print_cm(post_cm, "POST-PROCESSED PIPELINE")

print("\nAnalysis:")
print("1. Did we reduce false negatives (sick predicted as No Disease)?")
raw_fn = raw_cm[1][0] + raw_cm[2][0]
post_fn = post_cm[1][0] + post_cm[2][0]
print(f"   Raw False Negatives (Critical fail): {raw_fn}/{len(true_tiers)} ({raw_fn/len(true_tiers):.1%})")
print(f"   Post False Negatives:                {post_fn}/{len(true_tiers)} ({post_fn/len(true_tiers):.1%})")

print("\n2. Did we improve 'Doctor Visit Recommended' (True Tier 1) accuracy?")
true_tier1_count = sum(1 for t in true_tiers if t == 1)
raw_tier1_acc = raw_cm[1][1] / true_tier1_count if true_tier1_count > 0 else 0
post_tier1_acc = post_cm[1][1] / true_tier1_count if true_tier1_count > 0 else 0
print(f"   Raw Tier 1 Recall:  {raw_tier1_acc:.1%}")
print(f"   Post Tier 1 Recall: {post_tier1_acc:.1%}")

print("\n3. Did we improve 'Doctor Visit Required' (True Tier 2) accuracy?")
true_tier2_count = sum(1 for t in true_tiers if t == 2)
raw_tier2_acc = raw_cm[2][2] / true_tier2_count if true_tier2_count > 0 else 0
post_tier2_acc = post_cm[2][2] / true_tier2_count if true_tier2_count > 0 else 0
print(f"   Raw Tier 2 Recall:  {raw_tier2_acc:.1%}")
print(f"   Post Tier 2 Recall: {post_tier2_acc:.1%}")
