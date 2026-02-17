"""
Clinical Rule Engine
Deterministic clinical logic for interpreting lab values and medical data
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


# Drug interaction database (simplified)
DRUG_INTERACTIONS = {
    ("warfarin", "aspirin"): {
        "severity": "high",
        "description": "Increased bleeding risk when combining anticoagulants"
    },
    ("metformin", "contrast dye"): {
        "severity": "high",
        "description": "Risk of lactic acidosis - hold metformin before/after contrast procedures"
    },
    ("lisinopril", "potassium"): {
        "severity": "moderate",
        "description": "ACE inhibitors can increase potassium levels"
    },
    ("simvastatin", "grapefruit"): {
        "severity": "moderate",
        "description": "Grapefruit can increase statin levels and side effects"
    },
    ("metformin", "alcohol"): {
        "severity": "moderate",
        "description": "Alcohol increases risk of lactic acidosis with metformin"
    },
    ("digoxin", "amiodarone"): {
        "severity": "high",
        "description": "Amiodarone increases digoxin levels significantly"
    },
    ("clopidogrel", "omeprazole"): {
        "severity": "moderate",
        "description": "PPIs may reduce antiplatelet effect of clopidogrel"
    },
}

# Risk severity classifications for lab values
RISK_CLASSIFICATIONS = {
    "glucose": {
        "critical_low": 50,
        "low": 70,
        "high": 126,
        "critical_high": 400,
        "conditions": {
            "low": "Hypoglycemia - immediate attention needed",
            "high": "Hyperglycemia - possible diabetes",
            "critical_high": "Severe hyperglycemia - immediate medical attention"
        }
    },
    "hemoglobin": {
        "critical_low": 7.0,
        "low": 12.0,
        "high": 17.5,
        "critical_high": 20.0,
        "conditions": {
            "critical_low": "Severe anemia - transfusion may be needed",
            "low": "Anemia - further evaluation needed",
            "high": "Polycythemia - possible dehydration or other causes"
        }
    },
    "creatinine": {
        "low": 0.5,
        "high": 1.2,
        "critical_high": 4.0,
        "conditions": {
            "high": "Elevated creatinine - possible kidney dysfunction",
            "critical_high": "Severe kidney impairment - urgent evaluation needed"
        }
    },
    "potassium": {
        "critical_low": 2.5,
        "low": 3.5,
        "high": 5.0,
        "critical_high": 6.5,
        "conditions": {
            "critical_low": "Severe hypokalemia - cardiac risk",
            "low": "Hypokalemia - may need supplementation",
            "high": "Hyperkalemia - review medications",
            "critical_high": "Severe hyperkalemia - cardiac risk, urgent"
        }
    },
    "sodium": {
        "critical_low": 120,
        "low": 136,
        "high": 145,
        "critical_high": 160,
        "conditions": {
            "critical_low": "Severe hyponatremia - neurological risk",
            "low": "Hyponatremia - evaluate fluid status",
            "high": "Hypernatremia - possible dehydration",
            "critical_high": "Severe hypernatremia - urgent"
        }
    },
    "troponin": {
        "high": 0.04,
        "critical_high": 0.4,
        "conditions": {
            "high": "Elevated troponin - possible cardiac injury",
            "critical_high": "Significantly elevated troponin - rule out MI"
        }
    },
    "tsh": {
        "low": 0.4,
        "high": 4.0,
        "critical_high": 10.0,
        "conditions": {
            "low": "Low TSH - possible hyperthyroidism",
            "high": "Elevated TSH - possible hypothyroidism",
            "critical_high": "Significantly elevated TSH - overt hypothyroidism"
        }
    }
}


class ClinicalRuleEngine:
    """Engine for applying clinical rules to medical data"""
    
    def __init__(self):
        self.drug_interactions = DRUG_INTERACTIONS
        self.risk_classifications = RISK_CLASSIFICATIONS
    
    def analyze_lab_values(self, lab_values: List[Dict]) -> List[Dict[str, Any]]:
        """Analyze lab values and generate risk indicators"""
        risk_indicators = []
        
        for lab in lab_values:
            name_lower = lab["name"].lower()
            value = lab["value"]
            
            # Find matching risk classification
            for test_name, rules in self.risk_classifications.items():
                if test_name in name_lower or name_lower in test_name:
                    severity = self._get_severity(value, rules)
                    if severity:
                        risk_indicators.append({
                            "marker": lab["name"],
                            "value": value,
                            "unit": lab.get("unit", ""),
                            "level": severity["level"],
                            "severity": severity["severity"],
                            "interpretation": severity["interpretation"]
                        })
                    break
            
            # Generic check for abnormal status
            if lab.get("status") in ["high", "low"] and not any(
                r["marker"] == lab["name"] for r in risk_indicators
            ):
                risk_indicators.append({
                    "marker": lab["name"],
                    "value": value,
                    "unit": lab.get("unit", ""),
                    "level": lab["status"],
                    "severity": "low",
                    "interpretation": f"{lab['name']} is {lab['status']} - review clinically"
                })
        
        return risk_indicators
    
    def _get_severity(self, value: float, rules: Dict) -> Optional[Dict]:
        """Determine severity level based on value and rules"""
        conditions = rules.get("conditions", {})
        
        if "critical_low" in rules and value < rules["critical_low"]:
            return {
                "level": "critical_low",
                "severity": "high",
                "interpretation": conditions.get("critical_low", "Critically low value")
            }
        elif "low" in rules and value < rules["low"]:
            return {
                "level": "low",
                "severity": "moderate",
                "interpretation": conditions.get("low", "Low value")
            }
        elif "critical_high" in rules and value > rules["critical_high"]:
            return {
                "level": "critical_high",
                "severity": "high",
                "interpretation": conditions.get("critical_high", "Critically high value")
            }
        elif "high" in rules and value > rules["high"]:
            return {
                "level": "high",
                "severity": "moderate",
                "interpretation": conditions.get("high", "High value")
            }
        
        return None
    
    def check_drug_interactions(self, medications: List[Dict]) -> List[Dict[str, Any]]:
        """Check for drug-drug interactions"""
        interactions = []
        med_names = [m["name"].lower() for m in medications]
        
        # Check all pairs
        for i, med1 in enumerate(med_names):
            for med2 in med_names[i+1:]:
                # Check both orderings
                for pair in [(med1, med2), (med2, med1)]:
                    for (drug1, drug2), interaction in self.drug_interactions.items():
                        if drug1 in pair[0] and drug2 in pair[1]:
                            interactions.append({
                                "drug1": pair[0].title(),
                                "drug2": pair[1].title(),
                                "severity": interaction["severity"],
                                "description": interaction["description"]
                            })
        
        return interactions
    
    def check_dosage_risks(self, medications: List[Dict], lab_values: List[Dict]) -> List[Dict[str, Any]]:
        """Check for dosage-related risks based on lab values"""
        risks = []
        
        # Check kidney function for renally cleared drugs
        creatinine = next(
            (l for l in lab_values if "creatinine" in l["name"].lower()),
            None
        )
        
        if creatinine and creatinine["value"] > 1.5:
            renal_drugs = ["metformin", "digoxin", "gabapentin", "lisinopril"]
            for med in medications:
                if any(drug in med["name"].lower() for drug in renal_drugs):
                    risks.append({
                        "drug": med["name"],
                        "issue": "Reduced kidney function detected",
                        "recommendation": f"Consider dose adjustment for {med['name']} due to elevated creatinine ({creatinine['value']} mg/dL)"
                    })
        
        # Check liver function for hepatically metabolized drugs
        alt = next(
            (l for l in lab_values if "alt" in l["name"].lower() or "sgpt" in l["name"].lower()),
            None
        )
        
        if alt and alt["value"] > 80:
            hepatic_drugs = ["acetaminophen", "atorvastatin", "simvastatin"]
            for med in medications:
                if any(drug in med["name"].lower() for drug in hepatic_drugs):
                    risks.append({
                        "drug": med["name"],
                        "issue": "Elevated liver enzymes detected",
                        "recommendation": f"Monitor liver function while on {med['name']} - ALT elevated ({alt['value']} U/L)"
                    })
        
        return risks
    
    def analyze_trends(self, current_values: List[Dict], previous_data: List[Dict]) -> List[Dict[str, Any]]:
        """Compare current values with historical data to identify trends"""
        trends = []
        
        if not previous_data:
            return trends
        
        for current in current_values:
            current_name = current["name"].lower()
            current_value = current["value"]
            
            # Find matching previous values
            for prev_entry in previous_data:
                prev_values = prev_entry.get("lab_values", [])
                for prev in prev_values:
                    if current_name in prev.get("name", "").lower():
                        prev_value = prev.get("value")
                        if prev_value is not None:
                            change = current_value - prev_value
                            pct_change = (change / prev_value * 100) if prev_value != 0 else 0
                            
                            # Determine trend direction and significance
                            if abs(pct_change) > 10:  # Significant change
                                if change > 0:
                                    trend = "increasing"
                                    indicator = "↑"
                                    # Increasing is bad for most markers except HDL
                                    if "hdl" in current_name:
                                        status = "improving"
                                    else:
                                        status = "worsening" if current.get("status") == "high" else "monitor"
                                else:
                                    trend = "decreasing"
                                    indicator = "↓"
                                    if "hdl" in current_name:
                                        status = "worsening"
                                    else:
                                        status = "improving" if current.get("status") == "high" else "monitor"
                                
                                trends.append({
                                    "test": current["name"],
                                    "trend": trend,
                                    "indicator": indicator,
                                    "previous_value": prev_value,
                                    "current_value": current_value,
                                    "change_percent": round(pct_change, 1),
                                    "status": status,
                                    "date": str(prev_entry.get("date", "previous"))
                                })
                        break
        
        return trends
    
    def generate_clinical_summary(self, risk_indicators: List, drug_interactions: List, 
                                   dosage_risks: List, trends: List) -> Dict[str, Any]:
        """Generate a clinical summary of all findings"""
        
        # Count high severity items
        high_severity = sum(1 for r in risk_indicators if r.get("severity") == "high")
        high_severity += sum(1 for d in drug_interactions if d.get("severity") == "high")
        
        # Overall risk level
        if high_severity >= 2:
            overall_risk = "high"
        elif high_severity == 1 or len(risk_indicators) > 3:
            overall_risk = "moderate"
        else:
            overall_risk = "low"
        
        # Key findings
        key_findings = []
        for r in risk_indicators:
            if r.get("severity") == "high":
                key_findings.append(r["interpretation"])
        
        for d in drug_interactions:
            if d.get("severity") == "high":
                key_findings.append(f"Drug interaction: {d['drug1']} + {d['drug2']}")
        
        # Worsening trends
        worsening = [t for t in trends if t.get("status") == "worsening"]
        
        return {
            "overall_risk": overall_risk,
            "high_severity_count": high_severity,
            "total_abnormal_values": len(risk_indicators),
            "drug_interactions_count": len(drug_interactions),
            "key_findings": key_findings[:5],  # Top 5
            "worsening_trends": len(worsening),
            "requires_attention": high_severity > 0 or len(worsening) > 0
        }


# Create singleton instance
clinical_engine = ClinicalRuleEngine()


def analyze_clinical_data(lab_values: List[Dict], medications: List[Dict], 
                          previous_data: List[Dict] = None) -> Dict[str, Any]:
    """Convenience function to run full clinical analysis"""
    
    risk_indicators = clinical_engine.analyze_lab_values(lab_values)
    drug_interactions = clinical_engine.check_drug_interactions(medications)
    dosage_risks = clinical_engine.check_dosage_risks(medications, lab_values)
    trends = clinical_engine.analyze_trends(lab_values, previous_data or [])
    
    summary = clinical_engine.generate_clinical_summary(
        risk_indicators, drug_interactions, dosage_risks, trends
    )
    
    return {
        "risk_indicators": risk_indicators,
        "drug_interactions": drug_interactions,
        "dosage_risks": dosage_risks,
        "trends": trends,
        "clinical_summary": summary
    }
