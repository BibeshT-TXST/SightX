# Training Loop
import torch
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import pandas as pd
import os
import numpy as np
from sklearn.utils.class_weight import compute_class_weight
from model import DRClassifier
from preprocessing import train_transform, inference_transform

 #── CONFIG ────────────────────────────────────────────────────────────────────
EPOCHS     = 20
BATCH_SIZE = 32
LR         = 1e-4

# Auto-detect best available device: Apple M4 → MPS, NVIDIA → CUDA, else CPU
# If device is CPU, consider using smaller batch size to avoid long training times
# If device is MPS, ensure you have the latest PyTorch version and macOS updates
# If device is CUDA, ensure you have the correct NVIDIA drivers and CUDA toolkit installed
DEVICE     = torch.device('mps' if torch.backends.mps.is_available() else
             'cuda' if torch.cuda.is_available() else 'cpu')
print(f"Training on device: {DEVICE}")

# ── DATASET CLASS ─────────────────────────────────────────────────────────────
class EyePACSDataset(Dataset):
    def __init__(self, csv_path, img_dir, transform=None):
        self.df = pd.read_csv(csv_path)
        self.img_dir = img_dir
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        # Build full path to the image file
        img_path = os.path.join(self.img_dir, row['image'] + '.jpeg')
        # Always convert to RGB — some retinal images are saved as grayscale
        image = Image.open(img_path).convert('RGB')
        label = int(row['level'])
        if self.transform:
            image = self.transform(image)
        return image, label
    
 # ── DATA LOADERS ──────────────────────────────────────────────────────────────
train_ds = EyePACSDataset('data/train.csv', 'data/train/', train_transform)
val_ds   = EyePACSDataset('data/val.csv',   'data/train/', inference_transform)

# shuffle=True on train so the model doesn't see images in the same order each epoch
train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=4)
val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=4)
