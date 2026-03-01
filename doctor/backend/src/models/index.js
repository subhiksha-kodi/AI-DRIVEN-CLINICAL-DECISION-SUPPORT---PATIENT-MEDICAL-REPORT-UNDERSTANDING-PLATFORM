/**
 * index.js - Models index: initializes all models and associations
 */
const Admin = require('./Admin');
const Doctor = require('./Doctor');
const Report = require('./Report');
const EhrPatient = require('./EhrPatient');

// Associations
Doctor.hasMany(Report, { foreignKey: 'doctor_id', as: 'reports' });
Report.belongsTo(Doctor, { foreignKey: 'doctor_id', as: 'doctor' });

module.exports = { Admin, Doctor, Report, EhrPatient };
