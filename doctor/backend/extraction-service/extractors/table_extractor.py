"""
Table Extractor Module
Extracts tables from PDFs using pdfplumber for accurate table detection.
Handles lab report table structures with test names, values, units, and ranges.
"""

import pdfplumber
from typing import List, Dict, Any, Optional
import re
import logging

logger = logging.getLogger(__name__)


class TableExtractor:
    """
    Extracts tables from PDF documents using pdfplumber.
    Optimized for medical lab report table structures.
    """
    
    def __init__(self):
        # Table extraction settings optimized for lab reports
        self.table_settings = {
            "vertical_strategy": "lines_strict",
            "horizontal_strategy": "lines_strict",
            "snap_tolerance": 3,
            "join_tolerance": 3,
            "edge_min_length": 10,
            "min_words_vertical": 1,
            "min_words_horizontal": 1,
        }
        
        # Alternative settings for tables without clear borders
        self.text_table_settings = {
            "vertical_strategy": "text",
            "horizontal_strategy": "text",
            "snap_tolerance": 5,
            "join_tolerance": 5,
        }
    
    def extract_tables(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extract all tables from a PDF file.
        Returns list of tables with their content and metadata.
        """
        all_tables = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    # Try strict line detection first
                    tables = page.extract_tables(self.table_settings)
                    
                    # If no tables found, try text-based detection
                    if not tables:
                        tables = page.extract_tables(self.text_table_settings)
                    
                    for table_idx, table in enumerate(tables):
                        if table and len(table) > 1:  # At least header + 1 row
                            processed_table = self._process_table(table, page_num, table_idx)
                            if processed_table:
                                all_tables.append(processed_table)
        
        except Exception as e:
            logger.error(f"Table extraction error: {e}")
        
        return all_tables
    
    def _process_table(self, raw_table: List[List], page_num: int, table_idx: int) -> Optional[Dict]:
        """
        Process raw table data into structured format.
        """
        if not raw_table or len(raw_table) < 2:
            return None
        
        # Clean up cells
        cleaned_table = []
        for row in raw_table:
            cleaned_row = []
            for cell in row:
                if cell is None:
                    cleaned_row.append("")
                else:
                    # Clean whitespace and newlines
                    cleaned_cell = str(cell).strip()
                    cleaned_cell = re.sub(r'\s+', ' ', cleaned_cell)
                    cleaned_row.append(cleaned_cell)
            
            # Skip empty rows
            if any(cell for cell in cleaned_row):
                cleaned_table.append(cleaned_row)
        
        if len(cleaned_table) < 2:
            return None
        
        # Detect if first row is header
        header = cleaned_table[0]
        data_rows = cleaned_table[1:]
        
        # Check if this looks like a lab results table
        is_lab_table = self._is_lab_results_table(header)
        
        return {
            "page": page_num,
            "table_index": table_idx,
            "header": header,
            "rows": data_rows,
            "is_lab_table": is_lab_table,
            "column_count": len(header),
            "row_count": len(data_rows)
        }
    
    def _is_lab_results_table(self, header: List[str]) -> bool:
        """
        Determine if a table appears to be a lab results table
        based on header content.
        """
        lab_keywords = [
            "test", "investigation", "parameter", "analyte", "component",
            "result", "value", "finding", "observed",
            "unit", "units",
            "reference", "range", "normal", "ref", "limits",
            "flag", "status", "interpretation"
        ]
        
        header_lower = " ".join(header).lower()
        
        matches = sum(1 for kw in lab_keywords if kw in header_lower)
        return matches >= 2  # At least 2 lab-related keywords
    
    def extract_lab_tables(self, pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extract only tables that appear to be lab results.
        """
        all_tables = self.extract_tables(pdf_path)
        return [t for t in all_tables if t.get("is_lab_table", False)]
    
    def extract_table_as_dict(self, pdf_path: str) -> List[List[Dict]]:
        """
        Extract tables with each row as a dictionary using header as keys.
        """
        tables = self.extract_tables(pdf_path)
        result = []
        
        for table in tables:
            header = table.get("header", [])
            rows = table.get("rows", [])
            
            if not header:
                continue
            
            table_dicts = []
            for row in rows:
                # Create dict from header and row values
                row_dict = {}
                for i, header_col in enumerate(header):
                    if header_col and i < len(row):
                        # Clean header for use as key
                        key = re.sub(r'[^\w\s]', '', header_col).strip().lower().replace(' ', '_')
                        if key:
                            row_dict[key] = row[i]
                
                if row_dict:
                    table_dicts.append(row_dict)
            
            if table_dicts:
                result.append(table_dicts)
        
        return result
    
    def identify_column_mapping(self, header: List[str]) -> Dict[str, int]:
        """
        Identify which columns contain test name, value, unit, reference range.
        Returns mapping of semantic role to column index.
        """
        mapping = {
            "test_name": -1,
            "value": -1,
            "unit": -1,
            "reference_range": -1,
            "status": -1
        }
        
        header_lower = [h.lower() if h else "" for h in header]
        
        for i, col in enumerate(header_lower):
            # Test name column
            if any(kw in col for kw in ["test", "investigation", "parameter", "analyte", "component", "examination"]):
                mapping["test_name"] = i
            
            # Value/Result column
            elif any(kw in col for kw in ["result", "value", "finding", "observed", "patient"]):
                mapping["value"] = i
            
            # Unit column
            elif any(kw in col for kw in ["unit", "units"]):
                mapping["unit"] = i
            
            # Reference range column
            elif any(kw in col for kw in ["reference", "range", "normal", "ref", "limit", "biological"]):
                mapping["reference_range"] = i
            
            # Status/Flag column
            elif any(kw in col for kw in ["flag", "status", "interpretation", "remark"]):
                mapping["status"] = i
        
        return mapping
    
    def parse_lab_table_rows(self, table: Dict) -> List[Dict]:
        """
        Parse a lab results table into structured test results.
        """
        header = table.get("header", [])
        rows = table.get("rows", [])
        
        if not header or not rows:
            return []
        
        # Get column mapping
        col_map = self.identify_column_mapping(header)
        
        results = []
        for row in rows:
            test_result = {
                "test_name": "",
                "value": "",
                "unit": "",
                "reference_range": "",
                "status": ""
            }
            
            # Extract based on mapping
            if col_map["test_name"] >= 0 and col_map["test_name"] < len(row):
                test_result["test_name"] = row[col_map["test_name"]]
            
            if col_map["value"] >= 0 and col_map["value"] < len(row):
                test_result["value"] = row[col_map["value"]]
            
            if col_map["unit"] >= 0 and col_map["unit"] < len(row):
                test_result["unit"] = row[col_map["unit"]]
            
            if col_map["reference_range"] >= 0 and col_map["reference_range"] < len(row):
                test_result["reference_range"] = row[col_map["reference_range"]]
            
            if col_map["status"] >= 0 and col_map["status"] < len(row):
                test_result["status"] = row[col_map["status"]]
            
            # Skip if no test name or value
            if test_result["test_name"] and test_result["value"]:
                results.append(test_result)
        
        return results
