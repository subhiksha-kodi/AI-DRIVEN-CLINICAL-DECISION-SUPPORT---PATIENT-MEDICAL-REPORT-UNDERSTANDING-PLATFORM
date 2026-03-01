/**
 * patient.analysis.controller.js - Medical document analysis using Groq API
 */
const fs = require('fs');
const path = require('path');
const PatientReport = require('../models/PatientReport');
const { translateAnalysisResults } = require('../services/translation.service');

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

// Medical analysis prompt
const ANALYSIS_PROMPT = `You will receive:
1) A handwritten prescription OR
2) A scanned lab report image.

Your task is to:

STEP 1 — Extract & Digitize:
- Extract all visible medical information.
- If any word is unclear, write [unclear] instead of guessing.
- Identify:
  • Medication name
  • Dosage
  • Frequency
  • Duration (if present)
  • Lab test names
  • Lab values
  • Units
  • Reference ranges (if visible)

STEP 2 — Clinical Interaction Analysis:
- Analyze possible drug-drug interactions if multiple medications are present.
- If interaction risk exists, classify as:
  • Mild
  • Moderate
  • Severe
- Mention guideline-based reasoning briefly.

STEP 3 — Risk Assessment:
- If lab values suggest cardiovascular or metabolic risk (lipids, BP, glucose, etc.),
  estimate cardiovascular risk level qualitatively.
- If enough data is present, provide approximate % risk estimate.
- If insufficient data, state: "Insufficient data for precise risk scoring."

STEP 4 — Generate Patient-Friendly Summary:
- Write a simple explanation (non-technical).
- Avoid medical jargon.
- Keep it under 80 words.
- Do NOT provide diagnosis.
- Do NOT provide treatment recommendation changes.

IMPORTANT SAFETY RULES:
- Never guess illegible handwriting.
- If information is missing, clearly state it.
- Do not invent lab values or medications.
- If uncertain, say "Unable to determine from image."
- This is decision-support, not final diagnosis.

Return your response in the following JSON format:
{
  "extraction": {
    "document_type": "prescription" | "lab_report" | "other",
    "medications": [
      {
        "name": "string",
        "dosage": "string",
        "frequency": "string",
        "duration": "string or null"
      }
    ],
    "lab_tests": [
      {
        "test_name": "string",
        "value": "string",
        "unit": "string",
        "reference_range": "string or null",
        "status": "normal" | "high" | "low" | "critical"
      }
    ],
    "other_findings": ["string"],
    "unclear_items": ["string"]
  },
  "interactions": {
    "has_interactions": true | false,
    "interactions": [
      {
        "drugs": ["drug1", "drug2"],
        "severity": "mild" | "moderate" | "severe",
        "description": "string",
        "guideline_reference": "string"
      }
    ]
  },
  "risk_assessment": {
    "cardiovascular_risk": "low" | "moderate" | "high" | "insufficient_data",
    "risk_percentage": "string or null",
    "risk_factors": ["string"],
    "notes": "string"
  },
  "patient_summary": "string (under 80 words, non-technical)",
  "analysis_confidence": "high" | "medium" | "low",
  "disclaimers": ["string"]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`;

/**
 * Call Groq API for medical document analysis
 */
const callGroqAPI = async (base64Data, mimeType, prompt = ANALYSIS_PROMPT) => {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  const requestBody = {
    model: GROQ_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert medical AI assistant specialized in analyzing handwritten prescriptions and lab reports. Return structured JSON responses only.'
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
        // Return a fallback structure
        return {
          raw_response: textContent,
          parse_error: true,
          extraction: {
            document_type: 'unknown',
            medications: [],
            lab_tests: [],
            other_findings: ['Failed to parse structured response'],
            unclear_items: [],
          },
          interactions: {
            has_interactions: false,
            interactions: []
          },
          risk_assessment: {
            cardiovascular_risk: 'insufficient_data',
            risk_percentage: null,
            risk_factors: [],
            notes: 'Unable to parse structured response'
          },
          patient_summary: textContent.substring(0, 500),
          analysis_confidence: 'low',
          disclaimers: ['Response could not be parsed into structured format'],
        };
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
 * Convert file to base64
 */
const fileToBase64 = (filePath) => {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
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
 * POST /api/patient/reports/:id/analyze
 * Analyze a patient report using Gemini AI
 */
const analyzeReport = async (req, res, next) => {
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
      // Get file as base64
      let base64Data;
      let mimeType = getMimeType(report.file_path);
      const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

      // Handle PDF files - convert first page to image
      if (mimeType === 'application/pdf') {
        console.log('Converting PDF to image...');
        try {
          const pdfImageBase64 = await pdfPageToImage(report.file_path, 0);
          base64Data = pdfImageBase64;
          mimeType = 'image/png'; // PDF pages are converted to PNG
          console.log('PDF converted to image successfully');
        } catch (pdfError) {
          console.error('PDF conversion failed:', pdfError);
          report.analysis_status = 'failed';
          report.analysis_result = {
            error: 'PDF conversion failed',
            message: 'Failed to convert PDF to image. Please ensure the PDF is not corrupted.',
          };
          await report.save();
          
          return res.status(400).json({
            success: false,
            message: 'Failed to process PDF file. Please try uploading an image file instead.',
          });
        }
      } else if (!supportedImageTypes.includes(mimeType)) {
        // Check if it's an image type that Groq can process
        report.analysis_status = 'failed';
        report.analysis_result = {
          error: 'Unsupported file type for image analysis',
          message: `File type ${mimeType} is not supported. Please upload an image file (JPEG, PNG, GIF, WebP, BMP) or PDF.`,
        };
        await report.save();
        
        return res.status(400).json({
          success: false,
          message: 'Unsupported file type. Please upload an image file (JPEG, PNG, GIF, WebP, BMP) or PDF.',
        });
      } else {
        // Regular image file
        base64Data = fileToBase64(report.file_path);
      }

      // Add language instruction to prompt if Tamil is requested
      let analysisPrompt = ANALYSIS_PROMPT;
      if (language === 'ta' || language === 'tamil') {
        analysisPrompt += '\n\nIMPORTANT LANGUAGE REQUIREMENT: Extract medication names, test names, and provide ALL text fields (patient_summary, descriptions, etc.) in Tamil (தமிழ்). Translate medical terms appropriately while maintaining accuracy. Keep numerical values and units unchanged.';
      }
      
      // Send to Groq for analysis
      let analysisResult = await callGroqAPI(base64Data, mimeType, analysisPrompt);
      
      // Translate to Tamil if requested (fallback translation for any missed fields)
      if (language === 'ta' || language === 'tamil') {
        console.log('Translating any remaining English fields to Tamil...');
        try {
          analysisResult = await translateAnalysisResults(analysisResult, 'ta', false);
          console.log('Translation completed successfully');
        } catch (translationError) {
          console.error('Translation failed, returning extracted version:', translationError);
          // Continue with extracted version if translation fails
        }
      }
      
      // Update report with analysis results
      report.analysis_status = 'completed';
      report.analysis_result = analysisResult;
      await report.save();

      return res.json({
        success: true,
        message: 'Analysis completed successfully.',
        data: {
          id: report.id,
          original_filename: report.original_filename,
          analysis_status: report.analysis_status,
          analysis_result: analysisResult,
          analyzed_at: new Date().toISOString(),
        },
      });

    } catch (aiError) {
      console.error('Groq AI error:', aiError);
      
      report.analysis_status = 'failed';
      report.analysis_result = {
        error: 'AI analysis failed',
        message: aiError.message || 'Unknown error during analysis',
      };
      await report.save();

      return res.status(500).json({
        success: false,
        message: 'AI analysis failed. Please try again later.',
        error: aiError.message,
      });
    }

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/reports/:id/analysis
 * Get the analysis result for a report
 */
const getAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;

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

    return res.json({
      success: true,
      data: {
        id: report.id,
        original_filename: report.original_filename,
        analysis_status: report.analysis_status,
        analysis_result: report.analysis_result,
        created_at: report.createdAt,
        updated_at: report.updatedAt,
      },
    });

  } catch (err) {
    next(err);
  }
};

module.exports = {
  analyzeReport,
  getAnalysis,
};
