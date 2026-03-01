const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const Report = require('../models/Report');
const { calculateRisk, prepareForSummarization } = require('../utils/riskCalculator');

// FastAPI extraction service URL
const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL || 'http://localhost:8001';


const extractAndAnalyze = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        const isImage = report.file_type?.startsWith('image/');
        const isPdf = report.file_type === 'application/pdf';

        if (!isPdf && !isImage) {
            return res.status(400).json({ 
                success: false, 
                message: 'Only PDFs and images can be extracted.' 
            });
        }

        const filePath = path.resolve(__dirname, '../../', report.file_path);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('❌ File not found:', filePath);
            console.log('Report file_path:', report.file_path);
            console.log('Resolved path:', filePath);
            console.log('File exists check:', fs.existsSync(filePath));
            return res.status(404).json({ success: false, message: 'Report file not found.' });
        }

        console.log('✅ File found:', filePath);
        let extractionResult;
        let isScanned = isImage;

        // Use Gemini Vision for image files (scanned lab reports)
        if (isImage) {
            console.log('Using Gemini Vision for image extraction...');
            console.log('File path:', filePath);
            console.log('File type:', report.file_type);
            
            // Create form data for image upload
            const formData = new FormData();
            const fileName = path.basename(filePath);
            const fileStream = fs.createReadStream(filePath);
            
            formData.append('file', fileStream, {
                filename: fileName,
                contentType: report.file_type || 'image/png'
            });

            console.log('Sending request to extraction service via axios...');
            
            try {
                const response = await axios.post(
                    `${EXTRACTION_SERVICE_URL}/extract-lab-image`,
                    formData,
                    {
                        headers: formData.getHeaders(),
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        timeout: 120000
                    }
                );

                console.log('Response status:', response.status);
                extractionResult = response.data;
            } catch (axiosError) {
                console.error('Axios error:', axiosError.message);
                const errorDetail = axiosError.response?.data?.detail || axiosError.message || 'Gemini extraction failed.';
                return res.status(500).json({ 
                    success: false, 
                    message: errorDetail 
                });
            }
            
            extractionResult.is_scanned = true;
            
            // Map Gemini response format to standard format
            if (!extractionResult.lab_results && extractionResult.lab_tests) {
                extractionResult.lab_results = extractionResult.lab_tests;
            }
        } else {
            // Use standard extraction for PDFs - send as file instead of path
            console.log('Using standard extraction for PDF...');
            
            const formData = new FormData();
            const fileName = path.basename(filePath);
            const fileStream = fs.createReadStream(filePath);
            
            formData.append('file', fileStream, {
                filename: fileName,
                contentType: report.file_type || 'application/pdf'
            });

            try {
                const response = await axios.post(
                    `${EXTRACTION_SERVICE_URL}/extract`,
                    formData,
                    {
                        headers: formData.getHeaders(),
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        timeout: 120000
                    }
                );

                extractionResult = response.data;
                isScanned = extractionResult.is_scanned || false;
            } catch (axiosError) {
                console.error('PDF extraction error:', axiosError.message);
                const errorDetail = axiosError.response?.data?.detail || axiosError.message || 'PDF extraction failed.';
                return res.status(500).json({ 
                    success: false, 
                    message: errorDetail 
                });
            }
        }

        // Generate AI Summary using Gemini
        let aiSummary = null;
        try {
            console.log('Generating AI summary...');
            const summaryResponse = await fetch(`${EXTRACTION_SERVICE_URL}/generate-medical-summary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lab_data: {
                        patient_info: extractionResult.patient_info,
                        lab_tests: extractionResult.lab_results || extractionResult.lab_tests || [],
                        critical_alerts: extractionResult.critical_alerts || []
                    }
                })
            });

            if (summaryResponse.ok) {
                aiSummary = await summaryResponse.json();
                console.log('AI summary generated successfully');
            } else {
                console.warn('Failed to generate AI summary, continuing without it');
            }
        } catch (summaryErr) {
            console.warn('AI summary generation error:', summaryErr.message);
        }

        // Build structured AI analysis using RULE-BASED risk calculator (no hallucination)
        const labTests = extractionResult.lab_results || extractionResult.lab_tests || [];
        const patientInfo = {
            name: extractionResult.patient_info?.name || report.patient_name,
            registration_number: extractionResult.patient_info?.patient_id || report.registration_number,
            age: extractionResult.patient_info?.age || '',
            sex: extractionResult.patient_info?.sex || '',
            collection_date: extractionResult.patient_info?.collection_date || '',
            reported_date: extractionResult.patient_info?.reported_date || '',
            extraction_date: new Date().toISOString().split('T')[0]
        };

        // Calculate risk using rule-based system (not LLM)
        const ruleBasedRisk = calculateRisk(labTests, patientInfo);
        console.log('Rule-based risk calculation:', ruleBasedRisk.riskLevel, '- Score:', ruleBasedRisk.riskScore);

        const aiAnalysis = {
            patient_info: patientInfo,
            lab_tests: labTests.map(result => ({
                test_name: result.test_name,
                value: result.value,
                unit: result.unit || '',
                reference_range: result.reference_range || '',
                status: result.status || 'NORMAL',
                numeric_value: result.numeric_value,
                section: result.section || 'other'
            })),
            sections: extractionResult.sections || {},
            // Use RULE-BASED risk analysis (no hallucination)
            risk_analysis: {
                risk_score: ruleBasedRisk.riskScore,
                risk_level: ruleBasedRisk.riskLevel,
                alert_level: ruleBasedRisk.riskLevel,
                alert_message: ruleBasedRisk.riskJustification?.join('; ') || '',
                summary: `${ruleBasedRisk.riskLevel} risk: ${ruleBasedRisk.abnormalCount} abnormal, ${ruleBasedRisk.criticalCount} critical out of ${ruleBasedRisk.totalTests} tests`,
                abnormal_count: ruleBasedRisk.abnormalCount,
                critical_count: ruleBasedRisk.criticalCount,
                total_tests: ruleBasedRisk.totalTests,
                calculation_method: 'rule_based'
            },
            // Pre-calculated flags for organs (no LLM guessing)
            computed_flags: ruleBasedRisk.flags,
            affected_organs: ruleBasedRisk.affectedOrgans,
            risk_justification: ruleBasedRisk.riskJustification,
            // Findings categorized by severity
            critical_findings: ruleBasedRisk.criticalFindings,
            abnormal_findings: ruleBasedRisk.abnormalFindings,
            normal_findings: ruleBasedRisk.normalFindings,
            alerts: ruleBasedRisk.criticalFindings.concat(ruleBasedRisk.abnormalFindings).map(finding => ({
                test_name: finding.test_name,
                value: finding.value,
                unit: finding.unit,
                status: finding.status,
                severity: finding.severity,
                message: finding.message,
                organ_system: finding.organ_system,
                requires_immediate_attention: finding.severity === 'CRITICAL'
            })),
            critical_alerts: ruleBasedRisk.criticalFindings.map(f => ({
                test_name: f.test_name,
                value: f.value,
                unit: f.unit,
                message: f.message
            })),
            // AI-Generated Summary from Gemini (explanation only, not diagnosis)
            ai_summary: aiSummary ? {
                overall_status: aiSummary.patient_overview?.overall_status || 'STABLE',
                narrative_summary: aiSummary.narrative_summary || '',
                key_findings: aiSummary.lab_analysis?.key_findings || [],
                abnormal_values: aiSummary.lab_analysis?.abnormal_values || [],
                health_risks: aiSummary.health_risks || {},
                recommendations: aiSummary.recommendations || {},
                action_items: aiSummary.action_items || []
            } : null,
            extraction_source: extractionResult.extraction_source || (isImage ? 'gemini_vision' : 'standard'),
            extraction_confidence: extractionResult.extraction_confidence || 'high',
            is_scanned: isScanned,
            is_valid: true,
            analyzed_at: new Date().toISOString()
        };

        // Update database
        await report.update({
            extracted_data: {
                raw_text: extractionResult.raw_text,
                tables: extractionResult.tables,
                structured: true
            },
            ai_analysis: aiAnalysis,
            is_digital: !isScanned
        });

        return res.json({
            success: true,
            message: 'Extraction and analysis completed.',
            data: {
                id: report.id,
                patient_name: report.patient_name,
                registration_number: report.registration_number,
                file_path: report.file_path,
                status: report.status,
                extracted_data: {
                    structured: true
                },
                ai_analysis: aiAnalysis
            }
        });

    } catch (err) {
        console.error('Extraction error:', err);
        next(err);
    }
};

/**
 * Get alerts for a specific report
 */
const getReportAlerts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await Report.findByPk(id);

        if (!report) {
            return res.status(404).json({ success: false, message: 'Report not found.' });
        }

        const alerts = report.ai_analysis?.alerts || [];
        const riskAnalysis = report.ai_analysis?.risk_analysis || {};

        return res.json({
            success: true,
            data: {
                alerts,
                risk_score: riskAnalysis.risk_score || 0,
                risk_level: riskAnalysis.risk_level || 'NORMAL',
                summary: riskAnalysis.summary || '',
                has_critical: alerts.some(a => a.severity === 'CRITICAL')
            }
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Get high-risk reports (for dashboard)
 */
const getHighRiskReports = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        
        // Find reports with critical or high-risk alerts
        const reports = await Report.findAll({
            where: {
                ai_analysis: {
                    [Op.ne]: null
                }
            },
            order: [['uploaded_at', 'DESC']],
            limit: 50
        });

        // Filter for high-risk reports
        const highRiskReports = reports.filter(report => {
            const riskLevel = report.ai_analysis?.risk_analysis?.risk_level;
            return riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
        }).map(report => ({
            id: report.id,
            patient_name: report.patient_name,
            registration_number: report.registration_number,
            risk_level: report.ai_analysis.risk_analysis.risk_level,
            risk_score: report.ai_analysis.risk_analysis.risk_score,
            critical_alerts: report.ai_analysis.alerts?.filter(a => a.severity === 'CRITICAL') || [],
            uploaded_at: report.uploaded_at
        }));

        return res.json({
            success: true,
            data: highRiskReports,
            total: highRiskReports.length
        });

    } catch (err) {
        next(err);
    }
};

module.exports = { extractAndAnalyze, getReportAlerts, getHighRiskReports };

