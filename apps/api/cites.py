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


def search_knowledge(question: str, *, top_k: int = 3) -> dict:
    """Keyword recall over curated excerpts (vector store later)."""
    q = (question or "").strip().lower()
    if not q:
        return {"answer": "Ask about hot work, gas, confined space, or maintenance.", "citations": []}

    tokens = [t for t in q.replace("?", " ").split() if len(t) > 2]
    scored: list[tuple[int, str, dict]] = []
    for code, item in _corpus().items():
        blob = " ".join(
            [
                code,
                item.get("source", ""),
                item.get("section", ""),
                item.get("excerpt", ""),
                item.get("next_step", ""),
            ]
        ).lower()
        hit = sum(1 for t in tokens if t in blob)
        if hit:
            scored.append((hit, code, item))
    scored.sort(key=lambda x: (-x[0], x[1]))
    cites = [{"code": code, **item} for _, code, item in scored[: max(1, min(top_k, 5))]]
    if not cites:
        return {
            "answer": "No excerpt matched — try keywords like hot work, gas, confined, or maintenance.",
            "citations": [],
        }
    top = cites[0]
    answer = top.get("next_step") or top.get("excerpt") or "See citation."
    return {"answer": answer, "citations": cites}
