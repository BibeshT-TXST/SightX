# This file defines the architecture of the model used for inference-engine.
import torch
import torch.nn as nn
from torchvision import models

class DRClassifier(nn.Module):
    """ResNet50 backbone with a custom FC head for DR grading."""
 