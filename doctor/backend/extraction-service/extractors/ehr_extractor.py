"""
EHR Data Extractor Module

Extracts and processes patient data from CSV files (Electronic Health Records).
Handles common EHR export formats and normalizes data for analysis.
"""

import os
import csv
import json
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
import logging
import io

logger = logging.getLogger(__name__)

# Try to import pandas for better CSV handling
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    logger.warning("pandas not installed. Using basic CSV parsing.")


class EHRExtractor:
    """
    Extracts patient data from CSV-based EHR exports.
    Handles various CSV formats and normalizes the data structure.
    """
    
    # Common EHR field mappings (different systems use different column names)
    FIELD_MAPPINGS = {
        # Patient identifiers
        "patient_id": ["patient_id", "patientid", "patient id", "mrn", "medical_record_number", "id"],
        "name": ["name", "patient_name", "full_name", "fullname"],
        "first_name": ["first_name", "firstname", "fname", "given_name"],
        "last_name": ["last_name", "lastname", "lname", "family_name", "surname"],
        
        # Demographics
        "age": ["age", "patient_age"],
        "date_of_birth": ["date_of_birth", "dob", "birth_date", "birthdate", "dateofbirth"],
        "sex": ["sex", "gender"],
        "blood_type": ["blood_type", "bloodtype", "blood_group"],
        
        # Contact
        "phone": ["phone", "telephone", "contact_number", "mobile", "phone_number"],
        "email": ["email", "email_address", "e_mail"],
        "address": ["address", "home_address", "street_address"],
        
        # Medical info
        "diagnosis": ["diagnosis", "primary_diagnosis", "diagnoses", "condition", "conditions"],
        "allergies": ["allergies", "allergy", "known_allergies"],
        "medications": ["medications", "current_medications", "medicines", "drugs"],
        "medical_history": ["medical_history", "history", "past_medical_history", "pmh"],
        "family_history": ["family_history", "family_medical_history"],
        
        # Vitals
        "blood_pressure": ["blood_pressure", "bp", "bloodpressure"],
        "heart_rate": ["heart_rate", "pulse", "hr"],
        "temperature": ["temperature", "temp", "body_temperature"],
        "weight": ["weight", "body_weight"],
        "height": ["height", "body_height"],
        "bmi": ["bmi", "body_mass_index"],
        
        # Dates
        "admission_date": ["admission_date", "admissiondate", "admit_date", "date_of_admission"],
        "discharge_date": ["discharge_date", "dischargedate", "date_of_discharge"],
        "visit_date": ["visit_date", "encounter_date", "appointment_date", "date"],
        
        # Provider info
        "doctor": ["doctor", "physician", "provider", "attending_physician", "doctor_name"],
        "department": ["department", "dept", "specialty", "clinic"],
        
        # Lab results in EHR
        "lab_results": ["lab_results", "laboratory_results", "labs", "test_results"],
    }
    
    def __init__(self):
        self.pandas_available = PANDAS_AVAILABLE
    
    def extract_from_csv(self, file_path: str, encoding: str = "utf-8") -> Dict[str, Any]:
        """
        Extract EHR data from a CSV file.
        
        Args:
            file_path: Path to the CSV file
            encoding: File encoding (default utf-8)
            
        Returns:
            Structured EHR data dictionary
        """
        if not os.path.exists(file_path):
            return {"error": f"File not found: {file_path}"}
        
        try:
            if self.pandas_available:
                return self._extract_with_pandas(file_path, encoding)
            else:
                return self._extract_basic(file_path, encoding)
        except Exception as e:
            logger.error(f"CSV extraction error: {e}")
            return {"error": str(e)}
    
    def extract_from_csv_content(self, csv_content: str) -> Dict[str, Any]:
        """
        Extract EHR data from CSV content string.
        
        Args:
            csv_content: CSV data as string
            
        Returns:
            Structured EHR data dictionary
        """
        try:
            if self.pandas_available:
                df = pd.read_csv(io.StringIO(csv_content))
                return self._process_dataframe(df)
            else:
                reader = csv.DictReader(io.StringIO(csv_content))
                rows = list(reader)
                return self._process_rows(rows)
        except Exception as e:
            logger.error(f"CSV content extraction error: {e}")
            return {"error": str(e)}
    
    def _extract_with_pandas(self, file_path: str, encoding: str) -> Dict[str, Any]:
        """
        Extract using pandas for better handling of complex CSVs.
        """
        # Try different encodings if default fails
        encodings_to_try = [encoding, "utf-8", "latin-1", "cp1252"]
        
        df = None
        for enc in encodings_to_try:
            try:
                df = pd.read_csv(file_path, encoding=enc)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            return {"error": "Could not decode CSV file with common encodings"}
        
        return self._process_dataframe(df)
    
    def _process_dataframe(self, df: 'pd.DataFrame') -> Dict[str, Any]:
        """
        Process pandas DataFrame into structured EHR data.
        """
        # Normalize column names
        df.columns = df.columns.str.lower().str.strip()
        
        # Create column mapping
        column_map = self._create_column_mapping(df.columns.tolist())
        
        # Extract patient records
        patients = []
        for _, row in df.iterrows():
            patient = self._extract_patient_record(row.to_dict(), column_map)
            if patient:
                patients.append(patient)
        
        # Determine if this is single or multiple patient data
        if len(patients) == 1:
            result = patients[0]
            result["record_count"] = 1
        else:
            result = {
                "patients": patients,
                "record_count": len(patients),
                "is_multi_patient": True
            }
        
        result["columns_found"] = df.columns.tolist()
        result["extraction_source"] = "csv_ehr"
        
        return result
    
    def _extract_basic(self, file_path: str, encoding: str) -> Dict[str, Any]:
        """
        Basic extraction without pandas.
        """
        with open(file_path, 'r', encoding=encoding) as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        
        return self._process_rows(rows)
    
    def _process_rows(self, rows: List[Dict]) -> Dict[str, Any]:
        """
        Process CSV rows into structured EHR data.
        """
        if not rows:
            return {"error": "Empty CSV file"}
        
        # Normalize column names
        columns = [col.lower().strip() for col in rows[0].keys()]
        column_map = self._create_column_mapping(columns)
        
        # Extract patient records
        patients = []
        for row in rows:
            # Normalize row keys
            normalized_row = {k.lower().strip(): v for k, v in row.items()}
            patient = self._extract_patient_record(normalized_row, column_map)
            if patient:
                patients.append(patient)
        
        if len(patients) == 1:
            result = patients[0]
            result["record_count"] = 1
        else:
            result = {
                "patients": patients,
                "record_count": len(patients),
                "is_multi_patient": True
            }
        
        result["columns_found"] = columns
        result["extraction_source"] = "csv_ehr"
        
        return result
    
    def _create_column_mapping(self, columns: List[str]) -> Dict[str, str]:
        """
        Create mapping from standardized field names to actual column names.
        """
        mapping = {}
        columns_lower = [c.lower().replace("_", " ").replace("-", " ") for c in columns]
        
        for standard_field, variations in self.FIELD_MAPPINGS.items():
            for variation in variations:
                variation_normalized = variation.lower().replace("_", " ")
                for i, col in enumerate(columns_lower):
                    if variation_normalized == col or variation_normalized in col:
                        mapping[standard_field] = columns[i]
                        break
                if standard_field in mapping:
                    break
        
        return mapping
    
    def _extract_patient_record(self, row: Dict, column_map: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Extract a single patient record from a row.
        """
        patient = {
            "patient_info": {},
            "demographics": {},
            "contact": {},
            "medical_info": {},
            "vitals": {},
            "dates": {},
            "provider_info": {},
            "raw_data": {}
        }
        
        # Patient identifiers
        if "patient_id" in column_map:
            patient["patient_info"]["patient_id"] = self._get_value(row, column_map["patient_id"])
        
        if "name" in column_map:
            patient["patient_info"]["name"] = self._get_value(row, column_map["name"])
        elif "first_name" in column_map and "last_name" in column_map:
            first = self._get_value(row, column_map["first_name"])
            last = self._get_value(row, column_map["last_name"])
            if first or last:
                patient["patient_info"]["name"] = f"{first or ''} {last or ''}".strip()
        
        # Demographics
        for field in ["age", "date_of_birth", "sex", "blood_type"]:
            if field in column_map:
                value = self._get_value(row, column_map[field])
                if value:
                    patient["demographics"][field.replace("_", " ").title().replace(" ", "_")] = value
        
        # Contact
        for field in ["phone", "email", "address"]:
            if field in column_map:
                value = self._get_value(row, column_map[field])
                if value:
                    patient["contact"][field] = value
        
        # Medical info
        for field in ["diagnosis", "allergies", "medications", "medical_history", "family_history"]:
            if field in column_map:
                value = self._get_value(row, column_map[field])
                if value:
                    # Try to parse as list if comma-separated
                    if isinstance(value, str) and "," in value:
                        patient["medical_info"][field] = [v.strip() for v in value.split(",")]
                    else:
                        patient["medical_info"][field] = value
        
        # Vitals
        for field in ["blood_pressure", "heart_rate", "temperature", "weight", "height", "bmi"]:
            if field in column_map:
                value = self._get_value(row, column_map[field])
                if value:
                    patient["vitals"][field.replace("_", " ").title().replace(" ", "_")] = value
        
        # Dates
        for field in ["admission_date", "discharge_date", "visit_date"]:
            if field in column_map:
                value = self._get_value(row, column_map[field])
                if value:
                    patient["dates"][field] = value
        
        # Provider info
        for field in ["doctor", "department"]:
            if field in column_map:
                value = self._get_value(row, column_map[field])
                if value:
                    patient["provider_info"][field] = value
        
        # Store unmapped columns in raw_data
        mapped_columns = set(column_map.values())
        for col, value in row.items():
            if col not in mapped_columns and value:
                patient["raw_data"][col] = value
        
        # Clean empty sections
        patient = {k: v for k, v in patient.items() if v}
        
        # Check if we extracted anything meaningful
        if len(patient) <= 1 and "raw_data" in patient:
            return {"raw_data": patient.get("raw_data", row)}
        
        return patient if len(patient) > 0 else None
    
    def _get_value(self, row: Dict, column: str) -> Optional[str]:
        """
        Get a value from a row, handling NaN and empty values.
        """
        value = row.get(column)
        
        if value is None:
            return None
        
        # Handle pandas NaN
        if self.pandas_available:
            import pandas as pd
            if pd.isna(value):
                return None
        
        # Convert to string and check for empty
        value_str = str(value).strip()
        if value_str.lower() in ["nan", "none", "", "null"]:
            return None
        
        return value_str


# Convenience function
def extract_ehr_data(file_path: str) -> Dict[str, Any]:
    """
    Extract EHR data from a CSV file.
    
    Args:
        file_path: Path to the CSV file
        
    Returns:
        Structured EHR data
    """
    extractor = EHRExtractor()
    return extractor.extract_from_csv(file_path)


def extract_ehr_from_content(csv_content: str) -> Dict[str, Any]:
    """
    Extract EHR data from CSV content string.
    
    Args:
        csv_content: CSV data as string
        
    Returns:
        Structured EHR data
    """
    extractor = EHRExtractor()
    return extractor.extract_from_csv_content(csv_content)
