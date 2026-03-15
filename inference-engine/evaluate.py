# ──────────────────────────────────────────────────────────────────────────────
# Evaluation Script for SightX DR Classifier
# ──────────────────────────────────────────────────────────────────────────────
# Loads the best checkpoint and produces detailed evaluation metrics:
#   - Confusion matrix
#   - Per-class precision, recall, F1
#   - Quadratic weighted kappa (the Kaggle competition metric)
#   - Optimal threshold tuning (like the Kaggle winners did)
#
# Usage:
#   python evaluate.py                              # Evaluate best_model.pt
#   python evaluate.py --checkpoint path/to/model.pt  # Evaluate specific checkpoint
# ──────────────────────────────────────────────────────────────────────────────

import torch
from torch.utils.data import DataLoader
import numpy as np
import pandas as pd
import os
import argparse
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    cohen_kappa_score,
    accuracy_score
)

# Anchor all paths to the directory where this script lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from model import DRClassifier
from preprocessing import inference_transforms
from train import EyePACSDataset

# Grade labels for readable output
GRADE_NAMES = [
    '0 - No DR',
    '1 - Mild',
    '2 - Moderate',
    '3 - Severe',
    '4 - Proliferative'
]


def print_confusion_matrix(cm, labels):
    """Pretty-print a confusion matrix with labels."""
    # Header
    print("\n" + "=" * 60)
    print("CONFUSION MATRIX")
    print("=" * 60)
    print(f"{'':>18}", end='')
    for label in labels:
        short = label.split(' - ')[0]
        print(f"{'Pred '+short:>10}", end='')
    print()
    print("-" * (18 + 10 * len(labels)))
    
    # Rows
    for i, label in enumerate(labels):
        print(f"{'True '+label:>18}", end='')
        for j in range(len(labels)):
            print(f"{cm[i][j]:>10}", end='')
        print()
    print()


def find_optimal_thresholds(probabilities, true_labels, num_classes=5):
    """
    Find optimal decision thresholds to maximize kappa score.
    
    Instead of simply taking argmax (which assumes equal thresholds at 0.5),
    the Kaggle winners performed a grid search to find thresholds that
    map continuous predictions to integer grades optimally.
    
    This can squeeze out 1-3% extra kappa from the same model predictions.
    """
    # Use the expected value as a continuous prediction
    # E[grade] = sum(grade * probability) for each image
    grades = np.arange(num_classes)
    continuous_preds = probabilities @ grades  # Shape: (n_samples,)
    
    best_kappa = -1
    best_thresholds = [0.5, 1.5, 2.5, 3.5]  # Default: simple rounding
    
    # Grid search over thresholds
    for t0 in np.arange(0.2, 0.9, 0.1):
        for t1 in np.arange(1.0, 1.8, 0.1):
            for t2 in np.arange(2.0, 2.8, 0.1):
                for t3 in np.arange(3.0, 3.8, 0.1):
                    thresholds = [t0, t1, t2, t3]
                    preds = np.digitize(continuous_preds, thresholds)
                    preds = np.clip(preds, 0, num_classes - 1)
                    kappa = cohen_kappa_score(true_labels, preds, weights='quadratic')
                    if kappa > best_kappa:
                        best_kappa = kappa
                        best_thresholds = thresholds
    
    return best_thresholds, best_kappa


def main():
    parser = argparse.ArgumentParser(description='Evaluate SightX DR classifier')
    parser.add_argument('--checkpoint', type=str,
                        default=os.path.join(BASE_DIR, 'checkpoints', 'best_model.pt'),
                        help='Path to model checkpoint')
    parser.add_argument('--no-threshold-tuning', action='store_true',
                        help='Skip optimal threshold search (faster)')
    args = parser.parse_args()
    
    # Device detection
    DEVICE = torch.device('mps' if torch.backends.mps.is_available() else
                          'cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Evaluating on device: {DEVICE}")
    
    # Check checkpoint exists
    if not os.path.exists(args.checkpoint):
        print(f"Error: checkpoint not found at {args.checkpoint}")
        print("Run train.py first to generate a checkpoint.")
        return
    
    # ── Load model ───────────────────────────────────────────────────────
    model = DRClassifier(num_classes=5).to(DEVICE)
    state_dict = torch.load(args.checkpoint, map_location=DEVICE, weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    print(f"Loaded checkpoint: {args.checkpoint}")
    
    # ── Load validation data ─────────────────────────────────────────────
    val_csv = os.path.join(BASE_DIR, 'data', 'val_split.csv')
    if not os.path.exists(val_csv):
        print("Error: val_split.csv not found. Run train.py first to create the split.")
        return
    
    raw_dir = os.path.join(BASE_DIR, 'data', 'train')
    processed_dir = os.path.join(BASE_DIR, 'data', 'train_processed')
    use_processed = os.path.isdir(processed_dir) and \
                    len(os.listdir(processed_dir)) > 0
    
    val_ds = EyePACSDataset(
        val_csv, raw_dir, inference_transforms,
        preprocessed_dir=processed_dir if use_processed else None
    )
    val_dl = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=4)
    
    print(f"Validation set: {len(val_ds)} images")
    if use_processed:
        print(f"Using preprocessed images from data/train_processed/")
    
    # ── Run inference ────────────────────────────────────────────────────
    all_preds = []
    all_labels = []
    all_probs = []
    
    print("\nRunning inference...")
    with torch.no_grad():
        for images, labels in val_dl:
            images = images.to(DEVICE)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            preds = outputs.argmax(1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())
    
    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)
    
    # ── Standard Metrics (argmax predictions) ────────────────────────────
    accuracy = accuracy_score(all_labels, all_preds)
    kappa = cohen_kappa_score(all_labels, all_preds, weights='quadratic')
    
    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"  Accuracy:              {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  Quadratic Wt. Kappa:   {kappa:.4f}")
    
    # Confusion Matrix
    cm = confusion_matrix(all_labels, all_preds)
    print_confusion_matrix(cm, GRADE_NAMES)
    
    # Per-class metrics
    print("=" * 60)
    print("PER-CLASS METRICS")
    print("=" * 60)
    report = classification_report(all_labels, all_preds,
                                   target_names=GRADE_NAMES,
                                   digits=4, zero_division=0)
    print(report)
    
    # ── Optimal Threshold Tuning ─────────────────────────────────────────
    if not args.no_threshold_tuning:
        print("=" * 60)
        print("OPTIMAL THRESHOLD TUNING")
        print("=" * 60)
        print("Searching for optimal decision thresholds...")
        
        best_thresholds, best_kappa = find_optimal_thresholds(all_probs, all_labels)
        
        # Apply optimal thresholds
        grades = np.arange(5)
        continuous_preds = all_probs @ grades
        optimized_preds = np.digitize(continuous_preds, best_thresholds)
        optimized_preds = np.clip(optimized_preds, 0, 4)
        
        optimized_acc = accuracy_score(all_labels, optimized_preds)
        
        print(f"  Optimal thresholds: {[f'{t:.1f}' for t in best_thresholds]}")
        print(f"  Kappa (argmax):     {kappa:.4f}")
        print(f"  Kappa (optimized):  {best_kappa:.4f}")
        print(f"  Accuracy (argmax):  {accuracy:.4f}")
        print(f"  Accuracy (optimized): {optimized_acc:.4f}")
        
        if best_kappa > kappa:
            improvement = (best_kappa - kappa)
            print(f"  ✓ Threshold tuning improved kappa by +{improvement:.4f}")
        else:
            print(f"  → Threshold tuning did not improve kappa")
    
    # ── Summary ──────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Model:       {os.path.basename(args.checkpoint)}")
    print(f"  Val images:  {len(val_ds)}")
    print(f"  Accuracy:    {accuracy:.4f}")
    print(f"  Kappa:       {kappa:.4f}")
    
    # Grade-level insights
    print("\n  Key observations:")
    for i in range(5):
        if cm[i].sum() > 0:
            recall = cm[i][i] / cm[i].sum()
            print(f"    Grade {i}: {recall:.1%} recall "
                  f"({cm[i][i]}/{cm[i].sum()} correct)")


if __name__ == '__main__':
    main()
