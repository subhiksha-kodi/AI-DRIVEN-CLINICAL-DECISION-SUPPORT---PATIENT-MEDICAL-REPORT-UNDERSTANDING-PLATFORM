/**
 * patient.enhanced.analysis.controller.js - Enhanced medical document analysis with type detection
 */
const fs = require('fs');
const path = require('path');
const PatientReport = require('../models/PatientReport');
const { translateAnalysisResults } = require('../services/translation.service');

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

// Document type detection prompt
const DOCUMENT_TYPE_DETECTION_PROMPT = `You are an expert medical document classifier. Analyze the provided image and determine if it is:

1. A handwritten prescription
2. A scanned lab/medical report
3. Other medical document

Look for these characteristics:
- Handwritten prescription: handwritten text, medication names, dosage instructions, doctor's signature, Rx symbol
- Scanned lab report: printed tables, test names, numerical values, reference ranges, lab name/logo
- Other: medical documents that don't fit the above categories

Return your response in this JSON format:
{
  "document_type": "handwritten_prescription" | "scanned_report" | "other",
  "confidence_score": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why you classified it this way"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`;

// Handwritten prescription analysis prompt
const HANDWRITTEN_PRESCRIPTION_PROMPT = `You are analyzing a handwritten prescription. Extract ALL visible information and structure it according to this exact JSON format:

{
  "doctor_details": {
    "name": "",
    "qualification": "",
    "registration_number": "",
    "hospital_or_clinic": "",
    "contact": ""
  },
  "patient_details": {
    "name": "",
    "age": "",
    "date_of_birth": "",
    "gender": "",
    "weight_kg": "",
    "height_cm": "",
    "blood_group": ""
  },
  "vitals": {
    "temperature": ""
  },
  "prescription_details": {
    "date": "",
    "diagnosis": "",
    "chief_complaint": "",
    "notes": ""
  },
  "medications": [
    {
      "medicine_name": "",
      "strength": "",
      "dosage": "",
      "dosage_calculation_basis": "",
      "frequency": "",
      "duration": "",
      "route": "",
      "instructions": ""
    }
  ],
  "investigations": [],
  "follow_up": "",
  "lifestyle_advice": "",
  "additional_notes": "",
  "raw_text": "",
  "confidence_score": ""
}

IMPORTANT RULES:
- If any information is unclear or not visible, leave the field as empty string ""
- For medications, extract each one as a separate object in the medications array
- Include all visible text in the raw_text field
- Set confidence_score based on clarity of handwriting
- Return ONLY valid JSON, no markdown formatting or code blocks`;

// Scanned report analysis prompt
const SCANNED_REPORT_PROMPT = `You are analyzing a scanned lab/medical report. Extract ALL visible information and structure it according to this exact JSON format:

{
  "patient_details": {
    "name": "",
    "age": "",
    "gender": "",
    "patient_id": "",
    "date_of_birth": "",
    "weight_kg": "",
    "height_cm": ""
  },
  "lab_details": {
    "lab_name": "",
    "lab_address": "",
    "report_id": "",
    "report_date": "",
    "sample_collection_date": "",
    "doctor_name": ""
  },
  "test_results": [
    {
      "test_name": "",
      "test_category": "",
      "result_value": "",
      "unit": "",
      "reference_range": "",
      "status": "",
      "interpretation": ""
    }
  ],
  "overall_summary": "",
  "critical_flags": [],
  "recommendations": "",
  "raw_text": "",
  "confidence_score": ""
}

IMPORTANT RULES:
- If any information is unclear or not visible, leave the field as empty string ""
- For lab_details: Always extract report_date and/or sample_collection_date from the document when visible (look for "Report Date", "Date of Report", "Collection Date", "Sample Date", "Date", etc.). Use the exact date shown (e.g. 15-Jan-2025, 15/01/2025, 2025-01-15). These dates are required for trend analysis.
- For test_results, extract each test as a separate object with all available details
- Include all visible text in the raw_text field
- Set confidence_score based on clarity and completeness of the report
- Return ONLY valid JSON, no markdown formatting or code blocks`;

// OpenRouter Clinical Analysis Prompts
const HANDWRITTEN_PRESCRIPTION_CLINICAL_ANALYSIS_PROMPT = `You are a clinical pharmacist and medical doctor analyzing a handwritten prescription. Based on the extracted prescription data, provide a comprehensive clinical analysis using this exact JSON format only (no other top-level keys):

{
  "medication_analysis": [
    {
      "medicine_name": "",
      "drug_class": "",
      "purpose": "",
      "how_it_works": "",
      "why_prescribed_for_this_case": "",
      "condition_treated": "",
      "dosage_instructions": "",
      "duration": "",
      "benefits_if_taken_properly": "",
      "what_happens_if_not_taken": "",
      "what_happens_if_stopped_early": "",
      "what_happens_if_overdosed": "",
      "common_side_effects": [],
      "serious_side_effects": [],
      "important_warnings": [],
      "drug_interactions": [],
      "interaction_risks": [],
      "patient_friendly_explanation": ""
    }
  ],
  "diet_chart": [
    {
      "item": "",
      "value": 0,
      "unit": "",
      "reason": ""
    }
  ],
  "overall_clinical_summary": ""
}

ANALYSIS GUIDELINES:
1. medication_analysis: For each medication in the prescription, provide comprehensive analysis:
   - medicine_name: Name of the medication
   - drug_class: Pharmacological class (e.g., ACE inhibitor, beta-blocker, antibiotic)
   - purpose: What the medication is used for
   - how_it_works: Mechanism of action in simple terms
   - why_prescribed_for_this_case: Why this specific medication was chosen for this patient's condition
   - condition_treated: The specific condition this medication treats
   - dosage_instructions: How to take the medication (frequency, timing, with/without food)
   - duration: How long to take the medication
   - benefits_if_taken_properly: Benefits of taking medication as prescribed
   - what_happens_if_not_taken: Consequences of not taking the medication
   - what_happens_if_stopped_early: Risks of stopping medication prematurely
   - what_happens_if_overdosed: Symptoms and risks of overdose
   - common_side_effects: Array of common side effects
   - serious_side_effects: Array of serious side effects requiring immediate medical attention
   - important_warnings: Array of critical warnings (allergies, contraindications, etc.)
   - drug_interactions: Array of medications that interact with this drug
   - interaction_risks: Array of risks from drug interactions
   - patient_friendly_explanation: Simple, non-technical explanation for the patient
2. diet_chart: Provide a personalized daily diet chart as an array of objects.
   - item: The food or drink item (e.g., "Water", "Spinach", "Whole Grains")
   - value: Numeric value for the pie chart representation (relative importance or portion size)
   - unit: Measurement unit (e.g., "liters", "servings", "grams")
   - reason: Why this item is recommended (e.g., "To manage blood pressure", "To counter side effects of medication")
3. overall_clinical_summary: Provide a concise clinical overview of the prescription and patient care.

IMPORTANT: Return ONLY valid JSON with exactly these three keys: medication_analysis, diet_chart, and overall_clinical_summary. No markdown formatting or code blocks.`;

const SCANNED_REPORT_CLINICAL_ANALYSIS_PROMPT = `You are a clinical pathologist and medical doctor analyzing a lab report. Based on the extracted lab data, provide clinical interpretation using this exact JSON format only (no other top-level keys):

{
  "patient_details": {
    "name": "",
    "age": "",
    "gender": ""
  },
  "analysis_summary": {
    "total_tests": "",
    "normal": "",
    "high": "",
    "low": "",
    "overall_health_risk": ""
  },
  "parameters": [
    {
      "test_name": "",
      "value": "",
      "unit": "",
      "reference_range": "",
      "status": "",
      "severity": "",
      "clinical_meaning": "",
      "possible_symptoms": [],
      "recommended_actions": []
    }
  ],
  "diet_chart": [
    {
      "item": "",
      "value": 0,
      "unit": "",
      "reason": ""
    }
  ]
}

ANALYSIS GUIDELINES:
1. patient_details: Extract or infer patient name, age, and gender from the report where visible.
2. analysis_summary: total_tests = total number of parameters; normal = count of normal results; high = count above reference; low = count below reference; overall_health_risk = brief assessment (e.g. "Low", "Moderate", "High").
3. parameters: One object per test/parameter. Include test_name, value, unit, reference_range, status (Normal/High/Low/Critical), severity if applicable, clinical_meaning (what the result implies), possible_symptoms as array of strings (e.g. "Fatigue", "Dizziness"), recommended_actions as array of strings (e.g. "Increase iron-rich foods.", "Check Vitamin B12 levels.").
4. diet_chart: Provide a personalized daily diet chart based on the lab values. Provide at least 5-6 diverse items.
   - item: The food or drink item (e.g., "Water", "Lean Protein", "Green Leafy Vegetables")
   - value: Numeric value for the pie chart representation (relative portion or importance)
   - unit: Measurement unit (e.g., "liters", "portions", "grams")
   - reason: Why this item is recommended based on SPECIFIC abnormal lab values (e.g., "To lower cholesterol levels", "To improve hemoglobin")

IMPORTANT: Return ONLY valid JSON with exactly these keys: patient_details, analysis_summary, parameters, diet_chart. No markdown formatting or code blocks.`;

/**
 * Call OpenRouter API for clinical analysis
 */
const callOpenRouterAPI = async (extractedData, documentType, languageInstruction = '') => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const clinicalPrompt = documentType === 'handwritten_prescription'
    ? HANDWRITTEN_PRESCRIPTION_CLINICAL_ANALYSIS_PROMPT
    : SCANNED_REPORT_CLINICAL_ANALYSIS_PROMPT;

  const requestBody = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert medical professional providing clinical analysis. Return structured JSON responses only.'
      },
      {
        role: 'user',
        content: `Based on this extracted medical data, provide clinical analysis:\n\n${JSON.stringify(extractedData, null, 2)}\n\n${clinicalPrompt}${languageInstruction}`
      }
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  };

  // Retry logic for network issues
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 120 second timeout

      console.log(`OpenRouter API call attempt ${attempt} with model: ${OPENROUTER_MODEL}`);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Clinical Intelligence Platform',
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
        throw new Error('Failed to parse clinical analysis response as JSON');
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
 * Call Groq API for document analysis
 */
const callGroqAPI = async (base64Data, mimeType, prompt) => {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  const requestBody = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert medical AI assistant specialized in analyzing medical documents. Return structured JSON responses only.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Data}`
            }
          }
        ]
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

      console.log(`Groq API call attempt ${attempt} with model: ${GROQ_MODEL}`);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq API Error:', errorData);
        throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      // Extract the response content
      const textContent = data.choices?.[0]?.message?.content;

      if (!textContent) {
        throw new Error('No response from Groq API');
      }

      console.log('Groq response received, parsing JSON...');

      // Parse response - handle potential markdown code blocks
      let jsonText = textContent.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse Groq response:', textContent);
        throw new Error('Failed to parse AI response as JSON');
      }
    } catch (error) {
      lastError = error;
      console.error(`Groq API attempt ${attempt} failed:`, error.message);
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
 * Call Groq API for text-based clinical analysis (fallback when OpenRouter fails)
 */
const callGroqTextAPI = async (extractedData, documentType, languageInstruction = '') => {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  const clinicalPrompt = documentType === 'handwritten_prescription'
    ? HANDWRITTEN_PRESCRIPTION_CLINICAL_ANALYSIS_PROMPT
    : SCANNED_REPORT_CLINICAL_ANALYSIS_PROMPT;

  const requestBody = {
    model: 'llama-3.3-70b-versatile', // Use text-only model for clinical analysis
    messages: [
      {
        role: 'system',
        content: 'You are an expert medical professional providing clinical analysis. Return structured JSON responses only.'
      },
      {
        role: 'user',
        content: `Based on this extracted medical data, provide clinical analysis:\n\n${JSON.stringify(extractedData, null, 2)}\n\n${clinicalPrompt}${languageInstruction}`
      }
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' }
  };

  // Retry logic for network issues
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);

      console.log(`Groq Text API call attempt ${attempt} for clinical analysis`);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Groq Text API Error:', errorData);
        throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content;

      if (!textContent) {
        throw new Error('No response from Groq API');
      }

      console.log('Groq clinical analysis response received, parsing JSON...');

      let jsonText = textContent.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      try {
        return JSON.parse(jsonText);
      } catch (e) {
        console.error('Failed to parse Groq clinical response:', textContent);
        throw new Error('Failed to parse clinical analysis response as JSON');
      }
    } catch (error) {
      lastError = error;
      console.error(`Groq Text API attempt ${attempt} failed:`, error.message);
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
 * Convert file to base64
 */
const fileToBase64 = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
};

/**
 * Convert PDF first page to base64 image via Python extraction service
 */
const pdfPageToImage = async (filePath, pageNum = 0) => {
  const { execSync } = require('child_process');
  const scriptPath = path.join(__dirname, '../../extraction-service/extract.py');
  const pythonPath = process.env.PYTHON_PATH || 'python3';
  try {
    const output = execSync(
      `"${pythonPath}" "${scriptPath}" page_to_image "${filePath.replace(/"/g, '\\"')}" ${pageNum}`,
      { maxBuffer: 20 * 1024 * 1024, encoding: 'utf8' }
    );
    const result = JSON.parse(output);
    if (result.error) throw new Error(result.error);
    return result.image || result;
  } catch (err) {
    console.error('pdfPageToImage failed:', err.message);
    throw err;
  }
};

/**
 * Get MIME type from file extension
 */
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.bmp': 'image/bmp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Run full document analysis (detect type, extract, clinical) on a file path.
 * Used by both PatientReport enhanced-analyze and admin Report (lab reports) extract-analyze.
 * @param {string} filePath - Absolute or relative path to file (for Report use absolute)
 * @param {string} language - 'en' or 'ta'
 * @returns {Promise<{ extractedData, clinicalAnalysis, typeDetection }>}
 */
const runAnalysisForFilePath = async (filePath, language = 'en') => {
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '../../', filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error('File not found on server.');
  }
  let base64Data;
  let mimeType = getMimeType(resolvedPath);
  const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

  if (mimeType === 'application/pdf') {
    base64Data = await pdfPageToImage(resolvedPath, 0);
    mimeType = 'image/png';
  } else if (supportedImageTypes.includes(mimeType)) {
    base64Data = fileToBase64(resolvedPath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const typeDetection = await callGroqAPI(base64Data, mimeType, DOCUMENT_TYPE_DETECTION_PROMPT);
  const languageInstruction = (language === 'ta' || language === 'tamil')
    ? '\n\nIMPORTANT LANGUAGE REQUIREMENT: Extract and return ALL text fields in Tamil (தமிழ்). Keep numerical values and units unchanged.'
    : '';
  const analysisPrompt = (typeDetection.document_type === 'handwritten_prescription' ? HANDWRITTEN_PRESCRIPTION_PROMPT : SCANNED_REPORT_PROMPT) + languageInstruction;
  const extractedData = await callGroqAPI(base64Data, mimeType, analysisPrompt);
  const clinicalLanguageInstruction = (language === 'ta' || language === 'tamil')
    ? '\n\nIMPORTANT: Provide ALL text in Tamil (தமிழ்).'
    : '';
  let clinicalAnalysis;
  try {
    clinicalAnalysis = await callOpenRouterAPI(extractedData, typeDetection.document_type, clinicalLanguageInstruction);
  } catch (e) {
    clinicalAnalysis = await callGroqTextAPI(extractedData, typeDetection.document_type, clinicalLanguageInstruction);
  }
  return { extractedData, clinicalAnalysis, typeDetection };
};

/**
 * POST /api/patient/reports/:id/enhanced-analyze
 * Enhanced analysis with automatic document type detection
 */
const enhancedAnalyzeReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { language = 'en' } = req.query; // Get language from query param (ta for Tamil, en for English)

    // Find the report
    const report = await PatientReport.findOne({
      where: {
        id,
        patient_id: req.patient.id,
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    // Check if file exists
    if (!fs.existsSync(report.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server.',
      });
    }

    // Update status to processing
    report.analysis_status = 'processing';
    await report.save();

    try {
      console.log('Running document analysis for file:', report.file_path);
      const { extractedData, clinicalAnalysis, typeDetection } = await runAnalysisForFilePath(report.file_path, language);
      const clinicalModel = OPENROUTER_MODEL;

      // Combine both results
      let finalResult = {
        ...extractedData,
        clinical_analysis: clinicalAnalysis,
        document_detection: typeDetection,
        analysis_metadata: {
          extraction_model: GROQ_MODEL,
          clinical_model: clinicalModel,
          analysis_timestamp: new Date().toISOString(),
          two_stage_analysis: true,
          language: language
        }
      };

      // Translate to Tamil if requested
      if (language === 'ta' || language === 'tamil') {
        console.log('Translating analysis results to Tamil...');
        try {
          finalResult = await translateAnalysisResults(finalResult, 'ta', false); // false = use OpenRouter, true = use Google
          console.log('Translation completed successfully');
        } catch (translationError) {
          console.error('Translation failed, returning English version:', translationError);
          // Continue with English version if translation fails
        }
      }

      // Update report with analysis results
      report.analysis_status = 'completed';
      report.analysis_result = finalResult;
      await report.save();

      return res.json({
        success: true,
        message: 'Enhanced analysis completed successfully.',
        data: {
          id: report.id,
          original_filename: report.original_filename,
          document_type: typeDetection.document_type,
          analysis_status: report.analysis_status,
          analysis_result: finalResult,
          analyzed_at: new Date().toISOString(),
        },
      });

    } catch (aiError) {
      console.error('Enhanced analysis error:', aiError);

      report.analysis_status = 'failed';
      report.analysis_result = {
        error: 'Enhanced AI analysis failed',
        message: aiError.message || 'Unknown error during analysis',
      };
      await report.save();

      return res.status(500).json({
        success: false,
        message: 'Enhanced AI analysis failed. Please try again later.',
        error: aiError.message,
      });
    }

  } catch (err) {
    next(err);
  }
};

module.exports = {
  enhancedAnalyzeReport,
  runAnalysisForFilePath,
};
