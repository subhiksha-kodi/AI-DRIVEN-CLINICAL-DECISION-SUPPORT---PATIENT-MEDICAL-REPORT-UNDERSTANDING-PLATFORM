from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.doctor import Doctor, DoctorStatus
from app.schemas.doctor import DoctorCreate, DoctorLogin, DoctorResponse, Token
from app.utils.security import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/doctor", tags=["Authentication"])

@router.post("/signup", response_model=DoctorResponse)
def signup(doctor_data: DoctorCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_email = db.query(Doctor).filter(Doctor.email == doctor_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if registration_id already exists
    existing_reg = db.query(Doctor).filter(Doctor.registration_id == doctor_data.registration_id).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration ID already exists"
        )
    
    # Create new doctor
    hashed_password = get_password_hash(doctor_data.password)
    new_doctor = Doctor(
        name=doctor_data.name,
        email=doctor_data.email,
        password=hashed_password,
        specialization=doctor_data.specialization,
        phone=doctor_data.phone,
        registration_id=doctor_data.registration_id,
        status=DoctorStatus.PENDING.value
    )
    
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    
    return new_doctor

@router.post("/login", response_model=Token)
def login(login_data: DoctorLogin, db: Session = Depends(get_db)):
    # Find doctor by email
    doctor = db.query(Doctor).filter(Doctor.email == login_data.email).first()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(login_data.password, doctor.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check status
    if doctor.status == DoctorStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval"
        )
    
    if doctor.status == DoctorStatus.REJECTED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin Rejected"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(doctor.id), "role": "doctor"})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "doctor": doctor
    }

# Admin login endpoint
@router.post("/admin/login", response_model=Token)
def admin_login(login_data: DoctorLogin, db: Session = Depends(get_db)):
    # Simple admin credentials check (in production, use a separate admin table)
    if login_data.email == "admin@admin.com" and login_data.password == "admin123":
        access_token = create_access_token(data={"sub": "admin", "role": "admin"})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "doctor": None
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin credentials"
    )
