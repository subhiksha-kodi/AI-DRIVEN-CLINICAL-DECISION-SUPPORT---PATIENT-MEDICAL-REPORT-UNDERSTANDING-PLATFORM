"""
AI Reasoning Service
Integration with OpenRouter/OpenAI for clinical reasoning and insights
"""

import os
import logging
import json
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)


# Default prompts
CLINICAL_SUMMARY_PROMPT = """You are an expert clinical assistant helping doctors interpret lab reports. 
Based on the extracted data, provide a concise clinical summary.

Patient Information:
{patient_info}

Lab Values:
{lab_values}

Medications:
{medications}

Diseases/Conditions Found:
{diseases}

Risk Indicators:
{risk_indicators}

Drug Interactions:
{drug_interactions}

Clinical Summary from Rules Engine:
{clinical_summary}

Please provide:
1. A brief clinical interpretation (2-3 sentences)
2. Key points requiring attention
3. Any additional considerations the doctor should be aware of

Keep your response professional and concise."""


DIAGNOSTIC_REASONING_PROMPT = """You are an expert clinical reasoning assistant.
Based on the lab findings, suggest possible underlying conditions that may explain the abnormal values.

Abnormal Lab Values:
{abnormal_values}

Patient's Known Conditions:
{known_conditions}

Current Medications:
{medications}

Please provide:
1. Possible diagnoses or conditions that could explain these findings
2. Recommended follow-up tests if any
3. Any red flags that need immediate attention

Note: This is for clinical decision support only. Final diagnosis is the physician's responsibility."""


COUNTERFACTUAL_PROMPT = """Analyze the patient data and provide counterfactual insights.
This helps doctors understand "what if" scenarios.

Current Lab Values:
{lab_values}

Current Medications:
{medications}

Identified Risks:
{risks}

Please analyze:
1. What would likely happen if no intervention is made?
2. What specific changes could improve the patient's markers?
3. Which values are most critical to address first and why?

Keep insights practical and evidence-based."""


class AIService:
    """Service for AI-powered clinical reasoning"""
    
    def __init__(self):
        # Try OpenRouter first, then OpenAI
        self.api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.use_openrouter = bool(os.getenv("OPENROUTER_API_KEY"))
        
        if self.use_openrouter:
            self.base_url = "https://openrouter.ai/api/v1"
            self.model = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3-haiku")
        else:
            self.base_url = "https://api.openai.com/v1"
            self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        self.timeout = 30.0
    
    async def _call_api(self, messages: List[Dict], max_tokens: int = 1000) -> Optional[str]:
        """Make API call to OpenRouter or OpenAI"""
        if not self.api_key:
            logger.warning("No API key configured for AI service")
            return None
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if self.use_openrouter:
            headers["HTTP-Referer"] = "http://localhost:3000"
            headers["X-Title"] = "Medical Report Analysis"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.3  # Lower temperature for more focused clinical responses
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"AI API call failed: {str(e)}")
            return None
    
    async def generate_clinical_summary(self, extracted_data: Dict) -> Optional[str]:
        """Generate AI-powered clinical summary"""
        
        prompt = CLINICAL_SUMMARY_PROMPT.format(
            patient_info=self._format_patient_info(extracted_data),
            lab_values=self._format_lab_values(extracted_data.get("lab_values", [])),
            medications=self._format_medications(extracted_data.get("medications", [])),
            diseases=self._format_diseases(extracted_data.get("diseases", [])),
            risk_indicators=self._format_risks(extracted_data.get("risk_indicators", [])),
            drug_interactions=self._format_interactions(extracted_data.get("drug_interactions", [])),
            clinical_summary=json.dumps(extracted_data.get("clinical_summary", {}), indent=2)
        )
        
        messages = [
            {"role": "system", "content": "You are a clinical decision support assistant helping doctors interpret medical reports."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_api(messages)
    
    async def generate_diagnostic_reasoning(self, extracted_data: Dict) -> Optional[str]:
        """Generate diagnostic reasoning suggestions"""
        
        # Get only abnormal values
        abnormal = [v for v in extracted_data.get("lab_values", []) 
                   if v.get("status") in ["high", "low"]]
        
        prompt = DIAGNOSTIC_REASONING_PROMPT.format(
            abnormal_values=self._format_lab_values(abnormal),
            known_conditions=self._format_diseases(extracted_data.get("diseases", [])),
            medications=self._format_medications(extracted_data.get("medications", []))
        )
        
        messages = [
            {"role": "system", "content": "You are a clinical reasoning assistant. Provide evidence-based diagnostic suggestions."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_api(messages, max_tokens=1200)
    
    async def generate_counterfactual_insights(self, extracted_data: Dict) -> Optional[str]:
        """Generate counterfactual analysis"""
        
        risks = extracted_data.get("risk_indicators", []) + extracted_data.get("dosage_risks", [])
        
        prompt = COUNTERFACTUAL_PROMPT.format(
            lab_values=self._format_lab_values(extracted_data.get("lab_values", [])),
            medications=self._format_medications(extracted_data.get("medications", [])),
            risks=json.dumps(risks, indent=2)
        )
        
        messages = [
            {"role": "system", "content": "You are a clinical analyst providing counterfactual scenario analysis."},
            {"role": "user", "content": prompt}
        ]
        
        return await self._call_api(messages, max_tokens=1000)
    
    def _format_patient_info(self, data: Dict) -> str:
        """Format patient info for prompt"""
        info = data.get("patient_info", {})
        if not info:
            return "No patient information available"
        return f"Name: {info.get('name', 'N/A')}, Age: {info.get('age', 'N/A')}"
    
    def _format_lab_values(self, values: List) -> str:
        """Format lab values for prompt"""
        if not values:
            return "No lab values"
        lines = []
        for v in values:
            status = f" ({v['status'].upper()})" if v.get('status') in ['high', 'low'] else ""
            lines.append(f"- {v['name']}: {v['value']} {v.get('unit', '')}{status}")
        return "\n".join(lines)
    
    def _format_medications(self, meds: List) -> str:
        """Format medications for prompt"""
        if not meds:
            return "No medications listed"
        lines = []
        for m in meds:
            dosage = f" {m['dosage']}" if m.get('dosage') else ""
            freq = f" {m['frequency']}" if m.get('frequency') else ""
            lines.append(f"- {m['name']}{dosage}{freq}")
        return "\n".join(lines)
    
    def _format_diseases(self, diseases: List) -> str:
        """Format diseases for prompt"""
        if not diseases:
            return "No conditions noted"
        return "\n".join(f"- {d['name']}" for d in diseases)
    
    def _format_risks(self, risks: List) -> str:
        """Format risk indicators for prompt"""
        if not risks:
            return "No significant risks identified"
        lines = []
        for r in risks:
            lines.append(f"- {r['marker']}: {r['interpretation']} (Severity: {r['severity']})")
        return "\n".join(lines)
    
    def _format_interactions(self, interactions: List) -> str:
        """Format drug interactions for prompt"""
        if not interactions:
            return "No drug interactions detected"
        lines = []
        for i in interactions:
            lines.append(f"- {i['drug1']} + {i['drug2']}: {i['description']}")
        return "\n".join(lines)


# Fallback function when AI is not available
def generate_rule_based_summary(extracted_data: Dict) -> str:
    """Generate a basic summary without AI when API is unavailable"""
    
    summary = extracted_data.get("clinical_summary", {})
    risk_level = summary.get("overall_risk", "unknown")
    
    lines = []
    lines.append(f"Overall Risk Level: {risk_level.upper()}")
    
    if summary.get("key_findings"):
        lines.append("\nKey Findings:")
        for finding in summary["key_findings"]:
            lines.append(f"• {finding}")
    
    if extracted_data.get("drug_interactions"):
        lines.append("\nDrug Interactions Detected:")
        for interaction in extracted_data["drug_interactions"]:
            lines.append(f"• {interaction['drug1']} + {interaction['drug2']}: {interaction['description']}")
    
    if summary.get("requires_attention"):
        lines.append("\n⚠️ This report requires physician attention.")
    
    return "\n".join(lines)


# Create singleton instance
ai_service = AIService()
