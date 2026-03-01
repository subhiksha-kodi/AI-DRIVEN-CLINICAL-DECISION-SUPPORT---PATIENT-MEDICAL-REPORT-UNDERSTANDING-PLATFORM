"""
Legacy CLI wrapper for backward compatibility.
For new development, use the FastAPI service (main.py).

Usage:
    python extract.py extract <pdf_path>
    python extract.py detect <pdf_path>
"""

import sys
import json

# Import the new modular extractors
try:
    from extractors.text_extractor import TextExtractor
    from extractors.table_extractor import TableExtractor
    from extractors.ocr_extractor import OCRExtractor
    from parsers.lab_parser import LabParser
    from analyzers.risk_analyzer import RiskAnalyzer
    
    NEW_MODULES_AVAILABLE = True
except ImportError:
    # Fallback to basic PyMuPDF extraction
    import fitz
    NEW_MODULES_AVAILABLE = False


def extract_text_from_pdf_legacy(pdf_path):
    """
    Legacy extraction function using basic PyMuPDF.
    """
    try:
        doc = fitz.open(pdf_path)
        extracted_data = {}
        
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text()
            paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
            extracted_data[f"Page_{page_num}"] = paragraphs
        
        doc.close()
        return extracted_data
    except Exception as e:
        return {"error": str(e)}


def extract_text_from_pdf(pdf_path):
    """
    Extract text from PDF using the improved modular extractors.
    Falls back to legacy extraction if modules not available.
    """
    if not NEW_MODULES_AVAILABLE:
        return extract_text_from_pdf_legacy(pdf_path)
    
    try:
        text_extractor = TextExtractor()
        table_extractor = TableExtractor()
        lab_parser = LabParser()
        risk_analyzer = RiskAnalyzer()
        
        # Check if digital or scanned
        is_digital = text_extractor.is_digital_pdf(pdf_path)
        
        if is_digital:
            # Extract text with proper sorting
            raw_text = text_extractor.extract_text_sorted(pdf_path)
            tables = table_extractor.extract_tables(pdf_path)
        else:
            # Use OCR
            ocr_extractor = OCRExtractor()
            raw_text = ocr_extractor.extract_from_pdf(pdf_path)
            tables = ocr_extractor.extract_tables_from_pdf(pdf_path)
        
        # Parse lab results
        lab_results = lab_parser.parse_lab_results(raw_text, tables)
        
        # Analyze risks
        risk_analysis = risk_analyzer.analyze(lab_results)
        
        # Return comprehensive result
        return {
            "success": True,
            "is_digital": is_digital,
            "raw_text": raw_text,
            "tables": tables,
            "lab_results": lab_results,
            "risk_analysis": risk_analysis,
            "alerts": risk_analysis.get("alerts", []),
            "patient_info": lab_parser.extract_patient_info(raw_text)
        }
        
    except Exception as e:
        return {"error": str(e), "success": False}


def is_pdf_digital(pdf_path):
    """
    Checks if the PDF has selectable text.
    """
    if NEW_MODULES_AVAILABLE:
        text_extractor = TextExtractor()
        return text_extractor.is_digital_pdf(pdf_path)
    
    try:
        import fitz
        doc = fitz.open(pdf_path)
        has_text = False
        for page in doc:
            if page.get_text().strip():
                has_text = True
                break
        doc.close()
        return has_text
    except:
        return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: extract.py <action> <pdf_path>"}))
        sys.exit(1)

    action = sys.argv[1]
    path = sys.argv[2]

    if action == "extract":
        result = extract_text_from_pdf(path)
        print(json.dumps(result, default=str))
    elif action == "detect":
        result = is_pdf_digital(path)
        print(json.dumps({"is_digital": result}))
    else:
        print(json.dumps({"error": "Unknown action. Use 'extract' or 'detect'"}))

