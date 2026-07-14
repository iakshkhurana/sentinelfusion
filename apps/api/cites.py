"""Thin knowledge grounding — load curated excerpts (upgrade to vectors later)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_CORPUS_PATH = Path(__file__).resolve().parents[2] / "packages" / "knowledge" / "excerpts.json"


@lru_cache(maxsize=1)
def _corpus() -> dict:
    if not _CORPUS_PATH.is_file():
        return {}
    return json.loads(_CORPUS_PATH.read_text(encoding="utf-8"))


def citations_for(factor_codes: list[str]) -> list[dict]:
    corpus = _corpus()
    out = []
    seen = set()
    for code in factor_codes:
        item = corpus.get(code)
        if not item or code in seen:
            continue
        seen.add(code)
        out.append({"code": code, **item})
    return out
