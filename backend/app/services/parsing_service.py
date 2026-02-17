"""
Structured Parsing Engine
Extracts structured lab data from OCR text:
- Test Name
- Value (numeric)
- Unit
- Reference Range
- Flag (high/low/normal)
"""

import re
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Load medical dictionary
MEDICAL_DICT_PATH = Path(__file__).parent.parent / "data" / "medical_dictionary.json"
MEDICAL_DICTIONARY = {}
if MEDICAL_DICT_PATH.exists():
    with open(MEDICAL_DICT_PATH, 'r') as f:
        MEDICAL_DICTIONARY = json.load(f)


@dataclass
class LabResult:
    """Structured lab result"""
    test_name: str
    value: float
    unit: str
    reference_min: Optional[float]
    reference_max: Optional[float]
    flag: str  # "normal", "high", "low"
    raw_line: str
    confidence: float


class StructuredParser:
    """
    Parser for extracting structured lab data from OCR text.
    Handles various medical report formats.
    """
    
    def __init__(self):
        self.test_names = set(MEDICAL_DICTIONARY.get("test_names", []))
        self.reference_ranges = MEDICAL_DICTIONARY.get("reference_ranges", {})
        self.unit_aliases = MEDICAL_DICTIONARY.get("unit_aliases", {})
        self.test_aliases = MEDICAL_DICTIONARY.get("test_aliases", {})
        
        # Compile regex patterns
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for extraction"""
        
        # Pattern 1: Standard format with colon
        # Example: "Hemoglobin: 14.5 g/dL (12.0-16.0)"
        self.pattern_colon = re.compile(
            r'([A-Za-z][A-Za-z\s\-\/\(\)\.]+?)\s*[:\-]\s*'
            r'(\d+\.?\d*)\s*'
            r'([a-zA-Z%°\/\.\s]+?)?\s*'
            r'(?:\(?\s*(\d+\.?\d*)\s*[\-–to]\s*(\d+\.?\d*)\s*\)?)?',
            re.IGNORECASE
        )
        
        # Pattern 2: Tabular format (columns)
        # Example: "Hemoglobin    14.5    g/dL    12.0-16.0    Normal"
        self.pattern_tabular = re.compile(
            r'([A-Za-z][A-Za-z\s\-]+?)\s{2,}'
            r'(\d+\.?\d*)\s+'
            r'([a-zA-Z%°\/]+)\s+'
            r'(\d+\.?\d*)\s*[\-–]\s*(\d+\.?\d*)',
            re.IGNORECASE
        )
        
        # Pattern 3: Value with flag
        # Example: "Glucose   126 mg/dL   HIGH"
        self.pattern_flagged = re.compile(
            r'([A-Za-z][A-Za-z\s\-]+?)\s+'
            r'(\d+\.?\d*)\s*'
            r'([a-zA-Z%°\/]+)?\s*'
            r'(HIGH|LOW|NORMAL|H|L|N|\*)',
            re.IGNORECASE
        )
        
        # Pattern 4: Simple value extraction
        # Example: "RBC Count: 5.2"
        self.pattern_simple = re.compile(
            r'([A-Za-z][A-Za-z\s\-]+?)\s*[:\-]?\s*'
            r'(\d+\.?\d*)',
            re.IGNORECASE
        )
        
        # Flag indicators
        self.high_indicators = ['high', 'h', '*h', '↑', '>', 'elevated', 'above']
        self.low_indicators = ['low', 'l', '*l', '↓', '<', 'decreased', 'below']
    
    def normalize_test_name(self, name: str) -> str:
        """Normalize test name using aliases"""
        if not name:
            return name
        
        name_clean = name.strip().lower()
        
        # Check direct alias
        if name_clean in self.test_aliases:
            return self.test_aliases[name_clean]
        
        # Check known test names
        for test in self.test_names:
            if test.lower() == name_clean:
                return test
        
        # Return cleaned version
        return name.strip()
    
    def normalize_unit(self, unit: str) -> str:
        """Normalize unit using aliases"""
        if not unit:
            return ""
        
        unit_clean = unit.strip().lower()
        return self.unit_aliases.get(unit_clean, unit.strip())
    
    def determine_flag(
        self, 
        value: float, 
        ref_min: Optional[float], 
        ref_max: Optional[float],
        flag_text: str = None
    ) -> str:
        """Determine if value is high, low, or normal"""
        
        # Check explicit flag text first
        if flag_text:
            flag_lower = flag_text.lower().strip()
            if any(ind in flag_lower for ind in self.high_indicators):
                return "high"
            if any(ind in flag_lower for ind in self.low_indicators):
                return "low"
        
        # Check against reference range
        if ref_min is not None and ref_max is not None:
            if value < ref_min:
                return "low"
            elif value > ref_max:
                return "high"
        
        return "normal"
    
    def get_reference_range(self, test_name: str) -> Tuple[Optional[float], Optional[float], str]:
        """Get reference range from dictionary"""
        name_lower = test_name.lower()
        
        ref_data = self.reference_ranges.get(name_lower)
        if not ref_data:
            return None, None, ""
        
        default = ref_data.get("default", {})
        return (
            default.get("min"),
            default.get("max"),
            ref_data.get("unit", "")
        )
    
    def parse_line(self, line: str) -> Optional[LabResult]:
        """Parse a single line for lab results"""
        if not line or len(line.strip()) < 5:
            return None
        
        line = line.strip()
        
        # Try each pattern in order of specificity
        
        # Pattern 1: Flagged format
        match = self.pattern_flagged.search(line)
        if match:
            try:
                test_name = self.normalize_test_name(match.group(1))
                value = float(match.group(2))
                unit = self.normalize_unit(match.group(3)) if match.group(3) else ""
                flag_text = match.group(4)
                
                ref_min, ref_max, dict_unit = self.get_reference_range(test_name)
                if not unit and dict_unit:
                    unit = dict_unit
                
                flag = self.determine_flag(value, ref_min, ref_max, flag_text)
                
                return LabResult(
                    test_name=test_name,
                    value=value,
                    unit=unit,
                    reference_min=ref_min,
                    reference_max=ref_max,
                    flag=flag,
                    raw_line=line,
                    confidence=90.0
                )
            except (ValueError, TypeError):
                pass
        
        # Pattern 2: Colon format with reference range
        match = self.pattern_colon.search(line)
        if match:
            try:
                test_name = self.normalize_test_name(match.group(1))
                value = float(match.group(2))
                unit = self.normalize_unit(match.group(3)) if match.group(3) else ""
                ref_min = float(match.group(4)) if match.group(4) else None
                ref_max = float(match.group(5)) if match.group(5) else None
                
                if not ref_min or not ref_max:
                    dict_min, dict_max, dict_unit = self.get_reference_range(test_name)
                    ref_min = ref_min or dict_min
                    ref_max = ref_max or dict_max
                    if not unit and dict_unit:
                        unit = dict_unit
                
                flag = self.determine_flag(value, ref_min, ref_max)
                
                return LabResult(
                    test_name=test_name,
                    value=value,
                    unit=unit,
                    reference_min=ref_min,
                    reference_max=ref_max,
                    flag=flag,
                    raw_line=line,
                    confidence=85.0
                )
            except (ValueError, TypeError):
                pass
        
        # Pattern 3: Tabular format
        match = self.pattern_tabular.search(line)
        if match:
            try:
                test_name = self.normalize_test_name(match.group(1))
                value = float(match.group(2))
                unit = self.normalize_unit(match.group(3))
                ref_min = float(match.group(4))
                ref_max = float(match.group(5))
                
                flag = self.determine_flag(value, ref_min, ref_max)
                
                return LabResult(
                    test_name=test_name,
                    value=value,
                    unit=unit,
                    reference_min=ref_min,
                    reference_max=ref_max,
                    flag=flag,
                    raw_line=line,
                    confidence=80.0
                )
            except (ValueError, TypeError):
                pass
        
        # Pattern 4: Simple format (fallback)
        match = self.pattern_simple.search(line)
        if match:
            try:
                test_name = self.normalize_test_name(match.group(1))
                value = float(match.group(2))
                
                # Skip if test name is too generic
                if len(test_name) < 3 or test_name.lower() in ['the', 'and', 'for', 'test', 'result']:
                    return None
                
                ref_min, ref_max, dict_unit = self.get_reference_range(test_name)
                flag = self.determine_flag(value, ref_min, ref_max)
                
                return LabResult(
                    test_name=test_name,
                    value=value,
                    unit=dict_unit,
                    reference_min=ref_min,
                    reference_max=ref_max,
                    flag=flag,
                    raw_line=line,
                    confidence=60.0
                )
            except (ValueError, TypeError):
                pass
        
        return None
    
    def parse_text(self, text: str) -> List[Dict[str, Any]]:
        """Parse OCR text and extract all lab results"""
        results = []
        seen_tests = set()
        
        lines = text.split('\n')
        
        for line in lines:
            result = self.parse_line(line)
            
            if result:
                # Avoid duplicates
                test_key = result.test_name.lower()
                if test_key not in seen_tests:
                    seen_tests.add(test_key)
                    results.append({
                        "test_name": result.test_name,
                        "value": result.value,
                        "unit": result.unit,
                        "reference_min": result.reference_min,
                        "reference_max": result.reference_max,
                        "flag": result.flag,
                        "raw_line": result.raw_line,
                        "confidence": result.confidence
                    })
        
        # Sort by confidence (highest first)
        results.sort(key=lambda x: x["confidence"], reverse=True)
        
        return results
    
    def parse_table_data(self, rows: List[List[str]]) -> List[Dict[str, Any]]:
        """
        Parse structured table data (from table detection)
        Expects rows where each row is a list of cell values
        """
        results = []
        
        if not rows or len(rows) < 2:
            return results
        
        # Try to identify header row
        header = None
        data_start = 0
        
        for i, row in enumerate(rows[:3]):  # Check first 3 rows for header
            row_text = ' '.join(str(cell) for cell in row).lower()
            if any(h in row_text for h in ['test', 'name', 'result', 'value', 'unit', 'reference']):
                header = row
                data_start = i + 1
                break
        
        # Map column indices
        col_map = {
            'test_name': 0,
            'value': 1,
            'unit': 2,
            'reference': 3,
            'flag': 4
        }
        
        if header:
            for i, cell in enumerate(header):
                cell_lower = str(cell).lower()
                if 'test' in cell_lower or 'name' in cell_lower:
                    col_map['test_name'] = i
                elif 'value' in cell_lower or 'result' in cell_lower:
                    col_map['value'] = i
                elif 'unit' in cell_lower:
                    col_map['unit'] = i
                elif 'ref' in cell_lower or 'range' in cell_lower:
                    col_map['reference'] = i
                elif 'flag' in cell_lower or 'status' in cell_lower:
                    col_map['flag'] = i
        
        # Process data rows
        for row in rows[data_start:]:
            if len(row) < 2:
                continue
            
            try:
                test_name = str(row[col_map['test_name']]) if col_map['test_name'] < len(row) else ""
                value_str = str(row[col_map['value']]) if col_map['value'] < len(row) else ""
                unit = str(row[col_map['unit']]) if col_map['unit'] < len(row) else ""
                ref_str = str(row[col_map['reference']]) if col_map['reference'] < len(row) else ""
                flag_str = str(row[col_map['flag']]) if col_map['flag'] < len(row) else ""
                
                # Parse value
                value_match = re.search(r'(\d+\.?\d*)', value_str)
                if not value_match:
                    continue
                value = float(value_match.group(1))
                
                # Parse reference range
                ref_match = re.search(r'(\d+\.?\d*)\s*[\-–to]\s*(\d+\.?\d*)', ref_str)
                ref_min = float(ref_match.group(1)) if ref_match else None
                ref_max = float(ref_match.group(2)) if ref_match else None
                
                # Normalize
                test_name = self.normalize_test_name(test_name)
                unit = self.normalize_unit(unit)
                
                if not ref_min or not ref_max:
                    dict_min, dict_max, dict_unit = self.get_reference_range(test_name)
                    ref_min = ref_min or dict_min
                    ref_max = ref_max or dict_max
                    if not unit:
                        unit = dict_unit
                
                flag = self.determine_flag(value, ref_min, ref_max, flag_str)
                
                results.append({
                    "test_name": test_name,
                    "value": value,
                    "unit": unit,
                    "reference_min": ref_min,
                    "reference_max": ref_max,
                    "flag": flag,
                    "confidence": 75.0
                })
                
            except (ValueError, TypeError, IndexError):
                continue
        
        return results
    
    def extract_patient_info(self, text: str) -> Dict[str, Any]:
        """Extract patient information from report text"""
        info = {
            "name": None,
            "age": None,
            "gender": None,
            "date": None,
            "report_id": None
        }
        
        lines = text.split('\n')[:20]  # Check first 20 lines
        
        for line in lines:
            line_lower = line.lower()
            
            # Name
            if 'name' in line_lower and ':' in line:
                name_match = re.search(r'name\s*[:\-]\s*(.+)', line, re.IGNORECASE)
                if name_match:
                    info["name"] = name_match.group(1).strip()
            
            # Age
            age_match = re.search(r'age\s*[:\-]?\s*(\d+)\s*(yrs?|years?)?', line, re.IGNORECASE)
            if age_match:
                info["age"] = int(age_match.group(1))
            
            # Gender
            if re.search(r'\b(male|female|m|f)\b', line_lower):
                if 'male' in line_lower or (line_lower.split() and 'm' in line_lower.split()):
                    info["gender"] = "male"
                elif 'female' in line_lower or (line_lower.split() and 'f' in line_lower.split()):
                    info["gender"] = "female"
            
            # Date
            date_match = re.search(
                r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})',
                line
            )
            if date_match and not info["date"]:
                info["date"] = date_match.group(1)
            
            # Report ID
            id_match = re.search(r'(report|id|ref)\s*[:\-#]?\s*([A-Z0-9\-]+)', line, re.IGNORECASE)
            if id_match:
                info["report_id"] = id_match.group(2)
        
        return info


# Create singleton instance
structured_parser = StructuredParser()


def parse_lab_text(text: str) -> List[Dict[str, Any]]:
    """Convenience function to parse lab text"""
    return structured_parser.parse_text(text)


def extract_patient_info(text: str) -> Dict[str, Any]:
    """Convenience function to extract patient info"""
    return structured_parser.extract_patient_info(text)
