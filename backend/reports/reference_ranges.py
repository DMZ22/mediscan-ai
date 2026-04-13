"""
Medical reference ranges for common lab tests.
Used for rule-based flagging before AI analysis.
"""

REFERENCE_RANGES = {
    "cbc": {
        "hemoglobin": {"unit": "g/dL", "male": {"low": 13.5, "high": 17.5}, "female": {"low": 12.0, "high": 15.5}},
        "wbc": {"unit": "x10^3/uL", "low": 4.5, "high": 11.0},
        "rbc": {"unit": "x10^6/uL", "male": {"low": 4.5, "high": 5.5}, "female": {"low": 4.0, "high": 5.0}},
        "platelets": {"unit": "x10^3/uL", "low": 150, "high": 400},
        "hematocrit": {"unit": "%", "male": {"low": 38.3, "high": 48.6}, "female": {"low": 35.5, "high": 44.9}},
        "mcv": {"unit": "fL", "low": 80, "high": 96},
        "mch": {"unit": "pg", "low": 27, "high": 33},
    },
    "lipid_panel": {
        "total_cholesterol": {"unit": "mg/dL", "low": 0, "high": 200, "borderline": 239},
        "ldl": {"unit": "mg/dL", "low": 0, "high": 100, "borderline": 159},
        "hdl": {"unit": "mg/dL", "low": 40, "high": 999},
        "triglycerides": {"unit": "mg/dL", "low": 0, "high": 150, "borderline": 199},
        "vldl": {"unit": "mg/dL", "low": 2, "high": 30},
    },
    "metabolic": {
        "glucose": {"unit": "mg/dL", "low": 70, "high": 100, "borderline": 125},
        "bun": {"unit": "mg/dL", "low": 7, "high": 20},
        "creatinine": {"unit": "mg/dL", "male": {"low": 0.7, "high": 1.3}, "female": {"low": 0.6, "high": 1.1}},
        "sodium": {"unit": "mEq/L", "low": 136, "high": 145},
        "potassium": {"unit": "mEq/L", "low": 3.5, "high": 5.0},
        "calcium": {"unit": "mg/dL", "low": 8.5, "high": 10.5},
        "co2": {"unit": "mEq/L", "low": 23, "high": 29},
    },
    "liver_function": {
        "alt": {"unit": "U/L", "low": 7, "high": 56},
        "ast": {"unit": "U/L", "low": 10, "high": 40},
        "alp": {"unit": "U/L", "low": 44, "high": 147},
        "bilirubin_total": {"unit": "mg/dL", "low": 0.1, "high": 1.2},
        "bilirubin_direct": {"unit": "mg/dL", "low": 0, "high": 0.3},
        "albumin": {"unit": "g/dL", "low": 3.5, "high": 5.5},
        "total_protein": {"unit": "g/dL", "low": 6.0, "high": 8.3},
        "ggt": {"unit": "U/L", "low": 0, "high": 65},
    },
    "kidney_function": {
        "creatinine": {"unit": "mg/dL", "male": {"low": 0.7, "high": 1.3}, "female": {"low": 0.6, "high": 1.1}},
        "bun": {"unit": "mg/dL", "low": 7, "high": 20},
        "egfr": {"unit": "mL/min", "low": 90, "high": 999},
        "uric_acid": {"unit": "mg/dL", "male": {"low": 3.4, "high": 7.0}, "female": {"low": 2.4, "high": 6.0}},
        "bun_creatinine_ratio": {"unit": "ratio", "low": 10, "high": 20},
    },
    "thyroid": {
        "tsh": {"unit": "mIU/L", "low": 0.4, "high": 4.0},
        "t3": {"unit": "ng/dL", "low": 80, "high": 200},
        "t4": {"unit": "ug/dL", "low": 4.5, "high": 12.0},
        "free_t4": {"unit": "ng/dL", "low": 0.8, "high": 1.8},
        "free_t3": {"unit": "pg/mL", "low": 2.3, "high": 4.2},
    },
}


def flag_value(test_name: str, value: float, panel: str, sex: str = "male") -> str:
    """Flag a lab value as low/normal/high/critical."""
    panel_ranges = REFERENCE_RANGES.get(panel, {})
    test_range = panel_ranges.get(test_name)
    if not test_range:
        return "unknown"

    # Get sex-specific ranges if available
    if sex in test_range:
        low = test_range[sex]["low"]
        high = test_range[sex]["high"]
    elif "low" in test_range:
        low = test_range["low"]
        high = test_range["high"]
    else:
        return "unknown"

    borderline = test_range.get("borderline")

    if value < low * 0.7:
        return "critical_low"
    elif value < low:
        return "low"
    elif borderline and value > borderline:
        return "high"
    elif value > high * 1.5:
        return "critical_high"
    elif value > high:
        return "high"
    return "normal"


def analyze_panel(panel_type: str, values: dict, sex: str = "male") -> dict:
    """Analyze a panel of lab values using reference ranges."""
    results = {}
    panel_ranges = REFERENCE_RANGES.get(panel_type, {})

    for test_name, val in values.items():
        if test_name not in panel_ranges:
            continue
        try:
            numeric_val = float(val)
        except (ValueError, TypeError):
            continue

        test_range = panel_ranges[test_name]
        unit = test_range.get("unit", "")

        if sex in test_range:
            ref_low = test_range[sex]["low"]
            ref_high = test_range[sex]["high"]
        elif "low" in test_range:
            ref_low = test_range["low"]
            ref_high = test_range["high"]
        else:
            continue

        status = flag_value(test_name, numeric_val, panel_type, sex)

        results[test_name] = {
            "value": numeric_val,
            "unit": unit,
            "reference_low": ref_low,
            "reference_high": ref_high,
            "status": status,
        }

    return results


def get_panel_fields(panel_type: str) -> list:
    """Get the list of test fields for a panel type."""
    panel = REFERENCE_RANGES.get(panel_type, {})
    return [
        {
            "key": test_name,
            "label": test_name.replace("_", " ").title(),
            "unit": info.get("unit", ""),
        }
        for test_name, info in panel.items()
    ]
