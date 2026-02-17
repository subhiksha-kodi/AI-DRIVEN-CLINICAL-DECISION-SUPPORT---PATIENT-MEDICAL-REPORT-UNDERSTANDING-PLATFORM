from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class DoctorCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    registration_id: Optional[str] = None  # Auto-generated if not provided

class DoctorRegister(BaseModel):
    """Schema for doctor self-registration from portal"""
    name: str
    email: EmailStr
    password: str
    specialization: Optional[str] = None
    phone: Optional[str] = None

class DoctorLogin(BaseModel):
    email: EmailStr
    password: str

class DoctorResponse(BaseModel):
    id: int
    name: str
    email: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    registration_id: Optional[str] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class DoctorListResponse(BaseModel):
    id: int
    name: str
    email: str
    specialization: Optional[str] = None
    phone: Optional[str] = None
    registration_id: Optional[str] = None
    status: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    doctor: Optional[DoctorResponse] = None
