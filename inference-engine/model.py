"""
Model Architecture — SightX DRClassifier (V2)

ResNet-50 backbone with a multi-stage fully-connected classifier head, 
designed for clinical-grade retinal scan grading.
"""

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
        # multi-stage head with BatchNorm for gradient stability
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
        """Unlock early feature layers for deep fine-tuning."""
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
