from sqlalchemy import Column, Integer, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ReportReview(Base):
    __tablename__ = "report_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="review")
    doctor = relationship("Doctor", back_populates="reviews")


class ExtractedData(Base):
    __tablename__ = "extracted_data"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), unique=True, nullable=False)
    
    # Raw extracted text
    raw_text = Column(Text, nullable=True)
    
    # Structured extracted data
    lab_values = Column(JSON, nullable=True)  # [{name, value, unit, reference_range, status}]
    diseases = Column(JSON, nullable=True)  # [disease names]
    medications = Column(JSON, nullable=True)  # [{name, dosage, frequency}]
    clinical_notes = Column(JSON, nullable=True)  # [notes]
    dates = Column(JSON, nullable=True)  # [identified dates]
    
    # Clinical interpretation
    risk_indicators = Column(JSON, nullable=True)  # [{marker, level, severity}]
    drug_interactions = Column(JSON, nullable=True)  # [{drug1, drug2, severity, description}]
    dosage_risks = Column(JSON, nullable=True)  # [{drug, issue, recommendation}]
    trends = Column(JSON, nullable=True)  # [{test, trend, previous_value, current_value}]
    
    # AI generated insights
    ai_summary = Column(Text, nullable=True)
    ai_risk_explanation = Column(Text, nullable=True)
    ai_recommendations = Column(JSON, nullable=True)
    counterfactual_insights = Column(Text, nullable=True)
    
    extracted_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="extracted_data")
