"""
LLM-based Lab Report Structuring Module

Uses Groq's Llama 4 Scout model to convert raw extracted text into structured JSON.
This provides more accurate parsing than regex-based approaches.
"""

import os
import json
import re
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Groq model configuration
GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"


SYSTEM_PROMPT = """You are an expert medical laboratory report parser.

Your job is to convert raw extracted lab report text into structured JSON.

Rules:
1. Extract patient details (name, age, sex, dates, patient_id).
2. Extract laboratory tests under correct categories:
   - hematology (CBC, hemoglobin, RBC, WBC, platelets, etc.)
   - biochemistry (liver function, kidney function, electrolytes)
   - diabetes (blood sugar, HbA1c)
   - lipid_profile (cholesterol, triglycerides, HDL, LDL)
   - thyroid (TSH, T3, T4)
   - urine_analysis (urine tests)
3. For each test extract:
   - test_name (standardized name in UPPERCASE)
   - value (numeric or text)
   - unit (mg/dL, g/dL, etc.)
   - reference_range (e.g., "70-100")
4. If numeric value and reference range exist:
   - If value < lower limit → status = "LOW"
   - If value > upper limit → status = "HIGH"
   - Else → status = "NORMAL"
5. Ignore doctor names, footer text, page numbers, and irrelevant lines.
6. Clean spacing and fix merged words.
7. Output ONLY valid JSON matching this exact structure:

{
  "patient_info": {
    "name": "string",
    "age": "string",
    "sex": "string",
    "reported_date": "string",
    "patient_id": "string"
  },
  "lab_tests": [
    {
      "test_name": "string",
      "value": "string",
      "unit": "string",
      "reference_range": "string",
      "status": "LOW|NORMAL|HIGH",
      "section": "string"
    }
  ],
  "sections": {
    "section_name": [array of tests]
  }
}

8. Do not include explanations or markdown formatting.
9. Return ONLY the JSON object."""


@dataclass
class CriticalThreshold:
    """Thresholds for critical alert determination."""
    test_pattern: str
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None


# Critical thresholds that require immediate attention
CRITICAL_THRESHOLDS = [
    CriticalThreshold("FASTING.*BLOOD.*SUGAR|FBS|FASTING.*GLUCOSE", critical_high=200),
    CriticalThreshold("POST.*PRANDIAL.*BLOOD.*SUGAR|PPBS|PP.*GLUCOSE", critical_high=300),
    CriticalThreshold("RANDOM.*BLOOD.*SUGAR|RBS", critical_high=400),
    CriticalThreshold("HEMOGLOBIN|HB|HGB", critical_low=8.0, critical_high=18.0),
    CriticalThreshold("PLATELET", critical_low=50000, critical_high=500000),
    CriticalThreshold("WBC|WHITE.*BLOOD|LEUCOCYTE|TLC", critical_low=2000, critical_high=30000),
    CriticalThreshold("CREATININE", critical_high=4.0),
    CriticalThreshold("POTASSIUM|K\\+?", critical_low=2.5, critical_high=6.5),
    CriticalThreshold("SODIUM|NA\\+?", critical_low=120, critical_high=160),
    CriticalThreshold("BLOOD.*UREA|BUN", critical_high=100),
    CriticalThreshold("BILIRUBIN.*TOTAL", critical_high=10.0),
    CriticalThreshold("TSH", critical_low=0.1, critical_high=10.0),
    CriticalThreshold("PH", critical_low=7.2, critical_high=7.6),
]


class LLMStructurer:
    """
    Uses Groq Llama 4 Scout to structure raw lab report text into clean JSON.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize with Groq API key."""
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
            print("Warning: GROQ_API_KEY not set. LLM structuring disabled.")
    
    def structure_report(self, raw_text: str) -> Dict[str, Any]:
        """
        Convert raw text to structured JSON using LLM.
        
        Args:
            raw_text: Unstructured text extracted from lab report
            
        Returns:
            Structured dictionary with patient_info, lab_tests, sections
        """
        if not self.client:
            return {"error": "Groq API key not configured"}
        
        try:
            response = self.client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f'Parse this lab report:\n"""\n{raw_text}\n"""'}
                ],
                temperature=0,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content
            
            # Clean markdown formatting if present
            content = self._clean_json_response(content)
            
            # Parse JSON
            structured = json.loads(content)
            
            # Add numeric values
            structured = self._add_numeric_values(structured)
            
            # Add critical alerts
            structured = self._add_critical_alerts(structured)
            
            # Generate summary
            structured["summary"] = self._generate_summary(structured)
            
            return structured
            
        except json.JSONDecodeError as e:
            return {"error": f"Failed to parse LLM response as JSON: {str(e)}", "raw_response": content}
        except Exception as e:
            return {"error": f"LLM structuring failed: {str(e)}"}
    
    def _clean_json_response(self, content: str) -> str:
        """Remove markdown code blocks and extra formatting."""
        # Remove ```json and ``` markers
        content = re.sub(r'^```json\s*', '', content, flags=re.MULTILINE)
        content = re.sub(r'^```\s*$', '', content, flags=re.MULTILINE)
        content = content.strip()
        return content
    
    def _add_numeric_values(self, structured: Dict) -> Dict:
        """Add numeric_value field to each test."""
        if "lab_tests" in structured:
            for test in structured["lab_tests"]:
                try:
                    # Extract numeric part from value
                    value_str = str(test.get("value", ""))
                    numeric = re.search(r'[\d.]+', value_str)
                    if numeric:
                        test["numeric_value"] = float(numeric.group())
                    else:
                        test["numeric_value"] = None
                except (ValueError, TypeError):
                    test["numeric_value"] = None
        return structured
    
    def _add_critical_alerts(self, structured: Dict) -> Dict:
        """Add critical alert information for dangerous values."""
        alerts = []
        critical_alerts = []
        
        lab_tests = structured.get("lab_tests", [])
        
        for test in lab_tests:
            test_name = test.get("test_name", "").upper()
            numeric_value = test.get("numeric_value")
            status = test.get("status", "").upper()
            
            if numeric_value is None:
                continue
            
            # Check against critical thresholds
            is_critical = False
            severity = "NORMAL"
            message = ""
            
            for threshold in CRITICAL_THRESHOLDS:
                if re.search(threshold.test_pattern, test_name, re.IGNORECASE):
                    if threshold.critical_low and numeric_value < threshold.critical_low:
                        is_critical = True
                        severity = "CRITICAL"
                        message = f"🚨 CRITICAL: {test_name} is dangerously LOW at {numeric_value} {test.get('unit', '')}. Normal: {test.get('reference_range', 'N/A')}. IMMEDIATE ATTENTION REQUIRED!"
                    elif threshold.critical_high and numeric_value > threshold.critical_high:
                        is_critical = True
                        severity = "CRITICAL"
                        message = f"🚨 CRITICAL: {test_name} is dangerously HIGH at {numeric_value} {test.get('unit', '')}. Normal: {test.get('reference_range', 'N/A')}. IMMEDIATE ATTENTION REQUIRED!"
                    break
            
            # Non-critical but abnormal
            if not is_critical and status in ["HIGH", "LOW"]:
                severity = "MODERATE"
                direction = "elevated" if status == "HIGH" else "low"
                message = f"⚠️ {test_name} is {direction} at {numeric_value} {test.get('unit', '')}. Reference: {test.get('reference_range', 'N/A')}."
            
            if severity != "NORMAL":
                alert = {
                    "test_name": test_name,
                    "value": numeric_value,
                    "unit": test.get("unit", ""),
                    "status": status,
                    "severity": severity,
                    "reference_range": test.get("reference_range", ""),
                    "message": message,
                    "requires_immediate_attention": is_critical
                }
                alerts.append(alert)
                
                if is_critical:
                    critical_alerts.append(alert)
        
        # Determine overall alert level
        if critical_alerts:
            alert_level = "CRITICAL"
            alert_message = f"🚨 IMMEDIATE ATTENTION REQUIRED: {len(critical_alerts)} critical value(s) detected!"
        elif alerts:
            alert_level = "WARNING"
            alert_message = f"⚠️ {len(alerts)} abnormal value(s) detected. Please review."
        else:
            alert_level = "NORMAL"
            alert_message = "✅ All values within normal range."
        
        structured["alerts"] = alerts
        structured["critical_alerts"] = critical_alerts
        structured["risk_analysis"] = {
            "alert_level": alert_level,
            "alert_message": alert_message,
            "total_tests": len(lab_tests),
            "abnormal_count": len(alerts),
            "critical_count": len(critical_alerts),
            "requires_immediate_attention": len(critical_alerts) > 0
        }
        
        return structured
    
    def _generate_summary(self, structured: Dict) -> Dict:
        """Generate summary statistics."""
        lab_tests = structured.get("lab_tests", [])
        sections = structured.get("sections", {})
        
        abnormal = [t for t in lab_tests if t.get("status") in ["HIGH", "LOW"]]
        
        return {
            "total_tests": len(lab_tests),
            "abnormal_count": len(abnormal),
            "sections_found": list(sections.keys()) if sections else []
        }


# Singleton instance
_llm_structurer = None

def get_llm_structurer(api_key: Optional[str] = None) -> LLMStructurer:
    """Get or create LLM structurer instance."""
    global _llm_structurer
    if _llm_structurer is None or api_key:
        _llm_structurer = LLMStructurer(api_key)
    return _llm_structurer


def structure_with_llm(raw_text: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to structure lab report text using LLM.
    
    Args:
        raw_text: Raw text extracted from lab report
        api_key: Optional Groq API key (uses env var if not provided)
        
    Returns:
        Structured dictionary with patient info, tests, alerts
    """
    structurer = get_llm_structurer(api_key)
    return structurer.structure_report(raw_text)
