from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class DoctorStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    specialization = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    registration_id = Column(String(100), unique=True, nullable=False)
    status = Column(String(20), default=DoctorStatus.PENDING.value)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patients = relationship("Patient", back_populates="doctor")
    reports = relationship("Report", back_populates="doctor")
    reviews = relationship("ReportReview", back_populates="doctor")
