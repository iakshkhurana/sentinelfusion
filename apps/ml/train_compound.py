"""Train the compound-risk classifier on synthetic industrial state vectors."""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from features import FEATURE_NAMES, vectorize  # noqa: E402

ARTIFACT_DIR = ROOT / "artifacts"
SEED = 42


def _label(row: dict[str, float]) -> int:
    if row["hot_work_adjacent_gas"] >= 1 and row["co_elevated"] >= 1:
        return 1
    if row["confined_abnormal"] >= 1:
        return 1
    if row["maint_gas_path"] >= 1 and row["co_elevated"] >= 1:
        return 1
    # near-miss noise: elevated alone is not compound-critical
    return 0


def synthesize(n: int = 8000) -> tuple[np.ndarray, np.ndarray]:
    rng = random.Random(SEED)
    X, y = [], []
    for _ in range(n):
        co = rng.uniform(0, 160)
        pressure = rng.uniform(10, 26)
        h2s = rng.uniform(0, 20)
        hot = 1.0 if rng.random() < 0.35 else 0.0
        confined = 1.0 if rng.random() < 0.25 else 0.0
        maint = 1.0 if rng.random() < 0.3 else 0.0
        co_elev = 1.0 if co >= 50 else 0.0
        p_abn = 1.0 if pressure >= 18 else 0.0
        # adjacency / compound flags with controlled correlations
        hot_adj = 1.0 if hot and co_elev and rng.random() < 0.55 else 0.0
        conf_abn = 1.0 if confined and (p_abn or h2s >= 5) and rng.random() < 0.6 else 0.0
        maint_path = 1.0 if maint and co_elev and rng.random() < 0.5 else 0.0
        row = {
            "co_max": co,
            "co_elevated": co_elev,
            "pressure_max": pressure,
            "pressure_abnormal": p_abn,
            "h2s_max": h2s,
            "hot_work_active": hot,
            "hot_work_adjacent_gas": hot_adj,
            "confined_active": confined,
            "confined_abnormal": conf_abn,
            "maint_active": maint,
            "maint_gas_path": maint_path,
            "active_permit_count": float(int(hot + confined + (1 if rng.random() < 0.2 else 0))),
        }
        label = _label(row)
        # light noise so metrics aren't a fake-perfect 1.0 on synthetic data
        if rng.random() < 0.02:
            label = 1 - label
        X.append(vectorize(row))
        y.append(label)
    return np.asarray(X, dtype=float), np.asarray(y, dtype=int)



def main() -> None:
    X, y = synthesize()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )
    # HistGradientBoosting: strong tabular baseline, no native compile pain
    clf = HistGradientBoostingClassifier(
        max_depth=6,
        learning_rate=0.08,
        max_iter=200,
        random_state=SEED,
    )
    clf.fit(X_train, y_train)
    proba = clf.predict_proba(X_test)[:, 1]
    pred = (proba >= 0.5).astype(int)
    auc = float(roc_auc_score(y_test, proba))
    report = classification_report(y_test, pred, output_dict=True)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = ARTIFACT_DIR / "compound_risk.joblib"
    joblib.dump({"model": clf, "feature_names": FEATURE_NAMES}, model_path)
    metrics = {
        "roc_auc": auc,
        "precision_critical": report["1"]["precision"],
        "recall_critical": report["1"]["recall"],
        "f1_critical": report["1"]["f1-score"],
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "positive_rate": float(y.mean()),
        "model": "HistGradientBoostingClassifier",
    }
    (ARTIFACT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))
    print(f"wrote {model_path}")


if __name__ == "__main__":
    main()
