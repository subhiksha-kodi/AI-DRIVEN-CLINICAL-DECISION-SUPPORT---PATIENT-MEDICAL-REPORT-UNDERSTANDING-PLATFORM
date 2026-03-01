/**
 * patient.controller.js - Patients aggregated from reports table
 */
const { Op, fn, col, literal } = require('sequelize');
const Report = require('../models/Report');
const { sequelize } = require('../config/database');

/**
 * GET /api/admin/patients
 * Returns unique patients with their report counts and assigned doctor, paginated
 */
const getPatients = async (req, res, next) => {
  try {
    const { search, doctor, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { registration_number: { [Op.iLike]: `%${search}%` } },
        { patient_name: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (doctor) {
      whereClause.assigned_doctor = { [Op.iLike]: `%${doctor}%` };
    }

    // Aggregate: group by registration_number to get unique patients
    const patients = await Report.findAll({
      where: whereClause,
      attributes: [
        'registration_number',
        [fn('MAX', col('patient_name')), 'patient_name'],
        [fn('MAX', col('assigned_doctor')), 'assigned_doctor'],
        [fn('COUNT', col('id')), 'total_reports'],
      ],
      group: ['registration_number'],
      order: [[literal('total_reports'), 'DESC']],
      limit: parseInt(limit),
      offset,
      raw: true,
    });

    // Count unique patients for pagination
    const countResult = await sequelize.query(
      `SELECT COUNT(DISTINCT registration_number) as count FROM reports`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const total = parseInt(countResult[0]?.count || 0);

    return res.json({
      success: true,
      data: patients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPatients };
