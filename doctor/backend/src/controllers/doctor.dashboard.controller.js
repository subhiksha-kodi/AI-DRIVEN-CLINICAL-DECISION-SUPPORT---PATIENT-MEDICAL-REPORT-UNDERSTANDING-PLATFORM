/**
 * doctor.dashboard.controller.js - Doctor dashboard stats, reports, and review
 */
const { Op } = require('sequelize');
const Report = require('../models/Report');
const Doctor = require('../models/Doctor');

/**
 * GET /api/doctor/stats
 * Get dashboard statistics for the logged-in doctor
 */
const getStats = async (req, res, next) => {
  try {
    let whereClause = {};

    if (req.doctor) {
      // Doctor stats - only their assigned reports
      const doctorId = req.doctor.id;
      const doctor = await Doctor.findByPk(doctorId);

      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found.' });
      }

      whereClause = {
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
      };
    }
    // Admin can see all stats (no where clause needed)

    // Total assigned patients (unique registration numbers)
    const totalPatients = await Report.count({
      distinct: true,
      col: 'registration_number',
      where: whereClause,
    });

    // Reports reviewed
    const reviewedReports = await Report.count({
      where: {
        ...whereClause,
        status: 'reviewed',
      },
    });

    // Pending review
    const pendingReports = await Report.count({
      where: {
        ...whereClause,
        status: 'pending',
      },
    });

    return res.json({
      success: true,
      data: {
        totalPatients,
        reviewedReports,
        pendingReports,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    next(err);
  }
};

/**
 * GET /api/doctor/reports
 * Get all reports assigned to the logged-in doctor (with search)
 */
const getReports = async (req, res, next) => {
  try {
    let whereClause = {};

    if (req.doctor) {
      // Doctor reports - only their assigned reports
      const doctorId = req.doctor.id;
      const doctor = await Doctor.findByPk(doctorId);
      whereClause = {
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
      };
    }
    // Admin can see all reports (no where clause needed)

    const { search, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Add search filter
    if (search) {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { patient_name: { [Op.iLike]: `%${search}%` } },
            { registration_number: { [Op.iLike]: `%${search}%` } },
          ],
        },
      ];
    }

    // Add status filter
    if (status && ['pending', 'reviewed'].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows } = await Report.findAndCountAll({
      where: whereClause,
      order: [['uploaded_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/report/:id
 * Get single report details
 */
const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Handle both admin and doctor access
    let report;
    if (req.admin) {
      // Admin can access any report
      report = await Report.findByPk(id);
    } else if (req.doctor) {
      // Doctor can only access their assigned reports
      const doctorId = req.doctor.id;
      const doctor = await Doctor.findByPk(doctorId);

      report = await Report.findOne({
        where: {
          id,
          [Op.or]: [
            { doctor_id: doctorId },
            { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
          ],
        },
      });
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or access denied.',
      });
    }

    return res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/doctor/report/:id/reviewed
 * Mark a report as reviewed
 */
const markAsReviewed = async (req, res, next) => {
  try {
    const { id } = req.params;

    let report;
    if (req.admin) {
      // Admin can mark any report as reviewed
      report = await Report.findByPk(id);
    } else if (req.doctor) {
      // Doctor can only mark their assigned reports
      const doctorId = req.doctor.id;
      const doctor = await Doctor.findByPk(doctorId);

      report = await Report.findOne({
        where: {
          id,
          [Op.or]: [
            { doctor_id: doctorId },
            { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
          ],
        },
      });
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or access denied.',
      });
    }

    if (report.status === 'reviewed') {
      return res.status(400).json({
        success: false,
        message: 'Report is already marked as reviewed.',
      });
    }

    // Update status
    report.status = 'reviewed';
    if (req.doctor) {
      report.doctor_id = req.doctor.id; // Ensure doctor_id is set for doctors
    }
    await report.save();

    return res.json({
      success: true,
      message: 'Report marked as reviewed.',
      data: report,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/doctor/patients
 * Get unique patients assigned to the doctor
 */
const getPatients = async (req, res, next) => {
  try {
    let whereClause = {};

    if (req.doctor) {
      // Doctor patients - only their assigned patients
      const doctorId = req.doctor.id;
      const doctor = await Doctor.findByPk(doctorId);
      whereClause = {
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
      };
    }
    // Admin can see all patients (no where clause needed)

    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (search) {
      whereClause[Op.and] = [
        {
          [Op.or]: [
            { patient_name: { [Op.iLike]: `%${search}%` } },
            { registration_number: { [Op.iLike]: `%${search}%` } },
          ],
        },
      ];
    }

    // Get unique patients with report counts
    const patients = await Report.findAll({
      where: whereClause,
      attributes: [
        'registration_number',
        [Report.sequelize.fn('MAX', Report.sequelize.col('patient_name')), 'patient_name'],
        [Report.sequelize.fn('COUNT', Report.sequelize.col('id')), 'total_reports'],
        [Report.sequelize.fn('SUM', Report.sequelize.literal("CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END")), 'reviewed_count'],
        [Report.sequelize.fn('SUM', Report.sequelize.literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'pending_count'],
      ],
      group: ['registration_number'],
      order: [[Report.sequelize.literal('total_reports'), 'DESC']],
      limit: parseInt(limit),
      offset,
      raw: true,
    });

    // Count total unique patients
    const totalResult = await Report.count({
      distinct: true,
      col: 'registration_number',
      where: whereClause,
    });

    return res.json({
      success: true,
      data: patients,
      pagination: {
        total: totalResult,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalResult / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to normalize test names
 */
const normalizeTestName = (name) => {
  if (!name) return 'Unknown';
  const n = name.toLowerCase().trim();
  const mapping = {
    'hb': 'Hemoglobin',
    'hgb': 'Hemoglobin',
    'hemoglobin': 'Hemoglobin',
    'rbc': 'RBC',
    'wbc': 'WBC',
    'plt': 'Platelet',
    'platelet': 'Platelet',
  };
  for (const [key, val] of Object.entries(mapping)) {
    if (n === key || n.includes(key)) return val;
  }
  return name.trim();
};

/**
 * Robust date parser for various formats, especially DD/MM/YYYY
 */
const parseReportDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  // Handle DD/MM/YYYY
  const dmhMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmhMatch) {
    const day = parseInt(dmhMatch[1], 10);
    const month = parseInt(dmhMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmhMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }

  // Fallback to standard JS parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Helper to extract numeric tests from report
 */
const extractTestsFromReport = (report) => {
  const tests = [];
  const data = report.ai_analysis?.lab_tests || report.ai_analysis?.lab_results || [];

  data.forEach(t => {
    let val = t.numeric_value || t.value;
    if (typeof val === 'string') {
      const match = val.match(/([0-9.]+)/);
      val = match ? parseFloat(match[1]) : NaN;
    }

    if (typeof val === 'number' && !isNaN(val)) {
      tests.push({
        name: t.test_name || t.name,
        unit: t.unit || '',
        reference_range: t.reference_range || '',
        numericValue: val
      });
    }
  });
  return tests;
};

/**
 * GET /api/doctor/trend-data
 * Get lab report trend data for a patient
 */
const getTrendData = async (req, res, next) => {
  try {
    const { registration_number, patient_name } = req.query;

    if (!registration_number || !patient_name) {
      return res.status(400).json({
        success: false,
        message: 'Registration number and patient name are required.'
      });
    }

    const reports = await Report.findAll({
      where: {
        registration_number: { [Op.iLike]: registration_number.trim() },
        patient_name: { [Op.iLike]: patient_name.trim() },
        report_type: 'lab',
      },
      order: [['uploaded_at', 'ASC']],
      attributes: ['id', 'file_name', 'uploaded_at', 'extracted_data', 'ai_analysis'],
    });

    const paramMap = {};

    reports.forEach(report => {
      const tests = extractTestsFromReport(report);
      tests.forEach(test => {
        const canonical = normalizeTestName(test.name);
        if (!paramMap[canonical]) {
          paramMap[canonical] = {
            unit: test.unit,
            reference_range: test.reference_range,
            points: []
          };
        }
        paramMap[canonical].points.push({
          date: parseReportDate(report.ai_analysis?.patient_info?.collection_date) ||
            parseReportDate(report.ai_analysis?.patient_info?.reported_date) ||
            report.uploaded_at,
          value: test.numericValue,
          reference_range: test.reference_range,
          report_id: report.id,
          file_name: report.file_name,
        });
      });
    });

    const trends = Object.keys(paramMap)
      .filter(name => paramMap[name].points.length >= 2)
      .map(name => {
        const data = paramMap[name];
        // Get clinical meaning from the latest report if available
        let clinical_meaning = "";
        let possible_symptoms = [];

        const latestReport = reports[reports.length - 1];
        if (latestReport.ai_analysis?.ai_summary?.key_findings) {
          const finding = latestReport.ai_analysis.ai_summary.key_findings.find(f =>
            normalizeTestName(f.test_name) === name
          );
          if (finding) {
            clinical_meaning = finding.clinical_significance || "";
          }
        }

        return {
          test_name: name,
          unit: data.unit,
          reference_range: data.reference_range,
          values: data.points.sort((a, b) => new Date(a.date) - new Date(b.date)),
          clinical_meaning: clinical_meaning || `${name} level trend analysis`,
          possible_symptoms: possible_symptoms
        };
      });

    return res.json({
      success: true,
      data: {
        trends,
        reports: reports.map(r => ({
          report_id: r.id,
          file_name: r.file_name,
          date: parseReportDate(r.ai_analysis?.patient_info?.collection_date) ||
            parseReportDate(r.ai_analysis?.patient_info?.reported_date) ||
            r.uploaded_at
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getReports,
  getReportById,
  markAsReviewed,
  getPatients,
  getTrendData
};
