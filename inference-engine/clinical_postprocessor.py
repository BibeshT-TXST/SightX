# ── clinical_postprocessor.py ──

import numpy as np

# Training distribution from trainLabels.csv (35,126 total images)
# These are the implicit priors baked into the model's softmax outputs.
# Grade:    0        1       2       3      4
TRAIN_COUNTS = np.array([25810, 2443, 5292, 873, 708])

TRAIN_PRIORS = TRAIN_COUNTS / TRAIN_COUNTS.sum()
# → [0.7348, 0.0696, 0.1506, 0.0249, 0.0202]

# Uniform prior: treats all 5 grades as equally likely.
# This is the simplest correction — it just removes the training bias.
UNIFORM_PRIOR = np.ones(5) / 5
# → [0.20, 0.20, 0.20, 0.20, 0.20]

# Clinical prior: based on real-world DR prevalence in screened populations.
# Source: Yau et al., "Global Prevalence of DR" (Diabetes Care, 2012)
#   ~65% No DR, ~15% Mild, ~10% Moderate, ~5% Severe, ~5% Proliferative
# This is more realistic than uniform — it reflects the population a screening
# tool would actually see, without the extreme skew of EyePACS.
CLINICAL_PRIOR = np.array([0.65, 0.15, 0.10, 0.05, 0.05])


def bayesian_prior_correction(softmax_probs: np.ndarray,
                               desired_prior: np.ndarray = None
                               ) -> np.ndarray:
    """
    Apply Bayes' theorem to correct for training set class imbalance.

    The model's softmax outputs implicitly encode the training distribution.
    This function "divides out" those priors and optionally substitutes a
    different prior (uniform, clinical, etc.).

    Parameters
    ----------
    softmax_probs : np.ndarray, shape (5,)
        Raw softmax probabilities from the model [P(g0), P(g1), ..., P(g4)]
    desired_prior : np.ndarray, shape (5,), optional
        The prior distribution to substitute. Defaults to UNIFORM_PRIOR.

    Returns
    -------
    np.ndarray, shape (5,)
        Corrected probabilities that sum to 1.

    Example
    -------
    Raw model output for a Grade 2 image might be:
        [0.30, 0.35, 0.20, 0.10, 0.05]  ← biased toward Grade 0

    After correction with uniform prior:
        [0.04, 0.50, 0.13, 0.40, 0.25]  ← Grade 0 dramatically reduced
                                           because it was overrepresented
    """
    if desired_prior is None:
        desired_prior = UNIFORM_PRIOR

    # Core Bayesian correction:
    #   P_corrected(c) = P_model(c) × P_desired(c) / P_train(c)
    #
    # Dividing by the training prior "undoes" the model's learned bias.
    # Multiplying by the desired prior lets us choose what distribution
    # we want the output to reflect.
    corrected = softmax_probs * desired_prior / TRAIN_PRIORS

    # Re-normalize so probabilities sum to 1
    corrected /= corrected.sum()

    return corrected


# ──────────────────────────────────────────────────────────────────────────────
# Clinical Tier Definitions
# ──────────────────────────────────────────────────────────────────────────────
# Reclassify the 5 DR grades into 3 clinically actionable tiers.

TIER_LABELS = {
    0: {'name': 'No Disease',                'emoji': '🟢', 'action': 'No follow-up needed'},
    1: {'name': 'Doctor Visit Recommended',  'emoji': '🟡', 'action': 'Schedule ophthalmology appointment'},
    2: {'name': 'Doctor Visit Required',     'emoji': '🔴', 'action': 'Urgent referral to specialist'},
}

# Which model grades map to which clinical tier
GRADE_TO_TIER = {0: 0, 1: 1, 2: 1, 3: 1, 4: 2}

# Asymmetric cost matrix: rows = true tier, cols = predicted tier
# Key insight: missing disease (predicting "No Disease" for a sick patient)
# is FAR more costly than over-referring (predicting "Required" for a healthy one).
COST_MATRIX = np.array([
    # Pred:  No Disease  Recommended  Required
    [0.0,       1.0,         2.0],     # True: No Disease
    [10.0,      0.0,         1.0],     # True: Recommended (Grades 1-3)
    [50.0,      5.0,         0.0],     # True: Required    (Grade 4)
])


def aggregate_to_tiers(grade_probs: np.ndarray) -> np.ndarray:
    """
    Convert 5-grade probabilities into 3-tier probabilities by summing.

    Parameters
    ----------
    grade_probs : np.ndarray, shape (5,)
        Probabilities for each grade [P(g0), P(g1), P(g2), P(g3), P(g4)]

    Returns
    -------
    np.ndarray, shape (3,)
        Tier probabilities [P(No Disease), P(Recommended), P(Required)]

    Example
    -------
    >>> aggregate_to_tiers([0.10, 0.30, 0.25, 0.20, 0.15])
    [0.10, 0.75, 0.15]
    #         ↑ Grades 1+2+3 pool together = strong "Recommended" signal
    """
    return np.array([
        grade_probs[0],                                       # Tier 0: Grade 0
        grade_probs[1] + grade_probs[2] + grade_probs[3],     # Tier 1: Grades 1+2+3
        grade_probs[4],                                       # Tier 2: Grade 4
    ])


def risk_minimized_decision(tier_probs: np.ndarray,
                            cost_matrix: np.ndarray = COST_MATRIX
                            ) -> tuple:
    """
    Choose the tier that minimizes expected clinical cost.

    Instead of argmax (which treats all errors as equally bad), this
    uses Bayesian decision theory to pick the tier whose expected cost
    is lowest.  This naturally biases toward "safe" over-prediction.

    Parameters
    ----------
    tier_probs : np.ndarray, shape (3,)
        Probabilities [P(No Disease), P(Recommended), P(Required)]
    cost_matrix : np.ndarray, shape (3, 3)
        Cost of each (true_tier, predicted_tier) pair.

    Returns
    -------
    tuple of (predicted_tier: int, expected_costs: np.ndarray)

    Theory
    ------
    For each possible prediction `d`, the expected cost is:
        E[cost | predict d] = Σ_t  P(true=t) × C(t, d)

    We pick `d` = argmin of expected costs.
    """
    # expected_cost[d] = Σ_t  tier_probs[t] × cost_matrix[t, d]
    expected_costs = tier_probs @ cost_matrix   # shape (3,)
    predicted_tier = int(np.argmin(expected_costs))
    return predicted_tier, expected_costs


# ──────────────────────────────────────────────────────────────────────────────
# Full Classification Pipeline
# ──────────────────────────────────────────────────────────────────────────────

# Default temperature — replace with the value found by calibrate_temperature.py
OPTIMAL_TEMPERATURE = 0.4232

# Lazy import to avoid hard dependency at module level
_apply_temperature = None

def _get_apply_temperature():
    """Lazy-load temperature_calibration to avoid circular imports."""
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
    Full clinical classification pipeline.

    Takes raw model logits and returns a clinical tier with calibrated
    confidence, applying all three post-processing strategies:
        1. Temperature scaling  (calibrate probabilities)
        2. Bayesian prior correction  (remove training bias)
        3. Tier aggregation + risk-minimized decision

    Parameters
    ----------
    logits : np.ndarray, shape (5,)
        Raw model outputs BEFORE softmax.
    temperature : float, optional
        Calibration temperature.  Defaults to OPTIMAL_TEMPERATURE.
    prior_mode : str
        Which prior to use: 'uniform', 'clinical', or 'raw'.

    Returns
    -------
    dict with keys:
        tier, tier_label, tier_emoji, action, confidence,
        grade_probs, tier_probs, expected_costs, raw_grade
    """
    if temperature is None:
        temperature = OPTIMAL_TEMPERATURE

    apply_temp = _get_apply_temperature()

    # Step 1: Temperature-calibrated softmax
    calibrated_probs = apply_temp(logits, temperature)

    # Step 2: Bayesian prior correction
    if prior_mode == 'uniform':
        corrected_probs = bayesian_prior_correction(calibrated_probs, UNIFORM_PRIOR)
    elif prior_mode == 'clinical':
        corrected_probs = bayesian_prior_correction(calibrated_probs, CLINICAL_PRIOR)
    else:
        corrected_probs = calibrated_probs

    # Step 3: Aggregate to clinical tiers
    tier_probs = aggregate_to_tiers(corrected_probs)

    # Step 4: Risk-minimized decision
    tier, expected_costs = risk_minimized_decision(tier_probs)

    # Confidence: how much better the chosen tier is vs. the worst option
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
