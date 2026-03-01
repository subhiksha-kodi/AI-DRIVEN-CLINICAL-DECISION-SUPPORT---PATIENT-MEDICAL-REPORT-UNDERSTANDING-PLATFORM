"""
Pydantic Schemas for Medical Report Extraction API
Defines structured data models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class StatusEnum(str, Enum):
    """Lab result status values"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    UNKNOWN = ""


class SeverityEnum(str, Enum):
    """Alert severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    NORMAL = "NORMAL"


class LabResult(BaseModel):
    """
    Structured representation of a single lab test result.
    This is the primary output format for the React frontend.
    """
    test_name: str = Field(..., description="Display name of the test")
    test_name_normalized: Optional[str] = Field(None, description="Normalized test code")
    value: str = Field(..., description="Result value as string")
    numeric_value: Optional[float] = Field(None, description="Parsed numeric value")
    unit: str = Field("", description="Unit of measurement")
    reference_range: str = Field("", description="Reference range text")
    status: str = Field("", description="LOW / NORMAL / HIGH")
    source: Optional[str] = Field(None, description="table or text")
    
    class Config:
        json_schema_extra = {
            "example": {
                "test_name": "Hemoglobin",
                "test_name_normalized": "hemoglobin",
                "value": "14.2",
                "numeric_value": 14.2,
                "unit": "g/dL",
                "reference_range": "12.0 - 17.0 g/dL",
                "status": "NORMAL",
                "source": "table"
            }
        }


class Alert(BaseModel):
    """
    Alert for abnormal lab values requiring attention.
    """
    test_name: str = Field(..., description="Name of the test")
    test_code: str = Field("", description="Normalized test code")
    value: float = Field(..., description="Numeric value")
    unit: str = Field("", description="Unit of measurement")
    status: str = Field(..., description="LOW or HIGH")
    severity: str = Field(..., description="CRITICAL / HIGH / MODERATE / LOW")
    reference_range: str = Field("", description="Reference range")
    message: str = Field(..., description="Alert message with emoji indicator")
    recommendation: str = Field("", description="Clinical recommendation")
    requires_immediate_attention: bool = Field(False, description="True if critical")
    
    class Config:
        json_schema_extra = {
            "example": {
                "test_name": "Glucose (Fasting)",
                "test_code": "glucose_fasting",
                "value": 250,
                "unit": "mg/dL",
                "status": "HIGH",
                "severity": "HIGH",
                "reference_range": "70 - 100 mg/dL",
                "message": "🔴 HIGH ALERT: Glucose (Fasting) is significantly elevated at 250 mg/dL. Reference range: 70 - 100 mg/dL.",
                "recommendation": "Schedule urgent consultation with healthcare provider within 24-48 hours.",
                "requires_immediate_attention": False
            }
        }


class DetectedCondition(BaseModel):
    """
    Potentially indicated medical condition based on test patterns.
    """
    condition: str = Field(..., description="Condition name")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    indicators: List[Dict[str, str]] = Field(default_factory=list)
    message: str = Field("", description="Clinical message")


class RiskAnalysis(BaseModel):
    """
    Overall risk analysis of lab results.
    """
    alerts: List[Alert] = Field(default_factory=list)
    summary: str = Field("", description="Text summary of findings")
    abnormal_count: int = Field(0, description="Number of abnormal values")
    critical_count: int = Field(0, description="Number of critical values")
    total_tests: int = Field(0, description="Total tests analyzed")
    risk_score: int = Field(0, ge=0, le=100, description="Overall risk score 0-100")
    risk_level: str = Field("NORMAL", description="CRITICAL/HIGH/MODERATE/LOW/NORMAL")
    conditions: List[DetectedCondition] = Field(default_factory=list)


class PatientInfo(BaseModel):
    """
    Patient information extracted from the report.
    """
    name: str = Field("", description="Patient name")
    age: str = Field("", description="Patient age")
    gender: str = Field("", description="Patient gender")
    patient_id: str = Field("", description="Patient ID/MRN")
    date: str = Field("", description="Report date")
    doctor: str = Field("", description="Referring doctor")


class TableData(BaseModel):
    """
    Extracted table data from PDF.
    """
    page: int = Field(..., description="Page number")
    table_index: int = Field(0, description="Table index on page")
    header: List[str] = Field(default_factory=list)
    rows: List[List[str]] = Field(default_factory=list)
    is_lab_table: bool = Field(False, description="Whether this appears to be a lab table")
    column_count: int = Field(0)
    row_count: int = Field(0)


class ExtractionRequest(BaseModel):
    """
    Request model for extraction from file path.
    """
    file_path: str = Field(..., description="Path to the file to extract")
    options: Optional[Dict[str, Any]] = Field(None, description="Optional extraction settings")


class ExtractionResponse(BaseModel):
    """
    Complete extraction response for the React frontend.
    Contains all extracted data, parsed results, and alerts.
    """
    success: bool = Field(True, description="Whether extraction succeeded")
    is_scanned: bool = Field(False, description="Whether OCR was used")
    raw_text: str = Field("", description="Extracted raw text")
    tables: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted tables")
    lab_results: List[Dict[str, Any]] = Field(default_factory=list, description="Structured lab results")
    risk_analysis: Dict[str, Any] = Field(default_factory=dict, description="Risk analysis with alerts")
    alerts: List[Dict[str, Any]] = Field(default_factory=list, description="Alert list for frontend")
    patient_info: Dict[str, Any] = Field(default_factory=dict, description="Patient information")
    sections: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Lab tests grouped by section")
    extraction_source: str = Field("standard", description="Source of extraction: gemini, regex, or standard")
    extraction_confidence: str = Field("high", description="Confidence level of extraction")
    critical_alerts: List[Dict[str, Any]] = Field(default_factory=list, description="Critical alerts requiring immediate attention")
    error: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "is_scanned": False,
                "raw_text": "=== Page 1 ===\n...",
                "tables": [],
                "lab_results": [
                    {
                        "test_name": "Hemoglobin",
                        "value": "14.2",
                        "unit": "g/dL",
                        "reference_range": "12.0 - 17.0 g/dL",
                        "status": "NORMAL"
                    }
                ],
                "risk_analysis": {
                    "risk_score": 0,
                    "risk_level": "NORMAL",
                    "alerts": []
                },
                "alerts": [],
                "patient_info": {
                    "name": "John Doe",
                    "age": "45",
                    "gender": "Male"
                }
            }
        }


class HealthCheckResponse(BaseModel):
    """
    Health check endpoint response.
    """
    status: str = Field("healthy")
    service: str = Field("extraction-service")
