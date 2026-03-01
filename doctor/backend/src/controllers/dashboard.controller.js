/**
 * dashboard.controller.js - Stats, report upload, listing, and deletion
 */
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const Report = require('../models/Report');
const Doctor = require('../models/Doctor');

/**
 * GET /api/admin/stats
 * Returns platform statistics for dashboard cards
 */
const getStats = async (req, res, next) => {
  try {
    const totalDoctors = await Doctor.count();
    const totalReports = await Report.count();

    // Unique patients = unique registration numbers
    const uniquePatients = await Report.count({
      distinct: true,
      col: 'registration_number',
    });

    // Recent uploads: last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUploads = await Report.count({
      where: { uploaded_at: { [Op.gte]: sevenDaysAgo } },
    });

    return res.json({
      success: true,
      data: { totalDoctors, totalPatients: uniquePatients, totalReports, recentUploads },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/upload
 * Handles file upload and stores metadata in DB
 */
const uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { patient_name, registration_number, assigned_doctor } = req.body;

    if (!patient_name || !registration_number || !assigned_doctor) {
      // Remove uploaded file if metadata missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'patient_name, registration_number, and assigned_doctor are required.',
      });
    }

    // Check if registration number exists with a different patient name
    const existingReport = await Report.findOne({
      where: { registration_number }
    });

    if (existingReport && existingReport.patient_name.toLowerCase() !== patient_name.toLowerCase()) {
      // Remove uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Patient registration number already exists for a different patient.',
      });
    }

    // Find doctor by name to link doctor_id
    let doctor_id = null;
    const doctor = await Doctor.findOne({
      where: { name: { [Op.iLike]: `%${assigned_doctor}%` } },
    });
    if (doctor) {
      doctor_id = doctor.id;
    }

    // Check if PDF is digital (has selectable text)
    let is_digital = false;
    if (req.file.mimetype === 'application/pdf') {
      try {
        const { execSync } = require('child_process');
        const pythonPath = 'python3'; // use python3 for alpine
        const scriptPath = path.join(__dirname, '../../extraction-service/extract.py');
        const absPath = path.join(__dirname, '../../', `uploads/${req.file.filename}`);

        const output = execSync(`${pythonPath} "${scriptPath}" detect "${absPath}"`);
        const result = JSON.parse(output.toString());
        is_digital = result.is_digital || false;
      } catch (err) {
        console.error('Digital PDF detection failed:', err);
      }
    }

    const report = await Report.create({
      patient_name,
      registration_number,
      assigned_doctor,
      doctor_id,
      file_name: req.file.originalname,
      file_path: `uploads/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      report_type: req.body.report_type || 'lab',
      status: 'pending',
      uploaded_at: new Date(),
      is_digital,
    });

    return res.status(201).json({ success: true, message: 'Report uploaded successfully.', data: report });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/reports
 * Returns all reports with optional search and pagination
 */
const getReports = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { patient_name: { [Op.iLike]: `%${search}%` } },
        { registration_number: { [Op.iLike]: `%${search}%` } },
        { assigned_doctor: { [Op.iLike]: `%${search}%` } },
      ];
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
 * DELETE /api/admin/report/:id
 * Deletes a report entry and its file from disk
 */
const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    // Delete file from disk
    const fullPath = path.join(__dirname, '../../', report.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await report.destroy();

    return res.json({ success: true, message: 'Report deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats, uploadReport, getReports, deleteReport };
