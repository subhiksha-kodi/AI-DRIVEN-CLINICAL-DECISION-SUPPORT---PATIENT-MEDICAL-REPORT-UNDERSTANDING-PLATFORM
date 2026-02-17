"""
Extraction Service
Orchestrates the complete report extraction pipeline:
OCR -> Structured Parsing -> Validation -> NLP -> Clinical Rules -> AI Reasoning
"""

import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from .ocr_service import ocr_pipeline
from .nlp_service import nlp_extractor
from .clinical_engine import analyze_clinical_data
from .ai_service import ai_service, generate_rule_based_summary
from .parsing_service import structured_parser, parse_lab_text, extract_patient_info
from .validation_service import medical_validator, validate_report

logger = logging.getLogger(__name__)


class ExtractionService:
    """Orchestrates the complete extraction pipeline"""
    
    def __init__(self):
        self.ocr = ocr_pipeline
        self.nlp = nlp_extractor
    
    async def extract_from_file(self, file_path: str, previous_data: list = None, patient_gender: str = None) -> Dict[str, Any]:
        """
        Complete extraction pipeline for a report file
        
        Args:
            file_path: Path to the report file (PDF or image)
            previous_data: List of previous extraction results for trend analysis
            patient_gender: Patient gender for reference range lookup
            
        Returns:
            Complete extraction results with all analyses
        """
        result = {
            "status": "pending",
            "extracted_at": datetime.now(timezone.utc).isoformat(),
            "file_path": file_path,
            "raw_text": None,
            "patient_info": {},
            "structured_data": [],
            "validation_result": {},
            "lab_values": [],
            "diseases": [],
            "medications": [],
            "dates": [],
            "clinical_notes": "",
            "risk_indicators": [],
            "drug_interactions": [],
            "dosage_risks": [],
            "trends": [],
            "clinical_summary": {},
            "ai_summary": None,
            "ai_diagnostic_reasoning": None,
            "ai_counterfactual": None,
            "extraction_confidence": 0.0,
            "errors": []
        }
        
        try:
            # Step 1: OCR Text Extraction
            logger.info(f"Starting OCR extraction for: {file_path}")
            raw_text = await self._run_ocr(file_path)
            
            if not raw_text:
                result["status"] = "failed"
                result["errors"].append("OCR failed to extract text from document")
                return result
            
            result["raw_text"] = raw_text
            logger.info(f"OCR extracted {len(raw_text)} characters")
            
            # Step 2: Extract Patient Info
            logger.info("Extracting patient information")
            result["patient_info"] = extract_patient_info(raw_text)
            if not patient_gender and result["patient_info"].get("gender"):
                patient_gender = result["patient_info"]["gender"]
            
            # Step 3: Structured Parsing (medical-grade extraction)
            logger.info("Running structured parsing")
            structured_data = parse_lab_text(raw_text)
            result["structured_data"] = structured_data
            
            # Calculate extraction confidence
            if structured_data:
                avg_confidence = sum(d.get("confidence", 0) for d in structured_data) / len(structured_data)
                result["extraction_confidence"] = round(avg_confidence, 2)
            
            logger.info(f"Structured parser found {len(structured_data)} lab values")
            
            # Step 4: Medical Validation
            logger.info("Running medical validation")
            validation_result = validate_report(structured_data, patient_gender)
            result["validation_result"] = validation_result
            
            # Step 5: NLP Entity Extraction (for diseases, medications, etc.)
            logger.info("Starting NLP extraction")
            nlp_result = await self._run_nlp(raw_text)
            
            result["diseases"] = nlp_result.get("diseases", [])
            result["medications"] = nlp_result.get("medications", [])
            result["dates"] = nlp_result.get("dates", [])
            result["clinical_notes"] = nlp_result.get("clinical_notes", "")
            
            # Merge structured data with NLP lab values (prefer structured)
            if structured_data:
                result["lab_values"] = structured_data
            else:
                result["lab_values"] = nlp_result.get("lab_values", [])
            
            logger.info(f"Extraction found: {len(result['lab_values'])} lab values, "
                       f"{len(result['diseases'])} diseases, {len(result['medications'])} medications")
            
            # Step 6: Clinical Rule Engine Analysis
            logger.info("Running clinical analysis")
            clinical_result = analyze_clinical_data(
                lab_values=result["lab_values"],
                medications=result["medications"],
                previous_data=previous_data or []
            )
            
            result["risk_indicators"] = clinical_result.get("risk_indicators", [])
            result["drug_interactions"] = clinical_result.get("drug_interactions", [])
            result["dosage_risks"] = clinical_result.get("dosage_risks", [])
            result["trends"] = clinical_result.get("trends", [])
            result["clinical_summary"] = clinical_result.get("clinical_summary", {})
            
            # Add critical alerts from validation to risk indicators
            if validation_result.get("critical_alerts"):
                for alert in validation_result["critical_alerts"]:
                    result["risk_indicators"].append({
                        "type": "critical_value",
                        "severity": "high",
                        "description": alert.get("message", "")
                    })
            
            logger.info(f"Clinical analysis: {len(result['risk_indicators'])} risks, "
                       f"{len(result['drug_interactions'])} interactions")
            
            # Step 7: AI Reasoning (optional - depends on API key availability)
            if os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY"):
                logger.info("Generating AI insights")
                await self._run_ai_analysis(result)
            else:
                logger.info("No AI API key configured - using rule-based summary")
                result["ai_summary"] = generate_rule_based_summary(result)
            
            result["status"] = "completed"
            logger.info("Extraction pipeline completed successfully")
            
        except Exception as e:
            logger.error(f"Extraction pipeline error: {str(e)}")
            result["status"] = "failed"
            result["errors"].append(str(e))
        
        return result
    
    async def _run_ocr(self, file_path: str) -> Optional[str]:
        """Run OCR extraction"""
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return None
            
            # Determine file type and process
            ext = os.path.splitext(file_path)[1].lower()
            
            if ext == ".pdf":
                return self.ocr.extract_text_from_pdf(file_path)
            elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
                return self.ocr.extract_text_from_image(file_path)
            else:
                # Try to read as text
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return f.read()
                except:
                    logger.error(f"Unsupported file type: {ext}")
                    return None
                    
        except Exception as e:
            logger.error(f"OCR error: {str(e)}")
            return None
    
    async def _run_nlp(self, text: str) -> Dict:
        """Run NLP extraction"""
        try:
            return self.nlp.extract_all(text)
        except Exception as e:
            logger.error(f"NLP error: {str(e)}")
            return {}
    
    async def _run_ai_analysis(self, result: Dict):
        """Run AI-powered analysis"""
        try:
            # Generate clinical summary
            ai_summary = await ai_service.generate_clinical_summary(result)
            if ai_summary:
                result["ai_summary"] = ai_summary
            
            # Generate diagnostic reasoning if there are abnormal values
            abnormal_count = len([v for v in result["lab_values"] 
                                 if v.get("status") in ["high", "low"]])
            if abnormal_count > 0:
                diagnostic = await ai_service.generate_diagnostic_reasoning(result)
                if diagnostic:
                    result["ai_diagnostic_reasoning"] = diagnostic
            
            # Generate counterfactual analysis if there are risks
            if result.get("risk_indicators") or result.get("drug_interactions"):
                counterfactual = await ai_service.generate_counterfactual_insights(result)
                if counterfactual:
                    result["ai_counterfactual"] = counterfactual
                    
        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}")


# Alternative extraction for when report content is already text
async def extract_from_text(text: str, previous_data: list = None) -> Dict[str, Any]:
    """Extract from raw text directly (skips OCR)"""
    service = ExtractionService()
    
    result = {
        "status": "pending",
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "raw_text": text,
        "lab_values": [],
        "diseases": [],
        "medications": [],
        "dates": [],
        "clinical_notes": "",
        "risk_indicators": [],
        "drug_interactions": [],
        "dosage_risks": [],
        "trends": [],
        "clinical_summary": {},
        "ai_summary": None,
        "errors": []
    }
    
    try:
        # Run NLP
        nlp_result = await service._run_nlp(text)
        result.update({
            "lab_values": nlp_result.get("lab_values", []),
            "diseases": nlp_result.get("diseases", []),
            "medications": nlp_result.get("medications", []),
            "dates": nlp_result.get("dates", []),
            "clinical_notes": nlp_result.get("clinical_notes", "")
        })
        
        # Run clinical analysis
        clinical_result = analyze_clinical_data(
            lab_values=result["lab_values"],
            medications=result["medications"],
            previous_data=previous_data or []
        )
        result.update({
            "risk_indicators": clinical_result.get("risk_indicators", []),
            "drug_interactions": clinical_result.get("drug_interactions", []),
            "dosage_risks": clinical_result.get("dosage_risks", []),
            "trends": clinical_result.get("trends", []),
            "clinical_summary": clinical_result.get("clinical_summary", {})
        })
        
        # AI analysis
        if os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY"):
            await service._run_ai_analysis(result)
        else:
            result["ai_summary"] = generate_rule_based_summary(result)
        
        result["status"] = "completed"
        
    except Exception as e:
        logger.error(f"Text extraction error: {str(e)}")
        result["status"] = "failed"
        result["errors"].append(str(e))
    
    return result


# Create singleton instance
extraction_service = ExtractionService()


def extract_and_analyze_report(file_path: str, file_name: str = None, previous_data: list = None, db=None, patient_gender: str = None) -> Dict[str, Any]:
    """
    Synchronous wrapper for report extraction (for use in non-async routes)
    
    This performs the extraction pipeline synchronously for FastAPI routes
    that are not async.
    """
    import asyncio
    
    result = {
        "status": "pending",
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "file_path": file_path,
        "raw_text": None,
        "patient_info": {},
        "structured_data": [],
        "validation_result": {},
        "lab_values": [],
        "diseases": [],
        "medications": [],
        "dates": [],
        "clinical_notes": "",
        "risk_indicators": [],
        "drug_interactions": [],
        "dosage_risks": [],
        "trends": [],
        "clinical_summary": {},
        "ai_summary": None,
        "ai_risk_explanation": None,
        "ai_recommendations": None,
        "counterfactual_insights": None,
        "extraction_confidence": 0.0,
        "errors": []
    }
    
    try:
        # Step 1: OCR Text Extraction
        logger.info(f"Starting OCR extraction for: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            result["status"] = "failed"
            result["errors"].append(f"File not found: {file_path}")
            return result
        
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext == ".pdf":
            raw_text = ocr_pipeline.extract_text_from_pdf(file_path)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".bmp"]:
            raw_text = ocr_pipeline.extract_text_from_image(file_path)
        else:
            # Try to read as text
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    raw_text = f.read()
            except:
                logger.error(f"Unsupported file type: {ext}")
                result["status"] = "failed"
                result["errors"].append(f"Unsupported file type: {ext}")
                return result
        
        if not raw_text:
            result["status"] = "failed"
            result["errors"].append("OCR failed to extract text from document")
            return result
        
        result["raw_text"] = raw_text
        logger.info(f"OCR extracted {len(raw_text)} characters")
        
        # Step 2: Extract Patient Info
        logger.info("Extracting patient information")
        result["patient_info"] = extract_patient_info(raw_text)
        if not patient_gender and result["patient_info"].get("gender"):
            patient_gender = result["patient_info"]["gender"]
        
        # Step 3: Structured Parsing (medical-grade extraction)
        logger.info("Running structured parsing")
        structured_data = parse_lab_text(raw_text)
        result["structured_data"] = structured_data
        
        # Calculate extraction confidence
        if structured_data:
            avg_confidence = sum(d.get("confidence", 0) for d in structured_data) / len(structured_data)
            result["extraction_confidence"] = round(avg_confidence, 2)
        
        logger.info(f"Structured parser found {len(structured_data)} lab values")
        
        # Step 4: Medical Validation
        logger.info("Running medical validation")
        validation_result = validate_report(structured_data, patient_gender)
        result["validation_result"] = validation_result
        
        # Step 5: NLP Entity Extraction
        logger.info("Starting NLP extraction")
        nlp_result = nlp_extractor.extract_all(raw_text)
        
        # Merge structured data with NLP lab values (prefer structured)
        if structured_data:
            result["lab_values"] = structured_data
        else:
            result["lab_values"] = nlp_result.get("lab_values", [])
        
        result["diseases"] = nlp_result.get("diseases", [])
        result["medications"] = nlp_result.get("medications", [])
        result["dates"] = nlp_result.get("dates", [])
        result["clinical_notes"] = nlp_result.get("clinical_notes", "")
        
        logger.info(f"Extraction found: {len(result['lab_values'])} lab values, "
                   f"{len(result['diseases'])} diseases, {len(result['medications'])} medications")
        
        # Step 6: Clinical Rule Engine Analysis
        logger.info("Running clinical analysis")
        clinical_result = analyze_clinical_data(
            lab_values=result["lab_values"],
            medications=result["medications"],
            previous_data=previous_data or []
        )
        
        result["risk_indicators"] = clinical_result.get("risk_indicators", [])
        result["drug_interactions"] = clinical_result.get("drug_interactions", [])
        result["dosage_risks"] = clinical_result.get("dosage_risks", [])
        result["trends"] = clinical_result.get("trends", [])
        result["clinical_summary"] = clinical_result.get("clinical_summary", {})
        
        # Add critical alerts from validation to risk indicators
        if validation_result.get("critical_alerts"):
            for alert in validation_result["critical_alerts"]:
                result["risk_indicators"].append({
                    "type": "critical_value",
                    "severity": "high",
                    "description": alert.get("message", "")
                })
        
        logger.info(f"Clinical analysis: {len(result['risk_indicators'])} risks, "
                   f"{len(result['drug_interactions'])} interactions")
        
        # Step 7: AI Reasoning (if API key available)
        if os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY"):
            logger.info("Generating AI insights")
            try:
                # Run async AI calls in sync context
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    ai_summary = loop.run_until_complete(
                        ai_service.generate_clinical_summary(result)
                    )
                    if ai_summary:
                        result["ai_summary"] = ai_summary
                    
                    # Get diagnostic reasoning if abnormal values
                    abnormal_count = len([v for v in result["lab_values"] 
                                         if v.get("status") in ["high", "low"]])
                    if abnormal_count > 0:
                        diagnostic = loop.run_until_complete(
                            ai_service.generate_diagnostic_reasoning(result)
                        )
                        if diagnostic:
                            result["ai_risk_explanation"] = diagnostic
                    
                    # Get counterfactual if risks exist
                    if result.get("risk_indicators") or result.get("drug_interactions"):
                        counterfactual = loop.run_until_complete(
                            ai_service.generate_counterfactual_insights(result)
                        )
                        if counterfactual:
                            result["counterfactual_insights"] = counterfactual
                finally:
                    loop.close()
            except Exception as ai_error:
                logger.error(f"AI analysis error: {str(ai_error)}")
                result["ai_summary"] = generate_rule_based_summary(result)
        else:
            logger.info("No AI API key configured - using rule-based summary")
            result["ai_summary"] = generate_rule_based_summary(result)
        
        result["status"] = "completed"
        logger.info("Extraction pipeline completed successfully")
        
    except Exception as e:
        logger.error(f"Extraction pipeline error: {str(e)}")
        result["status"] = "failed"
        result["errors"].append(str(e))
    
    return result
