"""Thin knowledge grounding — curated excerpts by factor code (upgrade to vectors later)."""

from __future__ import annotations

# ponytail: static corpus for demo citations; swap for pgvector RAG when corpus grows
_CORPUS = {
    "gas_elevated": {
        "source": "OISD-STD-116 (illustrative excerpt)",
        "section": "Gas detection & response",
        "excerpt": "Sustained flammable/toxic gas accumulation shall trigger restricted work controls in adjacent areas until readings normalize and a competent person clears the zone.",
    },
    "hot_work_adjacent": {
        "source": "Factory Act / PTW good practice (illustrative)",
        "section": "Hot work SIMOPS",
        "excerpt": "Hot work shall not proceed where flammable atmospheres may be present or where adjacent process upsets create ignition risk; permits must be suspended pending gas clearance.",
    },
    "confined_space_entry": {
        "source": "OISD confined space guidance (illustrative)",
        "section": "Entry conditions",
        "excerpt": "Confined-space entry requires continuous monitoring of atmosphere and immediate abort if process deviations (pressure, toxins) develop near the entry point.",
    },
    "abnormal_atmosphere": {
        "source": "Industrial hygiene practice (illustrative)",
        "section": "Abnormal process conditions",
        "excerpt": "Abnormal pressure or toxic readings adjacent to manned entry shall be treated as an unsafe atmosphere until independently verified safe.",
    },
    "maint_on_gas_path": {
        "source": "OISD maintenance on live systems (illustrative)",
        "section": "Gas path isolation",
        "excerpt": "Maintenance on gas-handling equipment requires isolation integrity and elevated detector vigilance; rising readings mandate stop-work and re-isolation checks.",
    },
}


def citations_for(factor_codes: list[str]) -> list[dict]:
    out = []
    seen = set()
    for code in factor_codes:
        item = _CORPUS.get(code)
        if not item or code in seen:
            continue
        seen.add(code)
        out.append({"code": code, **item})
    return out
