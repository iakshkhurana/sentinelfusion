"""Load the trained compound-risk model and score live feature vectors."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import joblib

# apps/api/scorer.py -> repo apps/ml/artifacts
_MODEL_PATH = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "compound_risk.joblib"


@lru_cache(maxsize=1)
def _bundle() -> dict | None:
    if not _MODEL_PATH.is_file():
        return None
    return joblib.load(_MODEL_PATH)


def model_ready() -> bool:
    return _bundle() is not None


def score_features(feature_vector: list[float]) -> dict:
    """Return model probability + top contributing feature names (approx)."""
    bundle = _bundle()
    if bundle is None:
        # ponytail: offline fallback until artifact trained
        return {"model_score": None, "model_available": False, "top_features": []}

    model = bundle["model"]
    names = bundle["feature_names"]
    proba = float(model.predict_proba([feature_vector])[0][1])

    # HistGradientBoosting has no feature_importances_; use magnitude heuristic on active flags
    paired = sorted(
        zip(names, feature_vector, strict=True),
        key=lambda x: abs(x[1]),
        reverse=True,
    )
    top = [n for n, v in paired if v > 0][:4]
    return {"model_score": proba, "model_available": True, "top_features": top}
