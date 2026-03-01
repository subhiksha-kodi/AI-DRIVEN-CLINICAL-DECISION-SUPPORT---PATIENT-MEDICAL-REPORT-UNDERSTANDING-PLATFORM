"""
Text Extractor Module
Extracts text from PDFs with proper block-level sorting for correct reading order.
Uses PyMuPDF (fitz) with advanced text block handling.
"""

import fitz  # PyMuPDF
from typing import List, Dict, Tuple, Optional
import re
import logging

logger = logging.getLogger(__name__)


class TextExtractor:
    """
    Extracts text from digital PDFs with proper reading order.
    Uses block-level sorting based on position coordinates.
    """
    
    def __init__(self):
        self.column_threshold = 100  # pixels to detect multi-column layout
    
    def is_digital_pdf(self, pdf_path: str) -> bool:
        """
        Check if PDF contains extractable text (digital) or is scanned.
        Returns True if PDF has selectable text.
        """
        try:
            doc = fitz.open(pdf_path)
            text_found = False
            
            for page_num in range(min(3, len(doc))):  # Check first 3 pages
                page = doc[page_num]
                text = page.get_text().strip()
                if len(text) > 50:  # Meaningful amount of text
                    text_found = True
                    break
            
            doc.close()
            return text_found
        except Exception as e:
            logger.error(f"Error checking PDF type: {e}")
            return False
    
    def extract_text_sorted(self, pdf_path: str) -> str:
        """
        Extract text from PDF with proper reading order using block sorting.
        Handles multi-column layouts and maintains logical flow.
        """
        try:
            doc = fitz.open(pdf_path)
            all_text = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                page_text = self._extract_page_sorted(page)
                all_text.append(f"=== Page {page_num + 1} ===\n{page_text}")
            
            doc.close()
            return "\n\n".join(all_text)
            
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            return ""
    
    def _extract_page_sorted(self, page: fitz.Page) -> str:
        """
        Extract text from a single page with block-level sorting.
        """
        # Get text blocks with position information
        # blocks format: (x0, y0, x1, y1, "text", block_no, block_type)
        blocks = page.get_text("blocks")
        
        if not blocks:
            return ""
        
        # Filter text blocks only (block_type 0 = text, 1 = image)
        text_blocks = [b for b in blocks if b[6] == 0 and b[4].strip()]
        
        if not text_blocks:
            return ""
        
        # Detect if multi-column layout
        page_width = page.rect.width
        is_multi_column = self._detect_multi_column(text_blocks, page_width)
        
        if is_multi_column:
            sorted_blocks = self._sort_multi_column(text_blocks, page_width)
        else:
            sorted_blocks = self._sort_single_column(text_blocks)
        
        # Extract text in sorted order
        text_parts = []
        for block in sorted_blocks:
            text = block[4].strip()
            # Clean up excessive whitespace
            text = re.sub(r'\s+', ' ', text)
            text_parts.append(text)
        
        return "\n".join(text_parts)
    
    def _detect_multi_column(self, blocks: List, page_width: float) -> bool:
        """
        Detect if the page has a multi-column layout.
        """
        if len(blocks) < 4:
            return False
        
        # Get x-coordinates of block starts
        x_starts = [b[0] for b in blocks]
        
        # Check if there are distinct column regions
        mid_point = page_width / 2
        left_blocks = [x for x in x_starts if x < mid_point - self.column_threshold]
        right_blocks = [x for x in x_starts if x > mid_point + self.column_threshold]
        
        # Multi-column if significant blocks on both sides
        return len(left_blocks) > 2 and len(right_blocks) > 2
    
    def _sort_single_column(self, blocks: List) -> List:
        """
        Sort blocks for single-column layout (top-to-bottom, left-to-right).
        """
        # Sort primarily by y-coordinate (top to bottom), then x-coordinate
        return sorted(blocks, key=lambda b: (round(b[1] / 10) * 10, b[0]))
    
    def _sort_multi_column(self, blocks: List, page_width: float) -> List:
        """
        Sort blocks for multi-column layout.
        Process left column fully before right column.
        """
        mid_point = page_width / 2
        
        # Separate into columns
        left_column = [b for b in blocks if b[0] < mid_point]
        right_column = [b for b in blocks if b[0] >= mid_point]
        
        # Sort each column top-to-bottom
        left_sorted = sorted(left_column, key=lambda b: (b[1], b[0]))
        right_sorted = sorted(right_column, key=lambda b: (b[1], b[0]))
        
        # Left column first, then right column
        return left_sorted + right_sorted
    
    def extract_text_with_positions(self, pdf_path: str) -> List[Dict]:
        """
        Extract text blocks with their position information.
        Useful for understanding layout.
        """
        try:
            doc = fitz.open(pdf_path)
            result = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                blocks = page.get_text("blocks")
                
                page_blocks = []
                for block in blocks:
                    if block[6] == 0:  # Text block
                        page_blocks.append({
                            "text": block[4].strip(),
                            "x0": block[0],
                            "y0": block[1],
                            "x1": block[2],
                            "y1": block[3],
                            "block_no": block[5]
                        })
                
                result.append({
                    "page": page_num + 1,
                    "blocks": page_blocks
                })
            
            doc.close()
            return result
            
        except Exception as e:
            logger.error(f"Position extraction error: {e}")
            return []
    
    def extract_lines_sorted(self, pdf_path: str) -> List[Dict]:
        """
        Extract text line by line with proper sorting.
        Provides more granular control than block-level extraction.
        """
        try:
            doc = fitz.open(pdf_path)
            all_pages = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                # Get detailed text structure
                text_dict = page.get_text("dict")
                
                lines = []
                for block in text_dict.get("blocks", []):
                    if block.get("type") == 0:  # Text block
                        for line in block.get("lines", []):
                            line_text = ""
                            for span in line.get("spans", []):
                                line_text += span.get("text", "")
                            
                            if line_text.strip():
                                bbox = line.get("bbox", [0, 0, 0, 0])
                                lines.append({
                                    "text": line_text.strip(),
                                    "y": bbox[1],
                                    "x": bbox[0]
                                })
                
                # Sort lines
                lines.sort(key=lambda l: (round(l["y"] / 5) * 5, l["x"]))
                
                all_pages.append({
                    "page": page_num + 1,
                    "lines": [l["text"] for l in lines]
                })
            
            doc.close()
            return all_pages
            
        except Exception as e:
            logger.error(f"Line extraction error: {e}")
            return []
    
    def extract_tabular_text(self, pdf_path: str) -> List[Dict]:
        """
        Extract text optimized for tabular lab report format.
        Groups text by rows based on y-coordinates.
        Returns structured row data with column positions.
        """
        try:
            doc = fitz.open(pdf_path)
            all_pages = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                words = page.get_text("words")  # (x0, y0, x1, y1, "word", block_no, line_no, word_no)
                
                if not words:
                    continue
                
                # Group words by y-coordinate (same row)
                rows = self._group_words_into_rows(words)
                
                # Sort rows by y-coordinate
                sorted_rows = sorted(rows.items(), key=lambda x: x[0])
                
                page_data = {
                    "page": page_num + 1,
                    "rows": []
                }
                
                for y_key, row_words in sorted_rows:
                    # Sort words in row by x-coordinate
                    row_words.sort(key=lambda w: w[0])
                    
                    # Detect columns based on x-gaps
                    columns = self._split_row_into_columns(row_words, page.rect.width)
                    
                    page_data["rows"].append({
                        "y": y_key,
                        "columns": columns,
                        "full_text": " ".join([w[4] for w in row_words])
                    })
                
                all_pages.append(page_data)
            
            doc.close()
            return all_pages
            
        except Exception as e:
            logger.error(f"Tabular extraction error: {e}")
            return []
    
    def _group_words_into_rows(self, words: List, tolerance: int = 5) -> Dict[int, List]:
        """
        Group words by y-coordinate to form rows.
        """
        rows = {}
        for word in words:
            y = word[1]
            # Round y to group nearby words into same row
            y_key = round(y / tolerance) * tolerance
            
            if y_key not in rows:
                rows[y_key] = []
            rows[y_key].append(word)
        
        return rows
    
    def _split_row_into_columns(self, row_words: List, page_width: float) -> List[Dict]:
        """
        Split a row of words into columns based on x-position gaps.
        Designed for 3-column lab report format (Test Name | Value | Reference Range).
        """
        if not row_words:
            return []
        
        # Define approximate column boundaries for lab reports
        # Column 1: 0-40% (Test Name)
        # Column 2: 40-60% (Result Value)
        # Column 3: 60-100% (Reference Range)
        col1_end = page_width * 0.40
        col2_end = page_width * 0.60
        
        columns = [
            {"name": "test_name", "words": [], "text": ""},
            {"name": "value", "words": [], "text": ""},
            {"name": "reference", "words": [], "text": ""}
        ]
        
        for word in row_words:
            x = word[0]
            word_text = word[4]
            
            if x < col1_end:
                columns[0]["words"].append(word_text)
            elif x < col2_end:
                columns[1]["words"].append(word_text)
            else:
                columns[2]["words"].append(word_text)
        
        # Join words in each column
        for col in columns:
            col["text"] = " ".join(col["words"])
        
        return columns

