"""
NLP Extraction Module
Uses spaCy, scispaCy, MedspaCy, and transformers for medical entity extraction
"""

import re
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import NLP libraries
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("spaCy not available")

# Load models
nlp = None
med_nlp = None

def load_models():
    """Load NLP models"""
    global nlp, med_nlp
    
    if not SPACY_AVAILABLE:
        return
    
    try:
        # Try to load medical NLP model
        try:
            import medspacy
            med_nlp = medspacy.load()
            logger.info("MedspaCy loaded successfully")
        except:
            try:
                med_nlp = spacy.load("en_core_sci_md")
                logger.info("scispaCy model loaded")
            except:
                pass
        
        # Load standard spaCy model as fallback
        try:
            nlp = spacy.load("en_core_web_sm")
            logger.info("Standard spaCy model loaded")
        except:
            logger.warning("No spaCy models available")
    except Exception as e:
        logger.error(f"Failed to load NLP models: {e}")


# Common lab test reference ranges
LAB_REFERENCE_RANGES = {
    # Complete Blood Count
    "hemoglobin": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "hgb": {"min": 12.0, "max": 17.5, "unit": "g/dL"},
    "hematocrit": {"min": 36, "max": 50, "unit": "%"},
    "hct": {"min": 36, "max": 50, "unit": "%"},
    "rbc": {"min": 4.2, "max": 6.1, "unit": "million/µL"},
    "wbc": {"min": 4000, "max": 11000, "unit": "/µL"},
    "platelets": {"min": 150000, "max": 400000, "unit": "/µL"},
    
    # Metabolic Panel
    "glucose": {"min": 70, "max": 100, "unit": "mg/dL"},
    "fasting glucose": {"min": 70, "max": 100, "unit": "mg/dL"},
    "hba1c": {"min": 4.0, "max": 5.6, "unit": "%"},
    "creatinine": {"min": 0.6, "max": 1.2, "unit": "mg/dL"},
    "bun": {"min": 7, "max": 20, "unit": "mg/dL"},
    "urea": {"min": 15, "max": 45, "unit": "mg/dL"},
    "sodium": {"min": 136, "max": 145, "unit": "mEq/L"},
    "potassium": {"min": 3.5, "max": 5.0, "unit": "mEq/L"},
    "chloride": {"min": 98, "max": 106, "unit": "mEq/L"},
    "calcium": {"min": 8.5, "max": 10.5, "unit": "mg/dL"},
    
    # Liver Function
    "alt": {"min": 7, "max": 56, "unit": "U/L"},
    "sgpt": {"min": 7, "max": 56, "unit": "U/L"},
    "ast": {"min": 10, "max": 40, "unit": "U/L"},
    "sgot": {"min": 10, "max": 40, "unit": "U/L"},
    "alp": {"min": 44, "max": 147, "unit": "U/L"},
    "bilirubin": {"min": 0.1, "max": 1.2, "unit": "mg/dL"},
    "albumin": {"min": 3.5, "max": 5.0, "unit": "g/dL"},
    
    # Lipid Panel
    "total cholesterol": {"min": 0, "max": 200, "unit": "mg/dL"},
    "cholesterol": {"min": 0, "max": 200, "unit": "mg/dL"},
    "ldl": {"min": 0, "max": 100, "unit": "mg/dL"},
    "hdl": {"min": 40, "max": 100, "unit": "mg/dL"},
    "triglycerides": {"min": 0, "max": 150, "unit": "mg/dL"},
    
    # Thyroid
    "tsh": {"min": 0.4, "max": 4.0, "unit": "mIU/L"},
    "t3": {"min": 80, "max": 200, "unit": "ng/dL"},
    "t4": {"min": 5.0, "max": 12.0, "unit": "µg/dL"},
    "free t4": {"min": 0.8, "max": 1.8, "unit": "ng/dL"},
    
    # Cardiac
    "troponin": {"min": 0, "max": 0.04, "unit": "ng/mL"},
    "bnp": {"min": 0, "max": 100, "unit": "pg/mL"},
    "crp": {"min": 0, "max": 3.0, "unit": "mg/L"},
    
    # Vitamins
    "vitamin d": {"min": 30, "max": 100, "unit": "ng/mL"},
    "vitamin b12": {"min": 200, "max": 900, "unit": "pg/mL"},
    "folate": {"min": 2.7, "max": 17.0, "unit": "ng/mL"},
    "iron": {"min": 60, "max": 170, "unit": "µg/dL"},
    "ferritin": {"min": 12, "max": 300, "unit": "ng/mL"},
}

# Common medical terms patterns
DISEASE_PATTERNS = [
    r'\b(diabetes|diabetic)\b',
    r'\b(hypertension|high blood pressure)\b',
    r'\b(anemia|anaemia)\b',
    r'\b(hepatitis)\b',
    r'\b(thyroid disorder|hypothyroidism|hyperthyroidism)\b',
    r'\b(kidney disease|renal failure|ckd)\b',
    r'\b(liver disease|cirrhosis|fatty liver)\b',
    r'\b(cardiovascular|heart disease|cad)\b',
    r'\b(infection|sepsis)\b',
    r'\b(cancer|carcinoma|malignancy)\b',
    r'\b(pneumonia)\b',
    r'\b(asthma|copd)\b',
]

MEDICATION_PATTERNS = [
    r'\b(\w+)\s*(mg|mcg|ml|tablet|cap|capsule)\b',
    r'\b(metformin|insulin|glipizide)\b',
    r'\b(lisinopril|amlodipine|atenolol|metoprolol)\b',
    r'\b(atorvastatin|simvastatin|rosuvastatin)\b',
    r'\b(aspirin|clopidogrel|warfarin)\b',
    r'\b(omeprazole|pantoprazole|ranitidine)\b',
    r'\b(amoxicillin|azithromycin|ciprofloxacin)\b',
    r'\b(levothyroxine|synthroid)\b',
    r'\b(prednisone|prednisolone|hydrocortisone)\b',
]


class NLPExtractor:
    """Extract medical entities from text using NLP"""
    
    def __init__(self):
        load_models()
    
    def extract_lab_values(self, text: str) -> List[Dict[str, Any]]:
        """Extract lab values from text"""
        lab_values = []
        text_lower = text.lower()
        
        # Pattern to match lab values: name followed by value and optional unit
        patterns = [
            r'(\w+[\w\s]*?)\s*[:\-=]\s*(\d+\.?\d*)\s*([a-zA-Z/%µ]+)?',
            r'(\w+[\w\s]*?)\s+(\d+\.?\d*)\s*([a-zA-Z/%µ]+)',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                name = match[0].strip().lower()
                try:
                    value = float(match[1])
                except ValueError:
                    continue
                
                unit = match[2].strip() if len(match) > 2 and match[2] else ""
                
                # Check if this is a known lab test
                ref_range = None
                status = "normal"
                
                for test_name, ranges in LAB_REFERENCE_RANGES.items():
                    if test_name in name or name in test_name:
                        ref_range = ranges
                        if value < ranges["min"]:
                            status = "low"
                        elif value > ranges["max"]:
                            status = "high"
                        if not unit:
                            unit = ranges["unit"]
                        break
                
                lab_values.append({
                    "name": name.title(),
                    "value": value,
                    "unit": unit,
                    "reference_range": f"{ref_range['min']}-{ref_range['max']}" if ref_range else None,
                    "status": status
                })
        
        # Remove duplicates
        seen = set()
        unique_values = []
        for lv in lab_values:
            key = (lv["name"], lv["value"])
            if key not in seen:
                seen.add(key)
                unique_values.append(lv)
        
        return unique_values
    
    def extract_diseases(self, text: str) -> List[str]:
        """Extract disease mentions from text"""
        diseases = []
        text_lower = text.lower()
        
        for pattern in DISEASE_PATTERNS:
            matches = re.findall(pattern, text_lower)
            diseases.extend(matches)
        
        # Use NLP if available
        if med_nlp:
            try:
                doc = med_nlp(text)
                for ent in doc.ents:
                    if ent.label_ in ["DISEASE", "PROBLEM", "CONDITION"]:
                        diseases.append(ent.text.lower())
            except Exception as e:
                logger.warning(f"NLP disease extraction failed: {e}")
        
        return list(set(diseases))
    
    def extract_medications(self, text: str) -> List[Dict[str, Any]]:
        """Extract medication mentions with dosage"""
        medications = []
        
        # Pattern: drug name followed by dosage
        pattern = r'\b([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+\.?\d*)\s*(mg|mcg|ml|g|units?)\s*(?:(\d+)\s*(?:times?|x)\s*(?:daily|a day|per day)?)?'
        
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            name = match[0].strip()
            dosage = f"{match[1]} {match[2]}"
            frequency = f"{match[3]}x daily" if match[3] else "as prescribed"
            
            # Validate it's likely a medication
            is_medication = False
            for med_pattern in MEDICATION_PATTERNS:
                if re.search(med_pattern, name, re.IGNORECASE):
                    is_medication = True
                    break
            
            if is_medication or len(name) > 3:
                medications.append({
                    "name": name.title(),
                    "dosage": dosage,
                    "frequency": frequency
                })
        
        # Use NLP if available
        if med_nlp:
            try:
                doc = med_nlp(text)
                for ent in doc.ents:
                    if ent.label_ in ["MEDICATION", "DRUG"]:
                        medications.append({
                            "name": ent.text.title(),
                            "dosage": "See prescription",
                            "frequency": "As prescribed"
                        })
            except Exception as e:
                logger.warning(f"NLP medication extraction failed: {e}")
        
        return medications
    
    def extract_dates(self, text: str) -> List[str]:
        """Extract dates from text"""
        dates = []
        
        # Common date patterns
        patterns = [
            r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            r'\d{4}[/-]\d{1,2}[/-]\d{1,2}',
            r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}',
            r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            dates.extend(matches)
        
        return list(set(dates))
    
    def extract_clinical_notes(self, text: str) -> List[str]:
        """Extract clinical notes and observations"""
        notes = []
        
        # Look for sections that typically contain clinical notes
        note_patterns = [
            r'(?:impression|diagnosis|assessment|findings?|conclusion|remarks?)[:\s]+([^\n]+)',
            r'(?:history|chief complaint|symptoms?)[:\s]+([^\n]+)',
            r'(?:recommendations?|advice|plan)[:\s]+([^\n]+)',
        ]
        
        for pattern in note_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if len(match.strip()) > 10:
                    notes.append(match.strip())
        
        return notes
    
    def extract_all(self, text: str) -> Dict[str, Any]:
        """Extract all medical entities from text"""
        return {
            "lab_values": self.extract_lab_values(text),
            "diseases": self.extract_diseases(text),
            "medications": self.extract_medications(text),
            "dates": self.extract_dates(text),
            "clinical_notes": self.extract_clinical_notes(text)
        }


# Create singleton instance
nlp_extractor = NLPExtractor()


def extract_medical_entities(text: str) -> Dict[str, Any]:
    """Convenience function to extract all medical entities"""
    return nlp_extractor.extract_all(text)
