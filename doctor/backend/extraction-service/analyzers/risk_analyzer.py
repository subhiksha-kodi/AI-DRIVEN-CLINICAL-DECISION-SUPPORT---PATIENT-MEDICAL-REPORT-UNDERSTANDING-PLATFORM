"""
Risk Analyzer Module
Analyzes lab results to detect abnormal values and generate risk alerts.
Provides severity levels and clinical recommendations.
"""

from typing import List, Dict, Any, Optional
import logging
from utils.reference_ranges import get_reference_range, is_critical_value, REFERENCE_RANGES

logger = logging.getLogger(__name__)


class RiskAnalyzer:
    """
    Analyzes lab results to detect risks and generate alerts.
    Categorizes alerts by severity: CRITICAL, HIGH, MODERATE, LOW.
    """
    
    # Severity levels
    CRITICAL = "CRITICAL"  # Immediately life-threatening
    HIGH = "HIGH"          # Requires urgent attention
    MODERATE = "MODERATE"  # Needs follow-up
    LOW = "LOW"            # Minor deviation
    NORMAL = "NORMAL"      # Within normal limits
    
    def __init__(self):
        # Conditions and their associated tests
        self.condition_patterns = {
            "anemia": ["hemoglobin", "hematocrit", "rbc_count", "mcv", "mch", "iron", "ferritin"],
            "diabetes": ["glucose_fasting", "glucose_random", "hba1c"],
            "kidney_disease": ["creatinine", "bun", "egfr", "urea"],
            "liver_disease": ["sgpt_alt", "sgot_ast", "bilirubin_total", "alp", "albumin"],
            "infection": ["wbc_count", "neutrophils", "crp", "esr"],
            "thyroid_disorder": ["tsh", "t3", "t4", "free_t3", "free_t4"],
            "cardiovascular_risk": ["cholesterol_total", "ldl", "hdl", "triglycerides", "troponin"],
            "electrolyte_imbalance": ["sodium", "potassium", "calcium", "chloride", "magnesium"],
            "coagulation_disorder": ["pt", "inr", "aptt", "platelet_count"],
        }
    
    def analyze(self, lab_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze lab results and generate risk assessment.
        
        Returns:
            Dictionary containing:
            - alerts: List of alert dictionaries
            - summary: Overall risk summary
            - abnormal_count: Count of abnormal values
            - critical_count: Count of critical values
            - risk_score: Overall risk score (0-100)
            - conditions: Potentially indicated conditions
        """
        alerts = []
        abnormal_results = []
        critical_results = []
        
        for result in lab_results:
            test_code = result.get("test_name_normalized", "")
            numeric_value = result.get("numeric_value")
            status = result.get("status", "")
            
            if numeric_value is None:
                continue
            
            # Generate alert for this result
            alert = self._generate_alert(result)
            
            if alert:
                alerts.append(alert)
                
                if alert["severity"] == self.CRITICAL:
                    critical_results.append(result)
                    abnormal_results.append(result)
                elif alert["severity"] in [self.HIGH, self.MODERATE]:
                    abnormal_results.append(result)
        
        # Sort alerts by severity
        severity_order = {self.CRITICAL: 0, self.HIGH: 1, self.MODERATE: 2, self.LOW: 3}
        alerts.sort(key=lambda x: severity_order.get(x["severity"], 99))
        
        # Detect potential conditions
        conditions = self._detect_conditions(lab_results)
        
        # Calculate risk score
        risk_score = self._calculate_risk_score(alerts, len(lab_results))
        
        return {
            "alerts": alerts,
            "summary": self._generate_summary(alerts, conditions),
            "abnormal_count": len(abnormal_results),
            "critical_count": len(critical_results),
            "total_tests": len(lab_results),
            "risk_score": risk_score,
            "risk_level": self._get_risk_level(risk_score),
            "conditions": conditions
        }
    
    def _generate_alert(self, result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Generate an alert for a single lab result if abnormal.
        """
        test_code = result.get("test_name_normalized", "")
        test_name = result.get("test_name", test_code)
        numeric_value = result.get("numeric_value")
        unit = result.get("unit", "")
        status = result.get("status", "")
        ref_range = result.get("reference_range", "")
        
        if numeric_value is None:
            return None
        
        # Get reference range data
        ref_data = get_reference_range(test_code)
        
        # Determine severity
        severity = self._determine_severity(test_code, numeric_value, status, ref_data)
        
        if severity == self.NORMAL:
            return None
        
        # Generate message and recommendation
        message, recommendation = self._get_alert_message(
            test_name, numeric_value, unit, status, severity, ref_data
        )
        
        return {
            "test_name": test_name,
            "test_code": test_code,
            "value": numeric_value,
            "unit": unit,
            "status": status,
            "severity": severity,
            "reference_range": ref_range or (ref_data.get("range_text", "") if ref_data else ""),
            "message": message,
            "recommendation": recommendation,
            "requires_immediate_attention": severity == self.CRITICAL
        }
    
    def _determine_severity(
        self, 
        test_code: str, 
        value: float, 
        status: str,
        ref_data: Optional[Dict]
    ) -> str:
        """
        Determine severity level of an abnormal value.
        """
        status_upper = (status or "").upper()
        
        if status_upper == "NORMAL":
            return self.NORMAL
        
        if not ref_data:
            # No reference data - use status if available
            if status_upper in ["HIGH", "LOW"]:
                return self.MODERATE
            return self.NORMAL
        
        min_val = ref_data.get("min", 0)
        max_val = ref_data.get("max", float('inf'))
        critical_low = ref_data.get("critical_low")
        critical_high = ref_data.get("critical_high")
        
        # Check for critical values
        if critical_low is not None and value < critical_low:
            return self.CRITICAL
        if critical_high is not None and value > critical_high:
            return self.CRITICAL
        
        # Calculate how far outside normal range
        if value < min_val:
            deviation = (min_val - value) / min_val * 100 if min_val > 0 else 50
            if deviation > 30:
                return self.HIGH
            elif deviation > 15:
                return self.MODERATE
            else:
                return self.LOW
        
        elif value > max_val:
            deviation = (value - max_val) / max_val * 100 if max_val > 0 else 50
            if deviation > 30:
                return self.HIGH
            elif deviation > 15:
                return self.MODERATE
            else:
                return self.LOW
        
        return self.NORMAL
    
    def _get_alert_message(
        self,
        test_name: str,
        value: float,
        unit: str,
        status: str,
        severity: str,
        ref_data: Optional[Dict]
    ) -> tuple:
        """
        Generate alert message and clinical recommendation.
        """
        value_str = f"{value} {unit}".strip()
        ref_range = ref_data.get("range_text", "N/A") if ref_data else "N/A"
        status_upper = (status or "").upper()
        
        # Message based on status
        if status_upper == "HIGH":
            direction = "elevated"
        elif status_upper == "LOW":
            direction = "low"
        else:
            direction = "abnormal"
        
        # Generate message
        if severity == self.CRITICAL:
            message = f"⚠️ CRITICAL: {test_name} is critically {direction} at {value_str}. " \
                     f"Reference range: {ref_range}. Immediate medical attention required!"
            recommendation = "Seek immediate medical attention. Contact healthcare provider urgently."
        elif severity == self.HIGH:
            message = f"🔴 HIGH ALERT: {test_name} is significantly {direction} at {value_str}. " \
                     f"Reference range: {ref_range}."
            recommendation = "Schedule urgent consultation with healthcare provider within 24-48 hours."
        elif severity == self.MODERATE:
            message = f"🟠 MODERATE: {test_name} is {direction} at {value_str}. " \
                     f"Reference range: {ref_range}."
            recommendation = "Follow up with healthcare provider. May require additional testing."
        else:  # LOW severity
            message = f"🟡 NOTICE: {test_name} is slightly {direction} at {value_str}. " \
                     f"Reference range: {ref_range}."
            recommendation = "Monitor and discuss at next regular checkup."
        
        return message, recommendation
    
    def _detect_conditions(self, lab_results: List[Dict]) -> List[Dict[str, Any]]:
        """
        Detect potential medical conditions based on patterns of abnormal results.
        """
        detected = []
        
        # Get abnormal test codes
        abnormal_tests = {}
        for result in lab_results:
            test_code = result.get("test_name_normalized", "")
            status = result.get("status") or ""
            status_upper = status.upper()
            if status_upper in ["HIGH", "LOW"]:
                abnormal_tests[test_code] = status_upper
        
        if not abnormal_tests:
            return detected
        
        # Check each condition pattern
        for condition, related_tests in self.condition_patterns.items():
            matching = []
            for test in related_tests:
                if test in abnormal_tests:
                    matching.append({
                        "test": test,
                        "status": abnormal_tests[test]
                    })
            
            # If multiple related tests are abnormal, flag the condition
            if len(matching) >= 2:
                detected.append({
                    "condition": condition.replace("_", " ").title(),
                    "confidence": min(len(matching) / len(related_tests), 1.0),
                    "indicators": matching,
                    "message": self._get_condition_message(condition, matching)
                })
        
        # Sort by confidence
        detected.sort(key=lambda x: x["confidence"], reverse=True)
        
        return detected
    
    def _get_condition_message(self, condition: str, indicators: List[Dict]) -> str:
        """
        Generate a message for a detected condition.
        """
        messages = {
            "anemia": "Multiple blood count indicators suggest possible anemia. "
                     "Further evaluation recommended including iron studies.",
            "diabetes": "Glucose-related tests show abnormal values. "
                       "Recommend consultation with endocrinologist.",
            "kidney_disease": "Kidney function markers are abnormal. "
                             "Nephrology consultation may be needed.",
            "liver_disease": "Liver function tests show abnormalities. "
                            "Further hepatic evaluation recommended.",
            "infection": "Inflammatory markers elevated. May indicate active infection. "
                        "Clinical correlation required.",
            "thyroid_disorder": "Thyroid panel shows abnormalities. "
                               "Endocrinology follow-up recommended.",
            "cardiovascular_risk": "Lipid panel indicates elevated cardiovascular risk. "
                                  "Lifestyle modifications and possible treatment needed.",
            "electrolyte_imbalance": "Electrolyte levels are abnormal. "
                                    "May require correction and monitoring.",
            "coagulation_disorder": "Coagulation tests are abnormal. "
                                   "Hematology evaluation may be needed.",
        }
        
        return messages.get(condition, f"Abnormal values detected in {condition} panel.")
    
    def _calculate_risk_score(self, alerts: List[Dict], total_tests: int) -> int:
        """
        Calculate overall risk score (0-100).
        """
        if not alerts or total_tests == 0:
            return 0
        
        # Weight by severity
        severity_weights = {
            self.CRITICAL: 40,
            self.HIGH: 25,
            self.MODERATE: 15,
            self.LOW: 5
        }
        
        score = 0
        for alert in alerts:
            score += severity_weights.get(alert["severity"], 0)
        
        # Normalize and cap at 100
        normalized = min(score * (10 / max(total_tests, 1)), 100)
        
        return round(normalized)
    
    def _get_risk_level(self, score: int) -> str:
        """
        Convert risk score to risk level.
        """
        if score >= 70:
            return "CRITICAL"
        elif score >= 50:
            return "HIGH"
        elif score >= 30:
            return "MODERATE"
        elif score > 0:
            return "LOW"
        else:
            return "NORMAL"
    
    def _generate_summary(self, alerts: List[Dict], conditions: List[Dict]) -> str:
        """
        Generate a text summary of the risk analysis.
        """
        if not alerts:
            return "All lab values are within normal ranges. No concerns identified."
        
        critical_count = sum(1 for a in alerts if a["severity"] == self.CRITICAL)
        high_count = sum(1 for a in alerts if a["severity"] == self.HIGH)
        moderate_count = sum(1 for a in alerts if a["severity"] == self.MODERATE)
        
        parts = []
        
        if critical_count > 0:
            parts.append(f"{critical_count} CRITICAL alert(s) requiring immediate attention")
        if high_count > 0:
            parts.append(f"{high_count} HIGH priority finding(s)")
        if moderate_count > 0:
            parts.append(f"{moderate_count} MODERATE concern(s)")
        
        summary = "Analysis identified: " + "; ".join(parts) + "."
        
        if conditions:
            top_conditions = [c["condition"] for c in conditions[:3]]
            summary += f" Potential conditions: {', '.join(top_conditions)}."
        
        return summary
