from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.doctor import Doctor, DoctorStatus
from app.schemas.doctor import DoctorResponse, DoctorListResponse
from app.utils.dependencies import verify_admin_token

router = APIRouter(prefix="/admin/doctors", tags=["Manage Doctors"])

@router.get("", response_model=List[DoctorListResponse])
def get_all_doctors(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    offset = (page - 1) * limit
    doctors = db.query(Doctor).order_by(Doctor.created_at.desc()).offset(offset).limit(limit).all()
    return doctors

@router.get("/count")
def get_doctors_count(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    total = db.query(func.count(Doctor.id)).scalar()
    return {"total": total or 0}

@router.get("/approved", response_model=List[DoctorListResponse])
def get_approved_doctors(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    doctors = db.query(Doctor).filter(Doctor.status == DoctorStatus.APPROVED.value).all()
    return doctors

@router.patch("/{doctor_id}/approve")
def approve_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    doctor.status = DoctorStatus.APPROVED.value
    db.commit()
    db.refresh(doctor)
    
    return {"message": "Doctor approved successfully", "doctor_id": doctor_id}

@router.patch("/{doctor_id}/reject")
def reject_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    doctor.status = DoctorStatus.REJECTED.value
    db.commit()
    db.refresh(doctor)
    
    return {"message": "Doctor rejected successfully", "doctor_id": doctor_id}

@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_admin_token)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    return doctor
