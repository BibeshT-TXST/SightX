# ──────────────────────────────────────────────────────────────────────────────
# Training Loop — V2
# ──────────────────────────────────────────────────────────────────────────────
# V2 Changes (based on Kaggle competition winning solutions):
#   - Cosine annealing LR scheduler with warmup (replaces StepLR)
#   - Early stopping when validation metric plateaus
#   - Label smoothing for better generalization
#   - Gradual unfreezing: layer3 unlocks after 5 epochs
#   - Quadratic weighted kappa tracking (the competition metric)
#   - CSV logging for training curves
#   - Supports preprocessed images (from preprocess_retinal.py)
#   - Suppressed "Training on device" spam from DataLoader workers
#   - Command-line arguments for easy experimentation
# ──────────────────────────────────────────────────────────────────────────────

import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import pandas as pd
import os
import csv
import argparse
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import cohen_kappa_score

# Anchor all paths to the directory where this script lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

from model import DRClassifier
from preprocessing import train_transforms, inference_transforms


# ── CONFIG ────────────────────────────────────────────────────────────────────
DEFAULTS = {
    'epochs': 30,
    'batch_size': 16,       # Reduced from 32 because 384px images use ~3× more memory
    'lr': 3e-4,             # Slightly higher LR since we have BatchNorm now
    'patience': 7,          # Stop if no improvement for 7 epochs
    'unfreeze_epoch': 5,    # Unfreeze layer3 after this many epochs
    'warmup_epochs': 3,     # LR warmup period
    'label_smoothing': 0.1, # Prevents overconfident predictions
    'num_workers': 4,
}


# ── DATASET CLASS ─────────────────────────────────────────────────────────────
class EyePACSDataset(Dataset):
    """
    Dataset that loads retinal images and their DR grades.
    
    Supports both raw images (.jpeg) and preprocessed images (.png).
    When preprocessed images are available, they are preferred since
    they've already been circle-cropped, color-normalized, and enhanced.
    """
    def __init__(self, csv_path, img_dir, transform=None, preprocessed_dir=None):
        self.df = pd.read_csv(csv_path)
        self.img_dir = img_dir
        self.transform = transform
        self.preprocessed_dir = preprocessed_dir

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        image_name = row['image']
        label = int(row['level'])
        
        # Prefer preprocessed images if available
        if self.preprocessed_dir:
            img_path = os.path.join(self.preprocessed_dir, image_name + '.png')
            if os.path.exists(img_path):
                image = Image.open(img_path).convert('RGB')
                if self.transform:
                    image = self.transform(image)
                return image, label
        
        # Fall back to raw images
        img_path = os.path.join(self.img_dir, image_name + '.jpeg')
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, label


def get_cosine_schedule_with_warmup(optimizer, warmup_epochs, total_epochs, 
                                     steps_per_epoch):
    """
    Cosine annealing with linear warmup.
    
    - Warmup: LR linearly increases from 0 to base_lr over warmup_epochs
    - Cosine: LR smoothly decays from base_lr to 0 using cosine curve
    
    This replaces V1's StepLR which had abrupt drops. Cosine annealing
    provides smoother, more stable training that consistently outperforms
    step-based schedules in practice.
    """
    warmup_steps = warmup_epochs * steps_per_epoch
    total_steps = total_epochs * steps_per_epoch
    
    def lr_lambda(step):
        if step < warmup_steps:
            # Linear warmup: 0 → 1 over warmup period
            return step / max(1, warmup_steps)
        else:
            # Cosine decay: 1 → 0 over remaining training
            progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
            return 0.5 * (1.0 + np.cos(np.pi * progress))
    
    return torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)


def compute_kappa(all_labels, all_preds):
    """
    Compute quadratic weighted kappa — the metric used in the Kaggle competition.
    
    Unlike accuracy, kappa accounts for:
    - Class imbalance (more credit for correct rare-class predictions)
    - Ordinal distance (predicting Grade 0 for a Grade 4 image is worse
      than predicting Grade 3 for a Grade 4 image)
    
    Range: -1 (complete disagreement) to 1 (perfect agreement)
    A kappa of 0.65+ is considered "substantial agreement"
    """
    return cohen_kappa_score(all_labels, all_preds, weights='quadratic')


if __name__ == '__main__':
    # ── ARGUMENT PARSING ─────────────────────────────────────────────────
    parser = argparse.ArgumentParser(description='Train SightX DR classifier (V2)')
    parser.add_argument('--epochs', type=int, default=DEFAULTS['epochs'])
    parser.add_argument('--batch-size', type=int, default=DEFAULTS['batch_size'])
    parser.add_argument('--lr', type=float, default=DEFAULTS['lr'])
    parser.add_argument('--patience', type=int, default=DEFAULTS['patience'])
    parser.add_argument('--no-preprocessed', action='store_true',
                        help='Use raw images instead of preprocessed ones')
    args = parser.parse_args()
    
    # ── DEVICE DETECTION ─────────────────────────────────────────────────
    DEVICE = torch.device('mps' if torch.backends.mps.is_available() else
                          'cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Training on device: {DEVICE}")
    print(f"Config: epochs={args.epochs}, batch_size={args.batch_size}, "
          f"lr={args.lr}, patience={args.patience}")
    
    # ── TRAIN / VAL SPLIT ────────────────────────────────────────────────
    full_df = pd.read_csv(os.path.join(BASE_DIR, 'data', 'trainLabels.csv'))
    train_df, val_df = train_test_split(full_df, test_size=0.2, random_state=42,
                                        stratify=full_df['level'])
    train_df.to_csv(os.path.join(BASE_DIR, 'data', 'train_split.csv'), index=False)
    val_df.to_csv(os.path.join(BASE_DIR, 'data', 'val_split.csv'), index=False)
    
    # ── DATA LOADERS ─────────────────────────────────────────────────────
    raw_dir = os.path.join(BASE_DIR, 'data', 'train')
    processed_dir = os.path.join(BASE_DIR, 'data', 'train_processed')
    
    # Use preprocessed images if available and not explicitly disabled
    use_processed = os.path.isdir(processed_dir) and not args.no_preprocessed
    if use_processed:
        n_processed = len([f for f in os.listdir(processed_dir) if f.endswith('.png')])
        print(f"Using preprocessed images ({n_processed} found in data/train_processed/)")
    else:
        print("Using raw images (run preprocess_retinal.py first for better results)")
        processed_dir = None
    
    train_ds = EyePACSDataset(
        os.path.join(BASE_DIR, 'data', 'train_split.csv'),
        raw_dir, train_transforms,
        preprocessed_dir=processed_dir
    )
    val_ds = EyePACSDataset(
        os.path.join(BASE_DIR, 'data', 'val_split.csv'),
        raw_dir, inference_transforms,
        preprocessed_dir=processed_dir
    )
    
    train_dl = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True,
                          num_workers=DEFAULTS['num_workers'])
    val_dl = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False,
                        num_workers=DEFAULTS['num_workers'])
    
    # ── CLASS IMBALANCE HANDLING ─────────────────────────────────────────
    labels = train_ds.df['level'].values
    classes = np.unique(labels)
    weights = compute_class_weight('balanced', classes=classes, y=labels)
    class_weights = torch.FloatTensor(weights).to(DEVICE)
    
    # V2: Added label smoothing — prevents overconfident predictions
    # and improves generalization (a proven regularization technique)
    criterion = torch.nn.CrossEntropyLoss(
        weight=class_weights,
        label_smoothing=DEFAULTS['label_smoothing']
    )
    
    # ── MODEL, OPTIMIZER, SCHEDULER ──────────────────────────────────────
    model = DRClassifier(num_classes=5).to(DEVICE)
    model.get_trainable_summary()
    
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr
    )
    
    # V2: Cosine annealing with warmup replaces StepLR
    steps_per_epoch = len(train_dl)
    scheduler = get_cosine_schedule_with_warmup(
        optimizer,
        warmup_epochs=DEFAULTS['warmup_epochs'],
        total_epochs=args.epochs,
        steps_per_epoch=steps_per_epoch
    )
    
    # ── TRAINING LOG SETUP ───────────────────────────────────────────────
    log_path = os.path.join(BASE_DIR, 'checkpoints', 'training_log.csv')
    os.makedirs(os.path.join(BASE_DIR, 'checkpoints'), exist_ok=True)
    
    with open(log_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['epoch', 'train_loss', 'train_acc', 'val_acc', 'val_kappa', 'lr'])
    
    # ── TRAINING LOOP ────────────────────────────────────────────────────
    best_val_kappa = -1.0   # Track best kappa (not just accuracy)
    best_val_acc = 0.0
    epochs_without_improvement = 0
    
    for epoch in range(args.epochs):
        # -- Gradual unfreezing: unlock layer3 after warmup --
        if epoch == DEFAULTS['unfreeze_epoch']:
            model.unfreeze_layer3()
            # Re-initialize optimizer to include newly unfrozen parameters
            optimizer = torch.optim.Adam(
                filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr * 0.1
            )
            scheduler = get_cosine_schedule_with_warmup(
                optimizer,
                warmup_epochs=1,
                total_epochs=args.epochs - epoch,
                steps_per_epoch=steps_per_epoch
            )
            model.get_trainable_summary()
        
        # -- Training phase --
        model.train()
        running_loss, correct = 0, 0
        
        for images, labels_batch in train_dl:
            images, labels_batch = images.to(DEVICE), labels_batch.to(DEVICE)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels_batch)
            loss.backward()
            optimizer.step()
            scheduler.step()    # Step per batch (not per epoch) for cosine schedule
            
            running_loss += loss.item() * images.size(0)
            correct += (outputs.argmax(1) == labels_batch).sum().item()
        
        train_loss = running_loss / len(train_ds)
        train_acc = correct / len(train_ds)
        
        # -- Validation phase --
        model.eval()
        val_correct = 0
        all_preds = []
        all_labels = []
        
        with torch.no_grad():
            for images, labels_batch in val_dl:
                images, labels_batch = images.to(DEVICE), labels_batch.to(DEVICE)
                outputs = model(images)
                preds = outputs.argmax(1)
                val_correct += (preds == labels_batch).sum().item()
                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels_batch.cpu().numpy())
        
        val_acc = val_correct / len(val_ds)
        val_kappa = compute_kappa(all_labels, all_preds)
        current_lr = optimizer.param_groups[0]['lr']
        
        # -- Logging --
        print(f'Epoch {epoch+1}/{args.epochs} | Loss: {train_loss:.4f} | '
              f'Train Acc: {train_acc:.4f} | Val Acc: {val_acc:.4f} | '
              f'κ: {val_kappa:.4f} | LR: {current_lr:.6f}')
        
        with open(log_path, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([epoch+1, f'{train_loss:.4f}', f'{train_acc:.4f}',
                           f'{val_acc:.4f}', f'{val_kappa:.4f}', f'{current_lr:.6f}'])
        
        # -- Save best model (based on kappa, not just accuracy) --
        improved = False
        if val_kappa > best_val_kappa:
            best_val_kappa = val_kappa
            best_val_acc = val_acc
            torch.save(model.state_dict(), 
                       os.path.join(BASE_DIR, 'checkpoints', 'best_model.pt'))
            print(f'  ✓ New best model saved (κ={val_kappa:.4f}, acc={val_acc:.4f})')
            improved = True
        
        # -- Early stopping --
        if improved:
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1
            if epochs_without_improvement >= args.patience:
                print(f'\n⏹ Early stopping: no improvement for {args.patience} epochs')
                break
    
    print(f'\nTraining complete.')
    print(f'  Best val accuracy: {best_val_acc:.4f}')
    print(f'  Best val kappa:    {best_val_kappa:.4f}')
    print(f'  Training log:      {log_path}')