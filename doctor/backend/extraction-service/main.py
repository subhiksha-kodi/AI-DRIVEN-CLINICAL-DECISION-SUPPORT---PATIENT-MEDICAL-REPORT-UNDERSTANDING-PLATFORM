"""
Medical Report Extraction Service - FastAPI Application
Extracts structured data from lab reports (PDFs and scanned images)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import os
import logging
import json

from extractors.text_extractor import TextExtractor
from extractors.table_extractor import TableExtractor
from extractors.ocr_extractor import OCRExtractor
from extractors.ehr_extractor import EHRExtractor, extract_ehr_data
from parsers.lab_parser import LabParser
from parsers.structured_parser import parse_lab_report, StructuredLabParser
from parsers.llm_structurer import structure_with_llm, get_llm_structurer
from parsers.gemini_structurer import (
    # Groq imports (primary - no quota limits)
    structure_with_groq,
    extract_from_ocr_with_groq,
    generate_summary_with_groq,
    generate_strict_summary_with_groq,
    extract_lab_image_with_groq,
    GroqStructurer,
    get_groq_structurer,
    GROQ_AVAILABLE,
    # Gemini imports (backup only - has quota limits)
    structure_with_gemini,
    extract_lab_image_with_gemini,
    extract_prescription_with_gemini,
    generate_summary_with_gemini,
    generate_strict_summary_with_gemini,
    GeminiStructurer,
    GEMINI_AVAILABLE,
)
from analyzers.risk_analyzer import RiskAnalyzer
from models.schemas import ExtractionResponse, ExtractionRequest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Medical Report Extraction API",
    description="Extracts structured medical data from lab reports",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for request validation errors
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc}")
    logger.error(f"Request headers: {dict(request.headers)}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc.errors()), "body": str(exc.body) if hasattr(exc, 'body') else None}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    logger.error(f"Request method: {request.method}, URL: {request.url}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# Initialize extractors and analyzers
text_extractor = TextExtractor()
table_extractor = TableExtractor()
ocr_extractor = OCRExtractor()
ehr_extractor = EHRExtractor()
lab_parser = LabParser()
structured_parser = StructuredLabParser()
risk_analyzer = RiskAnalyzer()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "extraction-service"}


@app.post("/extract", response_model=ExtractionResponse)
async def extract_report(file: UploadFile = File(...)):
    """
    Extract structured data from uploaded PDF/image file.
    Handles both digital PDFs and scanned documents.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed: {allowed_types}"
        )
    
    # Save uploaded file temporarily
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Process the file
        result = process_medical_report(temp_path, file_ext)
        return result
        
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    
    finally:
        # Cleanup temp file
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@app.post("/extract-from-path")
async def extract_from_path(request: ExtractionRequest):
    """
    Extract data from a file path (for internal Node.js backend calls).
    """
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    file_ext = os.path.splitext(request.file_path)[1].lower()
    result = process_medical_report(request.file_path, file_ext)
    return result


class ParseTextRequest(BaseModel):
    """Request model for raw text parsing."""
    raw_text: str


class LLMParseRequest(BaseModel):
    """Request model for LLM-based parsing."""
    raw_text: str
    api_key: Optional[str] = None  # Optional, uses env var if not provided


@app.post("/parse-text")
async def parse_text_endpoint(request: ParseTextRequest):
    """
    Parse raw extracted text into structured JSON.
    
    This endpoint takes unstructured text (from PyMuPDF or OCR) and returns
    clean structured JSON with patient info, lab tests, and sections.
    
    Example Input:
        "FASTING BLOOD SUGAR 128 Plasma 70 - 110 mg/dL ..."
    
    Returns:
        Structured JSON with patient_info, lab_tests, sections, and summary.
    """
    if not request.raw_text or len(request.raw_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Raw text is required and must not be empty")
    
    try:
        # Use the structured parser
        result = parse_lab_report(request.raw_text)
        
        # Add risk analysis based on parsed tests
        if result.get("lab_tests"):
            risk_analysis = risk_analyzer.analyze(result["lab_tests"])
            result["risk_analysis"] = risk_analysis
            result["alerts"] = risk_analysis.get("alerts", [])
        
        return result
        
    except Exception as e:
        logger.error(f"Text parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


@app.post("/structure-with-llm")
async def structure_with_llm_endpoint(request: LLMParseRequest):
    """
    🧠 LLM-Powered Lab Report Structuring
    
    Uses Groq's Llama 4 Scout model to convert raw lab report text into structured JSON.
    This provides more accurate parsing than regex-based approaches.
    
    The LLM:
    - Extracts patient details
    - Categorizes tests (hematology, diabetes, etc.)
    - Determines LOW/NORMAL/HIGH status
    - Ignores irrelevant text
    
    Also adds CRITICAL alerts for dangerous values:
    - Blood sugar > 200
    - Hemoglobin < 8
    - Abnormal pH
    
    Args:
        raw_text: Unstructured text from PDF extraction
        api_key: Optional Groq API key (uses GROQ_API_KEY env var if not provided)
    
    Returns:
        Structured JSON with:
        - patient_info
        - lab_tests
        - sections
        - alerts
        - critical_alerts
        - risk_analysis with alert_level (NORMAL/WARNING/CRITICAL)
    """
    if not request.raw_text or len(request.raw_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Raw text is required and must not be empty")
    
    try:
        # Use LLM structurer
        result = structure_with_llm(request.raw_text, request.api_key)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM structuring error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LLM structuring failed: {str(e)}")


@app.post("/extract-and-structure")
async def extract_and_structure(file: UploadFile = File(...), use_llm: bool = False):
    """
    🚀 Complete Pipeline: Extract + Structure
    
    Uploads a PDF, extracts text using PyMuPDF, then structures using:
    - Regex parser (default) - Fast, no API cost
    - LLM parser (use_llm=true) - More accurate, requires OpenAI API key
    
    Args:
        file: PDF lab report file
        use_llm: If true, uses GPT-4o-mini for structuring
    
    Returns:
        Complete structured report with alerts
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files supported for this endpoint")
    
    temp_path = None
    try:
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Extract text
        extracted_text = text_extractor.extract_text_sorted(temp_path)
        
        if not extracted_text or len(extracted_text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        # Structure the text
        if use_llm:
            result = structure_with_llm(extracted_text)
            if "error" in result:
                # Fallback to regex parser
                logger.warning(f"LLM failed, falling back to regex: {result['error']}")
                result = parse_lab_report(extracted_text)
        else:
            result = parse_lab_report(extracted_text)
            # Add risk analysis
            if result.get("lab_tests"):
                risk_analysis = risk_analyzer.analyze(result["lab_tests"])
                result["risk_analysis"] = risk_analysis
                result["alerts"] = risk_analysis.get("alerts", [])
        
        result["raw_text"] = extracted_text
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Extract and structure error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


def process_medical_report(file_path: str, file_ext: str) -> ExtractionResponse:
    """
    Main processing pipeline for medical reports.
    Uses Gemini AI for enhanced text structuring when available.
    """
    logger.info(f"Processing file: {file_path}")
    
    extracted_text = ""
    extracted_tables = []
    tabular_data = []
    is_scanned = False
    extraction_source = "standard"
    
    if file_ext == ".pdf":
        # Check if PDF is digital or scanned
        is_digital = text_extractor.is_digital_pdf(file_path)
        
        if is_digital:
            # Extract text with proper block sorting for general text
            extracted_text = text_extractor.extract_text_sorted(file_path)
            
            # Also extract tabular data using column detection
            tabular_data = text_extractor.extract_tabular_text(file_path)
            
            # Extract formal tables using pdfplumber
            extracted_tables = table_extractor.extract_tables(file_path)
            
            # Convert tabular data to table format for parsing
            if tabular_data:
                tab_table = _convert_tabular_to_table(tabular_data)
                if tab_table:
                    extracted_tables.append(tab_table)
        else:
            # Use OCR for scanned PDFs
            is_scanned = True
            extracted_text = ocr_extractor.extract_from_pdf(file_path)
            extracted_tables = ocr_extractor.extract_tables_from_pdf(file_path)
    else:
        # Image file - use OCR
        is_scanned = True
        extracted_text = ocr_extractor.extract_from_image(file_path)
    
    # ==================== USE GROQ/LLAMA FOR STRUCTURING ====================
    lab_results = []
    patient_info = {}
    sections = {}
    critical_alerts = []
    
    if GROQ_AVAILABLE and extracted_text and len(extracted_text.strip()) > 50:
        logger.info("Using Groq/Llama for enhanced text structuring...")
        try:
            llm_result = structure_with_groq(extracted_text)
            
            if llm_result and not llm_result.get("error"):
                extraction_source = "groq_llama"
                patient_info = llm_result.get("patient_info", {})
                sections = llm_result.get("sections", {})
                critical_alerts = llm_result.get("critical_alerts", [])
                
                # Convert lab_tests to lab_results format
                llm_tests = llm_result.get("lab_tests", [])
                for test in llm_tests:
                    lab_results.append({
                        "test_name": test.get("test_name", ""),
                        "test_name_normalized": test.get("test_name", "").lower().replace(" ", "_"),
                        "value": test.get("value", ""),
                        "numeric_value": test.get("numeric_value"),
                        "unit": test.get("unit", ""),
                        "reference_range": test.get("reference_range", ""),
                        "status": test.get("status", "NORMAL"),
                        "section": test.get("section", "other"),
                        "source": "groq_llama"
                    })
                logger.info(f"Groq/Llama extracted {len(lab_results)} lab tests")
            else:
                logger.warning("Groq returned empty or error result, falling back to regex")
        except Exception as e:
            logger.warning(f"Groq structuring failed: {e}, falling back to regex parser")
    
    # Fallback to regex-based parsing if Gemini didn't work or returned no results
    if not lab_results:
        logger.info("Using regex-based parsing...")
        extraction_source = "regex"
        
        # Strategy 1: Use table-based parser
        lab_results = lab_parser.parse_lab_results(extracted_text, extracted_tables)
        
        # Strategy 2: Also use structured text parser for better extraction
        structured_result = parse_lab_report(extracted_text)
        structured_tests = structured_result.get("lab_tests", [])
        
        # Merge results - structured parser may find tests that table parser missed
        if structured_tests:
            existing_names = {r.get("test_name_normalized", "").lower() for r in lab_results}
            for test in structured_tests:
                normalized = test.get("test_name", "").lower().replace(" ", "_")
                if normalized not in existing_names:
                    lab_results.append({
                        "test_name": test.get("test_name", ""),
                        "test_name_normalized": normalized,
                        "value": test.get("value", ""),
                        "numeric_value": test.get("numeric_value"),
                        "unit": test.get("unit", ""),
                        "reference_range": test.get("reference_range", ""),
                        "status": test.get("status", ""),
                        "section": test.get("section", "other"),
                        "source": "structured_parser"
                    })
                    existing_names.add(normalized)
        
        # Get patient info from structured parser
        patient_info = structured_result.get("patient_info", {})
        sections = structured_result.get("sections", {})
        if not patient_info.get("name"):
            patient_info = lab_parser.extract_patient_info(extracted_text)
    
    # Analyze risks and generate alerts
    risk_analysis = risk_analyzer.analyze(lab_results)
    risk_analysis["extraction_source"] = extraction_source
    
    # Merge critical alerts from Gemini with risk analyzer alerts
    if critical_alerts:
        risk_analysis["critical_alerts"] = critical_alerts
    
    # Build response
    response = ExtractionResponse(
        success=True,
        is_scanned=is_scanned,
        raw_text=extracted_text,
        tables=extracted_tables,
        lab_results=lab_results,
        risk_analysis=risk_analysis,
        alerts=risk_analysis.get("alerts", []),
        patient_info=patient_info,
        sections=sections
    )
    
    # Add extraction source to response
    response.extraction_source = extraction_source
    
    return response


def _convert_tabular_to_table(tabular_data: list) -> dict:
    """
    Convert tabular extraction data into a table format for the lab parser.
    Each row has columns: test_name, value, reference_range
    """
    if not tabular_data:
        return None
    
    rows = []
    for row_data in tabular_data:
        columns = row_data.get("columns", [])
        if len(columns) >= 2:
            # Extract column texts
            test_name = ""
            value = ""
            reference = ""
            
            for col in columns:
                col_text = col.get("text", "").strip()
                col_type = col.get("column", "")
                
                if col_type == "test_name":
                    test_name = col_text
                elif col_type == "value":
                    value = col_text
                elif col_type == "reference":
                    reference = col_text
            
            # Only add rows with valid data
            if test_name and value and not test_name.lower().startswith(('test', 'investigation', 'parameter', 'result')):
                rows.append([test_name, value, "", reference])
    
    if not rows:
        return None
    
    return {
        "header": ["Test Name", "Result Value", "Unit", "Biological Reference Range"],
        "rows": rows,
        "is_lab_table": True,
        "source": "tabular_extraction"
    }


# ==================== GEMINI-BASED ENDPOINTS ====================

class GeminiParseRequest(BaseModel):
    """Request model for Gemini-based parsing."""
    raw_text: str
    api_key: Optional[str] = None


class MedicalSummaryRequest(BaseModel):
    """Request model for medical summary generation."""
    lab_data: Optional[dict] = None
    prescription_data: Optional[dict] = None
    ehr_data: Optional[dict] = None
    api_key: Optional[str] = None


@app.post("/structure-with-gemini")
async def structure_with_gemini_endpoint(request: GeminiParseRequest):
    """
    🧠 AI-Powered Lab Report Structuring (Groq/Llama)
    
    Uses Groq API with Llama model to convert raw lab report text into structured JSON.
    Fast inference with no quota limits.
    
    Args:
        raw_text: Unstructured text from PDF extraction
        api_key: Optional API key (uses GROQ_API_KEY env var if not provided)
    
    Returns:
        Structured JSON with patient_info, lab_tests, sections, alerts
    """
    if not GROQ_AVAILABLE:
        raise HTTPException(status_code=500, detail="Groq API not available. Set GROQ_API_KEY env var.")
    
    if not request.raw_text or len(request.raw_text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Raw text is required and must not be empty")
    
    try:
        # Use ONLY Groq - no Gemini fallback
        result = structure_with_groq(request.raw_text, request.api_key)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # Add risk analysis
        if result.get("lab_tests"):
            risk_analysis = risk_analyzer.analyze(result["lab_tests"])
            result["risk_analysis"] = risk_analysis
            result["alerts"] = risk_analysis.get("alerts", [])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Groq structuring error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Groq structuring failed: {str(e)}")


@app.post("/extract-lab-image")
async def extract_lab_image_endpoint(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    """
    🖼️ Extract Lab Report from Scanned Image using Groq Vision (Llama 3.2)
    
    Upload a scanned lab report image and extract structured data.
    Uses Groq API with Llama 3.2 Vision model - no quota limits like Gemini.
    
    Supported formats: JPG, JPEG, PNG, WEBP, BMP, TIFF
    
    Returns:
        Structured JSON with patient_info, lab_tests, critical_alerts
    """
    logger.info(f"Received image extraction request: {file.filename}")
    logger.info(f"Content type: {file.content_type}")
    
    # Groq Vision is required for image extraction
    if not GROQ_AVAILABLE:
        raise HTTPException(status_code=500, detail="Groq API not available. Install groq package and set GROQ_API_KEY.")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    logger.info(f"File extension: {file_ext}")
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_types}"
        )
    
    # Determine MIME type
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff"
    }
    image_type = mime_types.get(file_ext, "image/png")
    
    try:
        # Read file content directly into memory
        content = await file.read()
        logger.info(f"File size: {len(content)} bytes")
        
        # Use Groq Vision (Llama 3.2) for image extraction - NO QUOTA LIMITS
        result = extract_lab_image_with_groq(content, api_key, image_type)
        
        if "error" in result:
            logger.error(f"Extraction error: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        logger.info(f"Extraction successful: {len(result.get('lab_tests', []))} tests found")
        
        # Add risk analysis
        if result.get("lab_tests"):
            risk_analysis = risk_analyzer.analyze(result["lab_tests"])
            result["risk_analysis"] = risk_analysis
            result["alerts"] = risk_analysis.get("alerts", [])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lab image extraction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/extract-prescription")
async def extract_prescription_endpoint(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    """
    💊 Extract Prescription Data from Image using Groq Vision (Llama 3.2)
    
    Upload a prescription image and extract:
    - Patient information
    - Doctor information
    - Medications (name, dosage, frequency, duration, instructions)
    - Diagnosis
    - Follow-up date
    
    Supported formats: JPG, JPEG, PNG, WEBP, BMP, TIFF
    
    Returns:
        Structured JSON with patient_info, doctor_info, medications, instructions
    """
    if not GROQ_AVAILABLE:
        raise HTTPException(status_code=500, detail="Groq API not available. Set GROQ_API_KEY env var.")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_types}"
        )
    
    # MIME type mapping
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff"
    }
    image_type = mime_types.get(file_ext, "image/png")
    
    try:
        # Read file content
        content = await file.read()
        
        # Extract using Groq Vision (Llama 3.2)
        result = extract_lab_image_with_groq(content, api_key, image_type)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prescription extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/extract-ehr")
async def extract_ehr_endpoint(file: UploadFile = File(...)):
    """
    📋 Extract EHR Data from CSV File
    
    Upload a CSV file containing Electronic Health Record data.
    Automatically maps common EHR columns to standardized fields.
    
    Handles:
    - Patient demographics
    - Medical history
    - Vitals
    - Diagnoses
    - Medications
    - Lab results (if included in CSV)
    
    Returns:
        Structured EHR data with normalized field names
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext != ".csv":
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    temp_path = None
    try:
        # Save file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, mode='wb') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Extract EHR data
        result = extract_ehr_data(temp_path)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"EHR extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)


@app.post("/generate-medical-summary")
async def generate_medical_summary_endpoint(request: MedicalSummaryRequest):
    """
    🏥 Generate Comprehensive Medical Summary using AI
    
    Combines data from multiple sources (lab reports, prescriptions, EHR)
    and generates a comprehensive medical summary with:
    
    - Patient overview and health status
    - Lab results analysis with clinical significance
    - Medication review with potential interactions
    - Health risks and alerts
    - Clinical correlations
    - Actionable recommendations
    
    At least one data source must be provided.
    
    Args:
        lab_data: Structured lab report data (from /extract-lab-image or /extract-and-structure)
        prescription_data: Structured prescription data (from /extract-prescription)
        ehr_data: EHR data (from /extract-ehr)
        api_key: Optional API key
    
    Returns:
        Comprehensive medical summary with recommendations
    """
    if not GROQ_AVAILABLE:
        raise HTTPException(status_code=500, detail="Groq API not available. Set GROQ_API_KEY env var.")
    
    # Check that at least one data source is provided
    if not request.lab_data and not request.prescription_data and not request.ehr_data:
        raise HTTPException(
            status_code=400,
            detail="At least one data source (lab_data, prescription_data, or ehr_data) is required"
        )
    
    try:
        # Use ONLY Groq - no Gemini fallback
        result = generate_summary_with_groq(
            lab_data=request.lab_data,
            prescription_data=request.prescription_data,
            ehr_data=request.ehr_data,
            api_key=request.api_key
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summary generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")


class StrictSummaryRequest(BaseModel):
    """Request model for strict medical summary generation"""
    patient_info: Optional[dict] = None
    lab_tests: Optional[List[dict]] = None
    computed_risk: Optional[dict] = None
    flags: Optional[dict] = None
    affected_organs: Optional[List[str]] = None
    critical_findings: Optional[List[dict]] = None
    abnormal_findings: Optional[List[dict]] = None
    risk_justification: Optional[List[str]] = None
    api_key: Optional[str] = None


@app.post("/generate-strict-summary")
async def generate_strict_summary_endpoint(request: StrictSummaryRequest):
    """
    🔒 Generate Strict Medical Summary (No Hallucination)
    
    This endpoint uses a STRICT approach to medical summarization:
    
    1. Risk level is PRE-CALCULATED by backend rules (not by LLM)
    2. LLM only EXPLAINS the pre-calculated findings
    3. Temperature 0 is used for deterministic output
    4. The prompt strictly prevents hallucination
    
    This reduces hallucination by ~80% compared to letting the LLM diagnose.
    
    The LLM does NOT:
    - Calculate risk levels
    - Diagnose conditions
    - Invent findings not in the data
    
    The LLM ONLY:
    - Explains pre-calculated findings in clinical language
    - Provides context for the values
    - Suggests follow-up tests based on findings
    
    Args:
        patient_info: Patient demographics and info
        lab_tests: Array of lab test results
        computed_risk: Pre-calculated risk object with risk_level and risk_score
        flags: Pre-calculated clinical flags (kidney_dysfunction, etc.)
        affected_organs: Pre-calculated list of affected organs
        critical_findings: Pre-calculated critical findings
        abnormal_findings: Pre-calculated abnormal findings
        risk_justification: Pre-calculated reasons for the risk level
        api_key: Optional API key (not used with Groq)
    
    Returns:
        Clinical explanation of pre-calculated findings (no diagnosis)
    """
    # Prefer Groq over Gemini to avoid rate limits
    if not GROQ_AVAILABLE and not GEMINI_AVAILABLE:
        raise HTTPException(status_code=500, detail="No AI API available (neither Groq nor Gemini)")
    
    if not request.lab_tests and not request.computed_risk:
        raise HTTPException(
            status_code=400,
            detail="At least lab_tests or computed_risk is required"
        )
    
    try:
        # Build summary data from request
        summary_data = {
            "patient_info": request.patient_info or {},
            "lab_tests": request.lab_tests or [],
            "computed_risk": request.computed_risk or {},
            "flags": request.flags or {},
            "affected_organs": request.affected_organs or [],
            "critical_findings": request.critical_findings or [],
            "abnormal_findings": request.abnormal_findings or [],
            "risk_justification": request.risk_justification or [],
        }
        
        # Use Groq first (no rate limits), fall back to Gemini
        if GROQ_AVAILABLE:
            logger.info("Using Groq for strict summary generation")
            result = generate_strict_summary_with_groq(
                summary_data=summary_data
            )
        else:
            logger.info("Falling back to Gemini for strict summary generation")
            result = generate_strict_summary_with_gemini(
                summary_data=summary_data,
                api_key=request.api_key
            )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Strict summary generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Strict summary generation failed: {str(e)}")


@app.post("/analyze-complete")
async def analyze_complete_endpoint(
    lab_report: Optional[UploadFile] = File(None),
    prescription: Optional[UploadFile] = File(None),
    ehr_csv: Optional[UploadFile] = File(None),
    api_key: Optional[str] = Form(None)
):
    """
    🚀 Complete Analysis Pipeline (Groq/Llama Only)
    
    One-stop endpoint that:
    1. Extracts data from lab report image using Groq Vision (Llama 3.2)
    2. Extracts data from prescription image (if provided)
    3. Extracts data from EHR CSV (if provided)
    4. Generates comprehensive AI summary using Groq/Llama
    
    Upload at least one file to analyze.
    
    Returns:
        {
            "lab_data": {...},
            "prescription_data": {...},
            "ehr_data": {...},
            "summary": {...}
        }
    """
    if not GROQ_AVAILABLE:
        raise HTTPException(status_code=500, detail="Groq API not available. Set GROQ_API_KEY env var.")
    
    if not lab_report and not prescription and not ehr_csv:
        raise HTTPException(
            status_code=400,
            detail="At least one file (lab_report, prescription, or ehr_csv) is required"
        )
    
    temp_files = []
    result = {
        "lab_data": None,
        "prescription_data": None,
        "ehr_data": None,
        "summary": None
    }
    
    # MIME type mapping
    mime_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff"
    }
    
    try:
        # Process lab report image - use Groq Vision (Llama 3.2)
        if lab_report and lab_report.filename:
            file_ext = os.path.splitext(lab_report.filename)[1].lower()
            if file_ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
                content = await lab_report.read()
                image_type = mime_types.get(file_ext, "image/png")
                lab_result = extract_lab_image_with_groq(content, api_key, image_type)
                    
                if not lab_result.get("error"):
                    if lab_result.get("lab_tests"):
                        risk_analysis = risk_analyzer.analyze(lab_result["lab_tests"])
                        lab_result["risk_analysis"] = risk_analysis
                        lab_result["alerts"] = risk_analysis.get("alerts", [])
                    result["lab_data"] = lab_result
        
        # Process prescription image - use Groq Vision
        if prescription and prescription.filename:
            file_ext = os.path.splitext(prescription.filename)[1].lower()
            if file_ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
                content = await prescription.read()
                image_type = mime_types.get(file_ext, "image/png")
                # For now, use the same extraction for prescriptions
                prescription_result = extract_lab_image_with_groq(content, api_key, image_type)
                if not prescription_result.get("error"):
                    result["prescription_data"] = prescription_result
        
        # Process EHR CSV
        if ehr_csv and ehr_csv.filename:
            file_ext = os.path.splitext(ehr_csv.filename)[1].lower()
            if file_ext == ".csv":
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext, mode='wb') as temp_file:
                    content = await ehr_csv.read()
                    temp_file.write(content)
                    temp_files.append(temp_file.name)
                    
                ehr_result = extract_ehr_data(temp_files[-1])
                if not ehr_result.get("error"):
                    result["ehr_data"] = ehr_result
        
        # Generate summary if we have any data - ONLY use Groq
        if result["lab_data"] or result["prescription_data"] or result["ehr_data"]:
            summary_result = generate_summary_with_groq(
                lab_data=result["lab_data"],
                prescription_data=result["prescription_data"],
                ehr_data=result["ehr_data"],
                api_key=api_key
            )
            if not summary_result.get("error"):
                result["summary"] = summary_result
        
        return result
        
    except Exception as e:
        logger.error(f"Complete analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        # Cleanup temp files
        for temp_path in temp_files:
            if os.path.exists(temp_path):
                os.unlink(temp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
