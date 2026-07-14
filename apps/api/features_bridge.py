"""Import shared ML feature extractors from apps/ml."""

from __future__ import annotations

import sys
from pathlib import Path

_ML = Path(__file__).resolve().parents[1] / "ml"
if str(_ML) not in sys.path:
    sys.path.insert(0, str(_ML))

from features import FEATURE_NAMES, extract_features, vectorize  # noqa: E402

__all__ = ["FEATURE_NAMES", "extract_features", "vectorize"]
