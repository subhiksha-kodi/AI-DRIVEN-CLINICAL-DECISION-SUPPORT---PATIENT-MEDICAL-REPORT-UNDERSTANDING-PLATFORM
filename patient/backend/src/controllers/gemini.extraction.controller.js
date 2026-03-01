/**
 * extraction.ai.controller.js - GPT-4o Multimodal Analysis via OpenRouter
 * Uses GPT-4o for vision-based extraction of handwritten prescriptions and lab reports
 */
const EhrPatient = require('../models/EhrPatient');

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'openai/gpt-4o';

/**
 * Build the structured JSON schema for Gemini response
 */
const buildResponseSchema = () => ({
  type: 'object',
  properties: {
    parsedPrescription: {
      type: 'array',
      description: 'Array of medications extracted from the prescription',
      items: {
        type: 'object',
        properties: {
          medicationName: { type: 'string', description: 'Name of the medication' },
          dosage: { type: 'string', description: 'Dosage amount (e.g., 500mg)' },
          frequency: { type: 'string', description: 'How often to take (e.g., twice daily)' },
          duration: { type: 'string', description: 'Duration of treatment (e.g., 7 days)' },
          instructions: { type: 'string', description: 'Special instructions (e.g., take with food)' },
          confidence: { type: 'number', description: 'Confidence score 0-100' }
        },
        required: ['medicationName', 'dosage', 'frequency']
      }
    },
    parsedLabResults: {
      type: 'array',
      description: 'Array of lab test results extracted from reports',
      items: {
        type: 'object',
        properties: {
          testName: { type: 'string', description: 'Name of the lab test' },
          value: { type: 'string', description: 'Test result value' },
          unit: { type: 'string', description: 'Unit of measurement' },
          referenceRange: { type: 'string', description: 'Normal reference range' },
          status: { type: 'string', enum: ['NORMAL', 'HIGH', 'LOW', 'CRITICAL'], description: 'Status relative to normal range' }
        },
        required: ['testName', 'value']
      }
    },
    alerts: {
      type: 'array',
      description: 'Safety alerts and warnings',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['DRUG_INTERACTION', 'ALLERGY', 'CONTRAINDICATION', 'DOSAGE_WARNING', 'LAB_CRITICAL', 'DUPLICATE_THERAPY'], description: 'Type of alert' },
          severity: { type: 'string', enum: ['HIGH', 'MODERATE', 'LOW'], description: 'Severity of the alert' },
          title: { type: 'string', description: 'Short alert title' },
          description: { type: 'string', description: 'Detailed description of the alert' },
          recommendation: { type: 'string', description: 'Recommended action' }
        },
        required: ['type', 'severity', 'title', 'description']
      }
    },
    riskScores: {
      type: 'object',
      description: 'Calculated risk percentages',
      properties: {
        cardiovascularRisk: { type: 'number', description: 'Cardiovascular risk percentage 0-100' },
        diabetesRisk: { type: 'number', description: 'Diabetes risk percentage 0-100' },
        kidneyRisk: { type: 'number', description: 'Kidney disease risk percentage 0-100' },
        liverRisk: { type: 'number', description: 'Liver disease risk percentage 0-100' },
        drugInteractionRisk: { type: 'number', description: 'Drug interaction risk percentage 0-100' },
        overallRisk: { type: 'number', description: 'Overall health risk percentage 0-100' }
      }
    },
    patientSummary: {
      type: 'string',
      description: 'Human-readable summary of findings and clinical interpretation'
    },
    extractedText: {
      type: 'string',
      description: 'Raw text extracted from the handwritten document'
    },
    documentType: {
      type: 'string',
      enum: ['PRESCRIPTION', 'LAB_REPORT', 'MEDICAL_NOTE', 'UNKNOWN'],
      description: 'Type of document detected'
    },
    confidence: {
      type: 'number',
      description: 'Overall confidence in the extraction 0-100'
    }
  },
  required: ['parsedPrescription', 'alerts', 'riskScores', 'patientSummary', 'documentType']
});

/**
 * Build the clinical prompt for Gemini
 */
const buildClinicalPrompt = (ehrData) => {
  let ehrContext = '';
  
  if (ehrData) {
    ehrContext = `
EXISTING PATIENT EHR DATA:
- Patient ID: ${ehrData.patient_id}
- Age: ${ehrData.age || 'Unknown'}
- Gender: ${ehrData.gender || 'Unknown'}
- Chronic Conditions: ${ehrData.chronic_conditions || 0}
- Current Medications: ${ehrData.unique_medication_descriptions || 'None recorded'}
- Known Allergies: ${ehrData.total_allergies || 0} allergies on file
- Total Conditions: ${ehrData.total_conditions || 0}
- Recent ER Visits: ${ehrData.emergency_visits || 0}
- Total Procedures: ${ehrData.total_procedures || 0}
- Condition Codes: ${ehrData.unique_condition_codes || 'None'}
- Condition Descriptions: ${ehrData.unique_condition_descriptions || 'None'}
`;
  }

  return `You are an expert clinical decision support AI assistant specialized in:
1. Handwriting recognition for medical prescriptions
2. Lab report analysis and interpretation
3. Drug-drug interaction detection
4. Clinical risk assessment

TASK: Analyze the uploaded medical document image(s) and extract all relevant clinical information.

${ehrContext}

INSTRUCTIONS:
1. HANDWRITING RECOGNITION: Carefully identify each medication, dosage, and frequency from handwritten prescriptions. Pay attention to:
   - Doctor's handwriting quirks
   - Abbreviations (e.g., "bid" = twice daily, "qd" = once daily, "prn" = as needed)
   - Dosage notations (mg, ml, IU, etc.)

2. LAB RESULTS: For lab reports, extract:
   - Test names and values
   - Compare against standard reference ranges
   - Flag any critical values

3. DRUG INTERACTION CHECK: Compare new prescription medications against the existing EHR medications:
   - Identify potential drug-drug interactions
   - Check for duplicate therapies
   - Verify dosages are appropriate for patient age/conditions

4. RISK ASSESSMENT: Calculate risk scores based on:
   - Lab values (e.g., high glucose → diabetes risk)
   - Vital signs if present
   - Existing conditions combined with new findings
   - Age and demographic factors

5. SAFETY ALERTS: Generate alerts for:
   - HIGH severity: Life-threatening interactions, critical lab values, contraindications
   - MODERATE severity: Potential interactions requiring monitoring, borderline values
   - LOW severity: Minor concerns, informational notes

Return your analysis as valid JSON matching this structure:
{
  "parsedPrescription": [{"medicationName": "...", "dosage": "...", "frequency": "...", "duration": "...", "instructions": "...", "confidence": 0-100}],
  "parsedLabResults": [{"testName": "...", "value": "...", "unit": "...", "referenceRange": "...", "status": "NORMAL|HIGH|LOW|CRITICAL"}],
  "alerts": [{"type": "DRUG_INTERACTION|ALLERGY|CONTRAINDICATION|DOSAGE_WARNING|LAB_CRITICAL|DUPLICATE_THERAPY", "severity": "HIGH|MODERATE|LOW", "title": "...", "description": "...", "recommendation": "..."}],
  "riskScores": {"cardiovascularRisk": 0-100, "diabetesRisk": 0-100, "kidneyRisk": 0-100, "liverRisk": 0-100, "drugInteractionRisk": 0-100, "overallRisk": 0-100},
  "patientSummary": "Human-readable clinical summary...",
  "extractedText": "Raw text from document...",
  "documentType": "PRESCRIPTION|LAB_REPORT|MEDICAL_NOTE|UNKNOWN",
  "confidence": 0-100
}

IMPORTANT: Return ONLY valid JSON, no markdown code blocks or extra text.`;
};

/**
 * Call OpenRouter API with LLaMA 4 Scout multimodal input
 */
const callOpenRouterAPI = async (images, ehrData) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = buildClinicalPrompt(ehrData);
  
  // Build content array with text and images for OpenRouter format
  const content = [
    { type: 'text', text: prompt }
  ];
  
  // Add each image in OpenRouter/OpenAI format
  for (const image of images) {
    let base64Data = image.base64;
    let mimeType = image.mimeType || 'image/jpeg';
    
    // Handle data URL format
    if (base64Data.includes(',')) {
      const parts = base64Data.split(',');
      base64Data = parts[1];
      const mimeMatch = parts[0].match(/data:([^;]+);/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }
    
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${base64Data}`
      }
    });
  }

  const requestBody = {
    model: AI_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert clinical decision support AI. Analyze medical documents and return structured JSON responses. Never include markdown code blocks in your response.'
      },
      {
        role: 'user',
        content: content
      }
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  };

  // Retry logic for network issues
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000); // 90 second timeout

      console.log(`OpenRouter API call attempt ${attempt} with model: ${AI_MODEL}`);
      
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'ClinicalIQ Document Extraction'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenRouter API Error:', errorData);
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Extract the response content
      const textContent = data.choices?.[0]?.message?.content;
      
      if (!textContent) {
        throw new Error('No response from OpenRouter API');
      }

      console.log('OpenRouter response received, parsing JSON...');
      
      // Parse response - handle potential markdown code blocks
      let jsonText = textContent.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse OpenRouter response:', textContent);
        // Return a fallback structure
        return {
          parsedPrescription: [],
          parsedLabResults: [],
          alerts: [{
            type: 'LAB_CRITICAL',
            severity: 'MODERATE',
            title: 'Parse Warning',
            description: 'AI response could not be fully parsed. Raw extraction included.',
            recommendation: 'Review extracted text manually.'
          }],
          riskScores: {
            cardiovascularRisk: 0,
            diabetesRisk: 0,
            kidneyRisk: 0,
            liverRisk: 0,
            drugInteractionRisk: 0,
            overallRisk: 0
          },
          patientSummary: textContent,
          extractedText: textContent,
          documentType: 'UNKNOWN',
          confidence: 50
        };
      }
    } catch (error) {
      lastError = error;
      console.error(`OpenRouter API attempt ${attempt} failed:`, error.message);
      if (attempt < 3 && (error.code === 'ETIMEDOUT' || error.name === 'AbortError' || error.message.includes('fetch failed'))) {
        console.log(`Retrying in ${attempt * 2} seconds...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

/**
 * POST /api/doctor/ehr/extract-analyze
 * Extract and analyze uploaded medical documents
 */
const extractAndAnalyzeDocument = async (req, res, next) => {
  try {
    const { patient_id, images } = req.body;

    // Validate input
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required for analysis.'
      });
    }

    if (images.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per analysis.'
      });
    }

    // Validate image format
    for (const img of images) {
      if (!img.base64) {
        return res.status(400).json({
          success: false,
          message: 'Each image must have a base64 encoded string.'
        });
      }
    }

    // Get patient EHR data if patient_id is provided
    let ehrData = null;
    if (patient_id) {
      ehrData = await EhrPatient.findOne({
        where: { patient_id: patient_id.toString() }
      });
    }

    // Call OpenRouter API with LLaMA 4 Scout
    const analysisResult = await callOpenRouterAPI(images, ehrData);

    // Add metadata
    const response = {
      success: true,
      data: {
        ...analysisResult,
        patient_id: patient_id || null,
        analyzed_at: new Date().toISOString(),
        image_count: images.length,
        ehr_context_used: !!ehrData
      }
    };

    return res.json(response);

  } catch (err) {
    console.error('Extract and Analyze Error:', err);
    
    // Return appropriate error response
    if (err.message.includes('OpenRouter API') || err.message.includes('API')) {
      return res.status(502).json({
        success: false,
        message: 'AI analysis service temporarily unavailable. Please try again.',
        error: err.message
      });
    }

    next(err);
  }
};

/**
 * POST /api/doctor/ehr/quick-analyze
 * Quick analysis without patient context
 */
const quickAnalyzeDocument = async (req, res, next) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image is required.'
      });
    }

    // Call OpenRouter without EHR context
    const analysisResult = await callOpenRouterAPI(images, null);

    return res.json({
      success: true,
      data: {
        ...analysisResult,
        analyzed_at: new Date().toISOString(),
        image_count: images.length,
        ehr_context_used: false
      }
    });

  } catch (err) {
    console.error('Quick Analyze Error:', err);
    next(err);
  }
};

module.exports = {
  extractAndAnalyzeDocument,
  quickAnalyzeDocument
};
