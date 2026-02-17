from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class DoctorCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    specialization: str
    phone: str
    registration_id: str

class DoctorLogin(BaseModel):
    email: EmailStr
    password: str

class DoctorResponse(BaseModel):
    id: int
    name: str
    email: str
    specialization: str
    phone: str
    registration_id: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class DoctorListResponse(BaseModel):
    id: int
    name: str
    email: str
    specialization: str
    phone: str
    registration_id: str
    status: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    doctor: Optional[DoctorResponse] = None
