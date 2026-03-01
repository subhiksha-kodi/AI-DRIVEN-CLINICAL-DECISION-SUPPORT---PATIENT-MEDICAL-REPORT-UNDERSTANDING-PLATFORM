/**
 * patient.labreports.controller.js - Lab reports sent from admin to patient (by registration_number + name)
 */
const path = require('path');
const fs = require('fs');
const Report = require('../models/Report');
const { Op } = require('sequelize');
const { runAnalysisForFilePath } = require('./patient.enhanced.analysis.controller');

/**
 * GET /api/patient/lab-reports
 * Get lab reports uploaded by admin for this patient (match registration_number + name)
 */
const getLabReports = async (req, res, next) => {
  try {
    const registration_number = req.patient?.registration_number;
    const patientName = req.patient?.name;

    if (!registration_number || !patientName) {
      return res.json({
        success: true,
        data: [],
        message: 'No lab reports linked. Use Register Number + Name login to see reports sent from hospital.',
      });
    }

    const reports = await Report.findAll({
      where: {
        registration_number: { [Op.iLike]: registration_number.trim() },
        patient_name: { [Op.iLike]: patientName.trim() },
        report_type: 'lab',
      },
      order: [['uploaded_at', 'DESC']],
      attributes: [
        'id',
        'patient_name',
        'registration_number',
        'assigned_doctor',
        'file_name',
        'file_type',
        'file_size',
        'report_type',
        'uploaded_at',
        'extracted_data',
        'ai_analysis',
      ],
    });

    return res.json({
      success: true,
      data: reports.map((r) => ({
        id: r.id,
        patient_name: r.patient_name,
        registration_number: r.registration_number,
        assigned_doctor: r.assigned_doctor,
        file_name: r.file_name,
        file_type: r.file_type,
        file_size: r.file_size,
        report_type: r.report_type,
        uploaded_at: r.uploaded_at,
        extracted_data: r.extracted_data,
        ai_analysis: r.ai_analysis,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/lab-reports/:id/download
 * Download a lab report file (only if it belongs to this patient)
 */
const downloadLabReport = async (req, res, next) => {
  try {
    const registration_number = req.patient?.registration_number;
    const patientName = req.patient?.name;
    const reportId = req.params.id;

    if (!registration_number || !patientName) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Lab reports are available when logged in with Register Number and Name.',
      });
    }

    const report = await Report.findOne({
      where: {
        id: reportId,
        registration_number: { [Op.iLike]: registration_number.trim() },
        patient_name: { [Op.iLike]: patientName.trim() },
        report_type: 'lab',
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    const fullPath = path.join(__dirname, '../../', report.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server.',
      });
    }

    res.download(fullPath, report.file_name);
  } catch (err) {
    next(err);
  }
};

/**
 * Strip common labels from date strings (e.g. "Report Date: 15/01/2025" -> "15/01/2025").
 */
function stripDateLabel(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/^(report\s*date|sample\s*date|collection\s*date|date\s*of\s*report|dob|date):\s*/i, '')
    .trim();
}

/**
 * Parse a date string from lab report (various formats) to YYYY-MM-DD.
 * Handles: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, DD-MMM-YYYY, DD MMM YYYY, MMM DD YYYY, etc.
 */
function parseDateStringToISO(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let s = stripDateLabel(raw).trim().replace(/\s+/g, ' ');
  if (!s) return null;
  // Already ISO-like (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  // YYYY-MM-DD with time (take date part)
  const isoWithTime = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoWithTime) return isoWithTime[0];
  // DD-MMM-YYYY or DD MMM YYYY (e.g. 15-Jan-2025, 15 Jan 2025)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/**
 * Get report date from extracted_data. Tries multiple possible locations and parses to YYYY-MM-DD.
 */
function parseReportDateFromExtract(extractedData) {
  if (!extractedData || typeof extractedData !== 'object') return null;
  const lab = extractedData.lab_details || {};
  const candidates = [
    lab.report_date,
    lab.sample_collection_date,
    lab.collection_date,
    lab.date,
    extractedData.report_date,
    extractedData.sample_collection_date,
    extractedData.collection_date,
    extractedData.date,
  ].filter(Boolean);
  for (const raw of candidates) {
    const str = typeof raw === 'string' ? raw : String(raw).trim();
    if (!str) continue;
    const iso = parseDateStringToISO(str);
    if (iso) return iso;
  }
  // Last resort: look for any date-like pattern in raw_text (first match)
  const rawText = extractedData.raw_text || '';
  if (typeof rawText === 'string' && rawText.length > 0) {
    const patterns = [
      /\b(\d{4}-\d{2}-\d{2})\b/,
      /\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/,
      /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i,
    ];
    for (const re of patterns) {
      const m = rawText.match(re);
      if (m) {
        const dateStr = m[0];
        const iso = parseDateStringToISO(dateStr);
        if (iso) return iso;
      }
    }
  }
  return null;
}

// Normalize test names so "Hb" and "Hemoglobin" group together (canonical name for display)
const TEST_NAME_ALIASES = {
  hb: 'Hemoglobin',
  hemoglobin: 'Hemoglobin',
  haemoglobin: 'Hemoglobin',
  rbc: 'RBC',
  wbc: 'WBC',
  glucose: 'Glucose',
  fasting_glucose: 'Glucose (Fasting)',
  creatinine: 'Creatinine',
  urea: 'Urea',
  sgpt: 'SGPT',
  sgot: 'SGOT',
  alt: 'SGPT',
  ast: 'SGOT',
  cholesterol: 'Total Cholesterol',
  hdl: 'HDL Cholesterol',
  ldl: 'LDL Cholesterol',
  triglycerides: 'Triglycerides',
  tsh: 'TSH',
  t3: 'T3',
  t4: 'T4',
};
const normalizeTestName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const key = name.trim().toLowerCase().replace(/\s+/g, '_');
  return TEST_NAME_ALIASES[key] || name.trim();
};

// Parse numeric value; return null if not a number (e.g. "High", "Low", "Normal")
function parseNumericValue(val) {
  if (val == null) return null;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const s = String(val).trim();
  const num = parseFloat(s.replace(/[,]/g, ''));
  if (!Number.isNaN(num)) return num;
  const lower = s.toLowerCase();
  if (lower === 'high' || lower === 'low' || lower === 'normal' || lower === 'negative' || lower === 'positive') return null;
  return null;
}

/**
 * POST /api/patient/lab-reports/:id/extract-analyze
 * Run extract + analyze on an admin-uploaded lab report (same logic as Report Analysis tab). Saves to Report.
 */
const extractAnalyzeLabReport = async (req, res, next) => {
  try {
    const registration_number = req.patient?.registration_number;
    const patientName = req.patient?.name;
    const reportId = req.params.id;

    if (!registration_number || !patientName) {
      return res.status(403).json({
        success: false,
        message: 'Lab report analysis is available when logged in with Register Number and Name.',
      });
    }

    const report = await Report.findOne({
      where: {
        id: reportId,
        registration_number: { [Op.iLike]: registration_number.trim() },
        patient_name: { [Op.iLike]: patientName.trim() },
        report_type: 'lab',
      },
    });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const fullPath = path.join(__dirname, '../../', report.file_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: 'File not found on server.' });
    }

    const { extractedData, clinicalAnalysis } = await runAnalysisForFilePath(fullPath, 'en');
    report.extracted_data = extractedData;
    report.ai_analysis = clinicalAnalysis;
    await report.save();

    return res.json({
      success: true,
      message: 'Extraction and analysis completed. You can now view trends.',
      data: {
        id: report.id,
        file_name: report.file_name,
        extracted_data: extractedData,
        ai_analysis: clinicalAnalysis,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/trend-data
 * Aggregate test results from lab reports: repeated test names grouped, date-sorted, numeric-only.
 * Only returns trends for parameters that appear in 2+ reports.
 */
const getTrendData = async (req, res, next) => {
  try {
    const registration_number = req.patient?.registration_number;
    const patientName = req.patient?.name;

    if (!registration_number || !patientName) {
      return res.json({
        success: true,
        data: { trends: [], reports: [] },
      });
    }

    const reports = await Report.findAll({
      where: {
        registration_number: { [Op.iLike]: registration_number.trim() },
        patient_name: { [Op.iLike]: patientName.trim() },
        report_type: 'lab',
      },
      order: [['uploaded_at', 'ASC']],
      attributes: ['id', 'file_name', 'uploaded_at', 'extracted_data', 'ai_analysis'],
    });

    const reportDates = reports.map((r) => {
      const d = parseReportDateFromExtract(r.extracted_data) || (r.uploaded_at ? new Date(r.uploaded_at).toISOString().slice(0, 10) : null);
      return { report_id: r.id, file_name: r.file_name, date: d };
    });

    // Collect all test points: key = normalized test name, value = { unit, reference_range, points: [], clinical from latest report }
    const paramMap = {};

    for (const r of reports) {
      const reportDate = parseReportDateFromExtract(r.extracted_data) || (r.uploaded_at ? new Date(r.uploaded_at).toISOString().slice(0, 10) : '');

      const raw = r.extracted_data || r.ai_analysis || {};
      const tests = raw.test_results || raw.parameters || raw.lab_tests || raw.results || [];
      const list = Array.isArray(tests)
        ? tests
        : typeof raw === 'object' && raw !== null && !Array.isArray(raw)
          ? Object.entries(raw).map(([k, v]) => ({ test_name: k, value: v, unit: '', reference_range: '' }))
          : [];

      for (const t of list) {
        const name = (t.test_name || t.name || t.parameter || t.label || '').trim();
        if (!name) continue;
        const canonical = normalizeTestName(name) || name;
        const rawValue = t.value ?? t.result ?? t.result_value ?? t.result_value;
        const num = parseNumericValue(rawValue);
        if (num === null) continue;
        const unit = (t.unit || '').trim();
        const reference_range = (t.reference_range || t.referenceRange || '').trim();

        if (!paramMap[canonical]) {
          paramMap[canonical] = { unit: unit || '', reference_range: reference_range || '', points: [] };
        }
        const entry = paramMap[canonical];
        if (!entry.unit && unit) entry.unit = unit;
        if (!entry.reference_range && reference_range) entry.reference_range = reference_range;
        entry.points.push({
          date: reportDate,
          value: num,
          reference_range: reference_range || entry.reference_range,
          report_id: r.id,
          file_name: r.file_name,
        });
      }
    }

    // Sort each param's points by date ascending; keep only params with 2+ points (repeated tests)
    const trends = [];
    for (const [test_name, obj] of Object.entries(paramMap)) {
      const points = obj.points
        .filter((p) => p.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      if (points.length >= 2) {
        const latestReportId = points[points.length - 1].report_id;
        const latestReport = reports.find((re) => re.id === latestReportId);
        let clinical_meaning = '';
        let possible_symptoms = [];
        if (latestReport?.ai_analysis?.parameters && Array.isArray(latestReport.ai_analysis.parameters)) {
          const param = latestReport.ai_analysis.parameters.find(
            (p) => (p.test_name && (normalizeTestName(p.test_name) === test_name || p.test_name.trim() === test_name))
          );
          if (param) {
            clinical_meaning = param.clinical_meaning || '';
            possible_symptoms = Array.isArray(param.possible_symptoms) ? param.possible_symptoms : [];
          }
        }
        trends.push({
          test_name,
          unit: obj.unit,
          reference_range: obj.reference_range,
          values: points.map((p) => ({
            date: p.date,
            value: p.value,
            reference_range: p.reference_range || obj.reference_range,
          })),
          clinical_meaning,
          possible_symptoms,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        trends,
        reports: reportDates,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLabReports,
  downloadLabReport,
  getTrendData,
  extractAnalyzeLabReport,
};
