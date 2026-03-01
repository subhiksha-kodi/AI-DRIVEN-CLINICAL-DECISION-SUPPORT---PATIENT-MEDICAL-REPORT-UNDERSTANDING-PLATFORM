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
    const doctorId = req.doctor.id;
    const doctor = await Doctor.findByPk(doctorId);

    // Total assigned patients (unique registration numbers)
    const totalPatients = await Report.count({
      distinct: true,
      col: 'registration_number',
      where: {
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
      },
    });

    // Reports reviewed
    const reviewedReports = await Report.count({
      where: {
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
        status: 'reviewed',
      },
    });

    // Pending review
    const pendingReports = await Report.count({
      where: {
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
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
    next(err);
  }
};

/**
 * GET /api/doctor/reports
 * Get all reports assigned to the logged-in doctor (with search)
 */
const getReports = async (req, res, next) => {
  try {
    const doctorId = req.doctor.id;
    const doctor = await Doctor.findByPk(doctorId);
    const { search, status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause for reports assigned to this doctor
    const whereClause = {
      [Op.or]: [
        { doctor_id: doctorId },
        { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
      ],
    };

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
    const doctorId = req.doctor.id;
    const doctor = await Doctor.findByPk(doctorId);

    const report = await Report.findOne({
      where: {
        id,
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or not assigned to you.',
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
    const doctorId = req.doctor.id;
    const doctor = await Doctor.findByPk(doctorId);

    const report = await Report.findOne({
      where: {
        id,
        [Op.or]: [
          { doctor_id: doctorId },
          { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
        ],
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or not assigned to you.',
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
    report.doctor_id = doctorId; // Ensure doctor_id is set
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
    const doctorId = req.doctor.id;
    const doctor = await Doctor.findByPk(doctorId);
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      [Op.or]: [
        { doctor_id: doctorId },
        { assigned_doctor: { [Op.iLike]: `%${doctor.name}%` } },
      ],
    };

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

module.exports = { getStats, getReports, getReportById, markAsReviewed, getPatients };
