"""
Reference Ranges Database
Contains standard reference ranges for common lab tests.
Used for determining if values are LOW, NORMAL, or HIGH.

Note: Reference ranges can vary by laboratory, age, sex, and other factors.
These are general adult reference ranges.
"""

from typing import Dict, Optional, Any


# Reference ranges database
# Format: test_code: {min, max, unit, range_text, critical_low, critical_high}
REFERENCE_RANGES: Dict[str, Dict[str, Any]] = {
    # Complete Blood Count (CBC)
    "hemoglobin": {
        "min": 12.0,
        "max": 17.0,
        "unit": "g/dL",
        "range_text": "12.0 - 17.0 g/dL",
        "critical_low": 8.0,
        "critical_high": 20.0,
        "male": {"min": 13.5, "max": 17.5},
        "female": {"min": 12.0, "max": 16.0}
    },
    "hematocrit": {
        "min": 36.0,
        "max": 52.0,
        "unit": "%",
        "range_text": "36 - 52%",
        "critical_low": 20.0,
        "critical_high": 60.0
    },
    "rbc_count": {
        "min": 4.0,
        "max": 6.0,
        "unit": "million/µL",
        "range_text": "4.0 - 6.0 million/µL",
        "critical_low": 2.5,
        "critical_high": 7.5
    },
    "wbc_count": {
        "min": 4500,
        "max": 11000,
        "unit": "cells/µL",
        "range_text": "4,500 - 11,000 cells/µL",
        "critical_low": 2000,
        "critical_high": 30000
    },
    "platelet_count": {
        "min": 150000,
        "max": 400000,
        "unit": "cells/µL",
        "range_text": "150,000 - 400,000 cells/µL",
        "critical_low": 50000,
        "critical_high": 1000000
    },
    "mcv": {
        "min": 80,
        "max": 100,
        "unit": "fL",
        "range_text": "80 - 100 fL"
    },
    "mch": {
        "min": 27,
        "max": 33,
        "unit": "pg",
        "range_text": "27 - 33 pg"
    },
    "mchc": {
        "min": 32,
        "max": 36,
        "unit": "g/dL",
        "range_text": "32 - 36 g/dL"
    },
    "rdw": {
        "min": 11.5,
        "max": 14.5,
        "unit": "%",
        "range_text": "11.5 - 14.5%"
    },
    
    # Differential Count
    "neutrophils": {
        "min": 40,
        "max": 70,
        "unit": "%",
        "range_text": "40 - 70%"
    },
    "lymphocytes": {
        "min": 20,
        "max": 40,
        "unit": "%",
        "range_text": "20 - 40%"
    },
    "monocytes": {
        "min": 2,
        "max": 8,
        "unit": "%",
        "range_text": "2 - 8%"
    },
    "eosinophils": {
        "min": 1,
        "max": 4,
        "unit": "%",
        "range_text": "1 - 4%"
    },
    "basophils": {
        "min": 0,
        "max": 1,
        "unit": "%",
        "range_text": "0 - 1%"
    },
    
    # Blood Glucose
    "glucose_fasting": {
        "min": 70,
        "max": 100,
        "unit": "mg/dL",
        "range_text": "70 - 100 mg/dL",
        "critical_low": 50,
        "critical_high": 200
    },
    "glucose_random": {
        "min": 70,
        "max": 140,
        "unit": "mg/dL",
        "range_text": "70 - 140 mg/dL",
        "critical_low": 50,
        "critical_high": 500
    },
    "glucose_pp": {
        "min": 70,
        "max": 140,
        "unit": "mg/dL",
        "range_text": "< 140 mg/dL (2hr after meal)",
        "critical_high": 300
    },
    "hba1c": {
        "min": 4.0,
        "max": 5.6,
        "unit": "%",
        "range_text": "< 5.7% (normal), 5.7-6.4% (prediabetes)",
        "critical_high": 14.0
    },
    
    # Kidney Function Tests
    "creatinine": {
        "min": 0.6,
        "max": 1.2,
        "unit": "mg/dL",
        "range_text": "0.6 - 1.2 mg/dL",
        "critical_high": 10.0,
        "male": {"min": 0.7, "max": 1.3},
        "female": {"min": 0.6, "max": 1.1}
    },
    "bun": {
        "min": 7,
        "max": 20,
        "unit": "mg/dL",
        "range_text": "7 - 20 mg/dL",
        "critical_high": 100
    },
    "urea": {
        "min": 15,
        "max": 45,
        "unit": "mg/dL",
        "range_text": "15 - 45 mg/dL"
    },
    "uric_acid": {
        "min": 2.5,
        "max": 7.0,
        "unit": "mg/dL",
        "range_text": "2.5 - 7.0 mg/dL",
        "male": {"min": 3.5, "max": 7.2},
        "female": {"min": 2.5, "max": 6.0}
    },
    "egfr": {
        "min": 90,
        "max": 120,
        "unit": "mL/min/1.73m²",
        "range_text": ">90 mL/min/1.73m² (normal)",
        "critical_low": 15
    },
    
    # Liver Function Tests
    "sgpt_alt": {
        "min": 0,
        "max": 40,
        "unit": "U/L",
        "range_text": "0 - 40 U/L",
        "critical_high": 1000
    },
    "sgot_ast": {
        "min": 0,
        "max": 40,
        "unit": "U/L",
        "range_text": "0 - 40 U/L",
        "critical_high": 1000
    },
    "alp": {
        "min": 44,
        "max": 147,
        "unit": "U/L",
        "range_text": "44 - 147 U/L"
    },
    "ggt": {
        "min": 0,
        "max": 60,
        "unit": "U/L",
        "range_text": "0 - 60 U/L"
    },
    "bilirubin_total": {
        "min": 0.1,
        "max": 1.2,
        "unit": "mg/dL",
        "range_text": "0.1 - 1.2 mg/dL",
        "critical_high": 15.0
    },
    "bilirubin_direct": {
        "min": 0,
        "max": 0.3,
        "unit": "mg/dL",
        "range_text": "0 - 0.3 mg/dL"
    },
    "albumin": {
        "min": 3.5,
        "max": 5.0,
        "unit": "g/dL",
        "range_text": "3.5 - 5.0 g/dL",
        "critical_low": 2.0
    },
    "total_protein": {
        "min": 6.0,
        "max": 8.3,
        "unit": "g/dL",
        "range_text": "6.0 - 8.3 g/dL"
    },
    
    # Lipid Panel
    "cholesterol_total": {
        "min": 0,
        "max": 200,
        "unit": "mg/dL",
        "range_text": "< 200 mg/dL (desirable)",
        "critical_high": 300
    },
    "hdl": {
        "min": 40,
        "max": 60,
        "unit": "mg/dL",
        "range_text": "> 40 mg/dL (higher is better)",
        "critical_low": 25
    },
    "ldl": {
        "min": 0,
        "max": 100,
        "unit": "mg/dL",
        "range_text": "< 100 mg/dL (optimal)",
        "critical_high": 190
    },
    "triglycerides": {
        "min": 0,
        "max": 150,
        "unit": "mg/dL",
        "range_text": "< 150 mg/dL",
        "critical_high": 500
    },
    "vldl": {
        "min": 5,
        "max": 40,
        "unit": "mg/dL",
        "range_text": "5 - 40 mg/dL"
    },
    
    # Thyroid Panel
    "tsh": {
        "min": 0.4,
        "max": 4.0,
        "unit": "mIU/L",
        "range_text": "0.4 - 4.0 mIU/L",
        "critical_low": 0.1,
        "critical_high": 10.0
    },
    "t3": {
        "min": 80,
        "max": 200,
        "unit": "ng/dL",
        "range_text": "80 - 200 ng/dL"
    },
    "t4": {
        "min": 5.0,
        "max": 12.0,
        "unit": "µg/dL",
        "range_text": "5.0 - 12.0 µg/dL"
    },
    "free_t3": {
        "min": 2.3,
        "max": 4.2,
        "unit": "pg/mL",
        "range_text": "2.3 - 4.2 pg/mL"
    },
    "free_t4": {
        "min": 0.8,
        "max": 1.8,
        "unit": "ng/dL",
        "range_text": "0.8 - 1.8 ng/dL"
    },
    
    # Electrolytes
    "sodium": {
        "min": 136,
        "max": 145,
        "unit": "mEq/L",
        "range_text": "136 - 145 mEq/L",
        "critical_low": 120,
        "critical_high": 160
    },
    "potassium": {
        "min": 3.5,
        "max": 5.0,
        "unit": "mEq/L",
        "range_text": "3.5 - 5.0 mEq/L",
        "critical_low": 2.5,
        "critical_high": 6.5
    },
    "chloride": {
        "min": 98,
        "max": 106,
        "unit": "mEq/L",
        "range_text": "98 - 106 mEq/L",
        "critical_low": 80,
        "critical_high": 120
    },
    "calcium": {
        "min": 8.5,
        "max": 10.5,
        "unit": "mg/dL",
        "range_text": "8.5 - 10.5 mg/dL",
        "critical_low": 6.0,
        "critical_high": 13.0
    },
    "magnesium": {
        "min": 1.5,
        "max": 2.5,
        "unit": "mg/dL",
        "range_text": "1.5 - 2.5 mg/dL",
        "critical_low": 1.0,
        "critical_high": 4.0
    },
    "phosphorus": {
        "min": 2.5,
        "max": 4.5,
        "unit": "mg/dL",
        "range_text": "2.5 - 4.5 mg/dL"
    },
    
    # Cardiac Markers
    "troponin": {
        "min": 0,
        "max": 0.04,
        "unit": "ng/mL",
        "range_text": "< 0.04 ng/mL",
        "critical_high": 0.1
    },
    "ck_mb": {
        "min": 0,
        "max": 25,
        "unit": "U/L",
        "range_text": "0 - 25 U/L",
        "critical_high": 100
    },
    "bnp": {
        "min": 0,
        "max": 100,
        "unit": "pg/mL",
        "range_text": "< 100 pg/mL",
        "critical_high": 500
    },
    
    # Inflammation Markers
    "crp": {
        "min": 0,
        "max": 3.0,
        "unit": "mg/L",
        "range_text": "< 3.0 mg/L (low risk)",
        "critical_high": 10.0
    },
    "esr": {
        "min": 0,
        "max": 20,
        "unit": "mm/hr",
        "range_text": "0 - 20 mm/hr",
        "male": {"min": 0, "max": 15},
        "female": {"min": 0, "max": 20}
    },
    
    # Coagulation
    "pt": {
        "min": 11,
        "max": 13.5,
        "unit": "seconds",
        "range_text": "11 - 13.5 seconds",
        "critical_high": 30
    },
    "inr": {
        "min": 0.8,
        "max": 1.1,
        "unit": "",
        "range_text": "0.8 - 1.1 (normal), 2-3 (anticoagulant therapy)",
        "critical_high": 5.0
    },
    "aptt": {
        "min": 30,
        "max": 40,
        "unit": "seconds",
        "range_text": "30 - 40 seconds",
        "critical_high": 100
    },
    
    # Vitamins & Minerals
    "vitamin_d": {
        "min": 30,
        "max": 100,
        "unit": "ng/mL",
        "range_text": "30 - 100 ng/mL",
        "critical_low": 10
    },
    "vitamin_b12": {
        "min": 200,
        "max": 900,
        "unit": "pg/mL",
        "range_text": "200 - 900 pg/mL"
    },
    "folate": {
        "min": 3,
        "max": 17,
        "unit": "ng/mL",
        "range_text": "3 - 17 ng/mL"
    },
    "iron": {
        "min": 60,
        "max": 170,
        "unit": "µg/dL",
        "range_text": "60 - 170 µg/dL",
        "male": {"min": 65, "max": 175},
        "female": {"min": 50, "max": 170}
    },
    "ferritin": {
        "min": 12,
        "max": 300,
        "unit": "ng/mL",
        "range_text": "12 - 300 ng/mL",
        "male": {"min": 24, "max": 336},
        "female": {"min": 11, "max": 307}
    },
    "tibc": {
        "min": 250,
        "max": 370,
        "unit": "µg/dL",
        "range_text": "250 - 370 µg/dL"
    },
}


def get_reference_range(test_code: str, sex: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get reference range for a test.
    
    Args:
        test_code: Normalized test code
        sex: Optional 'male' or 'female' for sex-specific ranges
    
    Returns:
        Dictionary with min, max, unit, range_text, and critical values
    """
    test_code = test_code.lower().strip()
    
    if test_code not in REFERENCE_RANGES:
        return None
    
    ref = REFERENCE_RANGES[test_code].copy()
    
    # Apply sex-specific ranges if available
    if sex and sex.lower() in ref:
        sex_specific = ref[sex.lower()]
        ref["min"] = sex_specific.get("min", ref.get("min"))
        ref["max"] = sex_specific.get("max", ref.get("max"))
    
    return ref


def is_critical_value(test_code: str, value: float) -> bool:
    """
    Check if a value is in the critical range requiring immediate attention.
    """
    ref = get_reference_range(test_code)
    if not ref:
        return False
    
    critical_low = ref.get("critical_low")
    critical_high = ref.get("critical_high")
    
    if critical_low is not None and value < critical_low:
        return True
    if critical_high is not None and value > critical_high:
        return True
    
    return False


def get_all_test_codes() -> list:
    """
    Get list of all available test codes.
    """
    return list(REFERENCE_RANGES.keys())
