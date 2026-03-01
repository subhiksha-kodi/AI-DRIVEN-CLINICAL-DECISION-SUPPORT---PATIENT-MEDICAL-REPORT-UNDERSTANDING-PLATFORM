"""
OCR Extractor Module
Handles text extraction from scanned PDFs and images using Tesseract OCR.
Includes pre-processing for improved accuracy on medical documents.
"""

import fitz  # PyMuPDF for PDF to image conversion
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import numpy as np
import cv2
import io
import os
import logging
from typing import List, Dict, Any, Optional
import tempfile

logger = logging.getLogger(__name__)


class OCRExtractor:
    """
    Extracts text from scanned documents using OCR.
    Includes image pre-processing for better accuracy.
    """
    
    def __init__(self, tesseract_path: Optional[str] = None):
        """
        Initialize OCR extractor.
        
        Args:
            tesseract_path: Path to tesseract executable (auto-detected if not provided)
        """
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        # OCR configuration for medical documents
        self.ocr_config = r'--oem 3 --psm 6 -l eng'  # LSTM OCR, assume uniform block of text
        
        # For table detection
        self.table_ocr_config = r'--oem 3 --psm 6 -l eng -c preserve_interword_spaces=1'
    
    def extract_from_image(self, image_path: str) -> str:
        """
        Extract text from an image file.
        """
        try:
            image = Image.open(image_path)
            preprocessed = self._preprocess_image(image)
            text = pytesseract.image_to_string(preprocessed, config=self.ocr_config)
            return self._clean_ocr_text(text)
        except Exception as e:
            logger.error(f"Image OCR error: {e}")
            return ""
    
    def extract_from_pdf(self, pdf_path: str, dpi: int = 300) -> str:
        """
        Extract text from a scanned PDF using OCR.
        Converts each page to image and applies OCR.
        """
        try:
            doc = fitz.open(pdf_path)
            all_text = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Convert page to image
                mat = fitz.Matrix(dpi / 72, dpi / 72)  # Scale matrix
                pix = page.get_pixmap(matrix=mat)
                
                # Convert to PIL Image
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                
                # Preprocess and OCR
                preprocessed = self._preprocess_image(image)
                text = pytesseract.image_to_string(preprocessed, config=self.ocr_config)
                
                clean_text = self._clean_ocr_text(text)
                all_text.append(f"=== Page {page_num + 1} ===\n{clean_text}")
            
            doc.close()
            return "\n\n".join(all_text)
            
        except Exception as e:
            logger.error(f"PDF OCR error: {e}")
            return ""
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR accuracy.
        Applies grayscale, contrast enhancement, noise removal, and binarization.
        """
        # Convert to grayscale
        if image.mode != 'L':
            gray = image.convert('L')
        else:
            gray = image
        
        # Convert to numpy array for OpenCV processing
        img_array = np.array(gray)
        
        # Apply adaptive thresholding for better text extraction
        binary = cv2.adaptiveThreshold(
            img_array, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(binary, h=10)
        
        # Convert back to PIL Image
        return Image.fromarray(denoised)
    
    def _preprocess_for_table(self, image: Image.Image) -> Image.Image:
        """
        Special preprocessing for table detection.
        Preserves table lines and structure.
        """
        if image.mode != 'L':
            gray = image.convert('L')
        else:
            gray = image
        
        img_array = np.array(gray)
        
        # Threshold
        _, binary = cv2.threshold(img_array, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Morphological operations to clean up
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return Image.fromarray(cleaned)
    
    def _clean_ocr_text(self, text: str) -> str:
        """
        Clean up OCR output text.
        """
        # Remove excessive whitespace
        import re
        text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces/tabs to single space
        text = re.sub(r'\n{3,}', '\n\n', text)  # Multiple newlines to double
        text = text.strip()
        
        # Fix common OCR errors in medical terms
        corrections = {
            '0mg': '0 mg',
            '1mg': '1 mg',
            '5mg': '5 mg',
            'mg/d1': 'mg/dL',
            'mg/dl': 'mg/dL',
            'g/d1': 'g/dL',
            'g/dl': 'g/dL',
            'µ1': 'µL',
            'mmol/1': 'mmol/L',
            'cel1s': 'cells',
            '1ow': 'low',
            'norma1': 'normal',
        }
        
        for wrong, correct in corrections.items():
            text = text.replace(wrong, correct)
        
        return text
    
    def extract_tables_from_pdf(self, pdf_path: str, dpi: int = 300) -> List[Dict[str, Any]]:
        """
        Extract tables from scanned PDF using OCR with TSV output.
        """
        tables = []
        
        try:
            doc = fitz.open(pdf_path)
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Convert page to image at high DPI
                mat = fitz.Matrix(dpi / 72, dpi / 72)
                pix = page.get_pixmap(matrix=mat)
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                
                # Preprocess for table detection
                preprocessed = self._preprocess_for_table(image)
                
                # Get structured data with word positions
                ocr_data = pytesseract.image_to_data(
                    preprocessed, 
                    config=self.table_ocr_config,
                    output_type=pytesseract.Output.DICT
                )
                
                # Try to detect table structure
                page_tables = self._detect_tables_from_ocr(ocr_data, page_num + 1)
                tables.extend(page_tables)
            
            doc.close()
            
        except Exception as e:
            logger.error(f"Table OCR extraction error: {e}")
        
        return tables
    
    def _detect_tables_from_ocr(self, ocr_data: Dict, page_num: int) -> List[Dict]:
        """
        Detect table structure from OCR output data.
        Groups words by rows based on vertical position.
        """
        # Filter valid text entries
        n_boxes = len(ocr_data['text'])
        words = []
        
        for i in range(n_boxes):
            text = ocr_data['text'][i].strip()
            if text:
                words.append({
                    'text': text,
                    'x': ocr_data['left'][i],
                    'y': ocr_data['top'][i],
                    'width': ocr_data['width'][i],
                    'height': ocr_data['height'][i],
                    'conf': ocr_data['conf'][i]
                })
        
        if not words:
            return []
        
        # Group words into rows (within 15px vertical tolerance)
        rows = []
        words_sorted = sorted(words, key=lambda w: w['y'])
        
        current_row = [words_sorted[0]]
        current_y = words_sorted[0]['y']
        
        for word in words_sorted[1:]:
            if abs(word['y'] - current_y) <= 15:
                current_row.append(word)
            else:
                rows.append(sorted(current_row, key=lambda w: w['x']))
                current_row = [word]
                current_y = word['y']
        
        if current_row:
            rows.append(sorted(current_row, key=lambda w: w['x']))
        
        # Convert rows to text
        table_data = []
        for row in rows:
            row_cells = self._group_row_into_cells(row)
            if len(row_cells) >= 2:  # At least 2 columns
                table_data.append(row_cells)
        
        if len(table_data) >= 2:  # At least header + 1 row
            return [{
                "page": page_num,
                "table_index": 0,
                "header": table_data[0] if table_data else [],
                "rows": table_data[1:] if len(table_data) > 1 else [],
                "is_lab_table": True,  # Assume scanned tables are lab tables
                "column_count": len(table_data[0]) if table_data else 0,
                "row_count": len(table_data) - 1
            }]
        
        return []
    
    def _group_row_into_cells(self, row_words: List[Dict]) -> List[str]:
        """
        Group words in a row into cells based on horizontal spacing.
        """
        if not row_words:
            return []
        
        # Calculate average word gap
        gaps = []
        for i in range(1, len(row_words)):
            gap = row_words[i]['x'] - (row_words[i-1]['x'] + row_words[i-1]['width'])
            gaps.append(gap)
        
        # Threshold for cell separation (larger gaps indicate new cell)
        avg_gap = sum(gaps) / len(gaps) if gaps else 20
        cell_threshold = max(avg_gap * 1.5, 30)
        
        cells = []
        current_cell = [row_words[0]['text']]
        
        for i in range(1, len(row_words)):
            gap = row_words[i]['x'] - (row_words[i-1]['x'] + row_words[i-1]['width'])
            
            if gap > cell_threshold:
                cells.append(' '.join(current_cell))
                current_cell = [row_words[i]['text']]
            else:
                current_cell.append(row_words[i]['text'])
        
        if current_cell:
            cells.append(' '.join(current_cell))
        
        return cells
    
    def extract_with_confidence(self, image_path: str) -> Dict[str, Any]:
        """
        Extract text with confidence scores for quality assessment.
        """
        try:
            image = Image.open(image_path)
            preprocessed = self._preprocess_image(image)
            
            data = pytesseract.image_to_data(
                preprocessed,
                config=self.ocr_config,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence
            confidences = [int(c) for c in data['conf'] if int(c) > 0]
            avg_conf = sum(confidences) / len(confidences) if confidences else 0
            
            # Extract text
            text_parts = [t for t in data['text'] if t.strip()]
            full_text = ' '.join(text_parts)
            
            return {
                "text": self._clean_ocr_text(full_text),
                "confidence": round(avg_conf, 2),
                "word_count": len(text_parts),
                "quality": "good" if avg_conf > 70 else "fair" if avg_conf > 50 else "poor"
            }
            
        except Exception as e:
            logger.error(f"OCR with confidence error: {e}")
            return {"text": "", "confidence": 0, "word_count": 0, "quality": "failed"}
