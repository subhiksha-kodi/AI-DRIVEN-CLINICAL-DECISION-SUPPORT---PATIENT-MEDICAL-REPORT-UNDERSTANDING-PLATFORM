/**
 * Summary Controller - Generates medical summaries from DB-stored data
 * 
 * IMPORTANT: This uses:
 * 1. Rule-based pre-calculated risk (not LLM diagnosis)
 * 2. Strict prompts that only EXPLAIN pre-calculated findings
 * 3. Temperature 0 for Gemini to minimize hallucination
 * 
 * The LLM does NOT diagnose - it only explains in clinical language.
 */

const Report = require('../models/Report');
const { calculateRisk, prepareForSummarization } = require('../utils/riskCalculator');

// Extraction service URL for Gemini calls
const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL || 'http://localhost:8001';

/**
 * Generate clinical summary from database-stored extraction data
 * POST /api/doctor/reports/:id/summary
 */
const generateSummary = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Retrieve stored data from database
        const report = await Report.findByPk(id);
        
        if (!report) {
            return res.status(404).json({ 
                success: false, 
                message: 'Report not found.' 
            });
        }
        
        if (!report.ai_analysis) {
            return res.status(400).json({ 
                success: false, 
                message: 'Report has not been extracted yet. Please extract first.' 
            });
        }
        
        const aiAnalysis = report.ai_analysis;
        const labTests = aiAnalysis.lab_tests || [];
        const patientInfo = aiAnalysis.patient_info || {};
        
        // Re-calculate risk using rule-based system (ensures consistency)
        const riskAnalysis = calculateRisk(labTests, patientInfo);
        
        // Prepare strict summary data (pre-calculated, no LLM guessing)
        const summaryData = {
            patient_info: patientInfo,
            lab_tests: labTests,
            // PRE-CALCULATED by backend rules, NOT LLM
            computed_risk: {
                risk_level: riskAnalysis.riskLevel,
                risk_score: riskAnalysis.riskScore,
                total_tests: riskAnalysis.totalTests,
                critical_count: riskAnalysis.criticalCount,
                abnormal_count: riskAnalysis.abnormalCount,
                normal_count: riskAnalysis.normalCount,
            },
            flags: riskAnalysis.flags,
            affected_organs: riskAnalysis.affectedOrgans,
            critical_findings: riskAnalysis.criticalFindings,
            abnormal_findings: riskAnalysis.abnormalFindings,
            risk_justification: riskAnalysis.riskJustification,
        };
        
        // Call Gemini with STRICT explanation-only prompt
        let geminiExplanation = null;
        try {
            const response = await fetch(`${EXTRACTION_SERVICE_URL}/generate-strict-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(summaryData)
            });
            
            if (response.ok) {
                geminiExplanation = await response.json();
            }
        } catch (err) {
            console.warn('Gemini explanation error:', err.message);
        }
        
        // Build final summary response
        const summary = {
            report_id: report.id,
            patient: {
                name: patientInfo.name || report.patient_name,
                registration_number: patientInfo.registration_number || report.registration_number,
                age: patientInfo.age,
                sex: patientInfo.sex,
                collection_date: patientInfo.collection_date,
            },
            // RULE-BASED risk (no hallucination)
            risk_assessment: {
                level: riskAnalysis.riskLevel,
                score: riskAnalysis.riskScore,
                justification: riskAnalysis.riskJustification,
                calculation_method: 'rule_based_clinical_ranges',
            },
            // Pre-calculated organ involvement
            affected_organs: riskAnalysis.affectedOrgans,
            clinical_flags: riskAnalysis.flags,
            // Findings by severity
            findings: {
                critical: riskAnalysis.criticalFindings.map(f => ({
                    test: f.test_name,
                    value: `${f.value} ${f.unit}`,
                    reference: f.reference_range,
                    organ: f.organ_system,
                    message: f.message,
                })),
                abnormal: riskAnalysis.abnormalFindings.map(f => ({
                    test: f.test_name,
                    value: `${f.value} ${f.unit}`,
                    reference: f.reference_range,
                    organ: f.organ_system,
                    status: f.status,
                })),
                normal_count: riskAnalysis.normalCount,
            },
            // Statistics
            statistics: {
                total_tests: riskAnalysis.totalTests,
                critical_count: riskAnalysis.criticalCount,
                abnormal_count: riskAnalysis.abnormalCount,
                normal_count: riskAnalysis.normalCount,
            },
            // Gemini explanation (only explains pre-calculated findings)
            ai_explanation: geminiExplanation || {
                clinical_summary: generateFallbackSummary(riskAnalysis, patientInfo),
                note: 'AI explanation unavailable, showing rule-based summary',
            },
            generated_at: new Date().toISOString(),
            disclaimer: 'This summary is for informational purposes only. Risk levels are calculated using standard clinical reference ranges. Always consult clinical judgment for patient care decisions.',
        };
        
        // Update report with latest summary
        await report.update({
            ai_analysis: {
                ...aiAnalysis,
                latest_summary: summary,
                summary_generated_at: new Date().toISOString(),
            }
        });
        
        return res.json({
            success: true,
            data: summary,
        });
        
    } catch (err) {
        console.error('Summary generation error:', err);
        next(err);
    }
};

/**
 * Generate fallback summary without LLM
 */
function generateFallbackSummary(riskAnalysis, patientInfo) {
    const parts = [];
    
    // Patient info
    if (patientInfo.name) {
        parts.push(`Patient: ${patientInfo.name}`);
    }
    if (patientInfo.age) {
        parts.push(`Age: ${patientInfo.age}`);
    }
    if (patientInfo.sex) {
        parts.push(`Sex: ${patientInfo.sex}`);
    }
    
    // Risk level
    parts.push(`\nRisk Level: ${riskAnalysis.riskLevel}`);
    parts.push(`Risk Score: ${riskAnalysis.riskScore}`);
    
    // Statistics
    parts.push(`\nTotal Tests: ${riskAnalysis.totalTests}`);
    parts.push(`Critical: ${riskAnalysis.criticalCount}`);
    parts.push(`Abnormal: ${riskAnalysis.abnormalCount}`);
    parts.push(`Normal: ${riskAnalysis.normalCount}`);
    
    // Critical findings
    if (riskAnalysis.criticalFindings.length > 0) {
        parts.push('\n⚠️ CRITICAL FINDINGS:');
        riskAnalysis.criticalFindings.forEach(f => {
            parts.push(`- ${f.test_name}: ${f.value} ${f.unit} (${f.message})`);
        });
    }
    
    // Abnormal findings
    if (riskAnalysis.abnormalFindings.length > 0) {
        parts.push('\n🔶 ABNORMAL FINDINGS:');
        riskAnalysis.abnormalFindings.forEach(f => {
            parts.push(`- ${f.test_name}: ${f.value} ${f.unit} (${f.status})`);
        });
    }
    
    // Affected organs
    if (riskAnalysis.affectedOrgans.length > 0) {
        parts.push(`\nOrgans Potentially Affected: ${riskAnalysis.affectedOrgans.join(', ')}`);
    }
    
    // Clinical flags
    const flagKeys = Object.keys(riskAnalysis.flags).filter(k => riskAnalysis.flags[k]);
    if (flagKeys.length > 0) {
        parts.push(`\nClinical Flags: ${flagKeys.join(', ')}`);
    }
    
    // Justification
    if (riskAnalysis.riskJustification?.length > 0) {
        parts.push('\nRisk Justification:');
        riskAnalysis.riskJustification.forEach(j => {
            parts.push(`- ${j}`);
        });
    }
    
    return parts.join('\n');
}

/**
 * Get pre-calculated risk summary (no LLM, pure rules)
 * GET /api/doctor/reports/:id/risk
 */
const getRiskSummary = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);
        
        if (!report) {
            return res.status(404).json({ 
                success: false, 
                message: 'Report not found.' 
            });
        }
        
        if (!report.ai_analysis?.lab_tests) {
            return res.status(400).json({ 
                success: false, 
                message: 'No lab tests found. Extract report first.' 
            });
        }
        
        const labTests = report.ai_analysis.lab_tests;
        const patientInfo = report.ai_analysis.patient_info || {};
        
        // Pure rule-based risk calculation
        const riskAnalysis = calculateRisk(labTests, patientInfo);
        
        return res.json({
            success: true,
            data: {
                risk_level: riskAnalysis.riskLevel,
                risk_score: riskAnalysis.riskScore,
                flags: riskAnalysis.flags,
                affected_organs: riskAnalysis.affectedOrgans,
                critical_findings: riskAnalysis.criticalFindings,
                abnormal_findings: riskAnalysis.abnormalFindings,
                justification: riskAnalysis.riskJustification,
                statistics: {
                    total: riskAnalysis.totalTests,
                    critical: riskAnalysis.criticalCount,
                    abnormal: riskAnalysis.abnormalCount,
                    normal: riskAnalysis.normalCount,
                },
                calculation_method: 'rule_based',
            }
        });
        
    } catch (err) {
        next(err);
    }
};

module.exports = { generateSummary, getRiskSummary };
