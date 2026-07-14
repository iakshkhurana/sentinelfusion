#!/usr/bin/env python3
"""Print fusion-vs-baseline proof for every packaged scenario."""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps" / "api"
sys.path.insert(0, str(API))

from engine import replay  # noqa: E402

SCENARIOS = ROOT / "packages" / "scenarios"


def main() -> int:
    rows = []
    for path in sorted(SCENARIOS.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        m = replay(data)["metrics"]
        rows.append(
            (
                path.stem,
                m["fusion_first_critical_sec"],
                m["baseline_first_fire_sec"],
                m["lead_time_sec"],
                m["incident_at_sec"],
            )
        )

    print("| Scenario | Fusion | Baseline | Lead | Incident |")
    print("|----------|--------|----------|------|----------|")
    for sid, fusion, base, lead, inc in rows:
        b = "—" if base is None else f"@{base:g}s"
        print(f"| `{sid}` | @{fusion:g}s | {b} | +{lead:g}s | @{inc:g}s |")

    ok = all(f is not None and f < i and (b is None or f < b) for _, f, b, _, i in rows)
    print()
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
