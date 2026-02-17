from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime, timedelta
from typing import Optional, List
import os
import uuid
import aiofiles
from app.database import get_db
from app.models.doctor import Doctor, DoctorStatus
from app.models.patient import Patient
from app.models.report import Report
from app.schemas.report import ReportResponse
from app.utils.dependencies import verify_admin_token
from app.config import settings

router = APIRouter(prefix="/admin", tags=["Admin"])

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    # Total doctors
    total_doctors = db.query(func.count(Doctor.id)).scalar()
    
    # Total patients (unique registration numbers)
    total_patients = db.query(func.count(Patient.id)).scalar()
    
    # Total reports
    total_reports = db.query(func.count(Report.id)).scalar()
    
    # Recent uploads (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_uploads = db.query(func.count(Report.id)).filter(
        Report.uploaded_at >= seven_days_ago
    ).scalar()
    
    return {
        "total_doctors": total_doctors or 0,
        "total_patients": total_patients or 0,
        "total_reports": total_reports or 0,
        "recent_uploads": recent_uploads or 0
    }

@router.post("/upload-report")
async def upload_report(
    patient_name: str = Form(...),
    registration_number: str = Form(...),
    doctor_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    # Verify doctor exists and is approved
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id,
        Doctor.status == DoctorStatus.APPROVED.value
    ).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Approved doctor not found"
        )
    
    # Check if patient exists
    patient = db.query(Patient).filter(
        Patient.registration_number == registration_number
    ).first()
    
    if not patient:
        # Create new patient
        patient = Patient(
            name=patient_name,
            registration_number=registration_number,
            assigned_doctor_id=doctor_id,
            total_reports=0
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
    else:
        # Update patient name and doctor if needed
        patient.name = patient_name
        patient.assigned_doctor_id = doctor_id
    
    # Save file
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Create report
    report = Report(
        patient_id=patient.id,
        doctor_id=doctor_id,
        file_url=f"/uploads/{unique_filename}",
        file_name=file.filename
    )
    
    db.add(report)
    
    # Increment patient's report count
    patient.total_reports += 1
    
    db.commit()
    db.refresh(report)
    
    return {
        "message": "Report uploaded successfully",
        "report_id": report.id,
        "file_name": file.filename
    }

@router.get("/reports", response_model=List[ReportResponse])
def get_reports(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    offset = (page - 1) * limit
    
    reports = db.query(Report).order_by(Report.uploaded_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for report in reports:
        patient = db.query(Patient).filter(Patient.id == report.patient_id).first()
        doctor = db.query(Doctor).filter(Doctor.id == report.doctor_id).first()
        
        result.append(ReportResponse(
            id=report.id,
            patient_id=report.patient_id,
            patient_name=patient.name if patient else None,
            registration_number=patient.registration_number if patient else None,
            doctor_id=report.doctor_id,
            doctor_name=doctor.name if doctor else None,
            file_url=report.file_url,
            file_name=report.file_name,
            uploaded_at=report.uploaded_at
        ))
    
    return result

@router.get("/reports/count")
def get_reports_count(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    total = db.query(func.count(Report.id)).scalar()
    return {"total": total or 0}

@router.get("/search")
def search(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    search_term = f"%{query}%"
    
    # Search in reports with patient and doctor info
    reports = db.query(Report).join(Patient).join(Doctor).filter(
        or_(
            Patient.name.ilike(search_term),
            Patient.registration_number.ilike(search_term),
            Doctor.name.ilike(search_term),
            Report.file_name.ilike(search_term)
        )
    ).order_by(Report.uploaded_at.desc()).limit(50).all()
    
    result = []
    for report in reports:
        patient = db.query(Patient).filter(Patient.id == report.patient_id).first()
        doctor = db.query(Doctor).filter(Doctor.id == report.doctor_id).first()
        
        result.append({
            "id": report.id,
            "patient_id": report.patient_id,
            "patient_name": patient.name if patient else None,
            "registration_number": patient.registration_number if patient else None,
            "doctor_id": report.doctor_id,
            "doctor_name": doctor.name if doctor else None,
            "file_url": report.file_url,
            "file_name": report.file_name,
            "uploaded_at": report.uploaded_at.isoformat()
        })
    
    return result
