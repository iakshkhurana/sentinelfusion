# Smoke: health + scenario eval harness. Run from repo root.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "== API health (optional; ignore if not running) =="
try {
  $h = Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
  Write-Host ($h | ConvertTo-Json -Compress)
} catch {
  Write-Host "API not up (ok for offline pytest)"
}

Write-Host "== pytest scenario eval =="
Push-Location apps/api
python -m pytest -q
Pop-Location

Write-Host "== web vitest =="
Push-Location apps/web
npm test
Pop-Location

Write-Host "== eval report =="
python scripts/eval_report.py
Write-Host "verify ok"
