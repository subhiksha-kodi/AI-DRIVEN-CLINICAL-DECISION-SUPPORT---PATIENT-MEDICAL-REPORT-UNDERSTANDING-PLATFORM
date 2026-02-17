"""
Medical-Grade OCR Pipeline
Enhanced with:
- Document Layout Understanding
- Advanced Image Preprocessing (OpenCV)
- Table Detection & ROI Segmentation
- Medical Spelling Correction (rapidfuzz)
- Structured Data Extraction
"""

import os
import re
import json
from typing import Optional, List, Dict, Any, Tuple
import logging
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# Load medical dictionary
MEDICAL_DICT_PATH = Path(__file__).parent.parent / "data" / "medical_dictionary.json"
MEDICAL_DICTIONARY = {}
if MEDICAL_DICT_PATH.exists():
    with open(MEDICAL_DICT_PATH, 'r') as f:
        MEDICAL_DICTIONARY = json.load(f)
    logger.info("Medical dictionary loaded successfully")
else:
    logger.warning(f"Medical dictionary not found at {MEDICAL_DICT_PATH}")

# Try to import OCR libraries
try:
    import cv2
    CV2_AVAILABLE = True
except (ImportError, AttributeError) as e:
    CV2_AVAILABLE = False
    cv2 = None
    logger.warning(f"OpenCV not available: {e}")

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    pytesseract = None
    logger.warning("Tesseract not available")

try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    convert_from_path = None
    logger.warning("pdf2image not available")

try:
    from rapidfuzz import fuzz, process
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    RAPIDFUZZ_AVAILABLE = False
    logger.warning("rapidfuzz not available - spelling correction disabled")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL not available")


class MedicalSpellingCorrector:
    """Corrects OCR errors in medical test names using fuzzy matching"""
    
    def __init__(self, dictionary: Dict = None):
        self.test_names = []
        if dictionary and "test_names" in dictionary:
            self.test_names = dictionary["test_names"]
        self.test_aliases = dictionary.get("test_aliases", {}) if dictionary else {}
        self.min_similarity = 80
    
    def correct_test_name(self, text: str) -> Tuple[str, float]:
        """Correct a potentially misspelled test name"""
        if not RAPIDFUZZ_AVAILABLE or not self.test_names:
            return text, 100.0
        
        text_lower = text.lower().strip()
        for name in self.test_names:
            if name.lower() == text_lower:
                return name, 100.0
        
        if text_lower in self.test_aliases:
            return self.test_aliases[text_lower], 100.0
        
        result = process.extractOne(text, self.test_names, scorer=fuzz.ratio)
        if result and result[1] >= self.min_similarity:
            return result[0], result[1]
        
        return text, 0.0
    
    def correct_text(self, text: str) -> str:
        """Correct medical terms in a block of text"""
        if not RAPIDFUZZ_AVAILABLE:
            return text
        
        words = text.split()
        corrected_words = []
        i = 0
        while i < len(words):
            matched = False
            for n in [3, 2, 1]:
                if i + n <= len(words):
                    phrase = ' '.join(words[i:i+n])
                    corrected, score = self.correct_test_name(phrase)
                    if score >= self.min_similarity:
                        corrected_words.append(corrected)
                        i += n
                        matched = True
                        break
            if not matched:
                corrected_words.append(words[i])
                i += 1
        return ' '.join(corrected_words)


class AdvancedOCRPipeline:
    """Medical-grade OCR pipeline with enhanced preprocessing"""
    
    def __init__(self):
        self.supported_image_formats = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
        self.supported_pdf_formats = ['.pdf']
        self.spelling_corrector = MedicalSpellingCorrector(MEDICAL_DICTIONARY)
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Advanced image preprocessing with CLAHE, denoising, deskew"""
        if not CV2_AVAILABLE or image is None:
            return image
        
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            denoised = cv2.bilateralFilter(gray, 9, 75, 75)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(denoised)
            binary = cv2.adaptiveThreshold(enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            binary = self._deskew_image(binary)
            kernel = np.ones((1, 1), np.uint8)
            binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            return binary
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            return image
    
    def _deskew_image(self, image: np.ndarray) -> np.ndarray:
        """Correct skew using Hough transform"""
        if not CV2_AVAILABLE:
            return image
        try:
            edges = cv2.Canny(image, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
            if lines is None:
                return image
            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
                if abs(angle) < 45:
                    angles.append(angle)
            if not angles:
                return image
            median_angle = np.median(angles)
            if abs(median_angle) > 0.5:
                (h, w) = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
                return rotated
            return image
        except Exception as e:
            logger.error(f"Deskew error: {e}")
            return image

    def detect_table_regions(self, image: np.ndarray) -> List[np.ndarray]:
        """Detect table regions using morphological operations"""
        if not CV2_AVAILABLE:
            return [image]
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel, iterations=2)
            vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
            vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel, iterations=2)
            table_mask = cv2.add(horizontal_lines, vertical_lines)
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            table_regions = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w > 100 and h > 50:
                    table_regions.append(image[y:y+h, x:x+w])
            return table_regions if table_regions else [image]
        except Exception as e:
            logger.error(f"Table detection error: {e}")
            return [image]

    def extract_text_from_image(self, image_path: str) -> str:
        """Extract text from image with enhanced preprocessing"""
        if not os.path.exists(image_path):
            return ""
        try:
            if CV2_AVAILABLE:
                image = cv2.imread(image_path)
                if image is None:
                    return self._fallback_extract(image_path)
                processed = self.preprocess_image(image)
                if TESSERACT_AVAILABLE:
                    custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
                    text = pytesseract.image_to_string(processed, config=custom_config)
                    text = self.spelling_corrector.correct_text(text)
                    return text.strip()
            return self._fallback_extract(image_path)
        except Exception as e:
            logger.error(f"Image extraction error: {e}")
            return self._fallback_extract(image_path)

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF with enhanced processing"""
        if not os.path.exists(pdf_path):
            return ""
        try:
            all_text = []
            if PDF2IMAGE_AVAILABLE and CV2_AVAILABLE and TESSERACT_AVAILABLE:
                images = convert_from_path(pdf_path, dpi=300)
                for pil_image in images:
                    cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                    processed = self.preprocess_image(cv_image)
                    custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
                    text = pytesseract.image_to_string(processed, config=custom_config)
                    all_text.append(text)
                combined = '\n'.join(all_text)
                combined = self.spelling_corrector.correct_text(combined)
                return combined.strip()
            return self._fallback_pdf_extract(pdf_path)
        except Exception as e:
            logger.error(f"PDF extraction error: {e}")
            return self._fallback_pdf_extract(pdf_path)

    def extract_structured_data(self, file_path: str) -> Dict[str, Any]:
        """Extract structured lab data from medical report"""
        result = {"raw_text": "", "structured_data": [], "tables_found": 0, "confidence": 0.0}
        if not os.path.exists(file_path):
            return result
        try:
            if CV2_AVAILABLE:
                image = cv2.imread(file_path)
                if image is None:
                    result["raw_text"] = self.extract_text(file_path)
                    return result
                processed = self.preprocess_image(image)
                tables = self.detect_table_regions(processed)
                result["tables_found"] = len(tables)
                all_text = []
                all_data = []
                for table in tables:
                    if TESSERACT_AVAILABLE:
                        text = pytesseract.image_to_string(table, config=r'--oem 3 --psm 6')
                        all_text.append(text)
                        parsed = self._parse_lab_values(text)
                        all_data.extend(parsed)
                result["raw_text"] = self.spelling_corrector.correct_text('\n'.join(all_text))
                result["structured_data"] = all_data
                result["confidence"] = sum(d.get('confidence', 0) for d in all_data) / len(all_data) if all_data else 0
            return result
        except Exception as e:
            logger.error(f"Structured extraction error: {e}")
            return result

    def _parse_lab_values(self, text: str) -> List[Dict[str, Any]]:
        """Parse lab values from OCR text"""
        results = []
        patterns = [
            r'([A-Za-z][A-Za-z\s\-\/\(\)]+?)\s*[:\-]?\s*(\d+\.?\d*)\s*([a-zA-Z/%]+(?:\/[a-zA-Z]+)?)\s*(?:\(?\s*(\d+\.?\d*)\s*[\-–]\s*(\d+\.?\d*)\s*\)?)?',
            r'([A-Za-z][A-Za-z\s\-]+)\s+(\d+\.?\d*)\s+([a-zA-Z/%\/]+)\s+(\d+\.?\d*)\s*[\-–]\s*(\d+\.?\d*)',
        ]
        for line in text.split('\n'):
            line = line.strip()
            if not line or len(line) < 5:
                continue
            for pattern in patterns:
                for match in re.finditer(pattern, line, re.IGNORECASE):
                    groups = match.groups()
                    if len(groups) >= 3:
                        test_name = groups[0].strip() if groups[0] else ""
                        value = groups[1] if groups[1] else ""
                        unit = groups[2].strip() if groups[2] else ""
                        corrected_name, confidence = self.spelling_corrector.correct_test_name(test_name)
                        ref_min = groups[3] if len(groups) > 3 else None
                        ref_max = groups[4] if len(groups) > 4 else None
                        try:
                            val = float(value)
                            flag = "normal"
                            if ref_min and ref_max:
                                if val < float(ref_min):
                                    flag = "low"
                                elif val > float(ref_max):
                                    flag = "high"
                            results.append({
                                "test_name": corrected_name, "original_name": test_name,
                                "value": val, "unit": unit,
                                "reference_min": float(ref_min) if ref_min else None,
                                "reference_max": float(ref_max) if ref_max else None,
                                "flag": flag, "confidence": confidence
                            })
                        except ValueError:
                            pass
        return results

    def _fallback_extract(self, file_path: str) -> str:
        if not PIL_AVAILABLE or not TESSERACT_AVAILABLE:
            return ""
        try:
            image = Image.open(file_path)
            return pytesseract.image_to_string(image).strip()
        except Exception:
            return ""

    def _fallback_pdf_extract(self, pdf_path: str) -> str:
        try:
            import PyPDF2
            text = ""
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception:
            return ""

    def extract_text(self, file_path: str) -> str:
        """Extract text from any supported file format"""
        if not os.path.exists(file_path):
            return ""
        ext = os.path.splitext(file_path)[1].lower()
        if ext in self.supported_image_formats:
            return self.extract_text_from_image(file_path)
        elif ext in self.supported_pdf_formats:
            return self.extract_text_from_pdf(file_path)
        else:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                return ""


# Backwards compatibility alias
OCRPipeline = AdvancedOCRPipeline

# Create singleton instance
ocr_pipeline = AdvancedOCRPipeline()

def extract_text(file_path: str) -> str:
    """Convenience function to extract text from a file"""
    return ocr_pipeline.extract_text(file_path)
