"""
Lab Parser Module
Parses extracted text and tables to identify lab test results.
Handles various lab report formats and extracts structured data.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
import logging

from utils.reference_ranges import REFERENCE_RANGES, get_reference_range

logger = logging.getLogger(__name__)


class LabParser:
    """
    Parses lab test results from extracted text and tables.
    Produces structured output with test names, values, units, and reference ranges.
    """
    
    def __init__(self):
        # Common lab test name patterns
        self.test_patterns = self._build_test_patterns()
        
        # Value extraction pattern: number with optional decimal, possibly followed by unit
        self.value_pattern = re.compile(
            r'(\d+\.?\d*)\s*([a-zA-Z/%µμ]+(?:/[a-zA-Z]+)?)?'
        )
        
        # Range pattern: min-max, min - max, min to max
        self.range_pattern = re.compile(
            r'(\d+\.?\d*)\s*[-–—to]\s*(\d+\.?\d*)'
        )
        
        # Pattern for lab report line: TEST_NAME VALUE REFERENCE_RANGE
        self.lab_line_pattern = re.compile(
            r'^([A-Za-z\s\(\)\-\/\*]+?)\s+'  # Test name
            r'([\d\.]+(?:\s*[↑↓])?)\s+'       # Value (with optional arrow)
            r'(.+)$'                           # Reference range
        )
    
    def _build_test_patterns(self) -> Dict[str, re.Pattern]:
        """
        Build regex patterns for common lab tests.
        """
        tests = {
            # Complete Blood Count (CBC)
            "hemoglobin": r"h[ae]moglobin|hgb|hb\b",
            "hematocrit": r"h[ae]matocrit|hct|pcv\b",
            "rbc_count": r"rbc|red\s*blood\s*cell|erythrocyte",
            "wbc_count": r"wbc|white\s*blood\s*cell|leucocyte|leukocyte|total\s*wbc",
            "platelet_count": r"platelet|plt|thrombocyte",
            "mcv": r"\bmcv\b|mean\s*corpuscular\s*volume",
            "mch": r"\bmch\b|mean\s*corpuscular\s*h[ae]moglobin",
            "mchc": r"\bmchc\b",
            "rdw": r"\brdw\b|red\s*cell\s*distribution",
            
            # Differential Count
            "neutrophils": r"neutrophil|neut|poly|polymorphs",
            "lymphocytes": r"lymphocyte|lymph",
            "monocytes": r"monocyte|mono",
            "eosinophils": r"eosinophil|eos",
            "basophils": r"basophil|baso",
            
            # Metabolic Panel
            "glucose_fasting": r"fasting\s*(?:blood\s*)?(?:glucose|sugar)|fbg|fbs",
            "glucose_random": r"(?:random\s*)?(?:blood\s*)?glucose\s*random|rbg|rbs|blood\s*glucose\s*random",
            "glucose_pp": r"post\s*prandial|pp\s*(?:blood\s*)?(?:glucose|sugar)|ppbs",
            "hba1c": r"hba1c|glycated\s*h[ae]moglobin|a1c",
            
            # Kidney Function
            "creatinine": r"creatinine|creat\b",
            "bun": r"\bbun\b|blood\s*urea\s*nitrogen",
            "urea": r"\b(?:blood\s*)?urea\b(?!\s*nitrogen)",
            "uric_acid": r"uric\s*acid",
            "egfr": r"\begfr\b|glomerular\s*filtration",
            
            # Liver Function
            "sgpt_alt": r"sgpt|alt\b|alanine\s*(?:amino)?transaminase",
            "sgot_ast": r"sgot|ast\b|aspartate\s*(?:amino)?transaminase",
            "alp": r"\balp\b|alkaline\s*phosphatase",
            "ggt": r"\bggt\b|gamma\s*glutamyl",
            "bilirubin_total": r"total\s*bilirubin|bilirubin\s*total|t[.\s-]*bil",
            "bilirubin_direct": r"direct\s*bilirubin|bilirubin\s*direct|d[.\s-]*bil|conjugated",
            "bilirubin_indirect": r"indirect\s*bilirubin|unconjugated",
            "albumin": r"\b(?:serum\s*)?albumin\b|alubumin",
            "total_protein": r"total\s*protein",
            
            # Lipid Panel
            "cholesterol_total": r"(?:total\s*)?cholesterol(?:\s*total)?|tc\b",
            "hdl": r"\bhdl\b|high\s*density",
            "ldl": r"\bldl\b|low\s*density",
            "vldl": r"\bvldl\b|very\s*low\s*density",
            "triglycerides": r"triglyceride|tg\b",
            
            # Thyroid Panel
            "tsh": r"\btsh\b|thyroid\s*stimulating",
            "t3": r"\bt3\b|triiodothyronine",
            "t4": r"\bt4\b|thyroxine",
            "free_t3": r"free\s*t3|ft3",
            "free_t4": r"free\s*t4|ft4",
            
            # Electrolytes
            "sodium": r"\b(?:serum\s*)?sodium\b|\bna\b(?!\w)",
            "potassium": r"\b(?:serum\s*)?potassium\b|\bk\b(?!\w)",
            "chloride": r"\b(?:serum\s*)?chloride\b|\bcl\b(?!\w)",
            "calcium": r"\b(?:serum\s*)?calcium\b|\bca\b(?!\w)",
            "magnesium": r"\bmagnesium\b|\bmg\b(?!\s*/)",
            "phosphorus": r"\bphosphorus\b|\bphosphate\b|\bphosphorous\b",
            
            # Cardiac Markers
            "troponin": r"troponin",
            "ck_mb": r"ck[\s-]*mb|creatine\s*kinase\s*mb",
            "bnp": r"\bbnp\b|brain\s*natriuretic",
            
            # Inflammation Markers
            "crp": r"\bcrp\b|c[\s-]*reactive\s*protein",
            "esr": r"\besr\b|erythrocyte\s*sedimentation",
            
            # Coagulation
            "pt": r"\bpt\b|prothrombin\s*time",
            "inr": r"\binr\b|international\s*normalized",
            "aptt": r"\baptt\b|activated\s*partial",
            
            # Vitamins
            "vitamin_d": r"vitamin\s*d|25[\s-]*hydroxy|25[\s-]*oh",
            "vitamin_b12": r"vitamin\s*b[\s-]*12|cobalamin|cyanocobalamin",
            "folate": r"\bfolate\b|folic\s*acid",
            "iron": r"\biron\b|\bfe\b",
            "ferritin": r"ferritin",
            "tibc": r"\btibc\b|total\s*iron\s*binding",
            
            # Urine
            "urine_albumin": r"urine.*albumin|albumin.*urine",
            "urine_sugar": r"urine.*sugar|sugar.*urine",
            "specific_gravity": r"specific\s*gravity",
            "urine_ph": r"(?:urine.*)?ph(?:.*urine)?",
        }
        
        return {name: re.compile(pattern, re.IGNORECASE) for name, pattern in tests.items()}
    
    def parse_lab_results(self, text: str, tables: List[Dict]) -> List[Dict[str, Any]]:
        """
        Parse lab results from extracted text and tables.
        Returns list of structured lab test results.
        """
        results = []
        
        # Parse from tables first (more structured)
        for table in tables:
            if table.get("is_lab_table", False):
                table_results = self._parse_from_table(table)
                results.extend(table_results)
        
        # If no results from tables, parse from text
        if not results:
            text_results = self._parse_from_text_lines(text)
            results.extend(text_results)
        else:
            # Try to find additional results from text
            text_results = self._parse_from_text_lines(text)
            results = self._merge_results(results, text_results)
        
        # Add reference ranges and determine status for each result
        for result in results:
            result = self._enrich_result(result)
        
        return results
    
    def _parse_from_text_lines(self, text: str) -> List[Dict[str, Any]]:
        """
        Parse lab results from text by analyzing line patterns.
        Handles the common format: TEST_NAME VALUE REFERENCE_RANGE
        """
        results = []
        lines = text.split('\n')
        
        # Skip header lines and find data lines
        in_data_section = False
        current_section = ""
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line or len(line) < 3:
                continue
            
            # Detect section headers
            if self._is_section_header(line):
                current_section = line
                in_data_section = True
                continue
            
            # Skip non-data lines
            if self._should_skip_line(line):
                continue
            
            # Try to parse as lab result line
            result = self._parse_lab_line(line, current_section)
            if result:
                results.append(result)
        
        return results
    
    def _is_section_header(self, line: str) -> bool:
        """Check if line is a section header."""
        headers = [
            "biochemistry", "hematology", "clinical pathology", 
            "urine", "serology", "immunology", "renal", "liver",
            "lipid", "thyroid", "cardiac", "test name", "result",
            "macroscopic", "microscopic", "differential"
        ]
        line_lower = line.lower()
        return any(h in line_lower for h in headers)
    
    def _should_skip_line(self, line: str) -> bool:
        """Check if line should be skipped."""
        skip_patterns = [
            r'^page\s*\d+',
            r'^dr\.',
            r'^\d{2}[-/]\d{2}[-/]\d{4}',  # Date
            r'^requested\s*on',
            r'^reported\s*on',
            r'^specimen',
            r'^department',
            r'^reg\s*no',
            r'^req\s*no',
            r'^[-=]{5,}',  # Separator lines
            r'^end\s*of\s*report',
            r'verified\s*by',
            r'consultant',
            r'pathologist',
        ]
        line_lower = line.lower()
        return any(re.search(p, line_lower) for p in skip_patterns)
    
    def _parse_lab_line(self, line: str, section: str = "") -> Optional[Dict[str, Any]]:
        """
        Parse a single line that might contain lab result data.
        Format: TEST_NAME VALUE [↑↓] REFERENCE_RANGE UNIT
        """
        # Clean line
        line = re.sub(r'\s+', ' ', line).strip()
        
        # Skip if line is too short or doesn't have numbers
        if len(line) < 5 or not re.search(r'\d', line):
            return None
        
        # Try multiple parsing strategies
        result = self._try_parse_standard_format(line)
        if result:
            return result
        
        result = self._try_parse_with_arrows(line)
        if result:
            return result
        
        return None
    
    def _try_parse_standard_format(self, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse standard format: TEST_NAME VALUE UNIT REFERENCE_RANGE
        Example: BLOOD GLUCOSE RANDOM* 81 75 - 125 mg/dL
        """
        # Pattern: Test name, then value, then reference range
        # Test name ends where first number starts
        match = re.match(
            r'^([A-Za-z\s\(\)\-\/\*\[\]]+?)\s+'   # Test name (letters, spaces, special chars)
            r'([\d\.]+)\s*'                        # Value
            r'([↑↓]?\s*)?'                         # Optional arrow
            r'(.*)$',                              # Rest (reference range + unit)
            line
        )
        
        if not match:
            return None
        
        test_name = match.group(1).strip().rstrip('*')
        value_str = match.group(2).strip()
        arrow = match.group(3).strip() if match.group(3) else ""
        rest = match.group(4).strip()
        
        # Skip if test name looks invalid
        if len(test_name) < 2 or test_name.lower() in ['page', 'dr', 'mrs', 'mr', 'ms']:
            return None
        
        # Parse reference range and unit from rest
        ref_range, unit = self._parse_reference_and_unit(rest)
        
        # Determine status from arrow or will be calculated later
        status = ""
        if "↓" in arrow or "↓" in line:
            status = "LOW"
        elif "↑" in arrow or "↑" in line:
            status = "HIGH"
        
        try:
            numeric_value = float(value_str)
        except ValueError:
            numeric_value = None
        
        # Normalize test name
        normalized_name = self._normalize_test_name(test_name)
        
        return {
            "test_name": test_name,
            "test_name_normalized": normalized_name,
            "value": value_str,
            "numeric_value": numeric_value,
            "unit": unit,
            "reference_range": ref_range,
            "status": status,
            "source": "text"
        }
    
    def _try_parse_with_arrows(self, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse format with arrows indicating abnormal: TEST VALUE ↓ RANGE
        Example: HAEMOGLOBIN* 11.2 ↓ 12 - 15 g/dL
        """
        # Look for arrow indicators
        if "↓" not in line and "↑" not in line:
            return None
        
        # Split on arrow
        if "↓" in line:
            parts = line.split("↓")
            status = "LOW"
        else:
            parts = line.split("↑")
            status = "HIGH"
        
        if len(parts) != 2:
            return None
        
        left_part = parts[0].strip()
        right_part = parts[1].strip()
        
        # Parse left part for test name and value
        left_match = re.match(r'^([A-Za-z\s\(\)\-\/\*\[\]]+?)\s+([\d\.]+)\s*$', left_part)
        if not left_match:
            return None
        
        test_name = left_match.group(1).strip().rstrip('*')
        value_str = left_match.group(2).strip()
        
        # Right part is reference range
        ref_range, unit = self._parse_reference_and_unit(right_part)
        
        try:
            numeric_value = float(value_str)
        except ValueError:
            numeric_value = None
        
        normalized_name = self._normalize_test_name(test_name)
        
        return {
            "test_name": test_name,
            "test_name_normalized": normalized_name,
            "value": value_str,
            "numeric_value": numeric_value,
            "unit": unit,
            "reference_range": ref_range,
            "status": status,
            "source": "text"
        }
    
    def _parse_reference_and_unit(self, text: str) -> Tuple[str, str]:
        """
        Parse reference range and unit from text.
        Examples:
            "75 - 125 mg/dL" -> ("75 - 125", "mg/dL")
            "12 - 15 g/dL" -> ("12 - 15", "g/dL")
            "Upto 200 mg/dL" -> ("Upto 200", "mg/dL")
        """
        text = text.strip()
        
        # Common units
        unit_pattern = r'(mg/dL|g/dL|mg/L|g/L|mEq/L|mmol/L|U/L|IU/L|%|cells/cumm|Cells/cumm|cells/uL|Cells/uL|Cells/HPF|/HPF|mL/min|pg|fL|ng/mL|pg/mL|µg/dL|mm/hr|seconds)'
        
        unit_match = re.search(unit_pattern, text, re.IGNORECASE)
        unit = unit_match.group(1) if unit_match else ""
        
        # Reference range is everything except the unit
        if unit:
            ref_range = text[:text.lower().find(unit.lower())].strip()
        else:
            ref_range = text
        
        # Clean up reference range
        ref_range = re.sub(r'\s+', ' ', ref_range).strip()
        
        return ref_range, unit
    
    def _parse_from_table(self, table: Dict) -> List[Dict[str, Any]]:
        """
        Parse lab results from a table structure.
        """
        results = []
        header = table.get("header", [])
        rows = table.get("rows", [])
        
        if not header or not rows:
            return results
        
        # Identify column indices
        col_map = self._identify_columns(header)
        
        for row in rows:
            if len(row) < 2:
                continue
            
            # Extract values based on column mapping
            test_name = self._get_cell(row, col_map.get("test_name", 0))
            value = self._get_cell(row, col_map.get("value", 1))
            unit = self._get_cell(row, col_map.get("unit", -1))
            ref_range = self._get_cell(row, col_map.get("reference", -1))
            status = self._get_cell(row, col_map.get("status", -1))
            
            if not test_name or not value:
                continue
            
            # Parse numeric value
            numeric_value, extracted_unit = self._extract_numeric_value(value)
            
            if unit is None and extracted_unit:
                unit = extracted_unit
            
            # Normalize test name
            normalized_name = self._normalize_test_name(test_name)
            
            result = {
                "test_name": test_name,
                "test_name_normalized": normalized_name,
                "value": value,
                "numeric_value": numeric_value,
                "unit": unit or "",
                "reference_range": ref_range or "",
                "status": status or "",
                "source": "table"
            }
            
            results.append(result)
        
        return results
    
    def _identify_columns(self, header: List[str]) -> Dict[str, int]:
        """
        Identify which columns contain which data.
        """
        col_map = {"test_name": 0, "value": 1}
        
        header_lower = [h.lower() if h else "" for h in header]
        
        for i, col in enumerate(header_lower):
            if any(kw in col for kw in ["test", "investigation", "parameter", "name", "analyte"]):
                col_map["test_name"] = i
            elif any(kw in col for kw in ["result", "value", "observed", "finding"]):
                col_map["value"] = i
            elif any(kw in col for kw in ["unit"]):
                col_map["unit"] = i
            elif any(kw in col for kw in ["reference", "range", "normal", "ref", "biological"]):
                col_map["reference"] = i
            elif any(kw in col for kw in ["flag", "status", "interpretation"]):
                col_map["status"] = i
        
        return col_map
    
    def _get_cell(self, row: List[str], index: int) -> Optional[str]:
        """
        Safely get cell value from row.
        """
        if index < 0 or index >= len(row):
            return None
        return row[index].strip() if row[index] else None
    
    def _extract_numeric_value(self, value_str: str) -> Tuple[Optional[float], Optional[str]]:
        """
        Extract numeric value and unit from a value string.
        """
        if not value_str:
            return None, None
        
        # Clean the string
        value_str = value_str.strip()
        
        # Remove arrow indicators
        value_str = re.sub(r'[↑↓]', '', value_str).strip()
        
        # Try to extract number
        match = re.match(r'([<>]?\s*)?(\d+\.?\d*)\s*([a-zA-Z/%µμ]+(?:/[a-zA-Z]+)?)?', value_str)
        
        if match:
            try:
                numeric = float(match.group(2))
                unit = match.group(3)
                return numeric, unit
            except (ValueError, TypeError):
                pass
        
        return None, None
    
    def _normalize_test_name(self, test_name: str) -> str:
        """
        Normalize test name to a standard code.
        """
        test_name_lower = test_name.lower().strip()
        
        # Remove asterisks and clean up
        test_name_lower = re.sub(r'\*', '', test_name_lower).strip()
        
        for code, pattern in self.test_patterns.items():
            if pattern.search(test_name_lower):
                return code
        
        # Return cleaned version if no match
        return re.sub(r'[^\w\s]', '', test_name).strip().lower().replace(' ', '_')
    
    def _enrich_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add reference range and status if not present.
        """
        test_code = result.get("test_name_normalized", "")
        numeric_value = result.get("numeric_value")
        
        # Add reference range if missing
        if not result.get("reference_range"):
            ref_data = get_reference_range(test_code)
            if ref_data:
                result["reference_range"] = ref_data.get("range_text", "")
        
        # Determine status if not present
        if not result.get("status") and numeric_value is not None:
            result["status"] = self._determine_status(test_code, numeric_value, result.get("reference_range", ""))
        
        return result
    
    def _determine_status(self, test_code: str, value: float, ref_range_str: str) -> str:
        """
        Determine if value is LOW, NORMAL, or HIGH based on reference range.
        """
        # Try to get reference range from database
        ref_data = get_reference_range(test_code)
        
        min_val = None
        max_val = None
        
        if ref_data:
            min_val = ref_data.get("min")
            max_val = ref_data.get("max")
        elif ref_range_str:
            # Parse from string
            match = self.range_pattern.search(ref_range_str)
            if match:
                try:
                    min_val = float(match.group(1))
                    max_val = float(match.group(2))
                except (ValueError, TypeError):
                    pass
            else:
                # Try "Upto X" format
                upto_match = re.search(r'upto\s+(\d+\.?\d*)', ref_range_str, re.IGNORECASE)
                if upto_match:
                    max_val = float(upto_match.group(1))
                    min_val = 0
        
        if min_val is not None and max_val is not None:
            if value < min_val:
                return "LOW"
            elif value > max_val:
                return "HIGH"
            else:
                return "NORMAL"
        elif min_val is not None:
            return "LOW" if value < min_val else "NORMAL"
        elif max_val is not None:
            return "HIGH" if value > max_val else "NORMAL"
        
        return ""  # Cannot determine
    
    def _merge_results(self, table_results: List[Dict], text_results: List[Dict]) -> List[Dict]:
        """
        Merge results from tables and text, avoiding duplicates.
        Table results take priority.
        """
        # Create set of normalized names from table results
        seen_tests = {r.get("test_name_normalized", "").lower() for r in table_results}
        
        merged = table_results.copy()
        
        for result in text_results:
            test_code = result.get("test_name_normalized", "").lower()
            if test_code and test_code not in seen_tests:
                merged.append(result)
                seen_tests.add(test_code)
        
        return merged
    
    def extract_patient_info(self, text: str) -> Dict[str, str]:
        """
        Extract patient information from text.
        """
        info = {
            "name": "",
            "age": "",
            "gender": "",
            "patient_id": "",
            "date": "",
            "doctor": ""
        }
        
        lines = text[:3000].split('\n')  # Search in first 3000 chars
        
        for line in lines:
            line_lower = line.lower()
            
            # Patient name - look for Mrs/Mr/Ms followed by name
            if not info["name"]:
                name_match = re.search(r'(?:mrs?|ms)\.?\s+([A-Z][A-Za-z\s]+?)(?:\s+\d|\s*$)', line, re.IGNORECASE)
                if name_match:
                    info["name"] = name_match.group(1).strip()[:100]
            
            # Age and Gender together (e.g., "48 Y/Female")
            if not info["age"] or not info["gender"]:
                age_gender_match = re.search(r'(\d+)\s*[yY](?:rs?|ears?)?\s*/?\s*(male|female|m|f)\b', line, re.IGNORECASE)
                if age_gender_match:
                    info["age"] = age_gender_match.group(1)
                    gender = age_gender_match.group(2).lower()
                    info["gender"] = "Male" if gender in ['male', 'm'] else "Female"
            
            # Just age
            if not info["age"]:
                age_match = re.search(r'\b(\d{1,3})\s*(?:y|yrs?|years?)\b', line, re.IGNORECASE)
                if age_match:
                    info["age"] = age_match.group(1)
            
            # Registration/Patient ID
            if not info["patient_id"]:
                id_match = re.search(r'(?:reg(?:istration)?\s*no|patient\s*id|mrn|uhid)[:\s]*([A-Za-z0-9-]+)', line, re.IGNORECASE)
                if id_match:
                    info["patient_id"] = id_match.group(1).strip()
            
            # Date
            if not info["date"]:
                date_match = re.search(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', line)
                if date_match:
                    info["date"] = date_match.group(1)
            
            # Referring Doctor
            if not info["doctor"]:
                if "referred by" in line_lower or "dr" in line_lower:
                    doc_match = re.search(r'(?:referred\s*by|dr\.?)\s*:?\s*([A-Za-z\s\.]+)', line, re.IGNORECASE)
                    if doc_match:
                        doc_name = doc_match.group(1).strip()
                        # Clean up and validate
                        if len(doc_name) > 2 and not doc_name.lower().startswith('mrs'):
                            info["doctor"] = doc_name[:100]
        
        return info

