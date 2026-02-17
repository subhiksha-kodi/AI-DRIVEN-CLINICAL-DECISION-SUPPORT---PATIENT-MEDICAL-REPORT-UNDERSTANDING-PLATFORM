from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.report import Report
from app.models.report_review import ReportReview, ExtractedData
from app.utils.dependencies import verify_doctor_token
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/doctor/portal", tags=["Doctor Portal"])


class DoctorStatsResponse(BaseModel):
    assigned_patients: int
    reports_reviewed: int
    pending_review: int


class PatientReportResponse(BaseModel):
    patient_id: int
    patient_name: str
    registration_number: str
    report_id: int
    file_url: str
    file_name: str
    uploaded_at: datetime
    is_reviewed: bool
    is_extracted: bool
    extracted_data: Optional[dict] = None

    class Config:
        from_attributes = True


@router.get("/stats", response_model=DoctorStatsResponse)
def get_doctor_stats(
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(verify_doctor_token)
):
    """Get doctor dashboard statistics"""
    # Count assigned patients
    assigned_patients = db.query(func.count(Patient.id)).filter(
        Patient.assigned_doctor_id == current_doctor.id
    ).scalar() or 0
    
    # Count reviewed reports
    reports_reviewed = db.query(func.count(Report.id)).filter(
        Report.doctor_id == current_doctor.id,
        Report.is_reviewed == True
    ).scalar() or 0
    
    # Count total reports assigned to doctor
    total_reports = db.query(func.count(Report.id)).filter(
        Report.doctor_id == current_doctor.id
    ).scalar() or 0
    
    pending_review = total_reports - reports_reviewed
    
    return {
        "assigned_patients": assigned_patients,
        "reports_reviewed": reports_reviewed,
        "pending_review": pending_review
    }


@router.get("/report/{register_number}")
def get_patient_report(
    register_number: str,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(verify_doctor_token)
):
    """Get latest report for a patient by registration number"""
    # Find patient by registration number
    patient = db.query(Patient).filter(
        Patient.registration_number == register_number
    ).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Verify doctor is assigned to this patient
    if patient.assigned_doctor_id != current_doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this patient"
        )
    
    # Get latest report for this patient
    report = db.query(Report).filter(
        Report.patient_id == patient.id,
        Report.doctor_id == current_doctor.id
    ).order_by(Report.uploaded_at.desc()).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reports found for this patient"
        )
    
    # Get extracted data if available
    extracted_data = None
    if report.extracted_data:
        extracted_data = {
            "raw_text": report.extracted_data.raw_text,
            "lab_values": report.extracted_data.lab_values,
            "diseases": report.extracted_data.diseases,
            "medications": report.extracted_data.medications,
            "clinical_notes": report.extracted_data.clinical_notes,
            "dates": report.extracted_data.dates,
            "risk_indicators": report.extracted_data.risk_indicators,
            "drug_interactions": report.extracted_data.drug_interactions,
            "dosage_risks": report.extracted_data.dosage_risks,
            "trends": report.extracted_data.trends,
            "ai_summary": report.extracted_data.ai_summary,
            "ai_risk_explanation": report.extracted_data.ai_risk_explanation,
            "ai_recommendations": report.extracted_data.ai_recommendations,
            "counterfactual_insights": report.extracted_data.counterfactual_insights
        }
    
    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "registration_number": patient.registration_number,
        "report_id": report.id,
        "file_url": report.file_url,
        "file_name": report.file_name,
        "uploaded_at": report.uploaded_at,
        "is_reviewed": report.is_reviewed,
        "is_extracted": report.is_extracted,
        "extracted_data": extracted_data
    }


@router.post("/extract/{report_id}")
def extract_report_data(
    report_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(verify_doctor_token)
):
    """Extract data from a report using OCR and NLP"""
    from app.services.extraction_service import extract_and_analyze_report
    
    # Verify report belongs to doctor
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.doctor_id == current_doctor.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or access denied"
        )
    
    # Check if already extracted
    if report.is_extracted and report.extracted_data:
        return {
            "message": "Report already extracted",
            "extracted_data": {
                "raw_text": report.extracted_data.raw_text,
                "lab_values": report.extracted_data.lab_values,
                "diseases": report.extracted_data.diseases,
                "medications": report.extracted_data.medications,
                "clinical_notes": report.extracted_data.clinical_notes,
                "risk_indicators": report.extracted_data.risk_indicators,
                "drug_interactions": report.extracted_data.drug_interactions,
                "dosage_risks": report.extracted_data.dosage_risks,
                "trends": report.extracted_data.trends,
                "ai_summary": report.extracted_data.ai_summary,
                "ai_risk_explanation": report.extracted_data.ai_risk_explanation,
                "ai_recommendations": report.extracted_data.ai_recommendations,
                "counterfactual_insights": report.extracted_data.counterfactual_insights
            }
        }
    
    # Get previous reports for trend analysis
    previous_reports = db.query(Report).filter(
        Report.patient_id == report.patient_id,
        Report.id != report_id,
        Report.is_extracted == True
    ).order_by(Report.uploaded_at.desc()).limit(5).all()
    
    previous_data = []
    for prev_report in previous_reports:
        if prev_report.extracted_data:
            previous_data.append({
                "date": prev_report.uploaded_at,
                "lab_values": prev_report.extracted_data.lab_values
            })
    
    # Extract and analyze
    result = extract_and_analyze_report(
        file_path=f"uploads{report.file_url.replace('/uploads', '')}",
        file_name=report.file_name,
        previous_data=previous_data,
        db=db
    )
    
    # Save extracted data
    extracted = ExtractedData(
        report_id=report_id,
        raw_text=result.get("raw_text"),
        lab_values=result.get("lab_values"),
        diseases=result.get("diseases"),
        medications=result.get("medications"),
        clinical_notes=result.get("clinical_notes"),
        dates=result.get("dates"),
        risk_indicators=result.get("risk_indicators"),
        drug_interactions=result.get("drug_interactions"),
        dosage_risks=result.get("dosage_risks"),
        trends=result.get("trends"),
        ai_summary=result.get("ai_summary"),
        ai_risk_explanation=result.get("ai_risk_explanation"),
        ai_recommendations=result.get("ai_recommendations"),
        counterfactual_insights=result.get("counterfactual_insights")
    )
    
    db.add(extracted)
    report.is_extracted = True
    db.commit()
    
    return {
        "message": "Report extracted successfully",
        "extracted_data": result
    }


@router.patch("/review/{report_id}")
def mark_report_reviewed(
    report_id: int,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(verify_doctor_token)
):
    """Mark a report as reviewed"""
    # Verify report belongs to doctor
    report = db.query(Report).filter(
        Report.id == report_id,
        Report.doctor_id == current_doctor.id
    ).first()
    
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found or access denied"
        )
    
    if report.is_reviewed:
        return {"message": "Report already marked as reviewed"}
    
    # Create review record
    review = ReportReview(
        report_id=report_id,
        doctor_id=current_doctor.id
    )
    
    db.add(review)
    report.is_reviewed = True
    db.commit()
    
    return {"message": "Report marked as reviewed successfully"}


@router.get("/patients")
def get_assigned_patients(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_doctor: Doctor = Depends(verify_doctor_token)
):
    """Get list of patients assigned to the doctor"""
    offset = (page - 1) * limit
    
    patients = db.query(Patient).filter(
        Patient.assigned_doctor_id == current_doctor.id
    ).offset(offset).limit(limit).all()
    
    total = db.query(func.count(Patient.id)).filter(
        Patient.assigned_doctor_id == current_doctor.id
    ).scalar() or 0
    
    # Build response with latest report info
    patients_response = []
    for p in patients:
        # Get latest report for this patient
        latest_report = db.query(Report).filter(
            Report.patient_id == p.id
        ).order_by(Report.uploaded_at.desc()).first()
        
        patients_response.append({
            "id": p.id,
            "name": p.name,
            "register_number": p.registration_number,
            "age": getattr(p, 'age', None),
            "total_reports": p.total_reports,
            "latest_report": latest_report.uploaded_at if latest_report else None,
            "report_reviewed": latest_report.is_reviewed if latest_report else False
        })
    
    return {
        "patients": patients_response,
        "total": total
    }


@router.get("/me")
def get_current_doctor_info(
    current_doctor: Doctor = Depends(verify_doctor_token)
):
    """Get current doctor's information"""
    return {
        "id": current_doctor.id,
        "name": current_doctor.name,
        "email": current_doctor.email,
        "specialization": current_doctor.specialization,
        "phone": current_doctor.phone,
        "registration_id": current_doctor.registration_id
    }
