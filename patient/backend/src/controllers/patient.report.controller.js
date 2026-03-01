/**
 * patient.report.controller.js - Patient report upload and management
 */
const path = require('path');
const fs = require('fs');
const PatientReport = require('../models/PatientReport');
const { Op } = require('sequelize');

/**
 * POST /api/patient/reports/upload
 * Upload a file for analysis
 */
const uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const file = req.file;
    
    // Create patient report record
    const report = await PatientReport.create({
      patient_id: req.patient.id,
      original_filename: file.originalname,
      stored_filename: file.filename,
      file_path: file.path,
      file_type: path.extname(file.originalname).toLowerCase().replace('.', ''),
      file_size: file.size,
      mime_type: file.mimetype,
      analysis_status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully.',
      data: {
        id: report.id,
        original_filename: report.original_filename,
        file_type: report.file_type,
        file_size: report.file_size,
        analysis_status: report.analysis_status,
        created_at: report.createdAt,
      },
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
};

/**
 * GET /api/patient/reports
 * Get all reports for current patient
 */
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { patient_id: req.patient.id };
    
    if (search) {
      whereClause.original_filename = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await PatientReport.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id,
        original_filename: r.original_filename,
        file_type: r.file_type,
        file_size: r.file_size,
        mime_type: r.mime_type,
        analysis_status: r.analysis_status,
        analysis_result: r.analysis_result,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      })),
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
 * GET /api/patient/reports/:id
 * Get a specific report
 */
const getReport = async (req, res, next) => {
  try {
    const report = await PatientReport.findOne({
      where: {
        id: req.params.id,
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
        file_type: report.file_type,
        file_size: report.file_size,
        mime_type: report.mime_type,
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

/**
 * DELETE /api/patient/reports/:id
 * Delete a patient report
 */
const deleteReport = async (req, res, next) => {
  try {
    const report = await PatientReport.findOne({
      where: {
        id: req.params.id,
        patient_id: req.patient.id,
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    // Delete the file from disk
    if (report.file_path && fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    // Delete the record
    await report.destroy();

    return res.json({
      success: true,
      message: 'Report deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/reports/:id/download
 * Download a patient report file
 */
const downloadReport = async (req, res, next) => {
  try {
    const report = await PatientReport.findOne({
      where: {
        id: req.params.id,
        patient_id: req.patient.id,
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    if (!fs.existsSync(report.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server.',
      });
    }

    res.download(report.file_path, report.original_filename);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/patient/stats
 * Get patient dashboard stats
 */
const getStats = async (req, res, next) => {
  try {
    const totalReports = await PatientReport.count({
      where: { patient_id: req.patient.id },
    });

    const pendingReports = await PatientReport.count({
      where: { patient_id: req.patient.id, analysis_status: 'pending' },
    });

    const completedReports = await PatientReport.count({
      where: { patient_id: req.patient.id, analysis_status: 'completed' },
    });

    return res.json({
      success: true,
      data: {
        total_reports: totalReports,
        pending_reports: pendingReports,
        completed_reports: completedReports,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadReport,
  getReports,
  getReport,
  deleteReport,
  downloadReport,
  getStats,
};
