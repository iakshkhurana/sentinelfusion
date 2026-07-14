"""Vision agent — camera / CV side signals (PPE, intrusion, hotspot). Stub for demo."""

from __future__ import annotations

_LABELS = {
    "hotspot_adjacent": "Camera sees thermal/spark activity near gas interface",
    "zone_intrusion": "Unauthorized personnel in restricted zone",
    "ppe_missing": "PPE non-compliance detected at workface",
}


def evaluate(detections: dict[str, dict]) -> dict:
    facts = []
    for det in detections.values():
        signal = det.get("signal")
        label = _LABELS.get(signal)
        if not label:
            continue
        conf = float(det.get("confidence") or 0.0)
        if conf < 0.5:
            continue
        facts.append({"code": f"cv_{signal}", "label": label, "confidence": conf})
    return {
        "agent": "vision",
        "facts": facts,
        "detection_ids": list(detections.keys()),
    }
