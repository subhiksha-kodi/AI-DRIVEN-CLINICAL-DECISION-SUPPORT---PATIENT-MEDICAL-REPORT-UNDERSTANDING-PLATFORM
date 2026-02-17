from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PatientCreate(BaseModel):
    name: str
    registration_number: str
    assigned_doctor_id: Optional[int] = None

class PatientResponse(BaseModel):
    id: int
    name: str
    registration_number: str
    assigned_doctor_id: Optional[int]
    assigned_doctor_name: Optional[str] = None
    total_reports: int
    created_at: datetime
    
    class Config:
        from_attributes = True
