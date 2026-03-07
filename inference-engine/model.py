# ──────────────────────────────────────────────────────────────────────────────
# Model Architecture — V2
# ──────────────────────────────────────────────────────────────────────────────
# V2 Changes:
#   - Deeper classifier head: 2048 → 512 → 128 → 5 (was 2048 → 512 → 5)
#   - Added BatchNorm for training stability
#   - Added gradual unfreezing support (unfreeze_layer3 method)
#   - Slightly reduced dropout (0.4 vs 0.5) since V2 has stronger augmentation
# ──────────────────────────────────────────────────────────────────────────────

import torch
import torch.nn as nn
from torchvision import models


class DRClassifier(nn.Module):
    """ResNet50 backbone with a custom FC head for DR grading (V2)."""

    def __init__(self, num_classes=5, freeze_backbone=True):
        super(DRClassifier, self).__init__()

        # Load ResNet50 with pre-trained ImageNet weights
        self.backbone = models.resnet50(weights='IMAGENET1K_V1')

        # Freeze backbone layers (preserve learned features)
        if freeze_backbone:
            for param in self.backbone.parameters():
                param.requires_grad = False

        # Unfreeze the final residual block (layer4) for fine-tuning
        # This allows the model to adapt its deepest features to retinal images
        for param in self.backbone.layer4.parameters():
            param.requires_grad = True

        # ── V2 Classifier Head ────────────────────────────────────────────
        # Deeper head with BatchNorm for training stability.
        # V1 had: Linear(2048→512) → ReLU → Dropout(0.5) → Linear(512→5)
        # V2 has: Linear(2048→512) → BN → ReLU → Drop(0.4)
        #       → Linear(512→128)  → BN → ReLU → Drop(0.3)
        #       → Linear(128→5)
        #
        # BatchNorm normalizes activations between layers, which stabilizes
        # gradients and lets us use a slightly higher learning rate.
        # The extra hidden layer gives more capacity to separate 5 grades.
        in_features = self.backbone.fc.in_features  # 2048
        self.backbone.fc = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(0.4),
            nn.Linear(512, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.backbone(x)

    def get_probabilities(self, x):
        """Return softmax probabilities (confidence scores for each grade)."""
        logits = self.forward(x)
        return torch.softmax(logits, dim=1)

    def unfreeze_layer3(self):
        """
        Gradual unfreezing: unlock layer3 for fine-tuning.
        
        Call this after a few epochs of training. Initially only layer4 + head
        are trainable. Unfreezing layer3 lets the model adapt earlier features
        to retinal images, but only after the head and layer4 have stabilized.
        
        This technique prevents early overfitting while allowing deeper 
        fine-tuning later when the model needs it.
        """
        for param in self.backbone.layer3.parameters():
            param.requires_grad = True
        print("  → Layer 3 unfrozen for fine-tuning")

    def get_trainable_summary(self):
        """Print a summary of trainable vs total parameters."""
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        pct = trainable / total * 100
        print(f"  Parameters: {trainable:,} trainable / {total:,} total ({pct:.1f}%)")
        return trainable, total
