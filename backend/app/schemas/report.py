from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReportCreate(BaseModel):
    patient_name: str
    registration_number: str
    doctor_id: int

class ReportResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    registration_number: Optional[str] = None
    doctor_id: int
    doctor_name: Optional[str] = None
    file_url: str
    file_name: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True
