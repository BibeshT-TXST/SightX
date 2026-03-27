"""
Clinical Post-Processor — SightX

Applies Bayesian prior correction, temperature scaling, and risk-minimized 
decision theory to raw model logits for clinical-grade diagnostics.
"""

import numpy as np

# Training distribution (EyePACS dataset) used for Bayesian correction
TRAIN_COUNTS = np.array([25810, 2443, 5292, 873, 708])
TRAIN_PRIORS = TRAIN_COUNTS / TRAIN_COUNTS.sum()

# Clinical prior: Reflects real-world DR prevalence in screened populations
# Ref: Yau et al., "Global Prevalence of DR" (Diabetes Care, 2012)
CLINICAL_PRIOR = np.array([0.65, 0.15, 0.10, 0.05, 0.05])
UNIFORM_PRIOR = np.ones(5) / 5


def bayesian_prior_correction(softmax_probs: np.ndarray, desired_prior: np.ndarray = None) -> np.ndarray:
    """Correct for training set class imbalance using Bayes' theorem."""
    if desired_prior is None:
        desired_prior = UNIFORM_PRIOR

    # P_corrected(c) = P_model(c) × P_desired(c) / P_train(c)
    corrected = softmax_probs * desired_prior / TRAIN_PRIORS
    corrected /= corrected.sum()

    return corrected


# ──────────────────────────────────────────────────────────────────────────────
# Clinical Tier Definitions
# ──────────────────────────────────────────────────────────────────────────────

TIER_LABELS = {
    0: {'name': 'Doctor Visit Optional',  'emoji': '🟢', 'action': 'Optional follow-up depending on patient history'},
    1: {'name': 'Doctor Visit Required',  'emoji': '🟡', 'action': 'Schedule ophthalmology appointment'},
    2: {'name': 'Doctor Visit Mandatory', 'emoji': '🔴', 'action': 'Urgent referral to specialist'},
}

# Mapping DR grades (0-4) to actionable clinical tiers
GRADE_TO_TIER = {0: 0, 1: 1, 2: 1, 3: 1, 4: 2}

# Asymmetric cost matrix: Prioritizes clinical safety by penalizing false negatives
COST_MATRIX = np.array([
    # Pred:  Optional  Required    Mandatory
    [0.0,       1.0,         2.0],     # True: Optional
    [10.0,      0.0,         1.0],     # True: Required
    [50.0,      5.0,         0.0],     # True: Mandatory
])


def aggregate_to_tiers(grade_probs: np.ndarray) -> np.ndarray:
    """Pool 5-grade probabilities into 3 clinically actionable tiers."""
    return np.array([
        grade_probs[0],                                       # Tier 0: Grade 0
        grade_probs[1] + grade_probs[2] + grade_probs[3],     # Tier 1: Grades 1+2+3
        grade_probs[4],                                       # Tier 2: Grade 4
    ])


def risk_minimized_decision(tier_probs: np.ndarray, cost_matrix: np.ndarray = COST_MATRIX) -> tuple:
    """Choose the clinical tier that minimizes expected systemic risk."""
    expected_costs = tier_probs @ cost_matrix   # shape (3,)
    predicted_tier = int(np.argmin(expected_costs))
    return predicted_tier, expected_costs


# ──────────────────────────────────────────────────────────────────────────────
# Full Classification Pipeline
# ──────────────────────────────────────────────────────────────────────────────

# Optimal temperature found via expected calibration error (ECE) minimization
OPTIMAL_TEMPERATURE = 0.4232
_apply_temperature = None

def _get_apply_temperature():
    """Lazy-load temperature_calibration for optimal performance."""
    global _apply_temperature
    if _apply_temperature is None:
        from temperature_calibration import apply_temperature
        _apply_temperature = apply_temperature
    return _apply_temperature


def classify_clinical_tier(logits: np.ndarray,
                           temperature: float = None,
                           prior_mode: str = 'clinical'
                           ) -> dict:
    """
    Orchestrates the clinical grading pipeline (Calibration → Bayesian → Risk).
    """
    if temperature is None:
        temperature = OPTIMAL_TEMPERATURE

    apply_temp = _get_apply_temperature()

    # 1. Temperature-calibrated softmax
    calibrated_probs = apply_temp(logits, temperature)

    # 2. Bayesian prior correction
    if prior_mode == 'uniform':
        corrected_probs = bayesian_prior_correction(calibrated_probs, UNIFORM_PRIOR)
    elif prior_mode == 'clinical':
        corrected_probs = bayesian_prior_correction(calibrated_probs, CLINICAL_PRIOR)
    else:
        corrected_probs = calibrated_probs

    # 3. Aggregate to clinical tiers
    tier_probs = aggregate_to_tiers(corrected_probs)

    # 4. Risk-minimized decision
    tier, expected_costs = risk_minimized_decision(tier_probs)

    # Calculate systemic confidence score
    max_cost = max(expected_costs)
    min_cost = min(expected_costs)
    confidence = 1.0 - (min_cost / max_cost) if max_cost > 0 else 1.0

    return {
        'tier': int(tier),
        'tier_label': TIER_LABELS[tier]['name'],
        'tier_emoji': TIER_LABELS[tier]['emoji'],
        'action': TIER_LABELS[tier]['action'],
        'confidence': round(float(confidence), 4),
        'grade_probs': [round(float(p), 4) for p in corrected_probs],
        'tier_probs': [round(float(p), 4) for p in tier_probs],
        'expected_costs': [round(float(c), 2) for c in expected_costs],
        'raw_grade': int(np.argmax(calibrated_probs)),
    }
