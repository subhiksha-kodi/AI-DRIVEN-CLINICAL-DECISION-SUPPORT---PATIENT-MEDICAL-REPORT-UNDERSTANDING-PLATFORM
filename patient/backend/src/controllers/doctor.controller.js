/**
 * doctor.controller.js - Doctor management: list, approve, reject
 */
const { Op } = require('sequelize');
const Doctor = require('../models/Doctor');

/**
 * GET /api/admin/doctors
 * Returns all doctors with search and pagination
 */
const getDoctors = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Doctor.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
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
 * PUT /api/admin/doctor/:id/approve
 * Approves a doctor account
 */
const approveDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    doctor.approval_status = 'approved';
    await doctor.save();

    return res.json({ success: true, message: `Dr. ${doctor.name} has been approved.`, data: doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/doctor/:id/reject
 * Rejects a doctor account
 */
const rejectDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findByPk(id);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found.' });

    doctor.approval_status = 'rejected';
    await doctor.save();

    return res.json({ success: true, message: `Dr. ${doctor.name} has been rejected.`, data: doctor });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/doctors/approved
 * Returns only approved doctors (for dropdown in upload form)
 */
const getApprovedDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.findAll({
      where: { approval_status: 'approved' },
      attributes: ['id', 'name', 'email', 'specialization'],
      order: [['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: doctors,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDoctors, approveDoctor, rejectDoctor, getApprovedDoctors };
