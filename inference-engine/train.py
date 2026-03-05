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
from preprocessing import train_transforms, inference_transforms

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
train_ds = EyePACSDataset('data/train.csv', 'data/train/', train_transforms)
val_ds   = EyePACSDataset('data/val.csv',   'data/train/', inference_transforms)

# shuffle=True on train so the model doesn't see images in the same order each epoch
train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=4)
val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=4)

# ── CLASS IMBALANCE HANDLING ──────────────────────────────────────────────────
# ~73% of images are Grade 0. Without weighting, the model just predicts
# Grade 0 for everything and still gets 73% accuracy 
# To prevent this, we compute class weights and use them in the loss function
labels  = train_ds.df['level'].values           
classes = np.unique(labels)
weights = compute_class_weight('balanced', classes=classes, y=labels)

# Move weights to same device as model so loss calculation doesn't crash
class_weights = torch.FloatTensor(weights).to(DEVICE)  
criterion = torch.nn.CrossEntropyLoss(weight=class_weights)

# ── MODEL, OPTIMIZER, SCHEDULER ───────────────────────────────────────────────
model = DRClassifier(num_classes=5).to(DEVICE)

# filter() ensures we only update trainable params (frozen backbone layers are skipped)
optimizer = torch.optim.Adam(
    filter(lambda p: p.requires_grad, model.parameters()), lr=LR
)

# Reduce learning rate by 10x every 7 epochs — prevents overshooting the optimal weights
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

# ── TRAINING LOOP ─────────────────────────────────────────────────────────────
os.makedirs('checkpoints', exist_ok=True)   # Ensure checkpoint folder exists
best_val_acc = 0.0

for epoch in range(EPOCHS):
    # -- Training --
    model.train()   # Enables dropout and batch norm training behaviour
    running_loss, correct = 0, 0

    for images, labels in train_dl:
        images, labels = images.to(DEVICE), labels.to(DEVICE)

        optimizer.zero_grad()               # Clear gradients from last step
        outputs = model(images)             # Forward pass
        loss = criterion(outputs, labels)   # Compute weighted loss
        loss.backward()                     # Backprop: compute gradients
        optimizer.step()                    # Update weights using gradients

        running_loss += loss.item() * images.size(0)
        correct += (outputs.argmax(1) == labels).sum().item()

    train_loss = running_loss / len(train_ds)
    train_acc  = correct / len(train_ds)

    # -- Validation --
    model.eval()    # Disables dropout for consistent, deterministic predictions
    val_correct = 0
    with torch.no_grad():   # Skip gradient tracking — saves memory and speeds up
        for images, labels in val_dl:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            val_correct += (outputs.argmax(1) == labels).sum().item()

    val_acc = val_correct / len(val_ds)
    scheduler.step()    # Decay learning rate if step_size epochs have passed

    print(f'Epoch {epoch+1}/{EPOCHS} | Loss: {train_loss:.4f} | '
          f'Train Acc: {train_acc:.4f} | Val Acc: {val_acc:.4f}')

    # Save checkpoint only when validation accuracy improves
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), 'checkpoints/best_model.pt')
        print(f'  ✓ New best model saved (val_acc={val_acc:.4f})')

print(f'\nTraining complete. Best val accuracy: {best_val_acc:.4f}')