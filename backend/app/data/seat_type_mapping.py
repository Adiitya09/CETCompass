from typing import Dict, Tuple

SEAT_METADATA: Dict[str, Tuple[str, str, str, str]] = {
    # code: (category, quota_scope, gender, description)
    "AI": ("All India", "All India", "General", "All India Merit Quota"),
    "EWS": ("EWS", "State Level", "General", "Economically Weaker Section"),
    "TFWS": ("TFWS", "State Level", "General", "Tuition Fee Waiver Scheme"),
    "ORPHAN": ("Orphan", "State Level", "General", "Orphan Quota"),
    "MI": ("Minority", "State Level", "General", "Minority Quota"),
    "MI-MH": ("Minority", "Maharashtra", "General", "Maharashtra Minority Quota"),
    "MI-AI": ("Minority", "All India", "General", "All India Minority Quota"),
}

def parse_seat_type(code: str) -> Tuple[str, str, str, str]:
    """
    Returns (category, quota_scope, gender, description) for any MHT-CET seat type code.
    """
    if code in SEAT_METADATA:
        return SEAT_METADATA[code]
    
    # Check special prefixes
    if code.startswith("PWD"):
        rest = code[3:]
        scope = "State Level"
        if rest.endswith("H"):
            scope = "Home University"
            rest = rest[:-1]
        elif rest.endswith("O"):
            scope = "Other than Home University"
            rest = rest[:-1]
        elif rest.endswith("S"):
            scope = "State Level"
            rest = rest[:-1]
        return "PWD", scope, "General", f"Persons with Disability ({rest})"

    if code.startswith("DEF"):
        rest = code[3:]
        scope = "State Level"
        if rest.endswith("S"):
            scope = "State Level"
            rest = rest[:-1]
        elif rest.endswith("H"):
            scope = "Home University"
            rest = rest[:-1]
        return "Defence", scope, "General", f"Defence Quota ({rest})"

    # General / Ladies logic
    gender = "General"
    category = "OPEN"
    scope = "State Level"

    s = code
    if s.startswith("G"):
        gender = "General"
        s = s[1:]
    elif s.startswith("L"):
        gender = "Ladies"
        s = s[1:]

    if s.endswith("H"):
        scope = "Home University"
        s = s[:-1]
    elif s.endswith("O"):
        scope = "Other than Home University"
        s = s[:-1]
    elif s.endswith("S"):
        scope = "State Level"
        s = s[:-1]

    cat_map = {
        "OPEN": "OPEN",
        "OBC": "OBC",
        "SC": "SC",
        "ST": "ST",
        "VJ": "VJ / DT",
        "NT1": "NT-1 (NT-B)",
        "NT2": "NT-2 (NT-C)",
        "NT3": "NT-3 (NT-D)",
    }
    category = cat_map.get(s, s)
    desc = f"{gender} {category} ({scope})"
    return category, scope, gender, desc
