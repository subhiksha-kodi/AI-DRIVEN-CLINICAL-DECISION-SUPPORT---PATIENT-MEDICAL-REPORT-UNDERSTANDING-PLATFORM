"""
Medical Validation Service
Provides validation for extracted lab values including:
- Unit validation and normalization
- Biological range validation
- Anomaly detection for impossible values
- Cross-reference with previous reports
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# Load medical dictionary
MEDICAL_DICT_PATH = Path(__file__).parent.parent / "data" / "medical_dictionary.json"
MEDICAL_DICTIONARY = {}
if MEDICAL_DICT_PATH.exists():
    with open(MEDICAL_DICT_PATH, 'r') as f:
        MEDICAL_DICTIONARY = json.load(f)
    logger.info("Medical dictionary loaded for validation")


class MedicalValidator:
    """Validates extracted medical lab values"""
    
    def __init__(self):
        self.reference_ranges = MEDICAL_DICTIONARY.get("reference_ranges", {})
        self.unit_aliases = MEDICAL_DICTIONARY.get("unit_aliases", {})
        self.impossible_values = MEDICAL_DICTIONARY.get("impossible_values", {})
        self.test_aliases = MEDICAL_DICTIONARY.get("test_aliases", {})
    
    def normalize_unit(self, unit: str) -> str:
        """Normalize unit to standard form"""
        if not unit:
            return unit
        
        unit_lower = unit.lower().strip()
        return self.unit_aliases.get(unit_lower, unit)
    
    def get_canonical_test_name(self, test_name: str) -> str:
        """Get canonical test name from alias"""
        if not test_name:
            return test_name
        
        test_lower = test_name.lower().strip()
        return self.test_aliases.get(test_lower, test_name)
    
    def validate_biological_range(
        self, 
        test_name: str, 
        value: float, 
        unit: str = None,
        gender: str = None
    ) -> Dict[str, Any]:
        """
        Validate if value is within biological reference range
        Returns validation result with flag and details
        """
        result = {
            "is_valid": True,
            "flag": "normal",
            "message": "",
            "reference_min": None,
            "reference_max": None,
            "severity": "normal"  # normal, mild, moderate, critical
        }
        
        # Get canonical test name
        canonical_name = self.get_canonical_test_name(test_name)
        test_key = canonical_name.lower()
        
        # Look up reference range
        ref_data = self.reference_ranges.get(test_key)
        if not ref_data:
            result["message"] = "Reference range not found"
            return result
        
        # Get appropriate range based on gender
        if gender and gender.lower() in ["male", "m"]:
            ref_min = ref_data.get("male", {}).get("min", ref_data.get("default", {}).get("min"))
            ref_max = ref_data.get("male", {}).get("max", ref_data.get("default", {}).get("max"))
        elif gender and gender.lower() in ["female", "f"]:
            ref_min = ref_data.get("female", {}).get("min", ref_data.get("default", {}).get("min"))
            ref_max = ref_data.get("female", {}).get("max", ref_data.get("default", {}).get("max"))
        else:
            ref_min = ref_data.get("default", {}).get("min")
            ref_max = ref_data.get("default", {}).get("max")
        
        if ref_min is None or ref_max is None:
            result["message"] = "Incomplete reference range data"
            return result
        
        result["reference_min"] = ref_min
        result["reference_max"] = ref_max
        
        # Calculate deviation percentage
        range_mid = (ref_min + ref_max) / 2
        range_size = ref_max - ref_min
        
        if value < ref_min:
            result["flag"] = "low"
            deviation = ((ref_min - value) / range_size) * 100
            if deviation > 50:
                result["severity"] = "critical"
                result["message"] = f"Critically low: {value} (ref: {ref_min}-{ref_max})"
            elif deviation > 25:
                result["severity"] = "moderate"
                result["message"] = f"Moderately low: {value} (ref: {ref_min}-{ref_max})"
            else:
                result["severity"] = "mild"
                result["message"] = f"Slightly low: {value} (ref: {ref_min}-{ref_max})"
            result["is_valid"] = True
            
        elif value > ref_max:
            result["flag"] = "high"
            deviation = ((value - ref_max) / range_size) * 100
            if deviation > 50:
                result["severity"] = "critical"
                result["message"] = f"Critically high: {value} (ref: {ref_min}-{ref_max})"
            elif deviation > 25:
                result["severity"] = "moderate"
                result["message"] = f"Moderately high: {value} (ref: {ref_min}-{ref_max})"
            else:
                result["severity"] = "mild"
                result["message"] = f"Slightly high: {value} (ref: {ref_min}-{ref_max})"
            result["is_valid"] = True
        else:
            result["flag"] = "normal"
            result["severity"] = "normal"
            result["message"] = f"Within normal range: {value} (ref: {ref_min}-{ref_max})"
        
        return result
    
    def check_impossible_value(self, test_name: str, value: float) -> Dict[str, Any]:
        """
        Check if value is physiologically impossible (likely OCR error)
        """
        result = {
            "is_possible": True,
            "message": "",
            "suggested_value": None
        }
        
        canonical_name = self.get_canonical_test_name(test_name)
        test_key = canonical_name.lower()
        
        limits = self.impossible_values.get(test_key)
        if not limits:
            return result
        
        min_val = limits.get("min")
        max_val = limits.get("max")
        
        if min_val is not None and value < min_val:
            result["is_possible"] = False
            result["message"] = f"Value {value} is below physiological minimum ({min_val})"
            # Suggest correction (maybe decimal point error)
            if value * 10 >= min_val and value * 10 <= max_val:
                result["suggested_value"] = value * 10
        
        elif max_val is not None and value > max_val:
            result["is_possible"] = False
            result["message"] = f"Value {value} is above physiological maximum ({max_val})"
            # Suggest correction (maybe decimal point error)
            if value / 10 >= min_val and value / 10 <= max_val:
                result["suggested_value"] = value / 10
        
        return result
    
    def validate_unit_consistency(self, test_name: str, unit: str) -> Dict[str, Any]:
        """
        Validate if the unit is appropriate for the test
        """
        result = {
            "is_consistent": True,
            "expected_unit": None,
            "normalized_unit": None,
            "message": ""
        }
        
        if not unit:
            return result
        
        normalized = self.normalize_unit(unit)
        result["normalized_unit"] = normalized
        
        canonical_name = self.get_canonical_test_name(test_name)
        test_key = canonical_name.lower()
        
        ref_data = self.reference_ranges.get(test_key)
        if ref_data and "unit" in ref_data:
            expected = ref_data["unit"]
            result["expected_unit"] = expected
            
            if normalized.lower() != expected.lower():
                result["is_consistent"] = False
                result["message"] = f"Unit mismatch: got '{unit}' (→{normalized}), expected '{expected}'"
        
        return result
    
    def validate_lab_result(
        self,
        test_name: str,
        value: float,
        unit: str = None,
        gender: str = None
    ) -> Dict[str, Any]:
        """
        Comprehensive validation of a single lab result
        """
        validation = {
            "test_name": test_name,
            "canonical_name": self.get_canonical_test_name(test_name),
            "value": value,
            "unit": unit,
            "normalized_unit": self.normalize_unit(unit) if unit else None,
            "is_valid": True,
            "validations": {
                "biological_range": {},
                "impossible_check": {},
                "unit_consistency": {}
            },
            "overall_status": "valid",
            "alerts": []
        }
        
        # 1. Check for impossible values (OCR errors)
        impossible_check = self.check_impossible_value(test_name, value)
        validation["validations"]["impossible_check"] = impossible_check
        
        if not impossible_check["is_possible"]:
            validation["is_valid"] = False
            validation["overall_status"] = "error"
            validation["alerts"].append({
                "type": "ocr_error",
                "severity": "high",
                "message": impossible_check["message"],
                "suggested_value": impossible_check.get("suggested_value")
            })
        
        # 2. Validate biological range
        range_check = self.validate_biological_range(test_name, value, unit, gender)
        validation["validations"]["biological_range"] = range_check
        
        if range_check["severity"] == "critical":
            validation["alerts"].append({
                "type": "critical_value",
                "severity": "critical",
                "message": range_check["message"]
            })
            validation["overall_status"] = "critical" if validation["is_valid"] else "error"
        elif range_check["severity"] in ["moderate", "mild"]:
            validation["alerts"].append({
                "type": "abnormal_value",
                "severity": range_check["severity"],
                "message": range_check["message"]
            })
            if validation["overall_status"] == "valid":
                validation["overall_status"] = "abnormal"
        
        # 3. Validate unit consistency
        if unit:
            unit_check = self.validate_unit_consistency(test_name, unit)
            validation["validations"]["unit_consistency"] = unit_check
            
            if not unit_check["is_consistent"]:
                validation["alerts"].append({
                    "type": "unit_mismatch",
                    "severity": "medium",
                    "message": unit_check["message"]
                })
        
        return validation
    
    def validate_report(
        self,
        lab_results: List[Dict[str, Any]],
        patient_gender: str = None
    ) -> Dict[str, Any]:
        """
        Validate all lab results in a report
        """
        report_validation = {
            "total_tests": len(lab_results),
            "valid_tests": 0,
            "abnormal_tests": 0,
            "critical_tests": 0,
            "error_tests": 0,
            "validated_results": [],
            "critical_alerts": [],
            "all_alerts": [],
            "summary": ""
        }
        
        for result in lab_results:
            test_name = result.get("test_name", "")
            value = result.get("value")
            unit = result.get("unit", "")
            
            if value is None:
                continue
            
            try:
                value = float(value)
            except (TypeError, ValueError):
                continue
            
            validation = self.validate_lab_result(
                test_name=test_name,
                value=value,
                unit=unit,
                gender=patient_gender
            )
            
            report_validation["validated_results"].append(validation)
            report_validation["all_alerts"].extend(validation["alerts"])
            
            # Count by status
            status = validation["overall_status"]
            if status == "valid":
                report_validation["valid_tests"] += 1
            elif status == "abnormal":
                report_validation["abnormal_tests"] += 1
            elif status == "critical":
                report_validation["critical_tests"] += 1
                report_validation["critical_alerts"].extend([
                    a for a in validation["alerts"] if a["severity"] == "critical"
                ])
            elif status == "error":
                report_validation["error_tests"] += 1
        
        # Generate summary
        report_validation["summary"] = self._generate_summary(report_validation)
        
        return report_validation
    
    def _generate_summary(self, validation: Dict[str, Any]) -> str:
        """Generate human-readable summary of validation results"""
        total = validation["total_tests"]
        normal = validation["valid_tests"]
        abnormal = validation["abnormal_tests"]
        critical = validation["critical_tests"]
        errors = validation["error_tests"]
        
        parts = []
        parts.append(f"Validated {total} test(s).")
        
        if normal > 0:
            parts.append(f"{normal} normal")
        if abnormal > 0:
            parts.append(f"{abnormal} abnormal")
        if critical > 0:
            parts.append(f"{critical} CRITICAL")
        if errors > 0:
            parts.append(f"{errors} potential OCR errors")
        
        if critical > 0:
            parts.append("IMMEDIATE ATTENTION REQUIRED for critical values.")
        
        return " | ".join(parts)
    
    def compare_with_previous(
        self,
        current_results: List[Dict],
        previous_results: List[Dict]
    ) -> List[Dict[str, Any]]:
        """
        Compare current results with previous report for trend analysis
        """
        comparisons = []
        
        # Create lookup for previous results
        previous_lookup = {}
        for result in previous_results:
            test_name = result.get("test_name", "").lower()
            canonical = self.get_canonical_test_name(test_name).lower()
            previous_lookup[canonical] = result
        
        for current in current_results:
            test_name = current.get("test_name", "")
            canonical = self.get_canonical_test_name(test_name).lower()
            current_value = current.get("value")
            
            if canonical in previous_lookup:
                prev = previous_lookup[canonical]
                prev_value = prev.get("value")
                
                if current_value is not None and prev_value is not None:
                    try:
                        current_val = float(current_value)
                        prev_val = float(prev_value)
                        
                        change = current_val - prev_val
                        pct_change = (change / prev_val * 100) if prev_val != 0 else 0
                        
                        trend = "stable"
                        if pct_change > 10:
                            trend = "increasing"
                        elif pct_change < -10:
                            trend = "decreasing"
                        
                        comparisons.append({
                            "test_name": test_name,
                            "current_value": current_val,
                            "previous_value": prev_val,
                            "absolute_change": round(change, 2),
                            "percent_change": round(pct_change, 2),
                            "trend": trend
                        })
                    except (TypeError, ValueError):
                        pass
        
        return comparisons


# Create singleton instance
medical_validator = MedicalValidator()


def validate_lab_result(
    test_name: str,
    value: float,
    unit: str = None,
    gender: str = None
) -> Dict[str, Any]:
    """Convenience function for single result validation"""
    return medical_validator.validate_lab_result(test_name, value, unit, gender)


def validate_report(
    lab_results: List[Dict[str, Any]],
    patient_gender: str = None
) -> Dict[str, Any]:
    """Convenience function for full report validation"""
    return medical_validator.validate_report(lab_results, patient_gender)
