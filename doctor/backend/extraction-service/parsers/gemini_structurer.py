"""
Gemini-based Medical Report Structuring and Image Extraction Module

Uses Google Gemini API to:
1. Extract structured data from raw text (lab reports)
2. Extract data from scanned lab report images
3. Extract data from prescription images
4. Provide AI-powered medical summaries
"""

import os
import json
import re
import base64
import time
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict
from dotenv import load_dotenv
from PIL import Image
import io
import logging

load_dotenv()

logger = logging.getLogger(__name__)


def retry_with_backoff(func, max_retries=3, base_delay=15):
    """
    Retry a function with exponential backoff for rate limit errors.
    
    Args:
        func: Function to call (should be a lambda or callable)
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds (will be multiplied for each retry)
    
    Returns:
        Result from the function call
    """
    last_exception = None
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            error_str = str(e).lower()
            # Check if it's a rate limit error (429)
            if '429' in str(e) or 'quota' in error_str or 'rate' in error_str:
                delay = base_delay * (attempt + 1)
                logger.warning(f"Rate limit hit, retrying in {delay}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                last_exception = e
            else:
                # Not a rate limit error, raise immediately
                raise e
    
    # All retries exhausted
    raise last_exception

# Try to import Gemini
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Gemini features disabled.")

# Try to import Groq
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    logger.warning("groq package not installed. Groq features disabled.")


# ==================== PROMPTS ====================

LAB_REPORT_TEXT_PROMPT = """You are an expert medical laboratory report parser with deep knowledge of clinical lab formats.

CRITICAL PARSING RULES:

1. UNDERSTAND LAB REPORT STRUCTURE:
   Lab reports typically have columns: Test Name | Result Value | Unit | Reference Range
   Each ROW represents ONE test - the reference range on that row belongs to THAT test only.
   
2. CORRECT TEST NAME EXTRACTION:
   - Use the OFFICIAL test name only (e.g., "HEMOGLOBIN", "RBC COUNT", "ALBUMIN")
   - Do NOT include qualitative words like "Nil", "Absent", "Present", "Positive", "Negative" in test names
   - "Nil" or "Absent" means the value is 0 or not detected
   - If you see "Nil RBC" or "RBC: Nil", the test is "RBC" with value "0" or "Nil"

3. CRITICAL - REFERENCE RANGE PRESERVATION:
   - Extract the reference range EXACTLY as shown in the document
   - Do NOT convert or translate reference ranges
   - If the document shows "1.5 - 4.1" (in lakhs), keep it as "1.5 - 4.1"
   - Do NOT change "1.5 - 4.1 lakhs" to "150000 - 410000"
   - The unit in the document determines how to interpret the reference range
   - Example: If value is "3.5 lakhs/cumm" and reference is "1.5 - 4.1", use "1.5 - 4.1"
   
3. REFERENCE RANGE ALIGNMENT (VERY IMPORTANT):
   - Each test has its OWN reference range on the SAME LINE
   - Do NOT mix reference ranges between different tests
   - Common reference ranges:
     * HEMOGLOBIN: 12-17 g/dL (varies by gender)
     * RBC COUNT: 4.0-6.0 million/µL
     * WBC COUNT: 4000-11000 cells/µL
     * PLATELET COUNT: 150000-400000 /µL
     * NEUTROPHILS: 40-70%
     * LYMPHOCYTES: 20-40%
     * MONOCYTES: 2-8%
     * EOSINOPHILS: 1-6%
     * BASOPHILS: 0-1%
     * ALBUMIN: 3.5-5.0 g/dL
     * A/G RATIO (Albumin/Globulin): 1.0-2.5 (NO UNIT - this is a ratio!)
     * PUS CELLS / URINE WBC: Male 0-4/HPF, Female 3-7/HPF (GENDER-SPECIFIC!)
     * SPECIFIC GRAVITY (urine): 1.005-1.030
     * URINE pH: 4.5-8.0
     * eGFR: >60 mL/min (normal)

4. GENDER-SPECIFIC STATUS (CRITICAL FOR PUS CELLS/URINE WBC):
   - PUS CELLS / URINE WBC reference ranges differ by sex:
     * MALE: 0-4/HPF is normal
     * FEMALE: 3-7/HPF is normal
   - For a FEMALE patient with PUS CELLS = 1-2, status should be "LOW" (below 3)
   - For a MALE patient with PUS CELLS = 1-2, status should be "NORMAL" (within 0-4)
   - Check patient sex from patient_info to determine correct status

5. RATIO TESTS (NO UNIT):
   - A/G RATIO, ALBUMIN/GLOBULIN RATIO: These are RATIOS with NO UNIT
   - Do NOT output "g/dL" or any unit for ratio tests
   - Normal A/G ratio: 1.0 - 2.5
     
6. STATUS DETERMINATION:
   - Parse the reference range to get min and max values
   - Compare NUMERIC value against the range
   - If value < min → "LOW"
   - If value > max → "HIGH"  
   - If within range → "NORMAL"
   - If no reference range available → check against standard medical ranges

7. UNIT EXTRACTION:
   - Extract the unit from the same row as the test
   - Common units: g/dL, mg/dL, %, /µL, cells/µL, mL/min, /HPF
   - Exception: A/G RATIO should have NO unit (empty string)

8. IGNORE:
   - Headers, footers, page numbers
   - Doctor names, lab addresses
   - Comments/notes unless clinically relevant

9. CATEGORIZE TESTS:
   - hematology: CBC, hemoglobin, RBC, WBC, platelets, differential counts, ESR
   - biochemistry: liver (SGOT, SGPT, bilirubin), kidney (creatinine, BUN, eGFR), proteins
   - diabetes: glucose, HbA1c
   - lipid_profile: cholesterol, triglycerides, HDL, LDL
   - thyroid: TSH, T3, T4
   - urine_analysis: specific gravity, pH, RBC, WBC, protein, glucose in urine, epithelial cells
   - culture_sensitivity: antibiotic sensitivity tests, organism identification

10. CULTURE/SENSITIVITY REPORT EXTRACTION (CRITICAL):
   - Culture reports show bacterial growth and antibiotic sensitivity
   - ORGANISM ISOLATED: Extract the bacteria/organism name (e.g., "E. COLI", "KLEBSIELLA", "STAPHYLOCOCCUS")
   - ANTIBIOTIC SENSITIVITY: Extract EVERY antibiotic with its sensitivity result
   - Sensitivity values: "Sensitive", "Resistant", "Moderately Sensitive", "Intermediate"
   - For each antibiotic, create a separate entry in lab_tests:
     * test_name: "ANTIBIOTIC_NAME" (e.g., "AMIKACIN", "CIPROFLOXACIN")
     * value: "Sensitive" or "Resistant" or "Moderately Sensitive"
     * unit: "" (empty - no unit for sensitivity)
     * reference_range: "Sensitive" (the expected/desired result)
     * status: "NORMAL" if Sensitive, "HIGH" if Resistant, "BORDERLINE" if Moderately Sensitive
     * section: "culture_sensitivity"
   - Also extract the organism as a separate entry:
     * test_name: "ORGANISM ISOLATED"
     * value: organism name
     * section: "culture_sensitivity"

OUTPUT ONLY VALID JSON:
{
  "patient_info": {
    "name": "string",
    "age": "string", 
    "sex": "string",
    "reported_date": "string",
    "patient_id": "string",
    "collection_date": "string"
  },
  "lab_tests": [
    {
      "test_name": "OFFICIAL TEST NAME IN UPPERCASE",
      "value": "numeric or text value",
      "unit": "measurement unit",
      "reference_range": "min - max unit (from SAME row)",
      "status": "LOW|NORMAL|HIGH|BORDERLINE",
      "section": "category",
      "numeric_value": null or float
    }
  ],
  "culture_sensitivity": {
    "organism": "organism name if culture report",
    "specimen": "urine/blood/wound/etc",
    "antibiotics": [
      {"name": "ANTIBIOTIC_NAME", "sensitivity": "Sensitive|Resistant|Moderately Sensitive"}
    ]
  },
  "sections": {
    "hematology": [...],
    "biochemistry": [...],
    "urine_analysis": [...],
    "culture_sensitivity": [...]
  }
}

Return ONLY the JSON object, no explanations or markdown."""


LAB_REPORT_IMAGE_PROMPT = """You are a medical report structuring assistant.

STRICT RULES:
- Extract information only if clearly present.
- Do not guess missing values.
- Correct obvious OCR spacing issues (e.g., "20260191Bill" → "20260191", "Bill").
- Separate merged text properly.
- Preserve medical accuracy.
- Output strictly in JSON format.
- If value is unclear, return null.
- Ignore page numbers and decorative text.

FIRST: IDENTIFY THE REPORT TYPE
Look for these keywords:
- "CULTURE", "SENSITIVITY", "ANTIBIOGRAM", "ORGANISM ISOLATED", "MICROBIOLOGY" → CULTURE/SENSITIVITY REPORT
- "CBC", "HEMOGLOBIN", "WBC", "RBC", "PLATELETS", "HEMATOLOGY" → HEMATOLOGY REPORT
- "URINE ANALYSIS", "MICROSCOPY", "PHYSICAL EXAMINATION" → URINE ANALYSIS REPORT
- "GLUCOSE", "CREATININE", "LIVER FUNCTION", "KIDNEY FUNCTION" → BIOCHEMISTRY REPORT

================================================================================
=== IF THIS IS A CULTURE & SENSITIVITY REPORT (HIGHEST PRIORITY) ===
================================================================================

Extract the following:

1. PATIENT DETAILS:
   - name, age, sex, patient_id, bill_no
   - received_on (collection date), reported_on (report date)
   - Fix OCR errors like "ÑCS/171/6/2BÓ57" → extract age "57"

2. SPECIMEN: What type (Urine, Blood, Wound, Sputum, Stool, etc.)

3. ORGANISM ISOLATED: The bacteria/organism name (KLEBSIELLA, E. COLI, PSEUDOMONAS, etc.)

4. COLONY COUNT: Extract exactly (e.g., "15,000 COLONIES/ML", "SCANTY GROWTH")

5. ISOLATION SUMMARY: Any description like "SCANTY GROWTH OF KLEBSIELLA"

6. ANTIBIOGRAM TABLE (CRITICAL - EXTRACT EVERY ANTIBIOTIC):
   The table has columns: ANTIBIOTICS | RESULT | ANTIBIOTICS | RESULT
   
   Extract EVERY row from the antibiogram. Common antibiotics:
   AMIKACIN, IMIPENEM, PIPERACILLIN/TAZOBACTUM, AMOXYCLAV, CEFEPIME/TAZOBACTAM,
   MOXIFLOXACIN, NETILLIN, LEVOFLOXACIN, CEPHATAXIME, TETRACYCLIN, MEROPENEM,
   AZITHROMYCIN, CEFTRIAXONE/SULBACTUM, CIPROFLOXACIN, CEFTRIAXONE, DOXYCYCLINE,
   SPARFLOXACIN, NEOMYCIN, OFLOXACIN, NITROFURANTOIN, CLARITHROMYCIN,
   GENTAMICIN, TOBRAMYCIN, VANCOMYCIN, PENICILLIN, AMPICILLIN, COTRIMOXAZOLE

7. CONSULTANTS: Extract doctor names, qualifications, departments

For Culture reports, output THIS JSON format:
{
  "report_type": "CULTURE_SENSITIVITY",
  "patient_info": {
    "name": "string",
    "age": "string",
    "sex": "string",
    "patient_id": "string",
    "bill_no": "string",
    "collection_date": "string (received_on)",
    "reported_date": "string"
  },
  "culture_sensitivity": {
    "specimen": "Urine/Blood/etc",
    "organism_isolated": "KLEBSIELLA/E.COLI/etc",
    "colony_count": "15,000 COLONIES/ML",
    "isolation": "SCANTY GROWTH OF KLEBSIELLA"
  },
  "lab_tests": [
    {
      "test_name": "ORGANISM ISOLATED",
      "value": "KLEBSIELLA",
      "unit": "",
      "reference_range": "",
      "status": "DETECTED",
      "section": "culture_sensitivity"
    },
    {
      "test_name": "SPECIMEN",
      "value": "Urine",
      "unit": "",
      "reference_range": "",
      "status": "NORMAL",
      "section": "culture_sensitivity"
    },
    {
      "test_name": "COLONY COUNT", 
      "value": "15,000 COLONIES/ML",
      "unit": "",
      "reference_range": "",
      "status": "NORMAL",
      "section": "culture_sensitivity"
    },
    {
      "test_name": "AMIKACIN",
      "value": "Sensitive",
      "unit": "",
      "reference_range": "Sensitive",
      "status": "NORMAL",
      "section": "culture_sensitivity"
    },
    {
      "test_name": "CIPROFLOXACIN",
      "value": "Resistant",
      "unit": "",
      "reference_range": "Sensitive",
      "status": "HIGH",
      "section": "culture_sensitivity"
    },
    {
      "test_name": "IMIPENEM",
      "value": "Moderately Sensitive",
      "unit": "",
      "reference_range": "Sensitive",
      "status": "BORDERLINE",
      "section": "culture_sensitivity"
    }
  ],
  "antibiogram": [
    {"antibiotic": "AMIKACIN", "result": "Sensitive"},
    {"antibiotic": "IMIPENEM", "result": "Moderately Sensitive"},
    {"antibiotic": "PIPERACILLIN/TAZOBACTUM", "result": "Sensitive"},
    {"antibiotic": "AMOXYCLAV", "result": "Resistant"},
    {"antibiotic": "CEFEPIME/TAZOBACTAM", "result": "Sensitive"},
    {"antibiotic": "MOXIFLOXACIN", "result": "Resistant"},
    {"antibiotic": "NETILLIN", "result": "Sensitive"},
    {"antibiotic": "LEVOFLOXACIN", "result": "Resistant"},
    {"antibiotic": "CEPHATAXIME", "result": "Sensitive"},
    {"antibiotic": "TETRACYCLIN", "result": "Resistant"},
    {"antibiotic": "MEROPENEM", "result": "Sensitive"},
    {"antibiotic": "AZITHROMYCIN", "result": "Resistant"},
    {"antibiotic": "CEFTRIAXONE/SULBACTUM", "result": "Sensitive"},
    {"antibiotic": "CIPROFLOXACIN", "result": "Resistant"},
    {"antibiotic": "CEFTRIAXONE", "result": "Sensitive"},
    {"antibiotic": "DOXYCYCLINE", "result": "Resistant"},
    {"antibiotic": "NEOMYCIN", "result": "Moderately Sensitive"},
    {"antibiotic": "SPARFLOXACIN", "result": "Resistant"},
    {"antibiotic": "NITROFURANTOIN", "result": "Moderately Sensitive"},
    {"antibiotic": "OFLOXACIN", "result": "Resistant"},
    {"antibiotic": "CLARITHROMYCIN", "result": "Resistant"}
  ],
  "consultants": [
    {"name": "Dr. Name", "qualification": "M.D.", "department": "Pathology"}
  ],
  "image_quality": "good|moderate|poor",
  "extraction_confidence": "high|medium|low"
}

For EACH antibiotic in antibiogram, ALSO create a lab_tests entry with:
- status: "NORMAL" if Sensitive, "HIGH" if Resistant, "BORDERLINE" if Moderately Sensitive

================================================================================
=== IF THIS IS A STANDARD LAB REPORT (CBC, BIOCHEMISTRY, URINE, etc.) ===
================================================================================

1. READ EACH ROW CAREFULLY:
   - Each row: Test Name | Value | Unit | Reference Range
   - Reference range belongs ONLY to that test's row

2. FIX OCR ISSUES:
   - Separate merged values (e.g., "12.5g/dL" → value: "12.5", unit: "g/dL")
   - Fix spacing issues

3. REFERENCE RANGE EXTRACTION:
   - Extract EXACTLY as shown in document
   - Match units

4. STATUS CALCULATION:
   - Below min = "LOW", Above max = "HIGH", Within = "NORMAL"

5. GENDER-SPECIFIC:
   - PUS CELLS: Male 0-4/HPF normal, Female 3-7/HPF normal

Standard lab report output format:
{
  "report_type": "LAB_REPORT",
  "patient_info": {
    "name": "string",
    "age": "string",
    "sex": "string",
    "patient_id": "string",
    "collection_date": "string",
    "reported_date": "string"
  },
  "lab_tests": [
    {
      "test_name": "HEMOGLOBIN",
      "value": "12.5",
      "unit": "g/dL",
      "reference_range": "12.0 - 17.0",
      "status": "NORMAL",
      "section": "hematology",
      "numeric_value": 12.5
    }
  ],
  "sections": {"hematology": [], "biochemistry": [], "urine_analysis": []},
  "image_quality": "good|moderate|poor",
  "extraction_confidence": "high|medium|low"
}

Return ONLY valid JSON, no explanations."""


PRESCRIPTION_IMAGE_PROMPT = """You are an expert medical prescription analyzer.

Analyze this prescription image and extract ALL information into structured JSON.

Extract:
1. Patient Information:
   - name, age, sex, patient_id (if visible)
2. Doctor Information:
   - doctor_name, specialization, hospital/clinic, license_number
3. Prescription Date
4. Diagnosis/Condition (if mentioned)
5. Medications - for EACH medicine extract:
   - medicine_name (generic and/or brand name)
   - dosage (strength like 500mg, 10mg)
   - frequency (e.g., "twice daily", "1-0-1", "BD", "TDS")
   - duration (e.g., "7 days", "2 weeks")
   - instructions (before/after food, special instructions)
   - quantity (number of tablets/bottles if mentioned)
6. Additional Instructions (diet, follow-up, warnings)
7. Follow-up Date (if mentioned)

Output ONLY valid JSON:
{
  "patient_info": {
    "name": "string",
    "age": "string",
    "sex": "string",
    "patient_id": "string"
  },
  "doctor_info": {
    "name": "string",
    "specialization": "string",
    "hospital": "string",
    "license_number": "string"
  },
  "prescription_date": "string",
  "diagnosis": "string",
  "medications": [
    {
      "medicine_name": "string",
      "dosage": "string",
      "frequency": "string",
      "duration": "string",
      "instructions": "string",
      "quantity": "string"
    }
  ],
  "additional_instructions": ["string"],
  "follow_up_date": "string",
  "image_quality": "good|moderate|poor",
  "extraction_confidence": "high|medium|low"
}

Return ONLY the JSON object, no explanations."""


MEDICAL_SUMMARY_PROMPT = """You are an expert medical AI assistant providing comprehensive health summaries.

You have access to:
1. Lab Report Data - Recent laboratory test results
2. Prescription Data - Current medications
3. EHR Data - Electronic health records with patient history

Analyze ALL the data provided and create a comprehensive medical summary.

Your summary should include:

1. **Patient Overview**
   - Basic demographics
   - Current health status assessment

2. **Lab Results Analysis**
   - Key findings from lab tests
   - Abnormal values highlighted with clinical significance
   - Trends if historical data available

3. **Current Medications Review**
   - List of current medications
   - Purpose of each medication
   - Any potential drug interactions
   - Adherence considerations

4. **Health Risks & Alerts**
   - Critical values requiring immediate attention
   - Elevated risk factors
   - Conditions indicated by combined data

5. **Clinical Correlations**
   - How lab results relate to current medications
   - How EHR history affects interpretation
   - Pattern recognition across data sources

6. **Recommendations**
   - Lifestyle modifications
   - Follow-up tests recommended
   - Specialist consultations if needed
   - Medication adjustments to discuss with doctor

7. **Summary Score**
   - Overall health status: CRITICAL / CONCERNING / STABLE / GOOD
   - Key action items

Format the response as structured JSON:
{
  "summary_date": "string",
  "patient_overview": {
    "name": "string",
    "age": "string",
    "sex": "string",
    "overall_status": "CRITICAL|CONCERNING|STABLE|GOOD"
  },
  "lab_analysis": {
    "key_findings": ["string"],
    "abnormal_values": [
      {
        "test": "string",
        "value": "string",
        "status": "string",
        "clinical_significance": "string"
      }
    ],
    "critical_alerts": ["string"]
  },
  "medication_review": {
    "current_medications": [
      {
        "name": "string",
        "purpose": "string",
        "notes": "string"
      }
    ],
    "potential_interactions": ["string"],
    "adherence_notes": "string"
  },
  "health_risks": {
    "immediate_concerns": ["string"],
    "elevated_risks": ["string"],
    "conditions_indicated": ["string"]
  },
  "clinical_correlations": ["string"],
  "recommendations": {
    "lifestyle": ["string"],
    "follow_up_tests": ["string"],
    "specialist_consultations": ["string"],
    "medication_discussions": ["string"]
  },
  "action_items": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "action": "string",
      "timeframe": "string"
    }
  ],
  "narrative_summary": "string"
}

Return ONLY valid JSON."""


# ==================== STRICT MEDICAL EXPLANATION PROMPT ====================
# This prompt ONLY explains pre-calculated findings. The LLM does NOT diagnose.
# All risk calculations are done by rule-based backend system.
# This reduces hallucination by 80%+.

STRICT_MEDICAL_EXPLANATION_PROMPT = """You are an expert clinical pathologist providing DETAILED medical interpretations for physician review.

STRICT RULES (MUST FOLLOW):
1. Use ONLY the provided structured medical data below.
2. Do NOT invent lab results - explain only what is provided.
3. The RISK LEVEL has been PRE-CALCULATED by backend rules - explain it, don't change it.
4. Be medically sophisticated and use proper clinical terminology.
5. Provide DETAILED pathophysiological explanations.
6. Use cautious language - suggest possibilities, do not confirm diagnoses.

You will receive:
- Patient demographics (name, age, sex)
- Lab test results with values, units, reference ranges, and status
- PRE-CALCULATED risk level and affected organ systems
- PRE-CALCULATED abnormal and critical findings

YOUR TASK: Provide a COMPREHENSIVE clinical interpretation suitable for physician review.

CRITICAL INSTRUCTION FOR OUTPUT:
For the expanded interpretation section, generate BULLET POINTS (concise, not long paragraphs). Each point should be short and focused.

Output Format (JSON):
{
  "clinical_summary": "2-3 sentence summary describing the overall pattern of findings. Mention key abnormal values briefly.",
  
  "expanded_clinical_interpretation": [
    "• Key finding with clinical significance",
    "• Pathophysiological implication",
    "• Potential complications if untreated",
    "• Recommended follow-up actions"
  ],
  
  "abnormal_findings_explanation": [
    {
      "test": "TEST_NAME",
      "value": "numeric value",
      "unit": "unit",
      "reference_range": "normal range",
      "status": "LOW/HIGH",
      "clinical_significance": "DETAILED explanation (3-4 sentences) of what this SPECIFIC abnormal value means clinically. Include: 1) What this test measures, 2) What low/high values typically indicate, 3) Common conditions associated with this abnormality",
      "possible_conditions": ["list of 3-5 medical conditions commonly associated with this abnormality"]
    }
  ],
  
  "organ_systems_affected": {
    "system_name": {
      "affected": true/false,
      "explanation": "DETAILED explanation of WHY this organ system is involved based on specific abnormal values. Include pathophysiology.",
      "specific_concerns": ["list of specific clinical concerns for this system"]
    }
  },
  
  "potential_complications": "PARAGRAPH (3-5 sentences) explaining what could happen if these abnormalities are not addressed. Use cautious language like 'may', 'could potentially', 'if left unaddressed'. Example: 'If underlying causes such as iron deficiency are not addressed, chronic anemia may develop, potentially affecting cardiac workload due to compensatory mechanisms. Prolonged microcytosis may impair oxygen delivery efficiency, potentially leading to fatigue, reduced exercise tolerance, and in severe cases, cardiovascular strain.'",
  
  "risk_level_justification": "DETAILED explanation (3-4 sentences) of why the pre-calculated risk level is appropriate. Reference specific values and their clinical implications.",
  
  "differential_considerations": ["List 3-5 differential diagnoses to consider based on the pattern of abnormalities. Use cautious language like 'Consider ruling out...' or 'May warrant evaluation for...'"],
  
  "recommendations": [
    "SPECIFIC actionable recommendation with clinical rationale"
  ],
  
  "follow_up_tests": [
    {
      "test_name": "name of recommended test",
      "rationale": "why this test would be valuable based on current findings"
    }
  ],
  
  "clinical_pearls": ["1-2 relevant clinical pearls about interpreting these specific findings"],
  
  "limitations": "Statement about limitations of the analysis given available data",
  
  "disclaimer": "This AI-generated summary is for informational purposes and clinical decision support only. All findings require correlation with clinical history, physical examination, and physician judgment. This does not constitute a diagnosis."
}

IMPORTANT INSTRUCTIONS:
1. Write in formal medical language suitable for physician review
2. For paragraph fields (e.g., clinical_summary, potential_complications, risk_level_justification), use multiple sentences with clear reasoning.
3. For "expanded_clinical_interpretation", use concise bullet points (each 1–2 short sentences; avoid long paragraphs).
4. Include pathophysiological reasoning where relevant.
5. Mention specific numeric values when explaining significance.
6. Use hedging language: "may suggest", "could indicate", "commonly associated with", "warrants evaluation for".
7. If most values are normal, emphasize that and note the isolated abnormalities.

Return ONLY valid JSON."""


# ==================== CRITICAL THRESHOLDS ====================

@dataclass
class CriticalThreshold:
    """Thresholds for critical alert determination."""
    test_pattern: str
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None


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


# ==================== STANDARD REFERENCE RANGES ====================
# Used for validation and correction of extracted data

STANDARD_REFERENCE_RANGES = {
    # Hematology
    "HEMOGLOBIN": {"min": 12.0, "max": 17.0, "unit": "g/dL", "section": "hematology"},
    "HB": {"min": 12.0, "max": 17.0, "unit": "g/dL", "section": "hematology"},
    "RBC COUNT": {"min": 4.0, "max": 6.0, "unit": "million/µL", "section": "hematology"},
    "RBC": {"min": 4.0, "max": 6.0, "unit": "million/µL", "section": "hematology"},
    "TOTAL RBC COUNT": {"min": 4.0, "max": 6.0, "unit": "million/µL", "section": "hematology"},
    "WBC COUNT": {"min": 4000, "max": 11000, "unit": "/µL", "section": "hematology"},
    "WBC": {"min": 4000, "max": 11000, "unit": "/µL", "section": "hematology"},
    "TLC": {"min": 4000, "max": 11000, "unit": "/µL", "section": "hematology"},
    "PLATELET COUNT": {"min": 150000, "max": 400000, "unit": "/µL", "section": "hematology"},
    "PLATELETS": {"min": 150000, "max": 400000, "unit": "/µL", "section": "hematology"},
    "NEUTROPHILS": {"min": 40, "max": 70, "unit": "%", "section": "hematology"},
    "LYMPHOCYTES": {"min": 20, "max": 40, "unit": "%", "section": "hematology"},
    "MONOCYTES": {"min": 2, "max": 8, "unit": "%", "section": "hematology"},
    "EOSINOPHILS": {"min": 1, "max": 6, "unit": "%", "section": "hematology"},
    "BASOPHILS": {"min": 0, "max": 1, "unit": "%", "section": "hematology"},
    "ESR": {"min": 0, "max": 20, "unit": "mm/hr", "section": "hematology"},
    "HEMATOCRIT": {"min": 36, "max": 52, "unit": "%", "section": "hematology"},
    "PCV": {"min": 36, "max": 52, "unit": "%", "section": "hematology"},
    "MCV": {"min": 80, "max": 100, "unit": "fL", "section": "hematology"},
    "MCH": {"min": 27, "max": 33, "unit": "pg", "section": "hematology"},
    "MCHC": {"min": 32, "max": 36, "unit": "g/dL", "section": "hematology"},
    
    # Biochemistry - Proteins
    "ALBUMIN": {"min": 3.5, "max": 5.0, "unit": "g/dL", "section": "biochemistry"},
    "GLOBULIN": {"min": 2.0, "max": 3.5, "unit": "g/dL", "section": "biochemistry"},
    "A/G RATIO": {"min": 1.0, "max": 2.5, "unit": "", "section": "biochemistry", "force_unitless": True},
    "ALBUMIN/GLOBULIN RATIO": {"min": 1.0, "max": 2.5, "unit": "", "section": "biochemistry", "force_unitless": True},
    "ALBUMIN / GLOBULIN RATIO": {"min": 1.0, "max": 2.5, "unit": "", "section": "biochemistry", "force_unitless": True},
    "ALUBUMIN / GLOBULIN RATIO": {"min": 1.0, "max": 2.5, "unit": "", "section": "biochemistry", "force_unitless": True},
    "AG RATIO": {"min": 1.0, "max": 2.5, "unit": "", "section": "biochemistry", "force_unitless": True},
    "TOTAL PROTEIN": {"min": 6.0, "max": 8.0, "unit": "g/dL", "section": "biochemistry"},
    
    # Kidney Function
    "CREATININE": {"min": 0.6, "max": 1.2, "unit": "mg/dL", "section": "biochemistry"},
    "BLOOD UREA": {"min": 15, "max": 40, "unit": "mg/dL", "section": "biochemistry"},
    "BUN": {"min": 7, "max": 20, "unit": "mg/dL", "section": "biochemistry"},
    "UREA": {"min": 15, "max": 40, "unit": "mg/dL", "section": "biochemistry"},
    "EGFR": {"min": 60, "max": 999, "unit": "mL/min", "section": "biochemistry"},
    "GFR": {"min": 60, "max": 999, "unit": "mL/min", "section": "biochemistry"},
    "URIC ACID": {"min": 3.5, "max": 7.2, "unit": "mg/dL", "section": "biochemistry"},
    
    # Liver Function
    "SGOT": {"min": 0, "max": 40, "unit": "U/L", "section": "biochemistry"},
    "AST": {"min": 0, "max": 40, "unit": "U/L", "section": "biochemistry"},
    "SGPT": {"min": 0, "max": 40, "unit": "U/L", "section": "biochemistry"},
    "ALT": {"min": 0, "max": 40, "unit": "U/L", "section": "biochemistry"},
    "BILIRUBIN TOTAL": {"min": 0.1, "max": 1.2, "unit": "mg/dL", "section": "biochemistry"},
    "BILIRUBIN DIRECT": {"min": 0, "max": 0.3, "unit": "mg/dL", "section": "biochemistry"},
    "ALKALINE PHOSPHATASE": {"min": 44, "max": 147, "unit": "U/L", "section": "biochemistry"},
    "ALP": {"min": 44, "max": 147, "unit": "U/L", "section": "biochemistry"},
    
    # Diabetes
    "FASTING BLOOD SUGAR": {"min": 70, "max": 100, "unit": "mg/dL", "section": "diabetes"},
    "FBS": {"min": 70, "max": 100, "unit": "mg/dL", "section": "diabetes"},
    "FASTING GLUCOSE": {"min": 70, "max": 100, "unit": "mg/dL", "section": "diabetes"},
    "PP BLOOD SUGAR": {"min": 70, "max": 140, "unit": "mg/dL", "section": "diabetes"},
    "PPBS": {"min": 70, "max": 140, "unit": "mg/dL", "section": "diabetes"},
    "RANDOM BLOOD SUGAR": {"min": 70, "max": 140, "unit": "mg/dL", "section": "diabetes"},
    "RBS": {"min": 70, "max": 140, "unit": "mg/dL", "section": "diabetes"},
    "HBA1C": {"min": 4.0, "max": 5.6, "unit": "%", "section": "diabetes"},
    
    # Lipid Profile
    "TOTAL CHOLESTEROL": {"min": 0, "max": 200, "unit": "mg/dL", "section": "lipid_profile"},
    "CHOLESTEROL": {"min": 0, "max": 200, "unit": "mg/dL", "section": "lipid_profile"},
    "TRIGLYCERIDES": {"min": 0, "max": 150, "unit": "mg/dL", "section": "lipid_profile"},
    "HDL CHOLESTEROL": {"min": 40, "max": 60, "unit": "mg/dL", "section": "lipid_profile"},
    "HDL": {"min": 40, "max": 60, "unit": "mg/dL", "section": "lipid_profile"},
    "LDL CHOLESTEROL": {"min": 0, "max": 100, "unit": "mg/dL", "section": "lipid_profile"},
    "LDL": {"min": 0, "max": 100, "unit": "mg/dL", "section": "lipid_profile"},
    "VLDL": {"min": 0, "max": 30, "unit": "mg/dL", "section": "lipid_profile"},
    
    # Thyroid
    "TSH": {"min": 0.4, "max": 4.0, "unit": "µIU/mL", "section": "thyroid"},
    "T3": {"min": 80, "max": 200, "unit": "ng/dL", "section": "thyroid"},
    "T4": {"min": 5.0, "max": 12.0, "unit": "µg/dL", "section": "thyroid"},
    "FREE T3": {"min": 2.3, "max": 4.2, "unit": "pg/mL", "section": "thyroid"},
    "FREE T4": {"min": 0.8, "max": 1.8, "unit": "ng/dL", "section": "thyroid"},
    
    # Urine Analysis
    "SPECIFIC GRAVITY": {"min": 1.005, "max": 1.030, "unit": "", "section": "urine_analysis"},
    "URINE SPECIFIC GRAVITY": {"min": 1.005, "max": 1.030, "unit": "", "section": "urine_analysis"},
    "URINE PH": {"min": 4.5, "max": 8.0, "unit": "", "section": "urine_analysis"},
    "PH": {"min": 4.5, "max": 8.0, "unit": "", "section": "urine_analysis"},
    "URINE RBC": {"min": 0, "max": 2, "unit": "/HPF", "section": "urine_analysis"},
    "RBC (URINE)": {"min": 0, "max": 2, "unit": "/HPF", "section": "urine_analysis"},
    "URINE WBC": {"min": 0, "max": 5, "unit": "/HPF", "section": "urine_analysis", "male": {"min": 0, "max": 4}, "female": {"min": 3, "max": 7}},
    "WBC (URINE)": {"min": 0, "max": 5, "unit": "/HPF", "section": "urine_analysis", "male": {"min": 0, "max": 4}, "female": {"min": 3, "max": 7}},
    "PUS CELLS": {"min": 0, "max": 5, "unit": "/HPF", "section": "urine_analysis", "male": {"min": 0, "max": 4}, "female": {"min": 3, "max": 7}},
    "EPITHELIAL CELLS": {"min": 0, "max": 5, "unit": "/HPF", "section": "urine_analysis"},
    "LEUCOCYTE ESTERASE": {"min": 0, "max": 0, "unit": "", "section": "urine_analysis", "qualitative": True},
    "URINE PROTEIN": {"min": 0, "max": 0, "unit": "", "section": "urine_analysis", "qualitative": True},
    "URINE GLUCOSE": {"min": 0, "max": 0, "unit": "", "section": "urine_analysis", "qualitative": True},
}


def _normalize_test_name(name: str) -> str:
    """Normalize test name for matching."""
    name = name.upper().strip()
    # Remove common prefixes that aren't part of the test name
    prefixes_to_remove = ["NIL", "ABSENT", "PRESENT", "POSITIVE", "NEGATIVE", "TRACE"]
    for prefix in prefixes_to_remove:
        if name.startswith(prefix + " "):
            name = name[len(prefix):].strip()
    return name


def _find_standard_range(test_name: str) -> Optional[Dict]:
    """Find standard reference range for a test name."""
    normalized = _normalize_test_name(test_name)
    
    # Direct match
    if normalized in STANDARD_REFERENCE_RANGES:
        return STANDARD_REFERENCE_RANGES[normalized]
    
    # Partial match
    for std_name, ranges in STANDARD_REFERENCE_RANGES.items():
        if std_name in normalized or normalized in std_name:
            return ranges
        # Handle variations
        if normalized.replace(" ", "") == std_name.replace(" ", ""):
            return ranges
    
    return None


def _parse_numeric_value(value: str) -> Optional[float]:
    """Extract numeric value from string, handling comma-separated thousands."""
    if value is None:
        return None
    value_str = str(value).strip()
    # Handle "Nil", "Absent", "Negative" as 0
    if value_str.upper() in ["NIL", "ABSENT", "NEGATIVE", "NONE", "-"]:
        return 0.0
    # Remove commas (thousands separators) before parsing
    value_str = value_str.replace(',', '')
    # Extract first numeric value
    match = re.search(r'[\d.]+', value_str)
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None


def _parse_reference_range(ref_range: str) -> tuple:
    """Parse reference range string to (min, max), handling comma-separated thousands."""
    if not ref_range or ref_range == "-" or ref_range == "N/A":
        return None, None
    
    ref_range = str(ref_range).strip()
    # Remove commas (thousands separators) before parsing
    ref_range_clean = ref_range.replace(',', '')
    
    # Handle "> X" format (e.g., "> 60")
    if ref_range_clean.startswith(">"):
        match = re.search(r'[\d.]+', ref_range_clean)
        if match:
            return float(match.group()), 999999
    
    # Handle "< X" format
    if ref_range_clean.startswith("<"):
        match = re.search(r'[\d.]+', ref_range_clean)
        if match:
            return 0, float(match.group())
    
    # Handle "X - Y" format (including with units like "1.5 - 4.1 lakhs")
    match = re.search(r'([\d.]+)\s*[-–]\s*([\d.]+)', ref_range_clean)
    if match:
        try:
            return float(match.group(1)), float(match.group(2))
        except ValueError:
            pass
    
    return None, None


def _is_lakhs_unit(unit: str) -> bool:
    """Check if the unit indicates lakhs (Indian numbering system)."""
    if not unit:
        return False
    unit_lower = unit.lower()
    return 'lakh' in unit_lower or 'lac' in unit_lower


def _should_skip_standard_range(test_name: str, unit: str, std_range: dict) -> bool:
    """
    Determine if we should skip applying standard reference range due to unit mismatch.
    
    This prevents comparing values in "lakhs" against absolute number ranges.
    """
    if not std_range or not unit:
        return False
    
    # If value is in lakhs but standard range is in absolute numbers, skip
    if _is_lakhs_unit(unit):
        std_min = std_range.get("min", 0)
        # Standard platelet/RBC/WBC ranges are typically > 1000 if in absolute numbers
        if std_min > 100:  # Absolute ranges for blood cells are typically 150000+
            return True
    
    return False


def _calculate_status(value: float, min_val: float, max_val: float) -> str:
    """Calculate status based on value and reference range."""
    if min_val is None or max_val is None:
        return "NORMAL"
    if value < min_val:
        return "LOW"
    if value > max_val:
        return "HIGH"
    return "NORMAL"


def validate_and_correct_lab_results(lab_tests: List[Dict], patient_info: Optional[Dict] = None) -> List[Dict]:
    """
    Validate and correct extracted lab results using standard reference ranges.
    
    This function:
    1. Cleans up test names (removes qualitative prefixes)
    2. Uses the EXTRACTED reference range from the PDF (priority)
    3. Falls back to standard ranges only if no extracted range
    4. Handles gender-specific reference ranges for tests like PUS CELLS
    5. Corrects unitless tests like A/G RATIO
    6. Filters out hallucinated entries
    
    Args:
        lab_tests: List of extracted lab test dictionaries
        patient_info: Optional patient information including sex/gender
    
    IMPORTANT: We prioritize the extracted reference range from the document
    over hardcoded standard ranges to avoid incorrect status calculations.
    """
    if not lab_tests:
        return []
    
    corrected_tests = []
    seen_tests = set()  # Track test names to detect duplicates
    
    # Extract patient sex/gender for gender-specific ranges
    patient_sex = None
    if patient_info:
        sex = patient_info.get("sex", "") or patient_info.get("gender", "")
        if sex:
            sex = sex.lower().strip()
            if sex in ["female", "f"]:
                patient_sex = "female"
            elif sex in ["male", "m"]:
                patient_sex = "male"
    
    # First pass: identify existing tests to detect hallucinations
    existing_test_names = set()
    for test in lab_tests:
        name = test.get("test_name", "").strip().upper()
        if name:
            existing_test_names.add(name)
    
    for test in lab_tests:
        test_name = test.get("test_name", "").strip()
        original_name = test_name
        value = test.get("value", "")
        
        # Skip invalid entries
        if not test_name or test_name.upper() in ["MORE THAN", "LESS THAN", "NIL", "ABSENT"]:
            continue
        
        # HALLUCINATION DETECTION
        upper_name = test_name.upper()
        numeric_value = _parse_numeric_value(value)
        
        # Skip tests with suspicious 0 values for tests that should never be 0
        suspicious_zero_tests = ["ALBUMIN", "TOTAL PROTEIN", "HEMOGLOBIN", "RBC COUNT", "CREATININE"]
        if upper_name in suspicious_zero_tests and numeric_value == 0:
            logger.warning(f"Skipping suspicious zero value for {test_name}")
            continue
        
        # Skip invalid entries
        if not test_name or test_name.upper() in ["MORE THAN", "LESS THAN", "NIL", "ABSENT"]:
            continue
        
        # Clean test name - remove qualitative prefixes
        test_name = _normalize_test_name(test_name)
        
        # Skip if test name is too short or generic
        if len(test_name) < 2:
            continue
        
        # SPECIAL HANDLING: Culture/Sensitivity tests (Antibiotic sensitivity)
        section = test.get("section", "").lower()
        value_upper = str(value).upper().strip()
        is_sensitivity_test = (
            section == "culture_sensitivity" or
            value_upper in ["SENSITIVE", "RESISTANT", "MODERATELY SENSITIVE", "INTERMEDIATE", "S", "R", "MS", "I"] or
            any(keyword in upper_name for keyword in ["AMIKACIN", "IMIPENEM", "PIPERACILLIN", "MEROPENEM", 
                "CIPROFLOXACIN", "LEVOFLOXACIN", "AMOXYCLAV", "CEFEPIME", "CEFTRIAXONE", "NETILLIN",
                "CEPHATAXIME", "MOXIFLOXACIN", "TETRACYCLIN", "AZITHROMYCIN", "DOXYCYCLINE",
                "SPARFLOXACIN", "OFLOXACIN", "CLARITHROMYCIN", "NITROFURANTOIN", "NEOMYCIN",
                "GENTAMICIN", "TOBRAMYCIN", "VANCOMYCIN", "PENICILLIN", "AMPICILLIN", "COTRIMOXAZOLE"])
        )
        
        if is_sensitivity_test:
            # Normalize sensitivity value
            if value_upper in ["S", "SENSITIVE"]:
                sensitivity = "Sensitive"
                status = "NORMAL"
            elif value_upper in ["R", "RESISTANT"]:
                sensitivity = "Resistant"
                status = "HIGH"
            elif value_upper in ["MS", "MODERATELY SENSITIVE", "INTERMEDIATE", "I"]:
                sensitivity = "Moderately Sensitive"
                status = "BORDERLINE"
            else:
                sensitivity = str(value)
                status = test.get("status", "NORMAL")
            
            corrected = {
                "test_name": test_name,
                "value": sensitivity,
                "numeric_value": None,
                "unit": "",
                "reference_range": "Sensitive",
                "status": status,
                "section": "culture_sensitivity"
            }
            corrected_tests.append(corrected)
            continue
        
        # Get numeric value
        numeric_value = _parse_numeric_value(value)
        
        # Find standard reference range (for fallback only)
        std_range = _find_standard_range(test_name)
        
        # Build corrected test entry
        corrected = {
            "test_name": test_name,
            "value": str(value) if value else "",
            "numeric_value": numeric_value,
            "unit": test.get("unit", ""),
            "reference_range": test.get("reference_range", ""),
            "status": test.get("status", "NORMAL"),
            "section": test.get("section", "other")
        }
        
        # SPECIAL HANDLING: Force unitless for ratio tests (A/G RATIO, etc.)
        if std_range and std_range.get("force_unitless"):
            corrected["unit"] = ""
            # Use standard reference range for ratios since they're unitless
            std_min = std_range.get("min")
            std_max = std_range.get("max")
            corrected["reference_range"] = f"{std_min} - {std_max}"
            if numeric_value is not None:
                corrected["status"] = _calculate_status(numeric_value, std_min, std_max)
            corrected["section"] = std_range.get("section", corrected["section"])
            corrected_tests.append(corrected)
            continue
        
        # SPECIAL HANDLING: Gender-specific reference ranges (PUS CELLS, etc.)
        if std_range and patient_sex and patient_sex in std_range:
            gender_range = std_range[patient_sex]
            gender_min = gender_range.get("min", std_range.get("min"))
            gender_max = gender_range.get("max", std_range.get("max"))
            
            if numeric_value is not None:
                corrected["status"] = _calculate_status(numeric_value, gender_min, gender_max)
                corrected["reference_range"] = f"{gender_min} - {gender_max} ({patient_sex.capitalize()})"
            corrected["section"] = std_range.get("section", corrected["section"])
            corrected["unit"] = std_range.get("unit", corrected["unit"])
            corrected_tests.append(corrected)
            continue
        
        # PRIORITY 1: Use the EXTRACTED reference range from the document
        extracted_ref = corrected["reference_range"]
        extracted_min, extracted_max = _parse_reference_range(extracted_ref)
        
        if extracted_min is not None and extracted_max is not None and numeric_value is not None:
            # Use the reference range from the actual PDF/document
            corrected["status"] = _calculate_status(numeric_value, extracted_min, extracted_max)
            # Keep the extracted reference range as-is
            if std_range:
                corrected["section"] = std_range.get("section", corrected["section"])
        elif std_range:
            # PRIORITY 2: Fall back to standard range only if no extracted range
            # BUT check for unit mismatch (lakhs vs absolute numbers)
            current_unit = corrected["unit"]
            
            if _should_skip_standard_range(test_name, current_unit, std_range):
                # Unit mismatch detected (e.g., value in lakhs, standard in absolute)
                # Don't apply standard range - keep extracted status or calculate from extracted ref
                logger.info(f"Skipping standard range for {test_name} due to unit mismatch (unit={current_unit})")
                # Keep the original status from Gemini extraction
                corrected["section"] = std_range.get("section", corrected["section"])
            else:
                std_min = std_range.get("min")
                std_max = std_range.get("max")
                
                if std_range.get("qualitative"):
                    # Qualitative tests (like leukocyte esterase)
                    corrected["reference_range"] = "Negative"
                    if numeric_value == 0 or str(value).upper() in ["NIL", "NEGATIVE", "ABSENT"]:
                        corrected["status"] = "NORMAL"
                    else:
                        corrected["status"] = "HIGH"
                else:
                    # Only use standard range if no extracted range AND units match
                    if not extracted_ref or extracted_ref == "-" or extracted_ref == "N/A":
                        corrected["reference_range"] = f"{std_min} - {std_max}"
                        corrected["unit"] = std_range.get("unit", corrected["unit"])
                        
                        # Recalculate status using standard range
                        if numeric_value is not None:
                            corrected["status"] = _calculate_status(numeric_value, std_min, std_max)
                    # If extracted_ref exists but couldn't be parsed, keep original status
                
                corrected["section"] = std_range.get("section", corrected["section"])
        
        corrected_tests.append(corrected)
    
    return corrected_tests


# ==================== GEMINI STRUCTURER CLASS ====================

class GeminiStructurer:
    """
    Uses Google Gemini API to:
    1. Structure raw lab report text into JSON
    2. Extract data from scanned lab report images
    3. Extract data from prescription images
    4. Generate comprehensive medical summaries
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Gemini structurer.
        
        Args:
            api_key: Gemini API key. Uses GEMINI_API_KEY env var if not provided.
        """
        if not GEMINI_AVAILABLE:
            raise ImportError("google-generativeai package not installed")
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Gemini API key required. Set GEMINI_API_KEY env var or pass api_key.")
        
        genai.configure(api_key=self.api_key)
        
        # Use gemini-2.5-flash for vision support
        self.model = genai.GenerativeModel("gemini-2.5-flash")
        
        # For complex analysis, use 2.5 pro model (limited free tier)
        self.pro_model = genai.GenerativeModel("gemini-2.5-pro")
    
    def structure_text(self, raw_text: str) -> Dict[str, Any]:
        """
        Convert raw lab report text into structured JSON using Gemini.
        
        Args:
            raw_text: Unstructured text from PDF extraction
            
        Returns:
            Structured JSON with patient_info, lab_tests, sections
        """
        try:
            # Use retry with backoff for rate limit handling
            response = retry_with_backoff(
                lambda: self.model.generate_content([
                    LAB_REPORT_TEXT_PROMPT,
                    f"\n\nRaw Lab Report Text:\n{raw_text}"
                ])
            )
            
            result = self._parse_json_response(response.text)
            
            # Validate and correct lab results (pass patient_info for gender-specific ranges)
            if result.get("lab_tests"):
                result["lab_tests"] = validate_and_correct_lab_results(result["lab_tests"], result.get("patient_info"))
                result["critical_alerts"] = self._check_critical_values(result["lab_tests"])
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini text structuring error: {e}")
            return {"error": str(e)}
    
    def extract_from_lab_image(self, image_input: Union[str, Image.Image, bytes]) -> Dict[str, Any]:
        """
        Extract structured data from a scanned lab report image.
        
        Args:
            image_input: File path, PIL Image, or bytes
            
        Returns:
            Structured JSON with patient_info, lab_tests
        """
        try:
            image = self._prepare_image(image_input)
            
            # Use retry with backoff for rate limit handling
            response = retry_with_backoff(
                lambda: self.model.generate_content([
                    LAB_REPORT_IMAGE_PROMPT,
                    image
                ])
            )
            
            result = self._parse_json_response(response.text)
            
            # Validate and correct lab results (pass patient_info for gender-specific ranges)
            if result.get("lab_tests"):
                result["lab_tests"] = validate_and_correct_lab_results(result["lab_tests"], result.get("patient_info"))
                result["critical_alerts"] = self._check_critical_values(result["lab_tests"])
            
            result["extraction_source"] = "gemini_vision"
            return result
            
        except Exception as e:
            logger.error(f"Gemini lab image extraction error: {e}")
            return {"error": str(e)}
    
    def extract_from_prescription_image(self, image_input: Union[str, Image.Image, bytes]) -> Dict[str, Any]:
        """
        Extract structured data from a prescription image.
        
        Args:
            image_input: File path, PIL Image, or bytes
            
        Returns:
            Structured JSON with patient_info, medications, instructions
        """
        try:
            image = self._prepare_image(image_input)
            
            # Use retry with backoff for rate limit handling
            response = retry_with_backoff(
                lambda: self.model.generate_content([
                    PRESCRIPTION_IMAGE_PROMPT,
                    image
                ])
            )
            
            result = self._parse_json_response(response.text)
            result["extraction_source"] = "gemini_vision"
            return result
            
        except Exception as e:
            logger.error(f"Gemini prescription extraction error: {e}")
            return {"error": str(e)}
    
    def generate_medical_summary(
        self,
        lab_data: Optional[Dict[str, Any]] = None,
        prescription_data: Optional[Dict[str, Any]] = None,
        ehr_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive medical summary combining all data sources.
        
        Args:
            lab_data: Structured lab report data
            prescription_data: Structured prescription data
            ehr_data: EHR data from CSV
            
        Returns:
            Comprehensive medical summary with recommendations
        """
        try:
            # Build context from available data
            context_parts = ["Analyze the following medical data:\n"]
            
            if lab_data and lab_data.get("lab_tests"):
                context_parts.append("\n=== LAB REPORT DATA ===")
                context_parts.append(json.dumps(lab_data, indent=2))
            
            if prescription_data and prescription_data.get("medications"):
                context_parts.append("\n=== PRESCRIPTION DATA ===")
                context_parts.append(json.dumps(prescription_data, indent=2))
            
            if ehr_data:
                context_parts.append("\n=== EHR DATA ===")
                context_parts.append(json.dumps(ehr_data, indent=2))
            
            if len(context_parts) == 1:
                return {"error": "No data provided for summary"}
            
            full_prompt = MEDICAL_SUMMARY_PROMPT + "\n\n" + "\n".join(context_parts)
            
            # Use pro model for better analysis with retry for rate limits
            response = retry_with_backoff(
                lambda: self.pro_model.generate_content(full_prompt)
            )
            
            result = self._parse_json_response(response.text)
            result["data_sources"] = {
                "lab_data": bool(lab_data and lab_data.get("lab_tests")),
                "prescription_data": bool(prescription_data and prescription_data.get("medications")),
                "ehr_data": bool(ehr_data)
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Gemini summary generation error: {e}")
            return {"error": str(e)}
    
    def _prepare_image(self, image_input: Union[str, Image.Image, bytes]) -> Image.Image:
        """
        Prepare image for Gemini API.
        
        Args:
            image_input: File path, PIL Image, or bytes
            
        Returns:
            PIL Image object
        """
        if isinstance(image_input, str):
            # File path
            return Image.open(image_input)
        elif isinstance(image_input, bytes):
            # Bytes
            return Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            return image_input
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse JSON from Gemini response, handling markdown code blocks.
        """
        text = response_text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            logger.error(f"JSON parse error: {e}")
            return {"raw_response": response_text, "parse_error": str(e)}
    
    def _check_critical_values(self, lab_tests: List[Dict]) -> List[Dict[str, Any]]:
        """
        Check for critical values that require immediate attention.
        """
        critical_alerts = []
        
        for test in lab_tests:
            test_name = test.get("test_name", "").upper()
            value_str = test.get("value", "")
            
            # Extract numeric value
            numeric_match = re.search(r'[\d.]+', str(value_str))
            if not numeric_match:
                continue
            
            try:
                numeric_value = float(numeric_match.group())
            except ValueError:
                continue
            
            # Check against thresholds
            for threshold in CRITICAL_THRESHOLDS:
                if re.search(threshold.test_pattern, test_name, re.IGNORECASE):
                    is_critical = False
                    alert_type = ""
                    
                    if threshold.critical_low and numeric_value < threshold.critical_low:
                        is_critical = True
                        alert_type = "CRITICALLY_LOW"
                    elif threshold.critical_high and numeric_value > threshold.critical_high:
                        is_critical = True
                        alert_type = "CRITICALLY_HIGH"
                    
                    if is_critical:
                        critical_alerts.append({
                            "test_name": test_name,
                            "value": numeric_value,
                            "unit": test.get("unit", ""),
                            "type": alert_type,
                            "threshold_low": threshold.critical_low,
                            "threshold_high": threshold.critical_high,
                            "message": f"⚠️ CRITICAL: {test_name} is {alert_type.replace('_', ' ')} at {numeric_value} {test.get('unit', '')}"
                        })
                    break
        
        return critical_alerts


# ==================== GROQ STRUCTURER CLASS ====================

class GroqStructurer:
    """
    Groq-based medical report structurer using Llama models.
    Uses Groq API for fast inference with Llama models.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """
        Initialize Groq structurer.
        
        Args:
            api_key: Groq API key. Uses GROQ_API_KEY env var if not provided.
            model: Model to use. Uses GROQ_MODEL env var or defaults to llama-4-scout.
        """
        if not GROQ_AVAILABLE:
            raise ImportError("groq package not installed")
        
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("Groq API key required. Set GROQ_API_KEY env var or pass api_key.")
        
        self.model = model or os.getenv("GROQ_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
        self.vision_model = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
        self.client = Groq(api_key=self.api_key)
        logger.info(f"GroqStructurer initialized with model: {self.model}, vision: {self.vision_model}")
    
    def _call_groq(self, prompt: str, temperature: float = 0.0) -> str:
        """Make a call to Groq API with retry logic."""
        def _make_call():
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        
        return retry_with_backoff(_make_call)
    
    def _call_groq_vision(self, prompt: str, image_data: bytes, image_type: str = "image/png", temperature: float = 0.0) -> str:
        """Make a vision call to Groq API with image data."""
        import base64
        
        # Encode image to base64
        image_b64 = base64.b64encode(image_data).decode('utf-8')
        
        def _make_call():
            response = self.client.chat.completions.create(
                model=self.vision_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{image_type};base64,{image_b64}"
                                }
                            }
                        ]
                    }
                ],
                temperature=temperature,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        
        return retry_with_backoff(_make_call)
    
    def extract_from_image(self, image_data: bytes, image_type: str = "image/png") -> Dict[str, Any]:
        """
        Extract structured lab data from an image using Groq Vision.
        
        Args:
            image_data: Raw image bytes
            image_type: MIME type of the image
            
        Returns:
            Structured JSON with patient_info, lab_tests, critical_alerts
        """
        try:
            prompt = f"""{LAB_REPORT_IMAGE_PROMPT}

Analyze this lab report image and extract all the medical data into the JSON structure specified above.
If this is a CULTURE/SENSITIVITY report, focus on extracting ALL antibiotics from the ANTIBIOGRAM table."""
            
            response_text = self._call_groq_vision(prompt, image_data, image_type)
            
            # Log raw response for debugging
            logger.info(f"Groq Vision raw response length: {len(response_text)}")
            logger.info(f"Groq Vision raw response preview: {response_text[:1000]}...")
            
            result = self._parse_json_response(response_text)
            
            # Log parsed result
            logger.info(f"Parsed lab_tests count: {len(result.get('lab_tests', []))}")
            if result.get('lab_tests'):
                logger.info(f"First 5 tests: {[t.get('test_name') for t in result.get('lab_tests', [])[:5]]}")
            
            if result.get("lab_tests"):
                result["lab_tests"] = validate_and_correct_lab_results(result["lab_tests"], result.get("patient_info"))
                result["critical_alerts"] = self._check_critical_values(result["lab_tests"])
            
            result["extraction_source"] = "groq_llama_vision"
            return result
            
        except Exception as e:
            logger.error(f"Groq vision extraction error: {e}")
            return {"error": str(e)}
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from response text."""
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
            return {"error": "No JSON found in response", "raw_response": text[:500]}
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            return {"error": f"JSON parsing failed: {e}", "raw_response": text[:500]}
    
    def structure_text(self, raw_text: str) -> Dict[str, Any]:
        """
        Convert raw lab report text into structured JSON using Groq/Llama.
        
        Args:
            raw_text: Unstructured text from PDF extraction
            
        Returns:
            Structured JSON with patient_info, lab_tests, sections
        """
        try:
            prompt = f"{LAB_REPORT_TEXT_PROMPT}\n\nRaw Lab Report Text:\n{raw_text}"
            response_text = self._call_groq(prompt)
            result = self._parse_json_response(response_text)
            
            # Validate and correct lab results (pass patient_info for gender-specific ranges)
            if result.get("lab_tests"):
                result["lab_tests"] = validate_and_correct_lab_results(result["lab_tests"], result.get("patient_info"))
                result["critical_alerts"] = self._check_critical_values(result["lab_tests"])
            
            result["extraction_source"] = "groq_llama"
            return result
            
        except Exception as e:
            logger.error(f"Groq text structuring error: {e}")
            return {"error": str(e)}
    
    def extract_from_ocr_text(self, ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured data from OCR text (for image processing).
        Since Llama doesn't have vision, use OCR first then structure.
        
        Args:
            ocr_text: Text extracted via OCR from an image
            
        Returns:
            Structured JSON with patient_info, lab_tests
        """
        try:
            prompt = f"""You are an expert at parsing OCR-extracted medical lab report text.
The text may have OCR errors, formatting issues, or be poorly structured.
Your job is to extract the medical data accurately despite these issues.

{LAB_REPORT_TEXT_PROMPT}

OCR-Extracted Text (may contain errors):
{ocr_text}"""
            
            response_text = self._call_groq(prompt)
            result = self._parse_json_response(response_text)
            
            if result.get("lab_tests"):
                result["lab_tests"] = validate_and_correct_lab_results(result["lab_tests"], result.get("patient_info"))
                result["critical_alerts"] = self._check_critical_values(result["lab_tests"])
            
            result["extraction_source"] = "groq_llama_ocr"
            return result
            
        except Exception as e:
            logger.error(f"Groq OCR text structuring error: {e}")
            return {"error": str(e)}
    
    def generate_medical_summary(
        self,
        lab_data: Optional[Dict[str, Any]] = None,
        prescription_data: Optional[Dict[str, Any]] = None,
        ehr_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive medical summary using Groq/Llama.
        """
        try:
            context_parts = ["Please analyze the following medical data and provide a comprehensive summary:"]
            
            if lab_data and lab_data.get("lab_tests"):
                context_parts.append("\n=== LAB REPORT DATA ===")
                context_parts.append(json.dumps(lab_data, indent=2))
            
            if prescription_data and prescription_data.get("medications"):
                context_parts.append("\n=== PRESCRIPTION DATA ===")
                context_parts.append(json.dumps(prescription_data, indent=2))
            
            if ehr_data:
                context_parts.append("\n=== EHR DATA ===")
                context_parts.append(json.dumps(ehr_data, indent=2))
            
            if len(context_parts) == 1:
                return {"error": "No data provided for summary"}
            
            full_prompt = MEDICAL_SUMMARY_PROMPT + "\n\n" + "\n".join(context_parts)
            response_text = self._call_groq(full_prompt)
            
            result = self._parse_json_response(response_text)
            result["data_sources"] = {
                "lab_data": bool(lab_data and lab_data.get("lab_tests")),
                "prescription_data": bool(prescription_data and prescription_data.get("medications")),
                "ehr_data": bool(ehr_data)
            }
            result["model"] = self.model
            
            return result
            
        except Exception as e:
            logger.error(f"Groq summary generation error: {e}")
            return {"error": str(e)}
    
    def _check_critical_values(self, lab_tests: List[Dict]) -> List[Dict]:
        """Check for critical values in lab results."""
        critical_alerts = []
        for test in lab_tests:
            test_name = test.get("test_name", "").upper()
            value = test.get("value")
            status = test.get("status", "").upper()
            
            if status in ["CRITICAL", "PANIC", "CRITICAL HIGH", "CRITICAL LOW"]:
                critical_alerts.append({
                    "test": test_name,
                    "value": value,
                    "unit": test.get("unit", ""),
                    "status": status,
                    "message": f"CRITICAL: {test_name} = {value} requires immediate attention"
                })
        
        return critical_alerts


# ==================== CONVENIENCE FUNCTIONS ====================

_gemini_instance: Optional[GeminiStructurer] = None
_groq_instance: Optional[GroqStructurer] = None


def get_groq_structurer(api_key: Optional[str] = None, model: Optional[str] = None) -> GroqStructurer:
    """Get or create a Groq structurer instance."""
    global _groq_instance
    if _groq_instance is None or api_key or model:
        _groq_instance = GroqStructurer(api_key, model)
    return _groq_instance


def get_gemini_structurer(api_key: Optional[str] = None) -> GeminiStructurer:
    """Get or create a Gemini structurer instance."""
    global _gemini_instance
    if _gemini_instance is None or api_key:
        _gemini_instance = GeminiStructurer(api_key)
    return _gemini_instance


def structure_with_gemini(raw_text: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Structure raw lab report text using Gemini.
    
    Args:
        raw_text: Unstructured text from PDF extraction
        api_key: Optional Gemini API key
        
    Returns:
        Structured JSON
    """
    try:
        structurer = get_gemini_structurer(api_key)
        return structurer.structure_text(raw_text)
    except Exception as e:
        return {"error": str(e)}


def extract_lab_image_with_gemini(image_input: Union[str, bytes], api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Extract data from lab report image using Gemini vision.
    
    Args:
        image_input: Path to the image file or raw bytes
        api_key: Optional Gemini API key
        
    Returns:
        Structured JSON with lab results
    """
    try:
        structurer = get_gemini_structurer(api_key)
        return structurer.extract_from_lab_image(image_input)
    except Exception as e:
        return {"error": str(e)}


def extract_prescription_with_gemini(image_path: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Extract data from prescription image using Gemini vision.
    
    Args:
        image_path: Path to the image file
        api_key: Optional Gemini API key
        
    Returns:
        Structured JSON with prescription data
    """
    try:
        structurer = get_gemini_structurer(api_key)
        return structurer.extract_from_prescription_image(image_path)
    except Exception as e:
        return {"error": str(e)}


def generate_summary_with_gemini(
    lab_data: Optional[Dict] = None,
    prescription_data: Optional[Dict] = None,
    ehr_data: Optional[Dict] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate comprehensive medical summary using Gemini.
    
    Args:
        lab_data: Structured lab report data
        prescription_data: Structured prescription data
        ehr_data: EHR data from CSV
        api_key: Optional Gemini API key
        
    Returns:
        Comprehensive medical summary
    """
    try:
        structurer = get_gemini_structurer(api_key)
        return structurer.generate_medical_summary(lab_data, prescription_data, ehr_data)
    except Exception as e:
        return {"error": str(e)}


def generate_strict_summary_with_gemini(
    summary_data: Dict[str, Any],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate strict medical summary that ONLY explains pre-calculated findings.
    
    This function uses:
    - Temperature 0 for deterministic output
    - Pre-calculated risk levels (no LLM diagnosis)
    - Strict prompt that prevents hallucination
    
    The LLM does NOT calculate risk - it only EXPLAINS the backend-calculated risk.
    
    Args:
        summary_data: Pre-calculated data from backend containing:
            - patient_info
            - lab_tests
            - computed_risk (pre-calculated by rules)
            - flags (pre-calculated clinical flags)
            - affected_organs (pre-calculated)
            - critical_findings
            - abnormal_findings
            - risk_justification
        api_key: Optional Gemini API key
        
    Returns:
        Clinical explanation of pre-calculated findings
    """
    try:
        structurer = get_gemini_structurer(api_key)
        
        # Build the data context
        context_parts = [
            "Below is structured medical data with PRE-CALCULATED risk assessment.",
            "Your task is to EXPLAIN these findings in clinical language.",
            "Do NOT change the risk level or diagnose - only explain what was calculated.",
            "",
            "=== PATIENT INFORMATION ===",
            json.dumps(summary_data.get("patient_info", {}), indent=2),
            "",
            "=== LAB TEST RESULTS ===",
            json.dumps(summary_data.get("lab_tests", []), indent=2),
            "",
            "=== PRE-CALCULATED RISK (by backend clinical rules) ===",
            json.dumps(summary_data.get("computed_risk", {}), indent=2),
            "",
            "=== CLINICAL FLAGS (pre-calculated) ===",
            json.dumps(summary_data.get("flags", {}), indent=2),
            "",
            "=== AFFECTED ORGAN SYSTEMS (pre-calculated based on abnormal values) ===",
            json.dumps(summary_data.get("affected_organs", []), indent=2),
            "",
            "=== CRITICAL FINDINGS ===",
            json.dumps(summary_data.get("critical_findings", []), indent=2),
            "",
            "=== ABNORMAL FINDINGS ===",
            json.dumps(summary_data.get("abnormal_findings", []), indent=2),
            "",
            "=== RISK JUSTIFICATION (pre-calculated reasons) ===",
            json.dumps(summary_data.get("risk_justification", []), indent=2),
        ]
        
        full_prompt = STRICT_MEDICAL_EXPLANATION_PROMPT + "\n\n" + "\n".join(context_parts)
        
        # Use temperature 0 for no hallucination
        generation_config = {
            "temperature": 0.0,
            "top_p": 0.1,
            "max_output_tokens": 1500
        }
        
        # Use retry with backoff for rate limit handling
        response = retry_with_backoff(
            lambda: structurer.model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
        )
        
        result = structurer._parse_json_response(response.text)
        
        # Add metadata
        result["generation_config"] = {
            "temperature": 0.0,
            "model": "gemini-2.5-flash",
            "prompt_type": "strict_explanation_only"
        }
        result["pre_calculated_risk_level"] = summary_data.get("computed_risk", {}).get("risk_level", "UNKNOWN")
        
        return result
        
    except Exception as e:
        logger.error(f"Strict summary generation error: {e}")
        return {"error": str(e)}


# ==================== GROQ CONVENIENCE FUNCTIONS ====================

def structure_with_groq(raw_text: str, api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """
    Structure raw lab report text using Groq/Llama.
    
    Args:
        raw_text: Unstructured text from PDF extraction
        api_key: Optional Groq API key
        model: Optional model name
        
    Returns:
        Structured JSON
    """
    try:
        structurer = get_groq_structurer(api_key, model)
        return structurer.structure_text(raw_text)
    except Exception as e:
        return {"error": str(e)}


def extract_from_ocr_with_groq(ocr_text: str, api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """
    Extract structured data from OCR text using Groq/Llama.
    
    Args:
        ocr_text: Text extracted via OCR from an image
        api_key: Optional Groq API key
        model: Optional model name
        
    Returns:
        Structured JSON with lab results
    """
    try:
        structurer = get_groq_structurer(api_key, model)
        return structurer.extract_from_ocr_text(ocr_text)
    except Exception as e:
        return {"error": str(e)}


def generate_summary_with_groq(
    lab_data: Optional[Dict] = None,
    prescription_data: Optional[Dict] = None,
    ehr_data: Optional[Dict] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate comprehensive medical summary using Groq/Llama.
    
    Args:
        lab_data: Structured lab report data
        prescription_data: Structured prescription data
        ehr_data: EHR data from CSV
        api_key: Optional Groq API key
        model: Optional model name
        
    Returns:
        Comprehensive medical summary
    """
    try:
        structurer = get_groq_structurer(api_key, model)
        return structurer.generate_medical_summary(lab_data, prescription_data, ehr_data)
    except Exception as e:
        return {"error": str(e)}


def generate_strict_summary_with_groq(
    summary_data: Dict[str, Any],
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate strict medical summary using Groq/Llama that ONLY explains pre-calculated findings.
    
    Args:
        summary_data: Pre-calculated data from backend
        api_key: Optional Groq API key
        model: Optional model name
        
    Returns:
        Clinical explanation of pre-calculated findings
    """
    try:
        structurer = get_groq_structurer(api_key, model)
        
        # Build the data context
        context_parts = [
            "Below is structured medical data with PRE-CALCULATED risk assessment.",
            "Your task is to EXPLAIN these findings in clinical language.",
            "Do NOT change the risk level or diagnose - only explain what was calculated.",
            "",
            "=== PATIENT INFORMATION ===",
            json.dumps(summary_data.get("patient_info", {}), indent=2),
            "",
            "=== LAB TEST RESULTS ===",
            json.dumps(summary_data.get("lab_tests", []), indent=2),
            "",
            "=== PRE-CALCULATED RISK (by backend clinical rules) ===",
            json.dumps(summary_data.get("computed_risk", {}), indent=2),
            "",
            "=== CLINICAL FLAGS (pre-calculated) ===",
            json.dumps(summary_data.get("flags", {}), indent=2),
            "",
            "=== AFFECTED ORGAN SYSTEMS (pre-calculated based on abnormal values) ===",
            json.dumps(summary_data.get("affected_organs", []), indent=2),
            "",
            "=== CRITICAL FINDINGS ===",
            json.dumps(summary_data.get("critical_findings", []), indent=2),
            "",
            "=== ABNORMAL FINDINGS ===",
            json.dumps(summary_data.get("abnormal_findings", []), indent=2),
            "",
            "=== RISK JUSTIFICATION (pre-calculated reasons) ===",
            json.dumps(summary_data.get("risk_justification", []), indent=2),
        ]
        
        full_prompt = STRICT_MEDICAL_EXPLANATION_PROMPT + "\n\n" + "\n".join(context_parts)
        response_text = structurer._call_groq(full_prompt, temperature=0.0)
        
        result = structurer._parse_json_response(response_text)
        
        # Add metadata
        result["generation_config"] = {
            "temperature": 0.0,
            "model": structurer.model,
            "prompt_type": "strict_explanation_only"
        }
        result["pre_calculated_risk_level"] = summary_data.get("computed_risk", {}).get("risk_level", "UNKNOWN")
        
        return result
        
    except Exception as e:
        logger.error(f"Groq strict summary generation error: {e}")
        return {"error": str(e)}


def extract_lab_image_with_groq(
    image_data: bytes,
    api_key: Optional[str] = None,
    image_type: str = "image/png"
) -> Dict[str, Any]:
    """
    Extract structured lab data from an image using Groq Vision (Llama 3.2 Vision).
    
    Args:
        image_data: Raw image bytes
        api_key: Optional Groq API key
        image_type: MIME type of the image
        
    Returns:
        Structured JSON with patient_info, lab_tests, critical_alerts
    """
    try:
        structurer = get_groq_structurer(api_key)
        return structurer.extract_from_image(image_data, image_type)
    except Exception as e:
        logger.error(f"Groq image extraction error: {e}")
        return {"error": str(e)}

