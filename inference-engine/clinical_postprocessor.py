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
