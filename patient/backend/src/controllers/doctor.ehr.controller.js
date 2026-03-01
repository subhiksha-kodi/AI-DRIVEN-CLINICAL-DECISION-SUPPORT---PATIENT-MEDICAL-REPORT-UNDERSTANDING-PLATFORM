/**
 * doctor.ehr.controller.js - Doctor EHR Analysis with OpenRouter GPT-4o
 */
const EhrPatient = require('../models/EhrPatient');

/**
 * Calculate risk level based on patient data
 * @param {Object} patient - Patient data
 * @returns {string} - Risk level: HIGH, MODERATE, LOW
 */
const calculateRiskLevel = (patient) => {
  const age = patient.age || 0;
  const chronicConditions = patient.chronic_conditions || 0;
  const emergencyVisits = patient.emergency_visits || 0;
  const totalMedications = patient.total_medications || 0;

  // High Risk criteria
  if (
    age > 65 &&
    chronicConditions >= 3 &&
    emergencyVisits >= 2 &&
    totalMedications >= 5
  ) {
    return 'HIGH';
  }

  // Check for high risk with partial criteria
  let highRiskScore = 0;
  if (age > 65) highRiskScore++;
  if (chronicConditions >= 3) highRiskScore++;
  if (emergencyVisits >= 2) highRiskScore++;
  if (totalMedications >= 5) highRiskScore++;

  if (highRiskScore >= 3) {
    return 'HIGH';
  }

  // Moderate Risk criteria
  if (
    (chronicConditions >= 1 && chronicConditions <= 2) ||
    emergencyVisits === 1 ||
    (totalMedications >= 3 && totalMedications <= 4)
  ) {
    return 'MODERATE';
  }

  // Low Risk
  return 'LOW';
};

/**
 * Build clinical summary object for GPT analysis
 * @param {Object} patient - Patient data
 * @param {string} riskLevel - Calculated risk level
 * @returns {Object} - Clinical summary
 */
const buildClinicalSummary = (patient, riskLevel) => {
  return {
    patient_id: patient.patient_id,
    age: patient.age,
    gender: patient.gender,
    race: patient.race,
    ethnicity: patient.ethnicity,
    marital_status: patient.marital_status,
    location: {
      city: patient.city,
      state: patient.state,
      zip: patient.zip,
    },
    financial: {
      income: patient.income,
      healthcare_expenses: patient.healthcare_expenses,
      healthcare_coverage: patient.healthcare_coverage,
    },
    encounters: {
      total_encounters: patient.total_encounters,
      emergency_visits: patient.emergency_visits,
      inpatient_visits: patient.inpatient_visits,
      outpatient_visits: patient.outpatient_visits,
      wellness_visits: patient.wellness_visits,
      ambulatory_visits: patient.ambulatory_visits,
    },
    conditions: {
      total_conditions: patient.total_conditions,
      chronic_conditions: patient.chronic_conditions,
      unique_condition_codes: patient.unique_condition_codes,
      unique_condition_descriptions: patient.unique_condition_descriptions,
    },
    medications: {
      total_medications: patient.total_medications,
      unique_medications: patient.unique_medications,
      unique_medication_descriptions: patient.unique_medication_descriptions,
      total_dispenses: patient.total_dispenses,
    },
    procedures_and_care: {
      total_procedures: patient.total_procedures,
      total_allergies: patient.total_allergies,
      total_observations: patient.total_observations,
      total_imaging_studies: patient.total_imaging_studies,
      total_immunizations: patient.total_immunizations,
      total_careplans: patient.total_careplans,
      total_supplies: patient.total_supplies,
      total_devices: patient.total_devices,
    },
    costs: {
      total_encounter_costs: patient.total_encounter_costs,
      total_medication_costs: patient.total_medication_costs,
      total_payer_coverage_encounters: patient.total_payer_coverage_encounters,
      total_payer_coverage_medications: patient.total_payer_coverage_medications,
    },
    risk_level: riskLevel,
  };
};

/**
 * Call OpenRouter GPT-4o for clinical analysis
 * @param {Object} clinicalSummary - Patient clinical summary
 * @returns {string} - AI generated analysis
 */
const getGptAnalysis = async (clinicalSummary) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const prompt = `You are a clinical decision support assistant helping doctors understand patient health data.

Based STRICTLY on the structured patient data below, generate a comprehensive clinical summary in the following format. Do NOT invent or assume any data not provided.

## Clinical Analysis Format:

### 1. Patient Health Status
- Analyze age, total conditions, and chronic conditions
- Provide interpretation of overall health complexity

### 2. Medication Safety Check  
- Review total medications, unique medications, and dispenses
- Identify polypharmacy risks (>5 medications)
- Note any drug interaction concerns based on medication count

### 3. Utilization / Risk Monitoring
- Analyze emergency visits, inpatient visits, and total encounters
- Identify patterns of acute episodes
- Flag high utilization if ER visits > 2

### 4. Preventive Care Status
- Review wellness visits, immunizations, and care plans
- Identify gaps in preventive care
- Recommend follow-up needs

### 5. Financial Risk Impact
- Analyze income vs healthcare expenses vs coverage
- Identify financial stress indicators
- Note medication adherence risk due to finances

### 6. Disease Severity Indicators
- Review procedures, imaging studies, and devices
- Assess complexity of treatment history

### 7. Final Risk Level: ${clinicalSummary.risk_level}
- Explain why this risk level was assigned

### 8. Clinical Recommendations
- Provide 4-5 actionable recommendations based on the analysis
- Include timeline suggestions (e.g., "within 30 days")

Patient Data:
${JSON.stringify(clinicalSummary, null, 2)}

Important: Be concise but thorough. Use bullet points for clarity. Base all interpretations ONLY on the provided data.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'ClinicalIQ EHR Analysis',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a clinical decision support AI assistant. Provide accurate, evidence-based clinical interpretations. Never make up data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Unable to generate analysis.';
  } catch (error) {
    console.error('GPT Analysis Error:', error);
    throw error;
  }
};

/**
 * POST /api/doctor/ehr/analyze
 * Analyze patient EHR data
 */
const analyzePatient = async (req, res, next) => {
  try {
    const { patient_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        message: 'patient_id is required.',
      });
    }

    // Find patient in database
    const patient = await EhrPatient.findOne({
      where: { patient_id: patient_id.toString() },
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: `Patient with ID "${patient_id}" not found in EHR database.`,
      });
    }

    // Calculate risk level using rule-based logic
    const riskLevel = calculateRiskLevel(patient);

    // Build clinical summary
    const clinicalSummary = buildClinicalSummary(patient, riskLevel);

    // Get GPT analysis
    let aiAnalysis;
    try {
      aiAnalysis = await getGptAnalysis(clinicalSummary);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      aiAnalysis = generateFallbackAnalysis(clinicalSummary);
    }

    return res.json({
      success: true,
      data: {
        patient_id: patient.patient_id,
        risk_level: riskLevel,
        summary: {
          age: patient.age,
          gender: patient.gender,
          chronic_conditions: patient.chronic_conditions,
          total_conditions: patient.total_conditions,
          total_medications: patient.total_medications,
          emergency_visits: patient.emergency_visits,
          inpatient_visits: patient.inpatient_visits,
          wellness_visits: patient.wellness_visits,
          total_immunizations: patient.total_immunizations,
          total_procedures: patient.total_procedures,
          total_devices: patient.total_devices,
          income: patient.income,
          healthcare_expenses: patient.healthcare_expenses,
          healthcare_coverage: patient.healthcare_coverage,
        },
        full_data: patient,
        analysis: aiAnalysis,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate fallback analysis if AI fails
 */
const generateFallbackAnalysis = (summary) => {
  const risk = summary.risk_level;
  const age = summary.age || 'Unknown';
  const chronic = summary.conditions?.chronic_conditions || 0;
  const meds = summary.medications?.total_medications || 0;
  const erVisits = summary.encounters?.emergency_visits || 0;
  const wellness = summary.encounters?.wellness_visits || 0;

  let analysis = `## Clinical Analysis for Patient ${summary.patient_id}\n\n`;
  
  analysis += `### 1. Patient Health Status\n`;
  analysis += `- Age: ${age}\n`;
  analysis += `- Chronic Conditions: ${chronic}\n`;
  analysis += `- ${chronic >= 3 ? 'High medical complexity - multiple chronic diseases present' : chronic >= 1 ? 'Moderate complexity - some chronic conditions present' : 'Low complexity - minimal chronic conditions'}\n\n`;

  analysis += `### 2. Medication Safety Check\n`;
  analysis += `- Total Medications: ${meds}\n`;
  analysis += `- ${meds >= 5 ? '⚠️ Polypharmacy detected - medication review recommended' : 'Medication count within normal range'}\n\n`;

  analysis += `### 3. Utilization / Risk Monitoring\n`;
  analysis += `- Emergency Visits: ${erVisits}\n`;
  analysis += `- ${erVisits >= 2 ? '⚠️ High ER utilization - indicates poor disease control' : 'ER utilization within normal range'}\n\n`;

  analysis += `### 4. Preventive Care Status\n`;
  analysis += `- Wellness Visits: ${wellness}\n`;
  analysis += `- ${wellness === 0 ? '⚠️ No wellness visits recorded - preventive care gap identified' : 'Preventive care is being maintained'}\n\n`;

  analysis += `### 5. Financial Risk Impact\n`;
  analysis += `- Income: $${summary.financial?.income || 'Unknown'}\n`;
  analysis += `- Healthcare Expenses: $${summary.financial?.healthcare_expenses || 'Unknown'}\n`;
  analysis += `- Consider financial factors in treatment planning\n\n`;

  analysis += `### 6. Disease Severity Indicators\n`;
  analysis += `- Total Procedures: ${summary.procedures_and_care?.total_procedures || 0}\n`;
  analysis += `- Medical Devices: ${summary.procedures_and_care?.total_devices || 0}\n\n`;

  analysis += `### 7. Final Risk Level: ${risk}\n`;
  analysis += risk === 'HIGH' 
    ? '- Patient meets multiple high-risk criteria requiring immediate attention\n\n'
    : risk === 'MODERATE'
    ? '- Patient has some risk factors requiring monitoring\n\n'
    : '- Patient is relatively stable with minimal risk factors\n\n';

  analysis += `### 8. Clinical Recommendations\n`;
  if (risk === 'HIGH') {
    analysis += `- Medication review required within 14 days\n`;
    analysis += `- Schedule comprehensive care assessment within 30 days\n`;
    analysis += `- Evaluate chronic disease control measures\n`;
    analysis += `- Consider care plan adherence review\n`;
    analysis += `- Assess need for care coordination services\n`;
  } else if (risk === 'MODERATE') {
    analysis += `- Schedule follow-up within 60 days\n`;
    analysis += `- Review medication regimen at next visit\n`;
    analysis += `- Encourage preventive care visits\n`;
    analysis += `- Monitor for changes in condition\n`;
  } else {
    analysis += `- Continue routine preventive care\n`;
    analysis += `- Annual wellness visit recommended\n`;
    analysis += `- Maintain current health status\n`;
  }

  return analysis;
};

/**
 * GET /api/doctor/ehr/search
 * Search for patient by ID (partial match)
 */
const searchPatient = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const patients = await EhrPatient.findAll({
      where: {
        patient_id: {
          [require('sequelize').Op.iLike]: `%${q}%`,
        },
      },
      attributes: ['patient_id', 'age', 'gender', 'city', 'state'],
      limit: 10,
      order: [['patient_id', 'ASC']],
    });

    return res.json({
      success: true,
      data: patients,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  analyzePatient,
  searchPatient,
};
