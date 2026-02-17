from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List
from app.database import get_db
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.schemas.patient import PatientResponse
from app.utils.dependencies import verify_admin_token

router = APIRouter(prefix="/admin/patients", tags=["Manage Patients"])

@router.get("", response_model=List[PatientResponse])
def get_all_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    offset = (page - 1) * limit
    
    query = db.query(Patient)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Patient.name.ilike(search_term),
                Patient.registration_number.ilike(search_term)
            )
        )
    
    patients = query.order_by(Patient.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for patient in patients:
        doctor = None
        if patient.assigned_doctor_id:
            doctor = db.query(Doctor).filter(Doctor.id == patient.assigned_doctor_id).first()
        
        result.append(PatientResponse(
            id=patient.id,
            name=patient.name,
            registration_number=patient.registration_number,
            assigned_doctor_id=patient.assigned_doctor_id,
            assigned_doctor_name=doctor.name if doctor else None,
            total_reports=patient.total_reports,
            created_at=patient.created_at
        ))
    
    return result

@router.get("/count")
def get_patients_count(
    search: str = Query(None),
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    query = db.query(func.count(Patient.id))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Patient.name.ilike(search_term),
                Patient.registration_number.ilike(search_term)
            )
        )
    
    total = query.scalar()
    return {"total": total or 0}

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    doctor = None
    if patient.assigned_doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == patient.assigned_doctor_id).first()
    
    return PatientResponse(
        id=patient.id,
        name=patient.name,
        registration_number=patient.registration_number,
        assigned_doctor_id=patient.assigned_doctor_id,
        assigned_doctor_name=doctor.name if doctor else None,
        total_reports=patient.total_reports,
        created_at=patient.created_at
    )
