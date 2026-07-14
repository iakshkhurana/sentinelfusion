#!/usr/bin/env bash
# Smoke: health + scenario eval harness. Run from repo root.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== API health (optional; ignore if not running) =="
curl -sf http://127.0.0.1:8000/api/v1/health && echo || echo "API not up (ok for offline pytest)"

echo "== pytest scenario eval =="
(cd apps/api && python -m pytest -q)

echo "== eval report =="
python scripts/eval_report.py
echo "verify ok"
