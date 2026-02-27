"""Name normalization utilities for consistent KOL identity resolution.

Ensures variant spellings (accents, credentials, initials) collapse to
a single canonical form so discovered_authors rows aggregate correctly.
"""
import re
import unicodedata

# Credentials / suffixes to strip (order doesn't matter — matched as whole words)
_SUFFIXES = re.compile(
    r"\b("
    r"MD|M\.D\.|DO|D\.O\.|PhD|Ph\.D\.|PharmD|Pharm\.D\.|DPM|D\.P\.M\."
    r"|FAAN|FANA|FACP|FACR|FACS|FASN|FCCP"
    r"|MPH|M\.P\.H\.|MBA|M\.B\.A\.|MS|M\.S\.|MA|M\.A\.|RN|R\.N\."
    r"|Jr|Jr\.|Sr|Sr\.|II|III|IV"
    r")\b\.?",
    re.IGNORECASE,
)

_MULTI_SPACE = re.compile(r"\s+")


def normalize_name(name: str) -> str:
    """Normalize a single name part (first or last) for identity matching.

    Transforms applied in order:
    1. Strip credentials / suffixes (MD, PhD, Jr, etc.)
    2. Unicode → ASCII (é→e, ñ→n)
    3. Lowercase
    4. Strip periods (J. → J)
    5. Collapse whitespace and strip
    """
    if not name:
        return ""

    # 1. Strip credentials/suffixes
    text = _SUFFIXES.sub("", name)

    # 2. Unicode NFKD decomposition → drop combining marks (accents)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))

    # 3. Lowercase
    text = text.lower()

    # 4. Strip periods
    text = text.replace(".", "")

    # 5. Collapse whitespace + strip
    text = _MULTI_SPACE.sub(" ", text).strip()

    return text


def parse_full_name(full_name: str) -> tuple[str, str]:
    """Split a single full-name string into (first_name, last_name).

    Handles formats from ClinicalTrials.gov and similar sources:
    - "Miriam Freimer, MD"  → ("Miriam", "Freimer")
    - "John A. Smith"       → ("John A.", "Smith")
    - "Smith"               → ("", "Smith")
    """
    if not full_name:
        return ("", "")

    # Strip credentials after comma
    name_part = full_name.split(",")[0].strip()

    parts = name_part.split()
    if len(parts) == 0:
        return ("", "")
    if len(parts) == 1:
        return ("", parts[0])

    # Last token is last name, everything else is first name
    return (" ".join(parts[:-1]), parts[-1])
