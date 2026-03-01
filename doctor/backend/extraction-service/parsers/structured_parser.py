"""
Structured Lab Report Parser
Converts unstructured extracted text into clean JSON format.
Handles inconsistent spacing, merged words, and various lab report formats.
"""

import re
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


class TestStatus(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    UNKNOWN = "UNKNOWN"


class Section(str, Enum):
    HEMATOLOGY = "hematology"
    BIOCHEMISTRY = "biochemistry"
    URINE_ANALYSIS = "urine_analysis"
    LIVER_FUNCTION = "liver_function"
    KIDNEY_FUNCTION = "kidney_function"
    LIPID_PROFILE = "lipid_profile"
    THYROID = "thyroid"
    DIABETES = "diabetes"
    OTHER = "other"


@dataclass
class LabTest:
    test_name: str
    value: str
    unit: str
    reference_range: str
    status: str
    section: str
    numeric_value: Optional[float] = None
    test_name_normalized: str = ""


@dataclass
class PatientInfo:
    name: str = ""
    age: str = ""
    sex: str = ""
    reported_date: str = ""
    patient_id: str = ""
    referred_by: str = ""


@dataclass
class ParsedReport:
    patient_info: PatientInfo
    lab_tests: List[LabTest]
    sections: Dict[str, List[LabTest]]
    raw_text: str


# ═══════════════════════════════════════════════════════════════════════════════
# TEST PATTERNS - Comprehensive patterns for lab test detection
# ═══════════════════════════════════════════════════════════════════════════════

TEST_PATTERNS = {
    # Diabetes Tests
    "FASTING BLOOD SUGAR": {"section": Section.DIABETES, "aliases": ["FBS", "FASTING GLUCOSE", "FASTING BLOOD GLUCOSE", "FASTING PLASMA GLUCOSE"]},
    "POST PRANDIAL BLOOD SUGAR": {"section": Section.DIABETES, "aliases": ["PPBS", "PP BLOOD SUGAR", "POST PRANDIAL GLUCOSE", "PP GLUCOSE"]},
    "RANDOM BLOOD SUGAR": {"section": Section.DIABETES, "aliases": ["RBS", "RANDOM GLUCOSE", "BLOOD GLUCOSE RANDOM"]},
    "HBA1C": {"section": Section.DIABETES, "aliases": ["GLYCATED HEMOGLOBIN", "GLYCOSYLATED HEMOGLOBIN", "A1C"]},
    
    # Hematology - CBC
    "HEMOGLOBIN": {"section": Section.HEMATOLOGY, "aliases": ["HB", "HGB", "HAEMOGLOBIN"]},
    "TOTAL RBC COUNT": {"section": Section.HEMATOLOGY, "aliases": ["RBC", "RED BLOOD CELL", "ERYTHROCYTE COUNT", "RBC COUNT"]},
    "TOTAL WBC COUNT": {"section": Section.HEMATOLOGY, "aliases": ["WBC", "WHITE BLOOD CELL", "LEUCOCYTE COUNT", "WBC COUNT", "TLC"]},
    "PLATELET COUNT": {"section": Section.HEMATOLOGY, "aliases": ["PLT", "PLATELETS", "THROMBOCYTE"]},
    "PCV": {"section": Section.HEMATOLOGY, "aliases": ["PACKED CELL VOLUME", "HEMATOCRIT", "HCT"]},
    "MCV": {"section": Section.HEMATOLOGY, "aliases": ["MEAN CORPUSCULAR VOLUME"]},
    "MCH": {"section": Section.HEMATOLOGY, "aliases": ["MEAN CORPUSCULAR HEMOGLOBIN"]},
    "MCHC": {"section": Section.HEMATOLOGY, "aliases": ["MEAN CORPUSCULAR HB CONCENTRATION"]},
    "RDW": {"section": Section.HEMATOLOGY, "aliases": ["RED CELL DISTRIBUTION WIDTH", "RDW-CV"]},
    "ESR": {"section": Section.HEMATOLOGY, "aliases": ["ERYTHROCYTE SEDIMENTATION RATE"]},
    
    # Differential Count
    "NEUTROPHILS": {"section": Section.HEMATOLOGY, "aliases": ["NEUT", "POLYMORPHS", "SEGMENTED NEUTROPHILS"]},
    "LYMPHOCYTES": {"section": Section.HEMATOLOGY, "aliases": ["LYMPH"]},
    "MONOCYTES": {"section": Section.HEMATOLOGY, "aliases": ["MONO"]},
    "EOSINOPHILS": {"section": Section.HEMATOLOGY, "aliases": ["EOS"]},
    "BASOPHILS": {"section": Section.HEMATOLOGY, "aliases": ["BASO"]},
    
    # Liver Function Tests
    "BILIRUBIN TOTAL": {"section": Section.LIVER_FUNCTION, "aliases": ["TOTAL BILIRUBIN", "T.BILIRUBIN", "T BIL"]},
    "BILIRUBIN DIRECT": {"section": Section.LIVER_FUNCTION, "aliases": ["DIRECT BILIRUBIN", "D.BILIRUBIN", "CONJUGATED BILIRUBIN"]},
    "BILIRUBIN INDIRECT": {"section": Section.LIVER_FUNCTION, "aliases": ["INDIRECT BILIRUBIN", "UNCONJUGATED BILIRUBIN"]},
    "SGPT": {"section": Section.LIVER_FUNCTION, "aliases": ["ALT", "ALANINE TRANSAMINASE", "ALANINE AMINOTRANSFERASE"]},
    "SGOT": {"section": Section.LIVER_FUNCTION, "aliases": ["AST", "ASPARTATE TRANSAMINASE", "ASPARTATE AMINOTRANSFERASE"]},
    "ALKALINE PHOSPHATASE": {"section": Section.LIVER_FUNCTION, "aliases": ["ALP", "ALK PHOS"]},
    "GGT": {"section": Section.LIVER_FUNCTION, "aliases": ["GAMMA GT", "GAMMA GLUTAMYL TRANSFERASE"]},
    "TOTAL PROTEIN": {"section": Section.LIVER_FUNCTION, "aliases": ["TP", "SERUM PROTEIN"]},
    "ALBUMIN": {"section": Section.LIVER_FUNCTION, "aliases": ["ALB", "SERUM ALBUMIN"]},
    "GLOBULIN": {"section": Section.LIVER_FUNCTION, "aliases": ["GLOB"]},
    "A/G RATIO": {"section": Section.LIVER_FUNCTION, "aliases": ["ALBUMIN GLOBULIN RATIO", "AG RATIO"]},
    
    # Kidney Function Tests
    "UREA": {"section": Section.KIDNEY_FUNCTION, "aliases": ["BLOOD UREA", "BUN"]},
    "CREATININE": {"section": Section.KIDNEY_FUNCTION, "aliases": ["SERUM CREATININE", "CREAT"]},
    "URIC ACID": {"section": Section.KIDNEY_FUNCTION, "aliases": ["SERUM URIC ACID"]},
    "BUN/CREATININE RATIO": {"section": Section.KIDNEY_FUNCTION, "aliases": ["BUN CREAT RATIO"]},
    "EGFR": {"section": Section.KIDNEY_FUNCTION, "aliases": ["GFR", "GLOMERULAR FILTRATION RATE"]},
    
    # Lipid Profile
    "TOTAL CHOLESTEROL": {"section": Section.LIPID_PROFILE, "aliases": ["CHOLESTEROL", "TC", "SERUM CHOLESTEROL"]},
    "TRIGLYCERIDES": {"section": Section.LIPID_PROFILE, "aliases": ["TG", "TRIGS"]},
    "HDL CHOLESTEROL": {"section": Section.LIPID_PROFILE, "aliases": ["HDL", "HDL-C", "HIGH DENSITY LIPOPROTEIN"]},
    "LDL CHOLESTEROL": {"section": Section.LIPID_PROFILE, "aliases": ["LDL", "LDL-C", "LOW DENSITY LIPOPROTEIN"]},
    "VLDL CHOLESTEROL": {"section": Section.LIPID_PROFILE, "aliases": ["VLDL", "VLDL-C"]},
    "CHOLESTEROL/HDL RATIO": {"section": Section.LIPID_PROFILE, "aliases": ["CHOL/HDL", "TC/HDL RATIO"]},
    "LDL/HDL RATIO": {"section": Section.LIPID_PROFILE, "aliases": []},
    
    # Thyroid
    "TSH": {"section": Section.THYROID, "aliases": ["THYROID STIMULATING HORMONE", "SERUM TSH"]},
    "T3": {"section": Section.THYROID, "aliases": ["TRIIODOTHYRONINE", "TOTAL T3"]},
    "T4": {"section": Section.THYROID, "aliases": ["THYROXINE", "TOTAL T4"]},
    "FREE T3": {"section": Section.THYROID, "aliases": ["FT3"]},
    "FREE T4": {"section": Section.THYROID, "aliases": ["FT4"]},
    
    # Electrolytes
    "SODIUM": {"section": Section.BIOCHEMISTRY, "aliases": ["NA", "SERUM SODIUM"]},
    "POTASSIUM": {"section": Section.BIOCHEMISTRY, "aliases": ["K", "SERUM POTASSIUM"]},
    "CHLORIDE": {"section": Section.BIOCHEMISTRY, "aliases": ["CL", "SERUM CHLORIDE"]},
    "CALCIUM": {"section": Section.BIOCHEMISTRY, "aliases": ["CA", "SERUM CALCIUM"]},
    "PHOSPHORUS": {"section": Section.BIOCHEMISTRY, "aliases": ["PHOSPHATE", "SERUM PHOSPHORUS"]},
    "MAGNESIUM": {"section": Section.BIOCHEMISTRY, "aliases": ["MG", "SERUM MAGNESIUM"]},
    
    # Urine Analysis
    "URINE COLOUR": {"section": Section.URINE_ANALYSIS, "aliases": ["COLOUR", "COLOR"]},
    "URINE APPEARANCE": {"section": Section.URINE_ANALYSIS, "aliases": ["APPEARANCE"]},
    "URINE PH": {"section": Section.URINE_ANALYSIS, "aliases": ["PH"]},
    "SPECIFIC GRAVITY": {"section": Section.URINE_ANALYSIS, "aliases": ["SP GRAVITY", "SG"]},
    "URINE PROTEIN": {"section": Section.URINE_ANALYSIS, "aliases": ["PROTEIN", "ALBUMIN"]},
    "URINE GLUCOSE": {"section": Section.URINE_ANALYSIS, "aliases": ["URINE SUGAR", "GLUCOSE URINE"]},
    "KETONES": {"section": Section.URINE_ANALYSIS, "aliases": ["KETONE BODIES"]},
    "UROBILINOGEN": {"section": Section.URINE_ANALYSIS, "aliases": []},
    "BILIRUBIN": {"section": Section.URINE_ANALYSIS, "aliases": []},
    "BLOOD": {"section": Section.URINE_ANALYSIS, "aliases": ["OCCULT BLOOD"]},
    "NITRITE": {"section": Section.URINE_ANALYSIS, "aliases": []},
    "LEUCOCYTE ESTERASE": {"section": Section.URINE_ANALYSIS, "aliases": ["LE"]},
    "RBC URINE": {"section": Section.URINE_ANALYSIS, "aliases": ["RED BLOOD CELLS", "URINE RBC"]},
    "WBC URINE": {"section": Section.URINE_ANALYSIS, "aliases": ["PUS CELLS", "URINE WBC", "LEUCOCYTES"]},
    "EPITHELIAL CELLS": {"section": Section.URINE_ANALYSIS, "aliases": ["EPI CELLS"]},
    "CASTS": {"section": Section.URINE_ANALYSIS, "aliases": []},
    "CRYSTALS": {"section": Section.URINE_ANALYSIS, "aliases": []},
    "BACTERIA": {"section": Section.URINE_ANALYSIS, "aliases": []},
}

# Mapping from test names to reference_ranges keys (for risk analyzer)
TEST_NAME_TO_CODE = {
    "FASTING BLOOD SUGAR": "glucose_fasting",
    "FBS": "glucose_fasting",
    "FASTING GLUCOSE": "glucose_fasting",
    "POST PRANDIAL BLOOD SUGAR": "glucose_pp",
    "PPBS": "glucose_pp",
    "PP GLUCOSE": "glucose_pp",
    "RANDOM BLOOD SUGAR": "glucose_random",
    "RBS": "glucose_random",
    "HBA1C": "hba1c",
    "HEMOGLOBIN": "hemoglobin",
    "HB": "hemoglobin",
    "HGB": "hemoglobin",
    "TOTAL RBC COUNT": "rbc_count",
    "RBC": "rbc_count",
    "TOTAL WBC COUNT": "wbc_count",
    "WBC": "wbc_count",
    "TLC": "wbc_count",
    "PLATELET COUNT": "platelet_count",
    "PLATELETS": "platelet_count",
    "PCV": "hematocrit",
    "HEMATOCRIT": "hematocrit",
    "MCV": "mcv",
    "MCH": "mch",
    "MCHC": "mchc",
    "ESR": "esr",
    "CREATININE": "creatinine",
    "BLOOD UREA": "blood_urea",
    "BUN": "bun",
    "URIC ACID": "uric_acid",
    "SGPT": "sgpt_alt",
    "ALT": "sgpt_alt",
    "SGOT": "sgot_ast",
    "AST": "sgot_ast",
    "BILIRUBIN TOTAL": "bilirubin_total",
    "TOTAL BILIRUBIN": "bilirubin_total",
    "ALKALINE PHOSPHATASE": "alp",
    "ALP": "alp",
    "TOTAL PROTEIN": "total_protein",
    "ALBUMIN": "albumin",
    "GLOBULIN": "globulin",
    "TOTAL CHOLESTEROL": "cholesterol_total",
    "CHOLESTEROL": "cholesterol_total",
    "TRIGLYCERIDES": "triglycerides",
    "HDL CHOLESTEROL": "hdl",
    "HDL": "hdl",
    "LDL CHOLESTEROL": "ldl",
    "LDL": "ldl",
    "VLDL CHOLESTEROL": "vldl",
    "TSH": "tsh",
    "T3": "t3",
    "T4": "t4",
    "FREE T3": "free_t3",
    "FREE T4": "free_t4",
    "SODIUM": "sodium",
    "POTASSIUM": "potassium",
    "CHLORIDE": "chloride",
    "CALCIUM": "calcium",
    "PHOSPHORUS": "phosphorus",
    "MAGNESIUM": "magnesium",
}

# Common units pattern
UNIT_PATTERN = r'(mg/dL|g/dL|g/L|mg/L|mmol/L|mEq/L|U/L|IU/L|IU/mL|ng/mL|pg/mL|µg/dL|µg/L|µIU/mL|mIU/L|%|cells/cumm|cells/µL|/cumm|/µL|/HPF|/LPF|million/cumm|lakhs/cumm|thou/cumm|fl|fL|pg|mm/hr|mm/1st hr|seconds|sec)'


class StructuredLabParser:
    """
    Parses unstructured lab report text into clean structured JSON.
    Handles inconsistent spacing, merged words, and various formats.
    """
    
    def __init__(self):
        self.test_patterns = TEST_PATTERNS
        self._build_regex_patterns()
    
    def _build_regex_patterns(self) -> None:
        """Build compiled regex patterns for efficient matching."""
        # Build test name patterns
        all_test_names = []
        for test_name, data in self.test_patterns.items():
            all_test_names.append(re.escape(test_name))
            all_test_names.extend(re.escape(alias) for alias in data.get("aliases", []))
        
        # Sort by length (longest first) to match longer names before shorter
        all_test_names.sort(key=len, reverse=True)
        self.test_name_pattern = re.compile(
            r'\b(' + '|'.join(all_test_names) + r')\b',
            re.IGNORECASE
        )
        
        # Value pattern: number with optional decimal
        self.value_pattern = re.compile(
            r'(\d+\.?\d*)\s*' + UNIT_PATTERN + r'?',
            re.IGNORECASE
        )
        
        # Reference range patterns
        self.range_patterns = [
            # Pattern: 70 - 110 mg/dL or 70-110 mg/dL
            re.compile(r'(\d+\.?\d*)\s*[-–—to]\s*(\d+\.?\d*)\s*' + UNIT_PATTERN + r'?', re.IGNORECASE),
            # Pattern: Upto 200 mg/dL or < 200 mg/dL
            re.compile(r'(?:upto|up\s*to|<|less\s*than)\s*(\d+\.?\d*)\s*' + UNIT_PATTERN + r'?', re.IGNORECASE),
            # Pattern: > 40 mg/dL or more than 40 mg/dL
            re.compile(r'(?:>|more\s*than|above)\s*(\d+\.?\d*)\s*' + UNIT_PATTERN + r'?', re.IGNORECASE),
        ]
    
    def parse(self, raw_text: str) -> Dict[str, Any]:
        """
        Main parsing function. Takes raw extracted text and returns structured JSON.
        
        Args:
            raw_text: Unstructured text extracted from lab report PDF
            
        Returns:
            Dictionary containing patient_info, lab_tests, and sections
        """
        # Clean and normalize text
        cleaned_text = self._clean_text(raw_text)
        
        # Extract patient information
        patient_info = self._extract_patient_info(cleaned_text)
        
        # Extract lab tests
        lab_tests = self._extract_lab_tests(cleaned_text)
        
        # Group by sections
        sections = self._group_by_sections(lab_tests)
        
        # Build final result
        result = {
            "patient_info": asdict(patient_info),
            "lab_tests": [asdict(test) for test in lab_tests],
            "sections": {
                section: [asdict(test) for test in tests]
                for section, tests in sections.items()
            },
            "summary": {
                "total_tests": len(lab_tests),
                "abnormal_count": sum(1 for t in lab_tests if t.status in [TestStatus.LOW, TestStatus.HIGH]),
                "sections_found": list(sections.keys())
            }
        }
        
        return result
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize raw text."""
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        
        # Fix common OCR errors and merged words
        text = self._fix_merged_words(text)
        
        # Normalize special characters
        text = text.replace('–', '-').replace('—', '-')
        
        return text.strip()
    
    def _fix_merged_words(self, text: str) -> str:
        """Fix commonly merged words from OCR."""
        fixes = [
            # Add space before units if missing
            (r'(\d)(mg/dL|g/dL|U/L|%)', r'\1 \2'),
            # Add space between test name and value
            (r'([A-Za-z])(\d+\.?\d*)\s*(mg/dL|g/dL)', r'\1 \2 \3'),
            # Fix common merged patterns
            (r'BLOODSUGAR', 'BLOOD SUGAR'),
            (r'POSTPRANDIAL', 'POST PRANDIAL'),
            (r'FASTINGBLOOD', 'FASTING BLOOD'),
            (r'URINEANALYSIS', 'URINE ANALYSIS'),
            (r'TOTALCOUNT', 'TOTAL COUNT'),
            (r'RBCCOUNT', 'RBC COUNT'),
            (r'WBCCOUNT', 'WBC COUNT'),
            (r'PLATELETCOUNT', 'PLATELET COUNT'),
        ]
        
        for pattern, replacement in fixes:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
    
    def _extract_patient_info(self, text: str) -> PatientInfo:
        """Extract patient information from text."""
        info = PatientInfo()
        
        # Patient Name - look for common patterns
        name_patterns = [
            # Pattern: Ref.By Mr.KODIBASS or Ref By Mr. KODIBASS
            r'(?:Ref\.?\s*By|Referred\s*By)\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.?)?\s*([A-Z][A-Za-z\s]+?)(?=\s+(?:NRS|Received|Age|Sex|\d|[A-Z]{2,}/))',
            # Pattern: Name : KODIBASS or Patient Name: KODIBASS
            r'(?:Patient\s*)?Name\s*[:\s]+([A-Z][A-Za-z\s\.]+?)(?=\s+(?:Age|Sex|Date|Ref|Lab|\d|Bill))',
            # Pattern: Mr./Mrs./Ms. NAME followed by age
            r'(?:Mr\.|Mrs\.|Ms\.)\s*([A-Z][A-Za-z\s]+?)(?=\s+\d{1,3}\s*(?:Y|Yrs?))',
        ]
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up name - remove trailing special chars
                name = re.sub(r'[\s\.\-]+$', '', name)
                name = re.sub(r'\s+', ' ', name).strip()
                if len(name) > 2 and len(name) < 100 and name.upper() not in ['PAGE', 'THE', 'SELF', 'REPORT']:
                    info.name = name.upper()
                    break
        
        # Age - various formats (check for number followed by Y/Yrs/Years BEFORE Sex)
        age_patterns = [
            # Pattern: 57 Yrs Sex (number before Yrs and Sex)
            r'(\d{1,3})\s*(?:Y(?:ears?)?|Yrs?)\s*(?:Sex|Gender|,|\s*:)',
            # Pattern: Age : 57 or Age: 57 Yrs
            r'(?:Age)\s*[:\s]*(\d{1,3})\s*(?:Y(?:ears?)?|Yrs?)?',
            # Pattern: Age : : 57 (double colon edge case)
            r'Age\s*:\s*:?\s*(\d{1,3})',
        ]
        for pattern in age_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                age = match.group(1)
                if 0 < int(age) < 150:
                    info.age = age
                    break
        
        # If still no age, look for standalone pattern
        if not info.age:
            match = re.search(r'\b(\d{1,3})\s*Yrs?\b', text, re.IGNORECASE)
            if match:
                age = match.group(1)
                if 0 < int(age) < 150:
                    info.age = age
        
        # Sex/Gender
        sex_patterns = [
            r'(?:Sex|Gender)\s*[:\s]*(Male|Female|M|F)\b',
            r'\d{1,3}\s*(?:Y|Yrs?)\s*(?:Sex\s*)?[:\s]*(Male|Female|M|F)\b',
            r'\b(Male|Female)\b(?=\s+(?:SELF|Bill|Received|Name))',
        ]
        for pattern in sex_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                sex = match.group(1).upper()
                info.sex = "Male" if sex in ['M', 'MALE'] else "Female"
                break
        
        # Date - prefer Reported On date
        date_patterns = [
            r'(?:Reported\s*On|Report\s*Date)\s*[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(?:Received\s*On|Collection\s*Date|Date)\s*[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info.reported_date = match.group(1)
                break
        
        # Patient ID / Bill No
        id_patterns = [
            r'(?:Bill\s*No|Patient\s*ID|PID|MRN|UHID|Reg(?:istration)?\s*No\.?)\s*[:\s]*(\d+)',
            r'(?:GML\s*No)\s*[:\s]*(\d+)',
        ]
        for pattern in id_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                info.patient_id = match.group(1).strip()
                break
        
        # Referred By - extract doctor names
        ref_patterns = [
            r'(?:Ref(?:erred)?\s*\.?\s*By)\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.?)?\s*([A-Z][A-Za-z\s]+?)(?=\s+NRS|\s+Received|\s+\d)',
        ]
        for pattern in ref_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                ref_name = match.group(1).strip()
                if len(ref_name) > 2 and ref_name.upper() not in ['PAGE', 'THE']:
                    info.referred_by = ref_name.upper()
                    # If we found referred_by but no name, use this as patient name
                    if not info.name:
                        info.name = ref_name.upper()
                    break
        
        return info
    
    def _extract_lab_tests(self, text: str) -> List[LabTest]:
        """Extract all lab tests from text."""
        tests = []
        
        # Strategy 1: Pattern-based extraction for known tests
        tests.extend(self._extract_known_tests(text))
        
        # Strategy 2: Extract tests using generic patterns
        if len(tests) < 3:  # If few tests found, try generic approach
            tests.extend(self._extract_generic_tests(text))
        
        # Remove duplicates
        seen = set()
        unique_tests = []
        for test in tests:
            key = (test.test_name.upper(), test.value)
            if key not in seen:
                seen.add(key)
                unique_tests.append(test)
        
        return unique_tests
    
    def _extract_known_tests(self, text: str) -> List[LabTest]:
        """Extract tests matching known patterns."""
        tests = []
        text_upper = text.upper()
        
        for test_name, test_data in self.test_patterns.items():
            # Check for test name or its aliases
            names_to_check = [test_name] + test_data.get("aliases", [])
            
            for name in names_to_check:
                # Find the test name in text
                pattern = re.compile(
                    re.escape(name) + r'\s*[:\s]*(\d+\.?\d*)\s*(' + UNIT_PATTERN[1:-1] + r')?\s*(?:Plasma|Serum|Blood)?\s*(\d+\.?\d*\s*[-–—to]\s*\d+\.?\d*)?',
                    re.IGNORECASE
                )
                match = pattern.search(text)
                
                if match:
                    value = match.group(1)
                    unit = match.group(2) or ""
                    ref_range_raw = match.group(3) or ""
                    
                    # Prioritize directly captured reference range over lookahead
                    ref_range = ""
                    if ref_range_raw:
                        ref_range = ref_range_raw.replace('–', '-').replace('—', '-')
                    else:
                        # Only try lookahead if no range was captured directly
                        ref_range, unit_from_ref = self._find_reference_range(text, match.end(), unit)
                        if unit_from_ref and not unit:
                            unit = unit_from_ref
                    
                    # Determine status
                    status = self._determine_status(value, ref_range)
                    
                    # Get numeric value
                    try:
                        numeric_value = float(value)
                    except ValueError:
                        numeric_value = None
                    
                    # Get normalized test code for risk analyzer
                    test_code = TEST_NAME_TO_CODE.get(test_name, test_name.lower().replace(' ', '_'))
                    
                    test = LabTest(
                        test_name=test_name,
                        value=value,
                        unit=unit,
                        reference_range=ref_range,
                        status=status,
                        section=test_data["section"].value,
                        numeric_value=numeric_value,
                        test_name_normalized=test_code
                    )
                    tests.append(test)
                    break  # Found match, no need to check aliases
        
        return tests
    
    def _extract_generic_tests(self, text: str) -> List[LabTest]:
        """Extract tests using generic pattern matching."""
        tests = []
        
        # Pattern: TEST_NAME VALUE UNIT REFERENCE_RANGE
        # Example: HEMOGLOBIN 12.5 g/dL 12.0 - 16.0 g/dL
        pattern = re.compile(
            r'([A-Z][A-Z\s/\-\(\)]{2,30}?)\s+'  # Test name
            r'(\d+\.?\d*)\s*'                    # Value
            r'(' + UNIT_PATTERN[1:-1] + r')?\s*'  # Optional unit
            r'(?:Plasma|Serum|Blood|Urine)?\s*'  # Optional specimen type
            r'(\d+\.?\d*\s*[-–—]\s*\d+\.?\d*)?'  # Optional reference range
            r'\s*(' + UNIT_PATTERN[1:-1] + r')?',  # Optional unit after range
            re.IGNORECASE
        )
        
        # List of words to skip
        skip_words = ['REF', 'BY', 'MR', 'MRS', 'DR', 'THE', 'PAGE', 'SELF', 'BILL', 'AGE', 'NAME', 'SEX', 'GENDER', 'HIGH', 'LOW', 'NORMAL', 'POSITIVE', 'NEGATIVE', 'RECEIVED', 'REPORTED']
        
        for match in pattern.finditer(text):
            test_name = match.group(1).strip()
            value = match.group(2)
            unit = match.group(3) or match.group(5) or ""
            ref_range = (match.group(4) or "").replace('–', '-').replace('—', '-')
            
            # Skip if test name is too short or looks like noise
            if len(test_name) < 3:
                continue
            
            # Skip if test name starts with or is a skip word
            test_upper = test_name.upper()
            if test_upper in skip_words or any(test_upper.startswith(word + ' ') for word in ['HIGH', 'LOW', 'NORMAL']):
                continue
            
            # Determine section and normalize name
            section = self._determine_section(test_name)
            normalized_name = self._normalize_test_name(test_name)
            
            status = self._determine_status(value, ref_range)
            
            try:
                numeric_value = float(value)
            except ValueError:
                numeric_value = None
            
            # Get normalized test code for risk analyzer
            test_code = TEST_NAME_TO_CODE.get(normalized_name, normalized_name.lower().replace(' ', '_'))
            
            test = LabTest(
                test_name=normalized_name,
                value=value,
                unit=unit,
                reference_range=ref_range,
                status=status,
                section=section,
                numeric_value=numeric_value,
                test_name_normalized=test_code
            )
            tests.append(test)
        
        return tests
    
    def _find_reference_range(self, text: str, start_pos: int, known_unit: str) -> Tuple[str, str]:
        """Find reference range near the current position."""
        # Look at next 50 characters
        search_text = text[start_pos:start_pos + 80]
        
        for pattern in self.range_patterns:
            match = pattern.search(search_text)
            if match:
                groups = match.groups()
                if len(groups) >= 2 and groups[1]:  # Has two numbers (min-max)
                    ref_range = f"{groups[0]} - {groups[1]}"
                    unit = groups[2] if len(groups) > 2 else ""
                else:  # Single value (upto X or > X)
                    if 'upto' in match.group(0).lower() or '<' in match.group(0):
                        ref_range = f"Upto {groups[0]}"
                    else:
                        ref_range = f"> {groups[0]}"
                    unit = groups[1] if len(groups) > 1 else ""
                
                return ref_range, unit
        
        return "", ""
    
    def _determine_status(self, value_str: str, ref_range: str) -> str:
        """Determine if value is LOW, NORMAL, or HIGH."""
        try:
            value = float(value_str)
        except (ValueError, TypeError):
            return TestStatus.UNKNOWN.value
        
        if not ref_range:
            return TestStatus.UNKNOWN.value
        
        # Parse reference range
        ref_range = ref_range.replace('–', '-').replace('—', '-')
        
        # Format: min - max
        range_match = re.search(r'(\d+\.?\d*)\s*-\s*(\d+\.?\d*)', ref_range)
        if range_match:
            min_val = float(range_match.group(1))
            max_val = float(range_match.group(2))
            
            if value < min_val:
                return TestStatus.LOW.value
            elif value > max_val:
                return TestStatus.HIGH.value
            else:
                return TestStatus.NORMAL.value
        
        # Format: Upto X or < X
        upto_match = re.search(r'(?:upto|<)\s*(\d+\.?\d*)', ref_range, re.IGNORECASE)
        if upto_match:
            max_val = float(upto_match.group(1))
            return TestStatus.HIGH.value if value > max_val else TestStatus.NORMAL.value
        
        # Format: > X
        gt_match = re.search(r'>\s*(\d+\.?\d*)', ref_range)
        if gt_match:
            min_val = float(gt_match.group(1))
            return TestStatus.LOW.value if value < min_val else TestStatus.NORMAL.value
        
        return TestStatus.UNKNOWN.value
    
    def _determine_section(self, test_name: str) -> str:
        """Determine which section a test belongs to."""
        test_upper = test_name.upper()
        
        for name, data in self.test_patterns.items():
            if name in test_upper or any(alias in test_upper for alias in data.get("aliases", [])):
                return data["section"].value
        
        # Keyword-based fallback
        if any(kw in test_upper for kw in ['BLOOD', 'RBC', 'WBC', 'HEMOGLOBIN', 'PLATELET', 'ESR']):
            return Section.HEMATOLOGY.value
        if any(kw in test_upper for kw in ['SUGAR', 'GLUCOSE', 'HBA1C']):
            return Section.DIABETES.value
        if any(kw in test_upper for kw in ['URINE', 'PH', 'SPECIFIC GRAVITY']):
            return Section.URINE_ANALYSIS.value
        if any(kw in test_upper for kw in ['BILIRUBIN', 'SGPT', 'SGOT', 'ALT', 'AST', 'ALBUMIN']):
            return Section.LIVER_FUNCTION.value
        if any(kw in test_upper for kw in ['UREA', 'CREATININE', 'URIC']):
            return Section.KIDNEY_FUNCTION.value
        if any(kw in test_upper for kw in ['CHOLESTEROL', 'TRIGLYCERIDE', 'HDL', 'LDL']):
            return Section.LIPID_PROFILE.value
        if any(kw in test_upper for kw in ['TSH', 'T3', 'T4', 'THYROID']):
            return Section.THYROID.value
        
        return Section.OTHER.value
    
    def _normalize_test_name(self, test_name: str) -> str:
        """Normalize test name to standard format."""
        name_upper = test_name.upper().strip()
        
        # Check against known tests
        for standard_name, data in self.test_patterns.items():
            if name_upper == standard_name:
                return standard_name
            if name_upper in [alias.upper() for alias in data.get("aliases", [])]:
                return standard_name
        
        # Return cleaned version
        return ' '.join(test_name.upper().split())
    
    def _group_by_sections(self, tests: List[LabTest]) -> Dict[str, List[LabTest]]:
        """Group tests by their sections."""
        sections = {}
        for test in tests:
            section = test.section
            if section not in sections:
                sections[section] = []
            sections[section].append(test)
        return sections


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def parse_lab_report(raw_text: str) -> Dict[str, Any]:
    """
    Parse raw extracted text from lab report PDF into structured JSON.
    
    Args:
        raw_text: Unstructured text extracted using PyMuPDF or OCR
        
    Returns:
        Structured dictionary containing:
        - patient_info: Patient details (name, age, sex, date)
        - lab_tests: List of all extracted tests
        - sections: Tests grouped by category
        - summary: Overview statistics
    
    Example:
        >>> text = "FASTING BLOOD SUGAR 128 Plasma 70 - 110 mg/dL ..."
        >>> result = parse_lab_report(text)
        >>> print(json.dumps(result, indent=2))
    """
    parser = StructuredLabParser()
    return parser.parse(raw_text)


def parse_lab_report_to_json(raw_text: str) -> str:
    """
    Parse raw text and return JSON string.
    
    Args:
        raw_text: Unstructured text from lab report
        
    Returns:
        JSON string with structured data
    """
    result = parse_lab_report(raw_text)
    return json.dumps(result, indent=2, ensure_ascii=False)


# ═══════════════════════════════════════════════════════════════════════════════
# CLI TESTING
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Test with sample text
    sample_text = """
    Ref.By Mr.KODIBASS Age: 45 Years Sex: Male Date: 15-02-2026
    
    FASTING BLOOD SUGAR 128 Plasma 70 - 110 mg/dL
    POST PRANDIAL BLOOD SUGAR 225 Plasma 80 - 140 mg/dL
    
    HEMOGLOBIN 11.2 g/dL 13.0 - 17.0 g/dL
    TOTAL RBC COUNT 4.2 million/cumm 4.5 - 5.5 million/cumm
    TOTAL WBC COUNT 8500 cells/cumm 4000 - 11000 cells/cumm
    PLATELET COUNT 250000 cells/cumm 150000 - 400000 cells/cumm
    
    URINE ANALYSIS
    Macroscopic Analysis
    Colour DARK YELLOW
    Appearance CLOUDY
    Specific Gravity 1.025 1.005 - 1.030
    pH 6.0 4.5 - 8.0
    """
    
    result = parse_lab_report(sample_text)
    print(json.dumps(result, indent=2))
