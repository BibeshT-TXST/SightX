# ── temperature_calibration.py ──

import numpy as np
from scipy.optimize import minimize_scalar


def apply_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    """
    Apply temperature scaling to raw logits before softmax.

    Temperature scaling is the simplest and most effective post-hoc
    calibration method. It has ONE parameter (T) and preserves the
    model's accuracy (same argmax) while improving probability estimates.

    Parameters
    ----------
    logits : np.ndarray, shape (5,)
        Raw model outputs BEFORE softmax. These are the values from
        model(tensor) before torch.softmax() is applied.
    temperature : float
        The temperature parameter. Must be positive.
        - T > 1: softer, less confident probabilities
        - T < 1: sharper, more confident probabilities
        - T = 1: no change

    Returns
    -------
    np.ndarray, shape (5,)
        Calibrated softmax probabilities.
    """
    scaled = logits / temperature
    # Numerical stability: subtract max before softmax
    exp_scaled = np.exp(scaled - np.max(scaled))
    return exp_scaled / exp_scaled.sum()


def find_optimal_temperature(all_logits: np.ndarray,
                              all_labels: np.ndarray) -> float:
    """
    Find the temperature T that minimizes NLL on a calibration set.

    This is how you "train" the temperature parameter. Run this ONCE
    on your validation set, save the resulting T, and use it at
    inference time.

    Parameters
    ----------
    all_logits : np.ndarray, shape (N, 5)
        Raw logits for N calibration images.
    all_labels : np.ndarray, shape (N,)
        True grade labels (0-4) for each image.

    Returns
    -------
    float
        The optimal temperature value.

    Usage
    -----
    # Run once to find T:
    T = find_optimal_temperature(val_logits, val_labels)
    print(f"Optimal temperature: {T:.3f}")
    # Save T and use in production inference
    """

    def nll_loss(T):
        """Negative log-likelihood at temperature T."""
        total_nll = 0.0
        for logits, label in zip(all_logits, all_labels):
            probs = apply_temperature(logits, T)
            # Clip to avoid log(0)
            total_nll -= np.log(max(probs[label], 1e-10))
        return total_nll / len(all_labels)

    # Search for T in [0.1, 10.0]
    result = minimize_scalar(nll_loss, bounds=(0.1, 10.0), method='bounded')
    return result.x
