"""
Inference & Augmentation Pipelines — SightX

Handles image normalization, training-time augmentation, and 
Test-Time Augmentation (TTA) for robust retinal diagnostics.
"""

import logging
from torchvision import transforms
from PIL import Image
import torch

# Clinical-grade image resolution and ImageNet normalization tokens
IMAGENET_MEAN, IMAGENET_STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
IMG_SIZE = 384

# ── Training Transforms: Aggressive augmentation for generalization ──

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

# ── Inference Transforms: Deterministic evaluation ──
inference_transforms = transforms.Compose([
    transforms.Resize(int(IMG_SIZE * 1.15)),  
    transforms.CenterCrop(IMG_SIZE),          
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)
])

# ── TTA Transforms: Stochastic perturbation for robust ensembles ──
tta_transforms = transforms.Compose([
    transforms.Resize(int(IMG_SIZE * 1.15)),
    transforms.RandomCrop(IMG_SIZE),          # Randomly crop instead of CenterCrop
    transforms.RandomHorizontalFlip(p=0.5),   # Mirror image (left/right eyes)
    transforms.RandomVerticalFlip(p=0.5),     # Mirror image
    transforms.RandomRotation(15),            # Slight ±15° rotation
    transforms.ColorJitter(brightness=0.1, contrast=0.1), # Minor color shifts
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