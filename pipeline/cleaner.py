import re
from typing import Tuple

def normalize_text(text: str) -> str:
    """
    Deterministically normalizes whitespace and punctuation spacing.
    - Strips leading and trailing spaces
    - Collapses multiple whitespace characters to single spaces
    - Normalizes spacing before punctuation (e.g. ' , ' -> ', ')
    - Standardizes bracket spacing (e.g. 'Engineering(Computer)' -> 'Engineering (Computer)')
    """
    if not isinstance(text, str):
        return ""
    # Strip & collapse multiple spaces
    cleaned = re.sub(r'\s+', ' ', text).strip()
    # Normalize space before comma, colon, semicolon
    cleaned = re.sub(r'\s+([,;:?.])', r'\1', cleaned)
    # Ensure space after comma if missing
    cleaned = re.sub(r',([^\s])', r', \1', cleaned)
    # Ensure space before opening parenthesis if preceded by alphanumeric character
    cleaned = re.sub(r'([a-zA-Z0-9])\(', r'\1 (', cleaned)
    # Remove space inside parentheses
    cleaned = re.sub(r'\(\s+', '(', cleaned)
    cleaned = re.sub(r'\s+\)', ')', cleaned)
    return cleaned

def slugify(text: str) -> str:
    """
    Generates deterministic URL-safe slug from string.
    """
    slug = text.lower().strip()
    slug = re.sub(r'[\s/()_,\.\-]+', '-', slug)
    slug = re.sub(r'[^a-z0-9\-]', '', slug)
    return slug.strip('-')[:250]
