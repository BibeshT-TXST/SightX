# ──────────────────────────────────────────────────────────────────────────────
# Image pipelines for preprocessing and postprocessing — V2
# ──────────────────────────────────────────────────────────────────────────────
# V2 Changes (based on Kaggle winning solutions):
#   - 384×384 resolution (up from 224) — more detail for the model
#   - 360° rotation (up from ±10°) — retinas can be imaged at any angle
#   - Added vertical flip, stronger color jitter, GaussianBlur, RandomErasing
#   - RandomResizedCrop instead of plain Resize for scale invariance
# ──────────────────────────────────────────────────────────────────────────────

import logging
from torchvision import transforms
from PIL import Image
import torch

# ImageNet statistics (required for ResNet50 pre-trained weights)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# V2 image resolution — competition winners used 384–1024px
# 384 is the sweet spot: significant detail improvement vs 224, but still
# trainable on M4 in reasonable time (~25-30 min/epoch)
IMG_SIZE = 384

# ── Training Transforms (V2: Aggressive Augmentation) ────────────────────────
# Kaggle winners used full 360° rotation, heavy color jitter, and random 
# cropping. This forces the model to generalize instead of memorizing.
# V1 overfitted after Epoch 7 — strong augmentation directly fights this.

train_transforms = transforms.Compose([
    # Scale-aware cropping: randomly zoom into 85-100% of the image
    # This teaches the model to recognize features at different scales
    transforms.RandomResizedCrop(IMG_SIZE, scale=(0.85, 1.0)),
    
    # Full 360° rotation — retinal images can be taken at any angle
    # V1 used only ±10°, which was too conservative
    transforms.RandomRotation(360),
    
    # Both flips — retinas from left/right eyes are mirror images
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    
    # Stronger color jitter to simulate different fundus cameras
    # Added saturation and hue channels vs V1 (which only had brightness/contrast)
    transforms.ColorJitter(
        brightness=0.3,
        contrast=0.3,
        saturation=0.2,
        hue=0.1
    ),
    
    # Slight blur with 30% probability — simulates camera focus variation
    transforms.RandomApply([
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 1.0))
    ], p=0.3),
    
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    
    # Random Erasing (Cutout-style) — masks a random patch of the image
    # Forces the model to not rely on any single region of the retina
    transforms.RandomErasing(p=0.2, scale=(0.02, 0.1)),
])

# ── Inference Transforms (V2: Matched Resolution) ────────────────────────────
# Deterministic — no randomness during evaluation/inference
# Resolution must match training resolution (384px)
inference_transforms = transforms.Compose([
    transforms.Resize(int(IMG_SIZE * 1.15)),  # Scale shorter edge to ~442px
    transforms.CenterCrop(IMG_SIZE),          # Center crop to 384×384
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
])


# ── Inference Preprocessing Function ─────────────────────────────────────────
def preprocess_image(image_path: str) -> torch.Tensor:
    """Load and preprocess a single image for inference."""
    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        logging.error(f"Error loading image {image_path}: {e}")
        raise e

    tensor = inference_transforms(img)
    return tensor.unsqueeze(0)  # Add batch dimension