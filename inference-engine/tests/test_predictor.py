"""
Predictor smoke test: loads the real model and weights on CPU and grades a
synthetic image with a few TTA passes.

    cd inference-engine && python -m unittest tests.test_predictor

Needs torch, torchvision, Pillow, numpy, scipy and checkpoints/best_model.pt.
It checks the response is well-formed and internally consistent, not that
the grade is clinically right (see evaluate.py for accuracy).
"""

import io
import os
import unittest

# Keep the test fast; must be set before predictor is imported
os.environ.setdefault('TTA_PASSES', '5')
os.environ.setdefault('TTA_BATCH_SIZE', '2')   # forces a partial last batch

from PIL import Image  # noqa: E402

import predictor  # noqa: E402
from clinical_postprocessor import TIER_LABELS  # noqa: E402


def fundus_like_png() -> bytes:
    """A dark image with a reddish disc, roughly the shape of a fundus photo."""
    image = Image.new('RGB', (512, 512), (10, 5, 5))
    disc = Image.new('RGB', (400, 400), (170, 60, 30))
    mask = Image.new('L', (400, 400), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, 399, 399), fill=255)
    image.paste(disc, (56, 56), mask)
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return buffer.getvalue()


class PredictorTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.result = predictor.predict(fundus_like_png())

    def test_tier_is_a_known_clinical_tier(self):
        self.assertIn(self.result['tier'], {t['name'] for t in TIER_LABELS.values()})

    def test_grade_probabilities_sum_to_one(self):
        self.assertAlmostEqual(sum(self.result['grade_probabilities'].values()), 1.0, places=2)

    def test_tier_probabilities_are_pooled_from_grade_probabilities(self):
        grades = self.result['grade_probabilities']
        tiers = self.result['tier_probabilities']
        self.assertAlmostEqual(tiers['no_disease'], grades['grade_0'], places=3)
        self.assertAlmostEqual(
            tiers['recommended'], grades['grade_1'] + grades['grade_2'] + grades['grade_3'], places=3)
        self.assertAlmostEqual(tiers['required'], grades['grade_4'], places=3)

    def test_confidence_and_timing_are_sane(self):
        self.assertGreaterEqual(self.result['confidence'], 0.0)
        self.assertLessEqual(self.result['confidence'], 1.0)
        self.assertGreater(self.result['inference_time_ms'], 0.0)

    def test_undecodable_bytes_raise_invalid_image(self):
        with self.assertRaises(predictor.InvalidImageError):
            predictor.predict(b'definitely not an image')


if __name__ == '__main__':
    unittest.main()
